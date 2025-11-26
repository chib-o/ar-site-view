(function() {

	var app = angular.module('riskmachBlueprintChecklists', ['riskmachMedia','riskmachModels','riskmachUtils']);
	app.factory('checklistBlueprintFactory', checklistBlueprintFactory);

	function checklistBlueprintFactory($q, $http, $timeout, authFactory, riskmachDatabasesFactory, mediaFactory, modelsFactory, rmUtilsFactory) 
	{
		var factory = {};

		factory.utils = {
			save_timeout: 0,
			formatRmRecordToModel: function(model_type, rm_record) {

				var model = null;

				if( factory.models.hasOwnProperty(model_type) ) {
					model = factory.models[model_type];
				} else {
					model = modelsFactory.models[model_type];
				}

				Object.keys(model).forEach(function(key) {
					
					// IF RM RECORD DOESN'T HAVE KEY
					if( !rm_record.hasOwnProperty(key) ) {

						// CREATE KEY WITH DEFAULT MODEL VALUE
						rm_record[key] = model[key];
					};

					if( rm_record[key] != null && rm_record[key] != '' ) {

						// IF DATA TYPE IS SET UP FOR RECORD TYPE
						if( factory.data_types.hasOwnProperty(model_type) ) {

							// IF MODELS KEY EXISTS IN RECORDS DATA TYPE OBJECT
							if( factory.data_types[model_type].hasOwnProperty(key) ) {

								var value = null;

								if( factory.data_types[model_type][key] == 'integer' ) {
									value = parseInt( rm_record[key] );
								};

								// CAN FORMAT FOR DATES etc.

								rm_record[key] = value;

							};

						};

					};

				});

				return rm_record;
			},
			isUAuditBlueprintChecklist: function(checklist_record) {
				// return false;

				if( checklist_record.hasOwnProperty('IsUAudit') && checklist_record.IsUAudit == 'Yes' ) {
					return true;
				} else {
					return false;
				}
			},
			isUAuditChecklistInstance: function(checklist_instance) {
				if( !checklist_instance ) {
					return false;
				}

				if( checklist_instance.hasOwnProperty('is_uaudit') && checklist_instance.is_uaudit == 'Yes' ) {
					return true;
				} else {
					return false;
				}
			},
			findItemInSelection: function(collection, key, value) {
				var i = 0;
				var len = collection.length;
				var item_index = null;

				while(i < len) {

					if( collection[i][key] == value ) {
						item_index = i;
					}

					i++;
				}

				return item_index;
			},
			formatUAuditJson: function(json_record, instance_record, asset_record) {
				// PARSE SO WE CAN MANIPULATE DATA
				json_record.uaudit_instance_data = JSON.parse(json_record.uaudit_instance_data);

				factory.utils.createAuditInfoProperty(json_record, instance_record);

				factory.utils.formatUAuditSystemQuestions(json_record, asset_record);

				// STRINGIFY FOR SAVING BACK TO DB
				json_record.uaudit_instance_data = JSON.stringify(json_record.uaudit_instance_data);
			},
			createAuditInfoProperty: function(json_record, instance_record) {
				json_record.uaudit_instance_data.audit_info = {
					_id: null, 
					id: null, 
					rm_id: null, 
					rm_checklist_id: null, 
					date_started: null, 
					date_modified: null, 
					asset_id: null, 
					rm_asset_id: null,
					progress_percentage: 0,
					authors_name: authFactory.cloudUserName()
				}

				json_record.uaudit_instance_data.audit_info._id = instance_record._id;
				json_record.uaudit_instance_data.audit_info.id = instance_record.id;
				json_record.uaudit_instance_data.audit_info.rm_id = instance_record.rm_id;
				json_record.uaudit_instance_data.audit_info.rm_checklist_id = instance_record.rm_checklist_blueprint_id;

				json_record.uaudit_instance_data.audit_info.asset_id = instance_record.asset_id;
				json_record.uaudit_instance_data.audit_info.rm_asset_id = instance_record.rm_asset_id;

				json_record.uaudit_instance_data.audit_info.date_started = instance_record.date_started;
				json_record.uaudit_instance_data.audit_info.date_modified = instance_record.date_started;
			},
			findUAuditSystemQuestions: function(json_record) {
				var system_questions = [];

				angular.forEach(json_record.uaudit_instance_data.pages.collection, function(page_record, page_index) {

					angular.forEach(page_record.sections, function(section_record, section_index) {

						angular.forEach(section_record.questions, function(question_record, question_index) {

							// IF SYSTEM QUESTION
							if( question_record.hasOwnProperty('is_system') && question_record.is_system ) {

								system_questions.push(question_record);

							}

						});

					});

				});

				return system_questions;
			},
			formatUAuditSystemQuestions: function(json_record, asset_record) {

				// FIND SYSTEM QUESTIONS
				var system_questions = factory.utils.findUAuditSystemQuestions(json_record);

				// IF NO SYSTEM QUESTIONS FOUND
				if( !system_questions.length ) {
					return;
				}

				var i = 0;
				var len = system_questions.length;

				while(i < len) {

					if( system_questions[i].hasOwnProperty('answer_setup') && system_questions[i].answer_setup ) {

						// SUBJECT NAME
						if( system_questions[i].answer_setup.hasOwnProperty('type_id') && system_questions[i].answer_setup.type_id == 'subject' ) {
							
							if( asset_record.hasOwnProperty('asset_ref') && asset_record.asset_ref ) {
								system_questions[i].response.answer = asset_record.asset_ref;
								system_questions[i].response.complete = true;
							}

						}

						// GEO LOCATION
						if( system_questions[i].answer_setup.hasOwnProperty('type_id') && system_questions[i].answer_setup.type_id == 'audit_location' ) {

							if( asset_record.hasOwnProperty('geo_data') && asset_record.geo_data ) {
								system_questions[i].response.answer = asset_record.geo_data;
								system_questions[i].response.complete = true;
							}

						}

						// DATE CONDUCTED
						if( system_questions[i].answer_setup.hasOwnProperty('type_id') && system_questions[i].answer_setup.type_id == 'date_inspected' ) {

							if( asset_record.hasOwnProperty('date_modified') && asset_record.date_modified ) {
								system_questions[i].response.answer = asset_record.date_modified;
								system_questions[i].response.complete = true;
							}

						}

					}

					i++;
				}

			},
			collectUAuditSetupMedia: function(checklist_data) {
				var setup_media = [];

				// PAGE LOOP SETTINGS
				var p_i = 0;
				var p_len = checklist_data.pages.collection.length;

				while(p_i < p_len) {

					// SECTION LOOP SETTINGS
					var s_i = 0;
					var s_len = checklist_data.pages.collection[p_i].sections.length;

					while(s_i < s_len) {

						// QUESTION LOOP SETTINGS
						var q_i = 0;
						var q_len = checklist_data.pages.collection[p_i].sections[s_i].questions.length;

						while(q_i < q_len) {

							// ANSWER SETUP MEDIA
							if( checklist_data.pages.collection[p_i].sections[s_i].questions[q_i].answer_setup.hasOwnProperty('media') && checklist_data.pages.collection[p_i].sections[s_i].questions[q_i].answer_setup.media.length ) {

								// ANSWER SETUP MEDIA LOOP SETTINGS
								var am_i = 0;
								var am_len = checklist_data.pages.collection[p_i].sections[s_i].questions[q_i].answer_setup.media.length;

								while(am_i < am_len) {

									setup_media.push( checklist_data.pages.collection[p_i].sections[s_i].questions[q_i].answer_setup.media[am_i] );

									am_i++;
								}
							}

							q_i++;
						}

						s_i++;
					}

					p_i++;
				}

				return setup_media;
			}
		}

		factory.library_download = {
			refreshLibrary: function(filters) {
				var defer = $q.defer();

				// START TIME
				var start_timestamp = new Date().getTime();

				factory.library_download.requestLibrary(filters).then(function(data) {

					factory.library_download.saveLibrary(data).then(function() {

						// END TIME
						var end_timestamp = new Date().getTime();

						var time_taken = end_timestamp - start_timestamp;
						console.log("TIME TAKEN: " + time_taken);

						factory.dbUtils.checklist_blueprints.markChecklistsUpgradeNeeded().then(function() {
							defer.resolve(data);
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
			requestLibrary: function(filters) {
				var defer = $q.defer();

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/ChecklistLibrary',{ 
	                params: {
	                	filters: filters
	                }
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("LIBRARY REQUEST RESPONSE");
	            	// console.log(data);
	            	// console.log( JSON.stringify(data, null, 2) );

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		defer.resolve(data.data);
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("LIBRARY ERROR REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );
	                defer.reject("Error connecting to API for checklist library");
	            });

	            return defer.promise;
			},
			saveLibrary: function(data) {
				var defer = $q.defer();

				factory.dbUtils.checklist_blueprints.existingChecklistRecords().then(function(existing_data) {

					factory.library_download.doSaveLibrary(data, existing_data).then(function() {

						// CLEAN UP
						existing_data = null;

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			doSaveLibrary: function(data, existing_data) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var active_index = 0;

				console.log("SAVE CHECKLIST LIBRARY");

				// IF NO DATA TO SAVE
				if( data.length == 0 ) {
					defer.resolve();
					return defer.promise;
				};

				saveChecklistRecord(save_defer, data[active_index]).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function saveChecklistRecord(defer, checklist_record) {

					factory.dbUtils.checklist_blueprints.saveChecklistRecord(checklist_record, existing_data).then(function(saved_checklist) {

						var options = {
							force: true
						};
							
						active_index++;

						// IF SAVED ALL DATA
						if( active_index > data.length - 1 ) {
							defer.resolve();
							return defer.promise;
						};

						$timeout(function() {
							saveChecklistRecord(defer, data[active_index]);
						}, factory.utils.save_timeout);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			requestLatestChecklist: function(checklist_ref) {
				var defer = $q.defer();

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/ChecklistLibrary',{ 
	                params: {
	                	filters: {
	                		checklist_id: null, 
	                		checklist_ref: checklist_ref, 
	                		latest_version: 'yes',
	                		include_uaudit: 'yes'
	                	}
	                }
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("LATEST CHECKLIST BLUEPRINT RESPONSE");
	            	console.log(data);

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		defer.resolve(data.data);
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("LATEST CHECKLIST BLUEPRINT ERROR RESPONSE");
	            	console.log(data);
	                defer.reject("Error connecting to API for latest checklist blueprint");
	            });

				return defer.promise;
			}
		}

		factory.checklist_blueprint_download = {
			requestData: function(rm_id) {
				var defer = $q.defer();

				var data = {
					checklist_data: null, 
					media_data: null
				}

				factory.checklist_blueprint_download.requestChecklistData(rm_id).then(function(checklist_data) {

					data.checklist_data = checklist_data;

					if( factory.utils.isUAuditBlueprintChecklist(data.checklist_data.checklist_record) ) {
						
						defer.resolve(data);

					} else {

						factory.checklist_blueprint_download.requestChecklistMediaData(rm_id).then(function(media_data) {

							data.media_data = media_data;

							defer.resolve(data);

						}, function(error) {
							defer.reject(error);
						});

					}

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			requestChecklistData: function(rm_id) {
				var defer = $q.defer();

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/ChecklistData',{ 
	                params: {
	                	checklist_id: rm_id
	                	// checklist_id: 1594
	                }
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("BLUEPRINT DATA REQUEST RESPONSE");
	            	console.log(data);
	            	// console.log( JSON.stringify(data, null, 2) );

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		defer.resolve(data.data);
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("BLUEPRINT DATA ERROR REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );
	                defer.reject("Error connecting to API for checklist data");
	            });

	            return defer.promise;
			},
			requestChecklistMediaData: function(rm_id) {
				var defer = $q.defer();

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/ChecklistQuestionBlueprintMedia',{ 
	                params: {
	                	checklist_id: rm_id
	                }
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("CHECKLIST MEDIA REQUEST RESPONSE");

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		defer.resolve(data.data);
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("CHECKLIST MEDIA ERROR REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );
	                defer.reject("Error connecting to API for media data");
	            });

	            return defer.promise;
			},
			requestDownloadChecklistBlueprint: function(checklist_ref) {
				var defer = $q.defer();

				factory.library_download.requestLatestChecklist(checklist_ref).then(function(data) {

					var checklist_record = null;
					if( data.length > 0 ) {
						checklist_record = data[0];
					}

					if( !checklist_record ) {
						defer.reject("Couldn't find checklist");
						return defer.promise;
					}

					// DOWNLOAD CHECKLIST BLUEPRINT
					factory.checklist_blueprint_download.downloadChecklistBlueprint(checklist_record).then(function(saved_blueprint) {
						defer.resolve(saved_blueprint);
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			downloadChecklistBlueprint: function(checklist) {
				var defer = $q.defer();

				if( factory.utils.isUAuditBlueprintChecklist(checklist) ) {

					factory.checklist_blueprint_download.downloadUAuditChecklistBlueprintContent(checklist).then(function(saved_blueprint) {
						defer.resolve(saved_blueprint);
					}, function(error) {
						defer.reject(error);
					});

				} else {

					factory.checklist_blueprint_download.downloadChecklistBlueprintContent(checklist.ChecklistID).then(function(saved_blueprint) {
						defer.resolve(saved_blueprint);
					}, function(error) {
						defer.reject(error);
					});

				}

				return defer.promise;
			},
			downloadChecklistBlueprintContent: function(rm_id) {
				var defer = $q.defer();

				factory.checklist_blueprint_download.requestData(rm_id).then(function(data) {

					factory.checklist_blueprint_download.doInstallChecklistBlueprintContent(data).then(function() {

						factory.dbUtils.checklist_blueprints.markChecklistInstalled(rm_id).then(function(saved_blueprint) {
							defer.resolve(saved_blueprint);
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
			downloadUAuditChecklistBlueprintContent: function(checklist) {
				var defer = $q.defer();

				// ATTEMPT FIND EXISTING JSON RECORD
				factory.dbFetch.checklist_blueprints_json.checklistBlueprintJson(checklist._id).then(function(json_record) {

					if( json_record ) {

						// CONTINUE INSTALL OF MEDIA
						factory.checklist_blueprint_download.installUAuditMedia(json_record).then(function() {

							factory.dbUtils.checklist_blueprints.markChecklistInstalled(checklist.ChecklistID).then(function(saved_blueprint) {
								defer.resolve(saved_blueprint);
							}, function(error) {
								defer.reject(error);
							});

						}, function(error) {
							defer.reject(error);
						});

					} else {
						
						factory.checklist_blueprint_download.requestData(checklist.ChecklistID).then(function(data) {

							var uaudit_data = angular.copy(data.checklist_data.checklist_record.UAuditData);
							// CLEANUP ON RECORD
							data.checklist_data.checklist_record.UAuditData = null;

							factory.dbUtils.checklist_blueprints.saveChecklistRecord(data.checklist_data.checklist_record).then(function(saved_checklist) {

								factory.dbUtils.checklist_blueprints_json.saveNewUAuditJson(uaudit_data, saved_checklist._id).then(function(saved_json_record) {

									factory.checklist_blueprint_download.installUAuditMedia(saved_json_record).then(function() {

										factory.dbUtils.checklist_blueprints.markChecklistInstalled(saved_checklist.ChecklistID).then(function(saved_blueprint) {
											defer.resolve(saved_blueprint);
										}, function(error) {
											defer.reject(error);
										});

									}, function(error) {
										defer.reject(error);
									});

								}, function(error) {
									defer.reject(error);
								});

							}, function(error) {
								defer.reject(error);
							});

						}, function(error) {
							defer.reject(error);
						});

					}

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			doInstallChecklistBlueprintContent: function(data) {
				var defer = $q.defer();

				factory.dbUtils.checklist_blueprints.saveChecklistRecord(data.checklist_data.checklist_record).then(function() {

					factory.dbUtils.checklist_sections.saveChecklistBlueprintSections(data.checklist_data.checklist_sections).then(function() {

						factory.dbUtils.checklist_questions.saveChecklistBlueprintQuestions(data.checklist_data.checklist_questions).then(function() {

							factory.dbUtils.checklist_answers.saveChecklistBlueprintAnswers(data.checklist_data.checklist_answers).then(function() {

								factory.dbUtils.question_statements.saveChecklistBlueprintStatements(data.checklist_data.statements).then(function(){

										factory.dbUtils.media_records.saveMediaRecords(data.media_data).then(function(){

											defer.resolve();
								
										}, function(error) {
											defer.reject(error);
										});

								}, function(error){
									defer.reject(error);
								});
						
							}, function(error) {
								defer.reject(error);
							});

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
			installUAuditMedia: function(blueprint_json_record) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var checklist_data = JSON.parse(blueprint_json_record.uAuditBlueprintJson);
				var checklist_company_id = checklist_data.overview.company_id;

				// COLLECT SETUP MEDIA
				var setup_media = factory.utils.collectUAuditSetupMedia(checklist_data);

				installNextMediaRecord(save_defer, 0).then(function() {

					// console.log("RESOLVED INSTALLING SETUP MEDIA");

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function installNextMediaRecord(defer, active_index) {

					console.log("COLLECTED SETUP MEDIA");
					console.log(setup_media);

					if( active_index > setup_media.length - 1 ) {
						// console.log("FINISHED INSTALLING SETUP MEDIA");

						defer.resolve();
						return defer.promise;
					}

					// MEDIA FILE ALREADY DOWNLOADED, SKIP
					if( setup_media[active_index].hasOwnProperty('file_downloaded') 
					&& setup_media[active_index].file_downloaded == 'Yes' ) 
					{
						active_index++;
						installNextMediaRecord(defer, active_index);
					}
					else
					{
						// ADD MODEL KEYS AND FORMAT
						setup_media[active_index] = factory.utils.formatRmRecordToModel('media_record', setup_media[active_index]);
						setup_media[active_index].rm_revision_number = setup_media[active_index].revision_number;
						setup_media[active_index].record_item_uuid = setup_media[active_index].record_item_id;
						setup_media[active_index].record_item_uuid_ref = setup_media[active_index].record_item_ref;
						setup_media[active_index].rm_record_item_id = setup_media[active_index].record_item_rm_id;
						setup_media[active_index].rm_record_item_ref = setup_media[active_index].record_item_rm_ref;
						setup_media[active_index].media_path = setup_media[active_index].file_url;
						setup_media[active_index].record_type = 'question_image';
						setup_media[active_index].table = 'checklist_question';
						setup_media[active_index].company_id = checklist_company_id;

						// SET ISUAUDIT
						setup_media[active_index].is_uaudit = 'Yes';
						setup_media[active_index].is_register = 'No';

						var chunk_size = 1 * 1024 * 1024;
						var pool_limit = 6;

						// DOWNLOAD UAUDIT MEDIA FILE
						mediaFactory.downloads.downloadMediaFile(setup_media[active_index], chunk_size, pool_limit).then(function(saved_media) {

							console.log("SAVED UAUDIT MEDIA RECORD");

							// UPDATE ITEM IN QUESTION ANSWER SETUP MEDIA
							// setup_media[active_index] = saved_media;
							// UPDATE ITEM IN CHECKLIST MEDIA COLLECTION
							// checklist_data.media.collection[ factory.utils.findItemInSelection(checklist_data.media.collection, saved_media.id, 'id') ] = saved_media;

							console.log("CURRENT CHECKLIST DATA STATE");
							console.log(checklist_data);

							// RE-SAVE json
							var new_json = angular.copy(checklist_data);
							blueprint_json_record.uAuditBlueprintJson = JSON.stringify(new_json);

							factory.dbUtils.checklist_blueprints_json.updateUAuditJson(blueprint_json_record).then(function() {

								// CLEANUP
								new_json = null;

								active_index++;

								installNextMediaRecord(defer, active_index);

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
			},
			installUAuditQuestionMedia: function(blueprint_json_record) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var checklist_data = JSON.parse(blueprint_json_record.uAuditBlueprintJson);

				installNextQuestionsMedia(save_defer, 0).then(function() {

					checklist_data = null;
					defer.resolve();

				}, function(error) {
					checklist_data = null;
					defer.reject(error);
				});

				function installNextQuestionsMedia(defer, active_index) {

					if( active_index > checklist_data.questions.collection.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					console.log("INSTALL QUESTION ["+ active_index +"] MEDIA");

					factory.checklist_blueprint_download.installUAuditQuestionMediaBatch(active_index, checklist_data, blueprint_json_record).then(function() {

						active_index++;

						installNextQuestionsMedia(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			installUAuditQuestionMediaBatch: function(question_index, checklist_data, blueprint_json_record) {
				var defer = $q.defer();

				// QUESTION HAS NO MEDIA TO INSTALL
				if( !checklist_data.questions.collection[question_index].answer_setup.hasOwnProperty('media') || !checklist_data.questions.collection[question_index].answer_setup.media ) {
					defer.resolve();
					return defer.promise;
				}

				var save_defer = $q.defer();

				installNextMediaRecord(save_defer, 0).then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function installNextMediaRecord(defer, active_index) {

					if( active_index > checklist_data.questions.collection[question_index].answer_setup.media.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					// MEDIA FILE ALREADY DOWNLOADED, SKIP
					if( checklist_data.questions.collection[question_index].answer_setup.media[active_index].hasOwnProperty('file_downloaded') 
					&& checklist_data.questions.collection[question_index].answer_setup.media[active_index].file_downloaded == 'Yes' ) 
					{
						active_index++;
						installNextMediaRecord(defer, active_index);
					}
					else
					{
						// ADD MODEL KEYS AND FORMAT
						checklist_data.questions.collection[question_index].answer_setup.media[active_index] = factory.utils.formatRmRecordToModel('media_record', checklist_data.questions.collection[question_index].answer_setup.media[active_index]);
						checklist_data.questions.collection[question_index].answer_setup.media[active_index].rm_revision_number = checklist_data.questions.collection[question_index].answer_setup.media[active_index].revision_number;
						checklist_data.questions.collection[question_index].answer_setup.media[active_index].record_item_uuid = checklist_data.questions.collection[question_index].answer_setup.media[active_index].record_item_id;
						checklist_data.questions.collection[question_index].answer_setup.media[active_index].record_item_uuid_ref = checklist_data.questions.collection[question_index].answer_setup.media[active_index].record_item_ref;
						checklist_data.questions.collection[question_index].answer_setup.media[active_index].rm_record_item_id = checklist_data.questions.collection[question_index].answer_setup.media[active_index].record_item_rm_id;
						checklist_data.questions.collection[question_index].answer_setup.media[active_index].rm_record_item_ref = checklist_data.questions.collection[question_index].answer_setup.media[active_index].record_item_rm_ref;
						checklist_data.questions.collection[question_index].answer_setup.media[active_index].media_path = checklist_data.questions.collection[question_index].answer_setup.media[active_index].file_url;
						checklist_data.questions.collection[question_index].answer_setup.media[active_index].record_type = 'question_image';

						var chunk_size = 1 * 1024 * 1024;
						var pool_limit = 6;

						// DOWNLOAD MEDIA FILE
						mediaFactory.downloads.downloadMediaFile(checklist_data.questions.collection[question_index].answer_setup.media[active_index], chunk_size, pool_limit, true).then(function(saved_media) {

							console.log("SAVED UAUDIT MEDIA RECORD");

							// UPDATE ITEM IN QUESTION ANSWER SETUP MEDIA
							checklist_data.questions.collection[question_index].answer_setup.media[active_index] = saved_media;
							// UPDATE ITEM IN CHECKLIST MEDIA COLLECTION
							checklist_data.media.collection[ factory.utils.findItemInSelection(checklist_data.media.collection, saved_media.id, 'id') ] = saved_media;

							// RE-SAVE JSON
							var new_json = angular.copy(checklist_data);
							blueprint_json_record.uAuditBlueprintJson = JSON.stringify(new_json);

							factory.dbUtils.checklist_blueprints_json.updateUAuditJson(blueprint_json_record).then(function() {

								// CLEANUP
								new_json = null;

								active_index++;

								installNextMediaRecord(defer, active_index);

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
			},
			findPlaceholderEmptyChecklist: function() {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.utils.find({
					selector: {
						table: 'no_checklist_checklist',
						user_id: authFactory.active_profile.UserID,
						company_id: authFactory.active_profile.CompanyID,
					}
				}).then(function(results){

					if( results.docs.length == 0 ) {
						defer.resolve(null);
						return defer.promise;
					}

					defer.resolve(results.docs[0].data);

				}).catch(function(error){
					defer.reject();
				});

				return defer.promise;
			},
			downloadPlaceholderEmptyChecklist: function() {
				var defer = $q.defer();

				factory.checklist_blueprint_download.findPlaceholderEmptyChecklist().then(function(record) {

					console.log("NO CHECKLIST CHECKLIST");
					console.log(record);

					if( !record ) {
						defer.resolve();
						return defer.promise;
					}

					factory.checklist_blueprint_download.downloadChecklistBlueprintContent(record.ChecklistID).then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
		}

		factory.dbFetch = {
			checklist_blueprints: {
				rmChecklistRecord: function(rm_id, existing_data) {
					var defer = $q.defer();

					if( existing_data ) {

						if( existing_data.hasOwnProperty(rm_id) && existing_data[rm_id] ) {
							defer.resolve(existing_data[rm_id]);
						} else {
							defer.resolve(null);
						}

						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.blueprint_checklists.find({
						selector: {
							table: 'checklist_blueprint',
							company_id: authFactory.cloudCompanyId(),
							user_id: authFactory.cloudUserId(), 
							ChecklistID: rm_id
						}
					}).then(function(results){

						console.log("GOT CHECKLIST RECORD");
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
			checklist_sections: {
				rmChecklistSectionRecord: function(rm_id, existing_data) {
					var defer = $q.defer();

					if( angular.isDefined(existing_data[rm_id]) && existing_data[rm_id] ) {
						defer.resolve(existing_data[rm_id]);
					} else {
						defer.resolve(null);
					}

					// riskmachDatabasesFactory.databases.collection.blueprint_checklist_sections.find({
					// 	selector: {
					// 		table: 'checklist_section',
					// 		company_id: authFactory.cloudCompanyId(),
					// 		user_id: authFactory.cloudUserId(), 
					// 		SectionID: rm_id
					// 	}
					// }).then(function(results){

					// 	console.log("GOT CHECKLIST SECTION RECORD");
					// 	if( results.docs.length == 0 ) {
					// 		defer.resolve(null);
					// 	} else {
					// 		defer.resolve(results.docs[0]);
					// 	};

					// }).catch(function(error){
					// 	defer.reject(error);
					// });

					return defer.promise;
				}
			},
			checklist_questions: {
				rmChecklistQuestionRecord: function(rm_id, existing_data) {
					var defer = $q.defer();

					if( angular.isDefined(existing_data[rm_id]) && existing_data[rm_id] ) {
						defer.resolve(existing_data[rm_id]);
					} else {
						defer.resolve(null);
					}

					// riskmachDatabasesFactory.databases.collection.blueprint_checklist_questions.find({
					// 	selector: {
					// 		table: 'checklist_question',
					// 		company_id: authFactory.cloudCompanyId(),
					// 		user_id: authFactory.cloudUserId(), 
					// 		QuestionID: rm_id
					// 	}
					// }).then(function(results){

					// 	console.log("GOT CHECKLIST QUESTION RECORD");
					// 	if( results.docs.length == 0 ) {
					// 		defer.resolve(null);
					// 	} else {
					// 		defer.resolve(results.docs[0]);
					// 	};

					// }).catch(function(error){
					// 	defer.reject(error);
					// });

					return defer.promise;
				}
			},
			checklist_answers: {
				rmChecklistAnswerRecord: function(rm_id, existing_data) {
					var defer = $q.defer();

					if( angular.isDefined(existing_data[rm_id]) && existing_data[rm_id] ) {
						defer.resolve(existing_data[rm_id]);
					} else {
						defer.resolve(null);
					}

					// riskmachDatabasesFactory.databases.collection.blueprint_checklist_answers.find({
					// 	selector: {
					// 		table: 'checklist_answer',
					// 		company_id: authFactory.cloudCompanyId(),
					// 		user_id: authFactory.cloudUserId(), 
					// 		AnswerID: rm_id
					// 	}
					// }).then(function(results){

					// 	console.log("GOT CHECKLIST ANSWER RECORD");
					// 	if( results.docs.length == 0 ) {
					// 		defer.resolve(null);
					// 	} else {
					// 		defer.resolve(results.docs[0]);
					// 	};

					// }).catch(function(error){
					// 	defer.reject(error);
					// });

					return defer.promise;
				}
			},
			question_statements: {
				rmChecklistStatementRecord: function(rm_id, existing_data){
					var defer = $q.defer();

					if( angular.isDefined(existing_data[rm_id]) && existing_data[rm_id] ) {
						defer.resolve(existing_data[rm_id]);
					} else {
						defer.resolve(null);
					}

					// riskmachDatabasesFactory.databases.collection.blueprint_checklist_statements.find({
					// 	selector: {
					// 		table: 'statements',
					// 		company_id: authFactory.cloudCompanyId(),
					// 		user_id: authFactory.cloudUserId(), 
					// 		ID: rm_id
					// 	}
					// }).then(function(results){

					// 	console.log("GOT CHECKLIST STATEMENT RECORD");
					// 	if( results.docs.length == 0 ) {
					// 		defer.resolve(null);
					// 	} else {
					// 		defer.resolve(results.docs[0]);
					// 	};

					// }).catch(function(error){
					// 	defer.reject(error);
					// });

					return defer.promise;
				}
			},
			media_records: {
				rmMediaRecord: function(rm_id, existing_data) {
					var defer = $q.defer();

					if( angular.isDefined(existing_data[rm_id]) && existing_data[rm_id] ) {
						defer.resolve(existing_data[rm_id]);
					} else {
						defer.resolve(null);
					}

					// riskmachDatabasesFactory.databases.collection.media.find({
					// 	selector: {
					// 		table: 'checklist_question',
					// 		company_id: authFactory.cloudCompanyId(),
					// 		user_id: authFactory.cloudUserId(), 
					// 		MediaID: rm_id
					// 	}
					// }).then(function(results){

					// 	console.log("GOT MEDIA RECORD");
					// 	if( results.docs.length == 0 ) {
					// 		defer.resolve(null);
					// 	} else {
					// 		defer.resolve(results.docs[0]);
					// 	};

					// }).catch(function(error){
					// 	defer.reject(error);
					// });

					return defer.promise;
				}
			},
			checklist_blueprints_json: {
				checklistBlueprintJson: function(checklist_blueprint_id) {
					var defer = $q.defer();

					if( !checklist_blueprint_id ) {
						defer.resolve(null);
						return defer.promise;
					}

					var db = riskmachDatabasesFactory.databases.collection.blueprint_checklists_json;

					db.find({
						selector: {
							checklist_blueprint_id: checklist_blueprint_id
						}
					}).then(function(result) {

						console.log("CHECKLIST BLUEPRINT JSON");
						console.log(result);

						if( result.docs.length ) {
							defer.resolve(result.docs[0]);
						} else {
							defer.resolve(null);
						}

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;	
				}
			}
		}

		factory.dbUtils = {
			checklist_blueprints: {
				saveChecklistRecord: function(checklist_record, existing_data) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					checklist_record = factory.utils.formatRmRecordToModel('checklist_blueprint', checklist_record);

					// SET USER AND COMPANY IDS
					checklist_record.user_id = authFactory.cloudUserId();
					checklist_record.company_id = authFactory.cloudCompanyId();

					// NULL UAUDIT JSON IF PRESENT - WILL SAVE JSON IN SEPERATE TABLE
					if( checklist_record.hasOwnProperty('UAuditData') && checklist_record.UAuditData ) {
						checklist_record.UAuditData = null;
					}

					factory.dbFetch.checklist_blueprints.rmChecklistRecord(checklist_record.ChecklistID, existing_data).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.checklist_blueprints.saveNewChecklistBlueprintRecord(checklist_record).then(function(saved_checklist) {
								defer.resolve(saved_checklist);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.checklist_blueprints.updateChecklistBlueprintRecord(checklist_record, existing_record).then(function(saved_checklist) {
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
				saveNewChecklistBlueprintRecord: function(checklist_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					riskmachDatabasesFactory.databases.collection.blueprint_checklists.post(checklist_record, options).then(function(saved_record) {
						checklist_record._id = saved_record.id;
						checklist_record._rev = saved_record.rev;

						console.log("SAVED CHECKLIST RECORD");

						defer.resolve(checklist_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateChecklistBlueprintRecord: function(checklist_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.blueprint_checklists;

					// SET ID/REV ON RM RECORD
					checklist_record._id = existing_record._id;
					checklist_record._rev = existing_record._rev;

					checklist_record.installed = existing_record.installed;
					checklist_record.date_installed = existing_record.date_installed;
					checklist_record.upgrade_needed = existing_record.upgrade_needed;
					checklist_record.company_id = existing_record.company_id; 
					checklist_record.user_id = existing_record.user_id;

					db.put(checklist_record).then(function(saved_record) {
						checklist_record._id = saved_record.id;
						checklist_record._rev = saved_record.rev;

						// UPDATE ID AND REV OF EXISTING DATA
						existing_record._id = saved_record.id;
						existing_record._rev = saved_record.rev;

						console.log("CHECKLIST RECORD UPDATED");

						defer.resolve(checklist_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				getChecklistLibrary: function() {
					var defer = $q.defer();

					riskmachDatabasesFactory.databases.collection.blueprint_checklists.find({
						selector: {
							table: 'checklist_blueprint',
							company_id: authFactory.cloudCompanyId(),
							user_id: authFactory.cloudUserId()
						}
					}).then(function(results){

						console.log("GOT LIBRARY");
						console.log(results.docs);

						defer.resolve(results.docs);
					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}, 
				existingChecklistRecords: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.blueprint_checklists;

					var options = {
						limit: 100, 
						include_docs: true
					};

					var existing_checklists = {};

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve(existing_checklists);
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

									if( !result.rows[i].doc.hasOwnProperty('table') || result.rows[i].doc.table != 'checklist_blueprint' ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('company_id') || result.rows[i].doc.company_id != authFactory.cloudCompanyId() ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
										errors++;
									}

									if( errors == 0 ) {
										existing_checklists[ result.rows[i].doc.ChecklistID ] = result.rows[i].doc;
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
				markChecklistInstalled: function(rm_id) {
					var defer = $q.defer();

					factory.dbFetch.checklist_blueprints.rmChecklistRecord(rm_id, null).then(function(checklist_record) {

						checklist_record.installed = 'Yes';
						checklist_record.date_installed = new Date().getTime();

						var db = riskmachDatabasesFactory.databases.collection.blueprint_checklists;

						db.put(checklist_record, {force: true}).then(function(result) {
							checklist_record._id = result.id;
							checklist_record._rev = result.rev;

							defer.resolve(checklist_record);
						}).then(function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				markChecklistsUpgradeNeeded: function() {
					var defer = $q.defer();

					factory.dbUtils.checklist_blueprints.getChecklistLibrary().then(function(checklists) {

						// NO CHECKLISTS
						if( checklists.length == 0 ) {
							defer.resolve();
							return defer.promise;
						};

						var latest_checklists = [];

						// FILTER TO FIND LATEST CHECKLISTS
						angular.forEach(checklists, function(record, index) {

							// IF NOT SUPERSEEDED AND PUBLISHED
							if( (record.Superseeded == 'No' || record.Superseeded == null || record.Superseeded == '') && record.PublishedDate != null && record.PublishedDate != '' ) {
								latest_checklists.push(record);
							};

						});

						factory.dbUtils.checklist_blueprints.doMarkChecklistsUpgradeNeeded(latest_checklists, checklists).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doMarkChecklistsUpgradeNeeded: function(latest_checklists, checklists) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					markChecklistUpgradeNeeded(save_defer).then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					function markChecklistUpgradeNeeded(defer) {

						factory.dbUtils.checklist_blueprints.markChecklistRecordUpgradeNeeded(latest_checklists[active_index], checklists).then(function() {

							active_index++;

							if( active_index > latest_checklists.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							markChecklistUpgradeNeeded(defer);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				markChecklistRecordUpgradeNeeded: function(checklist_record, past_checklists) {
					var defer = $q.defer();

					// IF ALREADY INSTALLED, UPGRADE NOT NEEDED
					if( checklist_record.installed == 'Yes' ) {
						defer.resolve();
						return defer.promise;
					};

					var upgrade_needed = null;

					// IF ANY PAST CHECKLIST WAS INSTALLED, LATEST CHECKLIST NEEDS UPGRADE
					angular.forEach(past_checklists, function(record, index) {
						if( record.ChecklistRef == checklist_record.ChecklistRef ) {
							if( record.installed == 'Yes' ) {
								upgrade_needed = 'Yes';
							};
						};
 					});

					// UPGRADE NOT NEEDED
 					if( upgrade_needed == null ) {
 						defer.resolve();
 						return defer.promise;
 					};

 					var db = riskmachDatabasesFactory.databases.collection.blueprint_checklists;

					var options = {
						force: true
					};

					checklist_record.upgrade_needed = 'Yes';

					db.post(checklist_record, options).then(function(saved_record) {
						checklist_record._id = saved_record.id;
						checklist_record._rev = saved_record.rev;

						console.log("CHECKLIST RECORD MARKED UPGRADE NEEDED");

						defer.resolve(checklist_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			checklist_sections: {
				saveChecklistBlueprintSections: function(checklist_sections) {
					var defer = $q.defer();

					factory.dbUtils.checklist_sections.existingChecklistBlueprintSections().then(function(existing_data) {

						factory.dbUtils.checklist_sections.doSaveChecklistBlueprintSections(checklist_sections, existing_data).then(function() {
							
							// CLEAR UP
							existing_data = null;

							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveChecklistBlueprintSections: function(checklist_sections, existing_data){
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					console.log( JSON.stringify(checklist_sections, null, 2) );
					console.log("SAVE CHECKLIST SECTIONS");

					// IF NO DATA TO SAVE
					if( checklist_sections.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveSectionRecord(save_defer, checklist_sections[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveSectionRecord(defer, section_record) {

						factory.dbUtils.checklist_sections.saveSectionRecord(section_record, existing_data).then(function(saved_section) {

							var options = {
								force: true
							};
								
							active_index++;

							// IF SAVED ALL checklist_sections
							if( active_index > checklist_sections.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveSectionRecord(defer, checklist_sections[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				saveSectionRecord: function(section_record, existing_data) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					section_record = factory.utils.formatRmRecordToModel('checklist_sections', section_record);

					// SET USER AND COMPANY IDS
					section_record.user_id = authFactory.cloudUserId();
					section_record.company_id = authFactory.cloudCompanyId();

					factory.dbFetch.checklist_sections.rmChecklistSectionRecord(section_record.SectionID, existing_data).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.checklist_sections.saveNewSectionRecord(section_record).then(function(saved_section) {

								defer.resolve(saved_section);

							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.checklist_sections.updateSectionRecord(section_record, existing_record).then(function(saved_section) {

								defer.resolve(saved_section);

							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveNewSectionRecord: function(section_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					riskmachDatabasesFactory.databases.collection.blueprint_checklist_sections.post(section_record, options).then(function(saved_record) {
						section_record._id = saved_record.id;
						section_record._rev = saved_record.rev;

						console.log("SAVED SECTION");

						defer.resolve(section_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateSectionRecord: function(section_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.blueprint_checklist_sections;

					// SET ID/REV ON RM RECORD
					section_record._id = existing_record._id;
					section_record._rev = existing_record._rev;

					section_record.company_id = existing_record.company_id; 
					section_record.user_id = existing_record.user_id;

					db.put(section_record).then(function(saved_record) {
						section_record._id = saved_record.id;
						section_record._rev = saved_record.rev;

						console.log("CHECKLIST SECTION RECORD UPDATED");

						defer.resolve(section_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingChecklistBlueprintSections: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.blueprint_checklist_sections;
					var options = {
						limit: 100, 
						include_docs: true
					};

					var existing_sections = {};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve(existing_sections);

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

									if( !result.rows[i].doc.hasOwnProperty('table') || result.rows[i].doc.table != 'checklist_section' ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('company_id') || result.rows[i].doc.company_id != authFactory.cloudCompanyId() ) {
										errors++;
									}

									if( errors == 0 ) {
										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev, 
											user_id: result.rows[i].doc.user_id, 
											company_id: result.rows[i].doc.company_id
										};

										existing_sections[ result.rows[i].doc.SectionID ] = record;
									}

									i++;
								}

								options.startkey = result.rows[ result.rows.length - 1 ].id;
								options.skip = 1;

								result.rows = null;

								fetchNextPage(defer);

							} else {
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
			checklist_questions: {
				saveChecklistBlueprintQuestions: function(checklist_questions) {
					var defer = $q.defer();

					factory.dbUtils.checklist_questions.existingChecklistBlueprintQuestions().then(function(existing_data) {

						factory.dbUtils.checklist_questions.doSaveChecklistBlueprintQuestions(checklist_questions, existing_data).then(function() {
							
							// CLEAR UP
							existing_data = null;

							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveChecklistBlueprintQuestions: function(checklist_questions, existing_data) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					console.log("SAVE CHECKLIST QUESTIONS");

					// IF NO DATA TO SAVE
					if( checklist_questions.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveQuestionRecord(save_defer, checklist_questions[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveQuestionRecord(defer, question_record) {

						factory.dbUtils.checklist_questions.saveQuestionRecord(question_record, existing_data).then(function(saved_question) {

							var options = {
								force: true
							};
								
							active_index++;

							// IF SAVED ALL checklist_questions
							if( active_index > checklist_questions.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveQuestionRecord(defer, checklist_questions[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				saveQuestionRecord: function(question_record, existing_data) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					question_record = factory.utils.formatRmRecordToModel('checklist_questions', question_record);

					// SET USER AND COMPANY IDS
					question_record.user_id = authFactory.cloudUserId();
					question_record.company_id = authFactory.cloudCompanyId();

					factory.dbFetch.checklist_questions.rmChecklistQuestionRecord(question_record.QuestionID, existing_data).then(function(existing_record) {

						console.log("QUESTION RECORD TO SAVE");
						console.log(JSON.stringify(question_record, null, 2));
						console.log(authFactory.cloudUserId());
						console.log(authFactory.cloudCompanyId());

						if( existing_record == null ) {
							factory.dbUtils.checklist_questions.saveNewQuestionRecord(question_record).then(function(saved_question) {
								defer.resolve(saved_question);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.checklist_questions.updateQuestionRecord(question_record, existing_record).then(function(saved_question) {
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
				saveNewQuestionRecord: function(question_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					riskmachDatabasesFactory.databases.collection.blueprint_checklist_questions.post(question_record, options).then(function(saved_record) {
						question_record._id = saved_record.id;
						question_record._rev = saved_record.rev;

						console.log("SAVED QUESTION");

						defer.resolve(question_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				updateQuestionRecord: function(question_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.blueprint_checklist_questions;

					// SET ID/REV ON RM RECORD
					question_record._id = existing_record._id;
					question_record._rev = existing_record._rev;

					question_record.company_id = existing_record.company_id; 
					question_record.user_id = existing_record.user_id;

					db.put(question_record).then(function(saved_record) {
						question_record._id = saved_record.id;
						question_record._rev = saved_record.rev;

						console.log("CHECKLIST QUESTION RECORD UPDATED");

						defer.resolve(question_record);
					}).catch(function(error) {
						defer.reject(error);
					});
 
					return defer.promise;
				},
				existingChecklistBlueprintQuestions: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.blueprint_checklist_questions;
					var options = {
						limit: 100, 
						include_docs: true
					};

					var existing_questions = {};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve(existing_questions);

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

									if( !result.rows[i].doc.hasOwnProperty('table') || result.rows[i].doc.table != 'checklist_question' ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('company_id') || result.rows[i].doc.company_id != authFactory.cloudCompanyId() ) {
										errors++;
									}

									if( errors == 0 ) {
										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev, 
											user_id: result.rows[i].doc.user_id, 
											company_id: result.rows[i].doc.company_id
										};

										existing_questions[ result.rows[i].doc.QuestionID ] = record;
									}

									i++;
								}

								options.startkey = result.rows[ result.rows.length - 1 ].id;
								options.skip = 1;

								result.rows = null;

								fetchNextPage(defer);

							} else {
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
			checklist_answers: {
				saveChecklistBlueprintAnswers: function(checklist_answers) {
					var defer = $q.defer();

					factory.dbUtils.checklist_answers.existingChecklistBlueprintAnswers().then(function(existing_data) {

						factory.dbUtils.checklist_answers.doSaveChecklistBlueprintAnswers(checklist_answers, existing_data).then(function() {
							
							// CLEAR UP
							existing_data = null;

							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveChecklistBlueprintAnswers: function(checklist_answers, existing_data) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					console.log( JSON.stringify(checklist_answers, null, 2) );
					console.log("SAVE CHECKLIST ANSWERS");
					// alert("Checklist answers");

					// IF NO DATA TO SAVE
					if( checklist_answers.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveAnswerRecord(save_defer, checklist_answers[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveAnswerRecord(defer, answer_record) {

						factory.dbUtils.checklist_answers.saveAnswerRecord(answer_record, existing_data).then(function(saved_answer) {

							var options = {
								force: true
							};
								
							active_index++;

							// IF SAVED ALL checklist_answers
							if( active_index > checklist_answers.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveAnswerRecord(defer, checklist_answers[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				saveAnswerRecord: function(answer_record, existing_data) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					answer_record = factory.utils.formatRmRecordToModel('checklist_answers', answer_record);

					// SET USER AND COMPANY IDS
					answer_record.user_id = authFactory.cloudUserId();
					answer_record.company_id = authFactory.cloudCompanyId();

					factory.dbFetch.checklist_answers.rmChecklistAnswerRecord(answer_record.AnswerID, existing_data).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.checklist_answers.saveNewAnswerRecord(answer_record).then(function(saved_answer) {
								defer.resolve(saved_answer);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.checklist_answers.updateAnswerRecord(answer_record, existing_record).then(function(saved_answer) {
								defer.resolve(saved_answer);
							}, function(error) {
								defer.reject(error);
							});
						};

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},  
				saveNewAnswerRecord: function(answer_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					riskmachDatabasesFactory.databases.collection.blueprint_checklist_answers.post(answer_record, options).then(function(saved_record) {
						answer_record._id = saved_record.id;
						answer_record._rev = saved_record.rev;

						console.log("SAVED ANSWER");

						defer.resolve(answer_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateAnswerRecord: function(answer_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.blueprint_checklist_answers;

					// SET ID/REV ON RM RECORD
					answer_record._id = existing_record._id;
					answer_record._rev = existing_record._rev;

					answer_record.company_id = existing_record.company_id; 
					answer_record.user_id = existing_record.user_id;

					db.put(answer_record).then(function(saved_record) {
						answer_record._id = saved_record.id;
						answer_record._rev = saved_record.rev;

						console.log("CHECKLIST ANSWER RECORD UPDATED");

						defer.resolve(answer_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingChecklistBlueprintAnswers: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.blueprint_checklist_answers;
					var options = {
						limit: 100, 
						include_docs: true
					};

					var existing_answers = {};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve(existing_answers);

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

									if( !result.rows[i].doc.hasOwnProperty('table') || result.rows[i].doc.table != 'checklist_answer' ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('company_id') || result.rows[i].doc.company_id != authFactory.cloudCompanyId() ) {
										errors++;
									}

									if( errors == 0 ) {
										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev, 
											user_id: result.rows[i].doc.user_id, 
											company_id: result.rows[i].doc.company_id
										};

										existing_answers[ result.rows[i].doc.AnswerID ] = record;
									}

									i++;
								}

								options.startkey = result.rows[ result.rows.length - 1 ].id;
								options.skip = 1;

								result.rows = null;

								fetchNextPage(defer);

							} else {
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
			question_statements: {
				saveChecklistBlueprintStatements: function(statements) {
					var defer = $q.defer();

					factory.dbUtils.question_statements.existingChecklistBlueprintStatements().then(function(existing_data) {

						factory.dbUtils.question_statements.doSaveChecklistBlueprintStatements(statements, existing_data).then(function() {
							
							// CLEAR UP
							existing_data = null;

							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveChecklistBlueprintStatements: function(statements, existing_data) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					console.log( JSON.stringify(statements, null, 2) );
					console.log("SAVE CHECKLIST STATEMENTS");
					// alert("Checklist answers");

					// IF NO DATA TO SAVE
					if( statements.length == 0 ){
						defer.resolve();
						return defer.promise;
					};

					saveStatementRecord(save_defer, statements[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveStatementRecord(defer, record){

						factory.dbUtils.question_statements.saveStatementRecord(record, existing_data).then(function(saved_record) {

							var options = {
								force: true
							};
								
							active_index++;

							// IF SAVED ALL checklist_answers
							if( active_index > statements.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function(){
								saveStatementRecord(defer, statements[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				saveStatementRecord: function(record, existing_data){
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					record = factory.utils.formatRmRecordToModel('question_statement', record);

					factory.dbFetch.question_statements.rmChecklistStatementRecord(record.ID, existing_data).then(function(existing_record){

						if( existing_record == null ){
							factory.dbUtils.question_statements.saveNewStatementRecord(record).then(function(saved_record){
								defer.resolve(saved_record);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.question_statements.updateStatementRecord(record, existing_record).then(function(saved_record){
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
				saveNewStatementRecord: function(record){
					var defer = $q.defer();

					var options = {
						force: true
					};

					riskmachDatabasesFactory.databases.collection.blueprint_checklist_statements.post(record, options).then(function(saved_record) {
						record._id = saved_record.id;
						record._rev = saved_record.rev;

						console.log("SAVED NEW STATEMENT");

						defer.resolve(record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateStatementRecord: function(record, existing_record){
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.blueprint_checklist_statements;

					// SET ID/REV ON RM RECORD
					record._id = existing_record._id;
					record._rev = existing_record._rev;

					record.company_id = existing_record.company_id;
					record.user_id = existing_record.user_id;

					db.put(record).then(function(saved_record) {
						record._id = saved_record.id;
						record._rev = saved_record.rev;

						console.log("CHECKLIST STATEMENT RECORD UPDATED");

						defer.resolve(record);
					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				existingChecklistBlueprintStatements: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.blueprint_checklist_statements;
					var options = {
						limit: 100, 
						include_docs: true
					};

					var existing_statements = {};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve(existing_statements);

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

									if( !result.rows[i].doc.hasOwnProperty('table') || result.rows[i].doc.table != 'statements' ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('company_id') || result.rows[i].doc.company_id != authFactory.cloudCompanyId() ) {
										errors++;
									}

									if( errors == 0 ) {
										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev, 
											user_id: result.rows[i].doc.user_id, 
											company_id: result.rows[i].doc.company_id
										};

										existing_statements[ result.rows[i].doc.ID ] = record;
									}

									i++;
								}

								options.startkey = result.rows[ result.rows.length - 1 ].id;
								options.skip = 1;

								result.rows = null;

								fetchNextPage(defer);

							} else {
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
				saveMediaRecords: function(media_records) {
					var defer = $q.defer();

					factory.dbUtils.media_records.existingChecklistQuestionMediaRecords().then(function(existing_data) {

						factory.dbUtils.media_records.doSaveMediaRecords(media_records, existing_data).then(function() {
							
							// CLEAR UP
							existing_data = null;

							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveMediaRecords: function(media_records, existing_data) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					console.log("SAVE MEDIA RECORDS");

					// IF NO DATA TO SAVE
					if( !media_records || media_records.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveMediaRecord(save_defer, media_records[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveMediaRecord(defer, media_record) {

						factory.dbUtils.media_records.saveMediaRecord(media_record, existing_data).then(function(saved_media) {

							var options = {
								force: true
							};
								
							active_index++;

							// IF SAVED ALL media_records
							if( active_index > media_records.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveMediaRecord(defer, media_records[active_index]);
							}, factory.utils.save_timeout);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				saveMediaRecord: function(media_record, existing_data) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					media_record = factory.utils.formatRmRecordToModel('media_records', media_record);

					factory.dbFetch.media_records.rmMediaRecord(media_record.MediaID, existing_data).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.media_records.saveNewMediaRecord(media_record).then(function(saved_media_record) {
								defer.resolve(saved_media_record);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.media_records.updateMediaRecord(media_record, existing_record).then(function(saved_media_record) {
								defer.resolve(saved_media_record);
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

					riskmachDatabasesFactory.databases.collection.media.post(media_record, options).then(function(saved_record) {
						media_record._id = saved_record.id;
						media_record._rev = saved_record.rev;

						console.log("SAVED MEDIA");

						defer.resolve(media_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateMediaRecord: function(media_record, existing_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.media;

					// SET ID/REV ON RM RECORD
					media_record._id = existing_record._id;
					media_record._rev = existing_record._rev;

					media_record.company_id = existing_record.company_id; 
					media_record.user_id = existing_record.user_id;

					db.put(media_record).then(function(saved_record) {
						media_record._id = saved_record.id;
						media_record._rev = saved_record.rev;

						console.log("CHECKLIST MEDIA RECORD UPDATED");

						defer.resolve(media_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				existingChecklistQuestionMediaRecords: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.media;
					var options = {
						limit: 100, 
						include_docs: true
					};

					var existing_media = {};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve(existing_media);

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

									if( !result.rows[i].doc.hasOwnProperty('table') || result.rows[i].doc.table != 'checklist_question' ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('company_id') || result.rows[i].doc.company_id != authFactory.cloudCompanyId() ) {
										errors++;
									}

									if( errors == 0 ) {
										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev, 
											user_id: result.rows[i].doc.user_id, 
											company_id: result.rows[i].doc.company_id
										};

										existing_media[ result.rows[i].doc.MediaID ] = record;
									}

									i++;
								}

								options.startkey = result.rows[ result.rows.length - 1 ].id;
								options.skip = 1;

								result.rows = null;

								fetchNextPage(defer);

							} else {
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
			checklist_blueprints_json: {
				saveNewUAuditJson: function(uaudit_data, checklist_blueprint_id) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.blueprint_checklists_json;

					// STRINGIFIED DATA
					var json = uaudit_data;
					var relations = {
						checklist_blueprint_id: checklist_blueprint_id,
						uAuditBlueprintJson: json
					}

					var json_record = factory.models.newChecklistBlueprintJson(relations);

					db.post(json_record, {force: true}).then(function(result) {

						json_record._id = result.id;
						json_record._rev = result.rev;

						defer.resolve(json_record);

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateUAuditJson: function(json_record) {
					var defer = $q.defer();

					console.log(json_record);

					var db = riskmachDatabasesFactory.databases.collection.blueprint_checklists_json;

					db.put(json_record).then(function(result) {
						
						json_record._id = result.id;
						json_record._rev = result.rev;

						defer.resolve();

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			inspections: {
				quickCreateChecklistInspection: function(blueprint_record) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var stages = ['project','inspection'];

					var data = {
						project: null,
						asset: null
					}

					runNextStage(save_defer, 0).then(function() {
						defer.resolve(data);
					}, function(error) {
						defer.reject(error);
					});

					function runNextStage(defer, active_stage) {

						if( active_stage > stages.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						if( stages[active_stage] == 'project' ) {

							factory.dbUtils.inspections.createChecklistProject(blueprint_record).then(function(saved_project) {

								data.project = saved_project;

								active_stage++;
								runNextStage(defer, active_stage);

							}, function(error) {
								defer.reject(error);
							});

						}

						if( stages[active_stage] == 'inspection' ) {

							factory.dbUtils.inspections.createChecklistInspection(blueprint_record, data.project._id).then(function(saved_asset) {

								data.asset = saved_asset;

								active_stage++;
								runNextStage(defer, active_stage);

							}, function(error) {
								defer.reject(error);
							});

						}

						return defer.promise;
					}

					return defer.promise;
				},
				createChecklistProject: function(blueprint_record) {
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

					project_record.title = blueprint_record.ChecklistTitle;
					project_record.description = '';

					// project_record.pp_id = asset_record.pp_id;
					// project_record.pp_name = asset_record.pp_name;
					// project_record.type = asset_record.activity_type;
					// project_record.type_name = asset_record.activity_type_name;

					// IF NOT AGENT
					if( authFactory.active_profile.IsAgent != 'Yes' ) {
						project_record.is_single_inspection = 'Yes';
					}

					db.post(project_record, {force: true}).then(function(result) {

						project_record._id = result.id;
						project_record._rev = result.rev;

						defer.resolve(project_record);

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				createChecklistInspection: function(blueprint_record, project_id) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.assets;

					var asset_record = modelsFactory.models.newSnapshotAsset(project_id);

					asset_record.asset_ref = blueprint_record.ChecklistTitle;

					asset_record.record_modified = 'Yes';

					// IF NOT AGENT
					if( authFactory.active_profile.IsAgent != 'Yes' ) {
						asset_record.is_single_inspection = 'Yes';
					} 

					db.post(asset_record, {force: true}).then(function(result) {

						asset_record._id = result.id;
						asset_record._rev = result.rev;

						defer.resolve(asset_record);

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			}
		}

		factory.models = {
			checklist_blueprint: {
				_id: null, 
				_rev: null,
				ChecklistID: null,
				ChecklistRef: null,
				ChecklistTitle: null,
				ChecklistDescription: null,
				ChecklistType: null,
				ParentQuestionID: null,
				Hidden: null,
				HazardCompatible: null,
				PoolActivityID: null,
				PoolAssetID: null,
				PoolCRID: null,
				CreatedBy: null,
				CreatedOn: null,
				PublishedDate: null,
				PublishedBy: null,
				RevisionNumber: null,
				ModuleID: null,
				CustomModuleID: null,
				CompanyID: null,
				AppChecklistID: null,
				Status: null,
				Archived: null,
				DateModified: null,
				ModifiedBy: null,
				ClonedFromChecklistID: null,
				OriginalChecklistID: null,
				IsLearnerChecklist: null,
				IsLessonChecklist: null,
				ExcludeFromReport: null,
				IsScheme: null,
				IsPermitChecklist: null,
				DirectiveID: null,
				IsExamChecklist: null,
				Superseeded: null,
				BenchmarkActivityID: null,
				CoverMediaRecordID: null,
				PublicAccess: null,
				BlockApp: null,
				TotalQuestionsRequired: null,
				NewStyle: null,
				IsVariant: null,
				IsExam: null,
				ExamDurationSeconds: null,
				AnswerSetChecklistID: null,
				NoChecklistChecklist: 'No', 
				company_id: authFactory.cloudCompanyId(),
				user_id: authFactory.cloudUserId(),
				installed: null,
				date_installed: null, 
				upgrade_needed: null,
				table: 'checklist_blueprint',
				// UAUDIT
				IsUAudit: null,
				UAuditData: null, 
				UUID: null
			},
			checklist_blueprint_json: {
				_id: null, 
				_rev: null, 
				checklist_blueprint_id: null, 
				ChecklistID: null,
				ChecklistRef: null,
				RevisionNumber: null,
				uAuditBlueprintJson: null
			},
			checklist_sections: {
				_id: null,
				_rev: null,
				SectionID: null,
				ChecklistID: null,
				SectionReference: null,
				Name: null,
				Description: null,
				SectionOrder: null,
				DateAdded: null,
				AddedBy: null,
				AppID: null,
				SrcSectionID: null,
				SrcSectionRef: null,
				SrcChecklistID: null,
				SrcChecklistRef: null,
				Status: null,
				DateModified: null,
				ModifiedBy: null,
				LessonSectionID: null,
				SamplePercentage: null,
				company_id: authFactory.cloudCompanyId(),
				user_id: authFactory.cloudUserId(),
				table: 'checklist_section'
			},
			checklist_questions: {
				_id: null,
				_rev: null,
				QuestionID: null,
				QuestionRef: null,
				ChecklistID: null,
				Title: null,
				Question: null,
				QuestionOrder: null,
				DateAdded: null,
				AddedBy: null,
				QuestionHelp: null,
				StatutoryText: null,
				DefaultAssessmentID: null,
				AllowFileUpload: null,
				FileUploadMandatory: null,
				Requirement: null,
				SectionID: null,
				QuestionMandatory: null,
				SrcChecklistID: null,
				SrcChecklistRef: null,
				SrcSectionID: null,
				SrcSectionRef: null,
				SrcQuestionID: null,
				SrcQuestionRef: null,
				AppID: null,
				RepresentsSet: null,
				RepresentsSetStatus: null,
				TriggerType: null,
				TriggerValue: null,
				IsDependant: null,
				DependantQuestionID: null,
				QuestionStatus: null,
				DateModified: null,
				ModifiedBy: null,
				ApprovalStatus: null,
				ApprovalComments: null,
				ApprovedByUserID: null,
				ApprovedByUserName: null,
				ApprovalStatusDate: null,
				SeminarID: null,
				LessonID: null,
				TopicID: null,
				VideoID: null,
				VideoTimeSeconds: null,
				LearnerID: null,
				LearnerName: null,
				AnswerType: null,
				AnswerSettings: null,
				IsSample: null,
				company_id: authFactory.cloudCompanyId(),
				user_id: authFactory.cloudUserId(),
				table: 'checklist_question'
			},
			checklist_answers: {
				_id: null, 
				_rev: null,
				AnswerID: null,
				ChecklistID: null,
			    QuestionID: null,
			    AnswerText: null,
			    DateAdded: null,
			    ActionToPrompt: null,
			    FileUploadMandatory: null,
			    AnswerHelpText: null,
			    AnswerHelpDescription: null,
			    AnswerSelectionType: null,
				company_id: authFactory.cloudCompanyId(),
				user_id: authFactory.cloudUserId(),
				table: 'checklist_answer'
			},
			question_statement: {
				_id: null,
				_rev: null,
				ID: null,
				ChecklistID: null,
				Statement: null,
				FixedSuitable: null,
				Status: null,
				DateAdded: null,
				AddedBy: null,
				DateModified: null,
				ModifiedBy: null,
				question_ids: null,
				company_id: authFactory.cloudCompanyId(),
				user_id: authFactory.cloudUserId(),
				table: 'statements'
			},
			media_records: {
				_id: null, 
				_rev: null,
				QuestionID: null,
		    	MediaID: null,
		    	Ref: null,
		    	RevisionNumber: null,
		    	RecordType: null,
		    	RecordItemID: null,
		    	RecordItemRef: null,
		    	Filesize: null,
		    	Filename: null,
		    	Title: null,
		    	Description: null,
		    	MediaType: null,
		    	MimeType: null,
		    	AddedBy: null,
		    	DateAdded: null,
		    	ModifiedBy: null,
		    	Status: null,
		    	CompanyID: null,
		    	HasThumbnail: null,
				company_id: authFactory.cloudCompanyId(),
				user_id: authFactory.cloudUserId(),
				file_downloaded: null,
				table: 'checklist_question'
			},
			newChecklistBlueprintJson: function(relations) {
				var record = {};

				angular.copy(factory.models.checklist_blueprint_json, record);

				if( relations ) {
					
					for(var key in relations) {

						if( record.hasOwnProperty(key) ) {
							record[key] = relations[key];
						}

					}

				}

				return record;
			}
		}

		factory.data_types = {
			checklist_blueprint: {
				ChecklistID: 'integer',
				ChecklistRef: 'integer',
				ChecklistType: 'integer',
				ParentQuestionID: 'integer',
				PoolActivityID: 'integer',
				PoolAssetID: 'integer',
				PoolCRID: 'integer',
				CreatedBy: 'integer',
				PublishedBy: 'integer',
				RevisionNumber: 'integer',
				ModuleID: 'integer',
				CustomModuleID: 'integer',
				CompanyID: 'integer',
				AppChecklistID: 'integer',
				Status: 'integer',
				ModifiedBy: 'integer',
				ClonedFromChecklistID: 'integer',
				OriginalChecklistID: 'integer',
				DirectiveID: 'integer',
				BenchmarkActivityID: 'integer',
				CoverMediaRecordID: 'integer',
				ExamDurationSeconds: 'integer',
				AnswerSetChecklistID: 'integer',
				company_id: 'integer',
				user_id: 'integer'
			},
			checklist_blueprint_json: {
				ChecklistID: 'integer',
				ChecklistRef: 'integer',
				RevisionNumber: 'integer'
			},
			checklist_sections: {
				SectionID: 'integer',
				ChecklistID: 'integer',
				SectionOrder: 'integer',
				AddedBy: 'integer',
				AppID: 'integer',
				SrcSectionID: 'integer',
				SrcSectionRef: 'integer',
				SrcChecklistID: 'integer',
				SrcChecklistRef: 'integer',
				Status: 'integer',
				ModifiedBy: 'integer',
				LessonSectionID: 'integer',
				SamplePercentage: 'integer',
				company_id: 'integer', 
				user_id: 'integer'
			},
			checklist_questions: {
				QuestionID: 'integer',
				QuestionRef: 'integer',
				ChecklistID: 'integer',
				QuestionOrder: 'integer',
				AddedBy: 'integer',
				DefaultAssessmentID: 'integer',
				SectionID: 'integer',
				SrcChecklistID: 'integer',
				SrcChecklistRef: 'integer',
				SrcSectionID: 'integer',
				SrcSectionRef: 'integer',
				SrcQuestionID: 'integer',
				SrcQuestionRef: 'integer',
				AppID: 'integer',
				RepresentsSetStatus: 'integer',
				DependantQuestionID: 'integer',
				QuestionStatus: 'integer',
				ModifiedBy: 'integer',
				ApprovalStatus: 'integer',
				ApprovedByUserID: 'integer',
				SeminarID: 'integer',
				LessonID: 'integer',
				TopicID: 'integer',
				VideoID: 'integer',
				VideoTimeSeconds: 'integer',
				LearnerID: 'integer',
				company_id: 'integer',
				user_id: 'integer'
			},
			checklist_answers: {
				AnswerID: 'integer',
				ChecklistID: 'integer',
			    QuestionID: 'integer',
			    ActionToPrompt: 'integer',
			    AnswerSelectionType: 'integer',
				company_id: 'integer',
				user_id: 'integer'
			},
			question_statement: {
				ID: 'integer',
				ChecklistID: 'integer',
				Status: 'integer',
				AddedBy: 'integer',
				ModifiedBy: 'integer',
				company_id: 'integer',
				user_id: 'integer'
			},
			media_records: {
				QuestionID: 'integer',
		    	MediaID: 'integer',
		    	Ref: 'integer',
		    	RevisionNumber: 'integer',
		    	RecordItemID: 'integer',
		    	RecordItemRef: 'integer',
		    	Filesize: 'integer',
		    	AddedBy: 'integer',
		    	ModifiedBy: 'integer',
		    	Status: 'integer',
		    	CompanyID: 'integer',
				company_id: 'integer',
				user_id: 'integer'
			}
		}

		factory.getInstalledChecklists = function()
		{
			var defer = $q.defer();

			riskmachDatabasesFactory.databases.collection.blueprint_checklists.find({
				selector: {
					table: 'checklist_blueprint',
					company_id: authFactory.cloudCompanyId(),
					user_id: authFactory.cloudUserId(),
					installed: 'Yes'
				}
			}).then(function(results){
				var installed_checklists = [];

				angular.forEach(results.docs, function(record, index){

					if( record.Superseeded != 'Yes' )
					{
						installed_checklists.push(record);
					}

				});

				defer.resolve(installed_checklists);

			}).catch(function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.getAllChecklists = function() 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.blueprint_checklists;

			db.find({
				selector: {
					table: 'checklist_blueprint',
					user_id: authFactory.cloudUserId(), 
					company_id: authFactory.cloudCompanyId()
				}
			}).then(function(result) {

				var latest_checklists = [];
				var i = 0;
				var len = result.docs.length;

				while(i < len) {
					var errors = 0;

					// IF CHECKLIST IS AN OLD REVISION
					if( result.docs[i].hasOwnProperty('Superseeded') && result.docs[i].Superseeded == 'Yes' ) {
						errors++;
					}

					// IF CHECKLIST IS A TEMPLATE
					if( result.docs[i].hasOwnProperty('IsTemplate') && result.docs[i].IsTemplate == 'Yes' ) {
						errors++;
					}

					// IF CHECKLIST IS CREATED FROM A TEMPLATE
					if( result.docs[i].hasOwnProperty('FromTemplateID') && result.docs[i].FromTemplateID ) {
						errors++;
					}

					// IF CHECKLIST IS POOL
					if( result.docs[i].hasOwnProperty('IsPool') && result.docs[i].IsPool == 'Yes' ) {
						errors++;
					}

					if( errors == 0 ) {
						latest_checklists.push(result.docs[i]);
					}

					i++;
				}

				defer.resolve(latest_checklists);

			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.initialiseChecklist = function(blueprint_id, activity_id, asset_id) 
		{
			var defer = $q.defer();

			//GET THE CHECKLIST BLUEPRINT RECORD
			riskmachDatabasesFactory.databases.collection.blueprint_checklists.get(blueprint_id).then(function(blueprint_record){

				console.log("FOUND THE CHECKLIST BLUEPRINT RECORD");
				console.log(blueprint_record);

				if( factory.utils.isUAuditBlueprintChecklist(blueprint_record) ) {
					
					factory.initialiseUAuditChecklist(blueprint_record, activity_id, asset_id).then(function(instance_record) {
						defer.resolve(instance_record);
					}, function(error) {
						defer.reject(error);
					});

				} else {
					
					factory.initialiseStandardChecklist(blueprint_record, activity_id, asset_id).then(function(instance_record) {
						defer.resolve(instance_record);
					}, function(error) {
						defer.reject(error);
					});

				}

			}).catch(function(error){
				defer.reject("Error finding the checklist blueprint: " + error);
			});

			return defer.promise;
		}

		factory.initialiseChecklistV1 = function(blueprint_id, activity_id, asset_id)
		{
			var defer = $q.defer();

			//GET THE CHECKLIST BLUEPRINT RECORD
			riskmachDatabasesFactory.databases.collection.blueprint_checklists.get(blueprint_id).then(function(blueprint_record){

				console.log("FOUND THE CHECKLIST BLUEPRINT RECORD");
				console.log(blueprint_record);

				//GET THE CHECKLIST QUESTIONS
				riskmachDatabasesFactory.databases.collection.blueprint_checklist_questions.find({
					selector: {
						company_id: authFactory.cloudCompanyId(),
						user_id: authFactory.cloudUserId(),
						ChecklistID: blueprint_record.ChecklistID
					}
				}).then(function(results){

					console.log("FOUND THE BLUEPRINT QUESTION RECORDS");
					console.log(results.docs);
				
					//CREATE THE INSTANCE RECORD
					factory.createChecklistInstanceRecord(blueprint_record, activity_id, asset_id).then(function(instance_record){

						//CREATE THE QUESTION RECORDS
						factory.createChecklistQuestionRecordsSequential(results.docs, instance_record).then(function(){
							defer.resolve(instance_record);
						}, function(error){
							defer.reject("Error initialising the checklist question records" + error);
						});

					}, function(error){
						defer.reject("Error creating the checklist instance record: " + error);
					});

				}).catch(function(error){
					defer.reject("Error fetching blueprint checklist questions: " + error);
				});

			}).catch(function(error){
				defer.reject("Error finding the checklist blueprint: " + error);
			});

			return defer.promise;
		}

		factory.initialiseStandardChecklist = function(blueprint_record, activity_id, asset_id)
		{
			var defer = $q.defer();

			console.log("FOUND THE CHECKLIST BLUEPRINT RECORD");
			console.log(blueprint_record);

			//GET THE CHECKLIST QUESTIONS
			riskmachDatabasesFactory.databases.collection.blueprint_checklist_questions.find({
				selector: {
					company_id: authFactory.cloudCompanyId(),
					user_id: authFactory.cloudUserId(),
					ChecklistID: blueprint_record.ChecklistID
				}
			}).then(function(results){

				console.log("FOUND THE BLUEPRINT QUESTION RECORDS");
				console.log(results.docs);
			
				//CREATE THE INSTANCE RECORD
				factory.createChecklistInstanceRecord(blueprint_record, activity_id, asset_id).then(function(instance_record){

					//CREATE THE QUESTION RECORDS
					factory.createChecklistQuestionRecordsSequential(results.docs, instance_record).then(function(){
						
						//COMPLETE INIT OF INSTANCE RECORD
						factory.checklistInstanceInitialised(instance_record).then(function() {
							defer.resolve(instance_record);
						}, function(error) {
							defer.reject(error);
						});

					}, function(error){
						defer.reject("Error initialising the checklist question records" + error);
					});

				}, function(error){
					defer.reject("Error creating the checklist instance record: " + error);
				});

			}).catch(function(error){
				defer.reject("Error fetching blueprint checklist questions: " + error);
			});

			return defer.promise;
		}

		factory.initialiseUAuditChecklist = function(blueprint_record, activity_id, asset_id)
		{
			var defer = $q.defer();

			console.log("FOUND THE CHECKLIST BLUEPRINT RECORD");
			console.log(blueprint_record);

			//GET BLUEPRINT JSON
			riskmachDatabasesFactory.databases.collection.blueprint_checklists_json.find({
				selector: {
					checklist_blueprint_id: blueprint_record._id
				}
			}).then(function(results){

				console.log("FOUND THE BLUEPRINT JSON");
				console.log(results.docs);
			
				//CREATE THE INSTANCE RECORD
				factory.createChecklistInstanceRecord(blueprint_record, activity_id, asset_id).then(function(instance_record){

					//CREATE THE INSTANCE JSON
					factory.createChecklistInstanceJson(results.docs[0], instance_record).then(function() {

						//COMPLETE INIT OF INSTANCE RECORD
						factory.checklistInstanceInitialised(instance_record).then(function() {
							defer.resolve(instance_record);
						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject("Error creating checklist instance JSON: " + error);
					});

				}, function(error){
					defer.reject("Error creating the checklist instance record: " + error);
				});

			}).catch(function(error){
				defer.reject("Error fetching blueprint checklist JSON: " + error);
			});

			return defer.promise;
		}

		factory.createChecklistInstanceRecord = function(blueprint_record, activity_id, asset_id)
		{
			var defer = $q.defer();

			var no_checklist_checklist = 'No';

			if( blueprint_record.hasOwnProperty('NoChecklistChecklist') && blueprint_record.NoChecklistChecklist == 'Yes' ) {
				no_checklist_checklist = 'Yes';
			}

			var instance_record = {
				_id: null,
				//UUID
				id: null,
				rm_id: null,
				rm_checklist_blueprint_id: blueprint_record.ChecklistID,
				rm_checklist_blueprint_ref: blueprint_record.ChecklistRef,
				rm_checklist_record_id: null,
				synced: false,
				imported: false,
				checklist_title: blueprint_record.ChecklistTitle,
				checklist_description: blueprint_record.ChecklistDescription,
				date_started: new Date().getTime(),
				started_by: authFactory.cloudUserId(),
				status: 1, //DRAFT
				activity_id: activity_id,
				asset_id: asset_id,
				rm_asset_id: null,
				company_id: authFactory.cloudCompanyId(),
				user_id: authFactory.cloudUserId(),
				blueprint_record: blueprint_record,
				blueprint_pool_activity_id: blueprint_record.PoolActivityID,
				total_questions: null,
				num_questions_complete: 0,
				percentage_complete: 0,
				num_sections_complete: 0,
				no_checklist_checklist: no_checklist_checklist,
				is_uaudit: 'No',
				init_incomplete: true
			};

			if( factory.utils.isUAuditBlueprintChecklist(blueprint_record) ) {
				instance_record.is_uaudit = 'Yes';

				// GEN UUID
				// instance_record.id = checklistDataUtilsFactory.uuidv4();
				instance_record.id = rmUtilsFactory.utils.createUUID();
			}

			riskmachDatabasesFactory.databases.collection.checklist_instances.post(instance_record, { force: true }).then(function(result){
				instance_record._id = result.id;
				instance_record._rev = result.rev;
				defer.resolve(instance_record);
			}).catch(function(error){
				defer.reject("Error initialising the checklist record: " + error);
			});

			return defer.promise;
		}

		factory.createChecklistQuestionRecordsSequential = function(questions, instance_record)
		{
			var defer = $q.defer();
			var question_defer = $q.defer();

			if( !questions || questions.length == 0 )
			{
				defer.resolve();
				return defer.promise;
			}

			function createQuestionRecord(questions, instance_record, current_index, question_defer)
			{
				//INITIALISED ALL QUESTIONS
				if( current_index > questions.length - 1 )
				{
					defer.resolve();
					return defer.promise;
				}

				var current_question = questions[current_index];

				//IF THE QUESTION IS DELETED DONT CREATE IT
				if( current_question.QuestionStatus != 0 && current_question.QuestionStatus != 1 )
				{
					//CREATE THE NEXT QUESTION
					current_index++;
					createQuestionRecord(questions, instance_record, current_index, question_defer);
					return defer.promise;
				}

				console.log("CREATING THE QUESTION RECORD");
				console.log(current_question);

				//CREATE THE QUESTION RECORD
				var question_record = {
					rm_id: null,
					rm_question_id: current_question.QuestionID,
					rm_question_ref: current_question.QuestionRef,
					rm_checklist_record_id: null,
					checklist_record_id: instance_record._id,
					rm_section_id: current_question.SectionID,
					trigger_type: current_question.TriggerType,
					trigger_value: current_question.TriggerValue,
					is_dependant: current_question.IsDependant,
					dependant_question_id: current_question.DependantQuestionID,
					question_status: current_question.QuestionStatus,
					answer_type: current_question.AnswerType,
					answer_settings: current_question.AnswerSettings,
					answered: false,
					marked_completed_date: null,
					applicable: null, //CALC THIS
					answer_id: null,
					answer_name: null,
					comments: null,
					date_answered: null,
					answered_by: null,
					company_id: authFactory.cloudCompanyId(),
					user_id: authFactory.cloudUserId(),
					question: current_question.Question,
					question_title: current_question.Title,
					question_help: current_question.QuestionHelp,
					question_order: current_question.QuestionOrder,
					statutory_text: current_question.StatutoryText,
					blueprint_question_record: current_question
				};

				//CALCULATE IF QUESTION IS APPLICABLE
				var applicable = 'No';

				if( !current_question.TriggerType || current_question.TriggerType == 'Auto' )
				{
					applicable = 'Yes';
				}

				question_record.applicable = applicable;

				riskmachDatabasesFactory.databases.collection.checklist_question_records.post(question_record, { force: true }).then(function(result){
					question_record._id = result.id;
					question_record._rev = result.rev;
				
					//CREATE THE NEXT QUESTION
					current_index++;
					createQuestionRecord(questions, instance_record, current_index, question_defer);

				}).catch(function(error){
					defer.reject("Error creating the question record: " + error);
				});

				return question_defer.promise;
			}

			createQuestionRecord(questions, instance_record, 0, question_defer).then(function(){
				defer.resolve();
			}, function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.createChecklistInstanceJson = function(blueprint_json_record, instance_record) 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;
			var checklist_db = riskmachDatabasesFactory.databases.collection.checklist_instances;
			var asset_db = riskmachDatabasesFactory.databases.collection.assets;

			// FETCH ASSET DOC TO ATTEMPT PRE-FILL UAUDIT SYSTEM QUESTIONS
			asset_db.get(instance_record.asset_id).then(function(asset_doc) {

				var relations = {
					checklist_instance_id: instance_record._id,
					rm_checklist_instance_id: instance_record.rm_id
				}

				var record = modelsFactory.models.newChecklistInstanceJson(relations);

				// SAVE STRINGIFIED JSON DATA
				record.uaudit_instance_data = blueprint_json_record.uAuditBlueprintJson;

				// FORMAT UAUDIT JSON DATA
				factory.utils.formatUAuditJson(record, instance_record, asset_doc);

				db.post(record, {force: true}).then(function(result) {

					record._id = result.id;
					record._rev = result.rev;

					instance_record.checklist_instance_json_id = record._id;

					checklist_db.put(instance_record).then(function(instance_result) {
						instance_record._id = instance_result.id;
						instance_record._rev = instance_result.rev;

						defer.resolve();
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
		}

		factory.checklistInstanceInitialised = function(instance_record) 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.checklist_instances;

			instance_record.init_incomplete = false;

			db.put(instance_record).then(function(result) {

				instance_record._id = result.id; 
				instance_record._rev = result.rev;

				defer.resolve(instance_record);

			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.getChecklistInstances = function(activity_id, asset_id)
		{
			var defer = $q.defer();

			var selectors = {
				company_id: authFactory.cloudCompanyId(),
				user_id: authFactory.cloudUserId()
			};

			if( activity_id ) {
				selectors.activity_id = activity_id;
			}

			if( asset_id ) {
				selectors.asset_id = asset_id;
			}

			//GET THE CHECKLIST INSTANCES
			riskmachDatabasesFactory.databases.collection.checklist_instances.find({
				selector: selectors
			}).then(function(results){

				var filtered = [];

				// IF ANY INCOMPLETE INITS, DON'T ADD TO ARRAY
				var i = 0;
				var len = results.docs.length;
				while(i < len) {
					var errors = 0;

					// FILTER OUT INCOMPLETE INITIALISATIONS
					if( results.docs[i].hasOwnProperty('init_incomplete') && results.docs[i].init_incomplete ) {
						errors++;
					}

					if( errors == 0 ) {
						filtered.push(results.docs[i]);
					}

					i++;
				}

				defer.resolve(filtered);
			}).catch(function(error){
				defer.reject("Error getting the checklist audits: " + error);
			});

			return defer.promise;
		}

		factory.getChecklistInstanceData = function(instance_id)
		{
			var defer = $q.defer();

			var data = {
				instance_record: null,
				sections: null,
				question_records: null,
				answer_options: null,
				statements: null
			};

			//FIND THE INSTANCE RECORD
			riskmachDatabasesFactory.databases.collection.checklist_instances.get(instance_id).then(function(instance_record){
				
				console.log("FOUND THE INSTANCE RECORD");
				console.log(instance_record);

				data.instance_record = instance_record;

				//GET THE SECTIONS
				riskmachDatabasesFactory.databases.collection.blueprint_checklist_sections.find({
					selector: {
						company_id: authFactory.cloudCompanyId(),
						user_id: authFactory.cloudUserId(), 
						ChecklistID: instance_record.rm_checklist_blueprint_id
					}
				}).then(function(section_results){

					console.log("GOT CHECKLIST SECTIONS");
					data.sections = section_results.docs;

					//GET THE QUESTION RECORDS
					riskmachDatabasesFactory.databases.collection.checklist_question_records.find({
						selector: {
							company_id: authFactory.cloudCompanyId(),
							user_id: authFactory.cloudUserId(), 
							checklist_record_id: instance_record._id
						}
					}).then(function(question_results){

						console.log("GOT CHECKLIST QUESTION RECORDS");
						console.log(question_results.docs);
						data.question_records = question_results.docs;

						//FIND THE ANSWERS
						riskmachDatabasesFactory.databases.collection.blueprint_checklist_answers.find({
							selector: {
								company_id: authFactory.cloudCompanyId(),
								user_id: authFactory.cloudUserId(), 
								ChecklistID: instance_record.rm_checklist_blueprint_id
							}
						}).then(function(answer_results){

							console.log("GOT ANSWER OPTIONS");
							console.log(answer_results.docs);
							data.answer_options = answer_results.docs;

							//FIND THE STATEMENTS
							riskmachDatabasesFactory.databases.collection.blueprint_checklist_statements.find({
								selector: {
									company_id: authFactory.cloudCompanyId(),
									user_id: authFactory.cloudUserId(),
									ChecklistID: instance_record.rm_checklist_blueprint_id
								}
							}).then(function(statement_results){

								console.log("GOT STATEMENTS");
								console.log(statement_results.docs);
								data.statements = statement_results.docs;

								defer.resolve(data);
								
							}).catch(function(error){
								defer.reject("Error getting checklist statements: " + error);
							});
							
						}).catch(function(error){
							defer.reject("Error getting checklist answer options: " + error);
						});

					});
					
				}).catch(function(error){
					defer.reject("Error getting checklist sections: " + error);
				});

			}, function(error){
				defer.reject("Error getting the checklist instance record: " + error);
			});

			return defer.promise;
		};

		factory.indexPoolActivityOnChecklistInstance = function(instance_id, pool_activity_id) 
		{
			var defer = $q.defer();

			riskmachDatabasesFactory.databases.collection.checklist_instances.get(instance_id).then(function(doc) {

				doc.blueprint_pool_activity_id = pool_activity_id;

				riskmachDatabasesFactory.databases.collection.checklist_instances.put(doc).then(function(result) {

					doc._id = result.id;
					doc._rev = result.rev;

					defer.resolve(doc);

				}).catch(function(error) {
					console.log("ERROR SAVING CHECKLIST INSTANCE");
					defer.reject(error);
				});

			}).catch(function(error) {
				console.log("ERROR FETCHING CHECKLIST INSTANCE");
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.markChecklistPublished = function(doc_id)
		{
			var defer = $q.defer();

			riskmachDatabasesFactory.databases.collection.checklist_instances.get(doc_id).then(function(doc) {

				doc.status = 2; // PUBLISHED

				doc.date_modified = new Date().getTime();
        		doc.modified_by = authFactory.cloudUserId();

        		doc.date_record_synced = null;
        		doc.date_content_synced = null;
        		doc.date_record_imported = null;
        		doc.date_content_imported = null;
        		doc.record_modified = 'Yes';

				riskmachDatabasesFactory.databases.collection.checklist_instances.post(doc, {force: true}).then(function(result) {

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

		factory.markChecklistDraft = function(doc_id) 
		{
			var defer = $q.defer();

			riskmachDatabasesFactory.databases.collection.get(doc_id).then(function(doc) {

				doc.status = 1; // DRAFT
				
				doc.date_modified = new Date().getTime();
        		doc.modified_by = authFactory.cloudUserId();

        		doc.date_record_synced = null;
        		doc.date_content_synced = null;
        		doc.date_record_imported = null;
        		doc.date_content_imported = null;
        		doc.record_modified = 'Yes';

				riskmachDatabasesFactory.databases.collection.post(doc, {force: true}).then(function(result) {

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

		factory.createNewBlueprintChecklist = function(data) 
		{
			var defer = $q.defer();

			$http.post('https://system.riskmach.co.uk/laravel/public/webapp/v1/CreateUAuditBlueprint',{
            	params: {
            		title: data.title, 
            		description: data.description
            	}
            })
			.success(function(data, status, headers, config) {

				console.log("CREATE NEW CHECKLIST BLUEPRINT RESPONSE");
				console.log(data);

				if( data.error == true ) {
					
					if( data.error_messages && data.error_messages.length > 0 ) {
						defer.reject(data.error_messages[0]);
					} else {
						defer.reject("There was an error creating a new checklist blueprint");
					}

				} else {
					defer.resolve(data.checklist);
				}

            })
            .error(function(data, status, headers, config) {
            	console.log("ERROR CREATING NEW CHECKLIST BLUEPRINT API RESPONSE");
            	console.log(data);
            	defer.reject("Error connecting to checklist blueprint API");
			});

			return defer.promise;
		}

		factory.getChecklistInstanceRecord = function(checklist_instance_id) 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.checklist_instances;

			db.get(checklist_instance_id).then(function(doc) {
				defer.resolve(doc);
			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		riskmachDatabasesFactory.databases.initBlueprintChecklists();
		riskmachDatabasesFactory.databases.initBlueprintChecklistSections();
		riskmachDatabasesFactory.databases.initBlueprintChecklistQuestions();
		riskmachDatabasesFactory.databases.initBlueprintChecklistAnswers();
		riskmachDatabasesFactory.databases.initMedia();
		riskmachDatabasesFactory.databases.initChecklistInstanceRecords();
		riskmachDatabasesFactory.databases.initChecklistQuestionRecords();
		riskmachDatabasesFactory.databases.initChecklistStatementRecords();

		return factory;
	}

}())