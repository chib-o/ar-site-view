(function() {

	var app = angular.module('riskmachDataCleanup', ['angular-jwt','riskmachUtils','riskmachDatabases','riskmachModels']);
	app.factory('dataCleanupFactory', dataCleanupFactory);

	function dataCleanupFactory($q, $http, $rootScope, riskmachDatabasesFactory, authFactory, rmUtilsFactory, modelsFactory) 
	{
		var factory = {};

		factory.db_stores = {
			doc_store: 'document-store', 
			by_seq_store: 'by-sequence', 
			attach_store: 'attach-store',
			attach_seq_store: 'attach-seq-store'
		}

		factory.utils = {
			project_filters: {
				project_id: null, 
				user_id: null, 
				client_id: null, 
				archived: null, 
				imported: true
			},
			core_filters: {
				core_project_id: null,
				site_ids: [],
				company_id: null, 
				client_id: null,
				user_id: null,
				imported: true
			},
			doc_stores_deleted: 0,
			by_seq_deleted: 0,
			att_seq_store_deleted: 0,
			att_store_deleted: 0,
			indexOfParent: function(parent_array, parent_id) {
				var i = 0;
				var len = parent_array.length;

				var parent_index = -1;

				while(i < len) {
					if( parent_array[i]._id == parent_id ) {
						parent_index = i;
					}

					i++;
				}

				return parent_index;
			},
			indexOfParentKey: function(parent_array, parent_key, parent_value) {
				var i = 0;
				var len = parent_array.length;

				var parent_index = -1;

				while(i < len) {

					if( parent_array[i].hasOwnProperty(parent_key) ) {

						if( parent_array[i][parent_key] == parent_value ) {
							parent_index = i;
						}

					}

					i++;
				}

				return parent_index;
			}
		}

		factory.fetched_data = {
			// PROJECT DATA
			projects: [],
			snapshot_assets: [],
			risks: [],
			checklist_instances: [],
			checklist_instances_json: [],
			checklist_questions: [],
			ra_question_relations: [],
			tasks: [],
			project_hazards: [],
			project_controls: [],
			hazard_control_relations: [],
			ra_control_relations: [],
			qc_check_records: [],
			// CORE DATA
			core_projects: [],
			sites: [], 
			buildings: [],
			areas: [],
			register_assets: [],
			register_tasks: [],
			qr_codes: [],
			mr_meta: [],
			ipp_score_relations: [],
			// FETCH RECORDS
			fetch_records: [],
			fetch_items: [],
			fetch_item_data: [],
			// MANAGED RISK DATA
			managed_risks: []
		}

		factory.cleanUpFactoryData = function() 
		{	
			// PROJECT DATA
			factory.fetched_data.projects = [];
			factory.fetched_data.snapshot_assets = [];
			factory.fetched_data.risks = [];
			factory.fetched_data.checklist_instances = [];
			factory.fetched_data.checklist_instances_json = [];
			factory.fetched_data.checklist_questions = [];
			factory.fetched_data.ra_question_relations = [];
			factory.fetched_data.tasks = [];
			factory.fetched_data.project_hazards = [];
			factory.fetched_data.project_controls = [];
			factory.fetched_data.hazard_control_relations = [];
			factory.fetched_data.ra_control_relations = [];
			factory.fetched_data.qc_check_records = [];

			// CORE DATA
			factory.fetched_data.core_projects = [];
			factory.fetched_data.sites = [];
			factory.fetched_data.buildings = [];
			factory.fetched_data.areas = [];
			factory.fetched_data.register_assets = [];
			factory.fetched_data.register_tasks = [];
			factory.fetched_data.qr_codes = [];
			factory.fetched_data.mr_meta = [];
			factory.fetched_data.ipp_score_relations = [];

			// FETCH RECORDS
			factory.fetched_data.fetch_records = [];
			factory.fetched_data.fetch_items = [];
			factory.fetched_data.fetch_item_data = [];

			// META
			factory.utils.doc_stores_deleted = 0;
			factory.utils.by_seq_deleted = 0;
			factory.utils.att_seq_store_deleted = 0;
			factory.utils.att_store_deleted = 0;
		}

		factory.cleanUpProjectsData = function(filters) 
		{
			var defer = $q.defer();

			// FETCH PARENT IDS FOR FILTERING
			factory.fetchProjectIdsForFiltering(filters).then(function() {

				// MARK FETCHED PROJECTS CLEAN UP STARTED (LOCK)
				factory.initProjectsCleanUp().then(function() {

					// BEGIN FETCHING AND DELETING EACH STAGED RECORDTYPE
					factory.cleanUpProjectsContents().then(function() {

						console.log("DOC STORES DELETED: " + factory.utils.doc_stores_deleted);
						console.log("BY SEQ DELETED: " + factory.utils.by_seq_deleted);
						console.log("ATTACH SEQ STORES DELETED: " + factory.utils.att_seq_store_deleted);
						console.log("ATTACH STORES DELETED: " + factory.utils.att_store_deleted);

						var total = factory.utils.doc_stores_deleted + factory.utils.by_seq_deleted + factory.utils.att_seq_store_deleted + factory.utils.att_store_deleted;
						console.log("TOTAL STORE DOCS DELETED: " + total);

						// ENSURE FACTORY VALUES ARE CLEARED
						factory.cleanUpFactoryData();

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
		}

		factory.cleanUpCoreData = function(filters) 
		{
			var defer = $q.defer();

			// FETCH PARENT IDS FOR FILTERING
			factory.fetchCoreIdsForFiltering(filters).then(function() {

				// MARK FETCHED CORE PROJECT CLEAN UP STARTED (LOCK)
				factory.initCoreProjectsCleanUp().then(function() {

					// BEGIN FETCHING AND DELETING EACH STAGED RECORDTYPE
					factory.cleanUpCoreContents(filters).then(function() {

						console.log("DOC STORES DELETED: " + factory.utils.doc_stores_deleted);
						console.log("BY SEQ DELETED: " + factory.utils.by_seq_deleted);
						console.log("ATTACH SEQ STORES DELETED: " + factory.utils.att_seq_store_deleted);
						console.log("ATTACH STORES DELETED: " + factory.utils.att_store_deleted);

						var total = factory.utils.doc_stores_deleted + factory.utils.by_seq_deleted + factory.utils.att_seq_store_deleted + factory.utils.att_store_deleted;
						console.log("TOTAL STORE DOCS DELETED: " + total);

						// ENSURE FACTORY VALUES ARE CLEARED
						factory.cleanUpFactoryData();

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
		}

		factory.fetchProjectIdsForFiltering = function(filters) 
		{
			var defer = $q.defer();
			var fetch_defer = $q.defer();

			var stages = ['projects','assets'];

			fetchNextStage(fetch_defer, 0).then(function() {

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			function fetchNextStage(defer, active_index) {

				if( active_index > stages.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				if( stages[active_index] == 'projects' ) {
					factory.dbFetch.projects.fetchProjects(filters).then(function() {

						active_index++;

						fetchNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( stages[active_index] == 'assets' ) {
					factory.dbFetch.assets.fetchSnapshotAssets().then(function() {

						active_index++;

						fetchNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;
			}

			return defer.promise;
		}

		factory.fetchCoreIdsForFiltering = function(filters) 
		{
			var defer = $q.defer();
			var fetch_defer = $q.defer();

			var stages = ['core_projects','sites','register_assets'];

			fetchNextStage(fetch_defer, 0).then(function() {

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			function fetchNextStage(defer, active_index) {

				// FETCHED ALL STAGES
				if( active_index > stages.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				if( stages[active_index] == 'core_projects' ) {
					factory.dbFetch.projects.fetchCoreProjects(filters).then(function() {

						console.log("FETCHED CORE PROJECTS");
						console.log(factory.fetched_data.core_projects);

						active_index++;

						fetchNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( stages[active_index] == 'sites' ) {
					factory.dbFetch.sites.fetchSites(filters).then(function() {

						console.log("FETCHED CORE SITES");
						console.log(factory.fetched_data.sites);

						active_index++;

						fetchNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( stages[active_index] == 'register_assets' ) {
					factory.dbFetch.register_assets.fetchRegisterAssets(filters).then(function() {

						console.log("FETCHED CORE REGISTER ASSETS");
						console.log(factory.fetched_data.register_assets);

						active_index++;

						fetchNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;
			}

			return defer.promise;
		}

		factory.initProjectsCleanUp = function() 
		{
			var defer = $q.defer();
			var save_defer = $q.defer();

			if( !factory.fetched_data.projects.length ) {
				defer.resolve();
				return defer.promise;
			}

			var db = riskmachDatabasesFactory.databases.collection.projects;

			initNextProject(save_defer, 0).then(function() {

				console.log("PROJECT CLEANUPS INITIALISED");

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			function initNextProject(defer, active_index) {

				db.get(factory.fetched_data.projects[active_index]._id).then(function(project_doc) {

					project_doc.cleanup_started = 'Yes';

					db.put(project_doc).then(function(result) {

						factory.fetched_data.projects[active_index]._id = result.id;
						factory.fetched_data.projects[active_index]._rev = result.rev;

						// CLEANUP OBJECT
						project_doc = null;

						defer.resolve();

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

		factory.initCoreProjectsCleanUp = function() 
		{
			var defer = $q.defer();
			var save_defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.projects;
			
			initNextCoreProject(save_defer, 0).then(function() {

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			function initNextCoreProject(defer, active_index) {

				if( active_index > factory.fetched_data.core_projects.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				db.get(factory.fetched_data.core_projects[active_index]._id).then(function(doc) {

					doc.cleanup_started = 'Yes';

					db.put(doc).then(function(result) {

						factory.fetched_data.core_projects[active_index]._id = result.id;
						factory.fetched_data.core_projects[active_index]._rev = result.rev;

						// CLEAN UP OBJECT
						doc = null;

						active_index++;

						initNextCoreProject(defer, active_index);

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

		factory.cleanUpProjectsContents = function() 
		{
			var defer = $q.defer();
			var cleanup_defer = $q.defer();

			var stages = ['ra_control_relations','hazard_control_relations','hazards','controls','tasks','qc_check_records','checklists','risks','assets','projects'];

			cleanUpNextStage(cleanup_defer, 0).then(function() {

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			function cleanUpNextStage(defer, active_index) {

				if( active_index > stages.length - 1 ) {
					defer.resolve();
					return defer.promise;
				} 

				if( stages[active_index] == 'ra_control_relations' ) {

					factory.cleanUpRaControlRelations().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				if( stages[active_index] == 'hazard_control_relations' ) {

					factory.cleanUpHazardControlRelations().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				if( stages[active_index] == 'hazards' ) {

					factory.cleanUpHazards().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				if( stages[active_index] == 'controls' ) {

					factory.cleanUpControls().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				if( stages[active_index] == 'tasks' ) {

					factory.cleanUpTasks().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				if( stages[active_index] == 'qc_check_records' ) {

					factory.cleanUpQcCheckRecords().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				if( stages[active_index] == 'checklists' ) {

					factory.cleanUpChecklistsData().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				if( stages[active_index] == 'risks' ) {

					factory.cleanUpRiskAssessments().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				if( stages[active_index] == 'assets' ) {

					factory.cleanUpSnapshotAssets().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				if( stages[active_index] == 'projects' ) {

					factory.cleanUpProjects().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				return defer.promise;
			}

			return defer.promise;
		}

		factory.cleanUpChecklistsData = function() 
		{
			var defer = $q.defer();

			// FETCH CHECKLIST INSTANCES
			factory.dbFetch.checklist_instances.fetchChecklistInstances().then(function() {

				console.log("FETCH MEDIA AND CLIPBOARD FOR CHECKLIST INSTANCES");

				factory.cleanUpMediaAndClipboard(factory.fetched_data.checklist_instances, ['question_response_image','action'], []).then(function() {

					// CLEANUP CHECKLIST INSTANCES CONTENTS
					factory.cleanUpChecklistsContents().then(function() {

						factory.fetched_data.checklist_instances = [];

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
		}

		factory.cleanUpChecklistsContents = function() 
		{
			var defer = $q.defer();
			var cleanup_defer = $q.defer();

			var stages = ['ra_question_relations','checklist_questions','checklist_instances_json','checklist_instances'];

			cleanUpNextStage(cleanup_defer, 0).then(function() {

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			function cleanUpNextStage(defer, active_index) {

				if( active_index > stages.length - 1 ) {
					defer.resolve();
					return defer.promise;
				} 

				if( stages[active_index] == 'ra_question_relations' ) {

					factory.cleanUpRaQuestionRelations().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				if( stages[active_index] == 'checklist_questions' ) {

					factory.cleanUpChecklistQuestions().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				if( stages[active_index] == 'checklist_instances_json' ) {

					factory.cleanUpChecklistInstancesJson().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				if( stages[active_index] == 'checklist_instances' ) {

					factory.cleanUpChecklistInstances().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				return defer.promise;
			}

			return defer.promise;
		}

		factory.cleanUpCoreContents = function(filters) 
		{
			var defer = $q.defer();
			var cleanup_defer = $q.defer();

			var stages = ['basic_obs_projects','managed_risk_data','mr_meta','core_download_meta','qr_codes','ipp_score_relations','register_tasks','register_assets','areas','buildings','sites','core_projects'];

			cleanUpNextStage(cleanup_defer, 0).then(function() {

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			function cleanUpNextStage(defer, active_index) {

				if( active_index > stages.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				if( stages[active_index] == 'basic_obs_projects' ) {
					factory.cleanUpBasicObsProjects(filters).then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						console.log("ERROR: " + stages[active_index]);
						defer.reject(error);
					});
				}

				if( stages[active_index] == 'managed_risk_data' ) {
					factory.cleanUpCoreManagedRiskData().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						console.log("ERROR: " + stages[active_index]);
						defer.reject(error);
					});
				}

				if( stages[active_index] == 'mr_meta' ) {
					factory.cleanUpMrMeta().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						console.log("ERROR: " + stages[active_index]);
						defer.reject(error);
					});
				}

				if( stages[active_index] == 'core_download_meta' ) {
					factory.cleanUpCoreDownloadMeta().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						console.log("ERROR: " + stages[active_index]);
						defer.reject(error);
					});
				}

				if( stages[active_index] == 'ipp_score_relations' ) {
					factory.cleanUpIppScoreRelations().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						console.log("ERROR: " + stages[active_index]);
						defer.reject(error);
					});
				}

				if( stages[active_index] == 'qr_codes' ) {
					factory.cleanUpRegisterQrCodes().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						console.log("ERROR: " + stages[active_index]);
						defer.reject(error);
					});
				}

				if( stages[active_index] == 'register_tasks' ) {
					factory.cleanUpRegisterTasks().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						console.log("ERROR: " + stages[active_index]);
						defer.reject(error);
					});
				}

				if( stages[active_index] == 'register_assets' ) {
					factory.cleanUpRegisterAssets().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						console.log("ERROR: " + stages[active_index]);
						defer.reject(error);
					});
				}

				if( stages[active_index] == 'areas' ) {
					factory.cleanUpAreas().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						console.log("ERROR: " + stages[active_index]);
						defer.reject(error);
					});
				}

				if( stages[active_index] == 'buildings' ) {
					factory.cleanUpBuildings().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						console.log("ERROR: " + stages[active_index]);
						defer.reject(error);
					});
				}

				if( stages[active_index] == 'sites' ) {
					factory.cleanUpSites().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						console.log("ERROR: " + stages[active_index]);
						defer.reject(error);
					});
				}

				if( stages[active_index] == 'core_projects' ) {
					factory.cleanUpCoreProjects().then(function() {

						active_index++;

						cleanUpNextStage(defer, active_index);

					}, function(error) {
						console.log("ERROR: " + stages[active_index]);
						defer.reject(error);
					});
				}

				return defer.promise;
			}

			return defer.promise;
		}

		factory.dbFetch = {
			projects: {
				fetchProjects: function(filters) {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.projects;

					var options = {
						limit: 100, 
						include_docs: true
					};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve();

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

									// IF FITLERING FOR PARTICULAR PROJECT
									if( filters.hasOwnProperty('project_id') && filters.project_id ) {

										if( result.rows[i].doc._id != filters.project_id ) {
											errors++;
										}

									} else {
										// PERFORM OTHER FILTERS

										// NO CORE PROJECTS
										if( result.rows[i].doc.hasOwnProperty('core_project') && result.rows[i].doc.core_project == 'Yes' ) {
											errors++;
										}

										if( filters.hasOwnProperty('user_id') && filters.user_id && filters.user_id != parseInt(result.rows[i].doc.user_id) ) {
											errors++;
										}

										if( filters.hasOwnProperty('client_id') && filters.client_id && parseInt(filters.client_id) != parseInt(result.rows[i].doc.client_id) ) {
											errors++;
										}

										if( (!filters.hasOwnProperty('archived') || !filters.archived) && result.rows[i].doc.hasOwnProperty('archived') && result.rows[i].doc.archived == 'Yes' ) {
											errors++;
										}

										if( filters.hasOwnProperty('imported') && filters.imported && (!result.rows[i].doc.hasOwnProperty('date_content_imported') || !result.rows[i].doc.date_content_imported) ) {
											errors++;
										}

									}

									if( errors == 0 ) {

										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.projects.push(record);
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
				fetchCoreProjects: function(filters) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.projects;

					// IF SPECIFIC CORE PROJECT DEFINED
					if( filters.hasOwnProperty('core_project_id') && filters.core_project_id ) {

						db.get(filters.core_project_id).then(function(core_project_doc) {

							var record = {
								_id: core_project_doc._id, 
								_rev: core_project_doc._rev
							}

							factory.fetched_data.core_projects.push(record);

							defer.resolve();

						}).catch(function(error) {
							defer.reject(error);
						});

					} else {

						// FIND CORE PROJECTS WITH FILTERS
						var selector = {
							core_project: 'Yes'
						};

						if( filters.hasOwnProperty('company_id') && filters.company_id ) {
							selector.client_id = filters.company_id;
						}

						if( filters.hasOwnProperty('user_id') && filters.user_id ) {
							selector.user_id = filters.user_id;
						}

						db.find({
							selector: selector, 
							limit: 1
						}).then(function(results) {

							var i = 0;
							var len = results.docs.length;

							while(i < len) {

								var record = {
									_id: results.docs[i]._id, 
									_rev: results.docs[i]._rev
								}

								factory.fetched_data.core_projects.push(record);

								i++;
							}

							// CLEAN UP
							results.docs = null;

							defer.resolve();

						}).catch(function(error) {
							defer.reject(error);
						});

					}

					return defer.promise;
				},
				fetchBasicObsProjects: function(filters) {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.projects;

					var options = {
						limit: 100, 
						include_docs: true
					};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve();

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

									// IF FITLERING FOR PARTICULAR PROJECT
									if( filters && filters.hasOwnProperty('project_id') && filters.project_id ) {

										if( result.rows[i].doc._id != filters.project_id ) {
											errors++;
										}

									} else {
										// PERFORM OTHER FILTERS

										// IF NOT BASIC OBS PROJECT
										if( result.rows[i].doc.pp_id != 36 ) {
											errors++;
										}

										if( filters.hasOwnProperty('user_id') && filters.user_id && filters.user_id != parseInt(result.rows[i].doc.user_id) ) {
											errors++;
										}

										if( filters.hasOwnProperty('client_id') && filters.client_id && parseInt(filters.client_id) != parseInt(result.rows[i].doc.client_id) ) {
											errors++;
										}

									}

									if( errors == 0 ) {

										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.projects.push(record);
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
				fetchManagedRiskProjects: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.projects;

					var options = {
						limit: 100, 
						include_docs: true
					};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve();

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

									// INDEX OF PARENT (MANAGED RISK ID)
									if( factory.utils.indexOfParent(factory.fetched_data.managed_risks, result.rows[i].doc.managed_risk_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {

										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.projects.push(record);
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
				}
			},
			assets: {
				fetchSnapshotAssets: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.assets;

					var options = {
						limit: 100, 
						include_docs: true
					};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve();

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

									// IF PARENT PROJECT NOT IN CLEANUP
									if( factory.utils.indexOfParent(factory.fetched_data.projects, result.rows[i].doc.project_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {

										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.snapshot_assets.push(record);
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
				fetchRecordAssets: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.assets;

					var options = {
						limit: 100,
						include_docs: true
					}

					var record_assets = [];

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve(record_assets);

					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) 
					{
						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) {

								var i = 0;
								var len = result.rows.length;

								while(i < len) {
									var errors = 0;

									var record_asset_array = null;

									// CHECK IF RECORD ASSET
									if( !result.rows[i].doc.record_type || result.rows[i].doc.record_type == '' ) {
										errors++;
									} else {
										// FIND CORRESPONDING RECORD ARRAY FOR RECORD ASSET
										switch(result.rows[i].doc.record_type) {
											case 'task':
												record_asset_array = factory.fetched_data.tasks; 
												break;
											case 'control_item': 
												record_asset_array = factory.fetched_data.project_controls;
												break;
										}

										if( !record_asset_array ) {
											errors++;
										} else {
											// IF CORRESPONDING RECORD IS NOT FETCHED FOR DELETION
											if( factory.utils.indexOfParent(record_asset_array, result.rows[i].doc.record_id) === -1 ) {
												errors++;
											}
										}
									}

									if(errors == 0) {
										var record = {
											_id: result.rows[i].doc._id,
											_rev: result.rows[i].doc._rev
										}

										record_assets.push(record);
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

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			risks: {
				fetchRiskAssessments: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.assessments;

					var options = {
						limit: 100, 
						include_docs: true
					};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve();

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

									// IF PARENT ASSET NOT IN CLEANUP
									if( factory.utils.indexOfParent(factory.fetched_data.snapshot_assets, result.rows[i].doc.asset_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {

										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.risks.push(record);
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
				}
			},
			checklist_instances: {
				fetchChecklistInstances: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.checklist_instances;

					var options = {
						limit: 100, 
						include_docs: true
					};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve();

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

									// IF PARENT ASSET NOT IN CLEANUP
									if( factory.utils.indexOfParent(factory.fetched_data.snapshot_assets, result.rows[i].doc.asset_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {

										if( !result.rows[i].doc.hasOwnProperty('is_uaudit') ) {
											result.rows[i].doc.is_uaudit = 'No';
										}

										if( !result.rows[i].doc.hasOwnProperty('checklist_instance_json_id') ) {
											result.rows[i].doc.checklist_instance_json_id = null;
										}

										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev,
											is_uaudit: result.rows[i].doc.is_uaudit,
											checklist_instance_json_id: result.rows[i].doc.checklist_instance_json_id
										}

										factory.fetched_data.checklist_instances.push(record);
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
				}
			},
			checklist_questions: {
				fetchChecklistQuestions: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.checklist_question_records;

					var options = {
						limit: 100, 
						include_docs: true
					};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve();

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

									// IF PARENT CHECKLIST NOT IN CLEANUP
									if( factory.utils.indexOfParent(factory.fetched_data.checklist_instances, result.rows[i].doc.checklist_record_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {

										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.checklist_questions.push(record);
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
				}
			},
			checklist_instances_json: {
				fetchChecklistInstancesJson: function() {
					var defer = $q.defer();

					// COLLECT UAUDIT CHECKLIST IDS
					var checklist_json_ids = [];
					var i = 0;
					var len = factory.fetched_data.checklist_instances.length;
					while(i < len) {
						if( factory.fetched_data.checklist_instances[i].is_uaudit == 'Yes' ) {
							checklist_json_ids.push(factory.fetched_data.checklist_instances[i].checklist_instance_json_id);
						}

						i++;
					}

					// IF NO COLLECTED UAUDIT CHECKLIST IDS
					if( !checklist_json_ids.length ) {
						defer.resolve();
						return defer.promise;
					}

					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;

					fetchNextChecklistInstanceJsonRecord(fetch_defer, 0).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function fetchNextChecklistInstanceJsonRecord(defer, active_index) {

						if( active_index > checklist_json_ids.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						db.get(checklist_json_ids[active_index]).then(function(doc) {

							var record = {
								_id: doc._id,
								_rev: doc._rev
							}

							factory.fetched_data.checklist_instances_json.push(record);

							if( doc.hasOwnProperty('rm_record_copy_id') && doc.rm_record_copy_id ) {
								
								var rm_record_copy_id = doc.rm_record_copy_id;

								// CLEAN UP
								doc = null;

								//

								db.get(rm_record_copy_id).then(function(rm_copy_doc) {

									var rm_record_copy = {
										_id: rm_copy_doc._id,
										_rev: rm_copy_doc._rev
									}

									factory.fetched_data.checklist_instances_json.push(rm_record_copy);

									// CLEAN UP
									rm_copy_doc = null;

									active_index++;

									fetchNextChecklistInstanceJsonRecord(defer, active_index);

								}).catch(function(error) {
									console.log("COULDN'T FIND CHECKLIST INSTANCE JSON RM RECORD COPY");
									active_index++;
									fetchNextChecklistInstanceJsonRecord(defer, active_index);
								});

							} else {

								// CLEAN UP
								doc = null;

								active_index++;

								fetchNextChecklistInstanceJsonRecord(defer, active_index);

							}

						}).catch(function(error) {
							console.log("COULDN'T FIND CHECKLIST INSTANCE JSON RECORD");
							active_index++;
							fetchNextChecklistInstanceJsonRecord(defer, active_index);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},	
			tasks: {
				fetchTasks: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.tasks;

					var options = {
						limit: 100, 
						include_docs: true
					};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve();

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

									// IF PARENT ASSET NOT IN CLEANUP
									if( factory.utils.indexOfParent(factory.fetched_data.snapshot_assets, result.rows[i].doc.asset_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {

										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.tasks.push(record);
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
				}
			},
			controls: {
				fetchProjectControls: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.mr_controls;

					var options = {
						limit: 100, 
						include_docs: true
					};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve();

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

									// IF PARENT ASSET NOT IN CLEANUP
									if( factory.utils.indexOfParent(factory.fetched_data.snapshot_assets, result.rows[i].doc.asset_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {

										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.project_controls.push(record);
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
				}
			},
			hazards: {
				fetchProjectHazards: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.mr_hazards;

					var options = {
						limit: 100, 
						include_docs: true
					};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve();

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

									// IF PARENT ASSET NOT IN CLEANUP
									if( factory.utils.indexOfParent(factory.fetched_data.snapshot_assets, result.rows[i].doc.asset_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {

										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.project_hazards.push(record);
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
				}
			},
			ra_question_relations: {
				fetchRaQuestionRelations: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.ra_question_relations;

					var options = {
						limit: 100, 
						include_docs: true
					};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve();

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

									// IF PARENT CHECKLIST NOT IN CLEANUP
									if( factory.utils.indexOfParent(factory.fetched_data.checklist_instances, result.rows[i].doc.checklist_record_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {

										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.ra_question_relations.push(record);
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
				}
			},
			hazard_control_relations: {
				fetchHazardControlRelations: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.hazard_control_relations;

					var options = {
						limit: 100, 
						include_docs: true
					};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve();

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

									// IF PARENT ASSET NOT IN CLEANUP
									if( factory.utils.indexOfParent(factory.fetched_data.snapshot_assets, result.rows[i].doc.asset_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {

										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.hazard_control_relations.push(record);
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
				}
			},
			ra_control_relations: {
				fetchRaControlRelations: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.ra_control_item_relations;

					var options = {
						limit: 100, 
						include_docs: true
					};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve();

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

									// IF PARENT ASSET NOT IN CLEANUP
									if( factory.utils.indexOfParent(factory.fetched_data.snapshot_assets, result.rows[i].doc.asset_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {

										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.ra_control_relations.push(record);
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
				}
			},
			qc_check_records: {
				fetchQcCheckRecords: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.qc_check_records;

					var options = {
						limit: 100, 
						include_docs: true
					};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve();

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

									// IF PROJECT IS NOT IN CLEANUP
									if( factory.utils.indexOfParent(factory.fetched_data.projects, result.rows[i].doc.activity_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {
										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.qc_check_records.push(record);
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
				}
			},
			media: {
				fetchMedia: function(record_ids, record_types) {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.media;

					var options = {
						limit: 100, 
						include_docs: true
					};

					var media = [];

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve(media);

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

									// IF PARENT RECORD NOT IN CLEANUP
									if( result.rows[i].doc.hasOwnProperty('is_uaudit') && result.rows[i].doc.is_uaudit == 'Yes' ) {

										if( record_ids.indexOf(result.rows[i].doc.checklist_instance_id) === -1 ) {
											errors++;
										}

									} else {

										if( record_ids.indexOf(result.rows[i].doc.record_id) === -1 ) {
											errors++;
										}

									}

									// IF RECORD TYPE NOT IN RECORD TYPES
									if( record_types.indexOf(result.rows[i].doc.record_type) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {

										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										media.push(record);
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
				}
			},
			clipboard: {
				fetchClipboardRecords: function(record_ids, media_ids, record_types) {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.clipboard;

					var options = {
						limit: 100, 
						include_docs: true
					};

					var clipboard_records = [];

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve(clipboard_records);

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

									// IF CORRESPONDING RECORD/IMAGE NOT IN CLEANUP
									if( record_ids.indexOf(result.rows[i].doc.record_id) === -1 && media_ids.indexOf(result.rows[i].doc.record_id) === -1 ) {
										errors++;
									}

									// IF RECORD TYPE NOT IN RECORD TYPES
									if( record_types.indexOf(result.rows[i].doc.record_type) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {

										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										clipboard_records.push(record);
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
				}
			},
			sites: {
				fetchSites: function(filters) {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.sites;

					var options = {
						limit: 400, 
						include_docs: true
					}

					fetchNextPage(fetch_defer).then(function() {
						
						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) {

						db.allDocs(options).then(function(result) {

							if( result.rows && result.rows.length > 0 ) {

								var i = 0;
								var len = result.rows.length;

								while(i < len) {
									var errors = 0;

									// IF FILTERING BY PARTICULAR SITES
									if( filters.site_ids.length && filters.site_ids.indexOf(result.rows[i].doc._id) === -1 ) {
										
										errors++;

									} else {

										if( filters.hasOwnProperty('company_id') && filters.company_id && result.rows[i].doc.company_id != filters.company_id ) {
											errors++;
										}

										if( filters.hasOwnProperty('user_id') && filters.user_id && result.rows[i].doc.user_id != filters.user_id ) {
											errors++;
										}

										// if( filters.hasOwnProperty('imported') && filters.imported && (!result.rows[i].doc.hasOwnProperty('date_content_imported') || !result.rows[i].doc.date_content_imported) ) {
										// 	errors++;
										// }

									}

									if( errors == 0 ) {
										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev,
											rm_id: result.rows[i].doc.rm_id
										}

										factory.fetched_data.sites.push(record);
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
				}
			},
			buildings: {
				fetchBuildings: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.buildings;

					var options = {
						limit: 400, 
						include_docs: true
					}

					fetchNextPage(fetch_defer).then(function() {
						
						defer.resolve();

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

									if( factory.utils.indexOfParent(factory.fetched_data.sites, result.rows[i].doc.site_id) === -1 ) {
										errors++;
									}  

									if( errors == 0 ) {
										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.buildings.push(record);
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
				}
			},
			areas: {
				fetchAreas: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.areas;

					var options = {
						limit: 400,
						include_docs: true
					}

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve();

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

									if( factory.utils.indexOfParent(factory.fetched_data.sites, result.rows[i].doc.site_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {
										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.areas.push(record);
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
				}
			},
			register_assets: {
				fetchRegisterAssets: function(filters) {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.register_assets;

					var options = {
						limit: 400, 
						include_docs: true
					}

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve();

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

									if( factory.utils.indexOfParent(factory.fetched_data.sites, result.rows[i].doc.site_id) === -1 ) {
										errors++;
									}

									if( filters.hasOwnProperty('company_id') && filters.company_id && result.rows[i].doc.company_id != filters.company_id ) {
										errors++;
									}

									if( filters.hasOwnProperty('user_id') && filters.user_id && result.rows[i].doc.user_id != filters.user_id ) {
										errors++;
									}

									if( errors == 0 ) {
										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.register_assets.push(record);
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
				fetchRegisterRecordAssets: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.register_assets;

					var options = {
						limit: 100,
						include_docs: true
					}

					var record_assets = [];

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve(record_assets);

					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) 
					{
						db.allDocs(options).then(function(result) {

							if( result && result.rows.length > 0 ) {

								var i = 0;
								var len = result.rows.length;

								while(i < len) {
									var errors = 0;

									var record_asset_array = null;

									// CHECK IF RECORD ASSET
									if( !result.rows[i].doc.record_type || result.rows[i].doc.record_type == '' ) {
										errors++;
									} else {
										// FIND CORRESPONDING RECORD ARRAY FOR RECORD ASSET
										switch(result.rows[i].doc.record_type) {
											case 'site': 
												record_asset_array = factory.fetched_data.sites;
												break;
											case 'building': 
												record_asset_array = factory.fetched_data.buildings;
												break;
											case 'area': 
												record_asset_array = factory.fetched_data.areas;
												break;
											case 'task':
												record_asset_array = factory.fetched_data.register_tasks; 
												break;
										}

										if( !record_asset_array ) {
											errors++;
										} else {
											// IF CORRESPONDING RECORD IS NOT FETCHED FOR DELETION
											if( factory.utils.indexOfParent(record_asset_array, result.rows[i].doc.record_id) === -1 ) {
												errors++;
											}
										}
									}

									if(errors == 0) {
										var record = {
											_id: result.rows[i].doc._id,
											_rev: result.rows[i].doc._rev
										}

										record_assets.push(record);
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

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			},
			register_tasks: {
				fetchRegisterTasks: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.register_tasks;

					var options = {
						limit: 100, 
						include_docs: true
					};

					fetchNextPage(fetch_defer).then(function() {

						defer.resolve();

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

									// IF PARENT ASSET NOT IN CLEANUP
									if( factory.utils.indexOfParent(factory.fetched_data.sites, result.rows[i].doc.site_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {

										var record = {
											_id: result.rows[i].doc._id, 
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.register_tasks.push(record);
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
				}
			},
			qr_codes: {
				fetchRegisterQrCodes: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.qr_register;

					var options = {
						limit: 400,
						include_docs: true
					}

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve();
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

									if( factory.utils.indexOfParent(factory.fetched_data.register_assets, result.rows[i].doc.record_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {
										var record = {
											_id: result.rows[i].doc._id,
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.qr_codes.push(record);
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
				}
			},
			managed_risks: {
				fetchManagedRisks: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.assessments;

					var options = {
						limit: 400,
						include_docs: true
					}

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve();
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

									// NOT MANAGED RISK ASSESSMENT
									if( !result.rows[i].doc.hasOwnProperty('assessment_type') || !result.rows[i].doc.assessment_type != 2 ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('company_id') || result.rows[i].doc.company_id != authFactory.cloudCompanyId() ) {
										errors++;
									}

									if( errors == 0 ) {
										var record = {
											_id: result.rows[i].doc._id,
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.managed_risks.push(record);
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
				}
			},
			mr_meta: {
				fetchMrMeta: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.subject_mr_meta

					var options = {
						limit: 400, 
						include_docs: true
					}

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve();
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

									if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('client_id') || result.rows[i].doc.client_id != authFactory.getActiveCompanyId() ) {
										errors++;
									}

									if( errors == 0 ) {
										var record = {
											_id: result.rows[i].doc._id,
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.mr_meta.push(record);
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
				}
			},
			fetch_records: {
				coreFetchRecords: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.fetch_records;

					var options = {
						limit: 400,
						include_docs: true
					}

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve();
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

									if( !result.rows[i].doc.hasOwnProperty('table') || result.rows[i].doc.table != 'fetch_records' ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('company_id') || result.rows[i].doc.company_id != authFactory.getActiveCompanyId() ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('fetch_type') || result.rows[i].doc.fetch_type != 'core' ) {
										errors++;
									}

									if( !result.rows[i].doc.hasOwnProperty('fetch_record_type') || result.rows[i].doc.fetch_record_type != 'site' ) {
										errors++;
									}

									if( factory.utils.indexOfParentKey(factory.fetched_data.sites, 'rm_id', result.rows[i].doc.fetch_record_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {
										var record = {
											_id: result.rows[i].doc._id,
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.fetch_records.push(record);
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
				}
			},
			fetch_items: {
				getFetchItems: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.fetch_items;

					var options = {
						limit: 400,
						include_docs: true
					}

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve();
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

									if( factory.utils.indexOfParent(factory.fetched_data.fetch_records, result.rows[i].doc.fetch_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {
										var record = {
											_id: result.rows[i].doc._id,
											_rev: result.rows[i].doc._rev
										}

										// var record = result.rows[i].doc;

										factory.fetched_data.fetch_items.push(record);
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
				}
			},
			fetch_item_data: {
				getFetchItemData: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.fetch_item_data;

					var options = {
						limit: 400,
						include_docs: true
					}

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve();
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

									if( factory.utils.indexOfParent(factory.fetched_data.fetch_items, result.rows[i].doc.fetch_item_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {
										var record = {
											_id: result.rows[i].doc._id,
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.fetch_item_data.push(record);
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
				}
			},
			ipp_score_relations: {
				fetchIppScoreRelations: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.register_asset_ipp;

					var options = {
						limit: 400,
						include_docs: true
					}

					fetchNextPage(fetch_defer).then(function() {
						defer.resolve();
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

									if( factory.utils.indexOfParent(factory.fetched_data.register_assets, result.rows[i].doc.asset_id) === -1 ) {
										errors++;
									}

									if( errors == 0 ) {
										var record = {
											_id: result.rows[i].doc._id,
											_rev: result.rows[i].doc._rev
										}

										factory.fetched_data.ipp_score_relations.push(record);
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
				}
			},
		}

		factory.dbCleanup = {
			projects: {
				removeProjects: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.projects, 'rm_projects').then(function() {

						factory.fetched_data.projects = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				removeCoreProjects: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.core_projects, 'rm_projects').then(function() {

						factory.fetched_data.core_projects = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			assets: {
				removeSnapshotAssets: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.snapshot_assets, 'rm_assets').then(function() {

						factory.fetched_data.snapshot_assets = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				removeRecordAssets: function(record_assets) {
					var defer = $q.defer();

					factory.removeDocBatch(record_assets, 'rm_assets').then(function() {

						record_assets = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			risks: {
				removeRiskAssessments: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.risks, 'rm_assessments').then(function() {

						factory.fetched_data.risks = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			checklist_instances: {
				removeChecklistInstances: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.checklist_instances, 'rm_checklist_instances').then(function() {

						factory.fetched_data.checklist_instances = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			checklist_questions: {
				removeChecklistQuestions: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.checklist_questions, 'rm_checklist_question_records').then(function() {

						factory.fetched_data.checklist_questions = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			checklist_instances_json: {
				removeChecklistInstancesJson: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.checklist_instances_json, 'rm_checklist_instances_json').then(function() {

						factory.fetched_data.checklist_instances_json = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			tasks: {
				removeTasks: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.tasks, 'rm_procedure_builder').then(function() {

						factory.fetched_data.tasks = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			controls: {
				removeProjectControls: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.project_controls, 'rm_mr_controls').then(function() {

						factory.fetched_data.project_controls = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			hazards: {
				removeProjectHazards: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.project_hazards, 'rm_mr_hazards').then(function() {

						factory.fetched_data.project_hazards = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			ra_question_relations: {
				removeRaQuestionRelations: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.ra_question_relations, 'rm_ra_question_relations').then(function() {

						factory.fetched_data.ra_question_relations = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			hazard_control_relations: {
				removeHazardControlRelations: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.hazard_control_relations, 'rm_hazard_control_relations').then(function() {

						factory.fetched_data.hazard_control_relations = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			ra_control_relations: {
				removeRaControlRelations: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.ra_control_relations, 'rm_ra_control_item_relations').then(function() {

						factory.fetched_data.ra_control_relations = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			qc_check_records: {
				removeQcCheckRecords: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.qc_check_records, 'rm_qc_check_records').then(function() {

						factory.fetched_data.qc_check_records = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			media: {
				removeMedia: function(media) {
					var defer = $q.defer();

					factory.removeDocBatch(media, 'rm_media').then(function() {

						media = null;

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			clipboard: {
				removeClipboardRecords: function(clipboard_records) {
					var defer = $q.defer();

					factory.removeDocBatch(clipboard_records, 'rm_clipboard').then(function() {

						clipboard_records = null;

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			mr_meta: {
				removeMrMeta: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.mr_meta, 'rm_subject_mr_meta').then(function() {

						factory.fetched_data.mr_meta = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			managed_risks: {
				removeManagedRisks: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.managed_risks, 'rm_assessments').then(function() {

						factory.fetched_data.managed_risks = [];

						defer.resolve();

					}, function(error) {	
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			fetch_item_data: {
				removeFetchItemData: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.fetch_item_data, 'rm_fetch_item_data').then(function() {

						factory.fetched_data.fetch_item_data = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			fetch_items: {
				removeFetchItems: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.fetch_items, 'rm_fetch_items').then(function() {

						factory.fetched_data.fetch_items = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			fetch_records: {
				removeFetchRecords: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.fetch_records, 'rm_fetch_records').then(function() {

						factory.fetched_data.fetch_records = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			ipp_score_relations: {
				removeIppScoreRelations: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.ipp_score_relations, 'rm_register_asset_ipp').then(function() {

						factory.fetched_data.ipp_score_relations = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			qr_codes: {
				removeRegisterQrCodes: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.qr_codes, 'rm_qr_register').then(function() {

						factory.fetched_data.qr_codes = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			register_tasks: {
				removeRegisterTasks: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.register_tasks, 'rm_register_tasks').then(function() {

						factory.fetched_data.register_tasks = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			register_assets: {
				removeRegisterAssets: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.register_assets, 'rm_register_assets').then(function() {

						factory.fetched_data.register_assets = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				removeRegisterRecordAssets: function(record_assets) {
					var defer = $q.defer();

					factory.removeDocBatch(record_assets, 'rm_register_assets').then(function() {

						record_assets = null;

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			areas: {
				removeAreas: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.areas, 'rm_areas').then(function() {

						factory.fetched_data.areas = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			buildings: {
				removeBuildings: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.buildings, 'rm_buildings').then(function() {

						factory.fetched_data.buildings = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			sites: {
				removeSites: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.sites, 'rm_sites').then(function() {

						factory.fetched_data.sites = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			core_projects: {
				removeCoreProjects: function() {
					var defer = $q.defer();

					factory.removeDocBatch(factory.fetched_data.core_projects, 'rm_projects').then(function() {

						factory.fetched_data.core_projects = [];

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			}
		}

		factory.cleanUpProjects = function() 
		{
			var defer = $q.defer();

			// NO NEED TO FETCH PROJECT DATA, ALREADY COLLECTED

			factory.dbCleanup.projects.removeProjects().then(function() {

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpSnapshotAssets = function() 
		{
			var defer = $q.defer();

			// NO NEED TO FETCH ASSET DATA, ALREADY COLLECTED

			factory.cleanUpMediaAndClipboard(factory.fetched_data.snapshot_assets, ['asset'], ['snapshot_asset']).then(function() {

				factory.dbCleanup.assets.removeSnapshotAssets().then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpRiskAssessments = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.risks.fetchRiskAssessments().then(function() {

				factory.cleanUpMediaAndClipboard(factory.fetched_data.risks, ['assessment'], ['assessment']).then(function() {

					factory.dbCleanup.risks.removeRiskAssessments().then(function() {

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
		}

		factory.cleanUpChecklistInstances = function() 
		{
			var defer = $q.defer();
			
			// NO NEED TO FETCH CHECKLIST INSTANCES, ALREADY COLLECTED

			factory.dbCleanup.checklist_instances.removeChecklistInstances().then(function() {

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpChecklistQuestions = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.checklist_questions.fetchChecklistQuestions().then(function() {

				factory.cleanUpMedia(factory.fetched_data.checklist_questions, ['question_response_image']).then(function() {

					factory.dbCleanup.checklist_questions.removeChecklistQuestions().then(function() {

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
		}

		factory.cleanUpChecklistInstancesJson = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.checklist_instances_json.fetchChecklistInstancesJson().then(function() {

				factory.dbCleanup.checklist_instances_json.removeChecklistInstancesJson().then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpQcCheckRecords = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.qc_check_records.fetchQcCheckRecords().then(function() {

				factory.dbCleanup.qc_check_records.removeQcCheckRecords().then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpTasks = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.tasks.fetchTasks().then(function() {

				factory.cleanUpMediaAndClipboard(factory.fetched_data.tasks, ['task'], ['procedure','section','step']).then(function() {

					// FETCH AND CLEAN UP RECORD ASSETS HERE
					factory.cleanUpRecordAssets().then(function() {

						factory.dbCleanup.tasks.removeTasks().then(function() {

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

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpControls = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.controls.fetchProjectControls().then(function() {

				factory.cleanUpMediaAndClipboard(factory.fetched_data.project_controls, ['control_item','control_item_verification'], ['mr_control']).then(function() {

					// FETCH AND CLEAN UP RECORD ASSETS HERE
					factory.cleanUpRecordAssets().then(function() {

						factory.dbCleanup.controls.removeProjectControls().then(function() {
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

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpHazards = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.hazards.fetchProjectHazards().then(function() {

				factory.cleanUpMediaAndClipboard(factory.fetched_data.project_hazards, ['assessment_hazard'], ['mr_hazard']).then(function() {

					factory.dbCleanup.hazards.removeProjectHazards().then(function() {

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
		}

		factory.cleanUpRaQuestionRelations = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.ra_question_relations.fetchRaQuestionRelations().then(function() {

				factory.dbCleanup.ra_question_relations.removeRaQuestionRelations().then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpHazardControlRelations = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.hazard_control_relations.fetchHazardControlRelations().then(function() {

				factory.dbCleanup.hazard_control_relations.removeHazardControlRelations().then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpRaControlRelations = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.ra_control_relations.fetchRaControlRelations().then(function() {

				factory.dbCleanup.ra_control_relations.removeRaControlRelations().then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpMediaAndClipboard = function(records, media_record_types, clipboard_record_types) 
		{
			var defer = $q.defer();

			console.log(records);

			if( !records.length ) {
				defer.resolve();
				return defer.promise;
			}

			var record_ids = [];

			var i = 0;
			var len = records.length;

			while(i < len) {
				record_ids.push(records[i]._id);
				i++;
			}

			factory.dbFetch.media.fetchMedia(record_ids, media_record_types).then(function(media) {

				var media_ids = [];

				var mi = 0;
				var mlen = media.length;

				while(mi < mlen) {
					media_ids.push(media[mi]._id);
					mi++;
				}

				clipboard_record_types.push('image');

				// CLEANUP CLIPBOARD FOR PARENT RECORDS AND FETCHED MEDIA
				factory.cleanUpClipboardRecords(record_ids, media_ids, clipboard_record_types).then(function() {

					media_ids = null;

					// IF NO MEDIA FOUND
					if( !media.length ) {
						record_ids = null;
						defer.resolve();
						return defer.promise;
					}

					factory.dbCleanup.media.removeMedia(media).then(function() {

						media = null;
						record_ids = null;

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
		}

		factory.cleanUpMedia = function(records, record_types) 
		{
			var defer = $q.defer();

			if( !records.length ) {
				defer.resolve();
				return defer.promise;
			}

			var record_ids = [];

			var i = 0;
			var len = records.length;

			while(i < len) {
				record_ids.push(records[i]._id);
				i++;
			}

			factory.dbFetch.media.fetchMedia(record_ids, record_types).then(function(media) {

				// IF NO MEDIA FOUND
				if( !media.length ) {
					record_ids = null;
					defer.resolve();
					return defer.promise;
				}

				factory.dbCleanup.media.removeMedia(media).then(function() {

					record_ids = null;

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpClipboardRecords = function(record_ids, media_ids, record_types) 
		{
			var defer = $q.defer();

			// IF NO RECORD IDS AND NO MEDIA IDS
			if( !record_ids.length && !media_ids.length ) {
				defer.resolve();
				return defer.promise;
			}

			factory.dbFetch.clipboard.fetchClipboardRecords(record_ids, media_ids, record_types).then(function(clipboard_records) {

				// IF NO CLIPBOARD RECORDS FOUND
				if( !clipboard_records.length ) {
					record_ids = null;
					defer.resolve();
					return defer.promise;
				}

				factory.dbCleanup.clipboard.removeClipboardRecords(clipboard_records).then(function() {

					record_ids = null;

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpRecordAssets = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.assets.fetchRecordAssets().then(function(record_assets) {

				// IF NO RECORD ASSETS FOUND
				if( !record_assets.length ) {
					defer.resolve();
					return defer.promise;
				}

				factory.dbCleanup.assets.removeRecordAssets(record_assets).then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpCoreProjects = function() 
		{
			var defer = $q.defer();

			factory.dbCleanup.projects.removeCoreProjects().then(function() {

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpSites = function() 
		{
			var defer = $q.defer();

			factory.dbCleanup.sites.removeSites().then(function() {

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpBuildings = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.buildings.fetchBuildings().then(function() {

				factory.cleanUpRegisterRecordAssets().then(function() {

					factory.dbCleanup.buildings.removeBuildings().then(function() {

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
		}

		factory.cleanUpAreas = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.areas.fetchAreas().then(function() {

				factory.cleanUpRegisterRecordAssets().then(function() {

					factory.dbCleanup.areas.removeAreas().then(function() {

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
		}

		factory.cleanUpRegisterAssets = function() 
		{
			var defer = $q.defer();

			factory.cleanUpMedia(factory.fetched_data.register_assets, ['asset']).then(function() {

				factory.dbCleanup.register_assets.removeRegisterAssets().then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpRegisterTasks = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.register_tasks.fetchRegisterTasks().then(function() {

				factory.cleanUpRegisterRecordAssets().then(function() {

					factory.dbCleanup.register_tasks.removeRegisterTasks().then(function() {

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
		}

		factory.cleanUpRegisterQrCodes = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.qr_codes.fetchRegisterQrCodes().then(function() {

				factory.dbCleanup.qr_codes.removeRegisterQrCodes().then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpIppScoreRelations = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.ipp_score_relations.fetchIppScoreRelations().then(function() {

				factory.dbCleanup.ipp_score_relations.removeIppScoreRelations().then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpMrMeta = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.mr_meta.fetchMrMeta().then(function() {

				factory.dbCleanup.mr_meta.removeMrMeta().then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpCoreDownloadMeta = function() 
		{
			var defer = $q.defer();
			var run_defer = $q.defer();

			var stages = ['get_fetch_records','get_fetch_items','get_fetch_item_data','remove_fetch_item_data','remove_fetch_items','remove_fetch_records'];

			runNextStage(run_defer, 0).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function runNextStage(defer, active_index) {

				if( active_index > stages.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				if( stages[active_index] == 'get_fetch_records' ) {

					factory.dbFetch.fetch_records.coreFetchRecords().then(function() {

						active_index++;

						runNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				if( stages[active_index] == 'get_fetch_items' ) {

					factory.dbFetch.fetch_items.getFetchItems().then(function() {

						active_index++;

						runNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				if( stages[active_index] == 'get_fetch_item_data' ) {

					factory.dbFetch.fetch_item_data.getFetchItemData().then(function() {

						active_index++;

						runNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				if( stages[active_index] == 'remove_fetch_item_data' ) {

					factory.dbCleanup.fetch_item_data.removeFetchItemData().then(function() {

						active_index++;

						runNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				if( stages[active_index] == 'remove_fetch_items' ) {

					factory.dbCleanup.fetch_items.removeFetchItems().then(function() {

						active_index++;

						runNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				if( stages[active_index] == 'remove_fetch_records' ) {

					factory.dbCleanup.fetch_records.removeFetchRecords().then(function() {

						active_index++;

						runNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

				}

				return defer.promise;
			}

			return defer.promise;
		}

		factory.cleanUpCoreManagedRiskData = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.managed_risks.fetchManagedRisks().then(function() {

				factory.dbFetch.projects.fetchManagedRiskProjects().then(function() {

					factory.dbFetch.assets.fetchSnapshotAssets().then(function() {

						factory.cleanUpProjectsContents().then(function() {

							factory.cleanUpManagedRiskRecords().then(function() {
								defer.resolve();
							}, function(error) {
								console.log("CLEAN UP MANAGED RISK RECORDS");
								defer.reject(error);
							});

						}, function(error) {
							console.log("CLEAN UP PROJECT CONTENTS");
							defer.reject(error);
						});

					}, function(error) {
						console.log("ERROR FETCHING SNAPSHOT ASSETS");
						defer.reject(error);
					});

				}, function(error) {
					console.log("ERROR FETCHING MANAGED RISKS PROJECTS");
					defer.reject(error);
				});

			}, function(error) {
				console.log("ERROR FETCHING MANAGED RISKS");
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpManagedRiskRecords = function() 
		{
			var defer = $q.defer();

			factory.dbCleanup.managed_risks.removeManagedRisks().then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.cleanUpBasicObsProjects = function(filters) 
		{
			var defer = $q.defer();

			factory.dbFetch.projects.fetchBasicObsProjects(filters).then(function() {

				factory.dbFetch.assets.fetchSnapshotAssets().then(function() {

					factory.cleanUpProjectsContents().then(function() {

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
		}

		factory.cleanUpRegisterRecordAssets = function() 
		{
			var defer = $q.defer();

			factory.dbFetch.register_assets.fetchRegisterRecordAssets().then(function(record_assets) {

				if( !record_assets || !record_assets.length ) {
					defer.resolve();
					return defer.promise;
				}

				factory.dbCleanup.register_assets.removeRegisterRecordAssets(record_assets).then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.removeDocBatch = function(docs, db_name) 
		{	
			var defer = $q.defer();
			var delete_defer = $q.defer();

			var full_db_name = "_pouch_" + db_name;

			// OPEN DATABASE
			var DbOpenRequest = window.indexedDB.open(full_db_name, 5);
			var db = null;

			DbOpenRequest.onerror = (event) => {
				console.log("ERROR OPENING DB: " + dn_name);
				defer.reject(error);
			};

			DbOpenRequest.onsuccess = (event) => {
				
				console.log("SUCCESS OPENED DB: " + full_db_name);

				// STORE RESULT OF OPENED DATABASE
				db = DbOpenRequest.result;

				var stores = [
					factory.db_stores.doc_store,
					factory.db_stores.by_seq_store, 
					factory.db_stores.attach_store,
					factory.db_stores.attach_seq_store
				]

				removeNextDoc(delete_defer, 0).then(function() {

					console.log("FINISHED REMOVING DOCS FROM: " + db_name);
					defer.resolve();

				}, function(error) {
					console.log("ERROR REMOVING DOCS FROM: " + db_name);
					defer.reject(error);
				});

				function removeNextDoc(defer, i) {

					if( i > docs.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					// REMOVE DOC FROM STORES
					factory.removeDoc(docs[i]._id, docs[i]._rev, db, full_db_name, stores).then(function() {

						i++;

						removeNextDoc(defer, i);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

			};

			return defer.promise;
		}

		factory.removeDoc = function(doc_id, doc_rev, db, db_name, stores) 
		{
			var defer = $q.defer();

			// console.log(stores);

			var transaction = db.transaction(stores, "readwrite");

			// TRANSACTION REQUESTS FINISHED
			transaction.oncomplete = (event) => {
		   		console.log("TRANSACTION COMPLETE: " + db_name);

		   		defer.resolve();
			};

			// TRANSACTION REQUESTS ERRORED
			transaction.onerror = (event) => {
				console.log("ERROR TRANSACTION: " + db_name);

				defer.reject(error);
			};

			// CREATE OBJECT STORES ON TRANSACTION
			var docStore = transaction.objectStore(factory.db_stores.doc_store);
			var seqStore = transaction.objectStore(factory.db_stores.by_seq_store);
			var attStore = transaction.objectStore(factory.db_stores.attach_store);
  			var attAndSeqStore = transaction.objectStore(factory.db_stores.attach_seq_store);

			var possiblyOrphanedDigests = [];

			// SET UP DELETE ORPHANED ATTACHS FNCT FOR LATER USE
			function deleteOrphanedAttachments() {
			    if (!possiblyOrphanedDigests.length) {
			    	// NO ORPHANED ATTACHMENTS TO DELETE
			    	console.log("NO ORPHANED ATTACHMENTS TO DELETE");
			    } else {

			    	possiblyOrphanedDigests.forEach(function (digest) {

			    	// COUNT ATT SEQ STORES FOR CURRENT ATTACHMENT
			    	var countReq = attAndSeqStore.index('digestSeq').count(
			        	IDBKeyRange.bound(digest + '::', digest + '::\uffff', false, false));
			      	
				      	countReq.onsuccess = function (e) {
				        	var count = e.target.result;

				        	// IF COUNTED NO ATT SEQ STORES FOR CURRENT ATTACHMENT
				        	if (!count) {
				          		// DELETE ORPHANED ATTACHMENT
				          		attStore["delete"](digest).onsuccess = (event) => {
				          			console.log("ATTACHMENT DELETED");
				          			factory.utils.att_store_deleted++;
				          		}
			        		}
				      	};
				    });

			    }

			}

			// REQUEST DELETE DOC FROM DOC-STORE
			var docStoreRequest = docStore.delete(doc_id);

			// DOC DELETE REQUEST SUCCESS
			docStoreRequest.onsuccess = (event) => {
			    
			    console.log("DOC DELETED FROM " + db_name + ": " + doc_id);
			    factory.utils.doc_stores_deleted++;

			    var index = seqStore.index('_doc_id_rev');
			    var key = doc_id + "::" + doc_rev;

			    index.getKey(key).onsuccess = function (e) {
			    	
			    	var seq = e.target.result;

			    	if (typeof seq !== 'number') {
			        	console.log("CAN'T FIND SEQ STORE TO DELETE");
			    	} else {

			    		seqStore["delete"](seq).onsuccess = (event) => {
				    		console.log("SEQUENCE STORE VALUE DELETED FROM DB: " + db_name);
				    		factory.utils.by_seq_deleted++;
				    	}

				    	var cursor = attAndSeqStore.index('seq')
				    	.openCursor(IDBKeyRange.only(seq));

				    	cursor.onsuccess = function (event) {
				    		var cursor = event.target.result;
				    		if (cursor) {
				        		var digest = cursor.value.digestSeq.split('::')[0];
				        		possiblyOrphanedDigests.push(digest);
				        		attAndSeqStore["delete"](cursor.primaryKey).onsuccess = (event) => {
				        			factory.utils.att_seq_store_deleted++;
				        		}
				        		cursor["continue"]();
				        	} else {
				        		// FINISHED ITERATION OF RECORDS IN STORE
				        		// ATTEMPT DELETE ORPHANED ATTACHMENTS
				          		deleteOrphanedAttachments();
				        	}
				      	};

			    	}
			    	
			    };
			};

			return defer.promise;
		}

		// INIT ALL DATABASES
		riskmachDatabasesFactory.databases.initAll();

		return factory;
	}

}())