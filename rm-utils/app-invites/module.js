(function() {

	var app = angular.module('riskmachAppInvites', []);
	app.controller('qrCompanyInviteController', qrCompanyInviteController);
	app.factory('appInvitesFactory', appInvitesFactory);
	app.directive('qrCompanyInvite', qrCompanyInvite);

	function qrCompanyInviteController($scope, $rootScope, $q, $interval, $timeout, appInvitesFactory, rmConnectivityFactory, authFactory) 
	{
		var vm = this;

		vm.utils = {
			user_profile: authFactory.active_profile,
			generating_qr: false,
			tabs: {
				active_tab: 'qr_code',
				tabActive: function(tab) {
					if( vm.utils.tabs.active_tab == tab ) {
						return true;
					} else {
						return false;
					}
				},
				changeTab: function(tab) {
					vm.utils.tabs.active_tab = tab;
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
			disabled_handler: {
				disabled: false,
				disabled_message: null,
				inviteDisabled: function() {
					vm.utils.disabled_handler.disabled = false;

					if( vm.utils.isAgent() && (!vm.utils.user_profile.hasOwnProperty('CompanyGUID') || !vm.utils.user_profile.CompanyGUID) ) {
						vm.utils.disabled_handler.disabled = true;
						vm.utils.disabled_handler.disabled_message = "Agents can't QR code invites to add users to their company";
						return vm.utils.disabled_handler.disabled;
					}

					return vm.utils.disabled_handler.disabled_message;
				}
			},
			timer: {
				display_time: 15000, // 15 SECS
				seconds: 15,
				milliseconds: 0,
				running: false,
				intervalHandler: null,
				beginHideQrCodeTimer: function() {

					vm.utils.timer.seconds = 15;
					vm.utils.timer.milliseconds = 0;
					vm.utils.timer.running = true;

					vm.utils.timer.intervalHandler = $interval(function() {

						// DECREMENT SECONDS FOR DISPLAY
						vm.utils.timer.seconds--;
						vm.utils.timer.milliseconds = vm.utils.timer.milliseconds + 1000;

						// IF REACHED DISPLAY TIME
						if( vm.utils.timer.milliseconds == vm.utils.timer.display_time ) {
							// CLEAR QR CODE
							vm.utils.clearQrCode();

							// STOP INTERVAL
							$interval.cancel(vm.utils.timer.intervalHandler);
							vm.utils.timer.intervalHandler = null;
							vm.utils.timer.running = false;
						}

					}, 1000);
				},
			},
			qrcode: null,
			qrcode_el: null,
			generateQr: function() {
				vm.utils.generating_qr = true;

				// QR COMPANY INVITES DISABLED
				if( vm.utils.disabled_handler.inviteDisabled() ) {
					vm.utils.generating_qr = false;
					return;
				} 

				// NO INTERNET CONNECTION
				if( !rmConnectivityFactory.online_detection.online ) {
					vm.utils.generating_qr = false;
					vm.utils.error_handler.logError('Please gain an internet connection to generate a company invite QR code');
					return;
				}

				vm.utils.generateQrUrl().then(function(invite_url) {

					if( vm.utils.qrcode_el ) {
						// MAKE SURE VISIBLE
						vm.utils.qrcode_el.style.display = "block";
					}

					if( vm.utils.qrcode ) {
						vm.utils.qrcode.makeCode(invite_url);
						vm.utils.generating_qr = false;
						vm.utils.timer.beginHideQrCodeTimer();
						return;
					}

					var width = 170;
					var height = 170;

					vm.utils.qrcode_el = document.getElementById("company-invite-qrcode");
					width = vm.utils.qrcode_el.offsetWidth;
					height = width;

					console.log("QR CODE WIDTH: " + width + " - HEIGHT: " + height);

					vm.utils.qrcode = new QRCode(vm.utils.qrcode_el, {
						text: invite_url,
						width: width, 
						height: height
					});

					vm.utils.timer.beginHideQrCodeTimer();

					vm.utils.generating_qr = false;

				}, function(error) {
					vm.utils.generating_qr = false;
					vm.utils.error_handler.logError(error);
				});
			},
			generateQrUrl: function() {
				var defer = $q.defer();

				if( !vm.utils.isAgent() ) {

					appInvitesFactory.generateCompanyInviteUrl().then(function(invite_url) {
						defer.resolve(invite_url);
					}, function(error) {
						defer.reject(error);
					});

				} else {

					appInvitesFactory.generateAgentInviteCodeUrl(vm.utils.user_profile.CompanyGUID).then(function(aic_url) {
						defer.resolve(aic_url);
					}, function(error) {
						defer.reject(error);
					});

				}

				return defer.promise;
			},
			reAttemptGenerateQr: function() {

				// THIS FUNCTION PUTS A TIMEOUT ON GENERATING THE QR SO IT APPEARS TO DO SOMETHING
				// IN CASE IT ERRORS AGAIN DUE TO NO CONNECTION FOR EXAMPLE

				vm.utils.error_handler.clear();
				vm.utils.generating_qr = true;

				$timeout(function() {
					vm.utils.generateQr();
				}, 1000);

			},
			clearQrCode: function() {
				if( !vm.utils.qrcode_el ) {
					console.log("QR CODE DOES NOT EXIST");
					return;
				}

				vm.utils.qrcode_el.style.display = "none";

				$scope.$apply();
			},
			isAgent: function() {
				var is_agent = false;

				if( vm.utils.user_profile && vm.utils.user_profile.hasOwnProperty('IsAgent') && vm.utils.user_profile.IsAgent == 'Yes' ) {
					is_agent = true;
				}

				return is_agent;
			},
			email_code: {
				sending: false,
				show_input: false,
				email: null,
				invite_sent: false,
				validation_error: false,
				validation_error_message: null,
				toggleInput: function() {
					vm.utils.email_code.show_input = !vm.utils.email_code.show_input;
				},
				reset: function() {
					vm.utils.email_code.invite_sent = false;
					vm.utils.email_code.email = null;
					vm.utils.email_code.show_input = false;

					vm.utils.email_code_error_handler.clearError();
				},
				start: function() {
					vm.utils.email_code.reset();
					vm.utils.email_code.show_input = true;

					vm.utils.tabs.changeTab('share_invite');
				},
				send: function() {

					if( !vm.utils.email_code.email ) {
						vm.utils.email_code.validation_error = true;
						vm.utils.email_code.validation_error_message = "Please enter a valid email address";
						return;
					}

					vm.utils.email_code.validation_error = false;
					vm.utils.email_code.validation_error_message = null;

					vm.utils.email_code.sending = true;

					appInvitesFactory.sendInviteViaEmail(vm.utils.email_code.email).then(function() {

						vm.utils.email_code.invite_sent = true;

						vm.utils.email_code.sending = false;

					}, function(error) {
						vm.utils.email_code.sending = false;
						vm.utils.email_code_error_handler.logError(error);
					});

				}
			},
			email_code_error_handler: {
				error: false, 
				error_message: null, 
				logError: function(error) {
					vm.utils.email_code_error_handler.error = true;
					vm.utils.email_code_error_handler.error_message = error;
				}, 
				clearError: function() {
					vm.utils.email_code_error_handler.error = false;
					vm.utils.email_code_error_handler.error_message = null;
				}
			},
			events: function() {

				$scope.$on("qrCompanyInvite::generate", function(event, data) {

					// SHOW QR CODE TAB
					vm.utils.tabs.changeTab('qr_code');

					// CLEAR ANY QR CODE ERRORS
					vm.utils.error_handler.clear();

					// GENERATE QR CODE
					vm.utils.generateQr();

				});

			}()
		}
	}

	function appInvitesFactory($q, $http) 
	{
		var factory = {};

		factory.requests = {
			companyInviteCode: function() {
				var defer = $q.defer();

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/CreateAnonymousRequestRecord',{ 
	                params: {}
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("COMPANY INVITE CODE RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		defer.resolve(data.invite_code);
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("COMPANY INVITE CODE ERROR RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );
	                defer.reject("Error connecting to API for company invite code");
	            });

				return defer.promise;
			}
		}

		factory.generateCompanyInviteUrl = function() 
		{
			var defer = $q.defer();

			factory.requests.companyInviteCode().then(function(invite_record) {

				var invite_token = invite_record.RequestToken;
				var invite_url = "https://system.riskmach.co.uk/join-company/?ic=" + invite_token + "&platform=app";

				defer.resolve(invite_url);

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.generateAgentInviteCodeUrl = function(aic) 
		{
			var defer = $q.defer();

			var aic_url = "https://system.riskmach.co.uk/quick-register/?aic=" + aic;

			defer.resolve(aic_url);

			return defer.promise;
		}

		factory.sendInviteViaEmail = function(email_address) 
		{
			var defer = $q.defer();

			$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/SendUserInviteRequest',{ 
                params: {
                	to_email_address: email_address
                }
            })
            .success(function(data, status, headers, config) {
           		console.log("EMAIL COMPANY INVITE CODE RESPONSE");
           		console.log( JSON.stringify(data, null, 2) );

           		if( data.error ) {
           			
           			if( data.error_messages && data.error_messages.length > 0 ) {
           				defer.reject(data.error_messages[0]);
           			} else {
           				defer.reject("Error sending invite code");
           			}

           		} else {
           			defer.resolve(data);
           		}
            })
            .error(function(data, status, headers, config) {
            	console.log("EMAIL COMPANY INVITE CODE ERROR RESPONSE");
           		console.log( data );
           		defer.reject("Error connecting to API for sending invite code");
            });

			return defer.promise;
		}

		return factory;
	}

	function qrCompanyInvite() 
	{
		var directive = {};

		directive.scope = {};

		directive.restrict = 'A';
		directive.controller = 'qrCompanyInviteController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/app-invites/tpl/qr_company_invite.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

})();