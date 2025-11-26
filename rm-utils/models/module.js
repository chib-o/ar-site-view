(function() {

	var app = angular.module('riskmachModels', ['riskmachUtils']);
	app.factory('modelsFactory', modelsFactory);

	function modelsFactory(authFactory) 
	{
		var factory = {};

		factory.models = {}; 
		factory.data_types = {}; 

		// START PROJECTS
		factory.models.project = {
			_id: null, 
			_rev: null,
			title: null,
			description: null,
			job_number: null,
			rm_id: null,
			rm_ref: null,
			status: 1,
			synced: false,
			company_id: null,
			client_id: null,
			pp_id: null,
			type: null,
			deliver_to_email: null,
			deliver_to_name: null,
			start_date: null,
			num_assets: null,
			site_name: null,
			user_id: null,
			added_by: null,
			added_by_name: null,
			date_added: null,
			modified_by: null, 
			date_modified: null,
			syncing: false,
			downloading: false,
			archived: null,
			installed: null,
			controls_auto_verified: false,
			is_mr_defect_project: null,
			is_managed_risk_audit: null,
			rm_managed_risk_id: null,
			rm_managed_risk_ref: null,
			managed_risk_id: null,
			external_ref: null,
			external_ref_scanned: 'No',
			date_record_synced: null,
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			core_project: null,
			record_modified: 'No',
			uninstalled_checklists: 'No',
			rm_record: null, 
			rm_record_modified: 'No',
			table: 'projects',
			working_project_id: null,
			clone_from_modified_complete: false,
			cloned_from_modified_id: null,
			modified_project_name: null, 
			clean_up_started: null,
			is_single_inspection: null,
			is_register_sop_edit: null,
			is_facilitated: 'No', 
			facilitator_company_id: null,
			facilitator_first_name: null, 
			facilitator_last_name: null, 
			facilitator_email: null, 
			facilitator_token: null, 
			facilitator_pin: null,
			report_ref: null,
			report_ref_guid: null, 
			report_date: null,
			report_id: null, 
			report_status: null, 
			report_status_name: null,
			issue_number: null,
			iqa_user_id: null, 
			iqa_user_name: null,
			review_id: null,
			for_lpa_programme_id: null,
			for_lpa_layer_id: null, 
			for_lpa_requirement_id: null,
			is_private: 'No', 
			iqa_qc_complete: null,
			iqa_no_rejections: null,
			iqa_can_publish: null,
			iqa_user_id2: null, 
			iqa_user_name: null,
			iqa_eligible_qc_complete: null, 
			iqa_eligible_no_rejections: null, 
			contributors: [],
			qc_status: null,
			qc_status_date: null,
			core_downloaded: null
		};

		factory.models.newProject = function() {
			var project_record = {};

			angular.copy(factory.models.project, project_record);
			project_record.user_id = authFactory.cloudUserId();
			project_record.company_id = authFactory.cloudCompanyId();
			project_record.date_added = Date.now();

			project_record.added_by = authFactory.rmCloudUserId();

			project_record.record_modified = 'Yes';

			return project_record;
		};

		factory.data_types.project = {
			rm_id: 'integer',
			rm_ref: 'integer',
			status: 'integer',
			company_id: 'integer',
			client_id: 'integer',
			pp_id: 'integer',
			type: 'integer',
			num_assets: 'integer',
			user_id: 'integer', 
			rm_managed_risk_id: 'integer',
			rm_managed_risk_ref: 'integer',
			facilitator_company_id: 'integer',
			report_ref: 'integer',
			report_id: 'integer',
			report_status: 'integer', 
			issue_number: 'integer', 
			iqa_user_id: 'integer',
			added_by: 'integer',
			modified_by: 'integer',
			for_lpa_programme_id: 'integer',
			for_lpa_layer_id: 'integer', 
			for_lpa_requirement_id: 'integer',
			iqa_user_id2: 'integer',
			qc_status: 'integer',
			qc_status_date: 'integer'
		};
		// END PROJECTS

		// START SNAPSHOT ASSETS
		factory.models.snapshot_asset = {
			_id: null, 
			_rev: null,
			asset_ref: null,
			serial: null,
			model: null,
			type: null,
			power: null,
			supplier: null,
			manufacturer: null,
			description: null,
			short_description: null,
			external_ref_1: null,
			external_ref_2: null,
			external_ref_3: null,
			external_ref_4: null,
			external_ref_5: null,
			rm_id: null,
			rm_ref: null,
			record_type: null,
			record_id: null,
			rm_record_id: null,
			is_register: 'No',
			status: 1,
			synced: false,
			company_id: null,
			client_id: null,
			project_id: null,
			rm_project_id: null,
			date_added: null,
			rm_parent_asset_id: null,
			parent_asset_id: null,
			parent_asset_ref: null,
			qr_code: null,
			designation_id: null,
			cloned_from_id: null, 
			cloned_from_rm_id: null,
			clone_incomplete: null,
			is_managed_risk_asset: null, 
			is_mr_audit_asset: null,
			cloud_inspections_meta: null,
			rm_register_asset_id: null,
			register_asset_id: null,
			register_asset_ref: null,
			re_inspection_asset: null, 
			re_inspection_data_downloaded: null,
			re_inspection_of_id: null, 
			re_inspection_of_rm_id: null,
			re_inspection_details_set: null,
			agent_asset_size: null, 
			agent_asset_size_name: null,
			agent_inspection_time: null,
			is_single_inspection: null,
			is_register_sop_edit: null,
			date_record_synced: null, 
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			user_id: authFactory.cloudUserId(),
			record_modified: 'No',
			rm_record: null,
			rm_record_modified: 'No',
			table: 'assets',
			num_children: null, 
			cloned_from_modified_id: null,
			pp_id: null, 
			pp_name: null, 
			activity_type: null, 
			activity_type_name: null,
			geo_data: null,
			geo_error: null,
			geo_date: null,
			quick_capture_risk_id: null,
			report_id: null,
			report_ref: null, 
			report_ref_guid: null,
			report_date: null,
			report_status: null, 
			report_status_name: null,
			ipp_record_id: null, 
			started_from_due_inspection: null,
			requirement_date: null, 
			planned_date: null, 
			assigned_user_id: null, 
			assigned_user_name: null, 
			for_lpa_programme_id: null, 
			for_lpa_layer_id: null, 
			for_lpa_requirement_id: null,
			for_lpa_programme_name: null, 
			for_lpa_layer_name: null,
			active_checklist_id: null,
			child_import_error: null,
			child_import_error_data: null
		};

		factory.models.newSnapshotAsset = function(project_id) {
			var asset_record = {};

			angular.copy(factory.models.snapshot_asset, asset_record);
			asset_record.user_id = authFactory.cloudUserId();
			asset_record.company_id = authFactory.cloudCompanyId();
			asset_record.project_id = project_id;
			asset_record.date_added = Date.now();
			asset_record.client_id = authFactory.getActiveCompanyId();

			asset_record.record_modified = 'Yes';

			return asset_record;
		};

		factory.data_types.snapshot_asset = {
			rm_id: 'integer',
			rm_ref: 'integer',
			rm_record_id: 'integer',
			status: 'integer',
			company_id: 'integer',
			client_id: 'integer',
			rm_parent_asset_id: 'integer',
			rm_project_id: 'integer',
			qr_code: 'integer',
			designation_id: 'integer',
			user_id: 'integer',
			num_children: 'integer',
			rm_register_asset_id: 'integer', 
			re_inspection_of_rm_id: 'integer',
			agent_asset_size: 'integer', 
			agent_inspection_time: 'integer',
			report_ref: 'integer',
			assigned_user_id: 'integer',
			for_lpa_programme_id: 'integer', 
			for_lpa_layer_id: 'integer',
			for_lpa_requirement_id: 'integer'
		};
		// END SNAPSHOT ASSETS

		// START TASKS
		factory.models.task = {
			_id: null,
			_rev: null,
			bank_type_id: null,
			bank_type_1: null,
			bank_type_2: null,
			title: null,
			description: null,
			operation: null,
			high_low_frequency: null,
			constant: null,
			frequency_value: null,
			frequency_unit: null,
			duration_value: null,
			duration_unit: null,
			external_task_ref: null,
			rm_id: null,
			rm_ref: null,
			rm_parent_task_id: null,
			rm_parent_task_ref: null,
			parent_task_id: null,
			rm_procedure_id: null,
			rm_procedure_ref: null,
			procedure_id: null,
			task_type: null,
			sequence_number: null,
			media_config: null,
			video_media_id: null,
			audio_media_id: null,
			num_files: 0,
			num_hazards: 0, 
			num_hazards_complete: 0,
			record_asset_id: null,
			rm_record_asset_id: null,
			status: 2, //PUBLISHED
			files_synced: 0,
			synced: false,
			company_id: null,
			user_id: null,
			date_added: null,
			rm_activity_id: null,
			activity_id: null,
			rm_asset_id: null,
			asset_id: null,
			is_register: 'No',
			concern_category: null,
			concern_description: null,
			clone_incomplete: null,
			register_rm_ref_edit: null,
			register_rm_id_edit: null,
			rm_register_task_id: null,
			rm_task_register_asset_id: null,
			date_record_synced: null,
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			user_id: authFactory.cloudUserId(),
			record_modified: 'No',
			rm_record: null,
			rm_record_modified: 'No',
			table: 'tasks', 
			cloned_from_modified_id: null,
			matrix_score_initial: null, 
			matrix_score_phrase_initial: null, 
			matrix_score_after: null, 
			matrix_score_phrase_after: null,
			approved_by_name: null, 
			date_approved: null,
			signature_id: null,
			rm_signature_id: null, 
			rm_signature_ref: null
		};

		factory.models.newProcedure = function() {
			var task_record = {};

			angular.copy(factory.models.task, task_record);
			task_record.user_id = authFactory.cloudUserId();
			task_record.company_id = authFactory.cloudCompanyId();
			task_record.procedure_id = null;
			task_record.task_type = 'procedure';
			task_record.date_added = Date.now();

			task_record.record_modified = 'Yes';

			return task_record;
		};

		factory.models.newTask = function(procedure_id, parent_id) {
			var task_record = {};

			angular.copy(factory.models.task, task_record);
			task_record.user_id = authFactory.cloudUserId();
			task_record.company_id = authFactory.cloudCompanyId();
			task_record.procedure_id = procedure_id;
			task_record.parent_task_id = parent_id;
			task_record.task_type = 'task';
			task_record.date_added = Date.now();

			task_record.record_modified = 'Yes';

			return task_record;
		};

		factory.models.newStep = function(procedure_id, parent_id) {
			var task_record = {};

			angular.copy(factory.models.task, task_record);
			task_record.user_id = authFactory.cloudUserId();
			task_record.company_id = authFactory.cloudCompanyId();
			task_record.procedure_id = procedure_id;
			task_record.parent_task_id = parent_id;
			task_record.task_type = 'step';
			task_record.date_added = Date.now();

			task_record.record_modified = 'Yes';

			return task_record;
		};

		factory.data_types.task = {
			bank_type_id: 'integer',
			frequency_value: 'integer',
			duration_value: 'integer',
			rm_id: 'integer',
			rm_ref: 'integer',
			sequence_number: 'integer',
			num_files: 'integer',
			rm_activity_id: 'integer',
			rm_asset_id: 'integer',
			rm_record_asset_id: 'integer',
			rm_parent_task_id: 'integer',
			rm_procedure_id: 'integer',
			rm_parent_task_ref: 'integer', 
			rm_procedure_ref: 'integer',
			status: 'integer',
			files_synced: 'integer',
			company_id: 'integer',
			user_id: 'integer',
			register_rm_ref_edit: 'integer',
			register_rm_id_edit: 'integer',
			rm_register_task_id: 'integer', 
			rm_task_register_asset_id: 'integer',
			rm_signature_id: 'integer',
			rm_signature_ref: 'integer'
		};
		// END TASKS

		// START MR HAZARDS
		factory.models.mr_hazard = {
			_id: null, 
			_rev: null,
			rm_id: null,
			rm_ref: null,
			rm_asset_id: null,
			rm_register_hazard_id: null,
			rm_task_id: null,
			rm_task_ref: null,
			rm_assessment_id: null,
			rm_assessment_ref: null,
			rm_merge_to_ref: null,
			revision_number: null,
			assessment_id: null,
			register_hazard_id: null,
			hazard_set_id: null,
			hazard_set_name: null,
			hazard_type: null,
			hazard_type_name: null,
			hazard_origin: null,
			hazard_origin_name: null,
			hazard_consequence: null,
			hazard_consequence_name: null,
			hazard_description: null,
			hazard_considered: 'No',
			matrix_consequence_initial: null,
			matrix_consequence_phrase_initial: null,
			matrix_likelihood_initial: null,
			matrix_likelihood_phrase_initial: null,
			matrix_score_initial: null,
			matrix_score_phrase_initial: null,
			managed_hazard_initial_risk_score: null,
			managed_hazard_initial_risk_phrase: null,
			matrix_consequence_after: null,
			matrix_consequence_phrase_after: null,
			matrix_likelihood_after: null,
			matrix_likelihood_phrase_after: null,
			matrix_score_after: null,
			matrix_score_phrase_after: null,
			managed_hazard_after_risk_score: null,
			managed_hazard_after_risk_phrase: null,
			num_controls: 0,
			num_verified_controls: 0,
			num_files: 0,
			rm_activity_id: null,
			activity_id: null,
			asset_id: null,
			task_id: null,
			company_id: null,
			synced: false,
			imported: false,
			created_audit_assessment: false,
			status: 1,
			is_register: 'No',
			master_id: null,
			cloned_from_id: null, 
			cloned_from_rm_id: null, 
			cloned_from_rm_ref: null,
			cloned_from_modified_id: null,
			date_record_synced: null, 
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			user_id: authFactory.cloudUserId(),
			record_modified: 'No',
			rm_record: null,
			rm_record_modified: 'No',
			clone_incomplete: null
		};

		factory.models.newMrHazard = function() {
			var hazard_record = {};

			angular.copy(factory.models.mr_hazard ,hazard_record);
			hazard_record.user_id = authFactory.cloudUserId();
			hazard_record.company_id = authFactory.cloudCompanyId();
			hazard_record.date_added = Date.now();

			hazard_record.record_modified = 'Yes';

			return hazard_record;
		};

		factory.data_types.mr_hazard = {
			rm_id: 'integer',
			rm_ref: 'integer',
			rm_asset_id: 'integer',
			rm_register_hazard_id: 'integer',
			rm_task_id: 'integer',
			rm_task_ref: 'integer',
			rm_assessment_id: 'integer',
			rm_assessment_ref: 'integer',
			rm_activity_id: 'integer',
			revision_number: 'integer',
			hazard_set_id: 'integer',
			hazard_type: 'integer',
			hazard_origin: 'integer',
			hazard_consequence: 'integer',
			matrix_consequence_initial: 'integer',
			matrix_likelihood_initial: 'integer',
			matrix_score_initial: 'integer',
			managed_hazard_initial_risk_score: 'integer',
			matrix_consequence_after: 'integer',
			matrix_likelihood_after: 'integer',
			matrix_score_after: 'integer',
			managed_hazard_after_risk_score: 'integer',
			num_controls: 'integer',
			company_id: 'integer',
			status: 'integer',
			user_id: 'integer'
		};
		// END MR HAZARDS

		// START MR CONTROLS
		factory.models.mr_control = {
			_id: null, 
			_rev: null,
			rm_id: null,
			rm_ref: null,
			revision_number: null,
			rm_merge_to_ref: null,
			rm_asset_id: null,
			rm_task_id: null,
			rm_task_ref: null,
			rm_profile_image_id: null,
			rm_record_asset_id: null,
			rm_register_control_item_id: null,
			rm_activity_id: null,
			activity_id: null,
			asset_id: null,
			task_id: null,
			record_asset_id: null,
			description: null,
			rely_control_systems: null,
			maintenance_required: null,
			rrm_set_id: 1,
			rrm_set_name: null,
			rrm1: null,
			rrm1_name: null,
			rrm2: null,
			rrm2_name: null,
			rrm3: null,
			rrm3_name: null,
			num_hazards: 0, 
			num_files: 0,
			date_added: null,
			added_by: null,
			status: null,
			standardised: null,
			verification_interval_unit: 'year',
			verification_interval_value: 1,
			date_verified: null,
			date_verification_expires: null,
			verified_by: null,
			verification_status: null,
			verification_comments: null,
			verified_on_app: null,
			app_date_verified: null,
			control_in_place: null,
			control_item_expiry: null,
			company_id: null,
			is_register: 'No',
			cloned_from_id: null, 
			cloned_from_rm_id: null, 
			cloned_from_rm_ref: null,
			cloned_from_modified_id: null,
			control_item_type: null,
			is_mr_audit: null,
			date_record_synced: null, 
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			user_id: authFactory.cloudUserId(),
			record_modified: 'No',
			rm_record: null,
			rm_record_modified: 'No',
			global_control_item: null,
			verification_log_id: null
		};

		factory.models.newMrControl = function() {
			var control_record = {};

			angular.copy(factory.models.mr_control, control_record);
			control_record.user_id = authFactory.cloudUserId();
			control_record.added_by = authFactory.cloudUserId();
			control_record.company_id = authFactory.cloudCompanyId();
			control_record.date_added = Date.now();

			control_record.record_modified = 'Yes';

			return control_record;
		};

		factory.data_types.mr_control = {
			rm_id: 'integer',
			rm_ref: 'integer',
			revision_number: 'integer',
			rm_merge_to_ref: 'integer',
			rm_asset_id: 'integer',
			rm_task_id: 'integer',
			rm_task_ref: 'integer',
			rm_profile_image_id: 'integer',
			rm_record_asset_id: 'integer',
			rm_register_control_item_id: 'integer',
			rm_activity_id: 'integer',
			rrm_set_id: 'integer',
			rrm1: 'integer',
			rrm2: 'integer',
			rrm3: 'integer',
			added_by: 'integer',
			status: 'integer',
			verified_by: 'integer',
			verification_interval_value: 'integer',
			company_id: 'integer',
			user_id: 'integer'
		};
		// END MR CONTROLS

		// START HAZARD CONTROL RELATIONS
		factory.models.hazard_control_relation = {
			_id: null, 
			_rev: null,
			rm_id: null,
			hazard_id: null,
			control_item_id: null,
			date_linked: null,
			linked_by: null,
			status: null,
			date_modified: null,
			modified_by: null,
			assessment_id: null,
			rm_hazard_id: null,
			rm_hazard_ref: null,
			rm_control_item_id: null,
			rm_control_item_ref: null,
			rm_assessment_id: null,
			rm_activity_id: null,
			rm_asset_id: null,
			activity_id: null,
			asset_id: null,
			company_id: null,
			client_id: null,
			is_register: 'No',
			date_record_synced: null, 
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			user_id: authFactory.cloudUserId(),
			record_modified: 'No',
			rm_record: null,
			rm_record_modified: 'No', 
			cloned_from_modified_id: null
		};

		factory.models.newMrHazardControlRelation = function() {
			var relation_record = {};

			angular.copy(factory.models.hazard_control_relation, relation_record);
			relation_record.user_id = authFactory.cloudUserId();
			relation_record.linked_by = authFactory.cloudUserId();
			relation_record.company_id = authFactory.cloudCompanyId();
			relation_record.client_id = authFactory.getActiveCompanyId();
			relation_record.date_linked = Date.now();

			relation_record.record_modified = 'Yes';

			return relation_record;
		};

		factory.data_types.hazard_control_relation = {
			rm_id: 'integer',
			linked_by: 'integer',
			status: 'integer',
			modified_by: 'integer',
			rm_hazard_id: 'integer',
			rm_hazard_ref: 'integer', 
			rm_control_item_id: 'integer',
			rm_control_item_ref: 'integer',
			rm_assessment_id: 'integer',
			rm_activity_id: 'integer',
			rm_asset_id: 'integer',
			company_id: 'integer',
			client_id: 'integer',
			user_id: 'integer'
		};
		// END HAZARD CONTROL RELATIONS

		// START CHECKLIST INSTANCES
		factory.models.checklist_instance = {
			_id: null, 
			_rev: null,
			rm_id: null,
			rm_checklist_blueprint_id: null,
			rm_checklist_blueprint_ref: null,
			rm_checklist_blueprint_revision_number: null,
			rm_checklist_record_id: null,
			rm_activity_id: null,
			activity_id: null, 
			rm_asset_id: null,
			asset_id: null,
			synced: false,
			imported: false,
			checklist_title: null,
			checklist_description: null,
			date_started: null,
			started_by: null,
			status: 1, // DRAFT
			company_id: null,
			client_id: null,
			blueprint_record: null,
			blueprint_pool_activity_id: null,
			total_questions: null,
			num_questions_complete: 0,
			num_sections_complete: 0,
			percentage_complete: 0,
			cloned_from_id: null, 
			cloned_from_rm_id: null,
			date_record_synced: null, 
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			user_id: authFactory.cloudUserId(),
			record_modified: 'No',
			rm_record: null,
			rm_record_modified: 'No',
			// ISUAUDIT PROPERTIES
			is_uaudit: 'No',
			checklist_instance_json_id: null
		}

		factory.models.newChecklistInstance = function() {
			var checklist_record = {};

			angular.copy(factory.models.checklist_instance, checklist_record);
			checklist_record.date_started = new Date().getTime();
			checklist_record.started_by = authFactory.cloudUserId();
			checklist_record.company_id = authFactory.cloudCompanyId();
			checklist_record.user_id = authFactory.cloudUserId();
			checklist_record.client_id = authFactory.getActiveCompanyId();

			checklist_record.record_modified = 'Yes';

			return checklist_record;
		}

		factory.data_types.checklist_instance = {
			rm_id: 'integer',
			rm_checklist_blueprint_id: 'integer',
			rm_checklist_blueprint_ref: 'integer',
			rm_checklist_blueprint_revision_number: 'integer',
			rm_checklist_record_id: 'integer',
			rm_activity_id: 'integer', 
			rm_asset_id: 'integer',
			started_by: 'integer',
			status: 'integer',
			company_id: 'integer',
			client_id: 'integer',
			blueprint_record: 'integer',
			total_questions: 'integer',
			num_questions_complete: 'integer',
			percentage_complete: 'integer',
			num_sections_complete: 'integer',
			user_id: 'integer'
		};
		// END CHECKLIST INSTANCES

		// START CHECKLIST INSTANCE JSON
		factory.models.checklist_instance_json = {
			_id: null, 
			_rev: null, 
			checklist_instance_id: null, 
			rm_checklist_instance_id: null,
			uaudit_instance_data: null,
			synced: false,
			imported: false,
			date_record_synced: null, 
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			record_modified: 'No',
			rm_record: null,
			rm_record_modified: 'No',
			rm_record_copy: 'No',
			rm_record_copy_id: null
		}

		factory.models.newChecklistInstanceJson = function(relations) {
			var instance_record = {};

			angular.copy(factory.models.checklist_instance_json, instance_record);

			instance_record.record_modified = 'Yes';

			if( relations ) {
				
				for(var key in relations) {

					if( instance_record.hasOwnProperty(key) ) {
						instance_record[key] = relations[key];
					}

				}

			}

			return instance_record;
		}

		factory.data_types.checklist_instance_json = {
			rm_checklist_instance_id: 'integer'
		}
		// END CHECKLIST INSTANCE JSON

		// CHECKLIST QUESTION RECORDS
		factory.models.checklist_question = {
			_id: null, 
			_rev: null,
			rm_id: null,
			rm_question_id: null,
			rm_question_ref: null,
			rm_checklist_record_id: null,
			checklist_record_id: null,
			rm_section_id: null,
			rm_answer_id: null,
			rm_answer_ref: null,
			trigger_type: null,
			trigger_value: null,
			is_dependant: null,
			dependant_question_id: null,
			question_status: null,
			answer_type: null,
			answer_settings: null,
			answered: false,
			marked_completed_date: null,
			applicable: null,
			answer_id: null,
			answer_name: null,
			comments: null,
			date_answered: null,
			answered_by: null,
			company_id: authFactory.cloudCompanyId(),
			client_id: authFactory.getActiveCompanyId(),
			question: null,
			question_title: null,
			question_help: null,
			question_order: null,
			statutory_text: null,
			blueprint_question_record: null,
			cloned_from_id: null,
			cloned_from_rm_id: null,
			date_record_synced: null, 
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			user_id: authFactory.cloudUserId(),
			record_modified: 'No',
			rm_record: null,
			rm_record_modified: 'No'
		}

		factory.models.newChecklistQuestion = function() {
			var checklist_question = {};

			angular.copy(factory.models.checklist_question, checklist_question);
			checklist_question.company_id = authFactory.cloudCompanyId();
			checklist_question.user_id = authFactory.cloudUserId();
			checklist_question.client_id = authFactory.getActiveCompanyId();

			checklist_question.record_modified = 'Yes';

			return checklist_question;
		}

		factory.data_types.checklist_question = {
			rm_id: 'integer',
			rm_question_id: 'integer',
			rm_question_ref: 'integer',
			rm_checklist_record_id: 'integer',
			rm_section_id: 'integer',
			rm_answer_id: 'integer',
			rm_answer_ref: 'integer',
			dependant_question_id: 'integer',
			question_status: 'integer',
			answer_id: 'integer',
			answered_by: 'integer',
			company_id: 'integer',
			client_id: 'integer',
			question_order: 'integer',
			user_id: 'integer'
		}
		// END CHECKLIST QUESTION RECORDS

		// START RISK ASSESSMENTS
		factory.models.risk_assessment = {
			_id: null,
			_rev: null,
			rm_id: null,
			rm_ref: null,
			rm_revision_number: null,
			rm_activity_id: null, 
			rm_asset_id: null,
			synced: false,
			imported: false,
			activity_id: null,
			asset_id: null,
			status: 4, // DRAFT
			status_name: 'Draft',
			added_by: authFactory.cloudUserId(),
			date_added: new Date().getTime(),
			modified_by: null, 
			date_modified: null,
			company_id: authFactory.cloudCompanyId(),
			client_id: authFactory.getActiveCompanyId(),
			assessment_type: null,
			hazard_type: null,
			hazard_origin: null,
			hazard_consequence: null,
			hazard_description: null,
			control_description: null,
			assessment_method: 1, // DEFAULT PHA
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
			cloned_from_id: null, 
			cloned_from_rm_id: null, 
			cloned_from_rm_ref: null,
			local_draft_mr_copy: null,
			latest_local_draft_mr_copy: null,
			local_audit_mr_copy: null, 
			latest_local_audit_mr_copy: null,
			from_mr_version: null,
			mr_installed: null,
			subject_record_type: null,
			is_basic_ob: null,
			incident_type: null,
			obs_action_taken: null,
			contributors: null,
			file_request_designation: null,
			file_request_designation_name: null,
			file_expiry_frequency: null, 
			file_expiry_interval: null,
			date_record_synced: null, 
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			user_id: authFactory.cloudUserId(),
			record_modified: 'No',
			rm_record: null,
			rm_record_modified: 'No',
			quick_capture_risk: null,
			qc_modified: 'No',
			qc_deleted: 'No',
			display_pdf_id: null,
			rm_risk_profile_photo_id: null,
			urr_initial: null, 
			urr_phrase_initial: null, 
			urr_phrase_id_initial: null, 
			urr_after: null, 
			urr_phrase_after: null, 
			urr_phrase_id_after: null, 
			suggested_risk_id: null, 
			rm_suggested_risk_id: null,
			is_suggested_risk: null,
			is_closeout: null,
			rm_report_id: null, 
			rm_report_ref: null, 
			rm_report_guid: null, 
			rm_report_date: null,
			rm_report_status: null, 
			rm_report_status_name: null,
			rm_register_asset_id: null,
			approval_description: null, 
			approved: null, 
			approved_by: null,
			implementation_recorded_by: null,
			downloaded_rm_values: {},
			intended_closeout_action: null
		}

		factory.models.newRiskAssessment = function() {
			var risk_record = {};

			angular.copy(factory.models.risk_assessment, risk_record);
			risk_record.added_by = authFactory.cloudUserId();
			risk_record.user_id = authFactory.cloudUserId();
			risk_record.company_id = authFactory.cloudCompanyId();
			risk_record.date_added = new Date().getTime();
			risk_record.client_id = authFactory.getActiveCompanyId();

			risk_record.record_modified = 'Yes';

			return risk_record;
		};

		factory.data_types.risk_assessment = {
			rm_id: 'integer',
			rm_ref: 'integer',
			rm_revision_number: 'integer',
			rm_activity_id: 'integer', 
			rm_asset_id: 'integer',
			status: 'integer',
			added_by: 'integer',
			modified_by: 'integer',
			company_id: 'integer',
			client_id: 'integer',
			assessment_type: 'integer',
			hazard_type: 'integer',
			hazard_origin: 'integer',
			hazard_consequence: 'integer',
			assessment_method: 'integer',
			lo_initial: 'decimal',
			fe_initial: 'decimal',
			np_initial: 'decimal',
			dph_initial: 'decimal',
			hrn_initial: 'decimal',
			hrn_phrase_initial: 'decimal',
			lo_after: 'decimal',
			fe_after: 'decimal',
			np_after: 'decimal',
			dph_after: 'decimal',
			hrn_after: 'decimal',
			hrn_phrase_after: 'decimal',
			matrix_likelihood_initial: 'integer',
			matrix_consequence_initial: 'integer',
			matrix_score_initial: 'integer',
			matrix_likelihood_after: 'integer',
			matrix_consequence_after: 'integer',
			matrix_score_after: 'integer',
			simple_risk_phrase_id_initial: 'integer',
			simple_risk_phrase_id_after: 'integer',
			simple_risk_rating_initial: 'integer',
			simple_risk_rating_after: 'integer',
			cloned_from_rm_id: 'integer', 
			cloned_from_rm_ref: 'integer',
			user_id: 'integer',
			file_request_designation: 'integer',
			file_expiry_frequency: 'integer',
			rm_risk_profile_photo_id: 'integer',
			// urr_initial: 'integer',
			urr_phrase_id_initial: 'integer',
			// urr_after: 'integer', 
			urr_phrase_id_after: 'integer',
			rm_suggested_risk_id: 'integer',
			rm_report_id: 'integer',
			rm_report_ref: 'integer', 
			rm_register_asset_id: 'integer',
			approved_by: 'integer',
			implementation_recorded_by: 'integer'
		};
		// END RISK ASSESSMENTS

		// START RISK ASSESSMENT QUESTION RELATIONS
		factory.models.question_assessment_relation = {
			_id: null, 
			_rev: null,
			rm_id: null,
		    rm_checklist_record_id: null,
			checklist_record_id: null,
			rm_question_id: null,
			rm_question_ref: null,
		    question_id: null,
		    rm_question_record_id: null,
			question_record_id: null,
			rm_assessment_id: null,
		    rm_assessment_ref: null,
		    assessment_id: null,
		    rm_answer_record_id: null,
		    rm_activity_id: null, 
		    activity_id: null,
		    rm_asset_id: null, 
		    asset_id: null,
		    date_linked: null,
			company_id: null,
			client_id: null,
			added_by: null,
			status: 1,
			date_record_synced: null, 
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			user_id: authFactory.cloudUserId(),
			record_modified: 'No',
			rm_record: null,
			rm_record_modified: 'No',
			// UAUDIT
			question_record_uuid: null,
			question_uuid: null,
			is_uaudit: 'No'
		}

		factory.models.newQuestionAssessmentRelation = function() {
			var relation_record = {};

			angular.copy(factory.models.question_assessment_relation, relation_record);
			relation_record.added_by = authFactory.cloudUserId();
			relation_record.user_id = authFactory.cloudUserId();
			relation_record.company_id = authFactory.cloudCompanyId();
			relation_record.date_linked = new Date().getTime();
			relation_record.client_id = authFactory.getActiveCompanyId();

			relation_record.record_modified = 'Yes';

			return relation_record;
		}

		factory.data_types.question_assessment_relation = {
			rm_id: 'integer',
		    rm_checklist_record_id: 'integer',
			rm_question_id: 'integer',
			rm_question_ref: 'integer',
		    rm_question_record_id: 'integer',
			rm_assessment_id: 'integer',
		    rm_assessment_ref: 'integer',
		    rm_answer_record_id: 'integer',
		    rm_activity_id: 'integer',
		    rm_asset_id: 'integer',
			company_id: 'integer',
			client_id: 'integer',
			added_by: 'integer',
			status: 'integer',
			user_id: 'integer'
		}
		// END RISK ASSESSMENT QUESTION RELATIONS

		// START RISK ASSESSMENT CONTROL ITEM RELATIONS
		factory.models.assessment_control_relation = {
			_id: null, 
			_rev: null,
			rm_id: null,
		    rm_control_item_id: null,
		    rm_control_item_ref: null,
		    control_item_id: null,
		    rm_assessment_id: null,
		    rm_assessment_ref: null,
		    assessment_id: null,
		    rm_control_id: null,
		    rm_activity_id: null,
		    activity_id: null,
		    rm_asset_id: null,
			asset_id: null, 
			date_added: null,
			added_by: null,
			date_modified: null,
		    modified_by: null,
			status: 1,
			company_id: null,
			client_id: null,
			date_record_synced: null, 
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			user_id: authFactory.cloudUserId(),
			record_modified: 'No',
			rm_record: null,
			rm_record_modified: 'No'
		}

		factory.models.newAssessmentControlRelation = function() {
			var relation_record = {};

			angular.copy(factory.models.assessment_control_relation, relation_record);
			relation_record.date_added = new Date().getTime();
			relation_record.added_by = authFactory.cloudUserId();
			relation_record.date_modified = new Date().getTime();
			relation_record.modified_by = authFactory.cloudUserId();
			relation_record.user_id = authFactory.cloudUserId();
			relation_record.company_id = authFactory.cloudCompanyId();

			relation_record.record_modified = 'Yes';

			return relation_record;
		}

		factory.data_types.assessment_control_relation = {
			rm_id: 'integer',
		    rm_control_item_id: 'integer',
		    rm_control_item_ref: 'integer',
		    rm_assessment_id: 'integer',
		    rm_assessment_ref: 'integer',
		    rm_control_id: 'integer',
		    rm_activity_id: 'integer',
		    rm_asset_id: 'integer',
			added_by: 'integer',
		    modified_by: 'integer',
			status: 'integer',
			company_id: 'integer',
			client_id: 'integer',
			user_id: 'integer'
		}
		// END RISK ASSESSMENT CONTROL ITEM RELATIONS

		// START SITES
		factory.models.site = {
			_id: null, 
			_rev: null,
			rm_id: null,
            prefix: null,
            name: null,
            company_id: null,
            address_line_1: null,
            address_line_2: null,
            address_line_3: null,
            address_line_4: null,
            post_code: null,
            country: null,
            is_register: null,
            added_by: null,
            modified_by: null,
            activity_id: null,
            record_asset_id: null,
            status: 1,
            num_buildings: null,
            num_areas: null,
            num_assets: null,
            rm_record_asset_id: null,
            record_asset_ref: null,
            site_asset_description: null,
            date_added: null,
            date_modified: null,
            date_record_synced: null, 
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			user_id: authFactory.cloudUserId(),
			record_modified: 'No',
			rm_record: null,
			rm_record_modified: 'No',
			is_register: 'Yes',
			table: 'sites'
		};

		factory.models.newSite = function() {
			var site_record = {};

			angular.copy(factory.models.site, site_record);
			site_record.user_id = authFactory.cloudUserId();
			site_record.company_id = authFactory.getActiveCompanyId();
			site_record.date_added = new Date().getTime();
			site_record.added_by = authFactory.cloudUserId();
			site_record.date_modified = new Date().getTime();
			site_record.modified_by = authFactory.cloudUserId();

			site_record.record_modified = 'Yes';

			return site_record;
		};

		factory.data_types.site = {
			rm_id: 'integer',
			company_id: 'integer',
			user_id: 'integer',
			added_by: 'integer',
			modified_by: 'integer',
			status: 'integer',
			num_buildings: 'integer',
            num_areas: 'integer',
            num_assets: 'integer',
            activity_id: 'integer',
            rm_record_asset_id: 'integer'
		};
		// END SITES

		// START BUILDINGS
		factory.models.building = {
			_id: null,
			_rev: null,
			rm_id: null,
			site_id: null,
            rm_site_id: null,
            name: null,
            short_name: null,
            prefix: null,
            description: null,
            date_added: null,
            date_modified: null,
            rm_activity_id: null,
            rm_record_asset_id: null,
            record_asset_id: null,
            added_by: null,
            modified_by: null,
            status: 1,
            site_name: null,
            added_by_name: null,
            modified_by_name: null,
            num_areas: null,
            num_assets: null,
            record_asset_ref: null,
            record_asset_description: null,
			company_id: null, 
			date_record_synced: null, 
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			user_id: authFactory.cloudUserId(), 
			record_modified: 'No',
			rm_record: null,
			rm_record_modified: 'No',
			is_register: 'Yes',
			table: 'buildings'
		};

		factory.models.newBuilding = function(place_filters) {
			var building_record = {};

			angular.copy(factory.models.building, building_record);
			building_record.user_id = authFactory.cloudUserId();
			building_record.company_id = authFactory.getActiveCompanyId();
			building_record.date_added = new Date().getTime();
			building_record.added_by = authFactory.cloudUserId();
			building_record.date_modified = new Date().getTime();
			building_record.modified_by = authFactory.cloudUserId();

			building_record.site_id = place_filters.site.id;

			if( place_filters.site.record != null && place_filters.site.record.hasOwnProperty('name') ) {
				building_record.site_name = place_filters.site.record.name;
			};

			building_record.record_modified = 'Yes';

			return building_record;
		};

		factory.data_types.building = {
			rm_id: 'integer',
			rm_site_id: 'integer',
			company_id: 'integer',
			user_id: 'integer',
			added_by: 'integer',
			modified_by: 'integer',
			status: 'integer',
			num_areas: 'integer',
            num_assets: 'integer',
			rm_activity_id: 'integer',
            rm_record_asset_id: 'integer'
		};
		// END BUILDINGS

		// START AREAS
		factory.models.area = {
			_id: null,
			_rev: null,
			rm_id: null,
			rm_site_id: null,
			rm_building_id: null,
			site_id: null, 
			building_id: null,
			name: null,
			prefix: null,
			description: null,
			is_register: null,
			company_id: null,
			status: 1,
			site_name: null,
			address_line_1: null,
			address_line_2: null,
			address_line_3: null,
			address_line_4: null,
			post_code: null,
			country: null,
			building_name: null,
			building_short_name: null,
			building_prefix: null,
			building_description: null,
			num_assets: null,
			rm_record_asset_id: null,
			record_asset_id: null,
			area_asset_ref: null,
			area_description: null,
			added_by: null,
			modified_by: null,
			date_added: null,
			date_modified: null,
			date_record_synced: null, 
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			user_id: authFactory.cloudUserId(), 
			record_modified: 'No',
			rm_record: null,
			rm_record_modified: 'No',
			is_register: 'Yes',
			table: 'areas'
		};

		factory.models.newArea = function(place_filters) {
			var area_record = {};

			angular.copy(factory.models.area, area_record);
			area_record.user_id = authFactory.cloudUserId();
			area_record.company_id = authFactory.getActiveCompanyId();
			area_record.date_added = new Date().getTime();
			area_record.added_by = authFactory.cloudUserId();
			area_record.date_added = new Date().getTime();
			area_record.modified_by = authFactory.cloudUserId();

			area_record.site_id = place_filters.site.id;
			area_record.building_id = place_filters.building.id;

			if( place_filters.site.record != null && place_filters.site.record.hasOwnProperty('name') ) {
				area_record.site_name = place_filters.site.record.name;
			};

			if( place_filters.building.record != null && place_filters.building.record.hasOwnProperty('name') ) {
				area_record.building_name = place_filters.building.record.name;
			};

			area_record.record_modified = 'Yes';

			return area_record;
		};

		factory.data_types.area = {
			rm_id: 'integer',
			rm_site_id: 'integer',
			rm_building_id: 'integer',
			company_id: 'integer',
			user_id: 'integer',
			status: 'integer',
			rm_record_asset_id: 'integer',
			added_by: 'integer',
			modified_by: 'integer'
		};
		// END AREAS

		// START REGISTER ASSETS
		factory.models.register_asset = {
			_id: null,
			_rev: null,
			rm_id: null,
			rm_site_id: null,
			rm_building_id: null,
			rm_area_id: null,
			site_id: null, 
			building_id: null, 
			area_id: null,
			asset_ref: null,
			prefixed_asset_ref: null,
			location_prefix: null,
			serial: null,
			type: null,
			type_id: null,
			model: null,
			manufacturer: null,
			supplier: null,
			power: null,
			description: null,
			designation_id: null,
			installation_date: null,
			date_of_manufacture: null,
			authorised_rep: null,
			company_id: null,
			added_by: null,
			date_added: null,
			modified_by: null,
			date_modified: null,
			import_id: null,
			import_type: null,
			matrix_score: null,
			matrix_score_phrase: null,
			record_type: '',
			rm_record_id: null,
			record_id: null,
			status: 1,
			notes: null,
			external_system_ref: null,
			external_system_ref_2: null,
			external_system_ref_3: null,
			external_system_ref_4: null,
			external_system_ref_5: null,
			qr_codes: null,
			rm_division_id: null,
			division_name: null,
			lifespan: null,
			is_anonymous: 'No',
			rm_sub_area1_id: null,
			rm_sub_area2_id: null,
			rm_sub_area3_id: null,
			rm_sub_area4_id: null,
			rm_sub_area5_id: null,
			in_use: 'Yes',
			rm_asset_report_id: null,
			rm_asset_report_ref: null,
			asset_report_updated_by_id: null,
			asset_report_updated_by_name: null,
			asset_report_updated_date: null,
			rm_profile_image_media_id: null,
			profile_image_media_id: null,
			type_name: null,
			designation_name: null,
			site_name: null,
			site_prefix: null,
			address_line_1: null,
			address_line_2: null,
			address_line_3: null,
			address_line_4: null,
			post_code: null,
			country: null,
			building_name: null,
			building_prefix: null,
			building_short_name: null,
			building_description: null,
			area_name: null,
			area_prefix: null,
			area_description: null,
			rm_last_inspection_id: null,
			days_since_inspection: null,
			next_inspection_date: null,
			next_scheduled_inspection_date: null,
			days_to_next_inspection: null,
			rm_last_inspection_snapshot_id: null,
			inspection_due: null,
			last_inspection_date: null,
			puwer_interval: null,
			num_open_puwer_activities: null,
			rm_assembly_group_id: null,
			rm_parent_asset_id: null,
			parent_asset_id: null,
			parent_asset_ref: null,
			parent_asset_serial: null,
			parent_asset_model: null,
			parent_asset_type: null,
			deterioration_risk: null,
			excluded_from_inspection: null,
			requires_inspection: null,
			frequency_interval: null,
			frequency: null,
			ever_inspected: null,
			health_check_date: null,
			priority: null,
			priority_band: null,
			priority_band_number: null,
			has_profile_point: null,
			has_inspected_parent: null,
			agent_asset_size: null,
			agent_inspection_time: null,
			compliance_supplier_company_id: null,
			compliance_supplier_company_name: null,
			num_children: null,
			observation_text: null,
			matrix_likelihood_initial: null,
			matrix_likelihood_phrase_initial: null,
			matrix_consequence_initial: null,
			matrix_consequence_phrase_initial: null,
			matrix_score_initial: null,
			matrix_score_phrase_initial: null,
			has_pipp: null,
			date_record_synced: null, 
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			user_id: authFactory.cloudUserId(), 
			record_modified: 'No',
			rm_record: null,
			rm_record_modified: 'No',
			is_register: 'Yes',
			table: 'register_assets',
			associated_qr_codes: null,
			associated_ipp_scores: null, 
			associated_mr_meta: null
		};

		factory.models.newRegisterAsset = function(place_filters) {
			var asset_record = {};
			angular.copy(factory.models.register_asset, asset_record);

			asset_record.user_id = authFactory.cloudUserId();
			asset_record.company_id = authFactory.getActiveCompanyId();
			asset_record.date_added = new Date().getTime();
			asset_record.added_by = authFactory.cloudUserId();
			asset_record.date_modified = new Date().getTime();
			asset_record.modified_by = authFactory.cloudUserId();

			if( angular.isDefined(place_filters) && place_filters != null ) {

				asset_record.site_id = place_filters.site.id;
				asset_record.building_id = place_filters.building.id;
				asset_record.area_id = place_filters.area.id;

				if( place_filters.site.record != null && place_filters.site.record.hasOwnProperty('name') ) {
					asset_record.site_name = place_filters.site.record.name;
				};

				if( place_filters.building.record != null && place_filters.building.record.hasOwnProperty('name') ) {
					asset_record.building_name = place_filters.building.record.name;
				};

				if( place_filters.area.record != null && place_filters.area.record.hasOwnProperty('name') ) {
					asset_record.area_name = place_filters.area.record.name;
				};

			};

			asset_record.record_modified = 'Yes';

			return asset_record;
		};

		factory.data_types.register_asset = {
			rm_id: 'integer',
			rm_site_id: 'integer',
			rm_building_id: 'integer',
			rm_area_id: 'integer',
			company_id: 'integer',
			user_id: 'integer',
			status: 'integer',
			rm_record_asset_id: 'integer',
			added_by: 'integer',
			modified_by: 'integer',
			type_id: 'integer',
			designation_id: 'integer',
			import_id: 'integer',
			rm_record_id: 'integer',
			rm_division_id: 'integer',
			rm_sub_area1_id: 'integer',
			rm_sub_area2_id: 'integer',
			rm_sub_area3_id: 'integer',
			rm_sub_area4_id: 'integer',
			rm_sub_area5_id: 'integer',
			rm_asset_report_id: 'integer',
			rm_asset_report_ref: 'integer',
			asset_report_updated_by_id: 'integer',
			rm_profile_image_media_id: 'integer',
			rm_last_inspection_id: 'integer',
			days_since_inspection: 'integer',
			days_to_next_inspection: 'integer',
			rm_last_inspection_snapshot_id: 'integer',
			puwer_interval: 'integer',
			num_open_puwer_activities: 'integer',
			rm_assembly_group_id: 'integer',
			rm_parent_asset_id: 'integer',
			frequency: 'integer',
			priority: 'integer',	
			priority_band_number: 'integer',
			agent_inspection_time: 'integer',
			compliance_supplier_company_id: 'integer',
			num_children: 'integer',
			matrix_likelihood_initial: 'integer',
			matrix_consequence_initial: 'integer',
			matrix_score_initial: 'integer',
			matrix_score: 'integer'
		};
		// END ASSETS

		// START REGISTER TASKS
		// factory.models.register_task = {
		// 	_id: null,
		// 	_rev: null,
		// 	rm_id: null,
		// 	rm_ref: null,
		// 	revision_number: null,
		// 	title: null,
		// 	custom_title: null,
		// 	custom_title_2: null,
		// 	bank_id: null,
		// 	is_bank: null,
		// 	description: null,
		// 	notes: null,
		// 	phase_sequence_id: null,
		// 	intervention_type_id: null,
		// 	intervention_reason_id: null,
		// 	skill_level_id: null,
		// 	frequency_value: null,
		// 	frequency_unit: null,
		// 	duration_value: null,
		// 	duration_unit: null,
		// 	task_classification: null,
		// 	constant: null,
		// 	added_by: null,
		// 	behaviour_managed_risk_score: null,
		// 	behaviour_managed_risk_score_phrase: null,
		// 	residual_risk_score: null,
		// 	residual_risk_score_phrase: null,
		// 	date_added: null,
		// 	modified_by: null,
		// 	date_modified: null,
		// 	rm_asset_id: null,
		// 	asset_id: null,
		// 	company_id: null,
		// 	status_id: null,
		// 	group_leader: null,
		// 	group_type: null,
		// 	group_type_name: null,
		// 	task_verified: null,
		// 	task_type: null,
		// 	ce_warning: null,
		// 	bank_type_1: null,
		// 	bank_type_2: null,
		// 	high_low_frequency: null,
		// 	standardised: null,
		// 	task_order: null,
		// 	is_register: 'Yes',
		// 	is_library: null,
		// 	rm_parent_task_id: null,
		// 	parent_task_id: null,
		// 	rm_record_asset_id: null,
		// 	record_asset_id: null,
		// 	record_asset_ref: null,
		// 	record_asset_description: null,
		// 	rm_site_id: null,
		// 	rm_building_id: null,
		// 	rm_area_id: null,
		// 	site_id: null,
		// 	building_id: null,
		// 	area_id: null,
		// 	rm_subarea1_id: null,
		// 	rm_subarea2_id: null,
		// 	rm_subarea3_id: null,
		// 	rm_subarea4_id: null,
		// 	rm_subarea5_id: null,
		// 	task_status_name: null,
		// 	num_group_items: null,
		// 	num_unverified_items: null,
		// 	num_procedures: null,
		// 	asset_ref: null,
		// 	asset_serial: null,
		// 	asset_model: null,
		// 	asset_power: null,
		// 	asset_manufacturer: null,
		// 	asset_supplier: null,
		// 	rm_register_asset_id: null,
		// 	register_asset_id: null,
		// 	asset_sequence_number: null,
		// 	intervention_type_name: null,
		// 	intervention_reason_name: null,
		// 	skill_level_name: null,
		// 	phase_sequence_name: null,
		// 	added_by_name: null,
		// 	modified_by_name: null,
		// 	num_assessments: null,
		// 	num_locations: null,
		// 	num_htl: null,
		// 	latest_task_id: null,
		// 	date_record_synced: null, 
		// 	date_content_synced: null,
		// 	date_record_imported: null,
		// 	date_content_imported: null,
		// 	user_id: authFactory.cloudUserId(), 
		// 	record_modified: 'No',
		// 	rm_record: null,
		// 	rm_record_modified: 'No',
		// 	table: 'register_tasks'
		// };

		// factory.models.newRegisterTask = function() {

		// };

		// factory.models.newRegisterProcedure = function() {
		// 	var procedure_record = null;
		// 	angular.copy(factory.models.task, procedure_record);

		// 	procedure_record.record_modified = 'Yes';

		// 	return procedure_record;
		// };

		// factory.data_types.register_task = {
		// 	rm_id: 'integer',
		// 	rm_ref: 'integer',
		// 	revision_number: 'integer',
		// 	bank_id: 'integer',
		// 	phase_sequence_id: 'integer',
		// 	intervention_type_id: 'integer',
		// 	intervention_reason_id: 'integer',
		// 	skill_level_id: 'integer',
		// 	frequency_value: 'integer',
		// 	duration_value: 'integer',
		// 	added_by: 'integer',
		// 	behaviour_managed_risk_score: 'integer',
		// 	residual_risk_score: 'integer',
		// 	modified_by: 'integer',
		// 	rm_asset_id: 'integer',
		// 	company_id: 'integer',
		// 	status_id: 'integer',
		// 	group_type: 'integer',
		// 	bank_type_1: 'integer',
		// 	bank_type_2: 'integer',
		// 	task_order: 'integer',
		// 	rm_parent_task_id: 'integer',
		// 	rm_record_asset_id: 'integer',
		// 	rm_site_id: 'integer',
		// 	rm_building_id: 'integer',
		// 	rm_area_id: 'integer',
		// 	rm_subarea1_id: 'integer',
		// 	rm_subarea2_id: 'integer',
		// 	rm_subarea3_id: 'integer',
		// 	rm_subarea4_id: 'integer',
		// 	rm_subarea5_id: 'integer',
		// 	num_group_items: 'integer',
		// 	num_unverified_items: 'integer',
		// 	num_procedures: 'integer',
		// 	rm_register_asset_id: 'integer',
		// 	asset_sequence_number: 'integer',
		// 	num_assessments: 'integer',
		// 	num_locations: 'integer',
		// 	num_htl: 'integer',
		// 	latest_task_id: 'integer'
		// };
		// END TASKS

		// START MEDIA
		factory.models.media_record = {
			_id: null, 
			_rev: null,
			record_id: null,
			record_type: null,
			attachment_key: null,
			file_name: null,
			file_size: null,
			media_path: null,
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
			rm_video_id: null, 
			rm_video_ref: null,
			added_by: null,
			date_added: null,
			modified_by: null,
			date_modified: null,
			company_id: null,
			client_id: null,
			rm_activity_id: null,
			activity_id: null,
			cloned_from_id: null,
			cloned_from_rm_id: null, 
			cloned_from_modified_id: null,
			file_download_rm_id: null,
			file_does_not_exist: false,
			sequence_number: null,
			annotations: null,
			date_record_synced: null, 
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			user_id: authFactory.cloudUserId(), 
			record_modified: 'No',
			rm_record: null,
			rm_record_modified: 'No',
			item_not_found: null,
			file_downloaded: null,
			representative_image: null,
			reference_media: null,
			_attachments: null,
			is_register: 'No',
			table: 'mediarecords',
			removed_from_sync: false,
			insensitive_media: null,
			date_insensitive_media: null,
			insensitive_media_by: null,
			insensitive_media_reason: null,
			display_pdf: null,
			superseeded: null,
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
			is_file: null,
			submission_approved: null, 
			submission_date: null, 
			rm_submission_id: null,
			submission_review_date: null, 
			submission_review_description: null, 
			approval_message: null,
			approval_status: null,
			checked_by_id: null, 
			checked_by_name: null, 
			date_checked: null,
			no_evidence_reason: null
		};

		factory.models.newMediaRecord = function(record_id, record_type) {
			var media_record = {};

			angular.copy(factory.models.media_record, media_record);
			media_record.user_id = authFactory.cloudUserId();
			media_record.company_id = authFactory.cloudCompanyId();
			media_record.record_id = record_id;
			media_record.record_type = record_type;
			media_record.date_added = Date.now();
			media_record.file_downloaded = 'Yes';
			media_record.record_modified = 'Yes';
			media_record.client_id = authFactory.getClientId();

			return media_record;
		};

		factory.models.newDisplayPdf = function(record_id, rm_record_id, record_type) {
			var media_record = {};

			angular.copy(factory.models.media_record, media_record);
			media_record.user_id = authFactory.cloudUserId();
			media_record.company_id = authFactory.cloudCompanyId();
			media_record.record_id = record_id;
			media_record.rm_record_item_id = rm_record_id;
			media_record.record_type = record_type;
			media_record.date_added = Date.now();
			media_record.file_downloaded = null;
			media_record.record_modified = 'No';
			media_record.client_id = authFactory.getClientId();
			media_record.is_pdf = 'Yes';
			media_record.removed_from_sync = true;
			media_record.display_pdf = 'Yes';

			return media_record;
		}

		factory.data_types.media_record = {
			file_size: 'integer',
			status: 'integer',
			rm_id: 'integer',
			rm_ref: 'integer',
			rm_revision_number: 'integer',
			rm_record_item_id: 'integer',
			rm_record_item_ref: 'integer',
			rm_video_id: 'integer', 
			rm_video_ref: 'integer',
			added_by: 'integer',
			modified_by: 'integer',
			company_id: 'integer',
			client_id: 'integer',
			rm_activity_id: 'integer',
			cloned_from_rm_id: 'integer',
			file_download_rm_id: 'integer',
			user_id: 'integer',
			rm_submission_id: 'integer',
			checked_by_id: 'integer'
		};
		// END MEDIA

		// START IPP SCORES
		factory.models.ipp_score = {
			_id: null, 
			_rev: null,
			rm_asset_id: null,
			asset_id: null,
			asset_ref: null,
			company_id: null,
			matrix_likelihood_initial: null,
			matrix_likelihood_phrase_initial: null,
			matrix_consequence_initial: null,
			matrix_consequence_phrase_initial: null,
			matrix_score_initial: null,
			matrix_score_phrase_initial: null,
			pipp_notes: null,
			date_added: null,
			users_company_name: null,
			users_name: null,
			deterioration_risk: null,
			rm_pp_asset_relation_id: null,
			rm_profile_point_id: null,
			rm_profile_point_ref: null,
			pipp_requires_inspection: null,
			pipp_requires_inspection_manual: null,
			excluded_from_inspection: null,
			frequency_interval: 'year',
			frequency: 1,
			interval_seconds: null,
			ever_inspected: null,
			inspection_required: null,
			has_scheduled: null,
			intervals_valid: null,
			equally_spaced: null,
			health_check_date: null,
			paused_until: null,
			priority: null,
			priority_band_number: null,
			priority_band: null,
			recommended_priority: null,
			recommended_priority_band: null,
			recommended_priority_band_number: null,
			agent_asset_size: null,
			agent_inspection_time: null,
			last_inspected_date: null,
			next_inspection_due_date: null,
			next_scheduled_date: null,
			days_to_scheduled_inspection: null,
			status: 1,
			date_record_synced: null, 
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			user_id: authFactory.cloudUserId(), 
			record_modified: 'No',
			rm_record: null,
			rm_record_modified: 'No',
			is_register: 'Yes',
			table: 'register_asset_ipp',
			rm_site_id: null, 
			rm_building_id: null, 
			rm_area_id: null,
			rasic: null, 
			rasic_num_allocations: null,
			next_inspection_due_date: null,
			profile_point_name: null,
			audit_id: null, 
			audit_started: null,
			cloud_audit_started: null,
			effective_exceeds_requirement: null,
			effective_next_inspection_date: null, 
			effective_next_inspection_date_month: null, 
			effective_next_inspection_date_week: null, 
			schedule_locked: null,
			schedule_locked_date: null, 
			schedule_locked_by_name: null, 
			date_scheduled_custom: null,
			profile_image_path: null, 
			assign_user_id: null, 
			assigned_user_name: null, 
			assigned_user_date: null,
			lpa_programme_id: null, 
			lpa_programme_name: null,
			lpa_is_group: null, 
			lpa_not_required: null, 
			lpa_layer_id: null, 
			lpa_layer_number: null, 
			lpa_group_id: null, 
			lpa_checklist_ref: null,
			lpa_available: null, 
			lpa_group_complete: null, 
			lpa_snapshot_activity_id: null, 
			lpa_snapshot_asset_id: null, 
			lpa_report_ref: null,
			lpa_next_layer_id: null, 
			lpa_next_layer_name: null,
			lpa_date_audit_completed: null, 
			lpa_requires_review: null, 
			lpa_review_completed: null, 
			lpa_review_completed_by: null, 
			lpa_review_completed_date: null, 
			lpa_is_sample_layer: null,
			is_lpa: null,
			date_started: null, 
			started_by_rm_id: null, 
			started_by_name: null,
			asset_status: null, 
			asset_in_use: null,
			rm_claimed_by_user_id: null, 
			claimed_by_user_name: null, 
			claimed_date: null
		};

		factory.models.newIppScore = function(asset_id, profile_point) {
			var ipp_score = {};
			angular.copy(factory.models.ipp_score, ipp_score);

			ipp_score.asset_id = asset_id;
			ipp_score.rm_profile_point_ref = profile_point.ProfileRef;
			ipp_score.rm_profile_point_id = profile_point.ProfileID;

			if( profile_point.Frequency ) {
				ipp_score.frequency = profile_point.Frequency;
			}

			if( profile_point.FrequencyInterval ) {
				ipp_score.frequency_interval = profile_point.FrequencyInterval;
			}

			ipp_score.deterioration_risk = 'Yes';
			ipp_score.excluded_from_inspection = 'No';

			ipp_score.user_id = authFactory.cloudUserId();
			ipp_score.company_id = authFactory.getActiveCompanyId();
			ipp_score.date_added = new Date().getTime();
			ipp_score.added_by = authFactory.cloudUserId();
			ipp_score.date_modified = new Date().getTime();
			ipp_score.modified_by = authFactory.cloudUserId();

			ipp_score.record_modified = 'Yes';

			return ipp_score;
		};

		factory.data_types.ipp_score = {
			rm_asset_id: 'integer',
			company_id: 'integer',
			matrix_likelihood_initial: 'integer',
			matrix_consequence_initial: 'integer',
			matrix_score_initial: 'integer',
			rm_pp_asset_relation_id: 'integer',
			rm_profile_point_id: 'integer',
			rm_profile_point_ref: 'integer',
			frequency: 'integer',
			interval_seconds: 'integer',
			priority: 'integer',
			priority_band_number: 'integer',
			recommended_priority: 'integer',
			recommended_priority_band_number: 'integer',
			agent_asset_size: 'integer',
			agent_inspection_time: 'integer',
			days_to_scheduled_inspection: 'integer',
			user_id: 'integer', 
			status: 'integer',
			rm_site_id: 'integer',
			rm_building_id: 'integer',
			rm_area_id: 'integer',
			assign_user_id: 'integer',
			lpa_programme_id: 'integer',
			lpa_layer_id: 'integer',
			lpa_layer_number: 'integer',
			lpa_group_id: 'integer',
			lpa_checklist_ref: 'integer',
			lpa_snapshot_activity_id: 'integer', 
			lpa_snapshot_asset_id: 'integer', 
			lpa_report_ref: 'integer',
			lpa_next_layer_id: 'integer',
			lpa_review_completed_by: 'integer', 
			started_by_rm_id: 'integer',
			asset_status: 'integer',
			rm_claimed_by_user_id: 'integer'
		};
		// END IPP SCORES

		// START QR RECORDS
		factory.models.qr_record = {
			_id: null, 
			_rev: null,
			rm_id: null,
			date_created: null,
			batch_num: null,
			code: null,
			qr_id: null,
			date_exported: null,
			date_linked: null,
			system: 'RiskMach',
			record_type: null,
			rm_record_id: null,
			record_id: null,
			linked_by: null,
			company_id: null,
			user_id: null,
			rm_subject_owner_company_id: null,
			date_subject_owner_company_id: null,
			date_subject_owner_company_id_change: null,
			DateRetired: null,
			retired_by: null,
			retired_reason: null, 
			date_record_synced: null, 
			date_content_synced: null,
			date_record_imported: null,
			date_content_imported: null,
			record_modified: 'No',
			rm_record: null,
			rm_record_modified: 'No',
			table: 'qr_register',
			geo_data: null,
			geo_error: null,
			geo_date: null
		};

		factory.models.newQrRecord = function(code, record_id, record_type) {
			var qr_record = {};
			angular.copy(factory.models.qr_record, qr_record);

			qr_record.record_id = record_id;
			qr_record.record_type = record_type;

			qr_record.qr_id = code;
			qr_record.date_linked = new Date().getTime();
			qr_record.linked_by = authFactory.cloudUserId();
			qr_record.company_id = authFactory.cloudCompanyId();
			qr_record.user_id = authFactory.cloudUserId();
			qr_record.rm_subject_owner_company_id = authFactory.getActiveCompanyId();
			qr_record.date_subject_owner_company_id = new Date().getTime();

			qr_record.record_modified = 'Yes';

			return qr_record;
		};

		factory.data_types.qr_record = {
			rm_id: 'integer',
			batch_num: 'integer',
			rm_record_id: 'integer',
			linked_by: 'integer',
			company_id: 'integer',
			rm_subject_owner_company_id: 'integer',
			retired_by: 'integer',
			qr_id: 'integer'
		};
		// END QR RECORDS

		// START FETCH RECORDS
		factory.models.fetch_record = {
			_id: null,
			_rev: null,
			user_id: null, 
			company_id: null,
			date_started: null, 
			date_fetched: null, 
			date_installed: null,
			date_updates_run: null,
			date_finished: null,
			status: null, 
			last_status_date: null, 
			current_stage: null, 
			fetch_type: null, 
			fetch_record_id: null,
			fetch_record_type: null,
			error_message: null,
			date_synced: null, 
			date_imported: null, 
			aborted: null, 
			date_aborted: null, 
			total_fetch_items: 0,
			total_fetch_items_installed: 0,
			latest_fetch: null,
			table: 'fetch_records', 
			is_partial_download: 'No'
		};
		// END FETCH RECORDS

		// START FETCH ITEMS
		factory.models.fetch_item = {
			_id: null, 
			_rev: null,
			fetch_id: null,
			stage: null, 
			status: null,
			display_name: null,
			date_started: null,
			date_fetched: null,
			date_installed: null,
			date_updates_run: null,
			total_items: 0,
			total_items_installed: 0,
			page_last_installed: 0,
			wrote_to_json: null,
			fetch_error_date: null,
			install_error_date: null,
			fetch_error_message: null,
			install_error_message: null,
			rm_site_id: null,
			num_fetch_attempts: 0, 
			num_install_attempts: 0,
			endpoint: null,
			params: null,
			sequence_order: null,
			id_keys: {},
			ref_keys: {},
			table: 'fetch_items'
		};
		// END FETCH ITEMS

		// START FETCH ITEM DATA
		factory.models.fetch_item_data = {
			_id: null, 
			_rev: null, 
			fetch_item_id: null,
			fetch_item_stage: null,
			page_num: null, 
			data: null,
			date_added: null, 
			table: 'fetch_item_data'
		};
		// END FETCH ITEM DATA

		// MR META DATA
		factory.models.subject_mr_meta = {
			_id: null, 
			_rev: null,
			rm_subject_record_id: null, 
			subject_record_id: null, 
			subject_record_type: null, 
			data: null, 
			user_id: null, 
			company_id: null, 
			date_downloaded: null, 
			date_last_installed: null,
			date_full_meta_downloaded: null
		}

		factory.models.newSubjectMrMeta = function() {
			var record = {};
			angular.copy(factory.models.subject_mr_meta, record);

			record.user_id = authFactory.cloudUserId();
			record.company_id = authFactory.cloudCompanyId();
			record.date_downloaded = new Date().getTime();
			record.client_id = authFactory.getActiveCompanyId();

			return record;
		}
		// MR META DATA

		// START CONTRACTORS
		factory.models.contractor = {
			_id: null, 
			_rev: null,
			rm_id: null,
			rm_activity_id: null, 
			activity_id: null,
			added_by: null,
			address_line_1: null, 
			address_line_2: null,
			address_line_3: null, 
			address_line_4: null, 
			rm_audit_asset_id: null, 
			rm_audit_project_id: null,
			audit_asset_id: null, 
			audit_project_id: null, 
			company_id: null,
			company_name: null,
			company_registration_number: null, 
			rm_contractor_report_id: null, 
			rm_contractor_report_ref: null, 
			rm_contractor_reported: null, 
			country: null, 
			date_added: null, 
			date_modified: null, 
			description: null,
			is_on_contractor_register: null,
			is_register: null, 
			modified_by: null, 
			num_permits: null, 
			rm_parent_contractor_id: null, 
			parent_contractor_id: null, 
			post_code: null, 
			primary_contact_email: null, 
			primary_contact_mobile: null,
			primary_contact_name: null, 
			primary_contact_telephone: null, 
			rm_record_asset_id: null, 
			record_asset_id: null, 
			rm_register_contractor_id: null, 
			register_contractor_id: null, 
			secondary_contact_email: null, 
			secondary_contact_mobile: null, 
			secondary_contact_name: null, 
			secondary_contact_telephone: null, 
			status: null, 
			website: null,
			user_id: null,
			record_modified: 'No', 
			synced: false, 
			imported: false,
			date_record_synced: null, 
			date_content_synced: null, 
			date_record_imported: null, 
			date_content_imported: null,
			rm_record: null,
			rm_record_modified: 'No'
		}

		factory.models.newContractor = function() {
			var record = {};
			angular.copy(factory.models.contractor, record);

			record.record_modified = 'Yes';

			record.status = 1;
			record.date_added = new Date().getTime();
			record.added_by = authFactory.cloudUserId();
			record.user_id = authFactory.cloudUserId();
			record.company_id = authFactory.cloudCompanyId();

			record.is_register = 'No';

			return record;
		}
		// END CONTRACTORS

		// START PERMITS
		factory.models.permit = {
			_id: null, 
			_rev: null,
			rm_id: null, 
			rm_activity_id: null, 
			activity_id: null, 
			added_by: null, 
			applicant_pin: null, 
			application_token: null, 
			archived: null, 
			cancellation_reason: null, 
			company_id: null,
			rm_contractor_id: null, 
			contractor_id: null, 
			rm_register_contractor_id: null, 
			register_contractor_id: null,
			date_added: null, 
			date_modified: null, 
			date_permit_sent: null,
			deleted: null,
			description: null,
			group_permit: null, 
			modified_by: null, 
			permit_expiration_date: null,
			permit_expiration_date_timestamp: null,
			permit_expired: null, 
			permit_start_date: null,
			permit_start_date_timestamp: null,
			permit_status: null, 
			sent_to_email: null, 
			sent_to_name: null,
			status: null,
			application_status: null,
			title: null,
			rm_application_checklist_id: null, 
			application_checklist_id: null, 
			rm_register_record_id: null,
			register_record_id: null, 
			register_record_type: null,
			user_id: null, 
			synced: false, 
			imported: false,
			date_record_synced: null, 
			date_content_synced: null, 
			date_record_imported: null, 
			date_content_imported: null, 
			record_modified: 'No',
			rm_record: null, 
			rm_record_modified: 'No'
		}

		factory.models.newPermit = function() {
			var record = {};
			angular.copy(factory.models.permit, record);

			record.record_modified = 'Yes';

			record.date_added = new Date().getTime();
			record.added_by = authFactory.cloudUserId();
			record.user_id = authFactory.cloudUserId();
			record.company_id = authFactory.cloudCompanyId();

			// record.permit_start_date = new Date();
			// record.permit_expiration_date = new Date();

			var start_date_o = new Date();
			var start_date = start_date_o.getFullYear() + '-' + ('0' + (start_date_o.getMonth()+1)).slice(-2) + '-' + ('0' + start_date_o.getDate()).slice(-2);
			var start_date_timestamp = new Date(start_date).getTime();

			record.permit_start_date = start_date;
			record.permit_expiration_date = start_date;

			record.permit_start_date_timestamp = start_date_timestamp;
			record.permit_expiration_date_timestamp = start_date_timestamp;

			return record;
		}
		// END PERMITS

		// START USERS
		factory.models.user = {
			_id: null, 
			_rev: null,
			rm_id: null,
			company_id: null,
			contractor_company_name: null, 
			rm_contractor_id: null, 
			contractor_id: null, 
			email_address: null, 
			first_name: null, 
			last_name: null, 
			phone_number: null, 
			position: null, 
			status: null, 
			user_id: null, 
			user_type: null, 
			record_modified: 'No',
			date_record_synced: null, 
			date_content_synced: null, 
			date_record_imported: null, 
			date_content_imported: null,
			rm_record: null, 
			rm_record_modified: 'No'
		}

		factory.models.newUser = function() {
			var record = {};
			angular.copy(factory.models.user, record);

			return record;
		}
		// END USERS


		// START QC CHECK RECORDS
		factory.models.qc_check_record = {
			_id: null, 
			_rev: null, 
			user_id: null, 
			company_id: null,
			activity_id: null, 
			assessment_id: null,
			report_id: null,
			date_record_synced: new Date().getTime(), 
			date_content_synced: new Date().getTime(), 
			date_record_imported: null, 
			date_content_imported: null, 
			record_modified: 'No',
			rm_record: null, 
			rm_record_modified: 'No',
			synced: true, 
			imported: false,
			ID: null,
			ReviewID: null, 
			AssessmentID: null, 
			ReviewedBy: null, 
			ReviewDate: null,
			ReviewStatus: null, 
			ReviewText: null, 
			RejectionLevel: null, 
			RejectionOutcome: null, 
			RevisedAssessmentID: null, 
			AssessmentRef: null, 
			AssessmentAddedBy: null, 
			ReviewersFullName: null, 
			Deleted: null, 
			Revised: null
		}

		factory.models.newQcCheckRecord = function(activity_id) {
			var record = angular.copy(factory.models.qc_check_record);

			// QC RECORDS ARE ONLY IMPORTED, NOT SYNCED
			record.date_record_synced = new Date().getTime();
			record.date_content_synced = new Date().getTime();
			record.synced = true;

			// INDEX VALUES
			record.user_id = authFactory.cloudUserId();
			record.company_id = authFactory.cloudCompanyId();
			record.activity_id = activity_id;

			record.ReviewStatus = 1;

			return record;
		}

		factory.data_types.qc_check_record = {
			ID: 'integer',
			ReviewID: 'integer', 
			AssessmentID: 'integer', 
			ReviewedBy: 'integer', 
			ReviewStatus: 'integer',
			RevisedAssessmentID: 'integer', 
			AssessmentRef: 'integer',
			AssessmentAddedBy: 'integer'
		}
		// END QC CHECK RECORDS


		// START QR SCANS
		factory.models.qr_scan = {
			user_id: null, 
			company_id: null, 
			client_id: null, 
			date_first_scanned: null, 
			date_last_scanned: null, 
			qr_url: null, 
			qr_code: null,
			full_qr_code: null,
			geo_data: null,
			geo_error: null, 
			geo_date: null,
			record_id: null, 
			record_type: null, 
			lookup_type: null
		}

		factory.models.newQrScan = function() {
			var record = angular.copy(factory.models.qr_scan);

			record.user_id = authFactory.rmCloudUserId();
			record.company_id = authFactory.cloudCompanyId();
			record.client_id = authFactory.getClientId();

			return record;
		}

		factory.data_types.qr_scan = {
			user_id: 'integer',
			company_id: 'integer',
			client_id: 'integer',
			qr_code: 'integer'
		}
		// END QR SCANS


		// START RASIC
		factory.models.rasic = {
			_id: null,
			_rev: null,
			rasic_id: null,
			date_added: null,
			grantee_id: null,
			record_type: null,
			rm_record_id: null,
			rm_record_ref: null,
			manager: null,
			r: null,
			a: null,
			s: null,
			i: null,
			c: null,
			user_status: null,
			user_status_date: null,
			added_by_id: null,
			role_title: null,
			role_description: null,
			is_team: null,
			first_name: null,
			last_name: null,
			email_address: null,
			phone_number: null,
			user_type: null,
			user_id: null,
			date_record_synced: null, 
			date_content_synced: null, 
			date_record_imported: null, 
			date_content_imported: null, 
			record_modified: 'No',
			rm_record: null, 
			rm_record_modified: 'No',
			synced: true, 
			imported: false
		}

		factory.data_types.rasic = {
			rasic_id: 'integer',
			grantee_id: 'integer',
			rm_record_id: 'integer',
			rm_record_ref: 'integer',
			user_status: 'integer',
			added_by_id: 'integer',
			user_type: 'integer'
		}
		// END RASIC


		// START COMPANY FEATURE LICENSES
		factory.models.feature_license = {
			_id: null,
			_rev: null,
			company_id: null,
			data: null,
			company_record: null,
			date_added: new Date().getTime(), 
			date_updated: new Date().getTime()
		}

		factory.models.newFeatureLicense = function(company_id) {
			var record = angular.copy(factory.models.feature_license);

			record.company_id = company_id;
			record.date_added = new Date().getTime();
			record.date_updated = new Date().getTime();

			return record;
		}
		// END COMPANY FEATURE LICENSES



		factory.utils = {
			formatRmRecordToModel: function(model_type, rm_record) {

				var model = factory.models[model_type];

				Object.keys(model).forEach(function(key) {
					
					// IF RM RECORD DOESN'T HAVE KEY
					if( !rm_record.hasOwnProperty(key) ) {

						// CREATE KEY WITH DEFAULT MODEL VALUE
						rm_record[key] = model[key];
					}

					if( rm_record[key] != null && rm_record[key] != '' ) {

						// IF DATA TYPE IS SET UP FOR RECORD TYPE
						if( factory.data_types.hasOwnProperty(model_type) ) {

							// IF MODELS KEY EXISTS IN RECORDS DATA TYPE OBJECT
							if( factory.data_types[model_type].hasOwnProperty(key) ) {

								var value = null;

								if( factory.data_types[model_type][key] == 'integer' ) {
									value = parseInt( rm_record[key] );
								}

								if( factory.data_types[model_type][key] == 'decimal' ) {
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
		}

		return factory;
	}

}())