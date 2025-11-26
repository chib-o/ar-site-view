(function(){

	var app = angular.module('riskmachDatabases', []);
	app.factory('riskmachDatabasesFactory', riskmachDatabasesFactory);

	function riskmachDatabasesFactory($rootScope, $q, $timeout)
	{
		var factory = {};

		factory.databases = {
			collection: {
				utils: null,
				users: null,
				user_settings: null,
				device_settings: null,
				projects: null,
				assets: null,
				tasks: null,
				mr_hazards: null,
				mr_controls: null,
				hazard_control_relations: null,
				media: null,
				blueprint_checklists: null,
				blueprint_checklist_sections: null,
				blueprint_checklist_questions: null,
				blueprint_checklist_answers: null,
				blueprint_checklists_json: null,
				checklist_instances: null,
				checklist_question_records: null,
				checklist_instances_json: null,
				blueprint_checklist_statements: null,
				assessments: null,
				ra_question_relations: null,
				control_items: null,
				ra_control_item_relations: null,
				sites: null,
				buildings: null,
				areas: null,
				register_assets: null,
				register_tasks: null,
				register_asset_ipp: null,
				qr_register: null,
				clipboard: null,
				fetch_records: null, 
				fetch_items: null, 
				fetch_item_data: null,
				subject_mr_meta: null,
				feature_licenses: null,
				active_pdf: null,
				latest_app_version: null,
				user_records: null,
				departments: null,
				qc_check_records: null,
				qr_scans: null,
				rasic: null
			},
			initAll: function(){

				factory.databases.initUtils();
				factory.databases.initUsers();
				factory.databases.initUserSettings();
				factory.databases.initDeviceSettings();
				factory.databases.initProjects();
				factory.databases.initAssets();
				factory.databases.initTasks();
				factory.databases.initMrHazards();
				factory.databases.initMrControls();
				factory.databases.initHazardControlRelations();
				factory.databases.initMedia();
				factory.databases.initBlueprintChecklists();
				factory.databases.initBlueprintChecklistSections();
				factory.databases.initBlueprintChecklistQuestions();
				factory.databases.initBlueprintChecklistAnswers();
				factory.databases.initBlueprintChecklistsJson();
				factory.databases.initChecklistInstanceRecords();
				factory.databases.initChecklistQuestionRecords();
				factory.databases.initChecklistInstancesJson();
				factory.databases.initChecklistStatementRecords();
				factory.databases.initAssessments();
				factory.databases.initAssessmentQuestionRelations();
				factory.databases.initControlItems();
				factory.databases.initRaControlItemRelations();
				factory.databases.initSites();
				factory.databases.initBuildings();
				factory.databases.initAreas();
				factory.databases.initRegisterAssets();
				factory.databases.initRegisterTasks();
				factory.databases.initRegisterAssetIpp();
				factory.databases.initQrRegister();
				factory.databases.initClipboard();
				factory.databases.initFetchRecords();
				factory.databases.initFetchItems();
				factory.databases.initFetchItemData();
				factory.databases.initSubjectMrMeta();
				factory.databases.initContractors();
				factory.databases.initPermits();
				factory.databases.initFeatureLicenses();
				factory.databases.initActivePdf();
				factory.databases.initActionLog();
				factory.databases.initLatestAppVersion();
				factory.databases.initUserRecords();
				factory.databases.initDepartments();
				factory.databases.initQcCheckRecords();
				factory.databases.initQrScans();
				factory.databases.initRasic();
			},
			initUtils: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.utils != null ) {
					return;
				}

				factory.databases.collection.utils = new PouchDB('rm_utils', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.utils.createIndex({
					index: {fields: ['table','user_id']}
				});
			},
			initUsers: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.users != null ) {
					return;
				}

				factory.databases.collection.users = new PouchDB('rm_users', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.users.createIndex({
					index: {fields: ['table','company_id']}
				});
			},
			initUserSettings: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.user_settings != null ) {
					return;
				}

				factory.databases.collection.user_settings = new PouchDB('rm_user_settings', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.user_settings.createIndex({
					index: {fields: ['company_id','user_id']}
				});
			},
			initDeviceSettings: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.device_settings != null ) {
					return;
				}

				factory.databases.collection.device_settings = new PouchDB('rm_device_settings', { 'auto_compaction': true, 'revs_limit': 1 });

				// factory.databases.collection.device_settings.createIndex({
				// 	index: {fields: []}
				// });
			},
			initProjects: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.projects != null ) {
					return;
				}

				factory.databases.collection.projects = new PouchDB('rm_projects', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.projects.createIndex({
					index: {fields: ['client_id','company_id','user_id','table','rm_managed_risk_ref']}
				});
			},
			initAssets: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.assets != null ) {
					return;
				}

				factory.databases.collection.assets = new PouchDB('rm_assets', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.assets.createIndex({
					index: {fields: ['project_id','user_id','company_id','table','is_managed_risk_asset','is_mr_audit_asset','re_inspection_asset','qr_code','rm_register_asset_id']}
				});
			},
			initTasks: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.tasks != null ) {
					return;
				}

				factory.databases.collection.tasks = new PouchDB('rm_procedure_builder', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.tasks.createIndex({
					index: {fields: ['procedure_id','company_id','user_id','table','activity_id','asset_id','task_type','rm_id','rm_parent_task_id']}
				});
			},
			initMrHazards: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.mr_hazards != null ) {
					return;
				}

				factory.databases.collection.mr_hazards = new PouchDB('rm_mr_hazards', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.mr_hazards.createIndex({
					index: {fields: ['company_id','user_id','table','activity_id','asset_id','task_id','assessment_id','status']}
				});
			},
			initMrControls: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.mr_controls != null ) {
					return;
				}

				factory.databases.collection.mr_controls = new PouchDB('rm_mr_controls', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.mr_controls.createIndex({
					index: {fields: ['company_id','user_id','table','activity_id','asset_id','task_id','status','control_item_type','assessment_id']}
				});
			},
			initHazardControlRelations: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.hazard_control_relations != null ) {
					return;
				}

				factory.databases.collection.hazard_control_relations = new PouchDB('rm_hazard_control_relations', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.hazard_control_relations.createIndex({
					index: {fields: ['company_id','user_id','table','activity_id','asset_id','hazard_id','control_item_id']}
				});
			},
			initMedia: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.media != null ) {
					return;
				}

				factory.databases.collection.media = new PouchDB('rm_media', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.media.createIndex({
					index: {fields: ['company_id','user_id','table','control_item_id','record_type','record_id']}
				});
			},
			initBlueprintChecklists: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.blueprint_checklists != null ) {
					return;
				}

				factory.databases.collection.blueprint_checklists = new PouchDB('rm_blueprint_checklists', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.blueprint_checklists.createIndex({
					index: {fields: ['user_id','company_id','table','ChecklistID']}
				});
			},
			initBlueprintChecklistSections: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.blueprint_checklist_sections != null ) {
					return;
				}

				factory.databases.collection.blueprint_checklist_sections = new PouchDB('rm_blueprint_checklist_sections', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.blueprint_checklist_sections.createIndex({
					index: {fields: ['user_id','company_id','table','ChecklistID','SectionID']}
				});
			},
			initBlueprintChecklistQuestions: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.blueprint_checklist_questions != null ) {
					return;
				}

				factory.databases.collection.blueprint_checklist_questions = new PouchDB('rm_blueprint_checklist_questions', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.blueprint_checklist_questions.createIndex({
					index: {fields: ['user_id','company_id','table','ChecklistID','SectionID','QuestionID']}
				});
			},
			initBlueprintChecklistAnswers: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.blueprint_checklist_answers != null ) {
					return;
				}

				factory.databases.collection.blueprint_checklist_answers = new PouchDB('rm_blueprint_checklist_answers', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.blueprint_checklist_answers.createIndex({
					index: {fields: ['user_id','company_id','table','ChecklistID','QuestionID','AnswerID']}
				});
			},
			initBlueprintChecklistsJson: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.blueprint_checklists_json != null ) {
					return;
				}

				factory.databases.collection.blueprint_checklists_json = new PouchDB('rm_blueprint_checklists_json', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.blueprint_checklists_json.createIndex({
					index: {fields: ['checklist_blueprint_id']}
				});
			},
			initChecklistInstanceRecords: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.checklist_instances != null ) {
					return;
				}

				factory.databases.collection.checklist_instances = new PouchDB('rm_checklist_instances', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.checklist_instances.createIndex({
					index: {fields: ['user_id','company_id','table','activity_id','asset_id','rm_checklist_blueprint_id','rm_checklist_blueprint_ref','rm_id']}
				});
			},
			initChecklistQuestionRecords: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.checklist_question_records != null ) {
					return;
				}

				factory.databases.collection.checklist_question_records = new PouchDB('rm_checklist_question_records', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.checklist_question_records.createIndex({
					index: {fields: ['user_id','company_id','table','rm_question_id','rm_question_ref','checklist_record_id','section_id']}
				});
			},
			initChecklistInstancesJson: function() {
				// IF ALREADY INITIALISED
				if( factory.databases.collection.checklist_instances_json != null ) {
					return;
				}

				factory.databases.collection.checklist_instances_json = new PouchDB('rm_checklist_instances_json', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.checklist_instances_json.createIndex({
					index: {fields: ['checklist_instance_id']}
				});
			},
			initChecklistStatementRecords: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.blueprint_checklist_statements != null ) {
					return;
				}

				factory.databases.collection.blueprint_checklist_statements = new PouchDB('rm_blueprint_checklist_statements', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.blueprint_checklist_statements.createIndex({
					index: {fields: ['user_id','company_id','table','ChecklistID']}
				});
			},
			initAssessments: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.assessments != null ) {
					return;
				}

				factory.databases.collection.assessments = new PouchDB('rm_assessments', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.assessments.createIndex({
					index: {fields: ['user_id','company_id','table','activity_id','asset_id','status','assessment_type','rm_ref','rm_activity_id','is_pool_item','latest_local_draft_mr_copy','latest_local_audit_mr_copy','subject_record_id','subject_record_type']}
				});
			},
			initAssessmentQuestionRelations: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.ra_question_relations != null ) {
					return;
				}

				factory.databases.collection.ra_question_relations = new PouchDB('rm_ra_question_relations',{ 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.ra_question_relations.createIndex({
					index: {fields: ['user_id','company_id','table','activity_id','asset_id','status','assessment_id','question_id','checklist_record_id','rm_assessment_ref','rm_question_id','question_record_id','rm_question_ref']}
				});
			},
			initControlItems: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.control_items != null ) {
					return;
				}

				factory.databases.collection.control_items = new PouchDB('rm_control_items', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.control_items.createIndex({
					index: {fields: ['user_id','company_id','table','activity_id','asset_id','status']}
				});
			},
			initRaControlItemRelations: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.ra_control_item_relations != null ) {
					return;
				}

				factory.databases.collection.ra_control_item_relations = new PouchDB('rm_ra_control_item_relations', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.ra_control_item_relations.createIndex({
					index: {fields: ['user_id','company_id','table','activity_id','asset_id','status','assessment_id','control_item_id']}
				});
			},
			initSites: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.sites != null ) {
					return;
				}

				factory.databases.collection.sites = new PouchDB('rm_sites', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.sites.createIndex({
					index: {fields: ['rm_id','company_id','user_id','table']}
				});
			}, 
			initBuildings: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.buildings != null ) {
					return;
				}

				factory.databases.collection.buildings = new PouchDB('rm_buildings', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.buildings.createIndex({
					index: {fields: ['site_id','company_id','user_id','table']}
				});
			}, 
			initAreas: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.areas != null ) {
					return;
				}

				factory.databases.collection.areas = new PouchDB('rm_areas', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.areas.createIndex({
					index: {fields: ['site_id','building_id','company_id','user_id','table']}
				});
			},
			initRegisterAssets: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.register_assets != null ) {
					return;
				}

				factory.databases.collection.register_assets = new PouchDB('rm_register_assets',{ 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.register_assets.createIndex({
					index: {fields: ['site_id','building_id','area_id','parent_asset_id','company_id','user_id','table']}
				});
			},
			initRegisterTasks: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.register_tasks != null ) {
					return;
				}

				factory.databases.collection.register_tasks = new PouchDB('rm_register_tasks', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.register_tasks.createIndex({
					index: {fields: ['company_id','user_id','table','asset_id']}
				});
			},
			initRegisterAssetIpp: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.register_asset_ipp != null ) {
					return;
				}

				factory.databases.collection.register_asset_ipp = new PouchDB('rm_register_asset_ipp', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.register_asset_ipp.createIndex({
					index: {fields: ['company_id','user_id','table','asset_id','rm_profile_point_ref','rm_profile_point_id','rm_pp_asset_relation_id']}
				});
			},
			initQrRegister: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.qr_register != null ) {
					return;
				}

				factory.databases.collection.qr_register = new PouchDB('rm_qr_register', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.qr_register.createIndex({
					index: {fields: ['company_id','table','record_id','record_type','code']}
				});
			},
			initClipboard: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.clipboard != null ) {
					return;
				}

				factory.databases.collection.clipboard = new PouchDB('rm_clipboard', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.clipboard.createIndex({
					index: {fields: ['company_id','table','record_id','record_type','user_id']}
				});
			},
			initFetchRecords: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.fetch_records != null ) {
					return;
				}

				factory.databases.collection.fetch_records = new PouchDB('rm_fetch_records', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.fetch_records.createIndex({
					index: {fields: ['date_started','fetch_type','company_id','user_id','table','download_type']}
				});
			},
			initFetchItems: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.fetch_items != null ) {
					return;
				}

				factory.databases.collection.fetch_items = new PouchDB('rm_fetch_items', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.fetch_items.createIndex({
					index: {fields: ['fetch_id','table']}
				});
			},
			initFetchItemData: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.fetch_item_data != null ) {
					return;
				}

				factory.databases.collection.fetch_item_data = new PouchDB('rm_fetch_item_data', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.fetch_item_data.createIndex({
					index: {fields: ['fetch_item_id','page_num','table']}
				});
			},
			initSubjectMrMeta: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.subject_mr_meta != null ) {
					return;
				}

				factory.databases.collection.subject_mr_meta = new PouchDB('rm_subject_mr_meta', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.subject_mr_meta.createIndex({
					index: {fields: ['subject_record_id','subject_record_type','user_id','client_id']}
				});
			},
			initContractors: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.contractors != null ) {
					return;
				}

				factory.databases.collection.contractors = new PouchDB('rm_contractors', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.contractors.createIndex({
					index: {fields: ['user_id','company_id']}
				});
			},
			initPermits: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.permits != null ) {
					return;
				}
				
				factory.databases.collection.permits = new PouchDB('rm_permits', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.permits.createIndex({
					index: {fields: ['user_id','contractor_id']}
				});
			},
			initFeatureLicenses: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.feature_licenses != null ) {
					return;
				}
				
				factory.databases.collection.feature_licenses = new PouchDB('rm_feature_licenses', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.feature_licenses.createIndex({
					index: {fields: ['company_id']}
				});
			},
			initActivePdf: function() {
				// IF ALREADY INITIALISED
				if( factory.databases.collection.active_pdf != null ) {
					return;
				}

				factory.databases.collection.active_pdf = new PouchDB('rm_active_pdf', { 'auto_compaction': true, 'revs_limit': 1 });
			},
			initActionLog: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.action_log != null ) {
					return;
				}
				
				factory.databases.collection.action_log = new PouchDB('rm_action_log', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.action_log.createIndex({
					index: {fields: ['user_id','company_id']}
				});
			},
			initLatestAppVersion: function() {
				// IF ALREADY INITIALISED
				if( factory.databases.collection.latest_app_version ) {
					return;
				}

				factory.databases.collection.latest_app_version = new PouchDB('rm_latest_app_version', { 'auto_compaction': true, 'revs_limit': 1 });
			},
			initUserRecords: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.user_records != null ) {
					return;
				}
				
				factory.databases.collection.user_records = new PouchDB('rm_user_records', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.user_records.createIndex({
					index: {fields: ['user_id','CompanyID']}
				});
			},
			initDepartments: function(){
				// IF ALREADY INITIALISED
				if( factory.databases.collection.departments != null ) {
					return;
				}
				
				factory.databases.collection.departments = new PouchDB('rm_departments', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.departments.createIndex({
					index: {fields: ['user_id','company_id']}
				});
			},
			initQcCheckRecords: function() {
				// IF ALREADY INITIALISED
				if( factory.databases.collection.qc_check_records != null ) {
					return;
				}

				factory.databases.collection.qc_check_records = new PouchDB('rm_qc_check_records', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.qc_check_records.createIndex({
					index: {fields: ['user_id','company_id','activity_id','ReviewID']}
				});
			},
			initQrScans: function() {
				// IF ALREADY INITIALISED
				if( factory.databases.collection.qr_scans != null ) {
					return;
				}

				factory.databases.collection.qr_scans = new PouchDB('rm_qr_scans', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.qr_scans.createIndex({
					index: {fields: ['user_id','company_id','client_id']}
				})
			},
			initRasic: function() {
				// IF ALREADY INITIALISED
				if( factory.databases.collection.rasic != null ) {
					return;
				}

				factory.databases.collection.rasic = new PouchDB('rm_rasic', { 'auto_compaction': true, 'revs_limit': 1 });

				factory.databases.collection.rasic.createIndex({
					index: {fields: ['rasic_id','rm_record_id','record_type','user_id']}
				})
			}
		};

		factory.compact = {
			num_db: null,
			num_done: 0,
			is_loading: false,
			start: function(){
				factory.compact.is_loading = true;

				factory.compact.num_db = Object.keys(factory.databases.collection).length;
				factory.compact.num_done = 0;

				//MAKE SURE ALL THE DATABASES ARE INITIALISED
				factory.databases.initAll();

				//AS THERES NO CALLBACK FOR DB INIT GIVE A FEW SECS TO CATCH UP
				$timeout(function(){

					var max_index = factory.databases.collection.length - 1;
					var sub_defer = $q.defer();

					factory.compact.num_db = Object.keys(factory.databases.collection).length;
					factory.compact.num_done = 0;

					factory.compact.compactNextDb(0, sub_defer).then(function(){
						factory.compact.is_loading = false;
						$rootScope.$broadcast("riskmachDatabases::compacted");
					}, function(error){
						factory.compact.is_loading = false;
						$rootScope.$broadcast("riskmachDatabases::compactError", { error: error });
					});

				}, 3000);
			},
			compactNextDb: function(current_index, sub_defer){
				var defer = $q.defer();

				//COUNT NUM DATABASES REGISTERED
				var max_index = Object.keys(factory.databases.collection).length;

				console.log("MAX INDEX: " + max_index);
				console.log("CURRENT INDEX:" + current_index);

				//IF ALL DONE THEN LEAVE
				if( current_index > max_index )
				{
					sub_defer.resolve();
					return sub_defer.promise;
				}

				//FIND THE DATABASE FROM THE INDEX PROVIDED
				var db = null;
				var counter = 0;

				angular.forEach(factory.databases.collection, function(record, index){

					if( counter == current_index )
					{
						db = factory.databases.collection[index]
					}

					counter++;

				});

				//SET AND COMPACT THE DATABASE
				console.log("DATABASE TO COMPACT: " + db);
				console.log(db);
				
				//IF DB NOT FOUND SKIP
				if( !db )
				{
					console.log("SKIPPING COMPACT - NO DB FOUND");
					current_index++;
					factory.compact.num_done++;
					factory.compact.compactNextDb( current_index, sub_defer );
					return sub_defer.promise;
				}

				db.compact().then(function(result){

					//COMPACT THE NEXT DATABASE
					current_index++;
					factory.compact.num_done++;
					$rootScope.$broadcast("riskmachDatabases::tableCompacted", { num_done: factory.compact.num_done });
					factory.compact.compactNextDb( current_index, sub_defer );

				}).catch(function (err) {
					console.log(err);
					sub_defer.reject(err);
				});

				return sub_defer.promise;
			}
		}

		return factory;
	}

})();