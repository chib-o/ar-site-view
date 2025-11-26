(function() {

	var app = angular.module('riskmachSignature', ['riskmachMedia','riskmachModels']);
	app.controller('signatureController', signatureController);
	app.controller('signaturePadController', signaturePadController);
	app.factory('signatureFactory', signatureFactory);
	app.directive('signature', signature);
	app.directive('signaturePad', signaturePad);

	function signatureController($scope, $rootScope, $q, signatureFactory, mediaFactory, modelsFactory, dataCleanupFactory) 
	{
		var vm = this;

		vm.utils = {
			relations: vm.relations,
			loading: false,
			saving: false,
			sig_media_record: null,
			sig_full_name: null,
			initSignatureDetails: function() {
				if( !vm.utils.relations.hasOwnProperty('record_id') || !vm.utils.relations.hasOwnProperty('record_type') ) {
					console.log("NO RECORD ID/RECORD TYPE");
					return;
				}

				if( !vm.utils.relations.record_id || vm.utils.relations.record_type == null ) {
					console.log("NULL RECORD ID/RECORD TYPE");
					return;
				}

				vm.utils.loading = true;

				// FETCH SIGNATURE MEDIA RECORD
				vm.utils.getSignatureRecord().then(function() {

					vm.utils.loading = false;

					console.log("GOT SIGNATURE MEDIA RECORD");
					console.log(vm.utils.sig_media_record);

				}, function(error) {
					vm.utils.loading = false;
					alert(error);
				});
			},
			getSignatureRecord: function() {
				var defer = $q.defer();

				var sig_media_id = vm.utils.relations.sig_media_id;
				var record_id = vm.utils.relations.record_id;
				var record_type = vm.utils.relations.record_type;

				signatureFactory.dbUtils.getSigMediaRecord(sig_media_id, record_id, record_type).then(function(media_record) {

					vm.utils.sig_media_record = media_record;

					// FETCH ATTACHMENT URL
					vm.utils.getMediaRecordAttachment();

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});
 
				return defer.promise;
			},
			getMediaRecordAttachment: function() {
				var defer = $q.defer();

				if( !vm.utils.sig_media_record._id ) {
					defer.resolve();
					return defer.promise;
				}

				mediaFactory.dbUtils.getAttachmentUrl(vm.utils.sig_media_record._id, vm.utils.sig_media_record.attachment_key).then(function(url) {

					vm.utils.sig_media_record.url = url;

					defer.resolve();

					$scope.$apply();

				}, function(error) {
					alert(error);
					defer.reject(error);
				});

				return defer.promise;
			},
			signature_pad: {
				directive_id: vm.directiveid,
				media_record: null,
				record_type: null,
				show: false,
				start: function(media_record, record_type){
					if( !vm.utils.sig_full_name ) {
						alert("Please enter the name of who is signing");
						return;
					}

					vm.utils.signature_pad.show = true;

					// SET TITLE TO THE FULL NAME INPUT
					media_record.title = vm.utils.sig_full_name;
					vm.utils.signature_pad.media_record = media_record;

					vm.utils.signature_pad.record_type = record_type;
					signatureFactory.newDrawing(media_record, 'inline');
				},
				startCrop: function(media_record, record_type) {
					vm.utils.signature_pad.media_record = media_record;
					vm.utils.signature_pad.record_type = record_type;
					signatureFactory.newCrop(vm.utils.signature_pad.directive_id, media_record._id);
				},
				startReplace: function(record_type) {
					if( !vm.utils.sig_full_name ) {
						alert("Please enter the name of who is signing");
						return;
					}

					vm.utils.replace_signature.setMediaToReplace(vm.utils.sig_media_record);
					
					vm.utils.signature_pad.show = true;
					// vm.utils.signature_pad.media_record = media_record;
					vm.utils.signature_pad.record_type = record_type;

					var media_record = modelsFactory.models.newMediaRecord(vm.utils.relations.record_id, vm.utils.relations.record_type);
					media_record.title = vm.utils.sig_full_name;
					media_record.is_signature = 'Yes';
					media_record.is_register = 'No';

					signatureFactory.newDrawing(media_record, 'inline');
				},
				hide: function(){
					$rootScope.$broadcast("signaturePad::hide");
					vm.utils.signature_pad.show = false;
				},
				exit: function() {
					// var data = {
					// 	destroy_scope: true
					// }

					// $rootScope.$broadcast("signaturePad::exit", data);

					// DESTROY OWN SCOPE AND CHILD SCOPES
					setTimeout(function() {
						$scope.$destroy();
					}, 0);
				},
				events: function(){

					$scope.$on("signaturePad::saved", function(event, data){

						console.log("SIGNATURE PAD SAVED");
						console.log(JSON.stringify(data, null, 2));

						if( data.directive_id == 'approveTaskSignature' ) {
							// UPDATE TASK WITH SIGNATURE MEDIA ID
							mediaFactory.dbUtils.updateRecordSignatureId(data.media_record._id, vm.utils.relations).then(function(record_doc) {

								var parent_data = {
									record_id: record_doc._id,
									record_rev: record_doc._rev,
									record_type: vm.utils.relations.alt_record_type,
									signature_full_name: data.media_record.title,
									signature_date: data.media_record.date_added,
									signature_id: data.media_record._id
								}

								// BROADCAST TO MARK TASK APPROVED
								$rootScope.$broadcast("approveTask::signed", parent_data);

								// $rootScope.$broadcast("recordRev::new", parent_data);

								vm.utils.signature_pad.hide();

								vm.utils.relations.sig_media_id = data.media_record._id;

								vm.utils.replace_signature.removeReplacedMedia();

								// FETCH ATTACHMENT URL
								// vm.utils.getMediaRecordAttachment();

							}, function(error) {
								alert("Error updating record with signature ID");
							});
						}

					});

					$scope.$on("signature::exit", function(event, data) {

						vm.utils.signature_pad.exit();

					});

				}(),
				initDrawingPadDirective: function() {
					setTimeout(function() {
						signatureFactory.directive_id = vm.utils.signature_pad.directive_id;
					}, 0);
				}()
			},
			replace_signature: {
				replace_media_record: null, 
				setMediaToReplace: function(media_record) {
					vm.utils.replace_signature.replace_media_record = media_record;
				},
				removeReplacedMedia: function() {
					var defer = $q.defer();

					if( !vm.utils.replace_signature.replace_media_record ) {
						defer.resolve();
						return defer.promise;
					}

					dataCleanupFactory.removeDocBatch([vm.utils.replace_signature.replace_media_record], 'rm_media').then(function() {

						vm.utils.replace_signature.replace_media_record = null;

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			file_download: {
				downloading: false, 
				downloadMediaFile: function(media_record) {
					var defer = $q.defer();

					vm.utils.file_download.downloading = true;

					var chunk_size = 1 * 1024 * 1024;
					var pool_limit = 6;

					mediaFactory.downloads.downloadMediaFile(media_record, chunk_size, pool_limit).then(function(saved_media) {

						vm.utils.file_download.downloading = false;

						vm.utils.getSignatureRecord();

					}, function(error) {
						vm.utils.file_download.downloading = false;
						alert(error);
						defer.reject(error);
					});

					return defer.promise;
				}
			}
		}

		$scope.$watch('vm.directiveid', function(newVal, oldVal) {
			vm.utils.signature_pad.directive_id = vm.directiveid;
		});

		$scope.$watchCollection('vm.relations', function(newVal, oldVal) {
			vm.utils.relations = vm.relations;

			vm.utils.initSignatureDetails();
		});
	}

	function signaturePadController($scope, $rootScope, $q, $sce, signatureFactory, riskmachDatabasesFactory, rmUtilsFactory, authFactory)
	{
		var vm = this;

		// alert("Drawing Pad Controller");

		vm.utils = {
			directive_id: null,
			initial_crop: false,
			media_id: null,
			media_record: null,
			minimised: false,
			hidden: true,
			signature_pad_template: '../rm-utils/signature/tpl/signature_pad_inline.html',
			test_company_ids: [
				10728, // ASSET MANAGEMENT APP TESTING
				11311, // ADAMS TRAINING ACCOUNT 2
				9999, // TEST COMPANY
				10525, // DEMO ACCOUNT
				11367, // WEBAPP COMPANY
			],
			hasTestAccess: function() {

				var company_id = authFactory.active_profile.CompanyID;

				if( vm.utils.test_company_ids.indexOf(company_id) !== -1 ) {
					return true;
				} else {
					return false;
				}
			},
			setSignaturePadTemplate: function() {
				if( signatureFactory.template_type == 'inline' ) {
					signature_pad_template = '../rm-utils/signature/tpl/signature_pad_inline.html';
				} else {
					signature_pad_template = '../rm-utils/signature/tpl/signature_pad_draggable.html';
				}
			},
			tabs: {
				active_tab: 'annotation_list', 
				tabActive: function(tab) {
					if( tab == vm.utils.tabs.active_tab ) {
						return true;
					} else {
						return false;
					}
				},
				changeTab: function(tab) {
					vm.utils.tabs.active_tab = tab;
				}
			},
			signature: {
				stage: null,
				layer: null,
				transformer: null,
				drawing_canvas: null,
				drawing_context: null,
				image_loading: false,
				mode: 'paint',
				last_center: null, 
				last_dist: 0,
				zoomed: false,
				crop_confirmation: false,
				orig_stage_state: {
					x: null, 
					y: null, 
					scale_x: null, 
					scale_y: null
				},
				changeMode: function(mode) {
					vm.utils.signature.mode = mode;

					if( mode == 'annotate' ) {
						setTimeout(function() {
							document.getElementById("annotations-scroll-to").scrollIntoView();
						}, 10);
					}

					if( mode == 'crop' ) {
						vm.utils.signature.crop_confirmation = false;

						vm.utils.signature.cleanup();
						vm.utils.cropping.init(signatureFactory.media_id);
					}
				},
				toggleCropConfirmation: function() {
					vm.utils.signature.crop_confirmation = !vm.utils.signature.crop_confirmation;
				},
 				pen: {
					settings: {
						mode: 'brush',
						strokeColor: 'black',
						joinStyle: 'round',
						lineWidth: 3
					},
					changeColor: function(color){
						vm.utils.signature.pen.settings.strokeColor = color;
						vm.utils.signature.drawing_context.strokeStyle = vm.utils.signature.pen.settings.strokeColor;
					},
					changeLineWidth: function(value){
						vm.utils.signature.pen.settings.lineWidth = value;
						vm.utils.signature.drawing_context.lineWidth = value;
					},
					changeLineJoin: function(value){
						vm.utils.signature.pen.settings.joinStyle = value;
						vm.utils.signature.drawing_context.lineJoin = value;
					},
					colourActiveStyle: function(color){
						var style = {
							'border': '2px solid ' + color
						};

						if( color == vm.utils.signature.pen.settings.strokeColor )
						{
							style['border'] = '2px solid black';
						}

						return style;
					}
				},
				getMediaRecord: function(media_id){
					var defer = $q.defer();

					console.log("Getting Media Record ID: " + media_id);

					if( !media_id ) {
						vm.utils.media_record = signatureFactory.media_record;
						defer.resolve(null);
						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.media.get(media_id).then(function(media_record){
							
						if( !media_record.hasOwnProperty('annotations') || !media_record.annotations ) {
							media_record.annotations = [];
						}

						vm.utils.media_record = media_record;

						console.log("FETCHED MEDIA RECORD");
						console.log(vm.utils.media_record);

						//GET ATTACHMENT URL
						vm.utils.signature.attachmentUrl(media_record._id, media_record.attachment_key).then(function(bg_url){
							defer.resolve(bg_url);
						}, function(error){
							defer.reject(error);
						});

					}).catch(function(error){
						alert(error);
						defer.reject(error);
					});

					return defer.promise;
				},
				attachmentUrl: function(doc_id, attachment_id){
					var defer = $q.defer();
					
					riskmachDatabasesFactory.databases.collection.media.getAttachment(doc_id, attachment_id).then(function(blob){
						var url = URL.createObjectURL(blob);
						console.log("ATTACHMENT URL");
						console.log(url);
						defer.resolve(url);
					}).catch(function(error){
						console.log(error);
						defer.reject();
					});

					return defer.promise;
				},
				cleanup: function(){

					if( vm.utils.signature.stage )
					{
						// THIS DESTROYS ALL CHILDREN AS WELL
						vm.utils.signature.stage.destroy();
					}

					if( vm.utils.signature.layer )
					{
						vm.utils.signature.layer.destroy();
					}

					if( typeof bgImg !== 'undefined' && bgImg )
					{
						bgImg.destroy();
					}

					if( typeof bg_img !== 'undefined' && bg_img )
					{
						bg_img = null;
					}

					if( vm.utils.signature.drawing_canvas )
					{
						vm.utils.signature.drawing_canvas.remove();
					}

					vm.utils.signature.stage = null;
					vm.utils.signature.layer = null;
					vm.utils.signature.drawing_canvas = null;
					vm.utils.signature.drawing_context = null;
				},
				init: function(media_record){
					vm.utils.image_loading = false;
					vm.utils.signature.crop_confirmation = false;
					vm.utils.media_record = media_record;
					vm.utils.signature.initStage(null);
				},
				initStage: function(bg_img){

					Konva.hitOnDragEnabled = true;

					// INIT MODE TO PAINTING
					vm.utils.signature.mode = 'paint';

					//GET THE DEFAULT CANVAS DIMENSIONS / SIZE OF WINDOW
					var width = signatureFactory.max_width;
					var height = signatureFactory.max_height;

					// console.log("WIDTH: " + width);
					// console.log("HEIGHT: " + height);

					if( bg_img )
					{
						var img_width = bg_img.width;
						var img_height = bg_img.height;

						var ratio = vm.utils.signature.calcScaledRatio(width, height, img_width, img_height);
						width = img_width * ratio;
						height = img_height * ratio;
					}

					//RE SIZE THE CANVAS TO FIT SCALED IMAGE
					// $("#SignaturePadContainer").width(width);
					$("#SignaturePadContainer").height(height);

					if( $("#SignaturePadContainer").width() > width ) {
						$("#SignaturePadContainer").width(width);
					} else {
						width = $("#SignaturePadContainer").width();
					}

					console.log("WIDTH: " + width);
					console.log("HEIGHT: " + height);

					console.log("ELEMENT WIDTH: " + $("#SignaturePadContainer").width());

					var stage = new Konva.Stage({
						container: 'SignaturePadContainer',
						width: width,
						height: height
					});

					vm.utils.signature.stage = stage;

					//CREATE THE LAYER
					vm.utils.signature.layer = new Konva.Layer();
					vm.utils.signature.stage.add(vm.utils.signature.layer);

					vm.utils.signature.orig_stage_state.x = vm.utils.signature.stage.x();
					vm.utils.signature.orig_stage_state.y = vm.utils.signature.stage.y();
					vm.utils.signature.orig_stage_state.scale_x = vm.utils.signature.stage.scaleX();
					vm.utils.signature.orig_stage_state.scale_y = vm.utils.signature.stage.scaleY();
					vm.utils.signature.orig_stage_state.position = vm.utils.signature.stage.position();

					//CREATE THE BACKGROUND IF THERE IS ONE
					if( bg_img )
					{
						//LOAD THE BACKGROUND IMAGE
						var bgImg = new Konva.Image({
							image: bg_img,
							x: 0,
							y: 0,
							width: width,
							height: height,
							draggable: false,
							rotation: 0,
							name: 'background'
						});

						vm.utils.signature.layer.add(bgImg);
						vm.utils.signature.layer.draw();
					}
					else
					{
						var bgRect = new Konva.Rect({
					        x: 0,
					        y: 0,
					        width: $("#SignaturePadContainer").width(),
					        height: height,
					        fill: '#fff',
					        listening: false,
					        name: 'background'
					    });

						vm.utils.signature.layer.add(bgRect);
						vm.utils.signature.layer.draw();
					}

					vm.utils.signature.initDrawing();
				},
				initDrawing: function(){

					// then we are going to draw into special canvas element
					vm.utils.signature.drawing_canvas = document.createElement('canvas');
					vm.utils.signature.drawing_canvas.width = vm.utils.signature.stage.width();
					vm.utils.signature.drawing_canvas.height = vm.utils.signature.stage.height();

					// created canvas we can add to layer as "Konva.Image" element
					var image = new Konva.Image({
						image: vm.utils.signature.drawing_canvas,
						x: 0,
						y: 0,
					});

					vm.utils.signature.layer.add(image);

					// Good. Now we need to get access to context element
					vm.utils.signature.drawing_context = vm.utils.signature.drawing_canvas.getContext('2d');
					vm.utils.signature.drawing_context.strokeStyle = vm.utils.signature.pen.settings.strokeColor;
					vm.utils.signature.drawing_context.lineJoin = vm.utils.signature.pen.settings.joinStyle;
					vm.utils.signature.drawing_context.lineWidth = vm.utils.signature.pen.settings.lineWidth;

					var isPaint = false;
					var lastPointerPosition;

					// now we need to bind some events
					// we need to start drawing on mousedown
					// and stop drawing on mouseup
					image.on('mousedown touchstart', function () {
						if( vm.utils.signature.mode == 'paint' ) {
							isPaint = true;
						} 

						// isPaint = true;
						lastPointerPosition = vm.utils.signature.stage.getRelativePointerPosition();
					});

					// will it be better to listen move/end events on the window?
					vm.utils.signature.stage.on('mouseup touchend', function () {
						isPaint = false;
						vm.utils.signature.last_dist = 0;
						vm.utils.signature.last_center = null;
						// vm.utils.signature.bgImg.draggable(true);
					});

					// and core function - drawing
					vm.utils.signature.stage.on('mousemove touchmove', function(e){
						
						if(!isPaint) {
							return;
						}

						if(vm.utils.signature.pen.settings.mode === 'brush') {
							vm.utils.signature.drawing_context.globalCompositeOperation = 'source-over';
						}

						if(vm.utils.signature.pen.settings.mode === 'eraser') {
							vm.utils.signature.drawing_context.globalCompositeOperation = 'destination-out';
						}

						vm.utils.signature.drawing_context.beginPath();

						var localPos = {
							x: lastPointerPosition.x - image.x(),
							y: lastPointerPosition.y - image.y(),
						};

						vm.utils.signature.drawing_context.moveTo(localPos.x, localPos.y);
						var pos = vm.utils.signature.stage.getRelativePointerPosition();

						localPos = {
							x: pos.x - image.x(),
							y: pos.y - image.y(),
						};

						vm.utils.signature.drawing_context.lineTo(localPos.x, localPos.y);
						vm.utils.signature.drawing_context.closePath();
						vm.utils.signature.drawing_context.stroke();

						lastPointerPosition = pos;
				        
				        // redraw manually
				        vm.utils.signature.layer.batchDraw();
				    });
				},
				getDistance: function(p1, p2) {
					return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
				},
				getCenter: function(p1, p2) {
					return {
			        	x: (p1.x + p2.x) / 2,
			        	y: (p1.y + p2.y) / 2,
			        };
				},
				getImageMeta: function(url){
					var defer = $q.defer();
					var img = new Image();
					img.crossOrigin = 'Anonymous';

					img.onload = function()
					{
						defer.resolve(img);
					}

					img.src = url;
					return defer.promise;
				},
				downloadFileUrl: function(){
					var url = vm.utils.signature.stage.toDataURL({ pixelRatio: 1 });
          			return url;
				},
				reset: function(){
					//DESTROY STAGE
					// if( vm.utils.signature.stage )
					// {
					// 	vm.utils.signature.stage.destroy();
					// }

					vm.utils.signature.cleanup();
					vm.utils.signature.init(signatureFactory.media_record);
				},
				resetZoom: function() {
					vm.utils.signature.stage.x(vm.utils.signature.orig_stage_state.x);
					vm.utils.signature.stage.y(vm.utils.signature.orig_stage_state.y);

					vm.utils.signature.stage.scaleX(vm.utils.signature.orig_stage_state.scale_x);
					vm.utils.signature.stage.scaleY(vm.utils.signature.orig_stage_state.scale_y);

					vm.utils.signature.stage.position(vm.utils.signature.orig_stage_state.position);

					vm.utils.signature.zoomed = false;
				},
				dataURLtoFile(dataurl, filename){
					var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
				    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
				    while(n--){
				        u8arr[n] = bstr.charCodeAt(n);
				    }
				    return new File([u8arr], filename, {type:mime});
				},
				save: function(){

					if( vm.utils.signature.zoomed ) {
						vm.utils.signature.resetZoom();
					}

					var img_url = vm.utils.signature.stage.toDataURL();
					console.log("IMAGE URL");
					console.log(img_url);

					console.log("MEDIA RECORD");
					console.log(JSON.stringify(vm.utils.media_record, null, 2));

					if( !vm.utils.media_record.attachment_key && !vm.utils.media_record.file_name ) {
						vm.utils.media_record.attachment_key = new Date().getTime() + '.png';
					}

					if( !vm.utils.media_record.attachment_key && vm.utils.media_record.file_name ) {
						vm.utils.media_record.attachment_key = vm.utils.media_record.file_name;
					}

					var file = vm.utils.signature.dataURLtoFile(img_url, vm.utils.media_record.attachment_key);

					console.log("CONVERTED FILE");
					console.log(file);

					// console.log("BLOB TO SAVE");
					// console.log(blob);

					// var file = new File([blob], vm.utils.media_record.attachment_key);

					vm.utils.signature.is_saving = true;

					signatureFactory.saveFile(vm.utils.media_record, file).then(function(media_record){

						vm.utils.media_id = media_record._id;
						vm.utils.media_record = media_record;

						vm.utils.signature.is_saving = false;

						var params = {
							directive_id: signatureFactory.directive_id,
							media_record: media_record
						};

						$rootScope.$broadcast("signaturePad::saved", params);

					}, function(error){
						vm.utils.signature.is_saving = false;
						alert(error);
					});
				},
				download: function(){
					var name = 'drawingPadDownload';
					var uri = vm.utils.signature.downloadFileUrl();

			        var link = document.createElement('a');
			        link.download = name;
			        link.href = uri;
			        document.body.appendChild(link);
			        link.click();
			        document.body.removeChild(link);
			        delete link;
			    },
			    calcScaledRatio: function(canvas_width, canvas_height, img_width, img_height){

			    	//DONT UP SCALE
			    	if( img_width <= canvas_width && img_height <= canvas_height )
			    	{
			    		return 1;
			    	}

			    	var hRatio = canvas_width / img_width;
					var vRatio = canvas_height / img_height;
					var ratio = Math.min(hRatio, vRatio);
					return ratio;
			    },
			},
		};

		$scope.$watch('vm.directiveid', function(newVal, oldVal){
			vm.utils.directive_id = vm.directiveid;
		});

		// $scope.$watch(function(){
		// 	return signatureFactory.directive_id;
		// }, function(newVal, oldVal){
		// 	vm.utils.directive_id = signatureFactory.directive_id;
		// 	// vm.utils.signature.init('http://localhost/RMAngular/images/FeatureSlide/x.jpg');
		// });

		$scope.$watch(function() {
			return signatureFactory.initial_crop;
		}, function(newVal, oldVal) {
			vm.utils.initial_crop = signatureFactory.initial_crop;
		});

		$scope.$on("signaturePad::newDrawing", function(event, data){

			if( !signatureFactory.media_record )
			{
				return;
			}

			//RESET POPOVER POSITION
			$rootScope.$broadcast("draggable::reset");

			vm.utils.hidden = false;
			vm.utils.minimised = false;

			console.log("INIT SIGNATURE PAD MEDIA ID: " + signatureFactory.media_record._id);

			// if( vm.utils.signature.stage )
			// {
			// 	vm.utils.signature.stage.destroy(); //CHECK THIS
			// }

			// MAKE SURE BOTH ARE RESET
			vm.utils.signature.cleanup();

			// GIVE TIME FOR SIGNATURE CONTAINER TO RENDER
			setTimeout(function() {
				vm.utils.signature.init(signatureFactory.media_record);
			}, 100);

		});

		$scope.$on("signaturePad::hide", function(event, data){

			vm.utils.signature.cleanup();

			// if( vm.utils.signature.stage )
			// {
			// 	vm.utils.signature.stage.destroy();
			// }

			vm.utils.hidden = true;
		});

		$scope.$on("signaturePad::exit", function(event, data){

			vm.utils.signature.cleanup();

			vm.utils.hidden = true;

			// DESTROY SCOPE
			if( data.hasOwnProperty('destroy_scope') && data.destroy_scope ) {
				$scope.$destroy();
			}
		});

		vm.toggleMinimised = function()
		{
			vm.utils.minimised = !vm.utils.minimised;
		}

		vm.minimise = function()
		{
			vm.utils.minimised = true;
		}

		vm.maximise = function()
		{
			vm.utils.minimised = false;
		}

		vm.toggleShow = function()
		{
			vm.utils.hidden = !vm.utils.hidden;

			if( vm.utils.hidden )
			{
				// $rootScope.$broadcast("videoPlayer::pause");
				// vm.utils.signature.stage.destroy();
				vm.utils.signature.cleanup();
			}
		}

		vm.show = function()
		{
			vm.utils.hidden = false;
		}

		vm.hide = function()
		{
			vm.utils.hidden = true;
			// vm.utils.signature.stage.destroy();
			vm.utils.signature.cleanup();
			// $rootScope.$broadcast("videoPlayer::pause");
		}
	}

	function signatureFactory($q, $rootScope, mediaFactory, modelsFactory, rmUtilsFactory, riskmachDatabasesFactory) 
	{
		var factory = {};

		factory.directive_id = null;
		factory.image_path = -1;
		factory.meta_data = null;

		factory.media_id = null;
		factory.media_record = null;

		factory.template_type = 'inline';

		// factory.max_width = window.innerWidth;
		// factory.max_height = window.innerHeight - 150;
		factory.max_width = 300;
		factory.max_height = 180;

		factory.initial_crop = false;

		factory.newDrawing = function(media_record, template_type){
			//RE CALC WINDOW
			// factory.max_width = window.innerWidth;
			// factory.max_height = window.innerHeight - 150;
			factory.max_width = 425;
			factory.max_height = 180;

			console.log("RECEIVED MEDIA RECORD");
			console.log(media_record);

			if( factory.max_width > 800 )
			{
				// factory.max_width = 800;
				factory.max_width = 425;
			}

			if( factory.max_height > 800 )
			{
				// factory.max_height = 800;
				factory.max_height = 180;
			}

			factory.media_id = media_record._id;
			factory.media_record = media_record;
			factory.initial_crop = false;
			factory.template_type = template_type;

			console.log("MEDIA ID SET: " + factory.media_id);

			$rootScope.$broadcast("signaturePad::newDrawing");
		}

		factory.newCrop = function(directive_id, media_id) {
			//RE CALC WINDOW
			factory.max_width = window.innerWidth;
			factory.max_height = window.innerHeight - 150;

			if( factory.max_width > 800 )
			{
				factory.max_width = 800;
			}

			if( factory.max_height > 800 )
			{
				factory.max_height = 800;
			}

			factory.directive_id = directive_id;
			factory.media_id = media_id;
			factory.initial_crop = true;

			$rootScope.$broadcast("signaturePad::newDrawing");
		}

		factory.hideDrawingPad = function(){
			$rootScope.$broadcast("signaturePad::hide");

			factory.media_id = null;
			factory.media_record = null;
		}

		factory.dbUtils = {
			getSigMediaRecord: function(sig_media_id, record_id, record_type) {
				var defer = $q.defer();

				if( !sig_media_id ) {
					// CREATE NEW SIG MEDIA RECORD
					var media_record = modelsFactory.models.newMediaRecord(record_id, record_type);
					media_record.is_signature = 'Yes';
					media_record.is_register = 'No';

					defer.resolve(media_record);

					return defer.promise;
				}

				mediaFactory.dbUtils.getMediaRecord(sig_media_id).then(function(media_record) {

					if( media_record.file_downloaded != 'Yes' ) {
						media_record.url = null;
						defer.resolve(media_record);
						return defer.promise;
					}

					// GET ATTACHMENT URL FOR SIGNATURE
					mediaFactory.dbUtils.getAttachmentUrl(media_record._id, media_record.attachment_key).then(function(url) {

						media_record.url = url;

						defer.resolve(media_record);

					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
		}

		factory.saveFile = function(media_record, file){
			var defer = $q.defer();

			// MARK MEDIA MODIFIED
			rmUtilsFactory.sync_decoration.media_records.mediaModified(media_record).then(function(modified_media) {

				media_record = modified_media;

				// UNSET RM PROPERTIES SO FILE IS IMPORTED, MEDIA RECORD IMPORTED AS NEW REVISION
				media_record.rm_id = null;
				media_record.rm_revision_number = null;
				media_record.file_download_rm_id = null;

				riskmachDatabasesFactory.databases.collection.media.post(media_record, {force: true}).then(function(result) {

					media_record._id = result.id;
					media_record._rev = result.rev;

					//SAVE THE ATTACHMENT
					riskmachDatabasesFactory.databases.collection.media.putAttachment(media_record._id, file.name, media_record._rev, file, file.type).then(function(attach_result){

						media_record._id = attach_result.id;
						media_record._rev = attach_result.rev;

						// GET ENTIRE MEDIA RECORD AND ATTACHMENTS
						riskmachDatabasesFactory.databases.collection.media.get(media_record._id).then(function(media_doc) {

							defer.resolve(media_doc);

						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error){
						defer.reject(error);
						alert(error);
					});

				}).catch(function(error) {
					console.log("ERROR MARKING MEDIA RECORD MODIFIED AFTER DRAWING");
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		return factory;
	}

	function signature() 
	{
		var directive = {};

		directive.scope = {
			directiveid: '=',
			relations: '='
		};

		directive.restrict = 'A';
		directive.controller = 'signatureController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/signature/tpl/signature_details.html';
		directive.bindToController = true;
		directive.replace = false;
		
		return directive;
	}

	function signaturePad() 
	{
		var directive = {};

		directive.scope = {
			directiveid: '='
		};

		directive.restrict = 'A';
		directive.templateUrl = '../rm-utils/signature/tpl/signature_pad_page.html';
		directive.controller = 'signaturePadController';
		directive.controllerAs = 'vm';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

})()