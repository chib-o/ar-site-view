(function(){

	var app = angular.module('riskmachAssessmentUtils', ['angular-jwt','riskmachUtils','riskmachDatabases','riskmachProjectAssets','riskmachMedia','rmDrawingPad']);
	app.controller('reportRiskAssessmentBioController', reportRiskAssessmentBioController);
	app.controller('reportRiskAssessmentsListingController', reportRiskAssessmentsListingController);
	app.controller('riskMatrixController', riskMatrixController);
	app.controller('riskFormController', riskFormController);
	app.controller('rackingAssessmentMethodController', rackingAssessmentMethodController);
	app.controller('deteriorationAssessmentMethodController', deteriorationAssessmentMethodController);
	app.factory('riskMatrixFactory', riskMatrixFactory);
	app.factory('raFactory', raFactory);
	app.directive('riskMatrix5x5', riskMatrix5x5);
	app.directive('riskForm', riskForm);
	app.directive('rackingAssessmentMethod', rackingAssessmentMethod);
	app.directive('deteriorationAssessmentMethod', deteriorationAssessmentMethod);
	app.directive('reportRiskAssessments', reportRiskAssessments);
	app.directive('reportRiskAssessmentBio', reportRiskAssessmentBio);

	function reportRiskAssessmentBioController($scope, $rootScope, $q, $filter, raFactory, rmConnectivityFactory, mediaFactory, modelsFactory, rmUtilsFactory, authFactory, riskmachDatabasesFactory) 
	{
		var vm = this;

		vm.utils = {
			is_mobile: rmUtilsFactory.mobileCheck(),
			risk_bio: {
				assessment_id: null,
				record: null,
				loading: false,
				tabs: {
					active_tab: 'interface',
					changeTab: function(tab) {
						vm.utils.risk_bio.tabs.active_tab = tab;
					},
					tabActive: function(tab) {
						if( vm.utils.risk_bio.tabs.active_tab == tab ) {
							return true;
						} else {
							return false;
						}
					}
				},
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
				collapseAllAccordians: function(){
					setTimeout(function(){
						$('#AssessmentAccordion .collapse').collapse('hide');
						$scope.$apply();
					}, 0);
				},
				showAccordion: function(accordian_id){
					setTimeout(function(){
						$("#" + accordian_id).collapse('show');
						$scope.$apply();
					}, 0);	
				},
				start: function() {

					vm.utils.risk_bio.tabs.changeTab('interface');

					if( !vm.utils.risk_bio.assessment_id ) {
						vm.utils.risk_bio.error_handler.logError("No risk assessment ID provided");
						return;
					}

					vm.utils.risk_bio.getAssessmentRecord().then(function() {

						vm.utils.risk_closeout.start(vm.utils.risk_bio.record.rm_id);

						if( vm.utils.risk_bio.action == 'submit_for_review' ) {
							vm.utils.risk_closeout.makeDecision();
						}

						if( vm.utils.risk_bio.action == 'upload_evidence' || vm.utils.risk_bio.action == 'review_evidence' || vm.utils.risk_bio.action == 'browse_evidence' ) {
							// SHOW EVIDENCE ACCORDION
							vm.utils.risk_bio.showAccordion('AssessmentAccordion-evidence');
						}

						vm.utils.approve_assessment.start(vm.utils.risk_bio.record, null);

						// CLEAR CURRENT MEDIA
						vm.utils.risk_images.media_records = [];
						vm.utils.risk_images.visible_media = [];
						vm.utils.closeout_images.media_records = [];
						vm.utils.closeout_images.visible_media = [];

						// IF VERIFIED ON APP OR NOT A CLOUD DRAFT MANAGED RISK
						vm.utils.risk_images.setRecord(vm.utils.risk_bio.record);
						vm.utils.risk_images.getAllRecordAttachments(vm.utils.risk_images.record._id, 'assessment').then(function() {

							vm.utils.closeout_images.setRecord(vm.utils.risk_bio.record);
							vm.utils.closeout_images.getAllRecordAttachments(vm.utils.closeout_images.record._id, 'ra_closeout_evidence');

						});

					}, function(error) {
						vm.utils.risk_bio.error_handler.logError(error);
					});
				},
				getAssessmentRecord: function() {
					var defer = $q.defer();

					raFactory.dbUtils.assessments.getRiskRecord(vm.utils.risk_bio.assessment_id).then(function(record) {

						vm.utils.risk_bio.record = record;

						console.log("RISK ASSESSMENT FOR CLOSEOUT BIO PAGE");
						console.log(vm.utils.risk_bio.record);

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				displayPhrase: function(assessment_record, stage) {
					if( !assessment_record ) {
						return null;
					}

					// DEFAULT TO PHA PHRASES
					var display_before_phrase = assessment_record.hrn_phrase_name_initial;
					var display_after_phrase = assessment_record.hrn_phrase_name_after;

					// MATRIX
					if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 2 ) {
						display_before_phrase = assessment_record.matrix_score_phrase_initial;
						display_after_phrase = assessment_record.matrix_score_phrase_after;
					}

					// RIA
					if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 4 ) {
						display_before_phrase = assessment_record.ria_risk_level_initial;
						display_after_phrase = assessment_record.ria_risk_level_after;
					}

					// RACKING
					if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 5 ) {
						display_before_phrase = assessment_record.matrix_score_phrase_initial;
						display_after_phrase = null;
					}

					// DETERIORATION
					if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 6 ) {
						display_before_phrase = assessment_record.matrix_score_phrase_initial;
						display_after_phrase = 'Closed';
					}

					// SIMPLE
					if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 3 ) {
						display_before_phrase = assessment_record.simple_risk_phrase_initial;
						display_after_phrase = assessment_record.simple_risk_phrase_after;
					}

					if( stage == 'before' ) {
						return display_before_phrase;
					}

					if( stage == 'after' ) {
						return display_after_phrase;
					}
				},
				displayRiskScore: function(assessment_record, stage) {
					if( !assessment_record ) {
						return null;
					}

					// DEFAULT TO PHA PHRASES
					var display_before_score = assessment_record.hrn_phrase_name_initial;
					var display_after_score = assessment_record.hrn_phrase_name_after;

					// MATRIX
					if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 2 ) {
						display_before_score = assessment_record.matrix_score_initial;
						display_after_score = assessment_record.matrix_score_after;
					}

					// RIA
					if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 4 ) {
						display_before_score = assessment_record.ria_risk_level_initial;
						display_after_score = assessment_record.ria_risk_level_after;
					}

					// RACKING
					if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 5 ) {
						display_before_score = assessment_record.matrix_score_initial;
						display_after_score = null;
					}

					// DETERIORATION
					if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 6 ) {
						display_before_score = assessment_record.matrix_score_initial;
						display_after_score = 'Closed';
					}

					// SIMPLE
					if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 3 ) {
						display_before_score = assessment_record.simple_risk_phrase_initial;
						display_after_score = assessment_record.simple_risk_phrase_after;
					}					

					if( stage == 'before' ) {
						return display_before_score;
					}

					if( stage == 'after' ) {
						return display_after_score;
					}
				},
				riskLevelStyle: function(record, stage){
					var style = {
						'border': '2px solid #49788C',
						'background-color': '#49788C',
						'color': '#fff'
					};

					if( !record )
					{
						return style;
					}

					var key_name = 'hrn_phrase_name_' + stage;

					if( record[key_name] == 'Unacceptable' )
					{
						style['border'] = '2px solid #49788C';
						style['background-color'] = '#49788C';
					}

					if( record[key_name] == 'Acceptable' )
					{
						style['border'] = '2px solid #49788C';
						style['background-color'] = '#49788C';
					}

					if( record[key_name] == 'Very Low' )
					{
						style['border'] = '2px solid #49788C';
						style['background-color'] = '#49788C';
					}

					if( record[key_name] == 'Low' )
					{
						style['border'] = '2px solid #49788C';
						style['background-color'] = '#49788C';
					}

					if( record[key_name] == 'Significant' )
					{
						style['border'] = '2px solid #C24E4F';
						style['background-color'] = '#C24E4F';
					}

					if( record[key_name] == 'Medium' )
					{
						style['border'] = '2px solid #F6BA75';
						style['background-color'] = '#F6BA75';
					}

					if( record[key_name] == 'High' )
					{
						style['border'] = '2px solid #C24E4F';
						style['background-color'] = '#C24E4F';
					}

					if( record[key_name] == 'Very High' )
					{
						style['border'] = '2px solid #C24E4F';
						style['background-color'] = '#C24E4F';
					}

					if( record[key_name] == 'Unacceptable' )
					{
						style['border'] = '2px solid #C24E4F';
						style['background-color'] = '#C24E4F';
					}

					return style;
				},
				hasAfterValue: function(record){

					if( !record )
					{
						return false;
					}

					var has_after = true;
					var no_after_methods = [5,6];
					var method_id = parseInt( record.assessment_method );

					if( no_after_methods.indexOf( method_id ) !== -1 )
					{
						has_after = false;
					}

					return has_after;
				},
				canReviewAssessment: function(ra_record) {
					var can_review = false;

					if( ra_record.is_deviation == 'Yes' ) {
						// CAN APPROVE DEVIATION
					} else {
						// CAN APPROVE CLOSEOUT
					}

					// remove this when have user permissions
					can_review = true;

					return can_review;
				},
				pleaseReviewFiles: function(){
					alert("Please approve or reject the provided evidence before making a decision");
				},
				reviewEvidence: function(){
					vm.utils.risk_bio.showAccordion('AssessmentAccordion-evidence');
				},
			},
			risk_images: {
				record: null,
				media_records: [],
				visible_media: [],
				loading: false,
				downloading_file: false,
				saving_media_record: false,
				filters: {
					status: 1
				},
				active_index: null, 
				active_record: null, 
				display_number: null,
				setRecord: function(record){
					vm.utils.risk_images.record = record;
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
					vm.utils.risk_images.record = null;
					vm.utils.risk_images.media_records = [];
				},
				getAllRecordAttachments: function(record_id, record_type) {
					var defer = $q.defer();

					vm.utils.risk_images.loading = true;

					// CLEAR CURRENT MEDIA ARRAY
					vm.utils.risk_images.media_records = [];

					mediaFactory.dbUtils.getAllStoredRecordAttachments(record_id, record_type, 'risks').then(function(media_records) {

						console.log("RISK IMAGES");
						console.log(media_records);

						// media_records = $filter('orderBy')(media_records, 'date_added');
						media_records = $filter('orderBy')(media_records, 'sequence_number');

						vm.utils.risk_images.media_records = media_records;

						vm.utils.risk_images.autoFilterMedia();

						// AUTO SELECT FIRST IMAGE
						if( vm.utils.risk_images.visible_media.length ) {
							vm.utils.risk_images.selectImage(0);
						}

						vm.utils.risk_images.loading = false;

						defer.resolve();
						$scope.$apply();

					}, function(error) {
						vm.utils.risk_images.loading = false;
						defer.reject(error);
					});

					return defer.promise;
				},
				getMediaRecordAttachment: function(media_record) {
					var defer = $q.defer();

					mediaFactory.dbUtils.getStoredAttachmentUrl('risks', media_record._id, media_record.attachment_key).then(function(url) {

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
					vm.utils.risk_images.updateListMediaRecord(media_record);

					vm.utils.risk_images.autoFilterMedia();
				},
				updateListMediaRecord: function(media_record) {
					var i = 0;
					var len = vm.utils.risk_images.media_records.length;

					var record_index = null;

					if( len > 0 ) {
						while(i < len) {

							if( vm.utils.risk_images.media_records[i]._id == media_record._id ) {
								record_index = i;
							}

							i++;
						}
					}

					if( record_index != null ) {
						vm.utils.risk_images.media_records[record_index] = media_record;
 					} else {
 						vm.utils.risk_images.media_records.push(media_record);
 					}
				},
				downloadMediaFile: function(media_record, record) {
					// IF ALREADY DOWNLOADING A FILE, WAIT UNTIL FINISHED
					if( vm.utils.risk_images.downloading_file ) {
						alert("File download already in progress. Please wait before trying to download another file.");
						return;
					}

					vm.utils.risk_images.downloading_file = true;
					media_record.downloading_file = true;

					var chunk_size = 1 * 1024 * 1024;
					var pool_limit = 6;

					mediaFactory.downloads.downloadMediaFile(media_record, chunk_size, pool_limit, true).then(function() {

						media_record.downloading_file = false;
						
						vm.utils.risk_images.getMediaRecordAttachment(media_record).then(function() {
							vm.utils.risk_images.updateListMediaData(media_record);
						});

						vm.utils.risk_images.downloading_file = false;

					}, function(error) {
						vm.utils.risk_images.downloading_file = false;
						media_record.downloading_file = false;
						alert(error);
					});
				
				},
				autoFilterMedia: function() {
					var filtered_array = [];

					angular.forEach(vm.utils.risk_images.media_records, function(m_record, m_index) {

						var errors = 0;

						console.log(m_record);
						console.log(vm.utils.risk_images.filters.status);

						if( m_record.item_not_found == 'Yes' ) {
							errors++;
						}

						if( m_record.status != vm.utils.risk_images.filters.status ) {
							errors++;
						}

						if( errors == 0 ) {
							filtered_array.push(m_record);
						}

					});

					vm.utils.risk_images.visible_media = filtered_array;
				},
				toggleMediaStatusView: function(status) {
					if( status == 'live' ) {
						vm.utils.risk_images.filters.status = 1;
					}

					if( status == 'deleted' ) {
						vm.utils.risk_images.filters.status = 3;
					}

					vm.utils.risk_images.autoFilterMedia();
				},
				selectImage: function(index){
					vm.utils.risk_images.active_index = index;
					vm.utils.risk_images.active_record = vm.utils.risk_images.visible_media[index];
					vm.utils.risk_images.display_number = parseInt(index) + 1;
				},
				nextImage: function(){
					var max_index = vm.utils.risk_images.visible_media.length - 1;
					var next_index = null;

					if( !vm.utils.risk_images.visible_media.length )
					{
						return;
					}

					var current_index = vm.utils.risk_images.active_index;

					//IF NO IMAGE ACTIVE - SELECT FIRST
					if( current_index == null )
					{
						vm.utils.risk_images.selectImage(0);
						return;
					}

					next_index = current_index + 1;

					//IF ALREADY ON LAST IMAGE GO TO START
					if( next_index > max_index )
					{
						next_index = 0;
					}

					vm.utils.risk_images.selectImage(next_index);
				},
				previousImage: function(){
					var max_index = vm.utils.risk_images.visible_media.length - 1;
					var next_index = null;

					if( !vm.utils.risk_images.visible_media.length )
					{
						return;
					}

					var current_index = vm.utils.risk_images.active_index;

					//IF NO IMAGE ACTIVE - SELECT FIRST
					if( current_index == null )
					{
						vm.utils.risk_images.selectImage(0);
						return;
					}

					next_index = current_index - 1;

					//IF AT START GO TO LAST
					if( next_index < 0 )
					{
						next_index = max_index;
					}

					vm.utils.risk_images.selectImage(next_index);
				},
			},
			closeout_images: {
				record: null,
				media_records: [],
				visible_media: [],
				loading: false,
				loaded: false,
				downloading_file: false,
				saving_media_record: false,
				filters: {
					status: 1
				},
				active_index: null, 
				active_record: null, 
				display_number: null,
				stats: {
					data: {
						total: 0,
						approved: 0,
						rejected: 0,
						reviewed: 0,
						pending: 0,
						percentage_checked: 0
					},
					calcSubmissionStats: function(){

						var stats = {
							total: 0,
							approved: 0,
							rejected: 0,
							reviewed: 0,
							pending: 0,
							percentage_checked: 0
						};

						if( !vm.utils.closeout_images.submission_record )
						{
							vm.utils.closeout_images.stats.data = stats;
							return;
						}

						vm.utils.closeout_images.submission_record.images.forEach(function(file_record, file_index){

							stats.total++;

							if( file_record.approval_status == 'Approved' )
							{
								stats.approved++;
							}

							if( file_record.approval_status == 'Rejected' )
							{
								stats.rejected++;
							}

							if( file_record.approval_status )
							{
								stats.reviewed++;
							}
							else
							{
								stats.pending++;
							}

						});

						stats.percentage_checked = Math.round( (stats.reviewed / stats.total) * 100 );

						vm.utils.closeout_images.stats.data = stats;

						console.log("STATS");
						console.log( vm.utils.closeout_images.stats.data );
					},
					calcStats: function(){

						var stats = {
							total: 0,
							approved: 0,
							rejected: 0,
							reviewed: 0,
							pending: 0,
							percentage_checked: 0
						};

						vm.utils.closeout_images.visible_media.forEach(function(file_record, file_index){

							stats.total++;

							if( file_record.approval_status == 'Approved' )
							{
								stats.approved++;
							}

							if( file_record.approval_status == 'Rejected' )
							{
								stats.rejected++;
							}

							if( file_record.approval_status )
							{
								stats.reviewed++;
							}
							else
							{
								stats.pending++;
							}

						});

						stats.percentage_checked = Math.round( (stats.reviewed / stats.total) * 100 );

						vm.utils.closeout_images.stats.data = stats;

						console.log("STATS");
						console.log( vm.utils.closeout_images.stats.data );
					}
				},
				setRecord: function(record){
					vm.utils.closeout_images.record = record;
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
					vm.utils.closeout_images.record = null;
					vm.utils.closeout_images.media_records = [];
				},
				getAllRecordAttachments: function(record_id, record_type) {
					var defer = $q.defer();

					vm.utils.closeout_images.loaded = false;
					vm.utils.closeout_images.loading = true;

					// CLEAR CURRENT MEDIA ARRAY
					vm.utils.closeout_images.media_records = [];

					mediaFactory.dbUtils.getAllStoredRecordAttachments(record_id, record_type, 'risks').then(function(media_records) {

						// media_records = $filter('orderBy')(media_records, 'date_added');
						media_records = $filter('orderBy')(media_records, 'sequence_number');

						vm.utils.closeout_images.media_records = media_records;

						vm.utils.closeout_images.autoFilterMedia();

						if( vm.utils.closeout_images.visible_media.length ) {
							vm.utils.closeout_images.selectImage(0);
						}

						vm.utils.closeout_images.stats.calcStats();

						vm.utils.closeout_images.loaded = true;
						vm.utils.closeout_images.loading = false;

						defer.resolve();
						$scope.$apply();

					}, function(error) {
						vm.utils.closeout_images.loading = false;
						defer.reject(error);
					});

					return defer.promise;
				},
				getMediaRecordAttachment: function(media_record) {
					var defer = $q.defer();

					mediaFactory.dbUtils.getStoredAttachmentUrl('risks', media_record._id, media_record.attachment_key).then(function(url) {

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
					var record_index = vm.utils.closeout_images.updateListMediaRecord(media_record);

					vm.utils.closeout_images.autoFilterMedia();

					return record_index;
				},
				updateListMediaRecord: function(media_record) {
					var i = 0;
					var len = vm.utils.closeout_images.media_records.length;

					var record_index = null;

					while(i < len) {

						if( vm.utils.closeout_images.media_records[i]._id == media_record._id ) {
							record_index = i;
						}

						i++;
					}

					if( record_index != null ) {
						vm.utils.closeout_images.media_records[record_index] = media_record;
 					} else {
 						// vm.utils.closeout_images.media_records.push(media_record);
 						record_index = vm.utils.closeout_images.media_records.push(media_record) - 1;
 					}

 					return record_index;
				},
				downloadMediaFile: function(media_record, record) {
					// IF ALREADY DOWNLOADING A FILE, WAIT UNTIL FINISHED
					if( vm.utils.closeout_images.downloading_file ) {
						alert("File download already in progress. Please wait before trying to download another file.");
						return;
					}

					vm.utils.closeout_images.downloading_file = true;
					media_record.downloading_file = true;

					var chunk_size = 1 * 1024 * 1024;
					var pool_limit = 6;

					mediaFactory.downloads.downloadMediaFile(media_record, chunk_size, pool_limit, true).then(function() {

						media_record.downloading_file = false;
						
						vm.utils.closeout_images.getMediaRecordAttachment(media_record).then(function() {
							vm.utils.closeout_images.updateListMediaData(media_record);
						});

						vm.utils.closeout_images.downloading_file = false;

					}, function(error) {
						vm.utils.closeout_images.downloading_file = false;
						media_record.downloading_file = false;
						alert(error);
					});
				
				},
				autoFilterMedia: function() {
					var filtered_array = [];

					angular.forEach(vm.utils.closeout_images.media_records, function(m_record, m_index) {

						var errors = 0;

						console.log(m_record);
						console.log(vm.utils.closeout_images.filters.status);

						if( m_record.item_not_found == 'Yes' ) {
							errors++;
						}

						if( m_record.status != vm.utils.closeout_images.filters.status ) {
							errors++;
						}

						if( errors == 0 ) {
							filtered_array.push(m_record);
						}

					});

					vm.utils.closeout_images.visible_media = filtered_array;
				},
				toggleMediaStatusView: function(status) {
					if( status == 'live' ) {
						vm.utils.closeout_images.filters.status = 1;
					}

					if( status == 'deleted' ) {
						vm.utils.closeout_images.filters.status = 3;
					}

					vm.utils.closeout_images.autoFilterMedia();
				},
				selectImage: function(index){
					vm.utils.closeout_images.active_index = index;
					vm.utils.closeout_images.active_record = vm.utils.closeout_images.visible_media[index];
					vm.utils.closeout_images.display_number = parseInt(index) + 1;

					vm.utils.closeout_images.active_record.show_review_form = false;

					if( !vm.utils.closeout_images.active_record.approval_status ) {
						vm.utils.closeout_images.active_record.show_review_form = true;
					}

					vm.utils.review_evidence.start(vm.utils.closeout_images.visible_media[index], vm.utils.risk_bio.record);
				},
				nextImage: function(){
					var max_index = vm.utils.closeout_images.visible_media.length - 1;
					var next_index = null;

					if( !vm.utils.closeout_images.visible_media.length )
					{
						return;
					}

					var current_index = vm.utils.closeout_images.active_index;

					//IF NO IMAGE ACTIVE - SELECT FIRST
					if( current_index == null )
					{
						vm.utils.closeout_images.selectImage(0);
						return;
					}

					next_index = current_index + 1;

					//IF ALREADY ON LAST IMAGE GO TO START
					if( next_index > max_index )
					{
						next_index = 0;
					}

					vm.utils.closeout_images.selectImage(next_index);
				},
				previousImage: function(){
					var max_index = vm.utils.closeout_images.visible_media.length - 1;
					var next_index = null;

					if( !vm.utils.closeout_images.visible_media.length )
					{
						return;
					}

					var current_index = vm.utils.closeout_images.active_index;

					//IF NO IMAGE ACTIVE - SELECT FIRST
					if( current_index == null )
					{
						vm.utils.closeout_images.selectImage(0);
						return;
					}

					next_index = current_index - 1;

					//IF AT START GO TO LAST
					if( next_index < 0 )
					{
						next_index = max_index;
					}

					vm.utils.closeout_images.selectImage(next_index);
				},
				showReviewForm: function(file_record){
					file_record.show_review_form = true;
				},
				takePhotoDesktop: function(){
					
					if( !vm.utils.risk_bio.record.hasOwnProperty('_id') || !vm.utils.risk_bio.record._id ) {
						alert("Risk assessment record not saved");
						return;
					}

					var params = {
						directive_id: 'raCloseoutEvidence',
						record_type: 'ra_closeout_evidence',
						subject_record: vm.utils.risk_bio.record
					};

					console.log("CLOSEOUT EVIDENCE PARAMS");
					console.log(params);

					$rootScope.$broadcast("takePhoto::start", params);
				},
				saveCloseoutFile: function(file, ra_record) {
					var defer = $q.defer();

					//CREATE SAVE MEDIA RECORD
					var media_record = modelsFactory.models.newMediaRecord(ra_record._id, 'ra_closeout_evidence');

					media_record.attachment_key = file.name;
					media_record.file_name = file.name;

					media_record.title = 'Closeout Evidence';
					media_record.description = 'Closeout Evidence';

					media_record.intended_closeout_action = 'new_closeout_evidence';

					// SET MID TABLE VALUES - RECORD IS ONLY IMPORTED
					media_record.date_record_synced = new Date().getTime();
					media_record.date_content_imported = new Date().getTime();

					if( mediaFactory.utils.checkRecordItemMediaExists(ra_record, file.name) ) {
						//SKIP THIS FILE ALREADY HAVE IT
						$scope.$apply();
						defer.resolve();

					} else {

						// SAVE FILE
						mediaFactory.dbUtils.saveMediaRecord(media_record, file).then(function(saved_media) {

							media_record = saved_media;

							raFactory.dbUtils.media_records.updateInitialCloseoutEvidenceSyncValues(media_record).then(function() {

								vm.utils.closeout_images.getMediaRecordAttachment(media_record).then(function() {
									
									var record_index = vm.utils.closeout_images.updateListMediaData(media_record);

									vm.utils.closeout_images.selectImage(record_index);

									defer.resolve();
									$scope.$apply();
								});

							}, function(error) {
								alert(error);
								defer.reject(error);
							});

						}, function(error) {
							alert(error);
							defer.reject(error);
						});
					};

					return defer.promise;
				},
				init: function(){

					setTimeout(function(){

						var inputFile = document.querySelector('#raCloseoutInputFile');
						var photoInput = document.querySelector('#raCloseoutPhotoInput');
						var uploadedFile = {};

						function fileUpload(){

							console.log("RAN CLOSEOUT FILE UPLOAD");
							console.log(vm.utils.closeout_images.record);

							if( vm.utils.closeout_images.record._id == null ) {
								alert("Risk assessment has not been saved");
								return;
							};
							
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

									console.log("SAVED ALL CLOSEOUT FILES");

									defer.resolve();
									return defer.promise;
								}

								//SAVE THE FILE
								vm.utils.closeout_images.saveCloseoutFile(files[index], vm.utils.closeout_images.record).then(function(){
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
				events: function() {

					$scope.$on("raCloseoutEvidence::savePhotoCapture", function(event, data) {

						if( data.src_directive_id != 'raCloseoutEvidence' ) {
							return;
						}

						if( data.record_type != 'ra_closeout_evidence' ) {
							return;
						}

						if( data.subject_record._id != vm.utils.risk_bio.record._id ) {
							return;
						}

						if( !data.file ) {
							alert("Theres no file to save");
							return;
						}

						vm.utils.closeout_images.saveCloseoutFile(data.file, vm.utils.risk_bio.record).then(function(){

						});

					});

				}()
			},
			review_evidence: {
				risk_record: null,
				file_record: null,
				approval_info: {
					file_id: null,
					status: null,
					message: null
				},
				loading: false,
				start: function(file_record, risk_record) {
					vm.utils.review_evidence.file_record = file_record;
					vm.utils.review_evidence.risk_record = risk_record;

					vm.utils.review_evidence.approval_info.file_id = file_record.rm_id;

					vm.utils.review_evidence.approval_info.message = null;

					if( file_record.approval_message ) {
						vm.utils.review_evidence.approval_info.message = file_record.approval_message;
					}

					console.log("FILE RECORD");
					console.log(file_record);

				},
				submit: function(status) {

					// if( parseInt(vm.utils.review_evidence.risk_record.implementation_recorded_by) == authFactory.rmCloudUserId() ) {
					// 	alert("You may not review your own submissions. This must be done by another person");
					// 	return;
					// }

					if( parseInt(vm.utils.review_evidence.risk_record.status) != 6 ) {
						alert("Evidence may only be reviewed when the assessment is pending review");
						return;
					}

					vm.utils.review_evidence.approval_info.status = status;

					if( status == 'Rejected' && !vm.utils.review_evidence.approval_info.message ) {
						alert("Please provide a reason for rejecting this evidence");
						return;
					}

					if( status == 'Approved' ) {
						vm.utils.review_evidence.approval_info.message = null;
					}

					vm.utils.review_evidence.loading = true;

					// UPDATE STATUSES
					vm.utils.review_evidence.file_record.approval_message = vm.utils.review_evidence.approval_info.message;
					vm.utils.review_evidence.file_record.approval_status = status;
					vm.utils.review_evidence.file_record.checked_by_id = authFactory.rmCloudUserId()
					vm.utils.review_evidence.file_record.checked_by_name = authFactory.active_profile.FirstName + ' ' + authFactory.active_profile.LastName;
					vm.utils.review_evidence.file_record.date_added = new Date().getTime();

					vm.utils.review_evidence.intended_closeout_action = 'reviewed_closeout_evidence';

					mediaFactory.dbUtils.doSaveMediaRecord(vm.utils.review_evidence.file_record).then(function(media_result) {

						vm.utils.review_evidence.file_record._id = media_result.id;
						vm.utils.review_evidence.file_record._rev = media_result.rev;
						vm.utils.review_evidence.file_record.show_review_form = false;

						vm.utils.closeout_images.stats.calcStats();

						vm.utils.closeout_images.nextImage();

						vm.utils.review_evidence.loading = false;

					}, function(error) {
						vm.utils.review_evidence.loading = false;
						alert(error);
					});

				}
			},
			risk_closeout: {
				assessment_id: null,
				record: null,
				date_closed: null,
				no_evidence_reason: null,
				loading: false,
				error_handler: {
					error: false, 
					error_message: null, 
					logError: function(error) {
						vm.utils.risk_closeout.error_handler.error = true;
						vm.utils.risk_closeout.error_handler.error_message = error;
					}, 
					clear: function() {
						vm.utils.risk_closeout.error_handler.error = false;
						vm.utils.risk_closeout.error_handler.error_message = null;
					}
				},
				start: function(assessment_id) {
					vm.utils.risk_closeout.record = vm.utils.risk_bio.record;

					vm.utils.risk_closeout.assessment_id = assessment_id;
					vm.utils.risk_closeout.date_closed = new Date().getTime();
					// vm.utils.risk_closeout.date_closed = moment(new Date()).format("YYYY-MM-DD");
					vm.utils.risk_closeout.no_evidence_reason = '';
				},
				makeDecision: function() {
					vm.utils.risk_closeout.error_handler.clear();
					vm.utils.risk_bio.tabs.changeTab('closeout_decision');
				},
				confirm: function() {

					vm.utils.risk_closeout.loading = true;

					// vm.utils.risk_closeout.record.status = 6;
					// vm.utils.risk_closeout.record.status_name = 'Closed';
					// vm.utils.risk_closeout.record.reported_ra_status_name = 'Pending Review';
					// vm.utils.risk_closeout.record.implementation_recorded_by = authFactory.rmCloudUserId();

					// SAVE INTENDED CLOSEOUT ACTION
					vm.utils.risk_closeout.record.intended_closeout_action = 'submit_for_review';

					// SAVE DATE CLOSED AND NO EVIDENCE REASON HERE
					vm.utils.risk_closeout.record.submit_for_review_info = {
						date_closed: vm.utils.risk_closeout.date_closed, 
						no_evidence_reason: vm.utils.risk_closeout.no_evidence_reason
					}

					raFactory.dbUtils.assessments.markRiskCloseoutRecordModified(vm.utils.risk_closeout.record).then(function() {

						if( !rmConnectivityFactory.online_detection.online ) {

							$rootScope.$broadcast("reportRiskList::riskCloseout", {risk_record: vm.utils.risk_closeout.record});

							vm.utils.toasts.noInternetConnection();
							vm.utils.risk_closeout.loading = false;
							return;
						}

						raFactory.requests.riskAssessmentPermissions(vm.utils.risk_closeout.assessment_id).then(function(permissions_data) {

	     					if( !permissions_data.can_closeout ) {
	     						vm.utils.risk_closeout.loading = false;
	     						vm.utils.toasts.noCloseoutPermissionToast();
	     						return;
	     					}

	     					if( ( !vm.utils.closeout_images.visible_media || !vm.utils.closeout_images.visible_media.length ) && !vm.utils.risk_closeout.no_evidence_reason.length ) {
		                		alert("Please enter a brief explanation of why no evidence has been provided");
		                		return;
		                	}

							vm.utils.upload_closeout.start();
	  
	     				}, function(error) {
	     					vm.utils.risk_closeout.loading = false;
	     					vm.utils.risk_closeout.error_handler.logError(error);
	     					alert(error);
	     				});

					}, function(error) {
						vm.utils.risk_closeout.loading = false;
						vm.utils.risk_closeout.error_handler.logError(error);
						alert(error);
					});

				}
			},
			upload_closeout: {
				loading: false,
				closeout_evidence: [],
				active_file: null,
				error_handler: {
					error: false, 
					error_message: null, 
					logError: function(error) {
						vm.utils.upload_closeout.error_handler.error = true;
						vm.utils.upload_closeout.error_handler.error_message = error;
					}, 
					clear: function() {
						vm.utils.upload_closeout.error_handler.error = false;
						vm.utils.upload_closeout.error_handler.error_message = null;
					}
				},
				start: function() {

					vm.utils.upload_closeout.loading = true;

					vm.utils.upload_closeout.collectEvidenceForUpload();

					vm.utils.upload_closeout.uploadNextFile();

				},
				collectEvidenceForUpload: function() {
					// COLLECT CLOSEOUT EVIDENCE FOR UPLOAD
					var i = 0;
					var len = vm.utils.closeout_images.visible_media.length;
					var collection = [];
					while(i < len) {

						if( !vm.utils.closeout_images.visible_media[i].hasOwnProperty('rm_id') || !vm.utils.closeout_images.visible_media[i].rm_id ) {
							collection.push(vm.utils.closeout_images.visible_media[i]);
						}

						i++;
					}

					vm.utils.upload_closeout.closeout_evidence = collection;
				},
				uploadNextFile: function() {
					var i = 0;
					var len = vm.utils.upload_closeout.closeout_evidence.length;
					var next_file_index = null;
					while(i < len) {
						if( !vm.utils.upload_closeout.closeout_evidence[i].date_record_imported ) {
							next_file_index = i;
						}

						i++;
					}

					if( next_file_index != null ) {

						console.log("ADD CLOSEOUT EVIDENCE TO STAGING UPLOADER");
						vm.utils.upload_closeout.active_file = vm.utils.upload_closeout.closeout_evidence[next_file_index];
						console.log(vm.utils.upload_closeout.closeout_evidence[next_file_index]);
						vm.utils.upload_closeout.stageFileForUpload(vm.utils.upload_closeout.closeout_evidence[next_file_index]);

					} else {
						vm.utils.upload_closeout.uploadRiskAssessmentCloseout();
					}
				},
				stageFileForUpload: function(media_record) {
					var defer = $q.defer();

					//GET THE FILE ATTACHMENT
					riskmachDatabasesFactory.databases.collection.media.getAttachment(media_record._id, media_record.attachment_key).then(function(blob){

						//CREATE THE FILE FROM BLOB
						var file = new File([blob], media_record.attachment_key);

						console.log("ADDED CLOSEOUT EVIDENCE TO UPLOADER STAGE");
						console.log(media_record);
						console.log(file);

						//ADD THE FILE TO THE DOWNLOADER
						vm.utils.uploader.addFile(file, media_record.attachment_key);

						//ADD THE FILE TO THE UPLOADER ALONG WITH THE META DATA ??
						defer.resolve();

					}).catch(function(error) {
						alert("Error getting closeout evidence file attachment");
						console.log("Error getting closeout evidence file attachment");
						vm.utils.upload_verification.error_handler.logError(error);
						console.log(error);
						defer.reject(error);
					});

					return defer.promise;
				},
				uploadRiskAssessmentCloseout: function() {
					var defer = $q.defer();

					raFactory.requests.closeoutAssessmentRecord(vm.utils.risk_closeout.assessment_id, vm.utils.risk_closeout.date_closed, vm.utils.risk_closeout.no_evidence_reason).then(function(result) {

						vm.utils.risk_closeout.record.status = 6;
						vm.utils.risk_closeout.record.status_name = 'Closed';
						vm.utils.risk_closeout.record.reported_ra_status_name = 'Pending Review';
						vm.utils.risk_closeout.record.implementation_recorded_by = authFactory.rmCloudUserId();

						raFactory.dbUtils.assessments.markRiskAssessmentImportComplete(vm.utils.risk_closeout.record).then(function() {

							//UPDATE THE RISK STATUS
							if( parseInt(vm.utils.risk_bio.record.rm_id) == parseInt(vm.utils.risk_closeout.assessment_id) )
							{
								vm.utils.risk_bio.record._id = vm.utils.risk_closeout.record._id;
								vm.utils.risk_bio.record._rev = vm.utils.risk_closeout.record._rev;
								vm.utils.risk_bio.record.status = 6;
								vm.utils.risk_bio.record.status_name = 'Closed';
								vm.utils.risk_bio.record.reported_ra_status_name = 'Pending Review';
								vm.utils.risk_bio.record.implementation_recorded_by = authFactory.rmCloudUserId();
							}

							$rootScope.$broadcast("reportRiskList::riskCloseout", {risk_record: vm.utils.risk_bio.record});

							// vm.utils.submission_history.refresh( vm.utils.risk_bio.record.rm_id );
							vm.utils.closeout_images.getAllRecordAttachments(vm.utils.closeout_images.record._id, 'ra_closeout_evidence');

							vm.utils.risk_bio.tabs.changeTab('interface');

							vm.utils.toasts.riskSubmitted();

	                    	vm.utils.upload_closeout.loading = false;

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			revise_assessment: {
				record: null,
				is_loading: false,
				revision_info: {
					is_temporary: false,
					temporary_expiry_date: null,
					control_description: null,
					is_deviation: false,
					pha: {
						LOAfter: null,
						FEAfter: null,
						NPAfter: null,
						DPHAfter: null,
						HRNAfter: null,
						HRNPhraseAfter: null,
						HRNPhraseNameAfter: null,
						color: null
					},
					matrix: {
						score_data: null
					}
				},
				matrix: {
					directive_id: 'reviseAssessmentMatrix',
					co_ord: {
						x: null,
						y: null
					},
					events: function(){

						$scope.$on("riskGrid::selected", function(event, data){

							if( data.directive_id != vm.utils.revise_assessment.matrix.directive_id )
							{
								return;
							}

							vm.utils.revise_assessment.revision_info.matrix.score_data = data.data_set;

							console.log("GRID DATA");
							console.log(vm.utils.revise_assessment.revision_info.matrix.score_data);

						});

					}()
				},
				error_handler: {
					error: false, 
					error_message: null, 
					logError: function(error) {
						vm.utils.revise_assessment.error_handler.error = true;
						vm.utils.revise_assessment.error_handler.error_message = error;
					}, 
					clear: function() {
						vm.utils.revise_assessment.error_handler.error = false;
						vm.utils.revise_assessment.error_handler.error_message = null;
					}
				},
				show: function() {
					var slideoutEl = document.getElementById('ReviseAssessmentsAside');
                    var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(myOffCanvas);
               		slideoutInst.show();

               		// CLEAN UP
               		slideoutEl = null;
               		slideoutInst = null;
				},
				hide: function() {
					var slideoutEl = document.getElementById('ReviseAssessmentsAside');
                    var slideoutInst = bootstrap.Offcanvas.getOrCreateInstance(myOffCanvas);
                   	slideoutInst.hide();

                	// CLEAN UP
                	slideoutEl = null;
                	slideoutInst = null;
				},
				start: function(ra_record, is_temporary) {

					// if( parseInt(vm.utils.report_info.data.report_record.Status) == 7 )
     //        		{
     //        			var toastEl = document.getElementById('ReportDraftWarning');
     //                    var myToast = bootstrap.Toast.getOrCreateInstance(toastEl);
     //                    myToast.show();

     //        			return;
     //        		}

					if( parseInt(ra_record.status) != 7 ) {
						alert("Only open assessments may be revised");
						return;
					}

					//MAKE SURE USER HAS PERMISSION
					// if( !vm.utils.report_info.share_record.CanReviseAssessment ) {
     //            		alert("You do not have permission to revise assessments in this report");
     //            		return;
     //            	}

                	if( !is_temporary ) {
                		is_temporary = false;
                	}

					vm.utils.revise_assessment.record = ra_record;
					vm.utils.revise_assessment.revision_info.is_temporary = is_temporary;
					vm.utils.revise_assessment.revision_info.temporary_expiry_date = null;
					vm.utils.revise_assessment.revision_info.control_description = ra_record.control_description;
					vm.utils.revise_assessment.revision_info.is_deviation = false;

					vm.utils.revise_assessment.revision_info.pha.LOAfter = null;
					vm.utils.revise_assessment.revision_info.pha.FEAfter = null;
					vm.utils.revise_assessment.revision_info.pha.NPAfter = null;
					vm.utils.revise_assessment.revision_info.pha.DPHAfter = null;
					vm.utils.revise_assessment.revision_info.pha.HRNAfter = null;
					vm.utils.revise_assessment.revision_info.pha.HRNPhraseAfter = null;
					vm.utils.revise_assessment.revision_info.pha.HRNPhraseNameAfter = null;
					vm.utils.revise_assessment.revision_info.pha.color = null;
					vm.utils.revise_assessment.revision_info.matrix.score_data = null;

					//RESET THE MATRIX INTERFACE
					vm.utils.revise_assessment.matrix.co_ord = {
						x: null,
						y: null
					};

					if( vm.utils.revise_assessment.record.hasOwnProperty('revision_info') && vm.utils.revise_assessment.record.revision_info ) {
						vm.utils.revise_assessment.revision_info = angular.copy(vm.utils.revise_assessment.record.revision_info);
					}

					// vm.utils.revise_assessment.show();
					vm.utils.risk_bio.tabs.changeTab('revise_assessment');
				},
				calcHrn: function(stage) {
					var hrn_data = raFactory.calcHrn(vm.utils.revise_assessment.revision_info.pha['LO' + stage], vm.utils.revise_assessment.revision_info.pha['FE' + stage], vm.utils.revise_assessment.revision_info.pha['NP' + stage], vm.utils.revise_assessment.revision_info.pha['DPH' + stage], vm.utils.risk_utils.hrn_list);
					// console.log("CALC HRN DATA");
					// console.log(hrn_data);

					vm.utils.revise_assessment.revision_info.pha['HRN' + stage] = hrn_data.score;
					vm.utils.revise_assessment.revision_info.pha['HRNPhrase' + stage] = hrn_data.phrase_id;
					vm.utils.revise_assessment.revision_info.pha['HRNPhraseName' + stage] = hrn_data.phrase_name;

					console.log("CALCULATED HRN");
					console.log(hrn_data);
				},
				riskLevelStyle: function(phrase) {
					var style = [];

					var style = {
						'color': '#00435F'
					};

					if( !phrase )
					{
						return style;
					}

					if( phrase == 'Negligible' || phrase == 'Very Low' || phrase == 'Low' )
					{
						style['color'] = '#00435F';
					}

					if( phrase == 'Significant' )
					{
						style['color'] = '#F6A13E';
					}

					if( phrase == 'High' || phrase == 'Very High' || phrase == 'Extreme' || phrase == 'Unacceptable')
					{
						style['color'] = '#C24E4F';
					}

					return style;
				},
				dataValid: function() {
					var valid = false;
					var num_fails = 0;

					if( !vm.utils.revise_assessment.revision_info.control_description ) {
						num_fails++;
					}

					//TEMP MEASURE DATE PROVIDED
					if( vm.utils.revise_assessment.revision_info.is_temporary && !vm.utils.revise_assessment.revision_info.temporary_expiry_date ) {
						num_fails++;
					}

					//PHA SCORED
					if( (parseInt(vm.utils.revise_assessment.record.assessment_method) == 0 || parseInt(vm.utils.revise_assessment.record.assessment_method) == 1 ) && !vm.utils.revise_assessment.revision_info.pha.HRNPhraseNameAfter ) {
						num_fails++;
					}

					if( parseInt(vm.utils.revise_assessment.record.assessment_method) == 2 && !vm.utils.revise_assessment.revision_info.matrix.score_data ) {
						num_fails++;
					}

					if( num_fails == 0 ) {
						valid = true;
					}

					return valid;
				},
				save: function() {

					vm.utils.revise_assessment.loading = true;

					// SAVE REVISION INFO ON RISK CLOSEOUT RECORD
					vm.utils.revise_assessment.record.revision_info = angular.copy(vm.utils.revise_assessment.revision_info);

					// SAVE INTENDED CLOSEOUT ACTION
					vm.utils.revise_assessment.record.intended_closeout_action = 'revise_assessment';

					raFactory.dbUtils.assessments.markRiskCloseoutRecordModified(vm.utils.revise_assessment.record).then(function() {

						if( !rmConnectivityFactory.online_detection.online ) {

							$rootScope.$broadcast("reportRiskList::riskRevised", {risk_record: vm.utils.revise_assessment.record});

							vm.utils.toasts.noInternetConnection();
							vm.utils.revise_assessment.loading = false;
							return;
						}

						raFactory.requests.riskAssessmentPermissions(vm.utils.risk_closeout.assessment_id).then(function(permissions_data) {

	     					if( !permissions_data.can_revise ) {
	     						vm.utils.revise_assessment.loading = false;
	     						vm.utils.toasts.noRiskRevisionPermissionToast();
	     						return;
	     					}

	     					if( !vm.utils.revise_assessment.dataValid() ) {
	     						vm.utils.revise_assessment.loading = false;
								alert("Please provide all the necessary information");
								return;
							}

							if( !vm.utils.revise_assessment.revision_info.is_temporary ) {
								vm.utils.revise_assessment.revision_info.temporary_expiry_date = null;
							}

							raFactory.requests.reviseCloseoutAssessment(vm.utils.revise_assessment.record.rm_id, vm.utils.revise_assessment.revision_info).then(function(data) {
								
								var ra_filters = angular.copy(raFactory.utils.report_risk_filters);
								ra_filters.assessment_id = data.revisedRaid;

								raFactory.report_risks.requestData(ra_filters).then(function(data) {

									if( data.data && data.data.length ) {

										raFactory.dbUtils.assessments.updateRevisedRiskAssessment(vm.utils.revise_assessment.record, data.data[0]).then(function() {

											// data.data[0]._id = saved_record._id;
											// data.data[0]._rev = saved_record._rev;
											// vm.utils.risk_bio.updateRevisedRiskValues(data.data[0]);

											$rootScope.$broadcast("reportRiskList::riskRevised", {risk_record: vm.utils.revise_assessment.record});

											vm.utils.risk_bio.tabs.changeTab('interface');

											vm.utils.revise_assessment.loading = false;

										}, function(error) {
											vm.utils.revise_assessment.loading = false;
											vm.utils.revise_assessment.error_handler.logError(error);
											alert(error);
										});

									}

								}, function(error) {
									vm.utils.revise_assessment.loading = false;
									vm.utils.revise_assessment.error_handler.logError(error);
									alert(error);
								});

							}, function(error) {
								vm.utils.revise_assessment.loading = false;
								vm.utils.revise_assessment.error_handler.logError(error);
								alert(error);
							});

	     				}, function(error) {
	     					vm.utils.revise_assessment.loading = false;
	     					vm.utils.revise_assessment.error_handler.logError(error);
	     					alert(error);
	     				});

					}, function(error) {
						vm.utils.revise_assessment.loading = false;
						vm.utils.revise_assessment.error_handler.logError(error);
						alert(error);
					});

				}
			},
			approve_assessment: {
				risk_record: null,
				closeout_evidence: [],
				loading: false,
				info: {
					assessment_id: null,
					approved: null,
					description: null,
					submission_id: null
				},
				error_handler: {
					error: false, 
					error_message: null,
					logError: function(error) {
						vm.utils.approve_assessment.error_handler.error = true;
						vm.utils.approve_assessment.error_handler.error_message = error;
					}, 
					clear: function() {
						vm.utils.approve_assessment.error_handler.error = false;
						vm.utils.approve_assessment.error_handler.error_message = null;
					}
				},
				start: function(ra_record) {
					vm.utils.approve_assessment.risk_record = ra_record;
					vm.utils.approve_assessment.info.assessment_id = ra_record.rm_id;
					vm.utils.approve_assessment.info.submission_id = null;
					vm.utils.approve_assessment.info.approved = null;
					vm.utils.approve_assessment.info.description = null;

					vm.utils.approve_assessment.closeout_evidence = [];

					if( vm.utils.approve_assessment.risk_record.hasOwnProperty('review_info') && vm.utils.approve_assessment.risk_record.review_info ) {
						vm.utils.approve_assessment.info = angular.copy(vm.utils.approve_assessment.risk_record.review_info);
					}
				},
				selectStatus: function(status) {
					vm.utils.approve_assessment.info.approved = status;
				},
				confirm: function() {

					vm.utils.approve_assessment.loading = true;

					// SAVE REVIEW INFO TO RISK CLOSEOUT RECORD
					vm.utils.approve_assessment.risk_record.review_info = angular.copy(vm.utils.approve_assessment.info);

					// SAVE THE INTENDED CLOSEOUT ACTION
					vm.utils.approve_assessment.risk_record.intended_closeout_action = 'review_assessment';

					raFactory.dbUtils.assessments.markRiskCloseoutRecordModified(vm.utils.approve_assessment.risk_record).then(function() {

						if( !rmConnectivityFactory.online_detection.online ) {

							$rootScope.$broadcast("reportRiskList::riskReviewed", {risk_record: vm.utils.approve_assessment.risk_record});

							vm.utils.toasts.noInternetConnection();
							vm.utils.approve_assessment.loading = false;
							return;
						}

						raFactory.requests.riskAssessmentPermissions(vm.utils.risk_closeout.assessment_id).then(function(permissions_data) {

	     					if( !permissions_data.can_approve ) {
	     						vm.utils.approve_assessment.loading = false;
	     						vm.utils.toasts.noCloseoutApprovalPermissionToast();
	     						return;
	     					}

	     					// if( parseInt(vm.utils.approve_assessment.risk_record.implementation_recorded_by) == authFactory.rmCloudUserId() ) {
							// 	vm.utils.approve_assessment.loading = false;
							// 	alert("You may not approve your own submissions. This must be done by another person");
							// 	return;
							// }

							if( vm.utils.approve_assessment.info.approved == 'reject' && !vm.utils.approve_assessment.info.description ) {
								vm.utils.approve_assessment.loading = false;
								alert("Please provide a reason for rejecting the submission");
								return;
							}

							if( vm.utils.approve_assessment.info.approved == 'approve' ) {
								vm.utils.approve_assessment.info.description = '';
							}

							var passthru_status = vm.utils.approve_assessment.info.approved;

							if( vm.utils.approve_assessment.risk_record.is_deviation == 'Yes' && vm.utils.approve_assessment.info.approved == 'approve' ) {
								passthru_status = 'deviation';
							}

							vm.utils.approve_assessment.collectEvidenceForReviewUpload();

							raFactory.uploadReviewedCloseoutEvidence(vm.utils.approve_assessment.closeout_evidence).then(function() {

								raFactory.uploadReviewedRiskCloseout(vm.utils.approve_assessment.info, vm.utils.approve_assessment.risk_record, passthru_status).then(function() {

									//UPDATE RISK STATUS
									if( vm.utils.approve_assessment.info.approved == 'approve' ) {
										vm.utils.approve_assessment.risk_record.status = 10;
										vm.utils.approve_assessment.risk_record.status_name = 'Closed Approved';
										vm.utils.approve_assessment.risk_record.reported_ra_status_name = 'Closed';
										vm.utils.approve_assessment.risk_record.approval_description = null;
										vm.utils.approve_assessment.risk_record.approval_date = new Date().getTime();
										vm.utils.approve_assessment.risk_record.approved = 'Approved';

										vm.utils.toasts.riskApprovedToast();
									}

									if( vm.utils.approve_assessment.info.approved == 'reject' )
									{
										vm.utils.approve_assessment.risk_record.status = 7;
										vm.utils.approve_assessment.risk_record.status_name = 'Open';
										vm.utils.approve_assessment.risk_record.reported_ra_status_name = 'Open';
										vm.utils.approve_assessment.risk_record.approval_description = vm.utils.approve_assessment.info.description;
										vm.utils.approve_assessment.risk_record.approval_date = null;
										vm.utils.approve_assessment.risk_record.approved = 'Rejected';

										vm.utils.toasts.riskRejectedToast();
									}

									raFactory.dbUtils.assessments.saveReviewedRiskCloseout(vm.utils.approve_assessment.risk_record).then(function() {

										//RESET
										vm.utils.approve_assessment.info.approved = null;
										vm.utils.approve_assessment.info.description = null;

										// vm.utils.submission_history.refresh( vm.utils.approve_assessment.risk_record.rm_id );
										// vm.utils.closeout_images.refresh( vm.utils.approve_assessment.risk_record.rm_id );

										$rootScope.$broadcast("reportRiskList::riskReviewed", {risk_record: vm.utils.approve_assessment.risk_record});

										vm.utils.approve_assessment.loading = false;

									}, function(error) {
										vm.utils.approve_assessment.loading = false;
										vm.utils.approve_assessment.error_handler.logError(error);
										alert(error);
									});

								}, function(error) {
									vm.utils.approve_assessment.loading = false;
									vm.utils.approve_assessment.error_handler.logError(error);
									alert(error);
								});

							}, function(error) {
								vm.utils.approve_assessment.loading = false;
								vm.utils.approve_assessment.error_handler.logError(error);
								alert(error);
							});
	  
	     				}, function(error) {
	     					vm.utils.approve_assessment.loading = false;
	     					vm.utils.approve_assessment.error_handler.logError(error);
	     					alert(error);
	     				});

					}, function(error) {
						vm.utils.approve_assessment.loading = false;
						vm.utils.approve_assessment.error_handler.logError(error);
						alert(error);
					});

				},
				collectEvidenceForReviewUpload: function() {
					// COLLECT CLOSEOUT EVIDENCE FOR UPLOAD
					var i = 0;
					var len = vm.utils.closeout_images.visible_media.length;
					var collection = [];
					while(i < len) {

						if( vm.utils.closeout_images.visible_media[i].hasOwnProperty('record_modified') || vm.utils.closeout_images.visible_media[i].record_modified == 'Yes' ) {
							collection.push(vm.utils.closeout_images.visible_media[i]);
						}

						i++;
					}

					vm.utils.approve_assessment.closeout_evidence = collection;
				},
			},
			risk_utils: {
				lo_list: null,
				fe_list: null,
				np_list: null,
				dph_list: null,
				hrn_list: null,
				ria_list: null,
				getAllData: function(){
					var defer = $q.defer();

					var promises = {
						lo_list: vm.utils.risk_utils.getLoList(),
						fe_list: vm.utils.risk_utils.getFeList(),
						np_list: vm.utils.risk_utils.getNpList(),
						dph_list: vm.utils.risk_utils.getDphList(),
						hrn_list: vm.utils.risk_utils.getHrnList(),
						ria_list: vm.utils.risk_utils.getRiaList()
					};

					$q.all(promises).then(function(){

						// vm.utils.pha_sliders.constructTicks();

						defer.resolve();
					}, function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getLoList: function(){
					var defer = $q.defer();

					//FIND EXISTING STAGE RECORD
					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'lo_list',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){
						vm.utils.risk_utils.lo_list = [];
						var lo_list = [];

						console.log("LO RAW");
						console.log(results.docs);

						if( results.docs.length > 0 )
						{
							angular.forEach(results.docs[0].data, function(record, index){
								record.Value = parseFloat(record.Value);

								if( record.Status != 'Deleted' )
								{
									lo_list.push(record);
								}

							});

							vm.utils.risk_utils.lo_list = $filter('orderBy')(lo_list, 'Value');
						}

						console.log("LO LIST");
						console.log(vm.utils.risk_utils.lo_list);

						defer.resolve();

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getFeList: function(){
					var defer = $q.defer();

					//FIND EXISTING STAGE RECORD
					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'fe_list',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){
						vm.utils.risk_utils.fe_list = [];

						if( results.docs.length > 0 )
						{
							angular.forEach(results.docs[0].data, function(record, index){
								record.Value = parseFloat(record.Value);
							});

							vm.utils.risk_utils.fe_list = $filter('orderBy')(results.docs[0].data, 'Value');
						}

						console.log("FE LIST");
						console.log(vm.utils.risk_utils.fe_list);
						defer.resolve();

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getNpList: function(){
					var defer = $q.defer();

					//FIND EXISTING STAGE RECORD
					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'np_list',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){
						vm.utils.risk_utils.np_list = [];

						if( results.docs.length > 0 )
						{
							angular.forEach(results.docs[0].data, function(record, index){
								record.Value = parseFloat(record.Value);
							});

							vm.utils.risk_utils.np_list = $filter('orderBy')(results.docs[0].data, 'Value');
						}

						console.log("NP LIST");
						console.log(vm.utils.risk_utils.np_list);
						defer.resolve();

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getDphList: function(){
					var defer = $q.defer();

					//FIND EXISTING STAGE RECORD
					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'dph_list',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){
						vm.utils.risk_utils.dph_list = [];

						if( results.docs.length > 0 )
						{
							angular.forEach(results.docs[0].data, function(record, index){
								record.Value = parseFloat(record.Value);
							});

							vm.utils.risk_utils.dph_list = $filter('orderBy')(results.docs[0].data, 'Value');
						}

						console.log("DPHLIST");
						console.log(vm.utils.risk_utils.dph_list);
						defer.resolve();

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getHrnList: function(){
					var defer = $q.defer();

					//FIND EXISTING STAGE RECORD
					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'hrn_list',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){
						vm.utils.risk_utils.hrn_list = [];

						if( results.docs.length > 0 )
						{
							angular.forEach(results.docs[0].data, function(record, index){
								record.Lower = parseFloat(record.Lower);
								record.Upper = parseFloat(record.Upper);
							});

							vm.utils.risk_utils.hrn_list = results.docs[0].data;
						}

						console.log("HRN LIST");
						console.log(vm.utils.risk_utils.hrn_list);
						defer.resolve();

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getRiaList: function(){
					var defer = $q.defer();

					//FIND EXISTING STAGE RECORD
					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'ria_list',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){
						vm.utils.risk_utils.ria_list = [];
						vm.utils.ria.options = [];

						if( results.docs.length > 0 )
						{
							vm.utils.risk_utils.ria_list = results.docs[0].data;
							vm.utils.ria.options = results.docs[0].data;
						}

						vm.utils.ria.filter();

						console.log("RIA LIST");
						console.log(vm.utils.risk_utils.ria_list);
						defer.resolve();

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
			},
			toasts: {
				riskSubmitted: function() {
					var toastEl = document.getElementById('RiskSubmittedToast');
                    var toastInst = bootstrap.Toast.getOrCreateInstance(toastEl);
            		toastInst.show();

            		// CLEAN UP
            		toastEl = null;
            		toastInst = null;
				},
				riskApprovedToast: function() {
					var toastEl = document.getElementById('RiskApprovedToast');
                    var toastInst = bootstrap.Toast.getOrCreateInstance(toastEl);
                    toastInst.show();

                    // CLEAN UP
                    toastEl = null;
                    toastInst = null;
				},
				riskRejectedToast: function() {
					var toastEl = document.getElementById('RiskRejectedToast');
                    var toastInst = bootstrap.Toast.getOrCreateInstance(toastEl);
                    toastInst.show();

                    // CLEAN UP
                    toastEl = null;
                    toastInst = null;
				},
				noCloseoutPermissionToast: function() {
					var toastEl = document.getElementById('NoCloseoutPermissionToast');
					var toastInst = bootstrap.Toast.getOrCreateInstance(toastEl);
					toastInst.show();

					// CLEAN UP
					toastEl = null;
					toastInst = null;
				},
				noCloseoutApprovalPermissionToast: function() {
					var toastEl = document.getElementById('NoCloseoutApprovalPermissionToast');
					var toastInst = bootstrap.Toast.getOrCreateInstance(toastEl);
					toastInst.show();

					// CLEAN UP
					toastEl = null;
					toastInst = null;
				},
				noRiskRevisionPermissionToast: function() {
					var toastEl = document.getElementById('NoRiskRevisionPermissionToast');
					var toastInst = bootstrap.Toast.getOrCreateInstance(toastEl);
					toastInst.show();

					// CLEAN UP
					toastEl = null;
					toastInst = null;
				},
				noInternetConnection: function() {
					var toastEl = document.getElementById('ReportRiskBioNoInternetConnectionToast');
					var toastInst = bootstrap.Toast.getOrCreateInstance(toastEl);
					toastInst.show();

					// CLEAN UP
					toastEl = null;
					toastInst = null;
				}
			},
			events: function() {

				$scope.$on("reportRiskAssessmentBio::start", function(event, data) {

					console.log("RISK ASSESSMENT BIO START");
					console.log(data);

					vm.utils.risk_bio.assessment_id = data.assessment_id;
					vm.utils.risk_bio.action = data.action;

					vm.utils.risk_bio.start();
				});

			}()
		}

		vm.utils.uploader = new plupload.Uploader({
			runtimes : 'html5,flash,silverlight,html4',
		    browse_button : 'pickfiles',
		    container: document.getElementById('closeoutEvidenceUploadContainer'),
		    url : "https://system.riskmach.co.uk/laravel/public/webapp/v1/UploadCloseoutEvidenceHandler",
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
					params.data = JSON.stringify(vm.utils.upload_closeout.active_file);
					params.assessment_id = vm.utils.risk_closeout.assessment_id;
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

		    		console.log("CLOSEOUT EVIDENCE UPLOAD RESPONSE");
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
		    		vm.utils.upload_closeout.active_file.date_record_synced = new Date().getTime();
		    		vm.utils.upload_closeout.active_file.synced = true;

		    		raFactory.dbUtils.media_records.markCloseoutEvidenceImported(vm.utils.upload_closeout.active_file, response).then(function(){
		    			vm.utils.uploader.removeFile(file);

		    			//UPLOAD THE NEXT FILE

		    			vm.utils.upload_closeout.uploadNextFile();
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
		vm.utils.risk_utils.getAllData();
	}

	function reportRiskAssessmentsListingController($scope, $rootScope, $q, raFactory, rmConnectivityFactory) 
	{
		var vm = this;

		vm.utils = {
			theme: {
                currentTheme: localStorage.getItem("theme")
            },
			assessment_listing: {
				loading: false,
				loading_closeout: false,
				data: [],
				visible_data: [],
				filters: null, 
				fe_filters: {
					general_search: ''
				},
				pagination: {
					pageChanged: function(page_num) {
						vm.utils.assessment_listing.listPageChange(page_num);
					}
				},
				error_handler: {
					error: false, 
					error_message: null, 
					logError: function(error) {
						vm.utils.assessment_listing.error_handler.error = true;
						vm.utils.assessment_listing.error_handler.error_message = error;
					}, 
					clear: function() {
						vm.utils.assessment_listing.error_handler.error = false;
						vm.utils.assessment_listing.error_handler.error_message = null;
					}
				},
				refresh: function() {

					vm.utils.assessment_listing.error_handler.clear();

					if( !rmConnectivityFactory.online_detection.online ) {
						vm.utils.assessment_listing.error_handler.logError("You require an internet connection to view report risk assessments");
						return;
					}

					vm.utils.assessment_listing.loading = true;

					raFactory.report_risks.requestData(vm.utils.assessment_listing.filters).then(function(data) {

						vm.utils.assessment_listing.filters.total_items = data.totals.TotalItems;

						raFactory.report_risks.getDraftRiskCloseouts(vm.utils.assessment_listing.filters).then(function(draft_closeouts) {

							vm.utils.assessment_listing.data = data.data;
							vm.utils.assessment_listing.autoFilter();
							vm.utils.assessment_listing.draft_closeouts = draft_closeouts;

							vm.utils.assessment_listing.overlayDbDraftCloseouts(vm.utils.assessment_listing.draft_closeouts);

							vm.utils.assessment_listing.loading = false;

						}, function(error) {
							vm.utils.assessment_listing.error_handler.logError(error);
							vm.utils.assessment_listing.loading = false;
						});

					}, function(error) {
						vm.utils.assessment_listing.error_handler.logError(error);
						vm.utils.assessment_listing.loading = false;
					});
				},
				listPageChange: function(page_num) {
					var defer = $q.defer();

					vm.utils.assessment_listing.filters.page_num = page_num;

					vm.utils.assessment_listing.loading = true;

					raFactory.report_risks.requestData(vm.utils.assessment_listing.filters).then(function(data) {

						vm.utils.assessment_listing.filters.total_items = data.totals.TotalItems;

						vm.utils.assessment_listing.data = data.data;
						vm.utils.assessment_listing.autoFilter();

						vm.utils.assessment_listing.overlayDbDraftCloseouts(vm.utils.assessment_listing.draft_closeouts);

						vm.utils.assessment_listing.loading = false;

					}, function(error) {
						vm.utils.assessment_listing.error_handler.logError(error);
						vm.utils.assessment_listing.loading = false;
					});

					return defer.promise;
				},
				overlayDbDraftCloseouts: function(draft_closeouts) {

					var i = 0;
					var len = vm.utils.assessment_listing.data.length;
					while(i < len) {

						vm.utils.assessment_listing.data[i].db_closeout_record = null;

						// IF THERE ARE DRAFT CLOSEOUTS
						if( draft_closeouts ) {

							var di = 0;
							var dlen = draft_closeouts.length;

							while(di < dlen) {

								if( vm.utils.assessment_listing.data[i].rm_ref == draft_closeouts[di].rm_ref ) {
									vm.utils.assessment_listing.data[i].db_closeout_record = draft_closeouts[di];
								}

								di++;
							}

						}

						i++;
					}

				},
				autoFilter: function() {
					// RESET
					vm.utils.assessment_listing.visible_data = [];

					var i = 0;
					var len = vm.utils.assessment_listing.data.length;
					var filtered = [];
					while(i < len) {
						var errors = 0;

						if( !errors ) {
							filtered.push(vm.utils.assessment_listing.data[i]);
						}

						i++;
					}

					vm.utils.assessment_listing.visible_data = filtered;
				},
				displayPhrase: function(assessment_record, stage) {
					return raFactory.utils.displayPhrase(assessment_record, stage);
				},
				riskLevelStyle: function(assessment_record, stage) {
					return raFactory.utils.riskLevelStyle(assessment_record, stage, vm.utils.theme.currentTheme);
				},
				
			},
			risk_bio: {
				start: function(risk_record, action) {

					if( !rmConnectivityFactory.online_detection.online ) {
						vm.utils.toasts.noInternetConnection();
						return;
					}

					vm.utils.assessment_listing.loading_closeout = true;

					var db_closeout_record = null;
					if( risk_record.hasOwnProperty('db_closeout_record') && risk_record.db_closeout_record ) {
						db_closeout_record = risk_record.db_closeout_record;
					}

					raFactory.requestSaveLocalCloseoutAssessment(risk_record, db_closeout_record).then(function(saved_risk_record) {

						if( db_closeout_record ) {
							risk_record.db_closeout_record._id = saved_risk_record._id;
							risk_record.db_closeout_record._rev = saved_risk_record._rev;
						}

						// vm.utils.risk_bio.slideout.show();

						var data = {
							assessment_id: saved_risk_record._id, 
							action: action
						}

						$rootScope.$broadcast("reportRiskAssessmentBio::start", data);

						vm.utils.assessment_listing.loading_closeout = false;

					}, function(error) {
						console.log(error);
						vm.utils.assessment_listing.loading_closeout = false;
					});

				},
			},
			active_assessment: {
				record: null,
				select: function(record){
					vm.utils.active_assessment.record = record;

					vm.utils.active_assessment.tabs.changeTab('control_measure');
				},
				clear: function(){
					vm.utils.active_assessment.record = null;
				},
				assessmentActive: function(record){
					var active = false;

					if( !record )
					{
						return false;
					}

					if( vm.utils.active_assessment.record && vm.utils.active_assessment.record.rm_id == record.rm_id )
					{
						active = true;
					}

					return active;
				},
				activeStyle: function(ra_record){
					var style = {
						"opacity" : "1"
					};

					if( !vm.utils.active_assessment.record )
					{
						return style;
					}

					if( ra_record.rm_id == vm.utils.active_assessment.record.rm_id )
					{
						style['opacity'] = '1';
					}
					else
					{
						style['opacity'] = '0.5';
					}

					return style;
				},
				tabs: {
					active_tab: 'control_items',
					changeTab: function(tab){
						vm.utils.active_assessment.tabs.active_tab = tab;

						// if( tab == 'images' ) {
						// 	vm.utils.risk_media.setRecord(vm.utils.active_assessment.record);
						// 	vm.utils.risk_media.getAllRecordAttachments(vm.utils.risk_media.record._id, 'assessment');

						// 	vm.utils.risk_media.re_order_media_mode = false;
						// }
					},
					tabActive: function(tab){
						var active = false;

						if( tab == vm.utils.active_assessment.tabs.active_tab )
						{
							active = true;
						}

						return active;
					}
				},
			},
			toasts: {
				noInternetConnection: function() {
					var toastEl = document.getElementById('ReportRiskListNoInternetConnectionToast');
					var toastInst = bootstrap.Toast.getOrCreateInstance(toastEl);
					toastInst.show();
				}
			},
			events: function() {	

				$scope.$on("reportRiskList::fetch", function(event, data) {
					vm.utils.assessment_listing.filters = data.filters;
					vm.utils.assessment_listing.refresh();
				});

				$scope.$on("reportRiskList::riskCloseout", function(event, data) {

					var i = 0;
					var len = vm.utils.assessment_listing.data.length;
					while(i < len) {

						if( vm.utils.assessment_listing.data[i].rm_id == data.risk_record.rm_id ) {
							vm.utils.assessment_listing.data[i].status = data.risk_record.status;
							vm.utils.assessment_listing.data[i].status_name = data.risk_record.status_name;
							vm.utils.assessment_listing.data[i].reported_ra_status_name = data.risk_record.reported_ra_status_name;
							vm.utils.assessment_listing.data[i].implementation_recorded_by = data.risk_record.implementation_recorded_by;

							if( vm.utils.assessment_listing.data[i].hasOwnProperty('db_closeout_record') && vm.utils.assessment_listing.data[i].db_closeout_record ) {
								vm.utils.assessment_listing.data[i].db_closeout_record._id = data.risk_record._id;
								vm.utils.assessment_listing.data[i].db_closeout_record._rev = data.risk_record._rev;
								vm.utils.assessment_listing.data[i].db_closeout_record.status = data.risk_record.status;
								vm.utils.assessment_listing.data[i].db_closeout_record.status_name = data.risk_record.status_name;
								vm.utils.assessment_listing.data[i].db_closeout_record.reported_ra_status_name = data.risk_record.reported_ra_status_name;
								vm.utils.assessment_listing.data[i].implementation_recorded_by = data.risk_record.implementation_recorded_by;
							}
 						}

						i++;
					}

				});

				$scope.$on("reportRiskList::riskRevised", function(event, data) {

					var i = 0;
					var len = vm.utils.assessment_listing.data.length;
					while(i < len) {

						if( vm.utils.assessment_listing.data[i].rm_ref == data.risk_record.rm_ref ) {
							
							raFactory.utils.updateRevisedRiskValues(vm.utils.assessment_listing.data[i], data.risk_record);

							if( vm.utils.assessment_listing.data[i].hasOwnProperty('db_closeout_record') && vm.utils.assessment_listing.data[i].db_closeout_record ) {
								vm.utils.assessment_listing.data[i].db_closeout_record._id = data.risk_record._id;
								vm.utils.assessment_listing.data[i].db_closeout_record._rev = data.risk_record._rev;
								
								raFactory.utils.updateRevisedRiskValues(vm.utils.assessment_listing.data[i].db_closeout_record, data.risk_record);
							}
 						}

						i++;
					}

				});

			}()
		}
	}

	function riskFormController($scope, $rootScope, $q, $filter, authFactory, rmUtilsFactory, riskmachDatabasesFactory, raFactory, mediaFactory, drawingPadFactory, modelsFactory, clipboardFactory, cloneUtilsFactory)
	{
		var vm = this;

		// vm.directive_id
		// vm.assessment_id;
		// vm.relations;

		vm.utils = {
			directive_id: vm.directive_id,
			assessment_id: vm.assessment_id,
			relations: vm.relations,
			is_mobile: rmUtilsFactory.mobileCheck(),
			is_loading: false,
			is_new: false,
			exit_stage: 1,
			ra_record: {
				hazard_type_name: null
			},
			risk_methods: raFactory.risk_methods,
			statutory_options: raFactory.statutory_options,
			risk_method_template: '',
			confirm_pull_pha_initial_values: false,
			confirm_pull_pha_after_values: false,
			saving_media: false,
			saving_media_message: null,
			moveMediaUp: function(current_index, media) {
				if( current_index == 0 ) {
					return;
				}

				var max_index = media.length - 1;
				var new_index = current_index - 1;

				vm.utils.arrayMove(media, current_index, new_index);
				vm.utils.updateMediaSequenceNumbers(media);
			},
			moveMediaDown: function(current_index, media) {
				var max_index = media.length - 1;

				if( current_index == max_index )
				{
					return;
				}

				var new_index = current_index + 1;
				vm.utils.arrayMove(media, current_index, new_index);
				vm.utils.updateMediaSequenceNumbers(media);
			},
			arrayMove: function(arr, old_index, new_index){
				if (new_index >= arr.length) {
				    var k = new_index - arr.length + 1;
				    while (k--) {
				        arr.push(undefined);
				    }
				}
				arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
				return arr; // for testing
			},
			updateMediaSequenceNumbers: function(media) {
				var i = 0;
				var len = media.length;

				while(i < len) {
					media[i].sequence_number = i;
					i++;
				}

				var db = riskmachDatabasesFactory.databases.collection.media;
				db.bulkDocs(media).then(function(results) {

					i = 0;

					while(i < len) {
						media[i]._id = results[i].id;
						media[i]._rev = results[i].rev;
						i++;
					}

				}).catch(function(error) {
					alert(error);
				});
			},
			showPhaSliderToggle: function() {
				var show = false;

				if( parseInt(vm.utils.ra_record.assessment_method) == 1 )
				{
					show = true;
				}

				return show;
			},
			exam_mode: {
				skip: false,
        		isActive: function() {
        			return authFactory.exam_mode.isActive();
        		}
        	},
			pha_sliders: {
				constructTicks: function() {
					vm.utils.pha_sliders.lo.options.stepsArray = raFactory.constructPhaSliderTicks(vm.utils.risk_utils.lo_list);
					vm.utils.pha_sliders.fe.options.stepsArray = raFactory.constructPhaSliderTicks(vm.utils.risk_utils.fe_list);
					vm.utils.pha_sliders.dph.options.stepsArray = raFactory.constructPhaSliderTicks(vm.utils.risk_utils.dph_list);
					vm.utils.pha_sliders.np.options.stepsArray = raFactory.constructPhaSliderTicks(vm.utils.risk_utils.np_list);
				},
				lo: {
					value: null,
					options: {
					    showTicks: false,
					    showSelectionBar: true,
					    hidePointerLabels: true,
    					hideLimitLabels: true,
						stepsArray: [],
						getSelectionBarColor: function(value) {
							return 'linear-gradient(to right, rgba(255,203,85,0), rgba(255,203,85,1))';
				        },
						getSelectionBarColorV1: function(value) {
							if( !value ) {
								return 'lightgrey';
							}

							if( value == '1.0' ) {
								return '#ffeb99';
							}

							if(  value == '2.0' || value == '5.0' ) {
								return '#ffcc33';
							}

							if( value == '8.0' || value == '10.0' ) {
								return 'orange';
							}

							if( value == '15.0' ) {
								return 'red';
							}
				        }
					},
				}, 
				fe: {
					value: null,
					options: {
					    showTicks: false,
					    showSelectionBar: true,
					    hidePointerLabels: true,
    					hideLimitLabels: true,
						stepsArray: [],
						getSelectionBarColor: function(value) {
							return 'linear-gradient(to right, rgba(128,128,128,0), rgba(128,128,128,1))';
				        }
					},
				},
				dph: {
					value: null,
					options: {
					    showTicks: false,
					    showSelectionBar: true,
					    hidePointerLabels: true,
    					hideLimitLabels: true,
						stepsArray: [],
						getSelectionBarColor: function(value) {
							return 'linear-gradient(to right, rgba(193,39,44,0), rgba(193,39,44,1))';
				        },
					},
				},
				np: {
					value: null,
					options: {
					    showTicks: false,
					    showSelectionBar: true,
					    hidePointerLabels: true,
    					hideLimitLabels: true,
						stepsArray: [],
						getSelectionBarColor: function(value) {
							return 'linear-gradient(to right, rgba(0,113,188,0), rgba(0,113,188,1))';
				        }
					},
				},
				events: function() {

					$scope.$watch("vm.utils.ra_record.lo_initial", function(newVal, oldVal) {

						if( !vm.utils.user_settings.data || !vm.utils.user_settings.data.show_pha_slider ) {
							return;
						}

						vm.utils.phaChanged('lo','initial');
						vm.utils.notSaved();

					});

					$scope.$watch("vm.utils.ra_record.lo_after", function(newVal, oldVal) {

						if( !vm.utils.user_settings.data || !vm.utils.user_settings.data.show_pha_slider ) {
							return;
						}

						vm.utils.phaChanged('lo','after');
						vm.utils.notSaved();

					});


					$scope.$watch("vm.utils.ra_record.fe_initial", function(newVal, oldVal) {

						if( !vm.utils.user_settings.data || !vm.utils.user_settings.data.show_pha_slider ) {
							return;
						}

						vm.utils.phaChanged('fe','initial');
						vm.utils.notSaved();

					});

					$scope.$watch("vm.utils.ra_record.fe_after", function(newVal, oldVal) {

						if( !vm.utils.user_settings.data || !vm.utils.user_settings.data.show_pha_slider ) {
							return;
						}

						vm.utils.phaChanged('fe','after');
						vm.utils.notSaved();

					});

					$scope.$watch("vm.utils.ra_record.dph_initial", function(newVal, oldVal) {

						if( !vm.utils.user_settings.data || !vm.utils.user_settings.data.show_pha_slider ) {
							return;
						}

						vm.utils.phaChanged('dph','initial');
						vm.utils.notSaved();

					});

					$scope.$watch("vm.utils.ra_record.dph_after", function(newVal, oldVal) {

						if( !vm.utils.user_settings.data || !vm.utils.user_settings.data.show_pha_slider ) {
							return;
						}

						vm.utils.phaChanged('dph','after');
						vm.utils.notSaved();

					});

					$scope.$watch("vm.utils.ra_record.np_initial", function(newVal, oldVal) {

						if( !vm.utils.user_settings.data || !vm.utils.user_settings.data.show_pha_slider ) {
							return;
						}

						vm.utils.phaChanged('np','initial');
						vm.utils.notSaved();

					});

					$scope.$watch("vm.utils.ra_record.np_after", function(newVal, oldVal) {

						if( !vm.utils.user_settings.data || !vm.utils.user_settings.data.show_pha_slider ) {
							return;
						}

						vm.utils.phaChanged('np','after');
						vm.utils.notSaved();

					});

				}()
			},
			user_settings: {
				loading: false,
				data: null,
				getSettings: function() {
					var defer = $q.defer();

					vm.utils.user_settings.loading = true;

					rmUtilsFactory.getCreateUserSettings().then(function(user_settings) {

						console.log(JSON.stringify(user_settings, null, 2));
						// alert("User settings");

						vm.utils.user_settings.data = user_settings;

						vm.utils.user_settings.loading = false;

						// $scope.$apply();

						defer.resolve();

					}, function(error) {
						vm.utils.user_settings.loading = false;
						defer.reject(error);
					});

					return defer.promise;
				},
				save: function() {

					vm.utils.user_settings.loading = true;

					rmUtilsFactory.saveUserSettings(vm.utils.user_settings.data).then(function(result) {

						vm.utils.user_settings.data._id = result._id;
						vm.utils.user_settings.data._rev = result._rev;

						vm.utils.user_settings.loading = false;

					}, function(error) {
						vm.utils.user_settings.loading = false;
						alert(error);
					});

				}
			},
			tabs: {
				tab: 'form',
				changeTab: function(tab){
					vm.utils.tabs.tab = tab;

					//BEFORE GOING TO IMAGE TAB 
					if( tab == 'images' )
					{
						//MAKE SURE RISK IS SAVED
						if( !vm.utils.ra_record.hasOwnProperty('_id') || !vm.utils.ra_record._id ) 
						{
							vm.utils.save().then(function(){
							
								vm.utils.risk_media.setRecord(vm.utils.ra_record);
								// vm.utils.risk_media.getAllRecordAttachments(vm.utils.risk_media.record._id, 'assessment');

							});
						}
						// else
						// {
						// 	vm.utils.risk_media.setRecord(vm.utils.ra_record);
						// 	vm.utils.risk_media.getAllRecordAttachments(vm.utils.risk_media.record._id, 'assessment');
						// }
					}
				},
				tabActive: function(tab){
					var active = false;

					if( tab == vm.utils.tabs.tab )
					{
						active = true;
					}

					return active;
				}
			},
			clipboard: {
				mode: null,
				clone_dest: null,
				directive_id: 'riskAssessmentForm',
				browseRecords: function(record_types, clone_dest, clone_dest_record){

					if( clone_dest == 'assessment' && !vm.utils.active_records.data.asset )
					{
						alert("You must have an active asset to add a risk assessment");
						return;
					}

					vm.utils.clipboard.clone_dest = clone_dest;
					vm.utils.clipboard.clone_dest_record = clone_dest_record;
					vm.utils.clipboard.mode = 'clone';
					clipboardFactory.browseClipboardForRecord(record_types);
					clipboardFactory.setDirectiveId(vm.utils.clipboard.directive_id);
				},
				browseRecordsInline: function(record_types, clone_dest, clone_dest_record) {
					if( clone_dest == 'assessment' && !vm.utils.active_records.data.asset )
					{
						alert("You must have an active asset to add a risk assessment");
						return;
					}

					vm.utils.clipboard.clone_dest = clone_dest;
					vm.utils.clipboard.clone_dest_record = clone_dest_record;
					vm.utils.clipboard.mode = 'clone';
					vm.utils.tabs.changeTab('clipboard');
					clipboardFactory.browseClipboardForRecordInline(record_types);
					clipboardFactory.setDirectiveId(vm.utils.clipboard.directive_id);
				},
				exit: function(){
					$rootScope.$broadcast("clipboard::exit");
				},
				events: function(){

					// $scope.$on("clipboard::exit", function(event, data){
					// 	vm.utils.clipboard.aside.hide();
					// });

					$scope.$on("clipboard::itemsConfirmed", function(event, data){

						vm.utils.clipboard.exit();

						if( data.directive_id != vm.utils.clipboard.directive_id ) {
							return;
						}

						if( vm.utils.clipboard.mode != 'clone' )
						{
							return;
						}

						console.log("SELECTED CLIPBOARD ITEMS");
						console.log(data.items);
						console.log(vm.utils.clipboard.clone_dest);

						if( vm.utils.clipboard.clone_dest == 'assessment' )
						{
							var record_ids = [];

							angular.forEach(data.items, function(record, index){

								if( record.record_type == 'assessment' )
								{
									record_ids.push( record.record_id );
								}

							});

							console.log("ASSESSMENT IDS TO CLONE");
							console.log(record_ids);

							vm.utils.clone_assessment.cloneMultiple(record_ids);
							return;
						}

						if( vm.utils.clipboard.clone_dest == 'snapshot_asset' )
						{
							var record_ids = [];

							angular.forEach(data.items, function(record, index){

								if( record.record_type == 'snapshot_asset' )
								{
									record_ids.push( record.record_id );
								}

							});

							console.log("ASSET IDS TO CLONE");
							console.log(record_ids);

							vm.utils.clone_asset.cloneMultiple(record_ids);
							return;
						}

						if( vm.utils.clipboard.clone_dest == 'risk_image' )
						{
							var record_ids = [];

							angular.forEach(data.items, function(record, index){

								if( record.record_type == 'image' )
								{
									record_ids.push( record.record_id );
								}

							});

							console.log("IMAGE IDS TO CLONE");
							console.log(record_ids);

							$rootScope.$broadcast("imageSensitivity::review", {
								record_type: 'image', 
								record_ids: record_ids,
								directive_id: 'risk_form'
							});

							// vm.utils.clone_image.cloneMultiple(record_ids);
							return;
						}
						
					});

				}()
			},
			riskLevelStyle: function(phrase){
				var style = [];

				var style = {
					'color': '#00435F'
				};

				if( !phrase )
				{
					return style;
				}

				if( phrase == 'Negligible' || phrase == 'Very Low' || phrase == 'Low' )
				{
					style['color'] = '#00435F';
				}

				if( phrase == 'Significant' )
				{
					style['color'] = '#F6A13E';
				}

				if( phrase == 'High' || phrase == 'Very High' || phrase == 'Extreme' || phrase == 'Unacceptable')
				{
					style['color'] = '#C24E4F';
				}

				return style;
			},
			drawing_pad: {
				// WILL NEED TO PASS DRAWING PAD DIRECTIVE ID IN TO ASSESSMENT FORM DIRECTIVE
				// SO RISK FORM CAN BE USED IN OTHER PAGES
				directive_id: 'checklistAuditsDrawingPad',
				media_record: null,
				record_type: null,
				start: function(media_record, record_type){
					vm.utils.drawing_pad.media_record = media_record;
					vm.utils.drawing_pad.record_type = record_type;
					drawingPadFactory.newDrawing(vm.utils.drawing_pad.directive_id, media_record._id);
				},
				hide: function(){
					$rootScope.$broadcast("drawingPad::hide");
				},
				events: function(){

					$scope.$on("drawingPad::saved", function(event, data){
						vm.utils.drawing_pad.hide();

						//REFRESH TASK MEDIA
						if( vm.utils.drawing_pad.record_type == 'assessment' )
						{
							// vm.utils.risk_media.getAllRecordAttachments(vm.utils.risk_media.record._id, 'assessment');

							// REVOKE STORED URL SO NEW ONE IS GENERATED FOR DRAWN ON IMAGE
							mediaFactory.img_urls.revokeStoredUrl('risks', data.media_record._id);

							vm.utils.risk_media.getMediaRecordAttachment(data.media_record).then(function() {
								vm.utils.risk_media.updateListMediaData(data.media_record);
							});
						}

						// if( vm.utils.drawing_pad.record_type == 'assessment' )
						// {
						// 	vm.utils.getAllHazardAttachments(vm.utils.active_hazard.record);
						// }

					});

				}()
			},
			notSaved: function(){
				vm.utils.saved = false;
			},
			newRiskRecord: function(){
				var ra_record = {
					rm_id: null,
					rm_ref: null,
					revision_number: null,
					synced: false,
					imported: false,
					activity_id: vm.utils.relations.activity_id,
					asset_id: vm.utils.relations.asset_id,
					status: 4, //DRAFT
					added_by: authFactory.cloudUserId(),
					user_id: authFactory.cloudUserId(),
					company_id: authFactory.cloudCompanyId(),
					date_added: new Date().getTime(),
					assessment_type: vm.utils.relations.assessment_type, //CHECK THIS CORRECT,
					hazard_type: null,
					hazard_origin: null,
					hazard_consequence: null,
					hazard_description: null,
					control_description: null,
					assessment_method: 1, //DEFAULT PHA
					statutory: null,
					lo_initial: null,
					lo_initial_name: null,
					fe_initial: null,
					fe_initial_name: null,
					np_initial: null,
					np_initial_name: null,
					dph_initial: null,
					dph_initial_name: null,
					hrn_initial: null,
					hrn_phrase_initial: null,
					hrn_phrase_name_initial: null,
					lo_after: null,
					lo_after_name: null,
					fe_after: null,
					fe_after_name: null,
					np_after: null,
					np_after_name: null,
					dph_after: null,
					dph_after_name: null,
					hrn_after: null,
					hrn_phrase_after: null,
					hrn_phrase_name_after: null,
					matrix_likelihood_initial: null,
					matrix_likelihood_phrase_initial: null,
					matrix_consequence_initial: null,
					matrix_consequence_phrase_initial: null,
					matrix_score_initial: null,
					matrix_score_phrase_initial: null,
					matrix_likelihood_after: null,
					matrix_likelihood_phrase_after: null,
					matrix_consequence_after: null,
					matrix_consequence_phrase_after: null,
					matrix_score_after: null,
					matrix_score_phrase_after: null,
					simple_risk_phrase_id_initial: null,
					simple_risk_phrase_id_initial_name: null,
					simple_risk_phrase_id_after: null,
					simple_risk_phrase_id_after_name: null,
					simple_risk_phrase_initial: null,
					simple_risk_rating_initial: null,
					simple_risk_phrase_after: null,
					simple_risk_rating_after: null,
					ria_severity_initial_score: null,
					ria_severity_initial: null,
					ria_exposure_initial_score: null,
					ria_exposure_initial: null,
					ria_avoidance_initial_score: null,
					ria_avoidance_initial: null,
					ria_risk_score_initial: null,
					ria_risk_level_initial: null,
					ria_severity_after_score: null,
					ria_severity_after: null,
					ria_exposure_after_score: null,
					ria_exposure_after: null,
					ria_avoidance_after_score: null,
					ria_avoidance_after: null,
					ria_risk_score_after: null,
					ria_risk_level_after: null,
					quick_capture_risk: null,
					is_pool_item: null
				};

				// SET RISK METHOD TO USER SETTINGS
				if( vm.utils.user_settings.data && vm.utils.user_settings.data.hasOwnProperty('risk_method') && vm.utils.user_settings.data.risk_method ) {
					ra_record.assessment_method = vm.utils.user_settings.data.risk_method;
				}

				// OVER-RULE RISK METHOD SETTINGS IF LOLER INSPECTION
				if( vm.utils.relations.hasOwnProperty('pp_id') && vm.utils.relations.pp_id == 14 ) {
					ra_record.assessment_method = 6;
				}

				// SET POOL ITEM FLAG
				if( vm.utils.relations.hasOwnProperty('is_pool_item') && vm.utils.relations.is_pool_item == 'Yes' ) {
					ra_record.is_pool_item = 'Yes';
				}

				vm.utils.ra_record = ra_record;
				vm.utils.is_new = true;
				vm.utils.saved = false;
				vm.utils.exit_stage = 1;

				vm.utils.riskMethodIncludePath();

				console.log("CREATED NEW RISK RECORD");
				console.log(vm.utils.ra_record);
			},
			getRiskRecord: function(doc_id){
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.assessments.get(doc_id).then(function(doc){
					vm.utils.ra_record = doc;
					console.log("FOUND RISK RECORD");
					console.log(vm.utils.ra_record);
					vm.utils.saved = true;
					vm.utils.exit_stage = 1;

					vm.utils.riskMethodIncludePath();

					defer.resolve();
				}).catch(function(error){
					alert(error);
					defer.reject(error);
				});

				return defer.promise;
			},
			tryExit: function(){
				vm.utils.exit_stage = 2;
			},
			exit: function(){
				$rootScope.$broadcast("assessmentForm::exit", { directive_id: vm.utils.directive_id, risk_record: vm.utils.ra_record });
			},
			saveClose: function(){
				vm.utils.save().then(function(){
					vm.utils.exit();
				});
			},
			save: function(){
				var defer = $q.defer();

				//SAVE THE ASSESSMENT RECORD
				vm.utils.is_loading = true;

				if( parseInt(vm.utils.ra_record.status) == 4 || parseInt(vm.utils.ra_record.status) == 7 )
				{
					if( vm.utils.riskComplete() )
					{
						vm.utils.ra_record.status = 7;
						vm.utils.ra_record.status_name = 'Published';
					}
					else
					{
						vm.utils.ra_record.status = 4;
						vm.utils.ra_record.status_name = 'Draft';
					}
				}

				raFactory.saveAssessment(vm.utils.ra_record).then(function(ra_record){

					console.log("SAVED THE ASSESSMENT RECORD");
					console.log(ra_record);

					ra_record.record_modified = 'Yes';

					var saved_data = {
						directive_id: vm.utils.directive_id, 
						risk_record: vm.utils.ra_record, 
						relation_record: null
					}

					//IF THERES AN ACTIVE QUESTION LINK TO IT
					if( vm.utils.is_new == true && (vm.utils.relations.question_id || vm.utils.relations.question_record_uuid) )
					{
						var relation_record = modelsFactory.models.newQuestionAssessmentRelation();
						relation_record.checklist_record_id = vm.utils.relations.checklist_record_id;
						relation_record.question_record_id = vm.utils.relations.question_record_id;
						relation_record.question_id = vm.utils.relations.question_id;
						relation_record.assessment_id = ra_record._id;
						relation_record.rm_question_ref = vm.utils.relations.rm_question_ref;
						relation_record.user_id = authFactory.cloudUserId();
						relation_record.company_id = authFactory.cloudCompanyId();
						relation_record.added_by = authFactory.cloudUserId();
						relation_record.status = 1;
						relation_record.activity_id = vm.utils.relations.activity_id;
						relation_record.asset_id = vm.utils.relations.asset_id;
						relation_record.question_record_uuid = vm.utils.relations.question_record_uuid;
						relation_record.question_uuid = vm.utils.relations.question_uuid;
						relation_record.is_uaudit = vm.utils.relations.is_uaudit;

						console.log("RELATION BEFORE SAVE");
						console.log(relation_record);

						raFactory.saveRaQuestionRelation(relation_record).then(function(relation_record){

							console.log("SAVED THE ASSESSMENT QUESTION RELATION");
							console.log(relation_record);

							saved_data.relation_record = relation_record;

							defer.resolve();
							vm.utils.is_new = false;
							vm.utils.is_loading = false;

							$rootScope.$broadcast("assessmentForm::saved", saved_data);

						}, function(error){
							alert(error);
							vm.utils.is_loading = false;
							defer.reject(error);
						});
					}
					else
					{
						vm.utils.is_new = false;
						defer.resolve();
						vm.utils.is_loading = false;

						$rootScope.$broadcast("assessmentForm::saved", saved_data);
					}

				}, function(error){
					vm.utils.is_loading = false;
					defer.reject(error);
				});

				return defer.promise;
			},
			refreshRev: function(data) {
				vm.utils.ra_record._id = data.record_id;
				vm.utils.ra_record._rev = data.record_rev;

				// $rootScope.$broadcast("assessmentForm::saved", { directive_id: vm.utils.directive_id, record: vm.utils.ra_record });
			},
			riskMethodIncludePath: function(){
				var path  = '../rm-utils/assessments/tpl/risk_form_pha_include.html';

				if( !vm.utils.ra_record )
				{
					vm.utils.risk_method_template = path;
					return;
				}

				//PHA
				if( parseInt(vm.utils.ra_record.assessment_method) == 1 )
				{
					if( vm.utils.user_settings.data.show_pha_slider ) {
						path = '../rm-utils/assessments/tpl/risk_form_pha_slider_include.html';
					} else {
						path = '../rm-utils/assessments/tpl/risk_form_pha_include.html';
					}
				}

				//MATRIX
				if( parseInt(vm.utils.ra_record.assessment_method) == 2 )
				{
					setTimeout(function(){
						vm.utils.matrix_initial.populateValues();
						vm.utils.matrix_after.populateValues();
						$scope.$apply();
					}, 0);
					
					path = '../rm-utils/assessments/tpl/risk_form_matrix_include.html';
				}

				//SIMPLE RISK RATING
				if( parseInt(vm.utils.ra_record.assessment_method) == 3 )
				{
					path = '../rm-utils/assessments/tpl/simple_risk_method_include.html';
				}

				//RIA
				if( parseInt(vm.utils.ra_record.assessment_method) == 4 )
				{
					vm.utils.ria.filter();
					path = '../rm-utils/assessments/tpl/ria_method_include.html';
				}

				//RACKING METHOD
				if( parseInt(vm.utils.ra_record.assessment_method) == 5 )
				{
					vm.utils.racking_score.populateValues();
					path = '../rm-utils/assessments/tpl/racking_method_include.html';
				}

				//DETERIORATION METHOD
				if( parseInt(vm.utils.ra_record.assessment_method) == 6 )
				{
					vm.utils.deterioration_score.populateValues();
					path = '../rm-utils/assessments/tpl/deterioration_method_include.html';
				}

				vm.utils.risk_method_template = path;
			},
			defaultRiskMethodChanged: function() {
				var method_changed = false;
				var default_method = null;

				if( vm.utils.user_settings.data && vm.utils.user_settings.data.hasOwnProperty('risk_method') && vm.utils.user_settings.data.risk_method ) {
					default_method = vm.utils.user_settings.data.risk_method;
				}

				// IF CURRENT RISK METHOD DIFFERENT TO DEFAULT
				if( default_method && vm.utils.ra_record.assessment_method != default_method ) {
					method_changed = true;
				} 

				return method_changed;
 			},
 			defaultRiskMethodSet: function() {
 				var method_set = false;
 				var default_method = null;

				if( vm.utils.user_settings.data && vm.utils.user_settings.data.hasOwnProperty('risk_method') && vm.utils.user_settings.data.risk_method ) {
					method_set = true;
				}

				return method_set;
 			},
 			updateDefaultRiskMethod: function() {
 				vm.utils.user_settings.data.risk_method = vm.utils.ra_record.assessment_method;

 				vm.utils.user_settings.save();
 			},
			riskComplete: function() {
				var complete = false;
				var num_fails = 0;

				if( !vm.utils.ra_record.hazard_type )
				{
					num_fails++;
				}

				if( !vm.utils.ra_record.hazard_origin && vm.utils.hazard_utils.visible_origins.length > 0 )
				{
					num_fails++;
				}

				if( !vm.utils.ra_record.hazard_consequence && vm.utils.hazard_utils.visible_consequences.length > 0 )
				{
					num_fails++;
				}

				if( !vm.utils.ra_record.hazard_description )
				{
					num_fails++;
				}

				if( !vm.utils.ra_record.control_description )
				{
					num_fails++;
				}

				// ONLY RUN FOLLOWING CHECKS IF NOT IN EXAM MODE
				if( !vm.utils.exam_mode.isActive() ) 
				{
					//METHOD 0 IS ALSO PHA SO CANT CHECK WITH !
					if( vm.utils.ra_record.assessment_method == null )
					{
						num_fails++;
					}

					if( !vm.utils.ra_record.statutory )
					{
						num_fails++;
					}

					//PHA METHOD
					if( parseInt(vm.utils.ra_record.assessment_method) == 0 || parseInt(vm.utils.ra_record.assessment_method) == 1 )
					{
						console.log(vm.utils.ra_record);
						console.log(JSON.stringify(vm.utils.ra_record, null, 2));

						if( vm.utils.ra_record.lo_initial === null )
						{
							num_fails++;
						}

						if( vm.utils.ra_record.lo_after === null )
						{
							num_fails++;
						}

						if( vm.utils.ra_record.fe_initial === null )
						{
							num_fails++;
						}

						if( vm.utils.ra_record.fe_after === null )
						{
							num_fails++;
						}


						if( vm.utils.ra_record.np_initial === null )
						{
							num_fails++;
						}

						if( vm.utils.ra_record.np_after === null )
						{
							num_fails++;
						}

						if( vm.utils.ra_record.dph_initial === null )
						{
							num_fails++;
						}

						if( vm.utils.ra_record.dph_after === null )
						{
							num_fails++;
						}

						if( vm.utils.ra_record.hrn_initial === null )
						{
							num_fails++;
						}

						if( vm.utils.ra_record.hrn_after === null )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.hrn_phrase_initial )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.hrn_phrase_after )
						{
							num_fails++;
						}
					}

					//MATRIX METHOD
					if( parseInt(vm.utils.ra_record.assessment_method) == 2 )
					{
					
						if( !vm.utils.ra_record.matrix_consequence_initial )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.matrix_consequence_phrase_initial )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.matrix_likelihood_initial )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.matrix_likelihood_phrase_initial )
						{
							num_fails++;
						}

						if( vm.utils.ra_record.matrix_score_initial == null )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.matrix_score_phrase_initial )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.matrix_consequence_after )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.matrix_consequence_phrase_after )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.matrix_likelihood_after )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.matrix_likelihood_phrase_after )
						{
							num_fails++;
						}

						if( vm.utils.ra_record.matrix_score_after == null )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.matrix_score_phrase_after )
						{
							num_fails++;
						}
					}

					//SIMPLE METHOD
					if( parseInt(vm.utils.ra_record.assessment_method) == 3 )
					{
						if( !vm.utils.ra_record.simple_risk_phrase_id_initial )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.simple_risk_phrase_id_after )
						{
							num_fails++;
						}
					}

					//RIA METHOD
					if( parseInt(vm.utils.ra_record.assessment_method) == 4 )
					{
						if( !vm.utils.ra_record.ria_severity_initial_score )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.ria_exposure_initial_score )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.ria_avoidance_initial_score && vm.utils.ria.avoidance_initial.length > 0 )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.ria_severity_after_score )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.ria_exposure_after_score )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.ria_avoidance_after_score && vm.utils.ria.avoidance_after.length > 0 )
						{
							num_fails++;
						}
					}

					//RACKING METHOD
					if( parseInt(vm.utils.ra_record.assessment_method) == 5 )
					{
						if( vm.utils.ra_record.matrix_score_initial == null )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.matrix_score_phrase_initial )
						{
							num_fails++;
						}
					}

					//DETERIORATION METHOD
					if( parseInt(vm.utils.ra_record.assessment_method) == 6 )
					{
						if( vm.utils.ra_record.matrix_score_initial == null )
						{
							num_fails++;
						}

						if( !vm.utils.ra_record.matrix_score_phrase_initial )
						{
							num_fails++;
						}
					}
				}

				if( num_fails == 0 )
				{
					complete = true;
				}

				return complete;
			},
			hazardSetChanged: function(){
				console.log("Hazard Set Changed");

				vm.utils.hazard_utils.visible_types = [];
				vm.utils.hazard_utils.visible_origins = [];
				vm.utils.hazard_utils.visible_consequences = [];

				// vm.utils.ra_record.hazard_set_name = vm.utils.hazard_form.getHazardSetName(vm.utils.hazard_utils.hazard_set_id);
				vm.utils.ra_record.hazard_type = null;
				vm.utils.ra_record.hazard_type_name = null;
				vm.utils.ra_record.hazard_origin = null;
				vm.utils.ra_record.hazard_origin_name = null;
				vm.utils.ra_record.hazard_consequence = null;
				vm.utils.ra_record.hazard_consequence_name = null;

				vm.utils.hazard_utils.visible_types = vm.utils.hazard_utils.filterHazardTypes(vm.utils.hazard_utils.hazard_set_id);
				console.log("Filtered Hazard Types");
				console.log(vm.utils.hazard_utils.visible_types);
			},
			hazardChanged: function(){
				vm.utils.ra_record.hazard_origin = null;
				vm.utils.ra_record.hazard_origin_name = null;
				vm.utils.ra_record.hazard_consequence = null;
				vm.utils.ra_record.hazard_consequence_name = null;

				//UPDATE HAZARD TYPE NAME
				var type_name = null;

				angular.forEach(vm.utils.hazard_utils.visible_types, function(record, index){

					if( parseInt(record.HazardID) == parseInt(vm.utils.ra_record.hazard_type) )
					{
						type_name = record.HazardName;
					}

				});

				vm.utils.ra_record.hazard_type_name = type_name;

				console.log("HAZARD TYPE NAME UPDATED: " + vm.utils.ra_record.hazard_type_name);
			},
			originChanged: function(){
				vm.utils.ra_record.hazard_origin_name = null;
				vm.utils.ra_record.hazard_consequence = null;
				vm.utils.ra_record.hazard_consequence_name = null;

				//UPDATE HAZARD ORIGIN NAME
				var origin_name = null;

				angular.forEach(vm.utils.hazard_utils.visible_origins, function(record, index){

					if( parseInt(record.HazardOriginID) == parseInt(vm.utils.ra_record.hazard_origin) )
					{
						origin_name = record.Description;
					}

				});

				vm.utils.ra_record.hazard_origin_name = origin_name;

				console.log("HAZARD ORIGIN NAME UPDATED: " + vm.utils.ra_record.hazard_origin_name);
			},
			consequenceChanged: function(){
				vm.utils.ra_record.hazard_consequence_name = null;

				//UPDATE HAZARD ORIGIN NAME
				var consequence_name = null;

				angular.forEach(vm.utils.hazard_utils.visible_consequences, function(record, index){

					if( parseInt(record.HazardConsequenceID) == parseInt(vm.utils.ra_record.hazard_consequence) )
					{
						consequence_name = record.Description;
					}

				});

				vm.utils.ra_record.hazard_consequence_name = consequence_name;

				console.log("HAZARD CONSEQUENCE NAME UPDATED: " + vm.utils.ra_record.hazard_consequence_name);
			},
			methodChanged: function(){
				var method_name = null;

				angular.forEach(vm.utils.risk_methods, function(record, index){

					if( parseInt(record.id) == parseInt(vm.utils.ra_record.assessment_method) )
					{
						method_name = record.name;
					}

				});

				vm.utils.ra_record.assessment_method_name = method_name;
				console.log("RISK METHOD NAME: " + vm.utils.ra_record.assessment_method_name);

				// CLEAR OTHER RISK METHOD SCORES
				vm.utils.clearAltRiskMethods();

				vm.utils.riskMethodIncludePath();
			},
			clearAltRiskMethods: function() {
				var i = 0;
				var len = vm.utils.risk_methods.length;

				while(i < len) {

					// CLEAR IF METHOD NOT USED ON RISK
					if( vm.utils.ra_record.assessment_method != vm.utils.risk_methods[i].id ) {

						// PHA
						if( vm.utils.risk_methods[i].id == 1 ) {
							vm.utils.clearPhaValues();
						}

						// MATRIX
						if( vm.utils.risk_methods[i].id == 2 ) {

							// ONLY IF NOT RACKING OR DETERIORATION
							if( vm.utils.ra_record.assessment_method != 5 && vm.utils.ra_record.assessment_method != 6 ) {
								vm.utils.matrix_initial.clearMatrixInitialValues();
								vm.utils.matrix_after.clearMatrixAfterValues();
							}
						}

						// SIMPLE RISK RATING
						if( vm.utils.risk_methods[i].id == 3 ) {
							vm.utils.clearSimpleRiskValues();
						}

						// RIA
						if( vm.utils.risk_methods[i].id == 4 ) {
							vm.utils.ria.clearRiaValues();
						}

						// RACKING
						if( vm.utils.risk_methods[i].id == 5 ) {

							// ONLY CLEAR IF NOT MATRIX OR DETERIORATION
							if( vm.utils.ra_record.assessment_method != 2 && vm.utils.ra_record.assessment_method != 6 ) {
								vm.utils.racking_score.clearRackingValues();
							}

						}

						// DETERIORATION
						if( vm.utils.risk_methods[i].id == 6 ) {

							// ONLY CLEAR IF NOT MATRIX OR RACKING
							if( vm.utils.ra_record.assessment_method != 2 && vm.utils.ra_record.assessment_method != 5 ) {
								vm.utils.deterioration_score.clearDeteriorationValues();
							}

						}

					}

					i++;
				}
			},
			statutoryChanged: function(){
				var stat_name = null;

				if( vm.utils.ra_record.statutory == 'Yes' )
				{
					stat_name = 'Statutory';
				}

				if( vm.utils.ra_record.statutory == 'No' )
				{
					stat_name = 'Advisory';
				}

				vm.utils.ra_record.statutory_name = stat_name;

				console.log("STATUTORY CHANGED");
				console.log(vm.utils.ra_record.statutory_name);
			},
			phaChanged: function(part, stage){

				var name = null;
				var current_value = vm.utils.ra_record[part + '_' + stage];

				angular.forEach(vm.utils.risk_utils[part + '_list'], function(record, index){

					if( parseFloat(record.Value) == parseFloat(current_value) )
					{
						console.log("PHA LIST RECORD");
						console.log(record);
						name = record.Description;
					}

				});

				vm.utils.ra_record[part + '_name_' + stage] = name;

				console.log(part + " " + stage + " CHANGED: " + vm.utils.ra_record[part + '_name_' + stage]);

				//CALC HRN
				vm.utils.calcHrn(stage);

				console.log("RISK RECORD");
				console.log(vm.utils.ra_record);
			},
			calcHrn: function(stage) {
				var hrn_data = raFactory.calcHrn(vm.utils.ra_record['lo_' + stage], vm.utils.ra_record['fe_' + stage], vm.utils.ra_record['np_' + stage], vm.utils.ra_record['dph_' + stage], vm.utils.risk_utils.hrn_list);
				// console.log("CALC HRN DATA");
				// console.log(hrn_data);

				vm.utils.ra_record['hrn_' + stage] = hrn_data.score;
				vm.utils.ra_record['hrn_phrase_' + stage] = hrn_data.phrase_id;
				vm.utils.ra_record['hrn_phrase_name_' + stage] = hrn_data.phrase_name;
			},
			pullPhaValues: function(from_stage, dest_stage, skip_check) {

				if( vm.utils.ra_record['hrn_phrase_name_' + dest_stage] && !skip_check ) {

					if( from_stage == 'after' ) {
						vm.utils.confirm_pull_pha_after_values = true;
					}

					if( from_stage == 'initial' ) {
						vm.utils.confirm_pull_pha_initial_values = true;
					}

					return;
				}

				if( from_stage == 'after' ) {
					vm.utils.confirm_pull_pha_after_values = false;
				}

				if( from_stage == 'initial' ) {
					vm.utils.confirm_pull_pha_initial_values = false;
				}

				vm.utils.ra_record['lo_' + dest_stage] = vm.utils.ra_record['lo_' + from_stage];
				vm.utils.ra_record['fe_' + dest_stage] = vm.utils.ra_record['fe_' + from_stage];
				vm.utils.ra_record['dph_' + dest_stage] = vm.utils.ra_record['dph_' + from_stage];
				vm.utils.ra_record['np_' + dest_stage] = vm.utils.ra_record['np_' + from_stage];

				vm.utils.calcHrn(dest_stage);

			},
			cancelPullPhaValues: function(from_stage) {
				if( from_stage == 'after' ) {
					vm.utils.confirm_pull_pha_after_values = false;
				}

				if( from_stage == 'initial' ) {
					vm.utils.confirm_pull_pha_initial_values = false;
				}
			},
			clearPhaValues: function() {

				vm.utils.ra_record.dph_after = null;
				vm.utils.ra_record.dph_after_name = null;
				vm.utils.ra_record.dph_initial = null;
				vm.utils.ra_record.dph_initial_name = null;
				vm.utils.ra_record.dph_name_after = null;
				vm.utils.ra_record.dph_name_initial = null;

				vm.utils.ra_record.fe_after = null;
				vm.utils.ra_record.fe_after_name = null;
				vm.utils.ra_record.fe_initial = null;
				vm.utils.ra_record.fe_initial_name = null;
				vm.utils.ra_record.fe_name_after = null;
				vm.utils.ra_record.fe_name_initial = null;

				vm.utils.ra_record.hrn_after = null;
				vm.utils.ra_record.hrn_initial = null;
				vm.utils.ra_record.hrn_phrase_after = null;
				vm.utils.ra_record.hrn_phrase_initial = null;
				vm.utils.ra_record.hrn_phrase_name_after = null;
				vm.utils.ra_record.hrn_phrase_name_initial = null;

				vm.utils.ra_record.lo_after = null;
				vm.utils.ra_record.lo_after_name = null;
				vm.utils.ra_record.lo_initial = null;
				vm.utils.ra_record.lo_initial_name = null;
				vm.utils.ra_record.lo_name_after = null;
				vm.utils.ra_record.lo_name_initial = null;

				vm.utils.ra_record.np_after = null;
				vm.utils.ra_record.np_after_name = null;
				vm.utils.ra_record.np_initial = null;
				vm.utils.ra_record.np_initial_name = null;
				vm.utils.ra_record.np_name_after = null;
				vm.utils.ra_record.np_name_initial = null;

			},
			events: function() {
				$scope.$on("recordRev::new", function(event, data) {
					if( data.record_type == 'assessment' && vm.utils.ra_record._id && vm.utils.ra_record._id == data.record_id ) {
						vm.utils.refreshRev(data);
					}
				});
			}(),
			hazard_utils: {
				hazard_set_id: 2,
				hazard_sets: null,
				hazard_set_items: null,
				types: null,
				visible_types: [],
				origins: null,
				visible_origins: [],
				consequences: null,
				visible_consequences: [],
				filterHazardTypes: function(hazard_set_id){
					var hazard_types = [];

					angular.forEach(vm.utils.hazard_utils.hazard_set_items, function(item_record, item_index){

						if( parseInt(item_record.SetID) == parseInt(hazard_set_id) )
						{
							angular.forEach(vm.utils.hazard_utils.types, function(type_record, type_index){

								if( parseInt(item_record.HazardTypeID) == parseInt(type_record.HazardID) )
								{
									var add_hazard = angular.copy(type_record);
									add_hazard.display_index = parseInt(item_record.SequenceNumber);
									hazard_types.push(add_hazard);
								}

							});
						}

					});

					hazard_types = $filter('orderBy')(hazard_types, 'display_index');

					return hazard_types;
				},
				filterHazardOrigins: function(hazard_type_id){
					var hazard_origins = [];

					angular.forEach(vm.utils.hazard_utils.origins, function(record, index){

						if( parseInt(record.HazardType) == parseInt(hazard_type_id) )
						{
							var add_origin = angular.copy(record);
							hazard_origins.push(add_origin);
						}

					});

					vm.utils.hazard_utils.visible_origins = $filter('orderBy')(hazard_origins, 'Description');
				},
				filterHazardConsequences: function(hazard_type_id){
					var hazard_consequences = [];

					angular.forEach(vm.utils.hazard_utils.consequences, function(record, index){

						if( parseInt(record.HazardType) == parseInt(hazard_type_id) )
						{
							var add_consequence = angular.copy(record);
							hazard_consequences.push(add_consequence);
						}

					});

					vm.utils.hazard_utils.visible_consequences = $filter('orderBy')(hazard_consequences, 'Description');
				},
				getAllData: function(){
					var defer = $q.defer();

					var promises = {
						hazard_sets: vm.utils.hazard_utils.getHazardSets(),
						hazard_set_items: vm.utils.hazard_utils.getHazardSetItems(),
						types: vm.utils.hazard_utils.getHazardTypes(),
						origins: vm.utils.hazard_utils.getHazardOrigins(),
						consequences: vm.utils.hazard_utils.getHazardConsequences()
					};

					$q.all(promises).then(function(){

						// SET HAZARD SET TO DEFAULT SYSTEM HAZARD SET
						vm.utils.hazard_utils.hazard_set_id = 2;

						// OVER-RULE HAZARD SET IF LOLER INSPECTION
						if( vm.utils.relations.hasOwnProperty('pp_id') && vm.utils.relations.pp_id == 14 ) {
							
							// IF HAZARD SET IS ON DEVICE
							if( vm.utils.hazard_utils.hasHazardSet(16) ) {
								vm.utils.hazard_utils.hazard_set_id = 16;
							}

						}

						//FILTER SYSTEM HAZARD TYPE BY DEFAULT
						vm.utils.hazard_utils.visible_types = vm.utils.hazard_utils.filterHazardTypes(vm.utils.hazard_utils.hazard_set_id);
						console.log("FILTERED HAZARD TYPES");
						console.log(vm.utils.hazard_utils.visible_types);

						$scope.$apply();
						defer.resolve();
					}, function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getHazardSets: function(){
					var defer = $q.defer();

					//FIND EXISTING STAGE RECORD
					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'hazard_sets',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){
						vm.utils.hazard_utils.hazard_sets = [];

						if( results.docs.length > 0 )
						{
							vm.utils.hazard_utils.hazard_sets = results.docs[0].data;
						}

						console.log("HAZARD SETS");
						console.log(vm.utils.hazard_utils.hazard_sets);
						defer.resolve();

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getHazardSetItems: function(){
					var defer = $q.defer();

					//FIND EXISTING STAGE RECORD
					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'hazard_set_items',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){
						vm.utils.hazard_utils.hazard_set_items = [];

						if( results.docs.length > 0 )
						{
							vm.utils.hazard_utils.hazard_set_items = results.docs[0].data;
						}

						console.log("HAZARD SET ITEMS");
						console.log(vm.utils.hazard_utils.hazard_set_items);
						defer.resolve();

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getHazardTypes: function(){
					var defer = $q.defer();

					//FIND EXISTING STAGE RECORD
					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'hazard_types',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){
						vm.utils.hazard_utils.types = [];

						if( results.docs.length > 0 )
						{
							vm.utils.hazard_utils.types = results.docs[0].data;
						}

						console.log("HAZARD TYPES");
						console.log(vm.utils.hazard_utils.types);

						defer.resolve();

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getHazardOrigins: function(){
					var defer = $q.defer();

					//FIND EXISTING STAGE RECORD
					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'hazard_origins',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){
						vm.utils.hazard_utils.origins = [];

						if( results.docs.length > 0 )
						{
							vm.utils.hazard_utils.origins = results.docs[0].data;
						}

						console.log("HAZARD ORIGINS");
						console.log(vm.utils.hazard_utils.origins);

						defer.resolve();

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getHazardConsequences: function(){
					var defer = $q.defer();

					//FIND EXISTING STAGE RECORD
					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'hazard_consequences',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){
						vm.utils.hazard_utils.consequences = [];

						if( results.docs.length > 0 )
						{
							vm.utils.hazard_utils.consequences = results.docs[0].data;
						}

						console.log("HAZARD CONSEQUENCES");
						console.log(vm.utils.hazard_utils.consequences);

						defer.resolve();

					}).catch(function(error){
						defer.reject();
					});

					return defer.promise;
				},
				hasHazardSet: function(hazard_set_id) {
					var has_set = false;

					if( vm.utils.hazard_utils.hazard_sets ) {

						var i = 0;
						var len = vm.utils.hazard_utils.hazard_sets.length;
						while(i < len) {

							if( vm.utils.hazard_utils.hazard_sets[i].ID == hazard_set_id ) {
								has_set = true;
							}

							i++;
						}

					}

					return has_set;
				}
			},
			risk_utils: {
				lo_list: null,
				fe_list: null,
				np_list: null,
				dph_list: null,
				hrn_list: null,
				ria_list: null,
				getAllData: function(){
					var defer = $q.defer();

					var promises = {
						lo_list: vm.utils.risk_utils.getLoList(),
						fe_list: vm.utils.risk_utils.getFeList(),
						np_list: vm.utils.risk_utils.getNpList(),
						dph_list: vm.utils.risk_utils.getDphList(),
						hrn_list: vm.utils.risk_utils.getHrnList(),
						ria_list: vm.utils.risk_utils.getRiaList()
					};

					$q.all(promises).then(function(){

						vm.utils.pha_sliders.constructTicks();

						defer.resolve();
					}, function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getLoList: function(){
					var defer = $q.defer();

					//FIND EXISTING STAGE RECORD
					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'lo_list',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){
						vm.utils.risk_utils.lo_list = [];
						var lo_list = [];

						console.log("LO RAW");
						console.log(results.docs);

						if( results.docs.length > 0 )
						{
							angular.forEach(results.docs[0].data, function(record, index){
								record.Value = parseFloat(record.Value);

								if( record.Status != 'Deleted' )
								{
									lo_list.push(record);
								}

							});

							vm.utils.risk_utils.lo_list = $filter('orderBy')(lo_list, 'Value');
						}

						console.log("LO LIST");
						console.log(vm.utils.risk_utils.lo_list);

						defer.resolve();

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getFeList: function(){
					var defer = $q.defer();

					//FIND EXISTING STAGE RECORD
					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'fe_list',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){
						vm.utils.risk_utils.fe_list = [];

						if( results.docs.length > 0 )
						{
							angular.forEach(results.docs[0].data, function(record, index){
								record.Value = parseFloat(record.Value);
							});

							vm.utils.risk_utils.fe_list = $filter('orderBy')(results.docs[0].data, 'Value');
						}

						console.log("FE LIST");
						console.log(vm.utils.risk_utils.fe_list);
						defer.resolve();

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getNpList: function(){
					var defer = $q.defer();

					//FIND EXISTING STAGE RECORD
					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'np_list',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){
						vm.utils.risk_utils.np_list = [];

						if( results.docs.length > 0 )
						{
							angular.forEach(results.docs[0].data, function(record, index){
								record.Value = parseFloat(record.Value);
							});

							vm.utils.risk_utils.np_list = $filter('orderBy')(results.docs[0].data, 'Value');
						}

						console.log("NP LIST");
						console.log(vm.utils.risk_utils.np_list);
						defer.resolve();

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getDphList: function(){
					var defer = $q.defer();

					//FIND EXISTING STAGE RECORD
					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'dph_list',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){
						vm.utils.risk_utils.dph_list = [];

						if( results.docs.length > 0 )
						{
							angular.forEach(results.docs[0].data, function(record, index){
								record.Value = parseFloat(record.Value);
							});

							vm.utils.risk_utils.dph_list = $filter('orderBy')(results.docs[0].data, 'Value');
						}

						console.log("DPHLIST");
						console.log(vm.utils.risk_utils.dph_list);
						defer.resolve();

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getHrnList: function(){
					var defer = $q.defer();

					//FIND EXISTING STAGE RECORD
					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'hrn_list',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){
						vm.utils.risk_utils.hrn_list = [];

						if( results.docs.length > 0 )
						{
							angular.forEach(results.docs[0].data, function(record, index){
								record.Lower = parseFloat(record.Lower);
								record.Upper = parseFloat(record.Upper);
							});

							vm.utils.risk_utils.hrn_list = results.docs[0].data;
						}

						console.log("HRN LIST");
						console.log(vm.utils.risk_utils.hrn_list);
						defer.resolve();

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getRiaList: function(){
					var defer = $q.defer();

					//FIND EXISTING STAGE RECORD
					riskmachDatabasesFactory.databases.collection.utils.find({
						selector: {
							table: 'ria_list',
							user_id: authFactory.active_profile.UserID,
							company_id: authFactory.active_profile.CompanyID,
						}
					}).then(function(results){
						vm.utils.risk_utils.ria_list = [];
						vm.utils.ria.options = [];

						if( results.docs.length > 0 )
						{
							vm.utils.risk_utils.ria_list = results.docs[0].data;
							vm.utils.ria.options = results.docs[0].data;
						}

						vm.utils.ria.filter();

						console.log("RIA LIST");
						console.log(vm.utils.risk_utils.ria_list);
						defer.resolve();

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
			},
			matrix_initial: {
				directive_id: 'HazardMatrixInitial',
				coord: {
					x: null,
					y: null
				},
				score_data: null,
				populateValues: function(){
					var coord = {
						x: vm.utils.ra_record.matrix_likelihood_initial,
						y: vm.utils.ra_record.matrix_consequence_initial
					};

					vm.utils.matrix_initial.coord = coord;

					var data_set = {
						y: vm.utils.ra_record.matrix_consequence_initial,
						y_label: vm.utils.ra_record.matrix_consequence_phrase_initial,
						x: vm.utils.ra_record.matrix_likelihood_initial,
						x_label: vm.utils.ra_record.matrix_likelihood_phrase_initial,
						score: vm.utils.ra_record.matrix_score_initial,
						score_label: vm.utils.ra_record.matrix_score_phrase_initial
					};

					vm.utils.matrix_initial.score_data = data_set;
				},
				clearMatrixInitialValues: function() {

					vm.utils.ra_record.matrix_consequence_initial = null;
					vm.utils.ra_record.matrix_consequence_phrase_initial = null;
					vm.utils.ra_record.matrix_likelihood_initial = null;
					vm.utils.ra_record.matrix_likelihood_phrase_initial = null;
					vm.utils.ra_record.matrix_score_initial = null;
					vm.utils.ra_record.matrix_score_phrase_initial = null;

				},
				events: function(){

					$scope.$on("riskGrid::selected", function(event, data){

						if( data.directive_id != vm.utils.matrix_initial.directive_id )
						{
							return;
						}

						vm.utils.matrix_initial.score_data = data.data_set;
						vm.utils.ra_record.matrix_consequence_initial = data.data_set.y;
						vm.utils.ra_record.matrix_consequence_phrase_initial = data.data_set.y_label;
						vm.utils.ra_record.matrix_likelihood_initial = data.data_set.x;
						vm.utils.ra_record.matrix_likelihood_phrase_initial = data.data_set.x_label;
						vm.utils.ra_record.matrix_score_initial = data.data_set.score;
						vm.utils.ra_record.matrix_score_phrase_initial = data.data_set.score_label;

						vm.utils.matrix_initial.populateValues();

						console.log("MATRIX INITIAL SET");
						console.log(vm.utils.ra_record);

						vm.utils.notSaved();

						// //SAVE HAZARD
						// procedureBuilderFactory.dbUtils.saveMrHazard(vm.utils.rate_hazard.record).then(function(saved_doc){
						// 	vm.utils.rate_hazard.tabs.changeTab('after');
						// }, function(error){
						// 	alert(error);
						// });

						// setTimeout(function(){
						// 	vm.utils.active_tab.changeTab('rate_hazard_after');
						// 	$scope.$apply();
						// }, 1500);

					});

				}()
			},
			matrix_after: {
				directive_id: 'HazardMatrixAfter',
				coord: {
					x: null,
					y: null
				},
				score_data: null,
				populateValues: function(){
					var coord = {
						x: vm.utils.ra_record.matrix_likelihood_after,
						y: vm.utils.ra_record.matrix_consequence_after
					};

					vm.utils.matrix_after.coord = coord;

					var data_set = {
						y: vm.utils.ra_record.matrix_consequence_after,
						y_label: vm.utils.ra_record.matrix_consequence_phrase_after,
						x: vm.utils.ra_record.matrix_likelihood_after,
						x_label: vm.utils.ra_record.matrix_likelihood_phrase_after,
						score: vm.utils.ra_record.matrix_score_after,
						score_label: vm.utils.ra_record.matrix_score_phrase_after
					};

					vm.utils.matrix_after.score_data = data_set;
				},
				clearMatrixAfterValues: function() {

					vm.utils.ra_record.matrix_consequence_after = null;
					vm.utils.ra_record.matrix_consequence_phrase_after = null;
					vm.utils.ra_record.matrix_likelihood_after = null;
					vm.utils.ra_record.matrix_likelihood_phrase_after = null;
					vm.utils.ra_record.matrix_score_after = null;
					vm.utils.ra_record.matrix_score_phrase_after = null;

				},
				events: function(){

					$scope.$on("riskGrid::selected", function(event, data){

						if( data.directive_id != vm.utils.matrix_after.directive_id )
						{
							return;
						}

						vm.utils.matrix_after.score_data = data.data_set;
						vm.utils.ra_record.matrix_consequence_after = data.data_set.y;
						vm.utils.ra_record.matrix_consequence_phrase_after = data.data_set.y_label;
						vm.utils.ra_record.matrix_likelihood_after = data.data_set.x;
						vm.utils.ra_record.matrix_likelihood_phrase_after = data.data_set.x_label;
						vm.utils.ra_record.matrix_score_after = data.data_set.score;
						vm.utils.ra_record.matrix_score_phrase_after = data.data_set.score_label;

						vm.utils.matrix_initial.populateValues();

						console.log("MATRIX AFTER SET");
						console.log(vm.utils.ra_record);

						vm.utils.notSaved();

						// //SAVE HAZARD
						// procedureBuilderFactory.dbUtils.saveMrHazard(vm.utils.rate_hazard.record).then(function(saved_doc){
						// 	vm.utils.rate_hazard.aside.hide();
						// }, function(error){
						// 	alert(error);
						// });
						
					});

				}()
			},
			racking_score: {
				directive_id: 'rackingScoreForm',
				score_data: {
					score: null,
					phrase: null
				},
				populateValues: function(){
					vm.utils.racking_score.score_data.score = vm.utils.ra_record.matrix_score_initial;
					vm.utils.racking_score.score_data.phrase = vm.utils.ra_record.matrix_score_phrase_initial;
				},
				clearRackingValues: function() {

					vm.utils.ra_record.matrix_consequence_after = null;
					vm.utils.ra_record.matrix_consequence_initial = null;
					vm.utils.ra_record.matrix_consequence_phrase_after = null;
					vm.utils.ra_record.matrix_consequence_phrase_initial = null;
					vm.utils.ra_record.matrix_likelihood_after = null;
					vm.utils.ra_record.matrix_likelihood_initial = null;
					vm.utils.ra_record.matrix_likelihood_phrase_after = null;
					vm.utils.ra_record.matrix_likelihood_phrase_initial = null;
					vm.utils.ra_record.matrix_score_after = null;
					vm.utils.ra_record.matrix_score_initial = null;
					vm.utils.ra_record.matrix_score_phrase_after = null;
					vm.utils.ra_record.matrix_score_phrase_initial = null;

				},
				events: function(){

					$scope.$on("rackingMethodScoreUpdated", function(event, data){

						if( data.directive_id != vm.utils.racking_score.directive_id )
						{
							return;
						}

						vm.utils.ra_record.matrix_score_initial = data.score_data.score;
						vm.utils.ra_record.matrix_score_phrase_initial = data.score_data.phrase;

						console.log("UPDATED RACKING SCORE");
						console.log(vm.utils.ra_record);

						vm.utils.notSaved();

					});

				}()
			},
			deterioration_score: {
				directive_id: 'deteriorationScoreForm',
				score_data: {
					score: null,
					phrase: null
				},
				populateValues: function(){
					vm.utils.deterioration_score.score_data.score = vm.utils.ra_record.matrix_score_initial;
					vm.utils.deterioration_score.score_data.phrase = vm.utils.ra_record.matrix_score_phrase_initial;
				},
				clearDeteriorationValues: function() {

					vm.utils.ra_record.matrix_consequence_after = null;
					vm.utils.ra_record.matrix_consequence_initial = null;
					vm.utils.ra_record.matrix_consequence_phrase_after = null;
					vm.utils.ra_record.matrix_consequence_phrase_initial = null;
					vm.utils.ra_record.matrix_likelihood_after = null;
					vm.utils.ra_record.matrix_likelihood_initial = null;
					vm.utils.ra_record.matrix_likelihood_phrase_after = null;
					vm.utils.ra_record.matrix_likelihood_phrase_initial = null;
					vm.utils.ra_record.matrix_score_after = null;
					vm.utils.ra_record.matrix_score_initial = null;
					vm.utils.ra_record.matrix_score_phrase_after = null;
					vm.utils.ra_record.matrix_score_phrase_initial = null;

				},
				events: function(){

					$scope.$on("deteriorationMethodScoreUpdated", function(event, data){

						if( data.directive_id != vm.utils.deterioration_score.directive_id )
						{
							return;
						}

						vm.utils.ra_record.matrix_score_initial = data.score_data.score;
						vm.utils.ra_record.matrix_score_phrase_initial = data.score_data.phrase;

						console.log("DETERIORATION SCORE UPDATED");
						console.log(vm.utils.ra_record);

						vm.utils.notSaved();

					});

				}()
			},
			ria: {
				options: [],
				severity_initial: [],
				exposure_initial: [],
				avoidance_initial: [],
				severity_after: [],
				exposure_after: [],
				avoidance_after: [],
				filter: function(){
					vm.utils.ria.filterInitial();
					vm.utils.ria.filterAfter();
				},
				filterInitial: function(){
					var severity = [];
					var exposure = [];
					var avoidance = [];

					if( !vm.utils.ra_record )
					{
						vm.utils.ria.severity_initial = severity;
						vm.utils.ria.exposure_initial = exposure;
						vm.utils.ria.avoidance_initial = avoidance;
						return;
					}

					angular.forEach(vm.utils.ria.options, function(record, index){

						if( record.Stage == 'severity' )
						{
							severity.push(record);
						}

						if( record.Stage == 'exposure' )
						{
							exposure.push(record);
						}

						if( record.Stage == 'avoidance' )
						{
							var positive_avoidance = 0;

							if( vm.utils.ra_record.ria_severity_initial_score != null && vm.utils.ra_record.ria_exposure_initial_score != null )
							{
								if( parseFloat(vm.utils.ra_record.ria_severity_initial_score) == 1 && parseInt(vm.utils.ra_record.ria_exposure_initial_score) == 1 )
								{
									positive_avoidance++;
								}

								if( parseFloat(vm.utils.ra_record.ria_severity_initial_score) == 2 && parseInt(vm.utils.ra_record.ria_exposure_initial_score) == 2 )
								{
									positive_avoidance++;
								}

								if( parseFloat(vm.utils.ra_record.ria_severity_initial_score) == 3 && parseInt(vm.utils.ra_record.ria_exposure_initial_score) == 2 )
								{
									positive_avoidance++;
								}
							}

							if( positive_avoidance > 0 )
							{
								avoidance.push(record);
							}
						}

					});

					vm.utils.ria.severity_initial = severity;
					vm.utils.ria.exposure_initial = exposure;
					vm.utils.ria.avoidance_initial = avoidance;
				},
				filterAfter: function(){
					var severity = [];
					var exposure = [];
					var avoidance = [];

					if( !vm.utils.ra_record )
					{
						vm.utils.ria.severity_after = severity;
						vm.utils.ria.exposure_after = exposure;
						vm.utils.ria.avoidance_after = avoidance;
						return;
					}

					angular.forEach(vm.utils.ria.options, function(record, index){

						if( record.Stage == 'severity' )
						{
							severity.push(record);
						}

						if( record.Stage == 'exposure' )
						{
							exposure.push(record);
						}

						if( record.Stage == 'avoidance' )
						{
							var positive_avoidance = 0;

							if( vm.utils.ra_record.ria_severity_after_score != null && vm.utils.ra_record.ria_exposure_after_score != null )
							{
								if( parseFloat(vm.utils.ra_record.ria_severity_after_score) == 1 && parseInt(vm.utils.ra_record.ria_exposure_after_score) == 1 )
								{
									positive_avoidance++;
								}

								if( parseFloat(vm.utils.ra_record.ria_severity_after_score) == 2 && parseInt(vm.utils.ra_record.ria_exposure_after_score) == 2 )
								{
									positive_avoidance++;
								}

								if( parseFloat(vm.utils.ra_record.ria_severity_after_score) == 3 && parseInt(vm.utils.ra_record.ria_exposure_after_score) == 2 )
								{
									positive_avoidance++;
								}
							}

							if( positive_avoidance > 0 )
							{
								avoidance.push(record);
							}
						}

					});

					vm.utils.ria.severity_after = severity;
					vm.utils.ria.exposure_after = exposure;
					vm.utils.ria.avoidance_after = avoidance;
				},
				avoidanceRequired: function(stage){
					var required = false;
					positive_avoidance = 0;

					if( stage == 'initial' )
					{
						if( vm.utils.ra_record.ria_severity_initial_score != null && vm.utils.ra_record.ria_exposure_initial_score != null )
						{
							if( parseFloat(vm.utils.ra_record.ria_severity_initial_score) == 1 && parseInt(vm.utils.ra_record.ria_exposure_initial_score) == 1 )
							{
								positive_avoidance++;
							}

							if( parseFloat(vm.utils.ra_record.ria_severity_initial_score) == 2 && parseInt(vm.utils.ra_record.ria_exposure_initial_score) == 2 )
							{
								positive_avoidance++;
							}

							if( parseFloat(vm.utils.ra_record.ria_severity_initial_score) == 3 && parseInt(vm.utils.ra_record.ria_exposure_initial_score) == 2 )
							{
								positive_avoidance++;
							}
						}
					}

					if( stage == 'after' )
					{
						if( vm.utils.ra_record.ria_severity_after_score != null && vm.utils.ra_record.ria_exposure_after_score != null )
						{
							if( parseFloat(vm.utils.ra_record.ria_severity_after_score) == 1 && parseInt(vm.utils.ra_record.ria_exposure_after_score) == 1 )
							{
								positive_avoidance++;
							}

							if( parseFloat(vm.utils.ra_record.ria_severity_after_score) == 2 && parseInt(vm.utils.ra_record.ria_exposure_after_score) == 2 )
							{
								positive_avoidance++;
							}

							if( parseFloat(vm.utils.ra_record.ria_severity_after_score) == 3 && parseInt(vm.utils.ra_record.ria_exposure_after_score) == 2 )
							{
								positive_avoidance++;
							}
						}
					}	

					if( positive_avoidance > 0 )
					{
						required = true;
					}

					return required;
				},
				allStageComplete: function(){
					var complete = false;
					var initial = vm.utils.ria.riskComplete('initial');
					var after = vm.utils.ria.riskComplete('after');

					if( initial == true && after == true )
					{
						complete = true;
					}

					return complete;
				},
				riskComplete: function(stage){
					var complete = false;
					var part1_complete = false;
					var part2_complete = false;
					var stage_2_required = vm.utils.ria.avoidanceRequired( stage );

					if( stage == 'initial' )
					{
						if( vm.utils.ra_record.ria_severity_initial_score != null && vm.utils.ra_record.ria_exposure_initial_score != null )
						{
							part1_complete = true;
						}
					}

					if( stage == 'after' )
					{
						if( vm.utils.ra_record.ria_severity_after_score != null && vm.utils.ra_record.ria_exposure_after_score != null )
						{
							part1_complete = true;
						}
					}

					if( stage_2_required == true )
					{
						if( stage == 'initial' )
						{
							if( vm.utils.ra_record.ria_avoidance_initial_score != null )
							{
								part2_complete = true;
							}
						}

						if( stage == 'after' )
						{
							if( vm.utils.ra_record.ria_avoidance_after_score != null )
							{
								part2_complete = true;
							}
						}
					}

					if( stage_2_required == true )
					{
						if( part1_complete == true && part2_complete == true )
						{
							complete = true;
						}
					}
					else
					{
						if( part1_complete == true )
						{
							complete = true;
						}
					}

					return complete;
				},
				calcScore: function(stage){

					var risk_complete = vm.utils.ria.riskComplete(stage);
					var avoidance_required = vm.utils.ria.avoidanceRequired(stage);

					if( stage == 'initial' )
					{
						if( !risk_complete )
						{
							vm.utils.ra_record.ria_risk_score_initial = null;
							vm.utils.ra_record.ria_risk_level_initial = null;
						}
						else
						{
							var score = parseFloat(vm.utils.ra_record.ria_severity_initial_score) * parseFloat(vm.utils.ra_record.ria_exposure_initial_score);
							
							if( avoidance_required == true )
							{
								score = score * parseFloat(vm.utils.ra_record.ria_avoidance_initial_score);
							}

							vm.utils.ra_record.ria_risk_score_initial = score;
							vm.utils.ria.calcScorePhrase('initial');
							// vm.utils.assessment.data.base.RIARiskLevelInitial = 'Calculate This';
						}
					}

					if( stage == 'after' )
					{
						if( !risk_complete )
						{
							vm.utils.ra_record.ria_risk_score_after = null;
							vm.utils.ra_record.ria_risk_level_after = null;
						}
						else
						{
							var score = parseFloat(vm.utils.ra_record.ria_severity_after_score) * parseFloat(vm.utils.ra_record.ria_exposure_after_score);
							
							if( avoidance_required == true )
							{
								score = score * parseFloat(vm.utils.ra_record.ria_avoidance_after_score);
							}

							vm.utils.ra_record.ria_risk_score_after = score;
							vm.utils.ria.calcScorePhrase('after');
							// vm.utils.assessment.data.base.RIARiskLevelAfter = 'Calculate This';
						}
					}
				},
				calcScorePhrase: function(stage){
					var risk_complete = vm.utils.ria.riskComplete(stage);
					var avoidance_required = vm.utils.ria.avoidanceRequired(stage);

					if( stage == 'initial' )
					{
						stage_label = 'initial';
					}

					if( stage == 'after' )
					{
						stage_label = 'after';
					}

					if( !risk_complete )
					{
						vm.utils.ra_record['ria_risk_level_' + stage_label] = 'Calculate This';
					}

					//S1
					if( parseInt(vm.utils.ra_record['ria_severity_'+ stage_label +'_score']) == 1 && parseInt(vm.utils.ra_record['ria_exposure_'+ stage_label +'_score']) == 0 && !avoidance_required )
					{
						vm.utils.ra_record['ria_risk_level_' + stage_label] = 'Negligible';
						return;
					}

					if( parseInt(vm.utils.ra_record['ria_severity_'+ stage_label +'_score']) == 1 && parseInt(vm.utils.ra_record['ria_exposure_'+ stage_label +'_score']) == 1 && parseInt(vm.utils.ra_record['ria_avoidance_'+ stage_label +'_score']) == 1 )
					{
						vm.utils.ra_record['ria_risk_level_' + stage_label] = 'Negligible';
						return;
					}

					if( parseInt(vm.utils.ra_record['ria_severity_'+ stage_label +'_score']) == 1 && parseInt(vm.utils.ra_record['ria_exposure_'+ stage_label +'_score']) == 1 && parseInt(vm.utils.ra_record['ria_avoidance_'+ stage_label +'_score']) == 2 )
					{
						vm.utils.ra_record['ria_risk_level_' + stage_label] = 'Low';
						return;
					}

					if( parseInt(vm.utils.ra_record['ria_severity_'+ stage_label +'_score']) == 1 && parseInt(vm.utils.ra_record['ria_exposure_'+ stage_label +'_score']) == 1 && parseInt(vm.utils.ra_record['ria_avoidance_'+ stage_label +'_score']) == 3 )
					{
						vm.utils.ra_record['ria_risk_level_' + stage_label] = 'Low';
						return;
					}

					if( parseInt(vm.utils.ra_record['ria_severity_'+ stage_label +'_score']) == 1 && parseInt(vm.utils.ra_record['ria_exposure_'+ stage_label +'_score']) == 2 && !avoidance_required )
					{
						vm.utils.ra_record['ria_risk_level_' + stage_label] = 'Low';
						return;
					}

					//S2
					if( parseInt(vm.utils.ra_record['ria_severity'+ stage_label +'_score']) == 2 && parseInt(vm.utils.ra_record['ria_exposure_'+ stage_label +'_score']) == 0 && !avoidance_required )
					{
						vm.utils.ra_record['ria_risk_level_' + stage_label] = 'Low';
						return;
					}

					if( parseInt(vm.utils.ra_record['ria_severity_'+ stage_label +'_score']) == 2 && parseInt(vm.utils.ra_record['ria_exposure_'+ stage_label +'_score']) == 1 && !avoidance_required )
					{
						vm.utils.ra_record['ria_risk_level_' + stage_label] = 'Medium';
						return;
					}

					if( parseInt(vm.utils.ra_record['ria_severity_'+ stage_label +'_score']) == 2 && parseInt(vm.utils.ra_record['ria_exposure_'+ stage_label +'_score']) == 2 && parseInt(vm.utils.ra_record['ria_avoidance_'+ stage_label +'_score']) == 1 )
					{
						vm.utils.ra_record['ria_risk_level_' + stage_label] = 'Medium';
						return;
					}

					if( parseInt(vm.utils.ra_record['ria_severity_'+ stage_label +'_score']) == 2 && parseInt(vm.utils.ra_record['ria_exposure_'+ stage_label +'_score']) == 2 && parseInt(vm.utils.ra_record['ria_avoidance_'+ stage_label +'_score']) == 2 )
					{
						vm.utils.ra_record['ria_risk_level_' + stage_label] = 'High';
						return;
					}

					if( parseInt(vm.utils.ra_record['ria_severity_'+ stage_label +'_score']) == 2 && parseInt(vm.utils.ra_record['ria_exposure_'+ stage_label +'_score']) == 2 && parseInt(vm.utils.ra_record['ria_avoidance_'+ stage_label +'_score']) == 3 )
					{
						vm.utils.ra_record['ria_risk_level_' + stage_label] = 'High';
						return;
					}

					//S3
					if( parseInt(vm.utils.ra_record['ria_severity_'+ stage_label +'_score']) == 3 && parseInt(vm.utils.ra_record['ria_exposure_'+ stage_label +'_score']) == 0 && !avoidance_required )
					{
						vm.utils.ra_record['ria_risk_level_' + stage_label] = 'Low';
						return;
					}

					if( parseInt(vm.utils.ra_record['ria_severity_'+ stage_label +'_score']) == 3 && parseInt(vm.utils.ra_record['ria_exposure_'+ stage_label +'_score']) == 1 && !avoidance_required )
					{
						vm.utils.ra_record['ria_risk_level_' + stage_label] = 'High';
						return;
					}

					if( parseInt(vm.utils.ra_record['ria_severity_'+ stage_label +'_score']) == 3 && parseInt(vm.utils.ra_record['ria_exposure_'+ stage_label +'_score']) == 2 && parseInt(vm.utils.ra_record['ria_avoidance_'+ stage_label +'_score']) == 1 )
					{
						vm.utils.ra_record['ria_risk_level_' + stage_label] = 'High';
						return;
					}

					if( parseInt(vm.utils.ra_record['ria_severity_'+ stage_label +'_score']) == 3 && parseInt(vm.utils.ra_record['ria_exposure_'+ stage_label +'_score']) == 2 && parseInt(vm.utils.ra_record['ria_avoidance_'+ stage_label +'_score']) == 2 )
					{
						vm.utils.ra_record['ria_risk_level_' + stage_label] = 'Very High';
						return;
					}

					if( parseInt(vm.utils.ra_record['ria_severity_'+ stage_label +'_score']) == 3 && parseInt(vm.utils.ra_record['ria_exposure_'+ stage_label +'_score']) == 2 && parseInt(vm.utils.ra_record['ria_avoidance_'+ stage_label +'_score']) == 3 )
					{
						vm.utils.ra_record['ria_risk_level_' + stage_label] = 'Very High';
						return;
					}

					vm.utils.ra_record['ria_risk_level_' + stage_label] = null;
				},
				severityChanged: function(stage){

					if( stage == 'initial' )
					{
						var s_label = null;

						angular.forEach(vm.utils.ria.severity_initial, function(s_record, s_index){

							if( parseInt(s_record.Value) == parseInt(vm.utils.ra_record.ria_severity_initial_score) )
							{
								s_label = s_record.Label;
							}

						});

						vm.utils.ra_record.ria_severity_initial = s_label;
						console.log("S Label: " + s_label);

						// vm.utils.assessment.data.base.RIAExposureInitial = null;
						// vm.utils.assessment.data.base.RIAExposureInitialScore = null;
						vm.utils.ra_record.ria_avoidance_initial = null;
						vm.utils.ra_record.ria_avoidance_initial_score = null;
						vm.utils.ria.calcScore('initial');
					}

					if( stage == 'after' )
					{
						var s_label = null;

						angular.forEach(vm.utils.ria.severity_after, function(s_record, s_index){

							if( parseInt(s_record.Value) == parseInt(vm.utils.ra_record.ria_severity_after_score) )
							{
								s_label = s_record.Label;
							}

						});

						vm.utils.ra_record.ria_severity_after = s_label;
						console.log("S Label: " + s_label);

						// vm.utils.assessment.data.base.RIAExposureAfter = null;
						// vm.utils.assessment.data.base.RIAExposureAfterScore = null;
						vm.utils.ra_record.ria_avoidance_after = null;
						vm.utils.ra_record.ria_avoidance_after_score = null;
						vm.utils.ria.calcScore('after');
					}

					vm.utils.ria.filter();
				},
				exposureChanged: function(stage)
				{
					if( stage == 'initial' )
					{
						var e_label = null;

						angular.forEach(vm.utils.ria.exposure_initial, function(e_record, e_index){

							if( parseInt(e_record.Value) == parseInt(vm.utils.ra_record.ria_exposure_initial_score) )
							{
								e_label = e_record.Label;
							}

						});

						vm.utils.ra_record.ria_exposure_initial = e_label;
						console.log("E Label: " + e_label);

						vm.utils.ra_record.ria_avoidance_initial = null;
						vm.utils.ra_record.ria_avoidance_initial_score = null;
						vm.utils.ria.calcScore('initial');
					}

					if( stage == 'after' )
					{
						var e_label = null;

						angular.forEach(vm.utils.ria.exposure_after, function(e_record, e_index){

							if( parseInt(e_record.Value) == parseInt(vm.utils.ra_record.ria_exposure_after_score) )
							{
								e_label = e_record.Label;
							}

						});

						vm.utils.ra_record.ria_exposure_after = e_label;
						console.log("E Label: " + e_label);

						vm.utils.ra_record.ria_avoidance_after = null;
						vm.utils.ra_record.ria_avoidance_after_score = null;
						vm.utils.ria.calcScore('after');
					}

					vm.utils.ria.filter();
				},
				avoidanceChanged: function(stage){

					if( stage == 'initial' )
					{
						var a_label = null;

						angular.forEach(vm.utils.ria.avoidance_initial, function(a_record, a_index){

							if( parseInt(a_record.Value) == parseInt(vm.utils.ra_record.ria_avoidance_initial_score) )
							{
								a_label = a_record.Label;
							}

						});

						vm.utils.ra_record.ria_avoidance_initial = a_label;
						console.log("A Label: " + a_label);
					}

					if( stage == 'after' )
					{
						var a_label = null;

						angular.forEach(vm.utils.ria.avoidance_after, function(a_record, a_index){

							if( parseInt(a_record.Value) == parseInt(vm.utils.ra_record.ria_avoidance_after_score) )
							{
								a_label = a_record.Label;
							}

						});

						vm.utils.ra_record.ria_avoidance_after = a_label;
						console.log("A Label: " + a_label);
					}

					vm.utils.ria.calcScore(stage);
				},
				clearRiaValues: function() {

					vm.utils.ra_record.ria_avoidance_after = null;
					vm.utils.ra_record.ria_avoidance_after_score = null;
					vm.utils.ra_record.ria_avoidance_initial = null;
					vm.utils.ra_record.ria_avoidance_initial_score = null;
					vm.utils.ra_record.ria_exposure_after = null;
					vm.utils.ra_record.ria_exposure_after_score = null;
					vm.utils.ra_record.ria_exposure_initial = null;
					vm.utils.ra_record.ria_exposure_initial_score = null;
					vm.utils.ra_record.ria_risk_level_after = null;
					vm.utils.ra_record.ria_risk_level_initial = null;
					vm.utils.ra_record.ria_risk_score_after = null;
					vm.utils.ra_record.ria_risk_score_initial = null;
					vm.utils.ra_record.ria_severity_after = null;
					vm.utils.ra_record.ria_severity_after_score = null;
					vm.utils.ra_record.ria_severity_initial = null;
					vm.utils.ra_record.ria_severity_initial_score = null;

				}
			},
			updateSimpleRiskValues: function(){

				if( vm.utils.ra_record.simple_risk_phrase_id_initial == null )
				{
					vm.utils.ra_record.simple_risk_phrase_initial = null;
					vm.utils.ra_record.simple_risk_rating_initial = null;
				}

				if( vm.utils.ra_record.simple_risk_phrase_id_after == null )
				{
					vm.utils.ra_record.simple_risk_phrase_after = null;
					vm.utils.ra_record.simple_risk_rating_after = null;
				}

				angular.forEach(vm.utils.risk_utils.hrn_list, function(record, index){

					if( vm.utils.ra_record.simple_risk_phrase_id_initial != null && record.PhraseID == vm.utils.ra_record.simple_risk_phrase_id_initial )
					{
						vm.utils.ra_record.simple_risk_phrase_initial = record.Phrase;
						vm.utils.ra_record.simple_risk_rating_initial = record.Rating;
					}

					if( vm.utils.ra_record.simple_risk_phrase_id_after != null && record.PhraseID == vm.utils.ra_record.simple_risk_phrase_id_after )
					{
						vm.utils.ra_record.simple_risk_phrase_after = record.Phrase;
						vm.utils.ra_record.simple_risk_rating_after = record.Rating;
					}

				});

				console.log("UPDATED ASSESSMENT VALUES");
				console.log( vm.utils.ra_record );
			},
			clearSimpleRiskValues: function() {

				vm.utils.ra_record.simple_risk_phrase_after = null;
				vm.utils.ra_record.simple_risk_phrase_id_after = null;
				vm.utils.ra_record.simple_risk_phrase_id_after_name = null;
				vm.utils.ra_record.simple_risk_phrase_id_initial = null;
				vm.utils.ra_record.simple_risk_phrase_id_initial_name = null;
				vm.utils.ra_record.simple_risk_phrase_initial = null;
				vm.utils.ra_record.simple_risk_rating_after = null;
				vm.utils.ra_record.simple_risk_rating_initial = null;

			},
			risk_media: {
				record: null,
				media_records: [],
				visible_media: [],
				downloading_file: false,
				is_loading: false,
				filters: {
					status: 1
				},
				re_order_media_mode: false,
				delete_multiple_mode: false,
				setRecord: function(record){
					vm.utils.risk_media.record = record;
				},
				takePhotoDesktop: function(){
					
					if( !vm.utils.ra_record.hasOwnProperty('_id') || !vm.utils.ra_record._id ) 
					{
						alert("Assessment not saved");
						return;
					}

					var params = {
						directive_id: vm.utils.directive_id,
						record_type: 'assessment',
						subject_record: vm.utils.ra_record
					};

					console.log("PARAMS");
					console.log(params);

					$rootScope.$broadcast("takePhoto::start", params);
				},
				photoTakenEvent: function(){

					$scope.$on("riskForm::savePhotoCapture", function(event, data){

						if( data.src_directive_id != vm.utils.directive_id )
						{
							return;
						}

						if( data.record_type != 'assessment' )
						{
							return;
						}

						if( data.subject_record._id != vm.utils.ra_record._id )
						{
							return;
						}

						if( !data.file )
						{
							alert("Theres no file to save");
							return;
						}

						vm.utils.risk_media.savePhotoCapture(data.file);

					});

				}(),
				savePhotoCapture: function(file){

					vm.utils.risk_media.is_loading = true;

					vm.utils.risk_media.saveRiskFile(file, vm.utils.ra_record).then(function(){

						vm.utils.risk_media.updateFileCount(vm.utils.ra_record._id, 'assessment').then(function(risk_record){
							// vm.utils.risk_media.is_loading = false;
							// vm.utils.risk_media.getAllRecordAttachments(vm.utils.ra_record._id, 'assessment');

							vm.utils.risk_media.is_loading = false;
						});

					}, function(error){
						vm.utils.risk_media.is_loading = false;
						alert(error);
					});

				},
				init: function(){

					setTimeout(function(){

						var inputFile = document.querySelector('#riskInputFile');
						var photoInput = document.querySelector('#riskPhotoInput');
						// var imageMetaData = document.querySelector('#hazard_img_meta_data');
						var uploadedFile = {};

						function fileUpload(){

							console.log("RAN FILE UPLOAD");
							console.log(vm.utils.risk_media.record);

							vm.utils.saving_media = true;
							vm.utils.saving_media_message = "Saving selected files, please wait...";

							if( vm.utils.risk_media.record._id == null ) {
								
								// SAVE THE RISK
								vm.utils.save().then(function() {
									vm.utils.risk_media.record = vm.utils.ra_record;

									// ATTEMPT SAVE FILE AGAIN
									fileUpload();

								}, function(error) {
									vm.utils.saving_media = false;
									vm.utils.saving_media_message = null;
									alert(error);
								});

								return;
							};
							
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

									vm.utils.risk_media.updateFileCount(vm.utils.risk_media.record._id, 'assessment').then(function(risk_record){
										// vm.utils.risk_media.getAllRecordAttachments(vm.utils.risk_media.record._id, 'assessment');
									});

									vm.utils.saving_media = false;
									vm.utils.saving_media_message = null;

									defer.resolve();
									return defer.promise;
								}

								//SAVE THE FILE
								vm.utils.risk_media.saveRiskFile(files[index], vm.utils.risk_media.record).then(function(){
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
				close: function() {
					vm.utils.risk_media.record = null;
					vm.utils.risk_media.media_records = [];
				},
				saveRiskFile: function(file, ra_record) {
					var defer = $q.defer();

					//CREATE SAVE MEDIA RECORD
					// var media_record = mediaFactory.models.newMedia(ra_record._id, 'assessment');
					var media_record = modelsFactory.models.newMediaRecord(ra_record._id, 'assessment');

					if( ra_record.hasOwnProperty('is_pool_item') && ra_record.is_pool_item == 'Yes' ) {
						media_record.is_pool_item = 'Yes';
					}

					media_record.attachment_key = file.name;
					media_record.file_name = file.name;

					if( mediaFactory.utils.checkRecordItemMediaExists(ra_record, file.name) ) {
						//SKIP THIS FILE ALREADY HAVE IT
						$scope.$apply();
						defer.resolve();

					} else {

						// SAVE FILE
						mediaFactory.dbUtils.saveMediaRecord(media_record, file).then(function(saved_media) {

							media_record = saved_media;

							vm.utils.risk_media.getMediaRecordAttachment(media_record).then(function() {
								
								vm.utils.risk_media.updateListMediaData(media_record);

								// ATTEMPT CALC PROFILE IMG
								vm.utils.risk_media.calcProfileImg();

								// SET PROFILE IMAGE IN INTERFACE
								vm.utils.risk_media.setProfileImage(vm.utils.risk_media.record.profile_img_id);

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
				updateFileCountV1: function(record_id, record_type) {
					var defer = $q.defer();

					mediaFactory.dbUtils.updateRecordFileCount(record_id, record_type).then(function(doc){
						vm.utils.ra_record._id = doc._id;
						vm.utils.ra_record._rev = doc._rev;
						vm.utils.ra_record.num_files = doc.num_files;
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateFileCount: function(record_id, record_type) {
					var defer = $q.defer();

					var num_attachments = vm.utils.risk_media.calcNumFiles();

					mediaFactory.dbUtils.doUpdateRecordFileCount(record_id, record_type, num_attachments).then(function(doc) {
						
						vm.utils.ra_record._id = doc._id;
						vm.utils.ra_record._rev = doc._rev;
						vm.utils.ra_record.num_files = doc.num_files;
						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				calcNumFiles: function() {
					var num_attachments = 0;

					var i = 0;
					var len = vm.utils.risk_media.media_records.length;

					while(i < len) {
						if( parseInt(vm.utils.risk_media.media_records[i].status) == 1 && !vm.utils.risk_media.media_records[i].is_video && !vm.utils.risk_media.media_records[i].is_audio ) {
							num_attachments++;
						}

						i++;
					}

					return num_attachments;
				},
				getAllRecordAttachments: function(record_id, record_type) {
					var defer = $q.defer();

					vm.utils.risk_media.is_loading = true;

					mediaFactory.dbUtils.getAllStoredRecordAttachments(record_id, record_type, 'risks').then(function(media_records) {

						vm.utils.risk_media.media_records = media_records;

						vm.utils.risk_media.autoFilterMedia();

						vm.utils.risk_media.setProfileImage(vm.utils.risk_media.record.profile_img_id);

						vm.utils.risk_media.is_loading = false;

						defer.resolve();
						$scope.$apply();

					}, function(error) {
						vm.utils.risk_media.is_loading = false;
						defer.reject(error);
					});

					return defer.promise;
				},
				getMediaRecordAttachment: function(media_record) {
					var defer = $q.defer();

					mediaFactory.dbUtils.getStoredAttachmentUrl('risks', media_record._id, media_record.attachment_key).then(function(url) {

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
					vm.utils.risk_media.updateListMediaRecord(media_record);

					vm.utils.risk_media.autoFilterMedia();

					vm.utils.risk_media.setProfileImage(vm.utils.risk_media.record.profile_img_id);
				},
				updateListMediaRecord: function(media_record) {
					var i = 0;
					var len = vm.utils.risk_media.media_records.length;

					var record_index = null;
					
					while(i < len) {

						if( vm.utils.risk_media.media_records[i]._id == media_record._id ) {
							record_index = i;
						}

						i++;
					}

					if( record_index != null ) {
						vm.utils.risk_media.media_records[record_index] = media_record;
 					} else {
 						vm.utils.risk_media.media_records.push(media_record);
 					}
				},
				setProfileImage: function(profile_image_id) {

					var i = 0;
					var len = vm.utils.risk_media.media_records.length;

					while(i < len) {

						if( vm.utils.risk_media.media_records[i]._id == profile_image_id ) {
							vm.utils.risk_media.media_records[i].profile_image = true;
						} else {
							vm.utils.risk_media.media_records[i].profile_image = false;
						}

						i++;
					}

				},
				setNewProfileImage: function(media_record) {
					vm.utils.risk_media.record.profile_img_id = media_record._id;
					vm.utils.risk_media.record.profile_img_attachment_key = media_record.attachment_key;

					// ONLY DOWNLOADED IMAGES CAN BE MANUALLY SET AS PROFILE IMG
					vm.utils.risk_media.record.profile_img_download_required = false;

					vm.utils.risk_media.setProfileImage(vm.utils.risk_media.record.profile_img_id);
				},
				mediaStyle: function(media_record) {
					var style = {
						'border': '1px solid #ddd'
					};

					if( media_record.status != 1 )
					{
						style['border'] = '1px solid #a94442';
					}

					return style;
				},
				deleteMediaRecord: function(media_record) {
					var defer = $q.defer();

					// MARK MEDIA DELETED
					media_record.status = 3;

					if( media_record.hasOwnProperty('delete_multiple_selected') ) {
						delete media_record.delete_multiple_selected;
					} 

					// SAVE RECORD
					mediaFactory.dbUtils.doSaveMediaRecord(media_record).then(function(save_result) {

						var i = 0;
						var len = vm.utils.risk_media.media_records.length;

						while(i < len) {
							if( vm.utils.risk_media.media_records[i]._id == media_record._id ) {
								vm.utils.risk_media.media_records[i]._id = save_result.id;
								vm.utils.risk_media.media_records[i]._rev = save_result.rev;
								vm.utils.risk_media.media_records[i].status = 3;
							}

							i++;
						}

						vm.utils.risk_media.updateFileCount(vm.utils.risk_media.record._id, 'assessment').then(function() {

							vm.utils.risk_media.autoFilterMedia();

							// CLEAR CACHED URL SO PROFILE IMG IS RECALCULATED AFTER SAVE
							mediaFactory.profile_imgs.removeStoredUrl('risks', vm.utils.ra_record._id);
							
							// CLEAR PROFILE IMG ID SO PROFILE IMG IS RECALCULATED
							vm.utils.risk_media.record.profile_img_id = null;

							// ATTEMPT RE-CALC PROFILE IMG
							vm.utils.risk_media.calcProfileImg();

							// SET PROFILE IMG IN INTERFACE
							vm.utils.risk_media.setProfileImage(vm.utils.risk_media.record.profile_img_id);

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						alert(error);
						defer.reject(error);
					});

					return defer.promise;
				},
				recoverMediaRecord: function(media_record) {
					var defer = $q.defer();

					// MARK MEDIA LIVE
					media_record.status = 1;

					// SAVE RECORD
					mediaFactory.dbUtils.doSaveMediaRecord(media_record).then(function(save_result) {

						var i = 0;
						var len = vm.utils.risk_media.media_records.length;

						if( len > 0 ) {
							while(i < len) {
								if( vm.utils.risk_media.media_records[i]._id == media_record._id ) {
									vm.utils.risk_media.media_records[i]._id = save_result.id;
									vm.utils.risk_media.media_records[i]._rev = save_result.rev;
									vm.utils.risk_media.media_records[i].status = 1;
								}

								i++;
							}
						}

						vm.utils.risk_media.updateFileCount(vm.utils.risk_media.record._id, 'assessment');

						vm.utils.risk_media.autoFilterMedia();

						// CLEAR CACHED URL SO PROFILE IMG IS RECALCULATED AFTER SAVE
						mediaFactory.profile_imgs.removeStoredUrl('risks', vm.utils.ra_record._id);
						
						// CLEAR PROFILE IMG ID SO PROFILE IMG IS RECALCULATED
						// vm.utils.risk_media.record.profile_img_id = null;

						// ATTEMPT RE-CALC PROFILE IMG
						vm.utils.risk_media.calcProfileImg();

						// SET PROFILE IMG IN INTERFACE
						vm.utils.risk_media.setProfileImage(vm.utils.risk_media.record.profile_img_id);

						defer.resolve();

					}, function(error) {
						alert(error);
						defer.reject(error);
					});

					return defer.promise;
				}, 
				saveProfileImageSelection: function(media_record) {
					mediaFactory.dbUtils.updateRecordProfileImage(vm.utils.risk_media.record._id, 'assessment', media_record._id, media_record.rm_id).then(function() {

						vm.utils.risk_media.setProfileImage(media_record._id);

					}, function(error) {
						alert(error);
					});
				},
				downloadMediaFile: function(media_record) {
					vm.utils.risk_media.downloading_file = true;
					
					var chunk_size = 1 * 1024 * 1024;
					var pool_limit = 6;

					mediaFactory.downloads.downloadMediaFile(media_record, chunk_size, pool_limit).then(function() {
						vm.utils.risk_media.downloading_file = false;
						vm.utils.risk_media.getAllRecordAttachments(vm.utils.risk_media.record._id, 'assessment');
					}, function(error) {
						vm.utils.risk_media.downloading_file = false;
						alert(error);
					});
				
				},
				autoFilterMedia: function() {
					var filtered_array = [];

					angular.forEach(vm.utils.risk_media.media_records, function(m_record, m_index) {

						var errors = 0;

						if( m_record.item_not_found == 'Yes' ) {
							errors++;
						}

						if( m_record.status != vm.utils.risk_media.filters.status ) {
							errors++;
						}

						if( errors == 0 ) {
							filtered_array.push(m_record);
						}

					});

					// filtered_array = $filter('orderBy')(filtered_array, 'date_added');
					filtered_array = $filter('orderBy')(filtered_array, 'sequence_number');

					vm.utils.risk_media.visible_media = filtered_array;
				},
				toggleMediaStatusView: function(status) {
					if( status == 'live' ) {
						vm.utils.risk_media.filters.status = 1;
					}

					if( status == 'deleted' ) {
						vm.utils.risk_media.filters.status = 3;
					}

					vm.utils.risk_media.autoFilterMedia();
				},
				toggleReOrderMediaMode: function() {
					vm.utils.risk_media.re_order_media_mode = !vm.utils.risk_media.re_order_media_mode;
				},
				delete_multiple: {
					loading: false,
					selected_media: [],
					startMode: function() {
						vm.utils.risk_media.delete_multiple_mode = true;
						vm.utils.risk_media.delete_multiple.selected_media = [];
					},
					toggleSelect: function(media) {
						if( !media.delete_multiple_selected ) {
							vm.utils.risk_media.delete_multiple.select(media);
						} else {
							vm.utils.risk_media.delete_multiple.deSelect(media);
						}
					},
					select: function(media) {
						vm.utils.risk_media.delete_multiple.selected_media.push(media);
						media.delete_multiple_selected = true;
					},
					deSelect: function(media) {
						var found_index = null;
						var i = 0;
						var len = vm.utils.risk_media.delete_multiple.selected_media.length;
						while(i < len) {
							if( media._id == vm.utils.risk_media.delete_multiple.selected_media[i]._id ) {
								found_index = i;
							}

							i++;
						}

						if( found_index != null ) {
							delete media.delete_multiple_selected;
							vm.utils.risk_media.delete_multiple.selected_media.splice(found_index, 1);
						}
					},
					confirm: function(media) {
						var defer = $q.defer();
						var delete_defer = $q.defer();

						vm.utils.risk_media.delete_multiple.loading = true;

						deleteNextMediaRecord(delete_defer, 0).then(function() {

							vm.utils.risk_media.delete_multiple.loading = false;

							vm.utils.risk_media.delete_multiple.close();

							defer.resolve();

						}, function(error) {
							vm.utils.risk_media.delete_multiple.loading = false;
							defer.reject(error);
						});

						function deleteNextMediaRecord(defer, active_index) {

							if( active_index > media.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}

							vm.utils.risk_media.deleteMediaRecord(media[active_index]).then(function() {

								active_index++;

								deleteNextMediaRecord(defer, active_index);

							}, function(error) {
								defer.reject(error);
							});

							return defer.promise;
						}

						return defer.promise;
					},
					close: function() {
						vm.utils.risk_media.delete_multiple_mode = false;
						vm.utils.risk_media.delete_multiple.selected_media = [];

						var i = 0;
						var len = vm.utils.risk_media.media_records.length;
						// REMOVE DELETE MULTIPLE SELECTED VALUES
						while(i < len) {
							if( vm.utils.risk_media.media_records[i].hasOwnProperty('delete_multiple_selected') ) {
								delete vm.utils.risk_media.media_records[i].delete_multiple_selected;
							} 

							i++;
						}
					},
					selectStyle: function(media) {
						var style = {
							'background-color': '#fff'
						};

						if( media.delete_multiple_selected ) {
							style['background-color'] = '#198754';
							style['color'] = '#fff';
 						}

						return style;
					}
				},
				calcProfileImg: function() {

					if( !vm.utils.risk_media.media_records.length ) {
						vm.utils.risk_media.record.profile_img_id = null;
						vm.utils.risk_media.record.profile_img_url = null;
						vm.utils.risk_media.record.profile_img_download_required = false;
						return;
					}

					// IF PROFILE IMG NOT DOWNLOADED
					if( vm.utils.risk_media.record.hasOwnProperty('profile_img_download_required') && vm.utils.risk_media.record.profile_img_download_required ) {
						return;
					}

					// IF RISK PROFILE IMG ALREADY SET
					if( vm.utils.risk_media.record.hasOwnProperty('profile_img_id') && vm.utils.risk_media.record.profile_img_id && vm.utils.risk_media.record.hasOwnProperty('profile_img_attachment_key') && vm.utils.risk_media.record.profile_img_attachment_key ) {
						return;
					}

					vm.utils.risk_media.record.profile_img_url = null;
					vm.utils.risk_media.record.profile_img_download_required = false;

					var filtered_media = [];

					var media = vm.utils.risk_media.media_records;
					media = $filter('orderBy')(media, 'date_added');

					var i = 0;
					var len = media.length;

					while(i < len) {
						var errors = 0;

						// IF FILE IS NOT DOWNLOADED
						// if( !media[i].hasOwnProperty('file_downloaded') || media[i].file_downloaded != 'Yes' ) {
						// 	errors++;
						// }

						// IF FILE DOES NOT EXIST
						if( media[i].hasOwnProperty('file_does_not_exist') && media[i].file_does_not_exist ) {
							errors++;
						}

						// IF NOT A LIVE IMAGE
						if( !media[i].hasOwnProperty('status') || media[i].status != 1 ) {
							errors++;
						}

						if( errors == 0 ) {
							filtered_media.push(media[i]);
						}

						i++;
					}

					if( filtered_media.length == 0 ) {
						// NO LIVE IMAGES TO SET AS PROFILE IMAGE
						vm.utils.risk_media.record.profile_img_id = null;
						return;
					}

					if( !filtered_media[0].hasOwnProperty('file_downloaded') || filtered_media[0].file_downloaded != 'Yes' ) {
						// PROFILE IMAGE NOT DOWNLOADED
						vm.utils.risk_media.record.profile_img_download_required = true;

						return;
					}

					vm.utils.risk_media.record.profile_img_id = filtered_media[0]._id;

					// GET URL FOR FIRST IMAGE
					// mediaFactory.dbUtils.getStoredAttachmentUrl('risks', filtered_media[0]._id, filtered_media[0].attachment_key).then(function(url) {

						// SET PROFILE IMAGE URL FOR RISK
						// vm.utils.risk_media.record.profile_img_url = url;

						vm.utils.risk_media.record.profile_img_attachment_key = filtered_media[0].attachment_key;

						// STORE URL IN FACTORY FOR SESSION
						// mediaFactory.profile_imgs.storeUrl('risks', risk._id, url);

						// CLEAN UP MEDIA ARRAY
						media = [];
					// });
				},
				updateInsensitiveReviewedMedia: function(saved_data) {
					var media_i = 0;
					var media_len = vm.utils.risk_media.media_records.length;

					while(media_i < media_len) {

						var data_i = 0;
						var data_len = saved_data.length;

						while(data_i < data_len) {

							if( saved_data[data_i]._id == vm.utils.risk_media.media_records[media_i]._id ) {
								vm.utils.risk_media.media_records[media_i]._id = saved_data[data_i]._id;
								vm.utils.risk_media.media_records[media_i]._rev = saved_data[data_i]._rev;
								vm.utils.risk_media.media_records[media_i].insensitive_media = saved_data[data_i].insensitive_media;
								vm.utils.risk_media.media_records[media_i].insensitive_media_by = saved_data[data_i].insensitive_media_by;
								vm.utils.risk_media.media_records[media_i].date_insensitive_media = saved_data[data_i].date_insensitive_media;
							}

							data_i++;
						}

						media_i++;
					}
				}
			},
			clone_image: {
				src_asset_record: null,
				relations: {
					record_id: null, 
					record_type: null,
					rm_record_item_id: null, 
					rm_record_item_ref: null, 
					activity_id: null, 
					rm_activity_id: null, 
					client_id: null, 
					is_register: 'No'
				},
				image_errors: {
					error: false,
					num_images: 0,
					error_message: null,
					setValues: function() {
						vm.utils.clone_image.image_errors.error = cloneUtilsFactory.image_errors.error;
						vm.utils.clone_image.image_errors.num_images = cloneUtilsFactory.image_errors.num_images;
						vm.utils.clone_image.image_errors.error_message = cloneUtilsFactory.image_errors.error_message;
					},
					reset: function() {
						cloneUtilsFactory.image_errors.reset();
						vm.utils.clone_image.image_errors.setValues();
					},
					toast: {
						show: function() {
							var toastEl = document.getElementById('RiskFormCloneImageErrorToast');
                            var myToast = bootstrap.Toast.getOrCreateInstance(toastEl);
                            myToast.show();
						}
					}
				},
				resetRelations: function() {
					vm.utils.clone_image.record_id = null;
					vm.utils.clone_image.record_type = null;
					vm.utils.clone_image.rm_record_item_id = null;
					vm.utils.clone_image.rm_record_item_ref = null;
					vm.utils.clone_image.activity_id = null;
					vm.utils.clone_image.rm_activity_id = null;
					vm.utils.clone_image.client_id = null;
					vm.utils.clone_image.is_register = 'No';
				},
				cloneMultiple: function(image_ids){
					var defer = $q.defer();
					var clone_defer = $q.defer();

					// RESET ANY PREVIOUS CLONE IMAGE ERRORS
					vm.utils.clone_image.image_errors.reset();

					function cloneNextRecord(image_ids, current_index, defer)
					{
						if( !image_ids )
						{
							defer.resolve();
							return defer.promise;
						}

						if( !image_ids.length )
						{
							defer.resolve();
							return defer.promise;
						}

						if( current_index > image_ids.length - 1 )
						{
							defer.resolve();
							return defer.promise;
						}

						var current_image_id = image_ids[ current_index ];

						vm.utils.clone_image.clone(current_image_id).then(function(){

							//CLONE THE NEXT
							current_index++;
							cloneNextRecord(image_ids, current_index, defer);

						}, function(error){
							defer.reject(error);
						});

						return defer.promise;
					}

					vm.utils.saving_media = true;
					vm.utils.saving_media_message = 'Cloning images, please wait...';

					cloneNextRecord(image_ids, 0, clone_defer).then(function(){

						if( vm.utils.clipboard.clone_dest == 'risk_image' ) {

							vm.utils.risk_media.updateFileCount(vm.utils.risk_media.record._id, 'assessment').then(function(risk_record){
								
								rmUtilsFactory.sync_decoration.assessments.markRiskAssessmentModified(vm.utils.risk_media.record._id).then(function(modified_assessment) {
									// vm.utils.risk_media.getAllRecordAttachments(vm.utils.risk_media.record._id, 'assessment');
								});

							});

							// ATTEMPT SET PROFILE IMG
							vm.utils.risk_media.calcProfileImg();
							// SET PROFILE IMG IN INTERFACE
							vm.utils.risk_media.setProfileImage(vm.utils.risk_media.record.profile_img_id);

							// DELETE USED QUICK CAPTURE IMAGES
							if( vm.utils.quick_capture.select_mode.clone_active ) {
								vm.utils.quick_capture.select_mode.deleteClonedMedia().then(function() {
									vm.utils.saving_media = false;
									vm.utils.saving_media_message = null;
								}, function(error) {
									vm.utils.saving_media = false;
									vm.utils.saving_media_message = null;
								});
							} else {
								vm.utils.saving_media = false;
								vm.utils.saving_media_message = null;
							}

							// SHOW TOAST IF CLONE IMAGE ERRORS
							if( cloneUtilsFactory.image_errors.error ) {
								vm.utils.clone_image.image_errors.setValues();

								setTimeout(function() {
									vm.utils.clone_image.image_errors.toast.show();
								}, 0);
							}
						}

						vm.utils.clone_image.resetRelations();

						defer.resolve();
					}, function(){
						vm.utils.clone_image.resetRelations();
						vm.utils.saving_media = false;
						vm.utils.saving_media_message = null;
						defer.reject();
					});

					return defer.promise;
				},
				clone: function(image_id){
					var defer = $q.defer();

					if( !image_id )
					{
						alert("No image has been selected to clone");
						defer.reject("No image has been selected to clone");
						return defer.promise;
					}

					//SETUP RELATIONS
					vm.utils.clone_image.relations.record_id = vm.utils.clipboard.clone_dest_record._id;
					vm.utils.clone_image.relations.rm_record_item_id = vm.utils.clipboard.clone_dest_record.rm_id || null;
					vm.utils.clone_image.relations.rm_record_item_ref = vm.utils.clipboard.clone_dest_record.rm_ref || null;
					vm.utils.clone_image.relations.activity_id = vm.utils.relations.activity_id;
					vm.utils.clone_image.relations.rm_activity_id = vm.utils.relations.rm_activity_id;
					vm.utils.clone_image.relations.client_id = authFactory.getActiveCompanyId();

					// WORK OUT RECORD TYPE
					if( vm.utils.clipboard.clone_dest == 'risk_image' ) {
						vm.utils.clone_image.relations.record_type = 'assessment';
					}

					vm.utils.clone_image.is_loading = true;

					cloneUtilsFactory.media.copyMediaRecord(image_id, null, vm.utils.clone_image.relations).then(function(cloned_media){
						vm.utils.clone_image.is_loading = false;

						if( vm.utils.clipboard.clone_dest == 'risk_image' ) {

							// RESOLVE AND DO NOTHING ELSE IF MEDIA COULD NOT BE CLONED
							if( cloned_media && cloned_media.hasOwnProperty('could_not_clone') && cloned_media.could_not_clone ) {
								defer.resolve();
								return defer.promise;
							}  

							vm.utils.risk_media.getMediaRecordAttachment(cloned_media).then(function() {
								
								vm.utils.risk_media.updateListMediaData(cloned_media);

								defer.resolve();
								$scope.$apply();
							});

						} else {
							defer.resolve();
						}

					}, function(error){
						vm.utils.clone_image.is_loading = false;
						alert(error);
						defer.reject(error);
					});

					return defer.promise;
				}
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
			media_form: {
				record: null,
				is_loading: false,
				edit: function(record){
					vm.utils.media_form.record = record;
				},
				save: function(){
					var defer = $q.defer();

					if( vm.utils.media_form.record.hasOwnProperty('delete_multiple_selected') ) {
						delete vm.utils.media_form.record.delete_multiple_selected;
					}

					mediaFactory.utils.clearInsensitiveMediaReview(vm.utils.media_form.record);

					riskmachDatabasesFactory.databases.collection.media.put(vm.utils.media_form.record).then(function(result){
						vm.utils.media_form.record._id = result.id;
						vm.utils.media_form.record._rev = result.rev;
						defer.resolve(vm.utils.media_form.record);
						vm.utils.media_form.record = null;
						$scope.$apply();
					}).catch(function(error){
						alert(error);
						defer.reject(error);
					});

					return defer.promise;
				},
				isActive: function(record){
					var active = false;

					if( !vm.utils.media_form.record )
					{
						return active;
					}

					if( !record )
					{
						return active;
					}

					if( vm.utils.media_form.record._id == record._id )
					{
						active = true;
					}

					return active;
				}
			},
			quick_capture: {
				record: null,
				media_records: [],
				visible_media: [],
				downloading_file: false,
				filters: {
					status: 1
				},
				re_order_media_mode: false,
				tabs: {
					active_tab: 'images',
					tabActive: function(tab) {
						if( vm.utils.quick_capture.tabs.active_tab == tab ) {
							return true;
						} else {
							return false;
						}
					},
					changeTab: function(tab) {
						vm.utils.quick_capture.tabs.active_tab = tab;
					}
				},
				setRecord: function(record){
					vm.utils.quick_capture.record = record;
				},
				open: function(asset_record) {

					// vm.utils.quick_capture.aside.show();

					vm.utils.quick_capture.load(asset_record);

				},
				load: function() {
					vm.utils.quick_capture.loading = true;

					vm.utils.quick_capture.getQuickCaptureAsset().then(function(asset_record) {

						vm.utils.quick_capture.getQuickCaptureRecord(asset_record).then(function() {

							vm.utils.quick_capture.getAllRecordAttachments(vm.utils.quick_capture.record._id, 'assessment').then(function() {
								vm.utils.quick_capture.loading = false;

							});

						}, function(error) {
							vm.utils.quick_capture.loading = false;
							alert(error);
						});

					}, function(error) {
						vm.utils.quick_capture.loading = false;
						defer.reject(error);
					});

				},
				getQuickCaptureAsset: function() {
					var defer = $q.defer();

					var asset_db = riskmachDatabasesFactory.databases.collection.assets;

					asset_db.get(vm.utils.ra_record.asset_id).then(function(asset_doc) {
						defer.resolve(asset_doc);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				getQuickCaptureRecord: function(asset_record) {
					var defer = $q.defer();

					vm.utils.quick_capture.getCreateQuickCaptureRiskRecord(asset_record).then(function(risk_record) {

						vm.utils.quick_capture.record = risk_record;

						defer.resolve();

					}, function(error) {
						defer.reject(error);
						alert(error);
					});

					return defer.promise;
				},
				getCreateQuickCaptureRiskRecord: function(asset_record) {
					var defer = $q.defer();

					if( !asset_record.hasOwnProperty('quick_capture_risk_id') || !asset_record.quick_capture_risk_id ) {

						vm.utils.quick_capture.createQuickCaptureRiskRecord(asset_record).then(function(quick_capture_risk) {

							console.log("CREATED NEW QUICK CAPTURE RISK");

							defer.resolve(quick_capture_risk);

						}, function(error) {
							defer.reject(error);
						});

					} else {

						var risk_db = riskmachDatabasesFactory.databases.collection.assessments;

						// FETCH QUICK CAPTURE RISK
						risk_db.get(asset_record.quick_capture_risk_id).then(function(risk_doc) {

							console.log("FETCHED EXISTING QUICK CAPTURE RISK");

							defer.resolve(risk_doc);

						}).catch(function(error) {
							defer.reject(error);
						});


					}

					return defer.promise;
				},
				createQuickCaptureRiskRecord: function(asset_record) {
					var defer = $q.defer();

					var risk_db = riskmachDatabasesFactory.databases.collection.assessments;
					var asset_db = riskmachDatabasesFactory.databases.collection.assets;

					var risk_record = modelsFactory.models.newRiskAssessment();

					// SET RISK VALUES
					risk_record.quick_capture_risk = 'Yes';
					risk_record.asset_id = asset_record._id;
					risk_record.activity_id = asset_record.project_id;

					risk_record.hazard_description = 'Inspection quick capture images';
					risk_record.status = 4;
					risk_record.status_name = 'Draft';

					// FULL RISK
					risk_record.assessment_type = 0;

					risk_db.post(risk_record, {force: true}).then(function(result) {

						risk_record._id = result.id;
						risk_record._rev = result.rev;

						asset_record.quick_capture_risk_id = risk_record._id;

						asset_db.put(asset_record).then(function(asset_result) {

							asset_record._id = result.id;
							asset_record._rev = result.rev;

							defer.resolve(risk_record);

						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				init: function() {

					setTimeout(function(){

						var inputFile = document.querySelector('#quickCaptureInputFile');
						var photoInput = document.querySelector('#quickCapturePhotoInput');
						var uploadedFile = {};

						function fileUpload(){

							// if( vm.utils.quick_capture.record._id == null ) {
								
							// 	// SAVE THE ASSET
							// 	vm.utils.asset_form.save().then(function() {
							// 		vm.utils.quick_capture.record = vm.utils.asset_form.record;

							// 		// ATTEMPT SAVE FILES
							// 		fileUpload();

							// 	}, function(error) {
							// 		alert(error);
							// 	});

							// 	return;
							// };
							
							//DEFINE THE SAVE ROUTINE FOR SERIALLY SAVING
							function saveFiles(files, index)
							{
								console.log("FILES");
								console.log(files);

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

									vm.utils.quick_capture.updateFileCount(vm.utils.quick_capture.record._id, 'assessment').then(function(asset_record){
										// vm.utils.quick_capture.getAllRecordAttachments(vm.utils.quick_capture.record._id, 'asset');
									});

									defer.resolve();
									return defer.promise;
								}

								//SAVE THE FILE
								vm.utils.asset_media.saveAssetFile(files[index], vm.utils.quick_capture.record, 'quickCapture').then(function(){
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

					}, 0);
				},
				close: function() {
					vm.utils.quick_capture.record = null;
					vm.utils.quick_capture.media_records = [];

					// vm.utils.quick_capture.aside.hide();
				},
				updateFileCount: function(record_id, record_type) {
					var defer = $q.defer();

					mediaFactory.dbUtils.updateRecordFileCount(record_id, record_type).then(function(doc){
						vm.utils.quick_capture.record._id = doc._id;
						vm.utils.quick_capture.record._rev = doc._rev;
						vm.utils.quick_capture.record.num_files = doc.num_files;

						// vm.utils.asset_listing.refresh();
						// vm.utils.asset_listing.updateListData(doc);

						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				getAllRecordAttachments: function(record_id, record_type){
					var defer = $q.defer();

					mediaFactory.dbUtils.getAllRecordAttachments(record_id, record_type).then(function(media_records){

						vm.utils.quick_capture.media_records = media_records;

						vm.utils.quick_capture.autoFilterMedia();

						vm.utils.quick_capture.setProfileImage(vm.utils.quick_capture.record.profile_image_media_id);

						defer.resolve();
						$scope.$apply();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				getMediaRecordAttachment: function(media_record) {
					var defer = $q.defer();

					mediaFactory.dbUtils.getAttachmentUrl(media_record._id, media_record.attachment_key).then(function(url) {

						media_record.url = url;

						defer.resolve();

						$scope.$apply();

					}, function(error) {
						alert(error);
						defer.reject(error);
					});

					return defer.promise;
				},
				setProfileImage: function(profile_image_id){

					angular.forEach(vm.utils.quick_capture.media_records, function(record, index) {
						if( record._id == profile_image_id ) {
							vm.utils.quick_capture.media_records[index].profile_image = true;
						} else {
							vm.utils.quick_capture.media_records[index].profile_image = false;
						};
					});

				},
				mediaStyle: function(media_record){
					var style = {
						'border': '1px solid #ddd'
					};

					if( media_record.status != 1 )
					{
						style['border'] = '1px solid #a94442';
					}

					return style;
				},
				deleteMediaRecord: function(media_record) {
					// MARK MEDIA DELETED
					media_record.status = 3;

					// SAVE RECORD
					mediaFactory.dbUtils.doSaveMediaRecord(media_record).then(function(save_result) {

						angular.forEach(vm.utils.quick_capture.media_records, function(record, index) {
							if( record._id == media_record._id ) {
								vm.utils.quick_capture.media_records[index]._id = save_result.id;
								vm.utils.quick_capture.media_records[index]._rev = save_result.rev;
								vm.utils.quick_capture.media_records[index].status = 3;
							};
						});

						vm.utils.quick_capture.updateFileCount(vm.utils.quick_capture.record._id, 'assessment');

						vm.utils.quick_capture.autoFilterMedia();

					}, function(error) {
						alert(error);
						defer.reject(error);
					});
				},
				recoverMediaRecord: function(media_record) {
					// MARK MEDIA LIVE
					media_record.status = 1;

					// SAVE RECORD
					mediaFactory.dbUtils.doSaveMediaRecord(media_record).then(function(save_result) {

						angular.forEach(vm.utils.quick_capture.media_records, function(record, index) {
							if( record._id == media_record._id ) {
								vm.utils.quick_capture.media_records[index]._id = save_result.id;
								vm.utils.quick_capture.media_records[index]._rev = save_result.rev;
								vm.utils.quick_capture.media_records[index].status = 1;
							};
						});

						vm.utils.quick_capture.updateFileCount(vm.utils.quick_capture.record._id, 'snapshot_asset');

						vm.utils.quick_capture.autoFilterMedia();

					}, function(error) {
						alert(error);
						defer.reject(error);
					});
				}, 
				saveProfileImageSelection: function(media_record) {
					mediaFactory.dbUtils.updateRecordProfileImage(vm.utils.quick_capture.record._id, 'asset', media_record._id, media_record.rm_id).then(function() {

						vm.utils.quick_capture.setProfileImage(media_record._id);

					}, function(error) {
						alert(error);
					});
				},
				downloadMediaFile: function(media_record) {
					vm.utils.quick_capture.downloading_file = true;
					
					var chunk_size = 1 * 1024 * 1024;
					var pool_limit = 6;

					mediaFactory.downloads.downloadMediaFile(media_record, chunk_size, pool_limit).then(function(saved_media) {
						vm.utils.quick_capture.downloading_file = false;
						// vm.utils.quick_capture.getAllRecordAttachments(vm.utils.quick_capture.record._id, 'asset');

						vm.utils.quick_capture.getMediaRecordAttachment(saved_media).then(function() {
							vm.utils.quick_capture.updateListMediaData(saved_media);
						});

					}, function(error) {
						vm.utils.quick_capture.downloading_file = false;
						alert(error);
					});
				},
				autoFilterMedia: function() {
					var filtered_array = [];

					angular.forEach(vm.utils.quick_capture.media_records, function(m_record, m_index) {

						var errors = 0;

						if( m_record.item_not_found == 'Yes' ) {
							errors++;
						}

						if( m_record.status != vm.utils.quick_capture.filters.status ) {
							errors++;
						}

						if( errors == 0 ) {
							filtered_array.push(m_record);
						}

					});

					//ORDER BY DATE ADDED
					// filtered_array = $filter('orderBy')(filtered_array, 'date_added');
					filtered_array = $filter('orderBy')(filtered_array, 'sequence_number');

					vm.utils.quick_capture.visible_media = filtered_array;
				},
				toggleMediaStatusView: function(status) {
					if( status == 'live' ) {
						vm.utils.quick_capture.filters.status = 1;
					}

					if( status == 'deleted' ) {
						vm.utils.quick_capture.filters.status = 3;
					}

					vm.utils.quick_capture.autoFilterMedia();
				},
				updateListMediaData: function(media_record) {
					vm.utils.quick_capture.updateListMediaRecord(media_record);

					vm.utils.quick_capture.autoFilterMedia();

					vm.utils.quick_capture.setProfileImage(vm.utils.quick_capture.record.profile_image_media_id);
				}, 
				updateListMediaRecord: function(media_record) {
					var i = 0;
					var len = vm.utils.quick_capture.media_records.length;

					var record_index = null;

					if( len > 0 ) {
						while(i < len) {

							if( vm.utils.quick_capture.media_records[i]._id == media_record._id ) {
								record_index = i;
							}

							i++;
						}
					}

					if( record_index != null ) {
						vm.utils.quick_capture.media_records[ record_index ] = media_record;
					} else {
						vm.utils.quick_capture.media_records.push(media_record);
					}
				},
				toggleReOrderMediaMode: function() {
					vm.utils.quick_capture.re_order_media_mode = !vm.utils.quick_capture.re_order_media_mode;
				},
				select_mode: {
					clone_active: false,
					items: [],
					selectStyle: function(item) {
						var style = {
							'background-color': 'white',
							'color': '#ddd'
						};

						if( vm.utils.quick_capture.select_mode.isSelected(item) )
						{
							style['background-color'] = 'green';
							style['color'] = '#fff';
						}

						return style;
					},
					isSelected: function(item) {
						var selected = false;

						var matches = 0;
						angular.forEach(vm.utils.quick_capture.select_mode.items, function(record, index){

							if( record._id == item._id)
							{
								matches++;
							}

						});

						if( matches > 0 )
						{
							selected = true;
						}

						return selected;
					},
					toggleSelect: function(item){
						var existing_index = null;
						var num_matches = 0;
						angular.forEach(vm.utils.quick_capture.select_mode.items, function(record, index){

							if( record._id == item._id )
							{
								num_matches++;
								existing_index = index;
							}

						});

						if( num_matches == 0 )
						{
							vm.utils.quick_capture.select_mode.items.push( item );
						}
						else
						{
							vm.utils.quick_capture.select_mode.items.splice( existing_index, 1 );
						}
					},
					clearSelection: function(){
						vm.utils.quick_capture.select_mode.items = [];
						vm.utils.quick_capture.select_mode.clone_active = false;
					},
					confirmSelection: function(){

						if( vm.utils.quick_capture.select_mode.items.length == 0 )
						{
							alert("You have not selected any images");
							return;
						}

						// SET CLIPBOARD VALUES FOR CLONE
						vm.utils.clipboard.clone_dest = 'risk_image';
						vm.utils.clipboard.clone_dest_record = vm.utils.ra_record;
						vm.utils.clipboard.mode = 'clone';

						vm.utils.quick_capture.select_mode.clone_active = true;

						vm.utils.tabs.changeTab('images');

						var record_ids = [];

						angular.forEach(vm.utils.quick_capture.select_mode.items, function(record, index){

							record_ids.push( record._id );

						});

						console.log("IMAGE IDS TO CLONE");
						console.log(record_ids);

						vm.utils.clone_image.cloneMultiple(record_ids);
					},
					deleteClonedMedia: function() {
						var defer = $q.defer();
						var delete_defer = $q.defer();

						deleteNextMediaRecord(delete_defer, 0).then(function() {

							//vm.utils.quick_capture.updateFileCount(vm.utils.quick_capture.record._id, 'assessment');

							console.log("FINISHED - CLEAR QUICK CAPTURE SELECTION");

							vm.utils.quick_capture.select_mode.clearSelection();

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

						function deleteNextMediaRecord(defer, active_index) {

							if( active_index > vm.utils.quick_capture.select_mode.items.length - 1 ) {
								defer.resolve();
								return defer.promise;
							}

							// MARK MEDIA DELETED
							vm.utils.quick_capture.select_mode.items[active_index].status = 3;

							// SAVE RECORD
							// mediaFactory.dbUtils.doSaveMediaRecord(vm.utils.quick_capture.select_mode.items[active_index]).then(function(save_result) {

							// 	active_index++;

							// 	deleteNextMediaRecord(defer, active_index);

							// }, function(error) {
							// 	alert(error);
							// 	defer.reject(error);
							// });

							// SAVE RECORD
							riskmachDatabasesFactory.databases.collection.media.put(vm.utils.quick_capture.select_mode.items[active_index]).then(function(result) {
								
								vm.utils.quick_capture.select_mode.items[active_index]._id = result.id;
								vm.utils.quick_capture.select_mode.items[active_index]._rev = result.rev;

								active_index++;

								deleteNextMediaRecord(defer, active_index);

							}).catch(function(error) {
								console.log("ERROR UPDATING MEDIA RECORD");
								defer.reject(error);
							});

							return defer.promise;
						}

						return defer.promise;
					}
				},
				// aside: $aside({
				// 	title: 'Asset Quick Capture',
				// 	template: 'tpl/blank_aside.html',
				// 	contentTemplate: 'tpl/asset_quick_capture_aside.html',
				// 	backdrop: 'static',
				// 	container: 'body',
				// 	show: false,
				// 	scope: $scope,
				// 	keyboard: false
				// }),
			},
			image_sensitivity_review: {
				record_id: null, 
				record_ids: [],
				record_type: null,
				data: [],
				loading: false,
				downloading_file: false,
				error: false, 
				error_message: '',
				clipboard_item_info: null,
				directive_id: 'risk_form',
				directive_ids: ['risk_form'],
				tabs: {
					active_tab: 'review',
					changeTab: function(tab) {
						vm.utils.image_sensitivity_review.tabs.active_tab = tab;
					},
					tabActive: function(tab) {
						if( tab == vm.utils.image_sensitivity_review.tabs.active_tab ) {
							return true;
						} else {
							return false;
						}
					}
				},
				confidentiality: 'disagree',
				relevance: 'disagree',
				quality_clarity: 'disagree',
				start: function() {
					vm.utils.image_sensitivity_review.confidentiality = 'disagree';
					vm.utils.image_sensitivity_review.relevance = 'disagree';
					vm.utils.image_sensitivity_review.quality_clarity = 'disagree';

					vm.utils.image_sensitivity_review.clearError();

					vm.utils.image_sensitivity_review.tabs.changeTab('review');

					vm.utils.image_sensitivity_review.fetchData();
				},
				fetchData: function() {
					var defer = $q.defer();

					vm.utils.image_sensitivity_review.loading = true;

					// OPEN MEDIA REVIEW TAB
					vm.utils.tabs.changeTab('sensitivity_review');

					// INIT ARRAY
					vm.utils.image_sensitivity_review.data = [];

					if( vm.utils.image_sensitivity_review.record_type == 'image' ) {

						mediaFactory.dbUtils.getMediaRecordAttachmentMultiple(vm.utils.image_sensitivity_review.record_ids).then(function(media_records) {

							vm.utils.image_sensitivity_review.loading = false;

							// AUTO FILTER
							vm.utils.image_sensitivity_review.data = vm.utils.image_sensitivity_review.autoFilter(media_records);

							// FORMAT MEDIA
							vm.utils.image_sensitivity_review.formatMediaForReview(vm.utils.image_sensitivity_review.data);

							// COUNT SENSITIVE IMAGES
							var num_images_review = vm.utils.image_sensitivity_review.countSensitiveImages(vm.utils.image_sensitivity_review.data);

							// IF NO SENSITIVE IMAGES TO REVIEW, CLONE RECORDS
							if( num_images_review == 0 ) {
								// CHANGE TAB BACK TO IMAGE GALLERY
								vm.utils.tabs.changeTab('images');
								vm.utils.image_sensitivity_review.loading = false;
								// vm.utils.image_sensitivity_review.addToClipboard();
								vm.utils.image_sensitivity_review.cloneRecords();
								defer.resolve();
								return defer.promise;
							}

							defer.resolve();

						}, function(error) {
							vm.utils.image_sensitivity_review.loading = false;
							defer.reject(error);
						});

					}

					if( vm.utils.image_sensitivity_review.record_type == 'assessment' ) {
						// FETCH RA IMAGES
						mediaFactory.dbUtils.getAllStoredRecordAttachmentsMultiple(vm.utils.image_sensitivity_review.record_ids, vm.utils.image_sensitivity_review.record_type, 'risks').then(function(media_records) {

							vm.utils.image_sensitivity_review.loading = false;

							// AUTO FILTER
							vm.utils.image_sensitivity_review.data = vm.utils.image_sensitivity_review.autoFilter(media_records);

							// FORMAT MEDIA
							vm.utils.image_sensitivity_review.formatMediaForReview(vm.utils.image_sensitivity_review.data);

							// COUNT SENSITIVE IMAGES
							var num_images_review = vm.utils.image_sensitivity_review.countSensitiveImages(vm.utils.image_sensitivity_review.data);

							// IF NO SENSITIVE IMAGES TO REVIEW, CLONE RECORDS
							if( num_images_review == 0 ) {
								// CHANGE TAB BACK TO IMAGE GALLERY
								vm.utils.tabs.changeTab('images');
								vm.utils.image_sensitivity_review.loading = false;
								// vm.utils.image_sensitivity_review.addToClipboard();
								vm.utils.image_sensitivity_review.cloneRecords();
								defer.resolve();
								return defer.promise;
							}

							defer.resolve();

						}, function(error) {
							vm.utils.image_sensitivity_review.loading = false;
							defer.reject(error);
						});
					}

					return defer.promise;
				},
				autoFilter: function(media) {

					var i = 0;
					var len = media.length;
					var filtered_array = [];

					while(i < len) {

						var errors = 0;

						if( media[i].item_not_found == 'Yes' ) {
							errors++;
						}

						// IF NOT LIVE
						if( media[i].status != 1 ) {
							errors++;
						}

						// IF MEDIA RECORD ALREADY REVIEWED
						if( media[i].hasOwnProperty('insensitive_media') && (media[i].insensitive_media == 'Yes' || media[i].insensitive_media == 'No') ) {
							errors++;
						}

						if( errors == 0 ) {
							filtered_array.push(media[i]);
						}

						i++;
					}

					return filtered_array;
				},
				formatMediaForReview: function(media) {
					var i = 0;
					var len = media.length;

					while(i < len) {

						// DEFAULT TO SENSITIVE IF NOT SET
						if( !media[i].hasOwnProperty('insensitive_media') || !media[i].insensitive_media ) {
							media[i].insensitive_media = 'No';
							media[i].date_insensitive_media = new Date().getTime();
							media[i].insensitive_media_by = authFactory.cloudUserId();
							media[i].insensitive_media_reason = 'System message: User selection';
						}

						i++;
					}
				},
				mediaStyle: function(media_record){
					var style = {
						'border': '1px solid #ddd'
					};

					if( media_record.insensitive_media == 'Yes' )
					{
						style['border'] = '1px solid #146c43';
					}

					return style;
				},
				countSensitiveImages: function(media) {
					var count = 0;

					var i = 0;
					var len = media.length;

					while(i < len) {

						// IF CLONING ACROSS COMPANIES
						if( vm.utils.image_sensitivity_review.isAcrossCompanies(media[i]) ) {

							if( !media[i].hasOwnProperty('insensitive_media') || media[i].insensitive_media != 'Yes' ) {
								count++;
							}

						}

						i++;
					}

					return count;
				},
				countInsensitiveImages: function(media) {
					var count = 0;

					var i = 0;
					var len = media.length;

					while(i < len) {

						if( media[i].hasOwnProperty('insensitive_media') && media[i].insensitive_media == 'Yes' ) {
							count++;
						}

						i++;
					}

					return count;
				},
				isAcrossCompanies: function(media_record) {
					var across_companies = false;

					// IF HAS CLIENT ID PROPERTY AND DOES NOT MATCH CURRENT CLIENT
					if( media_record.hasOwnProperty('client_id') && media_record.client_id && media_record.client_id != authFactory.getActiveCompanyId() ) {
						across_companies = true;
					}

					// if( 1 == 1 ) {
					// 	across_companies = true;
					// }

					return across_companies;
				},
				toggleInsensitive: function(image) {
					if( !image.insensitive_media || image.insensitive_media == 'No' ) {
						image.insensitive_media = 'Yes';
						image.date_insensitive_media = new Date().getTime();
						image.insensitive_media_by = authFactory.cloudUserId();
					} else {
						image.insensitive_media = 'No';
						image.date_insensitive_media = new Date().getTime();
						image.insensitive_media_by = authFactory.cloudUserId();
					}

					image.insensitive_media_reason = 'System message: User selection';
				},
				completeReview: function() {
					var defer = $q.defer();

					if( !vm.utils.image_sensitivity_review.canCompleteReview() ) {
						vm.utils.image_sensitivity_review.error = true;
						vm.utils.image_sensitivity_review.error_message = "You can't unlock any images until you have agreed that selected images meet 'confidentiality', 'Relevance' and 'Quality & Clarity'";

						defer.resolve();
						return defer.promise;
					}

					var save_defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.media;

					var saved_data = [];

					vm.utils.image_sensitivity_review.saving = true;

					saveNextImage(save_defer, 0).then(function() {

						// ATTEMPT UPDATE RISK LISTING MEDIA ARRAY
						vm.utils.risk_media.updateInsensitiveReviewedMedia(saved_data);

						// SKIP CLIPBOARD REVIEW CHECK
						// vm.utils.image_sensitivity_review.clipboard_item_info.skip_review_check = true;

						// ADD ORIG RECORD TO CLIPBOARD
						// vm.utils.image_sensitivity_review.addToClipboard();

						// CHANGE TAB BACK TO IMAGE GALLERY
						vm.utils.tabs.changeTab('images');

						// CLONE RECORDS
						vm.utils.image_sensitivity_review.cloneRecords();

						defer.resolve();

						vm.utils.image_sensitivity_review.saving = false;

					}, function(error) {
						vm.utils.image_sensitivity_review.saving = false;
						defer.reject(error);
					});

					function saveNextImage(defer, active_index) {

						if( active_index > vm.utils.image_sensitivity_review.data.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						// SET MEDIA RECORD TO MODIFIED
						rmUtilsFactory.sync_decoration.media_records.mediaModified(vm.utils.image_sensitivity_review.data[active_index]).then(function() {

							// SAVE REVIEW
							db.put(vm.utils.image_sensitivity_review.data[active_index]).then(function(result) {

								vm.utils.image_sensitivity_review.data[active_index]._id = result.id;
								vm.utils.image_sensitivity_review.data[active_index]._rev = result.rev;

								var saved_record = {
									_id: vm.utils.image_sensitivity_review.data[active_index]._id,
									_rev: vm.utils.image_sensitivity_review.data[active_index]._rev,
									insensitive_media: vm.utils.image_sensitivity_review.data[active_index].insensitive_media,
									insensitive_media_by: vm.utils.image_sensitivity_review.data[active_index].insensitive_media_by,
									date_insensitive_media: vm.utils.image_sensitivity_review.data[active_index].date_insensitive_media
								}

								saved_data.push(saved_record);

								active_index++;

								saveNextImage(defer, active_index);

							}).catch(function(error) {
								defer.reject(error);
							});

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

				},
				canCompleteReview: function() {
					var can_complete = false;

					// IF NONE MARKED INSENSITIVE, CAN COMPLETE
					if( vm.utils.image_sensitivity_review.countInsensitiveImages(vm.utils.image_sensitivity_review.data) == 0 ) {
						can_complete = true;
						return can_complete;
					} 

					var errors = 0;

					if( vm.utils.image_sensitivity_review.confidentiality == 'disagree' ) {
						errors++;
					}

					if( vm.utils.image_sensitivity_review.relevance == 'disagree' ) {
						errors++;
					}

					if( vm.utils.image_sensitivity_review.quality_clarity == 'disagree' ) {
						errors++;
					}

					// CAN ONLY COMPLETE IF USER AGREED TO ALL 3
					if( errors == 0 ) {
						can_complete = true;
					}

					return can_complete;
				},
				clearError: function() {
					vm.utils.image_sensitivity_review.error = false;
					vm.utils.image_sensitivity_review.error_message = '';
				},
				addToClipboard: function() {

					console.log("ADD TO CLIPBOARD");

					// BROADCAST TO TOGGLE ORIG RECORD ONTO CLIPBOARD
					$rootScope.$broadcast("clipboard::toggleOnClipboard", {item_info: vm.utils.image_sensitivity_review.clipboard_item_info});
				},
				cloneRecords: function() {

					if( vm.utils.image_sensitivity_review.record_type == 'image' ) {
						vm.utils.clone_image.cloneMultiple(vm.utils.image_sensitivity_review.record_ids);
					}

					if( vm.utils.image_sensitivity_review.record_type == 'assessment' ) {
						vm.utils.clone_assessment.cloneMultiple(vm.utils.image_sensitivity_review.record_ids);
					}

				},
				downloadMediaFile: function(media_record) {
					if( vm.utils.image_sensitivity_review.downloading_file ) {
						alert("Please wait until the current file download has finished");
						return;
					}

					media_record.downloading_file = true;
					vm.utils.image_sensitivity_review.downloading_file = true;
					
					var chunk_size = 1 * 1024 * 1024;
					var pool_limit = 6;
					
					// SAVE PROPERTIES TO REAPPLY AFTER DOWNLOAD
					var data_to_reapply = {
						insensitive_media: media_record.insensitive_media, 
						date_insensitive_media: media_record.date_insensitive_media,
						insensitive_media_by: media_record.insensitive_media_by, 
						insensitive_media_reason: media_record.insensitive_media_reason
					}

					// REMOVE PROPERTIES TO NOT BE SAVED DURING DOWNLOAD
					media_record.insensitive_media = null;
					media_record.date_insensitive_media = null;
					media_record.insensitive_media_by = null;
					media_record.insensitive_media_reason = null;

					mediaFactory.downloads.downloadMediaFile(media_record, chunk_size, pool_limit).then(function() {
						media_record.downloading_file = false;
						vm.utils.image_sensitivity_review.downloading_file = false;

						mediaFactory.dbUtils.getAttachmentUrl(media_record._id, media_record.attachment_key).then(function(url) {

							// REAPPLY REMOVED PROPERTIES
							media_record.insensitive_media = data_to_reapply.insensitive_media;
							media_record.date_insensitive_media = data_to_reapply.date_insensitive_media;
							media_record.insensitive_media_by = data_to_reapply.insensitive_media_by;
							media_record.insensitive_media_reason = data_to_reapply.insensitive_media_reason;
							
							// CLEAN UP DATA TO REAPPLY
							data_to_reapply = null;

							media_record.url = url;

							$scope.$apply();

						}, function(error) {
							media_record.downloading_file = false;
							vm.utils.image_sensitivity_review.downloading_file = false;
							alert(error);
						});

					}, function(error) {
						media_record.downloading_file = false;
						vm.utils.image_sensitivity_review.downloading_file = false;
						alert(error);
					});
				},
				slideout: {
					show: function() {
						var el = document.getElementById('SensitiveMediaReviewAside');
	                    var bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(el);
	                    bsOffcanvas.show();
					},
					hide: function() {
						var el = document.getElementById('SensitiveMediaReviewAside');
	                    var bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(el);
	                    bsOffcanvas.hide();
					}
				},
				events: function() {

					$scope.$on("imageSensitivity::review", function(event, data) {

						// if( data.item_info.hasOwnProperty('directive_id') && data.item_info.directive_id == vm.utils.image_sensitivity_review.directive_id )

						// if( data.item_info.hasOwnProperty('directive_id') && vm.utils.image_sensitivity_review.directive_ids.indexOf(data.item_info.directive_id) !== -1 ) {

						// 	vm.utils.image_sensitivity_review.record_id = data.item_info.record_id;
						// 	vm.utils.image_sensitivity_review.record_type = data.item_info.record_type;

						// 	vm.utils.image_sensitivity_review.clipboard_item_info = angular.copy(data.item_info);

						// 	vm.utils.image_sensitivity_review.start();
						// }

						if( data.directive_id != 'risk_form' ) {
							return;
						}

						vm.utils.image_sensitivity_review.record_ids = data.record_ids;
						vm.utils.image_sensitivity_review.record_type = data.record_type;

						vm.utils.image_sensitivity_review.start();

					});

				}()
			}
		};

		$scope.$watch('vm.directive_id', function(newVal, oldVal){
			vm.utils.directive_id = vm.directive_id;
			console.log("RECIEVED RA DIRECTIVE ID");
			console.log(vm.utils.directive_id);
		});

		$scope.$watchCollection('vm.relations', function(newVal, oldVal){
			vm.utils.relations = vm.relations;
			console.log("RECEIEVED RELATIONS");
			console.log(vm.utils.relations);
		});

		$scope.$watch('vm.assessment_id', function(newVal, oldVal){

			if( !vm.assessment_id )
			{
				return;
			}

			vm.utils.assessment_id = vm.assessment_id;
			console.log("RECIEVED RA ID");
			console.log(vm.utils.assessment_id);

			vm.utils.tabs.changeTab('form');

			vm.utils.user_settings.getSettings().then(function() {

				vm.utils.hazard_utils.getAllData().then(function(){
					//START RECORD SETUP
					if( vm.utils.assessment_id == "NEW" )
					{
						vm.utils.newRiskRecord();
					}
					else
					{
						vm.utils.getRiskRecord(vm.utils.assessment_id).then(function(){
							vm.utils.hazard_utils.filterHazardOrigins(vm.utils.ra_record.hazard_type);
							vm.utils.hazard_utils.filterHazardConsequences(vm.utils.ra_record.hazard_type);

							vm.utils.risk_media.setRecord(vm.utils.ra_record);
							vm.utils.risk_media.getAllRecordAttachments(vm.utils.risk_media.record._id, 'assessment');
						});
					}
				});

			});

		});

		$scope.$on("assessmentForm::exit", function(event, data){

			if( data.directive_id != vm.utils.directive_id )
			{
				return;
			}

			setTimeout(function(){

				var inputFile = document.querySelector('#riskInputFile');
				var photoInput = document.querySelector('#riskPhotoInput');

				inputFile.replaceWith(inputFile.cloneNode(true));
				photoInput.replaceWith(photoInput.cloneNode(true));

				$rootScope.$broadcast("riskMatrix::destroy", { directive_id: 'HazardMatrixInitial' });
				$rootScope.$broadcast("riskMatrix::destroy", { directive_id: 'HazardMatrixAfter' });
				$rootScope.$broadcast("clipboard::destroy");

				$scope.$apply();
				$scope.$destroy();

			}, 0);

		});

		$scope.$on("clipboard::exit", function(event, data) {
			vm.utils.tabs.changeTab('images');
		});

		// vm.utils.user_settings.getSettings();
		vm.utils.risk_utils.getAllData();
	}

	function riskMatrixController($scope, $rootScope, riskMatrixFactory, authFactory)
	{
		var vm = this;

		// vm.directive_id = 'riskMatrix';

		// vm.co_ord = {
		// 	x: null,
		// 	y: null
		// };

		$scope.$on("riskMatrix::destroy", function(event, data){

			// alert("Destroy Scope?");

			if( data.directive_id != vm.directive_id )
			{
				return;
			}

			setTimeout(function(){
				$scope.$destroy();
			}, 0);

		});

		vm.selectGrid = function(value, score_label)
		{
			var data_set = {};
			value = value.split("-");

			vm.co_ord.x = parseInt( value[0] );
			vm.co_ord.y = parseInt( value[1] );

			data_set.x = parseInt( value[0] );
			data_set.x_label = riskMatrixFactory.getXLabel(data_set.x);
			data_set.y = parseInt( value[1] );
			data_set.y_label = riskMatrixFactory.getYLabel(data_set.y);
			data_set.score = riskMatrixFactory.calcScore(data_set.x, data_set.y);
			data_set.score_label = score_label;

			console.log("RISK MATRIX DATA SET");
			console.log( JSON.stringify(data_set) );

			var params = {
				directive_id: vm.directive_id,
				data_set: data_set
			};

			$rootScope.$broadcast('riskGrid::selected', params);
		}

		vm.gridActive = function(x, y)
		{
			var active = false;

			if( vm.co_ord.x == null || vm.co_ord.y == null )
			{
				return false;
			}

			if( parseInt(vm.co_ord.x) == parseInt(x) && parseInt(vm.co_ord.y) == parseInt(y) )
			{
				active = true;
			}

			return active;
		}

		vm.showXLabel = function(x_score)
		{
			return riskMatrixFactory.getXLabel(x_score);
		}

		vm.showYLabel = function(y_score)
		{
			return riskMatrixFactory.getYLabel(y_score);
		}
	}

	function rackingAssessmentMethodController($scope, $rootScope)
	{
		var vm = this;
		//vm.directiveid;
		//vm.scoredata = {};

		$scope.$watchCollection("vm.scoredata", function(newVal, oldVal){
			console.log("RECEVED RACKING SCORE");
			console.log(vm.scoredata);
		});

		vm.selectScore = function(score, phrase)
		{
			vm.scoredata = {
				score: score, 
				phrase: phrase
			};

			var event_data = {
				directive_id: vm.directiveid,
				score_data: {
					score: score,
					phrase: phrase
				}
			};

			$rootScope.$broadcast("rackingMethodScoreUpdated", event_data);
		}

		vm.scoreStyle = function(score, phrase)
		{
			var style = {};

			if( !vm.scoredata )
			{
				return style;
			}

			if( !vm.scoredata.hasOwnProperty('score') )
			{
				return style;
			}

			if( vm.scoredata.score == null )
			{
				return style;
			}

			if( parseInt(score) == parseInt(vm.scoredata.score) && phrase == vm.scoredata.phrase )
			{
				var style = {
					'background-color': '#fff',
					'border': '2px solid #ddd',
					'border-radius': '5px'
				};

				return style;
			}

			return style;
		}
	}

	function deteriorationAssessmentMethodController($scope, $rootScope)
	{
		var vm = this;
		//vm.directiveid;
		//vm.scoredata = {};

		$scope.$watchCollection("vm.scoredata", function(newVal, oldVal){
			console.log("RECEVED DETERIORATION SCORE");
			console.log(vm.scoredata);
		});

		vm.selectScore = function(score, phrase)
		{
			vm.scoredata = {
				score: score, 
				phrase: phrase
			};

			var event_data = {
				directive_id: vm.directiveid,
				score_data: {
					score: score,
					phrase: phrase
				}
			};

			$rootScope.$broadcast("deteriorationMethodScoreUpdated", event_data);
		}

		vm.scoreStyle = function(score, phrase)
		{
			var style = {};

			if( !vm.scoredata )
			{
				return style;
			}

			if( !vm.scoredata.hasOwnProperty('score') )
			{
				return style;
			}

			if( vm.scoredata.score == null )
			{
				return style;
			}

			if( parseInt(score) == parseInt(vm.scoredata.score) && phrase == vm.scoredata.phrase )
			{
				var style = {
					'background-color': '#fff',
					'border': '2px solid #ddd',
					'border-radius': '5px'
				};

				return style;
			}

			return style;
		}
	}

	function raFactory($q, $http, riskmachDatabasesFactory, authFactory, projectsAssetsFactory, rmUtilsFactory, modelsFactory, rmConnectivityFactory, mediaFactory)
	{
		var factory = {};

		factory.risk_methods = [{
			id: 1,
			name: 'PHA (Preliminary Hazard Analysis)'
		},{
			id: 2,
			name: 'Risk Matrix 5x5'
		},{
			id: 3,
			name: 'Simple Risk Rating'
		},{
			id: 4,
			name: 'RIA'
		},{
			id: 5,
			name: 'Racking'
		},{
			id: 6,
			name: 'Deterioration'
		}];

		factory.utils = {
			risk_method_key: {
				1: {
					name: 'PHA (Preliminary Hazard Analysis)',
					min: 0, 
					max: 13500
				},
				2: {
					name: 'Risk Matrix 5x5', 
					min: 0, 
					max: 25
				},
				3: {
					name: 'Simple Risk Rating', 
					min: 0, 
					max: 8
				},
				4: {
					name: 'RIA', 
					min: 0, 
					max: 18
				},
				5: {
					name: 'Racking', 
					min: 0, 
					max: 25
				},
				6: {
					name: 'Deterioration', 
					min: 0, 
					max: 25
				}
			},
			displayPhrase: function(assessment_record, stage) {
				// DEFAULT TO PHA PHRASES
				var display_before_phrase = assessment_record.hrn_phrase_name_initial;
				var display_after_phrase = assessment_record.hrn_phrase_name_after;

				// MATRIX
				if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 2 ) {
					display_before_phrase = assessment_record.matrix_score_phrase_initial;
					display_after_phrase = assessment_record.matrix_score_phrase_after;
				}

				// RIA
				if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 4 ) {
					display_before_phrase = assessment_record.ria_risk_level_initial;
					display_after_phrase = assessment_record.ria_risk_level_after;
				}

				// RACKING
				if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 5 ) {
					display_before_phrase = assessment_record.matrix_score_phrase_initial;
					display_after_phrase = null;
				}

				// DETERIORATION
				if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 6 ) {
					display_before_phrase = assessment_record.matrix_score_phrase_initial;
					display_after_phrase = 'Closed';
				}

				// SIMPLE
				if( assessment_record.hasOwnProperty('assessment_method') && assessment_record.assessment_method == 3 ) {
					display_before_phrase = assessment_record.simple_risk_phrase_initial;
					display_after_phrase = assessment_record.simple_risk_phrase_after;
				}

				if( stage == 'before' ) {
					return display_before_phrase;
				}

				if( stage == 'after' ) {
					return display_after_phrase;
				}
			},
			riskLevelStyle: function(risk, stage, current_theme) {
				var style = {
					'color': '#00435F'
				};

				var phrase = null;

				if( current_theme && current_theme == 'dark' ) {
					style['color'] = '#3b6cb3';
				}

				// PHA
				if( risk.hasOwnProperty('assessment_method') && risk.assessment_method == 1 ) {

					if( stage == 'before' ) {
						phrase = risk.hrn_phrase_name_initial;
					} else {
						phrase = risk.hrn_phrase_name_after;
					}

					if( !phrase || phrase == 'Negligible' || phrase == 'Very Low' || phrase == 'Low' ) {
						return style;
					}

					if( phrase == 'Significant' ) {
						style['color'] = '#F6A13E';
					}

					if( phrase == 'High' || phrase == 'Very High' || phrase == 'Extreme' || phrase == 'Unacceptable') {
						style['color'] = '#C24E4F';
					}

					return style;
				}
				// END PHA

				// SIMPLE
				if( risk.hasOwnProperty('assessment_method') && risk.assessment_method == 3 ) {

					if( stage == 'before' ) {
						phrase = risk.simple_risk_phrase_initial;
					} else {
						phrase = risk.simple_risk_phrase_after
					}

					if( !phrase || phrase == 'Acceptable' || phrase == 'Very Low' || phrase == 'Low' ) {
						return style;
					}

					if( phrase == 'Significant' ) {
						style['color'] = '#F6A13E';
					}

					if( phrase == 'High' || phrase == 'Very High' || phrase == 'Extreme' || phrase == 'Unacceptable') {
						style['color'] = '#C24E4F';
					}

					return style;
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
						return style;
					}

					if( phrase == 'Low' ) {
						style['color'] = '#00435F';
						}

					if( phrase == 'Medium' ) {
						style['color'] = '#ffc900';
					}

					if( phrase == 'High' ) {
						style['color'] = '#E68A01';
					}

					if( phrase == 'Very High' ) {
						style['color'] = '#ef473a';
					}

					return style;
				}
				// END MATRIX

				// DETERIORATION
				if( risk.hasOwnProperty('assessment_method') && risk.assessment_method == 6 ) {

					if( stage == 'before' ) {
						phrase = risk.matrix_score_phrase_initial;
					} else {
						phrase = 'Closed';
					}

					if( !phrase ) {
						style['color'] = '#dddddd';
					}

					if( phrase == 'Closed' ) {
						style['color'] = '#dddddd';
					}

					if( phrase == 'A' ) {
						style['color'] = '#019847';
					}

					if( phrase == 'B' ) {
						style['color'] = '#F6A13E';
					}

					if( phrase == 'C' ) {
						style['color'] = '#C24E4F';
					}

					return style;
				}
				// END DETERIORATION

				// RACKING
				if( risk.hasOwnProperty('assessment_method') && risk.assessment_method == 5 ) {

					if( stage == 'before' ) {
						phrase = risk.matrix_score_phrase_initial;
					}

					if( !phrase ) {
						style['color'] = '#dddddd';
					}

					if( phrase == 'Relevant Observation' ) {
						style['color'] = '#dddddd';
					}

					if( phrase == 'Surveillance' ) {
						style['color'] = '#019847';
					}

					if( phrase == 'Hazardous Damage' ) {
						style['color'] = '#F6A13E';
					}

					if( phrase == 'Very Serious Damage' ) {
						style['color'] = '#C24E4F';
					}

					return style;
				}
				// END RACKING

				// RIA
				if( risk.hasOwnProperty('assessment_method') && risk.assessment_method == 4 ) {

					if( stage == 'before' ) {
						phrase = risk.ria_risk_level_initial;
					} else {
						phrase = risk.ria_risk_level_after;
					}

					if( !phrase ) {
						style['color'] = '#dddddd';
					}

					if( phrase == 'Negligible' ) {
						style['color'] = '#00435F';
					}

					if( phrase == 'Low' ) {
						style['color'] = '#00435F';
					}

					if( phrase == 'Medium' ) {
						style['color'] = '#F6A13E';
					}

					if( phrase == 'Significant' ) {
						style['color'] = '#F6A13E';
					}

					if( phrase == 'High' ) {
						style['color'] = '#C24E4F';
					} 

					if( phrase == 'Very High' ) {
						style['color'] = '#C24E4F';
					}

					return style;
				}
				// END RIA

				return style;
			},
			report_risk_filters: {
				paginate: 'yes',
				page_num: 1,
				per_page: 15,
				general_search: null,
				activity_id: null,
				report_id: null,
				report_ref: null,
				job_number: null,
				client_id: null,
				asset_id: null,
				order_by: null,
				sort_by: null,
				assessment_id: null, 
				assessment_ref: null, 
				assessment_status: null, 
				site_id: null, 
				building_id: null, 
				area_id: null
			}, 
			formatReportRiskAssessments: function(data) {
				var i = 0;
				var len = data.length;
				while(i < len) {

					data[i] = modelsFactory.utils.formatRmRecordToModel('risk_assessment', data[i]);

					// // FORMAT STATUS
					// if( data[i].hasOwnProperty('status') && data[i].status ) {
					// 	data[i].status = parseInt(data[i].status);
					// }

					// // FORMAT ASSESSMENT METHOD
					// if( data[i].hasOwnProperty('assessment_method') && data[i].assessment_method ) {
					// 	data[i].assessment_method = parseInt(data[i].assessment_method);
					// }  

					if( data[i].status == 7 ) {
						data[i].reported_ra_status_name = 'Open';
					}

					if( data[i].status == 6 ) {
						data[i].reported_ra_status_name = 'Pending Review';
					}

					if( data[i].status == 10 ) {
						data[i].reported_ra_status_name = 'Closed';
					}

					i++;
				}
			},
			formatCloseoutAssessmentRecord: function(record) {

				record.user_id = authFactory.cloudUserId();
				record.company_id = authFactory.cloudCompanyId();

				record.is_closeout = 'Yes';
			
				record.record_modified = 'Yes';

				record.date_record_synced = new Date().getTime();
				record.date_content_synced = new Date().getTime();
				record.date_record_imported = new Date().getTime();
				record.date_content_imported = new Date().getTime();
			},
			updateRevisedRiskValues: function(assessment_record, cloud_risk) {
				// RM VALUES
				assessment_record.rm_id = cloud_risk.rm_id;
				assessment_record.rm_revision_number = cloud_risk.rm_revision_number;
				assessment_record.status = cloud_risk.status;
				assessment_record.status_name = cloud_risk.status_name;
				assessment_record.reported_ra_status_name = cloud_risk.reported_ra_status_name;

				assessment_record.control_description = cloud_risk.control_description;

				// PHA VALUES
				assessment_record.lo_after = cloud_risk.lo_after;
				assessment_record.lo_after_name = cloud_risk.lo_after_name;
				assessment_record.fe_after = cloud_risk.fe_after;
				assessment_record.fe_after_name = cloud_risk.fe_after_name;
				assessment_record.dph_after = cloud_risk.dph_after;
				assessment_record.dph_after_name = cloud_risk.dph_after_name;
				assessment_record.np_after = cloud_risk.np_after;
				assessment_record.np_after_name = cloud_risk.np_after_name;
				assessment_record.hrn_after = cloud_risk.hrn_after;
				assessment_record.hrn_phrase_after = cloud_risk.hrn_phrase_after;
				assessment_record.hrn_phrase_name_after = cloud_risk.hrn_phrase_name_after;

				// MATRIX VALUES
				assessment_record.matrix_consequence_after = cloud_risk.matrix_consequence_after;
				assessment_record.matrix_consequence_phrase_after = cloud_risk.matrix_consequence_phrase_after;
				assessment_record.matrix_likelihood_after = cloud_risk.matrix_likelihood_after;
				assessment_record.matrix_likelihood_phrase_after = cloud_risk.matrix_likelihood_phrase_after;
				assessment_record.matrix_score_after = cloud_risk.matrix_score_after;
				assessment_record.matrix_score_phrase_after = cloud_risk.matrix_score_phrase_after;

				assessment_record.is_deviation = cloud_risk.is_deviation;
				assessment_record.temporary_measure = cloud_risk.temporary_measure;
				assessment_record.temporary_measure_expiry = cloud_risk.temporary_measure_expiry;
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
				},
				formatRiskImages: function(media) {
					var formatted = [];

					var i = 0;
					var len = media.length;
					while(i < len) {

						var media_record = modelsFactory.models.newMediaRecord(null, 'assessment');

						media_record.file_downloaded = null;
						media_record.record_modified = 'No';

						media_record.file_name = media[i].FileName;
						media_record.file_size = media[i].FileSize;
						media_record.media_path = media[i].Path;
						media_record.title = media[i].Title;
						media_record.description = media[i].Description;
						media_record.status = media[i].Status;
						media_record.rm_id = media[i].RiskPhotoID;
						media_record.rm_ref = media[i].RiskPhotoID;
						media_record.rm_revision_number = 0;
						media_record.rm_record_item_id = media[i].RiskAssessmentID;
						media_record.added_by = media[i].AddedBy;
						media_record.modified_by = media[i].AddedBy;
						media_record.representative_image = media[i].RepresentativeImage;
						media_record.insensitive_media = media[i].InsensitiveMedia;
						media_record.insensitive_media_by = media[i].InsensitiveMediaBy;
						media_record.insensitive_media_reason = media[i].InsensitiveMediaReason;

						media_record.id = media[i].GUID;
						media_record.file_url = media[i].Path;

						if( media[i].UploadDate && media[i].UploadDate != '0000-00-00 00:00:00' ) {
							media_record.date_added = new Date(media[i].UploadDate).getTime();
							media_record.date_modified = new Date(media[i].UploadDate).getTime();
						}

						if( media[i].DateInsensitiveMedia && media[i].DateInsensitiveMedia != '0000-00-00 00:00:00' ) {
							media_record.date_insensitive_media = new Date(media[i].DateInsensitiveMedia);
						}

						formatted.push(media_record);
 
						i++;
					}

					return formatted;
				},
				formatCloseoutEvidenceFiles: function(media) {
					var formatted = [];

					var i = 0;
					var len = media.length;
					while(i < len) {

						var media_record = modelsFactory.models.newMediaRecord(null, 'ra_closeout_evidence');

						media_record.file_downloaded = null;
						media_record.record_modified = 'No';

						media_record.file_name = media[i].FileName;
						media_record.file_size = media[i].FileSize;
						media_record.media_path = media[i].FilePath;
						media_record.title = media[i].FileTitle;
						media_record.description = media[i].FileDescription;
						media_record.rm_revision_number = 0;
						media_record.file_url = media[i].FilePath;

						media_record.checked_by_name = media[i].CheckedByName;
						media_record.approval_message = media[i].ApprovalMessage;
						media_record.approval_status = media[i].ApprovalStatus;

						if( media[i].FileID ) {
							media_record.rm_id = parseInt(media[i].FileID);
							media_record.rm_ref = parseInt(media[i].FileID);
						}

						if( media[i].RAID ) {
							media_record.rm_record_item_id = parseInt(media[i].RAID);
						}

						if( media[i].Status ) {
							media_record.status = parseInt(media[i].Status);
						}

						if( media[i].SubmissionID ) {
							media_record.rm_submission_id = parseInt(media[i].SubmissionID);
						}

						if( media[i].SubmissionDate ) {
							media_record.submission_date = parseInt(media[i].SubmissionDate);
						}

						if( media[i].SubmissionReviewDate ) {
							media_record.submission_review_date = parseInt(media[i].SubmissionReviewDate);
						}

						if( media[i].UploadedBy ) {
							media_record.added_by = parseInt(media[i].UploadedBy);
						}

						if( media[i].ModifiedBy ) {
							media_record.modified_by = parseInt(media[i].ModifiedBy);
						}

						if( media[i].DateUploaded ) {
							media_record.date_added = parseInt(media[i].DateUploaded);
						}

						if( media[i].DateModified && media[i].DateModified != '0000-00-00 00:00:00' ) {
							media_record.date_modified = new Date(media[i].DateModified).getTime();
						}

						if( media[i].DateChecked ) {
							media_record.date_checked = parseInt(media[i].DateChecked);
						}

						formatted.push(media_record);
 
						i++;
					}

					return formatted;
				}
			}
		}

		factory.statutory_options = [{
			value: 'Yes',
			display: 'Statutory'
		},{
			value: 'No',
			display: 'Advisory'
		}];

		factory.requests = {
			reportRiskAssessments: function(filters) {
				var defer = $q.defer();

				if( !filters ) {
					defer.resolve();
					return defer.promise;
				}

				console.log("RISK FILTERS");
				console.log(filters);

				$http.post('https://system.riskmach.co.uk/laravel/public/webapp/v1/ReportedAssessments',{
					params: {
		        		filters: filters
		        	}
	            })
				.success(function(data, status, headers, config) {

					console.log("REPORT RISK ASSESSMENTS LISTING RESPONSE");
		       		console.log(data);

		        	if( data.error == true ) {
		        		defer.reject(data.error_messages[0]);
		        	} else {
		        		defer.resolve(data);
		        	};

	            })
	            .error(function(data, status, headers, config) {
	            	console.log("ERROR CONNECTING TO REPORT RISK ASSESSMENTS LISTING API");
		        	console.log(data);
		            defer.reject("Error connecting to API to fetch risk assessments");
				});

				return defer.promise;
			},
			riskMedia: function(assessment_id) {
				var defer = $q.defer();

				if( !assessment_id ) {
					defer.reject("No risk assessment identifier provided");
					return defer.promise;
				}

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/AssessmentImages',{
					params: {
		        		assessment_id: assessment_id
		        	}
	            })
				.success(function(data, status, headers, config) {

					console.log("RISK MEDIA RESPONSE");
		       		console.log(data);

		        	if( data.error == true ) {
		        		defer.reject(data.error_messages[0]);
		        	} else {
		        		var formatted_images = factory.utils.media_records.formatRiskImages(data.images);
		        		defer.resolve(formatted_images);
		        	};

	            })
	            .error(function(data, status, headers, config) {
	            	console.log("ERROR CONNECTING TO RISK MEDIA API");
		        	console.log(data);
		            defer.reject("Error connecting to API to fetch risk assessment images");
				});

				return defer.promise;
			},
			closeoutEvidence: function(assessment_id) {
				var defer = $q.defer();

				if( !assessment_id ) {
					defer.reject("No risk assessment identifier provided");
					return defer.promise;
				}

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/CloseoutImages',{
					params: {
		        		assessment_id: assessment_id
		        	}
	            })
				.success(function(data, status, headers, config) {

					console.log("CLOSEOUT EVIDENCE RESPONSE");
		       		console.log(data);

		        	if( data.error == true ) {
		        		defer.reject(data.error_messages[0]);
		        	} else {
		        		var formatted_images = factory.utils.media_records.formatCloseoutEvidenceFiles(data.flat_images);
		        		defer.resolve(formatted_images);
		        	};

	            })
	            .error(function(data, status, headers, config) {
	            	console.log("ERROR CONNECTING TO RISK CLOSEOUT EVIDENCE API");
		        	console.log(data);
		            defer.reject("Error connecting to API to fetch risk closeout evidence");
				});

				return defer.promise;
			},
			closeoutAssessmentRecord: function(assessment_id, date_closed, no_evidence_reason) {
				var defer = $q.defer();

				$http.post('https://system.riskmach.co.uk/laravel/public/webapp/v1/CloseoutAssessment',{
					params: {
		        		assessment_id: assessment_id,  
		        		date_closed: date_closed, 
		        		no_evidence_reason: no_evidence_reason
		        	}
	            })
				.success(function(data, status, headers, config) {

					console.log("REPORT RISK ASSESSMENT CLOSEOUT RESPONSE");
		       		console.log(data);

		        	if( data.error == true ) {
		        		defer.reject(data.error_messages[0]);
		        	} else {
		        		defer.resolve(data);
		        	};

	            })
	            .error(function(data, status, headers, config) {
	            	console.log("ERROR CONNECTING TO REPORT RISK CLOSEOUT API");
		        	console.log(data);
		            defer.reject("Error connecting to API to closeout risk assessment");
				});

				return defer.promise;
			},
			reviseCloseoutAssessment: function(assessment_id, revision_info) {
				var defer = $q.defer();

				$http.post('https://system.riskmach.co.uk/laravel/public/webapp/v1/ReviseCloseoutAssessment',{
					params: {
		        		assessment_id: assessment_id,  
		        		revision_info: revision_info
		        	}
	            })
				.success(function(data, status, headers, config) {

					console.log("REVISE CLOSEOUT RISK ASSESSMENT RESPONSE");
		       		console.log(data);

		        	if( data.error == true ) {
		        		defer.reject(data.error_messages[0]);
		        	} else {
		        		defer.resolve(data);
		        	};

	            })
	            .error(function(data, status, headers, config) {
	            	console.log("ERROR CONNECTING TO REVISE CLOSEOUT RISK ASSESSMENT API");
		        	console.log(data);
		            defer.reject("Error connecting to API to revise risk assessment");
				});

				return defer.promise;
			},
			uploadCloseoutEvidenceReview: function(file_id, approval_status, approval_message) {
				var defer = $q.defer();

				$http.post('https://system.riskmach.co.uk/laravel/public/webapp/v1/ActionCloseoutEvidence',{
					params: {
						approval_info: {
			        		file_id: file_id, 
			        		status: approval_status, 
			        		message: approval_message
			        	}
					}
	            })
				.success(function(data, status, headers, config) {

					console.log("REVIEW CLOSEOUT EVIDENCE RESPONSE");
		       		console.log(data);

		        	if( data.error == true ) {
		        		defer.reject(data.error_messages[0]);
		        	} else {
		        		defer.resolve(data);
		        	};

	            })
	            .error(function(data, status, headers, config) {
	            	console.log("ERROR CONNECTING TO REVIEW CLOSEOUT EVIDENCE API");
		        	console.log(data);
		            defer.reject("Error connecting to API to review closeout evidence");
				});

				return defer.promise;
			},
			reviewRiskCloseout: function(review_info, status) {
				var defer = $q.defer();

				$http.post('https://system.riskmach.co.uk/laravel/public/webapp/v1/ApproveAssessmentCloseout',{
					params: {
						assessment_id: review_info.assessment_id, 
						approved: status, 
						description: review_info.description
					}
	            })
				.success(function(data, status, headers, config) {

					console.log("REVIEW RISK CLOSEOUT RESPONSE");
		       		console.log(data);

		        	if( data.error == true ) {
		        		defer.reject(data.error_messages[0]);
		        	} else {
		        		defer.resolve(data);
		        	};

	            })
	            .error(function(data, status, headers, config) {
	            	console.log("ERROR CONNECTING TO REVIEW RISK CLOSEOUT API");
		        	console.log(data);
		            defer.reject("Error connecting to API to review risk closeout");
				});

				return defer.promise;
			},
			riskAssessmentPermissions: function(assessment_id) {
				var defer = $q.defer();

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/CheckUserAssessmentPermissions',{
					params: {
		        		assessment_id: assessment_id
		        	}
	            })
				.success(function(data, status, headers, config) {

					console.log("RISK ASSESSMENT PERMISSIONS RESPONSE");
		       		console.log(data);

		        	if( data.error == true ) {
		        		defer.reject(data.error_messages[0]);
		        	} else {
		        		defer.resolve(data);
		        	};

	            })
	            .error(function(data, status, headers, config) {
	            	console.log("ERROR CONNECTING TO RISK ASSESSMENT PERMISSIONS API");
		        	console.log(data);
		            defer.reject("Error connecting to API to fetch risk assessment permissions");
				});

				return defer.promise;
			}
		}

		factory.report_risks = {
			requestData: function(filters) {
				var defer = $q.defer();

				factory.requests.reportRiskAssessments(filters).then(function(data) {

					factory.utils.formatReportRiskAssessments(data.data);

					defer.resolve(data);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getDraftRiskCloseouts: function(filters) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var options = {
					limit: 100,
					include_docs: true
				}

				var db = riskmachDatabasesFactory.databases.collection.assessments;

				var closeouts = [];

				var page_num = 0;

				fetchNextPage(fetch_defer).then(function() {

					console.log("GOT LOCAL DRAFT RISK CLOSEOUTS");
					console.log(closeouts);

					defer.resolve(closeouts);
				}, function(error) {
					defer.reject(error);
				});

				function fetchNextPage(defer) 
				{
					page_num++;
					console.log("RISK CLOSEOUT PAGE: " + page_num);

					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) 
						{
							var i = 0;
							var len = result.rows.length;

							while(i < len) {
								var errors = 0;

								// USER ID
								if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								// COMPANY ID
								if( !result.rows[i].doc.hasOwnProperty('company_id') || result.rows[i].doc.company_id != authFactory.cloudCompanyId() ) {
									errors++;
								}

								// IS CLOSEOUT
								if( !result.rows[i].doc.hasOwnProperty('is_closeout') || result.rows[i].doc.is_closeout != 'Yes' ) {
									errors++;
								}

								// ASSET FILTER
								if( filters.hasOwnProperty('asset_id') && filters.asset_id ) {

									if( (!result.rows[i].doc.hasOwnProperty('rm_asset_id') && !result.rows[i].doc.hasOwnProperty('rm_register_asset_id')) || (result.rows[i].doc.rm_asset_id != filters.asset_id && result.rows[i].doc.rm_register_asset_id != filters.asset_id) ) {
										errors++;
									}

								}

								// REPORT FILTER
								if( filters.hasOwnProperty('report_ref') && filters.report_ref ) {

									if( !result.rows[i].doc.hasOwnProperty('rm_report_ref') || result.rows[i].doc.rm_report_ref != filters.report_ref ) {
										errors++;
									}

								}

								// RISK ID FILTER
								if( filters.hasOwnProperty('rm_risk_id') && filters.rm_risk_id ) {

									if( !result.rows[i].doc.hasOwnProperty('rm_id') || result.rows[i].doc.rm_id != filters.rm_risk_id ) {
										errors++;
									}

								}

								// RISK REF FILTER
								if( filters.hasOwnProperty('rm_risk_ref') && filters.rm_risk_ref ) {

									if( !result.rows[i].doc.hasOwnProperty('rm_ref') || result.rows[i].doc.rm_ref != filters.rm_risk_ref ) {
										errors++;
									} 

								}

								if( !errors ) {
									closeouts.push(result.rows[i].doc);
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

		factory.dbUtils = {
			assessments: {
				getRiskRecord: function(assessment_id) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.assessments;

					db.get(assessment_id).then(function(assessment_doc) {
						defer.resolve(assessment_doc);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveCloseoutAssessmentRecord: function(assessment_record, existing_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					assessment_record = modelsFactory.utils.formatRmRecordToModel('risk_assessment', assessment_record);

					// SET VALUES FOR SYNC
					// assessment_record = factory.utils.setSyncValues(assessment_record);

					// FORMAT ANY ANOMALIES
					factory.utils.formatCloseoutAssessmentRecord(assessment_record);

					if( existing_record == null ) {
						
						factory.dbUtils.assessments.saveNewCloseoutAssessmentRecord(assessment_record).then(function(saved_assessment) {
							defer.resolve(saved_assessment);
						}, function(error) {
							defer.reject(error);
						});

					} else {
						
						factory.dbUtils.assessments.updateCloseoutAssessmentRecord(assessment_record, existing_record).then(function(saved_assessment) {
							defer.resolve(saved_assessment);
						}, function(error) {
							defer.reject(error);
						});

					}

					return defer.promise;
				},
				saveNewCloseoutAssessmentRecord: function(assessment_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};
					
					// SET RM OBJECT
					var rm_record = angular.copy(assessment_record);
					assessment_record.rm_record = rm_record;

					riskmachDatabasesFactory.databases.collection.assessments.post(assessment_record, options).then(function(saved_record) {
						assessment_record._id = saved_record.id;
						assessment_record._rev = saved_record.rev;

						console.log("SAVED CLOSEOUT ASSESSMENT RECORD");

						defer.resolve(assessment_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateCloseoutAssessmentRecord: function(assessment_record, existing_record) {
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

							console.log("CLOSEOUT ASSESSMENT RECORD UPDATED ENTIRELY");

							defer.resolve(assessment_record);
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
						if( assessment_record.date_modified > existing_record.date_modified ) {
							existing_record.rm_record_modified = 'Yes';
						};

						existing_record.rm_id = assessment_record.rm_id;
						existing_record.rm_revision_number = assessment_record.rm_revision_number;
						existing_record.status = assessment_record.status;
						existing_record.status_name = assessment_record.status_name;

						// CLEAR OLD RM RECORD
						existing_record.rm_record = null;

						// SET RM RECORD OBJECT
						var rm_record = angular.copy(assessment_record);
						existing_record.rm_record = rm_record;

						db.post(existing_record, options).then(function(saved_record) {
							existing_record._id = saved_record.id;
							existing_record._rev = saved_record.rev;

							console.log("CLOSEOUT ASSESSMENT UPDATED");

							defer.resolve(existing_record);
						}).catch(function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				markRiskCloseoutRecordModified: function(assessment_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.assessments;

					// ONLY MARK AS NOT IMPORTED - RECORD IS NOT SYNCED TO MID TABLE
					assessment_record.date_record_imported = null;
					assessment_record.date_content_imported = null;
					assessment_record.record_modified = 'Yes';

					db.put(assessment_record).then(function(result) {
						assessment_record._id = result.id;
						assessment_record._rev = result.rev;

						defer.resolve();

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				markRiskAssessmentImportComplete: function(assessment_record, result) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.assessments;

					assessment_record.date_record_synced = new Date().getTime();
					assessment_record.date_content_synced = new Date().getTime();
					assessment_record.date_record_imported = new Date().getTime();
					assessment_record.date_content_imported = new Date().getTime();
					assessment_record.record_modified = 'No';

					assessment_record.submit_for_review_info = null;
					assessment_record.intended_closeout_action = null;

					db.put(assessment_record).then(function(result) {
						assessment_record._id = result.id;
						assessment_record._rev = result.rev;

						defer.resolve();
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateRevisedRiskAssessment: function(assessment_record, cloud_risk) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.assessments;

					assessment_record.date_record_synced = new Date().getTime();
					assessment_record.date_content_synced = new Date().getTime();
					assessment_record.date_record_imported = new Date().getTime();
					assessment_record.date_content_imported = new Date().getTime();
					assessment_record.record_modified = 'No';

					assessment_record.intended_closeout_action = null
					assessment_record.revision_info = null;

					factory.utils.updateRevisedRiskValues(assessment_record, cloud_risk);

					db.put(assessment_record).then(function(result) {
						assessment_record._id = result.id;
						assessment_record._rev = result.rev;

						defer.resolve();
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveReviewedRiskCloseout: function(risk_record) {
					var defer = $q.defer();
					var db = riskmachDatabasesFactory.databases.collection.assessments;

					risk_record.date_record_synced = new Date().getTime();
					risk_record.date_content_synced = new Date().getTime();
					risk_record.date_record_imported = new Date().getTime();
					risk_record.date_content_imported = new Date().getTime();
					risk_record.record_modified = 'No';

					risk_record.intended_closeout_action = null;
					risk_record.review_info = null;

					db.put(risk_record).then(function(result) {

						risk_record._id = result.id;
						risk_record._rev = result.rev;

						defer.resolve();

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveCloseoutAssessmentRecordFromProjectRa: function(risk_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.assessments;

					var risk_to_save = angular.copy(risk_record);

					// CLEAR DB IDENTIFIERS
					risk_to_save._id = null;
					risk_to_save._rev = null;

					risk_to_save.activity_id = null;
					risk_to_save.asset_id = null;

					if( risk_record.hasOwnProperty('downloaded_rm_values') && risk_record.downloaded_rm_values ) {
						risk_to_save.rm_id = risk_record.downloaded_rm_values.rm_id;
						risk_to_save.rm_ref = risk_record.downloaded_rm_values.rm_ref;
						risk_to_save.rm_revision_number = risk_record.downloaded_rm_values.rm_revision_number;
						risk_to_save.rm_activity_id = risk_record.downloaded_rm_values.rm_activity_id;
						risk_to_save.rm_asset_id = risk_record.downloaded_rm_values.rm_asset_id;
						risk_to_save.status = risk_record.downloaded_rm_values.status;
						risk_to_save.status_name = risk_record.downloaded_rm_values.status_name;

						// CLEAR DOWNLOADED RM VALUES PROPERTY
						risk_to_save.downloaded_rm_values = null;
					}

					if( risk_to_save.status == 7 ) {
						risk_to_save.reported_ra_status_name = 'Open';
					}

					if( risk_to_save.status == 6 ) {
						risk_to_save.reported_ra_status_name = 'Pending Review';
					}

					if( risk_to_save.status == 10 ) {
						risk_to_save.reported_ra_status_name = 'Closed';
					}

					// FORMAT ANY ANOMALIES
					factory.utils.formatCloseoutAssessmentRecord(risk_to_save);

					db.post(risk_to_save, {force: true}).then(function(result) {

						risk_to_save._id = result.id;
						risk_to_save._rev = result.rev;

						defer.resolve(risk_to_save);

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			media_records: {
				saveCloseoutAssessmentMedia: function(media, record_id) {
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

						factory.dbUtils.media_records.saveCloseoutAssessmentMediaRecord(media[active_index]).then(function() {

							active_index++;
							saveNextMedia(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				saveCloseoutAssessmentEvidence: function(media, record_id) {
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
						media[active_index].record_type = 'ra_closeout_evidence';

						factory.dbUtils.media_records.saveCloseoutAssessmentMediaRecord(media[active_index]).then(function() {

							active_index++;
							saveNextMedia(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				saveCloseoutAssessmentMediaRecord: function(media_record) {
					var defer = $q.defer();

					// ADD MODEL KEYS AND FORMAT
					media_record = modelsFactory.utils.formatRmRecordToModel('media_record', media_record);

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
							factory.dbUtils.media_records.saveNewCloseoutAssessmentMediaRecord(media_record).then(function(saved_media) {
								defer.resolve(saved_media);
							}, function(error) {
								defer.reject(error);
							});
						} else {
							factory.dbUtils.media_records.updateCloseoutAssessmentMediaRecord(media_record, existing_record).then(function(saved_media) {
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
				saveNewCloseoutAssessmentMediaRecord: function(media_record) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					// SET RM ID FOR IMPORTING, FETCHES EXISTING CLOUD IMAGE FILE
					media_record.file_download_rm_id = media_record.rm_id;

					// SET RM OBJECT
					var rm_record = angular.copy(media_record);
					media_record.rm_record = rm_record;

					console.log("CLOSEOUT ASSESSMENT MEDIA RECORD FOR SAVE");
					console.log(JSON.stringify(media_record, null, 2));

					riskmachDatabasesFactory.databases.collection.media.post(media_record, options).then(function(saved_record) {

						media_record._id = saved_record.id;
						media_record._rev = saved_record.rev;

						console.log("SAVED CLOSEOUT ASSESSMENT NEW MEDIA RECORD");

						defer.resolve(media_record);
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				updateCloseoutAssessmentMediaRecord: function(media_record, existing_record) {
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

							console.log("CLOSEOUT ASSESSMENT MEDIA RECORD UPDATED ENTIRELY");

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

							console.log("CLOSEOUT ASSESSMENT MEDIA RM RECORD UPDATED");

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
				markCloseoutEvidenceImported: function(record, result) {
					var defer = $q.defer();

					// UPDATE IMPORT VALUES
					record.date_record_synced = new Date().getTime();
					record.date_content_synced = new Date().getTime();
					record.date_record_imported = new Date().getTime();
					record.date_content_imported = new Date().getTime();
					record.record_modified = 'No';

					record.intended_closeout_action = null;

					// IF NO RESULT, DELETE
					if( !result.hasOwnProperty('evidence_record') || result.evidence_record == null ) {
						record.status = 2;

						riskmachDatabasesFactory.databases.collection.media.put(record).then(function(up_result){
							record._id = up_result.id;
							record._rev = up_result.rev;
							defer.resolve(record);
							console.log("UPDATED IMPORT CLOSEOUT EVIDENCE RESULT");
						}).catch(function(error){
							console.log("ERROR UPDATING IMPORT CLOSEOUT EVIDENCE RESULT: " + error);
							defer.reject(error);
						});

						return defer.promise;
					}

					// UPDATE RM VALUES
					record.rm_id = parseInt(result.evidence_record.RACloseoutFileID);
					record.rm_ref = parseInt(result.evidence_record.RACloseoutFileID);
					record.rm_revision_number = 0;
					record.rm_record_item_id = parseInt(result.evidence_record.RAID);

					// SET CLOUD MEDIA PATH
					// record.media_path = result.media_path;
					
					record.file_download_rm_id = parseInt(result.evidence_record.RACloseoutFileID);

					// SET RM RECORD
					record.rm_record = null;
					var rm_record = angular.copy(record);
					record.rm_record = rm_record;
					record.rm_record_modified = 'No';

					riskmachDatabasesFactory.databases.collection.media.put(record).then(function(up_result){
						record._id = up_result.id;
						record._rev = up_result.rev;
						defer.resolve(record);
						console.log("UPDATED IMPORT CLOSEOUT EVIDENCE RESULT");
					}).catch(function(error){
						console.log("ERROR UPDATING IMPORT CLOSEOUT EVIDENCE RESULT: " + error);
						defer.reject(error);
					});

					return defer.promise;
				},
				cloneMediaToCloseoutAssessmentRecord: function(media, risk_record) {
					var defer = $q.defer();
					var clone_defer = $q.defer();

					if( !media.length ) {
						defer.resolve();
						return defer.promise;
					}

					cloneMediaRecord(clone_defer, 0).then(function() {
						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					function cloneMediaRecord(defer, active_index) {

						if( active_index > media.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						factory.dbUtils.media_records.cloneMediaRecordToCloseoutAssessmentRecord(media[active_index], risk_record).then(function() {

							active_index++;

							cloneMediaRecord(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;	
				},
				cloneMediaRecordToCloseoutAssessmentRecord: function(media_record, risk_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.media;

					var new_media_record = angular.copy(media_record);
					new_media_record._id = null;
					new_media_record._rev = null;
					new_media_record.downloaded_rm_values = null;

					if( media_record.hasOwnProperty('downloaded_rm_values') && media_record.downloaded_rm_values ) {
						new_media_record.rm_id = media_record.downloaded_rm_values.rm_id;
						new_media_record.rm_ref = media_record.downloaded_rm_values.rm_ref;
						new_media_record.rm_revision_number = media_record.downloaded_rm_values.rm_revision_number;
						new_media_record.rm_record_item_id = media_record.downloaded_rm_values.rm_record_item_id;
						new_media_record.rm_record_item_ref = media_record.downloaded_rm_values.rm_record_item_ref;
						new_media_record.rm_video_id = media_record.downloaded_rm_values.rm_video_id;
						new_media_record.rm_video_ref = media_record.downloaded_rm_values.rm_video_ref;
						new_media_record.rm_activity_id = media_record.downloaded_rm_values.rm_activity_id;
					}

					new_media_record.record_id = risk_record._id;

					db.post(new_media_record, {force: true}).then(function(result) {

						new_media_record._id = result.id;
						new_media_record._rev = result.rev;

						// IF FILE NOT PRESENT, DON'T CLONE
						if( new_media_record.file_downloaded == null ) {
							defer.resolve(new_media_record);
							return defer.promise;
						}

						// IF MEDIA HAS NO FILE
						if( new_media_record.file_does_not_exist ) {
							defer.resolve(new_media_record);
							return defer.promise;
						}

						factory.dbUtils.media_records.cloneMediaFile(media_record._id, media_record.attachment_key, new_media_record).then(function() {
							defer.resolve(new_media_record);
						}, function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				cloneMediaFile: function(src_media_id, src_attachment_key, new_media) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.media;

					//MOVE THE PHYSICAL FILE TO NEW MEDIA RECORD
					db.getAttachment(src_media_id, src_attachment_key).then(function(blob) {

						db.putAttachment(new_media._id, src_attachment_key, new_media._rev, blob, blob.type).then(function(media_result) {

							new_media._id = media_result.id;
							new_media._rev = media_result.rev;

							// CLEAN UP
							new_file = null;
							blob = null;

							defer.resolve(new_media);

						}).catch(function(error) {
							console.log(error);
							defer.reject("Error cloning media file: " + error);
						});

					}).catch(function(error) {
						console.log(error);
						defer.reject(error);
					});

					return defer.promise;
				}, 
				updateInitialCloseoutEvidenceSyncValues: function(media_record) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.media;

					media_record.date_record_synced = new Date().getTime();
					media_record.date_content_synced = new Date().getTime();

					db.put(media_record).then(function(result) {

						media_record._id = result.id;
						media_record._rev = result.rev;

						defer.resolve();

					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			projects: {
				updateActionedRiskMeta: function(project_record, risk_record, action) {
					var defer = $q.defer();

					if( !project_record.hasOwnProperty('actioned_ra_meta') || !project_record.actioned_ra_meta ) {
						project_record.actioned_ra_meta = [];
					}

					var ra_meta = {
						app_id: risk_record._id, 
						app_rev: risk_record._rev, 
						rm_id: risk_record.rm_id, 
						rm_ref: risk_record.rm_ref, 
						action: action
					}

					var i = 0;
					var len = project_record.actioned_ra_meta.length;
					var existing_index = null;
					while(i < len) {

						// IF RA META ALREADY EXISTS
						if( project_record.actioned_ra_meta[i].rm_ref == ra_meta.rm_ref ) {
							existing_index = i;
						}

						i++;
					}

					if( existing_index != null ) {
						// UPDATE EXISTING RA META
						project_record.actioned_ra_meta[existing_index] = ra_meta;
					} else {
						// ADD NEW RA META
						project_record.actioned_ra_meta.push(ra_meta);
					}

					var db = riskmachDatabasesFactory.databases.collection.projects;

					db.put(project_record).then(function(result) {
						project_record._id = result.id;
						project_record._rev = result.rev;
						
						defer.resolve();
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			}
		}

		factory.calcHrn = function(lo, fe, np, dph, hrn_phrases){
			var hrn_data = {
				score: null,
				phrase_name: null,
				phrase_id: null
			};

			if( lo == null || fe == null || np == null || dph == null )
			{
				return hrn_data;
			}

			//CALC SCORE
			hrn_data.score = parseFloat(lo) * parseFloat(fe) * parseFloat(np) * parseFloat(dph);
			hrn_data.score = parseFloat( hrn_data.score );

			if( hrn_data.score == 0 )
			{
				hrn_data.phrase_name = 'Not Reasonably Foreseeable';
				hrn_data.phrase_id = 9;
			}
			else
			{
				angular.forEach(hrn_phrases, function(hrn_record, hrn_index){

					if( hrn_data.score > parseFloat(hrn_record.Lower) && hrn_data.score <= parseFloat(hrn_record.Upper) )
					{
						hrn_data.phrase_name = hrn_record.Phrase;
						hrn_data.phrase_id = hrn_record.PhraseID;
					}

				});
			}

			return hrn_data;
		}

		factory.saveAssessment = function(ra_record)
		{
			var defer = $q.defer();

			ra_record.date_modified = new Date().getTime();

			rmUtilsFactory.sync_decoration.assessments.riskAssessmentModified(ra_record).then(function(modified_assessment) {

				ra_record = modified_assessment;

				// REMOVE QC PROPERTY IF PRESENT
				if( ra_record.hasOwnProperty('qc') ) {

					// MARK AS QC MODIFIED
					ra_record.qc_modified = 'Yes';

					delete ra_record.qc;
				}

				// IF SUGGESTED RISK, SET TO DRAFT
				if( ra_record.hasOwnProperty('is_suggested_risk') && ra_record.is_suggested_risk == 'Yes' ) {
					ra_record.status = 4;
					ra_record.status_name = 'Draft';
				}

				// CALCULATE UNIVERSAL RISK RATING HERE
				factory.setUniversalRiskRating(ra_record);

				//SAVE NEW
				if( !ra_record.hasOwnProperty('_id') || !ra_record._id )
				{
					console.log("SAVE NEW RISK RECORD");

					riskmachDatabasesFactory.databases.collection.assessments.post(ra_record, { force: true }).then(function(result){
						ra_record._id = result.id;
						ra_record._rev = result.rev;
						defer.resolve(ra_record);
					}).catch(function(error){
						defer.reject("Error saving the new assessment record" + error);
					});
				}
				else
				{
					console.log("UPDATE EXISTING RISK RECORD");

					//UPDATE EXISTING RECORD
					riskmachDatabasesFactory.databases.collection.assessments.put(ra_record).then(function(result){
						ra_record._id = result.id;
						ra_record._rev = result.rev;
						defer.resolve(ra_record);
					}).catch(function(error){
						defer.reject("Error updating the assessment record" + error);
					});
				}

			}, function(error) {
				defer.reject("Error modifiying assessment");
			});

			return defer.promise;
		}

		factory.saveRaQuestionRelation = function(relation_record)
		{
			var defer = $q.defer();

			if( !relation_record.hasOwnProperty('is_uaudit') || relation_record.is_uaudit != 'Yes' ) {

				//FIND THE EXISTING RELATIONSHIP RECORD
				riskmachDatabasesFactory.databases.collection.ra_question_relations.find({
					selector: {
						question_record_id: relation_record.question_record_id,
						assessment_id: relation_record.assessment_id,
						checklist_record_id: relation_record.checklist_record_id
					}
				}).then(function(find_result){

					rmUtilsFactory.sync_decoration.ra_question_relations.raQuestionRelationModified(relation_record).then(function(modified_relation) {

						//IF FOUND UPDATE
						if( find_result.docs.length > 0 )
						{
							console.log("FOUND EXISTING RA QUESTION RELATION");
							relation_record._id = find_result.docs[0]._id;
							relation_record._rev = find_result.docs[0]._rev;
							relation_record.date_linked = new Date().getTime();
							
							riskmachDatabasesFactory.databases.collection.ra_question_relations.put(relation_record).then(function(result){
								relation_record._id = result.id;
								relation_record._rev = result.rev;
								defer.resolve(relation_record);
							}).catch(function(error){
								defer.reject("Error updating the assessment question relation: " + error);
							});
						}
						else
						{
							console.log("DIDNT FIND EXISTING RA QUESTION RELATION");
							//IF NOT FOUND CREATE NEW
							riskmachDatabasesFactory.databases.collection.ra_question_relations.post(relation_record, { force: true }).then(function(result){
								relation_record._id = result.id;
								relation_record._rev = result.rev;
								defer.resolve(relation_record);
							}).catch(function(error){
								defer.reject("Error creating the assessment question relation: " + error);
							});
						}

					}, function(error) {
						console.log("ERROR MODIFIED RA QUESTION RELATION");
						defer.reject(error);
					});

				}).catch(function(error){
					defer.reject(error);
				});

			} else {

				//FIND THE EXISTING RELATIONSHIP RECORD
				riskmachDatabasesFactory.databases.collection.ra_question_relations.find({
					selector: {
						assessment_id: relation_record.assessment_id,
						checklist_record_id: relation_record.checklist_record_id
					}
				}).then(function(ra_relations) {

					var filtered_relations = [];
					var i = 0;
					var len = ra_relations.docs.length;
					while(i < len) {
						if( ra_relations.docs[i].hasOwnProperty('question_record_uuid') && ra_relations.docs[i].question_record_uuid == relation_record.question_record_uuid ) {
							filtered_relations.push(ra_relations.docs[i]);
						} 

						i++;
					}

					rmUtilsFactory.sync_decoration.ra_question_relations.raQuestionRelationModified(relation_record).then(function() {

						// IF EXISTING RELATION
						if( filtered_relations.length > 0 ) {
							
							relation_record._id = filtered_relations[0]._id;
							relation_record._rev = filtered_relations[0]._rev;
							relation_record.date_linked = new Date().getTime();

							riskmachDatabasesFactory.databases.collection.ra_question_relations.put(relation_record).then(function(result) {
								relation_record._id = result.id;
								relation_record._rev = result.rev;

								// CLEAN UP
								ra_relations = null;
								filtered_relations = null;

								defer.resolve(relation_record);

							}).catch(function(error) {
								defer.reject(error);
							});

						} else {

							riskmachDatabasesFactory.databases.collection.ra_question_relations.post(relation_record, {force: true}).then(function(result) {
								relation_record._id = result.id;
								relation_record._rev = result.rev;

								// CLEAN UP
								ra_relations = null;
								filtered_relations = null;

								defer.resolve(relation_record);

							}).catch(function(error) {
								defer.reject(error);
							});

						}

					}, function(error) {
						console.log("ERROR MODIFIED RA QUESTION RELATION");
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});	

			}

			return defer.promise;
		}

		factory.saveControlItem = function(record)
		{
			var defer = $q.defer();

			record.date_modified = new Date().getTime();

			rmUtilsFactory.sync_decoration.mr_controls.mrControlModified(record).then(function(modified_control) {

				record = modified_control;

				//SAVE NEW
				if( !record.hasOwnProperty('_id') || !record._id )
				{
					console.log("SAVE NEW CONTROL ITEM RECORD");

					riskmachDatabasesFactory.databases.collection.mr_controls.post(record, { force: true }).then(function(result){
						record._id = result.id;
						record._rev = result.rev;

						factory.saveControlRecordAsset(record).then(function(record){
							defer.resolve(record);
						}, function(error){
							defer.reject(error);
						});

					}).catch(function(error){
						defer.reject("Error saving the new control item record" + error);
					});
				}
				else
				{
					console.log("UPDATE EXISTING CONTROL ITEM RECORD");

					//UPDATE EXISTING RECORD
					riskmachDatabasesFactory.databases.collection.mr_controls.put(record).then(function(result){
						record._id = result.id;
						record._rev = result.rev;

						factory.saveControlRecordAsset(record).then(function(record){
							defer.resolve(record);
						}, function(error){
							defer.reject(error);
						});

					}).catch(function(error){
						defer.reject("Error updating the control item record" + error);
					});
				}

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.saveControlItemAssessmentRelation = function(relation_record)
		{
			var defer = $q.defer();
			//FIND THE EXISTING RELATIONSHIP RECORD
			riskmachDatabasesFactory.databases.collection.ra_control_item_relations.find({
				selector: {
					assessment_id: relation_record.assessment_id,
					control_item_id: relation_record.control_item_id
				}
			}).then(function(find_result){

				relation_record = rmUtilsFactory.sync_decoration.ra_control_relations.raControlRelationModified(relation_record);

				//IF FOUND UPDATE
				if( find_result.docs.length > 0 )
				{
					console.log("FOUND EXISTING RA CONTROL ITEM RELATION");
					existing_record = find_result.docs[0];
					existing_record.status = relation_record.status;
					existing_record.date_linked = new Date().getTime();
					
					riskmachDatabasesFactory.databases.collection.ra_control_item_relations.put(existing_record).then(function(result){
						existing_record._id = result.id;
						existing_record._rev = result.rev;
						defer.resolve(existing_record);
					}).catch(function(error){
						defer.reject("Error updating the assessment control item relation: " + error);
					});
				}
				else
				{
					console.log("DIDNT FIND EXISTING RA CONTROL ITEM RELATION");
					//IF NOT FOUND CREATE NEW
					riskmachDatabasesFactory.databases.collection.ra_control_item_relations.post(relation_record, { force: true }).then(function(result){
						relation_record._id = result.id;
						relation_record._rev = result.rev;
						defer.resolve(relation_record);
					}).catch(function(error){
						defer.reject("Error creating the assessment control item relation: " + error);
					});
				}

			}).catch(function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.saveControlRecordAsset = function(control_record){
			var defer = $q.defer();

			var options = {
				force: true
			};

			var asset_status = 1;

			//IF TASK NOT LIVE MARK RECORD ASSET AS DELETED
			if( parseInt(control_record.status) == 4 )
			{
				asset_status = 2;
			}

			//IF THE TASK DOESNT HAVE A RECORD ASSET CREATE ONE
			if( !control_record.hasOwnProperty('record_asset_id') || !control_record.record_asset_id )
			{
				console.log("CONTROL ITEM DOES NOT HAVE A RECORD ASSET - CREATING ONE");

				var is_register = 'No';

				if( control_record.hasOwnProperty('is_register') && control_record.is_register == 'Yes' )
				{
					is_register = 'Yes';
				}

				var asset_record = projectsAssetsFactory.models.newAsset(null);
				asset_record.record_id = control_record._id;
				asset_record.record_type = 'control_item';
				asset_record.is_register = is_register;
				asset_record.status = status;
				asset_record.project_id = control_record.activity_id;
				
				//SAVE TASK ASSET RECORD
				riskmachDatabasesFactory.databases.collection.assets.post(asset_record, options).then(function(res){

					console.log("SAVED THE NEW CONTROL RECORD ASSET");

					asset_record._id = res.id;
					asset_record._rev = res.rev;

					//SAVE TASK RECORD WITH RECORD ASSET ID
					control_record.record_asset_id = asset_record._id;

					riskmachDatabasesFactory.databases.collection.mr_controls.post(control_record, options).then(function(res2){
						console.log("INDEXED THE NEW RECORD ASSET BACK TO THE TASK");
						console.log(res2);

						control_record._id = res2.id;
						control_record._rev = res2.rev;
						defer.resolve(control_record);

					}).catch(function(error){
						defer.reject("Error updating the control record after the new asset record was created: " + error);
					});

				}).catch(function(error){
					defer.reject("Error saving the new control asset record: " + error);
				});
			}

			//IF THE TASK DOES HAVE A RECORD ASSET UPDATE IT
			if( control_record.record_asset_id )
			{
				console.log("THE CONTROL DOES HAVE AN EXISTING RECORD ASSET SO WE WILL TRY UPDATING IT");

				//FIND THE ASSET RECORD
				riskmachDatabasesFactory.databases.collection.assets.get(control_record.record_asset_id).then(function(asset_doc){

					console.log("FOUND THE EXISTING CONTROL RECORD ASSET");

					asset_doc = rmUtilsFactory.sync_decoration.snapshot_assets.assetModified(asset_doc);

					//APPLY THE ASSET DETAILS
					asset_doc.asset_ref = control_record.title;
					asset_doc.status = asset_status;

					//SAVE THE ASSET RECORD
					riskmachDatabasesFactory.databases.collection.assets.post(asset_doc, options).then(function(res){
						asset_doc._id = res.id;
						asset_doc._rev = res.rev;

						defer.resolve(control_record);

					}).catch(function(error){
						defer.reject("Error updating the existing control asset record: " + error);
					});

				}).catch(function(error){
					defer.reject("Error getting the existing control asset record: " + error);
				});
			}

			return defer.promise;
		};

		factory.models = {
			control_item: {
				rm_id: null,
				rm_ref: null,
				revision_number: null,
				rm_merge_to_ref: null,
				rm_asset_id: null,
				rm_task_id: null,
				rm_profile_image_id: null,
				rm_record_asset_id: null,
				rm_register_control_item_id: null,
				activity_id: null,
				asset_id: null,
				task_id: null,
				record_asset_id: null,
				description: null,
				rely_control_systems: null,
				maintenance_required: null,
				rrm1: null,
				rrm1_name: null,
				rrm2: null,
				rrm2_name: null,
				rrm3: null,
				rrm3_name: null,
				date_added: null,
				added_by: null,
				status: null,
				standardised: null,
				verification_interval_unit: null,
				verification_interval_value: null,
				date_verified: null,
				date_verification_expires: null,
				verified_by: null,
				verification_status: null,
				verification_comments: null,
				control_in_place: null,
				control_item_expiry: null,
				user_id: null,
				company_id: null
			},
			newControlItem: function(){
				var control_item = {};
				angular.copy(factory.models.control_item, control_item);
				control_item.user_id = authFactory.cloudUserId();
				control_item.added_by = authFactory.cloudUserId();
				control_item.company_id = authFactory.cloudCompanyId();
				control_item.date_added = Date.now();
				return control_item;
			}
		};

		factory.constructPhaSliderTicks = function(list) 
		{
			var slider_ticks = [{
				value: null
			}];

			angular.forEach(list, function(list_item, list_index) {

				var tick = {
					value: list_item.Value
				};

				slider_ticks.push(tick);

			});

			return slider_ticks;
		}

		factory.calculateUniversalRiskRating = function(method_id, value) 
		{
			var rating_info = {
				urr: null,
				urr_phrase_id: null, 
				urr_phrase_name: null
			};

			if( !factory.utils.risk_method_key.hasOwnProperty(method_id) ) {
				return rating_info;
			}

			if( value == null ) {
				return rating_info;
			}

			// CALC PERCENTAGE
			var urr = (value / factory.utils.risk_method_key[method_id].max) * 100;
			// ROUND TO 2 DECIMAL PLACES
			rating_info.urr = parseFloat(urr.toFixed(2));

			return rating_info;
		}

		factory.setUniversalRiskRating = function(ra_record) 
		{	
			var initial_value = null; 
			var after_value = null;

			switch(ra_record.assessment_method) {
				// PHA
				case 1: 
					initial_value = ra_record.hrn_initial;
					after_value = ra_record.hrn_after;
					break;
				// MATRIX
				case 2: 
					initial_value = ra_record.matrix_score_initial;
					after_value = ra_record.matrix_score_after;
					break;
				// SIMPLE
				case 3: 
					initial_value = ra_record.simple_risk_rating_initial;
					after_value = ra_record.simple_risk_rating_after;
					break;
				// RIA
				case 4: 
					initial_value = ra_record.ria_risk_score_initial;
					after_value = ra_record.ria_risk_score_after;
					break;
				// RACKING
				case 5: 
					initial_value = ra_record.matrix_score_initial;
					after_value = ra_record.matrix_score_after;
					break;
				// DETERIORATION
				case 6: 
					initial_value = ra_record.matrix_score_initial;
					after_value = ra_record.matrix_score_after;
					break;
			}

			var initial_urr_data = factory.calculateUniversalRiskRating(ra_record.assessment_method, initial_value);
			var after_urr_data = factory.calculateUniversalRiskRating(ra_record.assessment_method, after_value);

			ra_record.urr_initial = initial_urr_data.urr;
			ra_record.urr_after = after_urr_data.urr;

			return ra_record;
		}

		factory.requestSaveLocalCloseoutAssessment = function(cloud_risk, db_risk_record) 
		{
			var defer = $q.defer();

			if( !db_risk_record ) {
				
				factory.requestCreateLocalCloseoutAssessment(cloud_risk).then(function(risk_record) {

					defer.resolve(risk_record);

				}, function(error) {
					defer.reject(error);
				});

			} else {

				factory.requestUpdateLocalCloseoutAssessment(cloud_risk, db_risk_record).then(function(risk_record) {

					defer.resolve(risk_record);

				}, function(error) {
					defer.reject(error);
				});

			}

			return defer.promise;
		}

		factory.requestCreateLocalCloseoutAssessment = function(cloud_risk) 
		{
			var defer = $q.defer();

			factory.requests.riskMedia(cloud_risk.rm_id).then(function(risk_media) {

				factory.requests.closeoutEvidence(cloud_risk.rm_id).then(function(closeout_media) {

					var risk_record = angular.copy(cloud_risk);

					factory.dbUtils.assessments.saveCloseoutAssessmentRecord(risk_record, null).then(function(saved_risk) {
						
						factory.dbUtils.media_records.saveCloseoutAssessmentMedia(risk_media, saved_risk._id).then(function() {

							factory.dbUtils.media_records.saveCloseoutAssessmentEvidence(closeout_media, saved_risk._id).then(function() {
								
								console.log("CREATED CLOSEOUT RISK RECORD");
								console.log(saved_risk);

								defer.resolve(saved_risk);

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

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.requestUpdateLocalCloseoutAssessment = function(cloud_risk, db_risk_record) 
		{
			var defer = $q.defer();

			factory.requests.riskMedia(cloud_risk.rm_id).then(function(risk_media) {

				factory.requests.closeoutEvidence(cloud_risk.rm_id).then(function(closeout_media) {

					var risk_record = angular.copy(cloud_risk);
					if( risk_record.hasOwnProperty('db_closeout_record') ) {
						delete risk_record.db_closeout_record;
					}

					factory.dbUtils.assessments.saveCloseoutAssessmentRecord(risk_record, db_risk_record).then(function(saved_risk) {
						
						factory.dbUtils.media_records.saveCloseoutAssessmentMedia(risk_media, saved_risk._id).then(function() {

							factory.dbUtils.media_records.saveCloseoutAssessmentEvidence(closeout_media, saved_risk._id).then(function() {
								
								console.log("CREATED CLOSEOUT RISK RECORD");
								console.log(saved_risk);

								defer.resolve(saved_risk);

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

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.createCloseoutAssessmentRecordFromProjectRa = function(risk_record, db_closeout_record) 
		{
			var defer = $q.defer();

			if( db_closeout_record ) {

				if( !rmConnectivityFactory.online_detection.online ) {
					// RETURN EXISTING RISK CLOSEOUT RECORD
					defer.resolve(db_closeout_record);
					return defer.promise;
				}

				// REQUEST CLOSEOUT EVIDENCE
				factory.requests.closeoutEvidence(db_closeout_record.rm_id).then(function(closeout_media) {

					// SAVE RISK CLOSEOUT EVIDENCE
					factory.dbUtils.media_records.saveCloseoutAssessmentEvidence(closeout_media, db_closeout_record._id).then(function() {

						defer.resolve(db_closeout_record);

					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}

			if( !rmConnectivityFactory.online_detection.online ) {

				// FETCH RISK RECORD MEDIA
				mediaFactory.dbUtils.getRecordMedia(risk_record._id, 'assessment').then(function(media) {

					// CREATE RISK CLOSEOUT RECORD
					factory.dbUtils.assessments.saveCloseoutAssessmentRecordFromProjectRa(risk_record).then(function(saved_risk_record) {

						// CLONE MEDIA TO RISK CLOSEOUT RECORD
						factory.dbUtils.media_records.cloneMediaToCloseoutAssessmentRecord(media, saved_risk_record).then(function() {
							defer.resolve(saved_risk_record);
						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

			} else {

				// CORRECT???
				var rm_id = risk_record.downloaded_rm_values.rm_id;

				// REFRESH CLOSEOUT EVIDENCE
				factory.requests.closeoutEvidence(rm_id).then(function(closeout_media) {

					// FETCH RISK RECORD MEDIA
					mediaFactory.dbUtils.getRecordMedia(risk_record._id, 'assessment').then(function(media) {

						// CREATE RISK CLOSEOUT RECORD
						factory.dbUtils.assessments.saveCloseoutAssessmentRecordFromProjectRa(risk_record).then(function(saved_risk_record) {

							// CLONE MEDIA TO RISK CLOSEOUT RECORD
							factory.dbUtils.media_records.cloneMediaToCloseoutAssessmentRecord(media, saved_risk_record).then(function() {
									
								// SAVE RISK CLOSEOUT EVIDENCE
								factory.dbUtils.media_records.saveCloseoutAssessmentEvidence(closeout_media, saved_risk_record._id).then(function() {

									defer.resolve(saved_risk_record);

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

				}, function(error) {
					defer.reject(error);
				});

			}

			return defer.promise;
		}

		factory.uploadReviewedCloseoutEvidence = function(closeout_evidence) 
		{
			var defer = $q.defer();
			var upload_defer = $q.defer();
			var db = riskmachDatabasesFactory.databases.collection.media;

			uploadNextReview(upload_defer, 0).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function uploadNextReview(defer, active_index) 
			{
				if( active_index > closeout_evidence.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				factory.requests.uploadCloseoutEvidenceReview(closeout_evidence[active_index].rm_id, closeout_evidence[active_index].approval_status, closeout_evidence[active_index].approval_message).then(function() {

					// UPDATE IMPORT VALUES
					closeout_evidence[active_index].date_record_synced = new Date().getTime();
					closeout_evidence[active_index].date_content_synced = new Date().getTime();
					closeout_evidence[active_index].date_record_imported = new Date().getTime();
					closeout_evidence[active_index].date_content_imported = new Date().getTime();
					closeout_evidence[active_index].record_modified = 'No';

					closeout_evidence[active_index].intended_closeout_action = null;

					db.put(closeout_evidence[active_index]).then(function(result) {
						
						closeout_evidence[active_index]._id = result.id;
						closeout_evidence[active_index]._rev = result.rev;

						active_index++;
						uploadNextReview(defer, active_index);

					}).catch(function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}

			return defer.promise;
		}

		factory.uploadReviewedRiskCloseout = function(review_info, risk_record, status) 
		{
			var defer = $q.defer();

			factory.requests.reviewRiskCloseout(review_info, status).then(function() {

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		return factory;
	}

	function riskMatrixFactory($rootScope)
	{
		var factory = {};

		factory.x_labels = {
			1: 'Rare',
			2: 'Unlikely',
			3: 'Possible',
			4: 'Likely',
			5: 'Almost Certain'
		};

		factory.y_labels = {
			1: 'Insignificant',
			2: 'Minor',
			3: 'Moderate',
			4: 'Major',
			5: 'Severe'
		};

		factory.getXLabel = function(x_score)
		{
			return factory.x_labels[x_score];
		}

		factory.getYLabel = function(y_score)
		{
			return factory.y_labels[y_score];
		}

		factory.calcScore = function(x_value, y_value)
		{
			var score = parseInt(x_value) * parseInt(y_value);
			return score;
		}

		return factory;
	}

	function riskMatrix5x5()
	{
		var directive = {};

		directive.scope = {
			directive_id: '=directiveid',
			co_ord: '=coord'
		};

		directive.controller = 'riskMatrixController';
		directive.controllerAs = 'vm';
		directive.bindToController = true;

		directive.templateUrl = '../rm-utils/assessments/tpl/riskmatrix5x5.html';

		return directive;
	}

	function riskForm()
	{
		var directive = {};

		directive.scope = {
			directive_id: '=directiveid',
			assessment_id: '=assessmentid',
			relations: '=relations'
		};

		directive.controller = 'riskFormController';
		directive.controllerAs = 'vm';
		directive.bindToController = true;

		directive.templateUrl = '../rm-utils/assessments/tpl/risk_form.html';

		return directive;
	}

	function rackingAssessmentMethod()
	{
		var directive = {};

		directive.scope = {
			directiveid: '=',
			scoredata: '='
		};

		directive.restrict = 'A';
		directive.templateUrl = '../rm-utils/assessments/tpl/racking_method_directive.html';
		directive.controller = 'rackingAssessmentMethodController';
		directive.controllerAs = 'vm';
		directive.bindToController = true;
		directive.replace = false;

		return directive;	
	}

	function deteriorationAssessmentMethod()
	{
		var directive = {};

		directive.scope = {
			directiveid: '=',
			scoredata: '='
		};

		directive.restrict = 'A';
		directive.templateUrl = '../rm-utils/assessments/tpl/deterioration_method_directive.html';
		directive.controller = 'deteriorationAssessmentMethodController';
		directive.controllerAs = 'vm';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

	function reportRiskAssessments() 
	{
		var directive = {};

		directive.scope = {};

		directive.restrict = 'A';
		directive.controller = 'reportRiskAssessmentsListingController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/assessments/tpl/report_risks_list.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

	function reportRiskAssessmentBio() 
	{
		var directive = {};

		directive.scope = {};

		directive.restrict = 'A';
		directive.controller = 'reportRiskAssessmentBioController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/assessments/tpl/report_ra_bio.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

})();