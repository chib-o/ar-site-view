(function(){

	var app = angular.module('riskmachUtils', ['angular-jwt','riskmachDatabases']);
	
	app.controller('connectivityStatusController', connectivityStatusController);
	app.controller('activeUserInfoController', activeUserInfoController);
	app.controller('activeClientInfoController', activeClientInfoController);
	app.controller('appPermissionsController', appPermissionsController);
	app.controller('defaultRiskMethodController', defaultRiskMethodController);
	app.factory('rmUtilsFactory', rmUtilsFactory);
	app.factory('authFactory', authFactory);
	app.factory('rmConnectivityFactory', rmConnectivityFactory);
	app.factory('cloudRequestsFactory', cloudRequestsFactory);
	app.factory('initDataDownloadFactory', initDataDownloadFactory);
	app.directive('activeUserInfo', activeUserInfo);
	app.directive('activeClientInfo', activeClientInfo);
	app.directive('onlineStatusIndicator', onlineStatusIndicator);
	app.directive('appPermissions', appPermissions);
	app.directive('defaultRiskMethod', defaultRiskMethod);

	function defaultRiskMethodController($scope, rmUtilsFactory) 
	{
		var vm = this;

		vm.utils = {
			risk_methods: [{
				id: 1,
				name: 'PHA (Preliminary Hazard Analysis)'
			},{
				id: 2,
				name: 'Risk Matrix 5x5'
			},{
				id: 3,
				name: 'Simple Risk Rating'
			},{
				id: 4,
				name: 'RIA'
			},{
				id: 5,
				name: 'Racking'
			},{
				id: 6,
				name: 'Deterioration'
			}],
			user_settings: {
				loading: false,
				data: null,
				getSettings: function() {
					
					vm.utils.user_settings.loading = true;

					rmUtilsFactory.getCreateUserSettings().then(function(user_settings) {

						// SET DEFAULT RISK METHOD IF NOT SET
						if( user_settings && !user_settings.hasOwnProperty('risk_method') ) {
							user_settings.risk_method = 1; // PHA
						}

						vm.utils.user_settings.data = user_settings;

						vm.utils.user_settings.loading = false;

					}, function(error) {
						vm.utils.user_settings.loading = false;
					});

				},
				save: function() {

					vm.utils.user_settings.loading = true;

					rmUtilsFactory.saveUserSettings(vm.utils.user_settings.data).then(function(result) {

						vm.utils.user_settings.data._id = result._id;
						vm.utils.user_settings.data._rev = result._rev;

						vm.utils.user_settings.loading = false;

					}, function(error) {
						vm.utils.user_settings.loading = false;
						alert(error);
					});

				}
			},
			init: function() {

				setTimeout(function() {
					vm.utils.user_settings.getSettings();
				}, 0);

			}()
		}
	}

	function appPermissionsController($scope, rmUtilsFactory, geoLocationFactory) 
	{
		var vm = this;

		vm.utils = {
			permissions: {
				media: {
					loading: false,
					requested: false,
					error: false,
					error_message: null,
					requestMediaPermissions: function() {

						vm.utils.permissions.media.loading = true;
						
						$(document).ready(function() {
							rmUtilsFactory.forceRequestMediaPermissions().then(function() {
								vm.utils.permissions.media.requested = true;
								vm.utils.permissions.media.error = false;
								vm.utils.permissions.media.error_message = null;

								vm.utils.permissions.media.loading = false;
							}, function(error) {
								vm.utils.permissions.media.requested = true;
								vm.utils.permissions.media.error = true;
								vm.utils.permissions.media.error_message = error;

								vm.utils.permissions.media.loading = false;
							});
						});

					}
				},
				geo_location: {
					loading: false,
					requested: false, 
					error: false,
					error_message: null,
					requestLocationPermissions: function() {

						vm.utils.permissions.geo_location.loading = true;

						// ATTEMPT OBTAIN CURRENT LOCATION TO TRIGGER PROMPT
						geoLocationFactory.attemptTriggerLocationPermission().then(function(geo_data) {
							vm.utils.permissions.geo_location.requested = true;
							vm.utils.permissions.geo_location.error = false;
							vm.utils.permissions.geo_location.error_message = null;
							vm.utils.permissions.geo_location.loading = false;
						}, function(error) {
							vm.utils.permissions.geo_location.requested = true;
							vm.utils.permissions.geo_location.error = true;
							vm.utils.permissions.geo_location.error_message = error;
							vm.utils.permissions.geo_location.loading = false;
						});

					}
				}
			}
		}
	}

	function activeUserInfoController($scope, authFactory)
	{
		var vm = this;

		vm.utils = {
			profile_record: authFactory.active_profile
		};

		$scope.$watch(function(){
			return authFactory.active_profile;
		}, function(newVal, oldVal){
			vm.utils.profile_record = authFactory.active_profile;
		});
	}

	function activeClientInfoController($scope, authFactory)
	{
		var vm = this;

		vm.utils = {
			client_record: authFactory.active_client
		};

		$scope.$watch(function(){
			return authFactory.active_client;
		}, function(newVal, oldVal){

			var client_info = null;

			if( authFactory.active_client )
			{
				client_info = JSON.parse(authFactory.active_client);
			}

			vm.utils.client_record = client_info;
		});
	}

	function connectivityStatusController($scope, $rootScope, rmConnectivityFactory)
	{
		var vm = this;

		vm.utils = {
			online: null,
			statusText: function(){
				var text = 'Online';

				if( !vm.utils.online )
				{
					text = 'Offline';
				}

				return text;
			},
			textStyle: function(){
				var style = {
					'color': 'red'
				};

				if( vm.utils.online )
				{
					style['color'] = 'green';
				}

				return style;
			},
			iconStyle: function(){
				var style = {
					'background-color': 'red'
				};

				if( vm.utils.online )
				{
					style['background-color'] = 'green';
				}

				return style;
			},
		};

		$scope.$watch(function(){
			return rmConnectivityFactory.online_detection.online;
		}, function(newVal, oldVal){
			// console.log(rmConnectivityFactory.online_detection.online);
			vm.utils.online = rmConnectivityFactory.online_detection.online;
		});
	}

	function rmConnectivityFactory($timeout)
	{
		var factory = {};

		factory.online_detection = {
			online: null,
			getStatus: function(){
				factory.online_detection.online = navigator.onLine;
				console.log("ONLINE STATUS");
				console.log(factory.online_detection.online);
			},
			watchChange: function(){
				//alert("Got Here!");
				console.log("ONLINE WATCHED INITIALISED");

				window.addEventListener('offline', function(e){
					console.log("GONE OFFLINE");
					$timeout(function(){
						factory.online_detection.getStatus();
					}, 0);
				});

				window.addEventListener('online', function(e){
					console.log("GONE ONLINE");
				    $timeout(function(){
						factory.online_detection.getStatus();
					}, 0);
				});

			},
			init: function(){
				factory.online_detection.getStatus();
				factory.online_detection.watchChange();
			}
		};

		factory.online_detection.init();

		return factory;
	}

	function cloudRequestsFactory($q, $http, riskmachDatabasesFactory, authFactory)
	{
		var factory = {};

		factory.getSaveCloudTaskBank = function()
		{
			var defer = $q.defer();
			var date_requested = new Date().getTime();

			//GET THE DATA FROM THE CLOUD
			factory.getCloudTaskBank().then(function(d){

				//DELETE EXISTING APP TASK BANK DATA
				factory.deleteTaskBankData().then(function(){

					//SAVE CLOUD TASK BANK TO DATABASE
					var task_bank_data = {
						table: 'task_bank',
						task_bank: d.task_bank,
						date_requested: date_requested
					};

					console.log("SAVE TASK BANK DATA");
					console.log(task_bank_data);

					//SAVE TO DATABASE
					riskmachDatabasesFactory.databases.collection.utils.post(task_bank_data).then(function(result){
						defer.resolve();
					}).catch(function(error){
						defer.reject(error);
					});

				}, function(error){
					defer.reject(error);
				});

			}, function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.deleteTaskBankData = function()
		{
			var defer = $q.defer();

			riskmachDatabasesFactory.databases.collection.utils.find({
				selector: {
					table: 'task_bank'
				}
			}).then(function(results){

				angular.forEach(results.docs, function(doc, index){
					doc._deleted = true;
				});

				riskmachDatabasesFactory.databases.collection.utils.bulkDocs(results.docs).then(function (result) {
					defer.resolve();
				}).catch(function(error){
					defer.reject(error);
				});

			}).catch(function(error){
				defer.reject();
			});

			return defer.promise;
		}

		factory.getLocalTaskBank = function()
		{
			var defer = $q.defer();

			riskmachDatabasesFactory.databases.collection.utils.find({
				selector: {
					table: 'task_bank'
				}
			}).then(function(results){

				if( results.docs.length == 0 )
				{
					defer.reject();
				}
				else
				{
					defer.resolve( results.docs[0].task_bank );
				}

			}).catch(function(error){
				defer.reject();
			});

			return defer.promise;
		}

		factory.getCloudTaskBank = function()
		{
			var defer = $q.defer();

            $http.get(authFactory.base_path + 'webapp/v1/TaskBank',{
            	params: {}
            })
			.success(function(data, status, headers, config) {
                defer.resolve(data);
            })
            .error(function(data, status, headers, config) {
            	defer.reject("Error getting task bank");
			});

			return defer.promise;
		}

		riskmachDatabasesFactory.databases.initUtils();

		return factory;
	}

	function authFactory($q, $http, $interval, jwtHelper, riskmachDatabasesFactory, rmConnectivityFactory)
	{
		var factory = {};
		factory.login_url = '../login/';
		factory.base_path = 'https://system.riskmach.co.uk/laravel/public/';
		// factory.base_path = '../../../laravel/public/';
		factory.active_profile = null;
		factory.active_client = null;
		factory.session_id = null;
		factory.disable_session_monitoring = false;

		factory.utils = {
			isPasswordExpired: function(expiry_date) {
				var is_expired = false;

				if( !expiry_date ) {
					return is_expired;
				}

				expiry_date = parseInt(expiry_date);

				var current_date = new Date().getTime();

				if( current_date > expiry_date ) {
					is_expired = true;
				}

				return is_expired;
			},
			setPasswordExpiredEmail: function(email) {
				localStorage.setItem('ps_ex_email', email);
			},
			clearPasswordExpiredEmail: function() {
				localStorage.removeItem('ps_ex_email');
			},
			isRmUserIdLoggedInUser: function(rm_user_id) {
				var is_logged_in_user = false;

				if( parseInt(rm_user_id) == factory.cloudUserId() ) {
					is_logged_in_user = true;
				}

				return is_logged_in_user;
			},
			isCloudUserIdLoggedInUser: function(cloud_user_id) {
				var is_logged_in_user = false;

				if( parseInt(cloud_user_id) == factory.rmCloudUserId() ) {
					is_logged_in_user = true;
				}

				return is_logged_in_user;
			},
			findActiveProfile: function(cloud_user_id, profiles) {
				var active_profile = null;

				if( !profiles || !profiles.length ) {
					return active_profile;
				}

				var i = 0;
				var len = profiles.length;

				while(i < len) {

					if( profiles[i].CloudUserID == cloud_user_id ) {
						active_profile = angular.copy(profiles[i]);
					}

					i++;
				}

				return active_profile;
			}
		}

		factory.exam_mode = {
			active: false, 
			pin: null,
			isActive: function() {
				return factory.exam_mode.active; 
			},
			initSpiersExamsProfile: function(profile_record) {

				// IF SPIERS EXAMS PROFILE, ENTER EXAM MODE
				if( profile_record.CompanyID == 10353 ) {
					factory.exam_mode.start('1504');
				} else {
					factory.exam_mode.exit();
				}

			},
			start: function(pin) {
				factory.exam_mode.active = true;
				factory.exam_mode.pin = pin;
			},
			exit: function() {
				factory.exam_mode.active = false;
				factory.exam_mode.pin = null;
			},
			validatePin: function(pin) {
				var valid = false;

				// IF PIN AND PIN MATCHES EXAM MODE PIN
				if( pin && pin == factory.exam_mode.pin ) {
					valid = true;
				}

				return valid;
			}
		}

		factory.qc_mode = {
			isQcMode: function() {
				var is_qc_mode = false;

				if( localStorage.getItem('qc_mode') ) {
					is_qc_mode = true;
				}

				return is_qc_mode;
			},
			start: function() {
				localStorage.setItem('qc_mode', true);
			},
			clear:  function() {
				localStorage.removeItem('qc_mode');
			}
		}

		factory.user_checks = {
			isUserValid: function(user_record) {
				var data = {
					valid: false,
					error_message: null
				}

				// IF PROPERTY DOESN'T EXIST, ALLOW TO ACCOUNT FOR OLD VERSIONS
				// IF USER STATUS NOT LIVE
				if( user_record.hasOwnProperty('Status') && parseInt(user_record.Status) != 1 ) {
					data.error_message = 'Your user profile is not live. Please contact the account administrator';
					return data;
				}

				// IF USER BLOCKED
				if( user_record.hasOwnProperty('Blocked') && user_record.Blocked == 'Yes' ) {
					data.error_message = 'Your user profile has been blocked. Please contact the account administrator';
					return data;
				}

				// IF USER ARCHIVED
				if( user_record.hasOwnProperty('Archived') && user_record.Archived == 'Yes' ) {
					data.error_message = 'Your user profile has been archived. Please contact the account administrator';
					return data;
				}

				data.valid = true;
				data.error_message = null;

				return data;
			}
		}

		factory.login = function(token){
			factory.setLoginToken(token);
		}

		factory.logout = function()
		{
			localStorage.removeItem('rm_wa_token');
			factory.active_profile = null;
			localStorage.removeItem('active_client');
		}

		factory.getActiveClientStorage = function()
		{
			var storage_value = localStorage.getItem('active_client');

			if( storage_value )
			{
				storage_value = JSON.parse( storage_value );
			}

			return storage_value;
		};

		factory.selectClient = function(client_record)
		{
			//SHOULD WE DO OTHER STUFF HERE LIKE CLEAR ACTIVE PROJECT ETC?
			localStorage.setItem('active_client', JSON.stringify(client_record) );	
			factory.active_client = client_record;
			console.log("Selected Client");
			console.log(factory.active_client);
		}

		factory.clearActiveClient = function() 
		{
			localStorage.removeItem('active_client');
			factory.active_client = null;
		}

		factory.checkLocalCredentials = function(email_address, raw_password)
		{
			var defer = $q.defer();

			console.log("RAW PASSWORD: " + raw_password);

			//FIND LOCAL PROFILE RECORD
			factory.getLocalProfiles(email_address).then(function(profile_record){

				console.log("FOUND THE LOCAL PROFILE RECORD!");
				console.log(profile_record);

				var bf = new Blowfish("secret key");
				var encrypted = null;

				if( profile_record.hasOwnProperty('password') )
				{
					encrypted = profile_record.password;
				}

				var decrypted = bf.decrypt(encrypted);
				decrypted = bf.trimZeros(decrypted);

				console.log("DECRYPTED PASSWORD: " + decrypted);

				if( raw_password == decrypted )
				{
					defer.resolve();
				}
				else
				{
					defer.reject("Offline Login: Incorrect password");
				}

			}).catch(function(error){
				defer.reject("Unable to find a profile for that email on this device. Please perform an online login on this device.");
			});

			return defer.promise;
		}

		factory.secureLoggedInPage = function()
		{
			var logged_in = factory.isLoggedIn();

			if( !logged_in )
			{
				window.location.replace(factory.login_url);
				return;
			}

			//SET THE SESSION ID
            // factory.setInitialSessionID();
 
            //WATCH FOR SESSION PAGES / PROFILE SWITCHES / EXPIRY EVERY X SECONDS
            // $interval(function(){
            //     factory.monitorNewSession();
            //    	// factory.monitorSessionExpiry();
            // }, 5000);
		}

		factory.secureLoggedInPageStoreReferrer = function() 
		{
			var logged_in = factory.isLoggedIn();

			if( !logged_in ) 
			{
				// GET CURRENT URL
				var current_url = window.location.href;
				// STORE CURRENT URL FOR REDIRECT LATER
				localStorage.setItem('login_page_referrer', current_url);

				window.location.replace("../login/");
			}
		}

		factory.projectLockChecks = function(project_id) 
		{
			var defer = $q.defer();

			riskmachDatabasesFactory.databases.collection.projects.get(project_id).then(function(doc) {

				// PROJECT INCOMPLETE SYNC CHECK
				if( doc && doc.hasOwnProperty('mid_record_id') && doc.mid_record_id != null ) {
					alert("Incomplete sync: please re-attempt syncing the project before continuing work");
					window.location.replace("../dashboard/");

					defer.resolve();
					return defer.promise;
				}

				// PROJECT INCOMPLETE REMOVAL CHECK
				if( doc && doc.hasOwnProperty('cleanup_started') && doc.cleanup_started == 'Yes' ) {
					alert("Incomplete project removal: this project is locked and can only now be removed");
					window.location.replace("../dashboard/");

					defer.resolve();
					return defer.promise;
				}

				defer.resolve();

			}).catch(function(error) {
				console.log("ERROR FETCHING PROJECT FOR INCOMPLETE SYNC CHECK");
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.incompleteProjectSync = function(project_id)
		{	
			var defer = $q.defer();

			riskmachDatabasesFactory.databases.collection.projects.get(project_id).then(function(doc) {

				if( doc && doc.hasOwnProperty('mid_record_id') && doc.mid_record_id != null ) {
					alert("Incomplete sync: please re-attempt syncing the project before continuing work");
					window.location.replace("../dashboard/");
				}

			}).catch(function(error) {
				console.log("ERROR FETCHING PROJECT FOR INCOMPLETE SYNC CHECK");
				defer.reject(error);
			});
			
			return defer.promise;
		}

		factory.incompleteProjectCleanup = function(project_id)
		{	
			var defer = $q.defer();

			riskmachDatabasesFactory.databases.collection.projects.get(project_id).then(function(doc) {

				if( doc && doc.hasOwnProperty('cleanup_started') && doc.cleanup_started == 'Yes' ) {
					alert("Incomplete project removal: this project is locked and can only now be removed");
					window.location.replace("../dashboard/");
				}

			}).catch(function(error) {
				console.log("ERROR FETCHING PROJECT FOR INCOMPLETE CLEANUP CHECK");
				defer.reject(error);
			});
			
			return defer.promise;
		}

		factory.cloudUserId = function(){
			var user_id = null;

			if( factory.active_profile )
			{
				user_id = factory.active_profile.UserID;
			}

			return user_id;
		}

		factory.rmCloudUserId = function() {
			var user_id = null;

			if( factory.active_profile ) 
			{
				user_id = factory.active_profile.CloudUserID;
			}

			return user_id;
		}

		factory.cloudUserName = function() {
			var user_name = null;

			if( factory.active_profile ) 
			{
				user_name = factory.active_profile.FirstName + ' ' + factory.active_profile.LastName;
			}

			return user_name;
		}

		factory.cloudUserEmail = function() {
			var user_email = null;

			if( factory.active_profile ) 
			{
				user_email = factory.active_profile.EmailAddress;
			}

			return user_email;
		}

		factory.cloudCompanyId = function(){
			var company_id = null;

			if( factory.active_profile )
			{
				company_id = factory.active_profile.CompanyID;
			}

			return company_id;
		}

		factory.cloudCompanyName = function() {
			var company_name = null;

			if( factory.active_profile ) 
			{
				company_name = factory.active_profile.CompanyName;
			}

			return company_name;
		}

		factory.getClientId = function()
		{
			var client_id = null;

			if( factory.active_client )
			{
				client_id = factory.active_client.client_id;
			}

			return client_id;
		}

		factory.userIsVerified = function(user_profile) 
		{
			var verified = true;

			// IF EMAIL VERIFIED PROPERTY PRESENT BUT NOT SET
			if( user_profile.hasOwnProperty('EmailVerified') && !user_profile.EmailVerified ) {
				verified = false;
			}

			return verified;
		}

		factory.isAgent = function() 
		{
			var is_agent = false;

			if( !factory.active_profile ) {
				return is_agent;
			}

			if( factory.active_profile.hasOwnProperty('IsAgent') && factory.active_profile.IsAgent == 'Yes' ) {
				is_agent = true;
			}

			return is_agent;
		}

		factory.isProjectAuthor = function(project_record) 
		{
			var is_author = false;

			if( !project_record ) {
				return is_author;
			}

			if( project_record.hasOwnProperty('added_by') && project_record.added_by == factory.rmCloudUserId() ) {
				is_author = true;
			}
 
			return is_author;
		}

		factory.isProjectIQA = function(project_record) 
		{
			var is_iqa = false;

			if( !project_record ) {
				return is_iqa;
			}  

			if( project_record.hasOwnProperty('iqa_user_id') && project_record.iqa_user_id == factory.rmCloudUserId() ) {
				is_iqa = true;
			}

			if( project_record.hasOwnProperty('iqa_user_id2') && project_record.iqa_user_id2 == factory.rmCloudUserId() ) {
				is_iqa = true;
			}

			return is_iqa;
		}

		// EJ MIGRATED
		factory.getActiveCompanyId = function() 
		{
			var company_id = null;

			if( factory.getClientId() != null ) {
				company_id = factory.getClientId();
			} else {
				company_id = factory.cloudCompanyId();
			};

			return company_id;
		}
		// EJ MIGRATED

		factory.readJwt = function(token){
            var tokenPayload = jwtHelper.decodeToken(token);
            console.log(tokenPayload);
            return tokenPayload;
        }

        factory.getReadJwt = function(){
            var token = factory.getLoginToken();

            if( token == null )
            {
                return null;
            }

            var tokenPayload = jwtHelper.decodeToken(token);
            // console.log("TOKEN DATA");
            // console.log(tokenPayload);
            return tokenPayload;
        }

        factory.isLoggedIn = function()
        {
            var logged_in = false;
            var token = factory.getLoginToken();

            if( token == null )
            {
                console.log("User is not logged in");
                return false;
            }
            else
            {
            	logged_in = true;
                // if( !factory.isExpired(token) )
                // {
                //     logged_in = true;
                // }
                // else
                // {
                //     console.log("Token Expired");
                // }
            }

            if( logged_in == true )
            {
                console.log("User is logged in!");
                return true;
            }

            return logged_in;
        }

        factory.isExpired = function(token)
        {
            if( !token )
            {
                return false;
            }

            var decoded_token = jwtHelper.decodeToken(token);
            var expired = true;

            if( !decoded_token )
            {
                return true;
            }

            if( !decoded_token.hasOwnProperty('exp') || !decoded_token['exp'] )
            {
                return true;
            }

            var token_expiry = parseInt(decoded_token['exp']);
            token_expiry = token_expiry * 1000;
            var now = new Date().getTime();

            if( now < token_expiry )
            {
                expired = false;
            }
            
            return expired;
        }

        factory.setLoginToken = function(token)
        {
        	localStorage.setItem('rm_wa_token', token);

        	console.log("TOKEN SET");
        	console.log(token);
        }

        factory.getLoginToken = function()
        {
            return localStorage.getItem('rm_wa_token');
        }

        factory.serviceWorkerInstalled = function(){
        	var defer = $q.defer();

        	var data = {
        		installed: false,
        		update_available: false
        	};

        	try
        	{
        		navigator.serviceWorker.register('../sw.js').then(function(registration) {

        			console.log("SERVICE WORKER REGISTRATION");
        			console.log(registration);

				    if( registration.active )
				    {
				        data.installed = true;
				    }

				    if( registration.active && ( registration.installing || registration.waiting ) )
				    {
				    	data.update_available = true;
				    }

				    defer.resolve( data );
				   
				});
        	}
        	catch(error)
        	{
        		defer.resolve(data);
        	}

        	return defer.promise;
        }

        factory.serviceWorkerActivatedV1 = function() 
        {
        	var defer = $q.defer();

        	var worker_data = {
        		activated: false
        	}

        	navigator.serviceWorker.getRegistration('../sw.js').then(function(registration) {
				console.log("GOT SERVICE WORKER REGISTRATION");
				console.log(registration);

				if( registration && registration.active && registration.active.state == 'activated' ) {
					worker_data.activated = true;
				}

				defer.resolve(worker_data);

			});

        	return defer.promise;
        }

        factory.serviceWorkerActivated = function() 
        {
        	var defer = $q.defer();

        	var worker_data = {
        		installed: false,
        		activated: false
        	}

        	navigator.serviceWorker.getRegistration('../sw.js').then(function(registration) {
        		console.log("GOT SERVICE WORKER REGISTRATION");
        		console.log(registration);

        		if( registration ) {
        			worker_data.activated = true;
        		}

        		if( registration && registration.active ) {
        			worker_data.installed = true;
        		}

        		defer.resolve(worker_data);
        		
        	});

        	return defer.promise;
        }

		factory.dbUtils = {
			db: null,
			// init: function(){
			// 	factory.dbUtils.db = new PouchDB('rm_users');

			// 	factory.dbUtils.db.createIndex({
			// 		index: {fields: ['table','company_id']}
			// 	});

			// 	console.log(factory.dbUtils.db);
			// },
			getProfiles: function(doc_id){
				var options = {
					attachments: true,
					binary: true
				};

				return riskmachDatabasesFactory.databases.collection.users.get(doc_id, options);
			},
			saveProfiles: function(doc){
				var options = {
					force: true
				};

				return riskmachDatabasesFactory.databases.collection.users.post(doc, options);
			},
			deleteProfiles: function(doc){
				return riskmachDatabasesFactory.databases.collection.users.remove(doc);
			},
			saveAgentClients: function(doc){
				var options = {
					force: true
				};

				return riskmachDatabasesFactory.databases.collection.utils.post(doc, options);
			},
			deleteAgentClients: function(doc){
				return riskmachDatabasesFactory.databases.collection.utils.remove(doc);
			},
			profile_points: {
				getProfilePoints: function() {
					var defer = $q.defer();

					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'profile_points',
							user_id: authFactory.cloudUserId(),
							company_id: authFactory.cloudCompanyId(),
						}
					}).then(function(results){

						if( results.docs.length == 0 )
						{
							defer.resolve([]);
						};

						if( results.docs.length > 0 )
						{
							defer.resolve(results.docs[0].data);
						};

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getProfilePoint: function(profile_point_ref) {
					var defer = $q.defer();

					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'profile_points',
							user_id: authFactory.cloudUserId(),
							company_id: authFactory.cloudCompanyId()
						}
					}).then(function(results){

						if( results.docs.length == 0 )
						{
							defer.reject("Couldn't find any profile points");
						};

						if( results.docs.length > 0 )
						{
							var record = null;

							angular.forEach(results.docs[0].data, function(pp_record, pp_index) {
								if( pp_record.ProfileRef == profile_point_ref ) {
									record = pp_record;
								};
							});

							defer.resolve(record);
						};

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}
			}
		};

		factory.onlineLogin = function(email_address, password)
		{
			var defer = $q.defer();

			// GET INSTALL ID
			var install_id = null;
			install_id = localStorage.getItem('wa_install_id');

            $http.get(factory.base_path + 'webapp/v1/Login',{ 
            	params: {
            		email_address: email_address,
            		password: password,
            		install_id: install_id
            	}
            })
			.success(function(data, status, headers, config) {
                defer.resolve(data);
            })
            .error(function(data, status, headers, config) {
            	defer.reject("Error performing online login");
			});

			return defer.promise;
		}

		factory.onlineAutoLogin = function(token) 
		{
			var defer = $q.defer();

			$http.get(factory.base_path + 'webapp/v1/AutoLogin', {
				params: {
					token: token
				}
			}).success(function(data, status, headers, config) {
				console.log("ONLINE AUTO LOGIN DATA");
				console.log(data);

				if( data.error ) {

					if( data.error_messages.length ) {
						defer.reject(data.error_messages[0]);
					} else {
						defer.reject("Error performing online auto login");
					}

				} else {
					defer.resolve(data);
				}

			}).error(function(data, status, headers, config) {
				defer.reject("Error connecting to online auto login API");
			});

			return defer.promise;
		}

		factory.getOnlineProfiles = function(email_address)
		{
			var defer = $q.defer();

			if( !rmConnectivityFactory.online_detection.online ) {
				defer.reject("No internet connection - please gain a connection to get your user profiles");
				return defer.promise;
			}

            $http.get(factory.base_path + 'webapp/v1/Profiles',{ 
            	params: {
            		email_address: email_address
            	}
            })
			.success(function(data, status, headers, config) {

				console.log("PROFILES REQUEST RESPONSE");
				console.log(data);

				if( data.error ) {

					if( data.error_messages.length ) {
						defer.reject(data.error_messages[0]);
					} else {
						defer.reject("Error requesting user profiles");
					}

				} else {
					defer.resolve(data.profiles);
				}

            })
            .error(function(data, status, headers, config) {
            	defer.reject("Error reaching API for user profiles");
			});

			return defer.promise;	
		}

		factory.getOnlineAgentClients = function()
		{
			var defer = $q.defer();

            $http.get(factory.base_path + 'webapp/v1/AgentsClients',{ 
            	params: {}
            })
			.success(function(data, status, headers, config) {
				console.log("AGENT CLIENTS");
				console.log(data);
                defer.resolve(data);
            })
            .error(function(data, status, headers, config) {
            	defer.reject("Error getting online clients");
			});

			return defer.promise;	
		}

		factory.createClientOnline = function(client_record) 
		{
			var defer = $q.defer();

			$http.get(factory.base_path + 'webapp/v1/SaveNewClient', {
				params: {
					company_name: client_record.company_name, 
					email_address: client_record.email_address
				}
			})
			.success(function(data, status, headers, config) {
				console.log("CLIENT CREATED");
				console.log(data);

				if( data.error ) {
					defer.reject(data);
				} else {
					defer.resolve();
				}
			})
			.error(function(data, status, headers, config) {
				console.log("CREATE CLIENT API ERROR");
				defer.reject("Error creating client online");
			});

			return defer.promise;
		}

		factory.sendEmailVerificationLink = function(email_address)
		{
			var defer = $q.defer();

            $http.get(factory.base_path + 'api/v2/SendVerificationEmail',{ 
            	params: {
            		email_address: email_address
            	}
            })
			.success(function(data, status, headers, config) {
				console.log(data);

				if( data.error ) {
					defer.reject(data.error_messages[0]);
				} else {
					defer.resolve(data);
				}
            })
            .error(function(data, status, headers, config) {
            	defer.reject("Error reaching verification API. Please ensure a good connection");
			});

			return defer.promise;
		}

		factory.requestUserPasswordExpiryDate = function(email_address) 
		{
			var defer = $q.defer();

			$http.get(factory.base_path + 'webapp/v1/UsersPasswordExpiryDate', {
				params: {
					email_address: email_address
				}
			}).success(function(data, status, headers, config) {

				console.log("USER PASSWORD EXPIRY DATE RESPONSE");

				if( data.error ) {
					defer.reject(data.error_messages[0]);
				} else {
					defer.resolve(data.password_expiry_date);
				}

			}).error(function(data, status, headers, config) {
				defer.reject("Error reaching password expiry date API");
			});

			return defer.promise;
		}

		factory.checkEmailVerified = function(email_address) 
		{
			var defer = $q.defer();

			factory.getSaveOnlineProfiles(email_address).then(function(profile_record) {

				var user_id = factory.cloudUserId();
				var company_id = factory.cloudCompanyId();
				var logged_in_profile = null;

				var verified = false;

				// FIND LOGGED IN PROFILE
				var i = 0;
				var len = profile_record.profiles.length;
				while(i < len) {
					if( profile_record.profiles[i].UserID == user_id && profile_record.profiles[i].CompanyID == company_id ) {
						console.log("FOUND LOGGED IN PROFILE");
						console.log(profile_record.profiles[i]);

						logged_in_profile = profile_record.profiles[i];

						if( profile_record.profiles[i].hasOwnProperty('EmailVerified') && profile_record.profiles[i].EmailVerified ) {
							verified = true;
						}
					}

					i++;
				}

				// ONLY UPDATE ACTIVE PROFILE IF PROFILE FOUND
				if( logged_in_profile ) {

					// UPDATE TOKEN IN STORAGE
					factory.setLoginToken(logged_in_profile.Token);

					// SET ACTIVE USER
					factory.setActiveProfile();

				}

				defer.resolve(verified);

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.checkUserPasswordExpired = function(email_address) 
		{
			var defer = $q.defer();

			factory.requestUserPasswordExpiryDate(email_address).then(function(expiry_date) {

				var is_expired = factory.utils.isPasswordExpired(expiry_date);

				defer.resolve(is_expired);

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.updateUserInfo = function(user_info) 
		{
			var defer = $q.defer();

			$http.post(factory.base_path + 'webapp/v1/UpdateUserInfo',{ 
            	params: {
            		data: user_info
            	}
            })
			.success(function(data, status, headers, config){

				if( data.error ) {
					defer.reject(data.error_messages[0]);
				} else {
					defer.resolve();
				}
            })
            .error(function(data, status, headers, config) {
            	defer.reject("Error reaching update user info endpoint");
			});

			return defer.promise;
		}

		factory.getLocalProfiles = function(email_address)
		{	
			console.log("Email Address: " + email_address);
			return riskmachDatabasesFactory.databases.collection.users.get(email_address);
		}

		factory.getLocalAgentClients = function(user_id, agent_id)
		{
			var defer = $q.defer();

			riskmachDatabasesFactory.databases.collection.utils.find({
				selector: {
					user_id: user_id,
					agent_id: agent_id,
					table: 'clients'
				}
			}).then(function(results){
				console.log("GOT EXISTING LOCAL AGENT CLIENTS");
				console.log(results.docs);

				if( results.docs.length > 0 )
				{
					defer.resolve(results.docs[0]);
				}
				else
				{
					defer.reject("No clients found");
				}

			}).catch(function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.getSaveOnlineProfiles = function(email_address)
		{
			var defer = $q.defer();

			if( !email_address ) {
				defer.reject("No email address provided for user profiles");
				return defer.promise;
			}

			factory.getOnlineProfiles(email_address).then(function(profiles) {

				factory.saveProfiles(email_address, profiles).then(function(profile_record) {
					defer.resolve(profile_record);
				}, function(error) {
					defer.reject(error);
				});

			}, function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.getSaveOnlineAgentClients = function(user_id, agent_id)
		{
			var defer = $q.defer();

			//GET ONLINE AGENT CLIENTS
			factory.getOnlineAgentClients().then(function(d){

				factory.saveAgentClients(user_id, agent_id, d.data).then(function(clients_record){
					defer.resolve(clients_record);
				}, function(error){
					defer.reject(error);
				});

			}, function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.savePassword = function(email_address, raw_password)
		{
			var defer = $q.defer();

			var bf = new Blowfish("secret key");
			var encrypted = bf.encrypt(raw_password);
			// var decrypted = bf.decrypt(encrypted);

			// console.log("THE ENCRYPTED PASSWORD FOR ["+ raw_password +"] IS");
			// console.log(encrypted);

			//GET PROFILE RECORD AND UPDATE PASSWORD
			factory.getLocalProfiles(email_address).then(function(profile_record){

				profile_record.password = encrypted;

				factory.dbUtils.saveProfiles(profile_record).then(function(result){
					profile_record._rev = result.rev;
					defer.resolve(profile_record);
				}).catch(function(error){
					defer.reject("Error Updating Existing Profiles: " + error);
				});

			}).catch(function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.saveProfiles = function(email_address, profiles)
		{
			var defer = $q.defer();

			//GET UPDATE EXISTING PROFILES RECORD
			factory.getLocalProfiles(email_address).then(function(profile_record){

				profile_record.profiles = profiles;

				factory.dbUtils.saveProfiles(profile_record).then(function(result){
					profile_record._rev = result.rev;
					defer.resolve(profile_record);
				}).catch(function(error){
					defer.reject("Error Updating Existing Profiles: " + error);
				});

			}).catch(function(error){

				//CREATE NEW PROFILES RECORD IF NOT FOUND

				var profile_record = {
					_id: email_address,
					profiles: profiles,
					table: 'profiles'
				};

				factory.dbUtils.saveProfiles(profile_record).then(function(result){
					profile_record._rev = result.rev;
					defer.resolve(profile_record);
				}).catch(function(error){
					defer.reject("Error saving local profiles: " + error);
				});

			});

			return defer.promise;
		}

		factory.saveUpdateUserProfileRecord = function(email_address, profile_record) 
		{
			var defer = $q.defer();

			factory.getLocalProfiles(email_address).then(function(user_doc) {

				factory.doSaveUpdateUserProfileRecord(email_address, user_doc, profile_record).then(function(saved_user_record) {
					defer.resolve(saved_user_record);
				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {

				defer.reject(error);

			});

			return defer.promise;
		}

		factory.doSaveUpdateUserProfileRecord = function(email_address, user_doc, profile_record) 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.users;

			if( user_doc ) 
			{
				var matches = 0;

				// CHECK USER RECORD HAS PROFILES ARRAY
				if( user_doc.hasOwnProperty('profiles') && Array.isArray(user_doc.profiles) ) {
					
					// IF PROFILES ARRAY, CHECK IF PROFILE ALREADY EXISTS IN IT
					var i = 0;
					var len = user_doc.profiles.length;
					var profile_index = null;

					while(i < len) {

						if( user_doc.profiles[i].UserID == profile_record.UserID ) {
							profile_index = i;
						}

						i++;
					}

					if( profile_index == null ) {
						// DOESN'T EXIST, ADD PROFILE TO ARRAY
						user_doc.profiles.push(profile_record);
					} else {
						// PROFILE RECORD ALREADY EXISTS IN USER RECORD
						user_doc.profiles[profile_index] = profile_record;
					}

				} else {
					// CREATE NEW ARRAY WITH PROFILE RECORD IN IT
					user_doc.profiles = [profile_record];
				}

				// SAVE UPDATED USER RECORD
				db.put(user_doc).then(function(result) {
					user_doc._rev = result;
					defer.resolve(user_doc);
				}).catch(function(error) {
					defer.reject("Error updating user record: " + error);
				});
			}
			else
			{
				// USER RECORD DOESN'T EXIST, CREATE NEW
				var user_record = {
					_id: email_address, 
					profiles: [profile_record],
					table: 'profiles'
				}

				// SAVE NEW USER RECORD
				db.put(user_record).then(function(result) {
					user_record._rev = result.rev;
					defer.resolve(user_record);
				}).catch(function(error) {
					defer.reject("Error creating user record: " + error);
				});
			}

			return defer.promise;
		}

		factory.updateUserProfileStatus = function(email_address, profile_record) 
		{
			var defer = $q.defer();

			factory.getLocalProfiles(email_address).then(function(user_doc) {

				factory.doUpdateUserProfileStatus(email_address, user_doc, profile_record).then(function(data) {
					defer.resolve(data);
				}, function(error) {
					console.log(error);
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.doUpdateUserProfileStatus = function(email_address, user_doc, profile_record) 
		{
			var defer = $q.defer();

			console.log("DO UPDATE USER PROFILE STATUS");
			console.log(email_address);
			console.log(user_doc);
			console.log(profile_record);

			if( !user_doc ) {
				defer.reject("No user profile provided");
				return defer.promise;
			}

			if( !user_doc.hasOwnProperty('profiles') || !Array.isArray(user_doc.profiles) ) {
				defer.reject("No existing profiles to update");
				return defer.promise;
			}

			var db = riskmachDatabasesFactory.databases.collection.users;
				
			// IF PROFILES ARRAY, CHECK IF PROFILE ALREADY EXISTS IN IT
			var i = 0;
			var len = user_doc.profiles.length;
			var profile_index = null;

			while(i < len) {

				if( user_doc.profiles[i].CloudUserID == profile_record.UserID ) {
					profile_index = i;
				}

				i++;
			}

			if( profile_index == null ) {
				defer.reject("Couldn't find user profile");
				return defer.promise;
			}

			// UPDATE USER PROFILE STATUS VALUES
			user_doc.profiles[profile_index].Status = profile_record.Status;
			user_doc.profiles[profile_index].Blocked = profile_record.Blocked;
			user_doc.profiles[profile_index].BlockedBy = profile_record.BlockedBy;
			user_doc.profiles[profile_index].DateBlocked = profile_record.DateBlocked;
			user_doc.profiles[profile_index].Archived = profile_record.ProfileArchived;

			// SAVE UPDATED USER RECORD
			db.put(user_doc).then(function(result) {

				user_doc._rev = result;

				var data = {
					user_doc: user_doc, 
					user_profile: user_doc.profiles[profile_index]
				}

				console.log("UPDATED USER PROFILE STATUS");

				defer.resolve(data);

			}).catch(function(error) {
				defer.reject("Error updating user record: " + error);
			});

			return defer.promise;
		}

		factory.requestUserRecord = function() 
		{
			var defer = $q.defer();

			$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/CloudUserRecord',{ 
            	params: {}
            })
			.success(function(data, status, headers, config) {

				if( data.error ) {
					
					if( data.error_messages && data.error_messages.length ) {
						defer.reject(data.error_messages[0]);
					} else {
						defer.reject("Error requesting user profile");
					}

				} else {

					defer.resolve(data.user_record);

				}

            })
            .error(function(data, status, headers, config) {
            	defer.reject("Error reaching user profile API");
			});

			return defer.promise;
		}

		factory.requestUpdateUserStatus = function() 
		{
			var defer = $q.defer();

			factory.requestUserRecord().then(function(user_record) {

				factory.updateUserProfileStatus(user_record.EmailAddress, user_record).then(function(data) {

					defer.resolve(data);

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.saveAgentClients = function(user_id, agent_id, clients)
		{
			var defer = $q.defer();

			//GET EXISTING
			factory.getLocalAgentClients(user_id, agent_id).then(function(doc){

				doc.clients = clients;

				//UPDATE EXISTING
				factory.dbUtils.saveAgentClients(doc).then(function(result){
					doc._id = result.id;
					doc._rev = result.rev;
					defer.resolve(doc);
				}).catch(function(error){
					defer.reject("Error updating existing clients record: " + error);
				});

			}, function(error){
				
				//CREATE NEW AGENT CLIENTS RECORD
				var clients_record = {
					table: 'clients',
					user_id: user_id,
					agent_id: agent_id,
					clients: clients
				};

				factory.dbUtils.saveAgentClients(clients_record).then(function(result){
					clients_record._id = result.id;
					clients_record._rev = result.rev;
					defer.resolve(clients_record);
				}).catch(function(error){
					defer.reject("Error creating new clients record: " + error);
				});

			});

			return defer.promise;
		}

		factory.setActiveProfile = function() {
			factory.active_profile = factory.getReadJwt();

			console.log("NEW ACTIVE PROFILE SET");
			console.log(factory.active_profile);
		}

		factory.loginCloudFromApp = function() 
		{
			var defer = $q.defer();

			$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/LoginCloudFromApp', {
				params: {}
			}).then(function(data, status, headers, config) {

				console.log("LOGIN TO CLOUD FROM APP RESPONSE");
				console.log(data);

				if( data.data.error ) {
					defer.reject(data.data.error_messages[0]);
				} else {

					// SET CLOUD LOGIN TOKEN
					factory.setCloudLoginToken(data.data.token);

					defer.resolve();
				}

			}).catch(function(data, status, headers, config) {
				console.log("ERROR CONNECTING TO API TO LOGIN TO CLOUD PORTAL");
				console.log(data);
				defer.reject("Error connecting to API to login to cloud portal");
			});

			return defer.promise;
		}

		factory.setCloudLoginToken = function(token) 
		{
			if( !token ) {
				return;
			}

			localStorage.setItem('id_token', token);
		}

        factory.setInitialSessionID = function() 
        {
        	var token = factory.getReadJwt();

        	if( token && token.hasOwnProperty('SessionID') && token.SessionID ) {
        		factory.session_id = token.SessionID;
        	}
        }

		factory.monitorNewSession = function()
        {
        	console.log("MONITOR SESSIONS");
            if( factory.disable_session_monitoring )
            {
                console.log("SESSION DISABLED");
                return;
            }
 
            var token_data = factory.getReadJwt();

            //console.log(JSON.stringify(token_data, null, 2));
            //console.log(factory.session_id);

            return;
 
            //IF NOT LOGGED IN NOW BUT PREVIOUSLY WAS
            if( token_data == null && factory.session_id != null )
            {
                factory.session_id = null;
                console.log("SESSION CHANGED 1");
 
                var params = {
                    session_changed: true
                };
 
                // localStorage.setItem('login_redirect', window.location.href);
                window.location.href = factory.login_url;
                return;
            }
 
            //IF NOT ALREADY LOGGED IN DO NOTHING
            if( factory.session_id == null )
            {
                console.log("THERE IS NO SESSION ID SET");
                return;
            }
            
            //IF ALREADY LOGGED IN BUT NOT THE SAME SESSION / RELOAD THE PAGE
            if( factory.session_id != null && token_data.SessionID != factory.session_id )
            {
            	console.log(factory.session_id);
            	console.log(token_data.SessionID);

                factory.session_id = null;
 
                console.log("SESSION CHANGED 2");

            	//window.location.replace(factory.login_url + '?session_changed=true');
                return;
            }
        }

		//INIT USER DATABASE
		riskmachDatabasesFactory.databases.initUsers();
		riskmachDatabasesFactory.databases.initUserSettings();

		//INIT DATABASE
		// factory.dbUtils.init();

		//GET LOGGED IN PROFILE
		factory.active_profile = factory.getReadJwt();
		factory.active_client = factory.getActiveClientStorage();

		console.log("Active Client");
		console.log(factory.active_client);

		return factory;
	}

	function rmUtilsFactory($q, $http, $filter, $rootScope, authFactory, riskmachDatabasesFactory, rmConnectivityFactory)
	{
		var factory = {};

		factory.webapp_product_id = 2;

		factory.app_version = parseFloat(86.36);

		// factory.dbUtils = {
		// 	db: null,
		// 	init: function(){
		// 		factory.dbUtils.db = new PouchDB('rm_utils');

		// 		factory.dbUtils.db.createIndex({
		// 			index: {fields: ['table','user_id']}
		// 		});

		// 		console.log(factory.dbUtils.db);
		// 	},
		// 	getAsset: function(doc_id){
		// 		var options = {
		// 			attachments: true,
		// 			binary: true
		// 		};

		// 		return riskmachDatabasesFactory.databases.collection.users.get(doc_id, options);
		// 	},
		// 	saveAsset: function(doc){
		// 		var options = {
		// 			force: true
		// 		};

		// 		return factory.dbUtils.db.post(doc, options);
		// 	},
		// 	deleteAsset: function(doc){
		// 		return factory.dbUtils.db.remove(doc);
		// 	}
		// };


		factory.utils = {
			app_fs_options: [
				'app-fs-sm',
				'app-fs-default',
				'app-fs-md',
				'app-fs-lg',
				'app-fs-xlg'
            ],
            app_fs_previews: [
				'app-fs-sm-pre',
				'app-fs-default-pre',
				'app-fs-md-pre',
				'app-fs-lg-pre',
				'app-fs-xlg-pre'
            ],
            app_fs_slider_ticks: [{
            	value: 0,
            	display: 'Small'
            },{
            	value: 1, 
            	display: 'Default'
            },{
            	value: 2, 
            	display: 'Medium'
            },{
            	value: 3, 
            	display: 'Large'
            },{
            	value: 4,
            	display: 'Extra large'
            }],
            banned_pp_refs: [10,18,19,13,22,26,27,9,11,12,14,47,41],
            banned_type_ids: [1,25],
            action_log: {
				_id: null, 
				_rev: null,
				rm_id: null,
				company_id: null,
				user_id: null,
				record_id: null, 
				rm_record_id: null,
				record_type: null,
				action_type: null, 
				action_description: null,
				date_added: null,
				record_modified: 'No',
				date_record_synced: null, 
				date_content_synced: null, 
				date_record_imported: null, 
				date_content_imported: null
			},
			newActionLog: function() {
				var record = {};

				angular.copy(factory.utils.action_log, record);
				record.user_id = authFactory.cloudUserId();
				record.company_id = authFactory.cloudCompanyId();
				record.date_added = new Date().getTime();

				return record;
			},
			createUUID: function(){
				return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
					(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
					)
			},
			asset_sizes: [{
                _id: 1,
                name: 'Micro', 
                inspection_time: 20
            },{
                _id: 2, 
                name: 'Small', 
                inspection_time: 45
            },{
                _id: 3, 
                name: 'Medium', 
                inspection_time: 70
            },{
                _id: 4,
                name: 'Large', 
                inspection_time: 160
            },{
                _id: 5,
                name: 'Other', 
                inspection_time: null
            }],
            profile_points: {
            	filterBannedProfilePoints: function(profile_points) {
	            	var data = [];

					if( !profile_points ) {
						return data;
					}

					var i = 0;
					var len = profile_points.length;
					var banned_pp_refs = angular.copy(factory.utils.banned_pp_refs);

					while(i < len) {

						var pp_ref = parseInt(profile_points[i].ProfileRef);

						// IF PROFILE POINT NOT IN BANNED ARRAY
						if( banned_pp_refs.indexOf(pp_ref) === -1 ) {
							data.push(profile_points[i]);
						}

						i++;
					}

					return data;
	            }
            }
		}

		factory.requests = {
			claimProjectIQA: function(rm_activity_id, slot) {
				var defer = $q.defer();

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/GrabProjectAsIQAAuthorV2', {
					params: {
						project_id: rm_activity_id,
						slot: slot
					}
				}).then(function(data, status, headers, config) {
					console.log("CLAIMED PROJECT IQA RESPONSE");
					console.log(data);

					if( data.data.error == true ) {
						defer.reject(data.data.error_messages[0]);
					} else {
						defer.resolve(data.data.project_record);
					}

				}).catch(function(data, status, headers, config) {
					console.log("ERROR CLAIMING PROJECT IQA");
					console.log(data);
					defer.reject("Error claiming project IQA");
				});

				return defer.promise;
			},
			releaseProjectIQA: function(rm_activity_id, slot) {
				var defer = $q.defer();

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/ReleaseProjectIQAClaimV2', {
					params: {
						project_id: rm_activity_id, 
						slot: slot
					}
				}).then(function(data, status, headers, config) {
					console.log("RELEASED PROJECT IQA");
					console.log(data);

					if( data.error ) {
						defer.reject(data.error_messages[0]);
					} else {
						defer.resolve(data);
					}

				}).catch(function(data, status, headers, config) {
					console.log("ERROR RELEASING PROJECT IQA");
					console.log(data);
					defer.reject("Error releasing project IQA");
				});

				return defer.promise;
			}
		}

		factory.version_check = {
			beta_version: false,
			production_hosts: ['system.riskmach.co.uk'],
			beta_hosts: ['riskmach.sotersoft.co.uk','localhost'],
			isBetaVersion: function() {
				var hostname = window.location.hostname;
				var is_beta = false;

				if( hostname == 'riskmach.sotersoft.co.uk' ) {
					is_beta = true;
					factory.version_check.beta_version = true;
				}

				return is_beta;
			},
			checkIsLatestVersion: function() {
				var defer = $q.defer();

				factory.version_check.getLatestVersion().then(function(latest_version) {

					if( factory.version_check.isLatestVersion(latest_version.Version) ) {
						defer.resolve(true);
					} else {
						defer.resolve(false);
					}

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			isLatestVersion: function(latest_version) {
				var is_latest_version = false;

				// TURN VERSION INTO STRING
				var current_version = "" + factory.app_version + "";

				console.log(current_version);
				console.log(latest_version);

				if( current_version === latest_version ) {
					is_latest_version = true;
				}

				return is_latest_version;
			},
			getLatestVersion: function() {
				var defer = $q.defer();

				var hostname = window.location.hostname;
				var is_beta = 'Yes';
				// IF CURRENT HOSTNAME IS THE LIVE APP, FETCH LIVE VERSION
				if( factory.version_check.production_hosts.indexOf(hostname) !== -1 ) {
					is_beta = 'No';
				}

				// IF CONNECTION
				if( rmConnectivityFactory.online_detection.online ) {
					factory.version_check.requestLatestVersion(is_beta).then(function(latest_version) {

						defer.resolve(latest_version);

					}, function(error) {
						defer.reject(error);
					});

				} else {
					factory.version_check.getSavedLatestVersion(is_beta).then(function(local_latest_version) {

						defer.resolve(local_latest_version);

					}, function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;
			},
			requestLatestVersion: function(is_beta) {
				var defer = $q.defer();

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/LatestProductVersion',{ 
	            	params: {
	            		product_id: factory.webapp_product_id,
	            		is_beta: is_beta
	            	}
	            })
				.success(function(data, status, headers, config) {

					if( data.error ) {

						if( data.error_messages && data.error_messages.length ) {
							defer.reject(data.error_messages[0]);
						} else {
							defer.reject("Error requesting current app version");
						}

					} else {

						factory.version_check.saveLatestVersion(data.version_record, is_beta).then(function() {

							defer.resolve(data.version_record);

						}, function(error) {
							defer.reject(error);
						});

					}

	            })
	            .error(function(data, status, headers, config) {
	            	defer.reject("Error on current app version API");
				});

				return defer.promise;
			},
			getSavedLatestVersion: function(is_beta) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.latest_app_version;

				var options = {
					include_docs: true
				}

				var version_record = null;

				db.allDocs(options).then(function(result) {

					console.log("FETCHED SAVED LATEST VERSION");
					console.log(result);

					if( result && result.rows.length ) {

						var table = 'latest_beta_app_version';
						if( is_beta == 'No' ) {
							table = 'latest_app_version';
						} 

						var i = 0;
						var len = result.rows.length;

						while(i < len) {

							if( result.rows[i].doc.table == table ) {
								version_record = result.rows[i].doc;
							}

							i++;
						}

						defer.resolve(version_record);

					} else {
						defer.resolve(null);
					}

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			saveLatestVersion: function(version_record, is_beta) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.latest_app_version;

				var table = 'latest_beta_app_version';
				if( is_beta == 'No' ) {
					table = 'latest_app_version';
				}

				factory.version_check.getSavedLatestVersion(is_beta).then(function(doc) {

					if( !doc ) {

						// SAVE NEW
						version_record._id = null;
						version_record._rev = null;
						version_record.table = table;

						db.post(version_record, {force: true}).then(function(result) {

							version_record._id = result.id;
							version_record._rev = result.rev;

							defer.resolve();

						}).catch(function(error) {
							defer.reject(error);
						});

					} else {

						// UPDATE
						version_record._id = doc._id;
						version_record._rev = doc._rev;
						version_record.table = table;

						db.put(version_record).then(function(result) {

							version_record._id = result.id;
							version_record._rev = result.rev;

							defer.resolve();

						}).catch(function(error) {
							defer.reject(error);
						});

					}

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			checkVersionIsExpired: function() {
				var defer = $q.defer();

				factory.version_check.requestActiveVersionRecord().then(function(data) {

					if( factory.version_check.isVersionExpired(data) ) {
						defer.resolve(true);
					} else {
						defer.resolve(false);
					}

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			requestActiveVersionRecord: function() {
				var defer = $q.defer();

				if( !rmConnectivityFactory.online_detection.online ) {
					defer.resolve(null);
					return defer.promise;	
				}

				var hostname = window.location.hostname;
				var is_beta = 'Yes';
				// IF CURRENT HOSTNAME IS THE LIVE APP, FETCH LIVE VERSION
				if( factory.version_check.production_hosts.indexOf(hostname) !== -1 ) {
					is_beta = 'No';
				}

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/AppVersionRecord',{ 
	            	params: {
	            		product_id: factory.webapp_product_id,
	            		is_beta: is_beta,
	            		version: factory.app_version
	            	}
	            })
				.success(function(data, status, headers, config) {

					if( data.error ) {

						if( data.error_messages && data.error_messages.length ) {
							defer.reject(data.error_messages[0]);
						} else {
							defer.reject("Error requesting app version status");
						}

					} else {

						defer.resolve(data.version_record);

					}

	            })
	            .error(function(data, status, headers, config) {
	            	defer.reject("Error on current app version API");
				});

				return defer.promise;
			},
			isVersionExpired: function(version_record) {
				var is_expired = false;

				if( !version_record ) {
					return is_expired;
				}

				var expiry_date = version_record.ExpiryDate;

				if( !expiry_date ) {
					return is_expired;
				}

				var current_date = new Date().getTime();

				if( current_date > expiry_date ) {
					is_expired = true;
				}

				return is_expired;
			}
		}

		factory.last_online = {
			// limit: 2592000000, // 30 DAYS
			limit: 604800000, // 7 DAYS
			// limit: 30000, // 30 secs (testing)
			limit_str: '7 days',
			ping_interval: 86400000, // 1 DAY
			// ping_interval: 30000, // 30 secs (testing)
			lastOnlineConnectionValid: function(last_online_record) {
				
				var current_date = new Date().getTime();
        		var time_since_last_online = Math.round( current_date - parseInt( last_online_record.date ) );
        		
        		var valid = true;

        		if( last_online_record.date != null && time_since_last_online > factory.last_online.limit ) 
        		{
        			valid = false;
        		};

        		return valid;
			},
			lastPingValid: function(ping_record) {

				var data = {
					valid: true, 
					error_message: null
				}

				if( !ping_record || !ping_record.ping_date ) {
					data.valid = false;
					data.error_message = "You've never been online with this app on this device. Please check-in with an internet connection to continue";
					return data;
				}

				var current_date = new Date().getTime();
				var time_since_last_online = Math.round( current_date - parseInt(ping_record.ping_date) );

				console.log("TIME SINCE LAST ONLINE");
				console.log(time_since_last_online);

				if( ping_record.ping_date != null && time_since_last_online > factory.last_online.limit ) {
					data.valid = false;
					data.error_message = "You've not been online in over " + factory.last_online.limit_str + ". Please check-in with an internet connection to continue";
				}

				return data;
			},
			getLastOnlineConnection: function(filters) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.latest_app_version;

				var options = {
					include_docs: true
				}

				var last_online_login = null;

				db.allDocs(options).then(function(result) {

					if( result && result.rows.length ) {

						var i = 0;
						var len = result.rows.length;

						while(i < len) {
							var errors = 0;

							if( !result.rows[i].doc.hasOwnProperty('email_address') || result.rows[i].doc.email_address != filters.email_address ) {
								errors++;
							} 

							if( !result.rows[i].doc.hasOwnProperty('table') || result.rows[i].doc.table != 'last_online_connection' ) {
								errors++;
							}

							if( errors == 0 ) {
								last_online_login = result.rows[i].doc;
							}

							i++;
						}

						defer.resolve(last_online_login);

					} else {
						defer.resolve(null);
					}

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			saveLastOnlineConnection: function(data) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.latest_app_version;

				factory.last_online.getLastOnlineConnection({email_address: data.email_address}).then(function(last_online_record) {

					if( !last_online_record ) {

						var record = {
							email_address: data.email_address,
							action: data.action,
							date: data.date, 
							table: 'last_online_connection'
						}

						db.post(record, {force: true}).then(function(result) {

							record._id = result.id;
							record._rev = result.rev;

							defer.resolve();

						}).catch(function(error) {
							defer.reject(error);
						});

					} else {

						last_online_record.action = data.action;
						last_online_record.date = data.date;

						db.put(last_online_record).then(function(result) {

							last_online_record._id = result.id;
							last_online_record._rev = result.rev;

							defer.resolve();

						}).catch(function(error) {
							defer.reject(error);
						});

					}

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			checkLastPingValid: function() {
				var defer = $q.defer();

				var user_id = authFactory.cloudUserId();
				var company_id = authFactory.cloudCompanyId();

				factory.getPingRecord(user_id, company_id).then(function(ping_record) {

					console.log("PING RECORD");
					console.log(ping_record);

					var data = factory.last_online.lastPingValid(ping_record);

					// IF LAST PING IS VALID, ATTEMPT ANOTHER PING
					if( data.valid ) {

						// IF HAVEN'T PINGED FOR MORE THAN x TIME
						if( factory.last_online.requireNewPing(ping_record) ) {
							
							// TIMEOUT 1O SECONDS
							setTimeout(function() {
								factory.sendPing(ping_record);
							}, 10000);

						}
						
					}

					defer.resolve(data);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			requireNewPing: function(ping_record) {

				// IF NEVER PINGED
				if( !ping_record || !ping_record.ping_date ) {
					return true;
				}

				var require_new_ping = false;

				var current_timestamp = new Date().getTime();
				var time_since_last_ping = current_timestamp - ping_record.ping_date;

				// IF HAVEN'T PINGED IN MORE TIME THAN SET INTERVAL
				if( time_since_last_ping > factory.last_online.ping_interval ) {
					require_new_ping = true;
				}

				return require_new_ping;
			}
		}

		factory.offline_ready = {
			last_prompt: null,
			prompt_time_limit: 300000, // 5 MINS
			lastCheckValid: function() {
				if( !vm.utils.offline_ready.last_prompt ) {
					return false;
				}

				var valid = true;

				var current_timestamp = new Date().getTime();
				var last_prompted = Math.round(current_timestamp - vm.utils.offline_ready.last_prompt);

				// IF NOT PROMPTED FOR OVER 5 MINS, MAKE PROMPT
				if( last_prompted > vm.utils.offline_ready.prompt_time_limit ) {
					valid = false;
				}

				return valid;
			}
		}

		factory.getCreateInstallRecord = function() 
		{
			var defer = $q.defer();

			factory.getInstallRecord().then(function(install_record) {

				console.log("FETCHED INSTALL RECORD");
				console.log(JSON.stringify(install_record, null, 2));

				// IF INSTALL RECORD ALREADY EXISTS, RESOLVE
				if( install_record ) {
					defer.resolve(install_record);
					return defer.promise;
				}

				factory.createInitialInstallRecord().then(function(saved_install_record) {

					defer.resolve(saved_install_record);

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.createInitialInstallRecord = function() 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.utils;

			var install_record = {
				_id: null, 
				_rev: null,
				table: 'install_record',
				user_id: null,
				company_id: null,
				date: new Date().getTime(),
				install_id: factory.utils.createUUID()
			};

			db.post(install_record, {force: true}).then(function(result) {

				install_record._id = result.id;
				install_record._rev = result.rev;

				defer.resolve(install_record);

			}).catch(function(error) {
				console.log(error);
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.getInstallRecord = function(){
			var defer = $q.defer();

			riskmachDatabasesFactory.databases.collection.utils.find({
				selector: {
					table: 'install_record'
				}
			}).then(function(results){
				var install_record = null;

				console.log(results.docs);

				if( results.docs.length > 0 )
				{
					install_record = results.docs[0];
				}

				defer.resolve(install_record);

			}).catch(function(error){
				defer.reject(error);
			});

			return defer.promise;
		};

		factory.sendPingV1 = function(){

			var defer = $q.defer();

			if( !rmConnectivityFactory.online_detection.online ) {
				defer.reject("There is no internet connection to attempt ping");
				return defer.promise;
			}

			var ping_data = {
				user_id: authFactory.cloudUserId(),
				company_id: authFactory.cloudCompanyId(),
				version: factory.app_version,
				install_id: localStorage.getItem('wa_install_id')
			};

            $http.post(authFactory.base_path + 'webapp/v1/Ping',{ 
            	params: {
            		ping_data: ping_data
            	}
            })
			.success(function(data, status, headers, config){

				if( data.error == false )
				{
					factory.logPingSuccess(ping_data.user_id, ping_data.company_id).then(function(){
						defer.resolve(data);
					}, function(ping_error){
						defer.resolve(data);
					});
				}

				if( data.error == true ) 
				{
					defer.reject("Online ping returned an error");
				}
            })
            .error(function(data, status, headers, config) {
            	defer.reject("Error sending ping");
			});

			return defer.promise;
		}

		factory.sendPing = function(ping_record) 
		{
			var defer = $q.defer();

			if( ping_record ) {

				factory.doSendPing(ping_record).then(function(data) {
					defer.resolve(data);
				}, function(error) {
					defer.reject(error);
				});

			} else {

				var user_id = authFactory.cloudUserId();
				var company_id = authFactory.cloudCompanyId();

				factory.getPingRecord(user_id, company_id).then(function(ping_record) {

					factory.doSendPing(ping_record).then(function(data) {
						defer.resolve(data);
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

			}

			return defer.promise;	
		}

		factory.doSendPing = function(ping_record) 
		{
			var defer = $q.defer();

			// IF NOT ONLINE
			if( !rmConnectivityFactory.online_detection.online ) {
				defer.reject("There is no internet connection to attempt ping");
				return defer.promise;
			}

			var ping_data = {
				user_id: authFactory.cloudUserId(),
				company_id: authFactory.cloudCompanyId(),
				version: factory.app_version,
				install_id: localStorage.getItem('wa_install_id')
			};

            $http.post(authFactory.base_path + 'webapp/v1/Ping',{ 
            	params: {
            		ping_data: ping_data
            	}
            })
			.success(function(data, status, headers, config){

				if( data.error == false )
				{
					factory.logPingSuccess(ping_record).then(function(){
						defer.resolve(data);
					}, function(ping_error){
						defer.resolve(data);
					});
				}

				if( data.error == true ) 
				{
					defer.reject("Online ping returned an error");
				}
            })
            .error(function(data, status, headers, config) {
            	defer.reject("Error sending ping");
			});

			return defer.promise;
		}

		factory.getPingRecord = function(user_id, company_id) 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.utils;

			db.find({
				selector: {
					table: 'ping', 
					user_id: user_id,
					company_id: company_id
				}
			}).then(function(results) {

				var doc = null;

				if( results.docs.length > 0 ) {
					doc = results.docs[0];
				} else {
					// CREATE NEW DOC OBJECT
					doc = {
						table: 'ping',
						user_id: user_id,
						company_id: company_id,
						ping_date: null
					};
				}

				defer.resolve(doc);

			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.logPingSuccess = function(ping_record)
		{
			var defer = $q.defer();

			console.log("LOG PING SUCCESS");

			var db = riskmachDatabasesFactory.databases.collection.utils;

			// SET DATE OF PING
			ping_record.ping_date = new Date().getTime();

			if( ping_record.hasOwnProperty('_id') && ping_record._id ) {

				// UPDATE
				db.put(ping_record).then(function(result) {
					ping_record._id = result.id;
					ping_record._rev = result.rev;
					console.log("UPDATED PING RECORD");
					console.log(ping_record);
					defer.resolve(ping_record);
				}).catch(function(error) {
					defer.reject("Error updating ping record: " + error);
				});

			} else {

				// SAVE NEW
				db.post(ping_record, {force: true}).then(function(result) {
					ping_record._id = result.id;
					ping_record._rev = result.rev;
					console.log("NEW PING RECORD");
					console.log(ping_record);
					defer.resolve(ping_record);
				}).catch(function(error) {
					defer.reject("Error saving new ping record: " + error);
				});

			}

			return defer.promise;
		}

		factory.getDisplayMode = function(){
			var defer = $q.defer();
			var displayMode = 'browser tab';

			$(document).ready(function(){

				if (window.matchMedia('(display-mode: standalone)').matches){
					displayMode = 'standalone';
				}

				defer.resolve(displayMode);
			});

			return defer.promise;
		}

		factory.requestPersistantStorage = function()
		{
			var defer = $q.defer();

			if(navigator.storage && navigator.storage.persist)
			{
				navigator.storage.persist().then(function(persistent){

					if(persistent)
					{
						defer.resolve("Storage will not be cleared except by explicit user action");
					}
					else
					{
						// Storage may be cleared by the UA under storage pressure.
						defer.reject("Persistent Storage request failed");
					}

				}, function(error) {
					defer.reject("Obtaining persistent storage failed. Please make sure storage is not disabled for this site");
				});
			}
			else
			{
				defer.reject("Persistent storage is not supported in this browser")
			}

			return defer.promise;
		}

		factory.getPersistantStorageSetting = function()
		{
			var defer = $q.defer();

			if(navigator.storage && navigator.storage.persist)
			{
				navigator.storage.persisted().then(function(persistent){

					console.log("PERSISTENT STORAGE: " + persistent);
					
					if(persistent)
					{
						defer.resolve(true);
					}
					else
					{
						defer.resolve(false);
					}

				});
			}

			return defer.promise;
		}

		factory.mobileCheck = function(){
			var check = false;

			//DETECTS MOBILES - NOT TABLETS
			// (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
			
			//DETECTS MOBILES AND TABLETS AS A MOBILE DEVICE
			(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);

			return check;
		};

		factory.iosCheck = function() 
		{
			var iosQuirkPresent = function() {
				var audio = new Audio();
				var present = false;

				// ATTEMPT SET VOLUME TO 0.5
				audio.volume = 0.5;

				// VOLUME CANNOT BE CHANGED FROM "1" ON IOS 12 AND BELOW
				if( audio.volume === 1 ) {

					// IF VOLUME STILL EQUALS 1 AFTER ATTEMPTED CHANGE, IOS QUIRK PRESENT
					present = true;
				}

				return present;
			}

			// IF THE USER AGENT CONTAINS ANY OF iPad,iPhone,iPod THEN DEVICE IS IOS
			var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

			// IF THE USER AGENT CONTAINS MACINTOSH, THEN DEVICE IS APPLE
			var isAppleDevice = navigator.userAgent.includes('Macintosh');

			// TRUE FOR IOS 13 (AND HOPEFULLY BEYOND)
			var isTouchScreen = navigator.maxTouchPoints >= 1;

			return isIOS || (isAppleDevice && (isTouchScreen || iosQuirkPresent()));
		}

		factory.isDesktopMode = function() 
		{
			return window.innerWidth > screen.availWidth;
		}

		factory.requestMediaPermissions = function()
		{
			factory.getCreateDeviceSettings().then(function(device_settings) {

				if( device_settings.hasOwnProperty('media_permissions') && device_settings.media_permissions ) {
					console.log("MEDIA PERMISSION ALREADY GRANTED");
					return;
				}

				var constraints = {
					audio: true,
					video: true
				};

				navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {

					console.log("Media Permissions now granted!");

					device_settings.media_permissions = true;

					factory.saveDeviceSettings(device_settings).then(function() {
						console.log("DEVICE SETTINGS UPDATED WITH MEDIA PERMISSION");
					});

				}, function(error) {
					console.log("ERROR");

					if(error === PERMISSION_DENIED) {
				   		alert("If you wish to take photos, videos or audio recordings you must grant permission to access the camera and microphone");
				    }
				});
 
			});
		}

		factory.forceRequestMediaPermissions = function() 
		{
			var defer = $q.defer();

			var constraints = {
				audio: true, 
				video: true
			}

			navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
				console.log("Media Permissions now granted!");

				// STOP THE STREAM
				stream.getTracks().forEach(track => track.stop());

				defer.resolve();

			}).catch(function(error) {
				console.log(error);

				// DEFAULT
				var error_message = "Permission denied";

				if( error == "NotAllowedError: Permission denied" ) {
					error_message = "Permission denied";
				}

				defer.reject(error_message);
			});

			// navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {

			// 	console.log("Media Permissions now granted!");

			// }, function(error) {
			// 	console.log("ERROR");
			// 	console.log(error);

			// 	if(error === PERMISSION_DENIED) {
			//    		alert("If you wish to take photos, videos or audio recordings you must grant permission to access the camera and microphone");
			//     }
			// });

			return defer.promise;
		}

		factory.projects = {
			active_project_records: {
				project: null,
				asset: null,
				checklist: null,
				task: null,
				assessment: null,
				site: null, 
				building: null, 
				area: null, 
				core_site: null,
				core_asset: null,
				managed_risk: null, 
				table: 'activeprojectrecords',
				user_id: null
			},
			blank_project_records: {
				project: null,
				asset: null,
				checklist: null,
				task: null,
				assessment: null,
				site: null, 
				building: null, 
				area: null, 
				core_asset: null,
				managed_risk: null, 
				table: 'activeprojectrecords',
				user_id: null
			},
			newActiveRecordSet: function(user_id){
				var active_records = {};
				active_records = angular.copy(factory.projects.blank_project_records);
				active_records.user_id = user_id;
				return active_records;
			},
			setActiveProject: function(project_record){
				var defer = $q.defer();

				factory.projects.active_project_records.project = project_record;
				factory.projects.active_project_records.asset = null;
				factory.projects.active_project_records.task = null;
				factory.projects.active_project_records.checklist = null;
				factory.projects.active_project_records.assessment = null;

				factory.projects.saveActiveRecords(factory.projects.active_project_records).then(function(result){

					factory.projects.active_project_records._id = result.id;
					factory.projects.active_project_records._rev = result.rev;
					defer.resolve(factory.projects.active_project_records);

				}).catch(function(error){
					alert(error);
					defer.reject(error);
				});

				return defer.promise;
			},
			deleteActiveProject: function(){
				var defer = $q.defer();

				// DELETE ALL ACTIVE PROJECT DATA
				factory.projects.active_project_records.project = null;
				factory.projects.active_project_records.asset = null;
				factory.projects.active_project_records.task = null;
				factory.projects.active_project_records.checklist = null;
				factory.projects.active_project_records.assessment = null;

				factory.projects.saveActiveRecords(factory.projects.active_project_records).then(function(result){

					factory.projects.active_project_records._id = result.id;
					factory.projects.active_project_records._rev = result.rev;
					defer.resolve(factory.projects.active_project_records);

				}).catch(function(error){
					alert(error);
					defer.reject(error);
				});

				return defer.promise;
			},
			deleteActiveProjectOnly: function() {
				var defer = $q.defer();

				// DELETE ONLY THE ACTIVE PROJECT RECORD
				factory.projects.active_project_records.project = null;

				factory.projects.saveActiveRecords(factory.projects.active_project_records).then(function(result) {

					factory.projects.active_project_records._id = result.id;
					factory.projects.active_project_records._rev = result.rev;
					defer.resolve(factory.projects.active_project_records);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			setActiveAsset: function(asset_record){

				var defer = $q.defer();

				// factory.projects.active_project_records.project = project_record;
				factory.projects.active_project_records.asset = asset_record;
				factory.projects.active_project_records.task = null;
				factory.projects.active_project_records.checklist = null;
				factory.projects.active_project_records.assessment = null;

				console.log("SET ACTIVE ASSET");

				factory.projects.saveActiveRecords(factory.projects.active_project_records).then(function(result){

					factory.projects.active_project_records._id = result.id;
					factory.projects.active_project_records._rev = result.rev;
					defer.resolve();

				}).catch(function(error){
					alert(error);
					defer.reject(error);
				});

				return defer.promise;

			},
			deleteActiveAsset: function(){

				var defer = $q.defer();

				// factory.projects.active_project_records.project = project_record;
				factory.projects.active_project_records.asset = null;
				factory.projects.active_project_records.task = null;
				factory.projects.active_project_records.checklist = null;
				factory.projects.active_project_records.assessment = null;

				factory.projects.saveActiveRecords(factory.projects.active_project_records).then(function(result){

					factory.projects.active_project_records._id = result.id;
					factory.projects.active_project_records._rev = result.rev;
					defer.resolve();

				}).catch(function(error){
					alert(error);
					defer.reject(error);
				});

				return defer.promise;
			},
			setActiveManagedRisk: function(mr_record){

				var defer = $q.defer();

				// factory.projects.active_project_records.project = project_record;
				factory.projects.active_project_records.asset = null;
				factory.projects.active_project_records.task = null;
				factory.projects.active_project_records.checklist = null;
				factory.projects.active_project_records.assessment = null;
				factory.projects.active_project_records.managed_risk = mr_record;

				console.log("SET ACTIVE MANAGED RISK");
				console.log(factory.projects.active_project_records);

				factory.projects.saveActiveRecords(factory.projects.active_project_records).then(function(result){

					factory.projects.active_project_records._id = result.id;
					factory.projects.active_project_records._rev = result.rev;
					defer.resolve();

				}).catch(function(error){
					alert(error);
					defer.reject(error);
				});

				return defer.promise;

			},
			deleteActiveManagedRisk: function(){

				var defer = $q.defer();

				// factory.projects.active_project_records.project = project_record;
				factory.projects.active_project_records.asset = null;
				factory.projects.active_project_records.task = null;
				factory.projects.active_project_records.checklist = null;
				factory.projects.active_project_records.assessment = null;
				factory.projects.active_project_records.managed_risk = null;

				factory.projects.saveActiveRecords(factory.projects.active_project_records).then(function(result){

					factory.projects.active_project_records._id = result.id;
					factory.projects.active_project_records._rev = result.rev;
					defer.resolve();

				}).catch(function(error){
					alert(error);
					defer.reject(error);
				});

				return defer.promise;
			},
			setActiveChecklist: function(checklist_record){

				var defer = $q.defer();

				factory.projects.active_project_records.checklist = checklist_record;

				factory.projects.saveActiveRecords(factory.projects.active_project_records).then(function(result){

					factory.projects.active_project_records._id = result.id;
					factory.projects.active_project_records._rev = result.rev;
					defer.resolve();

				}).catch(function(error){
					alert(error);
					defer.reject(error);
				});

				return defer.promise;

			},
			deleteActiveChecklist: function(){

				var defer = $q.defer();

				factory.projects.active_project_records.checklist = null;

				factory.projects.saveActiveRecords(factory.projects.active_project_records).then(function(result){

					factory.projects.active_project_records._id = result.id;
					factory.projects.active_project_records._rev = result.rev;
					defer.resolve();

				}).catch(function(error){
					alert(error);
					defer.reject(error);
				});

				return defer.promise;
			},
			setActiveCoreSite: function(core_site, core_project) {
				var defer = $q.defer();

				factory.projects.active_project_records.project = core_project;
				factory.projects.active_project_records.asset = null;
				factory.projects.active_project_records.checklist = null;
				factory.projects.active_project_records.task = null;
				factory.projects.active_project_records.assessment = null;
				factory.projects.active_project_records.managed_risk = null;

				factory.projects.active_project_records.core_asset = null;

				factory.projects.active_project_records.core_site = core_site;

				factory.projects.saveActiveRecords(factory.projects.active_project_records).then(function(result){

					factory.projects.active_project_records._id = result.id;
					factory.projects.active_project_records._rev = result.rev;
					defer.resolve();

				}).catch(function(error){
					alert(error);
					defer.reject(error);
				});

				return defer.promise;
			},
			deleteActiveCoreSite: function() {
				var defer = $q.defer();

				factory.projects.active_project_records.project = null; 
				factory.projects.active_project_records.asset = null; 
				factory.projects.active_project_records.checklist = null;
				factory.projects.active_project_records.task = null;
				factory.projects.active_project_records.assessment = null; 
				factory.projects.active_project_records.managed_risk = null;

				factory.projects.active_project_records.core_asset = null;

				factory.projects.active_project_records.core_site = null;

				factory.projects.saveActiveRecords(factory.projects.active_project_records).then(function(result){

					factory.projects.active_project_records._id = result.id;
					factory.projects.active_project_records._rev = result.rev;
					defer.resolve();

				}).catch(function(error){
					alert(error);
					defer.reject(error);
				});

				return defer.promise;
			},
			setActiveCoreAsset: function(core_asset) {
				var defer = $q.defer();

				// MAKE SURE ACTIVE PROJECT ETC, IS UNSET
				factory.projects.active_project_records.project = null;
				factory.projects.active_project_records.asset = null;
				factory.projects.active_project_records.checklist = null;
				factory.projects.active_project_records.task = null;
				factory.projects.active_project_records.assessment = null;
				factory.projects.active_project_records.managed_risk = null;

				factory.projects.active_project_records.core_site = null;

				factory.projects.active_project_records.core_asset = core_asset;

				factory.projects.saveActiveRecords(factory.projects.active_project_records).then(function(result){

					factory.projects.active_project_records._id = result.id;
					factory.projects.active_project_records._rev = result.rev;
					defer.resolve();

				}).catch(function(error){
					alert(error);
					defer.reject(error);
				});

				return defer.promise;
			},
			deleteActiveCoreAsset: function() {
				var defer = $q.defer();

				factory.projects.active_project_records.project = null; 
				factory.projects.active_project_records.asset = null; 
				factory.projects.active_project_records.checklist = null;
				factory.projects.active_project_records.task = null;
				factory.projects.active_project_records.assessment = null; 
				factory.projects.active_project_records.managed_risk = null;

				factory.projects.active_project_records.core_site = null;

				factory.projects.active_project_records.core_asset = null;

				factory.projects.saveActiveRecords(factory.projects.active_project_records).then(function(result){

					factory.projects.active_project_records._id = result.id;
					factory.projects.active_project_records._rev = result.rev;
					defer.resolve();

				}).catch(function(error){
					alert(error);
					defer.reject(error);
				});

				return defer.promise;
			},
			updateActiveRecords: function(active_records){
				var defer = $q.defer();

				//FIND EXISTING ACTIVE RECORDS FOR USER
				factory.projects.getActiveRecords(active_records.user_id).then(function(existing_records){

					if( existing_records.length > 0 )
					{
						//DELETE ACTIVE RECORDS FOR USER
						factory.projects.deleteActiveRecords(existing_records[0]).then(function(delete_res){
							
							//SAVE NEW ACTIVE RECORDS FOR USER
							factory.projects.saveActiveRecords(active_records).then(function(save_res){

								active_records._id = save_res.id;
								active_records._rev = save_res.rev;
								defer.resolve(active_records);

							}).catch(function(error){
								defer.reject("Error saving active records: " + error);
							});

						}).catch(function(error){
							defer.reject("Error deleting active records: " + error);
						});
					}
					else
					{
						//SAVE NEW ACTIVE RECORDS FOR USER
						factory.projects.saveActiveRecords(active_records).then(function(save_res){

							active_records._id = save_res.id;
							active_records._rev = save_res.rev;
							defer.resolve(active_records);

						}).catch(function(error){
							defer.reject("Error saving active records: " + error);
						});
					}

				}, function(error) {
					defer.reject("Error getting active records" + error);
				});

				return defer.promise;
			},
			saveActiveRecords: function(active_records){
				var defer = $q.defer();

				active_records.user_id = authFactory.cloudUserId();

				riskmachDatabasesFactory.databases.collection.users.post(active_records).then(function(result){
					defer.resolve(result);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			dashboardActiveRecords: function() {
				var defer = $q.defer();

				factory.projects.getActiveRecords(authFactory.cloudUserId()).then(function(results) {

					var active_records = null;

					// BUG FIX - IF MORE THAN 1 ACTIVE RECORDS HAVE BEEN CREATED
					if( results.length > 1 ) {
						// DELETE ALL ACTIVE RECORDS AND CREATE 1 NEW EMPTY SET
						factory.projects.deleteAllActiveRecords(results).then(function() {

							active_records = factory.projects.newActiveRecordSet(authFactory.cloudUserId());

							factory.projects.active_project_records = active_records;
							defer.resolve(active_records);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					if( results.length > 0 )
					{
						active_records = results[0];
					}

					if( !active_records )
					{
						active_records = factory.projects.newActiveRecordSet(authFactory.cloudUserId());
					}

					factory.projects.active_project_records = active_records;
					defer.resolve(active_records);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			retrieveActiveRecords: function(){
				var defer = $q.defer();

				factory.projects.getActiveRecords(authFactory.cloudUserId()).then(function(results) {

					var active_records = null;

					if( results.length > 0 )
					{
						active_records = results[0];
					}

					if( !active_records )
					{
						active_records = factory.projects.newActiveRecordSet(authFactory.cloudUserId());
					}

					factory.projects.active_project_records = active_records;
					defer.resolve(active_records);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getActiveRecords: function(user_id){
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.users;

				var options = {
					limit: 100, 
					include_docs: true
				};

				var active_records = [];

				fetchNextPage(fetch_defer).then(function() {

					console.log("GOT ACTIVE RECORDS");
					console.log(active_records);

					defer.resolve(active_records);

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != user_id ) {
									errors++;
								}

								if( errors == 0 ) {
									active_records.push(result.rows[i].doc);
								}

								i++;
							}

							options.skip = 1;
							options.startkey = result.rows[ result.rows.length - 1 ].id;

							// CLEAN UP
							result.rows = null;

							fetchNextPage(defer);

						} else {
							// FINISHED PAGINATION 
							defer.resolve();
						}

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			deleteActiveRecords: function(record){
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.users.remove(record._id, record._rev).then(function(res){
					defer.resolve();
				}, function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			deleteAllActiveRecords: function(active_records) {
				var defer = $q.defer();
				var delete_defer = $q.defer();

				deleteNextRecord(delete_defer, 0).then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function deleteNextRecord(defer, active_index) {

					if( active_index > active_records.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					factory.projects.deleteActiveRecords(active_records[active_index]).then(function() {

						active_index++;

						deleteNextRecord(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			isProjectClaimed: function(rm_project_id) {
				var defer = $q.defer();

				if( !rm_project_id ) {
					defer.resolve();
					return defer.promise;
				}

				// if( !project.hasOwnProperty('rm_id') || !project.rm_id ) {
				// 	defer.resolve();
				// 	return defer.promise;
				// }

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/UserHasClaimedProjectRequirement',{
		            params: {
	            		activity_id: rm_project_id
	            	}
	            })
				.success(function(data, status, headers, config) {

					if( data.error ) {
						defer.reject(data.error_messages[0]);
					} else {

						if( !data.has_claimed ) {
							defer.reject("Someone else has now claimed this inspection");
						} else {
							defer.resolve();
						}

					}
	            })
	            .error(function(data, status, headers, config) {
	            	defer.reject("Error connecting to API to check if project is claimed. Please check your connection");
				});

				return defer.promise;
			},
			onlineHasProjectAccess: function(rm_project_id) {
				var defer = $q.defer();

				if( !rm_project_id ) {
					defer.resolve();
					return defer.promise;
				}

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/HasProjectAccess',{
		            params: {
	            		activity_id: rm_project_id
	            	}
	            })
				.success(function(data, status, headers, config) {

					if( data.error ) {
						defer.reject(data.error_messages[0]);
					} else {

						if( !data.has_access ) {
							defer.reject(data.access_error);
						} else {
							defer.resolve();
						}

					}
	            })
	            .error(function(data, status, headers, config) {
	            	defer.reject("Error connecting to API to check your access to this project. Please check your connection");
				});

				return defer.promise;
			}
		};

		factory.sync_decoration = {
			register_sites: {
            	siteModified: function(site_record) {
            		site_record.date_modified = new Date().getTime();
            		site_record.modified_by = authFactory.cloudUserId();

            		site_record.date_record_synced = null;
            		site_record.date_content_synced = null;
            		site_record.date_record_imported = null;
            		site_record.date_content_imported = null;
            		site_record.record_modified = 'Yes';

            		factory.sync_decoration.projects.markCoreProjectModified();

            		return site_record;
            	},
            	markSiteModified: function(site_id) {
            		var defer = $q.defer();

            		var options = {
            			force: true
            		};

            		riskmachDatabasesFactory.databases.collection.sites.get(site_id).then(function(site_record) {

						if( !site_record ) {
							defer.reject("Couldn't find the site record");
							return defer.promise;
						};

						// SET RECORD MODIFIED
						site_record = factory.sync_decoration.register_sites.siteModified(site_record);

						// UPDATE SITE
						riskmachDatabasesFactory.databases.collection.sites.post(site_record, options).then(function(site_result) {
							site_record._id = site_result.id; 
							site_record._rev = site_result.rev;

							defer.resolve();

						}).catch(function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

            		return defer.promise;
            	}
            },
            register_buildings: {
            	buildingModified: function(building_record) {
            		building_record.date_modified = new Date().getTime();
            		building_record.modified_by = authFactory.cloudUserId();

            		building_record.date_record_synced = null;
            		building_record.date_content_synced = null;
            		building_record.date_record_imported = null;
            		building_record.date_content_imported = null;
            		building_record.record_modified = 'Yes';

            		factory.sync_decoration.register_sites.markSiteModified(building_record.site_id);

            		return building_record;
            	}
            },
            register_areas: {
            	areaModified: function(area_record) {
            		area_record.date_modified = new Date().getTime();
            		area_record.modified_by = authFactory.cloudUserId();

            		area_record.date_record_synced = null;
            		area_record.date_content_synced = null;
            		area_record.date_record_imported = null;
            		area_record.date_content_imported = null;
            		area_record.record_modified = 'Yes';

            		factory.sync_decoration.register_sites.markSiteModified(area_record.site_id);

            		return area_record;
            	}
            },
            register_assets: {
            	assetModified: function(asset_record) {
            		asset_record.date_modified = new Date().getTime();
            		asset_record.modified_by = authFactory.cloudUserId();

            		asset_record.date_record_synced = null;
            		asset_record.date_content_synced = null;
            		asset_record.date_record_imported = null;
            		asset_record.date_content_imported = null;
            		asset_record.record_modified = 'Yes';

            		if( asset_record.hasOwnProperty('record_type') && asset_record.record_type == '' ) {
            			factory.sync_decoration.register_sites.markSiteModified(asset_record.site_id);
            		};

            		return asset_record;
            	},
            	markAssetModified: function(asset_id) {
            		var defer = $q.defer();

            		var options = {
            			force: true
            		};

            		riskmachDatabasesFactory.databases.collection.register_assets.get(asset_id).then(function(asset_record) {

						if( !asset_record ) {
							defer.reject("Couldn't find the asset record");
							return defer.promise;
						};

						// SET RECORD MODIFIED
						asset_record = factory.sync_decoration.register_assets.assetModified(asset_record);

						// UPDATE ASSET
						riskmachDatabasesFactory.databases.collection.register_assets.post(asset_record, options).then(function(asset_result) {
							asset_record._id = asset_result.id; 
							asset_record._rev = asset_result.rev;

							// IF TASK, MARK TASK MODIFIED
							if( asset_record.record_type == 'task' ) {
								// MARK TASK MODIFIED
								defer.resolve(asset_record);
								return defer.promise;
							};

							var params = {
								record_id: asset_record._id, 
								record_rev: asset_record._rev,
								record_type: 'register_asset'
							}

							$rootScope.$broadcast("recordRev::new", params);

							defer.resolve(asset_record);

						}).catch(function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

            		return defer.promise;
            	}
            },
            ipp_scores: {
            	ippScoreModifiedV1: function(ipp_record) {
            		ipp_record.date_modified = new Date().getTime();
            		ipp_record.modified_by = authFactory.cloudUserId();

            		ipp_record.date_record_synced = null;
            		ipp_record.date_content_synced = null;
            		ipp_record.date_record_imported = null;
            		ipp_record.date_content_imported = null;
            		ipp_record.record_modified = 'Yes';

            		factory.sync_decoration.register_assets.markAssetModified(ipp_record.asset_id);

            		return ipp_record;
            	},
            	ippScoreModified: function(ipp_record) {
            		var defer = $q.defer();

            		ipp_record.date_modified = new Date().getTime();
            		ipp_record.modified_by = authFactory.cloudUserId();

            		ipp_record.date_record_synced = null;
            		ipp_record.date_content_synced = null;
            		ipp_record.date_record_imported = null;
            		ipp_record.date_content_imported = null;
            		ipp_record.record_modified = 'Yes';

            		factory.sync_decoration.register_assets.markAssetModified(ipp_record.asset_id).then(function() {

            			defer.resolve(ipp_record);

            		}, function(error) {
            			defer.reject(error);
            		});

            		return defer.promise;
            	},
            	ippScoreModifiedOnly: function(ipp_record) {
            		ipp_record.date_modified = new Date().getTime();
            		ipp_record.modified_by = authFactory.cloudUserId();

            		ipp_record.date_record_synced = null;
            		ipp_record.date_content_synced = null;
            		ipp_record.date_record_imported = null;
            		ipp_record.date_content_imported = null;
            		ipp_record.record_modified = 'Yes';

            		return ipp_record;
            	}
            },
            media_records: {
            	mediaModifiedOnly: function(media_record) {
            		media_record.date_modified = new Date().getTime();
            		media_record.modified_by = authFactory.cloudUserId();

            		media_record.date_record_synced = null;
            		media_record.date_content_synced = null;
            		media_record.date_record_imported = null;
            		media_record.date_content_imported = null;
            		media_record.record_modified = 'Yes';
            	},
            	mediaModified: function(media_record) {
            		var defer = $q.defer();
            		var modify_defer = $q.defer();

            		media_record.date_modified = new Date().getTime();
            		media_record.modified_by = authFactory.cloudUserId();

            		media_record.date_record_synced = null;
            		media_record.date_content_synced = null;
            		media_record.date_record_imported = null;
            		media_record.date_content_imported = null;
            		media_record.record_modified = 'Yes';

            		// UNSET FILE DOWNLOAD RMID IF MEDIA IS MODIFIED
            		// media_record.file_download_rm_id = null;

            		// IF NO RECORDID, RESOLVE
            		if( !media_record.record_id ) {
            			defer.resolve(media_record);
            			return defer.promise;
            		}

            		var modify_stages = [];

            		if( media_record.record_type == 'asset' ) {
            			if( media_record.hasOwnProperty('is_register') && media_record.is_register == 'Yes' ) {
            				modify_stages.push('register_asset');
            			} else {
            				modify_stages.push('snapshot_asset');
            			}

            			// factory.sync_decoration.register_assets.markAssetModified(media_record.record_id);
            		}

            		if( media_record.record_type == 'task' ) {
            			modify_stages.push('task');
            			// factory.sync_decoration.tasks.markTaskModified(media_record.record_id);
            		}

            		if( media_record.record_type == 'assessment' ) {
            			modify_stages.push('assessment');
            			// factory.sync_decoration.assessments.markRiskAssessmentModified(media_record.record_id);
            		}

            		if( media_record.record_type == 'assessment_hazard' ) {
            			modify_stages.push('assessment_hazard');
            			// factory.sync_decoration.mr_hazards.markMrHazardModified(media_record.record_id);
            		}

            		if( media_record.record_type == 'control_item' || media_record.record_type == 'control_item_verification' ) {
            			modify_stages.push('control_item');
            			// factory.sync_decoration.mr_controls.markMrControlModified(media_record.record_id);
            		}

            		if( media_record.record_type == 'question_response_image' ) {
            			modify_stages.push('question_record');
            			// factory.sync_decoration.checklist_question_records.markChecklistQuestionModified(media_record.record_id);
            		}

            		// WAIT TO MODIFY NEXT RECORD
            		modifyNextRecord(modify_defer, modify_stages, 0).then(function() {
            			defer.resolve(media_record);
            		}, function(error) {
            			console.log(error);
            			defer.reject(error);
            		});

            		function modifyNextRecord(defer, stages, stage_index) {
            			if( stage_index > stages.length - 1 ) {
            				defer.resolve();
            				return defer.promise;
            			}

            			console.log(stages);

            			if( stages[stage_index] == 'snapshot_asset' ) {
            				factory.sync_decoration.snapshot_assets.markAssetModified(media_record.record_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					defer.reject(error);
            				});
            			}

            			if( stages[stage_index] == 'register_asset') {
            				factory.sync_decoration.register_assets.markAssetModified(media_record.record_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					defer.reject(error);
            				});
            			}

            			if( stages[stage_index] == 'task' ) {
            				factory.sync_decoration.tasks.markTaskModified(media_record.record_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					defer.reject(error);
            				});
            			}

            			if( stages[stage_index] == 'assessment' ) {
            				factory.sync_decoration.assessments.markRiskAssessmentModified(media_record.record_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					defer.reject(error);
            				});
            			}

            			if( stages[stage_index] == 'assessment_hazard' ) {
            				factory.sync_decoration.mr_hazards.markMrHazardModified(media_record.record_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					defer.reject(error);
            				});
            			}

            			if( stages[stage_index] == 'control_item' ) {
            				factory.sync_decoration.mr_controls.markMrControlModified(media_record.record_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					defer.reject(error);
            				});
            			}

            			if( stages[stage_index] == 'question_response_image' ) {
            				factory.sync_decoration.checklist_question_records.markChecklistQuestionModified(media_record.record_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					defer.reject(error);
            				});
            			}

            			return defer.promise;
            		}

            		return defer.promise;
            	},
            	markMediaModified: function(media_id) {
            		var defer = $q.defer();

            		var options = {
            			force: true
            		};

            		riskmachDatabasesFactory.databases.collection.media.get(media_id).then(function(media_record) {

						if( !media_record ) {
							defer.reject("Couldn't find the media record");
							return defer.promise;
						};

						// SET RECORD MODIFIED
						factory.sync_decoration.media_records.mediaModified(media_record).then(function(modified_media) {

							media_record = modified_media;

							// UPDATE PROJECT
							riskmachDatabasesFactory.databases.collection.media.post(media_record, options).then(function(media_result) {
								media_record._id = media_result.id; 
								media_record._rev = media_result.rev;

								defer.resolve(media_record);

							}).catch(function(error) {
								defer.reject(error);
							});

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

            		return defer.promise;
            	}
            },
           	projects: {
            	projectModified: function(project_record) {
            		project_record.date_modified = new Date().getTime();
            		project_record.modified_by = authFactory.cloudUserId();

            		project_record.date_record_synced = null;
            		project_record.date_content_synced = null;
            		project_record.date_record_imported = null;
            		project_record.date_content_imported = null;
            		project_record.record_modified = 'Yes';

            		return project_record;
            	},
            	markProjectModified: function(project_id) {
            		var defer = $q.defer();

            		riskmachDatabasesFactory.databases.collection.projects.get(project_id).then(function(project_record) {

						if( !project_record ) {
							defer.reject("Couldn't find the project record");
							return defer.promise;
						};

						// SET RECORD MODIFIED
						project_record = factory.sync_decoration.projects.projectModified(project_record);

						// UPDATE PROJECT
						riskmachDatabasesFactory.databases.collection.projects.put(project_record).then(function(project_result) {
							project_record._id = project_result.id; 
							project_record._rev = project_result.rev;

							defer.resolve();

						}).catch(function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

            		return defer.promise;
            	},
            	markCoreProjectModified: function() {
            		var defer = $q.defer();

            		factory.dbUtils.projects.getCoreProject().then(function(core_project) {

            			if( core_project == null ) {
            				defer.resolve();
            				return defer.promise;
            			}

            			// SET RECORD MODIFIED
						core_project = factory.sync_decoration.projects.projectModified(core_project);

						var options = {
							force: true
						};

						// UPDATE PROJECT
						riskmachDatabasesFactory.databases.collection.projects.post(core_project, options).then(function(project_result) {
							core_project._id = project_result.id; 
							core_project._rev = project_result.rev;

							console.log("MARKED CORE PROJECT MODIFIED");
							$rootScope.$broadcast("coreProject::modified");

							defer.resolve();

						}).catch(function(error) {
							defer.reject(error);
						});

            		});

            		return defer.promise;
            	}
            },
            snapshot_assets: {
            	assetModifiedOnly: function(asset_record){
            		asset_record.date_modified = new Date().getTime();
            		asset_record.modified_by = authFactory.cloudUserId();

            		asset_record.date_record_synced = null;
            		asset_record.date_content_synced = null;
            		asset_record.date_record_imported = null;
            		asset_record.date_content_imported = null;
            		asset_record.record_modified = 'Yes';

            		return asset_record;
            	},
            	assetModified: function(asset_record) {
            		asset_record.date_modified = new Date().getTime();
            		asset_record.modified_by = authFactory.cloudUserId();

            		asset_record.date_record_synced = null;
            		asset_record.date_content_synced = null;
            		asset_record.date_record_imported = null;
            		asset_record.date_content_imported = null;
            		asset_record.record_modified = 'Yes';

            		if( asset_record.hasOwnProperty('project_id') && asset_record.project_id != null ) {
            			
            			var is_lpa = false;
            			if( asset_record.hasOwnProperty('activity_type') && asset_record.activity_type == 54 ) {
            				is_lpa = true;
            			}

            			// IF IS SINGLE INSPECTION AND NOT IS LPA
            			if( asset_record.hasOwnProperty('is_single_inspection') && asset_record.is_single_inspection == 'Yes' && !is_lpa ) {

            				// MARK PROJECT MODIFIED AND CHANGE TITLE
            				factory.sync_decoration.snapshot_assets.updateAssetProject(asset_record.asset_ref, asset_record.project_id);

            			} else {
            				// MARK PROJECT MODIFIED
							factory.sync_decoration.projects.markProjectModified(asset_record.project_id);
            			}
            			
            		};

            		return asset_record;
            	},
            	markAssetModified: function(asset_id) {
            		var defer = $q.defer();

            		riskmachDatabasesFactory.databases.collection.assets.get(asset_id).then(function(asset_record) {

						if( !asset_record ) {
							defer.reject("Couldn't find the asset record");
							return defer.promise;
						};

						// SET RECORD MODIFIED
						asset_record = factory.sync_decoration.snapshot_assets.assetModified(asset_record);

						// UPDATE ASSET
						riskmachDatabasesFactory.databases.collection.assets.put(asset_record).then(function(asset_result) {
							asset_record._id = asset_result.id; 
							asset_record._rev = asset_result.rev;

							var params = {
								record_id: asset_record._id, 
								record_rev: asset_record._rev,
								record_type: 'asset'
							}

							$rootScope.$broadcast("recordRev::new", params);

							defer.resolve(asset_record);

						}).catch(function(error) {
							console.log("ERROR UPDATING ASSET: " + asset_record._rev);
							defer.reject(error);
						});

					}, function(error) {
						console.log("ERROR FETCHING ASSET");
						defer.reject(error);
					});

            		return defer.promise;
            	},
            	updateAssetProject: function(asset_ref, project_id) {
            		var defer = $q.defer();

            		var project_db = riskmachDatabasesFactory.databases.collection.projects;

    				project_db.get(project_id).then(function(project_record) {

						if( !project_record ) {
							defer.reject("Couldn't find project record");
							return defer.promise;
						};

						// SET RECORD MODIFIED
						project_record = factory.sync_decoration.projects.projectModified(project_record);

						// UPDATE PROJECT TITLE FOR SINGLE INSPECTION
						project_record.title = 'Inspection: ' + asset_ref;

						// UPDATE PROJECT
						project_db.put(project_record).then(function(project_result) {
							project_record._id = project_result.id; 
							project_record._rev = project_result.rev;

							defer.resolve();

						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

            		return defer.promise;
            	}
            },
            tasks: {
            	taskModified: function(task_record) {
            		var defer = $q.defer();
            		var modify_defer = $q.defer();

            		task_record.date_modified = new Date().getTime();
            		task_record.modified_by = authFactory.cloudUserId();

            		task_record.date_record_synced = null;
            		task_record.date_content_synced = null;
            		task_record.date_record_imported = null;
            		task_record.date_content_imported = null;
            		task_record.record_modified = 'Yes';

            		var modify_stages = [];

            		if( task_record.hasOwnProperty('asset_id') && task_record.asset_id != null ) {
            			modify_stages.push('asset');
            		};

            		if( task_record.hasOwnProperty('task_type') && task_record.task_type != 'procedure' ) {

            			if( task_record.hasOwnProperty('parent_task_id') && task_record.parent_task_id != null ) {
	            			modify_stages.push('task');
	            		}

            		}

            		// WAIT TO MODIFY NEXT RECORD
            		modifyNextRecord(modify_defer, modify_stages, 0).then(function() {
            			defer.resolve(task_record);
            		}, function(error) {
            			defer.reject(error);
            		});

            		function modifyNextRecord(defer, stages, stage_index) {
            			if( stage_index > stages.length - 1 ) {
            				defer.resolve();
            				return defer.promise;
            			}

            			if( stages[stage_index] == 'asset' ) {
            				factory.sync_decoration.snapshot_assets.markAssetModified(task_record.asset_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					console.log("ERROR MARKING ASSET MODIFIED");
            					defer.reject(error);
            				});
            			}

            			if( stages[stage_index] == 'task' ) {
            				factory.sync_decoration.tasks.markTaskModified(task_record.parent_task_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					console.log("ERROR MARKING TASK MODIFIED");
            					defer.reject(error);
            				});
            			}

            			return defer.promise;
            		}

            		// if( task_record.hasOwnProperty('asset_id') && task_record.asset_id != null ) {
            		// 	factory.sync_decoration.snapshot_assets.markAssetModified(task_record.asset_id);
            		// }

            		// if( task_record.hasOwnProperty('task_id') && task_record.task_id != null ) {
            		// 	factory.sync_decoration.tasks.markTaskModified(task_record.task_id);
            		// }

            		// return task_record;

            		return defer.promise;
            	},
            	markTaskModified: function(task_id) {
            		var defer = $q.defer();

            		var options = {
            			force: true
            		};

            		riskmachDatabasesFactory.databases.collection.tasks.get(task_id).then(function(task_record) {

						if( !task_record ) {
							defer.reject("Couldn't find the task record");
							return defer.promise;
						};

						// SET RECORD MODIFIED
						// task_record = factory.sync_decoration.tasks.taskModified(task_record);

						factory.sync_decoration.tasks.taskModified(task_record).then(function(modified_task) {
							
							task_record = modified_task;

							// UPDATE TASK
							riskmachDatabasesFactory.databases.collection.tasks.post(task_record, options).then(function(task_result) {
								task_record._id = task_result.id; 
								task_record._rev = task_result.rev;

								var params = {
									record_id: task_record._id, 
									record_rev: task_record._rev,
									record_type: task_record.task_type
								}

								$rootScope.$broadcast("recordRev::new", params);

								defer.resolve();

							}).catch(function(error) {
								defer.reject(error);
							});

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

            		return defer.promise;
            	}
            },
            checklist_instances: {
            	modified_ids: [],
            	checklistModified: function(checklist_record) {
            		var defer = $q.defer();
            		var modify_defer = $q.defer();

            		checklist_record.date_modified = new Date().getTime();
            		checklist_record.modified_by = authFactory.cloudUserId();

            		checklist_record.date_record_synced = null;
            		checklist_record.date_content_synced = null;
            		checklist_record.date_record_imported = null;
            		checklist_record.date_content_imported = null;
            		checklist_record.record_modified = 'Yes';

            		var modify_stages = [];

            		if( checklist_record.hasOwnProperty('asset_id') && checklist_record.asset_id != null ) {
            			modify_stages.push('asset');
            			//factory.sync_decoration.snapshot_assets.markAssetModified(checklist_record.asset_id);
            		};

            		// WAIT TO MODIFY NEXT RECORD
            		modifyNextRecord(modify_defer, modify_stages, 0).then(function() {
            			defer.resolve(checklist_record);
            		}, function(error) {
            			defer.reject(error);
            		});

            		function modifyNextRecord(defer, stages, stage_index) {
            			if( stage_index > stages.length - 1 ) {
            				defer.resolve();
            				return defer.promise;
            			}

            			if( stages[stage_index] == 'asset' ) {
            				factory.sync_decoration.snapshot_assets.markAssetModified(checklist_record.asset_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					defer.reject(error);
            				});
            			}

            			return defer.promise;
            		}

            		return defer.promise;
            	},
            	markChecklistModified: function(checklist_id) {
            		var defer = $q.defer();

     //        		if( factory.sync_decoration.checklist_instances.modified_ids.indexOf(checklist_id) !== -1 ) {
					// 	console.log("CHECKLIST ALREADY MODIFIED");
					// 	defer.resolve();
					// 	return defer.promise;
					// }

            		riskmachDatabasesFactory.databases.collection.checklist_instances.get(checklist_id).then(function(checklist_record) {

						if( !checklist_record ) {
							defer.reject("Couldn't find the checklist record");
							return defer.promise;
						};

						factory.sync_decoration.checklist_instances.checklistModified(checklist_record).then(function(modified_checklist) {

							// SET RECORD MODIFIED
							checklist_record = modified_checklist;

							// UPDATE ASSET
							riskmachDatabasesFactory.databases.collection.checklist_instances.put(checklist_record).then(function(checklist_result) {
								checklist_record._id = checklist_result.id; 
								checklist_record._rev = checklist_result.rev;

								if( factory.sync_decoration.checklist_instances.modified_ids.indexOf(checklist_record._id) === -1 ) {
									factory.sync_decoration.checklist_instances.modified_ids.push(checklist_record._id);
								}

								var params = {
									record_id: checklist_record._id, 
									record_rev: checklist_record._rev,
									record_type: 'checklist_record'
								}

								$rootScope.$broadcast("recordRev::new", params);

								defer.resolve();

							}).catch(function(error) {
								defer.reject(error);
							});

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

            		return defer.promise;
            	}
            },
            checklist_question_records: {
            	checklistQuestionModified: function(question_record) {
            		var defer = $q.defer();
            		var modify_defer = $q.defer();

            		question_record.date_modified = new Date().getTime();
            		question_record.modified_by = authFactory.cloudUserId();

            		question_record.date_record_synced = null;
            		question_record.date_content_synced = null;
            		question_record.date_record_imported = null;
            		question_record.date_content_imported = null;
            		question_record.record_modified = 'Yes';

            		var modify_stages = [];

            		if( question_record.hasOwnProperty('checklist_record_id') && question_record.checklist_record_id != null ) {
            			modify_stages.push('checklist_instance');
            			// factory.sync_decoration.checklist_instances.markChecklistModified(question_record.checklist_record_id);
            		}

            		if( question_record.hasOwnProperty('dependant_question_id') && question_record.dependant_question_id != null ) {
            			modify_stages.push('parent_question');
            			// factory.sync_decoration.checklist_question_records.checklistQuestionModified(question_record.dependant_question_id);
            		}

            		// WAIT TO MODIFY NEXT RECORD
            		modifyNextRecord(modify_defer, modify_stages, 0).then(function() {
            			defer.resolve(question_record);
            		}, function(error) {
            			defer.reject(error);
            		});

            		function modifyNextRecord(defer, stages, stage_index) {
            			if( stage_index > stages.length - 1 ) {
            				defer.resolve();
            				return defer.promise;
            			}

            			if( stages[stage_index] == 'checklist_instance' ) {
            				factory.sync_decoration.checklist_instances.markChecklistModified(question_record.checklist_record_id).then(function() {
	            				stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
	            			}, function(error) {
	            				defer.reject(error);
	            			});
            			}

            			if( stages[stage_index] == 'parent_question' ) {
	            			factory.sync_decoration.checklist_question_records.checklistQuestionModified(question_record.dependant_question_id).then(function() {
	            				stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
	            			}, function(error) {
	            				defer.reject(error);
	            			});
            			}

            			return defer.promise;
            		}

            		return defer.promise;
            	},
            	markChecklistQuestionModified: function(question_id) {
            		var defer = $q.defer();

            		var options = {
            			force: true
            		};

            		riskmachDatabasesFactory.databases.collection.checklist_question_records.get(question_id).then(function(question_record) {

						if( !question_record ) {
							defer.reject("Couldn't find the checklist question record");
							return defer.promise;
						};

						// SET RECORD MODIFIED
						factory.sync_decoration.checklist_question_records.checklistQuestionModified(question_record).then(function(modified_question) {

							question_record = modified_question;

							// UPDATE ASSET
							riskmachDatabasesFactory.databases.collection.checklist_question_records.post(question_record, options).then(function(question_result) {
								question_record._id = question_result.id; 
								question_record._rev = question_result.rev;

								console.log(question_record);

								var params = {
									record_id: question_record._id, 
									record_rev: question_record._rev,
									record_type: 'checklist_question_record'
								}

								$rootScope.$broadcast("recordRev::new", params);

								defer.resolve();

							}).catch(function(error) {
								defer.reject(error);
							});

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

            		return defer.promise;
            	}
            },
            checklist_instances_json: {
            	checklistInstanceJsonModified: function(json_record) {
            		var defer = $q.defer();
            		var modify_defer = $q.defer();

            		json_record.date_record_synced = null;
            		json_record.date_content_synced = null;
            		json_record.date_record_imported = null;
            		json_record.date_content_imported = null;
            		json_record.record_modified = 'Yes';

            		defer.resolve();

            		return defer.promise;
            	}
            },
            assessments: {
            	riskAssessmentModified: function(assessment_record) {
            		var defer = $q.defer();
            		var modify_defer = $q.defer();

            		assessment_record.date_modified = new Date().getTime();
            		assessment_record.modified_by = authFactory.cloudUserId();

            		assessment_record.date_record_synced = null;
            		assessment_record.date_content_synced = null;
            		assessment_record.date_record_imported = null;
            		assessment_record.date_content_imported = null;
            		assessment_record.record_modified = 'Yes';

            		// MARK QC AS MODIFIED
					if( assessment_record.hasOwnProperty('qc') && assessment_record.qc ) {
						assessment_record.qc_modified = 'Yes';
					}

            		var modify_stages = [];

            		if( assessment_record.hasOwnProperty('asset_id') && assessment_record.asset_id != null ) {
            			modify_stages.push('asset');
            			// factory.sync_decoration.snapshot_assets.markAssetModified(assessment_record.asset_id);
            		};

            		// WAIT TO MODIFY NEXT RECORD
            		modifyNextRecord(modify_defer, modify_stages, 0).then(function() {
            			defer.resolve(assessment_record);
            		}, function(error) {
            			defer.reject(error);
            		});

            		function modifyNextRecord(defer, stages, stage_index) {
            			if( stage_index > stages.length - 1 ) {
            				defer.resolve();
            				return defer.promise;
            			}

            			if( stages[stage_index] == 'asset' ) {
            				factory.sync_decoration.snapshot_assets.markAssetModified(assessment_record.asset_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					defer.reject(error);
            				});
            			}

            			return defer.promise;
            		}

            		return defer.promise;
            	},
            	markRiskAssessmentModified: function(assessment_id) {
            		var defer = $q.defer();

            		riskmachDatabasesFactory.databases.collection.assessments.get(assessment_id).then(function(assessment_record) {

						if( !assessment_record ) {
							defer.reject("Couldn't find the risk assessment record");
							return defer.promise;
						};

						// SET RECORD MODIFIED
						factory.sync_decoration.assessments.riskAssessmentModified(assessment_record).then(function(modified_assessment) {

							// UPDATE ASSESSMENT
							riskmachDatabasesFactory.databases.collection.assessments.put(modified_assessment).then(function(assessment_result) {
								modified_assessment._id = assessment_result.id; 
								modified_assessment._rev = assessment_result.rev;

								var params = {
									record_id: modified_assessment._id, 
									record_rev: modified_assessment._rev,
									record_type: 'assessment'
								}

								$rootScope.$broadcast("recordRev::new", params);

								defer.resolve(modified_assessment);

							}).catch(function(error) {
								defer.reject(error);
							});

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

            		return defer.promise;
            	}
            },
            mr_hazards: {
            	mrHazardModified: function(hazard_record) {
            		var defer = $q.defer();
            		var modify_defer = $q.defer();

            		hazard_record.date_modified = new Date().getTime();
            		hazard_record.modified_by = authFactory.cloudUserId();

            		hazard_record.date_record_synced = null;
            		hazard_record.date_content_synced = null;
            		hazard_record.date_record_imported = null;
            		hazard_record.date_content_imported = null;
            		hazard_record.record_modified = 'Yes';

            		var modify_stages = [];

            		if( hazard_record.hasOwnProperty('task_id') && hazard_record.task_id != null ) {
            			modify_stages.push('task');
            			// factory.sync_decoration.tasks.markTaskModified(hazard_record.task_id);
            		};

            		// WAIT TO MODIFY NEXT RECORD
            		modifyNextRecord(modify_defer, modify_stages, 0).then(function() {
            			defer.resolve(hazard_record);
            		}, function(error) {
            			defer.reject(error);
            		});

            		function modifyNextRecord(defer, stages, stage_index) {
            			if( stage_index > stages.length - 1 ) {
            				defer.resolve();
            				return defer.promise;
            			}

            			if( stages[stage_index] == 'task' ) {
            				factory.sync_decoration.tasks.markTaskModified(hazard_record.task_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					defer.reject(error);
            				});
            			}

            			return defer.promise;
            		}

            		return defer.promise;
            	},
            	markMrHazardModified: function(hazard_id) {
            		var defer = $q.defer();

            		var options = {
            			force: true
            		};

            		riskmachDatabasesFactory.databases.collection.mr_hazards.get(hazard_id).then(function(hazard_record) {

						if( !hazard_record ) {
							defer.reject("Couldn't find the hazard record");
							return defer.promise;
						};

						// SET RECORD MODIFIED
						factory.sync_decoration.mr_hazards.mrHazardModified(hazard_record).then(function(modified_hazard) {

							hazard_record = modified_hazard;

							// UPDATE ASSET
							riskmachDatabasesFactory.databases.collection.mr_hazards.post(hazard_record, options).then(function(hazard_result) {
								hazard_record._id = hazard_result.id; 
								hazard_record._rev = hazard_result.rev;

								var params = {
									record_id: hazard_record._id, 
									record_rev: hazard_record._rev,
									record_type: 'mr_hazard'
								}

								$rootScope.$broadcast("recordRev::new", params);

								defer.resolve();

							}).catch(function(error) {
								defer.reject(error);
							});

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

            		return defer.promise;
            	}
            },
            mr_controls: {
            	mrControlModified: function(control_record) {
            		var defer = $q.defer();
            		var modify_defer = $q.defer();

            		control_record.date_modified = new Date().getTime();
            		control_record.modified_by = authFactory.cloudUserId();

            		control_record.date_record_synced = null;
            		control_record.date_content_synced = null;
            		control_record.date_record_imported = null;
            		control_record.date_content_imported = null;
            		control_record.record_modified = 'Yes';

            		var modify_stages = [];

            		if( control_record.hasOwnProperty('task_id') && control_record.task_id != null ) {
            			modify_stages.push('task');
            			// factory.sync_decoration.tasks.markTaskModified(control_record.task_id);
            		};

            		// WAIT TO MODIFY NEXT RECORD
            		modifyNextRecord(modify_defer, modify_stages, 0).then(function() {
            			defer.resolve(control_record);
            		}, function(error) {
            			defer.reject(error);
            		});

            		function modifyNextRecord(defer, stages, stage_index) {
            			if( stage_index > stages.length - 1 ) {
            				defer.resolve();
            				return defer.promise;
            			}

            			if( stages[stage_index] == 'task' ) {
            				factory.sync_decoration.tasks.markTaskModified(control_record.task_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					console.log("ERROR MARKING TASK MODIFIED");
            					defer.reject(error);
            				});
            			}

            			return defer.promise;
            		}

            		return defer.promise;
            	},
            	markMrControlModified: function(control_id) {
            		var defer = $q.defer();

            		var options = {
            			force: true
            		};

            		riskmachDatabasesFactory.databases.collection.mr_controls.get(control_id).then(function(control_record) {

						if( !control_record ) {
							defer.reject("Couldn't find the control record");
							return defer.promise;
						};

						// SET RECORD MODIFIED
						factory.sync_decoration.mr_controls.mrControlModified(control_record).then(function(modified_control) {

							control_record = modified_control;

							// UPDATE ASSET
							riskmachDatabasesFactory.databases.collection.mr_controls.post(control_record, options).then(function(control_result) {
								control_record._id = control_result.id; 
								control_record._rev = control_result.rev;

								var params = {
									record_id: control_record._id, 
									record_rev: control_record._rev,
									record_type: 'mr_control'
								}

								$rootScope.$broadcast("recordRev::new", params);

								defer.resolve();

							}).catch(function(error) {
								defer.reject(error);
							});

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

            		return defer.promise;
            	}
            },
            hazard_control_relations: {
            	hazardControlRelationModified: function(relation_record) {
            		var defer = $q.defer();
            		var modify_defer = $q.defer();

            		relation_record.date_modified = new Date().getTime();
            		relation_record.modified_by = authFactory.cloudUserId();

            		relation_record.date_record_synced = null; 
            		relation_record.date_content_synced = null;
            		relation_record.date_record_imported = null;
            		relation_record.date_content_imported = null;
            		relation_record.record_modified = 'Yes';

            		var modify_stages = [];

            		if( relation_record.hasOwnProperty('hazard_id') && relation_record.hazard_id != null ) {
            			modify_stages.push('hazard');
            		};

            		if( relation_record.hasOwnProperty('control_item_id') && relation_record.control_item_id != null ) {
            			modify_stages.push('control');
            		}

            		// WAIT TO MODIFY NEXT RECORD
            		modifyNextRecord(modify_defer, modify_stages, 0).then(function() {
            			defer.resolve(relation_record);
            		}, function(error) {
            			defer.reject(error);
            		});

            		function modifyNextRecord(defer, stages, stage_index) {
            			if( stage_index > stages.length - 1 ) {
            				defer.resolve();
            				return defer.promise;
            			}

            			if( stages[stage_index] == 'hazard' ) {
            				factory.sync_decoration.mr_hazards.markMrHazardModified(relation_record.hazard_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					console.log("ERROR MARKING HAZARD MODIFIED");
            					defer.reject(error);
            				});
            			}

            			if( stages[stage_index] == 'control' ) {
            				factory.sync_decoration.mr_controls.markMrControlModified(relation_record.control_item_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					console.log("ERROR MARKING CONTROL MODIFIED");
            					defer.reject(error);
            				});
            			}

            			return defer.promise;
            		}

            		// if( relation_record.hasOwnProperty('hazard_id') && relation_record.hazard_id != null ) {
					// 	factory.sync_decoration.mr_hazards.markMrHazardModified(relation_record.hazard_id);
					// }

					// if( relation_record.hasOwnProperty('control_item_id') && relation_record.control_item_id != null ) {
					// 	factory.sync_decoration.mr_controls.markMrControlModified(relation_record.control_item_id);
					// }

					// return relation_record;

            		return defer.promise;
            	}
            },
            ra_question_relations: {
            	raQuestionRelationModified: function(relation_record) {
            		var defer = $q.defer();
            		var modify_defer = $q.defer();

            		relation_record.date_modified = new Date().getTime();
            		relation_record.modified_by = authFactory.cloudUserId();

            		relation_record.date_record_synced = null; 
            		relation_record.date_content_synced = null;
            		relation_record.date_record_imported = null;
            		relation_record.date_content_imported = null;
            		relation_record.record_modified = 'Yes';

            		var modify_stages = [];

            		if( relation_record.hasOwnProperty('checklist_record_id') && relation_record.checklist_record_id != null ) {
            			modify_stages.push('checklist_instance');
            			//factory.sync_decoration.checklist_instances.markChecklistModified(relation_record.checklist_record_id);
            		}

            		if( relation_record.hasOwnProperty('assessment_id') && relation_record.assessment_id != null ) {
            			modify_stages.push('assessment');
            			// factory.sync_decoration.assessments.markRiskAssessmentModified(relation_record.assessment_id);
            		}

            		if( relation_record.hasOwnProperty('question_record_id') && relation_record.question_record_id != null ) {
            			modify_stages.push('checklist_question');
            			//factory.sync_decoration.checklist_question_records.markChecklistQuestionModified(relation_record.question_record_id);
            		}

            		// WAIT TO MODIFY NEXT RECORD
            		modifyNextRecord(modify_defer, modify_stages, 0).then(function() {
            			defer.resolve(relation_record);
            		}, function(error) {
            			defer.reject(error);
            		});

            		function modifyNextRecord(defer, stages, stage_index) {
            			if( stage_index > stages.length - 1 ) {
            				defer.resolve();
            				return defer.promise;
            			}

            			if( stages[stage_index] == 'checklist_instance' ) {
            				factory.sync_decoration.checklist_instances.markChecklistModified(relation_record.checklist_record_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					defer.reject(error);
            				});
            			}

            			if( stages[stage_index] == 'assessment' ) {
            				factory.sync_decoration.assessments.markRiskAssessmentModified(relation_record.assessment_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					defer.reject(error);
            				});
            			}

            			if( stages[stage_index] == 'checklist_question' ) {
            				factory.sync_decoration.checklist_question_records.markChecklistQuestionModified(relation_record.question_record_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					defer.reject(error);
            				});
            			}

            			return defer.promise;
            		}

            		return defer.promise;
            	}
            },
            ra_control_relations: {
            	raControlRelationModified: function(relation_record) {
            		relation_record.date_modified = new Date().getTime();
            		relation_record.modified_by = authFactory.cloudUserId();

            		relation_record.date_record_synced = null;
            		relation_record.date_content_synced = null;
            		relation_record.date_record_imported = null;
            		relation_record.date_content_imported = null;
            		relation_record.record_modified = 'Yes';

            		if( relation_record.hasOwnProperty('assessment_id') && relation_record.assessment_id != null ) {
            			factory.sync_decoration.assessments.markRiskAssessmentModified(relation_record.assessment_id);
            		}

            		if( relation_record.hasOwnProperty('control_item_id') && relation_record.control_item_id != null ) {
            			// factory.sync_decoration.mr_controls.markMrControlModified(relation_record.control_item_id);
            		}

            		return relation_record;
            	}
            },
            permits: {
            	permitModified: function(permit_record) {
            		var defer = $q.defer();
            		var modify_defer = $q.defer();

            		permit_record.date_modified = new Date().getTime();
            		permit_record.modified_by = authFactory.cloudUserId();

            		permit_record.date_record_synced = null;
            		permit_record.date_content_synced = null;
            		permit_record.date_record_imported = null;
            		permit_record.date_content_imported = null;
            		permit_record.record_modified = 'Yes';

            		var modify_stages = [];

            		// if( permit_record.hasOwnProperty('contractor_id') && permit_record.contractor_id != null ) {
            		// 	modify_stages.push('contractor');
            		// };

            		// WAIT TO MODIFY NEXT RECORD
            		modifyNextRecord(modify_defer, modify_stages, 0).then(function() {
            			defer.resolve(permit_record);
            		}, function(error) {
            			defer.reject(error);
            		});

            		function modifyNextRecord(defer, stages, stage_index) {
            			if( stage_index > stages.length - 1 ) {
            				defer.resolve();
            				return defer.promise;
            			}

            			if( stages[stage_index] == 'contractor' ) {
            				factory.sync_decoration.contractors.markContractorModified(permit_record.contractor_id).then(function() {
            					stage_index++;
            					modifyNextRecord(defer, stages, stage_index);
            				}, function(error) {
            					defer.reject(error);
            				});
            			}

            			return defer.promise;
            		}

            		return defer.promise;
            	},
            	markPermitModified: function(permit_id) {
            		var defer = $q.defer();

            		riskmachDatabasesFactory.databases.collection.permits.get(permit_id).then(function(permit_record) {

						if( !permit_record ) {
							defer.reject("Couldn't find the permit record");
							return defer.promise;
						};

						factory.sync_decoration.permits.permitModified(permit_record).then(function(modified_permit) {

							// SET RECORD MODIFIED
							permit_record = modified_permit;

							// UPDATE PERMIT
							riskmachDatabasesFactory.databases.collection.permits.put(permit_record).then(function(permit_result) {
								permit_record._id = permit_result.id; 
								permit_record._rev = permit_result.rev;

								var params = {
									record_id: permit_record._id, 
									record_rev: permit_record._rev,
									record_type: 'permit'
								}

								$rootScope.$broadcast("recordRev::new", params);

								defer.resolve();

							}).catch(function(error) {
								defer.reject(error);
							});

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

            		return defer.promise;
            	}
            },
           	contractors: {
            	contractorModified: function(contractor_record) {
            		contractor_record.date_modified = new Date().getTime();
            		contractor_record.modified_by = authFactory.cloudUserId();

            		contractor_record.date_record_synced = null;
            		contractor_record.date_content_synced = null;
            		contractor_record.date_record_imported = null;
            		contractor_record.date_content_imported = null;
            		contractor_record.record_modified = 'Yes';

            		return contractor_record;
            	},
            	markContractorModified: function(contractor_id) {
            		var defer = $q.defer();

            		riskmachDatabasesFactory.databases.collection.contractors.get(contractor_id).then(function(contractor_record) {

						if( !contractor_record ) {
							defer.reject("Couldn't find the contractor record");
							return defer.promise;
						};

						contractor_record = factory.sync_decoration.contractors.contractorModified(contractor_record);

						// UPDATE CONTRACTOR
						riskmachDatabasesFactory.databases.collection.contractors.put(contractor_record).then(function(contractor_result) {
							contractor_record._id = contractor_result.id; 
							contractor_record._rev = contractor_result.rev;

							var params = {
								record_id: contractor_record._id, 
								record_rev: contractor_record._rev,
								record_type: 'contractor'
							}

							$rootScope.$broadcast("recordRev::new", params);

							defer.resolve();

						}).catch(function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

            		return defer.promise;
            	}
            },
            qc_check_records: {
            	qualityCheckRecordModified: function(qc_check_record) {
            		qc_check_record.date_record_imported = null;
            		qc_check_record.date_content_imported = null;
            		qc_check_record.record_modified = 'Yes';

            		return qc_check_record;
            	}
            }
		};

		factory.dbUtils = {
			profile_points: {
				getProfilePointsData: function(){
					var defer = $q.defer();

					var promises = {
						'profile_points': factory.dbUtils.profile_points.getProfilePoints(),
						'activity_types': factory.dbUtils.profile_points.getActivityTypes(),
						'pp_type_relations': factory.dbUtils.profile_points.getPPTypeRelations()
					};

					$q.all(promises).then(function(results){
						defer.resolve(results);
					}, function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getProfilePoints: function() {
					var defer = $q.defer();

					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'profile_points',
							user_id: authFactory.cloudUserId(),
							company_id: authFactory.cloudCompanyId(),
						}
					}).then(function(results){

						if( results.docs.length == 0 )
						{
							defer.resolve([]);
						};

						if( results.docs.length > 0 )
						{
							defer.resolve(results.docs[0].data);
						};

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getActivityTypes: function(){
					var defer = $q.defer();

					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'activity_types',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){

						//CREATE IF NOW FOUND
						if( results.docs.length == 0 )
						{
							defer.reject("No activity type data found");
						}

						//UPDATE EXISTING
						if( results.docs.length > 0 )
						{
							defer.resolve(results.docs[0].data);
						}

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getPPTypeRelations: function(){
					var defer = $q.defer();

					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'pp_type_relations',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){

						//CREATE IF NOW FOUND
						if( results.docs.length == 0 )
						{
							defer.reject("No activity type data found");
						}

						//UPDATE EXISTING
						if( results.docs.length > 0 )
						{
							defer.resolve(results.docs[0].data);
						}

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getProfilePoint: function(profile_point_ref) {
					var defer = $q.defer();

					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'profile_points',
							user_id: authFactory.cloudUserId(),
							company_id: authFactory.cloudCompanyId()
						}
					}).then(function(results){

						if( results.docs.length == 0 )
						{
							defer.reject("Couldn't find any profile points");
						};

						if( results.docs.length > 0 )
						{
							var record = null;

							angular.forEach(results.docs[0].data, function(pp_record, pp_index) {
								if( pp_record.ProfileRef == profile_point_ref ) {
									record = pp_record;
								};
							});

							defer.resolve(record);
						};

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			projects: {
				getCoreProject: function() {
					var defer = $q.defer();

					riskmachDatabasesFactory.databases.collection.projects.find({
						selector: {
							user_id: authFactory.cloudUserId(),
							client_id: authFactory.getActiveCompanyId(),
							core_project: 'Yes'
						}, 
						limit: 1
					}).then(function(results) {

						// console.log( JSON.stringify(results.docs, null, 2) );

						if( results.docs.length == 0 ) {
							console.log("THE CLIENT'S CORE PROJECT COULD NOT BE FOUND");
							// MAY NEED TO CREATE A NEW CORE PROJECT FOR CLIENT
							defer.resolve(null);
						} else {
							console.log("FOUND CLIENT'S CORE PROJECT");
							defer.resolve(results.docs[0]);
						};

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			}
		}
		// END EJ MIGRATED

		factory.getCreateUserSettings = function() 
		{
			var defer = $q.defer();

			factory.getUserSettings().then(function(user_settings) {

				if( user_settings ) {
					defer.resolve(user_settings);
					return defer.promise;
				}

				factory.createUserSettings().then(function(saved_user_settings) {
					defer.resolve(saved_user_settings);
				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.getUserSettings = function() 
		{
			var defer = $q.defer();
			var fetch_defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.user_settings;

			var options = {
				include_docs: true, 
				limit: 100
			}

			var settings = [];

			fetchNextPage(fetch_defer).then(function() {

				if( settings.length > 0 ) {
					defer.resolve(settings[0]);
				} else {
					defer.resolve(null);
				}

			}, function(error) {
				defer.reject(error);
			});

			function fetchNextPage(defer) {

				db.allDocs(options).then(function(result) {

					if( result && result.rows.length > 0 ) {

						var i = 0;
						var len = result.rows.length;

						while(i < len) {
							var errors = 0;

							if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
								errors++;
							} 

							if( !result.rows[i].doc.hasOwnProperty('company_id') || result.rows[i].doc.company_id != authFactory.cloudCompanyId() ) {
								errors++;
							} 

							if( errors == 0 ) {
								settings.push(result.rows[i].doc);
							}

							i++;
						}

						options.skip = 1;
						options.startkey = result.rows[ result.rows.length - 1 ].id;

						// CLEAN UP
						result.rows = null;

						fetchNextPage(defer);

					} else {
						// FINISHED PAGINATION
						defer.resolve();
					}

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}

			return defer.promise;
		}

		factory.createUserSettings = function() 
		{
			var defer = $q.defer();

			var user_setting = {
				company_id: authFactory.cloudCompanyId(),
				user_id: authFactory.cloudUserId(),
				show_pha_slider: false,
				snapshot_assets_order_by: 'asset_ref',
				app_fs: 'app-fs-default',
				core_assets_order_by: 'asset_ref',
				core_assets_sort_by: false,
				risk_method: 1 // PHA
			}

			riskmachDatabasesFactory.databases.collection.user_settings.post(user_setting, {force: true}).then(function(result) {

				user_setting._id = result.id;
				user_setting._rev = result.rev;

				defer.resolve(user_setting);

			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.saveUserSettings = function(user_settings) 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.user_settings;

			db.put(user_settings).then(function(result) {

				user_settings._id = result.id;
				user_settings._rev = result.rev;

				defer.resolve(user_settings);

			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.getCreateDeviceSettings = function() 
		{
			var defer = $q.defer();

			factory.getDeviceSettings().then(function(device_settings) {

				if( device_settings ) {
					defer.resolve(device_settings);
					return defer.promise;
				}

				factory.createDeviceSettings().then(function(saved_device_settings) {
					defer.resolve(saved_device_settings);
				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.getDeviceSettings = function() 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.device_settings;

			db.allDocs({include_docs: true}).then(function(results) {

				if( results && results.rows.length > 0 ) {
					defer.resolve(results.rows[0].doc);
				} else {
					defer.resolve(null);
				}

			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.createDeviceSettings = function() 
		{
			var defer = $q.defer();

			var device_settings = {
				media_permissions: false
			};

			var db = riskmachDatabasesFactory.databases.collection.device_settings;

			db.post(device_settings, {force: true}).then(function(result) {

				device_settings._id = result.id;
				device_settings._rev = result.rev; 

				defer.resolve(device_settings);

			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.saveDeviceSettings = function(device_settings) 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.device_settings;

			db.put(device_settings).then(function(result) {

				device_settings._id = result.id;
				device_settings._rev = result.rev;

				defer.resolve(device_settings);

			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.newActivePdf = function() 
		{
			var record = {
				_id: null, 
				_rev: null,
				record_id: null, 
				record_type: null,
				rm_record_id: null, 
				rm_record_ref: null,
				pdf_type: null, 
				options: {
					gen_multiple: null,
					print: null
				}
			};

			return record;
		}

		factory.getActivePdfRecord = function() 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.active_pdf;

			var options = {
				limit: 1, 
				include_docs: true
			}

			db.allDocs(options).then(function(result) {

				if( result.rows.length > 0 ) {
					defer.resolve(result.rows[0].doc);
				} else {
					defer.resolve(null);
				}

			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.getActivePdf = function() 
		{
			var defer = $q.defer();

			factory.getActivePdfRecord().then(function(active_record) {

				if( !active_record ) {

					var new_record = factory.newActivePdf();

					defer.resolve(new_record);

				} else {
					defer.resolve(active_record);
				}

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.saveActivePdf = function(record) 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.active_pdf;

			if( record.hasOwnProperty('_id') && record._id ) {
				db.put(record).then(function(result) {

					record._id = result.id;
					record._rev = result.rev;

					defer.resolve(record);

				}).catch(function(error) {
					defer.reject(error);
				});
			} else {
				db.post(record, {force: true}).then(function(result) {

					record._id = result.id;
					record._rev = result.rev;

					defer.resolve(record);

				}).catch(function(error) {
					defer.reject(error);
				});
			}

			return defer.promise;
		}

		factory.sync_prep_utils = {
			orig_project_id: null,
			new_project_id: null, 
			asset_key: {},
			procedure_key: {},
			task_key: {},
			mr_hazard_key: {}, 
			mr_control_key: {},
			hazard_control_relation_key: {},
			media_key: {},
			new_project_keys: {
				assets: {},
				tasks: {},
				mr_hazards: {},
				mr_controls: {},
				hazard_control_relations: {},
				media: {}
			},
			cleanUp: function() {
				factory.sync_prep_utils.orig_project_id = null;
				factory.sync_prep_utils.new_project_id = null;
				factory.sync_prep_utils.asset_key = {};
				factory.sync_prep_utils.procedure_key = {};
				factory.sync_prep_utils.task_key = {};
				factory.sync_prep_utils.hazard_key = {};
				factory.sync_prep_utils.control_key = {};
				factory.sync_prep_utils.hazard_control_relation_key = {};
				factory.sync_prep_utils.media_key = {};

				factory.sync_prep_utils.new_project_keys.assets = {};
				factory.sync_prep_utils.new_project_keys.tasks = {};
				factory.sync_prep_utils.new_project_keys.hazards = {};
				factory.sync_prep_utils.new_project_keys.controls = {};
				factory.sync_prep_utils.new_project_keys.hazard_control_relations = {};
				factory.sync_prep_utils.new_project_keys.media = {};
			},
			filterTasksLatestRevisions: function(records) {
				var latest_revs = [];

				angular.forEach(records, function(record, index) {
					if( isLatestRev(record, records) ) {
						latest_revs.push(record);
					}
				});

				function isLatestRev(active_record, records) {
					var is_latest_rev = true;

					// IF A NEW APP RECORD
					if( !active_record.hasOwnProperty('rm_id') || active_record.rm_id == null ) {
						return is_latest_rev;
					}

					// IF ANY RECORDS WITH SAME REF HAVE A HIGHER REV
					for(var i = 0; i < records.length; i++) {
						if( active_record.rm_ref == records[i].rm_ref && parseInt(active_record.revision_number) < parseInt(records[i].revision_number) ) {
							is_latest_rev = false;
						}
					}

					return is_latest_rev;
				}

				return latest_revs;
			},
			createNewProjectFromModifiedData: function(orig_project_id) {
				var defer = $q.defer();
				var run_defer = $q.defer();

				factory.sync_prep_utils.orig_project_id = orig_project_id;

				var new_project = null;

				var stages = ['project','assets','procedures','tasks','hazards','controls','hazard_control_relations','media'];

				runNextStage(run_defer, 0).then(function() {

					factory.sync_prep_utils.cleanUpOrigProject().then(function() {

						factory.sync_prep_utils.markNewProjectCloneComplete(factory.sync_prep_utils.new_project_id).then(function() {
						
							factory.sync_prep_utils.cleanUp();

							defer.resolve(new_project);
						}, function(error) {
							console.log(error + " 3");
							defer.reject(error);
						});

					}, function(error) {
						console.log(error + " 2");
						defer.reject(error);
					});

				}, function(error) {
					factory.sync_prep_utils.cleanUp();
					console.log(error + " 1");
					defer.reject(error);
				});

				function runNextStage(defer, active_index) {

					if( active_index > stages.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					if( stages[active_index] == 'project' ) {
						factory.sync_prep_utils.createNewProject().then(function(new_project_doc) {

							new_project = new_project_doc;

							if( new_project.hasOwnProperty('clone_from_modified_complete') && new_project.clone_from_modified_complete ) {
								console.log("FETCHED NEW PROJECT");
								defer.resolve();
								return defer.promise;
							}

							console.log("NEW PROJECT CREATED");

							active_index++;

							runNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( stages[active_index] == 'assets' ) {
						factory.sync_prep_utils.assets.cloneModifiedAssets().then(function() {

							console.log("ASSETS CLONED");

							active_index++;

							runNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( stages[active_index] == 'procedures' ) {
						factory.sync_prep_utils.procedures.cloneModifiedProcedures().then(function() {

							console.log("PROCEDURES CLONED");

							active_index++;

							runNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( stages[active_index] == 'tasks' ) {
						factory.sync_prep_utils.tasks.cloneModifiedTasks().then(function() {

							console.log("TASKS CLONED");

							active_index++;

							runNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( stages[active_index] == 'hazards' ) {
						factory.sync_prep_utils.mr_hazards.cloneModifiedMrHazards().then(function() {

							console.log("HAZARDS CLONED");

							active_index++;

							runNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( stages[active_index] == 'controls' ) {
						factory.sync_prep_utils.mr_controls.cloneModifiedMrControls().then(function() {

							console.log("CONTROLS CLONED");

							active_index++;

							runNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( stages[active_index] == 'hazard_control_relations' ) {
						factory.sync_prep_utils.hazard_control_relations.cloneModifiedMrHazardControlRelations().then(function() {

							console.log("HAZARD CONTROL RELATIONS CLONED");

							active_index++;

							runNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( stages[active_index] == 'media' ) {
						factory.sync_prep_utils.media.cloneModifiedMedia().then(function() {

							console.log("MEDIA CLONED");

							active_index++;

							runNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					return defer.promise;
				}

				return defer.promise;
			},
			createNewProject: function() {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.projects;

				db.get(factory.sync_prep_utils.orig_project_id).then(function(doc) {

					if( doc.hasOwnProperty('working_project_id') && doc.working_project_id ) {
						
						factory.sync_prep_utils.new_project_id = doc.working_project_id;

						// FETCH DATA IN NEW PROJECT, STORE IN KEY/VALUES
						factory.sync_prep_utils.fetchWorkingProjectData().then(function(new_project) {
							defer.resolve(new_project);
						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					var new_doc = angular.copy(doc);

					var start_date_o = new Date();
					var start_date = start_date_o.getFullYear() + '-' + ('0' + (start_date_o.getMonth()+1)).slice(-2) + '-' + ('0' + start_date_o.getDate()).slice(-2);

					new_doc._id = null;
					new_doc._rev = null;
					new_doc.working_project_id = null;
					new_doc.title = doc.title + '' + new Date().getTime() + '';
					new_doc.rm_id = null;
					new_doc.rm_ref = null;
					new_doc.status = 1; // LIVE
					new_doc.synced = false;
					new_doc.imported = false;
					new_doc.start_date = start_date;
					new_doc.num_assets = null;
					new_doc.user_id = authFactory.cloudUserId();
					new_doc.date_added = new Date();
					new_doc.syncing = false;
					new_doc.downloading = false;
					new_doc.archived = null;
					new_doc.installed = null;
					new_doc.controls_auto_verified = false;
					new_doc.is_mr_defect_project = null;
					new_doc.is_managed_risk_audit = null;
					new_doc.rm_managed_risk_id = null;
					new_doc.rm_managed_risk_ref = null;
					new_doc.managed_risk_id = null;
					new_doc.external_ref_scanned = 'No';
					new_doc.date_record_synced = null;
					new_doc.date_content_synced = null;
					new_doc.date_record_imported = null;
					new_doc.date_content_imported = null;
					new_doc.record_modified = 'Yes';
					new_doc.uninstalled_checklists = 'No';
					new_doc.rm_record = null; 
					new_doc.rm_record_modified = 'No';
					new_doc.table = 'projects';
					new_doc.clone_from_modified_complete = false;
					new_doc.working_project_id = null;
					new_doc.modified_project_name = null;

					// SET CLONED FROM IDS
					new_doc.cloned_from_id = doc._id;
					new_doc.cloned_from_rm_id = doc.rm_id;
					new_doc.cloned_from_modified_id = doc._id;

					db.post(new_doc).then(function(result) {
						new_doc._id = result.id;
						new_doc._rev = result.rev;

						// UPDATE ORIG PROJECT WITH WORKING PROJECT ID
						doc.working_project_id = new_doc._id;

						db.put(doc).then(function(result2) {

							factory.sync_prep_utils.new_project_id = new_doc._id;

							defer.resolve(new_doc);

						}).catch(function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			fetchWorkingProjectData: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var new_project = null;

				var stages = ['project','assets','tasks','hazards','controls','hazard_control_relations','media'];

				fetchNextStage(fetch_defer, 0).then(function() {
					defer.resolve(new_project);
				}, function(error) {
					defer.reject(error);
				});

				function fetchNextStage(defer, active_index) {

					if( active_index > stages.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					// CHECK NEW PROJECT HAS NOT ALREADY COMPLETED CLONE
					if( stages[active_index] == 'project' ) {
						riskmachDatabasesFactory.databases.collection.projects.get(factory.sync_prep_utils.new_project_id).then(function(new_project_doc) {

							new_project = new_project_doc;

							// IF ALREADY COMPLETED CLONE, CONTINUE TO SYNC THIS PROJECT
							if( new_project_doc.hasOwnProperty('clone_from_modified_complete') && new_project_doc.clone_from_modified_complete ) {
								defer.resolve();
								return defer.promise;
							}

							active_index++;

							fetchNextStage(defer, active_index);

						}).catch(function(error) {
							defer.reject(error);
						});
					}

					if( stages[active_index] == 'assets' ) {
						factory.sync_prep_utils.fetchWorkingProjectAssets().then(function() {

							active_index++;

							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( stages[active_index] == 'tasks' ) {
						factory.sync_prep_utils.fetchWorkingProjectTasks().then(function() {

							active_index++;

							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( stages[active_index] == 'hazards' ) {
						factory.sync_prep_utils.fetchWorkingProjectMrHazards().then(function() {

							active_index++;

							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( stages[active_index] == 'controls' ) {
						factory.sync_prep_utils.fetchWorkingProjectMrControls().then(function() {

							active_index++;

							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( stages[active_index] == 'hazard_control_relations' ) {
						factory.sync_prep_utils.fetchWorkingProjectMrHazardControlRelations().then(function() {

							active_index++;

							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( stages[active_index] == 'media' ) {
						factory.sync_prep_utils.fetchWorkingProjectMedia().then(function() {

							active_index++;

							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					return defer.promise;
				}

				return defer.promise;
			},
			fetchWorkingProjectAssets: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.assets;

				var options = {
					limit: 100,
					include_docs: true
				};

				fetchNextPage(fetch_defer).then(function() {
						
					console.log("FETCHED WORKING PROJECT ASSETS");
					console.log(factory.sync_prep_utils.new_project_keys.assets);
					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) 
						{
							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.project_id != factory.sync_prep_utils.new_project_id ) {
									errors++;
								}

								if( errors == 0 ) {
									factory.sync_prep_utils.new_project_keys.assets[ result.rows[i].doc.cloned_from_modified_id ] = result.rows[i].doc._id;
								}

								i++;
							}

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;

							fetchNextPage(defer);
						} 
						else 
						{
							// FINISHED PAGINATION, RESOLVE
							defer.resolve();
						}

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			fetchWorkingProjectTasks: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.tasks;

				var options = {
					limit: 100,
					include_docs: true
				};

				fetchNextPage(fetch_defer).then(function() {
						
					console.log("FETCHED WORKING PROJECT TASKS");
					console.log(factory.sync_prep_utils.new_project_keys.tasks);
					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) 
						{
							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.activity_id != factory.sync_prep_utils.new_project_id ) {
									errors++;
								}

								if( errors == 0 ) {
									factory.sync_prep_utils.new_project_keys.tasks[ result.rows[i].doc.cloned_from_modified_id ] = result.rows[i].doc._id;
								}

								i++;
							}

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;

							fetchNextPage(defer);
						} 
						else 
						{
							// FINISHED PAGINATION, RESOLVE
							defer.resolve();
						}

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			fetchWorkingProjectMrHazards: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.mr_hazards;

				var options = {
					limit: 100,
					include_docs: true
				};

				fetchNextPage(fetch_defer).then(function() {
						
					console.log("FETCHED WORKING PROJECT HAZARDS");
					console.log(factory.sync_prep_utils.new_project_keys.mr_hazards);
					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) 
						{
							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.activity_id != factory.sync_prep_utils.new_project_id ) {
									errors++;
								}

								if( errors == 0 ) {
									factory.sync_prep_utils.new_project_keys.mr_hazards[ result.rows[i].doc.cloned_from_modified_id ] = result.rows[i].doc._id;
								}

								i++;
							}

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;

							fetchNextPage(defer);
						} 
						else 
						{
							// FINISHED PAGINATION, RESOLVE
							defer.resolve();
						}

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			fetchWorkingProjectMrControls: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.mr_controls;

				var options = {
					limit: 100,
					include_docs: true
				};

				fetchNextPage(fetch_defer).then(function() {
						
					console.log("FETCHED WORKING PROJECT CONTROLS");
					console.log(factory.sync_prep_utils.new_project_keys.mr_controls);
					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) 
						{
							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.activity_id != factory.sync_prep_utils.new_project_id ) {
									errors++;
								}

								if( errors == 0 ) {
									factory.sync_prep_utils.new_project_keys.mr_controls[ result.rows[i].doc.cloned_from_modified_id ] = result.rows[i].doc._id;
								}

								i++;
							}

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;

							fetchNextPage(defer);
						} 
						else 
						{
							// FINISHED PAGINATION, RESOLVE
							defer.resolve();
						}

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			fetchWorkingProjectMrHazardControlRelations: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.hazard_control_relations;

				var options = {
					limit: 100,
					include_docs: true
				};

				fetchNextPage(fetch_defer).then(function() {
						
					console.log("FETCHED WORKING PROJECT HAZARD CONTROL RELATIONS");
					console.log(factory.sync_prep_utils.new_project_keys.hazard_control_relations);
					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) 
						{
							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.activity_id != factory.sync_prep_utils.new_project_id ) {
									errors++;
								}

								if( errors == 0 ) {
									factory.sync_prep_utils.new_project_keys.hazard_control_relations[ result.rows[i].doc.cloned_from_modified_id ] = result.rows[i].doc._id;
								}

								i++;
							}

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;

							fetchNextPage(defer);
						} 
						else 
						{
							// FINISHED PAGINATION, RESOLVE
							defer.resolve();
						}

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			fetchWorkingProjectMedia: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.media;

				var options = {
					limit: 100,
					include_docs: true
				};

				fetchNextPage(fetch_defer).then(function() {
						
					console.log("FETCHED WORKING PROJECT MEDIA RECORDS");
					console.log(factory.sync_prep_utils.new_project_keys.media);
					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) 
						{
							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.activity_id != factory.sync_prep_utils.new_project_id ) {
									errors++;
								}

								if( errors == 0 ) {
									factory.sync_prep_utils.new_project_keys.media[ result.rows[i].doc.cloned_from_modified_id ] = result.rows[i].doc._id;
								}

								i++;
							}

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;

							fetchNextPage(defer);
						} 
						else 
						{
							// FINISHED PAGINATION, RESOLVE
							defer.resolve();
						}

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			markNewProjectCloneComplete: function(project_id) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.projects;

				db.get(project_id).then(function(doc) {

					doc.clone_from_modified_complete = true;

					db.put(doc).then(function(result) {

						doc._id = result.id;
						doc._rev = result.rev;

						defer.resolve();

					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			clearWorkingProjectId: function(project_id) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.projects;

				db.get(project_id).then(function(doc) {

					doc.working_project_id = null;
					doc.modified_project_name = null;

					db.put(doc).then(function(result) {

						doc._id = result.id;
						doc._rev = result.rev;

						defer.resolve(doc);

					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			cleanUpOrigProject: function() {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var stages = ['media','hazard_control_relations','mr_hazards','mr_controls','tasks','procedures','assets'];

				cleanUpNextStage(save_defer, 0).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function cleanUpNextStage(defer, active_index) {

					if( active_index > stages.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					var db_name = null;
					var key_name = null;

					if( stages[active_index] == 'assets' ) {
						db_name = 'assets';
						key_name = 'asset_key';
					}

					if( stages[active_index] == 'procedures' ) {
						db_name = 'tasks';
						key_name = 'procedure_key';
					}

					if( stages[active_index] == 'tasks' ) {
						db_name = 'tasks';
						key_name = 'task_key';
					}

					if( stages[active_index] == 'mr_hazards' ) {
						db_name = 'mr_hazards';
						key_name = 'mr_hazard_key';
					}

					if( stages[active_index] == 'mr_controls' ) {
						db_name = 'mr_controls';
						key_name = 'mr_control_key';
					}

					if( stages[active_index] == 'hazard_control_relations' ) {
						db_name = 'hazard_control_relations';
						key_name = 'hazard_control_relation_key';
					}

					if( stages[active_index] == 'media' ) {
						db_name = 'media';
						key_name = 'media_key';
					}

					factory.sync_prep_utils.cleanUpOrigRecordBatch(db_name, key_name).then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			cleanUpOrigRecordBatch: function(db_name, key_name) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var id_array = [];

				Object.keys(factory.sync_prep_utils[key_name]).forEach(function(key) {
					id_array.push(key);
				});

				cleanUpNextRecord(save_defer, 0).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function cleanUpNextRecord(defer, active_index) {

					if( active_index > id_array.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					factory.sync_prep_utils.cleanUpOrigRecord(id_array[active_index], db_name).then(function() {

						active_index++;

						cleanUpNextRecord(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			cleanUpOrigRecord: function(doc_id, db_name) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection[db_name];

				db.get(doc_id).then(function(record) {

					// IF NEWLY CREATED RECORD, DELETE
					if( !record.hasOwnProperty('rm_id') || !record.rm_id ) {
						db.remove(record).then(function(result) {
							record._id = result.id;
							record._rev = result.rev;

							defer.resolve();
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					var rm_record = null;

					// SET BACK TO OLD RM RECORD
					if( record.hasOwnProperty('rm_record') && record.rm_record ) {
						rm_record = angular.copy(record.rm_record);
						rm_record._id = record._id;
						rm_record._rev = record._rev;

						// SET RECORD MODIFIED STATUS
						rm_record.record_modified = record.record_modified;
					}

					if( rm_record ) {
						record = rm_record;
					}

					// SET ORIG RECORD BACK TO NOT MODIFIED
					record.synced = null;
					record.imported = null;

					record.sync_id = null;
					record.mid_record_id = null;

					record.date_record_synced = null;
					record.date_content_synced = null;
					record.date_record_imported = null;
					record.date_content_imported = null;

					// record.record_modified = 'No';

					db.put(record).then(function(result) {

						record._id = result.id;
						record._rev = result.rev;

						defer.resolve(record);

					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});
				
				return defer.promise;
			},	
			assets: {
				cloneModifiedAssets: function() {
					var defer = $q.defer();
					var save_defer = $q.defer();

					factory.sync_prep_utils.assets.fetchModifiedAssets().then(function(modified_assets) {

						cloneNextAsset(save_defer, 0).then(function() {

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

						function cloneNextAsset(defer, active_index) {

							if( active_index > modified_assets.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}

							factory.sync_prep_utils.assets.cloneAssetRecord(modified_assets[active_index]).then(function() {

								active_index++;

								cloneNextAsset(defer, active_index);

							}, function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				fetchModifiedAssets: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.assets;

					var options = {
						limit: 100,
						include_docs: true
					};

					var assets = [];

					fetchNextPage(fetch_defer).then(function() {
							
						console.log("FETCHED MODIFIED ASSETS: " + assets.length);
						console.log(assets);
						defer.resolve(assets);

					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) {

						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								var filtered_assets = [];

								var i = 0;
								var len = result.rows.length;

								while(i < len) {
									var errors = 0;

									if( result.rows[i].doc.table != 'assets' ) {
										errors++;
									}

									if( result.rows[i].doc.hasOwnProperty('record_type') && result.rows[i].doc.record_type != '' && result.rows[i].doc.record_type != null ) {
										errors++;
									}

									if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
										errors++;
									}

									if( result.rows[i].doc.project_id != factory.sync_prep_utils.orig_project_id ) {
										errors++;
									}

									if( result.rows[i].doc.hasOwnProperty('clone_incomplete') && result.rows[i].doc.clone_incomplete == 'Yes' ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('record_modified') || result.rows[i].doc.record_modified != 'Yes' ) {
										errors++;
									}

									if( errors == 0 ) {

										if( !result.rows[i].doc.hasOwnProperty('parent_asset_id') ) {
											result.rows[i].doc.parent_asset_id = null;
										}

										filtered_assets.push(result.rows[i].doc);
									}

									i++;
								}

								assets.push(...filtered_assets);

								options.startkey = result.rows[ result.rows.length - 1 ].id;
								options.skip = 1;

								result.rows = null;
								filtered_assets = null;

								fetchNextPage(defer);
							} 
							else 
							{
								// FINISHED PAGINATION, RESOLVE
								defer.resolve();
							}

						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				cloneAssetRecord: function(doc) {
					var defer = $q.defer();

					// IF ASSET HAS ALREADY BEEN CLONED INTO NEW PROJECT
					if( factory.sync_prep_utils.new_project_keys.assets.hasOwnProperty(doc._id) ) {

						factory.sync_prep_utils.asset_key[ doc._id ] = factory.sync_prep_utils.new_project_keys.assets[ doc._id ];

						defer.resolve();
						return defer.promise;
					}

					var db = riskmachDatabasesFactory.databases.collection.assets;

					var new_doc = angular.copy(doc);

					new_doc._id = null;
					new_doc._rev = null;
					new_doc.rm_id = null;
					new_doc.rm_ref = null;
					// new_doc.status = 1; // LIVE
					new_doc.synced = false;
					new_doc.imported = false;
					new_doc.project_id = factory.sync_prep_utils.new_project_id;
					new_doc.rm_project_id = null;
					new_doc.date_added = new Date().getTime();
					new_doc.qr_code = null;
					new_doc.date_record_synced = null; 
					new_doc.date_content_synced = null;
					new_doc.date_record_imported = null;
					new_doc.date_content_imported = null;
					new_doc.user_id = authFactory.cloudUserId();
					new_doc.record_modified = 'Yes';
					new_doc.rm_record = null;
					new_doc.rm_record_modified = 'No';
					new_doc.rm_parent_asset_id = null;
					new_doc.parent_asset_id = null;
					new_doc.num_children = 0;
					new_doc.parent_asset_ref = null;
					// new_doc.num_files = 0;

					// CLEAR REINSPECTION VALUES
					new_doc.re_inspection_asset = null;
					new_doc.re_inspection_data_downloaded = null;
					new_doc.re_inspection_of_id = null;
					new_doc.re_inspection_of_rm_id = null;

					// SET CLONED FROM IDS
					new_doc.cloned_from_id = doc._id;
					new_doc.cloned_from_rm_id = doc.rm_id;
					new_doc.cloned_from_modified_id = doc._id;

					riskmachDatabasesFactory.databases.collection.assets.post(new_doc).then(function(result) {
						new_doc._id = result.id;
						new_doc._rev = result.rev;

						factory.sync_prep_utils.asset_key[ doc._id ] = new_doc._id;

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			procedures: {
				cloneModifiedProcedures: function() {
					var defer = $q.defer();
					var save_defer = $q.defer();

					factory.sync_prep_utils.procedures.fetchModifiedProcedures().then(function(modified_procedures) {

						cloneNextProcedure(save_defer, 0).then(function() {

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

						function cloneNextProcedure(defer, active_index) {

							if( active_index > modified_procedures.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}

							factory.sync_prep_utils.procedures.cloneProcedureRecord(modified_procedures[active_index]).then(function() {

								active_index++;

								cloneNextProcedure(defer, active_index);

							}, function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				fetchModifiedProcedures: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.tasks;

					var options = {
						limit: 100,
						include_docs: true
					};

					var procedures = [];

					fetchNextPage(fetch_defer).then(function() {

						procedures = factory.sync_prep_utils.filterTasksLatestRevisions(procedures);
							
						console.log("FETCHED MODIFIED PROCEDURES: " + procedures.length);
						console.log(procedures);
						defer.resolve(procedures);

					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) {

						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								var filtered_procedures = [];

								var i = 0;
								var len = result.rows.length;

								while(i < len) {
									var errors = 0;

									if( result.rows[i].doc.table != 'tasks' ) {
										errors++;
									}

									if( result.rows[i].doc.task_type != 'procedure' ) {
										errors++;
									}

									if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
										errors++;
									}

									if( !factory.sync_prep_utils.asset_key.hasOwnProperty(result.rows[i].doc.asset_id) ) {
										errors++;
									}

									if( result.rows[i].doc.hasOwnProperty('clone_incomplete') && result.rows[i].doc.clone_incomplete == 'Yes' ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('record_modified') || result.rows[i].doc.record_modified != 'Yes' ) {
										errors++;
									}

									if( errors == 0 ) {
										filtered_procedures.push(result.rows[i].doc);
									}

									i++;
								}

								procedures.push(...filtered_procedures);

								options.startkey = result.rows[ result.rows.length - 1 ].id;
								options.skip = 1;

								result.rows = null; 
								filtered_procedures = null;

								fetchNextPage(defer);
							} 
							else 
							{
								// FINISHED PAGINATION, RESOLVE
								defer.resolve();
							}

						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				cloneProcedureRecord: function(doc) {
					var defer = $q.defer();

					// IF PROCEDURE HAS ALREADY BEEN CLONED INTO NEW PROJECT
					if( factory.sync_prep_utils.new_project_keys.tasks.hasOwnProperty(doc._id) ) {

						factory.sync_prep_utils.procedure_key[ doc._id ] = factory.sync_prep_utils.new_project_keys.tasks[ doc._id ];

						defer.resolve();
						return defer.promise;
					}

					if( !factory.sync_prep_utils.asset_key.hasOwnProperty(doc.asset_id) ) {
						defer.reject("Could not find asset ID for " + doc.task_type + " clone");
						return defer.promise;
					}

					var db = riskmachDatabasesFactory.databases.collection.tasks;

					var new_doc = angular.copy(doc);

					new_doc._id = null;
					new_doc._rev = null;
					// new_doc.rm_id = null;
					// new_doc.rm_ref = null;
					// new_doc.rm_parent_task_id = relations.rm_parent_task_id || null;
					// new_doc.rm_parent_task_ref = relations.rm_parent_task_ref || null;
					new_doc.parent_task_id = null;
					// new_doc.rm_procedure_id = relations.rm_procedure_id || null;
					// new_doc.rm_procedure_ref = relations.rm_procedure_ref || null;
					new_doc.procedure_id = null;
					new_doc.video_media_id = null;
					new_doc.audio_media_id = null;
					new_doc.synced = false;
					new_doc.imported = false;
					new_doc.date_added = new Date().getTime();
					new_doc.rm_activity_id = null;
					new_doc.activity_id = factory.sync_prep_utils.new_project_id;
					new_doc.rm_asset_id = null;
					new_doc.asset_id = factory.sync_prep_utils.asset_key[ doc.asset_id ];
					new_doc.date_record_synced = null; 
					new_doc.date_content_synced = null;
					new_doc.date_record_imported = null;
					new_doc.date_content_imported = null;
					new_doc.user_id = authFactory.cloudUserId();
					new_doc.record_modified = 'Yes';
					new_doc.rm_record = null;
					new_doc.rm_record_modified = 'No';
					new_doc.clone_incomplete = 'No';

					// SET CLONED FROM IDS
					new_doc.cloned_from_id = doc._id;
					new_doc.cloned_from_rm_id = doc.rm_id;
					new_doc.cloned_from_rm_ref = doc.rm_ref;
					new_doc.cloned_from_modified_id = doc._id;

					db.post(new_doc).then(function(result) {

						new_doc._id = result.id;
						new_doc._rev = result.rev;

						factory.sync_prep_utils.procedure_key[ doc._id ] = new_doc._id;

						defer.resolve();

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			tasks: {
				cloneModifiedTasks: function() {
					var defer = $q.defer();
					var save_defer = $q.defer();

					factory.sync_prep_utils.tasks.fetchModifiedTasks().then(function(modified_tasks) {

						cloneNextTask(save_defer, 0).then(function() {

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

						function cloneNextTask(defer, active_index) {

							if( active_index > modified_tasks.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}

							factory.sync_prep_utils.tasks.cloneTaskRecord(modified_tasks[active_index]).then(function() {

								active_index++;

								cloneNextTask(defer, active_index);

							}, function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				fetchModifiedTasks: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.tasks;

					var options = {
						limit: 100,
						include_docs: true
					};

					var tasks = [];
					var steps = [];

					var combined_tasks = [];

					fetchNextPage(fetch_defer).then(function() {

						// ADD SECTIONS TO TASKS ARRAY FIRST, THEN STEPS
						combined_tasks.push(...tasks);
						combined_tasks.push(...steps);
							
						console.log("FETCHED MODIFIED TASKS: " + combined_tasks.length);
						console.log(combined_tasks);
						defer.resolve(combined_tasks);

					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) {

						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								var filtered_tasks = [];
								var filtered_steps = [];

								var i = 0;
								var len = result.rows.length;

								while(i < len) {
									var errors = 0;

									if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
										errors++;
									}

									if( result.rows[i].doc.task_type == 'procedure' ) {
										errors++;
									}

									// IF PROCEDURE NOT FETCHED FOR CLONE
									if( !factory.sync_prep_utils.procedure_key.hasOwnProperty(result.rows[i].doc.procedure_id) ) {
										errors++;
									}

									if( errors == 0 ) {
										if( result.rows[i].doc.task_type == 'task' ) {
											filtered_tasks.push(result.rows[i].doc);
										}

										if( result.rows[i].doc.task_type == 'step' ) {
											filtered_steps.push(result.rows[i].doc);
										}
									}

									i++;
								}

								tasks.push(...filtered_tasks);
								steps.push(...filtered_steps);

								options.startkey = result.rows[ result.rows.length - 1 ].id;
								options.skip = 1;

								result.rows = null; 
								filtered_tasks = null;
								filtered_steps = null;

								fetchNextPage(defer);
							} 
							else 
							{
								// FINISHED PAGINATION, RESOLVE
								defer.resolve();
							}

						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				cloneTaskRecord: function(doc) {
					var defer = $q.defer();

					// IF PROCEDURE HAS ALREADY BEEN CLONED INTO NEW PROJECT
					if( factory.sync_prep_utils.new_project_keys.tasks.hasOwnProperty(doc._id) ) {

						factory.sync_prep_utils.task_key[ doc._id ] = factory.sync_prep_utils.new_project_keys.tasks[ doc._id ];

						defer.resolve();
						return defer.promise;
					}

					if( !factory.sync_prep_utils.asset_key.hasOwnProperty(doc.asset_id) ) {
						defer.reject("Could not find asset ID for " + doc.task_type + " clone");
						return defer.promise;
					}

					if( doc.task_type != 'procedure' ) {

						if( !factory.sync_prep_utils.procedure_key.hasOwnProperty(doc.procedure_id) ) {
							defer.reject("Could not find procedure ID for " + doc.task_type + " clone");
							return defer.promise;
						}

						// IF PARENT TASK NOT FOUND IN PROCEDURES AND TASKS
						if( !factory.sync_prep_utils.task_key.hasOwnProperty(doc.parent_task_id) && !factory.sync_prep_utils.procedure_key.hasOwnProperty(doc.parent_task_id) ) {
							defer.reject("Could not find parent task ID for " + doc.task_type + " clone");
							return defer.promise;
						}

					}

					var db = riskmachDatabasesFactory.databases.collection.tasks;

					var procedure_id = null;
					var parent_task_id = null;

					// IF TOP LEVEL PROCEDURE
					if( doc.task_type != 'procedure' ) {
						procedure_id = factory.sync_prep_utils.procedure_key[ doc.procedure_id ];

						if( factory.sync_prep_utils.procedure_key.hasOwnProperty(doc.parent_task_id) ) {
							parent_task_id = factory.sync_prep_utils.procedure_key[ doc.parent_task_id ];
						} else {
							parent_task_id = factory.sync_prep_utils.task_key[ doc.parent_task_id ];
						}
					}

					var new_doc = angular.copy(doc);

					new_doc._id = null;
					new_doc._rev = null;
					// new_doc.rm_id = null;
					// new_doc.rm_ref = null;
					// new_doc.rm_parent_task_id = relations.rm_parent_task_id || null;
					// new_doc.rm_parent_task_ref = relations.rm_parent_task_ref || null;
					new_doc.parent_task_id = parent_task_id;
					// new_doc.rm_procedure_id = relations.rm_procedure_id || null;
					// new_doc.rm_procedure_ref = relations.rm_procedure_ref || null;
					new_doc.procedure_id = procedure_id;
					new_doc.video_media_id = null;
					new_doc.audio_media_id = null;
					new_doc.synced = false;
					new_doc.imported = false;
					new_doc.date_added = new Date().getTime();
					new_doc.rm_activity_id = null;
					new_doc.activity_id = factory.sync_prep_utils.new_project_id;
					new_doc.rm_asset_id = null;
					new_doc.asset_id = factory.sync_prep_utils.asset_key[ doc.asset_id ];
					new_doc.date_record_synced = null; 
					new_doc.date_content_synced = null;
					new_doc.date_record_imported = null;
					new_doc.date_content_imported = null;
					new_doc.user_id = authFactory.cloudUserId();
					new_doc.record_modified = 'Yes';
					new_doc.rm_record = null;
					new_doc.rm_record_modified = 'No';
					new_doc.clone_incomplete = 'No';

					// SET CLONED FROM IDS
					new_doc.cloned_from_id = doc._id;
					new_doc.cloned_from_rm_id = doc.rm_id;
					new_doc.cloned_from_rm_ref = doc.rm_ref;
					new_doc.cloned_from_modified_id = doc._id;

					db.post(new_doc).then(function(result) {

						new_doc._id = result.id;
						new_doc._rev = result.rev;

						factory.sync_prep_utils.task_key[ doc._id ] = new_doc._id;

						defer.resolve();

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			mr_hazards: {
				cloneModifiedMrHazards: function() {
					var defer = $q.defer();
					var save_defer = $q.defer();

					factory.sync_prep_utils.mr_hazards.fetchModifiedMrHazards().then(function(modified_hazards) {

						cloneNextHazard(save_defer, 0).then(function() {

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

						function cloneNextHazard(defer, active_index) {

							if( active_index > modified_hazards.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}

							factory.sync_prep_utils.mr_hazards.cloneMrHazardRecord(modified_hazards[active_index]).then(function() {

								active_index++;

								cloneNextHazard(defer, active_index);

							}, function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				fetchModifiedMrHazards: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.mr_hazards;

					var options = {
						limit: 100,
						include_docs: true
					};

					var hazards = [];

					fetchNextPage(fetch_defer).then(function() {
							
						console.log("FETCHED MODIFIED MR HAZARDS: " + hazards.length);
						console.log(hazards);
						defer.resolve(hazards);

					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) {

						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								var filtered_hazards = [];

								var i = 0;
								var len = result.rows.length;

								while(i < len) {
									var errors = 0;

									if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
										errors++;
									}

									// IF PARENT TASK NOT FETCHED FOR CLONE
									if( !factory.sync_prep_utils.procedure_key.hasOwnProperty(result.rows[i].doc.task_id) && !factory.sync_prep_utils.task_key.hasOwnProperty(result.rows[i].doc.task_id) ) {
										errors++;
									}

									if( errors == 0 ) {
										filtered_hazards.push(result.rows[i].doc);
									}

									i++;
								}

								hazards.push(...filtered_hazards);

								options.startkey = result.rows[ result.rows.length - 1 ].id;
								options.skip = 1;

								result.rows = null;
								filtered_hazards = null;

								fetchNextPage(defer);
							} 
							else 
							{
								// FINISHED PAGINATION, RESOLVE
								defer.resolve();
							}

						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				cloneMrHazardRecord: function(doc) {
					var defer = $q.defer();

					// IF HAZARD HAS ALREADY BEEN CLONED INTO NEW PROJECT
					if( factory.sync_prep_utils.new_project_keys.mr_hazards.hasOwnProperty(doc._id) ) {

						factory.sync_prep_utils.mr_hazard_key[ doc._id ] = factory.sync_prep_utils.new_project_keys.mr_hazards[ doc._id ];

						defer.resolve();
						return defer.promise;
					}

					if( !factory.sync_prep_utils.asset_key.hasOwnProperty(doc.asset_id) ) {
						defer.reject("Could not find asset ID for hazard clone");
						return defer.promise;
					}

					if( !factory.sync_prep_utils.task_key.hasOwnProperty(doc.task_id) ) {
						defer.reject("Could not find task ID for hazard clone");
						return defer.promise;
					}

					var db = riskmachDatabasesFactory.databases.collection.mr_hazards;

					var new_doc = angular.copy(doc);

					new_doc._id = null;
					new_doc._rev = null;
					// new_doc.rm_id = null;
					// new_doc.rm_ref = null;
					new_doc.activity_id = factory.sync_prep_utils.new_project_id;
					new_doc.asset_id = factory.sync_prep_utils.asset_key[ doc.asset_id ];
					new_doc.task_id = factory.sync_prep_utils.task_key[ doc.task_id ];
					new_doc.date_record_synced = null;
					new_doc.date_content_synced = null;
					new_doc.date_record_imported = null;
					new_doc.date_content_imported = null;
					new_doc.mid_record_id = null;
					new_doc.record_modified = 'Yes';
					new_doc.rm_asset_id = null;
					// new_doc.rm_register_hazard_id = relations.rm_register_hazard_id || null;
					// new_doc.rm_task_id = relations.rm_task_id || null;
					// new_doc.rm_task_ref = relations.rm_task_ref || null;
					// new_doc.rm_assessment_id = relations.rm_assessment_id || null;
					// new_doc.rm_assessment_ref = relations.rm_assessment_ref || null;
					new_doc.rm_activity_id = null;
					// new_doc.revision_number = null;
					new_doc.assessment_id = null;
					new_doc.register_hazard_id = null;
					new_doc.user_id = authFactory.cloudUserId();
					// new_doc.company_id = authFactory.cloudCompanyId();
					new_doc.added_by = authFactory.cloudUserId();
					new_doc.date_added = new Date().getTime();
					new_doc.date_modified = new Date().getTime();
					new_doc.modified_by = authFactory.cloudUserId();
					// new_doc.hazard_considered = 'No';
					new_doc.sync_id = null;
					new_doc.synced = false;
					new_doc.imported = false;

					// SET CLONED FROM VALUES
					if( doc.master_id ) {
						new_doc.master_id = doc.master_id;
					} else {
						new_doc.master_id = doc._id;
					}

					new_doc.cloned_from_id = doc._id;
					new_doc.cloned_from_rm_id = doc.rm_id;
					new_doc.cloned_from_rm_ref = doc.rm_ref;
					new_doc.cloned_from_modified_id = doc._id;

					//SAVE THE NEW HAZARD RECORD
					db.post(new_doc).then(function(result) {

						new_doc._id = result.id;
						new_doc._rev = result.rev;
				
						factory.sync_prep_utils.mr_hazard_key[ doc._id ] = new_doc._id;

						defer.resolve();

					}).catch(function(error){
						defer.reject("There was an error cloning the hazard: " + error);
					});

					return defer.promise;
				}
			},
			mr_controls: {
				cloneModifiedMrControls: function() {
					var defer = $q.defer();
					var save_defer = $q.defer();

					factory.sync_prep_utils.mr_controls.fetchModifiedMrControls().then(function(modified_controls) {

						cloneNextControl(save_defer, 0).then(function() {

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

						function cloneNextControl(defer, active_index) {

							if( active_index > modified_controls.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}

							factory.sync_prep_utils.mr_controls.cloneMrControlRecord(modified_controls[active_index]).then(function() {

								active_index++;

								cloneNextControl(defer, active_index);

							}, function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				fetchModifiedMrControls: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.mr_controls;

					var options = {
						limit: 100,
						include_docs: true
					};

					var controls = [];

					fetchNextPage(fetch_defer).then(function() {
							
						console.log("FETCHED MODIFIED MR CONTROLS: " + controls.length);
						console.log(controls);
						defer.resolve(controls);

					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) {

						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								var filtered_controls = [];

								var i = 0;
								var len = result.rows.length;

								while(i < len) {
									var errors = 0;

									if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
										errors++;
									}

									if( result.rows[i].doc.hasOwnProperty('is_mr_audit') && result.rows[i].doc.is_mr_audit == 'Yes' ) {

										// IF ASSET NOT FETCHED FOR CLONE
										if( !factory.sync_prep_utils.asset_key.hasOwnProperty(result.rows[i].doc.asset_id) ) {
											errors++;
										}

									} else {

										// IF PARENT TASK NOT FETCHED FOR CLONE
										if( !factory.sync_prep_utils.procedure_key.hasOwnProperty(result.rows[i].doc.task_id) && !factory.sync_prep_utils.task_key.hasOwnProperty(result.rows[i].doc.task_id) ) {
											errors++;
										}

									}

									if( errors == 0 ) {
										// FORMAT IF CONTROL IN AUDIT
										if( result.rows[i].doc.hasOwnProperty('is_mr_audit') && result.rows[i].doc.is_mr_audit == 'Yes' ) {
											result.rows[i].doc.orig_assessment_id = result.rows[i].doc.assessment_id;
											result.rows[i].doc.orig_rm_assessment_id = result.rows[i].doc.rm_assessment_id;
											result.rows[i].doc.orig_rm_assessment_ref = result.rows[i].doc.rm_assessment_ref;

											result.rows[i].doc.assessment_id = null;
											result.rows[i].doc.rm_assessment_id = null;
											result.rows[i].doc.rm_assessment_ref = null;
										}

										filtered_controls.push(result.rows[i].doc);
									}

									i++;
								}

								controls.push(...filtered_controls);

								options.startkey = result.rows[ result.rows.length - 1 ].id;
								options.skip = 1;

								result.rows = null;
								filtered_controls = null;

								fetchNextPage(defer);
							} 
							else 
							{
								// FINISHED PAGINATION, RESOLVE
								defer.resolve();
							}

						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				cloneMrControlRecord: function(doc) {
					var defer = $q.defer();

					// IF CONTROL HAS ALREADY BEEN CLONED INTO NEW PROJECT
					if( factory.sync_prep_utils.new_project_keys.mr_controls.hasOwnProperty(doc._id) ) {

						factory.sync_prep_utils.mr_control_key[ doc._id ] = factory.sync_prep_utils.new_project_keys.mr_controls[ doc._id ];

						defer.resolve();
						return defer.promise;
					}

					if( !factory.sync_prep_utils.asset_key.hasOwnProperty(doc.asset_id) ) {
						defer.reject("Could not find asset ID for control clone");
						return defer.promise;
					}

					if( !factory.sync_prep_utils.task_key.hasOwnProperty(doc.task_id) ) {
						defer.reject("Could not find task ID for control clone");
						return defer.promise;
					}

					var db = riskmachDatabasesFactory.databases.collection.mr_controls;

					var new_doc = angular.copy(doc);

					new_doc._id = null;
		            new_doc._rev =  null;
		            // new_doc.rm_id = null;
		            // new_doc.rm_ref = null;
		            // new_doc.revision_number = null;
		            new_doc.rm_merge_to_ref = null;
		            new_doc.rm_asset_id = null;
		            // new_doc.rm_task_id = relations.rm_task_id || null;
		            // new_doc.rm_task_ref = relations.rm_task_ref || null;
		            new_doc.rm_profile_image_id = null;
		            new_doc.rm_record_asset_id = null;
		            // new_doc.rm_register_control_item_id = null;
		            new_doc.rm_activity_id = null;
		            new_doc.activity_id = factory.sync_prep_utils.new_project_id;
		            new_doc.asset_id = factory.sync_prep_utils.asset_key[ doc.asset_id ];
		            new_doc.task_id = factory.sync_prep_utils.task_key[ doc.task_id ];
		            new_doc.record_asset_id = null;
		            new_doc.date_added = new Date().getTime();
		            new_doc.added_by = authFactory.cloudUserId();
		            // new_doc.company_id = authFactory.cloudCompanyId();
		            new_doc.date_modified = new Date().getTime();
		            new_doc.modified_by = authFactory.cloudUserId();
		            // new_doc.is_register = relations.is_register;
		            new_doc.date_record_synced = null;
		            new_doc.date_content_synced = null;
		            new_doc.date_record_imported = null;
		            new_doc.date_content_imported = null;
		            new_doc.user_id = authFactory.cloudUserId();
		            new_doc.record_modified = 'Yes';
		            new_doc.rm_record = null;
		            new_doc.sync_id = null;
		            new_doc.mid_record_id = null;
		            new_doc.synced = false;
		            new_doc.imported = false;

		            new_doc.cloned_from_id = doc._id;
		            new_doc.cloned_from_rm_id = doc.rm_id;
		            new_doc.cloned_from_rm_ref = doc.rm_ref;
		            new_doc.cloned_from_modified_id = doc._id;

		            //SAVE THE CONTROL AND CREATE RECORD ASSET ETC
		            factory.sync_prep_utils.mr_controls.doCloneMrControlRecord(new_doc).then(function(new_doc){

		            	factory.sync_prep_utils.mr_control_key[ doc._id ] = new_doc._id;

		            	defer.resolve();

		            }, function(error){
		            	defer.reject(error);
		            });

					return defer.promise;
				},
				doCloneMrControlRecord: function(doc) {
					var defer = $q.defer();
					
					var options = {
						force: true
					};

					//SAVE THE CONTROL
					riskmachDatabasesFactory.databases.collection.mr_controls.post(doc, options).then(function(res){
						doc._id = res.id;
						doc._rev = res.rev;

						//SAVE THE RECORD ASSET
						factory.sync_prep_utils.mr_controls.cloneMrControlRecordAsset(doc).then(function(doc){
							console.log("SAVED THE CONTROL RECORD ASSET");
							console.log("DOCUMENT RETURNED FROM SAVE CONTROL RECORD ASSET");
							console.log(doc);
							defer.resolve(doc);
						}, function(error){
							defer.reject(error);
						});

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				cloneMrControlRecordAsset: function(control_record){
					var defer = $q.defer();

					var options = {
						force: true
					};

					var asset_status = 1;

					//IF TASK NOT LIVE MARK RECORD ASSET AS DELETED
					if( parseInt(control_record.status) == 4 ) {
						asset_status = 2;
					}

					var is_register = 'No';

					if( control_record.hasOwnProperty('is_register') && control_record.is_register == 'Yes' ) {
						is_register = 'Yes';
					}

					var asset_record = {
						_id: null, 
						_rev: null,
						asset_ref: null,
						serial: null,
						model: null,
						type: null,
						power: null,
						supplier: null,
						manufacturer: null,
						description: null,
						short_description: null,
						external_ref_1: null,
						external_ref_2: null,
						external_ref_3: null,
						external_ref_4: null,
						external_ref_5: null,
						rm_id: null,
						rm_ref: null,
						record_type: null,
						record_id: null,
						rm_record_id: null,
						is_register: 'No',
						status: 1,
						synced: false,
						company_id: null,
						client_id: null,
						project_id: null,
						rm_project_id: null,
						date_added: null,
						rm_parent_asset_id: null,
						parent_asset_id: null,
						parent_asset_ref: null,
						qr_code: null,
						designation_id: null,
						cloned_from_id: null, 
						cloned_from_rm_id: null,
						clone_incomplete: null,
						is_managed_risk_asset: null, 
						is_mr_audit_asset: null,
						cloud_inspections_meta: null,
						rm_register_asset_id: null,
						register_asset_id: null,
						register_asset_ref: null,
						re_inspection_asset: null, 
						re_inspection_data_downloaded: null,
						re_inspection_of_id: null, 
						re_inspection_of_rm_id: null,
						re_inspection_details_set: null,
						agent_asset_size: null, 
						agent_asset_size_name: null,
						agent_inspection_time: null,
						date_record_synced: null, 
						date_content_synced: null,
						date_record_imported: null,
						date_content_imported: null,
						user_id: authFactory.cloudUserId(),
						record_modified: 'Yes',
						rm_record: null,
						rm_record_modified: 'No',
						table: 'assets',
						num_children: null
					};

					asset_record.record_id = control_record._id;
					asset_record.record_type = 'control_item';
					asset_record.is_register = is_register;
					asset_record.status = asset_status;
					asset_record.project_id = factory.sync_prep_utils.new_project_id;

					asset_record.user_id = authFactory.cloudUserId();
					asset_record.company_id = control_record.company_id;
					asset_record.date_added = Date.now();
					asset_record.client_id = authFactory.getActiveCompanyId();
					
					// SAVE CONTROL ASSET RECORD
					riskmachDatabasesFactory.databases.collection.assets.post(asset_record, options).then(function(res){

						console.log("SAVED THE NEW CONTROL RECORD ASSET");

						asset_record._id = res.id;
						asset_record._rev = res.rev;

						//SAVE TASK RECORD WITH RECORD ASSET ID
						control_record.record_asset_id = asset_record._id;

						riskmachDatabasesFactory.databases.collection.mr_controls.post(control_record, options).then(function(res2){
							console.log("INDEXED THE NEW RECORD ASSET BACK TO THE CONTROL");
							console.log(res2);

							control_record._id = res2.id;
							control_record._rev = res2.rev;
							defer.resolve(control_record);

						}).catch(function(error){
							defer.reject("Error updating the control record after the new asset record was created: " + error);
						});

					}).catch(function(error){
						defer.reject("Error saving the new control asset record: " + error);
					});

					return defer.promise;
				},
			},
			hazard_control_relations: {
				cloneModifiedMrHazardControlRelations: function() {
					var defer = $q.defer();
					var save_defer = $q.defer();

					factory.sync_prep_utils.hazard_control_relations.fetchModifiedMrHazardControlRelations().then(function(modified_relations) {

						cloneNextRelation(save_defer, 0).then(function() {

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

						function cloneNextRelation(defer, active_index) {

							if( active_index > modified_relations.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}

							factory.sync_prep_utils.hazard_control_relations.cloneMrHazardControlRelation(modified_relations[active_index]).then(function() {

								active_index++;

								cloneNextRelation(defer, active_index);

							}, function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				fetchModifiedMrHazardControlRelations: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.hazard_control_relations;

					var options = {
						limit: 100,
						include_docs: true
					};

					var relations = [];

					fetchNextPage(fetch_defer).then(function() {
							
						console.log("FETCHED MODIFIED MR HAZARD CONTROL RELATIONS: " + relations.length);
						console.log(relations);
						defer.resolve(relations);

					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) {

						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								var filtered_relations = [];

								var i = 0;
								var len = result.rows.length;

								while(i < len) {
									var errors = 0;

									if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
										errors++;
									}

									// IF THE RELATED HAZARD HAS NOT BEEN FETCHED FOR CLONE
									if( !factory.sync_prep_utils.mr_hazard_key.hasOwnProperty(result.rows[i].doc.hazard_id) ) {
										errors++;
									}

									// IF THE RELATED CONTROL HAS NOT BEEN FETCHED FOR CLONE
									if( !factory.sync_prep_utils.mr_control_key.hasOwnProperty(result.rows[i].doc.control_item_id) ) {
										errors++;
									}

									if( errors == 0 ) {
										filtered_relations.push(result.rows[i].doc);
									}

									i++;
								}

								relations.push(...filtered_relations);

								options.startkey = result.rows[ result.rows.length - 1 ].id;
								options.skip = 1;

								result.rows = null;
								filtered_relations = null;

								fetchNextPage(defer);
							} 
							else 
							{
								// FINISHED PAGINATION, RESOLVE
								defer.resolve();
							}

						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				cloneMrHazardControlRelation: function(doc) {
					var defer = $q.defer();

					// IF RELATION HAS ALREADY BEEN CLONED INTO NEW PROJECT
					if( factory.sync_prep_utils.new_project_keys.hazard_control_relations.hasOwnProperty(doc._id) ) {

						factory.sync_prep_utils.hazard_control_relation_key[ doc._id ] = factory.sync_prep_utils.new_project_keys.hazard_control_relations[ doc._id ];

						defer.resolve();
						return defer.promise;
					}

					if( !factory.sync_prep_utils.asset_key.hasOwnProperty(doc.asset_id) ) {
						defer.reject("Could not find asset ID for hazard-control relation");
						return defer.promise;
					}

					if( !factory.sync_prep_utils.mr_hazard_key.hasOwnProperty(doc.hazard_id) ) {
						defer.reject("Could not find hazard ID for hazard-control relation");
						return defer.promise;
					}

					if( !factory.sync_prep_utils.mr_control_key.hasOwnProperty(doc.control_item_id) ) {
						defer.reject("Could not find control ID for hazard-control relation");
						return defer.promise;
					}

					var db = riskmachDatabasesFactory.databases.collection.hazard_control_relations;

					var new_doc = angular.copy(doc);

					new_doc._id = null;
					new_doc._rev = null;
					// new_doc.rm_id = null;
					new_doc.hazard_id = factory.sync_prep_utils.mr_hazard_key[ doc.hazard_id ];
					new_doc.control_item_id = factory.sync_prep_utils.mr_control_key[ doc.control_item_id ];
					new_doc.date_linked = new Date().getTime();
					new_doc.linked_by = authFactory.cloudUserId();
					new_doc.date_modified = null;
					new_doc.modified_by = null;
					new_doc.assessment_id = null;
					// new_doc.rm_hazard_id = null;
					// new_doc.rm_hazard_ref = null;
					// new_doc.rm_control_item_id = null;
					// new_doc.rm_control_item_ref = null;
					new_doc.rm_assessment_id = null;
					new_doc.rm_activity_id = null;
					new_doc.rm_asset_id = null;
					new_doc.activity_id = factory.sync_prep_utils.new_project_id;
					new_doc.asset_id = factory.sync_prep_utils.asset_key[ doc.asset_id ];
					// new_doc.company_id = authFactory.cloudCompanyId();
					// new_doc.client_id = authFactory.getActiveCompanyId();
					new_doc.date_record_synced = null; 
					new_doc.date_content_synced = null;
					new_doc.date_record_imported = null;
					new_doc.date_content_imported = null;
					new_doc.user_id = authFactory.cloudUserId();
					new_doc.record_modified = 'Yes';
					new_doc.rm_record = null;
					new_doc.rm_record_modified = 'No';
					new_doc.synced = false;
					new_doc.imported = false;

					// SET CLONED FROM IDS
					new_doc.cloned_from_id = doc._id;
					new_doc.cloned_from_rm_id = doc.rm_id;
					new_doc.cloned_from_modified_id = doc._id;

					// SAVE THE NEW RELATION RECORD
					db.post(new_doc).then(function(result){

						new_doc._id = result.id;
						new_doc._rev = result.rev;

						factory.sync_prep_utils.hazard_control_relation_key[ doc._id ] = new_doc._id;

						defer.resolve();

					}).catch(function(error){
						defer.reject("There was an error cloning the hazard-control relation: " + error);
					});

					return defer.promise;
				}
			},
			media: {
				cloneModifiedMedia: function() {
					var defer = $q.defer();
					var save_defer = $q.defer();

					factory.sync_prep_utils.media.fetchModifiedMedia().then(function(modified_media) {

						cloneNextMedia(save_defer, 0).then(function() {

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

						function cloneNextMedia(defer, active_index) {

							if( active_index > modified_media.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}

							factory.sync_prep_utils.media.cloneMediaRecord(modified_media[active_index]).then(function() {

								active_index++;

								cloneNextMedia(defer, active_index);

							}, function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				fetchModifiedMedia: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.media;

					var options = {
						limit: 100,
						include_docs: true
					};

					var media = [];

					var wanted_media = ['asset','task','assessment_hazard','control_item','control_item_verification'];

					fetchNextPage(fetch_defer).then(function() {
							
						console.log("FETCHED MODIFIED MEDIA: " + media.length);
						console.log(media);

						defer.resolve(media);

					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) {

						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								var filtered_media = [];

								var i = 0;
								var len = result.rows.length;

								while(i < len) {
									var errors = 0;

									if( result.rows[i].doc.table != 'mediarecords' ) {
										errors++;
									}

									// IF RECORD TYPE IS NONE OF THE WANTED MEDIA TYPES
									if( wanted_media.indexOf(result.rows[i].doc.record_type) === -1 ) {
										errors++;
									} 

									// if( result.rows[i].doc.record_type == 'assessment' && result.rows[i].doc.hasOwnProperty('item_not_found') && result.rows[i].doc.item_not_found ) {
									// 	errors++;
									// }
	 								
	 								// IF ASSET MEDIA AND ASSET NOT IN CLONE FETCH
	 								if( result.rows[i].doc.record_type == 'asset' && !factory.sync_prep_utils.asset_key.hasOwnProperty(result.rows[i].doc.record_id) ) {
	 									errors++;
	 								}

	 								// IF TASK MEDIA AND TASK NOT IN CLONE FETCH
	 								if( result.rows[i].doc.record_type == 'task' && !factory.sync_prep_utils.task_key.hasOwnProperty(result.rows[i].doc.record_id) && !factory.sync_prep_utils.procedure_key.hasOwnProperty(result.rows[i].doc.record_id) ) {
	 									errors++;
	 								}

	 								// IF HAZARD MEDIA AND HAZARD NOT IN CLONE FETCH
	 								if( result.rows[i].doc.record_type == 'assessment_hazard' && !factory.sync_prep_utils.mr_hazard_key.hasOwnProperty(result.rows[i].doc.record_id) ) {
	 									errors++;
	 								}

	 								// IF CONTROL/VERIFICATION MEDIA AND CONTROL NOT IN CLONE FETCH
	 								if( (result.rows[i].doc.record_type == 'control_item' || result.rows[i].doc.record_type == 'control_item_verification') && !factory.sync_prep_utils.mr_control_key.hasOwnProperty(result.rows[i].doc.record_id) ) {
	 									errors++;
	 								}

									if( errors == 0 ) {
										filtered_media.push(result.rows[i].doc);
									}

									i++;
								}

								media.push(...filtered_media);

								options.startkey = result.rows[ result.rows.length - 1 ].id;
								options.skip = 1;

								result.rows = null;
								filtered_media = null;

								fetchNextPage(defer);
							} 
							else 
							{
								// FINISHED PAGINATION, RESOLVE
								defer.resolve();
							}

						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				cloneMediaRecord: function(doc) {
					var defer = $q.defer();

					// IF MEDIA HAS ALREADY BEEN CLONED INTO NEW PROJECT
					if( factory.sync_prep_utils.new_project_keys.media.hasOwnProperty(doc._id) ) {

						factory.sync_prep_utils.media_key[ doc._id ] = factory.sync_prep_utils.new_project_keys.media[ doc._id ];

						defer.resolve();
						return defer.promise;
					}

					var record_id = null;

					// IF ASSET MEDIA AND ASSET NOT IN CLONE FETCH
					if( doc.record_type == 'asset' ) {

						if( !factory.sync_prep_utils.asset_key.hasOwnProperty(doc.record_id) ) {
							defer.reject("Could not find asset ID for media clone");
							return defer.promise;
						} else {
							record_id = factory.sync_prep_utils.asset_key[ doc.record_id ];
						}

					}

					// IF TASK MEDIA AND TASK NOT IN CLONE FETCH
					if( doc.record_type == 'task' ) {

						if( !factory.sync_prep_utils.task_key.hasOwnProperty(doc.record_id) ) {
							defer.reject("Could not find task ID for media clone");
							return defer.promise;
						} else {
							record_id = factory.sync_prep_utils.task_key[ doc.record_id ];
						}

					}

					// IF HAZARD MEDIA AND HAZARD NOT IN CLONE FETCH
					if( doc.record_type == 'assessment_hazard' ) {

						if( !factory.sync_prep_utils.mr_hazard_key.hasOwnProperty(doc.record_id) ) {
							defer.reject("Could not find hazard ID for media clone");
							return defer.promise;
						} else {
							record_id = factory.sync_prep_utils.mr_hazard_key[ doc.record_id ];
						}

					}

					// IF CONTROL/VERIFICATION MEDIA AND CONTROL NOT IN CLONE FETCH
					if( doc.record_type == 'control_item' || doc.record_type == 'control_item_verification' ) {

						if( !factory.sync_prep_utils.mr_control_key.hasOwnProperty(doc.record_id) ) {
							defer.reject("Could not find control ID for media clone");
							return defer.promise;
						} else {
							record_id = factory.sync_prep_utils.mr_control_key[ doc.record_id ];
						}

					}

					if( !record_id ) {
						defer.reject("Could not find corresponding record ID for media type: " + doc.record_type);
						return defer.promise;
					}

					var db = riskmachDatabasesFactory.databases.collection.media;

					var new_media = angular.copy(doc);
					new_media._id = null;
					new_media._rev = null;
					new_media.rm_id = null;
					new_media.rm_ref = null;
					new_media.rm_revision_number = null;
					new_media.date_record_synced = null;
					new_media.date_content_synced = null;
					new_media.date_record_imported = null;
					new_media.date_content_imported = null;
					new_media.record_modified = 'Yes';
					new_media.record_id = record_id;
					// new_media.record_type = relations.record_type;
					new_media.rm_activity_id = null;
					new_media.activity_id = factory.sync_prep_utils.new_project_id;
					new_media.user_id = authFactory.cloudUserId();
					// new_media.company_id = authFactory.cloudCompanyId();
					new_media.rm_record = null;
					// new_media.is_register = relations.is_register;
					new_media.added_by = authFactory.cloudUserId();
					new_media.date_added = new Date().getTime();
					new_media.modified_by = authFactory.cloudUserId();
					new_media.date_modified = new Date().getTime();
					new_media.mid_record_id = null;
					new_media.sync_id = null;
					//  new_media.representative_image = 'Yes';
					new_media.is_pool_item = null;
					new_media.synced = false;
					new_media.imported = false;

					if( doc.record_type == 'asset' ) {
						new_media.rm_record_item_id = null;
						new_media.rm_record_item_ref = null;
					}

					// IF NOT SET, SET AS RMID OF EXISTING DOC
					if( new_media.file_download_rm_id == null ) {
						new_media.file_download_rm_id = doc.rm_id;
					}

					// IF FILE IS PRESENT, UNSET RMID FOR FILE DOWNLOAD
					if( new_media.file_downloaded == 'Yes' ) {
						new_media.file_download_rm_id = null;
					}

					// SET CLONED FROM IDS
					new_media.cloned_from_id = doc._id;
					new_media.cloned_from_rm_id = doc.rm_id;
					new_media.cloned_from_rm_ref = doc.rm_ref;
					new_media.cloned_from_modified_id = doc._id;

					//SAVE THE NEW MEDIA RECORD
					db.post(new_media, { force: true }).then(function(result){

						new_media._id = result.id;
						new_media._rev = result.rev;

						factory.sync_prep_utils.media_key[ doc._id ] = new_media._id;

						console.log("NEW MEDIA RECORD");
						console.log(new_media);

						// IF TASK, UPDATE video_media_id, audio_media_id
						if( new_media.record_type == 'task' ) 
						{
							factory.sync_prep_utils.media.updateTaskMediaIds(new_media.record_id, new_media).then(function() {

								// IF FILE NOT PRESENT, DON'T CLONE
								if( new_media.file_downloaded == null ) {
									defer.resolve(new_media);
									return defer.promise;
								}

								factory.sync_prep_utils.media.cloneMediaFile(doc._id, doc.attachment_key, new_media).then(function(new_media) {
									defer.resolve(new_media);
								}, function(error) {
									defer.reject(error);
								});

							}, function(error) {
								defer.reject(error);
							});
						} 
						else 
						{
							// IF FILE NOT PRESENT, DON'T CLONE
							if( new_media.file_downloaded == null ) {
								defer.resolve(new_media);
								return defer.promise;
							}

							factory.sync_prep_utils.media.cloneMediaFile(doc._id, doc.attachment_key, new_media).then(function(new_media) {
								defer.resolve(new_media);
							}, function(error) {
								defer.reject(error);
							});
						}

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				updateTaskMediaIds: function(task_id, media_record) {
					var defer = $q.defer();

					// IF MEDIA RECORD IS NEITHER VIDEO/AUDIO
					if( !media_record.is_video && !media_record.is_audio ) {
						defer.resolve();
						return defer.promise;
					}

					var db = riskmachDatabasesFactory.databases.collection.tasks;

					db.get(task_id).then(function(task_doc) {

						if( media_record.is_video ) {
							task_doc.video_media_id = media_record._id;
						}

						if( media_record.is_audio ) {
							task_doc.audio_media_id = media_record._id;
						}

						db.put(task_doc).then(function(result) {
							task_doc._id = result.id;
							task_doc._rev = result.rev;

							defer.resolve(task_doc);

						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				cloneMediaFile: function(src_media_id, src_attachment_key, new_media) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.media;

					//MOVE THE PHYSICAL FILE TO NEW MEDIA RECORD
					db.getAttachment(src_media_id, src_attachment_key).then(function(blob){

						var new_file = new File([blob], src_attachment_key);

						console.log("NEW FILE");
						console.log(new_file);

						db.putAttachment(new_media._id, new_file.name, new_media._rev, new_file, new_file.type).then(function(media_result){

							new_media._id = media_result.id;
							new_media._rev = media_result.rev;

							defer.resolve(new_media);

						}).catch(function(error){
							defer.reject("Error cloning media file: " + error);
						});

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}
			}
		}

		// CREATE UAUDIT
		factory.startChecklistFromBlueprint = function(rm_checklist_id, inspection_data) 
		{
			var defer = $q.defer();

			// CREATE PROJECT USING PP/TYPE IN INSPECTION DATA
			// CREATE INSPECTION USING PP/TYPE AND ASSET REF IN INSPECTION DATA
			// INIT CHECKLIST INSTANCE


			factory.createChecklistProject(inspection_data).then(function() {

				factory.createChecklistInspection(inspection_data).then(function() {

					// CREATE CHECKLIST INSTANCE

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.createChecklistProject = function(inspection_data) 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.projects;

			var project_record = modelsFactory.projects.newProject();

			project_record.pp_id = null;
			project_record.pp_name = null;
			project_record.type = null;
			project_record.type_name = null;

			project_record.title = '';

			db.post(project_record, {force: true}).then(function(result) {
				project_record._id = result.id;
				project_record._rev = result.rev;

				defer.resolve(project_record);
			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.createActionLog = function(data) 
		{
			var defer = $q.defer();

			var action_log = factory.utils.newActionLog();
			action_log.record_id = data.record_id;
			action_log.rm_record_id = data.rm_record_id;
			action_log.record_type = data.record_type;
			action_log.action_type = data.action_type;
			action_log.action_description = data.action_description;

			factory.saveActionLog(action_log).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.saveActionLog = function(action_log) 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.action_log;

			db.post(action_log, {force: true}).then(function(result) {
				action_log._id = result.id;
				action_log._rev = result.rev;

				console.log("ACTION SAVED");
				console.log(action_log);

				defer.resolve(action_log);
			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.user_records = {
			requestUserRecords: function() {
				var defer = $q.defer();

				if( !rmConnectivityFactory.online_detection.online ) {
					defer.reject("No internet connection to request users");
					return defer.promise;
				}

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/CompanyUserList',{ 
	                params: {
	                	client_id: authFactory.getActiveCompanyId()
	                }
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("COMPANY USER LIST REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		defer.resolve(data.users);
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("COMPANY USER LIST ERROR REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );
	                defer.reject("Error connecting to API for Company User List");
	            });

				return defer.promise;
			},
			requestSaveUserRecords: function() {
				var defer = $q.defer();

				factory.user_records.requestUserRecords().then(function(users) {

					factory.user_records.getExistingDbUserRecords().then(function(existing_data) {

						factory.user_records.saveUserRecords(users, existing_data).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getUserRecords: function() {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.user_records;

				// MIGHT NEED TO CHANGE THIS TO WHERE
				// COMPANY ID = LOGGED IN COMPANY ID OR = CLIENT ID

				db.find({
					selector: {
						user_id: authFactory.cloudUserId(),
						CompanyID: authFactory.cloudCompanyId()
					}
				}).then(function(result) {

					var users = factory.user_records.filterUserRecords(result.docs);

					defer.resolve(users);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			filterUserRecords: function(users) {
				var filtered = [];

				var i = 0;
				var len = users.length;

				while(i < len) {
					var errors = 0;

					if( users[i].Status != 1 ) {
						errors++;
					}

					if( errors == 0 ) {

						if( users[i].UserType == 2 ) {
							users[i].UsersName += " (" + users[i].UserTypeName + ")";
						}

						filtered.push(users[i]);
					}

					i++;
				}

				return filtered;
			},
			getExistingDbUserRecords: function() {
				var defer = $q.defer();

				factory.user_records.getUserRecords().then(function(users) {

					var existing_data = {};

					// IF NO EXISTING USER RECORDS
					if( !users.length ) {
						defer.resolve(existing_data);
						return defer.promise;
					}

					var i = 0;
					var len = users.length;
					while(i < len) {

						var record = {
							_id: users[i]._id,
							_rev: users[i]._rev
						}

						existing_data[ users[i].UserID ] = record;

						i++;
					}

					defer.resolve(existing_data);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			saveUserRecords: function(user_records, existing_data) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				saveNextUser(save_defer, 0).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function saveNextUser(defer, active_index) {

					if( active_index > user_records.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					factory.user_records.saveUserRecord(user_records[active_index], existing_data).then(function() {

						active_index++;

						saveNextUser(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;	
			},
			existingUserRecord: function(user_record, existing_data) {
				if( existing_data.hasOwnProperty(user_record.UserID) ) {
					return existing_data[user_record.UserID];
				} else {
					return null;
				}
			},
			saveUserRecord: function(user_record, existing_data) {
				var defer = $q.defer();
				
				var existing_record = factory.user_records.existingUserRecord(user_record, existing_data);

				if( !existing_record ) {

					factory.user_records.saveNewUserRecord(user_record).then(function(result) {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				} else {

					factory.user_records.updateUserRecord(user_record, existing_record).then(function(result) {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}

				return defer.promise;	
			},
			saveNewUserRecord: function(user_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.user_records;

				user_record.user_id = authFactory.cloudUserId();

				db.post(user_record, {force: true}).then(function(result) {

					user_record._id = result.id;
					user_record._rev = result.rev;

					defer.resolve();

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			updateUserRecord: function(user_record, existing_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.user_records;

				user_record._id = existing_record._id;
				user_record._rev = existing_record._rev;
				user_record.user_id = authFactory.cloudUserId();

				db.put(user_record).then(function(result) {

					user_record._id = result.id;
					user_record._rev = result.rev;

					defer.resolve();

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
		}

		factory.departments = {
			requestDepartments: function() {
				var defer = $q.defer();

				if( !rmConnectivityFactory.online_detection.online ) {
					defer.reject("No internet connection to request departments");
					return defer.promise;
				}

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/CompanyDepartments',{ 
	                params: {
	                	filters: {}
	                }
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("COMPANY DEPARTMENTS LIST REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		defer.resolve(data.data);
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("COMPANY DEPARTMENT LIST ERROR REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );
	                defer.reject("Error connecting to API for Company Department List");
	            });

				return defer.promise;
			},
			requestSaveDepartments: function() {
				var defer = $q.defer();

				factory.departments.requestDepartments().then(function(departments) {

					factory.departments.getExistingDbDepartmentRecords().then(function(existing_data) {

						factory.departments.saveDepartmentRecords(departments, existing_data).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getDepartments: function() {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.departments;

				// MIGHT NEED TO CHANGE THIS TO WHERE
				// COMPANY ID = LOGGED IN COMPANY ID OR = CLIENT ID

				db.find({
					selector: {
						user_id: authFactory.cloudUserId(),
						company_id: authFactory.cloudCompanyId()
					}
				}).then(function(result) {

					defer.resolve(result.docs);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getExistingDbDepartmentRecords: function() {
				var defer = $q.defer();

				factory.departments.getDepartments().then(function(departments) {

					var existing_data = {};

					// IF NO EXISTING DEPARTMENTS
					if( !departments.length ) {
						defer.resolve(existing_data);
						return defer.promise;
					}

					var i = 0;
					var len = departments.length;
					while(i < len) {

						var record = {
							_id: departments[i]._id,
							_rev: departments[i]._rev
						}

						existing_data[ departments[i].rm_department_id ] = record;

						i++;
					}

					defer.resolve(existing_data);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			saveDepartmentRecords: function(departments, existing_data) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				saveNextDepartment(save_defer, 0).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function saveNextDepartment(defer, active_index) {

					if( active_index > departments.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					factory.departments.saveDepartmentRecord(departments[active_index], existing_data).then(function() {

						active_index++;

						saveNextDepartment(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;	
			},
			existingDepartment: function(department_record, existing_data) {
				if( existing_data.hasOwnProperty(department_record.rm_department_id) ) {
					return existing_data[department_record.rm_department_id];
				} else {
					return null;
				}
			},
			saveDepartmentRecord: function(department_record, existing_data) {
				var defer = $q.defer();
				
				var existing_record = factory.departments.existingDepartment(department_record, existing_data);

				if( !existing_record ) {

					factory.departments.saveNewDepartmentRecord(department_record).then(function(result) {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				} else {

					factory.departments.updateDepartmentRecord(department_record, existing_record).then(function(result) {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}

				return defer.promise;	
			},
			saveNewDepartmentRecord: function(department_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.departments;

				department_record.user_id = authFactory.cloudUserId();
				department_record.company_id = authFactory.cloudCompanyId();

				db.post(department_record, {force: true}).then(function(result) {

					department_record._id = result.id;
					department_record._rev = result.rev;

					defer.resolve();

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			updateDepartmentRecord: function(department_record, existing_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.departments;

				department_record._id = existing_record._id;
				department_record._rev = existing_record._rev;
				department_record.user_id = authFactory.cloudUserId();
				department_record.company_id = authFactory.cloudCompanyId();

				db.put(department_record).then(function(result) {

					department_record._id = result.id;
					department_record._rev = result.rev;

					defer.resolve();

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
		}

		factory.requestQuickLoginCode = function() 
		{
			var defer = $q.defer();

			$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/QuickLoginCode',{ 
            	params: {}
            })
			.success(function(data, status, headers, config) {

				console.log("REQUEST QUICK LOGIN CODE");
				console.log(data);

				if( data.error ) {

					if( data.error_messages && data.error_messages.length ) {
						defer.reject(data.error_messages[0]);
					} else {
						defer.reject("Error requesting quick login code");
					}

				} else {
					defer.resolve(data.login_code);
				}

            })
            .error(function(data, status, headers, config) {
            	defer.reject("Error on quick login code API");
			});

			return defer.promise;
		}

		factory.isProjectReported = function(project) 
		{
			var is_reported = false;

			if( !project ) {
				return is_reported;
			}

			// PROJECT REPORTED IF IT HAS A REPORT ID
			if( project.hasOwnProperty('report_id') && project.report_id ) {
				is_reported = true;
			}

			return is_reported;
		}

		factory.isProjectInQualityCheck = function(project) 
		{
			var is_qc = false;

			if( !project ) {
				return is_qc;
			}

			// IF PROJECT IS REPORTED AND REPORT IS CURRENTLY IN DRAFT
			if( factory.isProjectReported(project) && project.hasOwnProperty('report_status') && project.report_status == 7 ) {
				is_qc = true;
			}

			return is_qc;
		}

		factory.isProjectLpa = function(project_record) 
		{
			var is_lpa = false;

			if( !project_record ) {
				return is_lpa;
			}

			if( project_record.hasOwnProperty('for_lpa_programme_id') && project_record.for_lpa_programme_id ) {
				is_lpa = true;
			}
  
			return is_lpa;
		}

		factory.isProjectSop = function(project_record) 
		{
			var is_sop = false;

			if( !project_record ) {
				return is_sop;
			}

			if( parseInt(project_record.pp_id) == 41 && parseInt(project_record.type) == 48 ) {
				is_sop = true;
			}

			return is_sop;
		}

		factory.isPoolProject = function(project_record) 
		{
			var is_pool_project = false;

			if( !project_record ) {
				return is_pool_project;
			}

			if( project_record.hasOwnProperty('is_pool_item') && project_record.is_pool_item == 'Yes' ) {
				is_pool_project = true;
			} 

			return is_pool_project;
		}

		factory.tryParseObject = function(jsonString) 
		{
			try {
		        var o = JSON.parse(jsonString);

		        // Handle non-exception-throwing cases:
		        // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
		        // but... JSON.parse(null) returns null, and typeof null === "object", 
		        // so we must check for that, too. Thankfully, null is falsey, so this suffices:
		        if (o && typeof o === "object") {
		            return o;
		        }
		    }
		    catch (e) {
		    	
		    }

		    return false;
		}

		factory.version_check.isBetaVersion();

		//INIT UTILS DATABASE
		riskmachDatabasesFactory.databases.initUtils();
		//INIT DEVICE SETTINGS DATABASE
		riskmachDatabasesFactory.databases.initDeviceSettings();

		// INIT USERS/DEPARTMENTS DB
		riskmachDatabasesFactory.databases.initUserRecords();
		riskmachDatabasesFactory.databases.initDepartments();

		return factory;
	}

	function initDataDownloadFactory(authFactory, $http, $q, riskmachDatabasesFactory, rmUtilsFactory)
	{
		var factory = {};

		factory.initial_setup = {
			data: null,
			stage_records: null,
			stage: null,
			active_stage: null,
			start: function(){
				var defer = $q.defer();

				factory.initial_setup.data = null;
				factory.initial_setup.stage = 'Fetching Data';

				factory.initial_setup.getOnlineUtilsData().then(function(d){

					if( d.error == true )
					{
						defer.reject(d.error_messages[0]);
					}
					else
					{
						factory.initial_setup.stage = 'Saving Data';
						factory.initial_setup.data = d.data;

						// console.log("Got Online Data");
						// console.log(d.data);

						factory.initial_setup.stage_records = factory.initial_setup.createStageRecords(d.data);

						console.log("Stage Records");
						console.log(factory.initial_setup.stage_records);

						factory.initial_setup.startSaveAllStages().then(function(){

							// factory.initial_setup.updateLastSetupDate().then(function(){
							// 	defer.resolve();
							// }, function(error){
							// 	defer.reject(error);
							// });

							defer.resolve();

						}, function(error){
							defer.reject(error);
						});
					}

				}, function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			getOnlineUtilsData: function(){
				var defer = $q.defer();

	            $http.get(authFactory.base_path + 'webapp/v1/UtilsData',{ 
	            	params: {}
	            })
				.success(function(data, status, headers, config) {

	                defer.resolve(data);
	            })
	            .error(function(data, status, headers, config) {
	            	defer.reject("Error getting online utils data");
				});

				return defer.promise;	
			},
			createStageRecords: function(data){
				var stages = {};

				Object.keys(data).forEach(function(key){
					console.log("Key: " + key);

					var stage_record = {
						key: key,
						data: data[key],
						saved: false
					};

					stages[key] = stage_record;
				});

				return stages;
			},
			startSaveAllStages: function(){
				var defer = $q.defer();
				var save_defer = $q.defer();

				factory.initial_setup.saveNextRecordRecursive(save_defer).then(function(){
					defer.resolve();
				}, function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			saveNextRecordRecursive: function(defer){
				
				//FIND THE NEXT STAGE RECORD
				var next_stage_record = null;

				Object.keys(factory.initial_setup.stage_records).forEach(function(key){

					if( !next_stage_record && !factory.initial_setup.stage_records[key].saved )
					{
						next_stage_record = factory.initial_setup.stage_records[key];
					}

				});

				//IF NO MORE LEFT TO SAVE WE'RE FINISHED
				if( !next_stage_record )
				{
					factory.initial_setup.createInstallRecord().then(function(){
						defer.resolve();
						return defer.promise;
					});
				}

				if( next_stage_record )
				{
					factory.initial_setup.active_stage = next_stage_record;

					//SAVE THE DATA
					factory.initial_setup.saveStageData(next_stage_record).then(function(){
						next_stage_record.saved = true;

						//MOVE ON TO THE NEXT STAGE
						factory.initial_setup.saveNextRecordRecursive(defer);

					}, function(error){
						defer.reject(error);
					});
				}

				return defer.promise;
			},
			saveStageData: function(stage_record) {
				var defer = $q.defer();

				var media_stages = ['hazard_types','rrm_list'];
				var media_types = {
					'hazard_types': 'hazard_type',
					'rrm_list': 'rrm'
				};

				factory.initial_setup.saveStageRecord(stage_record).then(function() {

					if( media_stages.indexOf(stage_record.key) === -1 ) {
						defer.resolve();
						return defer.promise;
					}

					factory.media_utils.saveStageMedia(stage_record.data, media_types[stage_record.key]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			saveStageRecord: function(stage_record){
				var defer = $q.defer();

				console.log("TRYING TO SAVE STAGE RECORD");
				console.log(stage_record);

				//FIND EXISTING STAGE RECORD
				riskmachDatabasesFactory.databases.collection.utils.find({
					selector: {
						table: stage_record.key,
						user_id: authFactory.cloudUserId(),
						company_id: authFactory.cloudCompanyId(),
					}
				}).then(function(results){

					//CREATE IF NOT FOUND
					if( results.docs.length == 0 )
					{
						var doc = {
							table: stage_record.key,
							user_id: authFactory.cloudUserId(),
							company_id: authFactory.cloudCompanyId(),
							data: stage_record.data
						};

						riskmachDatabasesFactory.databases.collection.utils.post(doc, { force: true }).then(function(result){
							doc._id = result.id;
							doc._rev = result.rev;

							console.log("SAVED NEW DATA RECORD");
							console.log(doc);

							defer.resolve();
						}).catch(function(error){
							defer.reject("Error saving new data record: " + error);
						});
					}

					//UPDATE EXISTING
					if( results.docs.length > 0 )
					{
						var doc = results.docs[0];
						doc.data = stage_record.data;

						riskmachDatabasesFactory.databases.collection.utils.post(doc, { force: true }).then(function(result){
							doc._id = result.id;
							doc._rev = result.rev;

							console.log("UPDATED DATA RECORD");
							console.log(doc);

							defer.resolve();
						}).catch(function(error){
							defer.reject("Error updating existing new data record: " + error);
						});
					}

				}).catch(function(error){
					defer.reject();
				});

				return defer.promise;
			},
			getLastSetupDate: function(){
				var defer = $q.defer();
				var date = null;

				riskmachDatabasesFactory.databases.collection.utils.find({
					selector: {
						table: 'last_utils_download',
						user_id: authFactory.cloudUserId(),
						company_id: authFactory.cloudCompanyId(),
					}
				}).then(function(results){

					console.log("LAST SETUP DATE RECORDS");
					console.log(results.docs);

					//UPDATE EXISTING
					if( results.docs.length > 0 )
					{
						var doc = results.docs[0];
						date = results.docs[0].date
					}

					defer.resolve(date);

				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			createInstallRecord: function(){
				var defer = $q.defer();
				var ts = new Date().getTime();

				riskmachDatabasesFactory.databases.collection.utils.find({
					selector: {
						table: 'install_record'
					}
				}).then(function(results){

					if( results.docs.length > 0 )
					{
						defer.resolve(results.docs[0]);
						console.log("INITIAL INSTALL RECORD");
						console.log(results.docs[0]);
						return defer.promise;
					}
					else
					{
						var doc = {
							table: 'install_record',
							user_id: authFactory.cloudUserId(),
							company_id: authFactory.cloudCompanyId(),
							date: ts,
							// install_id: factory.initial_setup.createUUID()
							install_id: rmUtilsFactory.utils.createUUID()
						};

						riskmachDatabasesFactory.databases.collection.utils.post(doc, { force: true }).then(function(result){
							doc._id = result.id;
							doc._rev = result.rev;

							console.log("SAVED NEW INSTALL RECORD");
							console.log(doc);

							defer.resolve(doc);
						}).catch(function(error){
							defer.reject("Error saving new utils installation record: " + error);
						});
					}

				})
				.catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			updateLastSetupDate: function(){
				var defer = $q.defer();
				var ts = new Date().getTime();

				riskmachDatabasesFactory.databases.collection.utils.find({
					selector: {
						table: 'last_utils_download',
						user_id: authFactory.cloudUserId(),
						company_id: authFactory.cloudCompanyId(),
					}
				}).then(function(results){

					//CREATE IF NOW FOUND
					if( results.docs.length == 0 )
					{
						var doc = {
							table: 'last_utils_download',
							user_id: authFactory.cloudUserId(),
							company_id: authFactory.cloudCompanyId(),
							date: ts
						};

						riskmachDatabasesFactory.databases.collection.utils.post(doc, { force: true }).then(function(result){
							doc._id = result.id;
							doc._rev = result.rev;

							console.log("SAVED NEW UTILS UPDATED DATE");
							console.log(doc);

							defer.resolve(doc);
						}).catch(function(error){
							defer.reject("Error saving new utils updated date: " + error);
						});
					}

					//UPDATE EXISTING
					if( results.docs.length > 0 )
					{
						var doc = results.docs[0];
						doc.date = ts;

						riskmachDatabasesFactory.databases.collection.utils.put(doc).then(function(result){
							doc._id = result.id;
							doc._rev = result.rev;

							console.log("UPDATED UTILS UPDATED DATE");
							console.log(doc);

							defer.resolve(doc);
						}).catch(function(error){
							defer.reject("Error updating utils updated date: " + error);
						});
					}

				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			}
		};

		factory.media_utils = {
			saveStageMedia: function(data, record_type) {
				var defer = $q.defer();

				console.log("SAVE MEDIA DATA");
				console.log(data);

				var media = factory.media_utils.filterCreateMediaArray(data, record_type);

				if( media.length == 0 ) {
					defer.resolve();
					return defer.promise;
				}

				var filters = {
					record_type: record_type, 
					user_id: authFactory.cloudUserId(),
					company_id: authFactory.cloudCompanyId()
				};

				factory.media_utils.existingDbMedia(filters).then(function(existing_media) {
					
					factory.media_utils.doSaveStageMedia(media, existing_media).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			filterCreateMediaArray: function(data, record_type) {
				var media = [];

				var i = 0;
				var len = data.length;

				while(i < len) {

					if( data[i].hasOwnProperty('IconMediaRef') && data[i].IconMediaRef ) {
						media.push( factory.media_utils.constructMediaRecord(data[i], record_type) );
					}

					i++;
				}

				return media;
			},
			constructMediaRecord: function(record, record_type) {
				var media_record = angular.copy(factory.media_utils.media_model);

				media_record.rm_id = parseInt(record.IconMediaID);
				media_record.rm_ref = parseInt(record.IconMediaRef);
				media_record.rm_revision_number = 0;
				media_record.record_type = record_type;
				media_record.media_path = record.IconPath;
				media_record.file_name = record.IconFile;
				media_record.status = record.Status;

				media_record.user_id = authFactory.cloudUserId();
				media_record.company_id = authFactory.cloudCompanyId();

				return media_record;
			},
			existingDbMedia: function(filters) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var existing_media = {};

				var options = {
					limit: 100,
					include_docs: true
				}

				var db = riskmachDatabasesFactory.databases.collection.media;

				fetchNextPage(fetch_defer).then(function() {
					defer.resolve(existing_media);
				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) 
				{
					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) 
						{
							factory.media_utils.filterExistingDbMedia(result.rows, filters, existing_media);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							media_batch = null;

							fetchNextPage(defer);
						} 
						else 
						{
							// FINISHED PAGINATION, RESOLVE
							defer.resolve();
						}

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			filterExistingDbMedia: function(media, filters, existing_media) {
				var i = 0;
				var len = media.length;

				while(i < len) {

					var errors = 0;

					if( filters.hasOwnProperty('record_type') && media[i].doc.record_type != filters.record_type ) {
						errors++;
					}

					if( filters.hasOwnProperty('user_id') && media[i].doc.user_id != filters.user_id ) {
						errors++;
					}

					if( filters.hasOwnProperty('company_id') && media[i].doc.company_id != filters.company_id ) {
						errors++;
					}

					if( errors == 0 ) {

						var record = {
							_id: media[i].doc._id,
							_ref: media[i].doc._rev,
							rm_id: media[i].doc.rm_id,
							rm_ref: media[i].doc.rm_ref, 
							media_path: media[i].doc.media_path,
							status: media[i].doc.status
						}

						existing_media[ media[i].doc.rm_ref ] = record;
					} 

					i++;
				}

				return existing_media;
			},
			doSaveStageMedia: function(media, existing_media) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				saveNextRecord(save_defer, media, existing_media, 0).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function saveNextRecord(defer, media, existing_media, active_index) {

					if( active_index > media.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					factory.media_utils.saveMediaRecord(media[active_index], existing_media).then(function(saved_media) {

						media[active_index]._id = saved_media._id;
						media[active_index]._rev = saved_media._rev;

						active_index++;

						saveNextRecord(defer, media, existing_media, active_index);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			saveMediaRecord: function(media_record, existing_media) {
				var defer = $q.defer();

				var existing_record = factory.media_utils.mediaRecordExists(media_record.rm_ref, existing_media);

				if( !existing_record ) {
					factory.media_utils.saveNewMediaRecord(media_record).then(function(saved_media) {
						defer.resolve(saved_media);
					}, function(error) {
						defer.reject(error);
					});
				} else {
					factory.media_utils.updateMediaRecord(media_record, existing_record).then(function(saved_media) {
						defer.resolve(saved_media);
					}, function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;
			},
			mediaRecordExists: function(rm_ref, existing_media) {

				var existing_record = null;

				if( angular.isDefined(existing_media[rm_ref]) && existing_media[rm_ref] ) {
							
					console.log("RECORD FOUND IN EXISTING DATA - UPDATE");

					existing_record = existing_media[rm_ref];

				} else {
					console.log("RECORD NOT FOUND - SAVE NEW");
				}

				return existing_record;
			},
			saveNewMediaRecord: function(media_record) {
				var defer = $q.defer();

				var options = {
					force: true
				};

				// SET RM ID FOR IMPORTING, FETCHES EXISTING CLOUD IMAGE FILE
				media_record.file_download_rm_id = media_record.rm_id;

				// SET RM OBJECT
				var rm_record = angular.copy(media_record);
				media_record.rm_record = rm_record;

				riskmachDatabasesFactory.databases.collection.media.post(media_record, options).then(function(saved_record) {

					media_record._id = saved_record.id;
					media_record._rev = saved_record.rev;

					console.log("SAVED NEW MEDIA RECORD");

					defer.resolve(media_record);
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}, 
			updateMediaRecord: function(media_record, existing_record) {
				var defer = $q.defer();

				// IF SAME REVISION, MEDIA PATH IS UPDATED CORRECTLY AND STATUS MATCHES
				if( media_record.rm_id == existing_record.rm_id && media_record.media_path == existing_record.media_path && media_record.status == existing_record.status ) {
					// NO NEED TO UPDATE
					media_record._id = existing_record._id;
					media_record._rev = existing_record._rev;

					console.log("MEDIA RECORD UPDATE SKIPPED");

					defer.resolve(media_record);
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.media;

				var options = {
					force: true
				};

				db.get(existing_record._id).then(function(doc) {

					existing_record = doc;

					// MAKE SURE EXISTING RECORD RMID IS UP TO DATE
					existing_record.rm_id = media_record.rm_id;

					// REMOVE FILE, AS NEW REVISION NEEDS TO BE DOWNLOADED
					existing_record.attachment_key = null;
					existing_record.file_downloaded = null;
					delete existing_record._attachments;

					existing_record.file_name = media_record.file_name;
					existing_record.media_path = media_record.media_path;
					existing_record.status = media_record.status;

					db.put(existing_record).then(function(result) {

						existing_record._id = result.id;
						existing_record._rev = result.rev;

						console.log("MEDIA RECORD UPDATED");

						defer.resolve(existing_record);

					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			media_model: {
				_id: null, 
				_rev: null,
				record_id: null,
				record_type: null,
				attachment_key: null,
				file_name: null,
				file_size: null,
				media_path: null,
				title: null,
				description: null,
				is_video: false,
				is_audio: false,
				media_type: null,
				mime_type: null,
				status: 1,
				rm_id: null,
				rm_ref: null,
				rm_revision_number: null,
				rm_record_item_id: null,
				rm_record_item_ref: null,
				rm_video_id: null, 
				rm_video_ref: null,
				added_by: null,
				date_added: null,
				modified_by: null,
				date_modified: null,
				company_id: null,
				client_id: null,
				rm_activity_id: null,
				activity_id: null,
				cloned_from_id: null,
				cloned_from_rm_id: null, 
				file_download_rm_id: null,
				date_record_synced: null, 
				date_content_synced: null,
				date_record_imported: null,
				date_content_imported: null,
				user_id: authFactory.cloudUserId(), 
				record_modified: 'No',
				rm_record: null,
				rm_record_modified: 'No',
				item_not_found: null,
				file_downloaded: null,
				representative_image: null,
				reference_media: null,
				_attachments: null,
				is_register: 'No',
				table: 'mediarecords'
			}
		};

		return factory;
	}

	function activeUserInfo()
    {
    	var directive = {};

        directive.scope = {};

        directive.restrict = 'A';
        directive.controller = 'activeUserInfoController';
        directive.controllerAs = 'vm';
        directive.bindToController = true;
        directive.templateUrl = '../rm-utils/tpl/active_user_info.html';
        directive.replace = false;

        return directive;
    }

    function activeClientInfo()
    {
    	var directive = {};

        directive.scope = {};

        directive.restrict = 'A';
        directive.controller = 'activeClientInfoController';
        directive.controllerAs = 'vm';
        directive.bindToController = true;
        directive.templateUrl = '../rm-utils/tpl/active_client_info.html';
        directive.replace = false;

        return directive;
    }

	function onlineStatusIndicator()
    {
    	var directive = {};

        directive.scope = {};

        directive.restrict = 'A';
        directive.controller = 'connectivityStatusController';
        directive.controllerAs = 'vm';
        directive.bindToController = true;
        directive.templateUrl = '../rm-utils/tpl/online_status_indicator.html';
        directive.replace = false;

        return directive;
    }

    function appPermissions() 
	{
		var directive = {};

		directive.scope = {};

		directive.restrict = 'A';
		directive.controller = 'appPermissionsController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/tpl/app_permissions.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

	function defaultRiskMethod() 
	{
		var directive = {};

		directive.scope = {};

		directive.restrict = 'A';
		directive.controller = 'defaultRiskMethodController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/tpl/default_risk_method.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

})();