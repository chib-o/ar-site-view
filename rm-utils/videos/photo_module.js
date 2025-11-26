(function(){

	var app = angular.module('riskmachPhotoUtils', ['riskmachUtils','riskmachDatabases']);
	app.controller('takePhotoController', takePhotoController);
	app.factory('takePhotoFactory', takePhotoFactory);
	app.directive('takePhoto', takePhoto);

	function takePhotoController($scope, $rootScope, $q, riskmachDatabasesFactory, authFactory, takePhotoFactory)
	{
		var vm = this;

		vm.utils = {
			directive_id: vm.directiveid,
			minimised: false,
			hidden: true,
			video: null,
			canvas: null,
			devices: null,
			active_device: null,
			photo_taken: false,
			container_width: 615,
			picture_width: 600,
			picture_height: 480,
			canvas_width: null,
			canvas_height: null,
			stream: null,
			flash: false,
			initEls: function(){
				vm.utils.video = document.getElementById(vm.utils.directive_id + '-photo-video');
				vm.utils.canvas = document.getElementById(vm.utils.directive_id + '-photo-canvas');
			},
			calcPictureSize: function(){
				var window_width = window.innerWidth;
				var container_width = 600;
				var picture_width = container_width - 15;

				if( parseInt(window_width) <= parseInt(container_width) )
				{
					container_width = window_width - 20;
					picture_width = container_width - 15;
				}

				picture_height = Math.round(picture_width * 0.8);

				vm.utils.container_width = container_width;
				vm.utils.picture_width = picture_width;
				vm.utils.picture_height = picture_height;

				console.log("WINDOW WIDTH ("+ window_width +")");
				console.log("CONTAINER WIDTH ("+ container_width +")");

				console.log("CALCULATED PICTURE SIZE");
				console.log("W: ("+ vm.utils.picture_width +") H: ("+ vm.utils.picture_height +")");

				$scope.$apply();
			},
			reset: function(){
				vm.utils.photo_taken = false;
			},
			toggleFlash: function(){
				vm.utils.flash = !vm.utils.flash;
				vm.utils.startCamera();
			},
			startCamera: function(mode){

				//IF EXISTING STREAM STOP IT
				if( vm.utils.stream )
				{
					vm.utils.stream.getTracks().forEach(function(track){
						track.stop();
					});
				}

				var constraints = {
					video: {
						facingMode: "environment"
					},
					audio: false
				};

				if( vm.utils.active_device )
				{
					constraints.video = {
						deviceId: vm.utils.active_device ? {exact: vm.utils.active_device} : undefined
					};

					console.log("ACTIVE DEVICE");
					console.log(vm.utils.active_device);
				}

				var stream = navigator.mediaDevices.getUserMedia(constraints).then(function(stream){

					//ADD FLASH CAPABILITY
					if( vm.utils.flash )
					{
						var track = stream.getVideoTracks()[0];

					    //Create image capture object and get camera capabilities
					    var imageCapture = new ImageCapture(track);

					    var photoCapabilities = imageCapture.getPhotoCapabilities().then(function(){

					    	track.applyConstraints({
					            advanced: [{torch: true}]
					        });

					    }).catch(function(error){
					    	track.applyConstraints({});
					    });
					}

				 	vm.utils.stream = stream;
					vm.utils.video.srcObject = vm.utils.stream;

					//SET THE CANVAS SIZE TO VIDEO SIZE
					var picture_width = vm.utils.stream.getVideoTracks()[0].getSettings().width;
					var picture_height = vm.utils.stream.getVideoTracks()[0].getSettings().height;

					//RESIZE THE IMAGE TO FIT THE CANVAS
					var picture_ratio = picture_height / picture_width;
					var resized_width = vm.utils.picture_width;
					var resized_height = vm.utils.picture_width * picture_ratio;

					vm.utils.canvas_width = resized_width;
					vm.utils.canvas_height = resized_height;
					$scope.$apply();

				}).catch(function(error){
					alert(error);
				});
			},
			stopCamera: function(){

				if( !vm.utils.stream )
				{
					return;
				}

				vm.utils.stream.getTracks().forEach(function(track){
					track.stop();
				});

				$scope.$apply();
			},
			clearPhoto: function(){
				vm.utils.photo_taken = false;
			},
			takePhoto: function(){
				vm.utils.canvas.getContext('2d').drawImage(vm.utils.video, 0, 0, vm.utils.canvas_width, vm.utils.canvas_height);
				vm.utils.photo_taken = true;
			},
			savePhoto: function(){
				var image_data_url = vm.utils.canvas.toDataURL('image/jpeg');
			   	// data url of the image
			   	// console.log("IMAGE DATA");
			   	// console.log(image_data_url);

			   	var user_id = authFactory.cloudUserId();
			   	var file_name = user_id + "_" + new Date().getTime() + ".jpg";

			   	// file_name += ".jpg";

			   	var file = vm.utils.dataURLtoFile(image_data_url, file_name);

			   	takePhotoFactory.setPhotoFile(file);

			   	console.log("CREATED FILE");
			   	console.log(file);

			   	$rootScope.$broadcast("takePhoto::photoTaken", { directive_id: vm.utils.directive_id });
			},
			dataURLtoFile(dataurl, filename){
					var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
				    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
				    while(n--){
				        u8arr[n] = bstr.charCodeAt(n);
				    }
				    return new File([u8arr], filename, {type:mime});
				},
			getDevices: function(){
				var defer = $q.defer();

				navigator.mediaDevices.enumerateDevices().then(function(devices){

					var video_devices = [];

					angular.forEach(devices, function(record, index){

						if( record.kind == 'videoinput' )
						{
							video_devices.push( record );
						}

					});

					vm.utils.devices = video_devices;
					console.log(video_devices);
					defer.resolve();

				}).catch(function(error){
					alert("Error getting media devices: " + error.message);
					console.log("GET MEDIA DEVICES ERROR");
					console.log(error);
					defer.reject(error.message);
				});

				return defer.promise;
			},
			checkPermissionGranted: function() {
				var defer = $q.defer();

				var constraints = {
					video: true,
					audio: false
				};

				navigator.mediaDevices.getUserMedia(constraints).then(function(stream){

					// STOP THE STREAM BEFORE OPENING CAMERA
					stream.getTracks().forEach(track => track.stop());

					defer.resolve();

				}).catch(function(error){
					defer.reject("Permission denied: please enable camera permissions to take pictures");
				});

				return defer.promise;
			}
		};

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
				vm.utils.stopCamera();
			}
			else
			{
				vm.utils.startCamera();
			}
		}

		vm.show = function()
		{
			vm.utils.hidden = false;
			vm.utils.startCamera();
		}

		vm.hide = function()
		{
			vm.utils.hidden = true;
			vm.utils.stopCamera();
		}

		$scope.$watch("vm.directiveid", function(newVal, oldVal){
			vm.utils.directive_id = vm.directiveid;
			console.log("RECIEVED DIRECTIVE ID");
			console.log(vm.utils.directive_id);
		});

		$scope.$on("takePhoto::openCamera", function(event, data){

			console.log("OPEN CAMERA");
			console.log(data);
			console.log(vm.utils.directive_id);

			if( data.directive_id != vm.utils.directive_id )
			{
				return;
			}

			vm.utils.checkPermissionGranted().then(function() {

				$rootScope.$broadcast("draggable::reset");

				vm.utils.reset();
				vm.utils.calcPictureSize();
				vm.maximise();
				vm.show();
				vm.utils.startCamera();
					
			}, function(error) {
				alert(error);
			});

		});

		$scope.$on("takePhoto::closeCamera", function(event, data){

			if( data.directive_id != vm.utils.directive_id )
			{
				return;
			}

			vm.hide();
			vm.utils.stopCamera();

		});

		$(document).ready(function(){
			vm.utils.calcPictureSize();
			vm.utils.initEls();
			// vm.utils.startCamera();
			vm.utils.getDevices();
		});

		$( window ).resize(function(){
			vm.utils.calcPictureSize();
		});
	}

	function takePhotoFactory()
	{
		var factory = {};

		factory.photo_file = null;

		factory.setPhotoFile = function(file){
			factory.photo_file = file;
		}

		factory.getPhotoFile = function(){
			return factory.photo_file;
		}

		return factory;
	}

	function takePhoto()
	{
		var directive = {};

		directive.scope = {
			directiveid: '='
		};

		directive.restrict = 'A';
		directive.templateUrl = '../rm-utils/videos/tpl/take_photo.html';
		directive.controller = 'takePhotoController';
		directive.controllerAs = 'vm';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

})();