(function() {

	var app = angular.module('riskmachProjectDownload', ['riskmachUtils','riskmachDatabases','riskmachModels']);
	app.factory('projectDownloadFactory', projectDownloadFactory);

	function projectDownloadFactory($q, authFactory, riskmachDatabasesFactory, modelsFactory, rmUtilsFactory) 
	{
		var factory = {};

		factory.download_setup = {
			active: {
				project_id: null,
				asset_id: null,
				download_type: null,
				report: {
					ref: null,
					ref_guid: null,
					id: null,
					date: null,
					status: null, 
					status_name: null,
					setProjectsReportMeta: function(project_record) {

						if( !project_record ) {
							factory.download_setup.active.report.clear();
							return;
						}

						if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
							factory.download_setup.active.report.clear();
							return;
						}

						if( project_record.hasOwnProperty('report_ref') && project_record.report_ref ) {
							factory.download_setup.active.report.ref = parseInt( project_record.report_ref );
						}

						if( project_record.hasOwnProperty('report_ref_guid') && project_record.report_ref_guid ) {
							factory.download_setup.active.report.ref_guid = project_record.report_ref_guid;
						}

						if( project_record.hasOwnProperty('report_id') && project_record.report_id ) {
							factory.download_setup.active.report.id = parseInt( project_record.report_id );
						}

						if( project_record.hasOwnProperty('report_date') && project_record.report_date ) {
							factory.download_setup.active.report.date = project_record.report_date;
						}

						if( project_record.hasOwnProperty('report_status') && project_record.report_status ) {
							factory.download_setup.active.report.status = parseInt(project_record.report_status);
						}

						if( project_record.hasOwnProperty('report_status_name') && project_record.report_status_name ) {
							factory.download_setup.active.report.status_name = project_record.report_status_name;
						}

					},
					clear: function() {
						factory.download_setup.active.report.ref = null;
						factory.download_setup.active.report.ref_guid = null;
						factory.download_setup.active.report.id = null;
						factory.download_setup.active.report.date = null;
						factory.download_setup.active.report.status = null;
						factory.download_setup.active.report.status_name = null;
					}
				},
				qc: {
					review_id: null,
					setQcReviewId: function(review_id) {
						// IF NOT ALREADY SET
						if( !factory.download_setup.active.qc.review_id ) {
							factory.download_setup.active.qc.review_id = review_id;
						}
					}
				}
			},
			dest: {
				active_dest: false,
				project_id: null, 
				asset_id: null
			},
			modified_project_name: null,
			resetActiveDownload: function() {
				factory.download_setup.active.download_type = null;

				factory.download_setup.active.report.clear();

				factory.download_setup.active.qc.review_id = null;
				
				factory.download_setup.dest.active_dest = false;
				factory.download_setup.dest.project_id = null;
				factory.download_setup.dest.asset_id = null;

				factory.download_setup.modified_project_name = null;
			},
			stages: [{
				stage_name: 'projects',
				params: {
					filters: {
						activity_id: null,
						paginate: 'yes',
						page_num: 1,
						per_page: 1000
					}
				}
			},{
				stage_name: 'snapshot_assets',
				params: {
					filters: {
						activity_id: null,
						asset_id: null,
						paginate: 'yes',
						page_num: 1,
						per_page: 1000
					}
				}
			},{
				stage_name: 'tasks',
				params: {
					filters: {
						activity_id: null,
						asset_id: null,
						paginate: 'yes',
						page_num: 1,
						per_page: 1000
					}
				}
			},{
				stage_name: 'mr_hazards',
				params: {
					filters: {
						activity_id: null,
						asset_id: null,
						paginate: 'yes',
						page_num: 1,
						per_page: 1000
					}
				}
			},{
				stage_name: 'mr_controls',
				params: {
					filters: {
						activity_id: null,
						asset_id: null,
						paginate: 'yes',
						page_num: 1,
						per_page: 1000
					}
				}
			},{
				stage_name: 'hazard_control_relations',
				params: {
					filters: {
						activity_id: null,
						asset_id: null,
						paginate: 'yes',
						page_num: 1,
						per_page: 1000
					}
				}
			},{
				stage_name: 'snapshot_asset_media',
				params: {
					filters: {
						activity_id: null,
						asset_id: null,
						record_type: 'asset',
						paginate: 'yes',
						page_num: 1,
						per_page: 700
					}
				}
			},{
				stage_name: 'task_media',
				params: {
					filters: {
						activity_id: null,
						asset_id: null,
						record_type: 'task',
						paginate: 'yes',
						page_num: 1,
						per_page: 700
					}
				}
			},{
				stage_name: 'mr_hazard_media',
				params: {
					filters: {
						activity_id: null,
						asset_id: null,
						record_type: 'assessment_hazard',
						paginate: 'yes',
						page_num: 1,
						per_page: 700
					}
				}
			},{
				stage_name: 'mr_control_media',
				params: {
					filters: {
						activity_id: null,
						asset_id: null,
						record_type: 'control_item',
						paginate: 'yes',
						page_num: 1,
						per_page: 700
					}
				}
			},{
				stage_name: 'checklist_instances',
				params: {
					filters: {
						activity_id: null,
						asset_id: null,
						paginate: 'yes',
						page_num: 1,
						per_page: 1000
					}
				}
			},
			{
				stage_name: 'uaudit_content',
				params: {
					checklist_record_id: null
				}
			},
			{
				stage_name: 'checklist_question_records',
				params: {
					filters: {
						activity_id: null,
						asset_id: null,
						paginate: 'yes',
						page_num: 1,
						per_page: 1000
					}
				}
			},{
				stage_name: 'assessments',
				params: {
					filters: {
						activity_id: null,
						asset_id: null,
						authors_company_id: authFactory.cloudCompanyId(),
						paginate: 'yes',
						page_num: 1,
						per_page: 1000
					}
				}
			},{
				stage_name: 'ra_question_relations',
				params: {
					filters: {
						activity_id: null,
						asset_id: null,
						paginate: 'yes',
						page_num: 1,
						per_page: 1000
					}
				}
			},{
				stage_name: 'control_items',
				params: {
					filters: {
						activity_id: null,
						asset_id: null,
						paginate: 'yes',
						page_num: 1,
						per_page: 1000
					}
				}
			},{
				stage_name: 'ra_control_item_relations',
				params: {
					filters: {
						activity_id: null,
						asset_id: null,
						paginate: 'yes',
						page_num: 1,
						per_page: 1000
					}
				}
			},{
				stage_name: 'assessment_media',
				params: {
					filters: {
						activity_id: null,
						asset_id: null,
						authors_company_id: authFactory.cloudCompanyId(),
						record_type: 'assessment',
						paginate: 'yes',
						page_num: 1,
						per_page: 700
					}
				}
			},{
				stage_name: 'qc_check_records',
				params: {
					report_id: null
				}
			},{
				stage_name: 'project_contributors',
				params: {
					filters: {
						record_type: 'project', 
						record_id: null, 
						user_id: null, 
						record_ref: null, 
						paginate: 'no',
						page_num: null, 
						per_page: null
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

					if( params.hasOwnProperty('activity_id') && params.activity_id != null ) {

						if( stages[index].params.hasOwnProperty('filters') && stages[index].params.filters.hasOwnProperty('activity_id') ) {
							stages[index].params.filters.activity_id = params.activity_id;
						};

						// SET RASIC RMRECORDID
						if( stages[index].stage_name == 'project_contributors' ) {
							stages[index].params.filters.record_id = params.activity_id;
						}

					};

					if( params.hasOwnProperty('asset_id') && params.asset_id != null ) {

						if( stages[index].params.hasOwnProperty('filters') && stages[index].params.filters.hasOwnProperty('asset_id') ) {
							stages[index].params.filters.asset_id = params.asset_id;
						};

					};

					if( params.hasOwnProperty('report_id') && params.report_id != null ) {

						if( stages[index].params.hasOwnProperty('report_id') ) {
							stages[index].params.report_id = params.report_id;
						}

					}

				});

				return stages;
			}
		}

		factory.utils = {
			isString: function(value) {
				if (typeof value === 'string' || value instanceof String) {
					return true;
				} else {
					return false;
				}
			},
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
									value = parseInt( rm_record[key] );
								}

								if( modelsFactory.data_types[model_type][key] == 'decimal' ) {
									value = parseFloat( rm_record[key] );
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

				if( stage == 'snapshot_assets' ) {
					db = riskmachDatabasesFactory.databases.collection.assets;
				}

				if( stage == 'tasks' ) {
					db = riskmachDatabasesFactory.databases.collection.tasks;
				}

				if( stage == 'mr_hazards' ) {
					db = riskmachDatabasesFactory.databases.collection.mr_hazards;
				}

				if( stage == 'mr_controls' || stage == 'control_items' ) {
					db = riskmachDatabasesFactory.databases.collection.mr_controls;
				}

				if( stage == 'assessments' ) {
					db = riskmachDatabasesFactory.databases.collection.assessments;
				}

				return db;
			},	
			projects: {
				formatProjectRecord: function(project_record) {
					var formatted = null;
					formatted = angular.copy(project_record);

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();

					if( project_record.status == null || project_record.status == '' || project_record.status == 0 || project_record.status == '0' ) {
						formatted.status = 1;
					};

					return formatted;
				}
			},
			snapshot_assets: {
				existing_data: null,
				new_data: null,
				formatSnapshotAssetRecord: function(asset_record) {
					var formatted = null;
					formatted = angular.copy(asset_record);

					formatted.is_register = 'No';

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();

					if( factory.download_setup.active.report.ref ) {
						formatted.report_ref = factory.download_setup.active.report.ref;
					}

					if( factory.download_setup.active.report.ref_guid ) {
						formatted.report_ref_guid = factory.download_setup.active.report.ref_guid;
					}

					if( factory.download_setup.active.report.id ) {
						formatted.report_id = factory.download_setup.active.report.id;
					}

					if( factory.download_setup.active.report.date ) {
						formatted.report_date = factory.download_setup.active.report.date;
					}

					if( factory.download_setup.active.report.status ) {
						formatted.report_status = factory.download_setup.active.report.status;
					}

					if( factory.download_setup.active.report.status_name ) {
						formatted.report_status_name = factory.download_setup.active.report.status_name;
					} 

					if( asset_record.status == null || asset_record.status == '' || asset_record.status == 0 || asset_record.status == '0' ) {
						formatted.status = 1;
					}

					if( !asset_record.hasOwnProperty('external_ref_1') || asset_record.external_ref_1 == null ) {
						
						if( asset_record.hasOwnProperty('external_system_ref') ) {
							formatted.external_ref_1 = asset_record.external_system_ref;
						}
						
					}

					if( !asset_record.hasOwnProperty('external_ref_2') || asset_record.external_ref_2 == null ) {
						
						if( asset_record.hasOwnProperty('external_system_ref_2') ) {
							formatted.external_ref_2 = asset_record.external_system_ref_2;
						}

					}

					if( !asset_record.hasOwnProperty('external_ref_3') || asset_record.external_ref_3 == null ) {
						
						if( asset_record.hasOwnProperty('external_system_ref_3') ) {
							formatted.external_ref_3 = asset_record.external_system_ref_3;
						}

					}

					if( !asset_record.hasOwnProperty('external_ref_4') || asset_record.external_ref_4 == null ) {
						
						if( asset_record.hasOwnProperty('external_system_ref_4') ) {
							formatted.external_ref_4 = asset_record.external_system_ref_4;
						}

					}

					if( !asset_record.hasOwnProperty('external_ref_5') || asset_record.external_ref_5 == null ) {
						
						if( asset_record.hasOwnProperty('external_system_ref_5') ) {
							formatted.external_ref_5 = asset_record.external_system_ref_5;
						}

					}

					if( asset_record.hasOwnProperty('re_inspection_data_downloaded') && (asset_record.re_inspection_data_downloaded == 'No' || asset_record.re_inspection_data_downloaded == '') ) {
						formatted.re_inspection_data_downloaded = null;
					}

					if( asset_record.hasOwnProperty('project_pp_id') && asset_record.project_pp_id ) {
						formatted.pp_id = parseInt(asset_record.project_pp_id);
					}

					if( asset_record.hasOwnProperty('project_pp_name') && asset_record.project_pp_name ) {
						formatted.pp_name = asset_record.project_pp_name;
					}

					if( asset_record.hasOwnProperty('project_type_id') && asset_record.project_type_id ) {
						formatted.activity_type = parseInt(asset_record.project_type_id);
					}

					if( asset_record.hasOwnProperty('project_type_name') && asset_record.project_type_name ) {
						formatted.activity_type_name = asset_record.project_type_name;
					}

					if( asset_record.hasOwnProperty('geo_data') && asset_record.geo_data ) {
						formatted.geo_data = JSON.parse(asset_record.geo_data);
					}

					return formatted;
				},
				filterExistingRmSnapshotAssets: function(record_rows) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('project_id') || (factory.download_setup.active.project_id && record_rows[i].doc.project_id != factory.download_setup.active.project_id) ) {
							errors++;
						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev, 
								rm_parent_asset_id: record_rows[i].doc.rm_parent_asset_id,
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified,
								not_whole_doc: true
							};

							factory.utils.snapshot_assets.existing_data[record_rows[i].doc.rm_id] = record;
						}

						i++;
					}

				}
			},
			tasks: {
				existing_data: null,
				cloud_task_revisions: null,
				formatTaskRecord: function(task_record) {
					var formatted = null;
					formatted = angular.copy(task_record);

					formatted.is_register = 'No';

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();

					if( task_record.status == null || task_record.status == '' || task_record.status == 0 || task_record.status == '0' ) {
						formatted.status = 2; // PUBLISHED
					}

					if( task_record.bank_id != null && task_record.bank_id != '' && task_record.bank_id != 0 && task_record.bank_id != '0' ) {
						formatted.bank_type_id = parseInt(task_record.bank_id);
					}

					return formatted;
				},
				filterExistingRmTasks: function(record_rows) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('activity_id') || (factory.download_setup.active.project_id && record_rows[i].doc.activity_id != factory.download_setup.active.project_id) ) {
							errors++;
						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev,
								rm_id: record_rows[i].doc.rm_id,
								rm_ref: record_rows[i].doc.rm_ref,
								video_media_id: record_rows[i].doc.video_media_id, 
								audio_media_id: record_rows[i].doc.audio_media_id,
								signature_id: record_rows[i].doc.signature_id,
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified,
								status: record_rows[i].doc.status,
								revision_number: record_rows[i].doc.revision_number
							};

							factory.utils.tasks.existing_data[record_rows[i].doc.rm_id] = record;
						}

						i++;
					}

				},
				findRevisedExistingRmTasks: function(cloud_tasks) {

					var task_ids_to_revise = [];

					// IF NO CLOUD TASKS
					if( !factory.utils.tasks.cloud_task_revisions ) {
						return task_ids_to_revise;
					}

					var keys = Object.keys(factory.utils.tasks.existing_data);
					console.log("EXISTING DATA NUM: " + keys.length);

					var ki = 0;
					var klen = keys.length;

					while(ki < klen) {

						var local_id = factory.utils.tasks.existing_data[ keys[ki] ]._id;
						var rm_id = factory.utils.tasks.existing_data[ keys[ki] ].rm_id;
						var rm_ref = factory.utils.tasks.existing_data[ keys[ki] ].rm_ref;
						var status = factory.utils.tasks.existing_data[ keys[ki] ].status;
						var revision_number = factory.utils.tasks.existing_data[ keys[ki] ].revision_number;

						if( rm_ref && revision_number != null && factory.utils.tasks.cloud_task_revisions.hasOwnProperty(rm_ref) ) {
							// IF THERE IS A NEWER REVISION
							if( factory.utils.tasks.cloud_task_revisions[rm_ref] > parseInt(revision_number) ) {
								// PUSH TO ARRAY
								task_ids_to_revise.push(local_id);
							}

						}

						ki++;
					}

					keys = null;

					return task_ids_to_revise;
				}
			},
			mr_hazards: {
				existing_data: null,
				formatHazardRecord: function(hazard_record) {
					var formatted = null;
					formatted = angular.copy(hazard_record);

					formatted.is_register = 'No';

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();

					// if( hazard_record.status == null || hazard_record.status == '' || hazard_record.status == 0 || hazard_record.status == '0' ) {
					// 	formatted.status = 2; // PUBLISHED
					// };

					return formatted;
				},
				filterExistingRmHazards: function(record_rows) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('activity_id') || (factory.download_setup.active.project_id && record_rows[i].doc.activity_id != factory.download_setup.active.project_id) ) {
							errors++;
						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev, 
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified
							};

							factory.utils.mr_hazards.existing_data[record_rows[i].doc.rm_ref] = record;
						}

						i++;
					}

				}
			},
			mr_controls: {
				existing_data: null,
				formatControlRecord: function(control_record) {
					var formatted = null;
					formatted = angular.copy(control_record);

					formatted.is_register = 'No';

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();

					// if( control_record.status == null || control_record.status == '' || control_record.status == 0 || control_record.status == '0' ) {
					// 	formatted.status = 2; // PUBLISHED
					// };

					return formatted;
				},
				filterExistingRmControls: function(record_rows) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('activity_id') || (factory.download_setup.active.project_id && record_rows[i].doc.activity_id != factory.download_setup.active.project_id) ) {
							errors++;
						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev, 
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified
							};

							factory.utils.mr_controls.existing_data[record_rows[i].doc.rm_ref] = record;
						}

						i++;
					}

				}
			},
			hazard_control_relations: {
				existing_data: null, 
				formatHazardControlRelation: function(relation_record) {
					var formatted = null;
					formatted = angular.copy(relation_record);

					formatted.is_register = 'No';

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();

					// if( relation_record.status == null || relation_record.status == '' || relation_record.status == 0 || relation_record.status == '0' ) {
					// 	formatted.status = 2; // PUBLISHED
					// };

					return formatted;
				},
				filterExistingRmHazardControlRelations: function(record_rows) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('activity_id') || (factory.download_setup.active.project_id && record_rows[i].doc.activity_id != factory.download_setup.active.project_id) ) {
							errors++;
						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev, 
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified
							};

							var key = "" + record_rows[i].doc.rm_hazard_ref + "_" + record_rows[i].doc.rm_control_ref + "";

							factory.utils.hazard_control_relations.existing_data[key] = record;
						}

						i++;
					}

				}
			},
			checklist_instances: {
				existing_data: null,
				formatChecklistInstanceRecord: function(checklist_record) {
					var formatted = null;
					formatted = angular.copy(checklist_record);

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();

					// if( hazard_record.status == null || hazard_record.status == '' || hazard_record.status == 0 || hazard_record.status == '0' ) {
					// 	formatted.status = 2; // PUBLISHED
					// };

					// NULL UAUDIT JSON PROPERTY ON INSTANCE RECORD
					// INSTANCE JSON TABLE TO STORE THIS
					if( checklist_record.hasOwnProperty('uaudit_instance_data') ) {
						checklist_record.uaudit_instance_data = null;
					}  

					return formatted;
				},
				filterExistingRmChecklistRecords: function(record_rows) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('activity_id') || (factory.download_setup.active.project_id && record_rows[i].doc.activity_id != factory.download_setup.active.project_id) ) {
							errors++;
						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev, 
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified
							};

							factory.utils.checklist_instances.existing_data[record_rows[i].doc.rm_id] = record;
						}

						i++;
					}

				}
			},
			checklist_question_records: {
				existing_data: null,
				formatChecklistQuestionRecord: function(question_record) {
					var formatted = null;
					formatted = angular.copy(question_record);

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();
  
					if( question_record.marked_complete == 1 || question_record.marked_complete == '1' || question_record.marked_complete == 'true' ) {
						formatted.marked_complete = true;
					} else {
						formatted.marked_complete = false;
					}

					// if( hazard_record.status == null || hazard_record.status == '' || hazard_record.status == 0 || hazard_record.status == '0' ) {
					// 	formatted.status = 2; // PUBLISHED
					// };

					return formatted;
				},
				filterExistingRmChecklistQuestions: function(record_rows, checklist_keys) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('rm_checklist_record_id') || !checklist_keys.hasOwnProperty( parseInt(record_rows[i].doc.rm_checklist_record_id) ) ) {
							errors++;
						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev, 
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified
							};

							factory.utils.checklist_question_records.existing_data[record_rows[i].doc.rm_id] = record;
						}

						i++;
					}

				}
			},
			assessments: {
				existing_data: null,
				formatRiskAssessmentRecord: function(assessment_record) {
					var formatted = null;
					formatted = angular.copy(assessment_record);

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();

					if( assessment_record.status == null || assessment_record.status == '' || assessment_record.status == 0 || assessment_record.status == '0' ) {
						formatted.status = 8; // DELETED
					}

					if( assessment_record.assessment_type == null || assessment_record.assessment_type == '' || assessment_record.assessment_type == 0 || assessment_record.assessment_type == '0' ) {
						formatted.assessment_type = 0;
					}

					if( assessment_record.hazard_type == null || assessment_record.hazard_type == '' || assessment_record.hazard_type == 0 || assessment_record.hazard_type == '0' ) {
						formatted.hazard_type = null;
					}

					if( assessment_record.hazard_origin == null || assessment_record.hazard_origin == '' || assessment_record.hazard_origin == 0 || assessment_record.hazard_origin == '0' ) {
						formatted.hazard_origin = null;
					}

					if( assessment_record.hazard_consequence == null || assessment_record.hazard_consequence == '' || assessment_record.hazard_consequence == 0 || assessment_record.hazard_consequence == '0' ) {
						formatted.hazard_consequence = null;
					}

					// SET lo_name_initial
					if( assessment_record.lo_initial_name && assessment_record.lo_initial_name != '' ) {
						formatted.lo_name_initial = assessment_record.lo_initial_name;
					} else {
						formatted.lo_name_initial = null;
					}

					if( assessment_record.lo_initial == null || assessment_record.lo_initial == '' ) {
						formatted.lo_initial = null;
					}

					if( (assessment_record.lo_initial == 0 || assessment_record.lo_initial == '0' || assessment_record.lo_initial == '0.0') && assessment_record.lo_initial_name && assessment_record.lo_initial_name != '' ) {
						formatted.lo_initial = 0;
					}

					if( assessment_record.fe_initial == null || assessment_record.fe_initial == '' || assessment_record.fe_initial == 0 || assessment_record.fe_initial == '0' ) {
						formatted.fe_initial = null;
					}

					if( assessment_record.np_initial == null || assessment_record.np_initial == '' || assessment_record.np_initial == 0 || assessment_record.np_initial == '0' ) {
						formatted.np_initial = null;
					}

					if( assessment_record.dph_initial == null || assessment_record.dph_initial == '' || assessment_record.dph_initial == 0 || assessment_record.dph_initial == '0' ) {
						formatted.dph_initial = null;
					}

					if( assessment_record.hrn_initial == null || assessment_record.hrn_initial == '' ) {
						formatted.hrn_initial = null;
					}

					if( assessment_record.hrn_initial == 0 || assessment_record.hrn_initial == '0' || assessment_record.hrn_initial == '0.0' ) {
						formatted.hrn_initial = 0;
					}

					// SET lo_name_after
					if( assessment_record.lo_after_name && assessment_record.lo_after_name != '' ) {
						formatted.lo_name_after = assessment_record.lo_after_name;
					} else {
						formatted.lo_name_after = null;
					}

					if( assessment_record.lo_after == null || assessment_record.lo_after == '' ) {
						formatted.lo_after = null;
					}

					if( (assessment_record.lo_after == 0 || assessment_record.lo_after == '0' || assessment_record.lo_after == '0.0') && assessment_record.lo_initial_name && assessment_record.lo_initial_name != '' ) {
						formatted.lo_after = 0;
					}

					if( assessment_record.fe_after == null || assessment_record.fe_after == '' || assessment_record.fe_after == 0 || assessment_record.fe_after == '0' ) {
						formatted.fe_after = null;
					}

					if( assessment_record.np_after == null || assessment_record.np_after == '' || assessment_record.np_after == 0 || assessment_record.np_after == '0' ) {
						formatted.np_after = null;
					}

					if( assessment_record.dph_after == null || assessment_record.dph_after == '' || assessment_record.dph_after == 0 || assessment_record.dph_after == '0' ) {
						formatted.dph_after = null;
					}

					if( assessment_record.hrn_after == null || assessment_record.hrn_after == '' ) {
						formatted.hrn_after = null;
					}

					if( assessment_record.hrn_after == 0 || assessment_record.hrn_after == '0' || assessment_record.hrn_after == '0.0' ) {
						formatted.hrn_after = 0;
					}

					if( assessment_record.urr_initial != null ) {
						formatted.urr_initial = parseFloat(assessment_record.urr_initial);
					}

					if( assessment_record.urr_after != null ) {
						formatted.urr_after = parseFloat(assessment_record.urr_after);
					}

					if( assessment_record.hasOwnProperty('rm_report_id') && assessment_record.rm_report_id ) {
						formatted.rm_report_id = parseInt(assessment_record.rm_report_id);
					} else {
						formatted.rm_report_id = null;
					}

					if( assessment_record.hasOwnProperty('rm_report_ref') && assessment_record.rm_report_ref ) {
						formatted.rm_report_ref = parseInt(assessment_record.rm_report_ref);
					} else {
						formatted.rm_report_ref = null;
					}

					if( assessment_record.hasOwnProperty('rm_report_status') && assessment_record.rm_report_status ) {
						formatted.rm_report_status = parseInt(assessment_record.rm_report_status);
					} else {
						formatted.rm_report_status = null;
					}

					return formatted;
				},
				filterExistingRmRiskAssessments: function(record_rows) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('activity_id') || (factory.download_setup.active.project_id && record_rows[i].doc.activity_id != factory.download_setup.active.project_id) ) {
							errors++;
						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev,
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified
							};

							factory.utils.assessments.existing_data[record_rows[i].doc.rm_ref] = record;
						}

						i++;
					}

				}
			},
			question_assessment_relations: {
				existing_data: null,
				formatQuestionAssessmentRelationRecord: function(relation_record) {
					var formatted = null;
					formatted = angular.copy(relation_record);

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();

					formatted.question_id = relation_record.rm_question_id;

					// if( relation_record.status == null || relation_record.status == '' || relation_record.status == 0 || relation_record.status == '0' ) {
					// 	formatted.status = 2; // DELETED
					// }

					return formatted;
				},
				filterExistingRmQuestionAssessmentRelations: function(record_rows, risk_keys) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('rm_assessment_ref') || !risk_keys.hasOwnProperty( parseInt(record_rows[i].doc.rm_assessment_ref) ) ) {
							errors++;
						}

						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev, 
								record_modified: record_rows[i].doc.record_modified, 
								date_modified: record_rows[i].doc.date_modified
							};

							// CONSTRUCT UNIQUE COMBINED KEY
							var record_key = null;

							// IF NOT UAUDIT RELATION
							if( !record_rows[i].doc.hasOwnProperty('is_uaudit') || record_rows[i].doc.is_uaudit != 'Yes' ) {
								record_key = "" + record_rows[i].doc.rm_question_ref + "_" + record_rows[i].doc.assessment_id + "";
							} else {
								record_key = "" + record_rows[i].doc.question_record_uuid + "_" + record_rows[i].doc.assessment_id + "";
							}

							// var record_key = "" + record_rows[i].doc.rm_question_ref + "_" + record_rows[i].doc.assessment_id + "";
							console.log("RELATION RECORD KEY: " + record_key);

							factory.utils.question_assessment_relations.existing_data[record_key] = record;
						}

						i++;
					}

				}
			},
			assessment_control_relations: {
				formatAssessmentControlRelationRecord: function(relation_record) {
					var formatted = null;
					formatted = angular.copy(relation_record);

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();

					if( relation_record.status == null || relation_record.status == '' || relation_record.status == 0 || relation_record.status == '0' ) {
						formatted.status = 2; // DELETED
					}

					return formatted;
				}
			},
			media_records: {
				existing_data: null,
				formatMediaRecord: function(media_record) {

					var formatted = null;
					formatted = angular.copy(media_record);

					formatted.is_register = 'No';

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();

					formatted.file_download_rm_id = media_record.rm_id;

					formatted.record_not_found = null;

					if( media_record.status == null || media_record.status == '' || media_record.status == 0 || media_record.status == '0' ) {
						formatted.status = 1;
					};

					if( media_record.is_audio == 'No' || media_record.is_audio == null || media_record.is_audio == '' ) {
						formatted.is_audio = false;
					}

					if( media_record.is_audio == 'Yes' ) {
						formatted.is_audio = true;
					}

					if( media_record.is_video == 'No' || media_record.is_video == null || media_record.is_video == '' ) {
						formatted.is_video = false;
					}

					if( media_record.is_video == 'Yes' ) {
						formatted.is_video = true;
					}

					if( !media_record.is_audio && !media_record.is_video && media_record.media_type == 'video' ) {
						formatted.is_video = true;
					}

					if( media_record.hasOwnProperty('sequence_number') && media_record.sequence_number != null ) {
						formatted.sequence_number = parseInt(media_record.sequence_number);
					} else {
						formatted.sequence_number = 0;
					}

					if( media_record.hasOwnProperty('annotations') && media_record.annotations ) {
						
						// PARSE IF STRING AND NOT EMPTY STRING
						if( factory.utils.isString(media_record.annotations) && media_record.annotations != '' ) {

							try {
						        formatted.annotations = JSON.parse(media_record.annotations);
						    } catch (e) {
						        formatted.annotations = null;
						    }

						}

					}

					// FORMAT INSENSITIVE MEDIA
					if( !media_record.hasOwnProperty('insensitive_media') || !media_record.insensitive_media || media_record.insensitive_media == '' ) {
						formatted.insensitive_media = null;
					} else {
						formatted.insensitive_media = media_record.insensitive_media;
					}

					// FORMAT DATE INSENSITIVE MEDIA
					if( !media_record.hasOwnProperty('date_insensitive_media') || !media_record.date_insensitive_media || media_record.date_insensitive_media == '' || media_record.date_insensitive_media == '0000-00-00 00:00:00' ) {
						formatted.date_insensitive_media = null;
					} else {
						formatted.date_insensitive_media = media_record.date_insensitive_media;
					}

					// FORMAT INSENSITIVE MEDIA BY
					if( !media_record.hasOwnProperty('insensitive_media_by') || !media_record.insensitive_media_by || media_record.insensitive_media_by == '' || media_record.insensitive_media_by == '0' ) {
						formatted.insensitive_media_by = null;
					} else {
						formatted.insensitive_media_by = parseInt(media_record.insensitive_media_by);
					}

					// FORMAT INSENSITIVE MEDIA REASON
					if( !media_record.hasOwnProperty('insensitive_media_reason') || !media_record.insensitive_media_reason || media_record.insensitive_media_reason == '' ) {
						formatted.insensitive_media_reason = null;
					} else {
						formatted.insensitive_media_reason = media_record.insensitive_media_reason;
					}

					// if( media_record.hasOwnProperty('record_id') && (media_record.record_id == null || media_record.record_id == '') ) {
					// 	formatted.record_not_found = 'Yes';
					// }

					return formatted;
				},
				formatNewUAuditMediaRecord: function(media_record) {

					// UNSET INDEXEDDB VALUES
					media_record._id = null;
					media_record._rev = null;

					// UNSET ATTACHMENT VALUES
					media_record.attachment_key = null;
					media_record._attachments = null;
					media_record.temp_app_url = null;
					media_record.file_downloaded = null;

					// UNSET SYNC VALUES
					media_record.date_record_synced = null;
					media_record.date_content_synced = null;
					media_record.date_record_imported = null;
					media_record.date_content_imported = null;
					media_record.synced = false;
					media_record.imported = false;
					media_record.mid_record_id = null;
					media_record.sync_id = null;

				},
				filterExistingRmMediaRecords: function(record_rows, parent_record_keys, record_type) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						var rt = record_rows[i].doc.record_type;
						var key = null;

						if( rt == 'asset' ) {
							key = record_rows[i].doc.rm_record_item_id;
						}

						if( rt == 'task' || rt == 'assessment_hazard' || rt == 'control_item' || rt == 'assessment' ) {
							key = record_rows[i].doc.rm_record_item_ref;
						}
 
						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('record_type') || record_rows[i].doc.record_type != record_type ) {
							errors++;
						}
 
						if( !key || !parent_record_keys.hasOwnProperty( parseInt(key) ) ) {

							// if( record_type == 'task' ) {
							// 	console.log(key);
							// 	console.log(JSON.stringify(record_rows[i].doc, null, 2));
							// 	console.log(JSON.stringify(parent_record_keys, null, 2));
							// }

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

							factory.utils.media_records.existing_data[record_rows[i].doc.rm_ref] = record;
						}

						i++;
					}

				},
				filterExistingRmUAuditMedia: function(record_rows, checklist_keys) {

					var i = 0;
					var len = record_rows.length;

					var local_checklist_ids = [];

					// CREATE ARRAY OF LOCAL CHECKLIST IDS
					Object.keys(checklist_keys).forEach(function(current_key) {

						if( checklist_keys[current_key].hasOwnProperty('db_id') && checklist_keys[current_key].db_id ) {
							local_checklist_ids.push(checklist_keys[current_key].db_id);
						}

					});

					while(i < len) {

						var errors = 0;

						// IF NOT UAUDIT MEDIA
						if( !record_rows[i].doc.hasOwnProperty('is_uaudit') || record_rows[i].doc.is_uaudit != 'Yes' ) {
							errors++;
						}

						// IF NO CHECKLIST INSTANCE INDEXED ON MEDIA
						if( !record_rows[i].doc.hasOwnProperty('checklist_instance_id') || !record_rows[i].doc.checklist_instance_id ) {
							errors++;
						} else {

							// IF CHECKLIST INSTANCE NOT IN DOWNLOAD
							if( local_checklist_ids.indexOf( record_rows[i].doc.checklist_instance_id ) === -1 ) {
								errors++;
							}

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

							factory.utils.media_records.existing_data[record_rows[i].doc.rm_ref] = record;
						}

						i++;
					}

				},
				filterSuperseededMediaRecords: function(record_rows, parent_record_keys, record_type, superseeded_media) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						var rt = record_rows[i].doc.record_type;
						var key = null;

						if( rt == 'asset' ) {
							key = record_rows[i].doc.rm_record_item_id;
						}

						if( rt == 'task' || rt == 'assessment_hazard' || rt == 'control_item' || rt == 'assessment' ) {
							key = record_rows[i].doc.rm_record_item_ref;
						}
 
						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('record_type') || record_rows[i].doc.record_type != record_type ) {
							errors++;
						}

						// IF PARENT RECORD NOT IN DOWNLOAD
						if( !key || !parent_record_keys.hasOwnProperty( parseInt(key) ) ) {
							errors++;
						} else {

							// IF PARENT RM ID NOT SET
							if( !parent_record_keys[key].hasOwnProperty('rm_id') || !parent_record_keys[key].rm_id ) {
								errors++;
							} else {

								// IF IMAGE IS PART OF LATEST PARENT REVISION
								if( parent_record_keys[key].rm_id == record_rows[i].doc.rm_record_item_id ) {
									errors++;
								}

							}
						}

						// ONLY IMAGES THAT ARE CURRENTLY ON APP, BUT NOT PART OF THE LATEST PARENT REVISION
						if( errors == 0 ) {

							var record = {
								_id: record_rows[i].doc._id
							};

							superseeded_media.push(record);
						}

						i++;
					}

				},
				updateMediaInUAuditJson: function(uaudit_data, media_doc) {

					// UPDATE QUESTION COLLECTION
					if( media_doc.record_type == 'question_response_image' ) {

						angular.forEach(uaudit_data.pages.collection, function(page_record, page_index){

							//CREATE INIT QUESTIONS ARRAY FOR EACH SECTION
							angular.forEach( page_record.sections, function(section_record, section_index){

								//IF THE QUESTION IS INIT THEN ADD TO SECTION INIT COLLECTION
								angular.forEach( section_record.questions, function(question_record, question_index){

									//ADD EACH QUESTION RESPONSE MEDIA TO COLLECTION
									question_record.response.media.forEach(function(media_record, media_index){
										
										// FIND AND UPDATE MEDIA DOC BY UUID OR CLONED FROM UUID
										if( media_record.id == media_doc.id ) {

											media_record = media_doc;

										} else if(media_record.id == media_doc.cloned_from_id) {

											// UPDATE MEDIA DOC WITH NEW QUESTION ID
											media_doc.record_item_uuid = question_record.question_record_id;

											media_record = media_doc;

										}

									});

								});

							});

						});

					}

					// UPDATE ACTION COLLECTION
					if( media_doc.record_type == 'action' ) {

						angular.forEach(uaudit_data.actions.collection, function(action_record, action_index) {

							//ADD EACH ACTION MEDIA TO COLLECTION
							action_record.media.forEach(function(a_media_record, a_media_index){
								
								// FIND AND UPDATE MEDIA DOC BY UUID OR CLONED FROM UUID
								if( media_record.id == media_doc.id ) {

									media_record = media_doc;

								} else if(media_record.id == media_doc.cloned_from_id) {

									// UPDATE MEDIA DOC WITH NEW ACTION ID
									media_doc.record_item_uuid = action_record.id;

									media_record = media_doc;

								}

							});

						});

					}

				}
			},
			record_assets: {
				existing_data: null,
				filterExistingRmRecordAssets: function(record_rows, record_type) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {

						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('project_id') || (factory.download_setup.active.project_id && record_rows[i].doc.project_id != factory.download_setup.active.project_id) ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('record_type') || record_rows[i].doc.record_type != record_type ) {
							errors++;
						}
 
						if( errors == 0 ) {
							var record = {
								_id: record_rows[i].doc._id, 
								_rev: record_rows[i].doc._rev, 
								record_modified: record_rows[i].doc.record_modified
							};

							factory.utils.record_assets.existing_data[record_rows[i].doc.rm_id] = record;
						}

						i++;
					}

				}
			},
			checklist_instances_json: {
				formatCollectionsForDb: function(uaudit_data) {

					//CLEAR COLLECTIONS AND REBUILD - BUT NOT PAGES
					uaudit_data.sections.collection = [];
					uaudit_data.questions.collection = [];
					uaudit_data.media.collection = [];

					angular.forEach(checklist_data.actions.collection, function(action_record, action_index) {

						if( action_record.hasOwnProperty('media') && action_record.media ) {

							angular.forEach(action_record.media, function(a_media_record, a_media_index) {
								uaudit_data.media.collection.push( a_media_record );
							});

						}

					});

					angular.forEach(checklist_data.pages.collection, function(page_record, page_index){

						//CREATE INIT QUESTIONS ARRAY FOR EACH SECTION
						angular.forEach( page_record.sections, function(section_record, section_index){

							//ADD SECTION TO COLLECTION
							uaudit_data.sections.collection.push(section_record);

							//IF THE QUESTION IS INIT THEN ADD TO SECTION INIT COLLECTION
							angular.forEach( section_record.questions, function(question_record, question_index){

								//ADD QUESTION TO SELECTION
								uaudit_data.questions.collection.push(question_record);

								//ADD ANY QUESTION ANSWER SETUP MEDIA TO COLLECTION
								if( question_record.answer_setup.hasOwnProperty('media') && question_record.answer_setup.media.length ) 
								{
									question_record.answer_setup.media.forEach(function(as_media_record, as_media_index) {
										uaudit_data.media.collection.push( as_media_record );
									});
								}

								//ADD EACH QUESTION RESPONSE MEDIA TO COLLECTION
								question_record.response.media.forEach(function(media_record, media_index){
									uaudit_data.media.collection.push( media_record );
								});

							});

						});

					});

				},
				formatAsNew: function(uaudit_data) {

					//CLEAR COLLECTIONS AND REBUILD - BUT NOT PAGES
					uaudit_data.sections.collection = [];
					uaudit_data.sections.deleted = [];
					uaudit_data.questions.collection = [];
					uaudit_data.questions.deleted = [];
					uaudit_data.actions.collection = [];
					uaudit_data.actions.question_relations = {};

					// NEW AUDIT UUID
					uaudit_data.audit_info.cloned_from_id = uaudit_data.audit_info.id;
					uaudit_data.audit_info.cloned_from_rm_id = uaudit_data.audit_info.rm_id;
					uaudit_data.audit_info.id = rmUtilsFactory.utils.createUUID();

					// CLEAR RMIDS
					uaudit_data.audit_info.rm_id = null;
					uaudit_data.audit_info.rm_asset_id = null;

					uaudit_data.audit_info.date_started = new Date().getTime();
					uaudit_data.audit_info.date_modified = new Date().getTime();

					angular.forEach(uaudit_data.pages.collection, function(page_record, page_index){

						//CREATE INIT QUESTIONS ARRAY FOR EACH SECTION
						angular.forEach( page_record.sections, function(section_record, section_index){

							//ADD SECTION TO COLLECTION
							uaudit_data.sections.collection.push(section_record);

							//IF THE QUESTION IS INIT THEN ADD TO SECTION INIT COLLECTION
							angular.forEach( section_record.questions, function(question_record, question_index){

								// SET QUESTION AS INCOMPLETE
								question_record.response.complete = false;

								// SET CLONED FROM UUID
								question_record.cloned_from_uuid = question_record.question_record_id;
								// SET NEW UUID
								question_record.question_record_id = rmUtilsFactory.utils.createUUID();

								// FORMAT QUESTION ACTIONS
								question_record.response.actions.forEach(function(action_record, action_index) {

									// SET CLONED FROM UUID
									action_record.cloned_from_uuid = action_record.id;
									// SET NEW UUID
									action_record.id = rmUtilsFactory.utils.createUUID();

									// PUSH ACTION TO GLOBAL COLLECTION
									uaudit_data.actions.collection.push(action_record);

									// CREATE QUESTION-ACTION RELATION
									var relation = {
										action_id: action_record.id, 
										checklist_id: uaudit_data.overview.id, 
										checklist_record_id: uaudit_data.audit_info.id, 
										date_added: new Date().getTime(), 
										question_id: question_record.id, 
										question_record_id: question_record.question_record_id, 
										question: question_record.question_text
									}

									if( !uaudit_data.actions.question_relations.hasOwnProperty(question_record.question_record_id) ) {
										uaudit_data.actions.question_relations[ question_record.question_record_id ] = [];
	 								}

	 								uaudit_data.actions.question_relations[ question_record.question_record_id ].push(relation);

									// CLEAN UP
									relation = null;

								});

								//ADD QUESTION TO SELECTION
								uaudit_data.questions.collection.push(question_record);

							});

						});

					});

				}
			},
			qc_check_records: {
				existing_data: null, 
				formatQcCheckRecord: function(record) {
					var formatted = angular.copy(record);

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();

					if( record.hasOwnProperty('ReviewDate') && (record.ReviewDate == '0000-00-00 00:00:00' || record.ReviewDate == '0' || record.ReviewDate == '') ) {
						formatted.ReviewDate = null;
					}

					// SET REPORT ID
					if( factory.download_setup.active.report.id ) {
						formatted.report_id = factory.download_setup.active.report.id;
					}

					return formatted;
				},
				filterExistingRmQcCheckRecords: function(record_rows) {

					var i = 0;
					var len = record_rows.length;

					while(i < len) {
						var errors = 0;

						if( !record_rows[i].doc.hasOwnProperty('user_id') || record_rows[i].doc.user_id != authFactory.cloudUserId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('company_id') || record_rows[i].doc.company_id != authFactory.cloudCompanyId() ) {
							errors++;
						}

						if( !record_rows[i].doc.hasOwnProperty('activity_id') || (factory.download_setup.active.project_id && record_rows[i].doc.activity_id != factory.download_setup.active.project_id) ) {
							errors++;
						}

						if( !errors ) {
							var record = {
								_id: record_rows[i].doc._id,
								_rev: record_rows[i].doc._rev, 
								record_modified: record_rows[i].doc.record_modified
							}

							factory.utils.qc_check_records.existing_data[record_rows[i].doc.ID] = record;
						}

						i++;
					}

				}
			}
		}

		factory.key_utils = {
			tasks: {
				id_keys: {},
				ref_keys: {}
			},
			mr_hazards: {
				id_keys: {},
				ref_keys: {}
			},
			mr_controls: {
				id_keys: {},
				ref_keys: {}
			},
			media: {
				id_keys: {},
				ref_keys: {}
			},
			resetAll: function() {
				factory.key_utils.tasks.id_keys = {};
				factory.key_utils.tasks.ref_keys = {};

				factory.key_utils.mr_hazards.id_keys = {};
				factory.key_utils.mr_hazards.ref_keys = {};

				factory.key_utils.mr_controls.id_keys = {};
				factory.key_utils.mr_controls.ref_keys = {};

				factory.key_utils.media.id_keys = {};
				factory.key_utils.media.ref_keys = {};
			},
			storeIdKey: function(type, value, key, sub_key) {

				// STORE WITH RMID AS KEY
				if( angular.isUndefined(factory.key_utils[ type ].id_keys[ key ]) ) {
					factory.key_utils[ type ].id_keys[ key ] = {};
				}

				factory.key_utils[ type ].id_keys[ key ][ sub_key ] = value;
			},
			storeRefKey: function(type, value, key, sub_key) {

				// STORE WITH RMREF AS KEY
				if( angular.isUndefined(factory.key_utils[ type ].ref_keys[ key ]) ) {
					factory.key_utils[ type ].ref_keys[ key ] = {};
				}

				factory.key_utils[ type ].ref_keys[ key ][ sub_key ] = value;
			},
			getValueFromIdKey: function(type, key, sub_key) {

				var value = null;

				// IF KEY NOT SET
				if( key == null ) {
					return value;
				};

				key = parseInt(key);

				if( factory.key_utils[ type ].id_keys.hasOwnProperty(key) ) {

					if( factory.key_utils[ type ].id_keys[key].hasOwnProperty(sub_key) ) {
						value = factory.key_utils[ type ].id_keys[key][sub_key];
					}

				}

				return value;
			},
			getValueFromRefKey: function(type, key, sub_key) {

				var value = null;

				// IF KEY NOT SET
				if( key == null ) {
					return value;
				};

				key = parseInt(key);

				if( factory.key_utils[ type ].ref_keys.hasOwnProperty(key) ) {

					if( factory.key_utils[ type ].ref_keys[key].hasOwnProperty(sub_key) ) {
						value = factory.key_utils[ type ].ref_keys[key][sub_key];
					}

				}

				return value;
			},
			updateIdKeyValue: function(type, key, sub_key, value) {
				
				if( factory.key_utils[ type ].id_keys.hasOwnProperty(key) && !angular.isUndefined(factory.key_utils[ type ].id_keys[key]) ) {

					factory.key_utils[ type ].id_keys[key][sub_key] = value;							

				} else {

					factory.key_utils.storeIdKey(value, key, sub_key);

				}

			},
			updateRefKeyValue: function(type, key, sub_key, value) {

				if( factory.key_utils[ type ].ref_keys.hasOwnProperty(key) && !angular.isUndefined(factory.key_utils[ type ].ref_keys[key]) ) {

					factory.key_utils[ type ].ref_keys[key][sub_key] = value;

				} else {

					factory.key_utils.storeRefKey(type, value, key, sub_key);

				}

			}
		}

		factory.update_utils = {
			updates: [{
				name: 'record_num_files',
				applicable_stages: ['tasks','mr_hazards','mr_controls']
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
				name: 'video_ids', 
				applicable_stages: ['tasks']
			},{
				name: 'audio_ids', 
				applicable_stages: ['tasks']
			},{
				name: 'signature_ids',
				applicable_stages: ['tasks']
			}]
		}

		factory.dbFetch = {
			projects: {
				rmProjectRecord: function(rm_id) {
					var defer = $q.defer();

					// IF DOWNLOAD TYPE IS NEW
					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}

					// FILTER WHERE NOT "archived"
					// IF ARCHIVED, RESOLVE NULL TO SAVE NEW DOWNLOAD

					riskmachDatabasesFactory.databases.collection.projects.find({
						selector: {
							table: 'projects',
							user_id: authFactory.cloudUserId(), 
							rm_id: rm_id
						},
						limit: 1
					}).then(function(results){

						console.log("GOT PROJECT RECORD");
						if( results.docs.length == 0 ) {
							defer.resolve(null);
						} else {

							var filtered_array = [];

							angular.forEach(results.docs, function(project_record, project_index) {
								if( !project_record.hasOwnProperty('archived') || !project_record.archived ) {
									filtered_array.push(project_record);
								}
							});

							if( filtered_array.length == 0 ) {
								defer.resolve(null);
							} else {
								defer.resolve(filtered_array[0]);
							}

						};

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			snapshot_assets: {
				rmSnapshotAssetRecord: function(rm_id) {
					var defer = $q.defer();

					// IF DOWNLOAD TYPE IS NEW
					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.snapshot_assets.existing_data ) {

						if( angular.isDefined(factory.utils.snapshot_assets.existing_data[rm_id]) && factory.utils.snapshot_assets.existing_data[rm_id] ) {
							
							console.log("RECORD FOUND IN EXISTING DATA - UPDATE");

							var existing_record = factory.utils.snapshot_assets.existing_data[rm_id];
							defer.resolve(existing_record);

						} else {
							console.log("RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

					} else {

						factory.dbFetch.snapshot_assets.fetchRmSnapshotAssetRecord(rm_id).then(function(fetched_record) {
							defer.resolve(fetched_record);
						}, function(error) {
							defer.reject(error);
						});

					}

					return defer.promise;
				}, 
				fetchRmSnapshotAssetRecord: function(rm_id) {
					var defer = $q.defer();

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.record_assets.existing_data ) {

							if( angular.isDefined(factory.utils.record_assets.existing_data[rm_id]) && factory.utils.record_assets.existing_data[rm_id] ) {
							
							console.log("RECORD FOUND IN EXISTING DATA - UPDATE");

							var existing_record = factory.utils.record_assets.existing_data[rm_id];
							defer.resolve(existing_record);

						} else {
							console.log("RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.assets.find({
						selector: {
							table: 'assets',
							user_id: authFactory.cloudUserId(), 
							rm_id: rm_id,
							project_id: factory.download_setup.active.project_id
						},
						limit: 1
					}).then(function(results){

						console.log("GOT SNAPSHOT ASSET RECORD");
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
					if( factory.utils.snapshot_assets.existing_data ) {

						var child_array = [];

						// FIND CHILDS IN EXISTING DB DATA
						for(var key in factory.utils.snapshot_assets.existing_data ) {

							if( factory.utils.snapshot_assets.existing_data[key].rm_parent_asset_id == rm_asset_id ) {
								child_array.push(factory.utils.snapshot_assets.existing_data[key]);
							}

						}

						// FIND CHILDS IN NEW CLOUD DATA
						if( factory.utils.snapshot_assets.new_data ) {

							for(var key in factory.utils.snapshot_assets.new_data ) {

								if( factory.utils.snapshot_assets.new_data[key].rm_parent_asset_id == rm_asset_id ) {
									child_array.push(factory.utils.snapshot_assets.new_data[key]);
								}

							}

						}

						defer.resolve(child_array);

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.assets.find({
						selector: {
							table: 'assets',
							user_id: authFactory.cloudUserId(), 
							rm_parent_asset_id: rm_asset_id,
							project_id: factory.download_setup.active.project_id
						}
					}).then(function(results){

						console.log("GOT SNAPSHOT CHILD ASSETS");
						defer.resolve(results.docs);

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			tasks: {
				rmTaskRecord: function(rm_id) {
					var defer = $q.defer();

					// IF DOWNLOAD TYPE IS NEW
					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.tasks.existing_data ) {

						if( angular.isDefined(factory.utils.tasks.existing_data[rm_id]) && factory.utils.tasks.existing_data[rm_id] ) {
							
							console.log("RECORD FOUND IN EXISTING DATA - UPDATE");

							var existing_record = factory.utils.tasks.existing_data[rm_id];
							defer.resolve(existing_record);

						} else {
							console.log("RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.tasks.find({
						selector: {
							table: 'tasks',
							user_id: authFactory.cloudUserId(), 
							rm_id: rm_id, 
							activity_id: factory.download_setup.active.project_id
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
				},
				subTasks: function(rm_task_id) {
					var defer = $q.defer();

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.tasks.existing_data ) {

						var sub_tasks = [];

						for(var key in factory.utils.tasks.existing_data ) {

							if( factory.utils.tasks.existing_data[key].rm_parent_task_id == rm_task_id ) {
								sub_tasks.push(factory.utils.tasks.existing_data[key]);
							}

						}

						defer.resolve(sub_tasks);

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.tasks.find({
						selector: {
							table: 'tasks',
							user_id: authFactory.cloudUserId(), 
							rm_parent_task_id: rm_task_id,
							activity_id: factory.download_setup.active.project_id
						}
					}).then(function(results){

						console.log("GOT SUB TASKS");
						defer.resolve(results.docs);

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			mr_hazards: {
				rmHazardRecord: function(rm_ref) {
					var defer = $q.defer();

					// IF DOWNLOAD TYPE IS NEW
					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.mr_hazards.existing_data ) {

						if( angular.isDefined(factory.utils.mr_hazards.existing_data[rm_ref]) && factory.utils.mr_hazards.existing_data[rm_ref] ) {
							
							console.log("RECORD FOUND IN EXISTING DATA - UPDATE");

							var existing_record = factory.utils.mr_hazards.existing_data[rm_ref];
							defer.resolve(existing_record);

						} else {
							console.log("RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.mr_hazards.find({
						selector: {
							user_id: authFactory.cloudUserId(), 
							rm_ref: rm_ref, 
							activity_id: factory.download_setup.active.project_id
						},
						limit: 1
					}).then(function(results){

						console.log("GOT HAZARD RECORD");
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
			mr_controls: {
				rmControlRecord: function(rm_ref) {
					var defer = $q.defer();

					// IF DOWNLOAD TYPE IS NEW
					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.mr_controls.existing_data ) {

						if( angular.isDefined(factory.utils.mr_controls.existing_data[rm_ref]) && factory.utils.mr_controls.existing_data[rm_ref] ) {
							
							console.log("RECORD FOUND IN EXISTING DATA - UPDATE");

							var existing_record = factory.utils.mr_controls.existing_data[rm_ref];
							defer.resolve(existing_record);

						} else {
							console.log("RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.mr_controls.find({
						selector: {
							user_id: authFactory.cloudUserId(), 
							rm_ref: rm_ref, 
							activity_id: factory.download_setup.active.project_id
						},
						limit: 1
					}).then(function(results){

						console.log("GOT CONTROL RECORD");
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
			hazard_control_relations: {
				rmHazardControlRelation: function(rm_hazard_ref, rm_control_ref) {
					var defer = $q.defer();

					// IF DOWNLOAD TYPE IS NEW
					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.hazard_control_relations.existing_data ) {

						var key = "" + rm_hazard_ref + "_" + rm_control_ref + "";

						if( angular.isDefined(factory.utils.hazard_control_relations.existing_data[key]) && factory.utils.hazard_control_relations.existing_data[key] ) {
							
							console.log("RECORD FOUND IN EXISTING DATA - UPDATE");

							var existing_record = factory.utils.hazard_control_relations.existing_data[key];
							defer.resolve(existing_record);

						} else {
							console.log("RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.hazard_control_relations.find({
						selector: {
							user_id: authFactory.cloudUserId(), 
							rm_hazard_ref: rm_hazard_ref, 
							rm_control_ref: rm_control_ref,
							activity_id: factory.download_setup.active.project_id
						},
						limit: 1
					}).then(function(results){

						console.log("GOT HAZARD CONTROL RELATION RECORD");
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
			checklist_instances: {
				rmChecklistInstanceRecord: function(rm_id) {
					var defer = $q.defer();

					// IF DOWNLOAD TYPE IS NEW
					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.checklist_instances.existing_data ) {

						if( angular.isDefined(factory.utils.checklist_instances.existing_data[rm_id]) && factory.utils.checklist_instances.existing_data[rm_id] ) {
							
							console.log("RECORD FOUND IN EXISTING DATA - UPDATE");

							var existing_record = factory.utils.checklist_instances.existing_data[rm_id];
							defer.resolve(existing_record);

						} else {
							console.log("RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.checklist_instances.find({
						selector: {
							user_id: authFactory.cloudUserId(), 
							rm_id: rm_id, 
							activity_id: factory.download_setup.active.project_id
						},
						limit: 1
					}).then(function(results){

						console.log("GOT CHECKLIST INSTANCE RECORD");
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
			checklist_instances_json: {
				uAuditInstanceJsonRecord: function(instance_record) {
					var defer = $q.defer();

					console.log("FETCH UAUDIT JSON RECORD");
					console.log(instance_record);

					// IF DOWNLOAD TYPE IS NEW
					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}
						
					var db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;

					db.find({
						selector: {
							checklist_instance_id: instance_record.app_checklist_instance_id
						}
					}).then(function(result) {

						// FILTER OUT RM COPY
						var filtered = [];
						var i = 0;
						var len = result.docs.length;
						while(i < len) {
							var errors = 0;

							if( result.docs[i].hasOwnProperty('rm_record_copy') && result.docs[i].rm_record_copy == 'Yes' ) {
								errors++;
							}

							if( errors == 0 ) {
								filtered.push(result.docs[i]);
							}

							i++;
						}

						if( filtered.length == 0 ) {
							defer.resolve(null);
						} else {
							defer.resolve(filtered[0]);
						}

					}).catch(function(error) {
						console.log("ERROR FETCHING UAUDIT JSON RECORD: " + error);
						defer.reject(error);
					});

					return defer.promise;	
				}
			},
			checklist_question_records: {
				rmChecklistQuestionRecord: function(rm_id, checklist_record_id) {
					var defer = $q.defer();

					// IF DOWNLOAD TYPE IS NEW
					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.checklist_question_records.existing_data ) {

						if( angular.isDefined(factory.utils.checklist_question_records.existing_data[rm_id]) && factory.utils.checklist_question_records.existing_data[rm_id] ) {
							
							console.log("RECORD FOUND IN EXISTING DATA - UPDATE");

							var existing_record = factory.utils.checklist_question_records.existing_data[rm_id];
							defer.resolve(existing_record);

						} else {
							console.log("RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.checklist_question_records.find({
						selector: {
							user_id: authFactory.cloudUserId(), 
							rm_id: rm_id, 
							checklist_record_id: checklist_record_id
						},
						limit: 1
					}).then(function(results){

						console.log("GOT CHECKLIST QUESTION RECORD");
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
			assessments: {
				rmRiskAssessmentRecord: function(rm_ref) {
					var defer = $q.defer();

					// if( rm_ref == 437174 || rm_ref == '437174' ) {
					// 	console.log( JSON.stringify(factory.download_setup.active, null, 2) );
					// 	console.log(authFactory.cloudUserId());
					// 	console.log(factory.download_setup.active.project_id);
					// 	alert(rm_ref);
					// }

					// IF DOWNLOAD TYPE IS NEW
					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}


					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.assessments.existing_data ) {

						if( angular.isDefined(factory.utils.assessments.existing_data[rm_ref]) && factory.utils.assessments.existing_data[rm_ref] ) {
							
							console.log("RECORD FOUND IN EXISTING DATA - UPDATE");

							var existing_record = factory.utils.assessments.existing_data[rm_ref];
							defer.resolve(existing_record);

						} else {
							console.log("RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.assessments.find({
						selector: {
							user_id: authFactory.cloudUserId(), 
							rm_ref: rm_ref, 
							activity_id: factory.download_setup.active.project_id
						},
						limit: 1
					}).then(function(results){

						console.log("GOT RISK ASSESSMENT RECORD");
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
			question_assessment_relations: {
				rmQuestionAssessmentRelation: function(relation_record) {
					var defer = $q.defer();

					// IF DOWNLOAD TYPE IS NEW
					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.question_assessment_relations.existing_data ) {

						// IF NOT UAUDIT RELATION
						if( !relation_record.hasOwnProperty('is_uaudit') || relation_record.is_uaudit != 'Yes' ) {
							record_key = "" + relation_record.rm_question_ref + "_" + relation_record.assessment_id + "";
						} else {
							record_key = "" + relation_record.question_record_uuid + "_" + relation_record.assessment_id + "";
						}

						if( angular.isDefined(factory.utils.question_assessment_relations.existing_data[record_key]) && factory.utils.question_assessment_relations.existing_data[record_key] ) {
							
							console.log("RECORD FOUND IN EXISTING DATA - UPDATE");

							var existing_record = factory.utils.question_assessment_relations.existing_data[record_key];
							defer.resolve(existing_record);

						} else {
							console.log(record_key);
							console.log("RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.ra_question_relations.find({
						selector: {
							assessment_id: relation_record.assessment_id,
							rm_question_ref: relation_record.rm_question_ref
						},
						limit: 1
					}).then(function(results){

						console.log("GOT RM QUESTION ASSESSMENT RELATIONS RECORD");
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
			assessment_control_relations: {
				rmAssessmentControlRelation: function(assessment_id, control_id) {
					var defer = $q.defer();

					// IF DOWNLOAD TYPE IS NEW
					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.ra_control_item_relations.find({
						selector: {
							assessment_id: assessment_id,
							control_item_id: control_id
						},
						limit: 1
					}).then(function(results){

						console.log("GOT RM ASSESSMENT CONTROL RELATION RECORD");
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
			media_records: {
				rmMediaRecord: function(rm_ref, record_id) {
					var defer = $q.defer();

					// IF DOWNLOAD TYPE IS NEW
					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.media_records.existing_data ) {

						if( angular.isDefined(factory.utils.media_records.existing_data[rm_ref]) && factory.utils.media_records.existing_data[rm_ref] ) {
							
							console.log("RECORD FOUND IN EXISTING DATA - UPDATE");

							var existing_record = factory.utils.media_records.existing_data[rm_ref];
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
							user_id: authFactory.cloudUserId(), 
							rm_ref: rm_ref, 
							record_id: record_id
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
			qc_check_records: {
				rmQcCheckRecord: function(rm_id) {
					var defer = $q.defer();

					// IF DOWNLOAD TYPE IS NEW
					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}

					// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
					if( factory.utils.qc_check_records.existing_data ) {

						if( angular.isDefined(factory.utils.qc_check_records.existing_data[rm_id]) && factory.utils.qc_check_records.existing_data[rm_id] ) {
							
							console.log("QC RECORD FOUND IN EXISTING DATA - UPDATE");

							var existing_record = factory.utils.qc_check_records.existing_data[rm_id];
							defer.resolve(existing_record);

						} else {
							console.log("QC RECORD NOT FOUND IN EXISTING DATA - SAVE NEW");
							defer.resolve(null);
						}

					} else {
						console.log("NO EXISTING QC DATA - SAVE NEW");
						defer.resolve(null);
					}

					return defer.promise;
				}
			}
		}

		factory.dbUtils = {
			projects: {
				saveProjectRecord: function(project_record) {
					var defer = $q.defer();

					// MARK PROJECT RECORD AS DOWNLOADING
					project_record.downloading = true;

					// IF MODIFIED PROJECT NAME IS SET, APPLY TO PROJECT
					if( factory.modified_project_name ) {
						project_record.modified_project_name = factory.modified_project_name;
					}

					factory.dbUtils.projects.doSaveProjectRecord(project_record).then(function(saved_project) {

						// SETUP REPORT DATA TO SAVE ON CHILD RECORDS
						factory.download_setup.active.report.setProjectsReportMeta(project_record);

						factory.dbUtils.projects.updateProjectDownloadStatus(saved_project._id, true);

						defer.resolve(saved_project);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveProjectRecord: function(project_record) {
					var defer = $q.defer();

					console.log( project_record );

					// ADD MODEL KEYS AND FORMAT
					project_record = factory.utils.formatRmRecordToModel('project', project_record);

					// SET VALUES FOR SYNC
					project_record = factory.utils.setSyncValues(project_record);

					// FORMAT ANY ANOMALIES
					project_record = factory.utils.projects.formatProjectRecord(project_record);

					factory.dbFetch.projects.rmProjectRecord(project_record.rm_id).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.projects.saveNewProjectRecord(project_record).then(function(saved_project) {
								defer.resolve(saved_project);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.projects.updateProjectRecord(project_record, existing_record).then(function(saved_project) {
								defer.resolve(saved_project);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				saveNewProjectRecord: function(project_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					// SET RM OBJECT
					var rm_record = angular.copy(project_record);
					project_record.rm_record = rm_record;

					var rm_id = project_record.rm_id;

					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						// SET TO NULL SO SYNC WILL BE NEW PROJECT
						project_record.rm_id = null;
						project_record.rm_ref = null;

						// RESET SYNC VALUES
						project_record.date_record_synced = null;
						project_record.date_content_synced = null;
						project_record.date_record_imported = null;
						project_record.date_content_imported = null;
						project_record.record_modified = 'Yes';

						// CLEAR REPORT VALUES
						project_record.report_id = null;
						project_record.report_ref = null;
						project_record.report_ref_guid = null;
						project_record.report_date = null;
						project_record.report_status = null;
						project_record.report_status_name = null;
					}

					riskmachDatabasesFactory.databases.collection.projects.post(project_record, options).then(function(saved_record) {
						project_record._id = saved_record.id;
						project_record._rev = saved_record.rev;

						// REAPPLY RMID FOR SUB RECORD SAVES
						project_record.rm_id = rm_id;

						console.log("SAVED PROJECT");

						defer.resolve(project_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateProjectRecord: function(project_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.projects;

					var options = {
						force: true
					};

					// IF THE APP RECORD HAS NOT BEEN MODIFIED
					if( existing_record.record_modified == 'No' ) {
						// SET RM RECORD OBJECT
						var rm_record = angular.copy(project_record);
						project_record.rm_record = rm_record;

						// SET ID/REV ON RM RECORD
						project_record._id = existing_record._id;
						project_record._rev = existing_record._rev;

						db.post(project_record, options).then(function(saved_record) {
							project_record._id = saved_record.id;
							project_record._rev = saved_record.rev;

							console.log("PROJECT RECORD UPDATED ENTIRELY");

							defer.resolve(project_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
					if( project_record.date_modified > existing_record.date_modified ) {
						existing_record.rm_record_modified = 'Yes';
					};

					// CLEAR OLD RM RECORD
					existing_record.rm_record = null;

					// SET RM RECORD OBJECT
					var rm_record = angular.copy(project_record);
					existing_record.rm_record = rm_record;

					// STILL SET REPORT INFO
					if( !existing_record.hasOwnProperty('report_id') || !existing_record.report_id ) {
						existing_record.report_date = project_record.report_date;
						existing_record.report_id = project_record.report_id;
						existing_record.report_ref = project_record.report_ref;
						existing_record.report_ref_guid = project_record.report_ref_guid;
						existing_record.report_status = project_record.report_status;
						existing_record.report_status_name = project_record.report_status_name;
					}

					// STILL SET IQA INFO
					existing_record.iqa_user_id = project_record.iqa_user_id;
					existing_record.iqa_user_name = project_record.iqa_user_name;
					existing_record.iqa_user_id2 = project_record.iqa_user_id2;
					existing_record.iqa_user_name2 = project_record.iqa_user_name2;

					db.post(existing_record, options).then(function(saved_record) {
						existing_record._id = saved_record.id;
						existing_record._rev = saved_record.rev;

						console.log("PROJECT RM RECORD UPDATED");

						defer.resolve(existing_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateProjectDownloadStatus: function(doc_id, status) {
					var defer = $q.defer();

					riskmachDatabasesFactory.databases.collection.projects.get(doc_id, {attachments: true, binary: true}).then(function(doc) {

						doc.downloading = status;

						riskmachDatabasesFactory.databases.collection.projects.post(doc, {force: true}).then(function(result) {
							doc._id = result.id;
							doc._rev = result.rev;

							if( status == true ) {
								factory.download_setup.active.project_id = doc._id;
							} else {
								factory.download_setup.active.project_id = null;
							};

							defer.resolve(doc);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				setProjectQualityCheckReviewId: function(doc_id) {
					var defer = $q.defer();

					if( !factory.download_setup.active.qc.review_id ) {
						defer.resolve();
						return defer.promise;
					}

					var db = riskmachDatabasesFactory.databases.collection.projects;

					db.get(doc_id).then(function(doc) {

						doc.review_id = factory.download_setup.active.qc.review_id;

						db.put(doc).then(function(result) {

							doc._id = result.id;
							doc._rev = result.rev;

							defer.resolve();

						}).catch(function(error) {
							console.log("ERROR SAVING PROJECT QUALITY CHECK REVIEW ID");
							defer.reject(error);
						});

					}).catch(function(error) {
						console.log("ERROR FETCHING PROJECT TO SET QUALITY CHECK REVIEW ID");
						defer.reject(error);
					});

					return defer.promise;
				},
				createNewRegisterProcedureProject: function(snapshot_asset) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.projects;

					var project_record = modelsFactory.models.newProject();

					project_record.client_id = authFactory.getClientId();
					if( !project_record.client_id ) {
						project_record.client_id = 0;
					}

					var start_date_o = new Date();
					var start_date = start_date_o.getFullYear() + '-' + ('0' + (start_date_o.getMonth()+1)).slice(-2) + '-' + ('0' + start_date_o.getDate()).slice(-2);
					project_record.start_date = start_date;

					project_record.title = 'Inspection: ' + snapshot_asset.asset_ref;
					project_record.description = '';

					project_record.pp_id = snapshot_asset.project_pp_id;
					project_record.pp_name = snapshot_asset.project_pp_name;
					project_record.type = snapshot_asset.project_type_id;
					project_record.type_name = snapshot_asset.project_type_name;

					project_record.is_single_inspection = 'Yes';
					project_record.is_register_sop_edit = 'Yes';

					db.post(project_record, {force: true}).then(function(result) {

						project_record._id = result.id;
						project_record._rev = result.rev;

						defer.resolve(project_record);

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			snapshot_assets: {
				saveSnapshotAssetRecord: function(asset_record) {
					var defer = $q.defer();

					factory.dbUtils.snapshot_assets.doSaveSnapshotAssetRecord(asset_record).then(function(saved_asset) {

						factory.dbUtils.snapshot_assets.updateChildAssetsParentId(saved_asset.rm_id, saved_asset._id).then(function() {

							defer.resolve(saved_asset);

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveSnapshotAssetRecord: function(asset_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					asset_record = factory.utils.formatRmRecordToModel('snapshot_asset', asset_record);

					// SET VALUES FOR SYNC
					asset_record = factory.utils.setSyncValues(asset_record);

					// FORMAT ANY ANOMALIES
					asset_record = factory.utils.snapshot_assets.formatSnapshotAssetRecord(asset_record);

					factory.dbFetch.snapshot_assets.rmSnapshotAssetRecord(asset_record.rm_id).then(function(existing_record) {

						// console.log("ASSET TYPE: " + asset_record.record_type);
						// console.log("ASSET : " + asset_record.asset_ref + " - ASSET ID: " + asset_record.rm_id);
						// console.log(JSON.stringify(asset_record, null, 2));

						if( existing_record == null ) {
							factory.dbUtils.snapshot_assets.saveNewSnapshotAssetRecord(asset_record).then(function(saved_asset) {
								defer.resolve(saved_asset);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.snapshot_assets.updateSnapshotAssetRecord(asset_record, existing_record).then(function(saved_asset) {
								
								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.snapshot_assets.existing_data ) {

									if( angular.isDefined(factory.utils.snapshot_assets.existing_data[saved_asset.rm_id]) && factory.utils.snapshot_assets.existing_data[saved_asset.rm_id] ) {
											
										factory.utils.snapshot_assets.existing_data[saved_asset.rm_id]._id = saved_asset._id;
										factory.utils.snapshot_assets.existing_data[saved_asset.rm_id]._rev = saved_asset._rev;
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
				saveNewSnapshotAssetRecord: function(asset_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					var orig_record = null;

					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						orig_record = angular.copy(asset_record);

						asset_record.rm_id = null;
						asset_record.rm_ref = null;
						asset_record.rm_project_id = null;
						asset_record.rm_record_id = null;
						asset_record.rm_parent_asset_id = null;
						asset_record.rm_register_asset_id = null;
						asset_record.rm_site_id = null;
						asset_record.rm_building_id = null;
						asset_record.rm_area_id = null;

						// RESET SYNC VALUES
						asset_record.date_record_synced = null;
						asset_record.date_content_synced = null;
						asset_record.date_record_imported = null;
						asset_record.date_content_imported = null;

						asset_record.record_modified = 'Yes';

						// CLEAR REPORT VALUES
						asset_record.report_id = null;
						asset_record.report_ref = null;
						asset_record.report_ref_guid = null;
						asset_record.report_date = null;
						asset_record.report_status = null;
						asset_record.report_status_name = null;

						asset_record.cloned_from_rm_id = orig_record.rm_id;
					} else {
						// SET RM OBJECT
						var rm_record = angular.copy(asset_record);
						asset_record.rm_record = rm_record;

						orig_record = angular.copy(asset_record);
					}

					riskmachDatabasesFactory.databases.collection.assets.post(asset_record, options).then(function(saved_record) {
						// REAPPLY RM VALUES
						asset_record = angular.copy(orig_record);

						asset_record._id = saved_record.id;
						asset_record._rev = saved_record.rev;

						console.log("SAVED SNAPSHOT ASSET");

						var new_record = {
							_id: asset_record._id, 
							_rev: asset_record._rev, 
							rm_parent_asset_id: asset_record.rm_parent_asset_id,
							record_modified: asset_record.record_modified, 
							date_modified: asset_record.date_modified,
							not_whole_doc: true
						};

						factory.utils.snapshot_assets.new_data[asset_record.rm_id] = new_record;

						defer.resolve(asset_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				updateSnapshotAssetRecord: function(asset_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.assets;

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

						db.post(asset_record, options).then(function(saved_record) {
							asset_record._id = saved_record.id;
							asset_record._rev = saved_record.rev;

							console.log("SNAPSHOT ASSET RECORD UPDATED ENTIRELY");

							defer.resolve(asset_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = angular.copy(doc);

						// CLEAN UP FETCHED DOC
						doc = null;

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

							console.log("SNAPSHOT ASSET RM RECORD UPDATED");

							defer.resolve(existing_record);
						}).catch(function(error) {
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

					factory.dbFetch.snapshot_assets.childAssets(rm_asset_id).then(function(child_assets) {

						if( child_assets.length == 0 ) {
							defer.resolve();
							return defer.promise;
						};

						var active_index = 0;

						var db = riskmachDatabasesFactory.databases.collection.assets;

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

									db.put(doc).then(function(result) {

										doc._id = result.id;
										doc._rev = result.rev;

										// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
										if( factory.utils.snapshot_assets.existing_data ) {

											if( angular.isDefined(factory.utils.snapshot_assets.existing_data[doc.rm_id]) && factory.utils.snapshot_assets.existing_data[doc.rm_id] ) {
													
												factory.utils.snapshot_assets.existing_data[doc.rm_id]._id = doc._id;
												factory.utils.snapshot_assets.existing_data[doc.rm_id]._rev = doc._rev;
											}
										}

										// IF NEW CLOUD DATA, UPDATE REV
										if( factory.utils.snapshot_assets.new_data ) {
											if( angular.isDefined(factory.utils.snapshot_assets.new_data[doc.rm_id]) && factory.utils.snapshot_assets.new_data[doc.rm_id] ) {
												factory.utils.snapshot_assets.new_data[doc.rm_id]._id = doc._id;
												factory.utils.snapshot_assets.new_data[doc.rm_id]._rev = doc._rev;
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

							// IF WHOLE DOC
							asset.parent_asset_id = local_asset_id;

							db.put(asset).then(function(result) {

								asset._id = result.id;
								asset._rev = result.rev;

								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.snapshot_assets.existing_data ) {

									if( angular.isDefined(factory.utils.snapshot_assets.existing_data[asset.rm_id]) && factory.utils.snapshot_assets.existing_data[asset.rm_id] ) {
											
										factory.utils.snapshot_assets.existing_data[asset.rm_id]._id = asset._id;
										factory.utils.snapshot_assets.existing_data[asset.rm_id]._rev = asset._rev;
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
				existingRmSnapshotAssets: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.snapshot_assets.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.assets;

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
								factory.utils.snapshot_assets.filterExistingRmSnapshotAssets(result.rows);

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
				createNewRegisterProcedureAsset: function(snapshot_asset, rm_register_asset_id) {
					var defer = $q.defer();

					var project_id = factory.download_setup.active.project_id;

					var new_snapshot = modelsFactory.models.newSnapshotAsset(project_id);

					new_snapshot.asset_ref = snapshot_asset.asset_ref;
					new_snapshot.serial = snapshot_asset.serial;
					new_snapshot.model = snapshot_asset.model;
					new_snapshot.type = snapshot_asset.type;
					new_snapshot.power = snapshot_asset.power;
					new_snapshot.supplier = snapshot_asset.supplier;
					new_snapshot.manufacturer = snapshot_asset.manufacturer;
					new_snapshot.description = snapshot_asset.description;
					new_snapshot.external_ref_1 = snapshot_asset.external_system_ref;
					new_snapshot.external_ref_2 = snapshot_asset.external_system_ref_2;
					new_snapshot.external_ref_3 = snapshot_asset.external_system_ref_3;
					new_snapshot.external_ref_4 = snapshot_asset.external_system_ref_4;
					new_snapshot.external_ref_5 = snapshot_asset.external_system_ref_5;
					new_snapshot.designation_id = snapshot_asset.designation_id;

					new_snapshot.pp_id = snapshot_asset.project_pp_id;
					new_snapshot.pp_name = snapshot_asset.project_pp_name;
					new_snapshot.activity_type = snapshot_asset.project_type_id;
					new_snapshot.activity_type_name = snapshot_asset.project_type_name;

					// ENSURE ASSET IS SNAPSHOT
					new_snapshot.is_register = 'No';

					new_snapshot.record_modified = 'Yes';

					// LINK SNAPSHOT TO CORE ASSET
					// new_snapshot.register_asset_id = core_asset_doc._id;
					new_snapshot.rm_register_asset_id = snapshot_asset.rm_register_asset_id;
					// new_snapshot.register_asset_ref = snapshot_asset.asset_ref;

					new_snapshot.is_single_inspection = 'Yes';
					new_snapshot.is_register_sop_edit = 'Yes';

					// SAVE SNAPSHOT
					riskmachDatabasesFactory.databases.collection.assets.post(new_snapshot, {force: true}).then(function(result) {

						new_snapshot._id = result.id;
						new_snapshot._rev = result.rev;

						defer.resolve(new_snapshot);

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			tasks: {
				saveTaskRecord: function(task_record) {
					var defer = $q.defer();

					factory.dbUtils.tasks.doSaveTaskRecord(task_record).then(function(saved_data) {

						factory.utils.tasks.cloud_task_revisions[saved_data.orig_record.rm_ref] = parseInt(saved_data.orig_record.revision_number);

						// SETUP RECORD ASSET
						var record_asset = {};

						record_asset.record_id = saved_data.saved_task._id;
						record_asset.asset_ref = saved_data.saved_task.record_asset_ref;
						record_asset.description = saved_data.saved_task.record_asset_description;
						record_asset.record_type = 'task';
						record_asset.company_id = authFactory.cloudCompanyId();

						if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
							record_asset.rm_id = null;
							record_asset.rm_record_id = null;
							record_asset.record_modified = 'Yes';
						} else {
							record_asset.rm_id = saved_data.orig_record.rm_record_asset_id;
							record_asset.rm_record_id = saved_data.orig_record.rm_id;
						}

						// SAVE RECORD ASSET
						factory.dbUtils.record_assets.saveRecordAsset(record_asset).then(function(saved_asset) {

							saved_data.saved_task.record_asset_id = saved_asset._id;

							var options = {
								force: true
							};

							// UPDATE LOCAL RECORD ASSET ID
							riskmachDatabasesFactory.databases.collection.tasks.post(saved_data.saved_task, options).then(function(task_result) {
								
								saved_data.saved_task._id = task_result.id;
								saved_data.saved_task._rev = task_result.rev;

								factory.dbUtils.tasks.updateSubTasksParentId(saved_data.orig_record.rm_id, saved_data.saved_task._id).then(function() {

									saved_data.orig_record._id = saved_data.saved_task._id;
									saved_data.orig_record._rev = saved_data.saved_task._rev;
									saved_data.orig_record.record_asset_id = saved_data.saved_task.record_asset_id;

									defer.resolve(saved_data.orig_record);

									// CLEAN UP
									saved_data.saved_task = null;

								}, function(error) {
									defer.reject(error);
								});

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
				doSaveTaskRecord: function(task_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					task_record = factory.utils.formatRmRecordToModel('task', task_record);

					// SET VALUES FOR SYNC
					task_record = factory.utils.setSyncValues(task_record);

					// FORMAT ANY ANOMALIES
					task_record = factory.utils.tasks.formatTaskRecord(task_record);

					factory.dbFetch.tasks.rmTaskRecord(task_record.rm_id).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.tasks.saveNewTaskRecord(task_record).then(function(saved_data) {
								defer.resolve(saved_data);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.tasks.updateTaskRecord(task_record, existing_record).then(function(saved_data) {
								
								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.tasks.existing_data ) {

									if( angular.isDefined(factory.utils.tasks.existing_data[saved_data.saved_task.rm_id]) && factory.utils.tasks.existing_data[saved_data.saved_task.rm_id] ) {
											
										factory.utils.tasks.existing_data[saved_data.saved_task.rm_id]._id = saved_data.saved_task._id;
										factory.utils.tasks.existing_data[saved_data.saved_task.rm_id]._rev = saved_data.saved_task._rev;
									}

								}

								defer.resolve(saved_data);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				saveNewTaskRecord: function(task_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					var orig_record = null;

					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						orig_record = angular.copy(task_record);

						task_record.rm_id = null;
						task_record.rm_ref = null;
						task_record.rm_parent_task_id = null;
						task_record.rm_parent_task_ref = null;
						task_record.rm_procedure_id = null;
						task_record.rm_procedure_ref = null;
						task_record.rm_record_asset_id = null;
						task_record.rm_activity_id = null;
						task_record.rm_asset_id = null;
						task_record.record_modified = 'Yes';

						task_record.orig_rm_parent_task_id = orig_record.rm_parent_task_id;
					} else {
						// SET RM OBJECT
						var rm_record = angular.copy(task_record);
						task_record.rm_record = rm_record;

						orig_record = angular.copy(task_record);
					}

					riskmachDatabasesFactory.databases.collection.tasks.post(task_record, options).then(function(saved_record) {
						// REAPPLY RM VALUES
						// task_record = angular.copy(orig_record);

						task_record._id = saved_record.id;
						task_record._rev = saved_record.rev;

						console.log("SAVED TASK");

						var saved_data = {
							orig_record: orig_record, 
							saved_task: task_record
						}

						defer.resolve(saved_data);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateTaskRecord: function(task_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.tasks;

					var options = {
						force: true
					};

					// RETAIN LOCAL VALUES
					task_record.video_media_id = existing_record.video_media_id;
					task_record.audio_media_id = existing_record.audio_media_id;
					task_record.signature_id = existing_record.signature_id;

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

							var orig_record = angular.copy(task_record);
							orig_record._id = null;
							orig_record._rev = null;

							var saved_data = {
								orig_record: orig_record,
								saved_task: task_record
							}

							defer.resolve(saved_data);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = angular.copy(doc);

						// CLEAN UP FETCHED DOC
						doc = null;

						// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
						if( task_record.date_modified > existing_record.date_modified ) {
							existing_record.rm_record_modified = 'Yes';
						};

						// CLEAR OLD RM RECORD
						existing_record.rm_record = null;

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(task_record);
						existing_record.rm_record = rm_record;

						// existing_record.status = task_record.status;

						db.post(existing_record, options).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							var orig_record = angular.copy(existing_record);
							orig_record._id = null;
							orig_record._rev = null;

							console.log("TASK RM RECORD UPDATED");

							var saved_data = {
								orig_record: orig_record,
								saved_task: existing_record
							}

							defer.resolve(saved_data);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateSubTasksParentId: function(rm_task_id, local_task_id) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					factory.dbFetch.tasks.subTasks(rm_task_id).then(function(sub_tasks) {

						if( sub_tasks.length == 0 ) {
							defer.resolve();
							return defer.promise;
						};

						var active_index = 0;

						var db = riskmachDatabasesFactory.databases.collection.tasks;

						updateSubTasksParentId(save_defer, sub_tasks[active_index]).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});

						function updateSubTasksParentId(defer, task) {
							task.parent_task_id = local_task_id;

							db.post(task).then(function() {

								active_index++;

								if( active_index > sub_tasks.length - 1 ) {
									defer.resolve();
									return defer.promise;
								};

								updateSubTasksParentId(defer, sub_tasks[active_index]);

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
				existingRmTasks: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.tasks.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.tasks;

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
								factory.utils.tasks.filterExistingRmTasks(result.rows);

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
				reviseOldExistingRmTasks: function() {
					var defer = $q.defer();
					var save_defer = $q.defer();

					console.log("BEGIN REVISE OLD EXISTING RM TASKS");

					var task_ids_to_revise = factory.utils.tasks.findRevisedExistingRmTasks();

					console.log("TASK IDS TO REVISE: " + task_ids_to_revise.length);

					if( task_ids_to_revise.length == 0 ) {
						console.log("NO TASKS TO REVISE");
						defer.resolve();
						return defer.promise;
					}

					var db = riskmachDatabasesFactory.databases.collection.tasks;

					reviseNextTask(save_defer, 0).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function reviseNextTask(defer, active_index) {

						if( active_index > task_ids_to_revise.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						db.get(task_ids_to_revise[active_index]).then(function(doc) {
							
							// REVISE
							doc.status = 3;

							db.put(doc).then(function(result) {

								doc._id = result.id;
								doc._rev = result.rev;

								active_index++;

								reviseNextTask(defer, active_index);

							}).catch(function(error) {
								defer.reject(error);
							});

						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			mr_hazards: {
				saveHazardRecord: function(hazard_record) {
					var defer = $q.defer();

					factory.dbUtils.mr_hazards.doSaveHazardRecord(hazard_record).then(function(saved_hazard) {

						defer.resolve(saved_hazard);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveHazardRecord: function(hazard_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					hazard_record = factory.utils.formatRmRecordToModel('mr_hazard', hazard_record);

					// SET VALUES FOR SYNC
					hazard_record = factory.utils.setSyncValues(hazard_record);

					// FORMAT ANY ANOMALIES
					hazard_record = factory.utils.mr_hazards.formatHazardRecord(hazard_record);

					factory.dbFetch.mr_hazards.rmHazardRecord(hazard_record.rm_ref).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.mr_hazards.saveNewHazardRecord(hazard_record).then(function(saved_hazard) {
								defer.resolve(saved_hazard);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.mr_hazards.updateHazardRecord(hazard_record, existing_record).then(function(saved_hazard) {
								
								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.mr_hazards.existing_data ) {

									if( angular.isDefined(factory.utils.mr_hazards.existing_data[saved_hazard.rm_ref]) && factory.utils.mr_hazards.existing_data[saved_hazard.rm_ref] ) {
											
										factory.utils.mr_hazards.existing_data[saved_hazard.rm_ref]._id = saved_hazard._id;
										factory.utils.mr_hazards.existing_data[saved_hazard.rm_ref]._rev = saved_hazard._rev;
									}

								}

								defer.resolve(saved_hazard);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				saveNewHazardRecord: function(hazard_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					var orig_record = null;

					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						orig_record = angular.copy(hazard_record);

						hazard_record.rm_id = null;
						hazard_record.rm_ref = null;
						hazard_record.rm_asset_id = null;
						hazard_record.rm_register_hazard_id = null;
						hazard_record.rm_task_id = null;
						hazard_record.rm_task_ref = null;
						hazard_record.rm_assessment_id = null;
						hazard_record.rm_assessment_ref = null;
						hazard_record.revision_number = null;
						hazard_record.rm_activity_id = null;
						hazard_record.record_modified = 'Yes';

						hazard_record.cloned_from_rm_id = orig_record.rm_id;
						hazard_record.cloned_from_rm_ref = orig_record.rm_ref;
					} else {
						// SET RM OBJECT
						var rm_record = angular.copy(hazard_record);
						hazard_record.rm_record = rm_record;

						orig_record = angular.copy(hazard_record);
					}

					riskmachDatabasesFactory.databases.collection.mr_hazards.post(hazard_record, options).then(function(saved_record) {
						// REAPPLY RM VALUES
						hazard_record = angular.copy(orig_record);

						hazard_record._id = saved_record.id;
						hazard_record._rev = saved_record.rev;

						console.log("SAVED HAZARD");

						defer.resolve(hazard_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateHazardRecord: function(hazard_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.mr_hazards;

					var options = {
						force: true
					};

					// IF THE APP RECORD HAS NOT BEEN MODIFIED
					if( existing_record.record_modified == 'No' ) {
						// SET RM RECORD OBJECT
						var rm_record = angular.copy(hazard_record);
						hazard_record.rm_record = rm_record;

						// SET ID/REV ON RM RECORD
						hazard_record._id = existing_record._id;
						hazard_record._rev = existing_record._rev;

						db.post(hazard_record, options).then(function(saved_record) {
							hazard_record._id = saved_record.id;
							hazard_record._rev = saved_record.rev;

							console.log("HAZARD RECORD UPDATED ENTIRELY");

							defer.resolve(hazard_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = angular.copy(doc);

						// CLEAN UP FETCHED DOC
						doc = null;

						// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
						if( hazard_record.date_modified > existing_record.date_modified ) {
							existing_record.rm_record_modified = 'Yes';
						};

						// CLEAR OLD RM RECORD
						existing_record.rm_record = null;

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(hazard_record);
						existing_record.rm_record = rm_record;

						db.post(existing_record, options).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							console.log("HAZARD RM RECORD UPDATED");

							defer.resolve(existing_record);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingRmHazards: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.mr_hazards.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.mr_hazards;

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
								factory.utils.mr_hazards.filterExistingRmHazards(result.rows);

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
			mr_controls: {
				saveControlRecord: function(control_record) {
					var defer = $q.defer();

					factory.dbUtils.mr_controls.doSaveControlRecord(control_record).then(function(saved_data) {

						// SETUP RECORD ASSET
						var record_asset = {};

						record_asset.record_id = saved_data.saved_control._id;
						record_asset.asset_ref = saved_data.saved_control.record_asset_ref;
						record_asset.description = saved_data.saved_control.record_asset_description;
						record_asset.record_type = 'control_item';
						record_asset.company_id = authFactory.cloudCompanyId();

						if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
							record_asset.rm_id = null;
							record_asset.rm_record_id = null;
							record_asset.record_modified = 'Yes';
						} else {
							record_asset.rm_id = saved_data.orig_record.rm_record_asset_id;
							record_asset.rm_record_id = saved_data.orig_record.rm_id;
						}

						// SAVE RECORD ASSET
						factory.dbUtils.record_assets.saveRecordAsset(record_asset).then(function(saved_asset) {

							saved_data.saved_control.record_asset_id = saved_asset._id;

							// UPDATE LOCAL RECORD ASSET ID
							riskmachDatabasesFactory.databases.collection.mr_controls.put(saved_data.saved_control).then(function(control_result) {
								
								saved_data.saved_control._id = control_result.id;
								saved_data.saved_control._rev = control_result.rev;

								saved_data.orig_record._id = saved_data.saved_control._id;
								saved_data.orig_record._rev = saved_data.saved_control._rev;
								saved_data.orig_record.record_asset_id = saved_data.saved_control.record_asset_id;

								defer.resolve(saved_data.orig_record);

								// CLEAN UP
								saved_data.saved_control = null;

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
				doSaveControlRecord: function(control_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					control_record = factory.utils.formatRmRecordToModel('mr_control', control_record);

					// SET VALUES FOR SYNC
					control_record = factory.utils.setSyncValues(control_record);

					// FORMAT ANY ANOMALIES
					control_record = factory.utils.mr_controls.formatControlRecord(control_record);

					factory.dbFetch.mr_controls.rmControlRecord(control_record.rm_ref).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.mr_controls.saveNewControlRecord(control_record).then(function(saved_data) {
								defer.resolve(saved_data);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.mr_controls.updateControlRecord(control_record, existing_record).then(function(saved_data) {
								
								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.mr_controls.existing_data ) {

									if( angular.isDefined(factory.utils.mr_controls.existing_data[saved_data.saved_control.rm_ref]) && factory.utils.mr_controls.existing_data[saved_data.saved_control.rm_ref] ) {
											
										factory.utils.mr_controls.existing_data[saved_data.saved_control.rm_ref]._id = saved_data.saved_control._id;
										factory.utils.mr_controls.existing_data[saved_data.saved_control.rm_ref]._rev = saved_data.saved_control._rev;
									}

								}

								defer.resolve(saved_data);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				saveNewControlRecord: function(control_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					var orig_record = null;

					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						orig_record = angular.copy(control_record);

						control_record.rm_id = null;
						control_record.rm_ref = null;
						control_record.revision_number = null;
						control_record.rm_merge_to_ref = null;
						control_record.rm_asset_id = null;
						control_record.rm_task_id = null;
						control_record.rm_task_ref = null;
						control_record.rm_profile_image_id = null;
						control_record.rm_record_asset_id = null;
						control_record.rm_register_control_item_id = null;
						control_record.rm_activity_id = null;
						control_record.record_modified = 'Yes';

						control_record.cloned_from_rm_id = orig_record.rm_id;
						control_record.cloned_from_rm_ref = orig_record.rm_ref;
					} else {
						// SET RM OBJECT
						var rm_record = angular.copy(control_record);
						control_record.rm_record = rm_record;

						orig_record = angular.copy(control_record);
					}

					riskmachDatabasesFactory.databases.collection.mr_controls.post(control_record, options).then(function(saved_record) {
						// REAPPLY RM VALUES
						// control_record = angular.copy(orig_record);

						control_record._id = saved_record.id;
						control_record._rev = saved_record.rev;

						console.log("SAVED CONTROL");

						var saved_data = {
							orig_record: orig_record, 
							saved_control: control_record
						}

						defer.resolve(saved_data);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateControlRecord: function(control_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.mr_controls;

					var options = {
						force: true
					};

					// IF THE APP RECORD HAS NOT BEEN MODIFIED
					if( existing_record.record_modified == 'No' ) {
						// SET RM RECORD OBJECT
						var rm_record = angular.copy(control_record);
						control_record.rm_record = rm_record;

						// SET ID/REV ON RM RECORD
						control_record._id = existing_record._id;
						control_record._rev = existing_record._rev;

						db.post(control_record, options).then(function(saved_record) {
							control_record._id = saved_record.id;
							control_record._rev = saved_record.rev;

							console.log("CONTROL RECORD UPDATED ENTIRELY");

							var orig_record = angular.copy(control_record);
							orig_record._id = null;
							orig_record._rev = null;

							var saved_data = {
								orig_record: orig_record,
								saved_control: control_record
							}

							defer.resolve(saved_data);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = angular.copy(doc);

						// CLEAN UP FETCHED DOC
						doc = null;

						// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
						if( control_record.date_modified > existing_record.date_modified ) {
							existing_record.rm_record_modified = 'Yes';
						};

						// CLEAR OLD RM RECORD
						existing_record.rm_record = null;

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(control_record);
						existing_record.rm_record = rm_record;

						db.post(existing_record, options).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							var orig_record = angular.copy(existing_record);
							orig_record._id = null;
							orig_record._rev = null;

							console.log("CONTROL RM RECORD UPDATED");

							var saved_data = {
								orig_record: orig_record,
								saved_control: existing_record
							}

							defer.resolve(saved_data);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingRmControls: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.mr_controls.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.mr_controls;

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
								factory.utils.mr_controls.filterExistingRmControls(result.rows);

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
			checklist_instances: {
				saveChecklistInstanceRecord: function(checklist_record) {
					var defer = $q.defer();

					factory.dbUtils.checklist_instances.doSaveChecklistInstanceRecord(checklist_record).then(function(saved_checklist) {

						defer.resolve(saved_checklist);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveChecklistInstanceRecord: function(checklist_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					checklist_record = factory.utils.formatRmRecordToModel('checklist_instance', checklist_record);

					// SET VALUES FOR SYNC
					checklist_record = factory.utils.setSyncValues(checklist_record);

					// FORMAT ANY ANOMALIES
					checklist_record = factory.utils.checklist_instances.formatChecklistInstanceRecord(checklist_record);

					factory.dbFetch.checklist_instances.rmChecklistInstanceRecord(checklist_record.rm_id).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.checklist_instances.saveNewChecklistInstanceRecord(checklist_record).then(function(saved_checklist) {
								
								defer.resolve(saved_checklist);

							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.checklist_instances.updateChecklistInstanceRecord(checklist_record, existing_record).then(function(saved_checklist) {
								
								// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
								if( factory.utils.checklist_instances.existing_data ) {

									if( angular.isDefined(factory.utils.checklist_instances.existing_data[saved_checklist.rm_id]) && factory.utils.checklist_instances.existing_data[saved_checklist.rm_id] ) {
										
										factory.utils.checklist_instances.existing_data[saved_checklist.rm_id]._id = saved_checklist._id;
										factory.utils.checklist_instances.existing_data[saved_checklist.rm_id]._rev = saved_checklist._rev;

									}

								}

								defer.resolve(saved_checklist);

							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				saveNewChecklistInstanceRecord: function(checklist_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					var orig_record = null;

					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						orig_record = angular.copy(checklist_record);

						checklist_record.rm_id = null;
						checklist_record.rm_checklist_record_id = null;
						checklist_record.rm_activity_id = null;
						checklist_record.rm_asset_id = null;
						checklist_record.module_record_id = null;

						// RESET SYNC VALUES
						checklist_record.date_record_synced = null;
						checklist_record.date_content_synced = null;
						checklist_record.date_record_imported = null;
						checklist_record.date_content_imported = null;
						checklist_record.record_modified = 'Yes';

						checklist_record.cloned_from_rm_id = orig_record.rm_id;
					} else {
						// SET RM OBJECT
						var rm_record = angular.copy(checklist_record);
						checklist_record.rm_record = rm_record;

						orig_record = angular.copy(checklist_record);
					}

					riskmachDatabasesFactory.databases.collection.checklist_instances.post(checklist_record, options).then(function(saved_record) {
						// REAPPLY RM VALUES
						checklist_record = angular.copy(orig_record);

						checklist_record._id = saved_record.id;
						checklist_record._rev = saved_record.rev;

						console.log("SAVED CHECKLIST");

						defer.resolve(checklist_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateChecklistInstanceRecord: function(checklist_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.checklist_instances;

					var options = {
						force: true
					};

					// IF THE APP RECORD HAS NOT BEEN MODIFIED
					if( existing_record.record_modified == 'No' ) {
						// SET RM RECORD OBJECT
						var rm_record = angular.copy(checklist_record);
						checklist_record.rm_record = rm_record;

						// SET ID/REV ON RM RECORD
						checklist_record._id = existing_record._id;
						checklist_record._rev = existing_record._rev;

						db.post(checklist_record, options).then(function(saved_record) {
							checklist_record._id = saved_record.id;
							checklist_record._rev = saved_record.rev;

							console.log("CHECKLIST RECORD UPDATED ENTIRELY");

							defer.resolve(checklist_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = angular.copy(doc);

						// CLEAN UP
						doc = null;

						// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
						if( checklist_record.date_modified > existing_record.date_modified ) {
							existing_record.rm_record_modified = 'Yes';
						};

						// CLEAR OLD RM RECORD
						existing_record.rm_record = null;

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(checklist_record);
						existing_record.rm_record = rm_record;

						db.post(existing_record, options).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							console.log("CHECKLIST RM RECORD UPDATED");

							defer.resolve(existing_record);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingRmChecklistRecords: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.checklist_instances.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.checklist_instances;

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
								factory.utils.checklist_instances.filterExistingRmChecklistRecords(result.rows);

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
				saveIndexJsonRecord: function(checklist_record_id, rm_checklist_record_id, json_record_id) {
					var defer = $q.defer();

					console.log("INDEX JSON RECORD ON CHECKLIST INSTANCE");
					console.log("CHECKLIST INSTANCE: " + checklist_record_id);
					console.log("RM CHECKLIST INSTANCE: " + rm_checklist_record_id);
					console.log("JSON RECORD: " + json_record_id);

					var db = riskmachDatabasesFactory.databases.collection.checklist_instances;

					db.get(checklist_record_id).then(function(doc) {

						doc.checklist_instance_json_id = json_record_id;

						db.put(doc).then(function(result) {

							// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
							if( factory.utils.checklist_instances.existing_data ) {

								if( angular.isDefined(factory.utils.checklist_instances.existing_data[rm_checklist_record_id]) && factory.utils.checklist_instances.existing_data[rm_checklist_record_id] ) {
									
									factory.utils.checklist_instances.existing_data[rm_checklist_record_id]._id = doc._id;
									factory.utils.checklist_instances.existing_data[rm_checklist_record_id]._rev = doc._rev;

								}

							}


							// CLEANUP
							doc = null;

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
			checklist_instances_json: {
				saveUAuditInstanceJsonRecord: function(instance_record) {
					var defer = $q.defer();

					factory.dbFetch.checklist_instances_json.uAuditInstanceJsonRecord(instance_record).then(function(existing_record) {

						console.log("FETCHED EXISTING UAUDIT JSON RECORD");
						console.log(existing_record);

						if( !existing_record ) {

							factory.dbUtils.checklist_instances_json.saveNewUAuditInstanceJsonRecord(instance_record).then(function(saved_json_record) {

								factory.dbUtils.checklist_instances.saveIndexJsonRecord(saved_json_record.checklist_instance_id, instance_record.ChecklistRecordID, saved_json_record._id).then(function() {
									defer.resolve(saved_json_record);
								}, function(error) {
									defer.reject(error);
								});

							}, function(error) {
								console.log("SAVE NEW UAUDIT ERROR: " + error);
								defer.reject(error);
							});

						} else {

							factory.dbUtils.checklist_instances_json.updateUAuditInstanceJsonRecord(instance_record, existing_record).then(function(updated_json_record) {

								factory.dbUtils.checklist_instances.saveIndexJsonRecord(updated_json_record.checklist_instance_id, instance_record.ChecklistRecordID, updated_json_record._id).then(function() {
									defer.resolve(updated_json_record);
								}, function(error) {
									defer.reject(error);
								});

							}, function(error) {
								console.log("UPDATE UAUDIT ERROR: " + error);
								defer.reject(error);
							});

						}

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveNewUAuditInstanceJsonRecord: function(instance_record) {
					var defer  = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;

					var relations = {
						checklist_instance_id: instance_record.app_checklist_instance_id,
						rm_checklist_instance_id: instance_record.ChecklistRecordID
					}

					var record = modelsFactory.models.newChecklistInstanceJson(relations);
					// INIT RECORD MODIFIED AS NO
					record.record_modified = 'No';

					// IF DOWNLOAD TYPE IS NEW
					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						// CLEAR RM VALUE
						record.rm_checklist_instance_id = null;
						// SET RECORD MODIFIED TO YES
						record.record_modified = 'Yes';
					}

					if( instance_record.UAuditInstanceData ) {
						record.uaudit_instance_data = instance_record.UAuditInstanceData;

						// PARSE SO WE CAN MANIPULATE DATA
						console.log("DATA TO PARSE");
						console.log(record.uaudit_instance_data);

						var data_parse = rmUtilsFactory.tryParseObject(record.uaudit_instance_data);
						if( data_parse ) {
							record.uaudit_instance_data = data_parse;
						}

						// CLEAN UP
						data_parse = null;

						// record.uaudit_instance_data = JSON.parse(record.uaudit_instance_data);

						console.log("PARSED UAUDIT INSTANCE DATA");
						console.log(record.uaudit_instance_data);

						// SET INSPECTION ID ON JSON
						record.uaudit_instance_data.audit_info.asset_id = instance_record.asset_id;

						// IF DOWNLOAD AS NEW, CREATE NEW UUID FOR ALL DATA
						if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
							
							// LOOP THROUGH JSON AND GIVE NEW IDS - APART FROM RESPONSE MEDIA
							factory.utils.checklist_instances_json.formatAsNew(record.uaudit_instance_data);
						}

						// STRINGIFY JSON AFTER MANIPULATION FOR DB
						record.uaudit_instance_data = JSON.stringify(record.uaudit_instance_data);
					} else {
						record.uaudit_instance_data = null;
					}

					db.post(record, {force: true}).then(function(result) {

						record._id = result.id;
						record._rev = result.rev;

						console.log("SAVED NEW UAUDIT JSON RECORD");

						factory.dbUtils.checklist_instances_json.saveRmRecordCopy(record, instance_record.UAuditInstanceData).then(function(copy_data) {

							record.rm_record_copy_id = copy_data.rm_copy_id;

							db.put(record).then(function(result) {

								record._id = result.id;
								record._rev = result.rev;

								defer.resolve(record);

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
				updateUAuditInstanceJsonRecord: function(instance_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;

					// IF CHECKLIST INSTANCE NOT MODIFIED
					if( existing_record.hasOwnProperty('record_modified') && existing_record.record_modified == 'No' ) {

						// UPDATE ENTIRE UAUDIT JSON
						existing_record.uaudit_instance_data = instance_record.UAuditInstanceData;

						db.put(existing_record).then(function(result) {

							existing_record._id = result.id;
							existing_record._rev = result.rev;

							console.log("UPDATED ENTIRE UAUDIT JSON RECORD");

							factory.dbUtils.checklist_instances_json.saveRmRecordCopy(existing_record, instance_record.UAuditInstanceData).then(function(copy_data) {

								defer.resolve(existing_record);

							}, function(error) {
								defer.reject(error);
							});

						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					// DON'T EDIT EXISTING RECORD, SAVE RM RECORD COPY
					factory.dbUtils.checklist_instances_json.saveRmRecordCopy(existing_record, instance_record.UAuditInstanceData).then(function() {

						console.log("ONLY SAVED RM RECORD COPY");

						defer.resolve(existing_record);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveRmRecordCopy: function(record, cloud_json_data) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;

					if( !record.hasOwnProperty('rm_record_copy_id') || !record.rm_record_copy_id ) {

						// CREATE RM COPY
						var new_rm_record_copy = angular.copy(record);
						new_rm_record_copy._id = null;
						new_rm_record_copy._rev = null;

						new_rm_record_copy.uaudit_instance_data = cloud_json_data;
						new_rm_record_copy.copy_from_instance_json_id = record._id;
						new_rm_record_copy.rm_record_copy = 'Yes';

						db.post(new_rm_record_copy, {force: true}).then(function(new_copy_result) {

							// CLEAN UP
							new_rm_record_copy = null;

							record.rm_record_copy_id = new_copy_result.id;

							db.put(record).then(function(record_result) {

								record._id = record_result.id;
								record._rev = record_result.rev;

								defer.resolve(record);

							}).catch(function(error) {
								defer.reject(error);
							});

						}).catch(function(error) {
							defer.reject(error);
						});

					} else {

						// FETCH RM COPY OF UAUDIT JSON
						db.get(record.rm_record_copy_id).then(function(rm_record_copy) {

							// UPDATE ENTIRE JSON OF RM COPY
							rm_record_copy.uaudit_instance_data = cloud_json_data;

							db.put(rm_record_copy).then(function(copy_result) {

								// CLEAN UP
								rm_record_copy = null;

								defer.resolve(record);

							}).catch(function(error) {
								defer.reject(error);
							});

						}).catch(function(error) {
							defer.reject(error);
						});

					}

					return defer.promise;
				},
				saveUpdatedJson: function(checklist_instances_json_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;

					// IF INSTANCE JSON NOT MODIFIED
					if( checklist_instances_json_record.hasOwnProperty('record_modified') && checklist_instances_json_record.record_modified == 'No' ) {

						console.log("UPDATE ENTIRE CHECKLIST INSTANCE JSON");

						// UPDATE ENTIRE CHECKLIST INSTANCE JSON	
						db.put(checklist_instances_json_record).then(function(result) {

							checklist_instances_json_record._id = result.id;
							checklist_instances_json_record._rev = result.rev;

							defer.resolve();

						}).catch(function(error) {
							defer.reject(error);
						});

					} else {

						console.log("UPDATE ONLY RM RECORD COPY");

						// UPDATE ONLY RM COPY
						factory.dbUtils.checklist_instances_json.saveRmRecordCopy(checklist_instances_json_record, checklist_instances_json_record.uaudit_instance_data).then(function() {

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

					}

					return defer.promise;
				}
			},
			checklist_question_records: {
				saveChecklistQuestionRecord: function(question_record) {
					var defer = $q.defer();

					factory.dbUtils.checklist_question_records.doSaveChecklistQuestionRecord(question_record).then(function(saved_question) {

						defer.resolve(saved_question);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveChecklistQuestionRecord: function(question_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					question_record = factory.utils.formatRmRecordToModel('checklist_question', question_record);

					// SET VALUES FOR SYNC
					question_record = factory.utils.setSyncValues(question_record);

					// FORMAT ANY ANOMALIES
					question_record = factory.utils.checklist_question_records.formatChecklistQuestionRecord(question_record);

					factory.dbFetch.checklist_question_records.rmChecklistQuestionRecord(question_record.rm_id, question_record.checklist_record_id).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.checklist_question_records.saveNewChecklistQuestionRecord(question_record).then(function(saved_question) {
								defer.resolve(saved_question);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.checklist_question_records.updateChecklistQuestionRecord(question_record, existing_record).then(function(saved_question) {
								
								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.checklist_question_records.existing_data ) {

									if( angular.isDefined(factory.utils.checklist_question_records.existing_data[saved_question.rm_id]) && factory.utils.checklist_question_records.existing_data[saved_question.rm_id] ) {
											
										factory.utils.checklist_question_records.existing_data[saved_question.rm_id]._id = saved_question._id;
										factory.utils.checklist_question_records.existing_data[saved_question.rm_id]._rev = saved_question._rev;
									}

								}

								defer.resolve(saved_question);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveNewChecklistQuestionRecord: function(question_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					var orig_record = null;

					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						orig_record = angular.copy(question_record);

						question_record.rm_id = null;
						question_record.rm_checklist_record_id = null;
						question_record.rm_answer_id = null;
						question_record.rm_answer_ref = null;

						// UNSET MARKED COMPLETE
						question_record.marked_complete = false;
						question_record.marked_completed_by = null;
						question_record.marked_completed_date = null;

						// RESET SYNC VALUES
						question_record.date_record_synced = null;
						question_record.date_content_synced = null;
						question_record.date_record_imported = null;
						question_record.date_content_imported = null;
						question_record.record_modified = 'Yes';

						question_record.cloned_from_rm_id = orig_record.rm_id;
					} else {
						// SET RM OBJECT
						var rm_record = angular.copy(question_record);
						question_record.rm_record = rm_record;

						orig_record = angular.copy(question_record);
					}

					riskmachDatabasesFactory.databases.collection.checklist_question_records.post(question_record, options).then(function(saved_record) {
						// REAPPLY RM VALUES
						question_record = angular.copy(orig_record);

						question_record._id = saved_record.id;
						question_record._rev = saved_record.rev;

						console.log("SAVED CHECKLIST QUESTION");

						defer.resolve(question_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateChecklistQuestionRecord: function(question_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.checklist_question_records;

					var options = {
						force: true
					};

					// IF THE APP RECORD HAS NOT BEEN MODIFIED
					if( existing_record.record_modified == 'No' ) {
						// SET RM RECORD OBJECT
						var rm_record = angular.copy(question_record);
						question_record.rm_record = rm_record;

						// SET ID/REV ON RM RECORD
						question_record._id = existing_record._id;
						question_record._rev = existing_record._rev;

						db.post(question_record, options).then(function(saved_record) {
							question_record._id = saved_record.id;
							question_record._rev = saved_record.rev;

							console.log("CHECKLIST QUESTION RECORD UPDATED ENTIRELY");

							defer.resolve(question_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = angular.copy(doc);

						// CLEAN UP FETCHED DOC
						doc = null;

						// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
						if( question_record.date_modified > existing_record.date_modified ) {
							existing_record.rm_record_modified = 'Yes';
						};

						// CLEAR OLD RM RECORD
						existing_record.rm_record = null;

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(question_record);
						existing_record.rm_record = rm_record;

						db.post(existing_record, options).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							console.log("CHECKLIST QUESTION RM RECORD UPDATED");

							defer.resolve(existing_record);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingRmChecklistQuestions: function(checklist_keys) {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.checklist_question_records.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.checklist_question_records;

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
								factory.utils.checklist_question_records.filterExistingRmChecklistQuestions(result.rows, checklist_keys);

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
			assessments: {
				saveRiskAssessmentRecord: function(assessment_record) {
					var defer = $q.defer();

					factory.dbUtils.assessments.doSaveRiskAssessmentRecord(assessment_record).then(function(saved_assessment) {

						defer.resolve(saved_assessment);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveRiskAssessmentRecord: function(assessment_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					assessment_record = factory.utils.formatRmRecordToModel('risk_assessment', assessment_record);

					// SET VALUES FOR SYNC
					assessment_record = factory.utils.setSyncValues(assessment_record);

					// FORMAT ANY ANOMALIES
					assessment_record = factory.utils.assessments.formatRiskAssessmentRecord(assessment_record);

					factory.dbFetch.assessments.rmRiskAssessmentRecord(assessment_record.rm_ref).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.assessments.saveNewRiskAssessmentRecord(assessment_record).then(function(saved_assessment) {
								defer.resolve(saved_assessment);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.assessments.updateRiskAssessmentRecord(assessment_record, existing_record).then(function(saved_assessment) {
								
								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.assessments.existing_data ) {

									if( angular.isDefined(factory.utils.assessments.existing_data[saved_assessment.rm_ref]) && factory.utils.assessments.existing_data[saved_assessment.rm_ref] ) {
											
										factory.utils.assessments.existing_data[saved_assessment.rm_ref]._id = saved_assessment._id;
										factory.utils.assessments.existing_data[saved_assessment.rm_ref]._rev = saved_assessment._rev;
									}

								}

								defer.resolve(saved_assessment);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveNewRiskAssessmentRecord: function(assessment_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					var orig_record = null;

					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						orig_record = angular.copy(assessment_record);

						// assessment_record.downloaded_rm_values = {
						// 	rm_id: assessment_record.rm_id, 
						// 	rm_ref: assessment_record.rm_ref, 
						// 	rm_revision_number: assessment_record.rm_revision_number, 
						// 	rm_activity_id: assessment_record.rm_activity_id, 
						// 	rm_asset_id: assessment_record.rm_asset_id, 
						// 	status: assessment_record.status, 
						// 	status_name: assessment_record.status_name
						// }

						assessment_record.rm_id = null;
						assessment_record.rm_ref = null;
						assessment_record.rm_revision_number = null;
						assessment_record.rm_activity_id = null;
						assessment_record.rm_asset_id = null;

						// RESET SYNC VALUES
						assessment_record.date_record_synced = null;
						assessment_record.date_content_synced = null;
						assessment_record.date_record_imported = null;
						assessment_record.date_content_imported = null;
						assessment_record.record_modified = 'Yes';

						assessment_record.status = 4; // DRAFT
						assessment_record.status_name = 'Draft';

						assessment_record.cloned_from_rm_id = null;
						assessment_record.cloned_from_rm_ref = null;
					} else {
						// SET RM OBJECT
						var rm_record = angular.copy(assessment_record);
						assessment_record.rm_record = rm_record;

						orig_record = angular.copy(assessment_record);
					}

					riskmachDatabasesFactory.databases.collection.assessments.post(assessment_record, options).then(function(saved_record) {
						// REAPPLY RM VALUES
						assessment_record = angular.copy(orig_record);

						assessment_record._id = saved_record.id;
						assessment_record._rev = saved_record.rev;

						console.log("SAVED RISK ASSESSMENT");

						defer.resolve(assessment_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateRiskAssessmentRecord: function(assessment_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.assessments;

					var options = {
						force: true
					};

					// IF THE APP RECORD HAS NOT BEEN MODIFIED
					if( existing_record.record_modified == 'No' ) {
						// SET RM RECORD OBJECT
						var rm_record = angular.copy(assessment_record);
						assessment_record.rm_record = rm_record;

						// SET ID/REV ON RM RECORD
						assessment_record._id = existing_record._id;
						assessment_record._rev = existing_record._rev;

						db.post(assessment_record, options).then(function(saved_record) {
							assessment_record._id = saved_record.id;
							assessment_record._rev = saved_record.rev;

							console.log("ASSESSMENT RECORD UPDATED ENTIRELY");

							defer.resolve(assessment_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = angular.copy(doc);

						// CLEAN UP FETCHED DOC
						doc = null;

						// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
						if( assessment_record.date_modified > existing_record.date_modified ) {
							existing_record.rm_record_modified = 'Yes';
						};

						// CLEAR OLD RM RECORD
						existing_record.rm_record = null;

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(assessment_record);
						existing_record.rm_record = rm_record;

						db.post(existing_record, options).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							console.log("ASSESSMENT RM RECORD UPDATED");

							defer.resolve(existing_record);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingRmRiskAssessments: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.assessments.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.assessments;

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
								factory.utils.assessments.filterExistingRmRiskAssessments(result.rows);

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
			question_assessment_relations: {
				saveQuestionAssessmentRelationRecord: function(relation_record) {
					var defer = $q.defer();

					factory.dbUtils.question_assessment_relations.doSaveQuestionAssessmentRelationRecord(relation_record).then(function(saved_relation) {

						defer.resolve(saved_relation);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveQuestionAssessmentRelationRecord: function(relation_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					relation_record = factory.utils.formatRmRecordToModel('question_assessment_relation', relation_record);

					// SET VALUES FOR SYNC
					relation_record = factory.utils.setSyncValues(relation_record);

					// FORMAT ANY ANOMALIES
					relation_record = factory.utils.question_assessment_relations.formatQuestionAssessmentRelationRecord(relation_record);

					factory.dbFetch.question_assessment_relations.rmQuestionAssessmentRelation(relation_record).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.question_assessment_relations.saveNewQuestionAssessmentRelationRecord(relation_record).then(function(saved_relation) {
								defer.resolve(saved_relation);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.question_assessment_relations.updateQuestionAssessmentRelationRecord(relation_record, existing_record).then(function(saved_relation) {
								
								// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
								if( factory.utils.question_assessment_relations.existing_data ) {

									var record_key = null;

									// IF NOT UAUDIT RELATION
									if( !saved_relation.hasOwnProperty('is_uaudit') || saved_relation.is_uaudit != 'Yes' ) {
										record_key = "" + saved_relation.rm_question_ref + "_" + saved_relation.assessment_id + "";
									} else {
										record_key = "" + saved_relation.question_record_uuid + "_" + saved_relation.assessment_id + "";
									}

									if( angular.isDefined(factory.utils.question_assessment_relations.existing_data[record_key]) && factory.utils.question_assessment_relations.existing_data[record_key] ) {
										
										factory.utils.question_assessment_relations.existing_data[record_key]._id = saved_relation._id;
										factory.utils.question_assessment_relations.existing_data[record_key]._rev = saved_relation._rev;	

									}
								}

								defer.resolve(saved_relation);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveNewQuestionAssessmentRelationRecord: function(relation_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					var orig_record = null;

					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						orig_record = angular.copy(relation_record);

						relation_record.rm_id = null;
						relation_record.rm_checklist_record_id = null;
						relation_record.rm_question_record_id = null;
						relation_record.rm_assessment_id = null;
						relation_record.rm_assessment_ref = null;
						relation_record.rm_answer_record_id = null;
						relation_record.rm_activity_id = null;
						relation_record.rm_asset_id = null;
						relation_record.rm_question_id = null;
						relation_record.rm_question_ref = null;
						relation_record.question_ref = null;

						// CLEAR SYNC VALUES
						relation_record.date_record_synced = null;
						relation_record.date_content_synced = null;
						relation_record.date_record_imported = null;
						relation_record.date_content_imported = null;
						relation_record.record_modified = 'Yes';

					} else {
						// SET RM OBJECT
						var rm_record = angular.copy(relation_record);
						relation_record.rm_record = rm_record;

						orig_record = angular.copy(relation_record);
					}

					riskmachDatabasesFactory.databases.collection.ra_question_relations.post(relation_record, options).then(function(saved_record) {
						// REAPPLY RM VALUES
						relation_record = angular.copy(orig_record);

						relation_record._id = saved_record.id;
						relation_record._rev = saved_record.rev;

						console.log("SAVED QUESTION ASSESSMENT RELATION RECORD");

						defer.resolve(relation_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateQuestionAssessmentRelationRecord: function(relation_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.ra_question_relations;

					var options = {
						force: true
					};

					// IF THE APP RECORD HAS NOT BEEN MODIFIED
					if( existing_record.record_modified == 'No' ) {
						// SET RM RECORD OBJECT
						var rm_record = angular.copy(relation_record);
						relation_record.rm_record = rm_record;

						// SET ID/REV ON RM RECORD
						relation_record._id = existing_record._id;
						relation_record._rev = existing_record._rev;

						db.post(relation_record, options).then(function(saved_record) {
							relation_record._id = saved_record.id;
							relation_record._rev = saved_record.rev;

							console.log("QUESTION ASSESSMENT RELATION RECORD UPDATED ENTIRELY");

							defer.resolve(relation_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = angular.copy(doc);

						// CLEAN UP FETCHED DOC

						// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
						if( relation_record.date_modified > existing_record.date_modified ) {
							existing_record.rm_record_modified = 'Yes';
						};

						// CLEAR OLD RM RECORD
						existing_record.rm_record = null;

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(relation_record);
						existing_record.rm_record = rm_record;

						db.post(existing_record, options).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							console.log("QUESTION ASSESSMENT RELATION RM RECORD UPDATED");

							defer.resolve(existing_record);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingRmQuestionAssessmentRelations: function(risk_keys) {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.question_assessment_relations.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.ra_question_relations;

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
								factory.utils.question_assessment_relations.filterExistingRmQuestionAssessmentRelations(result.rows, risk_keys);

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
			assessment_control_relations: {
				saveAssessmentControlRelationRecord: function(relation_record) {
					var defer = $q.defer();

					factory.dbUtils.assessment_control_relations.doSaveAssessmentControlRelationRecord(relation_record).then(function(saved_relation) {

						defer.resolve(saved_relation);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveAssessmentControlRelationRecord: function(relation_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					relation_record = factory.utils.formatRmRecordToModel('assessment_control_relation', relation_record);

					// SET VALUES FOR SYNC
					relation_record = factory.utils.setSyncValues(relation_record);

					// FORMAT ANY ANOMALIES
					relation_record = factory.utils.assessment_control_relations.formatAssessmentControlRelationRecord(relation_record);

					factory.dbFetch.assessment_control_relations.rmAssessmentControlRelation(relation_record.assessment_id, relation_record.control_item_id).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.assessment_control_relations.saveNewAssessmentControlRelationRecord(relation_record).then(function(saved_relation) {
								defer.resolve(saved_relation);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.assessment_control_relations.updateAssessmentControlRelationRecord(relation_record, existing_record).then(function(saved_relation) {
								defer.resolve(saved_relation);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveNewAssessmentControlRelationRecord: function(relation_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					var orig_record = null;

					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						orig_record = angular.copy(relation_record);

						relation_record.rm_id = null;
						relation_record.rm_control_item_id = null;
						relation_record.rm_control_item_ref = null;
						relation_record.rm_assessment_id = null;
						relation_record.rm_assessment_ref = null;
						relation_record.rm_control_id = null;
						relation_record.rm_activity_id = null;
						relation_record.rm_asset_id = null;
						relation_record.record_modified = 'Yes';
					} else {
						// SET RM OBJECT
						var rm_record = angular.copy(relation_record);
						relation_record.rm_record = rm_record;

						orig_record = angular.copy(relation_record);
					}

					riskmachDatabasesFactory.databases.collection.ra_control_item_relations.post(relation_record, options).then(function(saved_record) {
						// REAPPLY RM VALUES
						relation_record = angular.copy(orig_record);

						relation_record._id = saved_record.id;
						relation_record._rev = saved_record.rev;

						console.log("SAVED ASSESSMENT CONTROL RELATION RECORD");

						defer.resolve(relation_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateAssessmentControlRelationRecord: function(relation_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.ra_control_item_relations;

					var options = {
						force: true
					};

					// IF THE APP RECORD HAS NOT BEEN MODIFIED
					if( existing_record.record_modified == 'No' ) {
						// SET RM RECORD OBJECT
						var rm_record = angular.copy(relation_record);
						relation_record.rm_record = rm_record;

						// SET ID/REV ON RM RECORD
						relation_record._id = existing_record._id;
						relation_record._rev = existing_record._rev;

						db.post(relation_record, options).then(function(saved_record) {
							relation_record._id = saved_record.id;
							relation_record._rev = saved_record.rev;

							console.log("ASSESSMENT CONTROL ITEM RELATION RECORD UPDATED ENTIRELY");

							defer.resolve(relation_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
					if( relation_record.date_modified > existing_record.date_modified ) {
						existing_record.rm_record_modified = 'Yes';
					};

					// CLEAR OLD RM RECORD
					existing_record.rm_record = null;

					// SET RM RECORD OBJECT
					var rm_record = angular.copy(relation_record);
					existing_record.rm_record = rm_record;

					db.post(existing_record, options).then(function(saved_record) {
						existing_record._id = saved_record.id;
						existing_record._rev = saved_record.rev;

						console.log("ASSESSMENT CONTROL ITEM RELATION RM RECORD UPDATED");

						defer.resolve(existing_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			hazard_control_relations: {
				saveHazardControlRelation: function(relation_record) {
					var defer = $q.defer();

					factory.dbUtils.hazard_control_relations.doHazardControlRelation(relation_record).then(function(saved_relation) {

						relation_record._id = saved_relation.id;
						relation_record._rev = saved_relation.rev;

						defer.resolve(relation_record);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doHazardControlRelation: function(relation_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					relation_record = factory.utils.formatRmRecordToModel('hazard_control_relation', relation_record);

					// SET VALUES FOR SYNC
					relation_record = factory.utils.setSyncValues(relation_record);

					// FORMAT ANY ANOMALIES
					relation_record = factory.utils.hazard_control_relations.formatHazardControlRelation(relation_record);

					factory.dbFetch.hazard_control_relations.rmHazardControlRelation(relation_record.rm_hazard_ref, relation_record.rm_control_item_ref).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.hazard_control_relations.saveNewRelationRecord(relation_record).then(function(saved_relation) {
								defer.resolve(saved_relation);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.hazard_control_relations.updateRelationRecord(relation_record, existing_record).then(function(saved_relation) {
								
								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.hazard_control_relations.existing_data ) {

									var key = "" + saved_relation.rm_hazard_ref + "_" + saved_relation.rm_control_ref + "";

									if( angular.isDefined(factory.utils.hazard_control_relations.existing_data[key]) && factory.utils.hazard_control_relations.existing_data[key] ) {
											
										factory.utils.hazard_control_relations.existing_data[key]._id = saved_relation._id;
										factory.utils.hazard_control_relations.existing_data[key]._rev = saved_relation._rev;
									}

								}

								defer.resolve(saved_relation);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				saveNewRelationRecord: function(relation_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					var orig_record = null;

					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						orig_record = angular.copy(relation_record);

						relation_record.rm_id = null;
						relation_record.rm_hazard_id = null;
						relation_record.rm_hazard_ref = null;
						relation_record.rm_control_item_id = null;
						relation_record.rm_control_item_ref = null;
						relation_record.rm_assessment_id = null;
						relation_record.rm_activity_id = null;
						relation_record.rm_asset_id = null;
						relation_record.record_modified = 'Yes';
					} else {
						// SET RM OBJECT
						var rm_record = angular.copy(relation_record);
						relation_record.rm_record = rm_record;

						orig_record = angular.copy(relation_record);
					}

					riskmachDatabasesFactory.databases.collection.hazard_control_relations.post(relation_record, options).then(function(saved_record) {
						// REAPPLY RM VALUES
						relation_record = angular.copy(orig_record);

						relation_record._id = saved_record.id;
						relation_record._rev = saved_record.rev;

						console.log("SAVED HAZARD CONTROL RELATION");

						defer.resolve(relation_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateRelationRecord: function(relation_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.hazard_control_relations;

					var options = {
						force: true
					};

					// IF THE APP RECORD HAS NOT BEEN MODIFIED
					if( existing_record.record_modified == 'No' ) {
						// SET RM RECORD OBJECT
						var rm_record = angular.copy(relation_record);
						relation_record.rm_record = rm_record;

						// SET ID/REV ON RM RECORD
						relation_record._id = existing_record._id;
						relation_record._rev = existing_record._rev;

						db.post(relation_record, options).then(function(saved_record) {
							relation_record._id = saved_record.id;
							relation_record._rev = saved_record.rev;

							console.log("HAZARD CONTROL RELATION UPDATED ENTIRELY");

							defer.resolve(hazard_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = angular.copy(doc);

						// CLEAN UP FETCHED DOC
						doc = null;

						// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
						if( relation_record.date_modified > existing_record.date_modified ) {
							existing_record.rm_record_modified = 'Yes';
						};

						// CLEAR OLD RM RECORD
						existing_record.rm_record = null;

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(relation_record);
						existing_record.rm_record = rm_record;

						db.post(existing_record, options).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							console.log("HAZARD CONTROL RELATION RM RECORD UPDATED");

							defer.resolve(existing_record);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				existingRmHazardControlRelations: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.hazard_control_relations.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.hazard_control_relations;

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
								factory.utils.hazard_control_relations.filterExistingRmHazardControlRelations(result.rows);

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
			media_records: {
				saveMediaRecord: function(media_record) {
					var defer = $q.defer();

					factory.dbUtils.media_records.doSaveMediaRecord(media_record).then(function(saved_media) {

						// rm_profile_image_media_id
						// UPDATE RECORDS PROFILE IMAGE ID

						defer.resolve(saved_media);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveMediaRecord: function(media_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					media_record = factory.utils.formatRmRecordToModel('media_record', media_record);

					// SET VALUES FOR SYNC
					media_record = factory.utils.setSyncValues(media_record);

					// FORMAT ANY ANOMALIES
					media_record = factory.utils.media_records.formatMediaRecord(media_record);

					factory.dbFetch.media_records.rmMediaRecord(media_record.rm_ref, media_record.record_id).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.media_records.saveNewMediaRecord(media_record).then(function(saved_media) {
								defer.resolve(saved_media);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.media_records.updateMediaRecord(media_record, existing_record).then(function(saved_media) {
								
								// IF EXISTING DATA ALREADY FETCHED, INTERROGATE EXISTING DATA
								if( factory.utils.media_records.existing_data ) {

									if( angular.isDefined(factory.utils.media_records.existing_data[saved_media.rm_ref]) && factory.utils.media_records.existing_data[saved_media.rm_ref] ) {
										
										factory.utils.media_records.existing_data[saved_media.rm_ref]._id = saved_media._id;
										factory.utils.media_records.existing_data[saved_media.rm_ref]._rev = saved_media._rev;

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
				saveNewMediaRecord: function(media_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					if( media_record.hasOwnProperty('is_uaudit') && media_record.is_uaudit == 'Yes' ) {
						factory.utils.media_records.formatNewUAuditMediaRecord(media_record);
					}

					// SET RM ID FOR IMPORTING, FETCHES EXISTING CLOUD IMAGE FILE
					media_record.file_download_rm_id = media_record.rm_id;

					var orig_record = null;

					if( factory.download_setup.active.hasOwnProperty('download_type') && factory.download_setup.active.download_type == 'New' ) {
						orig_record = angular.copy(media_record);

						// SET NEW UUID IF PRESENT
						if( media_record.hasOwnProperty('id') && media_record.id ) {
							media_record.id = rmUtilsFactory.utils.createUUID();
						}

						// media_record.downloaded_rm_values = {
						// 	rm_id: media_record.rm_id,
						// 	rm_ref: media_record.rm_ref,
						// 	rm_revision_number: media_record.rm_revision_number,
						// 	rm_record_item_id: media_record.rm_record_item_id,
						// 	rm_record_item_ref: media_record.rm_record_item_ref,
						// 	rm_video_id: media_record.rm_video_id,
						// 	rm_video_ref: media_record.rm_video_ref,
						// 	rm_activity_id: media_record.rm_activity_id
						// }

						media_record.rm_id = null;
						media_record.rm_ref = null;
						media_record.rm_revision_number = null;
						media_record.rm_record_item_id = null;
						media_record.rm_record_item_ref = null;
						media_record.rm_video_id = null;
						media_record.rm_video_ref = null;
						media_record.rm_activity_id = null;

						// RESET SYNC VALUES
						media_record.date_record_synced = null;
						media_record.date_content_synced = null;
						media_record.date_record_imported = null;
						media_record.date_content_imported = null;
						media_record.record_modified = 'Yes';

						media_record.cloned_from_rm_id = orig_record.rm_id;
						media_record.file_download_rm_id = orig_record.rm_id;

						// SET CLONED FROM UUID IF SET
						if( orig_record.hasOwnProperty('id') && orig_record.id ) {
							media_record.cloned_from_uuid = orig_record.id;
						}

					} else {
						// SET RM OBJECT
						var rm_record = angular.copy(media_record);
						media_record.rm_record = rm_record;

						orig_record = angular.copy(media_record);
					}

					console.log("MEDIA RECORD FOR SAVE");
					console.log(JSON.stringify(media_record, null, 2));

					riskmachDatabasesFactory.databases.collection.media.post(media_record, options).then(function(saved_record) {
						
						// IF UAUDIT
						if( media_record.hasOwnProperty('is_uaudit') && media_record.is_uaudit == 'Yes' ) {
							media_record._id = saved_record.id;
							media_record._rev = saved_record.rev;
						} else {
							// REAPPLY RM VALUES
							media_record = angular.copy(orig_record);

							media_record._id = saved_record.id;
							media_record._rev = saved_record.rev;
						}

						console.log("SAVED NEW MEDIA RECORD");

						defer.resolve(media_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateMediaRecord: function(media_record, existing_record) {
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
					if( existing_record.hasOwnProperty('rm_revision_number') && existing_record.rm_revision_number != null ) {

						if( existing_record.rm_revision_number != media_record.rm_revision_number ) {
							media_record.file_downloaded = null;
						}

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

						existing_record = angular.copy(doc);

						// CLEAN UP FETCHED DOC
						doc = null;

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
				existingRmMediaRecords: function(parent_record_keys, record_type) {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.media_records.existing_data = {};

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
								factory.utils.media_records.filterExistingRmMediaRecords(result.rows, parent_record_keys, record_type);

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
				existingRmUAuditMedia: function(checklist_keys) {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					console.log("CHECKLIST KEYS FOR EXISTING UAUDIT MEDIA");
					console.log(JSON.stringify(checklist_keys, null, 2));

					// PREPARE EXISTING DATA
					factory.utils.media_records.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.media;

					fetchNextPage(fetch_defer).then(function() {

						console.log("EXISTING UAUDIT MEDIA");
						console.log( JSON.stringify(factory.utils.media_records.existing_data, null, 2) );

						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) 
					{
						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								factory.utils.media_records.filterExistingRmUAuditMedia(result.rows, checklist_keys);

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
				existingUAuditAnswerSetupMedia: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.media;

					var options = {
						limit: 400, 
						include_docs: true
					}

					var media = {};

					var page_num = 1;

					fetchNextPage(fetch_defer).then(function() {

						console.log("FETCHED EXISTING ANSWER SETUP MEDIA");

						defer.resolve(media);

					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) {

						db.allDocs(options).then(function(result) {

							console.log("GOT PAGE: " + page_num);
							console.log(result);

							page_num++;

							if( result && result.rows.length > 0 ) {

								var i = 0;
								var len = result.rows.length;
								while(i < len) {
									var errors = 0;

									if( !result.rows[i].doc.hasOwnProperty('table') || result.rows[i].doc.table != 'checklist_question' ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('company_id') || result.rows[i].doc.company_id != authFactory.cloudCompanyId() ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
										errors++;
									}

									if( errors == 0 ) {
										var record = {
											_id: result.rows[i].doc._id,
											_rev: result.rows[i].doc._rev,
											rm_id: result.rows[i].doc.rm_id
										}

										media[ record.rm_id ] = record;
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
							console.log(error);
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				superseededMediaRecords: function(parent_record_keys, record_type) {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE SUPERSEEDED MEDIA COLLECTION
					var superseeded_media = [];

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.media;

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve(superseeded_media);
					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) 
					{
						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) 
							{
								factory.utils.media_records.filterSuperseededMediaRecords(result.rows, parent_record_keys, record_type, superseeded_media);

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
				findUAuditAnswerSetupMediaRecord: function(media_record, existing_media) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.media;

					if( !media_record.hasOwnProperty('_id') || !media_record._id ) {

						// ATTEMPT FIND FROM DB BY RMID
						factory.dbUtils.media_records.findRmUAuditAnswerSetupMediaRecord(media_record.rm_id, existing_media).then(function(doc) {

							if( doc ) {
								defer.resolve(doc);
							} else {
								defer.resolve(media_record);
							}

						}, function(error) {
							defer.reject(error);
						});

					} else {

						// ATTEMPT FETCH FROM DB
						db.get(media_record._id).then(function(doc) {

							console.log("FETCHED UAUDIT ANSWER SETUP MEDIA");
							console.log(doc);

							// RESOLVE FOUND DB RECORD
							defer.resolve(doc);
						}).catch(function(error) {

							console.log("ATTEMPT FIND RM ANSWER SETUP MEDIA RECORD");

							// ATTEMPT FIND FROM DB BY RMID
							factory.dbUtils.media_records.findRmUAuditAnswerSetupMediaRecord(media_record.rm_id, existing_media).then(function(doc) {

								if( doc ) {
									defer.resolve(doc);
								} else {
									defer.resolve(media_record);
								}

							}, function(error) {
								defer.reject(error);
							});

						});

					}

					return defer.promise;
				},
				findRmUAuditAnswerSetupMediaRecord: function(rm_id, existing_media) {
					var defer = $q.defer();

					console.log(existing_media);

					var db = riskmachDatabasesFactory.databases.collection.media;

					if( existing_media.hasOwnProperty(rm_id) && existing_media[rm_id].hasOwnProperty('_id') ) {

						db.get(existing_media[rm_id]._id).then(function(doc) {

							defer.resolve(doc);

						}).catch(function(error) {
							defer.reject(error);
						});

					} else {
						defer.resolve(null);
					}

					return defer.promise;
				}
			},
			record_assets: {
				saveRecordAsset: function(record_asset) {
					var defer = $q.defer();

					factory.dbFetch.snapshot_assets.fetchRmSnapshotAssetRecord(record_asset.rm_id).then(function(existing_record) {

						if( existing_record == null ) {

							// ADD MODEL KEYS AND FORMAT
							record_asset = factory.utils.formatRmRecordToModel('snapshot_asset', record_asset);

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

					riskmachDatabasesFactory.databases.collection.assets.post(record_asset, options).then(function(saved_record) {
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

					var db = riskmachDatabasesFactory.databases.collection.assets;

					var options = {
						force: true
					};

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

							console.log("RECORD ASSET UPDATED ENTIRELY");

							defer.resolve(existing_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = angular.copy(doc);

						// CLEAN UP FETCHED DOC
						doc = null;

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
						defer.promise;
					});

					return defer.promise;
				},
				existingRmRecordAssets: function(record_type) {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.record_assets.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.assets;

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
								factory.utils.record_assets.filterExistingRmRecordAssets(result.rows, record_type);

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
			qc_check_records: {
				saveQcCheckRecord: function(check_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					check_record = factory.utils.formatRmRecordToModel('qc_check_record', check_record);

					// SET VALUES FOR SYNC
					check_record = factory.utils.setSyncValues(check_record);

					// SET QC CHECK RECORD TO SYNCED, AS THESE ARE ONLY IMPORTED
					check_record.synced = true;

					// FORMAT ANY ANOMALIES
					check_record = factory.utils.qc_check_records.formatQcCheckRecord(check_record);

					factory.dbFetch.qc_check_records.rmQcCheckRecord(check_record.ID).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.qc_check_records.saveNewQcCheckRecord(check_record).then(function(saved_record) {
								defer.resolve(saved_record);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.qc_check_records.updateQcCheckRecord(check_record, existing_record).then(function(saved_record) {
								
								// IF EXISTING DATA ALREADY FETCHED, UPDATE REV
								if( factory.utils.qc_check_records.existing_data ) {

									if( angular.isDefined(factory.utils.qc_check_records.existing_data[saved_record.ID]) && factory.utils.qc_check_records.existing_data[saved_record.ID] ) {
											
										factory.utils.qc_check_records.existing_data[saved_record.ID]._id = saved_record._id;
										factory.utils.qc_check_records.existing_data[saved_record.ID]._rev = saved_record._rev;
									}

								}

								defer.resolve(saved_record);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveNewQcCheckRecord: function(check_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.qc_check_records;


					var rm_record = angular.copy(check_record);

					if( rm_record.hasOwnProperty('rm_record') ) {
						delete rm_record.rm_record;
					}

					check_record.rm_record = rm_record;

					db.post(check_record, {force: true}).then(function(result) {

						check_record._id = result.id;
						check_record._rev = result.rev;

						defer.resolve(check_record);

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateQcCheckRecord: function(check_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.qc_check_records;

					var options = {
						force: true
					};

					// IF THE APP RECORD HAS NOT BEEN MODIFIED
					if( existing_record.record_modified == 'No' ) {
						// SET RM RECORD OBJECT
						var rm_record = angular.copy(check_record);

						if( rm_record.hasOwnProperty('rm_record') ) {
							delete rm_record.rm_record;
						}

						check_record.rm_record = rm_record;

						// SET ID/REV ON RM RECORD
						check_record._id = existing_record._id;
						check_record._rev = existing_record._rev;

						db.put(check_record).then(function(saved_record) {
							check_record._id = saved_record.id;
							check_record._rev = saved_record.rev;

							console.log("QC CHECK RECORD UPDATED ENTIRELY");

							defer.resolve(check_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

					db.get(existing_record._id).then(function(doc) {

						existing_record = angular.copy(doc);

						// CLEAN UP FETCHED DOC
						doc = null;

						// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
						// if( asset_record.date_modified > existing_record.date_modified ) {
						// 	existing_record.rm_record_modified = 'Yes';
						// };

						// CLEAR OLD RM RECORD
						existing_record.rm_record = null;

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(check_record);

						if( rm_record.hasOwnProperty('rm_record') ) {
							delete rm_record.rm_record;
						}

						existing_record.rm_record = rm_record;

						db.put(existing_record).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							console.log("SNAPSHOT QR CHECK RM RECORD UPDATED");

							defer.resolve(existing_record);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingRmQcCheckRecords: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					// PREPARE EXISTING DATA
					factory.utils.qc_check_records.existing_data = {};

					var options = {
						limit: 100,
						include_docs: true
					}

					var db = riskmachDatabasesFactory.databases.collection.qc_check_records;

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
								factory.utils.qc_check_records.filterExistingRmQcCheckRecords(result.rows);

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
			project_contributors: {
				indexProjectContributors: function(rasic_data) {
					var defer = $q.defer();

					if( !factory.download_setup.active.project_id ) {
						defer.resolve();
						return defer.promise;
					}

					var db = riskmachDatabasesFactory.databases.collection.projects;
					var project_id = factory.download_setup.active.project_id;

					db.get(project_id).then(function(project_doc) {

						project_doc.contributors = rasic_data;

						db.put(project_doc).then(function(result) {

							project_doc._id = result.id;
							project_doc._rev = result.rev;

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
			checkProjectUninstalledChecklists: function(stage, record_id_keys) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var max_index = Object.keys(record_id_keys).length - 1;

				// IF NO RECORDS 	
				if( max_index == -1 ) {
					defer.resolve();
					return defer.promise;
				}

				var next_index = 0;

				checkProjectUninstalledChecklists(save_defer).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function checkProjectUninstalledChecklists(defer) {

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
						defer.reject("Unable to find the next record to check for uninstalled checklists");
						return defer.promise;
					}

					// DO CHECK FOR UNINSTALLED CHECKLISTS
					factory.dbUtils.doCheckProjectUninstalledChecklists(stage, next_record).then(function() {

						next_index++;

						// UPDATED ALL RECORDS
						if( next_index > max_index ) {
							defer.resolve();
							return defer.promise;
						}

						// CHECK NEXT RECORD FOR UNINSTALLED CHECKLISTS
						checkProjectUninstalledChecklists(defer);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			doCheckProjectUninstalledChecklists: function(stage, record) {
				var defer = $q.defer();

				if( !record.hasOwnProperty('db_id') || !record.db_id ) {
					defer.resolve();
					return defer.promise;
				}

				var projects_db = riskmachDatabasesFactory.databases.collection.projects;
				var checklists_db = riskmachDatabasesFactory.databases.collection.checklist_instances;

				// GET PROJECT CHECKLIST INSTANCES
				checklists_db.find({
					selector: {
						activity_id: record.db_id
					}
				}).then(function(results) {
					factory.dbUtils.checkBlueprintsInstalled(results.docs).then(function(uninstalled_checklists) {

						projects_db.get(record.db_id).then(function(project_doc) {

							project_doc.uninstalled_checklists = uninstalled_checklists;

							console.log("UNINSTALLED PROJECT CHECKLISTS");
							console.log(project_doc);

							projects_db.post(project_doc, {force: true}).then(function(db_result) {
								project_doc._id = db_result.id;
								project_doc._rev = db_result.rev;
								defer.resolve();
							}).catch(function(error) {
								defer.reject(error);
							});

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
			checkBlueprintsInstalled: function(checklist_instances) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				if( checklist_instances.length == 0 ) {
					defer.resolve('No');
					return defer.promise;
				}

				var active_instance = 0;

				var uninstalled_count = 0;

				checkInstanceHasInstalledBlueprint(save_defer, checklist_instances[active_instance]).then(function(uninstalled_checklists) {
					defer.resolve(uninstalled_checklists);

				}, function(error) {
					defer.reject(error);
				});

				function checkInstanceHasInstalledBlueprint(defer, checklist_instance) {
					var db = riskmachDatabasesFactory.databases.collection.blueprint_checklists;
					db.find({
						selector: {
							table: 'checklist_blueprint',
							company_id: authFactory.cloudCompanyId(),
							user_id: authFactory.cloudUserId(), 
							ChecklistID: checklist_instance.rm_checklist_blueprint_id
						}, 
						limit: 1
					}).then(function(results) {
						if(results.docs.length == 0) {
							uninstalled_count++;
						}

						if(results.docs.length > 0 && results.docs[0].installed != 'Yes') {
							uninstalled_count++;
						}

						active_instance++;

						if(active_instance > checklist_instances.length - 1) {
							var uninstalled_checklists = 'No';
							if(uninstalled_count > 0) {
								uninstalled_checklists = 'Yes';
							}

							defer.resolve(uninstalled_checklists);

							return defer.promise;
						}

						checkInstanceHasInstalledBlueprint(defer, checklist_instances[active_instance]);

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

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
			updateHazardsNumControls: function(stage, record_id_keys) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var max_index = Object.keys(record_id_keys).length - 1;

				// IF NO RECORDS 	
				if( max_index == -1 ) {
					defer.resolve();
					return defer.promise;
				}

				var next_index = 0;

				updateHazardsNumControls(save_defer).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function updateHazardsNumControls(defer) {

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

					// DO MARK UPDATE RECORDS CONTROL COUNT
					factory.dbUtils.calcHazardsNumControls(stage, next_record).then(function() {

						next_index++;

						// UPDATED ALL RECORDS NUM FILES
						if( next_index > max_index ) {
							defer.resolve();
							return defer.promise;
						}

						// UPDATE NEXT RECORDS NUM CONTROLS
						updateHazardsNumControls(defer);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			calcHazardsNumControls: function(stage, record) {
				var defer = $q.defer();

				if( !record.hasOwnProperty('db_id') || !record.db_id ) {
					defer.resolve();
					return defer.promise;
				}
 
				var hazards_db = riskmachDatabasesFactory.databases.collection.mr_hazards;
				var controls_db = riskmachDatabasesFactory.databases.collection.mr_controls;
				var relations_db = riskmachDatabasesFactory.databases.collection.hazard_control_relations;

				// GET HAZARD RECORD
				hazards_db.get(record.db_id).then(function(doc) {
					
					// GET HAZARDS CONTROL RELATIONS
					relations_db.find({
						selector: {hazard_id: record.db_id}
					}).then(function(relations_result) {
						var relations = relations_result.docs;

						// IF NO RELATIONS, NUM CONTROLS IS 0
						if( relations.length == 0 ) {
							doc.num_controls = 0;
							// SAVE HAZARD
							hazards_db.put(doc).then(function(result) {
								doc._id = result;
								doc._rev = result;

								defer.resolve(doc);
							}).catch(function(error) {
								console.log("ERROR UPDATING HAZARD WITH NO CONTROLS");
								defer.reject(error);
							});

							return defer.promise;
						}

						// GET ALL CONTROLS FOR INSPECTION
						controls_db.find({
							selector: {asset_id: doc.asset_id}
						}).then(function(controls_result) {
							var controls = controls_result.docs;

							doc.num_controls = factory.dbUtils.countHazardsControls(relations, controls);

							// SAVE HAZARD
							hazards_db.put(doc).then(function(result) {
								doc._id = result;
								doc._rev = result;

								defer.resolve(doc);
							}).catch(function(error) {
								console.log("ERROR UPDATING HAZARD WITH CONTROLS");
								defer.reject(error);
							});

						}).catch(function(error) {
							console.log("ERROR FETCHING CONTROLS");
							defer.reject(error);
						});

					}).catch(function(error) {
						console.log("ERROR FETCHING HAZARD-CONTROL RELATIONS");
						defer.reject(error);
					});
					
				}).catch(function(error) {
					console.log("ERROR FETCHING HAZARD RECORD");
					defer.reject(error);
				});

				return defer.promise;
			},
			countHazardsControls: function(relations, controls) {
				var linked_control_ids = [];
				var num_controls = 0;

				//FIND LINKED CONTROL IDS FROM RELATIONS
				angular.forEach(relations, function(rel_record, rel_index){

					if( parseInt(rel_record.status) == 1 )
					{
						if( linked_control_ids.indexOf(rel_record.control_item_id) === -1 )
						{
							linked_control_ids.push( rel_record.control_item_id );
						}
					}

				});

				//FOR THE LINKED CONTROLS COUNT THE LIVE CONTROLS
				angular.forEach(controls, function(control_record, control_index){

					if( linked_control_ids.indexOf(control_record._id) !== -1 && (control_record.status == 1 || control_record.status == 2 || control_record.status == 5 || control_record.status == 6 ) )
					{
						num_controls++;
					}

				});

				return num_controls;
			},
			updateControlsNumHazards: function(stage, record_id_keys) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var max_index = Object.keys(record_id_keys).length - 1;

				// IF NO RECORDS 	
				if( max_index == -1 ) {
					defer.resolve();
					return defer.promise;
				}

				var next_index = 0;

				updateControlsNumHazards(save_defer).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function updateControlsNumHazards(defer) {

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

					// DO MARK UPDATE RECORDS HAZARD COUNT
					factory.dbUtils.calcControlsNumHazards(stage, next_record).then(function() {

						next_index++;

						// UPDATED ALL RECORDS NUM FILES
						if( next_index > max_index ) {
							defer.resolve();
							return defer.promise;
						}

						// UPDATE NEXT RECORDS NUM HAZARDS
						updateControlsNumHazards(defer);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			calcControlsNumHazards: function(stage, record) {
				var defer = $q.defer();

				if( !record.hasOwnProperty('db_id') || !record.db_id ) {
					defer.resolve();
					return defer.promise;
				}

				var controls_db = riskmachDatabasesFactory.databases.collection.mr_controls;
				var hazards_db = riskmachDatabasesFactory.databases.collection.mr_hazards;
				var relations_db = riskmachDatabasesFactory.databases.collection.hazard_control_relations;

				// GET CONTROL RECORD
				controls_db.get(record.db_id).then(function(doc) {
					
					// GET CONTROLS HAZARD RELATIONS
					relations_db.find({
						selector: {control_item_id: record.db_id}
					}).then(function(relations_result) {
						var relations = relations_result.docs;

						// IF NO RELATIONS, NUM HAZARDS IS 0
						if( relations.length == 0 ) {
							doc.num_hazards = 0;
							// SAVE CONTROL
							controls_db.post(doc, {force: true}).then(function(result) {
								doc._id = result;
								doc._rev = result;

								defer.resolve(doc);
							}).catch(function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}

						// GET ALL HAZARDS FOR INSPECTION
						hazards_db.find({
							selector: {asset_id: doc.asset_id}
						}).then(function(hazards_result) {
							var hazards = hazards_result.docs;

							doc.num_hazards = factory.dbUtils.countControlsHazards(relations, hazards);

							// SAVE CONTROL
							controls_db.post(doc, {force: true}).then(function(result) {
								doc._id = result;
								doc._rev = result;

								defer.resolve(doc);
							}).catch(function(error) {
								defer.reject(error);
							});

						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});
					
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			countControlsHazards: function(relations, hazards) {
				var linked_hazard_ids = [];
				var num_hazards = 0;

				//FIND LINKED HAZARD IDS FROM RELATIONS
				angular.forEach(relations, function(rel_record, rel_index){

					if( parseInt(rel_record.status) == 1 )
					{
						if( linked_hazard_ids.indexOf(rel_record.hazard_id) === -1 )
						{
							linked_hazard_ids.push( rel_record.hazard_id );
						}
					}

				});

				//FOR THE LINKED CONTROLS COUNT THE ACTIVE (LIVE CONTROLS)
				angular.forEach(hazards, function(hazard_record, hazard_index){

					if( linked_hazard_ids.indexOf(hazard_record._id) !== -1 && (hazard_record.status == 1) )
					{
						num_hazards++;
					}

				});

				return num_hazards;
			},
			updateQuestionsNumRisksV1: function(stage, record_id_keys) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var max_index = Object.keys(record_id_keys).length - 1;

				// IF NO RECORDS 	
				if( max_index == -1 ) {
					defer.resolve();
					return defer.promise;
				}

				var next_index = 0;

				updateQuestionsNumRisks(save_defer).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function updateQuestionsNumRisks(defer) {

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
						defer.reject("Unable to find the next question to update num risks count");
						return defer.promise;
					}

					// DO MARK UPDATE RECORDS RISK COUNT
					factory.dbUtils.calcQuestionsNumRisksV1(stage, next_record).then(function() {

						next_index++;

						// UPDATED ALL RECORDS NUM FILES
						if( next_index > max_index ) {
							defer.resolve();
							return defer.promise;
						}

						// UPDATE NEXT RECORDS NUM RISKS
						updateQuestionsNumRisks(defer);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			updateQuestionsNumRisks: function(stage, record_id_keys) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				// var available_emails = ['e.jones@spierssafety.co.uk','a.thomas@spierssafety.co.uk','a.ginn@riskmach.co.uk','w.spiers@spierssafety.co.uk'];

				// if( authFactory.active_profile && authFactory.active_profile.hasOwnProperty('EmailAddress') ) {

				// 	if( available_emails.indexOf(authFactory.active_profile.EmailAddress) === -1 ) {
						
				// 		factory.dbUtils.updateQuestionsNumRisksV1(stage, record_id_keys).then(function() {
				// 			defer.resolve();
				// 		}, function(error) {
				// 			defer.reject(error);
				// 		});

				// 		return defer.promise;
				// 	}

				// }

				var max_index = Object.keys(record_id_keys).length - 1;

				// IF NO RECORDS 	
				if( max_index == -1 ) {
					defer.resolve();
					return defer.promise;
				}

				factory.fetchDataForQuestionNumRisks().then(function(data) {

					var next_index = 0;

					updateQuestionsNumRisks(save_defer).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function updateQuestionsNumRisks(defer) {

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
							defer.reject("Unable to find the next question to update num risks count");
							return defer.promise;
						}

						// DO MARK UPDATE RECORDS RISK COUNT
						factory.dbUtils.calcQuestionsNumRisks(stage, next_record, data).then(function() {

							next_index++;

							// UPDATED ALL RECORDS NUM FILES
							if( next_index > max_index ) {
								defer.resolve();
								return defer.promise;
							}

							// UPDATE NEXT RECORDS NUM RISKS
							updateQuestionsNumRisks(defer);

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
			calcQuestionsNumRisksV1: function(stage, record) {
				var defer = $q.defer();

				if( !record.hasOwnProperty('db_id') || !record.db_id ) {
					defer.resolve();
					return defer.promise;
				}

				var questions_db = riskmachDatabasesFactory.databases.collection.checklist_question_records;
				var checklists_db = riskmachDatabasesFactory.databases.collection.checklist_instances;
				var risks_db = riskmachDatabasesFactory.databases.collection.assessments;
				var relations_db = riskmachDatabasesFactory.databases.collection.ra_question_relations;

				// GET QUESTION RECORD
				questions_db.get(record.db_id).then(function(doc) {
					
					// GET QUESTIONS RISK RELATIONS
					relations_db.find({
						selector: {question_record_id: record.db_id}
					}).then(function(relations_result) {
						var relations = relations_result.docs;

						// IF NO RELATIONS, NUM RISKS IS 0
						if( relations.length == 0 ) {
							doc.num_risks = 0;
							// SAVE QUESTION
							questions_db.post(doc, {force: true}).then(function(result) {
								doc._id = result;
								doc._rev = result;

								defer.resolve(doc);
							}).catch(function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}

						// GET CHECKLIST RECORD TO ACCESS ASSET ID
						checklists_db.get(doc.checklist_record_id).then(function(checklist_doc) {

							// GET ALL RISKS FOR INSPECTION
							risks_db.find({
								selector: {asset_id: checklist_doc.asset_id}
							}).then(function(risks_result) {
								var risks = risks_result.docs;

								doc.num_risks = factory.dbUtils.countQuestionsRisksV1(relations, risks);

								// SAVE QUESTION
								questions_db.post(doc, {force: true}).then(function(result) {
									doc._id = result;
									doc._rev = result;

									defer.resolve(doc);
								}).catch(function(error) {
									defer.reject(error);
								});

							}).catch(function(error) {
								defer.reject(error);
							});

						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});
					
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			calcQuestionsNumRisks: function(stage, record, data) {
				var defer = $q.defer();

				console.log(data);

				if( !record.hasOwnProperty('db_id') || !record.db_id ) {
					defer.resolve();
					return defer.promise;
				}

				var questions_db = riskmachDatabasesFactory.databases.collection.checklist_question_records;

				// GET QUESTION RECORD
				questions_db.get(record.db_id).then(function(doc) {

					// IF NO RELATIONS, NUM RISKS IS 0
					if( data.ra_question_relations.length == 0 ) {
						console.log("NO RISKS FOR QUESTION");
						doc.num_risks = 0;
						// SAVE QUESTION
						questions_db.post(doc, {force: true}).then(function(result) {
							doc._id = result;
							doc._rev = result;

							defer.resolve(doc);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					var filtered_relations = [];
					var i = 0;

					while( i < data.ra_question_relations.length ) {
						if( data.ra_question_relations[i].question_record_id == doc._id ) {
							filtered_relations.push(data.ra_question_relations[i]);
						}

						i++;
					}

					doc.num_risks = factory.dbUtils.countQuestionsRisks(filtered_relations, data.risks);

					console.log("NUM RISKS: " + doc.num_risks);

					// SAVE QUESTION
					questions_db.put(doc).then(function(result) {
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
			countQuestionsRisksV1: function(relations, risks) {
				var num_risks = 0;
				var live_statuses = [4,6,7,9,10];
				var risk_live = false;

				//CALC NUM RISKS LINKED TO QUESTION
				angular.forEach(risks, function(ra_record, ra_index){

					risk_live = false;
					var risk_status = parseInt(ra_record.status);

					if( live_statuses.indexOf(risk_status) !== -1 )
					{
						risk_live = true;
					}

					//IF THERE IS AN ACTIVE QUESTION FIND RELATION
					angular.forEach(relations, function(rel_record, rel_index){

						if( risk_live && ra_record._id == rel_record.assessment_id && parseInt(rel_record.status) == 1 )
						{
							num_risks++;
						}

					});
					
				});

				return num_risks;
			},
			countQuestionsRisks: function(relations, risks) {
				var num_risks = 0;
				var live_statuses = [4,6,7,9,10];
				var risk_live = false;

				console.log("COUNT QUESTIONS RISKS");
				console.log(relations);
				console.log(risks);

				for(var key in risks ) {

					risk_live = false;
					var risk_status = parseInt(risks[key].status);

					if( live_statuses.indexOf(risk_status) !== -1 )
					{
						risk_live = true;
					}

					var i = 0;
					var len = relations.length;

					while( i < len ) {

						if( risk_live && risks[key]._id == relations[i].assessment_id && parseInt(relations[i].status) == 1 )
						{
							num_risks++;
						}

						i++;
					}
				}

				return num_risks;
			},
			updateRisksNumControls: function(stage, record_id_keys) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var max_index = Object.keys(record_id_keys).length - 1;

				// IF NO RECORDS 	
				if( max_index == -1 ) {
					defer.resolve();
					return defer.promise;
				}

				var next_index = 0;

				updateRisksNumControls(save_defer).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function updateRisksNumControls(defer) {

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
						defer.reject("Unable to find the next risk to update num controls count");
						return defer.promise;
					}

					// DO MARK UPDATE RECORDS CONTROLS COUNT
					factory.dbUtils.calcRisksNumControls(stage, next_record).then(function() {

						next_index++;

						// UPDATED ALL RECORDS NUM FILES
						if( next_index > max_index ) {
							defer.resolve();
							return defer.promise;
						}

						// UPDATE NEXT RECORDS NUM CONTROLS
						updateRisksNumControls(defer);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			calcRisksNumControls: function(stage, record) {
				var defer = $q.defer();

				if( !record.hasOwnProperty('db_id') || !record.db_id ) {
					defer.resolve();
					return defer.promise;
				}

				var risks_db = riskmachDatabasesFactory.databases.collection.assessments;
				var controls_db = riskmachDatabasesFactory.databases.collection.mr_controls;
				var relations_db = riskmachDatabasesFactory.databases.collection.ra_control_item_relations;

				// GET RISK RECORD
				risks_db.get(record.db_id).then(function(doc) {
					
					// GET RISK CONTROL RELATIONS
					relations_db.find({
						selector: {assessment_id: record.db_id}
					}).then(function(relations_result) {
						var relations = relations_result.docs;

						// IF NO RELATIONS, NUM CONTROLS IS 0
						if( relations.length == 0 ) {
							doc.num_controls = 0;
							// SAVE QUESTION
							risks_db.post(doc, {force: true}).then(function(result) {
								doc._id = result;
								doc._rev = result;

								defer.resolve(doc);
							}).catch(function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}

						// GET ALL CONTROLS FOR INSPECTION
						controls_db.find({
							selector: {asset_id: doc.asset_id}
						}).then(function(controls_result) {
							var controls = controls_result.docs;

							doc.num_controls = factory.dbUtils.countRisksControls(relations, controls);

							// SAVE RISK
							risks_db.post(doc, {force: true}).then(function(result) {
								doc._id = result;
								doc._rev = result;

								defer.resolve(doc);
							}).catch(function(error) {
								defer.reject(error);
							});

						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});
					
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			countRisksControls: function(relations, controls) {
				var num_controls = 0;
				var live_statuses = [1,2,5,6];

				angular.forEach(controls, function(item_record, item_index){
					var control_live = false;
					var status = parseInt( item_record.status );

			    	if( live_statuses.indexOf(status) !== -1 )
			    	{
			    		control_live = true;
			    	}

			    	angular.forEach(relations, function(rel_record, rel_index){

						if( control_live && item_record._id == rel_record.control_item_id && parseInt(rel_record.status) == 1 )
						{
							num_controls++;
						}

					});

			    });

			    return num_controls;
			},
			checkMediaItemOnDevice: function(stage, record_id_keys) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var max_index = Object.keys(record_id_keys).length - 1;

				// IF NO RECORDS 	
				if( max_index == -1 ) {
					defer.resolve();
					return defer.promise;
				}

				var next_index = 0;

				checkMediaItemOnDevice(save_defer).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function checkMediaItemOnDevice(defer) {

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
						defer.reject("Unable to find the next media record for item check");
						return defer.promise;
					}

					// DO CHECK MEDIA ITEM ON DEVICE
					factory.dbUtils.doCheckMediaItemOnDevice(stage, next_record).then(function() {

						next_index++;

						// CHECKED ALL MEDIA ITEMS ON DEVICE
						if( next_index > max_index ) {
							defer.resolve();
							return defer.promise;
						}

						// CHECK NEXT MEDIA ITEM ON DEVICE
						checkMediaItemOnDevice(defer);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			doCheckMediaItemOnDevice: function(stage, record) {
				var defer = $q.defer();

				var media_db = riskmachDatabasesFactory.databases.collection.media;
				var item_db = null;

				if( stage == 'assessment_media' ) {
					item_db = riskmachDatabasesFactory.databases.collection.assessments;
				}

				// GET MEDIA RECORD
				media_db.get(record.db_id).then(function(doc) {

					doc.item_not_found = null;
					
					// GET MEDIA ITEM
					item_db.find({
						selector: {rm_id: doc.rm_record_item_id},
						limit: 1
					}).then(function(items_result) {

						// IF NO ITEM, RECORD NOT FOUND
						if( items_result.docs.length == 0 ) {
							doc.item_not_found = 'Yes';
						}

						console.log("MEDIA ITEM NOT FOUND:");
						console.log(doc);

						// SAVE MEDIA RECORD
						media_db.post(doc, {force: true}).then(function(result) {
							doc._id = result;
							doc._rev = result;

							defer.resolve(doc);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});
					
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			attemptCompleteTaskIds: function(stage, incomplete_ids, record_id_keys) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				// console.log(incomplete_ids);
				// console.log(record_id_keys);
				console.log("UPDATE INCOMPLETE TASK IDS");

				if( !incomplete_ids || !incomplete_ids.length ) {
					defer.resolve();
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.tasks;

				attemptCompleteNextTask(save_defer, 0).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function attemptCompleteNextTask(defer, active_index) {

					if( active_index > incomplete_ids.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					console.log("TASK: " + incomplete_ids[active_index]);

					db.get(incomplete_ids[active_index]).then(function(task_record) {

						// IF LOCAL ID NOT SET, BUT RM ID AVAILABLE
						if( !task_record.parent_task_id && (task_record.rm_parent_task_id || task_record.orig_rm_parent_task_id) ) {
							// ATTEMPT SET LOCAL PARENT TASK ID
							if( task_record.rm_parent_task_id ) {

								if( record_id_keys.hasOwnProperty( parseInt(task_record.rm_parent_task_id) ) ) {

									if( record_id_keys[ parseInt(task_record.rm_parent_task_id) ].hasOwnProperty('db_id') ) {
										task_record.parent_task_id = record_id_keys[ parseInt(task_record.rm_parent_task_id) ]['db_id'];
									}
									
								}

							} else {

								if( record_id_keys.hasOwnProperty( parseInt(task_record.orig_rm_parent_task_id) ) ) {

									if( record_id_keys[ parseInt(task_record.orig_rm_parent_task_id) ].hasOwnProperty('db_id') ) {
										task_record.parent_task_id = record_id_keys[ parseInt(task_record.orig_rm_parent_task_id) ]['db_id'];
									}

								}

							}
						}

						// IF LOCAL ID NOT SET, BUT RM ID AVAILABLE
						if( !task_record.procedure_id && task_record.rm_procedure_id ) {
							// ATTEMPT SET LOCAL PARENT TASK ID
							if( record_id_keys.hasOwnProperty( parseInt(task_record.rm_procedure_id) ) ) {

								if( record_id_keys[ parseInt(task_record.rm_procedure_id) ].hasOwnProperty('db_id') ) {
									task_record.procedure_id = record_id_keys[ parseInt(task_record.rm_procedure_id) ]['db_id'];
								}

							}

						}

						db.put(task_record).then(function(result) {

							task_record._id = result.id;
							task_record._rev = result.rev;

							active_index++;

							attemptCompleteNextTask(defer, active_index);

						}).catch(function(error) {
							console.log("ERROR 2");
							defer.reject(error);
						});

					}).catch(function(error) {
						console.log("ERROR 1");
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			updateUAuditMediaJsonWithDbRecords: function(stage, record_id_keys, media_id_keys) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var max_index = Object.keys(record_id_keys).length - 1;

				// IF NO RECORDS 	
				if( max_index == -1 ) {
					defer.resolve();
					return defer.promise;
				}

				var next_index = 0;

				updateNextUAuditMedia(save_defer).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function updateNextUAuditMedia(defer) {

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
						defer.reject("Unable to find the next risk to update UAudit media");
						return defer.promise;
					}

					// DO UPDATE UAUDIT MEDIA
					factory.dbUtils.doUpdateUAuditMediaJsonWithDbRecords(stage, next_record, media_id_keys).then(function() {

						next_index++;

						// UPDATED ALL UAUDITS
						if( next_index > max_index ) {
							defer.resolve();
							return defer.promise;
						}

						// UPDATE UAUDITS MEDIA
						updateNextUAuditMedia(defer);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			doUpdateUAuditMediaJsonWithDbRecords: function(stage, record, media_id_keys) {
				var defer = $q.defer();

				if( !record.hasOwnProperty('db_id') || !record.db_id ) {
					defer.resolve();
					return defer.promise;
				}

				var checklist_db = riskmachDatabasesFactory.databases.collection.checklist_instances;
				var instance_json_db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;

				checklist_db.get(record.db_id).then(function(checklist_instance) {

					// IF NOT UAUDIT CHECKLIST, RESOLVE
					if( !checklist_instance.hasOwnProperty('is_uaudit') || checklist_instance.is_uaudit != 'Yes' ) {
						defer.resolve();
						return defer.promise;
					}

					// FIND UAUDIT CHECKLIST JSON
					instance_json_db.find({
						selector: {
							checklist_instance_id: checklist_instance._id
						}
					}).then(function(result) {

						// FILTER OUT RM COPY
						var filtered = [];
						var i = 0;
						var len = result.docs.length;
						while(i < len) {
							var errors = 0;

							if( result.docs[i].hasOwnProperty('rm_record_copy') && result.docs[i].rm_record_copy == 'Yes' ) {
								errors++;
							}  

							if( errors == 0 ) {
								filtered.push(result.docs[i]);
							}

							i++;
						}

						if( !filtered.length ) {
							defer.resolve();
							return defer.promise;
						}

						var instance_json_record = filtered[0];

						factory.dbUtils.formatUAuditJsonWithMediaDbRecords(instance_json_record, media_id_keys).then(function() {

							// SAVE UPDATED UAUDIT JSON
							instance_json_db.put(instance_json_record).then(function(instance_json_result) {

								instance_json_record._id = instance_json_result.id;
								instance_json_record._rev = instance_json_result.rev;

								defer.resolve();

							}).catch(function(error) {
								defer.reject(error);
							});

						}, function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			formatUAuditJsonWithMediaDbRecords: function(instance_json_record, media_id_keys) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();
				
				var max_index = Object.keys(media_id_keys).length - 1;

				// IF NO RECORDS 	
				if( max_index == -1 ) {
					defer.resolve();
					return defer.promise;
				}

				var data_parse = rmUtilsFactory.tryParseObject(instance_json_record.uaudit_instance_data);
				if( data_parse ) {
					instance_json_record.uaudit_instance_data = data_parse;
				}

				// CLEAN UP
				data_parse = null;

				// instance_json_record.uaudit_instance_data = JSON.parse(instance_json_record.uaudit_instance_data);

				var media_db = riskmachDatabasesFactory.databases.collection.media;
				var instance_json_db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;
				var next_index = 0;

				fetchNextUAuditMedia(save_defer).then(function() {

					// FORMAT UAUDIT COLLECTIONS
					factory.utils.checklist_instances_json.formatCollectionsForDb(instance_json_record.uaudit_instance_data);

					// STRINGIFY JSON FOR DB SAVE
					instance_json_record.uaudit_instance_data = JSON.stringify(instance_json_record.uaudit_instance_data);

					// SAVE UPDATED INSTANCE BACK
					instance_json_db.put(instance_json_record).then(function(result) {

						instance_json_record._id = result.id;
						instance_json_record._rev = result.rev;

						defer.resolve();

					}).catch(function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextUAuditMedia(defer) {

					var next_media_key = null;

					//FIND THE NEXT STAGING RECORD BASED ON INDEX
					var index_counter = -1;
					Object.keys(media_id_keys).forEach(function(current_key){
						index_counter++;

						if( index_counter == next_index ) {
							next_media_key = media_id_keys[current_key];
						}

					});

					if( !next_media_key ) {
						defer.reject("Unable to find the next risk to update UAudit media");
						return defer.promise;
					}

					if( !next_media_key.hasOwnProperty('db_id') || !next_media_key.db_id ) {
						defer.resolve();
						return defer.promise;
					}

					// FETCH MEDIA DOC
					media_db.get(next_media_key.db_id).then(function(media_doc) {

						// MANIPULATE JSON HERE
						factory.utils.media_records.updateMediaInUAuditJson(instance_json_record.uaudit_instance_data, media_doc);

						if( media_doc.hasOwnProperty('cloned_from_id') && media_doc.cloned_from_id ) {
							
							media_db.put(media_doc).then(function(result) {

								media_doc._id = result.id;
								media_doc._rev = result.id;

								next_index++;

								// FETCHED ALL MEDIA
								if( next_index > max_index ) {
									defer.resolve();
									return defer.promise;
								}

								// FETCH NEXT MEDIA RECORD
								fetchNextUAuditMedia(defer);

							}).catch(function(error) {
								defer.reject(error);
							});

						} else {

							next_index++;

							// FETCHED ALL MEDIA
							if( next_index > max_index ) {
								defer.resolve();
								return defer.promise;
							}

							// FETCH NEXT MEDIA RECORD
							fetchNextUAuditMedia(defer);

						}

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			updateRiskProfileImgs: function(stage, record_id_keys) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var max_index = Object.keys(record_id_keys).length - 1;

				// IF NO RECORDS 	
				if( max_index == -1 ) {
					defer.resolve();
					return defer.promise;
				}

				var next_index = 0;

				updateRiskProfileImgData(save_defer).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function updateRiskProfileImgData(defer) {

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
						defer.reject("Unable to find the next risk record for profile image update");
						return defer.promise;
					}

					// DO CHECK MEDIA ITEM ON DEVICE
					factory.dbUtils.updateRiskProfileImgData(stage, next_record).then(function() {

						next_index++;

						// UPDATE ALL RISK PROFILE IMGS
						if( next_index > max_index ) {
							defer.resolve();
							return defer.promise;
						}

						// UDPATE NEXT RISK PROFILE IMG
						updateRiskProfileImgData(defer);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			updateRiskProfileImgData: function(stage, record) {
				var defer = $q.defer();

				console.log("UPDATE RISK PROFILE IMG DATA");
				console.log(record);

				if( !record.hasOwnProperty('local_profile_img_id') || !record.local_profile_img_id ) {
					defer.resolve();
					return defer.promise;
				}

				var risks_db = riskmachDatabasesFactory.databases.collection.assessments;
				var media_db = riskmachDatabasesFactory.databases.collection.media;

				// GET RISK RECORD
				risks_db.get(record.db_id).then(function(risk_doc) {

					// GET PROFILE IMG MEDIA RECORD
					media_db.get(record.local_profile_img_id).then(function(media_doc) {

						risk_doc.profile_img_id = media_doc._id;
						risk_doc.profile_img_attachment_key = media_doc.attachment_key;
						risk_doc.profile_img_download_required = false;

						if( !media_doc.file_downloaded ) {
							risk_doc.profile_img_download_required = true;
						}

						// SAVE UPDATED RISK
						risks_db.put(risk_doc).then(function(result) {

							risk_doc._id = result.id;
							risk_doc._rev = result.rev;

							defer.resolve();

						}).catch(function(error) {
							console.log("ERROR SAVING RISK RECORD: UPDATE RISK PROFILE IMG");
							defer.reject(error);
						});

					}).catch(function(error) {
						console.log("ERROR FETCHING MEDIA RECORD: UPDATE RISK PROFILE IMG");
						defer.reject(error);
					});

				}).catch(function(error) {
					console.log("ERROR FETCHING RISK RECORD: UPDATE RISK PROFILE IMG");
					defer.reject(error);
				});

				return defer.promise;
			},
			updateSuperseededImages: function(stage, record_id_keys) {
				var defer = $q.defer();

				console.log("BEGIN UPDATING SUPERSEEDED IMAGES");

				var fetch_stages = {
					'assessments': {
						record_type: 'assessment'
					}
				};

				if( !fetch_stages.hasOwnProperty(stage) ) {
					defer.reject("Developer has not added the fetch stage");
					return defer.promise;
				}

				var record_type = fetch_stages[stage].record_type;

				// FETCH EXISTING MEDIA FOR STAGE
				// FILTER EXISTING MEDIA THAT HAS NOW BEEN SUPERSEEDED
				factory.dbUtils.media_records.superseededMediaRecords(record_id_keys, record_type).then(function(media_records) {

					// FOR EACH OF THESE, MARK AS SUPERSEEDED
					factory.dbUtils.markMediaRecordsSuperseeded(media_records).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			markMediaRecordsSuperseeded: function(media_records) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				if( !media_records.length ) {
					console.log("NO SUPERSEEDED MEDIA");
					defer.resolve();
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.media;

				markNextMediaSuperseeded(save_defer, 0).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function markNextMediaSuperseeded(defer, active_index) {

					if(	active_index > media_records.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					db.get(media_records[active_index]._id).then(function(media_doc) {

						media_doc.superseeded = 'Yes';

						db.put(media_doc).then(function(result) {

							active_index++;

							markNextMediaSuperseeded(defer, active_index);

						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			updateLocalSuggestedRiskIds: function(stage, record_ref_keys, record_id_keys) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var max_index = Object.keys(record_ref_keys).length - 1;

				// IF NO RECORDS 	
				if( max_index == -1 ) {
					defer.resolve();
					return defer.promise;
				}

				// var next_index = 0;

				updateNextRisk(save_defer, 0).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function updateNextRisk(defer, next_index) {

					// UPDATE ALL RISK PROFILE IMGS
					if( next_index > max_index ) {
						defer.resolve();
						return defer.promise;
					}

					var next_record = null;

					//FIND THE NEXT STAGING RECORD BASED ON INDEX
					var index_counter = -1;
					Object.keys(record_ref_keys).forEach(function(current_key){
						index_counter++;

						if( index_counter == next_index ) {
							next_record = record_ref_keys[current_key];
						}

					});

					if( !next_record ) {
						defer.reject("Unable to find the next risk record for suggested risk ID update");
						return defer.promise;
					}

					if( !next_record.hasOwnProperty('rm_suggested_risk_id') || !next_record.rm_suggested_risk_id ) {

						next_index++;

						// UDPATE NEXT RISK PROFILE IMG
						updateNextRisk(defer, next_index);

					} else {

						factory.dbUtils.updateRiskWithRmSuggestedId(next_record, record_id_keys).then(function() {

							next_index++;

							// UDPATE NEXT RISK PROFILE IMG
							updateNextRisk(defer, next_index);

						}, function(error) {
							defer.reject(error);
						});

					}

					return defer.promise;
				}

				return defer.promise;
			},
			updateRiskWithRmSuggestedId: function(record, record_id_keys) {
				var defer = $q.defer();

				// COULDN'T FIND SUGGESTED RISK
				if( !record_id_keys.hasOwnProperty(record.rm_suggested_risk_id) ) {
					defer.resolve();
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.assessments;

				var local_suggested_risk_id = record_id_keys[ record.rm_suggested_risk_id ].db_id;

				db.get(record.db_id).then(function(doc) {

					doc.suggested_risk_id = local_suggested_risk_id;

					db.put(doc).then(function(result) {
						defer.resolve();
					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			setAssetsActiveChecklist: function(stage, record_id_keys) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var max_index = Object.keys(record_id_keys).length - 1;

				// IF NO RECORDS 	
				if( max_index == -1 ) {
					defer.resolve();
					return defer.promise;
				}

				updateNextAsset(save_defer, 0).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function updateNextAsset(defer, next_index) {

					// UPDATED ALL ASSETS ACTIVE CHECKLIST
					if( next_index > max_index ) {
						defer.resolve();
						return defer.promise;
					}

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
						defer.reject("Unable to find the next asset record for active checklist update");
						return defer.promise;
					}

					if( !next_record.hasOwnProperty('active_checklist_id') || !next_record.active_checklist_id ) {

						next_index++;

						// UDPATE NEXT ASSET ACTIVE CHECKLIST
						updateNextAsset(defer, next_index);

					} else {

						factory.dbUtils.updateAssetWithActiveChecklist(next_record).then(function() {

							next_index++;

							// UDPATE NEXT ASSET ACTIVE CHECKLIST
							updateNextAsset(defer, next_index);

						}, function(error) {
							defer.reject(error);
						});

					}

					return defer.promise;
				}

				return defer.promise;
			}, 
			updateAssetWithActiveChecklist: function(record) {
				var defer = $q.defer();

				if( !record.hasOwnProperty('db_id') || !record.db_id ) {
					defer.resolve();
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.assets;

				db.get(record.db_id).then(function(asset_doc) {

					asset_doc.active_checklist_id = record.active_checklist_id;

					db.put(asset_doc).then(function(result) {

						defer.resolve();

					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			updateCloudDeletedRisks: function(stage, record_id_keys) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var cloud_deleted_risks = [];

				factory.dbUtils.assessments.existingRmRiskAssessments().then(function() {

					var max_index = Object.keys(factory.utils.assessments.existing_data).length - 1;

					// IF NO RECORDS
					if( max_index == -1 ) {
						factory.utils.assessments.existing_data = null;
						defer.resolve();
						return defer.promise;
					}

					Object.keys(factory.utils.assessments.existing_data).forEach(function(current_key){
							
						// IF EXISTING RISK NOT IN DOWNLOAD AND NOT MODIFIED
						if( !record_id_keys.hasOwnProperty(current_key) && factory.utils.assessments.existing_data[current_key].record_modified == 'No' ) {
							cloud_deleted_risks.push(factory.utils.assessments.existing_data[current_key]._id)
						}

					});

					if( !cloud_deleted_risks.length ) {
						factory.utils.assessments.existing_data = null;
						defer.resolve();
						return defer.promise;
					}

					updateNextRisk(save_defer, 0).then(function() {
						factory.utils.assessments.existing_data = null;
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function updateNextRisk(defer, active_index) {

						if( active_index > cloud_deleted_risks.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						var risk_id = cloud_deleted_risks[active_index];

						riskmachDatabasesFactory.databases.collection.assessments.get(risk_id).then(function(risk_doc) {

							risk_doc.status = 8;
							risk_doc.status_name = 'Deleted';

							riskmachDatabasesFactory.databases.collection.assessments.put(risk_doc).then(function(result) {
								
								risk_doc._id = result.id;
								risk_doc._rev = result.rev;

								active_index++;

								updateNextRisk(defer, active_index);

							}).catch(function(error) {
								defer.reject(error);
							});

						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
		}

		factory.initProjectRecordForDownload = function(rm_id) 
		{
			var defer = $q.defer();

			factory.dbFetch.projects.rmProjectRecord(rm_id).then(function(existing_record) {

				if( existing_record != null ) {
					defer.resolve(existing_record._id);
					return defer.promise;
				};

				factory.doInitProjectRecordForDownload(rm_id).then(function(saved_project) {
					defer.resolve(saved_project._id);
				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.doInitProjectRecordForDownload = function(rm_id) 
		{
			var defer = $q.defer();

			var project_record = modelsFactory.models.newProject();

			project_record.rm_id = parseInt( rm_id );
			project_record.record_modified = 'No';

			factory.dbUtils.projects.saveProjectRecord(project_record).then(function(saved_project) {
				defer.resolve(saved_project);
			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetchDataForQuestionNumRisks = function() 
		{
			var defer = $q.defer();

			factory.fetchProjectRisks().then(function(risks) {

				factory.fetchProjectQuestionAssessmentRelations(risks).then(function(relations) {

					var data = {
						risks: risks, 
						ra_question_relations: relations
					}

					defer.resolve(data);

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetchProjectRisks = function() 
		{
			var defer = $q.defer();
			var fetch_defer = $q.defer();

			var risk_collection = {};

			var options = {
				limit: 100,
				include_docs: true
			}

			var db = riskmachDatabasesFactory.databases.collection.assessments;

			fetchNextPage(fetch_defer).then(function() {
				defer.resolve(risk_collection);
			}, function(error) {
				defer.reject(error);
			});

			function fetchNextPage(defer) 
			{
				db.allDocs(options).then(function(result) {

					if( result && result.rows.length > 0 ) 
					{
						var i = 0;
						var len = result.rows.length;

						while(i < len) {

							var errors = 0;

							if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
								errors++;
							}

							if( !result.rows[i].doc.hasOwnProperty('activity_id') || (factory.download_setup.active.project_id && result.rows[i].doc.activity_id != factory.download_setup.active.project_id) ) {
								errors++;
							}

							if( errors == 0 ) {
								var record = {
									_id: result.rows[i].doc._id, 
									_rev: result.rows[i].doc._rev,
									status: result.rows[i].doc.status,
									record_modified: result.rows[i].doc.record_modified, 
									date_modified: result.rows[i].doc.date_modified
								};

								risk_collection[ result.rows[i].doc._id ] = record;
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
		}

		factory.fetchProjectQuestionAssessmentRelations = function(risks) 
		{
			var defer = $q.defer();
			var fetch_defer = $q.defer();

			var relations_collection = [];

			var options = {
				limit: 100,
				include_docs: true
			}

			var db = riskmachDatabasesFactory.databases.collection.ra_question_relations;

			fetchNextPage(fetch_defer).then(function() {
				defer.resolve(relations_collection);
			}, function(error) {
				defer.reject(error);
			});

			function fetchNextPage(defer) 
			{
				db.allDocs(options).then(function(result) {

					console.log("FETCHED RELATIONS");
					console.log(result.rows);

					if( result && result.rows.length > 0 ) 
					{
						var i = 0;
						var len = result.rows.length;

						while(i < len) {

							var errors = 0;

							if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
								errors++;
							}

							if( !result.rows[i].doc.hasOwnProperty('assessment_id') || !risks.hasOwnProperty( result.rows[i].doc.assessment_id ) ) {
								errors++;
							}

							if( errors == 0 ) {
								var record = {
									_id: result.rows[i].doc._id, 
									_rev: result.rows[i].doc._rev,
									assessment_id: result.rows[i].doc.assessment_id,
									question_record_id: result.rows[i].doc.question_record_id,
									status: result.rows[i].doc.status,
									record_modified: result.rows[i].doc.record_modified, 
									date_modified: result.rows[i].doc.date_modified
								};

								relations_collection.push(record);
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
		}

		factory.downloadRegisterProcedureForEdit = function(data) 
		{
			var defer = $q.defer();

			factory.doDownloadRegisterProcedureForEdit(data).then(function() {

				factory.updateRegisterProcedureData().then(function() {

					// NEED TO RESOLVE PROJECT ID AND ASSET ID
					var saved_ids = {
						saved_project_id: factory.download_setup.active.project_id,
						saved_asset_id: factory.download_setup.active.asset_id
					};

					// CLEAN UP ACTIVE PROJECT ID ETC.
					factory.download_setup.active.project_id = null;
					factory.download_setup.active.asset_id = null;

					// RESET KEYS
					factory.key_utils.resetAll();

					defer.resolve(saved_ids);

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.doDownloadRegisterProcedureForEdit = function(data) 
		{
			var defer = $q.defer();
			var save_defer = $q.defer();

			var stages = ['project','snapshot_asset','tasks','hazards','controls','hazard_control_relations','media'];

			// FIND CORE ASSET PROCEDURE IS ASSIGNED TO
			var rm_register_asset_id = null;
			var i = 0;
			var len = data.tasks.length;
			while(i < len) {
				if( data.tasks[i].task_type == 'procedure' ) {
					rm_register_asset_id = data.tasks[i].rm_register_asset_id;
				}

				i++;
			}

			saveNextStage(save_defer, 0).then(function() {

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			function saveNextStage(defer, stage_index) 
			{
				if( stage_index > stages.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				if( stages[stage_index] == 'project' ) {
					factory.dbUtils.projects.createNewRegisterProcedureProject(data.subject_record).then(function(project_record) {

						factory.download_setup.active.project_id = project_record._id;

						stage_index++;

						saveNextStage(defer, stage_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( stages[stage_index] == 'snapshot_asset' ) {
					factory.dbUtils.snapshot_assets.createNewRegisterProcedureAsset(data.subject_record, rm_register_asset_id).then(function(asset_record) {

						factory.download_setup.active.asset_id = asset_record._id;

						stage_index++;

						saveNextStage(defer, stage_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( stages[stage_index] == 'tasks' ) {
					factory.utils.tasks.cloud_task_revisions = {};

					// FORCE TO SAVE NEW
					factory.utils.tasks.existing_data = {};
					factory.utils.record_assets.existing_data = {};

					factory.saveRegisterProcedureTasks(data.tasks).then(function() {

						factory.utils.tasks.cloud_task_revisions = null;
						factory.utils.tasks.existing_data = null;
						factory.utils.record_assets.existing_data = null;
							
						stage_index++;

						saveNextStage(defer, stage_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( stages[stage_index] == 'hazards' ) {
					// FORCE TO SAVE NEW
					factory.utils.mr_hazards.existing_data = {};

					factory.saveRegisterProcedureHazards(data.hazards).then(function() {

						factory.utils.mr_hazards.existing_data = null;
							
						stage_index++;

						saveNextStage(defer, stage_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( stages[stage_index] == 'controls' ) {
					// FORCE TO SAVE NEW
					factory.utils.mr_controls.existing_data = {};
					factory.utils.record_assets.existing_data = {};

					factory.saveRegisterProcedureControls(data.control_items).then(function() {

						factory.utils.mr_controls.existing_data = null;
						factory.utils.record_assets.existing_data = null;
							
						stage_index++;

						saveNextStage(defer, stage_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( stages[stage_index] == 'hazard_control_relations' ) {
					// FORCE TO SAVE NEW
					factory.utils.hazard_control_relations.existing_data = {};

					factory.saveRegisterProcedureHazardControlRelations(data.hazard_control_relations).then(function() {

						factory.utils.hazard_control_relations.existing_data = null;
							
						stage_index++;

						saveNextStage(defer, stage_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( stages[stage_index] == 'media' ) {
					// FORCE TO SAVE NEW
					factory.utils.media_records.existing_data = {};

					factory.saveRegisterProcedureMedia(data.media).then(function() {

						factory.utils.media_records.existing_data = null;
							
						stage_index++;

						saveNextStage(defer, stage_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;
			}

			return defer.promise;
		}

		factory.orderTasksByType = function(tasks) 
		{
			var ordered_tasks = [];
			var procedures = [];
			var sections = [];
			var steps = [];

			var i = 0;
			var len = tasks.length;

			while(i < len) {
				if( tasks[i].task_type == 'procedure' ) {
					procedures.push(tasks[i]);
				}

				if( tasks[i].task_type == 'task' ) {
					sections.push(tasks[i]);
				}

				if( tasks[i].task_type == 'step' ) {
					steps.push(tasks[i]);
				}

				i++;
			}

			ordered_tasks.push(...procedures);
			ordered_tasks.push(...sections);
			ordered_tasks.push(...steps);

			procedures = [];
			sections = [];
			steps = [];

			return ordered_tasks;
		}

		factory.saveRegisterProcedureTasks = function(tasks) 
		{
			var defer = $q.defer();
			var save_defer = $q.defer();

			// IF NO DATA TO SAVE
			if( !tasks || tasks.length == 0 ) {
				defer.resolve();
				return defer.promise;
			};

			// ARRAY ORDER; PROCEDURES, SECTIONS, STEPS
			tasks = factory.orderTasksByType(tasks);

			// SAVE ALL TASKS AS NEW
				// STORE THEIR LOCAL IDS AGAINST RMID AND REFS

			var active_index = 0;

			saveTaskRecord(save_defer, tasks[active_index]).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function saveTaskRecord(defer, task_record) {

				// SET LOCAL PROJECT ID
				task_record.activity_id = factory.download_setup.active.project_id;
				// SET LOCAL ASSET ID
				task_record.asset_id = factory.download_setup.active.asset_id;
				// SET LOCAL PARENT TASK ID
				task_record.parent_task_id = factory.key_utils.getValueFromIdKey('tasks', task_record.rm_parent_task_id, 'db_id');
				// SET LOCAL PROCEDURE ID
				task_record.procedure_id = factory.key_utils.getValueFromIdKey('tasks', task_record.rm_procedure_id, 'db_id');

				if( task_record.task_type == 'procedure' ) {
					task_record.register_rm_ref_edit = task_record.rm_ref;
					task_record.register_rm_id_edit = task_record.rm_id;
				}

				factory.dbUtils.tasks.saveTaskRecord(task_record).then(function(saved_task) {

					// STORE RMID - LOCAL ID KEY VALUE PAIRS
					factory.key_utils.storeIdKey('tasks', saved_task._id, saved_task.rm_id, 'db_id');

					// STORE RMREF - LOCAL ID KEY VALUE PAIRS
					factory.key_utils.storeRefKey('tasks', saved_task._id, saved_task.rm_ref, 'db_id');

					active_index++;

					// IF SAVED ALL TASKS
					if( active_index > tasks.length - 1 ) {
						defer.resolve();
						return defer.promise;
					};

					saveTaskRecord(defer, tasks[active_index]);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}

			return defer.promise;
		}

		factory.saveRegisterProcedureHazards = function(hazards) 
		{
			var defer = $q.defer();
			var save_defer = $q.defer();

			var active_index = 0;

			// IF NO DATA TO SAVE
			if( !hazards || hazards.length == 0 ) {
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
				hazard_record.activity_id = factory.download_setup.active.project_id;
				// SET LOCAL ASSET ID
				hazard_record.asset_id = factory.download_setup.active.asset_id;
				// SET LOCAL TASK ID
				hazard_record.task_id = factory.key_utils.getValueFromRefKey('tasks', hazard_record.rm_task_ref, 'db_id');

				factory.dbUtils.mr_hazards.saveHazardRecord(hazard_record).then(function(saved_hazard) {

					// STORE RMREF - LOCAL ID KEY VALUE PAIRS
					factory.key_utils.storeRefKey('mr_hazards', saved_hazard._id, saved_hazard.rm_ref, 'db_id');

					if( parseInt(hazard_record.status) == 1 ) {
						var num_hazards = factory.key_utils.getValueFromRefKey('tasks', hazard_record.rm_task_ref, 'num_hazards');
						if( num_hazards == null ) {
							num_hazards = 1;
						} else {
							num_hazards++;
						}

						// STORE NUM HAZARDS
						factory.key_utils.updateRefKeyValue('tasks', hazard_record.rm_task_ref, 'num_hazards', num_hazards);
					}

					if( parseInt(hazard_record.status) == 1 && hazard_record.hazard_considered == 'Yes' ) {
						var num_hazards_complete = factory.key_utils.getValueFromRefKey('tasks', hazard_record.rm_task_ref, 'num_hazards_complete');
						if( num_hazards_complete == null ) {
							num_hazards_complete = 1;
						} else {
							num_hazards_complete++;
						}

						// STORE NUM HAZARDS COMPLETE
						factory.key_utils.updateRefKeyValue('tasks', hazard_record.rm_task_ref, 'num_hazards_complete', num_hazards_complete);
					}

					active_index++;

					// IF SAVED ALL HAZARDS
					if( active_index > hazards.length - 1 ) {
						defer.resolve();
						return defer.promise;
					};

					saveHazardRecord(defer, hazards[active_index]);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}

			return defer.promise;
		}

		factory.saveRegisterProcedureControls = function(controls) 
		{
			var defer = $q.defer();
			var save_defer = $q.defer();

			var active_index = 0;

			// IF NO DATA TO SAVE
			if( !controls || controls.length == 0 ) {
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
				control_record.activity_id = factory.download_setup.active.project_id;
				// SET LOCAL ASSET ID
				control_record.asset_id = factory.download_setup.active.asset_id;
				// SET LOCAL TASK ID
				if( control_record.rm_task_ref != null && control_record.rm_task_ref != '' ) {
					control_record.task_id = factory.key_utils.getValueFromRefKey('tasks', control_record.rm_task_ref, 'db_id');
				}

				factory.dbUtils.mr_controls.saveControlRecord(control_record).then(function(saved_control) {

					// STORE RMREF - LOCAL ID KEY VALUE PAIRS
					factory.key_utils.storeRefKey('mr_controls', saved_control._id, saved_control.rm_ref, 'db_id');

					active_index++;

					// IF SAVED ALL CONTROLS
					if( active_index > controls.length - 1 ) {
						defer.resolve();
						return defer.promise;
					};

					saveControlRecord(defer, controls[active_index]);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}

			return defer.promise;
		}

		factory.saveRegisterProcedureHazardControlRelations = function(relations) 
		{
			var defer = $q.defer();
			var save_defer = $q.defer();

			var active_index = 0;

			// IF NO DATA TO SAVE
			if( !relations || relations.length == 0 ) {
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
				relation_record.activity_id = factory.download_setup.active.project_id;
				// SET LOCAL ASSET ID
				relation_record.asset_id = factory.download_setup.active.asset_id;
				// SET LOCAL HAZARD ID
				relation_record.hazard_id = factory.key_utils.getValueFromRefKey('mr_hazards', relation_record.rm_hazard_ref, 'db_id');
				// SET LOCAL CONTROL ID
				relation_record.control_item_id = factory.key_utils.getValueFromRefKey('mr_controls', relation_record.rm_control_item_ref, 'db_id');

				factory.dbUtils.hazard_control_relations.saveHazardControlRelation(relation_record).then(function(saved_relation) {

					// STORE RMID - LOCAL ID KEY VALUE PAIRS
					// factory.key_utils.storeIdKey(saved_relation._id, saved_relation.rm_id);

					active_index++;

					// IF SAVED ALL RELATIONS
					if( active_index > relations.length - 1 ) {
						defer.resolve();
						return defer.promise;
					};

					saveRelationRecord(defer, relations[active_index]);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}

			return defer.promise;
		}

		factory.saveRegisterProcedureMedia = function(media) 
		{
			var defer = $q.defer();
			var save_defer = $q.defer();

			var active_index = 0;

			// IF NO DATA TO SAVE
			if( !media || media.length == 0 ) {
				defer.resolve();
				return defer.promise;
			};

			saveMediaRecord(save_defer, media[active_index]).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function saveMediaRecord(defer, media_record) {

				
				// SET LOCAL ACTIVITY ID
				media_record.activity_id = factory.download_setup.active.project_id;

				// if( media_record.record_type == 'asset' ) {
				// 	// SET LOCAL ASSET ID
				// 	media_record.record_id = factory.download_setup.active.asset_id;
				// };

				if( media_record.record_type == 'task' ) {
					// SET LOCAL TASK ID
					media_record.record_id = factory.key_utils.getValueFromRefKey('tasks', media_record.rm_record_item_ref, 'db_id');
				};

				if( media_record.record_type == 'assessment_hazard' ) {
					// SET LOCAL HAZARD ID
					media_record.record_id = factory.key_utils.getValueFromRefKey('mr_hazards', media_record.rm_record_item_ref, 'db_id');
				};

				if( media_record.record_type == 'control_item' ) {
					// SET LOCAL CONTROL ID
					media_record.record_id = factory.key_utils.getValueFromRefKey('mr_controls', media_record.rm_record_item_ref, 'db_id');
				};

				// if( media_record.record_type == 'assessment' ) {
				// 	// SET LOCAL RISK ASSESSMENT ID
				// 	media_record.record_id = factory.utils.getValueFromKey('assessments', media_record.rm_record_item_ref, 'db_id');

				// 	var rm_item_id = factory.utils.getValueFromKey('assessments', media_record.rm_record_item_ref, 'rm_id');
				// 	if( rm_item_id != media_record.rm_record_item_id ) {
				// 		media_record.item_not_found = 'Yes';
				// 	}
				// }

				factory.dbUtils.media_records.saveMediaRecord(media_record).then(function(saved_media) {

					// STORE RMID - LOCAL ID KEY VALUE PAIRS
					factory.key_utils.storeRefKey('media', saved_media._id, saved_media.rm_ref, 'db_id');

					// IF LIVE MEDIA RECORD, UPDATE NUM FILES
					if( parseInt(media_record.status) == 1 ) {

						var num_files = null;

						// UPDATE ASSET NUM FILES
						// if( media_record.record_type == 'asset' ) {
						// 	num_files = factory.key_utils.getValueFromIdKey('snapshot_assets', media_record.rm_record_item_id, 'num_files');
						// 	if( num_files == null ) {
						// 		num_files = 1;
						// 	} else {
						// 		num_files++;
						// 	}

						// 	// STORE NUM FILES
						// 	factory.key_utils.updateIdKeyValue('snapshot_assets', media_record.rm_record_item_id, 'num_files', num_files);
						// }

						// UPDATE TASK NUM FILES
						if( media_record.record_type == 'task' ) {

							// IF IMAGE
							if( (media_record.is_video == false || media_record.is_video == 'No') && (media_record.is_audio == false || media_record.is_audio == 'No') ) {
								num_files = factory.key_utils.getValueFromRefKey('tasks', media_record.rm_record_item_ref, 'num_files');
								if( num_files == null ) {
									num_files = 1;
								} else {
									num_files++;
								}
							}

							// STORE NUM FILES
							factory.key_utils.updateRefKeyValue('tasks', media_record.rm_record_item_ref, 'num_files', num_files);
							// SET VID/AUDIO/SIGNATURE MEDIA IDS
							if( media_record.is_video == true || media_record.is_video == 'Yes' ) {
								factory.key_utils.updateRefKeyValue('tasks', media_record.rm_record_item_ref, 'video_media_id', saved_media._id);
							}
							if( media_record.is_audio == true || media_record.is_audio == 'Yes' ) {
								factory.key_utils.updateRefKeyValue('tasks', media_record.rm_record_item_ref, 'audio_media_id', saved_media._id);
							}
							if( media_record.is_signature == 'Yes' ) {
								factory.key_utils.updateRefKeyValue('tasks', media_record.rm_record_item_ref, 'signature_id', saved_media._id);
							}
						}

						// UPDATE HAZARD NUM FILES
						if( media_record.record_type == 'assessment_hazard' ) {
							num_files = factory.key_utils.getValueFromRefKey('mr_hazards', media_record.rm_record_item_ref, 'num_files');
							if( num_files == null ) {
								num_files = 1;
							} else {
								num_files++;
							}

							// STORE NUM FILES
							factory.key_utils.updateRefKeyValue('mr_hazards', media_record.rm_record_item_ref, 'num_files', num_files);
						}

						// UPDATE CONTROL NUM FILES
						if( media_record.record_type == 'control_item' ) {
							num_files = factory.key_utils.getValueFromRefKey('mr_controls', media_record.rm_record_item_ref, 'num_files');
							if( num_files == null ) {
								num_files = 1;
							} else {
								num_files++;
							}

							// STORE NUM FILES
							factory.key_utils.updateRefKeyValue('mr_controls', media_record.rm_record_item_ref, 'num_files', num_files);
						}

						// UPDATE RISK ASSESSMENT NUM FILES
						if( media_record.record_type == 'assessment' && media_record.item_not_found == null ) {
							num_files = factory.key_utils.getValueFromRefKey('assessments', media_record.rm_record_item_ref, 'num_files');
							if( num_files == null ) {
								num_files = 1;
							} else {
								num_files++;
							}

							// STORE NUM FILES
							factory.key_utils.updateRefKeyValue('assessments', media_record.rm_record_item_ref, 'num_files', num_files);
						}

					}

					active_index++;

					// IF SAVED ALL MEDIA
					if( active_index > media.length - 1 ) {
						defer.resolve();
						return defer.promise;
					};
					
					saveMediaRecord(defer, media[active_index]);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}

			return defer.promise;
		}

		factory.updateRegisterProcedureData = function() 
		{
			var defer = $q.defer();
			var update_defer = $q.defer();

			var stages = ['tasks','hazards','controls'];

			updateNextStage(update_defer, 0).then(function() {

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			function updateNextStage(defer, stage_index) 
			{
				if( stage_index > stages.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				if( stages[stage_index] == 'tasks' ) {

					factory.runRegisterProcedureStageUpdates('tasks', factory.key_utils.tasks).then(function() {
							
						stage_index++;

						updateNextStage(defer, stage_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( stages[stage_index] == 'hazards' ) {

					factory.runRegisterProcedureStageUpdates('mr_hazards', factory.key_utils.mr_hazards).then(function() {
							
						stage_index++;

						updateNextStage(defer, stage_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( stages[stage_index] == 'controls' ) {

					factory.runRegisterProcedureStageUpdates('mr_controls', factory.key_utils.mr_controls).then(function() {
							
						stage_index++;

						updateNextStage(defer, stage_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;
			}

			return defer.promise;
		}

		factory.runRegisterProcedureStageUpdates = function(type, key_data) 
		{
			var defer = $q.defer();
			var save_defer = $q.defer();

			var active_index = 0;

			runNextUpdate(save_defer, factory.update_utils.updates[active_index]).then(function() {

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			function runNextUpdate(defer, current_update) 
			{
				if( current_update.applicable_stages.indexOf(type) == -1 ) {
					// UPDATE N/A FOR FETCH ITEM STAGE
					active_index++;

					if( active_index > factory.update_utils.updates.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					runNextUpdate(defer, factory.update_utils.updates[active_index]);

					return defer.promise;
				}

				if( current_update.name == 'record_num_files' ) {
					factory.dbUtils.updateValueOnRecords(type, key_data.ref_keys, 'num_files').then(function() {
						active_index++;

						if( active_index > factory.update_utils.updates.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}
		
						runNextUpdate(defer, factory.update_utils.updates[active_index]);
					}, function(error) {
						defer.reject(error);
					});
				}

				if( current_update.name == 'hazard_num_controls' ) {
					factory.dbUtils.updateHazardsNumControls(type, key_data.ref_keys).then(function() {
						active_index++;

						if( active_index > factory.update_utils.updates.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}
		
						runNextUpdate(defer, factory.update_utils.updates[active_index]);
					}, function(error) {
						defer.reject(error);
					});
				}

				if( current_update.name == 'control_num_hazards' ) {
					factory.dbUtils.updateControlsNumHazards(type, key_data.ref_keys).then(function() {
						active_index++;

						if( active_index > factory.update_utils.updates.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}
		
						runNextUpdate(defer, factory.update_utils.updates[active_index]);
					}, function(error) {
						defer.reject(error);
					});
				}

				if( current_update.name == 'record_num_hazards' ) {
					factory.dbUtils.updateValueOnRecords(type, key_data.ref_keys, 'num_hazards').then(function() {
						active_index++;

						if( active_index > factory.update_utils.updates.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}
		
						runNextUpdate(defer, factory.update_utils.updates[active_index]);
					}, function(error) {
						defer.reject(error);
					});
				}

				if( current_update.name == 'record_num_hazards_complete' ) {
					factory.dbUtils.updateValueOnRecords(type, key_data.ref_keys, 'num_hazards_complete').then(function() {
						active_index++;

						if( active_index > factory.update_utils.updates.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}
		
						runNextUpdate(defer, factory.update_utils.updates[active_index]);
					}, function(error) {
						defer.reject(error);
					});
				}

				if( current_update.name == 'video_ids' ) {
					factory.dbUtils.updateValueOnRecords(type, key_data.ref_keys, 'video_media_id').then(function() {
						active_index++;

						if( active_index > factory.update_utils.updates.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}
		
						runNextUpdate(defer, factory.update_utils.updates[active_index]);
					}, function(error) {
						defer.reject(error);
					});
				}

				if( current_update.name == 'audio_ids' ) {
					factory.dbUtils.updateValueOnRecords(type, key_data.ref_keys, 'audio_media_id').then(function() {
						active_index++;

						if( active_index > factory.update_utils.updates.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}
		
						runNextUpdate(defer, factory.update_utils.updates[active_index]);
					}, function(error) {
						defer.reject(error);
					});
				}

				if( current_update.name == 'signature_ids' ) {
					factory.dbUtils.updateValueOnRecords(type, key_data.ref_keys, 'signature_id').then(function() {
						active_index++;

						if( active_index > factory.update_utils.updates.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}
		
						runNextUpdate(defer, factory.update_utils.updates[active_index]);
					}, function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;	
			}

			return defer.promise;
		}

		//INIT ALL DATABASES
		riskmachDatabasesFactory.databases.initAll();

		return factory;
	}

}())