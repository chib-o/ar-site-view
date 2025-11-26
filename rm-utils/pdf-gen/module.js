(function() {

	var app = angular.module('riskmachPdfGenerator', ['tandibar/ng-rollbar','mgcrea.ngStrap','riskmachUtils','riskmachDatabases','riskmachMedia','riskmachModels','riskmachDataCleanup','riskmachFeatureLicenses','riskmachQrScanner']);
	app.controller('pdfGenController', pdfGenController);
	app.factory('pdfGenFactory', pdfGenFactory);
	app.directive('pdfGenDirective', pdfGenDirective);

	function pdfGenController($scope, $rootScope, $q, $sce, pdfGenFactory, mediaFactory, rmUtilsFactory, authFactory, featureLicenseFactory) 
	{
		var vm = this;

		vm.utils = {
			downloading_media_files: false,
			hasLicense: function(feature_name) {
				console.log("FEATURE LICENSED: " + featureLicenseFactory.utils.isFeatureLicensed(feature_name));
				return featureLicenseFactory.utils.isFeatureLicensed(feature_name);
			},
			pdf_gen: {
				fetching_data: false,
				data_fetched: false,
				generating: false,
				loading: false,
				generated: false,
				record_id: null, 
				record_type: null, 
				options: null,
				data: null,
				resetFetchAndGen: function() {
					vm.utils.pdf_gen.fetching_data = false;
					vm.utils.pdf_gen.data_fetched = false;
					vm.utils.pdf_gen.generating = false;
					vm.utils.pdf_gen.loading = false;
					vm.utils.pdf_gen.generated = false;
				},
				meta: {
					draft: false,
					preview: false,
					app_version: rmUtilsFactory.app_version, 
					date_content_modified: null, 
					date_created: null, 
					rm_user_id: authFactory.cloudUserId(), 
					licensed: false,
					reset: function() {
						vm.utils.pdf_gen.meta.draft = false;
						vm.utils.pdf_gen.meta.preview = false;
						vm.utils.pdf_gen.meta.date_content_modified = null;
						vm.utils.pdf_gen.meta.date_created = null;
						vm.utils.pdf_gen.meta.licensed = false;
					}
				},
				qr_generated: false,
				error_handler: {
					error: false, 
					error_message: null,
					logError: function(error) {
						vm.utils.pdf_gen.loading = false;
						vm.utils.pdf_gen.fetching_data = false;
						vm.utils.pdf_gen.generating = false;
						vm.utils.pdf_gen.error_handler.error = true;
						vm.utils.pdf_gen.error_handler.error_message = error;
					},
					clear: function() {
						vm.utils.pdf_gen.error_handler.error = false;
						vm.utils.pdf_gen.error_handler.error_message = null;
					}
				},
				start: function() {
					// CLEAR ANY PREVIOUS ERRORS
					vm.utils.pdf_gen.error_handler.clear();

					// RESET FETCH AND GENERATION
					vm.utils.pdf_gen.resetFetchAndGen();

					// RESET META
					vm.utils.pdf_gen.meta.reset();

					// GENERATE MULTIPLE PDF
					if( vm.utils.pdf_gen.options.hasOwnProperty('gen_multiple') && vm.utils.pdf_gen.options.gen_multiple == 'Yes' ) {
						vm.utils.pdf_gen.fetchDataAndGenerateMultiple();
						return;
					}

					// PRINT PDF
					if( vm.utils.pdf_gen.options.hasOwnProperty('print') && vm.utils.pdf_gen.options.print ) {
						vm.utils.pdf_gen.fetchDataForPrint(vm.utils.pdf_gen.record_id, vm.utils.pdf_gen.record_type, vm.utils.pdf_gen.pdf_type);
						return;
					}

					// PREVIEW PDF
					if( vm.utils.pdf_gen.options.hasOwnProperty('preview') && vm.utils.pdf_gen.options.preview ) {
						// SET META
						vm.utils.pdf_gen.meta.preview = true;

						vm.utils.pdf_gen.fetchDataAndPreview(vm.utils.pdf_gen.record_id, vm.utils.pdf_gen.record_type, vm.utils.pdf_gen.pdf_type);
						return;
					}

					// LOCALLY GENERATE PDF FILE
					vm.utils.pdf_gen.fetchDataAndGenerate(vm.utils.pdf_gen.record_id, vm.utils.pdf_gen.record_type, vm.utils.pdf_gen.pdf_type);
					
				},
				fetchDataAndGenerate: function(record_id, record_type, pdf_type) {
					var defer = $q.defer();
					
					vm.utils.pdf_gen.loading = true;
					vm.utils.pdf_gen.fetching_data = true;
					vm.utils.pdf_gen.data_fetched = false;

					// SET CORRECT PDF TEMPLATE
					vm.utils.pdf_gen.setPdfTemplate();

					var gen_start = new Date().getTime();

					vm.utils.pdf_gen.fetchDataForPdf(record_id, pdf_type).then(function() {

						vm.utils.pdf_gen.fetching_data = false;
						vm.utils.pdf_gen.generating = true;

						vm.utils.pdf_gen.generatePdf(record_id, record_type, pdf_type).then(function(pdf_data) {

							var gen_end = new Date().getTime();
							var gen_time = (gen_end - gen_start) / 1000;

							console.log("GEN TIME: " + gen_time + " SECONDS");

							vm.utils.pdf_gen.generating = false;
							vm.utils.pdf_gen.loading = false;

							vm.utils.pdf_gen.generated = true;

							// DISPLAY GENERATED MESSAGE WITH OPTION TO VIEW PDF

							// setTimeout(function() {
								vm.utils.pdf_viewer.viewPdf(pdf_data.pdf_blob);
							// }, 5000);

						}, function(error) {
							vm.utils.pdf_gen.error_handler.logError(error);
							defer.reject(error);
						});

					}, function(error) {
						vm.utils.pdf_gen.error_handler.logError(error);
						defer.reject(error);
					});

					return defer.promise;
				},
				fetchDataForPrint: function(record_id, record_type, pdf_type) {
					var defer = $q.defer();
					
					vm.utils.pdf_gen.loading = true;
					vm.utils.pdf_gen.fetching_data = true;

					// SET CORRECT PDF TEMPLATE
					vm.utils.pdf_gen.setPdfTemplate();

					var gen_start = new Date().getTime();

					vm.utils.pdf_gen.fetchDataForPdf(record_id, pdf_type).then(function() {

						vm.utils.pdf_gen.fetching_data = false;

						vm.utils.pdf_gen.genQrCode(pdf_type);

						var gen_end = new Date().getTime();
						var gen_time = (gen_end - gen_start) / 1000;

						console.log("GEN TIME: " + gen_time + " SECONDS");
						// SET META
						vm.utils.pdf_gen.meta.date_created = gen_end;

						vm.utils.pdf_gen.generating = false;
						vm.utils.pdf_gen.loading = false;

						vm.utils.pdf_gen.generated = true;

						// if( !vm.utils.pdf_gen.data.file_download_required ) {
						// 	$(document).ready(function() {
						// 		vm.utils.pdf_gen.openPrint();
						// 	});
						// }

						defer.resolve();

					}, function(error) {
						vm.utils.pdf_gen.error_handler.logError(error);
						defer.reject(error);
					});

					return defer.promise;
				},
				fetchDataAndPreview: function(record_id, record_type, pdf_type) {
					var defer = $q.defer();
					
					vm.utils.pdf_gen.loading = true;
					vm.utils.pdf_gen.fetching_data = true;

					// SET CORRECT PDF TEMPLATE
					vm.utils.pdf_gen.setPdfTemplate();

					vm.utils.pdf_gen.fetchDataForPdf(record_id, pdf_type).then(function() {

						vm.utils.pdf_gen.fetching_data = false;
						vm.utils.pdf_gen.generating = false;
						vm.utils.pdf_gen.loading = false;

						vm.utils.pdf_gen.generated = true;

						defer.resolve();

					}, function(error) {
						vm.utils.pdf_gen.error_handler.logError(error);
						defer.reject(error);
					});

					return defer.promise;
				},
				fetchDataAndGenerateMultiple: function() {
					var defer = $q.defer();


					return defer.promise;
				},
				setPdfTemplate: function() {
					if( !vm.utils.pdf_gen.pdf_type ) {
						// DEFAULT PDF TEMPLATE?
					}

					if( vm.utils.pdf_gen.pdf_type == 'procedure' ) {
						vm.utils.pdf_gen.pdf_template = '../rm-utils/pdf-gen/tpl/procedure_pdf.html';
					}

					if( vm.utils.pdf_gen.pdf_type == 'inspection_ras' ) {
						vm.utils.pdf_gen.pdf_template = '../rm-utils/pdf-gen/tpl/inspection_ras_pdf.html';
					}
				},
				fetchDataForPdf: function(record_id, pdf_type) {
					var defer = $q.defer();

					if( pdf_type == 'procedure' ) {

						pdfGenFactory.procedure_pdf_builder.collectProcedureDataForPdf(record_id).then(function(data) {
							
							vm.utils.pdf_gen.data = pdfGenFactory.procedure_pdf_builder.data;

							console.log("PROCEDURE RECORD");
							console.log(vm.utils.pdf_gen.data.structured_procedure.procedure_record);

							// SET META DATES
							if( vm.utils.pdf_gen.data.structured_procedure.procedure_record.date_modified ) {
								vm.utils.pdf_gen.meta.date_content_modified = vm.utils.pdf_gen.data.structured_procedure.procedure_record.date_modified;
							} else {
								vm.utils.pdf_gen.meta.date_content_modified = vm.utils.pdf_gen.data.structured_procedure.procedure_record.date_added;
							}

							// SET META LICENSE
							vm.utils.pdf_gen.meta.licensed = vm.utils.hasLicense('sops');

							// IF LICENSED AND PROCEDURE NOT APPROVED, IT IS DRAFT
							if( vm.utils.hasLicense('sops') && !vm.utils.pdf_gen.data.structured_procedure.procedure_record.date_approved ) {
								vm.utils.pdf_gen.meta.draft = true;
							}

							vm.utils.pdf_gen.data_fetched = true;

							defer.resolve();
						}, function(error) {
							defer.reject(error);	
						});

						return defer.promise;
					}

					if( pdf_type == 'inspection_ras' ) {

						pdfGenFactory.inspection_pdf_builder.collectInspectionRasDataForPdf(record_id).then(function(data) {

							vm.utils.pdf_gen.data = pdfGenFactory.inspection_pdf_builder.data;

							console.log("INSPECTION DATA FOR PDF");
							console.log(vm.utils.pdf_gen.data);

							// SET META DATES
							if( vm.utils.pdf_gen.data.asset_record.date_modified ) {
								vm.utils.pdf_gen.meta.date_content_modified = vm.utils.pdf_gen.data.asset_record.date_modified;
							} else {
								vm.utils.pdf_gen.meta.date_content_modified = vm.utils.pdf_gen.data.asset_record.date_added;
							}

							// SET META LICENSE

							vm.utils.pdf_gen.data_fetched = true;

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				generatePdf: function(record_id, record_type, pdf_type) {
					var defer = $q.defer();

					pdfGenFactory.generatePdf(record_id, record_type, pdf_type).then(function(pdf_data) {

						defer.resolve(pdf_data);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				fetchViewPdf: function(pdf_media_id) {
					// USED IF PDF ALREADY GENERATED FOR RECORD
				},
				viewInNewWindow: function() {
					var defer = $q.defer();

					$(document).ready(function(){

						// var divContents = $("#dvContainer").html();
						var divContents = $("#procedurePdf")[0].innerHTML;

			            // var printWindow = window.open('', '', 'height=400,width=800');
			            // printWindow.document.write('<html><head><title>DIV Contents</title>');
			            // printWindow.document.write('</head><body >');
			            // printWindow.document.write(divContents);
			            // printWindow.document.write('</body></html>');
			            // printWindow.document.close();
			            // printWindow.print();

			            var ifrm = document.getElementById('pdfIframe');
						ifrm = ifrm.contentWindow || ifrm.contentDocument.document || ifrm.contentDocument;
						
						// OPEN DOC FOR WRITING
						ifrm.document.open();

						// OPEN HEAD
						ifrm.document.write('<html><head>');

					    // WRITE STYLE SHEETS TO DOCUMENT
					    ifrm.document.write('<link href="../vendor/libs/bootstrap/css/bootstrap.min.css" rel="stylesheet">');
					    ifrm.document.write('<link href="../vendor/libs/bootstrap-icons/font/bootstrap-icons.css" rel="stylesheet">');
					    ifrm.document.write('<link href="../vendor/libs/@mdi/font/css/materialdesignicons.min.css" rel="stylesheet">');
					    ifrm.document.write('<link href="../css/bootstrap-additions.min.css" rel="stylesheet">');
					    ifrm.document.write('<link href="../css/dashui.min.css" rel="stylesheet">');
					    ifrm.document.write('<link href="../css/styles.css" rel="stylesheet">');
						
			            ifrm.document.write('</head><body style="background-color: #fff;">');

			            // WRITE CONTENT
			            ifrm.document.write(divContents);

			            // WRITE SCRIPTS TO DOCUMENT
			            ifrm.document.write('<script src="../vendor/angular-1.3.15.js"></script>');

			            ifrm.document.write('</body></html>');

			            // CLOSE DOC
						ifrm.document.close();

						// setTimeout(function() {

						// 	ifrm.print();

						// }, 2000);

						$(ifrm.document).ready(function(){

							console.log("DOCUMENT READY");

							defer.resolve();

						});

					});

			  		return defer.promise;
				},
				openPrint: function() {
					$rootScope.$broadcast("pdfGen::print");
					print();
				},
				genQrCode: function(pdf_type) {

					// IF QR ALREADY GENERATED, SKIP
					if( vm.utils.pdf_gen.qr_generated ) {
						return;
					}

					if( pdf_type == 'procedure' ) {

						setTimeout(function() {

							var width = 170;
							var height = 170;

							var el = document.getElementById("procedure-qrcode");
							width = el.offsetWidth;
							height = width;

							console.log("QR CODE WIDTH: " + width + " - HEIGHT: " + height);

							var url = "https://www.riskmach.co.uk/";
							// IF RMID AND RMREF
							if( vm.utils.pdf_gen.data.structured_procedure.procedure_record.rm_id && vm.utils.pdf_gen.data.structured_procedure.procedure_record.rm_ref ) {
								url = "https://system.riskmach.co.uk/laravel/public/QRRouterRedirect"; 
								url += "?qr_type=procedure";								
								url += "&procedure_ref=" + vm.utils.pdf_gen.data.structured_procedure.procedure_record.rm_ref;
								url += "&procedure_id=" + vm.utils.pdf_gen.data.structured_procedure.procedure_record.rm_id;
							}

							var qrcode = new QRCode("procedure-qrcode", {
								text: url,
								width: width, 
								height: height
							});

							// qrcode.makeCode("https://www.riskmach.co.uk/");

							vm.utils.pdf_gen.qr_generated = true;

						}, 0);
							
					}

					if( pdf_type == 'inspection_ras' ) {

						setTimeout(function() {

							// LOOP THROUGH ASSESSMENTS
							// FOR EACH ASSESSMENT GEN MULTIPLE QR CODES
								// DEPENDING ON WHAT OVERFLOW PAGES ARE DISPLAYED


							var i = 0;
							var len = vm.utils.pdf_gen.data.assessments.length;

							while(i < len) {

								genRaQrCodes(vm.utils.pdf_gen.data.assessments[i]);

								i++;
							}

							vm.utils.pdf_gen.qr_generated = true;

							function genRaQrCodes(risk) {

								var url = "https://www.riskmach.co.uk/";
								// IF RMID
								if( risk.rm_id ) {
									url = "https://system.riskmach.co.uk/laravel/public/QRRouterRedirect"; 
									url += "?qr_type=report_raid";								
									url += "&assessment_id=" + risk.rm_id; 
								}

								var cover_el_id = "ra-qrcode-" + risk._id + "-cover";

								var text_overflow_el_id = null;
								var image_overflow_el_id = null;

								if( risk.hazard_desc_overflow || risk.control_desc_overflow ) {
									text_overflow_el_id = "ra-qrcode-" + risk._id + "-text-overflow";
								}

								if( risk.overflow_media.length > 0 ) {
									image_overflow_el_id = "ra-qrcode-" + risk._id + "-image-overflow";
								}

								var width = 170;
								var height = 170;

								var cover_el = document.getElementById(cover_el_id);
								width = cover_el.offsetWidth;
								height = width;

								// ALL 3 QR CODES SHOULD BE SAME DIMENSIONS
								console.log("QR CODE WIDTH: " + width + " - HEIGHT: " + height);

								var cover_qrcode = new QRCode(cover_el_id, {
									text: url,
									width: width, 
									height: height
								});

								if( text_overflow_el_id ) {
									var text_overflow_qrcode = new QRCode(text_overflow_el_id, {
										text: url,
										width: width, 
										height: height
									});
								}

								if( image_overflow_el_id ) {
									var image_overflow_qrcode = new QRCode(image_overflow_el_id, {
										text: url,
										width: width, 
										height: height
									});
								}

								// qrcode.makeCode("https://www.riskmach.co.uk/");

							}

						}, 0);
							
					}

				},
				events: function() {

					$scope.$on("pdfGen::startGen", function(event, data) {

						console.log("RECEIVED BROADCAST");

						if( data.hasOwnProperty('pdf_type') && data.pdf_type ) {
							vm.utils.pdf_gen.pdf_type = data.pdf_type;
						}

						if( data.hasOwnProperty('record_id') && data.record_id ) {
							vm.utils.pdf_gen.record_id = data.record_id;
						}

						if( data.hasOwnProperty('record_type') && data.record_type ) {
							vm.utils.pdf_gen.record_type = data.record_type;
						}

						if( data.hasOwnProperty('options') && data.options ) {
							vm.utils.pdf_gen.options = data.options;
						}

						vm.utils.pdf_gen.start();
					});

					$scope.$on("pdfGen::cleanupData", function(event, data) {

						// RESET THE COLLECTED PDF FACTORY DATA
						if( vm.utils.pdf_gen.pdf_type == 'procedure' ) {
							pdfGenFactory.procedure_pdf_builder.resetPdfBuilderData();
						}
						
						if( vm.utils.pdf_gen.pdf_type == 'inspection_ras' ) {
							pdfGenFactory.inspection_pdf_builder.resetPdfBuilderData();
						}

						// RESET THE COLLECTED DATA IN SCOPE
						vm.utils.pdf_gen.data = null;

						// CLEAR ANY PREVIOUS ERRORS
						vm.utils.pdf_gen.error_handler.clear();

						// RESET FETCH AND GENERATION
						vm.utils.pdf_gen.resetFetchAndGen();

						// RESET META
						vm.utils.pdf_gen.meta.reset();

					});

				}()
			},
			pdf_viewer: {
				url: null,
				viewPdf: function(pdf_blob) {
					// CREATE URL FROM BLOB
					var pdf_url = URL.createObjectURL(pdf_blob);

					vm.utils.pdf_viewer.url = pdf_url;

					$scope.$apply();
				},
				trustAsUrl: function(src) {
					return $sce.trustAsResourceUrl(src);
				}
			},
			files_download: {
				meta: mediaFactory.media_download.meta,
				cancel: function() {
					mediaFactory.media_download.cancel();
				},
				events: function() {
					$scope.$on("filesDownload::metaUpdated", function(event, data) {
						vm.utils.files_download.meta = mediaFactory.media_download.meta;
					});
				}
			},
			downloadFetchedMediaFiles: function() {
				var defer = $q.defer();

				vm.utils.downloading_media_files = true;

				var filters = {
					media_fetched: true,
					media: vm.utils.pdf_gen.data.media_to_download
				}

				mediaFactory.downloadMediaMultiple(filters).then(function() {

					vm.utils.downloading_media_files = false;

					vm.utils.pdf_gen.start();

				}, function(error) {
					vm.utils.downloading_media_files = false;
					alert(error);
				});

				return defer.promise;
			}
		}
	}

	function pdfGenFactory($q, $filter, riskmachDatabasesFactory, authFactory, mediaFactory, dataCleanupFactory, qrScannerFactory) 
	{
		var factory = {};

		factory.utils = {
			browser_img_urls: [],
			revokeBrowserImgUrls: function() {
				var i = 0;
				var len = factory.utils.browser_img_urls.length;

				while(i < len) {
					// REMOVE BROWSER REFERENCE
					URL.revokeObjectURL(factory.utils.browser_img_urls[i]);

					i++;
				}

				// EMPTY ARRAY
				factory.utils.browser_img_urls = [];
			},
			calcPdfFileName: function(record, record_type) {
				var file_name = null;

				if( record_type == 'task' ) {
					file_name = record.title || new Date().getTime();
				}

				if( record_type == 'assessment' ) {
					file_name = record.rm_id || record._id;
				}

				// APPEND FILE EXTENSION
				file_name + '.pdf';

				return file_name;
			}
 		}

		factory.procedure_utils = {
			calcHazardIcon: function(hazard_type_name) {
				var icon_path = '../images/hazard_icons/black/';
				var icon_file = null;

				if( hazard_type_name == 'Combination Of Hazards Inc Mechanical' ) {
					icon_file = 'Combination Of Hazards Incl Mech.png';
				}

				if( hazard_type_name == 'Electrical' ) {
					icon_file = 'Elec Hazard.png';
				}

				if( hazard_type_name == 'Environment Of Use' ) {
					icon_file = 'Environmental Hazard.png';
				}

				if( hazard_type_name == 'Ergonomic' ) {
					icon_file = 'Ergonomic Hazard.png';
				}

				if( hazard_type_name == 'Material / Substance' ) {
					icon_file = 'Material Substance Hazard.png';
				}

				if( hazard_type_name == 'Mechanical' ) {
					icon_file = 'Mech Hazard.png';
				}

				if( hazard_type_name == 'Noise' ) {
					icon_file = 'Noise Hazard.png';
				}

				if( hazard_type_name == 'Radiation' ) {
					icon_file = 'Radiation Hazard.png';
				}

				if( hazard_type_name == 'Thermal' ) {
					icon_file = 'Thermal Hazard.png';
				}

				if( hazard_type_name == 'Vibration' ) {
					icon_file = 'Vibration Hazard.png';
				}

				if( !icon_file ) {
					icon_file = 'Generic Risk.png';
				}

				return icon_path + icon_file;
			},
			hazardScoreColour: function(score_phrase){
				var colour = null;

				if( score_phrase == 'Low' )
				{
					colour = '#00435F';
				}

				if( score_phrase == 'Medium' )
				{
					colour = '#ffc900';
				}

				if( score_phrase == 'High' )
				{
					colour = '#E68A01';
				}

				if( score_phrase == 'Very High' )
				{
					colour = '#ef473a';
				}

				return colour;
			},
		}

		factory.inspection_utils = {
			riskLevelStyleV1: function(phrase) {
				// var colour = '#00435F'; // BLUE
				var colour = '#F6A13E'; // ORANGE

				if( !phrase ) {
					return colour;
				}

				if( phrase == 'Negligible' || phrase == 'Very Low' || phrase == 'Low' )
				{
					// colour = '#00435F';
					colour = '#F6A13E';
				}

				if( phrase == 'Significant' )
				{
					colour = '#F6A13E';
				}

				if( phrase == 'High' || phrase == 'Very High' || phrase == 'Extreme' || phrase == 'Unacceptable')
				{
					colour = '#C24E4F';
				}

				return colour;
			},
			riskLevelStyle: function(risk, stage) {
				// var colour = '#00435F'; // BLUE
				var colour = '#f0ad4e'; // ORANGE
				var phrase = null;

				// PHA
				if( risk.hasOwnProperty('assessment_method') && risk.assessment_method == 1 ) {

					if( stage == 'before' ) {
						phrase = risk.hrn_phrase_name_initial;
					} else {
						phrase = risk.hrn_phrase_name_after;
					}

					if( !phrase ) {
						return colour;
					}

					if( phrase == 'Negligible' || phrase == 'Very Low' || phrase == 'Low' ) {
						// colour = '#00435F';
						colour = '#f0ad4e';
					}

					if( phrase == 'Significant' ) {
						colour = '#d9534f';
					}

					if( phrase == 'High' || phrase == 'Very High' || phrase == 'Extreme' || phrase == 'Unacceptable') {
						colour = '#d9534f';
					}

					return colour;
				} 
				// END PHA

				// SIMPLE
				if( risk.hasOwnProperty('assessment_method') && risk.assessment_method == 3 ) {

					if( stage == 'before' ) {
						phrase = risk.simple_risk_phrase_initial;
					} else {
						phrase = risk.simple_risk_phrase_after;
					}

					if( !phrase ) {
						return colour;
					}

					if( phrase == 'Negligible' || phrase == 'Very Low' || phrase == 'Low' ) {
						// colour = '#00435F';
						colour = '#f0ad4e';
					}

					if( phrase == 'Significant' ) {
						colour = '#d9534f';
					}

					if( phrase == 'High' || phrase == 'Very High' || phrase == 'Extreme' || phrase == 'Unacceptable') {
						colour = '#d9534f';
					}

					return colour;
				} 
				// END SIMPLE

				// MATRIX 
				if( risk.hasOwnProperty('assessment_method') && risk.assessment_method == 2 ) {

					if( stage == 'before' ) {
						phrase = risk.matrix_score_phrase_initial;
					} else {
						phrase = risk.matrix_score_phrase_after;
					}

					if( !phrase ) {
						return colour;
					}

					if( phrase == 'Low' ) {
						colour = '#008000';
					}

					if( phrase == 'Medium' ) {
						colour = '#ffa500';
					}

					if( phrase == 'High' ) {
						colour = '#ffc0cb';
					}

					if( phrase == 'Very High' ) {
						colour = '#ff0000';
					}

					return colour;
				}
				// END MATRIX

				// RIA
				if( risk.hasOwnProperty('assessment_method') && risk.assessment_method == 4 ) {

					if( stage == 'before' ) {
						phrase = risk.ria_risk_level_initial;
					} else {
						phrase = risk.ria_risk_level_after;
					}

					if( !phrase ) {
						return colour;
					}

					if( phrase == 'Negligible' ) {
						colour = '#f0ad4e';
					}

					if( phrase == 'Low' ) {
						colour = '#f0ad4e';
					}

					if( phrase == 'Medium' ) {
						colour = '#ffc900';
					}

					if( phrase == 'Significant' ) {
						colour = '#d9534f';
					}

					if( phrase == 'High' ) {
						colour = '#d9534f';
					} 

					if( phrase == 'Very High' ) {
						colour = '#d9534f';
					}

					return colour;
				}
				// END RIA

				// RACKING
				if( risk.hasOwnProperty('assessment_method') && risk.assessment_method == 5 ) {

					if( stage == 'before' ) {
						phrase = risk.matrix_score_phrase_initial;
					}

					if( !phrase ) {
						colour = '#dddddd';
						return colour;
					}

					if( phrase == 'Relevant Observation' ) {
						colour = '#dddddd';
					}

					if( phrase == 'Surveillance' ) {
						colour = '#019847';
					}

					if( phrase == 'Hazardous Damage' ) {
						colour = '#f6a13e';
					}

					if( phrase == 'Very Serious Damage' ) {
						colour = '#c24e4f';
					}

					return colour;
				}
				// END RACKING

				// DETERIORATION
				if( risk.hasOwnProperty('assessment_method') && risk.assessment_method == 6 ) {

					if( stage == 'before' ) {
						phrase = risk.matrix_score_phrase_initial;
					}

					if( !phrase ) {
						colour = '#dddddd';
						return colour;
					}

					if( phrase == 'Closed' ) {
						colour = '#dddddd';
					}

					if( phrase == 'A' ) {
						colour = '#019847';
					}

					if( phrase == 'B' ) {
						colour = '#f6a13e';
					}

					if( phrase == 'C' ) {
						colour = '#c24e4f';
					}

					return colour;
				}
				// END DETERIORATION

				return colour;
			}
		}

		factory.dbUtils = {
			getRrmList: function(filters){
				var defer = $q.defer();

				//FIND EXISTING STAGE RECORD
				riskmachDatabasesFactory.databases.collection.utils.find({
					selector: {
						table: 'rrm_list',
						user_id: authFactory.cloudUserId(),
						company_id: authFactory.cloudCompanyId(),
					}
				}).then(function(results){

					factory.dbUtils.getRrmIcons().then(function(icons) {

						var rrm_list = [];

						if( results.docs[0].data.length > 0 ) {

							results.docs[0].data.forEach(function(record, index){
								var html = record.Name;
								var url = null;

								if( icons && record.hasOwnProperty('IconMediaRef') && record.IconMediaRef ) 
								{
									if( icons.hasOwnProperty( parseInt(record.IconMediaRef) ) ) {

										var icon = icons[parseInt(record.IconMediaRef)];

										if( !icon.file_downloaded ) {
											url = null;
										} else {
											url = icon.url;
										}

									}

								} else {

									if( record.IconFile )
									{
										url = '../images/rrm_icons/ISO7010/' + record.IconFile;
									}

								}

								results.docs[0].data[index].url = url;
							});

							rrm_list = results.docs[0].data;
						}

						defer.resolve(rrm_list);

					}, function(error) {
						defer.reject(error);
					});

				}).catch(function(error){
					defer.reject(error);
				});

				return defer.promise;
			},
			getRrmIcons: function() {
				var defer = $q.defer();

				var filters = {
					record_type: 'rrm', 
					user_id: authFactory.cloudUserId(),
					company_id: authFactory.cloudCompanyId(),
					status: 1 // LIVE
				};

				mediaFactory.dbUtils.getIconAttachments(filters).then(function(icons) {

					if( icons.length == 0 ) {
						console.log("NO RRM ICONS");
						defer.resolve(null);
						return defer.promise;
					}

					var indexed_icons = {};

					var i = 0;
					var len = icons.length;

					while(i < len) {
						indexed_icons[icons[i].rm_ref] = icons[i];

						i++;
					}

					console.log("RRM ICONS");
					console.log(indexed_icons);

					var icons = indexed_icons;

					defer.resolve(icons);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getRecord: function(record_id, record_type) {
				var defer = $q.defer();

				var db = null; 

				if( record_type == 'task' ) {
					db = riskmachDatabasesFactory.databases.collection.tasks;
				}

				if( record_type == 'assessment' ) {
					db = riskmachDatabasesFactory.databases.collection.assessments;
				}

				if( !db ) {
					defer.reject("Could not find the corresponding database for the specified record type");
					return defer.promise;
				}

				db.get(record_id).then(function(doc) {

					defer.resolve(doc);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			markRecordPdfGenerated: function(record_id, record_type, pdf_media_id) {
				var defer = $q.defer();

				var db = null;

				if( record_type == 'task' ) {
					db = riskmachDatabasesFactory.databases.collection.tasks;
				}

				if( record_type == 'assessment' ) {
					db = riskmachDatabasesFactory.databases.collection.assessments;
				}

				db.get(record_id).then(function(doc) {

					doc.pdf_generated = new Date().getTime();
					doc.pdf_media_id = pdf_media_id;

					db.put(doc).then(function(result) {

						defer.resolve(result);

					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
		}

		factory.procedure_pdf_builder = {
			data: {
				steps: [],
				hazards: [],
				controls: [], 
				hazard_control_relations: [],
				structured_procedure: {},
				significant_concerns: [],
				unique_hazard_types: [],
				unique_control_types: [],
				hazards_w_controls: [],
				file_download_required: false,
				media: []
			},
			fetched_task_ids: [],
			fetched_hazard_ids: [],
			fetched_control_ids: [],
			resetPdfBuilderData: function() {
				factory.procedure_pdf_builder.data.steps = [];
				factory.procedure_pdf_builder.data.hazards = [];
				factory.procedure_pdf_builder.data.controls = [];
				factory.procedure_pdf_builder.data.hazard_control_relations = [];
				factory.procedure_pdf_builder.data.structured_procedure = {};
				factory.procedure_pdf_builder.data.significant_concerns = [];
				factory.procedure_pdf_builder.data.unique_hazard_types = [];
				factory.procedure_pdf_builder.data.unique_control_types = [];
				factory.procedure_pdf_builder.data.hazards_w_controls = [];
				factory.procedure_pdf_builder.data.file_download_required = false;
				factory.procedure_pdf_builder.data.media_to_download = [];

				factory.procedure_pdf_builder.fetched_task_ids = [];
				factory.procedure_pdf_builder.fetched_hazard_ids = [];
				factory.procedure_pdf_builder.fetched_control_ids = [];

				factory.utils.revokeBrowserImgUrls();
			},
			collectProcedureDataForPdf: function(procedure_id) {
				var defer = $q.defer();

				// MAKE SURE BUILDER IS EMPTY BEFORE FETCH
				factory.procedure_pdf_builder.resetPdfBuilderData();

				factory.procedure_pdf_builder.fetchProcedureDataForPdf(procedure_id).then(function() {

					console.log("HERE");

					// STRUCTURE FETCHED DATA
					factory.procedure_pdf_builder.structureProcedureDataForPdf();

					defer.resolve();

				}, function(error) {
					factory.procedure_pdf_builder.resetPdfBuilderData();
					defer.reject(error);
				});

				return defer.promise;
			},
			fetchProcedureDataForPdf: function(procedure_id) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				factory.procedure_pdf_builder.data.structured_procedure = {
					subject_record: null,
					procedure_record: null, 
					sections: []
				}

				var stages = ['procedure','subject','tasks','hazards','controls','hazard_control_relations','media'];

				fetchNextStage(fetch_defer, 0).then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextStage(defer, active_index) {

					console.log("FETCHING STAGE: " + stages[active_index]);

					if( active_index > stages.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					// GET PROCEDURE RECORD
					if( stages[active_index] == 'procedure' ) {

						factory.procedure_pdf_builder.getProcedureRecord(procedure_id).then(function() {

							active_index++;

							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

					}

					// GET SUBJECT RECORD
					if( stages[active_index] == 'subject' ) {

						factory.procedure_pdf_builder.getProcedureSubjectRecord(factory.procedure_pdf_builder.data.structured_procedure.procedure_record.asset_id).then(function() {

							active_index++;

							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

					}

					// GET PROCEDURE SECTIONS AND STEPS
					if( stages[active_index] == 'tasks' ) {

						factory.procedure_pdf_builder.getProcedureTasks(procedure_id).then(function() {

							active_index++;

							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

					}

					// GET PROCEDURE HAZARDS
					if( stages[active_index] == 'hazards' ) {

						factory.procedure_pdf_builder.getProcedureHazards().then(function() {

							active_index++;

							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

					}

					// GET PROCEDURE CONTROLS
					if( stages[active_index] == 'controls' ) {

						factory.procedure_pdf_builder.getProcedureControls().then(function() {

							active_index++;

							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

					}

					// GET PROCEDURE HAZARD-CONTROL RELATIONS
					if( stages[active_index] == 'hazard_control_relations' ) {

						factory.procedure_pdf_builder.getProcedureHazardControlRelations().then(function() {

							active_index++;

							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

					}

					// GET PROCEDURE MEDIA
					if( stages[active_index] == 'media' ) {

						factory.procedure_pdf_builder.getProcedureMedia().then(function() {

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
			getProcedureRecord: function(procedure_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.tasks.get(procedure_id).then(function(doc) {

					doc.mr_matrix_score_initial = null;
					doc.mr_matrix_score_phrase_initial = null;
					doc.mr_initial_colour = null;

					doc.todays_date = new Date().getTime();

					doc.signature_record = null;

					factory.procedure_pdf_builder.data.structured_procedure.procedure_record = doc;

					defer.resolve();

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getProcedureSubjectRecord: function(asset_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.assets.get(asset_id).then(function(doc) {

					doc.media = [];

					factory.procedure_pdf_builder.data.structured_procedure.subject_record = doc;

					defer.resolve();

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getProcedureTasks: function(procedure_id) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.tasks;
				
				var options = {
					limit: 100, 
					include_docs: true
				};

				fetchNextPage(fetch_defer).then(function() {

					// ORDER SECTIONS
					factory.procedure_pdf_builder.data.structured_procedure.sections = $filter('orderBy')(factory.procedure_pdf_builder.data.structured_procedure.sections, 'sequence_number');

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								// IF A PROCEDURE
								if( result.rows[i].doc.hasOwnProperty('task_type') && result.rows[i].doc.task_type == 'procedure' ) {
									errors++;
								}

								// IF TASK DOESN'T BELONG TO ACTIVE PROCEDURE
								if( !result.rows[i].doc.hasOwnProperty('procedure_id') || result.rows[i].doc.procedure_id != procedure_id ) {
									errors++;
								}

								// IF TASK IS NOT LIVE
								if( !result.rows[i].doc.hasOwnProperty('status') || result.rows[i].doc.status != 2 ) {
									errors++;
								}

								if( errors == 0 ) {

									factory.procedure_pdf_builder.fetched_task_ids.push(result.rows[i].doc._id);

									if( result.rows[i].doc.task_type == 'task' ) {
										factory.procedure_pdf_builder.data.structured_procedure.sections.push(result.rows[i].doc);
									}

									if( result.rows[i].doc.task_type == 'step' ) {

										result.rows[i].doc.media = [];
										result.rows[i].doc.hazards_w_controls = [];

										factory.procedure_pdf_builder.data.steps.push(result.rows[i].doc);
									}

								}

								i++;
							}

							options.skip = 1;
							options.startkey = result.rows[ result.rows.length - 1 ].id;

							result.rows = null;

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
			getProcedureHazards: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.mr_hazards;

				var options = {
					limit: 100, 
					include_docs: true
				};

				var hazards = [];

				fetchNextPage(fetch_defer).then(function() {

					factory.procedure_pdf_builder.data.hazards = $filter('orderBy')(factory.procedure_pdf_builder.data.hazards, 'date_added');

					var hi = 0;
					var hlen = factory.procedure_pdf_builder.data.hazards.length;

					while(hi < hlen) {

						var hazard_num = hi + 1;

						factory.procedure_pdf_builder.data.hazards[hi].index_icon_path = "../images/haz_con_numbers/H" + hazard_num + ".png";

						hi++;
					}

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								// IF HAZARD IS NOT LIVE
								if( !result.rows[i].doc.hasOwnProperty('status') || result.rows[i].doc.status != 1 ) {
									errors++;
								}

								// IF PARENT TASK HAS NOT BEEN FETCHED
								if( factory.procedure_pdf_builder.fetched_task_ids.indexOf(result.rows[i].doc.task_id) === -1 ) {
									errors++;
								}

								if( errors == 0 ) {

									factory.procedure_pdf_builder.fetched_hazard_ids.push(result.rows[i].doc._id);

									result.rows[i].doc.date_added = parseInt(result.rows[i].doc.date_added);

									result.rows[i].doc.controls = [];
									result.rows[i].doc.media = [];

									result.rows[i].doc.hazard_type_icon_path = factory.procedure_utils.calcHazardIcon(result.rows[i].doc.hazard_type_name);

									result.rows[i].doc.initial_colour = factory.procedure_utils.hazardScoreColour(result.rows[i].doc.matrix_score_phrase_initial);
									result.rows[i].doc.after_colour = factory.procedure_utils.hazardScoreColour(result.rows[i].doc.matrix_score_phrase_after);

									if( !factory.procedure_pdf_builder.data.structured_procedure.procedure_record.mr_matrix_score_initial ) {
										factory.procedure_pdf_builder.data.structured_procedure.procedure_record.mr_matrix_score_initial = result.rows[i].doc.matrix_score_initial;
										factory.procedure_pdf_builder.data.structured_procedure.procedure_record.mr_matrix_score_phrase_initial = result.rows[i].doc.matrix_score_phrase_initial;
										factory.procedure_pdf_builder.data.structured_procedure.procedure_record.mr_initial_colour = result.rows[i].doc.initial_colour;
									} else {

										if( result.rows[i].doc.matrix_score_initial > factory.procedure_pdf_builder.data.structured_procedure.procedure_record.mr_matrix_score_initial ) {
											factory.procedure_pdf_builder.data.structured_procedure.procedure_record.mr_matrix_score_initial = result.rows[i].doc.matrix_score_initial;
											factory.procedure_pdf_builder.data.structured_procedure.procedure_record.mr_matrix_score_phrase_initial = result.rows[i].doc.matrix_score_phrase_initial;
											factory.procedure_pdf_builder.data.structured_procedure.procedure_record.mr_initial_colour = result.rows[i].doc.initial_colour;
										}

									}

									factory.procedure_pdf_builder.data.hazards.push(result.rows[i].doc);
								}

								i++;
							}

							options.skip = 1;
							options.startkey = result.rows[ result.rows.length - 1 ].id;

							result.rows = null;

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
			getProcedureControls: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.mr_controls;

				var options = {
					limit: 100, 
					include_docs: true
				};

				fetchNextPage(fetch_defer).then(function() {

					factory.procedure_pdf_builder.data.controls = $filter('orderBy')(factory.procedure_pdf_builder.data.controls, 'date_added');

					var filters = {
						record_type: 'rrm', 
						user_id: authFactory.cloudUserId(),
						company_id: authFactory.cloudCompanyId(),
						status: 1 // LIVE
					};

					factory.dbUtils.getRrmList(filters).then(function(rrm_list) {

						if( rrm_list.length == 0 ) {
							console.log("NO RRMS");
							defer.resolve();
							return defer.promise;
						}

						// CALC CONTROLS RRM3 ICON
						var ci = 0;
						var clen = factory.procedure_pdf_builder.data.controls.length;

						while(ci < clen) {

							var control_num = ci + 1;

							factory.procedure_pdf_builder.data.controls[ci].index_icon_path = "../images/haz_con_numbers/C" + control_num + ".png";

							var rrm_i = 0;
							var rrm_len = rrm_list.length;

							while(rrm_i < rrm_len) {

								if( factory.procedure_pdf_builder.data.controls[ci].rrm3 && parseInt(factory.procedure_pdf_builder.data.controls[ci].rrm3) == parseInt(rrm_list[rrm_i].ID) ) {
										
									console.log("RRM RECORD");
									console.log(rrm_list[ rrm_i ]);

									factory.procedure_pdf_builder.data.controls[ci].icon_url = rrm_list[rrm_i].url;
								}

								rrm_i++;
							}

							ci++;
						}

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

							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								// IF PARENT TASK HAS NOT BEEN FETCHED
								if( factory.procedure_pdf_builder.fetched_task_ids.indexOf(result.rows[i].doc.task_id) === -1 ) {
									errors++;
								}

								// IF THE CONTROL IS NOT LIVE
								if( !result.rows[i].doc.hasOwnProperty('status') || result.rows[i].doc.status != 2 ) {
									errors++;
								}

								if( errors == 0 ) {
									factory.procedure_pdf_builder.fetched_control_ids.push(result.rows[i].doc._id);

									result.rows[i].doc.date_added = parseInt(result.rows[i].doc.date_added);

									result.rows[i].doc.media = [];
									result.rows[i].doc.icon_url = null;

									factory.procedure_pdf_builder.data.controls.push(result.rows[i].doc);
								}

								i++;
							}

							options.skip = 1;
							options.startkey = result.rows[ result.rows.length - 1 ].id;

							result.rows = null;

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
			getProcedureHazardControlRelations: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.hazard_control_relations;

				var options = {
					limit: 100, 
					include_docs: true
				};

				fetchNextPage(fetch_defer).then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var i = 0; 
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								// IF RELATED HAZARD HAS NOT BEEN FETCHED
								if( factory.procedure_pdf_builder.fetched_hazard_ids.indexOf(result.rows[i].doc.hazard_id) === -1 ) {
									errors++;
								}

								// IF RELATED CONTROL HAS NOT BEEN FETCHED
								if( factory.procedure_pdf_builder.fetched_control_ids.indexOf(result.rows[i].doc.control_item_id) === -1 ) {
									errors++;
								}

								// IF HAZARD-CONTROL RELATION IS NOT LIVE
								if( !result.rows[i].doc.hasOwnProperty('status') || result.rows[i].doc.status != 1 ) {
									errors++;
								} 

								if( errors == 0 ) {
									factory.procedure_pdf_builder.data.hazard_control_relations.push(result.rows[i].doc);
								}

								i++;
							}

							options.skip = 1;
							options.startkey = result.rows[ result.rows.length - 1 ].id;

							result.rows = null;

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
			getProcedureMedia: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();
				var url_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.media;

				var options = {
					limit: 100, 
					include_docs: true
				};

				var filtered_media = [];

				// FETCH MEDIA
				fetchNextPage(fetch_defer).then(function() {

					// GET URLS AND INDEX AGAINST PARENT RECORDS
					setNextMediaUrlThenIndex(url_defer, 0).then(function() {

						console.log("FETCHED MEDIA");
						console.log(filtered_media);

						var media_to_download = [];

						var i = 0;
						var len = filtered_media.length;

						var file_download_required = false;

						while(i < len) {

							if( !filtered_media[i].hasOwnProperty('file_downloaded') || !filtered_media[i].file_downloaded ) {
								file_download_required = true;
								media_to_download.push(filtered_media[i]);
							}

							i++;
						}

						if( file_download_required ) {
							factory.procedure_pdf_builder.data.file_download_required = true;
							factory.procedure_pdf_builder.data.media_to_download = media_to_download;
						}

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					function setNextMediaUrlThenIndex(defer, i) {

						if( i > filtered_media.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						// FETCH MEDIA ATTACHMENT URL
						mediaFactory.dbUtils.getAttachmentUrl(filtered_media[i]._id, filtered_media[i].attachment_key).then(function(url) {

							if( url == 'corrupt_file' ) {
								url = '../images/custom_icons/No Media.png';
							} else {
								factory.utils.browser_img_urls.push(url);
							}

							filtered_media[i].url = url;

							if( filtered_media[i].record_type == 'asset' ) {
								factory.procedure_pdf_builder.data.structured_procedure.subject_record.media.push(filtered_media[i]);
							}

							if( filtered_media[i].record_type == 'task' ) {

								if( filtered_media[i].hasOwnProperty('is_signature') && filtered_media[i].is_signature == 'Yes' && filtered_media[i].record_id == factory.procedure_pdf_builder.data.structured_procedure.procedure_record._id ) {
									factory.procedure_pdf_builder.data.structured_procedure.procedure_record.signature_record = filtered_media[i];
								}

								var ti = 0;
								var tlen = factory.procedure_pdf_builder.data.steps.length;
								while(ti < tlen) {
									if( factory.procedure_pdf_builder.data.steps[ti]._id == filtered_media[i].record_id ) {
										factory.procedure_pdf_builder.data.steps[ti].media.push(filtered_media[i]);
									}

									ti++;
								}
							}

							if( filtered_media[i].record_type == 'assessment_hazard' ) {
								var hi = 0;
								var hlen = factory.procedure_pdf_builder.data.hazards.length;
								while(hi < hlen) {
									if( factory.procedure_pdf_builder.data.hazards[hi]._id == filtered_media[i].record_id ) {
										factory.procedure_pdf_builder.data.hazards[hi].media.push(filtered_media[i]);
									}

									hi++;
								}
							}

							if( filtered_media[i].record_type == 'control_item' ) {
								var ci = 0;
								var clen = factory.procedure_pdf_builder.data.controls.length;
								while(ci < clen) {
									if( factory.procedure_pdf_builder.data.controls[ci]._id == filtered_media[i].record_id ) {
										factory.procedure_pdf_builder.data.controls[ci].media.push(filtered_media[i]);
									}

									ci++;
								}
							}

							i++;

							setNextMediaUrlThenIndex(defer, i);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var i = 0;
							var len = result.rows.length;

							var wanted_record_types = ['asset','task','assessment_hazard','control_item'];

							while(i < len) {
								var errors = 0;

								// IF NOT TASK, HAZARD OR CONTROL IMAGE
								if( wanted_record_types.indexOf(result.rows[i].doc.record_type) === -1 ) {
									errors++;
								}

								// DON'T FETCH VIDEOS FOR PDF
								if( result.rows[i].doc.hasOwnProperty('is_video') && result.rows[i].doc.is_video ) {
									errors++;
								}

								// DON'T FETCH AUDIO FOR PDF
								if( result.rows[i].doc.hasOwnProperty('is_audio') && result.rows[i].doc.is_audio ) {
									errors++;
								}

								// ONLY LIVE MEDIA
								if( !result.rows[i].doc.hasOwnProperty('status') || result.rows[i].doc.status != 1 ) {
									errors++;
								}

								// IF ASSET MEDIA AND ASSET NOT FETCHED
								if( result.rows[i].doc.record_type == 'asset' && factory.procedure_pdf_builder.data.structured_procedure.subject_record._id != result.rows[i].doc.record_id ) {
									errors++;
								}

								// IF TASK MEDIA AND TASK NOT FETCHED
								if( result.rows[i].doc.record_type == 'task' && factory.procedure_pdf_builder.fetched_task_ids.indexOf(result.rows[i].doc.record_id) === -1 && result.rows[i].doc.record_id != factory.procedure_pdf_builder.data.structured_procedure.procedure_record._id ) {
									errors++;
								}

								// IF HAZARD MEDIA AND HAZARD NOT FETCHED
								if( result.rows[i].doc.record_type == 'assessment_hazard' && factory.procedure_pdf_builder.fetched_hazard_ids.indexOf(result.rows[i].doc.record_id) === -1 ) {
									errors++;
								}

								// IF CONTROL MEDIA AND CONTROL NOT FETCHED
								if( result.rows[i].doc.record_type == 'control_item' && factory.procedure_pdf_builder.fetched_control_ids.indexOf(result.rows[i].doc.record_id) === -1 ) {
									errors++;
								}

								if( errors == 0 ) {
									filtered_media.push(result.rows[i].doc);
								}

								i++;
							}

							options.skip = 1;
							options.startkey = result.rows[ result.rows.length - 1 ].id;

							result.rows = null;

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
			structureProcedureDataForPdf: function() {

				factory.procedure_pdf_builder.findUniqueHazardTypes();
				factory.procedure_pdf_builder.findUniqueControlTypes();

				factory.procedure_pdf_builder.indexHazardsControls();

				factory.procedure_pdf_builder.orderStepsMedia();

				factory.procedure_pdf_builder.indexStepsHazards();

				factory.procedure_pdf_builder.indexSectionsHazards();
				factory.procedure_pdf_builder.indexSectionsSteps();

				// CLEAR NOT NEEDED FACTORY ITEMS
				factory.procedure_pdf_builder.data.steps = [];
				factory.procedure_pdf_builder.data.controls = [];
				factory.procedure_pdf_builder.data.hazard_control_relations = [];
				factory.procedure_pdf_builder.fetched_task_ids = [];
				factory.procedure_pdf_builder.fetched_hazard_ids = [];
				factory.procedure_pdf_builder.fetched_control_ids = [];
			},
			findUniqueHazardTypes: function() {

				var hazard_type_ids = [];
				var hazard_types = [];

				var i = 0;
				var len = factory.procedure_pdf_builder.data.hazards.length;

				while(i < len) {

					// IF HAZARD TYPE SET AND NOT YET COLLECTED
					if( factory.procedure_pdf_builder.data.hazards[i].hazard_type && hazard_type_ids.indexOf(factory.procedure_pdf_builder.data.hazards[i].hazard_type) === -1 ) {

						var hazard_type_record = {
							hazard_type: factory.procedure_pdf_builder.data.hazards[i].hazard_type,
							hazard_type_name: factory.procedure_pdf_builder.data.hazards[i].hazard_type_name,
							hazard_type_icon_path: factory.procedure_pdf_builder.data.hazards[i].hazard_type_icon_path
						}

						hazard_type_ids.push(hazard_type_record.hazard_type);
						hazard_types.push(hazard_type_record);

					}

					i++;
				}

				factory.procedure_pdf_builder.data.unique_hazard_types = hazard_types;

			},
			findUniqueControlTypes: function() {

				var rrm3_ids = [];
				var rrm3_list = [];

				var i = 0;
				var len = factory.procedure_pdf_builder.data.controls.length;

				console.log("FIND UNIQUE CONTROL TYPES");
				console.log( JSON.stringify(factory.procedure_pdf_builder.data.controls, null, 2) );

				while(i < len) {

					// IF RRM3 IS SET AND NOT YET COLLECTED
					if( factory.procedure_pdf_builder.data.controls[i].rrm3 && rrm3_ids.indexOf(factory.procedure_pdf_builder.data.controls[i].rrm3) === -1 ) {

						var rrm3_record = {
							rrm3: factory.procedure_pdf_builder.data.controls[i].rrm3,
							rrm3_name: factory.procedure_pdf_builder.data.controls[i].rrm3_name,
							icon_url: factory.procedure_pdf_builder.data.controls[i].icon_url
						}

						rrm3_ids.push(rrm3_record.rrm3);
						rrm3_list.push(rrm3_record);

					}

					i++;
				}

				factory.procedure_pdf_builder.data.unique_control_types = rrm3_list;

			},	
			indexHazardsControls: function() {

				var i = 0;
				var len = factory.procedure_pdf_builder.data.hazards.length;

				// FIND CONTROLS LINKED TO A HAZARD
				function findRelatedControls(hazard_id) {

					var related_control_ids = [];
					var related_controls = [];

					var relations_i = 0;
					var relations_len = factory.procedure_pdf_builder.data.hazard_control_relations.length;

					// FIND RELEVANT CONTROL IDS FROM HAZARD-CONTROL RELATIONS
					while(relations_i < relations_len) {

						if( factory.procedure_pdf_builder.data.hazard_control_relations[relations_i].hazard_id == hazard_id ) {
							related_control_ids.push(factory.procedure_pdf_builder.data.hazard_control_relations[relations_i].control_item_id);
						}

						relations_i++;
					}

					var controls_i = 0;
					var controls_len = factory.procedure_pdf_builder.data.controls.length;

					// FIND CONTROL RECORDS FROM RELATED CONTROL IDS
					while(controls_i < controls_len) {

						if( related_control_ids.indexOf(factory.procedure_pdf_builder.data.controls[controls_i]._id) !== -1 ) {
							related_controls.push(factory.procedure_pdf_builder.data.controls[controls_i]);
						} 

						controls_i++;
					}

					return related_controls;
				}

				// FOR EACH HAZARD, ATTEMPT FIND RELATED CONTROLS
				while(i < len) {

					factory.procedure_pdf_builder.data.hazards[i].controls = findRelatedControls(factory.procedure_pdf_builder.data.hazards[i]._id);

					i++;
				}

			},
			indexSectionsHazards: function() {

				var i = 0;
				var len = factory.procedure_pdf_builder.data.structured_procedure.sections.length;

				function findHazards(section_id) {

					var hazards = [];

					var hazard_i = 0;
					var hazard_len = factory.procedure_pdf_builder.data.hazards.length;

					while(hazard_i < hazard_len) {

						if( factory.procedure_pdf_builder.data.hazards[hazard_i].task_id == section_id ) {
							hazards.push(factory.procedure_pdf_builder.data.hazards[hazard_i]);
						}

						hazard_i++;
					}

					return hazards;
				}

				while(i < len) {

					factory.procedure_pdf_builder.data.structured_procedure.sections[i].hazards_w_controls = findHazards(factory.procedure_pdf_builder.data.structured_procedure.sections[i]._id);

					i++;
				}

			},
			orderStepsMedia: function() {

				var i = 0;
				var len = factory.procedure_pdf_builder.data.steps.length;

				while(i < len) {

					factory.procedure_pdf_builder.data.steps[i].media = $filter('orderBy')(factory.procedure_pdf_builder.data.steps[i].media, 'sequence_number');

					i++;
				}

			},
			indexStepsHazards: function() {

				var i = 0;
				var len = factory.procedure_pdf_builder.data.steps.length;

				function findHazards(step_id) {

					var hazards = [];

					var hazard_i = 0;
					var hazard_len = factory.procedure_pdf_builder.data.hazards.length;

					while(hazard_i < hazard_len) {

						if( factory.procedure_pdf_builder.data.hazards[hazard_i].task_id == step_id ) {
							hazards.push(factory.procedure_pdf_builder.data.hazards[hazard_i]);
						}

						hazard_i++;
					}

					return hazards;
				}

				while(i < len) {

					factory.procedure_pdf_builder.data.steps[i].hazards_w_controls = findHazards(factory.procedure_pdf_builder.data.steps[i]._id);

					i++;
				}

			},
			indexSectionsSteps: function() {

				var i = 0;
				var len = factory.procedure_pdf_builder.data.structured_procedure.sections.length;

				function findSteps(section) {

					var section_id = section._id;

					var steps = [];

					var step_i = 0;
					var step_len = factory.procedure_pdf_builder.data.steps.length;

					while(step_i < step_len) {

						if( factory.procedure_pdf_builder.data.steps[step_i].parent_task_id == section_id ) {
							factory.procedure_pdf_builder.data.steps[step_i].section_title = section.title;
							steps.push(factory.procedure_pdf_builder.data.steps[step_i]);
						}

						step_i++;
					}

					steps = $filter('orderBy')(steps, 'sequence_number');

					var step_i2 = 0;
					var step_len2 = steps.length;

					while(step_i2 < step_len2) {

						steps[step_i2].section_index = section.section_index;
						steps[step_i2].step_index = step_i2 + 1;

						// ADD TO CONCERNS ARRAY
						if( steps[step_i2].hasOwnProperty('concern_category') && steps[step_i2].concern_category ) {

							var concern_record = {
								section_index: steps[step_i2].section_index,
								step_index: steps[step_i2].step_index,
								section_title: steps[step_i2].section_title,
								step_name: steps[step_i2].description,
								concern_category: steps[step_i2].concern_category,
								concern_description: steps[step_i2].concern_description
							}

							if( concern_record.concern_category == 'Severe' ) {
								concern_record.icon_path = '../images/pdf_images/SC Red.jpg';
							}

							if( concern_record.concern_category == 'Major' ) {
								concern_record.icon_path = '../images/pdf_images/SC Orange.png';
							}

							if( concern_record.concern_category == 'Minor' ) {
								concern_record.icon_path = '../images/pdf_images/SC Yellow.png';
							}

							steps[step_i2].concern_icon_path = concern_record.icon_path;

							factory.procedure_pdf_builder.data.significant_concerns.push(concern_record);
						}

						step_i2++;
					}

					return steps;
				}

				while(i < len) {

					factory.procedure_pdf_builder.data.structured_procedure.sections[i].section_index = i + 1;

					factory.procedure_pdf_builder.data.structured_procedure.sections[i].steps = findSteps(factory.procedure_pdf_builder.data.structured_procedure.sections[i]);

					i++;
				}

			}
		}

		factory.inspection_pdf_builder = {
			data: {
				asset_record: null, 
				project_record: null,
				core_asset_record: null,
				assessments: [],
				file_download_required: false,
				media_to_download: []
			},
			fetched_risk_ids: [],
			resetPdfBuilderData: function() {
				factory.inspection_pdf_builder.data.asset_record = null;
				factory.inspection_pdf_builder.data.project_record = null;
				factory.inspection_pdf_builder.data.core_asset_record = null;
				factory.inspection_pdf_builder.data.assessments = [];

				factory.inspection_pdf_builder.data.file_download_required = false;
				factory.inspection_pdf_builder.data.media_to_download = [];

				factory.inspection_pdf_builder.fetched_risk_ids = [];

				factory.utils.revokeBrowserImgUrls();
			},
			collectInspectionRasDataForPdf: function(asset_id) {
				var defer = $q.defer();

				factory.inspection_pdf_builder.resetPdfBuilderData();

				factory.inspection_pdf_builder.fetchInspectionRasDataForPdf(asset_id).then(function() {

					// CLEAN UP NOT NEEDED FACTORY DATA
					factory.inspection_pdf_builder.fetched_risk_ids = [];

					defer.resolve();

				}, function(error) {
					factory.inspection_pdf_builder.resetPdfBuilderData();
					defer.reject(error);
				});

				return defer.promise;
			},
			fetchInspectionRasDataForPdf: function(asset_id) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var stages = ['asset','project','core_asset','assessments','media'];

				fetchNextStage(fetch_defer, 0).then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextStage(defer, active_index) {

					if( active_index > stages.length - 1 ) {
						defer.resolve();
						return defer.promise;
					}

					if( stages[active_index] == 'asset' ) {

						factory.inspection_pdf_builder.getInspectionRecord(asset_id).then(function() {

							active_index++;

							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

					}

					if( stages[active_index] == 'project' ) {

						factory.inspection_pdf_builder.getProjectRecord(factory.inspection_pdf_builder.data.asset_record.project_id).then(function() {

							active_index++;

							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

					}

					if( stages[active_index] == 'core_asset' ) {

						factory.inspection_pdf_builder.getCoreAssetRecord(factory.inspection_pdf_builder.data.asset_record).then(function(core_asset_record) {

							factory.inspection_pdf_builder.data.core_asset_record = core_asset_record;

							active_index++;

							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

					}

					if( stages[active_index] == 'assessments' ) {

						factory.inspection_pdf_builder.getRiskAssessments(asset_id).then(function() {

							active_index++;

							fetchNextStage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

					}

					if( stages[active_index] == 'media' ) {

						factory.inspection_pdf_builder.getInspectionMedia().then(function() {

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
			getInspectionRecord: function(asset_id) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.assets;

				db.get(asset_id).then(function(doc) {

					doc.media = [];

					factory.inspection_pdf_builder.data.asset_record = doc;

					defer.resolve();

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getProjectRecord: function(project_id) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.projects;

				db.get(project_id).then(function(project_doc) {

					factory.inspection_pdf_builder.data.project_record = project_doc;

					defer.resolve();

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getCoreAssetRecord: function(asset_record) {
				var defer = $q.defer();

				// IF INSPECTION NOT LINKED TO CORE OR NO QR SCANNED
				if( (!asset_record.hasOwnProperty('rm_register_asset_id') || !asset_record.rm_register_asset_id) && (!asset_record.hasOwnProperty('qr_code') || !asset_record.qr_code) ) {
					defer.resolve(null);
					return defer.promise;
				}

				if( asset_record.hasOwnProperty('rm_register_asset_id') && asset_record.rm_register_asset_id ) {

					// FETCH CORE ASSET BY RM ID
					var db = riskmachDatabasesFactory.databases.collection.register_assets;

					var selector = {
						table: 'register_assets',
						company_id: authFactory.getActiveCompanyId(),
						user_id: authFactory.cloudUserId()
					};

					db.find({
						selector: selector
					}).then(function(results){

						var core_asset_record = null;

						var i = 0;
						var len = results.docs.length;

						while(i < len) {
							var matches = 0;

							// IF MACHINE AND NOT DELETED
							if( results.docs[i].hasOwnProperty('rm_id') && results.docs[i].rm_id == asset_record.rm_register_asset_id ) {
								matches++;
							}

							if( matches > 0 ) {
								core_asset_record = results.docs[i];
							}

							i++;
						}

						defer.resolve(core_asset_record);

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				}

				if( asset_record.hasOwnProperty('qr_code') && asset_record.qr_code ) {

					// ATTEMPT FIND QR RECORD
					qrScannerFactory.dbUtils.getQrRecord(asset_record.qr_code).then(function(qr_record) {

						if( !qr_record ) {
							defer.resolve(null);
							return defer.promise;
						}

						var db = riskmachDatabasesFactory.databases.collection.register_assets;

						// USE QR RECORD TO ATTEMPT FIND CORE ASSET
						db.get(qr_record.record_id).then(function(core_asset_doc) {

							defer.resolve(core_asset_doc);

						}).catch(function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

				}

				return defer.promise;
			},
			getRiskAssessments: function(asset_id) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.assessments;

				var options = {
					limit: 100, 
					include_docs: true
				}

				fetchNextPage(fetch_defer).then(function() {

					// ORDER BY
					factory.inspection_pdf_builder.data.assessments = $filter('orderBy')(factory.inspection_pdf_builder.data.assessments, 'date_added');

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

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

								if( !result.rows[i].doc.hasOwnProperty('asset_id') || result.rows[i].doc.asset_id != asset_id ) {
									errors++;
								}

								// FORMAT AND ADD TO ARRAY
								if( errors == 0 ) {
									factory.inspection_pdf_builder.fetched_risk_ids.push(result.rows[i].doc._id);

									result.rows[i].doc = factory.formatting.formatRiskRecord(result.rows[i].doc);
									
									factory.inspection_pdf_builder.data.assessments.push(result.rows[i].doc);
								}

								i++;
							}

							options.skip = 1;
							options.startkey = result.rows[ result.rows.length - 1 ].id;

							// CLEAN UP
							result.rows = null;

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
			getInspectionMedia: function() {
				var defer = $q.defer();
				var fetch_defer = $q.defer();
				var url_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.media;

				var options = {
					limit: 100, 
					include_docs: true
				};

				var filtered_media = [];

				// FETCH MEDIA
				fetchNextPage(fetch_defer).then(function() {

					// GET URLS AND INDEX AGAINST PARENT RECORDS
					setNextMediaUrlThenIndex(url_defer, 0).then(function() {

						console.log("FETCHED MEDIA");
						console.log(filtered_media);

						var media_to_download = [];

						var i = 0;
						var len = filtered_media.length;

						var file_download_required = false;

						while(i < len) {

							if( !filtered_media[i].hasOwnProperty('file_downloaded') || !filtered_media[i].file_downloaded ) {
								file_download_required = true;
								media_to_download.push(filtered_media[i]);
							}

							i++;
						}

						if( file_download_required ) {
							factory.inspection_pdf_builder.data.file_download_required = true;
							factory.inspection_pdf_builder.data.media_to_download = media_to_download;
						}

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					function setNextMediaUrlThenIndex(defer, i) {

						if( i > filtered_media.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						// FETCH MEDIA ATTACHMENT URL
						mediaFactory.dbUtils.getAttachmentUrl(filtered_media[i]._id, filtered_media[i].attachment_key).then(function(url) {

							if( url == 'corrupt_file' ) {
								url = '../images/custom_icons/No Media.png';
							} else {
								factory.utils.browser_img_urls.push(url);
							}

							filtered_media[i].url = url;

							if( filtered_media[i].record_type == 'asset' ) {
								factory.inspection_pdf_builder.data.asset_record.media.push(filtered_media[i]);
							}

							if( filtered_media[i].record_type == 'assessment' ) {
								var ri = 0;
								var rlen = factory.inspection_pdf_builder.data.assessments.length;
								while(ri < rlen) {
									if( factory.inspection_pdf_builder.data.assessments[ri]._id == filtered_media[i].record_id ) {

										// IF LESS THAN 3, PUSH MEDIA TO FRONT PAGE ARRAY
										if( factory.inspection_pdf_builder.data.assessments[ri].front_page_media.length < 3 ) {
											// CALCULATE MEDIA RECORD DISPLAY NUMBER
											filtered_media[i].media_number = factory.inspection_pdf_builder.data.assessments[ri].front_page_media.length + 1;

											factory.inspection_pdf_builder.data.assessments[ri].front_page_media.push(filtered_media[i]);
										} else {
											// PUSH MEDIA TO OVERFLOW ARRAY

											// CALCULATE MEDIA RECORD DISPLAY NUMBER
											filtered_media[i].media_number = factory.inspection_pdf_builder.data.assessments[ri].overflow_media.length + 4;

											factory.inspection_pdf_builder.data.assessments[ri].overflow_media.push(filtered_media[i]);
										}

									}

									ri++;
								}
							}

							i++;

							setNextMediaUrlThenIndex(defer, i);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) {

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) {

							var i = 0;
							var len = result.rows.length;

							var wanted_record_types = ['asset','assessment'];

							while(i < len) {
								var errors = 0;

								// IF NOT ASSET OR RISK IMAGE
								if( wanted_record_types.indexOf(result.rows[i].doc.record_type) === -1 ) {
									errors++;
								}

								// ONLY LIVE MEDIA
								if( !result.rows[i].doc.hasOwnProperty('status') || result.rows[i].doc.status != 1 ) {
									errors++;
								}

								// IF ASSET MEDIA AND ASSET NOT FETCHED
								if( result.rows[i].doc.record_type == 'asset' && factory.inspection_pdf_builder.data.asset_record._id != result.rows[i].doc.record_id ) {
									errors++;
								}

								// IF RISK MEDIA AND RISK NOT FETCHED
								if( result.rows[i].doc.record_type == 'assessment' && factory.inspection_pdf_builder.fetched_risk_ids.indexOf(result.rows[i].doc.record_id) === -1 ) {
									errors++;
								}

								if( errors == 0 ) {
									filtered_media.push(result.rows[i].doc);
								}

								i++;
							}

							options.skip = 1;
							options.startkey = result.rows[ result.rows.length - 1 ].id;

							result.rows = null;

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
			}
		}

		factory.formatting = {
			formatRiskRecord: function(assessment_record) {

				assessment_record.risk_initial_colour = factory.inspection_utils.riskLevelStyle(assessment_record, 'before');
				assessment_record.risk_after_colour = factory.inspection_utils.riskLevelStyle(assessment_record, 'after');

				assessment_record.display_before_phrase = null;
				assessment_record.display_after_phrase = null;

				assessment_record.risk_before_fs = '12pt';
				assessment_record.risk_after_fs = '6pt';

				assessment_record.additional_before_text = null;
				assessment_record.additional_after_text = null;

				// PHA (1)
				if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 1 ) {
					assessment_record.display_before_phrase = assessment_record.hrn_phrase_name_initial;
					assessment_record.display_after_phrase = assessment_record.hrn_phrase_name_after;

					if( assessment_record.display_before_phrase == 'Not Reasonably Foreseeable' ) {
						assessment_record.risk_before_fs = '6pt';
					}
				}

				// MATRIX (2)
				if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 2 ) {
					assessment_record.display_before_phrase = assessment_record.matrix_score_phrase_initial;
					assessment_record.display_after_phrase = assessment_record.matrix_score_phrase_after;
				}

				// RIA (4)
				if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 4 ) {
					assessment_record.display_before_phrase = assessment_record.ria_risk_level_initial;
					assessment_record.display_after_phrase = assessment_record.ria_risk_level_after;

					assessment_record.risk_after_fs = '12pt';
				}

				// RACKING (5)
				if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 5 ) {
					assessment_record.display_before_phrase = assessment_record.matrix_score_phrase_initial;
					assessment_record.display_after_phrase = null;

					assessment_record.risk_before_fs = '8pt';

					if( assessment_record.display_before_phrase == 'Relevant Observation' ) {
						assessment_record.additional_before_text = 'No action required. The auditor has just logged something of noticible interest';
					}

					if( assessment_record.display_before_phrase == 'Surveillance only' ) {
						assessment_record.additional_before_text = 'No immediate risk but this should be examined upon next re-inspection';
					}

					if( assessment_record.display_before_phrase == 'Hazardous Damage' ) {
						assessment_record.additional_before_text = 'There is damage that exceeds the permissible limits. The damage is suffciently severe to warrant remedial work but not so severe as to warrant the immediate off-loading of the rack. Once the load is removed from a damaged component, the component shall not be reloaded until repairs completed.';
					}

					if( assessment_record.display_before_phrase == 'Very Serious Damage' ) {
						assessment_record.additional_before_text = 'IMMEDIATE ACTION REQUIRED! A critical level of damage has been identified, the racking will should be immediately off-loaded and isolated from future use until repair work is carried out.';
					}
				}

				// DETERIORATION (6)
				if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 6 ) {
					assessment_record.display_before_phrase = assessment_record.matrix_score_phrase_initial;
					assessment_record.display_after_phrase = 'Closed';
					assessment_record.additional_after_text = 'Hazard closed after implementation of control measure';

					assessment_record.risk_after_fs = '12pt';

					if( assessment_record.display_before_phrase == 'Closed' ) {
						assessment_record.hazard_description = 'Action has been taken as required and there is no further risk as a direct consequence of the defect identified';
						assessment_record.additional_before_text = '';
					}

					if( assessment_record.display_before_phrase == 'A' ) {
						assessment_record.hazard_description = 'There is no immediate risk. The components are considered to be safe and servicable. The components are recorded as suitable for further service until the next inspection.  They are clearly identified (e.g highlighted by photos and / or labelling) for specific re-exanination and re-assessment at the next inspection(s).';
						assessment_record.additional_before_text = 'Monitor / Improve';
					}

					if( assessment_record.display_before_phrase == 'B' ) {
						assessment_record.hazard_description = 'Identification of any other part found to be deteriorating and which requires to be rectified';
						assessment_record.additional_before_text = 'Concern';
					}

					if( assessment_record.display_before_phrase == 'C' ) {
						assessment_record.hazard_description = 'Description of any defect which is or could become a danger to persons. Details of the defect, any repair, renewal or alteration required to remedy, and any timescales required (immediate or within a certain timeframe).';
						assessment_record.additional_before_text = 'Serious concern';
					}
				}

				// SIMPLE (3)
				if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 3 ) {
					assessment_record.display_before_phrase = assessment_record.simple_risk_phrase_initial;
					assessment_record.display_after_phrase = assessment_record.simple_risk_phrase_after;
				}

				assessment_record.hazard_desc_overflow = null;
				assessment_record.control_desc_overflow = null;

				if( assessment_record.hazard_description && assessment_record.hazard_description.length > 400 ) {
					// GET THE REMAINING CHARACTERS AFTER THE 400 CHARACTER LIMIT
					assessment_record.hazard_desc_overflow = assessment_record.hazard_description.slice(400);
				}

				if( assessment_record.control_description && assessment_record.control_description.length > 620 ) {
					// GET THE REMAINING CHARACTERS AFTER THE 620 CHARACTER LIMIT
					assessment_record.control_desc_overflow = assessment_record.control_description.slice(620);
				}

				assessment_record.front_page_media = [];
				assessment_record.overflow_media = [];

				return assessment_record;
			}
		}

		factory.generatePdf = function(record_id, record_type, pdf_type) 
		{
			var defer = $q.defer();

			// FETCH RECORD TO SET PDF FILE NAME
			factory.dbUtils.getRecord(record_id, record_type).then(function(record) {

				var file_name = factory.utils.calcPdfFileName(record, record_type);

				var element = null;
				var options = null;

				if( pdf_type == 'procedure' ) {
					element = $("#procedurePdf")[0].innerHTML;
					options = {
						margin: 1,
						filename: file_name,
						// pagebreak: { before: '.break-before', avoid: ['.break-avoid'] },
						pagebreak: { mode: 'avoid-all', after: 'break-before' },
						html2canvas: { useCORS: true, letterRendering: true, scale: 1 },
						jsPDF: { orientation: 'p', unit: 'pt', format: 'a4' }
					}
				}

				var html2pdf_instance = html2pdf().set(options).from(element).toPdf().get('pdf').then(function(pdf) {
				    var totalPages = pdf.internal.getNumberOfPages();
				    // for (i = 1; i <= totalPages; i++) {
				    //     pdf.setPage(i);
				    //     pdf.setFontSize(10);
				    //     pdf.setTextColor(100);
				    //     pdf.text('Page ' + i + ' of ' + totalPages, (pdf.internal.pageSize.getWidth() / 2.3), 10);
				    // }
				}).outputPdf('blob').then(function(blob_output) {

					var pdf_blob = new Blob([ blob_output ], {type: 'application/pdf'});

					// CLEAN UP
			    	html2pdf_instance = null;

			    	// SAVE PDF AS MEDIA ATTACHMENT
					factory.savePdfMediaRecord(record_id, record._rev, record_type, file_name, pdf_blob).then(function(saved_doc) {

						var pdf_data = {
							media_record: saved_doc,
							pdf_blob: pdf_blob
						}

						factory.dbUtils.markRecordPdfGenerated(record._id, record_type, saved_doc._id).then(function(result) {

							record._id = result.id;
							record._rev = result.rev;

							defer.resolve(pdf_data);

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
					// CLEAN UP
			    	html2pdf_instance = null;
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.savePdfMediaRecord = function(record_id, record_rev, record_type, file_name, pdf_blob) 
		{
			var defer = $q.defer();

			var media_record = mediaFactory.models.newMedia(record_id, record_type);

			media_record.record_rev = record_rev;

			media_record.file_name = file_name;
			media_record.attachment_key = file_name;

			mediaFactory.dbUtils.checkPdfExists(record_id, record_type, file_name).then(function(existing_pdf) {

				// IF EXISTING PDF AND RECORD HAS NEW REV SINCE EXISTING PDF CREATION
				if( existing_pdf && existing_pdf.record_rev != record_rev ) {

					// REMOVE OUT OF DATE PDF
					dataCleanupFactory.removeDocBatch([existing_pdf], 'rm_media').then(function() {

						// SAVE NEW PDF
						mediaFactory.dbUtils.savePdfMediaRecord(media_record, file_name, pdf_blob).then(function(saved_doc) {

							defer.resolve(saved_doc);

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}

				// SAVE NEW PDF
				mediaFactory.dbUtils.savePdfMediaRecord(media_record, file_name, pdf_blob).then(function(saved_doc) {

					defer.resolve(saved_doc);

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

	function pdfGenDirective() 
	{
		var directive = {};

		directive.scope = {};

		directive.restrict = 'A';
		directive.controller = 'pdfGenController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/pdf-gen/tpl/pdf_generator.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

})()