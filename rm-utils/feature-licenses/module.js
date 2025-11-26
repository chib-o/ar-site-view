(function() {

	var app = angular.module('riskmachFeatureLicenses', ['riskmachUtils','riskmachDatabases','riskmachModels']);
	app.controller('rmCheckoutLandingPageController', rmCheckoutLandingPageController);
	app.controller('pricingTableController', pricingTableController);
	app.controller('unlicensedFeatureController', unlicensedFeatureController);
	app.factory('featureLicenseFactory', featureLicenseFactory);
	app.directive('unlicensedFeature', unlicensedFeature);
	app.directive('pricingTable', pricingTable);
	app.directive('rmCheckoutLandingPage', rmCheckoutLandingPage);

	app.config(function($httpProvider, jwtInterceptorProvider){
		jwtInterceptorProvider.tokenGetter = function() {
			return localStorage.getItem('rm_wa_token');
		};

		$httpProvider.interceptors.push('jwtInterceptor');
	});

	function rmCheckoutLandingPageController($scope, $q, authFactory, featureLicenseFactory) 
	{
		var vm = this;

		vm.utils = {
			url_handler: {
				params: {
					redirect_url: null
				},
				getRedirectUrl: function() {
					var redirect_url = localStorage.getItem('rm_wa_payment_redirect_url');

					if( redirect_url ) {
						vm.utils.url_handler.params.redirect_url = redirect_url;
					}
				}
			},
			document_handler: {
				redirect: function() {

					localStorage.removeItem('rm_wa_payment_redirect_url');

					// IF NO REDIRECT URL, GO TO DASHBOARD
					if( !vm.utils.url_handler.params.redirect_url ) {

						if( authFactory.isAgent() ) {
							window.location.replace('../dashboard/agent_dashboard.html');
						} else {
							window.location.replace('../dashboard/');
						}

					} else {
						// window.location.replace('../project-assets');
						window.location.replace(vm.utils.url_handler.params.redirect_url);
					}

				},
				loginPage: function() {
					window.location.replace("../login/");
				}
			},
			company_licenses: {
				refreshing: false,
				refresh: function() {
					var defer = $q.defer();

					vm.utils.company_licenses.refreshing = true;
					
					featureLicenseFactory.refreshCompaniesFeatureLicenses().then(function() {

						// RE-FETCH COMPANY LICENSES
						featureLicenseFactory.setActiveCompanyLicenses().then(function() {
							vm.utils.company_licenses.refreshing = false;

							defer.resolve();

						}, function(error) {
							vm.utils.company_licenses.refreshing = false;
							defer.reject(error);
						});

					}, function(error) {
						vm.utils.company_licenses.refreshing = false;
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			initLandingPage: function() {

				// CHECK USER LOGGED IN
				var logged_in = authFactory.isLoggedIn();
				if( !logged_in ) {
					vm.utils.document_handler.loginPage();
					return;
				}

				// REFRESH FEATURE LICENSES
				vm.utils.company_licenses.refresh().then(function() {
					// vm.utils.url_handler.getParams();
					vm.utils.url_handler.getRedirectUrl();

					setTimeout(function() {
						vm.utils.document_handler.redirect();
					}, 100);

				});

			},
			init: function() {

				setTimeout(function() {

					vm.utils.initLandingPage();

				}, 0);

			}()
		}
	}

	function pricingTableController($scope, rmConnectivityFactory, featureLicenseFactory, authFactory) 
	{
		var vm = this;

		vm.utils = {
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
			pricing_table: {
				table_guid_ref: vm.tableref,
				loading: false,
				data: null, 
				fetch: function() {

					// IF NO INTERNET CONNECTION
					if( !rmConnectivityFactory.online_detection.online ) {
						vm.utils.error_handler.logError("Please gain an internet connection to view the pricing tables");
						return;
					}

					// CLEAR PREVIOUS ERRORS
					vm.utils.error_handler.clear();

					vm.utils.pricing_table.loading = true;

					var filters = {
						table_guid_ref: vm.utils.pricing_table.table_guid_ref
					}

					console.log("FETCH PRICING TABLE");

					featureLicenseFactory.pricing_tables.fetchData(filters).then(function(data) {

						vm.utils.pricing_table.data = data;

						vm.utils.pricing_table.loading = false;

					}, function(error) {
						vm.utils.pricing_table.loading = false;
						vm.utils.error_handler.logError(error);
					});
				},
				selectPackage: function(package) {

					if( !package.hasOwnProperty('PackageGUID') || !package.PackageGUID ) {
						alert("Package has not GUID");
						return;
					}

					// CREATE WINDOW REFERENCE BEFORE ASYNC FUNCTION FOR SAFARI
					var windowReference = window.open();

					authFactory.loginCloudFromApp().then(function() {

						var current_url = window.location.href;
						localStorage.setItem('rm_wa_payment_redirect_url', current_url);

						var url = "https://system.riskmach.co.uk/basket/select-package.php" + 
						"?package_guid=" + package.PackageGUID + 
						// "&payment_success_redirect=https://system.riskmach.co.uk/browser-app/app/riskmach-payment/";
						"&payment_success_redirect=http://localhost/browser-app/app/riskmach-payment/";

						// window.open(url);
						windowReference.location = url;

					}, function(error) {
						vm.utils.error_handler.logError(error);
					});

				}
			},
			events: function() {

				$scope.$watch("vm.tableref", function(newVal, oldVal) {
					vm.utils.pricing_table.table_guid_ref = vm.tableref;

					console.log("RECEIVED TABLE REF");

					if( !vm.utils.pricing_table.table_guid_ref ) {
						vm.utils.pricing_table.data = null;
						return;
					}

					vm.utils.pricing_table.fetch();
				});

				$scope.$on("pricingTable::init", function(event, data) {

					vm.utils.pricing_table.table_guid_ref = data.table_guid_ref;

					vm.utils.pricing_table.fetch();

				});

			}()
		}
	}

	function unlicensedFeatureController($scope, $rootScope, featureLicenseFactory) 
	{
		var vm = this;

		vm.utils = {
			initialising: false,
			options: vm.options,
			company_license: null,
			feature_license: null,
			isFeatureLicensed: function() {
				return featureLicenseFactory.utils.isFeatureLicensed(vm.utils.options.feature_name);
			},
			init: function() {

				vm.utils.company_license = featureLicenseFactory.utils.company_license;

				if( vm.utils.options.hasOwnProperty('feature_name') && vm.utils.options.feature_name ) {
					vm.utils.feature_license = featureLicenseFactory.utils.getFeatureLicense(vm.utils.options.feature_name);
				} else {
					vm.utils.feature_license = null;
				}

				vm.utils.pricing_table.table_guid_ref = "2451842a-0a4b-11f0-982e-024cc7b04e6f";
				var data = {
					table_guid_ref: "2451842a-0a4b-11f0-982e-024cc7b04e6f"
				};
				$rootScope.$broadcast("pricingTable::init", data);

			},
			close: function() {
				vm.utils.pricing_table.close();

				$rootScope.$broadcast("unlicensedFeature::close");
			},
			isBillingModeAdvanced: function() {
				return featureLicenseFactory.utils.isBillingModeAdvanced();
			},
			document_handler: {
				goToRiskMachPricing: function() {
					var url = "https://www.riskmach.co.uk/pricing/";

					window.open(url, "_blank");
				},
			},
			company_licenses: {
				refreshing: false,
				refresh: function() {
					vm.utils.company_licenses.refreshing = true;
					
					featureLicenseFactory.refreshCompaniesFeatureLicenses().then(function() {

						// RE-FETCH COMPANY LICENSES
						featureLicenseFactory.setActiveCompanyLicenses().then(function() {
							vm.utils.company_licenses.refreshing = false;

							// RE-INIT FEATURE LICENSE
							vm.utils.init();

						}, function(error) {
							vm.utils.company_licenses.refreshing = false;
						});

					}, function(error) {
						vm.utils.company_licenses.refreshing = false;
					});
				}
			},
			screen_handler: {
				screen_was_hidden: false,
				watchScreenState: function() {

					document.addEventListener('visibilitychange', function() {

						if( document.visibilityState == 'hidden' ) {
							vm.utils.screen_handler.screen_was_hidden = true;
						}

						if( document.visibilityState == 'visible' ) {

							if( vm.utils.screen_handler.screen_was_hidden ) {

								// RESET
								vm.utils.screen_handler.screen_was_hidden = false;

								// REFRESH LICENSES
								vm.utils.company_licenses.refresh();
							}

						}

					});

				}
			},
			pricing_table: {
				table_guid_ref: null,
				close: function() {
					vm.utils.pricing_table.table_guid_ref = null;
				}
			}
		}

		$scope.$watchCollection('vm.options', function(newVal, oldVal) {
			vm.utils.options = vm.options;

			vm.utils.init();
		});

		$(document).ready(function() {
			
			vm.utils.screen_handler.watchScreenState();

		});
	}

	function featureLicenseFactory($q, $http, authFactory, riskmachDatabasesFactory, modelsFactory) 
	{
		var factory = {};

		// DEFINES THE FEATURE IDS
		factory.feature_licenses = {
			report_hub: 1, 
			compliance: 9,
			core: 10,
			sops: 12,
			checklists: 13,
			ce_marking: 14, 
			contractor_management: 15,
			near_miss: 16,
			approved_contractors: 17,
			risk_assessments: 18,
			ce_vault: 19, 
			action_centre: 24, 
			lpa: 25
		}

		factory.utils = {
			company_license: null, 
			featureLicensesEnforced: function() {
				var enforced = false;

				// turn off feature licensing until payment features 
				// are in place
				if( 1 == 1 ) {
					return enforced;
				}

				// IF NO COMPANY LICENSE, ASSUME ENFORCED
				if( !factory.utils.company_license ) {
					enforced = true;
					return enforced;
				}

				// IF NO COMPANY RECORD IN LICENSE, ASSUME ENFORCED
				if( !factory.utils.company_license.hasOwnProperty('company_record') || !factory.utils.company_license.company_record ) {
					enforced = true;
					return enforced;
				}

				// IF NO ENFORCE FLAGS ON RECORD YET, ASSUME ENFORCED
				if( !factory.utils.company_license.company_record.hasOwnProperty('enforce_feature_licenses') || !factory.utils.company_license.company_record.hasOwnProperty('enforce_feature_licenses_date') ) {
					enforced = true;
					return enforced;
				}

				// FEATURE LICENSES NOT ENFORCED
				if( factory.utils.company_license.company_record.enforce_feature_licenses == 'No' ) {
					enforced = false;
					return enforced;
				}

				if( factory.utils.company_license.company_record.enforce_feature_licenses == 'Yes' ) {
					
					// IF NO ENFORCEMENT DATE, FEATURE LICENSES ARE ENFORCED
					if( !factory.utils.company_license.company_record.enforce_feature_licenses_date ) {
						enforced = true;
						return enforced;
					}

					var timestamp = new Date().getTime();

					// IF ENFORCEMENT DATE IS IN EFFECT
					if( timestamp > factory.utils.company_license.company_record.enforce_feature_licenses_date ) {
						enforced = true;
					} else {
						// ENFORCEMENT IS NOT YET IN EFFECT
						enforced = false;
					}

					// CLEAN UP
					timestamp = null;
					
				}

				return enforced;
			},
			getFeatureLicense: function(feature_name) {
				var feature_record = null;

				// IF FEATURE IS NOT LISTED
				if( !factory.feature_licenses.hasOwnProperty(feature_name) ) {
					return feature_record;
				}

				// IF COMPANY LICENSE NOT YET SET
				if( !factory.utils.company_license ) {
					return feature_record;
				}

				// SET FEATURE ID
				var feature_id = factory.feature_licenses[ feature_name ];

				// ATTEMPT FIND FEATURE RECORD
				var i = 0;
				var len = factory.utils.company_license.data.length;
				while(i < len) {
					if( factory.utils.company_license.data[i].FeatureID == feature_id ) {
						feature_record = factory.utils.company_license.data[i];
					}

					i++;
				}

				return feature_record;
			},
			isFeatureLicensed: function(feature_name) {
				var feature_licensed = true;

				if( 1 == 1 ) {
					return feature_licensed;
				}

				// IF FEATURE LICENSING IS NOT ENFORCED FOR COMPANY
				if( !factory.utils.featureLicensesEnforced() ) {
					return feature_licensed;
				}

				feature_licensed = false;

				var feature_record = factory.utils.getFeatureLicense(feature_name);

				// IF CAN'T FIND FEATURE LICENSE
				if( !feature_record ) {
					return feature_licensed;
				}

				// PERFORM CHECKS ON FEATURE LICENSE
				if( feature_record.HasFeatureLicense != 'Yes' || feature_record.Expired == 'Yes' ) {
					feature_licensed = false;
				} else {
					feature_licensed = true;
				}

				return feature_licensed;
 			},
 			isCompanyPaying: function() {
 				var is_company_paying = true;

 				// force to not free trial until payment features
 				// are in place
 				if( 1 == 1 ) {
 					return is_company_paying;
 				}

 				// IF NO COMPANY LICENSE, ASSUME IS PAYING
				if( !factory.utils.company_license ) {
					return is_company_paying;
				}

				// IF NO COMPANY RECORD IN LICENSE, ASSUME PAYING
				if( !factory.utils.company_license.hasOwnProperty('company_record') || !factory.utils.company_license.company_record ) {
					return is_company_paying;
				}

				// IF NO PAYING CLIENT FLAGS ON RECORD YET, ASSUME NOT PAYING CLIENT
				if( !factory.utils.company_license.company_record.hasOwnProperty('PayingClient') || !factory.utils.company_license.company_record.PayingClient ) {
					return is_company_paying;
				}

				// COMPANY NOT PAYING
				if( factory.utils.company_license.company_record.PayingClient == 'No' ) {
					is_company_paying = false;
				}

 				return is_company_paying;
 			},
 			isCompanyOnFreeTrial: function() {
 				var on_free_trial = false;

 				// if( 1 == 1 ) {
 				// 	return on_free_trial;
 				// }

 				// IF NO COMPANY LICENSE, ASSUME NOT FREE TRIAL
 				if( !factory.utils.company_license ) {
 					return on_free_trial;
 				}

 				// IF NO COMPANY RECORD IN LICENSE, ASSUME NOT FREE TRIAL
				if( !factory.utils.company_license.hasOwnProperty('company_record') || !factory.utils.company_license.company_record ) {
					return on_free_trial;
				}

				// IF NO TRIAL EXPIRY DATE SET, COMPANY IS NOT ON FREE TRIAL
				if( !factory.utils.company_license.company_record.hasOwnProperty('TrialExpiresOn') || !factory.utils.company_license.company_record.TrialExpiresOn ) {
					return on_free_trial;
				}
				
				// CHECK IF TRIAL EXPIRY DATE HAS PASSED
				var current_timestamp = new Date().getTime();
				var expiry_timestamp = parseInt( factory.utils.company_license.company_record.TrialExpiresOn );

				// IF NOT PASSED EXPIRY DATE YET
				if( current_timestamp < expiry_timestamp ) {
					on_free_trial = true;
				}

 				return on_free_trial;
 			},
 			hasCompanyUsedFreeTrial: function() {
 				var used_free_trial = false;

 				// IF NO COMPANY LICENSE, ASSUME NOT USED FREE TRIAL
				if( !factory.utils.company_license ) {
					return used_free_trial;
				}

				// IF NO COMPANY RECORD IN LICENSE, ASSUME NOT USED FREE TRIAL
				if( !factory.utils.company_license.hasOwnProperty('company_record') || !factory.utils.company_license.company_record ) {
					return used_free_trial;
				}

				// IF NO USED FREE TRIAL FLAGS ON RECORD YET, ASSUME NOT USED FREE TRIAL
				if( !factory.utils.company_license.company_record.hasOwnProperty('UsedFreeTrial') || !factory.utils.company_license.company_record.UsedFreeTrial ) {
					return used_free_trial;
				}

				if( factory.utils.company_license.company_record.UsedFreeTrial == 'Yes' ) {
					used_free_trial = true;
				}

 				return used_free_trial;
 			},
 			isBillingModeAdvanced: function() {
 				var advanced = false;

 				// IF NO COMPANY LICENSE, ASSUME NOT ADVANCED
				if( !factory.utils.company_license ) {
					return advanced;
				}

				// IF NO COMPANY RECORD IN LICENSE, ASSUME NOT ADVANCED
				if( !factory.utils.company_license.hasOwnProperty('company_record') || !factory.utils.company_license.company_record ) {
					return advanced;
				}

				if( factory.utils.company_license.company_record.hasOwnProperty('BillingMode') && factory.utils.company_license.company_record.BillingMode == 'Advanced' ) {
					advanced = true;
				}

				return advanced;
 			}
		}

		factory.requests = {
			base_path: 'https://system.riskmach.co.uk/laravel/public/',
			featureLicenses: function() {
				var defer = $q.defer();

				$http.get(factory.requests.base_path + 'webapp/v1/CompaniesFeatureLicenses',{ 
	            	params: {}
	            })
				.success(function(data, status, headers, config) {

					console.log("FEATURE LICENSE DATA");
					console.log(data);

					if( data.error ) {
						defer.reject(data.error_messages[0]);
					} else {
						defer.resolve(data.feature_licenses);
					}

	            })
	            .error(function(data, status, headers, config) {
	            	console.log("ERROR CONNECTING TO FEATURE LICENSES API");
	          		console.log(data);
	            	defer.reject("Error getting feature licenses data");
				});

	            return defer.promise;
			},
			companyRecord: function() {
				var defer = $q.defer();

				$http.get(factory.requests.base_path + 'webapp/v1/CompanyRecord',{ 
	            	params: {}
	            })
				.success(function(data, status, headers, config) {

					console.log("COMPANY RECORD");
					console.log(data);

					if( data.error ) {
						defer.reject(data.error_messages[0]);
					} else {

						// FORMAT COMPANY RECORD
						if( data.hasOwnProperty('company_record') && data.company_record ) {

							if( data.hasOwnProperty('enforce_feature_licenses') ) {
								data.company_record.enforce_feature_licenses = data.enforce_feature_licenses;
							}
						
							if( data.hasOwnProperty('enforce_feature_licenses_date') && data.enforce_feature_licenses_date ) {
								data.company_record.enforce_feature_licenses_date = parseInt(data.enforce_feature_licenses_date);
							} else {
								data.company_record.enforce_feature_licenses_date = null;
							}

							// SET BILLING USER NAME ON COMPANY RECORD
							if( data.hasOwnProperty('billing_user') && data.billing_user ) {
								data.company_record.billing_user_name = data.billing_user.FirstName + ' ' + data.billing_user.LastName;
							}

							// SET POWER USER NAME ON COMPANY RECORD
							if( data.hasOwnProperty('power_user') && data.power_user ) {
								data.company_record.power_user_name = data.power_user.FirstName + ' ' + data.power_user.LastName;
							}

						} else {
							data.company_record = null;
						}

						defer.resolve(data.company_record);
					}

	            })
	            .error(function(data, status, headers, config) {
	            	console.log("ERROR CONNECTING TO COMPANY RECORD API");
	          		console.log(data);
	            	defer.reject("Error getting company record data");
				});

				return defer.promise;
			},
			updateUsedFreeTrialSetting: function(value) {
				var defer = $q.defer();

				$http.get(factory.requests.base_path + 'webapp/v1/SaveUsedFreeTrialSetting',{ 
	            	params: {
	            		setting_value: value
	            	}
	            })
				.success(function(data, status, headers, config) {

					console.log("UPDATE USED FREE TRIAL SETTING");
					console.log(data);

					if( data.error ) {
						defer.reject(data.error_messages[0]);
					} else {
						defer.resolve(data);
					}

	            })
	            .error(function(data, status, headers, config) {
	            	console.log("ERROR CONNECTING TO UPDATE USED FREE TRIAL SETTING API");
	          		console.log(data);
	            	defer.reject("Error updating company used free trial setting");
				});

				return defer.promise;
			},
			pricingTableData: function(filters) {
				var defer = $q.defer();

				console.log("PRICING TABLE FILTERS");
				console.log(filters);

				if( !filters.hasOwnProperty('table_guid_ref') || !filters.table_guid_ref ) {
					defer.reject("No table GUID provided");
					return defer.promise;
				}

				$http.get('http://system.riskmach.co.uk/laravel/public/rms/v1/PricingDetailsTableFrontEnd',{ 
	            	params: {
	            		// filters: filters
	            		table_guid_ref: filters.table_guid_ref
	            	}
	            })
				.success(function(data, status, headers, config) {

					console.log("PRICING TABLE DATA RESPONSE");
					console.log(data);

					if( data.error ) {
						defer.reject(data.error_messages[0]);
					} else {
						defer.resolve(data.data);
					}

	            })
	            .error(function(data, status, headers, config) {
	            	console.log("ERROR CONNECTING TO PRICING TABLE DATA API");
	          		console.log(data);
	            	defer.reject("Error requesting pricing table data");
				});

				return defer.promise;
			}
		}

		factory.dbUtils = {
			getCompanyFeatureLicenses: function(company_id) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.feature_licenses;

				var options = {
					limit: 100, 
					include_docs: true
				}

				var licenses = [];

				fetchNextPage(fetch_defer).then(function() {

					console.log("FETCHED LICENSES");
					console.log(licenses);
					console.log(company_id);

					if( !licenses.length ) {
						defer.resolve(null);
					} else {
						defer.resolve(licenses[0]);
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

								if( !result.rows[i].doc.hasOwnProperty('company_id') || result.rows[i].doc.company_id != company_id ) {
									errors++;
								}

								if( errors == 0 ) {
									licenses.push(result.rows[i].doc);
								}

								i++;
							}

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							// CLEANUP
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
			saveCompaniesFeatureLicenses: function(license_data) {
				var defer = $q.defer();

				var company_id = authFactory.cloudCompanyId();

				var db = riskmachDatabasesFactory.databases.collection.feature_licenses;

				factory.dbUtils.getCompanyFeatureLicenses(company_id).then(function(license_record) {

					if( !license_record ) {
						// SAVE NEW
						var record = modelsFactory.models.newFeatureLicense(company_id);
						record.data = license_data.feature_licenses;
						record.company_record = license_data.company_record;

						db.post(record, {force: true}).then(function(result) {
							record._id = result.id;
							record._rev = result.rev;

							defer.resolve(record);
						}).catch(function(error) {
							defer.reject(error);
						});

					} else {
						// UPDATE EXISTING
						license_record.data = license_data.feature_licenses;
						license_record.company_record = license_data.company_record;
						license_record.date_updated = new Date().getTime();

						db.put(license_record).then(function(result) {
							license_record._id = result.id;
							license_record._rev = result.rev;

							defer.resolve(license_record);
						}).catch(function(error) {
							defer.reject(error);
						});
					}

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
		}

		factory.pricing_tables = {
			fetchData: function(filters) {
				var defer = $q.defer();

				factory.requests.pricingTableData(filters).then(function(data) {

					defer.resolve(data);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
		}

		factory.refreshCompaniesFeatureLicenses = function() 
		{
			var defer = $q.defer();

			factory.requests.featureLicenses().then(function(licenses) {

				factory.requests.companyRecord().then(function(company_record) {

					var license_data = {
						feature_licenses: licenses, 
						company_record: company_record
					}

					factory.dbUtils.saveCompaniesFeatureLicenses(license_data).then(function(company_licenses) {

						defer.resolve(company_licenses);

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
		}

		factory.setActiveCompanyLicenses = function() 
		{
			var defer = $q.defer();

			var company_id = authFactory.cloudCompanyId();

			factory.dbUtils.getCompanyFeatureLicenses(company_id).then(function(license_record) {

				factory.utils.company_license = license_record;

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.markCompanyFreeTrialUsed = function() 
		{
			var defer = $q.defer();

			factory.requests.updateUsedFreeTrialSetting('Yes').then(function() {

				factory.refreshCompaniesFeatureLicenses().then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		riskmachDatabasesFactory.databases.initFeatureLicenses();

		return factory;
	}

	function unlicensedFeature() 
	{
		var directive = {};

		directive.scope = {
			options: '='
		};

		directive.restrict = 'A';
		directive.controller = 'unlicensedFeatureController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/feature-licenses/tpl/unlicensed_feature.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

	function pricingTable() 
	{
		var directive = {};

		directive.scope = {
			tableref: '=',
			packageref: '='
		};

		directive.restrict = 'A';
		directive.controller = 'pricingTableController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/feature-licenses/tpl/pricing_table.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

	function rmCheckoutLandingPage() 
	{
		var directive = {};

		directive.scope = {};

		directive.restrict = 'A';
		directive.controller = 'rmCheckoutLandingPageController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/feature-licenses/tpl/rm_checkout_landing_page.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

})()