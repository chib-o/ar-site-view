(function() {
	var app = angular.module('riskmachFetchUtils', ['riskmachDatabases','riskmachUtils','riskmachModels','riskmachCoreDownload','riskmachProjectDownload','riskmachBlueprintChecklists']);
	app.factory('fetchUtilsFactory', fetchUtilsFactory);

	function fetchUtilsFactory($q, $http, $timeout, $rootScope, $filter, riskmachDatabasesFactory, authFactory, modelsFactory, coreDownloadFactory, projectDownloadFactory, checklistBlueprintFactory, rmUtilsFactory) 
	{
		var factory = {};

		factory.active = {
			fetch_id: null, 
			stage: {
				record: null, 
				index: null
			}, 
			status: null, 
			fetch_items: []
		}

		factory.utils = {
			save_timeout: 0,
			// api_base: '../../laravel/public/webapp/',
			api_base: 'https://system.riskmach.co.uk/laravel/public/webapp/',
			available_stages: {
				register_sites: {
					record_type: 'sites',
					display_name: 'Sites',
					endpoint: 'RegisterSites',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3,
					params: null
				},
				register_buildings: {
					record_type: 'buildings',
					display_name: 'Buildings', 
					endpoint: 'RegisterBuildings',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3
				},
				register_areas: {
					record_type: 'areas',
					display_name: 'Areas',
					endpoint: 'RegisterAreas',
					endpoint_version: 'v1', 
					pagination: 'yes',
					attempt_limit: 3
				},
				register_assets: {
					record_type: 'register_assets',
					display_name: 'Assets',
					endpoint: 'RegisterAssets',
					endpoint_version: 'v1', 
					pagination: 'yes',
					attempt_limit: 3
				},
				register_tasks: {
					record_type: 'register_tasks',
					display_name: 'Tasks',
					endpoint: 'RegisterTasks',
					endpoint_version: 'v1', 
					pagination: 'yes',
					attempt_limit: 3
				},
				register_asset_ipp: {
					record_type: 'register_asset_ipp',
					display_name: 'Compliance scores',
					endpoint: 'RegisterAssetProfilePoints',
					endpoint_version: 'v1', 
					pagination: 'yes',
					attempt_limit: 3
				},
				qr_register: {
					record_type: 'qr_register',
					display_name: 'QR codes',
					endpoint: 'UsedQRCodes',
					endpoint_version: 'v1', 
					pagination: 'yes',
					attempt_limit: 3
				},
				mr_meta: {
					record_type: 'mr_meta',
					display_name: 'Managed Risks',
					endpoint: 'ManagedRiskSubjectsOverlay',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3,
					params: null
				},
				register_media_records: {
					record_type: 'register_media_records',
					display_name: 'Media',
					endpoint: 'AssetMediaRecords', 
					endpoint_version: 'v1', 
					pagination: 'yes',
					attempt_limit: 3
				},
				projects: {
					record_type: 'projects',
					display_name: 'Projects',
					endpoint: 'Projects',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3
				},
				snapshot_assets: {
					record_type: 'snapshot_assets',
					display_name: 'Inspections',
					endpoint: 'ProjectAssets',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3
				},
				tasks: {
					record_type: 'tasks',
					display_name: 'Tasks',
					endpoint: 'ProjectTasks',
					endpoint_version: 'v1', 
					pagination: 'yes',
					attempt_limit: 3
				},
				mr_hazards: {
					record_type: 'mr_hazards',
					display_name: 'Hazards',
					endpoint: 'ProjectHazards',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3
				},
				mr_controls: {
					record_type: 'mr_controls',
					display_name: 'Control items',
					endpoint: 'ProjectControlItems',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3
				},
				hazard_control_relations: {
					record_type: 'hazard_control_relations',
					display_name: 'Hazard-Control links',
					endpoint: 'ProjectHazardControlItemRelations',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3
				},
				snapshot_asset_media: {
					record_type: 'media',
					display_name: 'Inspection Media',
					endpoint: 'ProjectMediaRecords',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3
				},
				task_media: {
					record_type: 'media',
					display_name: 'Task Media',
					endpoint: 'ProjectMediaRecords',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3
				},
				mr_hazard_media: {
					record_type: 'media',
					display_name: 'Hazard Media',
					endpoint: 'ProjectMediaRecords',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3
				},
				mr_control_media: {
					record_type: 'media',
					display_name: 'Control Media',
					endpoint: 'ProjectMediaRecords',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3
				},
				checklist_instances: {
					record_type: 'checklist_instances',
					display_name: 'Checklists',
					endpoint: 'ProjectChecklists',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3
				},
				checklist_question_records: {
					record_type: 'checklist_question_records',
					display_name: 'Checklist Questions',
					endpoint: 'ProjectChecklistQuestionRecords',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3
				},
				uaudit_content: {
					record_type: 'uaudit_content',
					display_name: 'U Audit content',
					endpoint: 'ChecklistInstanceUAuditData',
					endpoint_version: 'v1',
					pagination: 'no',
					bespoke_fetch: 'yes',
					request_num: 1,
					attempt_limit: 3
				},
				assessments: {
					record_type: 'assessments',
					display_name: 'Risk Assessments',
					endpoint: 'ProjectAssessments',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3
				},
				ra_question_relations: {
					record_type: 'ra_question_relations',
					display_name: 'Question-Risk Assessment links',
					endpoint: 'ProjectChecklistAssessmentRelations',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3
				},
				control_items: {
					record_type: 'control_items',
					display_name: 'Control Items',
					endpoint: 'ProjectControlItems',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3
				},
				ra_control_item_relations: {
					record_type: 'ra_control_item_relations',
					display_name: 'Risk Assessment-Control Item links',
					endpoint: 'ProjectAssessmentControlItemRelations',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3
				},
				assessment_media: {
					record_type: 'media',
					display_name: 'Risk Assessment Media',
					endpoint: 'ProjectAssessmentMediaRecords',
					endpoint_version: 'v1', 
					pagination: 'yes', 
					attempt_limit: 3
				},
				qc_check_records: {
					record_type: 'qc_check_records',
					display_name: 'Quality check data',
					endpoint: 'GetShowLatestReportReview',
					endpoint_version: 'v1',
					pagination: 'no',
					attempt_limit: 3
				},
				project_contributors: {
					record_type: 'project_contributors',
					display_name: 'Project Contributors', 
					endpoint: 'RasicRoles', 
					endpoint_version: 'v1',
					pagination: 'no', 
					attempt_limit: 3
				}
			},
			core_sequence: {
				'register_sites': 1,
				'register_buildings': 2,
				'register_areas': 3,
				'register_assets': 4,
				'register_tasks': 5, 
				'register_media_records': 6,
				'register_asset_ipp': 7,
				'mr_meta': 8,
				'qr_register': 9
			},
			project_sequence: {
				'projects': 1,
				'snapshot_assets': 2,
				'checklist_instances': 3, 
				'checklist_question_records': 4, 
				'uaudit_content': 5,
				'assessments': 6,
				'tasks': 7, 
				'mr_hazards': 8, 
				'mr_controls': 9, 
				'control_items': 10, 
				'ra_question_relations': 11, 
				'ra_control_item_relations': 12,
				'hazard_control_relations': 13,
				'qc_check_records': 14,
				'project_contributors': 15,
				'snapshot_asset_media': 16,
				'assessment_media': 17,
				'task_media': 18,
				'mr_hazard_media': 19,
				'mr_control_media': 20
			},
			apiEndpoint: function(stage) {
				var endpoint = factory.utils.api_base + factory.utils.available_stages[stage].endpoint_version + '/' + factory.utils.available_stages[stage].endpoint;
				console.log( endpoint );
				return endpoint;
			}, 
			attemptLimit: function(stage) {
				var attempt_limit = factory.utils.available_stages[stage].attempt_limit;
				if( angular.isUndefined(attempt_limit) || attempt_limit == null ) {
					attempt_limit = 3;
				};
				return attempt_limit;
			},
			initNewFetch: function(type, record_id, record_type, stages, download_type, is_partial) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				console.log( factory.active.fetch_id );

				factory.dbUtils.saveNewFetchRecord(type, record_id, record_type, download_type, is_partial).then(function(fetch_record) {

					factory.active.fetch_id = fetch_record._id;
					factory.active.status = fetch_record.status;
					factory.active.fetch_type = type;

					var active_index = 0;

					saveFetchItem(save_defer, stages[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveFetchItem(defer, stage) {

						factory.dbUtils.saveNewFetchItem(stage, fetch_record._id, type).then(function() {

							active_index++;

							// SAVED ALL STAGES
							if( active_index > stages.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							saveFetchItem(defer, stages[active_index]);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

				}, function(error) {
					defer.reject("Error creating download record");
				});

				return defer.promise;
			},
			initNewDownloadV1: function(fetch_type, fetch_record_id, fetch_record_type, required_stages, download_type) {
				var defer = $q.defer();

				var user_id = authFactory.cloudUserId();
				var company_id = authFactory.cloudCompanyId();

				if( fetch_type == 'core' ) {
					company_id = authFactory.getActiveCompanyId();
				};

				factory.dbFetch.latestFetchRecord(company_id, user_id, fetch_type, fetch_record_id, fetch_record_type, download_type).then(function(fetch_record) {

					console.log( JSON.stringify(fetch_record, null, 2) );

					// IF THERE WAS AN EXISTING FETCH, ABORT OLD BEFORE START NEW
					if( fetch_record != null ) {
						factory.dbUtils.markFetchNotLatest(fetch_record).then(function() {
							factory.utils.initNewFetch(fetch_type, fetch_record_id, fetch_record_type, required_stages, download_type).then(function() {
								defer.resolve();
							}, function(error) {
								defer.reject(error);
							});
						}, function(error) {
							defer.reject(error);
						});
					} else {
						factory.utils.initNewFetch(fetch_type, fetch_record_id, fetch_record_type, required_stages, download_type).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});
					};

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}, 
			initNewDownload: function(fetch_type, fetch_record_id, fetch_record_type, required_stages, download_type, is_partial) {
				var defer = $q.defer();

				var user_id = authFactory.cloudUserId();
				var company_id = authFactory.cloudCompanyId();

				if( fetch_type == 'core' ) {
					company_id = authFactory.getActiveCompanyId();
				};

				factory.dbUtils.markOldFetchRecordsNotLatest(fetch_type, fetch_record_type, fetch_record_id, download_type).then(function() {

					factory.utils.initNewFetch(fetch_type, fetch_record_id, fetch_record_type, required_stages, download_type, is_partial).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}, 
			doStartDownload: function() {
				var defer = $q.defer();

				factory.utils.setActiveFetch().then(function(fetch_record) {

					factory.utils.doStartCollectData(fetch_record).then(function() {

						factory.utils.doStartRunPreInstallChecks(fetch_record).then(function() {

							factory.utils.doStartInstall(fetch_record).then(function() {
								
								factory.utils.doStartRunUpdates(fetch_record).then(function() {
									// FETCH FINISHED, CLEAR ACTIVE FETCH
									factory.utils.resetActiveFetch();

									defer.resolve();

								}, function(error) {
									// RUN UPDATES ERRORED, CLEAR ACTIVE FETCH
									factory.utils.resetActiveFetch();
									defer.reject(error);
								});

							}, function(error) {
								// INSTALL ERRORED, CLEAR ACTIVE FETCH
								factory.utils.resetActiveFetch();
								defer.reject(error);
							});

						}, function(error) {
							// RUN PRE INSTALL CHECKS ERRORED
							factory.utils.resetActiveFetch();
							defer.reject(error);
						});

					}, function(error) {
						// FETCH ERRORED, CLEAR ACTIVE FETCH
						factory.utils.resetActiveFetch();
						defer.reject(error);
					});

				}, function(error) {
					// FETCH ERRORED, CLEAR ACTIVE FETCH
					factory.utils.resetActiveFetch();
					defer.reject(error);
				});

				return defer.promise;
			}, 
			setActiveFetch: function() {
				var defer = $q.defer();

				factory.dbFetch.fetchRecord(factory.active.fetch_id).then(function(fetch_record) {

					factory.active.status = fetch_record.status;
					factory.active.fetch_type = fetch_record.fetch_type;

					if( fetch_record.hasOwnProperty('download_type') ) {

						if( fetch_record.fetch_type == 'project' ) {
							projectDownloadFactory.download_setup.active.download_type = fetch_record.download_type;
						}

					}

					if( fetch_record.hasOwnProperty('fetch_record_id') && fetch_record.hasOwnProperty('fetch_record_type') && fetch_record.fetch_record_id && fetch_record.fetch_record_type ) {

						if( fetch_record.fetch_record_type == 'site' ) {
							coreDownloadFactory.download_setup.active.rm_site_id = fetch_record.fetch_record_id;
						}

					}

					factory.dbFetch.fetchItems(factory.active.fetch_id).then(function(fetch_items) {

						factory.active.fetch_items = fetch_items;

						defer.resolve(fetch_record);

					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			doStartCollectData: function(fetch_record) {
				var defer = $q.defer();
				var collect_defer = $q.defer();

				factory.collect.nextFetchItem(collect_defer, fetch_record).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			doStartRunPreInstallChecks: function(fetch_record) {
				var defer = $q.defer();
				var checks_defer = $q.defer();

				// RESET ACTIVE STAGE INDEX
				factory.active.stage.index = null;

				factory.pre_install_checks.runPreInstallChecksForNextFetchItem(checks_defer, fetch_record).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			doStartInstall: function(fetch_record) {
				var defer = $q.defer();
				var install_defer = $q.defer();

				// for each fetch item, get fetch item data records
				// for each data record, install
				// once installed, delete data records and mark item installed

				// RESET ACTIVE STAGE INDEX
				factory.active.stage.index = null;

				factory.install.installNextFetchItem(install_defer, fetch_record).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			doStartRunUpdates: function(fetch_record) {
				var defer = $q.defer();
				var updates_defer = $q.defer();

				// RESET ACTIVE STAGE INDEX
				factory.active.stage.index = null;

				factory.updates.runUpdatesForNextFetchItem(updates_defer, fetch_record).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			incrementInstalledItems: function() {
				factory.active.stage.record.total_items_installed++;
				$rootScope.$broadcast(factory.active.fetch_type + "Download::itemInstalled", {current_total: factory.active.stage.record.total_items_installed});
			},
			storeIdKey: function(value, key, sub_key) {
				var stage_index = factory.active.stage.index;

				// STORE WITH RMID AS KEY
				if( angular.isUndefined(factory.active.fetch_items[ stage_index ].id_keys[ key ]) ) {
					factory.active.fetch_items[ stage_index ].id_keys[ key ] = {};
				}

				factory.active.fetch_items[ stage_index ].id_keys[ key ][ sub_key ] = value;
			},
			storeRefKey: function(value, key, sub_key) {
				var stage_index = factory.active.stage.index;

				// NEED TO APPLY THIS REF KEY TO FILE/MANAGED RISK ETC. UPDATES ON TASK

				// STORE WITH RMREF AS KEY
				if( angular.isUndefined(factory.active.fetch_items[ stage_index ].ref_keys[ key ]) ) {
					factory.active.fetch_items[ stage_index ].ref_keys[ key ] = {};
				}

				factory.active.fetch_items[ stage_index ].ref_keys[ key ][ sub_key ] = value;
			},
			storeIncompleteId: function(value) {
				var stage_index = factory.active.stage.index;

				// STORE ID IN ARRAY
				if( !factory.active.fetch_items[ stage_index ].incomplete_keys ) {
					factory.active.fetch_items[ stage_index ].incomplete_keys = [];
				}

				factory.active.fetch_items[ stage_index ].incomplete_keys.push(value);
			},
			getValueFromKey: function(stage, key, sub_key) {

				var db_id = null;

				// IF KEY NOT SET
				if( key == null ) {
					return db_id;
				};

				key = parseInt(key);

				angular.forEach(factory.active.fetch_items, function(fetch_item, fi_index) {

					if( fetch_item.stage == stage ) {

						if( factory.active.fetch_items[fi_index].id_keys.hasOwnProperty(key) ) {

							if( factory.active.fetch_items[fi_index].id_keys[key].hasOwnProperty(sub_key) ) {
								db_id = factory.active.fetch_items[fi_index].id_keys[key][sub_key];
							}

						}

					}

				});

				return db_id;
			},
			getValueFromRefKey: function(stage, key, sub_key) {

				var db_id = null;

				// IF KEY NOT SET
				if( key == null ) {
					return db_id;
				};

				key = parseInt(key);

				angular.forEach(factory.active.fetch_items, function(fetch_item, fi_index) {

					if( fetch_item.stage == stage ) {

						if( factory.active.fetch_items[fi_index].ref_keys.hasOwnProperty(key) ) {

							if( factory.active.fetch_items[fi_index].ref_keys[key].hasOwnProperty(sub_key) ) {
								db_id = factory.active.fetch_items[fi_index].ref_keys[key][sub_key];
							}

						}

					}

				});

				return db_id;
			},
			updateKeyValue: function(stage, key, sub_key, value) {

				angular.forEach(factory.active.fetch_items, function(fetch_item, fi_index) {

					if( fetch_item.stage == stage ) {

						if( factory.active.fetch_items[fi_index].id_keys.hasOwnProperty(key) && !angular.isUndefined(factory.active.fetch_items[fi_index].id_keys[key]) ) {

							factory.active.fetch_items[fi_index].id_keys[key][sub_key] = value;							

						}
						else
						{
							factory.utils.storeIdKey(value, key, sub_key);
						}

					}

				});
			},
			updateRefKeyValue: function(stage, key, sub_key, value) {

				angular.forEach(factory.active.fetch_items, function(fetch_item, fi_index) {

					if( fetch_item.stage == stage ) {

						if( factory.active.fetch_items[fi_index].ref_keys.hasOwnProperty(key) && !angular.isUndefined(factory.active.fetch_items[fi_index].ref_keys[key]) ) {

							factory.active.fetch_items[fi_index].ref_keys[key][sub_key] = value;							

						}
						else
						{
							factory.utils.storeRefKey(value, key, sub_key);
						}

					}

				});
			},
			resetActiveFetch: function() {
				factory.active.fetch_id = null;
				factory.active.stage.record = null;
				factory.active.stage.index = null;
				factory.active.status = null;
				factory.active.fetch_type = null;
				factory.active.fetch_items = [];

				projectDownloadFactory.download_setup.resetActiveDownload();
			},
			resetExistingRmDbData: function(fetch_item) {

				// CORE DOWNLOAD
				if( fetch_item.stage == 'register_sites' ) {
					coreDownloadFactory.utils.sites.existing_data = null;
					coreDownloadFactory.utils.record_assets.existing_data = null;
				}

				if( fetch_item.stage == 'register_buildings' ) {
					coreDownloadFactory.utils.buildings.existing_data = null;
					coreDownloadFactory.utils.record_assets.existing_data = null;
				}

				if( fetch_item.stage == 'register_areas' ) {
					coreDownloadFactory.utils.areas.existing_data = null;
					coreDownloadFactory.utils.record_assets.existing_data = null;
				}

				if( fetch_item.stage == 'register_assets' ) {
					coreDownloadFactory.utils.register_assets.existing_data = null;
					coreDownloadFactory.utils.register_assets.new_data = null;
				}

				if( fetch_item.stage == 'register_tasks' ) {
					coreDownloadFactory.utils.register_tasks.existing_data = null;
				}

				if( fetch_item.stage == 'register_media_records' ) {
					coreDownloadFactory.utils.register_media_records.existing_data = null;
				}

				if( fetch_item.stage == 'register_asset_ipp' ) {
					coreDownloadFactory.utils.register_asset_ipp.existing_data = null;
				}

				if( fetch_item.stage == 'mr_meta' ) {
					coreDownloadFactory.utils.mr_meta.existing_data = null;
				}

				if( fetch_item.stage == 'qr_register' ) {
					coreDownloadFactory.utils.qr_register.existing_data = null;
				}
 				// END CORE DOWNLOAD


				// PROJECT DOWNLOAD
				if( fetch_item.stage == 'snapshot_assets' ) {
					projectDownloadFactory.utils.snapshot_assets.existing_data = null;
					projectDownloadFactory.utils.snapshot_assets.new_data = null;
				}

				if( fetch_item.stage == 'checklist_instances' ) {
					projectDownloadFactory.utils.checklist_instances.existing_data = null;
				}

				if( fetch_item.stage == 'checklist_question_records' ) {
					projectDownloadFactory.utils.checklist_question_records.existing_data = null;
				}

				if( fetch_item.stage == 'uaudit_content' ) {
					projectDownloadFactory.utils.media_records.existing_data = null;
				}

				if( fetch_item.stage == 'assessments' ) {
					projectDownloadFactory.utils.assessments.existing_data = null;
				}

				if( fetch_item.stage == 'ra_question_relations' ) {
					projectDownloadFactory.utils.question_assessment_relations.existing_data = null;
				}

				if( fetch_item.stage == 'snapshot_asset_media' || fetch_item.stage == 'task_media' || fetch_item.stage == 'mr_hazard_media' || fetch_item.stage == 'mr_control_media' || fetch_item.stage == 'assessment_media' ) {
					projectDownloadFactory.utils.media_records.existing_data = null;
				}

				if( fetch_item.stage == 'tasks' ) {
					projectDownloadFactory.utils.tasks.existing_data = null;
					projectDownloadFactory.utils.record_assets.existing_data = null;

					projectDownloadFactory.utils.tasks.cloud_task_revisions = null;
				}

				if( fetch_item.stage == 'mr_hazards' ) {
					projectDownloadFactory.utils.mr_hazards.existing_data = null;
				}

				if( fetch_item.stage == 'mr_controls' ) {
					projectDownloadFactory.utils.mr_controls.existing_data = null;
					projectDownloadFactory.utils.record_assets.existing_data = null;
				}

				if( fetch_item.stage == 'hazard_control_relations' ) {
					projectDownloadFactory.utils.hazard_control_relations.existing_data = null;
				} 

				if( fetch_item.stage == 'qc_check_records' ) {
					projectDownloadFactory.utils.qc_check_records.existing_data = null;
				}
				// END PROJECT DOWNLOAD

			},
			findFetchItem: function(stage) {
				var fetch_item = null;

				var i = 0;
				var len = factory.active.fetch_items.length;

				while(i < len) {

					if( factory.active.fetch_items[i].stage == stage ) {
						fetch_item = factory.active.fetch_items[i];
					}

					i++;
				}

				return fetch_item;
			},
			initFetchItemIdKeys: function(data) {
				var stage_index = factory.active.stage.index;

				if( !factory.active.fetch_items[ stage_index ].hasOwnProperty('init_id_keys') || factory.active.fetch_items[ stage_index ].init_id_keys != 'yes' ) {
					return;
				}

				var i = 0;
				var len = data.length;
				while(i < len) {

					// CREATE RMID KEY WITH NULL db_id VALUE
					factory.utils.storeIdKey(null, data[i].rm_id, 'db_id');

					i++;
				}
 			},
 			storeUAuditIds: function(data) {
 				var stage_index = factory.active.stage.index;

 				if( !factory.active.fetch_items[ stage_index ].hasOwnProperty('uaudit_ids') ) {
 					factory.active.fetch_items[ stage_index ].uaudit_ids = [];
 				}

 				console.log("STORE UAUDIT IDS");
 				console.log(data);

 				var i = 0;
 				var len = data.length;
 				while(i < len) {

 					// PUSH UAUDIT ID INTO ARRAY IF UAUDIT
 					if( data[i].hasOwnProperty('is_uaudit') && data[i].is_uaudit == 'Yes' ) {
 						factory.active.fetch_items[ stage_index ].uaudit_ids.push(parseInt(data[i].rm_id));
 					}

 					i++;
 				}

 				console.log("FINISHED STORING UAUDIT IDS FOR STAGE");
 				console.log(factory.active.fetch_items[ stage_index ]);
 			},
 			collectUAuditResponseMedia: function(uaudit_data) {

 				var media = [];

 				if( !uaudit_data ) {
 					return media;
 				}

 				// COLLECT QUESTION RESPONSE MEDIA
 				angular.forEach(uaudit_data.pages.collection, function(page_record, page_index){

					//CREATE INIT QUESTIONS ARRAY FOR EACH SECTION
					angular.forEach( page_record.sections, function(section_record, section_index){

						//IF THE QUESTION IS INIT THEN ADD TO SECTION INIT COLLECTION
						angular.forEach( section_record.questions, function(question_record, question_index){

							//ADD ANY QUESTION ANSWER SETUP MEDIA TO COLLECTION
							// if( question_record.answer_setup.hasOwnProperty('media') && question_record.answer_setup.media.length ) 
							// {
							// 	question_record.answer_setup.media.forEach(function(as_media_record, as_media_index) {
									
							// 	});
							// }

							if( question_record.hasOwnProperty('response') && question_record.response.hasOwnProperty('media') ) {

								//ADD EACH QUESTION RESPONSE MEDIA TO COLLECTION
								question_record.response.media.forEach(function(media_record, media_index){
									media.push(media_record);
								});

							}

						});

					});

				});

 				if( uaudit_data.hasOwnProperty('actions') && uaudit_data.actions && uaudit_data.actions.hasOwnProperty('collection') && uaudit_data.actions.collection ) {

 					// COLLECT ACTION MEDIA
					angular.forEach(uaudit_data.actions.collection, function(action_record, action_index) {

						if( action_record.hasOwnProperty('media') && action_record.media ) {

							// ADD EACH ACTION RECORD MEDIA TO COLLECTION
							action_record.media.forEach(function(a_media_record, a_media_index) {
								media.push(a_media_record);
							});

						}

					});

 				}

 				return media;
 			},
 			collectUAuditQuestionAnswerSetupMedia: function(uaudit_data) {

 				var media = [];

 				if( !uaudit_data ) {
 					return media;
 				}

 				console.log("COLLECT UAUDIT QUESTION ANSWER SETUP MEDIA");
 				console.log(uaudit_data);

 				angular.forEach(uaudit_data.pages.collection, function(page_record, page_index){

					//CREATE INIT QUESTIONS ARRAY FOR EACH SECTION
					angular.forEach( page_record.sections, function(section_record, section_index){

						//IF THE QUESTION IS INIT THEN ADD TO SECTION INIT COLLECTION
						angular.forEach( section_record.questions, function(question_record, question_index){

							//ADD ANY QUESTION ANSWER SETUP MEDIA TO COLLECTION
							if( question_record.answer_setup.hasOwnProperty('media') && question_record.answer_setup.media.length ) 
							{
								question_record.answer_setup.media.forEach(function(as_media_record, as_media_index) {
									media.push(as_media_record);
								});
							}

							// if( question_record.hasOwnProperty('response') && question_record.response.hasOwnProperty('media') ) {

							// 	//ADD EACH QUESTION RESPONSE MEDIA TO COLLECTION
							// 	question_record.response.media.forEach(function(media_record, media_index){
							// 		media.push(media_record);
							// 	});

							// }

						});

					});

				});

 				return media;
 			},
 			updateUAuditMediaJsonWithDbRecords: function(uaudit_data, media) {

 				uaudit_data.media.collection = [];

 				console.log(media);
 				console.log("MEDIA TO UPDATE UAUDIT JSON");

 				// UPDATE QUESTION RESPONSE MEDIA
 				angular.forEach(uaudit_data.pages.collection, function(page_record, page_index){

					//CREATE INIT QUESTIONS ARRAY FOR EACH SECTION
					angular.forEach( page_record.sections, function(section_record, section_index){

						//IF THE QUESTION IS INIT THEN ADD TO SECTION INIT COLLECTION
						angular.forEach( section_record.questions, function(question_record, question_index){

							//ADD ANY QUESTION ANSWER SETUP MEDIA TO COLLECTION
							if( question_record.answer_setup.hasOwnProperty('media') && question_record.answer_setup.media.length ) 
							{
								question_record.answer_setup.media.forEach(function(as_media_record, as_media_index) {
									// ADD TO GLOBAL MEDIA COLLECTION
									uaudit_data.media.collection.push( question_record.answer_setup.media[ as_media_index ] );
								});
							}

							if( question_record.hasOwnProperty('response') && question_record.response.hasOwnProperty('media') ) {

								//ADD EACH QUESTION RESPONSE MEDIA TO COLLECTION
								question_record.response.media.forEach(function(media_record, media_index){
									
									// FIND MEDIA MATCH - UPDATE
									var i = 0;
									var len = media.length;
									while(i < len) {

										// IF MEDIA IS DOWNLOAD FROM CLOUD AS CONTINUE
										if( media[i].hasOwnProperty('rm_ref') && media[i].rm_ref ) {

											if( media_record.id == media[i].id ) {
												console.log("UPDATE QUESTION MEDIA WITH DB RECORD");
												question_record.response.media[media_index] = media[i];
											}

										} else {
											// IF MEDIA IS DOWNLOADED AS NEW

											if( media_record.id == media[i].cloned_from_uuid ) {
												console.log("UPDATE QUESTION MEDIA WITH CLONED DB RECORD")
												question_record.response.media[media_index] = media[i];
											}
										}

										i++;
									}

									// ADD TO GLOBAL MEDIA COLLECTION
									uaudit_data.media.collection.push( question_record.response.media[media_index] );

								});

							}

						});

					});

				});

				if( uaudit_data.hasOwnProperty('actions') && uaudit_data.actions && uaudit_data.actions.hasOwnProperty('collection') && uaudit_data.actions.collection ) {

					// UPDATE ACTION MEDIA
					angular.forEach(uaudit_data.actions.collection, function(action_record, action_index) {

						if( action_record.hasOwnProperty('media') && action_record.media ) {

							action_record.media.forEach(function(a_media_record, a_media_index) {

								// FIND MEDIA MATCH - UPDATE
								var i = 0;
								var len = media.length;
								while(i < len) {

									// IF MEDIA IS DOWNLOAD FROM CLOUD AS CONTINUE
									if( media[i].hasOwnProperty('rm_ref') && media[i].rm_ref ) {

										if( a_media_record.id == media[i].id ) {
											console.log("UPDATE ACTION MEDIA WITH DB RECORD");
											action_record.media[a_media_index] = media[i];
										}

									} else {
										// IF MEDIA IS DOWNLOADED AS NEW

										if( a_media_record.id == media[i].cloned_from_uuid ) {
											console.log("UPDATE ACTION MEDIA WITH CLONED DB RECORD")
											action_record.media[a_media_index] = media[i];
										}
									}

									i++;
								}

								// ADD TO GLOBAL MEDIA COLLECTION
								uaudit_data.media.collection.push( action_record.media[a_media_index] );

							});

						}

					});

				}

 			},
 			updateUAuditAnswerSetupMediaWithDbRecords: function(uaudit_data, media) {

 				uaudit_data.media.collection = [];

 				console.log(media);
 				console.log("ANSWER SETUP MEDIA TO UPDATE UAUDIT JSON");

 				angular.forEach(uaudit_data.pages.collection, function(page_record, page_index){

					//CREATE INIT QUESTIONS ARRAY FOR EACH SECTION
					angular.forEach( page_record.sections, function(section_record, section_index){

						//IF THE QUESTION IS INIT THEN ADD TO SECTION INIT COLLECTION
						angular.forEach( section_record.questions, function(question_record, question_index){

							//ADD ANY QUESTION ANSWER SETUP MEDIA TO COLLECTION
							if( question_record.answer_setup.hasOwnProperty('media') && question_record.answer_setup.media.length ) 
							{
								question_record.answer_setup.media.forEach(function(as_media_record, as_media_index) {
									
									// FIND MEDIA MATCH - UPDATE
									var i = 0;
									var len = media.length;
									while( i < len ) {

										if( as_media_record.id == media[i].id ) {
											console.log("UPDATE ANSWER SETUP MEDIA WITH DB RECORD");
											question_record.answer_setup.media[ as_media_index ] = media[i];
										}

										i++;
									}

									// ADD TO GLOBAL MEDIA COLLECTION
									uaudit_data.media.collection.push( question_record.answer_setup.media[ as_media_index ] );

								});
							}

							if( question_record.hasOwnProperty('response') && question_record.response.hasOwnProperty('media') ) {

								//ADD EACH QUESTION RESPONSE MEDIA TO COLLECTION
								question_record.response.media.forEach(function(media_record, media_index){

									// ADD TO GLOBAL MEDIA COLLECTION
									uaudit_data.media.collection.push( question_record.response.media[ media_index ] );

								});

							}

						});

					});

				});

 			},
 			findFetchItemPageNumProperty: function(fetch_item) {
 				var page_num = null;

 				if( fetch_item.hasOwnProperty('pagination') && fetch_item.pagination == 'yes' ) {
 					page_num = fetch_item.params.filters.page_num;
 				} else {
 					// NOT PAGINATED REQUEST
 					page_num = 1;
 				}

 				if( fetch_item.hasOwnProperty('bespoke_fetch') && fetch_item.bespoke_fetch == 'yes' ) {
 					
 					if( fetch_item.stage == 'uaudit_content' ) {
 						page_num = fetch_item.request_num;
 					}	

 				}

 				return page_num;
 			}
		}

		factory.dbFetch = {
			fetchRecord: function(fetch_id) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.fetch_records;
				
				db.get(fetch_id).then(function(doc) {
					defer.resolve(doc);
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			latestFetchRecordV1: function(company_id, user_id, type, record_id, record_type, download_type) {
				var defer = $q.defer();

				var selector = {
					date_started: {'$gt': null},
					table: 'fetch_records',
					company_id: company_id,
					user_id: user_id,
					fetch_type: type,
					latest_fetch: 'Yes'
				};

				if( angular.isDefined(download_type) && download_type ) {
					selector.download_type = download_type;
				}

				if( record_id != null ) {
					selector.fetch_record_id = record_id;
				}

				if( record_type != null ) {
					selector.fetch_record_type = record_type;
				}

				riskmachDatabasesFactory.databases.collection.fetch_records.createIndex({fields: ['date_started']}).then(function() {

					riskmachDatabasesFactory.databases.collection.fetch_records.find({
						selector: selector,
						sort: [{'date_started': 'desc'}],
						limit: 1
					}).then(function(results){

						console.log("GOT LATEST FETCH RECORD");
						if( results.docs.length == 0 ) {
							defer.resolve(null);
						} else {
							defer.resolve(results.docs[0]);
						};

					}).catch(function(error){
						console.log(error);
						defer.reject(error);
					});

				}).catch(function(error){
					console.log(error);
					defer.reject(error);
				});

				return defer.promise;
			},
			latestFetchRecord: function(company_id, user_id, type, record_id, record_type, download_type) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.fetch_records;

				var collection = [];

				var options = {
					limit: 100,
					include_docs: true
				}

				fetchNextPage(fetch_defer).then(function() {

					if( !collection.length ) {
						defer.resolve(null);
					} else {
						// DESC
						collection = $filter('orderBy')(collection, 'date_started', true);

						defer.resolve(collection[0]);
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

								// IF DATE STARTED NOT SET
								if( !result.rows[i].doc.hasOwnProperty('date_started') || !result.rows[i].doc.date_started ) {
									errors++;
								}

								// IF NOT FETCH RECORDS TABLE
								if( !result.rows[i].doc.hasOwnProperty('table') || result.rows[i].doc.table != 'fetch_records' ) {
									errors++;
								}

								// IF NOT ACTIVE COMPANY ID
								if( !result.rows[i].doc.hasOwnProperty('company_id') || result.rows[i].doc.company_id != company_id ) {
									errors++;
								}

								// IF NOT ACTIVE USER ID
								if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != user_id ) {
									errors++;
								}

								// IF NOT PASSED IN FETCH TYPE
								if( !result.rows[i].doc.hasOwnProperty('fetch_type') || result.rows[i].doc.fetch_type != type ) {
									errors++;
								}

								// IF NOT LATEST FETCH
								if( !result.rows[i].doc.hasOwnProperty('latest_fetch') || result.rows[i].doc.latest_fetch != 'Yes' ) {
									errors++;
								}

								// IF DOWNLOAD TYPE PASSED IN AND NO MATCH
								if( angular.isDefined(download_type) && download_type ) {

									if( !result.rows[i].doc.hasOwnProperty('download_type') || result.rows[i].doc.download_type != download_type ) {
										errors++;
									}

								}

								// IF RECORD ID PASSED IN AND NO MATCH
								if( angular.isDefined(record_id) && record_id ) {

									if( !result.rows[i].doc.hasOwnProperty('fetch_record_id') || result.rows[i].doc.fetch_record_id != record_id ) {
										errors++;
									}

								}

								// IF RECORD TYPE PASSED IN AND NO MATCH
								if( angular.isDefined(record_type) && record_type ) {

									if( !result.rows[i].doc.hasOwnProperty('fetch_record_type') || result.rows[i].doc.fetch_record_type != record_type ) {
										errors++;
									}

								}
 
								if( errors == 0 ) {
									collection.push(result.rows[i].doc);
								}

								i++;
							}

							options.skip = 1;
							options.startkey = result.rows[ result.rows.length - 1 ].id;

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
			fetchItemsV1: function(fetch_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.fetch_items.createIndex({fields: ['sequence_order']}).then(function() {

					riskmachDatabasesFactory.databases.collection.fetch_items.find({
						selector: {
							sequence_order: {'$gt': null},
							table: 'fetch_items',
							fetch_id: fetch_id
						},
						sort: [{sequence_order: 'asc'}]
					}).then(function(results){

						console.log("GOT FETCH ITEMS");
						if( results.docs.length == 0 ) {
							defer.reject("There are no fetch stages setup");
						} else {
							defer.resolve(results.docs);
						};

					}).catch(function(error){
						defer.reject(error);
					});

				});

				return defer.promise;
			}, 
			fetchItems: function(fetch_id) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.fetch_items;

				var collection = [];

				var options = {
					limit: 100, 
					include_docs: true
				};

				fetchNextPage(fetch_defer).then(function() {

					if( !collection.length ) {
						defer.reject("There are no fetch stages setup");
						return defer.promise;
					}

					collection = $filter('orderBy')(collection, 'sequence_order', false);

					defer.resolve(collection);

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

								// IF NO SEQUENCE ORDER
								if( !result.rows[i].doc.hasOwnProperty('sequence_order') || !result.rows[i].doc.sequence_order ) {
									errors++;
								}

								// IF TABLE NOT FETCH ITEMS
								if( !result.rows[i].doc.hasOwnProperty('table') || result.rows[i].doc.table != 'fetch_items' ) {
									errors++;
								}

								// IF FETCH ITEM DO NOT BELONG TO FETCH ID
								if( !result.rows[i].doc.hasOwnProperty('fetch_id') || result.rows[i].doc.fetch_id != fetch_id ) {
									errors++;
								}

								if( errors == 0 ) {
									collection.push(result.rows[i].doc);
								}

								i++;
							}

							options.skip = 1;
							options.startkey = result.rows[ result.rows.length - 1 ].id;

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
			fetchItemDataPage: function(fetch_item, page_num) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.fetch_item_data.find({
					selector: {
						table: 'fetch_item_data',
						fetch_item_id: fetch_item._id,
						page_num: page_num
					},
					limit: 1
				}).then(function(results){

					console.log("GOT FETCH ITEM DATA");
					if( results.docs.length == 0 ) {
						defer.resolve(null);
					} else {
						defer.resolve(results.docs[0]);
					};

				}).catch(function(error){
					console.log("ERROR GETTING FETCH ITEM DATA RECORD");
					defer.reject(error);
				});

				return defer.promise;
			},
			existingRmDbData: function(fetch_item) {
				var defer = $q.defer();

				// var available_emails = ['e.jones@spierssafety.co.uk','a.thomas@spierssafety.co.uk','a.ginn@riskmach.co.uk','w.spiers@spierssafety.co.uk'];

				// if( authFactory.active_profile && authFactory.active_profile.hasOwnProperty('EmailAddress') ) {

				// 	if( available_emails.indexOf(authFactory.active_profile.EmailAddress) === -1 ) {
				// 		defer.resolve();
				// 		return defer.promise;
				// 	}

				// }

				// if( 1 === 1 ) {
				// 	defer.resolve();
				// 	return defer.promise;
				// }

				// CORE DOWNLOAD
				if( fetch_item.stage == 'register_sites' ) {

					coreDownloadFactory.dbUtils.sites.existingRmSites().then(function() {

						coreDownloadFactory.dbUtils.record_assets.existingRmRecordAssets().then(function() {

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				if( fetch_item.stage == 'register_buildings' ) {

					coreDownloadFactory.dbUtils.buildings.existingRmBuildings().then(function() {

						coreDownloadFactory.dbUtils.record_assets.existingRmRecordAssets().then(function() {

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				if( fetch_item.stage == 'register_areas' ) {

					coreDownloadFactory.dbUtils.areas.existingRmAreas().then(function() {

						coreDownloadFactory.dbUtils.record_assets.existingRmRecordAssets().then(function() {

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				} 

				if( fetch_item.stage == 'register_assets' ) {

					// PREPARE FOR NEW CLOUD DATA
					coreDownloadFactory.utils.register_assets.new_data = {};

					coreDownloadFactory.dbUtils.register_assets.existingRmRegisterAssets().then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				if( fetch_item.stage == 'register_tasks' ) {

					coreDownloadFactory.dbUtils.register_tasks.existingRmRegisterTasks().then(function() {

						coreDownloadFactory.dbUtils.record_assets.existingRmRecordAssets().then(function() {

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				if( fetch_item.stage == 'register_media_records' ) {

					var i = 0;
					var len = factory.active.fetch_items.length;
					var asset_keys = [];

					while(i < len) {

						if( factory.active.fetch_items[i].stage == 'register_assets' ) {

							asset_keys = factory.active.fetch_items[i].id_keys;

						}

						i++;
					}

					coreDownloadFactory.dbUtils.register_media_records.existingRmRegisterMediaRecords(asset_keys).then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				if( fetch_item.stage == 'register_asset_ipp' ) {

					var i = 0;
					var len = factory.active.fetch_items.length;
					var asset_keys = null;

					while(i < len) {

						if( factory.active.fetch_items[i].stage == 'register_assets' ) {

							asset_keys = factory.active.fetch_items[i].id_keys;

						}

						i++;
					}

					coreDownloadFactory.dbUtils.register_asset_ipp.existingRmRegisterAssetIppScores(asset_keys).then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				if( fetch_item.stage == 'mr_meta' ) {

					var i = 0;
					var len = factory.active.fetch_items.length;
					var asset_keys = [];

					while(i < len) {

						if( factory.active.fetch_items[i].stage == 'register_assets' ) {

							asset_keys = factory.active.fetch_items[i].id_keys;

						}

						i++;
					}

					coreDownloadFactory.dbUtils.mr_meta.existingRmMrMeta(asset_keys).then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				if( fetch_item.stage == 'qr_register' ) {

					coreDownloadFactory.dbUtils.qr_register.existingRmQrCodes().then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
				// END CORE DOWNLOAD


				// PROJECT DOWNLOAD
				if( fetch_item.stage == 'snapshot_assets' ) {

					// PREPARE FOR NEW CLOUD DATA
					projectDownloadFactory.utils.snapshot_assets.new_data = {};

					projectDownloadFactory.dbUtils.snapshot_assets.existingRmSnapshotAssets().then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				if( fetch_item.stage == 'checklist_instances' ) {

					projectDownloadFactory.dbUtils.checklist_instances.existingRmChecklistRecords().then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				if( fetch_item.stage == 'checklist_question_records' ) {

					// var i = 0;
					// var len = factory.active.fetch_items.length;
					var q_checklist_keys = [];

					var q_checklists_fetch_item = factory.utils.findFetchItem('checklist_instances');
					q_checklist_keys = q_checklists_fetch_item.id_keys;

					// while(i < len) {

					// 	if( factory.active.fetch_items[i].stage == 'checklist_instances' ) {

					// 		checklist_keys = factory.active.fetch_items[i].id_keys;

					// 	}

					// 	i++;
					// }

					projectDownloadFactory.dbUtils.checklist_question_records.existingRmChecklistQuestions(q_checklist_keys).then(function() {

						// CLEAN UP
						q_checklists_fetch_item = null;
						q_checklist_keys = null;

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				if( fetch_item.stage == 'uaudit_content' ) {

					var u_checklist_keys = [];
					var u_checklists_fetch_item = factory.utils.findFetchItem('checklist_instances');
					u_checklist_keys = u_checklists_fetch_item.id_keys;

					projectDownloadFactory.dbUtils.media_records.existingRmUAuditMedia(u_checklist_keys).then(function() {
							
						// CLEANUP
						u_checklists_fetch_item = null;
						u_checklist_keys = null;

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				if( fetch_item.stage == 'assessments' ) {

					projectDownloadFactory.dbUtils.assessments.existingRmRiskAssessments().then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				if( fetch_item.stage == 'ra_question_relations' ) {

					var i = 0;
					var len = factory.active.fetch_items.length;
					var risk_keys = [];

					while(i < len) {

						if( factory.active.fetch_items[i].stage == 'assessments' ) {

							risk_keys = factory.active.fetch_items[i].ref_keys;

						}

						i++;
					}

					projectDownloadFactory.dbUtils.question_assessment_relations.existingRmQuestionAssessmentRelations(risk_keys).then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				if( fetch_item.stage == 'snapshot_asset_media' || fetch_item.stage == 'task_media' || fetch_item.stage == 'mr_hazard_media' || fetch_item.stage == 'mr_control_media' || fetch_item.stage == 'assessment_media' ) {

					var fetch_stages = {
						'snapshot_asset_media': {
							stage_name: 'snapshot_assets',
							record_type: 'asset'
						},
						'task_media': {
							stage_name: 'tasks',
							record_type: 'task'
						},
						'mr_hazard_media': {
							stage_name: 'mr_hazards',
							record_type: 'assessment_hazard'
						},
						'mr_control_media': {
							stage_name: 'mr_controls', 
							record_type: 'control_item'
						},
						'assessment_media': {
							stage_name: 'assessments',
							record_type: 'assessment'
						}
					};

					var parent_fetch_stage = fetch_stages[fetch_item.stage].stage_name;
					var record_type = fetch_stages[fetch_item.stage].record_type;

					var i = 0;
					var len = factory.active.fetch_items.length;
					var parent_keys = [];

					while(i < len) {

						if( factory.active.fetch_items[i].stage == parent_fetch_stage ) {

							if( fetch_item.stage == 'task_media' || fetch_item.stage == 'assessment_media' ) {
								parent_keys = factory.active.fetch_items[i].ref_keys;
							} else {
								parent_keys = factory.active.fetch_items[i].id_keys;
							}

						}

						i++;
					}

					projectDownloadFactory.dbUtils.media_records.existingRmMediaRecords(parent_keys, record_type).then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				if( fetch_item.stage == 'tasks' ) {

					projectDownloadFactory.dbUtils.tasks.existingRmTasks().then(function() {

						projectDownloadFactory.dbUtils.record_assets.existingRmRecordAssets('task').then(function() {

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				if( fetch_item.stage == 'mr_hazards' ) {

					projectDownloadFactory.dbUtils.mr_hazards.existingRmHazards().then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				if( fetch_item.stage == 'mr_controls' ) {

					projectDownloadFactory.dbUtils.mr_controls.existingRmControls().then(function() {

						projectDownloadFactory.dbUtils.record_assets.existingRmRecordAssets('control_item').then(function() {

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				if( fetch_item.stage == 'hazard_control_relations' ) {

					projectDownloadFactory.dbUtils.hazard_control_relations.existingRmHazardControlRelations().then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				if( fetch_item.stage == 'qc_check_records' ) {

					projectDownloadFactory.dbUtils.qc_check_records.existingRmQcCheckRecords().then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
				// END PROJECT DOWNLOAD

				// IF FETCH ITEM STAGE DOESN'T MATCH ANY ABOVE, RESOLVE
				defer.resolve();

				return defer.promise;
			}
		}

		factory.dbUtils = {
			markFetchNotLatest: function(fetch_record) {
				var defer = $q.defer();

				fetch_record.latest_fetch = null;

				if( fetch_record.date_installed == null ) {
					fetch_record.aborted = 'Yes';
					fetch_record.date_aborted = new Date().getTime();
				}

				var db = riskmachDatabasesFactory.databases.collection.fetch_records;
			  	db.put(fetch_record).then(function(result) {
			  		fetch_record._id = result.id;
			  		fetch_record._rev = result.rev;
			  		defer.resolve(fetch_record);
			  	}).catch(function(error) {
			  		defer.reject(error);
			  	});

				return defer.promise;
			},
			markOldFetchRecordsNotLatest: function(fetch_type, fetch_record_type, fetch_record_id, download_type) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				factory.dbUtils.fetch_records.recordsLatestFetchRecords(fetch_type, fetch_record_type, fetch_record_id, download_type).then(function(fetch_records) {

					if( !fetch_records || fetch_records.length == 0 ) {
						// NO FETCH RECORDS
						defer.resolve();
						return defer.promise;
					}

					var active_index = 0;

					updateFetchRecord(save_defer, active_index).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function updateFetchRecord(defer, active_index) {

						if( active_index > fetch_records.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						factory.dbUtils.markFetchNotLatest(fetch_records[active_index]).then(function(saved_record) {

							fetch_records[active_index]._id = saved_record._id;
							fetch_records[active_index]._rev = saved_record._rev;

							active_index++;

							updateFetchRecord(defer, active_index);

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
			abortFetch: function(fetch_id) {
				var defer = $q.defer();

				factory.dbFetch.fetchRecord(fetch_id).then(function(doc) {
					
					doc.aborted = 'Yes';
					doc.date_aborted = new Date().getTime();

					var db = riskmachDatabasesFactory.databases.collection.fetch_records;
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
			saveNewFetchRecord: function(type, record_id, record_type, download_type, is_partial) {
				var defer = $q.defer();

				var company_id = authFactory.cloudCompanyId();

				if( type == 'core' ) {
					company_id = authFactory.getActiveCompanyId();
				}

				var fetch_record = {};
				angular.copy(modelsFactory.models.fetch_record, fetch_record);
				fetch_record.fetch_type = type;
				fetch_record.fetch_record_id = record_id;
				fetch_record.fetch_record_type = record_type;
				fetch_record.user_id = authFactory.cloudUserId();
				fetch_record.company_id = company_id;
				fetch_record.status = 'Initialising';
				fetch_record.date_started = new Date().getTime();
				fetch_record.last_status_date = new Date().getTime();
				fetch_record.latest_fetch = 'Yes';
				fetch_record.is_partial_download = is_partial;

				if( angular.isDefined(download_type) && download_type != null ) {
					fetch_record.download_type = download_type;
				}

				var options = {
					force: true
				};

				riskmachDatabasesFactory.databases.collection.fetch_records.post(fetch_record, options).then(function(saved_record) {
					fetch_record._id = saved_record.id;
					fetch_record._rev = saved_record.rev;

					defer.resolve(fetch_record);
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}, 
			saveNewFetchItem: function(stage, fetch_id, type) {
				var defer = $q.defer();

				var fetch_item = {};
				angular.copy(modelsFactory.models.fetch_item, fetch_item);
				fetch_item.fetch_id = fetch_id;
				fetch_item.stage = stage.stage_name;
				fetch_item.status = 'Not started';

				fetch_item.endpoint = factory.utils.apiEndpoint(stage.stage_name);
				fetch_item.params = stage.params;
				fetch_item.pagination = factory.utils.available_stages[stage.stage_name].pagination;
				fetch_item.display_name = factory.utils.available_stages[stage.stage_name].display_name;

				fetch_item.init_id_keys = null;
				fetch_item.bespoke_fetch = null;
				fetch_item.request_num = null;

				// SET INIT ID KEYS IF AVAILABLE
				if( factory.utils.available_stages[stage.stage_name].hasOwnProperty('init_id_keys') ) {
					fetch_item.init_id_keys = factory.utils.available_stages[stage.stage_name].init_id_keys;
				}

				// SET BESPOKE FETCH IF AVAILABLE
				if( factory.utils.available_stages[stage.stage_name].hasOwnProperty('bespoke_fetch') ) {
					fetch_item.bespoke_fetch = factory.utils.available_stages[stage.stage_name].bespoke_fetch;
				}

				// SET REQUEST NUM IF AVAILABLE
				if( factory.utils.available_stages[stage.stage_name].hasOwnProperty('request_num') ) {
					fetch_item.request_num = factory.utils.available_stages[stage.stage_name].request_num;
				}

				var stage_sequence;

				if( type == 'core' ) {
					stage_sequence = factory.utils.core_sequence;
				};

				if( type == 'project' ) {
					stage_sequence = factory.utils.project_sequence;
				};

				if( angular.isUndefined(stage_sequence[ stage.stage_name ]) ) {
					defer.reject("The developer has not set up the download order for " + stage.stage_name);
					return defer.promise;
				};

				fetch_item.sequence_order = stage_sequence[ stage.stage_name ];

				var options = {
					force: true
				};

				riskmachDatabasesFactory.databases.collection.fetch_items.post(fetch_item, options).then(function(saved_record) {
					defer.resolve(saved_record.id);
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			updateFetchRecordStatus: function(fetch_id, status) {
				var defer = $q.defer();

				// FETCH PARENT FETCH RECORD
				factory.dbFetch.fetchRecord(fetch_id).then(function(fetch_record) {
					
					// UPDATE FETCH RECORD WITH STATUS
					fetch_record.status = status;
					fetch_record.last_status_date = new Date().getTime();

					if( status == 'Fetched' ) {
						fetch_record.date_fetched = new Date().getTime();
					};

					if( status == 'Installed' ) {
						fetch_record.date_installed = new Date().getTime();
					};

					if( status == 'Finished' ) {
						fetch_record.date_updates_run = new Date().getTime();
						fetch_record.date_finished = new Date().getTime();
					}

					// UPDATE FETCH RECORD
					var db = riskmachDatabasesFactory.databases.collection.fetch_records;
				  	db.put(fetch_record).then(function(result) {
				  		fetch_record._id = result.id;
				  		fetch_record._rev = result.rev;
				  		defer.resolve();
				  	}).catch(function(error) {
				  		console.log( JSON.stringify(fetch_record, null, 2) );
				  		console.log("Error updating fetch record status");
				  		defer.reject(error);
				  	});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			updateFetchRecordStage: function(fetch_id, stage) {
				var defer = $q.defer();

				// FETCH PARENT FETCH RECORD
				factory.dbFetch.fetchRecord(fetch_id).then(function(fetch_record) {
					
					// UPDATE FETCH RECORD WITH STAGE
					fetch_record.last_status_date = new Date().getTime();
					fetch_record.current_stage = stage;

					// UPDATE FETCH RECORD
					var db = riskmachDatabasesFactory.databases.collection.fetch_records;
				  	db.put(fetch_record).then(function(result) {
				  		fetch_record._id = result.id;
				  		fetch_record._rev = result.rev;
				  		defer.resolve();
				  	}).catch(function(error) {
				  		console.log( JSON.stringify(fetch_record, null, 2) );
				  		console.log("Error updating fetch record stage");
				  		defer.reject(error);
				  	});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			updateFetchItemStatus: function(fetch_item) {
				var defer = $q.defer();

				// console.log( JSON.stringify(fetch_item, null, 2) );
				// alert("Fetch item status");

				// BROADCAST DOWNLOAD STATUS
				$rootScope.$broadcast(factory.active.fetch_type + "Download::status");

				// UPDATE FETCH ITEM
				var db = riskmachDatabasesFactory.databases.collection.fetch_items;
			  	db.put(fetch_item).then(function(result) {
			  		factory.active.fetch_items[factory.active.stage.index]._id = result.id;
			  		factory.active.fetch_items[factory.active.stage.index]._rev = result.rev;

			  		factory.dbUtils.updateFetchRecordStage(factory.active.fetch_id, factory.active.stage.record.stage).then(function() {
			  			defer.resolve();
			  		}, function(error) {
			  			defer.reject(error);
			  		});

			  	}).catch(function(error) {
			  		console.log( JSON.stringify(fetch_item, null, 2) );
			  		console.log("Error updating fetch item status");
			  		defer.reject(error);
			  	});

				return defer.promise;
			},
			saveFetchRecordError: function(fetch_id, error_message, stage, process_stage) {
				var defer = $q.defer();

				// FETCH PARENT FETCH RECORD
				factory.dbFetch.fetchRecord(fetch_id).then(function(fetch_record) {
						
					// UPDATE FETCH RECORD WITH ERROR DETAILS
					fetch_record.status = 'Error';
					fetch_record.last_status_date = new Date().getTime();
					fetch_record.error_message = error_message;
					fetch_record.process_stage = process_stage;

					if( stage != null ) {
						fetch_record.current_stage = stage;
					};

					// UPDATE FETCH RECORD WITH ERROR MESSAGE
					var fetch_db = riskmachDatabasesFactory.databases.collection.fetch_records;
				  	fetch_db.put(fetch_record).then(function(result) {
				  		fetch_record._id = result.id;
				  		fetch_record._rev = result.rev;
				  		defer.resolve();
				  	}).catch(function(error) {
				  		defer.reject(error);
				  	});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			saveFetchItemError: function(fetch_item, error_message, process_stage) {
				var defer = $q.defer();

				// UPDATE FETCH ITEM WITH ERROR MESSAGE
				var item_db = riskmachDatabasesFactory.databases.collection.fetch_items;
				item_db.put(fetch_item).then(function(result) {
					fetch_item._id = result.id; 
					fetch_item._rev = result.rev;

					defer.resolve();
			  		
			  	}).catch(function(error) {
			  		defer.reject(error);
			  	});

				return defer.promise;
			},
			saveFetchError: function(fetch_item, error_message, process_stage) {
				var defer = $q.defer();

				factory.dbUtils.saveFetchItemError(fetch_item, error_message, process_stage).then(function() {

					factory.dbUtils.saveFetchRecordError(factory.active.fetch_id, error_message, fetch_item.stage, process_stage).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

			  	return defer.promise;
			}, 
			storeCollectedFetchItemData: function(data, fetch_item_id, stage, page_num) {
				var defer = $q.defer();

				// ATTEMPT PARSE UAUDIT INSTANCE DATA
				if( stage == 'uaudit_content' ) {
					if( data.hasOwnProperty('UAuditInstanceData') && data.UAuditInstanceData ) {
						var parsed_data = JSON.parse(data.UAuditInstanceData);
						data.UAuditInstanceData = angular.copy(parsed_data);
						// CLEANUP
						parsed_data = null;
					}  
				}

				var fetch_item_data = {};
				angular.copy(modelsFactory.models.fetch_item_data, fetch_item_data);
				fetch_item_data.fetch_item_id = fetch_item_id;
				fetch_item_data.fetch_item_stage = stage;
				fetch_item_data.page_num = page_num;		
				fetch_item_data.data = JSON.stringify(data);
				fetch_item_data.date_added = new Date().getTime();

				if( fetch_item_data.page_num == null ) {
					fetch_item_data.page_num = 1;
				};

				var options = {
					force: true
				};

				var db = riskmachDatabasesFactory.databases.collection.fetch_item_data;

				db.post(fetch_item_data, options).then(function(saved_record) {

					fetch_item_data._id = saved_record.id;
					fetch_item_data._rev = saved_record.rev;

					defer.resolve(fetch_item_data);
				}).catch(function(error) {
					console.log("ERROR SAVING FETCH ITEM DATA RECORD");
					defer.reject(error);
				});

				return defer.promise;
			},
			fetch_records: {
				latestFetchRecords: function(fetch_type, record_type, download_type) {
					var defer = $q.defer();

					var company_id = authFactory.cloudCompanyId();

					if( fetch_type == 'core' ) {
						company_id = authFactory.getActiveCompanyId();
					}

					riskmachDatabasesFactory.databases.collection.fetch_records.find({
						selector: {
							table: 'fetch_records',
							company_id: company_id,
							user_id: authFactory.cloudUserId(),
							fetch_type: fetch_type,
							fetch_record_type: record_type,
							latest_fetch: 'Yes', 
							download_type: download_type
						}
					}).then(function(results) {
						console.log("GOT LATEST FETCH RECORDS: " + fetch_type + ' - ' + record_type);
						console.log(results.docs);
						defer.resolve(results.docs);
					}).catch(function(error) {
						console.log("ERROR GETTING LATEST FETCH RECORDS: " + fetch_type + ' - ' + record_type);
						defer.reject(error);
					});

					return defer.promise;
				},
				recordsLatestFetchRecords: function(fetch_type, record_type, record_id, download_type) {
					var defer = $q.defer();

					var company_id = authFactory.cloudCompanyId();

					if( fetch_type == 'core' ) {
						company_id = authFactory.getActiveCompanyId();
					}

					riskmachDatabasesFactory.databases.collection.fetch_records.find({
						selector: {
							table: 'fetch_records',
							company_id: company_id,
							user_id: authFactory.cloudUserId(),
							fetch_type: fetch_type,
							fetch_record_type: record_type,
							fetch_record_id: record_id,
							latest_fetch: 'Yes', 
							download_type: download_type
						}
					}).then(function(results) {
						console.log("GOT LATEST FETCH RECORDS: " + fetch_type + ' - ' + record_type + ' FOR RECORD ID - ' + record_id);
						console.log(results.docs);
						defer.resolve(results.docs);
					}).catch(function(error) {
						console.log("ERROR GETTING LATEST FETCH RECORDS: " + fetch_type + ' - ' + record_type + ' FOR RECORD ID - ' + record_id);
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			sites: {
				saveSiteBatch: function(sites) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					sites = JSON.parse(sites);

					console.log("SAVE SITES");

					// IF NO DATA TO SAVE
					if( sites.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveSiteRecord(save_defer, sites[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveSiteRecord(defer, site_record) {

						coreDownloadFactory.dbUtils.sites.saveSiteRecord(site_record).then(function(saved_site) {

							// STORE RM ID - LOCAL ID KEY VALUE PAIR
							factory.utils.storeIdKey(saved_site._id, saved_site.rm_id, 'db_id');

							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							active_index++;

							// IF SAVED ALL SITES
							if( active_index > sites.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveSiteRecord(defer, sites[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			buildings: {
				saveBuildingBatch: function(buildings) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					buildings = JSON.parse(buildings);

					console.log("SAVE BUILDINGS");

					// IF NO DATA TO SAVE
					if( buildings.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveBuildingRecord(save_defer, buildings[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveBuildingRecord(defer, building_record) {

						// SET LOCAL SITE ID
						building_record.site_id = factory.utils.getValueFromKey('register_sites', building_record.rm_site_id, 'db_id');

						coreDownloadFactory.dbUtils.buildings.saveBuildingRecord(building_record).then(function(saved_building) {
							
							// STORE RMID - LOCAL ID KEY VALUE PAIRS
							factory.utils.storeIdKey(saved_building._id, saved_building.rm_id, 'db_id');

							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							active_index++;

							// IF SAVED ALL BUILDINGS
							if( active_index > buildings.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveBuildingRecord(defer, buildings[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			areas: {
				saveAreaBatch: function(areas) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					areas = JSON.parse(areas);

					console.log("SAVE AREAS");

					// IF NO DATA TO SAVE
					if( areas.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveAreaRecord(save_defer, areas[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveAreaRecord(defer, area_record) {

						// SET LOCAL SITE ID
						area_record.site_id = factory.utils.getValueFromKey('register_sites', area_record.rm_site_id, 'db_id');
						// SET LOCAL BUILDING ID
						area_record.building_id = factory.utils.getValueFromKey('register_buildings', area_record.rm_building_id, 'db_id');

						coreDownloadFactory.dbUtils.areas.saveAreaRecord(area_record).then(function(saved_area) {

							// STORE RMID - LOCAL ID KEY VALUE PAIRS
							factory.utils.storeIdKey(saved_area._id, saved_area.rm_id, 'db_id');
									
							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							active_index++;

							// IF SAVED ALL AREAS
							if( active_index > areas.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveAreaRecord(defer, areas[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			register_assets: {
				saveRegisterAssetBatch: function(assets) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					assets = JSON.parse(assets);

					console.log("SAVE REGISTER ASSETS");

					// IF NO DATA TO SAVE
					if( assets.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveRegisterAssetRecord(save_defer, assets[active_index]).then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					function saveRegisterAssetRecord(defer, asset_record) {

						// SET LOCAL SITE ID
						asset_record.site_id = factory.utils.getValueFromKey('register_sites', asset_record.rm_site_id, 'db_id');
						// SET LOCAL BUILDING ID
						asset_record.building_id = factory.utils.getValueFromKey('register_buildings', asset_record.rm_building_id, 'db_id');
						// SET LOCAL AREA ID
						asset_record.area_id = factory.utils.getValueFromKey('register_areas', asset_record.rm_area_id, 'db_id');
						// SET LOCAL PARENT ASSET ID
						asset_record.parent_asset_id = factory.utils.getValueFromKey('register_assets', asset_record.rm_parent_asset_id, 'db_id');

						coreDownloadFactory.dbUtils.register_assets.saveRegisterAssetRecord(asset_record).then(function(saved_asset) {
						
							if( saved_asset ) {
								// STORE LOCAL ASSET ID
								factory.utils.storeIdKey(saved_asset._id, saved_asset.rm_id, 'db_id');
								// STORE RMPROFILEIMGID IF THERE IS ONE
								if( saved_asset.hasOwnProperty('rm_profile_image_media_id') && saved_asset.rm_profile_image_media_id ) {
									factory.utils.storeIdKey(saved_asset.rm_profile_image_media_id, saved_asset.rm_id, 'rm_profile_img_id');
								}
							}

							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							active_index++;

							// IF SAVED ALL ASSETS
							if( active_index > assets.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							// TIMEOUT FOR DB
							$timeout(function() {
								saveRegisterAssetRecord(defer, assets[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			register_tasks: {
				saveRegisterTaskBatch: function(tasks) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					tasks = JSON.parse(tasks);

					// IF NO DATA TO SAVE
					if( tasks.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveRegisterTaskRecord(save_defer, tasks[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveRegisterTaskRecord(defer, task_record) {

						// SET LOCAL SITE ID
						task_record.site_id = factory.utils.getValueFromKey('register_sites', task_record.rm_site_id, 'db_id');
						// SET LOCAL BUILDING ID
						task_record.building_id = factory.utils.getValueFromKey('register_buildings', task_record.rm_building_id, 'db_id');
						// SET LOCAL AREA ID
						task_record.area_id = factory.utils.getValueFromKey('register_areas', task_record.rm_area_id, 'db_id');
						// SET LOCAL REGISTER ASSET ID
						task_record.register_asset_id = factory.utils.getValueFromKey('register_assets', task_record.rm_asset_id, 'db_id');

						coreDownloadFactory.dbUtils.register_tasks.saveRegisterTaskRecord(task_record).then(function(saved_task) {

							// STORE RMID - LOCAL ID KEY VALUE PAIRS
							factory.utils.storeIdKey(saved_task._id, saved_task.rm_ref, 'db_id');
									
							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							active_index++;

							// IF SAVED ALL TASKS
							if( active_index > tasks.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveRegisterTaskRecord(defer, tasks[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			register_media_records: {
				saveRegisterMediaBatch: function(media) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					media = JSON.parse(media);

					console.log( JSON.stringify(media, null, 2) );
					// alert("Media");

					// IF NO DATA TO SAVE
					if( media.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveRegisterMediaRecord(save_defer, media[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveRegisterMediaRecord(defer, media_record) {

						if( media_record.record_type == 'asset' ) {
							// SET LOCAL REGISTER ASSET ID
							media_record.record_id = factory.utils.getValueFromKey('register_assets', media_record.rm_record_item_id, 'db_id');
						};

						if( media_record.record_type == 'task' ) {
							// SET LOCAL REGISTER TASK ID
							media_record.record_id = factory.utils.getValueFromKey('register_tasks', media_record.rm_record_item_ref, 'db_id');
						};

						coreDownloadFactory.dbUtils.register_media_records.saveRegisterMediaRecord(media_record).then(function(saved_media) {

							// STORE RMID - LOCAL ID KEY VALUE PAIRS
							// factory.utils.storeIdKey(saved_media._id, saved_media.rm_id);

							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							if( parseInt(media_record.status) == 1 ) {

								var num_files = null;

								// UPDATE ASSET NUM FILES
								if( media_record.record_type == 'asset' ) {
									num_files = factory.utils.getValueFromKey('register_assets', media_record.rm_record_item_id, 'num_files');
									if( num_files == null ) {
										num_files = 1;
									} else {
										num_files++;
									}

									// STORE NUM FILES
									factory.utils.updateKeyValue('register_assets', media_record.rm_record_item_id, 'num_files', num_files);

									// FIND RISK PROFILE IMG ID
									var asset_profile_img_id = factory.utils.getValueFromKey('register_assets', media_record.rm_record_item_id, 'rm_profile_img_id');

									// IF RISK HAS PROFILE IMG AND MATCHES CURRENT MEDIA RECORD
									if( asset_profile_img_id && media_record.rm_id == asset_profile_img_id ) {
										factory.utils.updateKeyValue('register_assets', media_record.rm_record_item_id, 'local_profile_img_id', saved_media._id);
									}
								}

								// UPDATE TASK NUM FILES
								if( media_record.record_type == 'task' ) {
									num_files = factory.utils.getValueFromKey('register_tasks', media_record.rm_record_item_ref, 'num_files');
									if( num_files == null ) {
										num_files = 1;
									} else {
										num_files++;
									}

									// STORE NUM FILES
									factory.utils.updateKeyValue('register_tasks', media_record.rm_record_item_ref, 'num_files', num_files);
								}

							}
									
							active_index++;

							// IF SAVED ALL MEDIA
							if( active_index > media.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveRegisterMediaRecord(defer, media[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			register_asset_ipp: {
				saveRegisterAssetIppBatch: function(ipp_records) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					ipp_records = JSON.parse(ipp_records);

					// IF NO DATA TO SAVE
					if( ipp_records.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveRegisterAssetIppRecord(save_defer, ipp_records[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveRegisterAssetIppRecord(defer, ipp_record) {

						// SET LOCAL REGISTER ASSET ID
						ipp_record.asset_id = factory.utils.getValueFromKey('register_assets', ipp_record.rm_asset_id, 'db_id');

						coreDownloadFactory.dbUtils.register_asset_ipp.saveRegisterAssetIppRecord(ipp_record).then(function(saved_ipp) {

							coreDownloadFactory.dbUtils.register_assets.indexIppScoreOnCoreAsset(saved_ipp).then(function() {

								// INCREMENT INSTALLED ITEMS
								factory.utils.incrementInstalledItems();

								active_index++;

								// IF SAVED ALL REGISTER ASSET IPP SCORES
								if( active_index > ipp_records.length - 1 ) {
									defer.resolve();
									return defer.promise;
								};

								$timeout(function() {
									saveRegisterAssetIppRecord(defer, ipp_records[active_index]);
								}, factory.utils.save_timeout);

							}, function(error) {
								defer.reject(error);
							});

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			mr_meta: {
				saveMrMetaBatch: function(meta) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					meta = JSON.parse(meta);

					// IF NO DATA TO SAVE
					if( meta.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveMrMetaRecord(save_defer, meta[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveMrMetaRecord(defer, meta_record) {

						var relations = {
							rm_subject_record_id: parseInt(meta_record.rm_asset_id),
							subject_record_id: null, 
							subject_record_type: meta_record.record_type
						}

						if( relations.subject_record_type == 'Machine' ) {
							relations.subject_record_type = 'asset';
						}

						if( relations.subject_record_type == 'Site' ) {
							relations.subject_record_type = 'site';
						}

						if( relations.subject_record_type == 'Building' ) {
							relations.subject_record_type = 'building';
						}

						if( relations.subject_record_type == 'Area' ) {
							relations.subject_record_type = 'area';
						}

						factory.dbUtils.mr_meta.findMrSubjectRecordId(relations.rm_subject_record_id, relations.subject_record_type).then(function(record_id) {

							// SET LOCAL REGISTER SUBJECT ID
							relations.subject_record_id = record_id;

							coreDownloadFactory.dbUtils.mr_meta.saveMrMetaRecord(meta_record, relations).then(function(saved_meta) {
									
								// INCREMENT INSTALLED ITEMS
								factory.utils.incrementInstalledItems();

								active_index++;

								// IF SAVED ALL MR META
								if( active_index > meta.length - 1 ) {
									defer.resolve();
									return defer.promise;
								};

								$timeout(function() {
									saveMrMetaRecord(defer, meta[active_index]);
								}, factory.utils.save_timeout);

							}, function(error) {
								defer.reject(error);
							});

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				findMrSubjectRecordId: function(rm_id, record_type) {
					var defer = $q.defer();

					var record_id = null;
					var key_value_pair_record_type = 'register_assets';
					var db = 'register_assets';

					console.log(record_type);

					// if( record_type == 'asset' ) {
					// 	key_value_pair_record_type = 'register_assets';
					// 	db = 'register_assets';
					// }

					// if( record_type == 'site' ) {
					// 	key_value_pair_record_type = 'register_sites';
					// 	db = 'sites';
					// }

					// if( record_type == 'building' ) {
					// 	key_value_pair_record_type = 'register_buildings';
					// 	db = 'buildings';
					// }

					// if( record_type == 'area' ) {
					// 	key_value_pair_record_type = 'register_areas';
					// 	db = 'areas';
					// }

					if( !db || !key_value_pair_record_type ) {
						defer.resolve(null);
						return defer.promise;
					}

					record_id = factory.utils.getValueFromKey(key_value_pair_record_type, rm_id, 'db_id');

					if( record_id ) {
						console.log("HERE 1");
						defer.resolve(record_id);
					} else {
						defer.resolve(null);
					}

					// riskmachDatabasesFactory.databases.collection[db].find({
					// 	selector: {
					// 		table: db,
					// 		company_id: authFactory.getActiveCompanyId(),
					// 		user_id: authFactory.cloudUserId(), 
					// 		rm_id: rm_id
					// 	},
					// 	limit: 1
					// }).then(function(result) {
						
					// 	console.log("HERE 2");
					// 	console.log(result.docs);

					// 	if( result.docs.length == 0 ) {
					// 		defer.resolve(null);
					// 	} else {
					// 		defer.resolve(result.docs[0]._id);
					// 	}

					// }).catch(function(error) {
					// 	defer.reject(error);
					// });

					return defer.promise;
				}
			},
			qr_register: {
				saveQrRegisterBatch: function(qr_codes) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					qr_codes = JSON.parse(qr_codes);

					console.log("SAVE QR REGISTER");

					// IF NO DATA TO SAVE
					if( qr_codes.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveQrRecord(save_defer, qr_codes[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveQrRecord(defer, qr_record) {

						// SET LOCAL REGISTER ASSET ID
						qr_record.record_id = factory.utils.getValueFromKey('register_assets', qr_record.rm_record_id, 'db_id');

						coreDownloadFactory.dbUtils.qr_register.doSaveQrRecord(qr_record).then(function(saved_qr) {
								
							// INDEX ON ASSET
							coreDownloadFactory.dbUtils.register_assets.indexQrRecordOnCoreAsset(saved_qr).then(function() {

								// INCREMENT INSTALLED ITEMS
								factory.utils.incrementInstalledItems();

								active_index++;

								// IF SAVED ALL QR CODES
								if( active_index > qr_codes.length - 1 ) {
									defer.resolve();
									return defer.promise;
								};

								$timeout(function() {
									saveQrRecord(defer, qr_codes[active_index]);
								}, factory.utils.save_timeout);

							}, function(error) {
								defer.reject(error);
							});

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			projects: {
				saveProjectBatch: function(projects) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					projects = JSON.parse(projects);

					// IF NO DATA TO SAVE
					if( projects.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveProjectRecord(save_defer, projects[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveProjectRecord(defer, project_record) {

						projectDownloadFactory.dbUtils.projects.saveProjectRecord(project_record).then(function(saved_project) {

							// STORE RM ID - LOCAL ID KEY VALUE PAIR
							factory.utils.storeIdKey(saved_project._id, saved_project.rm_id, 'db_id');

							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							active_index++;

							// IF SAVED ALL SITES
							if( active_index > projects.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveProjectRecord(defer, projects[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			snapshot_assets: {
				saveSnapshotAssetsBatch: function(assets) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					assets = JSON.parse(assets);

					// IF NO DATA TO SAVE
					if( assets.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveSnapshotAssetRecord(save_defer, assets[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveSnapshotAssetRecord(defer, asset_record) {

						// SET LOCAL PROJECT ID
						asset_record.project_id = factory.utils.getValueFromKey('projects', asset_record.rm_project_id, 'db_id');

						// SET LOCAL PARENT ASSET ID
						asset_record.parent_asset_id = factory.utils.getValueFromKey('snapshot_assets', asset_record.rm_parent_asset_id, 'db_id');

						projectDownloadFactory.dbUtils.snapshot_assets.saveSnapshotAssetRecord(asset_record).then(function(saved_asset) {

							// STORE RMID - LOCAL ID KEY VALUE PAIRS
							factory.utils.storeIdKey(saved_asset._id, saved_asset.rm_id, 'db_id');
									
							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							active_index++;

							// IF SAVED ALL ASSETS
							if( active_index > assets.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveSnapshotAssetRecord(defer, assets[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			tasks: {
				saveTaskBatch: function(tasks) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					tasks = JSON.parse(tasks);

					// IF NO DATA TO SAVE
					if( tasks.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveTaskRecord(save_defer, tasks[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveTaskRecord(defer, task_record) {

						// SET LOCAL PROJECT ID
						task_record.activity_id = factory.utils.getValueFromKey('projects', task_record.rm_activity_id, 'db_id');
						// SET LOCAL ASSET ID
						task_record.asset_id = factory.utils.getValueFromKey('snapshot_assets', task_record.rm_asset_id, 'db_id');
						// SET LOCAL PARENT TASK ID
						task_record.parent_task_id = factory.utils.getValueFromKey('tasks', task_record.rm_parent_task_id, 'db_id');
						// SET LOCAL PROCEDURE ID
						task_record.procedure_id = factory.utils.getValueFromKey('tasks', task_record.rm_procedure_id, 'db_id');

						projectDownloadFactory.dbUtils.tasks.saveTaskRecord(task_record).then(function(saved_task) {

							// STORE RMID - LOCAL ID KEY VALUE PAIRS
							factory.utils.storeIdKey(saved_task._id, saved_task.rm_id, 'db_id');

							// STORE RMREF - LOCAL ID KEY VALUE PAIRS
							factory.utils.storeRefKey(saved_task._id, saved_task.rm_ref, 'db_id');

							// IF INCOMPLETE VALUES FOR SECTION/STEP, STORE ID
							if( (!task_record.procedure_id || !task_record.parent_task_id) && task_record.task_type != 'procedure') {
								factory.utils.storeIncompleteId(saved_task._id);
							}
							
							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							active_index++;

							// IF SAVED ALL TASKS
							if( active_index > tasks.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveTaskRecord(defer, tasks[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			mr_hazards: {
				saveMrHazardBatch: function(hazards) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					hazards = JSON.parse(hazards);

					// IF NO DATA TO SAVE
					if( hazards.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveHazardRecord(save_defer, hazards[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveHazardRecord(defer, hazard_record) {

						// SET LOCAL PROJECT ID
						hazard_record.activity_id = factory.utils.getValueFromKey('projects', hazard_record.rm_activity_id, 'db_id');
						// SET LOCAL ASSET ID
						hazard_record.asset_id = factory.utils.getValueFromKey('snapshot_assets', hazard_record.rm_asset_id, 'db_id');
						// SET LOCAL TASK ID
						hazard_record.task_id = factory.utils.getValueFromRefKey('tasks', hazard_record.rm_task_ref, 'db_id');

						projectDownloadFactory.dbUtils.mr_hazards.saveHazardRecord(hazard_record).then(function(saved_hazard) {

							// STORE RMREF - LOCAL ID KEY VALUE PAIRS
							factory.utils.storeIdKey(saved_hazard._id, saved_hazard.rm_ref, 'db_id');
									
							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							if( parseInt(hazard_record.status) == 1 ) {
								var num_hazards = factory.utils.getValueFromRefKey('tasks', hazard_record.rm_task_ref, 'num_hazards');
								if( num_hazards == null ) {
									num_hazards = 1;
								} else {
									num_hazards++;
								}

								// STORE NUM HAZARDS
								factory.utils.updateRefKeyValue('tasks', hazard_record.rm_task_ref, 'num_hazards', num_hazards);
							}

							if( parseInt(hazard_record.status) == 1 && hazard_record.hazard_considered == 'Yes' ) {
								var num_hazards_complete = factory.utils.getValueFromRefKey('tasks', hazard_record.rm_task_ref, 'num_hazards_complete');
								if( num_hazards_complete == null ) {
									num_hazards_complete = 1;
								} else {
									num_hazards_complete++;
								}

								// STORE NUM HAZARDS COMPLETE
								factory.utils.updateRefKeyValue('tasks', hazard_record.rm_task_ref, 'num_hazards_complete', num_hazards_complete);
							}

							active_index++;

							// IF SAVED ALL HAZARDS
							if( active_index > hazards.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveHazardRecord(defer, hazards[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			mr_controls: {
				saveMrControlBatch: function(controls) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					controls = JSON.parse(controls);

					// IF NO DATA TO SAVE
					if( controls.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveControlRecord(save_defer, controls[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveControlRecord(defer, control_record) {

						// SET LOCAL PROJECT ID
						control_record.activity_id = factory.utils.getValueFromKey('projects', control_record.rm_activity_id, 'db_id');
						// SET LOCAL ASSET ID
						control_record.asset_id = factory.utils.getValueFromKey('snapshot_assets', control_record.rm_asset_id, 'db_id');
						// SET LOCAL TASK ID
						if( control_record.rm_task_ref != null && control_record.rm_task_ref != '' ) {
							control_record.task_id = factory.utils.getValueFromRefKey('tasks', control_record.rm_task_ref, 'db_id');
						}

						projectDownloadFactory.dbUtils.mr_controls.saveControlRecord(control_record).then(function(saved_control) {

							// STORE RMREF - LOCAL ID KEY VALUE PAIRS
							factory.utils.storeIdKey(saved_control._id, saved_control.rm_ref, 'db_id');
							
							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							active_index++;

							// IF SAVED ALL CONTROLS
							if( active_index > controls.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveControlRecord(defer, controls[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			hazard_control_relations: {
				saveHazardControlRelationsBatch: function(relations) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					relations = JSON.parse(relations);

					// IF NO DATA TO SAVE
					if( relations.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveRelationRecord(save_defer, relations[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveRelationRecord(defer, relation_record) {

						// SET LOCAL PROJECT ID
						relation_record.activity_id = factory.utils.getValueFromKey('projects', relation_record.rm_activity_id, 'db_id');
						// SET LOCAL ASSET ID
						relation_record.asset_id = factory.utils.getValueFromKey('snapshot_assets', relation_record.rm_asset_id, 'db_id');
						// SET LOCAL HAZARD ID
						relation_record.hazard_id = factory.utils.getValueFromKey('mr_hazards', relation_record.rm_hazard_ref, 'db_id');
						// SET LOCAL CONTROL ID
						relation_record.control_item_id = factory.utils.getValueFromKey('mr_controls', relation_record.rm_control_item_ref, 'db_id');

						projectDownloadFactory.dbUtils.hazard_control_relations.saveHazardControlRelation(relation_record).then(function(saved_relation) {

							// STORE RMID - LOCAL ID KEY VALUE PAIRS
							// factory.utils.storeIdKey(saved_relation._id, saved_relation.rm_id);
							
							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							active_index++;

							// IF SAVED ALL CONTROLS
							if( active_index > relations.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveRelationRecord(defer, relations[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			media_records: {
				saveProjectMediaBatch: function(media) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					media = JSON.parse(media);

					// IF NO DATA TO SAVE
					if( media.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveMediaRecord(save_defer, media[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveMediaRecord(defer, media_record) {

						// IF ACTIVE DESTINATION, SAVE MEDIA TO THAT LOCATION
						if( projectDownloadFactory.download_setup.dest.active_dest ) {
							// SET LOCAL PROJECT ID AS DEST PROJECT
							media_record.activity_id = projectDownloadFactory.download_setup.dest.project_id;
						} else {
							// SET LOCAL ACTIVITY ID
							media_record.activity_id = factory.utils.getValueFromKey('projects', media_record.rm_activity_id, 'db_id');
						}

						if( media_record.record_type == 'asset' ) {
							// SET LOCAL ASSET ID
							media_record.record_id = factory.utils.getValueFromKey('snapshot_assets', media_record.rm_record_item_id, 'db_id');
						};

						if( media_record.record_type == 'task' ) {
							// SET LOCAL TASK ID
							media_record.record_id = factory.utils.getValueFromRefKey('tasks', media_record.rm_record_item_ref, 'db_id');
						};

						if( media_record.record_type == 'assessment_hazard' ) {
							// SET LOCAL HAZARD ID
							media_record.record_id = factory.utils.getValueFromKey('mr_hazards', media_record.rm_record_item_ref, 'db_id');
						};

						if( media_record.record_type == 'control_item' ) {
							// SET LOCAL CONTROL ID
							media_record.record_id = factory.utils.getValueFromKey('mr_controls', media_record.rm_record_item_ref, 'db_id');
						};

						if( media_record.record_type == 'assessment' ) {
							// SET LOCAL RISK ASSESSMENT ID
							media_record.record_id = factory.utils.getValueFromRefKey('assessments', media_record.rm_record_item_ref, 'db_id');

							var rm_item_id = factory.utils.getValueFromRefKey('assessments', media_record.rm_record_item_ref, 'rm_id');
							if( rm_item_id != media_record.rm_record_item_id ) {
								media_record.item_not_found = 'Yes';
							}
						}

						projectDownloadFactory.dbUtils.media_records.saveMediaRecord(media_record).then(function(saved_media) {

							// STORE RMID - LOCAL ID KEY VALUE PAIRS
							factory.utils.storeIdKey(saved_media._id, saved_media.rm_ref, 'db_id');
									
							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							// IF LIVE MEDIA RECORD, UPDATE NUM FILES
							if( parseInt(media_record.status) == 1 ) {

								var num_files = null;

								// UPDATE ASSET NUM FILES
								if( media_record.record_type == 'asset' ) {
									num_files = factory.utils.getValueFromKey('snapshot_assets', media_record.rm_record_item_id, 'num_files');
									if( num_files == null ) {
										num_files = 1;
									} else {
										num_files++;
									}

									// STORE NUM FILES
									factory.utils.updateKeyValue('snapshot_assets', media_record.rm_record_item_id, 'num_files', num_files);
								}

								console.log("MEDIA RECORD VALUES");
								console.log(media_record);

								// UPDATE TASK NUM FILES
								if( media_record.record_type == 'task' ) {

									// IF IMAGE
									if( (media_record.is_video == false || media_record.is_video == 'No') && (media_record.is_audio == false || media_record.is_audio == 'No') ) {
										num_files = factory.utils.getValueFromRefKey('tasks', media_record.rm_record_item_ref, 'num_files');
										if( num_files == null ) {
											num_files = 1;
										} else {
											num_files++;
										}
									}

									// STORE NUM FILES
									factory.utils.updateRefKeyValue('tasks', media_record.rm_record_item_ref, 'num_files', num_files);
									if( media_record.is_video == true || media_record.is_video == 'Yes' ) {
										factory.utils.updateRefKeyValue('tasks', media_record.rm_record_item_ref, 'video_media_id', saved_media._id);
									}
									if( media_record.is_audio == true || media_record.is_audio == 'Yes' ) {
										factory.utils.updateRefKeyValue('tasks', media_record.rm_record_item_ref, 'audio_media_id', saved_media._id);
									}
									if( media_record.is_signature == 'Yes' ) {
										factory.utils.updateRefKeyValue('tasks', media_record.rm_record_item_ref, 'signature_id', saved_media._id);
									}
								}

								// UPDATE HAZARD NUM FILES
								if( media_record.record_type == 'assessment_hazard' ) {
									num_files = factory.utils.getValueFromKey('mr_hazards', media_record.rm_record_item_ref, 'num_files');
									if( num_files == null ) {
										num_files = 1;
									} else {
										num_files++;
									}

									// STORE NUM FILES
									factory.utils.updateKeyValue('mr_hazards', media_record.rm_record_item_ref, 'num_files', num_files);
								}

								// UPDATE CONTROL NUM FILES
								if( media_record.record_type == 'control_item' ) {
									num_files = factory.utils.getValueFromKey('mr_controls', media_record.rm_record_item_ref, 'num_files');
									if( num_files == null ) {
										num_files = 1;
									} else {
										num_files++;
									}

									// STORE NUM FILES
									factory.utils.updateKeyValue('mr_controls', media_record.rm_record_item_ref, 'num_files', num_files);
								}

								// UPDATE RISK ASSESSMENT NUM FILES
								if( media_record.record_type == 'assessment' && media_record.item_not_found == null ) {
									num_files = factory.utils.getValueFromRefKey('assessments', media_record.rm_record_item_ref, 'num_files');
									if( num_files == null ) {
										num_files = 1;
									} else {
										num_files++;
									}

									// STORE NUM FILES
									factory.utils.updateRefKeyValue('assessments', media_record.rm_record_item_ref, 'num_files', num_files);

									// FIND RISK PROFILE IMG ID
									var risk_profile_img_id = factory.utils.getValueFromRefKey('assessments', media_record.rm_record_item_ref, 'rm_profile_img_id');

									// IF RISK HAS PROFILE IMG AND MATCHES CURRENT MEDIA RECORD
									if( risk_profile_img_id && media_record.rm_id == risk_profile_img_id ) {
										factory.utils.updateRefKeyValue('assessments', media_record.rm_record_item_ref, 'local_profile_img_id', saved_media._id);
									}
 								}

							}

							active_index++;

							// IF SAVED ALL MEDIA
							if( active_index > media.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveMediaRecord(defer, media[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			checklist_instances: {
				saveChecklistInstancesBatch: function(checklists) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					checklists = JSON.parse(checklists);

					// IF NO DATA TO SAVE
					if( checklists.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveChecklistInstanceRecord(save_defer, checklists[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveChecklistInstanceRecord(defer, checklist_record) {

						// IF ACTIVE DESTINATION, SAVE CHECKLIST INSTANCE TO THAT LOCATION
						if( projectDownloadFactory.download_setup.dest.active_dest ) {
							// SET LOCAL PROJECT ID AS DEST PROJECT
							checklist_record.activity_id = projectDownloadFactory.download_setup.dest.project_id;
							// SET LOCAL ASSET ID AS DEST ASSET
							checklist_record.asset_id = projectDownloadFactory.download_setup.dest.asset_id;
						} else {
							// SET LOCAL PROJECT ID
							checklist_record.activity_id = factory.utils.getValueFromKey('projects', checklist_record.rm_activity_id, 'db_id');
							// SET LOCAL ASSET ID
							checklist_record.asset_id = factory.utils.getValueFromKey('snapshot_assets', checklist_record.rm_asset_id, 'db_id');
						}

						projectDownloadFactory.dbUtils.checklist_instances.saveChecklistInstanceRecord(checklist_record).then(function(saved_checklist) {

							// STORE RMID - LOCAL ID KEY VALUE PAIRS
							factory.utils.storeIdKey(saved_checklist._id, saved_checklist.rm_id, 'db_id');

							// IF DRAFT OR LIVE CHECKLIST, STORE ACTIVE CHECKLIST ID ON PARENT ASSET
							if( saved_checklist.status == 1 || saved_checklist.status == 2 ) {
								// factory.utils.storeIdKey(saved_checklist._id, saved_checklist.asset_id, 'active_checklist_id');
								factory.utils.updateKeyValue('snapshot_assets', saved_checklist.rm_asset_id, 'active_checklist_id', saved_checklist._id);
							}

							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							active_index++;

							// IF SAVED ALL CHECKLISTS
							if( active_index > checklists.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveChecklistInstanceRecord(defer, checklists[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			checklist_instances_json: {
				saveChecklistInstanceJsonRecord: function(checklist_instance) {
					var defer = $q.defer();

					// PARSE FETCH ITEM DATA
					checklist_instance = JSON.parse(checklist_instance);
					// checklist_instance.UAuditInstanceData = JSON.parse(checklist_instance.UAuditInstanceData);

					// SET LOCAL CHECKLIST RECORD ID
					checklist_instance.app_checklist_instance_id = factory.utils.getValueFromKey('checklist_instances', checklist_instance.ChecklistRecordID, 'db_id');

					// IF ACTIVE DESTINATION, SAVE CHECKLIST INSTANCE TO THAT LOCATION
					if( projectDownloadFactory.download_setup.dest.active_dest ) {
						// SET LOCAL ASSET ID AS DEST ASSET
						checklist_instance.asset_id = projectDownloadFactory.download_setup.dest.asset_id;
					} else {
						// SET LOCAL ASSET ID
						checklist_instance.asset_id = factory.utils.getValueFromKey('snapshot_assets', checklist_instance.AssetID, 'db_id');
					}

					projectDownloadFactory.dbUtils.checklist_instances_json.saveUAuditInstanceJsonRecord(checklist_instance).then(function(saved_json_record) {

						factory.dbUtils.checklist_instances_json.saveUAuditResponseMedia(checklist_instance, saved_json_record).then(function() {

							factory.dbUtils.checklist_instances_json.updateUAuditAnswerSetupMedia(checklist_instance, saved_json_record).then(function() {
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
				saveUAuditResponseMedia: function(checklist_instance, checklist_instance_json_record) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var uaudit_json = null;
					var data_parse = rmUtilsFactory.tryParseObject(checklist_instance.UAuditInstanceData);
					if( data_parse ) {
						uaudit_json = data_parse;
					} else {
						uaudit_json = checklist_instance.UAuditInstanceData;
					}

					// CLEAN UP
					data_parse = null;

					// var uaudit_json = JSON.parse(checklist_instance.UAuditInstanceData);
					// var uaudit_json = checklist_instance.UAuditInstanceData;

					var media = factory.utils.collectUAuditResponseMedia(uaudit_json);

					var active_index = 0;

					// IF NO DATA TO SAVE
					if( !media || media.length == 0 ) {

						// CLEAN UP
						uaudit_json = null;
						media = null;

						defer.resolve();
						return defer.promise;
					};

					saveMediaRecord(save_defer, media[active_index]).then(function() {

						// UPDATE UAUDIT JSON WITH MEDIA AND THEN RE-SAVE UAUDIT JSON RECORD
						factory.utils.updateUAuditMediaJsonWithDbRecords(uaudit_json, media);

						checklist_instance_json_record.uaudit_instance_data = JSON.stringify(uaudit_json);

						projectDownloadFactory.dbUtils.checklist_instances_json.saveUpdatedJson(checklist_instance_json_record).then(function() {
							
							// CLEAN UP
							uaudit_json = null;
							media = null;

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					function saveMediaRecord(defer, media_record) {

						// IF ACTIVE DESTINATION, SAVE MEDIA TO THAT LOCATION
						if( projectDownloadFactory.download_setup.dest.active_dest ) {
							// SET LOCAL PROJECT ID AS DEST PROJECT
							media_record.activity_id = projectDownloadFactory.download_setup.dest.project_id;
						} else {
							// SET LOCAL ACTIVITY ID
							// media_record.activity_id = factory.utils.getValueFromKey('projects', media_record.rm_activity_id, 'db_id');
							media_record.activity_id = projectDownloadFactory.download_setup.active.project_id;
						}

						// SET CHECKLIST INSTANCE ID
						media_record.checklist_instance_id = factory.utils.getValueFromKey('checklist_instances', checklist_instance.ChecklistRecordID, 'db_id');

						// SET CHECKLIST INSTANCE JSON RECORD ID
						media_record.checklist_instance_json_id = checklist_instance_json_record._id;

						// SET TO ISUAUDIT
						media_record.is_uaudit = 'Yes';

						// REMOVE RM RECORD PROPERTY - WILL CREATE THIS IN SAVE
						if( media_record.hasOwnProperty('rm_record') ) {
							delete media_record.rm_record;
						}

						projectDownloadFactory.dbUtils.media_records.saveMediaRecord(media_record).then(function(saved_media) {

							// UPDATE MEDIA IN ARRAY
							media[active_index] = saved_media;

							// STORE RMID - LOCAL ID KEY VALUE PAIRS
							// factory.utils.storeIdKey(saved_media._id, saved_media.rm_ref, 'db_id');
							
							// INCREMENT INSTALLED ITEMS
							// factory.utils.incrementInstalledItems();

							active_index++;

							// IF SAVED ALL MEDIA
							if( active_index > media.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveMediaRecord(defer, media[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				updateUAuditAnswerSetupMedia: function(checklist_instance, checklist_instance_json_record) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var uaudit_json = null;
					var data_parse = rmUtilsFactory.tryParseObject(checklist_instance_json_record.uaudit_instance_data);
					if( data_parse ) {
						uaudit_json = data_parse;
					} else {
						uaudit_json = checklist_instance_json_record.uaudit_instance_data;
					}

					// CLEAN UP
					data_parse = null;

					// var uaudit_json = JSON.parse(checklist_instance_json_record.uaudit_instance_data);
					// var uaudit_json = checklist_instance_json_record.uaudit_instance_data;

					var media = factory.utils.collectUAuditQuestionAnswerSetupMedia(uaudit_json);

					console.log("COLLECTED UAUDIT ANSWER SETUP MEDIA");

					var active_index = 0;

					// IF NO DATA TO SAVE
					if( media.length == 0 ) {

						// CLEAN UP
						uaudit_json = null;
						media = null;

						defer.resolve();
						return defer.promise;
					};

					projectDownloadFactory.dbUtils.media_records.existingUAuditAnswerSetupMedia().then(function(existing_media) {

						getMediaRecord(save_defer, media[active_index]).then(function() {

							// CLEAN UP
							existing_media = null;

							// UPDATE UAUDIT JSON WITH MEDIA AND THEN RE-SAVE UAUDIT JSON RECORD
							factory.utils.updateUAuditAnswerSetupMediaWithDbRecords(uaudit_json, media);

							checklist_instance_json_record.uaudit_instance_data = JSON.stringify(uaudit_json);

							projectDownloadFactory.dbUtils.checklist_instances_json.saveUpdatedJson(checklist_instance_json_record).then(function() {
								
								// CLEAN UP
								uaudit_json = null;
								media = null;

								defer.resolve();

							}, function(error) {
								defer.reject(error);
							});

						}, function(error) {
							defer.reject(error);
						});

						function getMediaRecord(defer, media_record) {

							projectDownloadFactory.dbUtils.media_records.findUAuditAnswerSetupMediaRecord(media_record, existing_media).then(function(fetched_media_record) {

								console.log("UAUDIT ANSWER SETUP MEDIA RECORD");
								console.log( JSON.stringify(fetched_media_record, null, 2) );

								// UPDATE MEDIA IN ARRAY
								media[active_index] = angular.copy(fetched_media_record);
								// CLEAN UP
								fetched_media_record = null;

								active_index++;

								// IF SAVED ALL MEDIA
								if( active_index > media.length - 1 ) {
									defer.resolve();
									return defer.promise;
								};

								$timeout(function() {
									getMediaRecord(defer, media[active_index]);
								}, factory.utils.save_timeout);

							}, function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			checklist_question_records: {
				saveChecklistQuestionRecordsBatch: function(questions) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					questions = JSON.parse(questions);

					// IF NO DATA TO SAVE
					if( questions.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveChecklistQuestionRecord(save_defer, questions[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveChecklistQuestionRecord(defer, question_record) {

						// SET LOCAL CHECKLIST RECORD ID
						question_record.checklist_record_id = factory.utils.getValueFromKey('checklist_instances', question_record.rm_checklist_record_id, 'db_id');

						projectDownloadFactory.dbUtils.checklist_question_records.saveChecklistQuestionRecord(question_record).then(function(saved_question) {

							// STORE RMREF - LOCAL ID KEY VALUE PAIRS
							factory.utils.storeIdKey(saved_question._id, saved_question.rm_id, 'db_id');
							
							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							active_index++;

							// IF SAVED ALL QUESTIONS
							if( active_index > questions.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveChecklistQuestionRecord(defer, questions[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			assessments: {
				saveRiskAssessmentsBatch: function(assessments) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					assessments = JSON.parse(assessments);

					// IF NO DATA TO SAVE
					if( assessments.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveAssessmentRecord(save_defer, assessments[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveAssessmentRecord(defer, assessment_record) {

						// IF ACTIVE DESTINATION, SAVE RISKS TO THAT LOCATION
						if( projectDownloadFactory.download_setup.dest.active_dest ) {
							// SET LOCAL PROJECT ID AS DEST PROJECT
							assessment_record.activity_id = projectDownloadFactory.download_setup.dest.project_id;
							// SET LOCAL ASSET ID AS DEST ASSET
							assessment_record.asset_id = projectDownloadFactory.download_setup.dest.asset_id;
						} else {
							// SET LOCAL PROJECT ID FROM SAVED PROJECT
							assessment_record.activity_id = factory.utils.getValueFromKey('projects', assessment_record.rm_activity_id, 'db_id');
							// SET LOCAL ASSET ID FROM SAVED ASSETS
							assessment_record.asset_id = factory.utils.getValueFromKey('snapshot_assets', assessment_record.rm_asset_id, 'db_id');
						}

						projectDownloadFactory.dbUtils.assessments.saveRiskAssessmentRecord(assessment_record).then(function(saved_assessment) {

							// STORE RMREF - LOCAL ID KEY VALUE PAIRS
							factory.utils.storeRefKey(saved_assessment._id, saved_assessment.rm_ref, 'db_id');
							// STORE RMREF - RMID KEY VALUE PAIRS
							factory.utils.storeRefKey(saved_assessment.rm_id, saved_assessment.rm_ref, 'rm_id');
							// STORE RMID - LOCAL ID KEY VALUE PAIRS
							factory.utils.storeIdKey(saved_assessment._id, saved_assessment.rm_id, 'db_id');
							// STORE RMPROFILEIMGID IF THERE IS ONE
							if( saved_assessment.hasOwnProperty('rm_risk_profile_photo_id') && saved_assessment.rm_risk_profile_photo_id ) {
								factory.utils.storeRefKey(saved_assessment.rm_risk_profile_photo_id, saved_assessment.rm_ref, 'rm_profile_img_id');
							}
							// STORE RMSUGGESTEDRISKID IF THERE IS ONE
							if( saved_assessment.hasOwnProperty('rm_suggested_risk_id') && saved_assessment.rm_suggested_risk_id ) {
								factory.utils.storeRefKey(saved_assessment.rm_suggested_risk_id, saved_assessment.rm_ref, 'rm_suggested_risk_id');
							}
							
							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							active_index++;

							// IF SAVED ALL ASSESSMENTS
							if( active_index > assessments.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveAssessmentRecord(defer, assessments[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			ra_question_relations: {
				saveQuestionAssessmentRelationsBatch: function(relations) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					relations = JSON.parse(relations);

					// IF NO DATA TO SAVE
					if( relations.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveRelationRecord(save_defer, relations[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveRelationRecord(defer, relation_record) {

						// SET LOCAL PROJECT ID
						// relation_record.activity_id = factory.utils.getValueFromKey('projects', relation_record.rm_activity_id, 'db_id');
						// SET LOCAL ASSET ID
						// relation_record.asset_id = factory.utils.getValueFromKey('snapshot_assets', relation_record.rm_asset_id, 'db_id');
						// SET LOCAL CHECKLIST ID
						relation_record.checklist_record_id = factory.utils.getValueFromKey('checklist_instances', relation_record.rm_checklist_record_id, 'db_id');
						// SET LOCAL QUESTION ID
						relation_record.question_record_id = factory.utils.getValueFromKey('checklist_question_records', relation_record.rm_question_record_id, 'db_id');
						// SET LOCAL ASSESSMENT ID
						relation_record.assessment_id = factory.utils.getValueFromRefKey('assessments', relation_record.rm_assessment_ref, 'db_id');

						// IF THE ASSESSMENT IS NOT IN THE DOWNLOAD, DON'T SAVE THE RELATION RECORD
						if( !relation_record.assessment_id ) {
							console.log("COULD NOT SAVE RELATION - NO ASSESSMENT PRESENT");

							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							active_index++;

							// IF SAVED ALL RELATIONS
							if( active_index > relations.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveRelationRecord(defer, relations[active_index]);
							}, factory.utils.save_timeout);

							return defer.promise;
						}

						projectDownloadFactory.dbUtils.question_assessment_relations.saveQuestionAssessmentRelationRecord(relation_record).then(function(saved_relation) {
							
							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							active_index++;

							// IF SAVED ALL RELATIONS
							if( active_index > relations.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveRelationRecord(defer, relations[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			ra_control_item_relations: {
				saveAssessmentControlRelationsBatch: function(relations) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					relations = JSON.parse(relations);

					// IF NO DATA TO SAVE
					if( relations.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveRelationRecord(save_defer, relations[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveRelationRecord(defer, relation_record) {

						// IF ACTIVE DESTINATION, SAVE RISKS TO THAT LOCATION
						if( projectDownloadFactory.download_setup.dest.active_dest ) {
							// SET LOCAL PROJECT ID AS DEST PROJECT
							relation_record.activity_id = projectDownloadFactory.download_setup.dest.project_id;
							// SET LOCAL ASSET ID AS DEST ASSET
							relation_record.asset_id = projectDownloadFactory.download_setup.dest.asset_id;
						} else {
							// SET LOCAL PROJECT ID
							relation_record.activity_id = factory.utils.getValueFromKey('projects', relation_record.rm_activity_id, 'db_id');
							// SET LOCAL ASSET ID
							relation_record.asset_id = factory.utils.getValueFromKey('snapshot_assets', relation_record.rm_asset_id, 'db_id');
						}
						
						// SET LOCAL CONTROL ID
						relation_record.control_item_id = factory.utils.getValueFromKey('mr_controls', relation_record.rm_control_item_ref, 'db_id');
						// SET LOCAL ASSESSMENT ID
						relation_record.assessment_id = factory.utils.getValueFromRefKey('assessments', relation_record.rm_assessment_ref, 'db_id');

						projectDownloadFactory.dbUtils.assessment_control_relations.saveAssessmentControlRelationRecord(relation_record).then(function(saved_relation) {
							
							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							active_index++;

							// IF SAVED ALL RELATIONS
							if( active_index > relations.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveRelationRecord(defer, relations[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			qc_check_records: {
				saveQcCheckRecordsBatch: function(qc_data) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					qc_data = JSON.parse(qc_data);

					// check_records = JSON.parse(check_records);

					// IF REVIEW RECORD, SET ACTIVE REVIEW ID
					if( qc_data && qc_data.hasOwnProperty('review_record') && qc_data.review_record ) {
						projectDownloadFactory.download_setup.active.qc.setQcReviewId(qc_data.review_record.ID);
					}

					// IF NO DATA TO SAVE
					if( !qc_data.check_records || qc_data.check_records.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveQcCheckRecord(save_defer, qc_data.check_records[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveQcCheckRecord(defer, check_record) {

						// SET LOCAL PROJECT ID
						check_record.activity_id = projectDownloadFactory.download_setup.active.project_id;

						// SET LOCAL ASSESSMENT ID
						check_record.assessment_id = factory.utils.getValueFromRefKey('assessments', check_record.AssessmentRef, 'db_id');

						projectDownloadFactory.dbUtils.qc_check_records.saveQcCheckRecord(check_record).then(function(saved_record) {

							// STORE RMID - LOCAL ID KEY VALUE PAIRS
							// factory.utils.storeIdKey(saved_record._id, saved_record.ID, 'db_id');
									
							// INCREMENT INSTALLED ITEMS
							factory.utils.incrementInstalledItems();

							active_index++;

							// IF SAVED ALL CHECK RECORDS
							if( active_index > qc_data.check_records.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveQcCheckRecord(defer, qc_data.check_records[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			project_contributors: {
				indexProjectContributors: function(rasic_data) {
					var defer = $q.defer();

					rasic_data = JSON.parse(rasic_data);

					projectDownloadFactory.dbUtils.project_contributors.indexProjectContributors(rasic_data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			}
		}

		factory.collect = {
			nextFetchItem: function(defer, fetch_record) {

				if( fetch_record.date_fetched != null ) {
					// DATA ALREADY COLLECTED
					// PROCEED TO INSTALL
					defer.resolve();
					return defer.promise;
				};

				if( factory.active.fetch_items.length == 0 ) {
					// NO FETCH ITEMS
					defer.resolve();
					return defer.promise;
				};

				var max_index = factory.active.fetch_items.length - 1;
				var active_index = null;
				var active_record = null;

				// IF NOT STARTED, START WITH FIRST FETCH ITEM ELSE GET NEXT ITEM
				if( factory.active.stage.index == null ) {
					active_index = 0;
				} else {
					active_index = factory.active.stage.index + 1;
				};

				// IF FINISHED COLLECTION
				if( active_index > max_index ) {
					// alert("Data collection complete");
					factory.dbUtils.updateFetchRecordStatus(factory.active.fetch_id, 'Fetched').then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
					return defer.promise;
				};

				// IF NO NEXT FETCH ITEM
				if( angular.isUndefined(factory.active.fetch_items[active_index]) ) {
					var error_message = "Unable to find the next stage for collecting data";
					factory.dbUtils.saveFetchRecordError(factory.active.fetch_id, error_message, null, 'Fetching').then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error_message);
					});
					return defer.promise;
				};
				
				// SET NEXT FETCH ITEM AND UPDATE STATUS
				factory.active.fetch_items[active_index].date_started = new Date().getTime();
				factory.active.fetch_items[active_index].status = 'Fetching';
				factory.active.stage.record = factory.active.fetch_items[active_index];
				factory.active.stage.index = active_index;

				factory.dbUtils.updateFetchItemStatus(factory.active.stage.record).then(function() {

					// IF ALREADY FETCHED ITEM DATA, ATTEMPT NEXT FETCH ITEM
					if( factory.active.stage.record.date_fetched != null ) {

						factory.collect.nextFetchItem(defer, fetch_record);

					} else {

						factory.collect.fetchItemData(factory.active.stage.record).then(function() {

							// ATTEMPT NEXT FETCH ITEM
							factory.collect.nextFetchItem(defer, fetch_record);

						}, function(error) {
							defer.reject(error);
						});

					};

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			fetchItemData: function(fetch_item) {
				var defer = $q.defer();

				if( fetch_item.hasOwnProperty('bespoke_fetch') && fetch_item.bespoke_fetch == 'yes' ) {

					if( fetch_item.stage == 'uaudit_content' ) {
						factory.collect.fetchUAuditContent(fetch_item).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});
					}

				} else {

					if( fetch_item.pagination == 'yes' ) {
						factory.collect.fetchItemDataPaginated(fetch_item).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});
					} else {
						factory.collect.fetchItemDataBulk(fetch_item).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});
					}

				}

				return defer.promise;
			},
			fetchItemDataPaginated: function(fetch_item) {
				var defer = $q.defer();
				var request_defer = $q.defer();

				var num_pages_calculated = false;
				var total_items = null;
				var num_pages = null;

				var num_attempts = 1;

				requestFetchItemPage(request_defer).then(function() {

					// UPDATE ACTIVE FETCH ITEM
					var active_index = factory.active.stage.index;
					factory.active.fetch_items[active_index].date_fetched = new Date().getTime();
					factory.active.fetch_items[active_index].status = 'Fetched';
					factory.active.fetch_items[active_index].total_items = total_items;
					// UPDATE ACTIVE STAGE RECORD
					// factory.active.stage.record = factory.active.fetch_items[active_index];
					
					factory.dbUtils.updateFetchItemStatus(factory.active.stage.record).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				function requestFetchItemPage(defer)
				{
					factory.collect.fetchItemPage(fetch_item).then(function(data) {

						if( !num_pages_calculated ) {
							total_items = data.totals.TotalItems;
		                	// CALC NUM PAGES
		                	num_pages = Math.ceil(total_items / fetch_item.params.filters.per_page);
		                	num_pages_calculated = true;
						};

						if( num_pages > 1 ) {

							// IF REQUESTED ALL PAGES
							if( fetch_item.params.filters.page_num > num_pages ) {
								defer.resolve();

								return defer.promise;
							};

							// INCREMENT PAGE NUM
							fetch_item.params.filters.page_num++;
							requestFetchItemPage(defer);

						} else {
							// IF ONLY ONE PAGE, FINISHED COLLECTION
							defer.resolve();
						};

					}, function(error) {

						num_attempts++;

						fetch_item.fetch_error_date = new Date().getTime();
						fetch_item.fetch_error_message = error;

						// IF EXCEEDED ATTEMPT LIMIT, ERROR OUT
						if( num_attempts > factory.utils.attemptLimit(fetch_item.stage) ) {
							factory.dbUtils.saveFetchError(fetch_item, error, 'Data collection').then(function() {
								defer.reject(error);
							}, function(dbError) {
								defer.reject(dbError);
							});

							return defer.promise;
						};

						requestFetchItemPage(defer);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			fetchItemPage: function(fetch_item) {
				var defer = $q.defer();

				factory.collect.requestData(fetch_item.endpoint, fetch_item.params, fetch_item.stage).then(function(data) {

					var page_num = factory.utils.findFetchItemPageNumProperty(fetch_item);

					var data_to_store = null;
					if( fetch_item.stage == 'qc_check_records' ) {
						data_to_store = angular.copy(data);
					} else {
						data_to_store = angular.copy(data.data);
					}

					factory.dbUtils.storeCollectedFetchItemData(data_to_store, fetch_item._id, fetch_item.stage, page_num).then(function() {
						
						if( fetch_item.stage == 'checklist_instances' ) {
							factory.utils.storeUAuditIds(data.data);
						}

						// CLEAN UP
						data_to_store = null;

						defer.resolve(data);

					}, function(error) {
						console.log(error);
						console.log("ERROR STORING COLLECTED FETCH ITEM DATA");
						defer.reject(error);
					});

				}, function(error) {
					console.log(error);
					console.log("ERROR REQUESTING PAGE");
					defer.reject(error);
				});

				return defer.promise;
			},
			fetchItemDataBulk: function(fetch_item) {
				var defer = $q.defer();
				var request_defer = $q.defer();

				var total_items = 0;

				var num_attempts = 0;

				requestFetchItemData(request_defer).then(function() {

					// UPDATE ACTIVE FETCH ITEM
					var active_index = factory.active.stage.index;
					factory.active.fetch_items[active_index].date_fetched = new Date().getTime();
					factory.active.fetch_items[active_index].status = 'Fetched';
					factory.active.fetch_items[active_index].total_items = total_items;
					// UPDATE ACTIVE STAGE RECORD
					// factory.active.stage.record = factory.active.fetch_items[active_index];
					
					factory.dbUtils.updateFetchItemStatus(factory.active.stage.record).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				function requestFetchItemData(defer) {

					factory.collect.fetchItemPage(fetch_item).then(function(data) {

						if( fetch_item.stage == 'qc_check_records' ) {
							total_items = data.total_items;
						} else {
							total_items = data.totals.TotalItems;
						}

						defer.resolve();

					}, function(error) {

						num_attempts++;

						fetch_item.fetch_error_date = new Date().getTime();
						fetch_item.fetch_error_message = error;

						// IF EXCEEDED ATTEMPT LIMIT, ERROR OUT
						if( num_attempts > factory.utils.attemptLimit(fetch_item.stage) ) {
							factory.dbUtils.saveFetchError(fetch_item, error, 'Data collection').then(function() {
								defer.reject(error);
							}, function(dbError) {
								defer.reject(dbError);
							});

							return defer.promise;
						};

						requestFetchItemData(defer);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			fetchUAuditContent: function(fetch_item) {
				var defer = $q.defer();
				var request_defer = $q.defer();

				var num_attempts = 1;

				var checklists_fetch_item = factory.utils.findFetchItem('checklist_instances');
				var checklist_ids = [];
				
				if( checklists_fetch_item.hasOwnProperty('uaudit_ids') && checklists_fetch_item.uaudit_ids ) {
					// checklist_ids = Object.keys(checklists_fetch_item.uaudit_ids);
					checklist_ids = checklists_fetch_item.uaudit_ids;
				}

				console.log("FETCH UAUDIT CONTENT");
				console.log(checklists_fetch_item);
				console.log(checklist_ids);

				var checklist_id_index = 0;
				var total_items = checklist_ids.length;

				requestUAuditContent(request_defer, checklist_id_index).then(function() {

					// UPDATE ACTIVE FETCH ITEM
					var active_index = factory.active.stage.index;
					factory.active.fetch_items[active_index].date_fetched = new Date().getTime();
					factory.active.fetch_items[active_index].status = 'Fetched';
					factory.active.fetch_items[active_index].total_items = total_items;
					
					factory.dbUtils.updateFetchItemStatus(factory.active.stage.record).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				function requestUAuditContent(defer, checklist_id_index)
				{
					if( !checklist_ids.length ) {
						defer.resolve();
						return defer.promise;
					}

					if( checklist_id_index > checklist_ids.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					// fetch_item.params.filters.checklist_record_id = checklist_ids[checklist_id_index];
					fetch_item.params.checklist_record_id = checklist_ids[checklist_id_index];

					factory.collect.fetchItemPage(fetch_item).then(function(data) {
							
						// INCREMENT PAGE NUM TO STORE AGAINST FETCH ITEM DATA SAVE
						fetch_item.request_num++;

						// FETCH UAUDIT CONTENT FOR NEXT CHECKLIST ID
						checklist_id_index++;
						requestUAuditContent(defer, checklist_id_index);

					}, function(error) {

						num_attempts++;

						fetch_item.fetch_error_date = new Date().getTime();
						fetch_item.fetch_error_message = error;

						// IF EXCEEDED ATTEMPT LIMIT, ERROR OUT
						if( num_attempts > factory.utils.attemptLimit(fetch_item.stage) ) {
							factory.dbUtils.saveFetchError(fetch_item, error, 'Data collection').then(function() {
								defer.reject(error);
							}, function(dbError) {
								defer.reject(dbError);
							});

							return defer.promise;
						};

						requestUAuditContent(defer, checklist_id_index);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			requestData: function(endpoint, params, record_type) {
				var defer = $q.defer();

				$http.get(endpoint,{ 
	                params: params
	            })
	            .success(function(data, status, headers, config) {
	            	console.log(record_type + " REQUEST RESPONSE");
	            	console.log(params);
	            	console.log( JSON.stringify(data, null, 2) );

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		defer.resolve(data);
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log(record_type + " ERROR REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );
	                defer.reject("Error connecting to API for " + record_type);
	            });

	            return defer.promise;
			}
		}

		factory.install = {
			installNextFetchItem: function(defer, fetch_record) {

				if( fetch_record.date_installed != null ) {
					// DATA ALREADY INSTALLED
					defer.resolve();
					return defer.promise;
				};

				if( factory.active.fetch_items.length == 0 ) {
					// NO FETCH ITEMS
					defer.resolve();
					return defer.promise;
				};

				var max_index = factory.active.fetch_items.length - 1;
				var active_index = null;
				var active_record = null;

				// IF NOT STARTED, START WITH FIRST FETCH ITEM ELSE GET NEXT ITEM
				if( factory.active.stage.index == null ) {
					active_index = 0;
				} else {
					active_index = factory.active.stage.index + 1;
				};

				// IF FINISHED INSTALL
				if( active_index > max_index ) {
					// alert("Data install complete");
					factory.dbUtils.updateFetchRecordStatus(factory.active.fetch_id, 'Installed').then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
					return defer.promise;
				};

				// IF NO NEXT FETCH ITEM
				if( angular.isUndefined(factory.active.fetch_items[active_index]) ) {
					var error_message = "Unable to find the next stage for installing data";
					factory.dbUtils.saveFetchRecordError(factory.active.fetch_id, error_message, null, 'Installing').then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error_message);
					});
					return defer.promise;
				};
				
				// SET NEXT FETCH ITEM AND UPDATE STATUS
				factory.active.fetch_items[active_index].status = 'Installing';
				factory.active.stage.record = factory.active.fetch_items[active_index];
				factory.active.stage.index = active_index;

				factory.dbUtils.updateFetchItemStatus(factory.active.stage.record).then(function() {

					// IF ALREADY INSTALLED ITEM DATA, ATTEMPT NEXT FETCH ITEM
					if( factory.active.stage.record.date_installed != null ) {

						factory.install.installNextFetchItem(defer, fetch_record);

					} else {

						factory.dbFetch.existingRmDbData(factory.active.stage.record).then(function() {

							factory.install.installFetchItemData(factory.active.stage.record).then(function() {

								factory.utils.resetExistingRmDbData(factory.active.stage.record);

								// ATTEMPT NEXT FETCH ITEM
								factory.install.installNextFetchItem(defer, fetch_record);

							}, function(error) {
								factory.utils.resetExistingRmDbData(factory.active.stage.record);
								defer.reject(error);
							});

						}, function(error) {
							defer.reject(error);
						});

					};

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			installFetchItemData: function(fetch_item) {
				var defer = $q.defer();
				var install_defer = $q.defer();

				var page_num = 1;
				var num_attempts = 1;

				// SET PAGE NUM BASED ON PAGE LAST INSTALLED
				if( factory.active.stage.record.hasOwnProperty('page_last_installed') && factory.active.stage.record.page_last_installed && factory.active.stage.record.page_last_installed > 0 ) {
					page_num = factory.active.stage.record.page_last_installed + 1;
				}

				installFetchItemBatch(install_defer).then(function() {

					// UPDATE ACTIVE FETCH ITEM
					var active_index = factory.active.stage.index;
					factory.active.fetch_items[active_index].date_installed = new Date().getTime();
					factory.active.fetch_items[active_index].status = 'Installed';
					// UPDATE ACTIVE STAGE RECORD
					// var fetch_item = {};
					// angular.copy(factory.active.fetch_items[active_index], fetch_item);
					// factory.active.stage.record = fetch_item;
					factory.dbUtils.updateFetchItemStatus(factory.active.stage.record).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				function installFetchItemBatch(defer) 
				{
					factory.dbFetch.fetchItemDataPage(fetch_item, page_num).then(function(fetch_item_data) {

						// IF NO MORE FETCH ITEM DATA PAGES TO INSTALL
						if( fetch_item_data == null ) {
							// IF JUST FINISHED INSTALLING MEDIA, UPDATE RECORD FILE COUNTS
							// if( fetch_item.stage == 'register_media_records' || fetch_item.stage == 'snapshot_asset_media' || fetch_item.stage == 'task_media' || fetch_item.stage == 'mr_hazard_media' || fetch_item.stage == 'mr_control_media' ) {
							// 	factory.utils.updateRecordsNumFiles().then(function() {
							// 		defer.resolve();
							// 	}, function(error) {
							// 		defer.reject(error);
							// 	});
							// } else {
							// 	defer.resolve();
							// }

							defer.resolve();

							return defer.promise;
						};

						factory.install.installFetchItemDataPage(fetch_item, fetch_item_data.data).then(function() {

							factory.active.fetch_items[factory.active.stage.index].page_last_installed = page_num;

							// SAVE TOTAL ITEMS INSTALLED
							factory.dbUtils.updateFetchItemStatus(factory.active.stage.record).then(function() {
								
								// INCREMENT PAGE NUM
								page_num++;
								installFetchItemBatch(defer);

							}, function(error) {
								defer.reject(error);
							});

						}, function(error) {

							num_attempts++;

							fetch_item.install_error_date = new Date().getTime();
							fetch_item.install_error_message = error;

							// IF EXCEEDED ATTEMPT LIMIT, ERROR OUT
							if( num_attempts == factory.utils.attemptLimit(fetch_item.stage) ) {
								factory.dbUtils.saveFetchError(fetch_item, error, 'Data install').then(function() {
									defer.reject(error);
								}, function(dbError) {
									defer.reject(dbError);
								});

								return defer.promise;
							};

							installFetchItemBatch(defer);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;	
				}

				return defer.promise;
			}, 
			installFetchItemDataPage: function(fetch_item, data) {
				var defer = $q.defer();

				// CORE FETCH ITEMS
				if( fetch_item.stage == 'register_sites' ) {
					factory.dbUtils.sites.saveSiteBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'register_buildings' ) {
					factory.dbUtils.buildings.saveBuildingBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'register_areas' ) {
					factory.dbUtils.areas.saveAreaBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'register_assets' ) {
					factory.dbUtils.register_assets.saveRegisterAssetBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'register_tasks' ) {
					factory.dbUtils.register_tasks.saveRegisterTaskBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'register_media_records' ) {
					factory.dbUtils.register_media_records.saveRegisterMediaBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'register_asset_ipp' ) {

					factory.dbUtils.register_asset_ipp.saveRegisterAssetIppBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'mr_meta' ) {
					factory.dbUtils.mr_meta.saveMrMetaBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'qr_register' ) {
					factory.dbUtils.qr_register.saveQrRegisterBatch(data).then(function() {

						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};
				// END CORE FETCH ITEMS

				// PROJECT FETCH ITEMS
				if( fetch_item.stage == 'projects' ) {
					factory.dbUtils.projects.saveProjectBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'snapshot_assets' ) {
					factory.dbUtils.snapshot_assets.saveSnapshotAssetsBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'tasks' ) {
					projectDownloadFactory.utils.tasks.cloud_task_revisions = {};

					factory.dbUtils.tasks.saveTaskBatch(data).then(function() {

						projectDownloadFactory.dbUtils.tasks.reviseOldExistingRmTasks(data).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'mr_hazards' ) {
					factory.dbUtils.mr_hazards.saveMrHazardBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'mr_controls' ) {
					factory.dbUtils.mr_controls.saveMrControlBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'hazard_control_relations' ) {
					factory.dbUtils.hazard_control_relations.saveHazardControlRelationsBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				// IF ANY OF THE PROJECT MEDIA
				if( fetch_item.stage == 'snapshot_asset_media' || fetch_item.stage == 'task_media' || fetch_item.stage == 'mr_hazard_media' || fetch_item.stage == 'mr_control_media' || fetch_item.stage == 'assessment_media' ) {
					factory.dbUtils.media_records.saveProjectMediaBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'checklist_instances' ) {
					factory.dbUtils.checklist_instances.saveChecklistInstancesBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'uaudit_content' ) {
					factory.dbUtils.checklist_instances_json.saveChecklistInstanceJsonRecord(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'checklist_question_records' ) {
					factory.dbUtils.checklist_question_records.saveChecklistQuestionRecordsBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'assessments' ) {
					factory.dbUtils.assessments.saveRiskAssessmentsBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'ra_question_relations' ) {
					factory.dbUtils.ra_question_relations.saveQuestionAssessmentRelationsBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'ra_control_item_relations' ) {
					factory.dbUtils.ra_control_item_relations.saveAssessmentControlRelationsBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'qc_check_records' ) {
					factory.dbUtils.qc_check_records.saveQcCheckRecordsBatch(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				if( fetch_item.stage == 'project_contributors' ) {
					factory.dbUtils.project_contributors.indexProjectContributors(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}
				// END PROJECT FETCH ITEMS

				return defer.promise;
			}
		}

		factory.updates = {
			runUpdatesForNextFetchItem: function(defer, fetch_record) {

				if( fetch_record.date_updates_run != null ) {
					// UPDATES ALREADY RUN
					defer.resolve();
					return defer.promise;
				};

				if( factory.active.fetch_items.length == 0 ) {
					// NO FETCH ITEMS
					defer.resolve();
					return defer.promise;
				};

				var max_index = factory.active.fetch_items.length - 1;
				var active_index = null;
				var active_record = null;

				// IF NOT STARTED, START WITH FIRST FETCH ITEM ELSE GET NEXT ITEM
				if( factory.active.stage.index == null ) {
					active_index = 0;
				} else {
					active_index = factory.active.stage.index + 1;
				};

				// IF FINISHED RUNNING UPDATES
				if( active_index > max_index ) {
					// alert("Updates complete");
					factory.dbUtils.updateFetchRecordStatus(factory.active.fetch_id, 'Finished').then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
					return defer.promise;
				};

				// IF NO NEXT FETCH ITEM
				if( angular.isUndefined(factory.active.fetch_items[active_index]) ) {
					var error_message = "Unable to find the next stage for running updates";
					factory.dbUtils.saveFetchRecordError(factory.active.fetch_id, error_message, null, 'Updating').then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error_message);
					});
					return defer.promise;
				};
				
				// SET NEXT FETCH ITEM AND UPDATE STATUS
				factory.active.fetch_items[active_index].status = 'Updating';
				factory.active.stage.record = factory.active.fetch_items[active_index];
				factory.active.stage.index = active_index;

				factory.dbUtils.updateFetchItemStatus(factory.active.stage.record).then(function() {

					// IF ALREADY RUN UPDATES FOR ITEM, ATTEMPT NEXT FETCH ITEM
					if( factory.active.stage.record.date_updates_run != null ) {

						factory.updates.runUpdatesForNextFetchItem(defer, fetch_record);

					} else {

						factory.updates.doRunUpdatesForNextFetchItem(factory.active.stage.record).then(function() {

							// ATTEMPT NEXT FETCH ITEM
							factory.updates.runUpdatesForNextFetchItem(defer, fetch_record);

						}, function(error) {
							defer.reject(error);
						});

					};

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			doRunUpdatesForNextFetchItem: function(fetch_item) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var active_index = 0;

				runNextUpdateForFetchItem(save_defer, factory.updates.available_updates[active_index]).then(function() {

					// UPDATE ACTIVE FETCH ITEM
					var active_fetch_index = factory.active.stage.index;
					factory.active.fetch_items[active_fetch_index].date_updates_run = new Date().getTime();
					factory.active.fetch_items[active_fetch_index].status = 'Finished';
					// UPDATE ACTIVE STAGE RECORD
					// var fetch_item = {};
					// angular.copy(factory.active.fetch_items[active_index], fetch_item);
					// factory.active.stage.record = fetch_item;
					factory.dbUtils.updateFetchItemStatus(factory.active.stage.record).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				function runNextUpdateForFetchItem(defer, current_update) 
				{
					var keys;

					if( current_update.applicable_stages.indexOf(fetch_item.stage) == -1 ) {
						// UPDATE N/A FOR FETCH ITEM STAGE
						active_index++;

						if( active_index > factory.updates.available_updates.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);

						return defer.promise;
					}

					if( current_update.name == 'project_review_id' ) {
						projectDownloadFactory.dbUtils.projects.setProjectQualityCheckReviewId(projectDownloadFactory.download_setup.active.project_id).then(function() {
							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}
 		
							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);
						}, function(error) {
							defer.reject(error);
						});
					}

					if( current_update.name == 'uninstalled_checklists' ) {
						projectDownloadFactory.dbUtils.checkProjectUninstalledChecklists(fetch_item.stage, fetch_item.id_keys).then(function() {
							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}
 		
							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);
						}, function(error) {
							defer.reject(error);
						});
					}

					if( current_update.name == 'record_num_files' ) {
						keys = fetch_item.id_keys;
						if( fetch_item.stage == 'tasks' || fetch_item.stage == 'assessments' ) {
							keys = fetch_item.ref_keys;
						}

						factory.updates.updateValueOnRecords(fetch_item, keys, 'num_files').then(function() {
							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}
 		
							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);
						}, function(error) {
							defer.reject(error);
						});
					}

					if( current_update.name == 'hazard_num_controls' ) {
						projectDownloadFactory.dbUtils.updateHazardsNumControls(fetch_item.stage, fetch_item.id_keys).then(function() {
							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}
 		
							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);
						}, function(error) {
							defer.reject(error);
						});
					}

					if( current_update.name == 'control_num_hazards' ) {
						projectDownloadFactory.dbUtils.updateControlsNumHazards(fetch_item.stage, fetch_item.id_keys).then(function() {
							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}
 		
							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);
						}, function(error) {
							defer.reject(error);
						});
					}

					if( current_update.name == 'record_num_hazards' ) {
						keys = fetch_item.id_keys;
						if( fetch_item.stage == 'tasks' ) {
							keys = fetch_item.ref_keys;
						}

						factory.updates.updateValueOnRecords(fetch_item, keys, 'num_hazards').then(function() {
							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}
 		
							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);
						}, function(error) {
							defer.reject(error);
						});
					}

					if( current_update.name == 'record_num_hazards_complete' ) {
						keys = fetch_item.id_keys;
						if( fetch_item.stage == 'tasks' ) {
							keys = fetch_item.ref_keys;
						}						

						factory.updates.updateValueOnRecords(fetch_item, keys, 'num_hazards_complete').then(function() {
							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}
 		
							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);
						}, function(error) {
							defer.reject(error);
						});
					}

					if( current_update.name == 'question_num_risks' ) {
						projectDownloadFactory.dbUtils.updateQuestionsNumRisks(fetch_item.stage, fetch_item.id_keys).then(function() {
							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}
 		
							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);
						}, function(error) {
							defer.reject(error);
						});
					}

					if( current_update.name == 'risk_num_controls' ) {
						projectDownloadFactory.dbUtils.updateRisksNumControls(fetch_item.stage, fetch_item.ref_keys).then(function() {
							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}
 		
							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);
						}, function(error) {
							defer.reject(error);
						});
					}

					if( current_update.name == 'video_ids' ) {
						keys = fetch_item.id_keys;
						if( fetch_item.stage == 'tasks' ) {
							keys = fetch_item.ref_keys;
						}

						factory.updates.updateValueOnRecords(fetch_item, keys, 'video_media_id').then(function() {
							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}
 		
							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);
						}, function(error) {
							defer.reject(error);
						});
					}

					if( current_update.name == 'audio_ids' ) {
						keys = fetch_item.id_keys;
						if( fetch_item.stage == 'tasks' ) {
							keys = fetch_item.ref_keys;
						}

						factory.updates.updateValueOnRecords(fetch_item, keys, 'audio_media_id').then(function() {
							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}
 		
							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);
						}, function(error) {
							defer.reject(error);
						});
					}

					if( current_update.name == 'signature_ids' ) {
						keys = fetch_item.id_keys;
						if( fetch_item.stage == 'tasks' ) {
							keys = fetch_item.ref_keys;
						}

						factory.updates.updateValueOnRecords(fetch_item, keys, 'signature_id').then(function() {
							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}
 		
							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);
						}, function(error) {
							defer.reject(error);
						});
					}

					if( current_update.name == 'media_item_found' ) {
						projectDownloadFactory.dbUtils.checkMediaItemOnDevice(fetch_item.stage, fetch_item.id_keys).then(function() {
							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}
 		
							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);
						}, function(error) {
							defer.reject(error);
						});
					}

					if( current_update.name == 'incomplete_tasks' ) {

						if( !fetch_item.hasOwnProperty('incomplete_keys') || !fetch_item.incomplete_keys ) {
							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}
 		
							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);
						
						} else {
							projectDownloadFactory.dbUtils.attemptCompleteTaskIds(fetch_item.stage, fetch_item.incomplete_keys, fetch_item.id_keys).then(function() {
								active_index++;

								if( active_index > factory.updates.available_updates.length - 1 ) {
									defer.resolve();
									return defer.promise;
								}
	 		
								runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);
							}, function(error) {
								defer.reject(error);
							});
						}

					}

					if( current_update.name == 'risk_profile_img' ) {
						projectDownloadFactory.dbUtils.updateRiskProfileImgs(fetch_item.stage, fetch_item.ref_keys).then(function() {

							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}

							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( current_update.name == 'superseeded_images' ) {
						projectDownloadFactory.dbUtils.updateSuperseededImages(fetch_item.stage, fetch_item.ref_keys).then(function() {

							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}

							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( current_update.name == 'suggested_risk_ids' ) {
						projectDownloadFactory.dbUtils.updateLocalSuggestedRiskIds(fetch_item.stage, fetch_item.ref_keys, fetch_item.id_keys).then(function() {

							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}

							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( current_update.name == 'register_asset_profile_img' ) {
						coreDownloadFactory.dbUtils.updateAssetProfileImgs(fetch_item.stage, fetch_item.id_keys).then(function() {

							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}

							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( current_update.name == 'asset_active_checklist' ) {
						projectDownloadFactory.dbUtils.setAssetsActiveChecklist(fetch_item.stage, fetch_item.id_keys).then(function() {

							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}

							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( current_update.name == 'deleted_risks' ) {
						projectDownloadFactory.dbUtils.updateCloudDeletedRisks(fetch_item.stage, fetch_item.ref_keys).then(function() {

							active_index++;

							if( active_index > factory.updates.available_updates.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}

							runNextUpdateForFetchItem(defer, factory.updates.available_updates[active_index]);

						}, function(error) {
							defer.reject(error);
						});
					}

					return defer.promise;	
				}

				return defer.promise;
			},
			updateValueOnRecords: function(fetch_item, record_id_keys, key) {
				var defer = $q.defer();

				switch(factory.active.fetch_type) {
					case 'core': 
						coreDownloadFactory.dbUtils.updateValueOnRecords(fetch_item.stage, record_id_keys, key).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});
						return defer.promise;
					case 'project': 
						projectDownloadFactory.dbUtils.updateValueOnRecords(fetch_item.stage, record_id_keys, key).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});
						return defer.promise;
					default:
						// ACTIVE FETCH IS NONE OF THE ABOVE
						defer.resolve();
						return defer.promise;
				}

				return defer.promise;
			},
			updateRecordsNumHazards: function(fetch_item, record_id_keys) {
				var defer = $q.defer();

				switch(factory.active.fetch_type) {
					case 'core': 
						defer.resolve();
						return defer.promise;
					case 'project': 
						projectDownloadFactory.dbUtils.updateRecordsNumHazards(fetch_item.stage, record_id_keys).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});
						return defer.promise;
					default:
						// ACTIVE FETCH IS NONE OF THE ABOVE
						defer.resolve();
						return defer.promise;
				}

				return defer.promise;
			},
			available_updates: [{
				name: 'project_review_id',
				applicable_stages: ['projects']
			},{
				name: 'uninstalled_checklists',
				applicable_stages: ['projects']
			},{
				name: 'record_num_files',
				applicable_stages: ['register_assets','register_tasks','snapshot_assets','tasks','mr_hazards','mr_controls','assessments']
			},{
				name: 'hazard_num_controls',
				applicable_stages: ['mr_hazards']
			},{
				name: 'control_num_hazards',
				applicable_stages: ['mr_controls']
			},{
				name: 'record_num_hazards',
				applicable_stages: ['tasks']
			},{
				name: 'record_num_hazards_complete',
				applicable_stages: ['tasks']
			},{
				name: 'question_num_risks',
				applicable_stages: ['checklist_question_records']
			},{
				name: 'risk_num_controls',
				applicable_stages: ['assessments']
			},{
				name: 'video_ids', 
				applicable_stages: ['tasks']
			},{
				name: 'audio_ids', 
				applicable_stages: ['tasks']
			},{
				name: 'signature_ids',
				applicable_stages: ['tasks']
			},{
				name: 'incomplete_tasks',
				applicable_stages: ['tasks']
			},{
				name: 'risk_profile_img',
				applicable_stages: ['assessments']
			},{
				name: 'superseeded_images',
				applicable_stages: ['assessments']
			},{
				name: 'suggested_risk_ids',
				applicable_stages: ['assessments']
			},{
				name: 'register_asset_profile_img',
				applicable_stages: ['register_assets']
			},{
				name: 'asset_active_checklist', 
				applicable_stages: ['snapshot_assets']
			},{
				name: 'deleted_risks', 
				applicable_stages: ['assessments']
			}]

			// {
			// 	name: '',
			// 	applicable_stages: ['checklist_instances']
			// }

			// {
			// 	name: 'media_item_found',
			// 	applicable_stages: ['assessment_media']
			// }
		}

		factory.pre_install_checks = {
			runPreInstallChecksForNextFetchItem: function(defer, fetch_record) {

				if( fetch_record.date_pre_install_checks_run != null ) {
					// UPDATES ALREADY RUN
					defer.resolve();
					return defer.promise;
				};

				if( factory.active.fetch_items.length == 0 ) {
					// NO FETCH ITEMS
					defer.resolve();
					return defer.promise;
				};

				var max_index = factory.active.fetch_items.length - 1;
				var active_index = null;
				var active_record = null;

				// IF NOT STARTED, START WITH FIRST FETCH ITEM ELSE GET NEXT ITEM
				if( factory.active.stage.index == null ) {
					active_index = 0;
				} else {
					active_index = factory.active.stage.index + 1;
				};

				// IF FINISHED RUNNING PRE-INSTALL CHECKS
				if( active_index > max_index ) {
					// alert("Updates complete");
					factory.dbUtils.updateFetchRecordStatus(factory.active.fetch_id, 'Checks Completed').then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
					return defer.promise;
				};

				// IF NO NEXT FETCH ITEM
				if( angular.isUndefined(factory.active.fetch_items[active_index]) ) {
					var error_message = "Unable to find the next stage for running pre-install checks";
					factory.dbUtils.saveFetchRecordError(factory.active.fetch_id, error_message, null, 'Processing').then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error_message);
					});
					return defer.promise;
				};
				
				// SET NEXT FETCH ITEM AND UPDATE STATUS
				factory.active.fetch_items[active_index].status = 'Processing';
				factory.active.stage.record = factory.active.fetch_items[active_index];
				factory.active.stage.index = active_index;

				factory.dbUtils.updateFetchItemStatus(factory.active.stage.record).then(function() {

					// IF ALREADY RUN PRE-INSTALL CHECKS FOR ITEM, ATTEMPT NEXT FETCH ITEM
					if( factory.active.stage.record.date_pre_install_checks_run != null ) {

						factory.pre_install_checks.runPreInstallChecksForNextFetchItem(defer, fetch_record);

					} else {

						factory.pre_install_checks.doRunPreInstallChecksForNextFetchItem(factory.active.stage.record).then(function() {

							// ATTEMPT NEXT FETCH ITEM
							factory.pre_install_checks.runPreInstallChecksForNextFetchItem(defer, fetch_record);

						}, function(error) {
							defer.reject(error);
						});

					};

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			doRunPreInstallChecksForNextFetchItem: function(fetch_item) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var active_index = 0;

				runNextPreInstallCheckForFetchItem(save_defer, factory.pre_install_checks.available_checks[active_index]).then(function() {

					// UPDATE ACTIVE FETCH ITEM
					var active_fetch_index = factory.active.stage.index;
					factory.active.fetch_items[active_fetch_index].date_pre_install_checks_run = new Date().getTime();
					factory.active.fetch_items[active_fetch_index].status = 'Checks Completed';
					// UPDATE ACTIVE STAGE RECORD
					// var fetch_item = {};
					// angular.copy(factory.active.fetch_items[active_index], fetch_item);
					// factory.active.stage.record = fetch_item;
					factory.dbUtils.updateFetchItemStatus(factory.active.stage.record).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				function runNextPreInstallCheckForFetchItem(defer, current_update) 
				{
					var keys;

					if( current_update.applicable_stages.indexOf(fetch_item.stage) == -1 ) {
						// UPDATE N/A FOR FETCH ITEM STAGE
						active_index++;

						if( active_index > factory.pre_install_checks.available_checks.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						runNextPreInstallCheckForFetchItem(defer, factory.pre_install_checks.available_checks[active_index]);

						return defer.promise;
					}

					if( current_update.name == 'uninstalled_checklist_blueprints' ) {
						factory.pre_install_checks.checkProjectUninstalledBlueprintChecklists(fetch_item).then(function() {
							active_index++;

							if( active_index > factory.pre_install_checks.available_checks.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}
 		
							runNextPreInstallCheckForFetchItem(defer, factory.pre_install_checks.available_checks[active_index]);
						}, function(error) {
							defer.reject(error);
						});
					}

					return defer.promise;	
				}

				return defer.promise;
			},
			checkProjectUninstalledBlueprintChecklists: function(fetch_item) {
				var defer = $q.defer();
				var check_defer = $q.defer();

				var page_num = 1;
				var num_attempts = 1;

				runCheckForFetchItemPage(check_defer).then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function runCheckForFetchItemPage(defer) 
				{
					factory.dbFetch.fetchItemDataPage(fetch_item, page_num).then(function(fetch_item_data) {

						// IF NO MORE FETCH ITEM DATA PAGES TO RUN CHECKS FOR
						if( fetch_item_data == null ) {
							defer.resolve();

							return defer.promise;
						};

						factory.pre_install_checks.doCheckProjectUninstalledBlueprintChecklists(fetch_item, fetch_item_data.data).then(function() {
								
							// INCREMENT PAGE NUM
							page_num++;
							runCheckForFetchItemPage(defer);

						}, function(error) {

							num_attempts++;

							fetch_item.install_error_date = new Date().getTime();
							fetch_item.install_error_message = error;

							// IF EXCEEDED ATTEMPT LIMIT, ERROR OUT
							if( num_attempts == factory.utils.attemptLimit(fetch_item.stage) ) {
								factory.dbUtils.saveFetchError(fetch_item, error, 'Pre-install check').then(function() {
									defer.reject(error);
								}, function(dbError) {
									defer.reject(dbError);
								});

								return defer.promise;
							};

							runCheckForFetchItemPage(defer);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;	
				}

				return defer.promise;
			}, 
			doCheckProjectUninstalledBlueprintChecklists: function(fetch_item, data) {
				var defer = $q.defer();
				var check_defer = $q.defer();

				data = JSON.parse(data);

				// NO DATA TO RUN CHECKS FOR
				if( data.length == 0 ) {
					defer.resolve();
					return defer.promise;
				}

				var active_index = 0;
				var num_attempts = 1;

				runCheckForChecklist(check_defer, active_index).then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function runCheckForChecklist(defer, active_index) 
				{	
					factory.pre_install_checks.checkBlueprintChecklistInstalled(data[active_index]).then(function() {
							
						// INCREMENT INDEX
						active_index++;

						// IF RUN CHECKS FOR ALL DATA
						if( active_index > data.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						runCheckForChecklist(defer, active_index);

					}, function(error) {

						num_attempts++;

						fetch_item.install_error_date = new Date().getTime();
						fetch_item.install_error_message = error;

						// IF EXCEEDED ATTEMPT LIMIT, ERROR OUT
						if( num_attempts == factory.utils.attemptLimit(fetch_item.stage) ) {
							factory.dbUtils.saveFetchError(fetch_item, error, 'Pre-install check').then(function() {
								defer.reject(error);
							}, function(dbError) {
								defer.reject(dbError);
							});

							return defer.promise;
						};

						runCheckForChecklist(defer);
					});

					return defer.promise;	
				}

				return defer.promise;
			},
			checkBlueprintChecklistInstalled: function(checklist_instance) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.blueprint_checklists.find({
					selector: {
						table: 'checklist_blueprint',
						company_id: authFactory.cloudCompanyId(),
						user_id: authFactory.cloudUserId(), 
						ChecklistID: parseInt(checklist_instance.rm_checklist_blueprint_id)
					}
				}).then(function(result) {
					// BLUEPRINT FOUND AND IS INSTALLED
					if( result.docs.length > 0 && result.docs[0].installed == 'Yes' ) {
						defer.resolve();
						return defer.promise;
					}

					var blueprint_record = null;

					if( result.docs.length == 0 ) {

						blueprint_record = {
							_id: null, 
							ChecklistID: parseInt(checklist_instance.rm_checklist_blueprint_id),
							IsUAudit: checklist_instance.is_uaudit
						}

					} else {
						blueprint_record = result.docs[0];
					}

					// NEED TO REQUEST AND INSTALL BLUEPRINT CHECKLIST
					// checklistBlueprintFactory.checklist_blueprint_download.downloadChecklistBlueprintContent(parseInt(checklist_instance.rm_checklist_blueprint_id)).then(function() {

					// 	defer.resolve();

					// }, function(error) {
					// 	defer.reject(error);
					// });

					// NEED TO REQUEST AND INSTALL BLUEPRINT CHECKLIST
					checklistBlueprintFactory.checklist_blueprint_download.downloadChecklistBlueprint(blueprint_record).then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			available_checks: [{
				name: 'uninstalled_checklist_blueprints',
				applicable_stages: ['checklist_instances']
			}]
		}

		factory.requests = {
			projects: function() {
				var defer = $q.defer();

	            var pre_filters = {
	                activity_id: null,
					paginate: 'yes',
					page_num: 1,
					per_page: 1000, 
					client_id: authFactory.getClientId()
	            };

	            var project_collection = [];

	            //SET THE FILTERS FOR THE INITIAL REQUEST
	            // already set by pre_filters that is passed into function

	            //GET THE INTIIAL LOAD FOR TOTALS
	            factory.requests.projectsRequest(pre_filters).then(function(data) {

	                // data = JSON.stringify(data);

	                project_collection = project_collection.concat( data.data );

	                var total_items = data.totals.TotalItems;

	                //CALC NUM PAGES
	                var num_pages = Math.ceil(total_items / pre_filters.per_page);
	                console.log("NUM PAGES OF PROJECTS:" + num_pages);
	                // alert("Number of pages to request");

	                if( num_pages > 1 )
	                {
	                    var chain = $q.when();

	                    for(var i = 2; i <= num_pages; i++)
	                    {
	                        (function(index) {

	                            chain = chain.then(function() {

	                                //SET THE FILTERS TO GET DESIRED PAGE
	                                console.log( JSON.stringify(pre_filters, null, 2) );
	                                var loop_filters = angular.copy(pre_filters);
	                                loop_filters.page_num = index;
	                                console.log( JSON.stringify(loop_filters, null, 2) );

	                                return factory.requests.projectsRequest(loop_filters).then(function(data) {
	                                   
	                                    Array.prototype.push.apply(project_collection, data.data);
	                                    console.log( project_collection.length );
	                                    console.log( index + ' of ' + num_pages);

	                                    if( index == num_pages )
	                                    {
	                                        console.log("TOTAL FOUND PROJECTS");
	                                        console.log( JSON.stringify(project_collection, null, 2) );
	                                        console.log( project_collection.length );

	                                        defer.resolve(project_collection);
	                                    };

	                                }, function(error) {
	                             		defer.reject(error);
	                                });
	                            });

	                        })(i);
	                    }
	                }
	                else
	                {
	                    //IF ONLY 1 PAGE FOUND

	                    console.log("TOTAL FOUND PROJECTS");
	                    console.log( JSON.stringify(project_collection, null, 2) );
	                    console.log( project_collection.length );

	                    defer.resolve(project_collection);
	                };

	            }, function(error) {
	                defer.reject(error);
	            });

	            return defer.promise;
			},
			projectsRequest: function(filters) {
				var defer = $q.defer();

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/Projects',{ 
	                params: {
	                	filters: filters
	                }
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("PROJECT LIST REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		defer.resolve(data);
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("PROJECT LIST ERROR REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );
	                defer.reject("Error connecting to API for projects");
	            });

				return defer.promise;
			},
			projectRecord: function(rm_activity_id, is_pool) {
				var defer = $q.defer();

				var filters = {
					activity_id: rm_activity_id, 
					paginate: 'no',
					page_num: 1,
					per_page: 1000, 
					client_id: null
				}

				if( !is_pool ) {
					filters.client_id = authFactory.getClientId();
				}

				factory.requests.projectsRequest(filters).then(function(data) {

					if( !data.data || data.data.length == 0 ) {
						defer.reject("Couldn't find project record");
					} else {
						defer.resolve(data.data[0]);
					}

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
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

		factory.bespoke = {
			refreshRegisterAssetIppScores: function(rm_site_id) {
				var defer = $q.defer();

				coreDownloadFactory.download_setup.active.rm_site_id = rm_site_id;

				coreDownloadFactory.dbUtils.register_asset_ipp.existingRmRegisterAssetIppScores(asset_keys).then(function() {

					

					coreDownloadFactory.utils.register_asset_ipp.existing_data = null;

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
		}

		riskmachDatabasesFactory.databases.initFetchRecords();
		riskmachDatabasesFactory.databases.initFetchItems();
		riskmachDatabasesFactory.databases.initFetchItemData();

		return factory;
	}

}())