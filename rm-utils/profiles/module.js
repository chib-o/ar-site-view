(function(){

	var app = angular.module('riskmachProfiles', ['tandibar/ng-rollbar','mgcrea.ngStrap','angular-jwt','drag','riskmachDatabases','riskmachUtils']);
	app.controller('selectProfileController', selectProfileController);
	app.directive('selectProfileList', selectProfileList);

	app.config(function($httpProvider, jwtInterceptorProvider){
		jwtInterceptorProvider.tokenGetter = function() {
			return localStorage.getItem('rm_wa_token');
		};

		$httpProvider.interceptors.push('jwtInterceptor');
	});

	app.config(['RollbarProvider', function(RollbarProvider) {
		RollbarProvider.init({
		    accessToken: '8075922a6760479993cc4b4fa0348d15',
		    captureUncaught: true,
		    captureUnhandledRejections: true,
		    payload: {
		        environment: 'production',
		        // context: 'rollbar/test'
		        client: {
		          javascript: {
		            code_version: '1.0',
		            // source_map_enabled: true,
		            // guess_uncaught_frames: true
		          }
		        }
		    }
		});

	}]);

	function selectProfileController($scope, $rootScope, $q, $filter, rmUtilsFactory, authFactory) 
	{
		var vm = this;

		vm.utils = {
			profiles: {
				loading: false,
				refreshing: false,
				data: null,
				filters: {
					profile_search: ''
				},
				selectProfile: function(profile_record){
					console.log("SELECTED PROFILE");
					console.log(profile_record);

					if( !authFactory.user_checks.isUserValid(profile_record).valid ) {
						alert(authFactory.user_checks.isUserValid(profile_record).error_message);
						return;
					}

					// DISABLE SESSION MONITORING WHILE WE SWITCH PROFILE
					authFactory.disable_session_monitoring = true;

					// CLEAR ACTIVE CLIENT
					authFactory.clearActiveClient();

					authFactory.login(profile_record.Token);

					authFactory.setActiveProfile();

					// ENABLE SESSION MONITORING ONCE PROFILE IS SWITCHED
					authFactory.disable_session_monitoring = false;

					function enterProfile() {
						vm.utils.document_handler.enter();
					}

					// ATTEMPT PING, IF FAILS STILL CONTINUE
					rmUtilsFactory.sendPing().then(function() {
						enterProfile();
					}, function(error) {
						enterProfile();
					});
				},
				refreshProfiles: function() {
					var defer = $q.defer();

					var email_address = null;

					if( authFactory.active_profile ) {
						email_address = authFactory.active_profile.EmailAddress;
					}

					vm.utils.profiles.refreshing = true;

					authFactory.getSaveOnlineProfiles(email_address).then(function(data){

						console.log("SAVED PROFILE RECORD");
						console.log(data);

						vm.utils.profiles.refreshing = false;

						vm.utils.profiles.getLocalProfiles();

						defer.resolve();

					}, function(error){
						vm.utils.profiles.refreshing = false;
						vm.utils.error_handler.logError(error);
						defer.reject(error);
						alert(error);
					});

					return defer.promise;
				},
				getLocalProfiles: function() {
					var defer = $q.defer();

					var email_address = null;

					if( authFactory.active_profile ) {
						email_address = authFactory.active_profile.EmailAddress;
					}

					vm.utils.profiles.loading = true;

					authFactory.getLocalProfiles(email_address).then(function(profile_data) {

						console.log("GOT LOCAL PROFILES DATA");
						console.log(profile_data);
						
						vm.utils.profiles.data = $filter('orderBy')(profile_data.profiles, 'CompanyName');
							
						vm.utils.profiles.loading = false;

						$scope.$apply();

						defer.resolve();

					}).catch(function(error){
						console.log("ERROR FETCHING LOCAL PROFILES");
						vm.utils.profiles.loading = false;
						vm.utils.error_handler.logError(error);
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			document_handler: {
				enter: function() {
					window.location.replace("../login/initial-setup.html");
				}
			},
			error_handler: {
				error: false, 
				error_message: null, 
				logError: function(error) {
					vm.utils.error_handler.error = true;
					vm.utils.error_handler.error_message = error;
				}, 
				clear: function() {
					vm.utils.error_handler.error = false;
					vm.utils.error_handler.error_message = null;
				}
			},
			events: function() {

				setTimeout(function() {

					$scope.$on("switchProfile::start", function(event, data) {

						console.log("SWITCH PROFILE");

						// CLEAR ANY PREVIOUS ERRORS
						vm.utils.error_handler.clear();

						// FETCH PROFILES
						vm.utils.profiles.getLocalProfiles();
					});

				}, 0);

			}()
		}
	}

	function selectProfileList() 
	{
		var directive = {};

		directive.scope = {
			directiveid: '='
		};

		directive.restrict = 'A';
		directive.controllerAs = 'vm';
		directive.controller = 'selectProfileController';
		directive.templateUrl = '../rm-utils/profiles/tpl/select_profile_widget.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

})();