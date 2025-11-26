(function() {

	var app = angular.module('riskmachCoreSync', ['angular-jwt','riskmachUtils','riskmachDatabases','riskmachModels']);
	app.factory('coreSyncFactory', coreSyncFactory);

	function coreSyncFactory($q, $http, $filter, $timeout, riskmachDatabasesFactory, authFactory, modelsFactory) 
	{
		var factory = {};

		factory.debug_mode = {
			on: false, 
			syncFetchedRecordsJson: function(data, record_type) {
				var defer = $q.defer();
				var sync_defer = $q.defer();

				// JSON STRINGIFY DATA?
				// ALSO SEND LOGIN DETAILS (USER NAME, EMAIL)?

				var debug_object = {
					user_profile: {
						email: authFactory.active_profile.EmailAddress,
						cloud_user_id: authFactory.active_profile.CloudUserID,
						app_user_id: authFactory.active_profile.UserID, 
						company_id: authFactory.active_profile.CompanyID, 
						company_name: authFactory.active_profile.CompanyName,
						active_client_id: authFactory.getClientId()
					}, 
					data: data
				}

				var num_attempts = 0;
				var last_error = null;

				sync(sync_defer).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function sync(defer) {

					// IF THIS IS THE THIRD ATTEMPT, REJECT ERROR
					if( num_attempts == 3 ) {
						defer.reject(last_error);
						return defer.promise;
					}

					$http.post("https://system.riskmach.co.uk/laravel/public/webapp/v1/SendDebug",{ 
		            	params: {
		            		data: debug_object,
		            		type: record_type
		            	}
		            })
					.success(function(data, status, headers, config) {

						console.log( JSON.stringify(data, null, 2) );

						if( data.error == true )
						{
							//TRY AGAIN
							num_attempts++;
							last_error = data.error_messages[0];
		            		sync(defer);
						}
						else
						{
							defer.resolve();
						}
		            })
		            .error(function(data, status, headers, config) {
		            	console.log( JSON.stringify(data, null, 2) );

		            	//TRY AGAIN
		            	num_attempts++;
		            	last_error = "Error connecting to sync debug data endpoint for " + record_type;
		            	sync(defer);
					});

					return defer.promise;
				}

				return defer.promise;
			}
		}

		factory.utils = {
			site: {
				fetch_data_stages: [
					'buildings',
					'areas',
					'assets',
					'record_assets'
				]
			},
			asset: {
				fetch_data_stages: [
					'tasks',
					'ipp_scores',
					'qr_codes', 
					'media'
					// 'child_assets'
				]
			},
			filterUnsyncedRecords: function(records) {
				var unsynced_records = [];

				if( records.length == 0 ) {
					return unsynced_records;
				}

				var i = 0;
				var len = records.length;

				while(i < len) {
					var errors = 0;

					// if( !records[i].hasOwnProperty('date_content_imported') ) {
					// 	errors++;
					// }

					if( !records[i].hasOwnProperty('date_content_imported') || (records[i].date_content_imported && records[i].date_content_imported != '') ) {
						errors++;
					}

					if( errors == 0 ) {
						unsynced_records.push(records[i]);
					}

					i++;
				}

				return unsynced_records;
			},
			filterRecordAssets: function(assets, record_assets) {
				var result = [];

				if( assets.length == 0 ) {
					return result;
				};

				angular.forEach(assets, function(asset_record, index) {
					// IF NOT A RECORD ASSET, AND FILTERING FOR NONE RECORD ASSETS
					if( asset_record.record_type == '' ) {
						if( !record_assets ) {
							result.push(asset_record);
						};
					};

					// IF A RECORD ASSET, AND FILTERING FOR RECORD ASSETS
					if( asset_record.record_type != '' ) {
						if( record_assets ) {
							result.push(asset_record);
						};
					};
				});

				return result;
			},
			formatRmRecordToModel: function(model_type, rm_record) {

				var model = modelsFactory.models[model_type];

				Object.keys(model).forEach(function(key) {
					
					// IF RM RECORD DOESN'T HAVE KEY
					if( !rm_record.hasOwnProperty(key) ) {

						// CREATE KEY WITH DEFAULT MODEL VALUE
						rm_record[key] = model[key];
					};

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
								};

								// CAN FORMAT FOR DATES etc.

								rm_record[key] = value;

							};

						};

					};

				});

				return rm_record;

			}
		}

		factory.sync_collection = {
			stats: {
				total_records: 0,
				total_synced: 0,
				total_files_synced: 0,
				total_files: 0,
				total_file_size: 0,
				total_staged: 0,
				total_imported: 0,
				resetStats: function() {
					factory.sync_collection.stats.total_records = 0;
					factory.sync_collection.stats.total_synced = 0;
					factory.sync_collection.stats.total_files_synced = 0;
					factory.sync_collection.stats.total_files = 0;
					factory.sync_collection.stats.total_file_size = 0;
					factory.sync_collection.stats.total_staged = 0;
					factory.sync_collection.stats.total_imported = 0;
				}
			},
			incrementStat: function(stat, value){
				$timeout(function(){
					console.log("Increment Stat ["+ stat +"] by ["+ value +"]");
					factory.sync_collection.stats[stat] = factory.sync_collection.stats[stat] + value;
				}, 0);
			},
			staging: {
				current_fetch_stage: null,
				stage_name: null,
				active_sync: {
					record: null,
					index: null
				},
				project_record: null,
				staged_records: {},
				staged_files: {},
				staged_ids: {},
				import_staged: {},
				clashing_keys: [],
				clearActiveSyncRecord: function(){

					if( !factory.sync_collection.staging.active_sync.record )
					{
						factory.sync_collection.staging.active_sync.record = null;
						factory.sync_collection.staging.active_sync.index = null;
						return;
					}

					//IF CURRENT SYNC ACTIVE RESET #ATTEMPTS FIRST
					factory.sync_collection.staging.active_sync.record.attempt_meta.num_attempts = 0;
					factory.sync_collection.staging.active_sync.record.attempt_meta.last_error = null;

					factory.sync_collection.staging.active_sync.record = null;
					factory.sync_collection.staging.active_sync.index = null;
				},
				addStagedRecord: function(record, record_type){

					if( record.hasOwnProperty('date_content_imported') && record.date_content_imported != null ) {
						factory.sync_collection.incrementStat('total_imported', 1);
					};

					if( !record.hasOwnProperty('synced') || !record.synced )
					{
						record.synced = false;
					}

					if( !record.hasOwnProperty('imported') || !record.imported )
					{
						record.imported = false;
					}

					if( factory.sync_collection.staging.staged_records.hasOwnProperty(record._id) )
					{
						console.log("FOUND CLASHING KEY (Record Type: "+ record_type +") " + record._id);

						if( factory.sync_collection.staging.clashing_keys.indexOf(record._id) == -1 )
						{
							factory.sync_collection.staging.clashing_keys.push(record._id);
						}
					}

					//IF NOT A FILE ADD TO STAGED RECORD
					if( record_type != 'media' )
					{
						factory.sync_collection.incrementStat('total_records', 1);

						factory.sync_collection.staging.staged_records[record._id] = {
							record_type: record_type,
							record: record,
							synced: false,
							attempt_meta: factory.sync_requests.newAttemptMeta(), 
							stage_num: factory.sync_collection.stats.total_records
						};

						if( record.synced )
						{
							factory.sync_collection.incrementStat('total_synced', 1);
						}

						// if( record_type == 'checklist_question_record' )
						// {
						// 	console.log("STAGED checklist_question_record");
						// 	console.log(factory.sync_collection.staging.staged_records[record._id]);
						// }
					}
					
					if( record_type == 'media' )
					{
						// IF NO FILE, ADD AS STAGED RECORD INSTEAD
						if( record.file_downloaded != 'Yes' ) {
							factory.sync_collection.incrementStat('total_records', 1);

							factory.sync_collection.staging.staged_records[record._id] = {
								record_type: record_type,
								record: record,
								synced: false,
								attempt_meta: factory.sync_requests.newAttemptMeta(), 
								stage_num: factory.sync_collection.stats.total_records
							};

							if( record.hasOwnProperty('synced') && record.synced )
							{
								factory.sync_collection.incrementStat('total_synced', 1);
							}

							return;
						}

						// IF FILE DOWNLOADED, BUT FILE NOT PRESENT
						if( record.hasOwnProperty('file_downloaded') && record.file_downloaded && (!record.hasOwnProperty('_attachments') || !record._attachments) ) {
							console.log("CORRUPT FILE - DON'T SYNC");
							return;
						}

						factory.sync_collection.incrementStat('total_files', 1);

						if( record.hasOwnProperty('synced') && record.synced )
						{
							factory.sync_collection.incrementStat('total_files_synced', 1);
						}

						console.log("RECORD BEFORE ERROR");
						console.log(record);

						Object.keys(record._attachments).forEach(function(attach_index){

							console.log("ATTACH RECORD");
							console.log(attach_index);

							factory.sync_collection.incrementStat('total_file_size', record._attachments[attach_index].length);
						});

						factory.sync_collection.staging.staged_files[record._id] = {
							record_type: record_type,
							record: record,
							synced: false,
							attempt_meta: factory.sync_requests.newAttemptMeta()
						};
					}

					//IF RECORD BEING STAGED IS PROJECT - STORE THIS IN SPECIAL PLACE
					if( record_type == 'project' )
					{
						factory.sync_collection.staging.project_record = factory.sync_collection.staging.staged_records[record._id];
					}

					// STORE ID FOR LOOKUPS
					if( factory.sync_collection.staging.staged_ids.hasOwnProperty(record_type) ) {
						factory.sync_collection.staging.staged_ids[record_type].push(record._id);
					} else {
						factory.sync_collection.staging.staged_ids[record_type] = [];
						factory.sync_collection.staging.staged_ids[record_type].push(record._id);
					}
				},
				addStagedRecordBulk: function(records, record_type, debug_record_type){
					var defer = $q.defer();

					function doAddStagedRecordBulk() {
						var i = 0;
						var len = records.length;

						if( len > 0 ) {
							while(i < len) {
								factory.sync_collection.staging.addStagedRecord(records[i], record_type);
								i++;
							}
						}
					}

					// IF DEBUG MODE IS ON
					if( factory.debug_mode.on ) {

						// POST FETCHED RECORDS JSON TO ENDPOINT
						factory.debug_mode.syncFetchedRecordsJson(records, debug_record_type).then(function() {

							doAddStagedRecordBulk();
							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

					} else {
						doAddStagedRecordBulk();
						defer.resolve();
					}

					// angular.forEach(records, function(record, record_index){
					// 	factory.sync_collection.staging.addStagedRecord(record, record_type);
					// });

					return defer.promise;
				},
				stageRecordSynced: function(record_id){
					factory.sync_collection.staging.staged_records[record_id].synced = true;
					factory.sync_collection.incrementStat('total_synced', 1);
				},
				doStartSync: function(){
					var defer = $q.defer();
					var sync_defer = $q.defer();

					//LOOP THROUGH SYNCING STAGED RECORDS
					factory.sync_collection.staging.syncNextStagedRecord(sync_defer).then(function(){
						defer.resolve();
					}, function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				syncNextStagedRecord: function(defer){
					var max_index = Object.keys(factory.sync_collection.staging.staged_records).length - 1;
					var next_index = null;
					var next_record = null;

					//IF NOT STARTED START AT THE BEGINNING ELSE GET THE NEXT ONE
					if( factory.sync_collection.staging.active_sync.index == null )
					{
						next_index = 0;
					}
					else
					{
						next_index = factory.sync_collection.staging.active_sync.index + 1;
					}

					if( next_index > max_index )
					{
						// alert("Synced the last record! [index: "+ next_index +"]");
						defer.resolve();
						return defer.promise;
					}

					//FIND THE NEXT STAGING RECORD BASED ON INDEX
					var index_counter = -1;
					Object.keys(factory.sync_collection.staging.staged_records).forEach(function(current_key){
						index_counter++;

						if( index_counter == next_index )
						{
							next_record = factory.sync_collection.staging.staged_records[current_key];
						}

					});

					if( !next_record )
					{
						// alert("Synced the last record!");
						defer.reject("Unable to find the next sync record");
						return defer.promise;
					}

					console.log("SYNC RECORD [MAX INDEX: "+ max_index +"] ["+ next_record.record_type +"]");
					console.log(next_record);

					//UPDATE THE ACTIVE SYNC
					factory.sync_collection.staging.active_sync.index = next_index;
					factory.sync_collection.staging.active_sync.record = next_record;

					console.log("SYNCING NEXT RECORD");
					console.log( JSON.stringify(factory.sync_collection.staging.active_sync, null, 2) );

					//IF ALREADY SYNCED SKIP TO NEXT RECORD
					if( factory.sync_collection.staging.active_sync.record.record.synced == true )
					{
						//ATTEMPT THE NEXT RECORD
						factory.sync_collection.staging.syncNextStagedRecord(defer);
					}
					else
					{
						//PERFORM THE SYNC
						factory.sync_requests.syncRecord(factory.sync_collection.staging.active_sync.record).then(function(sync_result){

							//ATTEMPT THE NEXT RECORD
							factory.sync_collection.staging.syncNextStagedRecord(defer);

						}, function(error){
							defer.reject(error);
						});
					}

					return defer.promise;
				},
				doStartImport: function(){
					var defer = $q.defer();
					var sync_defer = $q.defer();

					//CLEAR THE ACTIVE STAGE
					factory.sync_collection.staging.active_sync.record = null;
					factory.sync_collection.staging.active_sync.index = null;

					//CREATE THE IMPORT STAGE RECORDS
					factory.sync_collection.staging.createImportStage();

					//RESET ALL ATTEMPT META ON STAGED RECORD
					factory.sync_collection.staging.resetAllAttemptMeta();

					//LOOP THROUGH SYNCING STAGED RECORDS
					factory.sync_collection.staging.importNextStagedRecord(sync_defer).then(function(){
						defer.resolve();
					}, function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				createImportStage: function(){
					var staged_array = [];

					factory.sync_collection.staging.import_staged = {};

					//ADD SYNC RECORDS
					Object.keys(factory.sync_collection.staging.staged_records).forEach(function(import_key){
						factory.sync_collection.staging.staged_records[import_key].import_key = import_key;
						// factory.sync_collection.staging.import_staged[index] = factory.sync_collection.staging.staged_records[index];
						staged_array.push(factory.sync_collection.staging.staged_records[import_key]);
					});

					//ORDER BY ORDER IT WAS FETCHED
					staged_array = $filter('orderBy')(staged_array, 'stage_num');

					//ADD SYNC FILES TO END OF ARRAY SO THEY ARE IMPORTED LAST
					Object.keys(factory.sync_collection.staging.staged_files).forEach(function(import_key){
						factory.sync_collection.staging.staged_files[import_key].import_key = import_key;
						staged_array.push(factory.sync_collection.staging.staged_files[import_key]);
					});

					console.log("STAGED ARRAY");
					console.log(staged_array);

					//REBULT THE PROPERTY
					angular.forEach(staged_array, function(record, index){
						factory.sync_collection.staging.import_staged[record.import_key] = record;
					});

				},
				importNextStagedRecord: function(defer){
					var max_index = Object.keys(factory.sync_collection.staging.import_staged).length - 1;
					var next_index = null;
					var next_record = null;

					//IF NOT STARTED START AT THE BEGINNING ELSE GET THE NEXT ONE
					if( factory.sync_collection.staging.active_sync.index == null )
					{
						next_index = 0;
					}
					else
					{
						next_index = factory.sync_collection.staging.active_sync.index + 1;
					}

					if( next_index > max_index )
					{
						// alert("Synced the last record! [index: "+ next_index +"]");
						defer.resolve();
						return defer.promise;
					}

					//FIND THE NEXT STAGING RECORD BASED ON INDEX
					var index_counter = -1;
					Object.keys(factory.sync_collection.staging.import_staged).forEach(function(current_key){
						index_counter++;

						if( index_counter == next_index )
						{
							next_record = factory.sync_collection.staging.import_staged[current_key];
						}

					});

					if( !next_record )
					{
						// alert("Synced the last record!");
						defer.reject("Unable to find the next sync record");
						return defer.promise;
					}

					console.log("IMPORT RECORD [MAX INDEX: "+ max_index +"] ["+ next_record.record_type +"]");
					console.log(next_record);

					//UPDATE THE ACTIVE SYNC
					factory.sync_collection.staging.active_sync.index = next_index;
					factory.sync_collection.staging.active_sync.record = next_record;

					console.log("IMPORTING NEXT RECORD");
					console.log(factory.sync_collection.staging.active_sync);

					//IF ALREADY SYNCED SKIP TO NEXT RECORD
					if( factory.sync_collection.staging.active_sync.record.record.hasOwnProperty('imported') && factory.sync_collection.staging.active_sync.record.record.imported )
					{
						//ATTEMPT THE NEXT RECORD
						factory.sync_collection.staging.importNextStagedRecord(defer);
					}
					else
					{
						//PERFORM THE IMPORT
						factory.import_requests.importRecord(factory.sync_collection.staging.active_sync.record).then(function(sync_result){

							//ATTEMPT THE NEXT RECORD
							factory.sync_collection.staging.importNextStagedRecord(defer);

						}, function(error){
							defer.reject(error);
						});
					}

					return defer.promise;
				},
				resetAllAttemptMeta: function(){
					Object.keys(factory.sync_collection.staging.import_staged).forEach(function(index){
						factory.sync_collection.staging.import_staged[index].attempt_meta.num_attempts = 0;
						factory.sync_collection.staging.import_staged[index].attempt_meta.last_error = null;
					});
				}
			},
			data: {
				project: null,
				assets: null
			}
		};

		factory.dbFetch = {
			coreProjectRecord: function() {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.projects.find({
					selector: {
						user_id: authFactory.cloudUserId(),
						client_id: authFactory.getActiveCompanyId(),
						core_project: 'Yes'
					}, 
					limit: 1
				}).then(function(results) {

					console.log( JSON.stringify(results.docs, null, 2) );

					if( results.docs.length == 0 ) {
						console.log("THE CLIENT'S CORE PROJECT COULD NOT BE FOUND");
						// MAY NEED TO CREATE A NEW CORE PROJECT FOR CLIENT
						defer.resolve(null);
					} else {
						console.log("FOUND CLIENT'S CORE PROJECT");
						defer.resolve(results.docs[0]);
					};

				}).catch(function(error) {
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
			}
		}

		factory.dbFetchCollection = {
			unsyncedSites: function(filters) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.sites;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var sites = [];

				fetchNextPage(fetch_defer).then(function() {

					sites = factory.utils.filterUnsyncedRecords(sites);
 					factory.sync_collection.staging.addStagedRecordBulk(sites, 'site', 'Sites').then(function() {
 						defer.resolve();
 					}, function(error) {
 						defer.reject(error);
 					});

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_sites = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.table != 'sites' ) {
									errors++;
								}

								if( result.rows[i].doc.company_id != authFactory.getActiveCompanyId() ) {
									errors++;
								}

								if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								if( filters.hasOwnProperty('site_id') && filters.site_id && result.rows[i].doc._id != filters.site_id ) {
									errors++;
								}
 
								if( errors == 0 ) {
									filtered_sites.push(result.rows[i].doc);
								}

								i++;
							}

							sites.push(...filtered_sites);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_sites = null;

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
			unsyncedSitesV1: function(filters) {
				var defer = $q.defer();

				if( filters.hasOwnProperty('site_id') && filters.site_id != null ) {
					riskmachDatabasesFactory.databases.collection.sites.get(filters.site_id).then(function(site_record) {
						if( !site_record ) {
							defer.reject("Couldn't find the site to sync");
						} else {
							// STORE IN ARRAY FOR REST OF ROUTINE
							var site_array = [site_record];
							defer.resolve(site_array);
						};
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				};

				riskmachDatabasesFactory.databases.collection.sites.find({
					selector: {
						table: 'sites',
						company_id: authFactory.getActiveCompanyId(),
						user_id: authFactory.cloudUserId()
					}
				}).then(function(results){

					console.log("GOT SITES");
					console.log( JSON.stringify(results.docs, null, 2) );

					defer.resolve(results.docs);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			unsyncedBuildings: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.buildings;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var buildings = [];

				fetchNextPage(fetch_defer).then(function() {

					buildings = factory.utils.filterUnsyncedRecords(buildings);
					console.log("FETCHED BUILDINGS: " + buildings.length);
					factory.sync_collection.staging.addStagedRecordBulk(buildings, 'building', 'Buildings').then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_buildings = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.table != 'buildings' ) {
									errors++;
								}

								if( !factory.sync_collection.staging.staged_ids.hasOwnProperty('site') || factory.sync_collection.staging.staged_ids.site.indexOf(result.rows[i].doc.site_id) === -1 ) {
									errors++;
								}

								if( errors == 0 ) {
									filtered_buildings.push(result.rows[i].doc);
								}

								i++;
							}

							buildings.push(...filtered_buildings);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_buildings = null;

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
			unsyncedBuildingsV1: function(site_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.buildings.find({
					selector: {
						table: 'buildings',
						site_id: site_id
					}
				}).then(function(results){

					console.log("GOT UNSYNCED BUILDINGS");
					console.log( JSON.stringify(results.docs, null, 2) );

					defer.resolve(results.docs);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			unsyncedAreas: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.areas;
				var options = {
					limit: 100, 
					include_docs: true
				}

				var areas = [];

				fetchNextPage(fetch_defer).then(function() {

					areas = factory.utils.filterUnsyncedRecords(areas);
					console.log("FETCHED AREAS: " + areas.length);
					factory.sync_collection.staging.addStagedRecordBulk(areas, 'area', 'Areas').then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_areas = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.table != 'areas' ) {
									errors++;
								}

								if( !factory.sync_collection.staging.staged_ids.hasOwnProperty('site') || factory.sync_collection.staging.staged_ids.site.indexOf(result.rows[i].doc.site_id) === -1 ) {
									errors++;
								}

								if( errors == 0 ) {
									filtered_areas.push(result.rows[i].doc);
								}

								i++;
							}

							areas.push(...filtered_areas);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_areas = null;

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
			unsyncedAreasV1: function(site_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.areas.find({
					selector: {
						table: 'areas',
						site_id: site_id
					}
				}).then(function(results){

					console.log("GOT AREAS");
					console.log( JSON.stringify(results.docs, null, 2) );

					defer.resolve(results.docs);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			}, 
			unsyncedAssets: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.register_assets;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var assets = [];

				fetchNextPage(fetch_defer).then(function() {

					// FILTER UNSYNCED ASSETS
					assets = factory.utils.filterUnsyncedRecords(assets);
					console.log("FETCHED ASSETS PRE ORDERING: " + assets.length);

					var ordered_assets = [];

					function findChildAssets(parent_asset_id, assets) {

						// console.log(JSON.stringify(assets, null, 2));
						// alert("Find child assets");

						var parent_asset_ids = [];

						var i = 0;
						var len = assets.length;

						while(i < len) {

							// ADD PARENT ASSETS FIRST
							if( !parent_asset_id && (!assets[i].parent_asset_id || assets[i].parent_asset_id == '' || assets[i].parent_asset_id == 0 || assets[i].parent_asset_id == '0') ) {
								console.log(assets[i]);
								ordered_assets.push(assets[i]);
								parent_asset_ids.push(assets[i]._id);
							}

							// FIND CHILDREN OF ACTIVE PARENT
							if( parent_asset_id && assets[i].parent_asset_id == parent_asset_id ) {
								ordered_assets.push(assets[i]);
								parent_asset_ids.push(assets[i]._id);
							}

							i++;
						}

						// FOR PARENT IDS, FIND CHILDREN
						var pi = 0;
						var pi_len = parent_asset_ids.length;

						if( pi_len > 0 ) {

							while( pi < pi_len ) {
								// FIND CHILDREN FOR ACTIVE ASSET
								findChildAssets(parent_asset_ids[pi], assets);
								pi++;
							}

						}
					}

					if( assets.length > 0 ) {
						// FIND PARENTS FIRST
						findChildAssets(null, assets);
					}

					// ADD UNSYNCED ASSETS TO STAGING
					factory.sync_collection.staging.addStagedRecordBulk(ordered_assets, 'asset', 'Assets').then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

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

								if( result.rows[i].doc.table != 'register_assets' ) {
									errors++;
								}

								if( !factory.sync_collection.staging.staged_ids.hasOwnProperty('site') || factory.sync_collection.staging.staged_ids.site.indexOf(result.rows[i].doc.site_id) === -1 ) {
									errors++;
								}

								// IF NOT MACHINE
								if( result.rows[i].doc.record_type != '' ) {
									errors++;
								}

								// IF SYSTEM GENERATED
								if( result.rows[i].doc.hasOwnProperty('sys_generated') && result.rows[i].doc.sys_generated == 'Yes' ) {
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
			},
			unsyncedAssetsV1: function(site_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.register_assets.find({
					selector: {
						table: 'register_assets',
						site_id: site_id
					}
				}).then(function(results){

					console.log("GOT UNSYNCED ASSETS");
					console.log( JSON.stringify(results.docs, null, 2) );

					defer.resolve(results.docs);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			}, 
			unsyncedRecordAssets: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.register_assets;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var assets = [];

				fetchNextPage(fetch_defer).then(function() {

					assets = factory.utils.filterUnsyncedRecords(assets);
					factory.sync_collection.staging.addStagedRecordBulk(assets, 'asset', 'Record Assets').then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

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

								if( result.rows[i].doc.table != 'register_assets' ) {
									errors++;
								}

								if( !factory.sync_collection.staging.staged_ids.hasOwnProperty('site') || factory.sync_collection.staging.staged_ids.site.indexOf(result.rows[i].doc.site_id) === -1 ) {
									errors++;
								}

								// IF MACHINE AND NOT RECORD ASSET
								if( result.rows[i].doc.record_type == '' ) {
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
			},
			unsyncedChildAssets: function(parent_asset_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.register_assets.find({
					selector: {
						table: 'register_assets',
						parent_asset_id: parent_asset_id
					}
				}).then(function(results){

					console.log("GOT UNSYNCED CHILD ASSETS");
					console.log( JSON.stringify(results.docs, null, 2) );

					defer.resolve(results.docs);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			}, 
			unsyncedTasks: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.register_tasks;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var tasks = [];

				fetchNextPage(fetch_defer).then(function() {

					tasks = factory.utils.filterUnsyncedRecords(tasks);
					factory.sync_collection.staging.addStagedRecordBulk(tasks, 'task', 'Tasks').then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_tasks = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.table != 'register_tasks' ) {
									errors++;
								}

								if( !factory.sync_collection.staging.staged_ids.hasOwnProperty('asset') || factory.sync_collection.staging.staged_ids.asset.indexOf(result.rows[i].doc.register_asset_id) === -1 ) {
									errors++;
								}

								if( errors == 0 ) {
									filtered_tasks.push(result.rows[i].doc);
								}

								i++;
							}

							tasks.push(...filtered_tasks);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_tasks = null;

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
			unsyncedTasksV1: function(asset_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.register_tasks.find({
					selector: {
						table: 'register_tasks',
						register_asset_id: asset_id
					}
				}).then(function(results){

					console.log("GOT UNSYNCED REGISTER TASKS");
					console.log( JSON.stringify(results.docs, null, 2) );

					defer.resolve(results.docs);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			unsyncedIppScores: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.register_asset_ipp;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var ipp_scores = [];

				fetchNextPage(fetch_defer).then(function() {

					ipp_scores = factory.utils.filterUnsyncedRecords(ipp_scores);
					factory.sync_collection.staging.addStagedRecordBulk(ipp_scores, 'ipp_score', 'IPP Scores').then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_ipp_scores = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.table != 'register_asset_ipp' ) {
									errors++;
								}

								// SYSTEM GENERATED
								if( result.rows[i].doc.hasOwnProperty('sys_generated') && result.rows[i].doc.sys_generated == 'Yes' ) {
									errors++;
								}

								if( !factory.sync_collection.staging.staged_ids.hasOwnProperty('asset') || factory.sync_collection.staging.staged_ids.asset.indexOf(result.rows[i].doc.asset_id) === -1 ) {
									errors++;
								}

								if( errors == 0 ) {
									filtered_ipp_scores.push(result.rows[i].doc);
								}

								i++;
							}

							ipp_scores.push(...filtered_ipp_scores);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_ipp_scores = null;

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
			unsyncedIppScoresV1: function(asset_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.register_asset_ipp.find({
					selector: {
						table: 'register_asset_ipp',
						asset_id: asset_id
					}
				}).then(function(results){

					console.log("GOT UNSYNCED IPP SCORES");
					console.log( JSON.stringify(results.docs, null, 2) );

					defer.resolve(results.docs);

				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			}, 
			unsyncedQrCodes: function(record_type, stage_type) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.qr_register;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var qr_codes = [];

				fetchNextPage(fetch_defer).then(function() {

					qr_codes = factory.utils.filterUnsyncedRecords(qr_codes);
					factory.sync_collection.staging.addStagedRecordBulk(qr_codes, 'qr_code', 'QR Codes').then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_qr_codes = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.record_type != record_type ) {
									errors++;
								}

								if( !factory.sync_collection.staging.staged_ids.hasOwnProperty(stage_type) || factory.sync_collection.staging.staged_ids[stage_type].indexOf(result.rows[i].doc.record_id) === -1 ) {
									errors++;
								}

								if( errors == 0 ) {
									filtered_qr_codes.push(result.rows[i].doc);
								}

								i++;
							}

							qr_codes.push(...filtered_qr_codes);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_qr_codes = null;

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
			unsyncedQrCodesV1: function(record_id, record_type) {
				var defer = $q.defer()

				riskmachDatabasesFactory.databases.collection.qr_register.find({
					selector: {
						record_id: record_id,
						record_type: record_type
					}
				}).then(function(results){

					console.log("GOT UNSYNCED QR CODES");
					console.log( JSON.stringify(results.docs, null, 2) );

					defer.resolve(results.docs);

				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			}, 
			unsyncedRecordMedia: function(record_type, stage_type) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.media;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var media = [];

				fetchNextPage(fetch_defer).then(function() {

					media = factory.utils.filterUnsyncedRecords(media);
					factory.sync_collection.staging.addStagedRecordBulk(media, 'media', 'Media').then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_media = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.table != 'mediarecords' ) {
									errors++;
								}   

								if( result.rows[i].doc.record_type != record_type ) {
									errors++;
								}

								// SYSTEM GENERATED
								if( result.rows[i].doc.hasOwnProperty('sys_generated') && result.rows[i].doc.sys_generated == 'Yes' ) {
									errors++;
								}

								if( !factory.sync_collection.staging.staged_ids.hasOwnProperty(stage_type) || factory.sync_collection.staging.staged_ids[stage_type].indexOf(result.rows[i].doc.record_id) === -1 ) {
									errors++;
								}

								if( errors == 0 ) {
									filtered_media.push(result.rows[i].doc);
								}

								i++;
							}

							media.push(...filtered_media);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_media = null;

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
			unsyncedRecordMediaV1: function(record_id, record_type) {
				var defer = $q.defer(); 

				riskmachDatabasesFactory.databases.collection.media.find({
					selector: {
						table: 'mediarecords',
						record_id: record_id,
						record_type: record_type
					}
				}).then(function(results){
					console.log("GOT RECORDS UNSYNCED MEDIA");
					console.log( JSON.stringify(results.docs, null, 2) );

					defer.resolve(results.docs);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			}
		}

		factory.syncCoreData = function(filters) 
		{
			var defer = $q.defer();

			factory.fetchUnsyncedCoreData(filters).then(function() {

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetchUnsyncedCoreData = function(filters) 
		{
			var defer = $q.defer();

			// RESET SYNC STATS HERE
			factory.sync_collection.stats.resetStats();

			factory.sync_collection.staging.current_fetch_stage = 'Fetching project';

			factory.dbFetch.coreProjectRecord().then(function(project_record) {
 				factory.sync_collection.staging.addStagedRecord(project_record, 'project');

 				factory.sync_collection.staging.current_fetch_stage = 'Fetching sites';

 				factory.dbFetchCollection.unsyncedSites(filters).then(function(sites) {

 					factory.fetchUnsyncedSiteData().then(function() {

 						defer.resolve(factory.sync_collection.staging.staged_records);

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

		factory.fetchSitesUnsyncedData = function(sites) 
		{
			var defer = $q.defer();

			var active_site_index = 0;

			factory.fetchSitesUnsyncedDataSequential(sites, active_site_index, defer).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetchSitesUnsyncedDataSequential = function(sites, active_site_index, defer) 
		{
			// NO SITES TO FETCH DATA FOR
			if( sites.length == 0 ) {
				defer.resolve();
				return defer.promise;
			};

			// FETCH ALL SITES UNSYNCED DATA
			if( active_site_index > sites.length - 1 ) {
				defer.resolve();
				return defer.promise;
			};

			factory.fetchUnsyncedSiteData(sites[active_site_index]).then(function(site_record) {
				sites[active_site_index] = site_record;
				active_site_index++;
				factory.fetchSitesUnsyncedDataSequential(sites, active_site_index, defer);

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetchUnsyncedSiteData = function() 
		{
			var defer = $q.defer();
			var fetch_defer = $q.defer();

			var stages = factory.utils.site.fetch_data_stages;

			var stage_index = 0;

			fetchNextUnsyncedSiteDataStage(stages, stage_index, fetch_defer).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function fetchNextUnsyncedSiteDataStage(stages, stage_index, defer) 
			{
				// NO FETCH STAGES
				if( stages.length == 0 ) {
					defer.resolve();
					return defer.promise;
				};

				// IF FINISHED ALL FETCH STAGES
				if( stage_index > stages.length - 1 ) {
					defer.resolve();
					return defer.promise;
				};

				var active_stage = stages[stage_index];

				if( active_stage == 'buildings' ) {
					factory.sync_collection.staging.current_fetch_stage = 'Fetching buildings';

					factory.dbFetchCollection.unsyncedBuildings().then(function(buildings) {

						// MOVE ON TO NEXT STAGE
						stage_index++;
						fetchNextUnsyncedSiteDataStage(stages, stage_index, defer);

					}, function(error) {
						defer.reject(error);
					});
				};

				if( active_stage == 'areas' ) {
					factory.sync_collection.staging.current_fetch_stage = 'Fetching areas';

					factory.dbFetchCollection.unsyncedAreas().then(function(areas) {

						// MOVE ON TO NEXT STAGE
						stage_index++;
						fetchNextUnsyncedSiteDataStage(stages, stage_index, defer);

					}, function(error) {
						defer.reject(error);
					});
				};

				if( active_stage == 'assets' ) {
					factory.sync_collection.staging.current_fetch_stage = 'Fetching machines';

					factory.fetchAssetsUnsyncedData().then(function() {
						// MOVE ON TO NEXT STAGE
						stage_index++;
						fetchNextUnsyncedSiteDataStage(stages, stage_index, defer);

					}, function(error) {
						defer.reject(error);
					});
				};

				if( active_stage == 'record_assets' ) {
					factory.sync_collection.staging.current_fetch_stage = 'Fetching assets';

					factory.dbFetchCollection.unsyncedRecordAssets().then(function(assets) {

						// MOVE ON TO NEXT STAGE
						stage_index++;
						fetchNextUnsyncedSiteDataStage(stages, stage_index, defer);

					}, function(error) {
						defer.reject(error);
					});
				};

				return defer.promise;
			}

			return defer.promise;
		}

		factory.fetchUnsyncedSiteDataV1 = function(site_record) 
		{
			var defer = $q.defer();
			var fetch_defer = $q.defer();

			var stages = factory.utils.site.fetch_data_stages;

			var stage_index = 0;

			fetchNextUnsyncedSiteDataStage(site_record, stages, stage_index, fetch_defer).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function fetchNextUnsyncedSiteDataStage(site_record, stages, stage_index, defer) 
			{
				// NO FETCH STAGES
				if( stages.length == 0 ) {
					defer.resolve();
					return defer.promise;
				};

				// IF FINISHED ALL FETCH STAGES
				if( stage_index > stages.length - 1 ) {
					defer.resolve();
					return defer.promise;
				};

				var active_stage = stages[stage_index];

				if( active_stage == 'buildings' ) {
					factory.dbFetchCollection.unsyncedBuildings(site_record._id).then(function(buildings) {
						// FILTER UNSYNCED RECORDS
						var unsynced_buildings = factory.utils.filterUnsyncedRecords(buildings);
						factory.sync_collection.staging.addStagedRecordBulk(unsynced_buildings, 'building');

						// MOVE ON TO NEXT STAGE
						stage_index++;
						fetchNextUnsyncedSiteDataStage(site_record, stages, stage_index, defer);

					}, function(error) {
						defer.reject(error);
					});
				};

				if( active_stage == 'areas' ) {
					factory.dbFetchCollection.unsyncedAreas(site_record._id).then(function(areas) {
						// FILTER UNSYNCED RECORDS
						var unsynced_areas = factory.utils.filterUnsyncedRecords(areas);
						factory.sync_collection.staging.addStagedRecordBulk(unsynced_areas, 'area');

						// MOVE ON TO NEXT STAGE
						stage_index++;
						fetchNextUnsyncedSiteDataStage(site_record, stages, stage_index, defer);

					}, function(error) {
						defer.reject(error);
					});
				};

				if( active_stage == 'assets' ) {
					factory.fetchAssetsUnsyncedData(site_record._id).then(function() {
						// MOVE ON TO NEXT STAGE
						stage_index++;
						fetchNextUnsyncedSiteDataStage(site_record, stages, stage_index, defer);

					}, function(error) {
						defer.reject(error);
					});
				};

				if( active_stage == 'record_assets' ) {
					factory.dbFetchCollection.unsyncedAssets(site_record._id).then(function(assets) {
						// FIND RECORD ASSETS
						assets = factory.utils.filterRecordAssets(assets, true);
						// FILTER UNSYNCED RECORDS
						var unsynced_assets = factory.utils.filterUnsyncedRecords(assets);

						factory.sync_collection.staging.addStagedRecordBulk(unsynced_assets, 'asset');

						// MOVE ON TO NEXT STAGE
						stage_index++;
						fetchNextUnsyncedSiteDataStage(site_record, stages, stage_index, defer);

					}, function(error) {
						defer.reject(error);
					});
				};

				return defer.promise;
			}

			return defer.promise;
		}

		factory.fetchAssetsUnsyncedData = function() 
		{
			var defer = $q.defer();

			factory.dbFetchCollection.unsyncedAssets().then(function() {

				factory.fetchUnsyncedAssetData().then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetchAssetsUnsyncedDataV1 = function(site_id) 
		{
			var defer = $q.defer();

			factory.dbFetchCollection.unsyncedAssets(site_id).then(function(assets) {
				// FIND NONE RECORD ASSETS
				assets = factory.utils.filterRecordAssets(assets, false);
				// FILTER UNSYNCED RECORDS
				var unsynced_assets = factory.utils.filterUnsyncedRecords(assets);
				var parent_assets = [];

				var active_asset_index = 0;

				// SET PARENT ASSETS, SO THESE CAN BE FETCHED FIRST
				angular.forEach(unsynced_assets, function(asset_record, index) {
					if( asset_record.parent_asset_id == null ) {
						parent_assets.push(asset_record);
					};
				});

				factory.sync_collection.staging.addStagedRecordBulk(parent_assets, 'asset');

				factory.fetchAssetsUnsyncedDataSequential(parent_assets, active_asset_index, defer).then(function() {

					// FETCH CHILD ASSETS WHERE PARENT IS NOT IN FETCH
					factory.fetchEscapedChildAssets(unsynced_assets).then(function() {

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

		factory.fetchAssetsUnsyncedDataSequential = function(assets, active_asset_index, defer) 
		{
			// NO ASSETS TO FETCH DATA FOR
			if( assets.length == 0 ) {
				defer.resolve();
				return defer.promise;
			};

			// FETCHED DATA FOR ALL ASSETS
			if( active_asset_index > assets.length - 1 ) {
				defer.resolve();
				return defer.promise;
			};

			factory.fetchUnsyncedAssetData(assets[active_asset_index]).then(function() {
				active_asset_index++;
				factory.fetchAssetsUnsyncedDataSequential(assets, active_asset_index, defer);

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetchUnsyncedAssetData = function() 
		{
			var defer = $q.defer();
			var fetch_defer = $q.defer();

			var stages = factory.utils.asset.fetch_data_stages;

			var stage_index = 0;

			fetchNextUnsyncedAssetDataStage(stages, stage_index, fetch_defer).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function fetchNextUnsyncedAssetDataStage(stages, stage_index, defer) {
				// NO STAGES
				if( stages.length == 0 ) {
					defer.resolve();
					return defer.promise;
				};

				// IF FETCHED DATA FOR ALL STAGES
				if( stage_index > stages.length - 1 ) {
					defer.resolve();
					return defer.promise;
				};

				var active_stage = stages[stage_index];

				if( active_stage == 'tasks' ) {
					factory.sync_collection.staging.current_fetch_stage = 'Fetching tasks';

					factory.dbFetchCollection.unsyncedTasks().then(function(tasks) {

						// MOVE ON TO NEXT STAGE
						stage_index++;
						fetchNextUnsyncedAssetDataStage(stages, stage_index, defer);

					}, function(error) {
						defer.reject(error);
					});
				};

				if( active_stage == 'ipp_scores' ) {
					factory.sync_collection.staging.current_fetch_stage = 'Fetching IPP scores';

					factory.dbFetchCollection.unsyncedIppScores().then(function(ipp_scores) {

						// MOVE ON TO NEXT STAGE
						stage_index++;
						fetchNextUnsyncedAssetDataStage(stages, stage_index, defer);

					}, function(error) {
						defer.reject(error);
					});
				};

				if( active_stage == 'qr_codes' ) {
					factory.sync_collection.staging.current_fetch_stage = 'Fetching QR codes';

					factory.dbFetchCollection.unsyncedQrCodes('Asset', 'asset').then(function(qr_codes) {

						// MOVE ON TO NEXT STAGE
						stage_index++;
						fetchNextUnsyncedAssetDataStage(stages, stage_index, defer);

					}, function(error) {
						defer.reject(error);
					});
				};

				if( active_stage == 'media' ) {
					factory.sync_collection.staging.current_fetch_stage = 'Fetching media';

					factory.dbFetchCollection.unsyncedRecordMedia('asset', 'asset').then(function(media) {

						// MOVE ON TO NEXT STAGE
						stage_index++;
						fetchNextUnsyncedAssetDataStage(stages, stage_index, defer);

					}, function(error) {
						defer.reject(error);
					});
				};

				return defer.promise;
			}

			return defer.promise;
		}

		factory.fetchUnsyncedChildAssetsData = function(parent_asset_id, defer) 
		{
			factory.dbFetchCollection.unsyncedChildAssets(parent_asset_id).then(function(assets) {
				// FIND NONE RECORD ASSETS
				assets = factory.utils.filterRecordAssets(assets, false);
				// FILTER UNSYNCED RECORDS
				var unsynced_assets = factory.utils.filterUnsyncedRecords(assets);

				var active_asset_index = 0;

				factory.sync_collection.staging.addStagedRecordBulk(unsynced_assets, 'asset');

				factory.fetchAssetsUnsyncedDataSequential(assets, active_asset_index, defer).then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetchEscapedChildAssets = function(assets) 
		{
			var defer = $q.defer();

			factory.doFetchEscapedChildAssets(assets).then(function(child_assets) {

				factory.sync_collection.staging.addStagedRecordBulk(child_assets, 'asset');

				factory.fetchAssetsUnsyncedDataSequential(child_assets, 0, defer).then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.doFetchEscapedChildAssets = function(assets) 
		{
			var defer = $q.defer();

			var counter = 0;
			var escaped_assets = [];

			angular.forEach(assets, function(child_asset, child_asset_index) {

				var escaped = false;

				// IF CHILD ASSET
				if( child_asset.parent_asset_id != null ) {

					escaped = true;

					angular.forEach(assets, function(parent_asset, parent_asset_index) {

						if( child_asset.parent_asset_id == parent_asset._id ) {
							escaped = false;
						}

					});
				}

				if( escaped ) {
					escaped_assets.push(child_asset);
				}

				counter++;

				if( counter > assets.length - 1 ) {
					defer.resolve(escaped_assets);
					return defer.promise;
				}

			});

			return defer.promise;
		}

		factory.live_prefix = '../../../';
		factory.test_request_prefix = 'https://system.riskmach.co.uk/';

		factory.sync_requests = {
			attempt_meta: {
				saved: false,
				num_attempts: 0,
				attempt_limit: 2,
				last_error: null
			},
			endpoints: {
				project: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncProjectRecord',
				site: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncRegisterSite',
				building: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncRegisterBuilding', 
				area: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncRegisterArea',
				asset: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncRegisterAsset', 
				task: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncRegisterTask', 
				ipp_score: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncAssetProfilePointRecord',
				qr_code: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncQRAssocRecord',
				media: factory.test_request_prefix + 'laravel/public/webapp/v1/UploadMedia',
				media_record: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncMediaRecord'
			},
			newAttemptMeta: function(){
				return angular.copy(factory.sync_requests.attempt_meta);
			},
			syncRecord: function(staging_record){
				var defer = $q.defer();
				var sync_defer = $q.defer();

				sync(staging_record, sync_defer).then(function(sync_result){
					staging_record.synced = true;
					//INCREMENT SYNCED
					factory.sync_collection.incrementStat('total_synced', 1);
					defer.resolve();
				}, function(error){
					defer.reject(error);
				});

				function sync(staging_record, defer){
					var endpoint = null;

					// if( staging_record.attempt_meta.num_attempts == '2' )
					// {
					// 	defer.resolve({});
					// 	return defer.promise;
					// }

					//IF NOT SYNCING A PROJECT THEN ADD SYNC ID TO RECORD TO GROUP SYNC TOGETHER
					if( staging_record.record_type != 'project' )
					{
						staging_record.record.sync_id = factory.sync_collection.staging.project_record.record.sync_id;
					}

					if( !staging_record.hasOwnProperty('mid_record_id') )
					{
						staging_record.record.mid_record_id = null;
					}

					if( staging_record.record_type == 'media' ) {
						endpoint = factory.sync_requests.endpoints.media_record;
					}
					else 
					{
						if( factory.sync_requests.endpoints[staging_record.record_type] )
						{
							endpoint = factory.sync_requests.endpoints[staging_record.record_type];
						}
					}

					if( !endpoint )
					{
						defer.reject("It appears the developer has not setup the sync endpoint for this record type ["+ staging_record.record_type +"]");
						return defer.promise;
					}

					if( staging_record.attempt_meta.num_attempts > staging_record.attempt_meta.attempt_limit )
					{
						defer.reject("Error syncing record [attempt limit exceed]: " + staging_record.attempt_meta.last_error);
						return defer.promise;
					}

					$http.post(endpoint,{ 
		            	params: {
		            		data: staging_record.record,
		            		token: authFactory.getLoginToken()
		            	}
		            })
					.success(function(data, status, headers, config) {

						console.log( JSON.stringify(data, null, 2) );

						if( data.error == true )
						{
							//TRY AGAIN
							staging_record.attempt_meta.num_attempts++;
							staging_record.attempt_meta.last_error = data.error_messages[0];
		            		sync(staging_record, defer);
						}
						else
						{
							factory.sync_requests.saveSyncResult(staging_record, data).then(function(up_result){
								defer.resolve(data);
							}, function(error){
								defer.reject(error);
							});
						}
		            })
		            .error(function(data, status, headers, config) {
		            	console.log( JSON.stringify(data, null, 2) );

		            	//TRY AGAIN
		            	staging_record.attempt_meta.num_attempts++;
		            	staging_record.attempt_meta.last_error = "Error connecting to sync ["+ staging_record.record_type +"] endpoint";
		            	sync(staging_record, defer);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			saveSyncResult: function(staging_record, result){
				var defer = $q.defer();

				staging_record.record.mid_record_id = result.mid_record_id;
				staging_record.record.synced = true;

				staging_record.record.date_record_synced = new Date().getTime();

				if( staging_record.record_type == 'project' )
				{
					staging_record.record.sync_id = result.sync_id;
					factory.sync_collection.staging.project_record.record.sync_id = result.sync_id;

					// alert("SYNCED PROJECT ID: " + result.sync_id);

					riskmachDatabasesFactory.databases.collection.projects.put(staging_record.record).then(function(up_result){
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);

						console.log("UPDATED SYNC PROJECT RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING SYNC PROJECT RESULT: " + error);
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'site' ) 
				{
					riskmachDatabasesFactory.databases.collection.sites.put(staging_record.record).then(function(up_result) {
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);

						console.log("UPDATED SITE SYNC RESULT");

					}).catch(function(error) {
						console.log("ERROR UPDATING SITE SYNC RESULT: " + error);
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'building' ) 
				{
					riskmachDatabasesFactory.databases.collection.buildings.put(staging_record.record).then(function(up_result) {
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);

						console.log("UPDATED BUILDING SYNC RESULT");

					}).catch(function(error) {
						console.log("ERROR UPDATING BUILDING SYNC RESULT: " + error);
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'area' ) 
				{
					riskmachDatabasesFactory.databases.collection.areas.put(staging_record.record).then(function(up_result) {
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);

						console.log("UPDATED AREA SYNC RESULT");

					}).catch(function(error) {
						console.log("ERROR UPDATING AREA SYNC RESULT: " + error);
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'asset' )
				{
					riskmachDatabasesFactory.databases.collection.register_assets.put(staging_record.record).then(function(up_result){
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);
						console.log("UPDATED SYNC ASSET RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING SYNC ASSET RESULT: " + error);
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'task' )
				{
					riskmachDatabasesFactory.databases.collection.tasks.put(staging_record.record).then(function(up_result){
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);
						console.log("UPDATED SYNC TASK RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING SYNC TASK RESULT: " + error);
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'ipp_score' ) 
				{
					riskmachDatabasesFactory.databases.collection.register_asset_ipp.put(staging_record.record).then(function(up_result) {
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);

						console.log("UPDATED IPP SCORE SYNC RESULT");

					}).catch(function(error) {
						console.log("ERROR UPDATING IPP SCORE SYNC RESULT: " + error);
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'qr_code' ) 
				{
					riskmachDatabasesFactory.databases.collection.qr_register.put(staging_record.record).then(function(up_result) {
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);

						console.log("UPDATED QR RECORD SYNC RESULT");

					}).catch(function(error) {
						console.log("ERROR UPDATING QR RECORD SYNC RESULT: " + error);
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'media' )
				{
					riskmachDatabasesFactory.databases.collection.media.put(staging_record.record).then(function(up_result){
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);
						console.log("UPDATED SYNC MEDIA RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING SYNC MEDIA RESULT: " + error);
						defer.reject(error);
					});
				}

				return defer.promise;
			}
		};

		factory.import_requests = {
			endpoints: {
				project: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportProjectRecord',
				site: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportRegisterSite',
				building: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportRegisterBuilding', 
				area: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportRegisterArea',
				asset: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportRegisterAsset', 
				task: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncRegisterTask', 
				ipp_score: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportAssetProfilePointRelation',
				qr_code: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportAppQRRelationRecord',
				media: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportMediaRecord'
			},
			priorities: {
				project: 0,
				asset: 1,
				procedure: 2,
				task: 3,
				step: 4,
				task_asset: 5,
				control_item: 6,
				assessment: 7,
				ra_control_item_relation: 8,
				checklist_instance: 9,
				checklist_question_record: 10,
				ra_question_relation: 11,
				mr_hazard: 12,
				mr_control: 13,
				hazard_control_relation: 14,
				media: 15,
			},
			importRecord: function(staging_record){
				var defer = $q.defer();
				var sync_defer = $q.defer();

				if( !staging_record.record.hasOwnProperty('synced') || !staging_record.record.synced )
				{
					defer.reject("The record has not yet been synced!");
					return defer.promise;
				}

				importRecord(staging_record, sync_defer).then(function(sync_result){
					staging_record.record.imported = true;
					//INCREMENT SYNCED
					factory.sync_collection.incrementStat('total_imported', 1);
					defer.resolve();
				}, function(error){
					defer.reject(error);
				});

				function importRecord(staging_record, defer){
					var endpoint = null;

					if( factory.import_requests.endpoints[staging_record.record_type] )
					{
						endpoint = factory.import_requests.endpoints[staging_record.record_type];
					}

					if( !endpoint )
					{
						defer.reject("It appears the developer has not setup the import endpoint for this record type ["+ staging_record.record_type +"]");
						return defer.promise;
					}

					if( staging_record.attempt_meta.num_attempts > staging_record.attempt_meta.attempt_limit )
					{
						defer.reject("Error importing record [attempt limit exceed]: " + staging_record.attempt_meta.last_error);
						return defer.promise;
					}

					$http.get(endpoint,{
		            	params: {
		            		mid_record_id: staging_record.record.mid_record_id,
		            		token: authFactory.getLoginToken()
		            	}
		            })
					.success(function(data, status, headers, config) {

						if( data.error == true )
						{
							//TRY AGAIN
							staging_record.attempt_meta.num_attempts++;
							staging_record.attempt_meta.last_error = data.error_messages[0];
		            		importRecord(staging_record, defer);
						}
						else
						{
							factory.import_requests.saveImportResult(staging_record, data).then(function(up_result){
								defer.resolve(data);
							}, function(error){
								defer.reject(error);
							});
						}
		            })
		            .error(function(data, status, headers, config) {
		            	//TRY AGAIN
		            	staging_record.attempt_meta.num_attempts++;
		            	staging_record.attempt_meta.last_error = "Error connecting to import ["+ staging_record.record_type +"] endpoint";
		            	importRecord(staging_record, defer);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			saveImportResult: function(staging_record, result) {
				var defer = $q.defer();

				staging_record.record.imported = true;

				if( staging_record.record_type == 'project' )
				{
					factory.dbUtils.project.saveProjectImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'site' ) 
				{
					factory.dbUtils.site.saveSiteImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'building' ) 
				{
					factory.dbUtils.building.saveBuildingImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'area' ) 
				{
					factory.dbUtils.area.saveAreaImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'asset' )
				{
					factory.dbUtils.asset.saveAssetImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'task' )
				{
					// riskmachDatabasesFactory.databases.collection.tasks.put(staging_record.record).then(function(up_result){
					// 	staging_record.record._id = up_result.id;
					// 	staging_record.record._rev = up_result.rev;
					// 	defer.resolve(staging_record);
					// 	console.log("UPDATED IMPORT TASK RESULT");
					// }).catch(function(error){
					// 	console.log("ERROR UPDATING IMPORTING TASK RESULT: " + error);
					// 	defer.reject(error);
					// });

					defer.resolve(staging_record);
				}

				if( staging_record.record_type == 'ipp_score' ) 
				{
					factory.dbUtils.ipp_score.saveIppScoreImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'qr_code' ) 
				{
					factory.dbUtils.qr_code.saveQrCodeImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'media' )
				{
					factory.dbUtils.media.saveMediaImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;
			},
			verifyImportComplete: function(project_record, total_app_records){
				var defer = $q.defer();
				var verify_defer = $q.defer();

				if( !project_record.hasOwnProperty('synced') || !project_record.synced )
				{
					console.log("PROJECT RECORD NOT SYNCED");
					console.log(project_record);

					defer.reject("The project has not yet been synced (a)");
					return defer.promise;
				}

				if( !project_record.hasOwnProperty('sync_id') || !project_record.sync_id )
				{
					console.log("PROJECT RECORD NOT SYNCED");
					console.log(project_record);

					defer.reject("The project has not yet been synced (b)");
					return defer.promise;
				}

				var attempt_meta = {
					num_attempts: 0,
					attempt_limit: 3,
					last_error: null
				};

				verifyImport(project_record, total_app_records, attempt_meta, verify_defer).then(function(verification_success){

					if( verification_success )
					{
						defer.resolve(true);
					}
					else
					{
						defer.reject("Record verification failed: The cloud does not have all of the app records");
					}

				}, function(error){
					defer.reject(error);
				});

				function verifyImport(project_record, total_app_records, attempt_meta, defer){

					if( attempt_meta.num_attempts > attempt_meta.attempt_limit )
					{
						defer.reject(attempt_meta.last_error);
						return defer.promise;
					}

					// live
					// ../../../laravel/public/webapp/v1/VerifyImportComplete

					// testing
					// https://system.riskmach.co.uk/laravel/public/webapp/v1/VerifyImportComplete

					$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/VerifyImportComplete',{
		            	params: {
		            		new_sync_id: project_record.sync_id,
		            		total_app_records: total_app_records
		            	}
		            })
					.success(function(data, status, headers, config) {

						if( data.error == true )
						{
							//TRY AGAIN
							attempt_meta.num_attempts++;
							attempt_meta.last_error = data.error_messages[0];
		            		verifyImport(project_record, total_app_records, attempt_meta, defer);
						}
						else
						{
							//SAVE VERIFICATION RESULT
							console.log("VERIFICATION SUCCESSFULL");
							console.log(data.veri_data.success);

							var verification_result = 'fail';

							if(data.veri_data.success)
							{
								verification_result = 'pass';
							}

							project_record.import_verification_result = verification_result;

							riskmachDatabasesFactory.databases.collection.projects.put(project_record).then(function(up_result){
								project_record._id = up_result.id;
								project_record._rev = up_result.rev;
								console.log("UPDATED PROJECT VERIFICATION RESULT");

								//RESOLVE VERIFICATION SUCCESS
								if( data.veri_data.success )
								{
									defer.resolve(data.veri_data.success);
								}
								else
								{
									//INCREMENT ATTEMPT # SO DOESNT TRY AGAIN!
									attempt_meta.num_attempts = attempt_meta.attempt_limit + 1;
									defer.reject("Only ("+ data.veri_data.total_imported +" / "+ total_app_records +") records of this import were found on the cloud");
								}

							}).catch(function(error){
								console.log("ERROR UPDATING PROJECT VERIFICATION RESULT: " + error);
								defer.reject(error);
							});
						}
		            })
		            .error(function(data, status, headers, config) {
		            	//TRY AGAIN
		            	attempt_meta.num_attempts++;
		            	attempt_meta.last_error = "Error verifying import complete (id: "+ project_record.sync_id +")";
		            	verifyImport(project_record, total_app_records, attempt_meta, defer);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			finaliseImportComplete: function(project_record){
				var defer = $q.defer();
				var request_defer = $q.defer();

				var attempt_meta = {
					num_attempts: 0,
					attempt_limit: 3,
					last_error: null
				};

				doFinaliseImport(project_record, attempt_meta, defer).then(function(result){
					defer.resolve();
				}, function(error){
					defer.reject(error);
				});

				function doFinaliseImport(project_record, attempt_meta, defer){

					if( attempt_meta.num_attempts > attempt_meta.attempt_limit )
					{
						defer.reject(attempt_meta.last_error);
						return defer.promise;
					}

					// live
					// ../../../laravel/public/webapp/v1/FinaliseImport

					// testing
					// https://system.riskmach.co.uk/laravel/public/webapp/v1/FinaliseImport

					$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/FinaliseImport',{
		            	params: {
		            		new_sync_id: project_record.sync_id
		            	}
		            })
					.success(function(data, status, headers, config) {

						if( data.error == true )
						{
							//TRY AGAIN
							attempt_meta.num_attempts++;
							attempt_meta.last_error = data.error_messages[0];
		            		doFinaliseImport(project_record, attempt_meta, defer);
						}
						else
						{
							//SAVE VERIFICATION RESULT
							console.log("PROJECT FINALISED SUCCESSFULL");
							console.log(project_record);

							factory.markStagedRecordsContentsImported().then(function() {
								console.log("STAGED RECORDS IMPORT FINALISED");
								defer.resolve();
							}, function(error) {
								defer.reject(error);
							});
						}
		            })
		            .error(function(data, status, headers, config) {
		            	//TRY AGAIN
		            	attempt_meta.num_attempts++;
		            	attempt_meta.last_error = "Error finalising import complete (id: "+ project_record.sync_id +")";
		            	doFinaliseImport(project_record, attempt_meta, defer);
					});

					return defer.promise;
				}

				return defer.promise;
			}
		};

		factory.markAllStagedItemsContentsSynced = function() 
		{
			var defer = $q.defer();

			factory.markStagedRecordsContentsSynced().then(function() {

				factory.markStagedFilesContentsSynced().then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.markStagedRecordsContentsSynced = function() 
		{
			var defer = $q.defer();
			var save_defer = $q.defer();

			var max_index = Object.keys(factory.sync_collection.staging.staged_records).length - 1;
			
			// IF NO STAGED RECORDS
			if( max_index == -1 ) {
				defer.resolve();
				return defer.promise;
			}

			// FIRST RECORD TO MARK IMPORTED SHOULD BE THE LAST RECORD IMPORTED
			var next_index = max_index;

			markNextStagedRecordContentsSynced(save_defer).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function markNextStagedRecordContentsSynced(defer) 
			{
				var next_record = null;

				//FIND THE NEXT STAGING RECORD BASED ON INDEX
				var index_counter = -1;
				Object.keys(factory.sync_collection.staging.staged_records).forEach(function(current_key){
					index_counter++;

					if( index_counter == next_index ) {
						next_record = factory.sync_collection.staging.staged_records[current_key];
					}

				});

				if( !next_record ) {
					defer.reject("Unable to find the next record to mark contents synced");
					return defer.promise;
				}

				// DO MARK RECORD CONTENTS SYNCED
				factory.dbUtils.markStagedRecordContentsSynced(next_record).then(function() {

					next_index--;

					// MARKED ALL STAGED RECORDS CONTENTS SYNCED
					if( next_index == -1 ) {
						defer.resolve();
						return defer.promise;
					}

					// MARK NEXT STAGED RECORD CONTENTS SYNCED
					markNextStagedRecordContentsSynced(defer);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}

			return defer.promise;
		}

		factory.markStagedFilesContentsSynced = function() 
		{
			var defer = $q.defer();
			var save_defer = $q.defer();

			var max_index = Object.keys(factory.sync_collection.staging.staged_files).length - 1;

			// IF NO STAGED FILES
			if( max_index == -1 ) {
				defer.resolve();
				return defer.promise;
			}

			var next_index = 0;

			markNextStagedFileContentsSynced(save_defer).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function markNextStagedFileContentsSynced(defer) 
			{
				var next_record = null;

				//FIND THE NEXT STAGING FILE BASED ON INDEX
				var index_counter = -1;
				Object.keys(factory.sync_collection.staging.staged_files).forEach(function(current_key){
					index_counter++;

					if( index_counter == next_index ) {
						next_record = factory.sync_collection.staging.staged_files[current_key];
					}

				});

				if( !next_record ) {
					defer.reject("Unable to find the next file to mark contents synced");
					return defer.promise;
				}

				// DO MARK RECORD CONTENTS SYNCED
				factory.dbUtils.markStagedRecordContentsSynced(next_record).then(function() {

					next_index++;

					// MARKED ALL STAGED RECORDS CONTENTS SYNCED
					if( next_index > max_index ) {
						defer.resolve();
						return defer.promise;
					}

					// MARK NEXT STAGED FILE CONTENTS SYNCED
					markNextStagedFileContentsSynced(defer);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}

			return defer.promise;
		}

		factory.markStagedRecordsContentsImported = function() 
		{
			var defer = $q.defer();

			var defer = $q.defer();
			var save_defer = $q.defer();

			var max_index = Object.keys(factory.sync_collection.staging.import_staged).length - 1;
			
			// IF NO STAGED RECORDS
			if( max_index == -1 ) {
				defer.resolve();
				return defer.promise;
			}

			// FIRST RECORD TO BE MARKED IMPORTED SHOULD BE THE LAST RECORD IMPORTED
			var next_index = max_index;

			markNextStagedRecordContentsImported(save_defer).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function markNextStagedRecordContentsImported(defer) 
			{
				var next_record = null;

				//FIND THE NEXT STAGING RECORD BASED ON INDEX
				var index_counter = -1;
				Object.keys(factory.sync_collection.staging.import_staged).forEach(function(current_key){
					index_counter++;

					if( index_counter == next_index ) {
						next_record = factory.sync_collection.staging.import_staged[current_key];
					}

				});

				if( !next_record ) {
					defer.reject("Unable to find the next record to mark contents imported");
					return defer.promise;
				}

				// DO MARK RECORD CONTENTS IMPORTED
				factory.dbUtils.markStagedRecordContentsImported(next_record).then(function() {

					next_index--;

					// MARKED ALL STAGED RECORDS CONTENTS IMPORTED
					if( next_index == -1 ) {
						defer.resolve();
						return defer.promise;
					}

					// MARK NEXT STAGED RECORD CONTENTS IMPORTED
					markNextStagedRecordContentsImported(defer);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}

			return defer.promise;
		}

		factory.markStagedRecordsContentsImportedV1 = function() 
		{
			var defer = $q.defer();

			var defer = $q.defer();
			var save_defer = $q.defer();

			var max_index = Object.keys(factory.sync_collection.staging.import_staged).length - 1;
			
			// IF NO STAGED RECORDS
			if( max_index == -1 ) {
				defer.resolve();
				return defer.promise;
			}

			var next_index = 0;

			markNextStagedRecordContentsImported(save_defer).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function markNextStagedRecordContentsImported(defer) 
			{
				var next_record = null;

				//FIND THE NEXT STAGING RECORD BASED ON INDEX
				var index_counter = -1;
				Object.keys(factory.sync_collection.staging.import_staged).forEach(function(current_key){
					index_counter++;

					if( index_counter == next_index ) {
						next_record = factory.sync_collection.staging.import_staged[current_key];
					}

				});

				if( !next_record ) {
					defer.reject("Unable to find the next record to mark contents imported");
					return defer.promise;
				}

				// DO MARK RECORD CONTENTS IMPORTED
				factory.dbUtils.markStagedRecordContentsImported(next_record).then(function() {

					next_index++;

					// MARKED ALL STAGED RECORDS CONTENTS IMPORTED
					if( next_index > max_index ) {
						defer.resolve();
						return defer.promise;
					}

					// MARK NEXT STAGED RECORD CONTENTS IMPORTED
					markNextStagedRecordContentsImported(defer);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}

			return defer.promise;
		}

		factory.dbUtils = {
			markStagedRecordContentsSynced: function(staging_record) {
				var defer = $q.defer();

				var db = null;

				if( staging_record.record_type == 'project' ) {
					db = riskmachDatabasesFactory.databases.collection.projects;
				}

				if( staging_record.record_type == 'site' ) {
					db = riskmachDatabasesFactory.databases.collection.sites;
				}

				if( staging_record.record_type == 'building' ) {
					db = riskmachDatabasesFactory.databases.collection.buildings;
				}

				if( staging_record.record_type == 'area' ) {
					db = riskmachDatabasesFactory.databases.collection.areas;
				}

				if( staging_record.record_type == 'asset' ) {
					db = riskmachDatabasesFactory.databases.collection.register_assets;
				}

				if( staging_record.record_type == 'task' ) {
					db = riskmachDatabasesFactory.databases.collection.tasks;
				}

				if( staging_record.record_type == 'ipp_score' ) {
					db = riskmachDatabasesFactory.databases.collection.register_asset_ipp;
				}

				if( staging_record.record_type == 'qr_code' ) {
					db = riskmachDatabasesFactory.databases.collection.qr_register;
				}

				if( staging_record.record_type == 'media' ) {
					db = riskmachDatabasesFactory.databases.collection.media;
				};

				staging_record.record.date_content_synced = new Date().getTime();

				db.put(staging_record.record).then(function(result) {
					staging_record.record._id = result.id;
					staging_record.record._rev = result.rev;

					defer.resolve(staging_record);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}, 
			markStagedRecordContentsImported: function(staging_record) {
				var defer = $q.defer();

				var db = null;

				//  MARK PROJECT IMPORTED LATER
				if( staging_record.record_type == 'project' ) {
					// db = riskmachDatabasesFactory.databases.collection.projects;
					// staging_record.record.import_finalised = new Date().getTime();
				}

				if( staging_record.record_type == 'site' ) {
					db = riskmachDatabasesFactory.databases.collection.sites;
				}

				if( staging_record.record_type == 'building' ) {
					db = riskmachDatabasesFactory.databases.collection.buildings;
				}

				if( staging_record.record_type == 'area' ) {
					db = riskmachDatabasesFactory.databases.collection.areas;
				}

				if( staging_record.record_type == 'asset' ) {
					db = riskmachDatabasesFactory.databases.collection.register_assets;
				}

				if( staging_record.record_type == 'task' ) {
					db = riskmachDatabasesFactory.databases.collection.tasks;
				}

				if( staging_record.record_type == 'ipp_score' ) {
					db = riskmachDatabasesFactory.databases.collection.register_asset_ipp;
				}

				if( staging_record.record_type == 'qr_code' ) {
					db = riskmachDatabasesFactory.databases.collection.qr_register;
				}

				if( staging_record.record_type == 'media' ) {
					db = riskmachDatabasesFactory.databases.collection.media;
				}

				staging_record.record.date_content_imported = new Date().getTime();

				// REMOVE FROM SYNC
				if( staging_record.record.hasOwnProperty('sync_id') ) {
					staging_record.record.sync_id = null;
				}

				// REMOVE MID TABLE ID
				if( staging_record.record.hasOwnProperty('mid_record_id') ) {
					staging_record.record.mid_record_id = null;
				}

				// REMOVE SYNCED AND IMPORTED BOOLEANS
				if( staging_record.record.hasOwnProperty('synced') ) {
					staging_record.record.synced = null;
				}
				if( staging_record.record.hasOwnProperty('imported') ) {
					staging_record.record.imported = null;
				}

				if( !db ) {
					defer.resolve(staging_record);
					return defer.promise;
				}

				db.put(staging_record.record).then(function(result) {
					staging_record.record._id = result.id;
					staging_record.record._rev = result.rev;

					defer.resolve(staging_record);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}, 
			project: {
				saveProjectImportResult: function(record, result) {
					var defer = $q.defer();

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.status = 2;

						riskmachDatabasesFactory.databases.collection.projects.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);

							console.log("UPDATED IMPORT PROJECT RESULT");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT PROJECT RESULT: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE RM VALUES
					record.rm_id = result.rm_record.ActivityID;

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;

					factory.sync_collection.staging.project_record.record.rm_id = result.rm_id;
					factory.sync_collection.staging.project_record.record.rm_ref = result.rm_ref;
					factory.sync_collection.staging.project_record.record.rm_record = result.rm_record;

					riskmachDatabasesFactory.databases.collection.projects.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);

						console.log("UPDATED IMPORT PROJECT RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT PROJECT RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			site: {
				saveSiteImportResult: function(record, result) {
					var defer = $q.defer();

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.status = 2;

						riskmachDatabasesFactory.databases.collection.sites.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);

							console.log("UPDATED IMPORT SITE RESULT");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT SITE RESULT: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE RM VALUES
					record.rm_id = parseInt(result.rm_record.rm_id);

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.sites.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);

						console.log("UPDATED IMPORT SITE RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT SITE RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			}, 
			building: {
				saveBuildingImportResult: function(record, result) {
					var defer = $q.defer();

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.status = 2;

						riskmachDatabasesFactory.databases.collection.buildings.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);
							console.log("UPDATED IMPORT BUILDING RESULT");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT BUILDING RESULT: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE RM VALUES
					record.rm_id = parseInt(result.rm_record.rm_id);
					record.rm_site_id = parseInt(result.rm_record.rm_site_id);

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.buildings.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT BUILDING RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT BUILDING RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			}, 
			area: {
				saveAreaImportResult: function(record, result) {
					var defer = $q.defer();

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.status = 2;

						riskmachDatabasesFactory.databases.collection.areas.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);
							console.log("UPDATED IMPORT AREA RESULT");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT AREA RESULT: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE RM VALUES
					record.rm_id = parseInt(result.rm_record.rm_id);
					record.rm_site_id = parseInt(result.rm_record.rm_site_id);
					record.rm_building_id = parseInt(result.rm_record.rm_building_id);

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.areas.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT AREA RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT AREA RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			}, 
			asset: {
				saveAssetImportResultV1: function(record, result) {
					var defer = $q.defer();

					if( result.hasOwnProperty('rm_record') && result.rm_record != null ) {
						// ADD MODEL KEYS AND FORMAT
						result.rm_record = factory.utils.formatRmRecordToModel('register_asset', result.rm_record);
					};

					// UPDATE LOCAL VALUES
					result.rm_record._id = record._id;
					result.rm_record._rev = record._rev;
					result.rm_record.site_id = record.site_id;
					result.rm_record.building_id = record.building_id;
					result.rm_record.area_id = record.area_id;
					result.rm_record.parent_asset_id = record.parent_asset_id;
					result.rm_record.record_id = record.record_id;
					result.rm_record.profile_image_media_id = record.profile_image_media_id;
					result.rm_record.num_files = record.num_files;

					result.rm_record.date_record_synced = record.date_record_synced;
					result.rm_record.date_content_synced = record.date_content_synced;
					result.rm_record.user_id = record.user_id;
					result.rm_record.table = record.table;

					// UPDATE IMPORT VALUES
					result.rm_record.date_record_imported = new Date().getTime();
					result.rm_record.record_modified = 'No';

					// SET RM RECORD
					result.rm_record.rm_record = null;
					var rm_record = angular.copy(result.rm_record);
					result.rm_record.rm_record = rm_record;
					result.rm_record.rm_record_modified = 'No';

					// SET STAGING RECORD AS CLOUD RECORD
					record = null;
					record = angular.copy(result.rm_record);

					riskmachDatabasesFactory.databases.collection.register_assets.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT ASSET RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT ASSET RESULT: " + error);
						defer.reject(error);
					});

					defer.resolve();

					return defer.promise;
				},
				saveAssetImportResult: function(record, result) {
					var defer = $q.defer();

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.status = 2;

						riskmachDatabasesFactory.databases.collection.register_assets.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);
							console.log("UPDATED IMPORT ASSET RESULT");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT ASSET RESULT: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE LOCAL VALUES
					record.rm_id = parseInt(result.rm_record.rm_id);
					record.rm_site_id = parseInt(result.rm_record.rm_site_id);
					record.rm_building_id = parseInt(result.rm_record.rm_building_id);
					record.rm_area_id = parseInt(result.rm_record.rm_area_id);
					record.asset_ref = result.rm_record.asset_ref;
					record.prefixed_asset_ref = result.rm_record.prefixed_asset_ref;
					record.location_prefix = result.rm_record.location_prefix;
					record.serial = result.rm_record.serial;
					record.type = result.rm_record.type;
					record.model = result.rm_record.model;
					record.manufacturer = result.rm_record.manufacturer;
					record.supplier = result.rm_record.supplier;
					record.power = result.rm_record.power;
					record.description = result.rm_record.description;
					record.status = parseInt(result.rm_record.status);
					record.in_use = result.rm_record.in_use;

					if( result.rm_record.rm_record_id == '0' ) {
						record.rm_record_id = null;
					} else {
						record.rm_record_id = parseInt(result.rm_record.rm_record_id);
					}

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.register_assets.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT ASSET RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT ASSET RESULT: " + error);
						defer.reject(error);
					});

					defer.resolve();

					return defer.promise;
				}
			},
			task: {

			},
			ipp_score: {
				saveIppScoreImportResult: function(record, result) {
					var defer = $q.defer();

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.status = 2;

						riskmachDatabasesFactory.databases.collection.register_asset_ipp.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);
							console.log("UPDATED IMPORT IPP SCORE RESULT");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT IPP SCORE RESULT: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE RM VALUES
					record.rm_pp_asset_relation_id = parseInt(result.rm_record.rm_pp_asset_relation_id);
					record.rm_asset_id = parseInt(result.rm_record.rm_asset_id);
					record.rm_site_id = parseInt(result.rm_record.rm_site_id);
					record.health_check_date = result.rm_record.health_check_date;
					record.frequency_interval = result.rm_record.frequency_interval;
					record.frequency = parseInt(result.rm_record.frequency);
					record.interval_seconds = result.rm_record.interval_seconds;
					record.ever_inspected = result.rm_record.ever_inspected;
					record.inspection_required = result.rm_record.inspection_required;
					record.has_scheduled = result.rm_record.has_scheduled;
					record.intervals_valid = result.rm_record.intervals_valid;
					record.equally_spaced = result.rm_record.equally_spaced;

					// IF BUILDING ID IS SET
					if( result.rm_record.rm_building_id ) {
						record.rm_building_id = parseInt(result.rm_record.rm_building_id);
					}

					// IF AREA ID IS SET
					if( result.rm_record.rm_area_id ) {
						record.rm_area_id = parseInt(result.rm_record.rm_area_id);
					}  

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.register_asset_ipp.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT IPP SCORE RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT IPP SCORE RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			}, 
			qr_code: {
				saveQrCodeImportResult: function(record, result) {
					var defer = $q.defer();

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.record_id = null;
						record.record_type = null;
						record.rm_record_id = null;

						riskmachDatabasesFactory.databases.collection.qr_register.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);
							console.log("UPDATED IMPORT QR RECORD RESULT");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT QR RECORD RESULT: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE RM VALUES
					record.rm_id = parseInt(result.rm_record.rm_id);
					record.rm_record_id = parseInt(result.rm_record.rm_record_id);

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.qr_register.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT QR RECORD RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT QR RECORD RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			}, 
			media: {
				saveMediaImportResult: function(record, result) {
					var defer = $q.defer();

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.status = 2;

						riskmachDatabasesFactory.databases.collection.media.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);
							console.log("UPDATED IMPORT MEDIA RESULT");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT MEDIA RESULT: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE RM VALUES
					record.rm_id = result.rm_record.ID;
					record.rm_ref = result.rm_record.Ref;
					record.rm_revision_number = result.rm_record.RevisionNumber;
					record.rm_record_item_id = result.rm_record.RecordItemID;
					record.rm_record_item_ref = result.rm_record.RecordItemRef;
					record.file_size = result.rm_record.Filesize;
					record.mime_type = result.rm_record.MimeType;

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.media.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT MEDIA RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT MEDIA RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			}
		}

		factory.markCoreProjectImported = function(project_id) 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.projects;

			db.get(project_id).then(function(doc) {

				doc.date_content_imported = new Date().getTime();
				doc.import_finalised = new Date().getTime();

				// REMOVE FROM SYNC
				if( doc.hasOwnProperty('sync_id') ) {
					doc.sync_id = null;
				}

				// REMOVE MID TABLE ID
				if( doc.hasOwnProperty('mid_record_id') ) {
					doc.mid_record_id = null;
				}

				// REMOVE SYNCED AND IMPORTED BOOLEANS
				if( doc.hasOwnProperty('synced') ) {
					doc.synced = null;
				}
				if( doc.hasOwnProperty('imported') ) {
					doc.imported = null;
				}

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

		//MAKE SURE ALL DATABASES ARE INITIALISED
		riskmachDatabasesFactory.databases.initAll();

		return factory;
	}

}())