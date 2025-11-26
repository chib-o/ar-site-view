(function() {
	var app = angular.module('riskmachManagedRiskUtils', ['riskmachDatabases','riskmachUtils','riskmachMedia','riskmachModels','riskmachCoreDownload','riskmachManagedRiskSync','angularUtils.directives.dirPagination']);
	app.controller('verifyControlItemController', verifyControlItemController);
	app.controller('coreAssetControlItemListingController', coreAssetControlItemListingController);
	app.controller('enterManagedRiskPageController', enterManagedRiskPageController);
	app.factory('managedRiskUtilsFactory', managedRiskUtilsFactory);
	app.directive('enterManagedRiskPage', enterManagedRiskPage);
	app.directive('coreAssetControlItemList', coreAssetControlItemList);
	app.directive('verifyControlItem', verifyControlItem);
	app.filter('initials', initials);

	app.config(function(paginationTemplateProvider) {
        paginationTemplateProvider.setPath('../common/tpl/dirPagination.tpl.html');
    });

	function verifyControlItemController($scope, $rootScope, $q, $filter, $sce, riskmachDatabasesFactory, authFactory, modelsFactory, rmUtilsFactory, rmConnectivityFactory, managedRiskUtilsFactory, managedRiskSyncFactory, mediaFactory) 
	{
		var vm = this;

		vm.utils = {
			directive_id: 'verifyControlItem',
			tabs: {
				active_tab: 'verify_control', 
				changeTab: function(tab) {
					vm.utils.tabs.active_tab = tab;
				},
				tabActive: function(tab) {
					if( vm.utils.tabs.active_tab == tab ) {
						return true;
					} else {
						return false;
					}
				}
			},
			verify_control: {
				control_item_id: null,
				record: null,
				loading: false,
				saving: false,
				media_records: [],
				error_handler: {
					error: false, 
					error_message: null, 
					logError: function(error) {
						vm.utils.verify_control.error_handler.error = true;
						vm.utils.verify_control.error_handler.error_message = error;
					}, 
					clear: function() {
						vm.utils.verify_control.error_handler.error = false;
						vm.utils.verify_control.error_handler.error_message = null;
					}
				},
				start: function() {

					vm.utils.tabs.changeTab('verify_control');

					console.log("CONTROL ITEM ID FOR VERIFICATION");
					console.log(vm.utils.verify_control.control_item_id);

					if( !vm.utils.verify_control.control_item_id ) {
						vm.utils.verify_control.error_handler.logError("No control item ID provided");
						return;
					}

					vm.utils.verify_control.getControlRecord().then(function() {

						// CLEAR CURRENT MEDIA
						vm.utils.control_media.media_records = [];
						vm.utils.control_media.visible_media = [];
						vm.utils.control_verification_media.media_records = [];
						vm.utils.control_verification_media.visible_media = [];

						// IF VERIFIED ON APP OR NOT A CLOUD DRAFT MANAGED RISK
						vm.utils.control_media.setRecord(vm.utils.verify_control.record);
						vm.utils.control_media.getAllRecordAttachments(vm.utils.control_media.record._id, 'control_item').then(function() {

							vm.utils.control_verification_media.setRecord(vm.utils.verify_control.record);
							vm.utils.control_verification_media.getAllRecordAttachments(vm.utils.control_verification_media.record._id, 'control_item_verification');

						});

						// BROADCAST HERE????

					}, function(error) {
						vm.utils.verify_control.error_handler.logError(error);
					});

				},
				getControlRecord: function() {
					var defer = $q.defer();

					managedRiskUtilsFactory.dbUtils.control_item.getRecord(vm.utils.verify_control.control_item_id).then(function(record) {
						
						console.log("GOT CONTROL ITEM RECORD");
						console.log(record);

						vm.utils.verify_control.record = record;
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				save: function(){
					var defer = $q.defer();

					if( !rmConnectivityFactory.online_detection.online ) {
						vm.utils.toasts.noInternetConnection();
						return defer.promise;
					}

					vm.utils.verify_control.saving = true;

					vm.utils.verify_control.record.verified_on_app = 'Yes';
					vm.utils.verify_control.record.app_date_verified = new Date().getTime();

					managedRiskUtilsFactory.dbUtils.control_item.save(vm.utils.verify_control.record).then(function(saved_doc) {

						vm.utils.tabs.changeTab('upload_verification');
						vm.utils.upload_verification.start(vm.utils.verify_control.record, vm.utils.control_verification_media.media_records);

					}, function(error){
						console.log(error);
						vm.utils.verify_control.error_handler.logError(error);
					});

					return defer.promise;
				},
				getAllControlVerificationAttachments: function() {
					var defer = $q.defer();

					//GET MEDIA RECORDS WITH ATTACHMENTS
					mediaFactory.dbUtils.getRecordMedia(vm.utils.verify_control.record._id, 'control_item_verification').then(function(media_records){
						
						media_records = $filter('orderBy')(media_records, 'date_added');
						vm.utils.verify_control.record.verification_media_records = media_records;
						
						angular.forEach(vm.utils.verify_control.record.verification_media_records, function(media_record, media_index){

							vm.utils.attachmentUrl(media_record._id, media_record.attachment_key).then(function(url){
								media_record.url = url;
							});

							defer.resolve(vm.utils.verify_control.record);

						});

						console.log("FETCHED CONTROL VERIFICATION MEDIA");
						console.log(vm.utils.verify_control.record.verification_media_records);

					}).catch(function(error){
						console.log("Error getting control verification media records");
						defer.reject();
					});

					return defer.promise;
				},
				updateFileCount: function(){
					var defer = $q.defer();

					vm.utils.verify_control.getAllControlVerificationAttachments().then(function(control_record){

						var num_attachments = 0;

						angular.forEach(control_record.verification_media_records, function(media_record, media_index){

							if( parseInt(media_record.status) == 1 && !media_record.is_video && !media_record.is_audio )
							{
								num_attachments++;
							}

						});

						control_record.num_files = num_attachments;

						procedureBuilderFactory.dbUtils.saveMrControl(control_record).then(function(doc){

							console.log("UPDATE CONTROL FILE COUNT RESULT");
							console.log(doc);

							$scope.$apply();
							defer.resolve();

						}, function(error){
							console.log(error);
							defer.resolve();
							alert("Error incrementing control file count");
						});

					});

					return defer.promise;
				},
				refreshRev: function(data) {
					if( !vm.utils.verify_control.record ) {
						return;
					}

					if( vm.utils.verify_control.record._id == data.record_id ) {
						vm.utils.verify_control.record._rev = data.record_rev;
					}
				},
				events: function() {

					$scope.$on("recordRev::new", function(event, data) {
						if( data.record_type == 'mr_control' ) {
							vm.utils.verify_control.refreshRev(data);
						}
					});

				}()
			},
			control_media: {
				record: null,
				media_records: [],
				visible_media: [],
				loading: false,
				downloading_file: false,
				saving_media_record: false,
				filters: {
					status: 1
				},
				setRecord: function(record){
					vm.utils.control_media.record = record;
				},
				mediaStyle: function(media_record){
					var style = {
						'border': '2px solid #ddd'
					};

					if( !media_record )
					{
						return style;
					}

					if( parseInt(media_record.status) == 3 )
					{
						style['border'] = '2px solid #a94442';
					}

					return style;
				},
				close: function() {
					vm.utils.control_media.record = null;
					vm.utils.control_media.media_records = [];
				},
				getAllRecordAttachments: function(record_id, record_type) {
					var defer = $q.defer();

					vm.utils.control_media.loading = true;

					// CLEAR CURRENT MEDIA ARRAY
					vm.utils.control_media.media_records = [];

					mediaFactory.dbUtils.getAllStoredRecordAttachments(record_id, record_type, 'mr_controls').then(function(media_records) {

						// media_records = $filter('orderBy')(media_records, 'date_added');
						media_records = $filter('orderBy')(media_records, 'sequence_number');

						vm.utils.control_media.media_records = media_records;

						vm.utils.control_media.autoFilterMedia();

						vm.utils.control_media.loading = false;

						defer.resolve();
						$scope.$apply();

					}, function(error) {
						vm.utils.control_media.loading = false;
						defer.reject(error);
					});

					return defer.promise;
				},
				getMediaRecordAttachment: function(media_record) {
					var defer = $q.defer();

					mediaFactory.dbUtils.getStoredAttachmentUrl('mr_controls', media_record._id, media_record.attachment_key).then(function(url) {

						media_record.url = url;

						defer.resolve();

						$scope.$apply();

					}, function(error) {
						alert(error);
						defer.reject(error);
					});

					return defer.promise;
				},
				updateListMediaData: function(media_record) {
					vm.utils.control_media.updateListMediaRecord(media_record);

					vm.utils.control_media.autoFilterMedia();
				},
				updateListMediaRecord: function(media_record) {
					var i = 0;
					var len = vm.utils.control_media.media_records.length;

					var record_index = null;

					if( len > 0 ) {
						while(i < len) {

							if( vm.utils.control_media.media_records[i]._id == media_record._id ) {
								record_index = i;
							}

							i++;
						}
					}

					if( record_index != null ) {
						vm.utils.control_media.media_records[record_index] = media_record;
 					} else {
 						vm.utils.control_media.media_records.push(media_record);
 					}
				},
				downloadMediaFile: function(media_record, record) {
					// IF ALREADY DOWNLOADING A FILE, WAIT UNTIL FINISHED
					if( vm.utils.control_media.downloading_file ) {
						alert("File download already in progress. Please wait before trying to download another file.");
						return;
					}

					vm.utils.control_media.downloading_file = true;
					media_record.downloading_file = true;

					var chunk_size = 1 * 1024 * 1024;
					var pool_limit = 6;

					mediaFactory.downloads.downloadMediaFile(media_record, chunk_size, pool_limit).then(function() {

						media_record.downloading_file = false;
						
						vm.utils.control_media.getMediaRecordAttachment(media_record).then(function() {
							vm.utils.control_media.updateListMediaData(media_record);
						});

						vm.utils.control_media.downloading_file = false;

					}, function(error) {
						vm.utils.control_media.downloading_file = false;
						media_record.downloading_file = false;
						alert(error);
					});
				
				},
				autoFilterMedia: function() {
					var filtered_array = [];

					angular.forEach(vm.utils.control_media.media_records, function(m_record, m_index) {

						var errors = 0;

						console.log(m_record);
						console.log(vm.utils.control_media.filters.status);

						if( m_record.item_not_found == 'Yes' ) {
							errors++;
						}

						if( m_record.status != vm.utils.control_media.filters.status ) {
							errors++;
						}

						if( errors == 0 ) {
							filtered_array.push(m_record);
						}

					});

					vm.utils.control_media.visible_media = filtered_array;
				},
				toggleMediaStatusView: function(status) {
					if( status == 'live' ) {
						vm.utils.control_media.filters.status = 1;
					}

					if( status == 'deleted' ) {
						vm.utils.control_media.filters.status = 3;
					}

					vm.utils.control_media.autoFilterMedia();
				},
			},
			control_verification_media: {
				record: null,
				media_records: [],
				visible_media: [],
				loading: false,
				downloading_file: false,
				saving_media_record: false,
				filters: {
					status: 1
				},
				setRecord: function(record){
					vm.utils.control_verification_media.record = record;
				},
				savePhotoCapture: function(file){

					vm.utils.control_verification_media.saveControlVerificationFile(file, vm.utils.control_verification_media.record).then(function(){

						// vm.utils.control_verification_media.updateFileCount(vm.utils.control_verification_media.record._id, 'control_item_verification').then(function(risk_record){
							// vm.utils.control_verification_media.getAllRecordAttachments(vm.utils.control_verification_media.record._id, 'assessment');
						// });

					}, function(error){
						alert(error);
					});

				},
				init: function(){

					setTimeout(function(){

						var inputFile = document.querySelector('#controlVerificationInputFile');
						var photoInput = document.querySelector('#controlVerificationPhotoInput');
						var uploadedFile = {};

						function fileUpload() {
							
							//DEFINE THE SAVE ROUTINE FOR SERIALLY SAVING
							function saveFiles(files, index)
							{
								var defer = $q.defer();
								var max_index = files.length - 1;

								//IF SAVED ALL FILES EXIT
								if( index > max_index )
								{
									//CLEAR THE FILE INPUT
									inputFile.value = null;
									photoInput.value = null;

									console.log("SAVED ALL FILES");
									// alert("Saved All Files");

									// vm.utils.control_verification_media.updateFileCount(vm.utils.control_verification_media.record._id, 'control_item_verification').then(function(control_record){
										// vm.utils.control_verification_media.getAllRecordAttachments(vm.utils.control_verification_media.record._id, 'assessment');
									// });

									defer.resolve();
									return defer.promise;
								}

								//SAVE THE FILE
								vm.utils.control_verification_media.saveControlVerificationFile(files[index], vm.utils.control_verification_media.record).then(function(){
									//RUN THE NEXT SAVE
									index++;
									saveFiles(files, index);
									return;
								}, function(){
									//RUN THE NEXT SAVE
									index++;
									saveFiles(files, index);
									return;
								});

								defer.resolve();

								return defer.promise;
							}
							
							//START SAVING THE FILES
							if( inputFile.files.length > 0 )
							{
								saveFiles(inputFile.files, 0);
							}

							if( photoInput.files.length > 0 )
							{
								saveFiles(photoInput.files, 0);
							}
						}

						// wait for change, then call the function
						inputFile.addEventListener('change', fileUpload, false);
						photoInput.addEventListener('change', fileUpload, false);

						$scope.$apply();

					}, 0);

				}(),
				mediaStyle: function(media_record){
					var style = {
						'border': '2px solid #ddd'
					};

					if( !media_record )
					{
						return style;
					}

					if( parseInt(media_record.status) == 3 )
					{
						style['border'] = '2px solid #a94442';
					}

					return style;
				},
				close: function() {
					vm.utils.control_verification_media.record = null;
					vm.utils.control_verification_media.media_records = [];
				},
				saveControlVerificationFile: function(file, control_record) {
					var defer = $q.defer();

					//CREATE SAVE MEDIA RECORD
					var media_record = modelsFactory.models.newMediaRecord(control_record._id, 'control_item_verification');
					media_record.attachment_key = file.name;
					media_record.file_name = file.name;

					// media_record.rm_record_item_id = control_record.rm_id;
					// media_record.rm_record_item_ref = control_record.rm_ref;

					if( mediaFactory.utils.checkRecordItemMediaExists(control_record, file.name) ) {
						//SKIP THIS FILE ALREADY HAVE IT
						$scope.$apply();
						defer.resolve();

					} else {

						// SAVE FILE
						mediaFactory.dbUtils.saveMediaRecord(media_record, file).then(function(saved_media) {

							media_record._id = saved_media._id;
							media_record._rev = saved_media._rev;

							if( !media_record.hasOwnProperty('_attachments') || !media_record._attachments ) {
								media_record._attachments = saved_media._attachments;
							}

							vm.utils.control_verification_media.getMediaRecordAttachment(media_record).then(function() {
								
								vm.utils.control_verification_media.updateListMediaData(media_record);

								defer.resolve();
								$scope.$apply();
							});

						}, function(error) {
							alert(error);
							defer.reject(error);
						});
					};

					return defer.promise;
				},
				updateFileCount: function(record_id, record_type) {
					var defer = $q.defer();

					mediaFactory.dbUtils.updateRecordFileCount(record_id, record_type).then(function(doc){
						
						if( vm.utils.control_verification_media.record && vm.utils.control_verification_media.record._id == doc._id ) {
							vm.utils.control_verification_media.record._id = doc._id;
							vm.utils.control_verification_media.record._rev = doc._rev;
							vm.utils.control_verification_media.record.num_files = doc.num_files;
						}

						// FIND CONTROL IN LISTING
						var control = vm.utils.control_listing.findControl(record_id);
						if( control ) {
							console.log("FOUND CONTROL FOR UPDATE FILE COUNT");
							console.log(control);

							control._id = doc._id;
							control._rev = doc._rev;
							control.num_files = doc.num_files;
						}

						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				getAllRecordAttachments: function(record_id, record_type) {
					var defer = $q.defer();

					vm.utils.control_verification_media.loading = true;

					// CLEAR CURRENT MEDIA ARRAY
					vm.utils.control_verification_media.media_records = [];

					mediaFactory.dbUtils.getAllStoredRecordAttachments(record_id, record_type, 'mr_controls').then(function(data) {

						var media_records = managedRiskUtilsFactory.utils.filterActiveVerificationMedia(data);

						// media_records = $filter('orderBy')(media_records, 'date_added');
						media_records = $filter('orderBy')(media_records, 'sequence_number');

						vm.utils.control_verification_media.media_records = media_records;

						vm.utils.control_verification_media.autoFilterMedia();

						vm.utils.control_verification_media.loading = false;

						defer.resolve();
						$scope.$apply();

					}, function(error) {
						vm.utils.control_verification_media.loading = false;
						defer.reject(error);
					});

					return defer.promise;
				},
				getMediaRecordAttachment: function(media_record) {
					var defer = $q.defer();

					mediaFactory.dbUtils.getStoredAttachmentUrl('mr_controls', media_record._id, media_record.attachment_key).then(function(url) {

						media_record.url = url;

						defer.resolve();

						$scope.$apply();

					}, function(error) {
						alert(error);
						defer.reject(error);
					});

					return defer.promise;
				},
				updateListMediaData: function(media_record) {
					vm.utils.control_verification_media.updateListMediaRecord(media_record);

					vm.utils.control_verification_media.autoFilterMedia();
				},
				updateListMediaRecord: function(media_record) {
					var i = 0;
					var len = vm.utils.control_verification_media.media_records.length;

					var record_index = null;

					if( len > 0 ) {
						while(i < len) {

							if( vm.utils.control_verification_media.media_records[i]._id == media_record._id ) {
								record_index = i;
							}

							i++;
						}
					}

					if( record_index != null ) {
						vm.utils.control_verification_media.media_records[record_index] = media_record;
 					} else {
 						vm.utils.control_verification_media.media_records.push(media_record);
 					}
				},
				deleteMediaRecord: function(media_record) {
					if( vm.utils.control_verification_media.saving_media_record ) {
						alert("Saving control media, please wait");
						return;
					}

					vm.utils.control_verification_media.saving_media_record = true;

					// MARK MEDIA DELETED
					media_record.status = 3;

					// SAVE RECORD
					mediaFactory.dbUtils.doSaveMediaRecord(media_record).then(function(save_result) {

						angular.forEach(vm.utils.control_verification_media.media_records, function(record, index) {
							if( record._id == media_record._id ) {
								vm.utils.control_verification_media.media_records[index]._id = save_result.id;
								vm.utils.control_verification_media.media_records[index]._rev = save_result.rev;
								vm.utils.control_verification_media.media_records[index].status = 3;
							};
						});

						vm.utils.control_verification_media.autoFilterMedia();

						vm.utils.control_verification_media.saving_media_record = false;

						// vm.utils.control_verification_media.updateFileCount(vm.utils.control_verification_media.record._id, 'control_item').then(function() {

						// 	vm.utils.control_verification_media.saving_media_record = false;

						// }, function(error) {
						// 	vm.utils.control_verification_media.saving_media_record = false;
						// 	alert(error);
						// });

					}, function(error) {
						vm.utils.control_verification_media.saving_media_record = false;
						alert(error);
					});
				},
				recoverMediaRecord: function(media_record) {
					if( vm.utils.control_verification_media.saving_media_record ) {
						alert("Saving control media, please wait");
						return;
					}

					vm.utils.control_verification_media.saving_media_record = true;

					// MARK MEDIA LIVE
					media_record.status = 1;

					// SAVE RECORD
					mediaFactory.dbUtils.doSaveMediaRecord(media_record).then(function(save_result) {

						angular.forEach(vm.utils.control_verification_media.media_records, function(record, index) {
							if( record._id == media_record._id ) {
								vm.utils.control_verification_media.media_records[index]._id = save_result.id;
								vm.utils.control_verification_media.media_records[index]._rev = save_result.rev;
								vm.utils.control_verification_media.media_records[index].status = 1;
							};
						});

						vm.utils.control_verification_media.autoFilterMedia();

						vm.utils.control_verification_media.saving_media_record = false;

						// vm.utils.control_verification_media.updateFileCount(vm.utils.control_verification_media.record._id, 'control_item').then(function() {

						// 	vm.utils.control_verification_media.saving_media_record = false;

						// }, function(error) {
						// 	vm.utils.control_verification_media.saving_media_record = false;
						// 	alert(error);
						// });

					}, function(error) {
						vm.utils.control_verification_media.saving_media_record = false;
						alert(error);
					});
				},
				downloadMediaFile: function(media_record, record) {
					// IF ALREADY DOWNLOADING A FILE, WAIT UNTIL FINISHED
					if( vm.utils.control_verification_media.downloading_file ) {
						alert("File download already in progress. Please wait before trying to download another file.");
						return;
					}

					vm.utils.control_verification_media.downloading_file = true;
					media_record.downloading_file = true;

					var chunk_size = 1 * 1024 * 1024;
					var pool_limit = 6;

					mediaFactory.downloads.downloadMediaFile(media_record, chunk_size, pool_limit).then(function() {

						media_record.downloading_file = false;

						vm.utils.control_verification_media.getMediaRecordAttachment(media_record).then(function() {
							vm.utils.control_verification_media.updateListMediaData(media_record);
						});

						vm.utils.control_verification_media.downloading_file = false;

					}, function(error) {
						vm.utils.control_verification_media.downloading_file = false;
						media_record.downloading_file = false;
						alert(error);
					});
				
				},
				autoFilterMedia: function() {
					var filtered_array = [];

					angular.forEach(vm.utils.control_verification_media.media_records, function(m_record, m_index) {

						var errors = 0;

						console.log(m_record);
						console.log(vm.utils.control_verification_media.filters.status);

						if( m_record.item_not_found == 'Yes' ) {
							errors++;
						}

						if( m_record.status != vm.utils.control_verification_media.filters.status ) {
							errors++;
						}

						if( errors == 0 ) {
							filtered_array.push(m_record);
						}

					});

					vm.utils.control_verification_media.visible_media = filtered_array;
				},
				toggleMediaStatusView: function(status) {
					if( status == 'live' ) {
						vm.utils.control_verification_media.filters.status = 1;
					}

					if( status == 'deleted' ) {
						vm.utils.control_verification_media.filters.status = 3;
					}

					vm.utils.control_verification_media.autoFilterMedia();
				},
				takePhotoDesktop: function(){
					
					if( !vm.utils.verify_control.record.hasOwnProperty('_id') || !vm.utils.verify_control.record._id ) {
						alert("Control item not saved");
						return;
					}

					var params = {
						directive_id: vm.utils.directive_id,
						record_type: 'control_item_verification',
						subject_record: vm.utils.verify_control.record
					};

					console.log("PARAMS");
					console.log(params);

					$rootScope.$broadcast("takePhoto::start", params);
				},
			},
			upload_verification: {
				uploading: false,
				import_complete: false,
				record: null, 
				record_media: null,
				error_handler: {
					error: false, 
					error_message: null, 
					logError: function(error) {
						vm.utils.upload_verification.error_handler.error = true;
						vm.utils.upload_verification.error_handler.error_message = error;
					}, 
					clear: function() {
						vm.utils.upload_verification.error_handler.error = false;
						vm.utils.upload_verification.error_handler.error_message = null;
					}
				},
				start: function(record, record_media) {
					vm.utils.upload_verification.setData(record, record_media);

					vm.utils.upload_verification.startVerificationUpload();
				},
				setData: function(record, record_media) {
					vm.utils.upload_verification.record = record;

					// FILTER DELETED VERIFICATION MEDIA
					var i = 0;
					var len = record_media.length;
					var live_media = [];
					while(i < len) {

						if( record_media[i].hasOwnProperty('status') && record_media[i].status == 1 ) {
							live_media.push(record_media[i]);
						}

						i++;
					}

					vm.utils.upload_verification.record_media = live_media;
				},
				startVerificationUpload: function() {

					vm.utils.upload_verification.uploading = true;
					vm.utils.upload_verification.upload_complete = false;

					vm.utils.upload_verification.error_handler.clear();

					vm.utils.upload_verification.uploadControlRecord().then(function() {

						console.log("CONTROL VERIFIED");

						vm.utils.upload_verification.uploadNextFile();

					}, function(error) {
						vm.utils.upload_verification.uploading = false;
						vm.utils.upload_verification.error_handler.logError(error);
					});

				},
				uploadControlRecord: function() {
					var defer = $q.defer();

					managedRiskUtilsFactory.requests.verifyControlItem(vm.utils.upload_verification.record).then(function() {

						managedRiskUtilsFactory.dbUtils.media_records.updateVerificationMediaLogId(vm.utils.upload_verification.record, vm.utils.upload_verification.record_media).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				uploadNextFile: function(){
					var i = 0;
					var len = vm.utils.upload_verification.record_media.length;
					var next_file_index = null;
					while(i < len) {
						if( !vm.utils.upload_verification.record_media[i].date_record_imported ) {
							next_file_index = i;
						}

						i++;
					}

					if( next_file_index != null ) {

						console.log("ADD FILE TO STAGING UPLOADER");
						vm.utils.upload_verification.active_file = vm.utils.upload_verification.record_media[next_file_index];
						console.log(vm.utils.upload_verification.record_media[next_file_index]);
						vm.utils.upload_verification.stageFileForUpload(vm.utils.upload_verification.record_media[next_file_index]);

					} else {
						vm.utils.upload_verification.finaliseUpload();
					}
				},
				stageFileForUpload: function(media_record){
					var defer = $q.defer();

					//GET THE FILE ATTACHMENT
					riskmachDatabasesFactory.databases.collection.media.getAttachment(media_record._id, media_record.attachment_key).then(function(blob){

						//CREATE THE FILE FROM BLOB
						var file = new File([blob], media_record.attachment_key);

						console.log("ADDED FILE TO UPLOADER STAGE");
						console.log(media_record);
						console.log(file);

						//ADD THE FILE TO THE DOWNLOADER
						vm.utils.uploader.addFile(file, media_record.attachment_key);

						//ADD THE FILE TO THE UPLOADER ALONG WITH THE META DATA ??
						defer.resolve();

					}).catch(function(error){
						alert("Error getting file attachment");
						console.log("Error getting file attachment");
						vm.utils.upload_verification.error_handler.logError(error);
						console.log(error);
						defer.reject(error);
					});

					return defer.promise;
				},
				finaliseUpload: function() {
					var defer = $q.defer();

					vm.utils.upload_verification.markControlVerificationImportComplete().then(function() {

						vm.utils.upload_verification.uploading = false;
						vm.utils.upload_verification.import_complete = true;

						$rootScope.$broadcast("verifyControlItem::uploaded");

					}, function(error) {
						vm.utils.upload_verification.uploading = false;
						vm.utils.upload_verification.error_handler.logError(error);
					});

					return defer.promise;
				},
				markControlVerificationImportComplete: function() {
					var defer = $q.defer();

					managedRiskUtilsFactory.markControlVerificationImportComplete(vm.utils.upload_verification.record, vm.utils.upload_verification.record_media).then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			toasts: {
				noInternetConnection: function() {
					var toastEl = document.getElementById('VerifyControlItemNoInternetConnectionToast');
					var toastInst = bootstrap.Toast.getOrCreateInstance(toastEl);
					toastInst.show();
				}
			},
			events: function() {

				$scope.$on("verifyControlItem::start", function(event, data) {

					console.log("RECEIVED CONTROL ITEM ID FOR VERIFICATION");

					vm.utils.verify_control.control_item_id = data.control_item_id;

					vm.utils.verify_control.start();
				});

				$scope.$on("verifyControlItem::savePhotoCapture", function(event, data){

					if( data.src_directive_id != vm.utils.directive_id ) {
						return;
					}

					if( data.record_type != 'control_item_verification' ) {
						return;
					}

					if( data.subject_record._id != vm.utils.verify_control.record._id ) {
						return;
					}

					if( !data.file ) {
						alert("Theres no file to save");
						return;
					}

					vm.utils.control_verification_media.saveControlVerificationFile(data.file, vm.utils.control_verification_media.record)

				});

			}()
		}

		vm.utils.uploader = new plupload.Uploader({
			runtimes : 'html5,flash,silverlight,html4',
		    browse_button : 'pickfiles',
		    container: document.getElementById('container'),
		    url : "https://system.riskmach.co.uk/laravel/public/webapp/v1/CloudPlupUploadHandler",
		    resize: {
			    width: 600,
			    height: 480,
			    quality: 70,
			    preserve_headers: false
			},
		    chunk_size: '200kb',
    		max_retries: 999,
		    filters : {
		    	prevent_duplicates: false,
		    	max_file_size : '2gb',
		    	// mime_types: [
		    	// 	{title : "Image files", extensions : "jpg,gif,png"},
		    	// 	{title : "Zip files", extensions : "zip"}
		    	// ]
		    },
		    flash_swf_url : '/plupload/js/Moxie.swf',
		    silverlight_xap_url : '/plupload/js/Moxie.xap',
		    headers: {
		    	Authorization: 'Bearer ' +  authFactory.getLoginToken(),
		    },
		    init: {
		    	PostInit: function(){

		    		document.getElementById('filelist').innerHTML = '';

		    		document.getElementById('uploadfiles').onclick = function() {
		    			// vm.utils.uploader.start();
		    			// return false;
		    		};
		    	},
		    	BeforeUpload: function(up, file){
		    		// alert("Before Upload Start!");
		    		var params = {};
					params.file_id = file.id;
					// params.Ref = null;
					// params.IsAudio = 'No';
					// vm.utils.upload_verification.active_file.sync_id = riskmachSyncFactory.sync_collection.staging.project_record.record.sync_id;
					params.data = JSON.stringify(vm.utils.upload_verification.active_file);
					// params.data.sync_id = riskmachSyncFactory.sync_collection.staging.project_record.record.sync_id;

					// $.extend( params, vm.utils.file_meta[file.id] );

					console.log("UPLOAD PARAMS");
					console.log(params);

					vm.utils.uploader.setOption('multipart_params', params);
		    	},
		    	UploadComplete: function(up, files){
		    		//ALL UPLOADS COMPLETE?
		    	},
		    	FilesAdded: function(up, files) {

		    		console.log("File Added!");
		    		console.log(files);

		    		plupload.each(files, function(file) {
		    			$('#filelist').append('<div id="' + file.id + '" class="text-center" style="font-size: 1em;">'+ file.name +'</div>');
		    		});

		    		//START THE UPLOAD HERE INSTEAD?
		    		vm.utils.uploader.stop();
		    		vm.utils.uploader.start();

		    	},
		    	FileUploaded: function(up, file, result){

		    		console.log("VERIFICATION MEDIA RESPONSE");
		    		console.log(result);

		    		vm.utils.uploader.files.forEach(function(file, index){
		    			vm.utils.uploader.removeFile(file);
		    		});

		    		vm.utils.is_uploading = false;
		    		vm.utils.upload_complete = true;
		    		vm.utils.in_progress = false;

		    		// alert("File Uploaded!");
		    		// console.log("File Uploaded!");
		    		// console.log(result);

		    		var response = JSON.parse(result.response);
		    		// alert("FILE UPLOADED ID: " + response.mid_record_id);

		    		//UPDATE STAGED RECORD AS SYNCED / UPDATE STATS
		    		vm.utils.upload_verification.active_file.date_record_synced = new Date().getTime();
		    		vm.utils.upload_verification.active_file.synced = true;

		    		managedRiskUtilsFactory.dbUtils.media_records.markControlVerificationMediaImported(vm.utils.upload_verification.active_file, response).then(function(){
		    			vm.utils.uploader.removeFile(file);

		    			//UPLOAD THE NEXT FILE

		    			vm.utils.upload_verification.uploadNextFile();
		    			$scope.$apply();

		    		}, function(error){
		    			alert(error);
		    		});

		    		// $rootScope.$broadcast("videoRecorder::fileUploaded", params);
		    	},
		    	UploadProgress: function(up, file){
		    		// document.getElementById(file.id).innerHTML = '<span>' + file.percent + "%</span>";
		    		console.log("Upload Progress (file_id: "+ file.id +"): " + file.percent );
		    	},
		    	Error: function(up, err) {
		    		vm.utils.is_uploading = false;
		    		document.getElementById('console').innerHTML += "\nError #" + err.code + ": " + err.message;
		    	}
		    }
		});

		vm.utils.uploader.init();
	} 

	function coreAssetControlItemListingController($scope, $rootScope, $q, $filter, $sce, riskmachDatabasesFactory, authFactory, modelsFactory, rmUtilsFactory, rmConnectivityFactory, managedRiskUtilsFactory, managedRiskSyncFactory) 
	{
		var vm = this;

		vm.utils = {
			control_listing: {
				refreshing: false, 
				loading_control_verification: false,
				data: [],
				global_controls: [],
				filters: null,
				general_search: '',
				pagination: {
					page_num: 1,
					items_per_page: 100,
					total_items: 0,
					pageChanged: function(page_num) {
						vm.utils.control_listing.controlPageChange(page_num);
					}
				},
				error_handler: {
					error: false, 
					error_message: null, 
					logError: function(error) {
						vm.utils.control_listing.error_handler.error = true;
						vm.utils.control_listing.error_handler.error_message = error;
					}, 
					clear: function() {
						vm.utils.control_listing.error_handler.error = false;
						vm.utils.control_listing.error_handler.error_message = null;
					}
				},
				refresh: function() {

					vm.utils.control_listing.error_handler.clear();

					if( !rmConnectivityFactory.online_detection.online ) {
						vm.utils.control_listing.error_handler.logError("You require an internet connection to view control items");
						return;
					}

					vm.utils.control_listing.refreshing = true;

					managedRiskUtilsFactory.control_listing.requestData(vm.utils.control_listing.filters).then(function(data) {

						vm.utils.control_listing.filters.total_items = data.totals.TotalItems;

						managedRiskUtilsFactory.control_listing.getGlobalControlItems(vm.utils.control_listing.filters).then(function(global_controls) {

							vm.utils.control_listing.data = data.data;
							vm.utils.control_listing.global_controls = global_controls;

							vm.utils.control_listing.overlayDbGlobalControlItems(vm.utils.control_listing.global_controls);

							vm.utils.control_listing.refreshing = false;

						}, function(error) {
							vm.utils.control_listing.error_handler.logError(error);
							vm.utils.control_listing.refreshing = false;
						});

					}, function(error) {
						vm.utils.control_listing.error_handler.logError(error);
						vm.utils.control_listing.refreshing = false;
					});
				},
				controlPageChange: function(page_num) {
					var defer = $q.defer();

					vm.utils.control_listing.filters.page_num = page_num;

					vm.utils.control_listing.refreshing = true;

					managedRiskUtilsFactory.control_listing.requestData(vm.utils.control_listing.filters).then(function(data) {

						vm.utils.control_listing.filters.total_items = data.totals.TotalItems;

						vm.utils.control_listing.data = data.data;

						vm.utils.control_listing.overlayDbGlobalControlItems(vm.utils.control_listing.global_controls);

						vm.utils.control_listing.refreshing = false;

					}, function(error) {
						vm.utils.control_listing.error_handler.logError(error);
						vm.utils.control_listing.refreshing = false;
					});

					return defer.promise;
				},
				overlayDbGlobalControlItems: function(global_controls) {

					var i = 0;
					var len = vm.utils.control_listing.data.length;
					while(i < len) {

						vm.utils.control_listing.data[i].db_control_item = null;

						var gi = 0;
						var glen = global_controls.length;

						while(gi < glen) {

							if( vm.utils.control_listing.data[i].rm_id == global_controls[gi].rm_id ) {
								vm.utils.control_listing.data[i].db_control_item = global_controls[gi];
							}

							gi++;
						}

						i++;
					}

				},
				formatControls: function(data) {
					var i = 0;
					var len = data.length;
					while(i < len) {

						data[i].verification_required = null;

						if( !data[i].hasOwnProperty('date_verified') || !data[i].date_verified ) {
							data[i].verification_required = 'No';
						}

						// if( data[] )

						i++;
					}
				},
				verificationClass: function(control) {
					var clss = 'bg-secondary-soft';

					if( !control )
					{
						return clss;
					}

					if( control.verification_required == 'Yes' )
					{
						clss = 'bg-danger-soft';
						return clss;
					}

					if( control.DaysToExpiry && parseInt(control.DaysToExpiry) < 30 )
					{
						clss = 'bg-warning-soft';
						return clss;
					}

					if( control.verification_required == 'No' )
					{
						clss = 'bg-success-soft';
					}

					return clss;
				},
				refreshDbControlItemRev: function(data) {
					var i = 0;
					var len = vm.utils.control_listing.data.length;
					while(i < len) {

						if( vm.utils.control_listing.data[i].hasOwnProperty('db_control_item') && vm.utils.control_listing.data[i].db_control_item ) {

							if( vm.utils.control_listing.data[i].db_control_item._id = data.record_id ) {
								vm.utils.control_listing.data[i].db_control_item._rev = data.record_rev;
							}

						}

						i++;
					}
				}
			},
			verify_control: {
				start: function(control_item) {

					if( !rmConnectivityFactory.online_detection.online ) {
						vm.utils.toasts.noInternetConnection();
						return;
					}

					vm.utils.control_listing.loading_control_verification = true;

					// if( control_item.hasOwnProperty('db_control_item') && control_item.db_control_item && (!control_item.db_control_item.hasOwnProperty('date_content_imported') || !control_item.db_control_item.date_content_imported) ) {
					// 	$rootScope.$broadcast("verifyControlItem::start", {control_item_id: control_item.db_control_item._id});
					// 	return;
					// }

					var db_control_item = null;
					if( control_item.hasOwnProperty('db_control_item') && control_item.db_control_item ) {
						db_control_item = control_item.db_control_item;
					}

					managedRiskUtilsFactory.requestSaveLocalControlItemVerification(control_item, db_control_item).then(function(control_record) {

						if( db_control_item ) {
							control_item.db_control_item._id = control_record._id;
							control_item.db_control_item._rev = control_record._rev;
						}

						$rootScope.$broadcast("verifyControlItem::start", {control_item_id: control_record._id});

						vm.utils.control_listing.loading_control_verification = false;

					}, function(error) {
						console.log(error);
						vm.utils.control_listing.loading_control_verification = false;
					});

				}
			},
			toasts: {
				noInternetConnection: function() {
					var toastEl = document.getElementById('GlobalControlListNoInternetConnectionToast');
					var toastInst = bootstrap.Toast.getOrCreateInstance(toastEl);
					toastInst.show();
				}
			},
			events: function() {

				$scope.$on("coreAssetControlItems::refresh", function(event, data) {
					vm.utils.control_listing.filters = angular.copy(data.filters);

					vm.utils.control_listing.filters.page_num = 1;
					vm.utils.control_listing.filters.num_per_page = vm.utils.control_listing.pagination.items_per_page;

					vm.utils.control_listing.refresh();
				});

				$scope.$on("verifyControlItem::uploaded", function(event, data) {
					vm.utils.control_listing.refresh();
				});

				$scope.$on("recordRev::new", function(event, data) {
					if( data.record_type == 'mr_control' ) {
						vm.utils.control_listing.refreshDbControlItemRev(data);
					}
				});

			}()
		};
	}

	function enterManagedRiskPageController($scope, $rootScope, $q, $filter, $aside, $sce, riskmachDatabasesFactory, authFactory, modelsFactory, rmUtilsFactory, rmConnectivityFactory, managedRiskUtilsFactory, managedRiskSyncFactory) 
	{
		var vm = this;

		vm.utils = {
			relations: vm.relations,
			loading: false,
			initialising_mr: false,
			mr_data: null,
			active_local_draft_mr: null,
			active_local_audit_mr: null,
			subject_record: null,
			tabs: {
				active_tab: 'enter_mr_options', 
				changeTab: function(tab) {
					vm.utils.tabs.active_tab = tab;
				},
				tabActive: function(tab) {
					if( vm.utils.tabs.active_tab == tab ) {
						return true;
					} else {
						return false;
					}
				}
			},
			init: function() {

				console.log("INIT ENTER MR OPTIONS");
				console.log(vm.relations);
				console.log("IS ONLINE: " + rmConnectivityFactory.online_detection.online);

				if( rmConnectivityFactory.online_detection.online ) {
					vm.utils.downloadMrData(vm.utils.relations);
				} else {
					vm.utils.fetchMrData();
				}
			},
			downloadMrData: function(relations) {

				if( !rmConnectivityFactory.online_detection.online ) {
					alert("Please gain an internet connection to download the Managed Risk data");
					return;
				}

				vm.utils.downloading = true;

				managedRiskUtilsFactory.downloadMrData(relations).then(function() {

					vm.utils.downloading = false;

					vm.utils.fetchMrData();

				}, function(error) {
					vm.utils.downloading = false;
					alert(error);
				});
			},
			fetchMrData: function() {
				var defer = $q.defer();

				vm.utils.loading = true;

				vm.utils.fetchMrMetaData().then(function() {

					vm.utils.fetchLocalManagedRisks().then(function() {

						vm.utils.fetchSubjectRecord().then(function() {

							if( vm.utils.mr_data && !vm.utils.hasPublishedMr(vm.utils.mr_data) && !vm.utils.hasCloudDraftMr(vm.utils.mr_data) ) {
								
								vm.utils.clone_managed_risk.refreshSrcSubjectList().then(function() {
									vm.utils.loading = false;
									defer.resolve();
								}, function(error) {
									vm.utils.loading = false;
								});

							} else {
								vm.utils.loading = false;
								defer.resolve();
							}

						}, function(error) {
							vm.utils.loading = false;
							defer.reject(error);
						});

					}, function(error) {
						vm.utils.loading = false;
						defer.reject(error);
					});

				}, function(error) {
					vm.utils.loading = false;
					defer.reject(error);
				});

				return defer.promise;
			},
			fetchMrMetaData: function() {
				var defer = $q.defer();

				if( !vm.utils.relations.subject_record_id ) {
					alert("No subject specified");
					defer.reject();
					return defer.promise;
				}

				if( !vm.utils.relations.subject_record_type ) {
					alert("No subject type specified");
					defer.reject();
					return defer.promise;
				}

				managedRiskUtilsFactory.dbUtils.fetchSubjectMrMetaRecord(vm.utils.relations.subject_record_id, vm.utils.relations.subject_record_type).then(function(record) {

					console.log(record);

					// IF NO MR AGAINST SUBJECT
					if( !record ) {
						vm.utils.mr_data = null;
						defer.resolve();
						return defer.promise;
					}

					if( record.data ) {
						record.data = JSON.parse(record.data);
					}

					vm.utils.mr_data = record;

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			fetchLocalManagedRisks: function() {
				var defer = $q.defer();

				vm.utils.fetchActiveLocalDraft().then(function() {

					vm.utils.fetchActiveLocalAudit().then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			fetchSubjectRecord: function() {
				var defer = $q.defer();

				if( !vm.utils.mr_data || !vm.utils.mr_data.hasOwnProperty('subject_record_id') || !vm.utils.mr_data.subject_record_id ) {
					vm.utils.subject_record = null;
					defer.resolve();
					return defer.promise;
				} 

				var doc_id = vm.utils.mr_data.subject_record_id;

				riskmachDatabasesFactory.databases.collection.register_assets.get(doc_id).then(function(doc) {

					vm.utils.subject_record = doc;

					defer.resolve();
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			fetchActiveLocalDraft: function() {
				var defer = $q.defer();

				if( !vm.utils.relations.subject_record_id ) {
					alert("No subject specified");
					defer.reject();
					return defer.promise;
				}

				if( !vm.utils.relations.subject_record_type ) {
					alert("No subject type specified");
					defer.reject();
					return defer.promise;
				}

				managedRiskUtilsFactory.dbUtils.fetchActiveLocalDraftManagedRisk(vm.utils.relations.subject_record_id).then(function(mr_record) {
					
					vm.utils.active_local_draft_mr = mr_record;

					defer.resolve();
				}, function(error) {
					alert(error);
					defer.reject(error);
				});

				return defer.promise;
			},
			fetchActiveLocalAudit: function() {
				var defer = $q.defer();

				if( !vm.utils.relations.subject_record_id ) {
					alert("No subject specified");
					defer.reject();
					return defer.promise;
				}

				if( !vm.utils.relations.subject_record_type ) {
					alert("No subject type specified");
					defer.reject();
					return defer.promise;
				}

				managedRiskUtilsFactory.dbUtils.fetchActiveLocalAuditManagedRisk(vm.utils.relations.subject_record_id).then(function(mr_record) {
					
					vm.utils.active_local_audit_mr = mr_record;

					defer.resolve();
				}, function(error) {
					alert(error);
					defer.reject(error);
				});

				return defer.promise;
			},
			installManagedRisk: function(mr_version, project_type) {
				vm.utils.initialising_mr = true;

				// DISCARD CURRENT ACTIVE DRAFT
				if( project_type == 'mr_edit' && vm.utils.active_local_draft_mr ) {
					vm.utils.discardLocalMrDraftCopy(false).then(function() {
						// RE-ATTEMPT INSTALL MANAGED RISK
						vm.utils.installManagedRisk(mr_version, project_type);
					});

					return;
				}

				var stages = ['subject_record','subject_media','mr_record','project_record','snapshot_record','hazards','controls','hazard_control_relations','project_media'];

				managedRiskUtilsFactory.installManagedRiskFromMeta(vm.utils.mr_data._id, mr_version, project_type, stages).then(function() {

					vm.utils.fetchLocalManagedRisks().then(function() {

						if( project_type == 'mr_edit' ) {
							// INDEX LOCAL DRAFT ON SUBJECT MR META
							managedRiskUtilsFactory.dbUtils.updateSubjectMrMetaWithLocalDraft(vm.utils.active_local_draft_mr._id, vm.utils.relations).then(function() {
								vm.utils.initialising_mr = false;

								vm.utils.enterManagedRisk();
							});
						}

						if( project_type == 'mr_audit' ) {
							vm.utils.initialising_mr = false;

							vm.utils.enterAuditManagedRisk();
						}

					});

				}, function(error) {
					vm.utils.initialising_mr = false;
					alert(error);
				});
			},
			startNewManagedRisk: function() {
				vm.utils.initialising_mr = true;

				// DISCARD CURRENT ACTIVE DRAFT
				if( vm.utils.active_local_draft_mr ) {
					vm.utils.discardLocalMrDraftCopy(false).then(function() {
						// RE-ATTEMPT START NEW
						vm.utils.startNewManagedRisk();
					});

					return;
				}

				managedRiskUtilsFactory.startNewManagedRisk(vm.utils.relations.subject_record_id).then(function() {

					vm.utils.fetchActiveLocalDraft().then(function() {

						// INDEX LOCAL DRAFT ON SUBJECT MR META
						managedRiskUtilsFactory.dbUtils.updateSubjectMrMetaWithLocalDraft(vm.utils.active_local_draft_mr._id, vm.utils.relations).then(function() {
							vm.utils.initialising_mr = false;

							vm.utils.enterManagedRisk();
						});

					});

				}, function(error) {
					alert(error);
					vm.utils.initialising_mr = false;
				});
			},
			enterManagedRisk: function() {
				// STORE THE ACTIVE MANAGED RISK AND CHANGE PAGE

				if( !vm.utils.active_local_draft_mr.mr_installed ) {
					alert("The Managed Risk install was not complete, we will try and re-attempt this now.");
					vm.utils.installManagedRisk(vm.utils.active_local_draft_mr.from_mr_version, 'mr_edit');
					return;
				}

				rmUtilsFactory.projects.setActiveManagedRisk(vm.utils.active_local_draft_mr).then(function(){

					console.log("SELECTED MANAGED RISK");
					console.log(rmUtilsFactory.projects.active_project_records);

					window.location.replace("../managed-risk/");

				}, function(error){
					alert(error);
				});
			},
			enterAuditManagedRisk: function() {
				// STORE THE ACTIVE MANAGED RISK AND CHANGE PAGE

				// IF NOT ACTIVE LOCAL AUDIT, CREATE AND THEN ENTER
				if( !vm.utils.active_local_audit_mr ) {
					vm.utils.installManagedRisk('latest_published', 'mr_audit');
					return;
				}

				if( !vm.utils.active_local_audit_mr.mr_installed ) {
					alert("The Managed Risk install was not complete, we will try and re-attempt this now.");
					vm.utils.installManagedRisk(vm.utils.active_local_audit_mr.from_mr_version, 'mr_audit');
					return;
				}

				rmUtilsFactory.projects.setActiveManagedRisk(vm.utils.active_local_audit_mr).then(function(){

					console.log("SELECTED MANAGED RISK");
					console.log(rmUtilsFactory.projects.active_project_records);

					window.location.replace("../managed-risk/");

				}, function(error){
					alert(error);
				});
			},
			discardLocalMrDraftCopy: function(confirmation) {
				var defer = $q.defer();

				if( confirmation ) {
					vm.utils.tabs.changeTab('discard_mr_confirmation');
					return;
				}

				managedRiskUtilsFactory.dbUtils.discardLocalMrDraftCopy(vm.utils.active_local_draft_mr._id).then(function() {
					
					vm.utils.fetchActiveLocalDraft().then(function() {

						defer.resolve();

					});

				}, function(error) {
					alert(error);
					defer.reject(error);
				});

				return defer.promise;
			},
			discardLocalMrAudit: function(confirmation) {
				var defer = $q.defer();

				if( confirmation ) {
					vm.utils.tabs.changeTab('discard_mr_audit_confirmation');
					return;
				}

				managedRiskUtilsFactory.dbUtils.discardLocalMrAudit(vm.utils.active_local_audit_mr._id).then(function() {
					
					vm.utils.fetchActiveLocalAudit().then(function() {
						defer.resolve();
					});

				}, function(error) {
					alert(error);
					defer.reject(error);
				});

				return defer.promise;
			},
			testFetchMrData: function() {
				var defer = $q.defer();

				managedRiskSyncFactory.fetchManagedRiskSyncData(vm.utils.active_local_draft_mr._id).then(function() {
					defer.resolve();
				});

				return defer.promise;
			},
			hasPublishedMr: function(mr_meta) {
				var has_published = false;

				if( !mr_meta ) {
					return has_published;
				}

				if( !mr_meta.hasOwnProperty('data') || !mr_meta.data ) {
					return has_published;
				}

				// if( !mr_meta.data.hasOwnProperty('latest_published') || !mr_meta.data.latest_published ) {
				// 	return has_published;
				// }

				if( !mr_meta.data.hasOwnProperty('mr_meta') || !mr_meta.data.mr_meta ) {
					return has_published;
				}

				if( !mr_meta.data.mr_meta.hasOwnProperty('has_published') || mr_meta.data.mr_meta.has_published != 'Yes' ) {
					return has_published;
				}

				has_published = true;
				return has_published;
			},
			hasCloudDraftMr: function(mr_meta) {
				var has_draft = false;

				if( !mr_meta ) {
					return has_draft;
				}

				if( !mr_meta.hasOwnProperty('data') || !mr_meta.data ) {
					return has_draft;
				}

				// if( !mr_meta.data.hasOwnProperty('latest_draft') || !mr_meta.data.latest_draft ) {
				// 	return has_draft;
				// }

				if( !mr_meta.data.hasOwnProperty('mr_meta') || !mr_meta.data.mr_meta ) {
					return has_draft;
				}

				if( !mr_meta.data.mr_meta.hasOwnProperty('has_draft') || !mr_meta.data.mr_meta.has_draft || mr_meta.data.mr_meta.has_draft == 'No' ) {
					return has_draft;
				}

				has_draft = true;
				return has_draft;
			},
			clone_managed_risk: {
				list_loading: false,
				src_subject: null,
				relations: {
					subject_record_id: null, 
					rm_subject_record_id: null, 
					subject_record_type: 'asset'
				},
				setSrcSubject: function(record) {
					vm.utils.clone_managed_risk.relations.subject_record_id = record._id;
					vm.utils.clone_managed_risk.relations.rm_subject_record_id = record.rm_id;
					vm.utils.clone_managed_risk.relations.subject_record_type = vm.utils.relations.subject_record_type;
				},
				src_subject_list: [], 
				refreshSrcSubjectList: function() {
					var defer = $q.defer();

					vm.utils.clone_managed_risk.list_loading = true;

					// DEPENDING ON RECORD TYPE, GET DIFFERENT LIST
					if( vm.utils.clone_managed_risk.relations.subject_record_type == 'asset' ) {

						vm.utils.clone_managed_risk.refreshSrcAssets().then(function() {

							vm.utils.clone_managed_risk.overlaySrcListMrMeta().then(function() {

								vm.utils.clone_managed_risk.filterSrcSubjectList();

								vm.utils.clone_managed_risk.list_loading = false;
								defer.resolve();

							});

						}, function(error) {
							vm.utils.clone_managed_risk.list_loading = false;
							defer.reject(error);
						});

					}

					return defer.promise;
				},
				refreshSrcAssets: function() {
					var defer = $q.defer();

					var selector = {
						table: 'register_assets',
						user_id: authFactory.cloudUserId(),
						company_id: authFactory.getActiveCompanyId(),
						record_type: '',
						status: 1
					};

					// if( vm.utils.subject_record && vm.utils.subject_record.site_id )
					// {
					// 	selector.site_id = vm.utils.subject_record.site_id
					// }

					// if( vm.utils.subject_record && vm.utils.subject_record.building_id )
					// {
					// 	selector.building_id = vm.utils.subject_record.building_id
					// }

					// if( vm.utils.subject_record && vm.utils.subject_record.area_id )
					// {
					// 	selector.area_id = vm.utils.subject_record.area_id;
					// }

					riskmachDatabasesFactory.databases.collection.register_assets.find({
						selector: selector
					}).then(function(results){

						vm.utils.clone_managed_risk.src_subject_list = $filter('orderBy')(results.docs, 'asset_ref');

						console.log("CORE ASSETS");
						console.log(vm.utils.clone_managed_risk.src_subject_list);

						$scope.$apply();

						defer.resolve();
					}).catch(function(error){
						alert(error);
						defer.reject(error);
					});

					return defer.promise;
				},
				overlaySrcListMrMeta: function() {
					var defer = $q.defer();

					managedRiskUtilsFactory.dbUtils.fetchCoreSubjectMrMeta(vm.utils.clone_managed_risk.relations.subject_record_type).then(function(data) {

						angular.forEach(vm.utils.clone_managed_risk.src_subject_list, function(src_record, src_index) {

							var record_id = src_record.record_asset_id;
							if( vm.utils.clone_managed_risk.relations.subject_record_type == 'asset' ) {
								record_id = src_record._id;
							}

							vm.utils.clone_managed_risk.src_subject_list[src_index].mr_meta = null;

							angular.forEach(data, function(mr_meta_record, mr_meta_index) {

								if( mr_meta_record.subject_record_id == record_id ) {
									if( mr_meta_record.data ) {
										mr_meta_record.data = JSON.parse(mr_meta_record.data);
									}

									vm.utils.clone_managed_risk.src_subject_list[src_index].mr_meta = mr_meta_record;
								};

							});

						});

						defer.resolve();

					}, function(error) {
						alert(error);
						defer.reject(error);
					});

					return defer.promise;
				},
				filterSrcSubjectList: function() {

			    	var filtered_array = [];

			    	angular.forEach(vm.utils.clone_managed_risk.src_subject_list, function(src_record, src_index) {

			    		var errors = 0;

		    			var has_published_mr = 'No';

		    			if( vm.utils.hasPublishedMr(src_record.mr_meta) ) {
		    				has_published_mr = 'Yes';
		    			}

		    			if( has_published_mr != 'Yes' ) {
		    				errors++;
		    			};

			    		if( errors == 0 ) {
			    			filtered_array.push(src_record);
			    		};

			    	});

			    	vm.utils.clone_managed_risk.src_subject_list = filtered_array;

				},
				confirm: function() {

					vm.utils.initialising_mr = true;

					// IF NO LATEST PUBLISHED PROPERTY IN SRC META DATA
					if( !vm.utils.clone_managed_risk.src_subject.mr_meta.data.hasOwnProperty('latest_published') || !vm.utils.clone_managed_risk.src_subject.mr_meta.data.latest_published ) {
						
						// IF ONLINE, ATTEMPT TO DOWNLOAD MR DATA
						if( rmConnectivityFactory.online_detection.online ) {
							managedRiskUtilsFactory.downloadMrData(vm.utils.clone_managed_risk.relations).then(function() {

								// FETCH SRC MR META
								managedRiskUtilsFactory.dbUtils.fetchSubjectMrMetaRecord(vm.utils.clone_managed_risk.relations.subject_record_id, vm.utils.clone_managed_risk.relations.subject_record_type).then(function(src_mr_meta) {

									// PARSE JSON DATA
									if( src_mr_meta.data ) {
										src_mr_meta.data = JSON.parse(src_mr_meta.data);
									}

									// SET MR META AND REATTEMPT
									vm.utils.clone_managed_risk.src_subject.mr_meta = src_mr_meta;
									vm.utils.clone_managed_risk.confirm();

								}, function(error) {
									defer.reject(error);
								});

							}, function(error) {
								alert(error);
							});
						} else {
							alert("This subject's Managed Risk has not been downloaded. Please gain an internet connection before trying to use this subject's Managed Risk as a template");
							vm.utils.initialising_mr = false;
						}

						return;
					}

					managedRiskUtilsFactory.cloneManagedRiskFromTemplate(vm.utils.relations.subject_record_id, vm.utils.clone_managed_risk.relations).then(function() {

						vm.utils.fetchActiveLocalDraft().then(function() {

							// INDEX LOCAL DRAFT ON SUBJECT MR META
							managedRiskUtilsFactory.dbUtils.updateSubjectMrMetaWithLocalDraft(vm.utils.active_local_draft_mr._id, vm.utils.relations).then(function() {
								vm.utils.initialising_mr = false;

								vm.utils.enterManagedRisk();
							});

						});

					}, function(error) {
						alert(error);
						vm.utils.initialising_mr = false;
					});

				}
			},
			closeManagedRiskOptions: function() {
				$rootScope.$broadcast("enterManagedRiskOptions::close");
			},
			events: function() {
				$scope.$watchCollection('vm.relations', function(oldVal, newVal) {
					vm.utils.relations = vm.relations;
				});

				$scope.$watch(function(){
					return rmConnectivityFactory.online_detection.online;
				}, function(newVal, oldVal){
					// console.log(rmConnectivityFactory.online_detection.online);
					vm.utils.online = rmConnectivityFactory.online_detection.online;
				});
			}()
		}

		vm.utils.init();
	}

	function managedRiskUtilsFactory($q, $http, $timeout, $filter, riskmachDatabasesFactory, rmUtilsFactory, authFactory, modelsFactory, coreDownloadFactory)
	{
		var factory = {};

		factory.install_setup = {
			active: {
				managed_risk_id: null,
				rm_managed_risk_id: null, 
				rm_managed_risk_ref: null,
				project_id: null,
				mr_version: null,
				project_type: null,
				install_type: null,
				subject_record_type: null, 
				clear: function() {
					factory.install_setup.active.managed_risk_id = null;
					factory.install_setup.active.rm_managed_risk_id = null;
					factory.install_setup.active.rm_managed_risk_ref = null;
					factory.install_setup.active.project_id = null;
					factory.install_setup.active.mr_version = null;
					factory.install_setup.active.project_type = null;
					factory.install_setup.active.install_type = null;
					factory.install_setup.active.subject_name = null;
					factory.install_setup.active.subject_record_type = null;
				}
			},
			dest: {
				is_dest: false,
				managed_risk_id: null, 
				project_id: null, 
				asset_id: null,
				clear: function() {
					factory.install_setup.dest.is_dest = false;
					factory.install_setup.dest.managed_risk_id = null; 
					factory.install_setup.dest.project_id = null;
					factory.install_setup.dest.asset_id = null;
				}
			},
			clone_from_src: false
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
			setRecordUnsynced: function(rm_record) {
				rm_record.date_record_synced = null;
				rm_record.date_content_synced = null;
				rm_record.date_record_imported = null;
				rm_record.date_content_imported = null;
				rm_record.record_modified = 'Yes';

				return rm_record;
			},
			getValueFromIdKey: function(record_type, key, sub_key) {

				var db_id = null;

				// IF KEY NOT SET
				if( key == null ) {
					return db_id;
				};

				key = parseInt(key);

				if( factory.install.hasOwnProperty(record_type) ) {

					if( factory.install[record_type].saved_id_keys.hasOwnProperty(key) ) {
						db_id =  factory.install[record_type].saved_id_keys[key];
					}

				}

				return db_id;
			},
			getValueFromRefKey: function(record_type, key) {

				var db_id = null;

				// IF KEY NOT SET
				if( key == null ) {
					return db_id;
				};

				key = parseInt(key);

				if( factory.install.hasOwnProperty(record_type) ) {

					if( factory.install[record_type].saved_ref_keys.hasOwnProperty(key) ) {
						db_id =  factory.install[record_type].saved_ref_keys[key];
					}

				}

				return db_id;
			},
			filterActiveVerificationMedia: function(media) {
				var filtered = [];
				var i = 0;
				var len = media.length;

				while(i < len) {

					if( !media[i].hasOwnProperty('rm_record_item_id') || !media[i].rm_record_item_id ) {
						filtered.push(media[i]);
					}

					i++;
				}

				return filtered;
			},
			project_record: {
				formatProjectRecord: function(project_record) {
					var formatted = null;
					formatted = angular.copy(project_record);

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();
					formatted.table = 'projects';

					if( project_record.status == null || project_record.status == '' || project_record.status == 0 || project_record.status == '0' ) {
						formatted.status = 1;
					};

					if( factory.install_setup.active.project_type == 'mr_audit' ) {
						formatted.is_managed_risk_audit = 'Yes';
						formatted.is_mr_defect_project = null;

						var title = factory.install_setup.active.subject_name || null;
						if( !title ) {
							title = '(Managed Risk Defect Audit)';
						} else {
							title += ' (Managed Risk Defect Audit)';
						}

						formatted.title = title;
						formatted.description = 'Managed Risk Defect Audit';
						formatted.pp_id = 20; // MANAGED RISK
						formatted.type = 21; // MANAGED RISK DEFECT AUDIT
						formatted.pp_name = 'Managed Risk Assessment';
						formatted.type_name = 'Audit';
					}

					return formatted;
				}
			},
			register_assets: {
				formatAssetRecord: function(asset_record) {
					var formatted = null;
					formatted = angular.copy(asset_record);

					if( asset_record.status == null || asset_record.status == '' || asset_record.status == 0 || asset_record.status == '0' ) {
						formatted.status = 1;
					};

					formatted.is_register = 'Yes';

					return formatted;
				}
			},
			snapshot_record: {
				formatSnapshotAssetRecord: function(asset_record) {
					var formatted = null;
					formatted = angular.copy(asset_record);

					formatted.is_register = 'No';

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();

					if( asset_record.status == null || asset_record.status == '' || asset_record.status == 0 || asset_record.status == '0' ) {
						formatted.status = 1;
					};

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

					return formatted;
				}
			},
			assessments: {
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

					if( assessment_record.lo_initial == null || assessment_record.lo_initial == '' ) {
						formatted.lo_initial = null;
					}

					if( assessment_record.lo_initial == 0 || assessment_record.lo_initial == '0' || assessment_record.lo_initial == '0.0' ) {
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

					if( assessment_record.lo_after == null || assessment_record.lo_after == '' ) {
						formatted.lo_after = null;
					}

					if( assessment_record.lo_after == 0 || assessment_record.lo_after == '0' || assessment_record.lo_after == '0.0' ) {
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

					return formatted;
				}
			},
			hazards: {
				formatHazardRecord: function(hazard_record) {
					var formatted = null;
					formatted = angular.copy(hazard_record);

					formatted.is_register = 'No';

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();

					// if( hazard_record.status == null || hazard_record.status == '' || hazard_record.status == 0 || hazard_record.status == '0' ) {
					// 	formatted.status = 2; // PUBLISHED
					// };

					if( !factory.install_setup.dest.is_dest ) {

						// SET LOCAL MANAGED RISK ID
						formatted.assessment_id = factory.key_utils.getValueFromRefKey('mr_record', hazard_record.rm_assessment_ref, 'db_id');
						// formatted.assessment_id = factory.utils.getValueFromRefKey('mr_record', hazard_record.rm_assessment_ref);
						// SET LOCAL PROJECT ID
						formatted.activity_id = factory.key_utils.getValueFromIdKey('project_record', hazard_record.rm_activity_id, 'db_id');
						// formatted.activity_id = factory.utils.getValueFromIdKey('project_record', hazard_record.rm_activity_id);
						// SET LOCAL ASSET ID
						formatted.asset_id = factory.key_utils.getValueFromIdKey('snapshot_record', hazard_record.rm_asset_id, 'db_id');
						// formatted.asset_id = factory.utils.getValueFromIdKey('snapshot_record', hazard_record.rm_asset_id);
					
					} else {

						// SET LOCAL MANAGED RISK ID
						formatted.assessment_id = factory.install_setup.dest.managed_risk_id;
						// SET LOCAL PROJECT ID
						formatted.activity_id = factory.install_setup.dest.project_id;
						// SET LOCAL ASSET ID
						formatted.asset_id = factory.install_setup.dest.asset_id;

					}

					return formatted;
				}
			},
			controls: {
				formatControlRecord: function(control_record) {
					var formatted = null;
					formatted = angular.copy(control_record);

					formatted.is_register = 'No';

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();

					formatted.is_mr_audit = null;

					// if( control_record.status == null || control_record.status == '' || control_record.status == 0 || control_record.status == '0' ) {
					// 	formatted.status = 2; // PUBLISHED
					// };

					if( !factory.install_setup.dest.is_dest ) {

						// SET LOCAL MANAGED RISK ID
						formatted.assessment_id = factory.key_utils.getValueFromRefKey('mr_record', control_record.rm_assessment_ref, 'db_id');
						// formatted.assessment_id = factory.utils.getValueFromRefKey('mr_record', control_record.rm_assessment_ref);
						// SET LOCAL PROJECT ID
						formatted.activity_id = factory.key_utils.getValueFromIdKey('project_record', control_record.rm_activity_id, 'db_id');
						// formatted.activity_id = factory.utils.getValueFromIdKey('project_record', control_record.rm_activity_id);
						// SET LOCAL ASSET ID
						formatted.asset_id = factory.key_utils.getValueFromIdKey('snapshot_record', control_record.rm_asset_id, 'db_id');
						// formatted.asset_id = factory.utils.getValueFromIdKey('snapshot_record', control_record.rm_asset_id);
					
					} else {

						// SET LOCAL MANAGED RISK ID
						formatted.assessment_id = factory.install_setup.dest.managed_risk_id;
						// SET LOCAL PROJECT ID
						formatted.activity_id = factory.install_setup.dest.project_id;
						// SET LOCAL ASSET ID
						formatted.asset_id = factory.install_setup.dest.asset_id;

					}

					return formatted;
				},
				formatGlobalControlRecord: function(control_record) {
					var formatted = null;
					formatted = angular.copy(control_record);

					formatted.is_register = 'No';

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();

					formatted.is_mr_audit = null;

					formatted.global_control_item = 'Yes';

					formatted.cloud_control_in_place = control_record.control_in_place;
					formatted.cloud_verification_comments = control_record.verification_comments;
					formatted.cloud_verification_status = control_record.verification_status;

					return formatted;
				},
				formatAssetControlItems: function(data) {
					var i = 0;
					var len = data.length;

					var todays_date = new Date().getTime();

					while(i < len) {

						data[i].verification_required = 'Yes';

						if( data[i].date_verification_expires && todays_date < data[i].date_verification_expires ) {
							data[i].verification_required = 'No';
						}

						i++;
					}
				}
			},
			hazard_control_relations: {
				formatHazardControlRelation: function(relation_record) {
					var formatted = null;
					formatted = angular.copy(relation_record);

					formatted.is_register = 'No';

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();

					// if( relation_record.status == null || relation_record.status == '' || relation_record.status == 0 || relation_record.status == '0' ) {
					// 	formatted.status = 2; // PUBLISHED
					// };

					if( !factory.install_setup.dest.is_dest ) {

						// SET LOCAL MANAGED RISK ID
						formatted.assessment_id = factory.key_utils.getValueFromRefKey('mr_record', relation_record.rm_assessment_ref, 'db_id');
						// formatted.assessment_id = factory.utils.getValueFromRefKey('mr_record', relation_record.rm_assessment_ref);
						// SET LOCAL PROJECT ID
						formatted.activity_id = factory.key_utils.getValueFromIdKey('project_record', relation_record.rm_activity_id, 'db_id');
						// formatted.activity_id = factory.utils.getValueFromIdKey('project_record', relation_record.rm_activity_id);
						// SET LOCAL ASSET ID
						formatted.asset_id = factory.key_utils.getValueFromIdKey('snapshot_record', relation_record.rm_asset_id, 'db_id');
						// formatted.asset_id = factory.utils.getValueFromIdKey('snapshot_record', relation_record.rm_asset_id);

					} else {

						// SET LOCAL MANAGED RISK ID
						formatted.assessment_id = factory.install_setup.dest.managed_risk_id;
						// SET LOCAL PROJECT ID
						formatted.activity_id = factory.install_setup.dest.project_id;
						// SET LOCAL ASSET ID
						formatted.asset_id = factory.install_setup.dest.asset_id;

					}

					// SET LOCAL HAZARD ID
					formatted.hazard_id = factory.key_utils.getValueFromRefKey('hazards', relation_record.rm_hazard_ref, 'db_id');
					// formatted.hazard_id = factory.utils.getValueFromRefKey('hazards', relation_record.rm_hazard_ref);
					// SET LOCAL CONTROL ID
					formatted.control_item_id = factory.key_utils.getValueFromRefKey('controls', relation_record.rm_control_item_ref, 'db_id');
					// formatted.control_item_id = factory.utils.getValueFromRefKey('controls', relation_record.rm_control_item_ref);

					return formatted;
				}
			},
			media_records: {
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
						formatted.is_audio = false;
					}

					if( media_record.is_video == 'No' || media_record.is_video == null || media_record.is_video == '' ) {
						formatted.is_video = false;
					}

					if( media_record.is_video == 'Yes' ) {
						formatted.is_video = false;
					}

					if( media_record.media_type == 'video' ) {
						formatted.is_video = true;
					}

					// if( media_record.hasOwnProperty('record_id') && (media_record.record_id == null || media_record.record_id == '') ) {
					// 	formatted.record_not_found = 'Yes';
					// }

					return formatted;
				}
			}
		}

		factory.dbUtils = {
			dbSaveSubjectMrMeta: function(mr_meta_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.subject_mr_meta;

				if( mr_meta_record._id ) {

					db.put(mr_meta_record).then(function(result) {
						mr_meta_record._id = result.id;
						mr_meta_record._rev = result.rev;

						if( mr_meta_record.subject_record_type == 'asset' ) {
							
							factory.dbUtils.indexMrMetaOnCoreAsset(mr_meta_record).then(function() {
								defer.resolve(mr_meta_record);
							}, function(error) {
								defer.reject(error);
							});

						} else {
							defer.resolve(mr_meta_record);
						}

					}).catch(function(error) {
						defer.reject(error);
					});

				} else {

					db.post(mr_meta_record, {force: true}).then(function(result) {
						mr_meta_record._id = result.id;
						mr_meta_record._rev = result.rev;

						if( mr_meta_record.subject_record_type == 'asset' ) {
							
							factory.dbUtils.indexMrMetaOnCoreAsset(mr_meta_record).then(function() {
								defer.resolve(mr_meta_record);
							}, function(error) {
								defer.reject(error);
							});

						} else {
							defer.resolve(mr_meta_record);
						}

					}).catch(function(error) {
						defer.reject(error);
					});

				}

				return defer.promise;
			},	
			saveSubjectMrMeta: function(data, relations) {
				var defer = $q.defer();

				console.log("SUBJECT MR META DATA TO SAVE");
				console.log(data);

				if( !relations.subject_record_id ) {
					defer.reject("The Managed Risk subject was not specified");
					return defer.promise;
				}

				if( !relations.subject_record_type ) {
					defer.reject("The Managed Risk subject type was not specified");
					return defer.promise;
				}

				if( !data.mr_meta ) {
					data.mr_meta = null;
				}

				if( !data.latest_published ) {
					data.latest_published = null;
				}

				if( !data.latest_draft ) {
					data.latest_draft = null;
				}

				factory.dbUtils.fetchSubjectMrMetaRecord(relations.subject_record_id, relations.subject_record_type).then(function(mr_meta_record) {

					if( mr_meta_record == null ) {
						factory.dbUtils.saveNewSubjectMrMeta(data, relations).then(function(saved_meta) {
							defer.resolve(saved_meta);
						}, function(error) {
							defer.reject(error);
						});
					} else {
						factory.dbUtils.updateSubjectMrMeta(data, mr_meta_record._id).then(function(saved_meta) {
							defer.resolve(saved_meta);
						}, function(error) {
							defer.reject(error);
						});
					}

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}, 
			fetchSubjectMrMetaRecord: function(subject_record_id, subject_record_type) {
				var defer = $q.defer();

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
			},
			saveNewSubjectMrMeta: function(data, relations) {
				var defer = $q.defer();

				var options = {force: true};

				var record = modelsFactory.models.newSubjectMrMeta();
				record.rm_subject_record_id = relations.rm_subject_record_id || null;
				record.subject_record_id = relations.subject_record_id;
				record.subject_record_type = relations.subject_record_type;
				record.data = JSON.stringify(data);

				factory.dbUtils.dbSaveSubjectMrMeta(record).then(function(saved_record) {
					defer.resolve(saved_record);
				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			updateSubjectMrMeta: function(data, doc_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.subject_mr_meta.get(doc_id).then(function(doc) {

					// SET EXISTING LOCAL DRAFT MR ID
					var existing_data = JSON.parse(doc.data);
					data.local_draft_mr_id = existing_data.local_draft_mr_id;

					doc.data = JSON.stringify(data);
					doc.date_downloaded = new Date().getTime();

					factory.dbUtils.dbSaveSubjectMrMeta(doc).then(function(saved_record) {
						defer.resolve(saved_record);
					}, function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getNextRecordBatch: function(subject_mr_meta_id, mr_version, mr_record_type) {
				var defer = $q.defer();

				console.log(subject_mr_meta_id);
				console.log(mr_version);
				console.log(mr_record_type);

				riskmachDatabasesFactory.databases.collection.subject_mr_meta.get(subject_mr_meta_id).then(function(doc) {

					doc.data = JSON.parse(doc.data);

					console.log(doc);

					if( !doc.data.hasOwnProperty(mr_version) ) {
						defer.reject("Could not find Managed Risk version: " + mr_version);
						return defer.promise;
					}

					if( !doc.data[mr_version].hasOwnProperty(mr_record_type) ) {
						defer.reject("Could not find " + mr_record_type + " in " + mr_version + " Managed Risk");
						return defer.promise;
					}

					console.log(doc.data[mr_version][mr_record_type]);

					// FIND SUBJECT RECORD TYPE
					if( mr_record_type == 'subject_record' || mr_record_type == 'subject_media' ) {
						var subject_record_type = null;

						if( doc.data.hasOwnProperty('mr_meta') && doc.data.mr_meta ) {
							subject_record_type = doc.data.mr_meta.record_type;
						}
					}

					// SET SUBJECT RECORD TYPE
					doc.data[mr_version][mr_record_type].subject_record_type = subject_record_type;

					defer.resolve(doc.data[mr_version][mr_record_type]);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			installedSubjectMrMeta: function(subject_mr_meta_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.subject_mr_meta.get(subject_mr_meta_id).then(function(doc) {

					doc.date_last_installed = new Date().getTime();

					factory.dbUtils.dbSaveSubjectMrMeta(doc).then(function(saved_record) {
						defer.resolve(saved_record);
					}, function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			downloadedFullSubjectMrMeta: function(relations) {
				var defer = $q.defer();

				factory.dbUtils.fetchSubjectMrMetaRecord(relations.subject_record_id, relations.subject_record_type).then(function(doc) {

					factory.dbUtils.saveDownloadedFullSubjectMrMeta(doc._id).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			saveDownloadedFullSubjectMrMeta: function(subject_mr_meta_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.subject_mr_meta.get(subject_mr_meta_id).then(function(doc) {

					doc.date_full_meta_downloaded = new Date().getTime();

					factory.dbUtils.dbSaveSubjectMrMeta(doc).then(function(saved_record) {
						defer.resolve(saved_record);
					}, function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			updateManagedRiskInstallStatus: function(doc_id, status) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.assessments.get(doc_id, {attachments: true, binary: true}).then(function(doc) {

					doc.mr_installed = status;

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
			fetchActiveLocalDraftManagedRisk: function(subject_record_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.assessments.find({
					selector: {
						user_id: authFactory.cloudUserId(), 
						asset_id: subject_record_id,
						latest_local_draft_mr_copy: 'Yes'
					},
					limit: 1
				}).then(function(results){

					console.log("GOT MANAGED RISK RECORD");
					console.log(results);
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
			discardLocalMrDraftCopy: function(managed_risk_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.assessments.get(managed_risk_id).then(function(mr_doc) {

					mr_doc.latest_local_draft_mr_copy = null;

					riskmachDatabasesFactory.databases.collection.assessments.put(mr_doc).then(function(result) {

						mr_doc._id = result.id;
						mr_doc._rev = result.rev;

						var relations = {
							subject_record_id: mr_doc.asset_id, 
							subject_record_type: 'asset'
						};

						factory.dbUtils.updateSubjectMrMetaWithLocalDraft(null, relations).then(function() {
							defer.resolve(mr_doc);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			fetchActiveLocalAuditManagedRisk: function(subject_record_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.assessments.find({
					selector: {
						user_id: authFactory.cloudUserId(), 
						asset_id: subject_record_id,
						latest_local_audit_mr_copy: 'Yes'
					},
					limit: 1
				}).then(function(results){

					console.log("GOT MANAGED RISK AUDIT RECORD");
					console.log(results);
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
			discardLocalMrAudit: function(managed_risk_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.assessments.get(managed_risk_id).then(function(mr_doc) {

					mr_doc.latest_local_audit_mr_copy = null;

					riskmachDatabasesFactory.databases.collection.assessments.put(mr_doc).then(function(result) {

						mr_doc._id = result.id;
						mr_doc._rev = result.rev;

						defer.resolve(mr_doc);

					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			createNewManagedRiskRecord: function(relations) {
				var defer = $q.defer();

				var managed_risk = modelsFactory.models.newRiskAssessment();
				managed_risk.local_draft_mr_copy = 'Yes';
				managed_risk.latest_local_draft_mr_copy = 'Yes';
				managed_risk.assessment_type = 2; // MANAGED RISK
				managed_risk.status = 7;
				managed_risk.status_name = 'Published';

				if( relations.hasOwnProperty('subject_asset_id') && relations.subject_asset_id ) {
					managed_risk.asset_id = relations.subject_asset_id;
				}

				if( relations.hasOwnProperty('rm_subject_asset_id') && relations.rm_subject_asset_id ) {
					managed_risk.rm_asset_id = relations.rm_subject_asset_id;
				}

				if( relations.hasOwnProperty('subject_record_type') && relations.subject_record_type ) {
					managed_risk.subject_record_type = relations.subject_record_type;
				}

				riskmachDatabasesFactory.databases.collection.assessments.post(managed_risk, {force: true}).then(function(result) {
					managed_risk._id = result.id;
					managed_risk._rev = result.rev;

					defer.resolve(managed_risk);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			createNewManagedRiskProjectRecord: function(relations) {
				var defer = $q.defer();

				var project_record = modelsFactory.models.newProject();
				project_record.is_mr_defect_project = 'Yes';

				if( relations.hasOwnProperty('managed_risk_id') && relations.managed_risk_id ) {
					project_record.managed_risk_id = relations.managed_risk_id;
				}

				if( relations.hasOwnProperty('rm_managed_risk_id') && relations.rm_managed_risk_id ) {
					project_record.rm_managed_risk_id = relations.rm_managed_risk_id;
				}

				if( relations.hasOwnProperty('rm_managed_risk_ref') && relations.rm_managed_risk_ref ) {
					project_record.rm_managed_risk_ref = relations.rm_managed_risk_ref;
				}

				project_record.title = 'Managed Risk Defects';
				project_record.pp_id = 20; // MANAGED RISK
				project_record.type = 5; // PROJECT
				project_record.pp_name = 'Managed Risk Assessment';
				project_record.type_name = 'Project';

				riskmachDatabasesFactory.databases.collection.projects.post(project_record, {force: true}).then(function(result) {
					project_record._id = result.id;
					project_record._rev = result.rev;

					defer.resolve(project_record);
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			createNewManagedRiskSnapshotAssetRecord: function(relations, subject_asset_record) {
				var defer = $q.defer();

				var asset_record = modelsFactory.models.newSnapshotAsset(relations.project_id);

				if( relations.hasOwnProperty('register_asset_id') && relations.register_asset_id ) {
					asset_record.register_asset_id = relations.register_asset_id;
				}

				if( relations.hasOwnProperty('rm_register_asset_id') && relations.rm_register_asset_id ) {
					asset_record.rm_register_asset_id = relations.rm_register_asset_id;
				}

				if( relations.hasOwnProperty('rm_project_id') && relations.rm_project_id ) {
					asset_record.rm_project_id = relations.rm_project_id;
				}

				// SET NEW VALUES
				asset_record.is_managed_risk_asset = 'Yes';
				asset_record.is_register = 'No';

				// SET VALUES FROM CORE ASSET
				asset_record.asset_ref = subject_asset_record.asset_ref;
				asset_record.serial = subject_asset_record.serial;
				asset_record.model = subject_asset_record.model;
				asset_record.type = subject_asset_record.type;
				asset_record.power = subject_asset_record.power;
				asset_record.supplier = subject_asset_record.supplier;
				asset_record.manufacturer = subject_asset_record.manufacturer;
				asset_record.description = subject_asset_record.description;
				asset_record.external_ref_1 = subject_asset_record.external_system_ref;
				asset_record.external_ref_2 = subject_asset_record.external_system_ref_2;
				asset_record.external_ref_3 = subject_asset_record.external_system_ref_3;
				asset_record.external_ref_4 = subject_asset_record.external_system_ref_4;
				asset_record.external_ref_5 = subject_asset_record.external_system_ref_5;
				asset_record.record_type = subject_asset_record.record_type;
				asset_record.designation_id = subject_asset_record.designation_id;

				riskmachDatabasesFactory.databases.collection.assets.post(asset_record, {force: true}).then(function(result) {
					asset_record._id = result.id;
					asset_record._rev = result.rev;

					defer.resolve(asset_record);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			calcManagedRiskScore: function(managed_risk_id) {
				var defer = $q.defer();

				factory.dbUtils.findManagedRiskScores(managed_risk_id).then(function(managed_risk) {

					console.log("CALC MANAGED RISK SCORES");
					console.log(managed_risk);

					// UPDATE MANAGED RISK
					riskmachDatabasesFactory.databases.collection.assessments.post(managed_risk, {force: true}).then(function(result) {
						managed_risk._id = result.id;
						managed_risk._rev = result.rev;

						defer.resolve(managed_risk);
					}).catch(function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			findManagedRiskScores: function(managed_risk_id) {
				var defer = $q.defer();

				var mr_db = riskmachDatabasesFactory.databases.collection.assessments;
				var hazards_db = riskmachDatabasesFactory.databases.collection.mr_hazards;

				// GET MANAGED RISK RECORD
				mr_db.get(managed_risk_id).then(function(managed_risk) {
					// GET MANAGED RISK HAZARDS
					hazards_db.find({
						selector: {assessment_id: managed_risk_id}
					}).then(function(result) {

						managed_risk = factory.dbUtils.findManagedRiskInitialScore(result.docs, managed_risk);
						managed_risk = factory.dbUtils.findManagedRiskAfterScore(result.docs, managed_risk);

						defer.resolve(managed_risk);

					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			findManagedRiskInitialScore: function(hazards, managed_risk) {
				var live_hazards = [];
				// FILTER LIVE HAZARDS
				angular.forEach(hazards, function(haz_record, haz_index) {
					var num_errors = 0;

					// IF DELETED HAZARD
					if( haz_record.status == 2 ) {
						num_errors++;
					}

					// IF HAZARD HAS NO INITIAL SCORE
					if( !haz_record.matrix_score_initial ) {
						num_errors++;
					}

					if( num_errors == 0 ) {
						live_hazards.push(haz_record);
					}
				});

				// IF NO MR HAZARDS, MATRIX SCORES N/A
				if( live_hazards.length == 0 ) {
					managed_risk.matrix_score_initial = null;
					managed_risk.matrix_score_phrase_initial = null;
					return managed_risk;
				}

				// ORDER BY HIGHEST MATRIX-SCORE-INITIAL
				live_hazards = $filter('orderBy')(live_hazards,'matrix_score_initial',true);
				// SET MATRIX INITIAL ON MR
				managed_risk.matrix_score_initial = live_hazards[0].matrix_score_initial;
				managed_risk.matrix_score_phrase_initial = live_hazards[0].matrix_score_phrase_initial;

				return managed_risk;
			},
			findManagedRiskAfterScore: function(hazards, managed_risk) {
				var live_hazards = [];
				// FILTER LIVE HAZARDS
				angular.forEach(hazards, function(haz_record, haz_index) {
					var num_errors = 0;

					// IF DELETED HAZARD
					if( haz_record.status == 2 ) {
						num_errors++;
					}

					// IF HAZARD HAS NO AFTER SCORE
					if( !haz_record.matrix_score_after ) {
						num_errors++;
					}

					if( num_errors == 0 ) {
						live_hazards.push(haz_record);
					}
				});

				// IF NO MR HAZARDS, MATRIX SCORES N/A
				if( live_hazards.length == 0 ) {
					managed_risk.matrix_score_after = null;
					managed_risk.matrix_score_phrase_after = null;
					return managed_risk;
				}

				// ORDER BY HIGHEST MATRIX-SCORE-AFTER
				live_hazards = $filter('orderBy')(live_hazards,'matrix_score_after',true);
				// SET MATRIX AFTER ON MR
				managed_risk.matrix_score_after = live_hazards[0].matrix_score_after;
				managed_risk.matrix_score_phrase_after = live_hazards[0].matrix_score_phrase_after;

				return managed_risk;
			},
			calcManagedRiskNumHazards: function(managed_risk_id) {
				var defer = $q.defer();

				var mr_db = riskmachDatabasesFactory.databases.collection.assessments;
				var hazards_db = riskmachDatabasesFactory.databases.collection.mr_hazards;

				// GET MANAGED RISK RECORD
				mr_db.get(managed_risk_id).then(function(managed_risk) {
					// GET MANAGED RISK HAZARDS
					hazards_db.find({
						selector: {assessment_id: managed_risk_id}
					}).then(function(result) {

						var live_hazards = [];
						angular.forEach(result.docs, function(haz_record, haz_index) {
							// IF HAZARD LIVE
							if( haz_record.status == 1 ) {
								live_hazards.push(haz_record);
							}
						});

						managed_risk.num_hazards = live_hazards.length;

						mr_db.post(managed_risk, {force: true}).then(function(mr_result) {
							managed_risk._id = mr_result.id;
							managed_risk._rev = mr_result.rev;

							defer.resolve(managed_risk);
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
			calcManagedRiskNumControls: function(managed_risk_id) {
				var defer = $q.defer();

				var mr_db = riskmachDatabasesFactory.databases.collection.assessments;
				var controls_db = riskmachDatabasesFactory.databases.collection.mr_controls;

				// GET MANAGED RISK RECORD
				mr_db.get(managed_risk_id).then(function(managed_risk) {
					// GET MANAGED RISK CONTROLS
					controls_db.find({
						selector: {assessment_id: managed_risk_id}
					}).then(function(result) {

						var live_controls = [];
						angular.forEach(result.docs, function(control_record, control_index) {
							// IF CONTROL LIVE
							if( control_record.status == 2 ) {
								live_controls.push(control_record);
							}
						});

						managed_risk.num_controls = live_controls.length;

						mr_db.post(managed_risk, {force: true}).then(function(mr_result) {
							managed_risk._id = mr_result.id;
							managed_risk._rev = mr_result.rev;

							defer.resolve(managed_risk);
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
			runDataMetaUpdates: function() {
				var defer = $q.defer();
				var update_defer = $q.defer();

				var updates = [
					'mr_num_hazards',
					'mr_num_controls',
					'hazard_num_controls',
					'control_num_hazards',
					'records_num_files'
				];

				var managed_risk_id = factory.install_setup.active.managed_risk_id;

				runNextMetaUpdate(update_defer, updates, 0).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function runNextMetaUpdate(defer, updates, update_index) {
					// FINISHED UPDATES
					if( update_index > updates.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					if( updates[update_index] == 'mr_num_hazards' ) {
						factory.dbUtils.calcManagedRiskNumHazards(managed_risk_id).then(function() {

							update_index++;

							runNextMetaUpdate(defer, updates, update_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( updates[update_index] == 'mr_num_controls' ) {
						factory.dbUtils.calcManagedRiskNumControls(managed_risk_id).then(function() {

							update_index++;

							runNextMetaUpdate(defer, updates, update_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( updates[update_index] == 'hazard_num_controls' ) {
						factory.dbUtils.updateHazardsNumControls(managed_risk_id).then(function() {

							update_index++;

							runNextMetaUpdate(defer, updates, update_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( updates[update_index] == 'control_num_hazards' ) {
						factory.dbUtils.updateControlsNumHazards(managed_risk_id).then(function() {

							update_index++;

							runNextMetaUpdate(defer, updates, update_index);

						}, function(error) {
							defer.reject(error);
						});
					}

					if( updates[update_index] == 'records_num_files' ) {
						factory.updateInstalledRecordsNumFiles().then(function() {

							update_index++;

							runNextMetaUpdate(defer, updates, update_index);

						}, function(error) {
							defer.reject(error);
						});
					}
 
					return defer.promise;
				}

				return defer.promise;
			},
			updateHazardsNumControls: function(managed_risk_id) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var hazards_db = riskmachDatabasesFactory.databases.collection.mr_hazards;

				// GET MANAGED RISK HAZARDS
				hazards_db.find({
					selector: {assessment_id: managed_risk_id}
				}).then(function(result) {
					var hazards = result.docs;

					if( hazards.length == 0 ) {
						defer.resolve();
						return defer.promise;
					} 

					updateHazardsNumControls(save_defer, hazards, 0).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function updateHazardsNumControls(defer, hazards, hazard_index) {
						// UPDATED ALL HAZARDS
						if( hazard_index > hazards.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						// DO MARK UPDATE RECORDS CONTROL COUNT
						factory.dbUtils.calcHazardsNumControls(hazards[hazard_index]).then(function() {

							hazard_index++;

							// UPDATE NEXT RECORDS NUM CONTROLS
							updateHazardsNumControls(defer, hazards, hazard_index);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			calcHazardsNumControls: function(hazard_doc) {
				var defer = $q.defer();
 
				var hazards_db = riskmachDatabasesFactory.databases.collection.mr_hazards;
				var controls_db = riskmachDatabasesFactory.databases.collection.mr_controls;
				var relations_db = riskmachDatabasesFactory.databases.collection.hazard_control_relations;
					
				// GET HAZARDS CONTROL RELATIONS
				relations_db.find({
					selector: {hazard_id: hazard_doc._id}
				}).then(function(relations_result) {
					var relations = relations_result.docs;

					// IF NO RELATIONS, NUM CONTROLS IS 0
					if( relations.length == 0 ) {
						hazard_doc.num_controls = 0;
						hazard_doc.num_verified_controls = 0;
						// SAVE HAZARD
						hazards_db.post(hazard_doc, {force: true}).then(function(result) {
							hazard_doc._id = result;
							hazard_doc._rev = result;

							defer.resolve(hazard_doc);
						}).catch(function(error) {
							console.log("ERROR UPDATING HAZARD WITH NO CONTROLS");
							defer.reject(error);
						});

						return defer.promise;
					}

					// GET ALL CONTROLS FOR MR
					controls_db.find({
						selector: {assessment_id: hazard_doc.assessment_id}
					}).then(function(controls_result) {
						var controls = controls_result.docs;

						var control_meta = factory.dbUtils.countHazardsControls(relations, controls);

						hazard_doc.num_controls = control_meta.num_controls;
						hazard_doc.num_verified_controls = control_meta.num_verified_controls;

						// SAVE HAZARD
						hazards_db.post(hazard_doc, {force: true}).then(function(result) {
							hazard_doc._id = result;
							hazard_doc._rev = result;

							defer.resolve(hazard_doc);
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

				return defer.promise;
			},
			countHazardsControls: function(relations, controls) {
				var linked_control_ids = [];
				var control_meta = {
					num_controls: 0, 
					num_verified_controls: 0
				};

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
						control_meta.num_controls++;

						if( control_record.control_in_place == 'Yes' && control_record.verification_status == 'Suitable' ) 
						{
							control_meta.num_verified_controls++;
						}
					}

				});

				return control_meta;
			},
			updateControlsNumHazards: function(managed_risk_id) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var controls_db = riskmachDatabasesFactory.databases.collection.mr_controls;

				// GET MANAGED RISK CONTROLS
				controls_db.find({
					selector: {assessment_id: managed_risk_id}
				}).then(function(result) {
					var controls = result.docs;

					if( controls.length == 0 ) {
						defer.resolve();
						return defer.promise;
					} 

					updateControlsNumHazards(save_defer, controls, 0).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function updateControlsNumHazards(defer, controls, control_index) {
						// UPDATED ALL CONTROLS
						if( control_index > controls.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						// DO MARK UPDATE RECORDS HAZARD COUNT
						factory.dbUtils.calcControlsNumHazards(controls[control_index]).then(function() {

							control_index++;

							// UPDATE NEXT RECORDS NUM HAZARDS
							updateControlsNumHazards(defer, controls, control_index);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			calcControlsNumHazards: function(control_doc) {
				var defer = $q.defer();

				var controls_db = riskmachDatabasesFactory.databases.collection.mr_controls;
				var hazards_db = riskmachDatabasesFactory.databases.collection.mr_hazards;
				var relations_db = riskmachDatabasesFactory.databases.collection.hazard_control_relations;
					
				// GET CONTROLS HAZARD RELATIONS
				relations_db.find({
					selector: {control_item_id: control_doc._id}
				}).then(function(relations_result) {
					var relations = relations_result.docs;

					// IF NO RELATIONS, NUM HAZARDS IS 0
					if( relations.length == 0 ) {
						control_doc.num_hazards = 0;
						// SAVE CONTROL
						controls_db.post(control_doc, {force: true}).then(function(result) {
							control_doc._id = result;
							control_doc._rev = result;

							defer.resolve(control_doc);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					// GET ALL HAZARDS FOR MANAGED RISK
					hazards_db.find({
						selector: {assessment_id: control_doc.assessment_id}
					}).then(function(hazards_result) {
						var hazards = hazards_result.docs;

						control_doc.num_hazards = factory.dbUtils.countControlsHazards(relations, hazards);

						// SAVE CONTROL
						controls_db.post(control_doc, {force: true}).then(function(result) {
							control_doc._id = result;
							control_doc._rev = result;

							defer.resolve(control_doc);
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
			updateSubjectMrMetaWithLocalDraft: function(local_mr_id, subject_relations) {
				var defer = $q.defer();

				factory.dbUtils.findCreateSubjectMrMeta(subject_relations).then(function(mr_meta_record) {

					var data = JSON.parse(mr_meta_record.data);
					data.local_draft_mr_id = local_mr_id;

					mr_meta_record.data = JSON.stringify(data);

					factory.dbUtils.dbSaveSubjectMrMeta(mr_meta_record).then(function(saved_record) {
						defer.resolve(saved_record);
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			findCreateSubjectMrMeta: function(subject_relations) {
				var defer = $q.defer();

				factory.dbUtils.fetchSubjectMrMetaRecord(subject_relations.subject_record_id, subject_relations.subject_record_type).then(function(mr_meta_record) {

					if( mr_meta_record != null ) {
						defer.resolve(mr_meta_record);
						return defer.promise;
					}

					// CREATE MR META RECORD
					var new_mr_meta_record = modelsFactory.models.newSubjectMrMeta();
					new_mr_meta_record.date_downloaded = null;
					new_mr_meta_record.data = {
						latest_draft: null, 
						latest_published: null,
						mr_meta: null,
						local_draft_mr_id: null
					}

					new_mr_meta_record.rm_subject_record_id = subject_relations.rm_subject_record_id || null;
					new_mr_meta_record.subject_record_id = subject_relations.subject_record_id;
					new_mr_meta_record.subject_record_type = subject_relations.subject_record_type;
					new_mr_meta_record.data = JSON.stringify(new_mr_meta_record.data);

					factory.dbUtils.dbSaveSubjectMrMeta(new_mr_meta_record).then(function(saved_record) {
						defer.resolve(saved_record);
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			fetchCoreSubjectMrMeta: function(record_type) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.subject_mr_meta.find({
					selector: {
						user_id: authFactory.cloudUserId(),
						client_id: authFactory.getActiveCompanyId(),
						subject_record_type: record_type
					}
				}).then(function(result) {
					console.log("FETCHED COMPANY MR META");
					console.log(result.docs);
					defer.resolve(result.docs);
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			indexMrMetaOnCoreAsset: function(mr_meta_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.register_assets;

				db.get(mr_meta_record.subject_record_id).then(function(asset_doc) {

					mr_meta_record.data = JSON.parse(mr_meta_record.data);

					asset_doc.associated_mr_meta = mr_meta_record;

					db.put(asset_doc).then(function(result) {

						asset_doc._id = result.id;
						asset_doc._rev = result.rev;

						defer.resolve(asset_doc);

					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			markControlVerificationMediaContentsImported: function(media) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				saveNextRecord(save_defer, 0).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function saveNextRecord(defer, active_index) {

					if( active_index > media.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					factory.dbUtils.markControlVerificationMediaRecordContentsImported(media[active_index]).then(function() {

						active_index++;
						saveNextRecord(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			markControlVerificationMediaRecordContentsImported: function(media_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.media;

				media_record.date_content_imported = new Date().getTime();

				db.put(media_record).then(function(result) {
					media_record._id = result.id;
					media_record._rev = result.rev;
					defer.resolve(media_record);
				}).catch(function(error) {
					defer.reject(error);
				});
				
				return defer.promise;
			},
			control_item: {
				getRecord: function(control_id) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.mr_controls;

					db.get(control_id).then(function(control_doc) {

						console.log("GOT CONTROL ITEM RECORD");
						defer.resolve(control_doc);

					}).catch(function(error) {
						console.log("ERROR FETCHING CONTROL ITEM RECORD");
						defer.reject(error);
					});

					return defer.promise;
				},
				save: function(control_item) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.mr_controls;

					db.put(control_item).then(function(result) {
						control_item._id = result.id;
						control_item._rev = result.rev;
						defer.resolve(control_item);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveGlobalControlItemRecord: function(record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.mr_controls;

					// ADD MODEL KEYS AND FORMAT
					record = factory.utils.formatRmRecordToModel('mr_control', record);

					// SET VALUES FOR SYNC
					// record = factory.utils.setRecordUnsynced(record);

					// FORMAT ANY ANOMALIES
					record = factory.utils.controls.formatGlobalControlRecord(record);

					db.post(record).then(function(result) {

						record._id = result.id;
						record._rev = result.rev;

						defer.resolve(record);

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				markControlVerificationImported: function(control_item) {
					var defer = $q.defer();

					control_item.date_record_synced = new Date().getTime(); 
					control_item.date_content_synced = new Date().getTime();
					control_item.date_record_imported = new Date().getTime();
					control_item.record_modifed = 'No';

					factory.dbUtils.control_item.save(control_item).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				markControlItemContentsImported: function(control_item) {
					var defer = $q.defer();

					control_item.date_content_imported = new Date().getTime();

					factory.dbUtils.control_item.save(control_item).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			media_records: {
				saveGlobalControlItemMedia: function(media, record_id) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					saveNextMedia(save_defer, 0).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveNextMedia(defer, active_index) {

						if( active_index > media.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						// SET LOCAL RECORD ID
						media[active_index].record_id = record_id;

						factory.dbUtils.media_records.saveGlobalControlItemMediaRecord(media[active_index]).then(function() {

							active_index++;
							saveNextMedia(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				saveGlobalControlItemMediaRecord: function(media_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					media_record = factory.utils.formatRmRecordToModel('media_record', media_record);

					// SET VALUES FOR SYNC
					media_record.date_record_synced = new Date().getTime();
					media_record.date_content_synced = new Date().getTime();
					media_record.date_record_imported = new Date().getTime();
					media_record.date_content_imported = new Date().getTime();
					media_record.record_modified = 'No';

					// FORMAT ANY ANOMALIES
					media_record = factory.utils.media_records.formatMediaRecord(media_record);

					factory.dbUtils.media_records.rmMediaRecord(media_record.rm_ref, media_record.record_id).then(function(existing_record) {

						if( existing_record == null ) {
							factory.dbUtils.media_records.saveNewGlobalControlItemMediaRecord(media_record).then(function(saved_media) {
								defer.resolve(saved_media);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.media_records.updateGlobalControlItemMediaRecord(media_record, existing_record).then(function(saved_media) {
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
				saveNewGlobalControlItemMediaRecord: function(media_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					// SET RM ID FOR IMPORTING, FETCHES EXISTING CLOUD IMAGE FILE
					media_record.file_download_rm_id = media_record.rm_id;

					// SET RM OBJECT
					var rm_record = angular.copy(media_record);
					media_record.rm_record = rm_record;

					console.log("GLOBAL CONTROL ITEM MEDIA RECORD FOR SAVE");
					console.log(JSON.stringify(media_record, null, 2));

					riskmachDatabasesFactory.databases.collection.media.post(media_record, options).then(function(saved_record) {

						media_record._id = saved_record.id;
						media_record._rev = saved_record.rev;

						console.log("SAVED GLOBAL CONTROL ITME NEW MEDIA RECORD");

						defer.resolve(media_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateGlobalControlItemMediaRecord: function(media_record, existing_record) {
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
				rmMediaRecord: function(rm_ref, record_id) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.media;

					db.find({
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
				},
				markControlVerificationMediaImported: function(record, result) {
					var defer = $q.defer();

					// UPDATE IMPORT VALUES
					record.date_record_synced = new Date().getTime();
					record.date_content_synced = new Date().getTime();
					record.date_record_imported = new Date().getTime();
					record.record_modified = 'No';

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('media_record') || result.media_record == null ) {
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
					record.rm_id = parseInt(result.media_record.ID);
					record.rm_ref = parseInt(result.media_record.Ref);
					record.rm_revision_number = parseInt(result.media_record.RevisionNumber);
					record.rm_record_item_id = parseInt(result.media_record.RecordItemID);
					record.rm_record_item_ref = parseInt(result.media_record.RecordItemRef);
					record.file_size = result.media_record.filesize;
					record.mime_type = result.media_record.MimeType;

					// SET CLOUD MEDIA PATH
					// record.media_path = result.media_path;
					
					record.file_download_rm_id = parseInt(result.media_record.ID);

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
				},
				updateVerificationMediaLogId: function(control_item, media) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var verification_id = control_item.verification_log_id;

					console.log("UPDATE VERIFICATION MEDIA LOG ID");
					console.log(verification_id);

					updateNextMedia(save_defer, 0).then(function() {
						console.log("UPDATED MEDIA WITH VERIFICATION ID");
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function updateNextMedia(defer, active_index) {

						if( active_index > media.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						media[active_index].rm_record_item_id = verification_id;
						media[active_index].rm_record_item_ref = verification_id;

						riskmachDatabasesFactory.databases.collection.media.put(media[active_index]).then(function(result) {
							
							media[active_index]._id = result.id;
							media[active_index]._rev = result.rev;

							active_index++;
							updateNextMedia(defer, active_index);

						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				}
			}
		}

		factory.requests = {
			subjectMrMeta: function(relations) {
				var defer = $q.defer();

				var filters = {
					company_id: authFactory.cloudCompanyId(), 
					record_type: null, 
					asset_id: null, 
					paginate: 'no',
					per_page: null, 
					page_num: null
				}

				if( relations.hasOwnProperty('subject_record_type') ) {

					var record_type = relations.subject_record_type;

					// CONVERT TO EMPTY STRING IF ASSET
					if( record_type == 'asset' ) {
						record_type = "";
					}

					filters.record_type = [record_type];
				}

				if( relations.hasOwnProperty('rm_subject_record_id') ) {
					filters.asset_id = relations.rm_subject_record_id;
				}

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/ManagedRiskSubjectsOverlay',{ 
	                params: {
	                	filters: filters
	                }
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("MR META REQUEST RESPONSE");
	            	console.log(filters);
	            	console.log( JSON.stringify(data, null, 2) );

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		if( filters.asset_id ) {
	            			if( data.data.length == 0 ) {
	            				defer.resolve(null);
	            			} else {
	            				defer.resolve(data.data[0]);
	            			}
	            		} else {
	            			defer.resolve(data.data);
	            		}
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("MR META ERROR REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );
	                defer.reject("Error connecting to API for Managed Risk META");
	            });

				return defer.promise;
			},
			subjectMrData: function(relations) {
				var defer = $q.defer();

				var params = {
					record_type: null, 
					subject_record_id: null,
					version: null
				}

				if( relations.hasOwnProperty('subject_record_type') ) {
					params.record_type = relations.subject_record_type;
				}

				if( relations.hasOwnProperty('rm_subject_record_id') ) {
					params.subject_record_id = relations.rm_subject_record_id;
				}

				if( relations.hasOwnProperty('mr_version') ) {
					params.version = relations.mr_version;
				}

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/ManagedRiskData',{ 
	                params: params
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("MR DATA REQUEST RESPONSE");
	            	console.log(params);
	            	console.log( JSON.stringify(data, null, 2) );

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		defer.resolve(data.mr_data);
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("MR DATA ERROR REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );
	                defer.reject("Error connecting to API for Managed Risk data");
	            });

				return defer.promise;
			},
			assetControlItems: function(filters) {
				var defer = $q.defer();

				if( !filters ) {
					defer.resolve();
					return defer.promise;
				}

				console.log("CONTROL ITEMS FILTERS");
				console.log(filters);

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/ManagedRiskControlItemListing',{ 
		        	params: {
		        		filters: filters
		        	}
		        })
		        .success(function(data, status, headers, config) {
		        	console.log("ASSET CONTROL ITEM LISTING RESPONSE");
		       		console.log(data);

		        	if( data.error == true ) {
		        		defer.reject(data.error_messages[0]);
		        	} else {
		        		defer.resolve(data);
		        	};
		        })
		        .error(function(data, status, headers, config) {
		        	console.log("ERROR CONNECTING TO ASSET CONTROL ITEM LISTING API");
		        	console.log(data);
		            defer.reject("Error connecting to API to fetch asset control items");
		        });

				return defer.promise;
			},
			verifyControlItem: function(control_item) {
				var defer = $q.defer();

				console.log("BEGIN VERIFY CONTROL");
				console.log(control_item);

				if( !control_item ) {
					defer.reject("There is no control item provided");
					return defer.promise;
				}

				var num_attempts = 0;
				var attempt_limit = 3;
				var last_error = null;

				uploadControlItem(control_item);

				function uploadControlItem(control_item) {

					if( num_attempts == attempt_limit ) {
						defer.reject(last_error);
						return defer.promise;
					}

					$http.post("https://system.riskmach.co.uk/laravel/public/webapp/v1/VerifyControlItem",{ 
		            	params: {
		            		data: control_item,
		            	}
		            })
					.success(function(data, status, headers, config) {

						if( data.error == true )
						{
							//TRY AGAIN
							num_attempts++;
							last_error = data.error_messages[0];
		            		uploadControlItem(control_item);
						}
						else
						{
							if( data.hasOwnProperty('record') && data.record ) {
								control_item.verification_log_id = data.record.ID;
							}

							factory.dbUtils.control_item.markControlVerificationImported(control_item).then(function() {
								defer.resolve();
							}, function(error) {
								console.log("ERROR MARKING CONTROL VERIFICATION IMPORTED");
								defer.reject(error);
							});
						}
		            })
		            .error(function(data, status, headers, config) {
		            	//TRY AGAIN
		            	num_attempts++;
		            	last_error = "Error connecting to verify control endpoint";
		            	uploadControlItem(control_item);
					});

				}

				return defer.promise;
			},
			controlItemMedia: function(rm_id) {
				var defer = $q.defer();

				var filters = {
					activity_id: null,
					asset_id: null,
					record_type: 'control_item',
					record_item_id: rm_id, 
					record_item_ref: null, 
					status_id: null,
					paginate: 'yes',
					page_num: 1,
					per_page: 700
				}

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/ProjectMediaRecords',{ 
		        	params: {
		        		filters: filters
		        	}
		        })
		        .success(function(data, status, headers, config) {
		        	console.log("CONTROL ITEM MEDIA RESPONSE");
		       		console.log(data);

		        	if( data.error == true ) {
		        		defer.reject(data.error_messages[0]);
		        	} else {
		        		defer.resolve(data.data);
		        	};
		        })
		        .error(function(data, status, headers, config) {
		        	console.log("ERROR CONNECTING TO CONTROL MEDIA API");
		        	console.log(data);
		            defer.reject("Error connecting to API to fetch control item media");
		        });

				return defer.promise;
			},
			coreAsset: function(rm_asset_id) {
				var defer = $q.defer();

				if( !rm_asset_id ) {
					defer.resolve(null);
					return defer.promise;
				}

				var params = {
					filters: {
						client_id: authFactory.getActiveCompanyId(),
						record_type: null,
						asset_id: rm_asset_id,
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

        		$http.get("https://system.riskmach.co.uk/laravel/public/webapp/v1/RegisterAssets",{ 
	                params: params
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("REGISTER ASSET RESPONSE");
	            	console.log(data);

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {

	            		if( data.hasOwnProperty('data') && data.data ) {
	            			defer.resolve(data.data[0]);
	            		} else {
	            			defer.resolve(null);
	            		}
	            		
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("ERROR REGISTER ASSET REQUEST RESPONSE");
	            	console.log(data);
	                defer.reject("Error connecting to API for Core asset");
	            });

				return defer.promise;
			}
		}

		factory.key_utils = {
			subject_record: {
				id_keys: {},
				ref_keys: {}
			},
			subject_record_asset: {
				id_keys: {},
				ref_keys: {}
			},
			project_record: {
				id_keys: {},
				ref_keys: {}
			},
			snapshot_record: {
				id_keys: {},
				ref_keys: {}
			},
			mr_record: {
				id_keys: {},
				ref_keys: {}
			},
			hazards: {
				id_keys: {},
				ref_keys: {}
			},
			controls: {
				id_keys: {},
				ref_keys: {}
			},
			hazard_control_relations: {
				id_keys: {},
				ref_keys: {}
			},
			subject_media: {
				id_keys: {},
				ref_keys: {}
			},
			project_media: {
				id_keys: {},
				ref_keys: {}
			},
			record_assets: {
				id_keys: {},
				ref_keys: {}
			},
			resetAll: function() {
				factory.key_utils.subject_record.id_keys = {};
				factory.key_utils.subject_record.ref_keys = {};

				factory.key_utils.subject_record_asset.id_keys = {};
				factory.key_utils.subject_record_asset.ref_keys = {};

				factory.key_utils.project_record.id_keys = {};
				factory.key_utils.project_record.ref_keys = {};

				factory.key_utils.snapshot_record.id_keys = {};
				factory.key_utils.snapshot_record.ref_keys = {};

				factory.key_utils.mr_record.id_keys = {};
				factory.key_utils.mr_record.ref_keys = {};

				factory.key_utils.hazards.id_keys = {};
				factory.key_utils.hazards.ref_keys = {};

				factory.key_utils.controls.id_keys = {};
				factory.key_utils.controls.ref_keys = {};

				factory.key_utils.hazard_control_relations.id_keys = {};
				factory.key_utils.hazard_control_relations.ref_keys = {};

				factory.key_utils.subject_media.id_keys = {};
				factory.key_utils.subject_media.ref_keys = {};

				factory.key_utils.project_media.id_keys = {};
				factory.key_utils.project_media.ref_keys = {};

				factory.key_utils.record_assets.id_keys = {};
				factory.key_utils.record_assets.ref_keys = {};
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

		factory.control_listing = {
			requestData: function(filters) {
				var defer = $q.defer();

				console.log("ASSET CONTROL ITEMS FILTER");
				console.log(filters);

				factory.requests.assetControlItems(filters).then(function(data) {

					factory.utils.controls.formatAssetControlItems(data);

					defer.resolve(data);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getGlobalControlItems: function(filters) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var options = {
					limit: 100,
					include_docs: true
				}

				var db = riskmachDatabasesFactory.databases.collection.mr_controls;

				var control_items = [];

				var page_num = 0;

				fetchNextPage(fetch_defer).then(function() {

					console.log("GOT LOCAL GLOBAL CONTROL ITEMS");
					console.log(control_items);

					defer.resolve(control_items);
				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) 
				{
					page_num++;
					console.log("CONTROL PAGE: " + page_num);

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

								if( !result.rows[i].doc.hasOwnProperty('company_id') || result.rows[i].doc.company_id != authFactory.cloudCompanyId() ) {
									errors++;
								}

								// SITE FILTER
								if( filters.hasOwnProperty('site_id') && filters.site_id ) {

									if( !result.rows[i].doc.hasOwnProperty('rm_site_id') || result.rows[i].doc.rm_site_id != filters.site_id ) {
										errors++;
									}

								}

								// BUILDING FILTER
								if( filters.hasOwnProperty('building_id') && filters.building_id ) {

									if( !result.rows[i].doc.hasOwnProperty('rm_building_id') || result.rows[i].doc.rm_building_id != filters.building_id ) {
										errors++;
									}

								}

								// AREA FILTER
								if( filters.hasOwnProperty('area_id') && filters.area_id ) {

									if( !result.rows[i].doc.hasOwnProperty('rm_area_id') || result.rows[i].doc.rm_area_id != filters.area_id ) {
										errors++;
									}

								}

								// ASSET FILTER
								if( filters.hasOwnProperty('asset_id') && filters.asset_id ) {

									if( !result.rows[i].doc.hasOwnProperty('rm_asset_id') || result.rows[i].doc.rm_asset_id != filters.asset_id ) {
										errors++;
									}

								}

								if( !result.rows[i].doc.hasOwnProperty('global_control_item') || result.rows[i].doc.global_control_item != 'Yes' ) {
									errors++;
								}

								if( !errors ) {
									control_items.push(result.rows[i].doc);
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
		}

		factory.requestSaveSubjectMrData = function(relations) {
			var defer = $q.defer();

			factory.requestSubjectMrData(relations).then(function(data) {

				factory.dbUtils.saveSubjectMrMeta(data, relations).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.requestSubjectMrData = function(relations) 
		{
			var defer = $q.defer();
			var request_defer = $q.defer();

			var active_index = 0;
			var active_stage = null;
			var stages = ['mr_meta','latest_published','latest_draft'];
			var data = {};
			var attempts = 0;
			var attempt_limit = 3;

			requestNextStage(request_defer, stages, active_index).then(function() {
				defer.resolve(data);
			}, function(error) {
				defer.reject(error);
			});

			function requestNextStage(defer, stages, active_index) 
			{	
				// FINISHED REQUESTS
				if( active_index > stages.length - 1 ) {
					defer.resolve(data);
					return defer.promise;
				}

				active_stage = stages[active_index];

				if( active_stage == 'mr_meta' ) {
					factory.requests.subjectMrMeta(relations).then(function(meta_data) {
						data[active_stage] = meta_data;

						active_index++;

						requestNextStage(defer, stages, active_index);

					}, function(error) {

						attempts++;

						// IF EXCEEDED ATTEMPT LIMIT, ERROR OUT
						if( attempts > attempt_limit ) {
							defer.reject(error);

							return defer.promise;
						};

						requestNextStage(defer, stages, active_index);

					})
				}

				if( active_stage == 'latest_published' ) {
					relations.mr_version = 'published';

					factory.requests.subjectMrData(relations).then(function(mr_data) {
						data[active_stage] = mr_data;

						active_index++;

						requestNextStage(defer, stages, active_index);

					}, function(error) {

						attempts++;

						// IF EXCEEDED ATTEMPT LIMIT, ERROR OUT
						if( attempts > attempt_limit ) {
							defer.reject(error);

							return defer.promise;
						};

						requestNextStage(defer, stages, active_index);

					})
				}

				if( active_stage == 'latest_draft' ) {
					relations.mr_version = 'draft';

					factory.requests.subjectMrData(relations).then(function(mr_data) {
						data[active_stage] = mr_data;

						active_index++;

						requestNextStage(defer, stages, active_index);

					}, function(error) {

						attempts++;

						// IF EXCEEDED ATTEMPT LIMIT, ERROR OUT
						if( attempts > attempt_limit ) {
							defer.reject(error);

							return defer.promise;
						};

						requestNextStage(defer, stages, active_index);

					})
				}

				return defer.promise;
			}

			return defer.promise;
		}

		factory.installManagedRiskFromMeta = function(subject_mr_meta_id, mr_version, project_type, stages) 
		{
			var defer = $q.defer();
			var install_defer = $q.defer();

			factory.install_setup.active.mr_version = mr_version;
			factory.install_setup.active.project_type = project_type;

			if( mr_version == 'latest_draft' ) {
				// CONTINUE
				factory.install_setup.active.install_type = 'Continue';
			} else {
				// NEW
				factory.install_setup.active.install_type = 'New';
			}

			installNextRecordBatch(install_defer, subject_mr_meta_id, mr_version, stages, 0).then(function() {
				// RUN DATA COUNT UPDATES
				factory.dbUtils.runDataMetaUpdates().then(function() {
					// UPDATE SUBJECT MR META WITH LAST INSTALLED
					factory.dbUtils.installedSubjectMrMeta(subject_mr_meta_id).then(function() {
						// UPDATE MANAGED RISK INSTALL STATUS
						factory.dbUtils.updateManagedRiskInstallStatus(factory.install_setup.active.managed_risk_id, 'Yes').then(function() {

							factory.install_setup.active.clear();
							factory.install_setup.dest.clear();
							factory.install_setup.clone_from_src = false;

							factory.key_utils.resetAll();

							defer.resolve();
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

			function installNextRecordBatch(defer, subject_mr_meta_id, mr_version, stages, active_index) {

				if( active_index > stages.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				var active_stage = stages[active_index];

				factory.install.installNextRecordBatch(subject_mr_meta_id, mr_version, active_stage).then(function() {

					active_index++;

					installNextRecordBatch(defer, subject_mr_meta_id, mr_version, stages, active_index);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}

			return defer.promise;
		}

		factory.startNewManagedRisk = function(subject_asset_id) 
		{
			var defer = $q.defer();
			var stage_defer = $q.defer();

			var stages = ['subject_asset','managed_risk','project','snapshot_asset'];
			var mr_records = {};

			runNextStage(stage_defer, stages, 0).then(function() {

				// SET MR AS INSTALLED
				mr_records['managed_risk'].mr_installed = 'Yes';
				
				riskmachDatabasesFactory.databases.collection.assessments.post(mr_records['managed_risk'], {force: true}).then(function(result) {
					mr_records['managed_risk']._id = result.id;
					mr_records['managed_risk']._rev = result.rev;

					defer.resolve(mr_records);

				}).catch(function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			function runNextStage(defer, stages, stage_index) 
			{	
				// FINISHED ALL STAGES
				if( stage_index > stages.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				if( stages[stage_index] == 'subject_asset' ) {
					factory.dbFetch.register_assets.localRegisterAssetRecord(subject_asset_id).then(function(subject_record) {

						mr_records[ stages[stage_index] ] = subject_record;

						stage_index++;

						runNextStage(defer, stages, stage_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( stages[stage_index] == 'managed_risk' ) {
					var mr_relations = {
						subject_asset_id: mr_records['subject_asset']._id,
						rm_subject_asset_id: mr_records['subject_asset'].rm_id
					}

					if( mr_records['subject_asset'].record_type == 'site' || mr_records['subject_asset'].record_type == 'Site' ) {
						mr_relations.subject_record_type = 'site';
					}

					if( mr_records['subject_asset'].record_type == 'building' || mr_records['subject_asset'].record_type == 'Building' ) {
						mr_relations.subject_record_type = 'building';
					}

					if( mr_records['subject_asset'].record_type == 'area' || mr_records['subject_asset'].record_type == 'Area' ) {
						mr_relations.subject_record_type = 'area';
					}

					if( mr_records['subject_asset'].record_type == 'asset' || mr_records['subject_asset'].record_type == 'Asset' || mr_records['subject_asset'].record_type == 'Machine' || mr_records['subject_asset'].record_type == '' || !mr_records['subject_asset'].record_type ) {
						mr_relations.subject_record_type = 'asset';
					}
 
					factory.dbUtils.createNewManagedRiskRecord(mr_relations).then(function(managed_risk) {

						mr_records[ stages[stage_index] ] = managed_risk;

						stage_index++;

						runNextStage(defer, stages, stage_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( stages[stage_index] == 'project' ) {
					var project_relations = {
						managed_risk_id: mr_records['managed_risk']._id,
						rm_managed_risk_id: mr_records['managed_risk'].rm_id,
						rm_managed_risk_ref: mr_records['managed_risk'].rm_ref
					}

					factory.dbUtils.createNewManagedRiskProjectRecord(project_relations).then(function(project_record) {

						mr_records[ stages[stage_index] ] = project_record;

						stage_index++;

						runNextStage(defer, stages, stage_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( stages[stage_index] == 'snapshot_asset' ) {
					var asset_relations = {
						register_asset_id: mr_records['subject_asset']._id, 
						rm_register_asset_id: mr_records['subject_asset'].rm_id,
						project_id: mr_records['project']._id, 
						rm_project_id: mr_records['project'].rm_id
					}

					factory.dbUtils.createNewManagedRiskSnapshotAssetRecord(asset_relations, mr_records['subject_asset']).then(function(asset_record) {

						mr_records[ stages[stage_index] ] = asset_record;

						stage_index++;

						runNextStage(defer, stages, stage_index);

					}, function(error) {
						defer.reject(error);
					});
				} 
 
				return defer.promise;
			}

			return defer.promise;
		}

		factory.validateManagedRisk = function(managed_risk_id) 
		{
			var defer = $q.defer();
			var val_defer = $q.defer();

			var validations = ['hazard_ratings','controls_no_hazard'];
			var data = {
				error: false
			};

			validateNextStage(val_defer, validations, 0).then(function() {
				defer.resolve(data);
			}, function(error) {
				defer.reject(error);
			});

			function validateNextStage(defer, validations, val_index) {

				if( val_index > validations.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				if( validations[val_index] == 'hazard_ratings' ) {
					factory.validateMrHazardRatings(managed_risk_id).then(function(hazards_not_rated) {

						data.num_hazards_not_rated = hazards_not_rated;

						if( hazards_not_rated > 0 ) {
							data.error = true;
						}

						val_index++;

						validateNextStage(defer, validations, val_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				// if( validations[val_index] == 'hazards_no_control' ) {
				// 	factory.validateMrHazardsHaveControl(managed_risk_id).then(function(hazards_no_control) {

				// 		data.num_hazards_no_control = hazards_no_control;

				// 		val_index++;

				// 		validateNextStage(defer, validations, val_index);

				// 	}, function(error) {
				// 		defer.reject(error);
				// 	});
				// }

				if( validations[val_index] == 'controls_no_hazard' ) {
					factory.validateMrControlsHaveHazard(managed_risk_id).then(function(controls_no_hazard) {

						data.num_controls_no_hazard = controls_no_hazard;

						if( controls_no_hazard > 0 ) {
							data.error = true;
						}

						val_index++;

						validateNextStage(defer, validations, val_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;
			}

			return defer.promise;
		}

		factory.validateMrHazardRatings = function(managed_risk_id) 
		{
			var defer = $q.defer();

			factory.dbFetch.hazards.mrHazards(managed_risk_id).then(function(hazards) {

				var num_errors = factory.doValidateMrHazardRatings(hazards);

				defer.resolve(num_errors);

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.doValidateMrHazardRatings = function(hazards) 
		{
			if( hazards.length == 0 ) {
				return 0;
			}

			var validation_errors = 0;

			angular.forEach(hazards, function(hazard_record, hazard_index) {

				if( !hazard_record.matrix_score_initial || !hazard_record.matrix_score_after ) {
					validation_errors++;
				}

			});

			return validation_errors;
		}

		factory.validateMrControlsHaveHazard = function(managed_risk_id) 
		{
			var defer = $q.defer();

			factory.dbFetch.controls.mrControls(managed_risk_id).then(function(controls) {

				var num_errors = factory.doValidateMrControlsHaveHazard(controls);

				defer.resolve(num_errors);

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.doValidateMrControlsHaveHazard = function(controls) 
		{
			if( controls.length == 0 ) {
				return 0;
			}

			var validation_errors = 0;

			var i = 0;
			var len = controls.length;
			while(i < len) {

				if( !controls[i].num_hazards || controls[i].num_hazards == 0 ) {
					validation_errors++;
				}

				i++;
			}

			return validation_errors;
		}

		factory.softValidateManagedRisk = function(managed_risk_id) 
		{
			var defer = $q.defer();
			var val_defer = $q.defer();

			var validations = ['hazards_no_control'];
			var data = {
				error: false
			};

			validateNextStage(val_defer, validations, 0).then(function() {
				defer.resolve(data);
			}, function(error) {
				defer.reject(error);
			});

			function validateNextStage(defer, validations, val_index) {

				if( val_index > validations.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				if( validations[val_index] == 'hazards_no_control' ) {
					factory.getMrHazardsHaveNoControl(managed_risk_id).then(function(hazards_no_control) {

						data.num_hazards_no_control = hazards_no_control;

						if( hazards_no_control > 0 ) {
							data.error = true;
						}

						val_index++;

						validateNextStage(defer, validations, val_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;
			}

			return defer.promise;
		}

		factory.getMrHazardsHaveNoControl = function(managed_risk_id) 
		{
			var defer = $q.defer();

			factory.dbFetch.hazards.mrHazards(managed_risk_id).then(function(hazards) {

				var num_errors = factory.countHazardsNoControls(hazards);

				defer.resolve(num_errors);

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.countHazardsNoControls = function(hazards) 
		{
			if( hazards.length == 0 ) {
				return 0;
			}

			var validation_errors = 0;

			var i = 0;
			var len = hazards.length;
			while(i < len) {

				if( !hazards[i].num_controls || hazards[i].num_controls == 0 ) {
					validation_errors++;
				} 

				i++;
			}

			return validation_errors;
		}

		factory.downloadMrData = function(relations) 
		{
			var defer = $q.defer();

			factory.requestSaveSubjectMrData(relations).then(function() {

				factory.dbUtils.downloadedFullSubjectMrMeta(relations).then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.dbFetch = {
			register_assets: {
				rmRegisterAssetRecord: function(rm_id) {
					var defer = $q.defer();

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
				localRegisterAssetRecord: function(doc_id) {
					var defer = $q.defer();

					riskmachDatabasesFactory.databases.collection.register_assets.get(doc_id).then(function(doc){
						console.log("GOT SUBJECT ASSET RECORD");
						console.log(doc);

						defer.resolve(doc);

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			project_record: {
				rmProjectRecord: function(rm_id) {
					var defer = $q.defer();

					// IF DOWNLOAD TYPE IS NEW
					if( factory.install_setup.active.hasOwnProperty('install_type') && factory.install_setup.active.install_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.projects.find({
						selector: {
							table: 'projects',
							user_id: authFactory.cloudUserId(), 
							rm_id: rm_id, 
							managed_risk_id: factory.install_setup.active.managed_risk_id,
							status: 1
						},
						limit: 1
					}).then(function(results){

						console.log("GOT MANAGED RISK PROJECT RECORD");
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
			snapshot_record: {
				rmSnapshotAssetRecord: function(rm_id) {
					var defer = $q.defer();

					// IF DOWNLOAD TYPE IS NEW
					if( factory.install_setup.active.hasOwnProperty('install_type') && factory.install_setup.active.install_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}

					var selector = {
						table: 'assets',
						user_id: authFactory.cloudUserId(), 
						rm_id: rm_id,
						project_id: factory.install_setup.active.project_id
					};

					riskmachDatabasesFactory.databases.collection.assets.find({
						selector: {
							table: 'assets',
							user_id: authFactory.cloudUserId(), 
							rm_id: rm_id,
							project_id: factory.install_setup.active.project_id
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

					riskmachDatabasesFactory.databases.collection.assets.find({
						selector: {
							table: 'assets',
							user_id: authFactory.cloudUserId(), 
							rm_parent_asset_id: rm_asset_id,
							project_id: factory.install_setup.active.project_id
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
			hazards: {
				rmHazardRecord: function(rm_ref) {
					var defer = $q.defer();

					// IF DOWNLOAD TYPE IS NEW
					if( factory.install_setup.active.hasOwnProperty('install_type') && factory.install_setup.active.install_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.mr_hazards.find({
						selector: {
							user_id: authFactory.cloudUserId(), 
							rm_ref: rm_ref, 
							activity_id: factory.install_setup.active.project_id
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
				},
				mrHazards: function(managed_risk_id) {
					var defer = $q.defer();

					riskmachDatabasesFactory.databases.collection.mr_hazards.find({
						selector: {
							// activity_id: vm.utils.active_records.data.project._id,
							// asset_id: vm.utils.active_records.data.asset._id,
							// task_id: vm.utils.hazard_listing.filters.task_id
							assessment_id: managed_risk_id,
							status: 1 // LIVE
						}
					}).then(function(result){
						defer.resolve(result.docs);
					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			controls: {
				rmControlRecord: function(rm_ref) {
					var defer = $q.defer();

					// IF DOWNLOAD TYPE IS NEW
					if( factory.install_setup.active.hasOwnProperty('install_type') && factory.install_setup.active.install_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.mr_controls.find({
						selector: {
							user_id: authFactory.cloudUserId(), 
							rm_ref: rm_ref, 
							activity_id: factory.install_setup.active.project_id
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
				},
				mrControls: function(managed_risk_id) {
					var defer = $q.defer();

					riskmachDatabasesFactory.databases.collection.mr_controls.find({
						selector: {
							// activity_id: vm.utils.active_records.data.project._id,
							// asset_id: vm.utils.active_records.data.asset._id,
							// task_id: vm.utils.control_listing.filters.task_id
							assessment_id: managed_risk_id,
							status: 2 // LIVE
						}
					}).then(function(result){
						defer.resolve(result.docs);
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
					if( factory.install_setup.active.hasOwnProperty('install_type') && factory.install_setup.active.install_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.hazard_control_relations.find({
						selector: {
							user_id: authFactory.cloudUserId(), 
							rm_hazard_ref: rm_hazard_ref, 
							rm_control_ref: rm_control_ref,
							activity_id: factory.install_setup.active.project_id
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
				},
				mrHazardControlRelations: function(relations) {
					var defer = $q.defer();

					var selector = {};

					if( relations.hasOwnProperty('hazard_id') && relations.hazard_id ) {
						selector.hazard_id = relations.hazard_id;
					}

					if( relations.hasOwnProperty('control_item_id') && relations.control_item_id ) {
						selector.control_item_id = relations.control_item_id;
					}

					riskmachDatabasesFactory.databases.collection.hazard_control_relations.find({
						selector: selector
					}).then(function(result) {
						defer.resolve(result.docs);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			mr_record: {
				rmManagedRiskRecord: function(rm_ref) {
					var defer = $q.defer();

					// IF DOWNLOAD TYPE IS NEW
					if( factory.install_setup.active.hasOwnProperty('install_type') && factory.install_setup.active.install_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
						return defer.promise;
					}

					var selector = {
						user_id: authFactory.cloudUserId(), 
						rm_ref: rm_ref
					};

					if( factory.install_setup.active.project_type == 'mr_edit' ) {
						selector.latest_local_draft_mr_copy = 'Yes';
					}

					if( factory.install_setup.active.project_type == 'mr_audit' ) {
						selector.latest_local_audit_mr_copy = 'Yes';
					}

					riskmachDatabasesFactory.databases.collection.assessments.find({
						selector: selector,
						limit: 1
					}).then(function(results){

						console.log("GOT MANAGED RISK RECORD");
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
					if( factory.install_setup.active.hasOwnProperty('install_type') && factory.install_setup.active.install_type == 'New' ) {
						// RESOLVE NULL TO FORCE SAVE NEW
						defer.resolve(null);
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
			}
		}

		factory.install = {
			installNextRecordBatch: function(subject_mr_meta_id, mr_version, mr_record_type) {
				var defer = $q.defer();

				factory.dbUtils.getNextRecordBatch(subject_mr_meta_id, mr_version, mr_record_type).then(function(data) {

					// NO DATA OF THIS RECORD TYPE TO INSTALL
					if( !data || data.length == 0 ) {
						defer.resolve();
						return defer.promise;
					}

					factory.install[mr_record_type].install(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			subject_record: {
				saved_id_keys: {},
				saved_ref_keys: {},
				core_id_stages: {
					sites: {
						rm_id: null,
						local_id: null
					}, 
					buildings: {
						rm_id: null,
						local_id: null
					},
					areas: {
						rm_id: null,
						local_id: null
					},
					register_assets: {
						rm_id: null, 
						local_id: null
					}
				},
				install: function(data) {
					var defer = $q.defer();

					console.log("INSTALL SUBJECT RECORD");
					console.log(data);

					// data.subject_record_type == 'Machine'
					if( 1 == 1 ) {

						if( data.subject_record_type == 'Machine' ) {
							factory.install_setup.active.subject_record_type = 'asset';
						}

						if( data.subject_record_type == 'Site' ) {
							factory.install_setup.active.subject_record_type = 'site';
						}

						if( data.subject_record_type == 'Building' ) {
							factory.install_setup.active.subject_record_type = 'building';
						}

						if( data.subject_record_type == 'area' ) {
							factory.install_setup.active.subject_record_type = 'area';
						}

						factory.install.subject_record.core_id_stages.sites.rm_id = data.rm_site_id;
						factory.install.subject_record.core_id_stages.buildings.rm_id = data.rm_building_id;
						factory.install.subject_record.core_id_stages.areas.rm_id = data.rm_area_id;
						factory.install.subject_record.core_id_stages.register_assets.rm_id = data.rm_parent_asset_id;

						coreDownloadFactory.dbUtils.getLocalCoreIds(factory.install.subject_record.core_id_stages).then(function(core_id_stages) {

							// SET LOCAL SITE ID
							data.site_id = core_id_stages.sites.local_id;
							// SET LOCAL BUILDING ID
							data.building_id = core_id_stages.buildings.local_id;
							// SET LOCAL AREA ID
							data.area_id = core_id_stages.areas.local_id;
							// SET LOCAL PARENT ASSET ID
							data.parent_asset_id = core_id_stages.register_assets.local_id;

							coreDownloadFactory.dbUtils.register_assets.saveRegisterAssetRecord(data).then(function(saved_asset) {
							
								factory.install_setup.active.subject_name = data.asset_ref;

								// STORE RMID - DB ID KEY VALUE PAIRS
								factory.key_utils.storeIdKey('subject_record_asset', saved_asset._id, saved_asset.rm_id, 'db_id');
								// factory.install.subject_record_asset.saved_id_keys[saved_asset.rm_id] = saved_asset._id;

								defer.resolve();

							}, function(error) {
								defer.reject(error);
							});

						});

						return defer.promise;
					}

					// if( data.subject_record_type == 'Site' ) {
					// 	factory.install_setup.active.subject_record_type = 'site';

					// 	coreDownloadFactory.dbUtils.sites.saveSiteRecord(data).then(function(saved_site) {

					// 		factory.install_setup.active.subject_name = data.name;

					// 		factory.install.subject_record_asset.saved_id_keys[saved_site.rm_record_asset_id] = saved_site.record_asset_id;
					// 		defer.resolve();

					// 	}, function(error) {
					// 		defer.reject(error);
					// 	});

					// 	return defer.promise;
					// }

					// if( data.subject_record_type == 'Building' ) {
					// 	factory.install_setup.active.subject_record_type = 'building';

					// 	factory.install.subject_record.core_id_stages.sites.rm_id = data.rm_site_id;
					// 	factory.install.subject_record.core_id_stages.buildings.rm_id = null;
					// 	factory.install.subject_record.core_id_stages.areas.rm_id = null;
					// 	factory.install.subject_record.core_id_stages.register_assets.rm_id = null;

					// 	coreDownloadFactory.dbUtils.getLocalCoreIds(factory.install.subject_record.core_id_stages).then(function(core_id_stages) {

					// 		// SET LOCAL SITE ID
					// 		data.site_id = core_id_stages.sites.local_id;

					// 		coreDownloadFactory.dbUtils.buildings.saveBuildingRecord(data).then(function(saved_building) {
								
					// 			factory.install_setup.active.subject_name = data.name;

					// 			factory.install.subject_record_asset.saved_id_keys[saved_building.rm_record_asset_id] = saved_building.record_asset_id;
					// 			defer.resolve();

					// 		}, function(error) {
					// 			defer.reject(error);
					// 		});

					// 	});

					// 	return defer.promise;
					// }

					// if( data.subject_record_type == 'area' ) {
					// 	factory.install_setup.active.subject_record_type = 'area';

					// 	factory.install.subject_record.core_id_stages.sites.rm_id = data.rm_site_id;
					// 	factory.install.subject_record.core_id_stages.buildings.rm_id = data.rm_building_id;
					// 	factory.install.subject_record.core_id_stages.areas.rm_id = null;
					// 	factory.install.subject_record.core_id_stages.register_assets.rm_id = null;

					// 	coreDownloadFactory.dbUtils.getLocalCoreIds(factory.install.subject_record.core_id_stages).then(function(core_id_stages) {

					// 		// SET LOCAL SITE ID
					// 		data.site_id = core_id_stages.sites.local_id;
					// 		// SET LOCAL BUILDING ID
					// 		data.building_id = core_id_stages.buildings.local_id;

					// 		coreDownloadFactory.dbUtils.areas.saveAreaRecord(data).then(function(saved_area) {

					// 			factory.install_setup.active.subject_name = data.name;

					// 			factory.install.subject_record_asset.saved_id_keys[saved_area.rm_record_asset_id] = saved_area.record_asset_id;
					// 			defer.resolve();

					// 		}, function(error) {
					// 			defer.reject(error);
					// 		});

					// 	});

					// 	return defer.promise;
					// }

					return defer.promise;
				}
			},
			subject_record_asset: {
				saved_id_keys: {},
				saved_ref_keys: {}
			},
			project_record: {
				saved_id_keys: {},
				saved_ref_keys: {},
				install: function(data) {
					var defer = $q.defer();

					factory.install.project_record.saveProjectRecord(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveProjectRecord: function(project_record) {
					var defer = $q.defer();

					factory.install.project_record.doSaveProjectRecord(project_record).then(function(saved_project) {

						factory.install_setup.active.project_id = saved_project._id;

						// STORE RMID - DB ID KEY VALUE PAIRS
						factory.key_utils.storeIdKey('project_record', saved_project._id, saved_project.rm_id, 'db_id');
						// factory.install.project_record.saved_id_keys[ saved_project.rm_id ] = saved_project._id;

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
					project_record = factory.utils.setRecordUnsynced(project_record);

					// FORMAT ANY ANOMALIES
					project_record = factory.utils.project_record.formatProjectRecord(project_record);

					// SET MANAGED RISK VALUES
					project_record.managed_risk_id = factory.key_utils.getValueFromRefKey('mr_record', project_record.rm_managed_risk_ref, 'db_id');
					// project_record.managed_risk_id = factory.utils.getValueFromRefKey('mr_record', project_record.rm_managed_risk_ref);
					project_record.rm_managed_risk_id = factory.install_setup.active.rm_managed_risk_id;

					factory.dbFetch.project_record.rmProjectRecord(project_record.rm_id).then(function(existing_record) {

						if( existing_record == null ) {
							factory.install.project_record.saveNewProjectRecord(project_record).then(function(saved_project) {
								defer.resolve(saved_project);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.install.project_record.updateProjectRecord(project_record, existing_record).then(function(saved_project) {
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

					if( factory.install_setup.active.hasOwnProperty('install_type') && factory.install_setup.active.install_type == 'New' ) {
						// SET TO NULL SO SYNC WILL BE NEW PROJECT
						project_record.rm_id = null;
						project_record.rm_ref = null;

						var start_date_o = new Date();
						var start_date = start_date_o.getFullYear() + '-' + ('0' + (start_date_o.getMonth()+1)).slice(-2) + '-' + ('0' + start_date_o.getDate()).slice(-2);
						project_record.start_date = start_date;

						project_record.user_id = authFactory.cloudUserId();
						project_record.company_id = authFactory.cloudCompanyId();
						project_record.date_added = Date.now();

						project_record.record_modified = 'Yes';
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

					db.post(existing_record, options).then(function(saved_record) {
						existing_record._id = saved_record.id;
						existing_record._rev = saved_record.rev;

						console.log("PROJECT RM RECORD UPDATED");

						defer.resolve(existing_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			snapshot_record: {
				saved_id_keys: {}, 
				saved_ref_keys: {},
				install: function(data) {
					var defer = $q.defer();

					factory.install.snapshot_record.saveSnapshotAssetRecord(data).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveSnapshotAssetRecord: function(asset_record) {
					var defer = $q.defer();

					factory.install.snapshot_record.doSaveSnapshotAssetRecord(asset_record).then(function(saved_asset) {

						factory.install.snapshot_record.updateChildAssetsParentId(saved_asset.rm_id, saved_asset._id).then(function() {

							// STORE RMID - DB ID KEY VALUE PAIRS
							factory.key_utils.storeIdKey('snapshot_record', saved_asset._id, saved_asset.rm_id, 'db_id');
							// factory.install.snapshot_record.saved_id_keys[ saved_asset.rm_id ] = saved_asset._id;

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
					asset_record = factory.utils.setRecordUnsynced(asset_record);

					// FORMAT ANY ANOMALIES
					asset_record = factory.utils.snapshot_record.formatSnapshotAssetRecord(asset_record);

					// SET LOCAL PROJECT ID
					asset_record.project_id = factory.key_utils.getValueFromIdKey('project_record', asset_record.rm_project_id, 'db_id');
					// asset_record.project_id = factory.utils.getValueFromIdKey('project_record', asset_record.rm_project_id);

					// SET LOCAL RM REGISTER ASSET ID HERE
					asset_record.register_asset_id = factory.key_utils.getValueFromIdKey('subject_record_asset', asset_record.rm_register_asset_id, 'db_id');
					// asset_record.register_asset_id = factory.utils.getValueFromIdKey('subject_record_asset', asset_record.rm_register_asset_id);

					factory.dbFetch.snapshot_record.rmSnapshotAssetRecord(asset_record.rm_id).then(function(existing_record) {

						if( existing_record == null ) {
							factory.install.snapshot_record.saveNewSnapshotAssetRecord(asset_record).then(function(saved_asset) {
								defer.resolve(saved_asset);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.install.snapshot_record.updateSnapshotAssetRecord(asset_record, existing_record).then(function(saved_asset) {
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

					asset_record.is_managed_risk_asset = null;
					asset_record.is_mr_audit_asset = null;

					if( factory.install_setup.active.project_type == 'mr_edit' ) {
						asset_record.is_managed_risk_asset = 'Yes';
					}

					if( factory.install_setup.active.project_type == 'mr_audit' ) {
						asset_record.is_mr_audit_asset = 'Yes';
					}

					var orig_record = null;

					if( factory.install_setup.active.hasOwnProperty('install_type') && factory.install_setup.active.install_type == 'New' ) {
						orig_record = angular.copy(asset_record);

						asset_record.rm_id = null;
						asset_record.rm_ref = null;
						asset_record.rm_project_id = null;
						asset_record.rm_record_id = null;
						asset_record.rm_parent_asset_id = null;
						// asset_record.rm_register_asset_id = null;
						asset_record.rm_site_id = null;
						asset_record.rm_building_id = null;
						asset_record.rm_area_id = null;
						asset_record.record_modified = 'Yes';

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

					return defer.promise;
				},
				updateChildAssetsParentId: function(rm_asset_id, local_asset_id) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					factory.dbFetch.snapshot_record.childAssets(rm_asset_id).then(function(child_assets) {

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
							asset.parent_asset_id = local_asset_id;

							db.post(asset).then(function() {

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
				}
			},
			mr_record: {
				saved_id_keys: {},
				saved_ref_keys: {},
				install: function(data) {
					var defer = $q.defer();

					factory.install.mr_record.saveManagedRiskRecord(data).then(function() {

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveManagedRiskRecord: function(assessment_record) {
					var defer = $q.defer();

					factory.install.mr_record.doSaveManagedRiskRecord(assessment_record).then(function(saved_assessment) {

						factory.install_setup.active.managed_risk_id = saved_assessment._id;
						factory.install_setup.active.rm_managed_risk_id = saved_assessment.rm_id;
						factory.install_setup.active.rm_managed_risk_ref = saved_assessment.rm_ref;

						// STORE RMREF - DB ID KEY VALUE PAIR
						factory.key_utils.storeRefKey('mr_record', saved_assessment._id, saved_assessment.rm_ref, 'db_id');
						// factory.install.mr_record.saved_ref_keys[ saved_assessment.rm_ref ] = saved_assessment._id;

						defer.resolve(saved_assessment);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveManagedRiskRecord: function(assessment_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					assessment_record = factory.utils.formatRmRecordToModel('risk_assessment', assessment_record);

					// SET VALUES FOR SYNC
					assessment_record = factory.utils.setRecordUnsynced(assessment_record);

					// FORMAT ANY ANOMALIES
					assessment_record = factory.utils.assessments.formatRiskAssessmentRecord(assessment_record);

					// SET LOCAL RM SUBJECT ASSET ID HERE
					assessment_record.asset_id = factory.key_utils.getValueFromIdKey('subject_record_asset', assessment_record.rm_asset_id, 'db_id');
					// assessment_record.asset_id = factory.utils.getValueFromIdKey('subject_record_asset', assessment_record.rm_asset_id);

					factory.dbFetch.mr_record.rmManagedRiskRecord(assessment_record.rm_ref).then(function(existing_record) {

						if( existing_record == null ) {
							factory.install.mr_record.saveNewManagedRiskRecord(assessment_record).then(function(saved_assessment) {
								defer.resolve(saved_assessment);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.install.mr_record.updateManagedRiskRecord(assessment_record, existing_record).then(function(saved_assessment) {
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
				saveNewManagedRiskRecord: function(assessment_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					if( factory.install_setup.active.project_type == 'mr_edit' ) {
						assessment_record.local_draft_mr_copy = 'Yes';
						assessment_record.latest_local_draft_mr_copy = 'Yes';
					}

					if( factory.install_setup.active.project_type == 'mr_audit' ) {
						assessment_record.local_audit_mr_copy = 'Yes';
						assessment_record.latest_local_audit_mr_copy = 'Yes';
					}

					assessment_record.from_mr_version = factory.install_setup.active.mr_version;
					assessment_record.subject_record_type = factory.install_setup.active.subject_record_type;

					var orig_record = null;

					if( factory.install_setup.active.hasOwnProperty('install_type') && factory.install_setup.active.install_type == 'New' ) {
						orig_record = angular.copy(assessment_record);

						assessment_record.rm_activity_id = null;
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

						console.log("SAVED MANAGED RISK");

						defer.resolve(assessment_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateManagedRiskRecord: function(assessment_record, existing_record) {
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

					return defer.promise;
				}
			},
			hazards: {
				saved_id_keys: {}, 
				saved_ref_keys: {},
				install: function(data) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					// IF NO DATA TO SAVE
					if( data.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveHazardRecord(save_defer, data[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveHazardRecord(defer, hazard_record) {

						factory.install.hazards.saveHazardRecord(hazard_record).then(function(saved_hazard) {

							active_index++;

							// IF SAVED ALL HAZARDS
							if( active_index > data.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveHazardRecord(defer, data[active_index]);
							}, 100);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				saveHazardRecord: function(hazard_record) {
					var defer = $q.defer();

					factory.install.hazards.doSaveHazardRecord(hazard_record).then(function(saved_hazard) {

						// STORE RMREF - DB ID KEY VALUE PAIRS
						factory.key_utils.storeRefKey('hazards', saved_hazard._id, saved_hazard.rm_ref, 'db_id');
						// factory.install.hazards.saved_ref_keys[saved_hazard.rm_ref] = saved_hazard._id;

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
					hazard_record = factory.utils.setRecordUnsynced(hazard_record);

					// FORMAT ANY ANOMALIES
					hazard_record = factory.utils.hazards.formatHazardRecord(hazard_record);

					factory.dbFetch.hazards.rmHazardRecord(hazard_record.rm_ref).then(function(existing_record) {

						if( existing_record == null ) {
							factory.install.hazards.saveNewHazardRecord(hazard_record).then(function(saved_hazard) {
								defer.resolve(saved_hazard);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.install.hazards.updateHazardRecord(hazard_record, existing_record).then(function(saved_hazard) {
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

					if( factory.install_setup.active.hasOwnProperty('install_type') && factory.install_setup.active.install_type == 'New' ) {
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

						if( factory.install_setup.clone_from_src ) {
							hazard_record.rm_merge_to_ref = null;
						} else {
							hazard_record.rm_merge_to_ref = orig_record.rm_ref;
						}

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

					return defer.promise;
				}
			},
			controls: {
				saved_id_keys: {},
				saved_ref_keys: {},
				install: function(data) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					// IF NO DATA TO SAVE
					if( data.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveControlRecord(save_defer, data[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveControlRecord(defer, control_record) {

						factory.install.controls.saveControlRecord(control_record).then(function(saved_control) {

							active_index++;

							// IF SAVED ALL CONTROLS
							if( active_index > data.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveControlRecord(defer, data[active_index]);
							}, 100);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				saveControlRecord: function(control_record) {
					var defer = $q.defer();

					factory.install.controls.doSaveControlRecord(control_record).then(function(saved_control) {

						// STORE RMREF - DB ID KEY VALUE PAIRS
						factory.key_utils.storeRefKey('controls', saved_control._id, saved_control.rm_ref, 'db_id');
						// factory.install.controls.saved_ref_keys[saved_control.rm_ref] = saved_control._id;

						if( saved_control.rm_merge_to_ref ) {
							factory.key_utils.storeRefKey('controls', saved_control._id, saved_control.rm_merge_to_ref, 'db_id');
							// factory.install.controls.saved_ref_keys[saved_control.rm_merge_to_ref] = saved_control._id;
						}

						defer.resolve(saved_control);

						// SETUP RECORD ASSET
						// var record_asset = {};
						// record_asset.rm_id = saved_control.rm_record_asset_id;
						// record_asset.rm_record_id = saved_control.rm_id;
						// record_asset.record_id = saved_control._id;
						// record_asset.asset_ref = saved_control.record_asset_ref;
						// record_asset.description = saved_control.record_asset_description;
						// record_asset.record_type = 'control_item';
						// record_asset.company_id = authFactory.cloudCompanyId();

						// // SAVE RECORD ASSET
						// factory.install.record_assets.saveRecordAsset(record_asset).then(function(saved_asset) {

						// 	saved_control.record_asset_id = saved_asset._id;

						// 	var options = {
						// 		force: true
						// 	};

						// 	// UPDATE LOCAL RECORD ASSET ID
						// 	riskmachDatabasesFactory.databases.collection.mr_controls.post(saved_control, options).then(function(control_result) {
								
						// 		saved_control._id = control_result.id;
						// 		saved_control._rev = control_result.rev;

						// 		defer.resolve(saved_control);

						// 	}).catch(function(error) {
						// 		defer.reject(error);
						// 	});

						// }, function(error) {
						// 	defer.reject(error);
						// });

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
					control_record = factory.utils.setRecordUnsynced(control_record);

					// FORMAT ANY ANOMALIES
					control_record = factory.utils.controls.formatControlRecord(control_record);

					factory.dbFetch.controls.rmControlRecord(control_record.rm_ref).then(function(existing_record) {

						if( existing_record == null ) {
							factory.install.controls.saveNewControlRecord(control_record).then(function(saved_control) {
								defer.resolve(saved_control);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.install.controls.updateControlRecord(control_record, existing_record).then(function(saved_control) {
								defer.resolve(saved_control);
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

					if( factory.install_setup.active.hasOwnProperty('install_type') && factory.install_setup.active.install_type == 'New' ) {
						orig_record = angular.copy(control_record);

						control_record.rm_id = null;
						control_record.rm_ref = null;
						control_record.revision_number = null;
						control_record.rm_asset_id = null;
						control_record.rm_task_id = null;
						control_record.rm_task_ref = null;
						control_record.rm_profile_image_id = null;
						control_record.rm_record_asset_id = null;
						control_record.rm_register_control_item_id = null;
						control_record.rm_activity_id = null;
						control_record.record_modified = 'Yes';

						// CLEAR ANY VERIFICATION VALUES, SO USER HAS TO VERIFY NEW
						control_record.control_in_place = null;
						control_record.verification_status = null;
						control_record.verification_comments = null;

						control_record.cloned_from_rm_id = orig_record.rm_id; 
						control_record.cloned_from_rm_ref = orig_record.rm_ref;

						if( factory.install_setup.clone_from_src ) {
							control_record.rm_merge_to_ref = null;
						} else {
							control_record.rm_merge_to_ref = orig_record.rm_ref;
						}

						// SET AUDIT VALUES
						if( factory.install_setup.active.project_type == 'mr_audit' ) {
							control_record.rm_register_control_item_id = orig_record.rm_id;
							control_record.rm_merge_to_ref = null;
							control_record.is_mr_audit = 'Yes';
						}

					} else {
						// SET RM OBJECT
						var rm_record = angular.copy(control_record);
						control_record.rm_record = rm_record;

						orig_record = angular.copy(control_record);
					}

					riskmachDatabasesFactory.databases.collection.mr_controls.post(control_record, options).then(function(saved_record) {
						// REAPPLY RM VALUES
						control_record = angular.copy(orig_record);

						control_record._id = saved_record.id;
						control_record._rev = saved_record.rev;

						console.log("SAVED CONTROL");

						defer.resolve(control_record);
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

							defer.resolve(control_record);
						}).catch(function(error) {
							defer.reject(error);
						});

						return defer.promise;
					};

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

						console.log("CONTROL RM RECORD UPDATED");

						defer.resolve(existing_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			hazard_control_relations: {
				install: function(data) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					// IF NO DATA TO SAVE
					if( data.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveHazardControlRelation(save_defer, data[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveHazardControlRelation(defer, relation_record) {

						factory.install.hazard_control_relations.saveHazardControlRelation(relation_record).then(function(saved_relation) {

							active_index++;

							// IF SAVED ALL HAZARD CONTROL RELATIONS
							if( active_index > data.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveHazardControlRelation(defer, data[active_index]);
							}, 100);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				saveHazardControlRelation: function(relation_record) {
					var defer = $q.defer();

					factory.install.hazard_control_relations.doSaveHazardControlRelation(relation_record).then(function(saved_relation) {

						relation_record._id = saved_relation.id;
						relation_record._rev = saved_relation.rev;

						defer.resolve(relation_record);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				doSaveHazardControlRelation: function(relation_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					relation_record = factory.utils.formatRmRecordToModel('hazard_control_relation', relation_record);

					// SET VALUES FOR SYNC
					relation_record = factory.utils.setRecordUnsynced(relation_record);

					// FORMAT ANY ANOMALIES
					relation_record = factory.utils.hazard_control_relations.formatHazardControlRelation(relation_record);

					factory.dbFetch.hazard_control_relations.rmHazardControlRelation(relation_record.rm_hazard_ref, relation_record.rm_control_item_ref).then(function(existing_record) {

						if( existing_record == null ) {
							factory.install.hazard_control_relations.saveNewHazardControlRelation(relation_record).then(function(saved_relation) {
								defer.resolve(saved_relation);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.install.hazard_control_relations.updateHazardControlRelation(relation_record, existing_record).then(function(saved_relation) {
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
				saveNewHazardControlRelation: function(relation_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					var orig_record = null;

					if( factory.install_setup.active.hasOwnProperty('install_type') && factory.install_setup.active.install_type == 'New' ) {
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
				updateHazardControlRelation: function(relation_record, existing_record) {
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

					return defer.promise;
				}
			},
			subject_media: {
				saved_id_keys: {},
				saved_ref_keys: {},
				core_id_stages: {
					register_assets: {
						rm_id: null, 
						local_id: null
					}
				},
				install: function(data) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					// IF NO DATA TO SAVE
					if( data.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveRegisterMediaRecord(save_defer, data[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveRegisterMediaRecord(defer, media_record) {

						factory.install.subject_media.saveRegisterMediaRecord(media_record).then(function(saved_media) {

							active_index++;

							// IF SAVED ALL REGISTER MEDIA
							if( active_index > data.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveRegisterMediaRecord(defer, data[active_index]);
							}, 100);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				saveRegisterMediaRecord: function(data) {
					var defer = $q.defer();

					if( data.record_type == 'asset' ) {
						factory.install.subject_media.core_id_stages.register_assets.rm_id = data.rm_record_item_id;

						coreDownloadFactory.dbUtils.getLocalCoreIds(factory.install.subject_media.core_id_stages).then(function(core_id_stages) {

							// SET LOCAL RECORD ID
							data.record_id = core_id_stages.register_assets.local_id;

							coreDownloadFactory.dbUtils.register_media_records.saveRegisterMediaRecord(data).then(function(saved_media) {

								defer.resolve();

							}, function(error) {
								defer.reject(error);
							});

						});
					}

					return defer.promise;
				}
			},
			project_media: {
				install: function(data) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					var active_index = 0;

					// IF NO DATA TO SAVE
					if( data.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					saveMediaRecord(save_defer, data[active_index]).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function saveMediaRecord(defer, media_record) {

						factory.install.project_media.saveMediaRecord(media_record).then(function(media_control) {

							active_index++;

							// IF SAVED ALL PROJECT MEDIA
							if( active_index > data.length - 1 ) {
								defer.resolve();
								return defer.promise;
							};

							$timeout(function() {
								saveMediaRecord(defer, data[active_index]);
							}, 100);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				saveMediaRecord: function(media_record) {
					var defer = $q.defer();

					factory.install.project_media.doSaveMediaRecord(media_record).then(function(saved_media) {

						// UPDATE HAZARD NUM FILES
						if( media_record.record_type == 'assessment_hazard' ) {
							num_files = factory.key_utils.getValueFromRefKey('hazards', media_record.rm_record_item_ref, 'num_files');
							if( num_files == null ) {
								num_files = 1;
							} else {
								num_files++;
							}

							// STORE NUM FILES
							factory.key_utils.updateRefKeyValue('hazards', media_record.rm_record_item_ref, 'num_files', num_files);
						}

						// UPDATE CONTROL NUM FILES
						if( media_record.record_type == 'control_item' ) {
							num_files = factory.key_utils.getValueFromRefKey('controls', media_record.rm_record_item_ref, 'num_files');
							if( num_files == null ) {
								num_files = 1;
							} else {
								num_files++;
							}

							// STORE NUM FILES
							factory.key_utils.updateRefKeyValue('controls', media_record.rm_record_item_ref, 'num_files', num_files);
						}

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
					// media_record = factory.utils.setRecordUnsynced(media_record);
					media_record = factory.utils.setSyncValues(media_record);

					// FORMAT ANY ANOMALIES
					media_record = factory.utils.media_records.formatMediaRecord(media_record);

					if( media_record.record_type == 'assessment_hazard' ) {
						// SET LOCAL HAZARD ID
						media_record.record_id = factory.key_utils.getValueFromRefKey('hazards', media_record.rm_record_item_ref, 'db_id');
						// media_record.record_id = factory.utils.getValueFromRefKey('hazards', media_record.rm_record_item_ref);
					};

					if( media_record.record_type == 'control_item' || media_record.record_type == 'control_item_verification' ) {
						// SET LOCAL CONTROL ID
						media_record.record_id = factory.key_utils.getValueFromRefKey('controls', media_record.rm_record_item_ref, 'db_id');
						// media_record.record_id = factory.utils.getValueFromRefKey('controls', media_record.rm_record_item_ref);
					};

					console.log(media_record);

					factory.dbFetch.media_records.rmMediaRecord(media_record.rm_ref, media_record.record_id).then(function(existing_record) {

						if( existing_record == null ) {
							factory.install.project_media.saveNewMediaRecord(media_record).then(function(saved_media) {
								defer.resolve(saved_media);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.install.project_media.updateMediaRecord(media_record, existing_record).then(function(saved_media) {
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

					var orig_record = null;

					if( factory.install_setup.active.hasOwnProperty('install_type') && factory.install_setup.active.install_type == 'New' ) {
						// IF VERIFICATION MEDIA, DON'T SAVE WHEN NEW INSTALL
						if( media_record.record_type == 'control_item_verification' ) {
							defer.resolve(media_record);
							return defer.promise;
						}

						orig_record = angular.copy(media_record);

						// IF AUDIT PROJECT OR HAZARD MEDIA

						// factory.install_setup.active.project_type == 'mr_audit' ||
						if( media_record.record_type == 'assessment_hazard' || (media_record.record_type == 'control_item' && factory.install_setup.clone_from_src) ) {
							// UNSET RM IDS
							media_record.rm_id = null;
							media_record.rm_ref = null;
							media_record.rm_record_item_id = null;
							media_record.rm_record_item_ref = null;
							media_record.record_modified = 'Yes';
						};

						media_record.cloned_from_rm_id = orig_record.rm_id;
						media_record.file_download_rm_id = orig_record.rm_id;

						if( factory.install_setup.clone_from_src ) {
							media_record.reference_media = 'Yes';
						}

					} else {
						// SET RM OBJECT
						var rm_record = angular.copy(media_record);
						media_record.rm_record = rm_record;

						orig_record = angular.copy(media_record);
					}

					riskmachDatabasesFactory.databases.collection.media.post(media_record, options).then(function(saved_record) {
						// REAPPLY RM VALUES
						media_record = angular.copy(orig_record);

						media_record._id = saved_record.id;
						media_record._rev = saved_record.rev;

						console.log("SAVED MEDIA RECORD");

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

					return defer.promise;
				}
			},
			record_assets: {
				saveRecordAsset: function(record_asset) {
					var defer = $q.defer();

					factory.dbFetch.snapshot_record.rmSnapshotAssetRecord(record_asset.rm_id).then(function(existing_record) {

						if( existing_record == null ) {

							// ADD MODEL KEYS AND FORMAT
							record_asset = factory.utils.formatRmRecordToModel('snapshot_asset', record_asset);

							// SET VALUES FOR SYNC
							record_asset = factory.utils.setRecordUnsynced(record_asset);

							factory.dbUtils.record_assets.saveNewRecordAsset(record_asset).then(function(saved_asset) {
								defer.resolve(saved_asset);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.record_assets.updateRecordAsset(record_asset, existing_record).then(function(saved_asset) {
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

					return defer.promise;
				}
			},
		}

		factory.cloneManagedRiskFromTemplate = function(subject_record_id, src_relations) 
		{
			var defer = $q.defer();

			if( !subject_record_id ) {
				defer.reject("No Subject record identifier has been provided to intialise the new Managed Risk");
				return defer.promise;
			}

			if( !src_relations.hasOwnProperty('subject_record_id') || !src_relations.subject_record_id ) {
				defer.reject("No record identifier has been provided to find the source Managed Risk");
				return defer.promise;
			}

			if( !src_relations.hasOwnProperty('subject_record_type') || !src_relations.subject_record_type ) {
				defer.reject("No record type has been provided to find the source Managed Risk");
				return defer.promise;
			} 

			// START NEW MANAGED RISK TO HOUSE CLONED DATA
			factory.startNewManagedRisk(subject_record_id).then(function(mr_data) {
				
				// FETCH SRC MR META
				factory.dbUtils.fetchSubjectMrMetaRecord(src_relations.subject_record_id, src_relations.subject_record_type).then(function(src_mr_meta) {
					
					// IF NO MR AGAINST SUBJECT
					if( !src_mr_meta ) {
						defer.reject("Could not find the source Managed Risk");
						return defer.promise;
					}

					// PARSE JSON DATA
					if( src_mr_meta.data ) {
						src_mr_meta.data = JSON.parse(src_mr_meta.data);
					}

					// IF NO LATEST PUBLISHED PROPERTY IN SRC META DATA
					if( !src_mr_meta.data.hasOwnProperty('latest_published') || !src_mr_meta.data.latest_published ) {
						defer.reject("Source subject does not have a published Managed Risk");
						return defer.promise;
					}

					// CONVERT SRC MR TO NEWLY CREATED MR
					factory.updateNewMrWithSrcValues(mr_data['managed_risk'], src_mr_meta.data.latest_published.mr_record).then(function() {

						factory.install_setup.active.managed_risk_id = mr_data['managed_risk']._id;
						factory.install_setup.active.project_id = mr_data['project']._id;
						factory.install_setup.dest.is_dest = true;
						factory.install_setup.dest.managed_risk_id = mr_data['managed_risk']._id;
						factory.install_setup.dest.project_id = mr_data['project']._id;
						factory.install_setup.dest.asset_id = mr_data['snapshot_asset']._id;

						factory.install_setup.clone_from_src = true;

						// CLONE SRC MR DATA TO NEW MR
						var stages = ['hazards','controls','hazard_control_relations','project_media'];

						factory.installManagedRiskFromMeta(src_mr_meta._id, 'latest_published', 'mr_edit', stages).then(function() {

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

		factory.updateNewMrWithSrcValues = function(new_mr, src_mr) 
		{
			var defer = $q.defer();

			// SET CLONED FROM VALUES
			new_mr.cloned_from_rm_id = src_mr.rm_id;
			new_mr.cloned_from_rm_ref = src_mr.rm_ref;

			// UPDATE VALUES ON NEW MR WITH SRC VALUES
			new_mr.managed_risk_mode = src_mr.managed_risk_mode;

			new_mr.matrix_consequence_after = src_mr.matrix_consequence_after;
			new_mr.matrix_consequence_initial = src_mr.matrix_consequence_initial;
			new_mr.matrix_consequence_phrase_after = src_mr.matrix_consequence_phrase_after;
			new_mr.matrix_consequence_phrase_initial = src_mr.matrix_consequence_phrase_initial;
			new_mr.matrix_likelihood_after = src_mr.matrix_likelihood_after;
			new_mr.matrix_likelihood_initial = src_mr.matrix_likelihood_initial;
			new_mr.matrix_likelihood_phrase_after = src_mr.matrix_likelihood_phrase_after;
			new_mr.matrix_likelihood_phrase_initial = src_mr.matrix_likelihood_phrase_initial;
			new_mr.matrix_score_after = src_mr.matrix_score_after;
			new_mr.matrix_score_initial = src_mr.matrix_score_initial;
			new_mr.matrix_score_phrase_after = src_mr.matrix_score_phrase_after;
			new_mr.matrix_score_phrase_initial = src_mr.matrix_score_phrase_initial;

			new_mr.total_controls = src_mr.total_controls;
			new_mr.total_controls_in_place = src_mr.total_controls_in_place;
			new_mr.total_controls_not_in_place = src_mr.total_controls_not_in_place;
			new_mr.total_suitable_controls = src_mr.total_suitable_controls;
			new_mr.total_unsuitable_controls = src_mr.total_unsuitable_controls;
			new_mr.total_unverified_controls = src_mr.total_unverified_controls;
			new_mr.total_verified_controls = src_mr.total_verified_controls;

			// SAVE UPDATED MANAGED RISK
			riskmachDatabasesFactory.databases.collection.assessments.post(new_mr, {force: true}).then(function(result) {

				new_mr._id = result.id;
				new_mr._rev = result.rev;

				defer.resolve(new_mr);
			}).catch(function() {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.updateInstalledRecordsNumFiles = function()
		{
			var defer = $q.defer();
			var save_defer = $q.defer();

			var stages = ['hazards','controls'];

			updateNextStage(save_defer, 0).then(function() {

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			function updateNextStage(defer, active_index) {

				if( active_index > stages.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				if( stages[active_index] == 'hazards' ) {
					factory.updateHazardsNumFiles(factory.key_utils.hazards.ref_keys, 'num_files').then(function() {

						active_index++;
						updateNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				if( stages[active_index] == 'controls' ) {
					factory.updateControlsNumFiles(factory.key_utils.controls.ref_keys, 'num_files').then(function() {

						active_index++;
						updateNextStage(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;
			}
 
			return defer.promise;
		}

		factory.updateHazardsNumFiles = function(record_keys, key) {
			var defer = $q.defer();
			var save_defer = $q.defer();

			var max_index = Object.keys(record_keys).length - 1;

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
				Object.keys(record_keys).forEach(function(current_key){
					index_counter++;

					if( index_counter == next_index ) {
						next_record = record_keys[current_key];
					}

				});

				if( !next_record ) {
					defer.reject("Unable to find the next record to update " + key + " count");
					return defer.promise;
				}

				// DO UPDATE RECORDS VALUE
				factory.updateHazardRecordNumFiles(next_record, key).then(function() {

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
		}

		factory.updateHazardRecordNumFiles = function(record, key) {
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

			var db = riskmachDatabasesFactory.databases.collection.mr_hazards;

			db.get(record.db_id).then(function(doc) {

				doc.num_files = record[key];

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
		}

		factory.updateControlsNumFiles = function(record_keys, key) {
			var defer = $q.defer();
			var save_defer = $q.defer();

			var max_index = Object.keys(record_keys).length - 1;

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
				Object.keys(record_keys).forEach(function(current_key){
					index_counter++;

					if( index_counter == next_index ) {
						next_record = record_keys[current_key];
					}

				});

				if( !next_record ) {
					defer.reject("Unable to find the next record to update " + key + " count");
					return defer.promise;
				}

				// DO UPDATE RECORDS VALUE
				factory.updateControlRecordNumFiles(next_record, key).then(function() {

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
		}

		factory.updateControlRecordNumFiles = function(record, key) {
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

			var db = riskmachDatabasesFactory.databases.collection.mr_controls;

			db.get(record.db_id).then(function(doc) {

				doc.num_files = record[key];

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
		}

		factory.requestSaveLocalControlItemVerification = function(control_item, db_control_item) 
		{
			var defer = $q.defer();

			if( !db_control_item ) {
				
				factory.requestCreateLocalControlItemVerification(control_item).then(function(control_record) {

					defer.resolve(control_record);

				}, function(error) {
					defer.reject(error);
				});

			} else {

				factory.requestUpdateLocalControlItemVerification(control_item, db_control_item).then(function(control_record) {

					defer.resolve(control_record);

				}, function(error) {
					defer.reject(error);
				});

			}

			return defer.promise;
		}

		factory.requestCreateLocalControlItemVerification = function(control_item) 
		{
			var defer = $q.defer();

			// REQUEST MEDIA

				// SAVE CONTROL ITEM
				// SAVE MEDIA

			factory.requests.controlItemMedia(control_item.rm_id).then(function(media) {

				var control_record = angular.copy(control_item);

				factory.dbUtils.control_item.saveGlobalControlItemRecord(control_record).then(function(saved_control) {
					
					factory.dbUtils.media_records.saveGlobalControlItemMedia(media, saved_control._id).then(function() {

						console.log("CREATED GLOBAL CONTROL RECORD");
						console.log(saved_control);

						defer.resolve(saved_control);

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

		factory.requestUpdateLocalControlItemVerification = function(control_item, db_control_item) 
		{
			var defer = $q.defer();

			// REQUEST MEDIA

				// SAVE CONTROL ITEM
				// SAVE MEDIA

			factory.requests.controlItemMedia(control_item.rm_id).then(function(media) {

				var control_record = angular.copy(control_item);
				if( control_record.hasOwnProperty('db_control_item') ) {
					delete control_record.db_control_item;
				}
				control_record._id = db_control_item._id;
				control_record._rev = db_control_item._rev;

				factory.dbUtils.control_item.saveGlobalControlItemRecord(control_record).then(function(saved_control) {
						
					factory.dbUtils.media_records.saveGlobalControlItemMedia(media, saved_control._id).then(function() {

						console.log("UPDATED GLOBAL CONTROL RECORD");
						console.log(saved_control);

						defer.resolve(saved_control);

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

		factory.markControlVerificationImportComplete = function(control_item, control_verification_media) 
		{
			var defer = $q.defer();

			factory.dbUtils.markControlVerificationMediaContentsImported(control_verification_media).then(function() {

				factory.dbUtils.control_item.markControlItemContentsImported(control_item).then(function() {
					defer.resolve();
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

	function enterManagedRiskPage() 
	{
		var directive = {};

		directive.scope = {
			relations: '='
		};

		directive.restrict = 'A';
		directive.controller = 'enterManagedRiskPageController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/managed-risk-utils/tpl/enter_managed_risk_options.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

	function coreAssetControlItemList() 
	{
		var directive = {};

		directive.scope = {};

		directive.restrict = 'A';
		directive.controller = 'coreAssetControlItemListingController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/managed-risk-utils/tpl/core_asset_control_listing.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

	function verifyControlItem() 
	{
		var directive = {};

		directive.scope = {};

		directive.restrict = 'A';
		directive.controller = 'verifyControlItemController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/managed-risk-utils/tpl/verify_control_item.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

	function initials() 
	{
		return function(name){

			if( !name )
			{
				return '?';
			}

			return name.match(/(^\S\S?|\b\S)?/g).join("").match(/(^\S|\S$)?/g).join("").toUpperCase();

			// return name.match(/(\b\S)?/g).join("").toUpperCase();
		}
	}

}())