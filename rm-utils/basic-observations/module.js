(function() {

	var app = angular.module('riskmachBasicObservations', ['riskmachUtils','riskmachDatabases','riskmachModels']);
	app.factory('basicObservationsFactory', basicObservationsFactory);

	function basicObservationsFactory($q, riskmachDatabasesFactory, authFactory, modelsFactory, rmUtilsFactory) 
	{
		var factory = {};

		factory.dbUtils = {
			fetchBasicObservationRecord: function(doc_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.assessments.get(doc_id).then(function(doc) {

					console.log("GOT BASIC OBSERVATION");
					console.log(doc);

					defer.resolve(doc);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			fetchBasicObservationsV1: function(relations) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.assessments;
				var options = {
					limit: 100, 
					include_docs: true
				}

				var basic_observations = [];

				fetchNextPage(fetch_defer).then(function() {

					console.log("FETCHED BASIC OBSERVATIONS");
					console.log(basic_observations);

					defer.resolve(basic_observations);
				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_basic_observations = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								// IF NOT BASIC OBSERVATION
								if( !result.rows[i].doc.hasOwnProperty('is_basic_ob') || result.rows[i].doc.is_basic_ob != 'Yes' ) {
									errors++;
								}

								if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								if( result.rows[i].doc.company_id != authFactory.cloudCompanyId() ) {
									errors++;
								}

								// IF BASIC OB DOESN'T BELONG TO PROVIDED ACTIVITY ID
								if( relations.hasOwnProperty('project_id') && relations.project_id && result.rows[i].activity_id != relations.project_id ) {
									errors++;
								}

								// IF BASIC OB DOESN'T BELONG TO PROVIDED ASSET ID
								if( relations.hasOwnProperty('asset_id') && relations.asset_id && result.rows[i].doc.asset_id != relations.asset_id ) {
									errors++;
								}

								if( errors == 0 ) {
									filtered_basic_observations.push(result.rows[i].doc);
								}

								i++;
							}

							basic_observations.push(...filtered_basic_observations);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_basic_observations = null;

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
			},
			fetchBasicObservations: function(relations) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.assessments;
				var basic_observations = [];

				var selector = {
					user_id: authFactory.cloudUserId(),
					activity_id: null, 
					asset_id: null
				}

				if( relations.hasOwnProperty('project_id') && relations.project_id ) {
					selector.activity_id = relations.project_id;
				}

				if( relations.hasOwnProperty('asset_id') && relations.asset_id ) {
					selector.asset_id = relations.asset_id;
				}

				db.find({
					selector: selector
				}).then(function(result) {

					var i = 0;
					var len = result.docs.length;
					while(i < len) {
						var errors = 0;

						// IF NOT BASIC OBSERVATION
						if( !result.docs[i].hasOwnProperty('is_basic_ob') || result.docs[i].is_basic_ob != 'Yes' ) {
							errors++;
						}

						if( result.docs[i].company_id != authFactory.cloudCompanyId() ) {
							errors++;
						}

						if( !errors ) {
							basic_observations.push(result.docs[i]);
						}

						i++;
					}

					defer.resolve(basic_observations);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			saveBasicObservation: function(record) {
				var defer = $q.defer();

				// MARK RECORD MODIFIED AND UN-SYNCED
				rmUtilsFactory.sync_decoration.assessments.riskAssessmentModified(record).then(function(modified_record) {

					record = modified_record;

					if( !record.hasOwnProperty('_id') || !record._id ) {
					
						// SAVE NEW
						riskmachDatabasesFactory.databases.collection.assessments.post(record).then(function(result) {

							record._id = result.id;
							record._rev = result.rev;

							console.log("SAVED NEW BASIC OBSERVATION");
							console.log(record);

							defer.resolve(record);

						}).catch(function(error) {
							console.log("ERROR SAVING NEW BASIC OBSERVATION");
							defer.reject(error);
						});

					} else {

						// UPDATE EXISTING
						riskmachDatabasesFactory.databases.collection.assessments.put(record).then(function(result) {

							record._id = result.id;
							record._rev = result.rev;

							console.log("UPDATED BASIC OBSERVATION");
							console.log(record);

							defer.resolve(record);

						}).catch(function(error) {
							console.log("ERROR UPDATING BASIC OBSERVATION");
							defer.reject(error);
						});

					}

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}, 
			fetchBasicObservationsProject: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.projects;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var projects = [];

				fetchNextPage(fetch_defer).then(function() {

					console.log("FETCHED BASIC OBSERVATIONS PROJECT");
					console.log(projects);

					if( projects.length > 0 ) {
						defer.resolve(projects[0]);
					} else {
						defer.resolve(null);
					}

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_projects = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								// IF NOT BASIC OBS PROJECT
								if( result.rows[i].doc.pp_id != 36 ) {
									errors++;
								}

								if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								if( result.rows[i].doc.client_id != authFactory.getClientId() ) {
									errors++;
								}

								// IF THE BASIC OBS PROJECT HAS ALREADY BEEN SYNCED
								if( result.rows[i].doc.hasOwnProperty('date_content_imported') && result.rows[i].doc.date_content_imported ) {
									errors++;
								}
 
								if( errors == 0 ) {
									filtered_projects.push(result.rows[i].doc);
								}

								i++;
							}

							projects.push(...filtered_projects);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_projects = null;

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
			},
			getCoreBasicObsSnapshot: function(project_id, core_asset_id) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.assets;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var assets = [];

				fetchNextPage(fetch_defer).then(function() {

					console.log("FETCHED BASIC OBSERVATIONS SNAPSHOT");
					console.log(assets);

					if( assets.length > 0 ) {
						defer.resolve(assets[0]);
					} else {
						defer.resolve(null);
					}

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_assets = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								// IF ASSET DOESN'T BELONG TO PROVIDED PROJECT ID
								if( project_id && result.rows[i].doc.project_id != project_id ) {
									errors++;
								}

								// IF ASSET IS NOT SNAPSHOT OF PROVIDED CORE ASSET ID
								if( core_asset_id && result.rows[i].doc.register_asset_id != core_asset_id ) {
									errors++;
								}

								if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								if( result.rows[i].doc.company_id != authFactory.cloudCompanyId() ) {
									errors++;
								}

								if( errors == 0 ) {
									filtered_assets.push(result.rows[i].doc);
								}

								i++;
							}

							assets.push(...filtered_assets);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_assets = null;

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
		};

		factory.getCreateBasicObsProject = function() 
		{
			var defer = $q.defer();

			factory.dbUtils.fetchBasicObservationsProject().then(function(project_doc) {

				if( project_doc ) {
					defer.resolve(project_doc);
				} else {
					factory.createBasicObsProject().then(function(saved_project_doc) {
						defer.resolve(saved_project_doc);
					}, function(error) {
						defer.reject(error);
					});
				}

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.createBasicObsProject = function() 
		{
			var defer = $q.defer();

			var project_record = modelsFactory.models.newProject();
			project_record.client_id = authFactory.getClientId();
			project_record.pp_id = 36; // BASIC OBSERVATIONS

			project_record.title = 'Basic Observations';
			project_record.description = 'Collected Basic Observations';

			riskmachDatabasesFactory.databases.collection.projects.post(project_record).then(function(result) {
				project_record._id = result.id;
				project_record._rev = result.rev;

				console.log("CREATED NEW BASIC OBSERVATIONS PROJECT");
				console.log(project_record);

				defer.resolve(project_record);
			}).catch(function(error) {
				defer.reject(error);
			})

			return defer.promise;
		}

		factory.getCreateCoreBasicObsSnapshot = function(project_id, core_asset_id) 
		{
			var defer = $q.defer();

			factory.dbUtils.getCoreBasicObsSnapshot(project_id, core_asset_id).then(function(snapshot) {

				if( snapshot ) {
					defer.resolve(snapshot);
					return defer.promise;
				}

				factory.createCoreBasicObsSnapshot(project_id, core_asset_id).then(function(saved_snapshot) {
					defer.resolve(saved_snapshot);
				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.createCoreBasicObsSnapshot = function(project_id, core_asset_id) 
		{
			var defer = $q.defer();
			
			riskmachDatabasesFactory.databases.collection.register_assets.get(core_asset_id).then(function(core_doc) {

				var snapshot_record = modelsFactory.models.newSnapshotAsset(project_id);

				snapshot_record.register_asset_id = core_asset_id;
				snapshot_record.asset_ref = core_doc.asset_ref || 'Asset name not defined';

				if( core_doc.hasOwnProperty('rm_id') && core_doc.rm_id ) {
					snapshot_record.rm_register_asset_id = parseInt(core_doc.rm_id);
				}

				riskmachDatabasesFactory.databases.collection.assets.post(snapshot_record).then(function(result) {

					snapshot_record._id = result.id;
					snapshot_record._rev = result.rev;

					defer.resolve(snapshot_record);

				}).catch(function(error) {
					defer.reject(error);
				});

			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.getCoreBasicObsProjectAndSnapshot = function(core_asset_id) 
		{
			var defer = $q.defer();

			var data = {
				project: null, 
				asset: null
			}

			factory.dbUtils.fetchBasicObservationsProject().then(function(project_doc) {

				if( !project_doc ) {
					defer.resolve(data);
					return defer.promise;
				}

				data.project = project_doc;

				factory.dbUtils.getCoreBasicObsSnapshot(project_doc._id, core_asset_id).then(function(snapshot) {

					if( !snapshot ) {
						defer.resolve(data);
						return defer.promise;
					}

					data.asset = snapshot;

					defer.resolve(data);

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		return factory;
	}

}())