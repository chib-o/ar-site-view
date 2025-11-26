(function() {

	var app = angular.module('riskmachIppScore', ['riskmachUtils','riskmachDatabases','riskmachModels','riskmachProjectAssets']);
	app.controller('ppAuditsDueListController', ppAuditsDueListController);
	app.controller('ippScoreController', ippScoreController);
	app.factory('ippScoreFactory', ippScoreFactory);
	app.directive('ippScoreForm', ippScoreForm);
	app.directive('ppAuditsDueList', ppAuditsDueList);

	function ppAuditsDueListController($scope, $rootScope, $q, $filter, ippScoreFactory, modelsFactory, projectsAssetsFactory, rmUtilsFactory, authFactory, riskmachDatabasesFactory, fetchUtilsFactory, coreDownloadFactory, projectDownloadFactory, rmConnectivityFactory, featureLicenseFactory) 
	{
		var vm = this;

		console.log("ACTIVE USER PROFILE");
		console.log(authFactory.active_profile);

		vm.utils = {
			isSop: function(asset_record) {
				var is_sop = false;

				if( !asset_record.hasOwnProperty('pp_id') ) {
					return is_sop;
				}

				// IS SOP COMPLIANCE PROFILE
				if( parseInt(asset_record.pp_id) == 41 ) {
					is_sop = true;
				}

				return is_sop;
			},
			active_profile: authFactory.active_profile,
			place_filters: {
				site: {
					selected_id: null,
					selected_record: null,
					id: null,
					record: null,
					data: [],
					loading: false, 
					refresh: function() {
						var defer = $q.defer();

						vm.utils.place_filters.site.loading = true;

						var selector = {
							table: 'sites',
							user_id: authFactory.cloudUserId(),
							company_id: authFactory.getActiveCompanyId(),
							status: 1
						}

						riskmachDatabasesFactory.databases.collection.sites.find({
							selector: selector
						}).then(function(results){

							console.log("FETCHED SITES");
							console.log(results.docs);

							vm.utils.place_filters.site.data = $filter('orderBy')(results.docs, 'name');
							vm.utils.place_filters.site.loading = false;

							vm.utils.place_filters.site.reSelectRecord();

							$scope.$apply();

							defer.resolve();

						}).catch(function(error){
							vm.utils.place_filters.site.loading = false;
							defer.reject(error);
						});

						return defer.promise;
					},
					select: function() {
						vm.utils.place_filters.site.selected_id = vm.utils.place_filters.site.selected_record._id;

						vm.utils.place_filters.building.refresh();
					},
					deSelect: function() {
						vm.utils.place_filters.site.selected_id = null;
						vm.utils.place_filters.site.selected_record = null;

						vm.utils.place_filters.building.deSelect();
					},
					reSelectRecord: function() {
						// RETURN IF NO SITE SELECTED
						if( !vm.utils.place_filters.site.selected_record ) {
							return;
						}

						var i = 0;
						var len = vm.utils.place_filters.site.data.length;

						while(i < len) {

							// IF SITE MATCHES FILTERS SELECTED SITE, RE-SELECT
							if(	vm.utils.place_filters.site.selected_record._id == vm.utils.place_filters.site.data[i]._id ) {
								vm.utils.place_filters.site.selected_record = vm.utils.place_filters.site.data[i];
								
								vm.utils.place_filters.site.record = vm.utils.place_filters.site.selected_record;
							}

							i++;
						}
					}
				},
				building: {
					selected_id: null,
					selected_record: null,
					id: null, 
					record: null,
					data: [],
					loading: false,
					refresh: function() {

						vm.utils.place_filters.building.loading = true;

						var selector = {
							table: 'buildings',
							user_id: authFactory.cloudUserId(),
							company_id: authFactory.getActiveCompanyId(),
							status: 1
						};

						if( vm.utils.place_filters.site.selected_id )
						{
							selector.site_id = vm.utils.place_filters.site.selected_id;
						}

						riskmachDatabasesFactory.databases.collection.buildings.find({
							selector: selector
						}).then(function(results){
							vm.utils.place_filters.building.data = $filter('orderBy')(results.docs, 'name');
							vm.utils.place_filters.building.loading = false;

							console.log("FETCHED BUILDINGS FOR SITE ID: " + vm.utils.place_filters.site.selected_id);
							console.log(results.docs);

							$scope.$apply();

						}).catch(function(error){
							alert(error);
							vm.utils.place_filters.building.loading = false;
						});

					},
					select: function() {
						vm.utils.place_filters.building.selected_id = vm.utils.place_filters.building.selected_record._id;

						vm.utils.place_filters.area.refresh();
					},
					deSelect: function() {
						vm.utils.place_filters.building.selected_id = null;
						vm.utils.place_filters.building.selected_record = null;

						vm.utils.place_filters.area.deSelect();
					}
				},
				area: {
					selected_id: null, 
					selected_record: null,
					id: null, 
					record: null,
					data: [],
					loading: false, 
					refresh: function() {

						vm.utils.place_filters.area.loading = true;

						var selector = {
							table: 'areas',
							user_id: authFactory.cloudUserId(),
							company_id: authFactory.getActiveCompanyId(),
							status: 1
						};

						if( vm.utils.place_filters.site.selected_id )
						{
							selector.site_id = vm.utils.place_filters.site.selected_id;
						}

						if( vm.utils.place_filters.building.selected_id )
						{
							selector.building_id = vm.utils.place_filters.building.selected_id;
						}

						riskmachDatabasesFactory.databases.collection.areas.find({
							selector: selector
						}).then(function(results){
							vm.utils.place_filters.area.data = $filter('orderBy')(results.docs, 'name');
							vm.utils.place_filters.area.loading = false;

							console.log("FETCHED AREAS");
							console.log(results.docs);

							$scope.$apply();

						}).catch(function(error){
							alert(error);
							vm.utils.place_filters.area.loading = false;
						});
					},
					select: function() {
						vm.utils.place_filters.area.selected_id = vm.utils.place_filters.area.selected_record._id;
					},
					deSelect: function() {
						vm.utils.place_filters.area.selected_id = null;
						vm.utils.place_filters.area.selected_record = null;
					}
				},
				apply: function() {

					if( vm.utils.place_filters.site.selected_record ) {
						vm.utils.place_filters.site.id = vm.utils.place_filters.site.selected_record._id;
						vm.utils.place_filters.site.record = vm.utils.place_filters.site.selected_record;
					} else {
						vm.utils.place_filters.site.id = null;
						vm.utils.place_filters.site.record = null;
					}

					if( vm.utils.place_filters.building.selected_record ) {
						vm.utils.place_filters.building.id = vm.utils.place_filters.building.selected_record._id;
						vm.utils.place_filters.building.record = vm.utils.place_filters.building.selected_record;
					} else {
						vm.utils.place_filters.building.id = null;
						vm.utils.place_filters.building.record = null;
					}

					if( vm.utils.place_filters.area.selected_record ) {
						vm.utils.place_filters.area.id = vm.utils.place_filters.area.selected_record._id;
						vm.utils.place_filters.area.record = vm.utils.place_filters.area.selected_record;
					} else {
						vm.utils.place_filters.area.id = null;
						vm.utils.place_filters.area.record = null;
					}

					// SET ACTIVE FETCH RECORD FOR SITE
					vm.utils.core.setActiveFetchRecord();

					// FILTER AUDITS BY PLACE FILTERS
					vm.utils.pp_audits_due_list.filter();

					// RE-CALC TAB STATS
					vm.utils.tabbed_filters.calcTabStats();

				},
				start: function() {

					if( vm.utils.place_filters.site.record ) {
						vm.utils.place_filters.site.selected_id = vm.utils.place_filters.site.id;
						vm.utils.place_filters.site.selected_record = vm.utils.place_filters.site.record;
					} else {
						vm.utils.place_filters.site.selected_id = null;
						vm.utils.place_filters.site.selected_record = null;
					}

					if( vm.utils.place_filters.building.record ) {
						vm.utils.place_filters.building.selected_id = vm.utils.place_filters.building.id;
						vm.utils.place_filters.building.selected_record = vm.utils.place_filters.building.record;
					} else {
						vm.utils.place_filters.building.selected_id = null;
						vm.utils.place_filters.building.selected_record = null;
					}

					if( vm.utils.place_filters.area.record ) {
						vm.utils.place_filters.area.selected_id = vm.utils.place_filters.area.id;
						vm.utils.place_filters.area.selected_record = vm.utils.place_filters.area.record;
					} else {
						vm.utils.place_filters.area.selected_id = null;
						vm.utils.place_filters.area.selected_record = null;
					}

					vm.utils.place_filters.slideout.show();
				},
				slideout: {
					show: function() {
						var slideoutEl = document.getElementById('PlaceFilterAside');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.show();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					},
					hide: function() {
						var slideoutEl = document.getElementById('PlaceFilterAside');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.hide();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}
				}
			},
			user_list: {
				data: null,
				is_loading: false,
				downloading: false,
				refresh: function() {
					vm.utils.user_list.is_loading = true;

					rmUtilsFactory.user_records.getUserRecords().then(function(d) {

						vm.utils.user_list.data = d;

						console.log("USER LIST");
						console.log(vm.utils.user_list.data);

						vm.utils.user_list.is_loading = false;

					}, function(error) {
						vm.utils.user_list.is_loading = false;
						alert(error);
					});
				},	
				onlineRefresh: function() {
					vm.utils.user_list.downloading = true;

					rmUtilsFactory.user_records.requestSaveUserRecords().then(function() {

						vm.utils.user_list.downloading = false;

						vm.utils.user_list.refresh();

					}, function(error) {
						vm.utils.user_list.downloading = false;
						alert(error);
					});
				},
				init: function(){

					setTimeout(function(){

						// if( vm.utils.is_logged_in )
						// {
						// 	vm.utils.user_list.refresh();
						// }

						vm.utils.user_list.refresh();

						$scope.$apply();

					}, 0);

				}()
			},
			ipp_filter: {
				profile_points: [],
				statuses: [{
					display: 'In Progress',
					value: 'Yes'
				},{
					display: 'Not started',
					value: null
				}],
				lpa_options: [{
					display: 'Yes',
					value: 'Yes'
				},{
					display: 'No',
					value: 'No'
				}],
				selected_pp: [],
				applied_pp: [],
				selected_statuses: [],
				applied_statuses: [],
				selected_lpa: [],
				applied_lpa: [],
				selected_assigned_to: [],
				applied_assigned_to: [],
				selected_started_by: [],
				applied_started_by: [],
				active: false,
				clear: function() {
					vm.utils.ipp_filter.selected_pp = [];
					vm.utils.ipp_filter.selected_statuses = [];
					vm.utils.ipp_filter.selected_lpa = [];
					vm.utils.ipp_filter.selected_assigned_to = [];
					vm.utils.ipp_filter.selected_started_by = [];

					vm.utils.ipp_filter.apply();
				},
				fetchProfilePoints: function() {
					var defer = $q.defer();

					vm.utils.ipp_filter.loading = true;

					rmUtilsFactory.dbUtils.profile_points.getProfilePoints().then(function(profile_points) {
					
						vm.utils.ipp_filter.profile_points = profile_points;

						console.log("FETCHED PROFILE POINTS");
						console.log(vm.utils.ipp_filter.profile_points);

						vm.utils.ipp_filter.loading = false;

						defer.resolve();

					}, function(error) {
						vm.utils.ipp_filter.loading = false;
						defer.reject(error);
					});

					return defer.promise;
				},
				start: function() {

					if( vm.utils.ipp_filter.applied_pp && vm.utils.ipp_filter.applied_pp.length ) {
						vm.utils.ipp_filter.selected_pp = vm.utils.ipp_filter.applied_pp;
					} else {
						vm.utils.ipp_filter.selected_pp = [];
					}

					if( vm.utils.ipp_filter.applied_statuses && vm.utils.ipp_filter.applied_statuses.length ) {
						vm.utils.ipp_filter.selected_statuses = vm.utils.ipp_filter.applied_statuses;
					} else {
						vm.utils.ipp_filter.selected_statuses = [];
					}

					if( vm.utils.ipp_filter.applied_lpa && vm.utils.ipp_filter.applied_lpa.length ) {
						vm.utils.ipp_filter.selected_lpa = vm.utils.ipp_filter.applied_lpa;
					} else {
						vm.utils.ipp_filter.selected_lpa = [];
					}

					if( vm.utils.ipp_filter.applied_assigned_to && vm.utils.ipp_filter.applied_assigned_to.length ) {
						vm.utils.ipp_filter.selected_assigned_to = vm.utils.ipp_filter.applied_assigned_to;
					} else {
						vm.utils.ipp_filter.selected_assigned_to = [];
					}

					if( vm.utils.ipp_filter.applied_started_by && vm.utils.ipp_filter.applied_started_by.length ) {
						vm.utils.ipp_filter.selected_started_by = vm.utils.ipp_filter.applied_started_by;
					} else {
						vm.utils.ipp_filter.selected_started_by = [];
					}

					vm.utils.ipp_filter.slideout.show();
				},
				apply: function() {

					var applied_filters = 0;

					if( vm.utils.ipp_filter.selected_pp && vm.utils.ipp_filter.selected_pp.length ) {
						vm.utils.ipp_filter.applied_pp = vm.utils.ipp_filter.selected_pp;
						applied_filters++;
					} else {
						vm.utils.ipp_filter.applied_pp = [];
					}

					if( vm.utils.ipp_filter.selected_statuses && vm.utils.ipp_filter.selected_statuses.length ) {
						vm.utils.ipp_filter.applied_statuses = vm.utils.ipp_filter.selected_statuses;
						applied_filters++;
					} else {
						vm.utils.ipp_filter.applied_statuses = [];
					}

					if( vm.utils.ipp_filter.selected_lpa && vm.utils.ipp_filter.selected_lpa.length ) {
						vm.utils.ipp_filter.applied_lpa = vm.utils.ipp_filter.selected_lpa;
						applied_filters++;
					} else {
						vm.utils.ipp_filter.applied_lpa = [];
					}

					if( vm.utils.ipp_filter.selected_assigned_to && vm.utils.ipp_filter.selected_assigned_to.length ) {
						vm.utils.ipp_filter.applied_assigned_to = vm.utils.ipp_filter.selected_assigned_to;
					} else {
						vm.utils.ipp_filter.applied_assigned_to = [];
					}

					if( vm.utils.ipp_filter.selected_started_by && vm.utils.ipp_filter.selected_started_by.length ) {
						vm.utils.ipp_filter.applied_started_by = vm.utils.ipp_filter.selected_started_by;
						applied_filters++;
					} else {
						vm.utils.ipp_filter.applied_started_by = [];
					}

					if( applied_filters > 0 ) {
						vm.utils.ipp_filter.active = true;
					} else {
						vm.utils.ipp_filter.active = false;
					}

					vm.utils.pp_audits_due_list.filter();
				},
				slideout: {
					show: function() {
						var slideoutEl = document.getElementById('IppFilterAside');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.show();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					},
					hide: function() {
						var slideoutEl = document.getElementById('IppFilterAside');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.hide();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}
				}
			},
			user_filter: {
				my_allocations: true,
				user: null,
				selected_user_id: null, 
				applied_user_id: null,
				tabs: {
					active_tab: 'mine_or_others',
					tabActive: function(tab) {
						if( vm.utils.user_filter.tabs.active_tab == tab ) {
							return true;
						} else {
							return false;
						}
					},
					changeTab: function(tab) {
						vm.utils.user_filter.tabs.active_tab = tab;
					}
				},
				clear: function() {
					vm.utils.user_filter.selected_user_id = null;

					vm.utils.user_filter.apply();
				},
				start: function() {

					vm.utils.user_filter.tabs.changeTab('mine_or_others');

					// IF VIEWING MY ALLOCATIONS, CLEAR SELECTED USER FILTERS
					if( vm.utils.user_filter.my_allocations ) {
						vm.utils.user_filter.selected_user_id = null;
						vm.utils.user_filter.applied_user_id = null;
						vm.utils.user_filter.user = null;
					}

					if( vm.utils.user_filter.applied_user_id ) {
						vm.utils.user_filter.selected_user_id = vm.utils.user_filter.applied_user_id;
					} else {
						vm.utils.user_filter.selected_user_id = null;
					}

					vm.utils.user_filter.slideout.show();
				},
				apply: function(my_allocations) {

					vm.utils.user_filter.my_allocations = my_allocations;

					// IF VIEWING MY ALLOCATIONS, CLEAR USER FILTERS
					if( vm.utils.user_filter.my_allocations ) {
						vm.utils.user_filter.selected_user_id = null;
						vm.utils.user_filter.applied_user_id = null;
						vm.utils.user_filter.user = null;
					}

					// IF SELECTED USER, APPLY
					if( vm.utils.user_filter.selected_user_id ) {
						vm.utils.user_filter.applied_user_id = vm.utils.user_filter.selected_user_id;
					} else {
						vm.utils.user_filter.applied_user_id = null;
					}

					vm.utils.pp_audits_due_list.filter();

					vm.utils.tabbed_filters.calcTabStats();
				},
				selectedUser: function() {
					vm.utils.user_filter.selected_user_id = vm.utils.user_filter.user.UserID;
				},
				slideout: {
					show: function() {
						var slideoutEl = document.getElementById('UserFilterAside');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.show();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					},
					hide: function() {
						var slideoutEl = document.getElementById('UserFilterAside');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.hide();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}
				}
			},
			tabbed_filters: {
				active: false,
				tabs: {
					today: false,
					overdue: false,
					planned: false, 
					in_progress: false,
					all_audits: false
				},
				stats: {
					today: 0,
					overdue: 0, 
					planned: 0,
					in_progress: 0,
					all_audits: 0
				},
				deactivate: function() {
					vm.utils.tabbed_filters.tabs.today = false;
					vm.utils.tabbed_filters.tabs.overdue = false;
					vm.utils.tabbed_filters.tabs.planned = false;
					vm.utils.tabbed_filters.tabs.in_progress = false;
					vm.utils.tabbed_filters.tabs.all_audits = false;

					vm.utils.tabbed_filters.active = false;
				}, 
				selectAndFilter: function(tab) {
					Object.keys(vm.utils.tabbed_filters.tabs).forEach(function(key) {

						if( key == tab ) {
							vm.utils.tabbed_filters.tabs[key] = true;
						} else {
							vm.utils.tabbed_filters.tabs[key] = false;
						}

					});

					vm.utils.tabbed_filters.active = true;

					// CLEAR DATE FILTERS
					vm.utils.date_picker.filter_active = false;

					vm.utils.pp_audits_due_list.filter();
				},
				calcTabStats: function() {

					var stats = {
						today: 0,
						overdue: 0,
						planned: 0,
						in_progress: 0,
						all_audits: 0
					}

					var i = 0;
					var len = vm.utils.pp_audits_due_list.data.length;
					while(i < len) {

						var errors = 0;

						// ALWAYS APPLY SITE FILTER
						if( vm.utils.place_filters.site.record ) {

							if( !vm.utils.pp_audits_due_list.data[i].hasOwnProperty('rm_site_id') || vm.utils.pp_audits_due_list.data[i].rm_site_id != vm.utils.place_filters.site.record.rm_id ) {
								errors++;
							}

						}

						// CONSIDER WHO'S DUE AUDITS WE'RE VIEWING
						if( vm.utils.user_filter.my_allocations ) {

							var team_ids = [];
							if( authFactory.active_profile.hasOwnProperty('TeamIDs') && authFactory.active_profile.TeamIDs ) {
								team_ids = authFactory.active_profile.TeamIDs;
							}

							if( vm.utils.pp_audits_due_list.data[i].user_is_allocated == 'No' ) {
								errors++;
							}

							// CLEAN UP
							team_ids = null;

						} 
						else 
						{
							if( vm.utils.user_filter.applied_user_id ) {

								var team_ids = [];
								if( vm.utils.user_filter.user && vm.utils.user_filter.user.hasOwnProperty('TeamIDs') && vm.utils.user_filter.user.TeamIDs ) {
									team_ids = vm.utils.user_filter.user.TeamIDs;
								}

								// USER IS ELIGIBLE OR ASSIGNED
								if( !vm.utils.pp_audits_due_list.isUserAllocated(vm.utils.pp_audits_due_list.data[i], vm.utils.user_filter.applied_user_id, team_ids) ) {
									errors++;
								}

							}
						}

						// OVERDUE
						if( errors == 0 && vm.utils.pp_audits_due_list.data[i].is_overdue == 'Yes' ) {
							stats.overdue++;
						}

						// TODAY
						if( errors == 0 && vm.utils.pp_audits_due_list.data[i].is_today == 'Yes' ) {
							stats.today++;
						}

						// IN PROGRESS
						if( errors == 0 && vm.utils.pp_audits_due_list.data[i].audit_started == 'Yes' ) {
							stats.in_progress++;
						}

						// PLANNED
						if( errors == 0 && vm.utils.pp_audits_due_list.data[i].is_overdue != 'Yes' && vm.utils.pp_audits_due_list.data[i].audit_started != 'Yes' ) {
							stats.planned++;
						}

						// ALL AUDITS
						if( errors == 0 ) {
							stats.all_audits++;
						}

						i++;
					}

					Object.keys(stats).forEach(function(key) {
						vm.utils.tabbed_filters.stats[key] = stats[key];
					});
				}
			},
			pp_audits_due_list: {
				loading: false,
				downloading: false,
				data: [],
				pinned_data: [],
				visible_data: [],
				show_due_audits: true,
				show_pinned: false,
				getData: function() {
					var defer = $q.defer();

					// GET FROM DB
					ippScoreFactory.dbUtils.ipp_scores.getPPAuditsDuePaginated().then(function(data) {

						console.log("ALL IPP RECORDS");
						console.log(data);

						vm.utils.pp_audits_due_list.data = data;

						vm.utils.pp_audits_due_list.format();
						vm.utils.pp_audits_due_list.filterPinnedAudits();
						vm.utils.pp_audits_due_list.filter();

						// SHOW PINNED AUDITS IF MORE THAN 0
						if( vm.utils.pp_audits_due_list.pinned_data.length ) {
							vm.utils.pp_audits_due_list.show_pinned = true;
						}

						defer.resolve();

					}, function(error) {
						vm.utils.pp_audits_due_list.loading = false;
						defer.reject(error);
					});

					return defer.promise;
				},
				filterPinnedAudits: function() {
					var i = 0;
					var len = vm.utils.pp_audits_due_list.data.length;

					// CLEAR PINNED ARRAY
					vm.utils.pp_audits_due_list.pinned_data = [];

					while(i < len) {
						
						if( vm.utils.pp_audits_due_list.data[i].hasOwnProperty('pinned') && vm.utils.pp_audits_due_list.data[i].pinned == 'Yes' ) {
							vm.utils.pp_audits_due_list.pinned_data.push(vm.utils.pp_audits_due_list.data[i]);
						}

						i++;
					}

					vm.utils.pp_audits_due_list.pinned_data = $filter('orderBy')(vm.utils.pp_audits_due_list.pinned_data, ['effective_next_inspection_date','asset_ref']);

					console.log("PINNED DATA");
					console.log(vm.utils.pp_audits_due_list.pinned_data);
				},
				filter: function() {
					var i = 0;
					var len = vm.utils.pp_audits_due_list.data.length;

					// CLEAR FILTERED ARRAY
					vm.utils.pp_audits_due_list.visible_data = [];

					while(i < len) {
						var errors = 0;

						// APPLY DATE FILTER IF DATE FILTER ACTIVE
						if( vm.utils.date_picker.filter_active && vm.utils.pp_audits_due_list.data[i].effective_next_inspection_date ) {

							// CREATE MOMENT FOR EFFECTIVE NEXT INSPECTION DATE
							var m = moment(vm.utils.pp_audits_due_list.data[i].effective_next_inspection_date_f);

							// IF NOT BETWEEN START DATE / END DATE
							if( !m.isBetween(vm.utils.date_picker.start_date, vm.utils.date_picker.end_date, undefined, '[]') ) {
								errors++;
							}

							// CLEAN UP
							m = null;

						}

						// VIEWING MY ALLOCATIONS
						if( vm.utils.user_filter.my_allocations ) {

							var team_ids = [];
							if( authFactory.active_profile.hasOwnProperty('TeamIDs') && authFactory.active_profile.TeamIDs ) {
								team_ids = authFactory.active_profile.TeamIDs;
							}

							vm.utils.pp_audits_due_list.updateUserAllocationFields(vm.utils.pp_audits_due_list.data[i], authFactory.rmCloudUserId(), team_ids);

							if( vm.utils.pp_audits_due_list.data[i].user_is_allocated == 'No' ) {
								errors++;
							}

							// CLEAN UP
							team_ids = null;

						} 
						else 
						{
							if( vm.utils.user_filter.applied_user_id ) {

								var team_ids = [];
								if( vm.utils.user_filter.user && vm.utils.user_filter.user.hasOwnProperty('TeamIDs') && vm.utils.user_filter.user.TeamIDs ) {
									team_ids = vm.utils.user_filter.user.TeamIDs;
								}

								vm.utils.pp_audits_due_list.updateUserAllocationFields(vm.utils.pp_audits_due_list.data[i], vm.utils.user_filter.applied_user_id, team_ids);

								// USER IS ELIGIBLE OR ASSIGNED
								if( !vm.utils.pp_audits_due_list.isUserAllocated(vm.utils.pp_audits_due_list.data[i], vm.utils.user_filter.applied_user_id, team_ids) ) {
									errors++;
								}

								// CLEAN UP
								team_ids = [];

							}
						}

						// SITE FILTER
						if( vm.utils.place_filters.site.record ) {

							if( !vm.utils.pp_audits_due_list.data[i].hasOwnProperty('rm_site_id') || vm.utils.pp_audits_due_list.data[i].rm_site_id != vm.utils.place_filters.site.record.rm_id ) {
								errors++;
							}

						}

						// BUILDING FILTER
						if( vm.utils.place_filters.building.record ) {

							if( !vm.utils.pp_audits_due_list.data[i].hasOwnProperty('rm_building_id') || vm.utils.pp_audits_due_list.data[i].rm_building_id != vm.utils.place_filters.building.record.rm_id ) {
								errors++;
							}

						}

						// AREA FILTER
						if( vm.utils.place_filters.area.record ) {

							if( !vm.utils.pp_audits_due_list.data[i].hasOwnProperty('rm_area_id') || vm.utils.pp_audits_due_list.data[i].rm_area_id != vm.utils.place_filters.area.record.rm_id ) {
								errors++;
							}

						}

						// COMPLIANCE PROFILE FILTER
						if( vm.utils.ipp_filter.applied_pp && vm.utils.ipp_filter.applied_pp.length ) {

							if( vm.utils.ipp_filter.applied_pp.indexOf(vm.utils.pp_audits_due_list.data[i].rm_profile_point_ref) === -1 ) {
								errors++;
							}

						}

						// REQUIREMENT STARTED FILTER
						if( vm.utils.ipp_filter.applied_statuses && vm.utils.ipp_filter.applied_statuses.length ) {

							if( vm.utils.ipp_filter.applied_statuses.indexOf(vm.utils.pp_audits_due_list.data[i].audit_started) === -1 ) {
								errors++;
							}

						}

						// LPA FILTER
						if( vm.utils.ipp_filter.applied_lpa && vm.utils.ipp_filter.applied_lpa.length ) {

							if( vm.utils.ipp_filter.applied_lpa.indexOf(vm.utils.pp_audits_due_list.data[i].is_lpa) === -1 ) {
								errors++;
							}

						}

						// USER ASSIGNED INSPECTION FILTER
						if( vm.utils.ipp_filter.applied_assigned_to && vm.utils.ipp_filter.applied_assigned_to.length ) {

							if( vm.utils.ipp_filter.applied_assigned_to.indexOf(vm.utils.pp_audits_due_list.data[i].assigned_user_id) ) {
								errors++;
							}

						} 

						// USER STARTED INSPECTION FILTER
						if( vm.utils.ipp_filter.applied_started_by && vm.utils.ipp_filter.applied_started_by.length ) {

							if( vm.utils.ipp_filter.applied_started_by.indexOf(vm.utils.pp_audits_due_list.data[i].started_by_rm_id) === -1 ) {
								errors++;
							}

						}

						// TABBED FILTERS
						if( vm.utils.tabbed_filters.active ) {

							// DUE AUDITS FOR TODAY
							if( vm.utils.tabbed_filters.tabs.today && vm.utils.pp_audits_due_list.data[i].is_today != 'Yes' ) {
								errors++;
							}

							// OVERDUE AUDITS
							if( vm.utils.tabbed_filters.tabs.overdue && vm.utils.pp_audits_due_list.data[i].is_overdue != 'Yes' ) {
								errors++;
							}

							// PLANNED AUDITS
							if( vm.utils.tabbed_filters.tabs.planned ) {

								// ANYTHING NOT OVERDUE OR IN PROGRESS
								if( vm.utils.pp_audits_due_list.data[i].is_overdue == 'Yes' || vm.utils.pp_audits_due_list.data[i].audit_started == 'Yes' ) {
									errors++;
								}

							}

							// IN PROGRESS AUDITS
							if( vm.utils.tabbed_filters.tabs.in_progress && vm.utils.pp_audits_due_list.data[i].audit_started != 'Yes' ) {
								errors++;
							}

							// ALL AUDITS
							if( vm.utils.tabbed_filters.tabs.all_audits ) {
								// NO ERRORS
							}

 						}

						// HIDE FROM THIS ARRAY IF PINNED
						// if( vm.utils.pp_audits_due_list.data[i].hasOwnProperty('pinned') && vm.utils.pp_audits_due_list.data[i].pinned == 'Yes' ) {
						// 	errors++;
						// }

						if( errors == 0 ) {
							vm.utils.pp_audits_due_list.visible_data.push(vm.utils.pp_audits_due_list.data[i]);
						}

						i++;
					}

					vm.utils.pp_audits_due_list.visible_data = $filter('orderBy')(vm.utils.pp_audits_due_list.visible_data, ['effective_next_inspection_date','asset_ref']);

					console.log("VISIBLE DATA");
					console.log( vm.utils.pp_audits_due_list.visible_data );
				},
				format: function() {
					var i = 0;
					var len = vm.utils.pp_audits_due_list.data.length;

					while(i < len) {
						vm.utils.pp_audits_due_list.formatRecord( vm.utils.pp_audits_due_list.data[i] );

						i++;
					}
				},
				formatRecord: function(record) {

					// FORMAT MORE INFO
					record.show_more_info = false;

					if( record.hasOwnProperty('audit_due_week_number') && record.audit_due_week_number ) {
						record.audit_due_week_number = parseInt( record.audit_due_week_number );
					} else {
						record.audit_due_week_number = null;
					}

					if( record.hasOwnProperty('last_inspected_date') && record.last_inspected_date ) {
						record.last_inspected_date = parseInt( record.last_inspected_date );
					} else {
						record.last_inspected_date = null;
					}

					if( record.hasOwnProperty('next_inspection_due_date') && record.next_inspection_due_date ) {
						record.next_inspection_due_date = parseInt( record.next_inspection_due_date );
						//record.next_inspection_due_date = 1722073826000;

						var moment_date = moment(record.next_inspection_due_date);
						
						record.next_inspection_due_date_f = moment_date.format('yyyy-MM-DD');
						record.next_inspection_due_date_d = moment_date.format('DD/MM/yyyy');
						record.audit_due_year = moment_date.year();

						// CLEAN UP
						moment_date = null;

					} else {
						record.next_inspection_due_date = null;
						record.next_inspection_due_year = null;
					}

					if( record.hasOwnProperty('effective_next_inspection_date') && record.effective_next_inspection_date ) {
						record.effective_next_inspection_date = parseInt( record.effective_next_inspection_date );

						record.effective_next_inspection_date_f = moment(record.effective_next_inspection_date).format('yyyy-MM-DD');
						record.effective_next_inspection_date_d = moment(record.effective_next_inspection_date).format('DD/MM/yyyy');
						record.effective_due_year = moment(record.effective_next_inspection_date).year();
					} else {
						record.effective_next_inspection_date = null;
					}

					if( record.hasOwnProperty('health_check_date') && record.health_check_date ) {
						record.health_check_date = parseInt( record.health_check_date );
					} else {
						record.health_check_date = null;
					}

					if( record.hasOwnProperty('date_started') && record.date_started ) {
						record.date_started = parseInt( record.date_started );
						record.date_started_d = moment(record.date_started).format('DD/MM/yyyy');
					} else {
						record.date_started = null;
						record.date_started_d = null;
					}

					if( record.hasOwnProperty('claimed_date') && record.claimed_date ) {
						record.claimed_date = parseInt( record.claimed_date );
						record.claimed_date_d = moment(record.claimed_date).format('DD/MM/yyyy');
					} else {
						record.claimed_date = null;
						record.claimed_date_d = null;
					}

					// SET IS OVERDUE
					if( vm.utils.date_picker.comparators.isPast(record.effective_next_inspection_date_f) ) {
						record.is_overdue = 'Yes';
					} else {
						record.is_overdue = 'No';
					}

					// SET IS TODAY
					if( vm.utils.date_picker.comparators.isToday(record.effective_next_inspection_date_f) ) {
						record.is_today = 'Yes';
					} else {
						record.is_today = 'No';
					}

					var team_ids = [];
					if( authFactory.active_profile.hasOwnProperty('TeamIDs') && authFactory.active_profile.TeamIDs ) {
						team_ids = authFactory.active_profile.TeamIDs;
					}

					vm.utils.pp_audits_due_list.updateUserAllocationFields(record, authFactory.rmCloudUserId(), team_ids);

					if( !record.hasOwnProperty('is_lpa') || !record.is_lpa ) {
						record.is_lpa = 'No';
					}

					// CLEAN UP VARIABLES
					team_ids = null;

				},
				updateUserAllocationFields: function(record, rm_user_id, team_ids) {

					if( vm.utils.pp_audits_due_list.isUserAssigned(record, rm_user_id, team_ids) ) {
						record.user_is_assigned = 'Yes';
					} else {
						record.user_is_assigned = 'No';
					}

					if( vm.utils.pp_audits_due_list.isUserAllocated(record, rm_user_id, team_ids) ) {
						record.user_is_allocated = 'Yes';
					} else {
						record.user_is_allocated = 'No';
					}

					if( vm.utils.pp_audits_due_list.hasUserClaimed(record, rm_user_id) ) {
						record.user_has_claimed = 'Yes';
					} else {
						record.user_has_claimed = 'No';
					}

				},
				isUserAllocated: function(record, rm_user_id, team_ids) {
					var is_allocated = false;
					var matches = 0;

					// IF USER IS ASSIGNED
					if( vm.utils.pp_audits_due_list.isUserAssigned(record, rm_user_id, team_ids) ) {
						matches++;
					}

					// IF IPP RECORD HAS RASIC
					if( record.hasOwnProperty('rasic') && record.rasic && record.rasic.length ) {

						var ri = 0;
						var rlen = record.rasic.length;

						while(ri < rlen) {

							// RASIC MATCHES USER ID
							if( parseInt(record.rasic[ri].rm_user_id) == rm_user_id ) {
								matches++;
							}

							// CHECK RASIC MATCHES ANY TEAMS USER IS IN
							var ti = 0;
							var tlen = team_ids.length;

							while( ti < tlen ) {

								// RASIC MATCHES TEAM ID
								if( parseInt(record.rasic[ri].rm_user_id) == parseInt(team_ids[ti]) ) {
									matches++;
								}

								ti++;
							}

							ri++;
						}

					}

					if( matches > 0 ) {
						is_allocated = true;
					}

					return is_allocated;
				},
				isUserAssigned: function(record, rm_user_id, team_ids) {
					var is_assigned = false;
					var matches = 0;

					// IF IPP RECORD HAS ASSIGNEE
					if( record.hasOwnProperty('assign_user_id') && record.assign_user_id ) {

						// IF ASSIGNEE MATCHES USER ID
						if( record.assign_user_id == rm_user_id ) {
							matches++;
						}

					}

					// IF USER IS IN A TEAM(S)
					var ti = 0;
					var tlen = team_ids.length;

					// LOOP THROUGH TEAMS, SEE IF ANY MATCH ASSIGNEE
					while( ti < tlen ) {

						// ASSIGNEE MATCHES TEAM ID
						if( record.assign_user_id == parseInt(team_ids[ti]) ) {
							matches++;
						}

						ti++;
					}

					if( matches > 0 ) {
						is_assigned = true;
					}

					return is_assigned;
				},
				hasUserClaimed: function(record, rm_user_id) {
					var has_claimed = false;
					var matches = 0;

					// IF IPP RECORD HAS BEEN CLAIMED
					if( record.hasOwnProperty('rm_claimed_by_user_id') && record.rm_claimed_by_user_id ) {

						// IF CLAIMED BY MATCHES USER ID
						if( record.rm_claimed_by_user_id == rm_user_id ) {
							matches++;
						}
 
					}

					if( matches > 0 ) {
						has_claimed = true;
					}

					return has_claimed;
				},
				refresh: function() {
					// ONLINE REFRESH OF DATA

					vm.utils.pp_audits_due_list.downloading = true;
				},
				toggleAllocations: function() {
					vm.utils.pp_audits_due_list.my_allocations = !vm.utils.pp_audits_due_list.my_allocations;

					if( vm.utils.pp_audits_due_list.my_allocations ) {
						vm.utils.toasts.myAllocationsOn();
					}

					if( !vm.utils.pp_audits_due_list.my_allocations ) {
						vm.utils.toasts.myAllocationsOff();
					}

					vm.utils.pp_audits_due_list.filter();
				},
				toggleShowDueAudits: function() {
					vm.utils.pp_audits_due_list.show_due_audits = !vm.utils.pp_audits_due_list.show_due_audits;
				},
				toggleShowPinnedAudits: function() {
					vm.utils.pp_audits_due_list.show_pinned = !vm.utils.pp_audits_due_list.show_pinned;
				},
				refreshIppRecord: function(record) {
					var defer = $q.defer();

					if( !rmConnectivityFactory.online_detection.online ) {
						var message = "You require an internet connection to start an LPA inspection";
						defer.reject(message);
						return;
					}

					record.refreshing = true;

					coreDownloadFactory.requestSaveRegisterAssetIppRecord(record.rm_pp_asset_relation_id, record.asset_id).then(function(saved_ipp_record) {

						// RE-FORMAT IPP RECORD
						vm.utils.pp_audits_due_list.formatRecord(saved_ipp_record);

						// ENSURE REFRESHING PROPERTY IS REMOVED
						if( saved_ipp_record.hasOwnProperty('refreshing') ) {
							delete saved_ipp_record.refreshing;
						}

						var found_index = null;

						// UPDATE GLOBAL DATA ARRAY
						var i = 0;
						var len = vm.utils.pp_audits_due_list.data.length;
						while(i < len) {

							if( vm.utils.pp_audits_due_list.data[i]._id == saved_ipp_record._id ) {
								vm.utils.pp_audits_due_list.data[i] = angular.copy(saved_ipp_record);
								found_index = i;
							}  

							i++;
						}

						// UPDATE VISIBLE DATA ARRAY
						var di = 0;
						var dlen = vm.utils.pp_audits_due_list.visible_data.length;
						while(di < dlen) {
							if( vm.utils.pp_audits_due_list.visible_data[di]._id == saved_ipp_record._id ) {

								if( found_index != null ) {
									vm.utils.pp_audits_due_list.visible_data[di] = vm.utils.pp_audits_due_list.data[found_index];
								} else {
									vm.utils.pp_audits_due_list.visible_data[di] = angular.copy(saved_ipp_record);
								}

							}

							di++;
						}

						// UPDATE PINNED DATA ARRAY
						var pinned_i = 0;
						var pinned_len = vm.utils.pp_audits_due_list.pinned_data.length;
						while(pinned_i < pinned_len) {
							if( vm.utils.pp_audits_due_list.pinned_data[pinned_i]._id == saved_ipp_record._id ) {

								if( found_index != null ) {
									vm.utils.pp_audits_due_list.pinned_data[pinned_i] = vm.utils.pp_audits_due_list.data[found_index];
								} else {
									vm.utils.pp_audits_due_list.pinned_data[pinned_i] = angular.copy(saved_ipp_record);
								}

							}

							pinned_i++;
						}

						if( found_index != null ) {

							// IF NOT REQUIRED
							if( !ippScoreFactory.utils.isRequiredAudit(saved_ipp_record) ) {

								// REMOVE FROM GLOBAL ARRAY
								vm.utils.pp_audits_due_list.data.splice(found_index, 1);

								// RE-FILTER AUDITS
								vm.utils.pp_audits_due_list.filterPinnedAudits();
								vm.utils.pp_audits_due_list.filter();
								defer.resolve(null);
								
							} else {
								defer.resolve(vm.utils.pp_audits_due_list.data[found_index]);
							}

							// UPDATE TAB STATS
							vm.utils.tabbed_filters.calcTabStats();

						} else {
							defer.resolve(null);
						}

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				toggleIppScoreMoreInfo: function(ipp_record_id) {
					
					// TOGGLE RECORD IN FULL DATA IF FOUND
					var data_i = 0;
					var data_len = vm.utils.pp_audits_due_list.data.length;
					while(data_i < data_len) {

						if( vm.utils.pp_audits_due_list.data[data_i]._id == ipp_record_id ) {
							vm.utils.pp_audits_due_list.data[data_i].show_more_info = !vm.utils.pp_audits_due_list.data[data_i].show_more_info;
						} else {
							vm.utils.pp_audits_due_list.data[data_i].show_more_info = false;
						}

						data_i++;
					}
				},
				ippScoreIcon: function(ipp_record) {
					var icon = '../images/custom_icons/Pipp Not Rated.png';
					var matrix_score_phrase = null;

					if( !ipp_record ) {
						return icon;
					};

                    if( !ipp_record.hasOwnProperty('matrix_score_phrase_initial') || !ipp_record.matrix_score_phrase_initial ) {
                    	return icon;
                    }

        			matrix_score_phrase = ipp_record.matrix_score_phrase_initial;

                    if( !matrix_score_phrase ) {
                        return icon;
                    };

                    if( matrix_score_phrase == 'Low' ) {
                        icon = '../images/custom_icons/Pipp Low.png';
                        return icon;
                    };

                    if( matrix_score_phrase == 'Medium' ) {
                        icon = '../images/custom_icons/Pipp Medium.png';
                        return icon;
                    };

                    if( matrix_score_phrase == 'High' ) {
                        icon = '../images/custom_icons/Pipp High.png';
                        return icon;
                    };

                    if( matrix_score_phrase == 'Very High' ) {
                        icon = '../images/custom_icons/Pipp Very High.png';
                        return icon;
                    };

                    return icon;
				},
			},
			active_ipp: {
				record: null,
				select: function(ipp_record) {
					vm.utils.active_ipp.record = ipp_record;
				},
				openOptions: function() {

					// IF VIEWING OTHERS AUDITS, NO ACTION
					if( !vm.utils.user_filter.my_allocations ) {
						vm.utils.toasts.noActionOthersAudits();
						return;
					}

					if( !vm.utils.active_ipp.record.hasOwnProperty('audit_id') || !vm.utils.active_ipp.record.audit_id ) {
						
						// IF LPA, START LPA INSPECTION
						if( vm.utils.active_ipp.record.hasOwnProperty('is_lpa') && vm.utils.active_ipp.record.is_lpa == 'Yes' ) {
							
							// CHECK LPA LICENSE
							if( !vm.utils.feature_licenses.hasLicense('lpa') ) {
								vm.utils.unlicensed_feature.start('lpa');
								return;
							}

							vm.utils.start_lpa_inspection.start(vm.utils.active_ipp.record);
							vm.utils.start_lpa_inspection.slideout.show();
						} else {
							vm.utils.start_inspection.start(vm.utils.active_ipp.record);
							vm.utils.start_inspection.slideout.show();
						}

					} else {

						// IF LPA, EXISTING LPA INSPECTION
						if( vm.utils.active_ipp.record.hasOwnProperty('is_lpa') && vm.utils.active_ipp.record.is_lpa == 'Yes' ) {
							
							// CHECK LPA LICENSE
							if( !vm.utils.feature_licenses.hasLicense('lpa') ) {
								vm.utils.unlicensed_feature.start('lpa');
								return;
							}

							vm.utils.existing_lpa_inspection.start(vm.utils.active_ipp.record);
							vm.utils.existing_lpa_inspection.slideout.show();
						} else {
							vm.utils.existing_inspection.start(vm.utils.active_ipp.record);
							vm.utils.existing_inspection.slideout.show();
						}

					}

				}
			},
			start_inspection: {
				loading: false,
				saving: false,
				ipp_record: null,
				asset_record: null, 
				start: function(ipp_record) {
					// CLEAR ANY PREVIOUS ERROR
					vm.utils.start_inspection.error_handler.clear();

					if( ipp_record.user_is_allocated != 'Yes' ) {
						var message = 'You are not eligible to start this due audit';
						vm.utils.start_inspection.error_handler.logError(message);
						return;
					}

					vm.utils.start_inspection.ipp_record = ipp_record;

					vm.utils.start_inspection.createInspectionRecord();
				},
				createInspectionRecord: function() {
					vm.utils.start_inspection.loading = true;

					var db = riskmachDatabasesFactory.databases.collection.register_assets;

					// db.get(vm.utils.start_inspection.ipp_record.asset_id).then(function(core_asset_doc) {

						var snapshot_record = modelsFactory.models.newSnapshotAsset(null);

						// projectsAssetsFactory.utils.createSnapshotOfCoreAsset(core_asset_doc, snapshot_record);
						projectsAssetsFactory.utils.createSnapshotOfCoreAsset(vm.utils.start_inspection.ipp_record, snapshot_record);

						snapshot_record.register_asset_id = null;
						snapshot_record.rm_register_asset_id = vm.utils.start_inspection.ipp_record.rm_asset_id;
						snapshot_record.pp_id = vm.utils.start_inspection.ipp_record.rm_profile_point_id;

						snapshot_record.is_single_inspection = 'Yes';

						// INDEX REQUIREMENT INFO
						snapshot_record.ipp_record_id = vm.utils.start_inspection.ipp_record._id;
						snapshot_record.started_from_due_inspection = 'Yes';
						snapshot_record.requirement_date = vm.utils.start_inspection.ipp_record.next_inspection_due_date;
						snapshot_record.planned_date = vm.utils.start_inspection.ipp_record.effective_next_inspection_date;
						snapshot_record.assigned_user_id = vm.utils.start_inspection.ipp_record.assign_user_id;
						snapshot_record.assigned_user_name = vm.utils.start_inspection.ipp_record.assigned_user_name;

						vm.utils.start_inspection.asset_record = angular.copy(snapshot_record);

						vm.utils.start_inspection.loading = false;


						$scope.$apply();

						// CLEAN UP
						snapshot_record = null;

					// }).catch(function(error) {
					// 	vm.utils.start_inspection.loading = false;
					// 	alert(error);
					// });
				},
				save: function() {
					var defer = $q.defer();
					var save_defer = $q.defer();

					// CLEAR ANY PREVIOUS ERRORS
					vm.utils.start_inspection.error_handler.clear();

					var stages = ['project','asset','ipp_record_update'];

					vm.utils.start_inspection.saving = true;

					runNextSave(save_defer, 0).then(function() {

						vm.utils.start_inspection.saving = false;

						defer.resolve();

					}, function(error) {
						vm.utils.start_inspection.saving = false;
						vm.utils.start_inspection.error_handler.logError(error);
						defer.reject(error);
					});

					function runNextSave(defer, active_index) {

						if( active_index > stages.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						if( stages[active_index] == 'project' ) {

							projectsAssetsFactory.dbUtils.getCreateProject(vm.utils.start_inspection.asset_record).then(function(project_record) {

								vm.utils.start_inspection.asset_record.project_id = project_record._id;

								active_index++;

								runNextSave(defer, active_index);

							}, function(error) {
								defer.reject(error);
							});

						}

						if( stages[active_index] == 'asset' ) {

							projectsAssetsFactory.dbUtils.saveAsset(vm.utils.start_inspection.asset_record).then(function(asset_result) {

								vm.utils.start_inspection.asset_record._id = asset_result.id;
								vm.utils.start_inspection.asset_record._rev = asset_result.rev;

								active_index++;

								runNextSave(defer, active_index);

							}, function(error) {
								defer.reject(error);
							});

						}

						if( stages[active_index] == 'ipp_record_update' ) {

							projectsAssetsFactory.dbUtils.claimIppRecordMarkInspectionStarted(vm.utils.start_inspection.ipp_record, vm.utils.start_inspection.asset_record._id).then(function() {

								active_index++;

								runNextSave(defer, active_index);

							}, function(error) {
								defer.reject(error);
							});

						} 

						return defer.promise;
					}

					return defer.promise;
				},
				enter: function() {

					// SET ACTIVE ASSET AND ENTER
					rmUtilsFactory.projects.setActiveAsset(vm.utils.start_inspection.asset_record).then(function() {

						if( vm.utils.isSop(vm.utils.start_inspection.asset_record) ) {
							window.location.replace("../procedure-builder/");
						} else {
							window.location.replace("../checklist-audits/checklist.html");
						}

					}, function(error) {
						vm.utils.start_inspection.error_handler.logError(error);
					});
				},
				saveAndEnter: function() {
					vm.utils.start_inspection.save().then(function() {
						vm.utils.start_inspection.enter();
					});
				},
				reInspect: function() {

					vm.utils.start_inspection.asset_record.re_inspection_asset = 'Yes';
					vm.utils.start_inspection.asset_record.re_inspection_data_downloaded = null;
					vm.utils.start_inspection.asset_record.re_inspection_of_id = vm.utils.start_inspection.asset_record.register_asset_id;
					vm.utils.start_inspection.asset_record.re_inspection_of_rm_id = vm.utils.start_inspection.asset_record.rm_register_asset_id;

					vm.utils.start_inspection.save().then(function() {
						// RUN REGISTER ASSET LOOKUP
						vm.utils.register_asset_lookup.start(vm.utils.start_inspection.asset_record);
					});
				},
				slideout: {
					show: function() {
	                    var myOffCanvas = document.getElementById('StartInspectionAside');
	                    // IF NO ASIDE ELEMENT
	                    if( !myOffCanvas ) {
	                    	return;
	                    }

	                    var bsOffCanvas = bootstrap.Offcanvas.getOrCreateInstance(myOffCanvas);
	                    bsOffCanvas.show();

	                    // CLEAN UP
	                    myOffCanvas = null;
	                    bsOffCanvas = null;
	                },
	                hide: function() {
	                    var myOffCanvas = document.getElementById('StartInspectionAside');
	                    // IF NO ASIDE ELEMENT
	                    if( !myOffCanvas ) {
	                    	return;
	                    }
 
	                    var bsOffCanvas = bootstrap.Offcanvas.getOrCreateInstance(myOffCanvas);
	                    bsOffCanvas.hide();

	                    // CLEAN UP
	                    myOffCanvas = null;
	                    bsOffCanvas = null;
	                },
				},
				error_handler: {
					error: false,
					error_message: null, 
					logError: function(error) {
						vm.utils.start_inspection.error_handler.error = true;
						vm.utils.start_inspection.error_handler.error_message = error;

						$scope.$apply();
					}, 
					clear: function() {
						vm.utils.start_inspection.error_handler.error = false;
						vm.utils.start_inspection.error_handler.error_message = null;
					}
				}
			},
			existing_inspection: {
				loading: false,
				ipp_record: null, 
				asset_record: null,
				start: function(ipp_record) {
					vm.utils.existing_inspection.tabs.changeTab('options');

					vm.utils.existing_inspection.loading = true;

					vm.utils.existing_inspection.ipp_record = ipp_record;

					// NEED TO FETCH INSPECTION BY ID
					projectsAssetsFactory.dbUtils.getAsset(vm.utils.existing_inspection.ipp_record.audit_id).then(function(asset_doc) {

						vm.utils.existing_inspection.loading = false;

						vm.utils.existing_inspection.asset_record = asset_doc;

						console.log("GOT EXISTING INSPECTION RECORD");
						console.log(vm.utils.existing_inspection.asset_record);

						$scope.$apply();

					}).catch(function(error) {
						vm.utils.existing_inspection.loading = false;
						vm.utils.existing_inspection.error_handler.logError(error);
					});
				},
				continue: function() {

					rmUtilsFactory.projects.setActiveAsset(vm.utils.existing_inspection.asset_record).then(function() {

						if( vm.utils.isSop(vm.utils.existing_inspection.asset_record) ) {
							window.location.replace('../procedure-builder/');
						} else {
							window.location.replace('../checklist-audits/checklist.html');
						}

					}, function(error) {
						vm.utils.existing_inspection.error_handler.logError(error);
					});
				},
				startNew: function() {

					vm.utils.existing_inspection.loading = true;

					projectsAssetsFactory.dbUtils.clearCurrentIppInspection(vm.utils.existing_inspection.ipp_record).then(function() {

						// MARK EXISTING INSPECTION DELETED
						vm.utils.existing_inspection.asset_record.status = 2;

						projectsAssetsFactory.dbUtils.saveAsset(vm.utils.existing_inspection.asset_record).then(function(asset_result) {

							vm.utils.existing_inspection.asset_record._id = asset_result.id;
							vm.utils.existing_inspection.asset_record._rev = asset_result.rev;

							// SETUP START INSPECTION DATA
							vm.utils.start_inspection.start(vm.utils.existing_inspection.ipp_record);

							// CLOSE EXISTING INSPECTION SLIDEOUT
							vm.utils.existing_inspection.closeAndClear();

							// OPEN START INSPECTION SLIDEOUT
							vm.utils.start_inspection.slideout.show();

							// CREATE AND SAVE THE NEW INSPECTION
							// vm.utils.start_inspection.save();

						}).catch(function(error) {
							vm.utils.existing_inspection.loading = false;
							vm.utils.existing_inspection.error_handler.logError(error);
						});

					}, function(error) {
						vm.utils.existing_inspection.loading = false;
						vm.utils.existing_inspection.error_handler.logError(error);
					});

				},
				isIncompleteReInspection: function() {
					var is_incomplete = false;

					if( !vm.utils.existing_inspection.asset_record ) {
						return is_incomplete;
					}

					if( vm.utils.existing_inspection.asset_record.re_inspection_asset == 'Yes' && !vm.utils.existing_inspection.asset_record.re_inspection_data_downloaded ) {
						is_incomplete = true;
					}

					return is_incomplete;
				},
				clearData: function() {
					vm.utils.existing_inspection.ipp_record = null;
					vm.utils.existing_inspection.asset_record = null;
				},
				closeAndClear: function() {
					vm.utils.existing_inspection.tabs.changeTab('options');
					vm.utils.existing_inspection.loading = false;
					vm.utils.existing_inspection.clearData();
					vm.utils.existing_inspection.error_handler.clear();
					vm.utils.existing_inspection.slideout.hide();
				},
				tabs: {
					active_tab: 'options',
					tabActive: function(tab) {
						var tab_active = false;

						if( tab == vm.utils.existing_inspection.tabs.active_tab ) {
							tab_active = true;
						} 

						return tab_active;
					},
					changeTab: function(tab) {
						vm.utils.existing_inspection.tabs.active_tab = tab;
					}
				},
				slideout: {
					show: function() {
						var slideoutEl = document.getElementById('ExistingInspectionAside');
						// IF NO SLIDEOUT ELEMENT
						if( !slideoutEl ) {
							return;
						}

						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.show();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					},
					hide: function() {
						var slideoutEl = document.getElementById('ExistingInspectionAside');
						// IF NO SLIDEOUT ELEMENT
						if( !slideoutEl ) {
							return;
						}

						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.hide();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}
				},
				error_handler: {
					error: false, 
					error_message: null,
					logError: function(error) {
						vm.utils.existing_inspection.error_handler.error = true;
						vm.utils.existing_inspection.error_handler.error_message = error;

						$scope.$apply();
					},
					clear: function() {
						vm.utils.existing_inspection.error_handler.error = false;
						vm.utils.existing_inspection.error_handler.error_message = null;
					}
				}
			},
			start_lpa_inspection: {
				refreshing: false,
				loading: false, 
				finalising: false,
				ipp_record: null, 
				asset_record: null, 
				checklist_record: null,
				canStartLpaInspection: function(ipp_record) {
					var has_permission = true;

					if( !ipp_record ) {
						return has_permission;
					}

					var team_ids = [];
					if( authFactory.active_profile.hasOwnProperty('TeamIDs') && authFactory.active_profile.TeamIDs ) {
						team_ids = authFactory.active_profile.TeamIDs;
					}

					// IF USER NOT ELIGIBLE OR ASSIGNED
					if( !vm.utils.pp_audits_due_list.isUserAllocated(ipp_record, authFactory.rmCloudUserId(), team_ids) ) {
						has_permission = false;
					}

					return has_permission;
				},
				start: function(ipp_record) {
					// CLEAR ANY PREVIOUS ERROR
					vm.utils.start_lpa_inspection.error_handler.clear();

					// PRESET IPP RECORD
					vm.utils.start_lpa_inspection.ipp_record = ipp_record;

					if( !rmConnectivityFactory.online_detection.online ) {
						// vm.utils.toasts.noInternetConnection();
						var message = "You require an internet connection to start a LPA inspection";
						vm.utils.start_lpa_inspection.error_handler.logError(message);
						return;
					}

					vm.utils.start_lpa_inspection.refreshing = true;

					vm.utils.pp_audits_due_list.refreshIppRecord(ipp_record).then(function(saved_ipp) {

						// REQUIREMENT NO LONGER AVAILABLE
						if( !saved_ipp ) {
							vm.utils.start_lpa_inspection.refreshing = false;
							vm.utils.start_lpa_inspection.error_handler.logError("LPA requirement no longer available");
							return;
						}

						if( saved_ipp ) {
							vm.utils.start_lpa_inspection.ipp_record = saved_ipp;
						}

						vm.utils.start_lpa_inspection.asset_record = null;
						vm.utils.start_lpa_inspection.checklist_record = null;

						vm.utils.start_lpa_inspection.refreshing = false;

					}, function(error) {
						vm.utils.start_lpa_inspection.refreshing = false;
						vm.utils.start_lpa_inspection.error_handler.logError(error);
					});
				},
				startLpaInspection: function() {
					if( !rmConnectivityFactory.online_detection.online ) {
						var message = "You require an internet connection to start a LPA inspection";
						vm.utils.start_lpa_inspection.error_handler.logError(message);
						return;
					}
					// CLEAR ANY PREVIOUS ERROR
					vm.utils.start_lpa_inspection.error_handler.clear();

					vm.utils.start_lpa_inspection.loading = true;

					// ATTEMPT CLAIM REQUIREMENT FIRST
					projectsAssetsFactory.claimRequirement(vm.utils.start_lpa_inspection.ipp_record).then(function() {

						// RUN ENDPOINT TO START LPA INSPECTION
						projectsAssetsFactory.requests.startLpaInspection(vm.utils.start_lpa_inspection.ipp_record.rm_pp_asset_relation_id).then(function(created_project_record) {

							vm.utils.start_lpa_inspection.loading = false;

							vm.utils.project_download.downloadProjectData(created_project_record.ActivityID, false, 'Continue').then(function(saved_project_id) {

								vm.utils.start_lpa_inspection.loading = true;

								vm.utils.start_lpa_inspection.saveAndEnter(saved_project_id);

							}, function(error) {
								vm.utils.start_lpa_inspection.error_handler.logError(error);
							});

						}, function(error) {

							// TRY REFRESHING IPP RECORD?
							// SET IPP RECORD

							vm.utils.start_lpa_inspection.loading = false;
							vm.utils.start_lpa_inspection.error_handler.logError(error);
						});

					}, function(error) {
						vm.utils.start_lpa_inspection.loading = false;
						vm.utils.start_lpa_inspection.error_handler.logError(error);
					});

				},
				downloadExistingInspection: function() {

					var rm_project_id = null;
					if( vm.utils.start_lpa_inspection.ipp_record.hasOwnProperty('lpa_snapshot_activity_id') && vm.utils.start_lpa_inspection.ipp_record.lpa_snapshot_activity_id ) {
						rm_project_id = vm.utils.start_lpa_inspection.ipp_record.lpa_snapshot_activity_id;
					}

					if( !rm_project_id ) {
						vm.utils.start_lpa_inspection.error_handler.logError("Can't find requirement's existing inspection");
						return;
					}

					vm.utils.project_download.downloadProjectData(rm_project_id, false, 'Continue').then(function(saved_project_id) {

						vm.utils.start_lpa_inspection.loading = true;

						vm.utils.start_lpa_inspection.markLpaRequirementStarted(saved_project_id).then(function() {

							vm.utils.start_lpa_inspection.enter();

						}, function(error) {
							vm.utils.start_lpa_inspection.error_handler.logError(error);
						});

					}, function(error) {
						vm.utils.start_lpa_inspection.error_handler.logError(error);
					});

				},
				markLpaRequirementStarted: function(project_id) {
					var defer = $q.defer();

					var stages = ['inspection_data','update_inspection','update_requirement'];

					runNextStage(0);

					function runNextStage(active_index) {

						if( active_index > stages.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						if( stages[active_index] == 'inspection_data' ) {

							vm.utils.start_lpa_inspection.fetchLpaInspectionData(project_id).then(function() {

								active_index++;

								runNextStage(active_index);

							}, function(error) {
								defer.reject(error);
							});

						}

						if( stages[active_index] == 'update_inspection' ) {

							vm.utils.start_lpa_inspection.indexIppRecordOnInspection().then(function() {

								active_index++;

								runNextStage(active_index);

							}, function(error) {
								defer.reject(error);
							});

						}

						if( stages[active_index] == 'update_requirement' ) {

							vm.utils.start_lpa_inspection.markRequirementStarted().then(function() {

								active_index++;

								runNextStage(active_index);

							}, function(error) {
								defer.reject(error);
							});

						}

					}

					return defer.promise;
				},
				fetchLpaInspectionData: function(project_id) {
					var defer = $q.defer();

					var stages = ['inspection','checklist'];

					runNextStage(0);

					function runNextStage(active_index) {

						if( active_index > stages.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						if( stages[active_index] == 'inspection' ) {

							vm.utils.start_lpa_inspection.fetchLpaInspectionRecord(project_id).then(function(asset_record) {

								vm.utils.start_lpa_inspection.asset_record = asset_record;

								active_index++;

								runNextStage(active_index);

							}, function(error) {
								defer.reject(error);
							});

						}

						if( stages[active_index] == 'checklist' ) {

							vm.utils.start_lpa_inspection.fetchLpaChecklistRecord().then(function(checklist_record) {

								vm.utils.start_lpa_inspection.checklist_record = checklist_record;

								active_index++;

								runNextStage(active_index);

							}, function(error) {
								defer.reject(error);
							});

						}

					}

					return defer.promise;
				},
				fetchLpaInspectionRecord: function(project_id) {
					var defer = $q.defer();

					var asset_db = riskmachDatabasesFactory.databases.collection.assets;

					asset_db.find({
						selector: {
							user_id: authFactory.cloudUserId(),
							project_id: project_id
						}
					}).then(function(result) {

						if( !result.docs.length ) {
							defer.reject("Could not find created inspection");
							return defer.promise;
						}

						var inspection_record = null;
						var i = 0;
						var len = result.docs.length;

						while(i < len) {

							if( result.docs[i].hasOwnProperty('for_lpa_requirement_id') && result.docs[i].for_lpa_requirement_id ) {
								inspection_record = result.docs[i];
							}

							i++;
						}

						if( inspection_record ) {
							defer.resolve(inspection_record);
						} else {
							defer.reject("Could not find created inspection");
						}

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				fetchLpaChecklistRecord: function() {
					var defer = $q.defer();

					if( !vm.utils.start_lpa_inspection.asset_record ) {
						defer.resolve(null);
						return defer.promise;
					}

					var checklist_db = riskmachDatabasesFactory.databases.collection.checklist_instances;

					checklist_db.find({
						selector: {
							company_id: authFactory.cloudCompanyId(),
							user_id: authFactory.cloudUserId(), 
							asset_id: vm.utils.start_lpa_inspection.asset_record._id
						}
					}).then(function(result) {

						if( result.docs.length > 0 ) {
							defer.resolve(result.docs[0]);
						} else {
							defer.resolve(null);
						}

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},	
				indexIppRecordOnInspection: function() {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.assets;

					vm.utils.start_lpa_inspection.asset_record.started_from_due_inspection = 'Yes';
					vm.utils.start_lpa_inspection.asset_record.register_asset_id = vm.utils.start_lpa_inspection.ipp_record.asset_id;
					vm.utils.start_lpa_inspection.asset_record.ipp_record_id = vm.utils.start_lpa_inspection.ipp_record._id;

					// SET LPA FIELDS
					vm.utils.start_lpa_inspection.asset_record.for_lpa_programme_name = vm.utils.start_lpa_inspection.ipp_record.lpa_programme_name;
					vm.utils.start_lpa_inspection.asset_record.for_lpa_layer_name = vm.utils.start_lpa_inspection.ipp_record.lpa_next_layer_name;

					db.put(vm.utils.start_lpa_inspection.asset_record).then(function(result) {

						vm.utils.start_lpa_inspection.asset_record._id = result.id;
						vm.utils.start_lpa_inspection.asset_record._rev = result.rev;

						defer.resolve();

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				markRequirementStarted: function() {
					var defer = $q.defer();

					projectsAssetsFactory.dbUtils.markIppRecordInspectionStarted(vm.utils.start_lpa_inspection.ipp_record, vm.utils.start_lpa_inspection.asset_record._id).then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				enter: function() {

					// SET ACTIVE ASSET AND ENTER
					rmUtilsFactory.projects.setActiveAsset(vm.utils.start_lpa_inspection.asset_record).then(function(active_records) {

						rmUtilsFactory.projects.setActiveChecklist(vm.utils.start_lpa_inspection.checklist_record).then(function(active_records){

							if( vm.utils.isSop(vm.utils.start_lpa_inspection.asset_record) ) {
								window.location.replace("../procedure-builder/");
							} else {
								window.location.replace("../checklist-audits/checklist.html");
							}

							vm.utils.start_lpa_inspection.loading = false;

						});

					}, function(error) {
						vm.utils.start_lpa_inspection.error_handler.logError(error);
					});

				},
				saveAndEnter: function(project_id) {
					vm.utils.start_lpa_inspection.loading = true;

					vm.utils.start_lpa_inspection.markLpaRequirementStarted(project_id).then(function() {
						vm.utils.start_lpa_inspection.enter();
					});
				},
				slideout: {
					show: function() {
						var slideoutEl = document.getElementById('StartLPAInspectionAside');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.show();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					},
					hide: function() {
						var slideoutEl = document.getElementById('StartLPAInspectionAside');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.hide();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}
				},
				error_handler: {
					error: false,
					error_message: null, 
					logError: function(error) {
						vm.utils.start_lpa_inspection.error_handler.error = true;
						vm.utils.start_lpa_inspection.error_handler.error_message = error;

						$scope.$apply();
					},
					clear: function() {
						vm.utils.start_lpa_inspection.error_handler.error = false;
						vm.utils.start_lpa_inspection.error_handler.error_message = null;
					}
				}
			},
			existing_lpa_inspection: {
				loading: false,
				ipp_record: null, 
				asset_record: null,
				start: function(ipp_record) {
					vm.utils.existing_lpa_inspection.tabs.changeTab('options');

					vm.utils.existing_lpa_inspection.loading = true;

					vm.utils.existing_lpa_inspection.ipp_record = ipp_record;

					vm.utils.existing_lpa_inspection.fetchData().then(function() {

						vm.utils.existing_lpa_inspection.loading = false;

						console.log("GOT EXISTING INSPECTION RECORD");
						console.log(vm.utils.existing_lpa_inspection.asset_record);

						$scope.$apply();

					}, function(error) {
						vm.utils.existing_lpa_inspection.loading = false;
						vm.utils.existing_lpa_inspection.error_handler.logError(error);
					});
				},
				fetchData: function() {
					var defer = $q.defer();

					projectsAssetsFactory.dbUtils.getAsset(vm.utils.existing_lpa_inspection.ipp_record.audit_id).then(function(asset_doc) {

						vm.utils.existing_lpa_inspection.asset_record = asset_doc;

						vm.utils.existing_lpa_inspection.fetchChecklistInstance().then(function(checklist_instance) {

							vm.utils.existing_lpa_inspection.checklist_record = checklist_instance;

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				fetchChecklistInstance: function() {
					var defer = $q.defer();

					if( !vm.utils.existing_lpa_inspection.asset_record ) {
						defer.resolve(null);
						return defer.promise;
					}  

					var checklist_db = riskmachDatabasesFactory.databases.collection.checklist_instances;

					checklist_db.find({
						selector: {
							company_id: authFactory.cloudCompanyId(),
							user_id: authFactory.cloudUserId(), 
							asset_id: vm.utils.existing_lpa_inspection.asset_record._id
						}
					}).then(function(result) {

						if( result.docs.length > 0 ) {
							defer.resolve(result.docs[0]);
						} else {
							defer.resolve(null);
						}

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				continue: function() {

					// SET ACTIVE ASSET AND ENTER
					rmUtilsFactory.projects.setActiveAsset(vm.utils.existing_lpa_inspection.asset_record).then(function(active_records) {

						rmUtilsFactory.projects.setActiveChecklist(vm.utils.existing_lpa_inspection.checklist_record).then(function(active_records){

							if( vm.utils.isSop(vm.utils.existing_lpa_inspection.asset_record) ) {
								window.location.replace("../procedure-builder/");
							} else {
								window.location.replace("../checklist-audits/checklist.html");
							}

						}, function(error) {
							vm.utils.existing_lpa_inspection.error_handler.logError(error);
						});

					}, function(error) {
						vm.utils.existing_lpa_inspection.error_handler.logError(error);
					});
				},
				isIncompleteReInspection: function() {
					var is_incomplete = false;

					if( !vm.utils.existing_lpa_inspection.asset_record ) {
						return is_incomplete;
					}

					if( vm.utils.existing_lpa_inspection.asset_record.re_inspection_asset == 'Yes' && !vm.utils.existing_lpa_inspection.asset_record.re_inspection_data_downloaded ) {
						is_incomplete = true;
					}

					return is_incomplete;
				},
				clearCurrentIppInspection: function() {
					vm.utils.existing_inspection.loading = true;

					projectsAssetsFactory.dbUtils.clearCurrentIppInspection(vm.utils.existing_inspection.ipp_record).then(function() {

						// MARK EXISTING INSPECTION DELETED
						vm.utils.existing_inspection.asset_record.status = 2;

						projectsAssetsFactory.dbUtils.saveAsset(vm.utils.existing_inspection.asset_record).then(function(asset_result) {

							vm.utils.existing_inspection.asset_record._id = asset_result.id;
							vm.utils.existing_inspection.asset_record._rev = asset_result.rev;

							// SETUP START INSPECTION DATA
							vm.utils.start_inspection.start(vm.utils.existing_inspection.ipp_record);

							// CLOSE EXISTING INSPECTION SLIDEOUT
							vm.utils.existing_inspection.closeAndClear();

							// OPEN START INSPECTION SLIDEOUT
							vm.utils.start_inspection.slideout.show();

							// CREATE AND SAVE THE NEW INSPECTION
							// vm.utils.start_inspection.save();

						}).catch(function(error) {
							vm.utils.existing_inspection.loading = false;
							vm.utils.existing_inspection.error_handler.logError(error);
						});

					}, function(error) {
						vm.utils.existing_inspection.loading = false;
						vm.utils.existing_inspection.error_handler.logError(error);
					});
				},
				clearData: function() {
					vm.utils.existing_lpa_inspection.ipp_record = null;
					vm.utils.existing_lpa_inspection.asset_record = null;
				},
				closeAndClear: function() {
					vm.utils.existing_lpa_inspection.tabs.changeTab('options');
					vm.utils.existing_lpa_inspection.loading = false;
					vm.utils.existing_lpa_inspection.clearData();
					vm.utils.existing_lpa_inspection.error_handler.clear();
					vm.utils.existing_lpa_inspection.slideout.hide();
				},
				tabs: {
					active_tab: 'options',
					tabActive: function(tab) {
						var tab_active = false;

						if( tab == vm.utils.existing_lpa_inspection.tabs.active_tab ) {
							tab_active = true;
						} 

						return tab_active;
					},
					changeTab: function(tab) {
						vm.utils.existing_lpa_inspection.tabs.active_tab = tab;
					}
				},
				slideout: {
					show: function() {
						var slideoutEl = document.getElementById('ExistingLPAInspectionAside');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.show();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					},
					hide: function() {
						var slideoutEl = document.getElementById('ExistingLPAInspectionAside');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.hide();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}
				},
				error_handler: {
					error: false, 
					error_message: null,
					logError: function(error) {
						vm.utils.existing_lpa_inspection.error_handler.error = true;
						vm.utils.existing_lpa_inspection.error_handler.error_message = error;

						$scope.$apply();
					},
					clear: function() {
						vm.utils.existing_lpa_inspection.error_handler.error = false;
						vm.utils.existing_lpa_inspection.error_handler.error_message = null;
					}
				}
			},
			moment: {
				calcAuditDueValues: function(record) {

					record.audit_due_week_number = null;
					record.audit_due_month = null;
					record.audit_due_year = null;
					record.audit_due_days_to = null;

					if( record.hasOwnProperty('next_inspection_due_date') && record.next_inspection_due_date ) {

						var moment_date = moment(record.next_inspection_due_date);

						record.audit_due_week_number = moment_date.week();
						record.audit_due_month = moment_date.month();
						record.audit_due_year = moment_date.year();


					}

				}
			},
			date_picker: {
				filter_active: false,
				selected_start_date: null,
				selected_end_date: null,
				start_date: null, 
				end_date: null,
				selection_type: null,
				current: {
					day: null, 
					week: null, 
					month: null,
					year: null, 
					date: null,
					calcCurrent: function() {
						var m = moment();
						vm.utils.date_picker.current.day = m.date();
						vm.utils.date_picker.current.week = m.week();
						vm.utils.date_picker.current.month = m.month();
						vm.utils.date_picker.current.year = m.year();
						vm.utils.date_picker.current.date = m.format('yyyy-MM-DD');

						// CLEAN UP
						m = null;
					}
				},
				defaults: {
					thisWeek: function() {
						// START OF THE WORKING WEEK
						var m = moment(vm.utils.date_picker.current.date).day("Monday");
						vm.utils.date_picker.start_date = m.format('yyyy-MM-DD');

						// END DATE IS 6 DAYS AFTER START OF WEEK
						m.add(6,'d');
						vm.utils.date_picker.end_date = m.format('yyyy-MM-DD');

						// CLEAN UP
						m = null;
					},
					nextWeek: function() {
						// START OF NEXT WEEK
						var m = moment(vm.utils.date_picker.current.date).add(1,'w');
						m.day("Monday");
						vm.utils.date_picker.start_date = m.format('yyyy-MM-DD');

						// END DATE IS 6 DAYS AFTER START OF WEEK
						m.add(6,'d');
						vm.utils.date_picker.end_date = m.format('yyyy-MM-DD');

						// CLEAN UP
						m = null;
					},
					lastWeek: function() {
						// START OF LAST WEEK
						var m = moment(vm.utils.date_picker.current.date).subtract(1,'w');
						m.day("Monday");
						vm.utils.date_picker.start_date = m.format('yyyy-MM-DD');

						// END DATE IS 6 DAYS AFTER START OF WEEK
						m.add(6,'d');
						vm.utils.date_picker.end_date = m.format('yyyy-MM-DD');

						// CLEAN UP
						m = null;
					},
					thisMonth: function() {
						// START OF THIS MONTH
						var month_start = moment(vm.utils.date_picker.current.date).startOf('month');
						vm.utils.date_picker.start_date = month_start.format('yyyy-MM-DD');

						// END DATE IS LAST DAY OF THE MONTH
						var month_end = moment(vm.utils.date_picker.current.date).endOf('month');
						vm.utils.date_picker.end_date = month_end.format('yyyy-MM-DD');

						// CLEAN UP
						month_start = null;
						month_end = null;
					},
					nextMonth: function() {
						// START OF NEXT MONTH
						var month_start = moment(vm.utils.date_picker.current.date).add(1,'month').startOf('month');
						vm.utils.date_picker.start_date = month_start.format('yyyy-MM-DD');

						// END DATE IS LAST DAY OF THE NEXT MONTH
						var month_end = moment(vm.utils.date_picker.current.date).add(1,'month').endOf('month');
						vm.utils.date_picker.end_date = month_end.format('yyyy-MM-DD');

						// CLEAN UP
						month_start = null;
						month_end = null;
					},
					lastMonth: function() {
						// START OF LAST MONTH
						var month_start = moment(vm.utils.date_picker.current.date).subtract(1,'month').startOf('month');
						vm.utils.date_picker.start_date = month_start.format('yyyy-MM-DD');

						// END DATE IS LAST DAY OF THE PREVIOUS MONTH
						var month_end = moment(vm.utils.date_picker.current.date).subtract(1,'month').endOf('month');
						vm.utils.date_picker.end_date = month_end.format('yyyy-MM-DD');

						// CLEAN UP
						month_start = null;
						month_end = null;
					},
					doThisWeek: function() {
						vm.utils.date_picker.defaults.thisWeek();
						vm.utils.date_picker.selection_type = 'This week';

						vm.utils.date_picker.apply();
					},
					doNextWeek: function() {
						vm.utils.date_picker.defaults.nextWeek();
						vm.utils.date_picker.selection_type = 'Next week';

						vm.utils.date_picker.apply();
					},
					doLastWeek: function() {
						vm.utils.date_picker.defaults.lastWeek();
						vm.utils.date_picker.selection_type = 'Last week';

						vm.utils.date_picker.apply();
					}, 
					doThisMonth: function() {
						vm.utils.date_picker.defaults.thisMonth();
						vm.utils.date_picker.selection_type = 'This month';

						vm.utils.date_picker.apply();
					},
					doNextMonth: function() {
						vm.utils.date_picker.defaults.nextMonth();
						vm.utils.date_picker.selection_type = 'Next month';

						vm.utils.date_picker.apply();
					},
					doLastMonth: function() {
						vm.utils.date_picker.defaults.lastMonth();
						vm.utils.date_picker.selection_type = 'Last month';

						vm.utils.date_picker.apply();
					}
				},
				comparators: {
					isToday: function(date) {
						var is_today = false;

						var today = moment(vm.utils.date_picker.current.date);

						if( today.isSame(date) ) {
							is_today = true;
						}

						// CLEAN UP
						today = null;

						return is_today;
					},
					isPast: function(date) {
						var is_past = false;

						var today = moment(vm.utils.date_picker.current.date);

						if( today.isAfter(date) ) {
							is_past = true;
						}

						// CLEAN UP
						today = null;

						return is_past;
					},
					isFuture: function(date) {
						var is_future = false;

						var today = moment(vm.utils.date_picker.current.date);

						if( today.isBefore(date) ) {
							is_future = true;
						}

						// CLEAN UP
						today = null;

						return is_future;
					}
				},
				apply: function() {

					vm.utils.date_picker.filter_active = true;

					// DEACTIVATE TAB FILTERS
					vm.utils.tabbed_filters.deactivate();

					vm.utils.pp_audits_due_list.filter();

				},
				manuallyApply: function() {

					vm.utils.date_picker.selection_type = 'Custom';

					if( vm.utils.date_picker.selected_start_date ) {
						vm.utils.date_picker.start_date = vm.utils.date_picker.selected_start_date;
					}

					if( vm.utils.date_picker.selected_end_date ) {
						vm.utils.date_picker.end_date = vm.utils.date_picker.selected_end_date;
					}

					// IF CLEARED DATES, SELECT 'ALL AUDITS' TAB
					if( !vm.utils.date_picker.selected_start_date && !vm.utils.date_picker.selected_end_date ) {
						vm.utils.tabbed_filters.selectAndFilter('all_audits');
						return;
					}

					vm.utils.date_picker.apply();
				},
				start: function() {

					if( vm.utils.date_picker.start_date ) {
						vm.utils.date_picker.selected_start_date = vm.utils.date_picker.start_date;
					}

					if( vm.utils.date_picker.end_date ) {
						vm.utils.date_picker.selected_end_date = vm.utils.date_picker.end_date;
					}

					vm.utils.date_picker.slideout.show();
				},
				slideout: {
					show: function() {
						var slideoutEl = document.getElementById('DatePickerAside');
						// COULDN'T FIND SLIDEOUT ELEMENT
						if( !slideoutEl ) {
							return;
						}

						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.show();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					},
					hide: function() {
						var slideoutEl = document.getElementById('DatePickerAside');
						// COULDN'T FIND SLIDEOUT ELEMENT
						if( !slideoutEl ) {
							return;
						}

						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.hide();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}
				}
			},
			core: {
				downloading: false,
				downloading_message: null,
				site_fetch_records: null,
				active_fetch_record: null,
				refresh: function() {
					if( !rmConnectivityFactory.online_detection.online ) {
						vm.utils.toasts.noInternetConnection();
						return;
					}

					vm.utils.core.downloading = true;
					vm.utils.core.downloading_message = "Downloading site's Core...";

					var params = {
						client_id: authFactory.getActiveCompanyId(), 
						site_id: vm.utils.place_filters.site.record.rm_id
					};

					var required_stages = ['register_sites','register_buildings','register_areas','register_assets','register_tasks','register_media_records','register_asset_ipp','mr_meta','qr_register'];
					var is_partial = 'No';

					var stages = coreDownloadFactory.download_setup.initStages(required_stages, params);

					fetchUtilsFactory.utils.initNewDownload('core', params.site_id, 'site', stages, 'Continue', is_partial).then(function() {
						fetchUtilsFactory.utils.doStartDownload().then(function() {
							
							vm.utils.core.downloading = false;
							vm.utils.core.downloading_message = null;

							vm.utils.page_init.start();

						}, function(error) {
							console.log(error);
							vm.utils.core.downloading = false;
							vm.utils.core.downloading_message = null;
						});

					}, function(error) {
						console.log(error);
						vm.utils.core.downloading = false;
						vm.utils.core.downloading_message = null;
					});
				},
				refreshIppScores: function() {
					if( !rmConnectivityFactory.online_detection.online ) {
						vm.utils.toasts.noInternetConnection();
						return;
					} 

					vm.utils.core.downloading = true;
					vm.utils.core.downloading_message = "Refreshing upcoming audits list...";

					var params = {
						client_id: authFactory.getActiveCompanyId(), 
						site_id: vm.utils.place_filters.site.record.rm_id
					};

					// 'register_assets'
					var required_stages = ['register_sites','register_asset_ipp'];
					var is_partial = 'Yes';

					var stages = coreDownloadFactory.download_setup.initStages(required_stages, params);

					fetchUtilsFactory.utils.initNewDownload('core', params.site_id, 'site', stages, 'Continue', is_partial).then(function() {
						fetchUtilsFactory.utils.doStartDownload().then(function() {
							
							vm.utils.core.downloading = false;
							vm.utils.core.downloading_message = null;

							vm.utils.page_init.start();

						}, function(error) {
							console.log(error);
							vm.utils.core.downloading = false;
							vm.utils.core.downloading_message = null;
						});

					}, function(error) {
						console.log(error);
						vm.utils.core.downloading = false;
						vm.utils.core.downloading_message = null;
					});
				},
				refreshSites: function() {
					if( !rmConnectivityFactory.online_detection.online ) {
						vm.utils.toasts.noInternetConnection();
						return;
					}

					vm.utils.core.downloading = true;
					vm.utils.core.downloading_message = "Refreshing company sites...";

					var params = {
						client_id: authFactory.getActiveCompanyId(),
						site_id: null,
					};

					// SELECT ONLY THE SITES STAGE
					var stages = coreDownloadFactory.download_setup.initStages(['register_sites'], params);
					var is_partial = 'No';

					fetchUtilsFactory.utils.initNewDownload('core', null, null, stages, 'Continue', is_partial).then(function() {
						fetchUtilsFactory.utils.doStartDownload().then(function() {

							vm.utils.core.downloading = false;
							vm.utils.core.downloading_message = null;

							vm.utils.page_init.start();

						}, function(error) {
							vm.utils.core.downloading = false;
							vm.utils.core.downloading_message = null;
						});

					}, function(error) {
						vm.utils.core.downloading = false;
						vm.utils.core.downloading_message = null;
					});
				},
				reAttemptRefresh: function() {
					vm.utils.core.downloading = true;
					vm.utils.core.downloading_message = "Downloading site's Core...";

					fetchUtilsFactory.active.fetch_id = vm.utils.core.active_fetch_record._id;

					fetchUtilsFactory.utils.doStartDownload().then(function() {
						vm.utils.core.downloading = false;
						vm.utils.core.downloading_message = null;
						
						vm.utils.page_init.start();

					}, function(error) {
						console.log(error);
						vm.utils.core.downloading = false;
						vm.utils.core.downloading_message = null;
					});
				},
				latestSiteFetchRecords: function() {
					var defer = $q.defer();

					fetchUtilsFactory.dbUtils.fetch_records.latestFetchRecords('core', 'site', 'Continue').then(function(fetch_records) {

						vm.utils.core.site_fetch_records = fetch_records;

						vm.utils.core.setActiveFetchRecord();

						defer.resolve();

					}, function(error) {
						console.log("ERROR FETCHING LATEST SITE FETCH RECORDS");
						defer.reject(error);
					});

					return defer.promise;
				},
				setActiveFetchRecord: function() {

					if( !vm.utils.core.site_fetch_records || !vm.utils.core.site_fetch_records.length ) {
						vm.utils.core.active_fetch_record = null;
						return;
					}

					if( !vm.utils.place_filters.site.record ) {
						vm.utils.core.active_fetch_record = null;
						return;
					}

					var i = 0;
					var len = vm.utils.core.site_fetch_records.length;
					var matched_index = null;

					while(i < len) {

						if( vm.utils.core.site_fetch_records[i].fetch_record_id == vm.utils.place_filters.site.record.rm_id ) {
							matched_index = i;
							// vm.utils.core.active_fetch_record = vm.utils.core.site_fetch_records[i];
						}

						i++;
					}

					if( matched_index != null ) {
						vm.utils.core.active_fetch_record = vm.utils.core.site_fetch_records[matched_index];
					} else {
						vm.utils.core.active_fetch_record = null;
					}

				},
				siteHasLastSuccessfulFetch: function() {
					var has_last_successful_fetch = false;

					// IF NO PREVIOUS FETCH FOR SITE
					if( !vm.utils.core.active_fetch_record ) {
						return has_last_successful_fetch;
					}

					// IF LAST FETCH FOR SITE IS INCOMPLETE
					if( vm.utils.core.isIncompleteDownload() ) {
						return has_last_successful_fetch;
					}

					has_last_successful_fetch = true;

					return has_last_successful_fetch;
				},
				isIncompleteDownload: function() {
					var incomplete_download = false;

					if( vm.utils.core.active_fetch_record && !vm.utils.core.active_fetch_record.date_finished ) {
						incomplete_download = true;
					}

					return incomplete_download;
				},
				isLastSiteFetchOld: function() {
					var is_old = false;

					if( !vm.utils.core.active_fetch_record ) {
						return is_old;
					}

					if( vm.utils.core.isIncompleteDownload() ) {
						return is_old;
					}
						
					// .format('yyyy-MM-DD');
					var date_finished = moment(vm.utils.core.active_fetch_record.date_finished);
					// var week_ago = moment().subtract(7,'days').format('yyyy-MM-DD');
					var fifteen_min_ago = moment().subtract(15,'minutes');

					// IF THE DATE LAST DOWNLOAD FINISHED WAS OVER 15 MINS AGO
					if( moment(date_finished).isBefore(fifteen_min_ago) ) {
						is_old = true;
					}

					// CLEAN UP
					date_finished = null;
					week_ago = null;
 
					return is_old;
				},
				download_confirmation: {
					show: function() {
						var slideoutEl = document.getElementById('CoreDownloadConfirmationAside');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.show();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}, 
					hide: function() {
						var slideoutEl = document.getElementById('CoreDownloadConfirmationAside');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.hide();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}
				},
				download_ipp_confirmation: {
					show: function() {
						var slideoutEl = document.getElementById('IppDownloadConfirmationAside');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.show();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}, 
					hide: function() {
						var slideoutEl = document.getElementById('IppDownloadConfirmationAside');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.hide();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}
				}
			},
			core_download: {
				active_fetch_item: null,
				display_message: null, 
				error_message: null,
				setDisplayMessage: function(active_fetch_item) {
					vm.utils.core_download.display_message = active_fetch_item.status + " " + active_fetch_item.display_name;
				},
				resetDownloadStatuses: function() {
					vm.utils.core_download.active_fetch_item = null;
					vm.utils.core_download.display_message = null;
					vm.utils.core_download.error_message = null;
				},
				events: function() {
					$scope.$on("coreDownload::status", function(event, data) {
						vm.utils.core_download.active_fetch_item = fetchUtilsFactory.active.stage;
						vm.utils.core_download.setDisplayMessage(vm.utils.core_download.active_fetch_item.record);
					});

					$scope.$on("coreDownload::itemInstalled", function(event, data) {
						vm.utils.core_download.active_fetch_item.record.total_items_installed = data.current_total;
					});
				}()
			},
			register_asset_lookup: {
				loading: false,
				online: true,
				relations: {
					register_asset_or_qr: 'yes',
            		activity_id: null, 
            		asset_id: null, 
            		register_asset_id: null,
            		qr_code: null,
            		profile_point_id: null, 
            		type: null,
            		dest_asset_id: null,
				},
				start: function(asset) {
					if( !asset.hasOwnProperty('rm_register_asset_id') || !asset.rm_register_asset_id ) {
						alert("This inspection has not been linked to Core");
						return;
					}

					vm.utils.register_asset_lookup.online = true;
					vm.utils.register_asset_lookup.relations.register_asset_id = asset.rm_register_asset_id;
					vm.utils.register_asset_lookup.relations.qr_code = asset.qr_code;
					vm.utils.register_asset_lookup.relations.dest_asset_id = asset._id;

					if( asset.hasOwnProperty('pp_id') && asset.pp_id ) {
						vm.utils.register_asset_lookup.relations.profile_point_id = asset.pp_id;
					}

					vm.utils.register_asset_lookup.slideout.show();
				},
				reset: function() {
					vm.utils.register_asset_lookup.relations.activity_id = null;
					vm.utils.register_asset_lookup.relations.asset_id = null;
					vm.utils.register_asset_lookup.relations.register_asset_id = null;
					vm.utils.register_asset_lookup.relations.qr_code = null;
					vm.utils.register_asset_lookup.relations.dest_asset_id = null;
					vm.utils.register_asset_lookup.relations.profile_point_id = null;
					vm.utils.register_asset_lookup.relations.type = null;
				},
				lookupRegisterAssetInspections: function() {

					if( !rmConnectivityFactory.online_detection.online ) {
						vm.utils.register_asset_lookup.online = false;
						vm.utils.toasts.noInternetConnection();
						return;
					}

					vm.utils.register_asset_lookup.loading = true;
					vm.utils.register_asset_lookup.online = true;

					projectsAssetsFactory.lookupRegisterAssetInspections(vm.utils.register_asset_lookup.relations).then(function(saved_asset) {
						// REFRESH ASSET LISTING RECORD
						// angular.forEach(vm.utils.asset_listing.data, function(a_record, a_index) {
						// 	if( a_record._id == saved_asset._id ) {
						// 		vm.utils.asset_listing.data[a_index]._id = saved_asset._id;
						// 		vm.utils.asset_listing.data[a_index]._rev = saved_asset._rev;
						// 	}
						// });

						vm.utils.register_asset_lookup.loading = false;

						vm.utils.register_asset_lookup.slideout.hide();

						setTimeout(function() {
							vm.utils.re_inspect_inspections.start(vm.utils.register_asset_lookup.relations.dest_asset_id);
						}, 250);

					}, function(error) {
						vm.utils.register_asset_lookup.loading = false;
						alert(error);
					});
				},
				close: function() {
					vm.utils.register_asset_lookup.reset();

					vm.utils.register_asset_lookup.slideout.hide();
				},
				slideout: {
					show: function() {
						var slideoutEl = document.getElementById('RegisterAssetLookupSlideout');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.show();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					},
					hide: function() {
						var slideoutEl = document.getElementById('RegisterAssetLookupSlideout');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.hide();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}
				}
			},
			re_inspect_inspections: {
				relations: {
					dest_project_id: null,
					dest_asset_id: null
				},
				downloading_asset: false,
				online: true,
				dest_record: null,
				inspection_details: {
					data: {},
					active_details: 'core', 
					confirm_details: false,
					changeDetails: function(details) {
						vm.utils.re_inspect_inspections.inspection_details.active_details = details;

						// vm.utils.re_inspect_inspections.inspection_details.setDestInspectionDetails(details);
					},
					detailsActive: function(details) {
						if( vm.utils.re_inspect_inspections.inspection_details.active_details == details ) {
							return true;
						} else {
							return false;
						}
					},
					setDetailProperty: function(property_key, value) {
						vm.utils.re_inspect_inspections.inspection_details.data[property_key] = value;
					},
					detailsMatch: function(property_key, value) {

						if( !vm.utils.re_inspect_inspections.inspection_details.data.hasOwnProperty(property_key) ) {
							return false;
						}

						if( vm.utils.re_inspect_inspections.inspection_details.data[property_key] == value ) {
							return true;
						} else {
							return false;
						}
					},
					toggleViewOtherInspectionDetailOptions: function() {

						if( !vm.utils.re_inspect_inspections.download_inspection.inspectionLinkedToCore(vm.utils.re_inspect_inspections.download_inspection.record) ) {
							vm.utils.re_inspect_inspections.inspection_details.changeDetails('inspection');
						}

						vm.utils.re_inspect_inspections.inspection_details.confirm_details = !vm.utils.re_inspect_inspections.inspection_details.confirm_details;
					},
					setDestInspectionDetails: function(details) {

						if( details == 'core' ) {
							vm.utils.re_inspect_inspections.inspection_details.data.asset_ref = vm.utils.re_inspect_inspections.download_inspection.record.register_asset_ref;
							vm.utils.re_inspect_inspections.inspection_details.data.serial = vm.utils.re_inspect_inspections.download_inspection.record.register_asset_serial;
							vm.utils.re_inspect_inspections.inspection_details.data.model = vm.utils.re_inspect_inspections.download_inspection.record.register_asset_model;
							vm.utils.re_inspect_inspections.inspection_details.data.type = vm.utils.re_inspect_inspections.download_inspection.record.register_asset_type;
							vm.utils.re_inspect_inspections.inspection_details.data.description = vm.utils.re_inspect_inspections.download_inspection.record.register_asset_description;
						}

						if( details == 'inspection' ) {
							vm.utils.re_inspect_inspections.inspection_details.data.asset_ref = vm.utils.re_inspect_inspections.download_inspection.record.asset_ref;
							vm.utils.re_inspect_inspections.inspection_details.data.serial = vm.utils.re_inspect_inspections.download_inspection.record.serial;
							vm.utils.re_inspect_inspections.inspection_details.data.model = vm.utils.re_inspect_inspections.download_inspection.record.model;
							vm.utils.re_inspect_inspections.inspection_details.data.type = vm.utils.re_inspect_inspections.download_inspection.record.type;
							vm.utils.re_inspect_inspections.inspection_details.data.description = vm.utils.re_inspect_inspections.download_inspection.record.description;
						}

						if( details == 'dest_inspection' ) {
							vm.utils.re_inspect_inspections.inspection_details.data.asset_ref = vm.utils.re_inspect_inspections.dest_record.asset_ref;
							vm.utils.re_inspect_inspections.inspection_details.data.serial = vm.utils.re_inspect_inspections.dest_record.serial;
							vm.utils.re_inspect_inspections.inspection_details.data.model = vm.utils.re_inspect_inspections.dest_record.model;
							vm.utils.re_inspect_inspections.inspection_details.data.type = vm.utils.re_inspect_inspections.dest_record.type;
							vm.utils.re_inspect_inspections.inspection_details.data.description = vm.utils.re_inspect_inspections.dest_record.description;
						}
					}
				},
				tabs: {
					active_tab: 'inspection_list',
					changeTab: function(tab) {
						vm.utils.re_inspect_inspections.tabs.active_tab = tab;
					},
					tabActive: function(tab) {
						if( vm.utils.re_inspect_inspections.tabs.active_tab == tab ) {
							return true;
						} else {
							return false;
						}
					}
				},
				start: function(asset_id) {
					vm.utils.re_inspect_inspections.online = true;
					vm.utils.re_inspect_inspections.relations.dest_project_id = null;
					vm.utils.re_inspect_inspections.relations.dest_asset_id = asset_id;

					projectsAssetsFactory.dbUtils.getAsset(asset_id).then(function(dest_asset_doc) {

						vm.utils.re_inspect_inspections.relations.dest_project_id = dest_asset_doc.project_id;

						vm.utils.re_inspect_inspections.tabs.changeTab('inspection_list');

						vm.utils.re_inspect_inspections.slideout.show();
						vm.utils.re_inspect_inspections.inspection_listing.refresh();

					}).catch(function(error) {
						alert(error);
					});
				},
				inspection_listing: {
					loading: false,
					data: [],
					visible_data: [],
					filters: {
						general_search: ''
					},
					refresh: function() {
						vm.utils.re_inspect_inspections.inspection_listing.loading = true;

						// FETCH REINSPECTION SNAPSHOTS META
						var asset_id = vm.utils.re_inspect_inspections.relations.dest_asset_id;
						riskmachDatabasesFactory.databases.collection.assets.get(asset_id).then(function(asset_doc) {

							console.log("ASSET RECORD FOR CLOUD INSPECTIONS");
							console.log(asset_doc);

							vm.utils.re_inspect_inspections.inspection_listing.data = asset_doc.cloud_inspections_meta;
							vm.utils.re_inspect_inspections.dest_record = asset_doc;

							vm.utils.re_inspect_inspections.inspection_listing.autoFilter();

							vm.utils.re_inspect_inspections.inspection_listing.loading = false;

							$scope.$apply();

						}).catch(function(error) {
							vm.utils.re_inspect_inspections.inspection_listing.loading = false;
							alert(error);
						});
					},
					autoFilter: function(){
						// FILTER BY DATE INSPECTED
						var filtered = $filter('orderBy')(vm.utils.re_inspect_inspections.inspection_listing.data,'date_added',true);
						var visible_data = [];

						angular.forEach(filtered, function(record, index){
							var num_errors = 0;

							// FILTERS HERE

							if( num_errors == 0 )
							{
								visible_data.push(record);
							}

						});

						vm.utils.re_inspect_inspections.inspection_listing.visible_data = visible_data;
					},
				},
				active_asset: {
					record: null,
					select: function(record){
						// vm.utils.asset_listing_media.media_records = [];
						vm.utils.re_inspect_inspections.active_asset.record = record;
						// vm.utils.checklist_listing.refresh();
						// vm.utils.asset_listing_media.setRecord(vm.utils.re_inspect_inspections.active_asset.record);
						// vm.utils.asset_listing_media.getAllRecordAttachments(vm.utils.asset_listing_media.record._id, 'asset');

						// if( vm.utils.showProcedureOptions() )
						// {
						// 	vm.utils.re_inspect_inspections.active_asset.tabs.changeTab('procedures');
						// }
						// else
						// {
						// 	vm.utils.re_inspect_inspections.active_asset.tabs.changeTab('checklists');
						// }
						
						// vm.utils.active_asset.getAssetMedia(vm.utils.active_asset.record);
					},
					isActive: function(record){
						var active = false;

						if( !vm.utils.re_inspect_inspections.active_asset.record )
						{
							return active;
						}

						if( vm.utils.re_inspect_inspections.active_asset.record.rm_id == record.rm_id )
						{
							active = true;
						}

						return active;
					},
					activeStyle: function(record){
						var style = {
							'opacity': '1'
						};

						// if( !vm.utils.re_inspect_inspections.active_asset.record )
						// {
						// 	return style;
						// }

						// if( vm.utils.re_inspect_inspections.active_asset.record.rm_id != record.rm_id )
						// {
						// 	style['opacity'] = '0.5';
						// }

						return style;
					},
					tabs: {
						active_tab: 'checklists',
						changeTab: function(tab){
							vm.utils.re_inspect_inspections.active_asset.tabs.active_tab = tab;
						},
						tabActive: function(tab){
							var active = false;

							if( tab == vm.utils.re_inspect_inspections.active_asset.tabs.active_tab )
							{
								active = true;
							}

							return active;
						}
					},
				},	
				download_inspection: {
					confirmation: false,
					record: null,
					confirmDownloadInspectionData: function(asset) {

						// INSPECTION IS DELETED
						if( asset.status == 2 || asset.status == "2" ) {
							alert("This inspection has been deleted. You cannot re-inspect a deleted inspection");
							return;
						}

						// IF SINGLE INSPECTION, USE THAT TO CHECK PROFILE COMPLIANCE
						if( vm.utils.re_inspect_inspections.dest_record.hasOwnProperty('is_single_inspection') && vm.utils.re_inspect_inspections.dest_record.is_single_inspection == 'Yes' ) {

							console.log(vm.utils.re_inspect_inspections.dest_record);

							// INSPECTION PROFILE POINT MUST MATCH DEST ASSET
							if( parseInt(asset.project_pp_id) != vm.utils.re_inspect_inspections.dest_record.pp_id ) {
								// REVIEW ALERT WORDING
								alert("This inspection does not match the active compliance type for the current inspection");
								return;
							}

						} else {

							// INSPECTION PROFILE POINT AND ACTIVITY TYPE MUST MATCH ACTIVE PROJECT
							if( parseInt(asset.project_pp_id) != vm.utils.active_records.data.project.pp_id || parseInt(asset.project_type_id) != vm.utils.active_records.data.project.type ) {
								// REVIEW ALERT WORDING
								alert("This inspection does not match the active compliance type for this project");
								return;
							}

						}

						var details = null;

						vm.utils.re_inspect_inspections.download_inspection.record = asset;

						if( vm.utils.re_inspect_inspections.download_inspection.inspectionLinkedToCore(asset) ) {
							details = 'core';
						} else {
							details = 'inspection';
						}

						vm.utils.re_inspect_inspections.inspection_details.setDestInspectionDetails(details);
						vm.utils.re_inspect_inspections.inspection_details.confirm_details = false;

						vm.utils.re_inspect_inspections.tabs.changeTab('download_confirmation');
					},
					downloadInspectionData: function() {
						var record = vm.utils.re_inspect_inspections.download_inspection.record;

						if( !record.hasOwnProperty('rm_project_id') || !record.rm_project_id ) {
							alert("This inspection does not belong to a project");
							return;
						}

						if( !record.hasOwnProperty('rm_id') || !record.rm_id ) {
							alert("This inspection has not got a RiskMach identifier");
							return;
						}

						if( !rmConnectivityFactory.online_detection.online ) {
							vm.utils.re_inspect_inspections.online = false;
							vm.utils.toasts.noInternetConnection();
							return;
						}

						vm.utils.re_inspect_inspections.online = true;
						vm.utils.re_inspect_inspections.downloading_asset = true;

						// UPDATE SNAPSHOTS WITH NEW DETAILS
						projectsAssetsFactory.updateReInspectionSnapshotDetails(vm.utils.re_inspect_inspections.dest_record, vm.utils.re_inspect_inspections.inspection_details.data).then(function(saved_result) {

							vm.utils.re_inspect_inspections.dest_record._id = saved_result._id;
							vm.utils.re_inspect_inspections.dest_record._rev = saved_result._rev;

							var params = {
								activity_id: parseInt(record.rm_project_id),
								asset_id: parseInt(record.rm_id)
							};
							// SETUP DATA TO FETCH AND DOWNLOAD TYPE
							var required_stages = ['checklist_instances','checklist_question_records','uaudit_content','assessments','ra_question_relations','ra_control_item_relations','assessment_media','project_contributors'];
							var stages = projectDownloadFactory.download_setup.initStages(required_stages, params);
							var download_type = 'New';
							var is_partial = 'No';
							// SETUP DESTINATION VALUES
							projectDownloadFactory.download_setup.dest.active_dest = true;
							projectDownloadFactory.download_setup.dest.project_id = vm.utils.re_inspect_inspections.relations.dest_project_id;
							projectDownloadFactory.download_setup.dest.asset_id = vm.utils.re_inspect_inspections.relations.dest_asset_id;

							fetchUtilsFactory.utils.initNewDownload('project', record.rm_project_id, 'project', stages, download_type, is_partial).then(function() {
								fetchUtilsFactory.utils.doStartDownload().then(function() {

									projectsAssetsFactory.markReInspectionDataDownloaded(vm.utils.re_inspect_inspections.relations.dest_asset_id).then(function() {

										projectDownloadFactory.dbUtils.projects.updateProjectDownloadStatus(projectDownloadFactory.download_setup.active.project_id, false);

										vm.utils.re_inspect_inspections.downloading_asset = false;

										vm.utils.re_inspect_inspections.slideout.hide();

										vm.utils.re_inspect_inspections.enterDestAsset();

									});

								}, function(error) {
									alert(error);
									vm.utils.re_inspect_inspections.downloading_asset = false;
								});

							}, function(error) {
								alert(error);
								vm.utils.re_inspect_inspections.downloading_asset = false;
							});

						}, function(error) {
							alert(error);
						});
					},
					inspectionLinkedToCore: function(asset) {
						if( !asset ) {
							return false;
						}

						if( !asset.hasOwnProperty('rm_register_asset_id') || !asset.rm_register_asset_id || asset.rm_register_asset_id == '' || asset.rm_register_asset_id == '0' ) {
							return false;
						} else {
							return true;
						}
					}
				},
				convertReInspectionToNew: function() {
					var defer = $q.defer();

					vm.utils.re_inspect_inspections.dest_record;

					projectsAssetsFactory.convertReInspectionToNew(vm.utils.re_inspect_inspections.dest_record).then(function(saved_asset) {

						vm.utils.re_inspect_inspections.dest_record._id = saved_asset._id;
						vm.utils.re_inspect_inspections.dest_record._rev = saved_asset._rev;

						vm.utils.re_inspect_inspections.slideout.hide();

						vm.utils.re_inspect_inspections.enterDestAsset();

						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				exit: function() {

					vm.utils.re_inspect_inspections.relations.dest_project_id = null;
					vm.utils.re_inspect_inspections.relations.dest_asset_id = null;

					vm.utils.re_inspect_inspections.dest_record = null;

					vm.utils.re_inspect_inspections.inspection_details.data = {};

					vm.utils.re_inspect_inspections.inspection_listing.data = null;
					vm.utils.re_inspect_inspections.inspection_listing.visible_data = null;

					vm.utils.re_inspect_inspections.download_inspection.record = null;

					vm.utils.re_inspect_inspections.slideout.hide();
				},
				enterDestAsset: function() {
					projectsAssetsFactory.dbUtils.getAsset(vm.utils.re_inspect_inspections.relations.dest_asset_id).then(function(asset_doc) {

						// SET ACTIVE ASSET AND ENTER
						rmUtilsFactory.projects.setActiveAsset(asset_doc).then(function() {

							if( vm.utils.isSop(asset_doc) ) {
								window.location.replace("../procedure-builder/");
							} else {
								window.location.replace("../checklist-audits/checklist.html");
							}

						}, function(error) {
							console.log("ERROR 2");
							alert(error);
						});

					}).catch(function(error) {
						console.log("ERROR 1");
						alert(error);
					});
				},
				slideout: {
					show: function() {
						var slideoutEl = document.getElementById('ReInspectInspectionsSlideout');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.show();

						// CLEAN UP 
						slideoutEl = null;
						slideoutInst = null;
					}, 
					hide: function() {
						var slideoutEl = document.getElementById('ReInspectInspectionsSlideout');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.hide();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}
				}
			},
			project_download: {
				active_fetch_item: null,
				display_message: null, 
				error_message: null,
				setDisplayMessage: function(active_fetch_item) {
					vm.utils.project_download.display_message = active_fetch_item.status + " " + active_fetch_item.display_name;
				},
				resetDownloadStatuses: function() {
					vm.utils.project_download.active_fetch_item = null;
					vm.utils.project_download.display_message = null;
					vm.utils.project_download.error_message = null;
				},
				downloadProjectData: function(rm_project_id, incomplete_check, download_type) {
					var defer = $q.defer();

					// if( incomplete_check ) {

					// 	if( vm.utils.active_project.hasIncompleteSync(vm.utils.active_project.record) ) {
					// 		alert("Incomplete sync: please re-attempt syncing the project before continuing work");
					// 		return;
					// 	}

					// 	if( vm.utils.active_project.hasIncompleteCleanup(vm.utils.active_project.record) ) {
					// 		alert("Incomplete project removal: this project is locked and can only now be removed");
					// 		return;
					// 	}

					// }

					// vm.utils.setActiveClient(project_record);

					vm.utils.project_download.downloading = true;

					var params = {
						activity_id: rm_project_id,
						asset_id: null, 
						report_id: null
					}

					var required_stages = ['projects','snapshot_assets','tasks','mr_hazards','mr_controls','hazard_control_relations','snapshot_asset_media','task_media','mr_hazard_media','mr_control_media','checklist_instances','checklist_question_records','uaudit_content','assessments','ra_question_relations','ra_control_item_relations','assessment_media','project_contributors'];
					var is_partial = 'No';

					var stages = projectDownloadFactory.download_setup.initStages(required_stages, params);

					fetchUtilsFactory.utils.initNewDownload('project', rm_project_id, 'project', stages, download_type, is_partial).then(function() {
						fetchUtilsFactory.utils.doStartDownload().then(function() {

							var saved_project_id = projectDownloadFactory.download_setup.active.project_id;

							projectDownloadFactory.dbUtils.projects.updateProjectDownloadStatus(projectDownloadFactory.download_setup.active.project_id, false);

							vm.utils.project_download.downloading = false;

							defer.resolve(saved_project_id);

						}, function(error) {
							defer.reject(error);
							vm.utils.project_download.downloading = false;
						});

					}, function(error) {
						defer.reject(error);
						vm.utils.project_download.downloading = false;
					});

					return defer.promise;
				},
				events: function() {
					$scope.$on("projectDownload::status", function(event, data) {
						vm.utils.project_download.active_fetch_item = fetchUtilsFactory.active.stage;
						vm.utils.project_download.setDisplayMessage(vm.utils.project_download.active_fetch_item.record);
					});

					$scope.$on("projectDownload::itemInstalled", function(event, data) {
						vm.utils.project_download.active_fetch_item.record.total_items_installed = data.current_total;
					});
				}()
			},
			pin_requirement: {
				record: null, 
				start: function(record) {
					vm.utils.pin_requirement.record = record;

					vm.utils.pin_requirement.confirmation.show();
				},
				pinRecord: function() {
					var defer = $q.defer();

					ippScoreFactory.dbUtils.ipp_scores.pinRequirement(vm.utils.pin_requirement.record._id).then(function(saved_record) {

						vm.utils.pin_requirement.record._id = saved_record._id;
						vm.utils.pin_requirement.record._rev = saved_record._rev;
						vm.utils.pin_requirement.record.pinned = saved_record.pinned;

						vm.utils.pin_requirement.addRequirementToPinnedList();

						vm.utils.toasts.requirementPinned();

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				addRequirementToPinnedList: function() {
					vm.utils.pp_audits_due_list.pinned_data.push(vm.utils.pin_requirement.record);

					vm.utils.pp_audits_due_list.pinned_data = $filter('orderBy')(vm.utils.pp_audits_due_list.pinned_data, ['effective_next_inspection_date','asset_ref']);
				},
				confirmation: {
					show: function() {
						var slideoutEl = document.getElementById('PinConfirmSlideout');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.show();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}, 
					hide: function() {
						var slideoutEl = document.getElementById('PinConfirmSlideout');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.hide();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}
				}
			},
			unpin_requirement: {
				record: null, 
				start: function(record) {
					vm.utils.unpin_requirement.record = record;

					vm.utils.unpin_requirement.confirmation.show();
				},
				unPinRecord: function() {
					var defer = $q.defer();

					ippScoreFactory.dbUtils.ipp_scores.unPinRequirement(vm.utils.unpin_requirement.record._id).then(function(saved_record) {

						vm.utils.unpin_requirement.record._id = saved_record._id;
						vm.utils.unpin_requirement.record._rev = saved_record._rev;
						vm.utils.unpin_requirement.record.pinned = saved_record.pinned;

						vm.utils.unpin_requirement.removeRequirementFromPinnedList();

						vm.utils.toasts.requirementUnPinned();

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				removeRequirementFromPinnedList: function() {
					var i = 0;
					var len = vm.utils.pp_audits_due_list.pinned_data.length;
					var found_index = null;

					// LOOP THROUGH PINNED AUDITS TO FIND RECORD
					while(i < len) {

						if( vm.utils.pp_audits_due_list.pinned_data[i]._id == vm.utils.unpin_requirement.record._id ) {
							found_index = i;
						}

						i++;
					}

					if( found_index != null ) {
						// REMOVE FROM PINNED DATA ARRAY
						vm.utils.pp_audits_due_list.pinned_data.splice(found_index, 1);
					}
				},
				confirmation: {
					show: function() {
						var slideoutEl = document.getElementById('UnPinConfirmSlideout');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.show();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}, 
					hide: function() {
						var slideoutEl = document.getElementById('UnPinConfirmSlideout');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.hide();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}
				}
			},
			claim_requirement: {
				refreshing: false,
				loading: false,
				record: null,
				setRecord: function(record) {
					vm.utils.claim_requirement.record = record;
				},
				start: function(record) {
					// CLEAR ANY PREVIOUS ERRORS
					vm.utils.claim_requirement.error_handler.clear();

					// IF VIEWING OTHERS AUDITS, NO ACTION
					if( !vm.utils.user_filter.my_allocations ) {
						vm.utils.toasts.noActionOthersAudits();
						return;
					}

					// IF LPA REQUIREMENT, CHECK LICENSES
					if( record.hasOwnProperty('is_lpa') && record.is_lpa == 'Yes' ) {

						if( !vm.utils.feature_licenses.hasLicense('lpa') ) {
							vm.utils.unlicensed_feature.start('lpa');
							return;
						}

					}

					if( !rmConnectivityFactory.online_detection.online ) {
						var message = "You require an internet connection to claim a due audit";
						vm.utils.claim_requirement.error_handler.logError(message);
						return;
					}

					vm.utils.claim_requirement.setRecord(record);

					vm.utils.claim_requirement.refreshing = true;

					vm.utils.claim_requirement.slideout.show();

					// REFRESH IPP RECORD
					vm.utils.pp_audits_due_list.refreshIppRecord(record).then(function(saved_ipp) {

						vm.utils.claim_requirement.refreshing = false;

						if( saved_ipp ) {
							vm.utils.claim_requirement.setRecord(saved_ipp);
						}

					}, function(error) {
						vm.utils.claim_requirement.refreshing = false;
						vm.utils.claim_requirement.error_handler.logError(error);
					});
				},
				close: function() {
					vm.utils.claim_requirement.record = null;
					vm.utils.claim_requirement.slideout.hide();
				},
				confirm: function() {

					if( !rmConnectivityFactory.online_detection.online ) {
						var message = "You require an internet connection to claim a due audit";
						vm.utils.claim_requirement.error_handler.logError(message);
						return;
					}

					vm.utils.claim_requirement.loading = true;

					projectsAssetsFactory.claimRequirement(vm.utils.claim_requirement.record).then(function() {

						vm.utils.claim_requirement.record.user_has_claimed = 'Yes';

						vm.utils.claim_requirement.loading = false;
						vm.utils.claim_requirement.close();

					}, function(error) {
						vm.utils.claim_requirement.error_handler.logError(error);
						vm.utils.claim_requirement.loading = false;
					});
				},
				error_handler: {
					error: false, 
					error_message: null,
					logError: function(message) {
						vm.utils.claim_requirement.error_handler.error = true;
						vm.utils.claim_requirement.error_handler.error_message = message;
					}, 
					clear: function() {
						vm.utils.claim_requirement.error_handler.error = false;
						vm.utils.claim_requirement.error_handler.error_message = null;
					}
				},
				slideout: {
					show: function() {
						var slideoutEl = document.getElementById('ClaimRequirementAside');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.show();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					},
					hide: function() {
						var slideoutEl = document.getElementById('ClaimRequirementAside');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.hide();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}
				}
			},
			unclaim_requirement: {
				refreshing: false,
				loading: false,
				record: null,
				setRecord: function(record) {
					vm.utils.unclaim_requirement.record = record;
				},
				start: function(record) {
					// CLEAR ANY PREVIOUS ERRORS
					vm.utils.unclaim_requirement.error_handler.clear();

					// IF VIEWING OTHERS AUDITS, NO ACTION
					if( !vm.utils.user_filter.my_allocations ) {
						vm.utils.toasts.noActionOthersAudits();
						return;
					}

					vm.utils.unclaim_requirement.setRecord(record);

					if( !rmConnectivityFactory.online_detection.online ) {
						var message = "You require an internet connection to claim an due audit";
						vm.utils.unclaim_requirement.error_handler.logError(message);
						return;
					}

					vm.utils.unclaim_requirement.refreshing = true;

					vm.utils.unclaim_requirement.slideout.show();

					// REFRESH IPP RECORD
					vm.utils.pp_audits_due_list.refreshIppRecord(record).then(function(saved_ipp) {

						vm.utils.unclaim_requirement.refreshing = false;

						if( saved_ipp ) {
							vm.utils.unclaim_requirement.setRecord(saved_ipp);
						}

					}, function(error) {
						vm.utils.unclaim_requirement.refreshing = false;
						vm.utils.unclaim_requirement.error_handler.logError(error);
					});
				},
				close: function() {
					vm.utils.unclaim_requirement.record = null;
					vm.utils.unclaim_requirement.slideout.hide();
				},
				confirm: function() {

					if( !rmConnectivityFactory.online_detection.online ) {
						var message = "You require an internet connection to claim an due audit";
						vm.utils.unclaim_requirement.error_handler.logError(message);
						return;
					}

					vm.utils.unclaim_requirement.loading = true;

					projectsAssetsFactory.unClaimRequirement(vm.utils.unclaim_requirement.record).then(function() {

						vm.utils.unclaim_requirement.record.user_has_claimed = 'No';

						vm.utils.unclaim_requirement.loading = false;
						vm.utils.unclaim_requirement.close();

					}, function(error) {
						vm.utils.unclaim_requirement.error_handler.logError(error);
						vm.utils.unclaim_requirement.loading = false;
					});
				},
				error_handler: {
					error: false, 
					error_message: null,
					logError: function(message) {
						vm.utils.unclaim_requirement.error_handler.error = true;
						vm.utils.unclaim_requirement.error_handler.error_message = message;
					}, 
					clear: function() {
						vm.utils.unclaim_requirement.error_handler.error = false;
						vm.utils.unclaim_requirement.error_handler.error_message = null;
					}
				},
				slideout: {
					show: function() {
						var slideoutEl = document.getElementById('UnClaimRequirementAside');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.show();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					},
					hide: function() {
						var slideoutEl = document.getElementById('UnClaimRequirementAside');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.hide();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}
				}
			},
			toasts: {
				noInternetConnection: function() {
					var toastEl = document.getElementById('NoInternetConnectionToast');
					var toastInst = bootstrap.Toast.getOrCreateInstance(toastEl);
					toastInst.show();

					// CLEAN UP
					toastEl = null;
					toastInst = null;
				},
				myAllocationsOn: function() {
					var toastEl = document.getElementById('MyAllocationsOnToast');
                    var toastInst = bootstrap.Toast.getOrCreateInstance(toastEl);
					toastInst.show();

					// CLEAN UP
					toastEl = null;
					toastInst = null;
				},
				myAllocationsOff: function() {
					var toastEl = document.getElementById('MyAllocationsOffToast');
					var toastInst = bootstrap.Toast.getOrCreateInstance(toastEl);
					toastInst.show();

					// CLEAN UP
					toastEl = null;
					toastInst = null;
				},
				requirementPinned: function() {
					var toastEl = document.getElementById('RequirementPinnedToast');
					var toastInst = bootstrap.Toast.getOrCreateInstance(toastEl);
					toastInst.show();

					// CLEAN UP
					toastEl = null;
					toastInst = null;
				}, 
				requirementUnPinned: function() {
					var toastEl = document.getElementById('RequirementUnPinnedToast');
					var toastInst = bootstrap.Toast.getOrCreateInstance(toastEl);
					toastInst.show();

					// CLEAN UP
					toastEl = null;
					toastInst = null;
				},
				noActionOthersAudits: function() {
					var toastEl = document.getElementById('NoActionOthersAuditsToast');
					var toastInst = bootstrap.Toast.getOrCreateInstance(toastEl);
					toastInst.show();

					// CLEAN UP
					toastEl = null;
					toastInst = null;
				}
			},
			feature_licenses: {
				hasLicense: function(feature_name) {
					return featureLicenseFactory.utils.isFeatureLicensed(feature_name);
				},
				init: function() {
					var defer = $q.defer();

					featureLicenseFactory.setActiveCompanyLicenses().then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			unlicensed_feature: {
				options: {
					feature_name: null, 
					used_free_trial: 'No'
				},
				start: function(feature_name) {
					vm.utils.unlicensed_feature.options.feature_name = feature_name;
					vm.utils.unlicensed_feature.slideout.show();
				},
				slideout: {
					show: function() {
						var slideoutEl = document.getElementById('UnlicensedFeatureSlideout');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.show();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					},
					hide: function() {
						var slideoutEl = document.getElementById('UnlicensedFeatureSlideout');
						var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(slideoutEl);
						slideoutInst.hide();

						// CLEAN UP
						slideoutEl = null;
						slideoutInst = null;
					}
				},
				events: function() {

					$scope.$on("unlicensedFeature::close", function(event, data) {
						vm.utils.unlicensed_feature.slideout.hide();
					});

				}()
			},
			page_init: {
				loading: false,
				start: function() {
					var fetch_defer = $q.defer();

					// GET CURRENT DATE VALUES
					vm.utils.date_picker.current.calcCurrent();

					// APPLY THIS WEEK DATE FILTER
					vm.utils.date_picker.defaults.thisWeek();
					vm.utils.date_picker.selection_type = 'This week';
					vm.utils.date_picker.filter_active = true;

					// DEACTIVATE TABBED FILTERS
					vm.utils.tabbed_filters.deactivate();

					vm.utils.page_init.startLoading();

					var stages = ['active_records','feature_licenses','sites','listing'];

					fetchNextStage(fetch_defer, 0).then(function() {

						vm.utils.core.latestSiteFetchRecords();

						vm.utils.ipp_filter.fetchProfilePoints();

						vm.utils.page_init.stopLoading();

					}, function(error) {
						vm.utils.page_init.stopLoading();
						console.log("ERROR INITIALISING PAGE");
					});

					function fetchNextStage(defer, active_index) {

						if( active_index > stages.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						if( stages[active_index] == 'active_records' ) {

							rmUtilsFactory.projects.retrieveActiveRecords().then(function(active_records) {

								// IF ACTIVE PROJECT
								if( active_records.hasOwnProperty('project') && active_records.project != null ) {		
										
									// REMOVE SINGLE INSPECTION PROJECT AS ACTIVE
									rmUtilsFactory.projects.deleteActiveProjectOnly().then(function(new_active_records) {

										console.log("DELETED ACTIVE PROJECT");

										active_index++;
										fetchNextStage(defer, active_index);

									}, function(error) {
										alert(error);
									});

								} else {
									active_index++;
									fetchNextStage(defer, active_index);
								}
								
							}, function(error) {
								defer.reject(error);
							});

							rmUtilsFactory.projects.retrieveActiveRecords().then(function(active_records) {
								
								active_index++;
								fetchNextStage(defer, active_index);
								
							}, function(error) {
								defer.reject(error);
							});

						}

						if( stages[active_index] == 'feature_licenses' ) {

							vm.utils.feature_licenses.init().then(function() {

								active_index++;
								fetchNextStage(defer, active_index);

							}, function(error) {
								defer.reject(error);
							});

						}

						if( stages[active_index] == 'sites' ) {

							vm.utils.place_filters.site.refresh().then(function() {

								active_index++;
								fetchNextStage(defer, active_index);

							}, function(error) {
								defer.reject(error);
							});

						}

						if( stages[active_index] == 'listing' ) {

							vm.utils.pp_audits_due_list.getData().then(function() {

								active_index++;
								fetchNextStage(defer, active_index);

							}, function(error) {
								defer.reject(error);
							});

						}

						return defer.promise;
					}
				},
				startLoading: function() {
					vm.utils.page_init.loading = true;

					vm.utils.page_init.modal.show();
				},
				stopLoading: function() {
					setTimeout(function() {
						vm.utils.page_init.loading = false;
						
						vm.utils.page_init.modal.hide();
					}, 1000);
				},
				modal: {
					show: function() {
						var modalEl = document.getElementById('PageInitModal');
						var modalInst = bootstrap.Modal.getOrCreateInstance(modalEl);
						modalInst.show();

						// CLEAN UP
						modalEl = null;
						modalInst = null;
					},
					hide: function() {
						var modalEl = document.getElementById('PageInitModal');
						var modalInst = bootstrap.Modal.getOrCreateInstance(modalEl);
						modalInst.hide();

						// CLEAN UP
						modalEl = null;
						modalInst = null;
					}
				}
			}
		};

		$(document).ready(function() {
			vm.utils.page_init.start();
		});

	}

	function ippScoreController($scope, $rootScope, $q, riskmachDatabasesFactory, authFactory, rmUtilsFactory, ippScoreFactory, modelsFactory) 
	{
		var vm = this;

		vm.utils = {
			ipp_score_form: {
				record_id: vm.record_id,
				record_type: vm.record_type,
				options: vm.options,
				compliance_profile: {
					profile_point_ref: vm.profile_point_ref, 
					record: null
				},
				record: null,
				ipp_score: null,
				profile_points: [],
				is_loading: false, 
				asset_sizes: rmUtilsFactory.utils.asset_sizes,
				active_profile: authFactory.active_profile,
				init: function() {
					vm.utils.ipp_score_form.is_loading = true;

					if( vm.utils.ipp_score_form.record_id == null ) {
						return;
					}

					vm.utils.ipp_score_form.getAssetRecord().then(function() {

						vm.utils.ipp_score_form.getCompanyProfilePoints().then(function() {

							vm.utils.ipp_score_form.updateDisplayedIppScore().then(function() {
								vm.utils.ipp_score_form.is_loading = false;
							}, function(error) {
								vm.utils.ipp_score_form.is_loading = false;
								alert(error);
							});

						}, function(error) {
							vm.utils.ipp_score_form.is_loading = false;
							alert(error);
						});

					}, function(error) {
						vm.utils.ipp_score_form.is_loading = false;
						alert(error);
					});
				},
				getCompanyProfilePoints: function() {
					var defer = $q.defer();

					rmUtilsFactory.dbUtils.profile_points.getProfilePoints().then(function(profile_points) {
						
						console.log( JSON.stringify(profile_points, null, 2) );

						vm.utils.ipp_score_form.profile_points = profile_points;
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				getComplianceProfile: function() {
					var defer = $q.defer();

					rmUtilsFactory.dbUtils.profile_points.getProfilePoint(vm.utils.ipp_score_form.compliance_profile.profile_point_ref).then(function(profile_point) {
						vm.utils.ipp_score_form.compliance_profile.record = profile_point;
						
						defer.resolve();

					}, function(error) {
						alert("Error fetching active compliance profile");
					});

					return defer.promise;
				},
				getAssetRecord: function() {
					var defer = $q.defer();

					var asset_id = vm.utils.ipp_score_form.record_id;

					console.log(asset_id);


					riskmachDatabasesFactory.databases.collection.register_assets.get(asset_id).then(function(asset_record) {
						if( !asset_record ) {
							alert("Couldn't find the asset record");
							return;
						};

						vm.utils.ipp_score_form.record = asset_record;

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				getIppScoreRecord: function() {
					var defer = $q.defer();

					ippScoreFactory.dbUtils.ipp_scores.getIppScoreRecord(vm.utils.ipp_score_form.record._id, vm.utils.ipp_score_form.compliance_profile.profile_point_ref).then(function(ipp_score) {

						if( ipp_score == null ) {
							vm.utils.ipp_score_form.ipp_score = modelsFactory.models.newIppScore(vm.utils.ipp_score_form.record._id, vm.utils.ipp_score_form.compliance_profile.record);
							vm.utils.ipp_score_form.ipp_score.rm_asset_id = vm.utils.ipp_score_form.record.rm_id;
						} else {
							vm.utils.ipp_score_form.ipp_score = ipp_score;
						};

						vm.utils.ipp_score_form.matrix_initial.populateValues();

						if( vm.utils.ipp_score_form.matrix_initial.score_data.y == 1 || vm.utils.ipp_score_form.matrix_initial.score_data.y == 2 ) {
			                vm.utils.ipp_score_form.score_acknowledged = false;
			            } else {
			                vm.utils.ipp_score_form.score_acknowledged = true;
			            };

						defer.resolve();

					}, function(error) {
						alert(error);
					});

					return defer.promise;
				},
				updateDisplayedIppScore: function() {
					var defer = $q.defer();

					vm.utils.ipp_score_form.getComplianceProfile().then(function() {

						vm.utils.ipp_score_form.getIppScoreRecord().then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error)
					});

					return defer.promise;
				},
				updateIppScoreValues: function() {
					if( vm.utils.ipp_score_form.ipp_score.matrix_consequence_initial == 1 || vm.utils.ipp_score_form.ipp_score.matrix_consequence_initial == 2 ) {
		                vm.utils.ipp_score_form.ipp_score.excluded_from_inspection = 'Yes';
		                vm.utils.ipp_score_form.ipp_score.deterioration_risk = 'No';
		            };

					if( vm.utils.ipp_score_form.ipp_score.agent_asset_size != null && vm.utils.ipp_score_form.ipp_score.agent_asset_size != '' ) {
		        		
		        		var agent_asset_size = parseInt( vm.utils.ipp_score_form.ipp_score.agent_asset_size );

		        		vm.utils.ipp_score_form.ipp_score.agent_asset_size = agent_asset_size;
		            };

		            vm.utils.ipp_score_form.ipp_score.agent_inspection_time = vm.utils.ipp_score_form.setAgentEstInspectionTime();
				},
				save: function() {
					var defer = $q.defer();

					vm.utils.ipp_score_form.updateIppScoreValues();

					ippScoreFactory.dbUtils.ipp_scores.saveIppScore(vm.utils.ipp_score_form.ipp_score).then(function(saved_record) {

						vm.utils.ipp_score_form.ipp_score._id = saved_record._id;
						vm.utils.ipp_score_form.ipp_score._rev = saved_record._rev;

						var data = {
							_id: saved_record._id,
							_rev: saved_record._rev,
							consequence: vm.utils.ipp_score_form.ipp_score.matrix_consequence_initial,
							consequence_phrase: vm.utils.ipp_score_form.ipp_score.matrix_consequence_phrase_initial,
							likelihood: vm.utils.ipp_score_form.ipp_score.matrix_likelihood_initial,
							likelihood_phrase: vm.utils.ipp_score_form.ipp_score.matrix_likelihood_phrase_initial,
							score: vm.utils.ipp_score_form.ipp_score.matrix_score_initial,
							score_phrase: vm.utils.ipp_score_form.ipp_score.matrix_score_phrase_initial, 
							excluded_from_inspection: vm.utils.ipp_score_form.ipp_score.excluded_from_inspection,
							deterioration_risk: vm.utils.ipp_score_form.ipp_score.deterioration_risk,
							pipp_notes: vm.utils.ipp_score_form.ipp_score.pipp_notes, 
							agent_asset_size: vm.utils.ipp_score_form.ipp_score.agent_asset_size,
							agent_inspection_time: vm.utils.ipp_score_form.ipp_score.agent_inspection_time
						};

						$rootScope.$broadcast("ippScoreForm::saved", data);

						vm.utils.ipp_score_form.exit();

					}, function(error) {
						alert(error);
						defer.reject(error);
					});

					return defer.promise;
				},
				exit: function() {
					$rootScope.$broadcast("ippScoreForm::exit");
				},
				setAgentEstInspectionTime: function() {
					var inspection_time = null;

					console.log( JSON.stringify(vm.utils.ipp_score_form.asset_sizes, null, 2) );
					console.log( vm.utils.ipp_score_form.ipp_score.agent_asset_size );

					// IF CUSTOM SIZE, RETURN CUSTOM SET TIME
					if( vm.utils.ipp_score_form.ipp_score.agent_asset_size == 5 ) {
						return vm.utils.ipp_score_form.ipp_score.agent_inspection_time;
					}

		        	angular.forEach(vm.utils.ipp_score_form.asset_sizes, function(record, index) {
		        		if( record._id == vm.utils.ipp_score_form.ipp_score.agent_asset_size ) {
		        			inspection_time = record.inspection_time;
		        		};
		        	});

		            return inspection_time;
				},
				acknowledgeScore: function() {
					vm.utils.ipp_score_form.score_acknowledged = true;
				},
				ippScoreValid: function() {
					var valid = true;

					if( !vm.utils.ipp_score_form.ipp_score ) {
						return false;
					}

		            var errors = 0;

		            if( !vm.utils.ipp_score_form.score_acknowledged ) {
		                errors++;
		            };

		            if( vm.utils.ipp_score_form.ipp_score.matrix_score_initial == null ) {
		                errors++;
		            };

		            if( errors > 0 ) {
		                valid = false;
		            };

		            // console.log( vm.utils.ipp_score_form.ipp_score, null, 2 );
		 
		            return valid;
				},
				canChangeComplianceProfile: function() {

					if( vm.utils.ipp_score_form.options.hasOwnProperty('change_compliance') && vm.utils.ipp_score_form.options.change_compliance ) {
						return true;
					} else {
						return false;
					}

				},
				matrix_initial: {
					directive_id: 'IppScoreMatrixInitial',
					coord: {
						x: null,
						y: null
					},
					score_data: null,
					populateValues: function(){
						var coord = {
							x: vm.utils.ipp_score_form.ipp_score.matrix_likelihood_initial,
							y: vm.utils.ipp_score_form.ipp_score.matrix_consequence_initial
						};

						vm.utils.ipp_score_form.matrix_initial.coord = coord;

						var data_set = {
							y: vm.utils.ipp_score_form.ipp_score.matrix_consequence_initial,
							y_label: vm.utils.ipp_score_form.ipp_score.matrix_consequence_phrase_initial,
							x: vm.utils.ipp_score_form.ipp_score.matrix_likelihood_initial,
							x_label: vm.utils.ipp_score_form.ipp_score.matrix_likelihood_phrase_initial,
							score: vm.utils.ipp_score_form.ipp_score.matrix_score_initial,
							score_label: vm.utils.ipp_score_form.ipp_score.matrix_score_phrase_initial
						};

						vm.utils.ipp_score_form.matrix_initial.score_data = data_set;
					},
					events: function(){

						$scope.$on("riskGrid::selected", function(event, data){

							if( data.directive_id != vm.utils.ipp_score_form.matrix_initial.directive_id )
							{
								return;
							};

							if( data.data_set.y == 1 || data.data_set.y == 2 ) {
				                vm.utils.ipp_score_form.score_acknowledged = false;
				            } else {
				                vm.utils.ipp_score_form.score_acknowledged = true;
				            };

							vm.utils.ipp_score_form.matrix_initial.score_data = data.data_set;
							vm.utils.ipp_score_form.ipp_score.matrix_consequence_initial = data.data_set.y;
							vm.utils.ipp_score_form.ipp_score.matrix_consequence_phrase_initial = data.data_set.y_label;
							vm.utils.ipp_score_form.ipp_score.matrix_likelihood_initial = data.data_set.x;
							vm.utils.ipp_score_form.ipp_score.matrix_likelihood_phrase_initial = data.data_set.x_label;
							vm.utils.ipp_score_form.ipp_score.matrix_score_initial = data.data_set.score;
							vm.utils.ipp_score_form.ipp_score.matrix_score_phrase_initial = data.data_set.score_label;

							vm.utils.ipp_score_form.matrix_initial.populateValues();

						});

					}()
				},
				events: function() {
					$scope.$watch('vm.record_id', function(newVal, oldVal) {
						vm.utils.ipp_score_form.record_id = vm.record_id;

						vm.utils.ipp_score_form.init();
					});

					$scope.$watch('vm.profile_point_ref', function(newVal, oldVal) {
						vm.utils.ipp_score_form.compliance_profile.profile_point_ref = vm.profile_point_ref;
					});

					$scope.$watchCollection('vm.options', function(newVal, oldVal) {



						vm.utils.ipp_score_form.options = vm.options;
					});
				}()
			}
		}
	}

	function ippScoreFactory($q, $http, riskmachDatabasesFactory, authFactory, rmUtilsFactory, modelsFactory) 
	{
		var factory = {};

		factory.utils = {
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
            filterRequiredAudits: function(records) {
            	var required_audits = [];

            	if( !records || !records.length ) {
            		return required_audits;
            	}

           		var i = 0;
           		var len = records.length;

           		while(i < len) {

           			if( factory.utils.isRequiredAudit(records[i]) ) {
           				required_audits.push(records[i]);
           			}

           			i++;
           		}

            	return required_audits;
            },
            isRequiredAudit: function(record) {
            	var is_required = true;
            	var errors = 0;

            	// IPP RECORD NOT LIVE
       			if( !record.hasOwnProperty('status') || record.status != 1 ) {
       				errors++;
       			}

       			// IF NOT LPA
       			if( !record.hasOwnProperty('is_lpa') || record.is_lpa != 'Yes' ) {

       				// EXCLUDED FROM INSPECTION
	       			if( record.hasOwnProperty('excluded_from_inspection') && record.excluded_from_inspection == 'Yes' ) {
	       				errors++;
	       			}

	       			// FILTER OUT DELETED AND ARCHIVED ASSETS
					if( record.hasOwnProperty('asset_status') && (record.asset_status == 2 || record.asset_status == 3) ) {
						errors++;
					}

					// FILTER OUT ASSETS THAT ARE NOT IN USE
					if( record.hasOwnProperty('asset_in_use') && record.asset_in_use != 'Yes' ) {
						errors++;
					}

       			}

				// LPA FILTERS ONLY APPLY IF LPA
				if( record.hasOwnProperty('is_lpa') && record.is_lpa == 'Yes' ) {

					// FILTER OUT LPA NOT AVAILABLE
					if( record.hasOwnProperty('lpa_available') && record.lpa_available != 'Yes' ) {
						errors++;
					}

					// FILTER OUT LPA GROUP COMPLETE
					if( record.hasOwnProperty('lpa_group_complete') && record.lpa_group_complete == 'Yes' ) {
						errors++;
					}

				}

				// FILTER OUT LOCAL IPP RECORDS
				if( !record.hasOwnProperty('rm_pp_asset_relation_id') || !record.rm_pp_asset_relation_id ) {
					errors++;
				}

				// FILTER OUT MANAGED RISK FOR NOW
				if( record.hasOwnProperty('rm_profile_point_ref') && record.rm_profile_point_ref == 10 ) {
					errors++;
				}

       			// INSPECTION NOT REQUIRED
       			// if( record.hasOwnProperty('inspection_required') && record.inspection_required == 'No' ) {
       			// 	errors++;
       			// }

       			// HAS BEEN INSPECTED AND NO RISK DUE TO DETERIORATION 
       			// (RE-INSPECTION THEREFORE NOT REQUIRED)
       			// if( record.hasOwnProperty('deterioration_risk') && record.deterioration_risk == 'No' && record.hasOwnProperty('ever_inspected') && record.ever_inspected == 'Yes' ) {
       			// 	errors++;
       			// }

            	if( errors > 0 ) {
            		is_required = false;
            	}

            	return is_required;
            }
		}

		factory.dbUtils = {
			ipp_scores: {
				getIppScoreRecord: function(asset_id, profile_point_ref) {
					var defer = $q.defer();

					riskmachDatabasesFactory.databases.collection.register_asset_ipp.find({
						selector: {
							table: 'register_asset_ipp',
							company_id: authFactory.getActiveCompanyId(),
							user_id: authFactory.cloudUserId(), 
							asset_id: asset_id,
							rm_profile_point_ref: profile_point_ref
						},
						limit: 1
					}).then(function(results){

						if( results.docs.length == 0 ) {
							defer.resolve(null);
						} else {
							defer.resolve(results.docs[0]);
						};

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				saveIppScore: function(doc){
					var defer = $q.defer();

					var options = {
						force: true
					};

					rmUtilsFactory.sync_decoration.ipp_scores.ippScoreModified(doc).then(function(modified_doc) {

						doc = modified_doc;

						riskmachDatabasesFactory.databases.collection.register_asset_ipp.post(doc, options).then(function(ipp_result) {

							doc._id = ipp_result.id;
							doc._rev = ipp_result.rev;

							console.log("IPP SCORE SAVED");

							defer.resolve(doc);

						}).catch(function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				getProfilePointIppScoresMangoQry: function(profile_ref) {
					var defer = $q.defer();
							
					riskmachDatabasesFactory.databases.collection.register_asset_ipp.find({
						selector: {
							table: 'register_asset_ipp',
							user_id: authFactory.cloudUserId(),
							company_id: authFactory.getActiveCompanyId(),
							rm_profile_point_ref: profile_ref
						}
					}).then(function(results){

						defer.resolve(results.docs);

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getProfilePointIppScores: function(profile_ref, asset_ids) {
					var defer = $q.defer();

					if( angular.isUndefined(asset_ids) || !asset_ids ) {
						
						factory.dbUtils.ipp_scores.getProfilePointIppScoresMangoQry(profile_ref).then(function(data) {
							defer.resolve(data);
						}, function(error) {
							defer.reject(error);
						});

					} else {

						factory.dbUtils.ipp_scores.getProfilePointIppScoresPaginated(profile_ref, asset_ids).then(function(data) {
							defer.resolve(data);
						}, function(error) {
							defer.reject(error);
						});

					}

					return defer.promise;
				},
				getProfilePointIppScoresPaginated: function(profile_ref, asset_ids) {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.register_asset_ipp;

					var options = {
						limit: 500, 
						include_docs: true
					};

					var ipp_scores = [];

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve(ipp_scores);
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

									if( !result.rows[i].doc.hasOwnProperty('table') || result.rows[i].doc.table != 'register_asset_ipp' ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('company_id') || result.rows[i].doc.company_id != authFactory.getActiveCompanyId() ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('rm_profile_point_ref') || result.rows[i].doc.rm_profile_point_ref != profile_ref ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('asset_id') || asset_ids.indexOf(result.rows[i].doc.asset_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {
										ipp_scores.push(result.rows[i].doc);
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
				getPPAuditsDue: function() {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.register_asset_ipp;

					db.find({
						selector: {
							table: 'register_asset_ipp',
							user_id: authFactory.cloudUserId(),
							company_id: authFactory.getActiveCompanyId()
						}
					}).then(function(result) {

						var requirements = factory.utils.filterRequiredAudits(result.docs);

						console.log("FETCHED PP AUDITS DUE");
						console.log(requirements);

						defer.resolve(requirements);

					}).catch(function(error) {
						console.log("ERROR FETCHING PP AUDITS DUE");
						defer.reject(error);
					});

					return defer.promise;
				},
				getPPAuditsDuePaginated: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.register_asset_ipp;

					var options = {
						limit: 500, 
						include_docs: true
					};

					var ipp_scores = [];

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve(ipp_scores);
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

									if( !result.rows[i].doc.hasOwnProperty('table') || result.rows[i].doc.table != 'register_asset_ipp' ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('company_id') || result.rows[i].doc.company_id != authFactory.getActiveCompanyId() ) {
										errors++;
									}

									if( !factory.utils.isRequiredAudit(result.rows[i].doc) ) {
										errors++;
									}

									if( errors == 0 ) {
										ipp_scores.push(result.rows[i].doc);
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
				pinRequirement: function(ipp_record_id) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.register_asset_ipp;

					db.get(ipp_record_id).then(function(doc) {

						doc.pinned = 'Yes';

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
				unPinRequirement: function(ipp_record_id) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.register_asset_ipp;

					db.get(ipp_record_id).then(function(doc) {

						doc.pinned = null;

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
				}
			}
		}

		return factory;
	}

	function ippScoreForm() 
	{
		var directive = {};

		directive.scope = {
			record_id: '=recordid',
			record_type: '=recordtype',
			profile_point_ref: '=profilepointref',
			options: '='
		};

		directive.restrict = 'A';
		directive.controller = 'ippScoreController'; 
		directive.controllerAs = 'vm';
		directive.bindToController = true;
		directive.templateUrl = '../rm-utils/ipp-score/tpl/ipp_score_form.html';

		return directive;
	}

	function ppAuditsDueList() 
	{
		var directive = {};

		directive.scope = {};

		directive.restrict = 'A';
		directive.controller = 'ppAuditsDueListController';
		directive.controllerAs = 'vm';
		directive.bindToController = true;
		directive.templateUrl = '../rm-utils/ipp-score/tpl/pp_audits_due.html';

		return directive;
	}
 
}())