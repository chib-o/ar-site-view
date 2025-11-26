(function(){

	var app = angular.module('riskmachSync', ['angular-jwt','riskmachUtils','riskmachDatabases']);
	app.factory('riskmachSyncFactory', riskmachSyncFactory);

	function riskmachSyncFactory($q, $http, $filter, $timeout, riskmachDatabasesFactory, authFactory, rmUtilsFactory)
	{
		var factory = {};

		factory.pre_sync_checks = {
			data: {
				error: false,
				stages: [{
					name: 'incomplete_re_inspections', 
					skip: false,
					error: false,
					error_message: null, 
					resolve_message: null
				},{
					name: 'basic_obs_snapshots',
					skip: false,
					error: false, 
					error_message: null, 
					resolve_message: null
				},{
					name: 'draft_risk_assessments',
					skip: false,
					error: false,
					error_message: null,
					resolve_message: null
				}]
			},
			resetData: function() {
				factory.pre_sync_checks.resetErrors();

				var i = 0;
				var len = factory.pre_sync_checks.data.stages.length;

				while(i < len) {
					factory.pre_sync_checks.data.stages[i].skip = false;

					i++;
				}
			},
			resetErrors: function() {
				factory.pre_sync_checks.data.error = false;

				var i = 0;
				var len = factory.pre_sync_checks.data.stages.length;

				while(i < len) {
					factory.pre_sync_checks.data.stages[i].error = false;
					factory.pre_sync_checks.data.stages[i].error_message = null;
					factory.pre_sync_checks.data.stages[i].resolve_message = null;

					i++;
				}
			},
			skipStage: function(stage_name) {
				var i = 0;
				var len = factory.pre_sync_checks.data.stages.length;

				while(i < len) {
					if( factory.pre_sync_checks.data.stages[i].name == stage_name ) {
						factory.pre_sync_checks.data.stages[i].skip = true;
					} 

					i++;
				}
			}
		}

		factory.sync_collection = {
			stats: {
				total_records: 0,
				total_qc_records: 0,
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

					if( stat == 'total_records' || stat == 'total_files' || stat == 'total_qc_records' ) {
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
			decrementStat: function(stat, value) {
				$timeout(function() {
					console.log("Decrement Stat ["+ stat +"] by ["+ value +"]");
					factory.sync_collection.stats[stat] = factory.sync_collection.stats[stat] - value;

					if( stat == 'total_records' || stat == 'total_files' || stat == 'total_qc_records' ) {
						factory.sync_collection.stats['total_data']--;
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
				staged_ids: {},
				import_staged: {},
				clashing_keys: [],
				uaudit_instance_media: {},
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

					// IF RECORD NOT MODIFIED & NO MID RECORD ID, DON'T ADD TO SYNC
					// if( record.hasOwnProperty('record_modified') && record.record_modified != 'Yes' && (!record.hasOwnProperty(mid_record_id) || !record.mid_record_id) ) {
					// 	return;
					// }

					// if( record.hasOwnProperty('imported') && record.imported )
					// {
					// 	factory.sync_collection.incrementStat('total_imported', 1);
					// }


					// DON'T SYNC IMPORTED DATA IF NOT FULL DATA SYNC AND NOT PROJECT RECORD
					if( !factory.utils.full_data_sync && record_type != 'project' && factory.utils.isRecordImported(record) ) {
						return;
					}

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
						//IF A RECORD ASSET FETCH THE PRIORITY
						if( record_type == 'asset' && record.record_type == 'task')
						{
							var priority = factory.import_requests.priorities['task_asset'];
						}
						else if( record_type == 'asset' && record.record_type == 'control_item')
						{
							var priority = factory.import_requests.priorities['control_item_asset'];
						}
						else if( record_type == 'asset' && record.record_type == 'contractor')
						{
							var priority = factory.import_requests.priorities['contractor_asset'];
						}
						else if( record_type == 'asset' && record.record_type == 'permit')
						{
							var priority = factory.import_requests.priorities['permit_asset'];
						}
						//FETCH PRIORITY BY TASK TYPE
						else if( record_type == 'task' )
						{
							var priority = factory.import_requests.priorities[ record.task_type ];
						}
						//CATCH ALL OTHERS WITH DIRECT LOOKUP
						else
						{
							var priority = factory.import_requests.priorities[record_type];
						}

						factory.sync_collection.incrementStat('total_records', 1);

						if( record_type == 'qc_check_record' ) {
							factory.sync_collection.incrementStat('total_qc_records', 1);
						}

						factory.sync_collection.staging.staged_records[record._id] = {
							record_type: record_type,
							record: record,
							date_record_synced: false,
							attempt_meta: factory.sync_requests.newAttemptMeta(),
							priority: priority
						};

						// UAUDIT INSTANCE MEDIA ID COLLECTION
						if( record_type == 'checklist_instance' && record.hasOwnProperty('is_uaudit') && record.is_uaudit == 'Yes' ) {
							factory.sync_collection.staging.uaudit_instance_media[record._id] = [];
						}

						// record.date_record_synced !== false
						if( record.hasOwnProperty('synced') && record.synced )
						{
							factory.sync_collection.incrementStat('total_synced', 1);
						}

						// if( record_type == 'checklist_question_record' )
						// {
						// 	console.log("STAGED checklist_question_record");
						// 	console.log(factory.sync_collection.staging.staged_records[record._id]);
						// }

						// if( record_type == 'mr_control' )
						// {
						// 	console.log("STAGED mr_control");
						// 	console.log(factory.sync_collection.staging.staged_records[record._id]);
						// }
					}

					if( record_type == 'media' )
					{
						// IF NO FILE, ADD AS STAGED RECORD WITHOUT FILE
						if( record.file_downloaded != 'Yes' || (record.hasOwnProperty('file_does_not_exist') && record.file_does_not_exist) ) {
							factory.sync_collection.incrementStat('total_records', 1);

							factory.sync_collection.staging.staged_records[record._id] = {
								record_type: record_type,
								record: record,
								date_record_synced: false,
								attempt_meta: factory.sync_requests.newAttemptMeta(),
								priority: factory.import_requests.priorities[record_type]
							};

							if( record.hasOwnProperty('is_uaudit') && record.is_uaudit == 'Yes' ) {
								factory.sync_collection.staging.addUAuditMediaToUAuditInstanceCollection(record);
							}

							// record.date_record_synced
							if( record.hasOwnProperty('synced') && record.synced )
							{
								factory.sync_collection.incrementStat('total_synced', 1);
							}

							return;
						}

						// IF RM ID IS SET AND MEDIA RECORD NOT MODIFIED, ADD AS STAGED RECORD WITHOUT FILE
						if( (record.rm_id != null || record.file_download_rm_id != null) && record.record_modified == 'No' ) {
							factory.sync_collection.incrementStat('total_records', 1);

							factory.sync_collection.staging.staged_records[record._id] = {
								record_type: record_type,
								record: record,
								date_record_synced: false,
								attempt_meta: factory.sync_requests.newAttemptMeta(),
								priority: factory.import_requests.priorities[record_type]
							};

							if( record.hasOwnProperty('is_uaudit') && record.is_uaudit == 'Yes' ) {
								factory.sync_collection.staging.addUAuditMediaToUAuditInstanceCollection(record);
							}

							// record.date_record_synced
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

						if( record.hasOwnProperty('is_uaudit') && record.is_uaudit == 'Yes' ) {
							factory.sync_collection.staging.addUAuditMediaToUAuditInstanceCollection(record);
						}
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
				removeStagedFile: function(record_id) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.media;
					var data = {
						file_size: null
					}

					db.get(record_id, {attachments: true}).then(function(doc) {

						if( doc.hasOwnProperty('_attachments') && doc._attachments.length ) {
							data.file_size = doc._attachments[0].length;
						}

						doc.removed_from_sync = true;

						db.put(doc).then(function(result) {
							
							var staged_id_index = factory.sync_collection.staging.staged_ids['media'].indexOf(record_id);

							if( staged_id_index !== -1 ) {
								factory.sync_collection.staging.staged_ids['media'].splice(staged_id_index, 1);
							}

							delete factory.sync_collection.staging.staged_files[record_id];

							// DECREMENT NUMBER OF STAGED FILES
							factory.sync_collection.decrementStat('total_files', 1);

							if( data.file_size ) {
								factory.sync_collection.incrementStat('total_file_size', data.file_size);
							}

							defer.resolve();

						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				addStagedRecordBulk: function(records, record_type){
					// angular.forEach(records, function(record, record_index){
					// 	factory.sync_collection.staging.addStagedRecord(record, record_type);
					// });

					var i = 0;
					var len = records.length;

					while(i < len) {
						factory.sync_collection.staging.addStagedRecord(records[i], record_type);
						i++;
					}
				},
				stageUAuditQuestionUuids: function(questions) {

					if( !questions ) {
						return;
					}

					var i = 0;
					var len = questions.length;

					while(i < len) {

						factory.sync_collection.staging.addUAuditQuestionUuidToStagedIds(questions[i]);

						i++;
					}
				},
				addUAuditQuestionUuidToStagedIds: function(question_record) {
					// STORE ID FOR LOOKUPS
					if( factory.sync_collection.staging.staged_ids.hasOwnProperty('checklist_question_record') ) {
						factory.sync_collection.staging.staged_ids['checklist_question_record'].push(question_record.question_record_id);
					} else {
						factory.sync_collection.staging.staged_ids['checklist_question_record'] = [];
						factory.sync_collection.staging.staged_ids['checklist_question_record'].push(question_record.question_record_id);
					}
				},
				addUAuditMediaToUAuditInstanceCollection: function(media_record) {

					// FIND CHECKLIST INSTANCE
					if( factory.sync_collection.staging.uaudit_instance_media.hasOwnProperty(media_record.checklist_instance_id) ) {
						// ADD MEDIA ID TO COLLECTION
						factory.sync_collection.staging.uaudit_instance_media[media_record.checklist_instance_id].push(media_record._id);
					}

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

					factory.sync_collection.incrementStat('total_considered_sync', 1);

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

							factory.sync_collection.incrementStat('total_syncs_ran', 1);

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

					factory.sync_collection.incrementStat('total_considered_import', 1);

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

							factory.sync_collection.incrementStat('total_imports_ran', 1);

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
			},
			data: {
				project: null,
				assets: null
			},
			resetEntireSync: function() {

				// RESET SYNC DATA COLLECTION
				factory.sync_collection.staging.stage_name = null;
				factory.sync_collection.staging.active_sync.record = null;
				factory.sync_collection.staging.active_sync.index = null;
				factory.sync_collection.staging.project_record = null;
				factory.sync_collection.staging.staged_records = {};
				factory.sync_collection.staging.staged_files = {};
				factory.sync_collection.staging.staged_ids = {};
				factory.sync_collection.staging.clashing_keys = [];
				factory.sync_collection.staging.uaudit_instance_media = {};

				// RESET STATS
				factory.sync_collection.stats.total_records = 0;
				factory.sync_collection.stats.total_qc_records = 0;
				factory.sync_collection.stats.total_synced = 0;
				factory.sync_collection.stats.total_files = 0;
				factory.sync_collection.stats.total_file_size = 0;
				factory.sync_collection.stats.total_staged = 0;
				factory.sync_collection.stats.total_files_synced = 0;
				factory.sync_collection.stats.total_imported = 0;

				factory.sync_collection.stats.total_data = 0;
				factory.sync_collection.stats.total_synced_imported_data = 0;
				factory.sync_collection.stats.total_percentage_complete = 0;
				factory.sync_collection.stats.total_synced_data = 0;
				factory.sync_collection.stats.sync_percentage_complete = 0;
				factory.sync_collection.stats.import_percentage_complete = 0;

				factory.sync_collection.stats.total_considered_sync = 0;
				factory.sync_collection.stats.total_syncs_ran = 0;
				factory.sync_collection.stats.total_considered_import = 0;
				factory.sync_collection.stats.total_imports_ran = 0;
			},
		};

		factory.pre_sync_formatting = {
			applicable_record_types: ['checklist_instance'],
			preFormatSyncRecord: function(staging_record) {
				var defer = $q.defer();

				// IF NOT APPLICABLE FOR STAGED RECORD TYPE
				if( factory.pre_sync_formatting.applicable_record_types.indexOf(staging_record.record_type) === -1 ) {
					defer.resolve();
					return defer.promise;
				}

				if( staging_record.record_type == 'checklist_instance' ) {
					factory.pre_sync_formatting.checklist_instance.checklistInstanceFormatting(staging_record.record).then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;
			},
			checklist_instance: {
				checklistInstanceFormatting: function(record) {
					var defer = $q.defer();
					var stage_defer = $q.defer();

					var stages = ['uaudit_json'];

					formatNextStage(stage_defer, 0).then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					function formatNextStage(defer, active_index) {

						if( active_index > stages.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						if( stages[active_index] == 'uaudit_json' ) {

							// SKIP IF NOT UAUDIT CHECKLIST
							if( !record.hasOwnProperty('is_uaudit') || record.is_uaudit != 'Yes' ) {
								active_index++;
								formatNextStage(defer, active_index);
							} else {

								// DECORATE INSTANCE RECORD WITH UAUDIT JSON DATA
								factory.fetchCollection.uAuditJsonRecord(record.checklist_instance_json_id).then(function(instance_json_record) {

									console.log("FETCHED UAUDIT JSON RECORD");
									console.log(instance_json_record);

									var uaudit_data = JSON.parse(instance_json_record.uaudit_instance_data);
									var questions = uaudit_data.questions.collection;

									// ADD QUESTION UUIDS TO STAGED IDS
									factory.sync_collection.staging.stageUAuditQuestionUuids(questions);

									record.uaudit_instance_data = instance_json_record.uaudit_instance_data;

									active_index++;

									formatNextStage(defer, active_index);

								}, function(error) {
									defer.reject(error);
								});

							}

						}

						return defer.promise;
					}

					return defer.promise;
				}
			}
		}

		factory.syncProject = function(project_id, asset_id)
		{
			var defer = $q.defer();

			factory.sync_collection.resetEntireSync();

			factory.fetchProjectSyncData(project_id).then(function(){
				defer.resolve(factory.sync_collection.staging.staged_records);
			}, function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetchProjectSyncData = function(project_id)
		{
			var defer = $q.defer();

			var sync_data = {
				project: null,
				assets: null
			};

			// GET PROJECT RECORD
			factory.fetch.projectRecord(project_id).then(function(project_record){
				sync_data.project = project_record;
				factory.sync_collection.staging.addStagedRecord(project_record, 'project');

				// FETCH THE PROJECT ASSETS
				factory.fetchCollection.projectAssets(project_id).then(function(assets){
					sync_data.assets = assets;
					factory.sync_collection.staging.addStagedRecordBulk(assets, 'asset');

					// FETCH PROJECT QUALITY CHECK DATA
					factory.fetchCollection.qcCheckRecords(project_record).then(function(qc_check_records) {
						sync_data.qc_check_records = qc_check_records;
						factory.sync_collection.staging.addStagedRecordBulk(qc_check_records, 'qc_check_record');

						// FOR EACH ASSET, FETCH CHILD DATA
						factory.fetchAllAssetsData(assets).then(function(assets){
							sync_data.assets = assets;
							factory.sync_collection.data = sync_data;
							console.log("Fetched Assets");
							// console.log(assets);

							defer.resolve();
						});

					}, function(error) {
						defer.reject(error);
					});

				}, function(error){
					defer.reject("Error fetching project assets: " + error);
				});

			}, function(error){
				defer.reject("Error fetching project record: " + error);
			});

			return defer.promise;
		}

		factory.fetch = {
			projectRecord: function(doc_id){
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.projects.get(doc_id).then(function(doc){
					defer.resolve(doc);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			assetRecord: function(id){
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.assets.get(doc_id).then(function(doc){
					defer.resolve(doc);
				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			taskRecord: function(id){
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

		factory.fetchAllAssetsData = function(){
			var defer = $q.defer();
			var fetch_defer = $q.defer();

			// 'control_item',
			// 'contractors','permits'
			var fetch_stages = ['asset_media','procedures','checklists','assessments','ra_control_item_relations','mr_hazards','mr_controls','hazard_control_relations'];

			function fetchNextAssetData(fetch_stages, current_stage_index, defer)
			{
				if( !fetch_stages.length )
				{
					defer.resolve();
					return defer.promise;
				}

				if( current_stage_index > fetch_stages.length - 1 )
				{
					defer.resolve();
					return defer.promise;
				}

				var active_stage_name = fetch_stages[current_stage_index];

				if( active_stage_name == 'asset_media' )
				{
					factory.fetchCollection.recordMedia('asset', 'asset').then(function(media_records){

						console.log("Fetched Asset Media Records");
						console.log(media_records);
						
						//FETCH NEXT STAGE
						current_stage_index++;
						fetchNextAssetData(fetch_stages, current_stage_index, defer);

					}, function(error){
						defer.reject(error);
					});
				}

				if( active_stage_name == 'procedures' )
				{
					factory.fetchAssetProcedureData().then(function(procedures){
						console.log("Fetched Assets Procedures");

						//FETCH NEXT STAGE
						current_stage_index++;
						fetchNextAssetData(fetch_stages, current_stage_index, defer);

					}, function(error){
						defer.reject(error);
						return defer.promise;
					});
				}

				if( active_stage_name == 'contractors' )
				{
					factory.fetchCollection.projectContractors().then(function(contractors){

						console.log("Fetched contractors");
						console.log(contractors);

						//FETCH NEXT STAGE
						current_stage_index++;
						fetchNextAssetData(fetch_stages, current_stage_index, defer);

					}, function(error){
						defer.reject(error);
						return defer.promise;
					});
				}

				if( active_stage_name == 'permits' )
				{
					factory.fetchCollection.projectPermits().then(function(permits){

						console.log("Fetched permits");
						console.log(permits);

						//FETCH NEXT STAGE
						current_stage_index++;
						fetchNextAssetData(fetch_stages, current_stage_index, defer);

					}, function(error){
						defer.reject(error);
						return defer.promise;
					});
				}

				if( active_stage_name == 'checklists' )
				{
					factory.fetchAssetChecklistData().then(function(checklists){
						
						console.log("Fetched Assets Checklists");

						//FETCH NEXT STAGE
						current_stage_index++;
						fetchNextAssetData(fetch_stages, current_stage_index, defer);

					}, function(error){
						defer.reject(error);
						return defer.promise;
					});
				}

				// if( active_stage_name == 'control_item' )
				// {
				// 	factory.fetchCollection.assetControlItems(asset_record).then(function(control_items){
				// 		// asset_record.control_items = control_items;
				// 		console.log("Fetch Asset Control Items");
				// 		console.log(asset_record.control_items);

				// 		//FETCH NEXT STAGE
				// 		current_stage_index++;
				// 		fetchNextAssetData(asset_record, fetch_stages, current_stage_index, defer);

				// 	}, function(error){
				// 		defer.reject(error);
				// 		return defer.promise;
				// 	});
				// }

				if( active_stage_name == 'assessments' )
				{
					factory.fetchCollection.assetAssessments().then(function(assessments){
						// asset_record.assessments = assessments;

						console.log("Fetch Asset Assessments");
						console.log(assessments);

						//FETCH NEXT STAGE
						current_stage_index++;
						fetchNextAssetData(fetch_stages, current_stage_index, defer);

					}, function(error){
						defer.reject(error);
						return defer.promise;
					});
				}

				if( active_stage_name == 'ra_control_item_relations' )
				{
					factory.fetchCollection.assetAssessmentControlItemRelations().then(function(ra_control_item_relations){
						// asset_record.ra_control_item_relations = ra_control_item_relations;
						
						console.log("Fetch Asset Ra Control Item Relations");

						//FETCH NEXT STAGE
						current_stage_index++;
						fetchNextAssetData(fetch_stages, current_stage_index, defer);

					}, function(error){
						defer.reject(error);
						return defer.promise;
					});
				}

				if( active_stage_name == 'mr_hazards' )
				{
					factory.fetchCollection.mrHazards().then(function(mr_hazards){
						// asset_record.mr_hazards = mr_hazards;
						
						console.log("Fetch Asset Managed Risk Hazards");

						//FETCH NEXT STAGE
						current_stage_index++;
						fetchNextAssetData(fetch_stages, current_stage_index, defer);

					}, function(error){
						defer.reject(error);
						return defer.promise;
					});
				}

				if( active_stage_name == 'mr_controls' )
				{
					factory.fetchCollection.mrControls().then(function(mr_controls){
						// asset_record.mr_controls = mr_controls;
						
						console.log("Fetch Asset Managed Risk Controls");

						//FETCH NEXT STAGE
						current_stage_index++;
						fetchNextAssetData(fetch_stages, current_stage_index, defer);

					}, function(error){
						defer.reject(error);
						return defer.promise;
					});
				}

				if( active_stage_name == 'hazard_control_relations' )
				{
					factory.fetchCollection.hazardControlRelations().then(function(hazard_control_relations){
						// asset_record.hazard_control_relations = hazard_control_relations;
						
						console.log("Fetch Asset Hazard Control Relations");

						//FETCH NEXT STAGE
						current_stage_index++;
						fetchNextAssetData(fetch_stages, current_stage_index, defer);

					}, function(error){
						defer.reject(error);
						return defer.promise;
					});
				}

				return defer.promise;
			}

			fetchNextAssetData(fetch_stages, 0, fetch_defer).then(function(asset_record){
				defer.resolve();
			}, function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetchAssetChecklistData = function()
		{
			var defer = $q.defer();

			factory.fetchCollection.assetChecklists().then(function(checklists) {

				// ADD STAGED RECORDS
				factory.sync_collection.staging.addStagedRecordBulk(checklists, 'checklist_instance');

				factory.fetchCollection.checklistData().then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

			}, function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetchAssetProcedureData = function() 
		{
			var defer = $q.defer();

			factory.fetchCollection.assetProcedures().then(function() {

				factory.fetchCollection.procedureData().then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.deleteCorruptMedia = function(media) 
		{
			var defer = $q.defer();
			var delete_defer = $q.defer();

			deleteNextImage(delete_defer, media, 0).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function deleteNextImage(defer, media, active_index) 
			{
				if( active_index > media.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				// IF FILE DOWNLOADED, FILE IS NOT PRESENT AND NOT RISKMACH IMAGE
				if( media[active_index].hasOwnProperty('file_downloaded') && media[active_index].file_downloaded && !media[active_index].hasOwnProperty('_attachments') && !media[active_index].rm_id ) {
					
					factory.deleteCorruptMediaRecord(media[active_index]).then(function() {

						active_index++;
						deleteNextImage(defer, media, active_index);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				active_index++;
				deleteNextImage(defer, media, active_index);

				return defer.promise;
			}

			return defer.promise;
		}

		factory.deleteCorruptMediaRecord = function(media_doc) 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.media;

			db.remove(media_doc._id, media_doc._rev).then(function() {
				defer.resolve();
			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		//FETCH EACH PROCEDURE IN FULL
		factory.fetchProcedureDataSequential = function(procedures, current_index, defer){

			// alert("Start Attempt Fetch Procedure Index: " + current_index);
		
			//IF NO PROCEDURES DONT FETCH ANY
			if( procedures.length == 0 )
			{
				// alert("There are no procedures to fetch");
				defer.resolve(procedures);
				return defer.promise;
			}

			//IF FETCHED ALL STOP
			if( current_index > procedures.length - 1 )
			{
				// alert("Fetched All Procedure Data");
				defer.resolve(procedures);
				return defer.promise;
			}

			//FETCH THE PROCEDURE
			// alert("Attempting to fetch detailed procedure data: " + current_index);
			factory.fetchCollection.procedureData(procedures[current_index]).then(function(procedure_record){
				procedures[current_index] = procedure_record;
				current_index++;
				// alert("Attempting to find the next procedure: " + current_index);
				factory.fetchProcedureDataSequential(procedures, current_index, defer);

			}, function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		//FETCH EACH CHECKLIST IN FULL
		factory.fetchChecklistDataSequential = function(checklists, current_index, defer){

			// alert("Start Attempt Fetch Procedure Index: " + current_index);
		
			//IF NO PROCEDURES DONT FETCH ANY
			if( checklists.length == 0 )
			{
				// alert("There are no procedures to fetch");
				defer.resolve(checklists);
				return defer.promise;
			}

			//IF FETCHED ALL STOP
			if( current_index > checklists.length - 1 )
			{
				// alert("Fetched All Procedure Data");
				defer.resolve(checklists);
				return defer.promise;
			}

			//FETCH THE PROCEDURE
			// alert("Attempting to fetch detailed procedure data: " + current_index);
			factory.fetchCollection.checklistData(checklists[current_index]).then(function(checklist_record){
				checklists[current_index] = checklist_record;
				current_index++;
				// alert("Attempting to find the next procedure: " + current_index);
				factory.fetchChecklistDataSequential(checklists, current_index, defer);

			}, function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetchCollection = {
			projectAssets: function(project_id) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.assets;

				var options = {
					limit: 100,
					include_docs: true
				};

				var assets = [];

				fetchNextPage(fetch_defer).then(function() {
					
					//HERE WE NEED TO FETCH THE ASSETS IN ORDER OF PARENT HEIRARCHY
					var ordered_assets = [];

					function findChildAssets(parent_asset_id, assets)
					{
						var current_child_asset_ids = [];

						var i = 0;
						var len = assets.length;

						while(i < len) {

							//IF WE'RE LOOKING FOR TOP LEVEL ASSETS
							//CHECK FOR VARIATIONS OF UNSET PARENTASSETID
							if( !parent_asset_id && (!assets[i].parent_asset_id || assets[i].parent_asset_id == '' || assets[i].parent_asset_id == 0 || assets[i].parent_asset_id == '0') )
							{
								ordered_assets.push(assets[i]);
								current_child_asset_ids.push(assets[i]._id);
							}

							//IF WE'RE LOOKING FOR A CHILD
							if( parent_asset_id && parent_asset_id == assets[i].parent_asset_id )
							{
								ordered_assets.push(assets[i]);
								current_child_asset_ids.push(assets[i]._id);
							}

							i++;
						}

						var ci = 0;
						var c_len = current_child_asset_ids.length;

						if( c_len > 0 ) {

							while(ci < c_len) {
								findChildAssets(current_child_asset_ids[ci], assets);
								ci++;
							}

						}
					}

					if( assets.length > 0 ) {
						//FETCH THE ASSETS IN ORDER OF HEIRARCHY
						findChildAssets(null, assets);
					}

					//ORDERED ASSETS SHOULD NOW BE POPULATED
					console.log("ORDERED ASSET FETCH");
					console.log(JSON.stringify(ordered_assets, null, 2));

					defer.resolve(ordered_assets);

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) 
						{
							var filtered_assets = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.table != 'assets' ) {
									errors++;
								}

								if( result.rows[i].doc.hasOwnProperty('record_type') && result.rows[i].doc.record_type == 'task' ) {
									errors++;
								}

								if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								if( result.rows[i].doc.project_id != project_id ) {
									errors++;
								}

								if( result.rows[i].doc.hasOwnProperty('clone_incomplete') && result.rows[i].doc.clone_incomplete == 'Yes' ) {
									errors++;
								}

								if( errors == 0 ) {

									if( !result.rows[i].doc.hasOwnProperty('parent_asset_id') ) {
										result.rows[i].doc.parent_asset_id = null;
									}

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
			qcCheckRecords: function(project_record) {
				var defer = $q.defer();

				var activity_id = project_record._id;
				var review_id = null;

				if( project_record.hasOwnProperty('review_id') && project_record.review_id ) {
					review_id = project_record.review_id;
				}

				if( !activity_id || !review_id ) {
					defer.resolve([]);
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.qc_check_records;

				var selector = {
					user_id: authFactory.cloudUserId(),
					company_id: authFactory.cloudCompanyId(),
					activity_id: activity_id, 
					ReviewID: review_id
				}

				db.find({
					selector: selector
				}).then(function(result) {

					console.log("FETCHED QUALITY CHECK RECORDS FOR SYNC");
					console.log(result.docs);

					defer.resolve(result.docs);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			assetProcedures: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.tasks;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var procedures = [];

				fetchNextPage(fetch_defer).then(function() {

					procedures = factory.utils.filterTasksLatestRevisions(procedures);

					factory.sync_collection.staging.addStagedRecordBulk(procedures, 'task');

					defer.resolve();

				},	function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_procedures = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.table != 'tasks' ) {
									errors++;
								}

								if( result.rows[i].doc.task_type != 'procedure' ) {
									errors++;
								}

								if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								if( !factory.sync_collection.staging.staged_ids.hasOwnProperty('asset') || factory.sync_collection.staging.staged_ids.asset.indexOf(result.rows[i].doc.asset_id) === -1 ) {
									errors++;
								}

								if( result.rows[i].doc.hasOwnProperty('clone_incomplete') && result.rows[i].doc.clone_incomplete == 'Yes' ) {
									errors++;
								}

								if( errors == 0 ) {

									// FORMAT BACK TO REGISTER RECORD IF AN EDIT OF REGISTER
									if( result.rows[i].doc.hasOwnProperty('register_rm_id_edit') && result.rows[i].doc.register_rm_id_edit ) {
										result.rows[i].doc.is_register = 'Yes';
									}

									filtered_procedures.push(result.rows[i].doc);
								}

								i++;
							}

							procedures.push(...filtered_procedures);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null; 
							filtered_procedures = null;

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
			procedureData: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.tasks;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var tasks = [];
				var steps = [];

				fetchNextPage(fetch_defer).then(function() {
					
					factory.sync_collection.staging.addStagedRecordBulk(tasks, 'task');
					factory.sync_collection.staging.addStagedRecordBulk(steps, 'task');

					// IF NO SECTIONS/STEPS, NO NEED TO ATTEMPT FETCH MEDIA
					if( tasks.length == 0 && steps.length == 0 ) {
						defer.resolve();
						return defer.promise;
					}

					// FETCH SECTIONS AND STEPS MEDIA
					factory.fetchCollection.recordMedia('task', 'task').then(function(){
						defer.resolve();
					}, function(error){
						defer.reject();
					});

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {
							
							var filtered_tasks = [];
							var filtered_steps = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								if( result.rows[i].doc.task_type == 'procedure' ) {
									errors++;
								}

								// IF PROCEDURE NOT IN SYNC
								if( !factory.sync_collection.staging.staged_ids.hasOwnProperty('task') || factory.sync_collection.staging.staged_ids.task.indexOf(result.rows[i].doc.procedure_id) === -1 ) {
									errors++;
								}

								if( errors == 0 ) {

									var procedure_id = result.rows[i].doc.procedure_id;

									// IF PROCEDURE IS MODIFIED, MODIFY TASK
									if( procedure_id && factory.sync_collection.staging.staged_records.hasOwnProperty(procedure_id) && factory.sync_collection.staging.staged_records[ procedure_id ].record_type == 'task' && factory.sync_collection.staging.staged_records[ procedure_id ].record.record_modified == 'Yes' ) {
										
										result.rows[i].doc.date_modified = new Date().getTime();
					            		result.rows[i].doc.modified_by = authFactory.cloudUserId();

					            		result.rows[i].doc.date_record_synced = null;
					            		result.rows[i].doc.date_content_synced = null;
					            		result.rows[i].doc.date_record_imported = null;
					            		result.rows[i].doc.date_content_imported = null;
					            		result.rows[i].doc.record_modified = 'Yes';
									}

									if( result.rows[i].doc.task_type == 'task' ) {
										filtered_tasks.push(result.rows[i].doc);
									}

									if( result.rows[i].doc.task_type == 'step' ) {
										filtered_steps.push(result.rows[i].doc);
									}
								}

								i++;
							}

							tasks.push(...filtered_tasks);
							steps.push(...filtered_steps);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_tasks = null;
							filtered_steps = null;

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
			projectContractors: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.contractors;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var contractors = [];

				fetchNextPage(fetch_defer).then(function() {

					console.log("FOUND CONTRACTORS");
					console.log(contractors);

					factory.sync_collection.staging.addStagedRecordBulk(contractors, 'contractor');

					defer.resolve(contractors);

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_contractors = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								if( result.rows[i].doc.activity_id != factory.sync_collection.staging.project_record.record._id ) {
									errors++;
								}

								if( errors == 0 ) {
									filtered_contractors.push(result.rows[i].doc);
								}

								i++;
							}

							contractors.push(...filtered_contractors);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_contractors = null;

							fetchNextPage(defer);

						} else {
							defer.resolve();
						}

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			projectPermits: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.permits;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var permits = [];

				fetchNextPage(fetch_defer).then(function() {

					console.log("FOUND PERMITS");
					console.log(permits);

					factory.sync_collection.staging.addStagedRecordBulk(permits, 'permit');

					defer.resolve(permits);

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_permits = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								if( result.rows[i].doc.activity_id != factory.sync_collection.staging.project_record.record._id ) {
									errors++;
								}

								if( errors == 0 ) {
									filtered_permits.push(result.rows[i].doc);
								}

								i++;
							}

							permits.push(...filtered_permits);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_permits = null;

							fetchNextPage(defer);

						} else {
							defer.resolve();
						}

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

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
			assetAssessments: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.assessments;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var assessments = [];

				fetchNextPage(fetch_defer).then(function() {

					// ORDER SUGGESTED RISKS FIRST, THEN NORMAL RISKS
					assessments = factory.utils.sortSuggestedRiskAssessments(assessments);

					console.log("FOUND ASSESSMENTS");
					console.log(assessments);

					factory.sync_collection.staging.addStagedRecordBulk(assessments, 'assessment');

					//GET ASSESSMENT MEDIA RECORDS
					factory.fetchCollection.recordMedia('assessment', 'assessment').then(function(){
						defer.resolve(assessments);
					}, function(error){
						defer.reject();
					});

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_assessments = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								if( !factory.sync_collection.staging.staged_ids.hasOwnProperty('asset') || factory.sync_collection.staging.staged_ids.asset.indexOf(result.rows[i].doc.asset_id) === -1 ) {
									errors++;
								}

								// IF QUICK CAPTURE RISK
								if( result.rows[i].doc.hasOwnProperty('quick_capture_risk') && result.rows[i].doc.quick_capture_risk == 'Yes' ) {
									errors++;
								}

								if( errors == 0 ) {
									filtered_assessments.push(result.rows[i].doc);
								}

								i++;
							}

							assessments.push(...filtered_assessments);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_assessments = null;

							fetchNextPage(defer);

						} else {
							defer.resolve();
						}

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			assetAssessmentControlItemRelations: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.ra_control_item_relations;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var relations = [];

				fetchNextPage(fetch_defer).then(function() {

					factory.sync_collection.staging.addStagedRecordBulk(relations, 'ra_control_item_relation');

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_relations = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								if( !factory.sync_collection.staging.staged_ids.hasOwnProperty('asset') || factory.sync_collection.staging.staged_ids.asset.indexOf(result.rows[i].doc.asset_id) === -1 ) {
									errors++;
								}

								if( errors == 0 ) {
									filtered_relations.push(result.rows[i].doc);
								}

								i++;
							}

							relations.push(...filtered_relations);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_relations = null;

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
			mrHazards: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.mr_hazards;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var hazards = [];

				fetchNextPage(fetch_defer).then(function() {

					factory.sync_collection.staging.addStagedRecordBulk(hazards, 'mr_hazard');

					//GET ASSESSMENT MEDIA RECORDS
					factory.fetchCollection.recordMedia('assessment_hazard', 'mr_hazard').then(function(){
						defer.resolve(hazards);
					}, function(error){
						defer.reject();
					});

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_hazards = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								if( !factory.sync_collection.staging.staged_ids.hasOwnProperty('asset') || factory.sync_collection.staging.staged_ids.asset.indexOf(result.rows[i].doc.asset_id) === -1 ) {
									errors++;
								}

								// FILTER OUT INCOMPLETE CLONES
								if( result.rows[i].doc.hasOwnProperty('clone_incomplete') && result.rows[i].doc.clone_incomplete == 'Yes' ) {
									errors++;
								}

								if( errors == 0 ) {

									var task_id = result.rows[i].doc.task_id;

									// IF PARENT TASK IS MODIFIED, MODIFY HAZARD
									if( task_id && factory.sync_collection.staging.staged_records.hasOwnProperty(task_id) && factory.sync_collection.staging.staged_records[ task_id ].record_type == 'task' && factory.sync_collection.staging.staged_records[ task_id ].record.record_modified == 'Yes' ) {
										
										result.rows[i].doc.date_modified = new Date().getTime();
					            		result.rows[i].doc.modified_by = authFactory.cloudUserId();

					            		result.rows[i].doc.date_record_synced = null;
					            		result.rows[i].doc.date_content_synced = null;
					            		result.rows[i].doc.date_record_imported = null;
					            		result.rows[i].doc.date_content_imported = null;
					            		result.rows[i].doc.record_modified = 'Yes';

					            		// SEND HAZARD BACK AS NEW
					            		// result.rows[i].doc.rm_id = null;
					            		// result.rows[i].doc.rm_ref = null;
					            		// result.rows[i].doc.revision_number = null;

					            		// result.rows[i].doc.rm_task_id = null;
					            		// result.rows[i].doc.rm_task_ref = null;
					            		// result.rows[i].doc.rm_merge_to_ref = null;
					            		// result.rows[i].doc.rm_assessment_id = null;
					            		// result.rows[i].doc.rm_assessment_ref = null;
									}

									filtered_hazards.push(result.rows[i].doc);
								}

								i++;
							}

							hazards.push(...filtered_hazards);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_hazards = null;

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
			mrControls: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.mr_controls;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var controls = [];

				fetchNextPage(fetch_defer).then(function() {

					factory.sync_collection.staging.addStagedRecordBulk(controls, 'mr_control');

					//GET CONTROL MEDIA RECORDS
					factory.fetchCollection.recordMedia('control_item', 'mr_control').then(function(){
						
						// GET CONTROL VERIFICATION MEDIA RECORDS
						factory.fetchCollection.recordMedia('control_item_verification', 'mr_control').then(function() {
							defer.resolve(controls);
						}, function(error) {
							defer.reject(error);
						});

					}, function(error){
						defer.reject();
					});

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_controls = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								if( !factory.sync_collection.staging.staged_ids.hasOwnProperty('asset') || factory.sync_collection.staging.staged_ids.asset.indexOf(result.rows[i].doc.asset_id) === -1 ) {
									errors++;
								}

								if( errors == 0 ) {
									// FORMAT IF CONTROL IN AUDIT
									if( result.rows[i].doc.hasOwnProperty('is_mr_audit') && result.rows[i].doc.is_mr_audit == 'Yes' ) {
										result.rows[i].doc.orig_assessment_id = result.rows[i].doc.assessment_id;
										result.rows[i].doc.orig_rm_assessment_id = result.rows[i].doc.rm_assessment_id;
										result.rows[i].doc.orig_rm_assessment_ref = result.rows[i].doc.rm_assessment_ref;

										result.rows[i].doc.assessment_id = null;
										result.rows[i].doc.rm_assessment_id = null;
										result.rows[i].doc.rm_assessment_ref = null;
									}

									var task_id = result.rows[i].doc.task_id;

									// IF PARENT TASK IS MODIFIED, MODIFY CONTROL
									if( task_id && factory.sync_collection.staging.staged_records.hasOwnProperty(task_id) && factory.sync_collection.staging.staged_records[ task_id ].record_type == 'task' && factory.sync_collection.staging.staged_records[ task_id ].record.record_modified == 'Yes' ) {
										
										result.rows[i].doc.date_modified = new Date().getTime();
					            		result.rows[i].doc.modified_by = authFactory.cloudUserId();

					            		result.rows[i].doc.date_record_synced = null;
					            		result.rows[i].doc.date_content_synced = null;
					            		result.rows[i].doc.date_record_imported = null;
					            		result.rows[i].doc.date_content_imported = null;
					            		result.rows[i].doc.record_modified = 'Yes';

					            		// SYNC CONTROL BACK AS NEW
					            		// result.rows[i].doc.rm_id = null;
					            		// result.rows[i].doc.rm_ref = null;
					            		// result.rows[i].doc.revision_number = null;

					            		// result.rows[i].doc.rm_merge_to_ref = null;
					            		// result.rows[i].doc.rm_task_id = null;
					            		// result.rows[i].doc.rm_task_ref = null;
					            		// result.rows[i].doc.rm_record_asset_id = null;
									}

									filtered_controls.push(result.rows[i].doc);
								}

								i++;
							}

							controls.push(...filtered_controls);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_controls = null;

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
			hazardControlRelations: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.hazard_control_relations;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var relations = [];

				fetchNextPage(fetch_defer).then(function() {

					factory.sync_collection.staging.addStagedRecordBulk(relations, 'hazard_control_relation');

					defer.resolve(relations);

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_relations = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								if( !factory.sync_collection.staging.staged_ids.hasOwnProperty('asset') || factory.sync_collection.staging.staged_ids.asset.indexOf(result.rows[i].doc.asset_id) === -1 ) {
									errors++;
								}

								if( errors == 0 ) {

									// FIND HAZARD IN SYNC
									var hazard_id = result.rows[i].doc.hazard_id;

									if( hazard_id && factory.sync_collection.staging.staged_records.hasOwnProperty(hazard_id) && factory.sync_collection.staging.staged_records[ hazard_id ].record_type == 'mr_hazard' ) {
											
										// FIND HAZARD'S TASK ID
										var task_id = factory.sync_collection.staging.staged_records[ hazard_id ].record.task_id;

										// IF PARENT TASK IS MODIFIED, MODIFY RELATION
										if( task_id && factory.sync_collection.staging.staged_records.hasOwnProperty(task_id) && factory.sync_collection.staging.staged_records[ task_id ].record_type == 'task' && factory.sync_collection.staging.staged_records[ task_id ].record.record_modified == 'Yes' ) {
										
											result.rows[i].doc.date_modified = new Date().getTime();
						            		result.rows[i].doc.modified_by = authFactory.cloudUserId();

						            		result.rows[i].doc.date_record_synced = null; 
						            		result.rows[i].doc.date_content_synced = null;
						            		result.rows[i].doc.date_record_imported = null;
						            		result.rows[i].doc.date_content_imported = null;
						            		result.rows[i].doc.record_modified = 'Yes';

						            		// SYNC RELATION BACK AS NEW
						            		// result.rows[i].doc.rm_id = null;

						            		// result.rows[i].doc.rm_hazard_id = null;
						            		// result.rows[i].doc.rm_hazard_ref = null;

						            		// result.rows[i].doc.rm_control_item_id = null;
						            		// result.rows[i].doc.rm_control_item_ref = null;
										}

									}

									filtered_relations.push(result.rows[i].doc);
								}

								i++;
							}

							relations.push(...filtered_relations);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_relations = null;

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
			assetChecklists: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.checklist_instances;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var checklists = [];

				fetchNextPage(fetch_defer).then(function() {

					defer.resolve(checklists);

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_checklists = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								if( !factory.sync_collection.staging.staged_ids.hasOwnProperty('asset') || factory.sync_collection.staging.staged_ids.asset.indexOf(result.rows[i].doc.asset_id) === -1 ) {
									errors++;
								}

								// INIT INCOMPLETE
								if( result.rows[i].doc.hasOwnProperty('init_incomplete') && result.rows[i].doc.init_incomplete ) {
									errors++;
								}

								if( errors == 0 ) {
									filtered_checklists.push(result.rows[i].doc);
								}

								i++;
							}

							checklists.push(...filtered_checklists);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_checklists = null;

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
			checklistQuestions: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.checklist_question_records;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var questions = [];

				fetchNextPage(fetch_defer).then(function() {

					factory.sync_collection.staging.addStagedRecordBulk(questions, 'checklist_question_record');

					defer.resolve(questions);

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_questions = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								if( !factory.sync_collection.staging.staged_ids.hasOwnProperty('checklist_instance') || factory.sync_collection.staging.staged_ids.checklist_instance.indexOf(result.rows[i].doc.checklist_record_id) === -1 ) {
									errors++;
								}

								if( errors == 0 ) {
									filtered_questions.push(result.rows[i].doc);
								}

								i++;
							}

							questions.push(...filtered_questions);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_questions = null;

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
			raQuestionRelations: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.ra_question_relations;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var relations = [];

				fetchNextPage(fetch_defer).then(function() {

					factory.sync_collection.staging.addStagedRecordBulk(relations, 'ra_question_relation');

					defer.resolve(relations);

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_relations = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								if( result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								if( !factory.sync_collection.staging.staged_ids.hasOwnProperty('checklist_instance') || factory.sync_collection.staging.staged_ids.checklist_instance.indexOf(result.rows[i].doc.checklist_record_id) === -1 ) {
									errors++;
								}

								if( errors == 0 ) {
									filtered_relations.push(result.rows[i].doc);
								}

								i++;
							}

							relations.push(...filtered_relations);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;
							filtered_relations = null;

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
			uAuditJsonRecord: function(json_record_id) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;

				db.get(json_record_id).then(function(doc) {

					defer.resolve(doc);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			checklistData: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var stages = ['checklist_questions','ra_question_relations','question_media','action_media'];

				fetchNextStage(fetch_defer, stages, 0).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function fetchNextStage(defer, stages, stage_index) {

					if( stage_index > stages.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					if( stages[stage_index] == 'checklist_questions' ) {
						factory.fetchCollection.checklistQuestions().then(function() {

							stage_index++;

							fetchNextStage(defer, stages, stage_index);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					if( stages[stage_index] == 'ra_question_relations' ) {
						factory.fetchCollection.raQuestionRelations().then(function() {

							stage_index++;

							fetchNextStage(defer, stages, stage_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( stages[stage_index] == 'question_media' ) {
						factory.fetchCollection.recordMedia('question_response_image', 'checklist_question_record').then(function(){
							
							stage_index++;

							fetchNextStage(defer, stages, stage_index);

						}, function(error){
							defer.reject(error);
						});
					}

					if( stages[stage_index] == 'action_media' ) {
						factory.fetchCollection.recordMedia('action', 'action_record').then(function(){
							
							stage_index++;

							fetchNextStage(defer, stages, stage_index);

						}, function(error){
							defer.reject(error);
						});
					}

					return defer.promise;
				}

				return defer.promise;
			},
			recordMediaV1: function(record_type, parent_stage_type) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.media;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var media = [];

				fetchNextPage(fetch_defer).then(function() {

					factory.sync_collection.staging.addStagedRecordBulk(media, 'media');
					defer.resolve(media);

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

								if( record_type == 'assessment' && result.rows[i].doc.hasOwnProperty('item_not_found') && result.rows[i].doc.item_not_found ) {
									errors++;
								}

								if( result.rows[i].doc.hasOwnProperty('removed_from_sync') && result.rows[i].doc.removed_from_sync ) {
									errors++;
								}
 
								// DIFFERENT CONDITIONS FOR UAUDIT MEDIA
								if( result.rows[i].doc.hasOwnProperty('is_uaudit') && result.rows[i].doc.is_uaudit == 'Yes' ) {

									// IF UAUDIT CHECKLIST IMAGE WAS TAKEN AGAINST IS NOT IN SYNC
									if( !factory.sync_collection.staging.staged_ids.hasOwnProperty('checklist_instance') || factory.sync_collection.staging.staged_ids['checklist_instance'].indexOf(result.rows[i].doc.checklist_instance_id) === -1 ) {
										errors++;
									}

								} else {

									// IF RECORD IMAGE WAS TAKEN AGAINST IS NOT IN SYNC
									if( !factory.sync_collection.staging.staged_ids.hasOwnProperty(parent_stage_type) || factory.sync_collection.staging.staged_ids[parent_stage_type].indexOf(result.rows[i].doc.record_id) === -1 ) {
										errors++;
									}

									if( !factory.sync_collection.staging.staged_ids.hasOwnProperty(parent_stage_type) ) {

										errors++;

									} else {

										var record_id = null;
										var record_item_uuid = null;

										if( result.rows[i].doc.hasOwnProperty('record_id') && result.rows[i].doc.record_id ) {
											record_id = result.rows[i].doc.record_id;
										}

										if( result.rows[i].doc.hasOwnProperty('record_item_uuid') && result.rows[i].doc.record_item_uuid ) {
											record_item_uuid = result.rows[i].doc.record_item_uuid;
										}

										if( !record_id && !record_item_uuid ) {
											errors++;
										} else {

											if( record_id ) {

												if( factory.sync_collection.staging.staged_ids[parent_stage_type].indexOf(record_id) === -1 ) {
													errors++;
												}

											}

											if( record_item_uuid ) {
												
												if( factory.sync_collection.staging.staged_ids[parent_stage_type].indexOf(record_item_uuid) === -1 ) {
													errors++;
												}

											}

										}

									}

								}

								if( errors == 0 ) {

									// FIND TASK ID IN SYNC
									var task_id = null;

									if( result.rows[i].doc.record_type == 'task' ) {
										task_id = result.rows[i].doc.record_id;
									}

									if( result.rows[i].doc.record_type == 'assessment_hazard' || result.rows[i].doc.record_type == 'control_item' || result.rows[i].doc.record_type == 'control_item_verification' ) {

										var record_id = result.rows[i].doc.record_id;

										if( record_id && factory.sync_collection.staging.staged_records.hasOwnProperty(record_id) && factory.sync_collection.staging.staged_records[ record_id ].record_type == parent_stage_type ) {
											task_id = factory.sync_collection.staging.staged_records[ record_id ].record.task_id;
										}

									}

									// IF PARENT TASK IS MODIFIED, MODIFY MEDIA RECORD
									if( task_id && factory.sync_collection.staging.staged_records.hasOwnProperty(task_id) && factory.sync_collection.staging.staged_records[ task_id ].record_type == 'task' && factory.sync_collection.staging.staged_records[ task_id ].record.record_modified == 'Yes' ) {
									
										result.rows[i].doc.date_modified = new Date().getTime();
					            		result.rows[i].doc.modified_by = authFactory.cloudUserId();

					            		result.rows[i].doc.date_record_synced = null;
					            		result.rows[i].doc.date_content_synced = null;
					            		result.rows[i].doc.date_record_imported = null;
					            		result.rows[i].doc.date_content_imported = null;
					            		result.rows[i].doc.record_modified = 'Yes';

					            		// SYNC BACK AS NEW MEDIA
					            		// result.rows[i].doc.rm_id = null;
					            		// result.rows[i].doc.rm_ref = null;
					            		// result.rows[i].doc.rm_revision_number = null;

					            		// result.rows[i].doc.rm_video_id = null;
					            		// result.rows[i].doc.rm_video_ref = null;

					            		// result.rows[i].doc.rm_record_item_id = null;
					            		// result.rows[i].doc.rm_record_item_ref = null;
									}

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
			recordMedia: function(record_type, parent_stage_type) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.media;
				var options = {
					limit: 100, 
					include_docs: true
				};

				var media = [];

				fetchNextPage(fetch_defer).then(function() {

					factory.sync_collection.staging.addStagedRecordBulk(media, 'media');
					defer.resolve(media);

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

								if( record_type == 'assessment' && result.rows[i].doc.hasOwnProperty('item_not_found') && result.rows[i].doc.item_not_found ) {
									errors++;
								}

								if( result.rows[i].doc.hasOwnProperty('removed_from_sync') && result.rows[i].doc.removed_from_sync ) {
									errors++;
								}

								if( result.rows[i].doc.hasOwnProperty('superseeded') && result.rows[i].doc.superseeded == 'Yes' ) {
									errors++;
								}
  
								// DIFFERENT CONDITIONS FOR UAUDIT MEDIA
								if( result.rows[i].doc.hasOwnProperty('is_uaudit') && result.rows[i].doc.is_uaudit == 'Yes' ) {

									// IF UAUDIT CHECKLIST IMAGE WAS TAKEN AGAINST IS NOT IN SYNC
									if( !factory.sync_collection.staging.staged_ids.hasOwnProperty('checklist_instance') || factory.sync_collection.staging.staged_ids['checklist_instance'].indexOf(result.rows[i].doc.checklist_instance_id) === -1 ) {
										errors++;
									}

								} else {

									// IF RECORD IMAGE WAS TAKEN AGAINST IS NOT IN SYNC
									if( !factory.sync_collection.staging.staged_ids.hasOwnProperty(parent_stage_type) || factory.sync_collection.staging.staged_ids[parent_stage_type].indexOf(result.rows[i].doc.record_id) === -1 ) {
										errors++;
									}

									if( !factory.sync_collection.staging.staged_ids.hasOwnProperty(parent_stage_type) ) {

										errors++;

									} else {

										var record_id = null;
										var record_item_uuid = null;

										if( result.rows[i].doc.hasOwnProperty('record_id') && result.rows[i].doc.record_id ) {
											record_id = result.rows[i].doc.record_id;
										}

										if( result.rows[i].doc.hasOwnProperty('record_item_uuid') && result.rows[i].doc.record_item_uuid ) {
											record_item_uuid = result.rows[i].doc.record_item_uuid;
										}

										if( !record_id && !record_item_uuid ) {
											errors++;
										} else {

											if( record_id ) {

												if( factory.sync_collection.staging.staged_ids[parent_stage_type].indexOf(record_id) === -1 ) {
													errors++;
												}

											}

											if( record_item_uuid ) {
												
												if( factory.sync_collection.staging.staged_ids[parent_stage_type].indexOf(record_item_uuid) === -1 ) {
													errors++;
												}

											}

										}

									}

								}

								if( errors == 0 ) {

									var parent_record_types = ['task','assessment'];

									// FIND PARENT RECORD ID IN SYNC
									var parent_record_id = null;

									if( parent_record_types.indexOf(result.rows[i].doc.record_type) !== -1 ) {
										parent_record_id = result.rows[i].doc.record_id;
									}

									if( result.rows[i].doc.record_type == 'assessment_hazard' || result.rows[i].doc.record_type == 'control_item' || result.rows[i].doc.record_type == 'control_item_verification' ) {

										var record_id = result.rows[i].doc.record_id;

										if( record_id && factory.sync_collection.staging.staged_records.hasOwnProperty(record_id) && factory.sync_collection.staging.staged_records[ record_id ].record_type == parent_stage_type ) {
											parent_record_id = factory.sync_collection.staging.staged_records[ record_id ].record.task_id;
										}

									}

									// IF PARENT RECORD IS MODIFIED, MODIFY MEDIA RECORD
									if( parent_record_id && factory.sync_collection.staging.staged_records.hasOwnProperty(parent_record_id) && parent_record_types.indexOf(factory.sync_collection.staging.staged_records[ parent_record_id ].record_type) !== -1 && factory.sync_collection.staging.staged_records[ parent_record_id ].record.record_modified == 'Yes' ) {
									
										result.rows[i].doc.date_modified = new Date().getTime();
					            		result.rows[i].doc.modified_by = authFactory.cloudUserId();

					            		result.rows[i].doc.date_record_synced = null;
					            		result.rows[i].doc.date_content_synced = null;
					            		result.rows[i].doc.date_record_imported = null;
					            		result.rows[i].doc.date_content_imported = null;
					            		result.rows[i].doc.record_modified = 'Yes';

					            		// SYNC BACK AS NEW MEDIA
					            		// result.rows[i].doc.rm_id = null;
					            		// result.rows[i].doc.rm_ref = null;
					            		// result.rows[i].doc.rm_revision_number = null;

					            		// result.rows[i].doc.rm_video_id = null;
					            		// result.rows[i].doc.rm_video_ref = null;

					            		// result.rows[i].doc.rm_record_item_id = null;
					            		// result.rows[i].doc.rm_record_item_ref = null;
									}

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
			}
		};

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
				task: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncTaskRecord',
				
				contractor: factory.test_request_prefix + 'laravel/public/webapp/v1/',
				permit: factory.test_request_prefix + 'laravel/public/webapp/v1/',

				checklist_instance: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncChecklistInstanceRecord',
				checklist_question_record: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncChecklistQuestionRecord',
				assessment: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncAssessmentRecord',
				ra_question_relation: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncRAQuestionRelationRecord',
				control_item: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncControlItemRecord',
				mr_control: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncControlItemRecord',
				mr_hazard: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncAssessmentHazardRecord',
				ra_control_item_relation: factory.test_request_prefix + 'laravel/public/webapp/v1/SyncRAControlItemRelationRecord',
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

				// RUN PRE SYNC FORMATTING
				factory.pre_sync_formatting.preFormatSyncRecord(staging_record).then(function() {

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

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			preSyncUpdates: function(staging_record) {
				var defer = $q.defer();
				var update_defer = $q.defer();

				if( staging_record.record_type == 'checklist_instance' && staging_record.record.hasOwnProperty('is_uaudit') && staging_record.record.is_uaudit == 'Yes' ) {

				}

				var stages = [];

				runNextPreSyncUpdate(update_defer, 0).then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function runNextPreSyncUpdate(defer, active_index) {

					if( active_index > stages.length ) {
						defer.resolve();
						return defer.promise;
					}

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

				if( staging_record.record_type == 'asset' )
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

				if( staging_record.record_type == 'contractor' )
				{
					riskmachDatabasesFactory.databases.collection.contractors.put(staging_record.record).then(function(up_result){
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);
						console.log("UPDATED SYNC CONTRACTOR RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING SYNC CONTRACTOR RESULT: " + error);
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'permit' )
				{
					riskmachDatabasesFactory.databases.collection.permits.put(staging_record.record).then(function(up_result){
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);
						console.log("UPDATED SYNC PERMIT RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING SYNC PERMIT RESULT: " + error);
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

				if( staging_record.record_type == 'checklist_instance' )
				{
					if( staging_record.record.hasOwnProperty('is_uaudit') && staging_record.record.is_uaudit == 'Yes' ) {
						staging_record.record.uaudit_instance_data = null;
					}

					riskmachDatabasesFactory.databases.collection.checklist_instances.put(staging_record.record).then(function(up_result){
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;

						if( staging_record.record.hasOwnProperty('is_uaudit') && staging_record.record.is_uaudit == 'Yes' ) {
							factory.sync_requests.uAuditJsonSynced(staging_record.record).then(function() {
								defer.resolve(staging_record);
								console.log("UPDATED SYNC CHECKLIST INSTANCE RESULT");
							}, function(error) {
								defer.reject(error);
							});
						} else {
							defer.resolve(staging_record);
							console.log("UPDATED SYNC CHECKLIST INSTANCE RESULT");
						}

					}).catch(function(error){
						console.log("ERROR UPDATING SYNC CHECKLIST INSTANCE RESULT: " + error);
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'checklist_question_record' )
				{
					riskmachDatabasesFactory.databases.collection.checklist_question_records.put(staging_record.record).then(function(up_result){
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);
						console.log("UPDATED SYNC QUESTION RECORD RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING SYNC QUESTION RECORD RESULT: " + error);
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'ra_question_relation' )
				{
					riskmachDatabasesFactory.databases.collection.ra_question_relations.put(staging_record.record).then(function(up_result){
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);
						console.log("UPDATED SYNC RA QUESTION RELATION RECORD RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING RA QUESTION RELATION RECORD RESULT: " + error);
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

				if( staging_record.record_type == 'assessment' )
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

				if( staging_record.record_type == 'ra_control_item_relation' )
				{
					riskmachDatabasesFactory.databases.collection.ra_control_item_relations.put(staging_record.record).then(function(up_result){
						staging_record.record._id = up_result.id;
						staging_record.record._rev = up_result.rev;
						defer.resolve(staging_record);
						console.log("UPDATED SYNC RA CONTROL ITEM RELATION RECORD RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING RA CONTROL ITEM RELATION RECORD RESULT: " + error);
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
			},
			uAuditJsonSynced: function(checklist_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;

				db.get(checklist_record.checklist_instance_json_id).then(function(doc) {

					doc.date_record_synced = new Date().getTime();
					doc.synced = true;

					db.put(doc).then(function(result) {

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

		factory.import_requests = {
			endpoints: {
				project: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportProjectRecord',
				asset: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportAssetRecord',
				task_asset: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportAssetRecord',
				control_item_asset: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportAssetRecord',
				task: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportTaskRecord',
				
				contractor: factory.test_request_prefix + 'laravel/public/webapp/v1/',
				contractor_asset: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportAssetRecord',
				permit: factory.test_request_prefix + 'laravel/public/webapp/v1/',
				permit_asset: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportAssetRecord',

				checklist_instance: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportChecklistInstanceRecord',
				checklist_question_record: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportChecklistQuestionRecord',
				assessment: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportAssessmentRecord',
				ra_question_relation: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportQuestionAssessmentRelation',
				control_item: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportControlItemRecord',
				mr_control: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportControlItemRecord',
				mr_hazard: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportHazardRecord',
				ra_control_item_relation: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportAssessmentControlItemRelation',
				hazard_control_relation: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportHazardControlRelation',
				qc_check_record: factory.test_request_prefix + 'laravel/public/webapp/v1/SaveAssessmentCheck',
				qc_check_record_v2: factory.test_request_prefix + 'laravel/public/webapp/v1/SaveAssessmentCheckV2',
				media: factory.test_request_prefix + 'laravel/public/webapp/v1/ImportMediaRecord'
			},
			priorities: {
				project: 0,
				asset: 1,
				task_asset: 2,
				procedure: 3,
				task: 4,
				step: 5,
				task_asset: 6,
				contractor: 7,
				contractor_asset: 8, 
				permit: 9, 
				permit_asset: 10,
				control_item: 11,
				mr_control: 12,
				control_item_asset: 13,
				assessment: 14,
				ra_control_item_relation: 15,
				checklist_instance: 16,
				checklist_question_record: 17,
				ra_question_relation: 18,
				qc_check_record: 19,
				mr_hazard: 20,
				hazard_control_relation: 21,
				media: 22
			},
			importRecord: function(staging_record){
				var defer = $q.defer();

				if( !staging_record.record.hasOwnProperty('synced') || !staging_record.record.synced )
				{
					defer.reject("The record has not yet been synced!");
					return defer.promise;
				}

				if( staging_record.record_type == 'qc_check_record' ) {
					// RUN BESPOKE IMPORT ROUTINE
					factory.import_requests.importQualityCheckRecord(staging_record).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				} else {
					factory.import_requests.doImportRecord(staging_record).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;
			},
			doImportRecord: function(staging_record) {
				var defer = $q.defer();
				var import_defer = $q.defer();

				importRecord(staging_record, import_defer).then(function(sync_result){
					staging_record.record.date_record_imported = new Date().getTime();
					staging_record.record.imported = true;
					//INCREMENT SYNCED
					factory.sync_collection.incrementStat('total_imported', 1);
					defer.resolve();
				}, function(error){
					defer.reject(error);
				});

				function importRecord(staging_record, defer){
					var endpoint = null;

					// if( staging_record.record_type == 'media' ) {
					// 	alert("Media record");
					// 	defer.resolve();
					// 	return defer.promise;
					// }

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
						defer.reject("Error importing " + staging_record.record_type + " - " + staging_record.record.mid_record_id + " [attempt limit exceed]: " + staging_record.attempt_meta.last_error);
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
			importQualityCheckRecord: function(staging_record) {
				var defer = $q.defer();
				var import_defer = $q.defer();

				importQcRecord(staging_record, import_defer).then(function(sync_result){
					staging_record.record.date_record_imported = new Date().getTime();
					staging_record.record.imported = true;
					//INCREMENT SYNCED
					factory.sync_collection.incrementStat('total_imported', 1);
					defer.resolve();
				}, function(error){
					defer.reject(error);
				});

				function importQcRecord(staging_record, defer){
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
						defer.reject("Error importing " + staging_record.record_type + " - " + staging_record.record.AssessmentID + " [attempt limit exceed]: " + staging_record.attempt_meta.last_error);
						return defer.promise;
					}

					// params: {
	    //         		assessment_check_id: staging_record.record.ID, 
	    //         		review_status: staging_record.record.ReviewStatus, 
	    //         		review_text: staging_record.record.ReviewText, 
	    //         		rejection_level: staging_record.record.RejectionLevel, 
	    //         		rejection_outcome: staging_record.record.RejectionOutcome,
	    //         		revised_assessment_id: null
	    //         	}

					$http.post(endpoint,{
						params: {
							qc_record: staging_record.record
						}
		            })
					.success(function(data, status, headers, config) {

						if( data.error == true )
						{
							//TRY AGAIN
							staging_record.attempt_meta.num_attempts++;
							staging_record.attempt_meta.last_error = data.error_messages[0];
		            		importQcRecord(staging_record, defer);
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
		            	importQcRecord(staging_record, defer);
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

				if( staging_record.record_type == 'asset' )
				{
					factory.dbUtils.snapshot_asset.saveAssetImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'contractor' )
				{
					factory.dbUtils.contractor.saveContractorImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'permit' )
				{
					factory.dbUtils.permit.savePermitImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'task' )
				{
					factory.dbUtils.task.saveTaskImportResult(staging_record.record, result).then(function() {
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

				if( staging_record.record_type == 'assessment' )
				{
					factory.dbUtils.assessment.saveRiskAssessmentImportResult(staging_record.record, result).then(function() {
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

				if( staging_record.record_type == 'ra_question_relation' )
				{
					factory.dbUtils.ra_question_relation.saveQuestionAssessmentRelationImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'ra_control_item_relation' )
				{
					factory.dbUtils.ra_control_item_relation.saveAssessmentControlItemRelationImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'checklist_instance' )
				{
					factory.dbUtils.checklist_instance.saveChecklistInstanceImportResult(staging_record.record, result).then(function() {
						
						if( staging_record.record.hasOwnProperty('is_uaudit') && staging_record.record.is_uaudit == 'Yes' ) {
							factory.import_requests.uAuditJsonImported(staging_record.record).then(function() {
								defer.resolve();
							}, function(error) {
								defer.reject(error);
							});
						} else {
							defer.resolve();
						}

					}, function(error) {
						defer.reject(error);
					});
				}

				if( staging_record.record_type == 'checklist_question_record' )
				{
					factory.dbUtils.checklist_question_record.saveChecklistQuestionImportResult(staging_record.record, result).then(function() {
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

				if( staging_record.record_type == 'qc_check_record' ) 
				{
					factory.dbUtils.qc_check_records.saveQualityCheckRecordImportResult(staging_record.record, result).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;
			},
			autoVerifyManagedRiskControls: function(project_record) {
				var defer = $q.defer();

				var verify_defer = $q.defer();

				if( !project_record.hasOwnProperty('imported') || !project_record.imported )
				{
					console.log("PROJECT RECORD NOT IMPORTED");
					console.log(project_record);

					defer.reject("The project has not yet been imported ("+ project_record.mid_record_id +")");
					return defer.promise;
				}

				// IF PROJECT IS NOT MANAGED RISK AUDIT, DON'T RUN
				if( !project_record.hasOwnProperty('is_managed_risk_audit') || !project_record.is_managed_risk_audit || project_record.is_managed_risk_audit == 'No' ) {
					defer.resolve();
					return defer.promise;
				}

				if( project_record.controls_auto_verified ) {
					console.log("PROJECT CONTROLS ALREADY AUTO VERIFIED");
					defer.resolve(project_record);
					return defer.promise;
				}

				var attempt_meta = {
					num_attempts: 0,
					attempt_limit: 3,
					last_error: null
				};

				autoVerifyControls(project_record, attempt_meta, verify_defer).then(function(verification_result){

					defer.resolve(verification_result);

				}, function(error){
					defer.reject(error);
				});

				function autoVerifyControls(project_record, attempt_meta, defer){

					console.log("AUTO VERIFY CONTROLS");

					if( attempt_meta.num_attempts > attempt_meta.attempt_limit )
					{
						defer.reject(attempt_meta.last_error);
						return defer.promise;
					}

					$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/AutoVerifyManagedRiskControlItems',{
		            	params: {
		            		activity_id: project_record.rm_id, 
		            		managed_risk_id: project_record.rm_managed_risk_id
		            	}
		            })
					.success(function(data, status, headers, config) {

						if( data.error == true )
						{
							//TRY AGAIN
							attempt_meta.num_attempts++;
							attempt_meta.last_error = data.error_messages[0];
		            		autoVerifyControls(project_record, attempt_meta, defer);
						}
						else
						{
							//SAVE AUTO VERIFICATION
							console.log("CONTROLS AUTO VERIFIED");
							console.log(data);

							project_record.controls_auto_verified = true;

							riskmachDatabasesFactory.databases.collection.projects.put(project_record).then(function(up_result){
								project_record._id = up_result.id;
								project_record._rev = up_result.rev;
								console.log("UPDATED PROJECT CONTROLS AUTO VERIFICATION RESULT");

								defer.resolve(data);

							}).catch(function(error){
								console.log("ERROR UPDATING PROJECT CONTROLS AUTO VERIFICATION RESULT: " + error);
								defer.reject(error);
							});
						}
		            })
		            .error(function(data, status, headers, config) {
		            	//TRY AGAIN
		            	attempt_meta.num_attempts++;
		            	attempt_meta.last_error = "Error auto verifying controls (id: "+ project_record.rm_id +")";
		            	autoVerifyControls(project_record, attempt_meta, defer);
					});

					return defer.promise;
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

				var total_qc_records = factory.sync_collection.stats.total_qc_records;
				var mid_table_records = total_app_records;
				
				if( total_qc_records > 0 ) {
					mid_table_records = total_app_records - total_qc_records;
				}

				verifyImport(project_record, mid_table_records, attempt_meta, verify_defer).then(function(verification_success){

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
			},
			createReport: function(rm_project_id, report_data){
				var defer = $q.defer();
				var request_defer = $q.defer();

				if( report_data.create_report != 'Yes' ) {
					defer.resolve();
					return defer.promise;
				}

				// IF PROJECT HAS NO RMID, DON'T REPORT
				if( !rm_project_id ) {
					defer.resolve();
					return defer.promise;
				}

				var attempt_meta = {
					num_attempts: 0,
					attempt_limit: 3,
					last_error: null
				};

				doCreateReport(rm_project_id, attempt_meta, request_defer).then(function(result){
					defer.resolve(result);
				}, function(error){
					defer.reject(error);
				});

				function doCreateReport(rm_project_id, attempt_meta, defer){

					if( attempt_meta.num_attempts > attempt_meta.attempt_limit )
					{
						defer.reject(attempt_meta.last_error);
						return defer.promise;
					}

					$http.post('https://system.riskmach.co.uk/laravel/public/webapp/v1/CreateReportAddToQueue',{
		            	params: {
		            		activity_id: rm_project_id,
		            		share_data: report_data.report_shares, 
		            		publish: report_data.publish_report
		            	}
		            })
					.success(function(data, status, headers, config) {

						console.log("CREATE REPORT RESPONSE: " + rm_project_id);
						console.log(data);

						if( data.error == true )
						{
							//TRY AGAIN
							attempt_meta.num_attempts++;
							attempt_meta.last_error = data.error_messages[0];
		            		doCreateReport(rm_project_id, attempt_meta, defer);
						}
						else
						{
							// USE THE REPORT META TO UPDATE PROJECT
							if( data.hasOwnProperty('report_record') && data.report_record ) {
								defer.resolve(data.report_record);
							} else {
								defer.resolve(null);
							}
						}
		            })
		            .error(function(data, status, headers, config) {
		            	//TRY AGAIN
		            	attempt_meta.num_attempts++;
		            	attempt_meta.last_error = "Error creating report (id: "+ rm_project_id +")";
		            	doCreateReport(rm_project_id, attempt_meta, defer);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			requestUpdateUAuditJson: function(mid_instance_id, instance_json_record, db_update_only) {
				var defer = $q.defer();

				if( db_update_only ) {
					defer.resolve();
					return defer.promise;
				}

				var request_defer = $q.defer();

				var attempt_meta = {
					num_attempts: 0,
					attempt_limit: 3,
					last_error: null
				}

				importUAuditContent(request_defer, attempt_meta).then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function importUAuditContent(defer, attempt_meta) {

					if( attempt_meta.num_attempts > attempt_meta.attempt_limit ) {
						defer.reject(attempt_meta.last_error);
						return defer.promise;
					}  

					$http.post('https://system.riskmach.co.uk/laravel/public/webapp/v1/ImportUAuditInstanceContentPhaseTwo',{
		            	params: {
		            		mid_record_id: mid_instance_id,
		            		uaudit_instance_data: instance_json_record.uaudit_instance_data
		            	}
		            })
					.success(function(data, status, headers, config) {

						if( data.error == true )
						{
							//TRY AGAIN
							attempt_meta.num_attempts++;
							attempt_meta.last_error = data.error_messages[0];
		            		importUAuditContent(defer, attempt_meta);
						}
						else
						{
							console.log("IMPORTED UAUDIT CONTENT PHASE 2");
							defer.resolve();
						}
		            })
		            .error(function(data, status, headers, config) {
		            	//TRY AGAIN
		            	attempt_meta.num_attempts++;
		            	attempt_meta.last_error = "Error importing UAudit content phase 2 (id: "+ mid_instance_id +")";
		            	importUAuditContent(defer, attempt_meta);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			uAuditJsonImported: function(checklist_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;

				db.get(checklist_record.checklist_instance_json_id).then(function(doc) {

					doc.date_record_imported = new Date().getTime();
					doc.record_modified = 'No';

					// UPDATE JSON WITH RM VALUES
					var uaudit_json = JSON.parse(doc.uaudit_instance_data);

					uaudit_json.audit_info.rm_id = checklist_record.rm_id;
					uaudit_json.audit_info.rm_asset_id = checklist_record.rm_asset_id;

					doc.uaudit_instance_data = JSON.stringify(uaudit_json);

					// CLEAN UP
					uaudit_json = null;

					db.put(doc).then(function(result) {

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
			},
			sendQcRejectionsEmail: function(project_record) {
				var defer = $q.defer();
				var send_defer = $q.defer();

				if( !project_record.hasOwnProperty('review_id') || !project_record.review_id ) {
					console.log("PROJECT HAS NOT REVIEW ID SET");
					defer.resolve(project_record);
					return defer.promise;
				}

				if( !project_record.hasOwnProperty('imported') || !project_record.imported ) {
					console.log("PROJECT RECORD NOT IMPORTED BEFORE QC REJECTIONS EMAIL");
					console.log(project_record);

					defer.reject("The project has not yet been imported ("+ project_record.mid_record_id +")");
					return defer.promise;
				}

				var attempt_meta = {
					num_attempts: 0,
					attempt_limit: 3,
					last_error: null
				};

				sendEmail(project_record, attempt_meta, send_defer).then(function(send_result){

					defer.resolve(send_result);

				}, function(error){
					defer.reject(error);
				});

				function sendEmail(project_record, attempt_meta, defer){

					console.log("SEND QC REJECTIONS EMAIL");

					if( attempt_meta.num_attempts > attempt_meta.attempt_limit )
					{
						defer.reject(attempt_meta.last_error);
						return defer.promise;
					}

					$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/SendReviewRejectionsEmail',{
		            	params: {
		            		review_id: project_record.review_id
		            	}
		            })
					.success(function(data, status, headers, config) {

						if( data.error == true )
						{
							//TRY AGAIN
							attempt_meta.num_attempts++;
							attempt_meta.last_error = data.error_messages[0];
		            		sendEmail(project_record, attempt_meta, defer);
						}
						else
						{
							console.log("QC REJECTIONS EMAIL SENT");
							console.log(data);

							defer.resolve(data);
						}
		            })
		            .error(function(data, status, headers, config) {
		            	//TRY AGAIN
		            	attempt_meta.num_attempts++;
		            	attempt_meta.last_error = "Error sending quality check rejections email (id: "+ project_record.rm_id +")";
		            	sendEmail(project_record, attempt_meta, defer);
					});

					return defer.promise;
				}

				return defer.promise;
			},
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

			// THIS SHOULD BE THE LAST STAGED RECORD
			// WE WANT TO MARK THE LOWEST LEVEL RECORDS IMPORTED FIRST AND END WITH THE TOP
			// LEVEL RECORD (THE PROJECT RECORD)
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

		factory.markStagedRecordsContentsImportedV1 = function() 
		{
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

				if( next_record.record_type == 'project' ) {

					

				} else {

					// DO MARK RECORD CONTENTS IMPORTED
					factory.dbUtils.markStagedRecordContentsImported(next_record).then(function() {

						// console.log("MARKED STAGED RECORD IMPORTED: " + next_index);

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

				}

				return defer.promise;
			}

			return defer.promise;
		}

		factory.markStagedRecordsContentsImported = function() 
		{
			var defer = $q.defer();
			var save_defer = $q.defer();

			var max_index = Object.keys(factory.sync_collection.staging.import_staged).length - 1;
			
			// IF NO STAGED RECORDS
			if( max_index == -1 ) {
				defer.resolve();
				return defer.promise;
			}

			// THIS SHOULD BE THE LAST STAGED RECORD
			// WE WANT TO MARK THE LOWEST LEVEL RECORDS IMPORTED FIRST AND END WITH THE TOP
			// LEVEL RECORD (THE PROJECT RECORD)
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

				// RUN THESE FUNCTIONS BEFORE MARKING PROJECT CONTENT IMPORTED
				if( next_record.record_type == 'project' ) {

					// UPDATE ANY UAUDIT JSON WITH FINALISED MEDIA
					var db_update_only = true;
					factory.post_import_updates.updateCollectedUAuditJsonMedia(db_update_only).then(function() {

						// DO MARK RECORD CONTENTS IMPORTED
						factory.dbUtils.markStagedRecordContentsImported(next_record).then(function() {

							console.log("MARKED STAGED RECORD IMPORTED: " + next_index);

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

					}, function(error) {
						defer.reject(error);
					});

				} else {

					// DO MARK RECORD CONTENTS IMPORTED
					factory.dbUtils.markStagedRecordContentsImported(next_record).then(function() {

						console.log("MARKED STAGED RECORD IMPORTED: " + next_index);

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

				}

				return defer.promise;
			}

			return defer.promise;
		}

		factory.utils = {
			full_data_sync: false,
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

					// IF PROCEDURE STATUS REVISED
					if( active_record.hasOwnProperty('status') && parseInt(active_record.status) == 3 ) {
						return false;
					}

					// IF ANY RECORDS WITH SAME REF HAVE A HIGHER REV
					for(var i = 0; i < records.length; i++) {
						if( active_record.rm_ref == records[i].rm_ref && parseInt(active_record.revision_number) < parseInt(records[i].revision_number) ) {
							is_latest_rev = false;
						}
					}

					return is_latest_rev;
				}

				return latest_revs;
			},
			findStagedImportRecords: function(record_type) {
				var found_records = [];

				Object.keys(factory.sync_collection.staging.import_staged).forEach(function(current_key){

					if( factory.sync_collection.staging.import_staged[current_key].record_type == record_type ) {
						found_records.push(factory.sync_collection.staging.import_staged[current_key]);
					}

				});

				return found_records;
			},
			findStagedImportRecord: function(record_id, record_type) {
				var record = null;

				Object.keys(factory.sync_collection.staging.import_staged).forEach(function(current_key){

					if( factory.sync_collection.staging.import_staged[current_key].record_type == record_type && factory.sync_collection.staging.import_staged[current_key].record._id == record_id ) {
						
						record = factory.sync_collection.staging.import_staged[current_key].record;

					}

				});

				return record;
			},
			isRecordImported: function(record) {
				var is_imported = false;

				if( record.hasOwnProperty('date_content_imported') && record.date_content_imported ) {
					is_imported = true;
				}

				return is_imported;
			},
			sortSuggestedRiskAssessments: function(data) {

				function sortData(data) {

					data.sort(function(a,b) {

						let a_suggested_risk = 1;
						let b_suggested_risk = 1;

						if( a.hasOwnProperty('is_suggested_risk') && a.is_suggested_risk == 'Yes' ) {
							a_suggested_risk = 2;
						}

						if( b.hasOwnProperty('is_suggested_risk') && b.is_suggested_risk == 'Yes' ) {
							b_suggested_risk = 2;
						}

						if (a_suggested_risk > b_suggested_risk) {
					   		return -1;
					    } else {
					    	return 1;
					    }

						return 0;
					});

					return data;
				}

				var sorted_data = sortData(data);

				console.log("SORTED RISK DATA");
				console.log(sorted_data);

				return sorted_data;
			},
			filterModifiedQcCheckRecords: function(qc_check_records) {
				var filtered = [];

				var i = 0;
				var len = qc_check_records.length;

				while( i < len ) {
					var errors = 0;

					if( qc_check_records[i].hasOwnProperty('record_modified') && qc_check_records[i].record_modified == 'No' ) {
						errors++;
					}

					if( !errors ) {
						filtered.push(qc_check_records[i]);
					} 

					i++;
				}

				return filtered;
			}
		}

		factory.dbUtils = {
			markStagedRecordContentsSynced: function(staging_record) {
				var defer = $q.defer();

				var child_record_applicable_stages = ['checklist_instance'];

				var db = null;

				if( staging_record.record_type == 'project' ) {
					db = riskmachDatabasesFactory.databases.collection.projects;
				}

				if( staging_record.record_type == 'asset' ) {
					db = riskmachDatabasesFactory.databases.collection.assets;
				}

				if( staging_record.record_type == 'contractor' ) {
					db = riskmachDatabasesFactory.databases.collection.contractors;
				}

				if( staging_record.record_type == 'permit' ) {
					db = riskmachDatabasesFactory.databases.collection.permits;
				}

				if( staging_record.record_type == 'task' ) {
					db = riskmachDatabasesFactory.databases.collection.tasks;
				}

				if( staging_record.record_type == 'control_item' ) {
					db = riskmachDatabasesFactory.databases.collection.mr_controls;
				}

				if( staging_record.record_type == 'assessment' ) {
					db = riskmachDatabasesFactory.databases.collection.assessments;
				}

				if( staging_record.record_type == 'media' ) {
					db = riskmachDatabasesFactory.databases.collection.media;
				}

				if( staging_record.record_type == 'ra_question_relation' ) {
					db = riskmachDatabasesFactory.databases.collection.ra_question_relations;
				}

				if( staging_record.record_type == 'ra_control_item_relation' ) {
					db = riskmachDatabasesFactory.databases.collection.ra_control_item_relations;
				}

				if( staging_record.record_type == 'checklist_instance' ) {
					db = riskmachDatabasesFactory.databases.collection.checklist_instances;
				}

				if( staging_record.record_type == 'checklist_question_record' ) {
					db = riskmachDatabasesFactory.databases.collection.checklist_question_records;
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

				if( staging_record.record_type == 'qc_check_record' ) {
					db = riskmachDatabasesFactory.databases.collection.qc_check_records;
				}

				staging_record.record.date_content_synced = new Date().getTime();

				console.log( staging_record.record_type );
				console.log( staging_record.record );

				db.put(staging_record.record).then(function(result) {
					staging_record.record._id = result.id;
					staging_record.record._rev = result.rev;

					console.log("MARKED " + staging_record.record_type + " SYNC COMPLETED");

					if( child_record_applicable_stages.indexOf(staging_record.record_type) !== -1 ) {
						factory.dbUtils.markStagedRecordChildsContentsSynced(staging_record).then(function() {
							console.log("MARKED " + staging_record.record_type + " CHILDS SYNC COMPLETED");

							defer.resolve(staging_record);
						}, function(error) {
							console.log("ERROR MARKING " + staging_record.record_type + " CHILDS SYNC COMPLETED");
							defer.reject(error);
						});
					} else {
						defer.resolve(staging_record);
					}

				}, function(error) {
					console.log("ERROR MARKING " + staging_record.record_type + " SYNC COMPLETED");
					defer.reject(error);
				});

				return defer.promise;
			}, 
			markStagedRecordChildsContentsSynced: function(staging_record) {
				var defer = $q.defer();

				if( staging_record.record_type == 'checklist_instance' ) {

					if( staging_record.record.hasOwnProperty('is_uaudit') && staging_record.record.is_uaudit == 'Yes' ) {
						
						factory.dbUtils.markUAuditContentsSynced(staging_record.record).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});

					} else {
						defer.resolve();
					}

				}

				return defer.promise;
			},
			markUAuditContentsSynced: function(checklist_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;

				db.get(checklist_record.checklist_instance_json_id).then(function(doc) {

					doc.date_content_synced = new Date().getTime();

					db.put(doc).then(function(result) {

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
			},
			markStagedRecordContentsImported: function(staging_record) {
				var defer = $q.defer();

				var child_record_applicable_stages = ['checklist_instance'];

				var db = null;

				if( staging_record.record_type == 'project' ) {
					db = riskmachDatabasesFactory.databases.collection.projects;

					staging_record.record.import_finalised = new Date().getTime();
				}

				if( staging_record.record_type == 'asset' ) {
					db = riskmachDatabasesFactory.databases.collection.assets;
				}

				if( staging_record.record_type == 'contractor' ) {
					db = riskmachDatabasesFactory.databases.collection.contractors;
				}

				if( staging_record.record_type == 'permit' ) {
					db = riskmachDatabasesFactory.databases.collection.permits;
				}

				if( staging_record.record_type == 'task' ) {
					db = riskmachDatabasesFactory.databases.collection.tasks;
				}

				if( staging_record.record_type == 'control_item' ) {
					db = riskmachDatabasesFactory.databases.collection.mr_controls;
				}

				if( staging_record.record_type == 'assessment' ) {
					db = riskmachDatabasesFactory.databases.collection.assessments;
				}

				if( staging_record.record_type == 'media' ) {
					db = riskmachDatabasesFactory.databases.collection.media;
				}

				if( staging_record.record_type == 'ra_question_relation' ) {
					db = riskmachDatabasesFactory.databases.collection.ra_question_relations;
				}

				if( staging_record.record_type == 'ra_control_item_relation' ) {
					db = riskmachDatabasesFactory.databases.collection.ra_control_item_relations;
				}

				if( staging_record.record_type == 'checklist_instance' ) {
					db = riskmachDatabasesFactory.databases.collection.checklist_instances;
				}

				if( staging_record.record_type == 'checklist_question_record' ) {
					db = riskmachDatabasesFactory.databases.collection.checklist_question_records;
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

				if( staging_record.record_type == 'qc_check_record' ) {
					db = riskmachDatabasesFactory.databases.collection.qc_check_records;
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

				// REMOVE SYNCED BOOLEAN IF NOT QC RECORD
				if( staging_record.record.hasOwnProperty('synced') && staging_record.record_type != 'qc_check_record' ) {
					staging_record.record.synced = null;
				}
				// REMOVE IMPORTED BOOLEAN
				if( staging_record.record.hasOwnProperty('imported') ) {
					staging_record.record.imported = null;
				}

				db.put(staging_record.record).then(function(result) {
					staging_record.record._id = result.id;
					staging_record.record._rev = result.rev;

					// IF RECORD TYPE PROJECT AND PROJECT IS MR AUDIT
					if( staging_record.record_type == 'project' ) {

						if( staging_record.record.hasOwnProperty('is_managed_risk_audit') && staging_record.record.is_managed_risk_audit == 'Yes' ) {

							// MARK MR AUDIT NOT LATEST
							factory.dbUtils.markMrAuditImported(staging_record.record).then(function() {
								defer.resolve(staging_record);
							}, function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}

						if( staging_record.record.hasOwnProperty('cloned_from_modified_id') && staging_record.record.cloned_from_modified_id ) {

							// CLEAR WORKING PROJECT ID ON ORIG PROJECT
							rmUtilsFactory.sync_prep_utils.clearWorkingProjectId(staging_record.record.cloned_from_modified_id).then(function() {
								defer.resolve(staging_record);
							}, function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}
					}

					if( child_record_applicable_stages.indexOf(staging_record.record_type) !== -1 ) {
						factory.dbUtils.markStagedRecordChildsContentsImported(staging_record).then(function() {
							console.log("MARKED " + staging_record.record_type + " CHILDS IMPORT COMPLETED");

							defer.resolve(staging_record);
						}, function(error) {
							console.log("ERROR MARKING " + staging_record.record_type + " CHILDS IMPORT COMPLETED");
							defer.reject(error);
						});
					} else {
						defer.resolve(staging_record);
					}

				}).catch(function(error) {
					console.log(staging_record);
					console.log("ERROR MARKING " + staging_record.record_type + " CONTENT IMPORTED");
					defer.reject(error);
				});

				return defer.promise;
			}, 
			markMrAuditImported: function(project_record) {
				var defer = $q.defer();

				if( !project_record.hasOwnProperty('managed_risk_id') || !project_record.managed_risk_id ) {
					defer.resolve(project_record);
					return defer.promise;
				}

				riskmachDatabasesFactory.databases.collection.assessments.get(project_record.managed_risk_id).then(function(doc) {

					doc.date_record_synced = new Date().getTime();
					doc.date_content_synced = new Date().getTime();
					doc.date_record_imported = new Date().getTime();
					doc.date_content_imported = new Date().getTime();
					doc.record_modified = 'Yes';
					doc.latest_local_audit_mr_copy = null;

					riskmachDatabasesFactory.databases.collection.assessments.post(doc, {force: true}).then(function(result) {

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
			markStagedRecordChildsContentsImported: function(staging_record) {
				var defer = $q.defer();

				if( staging_record.record_type == 'checklist_instance' ) {

					if( staging_record.record.hasOwnProperty('is_uaudit') && staging_record.record.is_uaudit == 'Yes' ) {
						
						factory.dbUtils.markUAuditContentsImported(staging_record.record).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});

					} else {
						defer.resolve();
					}

				}

				return defer.promise;
			},
			markUAuditContentsImported: function(checklist_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;

				db.get(checklist_record.checklist_instance_json_id).then(function(doc) {

					doc.date_content_imported = new Date().getTime();

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

						console.log("MARKED UAUDIT CONTENTS IMPORTED");

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
			},
			project: {
				saveProjectImportResult: function(record, result) {
					var defer = $q.defer();

					console.log( JSON.stringify(result, null, 2) );
					// alert("Project import result");

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
					record.rm_id = parseInt(result.rm_record.ActivityID);

					// UPDATE FACILITATOR TOKEN/PIN VALUES
					if( result.rm_record.hasOwnProperty('FacilitatorToken') && result.rm_record.FacilitatorToken ) {
						record.facilitator_token = result.rm_record.FacilitatorToken;
					}

					if( result.rm_record.hasOwnProperty('FacilitatorPIN') && result.rm_record.FacilitatorPIN ) {
						record.facilitator_pin = result.rm_record.FacilitatorPIN;
					}

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
				},
				updateProjectReviewId: function(review_id) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.projects;

					factory.sync_collection.staging.project_record.record.review_id = review_id;

					db.put(factory.sync_collection.staging.project_record.record).then(function(result) {

						factory.sync_collection.staging.project_record.record._id = result.id;
						factory.sync_collection.staging.project_record.record._rev = result.rev;

						console.log("PROJECT REVIEW ID UPDATED: " + review_id);

						defer.resolve();

					}).catch(function(error) {
						defer.reject(error);
					});

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
					record.rm_parent_asset_id = result.rm_parent_asset_id;

					if( record.rm_parent_asset_id !== null )
					{
						record.rm_parent_asset_id = parseInt(record.rm_parent_asset_id);
					}

					if( result.rm_record.RecordID == '0' || result.rm_record.RecordID == 0 ) {
						record.rm_record_id = null;
					} else {
						record.rm_record_id = parseInt(result.rm_record.RecordID);
					}

					if( result.rm_record.hasOwnProperty('ActivityID') && result.rm_record.ActivityID ) {
						record.rm_project_id = result.rm_record.ActivityID;
					}

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.assets.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;

						if( record.hasOwnProperty('started_from_due_inspection') && record.started_from_due_inspection == 'Yes' && record.hasOwnProperty('ipp_record_id') && record.ipp_record_id ) {
							
							factory.clearIppRecordInspection(record.ipp_record_id).then(function() {
								defer.resolve(record);
								console.log("UPDATED IMPORT ASSET RESULT AND MARKED IPP RECORD REPORTING");
							}, function(error) {
								defer.reject(error);
							});

						} else {
							defer.resolve(record);
							console.log("UPDATED IMPORT ASSET RESULT");
						}

					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT ASSET RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			contractor: {
				saveContractorImportResult: function(record, result) {
					var defer = $q.defer();

					console.log( JSON.stringify(result, null, 2) );
					// alert("Task import result");

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.status = 2;

						riskmachDatabasesFactory.databases.collection.contractors.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);
							console.log("UPDATED IMPORT CONTRACTOR RESULT WITH DELETION");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT CONTRACTOR RESULT WITH DELETION: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE LOCAL VALUES
					record.rm_id = parseInt(result.rm_record.ContractorID);
					record.rm_asset_id = parseInt(result.rm_record.AssetID);
					record.rm_record_asset_id = parseInt(result.rm_record.RecordAssetID);

					// RM REGISTER CONTRACTOR ID

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.contractors.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT CONTRACTOR RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT CONTRACTOR RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			permit: {
				savePermitImportResult: function(record, result) {
					var defer = $q.defer();

					console.log( JSON.stringify(result, null, 2) );
					// alert("Task import result");

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.status = 2;

						riskmachDatabasesFactory.databases.collection.permits.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);
							console.log("UPDATED IMPORT PERMIT RESULT WITH DELETION");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT PERMIT RESULT WITH DELETION: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE LOCAL VALUES
					record.rm_id = parseInt(result.rm_record.PermitID);
					record.rm_asset_id = parseInt(result.rm_record.AssetID);
					record.rm_record_asset_id = parseInt(result.rm_record.RecordAssetID);

					// RM CONTRACTOR ID
					// RM REGISTER CONTRACTOR ID

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.permits.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT PERMIT RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT PERMIT RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			task: {
				saveTaskImportResult: function(record, result) {
					var defer = $q.defer();

					console.log( JSON.stringify(result, null, 2) );
					// alert("Task import result");

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null || !result.rm_record.TaskID || !result.rm_record.Ref ) {
						record.status = 2;

						riskmachDatabasesFactory.databases.collection.tasks.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);
							console.log("UPDATED IMPORT TASK RESULT");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT TASK RESULT: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE LOCAL VALUES
					record.rm_id = parseInt(result.rm_record.TaskID);
					record.rm_ref = parseInt(result.rm_record.Ref);
					record.revision_number = parseInt(result.rm_record.RevisionNumber);
					record.rm_asset_id = parseInt(result.rm_record.AssetID);
					record.rm_record_asset_id = parseInt(result.rm_record.RecordAssetID);

					if( result.parent_task_id != null && result.parent_task_id != '' && result.parent_task_id != 0 ) {
						record.rm_parent_task_id = parseInt(result.parent_task_id);
					}

					if( result.parent_task_ref != null && result.parent_task_ref != '' && result.parent_task_ref != 0 ) {
						record.rm_parent_task_ref = parseInt(result.parent_task_ref);
					}

					if( result.procedure_id != null && result.procedure_id != '' && result.procedure_id != 0 ) {
						record.rm_procedure_id = parseInt(result.procedure_id);
					}
					
					if( result.procedure_ref != null && result.procedure_ref != '' && result.procedure_ref != 0 ) {
						record.rm_procedure_ref = parseInt(result.procedure_ref);
					}

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.tasks.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT TASK RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT TASK RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			assessment: {
				saveRiskAssessmentImportResult: function(record, result) {
					var defer = $q.defer();

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

					if( result.rm_record.CreatedBy ) {
						record.added_by = parseInt(result.rm_record.CreatedBy);
					}

					if( result.rm_record.ModifiedBy ) {
						record.modified_by = parseInt(result.rm_record.ModifiedBy);
					}

					if( result.rm_record.SuggestedRiskID ) {
						record.rm_suggested_risk_id = parseInt(result.rm_record.SuggestedRiskID);
					}

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
			checklist_instance: {
				saveChecklistInstanceImportResult: function(record, result) {
					var defer = $q.defer();

					console.log( JSON.stringify(result, null, 2) );
					// alert("Checklist instance import result");

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.status = 2;

						riskmachDatabasesFactory.databases.collection.checklist_instances.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);
							console.log("UPDATED IMPORT CHECKLIST RESULT");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT CHECKLIST RESULT: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE LOCAL VALUES
					record.rm_id = parseInt(result.rm_record.ChecklistRecordID);
					record.rm_asset_id = parseInt(result.rm_record.AssetID);

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.checklist_instances.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT CHECKLIST RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT CHECKLIST RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			checklist_instances_json: {
				updateChecklistInstanceJsonRecord: function(json_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;

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
			checklist_question_record: {
				saveChecklistQuestionImportResult: function(record, result) {
					var defer = $q.defer();

					console.log( JSON.stringify(result, null, 2) );
					// alert("Checklist question import result");

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.status = 2;

						riskmachDatabasesFactory.databases.collection.checklist_question_records.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);
							console.log("UPDATED IMPORT CHECKLIST QUESTION RESULT");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT CHECKLIST QUESTION RESULT: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE LOCAL VALUES
					record.rm_id = parseInt(result.rm_record.QuestionRecordID);
					record.rm_checklist_record_id = parseInt(result.rm_record.ChecklistRecordID);

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.checklist_question_records.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT CHECKLIST QUESTION RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT CHECKLIST QUESTION RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			ra_question_relation: {
				saveQuestionAssessmentRelationImportResult: function(record, result) {
					var defer = $q.defer();

					console.log( JSON.stringify(result, null, 2) );
					// alert("QRA relation import result");

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.status = 2;

						riskmachDatabasesFactory.databases.collection.ra_question_relations.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);
							console.log("UPDATED IMPORT QUESTION ASSESSMENT RELATION RESULT");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT QUESTION ASSESSMENT RELATION RESULT: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE LOCAL VALUES
					record.rm_id = parseInt(result.rm_record.ChecklistRAID);
				    
				    record.rm_checklist_record_id = parseInt(result.rm_record.ChecklistRecordID);
					record.rm_question_id = parseInt(result.rm_record.QuestionID);
				    record.rm_question_record_id = parseInt(result.question_record_id);
					record.rm_assessment_id = parseInt(result.rm_record.RiskAssessmentID);
				    record.rm_assessment_ref = parseInt(result.assessment_ref);
				    record.rm_answer_record_id = parseInt(result.rm_record.AnswerRecordID);

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.ra_question_relations.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT QUESTION ASSESSMENT RELATION RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT QUESTION ASSESSMENT RELATION RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			ra_control_item_relation: {
				saveAssessmentControlItemRelationImportResult: function(record, result) {
					var defer = $q.defer();

					// UPDATE IMPORT VALUES
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('rm_record') || result.rm_record == null ) {
						record.status = 2;

						riskmachDatabasesFactory.databases.collection.ra_control_item_relations.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);
							console.log("UPDATED IMPORT ASSESSMENT CONTROL ITEM RELATION RESULT");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT ASSESSMENT CONTROL ITEM RELATION RESULT: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE LOCAL VALUES
					record.rm_id = parseInt(result.rm_record.ID);
					record.rm_control_item_id = parseInt(result.rm_record.ControlItemID);
				    record.rm_control_item_ref = parseInt(result.control_item_ref);
					record.rm_assessment_id = parseInt(result.rm_record.AssessmentID);
				    record.rm_assessment_ref = parseInt(result.assessment_ref);

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.ra_control_item_relations.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT ASSESSMENT CONTROL ITEM RELATION RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT ASSESSMENT CONTROL ITEM RELATION RESULT: " + error);
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

					// SET CLOUD MEDIA PATH
					record.media_path = result.media_path;
					
					record.file_download_rm_id = parseInt(result.rm_record.ID);

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					// IF IS SIGNATURE AND TASK
					// UPDATE TASK RM SIGNATURE VALUES
					// if( record.hasOwnProperty('is_signature') && record.is_signature == 'Yes' && record.record_type == 'task' ) {

					// }

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
			},
			qc_check_records: {
				saveQualityCheckRecordImportResult: function(record, result) {
					var defer = $q.defer();

					var update_project_review_id = false;

					var db = riskmachDatabasesFactory.databases.collection.qc_check_records;

					if( result.hasOwnProperty('check_record') && result.check_record ) {
						record.ID = result.check_record.ID;
						record.ReviewID = result.check_record.ReviewID;

						// IF THERE IS A NEW REVIEW FOR PROJECT
						if( factory.sync_collection.staging.project_record.record.review_id != result.check_record.ReviewID ) {
							update_project_review_id = true;
						}
					}

					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					db.put(record).then(function(save_result) {
						record._id = save_result.id;
						record._rev = save_result.rev;

						console.log("UPDATED QC RECORD WITH IMPORT RESULT");

						// IF PROJECT HAS NEW REVIEW
						if( update_project_review_id ) {

							factory.dbUtils.project.updateProjectReviewId(record.ReviewID).then(function() {
								defer.resolve();
							}, function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}

						defer.resolve();

					}).catch(function(error) {
						console.log("ERROR UPDATING QC RECORD WITH IMPORT RESULT");
						defer.reject(error);
					});

					return defer.promise;
				}
			}
		};

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

		factory.post_import_updates = {
			stages: ['uaudit_media','task_signature_ids'],
			start: function() {
				var defer = $q.defer();
				var save_defer = $q.defer();

				console.log("START POST IMPORT UPDATES");

				runNextUpdate(save_defer, 0).then(function() {

					console.log("FINISHED POST IMPORT UPDATES");

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function runNextUpdate(defer, active_index) {

					if( active_index > factory.post_import_updates.stages.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					if( factory.post_import_updates.stages[active_index] == 'uaudit_media' ) {
						var db_update_only = false;
						factory.post_import_updates.updateCollectedUAuditJsonMedia(db_update_only).then(function() {

							active_index++;

							runNextUpdate(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( factory.post_import_updates.stages[active_index] == 'task_signature_ids' ) {
						factory.post_import_updates.updateTaskRmSignatureValues().then(function() {

							active_index++;

							runNextUpdate(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					return defer.promise;
				}

				return defer.promise;
			},
			updateTaskRmSignatureValues: function() {
				var defer = $q.defer();
				var save_defer = $q.defer();

				console.log("START UPDATE TASK RM SIG VALUES");

				// FIND STAGED MEDIA
				var media = factory.utils.findStagedImportRecords('media');

				console.log("FOUND MEDIA");
				console.log(media);

				// FIND SIGNATURES
				var signatures = [];
				var i = 0;
				var len = media.length;
				while(i < len) {

					if( media[i].record.hasOwnProperty('is_signature') && media[i].record.is_signature == 'Yes' ) {
						signatures.push(media[i].record);
					}

					i++;
				}

				console.log("FOUND SIGNATURES");
				console.log(signatures);

				// IF NO SIGNATURES
				if( signatures.length == 0 ) {
					defer.resolve();
					return defer.promise;
				}

				updateNextTask(save_defer, 0).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function updateNextTask(defer, active_index) {

					if( active_index > signatures.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					factory.post_import_updates.doUpdateTaskRmSignatureValues(signatures[active_index]).then(function() {

						active_index++;

						updateNextTask(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			doUpdateTaskRmSignatureValues: function(sig_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.tasks;

				// FIND THE TASK RECORD
				var task_doc = factory.utils.findStagedImportRecord(sig_record.record_id, 'task');

				if( !task_doc ) {
					defer.resolve("Couldn't find the task record");
					return defer.promise;
				}

				// UPDATE TASK WITH RM SIG VALUES
				if( sig_record.rm_id ) {
					task_doc.rm_signature_id = parseInt(sig_record.rm_id);
				}

				if( sig_record.rm_ref ) {
					task_doc.rm_signature_ref = parseInt(sig_record.rm_ref);
				}

				console.log("TASK RECORD TO SAVE");
				console.log(task_doc);

				db.put(task_doc).then(function(result) {
					
					task_doc._id = result.id;
					task_doc._rev = result.rev;

					defer.resolve(task_doc);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			updateCollectedUAuditJsonMedia: function(db_update_only) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var next_index = 0;

				updateNextUAuditInstance(save_defer).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function updateNextUAuditInstance(defer) {

					var next_uaudit_key = null;
					var index_counter = -1;

					Object.keys(factory.sync_collection.staging.uaudit_instance_media).forEach(function(current_key){
						
						index_counter++;

						if( index_counter == next_index ) {
							next_uaudit_key = current_key;
						}

					});

					if( !next_uaudit_key ) {
						defer.resolve();
						return defer.promise;
					}

					factory.post_import_updates.fetchUAuditData(next_uaudit_key).then(function(data) {

						// DO WE NEED TO WAIT FOR THIS?...
						factory.post_import_updates.decorateUAuditJsonMedia(data.instance_json_record);

						factory.import_requests.requestUpdateUAuditJson(data.checklist_instance.mid_record_id, data.instance_json_record, db_update_only).then(function() {

							// UPDATE JSON RECORD WITH DECORATED JSON
							factory.dbUtils.checklist_instances_json.updateChecklistInstanceJsonRecord(data.instance_json_record).then(function() {

								next_index++;

								updateNextUAuditInstance(defer);

							}, function(error) {
								defer.reject(error);
							});

						}, function(error) {
							defer.reject(error);
						});

						// factory.post_import_updates.decorateUAuditJsonMedia(instance_json_record).then(function() {

						// 	factory.import_requests.requestUpdateUAuditJson(instance_json_record).then(function() {

						// 		next_index++;

						// 		updateNextUAuditInstance(defer);

						// 	}, function(error) {
						// 		defer.reject(error);
						// 	});

						// }, function(error) {
						// 	defer.reject(error);
						// });

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			fetchUAuditData: function(checklist_instance_id) {
				var defer = $q.defer();

				var data = {
					checklist_instance: null, 
					instance_json_record: null
				}

				data.checklist_instance = factory.utils.findStagedImportRecord(checklist_instance_id, 'checklist_instance');

				factory.fetchCollection.uAuditJsonRecord(data.checklist_instance.checklist_instance_json_id).then(function(instance_json_record) {

					data.instance_json_record = instance_json_record;

					defer.resolve(data);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			decorateUAuditJsonMedia: function(instance_json_record) {

				var media_ids = [];

				if( factory.sync_collection.staging.uaudit_instance_media.hasOwnProperty(instance_json_record.checklist_instance_id) ) {
					media_ids = factory.sync_collection.staging.uaudit_instance_media[instance_json_record.checklist_instance_id];
				}

				// NO MEDIA TO DECORATE
				if( !media_ids.length ) {
					return;
				}

				// COLLECT MEDIA RECORDS FROM STAGED IMPORT RECORDS
				var uaudit_media = factory.post_import_updates.findStagedImportUAuditMedia(media_ids);

				// PARSE FOR MANIPULATION
				// instance_json_record.uaudit_instance_data = JSON.parse(instance_json_record.uaudit_instance_data);
				var uaudit_json = JSON.parse(instance_json_record.uaudit_instance_data);

				// DO DECORATE JSON
				factory.post_import_updates.doDecorateUAuditJsonMedia(uaudit_json, uaudit_media);

				// STRINGIFY FOR RE-IMPORT
				instance_json_record.uaudit_instance_data = JSON.stringify(uaudit_json);

				// CLEAN UP
				uaudit_media = null;
				uaudit_json = null;
			},
			doDecorateUAuditJsonMedia: function(uaudit_data, uaudit_media) {

				console.log("IMPORTED UAUDIT MEDIA")
				console.log(JSON.stringify(uaudit_media, null, 2));

				var media_i = 0;
				var media_len = uaudit_media.length;

				while(media_i < media_len) {

					decorateNextMedia(uaudit_media[media_i]);

					media_i++;
				}

				function decorateNextMedia(imported_media_record) {

					// SET FILE_URL PROPERTY
					imported_media_record.file_url = imported_media_record.media_path;

					// UPDATE QUESTION COLLECTION
					if( imported_media_record.record_type == 'question_response_image' ) {

						angular.forEach(uaudit_data.pages.collection, function(page_record, page_index){

							//CREATE INIT QUESTIONS ARRAY FOR EACH SECTION
							angular.forEach( page_record.sections, function(section_record, section_index){

								//IF THE QUESTION IS INIT THEN ADD TO SECTION INIT COLLECTION
								angular.forEach( section_record.questions, function(question_record, question_index){

									if( question_record.hasOwnProperty('response') && question_record.response ) {

										//ADD EACH QUESTION RESPONSE MEDIA TO COLLECTION
										question_record.response.media.forEach(function(media_record, media_index){

											// FIND AND UPDATE MEDIA DOC BY UUID
											if( media_record.id == imported_media_record.id ) {

												console.log("FOUND MEDIA DOC BY UUID");
												console.log(media_record);
												console.log(imported_media_record);

												uaudit_data.pages.collection[page_index].sections[section_index].questions[question_index].response.media[media_index] = angular.copy(imported_media_record);
		 
											}

										});

									}

								});

							});

						});

					}

					if( imported_media_record.record_type == 'action' ) {

						angular.forEach(uaudit_data.actions.collection, function(action_record, action_index) {

							if( action_record.hasOwnProperty('media') && action_record.media ) {

								//ADD EACH ACTION MEDIA TO COLLECTION
								action_record.media.forEach(function(a_media_record, a_media_index){

									// FIND AND UPDATE MEDIA DOC BY UUID
									if( a_media_record.id == imported_media_record.id ) {

										console.log("FOUND ACTION MEDIA DOC BY UUID");
										console.log(a_media_record);
										console.log(imported_media_record);

										uaudit_data.actions.collection[action_index].media[a_media_index] = angular.copy(imported_media_record);
									}

								});

							}

						});

						angular.forEach(uaudit_data.pages.collection, function(page_record, page_index){

							//CREATE INIT QUESTIONS ARRAY FOR EACH SECTION
							angular.forEach( page_record.sections, function(section_record, section_index){

								//IF THE QUESTION IS INIT THEN ADD TO SECTION INIT COLLECTION
								angular.forEach( section_record.questions, function(question_record, question_index){

									if( question_record.hasOwnProperty('response') && question_record.response && question_record.response.hasOwnProperty('actions') && question_record.response.actions ) {

										angular.forEach(question_record.response.actions, function(action_record, action_index) {

											if( action_record.hasOwnProperty('media') && action_record.media ) {

												//ADD EACH ACTION MEDIA TO COLLECTION
												action_record.media.forEach(function(a_media_record, a_media_index){

													// FIND AND UPDATE MEDIA DOC BY UUID
													if( a_media_record.id == imported_media_record.id ) {

														console.log("FOUND ACTION MEDIA DOC BY UUID");
														console.log(a_media_record);
														console.log(imported_media_record);

														uaudit_data.pages.collection[page_index].sections[section_index].questions[question_index].response.actions[action_index].media[a_media_index] = angular.copy(imported_media_record);
													}

												});

											}

										});

									}

								});

							});

						});

					}

					// DECORATE GLOBAL MEDIA COLLECTION
					angular.forEach(uaudit_data.media.collection, function(g_media_record, g_media_index){

						// FIND AND UPDATE MEDIA DOC BY UUID
						if( g_media_record.id == imported_media_record.id ) {

							uaudit_data.media.collection[g_media_index] = angular.copy(imported_media_record);

						}

					});

				}

			},
			findStagedImportUAuditMedia: function(media_ids) {
				var uaudit_media = [];

				var i = 0;
				var len = media_ids.length;

				while(i < len) {
					var media_record = null;

					media_record = factory.utils.findStagedImportRecord(media_ids[i], 'media');

					uaudit_media.push(media_record);

					// CLEAN UP
					media_record = null;

					i++;
				}

				return uaudit_media;
			}
		}

		factory.isProjectClaimed = function(project) 
		{
			var defer = $q.defer();

			if( !project.hasOwnProperty('rm_id') || !project.rm_id ) {
				defer.resolve();
				return defer.promise;
			}

			$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/UserHasClaimedProjectRequirement',{
	            params: {
            		activity_id: project.rm_id
            	}
            })
			.success(function(data, status, headers, config) {

				if( data.error ) {
					defer.reject(data.error_messages[0]);
				} else {

					if( !data.has_claimed ) {
						defer.reject("Someone else has now claimed this inspection");
					} else {
						defer.resolve();
					}

				}
            })
            .error(function(data, status, headers, config) {
            	defer.reject("Error connecting to API to check if project is claimed. Please check your connection");
			});

			return defer.promise;
		}

		factory.preSyncChecks = function(project, create_report) 
		{
			var defer = $q.defer();
			var check_defer = $q.defer();

			factory.pre_sync_checks.resetErrors();

			var project_id = project._id;

			runNextCheck(check_defer, factory.pre_sync_checks.data.stages, 0).then(function(stages) {

				factory.pre_sync_checks.data.stages = stages;

				// IF ANY STAGES HAD ERROR, SET CHECK AS ERRORED
				angular.forEach(factory.pre_sync_checks.data.stages, function(st, st_index) {
					if( st.error ) {
						factory.pre_sync_checks.data.error = true;
					}
				});

				defer.resolve(factory.pre_sync_checks.data);

			}, function(error) {
				defer.reject(error);
			});

			function runNextCheck(defer, stages, stage_index) {

				if( stage_index > stages.length - 1 ) {
					defer.resolve(stages);
					return defer.promise;
				}

				if( stages[stage_index].name == 'incomplete_re_inspections' ) {
					// IF PROJECT IS BASIC OBS, SKIP THIS CHECK
					if( project.hasOwnProperty('pp_id') && (project.pp_id == 36 || project.pp_id == '36') ) {
						
						stage_index++;
						runNextCheck(defer, stages, stage_index);

						return defer.promise;
					}

					// IF STAGE IS SET TO SKIP
					if( stages[stage_index].skip ) {
						stage_index++;
						runNextCheck(defer, stages, stage_index);

						return defer.promise;
					}

					factory.checkProjectIncompleteReInspections(project_id).then(function(data) {

						stages[stage_index].error = data.error;
						stages[stage_index].error_message = data.error_message;
						stages[stage_index].resolve_message = data.resolve_message;

						stage_index++;

						runNextCheck(defer, stages, stage_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( stages[stage_index].name == 'basic_obs_snapshots' ) {
					// IF NOT BASIC OBS PROJECT
					if( !project.hasOwnProperty('pp_id') || project.pp_id != 36 || project.pp_id != '36' ) {

						stage_index++;
						runNextCheck(defer, stages, stage_index);

						return defer.promise;
					}

					// IF STAGE IS SET TO SKIP
					if( stages[stage_index].skip ) {
						stage_index++;
						runNextCheck(defer, stages, stage_index);

						return defer.promise;
					} 

					factory.updateSnapshotsRegisterAssetRmId(project_id).then(function() {

						// DON'T ERROR, UPDATES HAVE RUN
						stages[stage_index].error = false;
						stages[stage_index].error_message = null;
						stages[stage_index].resolve_message = null;

						stage_index++;

						runNextCheck(defer, stages, stage_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( stages[stage_index].name == 'draft_risk_assessments' ) {
					// IF PROJECT IS BASIC OBS, SKIP THIS CHECK
					if( project.hasOwnProperty('pp_id') && (project.pp_id == 36 || project.pp_id == '36') ) {
						
						stage_index++;
						runNextCheck(defer, stages, stage_index);

						return defer.promise;
					}

					// IF STAGE IS SET TO SKIP
					if( stages[stage_index].skip ) {
						stage_index++;
						runNextCheck(defer, stages, stage_index);

						return defer.promise;
					}

					factory.checkProjectDraftRiskAssessments(project_id, create_report).then(function(data) {

						stages[stage_index].error = data.error;
						stages[stage_index].error_message = data.error_message;
						stages[stage_index].resolve_message = data.resolve_message;

						stage_index++;

						runNextCheck(defer, stages, stage_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;
			}

			return defer.promise;
		}

		factory.checkProjectIncompleteReInspections = function(project_id) 
		{
			var defer = $q.defer();

			var data = {
				error: false,
				error_message: null,
				resolve_message: null
			};

			var num_incomplete_re_inspections = 0;

			riskmachDatabasesFactory.databases.collection.assets.find({
				selector: {
					table: 'assets',
					user_id: authFactory.cloudUserId(),
					project_id: project_id,
					re_inspection_asset: 'Yes'
				}
			}).then(function(result) {

				if( result.docs.length == 0 ) {
					defer.resolve(data);
					return defer.promise;
				}

				angular.forEach(result.docs, function(asset_record, asset_index) {

					// IF REINSPECTION ASSET IS LIVE AND DATA IS NOT DOWNLOADED
					if( asset_record.status == 1 && !asset_record.re_inspection_data_downloaded ) {
						num_incomplete_re_inspections++;
					}

				});

				if( num_incomplete_re_inspections > 0 ) {
					data.error = true;
					data.error_message = 'There are ' + num_incomplete_re_inspections + ' incomplete re-inspections in this project';
					data.resolve_message = 'Please delete these re-inspections or go back into the project and complete them before syncing';
				}

				defer.resolve(data);

			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.deleteProjectIncompleteReInspections = function(project_id) 
		{
			var defer = $q.defer();

			var data = {
				error: false,
				error_message: null
			};

			var num_incomplete_re_inspections = 0;

			riskmachDatabasesFactory.databases.collection.assets.find({
				selector: {
					table: 'assets',
					user_id: authFactory.cloudUserId(),
					project_id: project_id,
					re_inspection_asset: 'Yes'
				}
			}).then(function(result) {

				if( result.docs.length == 0 ) {
					defer.resolve();
					return defer.promise;
				}

				deleteNextAsset(result.docs, 0);

				function deleteNextAsset(assets, asset_index) {

					if( asset_index > assets.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					if( assets[asset_index].re_inspection_data_downloaded ) {
						asset_index++;
						deleteNextAsset(assets, asset_index);
						return defer.promise;
					}

					assets[asset_index].status = 2;

					riskmachDatabasesFactory.databases.collection.assets.put(assets[asset_index]).then(function(result) {

						assets[asset_index]._id = result.id;
						assets[asset_index]._rev = result.rev;

						asset_index++;

						deleteNextAsset(assets, asset_index);

					}).catch(function(error) {
						defer.reject(error);
					});
				}

			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.updateSnapshotsRegisterAssetRmId = function(project_id) 
		{
			var defer = $q.defer();

			factory.fetchCollection.projectAssets(project_id).then(function(snapshots) {

				if( snapshots.length == 0 ) {
					defer.resolve();
					return defer.promise;
				}

				var filtered_snapshots = [];
				var i = 0;
				while(i < snapshots.length) {
					if( !snapshots[i].hasOwnProperty('rm_register_asset_id') || !snapshots[i].rm_register_asset_id ) {
						filtered_snapshots.push(snapshots[i]);
					}

					i++;
				}

				factory.setRegisterAssetIdOnSnapshots(filtered_snapshots).then(function(decorated_snapshots) {

					factory.saveSnapshotsRegisterAssetRmId(decorated_snapshots).then(function() {

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

		factory.setRegisterAssetIdOnSnapshots = function(snapshots) 
		{
			var defer = $q.defer();
			var fetch_defer = $q.defer();

			if( snapshots.length == 0 ) {
				defer.resolve(snapshots);
				return defer.promise;
			}

			var db = riskmachDatabasesFactory.databases.collection.register_assets;
			var options = {
				limit: 100, 
				include_docs: true
			};

			fetchNextPage(fetch_defer, snapshots).then(function() {
				console.log("DECORATED SNAPSHOTS");
				console.log(snapshots);
				defer.resolve(snapshots);
			}, function(error) {
				defer.reject(error);
			});

			function fetchNextPage(defer, snapshots) {

				db.allDocs(options).then(function(result) {

					if( result && result.rows.length > 0 ) {

						var core_i = 0;
						var core_len = result.rows.length;

						// var snapshots_i = 0;
						// var snapshots_len = snapshots.length;

						// LOOP THROUGH FETCHED CORE ASSETS
						while(core_i < core_len) {

							var snapshots_i = 0;
							
							// LOOP THROUGH SNAPSHOTS AND ATTEMPT FIND CORE ASSET
							while(snapshots_i < snapshots.length) {

								// IF SNAPSHOT BELONGS TO ACTIVE CORE ASSET
								if( snapshots[snapshots_i].register_asset_id == result.rows[core_i].doc._id ) {

									// IF CORE ASSET HAS RMID, SET SNAPSHOT RMREGISTERASSETID
									if( result.rows[core_i].doc.hasOwnProperty('rm_id') && result.rows[core_i].doc.rm_id ) {
										snapshots[snapshots_i].rm_register_asset_id = parseInt(result.rows[core_i].doc.rm_id);
									}

								}

								snapshots_i++;
							}

							core_i++;
						}

						options.startkey = result.rows[ result.rows.length - 1 ].id;
						options.skip = 1;

						result.rows = null;

						fetchNextPage(defer, snapshots);

					} else {
						// PAGINATION FINISHED, RESOLVE
						defer.resolve();
					}

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}

			return defer.promise;
		}

		factory.saveSnapshotsRegisterAssetRmId = function(snapshots) 
		{
			var defer = $q.defer();
			var save_defer = $q.defer();

			saveNextRecord(save_defer, snapshots, 0).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function saveNextRecord(defer, snapshots, snapshot_index) {

				if( snapshot_index > snapshots.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				riskmachDatabasesFactory.databases.collection.assets.put(snapshots[snapshot_index]).then(function(result) {

					snapshots[snapshot_index]._id = result.id;
					snapshots[snapshot_index]._rev = result.rev;

					snapshot_index++;

					saveNextRecord(defer, snapshots, snapshot_index);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}

			return defer.promise;
		}

		factory.checkProjectDraftRiskAssessments = function(project_id, create_report) 
		{
			var defer = $q.defer();

			var data = {
				error: false,
				error_message: null, 
				resolve_message: null
			}

			var asset_db = riskmachDatabasesFactory.databases.collection.assets;
			var risk_db = riskmachDatabasesFactory.databases.collection.assessments;

			var num_draft_assessments = 0;

			// FIND ALL PROJECT ASSETS
			asset_db.find({
				selector: {
					project_id: project_id, 
					table: 'assets',
					user_id: authFactory.cloudUserId()
				}
			}).then(function(asset_result) {

				// FIND DELETED ASSETS
				var deleted_asset_ids = [];
				var a_i = 0;
				var a_len = asset_result.docs.length;
				while(a_i < a_len) {

					if( asset_result.docs[a_i].hasOwnProperty('status') && asset_result.docs[a_i].status == 2 ) {
						deleted_asset_ids.push(asset_result.docs[a_i]._id);
					}

					a_i++;
				}

				// FIND ALL PROJECT ASSESSMENTS
				risk_db.find({
					selector: {
						activity_id: project_id,
						user_id: authFactory.cloudUserId(),
						company_id: authFactory.cloudCompanyId()
					}
				}).then(function(result) {
					// FILTER TO FIND DRAFT ASSESSMENTS
					var i = 0;
					var len = result.docs.length;

					while(i < len) {
						var errors = 0;

						// IF QUICK CAPTURE RISK
						if( result.docs[i].hasOwnProperty('quick_capture_risk') && result.docs[i].quick_capture_risk == 'Yes' ) {
							errors++;
						}

						// IF SUGGESTED RISKS
						if( result.docs[i].hasOwnProperty('is_suggested_risk') && result.docs[i].is_suggested_risk == 'Yes' ) {
							errors++;
						}

						// IF RA'S ASSET IS DELETED
						if( deleted_asset_ids.indexOf(result.docs[i].asset_id) !== -1 ) {
							errors++;
						}

						// IF NO FILTER ERRORS AND IS DRAFT
						if( errors == 0 && result.docs[i].hasOwnProperty('status') && result.docs[i].status == 4 ) {
							num_draft_assessments++;
						}

						i++;
					}

					if( num_draft_assessments > 0 ) {
						data.error = true;
						data.error_message = 'There are ' + num_draft_assessments + ' draft risk assessments in this project';

						// IF REPORTING, HAVE TO DELETE/PUBLISH THE RISKS
						// ELSE IT IS JUST A SOFT WARNING
						if( create_report == 'Yes' ) {
							data.resolve_message = 'Please delete these draft risk assessments or go back into the project and delete/publish them manually';
						} else {
							data.resolve_message = 'You can submit them as draft, delete them now or go back into the project and edit them manually';
						}
					}

					defer.resolve(data);

				}).catch(function(error) {
					defer.reject(error);
				});

			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.deleteProjectDraftRiskAssessments = function(project_id) 
		{
			var defer = $q.defer();
			var delete_defer = $q.defer();

			var draft_assessments = [];

			var db = riskmachDatabasesFactory.databases.collection.assessments;

			var selector = {
				activity_id: project_id,
				user_id: authFactory.cloudUserId(),
				company_id: authFactory.cloudCompanyId()
			}

			db.find({
				selector: selector
			}).then(function(result) {

				// FIND DRAFTS
				var i = 0;
				var len = result.docs.length;
				while(i < len) {

					if( result.docs[i].hasOwnProperty('status') && result.docs[i].status == 4 ) {
						draft_assessments.push(result.docs[i]);
					}

					i++;
				}

				// IF NO DRAFT RISK ASSESSMENTS FOUND
				if( draft_assessments.length == 0 ) {
					defer.resolve();
					return defer.promise;
				}

				deleteNextDraft(delete_defer, 0).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function deleteNextDraft(defer, active_index) {

					if( active_index > draft_assessments.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					draft_assessments[active_index].status = 8;
					draft_assessments[active_index].status_name = 'Deleted';

					// MARK RISK, ASSET AND PROJECT MODIFIED
					rmUtilsFactory.sync_decoration.assessments.riskAssessmentModified(draft_assessments[active_index]).then(function(modified_assessment) {
						
						draft_assessments[active_index] = modified_assessment;

						db.put(draft_assessments[active_index]).then(function(risk_result) {

							draft_assessments[active_index]._id = risk_result.id;
							draft_assessments[active_index]._rev = risk_result.rev;

							active_index++;

							deleteNextDraft(defer, active_index);

						}).catch(function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;	
				}

			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.markCoreProjectImported = function() 
		{
			var defer = $q.defer();

			factory.fetchCoreProject().then(function(core_project) {

				console.log("FETCH CORE PROJECT");
				console.log(core_project);

				if( !core_project ) {
					defer.resolve();
					return defer.promise;
				}

				factory.doMarkCoreProjectImported(core_project).then(function(saved_core_project) {
					defer.resolve(saved_core_project);
				}, function(error) {
					defer.reject(error);
				});
 
			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.fetchCoreProject = function() 
		{
			var defer = $q.defer();
			var fetch_defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.projects;
			var options = {
				limit: 100, 
				include_docs: true
			};

			var projects = [];

			fetchNextPage(fetch_defer).then(function() {

				if( projects.length == 0 ) {
					defer.resolve(null);
				} else {
					defer.resolve(projects[0]);
				}

			}, function(error) {
				defer.reject(error);
			});

			function fetchNextPage(defer) {

				db.allDocs(options).then(function(result) {

					if( result && result.rows.length > 0 ) {

						var filtered_array = [];

						var i = 0;
						var len = result.rows.length;

						while(i < len) {
							var errors = 0;

							if( !result.rows[i].doc.hasOwnProperty('core_project') || result.rows[i].doc.core_project != 'Yes' ) {
								errors++;
							}

							if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
								errors++;
							}

							if( !result.rows[i].doc.hasOwnProperty('client_id') || result.rows[i].doc.client_id != authFactory.getActiveCompanyId() ) {
								errors++;
							}
 
							if( errors == 0 ) {
								filtered_array.push(result.rows[i].doc);
							} 

							i++;
						}

						projects.push(...filtered_array);

						options.startkey = result.rows[ result.rows.length - 1 ].id;
						options.skip = 1;

						result.rows = null;
						filtered_array = null;

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

		factory.doMarkCoreProjectImported = function(doc) 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.projects;

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

				console.log("CORE PROJECT MARKED IMPORTED");
				console.log(doc);

				defer.resolve(doc);

			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.clearIppRecordInspection = function(ipp_record_id) 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.register_asset_ipp;

			// FETCH IPP RECORD
			factory.getIppRecord(ipp_record_id).then(function(doc) {

				if( !doc ) {
					console.log("COULDN'T FIND IPP RECORD INSPECTION WAS DONE AGAINST, SKIP");
					defer.resolve();
					return defer.promise;
				}

				factory.doClearIppRecordInspection(doc).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.doClearIppRecordInspection = function(doc) 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.register_asset_ipp;

			// CLEAR ACTIVE INSPECTION ON IPP RECORD
			doc.audit_started = null;
			doc.audit_id = null;

			doc.date_started = null; 
			doc.started_by_rm_id = null;
			doc.started_by_name = null;

			// UNPIN AUDIT
			doc.pinned = null;

			// MARK IPP RECORD SUGGESTED ONLINE REFRESH
			doc.requires_refresh = 'Yes';

			db.put(doc).then(function(result) {

				doc._id = result.id;
				doc._rev = result.rev;

				defer.resolve();

			}).catch(function(error) {
				console.log("ERROR UPDATING IPP RECORD INSPECTION WAS DONE AGAINST");
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.getIppRecord = function(ipp_record_id) 
		{
			var defer = $q.defer();

			if( !ipp_record_id ) {
				defer.resolve(null);
				return defer.promise;
			}

			var db = riskmachDatabasesFactory.databases.collection.register_asset_ipp;
				
			db.get(ipp_record_id).then(function(doc) {
				defer.resolve(doc);
			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.createReport = function(app_project_id, rm_project_id, report_data) 
		{
			var defer = $q.defer();

			factory.import_requests.createReport(rm_project_id, report_data).then(function(report_record) {

				if( !report_record ) {
					defer.resolve(null);
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.projects;
				db.get(app_project_id).then(function(project_doc) {

					// UPDATE PROJECT REPORT META
					project_doc.report_date = report_record.DateStarted;
					project_doc.report_id = report_record.ReportID;
					project_doc.report_ref = report_record.Ref;
					project_doc.report_ref_guid = report_record.RefGUID;
					project_doc.report_status = report_record.Status;

					// PUBLISHED REPORT
					if( project_doc.report_status == 5 ) {
						project_doc.report_status_name = 'Published';
					}

					// DRAFT REPORT
					if( project_doc.report_status == 7 ) {
						project_doc.report_status_name = 'Draft';
					}

					db.put(project_doc).then(function(result) {

						project_doc._id = result.id;
						project_doc._rev = result.rev;

						defer.resolve(project_doc);

					}).catch(function(error) {
						console.log("ERROR UPDATING PROJECT REPORT META");

						// resolve anyway
						defer.resolve(null);
					});

				}).catch(function(error) {
					console.log("ERROR FETCHING PROJECT RECORD TO UPDATE REPORT META");

					// resolve anyway
					defer.resolve(null);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.updateIqaQcComplete = function(project_record)  
		{
			var defer = $q.defer();
			var request_defer = $q.defer();

			if( !project_record.hasOwnProperty('review_id') || !project_record.review_id ) {
				defer.resolve();
				return defer.promise;
			}

			if( !project_record.hasOwnProperty('iqa_qc_complete') || project_record.iqa_qc_complete != 'Yes' ) {
				defer.resolve();
				return defer.promise;
			}

			var attempt_meta = {
				num_attempts: 0,
				attempt_limit: 3,
				last_error: null
			};

			doRequest(project_record, attempt_meta, request_defer).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function doRequest(project_record, attempt_meta, defer) {

				if( attempt_meta.num_attempts > attempt_meta.attempt_limit ) {
					defer.reject(attempt_meta.last_error);
					return defer.promise;
				}

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/SaveIQACompleteFlag',{
	            	params: {
	            		review_id: project_record.review_id, 
            			value: project_record.iqa_qc_complete
	            	}
	            })
				.success(function(data, status, headers, config) {

					if( data.error == true ) {

						//TRY AGAIN
						attempt_meta.num_attempts++;
						attempt_meta.last_error = data.error_messages[0];
	            		doRequest(project_record, attempt_meta, defer);

					} else {
						console.log("UPDATE IQA QC COMPLETE STATUS");
						console.log(data);

						defer.resolve();
					}
	            })
	            .error(function(data, status, headers, config) {
	            	//TRY AGAIN
	            	attempt_meta.num_attempts++;
	            	attempt_meta.last_error = "Error updating project IQA quality check complete status (id: "+ project_record.rm_id +")";
	            	doRequest(project_record, attempt_meta, defer);
				});

				return defer.promise;
			}

			return defer.promise;
		}

		factory.archiveIqaCompletedQc = function(project_id) 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.projects;

			db.get(project_id).then(function(project_doc) {

				// DELETE PROJECT
				project_doc.status = 4;

				db.put(project_doc).then(function(result) {

					project_doc._id = result.id;
					project_doc._rev = result.rev;

					defer.resolve(project_doc);

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

})();