(function(){

	angular.module('rmDrawingPad', ['riskmachDatabases','riskmachUtils'])
	.controller('drawingPadController', drawingPadController)
	.controller('drawingPageController', drawingPageController)
	// .controller('signaturePadController', signaturePadController)
	.factory('drawingPadFactory', drawingPadFactory)
	// .factory('signaturePadFactory', signaturePadFactory)
	.directive('drawingPad', drawingPad)
	// .directive('signaturePad', signaturePad);

	function drawingPageController($scope, $rootScope, drawingPadFactory)
	{
		var vm = this;

		vm.utils = {
			drawing: {
				directive_id: 'drawingPad',
				start: function(img_path){
					drawingPadFactory.newDrawing(vm.utils.drawing, img_path);
				},
				events: function(){

					$scope.$on("drawingPad::saved", function(event, data){
						drawingPadFactory.hideDrawingPad();
					});

				}()
			}
		};
	}

	function drawingPadController($scope, $rootScope, $q, $sce, drawingPadFactory, riskmachDatabasesFactory, rmUtilsFactory, authFactory)
	{
		var vm = this;

		// alert("Drawing Pad Controller");

		vm.utils = {
			directive_id: null,
			options: vm.options,
			initial_crop: false,
			media_id: null,
			media_record: null,
			minimised: false,
			hidden: true,
			drawing_pad_template: null,
			drawing_pad_container: null,
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
			setDrawingPadTemplate: function() {
				setTimeout(function() {
					// if( vm.utils.hasTestAccess() ) {
					// 	vm.utils.drawing_pad_template = '../rm-utils/drawing-pad/tpl/drawing_pad_annotation.html';
					// } else {
					// 	vm.utils.drawing_pad_template = '../rm-utils/drawing-pad/tpl/drawing_pad.html';
					// }

					// if( vm.utils.directive_id == 'procedureDrawingPad' ) {
					// 	vm.utils.drawing_pad_template = '../rm-utils/drawing-pad/tpl/drawing_pad_annotation.html';
					// } else {
					// 	vm.utils.drawing_pad_template = '../rm-utils/drawing-pad/tpl/drawing_pad.html';
					// }

					console.log("SET DRAWING PAD TEMPLATE");
					console.log(vm.utils.directive_id);

					switch(vm.utils.directive_id) {
						case 'procedureDrawingPad':
							vm.utils.drawing_pad_template = '../rm-utils/drawing-pad/tpl/drawing_pad_annotation.html';
							vm.utils.drawing_pad_container = 'DrawingPadContainer';
							break;
						case 'uAuditDrawingPad': 
							vm.utils.drawing_pad_template = '../rm-utils/drawing-pad/tpl/drawing_pad_inline.html';
							vm.utils.drawing_pad_container = 'DrawingPadInlineContainer';
							break;
						case 'checklistAuditsDrawingPad':
							vm.utils.drawing_pad_template = '../rm-utils/drawing-pad/tpl/drawing_pad_annotation.html';
							vm.utils.drawing_pad_container = 'DrawingPadContainer';
							break;
						case 'managedRiskDrawingPad':
							vm.utils.drawing_pad_template = '../rm-utils/drawing-pad/tpl/drawing_pad_annotation.html';
							vm.utils.drawing_pad_container = 'DrawingPadContainer';
							break;
						default: 
							vm.utils.drawing_pad_template = '../rm-utils/drawing-pad/tpl/drawing_pad.html';
							vm.utils.drawing_pad_container = 'DrawingPadContainer';
					}

				}, 0);
			}(),
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
			drawing: {
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
					vm.utils.drawing.mode = mode;

					if( mode == 'annotate' ) {
						setTimeout(function() {
							document.getElementById("annotations-scroll-to").scrollIntoView();
						}, 10);
					}

					if( mode == 'crop' ) {
						vm.utils.drawing.crop_confirmation = false;

						vm.utils.drawing.cleanup();
						vm.utils.cropping.init(drawingPadFactory.media_id);
					}
				},
				toggleCropConfirmation: function() {
					vm.utils.drawing.crop_confirmation = !vm.utils.drawing.crop_confirmation;
				},
				annotationLabellingDisabled: function() {
					// EJ-CHANGE (new function to disable labelling)
					if( vm.utils.options && vm.utils.options.hasOwnProperty('disable_annotation_labels') && vm.utils.options.disable_annotation_labels ) {
						return true;
					} else {
						return false;
					}
				},
 				pen: {
					settings: {
						mode: 'brush',
						strokeColor: 'red',
						// strokeColor: 'rgb(255, 0, 0, 0.5)',
						joinStyle: 'round',
						lineWidth: 3,
						opacity: 0.5
					},
					changeColor: function(color){
						vm.utils.drawing.pen.settings.strokeColor = color;
						vm.utils.drawing.drawing_context.strokeStyle = vm.utils.drawing.pen.settings.strokeColor;
					},
					changeLineWidth: function(value){
						vm.utils.drawing.pen.settings.lineWidth = value;
						vm.utils.drawing.drawing_context.lineWidth = value;
					},
					changeLineJoin: function(value){
						vm.utils.drawing.pen.settings.joinStyle = value;
						vm.utils.drawing.drawing_context.lineJoin = value;
					},
					colourActiveStyle: function(color){
						var style = {
							'border': '2px solid ' + color
						};

						if( color == vm.utils.drawing.pen.settings.strokeColor )
						{
							style['border'] = '2px solid black';
						}

						return style;
					}
				},
				getMediaRecord: function(media_id){
					var defer = $q.defer();

					console.log("Getting Media Record ID: " + media_id);

					// IF NO MEDIA ID, SET TO FACTORY MEDIA RECORD
					if( !media_id ) {
						vm.utils.media_record = drawingPadFactory.new_media_record;
						vm.utils.drawing.formatMediaRecord(vm.utils.media_record);

						defer.resolve(vm.utils.media_record.temp_app_url);
						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.media.get(media_id).then(function(media_record){

						vm.utils.media_record = media_record;

						vm.utils.drawing.formatMediaRecord(vm.utils.media_record);

						console.log("FETCHED MEDIA RECORD");
						console.log(vm.utils.media_record);

						//GET ATTACHMENT URL
						vm.utils.drawing.attachmentUrl(media_record._id, media_record.attachment_key).then(function(bg_url){
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
				formatMediaRecord: function(media_record) {
					if( !media_record.hasOwnProperty('annotations') || !media_record.annotations ) {
						media_record.annotations = [];
					}
				},
				cleanup: function(){

					if( vm.utils.drawing.stage )
					{
						// THIS DESTROYS ALL CHILDREN AS WELL
						vm.utils.drawing.stage.destroy();
					}

					if( vm.utils.drawing.layer )
					{
						vm.utils.drawing.layer.destroy();
					}

					if( vm.utils.drawing.transformer )
					{
						vm.utils.drawing.transformer.destroy();
					}

					if( typeof bgImg !== 'undefined' && bgImg )
					{
						bgImg.destroy();
					}

					if( typeof bg_img !== 'undefined' && bg_img )
					{
						bg_img = null;
					}

					if( vm.utils.drawing.drawing_canvas )
					{
						vm.utils.drawing.drawing_canvas.remove();
					}

					vm.utils.drawing.stage = null;
					vm.utils.drawing.layer = null;
					vm.utils.drawing.transformer = null;
					vm.utils.drawing.drawing_canvas = null;
					vm.utils.drawing.drawing_context = null;
				},
				init: function(media_id){

					vm.utils.image_loading = true;

					vm.utils.drawing.crop_confirmation = false;

					vm.utils.tabs.changeTab('annotation_list');

					vm.utils.media_id = media_id;
					
					// $(document).ready(function(){

					// 	setTimeout(function(){

							//GET MEDIA RECORD
							vm.utils.drawing.getMediaRecord(vm.utils.media_id).then(function(bg_url){

								// vm.utils.image_loading = false;
								// vm.utils.drawing.initStage(null);

								//INITIALISE CANVAS ETC
								if(bg_url)
								{
									vm.utils.drawing.getImageMeta(bg_url).then(function(bg_img){
										vm.utils.image_loading = false;
										vm.utils.drawing.initStage( bg_img );
									});
								}
								else
								{
									vm.utils.image_loading = false;
									vm.utils.drawing.initStage();
								}

							}, function(error){
								alert(error);
								vm.utils.image_loading = false;
								vm.utils.drawing.initStage();
							});

					// 		$scope.$apply();

					// 	}, 0);

					// });

				},
				initStage: function(bg_img){

					Konva.hitOnDragEnabled = true;

					// INIT MODE TO PAINTING
					vm.utils.drawing.mode = 'paint';

					//GET THE DEFAULT CANVAS DIMENSIONS / SIZE OF WINDOW
					var width = drawingPadFactory.max_width;
					var height = drawingPadFactory.max_height;

					// console.log("WIDTH: " + width);
					// console.log("HEIGHT: " + height);

					if( bg_img )
					{
						var img_width = bg_img.width;
						var img_height = bg_img.height;

						var ratio = vm.utils.drawing.calcScaledRatio(width, height, img_width, img_height);
						width = img_width * ratio;
						height = img_height * ratio;
					}

					console.log("WIDTH: " + width);
					console.log("HEIGHT: " + height);

					//RE SIZE THE CANVAS TO FIT SCALED IMAGE
					$("#" + vm.utils.drawing_pad_container).width(width);
					$("#" + vm.utils.drawing_pad_container).height(height);

					var stage = new Konva.Stage({
						container: vm.utils.drawing_pad_container,
						width: width,
						height: height
					});

					vm.utils.drawing.stage = stage;

					//CREATE THE LAYER
					vm.utils.drawing.layer = new Konva.Layer();
					vm.utils.drawing.stage.add(vm.utils.drawing.layer);

					vm.utils.drawing.orig_stage_state.x = vm.utils.drawing.stage.x();
					vm.utils.drawing.orig_stage_state.y = vm.utils.drawing.stage.y();
					vm.utils.drawing.orig_stage_state.scale_x = vm.utils.drawing.stage.scaleX();
					vm.utils.drawing.orig_stage_state.scale_y = vm.utils.drawing.stage.scaleY();
					vm.utils.drawing.orig_stage_state.position = vm.utils.drawing.stage.position();

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

						vm.utils.drawing.layer.add(bgImg);
						vm.utils.drawing.layer.draw();
					}
					// else
					// {
					// 	var bgRect = new Konva.Rect({
					//         x: 0,
					//         y: 0,
					//         width: width,
					//         height: height,
					//         fill: '#ddd',
					//         listening: false,
					//     });

					// 	vm.utils.drawing.layer.add(bgRect);
					// 	vm.utils.drawing.layer.draw();
					// }

					// CREATE THE TRANSFORMER
   					vm.utils.drawing.transformer = new Konva.Transformer({
			            nodes: [],
			            keepRatio: true,
			            enabledAnchors: [
				        	'top-left',
				        	'top-right',
				        	'bottom-left',
				        	'bottom-right',
				        ],
			            boundBoxFunc: (oldBox, newBox) => {
			            	if (newBox.width < 10 || newBox.height < 10) {
			                	return oldBox;
			            	}
			              	return newBox;
			            },
			        });

			   		vm.utils.drawing.layer.add(vm.utils.drawing.transformer);

					vm.utils.drawing.initDrawing();
				},
				initDrawing: function(){

					// then we are going to draw into special canvas element
					vm.utils.drawing.drawing_canvas = document.createElement('canvas');
					vm.utils.drawing.drawing_canvas.width = vm.utils.drawing.stage.width();
					vm.utils.drawing.drawing_canvas.height = vm.utils.drawing.stage.height();

					// created canvas we can add to layer as "Konva.Image" element
					var image = new Konva.Image({
						image: vm.utils.drawing.drawing_canvas,
						x: 0,
						y: 0,
					});

					vm.utils.drawing.layer.add(image);

					// Good. Now we need to get access to context element
					vm.utils.drawing.drawing_context = vm.utils.drawing.drawing_canvas.getContext('2d');
					vm.utils.drawing.drawing_context.strokeStyle = vm.utils.drawing.pen.settings.strokeColor;
					vm.utils.drawing.drawing_context.lineJoin = vm.utils.drawing.pen.settings.joinStyle;
					vm.utils.drawing.drawing_context.lineWidth = vm.utils.drawing.pen.settings.lineWidth;


					var isPaint = false;
					var lastPointerPosition;

					// now we need to bind some events
					// we need to start drawing on mousedown
					// and stop drawing on mouseup
					image.on('mousedown touchstart', function () {
						if( vm.utils.drawing.mode == 'paint' ) {
							isPaint = true;
						} 

						// isPaint = true;
						lastPointerPosition = vm.utils.drawing.stage.getRelativePointerPosition();
					});

					// will it be better to listen move/end events on the window?
					vm.utils.drawing.stage.on('mouseup touchend', function () {
						isPaint = false;
						vm.utils.drawing.last_dist = 0;
						vm.utils.drawing.last_center = null;
						// vm.utils.drawing.bgImg.draggable(true);
					});

					// and core function - drawing
					vm.utils.drawing.stage.on('mousemove touchmove', function(e){

        				var touch1 = null;
        				var touch2 = null;

        				// IF ON MOBILE, TOUCHES WILL BE DEFINED
        				if( angular.isDefined(e.evt.touches) ) {
        					touch1 = e.evt.touches[0];
        					touch2 = e.evt.touches[1];
        				}

        				var shift_key = e.evt.shiftKey;

        				if( touch1 && touch2 ) {

        					// vm.utils.drawing.bgImg.draggable(false);

        					// STAGE ZOOMED
        					vm.utils.drawing.zoomed = true;
        					$scope.$apply();

        					if (vm.utils.drawing.stage.isDragging()) {
					            vm.utils.drawing.stage.stopDrag();
					        }

					        var p1 = {
					            x: touch1.clientX,
					            y: touch1.clientY,
					        };
					          
					        var p2 = {
					            x: touch2.clientX,
					            y: touch2.clientY,
					        };
					        // var p2 = {
					        // 	x: 125,
					        // 	y: 385
					        // }

					        if (!vm.utils.drawing.last_center) {
					        	vm.utils.drawing.last_center = vm.utils.drawing.getCenter(p1, p2);
					            return;
					        }
					          
					        var newCenter = vm.utils.drawing.getCenter(p1, p2);

					        var dist = vm.utils.drawing.getDistance(p1, p2);

					        if (!vm.utils.drawing.last_dist) {
					        	vm.utils.drawing.last_dist = dist;
					        }

					        // local coordinates of center point
					        var pointTo = {
					            x: (newCenter.x - vm.utils.drawing.stage.x()) / vm.utils.drawing.stage.scaleX(),
					            y: (newCenter.y - vm.utils.drawing.stage.y()) / vm.utils.drawing.stage.scaleX(),
					        };

					        var scale = vm.utils.drawing.stage.scaleX() * (dist / vm.utils.drawing.last_dist);

					        vm.utils.drawing.stage.scaleX(scale);
					        vm.utils.drawing.stage.scaleY(scale);

					        // calculate new position of the stage
					        var dx = newCenter.x - vm.utils.drawing.last_center.x;
					       	var dy = newCenter.y - vm.utils.drawing.last_center.y;

					        var newPos = {
					            x: newCenter.x - pointTo.x * scale + dx,
					            y: newCenter.y - pointTo.y * scale + dy,
					        };

					        vm.utils.drawing.stage.position(newPos);

					    	vm.utils.drawing.last_dist = dist;
					   		vm.utils.drawing.last_center = newCenter;

        					return;
        				}
						
						if(!isPaint) {
							return;
						}

						if(vm.utils.drawing.pen.settings.mode === 'brush') {
							vm.utils.drawing.drawing_context.globalCompositeOperation = 'source-over';
						}

						if(vm.utils.drawing.pen.settings.mode === 'eraser') {
							vm.utils.drawing.drawing_context.globalCompositeOperation = 'destination-out';
						}

						vm.utils.drawing.drawing_context.beginPath();

						var localPos = {
							x: lastPointerPosition.x - image.x(),
							y: lastPointerPosition.y - image.y(),
						};

						vm.utils.drawing.drawing_context.moveTo(localPos.x, localPos.y);
						var pos = vm.utils.drawing.stage.getRelativePointerPosition();

						localPos = {
							x: pos.x - image.x(),
							y: pos.y - image.y(),
						};

						vm.utils.drawing.drawing_context.lineTo(localPos.x, localPos.y);
						vm.utils.drawing.drawing_context.closePath();
						vm.utils.drawing.drawing_context.stroke();

						lastPointerPosition = pos;
				        
				        // redraw manually
				        vm.utils.drawing.layer.batchDraw();
				    });

				    // clicks should select/deselect shapes
				    vm.utils.drawing.stage.on('click tap', function (e) {

				        // if click on empty area - remove all selections
				        if (e.target === vm.utils.drawing.stage) {
				       		vm.utils.drawing.transformer.nodes([]);
				        	return;
				        }

				        // do nothing if clicked NOT on our annotations
				        if (!e.target.hasName('annotation_img')) {
				        	vm.utils.drawing.transformer.nodes([]);
				        	return;
				        }

						var is_selected = vm.utils.drawing.transformer.nodes().indexOf(e.target) >= 0;

				        if (!is_selected) {
				       		// IF THE NODE IS NOT SELECTED, ATTACH TRANSFORMER

				        	vm.utils.drawing.transformer.nodes([e.target]);
				        }
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
					var url = vm.utils.drawing.stage.toDataURL({ pixelRatio: 1 });
          			return url;
				},
				reset: function(){
					//DESTROY STAGE
					// if( vm.utils.drawing.stage )
					// {
					// 	vm.utils.drawing.stage.destroy();
					// }

					vm.utils.drawing.cleanup();
					vm.utils.drawing.init(drawingPadFactory.media_id);
				},
				resetZoom: function() {
					vm.utils.drawing.stage.x(vm.utils.drawing.orig_stage_state.x);
					vm.utils.drawing.stage.y(vm.utils.drawing.orig_stage_state.y);

					vm.utils.drawing.stage.scaleX(vm.utils.drawing.orig_stage_state.scale_x);
					vm.utils.drawing.stage.scaleY(vm.utils.drawing.orig_stage_state.scale_y);

					vm.utils.drawing.stage.position(vm.utils.drawing.orig_stage_state.position);

					vm.utils.drawing.zoomed = false;
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

					vm.utils.drawing.formatAnnotations();

					if( vm.utils.drawing.zoomed ) {
						vm.utils.drawing.resetZoom();
					}

					var img_url = vm.utils.drawing.stage.toDataURL();
					// console.log("IMAGE URL");
					// console.log(img_url);

					var file = vm.utils.drawing.dataURLtoFile(img_url, vm.utils.media_record.attachment_key);

					console.log("CONVERTED FILE");
					console.log(file);

					// console.log("BLOB TO SAVE");
					// console.log(blob);

					// var file = new File([blob], vm.utils.media_record.attachment_key);

					vm.utils.drawing.is_saving = true;

					drawingPadFactory.saveFile(vm.utils.media_record, file).then(function(media_record){

						vm.utils.media_id = media_record._id;
						vm.utils.media_record = media_record;

						vm.utils.drawing.is_saving = false;

						var params = {
							directive_id: drawingPadFactory.directive_id,
							media_record: media_record
						};

						$rootScope.$broadcast("drawingPad::saved", params);

					}, function(error){
						vm.utils.drawing.is_saving = false;
						alert(error);
					});
				},
				download: function(){
					var name = 'drawingPadDownload';
					var uri = vm.utils.drawing.downloadFileUrl();

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
			   	addText: function() {
			   		var textNode = new Konva.Text({
			   			text: 'This is some example text',
			   			fontSize: 30,
			   			fill: 'yellow',
			   		});

			   		var textGroup = new Konva.Group({
				        x: 200,
				        y: 50,
				        draggable: true,
			      	});

			      	vm.utils.drawing.layer.add(textGroup);
			      	textGroup.add(textNode);

			      	var width = textNode.width();
			      	var height = textNode.height();

			      	vm.utils.drawing.addTextAnchor(textGroup, 0, 0, 'topLeft');
			      	vm.utils.drawing.addTextAnchor(textGroup, width, 0, 'topRight');
			      	vm.utils.drawing.addTextAnchor(textGroup, width, height, 'bottomRight');
			      	vm.utils.drawing.addTextAnchor(textGroup, 0, height, 'bottomLeft');

			   		// vm.utils.drawing.layer.add(textNode);
			   	},
			   	updateTextSize: function(activeAnchor) {
			        var group = activeAnchor.getParent();

			        var topLeft = group.findOne('.topLeft');
			        var topRight = group.findOne('.topRight');
			        var bottomRight = group.findOne('.bottomRight');
			        var bottomLeft = group.findOne('.bottomLeft');
			        var text = group.findOne('Text');

			        var anchorX = activeAnchor.x();
			        var anchorY = activeAnchor.y();

			        // update anchor positions
			        switch (activeAnchor.getName()) {
			        	case 'topLeft':
				            topRight.y(anchorY);
				            bottomLeft.x(anchorX);
				            break;
			       		case 'topRight':
				            topLeft.y(anchorY);
				            bottomRight.x(anchorX);
				            break;
			        	case 'bottomRight':
				            bottomLeft.y(anchorY);
				            topRight.x(anchorX);
				            break;
			        	case 'bottomLeft':
				            bottomRight.y(anchorY);
				            topLeft.x(anchorX);
				            break;
			        }

			        text.position(topLeft.position());

			        var width = topRight.x() - topLeft.x();
			        var height = bottomLeft.y() - topLeft.y();

			        if (width && height) {
			        	text.width(width);
			        	text.height(height);
			        }
			    },
			   	addTextAnchor: function(group, x, y, name) {
			        var stage = group.getStage();
			        var layer = group.getLayer();

			        var anchor = new Konva.Circle({
			        	x: x,
			        	y: y,
			        	stroke: '#666',
			        	fill: '#ddd',
			        	strokeWidth: 2,
			        	radius: 8,
			        	name: name,
			        	draggable: true,
			        	dragOnTop: false,
			        });

			        anchor.on('dragmove', function () {
			         	vm.utils.drawing.updateTextSize(this);
			        });

			        anchor.on('mousedown touchstart', function () {
			        	group.draggable(false);
			        	this.moveToTop();
			        });

			        anchor.on('dragend', function () {
			         	group.draggable(true);
			        });

			        // add hover styling
			        anchor.on('mouseover', function () {
			        	var layer = this.getLayer();
			        	document.body.style.cursor = 'pointer';
			        	this.strokeWidth(4);
			        });

			        anchor.on('mouseout', function () {
			        	var layer = this.getLayer();
			        	document.body.style.cursor = 'default';
			        	this.strokeWidth(2);
			        });

			        group.add(anchor);
			    },
			   	addAnnotation: function(){

			   		if( vm.utils.media_record.annotations.length == 5 ) {
			   			alert("Can't add anymore annotations");
			   			return;
			   		}

			   		// http://localhost/RMAngular/images/hazard_icons/toxic.gif
			   		// http://localhost/browser-app/app/images/custom_icons/Asset Blue.png

			   		var base_url = '../images/markers/';
			   		var icon = vm.utils.drawing.calcNextAnnotationIcon();

			   		if( !icon ) {
			   			return;
			   		}

			   		var file_path = base_url + icon.file_name;

			   		Konva.Image.fromURL(file_path, function(imgNode){

			   			var img_width = imgNode.width();
				      	var img_height = imgNode.height();

				      	imgNode.setAttrs({
			   				aspectRatio: img_width / img_height,
			   				default_w: img_width, 
			   				name: 'annotation_img',
			   				draggable: true
			   			});

				      	vm.utils.drawing.layer.add(imgNode);

				      	// DESELECT OTHER ANNOTATIONS

				      	vm.utils.drawing.addAnnotationToMediaRecord(imgNode, icon);

			   			// MOVE TRANSFORMER LAYER
			   			vm.utils.drawing.transformer.moveToTop();
			   			// ATTACH IMAGE NODE TO TRANSFORMER
			   			vm.utils.drawing.transformer.nodes([imgNode]);

			   			// DE-SELECT ACTIVE MARKER COLOUR
			   			if( vm.utils.drawing.active_hex_code ) {
			   				vm.utils.drawing.clearActiveHexCode();
			   			}
			   		});
			   	},
			   	addAnnotationToMediaRecord: function(node, icon) {

			   		var data = vm.utils.drawing.createAnnotationObj(node, icon);

			   		// PUSH TO ARRAY AND RETURN ITS INDEX
			   		var new_index = vm.utils.media_record.annotations.push(data) - 1;

			   		if( !vm.utils.drawing.annotationLabellingDisabled() ) {
			   			vm.utils.annotation_form.start(data, new_index);
			   		}

			   		$scope.$apply();
			   	},
			   	createAnnotationObj: function(node, icon) {
			   		var data = {
			   			node_id: node._id,
			   			node_x: null, 
			   			node_y: null,
			   			node_editable: true,
			   			description: '', 
			   			file_name: icon.file_name,
			   			icon_group: icon.icon_group,
			   			hex_code: icon.hex_code,
			   		};

			   		return data;
			   	},
			   	removeAnnotation: function(ann_index) {
			   		// FIND ALL GROUPS ADDED TO LAYER
			   		var markers = vm.utils.drawing.layer.find('Image');

			   		var i = 0;
			   		var len = markers.length;

			   		while(i < len) {

			   			// FIND THE CORRESPONDING IMAGE NODE FOR ANNOTATION
			   			if( markers[i]._id == vm.utils.media_record.annotations[ann_index].node_id ) {
			   				
			   				// REMOVE NODE FROM TRANSFORMER
			   				var nodes = vm.utils.drawing.transformer.nodes().slice();
			   				nodes.splice( nodes.indexOf(markers[i]), 1 );
			   				vm.utils.drawing.transformer.nodes(nodes);

			   				// DESTROY AND REMOVE
			   				markers[i].destroy();
			   			} 

			   			i++;
			   		}

			   		// REMOVE FROM ANNOTATIONS ARRAY
			   		if( vm.utils.media_record.annotations.hasOwnProperty(ann_index) ) {
			   			vm.utils.media_record.annotations.splice(ann_index, 1);
			   		}
			   	},
			   	formatAnnotations: function() {

			   		// DESELECT ALL IMAGE NODES
			   		vm.utils.drawing.transformer.nodes([]);

			   		vm.utils.drawing.setAnnotationNodesNotEditable();

			   		// SET X-Y COORDS ON ANNOTATIONS
			   	},
			   	setAnnotationNodesNotEditable: function() {
			   		var i = 0;
			   		var len = vm.utils.media_record.annotations.length;

			   		while(i < len) {

			   			vm.utils.media_record.annotations[i].node_editable = false;

			   			i++;
			   		}
			   	},
			   	marker_limit: 5,
			   	annotation_icons: drawingPadFactory.utils.markers,
			   	annotation_icon_groups: [],
			   	active_icon_group: null,
			   	annotation_hex_codes: [],
			   	active_hex_code: null,
			   	initAnnotationIconGroups: function() {

			   		setTimeout(function() {

			   			var data = drawingPadFactory.utils.icon_groups;

				   		var i = 0;
				   		var len = data.length;

				   		while(i < len) {

				   			var html = '<img src="../images/markers/'+ data[i].example_icon +'" style="width: 50px;" />&nbsp;&nbsp;&nbsp;' + data[i].name;

				   			data[i].html = $sce.trustAsHtml(html);

				   			i++;
				   		}

				   		vm.utils.drawing.annotation_icon_groups = data;
				   		vm.utils.drawing.active_icon_group = vm.utils.drawing.annotation_icon_groups[0];

			   		}, 0);

			   	}(),
			   	initAnnotationHexCodes: function() {

			   		setTimeout(function() {

			   			var codes = drawingPadFactory.utils.marker_hex_codes;

				   		var i = 0;
				   		var len = codes.length;

				   		while(i < len) {

				   			var data = {
				   				hex_code: codes[i],
				   				html: null
				   			}

				   			var html = '<div style="width: 25px; height: 25px; border-radius: 360px; background-color: #'+ data.hex_code +';"></div>';
				   			// var html = '<div style="width: 25px; height: 25px; border-radius: 360px; background-color: #cccccc;"></div>';

				   			data.html = $sce.trustAsHtml(html);

				   			vm.utils.drawing.annotation_hex_codes.push(data);

				   			i++;
				   		}

				   		vm.utils.drawing.active_hex_code = null;

			   		}, 0);

			   	}(),
			   	calcNextAnnotationIcon: function() {
			   		var next_icon = null;

			   		// FIND ICONS FOR ACTIVE GROUP
			   		var active_group_icons = {};
			   		var icon_index = 0;
			   		var icons_length = vm.utils.drawing.annotation_icons.length;
			   		while(icon_index < icons_length) {

			   			if( vm.utils.drawing.annotation_icons[icon_index].icon_group == vm.utils.drawing.active_icon_group.name ) {
			   				// active_group_icons.push(vm.utils.drawing.annotation_icons[icon_index]);

			   				// SET HEX CODE AS KEY
			   				active_group_icons[ vm.utils.drawing.annotation_icons[icon_index].hex_code ] = vm.utils.drawing.annotation_icons[icon_index];
			   			} 

			   			icon_index++;
			   		}

			   		// IF NO ANNOTATIONS
			   		if( !vm.utils.media_record.annotations.length ) {
			   			// IF NO ACTIVE COLOUR, USE FIRST ICON OF ACTIVE ICON GROUP
			   			if( !vm.utils.drawing.active_hex_code ) {
			   				next_icon = active_group_icons[ Object.keys(active_group_icons)[0] ];
			   				return next_icon;
			   			}

			   			// SET NEXT ICON AS ACTIVE COLOUR
			   			next_icon = active_group_icons[vm.utils.drawing.active_hex_code];
			   			return next_icon;
			   		}

			   		var used_hexs = [];
			   		var i = 0;
			   		var len = vm.utils.media_record.annotations.length;
			   		// FIND ALREADY USED ICONS
			   		while(i < len) {

			   			used_hexs.push(vm.utils.media_record.annotations[i].hex_code);

			   			i++;
			   		}

			   		// IF ACTIVE HEX CODE
			   		if( vm.utils.drawing.active_hex_code ) {

			   			// CHECK IF USED ALREADY
			   			if( used_hexs.indexOf(vm.utils.drawing.active_hex_code) !== -1 && vm.utils.directive_id == 'procedureDrawingPad' ) {
			   				alert("This colour has already been used, please select another");
			   				return false;
			   			}

			   			next_icon = active_group_icons[vm.utils.drawing.active_hex_code];

			   			return next_icon;
			   		}

			   		// IF THERE IS NO ACTIVE HEX CODE
			   		var i2 = 0;
			   		var len2 = Object.keys(active_group_icons).length;
			   		// WORK OUT WHICH IS THE NEXT ICON HEX NOT YET USED
			   		while(i2 < len2) {

			   			// IF NEXT ICON NOT YET SET AND ICON HEX NOT YET USED
			   			if( !next_icon && used_hexs.indexOf(active_group_icons[ Object.keys(active_group_icons)[i2] ].hex_code) === -1 ) {
			   				next_icon = active_group_icons[ Object.keys(active_group_icons)[i2] ];
			   			}

			   			i2++;
			   		}

			   		return next_icon;
			   	},
			   	clearActiveHexCode: function() {
			   		vm.utils.drawing.active_hex_code = null;
			   	}
			},
			cropping: {
				stage: null,
				layer: null,
				image_loading: false,
				mode: 'paint',
				last_center: null, 
				last_dist: 0,
				zoomed: false,
				orig_stage_state: {
					x: null, 
					y: null, 
					scale_x: null, 
					scale_y: null
				},
				changeMode: function(mode) {
					vm.utils.cropping.mode = mode;
				},
				getMediaRecord: function(media_id){
					var defer = $q.defer();

					console.log("Getting Media Record ID: " + media_id);

					riskmachDatabasesFactory.databases.collection.media.get(media_id).then(function(media_record){
							
						if( !media_record.hasOwnProperty('annotations') || !media_record.annotations ) {
							media_record.annotations = [];
						}

						vm.utils.media_record = media_record;

						console.log("FETCHED MEDIA RECORD");
						console.log(vm.utils.media_record);

						//GET ATTACHMENT URL
						vm.utils.cropping.attachmentUrl(media_record._id, media_record.attachment_key).then(function(bg_url){
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

					if( vm.utils.cropping.stage )
					{
						// THIS DESTROYS ALL CHILDREN AS WELL
						vm.utils.cropping.stage.destroy();
					}

					if( vm.utils.cropping.layer )
					{
						vm.utils.cropping.layer.destroy();
					}

					if( vm.utils.cropping.bgImg ) {
						vm.utils.cropping.bgImg.destroy();
					}

					vm.utils.cropping.stage = null;
					vm.utils.cropping.layer = null;
					vm.utils.cropping.bgImg = null;
				},
				init: function(media_id){

					vm.utils.image_loading = true;

					vm.utils.tabs.changeTab('annotation_list');

					vm.utils.media_id = media_id;
					
					// $(document).ready(function(){

					// 	setTimeout(function(){

							//GET MEDIA RECORD
							vm.utils.cropping.getMediaRecord(vm.utils.media_id).then(function(bg_url){

								//INITIALISE CANVAS ETC
								if(bg_url)
								{
									vm.utils.cropping.getImageMeta(bg_url).then(function(bg_img){
										vm.utils.image_loading = false;
										vm.utils.cropping.initStage( bg_img );
									});
								}
								else
								{
									vm.utils.image_loading = false;
									vm.utils.cropping.initStage();
								}

							}, function(error){
								alert(error);
								vm.utils.image_loading = false;
								vm.utils.cropping.initStage();
							});

							// $scope.$apply();

					// 	}, 0);

					// });

				},
				initStage: function(bg_img){

					Konva.hitOnDragEnabled = true;

					// INIT MODE TO PAINTING
					vm.utils.cropping.mode = 'paint';

					//GET THE DEFAULT CANVAS DIMENSIONS / SIZE OF WINDOW
					var width = drawingPadFactory.max_width;
					var height = drawingPadFactory.max_height;

					var crop_width = null; 
					var crop_height = null;

					// console.log("WIDTH: " + width);
					// console.log("HEIGHT: " + height);

					if( bg_img )
					{
						var img_width = bg_img.width;
						var img_height = bg_img.height;

						var ratio = vm.utils.cropping.calcScaledRatio(width, height, img_width, img_height);
						width = img_width * ratio;
						height = img_height * ratio;

						// PORTRAIT
						if( height > width ) {
							crop_width = width;
							crop_height = width;
						}

						// LANDSCAPE
						if( width > height ) {
							crop_width = height;
							crop_height = height;
						}
					}

					console.log("WIDTH: " + width);
					console.log("HEIGHT: " + height);

					//RE SIZE THE CANVAS TO FIT SCALED IMAGE
					if( crop_width && crop_height ) {
						// IF CROP VALUES SET
						$("#DrawingPadContainer").width(crop_width);
						$("#DrawingPadContainer").height(crop_height);
					} else {
						$("#DrawingPadContainer").width(width);
						$("#DrawingPadContainer").height(height);
					}

					var stage = new Konva.Stage({
						container: 'DrawingPadContainer'
					});

					if( crop_width && crop_height ) {
						stage.width(crop_width);
						stage.height(crop_height);
					} else {
						stage.width(width);
						stage.height(height);
					}

					vm.utils.cropping.stage = stage;

					//CREATE THE LAYER
					vm.utils.cropping.layer = new Konva.Layer();
					vm.utils.cropping.stage.add(vm.utils.cropping.layer);

					vm.utils.cropping.orig_stage_state.x = vm.utils.cropping.stage.x();
					vm.utils.cropping.orig_stage_state.y = vm.utils.cropping.stage.y();
					vm.utils.cropping.orig_stage_state.scale_x = vm.utils.cropping.stage.scaleX();
					vm.utils.cropping.orig_stage_state.scale_y = vm.utils.cropping.stage.scaleY();
					vm.utils.cropping.orig_stage_state.position = vm.utils.cropping.stage.position();

					//CREATE THE BACKGROUND IF THERE IS ONE
					if( bg_img )
					{
						//LOAD THE BACKGROUND IMAGE
						vm.utils.cropping.bgImg = new Konva.Image({
							image: bg_img,
							x: vm.utils.cropping.calcBgImgX(width, height),
							y: vm.utils.cropping.calcBgImgY(width, height),
							width: width,
							height: height,
							draggable: true,
							rotation: 0,
							name: 'background'
						});

						vm.utils.cropping.layer.add(vm.utils.cropping.bgImg);
						vm.utils.cropping.layer.draw();
					}

					vm.utils.cropping.initDrawing();
				},
				initDrawing: function(){
					var lastPointerPosition;

					// will it be better to listen move/end events on the window?
					vm.utils.cropping.stage.on('mouseup touchend', function () {
						vm.utils.cropping.last_dist = 0;
						vm.utils.cropping.last_center = null;
						// vm.utils.cropping.bgImg.draggable(true);
					});

					// and core function - drawing
					vm.utils.cropping.stage.on('mousemove touchmove', function(e){

        				var touch1 = null;
        				var touch2 = null;

        				// IF ON MOBILE, TOUCHES WILL BE DEFINED
        				if( angular.isDefined(e.evt.touches) ) {
        					touch1 = e.evt.touches[0];
        					touch2 = e.evt.touches[1];
        				}

        				var shift_key = e.evt.shiftKey;

        				if( touch1 && touch2 ) {

        					// vm.utils.cropping.bgImg.draggable(false);

        					// STAGE ZOOMED
        					vm.utils.cropping.zoomed = true;
        					$scope.$apply();

        					if (vm.utils.cropping.stage.isDragging()) {
					            vm.utils.cropping.stage.stopDrag();
					        }

					        var p1 = {
					            x: touch1.clientX,
					            y: touch1.clientY,
					        };
					          
					        var p2 = {
					            x: touch2.clientX,
					            y: touch2.clientY,
					        };
					        // var p2 = {
					        // 	x: 125,
					        // 	y: 385
					        // }

					        if (!vm.utils.cropping.last_center) {
					        	vm.utils.cropping.last_center = vm.utils.cropping.getCenter(p1, p2);
					            return;
					        }
					          
					        var newCenter = vm.utils.cropping.getCenter(p1, p2);

					        var dist = vm.utils.cropping.getDistance(p1, p2);

					        if (!vm.utils.cropping.last_dist) {
					        	vm.utils.cropping.last_dist = dist;
					        }

					        // local coordinates of center point
					        var pointTo = {
					            x: (newCenter.x - vm.utils.cropping.stage.x()) / vm.utils.cropping.stage.scaleX(),
					            y: (newCenter.y - vm.utils.cropping.stage.y()) / vm.utils.cropping.stage.scaleX(),
					        };

					        var scale = vm.utils.cropping.stage.scaleX() * (dist / vm.utils.cropping.last_dist);

					        vm.utils.cropping.stage.scaleX(scale);
					        vm.utils.cropping.stage.scaleY(scale);

					        // calculate new position of the stage
					        var dx = newCenter.x - vm.utils.cropping.last_center.x;
					       	var dy = newCenter.y - vm.utils.cropping.last_center.y;

					        var newPos = {
					            x: newCenter.x - pointTo.x * scale + dx,
					            y: newCenter.y - pointTo.y * scale + dy,
					        };

					        vm.utils.cropping.stage.position(newPos);

					    	vm.utils.cropping.last_dist = dist;
					   		vm.utils.cropping.last_center = newCenter;

        					return;
        				}

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
					var url = vm.utils.cropping.stage.toDataURL({ pixelRatio: 1 });
          			return url;
				},
				calcBgImgX: function(width, height) {
					var x = 0;

					if( width > height ) {
						x = (height - width) / 2;
					}

					return x;
				},
				calcBgImgY: function(width, height) {
					var y = 0;

					if( height > width ) {
						y = (width - height) / 2;
					}

					return y;
				},
				reset: function(){
					//DESTROY STAGE
					// if( vm.utils.cropping.stage )
					// {
					// 	vm.utils.cropping.stage.destroy();
					// }

					vm.utils.cropping.cleanup();
					vm.utils.cropping.init(drawingPadFactory.media_id);
				},
				resetZoom: function() {
					vm.utils.cropping.stage.x(vm.utils.cropping.orig_stage_state.x);
					vm.utils.cropping.stage.y(vm.utils.cropping.orig_stage_state.y);

					vm.utils.cropping.stage.scaleX(vm.utils.cropping.orig_stage_state.scale_x);
					vm.utils.cropping.stage.scaleY(vm.utils.cropping.orig_stage_state.scale_y);

					vm.utils.cropping.stage.position(vm.utils.cropping.orig_stage_state.position);

					vm.utils.cropping.zoomed = false;
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

					// if( vm.utils.cropping.zoomed ) {
					// 	vm.utils.cropping.resetZoom();
					// }

					var img_url = vm.utils.cropping.stage.toDataURL();
					// console.log("IMAGE URL");
					// console.log(img_url);

					var file = vm.utils.cropping.dataURLtoFile(img_url, vm.utils.media_record.attachment_key);

					console.log("CONVERTED FILE");
					console.log(file);

					// console.log("BLOB TO SAVE");
					// console.log(blob);

					// var file = new File([blob], vm.utils.media_record.attachment_key);

					vm.utils.cropping.is_saving = true;

					drawingPadFactory.saveFile(vm.utils.media_record, file).then(function(media_record){

						vm.utils.media_id = media_record._id;
						vm.utils.media_record = media_record;

						vm.utils.cropping.is_saving = false;

						var params = {
							directive_id: drawingPadFactory.directive_id,
							media_record: media_record
						};

						// IF INITIAL CROP, CLOSE DRAWING PAD
						if( vm.utils.initial_crop ) {
							$rootScope.$broadcast("drawingPad::saved", params);
						} else {
							vm.utils.cropping.cleanup();
							vm.utils.drawing.changeMode('paint');
							vm.utils.drawing.init(drawingPadFactory.media_id);
							$rootScope.$broadcast("drawingPad::cropped", params);
						}

					}, function(error){
						vm.utils.cropping.is_saving = false;
						alert(error);
					});
				},
				download: function(){
					var name = 'drawingPadDownload';
					var uri = vm.utils.cropping.downloadFileUrl();

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
			    returnToAnnotation: function() {
			    	vm.utils.cropping.cleanup();
			    	vm.utils.drawing.changeMode('paint');
			    	vm.utils.drawing.init(drawingPadFactory.media_id);
			    }
			},
			annotation_form: {
				record: null, 
				record_index: null,
				start: function(record, index) {
					vm.utils.annotation_form.record = record;
					vm.utils.annotation_form.record_index = index;
					vm.utils.tabs.changeTab('annotation_form');
				},
				save: function() {
					if( vm.utils.annotation_form.record.description.length > 20 ) {
						alert("Short label must be 20 characters or less");
						return;
					}

					vm.utils.tabs.changeTab('annotation_list');
				}, 
				cancel: function() {
					vm.utils.tabs.changeTab('annotation_list');
				}
			}
		};

		// $scope.$watch(function(){
		// 	return drawingPadFactory.directive_id;
		// }, function(newVal, oldVal){
		// 	vm.utils.directive_id = drawingPadFactory.directive_id;
		// 	// vm.utils.drawing.init('http://localhost/RMAngular/images/FeatureSlide/x.jpg');
		// });


		$scope.$watch("vm.directiveid", function(newVal, oldVal) {
			vm.utils.directive_id = vm.directiveid;
		});

		$scope.$watchCollection("vm.options", function(newVal, oldVal) {
			// EJ-CHANGE (options passed into drawing pad)
			vm.utils.options = vm.options;

			console.log("DRAWING PAD OPTIONS");
			console.log(vm.utils.options);
		});

		// $scope.$watch(function(){
		// 	return drawingPadFactory.image_path;
		// }, function(newVal, oldVal){

			
		// });

		$scope.$watch(function() {
			return drawingPadFactory.initial_crop;
		}, function(newVal, oldVal) {
			vm.utils.initial_crop = drawingPadFactory.initial_crop;
		});

		$scope.$on("drawingPad::newDrawing", function(event, data){

			console.log(vm.utils.directive_id);
			console.log(data.directive_id);

			if( vm.utils.directive_id != data.directive_id ) {
				return;
			}

			console.log("DRAWING PAD: " + vm.utils.directive_id);
			console.log("DRAWING MEDIA ID: " + drawingPadFactory.media_id);

			if( drawingPadFactory.media_id == -1 )
			{
				return;
			}

			//RESET POPOVER POSITION
			$rootScope.$broadcast("draggable::reset");

			vm.utils.hidden = false;
			vm.utils.minimised = false;

			console.log("INIT DRAWING PAD MEDIA ID: " + drawingPadFactory.media_id);

			// if( vm.utils.drawing.stage )
			// {
			// 	vm.utils.drawing.stage.destroy(); //CHECK THIS
			// }

			// MAKE SURE BOTH ARE RESET
			vm.utils.drawing.cleanup();
			vm.utils.cropping.cleanup();

			if( !drawingPadFactory.initial_crop ) {
				vm.utils.drawing.init(drawingPadFactory.media_id);
			} else {
				vm.utils.drawing.mode = 'crop';
				vm.utils.cropping.init(drawingPadFactory.media_id);
			}

		});

		$scope.$on("drawingPad::hide", function(){

			vm.utils.drawing.cleanup();
			vm.utils.cropping.cleanup();

			// if( vm.utils.drawing.stage )
			// {
			// 	vm.utils.drawing.stage.destroy();
			// }

			// CLEAN UP FACTORY VALUES
			drawingPadFactory.new_media_record = null;

			vm.utils.hidden = true;
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
				// vm.utils.drawing.stage.destroy();
				vm.utils.drawing.cleanup();

				// CLEAN UP FACTORY VALUES
				drawingPadFactory.new_media_record = null;
			}
		}

		vm.show = function()
		{
			vm.utils.hidden = false;
		}

		vm.hide = function()
		{
			vm.utils.hidden = true;
			// vm.utils.drawing.stage.destroy();
			vm.utils.drawing.cleanup();
			vm.utils.cropping.cleanup();
			// $rootScope.$broadcast("videoPlayer::pause");

			// CLEAN UP FACTORY VALUES
			drawingPadFactory.new_media_record = null;
		}
	}

	function drawingPadFactory($rootScope, $q, $http, riskmachDatabasesFactory, authFactory, rmUtilsFactory)
	{
		var factory = {};

		factory.media_id = null;
		factory.new_media_record = null;
		factory.directive_id = null;
		factory.image_path = -1;
		factory.meta_data = null;

		factory.max_width = window.innerWidth;
		factory.max_height = window.innerHeight - 150;

		factory.initial_crop = false;

		factory.utils = {
			icon_groups: [{
				name: 'dot',
				example_icon: 'dot-cccccc.png'
			},
			// {
			// 	name: 'pin-solid',
			// 	example_icon: 'pin-solid-cccccc.png'
			// },
			{
				name: 'arrow',
				example_icon: 'arrow-cccccc.png'
			},
			{
				name: 'ring',
				example_icon: 'ring-cccccc.png'
			},
			// {
			// 	name: 'pin-hollow',
			// 	example_icon: 'pin-hollow-cccccc.png'
			// },
			{
				name: 'dot-thin',
				example_icon: 'dot-thin-cccccc.png'
			}],
			marker_hex_codes: [
				'99d6b5', 
				'fce19f',
				'99d8f2',
				'e7b8b8',
				'c7acef',
				'69839e',
				'9caa4b',
				'e0d50a',
				'71a1af',
				'b24444',
				'cccccc'
			],
			markers: [{	
				file_name: 'dot-99d6b5.png',
				icon_group: 'dot', 
				hex_code: '99d6b5'
			},{
				file_name: 'dot-fce19f.png',
				icon_group: 'dot',
				hex_code: 'fce19f'
			},{
				file_name: 'dot-99d8f2.png',
				icon_group: 'dot',
				hex_code: '99d8f2'
			},{
				file_name: 'dot-e7b8b8.png',
				icon_group: 'dot',
				hex_code: 'e7b8b8'
			},{
				file_name: 'dot-c7acef.png',
				icon_group: 'dot',
				hex_code: 'c7acef'
			},{
				file_name: 'dot-69839e.png',
				icon_group: 'dot',
				hex_code: '69839e'
			},{
				file_name: 'dot-9caa4b.png',
				icon_group: 'dot',
				hex_code: '9caa4b'
			},{
				file_name: 'dot-e0d50a.png',
				icon_group: 'dot',
				hex_code: 'e0d50a'
			},{
				file_name: 'dot-71a1af.png',
				icon_group: 'dot',
				hex_code: '71a1af'
			},{
				file_name: 'dot-b24444.png',
				icon_group: 'dot',
				hex_code: 'b24444'
			},{
				file_name: 'dot-cccccc.png',
				icon_group: 'dot',
				hex_code: 'cccccc'
			},{	
				file_name: 'pin-solid-99d6b5.png',
				icon_group: 'pin-solid', 
				hex_code: '99d6b5'
			},{
				file_name: 'pin-solid-fce19f.png',
				icon_group: 'pin-solid',
				hex_code: 'fce19f'
			},{
				file_name: 'pin-solid-99d8f2.png',
				icon_group: 'pin-solid',
				hex_code: '99d8f2'
			},{
				file_name: 'pin-solid-e7b8b8.png',
				icon_group: 'pin-solid',
				hex_code: 'e7b8b8'
			},{
				file_name: 'pin-solid-c7acef.png',
				icon_group: 'pin-solid',
				hex_code: 'c7acef'
			},{
				file_name: 'pin-solid-69839e.png',
				icon_group: 'pin-solid',
				hex_code: '69839e'
			},{
				file_name: 'pin-solid-9caa4b.png',
				icon_group: 'pin-solid',
				hex_code: '9caa4b'
			},{
				file_name: 'pin-solid-e0d50a.png',
				icon_group: 'pin-solid',
				hex_code: 'e0d50a'
			},{
				file_name: 'pin-solid-71a1af.png',
				icon_group: 'pin-solid',
				hex_code: '71a1af'
			},{
				file_name: 'pin-solid-b24444.png',
				icon_group: 'pin-solid',
				hex_code: 'b24444'
			},{
				file_name: 'pin-solid-cccccc.png',
				icon_group: 'pin-solid',
				hex_code: 'cccccc'
			},{	
				file_name: 'arrow-99d6b5.png',
				icon_group: 'arrow', 
				hex_code: '99d6b5'
			},{
				file_name: 'arrow-fce19f.png',
				icon_group: 'arrow',
				hex_code: 'fce19f'
			},{
				file_name: 'arrow-99d8f2.png',
				icon_group: 'arrow',
				hex_code: '99d8f2'
			},{
				file_name: 'arrow-e7b8b8.png',
				icon_group: 'arrow',
				hex_code: 'e7b8b8'
			},{
				file_name: 'arrow-c7acef.png',
				icon_group: 'arrow',
				hex_code: 'c7acef'
			},{
				file_name: 'arrow-69839e.png',
				icon_group: 'arrow',
				hex_code: '69839e'
			},{
				file_name: 'arrow-9caa4b.png',
				icon_group: 'arrow',
				hex_code: '9caa4b'
			},{
				file_name: 'arrow-e0d50a.png',
				icon_group: 'arrow',
				hex_code: 'e0d50a'
			},{
				file_name: 'arrow-71a1af.png',
				icon_group: 'arrow',
				hex_code: '71a1af'
			},{
				file_name: 'arrow-b24444.png',
				icon_group: 'arrow',
				hex_code: 'b24444'
			},{
				file_name: 'arrow-cccccc.png',
				icon_group: 'arrow',
				hex_code: 'cccccc'
			},{	
				file_name: 'ring-99d6b5.png',
				icon_group: 'ring', 
				hex_code: '99d6b5'
			},{
				file_name: 'ring-fce19f.png',
				icon_group: 'ring',
				hex_code: 'fce19f'
			},{
				file_name: 'ring-99d8f2.png',
				icon_group: 'ring',
				hex_code: '99d8f2'
			},{
				file_name: 'ring-e7b8b8.png',
				icon_group: 'ring',
				hex_code: 'e7b8b8'
			},{
				file_name: 'ring-c7acef.png',
				icon_group: 'ring',
				hex_code: 'c7acef'
			},{
				file_name: 'ring-69839e.png',
				icon_group: 'ring',
				hex_code: '69839e'
			},{
				file_name: 'ring-9caa4b.png',
				icon_group: 'ring',
				hex_code: '9caa4b'
			},{
				file_name: 'ring-e0d50a.png',
				icon_group: 'ring',
				hex_code: 'e0d50a'
			},{
				file_name: 'ring-71a1af.png',
				icon_group: 'ring',
				hex_code: '71a1af'
			},{
				file_name: 'ring-b24444.png',
				icon_group: 'ring',
				hex_code: 'b24444'
			},{
				file_name: 'ring-cccccc.png',
				icon_group: 'ring',
				hex_code: 'cccccc'
			},{	
				file_name: 'pin-hollow-99d6b5.png',
				icon_group: 'pin-hollow', 
				hex_code: '99d6b5'
			},{
				file_name: 'pin-hollow-fce19f.png',
				icon_group: 'pin-hollow',
				hex_code: 'fce19f'
			},{
				file_name: 'pin-hollow-99d8f2.png',
				icon_group: 'pin-hollow',
				hex_code: '99d8f2'
			},{
				file_name: 'pin-hollow-e7b8b8.png',
				icon_group: 'pin-hollow',
				hex_code: 'e7b8b8'
			},{
				file_name: 'pin-hollow-c7acef.png',
				icon_group: 'pin-hollow',
				hex_code: 'c7acef'
			},{
				file_name: 'pin-hollow-69839e.png',
				icon_group: 'pin-hollow',
				hex_code: '69839e'
			},{
				file_name: 'pin-hollow-9caa4b.png',
				icon_group: 'pin-hollow',
				hex_code: '9caa4b'
			},{
				file_name: 'pin-hollow-e0d50a.png',
				icon_group: 'pin-hollow',
				hex_code: 'e0d50a'
			},{
				file_name: 'pin-hollow-71a1af.png',
				icon_group: 'pin-hollow',
				hex_code: '71a1af'
			},{
				file_name: 'pin-hollow-b24444.png',
				icon_group: 'pin-hollow',
				hex_code: 'b24444'
			},{
				file_name: 'pin-hollow-cccccc.png',
				icon_group: 'pin-hollow',
				hex_code: 'cccccc'
			},{	
				file_name: 'dot-thin-99d6b5.png',
				icon_group: 'dot-thin', 
				hex_code: '99d6b5'
			},{
				file_name: 'dot-thin-fce19f.png',
				icon_group: 'dot-thin',
				hex_code: 'fce19f'
			},{
				file_name: 'dot-thin-99d8f2.png',
				icon_group: 'dot-thin',
				hex_code: '99d8f2'
			},{
				file_name: 'dot-thin-e7b8b8.png',
				icon_group: 'dot-thin',
				hex_code: 'e7b8b8'
			},{
				file_name: 'dot-thin-c7acef.png',
				icon_group: 'dot-thin',
				hex_code: 'c7acef'
			},{
				file_name: 'dot-thin-69839e.png',
				icon_group: 'dot-thin',
				hex_code: '69839e'
			},{
				file_name: 'dot-thin-9caa4b.png',
				icon_group: 'dot-thin',
				hex_code: '9caa4b'
			},{
				file_name: 'dot-thin-e0d50a.png',
				icon_group: 'dot-thin',
				hex_code: 'e0d50a'
			},{
				file_name: 'dot-thin-71a1af.png',
				icon_group: 'dot-thin',
				hex_code: '71a1af'
			},{
				file_name: 'dot-thin-b24444.png',
				icon_group: 'dot-thin',
				hex_code: 'b24444'
			},{
				file_name: 'dot-thin-cccccc.png',
				icon_group: 'dot-thin',
				hex_code: 'cccccc'
			}]
		}

		factory.newDrawing = function(directive_id, media_id){
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
			factory.initial_crop = false;

			console.log("NEW DRAWING: " + directive_id);

			$rootScope.$broadcast("drawingPad::newDrawing", {directive_id: directive_id});
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

			$rootScope.$broadcast("drawingPad::newDrawing", {directive_id: directive_id});
		}

		// factory.intelliSave = function(uri)
		// {
		// 	var defer = $q.defer();

		// 	var has_save_params = true;
		// 	var saved_internally = false;

		// 	console.log("SAVE META");
		// 	console.log(factory.meta_data);

		// 	if( !factory.meta_data )
		// 	{
		// 		console.log("NOT META 1");
		// 		has_save_params = false;
		// 	}

		// 	if( factory.meta_data != null && !factory.meta_data.hasOwnProperty('record_type') )
		// 	{
		// 		console.log("NOT META 2");
		// 		has_save_params = false;
		// 	}

		// 	if( factory.meta_data != null && !factory.meta_data.hasOwnProperty('record_id') )
		// 	{
		// 		console.log("NOT META 3");
		// 		has_save_params = false;
		// 	}

		// 	if( factory.meta_data != null && factory.meta_data.hasOwnProperty('record_id') && !factory.meta_data.record_id  )
		// 	{
		// 		console.log("NOT META 4");
		// 		has_save_params = false;
		// 	}

		// 	if( factory.meta_data != null && factory.meta_data.hasOwnProperty('record_type') && !factory.meta_data.record_type )
		// 	{
		// 		console.log("NOT META 5");
		// 		has_save_params = false;
		// 	}

		// 	if( !has_save_params )
		// 	{
		// 		console.log("NO META FOR INTERNAL SAVE");
		// 		console.log(uri);
		// 		defer.resolve(uri);
		// 		return defer.promise;
		// 	}

		// 	if( factory.meta_data.record_type == 'risk_image' )
		// 	{
		// 		var saved_internally = true;

		// 		factory.saveDrawingPadRiskImage(factory.meta_data.record_id, uri).then(function(d){

		// 			if( d.error == true )
		// 			{
		// 				defer.reject( d.error_messages[0] );
		// 			}
		// 			else
		// 			{
		// 				defer.resolve();
		// 			}

		// 		}, function(error){
		// 			defer.reject(error);
		// 		});
		// 	}

		// 	//IF NO INTERNAL SAVE METHOD FOUND BROADCAST DATA
		// 	if( !saved_internally )
		// 	{
		// 		console.log("CANT SAVE INTERNALLY");
		// 		console.log(uri);
		// 		defer.resolve(uri);
		// 	}

		// 	return defer.promise;
		// }

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

		factory.hideDrawingPad = function(){
			$rootScope.$broadcast("drawingPad::hide");
		}

		factory.saveDrawingPadRiskImage = function(assessment_id, image_data)
		{
			var defer = $q.defer();

            $http.post('../laravel/public/api/v2/SaveDrawingPadRiskImage',{ 
                params: {
                    image_data: image_data,
                    assessment_id: assessment_id
                }
            })
            .success(function(data, status, headers, config) {
                defer.resolve(data);
            })
            .error(function(data, status, headers, config) {
                defer.reject("Error saving clipboard risk image");
            });

            return defer.promise; 
		}

		return factory;
	}

	function signaturePadFactory($rootScope, $q, $http, riskmachDatabasesFactory, authFactory, rmUtilsFactory)
	{
		var factory = {};

		

		return factory;
	}

	function drawingPad()
	{
		var directive = {};

		directive.scope = {
			directiveid: '=',
			options: '='
		};

		directive.restrict = 'A';
		directive.templateUrl = '../rm-utils/drawing-pad/tpl/drawing_pad_page.html';
		directive.controller = 'drawingPadController';
		directive.controllerAs = 'vm';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

})();