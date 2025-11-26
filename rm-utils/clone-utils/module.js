(function() {
	var app = angular.module('riskmachCloneUtils', ['angular-jwt','riskmachUtils','riskmachDatabases','riskmachModels']);
	app.factory('cloneUtilsFactory', cloneUtilsFactory);

	function cloneUtilsFactory($q, $http, $filter, riskmachDatabasesFactory, authFactory, rmUtilsFactory, modelsFactory) 
	{
		var factory = {};

		factory.image_errors = {
			error: false,
			num_images: 0,
			error_message: null,
			reset: function() {
				factory.image_errors.error = false;
				factory.image_errors.num_images = 0;
				factory.image_errors.error_message = null;
			},
			cannotCloneImage: function() {
				factory.image_errors.error = true;
				factory.image_errors.num_images++;
				factory.image_errors.error_message = "Could not clone " + factory.image_errors.num_images + " images across companies";
			}
		}

		factory.snapshot_assets = {
			startCloneInspectionData: function(src_asset_id, relations) {
				var defer = $q.defer();

				factory.dbUtils.getAssetRecord(src_asset_id).then(function(asset_record) {

					factory.dbUtils.fetchInspectionData(asset_record).then(function(inspection_data) {

						factory.cloneInspectionData(inspection_data, relations).then(function(cloned_asset) {

							defer.resolve(cloned_asset);

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
			cloneInspectionRecord: function(asset_id, relations) 
			{
				var defer = $q.defer();

				if( !asset_id ) {
					defer.reject("No asset identifier found for clone");
					return defer.promise;
				}

				if( !relations ) {
					defer.reject("No relations were specified for the asset clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id ) {
					defer.reject("No project identifier was given for the asset clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id ) 
				{
					// CLONE ASSET RECORD AND MEDIA
					riskmachDatabasesFactory.databases.collection.assets.get(asset_id).then(function(doc) {
						var new_doc = angular.copy(doc);

						new_doc._id = null;
						new_doc._rev = null;
						new_doc.rm_id = null;
						new_doc.rm_ref = null;
						new_doc.status = 1; // LIVE
						new_doc.synced = false;
						new_doc.imported = false;
						new_doc.mid_record_id = null; 
						new_doc.sync_id = null;
						new_doc.company_id = authFactory.cloudCompanyId();
						new_doc.client_id = authFactory.getActiveCompanyId();
						new_doc.project_id = relations.activity_id;
						new_doc.rm_project_id = relations.rm_activity_id || null;
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
						new_doc.num_files = 0;

						// CLEAR ACTIVE CHECKLIST VALUE
						new_doc.active_checklist_id = null;

						// CLEAR REPORT VALUES
						new_doc.report_id = null;
						new_doc.report_ref = null;
						new_doc.report_ref_guid = null;
						new_doc.report_date = null;
						new_doc.report_status = null; 
						new_doc.report_status_name = null;

						// CLEAR QUICK CAPTURE
						new_doc.quick_capture_risk_id = null;

						if( relations.hasOwnProperty('parent_asset_id') )
						{
							new_doc.parent_asset_id = relations.parent_asset_id;
						}

						if( relations.hasOwnProperty('rm_parent_asset_id') )
						{
							new_doc.rm_parent_asset_id = relations.rm_parent_asset_id;
						}

						if( relations.hasOwnProperty('parent_asset_ref') )
						{
							new_doc.parent_asset_ref = relations.parent_asset_ref;
						}

						// CLEAR REINSPECTION VALUES
						new_doc.register_asset_id = null;
						new_doc.rm_register_asset_id = null;
						new_doc.register_asset_ref = null;
						new_doc.re_inspection_asset = null;
						new_doc.re_inspection_data_downloaded = null;
						new_doc.re_inspection_of_id = null;
						new_doc.re_inspection_of_rm_id = null;

						// SET CLONED FROM IDS
						new_doc.cloned_from_id = doc._id;
						new_doc.cloned_from_rm_id = doc.rm_id;

						// UPDATE ASSET REF
						new_doc.asset_ref += ' - CLONED';
						// CLEAR SERIAL
						new_doc.serial = null;

						riskmachDatabasesFactory.databases.collection.assets.post(new_doc).then(function(result) {
							new_doc._id = result.id;
							new_doc._rev = result.rev;

							defer.resolve(new_doc);

							// var media_relations = angular.copy( relations );

							// media_relations.record_id = new_doc._id;
							// media_relations.record_type = 'asset';
							// media_relations.rm_record_item_id = new_doc.rm_id;

							// factory.media.copyAllMediaRecords(asset_id, 'snapshot_asset', media_relations).then(function(){

							// 	defer.resolve(new_doc);

							// }, function(error){
							// 	defer.reject(error);
							// });

						}, function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});
				} 
				else 
				{
					riskmachDatabasesFactory.databases.collection.assets.get(relations.asset_id).then(function(doc) {
						
						// MARK MODIFIED
						doc.record_modified = 'Yes';
						doc.date_record_synced = null;
						doc.date_content_synced = null;
						doc.date_record_imported = null;
						doc.date_content_imported = null;

						riskmachDatabasesFactory.databases.collection.assets.put(doc).then(function(result) {

							console.log("DEST ASSET MARKED MODIFIED");

							doc._id = result.id;
							doc._rev = result.rev;

							defer.resolve(doc);

						}).catch(function(error) {
							defer.reject(error);
						});

						// ONLY CLONE MEDIA TO EXISTING ASSET
						// var media_relations = angular.copy( relations );

						// media_relations.record_id = doc._id;
						// media_relations.record_type = 'asset';
						// media_relations.rm_record_item_id = doc.rm_id;

						// factory.media.copyAllMediaRecords(asset_id, 'snapshot_asset', media_relations).then(function(){

						// 	defer.resolve(doc);

						// }, function(error){
						// 	defer.reject(error);
						// });

					}).catch(function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;
			}, 
			toggleInspectionCloneComplete: function(asset_id, value) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.assets.get(asset_id).then(function(doc) {

					doc.clone_incomplete = value;

					riskmachDatabasesFactory.databases.collection.assets.put(doc).then(function(result) {
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
			updateAssetActiveChecklist: function(checklist_id, asset_id) {
				var defer = $q.defer();

				if( !checklist_id ) {
					defer.resolve();
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.assets;

				db.get(asset_id).then(function(asset_doc) {

					asset_doc.active_checklist_id = checklist_id;

					db.put(asset_doc).then(function(result) {

						// CLEAN UP
						asset_doc = null;
						
						defer.resolve();

					}).catch(function(error) {
						console.log("ERROR UPDATING ASSET WITH ACTIVE CHECKLIST ID");
						defer.reject(error);
					});

				}).catch(function(error) {
					console.log("ERROR FETCHING ASSET FOR ACTIVE CHECKLIST UPDATE");
					defer.reject(error);
				});

				return defer.promise;
			}
		};

		factory.assessments = {
			cloneRiskAssessmentMultiple: function(risk_ids, relations) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var active_index = 0;
				var saved_ids = {};

				if( risk_ids.length == 0 ) {
					defer.resolve("No risks to clone");
					return defer.promise;
				}

				if( !relations ) {
					defer.reject("No relations were specified for the multiple risk clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id ) {
					defer.reject("No project identifier was given for the multiple risk clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id ) {
					defer.reject("No asset identifier was given for the multiple risk clone");
					return defer.promise;
				}

				cloneRiskAssessment(save_defer, risk_ids[active_index], relations).then(function() {
					defer.resolve(saved_ids);
				}, function(error) {
					defer.reject(error);
				});

				function cloneRiskAssessment(defer, risk_id, relations) {

					factory.assessments.cloneRiskAssessment(risk_id, relations).then(function(saved_risk) {

						active_index++;
						saved_ids[risk_id] = saved_risk._id;

						// CLEAN UP SAVED RISK
						saved_risk = null;

						if( active_index > risk_ids.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						cloneRiskAssessment(defer, risk_ids[active_index], relations);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			cloneRiskAssessment: function(risk_id, relations) {
				var defer = $q.defer();

				if( !risk_id ) {
					defer.reject("No risk identifier found for clone");
					return defer.promise;
				}

				if( !relations ) {
					defer.reject("No relations were specified for the risk clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id ) {
					defer.reject("No project identifier was given for the risk clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id ) {
					defer.reject("No asset identifier was given for the risk clone");
					return defer.promise;
				}

				riskmachDatabasesFactory.databases.collection.assessments.get(risk_id).then(function(doc) {
					var new_doc = angular.copy(doc);

					new_doc._id = null;
					new_doc._rev = null;
					new_doc.rm_id = null;
					new_doc.rm_ref = null;
					new_doc.rm_revision_number = null;
					new_doc.rm_activity_id = relations.rm_activity_id || null;
					new_doc.rm_asset_id = relations.rm_asset_id || null;
					new_doc.synced = false;
					new_doc.imported = false;
					new_doc.activity_id = relations.activity_id;
					new_doc.asset_id = relations.asset_id;
					new_doc.status = 4; // DRAFT
					new_doc.status_name = 'Draft';
					new_doc.is_pool_item = null; // UNSET POOL FLAG
					new_doc.added_by = authFactory.cloudUserId();
					new_doc.date_added = new Date().getTime();
					new_doc.date_modified = new Date().getTime();
					new_doc.company_id = authFactory.cloudCompanyId();
					new_doc.date_record_synced = null; 
					new_doc.date_content_synced = null;
					new_doc.date_record_imported = null;
					new_doc.date_content_imported = null;
					new_doc.user_id = authFactory.cloudUserId();
					new_doc.record_modified = 'Yes';
					new_doc.rm_record_modified = 'No';
					new_doc.sync_id = null;
					new_doc.mid_record_id = null;

					// CLEAR SUGGESTED VALUES
					new_doc.suggested_risk_id = null;
					new_doc.rm_suggested_risk_id = null;

					if( new_doc.hasOwnProperty('downloaded_rm_values') && new_doc.downloaded_rm_values ) {
						new_doc.downloaded_rm_values = null;
					}

					// FORMAT LO INITIAL PHA VALUES
					// if( (!doc.lo_initial || doc.lo_initial == 0 || doc.lo_initial == '0') && (!doc.lo_initial_name || doc.lo_initial_name == '') ) {
					// 	new_doc.lo_initial = null;
					// }
					if( (!doc.lo_initial || doc.lo_initial == 0 || doc.lo_initial == '0') && (!doc.lo_name_initial || doc.lo_name_initial == '') ) {
						new_doc.lo_initial = null;
					}

					// FORMAT LO AFTER PHA VALUES
					// if( (!doc.lo_after || doc.lo_after == 0 || doc.lo_after == '0') && (!doc.lo_after_name || doc.lo_after_name == '') ) {
					// 	new_doc.lo_after = null;
					// }
					if( (!doc.lo_after || doc.lo_after == 0 || doc.lo_after == '0') && (!doc.lo_name_after || doc.lo_name_after == '') ) {
						new_doc.lo_after = null;
					}

					if( relations.hasOwnProperty('assessment_type') && relations.assessment_type != null ) {
						new_doc.assessment_type = relations.assessment_type;
					}

					// SET CLONED FROM IDS
					new_doc.cloned_from_id = doc._id;
					new_doc.cloned_from_rm_id = doc.rm_id;
					new_doc.cloned_from_rm_ref = doc.rm_ref;

					riskmachDatabasesFactory.databases.collection.assessments.post(new_doc).then(function(result) {
						new_doc._id = result.id;
						new_doc._rev = result.rev;

						var media_relations = angular.copy( relations );

						media_relations.record_id = new_doc._id;
						media_relations.record_type = 'assessment';
						media_relations.rm_record_item_id = new_doc.rm_id;
						media_relations.rm_record_item_ref = new_doc.rm_ref;

						// CLEAN UP ORIG DOC
						doc = null;
						// CLEAN UP CLONED DOC
						new_doc = null;

						factory.media.copyAllMediaRecords(risk_id, 'assessment', media_relations).then(function(updated_doc){

							defer.resolve(updated_doc);

						}, function(error){
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
		};

		factory.checklist_instances = {
			cloneChecklistInstanceMultiple: function(checklist_ids, relations) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var active_index = 0;

				var saved_ids = {
					saved_checklist_ids: {},
					saved_question_ids: {},
					active_checklist_id: null
				}

				if( checklist_ids.length == 0 ) {
					defer.resolve("No checklists to clone");
					return defer.promise;
				}

				if( !relations ) {
					defer.reject("No relations were specified for the multiple checklist clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id ) {
					defer.reject("No project identifier was given for the multiple checklist clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id ) {
					defer.reject("No asset identifier was given for the multiple checklist clone");
					return defer.promise;
				}

				cloneChecklistInstance(save_defer, checklist_ids[active_index], relations).then(function() {
					defer.resolve(saved_ids);
				}, function(error) {
					defer.reject(error);
				});

				function cloneChecklistInstance(defer, checklist_id, relations) {

					factory.checklist_instances.cloneChecklistInstance(checklist_id, relations, saved_ids.saved_question_ids).then(function(saved_checklist) {

						active_index++;
						saved_ids.saved_checklist_ids[checklist_id] = saved_checklist._id;

						// IF CHECKLIST IS DRAFT OR PUBLISHED
						if( saved_checklist.status == 1 || saved_checklist.status == 2 ) {
							saved_ids.active_checklist_id = saved_checklist._id;
						}

						if( active_index > checklist_ids.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						cloneChecklistInstance(defer, checklist_ids[active_index], relations);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			cloneChecklistInstance: function(checklist_id, relations, question_ids_container) {
				var defer = $q.defer();

				if( !checklist_id ) {
					defer.reject("No checklist identifier found for clone");
					return defer.promise;
				}

				if( !relations ) {
					defer.reject("No relations were specified for the checklist clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id ) {
					defer.reject("No project identifier was given for the checklist clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id ) {
					defer.reject("No asset identifier was given for the checklist clone");
					return defer.promise;
				}

				riskmachDatabasesFactory.databases.collection.checklist_instances.get(checklist_id).then(function(doc) {
					var new_doc = angular.copy(doc);

					new_doc._id = null; 
					new_doc._rev = null;
					new_doc.rm_id = null;
					new_doc.rm_checklist_record_id = null;
					new_doc.rm_activity_id = relations.rm_activity_id || null;
					new_doc.activity_id = relations.activity_id;
					new_doc.rm_asset_id = relations.rm_asset_id || null;
					new_doc.asset_id = relations.asset_id;
					new_doc.synced = false;
					new_doc.imported = false;
					new_doc.date_started = null;
					new_doc.started_by = null;
					new_doc.status = 1; // DRAFT
					new_doc.company_id = authFactory.cloudCompanyId();
					new_doc.date_record_synced = null; 
					new_doc.date_content_synced = null;
					new_doc.date_record_imported = null;
					new_doc.date_content_imported = null;
					new_doc.user_id = authFactory.cloudUserId();
					new_doc.record_modified = 'Yes';
					new_doc.rm_record = null;
					new_doc.rm_record_modified = 'No';
					new_doc.client_id = authFactory.getActiveCompanyId();
					new_doc.percentage_complete = 0;

					// CLEAR JSON RECORD
					new_doc.checklist_instance_json_id = null;

					new_doc.cloned_from_id = doc._id;
					new_doc.cloned_from_rm_id = doc.rm_id;

					riskmachDatabasesFactory.databases.collection.checklist_instances.post(new_doc).then(function(result) {
						new_doc._id = result.id;
						new_doc._rev = result.rev;

						// IF UAUDIT, CLONE JSON
						// STORE OLD QUESTION UUID-NEW UUID KEY VALUES
						if( new_doc.hasOwnProperty('is_uaudit') && new_doc.is_uaudit == 'Yes' ) {

							var json_relations = angular.copy( relations );
							json_relations.checklist_instance_id = new_doc._id;
							json_relations.rm_checklist_instance_id = new_doc.rm_checklist_record_id;

							factory.checklist_instances_json.cloneChecklistInstanceJsonMultiple(doc.checklist_instance_json_id, json_relations, question_ids_container).then(function() {

								// CLEAN UP ORIG DOC
								doc = null;

								defer.resolve(new_doc);

							}, function(error) {
								defer.reject(error);
							});

						} else {

							var question_relations = angular.copy( relations );

							question_relations.checklist_record_id = new_doc._id;
							question_relations.rm_checklist_record_id = new_doc.rm_checklist_record_id;

							factory.checklist_questions.cloneChecklistQuestionMultiple(checklist_id, question_relations, question_ids_container).then(function(saved_question_ids){

								// CLEAN UP ORIG DOC
								doc = null;

								defer.resolve(new_doc);

							}, function(error){
								defer.reject(error);
							});

						}

					}, function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			indexUAuditJson: function(checklist_record_id, instance_json_id) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.checklist_instances;

				db.get(checklist_record_id).then(function(doc) {

					doc.checklist_instance_json_id = instance_json_id;

					db.put(doc).then(function(result) {

						console.log("INDEXED UAUDIT JSON ON CHECKLIST INSTANCE");

						// CLEAN UP
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
		};

		factory.checklist_instances_json = {
			cloneChecklistInstanceJsonMultiple: function(src_json_record_id, relations, question_ids_container) {
				var defer = $q.defer();

				if( !src_json_record_id ) {
					defer.reject("No source checklist record identifier provided for checklist content clone");
					return defer.promise;
				}

				if( !relations ) {
					defer.reject("No relations have been provided for the checklist data clone");
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;

				db.get(src_json_record_id).then(function(doc) {
					
					factory.checklist_instances_json.cloneChecklistInstanceJson(doc, relations, question_ids_container).then(function(new_record) {

						factory.checklist_instances.indexUAuditJson(new_record.checklist_instance_id, new_record._id).then(function() {
							defer.resolve();
						}, function(error) {
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
			cloneChecklistInstanceJson: function(json_record, relations, question_ids_container) {
				var defer = $q.defer();

				if( !json_record ) {
					defer.reject("No checklist data provided for clone");
					return defer.promise;
				}

				if( !relations ) {
					defer.reject("No relations provided for checklist data clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('checklist_instance_id') || !relations.checklist_instance_id ) {
					defer.reject("No checklist identifier provided for checklist data clone");
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;

				var new_doc = angular.copy(json_record);
				// SET VALUES OF NEW DOC
				new_doc._id = null;
				new_doc._rev = null;
				new_doc.checklist_instance_id = relations.checklist_instance_id;
				new_doc.rm_checklist_instance_id = relations.rm_checklist_instance_id;
				new_doc.record_modified = 'Yes';
				new_doc.date_record_synced = null;
				new_doc.date_record_imported = null;
				new_doc.date_content_synced = null;
				new_doc.date_content_imported = null;
				new_doc.synced = false;
				new_doc.imported = false;
				new_doc.rm_record = null;
				new_doc.rm_record_modified = 'No';

				// SAVE INSTANCE JSON TO GET NEW ID
				db.post(new_doc, {force: true}).then(function(init_result) {
					new_doc._id = init_result.id;
					new_doc._rev = init_result.rev;

					relations.checklist_instance_json_id = new_doc._id;

					// MANIPULATE JSON TO SET QUESTION UUIDS
					new_doc.uaudit_instance_data = JSON.parse(new_doc.uaudit_instance_data);

					factory.checklist_instances_json.formatInstanceJsonForClone(new_doc.uaudit_instance_data, relations, question_ids_container);

					var media_relations = angular.copy(relations);
					// MAKE SURE VALUES ARE NULL, WON'T SET THEM HERE
					media_relations.record_id = null;
					media_relations.record_type = null;
					media_relations.rm_record_item_id = null;
					media_relations.rm_record_item_ref = null;

					// CLONE MEDIA HERE
					factory.media.cloneUAuditMedia(new_doc.uaudit_instance_data, media_relations, question_ids_container).then(function() {

						console.log("JSON AFTER UAUDIT MEDIA CLONE");
						console.log(new_doc.uaudit_instance_data);
						// return defer.promise;

						// STRINGIFY AGAIN FOR DB SAVE
						new_doc.uaudit_instance_data = JSON.stringify(new_doc.uaudit_instance_data);

						db.post(new_doc, {force: true}).then(function(result) {
							new_doc._id = result.id;
							new_doc._rev = result.rev;

							// CLEAN UP ORIG DOC
							json_record = null;

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
			formatInstanceJsonForClone: function(checklist_data, relations, question_ids_container) {

				// SET NEW UUID
				checklist_data.audit_info.cloned_from_uuid = checklist_data.audit_info.id;
				checklist_data.audit_info.cloned_from_rm_id = checklist_data.audit_info.rm_id;
				checklist_data.audit_info.id = rmUtilsFactory.utils.createUUID();

				checklist_data.audit_info.asset_id = relations.asset_id;
				checklist_data.audit_info.rm_asset_id = relations.rm_asset_id || null;

				// CLEAR GLOBAL COLLECTIONS
				checklist_data.actions.collection = [];
				checklist_data.actions.question_relations = {};
				checklist_data.questions.collection = [];
				checklist_data.media.collection = [];

				angular.forEach(checklist_data.pages.collection, function(page_record, page_index){

					//CREATE INIT QUESTIONS ARRAY FOR EACH SECTION
					angular.forEach( page_record.sections, function(section_record, section_index){

						//IF THE QUESTION IS INIT THEN ADD TO SECTION INIT COLLECTION
						angular.forEach( section_record.questions, function(question_record, question_index){

							//SET QUESTION AS INCOMPLETE
							question_record.response.complete = false;

							//SET CLONED FROM UUID
							question_record.cloned_from_uuid = question_record.question_record_id;

							//CREATE NEW QUESTION RECORD UUID
							question_record.question_record_id = rmUtilsFactory.utils.createUUID();

							//SET OLD UUID-NEW UUID KEY-VALUE PAIR
							question_ids_container[question_record.cloned_from_uuid] = question_record.question_record_id;

							//ADD QUESTION TO SELECTION
							checklist_data.questions.collection.push(question_record);

							//ADD ANY QUESTION ANSWER SETUP MEDIA TO COLLECTION
							if( question_record.answer_setup.hasOwnProperty('media') && question_record.answer_setup.media.length ) 
							{
								question_record.answer_setup.media.forEach(function(as_media_record, as_media_index) {
									checklist_data.media.collection.push( as_media_record );
								});
							}

							//ADD EACH QUESTION RESPONSE MEDIA TO COLLECTION
							question_record.response.media.forEach(function(media_record, media_index){

								factory.media.formatMediaRecordForClone(media_record, null, relations);

								//SET TO NEW QUESTION UUID
								media_record.record_item_uuid = question_record.question_record_id;

								checklist_data.media.collection.push( media_record );
							});

							//CREATE NEW UUIDS FOR ANY ACTIONS
							question_record.response.actions.forEach(function(action_record, action_index) {

								// SET CLONED FROM UUID
								action_record.cloned_from_uuid = action_record.id;

								// SET NEW UUID
								action_record.id = rmUtilsFactory.utils.createUUID();

								// PUSH ACTION TO GLOBAL COLLECTION
								checklist_data.actions.collection.push(action_record);

								// CREATE QUESTION-ACTION RELATION
								var relation = {
									action_id: action_record.id, 
									checklist_id: checklist_data.overview.id, 
									checklist_record_id: checklist_data.audit_info.id, 
									date_added: new Date().getTime(), 
									question_id: question_record.id, 
									question_record_id: question_record.question_record_id, 
									question: question_record.question_text
								}

								if( !checklist_data.actions.question_relations.hasOwnProperty(question_record.question_record_id) ) {
									checklist_data.actions.question_relations[ question_record.question_record_id ] = [];
 								}

 								checklist_data.actions.question_relations[ question_record.question_record_id ].push(relation);

 								if( action_record.hasOwnProperty('media') && action_record.media ) {

 									//ADD EACH ACTION MEDIA TO COLLECTION
									action_record.media.forEach(function(a_media_record, a_media_index){

										factory.media.formatMediaRecordForClone(a_media_record, null, relations);

										//SET TO NEW QUESTION UUID
										a_media_record.record_item_uuid = action_record.id;

										checklist_data.media.collection.push( a_media_record );
									});
 									
 								}

								// CLEAN UP
								relation = null;

							});

						});

					});

				});

			}
		}

		factory.checklist_questions = {
			cloneChecklistQuestionMultiple: function(src_checklist_record_id, relations, question_ids_container){
				var defer = $q.defer();

				if( !question_ids_container ) {
					var question_ids_container = {};
				}

				if( !src_checklist_record_id )
				{
					defer.reject("No source checklist record identifier provided for question clone");
					return defer.promise;
				}

				if( !relations )
				{
					defer.reject("No relations have been provided for the checklist question clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('checklist_record_id') || !relations.checklist_record_id )
				{
					defer.reject("No destination checklist identifier was provided for the checklist question clone");
					return defer.promise;
				}

				// GET QUESTION RECORDS
				riskmachDatabasesFactory.databases.collection.checklist_question_records.find({
					selector: {
						checklist_record_id: src_checklist_record_id
					}
				}).then(function(result){

					// START QUESTION CLONES
					var save_defer = $q.defer();

					var question_ids = [];
					var i = 0;
					var len = result.docs.length;
					while(i < len) {
						question_ids.push(result.docs[i]._id);
						i++;
					}

					// CLEAN UP FETCHED DATA
					result.docs = null;

					cloneChecklistQuestions(question_ids, relations, 0, save_defer).then(function(){
						defer.resolve();
					}, function(error){
						defer.reject(error);
					});
				
					function cloneChecklistQuestions(question_ids, relations, current_index, defer){

						if( !question_ids.length )
						{
							defer.resolve(saved_ids);
							return defer.promise;
						}

						if( current_index > question_ids.length - 1 )
						{
							defer.resolve(question_ids_container);
							return defer.promise;
						}

						//CLONE THE CURRENT QUESTION RECORD
						var current_id = question_ids[ current_index ];

						factory.checklist_questions.cloneChecklistQuestionRecord(current_id, relations).then(function(saved_question){

							question_ids_container[current_id] = saved_question._id;

							//CLONE THE NEXT ONE
							current_index++;
							cloneChecklistQuestions(question_ids, relations, current_index, defer);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			cloneChecklistQuestionRecord: function(question_id, relations) {
				var defer = $q.defer();

				if( !question_id ) {
					defer.reject("No checklist question identifier found for clone");
					return defer.promise;
				}

				if( !relations ) {
					defer.reject("No relations were specified for the checklist question clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('checklist_record_id') || !relations.checklist_record_id ) {
					defer.reject("No checklist identifier was given for the checklist question clone");
					return defer.promise;
				}

				riskmachDatabasesFactory.databases.collection.checklist_question_records.get(question_id).then(function(doc) {
					var new_doc = angular.copy(doc);

					new_doc._id = null; 
					new_doc._rev = null;
					new_doc.rm_id = null;
					new_doc.rm_checklist_record_id = relations.rm_checklist_record_id || null;
					new_doc.checklist_record_id = relations.checklist_record_id;
					new_doc.rm_answer_id = null;
					new_doc.rm_answer_ref = null;
					new_doc.company_id = authFactory.cloudCompanyId();
					new_doc.client_id = authFactory.getActiveCompanyId();
					new_doc.blueprint_question_record = null;
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

					new_doc.marked_complete = false;
					new_doc.marked_completed_by = null;
					new_doc.marked_completed_date = null;

					new_doc.cloned_from_id = doc._id;
					new_doc.cloned_from_rm_id = doc.rm_id;

					riskmachDatabasesFactory.databases.collection.checklist_question_records.post(new_doc).then(function(result) {
						new_doc._id = result.id;
						new_doc._rev = result.rev;

						// CLEAN UP ORIG DOC
						doc = null;

						defer.resolve(new_doc);

					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
		};

		factory.tasks = {
			cloneProcedureMultiple: function(task_ids, relations) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var active_index = 0;

				if( task_ids.length == 0 ) {
					defer.resolve("No tasks to clone");
					return defer.promise;
				}

				if( !relations ) {
					defer.reject("No relations were specified for the multiple procedure clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id ) {
					defer.reject("No project identifier was given for the multiple procedure clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id ) {
					defer.reject("No asset identifier was given for the multiple procedure clone");
					return defer.promise;
				}

				cloneProcedure(save_defer, task_ids[active_index], relations).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function cloneProcedure(defer, task_id, relations) {

					factory.tasks.cloneTask(task_id, relations).then(function(saved_task) {

						active_index++;

						if( active_index > task_ids.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						cloneProcedure(defer, task_ids[active_index], relations);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			cloneTask: function(task_id, relations) {
				var defer = $q.defer();

				console.log("START TASK CLONE: " + task_id);
				console.log(relations);

				if( !task_id ) {
					defer.reject("No task identifier found for clone");
					return defer.promise;
				}

				if( !relations ) {
					defer.reject("No relations were specified for the task clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id ) {
					defer.reject("No project identifier was given for the task clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id ) {
					defer.reject("No asset identifier was given for the task clone");
					return defer.promise;
				}

				riskmachDatabasesFactory.databases.collection.tasks.get(task_id).then(function(doc) {

					// IF NOT A TOP LEVEL PROCEDURE
					if( doc.task_type != 'procedure' ) {

						if( !relations.hasOwnProperty('procedure_id') || !relations.procedure_id ) {
							defer.reject("No procedure identifier was given for the task clone");
							return defer.promise;
						}

						if( !relations.hasOwnProperty('parent_task_id') || !relations.parent_task_id ) {
							defer.reject("No parent task identifier was given for the task clone");
							return defer.promise;
						}

					}

					// IF TOP LEVEL PROCEDURE
					if( doc.task_type == 'procedure' ) {
						relations.rm_parent_task_id = null;
						relations.rm_parent_task_ref = null;
						relations.parent_task_id = null;
						relations.rm_procedure_id = null;
						relations.rm_procedure_ref = null;
						relations.procedure_id = null;
					}

					var new_doc = angular.copy(doc);

					new_doc._id = null;
					new_doc._rev = null;
					new_doc.rm_id = null;
					new_doc.rm_ref = null;
					new_doc.rm_parent_task_id = relations.rm_parent_task_id || null;
					new_doc.rm_parent_task_ref = relations.rm_parent_task_ref || null;
					new_doc.parent_task_id = relations.parent_task_id || null;
					new_doc.rm_procedure_id = relations.rm_procedure_id || null;
					new_doc.rm_procedure_ref = relations.rm_procedure_ref || null;
					new_doc.procedure_id = relations.procedure_id || null;
					new_doc.video_media_id = null;
					new_doc.audio_media_id = null;
					new_doc.synced = false;
					new_doc.imported = false;
					new_doc.mid_record_id = null;
					new_doc.sync_id = null;
					new_doc.company_id = authFactory.cloudCompanyId();
					new_doc.client_id = authFactory.getActiveCompanyId();
					new_doc.date_added = new Date().getTime();
					new_doc.rm_activity_id = relations.rm_activity_id || null;
					new_doc.activity_id = relations.activity_id;
					new_doc.rm_asset_id = relations.rm_asset_id || null;
					new_doc.asset_id = relations.asset_id;
					new_doc.date_record_synced = null; 
					new_doc.date_content_synced = null;
					new_doc.date_record_imported = null;
					new_doc.date_content_imported = null;
					new_doc.user_id = authFactory.cloudUserId();
					new_doc.record_modified = 'Yes';
					new_doc.rm_record = null;
					new_doc.rm_record_modified = 'No';

					// REMOVE APPROVAL
					new_doc.date_approved = null;
					new_doc.approved_by_name = null;
					new_doc.signature_id = null;
					new_doc.rm_signature_id = null;
					new_doc.rm_signature_ref = null;

					// UNSET HAZARDS COMPLETE COUNT
					new_doc.num_hazards_complete = 0;

					// SET CLONED FROM IDS
					new_doc.cloned_from_id = doc._id;
					new_doc.cloned_from_rm_id = doc.rm_id;
					new_doc.cloned_from_rm_ref = doc.rm_ref;

					// SET CLONE INCOMPLETE
					new_doc.clone_incomplete = 'Yes';

					console.log("COPIED TASK, BEGIN CLONE");
					console.log(new_doc);

					// SAVE CLONED TASK AND CLONE TASK RECORD ASSET
					factory.tasks.doCloneTask(new_doc).then(function(result) {
						new_doc._id = result._id;
						new_doc._rev = result._rev;

						var media_relations = angular.copy( relations );
						media_relations.record_id = new_doc._id;
						media_relations.record_type = 'task';
						media_relations.rm_record_item_id = new_doc.rm_id;
						media_relations.rm_record_item_ref = new_doc.rm_ref;

						// CLONE TASK MEDIA
						factory.media.copyAllMediaRecords(task_id, 'task', media_relations).then(function(updated_doc){

							new_doc._id = updated_doc._id;
							new_doc._rev = updated_doc._rev;
							new_doc.num_files = updated_doc.num_files;
							console.log("CLONED TASK MEDIA");

							var mr_relations = angular.copy(relations);
							mr_relations.task_id = new_doc._id;
							mr_relations.rm_task_id = new_doc.rm_task_id;
							mr_relations.rm_task_ref = new_doc.rm_task_ref;

							// CLONE TASK MANAGED RISKS
							factory.tasks.cloneTaskManagedRisks(task_id, mr_relations).then(function() {

								console.log("CLONED TASK MANAGED RISKS");

								var sub_task_relations = angular.copy(relations);

								if( doc.task_type == 'procedure' ) {
									sub_task_relations.procedure_id = new_doc._id;
									sub_task_relations.rm_procedure_id = new_doc.rm_id;
									sub_task_relations.rm_procedure_ref = new_doc.rm_ref;
								} else {
									sub_task_relations.procedure_id = new_doc.procedure_id;
									sub_task_relations.rm_procedure_id = new_doc.rm_procedure_id;
									sub_task_relations.rm_procedure_ref = new_doc.rm_procedure_ref;
								}

								sub_task_relations.parent_task_id = new_doc._id;
								sub_task_relations.rm_parent_task_id = new_doc.rm_id;
								sub_task_relations.rm_parent_task_ref = new_doc.rm_ref;

								// CLONE SUB TASKS
								factory.tasks.cloneSubTasks(task_id, sub_task_relations).then(function(){

									// MARK CLONE COMPLETE
									factory.tasks.toggleTaskCloneComplete(new_doc._id, null).then(function() {
										defer.resolve(new_doc);
									});

								}, function(error){
									defer.reject(error);
								});

							}, function(error) {
								defer.reject(error);
							});

						}, function(error){
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
			doCloneTask: function(doc) {
				var defer = $q.defer();
				
				var options = {
					force: true
				};

				//SAVE THE CONTROL
				riskmachDatabasesFactory.databases.collection.tasks.post(doc, options).then(function(res){
					doc._id = res.id;
					doc._rev = res.rev;

					console.log("CLONED TASK RECORD");

					//SAVE THE RECORD ASSET
					factory.tasks.cloneTaskRecordAsset(doc).then(function(doc){
						console.log("SAVED THE TASK RECORD ASSET");
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
			cloneTaskRecordAsset: function(task_record){
				var defer = $q.defer();

				var options = {
					force: true
				};

				var asset_status = 1;

				//IF TASK NOT LIVE MARK RECORD ASSET AS DELETED
				if( task_record.status != 1 && task_record.status != 2 )
				{
					asset_status = 2;
				}

				var asset_record = modelsFactory.models.newSnapshotAsset(null);
				asset_record.record_id = task_record._id;
				asset_record.record_type = 'task';
				asset_record.is_register = 'No';
				asset_record.status = status;
				asset_record.project_id = task_record.activity_id;
				
				//SAVE TASK ASSET RECORD
				riskmachDatabasesFactory.databases.collection.assets.post(asset_record, options).then(function(res){

					console.log("CLONED TASK RECORD ASSET");

					asset_record._id = res.id;
					asset_record._rev = res.rev;

					//SAVE TASK RECORD WITH RECORD ASSET ID
					task_record.record_asset_id = asset_record._id;

					riskmachDatabasesFactory.databases.collection.tasks.post(task_record, options).then(function(res2){

						task_record._id = res2.id;
						task_record._rev = res2.rev;
						defer.resolve(task_record);

					}).catch(function(error){
						defer.reject("Error updating the task record after the new asset record was created: " + error);
					});

				}).catch(function(error){
					defer.reject("Error saving the new task asset record: " + error);
				});

				return defer.promise;
			},
			cloneSubTasks: function(parent_task_id, relations) {
				var defer = $q.defer();

				console.log("BEGIN CLONE SUB TASKS");
				console.log(parent_task_id);
				console.log(relations);

				if( !parent_task_id )
				{
					defer.reject("No parent task identifier provided for sub tasks clone");
					return defer.promise;
				}

				if( !relations )
				{
					defer.reject("No relations have been provided for sub tasks clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('parent_task_id') || !relations.parent_task_id )
				{
					defer.reject("No parent task identifier was provided for sub tasks clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('procedure_id') || !relations.procedure_id )
				{
					defer.reject("No procedure indentifier was provided for sub tasks clone");
					return defer.promise;
				}

				//GET SUB TASK RECORDS
				riskmachDatabasesFactory.databases.collection.tasks.find({
					selector: {
						parent_task_id: parent_task_id
					}
				}).then(function(result){

					console.log("SUB TASKS TO CLONE");
					console.log(result.docs);
				
					var task_defer = $q.defer();

					cloneSubTasks(result.docs, relations, 0, task_defer).then(function(){
						defer.resolve();
					}, function(error){
						defer.reject(error);
					});

					function cloneSubTasks(tasks, relations, current_index, defer){

						if( !tasks.length )
						{
							console.log("NO SUB TASKS TO CLONE");
							defer.resolve();
							return defer.promise;
						}

						if( current_index > tasks.length - 1 )
						{
							console.log("FINISHED CLONING SUB TASKS");
							defer.resolve();
							return defer.promise;
						}

						//CLONE THE CURRENT TASK RECORD
						var current_task = tasks[ current_index ];

						factory.tasks.cloneTask(current_task._id, relations).then(function(){

							//CLONE THE NEXT ONE
							current_index++;
							cloneSubTasks(tasks, relations, current_index, defer);

						}).catch(function(error){
							defer.reject(error);
						});

						return defer.promise;
					}

				}).catch(function(error){
					console.log("ERROR FINDING SUB TASKS");
					defer.reject(error);
				});

				return defer.promise;
			},
			cloneTaskManagedRisks: function(task_id, relations) {
				var defer = $q.defer();

				factory.dbUtils.fetchTaskManagedRiskData(task_id).then(function(mr_data) {

					var clone_defer = $q.defer();

					var clone_stages = ['mr_hazards','mr_controls','hazard_control_relations'];

					var saved_ids = {};

					cloneNextTaskMrData(mr_data, clone_stages, 0, clone_defer).then(function(asset_record){
						defer.resolve(saved_ids);
					}, function(error){
						defer.reject(error);
					});

					function cloneNextTaskMrData(mr_data, clone_stages, current_stage_index, defer)
					{
						// IF THERE ARE NO FETCH STAGES
						if( !clone_stages.length )
						{
							defer.resolve(saved_ids);
							return defer.promise;
						}

						// IF FINISHED FETCHING ALL STAGES
						if( current_stage_index > clone_stages.length - 1 )
						{
							defer.resolve();
							return defer.promise;
						}

						var active_stage_name = clone_stages[current_stage_index];

						if( active_stage_name == 'mr_hazards' )
						{
							var mr_hazard_ids = factory.utils.extractRecordIdsFromArray(mr_data.mr_hazards);

							factory.mr_hazards.cloneHazardMultiple(mr_hazard_ids, relations).then(function(saved_hazard_ids) {

								saved_ids[active_stage_name] = saved_hazard_ids;

								//CLONE NEXT STAGE
								current_stage_index++;
								cloneNextTaskMrData(mr_data, clone_stages, current_stage_index, defer);

							}, function(error) {
								defer.reject(error);
							});
						}

						if( active_stage_name == 'mr_controls' )
						{
							var control_ids = factory.utils.extractRecordIdsFromArray(mr_data.mr_controls);

							factory.mr_controls.cloneControlItemMultiple(control_ids, relations).then(function(saved_control_ids) {

								saved_ids[active_stage_name] = saved_control_ids;

								//CLONE NEXT STAGE
								current_stage_index++;
								cloneNextTaskMrData(mr_data, clone_stages, current_stage_index, defer);

							}, function(error) {
								defer.reject(error);
							});
						}

						if( active_stage_name == 'hazard_control_relations' )
						{
							var relation_ids = factory.utils.extractRecordIdsFromArray(mr_data.hazard_control_relations);

							console.log(mr_data.hazard_control_relations);
							console.log(task_id);

							factory.hazard_control_relations.cloneHazardControlRelationMultiple(relation_ids, relations, saved_ids).then(function() {

								//CLONE NEXT STAGE
								current_stage_index++;
								cloneNextTaskMrData(mr_data, clone_stages, current_stage_index, defer);

							}, function(error) {
								defer.reject(error);
							});
						}

						return defer.promise;
					}

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			toggleTaskCloneComplete: function(task_id, value) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.tasks.get(task_id).then(function(doc) {

					doc.clone_incomplete = value;

					riskmachDatabasesFactory.databases.collection.tasks.put(doc).then(function(result) {
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

		factory.mr_hazards = {
			cloneHazardMultiple: function(hazard_ids, relations) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var active_index = 0;
				var saved_ids = {};

				if( hazard_ids.length == 0 ) {
					defer.resolve("No hazards to clone");
					return defer.promise;
				}

				if( !relations )
				{
					defer.reject("No relations were specified for the multiple hazard clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id )
				{
					defer.reject("No activity identifier was provided for the multiple hazard clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id )
				{
					defer.reject("No asset identifier was provided for the multiple hazard clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('task_id') || !relations.task_id )
				{
					defer.reject("No task identifier was provided for the multiple hazard clone");
					return defer.promise;
				}

				cloneHazard(save_defer, hazard_ids[active_index], relations).then(function() {
					defer.resolve(saved_ids);
				}, function(error) {
					defer.reject(error);
				});

				function cloneHazard(defer, hazard_id, relations) {

					factory.mr_hazards.cloneHazard(hazard_id, relations).then(function(saved_hazard) {

						active_index++;
						saved_ids[hazard_id] = saved_hazard._id;

						if( active_index > hazard_ids.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						cloneHazard(defer, hazard_ids[active_index], relations);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			cloneHazard: function(hazard_id, relations){
				var defer = $q.defer();

				if( !hazard_id )
				{
					defer.reject("No hazard identifier found to clone");
					return defer.promise;
				}

				if( !relations )
				{
					defer.reject("No relations were specified for the hazard clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id )
				{
					defer.reject("No activity identifier was provided for the hazard clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id )
				{
					defer.reject("No asset identifier was provided for the hazard clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('task_id') || !relations.task_id )
				{
					defer.reject("No task identifier was provided for the hazard clone");
					return defer.promise;
				}

				//GET THE HAZARD RECORD
				riskmachDatabasesFactory.databases.collection.mr_hazards.get(hazard_id).then(function(doc){
					
					//ACTION REQUIRED (UNSET SYNCED / IMPORTED ETC)
					var new_doc = angular.copy(doc);

					new_doc._id = null;
					new_doc._rev = null;
					new_doc.rm_id = null;
					new_doc.rm_ref = null;
					new_doc.activity_id = relations.activity_id;
					new_doc.asset_id = relations.asset_id;
					new_doc.task_id = relations.task_id;
					new_doc.date_record_synced = null;
					new_doc.date_content_synced = null;
					new_doc.date_record_imported = null;
					new_doc.date_content_imported = null;
					new_doc.mid_record_id = null;
					new_doc.record_modified = 'Yes';
					new_doc.rm_asset_id = relations.rm_asset_id || null;
					new_doc.rm_register_hazard_id = relations.rm_register_hazard_id || null;
					new_doc.rm_task_id = relations.rm_task_id || null;
					new_doc.rm_task_ref = relations.rm_task_ref || null;
					new_doc.rm_assessment_id = relations.rm_assessment_id || null;
					new_doc.rm_assessment_ref = relations.rm_assessment_ref || null;
					new_doc.rm_activity_id = relations.rm_activity_id || null;
					new_doc.revision_number = null;
					new_doc.assessment_id = relations.assessment_id || null;
					new_doc.register_hazard_id = relations.register_hazard_id || null;
					new_doc.user_id = authFactory.cloudUserId();
					new_doc.company_id = authFactory.cloudCompanyId();
					new_doc.added_by = authFactory.cloudUserId();
					new_doc.date_added = new Date().getTime();
					new_doc.date_modified = new Date().getTime();
					new_doc.modified_by = authFactory.cloudUserId();
					new_doc.hazard_considered = 'No';
					new_doc.sync_id = null;
					new_doc.synced = false;
					new_doc.imported = false;

					// CHANGE NUM CONTROLS IF PROVIDED
					if( relations.hasOwnProperty('num_controls') ) {
						new_doc.num_controls = relations.num_controls;
					}

					// SET CLONED FROM VALUES
					if( doc.master_id ) {
						new_doc.master_id = doc.master_id;
					} else {
						new_doc.master_id = doc._id;
					}

					new_doc.cloned_from_id = doc._id;
					new_doc.cloned_from_rm_id = doc.rm_id;
					new_doc.cloned_from_rm_ref = doc.rm_ref;

					//SAVE THE NEW HAZARD RECORD
					riskmachDatabasesFactory.databases.collection.mr_hazards.post(new_doc).then(function(result){

						new_doc._id = result.id;
						new_doc._rev = result.rev;
				
						var media_relations = angular.copy( relations );

						media_relations.record_id = new_doc._id;
						media_relations.record_type = 'assessment_hazard';
						media_relations.rm_record_item_id = new_doc.rm_id;
						media_relations.rm_record_item_ref = new_doc.rm_ref;

						factory.media.copyAllMediaRecords(hazard_id, 'assessment_hazard', media_relations).then(function(updated_doc){

							defer.resolve(updated_doc);

						}, function(error){
							defer.reject(error);
						});

					}).catch(function(error){
						defer.reject("There was an error cloning the hazard: " + error);
					});

				}).catch(function(error){
					defer.reject("Unable to find the hazard record to clone:" + error);
				});

				return defer.promise;
			},
			startCloneHazardData: function(src_hazard_id, relations) {
				var defer = $q.defer();

				factory.dbUtils.getHazardRecord(src_hazard_id).then(function(hazard_record) {

					factory.dbUtils.fetchHazardData(hazard_record).then(function(hazard_data) {

						relations.num_controls = hazard_data.control_ids.length;

						factory.cloneHazardData(hazard_data, relations).then(function() {
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
			toggleHazardCloneComplete: function(hazard_id, value) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.mr_hazards;

				db.get(hazard_id).then(function(doc) {

					doc.clone_incomplete = value;

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
			}
		};

		factory.mr_controls = {
			cloneControlItemMultiple: function(control_ids, relations) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var active_index = 0;
				var saved_ids = {};

				if( control_ids.length == 0 ) {
					defer.resolve("No controls to clone");
					return defer.promise;
				}

				if( !relations )
				{
					defer.reject("No relations were specified for the multiple control clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id )
				{
					defer.reject("No activity identifier was provided for the multiple control clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id )
				{
					defer.reject("No asset identifier was provided for the multiple control clone");
					return defer.promise;
				}

				cloneControlItem(save_defer, control_ids[active_index], relations).then(function() {
					defer.resolve(saved_ids);
				}, function(error) {
					defer.reject(error);
				});

				function cloneControlItem(defer, control_id, relations) {

					factory.mr_controls.cloneControlItem(control_id, relations).then(function(saved_control) {

						active_index++;
						saved_ids[control_id] = saved_control._id;

						if( active_index > control_ids.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						cloneControlItem(defer, control_ids[active_index], relations);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			cloneControlItem: function(control_item_id, relations){
				var defer = $q.defer();

				if( !control_item_id )
				{
					defer.reject("No control item identifier found to clone");
					return defer.promise;
				}

				if( !relations )
				{
					defer.reject("No relations were specified for the control item clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id )
				{
					defer.reject("No activity identifier was provided for the control item clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id )
				{
					defer.reject("No asset identifier was provided for the control item clone");
					return defer.promise;
				}

				//GET THE SOURCE CONTROL ITEM RECORD
				riskmachDatabasesFactory.databases.collection.mr_controls.get(control_item_id).then(function(doc){

					var new_doc = angular.copy(doc);

					new_doc._id = null;
		            new_doc._rev =  null;
		            new_doc.rm_id = null;
		            new_doc.rm_ref = null;
		            new_doc.revision_number = null;
		            new_doc.rm_merge_to_ref = null;
		            new_doc.rm_asset_id = relations.rm_asset_id || null;
		            new_doc.rm_task_id = relations.rm_task_id || null;
		            new_doc.rm_task_ref = relations.rm_task_ref || null;
		            new_doc.rm_profile_image_id = null;
		            new_doc.rm_record_asset_id = null;
		            new_doc.rm_register_control_item_id = null;
		            new_doc.rm_activity_id = relations.rm_activity_id || null;
		            new_doc.activity_id = relations.activity_id;
		            new_doc.asset_id = relations.asset_id;
		            new_doc.task_id = relations.task_id;
		            new_doc.record_asset_id = null;
		            new_doc.date_added = new Date().getTime();
		            new_doc.added_by = authFactory.cloudUserId();
		            new_doc.company_id = authFactory.cloudCompanyId();
		            new_doc.date_modified = new Date().getTime();
		            new_doc.modified_by = authFactory.cloudUserId();
		            new_doc.is_register = relations.is_register;
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

		            // CHANGE NUM HAZARDS IF PROVIDED
		            if( relations.hasOwnProperty('num_hazards') ) {
		            	new_doc.num_hazards = relations.num_hazards;
		            }

		            new_doc.cloned_from_id = doc._id;
		            new_doc.cloned_from_rm_id = doc.rm_id;
		            new_doc.cloned_from_rm_ref = doc.rm_ref;

		            //SAVE THE CONTROL AND CREATE RECORD ASSET ETC
		            factory.mr_controls.doCloneControlItem(new_doc).then(function(new_doc){

		            	var media_relations = angular.copy( relations );

						media_relations.record_id = new_doc._id;
						media_relations.record_type = 'control_item';
						media_relations.rm_record_item_id = new_doc.rm_id;
						media_relations.rm_record_item_ref = new_doc.rm_ref;

						factory.media.copyAllMediaRecords(control_item_id, 'control_item', media_relations).then(function(updated_doc){

							defer.resolve(updated_doc);

						}, function(error){
							defer.reject(error);
						});

		            }, function(error){
		            	defer.reject(error);
		            });

				}).catch(function(error){
					defer.resolve("Unable to find the control item record to clone: " + error);
				});

				return defer.promise;	
			},
			doCloneControlItem: function(doc) {
				var defer = $q.defer();
				
				var options = {
					force: true
				};

				//SAVE THE CONTROL
				riskmachDatabasesFactory.databases.collection.mr_controls.post(doc, options).then(function(res){
					doc._id = res.id;
					doc._rev = res.rev;

					//SAVE THE RECORD ASSET
					factory.mr_controls.cloneControlRecordAsset(doc).then(function(doc){
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
			cloneControlRecordAsset: function(control_record){
				var defer = $q.defer();

				var options = {
					force: true
				};

				var asset_status = 1;

				//IF TASK NOT LIVE MARK RECORD ASSET AS DELETED
				if( parseInt(control_record.status) == 4 )
				{
					asset_status = 2;
				}

				console.log("CONTROL ITEM DOES NOT HAVE A RECORD ASSET - CREATING ONE");

				var is_register = 'No';

				if( control_record.hasOwnProperty('is_register') && control_record.is_register == 'Yes' )
				{
					is_register = 'Yes';
				}

				var asset_record = modelsFactory.models.newSnapshotAsset(null);
				asset_record.record_id = control_record._id;
				asset_record.record_type = 'control_item';
				asset_record.is_register = is_register;
				asset_record.status = asset_status;
				asset_record.project_id = control_record.activity_id;
				
				//SAVE TASK ASSET RECORD
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
		};

		factory.ra_question_relations = {
			cloneRaQuestionRelationMultiple: function(relation_ids, relations, cloned_relations) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				console.log(cloned_relations);

				var active_index = 0;

				if( relation_ids.length == 0 ) {
					defer.resolve("No RA Question relations to clone");
					return defer.promise;
				}

				if( !relations )
				{
					defer.reject("No relations were specified for the multiple RA Question relation clone");
					return defer.promise;
				}

				if( !cloned_relations ) 
				{
					defer.reject("No cloned relations were specified for the multiple RA Question relation clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id )
				{
					defer.reject("No activity identifier was provided for the multiple RA Question relation clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id )
				{
					defer.reject("No asset identifier was provided for the multiple RA Question relation clone");
					return defer.promise;
				}

				cloneRelation(save_defer, relation_ids[active_index], relations, cloned_relations).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function cloneRelation(defer, relation_id, relations, cloned_relations) {

					console.log(cloned_relations);

					factory.ra_question_relations.cloneRaQuestionRelation(relation_id, relations, cloned_relations).then(function(saved_relation) {

						active_index++;

						if( active_index > relation_ids.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						cloneRelation(defer, relation_ids[active_index], relations, cloned_relations);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			cloneRaQuestionRelation: function(relation_id, relations, cloned_relations){
				var defer = $q.defer();

				console.log(cloned_relations);

				if( !relation_id )
				{
					defer.reject("No RA Question relation identifier found to clone");
					return defer.promise;
				}

				if( !relations )
				{
					defer.reject("No relations were specified for the RA Question relation clone");
					return defer.promise;
				}

				if( !cloned_relations ) 
				{
					defer.reject("No cloned relations were specified for the RA Question relation clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id )
				{
					defer.reject("No activity identifier was provided for the RA Question relation clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id )
				{
					defer.reject("No asset identifier was provided for the RA Question relation clone");
					return defer.promise;
				}

				if( !cloned_relations.hasOwnProperty('checklists') ) 
				{
					defer.reject("No checklist cloned relations were provided for the RA Question relation clone");
					return defer.promise;
				}

				if( !cloned_relations.hasOwnProperty('checklist_questions') ) 
				{
					defer.reject("No checklist question cloned relations were provided for the RA Question relation clone");
					return defer.promise;
				}

				// if( !cloned_relations.hasOwnProperty('assessments') ) 
				// {
				// 	defer.reject("No risk assessment cloned relations were provided for the RA Question relation clone");
				// 	return defer.promise;
				// }

				//GET THE RA QUESTION RELATION RECORD
				riskmachDatabasesFactory.databases.collection.ra_question_relations.get(relation_id).then(function(doc){
					
					console.log("RA Q RELATION");
					console.log(doc);

					if( !cloned_relations.checklists.hasOwnProperty(doc.checklist_record_id) ) 
					{
						defer.reject("Could not find cloned checklist ID for the RA Question relation clone");
						return defer.promise;
					}

					if( doc.hasOwnProperty('is_uaudit') && doc.is_uaudit == 'Yes' ) 
					{
						if( !cloned_relations.checklist_questions.hasOwnProperty(doc.question_record_uuid) ) 
						{
							defer.reject("Could not find cloned UAudit checklist question ID for the RA Question relation clone");
							return defer.promise;
						}
					}
					else
					{
						if( !cloned_relations.checklist_questions.hasOwnProperty(doc.question_record_id) ) 
						{
							defer.reject("Could not find cloned checklist question ID for the RA Question relation clone");
							return defer.promise;
						}
					}

					if( !cloned_relations.hasOwnProperty('assessments') || !cloned_relations.assessments.hasOwnProperty(doc.assessment_id) ) 
					{
						// RISK ASSESSMENT NOT CLONED
						defer.resolve(false);
						// defer.reject("Could not find cloned risk assessment ID for the RA Question relation clone");
						return defer.promise;
					}

					var new_doc = angular.copy(doc);

					new_doc._id = null; 
					new_doc._rev = null;
					new_doc.rm_id = null;
					new_doc.rm_checklist_record_id = null;
					new_doc.checklist_record_id = cloned_relations['checklists'][doc.checklist_record_id];
					new_doc.rm_question_record_id = null;
					new_doc.rm_assessment_id = null;
					new_doc.rm_assessment_ref = null;
					new_doc.assessment_id = cloned_relations['assessments'][doc.assessment_id];
					new_doc.rm_answer_record_id = null;
					new_doc.rm_activity_id = relations.rm_activity_id || null;
					new_doc.activity_id = relations.activity_id;
					new_doc.rm_asset_id = relations.rm_asset_id || null;
					new_doc.asset_id = relations.asset_id;
					new_doc.date_linked = new Date().getTime();
					new_doc.company_id = authFactory.cloudCompanyId();
					new_doc.client_id = authFactory.getActiveCompanyId();
					new_doc.added_by = authFactory.cloudUserId();
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

					// NORMAL QUESTION-RA RELATION
					if( !doc.hasOwnProperty('is_uaudit') || doc.is_uaudit != 'Yes' ) {
						new_doc.question_record_id = cloned_relations['checklist_questions'][doc.question_record_id];
					}

					// UAUDIT QUESTION-RA RELATION
					if( doc.hasOwnProperty('is_uaudit') && doc.is_uaudit == 'Yes' ) {
						new_doc.question_record_uuid = cloned_relations['checklist_questions'][doc.question_record_uuid];
					}

					console.log("RA QUESTION RELATION");
					console.log(new_doc);

					// SET CLONED FROM IDS
					new_doc.cloned_from_id = doc._id;
					new_doc.cloned_from_rm_id = doc.rm_id;

					//SAVE THE NEW RA QUESTION RELATION RECORD
					riskmachDatabasesFactory.databases.collection.ra_question_relations.post(new_doc).then(function(result){

						new_doc._id = result.id;
						new_doc._rev = result.rev;
					
						defer.resolve(new_doc);

					}).catch(function(error){
						defer.reject("There was an error cloning the RA question relation: " + error);
					});

				}).catch(function(error){
					defer.reject("Unable to find the RA question relation to clone:" + error);
				});

				return defer.promise;
			},
			copySrcRaQuestionRelationsToNewRisk: function(src_risk_id, new_risk_relations, excluded_question) {
				var defer = $q.defer();

				factory.fetchCollection.risksRaQuestionRelations(src_risk_id, excluded_question).then(function(ra_question_relations) {

					factory.ra_question_relations.cloneRisksRaQuestionRelations(ra_question_relations, new_risk_relations).then(function(cloned_relations) {
						defer.resolve(cloned_relations);
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			cloneRisksRaQuestionRelations: function(ra_question_relations, new_risk_relations) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var cloned_relations = [];

				// NO RELATIONS TO CLONE
				if( !ra_question_relations.length ) {
					defer.resolve(cloned_relations);
					return defer.promise;
				}

				cloneNextRelation(save_defer, 0).then(function() {
					defer.resolve(cloned_relations);
				}, function(error) {
					defer.reject(error);
				});

				function cloneNextRelation(defer, active_index) {

					if( active_index > ra_question_relations.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					factory.ra_question_relations.cloneRisksRaQuestionRelationRecord(ra_question_relations[active_index], new_risk_relations).then(function(cloned_relation) {

						cloned_relations.push(cloned_relation);

						active_index++;

						cloneNextRelation(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			}, 
			cloneRisksRaQuestionRelationRecord: function(relation_record, new_risk_relations) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.ra_question_relations;

				var new_doc = angular.copy(relation_record);

				new_doc._id = null;
				new_doc._rev = null;
				new_doc.rm_id = null;

				// SET NEW RISK RELATIONS
				new_doc.rm_assessment_id = new_risk_relations.rm_assessment_id;
				new_doc.rm_assessment_ref = new_risk_relations.rm_assessment_ref;
				new_doc.assessment_id = new_risk_relations.assessment_id;

				new_doc.date_linked = new Date().getTime();
				new_doc.company_id = authFactory.cloudCompanyId();
				new_doc.client_id = authFactory.getActiveCompanyId();
				new_doc.added_by = authFactory.cloudUserId();
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

				console.log("RA QUESTION RELATION");
				console.log(new_doc);

				// SET CLONED FROM IDS
				new_doc.cloned_from_id = relation_record._id;
				new_doc.cloned_from_rm_id = relation_record.rm_id;

				db.post(new_doc, {force: true}).then(function(result) {

					new_doc._id = result.id;
					new_doc._rev = result.rev;

					defer.resolve(new_doc);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
		};

		factory.ra_control_item_relations = {
			cloneRaControlItemRelationMultiple: function(relation_ids, relations, cloned_relations) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var active_index = 0;

				if( relation_ids.length == 0 ) {
					defer.resolve("No RA Control relations to clone");
					return defer.promise;
				}

				if( !relations )
				{
					defer.reject("No relations were specified for the multiple RA Control relation clone");
					return defer.promise;
				}

				if( !cloned_relations ) 
				{
					defer.reject("No cloned relations were specified for the multiple RA Control relation clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id )
				{
					defer.reject("No activity identifier was provided for the multiple RA Control relation clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id )
				{
					defer.reject("No asset identifier was provided for the multiple RA Control relation clone");
					return defer.promise;
				}

				cloneRelation(save_defer, relation_ids[active_index], relations, cloned_relations).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function cloneRelation(defer, relation_id, relations, cloned_relations) {

					factory.ra_control_item_relations.cloneRaControlItemRelation(relation_id, relations, cloned_relations).then(function(saved_relation) {

						active_index++;

						if( active_index > relation_ids.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						cloneRelation(defer, relation_ids[active_index], relations);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			cloneRaControlItemRelation: function(relation_id, relations, cloned_relations){
				var defer = $q.defer();

				if( !relation_id )
				{
					defer.reject("No RA Control relation identifier found to clone");
					return defer.promise;
				}

				if( !relations )
				{
					defer.reject("No relations were specified for the RA Control relation clone");
					return defer.promise;
				}

				if( !cloned_relations ) 
				{
					defer.reject("No cloned relations were specified for the RA Control relation clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id )
				{
					defer.reject("No activity identifier was provided for the RA Control relation clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id )
				{
					defer.reject("No asset identifier was provided for the RA Control relation clone");
					return defer.promise;
				}

				// if( !cloned_relations.hasOwnProperty('assessments') ) 
				// {
				// 	defer.reject("No risk assessment cloned relations were provided for the RA Control relation clone");
				// 	return defer.promise;
				// }

				// if( !cloned_relations.hasOwnProperty('control_items') ) 
				// {
				// 	defer.reject("No control item cloned relations were provided for the RA Control relation clone");
				// 	return defer.promise;
				// }

				//GET THE RA CONTROL RELATION RECORD
				riskmachDatabasesFactory.databases.collection.ra_control_item_relations.get(relation_id).then(function(doc){
					
					if( !cloned_relations.hasOwnProperty('assessments') || !cloned_relations.assessments.hasOwnProperty(doc.assessment_id) ) 
					{
						// RISK ASSESSMENT WAS NOT CLONED
						defer.resolve(false);
						// defer.reject("Could not find risk assessment ID for the RA Control relation clone");
						return defer.promise;
					}

					if( !cloned_relations.hasOwnProperty('control_items') || !cloned_relations.control_items.hasOwnProperty(doc.control_item_id) ) 
					{
						//	CONTROL ITEM WAS NOT CLONED
						defer.resolve(false);
						// defer.reject("Could not find cloned control item ID for the RA Control relation clone");
						return defer.promise;
					}

					var new_doc = angular.copy(doc);

					new_doc._id = null; 
					new_doc._rev = null;
					new_doc.rm_id = null;
					new_doc.rm_control_item_id = null;
					new_doc.rm_control_item_ref = null;
					new_doc.control_item_id = cloned_relations['control_items'][doc.control_item_id];
					new_doc.rm_assessment_id = null;
					new_doc.rm_assessment_ref = null;
					new_doc.assessment_id = cloned_relations['assessments'][doc.assessment_id];
					new_doc.rm_control_id = null;
					new_doc.rm_activity_id = relations.rm_activity_id || null;
					new_doc.activity_id = relations.activity_id;
					new_doc.rm_asset_id = relations.rm_asset_id || null;
					new_doc.asset_id = relations.asset_id;
					new_doc.date_added = new Date().getTime();
					new_doc.added_by = authFactory.cloudUserId();
					new_doc.date_modified = null;
					new_doc.modified_by = null;
					new_doc.company_id = authFactory.cloudCompanyId();
					new_doc.client_id = authFactory.getActiveCompanyId();
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

					//SAVE THE NEW RA CONTROL ITEM RELATION RECORD
					riskmachDatabasesFactory.databases.collection.ra_control_item_relations.post(new_doc).then(function(result){

						new_doc._id = result.id;
						new_doc._rev = result.rev;
					
						defer.resolve(new_doc);

					}).catch(function(error){
						defer.reject("There was an error cloning the RA control relation: " + error);
					});

				}).catch(function(error){
					defer.reject("Unable to find the RA control relation to clone:" + error);
				});

				return defer.promise;
			},
		};

		factory.hazard_control_relations = {
			cloneHazardControlRelationMultiple: function(relation_ids, relations, cloned_relations) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var active_index = 0;

				if( relation_ids.length == 0 ) {
					defer.resolve("No Hazard Control relations to clone");
					return defer.promise;
				}

				if( !relations )
				{
					defer.reject("No relations were specified for the multiple Hazard Control relation clone");
					return defer.promise;
				}

				if( !cloned_relations ) 
				{
					defer.reject("No cloned relations were specified for the multiple Hazard Control relation clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id )
				{
					defer.reject("No activity identifier was provided for the multiple Hazard Control relation clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id )
				{
					defer.reject("No asset identifier was provided for the multiple Hazard Control relation clone");
					return defer.promise;
				}

				cloneRelation(save_defer, relation_ids[active_index], relations, cloned_relations).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function cloneRelation(defer, relation_id, relations, cloned_relations) {

					factory.hazard_control_relations.cloneHazardControlRelation(relation_id, relations, cloned_relations).then(function(saved_relation) {

						active_index++;

						if( active_index > relation_ids.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						cloneRelation(defer, relation_ids[active_index], relations, cloned_relations);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			cloneHazardControlRelation: function(relation_id, relations, cloned_relations){
				var defer = $q.defer();

				if( !relation_id )
				{
					defer.reject("No Hazard Control relation identifier found to clone");
					return defer.promise;
				}

				if( !relations )
				{
					defer.reject("No relations were specified for the Hazard Control relation clone");
					return defer.promise;
				}

				if( !cloned_relations ) 
				{
					defer.reject("No cloned relations were specified for the Hazard Control relation clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id )
				{
					defer.reject("No activity identifier was provided for the Hazard Control relation clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id )
				{
					defer.reject("No asset identifier was provided for the Hazard Control relation clone");
					return defer.promise;
				}

				if( !cloned_relations.hasOwnProperty('mr_hazards') ) 
				{
					defer.reject("No hazard cloned relations were provided for Hazard Control relation clone");
					return defer.promise;
				}

				if( !cloned_relations.hasOwnProperty('mr_controls') ) 
				{
					defer.reject("No control item cloned relations were provided for Hazard Control relation clone");
					return defer.promise;
				}

				//GET THE HAZARD CONTROL RELATION RECORD
				riskmachDatabasesFactory.databases.collection.hazard_control_relations.get(relation_id).then(function(doc){
					
					if( !cloned_relations.mr_hazards.hasOwnProperty(doc.hazard_id) ) 
					{
						defer.reject("Could not find hazard ID for Hazard Control relation clone");
						return defer.promise;
					}


					if( !cloned_relations.mr_controls.hasOwnProperty(doc.control_item_id) ) 
					{
						defer.reject("Could not find cloned control item ID for Hazard Control relation clone");
						return defer.promise;
					}

					var new_doc = angular.copy(doc);

					new_doc._id = null;
					new_doc._rev = null;
					new_doc.rm_id = null;
					new_doc.hazard_id = cloned_relations['mr_hazards'][doc.hazard_id];
					new_doc.control_item_id = cloned_relations['mr_controls'][doc.control_item_id];
					new_doc.date_linked = new Date().getTime();
					new_doc.linked_by = authFactory.cloudUserId();
					new_doc.date_modified = null;
					new_doc.modified_by = null;
					new_doc.assessment_id = null;
					new_doc.rm_hazard_id = null;
					new_doc.rm_hazard_ref = null;
					new_doc.rm_control_item_id = null;
					new_doc.rm_control_item_ref = null;
					new_doc.rm_assessment_id = null;
					new_doc.rm_activity_id = relations.rm_activity_id || null;
					new_doc.rm_asset_id = relations.rm_asset_id || null;
					new_doc.activity_id = relations.activity_id;
					new_doc.asset_id = relations.asset_id;
					new_doc.company_id = authFactory.cloudCompanyId();
					new_doc.client_id = authFactory.getActiveCompanyId();
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

					//SAVE THE NEW HAZARD CONTROL ITEM RELATION RECORD
					riskmachDatabasesFactory.databases.collection.hazard_control_relations.post(new_doc).then(function(result){

						new_doc._id = result.id;
						new_doc._rev = result.rev;
					
						defer.resolve(new_doc);

					}).catch(function(error){
						defer.reject("There was an error cloning the hazard control relation: " + error);
					});

				}).catch(function(error){
					defer.reject("Unable to find the hazard control relation to clone:" + error);
				});

				return defer.promise;
			},
		};

		factory.media = {
			copyAllMediaRecords: function(src_record_id, record_type, relations){
				var defer = $q.defer();

				if( !src_record_id )
				{
					defer.reject("No source record identifier provided for media clone");
					return defer.promise;
				}

				if( !record_type )
				{
					defer.reject("No record type was provided for media clone");
					return defer.promise;
				}

				if( !relations )
				{
					defer.reject("No relations have been provided for the media clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('record_id') || !relations.record_id )
				{
					defer.reject("No destination identifier was provided for the media clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('record_type') || !relations.record_type )
				{
					defer.reject("No destination record type was provided for the media clone");
					return defer.promise;
				}

				var actual_record_type = null;
				if( record_type == 'snapshot_asset' ) {
					actual_record_type = 'asset';
				} else {
					actual_record_type = record_type;
				}

				//GET MEDIA RECORDS
				riskmachDatabasesFactory.databases.collection.media.find({
					selector: {
						table: 'mediarecords',
						record_id: src_record_id,
						record_type: actual_record_type
					}
				}).then(function(result){

					var rm_ids = [];

					// FILTER LATEST MEDIA REVISIONS
					var filtered_array = [];
					var i = 0;
					var len = result.docs.length;
					while(i < len) {
						var errors = 0;
						var dupe_img = false;

						if( result.docs[i].item_not_found == 'Yes' ) {
							errors++;
						}

						// IF SIGNATURE IMAGE, DON'T CLONE
						if( record_type == 'task' && result.docs[i].hasOwnProperty('is_signature') && result.docs[i].is_signature == 'Yes' ) {
							errors++;
						}

						// IF PDF, DON'T CLONE
						if( result.docs[i].hasOwnProperty('is_pdf') && result.docs[i].is_pdf == 'Yes' ) {
							errors++;
						}

						// IF IMAGE HAS BEEN SUPERSEEDED, DON'T CLONE
						if( result.docs[i].hasOwnProperty('superseeded') && result.docs[i].superseeded == 'Yes' ) {
							errors++;
						}

						// IF NO ERRORS, ADD TO ARRAY
						if( errors == 0 ) {

							// IF ASSESSMENT MEDIA, HAS RMID AND NOT DELETED
							if( record_type == 'assessment' && result.docs[i].hasOwnProperty('rm_id') && result.docs[i].rm_id && result.docs[i].status != 3 ) {

								// CHECK FOR DUPE RMIDS
								if( rm_ids.indexOf(result.docs[i].rm_id) === -1 ) {
									rm_ids.push(result.docs[i].rm_id);
								} else {
									dupe_img = true;
								}

							}

							if( !dupe_img ) {
								filtered_array.push(result.docs[i]._id);
							}
						}

						i++;
					}

					// CLEAN UP FETCHED DATA
					result.docs = null;
				
					//DEFINE MEDIA CLONES METHOD
					function cloneMediaRecords(media_ids, relations, current_index, defer){

						if( !media_ids.length )
						{
							defer.resolve();
							return defer.promise;
						}

						if( current_index > media_ids.length - 1 )
						{
							defer.resolve();
							return defer.promise;
						}

						//CLONE THE CURRENT MEDIA RECORD
						var current_id = media_ids[ current_index ];

						factory.media.copyMediaRecord(current_id, null, relations).then(function(cloned_media_record) {

							// CLEAN UP CLONED MEDIA RECORD
							cloned_media_record = null;

							//CLONE THE NEXT ONE
							current_index++;
							cloneMediaRecords(media_ids, relations, current_index, defer);

						}).catch(function(error){
							defer.reject(error);
						});

						return defer.promise;
					}

					//START CLONE MEDIA CLONES
					var media_defer = $q.defer();

					cloneMediaRecords(filtered_array, relations, 0, media_defer).then(function(){

						// CLEAN UP FETCHED MEDIA IDS
						filtered_array = [];
						filtered_array = null;

						factory.media.updateRecordMediaMeta(relations.record_id, record_type).then(function(saved_doc) {
							defer.resolve(saved_doc);
						}, function(error) {
							defer.reject(error);
						});

					}, function(error){
						defer.reject(error);
					});

				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			copyMediaRecord: function(src_media_id, src_media_record, relations) {
				var defer = $q.defer();

				if( !src_media_id && !src_media_record )
				{
					defer.reject("Unable to find the source media record");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('record_id') || !relations.record_id )
				{
					defer.reject("No destination identifier was provided for the media clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('record_type') || !relations.record_type )
				{
					defer.reject("No destination record type was provided for the media clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('client_id') || !relations.client_id ) 
				{
					defer.reject("No destination client id was provided for media clone");
					return defer.promise;
				}

				//GET THE MEDIA RECORD
				factory.media.getMediaDoc(src_media_id, src_media_record).then(function(doc){

					// CHECK IF IMAGE CAN BE CLONED
					if( !factory.utils.canCloneImage(doc, relations).can_clone ) {
						
						// TRIP ERROR
						factory.image_errors.cannotCloneImage();

						// SET COULD NOT CLONE FIELD
						doc.could_not_clone = true;

						defer.resolve(doc);
						return defer.promise;
					}

					// IF NOT A POOL IMAGE, AND BEING CLONED TO A DIFFERENT COMPANY
					// if( doc.is_pool_item != 'Yes' && doc.client_id && doc.client_id != relations.client_id ) {
					// 	defer.resolve("Media can not be cloned across companies");
					// 	return defer.promise;
					// }

					var new_media = angular.copy(doc);
					factory.media.formatMediaRecordForClone(new_media, doc, relations);

					// IF NOT LIVE IMAGE, DON'T CLONE
					if( new_media.status != 1 ) {

						// CLEAN UP
						doc = null;
						new_media = null;

						defer.resolve(false);
						return defer.promise;
					}

					//SAVE THE NEW MEDIA RECORD
					riskmachDatabasesFactory.databases.collection.media.post(new_media, { force: true }).then(function(result){

						new_media._id = result.id;
						new_media._rev = result.rev;

						console.log("NEW MEDIA RECORD");
						console.log(new_media);

						// IF TASK, UPDATE video_media_id, audio_media_id
						if( new_media.record_type == 'task' ) 
						{
							factory.media.updateTaskMediaIds(new_media.record_id, new_media).then(function() {

								// IF FILE NOT PRESENT, DON'T CLONE
								if( new_media.file_downloaded == null ) {

									// CLEAN UP ORIG DOC
									doc = null;

									defer.resolve(new_media);
									return defer.promise;
								}

								// IF MEDIA HAS NO FILE
								if( new_media.hasOwnProperty('file_does_not_exist') && new_media.file_does_not_exist ) {
									
									// CLEAN UP ORIG DOC
									doc = null;

									defer.resolve(new_media);
									return defer.promise;
								}

								factory.media.cloneMediaFile(src_media_id, doc.attachment_key, new_media).then(function(new_media) {
									
									// CLEAN UP ORIG DOC
									doc = null;

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

								// CLEAN UP ORIG DOC
								doc = null;

								defer.resolve(new_media);
								return defer.promise;
							}

							// IF MEDIA HAS NO FILE
							if( new_media.file_does_not_exist ) {

								// CLEAN UP ORIG DOC
								doc = null;

								defer.resolve(new_media);
								return defer.promise;
							}
  
							factory.media.cloneMediaFile(src_media_id, doc.attachment_key, new_media).then(function(new_media) {
								
								// CLEAN UP ORIG DOC
								doc = null;

								defer.resolve(new_media);
							}, function(error) {
								defer.reject(error);
							});
						}

					}).catch(function(error){
						defer.reject(error);
					});

				}).catch(function(error){
					defer.reject("Error finding the media record for clone: " + error);
				});

				return defer.promise;
			},
			copyUAuditMediaRecordV1: function(src_media_id, src_media_record, relations) {
				var defer = $q.defer();

				if( !src_media_id && !src_media_record )
				{
					defer.reject("Unable to find the source media record");
					return defer.promise;
				}

				// if( !relations.hasOwnProperty('record_item_uuid') || !relations.record_item_uuid )
				// {
				// 	defer.reject("No destination unique identifier was provided for the media clone");
				// 	return defer.promise;
				// }

				// if( !relations.hasOwnProperty('record_type') || !relations.record_type )
				// {
				// 	defer.reject("No destination record type was provided for the media clone");
				// 	return defer.promise;
				// }

				if( !relations.hasOwnProperty('client_id') || !relations.client_id ) 
				{
					defer.reject("No destination client id was provided for media clone");
					return defer.promise;
				}

				//GET THE MEDIA RECORD
				factory.media.getMediaDoc(src_media_id, src_media_record).then(function(doc){

					// IF NOT A POOL IMAGE, AND BEING CLONED TO A DIFFERENT COMPANY
					if( doc.is_pool_item != 'Yes' && doc.client_id && doc.client_id != relations.client_id ) {
						defer.resolve("Media can not be cloned across companies");
						return defer.promise;
					}

					// FORMATTED IN UAUDIT JSON FORMATTING ROUTINE
					// factory.media.formatMediaRecordForClone(doc, null, relations);

					// IF NOT LIVE IMAGE, DON'T CLONE
					if( doc.status != 1 ) {
						defer.resolve(false);
						return defer.promise;
					}

					// CLEAR TO SAVE AS NEW
					doc._id = null;
					doc._rev = null;

					//SAVE THE NEW MEDIA RECORD
					riskmachDatabasesFactory.databases.collection.media.post(doc, { force: true }).then(function(result){

						doc._id = result.id;
						doc._rev = result.rev;

						console.log("NEW U AUDIT MEDIA RECORD");
						console.log(doc);

						// IF FILE NOT PRESENT, DON'T CLONE
						if( doc.file_downloaded == null ) {
							defer.resolve(doc);
							return defer.promise;
						}

						factory.media.cloneMediaFile(src_media_id, doc.attachment_key, doc).then(function() {
							defer.resolve(doc);
						}, function(error) {
							defer.reject(error);
						});

					}).catch(function(error){
						console.log("ERROR SAVING UAUDIT MEDIA RECORD: " + error);
						defer.reject(error);
					});

				}).catch(function(error){
					defer.reject("Error finding the media record for clone: " + error);
				});

				return defer.promise;
			},
			saveNewUAuditMediaRecord: function(media_record, relations) {
				var defer = $q.defer();

				if( !media_record )
				{
					defer.reject("Unable to find the media record for clone");
					return defer.promise;
				}

				// if( !relations.hasOwnProperty('record_item_uuid') || !relations.record_item_uuid )
				// {
				// 	defer.reject("No destination unique identifier was provided for the media clone");
				// 	return defer.promise;
				// }

				// if( !relations.hasOwnProperty('record_type') || !relations.record_type )
				// {
				// 	defer.reject("No destination record type was provided for the media clone");
				// 	return defer.promise;
				// }

				if( !relations.hasOwnProperty('client_id') || !relations.client_id ) 
				{
					defer.reject("No destination client id was provided for media clone");
					return defer.promise;
				}

				
				// IF NOT A POOL IMAGE, AND BEING CLONED TO A DIFFERENT COMPANY
				if( media_record.is_pool_item != 'Yes' && media_record.client_id && media_record.client_id != relations.client_id ) {
					defer.resolve("Media can not be cloned across companies");
					return defer.promise;
				}

				// FORMATTED IN UAUDIT JSON FORMATTING ROUTINE
				// factory.media.formatMediaRecordForClone(doc, null, relations);

				// IF NOT LIVE IMAGE, DON'T CLONE
				if( media_record.status != 1 ) {
					defer.resolve(false);
					return defer.promise;
				}

				//SAVE THE NEW MEDIA RECORD
				riskmachDatabasesFactory.databases.collection.media.post(media_record, { force: true }).then(function(result){

					media_record._id = result.id;
					media_record._rev = result.rev;

					console.log("NEW U AUDIT MEDIA RECORD");
					console.log(media_record);

					// IF FILE NOT PRESENT, DON'T CLONE
					if( media_record.file_downloaded == null ) {
						defer.resolve(media_record);
						return defer.promise;
					}

					factory.media.cloneMediaFile(media_record.cloned_from_id, media_record.attachment_key, media_record).then(function() {
						defer.resolve(media_record);
					}, function(error) {
						defer.reject(error);
					});

				}).catch(function(error){
					console.log("ERROR SAVING UAUDIT MEDIA RECORD: " + error);
					defer.reject(error);
				});

				return defer.promise;
			},
			getMediaDoc: function(src_media_id, src_media_record) {
				var defer = $q.defer();

				if( src_media_record ) {
					defer.resolve(src_media_record);
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.media;

				db.get(src_media_id).then(function(doc) {
					defer.resolve(doc);
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			cloneMediaFile: function(src_media_id, src_attachment_key, new_media) {
				var defer = $q.defer();

				//MOVE THE PHYSICAL FILE TO NEW MEDIA RECORD
				riskmachDatabasesFactory.databases.collection.media.getAttachment(src_media_id, src_attachment_key).then(function(blob){

					// var new_file = new File([blob], src_attachment_key);

					riskmachDatabasesFactory.databases.collection.media.putAttachment(new_media._id, src_attachment_key, new_media._rev, blob, blob.type).then(function(media_result){

						new_media._id = media_result.id;
						new_media._rev = media_result.rev;

						// CLEAN UP
						new_file = null;
						blob = null;

						defer.resolve(new_media);

					}).catch(function(error){
						console.log(error);
						defer.reject("Error cloning media file: " + error);
					});

				}).catch(function(error){
					console.log(error);
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

				riskmachDatabasesFactory.databases.collection.tasks.get(task_id).then(function(task_doc) {

					if( media_record.is_video ) {
						task_doc.video_media_id = media_record._id;
					}

					if( media_record.is_audio ) {
						task_doc.audio_media_id = media_record._id;
					}

					riskmachDatabasesFactory.databases.collection.tasks.put(task_doc).then(function(result) {
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
			getRecordMedia: function(record_id, record_type) {
				var defer = $q.defer();

				if( record_type == 'snapshot_asset' )
				{
					record_type = 'asset';
				}

				if( record_type == 'ra_control_item' )
				{
					record_type = 'control_item';
				}

				riskmachDatabasesFactory.databases.collection.media.find({
					selector: {
						table: 'mediarecords',
						record_id: record_id,
						record_type: record_type
					}
				}).then(function(result){
					defer.resolve(result.docs);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			updateRecordMediaMeta: function(record_id, record_type) {
				var defer = $q.defer();

				factory.media.getRecordMedia(record_id, record_type).then(function(media_records) {

					factory.media.updateRecordFileCount(record_id, record_type, media_records).then(function(saved_doc) {

						if( record_type == 'assessment' ) {

							factory.media.updateRiskProfileImg(record_id, media_records).then(function(updated_doc) {

								// CLEAN UP FETCHED DATA
								media_records = null;

								defer.resolve(updated_doc);

							}, function(error) {
								defer.reject(error);
							});

						} else {

							// CLEAN UP FETCHED DATA
							media_records = null;

							defer.resolve(saved_doc);
						}

					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			updateRecordFileCount: function(record_id, record_type, media_records) {
				var defer = $q.defer();

				console.log(media_records);

				var num_attachments = 0;

				angular.forEach(media_records, function(media_record, media_index) {

					if( parseInt(media_record.status) == 1 && !media_record.is_video && !media_record.is_audio ) {
						num_attachments++;
					};

				});

				factory.media.doUpdateRecordFileCount(record_id, record_type, num_attachments).then(function(saved_doc) {
					defer.resolve(saved_doc);
				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			doUpdateRecordFileCount: function(record_id, record_type, num_attachments) {
				var defer = $q.defer();

				if( record_type == 'asset' ) {
					riskmachDatabasesFactory.databases.collection.register_assets.get(record_id).then(function(doc) {
						doc.num_files = num_attachments;

						riskmachDatabasesFactory.databases.collection.register_assets.post(doc, {force: true}).then(function(result) {
							doc._id = result.id;
							doc._rev = result.rev;
							defer.resolve(doc);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});
				};

				if( record_type == 'snapshot_asset' ) {
					riskmachDatabasesFactory.databases.collection.assets.get(record_id).then(function(doc) {
						doc.num_files = num_attachments;

						riskmachDatabasesFactory.databases.collection.assets.post(doc, {force: true}).then(function(result) {
							doc._id = result.id;
							doc._rev = result.rev;
							defer.resolve(doc);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});
				};

				if( record_type == 'task' ) {
					riskmachDatabasesFactory.databases.collection.tasks.get(record_id).then(function(doc) {
						doc.num_files = num_attachments;

						riskmachDatabasesFactory.databases.collection.tasks.post(doc, {force: true}).then(function(result) {
							doc._id = result.id;
							doc._rev = result.rev;
							defer.resolve(doc);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});
				};

				if( record_type == 'assessment_hazard' ) {
					riskmachDatabasesFactory.databases.collection.mr_hazards.get(record_id).then(function(doc) {
						doc.num_files = num_attachments;

						riskmachDatabasesFactory.databases.collection.mr_hazards.post(doc, {force: true}).then(function(result){
							doc._id = result.id;
							doc._rev = result.rev;
							defer.resolve(doc);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});
				};

				if( record_type == 'control_item' || record_type == 'ra_control_item' ) {
					riskmachDatabasesFactory.databases.collection.mr_controls.get(record_id).then(function(doc) {
						doc.num_files = num_attachments;

						riskmachDatabasesFactory.databases.collection.mr_controls.post(doc, {force: true}).then(function(result){
							doc._id = result.id;
							doc._rev = result.rev;
							defer.resolve(doc);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});
				};

				if( record_type == 'assessment' ) {
					riskmachDatabasesFactory.databases.collection.assessments.get(record_id).then(function(doc) {
						doc.num_files = num_attachments;

						riskmachDatabasesFactory.databases.collection.assessments.post(doc, {force: true}).then(function(result){
							doc._id = result.id;
							doc._rev = result.rev;
							defer.resolve(doc);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});
				};

				return defer.promise;
			},
			updateRiskProfileImg: function(record_id, media_records) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.assessments;

				var profile_img_data = factory.utils.calcRiskProfileImg(media_records);

				db.get(record_id).then(function(doc) {

					doc.profile_img_id = profile_img_data.profile_img_id;
					doc.profile_img_attachment_key = profile_img_data.profile_img_attachment_key;
					doc.profile_img_download_required = profile_img_data.profile_img_download_required;

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
			formatMediaRecordForClone: function(media_record, src_doc, relations) {
				var unset_src_doc = false;

				if( !src_doc ) {
					src_doc = angular.copy(media_record);
					unset_src_doc = true;
				}

				// SET CLONED FROM IDS
				media_record.cloned_from_id = src_doc._id;
				media_record.cloned_from_rm_id = src_doc.rm_id;
				media_record.cloned_from_rm_ref = src_doc.rm_ref;

				if( media_record.hasOwnProperty('is_uaudit') && media_record.is_uaudit == 'Yes' ) {
					
					//SET CLONED FROM UUID
					media_record.cloned_from_uuid = media_record.id;

					//CREATE NEW UUID FOR MEDIA RECORD
					media_record.id = rmUtilsFactory.utils.createUUID();
					
					if( relations.hasOwnProperty('checklist_instance_id') && relations.checklist_instance_id ) {
						media_record.checklist_instance_id = relations.checklist_instance_id;
					}

					if( relations.hasOwnProperty('checklist_instance_json_id') && relations.checklist_instance_json_id ) {
						media_record.checklist_instance_json_id = relations.checklist_instance_json_id;
					}

				} else {
					media_record.id = null;
				}

				// IF NOT SET, SET AS RMID OF EXISTING DOC
				if( media_record.file_download_rm_id == null ) {
					media_record.file_download_rm_id = src_doc.rm_id;
				}

				media_record._id = null;
				media_record._rev = null;
				media_record.date_record_synced = null;
				media_record.date_content_synced = null;
				media_record.date_record_imported = null;
				media_record.date_content_imported = null;
				media_record.record_modified = 'Yes';
				// media_record.record_id = relations.record_id;
				// media_record.record_type = relations.record_type;
				media_record.rm_id = null;
				media_record.rm_ref = null;
				media_record.rm_revision_number = null;
				media_record.rm_record_item_id = relations.rm_record_item_id || null;
				media_record.rm_record_item_ref = relations.rm_record_item_ref || null;
				media_record.rm_activity_id = relations.rm_activity_id || null;
				media_record.activity_id = relations.activity_id;
				media_record.user_id = authFactory.cloudUserId();
				media_record.company_id = authFactory.cloudCompanyId();
				media_record.rm_record = null;
				media_record.is_register = relations.is_register;
				media_record.added_by = authFactory.cloudUserId();
				media_record.date_added = new Date().getTime();
				media_record.modified_by = authFactory.cloudUserId();
				media_record.date_modified = new Date().getTime();
				media_record.mid_record_id = null;
				media_record.sync_id = null;
				media_record.representative_image = 'Yes';
				media_record.is_pool_item = null;
				media_record.synced = false;
				media_record.imported = false;

				// SET CLIENT ID
				media_record.client_id = authFactory.getClientId();

				if( media_record.hasOwnProperty('downloaded_rm_values') && media_record.downloaded_rm_values ) {
					media_record.downloaded_rm_values = null;
				}

				if( src_doc.hasOwnProperty('is_pool_item') && src_doc.is_pool_item == 'Yes' ) {
					media_record.insensitive_media = 'Yes';
					media_record.date_insensitive_media = new Date().getTime();
					media_record.insensitive_media_by = authFactory.cloudUserId();
					media_record.insensitive_media_reason = 'System message: The image is from the pool';
				}

				media_record.CLONEDMEDIARECORD = 'Yes';

				if( relations.hasOwnProperty('record_id') && relations.record_id ) {
					media_record.record_id = relations.record_id;
				}

				if( relations.hasOwnProperty('record_type') && relations.record_type ) {
					media_record.record_type = relations.record_type;
				}

				// if( relations.hasOwnProperty('record_item_uuid') && relations.record_item_uuid ) {
				// 	media_record.record_item_uuid = relations.record_item_uuid;
				// }

				// IF FILE IS PRESENT, UNSET RMID FOR FILE DOWNLOAD
				if( media_record.file_downloaded == 'Yes' ) {
					media_record.file_download_rm_id = null;
				}

				// FORMAT STATUS
				if( !media_record.hasOwnProperty('status') || !media_record.status || media_record.status == '0' || media_record.status == 0 ) {
					media_record.status = 1;
				}

				// IF NOT LIVE OR DELETED, SET TO DELETED
				if( media_record.status != 1 && media_record.status != 3 ) {
					media_record.status = 3;
				}

				if( unset_src_doc ) {
					src_doc = null;
				}
			},
			cloneUAuditMedia: function(checklist_data, relations, question_ids_container) {
				var defer = $q.defer();
				var clone_defer = $q.defer();

				cloneNextMediaRecord(clone_defer, 0).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function cloneNextMediaRecord(defer, active_index) {

					if( active_index > checklist_data.media.collection.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					//ANSWER SETUP MEDIA, SKIP
					if( checklist_data.media.collection[active_index].record_type == 'question_image' ) {
						active_index++;
						cloneNextMediaRecord(defer, active_index);
					} else {

						var src_media_id = checklist_data.media.collection[active_index].cloned_from_id;

						console.log(src_media_id);
						console.log(checklist_data.media.collection[active_index]);

						factory.media.saveNewUAuditMediaRecord(checklist_data.media.collection[active_index], relations).then(function() {

							// checklist_data.media.collection[active_index] = angular.copy(cloned_media_record);

							// CLEAN UP
							// cloned_media_record = null;

							active_index++;

							cloneNextMediaRecord(defer, active_index);

						}).catch(function(error){
							console.log(error);
							defer.reject(error);
						});

					}

					return defer.promise;
				}

				return defer.promise;
			}
		};

		factory.register_assets = {
			startCloneRegisterAssetData: function(src_asset_id, relations) {
				var defer = $q.defer();

				factory.dbUtils.fetchRegisterAssetData(src_asset_id, relations).then(function(data) {

					factory.cloneRegisterAssetData(data, relations).then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			cloneRegisterAssetRecord: function(core_asset_id, relations) {
				var defer = $q.defer();

				if( !core_asset_id ) {
					defer.reject("No Core asset identifier provided");
					return defer.promise;
				}

				if( !relations ) {
					defer.reject("No relations provided for Core asset clone");
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.register_assets;

				db.get(core_asset_id).then(function(doc) {

					var new_doc = angular.copy(doc);
					new_doc._id = null; 
					new_doc._rev = null;
					new_doc.rm_id = null; 
					
					if( relations.site.hasOwnProperty('id') && relations.site.id ) {
						new_doc.site_id = relations.site.id;
						new_doc.rm_site_id = relations.site.rm_id;
						new_doc.site_name = relations.site.name;
					}

					if( relations.building.hasOwnProperty('id') && relations.building.id ) {
						new_doc.building_id = relations.building.id;
						new_doc.rm_building_id = relations.building.rm_id;
						new_doc.building_name = relations.building.name;
					}

					if( relations.area.hasOwnProperty('id') && relations.area.id ) {
						new_doc.area_id = relations.area.id;
						new_doc.rm_area_id = relations.area.rm_id;
						new_doc.area_name = relations.area.name;
					}

					if( relations.parent_asset.hasOwnProperty('id') && relations.parent_asset.id ) {
						new_doc.parent_asset_id = relations.parent_asset.id;
						new_doc.rm_parent_asset_id = relations.parent_asset.rm_id;
						new_doc.parent_asset_ref = relations.parent_asset.name;
					}

					// UPDATE ASSET REF
					new_doc.asset_ref += ' - CLONED';
					// CLEAR SERIAL
					new_doc.serial = null;

					new_doc.user_id = authFactory.cloudUserId();
					new_doc.company_id = authFactory.getActiveCompanyId();
					new_doc.date_added = new Date().getTime();
					new_doc.added_by = authFactory.cloudUserId();
					new_doc.date_modified = new Date().getTime();
					new_doc.modified_by = authFactory.cloudUserId();

					new_doc.record_modified = 'Yes';
					new_doc.date_record_synced = null;
					new_doc.date_content_synced = null; 
					new_doc.date_record_imported = null;
					new_doc.date_content_imported = null;
					new_doc.rm_record = null; 
					new_doc.rm_record_modified = 'No';
					new_doc.is_register = 'Yes';

					new_doc.status = 1;
					new_doc.in_use = 'Yes';

					new_doc.num_files = null;
					new_doc.qr_codes = null;
					new_doc.rm_asset_report_id = null;
					new_doc.rm_asset_report_ref = null;
					new_doc.asset_report_updated_by_id = null; 
					new_doc.asset_report_updated_by_name = null; 
					new_doc.asset_report_updated_date = null;
					new_doc.rm_profile_image_media_id = null; 
					new_doc.profile_image_media_id = null;
					new_doc.rm_last_inspection_id = null;
					new_doc.days_since_inspection = null;
					new_doc.next_inspection_date = null;
					new_doc.next_scheduled_inspection_date = null;
					new_doc.days_to_next_inspection = null;
					new_doc.rm_last_inspection_snapshot_id = null;
					new_doc.inspection_due = null;
					new_doc.last_inspection_date = null;
					new_doc.puwer_interval = null;
					new_doc.num_open_puwer_activities = null;
					new_doc.rm_assembly_group_id = null;
					new_doc.deterioration_risk = null;
					new_doc.excluded_from_inspection = null;
					new_doc.requires_inspection = null;
					new_doc.frequency_interval = null;
					new_doc.frequency = null;
					new_doc.ever_inspected = null;
					new_doc.health_check_date = null;
					new_doc.has_inspected_parent = null;
					new_doc.compliance_supplier_company_id = null;
					new_doc.compliance_supplier_company_name = null;
					new_doc.num_children = null;
					new_doc.observation_text = null;

					// EXTERNAL REF SHOULD BE UNIQUE PER ASSET
					new_doc.external_ref = null;

					db.post(new_doc, {force: true}).then(function(result) {

						new_doc._id = result.id;
						new_doc._rev = result.rev;

						defer.resolve(new_doc);

					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
		}

		factory.ipp_scores = {
			cloneIppScoreMultiple: function(ipp_score_ids, relations) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var active_index = 0;
				var saved_ids = {};

				if( ipp_score_ids.length == 0 ) {
					defer.resolve("No IPP scores to clone");
					return defer.promise;
				}

				if( !relations ) {
					defer.reject("No relations were specified for the multiple IPP score clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id ) {
					defer.reject("No asset identifier provided for IPP score clone");
					return defer.promise;
				}

				cloneIppScore(save_defer, ipp_score_ids[active_index], relations).then(function() {
					defer.resolve(saved_ids);
				}, function(error) {
					defer.reject(error);
				});

				function cloneIppScore(defer, ipp_score_id, relations) {

					factory.ipp_scores.cloneIppScore(ipp_score_id, relations).then(function(saved_ipp_score) {

						active_index++;
						saved_ids[ipp_score_id] = saved_ipp_score._id;

						if( active_index > ipp_score_ids.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						cloneIppScore(defer, ipp_score_ids[active_index], relations);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			cloneIppScore: function(ipp_score_id, relations) {
				var defer = $q.defer();

				if( !relations.hasOwnProperty('asset_id') || !relations.asset_id ) {
					defer.reject("No asset identifier provided for IPP score clone");
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.register_asset_ipp;

				db.get(ipp_score_id).then(function(doc) {

					var new_doc = angular.copy(doc);
					new_doc._id = null; 
					new_doc._rev = null;

					new_doc.rm_pp_asset_relation_id = null;

					new_doc.asset_id = relations.asset_id;
					new_doc.rm_asset_id = relations.rm_asset_id;
					new_doc.asset_ref = relations.asset_ref;

					new_doc.user_id = authFactory.cloudUserId();
					new_doc.company_id = authFactory.getActiveCompanyId();
					new_doc.date_added = new Date().getTime();
					new_doc.added_by = authFactory.cloudUserId();
					new_doc.date_modified = new Date().getTime();
					new_doc.modified_by = authFactory.cloudUserId();
					
					new_doc.date_record_synced = null;
					new_doc.date_content_synced = null;
					new_doc.date_record_imported = null;
					new_doc.date_content_imported = null;
					new_doc.record_modified = 'Yes';
					new_doc.rm_record = null; 
					new_doc.rm_record_modified = 'No';

					new_doc.status = 1;

					new_doc.last_inspected_date = null;
					new_doc.next_inspection_due_date = null;
					new_doc.next_scheduled_date = null;
					new_doc.days_to_scheduled_inspection = null;
					new_doc.pipp_requires_inspection = null;
					new_doc.pipp_requires_inspection_manual = null;
					new_doc.excluded_from_inspection = null;
					new_doc.ever_inspected = null;
					new_doc.inspection_required = null;
					new_doc.has_scheduled = null;
					new_doc.intervals_valid = null;
					new_doc.equally_spaced = null;
					new_doc.health_check_date = null;
					new_doc.paused_until = null;
					new_doc.priority = null;
					new_doc.priority_band_number = null;
					new_doc.priority_band = null;
					new_doc.recommended_priority = null;
					new_doc.recommended_priority_band = null;
					new_doc.recommended_priority_band_number = null;
					
					new_doc.users_company_name = null;
					new_doc.users_name = null;

					db.post(new_doc, {force: true}).then(function(result) {

						new_doc._id = result.id;
						new_doc._rev = result.rev;

						defer.resolve(new_doc);

					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
		}

		factory.basic_obs = {
			cloneBasicObsMultiple: function(basic_ob_ids, relations) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var active_index = 0;
				var saved_ids = {};

				if( basic_ob_ids.length == 0 ) {
					defer.resolve("No basic observations to clone");
					return defer.promise;
				}

				if( !relations ) {
					defer.reject("No relations were specified for the multiple basic observations clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id ) {
					defer.reject("No project identifier provided for basic observation clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('snapshot_asset_id') || !relations.snapshot_asset_id ) {
					defer.reject("No asset identifier provided for basic observation clone");
					return defer.promise;
				}

				cloneBasicObs(save_defer, basic_ob_ids[active_index], relations).then(function() {
					defer.resolve(saved_ids);
				}, function(error) {
					defer.reject(error);
				});

				function cloneBasicObs(defer, basic_ob_id, relations) {

					if( active_index > basic_ob_ids.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					factory.basic_obs.cloneBasicObsRecord(basic_ob_id, relations).then(function(saved_basic_ob) {

						saved_ids[basic_ob_id] = saved_basic_ob._id;

						active_index++;

						cloneBasicObs(defer, basic_ob_ids[active_index], relations);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			cloneBasicObsRecord: function(basic_ob_id, relations) {
				var defer = $q.defer();

				if( !basic_ob_id ) {
					defer.reject("No basic obs identifier for clone");
					return defer.promise;
				}

				if( !relations ) {
					defer.reject("No relations were specified for the basic observation clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id ) {
					defer.reject("No project identifier was given for the basic observation clone");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('snapshot_asset_id') || !relations.snapshot_asset_id ) {
					defer.reject("No asset identifier was given for the basic observation clone");
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.assessments;

				db.get(basic_ob_id).then(function(doc) {

					var new_doc = angular.copy(doc);

					new_doc._id = null;
					new_doc._rev = null;
					new_doc.rm_id = null;
					new_doc.rm_ref = null;
					new_doc.rm_revision_number = null;
					new_doc.rm_activity_id = relations.rm_activity_id || null;
					new_doc.rm_asset_id = relations.rm_snapshot_asset_id || null;
					new_doc.synced = false;
					new_doc.imported = false;
					new_doc.activity_id = relations.activity_id;
					new_doc.asset_id = relations.snapshot_asset_id;
					new_doc.status = 7; // PUBLISHED
					new_doc.status_name = 'Published';
					new_doc.is_pool_item = null; // UNSET POOL FLAG
					new_doc.added_by = authFactory.cloudUserId();
					new_doc.date_added = new Date().getTime();
					new_doc.date_modified = new Date().getTime();
					new_doc.company_id = authFactory.cloudCompanyId();
					new_doc.date_record_synced = null; 
					new_doc.date_content_synced = null;
					new_doc.date_record_imported = null;
					new_doc.date_content_imported = null;
					new_doc.user_id = authFactory.cloudUserId();
					new_doc.record_modified = 'Yes';
					new_doc.rm_record_modified = 'No';
					new_doc.sync_id = null;
					new_doc.mid_record_id = null;

					// FORMAT LO INITIAL PHA VALUES
					if( (!doc.lo_initial || doc.lo_initial == 0 || doc.lo_initial == '0') && (!doc.lo_initial_name || doc.lo_initial_name == '') ) {
						new_doc.lo_initial = null;
					}

					// FORMAT LO AFTER PHA VALUES
					if( (!doc.lo_after || doc.lo_after == 0 || doc.lo_after == '0') && (!doc.lo_after_name || doc.lo_after_name == '') ) {
						new_doc.lo_after = null;
					}

					if( relations.hasOwnProperty('assessment_type') && relations.assessment_type != null ) {
						new_doc.assessment_type = relations.assessment_type;
					}

					// SET CLONED FROM IDS
					new_doc.cloned_from_id = doc._id;
					new_doc.cloned_from_rm_id = doc.rm_id;
					new_doc.cloned_from_rm_ref = doc.rm_ref;

					db.post(new_doc, {force: true}).then(function(result) {

						console.log("CLONED BASIC OBSERVATION RECORD");
						new_doc._id = result.id;
						new_doc._rev = result.rev;

						var media_relations = angular.copy( relations );

						media_relations.record_id = new_doc._id;
						media_relations.record_type = 'assessment';
						media_relations.rm_record_item_id = new_doc.rm_id;
						media_relations.rm_record_item_ref = new_doc.rm_ref;
						media_relations.is_register = 'No';
						media_relations.client_id = authFactory.getClientId();

						factory.media.copyAllMediaRecords(basic_ob_id, 'assessment', media_relations).then(function(updated_doc){

							defer.resolve(updated_doc);

						}, function(error){
							defer.reject(error);
						});

					}).catch(function() {
						console.log("ERROR CLONING BASIC OBSERVATION RECORD");
						defer.reject(error);
					});

				}).catch(function(error) {
					console.log("ERROR FETCHING BASIC OBS RECORD FOR CLONE");
					defer.reject(error);
				});

				return defer.promise;
			},
			createBasicObsSnapshotAsset: function(relations, core_asset) {
				var defer = $q.defer();

				if( !relations ) {
					defer.reject("No relations provided for creating basic observations Core snapshot");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('activity_id') || !relations.activity_id ) {
					defer.reject("No project ID provided to create basic observations Core snapshot in");
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.assets;

				var snapshot_record = modelsFactory.models.newSnapshotAsset(relations.activity_id);

				snapshot_record.register_asset_id = core_asset._id;
				snapshot_record.asset_ref = core_asset.asset_ref || 'Asset name not defined';

				if( core_asset.hasOwnProperty('rm_id') && core_asset.rm_id ) {
					snapshot_record.rm_register_asset_id = parseInt(core_asset.rm_id);
				}

				db.post(snapshot_record, {force: true}).then(function(result) {

					snapshot_record._id = result.id;
					snapshot_record._rev = result.rev;

					defer.resolve(snapshot_record);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
		}

		factory.utils = {
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
						if( active_record.rm_ref == records[i].rm_ref && active_record.revision_number < records[i].revision_number ) {
							is_latest_rev = false;
						}
					}

					return is_latest_rev;
				}

				return latest_revs;
			},
			extractChecklistInstanceIds: function(checklists) {
				var record_ids = [];

				angular.forEach(checklists, function(checklist_data, index) {
					record_ids.push(checklist_data.record);
				});

				return record_ids;
			},
			extractRaQuestionRelationIds: function(checklists) {
				var record_ids = [];

				angular.forEach(checklists, function(checklist_data, c_index) {

					angular.forEach(checklist_data.ra_question_relations, function(relation, r_index) {
						record_ids.push(relation);
					});

				});

				return record_ids;
			},
			extractRecordIdsFromArray: function(array) {
				var record_ids = [];

				var i = 0;
				var len = array.length;

				while(i < len) {
					record_ids.push(array[i]._id);
					i++;
				}

				return record_ids;
			},
			calcRiskProfileImg: function(src_media) {
				var data = {
					profile_img_id: null, 
					profile_img_attachment_key: null,
					profile_img_download_required: false
				}

				if( !src_media.length ) {
					return data;
				}

				var filtered_media = [];

				var media = angular.copy(src_media);
				media = $filter('orderBy')(media, 'date_added');

				var i = 0;
				var len = media.length;

				while(i < len) {
					var errors = 0;

					// IF FILE IS NOT DOWNLOADED
					// if( !media[i].hasOwnProperty('file_downloaded') || media[i].file_downloaded != 'Yes' ) {
					// 	errors++;
					// }

					// IF FILE DOES NOT EXIST
					if( media[i].hasOwnProperty('file_does_not_exist') && media[i].file_does_not_exist ) {
						errors++;
					}

					// IF NOT A LIVE IMAGE
					if( !media[i].hasOwnProperty('status') || media[i].status != 1 ) {
						errors++;
					}

					if( errors == 0 ) {
						filtered_media.push(media[i]);
					}

					i++;
				}

				if( filtered_media.length == 0 ) {
					// NO LIVE IMAGES TO SET AS PROFILE IMAGE
					return data;
				}

				if( !filtered_media[0].hasOwnProperty('file_downloaded') || filtered_media[0].file_downloaded != 'Yes' ) {
					// PROFILE IMAGE NOT DOWNLOADED
					data.profile_img_download_required = true;

					return data;
				}

				data.profile_img_id = filtered_media[0]._id;
				data.profile_img_attachment_key = filtered_media[0].attachment_key;

				// CLEAN UP MEDIA ARRAY
				media = [];

				return data;
			},
			canCloneImage: function(doc, relations) {

				var data = {
					can_clone: true,
					error_message: null
				}

				// CAN CLONE POOL IMAGE
				if( doc.hasOwnProperty('is_pool_item') && doc.is_pool_item == 'Yes' ) {
					return data;
				}

				// CAN CLONE INSENSITIVE IMAGE
				if( doc.hasOwnProperty('insensitive_media') && doc.insensitive_media == 'Yes' ) {
					return data;
				}

				// IF INTERNAL IMAGE, AND CLONING TO A DIFFERENT COMPANY
				if( !doc.client_id && doc.company_id != relations.client_id ) {
					data.can_clone = false;
					data.error_message = "Media cannot be cloned across companies";
				}

				// IF CLIENT IMAGE, AND CLONING TO A DIFFERENT CLIENT
				if( doc.client_id && doc.client_id != relations.client_id ) {
					data.can_clone = false;
					data.error_message = "Media cannot be cloned across companies";
				}

				return data;
			}
		}

		factory.dbUtils = {
			getProjectRecord: function(project_id) {
				var defer = $q.defer();

				if( angular.isUndefined(project_id) || !project_id ) {
					defer.resolve();
					return defer.promise;
				}

				riskmachDatabasesFactory.databases.collection.projects.get(project_id).then(function(project_doc) {

					defer.resolve(project_doc);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getAssetRecord: function(asset_id) {
				var defer = $q.defer();

				if( !asset_id ) {
					defer.reject("No asset identifier provided to fetch asset");
					return defer.promise;
				}

				riskmachDatabasesFactory.databases.collection.assets.get(asset_id).then(function(doc) {
					defer.resolve(doc);
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getHazardRecord: function(hazard_id) {
				var defer = $q.defer();

				if( !hazard_id ) {
					defer.reject("No hazard identifier provided to fetch hazard");
					return defer.promise;
				}

				riskmachDatabasesFactory.databases.collection.mr_hazards.get(hazard_id).then(function(doc) {
					defer.resolve(doc);
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			fetchInspectionData: function(asset_record) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var fetch_stages = ['checklists','assessments','control_items','procedures','ra_control_item_relations'];

				var collected_data = {
					asset_record: asset_record
				};

				fetchNextInspectionData(asset_record, fetch_stages, 0, fetch_defer).then(function(collected_data){
					defer.resolve(collected_data);
				}, function(error){
					defer.reject(error);
				});

				function fetchNextInspectionData(asset_record, fetch_stages, current_stage_index, defer)
				{
					// IF THERE ARE NO FETCH STAGES
					if( !fetch_stages.length )
					{
						defer.resolve(asset_record);
						return defer.promise;
					}

					// IF FINISHED FETCHING ALL STAGES
					if( current_stage_index > fetch_stages.length - 1 )
					{
						defer.resolve(collected_data);
						return defer.promise;
					}

					var active_stage_name = fetch_stages[current_stage_index];

					if( active_stage_name == 'checklists' )
					{
						factory.fetchInspectionChecklistData(asset_record).then(function(checklist_instances){

							collected_data[active_stage_name] = checklist_instances;

							//FETCH NEXT STAGE
							current_stage_index++;
							fetchNextInspectionData(asset_record, fetch_stages, current_stage_index, defer);

						}, function(error){
							defer.reject(error);
						});
					}

					if( active_stage_name == 'assessments' )
					{
						factory.fetchCollection.riskAssessments(asset_record).then(function(assessments){

							collected_data[active_stage_name] = assessments;

							//FETCH NEXT STAGE
							current_stage_index++;
							fetchNextInspectionData(asset_record, fetch_stages, current_stage_index, defer);

						}, function(error){
							defer.reject(error);
							return defer.promise;
						});
					}

					// if( active_stage_name == 'mr_hazards' )
					// {
					// 	factory.fetchCollection.mrHazards({activity_id: asset_record.project_id, asset_id: asset_record._id}).then(function(mr_hazards){
							
					// 		collected_data[active_stage_name] = mr_hazards;

					// 		//FETCH NEXT STAGE
					// 		current_stage_index++;
					// 		fetchNextAssetData(asset_record, fetch_stages, current_stage_index, defer);

					// 	}, function(error){
					// 		defer.reject(error);
					// 		return defer.promise;
					// 	});
					// }

					// if( active_stage_name == 'mr_controls' )
					// {
					// 	factory.fetchCollection.controls({activity_id: asset_record.project_id, asset_id: asset_record._id}, 'Managed Control').then(function(mr_controls){
							
					// 		collected_data[active_stage_name] = mr_controls;

					// 		//FETCH NEXT STAGE
					// 		current_stage_index++;
					// 		fetchNextAssetData(asset_record, fetch_stages, current_stage_index, defer);

					// 	}, function(error){
					// 		defer.reject(error);
					// 		return defer.promise;
					// 	});
					// }

					if( active_stage_name == 'control_items' )
					{
						factory.fetchCollection.controls({activity_id: asset_record.project_id, asset_id: asset_record._id}, 'Corrective').then(function(mr_controls){
							
							collected_data[active_stage_name] = mr_controls;

							//FETCH NEXT STAGE
							current_stage_index++;
							fetchNextInspectionData(asset_record, fetch_stages, current_stage_index, defer);

						}, function(error){
							defer.reject(error);
							return defer.promise;
						});
					}

					if( active_stage_name == 'procedures' )
					{
						factory.fetchCollection.procedures(asset_record.project_id, asset_record._id).then(function(procedures){
							
							collected_data[active_stage_name] = procedures;

							//FETCH NEXT STAGE
							current_stage_index++;
							fetchNextInspectionData(asset_record, fetch_stages, current_stage_index, defer);

						}, function(error){
							defer.reject(error);
							return defer.promise;
						});
					}

					if( active_stage_name == 'ra_control_item_relations' )
					{
						factory.fetchCollection.riskAssessmentControlItemRelations(asset_record).then(function(ra_control_item_relations){
							
							collected_data[active_stage_name] = ra_control_item_relations;

							//FETCH NEXT STAGE
							current_stage_index++;
							fetchNextInspectionData(asset_record, fetch_stages, current_stage_index, defer);

						}, function(error){
							defer.reject(error);
							return defer.promise;
						});
					}

					// if( active_stage_name == 'hazard_control_relations' )
					// {
					// 	factory.fetchCollection.hazardControlRelations({asset_id: asset_record._id}).then(function(hazard_control_relations){
							
					// 		collected_data[active_stage_name] = hazard_control_relations;

					// 		//FETCH NEXT STAGE
					// 		current_stage_index++;
					// 		fetchNextAssetData(asset_record, fetch_stages, current_stage_index, defer);

					// 	}, function(error){
					// 		defer.reject(error);
					// 		return defer.promise;
					// 	});
					// }

					return defer.promise;
				}

				return defer.promise;
			}, 
			fetchTaskManagedRiskData: function(task_id) {
				var defer = $q.defer();

				var fetch_defer = $q.defer();

				var fetch_stages = ['mr_hazards','mr_controls','hazard_control_relations'];

				var collected_data = {};

				fetchNextManagedRiskData(task_id, fetch_stages, 0, fetch_defer).then(function(asset_record){
					defer.resolve(collected_data);
				}, function(error){
					defer.reject(error);
				});

				function fetchNextManagedRiskData(task_id, fetch_stages, current_stage_index, defer)
				{
					// IF THERE ARE NO FETCH STAGES
					if( !fetch_stages.length )
					{
						defer.resolve(asset_record);
						return defer.promise;
					}

					// IF FINISHED FETCHING ALL STAGES
					if( current_stage_index > fetch_stages.length - 1 )
					{
						defer.resolve(collected_data);
						return defer.promise;
					}

					var active_stage_name = fetch_stages[current_stage_index];

					if( active_stage_name == 'mr_hazards' )
					{
						factory.fetchCollection.mrHazards({task_id: task_id}).then(function(mr_hazards){
							
							collected_data[active_stage_name] = mr_hazards;

							//FETCH NEXT STAGE
							current_stage_index++;
							fetchNextManagedRiskData(task_id, fetch_stages, current_stage_index, defer);

						}, function(error){
							defer.reject(error);
							return defer.promise;
						});
					}

					if( active_stage_name == 'mr_controls' )
					{
						factory.fetchCollection.controls({task_id: task_id}, 'Managed Control').then(function(mr_controls){
							
							collected_data[active_stage_name] = mr_controls;

							//FETCH NEXT STAGE
							current_stage_index++;
							fetchNextManagedRiskData(task_id, fetch_stages, current_stage_index, defer);

						}, function(error){
							defer.reject(error);
							return defer.promise;
						});
					}

					if( active_stage_name == 'hazard_control_relations' )
					{
						factory.fetchHazardControlRelationsForHazards(collected_data['mr_hazards']).then(function(hazard_control_relations) {

							collected_data[active_stage_name] = hazard_control_relations;

							// FETCH NEXT STAGE
							current_stage_index++;
							fetchNextManagedRiskData(task_id, fetch_stages, current_stage_index, defer);

						}, function(error) {
							defer.reject(error);
							return defer.promise;
						});
					}

					return defer.promise;
				}

				return defer.promise;
			},
			fetchHazardData: function(hazard_record) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var fetch_stages = ['hazard_control_relations', 'mr_controls'];

				var collected_data = {
					hazard_record: hazard_record
				}

				fetchNextHazardData(fetch_defer, 0).then(function() {
					defer.resolve(collected_data);
				}, function(error) {
					defer.reject(error);
				});

				function fetchNextHazardData(defer, active_index) {

					if( active_index > fetch_stages.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					if( fetch_stages[active_index] == 'hazard_control_relations' ) {

						factory.fetchHazardControlRelationsForHazards([collected_data.hazard_record]).then(function(hazard_control_relations) {

							collected_data['hazard_control_relations'] = hazard_control_relations;

							active_index++;

							fetchNextHazardData(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

					}

					if( fetch_stages[active_index] == 'mr_controls' ) {

						factory.fetchCollection.hazardsControls(collected_data['hazard_control_relations']).then(function(control_ids) {

							collected_data['control_ids'] = control_ids;

							active_index++;

							fetchNextHazardData(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

					}

					return defer.promise;
				}

				return defer.promise;
			},
			fetchRegisterAssetData: function(asset_id, relations) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var fetch_stages = ['ipp_scores'];

				if( relations.hasOwnProperty('clone_basic_obs') && relations.clone_basic_obs ) {
					fetch_stages.push('basic_obs');
				}

				var collected_data = {
					asset_id: asset_id
				};

				fetchNextRegisterAssetData(fetch_defer, fetch_stages, 0).then(function(collected_data){
					defer.resolve(collected_data);
				}, function(error){
					defer.reject(error);
				});

				function fetchNextRegisterAssetData(defer, fetch_stages, current_stage_index)
				{
					// IF THERE ARE NO FETCH STAGES
					if( !fetch_stages.length )
					{
						defer.resolve(collected_data);
						return defer.promise;
					}

					// IF FINISHED FETCHING ALL STAGES
					if( current_stage_index > fetch_stages.length - 1 )
					{
						defer.resolve(collected_data);
						return defer.promise;
					}

					var active_stage_name = fetch_stages[current_stage_index];

					if( active_stage_name == 'ipp_scores' )
					{
						factory.fetchCollection.ippScores(asset_id).then(function(ipp_scores){

							collected_data[active_stage_name] = ipp_scores;

							//FETCH NEXT STAGE
							current_stage_index++;
							fetchNextRegisterAssetData(defer, fetch_stages, current_stage_index);

						}, function(error){
							defer.reject(error);
						});
					}

					if( active_stage_name == 'basic_obs' ) 
					{
						factory.fetchCollection.basicObservations(relations).then(function(basic_observations) {

							collected_data[active_stage_name] = basic_observations;

							// FETCH NEXT STAGE
							current_stage_index++;
							fetchNextRegisterAssetData(defer, fetch_stages, current_stage_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					return defer.promise;
				}

				return defer.promise;
			}
		}

		factory.fetchCollection = {
			riskAssessments: function(asset_record){
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.assessments.find({
					selector: {
						user_id: authFactory.cloudUserId(),
						activity_id: asset_record.project_id,
						asset_id: asset_record._id
					}
				}).then(function(results){

					console.log("FOUND ASSESSMENTS FOR CLONE");
					console.log(results.docs);

					var filtered_array = [];

					angular.forEach(results.docs, function(record, index) {
						var errors = 0;

						// IF DELETED, DON'T CLONE
						if( record.hasOwnProperty('status') && (record.status == 8 || record.status == '8') ) {
							errors++;
						}

						// IF QUICK CAPTURE RISK
						if( record.hasOwnProperty('quick_capture_risk') && record.quick_capture_risk == 'Yes' ) {
							errors++;
						}

						if( errors == 0 ) {
							// PUSH JUST THE ID
							filtered_array.push(record._id);
						}
					});

					// CLEAN UP FETCHED DATA
					results.docs = null;

					defer.resolve(filtered_array);

				}).catch(function(error){
					defer.reject(error);
				});
					
				return defer.promise;
			},
			riskAssessmentControlItemRelations: function(asset_record){
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.ra_control_item_relations.find({
					selector: {
						user_id: authFactory.cloudUserId(),
						activity_id: asset_record.project_id,
						asset_id: asset_record._id
					}
				}).then(function(results){
					console.log("FOUND RA CONTROL RELATIONS FOR CLONE");
					console.log(results.docs);

					defer.resolve(results.docs);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			mrHazards: function(relations){
				var defer = $q.defer();

				var selector = {
					user_id: authFactory.cloudUserId()
				};

				if( relations.hasOwnProperty('activity_id') && relations.activity_id != null ) {
					selector.activity_id = relations.activity_id;
				} 

				if( relations.hasOwnProperty('asset_id') && relations.asset_id != null ) {
					selector.asset_id = relations.asset_id;
				}

				if( relations.hasOwnProperty('task_id') && relations.task_id != null ) {
					selector.task_id = relations.task_id;
				}

				riskmachDatabasesFactory.databases.collection.mr_hazards.find({
					selector: selector
				}).then(function(results){
					console.log("FOUND MR HAZARDS FOR CLONE");
					console.log(results.docs);

					defer.resolve(results.docs);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			controls: function(relations, control_item_type){
				var defer = $q.defer();

				var selector = {
					user_id: authFactory.cloudUserId(),
					control_item_type: control_item_type
				};

				if( relations.hasOwnProperty('activity_id') && relations.activity_id != null ) {
					selector.activity_id = relations.activity_id;
				} 

				if( relations.hasOwnProperty('asset_id') && relations.asset_id != null ) {
					selector.asset_id = relations.asset_id;
				}

				if( relations.hasOwnProperty('task_id') && relations.task_id != null ) {
					selector.task_id = relations.task_id;
				}

				riskmachDatabasesFactory.databases.collection.mr_controls.find({
					selector: selector
				}).then(function(results){
					console.log("FOUND CONTROLS FOR CLONE, TYPE: " + control_item_type);
					console.log(results.docs);

					defer.resolve(results.docs);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			hazardsControls: function(control_relations) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.mr_controls;

				var options = {
					limit: 500
				}

				var control_ids = [];
				var collected_control_ids = [];

				// EXTRACT CONTROL IDS FROM HAZARD-CONTROL RELATIONS
				var ri = 0;
				var rlen = control_relations.length;
				while(ri < rlen) {
					control_ids.push(control_relations[ri].control_item_id);

					ri++;
				}

				fetchNextPage(fetch_defer).then(function() {

					defer.resolve(collected_control_ids);

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length ) {

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								// IF CONTROL ID NOT IN ARRAY
								if( control_ids.indexOf(result.rows[i].id) === -1 ) {
									errors++;
								}

								if( errors == 0 ) {
									collected_control_ids.push(result.rows[i].id);
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
			hazardControlRelations: function(relations){
				var defer = $q.defer();

				var selector = {
					user_id: authFactory.cloudUserId()
				};

				if( relations.hasOwnProperty('asset_id') && relations.asset_id != null ) {
					selector.asset_id = relations.asset_id;
				}

				if( relations.hasOwnProperty('hazard_id') && relations.hazard_id != null ) {
					selector.hazard_id = relations.hazard_id;
				}

				if( relations.hasOwnProperty('control_item_id') && relations.control_item_id != null ) {
					selector.control_item_id = relations.control_item_id;
				}

				riskmachDatabasesFactory.databases.collection.hazard_control_relations.find({
					selector: selector
				}).then(function(results){
					console.log("FOUND HAZARD CONTROL RELATIONS FOR CLONE");
					console.log(results.docs);
					defer.resolve(results.docs);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			checklistInstances: function(project_id, asset_id){
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.checklist_instances.find({
					selector: {
						user_id: authFactory.cloudUserId(),
						activity_id: project_id,
						asset_id: asset_id
					}
				}).then(function(results){
					console.log("FOUND CHECKLIST INSTANCES FOR CLONE");
					console.log(results.docs);

					var filtered_array = [];

					angular.forEach(results.docs, function(record, index) {
						var errors = 0;

						// IF CHECKLIST DELETED, DON'T CLONE
						if( record.hasOwnProperty('status') && (record.status == 4 || record.status == '4') ) {
							errors++;
						}

						// FILTER OUT INCOMPLETE INITIALISATIONS
						if( record.hasOwnProperty('init_incomplete') && record.init_incomplete ) {
							errors++;
						}

						if( errors == 0 ) {
							// USE JUST THE CHECKLIST ID
							filtered_array.push(record._id);
						}
					});

					// CLEAN UP FETCHED DATA
					results.docs = null;

					defer.resolve(filtered_array);
				}).catch(function(error){
					defer.reject(error);
				});
					
				return defer.promise;
			},
			checklistInstanceData: function(checklist_id){
				var defer = $q.defer();

				var checklist_data = {
					record: checklist_id,
					ra_question_relations: null
				};

				//FIND THE QUESTION RELATIONS
				riskmachDatabasesFactory.databases.collection.ra_question_relations.find({
					selector: {
						user_id: authFactory.cloudUserId(),
						checklist_record_id: checklist_id
					}
				}).then(function(relation_results){
					console.log("FOUND RA QUESTION RELATIONS FOR CLONE");
					console.log(relation_results.docs);

					var relations = [];
					var i = 0;
					var len = relation_results.docs.length;
					while(i < len) {
						relations.push(relation_results.docs[i]._id);
						i++;
					}

					checklist_data.ra_question_relations = relations;

					// CLEAN UP FETCHED DATA
					relation_results.docs = null;

					defer.resolve(checklist_data);
				});

				return defer.promise;
			},
			risksRaQuestionRelations: function(risk_id, excluded_question) {
				var defer = $q.defer();

				var relations = [];

				var db = riskmachDatabasesFactory.databases.collection.ra_question_relations;

				db.find({
					selector: {
						assessment_id: risk_id
					}
				}).then(function(result) {
					
					var i = 0;
					var len = result.docs.length;

					while(i < len) {

						var errors = 0;

						if( excluded_question ) {
								
							// NORMAL QUESTION
							if( !excluded_question.is_uaudit && result.docs[i].question_record_id == excluded_question.question_record_id ) {
								errors++;
							}

							// UAUDIT QUESTION
							if( excluded_question.is_uaudit && result.docs[i].question_record_uuid == excluded_question.question_record_uuid ) {
								errors++;
							}

						}

						if( !errors ) {
							relations.push(result.docs[i]);
						}

						i++;
					}

					defer.resolve(relations);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			procedures: function(project_id, asset_id){
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.tasks.find({
					selector: {
						table: 'tasks',
						task_type: 'procedure',
						user_id: authFactory.cloudUserId(),
						activity_id: project_id,
						asset_id: asset_id
					}
				}).then(function(results){
					console.log("FOUND PROCEDURES FOR CLONE");
					console.log(results.docs);

					results.docs = factory.utils.filterTasksLatestRevisions(results.docs);

					defer.resolve(results.docs);
				}).catch(function(error){
					defer.reject(error);
				});
					
				return defer.promise;
			},
			procedureData: function(procedure_record){
				var defer = $q.defer();

				var procedure_data = {
					procedure: procedure_record, 
					tasks: [], 
					steps: []
				}
			
				//GET TASKS AND STEPS
				riskmachDatabasesFactory.databases.collection.tasks.find({
					selector: {
						procedure_id: procedure_record._id,
						user_id: authFactory.cloudUserId()
					}
				}).then(function(results){

					console.log("FOUND SUB TASKS FOR CLONE");
					console.log(results.docs);

					//ORDER TASKS AND STEPS BY SEQUENCE NUMBER
					results.docs = $filter('orderBy')(results.docs, 'sequence_number');

					//CREATE TASK INDEX
					angular.forEach(results.docs, function(record, index){

						if( record.task_type == 'task' )
						{
							procedure_data.tasks.push(record);
						}

						if( record.task_type == 'step' )
						{
							procedure_data.steps.push(record);
						}

					});

					defer.resolve(procedure_data);

				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			ippScores: function(asset_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.register_asset_ipp.find({
					selector: {
						table: 'register_asset_ipp',
						company_id: authFactory.getActiveCompanyId(),
						user_id: authFactory.cloudUserId(), 
						asset_id: asset_id
					}
				}).then(function(results){

					console.log("FOUND IPP SCORES FOR CLONE");
					console.log(results.docs);

					var filtered_array = [];

					angular.forEach(results.docs, function(record, index) {
						var errors = 0;

						// IF NOT LIVE, DON'T CLONE
						if( record.hasOwnProperty('status') && (record.status != 1 || record.status != '1') ) {
							errors++;
						}

						if( errors == 0 ) {
							filtered_array.push(record);
						}
					});

					defer.resolve(filtered_array);

				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			basicObservations: function(relations) {
				var defer = $q.defer();

				if( !relations ) {
					defer.reject("No relations provided for basic observations fetch");
					return defer.promise;
				}

				// IF WE ARE NOT CLONING BASIC OBSERVATIONS
				if( !relations.hasOwnProperty('clone_basic_obs') || !relations.clone_basic_obs ) {
					defer.resolve([]);
					return defer.promise;
				}

				if( !relations.hasOwnProperty('src_activity_id') || !relations.src_activity_id ) {
					defer.reject("No source project ID provided for basic observations fetch");
					return defer.promise;
				}

				if( !relations.hasOwnProperty('src_asset_id') || !relations.src_asset_id ) {
					defer.reject("No source asset ID provided for basic observations fetch");
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.assessments;

				db.find({
					selector: {
						user_id: authFactory.cloudUserId(), 
						activity_id: relations.src_activity_id, 
						asset_id: relations.src_asset_id
					}
				}).then(function(result) {
						
					var filtered_array = [];
					var i = 0;
					var len = result.docs.length;

					while(i < len) {
						var errors = 0;

						if( !result.docs[i].hasOwnProperty('is_basic_ob') || result.docs[i].is_basic_ob != 'Yes' ) {
							errors++;
						}

						if( !result.docs[i].hasOwnProperty('company_id') || result.docs[i].company_id != authFactory.cloudCompanyId() ) {
							errors++;
						}

						// BASIC OB IS DELETED
						if( result.docs[i].hasOwnProperty('status') && result.docs[i].status == 8 ) {
							errors++;
						}

						if( !errors ) {
							filtered_array.push(result.docs[i]);
						}

						i++;
					}

					defer.resolve(filtered_array);

				}).catch(function(error) {
					console.log("ERROR FETCHING BASIC OBSERVATIONS FOR CLONE");
					defer.reject(error);
				});

				return defer.promise;
			}
		}

		factory.fetchInspectionChecklistData = function(asset_record) 
		{
			var defer = $q.defer();

			var checklists = [];

			factory.fetchCollection.checklistInstances(asset_record.project_id, asset_record._id).then(function(checklists){

				//FETCH DATA FOR EACH CHECKLIST
				factory.fetchChecklistDataSequential(checklists, 0, defer).then(function(checklists){
					defer.resolve(checklists);
				}, function(error){
					defer.reject(error);
				});

			}, function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetchChecklistDataSequential = function(checklists, current_index, defer){
		
			//IF NO CHECKLISTS DONT FETCH ANY
			if( checklists.length == 0 )
			{
				defer.resolve(checklists);
				return defer.promise;
			}

			//IF FETCHED ALL, RESOLVE
			if( current_index > checklists.length - 1 )
			{
				defer.resolve(checklists);
				return defer.promise;
			}

			//FETCH THE CHECKLIST DATA
			factory.fetchCollection.checklistInstanceData(checklists[current_index]).then(function(checklist_data){
				checklists[current_index] = checklist_data;
				current_index++;
				factory.fetchChecklistDataSequential(checklists, current_index, defer);

			}, function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetchInspectionProcedureData = function(asset_record)
		{
			var defer = $q.defer();

			var procedures = [];

			factory.fetchCollection.procedures(asset_record.project_id, asset_record._id).then(function(procedures){
				
				factory.fetchProcedureDataSequential(procedures, 0, defer).then(function(procedures){
					defer.resolve(procedures);
				}, function(error){
					defer.reject(error);
				});

			}, function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetchProcedureDataSequential = function(procedures, current_index, defer){
		
			//IF NO PROCEDURES DONT FETCH ANY
			if( procedures.length == 0 )
			{
				defer.resolve(procedures);
				return defer.promise;
			}

			//IF FETCHED ALL STOP
			if( current_index > procedures.length - 1 )
			{
				defer.resolve(procedures);
				return defer.promise;
			}

			//FETCH THE PROCEDURE
			factory.fetchCollection.procedureData(procedures[current_index]).then(function(procedure_data){
				procedures[current_index] = procedure_data;
				current_index++;
				factory.fetchProcedureDataSequential(procedures, current_index, defer);

			}, function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cloneInspectionData = function(inspection_data, relations) 
		{
			var defer = $q.defer();
			var clone_defer = $q.defer();

			// INCLUDING ASSET IF THERE IS A DESTINATION ASSET SET IN RELATIONS
			// IF NO DESTINATION ASSET IN RELATIONS, CLONE ASSET AND SET THAT AS DEST ASSET
			var clone_stages = ['asset','checklists','assessments','procedures','control_items','ra_control_item_relations','ra_question_relations'];

			var saved_inspection = null;
			var saved_ids = {};

			cloneNextInspectionData(inspection_data.asset_record, clone_stages, 0, clone_defer).then(function(asset_record){
				
				// UPDATE ACTIVE CHECKLIST ON ASSET
				factory.snapshot_assets.updateAssetActiveChecklist(saved_ids.active_checklist_id, saved_inspection._id).then(function() {

					factory.snapshot_assets.toggleInspectionCloneComplete(saved_inspection._id, null).then(function(saved_inspection) {
						defer.resolve(saved_inspection);
					});

				});

			}, function(error){
				defer.reject(error);
			});

			function cloneNextInspectionData(asset_record, clone_stages, current_stage_index, defer)
			{	
				console.log("SAVED INSPECTION");
				console.log(saved_inspection);

				// IF THERE ARE NO FETCH STAGES
				if( !clone_stages.length )
				{
					defer.resolve(asset_record);
					return defer.promise;
				}

				// IF FINISHED FETCHING ALL STAGES
				if( current_stage_index > clone_stages.length - 1 )
				{
					defer.resolve();
					return defer.promise;
				}

				var active_stage_name = clone_stages[current_stage_index];

				if( active_stage_name == 'asset' ) 
				{
					// if( relations.hasOwnProperty('asset_id') && relations.asset_id != null ) {
					// 	//CLONE NEXT STAGE
					// 	current_stage_index++;
					// 	cloneNextInspectionData(asset_record, clone_stages, current_stage_index, defer);

					// 	return defer.promise;
					// }

					factory.dbUtils.getProjectRecord(relations.activity_id).then(function(project_doc) {

						// if( project_doc ) {
						// 	if( project_doc.pp_id == 12 ) {
						// 		relations.assessment_type = 0;
						// 	} else {
						// 		relations.assessment_type = 9;
						// 	}
						// }

						relations.assessment_type = 0;

						factory.snapshot_assets.cloneInspectionRecord(asset_record._id, relations).then(function(cloned_inspection) {

							factory.snapshot_assets.toggleInspectionCloneComplete(cloned_inspection._id, 'Yes').then(function(updated_inspection) {

								// SET DEST ASSET ID TO CLONED INSPECTION
								relations.asset_id = updated_inspection._id;

								// SET SAVED INSPECTION
								saved_inspection = updated_inspection;

								//CLONE NEXT STAGE
								current_stage_index++;
								cloneNextInspectionData(asset_record, clone_stages, current_stage_index, defer);

							});

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});
				}

				if( active_stage_name == 'checklists' )
				{
					var checklist_ids = factory.utils.extractChecklistInstanceIds(inspection_data.checklists);

					factory.checklist_instances.cloneChecklistInstanceMultiple(checklist_ids, relations).then(function(saved_checklist_data) {

						saved_ids['checklists'] = saved_checklist_data.saved_checklist_ids;
						saved_ids['checklist_questions'] = saved_checklist_data.saved_question_ids;
						saved_ids['active_checklist_id'] = saved_checklist_data.active_checklist_id;

						//CLONE NEXT STAGE
						current_stage_index++;
						cloneNextInspectionData(asset_record, clone_stages, current_stage_index, defer);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( active_stage_name == 'assessments' )
				{
					// var assessment_ids = factory.utils.extractRecordIdsFromArray(inspection_data.assessments);

					factory.assessments.cloneRiskAssessmentMultiple(inspection_data.assessments, relations).then(function(saved_risk_ids) {

						saved_ids[active_stage_name] = saved_risk_ids;

						//CLONE NEXT STAGE
						current_stage_index++;
						cloneNextInspectionData(asset_record, clone_stages, current_stage_index, defer);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( active_stage_name == 'procedures' )
				{
					var task_ids = factory.utils.extractRecordIdsFromArray(inspection_data.procedures);

					factory.tasks.cloneProcedureMultiple(task_ids, relations).then(function() {

						//CLONE NEXT STAGE
						current_stage_index++;
						cloneNextInspectionData(asset_record, clone_stages, current_stage_index, defer);

					}, function(error) {
						defer.reject(error);
					});
				}

				// if( active_stage_name == 'mr_hazards' )
				// {
				// 	var mr_hazard_ids = factory.utils.extractRecordIdsFromArray(inspection_data.mr_hazards);

				// 	factory.mr_hazards.cloneHazardMultiple(mr_hazard_ids, relations).then(function(saved_hazard_ids) {

				// 		saved_ids[active_stage_name] = saved_hazard_ids;

				// 		//CLONE NEXT STAGE
				// 		current_stage_index++;
				// 		cloneNextInspectionData(asset_record, clone_stages, current_stage_index, defer);

				// 	}, function(error) {
				// 		defer.reject(error);
				// 	});
				// }

				// if( active_stage_name == 'mr_controls' )
				// {
				// 	var control_ids = factory.utils.extractRecordIdsFromArray(inspection_data.mr_controls);

				// 	factory.mr_controls.cloneControlItemMultiple(control_ids, relations).then(function(saved_control_ids) {

				// 		saved_ids[active_stage_name] = saved_control_ids;

				// 		//CLONE NEXT STAGE
				// 		current_stage_index++;
				// 		cloneNextInspectionData(asset_record, clone_stages, current_stage_index, defer);

				// 	}, function(error) {
				// 		defer.reject(error);
				// 	});
				// }

				if( active_stage_name == 'control_items' )
				{
					var control_ids = factory.utils.extractRecordIdsFromArray(inspection_data.control_items);

					factory.mr_controls.cloneControlItemMultiple(control_ids, relations).then(function(saved_control_ids) {

						saved_ids[active_stage_name] = saved_control_ids;

						//CLONE NEXT STAGE
						current_stage_index++;
						cloneNextInspectionData(asset_record, clone_stages, current_stage_index, defer);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( active_stage_name == 'ra_control_item_relations' )
				{
					var relation_ids = factory.utils.extractRecordIdsFromArray(inspection_data.ra_control_item_relations);

					factory.ra_control_item_relations.cloneRaControlItemRelationMultiple(relation_ids, relations, saved_ids).then(function() {

						//CLONE NEXT STAGE
						current_stage_index++;
						cloneNextInspectionData(asset_record, clone_stages, current_stage_index, defer);

					}, function(error) {
						defer.reject(error);
					});
				}

				// if( active_stage_name == 'hazard_control_relations' )
				// {
				// 	var relation_ids = factory.utils.extractRecordIdsFromArray(inspection_data.hazard_control_relations);

				// 	factory.hazard_control_relations.cloneHazardControlRelationMultiple(relation_ids, relations, saved_ids).then(function() {

				// 		//CLONE NEXT STAGE
				// 		current_stage_index++;
				// 		cloneNextInspectionData(asset_record, clone_stages, current_stage_index, defer);

				// 	}, function(error) {
				// 		defer.reject(error);
				// 	});
				// }

				if( active_stage_name == 'ra_question_relations' )
				{
					var relation_ids = factory.utils.extractRaQuestionRelationIds(inspection_data.checklists);

					factory.ra_question_relations.cloneRaQuestionRelationMultiple(relation_ids, relations, saved_ids).then(function() {

						//CLONE NEXT STAGE
						current_stage_index++;
						cloneNextInspectionData(asset_record, clone_stages, current_stage_index, defer);

					}, function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;
			}

			return defer.promise;
		}

		factory.cloneHazardData = function(hazard_data, relations) 
		{
			var defer = $q.defer();
			var clone_defer = $q.defer();

			var clone_stages = ['mr_hazard','mr_controls','hazard_control_relations'];

			var saved_ids = {
				mr_hazards: {},
				mr_controls: {}
			};

			var cloned_hazard_record = null;

			cloneNextHazardData(clone_defer, 0).then(function() {

				factory.mr_hazards.toggleHazardCloneComplete(cloned_hazard_record._id, null).then(function() {

					// CLEAN UP
					cloned_hazard_record = null;

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			function cloneNextHazardData(defer, active_index) {

				if( active_index > clone_stages.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				if( clone_stages[active_index] == 'mr_hazard' ) {

					factory.mr_hazards.cloneHazard(hazard_data.hazard_record._id, relations).then(function(saved_hazard) {

						factory.mr_hazards.toggleHazardCloneComplete(saved_hazard._id, 'Yes').then(function() {

							saved_ids['mr_hazards'][hazard_data.hazard_record._id] = saved_hazard._id;

							cloned_hazard_record = angular.copy(saved_hazard);

							active_index++;

							cloneNextHazardData(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

				}

				if( clone_stages[active_index] == 'mr_controls' ) {

					factory.mr_controls.cloneControlItemMultiple(hazard_data.control_ids, relations).then(function(saved_control_ids) {

						saved_ids['mr_controls'] = saved_control_ids;

						active_index++;

						cloneNextHazardData(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				if( clone_stages[active_index] == 'hazard_control_relations' ) {

					var relation_ids = factory.utils.extractRecordIdsFromArray(hazard_data.hazard_control_relations);

					factory.hazard_control_relations.cloneHazardControlRelationMultiple(relation_ids, relations, saved_ids).then(function() {

						active_index++;

						cloneNextHazardData(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				return defer.promise;
			}

			return defer.promise;
		}

		factory.fetchHazardControlRelationsForHazards = function(hazards) 
		{
			var defer = $q.defer();
			var fetch_defer = $q.defer();

			var active_index = 0;

			var collected_relations = [];

			if( hazards.length == 0 ) {
				defer.resolve([]);
				return defer.promise;
			}

			fetchHazardControlRelations(hazards[active_index], fetch_defer).then(function(collected_relations) {
				defer.resolve(collected_relations)
			}, function(error) {
				defer.reject(error);
			});

			function fetchHazardControlRelations(hazard_record, defer) 
			{
				factory.fetchCollection.hazardControlRelations({hazard_id: hazard_record._id}).then(function(data) {

					Array.prototype.push.apply(collected_relations, data);

					active_index++;

					if( active_index > hazards.length - 1 ) {
						defer.resolve(collected_relations);
						return defer.promise;
					}

					fetchHazardControlRelations(hazards[active_index], defer);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
 
			return defer.promise;
		}

		factory.cloneRegisterAssetData = function(data, relations) 
		{
			var defer = $q.defer();
			var clone_defer = $q.defer();

			var clone_stages = ['asset','ipp_scores'];

			// ADD BASIC OBS TO STAGES IF WE ARE CLONING BASIC OBS
			if( relations.hasOwnProperty('clone_basic_obs') && relations.clone_basic_obs ) {
				clone_stages.push('basic_obs');
			}

			var saved_asset = null;
			var saved_ids = {};

			cloneNextRegisterAssetData(clone_defer, clone_stages, 0).then(function(){
				
				defer.resolve();

			}, function(error){
				defer.reject(error);
			});

			function cloneNextRegisterAssetData(defer, clone_stages, current_stage_index)
			{	
				// IF THERE ARE NO FETCH STAGES
				if( !clone_stages.length )
				{
					defer.resolve();
					return defer.promise;
				}

				// IF FINISHED FETCHING ALL STAGES
				if( current_stage_index > clone_stages.length - 1 )
				{
					defer.resolve();
					return defer.promise;
				}

				var active_stage_name = clone_stages[current_stage_index];

				if( active_stage_name == 'asset' ) 
				{
					factory.register_assets.cloneRegisterAssetRecord(data.asset_id, relations).then(function(cloned_asset) {

						// SET DEST ASSET ID TO CLONED INSPECTION
						relations.asset_id = cloned_asset._id;

						// SET SAVED CORE ASSET
						saved_asset = cloned_asset;

						//CLONE NEXT STAGE
						current_stage_index++;
						cloneNextRegisterAssetData(defer, clone_stages, current_stage_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( active_stage_name == 'ipp_scores' )
				{
					var ipp_score_ids = factory.utils.extractRecordIdsFromArray(data.ipp_scores);

					factory.ipp_scores.cloneIppScoreMultiple(ipp_score_ids, relations).then(function(saved_ipp_score_ids) {

						saved_ids[active_stage_name] = saved_ipp_score_ids;

						//CLONE NEXT STAGE
						current_stage_index++;
						cloneNextRegisterAssetData(defer, clone_stages, current_stage_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( active_stage_name == 'basic_obs' ) 
				{
					var basic_ob_ids = factory.utils.extractRecordIdsFromArray(data.basic_obs);

					if( !basic_ob_ids.length ) {
						saved_ids[active_stage_name] = [];

						// CLONE NEXT STAGE
						current_stage_index++;
						cloneNextRegisterAssetData(defer, clone_stages, current_stage_index);
					}

					factory.basic_obs.createBasicObsSnapshotAsset(relations, saved_asset).then(function(snapshot_asset) {

						relations.snapshot_asset_id = snapshot_asset._id;

						factory.basic_obs.cloneBasicObsMultiple(basic_ob_ids, relations).then(function(saved_basic_ob_ids) {

							saved_ids[active_stage_name] = saved_basic_ob_ids;

							// CLONE NEXT STAGE
							current_stage_index++;
							cloneNextRegisterAssetData(defer, clone_stages, current_stage_index);

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});
						
				}

				return defer.promise;
			}

			return defer.promise;
		}

		return factory;
	}

}())