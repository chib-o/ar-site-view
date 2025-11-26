(function() {

	var app = angular.module('riskmachOfflineInstallStatus', ['riskmachUtils']);
	app.controller('offlineInstallStatusController', offlineInstallStatusController);
	app.directive('offlineInstallStatus', offlineInstallStatus);

	function offlineInstallStatusController($scope, $rootScope, authFactory) 
	{
		var vm = this;

		vm.utils = {
			display_sw_status: false,
			sw: {
				status: null, 
				status_message: null,
				attempts: 0,
				attempt_limit: 3,
				getSw: function() {

					if ('serviceWorker' in navigator) {

						vm.utils.sw.attempts++;

						navigator.serviceWorker.getRegistration('../sw.js').then(function(registration) {
			        		console.log("GOT SERVICE WORKER REGISTRATION - APP INSTALL STATUS");
			        		console.log(registration);

			        		// SW INSTALL NOT STARTED
			        		if( !registration ) {
				        		vm.utils.sw.setSwStatus('no_sw','The app is not ready for offline working');
			        			return;
			        		}

			        		// SW INSTALLED AND ACTIVATED
			        		if( registration.installing == null && registration.waiting == null ) {
                            	vm.utils.sw.setSwStatus('sw_activated','App is installed!');
                            	return;
							}

							// SW INSTALLED BUT WAITING FOR ACTIVATION
							if( registration.installing == null && registration.waiting ) {
								vm.utils.sw.setSwStatus('sw_waiting','Please close all RiskMach windows in your browser to complete app install');
							}
			        		
							if( registration.installing ) {
								vm.utils.sw.setSwStatus('sw_installing','Installing app...');

								registration.installing.onstatechange = function(){
									vm.utils.sw.checkInstallingWorkerState(registration.installing);
								}
							}

							registration.addEventListener('updatefound', function(){

		                        registration.installing.onstatechange = function(){

		                        	vm.utils.sw.setSwStatus('sw_installing','Installing app...');

                                    vm.utils.sw.checkInstallingWorkerState(registration.installing);
		                        };

							});

			        	});

					} else {
						vm.utils.sw.setSwStatus('sw_not_supported','Service worker\'s are not supported in this browser');
					}

				},
				registerSw: function() {

					if( 'serviceWorker' in navigator ) {

						// TIMEOUT TO GIVE TIME FOR SW TO REGISTER
						setTimeout(function() {

							navigator.serviceWorker.register('../sw.js').then((registration) => {

								vm.utils.sw.registration = registration;

								if( registration.installing == null && registration.waiting == null ) {
									vm.utils.sw.setSwStatus('sw_activated','App is installed!');
								}

								if( registration.installing == null && registration.waiting ) {
									vm.utils.sw.setSwStatus('sw_waiting','Please close all RiskMach windows in your browser and re-open the app to complete the install');
								}

								if( registration.installing )
								{
									vm.utils.sw.setSwStatus('sw_installing','Installing app...');

									registration.installing.onstatechange = function(){
										vm.utils.sw.checkInstallingWorkerState(registration.installing);
									}
								}

								registration.addEventListener('updatefound', function(){

			                        registration.installing.onstatechange = function(){

			                        	vm.utils.sw.setSwStatus('sw_installing','Installing app...');

	                                    vm.utils.sw.checkInstallingWorkerState(registration.installing);
			                        };

								});

							}).catch((error) => {
								vm.utils.sw.setSwStatus('sw_error','Could not install app for offline working: ' + error);
							});

						}, 1000);

					} else {
						vm.utils.sw.setSwStatus('sw_not_supported','Service worker\'s are not supported in this browser');
					}

				},
				checkInstallingWorkerState: function(installingWorker) {

					if( !installingWorker ) {

						console.log("NO INSTALLING WORKER");

                		// IF ATTEMPTS LESS THAN ATTEMPT LIMIT
                    	if( vm.utils.sw.attempts < vm.utils.sw.attempt_limit ) {
                    		// RE-ATTEMPT REGISTERING SERVICE WORKER
                    		// vm.utils.sw.getSw();
                    		vm.utils.sw.registerSw();

                    	} else {
                        	vm.utils.sw.setSwStatus('sw_activated','App installed!');
                    	}
						
						return;
					}

					console.log("OFFLINE INSTALL STATE: " + installingWorker.state);

					switch (installingWorker.state) {
						case 'installing': 
							vm.utils.sw.setSwStatus('sw_installing','Installing app...');
							break;

                        case 'installed':
                        	vm.utils.sw.setSwStatus('sw_activated','App installed!');
                           	break;

                        case 'redundant':
                        	// IF ATTEMPTS LESS THAN ATTEMPT LIMIT
                        	if( vm.utils.sw.attempts < vm.utils.sw.attempt_limit ) {
                        		// RE-ATTEMPT REGISTERING SERVICE WORKER
                        		// vm.utils.sw.getSw();
                        		vm.utils.sw.registerSw();
                        	} else {
                        		vm.utils.sw.setSwStatus('sw_error','Failed to install the app for offline working');
                        	}
                        	break;

                        case 'activating':
                        	vm.utils.sw.setSwStatus('sw_activating','App install activating');
                        	break;

                        case 'activated':
                        	vm.utils.sw.setSwStatus('sw_activated','App installed!');
                            break;

                        default: 
                        	vm.utils.sw.setSwStatus('sw_activated','App installed!');
                        	break;
                    }

				},
				setSwStatus: function(status, message) {
					vm.utils.sw.status = status;
					vm.utils.sw.status_message = message;
					
					switch(vm.utils.sw.status) {
						case 'sw_activated':
							vm.utils.sw.appInstalled();
							vm.utils.display_sw_status = false;
							break;
						default: 
							vm.utils.display_sw_status = true;
							break;
					}

					$scope.$apply();
				},
				isErrored: function() {
					var error = false;
					
					if( vm.utils.sw.status == 'sw_error' ) {
						error = true;
					}

					return error;
				},
				appInstalled: function() {
					$rootScope.$broadcast("appInstallation::activated");
				},
				init: function() {

					setTimeout(function() {

						if( !vm.utils.test_access.hasTestAccess() ) {
							vm.utils.display_sw_status = false;
							return;
						}

						vm.utils.sw.getSw();
					}, 0);

				}()
			},
			test_access: {
				emails: [
					'e.jones@spierssafety.co.uk',
					'a.ginn@riskmach.co.uk',
					'a.thomas@spierssafety.co.uk',
					'w.spiers@spierssafety.co.uk'
				],
				hasTestAccess: function() {
					var has_access = false;

					if( 1 == 1 ) {
						has_access = true;
						return has_access;
					}

					if( !authFactory.active_profile ) {
						has_access = true;
						return has_access;
					}

					var email = authFactory.active_profile.EmailAddress;

					if( vm.utils.test_access.emails.indexOf(email) !== -1 ) {
						has_access = true;
					}

					return has_access;
				}
			},
			goToInstall: function() {
				// window.location.href = "../offline-ready-beta.html";
				window.location.href = "../offline-ready.html";
			}
		}
	}

	function offlineInstallStatus() 
	{
		var directive = {};

		directive.scope = {};

		directive.restrict = 'A';
		directive.controllerAs = 'vm';
		directive.controller = 'offlineInstallStatusController';
		directive.templateUrl = '../rm-utils/offline-install-status/tpl/offline_install_status.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

})();