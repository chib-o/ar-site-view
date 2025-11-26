(function() {

	var app = angular.module('riskmachQrScanner', ['riskmachUtils','riskmachDatabases','riskmachModels']);
	app.controller('qrScannerController', qrScannerController);
	app.factory('qrScannerFactory', qrScannerFactory);
	app.directive('qrScanner', qrScanner);

	function qrScannerController($scope, $q, $rootScope, $timeout, qrScannerFactory)
    {
    	vm = this;

    	vm.utils = {
    		options: vm.options,
    		directive_id: null,
    		scanner: {
    			initialised: false,
    			obj: null,
    			cameras: [],
    			active_camera_id: null,
    			has_flash: false,
    			flash_on: false,
    			inversion_mode: 'original',
    			els: {
    				video: null,
    				videoContainer: null,
    				camHasCamera: null,
    				camList: null,
    				camHasFlash: null,
    				flashToggle: null,
    				flashState: null,
    				camQrResult: null,
    				camQrResultTimestamp: null,
    				fileSelector: null,
    				fileQrResult: null
    			},
    			permissions: {
    				camera: {
    					error: false
    				}
    			},
    			initEls: function(){
    				console.log("START INIT ELS");

    				vm.utils.scanner.els.video = document.getElementById(vm.utils.directive_id + '-qr-video');
				    vm.utils.scanner.els.videoContainer = document.getElementById(vm.utils.directive_id + '-video-container');
				    vm.utils.scanner.els.camHasCamera = document.getElementById(vm.utils.directive_id + '-cam-has-camera');
				    vm.utils.scanner.els.camList = document.getElementById(vm.utils.directive_id + '-cam-list');
				    vm.utils.scanner.els.camHasFlash = document.getElementById(vm.utils.directive_id + '-cam-has-flash');
				    vm.utils.scanner.els.flashToggle = document.getElementById(vm.utils.directive_id + '-flash-toggle');
				    vm.utils.scanner.els.flashState = document.getElementById(vm.utils.directive_id + '-flash-state');
				    vm.utils.scanner.els.camQrResult = document.getElementById(vm.utils.directive_id + '-cam-qr-result');
				    vm.utils.scanner.els.camQrResultTimestamp = document.getElementById(vm.utils.directive_id + '-cam-qr-result-timestamp');
				    vm.utils.scanner.els.fileSelector = document.getElementById(vm.utils.directive_id + '-file-selector');
				    vm.utils.scanner.els.fileQrResult = document.getElementById(vm.utils.directive_id + '-file-qr-result');

				    console.log("END INIT ELS");
			    },
			    setResult: function(label, result){
			    	console.log(result.data);
			        vm.utils.scanner.els.camQrResult.textContent = result.data;
			        vm.utils.scanner.els.camQrResultTimestamp.textContent = new Date().toString();
			        vm.utils.scanner.els.camQrResult.style.color = 'teal';
			        clearTimeout(vm.utils.scanner.els.camQrResult.highlightTimeout);
			        vm.utils.scanner.els.camQrResult.highlightTimeout = setTimeout(() => vm.utils.scanner.els.camQrResult.style.color = 'inherit', 100);
			    },
			    updateFlashAvailability: function(){
			    	vm.utils.scanner.obj.hasFlash().then(function(hasFlash){
			    		vm.utils.scanner.has_flash = hasFlash;
			    		console.log("Has flash: " + hasFlash);
			    	});
			    },
			    getCameras: function(){

			    	QrScanner.listCameras(true).then(function(cameras){

			        	vm.utils.scanner.cameras = cameras;
			        	console.log("Found camera list");
			        	console.log(vm.utils.scanner.cameras);

			        	$scope.$apply();

			        	// cameras.forEach(camera => {
				        //     const option = document.createElement('option');
				        //     option.value = camera.id;
				        //     option.text = camera.label;
				        //     vm.utils.scanner.els.camList.add(option);
				        // });

			        });
			    },
			    start: function(){

			    	vm.utils.scanner.obj.start().then(function(){

	        			vm.utils.scanner.updateFlashAvailability();
	        			vm.utils.scanner.getFlashState();
				        // List cameras after the scanner started to avoid listCamera's stream and the scanner's stream being requested
				        // at the same time which can result in listCamera's unconstrained stream also being offered to the scanner.
				        // Note that we can also start the scanner after listCameras, we just have it this way around in the demo to
				        // start the scanner earlier.
				        vm.utils.scanner.getCameras();
	        		});

			    },
			    stop: function(){
			    	vm.utils.scanner.obj.stop();	
			    },
			    changeCamera: function(){
			    	vm.utils.scanner.obj.setCamera(vm.utils.scanner.active_camera_id).then(vm.utils.scanner.updateFlashAvailability());
			    },
			    setInversionMode: function(){
			    	console.log("UPDATED INVERSION MODE: " + vm.utils.scanner.inversion_mode);
			    	vm.utils.scanner.obj.setInversionMode(vm.utils.scanner.inversion_mode);
			    },
			    toggleFlash: function(){
			    	vm.utils.scanner.obj.toggleFlash().then(function(){
			    		vm.utils.scanner.getFlashState();
			    	}).catch(function(error){
			    		alert(error);
			    	});
			    },
			    getFlashState: function(){
			    	vm.utils.scanner.flash_on = vm.utils.scanner.obj.isFlashOn();
			    },
			    processScan: function(result){
		    	 	qrScannerFactory.utils.getQrData(result.data, vm.utils.options).then(function(qr_data){
			        	console.log("QR Code Result");
			        	console.log(JSON.stringify(qr_data, null, 2));

			        	$rootScope.$broadcast("rmQrScanner::scanned", { directive_id: vm.utils.directive_id, qr_data: qr_data });

			        	//DONT START SCANNER FOR ANOTHER X SECONDS TO PREVENT INSTANT RE-SCAN
			        	setTimeout(function(){
			        		vm.utils.scanner.obj.start();
			        		$scope.$apply();
			        	}, 2000);

			        }, function(error){
			        	$rootScope.$broadcast("rmQrScanner::scanError", { directive_id: vm.utils.directive_id, error: error });
			        	alert(error);
			        	
			        	//DONT START SCANNER FOR ANOTHER X SECONDS TO PREVENT INSTANT RE-SCAN
			        	setTimeout(function(){
			        		vm.utils.scanner.obj.start();
			        		$scope.$apply();
			        	}, 2000);
			        });
			    },
			    initScanner: function(){

		    		vm.utils.scanner.initEls();

		    		vm.utils.scanner.initialised = true;

			    	vm.utils.scanner.obj = new QrScanner(vm.utils.scanner.els.video, function(result){

			    		console.log(result.data);
				        //STOP SCANNING UNTIL CURRENT SCAN PROCESSED
				        vm.utils.scanner.obj.stop();
				      	vm.utils.scanner.processScan(result);
			    	},{
			    		onDecodeError: function(error){
				    		// console.log("Scan Error");
				    		// console.log(error);
				    		// vm.utils.scanner.els.camQrResult.textContent = error;
					     //    vm.utils.scanner.els.camQrResult.style.color = 'inherit';
			    		},
					    highlightScanRegion: true,
			        	highlightCodeOutline: true,
			        	willReadFrequently: true,
			        	preferredCamera: 'environment' // CAMERA ON BACK OF DEVICE
	        		});
	        		
				    // vm.utils.scanner.start();

				    // ####### File Scanning #######

				    vm.utils.scanner.els.fileSelector.addEventListener('change', event => {
				        var file = vm.utils.scanner.els.fileSelector.files[0];
				        
				        if (!file) {
				            return;
				        }

				        QrScanner.scanImage(file, { returnDetailedScanResult: true })
			            .then(function(result){
			            	console.log("File Result");
			            	console.log(result);
			            	vm.utils.scanner.processScan(result);

			            	// vm.utils.scanner.setResult(result);
			            })
			            .catch(function(e){
			            	vm.utils.scanner.setResult({ data: e || 'No QR code found.' });
			            });
				    });

			    },
			    destroyScanner: function(){
			    	if( vm.utils.scanner.obj )
			    	{
			    		vm.utils.scanner.obj.destroy();
						vm.utils.scanner.obj = null;
			    	}
			    },
			    checkPermissionGranted: function() {
			    	var defer = $q.defer();

			    	defer.resolve();

					// var constraints = {
					// 	video: true,
					// 	audio: false
					// };

					// navigator.mediaDevices.getUserMedia(constraints).then(function(stream){

					// 	defer.resolve();

					// }).catch(function(error){
					// 	defer.reject("Permission denied: please enable camera permissions to take pictures");
					// });

					return defer.promise;
			    }
    		}
    	};

    	$scope.$on("qrScanner::test", function(event, data) {

    		// console.log("QR SCANNER RECEIVED TEST");
    		// console.log(data);
    		console.log(vm.utils.directive_id);
    		console.log(vm.directive_id);
    		console.log($scope.$id);

    		// if( vm.utils.directive_id == data.directive_id ) {
    		// 	console.log(vm.utils.directive_id);
    		// 	console.log($scope.$id);
    		// 	alert("SUCCESS");
    		// } else {
    		// 	console.log("WRONG DIRECTIVE");
    		// 	console.log($scope.$id);
    		// }

    	});

    	$scope.$on("$destroy", function(){
    		vm.utils.scanner.destroyScanner();
    	});

    	$scope.$on("rmQrScanner::enable", function(event, data){

    		console.log("ATTEMPT START QR SCANNER");
    		console.log(data.directive_id);
    		console.log(vm.utils.directive_id);

    		if( data.directive_id != vm.utils.directive_id ) {
    			console.log("NOT CORRECT DIRECTIVE ID");
    			return;
    		}

    		vm.utils.scanner.permissions.camera.error = false;

    		vm.utils.scanner.checkPermissionGranted().then(function() {

	    		vm.utils.scanner.permissions.camera.error = false;


	    		if( !vm.utils.scanner.obj )
				{
					console.log("NO QR SCANNER OBJECT");
					return;
				}

				console.log("START QR SCANNER");
				vm.utils.scanner.obj.start().then(function() {

					vm.utils.scanner.updateFlashAvailability();
        			vm.utils.scanner.getFlashState();
			        // List cameras after the scanner started to avoid listCamera's stream and the scanner's stream being requested
			        // at the same time which can result in listCamera's unconstrained stream also being offered to the scanner.
			        // Note that we can also start the scanner after listCameras, we just have it this way around in the demo to
			        // start the scanner earlier.
			        vm.utils.scanner.getCameras();

				}, function(error) {
					console.log("CAMERA ERROR: " + error);
					vm.utils.scanner.permissions.camera.error = true;
					$scope.$apply();
				});

	    	}, function(error) {
	    		// IF CAMERA PERMISSION NOT GRANTED
	    		vm.utils.scanner.permissions.camera.error = true;
	    	});

    	});

    	$scope.$on("rmQrScanner::disable", function(event, data){

    		if( data.directive_id != vm.utils.directive_id )
    		{
    			return;
    		}

    		if( !vm.utils.scanner.obj )
    		{
    			return;
    		}

    		console.log("DISABLED QR SCANNER");

    		vm.utils.scanner.obj.stop();

    	});

    	$scope.$on("rmQrScanner::exit", function(event, data){

    		if( data.directive_id != vm.utils.directive_id )
    		{
    			return;
    		}

    		//WRAP IN TIMEOUT TO PREVENT SCOPE ERRORS
    		setTimeout(function(){
    			vm.utils.scanner.destroyScanner();
    			$scope.$destroy();
    		}, 0);
	
    	});

    	$scope.$on("rmQrScanner::reInit", function(event, data) {

    		if( data.directive_id != vm.utils.directive_id )
    		{
    			return;
    		}

    		// ALREADY INITIALISED
    		if( vm.utils.scanner.initialised ) {
    			return;
    		}
    		
    		setTimeout(function() {
    			vm.utils.scanner.initScanner();
    			$scope.$apply();
    		}, 2000);

    	});

    	$scope.$watchCollection('vm.options', function(newVal, oldVal) {
    		vm.utils.options = vm.options;
    	});

    	$scope.$watch('vm.directive_id', function(newVal, oldVal) {
    		// console.log("QR SCANNER DIRECTIVE ID - " + $scope.$id);
    		// console.log(newVal);
    		// console.log(oldVal);
    		// console.log(vm.utils.directive_id + " - " + vm.directive_id); 
    		vm.utils.directive_id = vm.directive_id;
    		// vm.utils.scope_id = $scope.$id;
    		$scope.$apply();
    	});

    	//BEFORE INIT SCANNER GIVE TIME FOR DIRECTIVE TO RENDER WITH DIRECTIVE IDS
    	setTimeout(function(){

    		// DON'T AUTO INIT
    		if( vm.utils.directive_id == 'quickStartAuditQrScanner' ) {
    			console.log("DON'T INIT QR SCANNER");
    			return;
    		}

    		vm.utils.scanner.initScanner();
    		$scope.$apply();
    	}, 100);
    }

    function qrScannerFactory($q, $filter, $http, authFactory, riskmachDatabasesFactory, rmUtilsFactory, modelsFactory) 
	{
		var factory = {};

		factory.utils = {
			getQrData: function(url, options) {
				var defer = $q.defer();

				var qr_data = {
					qr_type: null, 
					data: null
				};

				if( options.hasOwnProperty('skip_rm_check') && options.skip_rm_check ) {
					qr_data.data = {
						url: url, 
						full_code: null, 
						code_id: null
					}

					defer.resolve(qr_data);

					return defer.promise;
				}
 
				var is_rm_qr = factory.utils.checkValidRiskMachQrCode(url);

				if( is_rm_qr == false ) {
					defer.reject("Not a valid RiskMach QR code");
					return defer.promise;
				};

				var qr_type = factory.utils.checkQrType(url);

				qr_data.qr_type = qr_type;

				if( qr_type == 'asset' ) {
					var qr_code_data = factory.utils.extractQrIdAndHashFromUrl(url);

					if( qr_code_data == false ) {
						defer.reject("Not a valid RiskMach QR code");
					} else {
						qr_data.data = qr_code_data;
						defer.resolve(qr_data);
					};
				};

				if( qr_type == 'checklist_blueprint' ) {
					var checklist_data = factory.utils.extractChecklistDataFromQrUrl(url);

					if( checklist_data == false ) {
						defer.reject("Not a valid RiskMach QR code");
					} else {
						qr_data.data = checklist_data;
						defer.resolve(qr_data);
					};
				};

				return defer.promise;
			},
			checkValidRiskMachQrCode: function(url) {
				var parsed_url = factory.utils.parseUrl(url);

				if( parsed_url == null ) {
					console.log("NOT A VALID QR URL");
					return false;
				};

				if( factory.utils.checkQrIsRiskMach(url) == false ) {
					console.log("NOT A VALID RISKMACH QR CODE");
					return false;
				};

				if( factory.utils.qrIsActionable(url) == false ) {
					console.log("RISKMACH QR CODE IS NOT ACTIONABLE");
					return false;
				};

				return true;
			},
			parseUrl: function(url) {
				var parsed = null;
				var uri = new URI(url);

				if( uri.is("name") ) {
					parsed = URI.parse(url);
				};

				return parsed;
			},
			checkQrIsRiskMach: function(url) {
				var uri = new URI(url);
			    var domain = uri.domain();

		        if( domain == 'riskmach.co.uk' ) {
		            return true;
		        } else {
		            return false;
		        }
			},
			qrIsActionable: function(url) {
				var uri = new URI(url);
				var path = uri.pathname();

				if( path == '/router/' || path == '/rm_system/qr_router.php' ) {
					return true;
				} else {
					return false;
				};
			},
			checkQrType: function(url) {
				var parsed_url = factory.utils.parseUrl(url);

				if( parsed_url == null ) {
					console.log("NOT A VALID QR URL");
					return false;
				};

				var qr_type = null;
				var uri = new URI(parsed_url);

				var url_params = uri.search(true);

				if( url_params.hasOwnProperty('qr_type') ) {
					qr_type = url_params.qr_type;
				} else {
					qr_type = 'asset';
				};

				return qr_type;
			}, 
			extractQrIdAndHashFromUrl: function(url) {
				var qrhub_data = factory.utils.getQrCodeIdAndHash(url);
				
				if( qrhub_data == null ) {
					console.log("UNABLE TO OBTAIN QR CODE FROM URL");
					return false;
				};

				if( factory.utils.isInt( qrhub_data.code_id ) == false ) {
					console.log("THE QR CODE IS NOT AN INTEGER");
					return false;
				};

				qrhub_data.code_id = parseInt( qrhub_data.code_id );

				return qrhub_data;
			},
			getQrCodeIdAndHash: function(url) {
				var full_code = null;
				var index_of_slash = null;
				var code_id = null;
				var qr_data = {
					url: url,
					full_code: null,
					code_id: null
				};
				var uri = new URI(url);

				var query_params = uri.search(true);

				if( query_params.hasOwnProperty('code') ) {
					full_code = query_params.code;
				};

				var index_of_slash = full_code.indexOf("/");

				if( index_of_slash == -1 ) {
					// NO HASH AT END OF CODE
					code_id = full_code;
				} else {
					// EXTRACT CODE BEFORE SLASH
					code_id = full_code.slice(0, index_of_slash);
				};

				qr_data.full_code = full_code;
				qr_data.code_id = code_id;

				return qr_data;
			},
			isInt: function(value) {
				return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value))
			},
			extractChecklistDataFromQrUrl: function(url) {
				var checklist_data = null;

				checklist_data = factory.utils.getChecklistIds(url);

				if( checklist_data.checklist_ref == null || checklist_data.checklist_id == null ) {
					return false;
				};

				if( factory.utils.isInt(checklist_data.checklist_ref) == false || factory.utils.isInt(checklist_data.checklist_id) == false ) {
					return false;
				};

				checklist_data.checklist_ref = parseInt( checklist_data.checklist_ref );
				checklist_data.checklist_id = parseInt( checklist_data.checklist_id );

				return checklist_data;
			},
			getChecklistIds: function(url) {
				var checklist_data = {
					checklist_ref: null, 
					checklist_id: null
				};

				var uri = new URI(url);

				var url_params = uri.search(true);

				if( url_params.hasOwnProperty('checklist_ref') ) {
					checklist_data.checklist_ref = url_params.checklist_ref;
				};

				if( url_params.hasOwnProperty('checklist_id') ) {
					checklist_data.checklist_id = url_params.checklist_id;
				};

				return checklist_data;
			},
			checkAuthorised: function(code) {
				var defer = $q.defer();

				factory.dbUtils.getQrRecord(code).then(function(qr_record) {

					var authorised = false;

					// SET COMPANY IDS
					var company_id = authFactory.cloudCompanyId();
					var client_id = authFactory.getActiveCompanyId();

					// IF QR NOT ON DEVICE, AUTHORISED
					if( qr_record == null ) {
						authorised = true;
						defer.resolve(authorised);
						return defer.promise;
					};

					// IF OWNER OF QR MATCHES EITHER COMPANY ID
					if( qr_record.company_id == company_id || qr_record.company_id == client_id ) {
						authorised = true;
					};

					// IF OWNER OF SUBJECT MATCHES EITHER COMPANY ID
					if( qr_record.rm_subject_owner_company_id == company_id || qr_record.rm_subject_owner_company_id == client_id ) {
						authorised = true;
					};

					defer.resolve(authorised);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			qrCanBeAssociated: function(code) {
				var defer = $q.defer();

				var data = {
					can_associate: true,
					error_message: ''
				};

				factory.dbUtils.getQrRecord(code).then(function(qr_record) {

					// qr_record.date_content_imported != null

					// IF QR HAS BEEN USED
					if( qr_record && qr_record.record_id != null ) {
						data.can_associate = false;
						data.error_message = 'This QR has already been used';
						defer.resolve(data);
					} else {
						// NOT USED SO CAN ASSOCIATE
						defer.resolve(data);
					};

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			formatCollectedLocalQrData: function(qr_data) {
				if( !qr_data ) {
					return;
				}

				// FORMAT QR RECORD
				if( qr_data.hasOwnProperty('qr_record') && qr_data.qr_record ) {

					if( qr_data.qr_record.hasOwnProperty('date_created') && qr_data.qr_record.date_created ) {
						qr_data.qr_record.date_created = parseInt(qr_data.qr_record.date_created);

						// IF PHP TIMESTAMP, MULTIPLY BY 1000
						if( factory.utils.getNumberOfDigits(qr_data.qr_record.date_created) == 10 ) {
							qr_data.qr_record.date_created = qr_data.qr_record.date_created * 1000;
						}
					}

					if( qr_data.qr_record.hasOwnProperty('date_exported') && qr_data.qr_record.date_exported ) {
						qr_data.qr_record.date_exported = parseInt(qr_data.qr_record.date_exported);

						// IF PHP TIMESTAMP, MULTIPLY BY 1000
						if( factory.utils.getNumberOfDigits(qr_data.qr_record.date_exported) == 10 ) {
							qr_data.qr_record.date_exported = qr_data.qr_record.date_exported * 1000;
						}
					}

					if( qr_data.qr_record.hasOwnProperty('date_linked') && qr_data.qr_record.date_linked ) {
						qr_data.qr_record.date_linked = parseInt(qr_data.qr_record.date_linked);

						// IF PHP TIMESTAMP, MULTIPLY BY 1000
						if( factory.utils.getNumberOfDigits(qr_data.qr_record.date_linked) == 10 ) {
							qr_data.qr_record.date_linked = qr_data.qr_record.date_linked * 1000;
						}
					}

					if( qr_data.qr_record.hasOwnProperty('date_subject_owner_company_id') && qr_data.qr_record.date_subject_owner_company_id ) {
						qr_data.qr_record.date_subject_owner_company_id = parseInt(qr_data.qr_record.date_subject_owner_company_id);

						// IF PHP TIMESTAMP, MULTIPLY BY 1000
						if( factory.utils.getNumberOfDigits(qr_data.qr_record.date_subject_owner_company_id) == 10 ) {
							qr_data.qr_record.date_subject_owner_company_id = qr_data.qr_record.date_subject_owner_company_id * 1000;
						}
					}

					if( qr_data.qr_record.hasOwnProperty('date_subject_owner_company_id_change') && qr_data.qr_record.date_subject_owner_company_id_change ) {
						qr_data.qr_record.date_subject_owner_company_id_change = parseInt(qr_data.qr_record.date_subject_owner_company_id_change);

						// IF PHP TIMESTAMP, MULTIPLY BY 1000
						if( factory.utils.getNumberOfDigits(qr_data.qr_record.date_subject_owner_company_id_change) == 10 ) {
							qr_data.qr_record.date_subject_owner_company_id_change = qr_data.qr_record.date_subject_owner_company_id_change * 1000;
						}
					}

				}
			},
			getNumberOfDigits: function(number) {
				return number.toString().length;
			}
		};

		factory.dbUtils = {
			getQrRecord: function(code) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.qr_register.find({
					selector: {
						qr_id: code
					},
					// limit: 1
				}).then(function(results){

					console.log("GOT QR REGISTER RECORD");
					console.log(JSON.stringify(results.docs, null, 2));
					console.log("Length: " + results.docs.length);

					if( results.docs.length == 0 ) {
						defer.resolve(null);
					} else {

						if( results.docs.length == 1 ) {
							// RESOLVE THE ONLY RESULT
							defer.resolve(results.docs[0]);
						} else {

							console.log("FORMAT DATES");

							// FORMAT DATES LINKED
							var i = 0;
							var len = results.docs.length;
							while(i < len) {
								if( results.docs[i].hasOwnProperty('date_linked') && results.docs[i].date_linked ) {
									results.docs[i].date_linked = parseInt(results.docs[i].date_linked);
								} else {
									results.docs[i].date_linked = 0;
								}

								i++;
							}

							// ORDER BY LATEST DATE LINKED FIRST
							results.docs = $filter('orderBy')(results.docs, 'date_linked');

							console.log("SUCCESS");
							// console.log(JSON.stringify(new_array, null, 2));

							// RESOLVE LATEST DATE LINKED
							defer.resolve(results.docs[0]);
						}
					};

				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			getQrList: function(record_id, record_type) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.qr_register.find({
					selector: {
						record_id: record_id,
						record_type: record_type
					}
				}).then(function(results){

					console.log("GOT QR CODES");
					console.log(results.docs);

					defer.resolve(results.docs);

				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			saveQrLink: function(qr_data, geo_data) {
				var defer = $q.defer();

				factory.dbUtils.doSaveQrLink(qr_data, geo_data).then(function(saved_qr) {

					if( qr_data.record_type == 'Asset' ) {
						// rmUtilsFactory.sync_decoration.register_assets.markAssetModified(qr_data.record_id).then(function(saved_asset) {
	     //        			defer.resolve(saved_asset);
	     //        		}, function(error) {
	     //        			defer.reject(error);
	     //        		});

						factory.dbUtils.indexQrRecordOnCoreAsset(saved_qr).then(function(saved_asset) {
							defer.resolve(saved_asset);
						}, function(error) {
							defer.reject(error);
						});

					} else {
						defer.resolve(null);
					};					

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			doSaveQrLink: function(qr_data, geo_data) {
				var defer = $q.defer();

				factory.dbUtils.getQrRecord(qr_data.code).then(function(qr_record) {

					if( qr_record == null ) {
						factory.dbUtils.saveNewQrLink(qr_data, geo_data).then(function(saved_qr) {
							defer.resolve(saved_qr);
						}, function(error) {
							defer.reject(error);
						});
					} else {
						factory.dbUtils.updateQrLink(qr_record, qr_data, geo_data).then(function(saved_qr) {
							defer.resolve(saved_qr);
						}, function(error) {
							defer.reject(error);
						});
					};

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			saveNewQrLink: function(qr_data, geo_data) {
				var defer = $q.defer();

				var options = {
					force: true
				};

				var qr_record = modelsFactory.models.newQrRecord(qr_data.code, qr_data.record_id, qr_data.record_type);
				qr_record.rm_record_id = qr_data.rm_record_id;

				qr_record.geo_data = geo_data.coords_data;
				qr_record.geo_error = geo_data.error_message;
				qr_record.geo_date = geo_data.attempt_date;

				riskmachDatabasesFactory.databases.collection.qr_register.post(qr_record, options).then(function(result) {
					qr_record._id = result.id;
					qr_record._rev = result.rev;

					defer.resolve(qr_record);
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}, 
			updateQrLink: function(qr_record, qr_data, geo_data) {
				var defer = $q.defer();

				qr_record.record_id = qr_data.record_id;
				qr_record.record_type = qr_data.record_type;
				qr_record.rm_record_id = qr_data.rm_record_id;
				qr_record.date_linked = new Date().getTime();
				qr_record.linked_by = authFactory.cloudUserId();
				qr_record.user_id = authFactory.cloudUserId();

				qr_record.date_record_synced = null; 
				qr_record.date_content_synced = null;
				qr_record.date_record_imported = null;
				qr_record.date_content_imported = null;

				qr_record.record_modified = 'Yes';

				qr_record.geo_data = geo_data.coords_data;
				qr_record.geo_error = geo_data.error_message;
				qr_record.geo_date = geo_data.attempt_date;

				riskmachDatabasesFactory.databases.collection.qr_register.put(qr_record).then(function(result) {
					qr_record._id = result.id;
					qr_record._rev = result.rev;

					defer.resolve(qr_record);
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			hardDeleteQrLink: function(doc_id, doc_rev, record_id, record_type) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.qr_register.remove(doc_id, doc_rev).then(function(result) {
					
					if( record_type == 'Asset' ) {

						factory.dbUtils.removeIndexedQrFromCoreAsset(record_id, doc_id).then(function(saved_asset) {
							defer.resolve(saved_asset);
						}, function(error) {
							defer.reject(error);
						});

					} else {
						defer.resolve();
					}

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			assets: {
				findAssetRecord: function(qr_code) {
					var defer = $q.defer();

					factory.dbUtils.getQrRecord(qr_code).then(function(qr_record) {

						if( !qr_record ) {
							defer.resolve(null);
							return defer.promise;
						}

						if( qr_record.hasOwnProperty('record_id') && qr_record.record_id ) {
							// ATTEMPT TO FIND THE REGISTER ASSET
							factory.dbUtils.assets.findAssetRecordByAppId(qr_record.record_id, 'register_assets').then(function(register_asset) {

								if( register_asset ) {
									defer.resolve(register_asset);
									return defer.promise;
								}

								// ATTEMPT TO FIND THE SNAPSHOT ASSET
								factory.dbUtils.assets.findAssetRecordByRmId(qr_record.record_id, 'assets').then(function(snapshot_asset) {

									if( snapshot_asset ) {
										defer.resolve(snapshot_asset);
									} else {
										defer.resolve(null);
									}

								}, function(error) {
									defer.reject(error);
								});

							}, function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}

						if( !qr_record.hasOwnProperty('rm_record_id') || !qr_record.rm_record_id ) {
							defer.resolve(null);
							return defer.promise;
						}

						// ATTEMPT TO FIND THE REGISTER ASSET
						factory.dbUtils.assets.findAssetRecordByRmId(parseInt(qr_record.rm_record_id), 'register_assets').then(function(register_asset) {

							if( register_asset ) {
								defer.resolve(register_asset);
								return defer.promise;
							}

							// ATTEMPT TO FIND THE SNAPSHOT ASSET
							factory.dbUtils.assets.findAssetRecordByRmId(parseInt(qr_record.rm_record_id), 'assets').then(function(snapshot_asset) {

								if( snapshot_asset ) {
									defer.resolve(snapshot_asset);
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

					return defer.promise;
				},
				findAssetRecordByRmId: function(rm_id, asset_db) {
					var defer = $q.defer();

					riskmachDatabasesFactory.databases.collection[asset_db].find({
						selector: {
							rm_id: rm_id,
							user_id: authFactory.cloudUserId()
						},
						limit: 1
					}).then(function(result) {

						console.log("QRS ASSET RECORD FROM RM ID");
						console.log(result.docs);
						if( result.docs.length == 0 ) {
							defer.resolve(null);
						} else {
							defer.resolve(result.docs[0]);
						}

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				findAssetRecordByAppId: function(app_id, asset_db) {
					var defer = $q.defer();

					riskmachDatabasesFactory.databases.collection[asset_db].find({
						selector: {
							_id: app_id
						},
						limit: 1
					}).then(function(result) {

						console.log("QRS ASSET RECORD FROM APP ID");
						console.log(result.docs);
						if( result.docs.length == 0 ) {
							defer.resolve(null);
						} else {
							defer.resolve(result.docs[0]);
						}

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			attemptFindCoreAssetInfoFromQr: function(qr_code) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var core_asset_data = {
					record: null,
					ipp_score_relations: [],
					media: []
				}

				// 'media'
				var stages = ['record','ipp_score_relations'];

				fetchNextStage(fetch_defer, 0).then(function() {

					defer.resolve(core_asset_data);

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextStage(defer, active_index) {

					console.log("CORE INFO STAGE: " + active_index);

					if( active_index > stages.length - 1 ) {
						console.log("CORE INFO RESOLVE!");
						defer.resolve();
						return defer.promise;
					}

					if( stages[active_index] == 'record' ) {

						factory.dbUtils.attemptFindCoreAssetFromQr(qr_code).then(function(core_asset) {

							core_asset_data.record = core_asset;

							if( !core_asset_data.record ) {
								defer.resolve();
								return defer.promise;
							}

							active_index++;

							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

					}

					if( stages[active_index] == 'ipp_score_relations' ) {

						factory.dbUtils.findCoreAssetIppScoreRelations(core_asset_data.record._id).then(function(ipp_score_relations) {

							core_asset_data.ipp_score_relations = ipp_score_relations;

							active_index++;

							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

					}

					return defer.promise;
				}

				return defer.promise;
			},
			attemptFindCoreAssetFromQr: function(qr_code) {
				var defer = $q.defer();

				// ATTEMPT FIND QR RECORD
				factory.dbUtils.getQrRecord(qr_code).then(function(qr_record) {

					console.log("RESOLVED QR RECORD");
					console.log(qr_record);

					if( !qr_record ) {
						defer.resolve(null);
						return defer.promise;
					}

					if( !qr_record.hasOwnProperty('record_id') || !qr_record.record_id ) {
						defer.resolve(null);
						return defer.promise;
					}

					var db = riskmachDatabasesFactory.databases.collection.register_assets;

					// USE QR RECORD TO ATTEMPT FIND CORE ASSET
					db.get(qr_record.record_id).then(function(core_asset_doc) {

						defer.resolve(core_asset_doc);

					}).catch(function(error) {

						// COULDN'T FIND THE CORE ASSET RECORD
						defer.resolve(null);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			findCoreAssetIppScoreRelations: function(asset_id) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.register_asset_ipp;

				db.find({
					selector: {
						table: 'register_asset_ipp',
						user_id: authFactory.cloudUserId(),
						company_id: authFactory.getActiveCompanyId(),
						asset_id: asset_id
					}
				}).then(function(results){

					var ipp_scores = results.docs;

					console.log("TOTAL FETCHED IPP SCORES");
					console.log(asset_id);
					console.log(ipp_scores);

					if( ipp_scores.length == 0 ) {
						defer.resolve(ipp_scores);
						return defer.promise;
					}

					var filtered_ipp_scores = [];

					var i = 0;
					var len = ipp_scores.length;

					// FIND LIVE IPP SCORE RELATIONS
					while(i < len) {

						// if( ipp_scores[i].hasOwnProperty('asset_id') && ipp_scores[i].asset_id == asset_id ) {
						// 	filtered_ipp_scores.push(ipp_scores[i]);
						// }

						if( ipp_scores[i].hasOwnProperty('status') && ipp_scores[i].status == 1 ) {
							filtered_ipp_scores.push(ipp_scores[i]);
						}

						i++;
					}

					defer.resolve(filtered_ipp_scores);

				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			findQrCodeRelatedInspections: function(qr_data) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				// PREPARE EXISTING DATA
				var inspections = [];

				var options = {
					limit: 100,
					include_docs: true
				}

				var db = riskmachDatabasesFactory.databases.collection.assets;

				fetchNextPage(fetch_defer).then(function() {

					console.log("COLLECTED RELATED INSPECTIONS");
					console.log(inspections);

					defer.resolve(inspections);
				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) 
				{
					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) 
						{
							var i = 0;
							var len = result.rows.length;
							while(i < len) {
								var errors = 0;
								var matches = 0;

								// ASSET TABLE
								if( !result.rows[i].doc.hasOwnProperty('table') || result.rows[i].doc.table != 'assets' ) {
									errors++;
								}

								// USER ID
								if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								// QR CODE
								if( result.rows[i].doc.hasOwnProperty('qr_code') && result.rows[i].doc.qr_code == qr_data.qr_code ) {
									matches++;
								}

								// RMREGISTER ASSET ID
								if( qr_data.hasOwnProperty('rm_register_asset_id') && qr_data.rm_register_asset_id ) {

									if( result.rows[i].doc.hasOwnProperty('rm_register_asset_id') && result.rows[i].doc.rm_register_asset_id == qr_data.rm_register_asset_id ) {
										matches++;
									} 

								}

								if( !errors && matches > 0 ) {
									inspections.push( result.rows[i].doc );
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
			},
			indexQrRecordOnCoreAsset: function(qr_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.register_assets;

				db.get(qr_record.record_id).then(function(asset_doc) {

					if( !asset_doc.hasOwnProperty('associated_qr_codes') || !asset_doc.associated_qr_codes ) {
						asset_doc.associated_qr_codes = [];
					}

					if( asset_doc.associated_qr_codes.length == 0 ) 
					{
						asset_doc.associated_qr_codes.push(qr_record);
					}
					else
					{
						// ATTEMPT FIND EXISTING QR IN ARRAY
						var i = 0;
						var len = asset_doc.associated_qr_codes.length;
						var qr_index = null;
						while(i < len) {
							if( asset_doc.associated_qr_codes[i]._id == qr_record._id ) {
								qr_index = i;
							}

							i++;
						}

						// IF QR FOUND, UPDATE ELSE ADD NEW TO ARRAY
						if( qr_index != null ) {
							asset_doc.associated_qr_codes[qr_index] = qr_record;
						} else {
							asset_doc.associated_qr_codes.push(qr_record);
						}
					}

					// MARK ASSET MODIFIED
					asset_doc = rmUtilsFactory.sync_decoration.register_assets.assetModified(asset_doc);

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
			removeIndexedQrFromCoreAsset: function(record_id, qr_record_id) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.register_assets;

				db.get(record_id).then(function(asset_doc) {

					if( !asset_doc.hasOwnProperty('associated_qr_codes') || !asset_doc.associated_qr_codes ) {
						asset_doc.associated_qr_codes = [];
					}
					
					if( asset_doc.associated_qr_codes.length > 0 ) {
						// ATTEMPT FIND EXISTING QR IN ARRAY
						var i = 0;
						var len = asset_doc.associated_qr_codes.length;
						var qr_index = null;
						while(i < len) {
							if( asset_doc.associated_qr_codes[i]._id == qr_record_id ) {
								qr_index = i;
							}

							i++;
						}

						// IF QR FOUND, UPDATE ELSE ADD NEW TO ARRAY
						if( qr_index != null ) {
							asset_doc.associated_qr_codes.splice(qr_index, 1);
						}
					}

					// MARK ASSET MODIFIED
					asset_doc = rmUtilsFactory.sync_decoration.register_assets.assetModified(asset_doc);

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
			getQrScansList: function() {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.qr_scans;

				db.find({
					selector: {
						user_id: authFactory.rmCloudUserId()
					}
				}).then(function(result) {

					console.log("FETCHED QR SCANS");
					console.log(result.docs);
					defer.resolve(result.docs);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			logQrScan: function(qr_data, geo_data) {
				var defer = $q.defer();

				console.log("QR DATA TO LOG");
				console.log(qr_data);

				factory.dbUtils.checkQrScanExists(qr_data.data.code_id).then(function(qr_scan) {

					if( qr_scan ) {

						factory.dbUtils.updateQrLastScanned(qr_scan, geo_data).then(function() {

							defer.resolve(qr_scan);

						}, function(error) {
							defer.reject(error);
						});

					} else {

						factory.dbUtils.logNewQrScan(qr_data, geo_data).then(function(saved_qr_scan) {

							defer.resolve(saved_qr_scan);

						}, function(error) {
							defer.reject(error);
						});

					}

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			checkQrScanExists: function(code_id) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.qr_scans;

				db.find({
					selector: {
						user_id: authFactory.rmCloudUserId(), 
						qr_code: code_id
					}
				}).then(function(result) {

					console.log("CHECK QR SCAN EXISTS");
					console.log(result.docs);

					if( result.docs.length > 0 ) {
						defer.resolve(result.docs[0]);
					} else {
						defer.resolve(null);
					}

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			logNewQrScan: function(qr_data, geo_data) {
				var defer = $q.defer();

				var qr_scan = modelsFactory.models.newQrScan();

				qr_scan.qr_url = qr_data.data.url;
				qr_scan.qr_code = qr_data.data.code_id;
				qr_scan.full_qr_code = qr_data.data.full_code;
				qr_scan.date_first_scanned = new Date().getTime();
    			qr_scan.date_last_scanned = new Date().getTime();

    			qr_scan.geo_data = geo_data.coords_data;
    			qr_scan.geo_error = geo_data.error_message;
    			qr_scan.geo_date = new Date().getTime();

				var db = riskmachDatabasesFactory.databases.collection.qr_scans;

				db.post(qr_scan, {force: true}).then(function(result) {
					qr_scan._id = result.id;
					qr_scan._rev = result.rev;

					defer.resolve(qr_scan);
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			updateQrLastScanned: function(qr_scan, geo_data) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.qr_scans;

				qr_scan.date_last_scanned = new Date().getTime();

				qr_scan.geo_data = geo_data.coords_data;
				qr_scan.geo_error = geo_data.error_message;
				qr_scan.geo_date = new Date().getTime();

				db.put(qr_scan).then(function(result) {

					qr_scan._id = result.id;
					qr_scan._rev = result.rev;

					defer.resolve();

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			updateQrScanInfo: function(qr_scan, qr_data) {
				var defer = $q.defer();

				qr_scan.lookup_type = 'online';

				if( qr_data.hasOwnProperty('qr_record') && qr_data.qr_record ) {
					qr_scan.record_id = qr_data.qr_record.RecordID;
					qr_scan.record_type = qr_data.qr_record.RecordType;
				}

				var db = riskmachDatabasesFactory.databases.collection.qr_scans;

				db.put(qr_scan).then(function(result) {
					qr_scan._id = result.id;
					qr_scan._rev = result.rev;

					console.log("UPDATED QR SCAN INFO");

					defer.resolve();
				}).catch(function(error) {
					console.log("ERROR UPDATING QR SCAN INFO");
					defer.reject(error);
				});

				return defer.promise;	
			},
			updateQrScanInfoOfflineData: function(qr_scan, qr_data) {
				var defer = $q.defer();

				qr_scan.lookup_type = 'offline';

				if( qr_data.hasOwnProperty('qr_record') && qr_data.qr_record ) {
					qr_scan.record_id = qr_data.qr_record.rm_record_id;
					qr_scan.record_type = qr_data.qr_record.record_type;
				}

				var db = riskmachDatabasesFactory.databases.collection.qr_scans;

				db.put(qr_scan).then(function(result) {
					qr_scan._id = result.id;
					qr_scan._rev = result.rev;

					console.log("UPDATED QR SCAN INFO WITH OFFLINE DATA");

					defer.resolve();

				}).catch(function(error) {
					console.log("ERROR UPDATING QR SCAN INFO WITH OFFLINE DATA");
					defer.reject(error);
				});

				return defer.promise;
			},
			lookupLocalQrData: function(qr_code) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var stages = ['qr_record','core_asset_data','inspections'];

				var qr_data = {
					qr_record: null,
					core_asset: null, 
					register_pp_relations: [], 
					snapshot_assets: [], 
					register_media: []
				}

				var inspection_params = {
					qr_code: qr_code, 
					rm_register_asset_id: null
				}

				fetchNextStage(fetch_defer, 0).then(function() {

					console.log("FOUND LOCAL QR DATA");
					console.log(qr_data);

					factory.utils.formatCollectedLocalQrData(qr_data);

					defer.resolve(qr_data);

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextStage(defer, active_index) {

					if( active_index > stages.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					if( stages[active_index] == 'qr_record' ) {

						factory.dbUtils.getQrRecord(qr_code).then(function(qr_record) {

							qr_data.qr_record = qr_record;

							active_index++;
							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

					}

					if( stages[active_index] == 'core_asset_data' ) {

						factory.dbUtils.attemptFindCoreAssetInfoFromQr(qr_code).then(function(core_asset_data) {

							if( core_asset_data ) {

								qr_data.core_asset = core_asset_data.record;
								qr_data.register_pp_relations = core_asset_data.ipp_score_relations;

								if( core_asset_data.hasOwnProperty('record') && core_asset_data.record && core_asset_data.record.rm_id ) {
									inspection_params.rm_register_asset_id = core_asset_data.record.rm_id;
								}

							}

							active_index++;
							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

					}

					if( stages[active_index] == 'inspections' ) {

						factory.dbUtils.findQrCodeRelatedInspections(inspection_params).then(function(inspections) {

							qr_data.snapshot_assets = inspections;

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
		}

		factory.requests = {
			base_path: 'https://system.riskmach.co.uk/laravel/public/',
			lookupQrCode: function(qr_code) {
				var defer = $q.defer();

				$http.get(factory.requests.base_path + 'webapp/v1/QrLookup',{ 
	                params: {
	                	qr_id: qr_code
	                }
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("QR DATA LOOKUP REQUEST RESPONSE");
	            	console.log(data);

	            	if( data.error ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		defer.resolve(data.qr_data);
	            	}
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("ERROR - QR DATA LOOKUP REQUEST RESPONSE");
	            	console.log(data);
	            	defer.reject("Error reaching API to lookup QR code");
	            });

				return defer.promise;
			}
		}

		return factory;
	}

    function qrScanner()
	{
		var directive = {};

		directive.scope = {
			directive_id: '=directiveid',
			options: '=options'
		};

		directive.restrict = 'A';
		directive.controller = 'qrScannerController';
		directive.controllerAs = 'vm';
		directive.bindToController = true;
		directive.replace = false;

		directive.templateUrl = '../rm-utils/qr-scanner/tpl/scanner.html';

		return directive;
	}

})();