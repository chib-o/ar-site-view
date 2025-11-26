(function(){

	var app = angular.module('riskmachManagedRiskSync', ['angular-jwt','riskmachUtils','riskmachDatabases']);
	app.factory('managedRiskSyncFactory', managedRiskSyncFactory);

	function managedRiskSyncFactory($q, $http, $filter, $timeout, riskmachDatabasesFactory, authFactory)
	{
		var factory = {};

		factory.sync_collection = {
			stats: {
				total_records: 0,
				total_synced: 0,
				total_files_synced: 0,
				total_files: 0,
				total_file_size: 0,
				total_staged: 0,
				total_imported: 0,
				total_data: 0, 
				total_synced_data: 0, 
				total_synced_imported_data: 0, 
				total_percentage_complete: 0, 
				sync_percentage_complete: 0,
				import_percentage_complete: 0
			},
			incrementStat: function(stat, value){
				$timeout(function(){
					console.log("Increment Stat ["+ stat +"] by ["+ value +"]");
					factory.sync_collection.stats[stat] = factory.sync_collection.stats[stat] + value;

					if( stat == 'total_records' || stat == 'total_files' ) {
						factory.sync_collection.stats['total_data']++;
					}

					if( stat == 'total_synced' || stat == 'total_files_synced' || stat == 'total_imported' ) {
						factory.sync_collection.stats['total_synced_imported_data']++;
						factory.sync_collection.calcTotalPercentageComplete();
					}

					if( stat == 'total_synced' || stat == 'total_files_synced' ) {
						factory.sync_collection.stats['total_synced_data']++;
						factory.sync_collection.calcSyncPercentageComplete();
					}

					if( stat == 'total_imported' ) {
						factory.sync_collection.calcImportPercentageComplete();
					}

				}, 0);
			},
			calcTotalPercentageComplete: function() {
				var percentage = 0;

				if( !factory.sync_collection.stats['total_data'] ) {
					factory.sync_collection.stats['total_percentage_complete'] = percentage;
					return;
				}

				// Math.round( (total synced&imported / (total data*2)) * 100 )
				percentage =  Math.round( (factory.sync_collection.stats['total_synced_imported_data'] / (factory.sync_collection.stats['total_data'] * 2)) * 100 );

				factory.sync_collection.stats['total_percentage_complete'] = percentage;
			},
			calcSyncPercentageComplete: function() {
				var percentage = 0;

				if( !factory.sync_collection.stats['total_data'] ) {
					factory.sync_collection.stats['sync_percentage_complete'] = percentage;
					return;
				}

				// Math.round( (total synced / total data) * 100 )
				percentage = Math.round( (factory.sync_collection.stats['total_synced_data'] / factory.sync_collection.stats['total_data']) * 100 );

				factory.sync_collection.stats['sync_percentage_complete'] = percentage;
			},
			calcImportPercentageComplete: function() {
				var percentage = 0;

				if( !factory.sync_collection.stats['total_data'] ) {
					factory.sync_collection.stats['import_percentage_complete'] = percentage;
					return;
				}

				// Math.round( (total imported / total data) * 100 )
				percentage = Math.round( (factory.sync_collection.stats['total_imported'] / factory.sync_collection.stats['total_data']) * 100 );

				factory.sync_collection.stats['import_percentage_complete'] = percentage;
			},
			staging: {
				stage_name: null,
				active_sync: {
					record: null,
					index: null
				},
				project_record: null,
				staged_records: {},
				staged_files: {},
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

					// if( record.hasOwnProperty('imported') && record.imported )
					// {
					// 	factory.sync_collection.incrementStat('total_imported', 1);
					// }

					if( record.hasOwnProperty('imported') && record.imported )
					{
						factory.sync_collection.incrementStat('total_imported', 1);
					}

					if( !record.hasOwnProperty('synced') || !record.synced )
					{
						record.synced = false;
					}

					if( !record.hasOwnProperty('imported') || !record.imported )
					{
						record.imported = false;
					}

					// if( !record.hasOwnProperty('imported') )
					// {
					// 	record.imported = false;
					// }

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
						//FETCH RECORD PRIORITY
						var priority = factory.import_requests.priorities[record_type];

						factory.sync_collection.incrementStat('total_records', 1);

						factory.sync_collection.staging.staged_records[record._id] = {
							record_type: record_type,
							record: record,
							date_record_synced: false,
							attempt_meta: factory.sync_requests.newAttemptMeta(),
							priority: priority
						};

						// record.date_record_synced !== false
						if( record.hasOwnProperty('synced') && record.synced )
						{
							factory.sync_collection.incrementStat('total_synced', 1);
						}
					}

					if( record_type == 'media' )
					{	
						// IF REFERENCE MEDIA, DON'T SYNC
						if( record.hasOwnProperty('reference_media') && record.reference_media == 'Yes' ) {
							console.log("REFERENCE MEDIA - DO NOT SYNC");
							return;
						}

						// IF NO FILE, ADD AS STAGED RECORD WITHOUT FILE
						if( record.file_downloaded != 'Yes' ) {
							factory.sync_collection.incrementStat('total_records', 1);

							factory.sync_collection.staging.staged_records[record._id] = {
								record_type: record_type,
								record: record,
								date_record_synced: false,
								attempt_meta: factory.sync_requests.newAttemptMeta(),
								priority: factory.import_requests.priorities[record_type]
							};

							// record.date_record_synced
							if( record.hasOwnProperty('synced') && record.synced )
							{
								factory.sync_collection.incrementStat('total_synced', 1);
							}

							return;
						}

						// IF RM ID IS SET AND MEDIA RECORD NOT MODIFIED, ADD AS STAGED RECORD WITHOUT FILE
						if( (record.rm_id != null || record.file_download_rm_id != null) && record.record_modified == 'No' )
						{
							factory.sync_collection.incrementStat('total_records', 1);

							factory.sync_collection.staging.staged_records[record._id] = {
								record_type: record_type,
								record: record,
								date_record_synced: false,
								attempt_meta: factory.sync_requests.newAttemptMeta(),
								priority: factory.import_requests.priorities[record_type]
							};

							// record.date_record_synced
							if( record.hasOwnProperty('synced') && record.synced )
							{
								factory.sync_collection.incrementStat('total_synced', 1);
							}

							//EXIT HERE DONT ADD FILE
							return;
						}

						factory.sync_collection.incrementStat('total_files', 1);

						if( record.synced !== false )
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
							date_record_synced: false,
							attempt_meta: factory.sync_requests.newAttemptMeta(),
							priority: factory.import_requests.priorities[record_type]
						};
					}

					// IF RECORD BEING STAGED IS MANAGED RISK - STORE THIS IN SPECIAL PLACE
					if( record_type == 'mr_record' )
					{
						factory.sync_collection.staging.managed_risk = factory.sync_collection.staging.staged_records[record._id];
					}

					//IF RECORD BEING STAGED IS PROJECT - STORE THIS IN SPECIAL PLACE
					if( record_type == 'project' )
					{
						factory.sync_collection.staging.project_record = factory.sync_collection.staging.staged_records[record._id];
					}
				},
				addStagedRecordBulk: function(records, record_type){
					angular.forEach(records, function(record, record_index){
						factory.sync_collection.staging.addStagedRecord(record, record_type);
					});
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
					console.log(factory.sync_collection.staging.active_sync);

					//IF ALREADY SYNCED SKIP TO NEXT RECORD
					// factory.sync_collection.staging.active_sync.record.record.date_record_synced !== false
					if( factory.sync_collection.staging.active_sync.record.record.hasOwnProperty('synced') && factory.sync_collection.staging.active_sync.record.record.synced )
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

					//ADD SYNC FILES
					Object.keys(factory.sync_collection.staging.staged_files).forEach(function(import_key){
						factory.sync_collection.staging.staged_files[import_key].import_key = import_key;
						staged_array.push(factory.sync_collection.staging.staged_files[import_key]);
					});

					//ORDER BY PRIORITY
					staged_array = $filter('orderBy')(staged_array, 'priority');

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
				},
				resetEntireSync: function() {

					// RESET SYNC DATA COLLECTION
					factory.sync_collection.staging.stage_name = null;
					factory.sync_collection.staging.active_sync.record = null;
					factory.sync_collection.staging.active_sync.index = null;
					factory.sync_collection.staging.project_record = null;
					factory.sync_collection.staging.staged_records = {};
					factory.sync_collection.staging.staged_files = {};
					factory.sync_collection.staging.import_staged = {};
					factory.sync_collection.staging.clashing_keys = [];

					// RESET SYNC STATS
					factory.sync_collection.stats.total_records = 0;
					factory.sync_collection.stats.total_synced = 0;
					factory.sync_collection.stats.total_files_synced = 0;
					factory.sync_collection.stats.total_files = 0;
					factory.sync_collection.stats.total_file_size = 0;
					factory.sync_collection.stats.total_staged = 0;
					factory.sync_collection.stats.total_imported = 0;
					factory.sync_collection.stats.total_data = 0;
					factory.sync_collection.stats.total_synced_data = 0;
					factory.sync_collection.stats.total_synced_imported_data = 0;
					factory.sync_collection.stats.total_percentage_complete = 0;
					factory.sync_collection.stats.sync_percentage_complete = 0;
					factory.sync_collection.stats.import_percentage_complete = 0;
				}
			},
			data: {
				project: null,
				assets: null
			}
		};

		factory.syncManagedRisk = function(mr_id)
		{
			var defer = $q.defer();

			factory.sync_collection.staging.resetEntireSync();

			factory.fetchManagedRiskSyncData(mr_id).then(function(){
				defer.resolve(factory.sync_collection.staging.staged_records);
			}, function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetchManagedRiskSyncData = function(mr_id)
		{
			var defer = $q.defer();

			//GET THE MANAGED RISK DATA
			factory.fetchManagedRiskData(mr_id).then(function(){

				console.log(factory.sync_collection.staging.staged_records);

				defer.resolve();
			}, function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetch = {
			managedRiskRecord: function(doc_id){
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.assessments.get(doc_id).then(function(doc) {
					console.log("FETCHED MANAGED RISK FOR SYNC");
					defer.resolve(doc);
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			projectRecord: function(mr_id){
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.projects.find({
					selector: {
						managed_risk_id: mr_id
					}
				}).then(function(result) {
					if( result.docs.length == 0 ) {
						defer.reject("Couldn't find the Managed Risk project");
					} else {
						defer.resolve(result.docs[0]);
					}
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			managedRiskAsset: function(project_id){
				var defer = $q.defer();

				console.log(project_id);

				riskmachDatabasesFactory.databases.collection.assets.find({
					selector: {
						project_id: project_id, 
						is_managed_risk_asset: 'Yes'
					}
				}).then(function(result) {
					if( result.docs.length == 0 ) {
						defer.reject("Couldn't find the Managed Risk asset");
					} else {
						console.log("MANAGED RISK ASSET");
						console.log(result);
						defer.resolve(result.docs[0]);
					}
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			snapshotRecord: function(id){
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.assets.get(doc_id).then(function(doc){
					defer.resolve(doc);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			mediaRecord: function(id){
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.media.get(doc_id).then(function(doc){
					defer.resolve(doc);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			}
		};

		factory.fetchManagedRiskData = function(mr_id){
			var defer = $q.defer();
			var fetch_defer = $q.defer();

			// 'control_item',
			var fetch_stages = ['project','mr_record','mr_asset','snapshot_assets','mr_hazards','mr_controls','hazard_control_relations'];

			var asset_record = null;

			function fetchNextManagedRiskData(mr_id, fetch_stages, current_stage_index, defer)
			{
				if( !fetch_stages.length )
				{
					defer.resolve(asset_record);
					return defer.promise;
				}

				if( current_stage_index > fetch_stages.length - 1 )
				{
					defer.resolve(asset_record);
					return defer.promise;
				}

				var active_stage_name = fetch_stages[current_stage_index];

				if( active_stage_name == 'mr_record' )
				{
					factory.fetch.managedRiskRecord(mr_id).then(function(mr_record){

						factory.sync_collection.staging.addStagedRecord(mr_record, 'mr_record');

						//FETCH NEXT STAGE
						current_stage_index++;
						fetchNextManagedRiskData(mr_id, fetch_stages, current_stage_index, defer);

					}, function(error){
						defer.reject(error);
						return defer.promise;
					});
				}

				//FIND PROJECT RECORD VIA MR ID LOOKUP
				if( active_stage_name == 'project' )
				{
					factory.fetch.projectRecord(mr_id).then(function(project_record){

						factory.sync_collection.staging.addStagedRecord(project_record, 'project');

						//FETCH NEXT STAGE
						current_stage_index++;
						fetchNextManagedRiskData(mr_id, fetch_stages, current_stage_index, defer);

					}, function(error){
						defer.reject(error);
						return defer.promise;
					});
				}

				//FETCH MANAGED RISK SNAPSHOT ASSET
				if( active_stage_name == 'mr_asset' )
				{
					factory.fetch.managedRiskAsset(factory.sync_collection.staging.project_record.record._id).then(function(mr_asset_record){

						asset_record = mr_asset_record;
						factory.sync_collection.staging.addStagedRecord(mr_asset_record, 'asset');

						//FETCH NEXT STAGE
						current_stage_index++;
						fetchNextManagedRiskData(mr_id, fetch_stages, current_stage_index, defer);

					}, function(error){
						defer.reject(error);
						return defer.promise;
					});
				}

				//FETCH ANY OTHER SNAPSHOT ASSET
				if( active_stage_name == 'snapshot_assets' )
				{
					factory.fetchCollection.projectAssets(factory.sync_collection.staging.project_record.record._id).then(function(snapshot_assets){

						factory.sync_collection.staging.addStagedRecordBulk(snapshot_assets, 'record_asset');

						//FETCH NEXT STAGE
						current_stage_index++;
						fetchNextManagedRiskData(mr_id, fetch_stages, current_stage_index, defer);

					}, function(error){
						defer.reject(error);
						return defer.promise;
					});
				}

				//FETCH HAZARDS (INC HAZARD MEDIA)
				if( active_stage_name == 'mr_hazards' )
				{
					factory.fetchCollection.mrHazards(asset_record).then(function(mr_hazards){
						// asset_record.mr_hazards = mr_hazards;
						
						console.log("Fetch Asset Managed Risk Hazards");
						console.log(mr_hazards);

						//FETCH NEXT STAGE
						current_stage_index++;
						fetchNextManagedRiskData(mr_id, fetch_stages, current_stage_index, defer);

					}, function(error){
						defer.reject(error);
						return defer.promise;
					});
				}

				//FETCH CONTROLS (INC CONTROL MEDIA AND VERIFICATION MEDIA)
				if( active_stage_name == 'mr_controls' )
				{
					factory.fetchCollection.mrControls(asset_record).then(function(mr_controls){
						// asset_record.mr_controls = mr_controls;
						
						console.log("Fetch Asset Managed Risk Controls");
						console.log(mr_controls);

						//FETCH NEXT STAGE
						current_stage_index++;
						fetchNextManagedRiskData(mr_id, fetch_stages, current_stage_index, defer);

					}, function(error){
						defer.reject(error);
						return defer.promise;
					});
				}

				//FETCH HAZARD CONTROL RELATIONS
				if( active_stage_name == 'hazard_control_relations' )
				{
					factory.fetchCollection.hazardControlRelations(asset_record).then(function(hazard_control_relations){
						// asset_record.hazard_control_relations = hazard_control_relations;
						
						console.log("Fetch Asset Hazard Control Relations");
						console.log(hazard_control_relations);

						//FETCH NEXT STAGE
						current_stage_index++;
						fetchNextManagedRiskData(mr_id, fetch_stages, current_stage_index, defer);

					}, function(error){
						defer.reject(error);
						return defer.promise;
					});
				}

				return defer.promise;
			}

			fetchNextManagedRiskData(mr_id, fetch_stages, 0, fetch_defer).then(function(asset_record){
				defer.resolve(mr_id);
			}, function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.findRecordMediaSequential = function(record_type, subject_records, current_index, defer)
		{
			//IF NO RECORDS DONT FETCH ANY
			if( subject_records.length == 0 )
			{
				// alert("There are no procedures to fetch");
				defer.resolve(subject_records);
				return defer.promise;
			}

			//IF FETCHED ALL STOP
			if( current_index > subject_records.length - 1 )
			{
				// alert("Fetched All Procedure Data");
				defer.resolve(subject_records);
				return defer.promise;
			}

			factory.fetchCollection.recordMedia(subject_records[current_index]._id, record_type).then(function(media_records){
				var filtered_array = [];

				if( record_type == 'assessment' ) {
					angular.forEach(media_records, function(m_record, m_index) {
						if(m_record.item_not_found == null) {
							filtered_array.push(m_record);
						}
					});
				} else {
					filtered_array = media_records;
				}

				// subject_records[current_index].media_records = media_records;
				factory.sync_collection.staging.addStagedRecordBulk(filtered_array, 'media');
				current_index++;
				factory.findRecordMediaSequential(record_type, subject_records, current_index, defer);
			}, function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetchCollection = {
			projectAssets: function(project_id){
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.assets.find({
					selector: {
						table: 'assets',
						user_id: authFactory.cloudUserId(),
						project_id: project_id,
						is_managed_risk_asset: null
					}
				}).then(function(results){

					var filtered_array = [];

					angular.forEach(results.docs, function(record, index) {
						if( !record.hasOwnProperty('clone_incomplete') || record.clone_incomplete == null ) {
							filtered_array.push(record);
						}
					});

					defer.resolve(filtered_array);
				}).catch(function(error){
					defer.reject(error);
				});
					
				return defer.promise;
			},
			assetControlItems: function(asset_record){
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.mr_controls.find({
					selector: {
						user_id: authFactory.cloudUserId(),
						activity_id: asset_record.project_id,
						asset_id: asset_record._id
					}
				}).then(function(results){
					factory.sync_collection.staging.addStagedRecordBulk(results.docs, 'control_item');

					//GET MR CONTROL MEDIA RECORDS
					var media_defer = $q.defer();

					factory.findRecordMediaSequential('control_item', results.docs, 0, media_defer).then(function(subject_records){
						console.log("Got RA Control Item Media");
						console.log(subject_records);
						defer.resolve(results.docs);
					}, function(error){
						defer.reject();
					});

				}).catch(function(error){
					defer.reject(error);
				});
					
				return defer.promise;
			},
			mrHazards: function(asset_record){
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.mr_hazards.find({
					selector: {
						user_id: authFactory.cloudUserId(),
						activity_id: asset_record.project_id,
						asset_id: asset_record._id
					}
				}).then(function(results){
					factory.sync_collection.staging.addStagedRecordBulk(results.docs, 'mr_hazard');

					//GET MR HAZARD MEDIA RECORDS
					var media_defer = $q.defer();

					factory.findRecordMediaSequential('assessment_hazard', results.docs, 0, media_defer).then(function(subject_records){
						console.log("Got MR Hazard Media");
						console.log(subject_records);
						defer.resolve(results.docs);
					}, function(error){
						defer.reject();
					});

					// defer.resolve(results.docs);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			mrControls: function(asset_record){
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.mr_controls.find({
					selector: {
						user_id: authFactory.cloudUserId(),
						activity_id: asset_record.project_id,
						asset_id: asset_record._id
					}
				}).then(function(results){

					factory.sync_collection.staging.addStagedRecordBulk(results.docs, 'mr_control');

					//GET MR CONTROL MEDIA RECORDS
					var media_defer = $q.defer();

					factory.findRecordMediaSequential('control_item', results.docs, 0, media_defer).then(function(subject_records){
						console.log("Got MR Control Media");
						console.log(subject_records);

						//GET VERIFICATION MEDIA
						factory.findRecordMediaSequential('control_item_verification', results.docs, 0, media_defer).then(function(subject_records){
							console.log("Got MR Verification Control Media");
							console.log(subject_records);
							defer.resolve(results.docs);
						}, function(error){
							defer.reject();
						});

					}, function(error){
						defer.reject();
					});

				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			hazardControlRelations: function(asset_record){
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.hazard_control_relations.find({
					selector: {
						user_id: authFactory.cloudUserId(),
						activity_id: asset_record.project_id,
						asset_id: asset_record._id
					}
				}).then(function(results){
					factory.sync_collection.staging.addStagedRecordBulk(results.docs, 'hazard_control_relation');
					defer.resolve(results.docs);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			recordMedia: function(record_id, record_type){
				var defer = $q.defer();

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
		};

		factory.sync = {
			projectRecord: function(record){

			},
			assetRecord: function(record){

			},
			taskRecord: function(record){

			},
			media_record: function(record){

			}
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
				asset: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncAssetRecord',
				record_asset: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncAssetRecord',
				mr_record: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncAssessmentRecord',
				assessment: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncAssessmentRecord',
				control_item: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncControlItemRecord',
				mr_control: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncControlItemRecord',
				mr_hazard: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncAssessmentHazardRecord',
				hazard_control_relation: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncHazardControlRelation',
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
					staging_record.date_record_synced = new Date().getTime();
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
				staging_record.record.date_record_synced = new Date().getTime();
				staging_record.record.synced = true;

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

				if( staging_record.record_type == 'asset' || staging_record.record_type == 'record_asset' )
				{
					riskmachDatabasesFactory.databases.collection.assets.put(staging_record.record).then(function(up_result){
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);
						console.log("UPDATED SYNC ASSET RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING SYNC ASSET RESULT: " + error);
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'control_item' )
				{
					riskmachDatabasesFactory.databases.collection.mr_controls.put(staging_record.record).then(function(up_result){
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);
						console.log("UPDATED SYNC CONTROL ITEM RECORD RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING CONTROL ITEM RECORD RESULT: " + error);
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'assessment' || staging_record.record_type == 'mr_record' )
				{
					riskmachDatabasesFactory.databases.collection.assessments.put(staging_record.record).then(function(up_result){
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);
						console.log("UPDATED SYNC ASSESSMENT RECORD RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING ASSESSMENT RECORD RESULT: " + error);
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'mr_hazard' )
				{
					riskmachDatabasesFactory.databases.collection.mr_hazards.put(staging_record.record).then(function(up_result){
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);
						console.log("UPDATED SYNC ASSESSMENT HAZARD RECORD RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING ASSESSMENT HAZARD RECORD RESULT: " + error);
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'mr_control' )
				{
					riskmachDatabasesFactory.databases.collection.mr_controls.put(staging_record.record).then(function(up_result){
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);
						console.log("UPDATED SYNC MR CONTROL RECORD RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING MR CONTROL RECORD RESULT: " + error);
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'hazard_control_relation' )
				{
					riskmachDatabasesFactory.databases.collection.hazard_control_relations.put(staging_record.record).then(function(up_result){
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);
						console.log("UPDATED SYNC HAZARD CONTROL RELATION RECORD RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING HAZARD CONTROL RELATION RECORD RESULT: " + error);
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
				mr_record: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportManagedRiskRecord',
				project: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportProjectRecord',
				asset: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportAssetRecord',
				record_asset: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportAssetRecord',
				assessment: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportAssessmentRecord',
				mr_control: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportControlItemRecord',
				mr_hazard: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportHazardRecord',
				hazard_control_relation: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportHazardControlRelation',
				media: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportMediaRecord'
			},
			priorities: {
				mr_record: 0,
				// project: 1,
				asset: 1,
				assessment: 2,
				mr_control: 3,
				mr_hazard: 4,
				record_asset: 5,
				hazard_control_relation: 6,
				media: 7
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
					staging_record.record.date_record_imported = new Date().getTime();
					staging_record.record.imported = true;
					//INCREMENT SYNCED
					factory.sync_collection.incrementStat('total_imported', 1);
					defer.resolve();
				}, function(error){
					defer.reject(error);
				});

				function importRecord(staging_record, defer){

					if( staging_record.record_type == 'project' ) {
						factory.import_requests.saveImportResult(staging_record, {}).then(function(up_result){
							defer.resolve({});
						}, function(error){
							defer.reject(error);
						});

						return defer.promise;
					}

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
			saveImportResult: function(staging_record, result){
				var defer = $q.defer();

				// staging_record.record.rm_id = result.rm_id;
				// staging_record.record.rm_id = result.rm_ref;
				// staging_record.record.rm_record = result.rm_record;
				// staging_record.record.date_record_imported = Date.now();

				staging_record.record.imported = true;

				if( staging_record.record_type == 'project' )
				{
					factory.dbUtils.project.saveProjectImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'asset' || staging_record.record_type == 'record_asset' )
				{
					factory.dbUtils.snapshot_asset.saveAssetImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'assessment' || staging_record.record_type == 'mr_record' )
				{
					factory.dbUtils.assessment.saveRiskAssessmentImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'control_item' )
				{
					factory.dbUtils.mr_control.saveMrControlImportResult(staging_record.record, result).then(function() {
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
				
				if( staging_record.record_type == 'mr_hazard' )
				{
					factory.dbUtils.mr_hazard.saveMrHazardImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'mr_control' )
				{
					factory.dbUtils.mr_control.saveMrControlImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'hazard_control_relation' )
				{
					factory.dbUtils.hazard_control_relation.saveHazardControlRelationImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;
			},
			createAuditForMrHazard: function(mid_mr_id, staging_record) {
				var defer = $q.defer();
				var sync_defer = $q.defer();

				if( !staging_record.record.hasOwnProperty('imported') || !staging_record.record.imported )
				{
					defer.reject("The hazard record has not yet been imported!");
					return defer.promise;
				}

				importRecord(staging_record, sync_defer).then(function(sync_result){
					staging_record.record.created_audit_assessment = true;
					staging_record.record._id = sync_result._id;
					staging_record.record._rev = sync_result._rev;
					defer.resolve();
				}, function(error){
					defer.reject(error);
				});

				function importRecord(staging_record, defer){

					var endpoint = 'https://system.riskmach.co.uk/laravel/public/webapp/v1/CreateNewManagedRiskAuditAssessment';

					if( staging_record.attempt_meta.num_attempts > staging_record.attempt_meta.attempt_limit )
					{
						defer.reject("Error creating Managed Risk Audit Assessment [attempt limit exceed]: " + staging_record.attempt_meta.last_error);
						return defer.promise;
					}

					$http.get(endpoint,{
		            	params: {
		            		mid_mr_id: mid_mr_id,
		            		mid_hazard_id: staging_record.record.mid_record_id,
		            		// token: authFactory.getLoginToken()
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
							// UPDATE IMPORT VALUES
							staging_record.record.created_audit_assessment = true;

							riskmachDatabasesFactory.databases.collection.mr_hazards.put(staging_record.record).then(function(up_result){
								staging_record.record._id = up_result.id;
								staging_record.record._rev = up_result.rev;
								defer.resolve(staging_record.record);
								console.log("UPDATED IMPORT HAZARD CREATE MR AUDIT ASSESSMENT RESULT");
							}).catch(function(error){
								console.log("ERROR UPDATING IMPORT HAZARD CREATE MR AUDIT ASSESSMENT RESULT: " + error);
								defer.reject(error);
							});
						}
		            })
		            .error(function(data, status, headers, config) {
		            	//TRY AGAIN
		            	staging_record.attempt_meta.num_attempts++;
		            	staging_record.attempt_meta.last_error = "Error connecting to create Managed Risk Audit Assessment endpoint";
		            	importRecord(staging_record, defer);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			verifyImportComplete: function(project_record, total_app_records){
				var defer = $q.defer();
				var verify_defer = $q.defer();

				if( !project_record.hasOwnProperty('date_record_synced') || !project_record.date_record_synced )
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
			finaliseImportComplete: function(mr_record){
				var defer = $q.defer();
				var request_defer = $q.defer();

				var attempt_meta = {
					num_attempts: 0,
					attempt_limit: 3,
					last_error: null
				};

				doFinaliseImport(mr_record, attempt_meta, defer).then(function(result){
					defer.resolve();
				}, function(error){
					defer.reject(error);
				});

				function doFinaliseImport(mr_record, attempt_meta, defer){

					if( attempt_meta.num_attempts > attempt_meta.attempt_limit )
					{
						defer.reject(attempt_meta.last_error);
						return defer.promise;
					}

					$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/FinaliseManagedRiskImport',{
		            	params: {
		            		mid_record_id: mr_record.mid_record_id
		            	}
		            })
					.success(function(data, status, headers, config) {

						if( data.error == true )
						{
							//TRY AGAIN
							attempt_meta.num_attempts++;
							attempt_meta.last_error = data.error_messages[0];
		            		doFinaliseImport(mr_record, attempt_meta, defer);
						}
						else
						{
							//SAVE VERIFICATION RESULT
							console.log("MANAGED RISK FINALISED SUCCESSFUL");
							console.log(mr_record);

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
		            	attempt_meta.last_error = "Error finalising import complete (id: "+ mr_record.mid_record_id +")";
		            	doFinaliseImport(mr_record, attempt_meta, defer);
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

			var next_index = 0;

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

					next_index++;

					// MARKED ALL STAGED RECORDS CONTENTS SYNCED
					if( next_index > max_index ) {
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
			markStagedRecordContentsSynced: function(staging_record){
				var defer = $q.defer();

				var db = null;

				if( staging_record.record_type == 'project' ) {
					db = riskmachDatabasesFactory.databases.collection.projects;
				}

				if( staging_record.record_type == 'asset' || staging_record.record_type == 'record_asset' ) {
					db = riskmachDatabasesFactory.databases.collection.assets;
				}

				if( staging_record.record_type == 'control_item' ) {
					db = riskmachDatabasesFactory.databases.collection.mr_controls;
				}

				if( staging_record.record_type == 'assessment' || staging_record.record_type == 'mr_record' ) {
					db = riskmachDatabasesFactory.databases.collection.assessments;
				}

				if( staging_record.record_type == 'media' ) {
					db = riskmachDatabasesFactory.databases.collection.media;
				}
				
				if( staging_record.record_type == 'mr_hazard' ) {
					db = riskmachDatabasesFactory.databases.collection.mr_hazards;
				}

				if( staging_record.record_type == 'mr_control' ) {
					db = riskmachDatabasesFactory.databases.collection.mr_controls;
				}

				if( staging_record.record_type == 'hazard_control_relation' ) {
					db = riskmachDatabasesFactory.databases.collection.hazard_control_relations;
				}

				staging_record.record.date_content_synced = new Date().getTime();

				console.log( staging_record.record_type );
				console.log( staging_record.record );

				db.put(staging_record.record).then(function(result) {
					staging_record.record._id = result.id;
					staging_record.record._rev = result.rev;

					console.log("MARKED " + staging_record.record_type + " SYNC COMPLETED");

					defer.resolve(staging_record);

				}, function(error) {
					console.log("ERROR MARKING " + staging_record.record_type + " SYNC COMPLETED");
					defer.reject(error);
				});

				return defer.promise;
			}, 
			markStagedRecordContentsImported: function(staging_record) {
				var defer = $q.defer();

				var db = null;

				if( staging_record.record_type == 'project' ) {
					db = riskmachDatabasesFactory.databases.collection.projects;

					staging_record.record.import_finalised = new Date().getTime();
				}

				if( staging_record.record_type == 'asset' || staging_record.record_type == 'record_asset' ) {
					db = riskmachDatabasesFactory.databases.collection.assets;
				}

				if( staging_record.record_type == 'mr_record' || staging_record.record_type == 'assessment' ) {
					db = riskmachDatabasesFactory.databases.collection.assessments;
				}

				if( staging_record.record_type == 'control_item' ) {
					db = riskmachDatabasesFactory.databases.collection.mr_controls;
				}

				if( staging_record.record_type == 'media' ) {
					db = riskmachDatabasesFactory.databases.collection.media;
				}
				
				if( staging_record.record_type == 'mr_hazard' ) {
					db = riskmachDatabasesFactory.databases.collection.mr_hazards;
				}

				if( staging_record.record_type == 'mr_control' ) {
					db = riskmachDatabasesFactory.databases.collection.mr_controls;
				}

				if( staging_record.record_type == 'hazard_control_relation' ) {
					db = riskmachDatabasesFactory.databases.collection.hazard_control_relations;
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

					console.log( JSON.stringify(result, null, 2) );
					// alert("Project import result");

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// PROJECTS ARE NOT ACTUALLY IMPORTED IN MANAGED RISK
					// SO JUST MARK THE RECORD AS IMPORTED WITHOUT SETTING RMIDs ETC.
					riskmachDatabasesFactory.databases.collection.projects.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);

						console.log("UPDATED IMPORT PROJECT RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT PROJECT RESULT: " + error);
						defer.reject(error);
					});

					// IF NO RESULT, DELETE
					// if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
					// 	record.status = 2;

					// 	riskmachDatabasesFactory.databases.collection.projects.put(record).then(function(up_result){
					// 		record._id = up_result.id;
					// 		record._rev = up_result.rev;
					// 		defer.resolve(record);

					// 		console.log("UPDATED IMPORT PROJECT RESULT");
					// 	}).catch(function(error){
					// 		console.log("ERROR UPDATING IMPORT PROJECT RESULT: " + error);
					// 		defer.reject(error);
					// 	});

					// 	return defer.promise;
					// }

					// // UPDATE RM VALUES
					// record.rm_id = parseInt(result.rm_record.ActivityID);

					// // SET RM RECORD
					// record.rm_record = null;
					// var rm_record = angular.copy(record);
					// record.rm_record = rm_record;

					// factory.sync_collection.staging.project_record.record.rm_id = result.rm_id;
					// factory.sync_collection.staging.project_record.record.rm_ref = result.rm_ref;
					// factory.sync_collection.staging.project_record.record.rm_record = result.rm_record;

					// riskmachDatabasesFactory.databases.collection.projects.put(record).then(function(up_result){
					// 	record._id = up_result.id;
					// 	record._rev = up_result.rev;
					// 	defer.resolve(record);

					// 	console.log("UPDATED IMPORT PROJECT RESULT");
					// }).catch(function(error){
					// 	console.log("ERROR UPDATING IMPORT PROJECT RESULT: " + error);
					// 	defer.reject(error);
					// });

					return defer.promise;
				}
			},
			snapshot_asset: {
				saveAssetImportResult: function(record, result) {
					var defer = $q.defer();

					console.log( JSON.stringify(result, null, 2) );
					// alert("Asset import result");

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.status = 2;

						riskmachDatabasesFactory.databases.collection.assets.put(record).then(function(up_result){
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
					record.rm_id = parseInt(result.rm_record.AssetID);

					if( result.rm_record.RecordID == '0' || result.rm_record.RecordID == 0 ) {
						record.rm_record_id = null;
					} else {
						record.rm_record_id = parseInt(result.rm_record.RecordID);
					}

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.assets.put(record).then(function(up_result){
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
			},
			assessment: {
				saveRiskAssessmentImportResult: function(record, result) {
					var defer = $q.defer();

					console.log( JSON.stringify(result, null, 2) );
					// alert("Assessment import result");

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.status = 8;

						riskmachDatabasesFactory.databases.collection.assessments.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);
							console.log("UPDATED IMPORT ASSESSMENT RESULT");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT ASSESSMENT RESULT: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE LOCAL VALUES
					record.rm_id = parseInt(result.rm_record.AssessmentID);
					record.rm_ref = parseInt(result.rm_record.Ref);
					record.rm_revision_number = parseInt(result.rm_record.RevisionNumber);
					record.rm_activity_id = parseInt(result.rm_record.ActivityID);
					record.rm_asset_id = parseInt(result.rm_record.AssetID);

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.assessments.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT ASSESSMENT RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT ASSESSMENT RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			mr_hazard: {
				saveMrHazardImportResult: function(record, result) {
					var defer = $q.defer();

					console.log( JSON.stringify(result, null, 2) );
					// alert("Hazard import result");

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.status = 2;

						riskmachDatabasesFactory.databases.collection.mr_hazards.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);
							console.log("UPDATED IMPORT HAZARD RESULT");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT HAZARD RESULT: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE LOCAL VALUES
					record.rm_id = parseInt(result.rm_record.HazardID);
					record.rm_ref = parseInt(result.rm_record.HazardRef);
					record.revision_number = parseInt(result.rm_record.RevisionNumber);
					record.rm_activity_id = parseInt(result.rm_record.ActivityID);
					record.rm_asset_id = parseInt(result.rm_record.AssetID);
					record.rm_task_id = parseInt(result.rm_record.TaskID);
					record.rm_task_ref = parseInt(result.rm_record.TaskRef);

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.mr_hazards.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT HAZARD RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT HAZARD RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			mr_control: {
				saveMrControlImportResult: function(record, result) {
					var defer = $q.defer();

					console.log( JSON.stringify(result, null, 2) );
					// alert("Control import result");

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.status = 4;

						riskmachDatabasesFactory.databases.collection.mr_controls.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);
							console.log("UPDATED IMPORT CONTROL RESULT");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT CONTROL RESULT: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE LOCAL VALUES
					record.rm_id = parseInt(result.rm_record.ID);
					record.rm_ref = parseInt(result.rm_record.Ref);
					record.revision_number = parseInt(result.rm_record.RevisionNumber);
					record.rm_asset_id = parseInt(result.rm_record.AssetID);
					record.rm_record_asset_id = parseInt(result.rm_record.RecordAssetID);

					if( result.rm_record.TaskID != null && result.rm_record.TaskID != '' && result.rm_record.TaskID != 0 ) {
						record.rm_task_id = parseInt(result.rm_record.TaskID);
					}

					if( result.rm_record.TaskRef != null && result.rm_record.TaskRef != '' && result.rm_record.TaskRef != 0 ) {
						record.rm_task_ref = parseInt(result.rm_record.TaskRef);
					}

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.mr_controls.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT CONTROL RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT CONTROL RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			hazard_control_relation: {
				saveHazardControlRelationImportResult: function(record, result) {
					var defer = $q.defer();

					console.log( JSON.stringify(result, null, 2) );
					// alert("Hazard control relation import result");

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.status = 2;

						riskmachDatabasesFactory.databases.collection.hazard_control_relations.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);
							console.log("UPDATED IMPORT HAZARD CONTROL RELATION RESULT");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT HAZARD CONTROL RELATION RESULT: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE LOCAL VALUES
					record.rm_id = parseInt(result.rm_record.ID);
					record.rm_hazard_id = parseInt(result.rm_record.HazardID);
					record.rm_hazard_ref = parseInt(result.hazard_ref);
					record.rm_control_item_id = parseInt(result.rm_record.ControlItemID);
					record.rm_control_item_ref = parseInt(result.control_ref);

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.hazard_control_relations.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT HAZARD CONTROL RELATION RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT HAZARD CONTROL RELATION RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			media: {
				saveMediaImportResult: function(record, result) {
					var defer = $q.defer();

					// console.log( JSON.stringify(result, null, 2) );
					// alert("Media import result");

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
					record.rm_id = parseInt(result.rm_record.ID);
					record.rm_ref = parseInt(result.rm_record.Ref);
					record.rm_revision_number = parseInt(result.rm_record.RevisionNumber);
					record.rm_record_item_id = parseInt(result.rm_record.RecordItemID);
					record.rm_record_item_ref = parseInt(result.rm_record.RecordItemRef);
					record.file_size = result.rm_record.filesize;
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
		};

		factory.utils = {
			findStagedImportRecords: function(record_type) {
				var found_records = [];

				Object.keys(factory.sync_collection.staging.import_staged).forEach(function(current_key){

					if( factory.sync_collection.staging.import_staged[current_key].record_type == record_type ) {
						found_records.push(factory.sync_collection.staging.import_staged[current_key]);
					}

				});

				return found_records;
			}
		}

		factory.import_processors = {
			createAuditsForMrHazards: function() {
				var defer = $q.defer();
				var sync_defer = $q.defer();

				//FIND STAGED HAZARD RECORDS
				var hazards = factory.utils.findStagedImportRecords('mr_hazard');

				//LOOP THROUGH PROCESS FOR HAZARDS
				factory.import_processors.createAuditForNextMrHazardRecord(sync_defer, hazards, 0).then(function(){
					defer.resolve();
				}, function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			createAuditForNextMrHazardRecord: function(defer, hazards, active_index) {

				if( active_index > hazards.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				var active_hazard = hazards[active_index];

				console.log("ACTIVE HAZARD");
				console.log(active_hazard);

				//IF ALREADY RUN PROCESS, SKIP TO NEXT HAZARD
				if( active_hazard.record.hasOwnProperty('created_audit_assessment') && active_hazard.record.created_audit_assessment )
				{
					active_index++;

					//ATTEMPT THE NEXT RECORD
					factory.import_processors.createAuditForNextMrHazardRecord(defer, hazards, active_index);
				}
				else
				{
					//PERFORM THE IMPORT
					factory.import_requests.createAuditForMrHazard(factory.sync_collection.staging.managed_risk.record.mid_record_id, active_hazard).then(function(sync_result){

						active_index++;

						//ATTEMPT THE NEXT RECORD
						factory.import_processors.createAuditForNextMrHazardRecord(defer, hazards, active_index);

					}, function(error){
						defer.reject(error);
					});
				}

				return defer.promise;
			}
		};

		//MAKE SURE ALL DATABASES ARE INITIALISED
		riskmachDatabasesFactory.databases.initAll();

		return factory;
	}

})();