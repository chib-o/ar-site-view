(function() {

	var app = angular.module('riskmachMedia', ['riskmachUtils','riskmachDatabases']);
	app.factory('mediaFactory', mediaFactory);

	function mediaFactory($q, $rootScope, $http, authFactory, riskmachDatabasesFactory, rmUtilsFactory) 
	{
		var factory = {};

		factory.profile_imgs = {
			risks: {},
			pool_risks: {},
			storeUrl: function(record_type, record_id, url) {
				factory.profile_imgs[record_type][record_id] = url;
			},
			getStoredUrl: function(record_type, record_id) {
				if( record_id == "6bae0171-5e97-4a28-84f7-c779076b375f" ) {
					console.log("STORED SIG IMAGE URL");
					console.log(factory.profile_imgs[record_type][record_id]);
				}

				return factory.profile_imgs[record_type][record_id];
			},
			removeStoredUrl: function(record_type, record_id) {
				if( factory.profile_imgs[record_type].hasOwnProperty(record_id) ) {

					console.log("REVOKE: " + factory.profile_imgs[record_type][record_id]);

					// REMOVE BROWSER REFERENCE
					URL.revokeObjectURL(factory.profile_imgs[record_type][record_id]);

					// REMOVE FACTORY REFERENCE
					delete factory.profile_imgs[record_type][record_id];
				}
			},
			removeAllStoredUrls: function(record_type) {
				Object.keys(factory.profile_imgs[record_type]).forEach(function(key) {

					factory.profile_imgs.removeStoredUrl(record_type, key);

				});
			}
		}

		factory.img_urls = {
			stored_urls: {},
			risks: {},
			pool_risks: {},
			assets: {},
			mr_hazards: {},
			mr_controls: {},
			question_response_image: {},
			question_image: {},
			action: {},
			storeUrl: function(record_type, doc_id, url) {
				factory.img_urls[record_type][doc_id] = url;
			},
			getStoredUrl: function(record_type, key) {

				console.log(record_type);

				if( factory.img_urls[record_type].hasOwnProperty(key) ) {
					return factory.img_urls[record_type][key];
				} else {
					return false;
				}

			},
			revokeStoredUrl: function(record_type, key) {
				if( factory.img_urls[record_type].hasOwnProperty(key) ) {

					// REVOKE BROWSER REFERENCE
					URL.revokeObjectURL(factory.img_urls[record_type][key]);

					// REMOVE FACTORY REFERENCE
					delete factory.img_urls[record_type][key];

				}
			},
			revokeStoredUrls: function(record_type) {
				Object.keys(factory.img_urls[record_type]).forEach(function(key) {

					factory.img_urls.revokeStoredUrl(record_type, key);

				});
			},
			urlKey: function(media_record) {
				var key = null;

				if( media_record.record_type == 'question_response_image' ) {
					key = 'question_response_image';
				}

				if( media_record.record_type == 'question_image' ) {
					key = 'question_image';
				}

				if( media_record.record_type == 'action' ) {
					key = 'action';
				}

				return key;
			}
		}

		factory.media_download = {
			active: false, 
			meta: {
				display_message: null,
				num_media: null, 
				num_media_downloaded: null, 
				cancel: false
			},
			data: {
				checklist_instance_json_ids: []
			},
			cancel: function() {
				factory.media_download.meta.cancel = true;
				factory.media_download.meta.display_message = 'Cancelling...';
				$rootScope.$broadcast("filesDownload::metaUpdated");
			},
			reset: function() {
				factory.media_download.active = false;
				factory.media_download.meta.num_media = null;
				factory.media_download.meta.num_media_downloaded = null;
				factory.media_download.meta.cancel = false;

				factory.media_download.data.checklist_instance_json_ids = [];
			}
		}

		factory.cancel = {
			multiple_fetch: false
		}

		factory.utils = {
			checkRecordItemMediaExists: function(record_item, file_name) {
				var file_exists = false;

				if( !record_item.hasOwnProperty('media_records') || !record_item.media_records ) {
					return file_exists;
				}

				var i = 0;
				var len = record_item.media_records.length;

				if( i < len ) {
					if( record_item.media_records[i].attachment_key == file_name ) {
						file_exists = true;
					}

					i++;
				}

				return file_exists;
			},
			image_resize: {
				url: null,
				canvas: null,
				ctx: null,
				imgEl: null,
				wanted_width: 600,
				file_name: null,
				output_url: null,
				aspect: null,
				fromFile: function(file){
					var defer = $q.defer();

					//SETUP THE IMAGE ELEMENT
					factory.utils.image_resize.file_name = file.name;
					factory.utils.image_resize.url = URL.createObjectURL(file);

					factory.utils.image_resize.imgEl = document.createElement('img');

					//CREATE THE LISTENER
					factory.utils.image_resize.imgEl.addEventListener('load', () => {

						//ONLY RESIZE IF THE IMAGE IS BIGGER THAN DESIRED WIDTH
						if( factory.utils.image_resize.imgEl.width <= factory.utils.image_resize.wanted_width )
						{
							defer.resolve(file);
						}
						else
						{
							// alert("Resize");
							defer.resolve( factory.utils.image_resize.resize() );
						}

				  	});

					//START THE PROCESS
					factory.utils.image_resize.imgEl.src = factory.utils.image_resize.url;

					return defer.promise;
				},
				resize: function(){
					factory.utils.image_resize.canvas = document.createElement('canvas');
					factory.utils.image_resize.ctx = factory.utils.image_resize.canvas.getContext('2d');

					factory.utils.image_resize.aspect = factory.utils.image_resize.imgEl.width / factory.utils.image_resize.imgEl.height;

					factory.utils.image_resize.canvas.width = factory.utils.image_resize.wanted_width;
					factory.utils.image_resize.canvas.height = factory.utils.image_resize.wanted_width / factory.utils.image_resize.aspect;

					factory.utils.image_resize.ctx.drawImage(factory.utils.image_resize.imgEl, 0, 0, factory.utils.image_resize.canvas.width, factory.utils.image_resize.canvas.height);
					factory.utils.image_resize.output_url = factory.utils.image_resize.canvas.toDataURL();

					// console.log("RESIZED DATA URL");
					// console.log(factory.utils.image_resize.output_url);

					return factory.utils.image_resize.dataURLtoFile(factory.utils.image_resize.output_url, factory.utils.image_resize.file_name);
				},
				dataURLtoFile(dataurl, filename){
					var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
				    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
				    while(n--){
				        u8arr[n] = bstr.charCodeAt(n);
				    }
				    return new File([u8arr], filename, {type:mime});
				},
				cleanup: function(){
					factory.utils.image_resize.file_name = null;
					factory.utils.image_resize.url = null;

					if( factory.utils.image_resize.imgEl )
					{
						factory.utils.image_resize.imgEl.remove();
					}

					factory.utils.image_resize.imgEl = null;

					if( factory.utils.image_resize.canvas )
					{
						factory.utils.image_resize.canvas.remove();
					}

					factory.utils.image_resize.canvas = null;
					factory.utils.image_resize.ctx = null;
					factory.utils.image_resize.output_url = null;
					factory.utils.image_resize.aspect = null;
				}
			},
			clearInsensitiveMediaReview: function(media_record) {

				// IF SET TO INSENSITIVE, SET BACK TO NEUTRAL SO MUST BE REVIEWED AGAIN
				// NEXT TIME IT IS CLONED
				if( media_record.hasOwnProperty('insensitive_media') && media_record.insensitive_media == 'Yes' ) {
					media_record.insensitive_media = null; 
					media_record.date_insensitive_media = null;
					media_record.insensitive_media_by = null;
					media_record.insensitive_media_reason = null;
				}

			}
		}

		factory.dbUtils = {
			saveMediaRecord: function(media_record, file) {
				var defer = $q.defer();

				media_record.file_does_not_exist = false;
				media_record.file_downloaded = 'Yes';

				//SAVE THE FILE
				factory.dbUtils.doSaveMediaRecord(media_record).then(function(media_result){

					console.log("SAVED MEDIA RECORD");
					console.log(media_result);

					media_record._id = media_result.id;
					media_record._rev = media_result.rev;

					//SAVE THE ATTACHMENT TO THE MEDIA RECORD
					factory.dbUtils.saveMediaFile(media_record._id, file.name, media_record._rev, file, file.type).then(function(result){

						console.log("SAVE ATTACHMENT RESULT");
						console.log(result);

						media_record._id = result.id;
						media_record._rev = result.rev;

						// GET ENTIRE MEDIA RECORD AND ATTACHMENTS
						riskmachDatabasesFactory.databases.collection.media.get(media_record._id).then(function(media_doc) {

							console.log("FETCHED ENTIRE MEDIA RECORD");
							console.log(media_doc);

							defer.resolve(media_doc);

						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error){
						console.log("SAVE ATTACHMENT ERROR");
						console.log(error);
						defer.resolve();
						// alert(error);
					});

				}).catch(function(error){
					console.log("ERROR SAVING MEDIA RECORD");
					console.log(error);
					defer.resolve();
				});

				return defer.promise;
			},
			doSaveMediaRecord: function(doc) {
				var defer = $q.defer();

				console.log("MEDIA RECORD FOR SAVE");
				console.log(JSON.stringify(doc, null, 2));

				// SET RECORD AS MODIFIED
				rmUtilsFactory.sync_decoration.media_records.mediaModified(doc).then(function(modified_doc) {

					doc = modified_doc;

					console.log("MODIFIED MEDIA RECORD FOR SAVE");
					console.log(JSON.stringify(doc, null, 2));

					if( !doc.hasOwnProperty('_id') || !doc._id ) {
						// SAVE NEW
						var options = {
							force: true
						};

						riskmachDatabasesFactory.databases.collection.media.post(doc, options).then(function(result) {
							defer.resolve(result);
						}).catch(function(error) {
							console.log("ERROR SAVING NEW MEDIA RECORD");
							defer.reject(error);
						});
					} else {
						// UPDATE
						riskmachDatabasesFactory.databases.collection.media.put(doc).then(function(result) {
							defer.resolve(result);
						}).catch(function(error) {
							console.log("ERROR UPDATING MEDIA RECORD");
							defer.reject(error);
						});
					}

				}, function(error) {
					console.log("ERROR MODIFYING MEDIA");
					defer.reject(error);
				});

				return defer.promise;
			},
			saveMediaFile: function(media_id, file_name, media_rev, file, file_type) {
				var defer = $q.defer();

				console.log(file);

				//IF IMAGE THEN RESIZE IT FIRST
				if( factory.dbUtils.isImage(file_name) )
				{
					factory.utils.image_resize.fromFile(file).then(function(resized_file){

						factory.utils.image_resize.cleanup();

						riskmachDatabasesFactory.databases.collection.media.putAttachment(media_id, file_name, media_rev, resized_file, file_type).then(function(result) {
							defer.resolve(result);
						}, function(error) {
							defer.reject(error);
						});

					});
				}
				else
				{
					//SAVE THE FILE DIRECTLY
					riskmachDatabasesFactory.databases.collection.media.putAttachment(media_id, file_name, media_rev, file, file_type).then(function(result) {
						defer.resolve(result);
					}, function(error) {
						defer.reject(error);
					});
				}

				return defer.promise;
			},
			saveMediaFileDirect: function(media_record, file_name, media_rev, file, file_type) {
				var defer = $q.defer();

				// file_type = 'video/x-matroska';
				
				//SAVE THE FILE DIRECTLY
				riskmachDatabasesFactory.databases.collection.media.putAttachment(media_record._id, file_name, media_rev, file, file_type).then(function(result) {

					riskmachDatabasesFactory.databases.collection.media.get(media_record._id).then(function(media_doc) {

						media_record._id = media_doc._id;
						media_record._rev = media_doc._rev;
						media_record.file_downloaded = 'Yes';
						media_record._attachments = media_doc._attachments;
						// media_doc.file_download_rm_id = null;

						// UPDATE FILE DOWNLOADED STATUS
						riskmachDatabasesFactory.databases.collection.media.put(media_record).then(function(media_result) {
								
							media_record._id = media_result.id;
							media_record._rev = media_result.rev;

							defer.resolve(media_record);

							//CLEAN UP
							media_doc = null;

						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getFileExtension: function(fileName){
		        var  fileExtension;
		        fileExtension = fileName.replace(/^.*\./, '');
		        return fileExtension;
		    },
		    isImage: function(fileName){
		        var fileExt = factory.dbUtils.getFileExtension(fileName);
		        var imagesExtension = ["png", "jpg", "jpeg"];
		        if(imagesExtension.indexOf(fileExt) !== -1){
		            return true;
		        } else{
		            return false;
		        }
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
					
					var filtered_array = [];

					var rm_ids = [];
					var dupe_images = [];

					var i = 0;
					var len = result.docs.length;

					if( len == 0 ) {
						defer.resolve(filtered_array);
						return defer.promise;
					}

					while(i < len) {
						var errors = 0;
						var dupe_img = false;

						if( result.docs[i].hasOwnProperty('item_not_found') && result.docs[i].item_not_found ) {
							errors++;
						}

						if( result.docs[i].hasOwnProperty('removed_from_sync') && result.docs[i].removed_from_sync ) {
							errors++;
						}

						if( result.docs[i].hasOwnProperty('superseeded') && result.docs[i].superseeded == 'Yes' ) {
							errors++;
						}

						if( errors == 0 ) {

							// IF ASSESSMENT MEDIA, HAS RMID AND NOT DELETED
							if( record_type == 'assessment' && result.docs[i].hasOwnProperty('rm_id') && result.docs[i].rm_id && result.docs[i].status != 3 ) {

								// CHECK FOR DUPE RMIDS
								if( rm_ids.indexOf(result.docs[i].rm_id) === -1 ) {
									rm_ids.push(result.docs[i].rm_id);
								} else {
									dupe_img = true;
									dupe_images.push(result.docs[i]);
								}

							}

							if( !dupe_img ) {
								filtered_array.push(result.docs[i]);
							}
						}

						i++;
					}

					console.log("DUPE IMAGES");
					console.log(dupe_images);

					if( dupe_images.length > 0 ) {

						factory.dbUtils.deleteDupeImages(dupe_images).then(function() {
							defer.resolve(filtered_array);
						}, function(error) {
							defer.reject(error);
						});

					} else {
						defer.resolve(filtered_array);
					}
					
				}).catch(function(error){
					console.log("ERROR FETCHING MEDIA");
					defer.reject(error);
				});

				return defer.promise;
			},
			getAllRecordAttachments: function(record_id, record_type) {
				var defer = $q.defer();

				//GET MEDIA RECORDS WITH ATTACHMENTS
				factory.dbUtils.getRecordMedia(record_id, record_type).then(function(media_records) {

					if( media_records.length == 0 ) {
						defer.resolve([]);
						return defer.promise;
					};

					console.log("GOT MEDIA RECORDS");
					console.log(media_records);

					factory.dbUtils.getMediaAttachments(media_records).then(function() {
						defer.resolve(media_records);
					}, function(error) {
						defer.reject(error);
					});

				}).catch(function(error){
					console.log("Error getting media records");
					defer.reject();
				});

				return defer.promise;
			},
			getAllStoredRecordAttachments: function(record_id, record_type, url_key) {
				var defer = $q.defer();

				//GET MEDIA RECORDS WITH ATTACHMENTS
				factory.dbUtils.getRecordMedia(record_id, record_type).then(function(media_records) {

					if( media_records.length == 0 ) {
						defer.resolve([]);
						return defer.promise;
					};

					console.log("GOT MEDIA RECORDS");
					console.log(media_records);

					factory.dbUtils.getMediaStoredAttachments(media_records, url_key).then(function() {
						defer.resolve(media_records);
					}, function(error) {
						defer.reject(error);
					});

				}).catch(function(error){
					console.log("Error getting media records");
					defer.reject();
				});

				return defer.promise;
			},
			getAllStoredRecordAttachmentsMultiple: function(record_ids, record_type, url_key) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var collected_media = [];

				fetchNextRecordsMedia(fetch_defer, 0).then(function() {

					defer.resolve(collected_media);

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextRecordsMedia(defer, active_index) {

					if( active_index > record_ids.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					factory.dbUtils.getAllStoredRecordAttachments(record_ids[active_index], record_type, url_key).then(function(media_records) {

						collected_media.push(...media_records);

						active_index++;

						fetchNextRecordsMedia(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			getMediaAttachments: function(media_records) {
				var defer = $q.defer();

				if( !media_records.length ) {
					defer.resolve(media_records);
					return defer.promise;
				}

				var active_index = 0;

				function getAttachmentUrl() {

					// IF MEDIA RECORD HAS NO FILE
					if( media_records[active_index].hasOwnProperty('file_does_not_exist') && media_records[active_index].file_does_not_exist ) {
						media_records[active_index].url = null;

						active_index++;

						if( active_index > media_records.length - 1 ) {
							defer.resolve(media_records);
							return defer.promise;
						}

						getAttachmentUrl();

						return defer.promise;
					}

					// IF FILE NOT DOWNLOADED
					if( media_records[active_index].file_downloaded == null ) {
						media_records[active_index].url = null;

						active_index++;

						if( active_index > media_records.length - 1 ) {
							defer.resolve(media_records);
							return defer.promise;
						};

						getAttachmentUrl();

						return defer.promise;
					}

					factory.dbUtils.getAttachmentUrl(media_records[active_index]._id, media_records[active_index].attachment_key).then(function(url) {
							
						if( url == 'corrupt_file' ) {
							// REMOVE MEDIA RECORD FROM ARRAY
							media_records.splice(active_index, 1);

							if( active_index > media_records.length - 1 ) {
								defer.resolve(media_records);
								return defer.promise;
							};

							getAttachmentUrl();

						} else {

							media_records[active_index].url = url;

							active_index++;

							if( active_index > media_records.length - 1 ) {
								defer.resolve(media_records);
								return defer.promise;
							};

							getAttachmentUrl();
						}

					});

				}

				getAttachmentUrl();

				return defer.promise;
			},
			getMediaStoredAttachments: function(media_records, url_key) {
				var defer = $q.defer();

				if( !media_records.length ) {
					defer.resolve(media_records);
					return defer.promise;
				}

				var active_index = 0;

				function getAttachmentUrl() {

					// IF MEDIA RECORD HAS NO FILE
					if( media_records[active_index].hasOwnProperty('file_does_not_exist') && media_records[active_index].file_does_not_exist ) {
						media_records[active_index].url = null;

						active_index++;

						if( active_index > media_records.length - 1 ) {
							defer.resolve(media_records);
							return defer.promise;
						}

						getAttachmentUrl();

						return defer.promise;
					}

					// IF FILE NOT DOWNLOADED
					if( media_records[active_index].file_downloaded == null ) {
						media_records[active_index].url = null;

						active_index++;

						if( active_index > media_records.length - 1 ) {
							defer.resolve(media_records);
							return defer.promise;
						};

						getAttachmentUrl();

						return defer.promise;
					}

					factory.dbUtils.getStoredAttachmentUrl(url_key, media_records[active_index]._id, media_records[active_index].attachment_key).then(function(url) {
							
						if( url == 'corrupt_file' ) {
							// REMOVE MEDIA RECORD FROM ARRAY
							media_records.splice(active_index, 1);

							if( active_index > media_records.length - 1 ) {
								defer.resolve(media_records);
								return defer.promise;
							};

							getAttachmentUrl();

						} else {

							media_records[active_index].url = url;

							active_index++;

							if( active_index > media_records.length - 1 ) {
								defer.resolve(media_records);
								return defer.promise;
							};

							getAttachmentUrl();
						}

					});

				}

				getAttachmentUrl();

				return defer.promise;
			},
			getAttachmentUrl: function(doc_id, attachment_id) {
				var defer = $q.defer();
				
				riskmachDatabasesFactory.databases.collection.media.getAttachment(doc_id, attachment_id).then(function(blob){
					var url = URL.createObjectURL(blob);
					console.log("ATTACHMENT URL");
					console.log(url);
					defer.resolve(url);
				}).catch(function(error){
					console.log(error);
					defer.resolve("corrupt_file");

					// console.log(error);
					// defer.reject(error);
				});

				return defer.promise;
			},
			getBlob: function(doc_id, attachment_id) {
				var defer = $q.defer();
				
				riskmachDatabasesFactory.databases.collection.media.getAttachment(doc_id, attachment_id).then(function(blob){
					defer.resolve(blob);
				}).catch(function(error){
					console.log(error);
					defer.reject(error);
				});

				return defer.promise;
			},
			getStoredAttachmentUrl: function(record_type, doc_id, attachment_id) {
				var defer = $q.defer();

				if( factory.img_urls.getStoredUrl(record_type, doc_id) ) {
					console.log("GOT STORED URL");

					defer.resolve(factory.img_urls.getStoredUrl(record_type, doc_id));
					return defer.promise;
				}

				console.log("GET URL FROM DB");

				factory.dbUtils.getAttachmentUrl(doc_id, attachment_id).then(function(url) {

					factory.img_urls.storeUrl(record_type, doc_id, url);

					defer.resolve(url);
				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getAttachmentBase64: function(doc_id, attachment_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.media.getAttachment(doc_id, attachment_id).then(function(blob){

					var reader = new FileReader();

					reader.onloadend = function() {
						var base64 = reader.result;                
						// console.log("IMAGE BASE64: " + base64);

						var type = base64.split(';')[0];
						console.log("BASE64 TYPE: " + type);

						// IF TYPE IS OCTET-STREAM, FIND FILE NAME EXTENSION AND APPLY AS TYPE
						// if( type == 'data:application/octet-stream' ) {
							// FILE EXTENSION
							var file_ext = attachment_id.split('.').pop();
							if( file_ext ) {
								file_ext = file_ext.toLowerCase();
							}

							// ENCODED DATA
							var encoded_data = base64.split(',')[1];

							if( file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif' ) {
								// CONSTRUCT BASE64 WITH CORRECT TYPE
								var new_base64 = 'data:image/' + file_ext + ';base64,' + encoded_data;
								defer.resolve(new_base64);
							} else {
								// NOT AN IMAGE
								defer.resolve('corrupt_file');
							}

						// } else {
						// 	defer.resolve(base64);
						// }
					}

					reader.readAsDataURL(blob);

				}).catch(function(error){
					console.log(error);
					defer.resolve("corrupt_file");
				});

				return defer.promise;
			},
			objectUrlToBlob: async function(url) {
				var defer = $q.defer();

				if( !url ) {
					defer.reject("No URL provided");
					return defer.promise;
				}

				await fetch(url).then(function(resp) {
					console.log(resp);
					defer.resolve(resp.blob());
				});

				return defer.promise;
			},
			getMediaRecord: function(media_id) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.media;

				db.get(media_id).then(function(doc) {

					defer.resolve(doc);

				}).catch(function(error) {
					console.log("ERROR: " + error);
					defer.reject(error);
				});

				return defer.promise;
			},
			updateRecordFileCount: function(record_id, record_type) {
				var defer = $q.defer();

				factory.dbUtils.getRecordMedia(record_id, record_type).then(function(media_records) {

					var num_attachments = 0;

					angular.forEach(media_records, function(media_record, media_index) {

						if( parseInt(media_record.status) == 1 && !media_record.is_video && !media_record.is_audio ) {
							num_attachments++;
						};

					});

					factory.dbUtils.doUpdateRecordFileCount(record_id, record_type, num_attachments).then(function(doc) {
						defer.resolve(doc);
					}, function(error) {
						defer.reject(error);
					});

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

						riskmachDatabasesFactory.databases.collection.register_assets.put(doc).then(function(result) {
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
				};

				if( record_type == 'task' ) {
					riskmachDatabasesFactory.databases.collection.tasks.get(record_id).then(function(doc) {
						doc.num_files = num_attachments;

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
				};

				if( record_type == 'assessment_hazard' ) {
					riskmachDatabasesFactory.databases.collection.mr_hazards.get(record_id).then(function(doc) {
						doc.num_files = num_attachments;

						riskmachDatabasesFactory.databases.collection.mr_hazards.put(doc).then(function(result){
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

						riskmachDatabasesFactory.databases.collection.mr_controls.put(doc).then(function(result){
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

						riskmachDatabasesFactory.databases.collection.assessments.put(doc).then(function(result){
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
			updateRecordProfileImage: function(record_id, record_type, local_media_id, rm_media_id) {
				var defer = $q.defer();

				if( record_type == 'asset' ) {
					riskmachDatabasesFactory.databases.collection.register_assets.get(record_id).then(function(doc) {
						doc.profile_image_media_id = local_media_id;
						doc.rm_profile_image_media_id = rm_media_id;

						doc = rmUtilsFactory.sync_decoration.register_assets.assetModified(doc);

						riskmachDatabasesFactory.databases.collection.register_assets.put(doc).then(function() {
							defer.resolve();
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});
				};

				return defer.promise;
			},
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

				//CHECK RELATIONS

				//GET MEDIA RECORDS
				riskmachDatabasesFactory.databases.collection.media.find({
					selector: {
						table: 'mediarecords',
						record_id: src_record_id,
						record_type: record_type
					}
				}).then(function(result){
				
					//DEFINE MEDIA CLONES METHOD
					function cloneMediaRecords(media_records, relations, current_index, defer){

						if( !media_records.length )
						{
							defer.resolve();
							return defer.promise;
						}

						if( current_index > media_records.length - 1 )
						{
							defer.resolve();
							return defer.promise;
						}

						//CLONE THE CURRENT MEDIA RECORD
						var current_media = media_records[ current_index ];

						factory.dbUtils.copyMediaRecord( current_media._id, relations ).then(function(){

							//CLONE THE NEXT ONE
							current_index++;
							cloneMediaRecords(media_records, relations, current_index, defer);

						}).catch(function(error){
							defer.reject(error);
						});

						return defer.promise;
					}

					//START CLONE MEDIA CLONES
					var media_defer = $q.defer();

					cloneMediaRecords(result.docs, relations, 0, media_defer).then(function(){
						defer.resolve();
					}, function(error){
						defer.reject(error);
					});

				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			copyMediaRecord: function(src_media_id, relations){
				var defer = $q.defer();

				if( !src_media_id )
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

				//GET THE MEDIA RECORD
				riskmachDatabasesFactory.databases.collection.media.get(src_media_id).then(function(doc){

					var new_media = angular.copy(doc);
					new_media._id = null;
					new_media._rev = null;
					new_media.date_record_synced = null;
					new_media.date_content_synced = null;
					new_media.date_record_imported = null;
					new_media.date_content_imported = null;
					new_media.record_modified = 'Yes';
					new_media.record_id = relations.record_id;
					new_media.record_type = relations.record_type;
					new_media.rm_id = null;
					new_media.rm_ref = null;
					new_media.rm_revision_number = null;
					new_media.rm_record_item_id = relations.rm_record_item_id;
					new_media.rm_record_item_ref = relations.rm_record_item_ref;
					new_media.rm_activity_id = relations.rm_activity_id;
					new_media.activity_id = relations.activity_id;
					new_media.user_id = authFactory.cloudUserId();
					new_media.company_id = authFactory.cloudCompanyId();
					new_media.rm_record = null;
					new_media.is_register = relations.is_register;
					new_media.added_by = authFactory.cloudUserId();
					new_media.date_added = new Date().getTime();
					new_media.modified_by = authFactory.cloudUserId();
					new_media.date_modified = new Date().getTime();
					new_media.mid_record_id = null;
					new_media.sync_id = null;

					// IF NOT SET, SET AS RMID OF EXISTING DOC
					if( new_media.file_download_rm_id == null ) {
						new_media.file_download_rm_id = doc.rm_id;
					}

					// IF FILE IS PRESENT, UNSET RMID FOR FILE DOWNLOAD
					if( new_media.file_downloaded == 'Yes' ) {
						new_media.file_download_rm_id = null;
					}

					//SAVE THE NEW MEDIA RECORD
					riskmachDatabasesFactory.databases.collection.media.post(new_media, { force: true }).then(function(result){

						new_media._id = result.id;
						new_media._rev = result.rev;

						console.log("NEW MEDIA RECORD");
						console.log(new_media);

						// IF FILE NOT PRESENT, DON'T CLONE
						if( new_media.file_downloaded == null ) {
							defer.resolve(new_media);
							return defer.promise;
						}

						//MOVE THE PHYSICAL FILE TO NEW MEDIA RECORD
						riskmachDatabasesFactory.databases.collection.media.getAttachment(src_media_id, doc.attachment_key).then(function(blob){

							var new_file = new File([blob], doc.attachment_key);

							console.log("NEW FILE");
							console.log(new_file);

							riskmachDatabasesFactory.databases.collection.media.putAttachment(new_media._id, new_file.name, new_media._rev, new_file, new_file.type).then(function(media_result){

								new_media._id = media_result.id;
								new_media._rev = media_result.rev;

								defer.resolve(new_media);

							}).catch(function(error){
								defer.reject("Error cloning media file: " + error);
							});

						}).catch(function(error){
							defer.reject(error);
						});

					}).catch(function(error){
						defer.reject(error);
					});

				}).catch(function(error){
					defer.reject("Error finding the media record for clone: " + error);
				});

				return defer.promise;
			},
			getIconAttachments: function(filters) {
				var defer = $q.defer();

				factory.dbUtils.getIcons(filters).then(function(icons) {

					if( icons.length == 0 ) {
						defer.resolve([]);
						return defer.promise;
					};

					var active_index = 0;

					function getAttachmentUrl() {

						if( icons[active_index].file_downloaded == null ) {
							// FILE NOT DOWNLOADED
							icons[active_index].url = null;

							active_index++;

							if( active_index > icons.length - 1 ) {
								defer.resolve(icons);
								return defer.promise;
							};

							getAttachmentUrl();

						} else {

							factory.dbUtils.getAttachmentUrl(icons[active_index]._id, icons[active_index].attachment_key).then(function(url) {
									
								if( url == 'corrupt_file' ) {

									// REMOVE MEDIA RECORD FROM ARRAY
									icons.splice(active_index, 1);

									getAttachmentUrl();

								} else {

									icons[active_index].url = url;

									active_index++;

									if( active_index > icons.length - 1 ) {
										defer.resolve(icons);
										return defer.promise;
									};

									getAttachmentUrl();
								}

							});

						}

					}

					getAttachmentUrl();

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getIcons: function(filters) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var collected_icons = [];

				var options = {
					limit: 100,
					include_docs: true
				}

				var db = riskmachDatabasesFactory.databases.collection.media;

				fetchNextPage(fetch_defer).then(function() {
					defer.resolve(collected_icons);
				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) 
				{
					var icon_array = [];

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) 
						{
							icon_array = factory.dbUtils.filterIcons(result.rows, filters);

							collected_icons.push(...icon_array);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							// CLEAN UP
							result.rows = null;
							icon_array = null;

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
			filterIcons: function(media, filters) {
				var icons = [];

				var i = 0;
				var len = media.length;

				while(i < len) {

					var errors = 0;

					if( filters.hasOwnProperty('record_type') && media[i].doc.record_type != filters.record_type ) {
						errors++;
					}

					if( filters.hasOwnProperty('user_id') && media[i].doc.user_id != filters.user_id ) {
						errors++;
					}

					if( filters.hasOwnProperty('company_id') && media[i].doc.company_id != filters.company_id ) {
						errors++;
					}

					if( filters.hasOwnProperty('status') && media[i].doc.status != filters.status ) {
						errors++;
					}

					if( media[i].doc.rm_ref == 118580 ) {
						console.log("FOUND ICON");
						console.log(media[i].doc);
					}

					if( errors == 0 ) {
						icons.push(media[i].doc);
					} 

					i++;
				}

				return icons;
			},
			removeMediaFile: function(media_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.media;

				db.removeAttachment(media_record._id, media_record.attachment_key, media_record._rev).then(function(result) {

					media_record._rev = result.rev;

					media_record.file_does_not_exist = true;
					media_record.file_downloaded = null;
					media_record.url = null;
					media_record.attachment_key = null;
					media_record.file_name = null;
					media_record._attachments = null;

					db.put(media_record).then(function(saved_result) {
						media_record._id = saved_result.id;
						media_record._rev = saved_result.rev;

						defer.resolve(media_record);
					}).catch(function(error) {
						console.log(error);
						defer.reject(error);
					});

				}).catch(function(error) {
					console.log("ERROR REMOVING MEDIA FILE");
					defer.reject(error);
				});

				return defer.promise;
			},
			checkPdfExists: function(record_id, record_type, file_name) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.media;

				db.find({
					selector: {
						table: 'mediarecords',
						record_id: record_id,
						record_type: record_type
					}
				}).then(function(result) {

					if( result.docs.length == 0 ) {
						defer.resolve(null);
						return defer.promise;
					}

					var i = 0;
					var len = result.docs.length;
					var filtered_media = [];

					while(i < len) {
						var errors = 0;

						// IF NOT PDF
						if( !result.docs[i].hasOwnProperty('is_pdf') || result.docs[i].is_pdf != 'Yes' ) {
							errors++;
						}

						// IF A DIFFERENT PDF FILE NAME
						if( result.docs[i].file_name != file_name && result.docs[i].attachment_key != file_name ) {
							errors++;
						}

						if(errors == 0) {
							filtered_media.push(result.docs[i]);
						}

						i++;
					}

					if( filtered_media.length == 0 ) {
						defer.resolve(null);
					} else {
						defer.resolve(filtered_media[0]);
					}

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			savePdfMediaRecord: function(media_record, file_name, file) {
				var defer = $q.defer();

				media_record.file_does_not_exist = false;
				media_record.file_downloaded = 'Yes';
				media_record.is_pdf = 'Yes';

				//SAVE THE FILE
				factory.dbUtils.doSaveMediaRecord(media_record).then(function(media_result){

					console.log("SAVED PDF MEDIA RECORD");
					console.log(media_result);

					media_record._id = media_result.id;
					media_record._rev = media_result.rev;

					//SAVE THE ATTACHMENT TO THE MEDIA RECORD
					factory.dbUtils.saveMediaFile(media_record._id, file_name, media_record._rev, file, 'application/pdf').then(function(result){

						console.log("SAVE PDF ATTACHMENT RESULT");
						console.log(result);

						media_record._id = result.id;
						media_record._rev = result.rev;

						// GET ENTIRE MEDIA RECORD AND ATTACHMENTS
						riskmachDatabasesFactory.databases.collection.media.get(media_record._id).then(function(media_doc) {

							console.log("FETCHED ENTIRE PDF MEDIA RECORD");
							console.log(media_doc);

							defer.resolve(media_doc);

						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error){
						console.log("SAVE ATTACHMENT ERROR");
						console.log(error);
						defer.resolve();
						// alert(error);
					});

				}).catch(function(error){
					console.log("ERROR SAVING MEDIA RECORD");
					console.log(error);
					defer.resolve();
				});

				return defer.promise;
			},
			updateRecordSignatureId: function(media_id, record_relations) {
				var defer = $q.defer();

				if( !record_relations.hasOwnProperty('record_id') || !record_relations.record_id ) {
					defer.reject("No record ID provided for record signature ID update");
					return defer.promise;
				}

				if( !record_relations.hasOwnProperty('record_type') || !record_relations.record_type ) {
					defer.reject("No record type provided for record signature ID update");
					return defer.promise;
				}

				var db = null;

				if( record_relations.record_type == 'task' ) {
					db = riskmachDatabasesFactory.databases.collection.tasks;
				}

				db.get(record_relations.record_id).then(function(record_doc) {

					record_doc.signature_id = media_id;

					db.put(record_doc).then(function(result) {

						record_doc._id = result.id;
						record_doc._rev = result.rev;

						defer.resolve(record_doc);

					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getUAuditStoredMediaAttachments: function(media_records) {
				var defer = $q.defer();

				console.log("GET UAUDIT MEDIA ATTACHMENTS");
				console.log(media_records);

				if( !media_records.length ) {
					defer.resolve();
					return defer.promise;
				}

				var active_index = 0;

				function getAttachmentUrl() {

					factory.dbUtils.getUAuditStoredMediaRecordAttachment(media_records[active_index]).then(function() {

						active_index++;

						if( active_index > media_records.length - 1 ) {
							defer.resolve(media_records);
							return defer.promise;
						}

						getAttachmentUrl();

					}, function(error) {
						defer.reject(error);
					});

				}

				getAttachmentUrl();

				return defer.promise;
			},
			getUAuditStoredMediaRecordAttachment: function(media_record) {
				var defer = $q.defer();

				media_record.corrupt_file = false;

				// IF MEDIA RECORD HAS NO FILE
				if( media_record.hasOwnProperty('file_does_not_exist') && media_record.file_does_not_exist ) {
					media_record.temp_app_url = null;

					defer.resolve();

					return defer.promise;
				}

				// IF FILE NOT DOWNLOADED
				if( media_record.file_downloaded == null ) {
					media_record.temp_app_url = null;

					defer.resolve();

					return defer.promise;
				}

				var url_key = factory.img_urls.urlKey(media_record);

				factory.dbUtils.getStoredAttachmentUrl(url_key, media_record._id, media_record.attachment_key).then(function(url) {
						
					if( url == 'corrupt_file' ) {
						
						media_record.temp_app_url = null;
						media_record.corrupt_file = true;

						defer.resolve();

					} else {

						media_record.temp_app_url = url;

						defer.resolve();
					}

				});

				return defer.promise;
			},
			getMediaRecordAttachmentMultiple: function(record_ids) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var collected_media = [];

				fetchNextAttachment(fetch_defer, 0).then(function() {

					defer.resolve(collected_media);

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextAttachment(defer, active_index) {

					if( active_index > record_ids.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					factory.dbUtils.getMediaRecordAttachment(record_ids[active_index]).then(function(media_record) {

						collected_media.push(media_record);

						active_index++;

						fetchNextAttachment(defer, active_index);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			getMediaRecordAttachment: function(record_id) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.media;

				// FETCH INDIVIDUAL IMAGE
				db.get(record_id).then(function(doc) {

					// IF MEDIA RECORD HAS NO FILE
					if( doc.hasOwnProperty('file_does_not_exist') && doc.file_does_not_exist ) {
						doc.url = null;
						defer.resolve(doc);
						return defer.promise;
					}

					// IF FILE NOT DOWNLOADED
					if( doc.file_downloaded == null ) {
						doc.url = null;
						defer.resolve(doc);
						return defer.promise;
					}

					// GET IMAGE URL
					factory.dbUtils.getStoredAttachmentUrl('risks', doc._id, doc.attachment_key).then(function(url) {
							
						if( url == 'corrupt_file' ) {
							doc.url = null;
						} else {
							doc.url = url;
						}

						defer.resolve(doc);

					}, function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			indexDisplayPdfOnRisk: function(media_id, risk_id) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.assessments;

				db.get(risk_id).then(function(risk_doc) {

					risk_doc.display_pdf_id = media_id;

					db.put(risk_doc).then(function(result) {

						risk_doc._id = result.id;
						risk_doc._rev = result.rev;

						defer.resolve(risk_doc);

					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			deleteDupeImages: function(dupe_images) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.media;

				deleteNextImage(save_defer, 0).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

				function deleteNextImage(defer, active_index) {

					// DELETED ALL DUPE IMAGES
					if( active_index > dupe_images.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					dupe_images[active_index].status = 3;

					db.put(dupe_images[active_index]).then(function(result) {

						dupe_images[active_index]._id = result.id;
						dupe_images[active_index]._rev = result.rev;

						active_index++;

						deleteNextImage(defer, active_index);

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			fetchMultipleRecordsMediaAttachments: function(record_ids, record_type, url_key) {
				var defer = $q.defer();

				factory.cancel.multiple_fetch = false;

				factory.dbUtils.fetchMultipleRecordsMedia(record_ids, record_type).then(function(media_records) {

					console.log("FETCHED MULTIPLE RECORDS MEDIA");
					console.log(media_records);

					factory.dbUtils.getMediaStoredAttachments(media_records, url_key).then(function() {
						defer.resolve(media_records);
					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			fetchMultipleRecordsMedia: function(record_ids, record_type) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				// IF NO RECORD IDS PASSED IN
				if( !record_ids.length ) {
					defer.resolve([]);
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.media;

				var options = {
					include_docs: true, 
					limit: 100,
				};

				var page_num = 0;

				var media = [];

				fetchNextPage(fetch_defer).then(function() {
					defer.resolve(media);
				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					if( factory.cancel.multiple_fetch ) {
						console.log("MULTIPLE FETCH CANCELLED");
						media = [];

						// RESET
						factory.cancel.multiple_fetch = false;

						defer.resolve();
						return defer.promise;
					}

					page_num++;
					console.log("FETCHING PAGE NUM: " + page_num);

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var filtered_media = [];

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								// IF MEDIA DOES NOT BELONG TO RECORD TYPE
								if( result.rows[i].doc.record_type != record_type ) {
									errors++;
								}

								// IF MEDIAS CORRESPONDING RECORD IS NOT IN RECORD IDS ARRAY
								if( record_ids.indexOf(result.rows[i].doc.record_id) === -1 ) {
									errors++;
								}

								// IF NOT MEDIA RECORDS TABLE
								if( !result.rows[i].doc.hasOwnProperty('table') || result.rows[i].doc.table != 'mediarecords' ) {
									errors++;
								}

								// IF ITEM NOT FOUND
								if( result.rows[i].doc.hasOwnProperty('item_not_found') && result.rows[i].doc.item_not_found ) {
									errors++;
								}

								// IF MEDIA REMOVED FROM SYNC
								if( result.rows[i].doc.hasOwnProperty('removed_from_sync') && result.rows[i].doc.removed_from_sync ) {
									errors++;
								}

								// IF MEDIA SUPERSEEDED
								if( result.rows[i].doc.hasOwnProperty('superseeded') && result.rows[i].doc.superseeded == 'Yes' ) {
									errors++;
								}

								if( !errors ) {
									filtered_media.push(result.rows[i].doc);
								}

								i++;
							}

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							media.push(...filtered_media);

							result.rows = null;
							filtered_media = null;

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
		}

		factory.downloads = {
			// downloadMediaFileV1: function(media_record, chunk_size, pool_limit) {
			// 	var defer = $q.defer();

			// 	factory.downloads.getContentLength(media_record.media_path).then(function(content_length) {

			// 		var chunks = Math.ceil(content_length / chunk_size);

			// 		var iterable = [...new Array(chunks).keys()];

			// 		factory.downloads.asyncPool(pool_limit, iterable, (i) => {
			// 	        let start = i * chunk_size;
			// 	        let end = i + 1 == chunks ? content_length - 1 : (i + 1) * chunk_size - 1;
				        
			// 	        return factory.downloads.getBinaryContent(media_record.media_path, start, end, i);
			//       	}).then(function(results) {

			//       		var sorted_buffers = results.map((item) => new Uint8Array(item.buffer));

			//    			defer.resolve( factory.downloads.concatenateChunks(sorted_buffers) );

			// 		}, function(error) {
			// 			defer.reject(error);
			// 		});

			// 	}, function(error) {
			// 		defer.reject(error);
			// 	});

			// 	return defer.promise;
			// },
			downloadMediaFile: function(media_record, chunkSize, poolLimit, skip_related_media) {
				var defer = $q.defer();
				var save_defer = $q.defer();

				console.log(media_record);

				factory.downloads.doDownloadMediaFile(media_record, chunkSize, poolLimit).then(function(content) {

					// IF THERE IS NO FILE
					if( !content ) {
						// DELETE THE MEDIA RECORD FROM DB AS THERE IS NO FILE FOR IT
						riskmachDatabasesFactory.databases.collection.media.remove(media_record).then(function() {
							defer.resolve(null);
						}).catch(function(error) {
							defer.reject(error)
						});

						return defer.promise;
					}

					if( angular.isDefined(skip_related_media) && skip_related_media ) {

						factory.downloads.saveDownloadedMediaAttachment(media_record, content, false).then(function(saved_media) {
							defer.resolve(saved_media);
						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					// WORK OUT RMID TO USE
					var rm_id = null;
					if( media_record.hasOwnProperty('rm_id') && media_record.rm_id ) {
						rm_id = parseInt(media_record.rm_id);
					} else if( media_record.hasOwnProperty('file_download_rm_id') && media_record.file_download_rm_id ) {
						rm_id = parseInt(media_record.file_download_rm_id);
					} else if( media_record.hasOwnProperty('cloned_from_rm_id') && media_record.cloned_from_rm_id ) {
						rm_id = parseInt(media_record.cloned_from_rm_id);
					}

					factory.downloads.fetchRelatedMediaRecords(rm_id, media_record._id).then(function(related_media) {

						if( !related_media.length ) {
							factory.downloads.saveDownloadedMediaAttachment(media_record, content, false).then(function(saved_media) {
								defer.resolve(saved_media);
							}, function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}
						
						// ADD ORIG MEDIA RECORD TO ARRAY
						related_media.push( media_record );

						updateNextMedia(save_defer, 0).then(function(result) {
							defer.resolve(result);
						}, function(error) {
							defer.reject(error);
						});

						function updateNextMedia(defer, active_index) {

							if( active_index > related_media.length - 1 ) {
								// RESOLVE LAST RECORD, WHICH WILL BE ORIG MEDIA RECORD FOR DOWNLOAD
								defer.resolve(related_media[ related_media.length - 1 ]);
								return defer.promise;
							}

							factory.downloads.saveDownloadedMediaAttachment(related_media[active_index], content).then(function(saved_media) {

								related_media[active_index] = saved_media;

								active_index++;

								updateNextMedia(defer, active_index);

							}, function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}

					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			doDownloadMediaFile: async function(media_record, chunkSize, poolLimit) {
				var dt = new Date().getTime();
				var url = media_record.media_path + '?dt=' + dt;

				// var url = 'https://elasticbeanstalk-eu-west-1-638507748612.s3.eu-west-1.amazonaws.com/testmedia/1630595959030.jpg';
				const content_info = await factory.downloads.getContentInfo(url);
				
				console.log( JSON.stringify(content_info, null, 2) );
				// alert("Content info");


				const contentLength = content_info.content_length;

			    const chunks =
			      typeof chunkSize === "number" ? Math.ceil(contentLength / chunkSize) : 1;
			    const results = await factory.downloads.asyncPool(
			      poolLimit,
			      [...new Array(chunks).keys()],
			      (i) => {
			        let start = i * chunkSize;
			        let end = i + 1 == chunks ? contentLength - 1 : (i + 1) * chunkSize - 1;
			        return factory.downloads.getBinaryContent(url, start, end, i);
			      }
			    );
			    const sortedBuffers = results
			      .map((item) => new Uint8Array(item.buffer));
			    return factory.downloads.concatenateChunks(sortedBuffers, content_info.content_type);
			},
			getContentInfo: function(url) {
				return new Promise((resolve, reject) => {
			      let xhr = new XMLHttpRequest();
			      xhr.open("HEAD", url);
			      xhr.send();
			      xhr.onload = function () {
			      	var info = {
			      		content_length: ~~xhr.getResponseHeader("Content-Length"),
			      		content_type: xhr.getResponseHeader("Content-Type")
			      	}

			        resolve(info);
			      };
			      xhr.onerror = reject;
			    });
			},
			asyncPool: async function(concurrency, iterable, iteratorFn) {
				const ret = []; // Store all asynchronous tasks
			    const executing = new Set(); // Stores executing asynchronous tasks
			    for (const item of iterable) {
			      // Call the iteratorFn function to create an asynchronous task
			      const p = Promise.resolve().then(() => iteratorFn(item, iterable));
			      
			      ret.push(p); // save new async task
			      executing.add(p); // Save an executing asynchronous task
			      
			      const clean = () => executing.delete(p);
			      p.then(clean).catch(clean);
			      if (executing.size >= concurrency) {
			        // Wait for faster task execution to complete 
			        await Promise.race(executing);
			      }
			    }
			    return Promise.all(ret);
			},
			getBinaryContent: function(url, start, end, i) {
				var defer = $q.defer();

				return new Promise((resolve, reject) => {
				    try {
				      let xhr = new XMLHttpRequest();
				      xhr.open("GET", url, true);
				      xhr.setRequestHeader("range", `bytes=${start}-${end}`); // Set range request information
				    
				      xhr.setRequestHeader('Access-Control-Allow-Origin', 'https://system.riskmach.co.uk');
    				  xhr.setRequestHeader('Access-Control-Allow-Credentials', 'true');

				      xhr.responseType = "arraybuffer"; // Set the returned type to arraybuffer
				      xhr.onload = function () {
				        resolve({
				          index: i, // file block index
				          buffer: xhr.response,
				        });
				      };
				      xhr.send();
				    } catch (err) {
				      reject(new Error(err));
				    }
				  });

				return defer.promise;
			},
			concatenateChunks: function(arrays, content_type) {

				if( !arrays.length ) {
					return null;
				}

			    var total_length = arrays.reduce((acc, value) => acc + value.length, 0);
			    var result = new Uint8Array(total_length);
			    var length = 0;

			    for (let array of arrays) {
			      result.set(array, length);
			      length += array.length;
			    }

			    var full_result = {
			    	content_type: content_type, 
			    	buffers: result
			    }

			    return full_result;
			},
			saveDownloadedMediaAttachment: function(media_record, content) {
				var defer = $q.defer();

				// SET ATTACHMENT KEY AS RM FILE NAME
				media_record.attachment_key = media_record.file_name;

				console.log(content);

				// REMOVE UNECESSARY PROPERTIES
				if( media_record.hasOwnProperty('downloading_file') ) {
					delete media_record.downloading_file;
				}

				// UPDATE THE MEDIA RECORD
				riskmachDatabasesFactory.databases.collection.media.post(media_record, {force: true}).then(function(media_result) {
					media_record._id = media_result.id;
					media_record._rev = media_result.rev;

					// content.content_type = 'application/pdf';

					var file = new Blob([content.buffers], { type: content.content_type });
					// var file = new Blob([content.buffers], { type: 'application/pdf' });
					// var file = new Blob([content.buffers], { type: 'video/x-matroska' });

					//SAVE THE ATTACHMENT TO THE MEDIA RECORD
					factory.dbUtils.saveMediaFileDirect(media_record, media_record.attachment_key, media_record._rev, file, content.content_type).then(function(saved_media) {

						// CLEANUP BLOB OBJECT
						file = null;

						defer.resolve(media_record);

					}).catch(function(error){
						console.log("SAVE ATTACHMENT ERROR: " + error);
						media_record.file_downloaded = null;
						media_record.attachment_key = null;
						// UPDATE THE MEDIA RECORD
						riskmachDatabasesFactory.databases.collection.media.post(media_record, {force: true}).then(function(media_result_error) {
							media_record._id = media_result_error.id;
							media_record._rev = media_result_error.rev;
						});

						// CLEANUP BLOB OBJECT
						file = null;

						defer.reject(error);
					});

				}).catch(function(error) {
					console.log("ERROR SAVING MEDIA: " + media_record);
					defer.reject(error);
				});

				return defer.promise;
			},
			fetchRelatedMediaRecords: function(rm_id, db_id) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				console.log("FETCH RELATED MEDIA");

				if( !rm_id ) {
					defer.resolve([]);
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.media;

				var options = {
					include_docs: true, 
					limit: 100,
				};

				var related_media = [];

				fetchNextPage(fetch_defer).then(function() {
					defer.resolve(related_media);
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
								var matches = 0;

								if( result.rows[i].doc.hasOwnProperty('rm_id') && result.rows[i].doc.rm_id == rm_id ) {
									matches++;
								}

								if( result.rows[i].doc.hasOwnProperty('file_download_rm_id') && result.rows[i].doc.file_download_rm_id == rm_id ) {
									matches++;
								}

								if( result.rows[i].doc.hasOwnProperty('cloned_from_rm_id') && result.rows[i].doc.cloned_from_rm_id == rm_id ) {
									matches++;
								}

								// IF ALREADY DOWNLOADED, REMOVE MATCHES
								if( result.rows[i].doc.hasOwnProperty('file_downloaded') && result.rows[i].doc.file_downloaded == 'Yes' ) {
									matches = 0;
								}

								// IF NOT MEDIARECORDS TABLE, REMOVE MATCHES
								if( !result.rows[i].doc.hasOwnProperty('table') || result.rows[i].doc.table != 'mediarecords' ) {
									matches = 0;
								}

								// DON'T RETURN PASSED IN MEDIA RECORD
								if( result.rows[i].doc._id == db_id ) {
									matches = 0;
								}

								if( matches > 0 ) {
									filtered_media.push(result.rows[i].doc);
								}

								i++;
							}

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							related_media.push(...filtered_media);

							result.rows = null;
							filtered_media = null;

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
			downloadAssessmentPdf: function(params, media_record, chunkSize, poolLimit) {
				var defer = $q.defer();

				factory.downloads.requestAssessmentPdf(params).then(function(file_url) {

					media_record.media_path = file_url;

					factory.downloads.downloadMediaFile(media_record, chunkSize, poolLimit).then(function() {

						factory.dbUtils.indexDisplayPdfOnRisk(media_record._id, media_record.record_id).then(function(saved_risk) {

							var data = {
								media_record: media_record,
								record_data: {
									_id: null, 
									_rev: null
								}
							}

							data.record_data._id = saved_risk._id;
							data.record_data._rev = saved_risk._rev;

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
			requestAssessmentPdf: function(params) {
				var defer = $q.defer();

				$http.get("https://system.riskmach.co.uk/laravel/public/webapp/v1/BuildServeAssessmentPdf",{ 
	                params: params
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("REQUEST ASSESSMENT PDF RESPONSE");
	            	console.log(params);
	            	console.log( JSON.stringify(data, null, 2) );

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		defer.resolve(data.file_url);
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("ERROR REQUESTING ASSESSMENT PDF API RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );
	                defer.reject("Error connecting to API for requesting assessment PDF");
	            });

				return defer.promise;
			}
		}

		factory.models = {
			media_record: {
				_id: null, 
				_rev: null,
				record_id: null,
				record_type: null,
				record_rev: null,
				attachment_key: null,
				file_name: null,
				file_size: null,
				title: null,
				description: null,
				is_video: false,
				is_audio: false,
				is_pdf: null,
				is_signature: null,
				media_type: null,
				mime_type: null,
				status: 1,
				rm_id: null,
				rm_ref: null,
				rm_revision_number: null,
				rm_record_item_id: null,
				rm_record_item_ref: null,
				added_by: null,
				date_added: null,
				modified_by: null,
				date_modified: null,
				company_id: null,
				activity_id: null,
				file_download_rm_id: null,
				file_does_not_exist: false,
				sequence_number: null,
				date_record_synced: null, 
				date_content_synced: null,
				date_record_imported: null,
				date_content_imported: null,
				user_id: authFactory.cloudUserId(), 
				record_modified: 'No',
				rm_record: null,
				rm_record_modified: 'No',
				file_downloaded: null,
				representative_image: null,
				reference_media: null,
				_attachments: null,
				table: 'mediarecords',
				insensitive_media: null,
				date_insensitive_media: null,
				insensitive_media_by: null,
				insensitive_media_reason: null,
				// UAUDIT PROPERTIES
				id: null,
				record_item_uuid: null, 
				record_item_uuid_ref: null,
				file_url: null, 
				uploaded: false,
				upload_percentage: 0, 
				upload_file_id: null, 
				hash_tags: [],
				corrupt_file: false,
				temp_app_url: null,
				is_uaudit: 'No',
				checklist_instance_id: null,
				checklist_instance_json_id: null,
				is_file: null
			},
			newMedia: function(record_id, record_type){
				var media_record = {};
				angular.copy(factory.models.media_record, media_record);
				media_record.user_id = authFactory.cloudUserId();
				media_record.company_id = authFactory.cloudCompanyId();
				media_record.record_id = record_id;
				media_record.record_type = record_type;
				media_record.date_added = Date.now();
				media_record.file_downloaded = 'Yes';
				media_record.record_modified = 'Yes';
				return media_record;
			}
		}

		factory.downloadMediaMultiple = function(filters) 
		{
			var defer = $q.defer();

			factory.media_download.active = true;
			factory.media_download.meta.display_message = 'Fetching media...';
			factory.media_download.meta.num_media = 0;
			factory.media_download.meta.num_media_downloaded = 0;
			$rootScope.$broadcast("filesDownload::metaUpdated");

			factory.fetchNotDownloadedMedia(filters).then(function(media) {

				factory.toggleChecklistInstancesJsonMediaDownloadStatus('Yes', factory.media_download.data.checklist_instance_json_ids).then(function() {

					factory.doDownloadMediaMultiple(media).then(function() {

						factory.toggleChecklistInstancesJsonMediaDownloadStatus(null, factory.media_download.data.checklist_instance_json_ids).then(function() {

							// CLEAN UP
							if( filters.hasOwnProperty('media') ) {
								filters.media = null;
							}

							var db = null;

							if( filters.hasOwnProperty('record_type') && filters.record_type == 'assessment' ) {
								db = riskmachDatabasesFactory.databases.collection.assessments;
							}

							if( filters.hasOwnProperty('record_id') && filters.record_id && db ) {

								db.get(filters.record_id).then(function(doc) {

									doc.profile_img_download_required = false;

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

							} else {
								defer.resolve(null);
							}

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

		factory.fetchNotDownloadedMedia = function(filters) 
		{
			var defer = $q.defer();

			// IF MEDIA PASSED IN, RESOLVE PRE-FETCHED MEDIA
			if( filters.hasOwnProperty('media_fetched') && filters.media_fetched && filters.hasOwnProperty('media') ) {
				
				// FIND CHECKLIST INSTANCE JSON IDS
				factory.collectChecklistInstanceJsonIds(filters.media);

				defer.resolve(filters.media);
				return defer.promise;
			}

			var fetch_defer = $q.defer();

			var options = {
				limit: 100,
				include_docs: true
			}

			var page_num = 0;

			var collected_media = [];

			var db = riskmachDatabasesFactory.databases.collection.media;

			fetchNextPage(fetch_defer).then(function() {

				// FIND CHECKLIST INSTANCE JSON IDS
				factory.collectChecklistInstanceJsonIds(collected_media);

				defer.resolve(collected_media);
			}, function(error) {
				defer.reject(error);
			});

			function fetchNextPage(defer) 
			{
				var media_batch = [];
				page_num++;

				db.allDocs(options).then(function(result) {

					if( result && result.rows.length > 0 ) 
					{
						media_batch = factory.filterNotDownloadedMedia(result.rows, filters);

						console.log("FETCHED MEDIA PAGE: " + page_num);
						console.log(media_batch);

						collected_media.push(...media_batch);

						options.startkey = result.rows[ result.rows.length - 1 ].id;
						options.skip = 1;

						// CLEAN UP AFTER
						result.rows = null;
						media_batch = null;

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

		factory.filterNotDownloadedMedia = function(media, filters) 
		{
			var filtered_array = [];

			var i = 0;
			var len = media.length;

			while(i < len) {

				var errors = 0;

				// IF FILE ALREADY DOWNLOADED
				if( media[i].doc.hasOwnProperty('file_downloaded') && media[i].doc.file_downloaded == 'Yes' ) {
					errors++;
				}

				if( filters.hasOwnProperty('activity_id') && media[i].doc.activity_id != filters.activity_id ) {
					errors++;
				}

				if( filters.hasOwnProperty('record_id') && media[i].doc.record_id != filters.record_id ) {
					errors++;
				} 

				if( filters.hasOwnProperty('record_types') && filters.record_types.indexOf(media[i].doc.record_type) === -1 ) {
					errors++;
				}

				if( filters.hasOwnProperty('company_id') && media[i].doc.company_id != filters.company_id ) {
					errors++;
				}

				if( errors == 0 ) {
					filtered_array.push(media[i].doc);
				} 

				i++;
			}

			return filtered_array;
		}

		factory.collectChecklistInstanceJsonIds = function(media_records) 
		{
			// ENSURE CHECKLIST INSTANCE JSON ARRAY IS SETUP
			factory.media_download.data.checklist_instance_json_ids = [];

			var i = 0;
			var len = media_records.length;

			while(i < len) {

				if( media_records[i].hasOwnProperty('is_uaudit') && media_records[i].is_uaudit == 'Yes' ) {

					if( media_records[i].hasOwnProperty('checklist_instance_json_id') && media_records[i].checklist_instance_json_id ) {
						factory.media_download.data.checklist_instance_json_ids.push(media_records[i].checklist_instance_json_id);
					}

				}  

				i++;
			}
		}

		factory.toggleChecklistInstancesJsonMediaDownloadStatus = function(status, identifiers) 
		{
			var defer = $q.defer();

			if( !identifiers || !identifiers.length ) {
				defer.resolve();
				return defer.promise;
			}

			var save_defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;

			updateNextRecord(save_defer, 0).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function updateNextRecord(defer, active_index) {

				if( active_index > identifiers.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				db.get(identifiers[active_index]).then(function(doc) {

					doc.media_download_incomplete = status;

					db.put(doc).then(function(result) {

						// CLEAN UP
						doc = null;

						active_index++;

						updateNextRecord(defer, active_index);

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

		factory.doDownloadMediaMultiple = function(media_records) 
		{
			var defer = $q.defer();
			var save_defer = $q.defer();

			console.log("DO DOWNLOAD FILES");
			console.log(media_records);

			factory.media_download.meta.display_message = 'Downloading files...';
			factory.media_download.meta.num_media = media_records.length;
			$rootScope.$broadcast("filesDownload::metaUpdated");

			var chunk_size = 1 * 1024 * 1024;
			var pool_limit = 6;

			downloadNextFile(save_defer, media_records, 0).then(function() {

				factory.updateMediaChecklistInstancesJson(media_records, factory.media_download.data.checklist_instance_json_ids).then(function() {

					// CLEAN UP
					media_records = null;

					factory.media_download.reset();
					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			function downloadNextFile(defer, media, active_index) {

				if( active_index > media.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				if( factory.media_download.meta.cancel ) {
					defer.resolve();
					return defer.promise;
				}  

				factory.downloads.downloadMediaFile(media[active_index], chunk_size, pool_limit, true).then(function() {

					factory.media_download.meta.num_media_downloaded++;
					$rootScope.$broadcast("filesDownload::metaUpdated");

					active_index++;

					downloadNextFile(defer, media, active_index);

				}, function(error) {
					factory.media_download.reset();
					defer.reject(error);
				});
 
				return defer.promise;
			}

			return defer.promise;
		}

		factory.updateMediaChecklistInstancesJson = function(media, checklist_instance_json_ids) 
		{
			var defer = $q.defer();

			if( !checklist_instance_json_ids || !checklist_instance_json_ids.length ) {
				defer.resolve();
				return defer.promise;
			}

			var save_defer = $q.defer();

			updateNextRecord(save_defer, 0).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function updateNextRecord(defer, active_index) {

				if( active_index > checklist_instance_json_ids.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				factory.updateChecklistInstancesJsonWithMedia(media, checklist_instance_json_ids[active_index]).then(function() {

					active_index++;

					updateNextRecord(defer, active_index);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}

			return defer.promise;
		}

		factory.updateChecklistInstancesJsonWithMedia = function(media, checklist_instance_json_id) 
		{
			var defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.checklist_instances_json;

			db.get(checklist_instance_json_id).then(function(doc) {

				// PARSE SO WE CAN MANIPULATE JSON
				var uaudit_json_data = JSON.parse(doc.uaudit_instance_data);

				// UPDATE JSON WITH DB MEDIA RECORDS
				factory.updateJsonWithMedia(uaudit_json_data, media);

				// SET TO UPDATED JSON
				doc.uaudit_instance_data = JSON.stringify(uaudit_json_data);

				// CLEAN UP
				uaudit_json_data = null;

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

		factory.updateJsonWithMedia = function(uaudit_data, media) 
		{
			uaudit_data.media.collection = [];

			console.log(media);
			console.log("MEDIA TO UPDATE UAUDIT JSON");

			angular.forEach(uaudit_data.pages.collection, function(page_record, page_index){

				//CREATE INIT QUESTIONS ARRAY FOR EACH SECTION
				angular.forEach( page_record.sections, function(section_record, section_index){

					//IF THE QUESTION IS INIT THEN ADD TO SECTION INIT COLLECTION
					angular.forEach( section_record.questions, function(question_record, question_index){

						//ADD ANY QUESTION ANSWER SETUP MEDIA TO COLLECTION
						if( question_record.answer_setup.hasOwnProperty('media') && question_record.answer_setup.media.length ) 
						{
							question_record.answer_setup.media.forEach(function(as_media_record, as_media_index) {
								// ADD TO GLOBAL MEDIA COLLECTION
								uaudit_data.media.collection.push( question_record.answer_setup.media[ as_media_index ] );
							});
						}

						if( question_record.hasOwnProperty('response') && question_record.response.hasOwnProperty('media') ) {

							//ADD EACH QUESTION RESPONSE MEDIA TO COLLECTION
							question_record.response.media.forEach(function(media_record, media_index){
								
								// FIND MEDIA MATCH - UPDATE
								var i = 0;
								var len = media.length;
								while(i < len) {

									if( media_record.id == media[i].id ) {
										console.log("UPDATE QUESTION MEDIA WITH DB RECORD");
										question_record.response.media[media_index] = media[i];
									}

									i++;
								}

								// ADD TO GLOBAL MEDIA COLLECTION
								uaudit_data.media.collection.push( question_record.response.media[media_index] );

							});

						}

					});

				});

			});
		}

		return factory;
	}

}())