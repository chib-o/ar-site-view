(function() {
	var app = angular.module('riskmachCoreDownload', ['riskmachUtils','riskmachDatabases','riskmachModels']);
	app.factory('coreDownloadFactory', coreDownloadFactory);

	function coreDownloadFactory($q, $http, authFactory, riskmachDatabasesFactory, modelsFactory) 
	{
		var factory = {};

		factory.requests = {
			ippRecord: function(rm_pp_asset_relation_id) {
				var defer = $q.defer();

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/RegisterAssetProfilePoints',{ 
	                params: {
	                	filters: {
	                		pp_relation_id: rm_pp_asset_relation_id,
	                		client_id: null,
							asset_id: null,
							site_id: null,
							profile_point_id: null,
							band: null,
							paginate: null, 
							page_num: 1,
							per_page: 250
	                	}
	                }
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("IPP RECORD RESPONSE");
	            	console.log(data);

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		if( !data.data || !data.data.length ) {
	            			defer.resolve(null);
	            		} else {
	            			defer.resolve(data.data[0]);
	            		}
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("ERROR - IPP RECORD REQUEST RESPONSE");
	            	console.log(data);
	                defer.reject("Error connecting to API for requirement record");
	            });

				return defer.promise;
			}, 
			updateCoreComplianceHealth: function(params) {
				var defer = $q.defer();

				if( authFactory.isAgent() ) {
					params.client_id = authFactory.getClientId();
				} else {
					params.client_id = null;
				}

				console.log("UPDATE CORE HEALTH PARAMS");
				console.log(params);

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/UpdateCompanyCoreComplianceHealth',{ 
	                params: params
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("CORE HEALTH UPDATE RESPONSE");
	            	console.log(data);

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		defer.resolve(data);
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("ERROR - CORE HEALTH UPDATE RESPONSE");
	            	console.log(data);
	                defer.reject("Error connecting to API for Core compliance health update");
	            });

				return defer.promise;
			}
		}

		factory.download_setup = {
			active: {
				rm_site_id: null
			},
			stages: [{
				stage_name: 'register_sites',
				params: {
					filters: {
						client_id: null,
						activity_id: null,
						site_id: null,
						paginate: 'yes',
						page_num: 1,
						per_page: 250
					}
				}
			},{
				stage_name: 'register_buildings',
				params: {
					filters: {
						client_id: null,
						activity_id: null,
						site_id: null,
						building_id: null,
						paginate: 'yes',
						page_num: 1,
						per_page: 250
					}
				}
			},{
				stage_name: 'register_areas',
				params: {
					filters: {
						client_id: null,
						activity_id: null,
						site_id: null,
						building_id: null, 
						area_id: null,
						paginate: 'yes',
						page_num: 1,
						per_page: 250
					}
				}
			},{
				stage_name: 'register_assets',
				params: {
					filters: {
						client_id: null,
						record_type: null,
						asset_id: null,
						parent_asset_id: null,
						site_id: null,
						building_id: null,
						area_id: null,
						// 0,1 LIVE - 2 DELETED - 3 PERM DELETED
						status_id: [0,1,2,3],
						paginate: 'yes',
						page_num: 1,
						per_page: 250
					}
				}
			},{
				stage_name: 'register_tasks',
				params: {
					filters: {
						client_id: null,
						after_date: null,
						is_register: null,
						activity_id: null,
						site_id: null,
						building_id: null,
						area_id: null,
						asset_id: null,
						latest_revision: null,
						paginate: 'yes',
						page_num: 1,
						per_page: 250
					}
				}
			},{
				stage_name: 'register_media_records',
				params: {
					filters: {
						client_id: null,
						activity_id: null,
						asset_id: null,
						site_id: null,
						is_register: null,
						paginate: 'yes',
						page_num: 1,
						per_page: 250
					}
				}
			},{
				stage_name: 'register_asset_ipp',
				params: {
					filters: {
						client_id: null,
						asset_id: null,
						site_id: null,
						band: null,
						paginate: 'yes', 
						page_num: 1,
						per_page: 250
					}
				}
			},{
				stage_name: 'qr_register',
				params: {
					filters: {
						client_id: null,
						after_date: null,
						paginate: 'yes',
						page_num: 1,
						per_page: 250
					} 
				}
			},{
				stage_name: 'mr_meta',
				params: {
					filters: {
						company_id: authFactory.cloudCompanyId(), 
						record_type: null,
						site_id: null, 
						building_id: null, 
						area_id: null, 
						asset_id: null, 
						paginate: 'yes',
						page_num: 1,
						per_page: 250
					}
				}
			}],
			initStages: function(selected_stages, params) {

				var stages = [];

				// IF PARTICULAR STAGES HAVE BEEN SELECTED
				if( selected_stages ) {
					angular.forEach(factory.download_setup.stages, function(record, index) {
						
						// IF AVAILABLE STAGE IS IN SELECTED STAGES
						if( selected_stages.indexOf(record.stage_name) >= 0 ) {
							stages.push(record);
						};

					});
				};

				// IF NO PARTICULAR SELECTION, GET ALL STAGES
				if( !selected_stages ) {
					stages = angular.copy(factory.download_setup.stages);
				};

				// DECORATE STAGES PARAMS
				angular.forEach(stages, function(record, index) {

					if( params.hasOwnProperty('client_id') && params.client_id != null ) {

						if( stages[index].params.filters.hasOwnProperty('client_id') ) {
							stages[index].params.filters.client_id = params.client_id;
						};

					};

					if( params.hasOwnProperty('site_id') && params.site_id != null ) {

						if( stages[index].params.filters.hasOwnProperty('site_id') ) {
							stages[index].params.filters.site_id = params.site_id;
						};

					};

				});

				return stages;
			}
		}

		factory.utils = {
			formatRmRecordToModel: function(model_type, rm_record) {

				var model = modelsFactory.models[model_type];

				Object.keys(model).forEach(function(key) {
					
					// IF RM RECORD DOESN'T HAVE KEY
					if( !rm_record.hasOwnProperty(key) ) {

						// CREATE KEY WITH DEFAULT MODEL VALUE
						rm_record[key] = model[key];
					}

					if( rm_record[key] != null && rm_record[key] != '' ) {

						// IF DATA TYPE IS SET UP FOR RECORD TYPE
						if( modelsFactory.data_types.hasOwnProperty(model_type) ) {

							// IF MODELS KEY EXISTS IN RECORDS DATA TYPE OBJECT
							if( modelsFactory.data_types[model_type].hasOwnProperty(key) ) {

								var value = null;

								if( modelsFactory.data_types[model_type][key] == 'integer' ) {
									if( rm_record[key] == '0' ) {
										value = null;
									} else {
										value = parseInt( rm_record[key] );
									}
								}

								// CAN FORMAT FOR DATES etc.

								rm_record[key] = value;

							}

						}

					}

				});

				return rm_record;

			},
			setSyncValues: function(rm_record) {
				rm_record.date_record_synced = new Date().getTime();
				rm_record.date_content_synced = new Date().getTime();
				rm_record.date_record_imported = new Date().getTime();
				rm_record.date_content_imported = new Date().getTime();
				rm_record.record_modified = 'No';

				return rm_record;
			},
			stageDatabase: function(stage) {
				var db = null;

				if( stage == 'register_assets' ) {
					db = riskmachDatabasesFactory.databases.collection.register_assets;
				}

				if( stage == 'register_tasks' ) {
					// db = riskmachDatabasesFactory.databases.collection.tasks;
				}

				return db;		
			},
			sites: {
				existing_data: null,
				formatSiteRecord: function(site_record) {
					var formatted = null;
					formatted = angular.copy(site_record);

					if( site_record.status == null || site_record.status == '' || site_record.status == 0 || site_record.status == '0' ) {
						formatted.status = 1;
					};

					return formatted;
				},
				filterExistingRmSites: function(record_rows) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('company_id') || record_rows[i].doc.company_id != authFactory.getActiveCompanyId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev, 
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified
							};

							factory.utils.sites.existing_data[record_rows[i].doc.rm_id] = record;
						}

						i++;
					}

				}
			},
			buildings: {
				existing_data: null,
				formatBuildingRecord: function(building_record) {
					var formatted = null;
					formatted = angular.copy(building_record);

					if( building_record.status == null || building_record.status == '' || building_record.status == 0 || building_record.status == '0' ) {
						formatted.status = 1;
					};

					return formatted;
				},
				filterExistingRmBuildings: function(record_rows) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('company_id') || record_rows[i].doc.company_id != authFactory.getActiveCompanyId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('rm_site_id') || (factory.download_setup.active.rm_site_id && record_rows[i].doc.rm_site_id != factory.download_setup.active.rm_site_id) ) {
							errors++;
						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev, 
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified
							};

							factory.utils.buildings.existing_data[record_rows[i].doc.rm_id] = record;
						}

						i++;
					}

				}
			},
			areas: {
				existing_data: null, 
				formatAreaRecord: function(area_record) {
					var formatted = null;
					formatted = angular.copy(area_record);

					if( area_record.status == null || area_record.status == '' || area_record.status == 0 || area_record.status == '0' ) {
						formatted.status = 1;
					};

					return formatted;
				},
				filterExistingRmAreas: function(record_rows) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('company_id') || record_rows[i].doc.company_id != authFactory.getActiveCompanyId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('rm_site_id') || (factory.download_setup.active.rm_site_id && record_rows[i].doc.rm_site_id != factory.download_setup.active.rm_site_id) ) {
							errors++;
						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev, 
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified
							};

							factory.utils.areas.existing_data[record_rows[i].doc.rm_id] = record;
						}

						i++;
					}

				}
			},
			register_assets: {
				existing_data: null,
				new_data: null,
				formatAssetRecord: function(asset_record) {
					var formatted = null;
					formatted = angular.copy(asset_record);

					if( asset_record.status == null || asset_record.status == '' || asset_record.status == 0 || asset_record.status == '0' ) {
						formatted.status = 1;
					};

					return formatted;
				},
				filterExistingRmRegisterAssets: function(record_rows) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('company_id') || record_rows[i].doc.company_id != authFactory.getActiveCompanyId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('rm_site_id') || (factory.download_setup.active.rm_site_id && parseInt(record_rows[i].doc.rm_site_id) != factory.download_setup.active.rm_site_id) ) {
							errors++;
						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev, 
								rm_id: record_rows[i].doc.rm_id, 
								rm_parent_asset_id: record_rows[i].doc.rm_parent_asset_id,
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified,
								building_id: record_rows[i].doc.building_id, 
								area_id: record_rows[i].doc.area_id,
								not_whole_doc: true
							};

							factory.utils.register_assets.existing_data[record_rows[i].doc.rm_id] = record;
						}

						i++;
					}

				}
			},
			register_tasks: {
				existing_data: null, 
				filterExistingRmRegisterTasks: function(record_rows) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('company_id') || record_rows[i].doc.company_id != authFactory.getActiveCompanyId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('rm_site_id') || (factory.download_setup.active.rm_site_id && parseInt(record_rows[i].doc.rm_site_id) != factory.download_setup.active.rm_site_id) ) {
							errors++;
						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev, 
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified
							};

							factory.utils.register_tasks.existing_data[record_rows[i].doc.rm_id] = record;
						}

						i++;
					}

				}
			},
			register_media_records: {
				existing_data: null,
				formatRegisterMediaRecord: function(media_record) {
					var formatted = null;
					formatted = angular.copy(media_record);

					// MAKE SURE IS REGISTER
					formatted.is_register = 'Yes';

					formatted.file_download_rm_id = media_record.rm_id;

					// SET TO EITHER ACTIVE COMPANY OR ACTIVE CLIENT ID
					formatted.company_id = authFactory.getActiveCompanyId();

					if( media_record.status == null || media_record.status == '' || media_record.status == 0 || media_record.status == '0' ) {
						formatted.status = 1;
					};

					if( media_record.hasOwnProperty('profile_image') && media_record.profile_image == 'Yes' ) {
						formatted.profile_image = true;
					} else {
						formatted.profile_image = false;
					};

					return formatted;
				},
				filterExistingRmRegisterMediaRecords: function(record_rows, asset_keys) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('company_id') || record_rows[i].doc.company_id != authFactory.getActiveCompanyId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('rm_record_item_id') || !asset_keys.hasOwnProperty( parseInt(record_rows[i].doc.rm_record_item_id) ) ) {
							errors++;
						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev, 
								file_downloaded: record_rows[i].doc.file_downloaded,
								attachment_key: record_rows[i].doc.attachment_key, 
								_attachments: record_rows[i].doc._attachments,
								rm_revision_number: record_rows[i].doc.rm_revision_number,
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified
							};

							factory.utils.register_media_records.existing_data[record_rows[i].doc.rm_id] = record;
						}

						i++;
					}

				}
			},
			mr_meta: {
				formatSubjectMrMetaRecord: function(meta_record, relations) {
					var formatted = modelsFactory.models.newSubjectMrMeta();
					
					var data = {
						mr_meta: meta_record,
						latest_published: null, 
						latest_draft: null
					}

					formatted.rm_subject_record_id = relations.rm_subject_record_id || null;
					formatted.subject_record_id = relations.subject_record_id;
					formatted.subject_record_type = relations.subject_record_type;
					formatted.data = JSON.stringify(data);

					return formatted;
				},
				filterExistingRmMrMeta: function(record_rows, asset_keys) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('company_id') || record_rows[i].doc.company_id != authFactory.getActiveCompanyId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('rm_subject_record_id') || !asset_keys.hasOwnProperty( parseInt(record_rows[i].doc.rm_subject_record_id) ) ) {
							errors++;
						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev, 
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified
							};

							factory.utils.mr_meta.existing_data[record_rows[i].doc.rm_subject_record_id] = record;
						}

						i++;
					}

				}
			}, 
			record_assets: {
				existing_data: null,
				filterExistingRmRecordAssets: function(record_rows) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('company_id') || record_rows[i].doc.company_id != authFactory.getActiveCompanyId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('rm_site_id') || (factory.download_setup.active.rm_site_id && record_rows[i].doc.rm_site_id != factory.download_setup.active.rm_site_id) ) {
							errors++;
						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev, 
								rm_id: record_rows[i].doc.rm_id, 
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified
							};

							factory.utils.record_assets.existing_data[parseInt(record_rows[i].doc.rm_id)] = record;
						}

						i++;
					}

				}
			},
			qr_register: {
				existing_data: null, 
				filterExistingRmQrCodes: function(record_rows) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('rm_subject_owner_company_id') || parseInt(record_rows[i].doc.rm_subject_owner_company_id) != authFactory.getActiveCompanyId() ) {
							errors++;
						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev, 
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified
							};

							factory.utils.qr_register.existing_data[record_rows[i].doc.rm_id] = record;
						}

						i++;
					}

				}
			},
			register_asset_ipp: {
				existing_data: null, 
				filterExistingRmRegisterAssetIppScores: function(record_rows, asset_keys) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('company_id') || record_rows[i].doc.company_id != authFactory.getActiveCompanyId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( asset_keys ) {

							// CHECK IF RELATED ASSET IS IN DOWNLOAD
							if( !record_rows[i].doc.hasOwnProperty('rm_asset_id') || !asset_keys.hasOwnProperty( parseInt(record_rows[i].doc.rm_asset_id) ) ) {
								errors++;
							}

						} else {

							// CHECK IF IPP SCORE BELONGS TO SITE
							if( !record_rows[i].doc.hasOwnProperty('rm_site_id') || (factory.download_setup.active.rm_site_id && parseInt(record_rows[i].doc.rm_site_id) != factory.download_setup.active.rm_site_id) ) {
								errors++;
							}

						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev, 
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified,
								audit_id: record_rows[i].doc.audit_id,
								audit_started: record_rows[i].doc.audit_started,
								pinned: record_rows[i].doc.pinned, 
								asset_id: record_rows[i].doc.asset_id
							};

							// var key = "" + record_rows[i].doc.rm_asset_id + "_" + record_rows[i].doc.rm_profile_point_ref + "";
							var key = record_rows[i].doc.rm_pp_asset_relation_id;

							factory.utils.register_asset_ipp.existing_data[key] = record;
						}

						i++;
					}

				},
				formatRegisterAssetIppRecord: function(ipp_record) {
					var formatted = angular.copy(ipp_record);

					formatted.requires_refresh = null;

					if( ipp_record.hasOwnProperty('effective_next_inspection_date') && ipp_record.effective_next_inspection_date ) {
						formatted.effective_next_inspection_date = parseInt(ipp_record.effective_next_inspection_date);
					}

					if( ipp_record.hasOwnProperty('date_started') && ipp_record.date_started ) {
						formatted.audit_started = 'Yes';
					}

					return formatted;
				}
			}
		}

		factory.dbFetch = {
			sites: {
				rmSiteRecord: function(rm_id) {
					var defer = $q.defer();

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.sites.existing_data ) {

						if( angular.isDefined(factory.utils.sites.existing_data[rm_id]) && factory.utils.sites.existing_data[rm_id] ) {
							
							console.log("EXISTING RECORD FOUND - UPDATE");
							var existing_record = factory.utils.sites.existing_data[rm_id];
							defer.resolve(existing_record);

						} else {
							console.log("RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.sites.find({
						selector: {
							table: 'sites',
							company_id: authFactory.getActiveCompanyId(),
							user_id: authFactory.cloudUserId(), 
							rm_id: rm_id
						},
						limit: 1
					}).then(function(results){

						console.log("GOT SITE RECORD");
						if( results.docs.length == 0 ) {
							defer.resolve(null);
						} else {
							defer.resolve(results.docs[0]);
						};

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}
			}, 
			buildings: {
				rmBuildingRecord: function(rm_id) {
					var defer = $q.defer();

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.buildings.existing_data ) {

						if( angular.isDefined(factory.utils.buildings.existing_data[rm_id]) && factory.utils.buildings.existing_data[rm_id] ) {
							
							console.log("EXISTING RECORD FOUND - UPDATE");
							var existing_record = factory.utils.buildings.existing_data[rm_id];
							defer.resolve(existing_record);

						} else {
							console.log("RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.buildings.find({
						selector: {
							table: 'buildings',
							company_id: authFactory.getActiveCompanyId(),
							user_id: authFactory.cloudUserId(), 
							rm_id: rm_id
						},
						limit: 1
					}).then(function(results){

						console.log("GOT BUILDING RECORD");
						if( results.docs.length == 0 ) {
							defer.resolve(null);
						} else {
							defer.resolve(results.docs[0]);
						};

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			areas: {
				rmAreaRecord: function(rm_id) {
					var defer = $q.defer();

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.areas.existing_data ) {

						if( angular.isDefined(factory.utils.areas.existing_data[rm_id]) && factory.utils.areas.existing_data[rm_id] ) {
							
							console.log("EXISTING RECORD FOUND - UPDATE");
							var existing_record = factory.utils.areas.existing_data[rm_id];
							defer.resolve(existing_record);

						} else {
							console.log("RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.areas.find({
						selector: {
							table: 'areas',
							company_id: authFactory.getActiveCompanyId(),
							user_id: authFactory.cloudUserId(), 
							rm_id: rm_id
						},
						limit: 1
					}).then(function(results){

						console.log("GOT AREA RECORD");
						if( results.docs.length == 0 ) {
							defer.resolve(null);
						} else {
							defer.resolve(results.docs[0]);
						};

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			register_assets: {
				rmRegisterAssetRecord: function(rm_id) {
					var defer = $q.defer();

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.register_assets.existing_data ) {

						if( angular.isDefined(factory.utils.register_assets.existing_data[rm_id]) && factory.utils.register_assets.existing_data[rm_id] ) {
							
							console.log("EXISTING RECORD FOUND - UPDATE");
							var existing_record = factory.utils.register_assets.existing_data[rm_id];
							defer.resolve(existing_record);

						} else {
							console.log(rm_id + ": RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");

							// console.log(factory.utils.register_assets.existing_data[62103]);

							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.register_assets.find({
						selector: {
							table: 'register_assets',
							company_id: authFactory.getActiveCompanyId(),
							user_id: authFactory.cloudUserId(), 
							rm_id: rm_id
						},
						limit: 1
					}).then(function(results){

						console.log("GOT REGISTER ASSET RECORD");
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
				childAssets: function(rm_asset_id) {
					var defer = $q.defer();

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.register_assets.existing_data ) {

						var child_array = [];

						// FIND CHILDS IN EXISTING DB DATA
						for(var key in factory.utils.register_assets.existing_data ) {

							if( factory.utils.register_assets.existing_data[key].rm_parent_asset_id == rm_asset_id ) {
								child_array.push(factory.utils.register_assets.existing_data[key]);
							}

						}

						// FIND CHILDS IN NEW CLOUD DATA
						if( factory.utils.register_assets.new_data ) {

							for(var key in factory.utils.register_assets.new_data ) {

								if( factory.utils.register_assets.new_data[key].rm_parent_asset_id == rm_asset_id ) {
									child_array.push(factory.utils.register_assets.new_data[key]);
								}

							}

						}

						defer.resolve(child_array);

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.register_assets.find({
						selector: {
							table: 'register_assets',
							company_id: authFactory.getActiveCompanyId(),
							user_id: authFactory.cloudUserId(), 
							rm_parent_asset_id: rm_asset_id
						}
					}).then(function(results){

						console.log("GOT REGISTER CHILD ASSETS");
						defer.resolve(results.docs);

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			register_tasks: {
				rmRegisterTaskRecord: function(rm_id) {
					var defer = $q.defer();

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.register_tasks.existing_data ) {

						if( angular.isDefined(factory.utils.register_tasks.existing_data[rm_id]) && factory.utils.register_tasks.existing_data[rm_id] ) {
							
							console.log("EXISTING RECORD FOUND - UPDATE");
							var existing_record = factory.utils.register_tasks.existing_data[rm_id];
							defer.resolve(existing_record);

						} else {
							console.log("RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.register_tasks.find({
						selector: {
							table: 'register_tasks',
							company_id: authFactory.getActiveCompanyId(),
							user_id: authFactory.cloudUserId(), 
							rm_id: rm_id
						},
						limit: 1
					}).then(function(results){

						console.log("GOT TASK RECORD");
						if( results.docs.length == 0 ) {
							defer.resolve(null);
						} else {
							defer.resolve(results.docs[0]);
						};

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			register_media_records: {
				rmRegisterMediaRecord: function(rm_id) {
					var defer = $q.defer();

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.register_media_records.existing_data ) {

						if( angular.isDefined(factory.utils.register_media_records.existing_data[rm_id]) && factory.utils.register_media_records.existing_data[rm_id] ) {
							
							console.log("EXISTING RECORD FOUND - UPDATE");
							var existing_record = factory.utils.register_media_records.existing_data[rm_id];
							defer.resolve(existing_record);

						} else {
							console.log("RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.media.find({
						selector: {
							table: 'mediarecords',
							company_id: authFactory.getActiveCompanyId(),
							user_id: authFactory.cloudUserId(), 
							rm_id: rm_id
						},
						limit: 1
					}).then(function(results){

						console.log("GOT MEDIA RECORD");
						if( results.docs.length == 0 ) {
							defer.resolve(null);
						} else {
							defer.resolve(results.docs[0]);
						};

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			register_asset_ipp: {
				rmRegisterAssetIppRecord: function(local_asset_id, rm_pp_asset_relation_id, rm_profile_point_ref) {
					var defer = $q.defer();

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.register_asset_ipp.existing_data ) {

						// var key = "" + rm_asset_id + "_" + rm_profile_point_ref + "";
						var key = rm_pp_asset_relation_id;

						if( angular.isDefined(factory.utils.register_asset_ipp.existing_data[key]) && factory.utils.register_asset_ipp.existing_data[key] ) {
							console.log("EXISTING RECORD FOUND - UPDATE");
							var existing_record = factory.utils.register_asset_ipp.existing_data[key];
							defer.resolve(existing_record);

						} else {
							console.log("RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.register_asset_ipp.find({
						selector: {
							table: 'register_asset_ipp',
							company_id: authFactory.getActiveCompanyId(),
							user_id: authFactory.cloudUserId(), 
							rm_pp_asset_relation_id: rm_pp_asset_relation_id
						},
						limit: 1
					}).then(function(results){

						console.log("GOT REGISTER ASSET IPP RECORD");
						if( results.docs.length == 0 ) {
							defer.resolve(null);
						} else {
							defer.resolve(results.docs[0]);
						};

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			mr_meta: {
				subjectMrMetaRecord: function(subject_record_id, rm_subject_record_id, subject_record_type) {
					var defer = $q.defer();

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.mr_meta.existing_data ) {

						if( angular.isDefined(factory.utils.mr_meta.existing_data[rm_subject_record_id]) && factory.utils.mr_meta.existing_data[rm_subject_record_id] ) {
							
							console.log("EXISTING RECORD FOUND - UPDATE");
							var existing_record = factory.utils.mr_meta.existing_data[rm_subject_record_id];
							defer.resolve(existing_record);

						} else {
							console.log("RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.subject_mr_meta.find({
						selector: {
							subject_record_id: subject_record_id,
							subject_record_type: subject_record_type
						},
						limit: 1
					}).then(function(result) {
						console.log("FETCHED SUBJECT MR META");
						console.log(result.docs);

						if( result.docs.length == 0 ) {
							defer.resolve(null);
						} else {
							defer.resolve(result.docs[0]);
						}
					}).catch(function(error) {
						console.log("ERROR FETCHING SUBJECT MR META");
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			qr_register: {
				rmQrRecord: function(rm_id) {
					var defer = $q.defer();

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.qr_register.existing_data ) {

						if( angular.isDefined(factory.utils.qr_register.existing_data[rm_id]) && factory.utils.qr_register.existing_data[rm_id] ) {
							
							console.log("EXISTING RECORD FOUND - UPDATE");
							var existing_record = factory.utils.qr_register.existing_data[rm_id];
							defer.resolve(existing_record);

						} else {
							console.log("RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.qr_register.find({
						selector: {
							table: 'qr_register',
							rm_id: rm_id
						},
						limit: 1
					}).then(function(results){

						console.log("GOT QR RECORD");
						if( results.docs.length == 0 ) {
							defer.resolve(null);
						} else {
							defer.resolve(results.docs[0]);
						};

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			record_assets: {
				rmRecordAsset: function(rm_id) {
					var defer = $q.defer();

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.record_assets.existing_data ) {

						if( factory.utils.record_assets.existing_data.hasOwnProperty( parseInt(rm_id) ) ) {
							
							console.log("EXISTING RECORD FOUND - UPDATE");
							var existing_record = factory.utils.record_assets.existing_data[rm_id];
							defer.resolve(existing_record);

						} else {
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.register_assets.find({
						selector: {
							table: 'register_assets',
							company_id: authFactory.getActiveCompanyId(),
							user_id: authFactory.cloudUserId(), 
							rm_id: rm_id
						},
						limit: 1
					}).then(function(results){

						console.log("GOT RECORD ASSET");
						if( results.docs.length == 0 ) {
							defer.resolve(null);
						} else {
							defer.resolve(results.docs[0]);
						};

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}
			}
		}

		factory.dbUtils = {
			sites: {
				saveSiteRecord: function(site_record) {
					var defer = $q.defer();

					factory.dbUtils.sites.doSaveSiteRecord(site_record).then(function(saved_site) {

						// SETUP RECORD ASSET
						var record_asset = {};
						record_asset.rm_id = saved_site.rm_record_asset_id;
						record_asset.rm_record_id = saved_site.rm_id;
						record_asset.record_id = saved_site._id;
						record_asset.asset_ref = saved_site.record_asset_ref;
						record_asset.description = saved_site.record_asset_description;
						record_asset.record_type = 'site';
						record_asset.company_id = authFactory.getActiveCompanyId();
						record_asset.user_id = authFactory.cloudUserId();

						// SET RECORD ASSET LOCATION
						record_asset.site_id = saved_site._id;
						record_asset.rm_site_id = saved_site.rm_id;

						// SAVE RECORD ASSET
						factory.dbUtils.record_assets.saveRecordAsset(record_asset).then(function(saved_asset) {

							saved_site.record_asset_id = saved_asset._id;

							var options = {
								force: true
							};

							// UPDATE LOCAL RECORD ASSET ID
							riskmachDatabasesFactory.databases.collection.sites.post(saved_site, options).then(function(site_result) {
								
								saved_site._id = site_result.id;
								saved_site._rev = site_result.rev;

								defer.resolve(saved_site);

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
				},
				doSaveSiteRecord: function(site_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					site_record = factory.utils.formatRmRecordToModel('site', site_record);

					// SET VALUES FOR SYNC
					site_record = factory.utils.setSyncValues(site_record);

					// FORMAT ANY ANOMALIES
					site_record = factory.utils.sites.formatSiteRecord(site_record);

					factory.dbFetch.sites.rmSiteRecord(site_record.rm_id).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.sites.saveNewSiteRecord(site_record).then(function(saved_site) {
								defer.resolve(saved_site);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.sites.updateSiteRecord(site_record, existing_record).then(function(saved_site) {
								
								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.sites.existing_data ) {

									if( angular.isDefined(factory.utils.sites.existing_data[saved_site.rm_id]) && factory.utils.sites.existing_data[saved_site.rm_id] ) {
											
										factory.utils.sites.existing_data[saved_site.rm_id]._id = saved_site._id;
										factory.utils.sites.existing_data[saved_site.rm_id]._rev = saved_site._rev;
									}
								}

								defer.resolve(saved_site);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				saveNewSiteRecord: function(site_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					// SET RM OBJECT
					var rm_record = angular.copy(site_record);
					site_record.rm_record = rm_record;

					riskmachDatabasesFactory.databases.collection.sites.post(site_record, options).then(function(saved_record) {
						site_record._id = saved_record.id;
						site_record._rev = saved_record.rev;

						console.log("SAVED SITE");

						defer.resolve(site_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateSiteRecord: function(site_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.sites;

					var options = {
						force: true
					};

					// IF THE APP RECORD HAS NOT BEEN MODIFIED
					if( existing_record.record_modified == 'No' ) {
						// SET RM RECORD OBJECT
						var rm_record = angular.copy(site_record);
						site_record.rm_record = rm_record;

						// SET ID/REV ON RM RECORD
						site_record._id = existing_record._id;
						site_record._rev = existing_record._rev;

						db.post(site_record, options).then(function(saved_record) {
							site_record._id = saved_record.id;
							site_record._rev = saved_record.rev;

							console.log("SITE RECORD UPDATED ENTIRELY");

							defer.resolve(site_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = doc;

						// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
						if( site_record.date_modified > existing_record.date_modified ) {
							existing_record.rm_record_modified = 'Yes';
						};

						// CLEAR OLD RM RECORD
						existing_record.rm_record = null;

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(site_record);
						existing_record.rm_record = rm_record;

						db.post(existing_record, options).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							console.log("SITE RM RECORD UPDATED");

							defer.resolve(existing_record);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingRmSites: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.sites.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.sites;

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) 
					{
						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								factory.utils.sites.filterExistingRmSites(result.rows);

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
				}
			},
			buildings: {
				saveBuildingRecord: function(building_record) {
					var defer = $q.defer();

					factory.dbUtils.buildings.doSaveBuildingRecord(building_record).then(function(saved_building) {

						// SETUP RECORD ASSET
						var record_asset = {};
						record_asset.rm_id = saved_building.rm_record_asset_id;
						record_asset.rm_record_id = saved_building.rm_id;
						record_asset.record_id = saved_building._id;
						record_asset.asset_ref = saved_building.record_asset_ref;
						record_asset.description = saved_building.record_asset_description;
						record_asset.record_type = 'building';
						record_asset.company_id = authFactory.getActiveCompanyId();
						record_asset.user_id = authFactory.cloudUserId();

						// SET RECORD ASSET LOCATION
						record_asset.site_id = saved_building.site_id;
						record_asset.rm_site_id = saved_building.rm_site_id;

						record_asset.building_id = saved_building._id;
						record_asset.rm_building_id = saved_building.rm_id;

						// SAVE RECORD ASSET
						factory.dbUtils.record_assets.saveRecordAsset(record_asset).then(function(saved_asset) {

							saved_building.record_asset_id = saved_asset._id;

							var options = {
								force: true
							};

							// UPDATE LOCAL RECORD ASSET ID
							riskmachDatabasesFactory.databases.collection.buildings.post(saved_building, options).then(function(building_result) {
								
								saved_building._id = building_result.id;
								saved_building._rev = building_result.rev;

								defer.resolve(saved_building);

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
				},
				doSaveBuildingRecord: function(building_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					building_record = factory.utils.formatRmRecordToModel('building', building_record);

					// SET VALUES FOR SYNC
					building_record = factory.utils.setSyncValues(building_record);

					// FORMAT ANY ANOMALIES
					building_record = factory.utils.buildings.formatBuildingRecord(building_record);

					factory.dbFetch.buildings.rmBuildingRecord(building_record.rm_id).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.buildings.saveNewBuildingRecord(building_record).then(function(saved_building) {
								defer.resolve(saved_building);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.buildings.updateBuildingRecord(building_record, existing_record).then(function(saved_building) {
								
								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.buildings.existing_data ) {

									if( angular.isDefined(factory.utils.buildings.existing_data[saved_building.rm_id]) && factory.utils.buildings.existing_data[saved_building.rm_id] ) {
											
										factory.utils.buildings.existing_data[saved_building.rm_id]._id = saved_building._id;
										factory.utils.buildings.existing_data[saved_building.rm_id]._rev = saved_building._rev;
									}
								}

								defer.resolve(saved_building);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				saveNewBuildingRecord: function(building_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					// SET RM OBJECT
					var rm_record = angular.copy(building_record);
					building_record.rm_record = rm_record;

					riskmachDatabasesFactory.databases.collection.buildings.post(building_record, options).then(function(saved_record) {
						building_record._id = saved_record.id;
						building_record._rev = saved_record.rev;

						console.log("SAVED BUILDING");

						defer.resolve(building_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				updateBuildingRecord: function(building_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.buildings;

					var options = {
						force: true
					};

					// IF THE APP RECORD HAS NOT BEEN MODIFIED
					if( existing_record.record_modified == 'No' ) {
						// SET RM RECORD OBJECT
						var rm_record = angular.copy(building_record);
						building_record.rm_record = rm_record;

						// SET ID/REV ON RM RECORD
						building_record._id = existing_record._id;
						building_record._rev = existing_record._rev;

						db.post(building_record, options).then(function(saved_record) {
							building_record._id = saved_record.id;
							building_record._rev = saved_record.rev;

							console.log("BUILDING RECORD UPDATED ENTIRELY");

							defer.resolve(building_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = doc;

						// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
						if( building_record.date_modified > existing_record.date_modified ) {
							existing_record.rm_record_modified = 'Yes';
						};

						// CLEAR OLD RM RECORD
						existing_record.rm_record = null;

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(building_record);
						existing_record.rm_record = rm_record;

						db.post(existing_record, options).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							console.log("BUILDING RM RECORD UPDATED");

							defer.resolve(existing_record);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingRmBuildings: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.buildings.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.buildings;

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) 
					{
						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								factory.utils.buildings.filterExistingRmBuildings(result.rows);

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
				}
			},
			areas: {
				saveAreaRecord: function(area_record) {
					var defer = $q.defer();

					factory.dbUtils.areas.doSaveAreaRecord(area_record).then(function(saved_area) {

						// SETUP RECORD ASSET
						var record_asset = {};
						record_asset.rm_id = saved_area.rm_record_asset_id;
						record_asset.rm_record_id = saved_area.rm_id;
						record_asset.record_id = saved_area._id;
						record_asset.asset_ref = saved_area.record_asset_ref;
						record_asset.description = saved_area.record_asset_description;
						record_asset.record_type = 'area';
						record_asset.company_id = authFactory.getActiveCompanyId();
						record_asset.user_id = authFactory.cloudUserId();

						// SET RECORD ASSET LOCATION
						record_asset.site_id = saved_area.site_id;
						record_asset.rm_site_id = saved_area.rm_site_id;

						record_asset.building_id = saved_area.building_id;
						record_asset.rm_building_id = saved_area.rm_building_id;

						record_asset.area_id = saved_area._id;
						record_asset.rm_area_id = saved_area.rm_id;

						// SAVE RECORD ASSET
						factory.dbUtils.record_assets.saveRecordAsset(record_asset).then(function(saved_asset) {

							saved_area.record_asset_id = saved_asset._id;

							var options = {
								force: true
							};

							// UPDATE LOCAL RECORD ASSET ID
							riskmachDatabasesFactory.databases.collection.areas.post(saved_area, options).then(function(area_result) {
								
								saved_area._id = area_result.id;
								saved_area._rev = area_result.rev;

								defer.resolve(saved_area);

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
				},
				doSaveAreaRecord: function(area_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					area_record = factory.utils.formatRmRecordToModel('area', area_record);

					// SET VALUES FOR SYNC
					area_record = factory.utils.setSyncValues(area_record);

					// FORMAT ANY ANOMALIES
					area_record = factory.utils.areas.formatAreaRecord(area_record);

					factory.dbFetch.areas.rmAreaRecord(area_record.rm_id).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.areas.saveNewAreaRecord(area_record).then(function(saved_area) {
								defer.resolve(saved_area);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.areas.updateAreaRecord(area_record, existing_record).then(function(saved_area) {
								
								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.areas.existing_data ) {

									if( angular.isDefined(factory.utils.areas.existing_data[saved_area.rm_id]) && factory.utils.areas.existing_data[saved_area.rm_id] ) {
											
										factory.utils.areas.existing_data[saved_area.rm_id]._id = saved_area._id;
										factory.utils.areas.existing_data[saved_area.rm_id]._rev = saved_area._rev;
									}
								}

								defer.resolve(saved_area);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				saveNewAreaRecord: function(area_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					// SET RM OBJECT
					var rm_record = angular.copy(area_record);
					area_record.rm_record = rm_record;

					riskmachDatabasesFactory.databases.collection.areas.post(area_record, options).then(function(saved_record) {
						area_record._id = saved_record.id;
						area_record._rev = saved_record.rev;

						console.log("SAVED AREA");

						defer.resolve(area_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				updateAreaRecord: function(area_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.areas;

					var options = {
						force: true
					};

					// IF THE APP RECORD HAS NOT BEEN MODIFIED
					if( existing_record.record_modified == 'No' ) {
						// SET RM RECORD OBJECT
						var rm_record = angular.copy(area_record);
						area_record.rm_record = rm_record;

						// SET ID/REV ON RM RECORD
						area_record._id = existing_record._id;
						area_record._rev = existing_record._rev;

						db.post(area_record, options).then(function(saved_record) {
							area_record._id = saved_record.id;
							area_record._rev = saved_record.rev;

							console.log("AREA RECORD UPDATED ENTIRELY");

							defer.resolve(area_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = doc;

						// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
						if( area_record.date_modified > existing_record.date_modified ) {
							existing_record.rm_record_modified = 'Yes';
						};

						// CLEAR OLD RM RECORD
						existing_record.rm_record = null;

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(area_record);
						existing_record.rm_record = rm_record;

						db.post(existing_record, options).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							console.log("AREA RM RECORD UPDATED");

							defer.resolve(existing_record);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingRmAreas: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.areas.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.areas;

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) 
					{
						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								factory.utils.areas.filterExistingRmAreas(result.rows);

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
				}
			},
			register_assets: {
				saveRegisterAssetRecord: function(asset_record) {
					var defer = $q.defer();

					factory.dbUtils.register_assets.doSaveRegisterAssetRecord(asset_record).then(function(saved_asset) {

						if( !saved_asset ) {
							defer.resolve(null);
							return defer.promise;
						}

						factory.dbUtils.register_assets.updateChildAssetsParentId(saved_asset.rm_id, saved_asset._id).then(function() {

							defer.resolve(saved_asset);

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveRegisterAssetRecord: function(asset_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					asset_record = factory.utils.formatRmRecordToModel('register_asset', asset_record);

					// SET VALUES FOR SYNC
					asset_record = factory.utils.setSyncValues(asset_record);

					// FORMAT ANY ANOMALIES
					asset_record = factory.utils.register_assets.formatAssetRecord(asset_record);

					factory.dbFetch.register_assets.rmRegisterAssetRecord(asset_record.rm_id).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.register_assets.saveNewRegisterAssetRecord(asset_record).then(function(saved_asset) {
								defer.resolve(saved_asset);
							}, function(error) {
								defer.reject(error);
							});
						} else {

							factory.dbUtils.register_assets.updateRegisterAssetRecord(asset_record, existing_record).then(function(saved_asset) {
								
								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.register_assets.existing_data ) {

									if( angular.isDefined(factory.utils.register_assets.existing_data[saved_asset.rm_id]) && factory.utils.register_assets.existing_data[saved_asset.rm_id] ) {
											
										factory.utils.register_assets.existing_data[saved_asset.rm_id]._id = saved_asset._id;
										factory.utils.register_assets.existing_data[saved_asset.rm_id]._rev = saved_asset._rev;
									}
								}

								defer.resolve(saved_asset);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				saveNewRegisterAssetRecord: function(asset_record) {
					var defer = $q.defer();

					// DON'T SAVE DELETED ASSET
					if( asset_record.status == 2 || asset_record.status == 3 ) {
						defer.resolve(null);
						return defer.promise;
					}

					var options = {
						force: true
					};

					// SET RM OBJECT
					var rm_record = angular.copy(asset_record);
					asset_record.rm_record = rm_record;

					riskmachDatabasesFactory.databases.collection.register_assets.post(asset_record, options).then(function(saved_record) {
						asset_record._id = saved_record.id;
						asset_record._rev = saved_record.rev;

						var new_record = {
							_id: asset_record._id, 
							_rev: asset_record._rev, 
							rm_id: asset_record.rm_id, 
							rm_parent_asset_id: asset_record.rm_parent_asset_id,
							record_modified: asset_record.record_modified, 
							date_modified: asset_record.date_modified,
							not_whole_doc: true
						};

						factory.utils.register_assets.new_data[asset_record.rm_id] = new_record;

						console.log("SAVED REGISTER ASSET");

						defer.resolve(asset_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				updateRegisterAssetRecord: function(asset_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.register_assets;

					var options = {
						force: true
					};

					// IF THE APP RECORD HAS NOT BEEN MODIFIED
					if( existing_record.record_modified == 'No' ) {
						// SET RM RECORD OBJECT
						var rm_record = angular.copy(asset_record);
						asset_record.rm_record = rm_record;

						// SET ID/REV ON RM RECORD
						asset_record._id = existing_record._id;
						asset_record._rev = existing_record._rev;

						// IF BUILDING ID NOT SET DUE TO PARTIAL CORE DOWNLOAD
						if( !asset_record.building_id ) {
							// SET TO EXISTING RECORD BUILDING ID
							asset_record.building_id = existing_record.building_id;
						}

						// IF AREA ID NOT SET DUE TO PARTIAL CORE DOWNLOAD
						if( !asset_record.area_id ) {
							// SET TO EXISTING RECORD AREA ID
							asset_record.area_id = existing_record.area_id;
						}

						db.post(asset_record, options).then(function(saved_record) {
							asset_record._id = saved_record.id;
							asset_record._rev = saved_record.rev;

							console.log("REGISTER ASSET RECORD UPDATED ENTIRELY");

							defer.resolve(asset_record);
						}).catch(function(error) {
							console.log("ERROR UPDATING ASSET RECORD ENTIRELY");
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = doc;

						// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
						if( asset_record.date_modified > existing_record.date_modified ) {
							existing_record.rm_record_modified = 'Yes';
						};

						// CLEAR OLD RM RECORD
						existing_record.rm_record = null;

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(asset_record);
						existing_record.rm_record = rm_record;

						db.post(existing_record, options).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							console.log("REGISTER ASSET RM RECORD UPDATED");

							defer.resolve(existing_record);
						}).catch(function(error) {
							console.log("ERROR UPDATING REGISTER ASSET RM RECORD");
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateChildAssetsParentId: function(rm_asset_id, local_asset_id) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					factory.dbFetch.register_assets.childAssets(rm_asset_id).then(function(child_assets) {

						console.log("CHILD ASSETS");
						console.log(child_assets);

						if( child_assets.length == 0 ) {
							defer.resolve();
							return defer.promise;
						};

						var active_index = 0;

						var db = riskmachDatabasesFactory.databases.collection.register_assets;

						updateChildAssetsParentId(save_defer, child_assets[active_index]).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});

						function updateChildAssetsParentId(defer, asset) {
							
							// IF ONLY PART OF THE DOC FETCHED, GET WHOLE DOC
							if( asset.hasOwnProperty('not_whole_doc') && asset.not_whole_doc ) {

								db.get(asset._id).then(function(doc) {

									doc.parent_asset_id = local_asset_id;

									// console.log("GOT WHOLE DOC");

									db.put(doc).then(function(result) {

										doc._id = result.id;
										doc._rev = result.rev;

										// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
										if( factory.utils.register_assets.existing_data ) {
											if( angular.isDefined(factory.utils.register_assets.existing_data[doc.rm_id]) && factory.utils.register_assets.existing_data[doc.rm_id] ) {
												factory.utils.register_assets.existing_data[doc.rm_id]._id = doc._id;
												factory.utils.register_assets.existing_data[doc.rm_id]._rev = doc._rev;
											}
										}

										// IF NEW CLOUD DATA, UPDATE REV
										if( factory.utils.register_assets.new_data ) {
											if( angular.isDefined(factory.utils.register_assets.new_data[doc.rm_id]) && factory.utils.register_assets.new_data[doc.rm_id] ) {
												factory.utils.register_assets.new_data[doc.rm_id]._id = doc._id;
												factory.utils.register_assets.new_data[doc.rm_id]._rev = doc._rev;
											}
										}

										active_index++;

										if( active_index > child_assets.length - 1 ) {
											defer.resolve();
											return defer.promise;
										};

										updateChildAssetsParentId(defer, child_assets[active_index]);

									}).catch(function(error) {
										defer.reject(error);
									});

								}).catch(function(error) {
									defer.reject(error);
								});

								return defer.promise;
							}

							// IF WHOLE DOC ALREADY FETCHED
							asset.parent_asset_id = local_asset_id;

							db.put(asset).then(function(result) {

								asset._id = result.id;
								asset._rev = result.rev;

								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.register_assets.existing_data ) {

									if( angular.isDefined(factory.utils.register_assets.existing_data[asset.rm_id]) && factory.utils.register_assets.existing_data[asset.rm_id] ) {
											
										factory.utils.register_assets.existing_data[asset.rm_id]._id = asset._id;
										factory.utils.register_assets.existing_data[asset.rm_id]._rev = asset._rev;
									}
								}

								active_index++;

								if( active_index > child_assets.length - 1 ) {
									defer.resolve();
									return defer.promise;
								};

								updateChildAssetsParentId(defer, child_assets[active_index]);

							}).catch(function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingRmRegisterAssets: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.register_assets.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.register_assets;

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) 
					{
						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								factory.utils.register_assets.filterExistingRmRegisterAssets(result.rows);

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
				indexQrRecordOnCoreAsset: function(qr_record) {
					var defer = $q.defer();

					if( !qr_record.hasOwnProperty('record_id') || !qr_record.record_id ) {
						defer.resolve();
						return defer.promise;
					}

					var db = riskmachDatabasesFactory.databases.collection.register_assets;

					db.get(qr_record.record_id).then(function(asset_doc) {

						if( !asset_doc.hasOwnProperty('associated_qr_codes') || !asset_doc.associated_qr_codes ) {
							asset_doc.associated_qr_codes = [];
						}

						if( asset_doc.associated_qr_codes.length == 0 ) 
						{
							asset_doc.associated_qr_codes.push(qr_record);
						}
						else
						{
							// ATTEMPT FIND EXISTING QR IN ARRAY
							var i = 0;
							var len = asset_doc.associated_qr_codes.length;
							var qr_index = null;
							while(i < len) {
								if( asset_doc.associated_qr_codes[i]._id == qr_record._id ) {
									qr_index = i;
								}

								i++;
							}

							// IF QR FOUND, UPDATE ELSE ADD NEW TO ARRAY
							if( qr_index != null ) {
								asset_doc.associated_qr_codes[qr_index] = qr_record;
							} else {
								asset_doc.associated_qr_codes.push(qr_record);
							}
						}

						db.put(asset_doc).then(function(result) {

							asset_doc._id = result.id;
							asset_doc._rev = result.rev;

							defer.resolve(asset_doc);

						}).catch(function(error) {
							console.log("ERROR INDEXING QR ON ASSET");
							defer.reject(error);
						});

					}).catch(function(error) {
						console.log("ERROR FINDING QR ASSET");
						defer.reject(error);
					});

					return defer.promise;
				},
				indexIppScoreOnCoreAsset: function(ipp_score) {
					var defer = $q.defer();

					if( !ipp_score.hasOwnProperty('asset_id') || !ipp_score.asset_id ) {
						defer.resolve();
						return defer.promise;
					}

					var db = riskmachDatabasesFactory.databases.collection.register_assets;

					db.get(ipp_score.asset_id).then(function(asset_doc) {

						var deleted = false;
						if( ipp_score.status == 2 ) {
							deleted = true;
						}

						// SETUP ARRAY IF NOT ONE
						if( !asset_doc.hasOwnProperty('associated_ipp_scores') || !asset_doc.associated_ipp_scores ) {
							asset_doc.associated_ipp_scores = [];
						}

						var i = 0;
						var len = asset_doc.associated_ipp_scores.length;
						var ipp_index = null;

						if( deleted ) {

							if( asset_doc.associated_ipp_scores.length > 0 ) {
								// ATTEMPT FIND AND SPLICE
								while(i < len) {
									if( asset_doc.associated_ipp_scores[i]._id == ipp_score._id ) {
										ipp_index = i;
									}

									i++;
								}

								// IF IPP SCORE FOUND, UPDATE ELSE ADD NEW TO ARRAY
								if( ipp_index != null ) {
									asset_doc.associated_ipp_scores.splice(ipp_index, 1);
								}
							}

						} else {

							if( asset_doc.associated_ipp_scores.length > 0 ) {
								
								// ATTEMPT FIND EXISTING IPP SCORE IN ARRAY
								while(i < len) {
									if( asset_doc.associated_ipp_scores[i]._id == ipp_score._id ) {
										ipp_index = i;
									}

									i++;
								}

								// IF IPP SCORE FOUND, UPDATE ELSE ADD NEW TO ARRAY
								if( ipp_index != null ) {
									asset_doc.associated_ipp_scores[ipp_index] = ipp_score;
								} else {
									asset_doc.associated_ipp_scores.push(ipp_score);
								}

							} else {
								asset_doc.associated_ipp_scores.push(ipp_score);
							}

						}

						db.put(asset_doc).then(function(result) {

							asset_doc._id = result.id;
							asset_doc._rev = result.rev;

							defer.resolve(asset_doc);

						}).catch(function(error) {
							console.log("ERROR: " + error);
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			register_tasks: {
				saveRegisterTaskRecord: function(task_record) {
					var defer = $q.defer();

					factory.dbUtils.register_tasks.doSaveRegisterTaskRecord(task_record).then(function(saved_task) {

						// SETUP RECORD ASSET
						var record_asset = {};
						record_asset.rm_id = saved_task.rm_record_asset_id;
						record_asset.rm_record_id = saved_task.rm_id;
						record_asset.record_id = saved_task._id;
						record_asset.asset_ref = saved_task.record_asset_ref;
						record_asset.description = saved_task.record_asset_description;
						record_asset.record_type = 'task';
						record_asset.company_id = authFactory.getActiveCompanyId();
						record_asset.user_id = authFactory.cloudUserId();

						// SET RECORD ASSET LOCATION
						record_asset.site_id = saved_task.site_id;
						record_asset.rm_site_id = saved_task.rm_site_id;

						record_asset.building_id = saved_task.building_id;
						record_asset.rm_building_id = saved_task.rm_building_id;

						record_asset.area_id = saved_task.area_id;
						record_asset.rm_area_id = saved_task.rm_area_id;

						// SAVE RECORD ASSET
						factory.dbUtils.record_assets.saveRecordAsset(record_asset).then(function(saved_asset) {

							saved_task.record_asset_id = saved_asset._id;

							var options = {
								force: true
							};

							// UPDATE LOCAL RECORD ASSET ID
							riskmachDatabasesFactory.databases.collection.register_tasks.post(saved_task, options).then(function(task_result) {
								
								saved_task._id = task_result.id;
								saved_task._rev = task_result.rev;
								
								defer.resolve(saved_task);

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
				},	
				doSaveRegisterTaskRecord: function(task_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					task_record = factory.utils.formatRmRecordToModel('task', task_record);

					// SET VALUES FOR SYNC
					task_record = factory.utils.setSyncValues(task_record);

					factory.dbFetch.register_tasks.rmRegisterTaskRecord(task_record.rm_id).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.register_tasks.saveNewRegisterTaskRecord(task_record).then(function(saved_task) {
								defer.resolve(saved_task);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.register_tasks.updateRegisterTaskRecord(task_record, existing_record).then(function(saved_task) {
								
								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.register_tasks.existing_data ) {

									if( angular.isDefined(factory.utils.register_tasks.existing_data[saved_task.rm_id]) && factory.utils.register_tasks.existing_data[saved_task.rm_id] ) {
											
										factory.utils.register_tasks.existing_data[saved_task.rm_id]._id = saved_task._id;
										factory.utils.register_tasks.existing_data[saved_task.rm_id]._rev = saved_task._rev;
									}
								}

								defer.resolve(saved_task);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				saveNewRegisterTaskRecord: function(task_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					// SET RM OBJECT
					var rm_record = angular.copy(task_record); 
					task_record.rm_record = rm_record;

					riskmachDatabasesFactory.databases.collection.register_tasks.post(task_record, options).then(function(saved_record) {
						task_record._id = saved_record.id;
						task_record._rev = saved_record.rev;

						console.log("SAVED TASK RECORD");

						defer.resolve(task_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				updateRegisterTaskRecord: function(task_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.register_tasks;

					var options = {
						force: true
					};

					// IF THE APP RECORD HAS NOT BEEN MODIFIED
					if( existing_record.record_modified == 'No' ) {
						// SET RM RECORD OBJECT
						var rm_record = angular.copy(task_record);
						task_record.rm_record = rm_record;

						// SET ID/REV ON RM RECORD
						task_record._id = existing_record._id;
						task_record._rev = existing_record._rev;

						db.post(task_record, options).then(function(saved_record) {
							task_record._id = saved_record.id;
							task_record._rev = saved_record.rev;

							console.log("TASK RECORD UPDATED ENTIRELY");

							defer.resolve(task_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = doc;

						// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
						if( task_record.date_modified > existing_record.date_modified ) {
							existing_record.rm_record_modified = 'Yes';
						};

						// CLEAR OLD RM RECORD
						existing_record.rm_record = null;

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(task_record);
						existing_record.rm_record = rm_record;

						db.post(existing_record, options).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							console.log("TASK RM RECORD UPDATED");

							defer.resolve(existing_record);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingRmRegisterTasks: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.register_tasks.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.register_tasks;

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) 
					{
						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								factory.utils.register_tasks.filterExistingRmRegisterTasks(result.rows);

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
				}
			},
			register_media_records: {
				saveRegisterMediaRecord: function(media_record) {
					var defer = $q.defer();

					factory.dbUtils.register_media_records.doSaveRegisterMediaRecord(media_record).then(function(saved_media) {

						// rm_profile_image_media_id
						// UPDATE RECORDS PROFILE IMAGE ID

						defer.resolve(saved_media);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveRegisterMediaRecord: function(media_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					media_record = factory.utils.formatRmRecordToModel('media_record', media_record);

					// SET VALUES FOR SYNC
					media_record = factory.utils.setSyncValues(media_record);

					// FORMAT ANY ANOMALIES
					media_record = factory.utils.register_media_records.formatRegisterMediaRecord(media_record);

					// TEST MEDIA PATH URL
					// media_record.media_path = 'https://elasticbeanstalk-eu-west-1-638507748612.s3.eu-west-1.amazonaws.com/testmedia/1630595958963.jpg';

					factory.dbFetch.register_media_records.rmRegisterMediaRecord(media_record.rm_id).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.register_media_records.saveNewRegisterMediaRecord(media_record).then(function(saved_media) {
								defer.resolve(saved_media);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.register_media_records.updateRegisterMediaRecord(media_record, existing_record).then(function(saved_media) {
								
								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.register_media_records.existing_data ) {

									if( angular.isDefined(factory.utils.register_media_records.existing_data[saved_media.rm_id]) && factory.utils.register_media_records.existing_data[saved_media.rm_id] ) {
											
										factory.utils.register_media_records.existing_data[saved_media.rm_id]._id = saved_media._id;
										factory.utils.register_media_records.existing_data[saved_media.rm_id]._rev = saved_media._rev;
									}
								}

								defer.resolve(saved_media);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				saveNewRegisterMediaRecord: function(media_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					// SET RM OBJECT
					var rm_record = angular.copy(media_record);
					media_record.rm_record = rm_record;

					riskmachDatabasesFactory.databases.collection.media.post(media_record, options).then(function(saved_record) {
						media_record._id = saved_record.id;
						media_record._rev = saved_record.rev;

						console.log("SAVED MEDIA RECORD");

						defer.resolve(media_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateRegisterMediaRecord: function(media_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.media;

					var options = {
						force: true
					};

					// RETAIN LOCAL VALUES
					media_record.file_downloaded = existing_record.file_downloaded;
					media_record.attachment_key = existing_record.attachment_key;
					media_record._attachments = existing_record._attachments;

					// IF NEW CLOUD REVISION, SET CLOUD RECORD'S FILE DOWNLOADED TO NO
					if(  media_record.rm_revision_number && existing_record.rm_revision_number != media_record.rm_revision_number ) {
						media_record.file_downloaded = null;
					}

					// IF THE APP RECORD HAS NOT BEEN MODIFIED
					if( existing_record.record_modified == 'No' ) {
						// SET RM RECORD OBJECT
						var rm_record = angular.copy(media_record);
						media_record.rm_record = rm_record;

						// SET ID/REV ON RM RECORD
						media_record._id = existing_record._id;
						media_record._rev = existing_record._rev;

						db.post(media_record, options).then(function(saved_record) {
							media_record._id = saved_record.id;
							media_record._rev = saved_record.rev;

							console.log("MEDIA RECORD UPDATED ENTIRELY");

							defer.resolve(media_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = doc;

						// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
						if( media_record.date_modified > existing_record.date_modified ) {
							existing_record.rm_record_modified = 'Yes';
						};

						// CLEAR OLD RM RECORD
						existing_record.rm_record = null;

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(media_record);
						existing_record.rm_record = rm_record;

						db.post(existing_record, options).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							console.log("MEDIA RM RECORD UPDATED");

							defer.resolve(existing_record);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingRmRegisterMediaRecords: function(asset_keys) {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.register_media_records.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.media;

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) 
					{
						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								factory.utils.register_media_records.filterExistingRmRegisterMediaRecords(result.rows, asset_keys);

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
				}
			},
			register_asset_ipp: {
				saveRegisterAssetIppRecord: function(ipp_record) {
					var defer = $q.defer();

					factory.dbUtils.register_asset_ipp.doSaveRegisterAssetIppRecord(ipp_record).then(function(saved_ipp) {

						defer.resolve(saved_ipp);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveRegisterAssetIppRecord: function(ipp_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					ipp_record = factory.utils.formatRmRecordToModel('ipp_score', ipp_record);

					// SET VALUES FOR SYNC
					ipp_record = factory.utils.setSyncValues(ipp_record);

					// FORMAT
					ipp_record = factory.utils.register_asset_ipp.formatRegisterAssetIppRecord(ipp_record);

					factory.dbFetch.register_asset_ipp.rmRegisterAssetIppRecord(ipp_record.asset_id, ipp_record.rm_pp_asset_relation_id, ipp_record.rm_profile_point_ref).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.register_asset_ipp.saveNewRegisterAssetIppRecord(ipp_record).then(function(saved_ipp) {
								defer.resolve(saved_ipp);
							}, function(error) {
								console.log("ERROR NEW");
								defer.reject(error);
							});
						} else {
							factory.dbUtils.register_asset_ipp.updateRegisterAssetIppRecord(ipp_record, existing_record).then(function(saved_ipp) {
								
								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.register_asset_ipp.existing_data ) {

									// var key = "" + saved_ipp.rm_asset_id + "_" + saved_ipp.rm_profile_point_ref + "";
									var key = saved_ipp.rm_pp_asset_relation_id;

									if( angular.isDefined(factory.utils.register_asset_ipp.existing_data[key]) && factory.utils.register_asset_ipp.existing_data[key] ) {
											
										factory.utils.register_asset_ipp.existing_data[key]._id = saved_ipp._id;
										factory.utils.register_asset_ipp.existing_data[key]._rev = saved_ipp._rev;
									}
								}

								defer.resolve(saved_ipp);
							}, function(error) {
								console.log("ERROR UPDATE");
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				saveNewRegisterAssetIppRecord: function(ipp_record) {
					var defer = $q.defer();

					// if( !ipp_record.asset_id ) {
					// 	defer.resolve(ipp_record);
					// 	return defer.promise;
					// }

					var options = {
						force: true
					};

					// SET RM OBJECT
					var rm_record = angular.copy(ipp_record);
					ipp_record.rm_record = rm_record;

					riskmachDatabasesFactory.databases.collection.register_asset_ipp.post(ipp_record, options).then(function(saved_record) {
						ipp_record._id = saved_record.id;
						ipp_record._rev = saved_record.rev;

						console.log("SAVED REGISTER ASSET IPP RECORD");

						defer.resolve(ipp_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				updateRegisterAssetIppRecord: function(ipp_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.register_asset_ipp;

					var options = {
						force: true
					};

					// REMOVE ANY UNWANTED PROPERTIES ON EXISTING RECORD
					if( existing_record.hasOwnProperty('refreshing') ) {
						delete existing_record.refreshing;
					}

					if( existing_record.hasOwnProperty('show_more_info') ) {
						delete existing_record.show_more_info;
					}

					// IF ASSET ID NOT SET ON CLOUD RECORD, APPLY DB RECORD ASSET ID
					if( !ipp_record.hasOwnProperty('asset_id') || !ipp_record.asset_id ) {
						ipp_record.asset_id = existing_record.asset_id;
					}

					// IF THE APP RECORD HAS NOT BEEN MODIFIED
					if( existing_record.record_modified == 'No' ) {
						// SET RM RECORD OBJECT
						var rm_record = angular.copy(ipp_record);
						ipp_record.rm_record = rm_record;

						// RETAIN LOCAL AUDIT VALUE
						if( existing_record.hasOwnProperty('audit_id') && existing_record.audit_id ) {
							ipp_record.audit_id = existing_record.audit_id;
						}

						// IF ACTIVE LOCAL AUDIT, ATTEMPT RETAIN LOCAL AUDIT STARTED VALUE
						if( ipp_record.audit_id ) {

							// RETAIN AUDIT STARTED IF SET
							if( existing_record.hasOwnProperty('audit_started') && existing_record.audit_started ) {
								ipp_record.audit_started = existing_record.audit_started;
							} 

						}

						// if( existing_record.hasOwnProperty('audit_started') && existing_record.audit_started ) {
						// 	ipp_record.audit_started = existing_record.audit_started;
						// }

						// RETAIN PINNED VALUES
						if( existing_record.hasOwnProperty('pinned') && existing_record.pinned ) {
							ipp_record.pinned = existing_record.pinned;
						}

						// SET ID/REV ON RM RECORD
						ipp_record._id = existing_record._id;
						ipp_record._rev = existing_record._rev;

						db.put(ipp_record).then(function(saved_record) {
							ipp_record._id = saved_record.id;
							ipp_record._rev = saved_record.rev;

							console.log("REGISTER ASSET IPP RECORD UPDATED ENTIRELY");

							defer.resolve(ipp_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						// REMOVE ANY UNWANTED PROPERTIES
						if( doc.hasOwnProperty('refreshing') ) {
							delete doc.refreshing;
						}  

						existing_record = doc;

						// SET UN-EDITABLE CLOUD VALUES
						existing_record.ever_inspected = ipp_record.ever_inspected;
						// existing_record.excluded_from_inspection = ipp_record.excluded_from_inspection;
						existing_record.has_scheduled = ipp_record.has_scheduled;
						existing_record.inspection_required = ipp_record.inspection_required;
						existing_record.last_inspected_date = ipp_record.last_inspected_date;
						// existing_record.next_inspection_due_date = ipp_record.next_inspection_due_date;
						existing_record.next_scheduled_date = ipp_record.next_scheduled_date;
						existing_record.paused_until = ipp_record.paused_until;

						// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
						if( ipp_record.date_modified > existing_record.date_modified ) {
							existing_record.rm_record_modified = 'Yes';
						};

						// CLEAR OLD RM RECORD
						existing_record.rm_record = null;

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(ipp_record);
						existing_record.rm_record = rm_record;

						db.post(existing_record, options).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							console.log("REGISTER ASSET IPP RM RECORD UPDATED");

							defer.resolve(existing_record);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingRmRegisterAssetIppScores: function(asset_keys) {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.register_asset_ipp.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.register_asset_ipp;

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) 
					{
						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								factory.utils.register_asset_ipp.filterExistingRmRegisterAssetIppScores(result.rows, asset_keys);

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
				}
			},
			qr_register: {
				doSaveQrRecord: function(qr_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					qr_record = factory.utils.formatRmRecordToModel('qr_record', qr_record);

					// SET VALUES FOR SYNC
					qr_record = factory.utils.setSyncValues(qr_record);

					var qr_id = qr_record.rm_id;
					qr_record.qr_id = qr_id;

					factory.dbFetch.qr_register.rmQrRecord(qr_record.rm_id).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.qr_register.saveNewQrRecord(qr_record).then(function(saved_qr) {
								defer.resolve(saved_qr);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.qr_register.updateQrRecord(qr_record, existing_record).then(function(saved_qr) {
								
								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.qr_register.existing_data ) {

									if( angular.isDefined(factory.utils.qr_register.existing_data[saved_qr.rm_id]) && factory.utils.qr_register.existing_data[saved_qr.rm_id] ) {
											
										factory.utils.qr_register.existing_data[saved_qr.rm_id]._id = saved_qr._id;
										factory.utils.qr_register.existing_data[saved_qr.rm_id]._rev = saved_qr._rev;
									}
								}

								defer.resolve(saved_qr);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				saveNewQrRecord: function(qr_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					// SET RM OBJECT
					var rm_record = angular.copy(qr_record);
					qr_record.rm_record = rm_record;

					riskmachDatabasesFactory.databases.collection.qr_register.post(qr_record, options).then(function(saved_record) {
						qr_record._id = saved_record.id;
						qr_record._rev = saved_record.rev;

						console.log("SAVED QR RECORD");

						defer.resolve(qr_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				updateQrRecord: function(qr_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.qr_register;

					var options = {
						force: true
					};

					// IF THE APP RECORD HAS NOT BEEN MODIFIED
					if( existing_record.record_modified == 'No' ) {

						// IF COULDN'T FIND CORRESPONDING RECORD, DON'T UPDATE QR
						if( !qr_record.record_id ) {
							defer.resolve(existing_record);
							return defer.promise;
						}

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(qr_record);
						qr_record.rm_record = rm_record;

						// SET ID/REV ON RM RECORD
						qr_record._id = existing_record._id;
						qr_record._rev = existing_record._rev;

						db.post(qr_record, options).then(function(saved_record) {
							qr_record._id = saved_record.id;
							qr_record._rev = saved_record.rev;

							console.log("QR RECORD UPDATED ENTIRELY");

							defer.resolve(qr_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = doc;

						// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
						if( qr_record.date_modified > existing_record.date_modified ) {
							existing_record.rm_record_modified = 'Yes';
						};

						// CLEAR OLD RM RECORD
						existing_record.rm_record = null;

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(qr_record);
						existing_record.rm_record = rm_record;

						db.post(existing_record, options).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							console.log("QR RM RECORD UPDATED");

							defer.resolve(existing_record);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingRmQrCodes: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.qr_register.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.qr_register;

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) 
					{
						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								factory.utils.qr_register.filterExistingRmQrCodes(result.rows);

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
				}
			},
			record_assets: {
				saveRecordAsset: function(record_asset) {
					var defer = $q.defer();

					factory.dbFetch.record_assets.rmRecordAsset(record_asset.rm_id).then(function(existing_record) {

						if( existing_record == null ) {

							// ADD MODEL KEYS AND FORMAT
							record_asset = factory.utils.formatRmRecordToModel('register_asset', record_asset);

							// SET VALUES FOR SYNC
							record_asset = factory.utils.setSyncValues(record_asset);

							factory.dbUtils.record_assets.saveNewRecordAsset(record_asset).then(function(saved_asset) {
								defer.resolve(saved_asset);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.record_assets.updateRecordAsset(record_asset, existing_record).then(function(saved_asset) {
								
								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.record_assets.existing_data ) {

									if( angular.isDefined(factory.utils.record_assets.existing_data[saved_asset.rm_id]) && factory.utils.record_assets.existing_data[saved_asset.rm_id] ) {
											
										factory.utils.record_assets.existing_data[saved_asset.rm_id]._id = saved_asset._id;
										factory.utils.record_assets.existing_data[saved_asset.rm_id]._rev = saved_asset._rev;
									}
								}

								defer.resolve(saved_asset);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveNewRecordAsset: function(record_asset) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					// SET RM OBJECT
					var rm_record = angular.copy(record_asset);
					record_asset.rm_record = rm_record;

					riskmachDatabasesFactory.databases.collection.register_assets.post(record_asset, options).then(function(saved_record) {
						record_asset._id = saved_record.id;
						record_asset._rev = saved_record.rev;

						console.log("SAVED RECORD ASSET");

						defer.resolve(record_asset);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				updateRecordAsset: function(record_asset, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.register_assets;

					var options = {
						force: true
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = doc;

						// IF THE APP RECORD HAS NOT BEEN MODIFIED
						if( existing_record.record_modified == 'No' ) {
							// UPDATE BASIC INFO
							existing_record.rm_id = record_asset.rm_id;
							existing_record.rm_record_id = record_asset.rm_record_id;
							existing_record.record_id = record_asset.record_id;
							existing_record.asset_ref = record_asset.asset_ref;
							existing_record.description = record_asset.description;
							existing_record.record_type = record_asset.record_type;

							db.post(existing_record, options).then(function(saved_record) {
								existing_record._id = saved_record.id;
								existing_record._rev = saved_record.rev;

								console.log("RECORD ASSET UPDATED");

								defer.resolve(existing_record);
							}).catch(function(error) {
								defer.reject(error);
							});

							return defer.promise;
						};

						// UPDATE BASIC INFO ON RM RECORD
						if( existing_record.hasOwnProperty('rm_record') && existing_record.rm_record != null ) {
							existing_record.rm_record.asset_ref = record_asset.asset_ref;
							existing_record.rm_record.description = record_asset.description;
						};

						db.post(existing_record, options).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							console.log("RECORD ASSET UPDATED");

							defer.resolve(existing_record);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingRmRecordAssets: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.record_assets.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.register_assets;

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) 
					{
						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								factory.utils.record_assets.filterExistingRmRecordAssets(result.rows);

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
							console.log("ERROR FETCHING EXISTING RECORD ASSETS");
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			mr_meta: {
				saveMrMetaRecord: function(meta_record, relations) {
					var defer = $q.defer();
					
					console.log(relations);

					if( !relations.hasOwnProperty('subject_record_id') || !relations.subject_record_id ) {
						defer.resolve(null);
						return defer.promise;
					}

					if( !relations.hasOwnProperty('subject_record_type') || !relations.subject_record_type ) {
						defer.resolve(null);
						return defer.promise;
					}

					factory.dbUtils.mr_meta.doSaveMrMetaRecord(meta_record, relations).then(function(saved_meta) {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveMrMetaRecord: function(meta_record, relations) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					// meta_record = factory.utils.formatRmRecordToModel('subject_mr_meta', meta_record);

					// CONSTRUCT META RECORD FOR SAVE
					meta_record = factory.utils.mr_meta.formatSubjectMrMetaRecord(meta_record, relations);

					factory.dbFetch.mr_meta.subjectMrMetaRecord(meta_record.subject_record_id, meta_record.rm_subject_record_id, meta_record.subject_record_type).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.mr_meta.saveNewSubjectMrMetaRecord(meta_record).then(function(saved_meta) {
								defer.resolve(saved_meta);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.mr_meta.updateSubjectMrMetaRecord(meta_record.data, existing_record._id).then(function(saved_meta) {
								
								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.mr_meta.existing_data ) {

									if( angular.isDefined(factory.utils.mr_meta.existing_data[saved_meta.rm_subject_record_id]) && factory.utils.mr_meta.existing_data[saved_meta.rm_subject_record_id] ) {
											
										factory.utils.mr_meta.existing_data[saved_meta.rm_subject_record_id]._id = saved_meta._id;
										factory.utils.mr_meta.existing_data[saved_meta.rm_subject_record_id]._rev = saved_meta._rev;
									}
								}

								defer.resolve(saved_meta);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				saveNewSubjectMrMetaRecord: function(meta_record) {
					var defer = $q.defer();

					var options = {force: true};

					riskmachDatabasesFactory.databases.collection.subject_mr_meta.post(meta_record, options).then(function(result) {

						meta_record._id = result.id;
						meta_record._rev = result.rev;

						defer.resolve(meta_record);

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				updateSubjectMrMetaRecord: function(data, doc_id) {
					var defer = $q.defer();

					riskmachDatabasesFactory.databases.collection.subject_mr_meta.get(doc_id).then(function(doc) {

						// SET EXISTING LOCAL DRAFT MR ID
						var existing_data = JSON.parse(doc.data);
						data.local_draft_mr_id = existing_data.local_draft_mr_id;

						// UNSET JSON VARIABLE
						existing_data = null;

						// doc.data = JSON.stringify(data);
						doc.data = data;
						doc.date_downloaded = new Date().getTime();

						riskmachDatabasesFactory.databases.collection.subject_mr_meta.put(doc).then(function(result) {
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
				existingRmMrMeta: function(asset_keys) {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.mr_meta.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.subject_mr_meta;

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) 
					{
						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								factory.utils.mr_meta.filterExistingRmMrMeta(result.rows, asset_keys);

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
				}
			},
			updateRecordsNumFiles: function(stage, record_id_keys) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var max_index = Object.keys(record_id_keys).length - 1;

				// IF NO RECORDS 	
				if( max_index == -1 ) {
					defer.resolve();
					return defer.promise;
				}

				var next_index = 0;

				updateRecordsNumFiles(save_defer).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function updateRecordsNumFiles(defer) {

					var next_record = null;

					//FIND THE NEXT STAGING RECORD BASED ON INDEX
					var index_counter = -1;
					Object.keys(record_id_keys).forEach(function(current_key){
						index_counter++;

						if( index_counter == next_index ) {
							next_record = record_id_keys[current_key];
						}

					});

					if( !next_record ) {
						defer.reject("Unable to find the next record to update file count");
						return defer.promise;
					}

					// DO MARK UPDATE RECORDS FILE COUNT
					factory.dbUtils.doUpdateRecordsNumFiles(stage, next_record).then(function() {

						next_index++;

						// UPDATED ALL RECORDS NUM FILES
						if( next_index > max_index ) {
							defer.resolve();
							return defer.promise;
						}

						// MARK NEXT STAGED RECORD CONTENTS SYNCED
						updateRecordsNumFiles(defer);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			doUpdateRecordsNumFiles: function(stage, record) {
				var defer = $q.defer();

				// IF DB ID IS NOT SET
				if( !record.hasOwnProperty('db_id') ) {
					defer.resolve();
					return defer.promise;
				}

				// IF NUM FILES IS NOT SET
				if( !record.hasOwnProperty('num_files') ) {
					defer.resolve();
					return defer.promise;
				}

				var db = null;

				if( stage == 'register_assets' ) {
					db = riskmachDatabasesFactory.databases.collection.register_assets;
				}

				if( stage == 'register_tasks' ) {
					defer.resolve();
					return defer.promise;

					// db = riskmachDatabasesFactory.databases.collection.tasks;
				}

				db.get(record.db_id).then(function(doc) {

					doc.num_files = record.num_files;

					db.post(doc, {force: true}).then(function(result) {
						doc._id = result;
						doc._rev = result;

						defer.resolve(doc);
					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			updateValueOnRecords: function(stage, record_id_keys, key) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var max_index = Object.keys(record_id_keys).length - 1;

				// IF NO RECORDS 	
				if( max_index == -1 ) {
					defer.resolve();
					return defer.promise;
				}

				var next_index = 0;

				updateValueOnRecord(save_defer).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function updateValueOnRecord(defer) {

					var next_record = null;

					//FIND THE NEXT STAGING RECORD BASED ON INDEX
					var index_counter = -1;
					Object.keys(record_id_keys).forEach(function(current_key){
						index_counter++;

						if( index_counter == next_index ) {
							next_record = record_id_keys[current_key];
						}

					});

					if( !next_record ) {
						defer.reject("Unable to find the next record to update " + key + " count");
						return defer.promise;
					}

					// DO UPDATE RECORDS VALUE
					factory.dbUtils.doUpdateValueOnRecord(stage, next_record, key).then(function() {

						next_index++;

						// UPDATED ALL RECORDS VALUES
						if( next_index > max_index ) {
							defer.resolve();
							return defer.promise;
						}

						// UPDATE NEXT RECORDS VALUE
						updateValueOnRecord(defer);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			doUpdateValueOnRecord: function(stage, record, key) {
				var defer = $q.defer();

				// IF DB ID IS NOT SET
				if( !record.hasOwnProperty('db_id') ) {
					defer.resolve();
					return defer.promise;
				}

				// IF KEY IS NOT SET
				if( !record.hasOwnProperty(key) ) {
					defer.resolve();
					return defer.promise;
				}

				// NOT SETUP YET, REMOVE WHEN SO
				if( stage == 'register_tasks' ) {
					defer.resolve();
					return defer.promise;
				}

				var db = factory.utils.stageDatabase(stage);
				if( db == null ) {
					defer.reject("The developer has not setup the database for this stage: " + stage);
					return defer.promise;
				}

				db.get(record.db_id).then(function(doc) {

					doc[key] = record[key];

					db.post(doc, {force: true}).then(function(result) {
						doc._id = result;
						doc._rev = result;

						defer.resolve(doc);
					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getLocalCoreIds: function(stages) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var max_index = Object.keys(stages).length - 1;

				// IF NO RECORDS 	
				if( max_index == -1 ) {
					defer.resolve();
					return defer.promise;
				}

				var next_index = 0;

				getNextLocalCoreId(save_defer).then(function(core_id_keys) {
					defer.resolve(core_id_keys);
				}, function(error) {
					defer.reject(error);
				});

				function getNextLocalCoreId(defer) {

					var current_record_type = null;
					var next_record = null;

					//FIND THE NEXT STAGE BASED ON INDEX
					var index_counter = -1;
					Object.keys(stages).forEach(function(current_key){
						index_counter++;

						console.log("KEY");
						console.log(current_key);

						if( index_counter == next_index ) {
							current_record_type = current_key;
							next_record = stages[current_key];
						}

					});

					if( !next_record ) {
						defer.reject("Unable to find the next record to get local Core ID");
						return defer.promise;
					}

					if( !next_record.rm_id || next_record.rm_id == 0 || next_record.rm_id == "0" ) {
						stages[current_record_type].local_id = null;

						next_index++;

						// GOT ALL CORE IDS
						if( next_index > max_index ) {
							defer.resolve(stages);
							return defer.promise;
						}

						// GET NEXT LOCAL CORE ID
						getNextLocalCoreId(defer);

						return defer.promise;
					}

					// GET NEXT LOCAL CORE ID
					factory.dbUtils.getLocalCoreRecordId(current_record_type, next_record).then(function(data_result) {

						stages[current_record_type].local_id = data_result.local_id;

						console.log("GOT RECORD ID");
						console.log(stages);

						next_index++;

						// GOT ALL CORE IDS
						if( next_index > max_index ) {
							console.log("GOT ALL CORE IDS");
							defer.resolve(stages);
							return defer.promise;
						}

						// GET NEXT LOCAL CORE ID
						getNextLocalCoreId(defer);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			getLocalCoreRecordId: function(db_name, data) {
				var defer = $q.defer();

				console.log("GET LOCAL CORE RECORD ID");
				console.log(db_name);
				console.log(data);

				if( !riskmachDatabasesFactory.databases.collection.hasOwnProperty(db_name) ) {
					defer.reject("Database " + db_name + " not setup by developer");
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection[db_name];

				var selector = {
					company_id: authFactory.getActiveCompanyId(),
					user_id: authFactory.cloudUserId(), 
					rm_id: parseInt(data.rm_id)
				};

				db.find({
					selector: selector,
					limit: 1
				}).then(function(result) {
					console.log(result);
					if( result.docs.length == 0 ) {
						data.local_id = null;
					} else {
						data.local_id = result.docs[0]._id;
					}

					defer.resolve(data);
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			updateAssetProfileImgs: function(stage, record_id_keys) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var max_index = Object.keys(record_id_keys).length - 1;

				// IF NO RECORDS 	
				if( max_index == -1 ) {
					defer.resolve();
					return defer.promise;
				}

				var next_index = 0;

				updateAssetProfileImgData(save_defer).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function updateAssetProfileImgData(defer) {

					var next_record = null;

					//FIND THE NEXT STAGING RECORD BASED ON INDEX
					var index_counter = -1;
					Object.keys(record_id_keys).forEach(function(current_key){
						index_counter++;

						if( index_counter == next_index ) {
							next_record = record_id_keys[current_key];
						}

					});

					if( !next_record ) {
						defer.reject("Unable to find the next asset record for profile image update");
						return defer.promise;
					}

					// DO UPDATE ASSET PROFILE IMAGE
					factory.dbUtils.updateAssetProfileImgData(stage, next_record).then(function() {

						next_index++;

						// UPDATE ALL ASSET PROFILE IMGS
						if( next_index > max_index ) {
							defer.resolve();
							return defer.promise;
						}

						// UDPATE NEXT ASSET PROFILE IMG
						updateAssetProfileImgData(defer);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			updateAssetProfileImgData: function(stage, record) {
				var defer = $q.defer();

				console.log("UPDATE ASSET PROFILE IMG DATA");
				console.log(record);

				if( !record.hasOwnProperty('local_profile_img_id') || !record.local_profile_img_id ) {
					defer.resolve();
					return defer.promise;
				}

				var assets_db = riskmachDatabasesFactory.databases.collection.register_assets;
				var media_db = riskmachDatabasesFactory.databases.collection.media;

				// GET ASSET RECORD
				assets_db.get(record.db_id).then(function(asset_doc) {

					// GET PROFILE IMG MEDIA RECORD
					media_db.get(record.local_profile_img_id).then(function(media_doc) {

						asset_doc.profile_image_media_id = media_doc._id;

						// SAVE UPDATED ASSET
						assets_db.put(asset_doc).then(function(result) {

							asset_doc._id = result.id;
							asset_doc._rev = result.rev;

							defer.resolve();

						}).catch(function(error) {
							console.log("ERROR SAVING ASSET RECORD: UPDATE ASSET PROFILE IMG");
							defer.reject(error);
						});

					}).catch(function(error) {
						console.log("ERROR FETCHING MEDIA RECORD: UPDATE ASSET PROFILE IMG");
						defer.reject(error);
					});

				}).catch(function(error) {
					console.log("ERROR FETCHING ASSET RECORD: UPDATE ASSET PROFILE IMG");
					defer.reject(error);
				});

				return defer.promise;
			},
		}

		factory.requestSaveRegisterAssetIppRecord = function(rm_pp_asset_relation_id, asset_id) 
		{
			var defer = $q.defer();

			// MAKE SURE THIS IS EMPTY
			factory.utils.register_asset_ipp.existing_data = null;

			factory.requests.ippRecord(rm_pp_asset_relation_id).then(function(ipp_record) {

				if( !ipp_record ) {
					defer.reject("Couldn't find requirement for refresh");
					return defer.promise;
				}

				// SET LOCAL ASSET ID
				ipp_record.asset_id = asset_id;

				factory.dbUtils.register_asset_ipp.doSaveRegisterAssetIppRecord(ipp_record).then(function(saved_ipp) {

					defer.resolve(saved_ipp);

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.requestUpdateCoreComplianceHealth = function(params) 
		{
			var defer = $q.defer();

			factory.requests.updateCoreComplianceHealth(params).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		return factory;
	}
	
}())