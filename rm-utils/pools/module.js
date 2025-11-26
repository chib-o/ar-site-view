(function() {

	var app = angular.module('riskmachPools', ['angular-jwt','riskmachUtils','riskmachDatabases','riskmachMedia','riskmachCloneUtils','riskmachProjectDownload','riskmachFetchUtils','riskmachModels']);
	app.controller('riskPoolListingController', riskPoolListingController);
	app.controller('riskPoolInfoController', riskPoolInfoController);
	app.factory('poolFactory', poolFactory);
	app.directive('riskPoolList', riskPoolList);
	app.directive('riskPoolInfo', riskPoolInfo);

	function riskPoolListingController($scope, $rootScope, $q, $filter, poolFactory, cloneUtilsFactory, riskmachDatabasesFactory, authFactory, mediaFactory, projectDownloadFactory, fetchUtilsFactory) 
	{
		var vm = this;

		vm.utils = {
			relations: vm.relations,
			dest_relations: vm.destrelations,
			exit: function(){
				$rootScope.$broadcast("riskPoolList::exit");
			},
			pool_listing: {
				loading: false,
				downloading_pools: false,
				data: [],
				visible_data: [],
				question_relations: [],
				filters: {
					general_search: '', 
					linked_question: true
				},
				pagination: {
					items_per_page: 20
				},
				refresh: function() {
					var defer = $q.defer();

					if( !vm.utils.relations.hasOwnProperty('rm_activity_id') || !vm.utils.relations.rm_activity_id ) {
						vm.utils.pool_listing.loading = false;
						defer.resolve();
						return defer.promise;
					}

					if( !vm.utils.relations.hasOwnProperty('activity_id') || !vm.utils.relations.activity_id ) {
						vm.utils.pool_listing.loading = false;
						defer.resolve();
						return defer.promise;
					}

					console.log("HAS PROJECT ACTIVITY ID");

					vm.utils.pool_listing.loading = true;

					vm.utils.pool_listing.getPoolAssessments().then(function() {

						vm.utils.pool_listing.getQuestionRelations().then(function() {

							vm.utils.pool_listing.loading = false;

							vm.utils.pool_listing.calcActiveQuestionLinks();
							vm.utils.pool_listing.autoFilter();

							vm.utils.pool_listing.getPoolAssessmentProfileImages();

							defer.resolve();
						});

					});

					return defer.promise;
				},
				getPoolAssessments: function() {
					var defer = $q.defer();

					poolFactory.dbUtils.getPoolAssessments(vm.utils.relations).then(function(data) {
						vm.utils.pool_listing.data = data;

						defer.resolve();

					}, function(error) {
						alert(error);
						defer.reject(error);
					});

					return defer.promise;
				},
				getPoolAssessmentProfileImages: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();

					if( !vm.utils.active_pool_project.record ) {
						defer.resolve();
						return defer.promise;
					}

					if( !vm.utils.active_pool_project.record.hasOwnProperty('profile_imgs_optimised') || vm.utils.active_pool_project.record.profile_imgs_optimised != 'Yes' ) {
						vm.utils.pool_listing.optimising_profile_imgs = true;
					}

					var start_timestamp = new Date().getTime();

					getNextProfileImage(fetch_defer, 0).then(function() {

						var end_timestamp = new Date().getTime();

						var timestamp_diff = end_timestamp - start_timestamp;

						console.log( mediaFactory.profile_imgs.risks );

						console.log("TIME TAKEN");
						console.log(timestamp_diff);

						vm.utils.pool_listing.optimising_profile_imgs = false;

						var db = riskmachDatabasesFactory.databases.collection.projects;

						vm.utils.active_pool_project.record.profile_imgs_optimised = 'Yes';

						db.put(vm.utils.active_pool_project.record).then(function(result) {
							vm.utils.active_pool_project.record._id = result.id;
							vm.utils.active_pool_project.record._rev = result.rev;

						}).catch(function(error) {
							defer.reject(error);
						});

						defer.resolve();

					}, function(error) {
						vm.utils.pool_listing.optimising_profile_imgs = false;
						defer.reject(error);
					});

					function getNextProfileImage(defer, active_index) {

						if( active_index > vm.utils.pool_listing.data.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						vm.utils.pool_risk_media.calcRiskProfileImg(vm.utils.pool_listing.data[active_index], false).then(function() {

							active_index++;
							getNextProfileImage(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					return defer.promise;
				},
				getQuestionRelations: function() {
					var defer = $q.defer();

					// IF NO ACTIVE QUESTION
					if( !vm.utils.relations.rm_question_ref && !vm.utils.relations.question_uuid ) {
						defer.resolve([]);
						return defer.promise;
					}

					// NORMAL QUESTION RELATIONS
					if( vm.utils.relations.rm_question_ref ) {
						vm.utils.pool_listing.getNormalChecklistQuestionRelations().then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});
					}

					// UAUDIT QUESTION RELATIONS
					if( vm.utils.relations.question_uuid ) {
						vm.utils.pool_listing.getUAuditQuestionRelations().then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});
					}

					return defer.promise;
				},
				getNormalChecklistQuestionRelations: function() {
					var defer = $q.defer();

					// IF NO ACTIVE QUESTION
					if( !vm.utils.relations.rm_question_ref ) {
						defer.resolve([]);
						return defer.promise;
					}

					riskmachDatabasesFactory.databases.collection.ra_question_relations.find({
						selector: {
							rm_question_ref: vm.utils.relations.rm_question_ref,
							user_id: authFactory.cloudUserId(),
							company_id: authFactory.cloudCompanyId()
						}
					}).then(function(results){
						vm.utils.pool_listing.question_relations = results.docs;
						console.log("GOT POOL QUESTION ASSESSMENT RELATIONS");
						console.log(vm.utils.pool_listing.question_relations);
						defer.resolve();
					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getUAuditQuestionRelations: function() {
					var defer = $q.defer();
					var fetch_defer = $q.defer();
					var db = riskmachDatabasesFactory.databases.collection.ra_question_relations;
					var relations = [];
					var options = {
						limit: 200, 
						include_docs: true
					}

					fetchNextPage(fetch_defer).then(function() {
						
						vm.utils.pool_listing.question_relations = relations;
						console.log("GOT UAUDIT POOL QUESTION ASSESSMENT RELATIONS");
						console.log(vm.utils.pool_listing.question_relations);

						defer.resolve();	

					}, function(error) {
						defer.reject(error);
					});

					function fetchNextPage(defer) {

						db.allDocs(options).then(function(result) {

							if( result && result.rows.length ) {

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

									if( !result.rows[i].doc.hasOwnProperty('question_uuid') || result.rows[i].doc.question_uuid != vm.utils.relations.question_uuid ) {
										errors++;
									}

									if( !errors ) {
										relations.push( result.rows[i].doc );
									}

									i++;
								}

								options.startkey = result.rows[ result.rows.length - 1 ].id;
								options.skip = 1;

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
				calcActiveQuestionLinks: function() {
					var active_question_ref = null;
					var active_question_uuid = null;

					if( vm.utils.relations.hasOwnProperty('rm_question_ref') && vm.utils.relations.rm_question_ref ) {
						active_question_ref = vm.utils.relations.rm_question_ref;
					}

					if( vm.utils.relations.hasOwnProperty('question_uuid') && vm.utils.relations.question_uuid ) {
						active_question_uuid = vm.utils.relations.question_uuid;
					}

					angular.forEach(vm.utils.pool_listing.data, function(ra_record, ra_index){

						// IF NO ACTIVE QUESTION, NOT LINKED BY DEFAULT
						if( !active_question_ref && !active_question_uuid ) {
							ra_record.linked_question = false;
						}

						//IF THERE IS AN ACTIVE QUESTION FIND RELATION
						if( active_question_ref ) {
							ra_record.linked_question = false;

							angular.forEach(vm.utils.pool_listing.question_relations, function(rel_record, rel_index){

								if( rel_record.rm_question_ref == active_question_ref && ra_record._id == rel_record.assessment_id && parseInt(rel_record.status) == 1 )
								{
									ra_record.linked_question = true;
								}

							});
						}

						//IF THERE IS AN ACTIVE QUESTION UUID FIND RELATION
						if( active_question_uuid )
						{
							ra_record.linked_question = false;

							angular.forEach(vm.utils.pool_listing.question_relations, function(rel_record, rel_index){

								if( rel_record.question_uuid == active_question_uuid && ra_record._id == rel_record.assessment_id && parseInt(rel_record.status) == 1 )
								{
									ra_record.linked_question = true;
								}

							});
						}

					});
				},
				autoFilter: function(){
					var visible_data = [];

					angular.forEach(vm.utils.pool_listing.data, function(record, index){
						var non_matches = 0;

						// DELETED,REVISED,PLACEHOLDER
						if( record.status == 8 || record.status == 3 || record.status == 11 )
						{
							non_matches++;
						}

						if( vm.utils.pool_listing.filters.linked_question != null && vm.utils.pool_listing.filters.linked_question != record.linked_question )
						{
							non_matches++;
						}

						if( non_matches == 0 )
						{
							visible_data.push(record);
						}

					});

					console.log("FILTERED POOL RISKS");
					console.log(visible_data);

					vm.utils.pool_listing.visible_data = visible_data;
				},
				filterByQuestion: function(action) {
					if( action == 'Yes' ) {
						vm.utils.pool_listing.filters.linked_question = true;
					} else {
						vm.utils.pool_listing.filters.linked_question = null;
					}

					vm.utils.pool_listing.autoFilter();
				},
				init: function() {

					vm.utils.pool_listing.loading = true;

					vm.utils.active_pool_project.fetchData().then(function() {

						vm.utils.pool_listing.refresh().then(function() {
							// POOL LISTING INITIALISED

							vm.utils.pool_project_list.refresh();

							if( !vm.utils.relations.rm_question_ref && !vm.utils.relations.question_uuid ) {
								// SHOW ALL POOL RISKS
								vm.utils.pool_listing.filters.linked_question = null;
							}

						});

					});
				},
				tabs: {
					active_tab: 'pool_list',
					tabActive: function(tab) {
						if( vm.utils.pool_listing.tabs.active_tab == tab ) {
							return true;
						} else {
							return false;
						}
					},
					changeTab: function(tab) {
						vm.utils.pool_listing.tabs.active_tab = tab;
					}
				}
			},
			active_pool_project: {
				record: null, 
				checklist: null,
				latest_fetch_record: null,
				fetchData: function() {
					var defer = $q.defer();

					if( !vm.utils.relations.hasOwnProperty('rm_activity_id') || vm.utils.relations.rm_activity_id == null ) {
						// NO ACTIVE POOL PROJECT
						defer.resolve();
						return defer.promise;
					}

					poolFactory.dbUtils.getPoolProject(vm.utils.relations.rm_activity_id).then(function(pool_project) {

						if( pool_project ) {
							vm.utils.relations.activity_id = pool_project._id;
						}

						vm.utils.active_pool_project.record = pool_project;

						vm.utils.active_pool_project.latestFetchRecord().then(function() {

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}, 
				latestFetchRecord: function() {
					var defer = $q.defer();

					var company_id = authFactory.cloudCompanyId();
					var user_id = authFactory.cloudUserId();
					var fetch_type = 'project';
					var fetch_record_id = vm.utils.relations.rm_activity_id;
					var fetch_record_type = 'project';

					fetchUtilsFactory.dbFetch.latestFetchRecord(company_id, user_id, fetch_type, fetch_record_id, fetch_record_type, 'Continue').then(function(fetch_record) {

						console.log("POOL PROJECT LATEST FETCH RECORD");
						console.log(fetch_record);

						vm.utils.active_pool_project.latest_fetch_record = fetch_record;
						// NEED TO IMPLEMENT IN INTERFACE
						// CONTINUE INCOMPLETE DOWNLOAD, START NEW REFRESH ETC

						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			pool_project_list: {
				is_loading: false,
				data: [],
				refresh: function() {
					var defer = $q.defer();

					var selector = {
						table: 'projects',
						user_id: authFactory.cloudUserId(),
						is_pool_item: 'Yes'
					}

					riskmachDatabasesFactory.databases.collection.projects.find({
						selector: selector
					}).then(function(results){

						console.log("GOT POOL PROJECTS");
						console.log(results.docs);

						var filtered = [];
						var i = 0;
						var len = results.docs.length;
						while(i < len) {
							var errors = 0;

							// IF PROJECT IS DELETED
							if( results.docs[i].hasOwnProperty('status') && results.docs[i].status == 4 ) {
								errors++;
							}

							// IF THERE ARE NO ERRORS, ADD TO FILTERED ARRAY
							if( !errors ) {
								filtered.push(results.docs[i]);
							}

							i++;
						}

						vm.utils.pool_project_list.is_loading = false;

						// ORDER POOL PROJECTS BY DATE ADDED
						vm.utils.pool_project_list.data = $filter('orderBy')(filtered, 'date_added', true);

						$scope.$apply();

						defer.resolve();
					}).catch(function(error){
						vm.utils.pool_project_list.is_loading = false;
						alert(error);
						defer.reject();
					});

					return defer.promise;
				},
				downloadPoolProjects: function() {
					var defer = $q.defer();

					vm.utils.pool_listing.downloading_pools = true;

					poolFactory.downloadPoolProjects().then(function() {

						vm.utils.pool_listing.downloading_pools = false;

						vm.utils.pool_project_list.refresh();

						defer.resolve();

					}, function(error) {
						vm.utils.pool_listing.downloading_pools = false;
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			item_select: {
				cloning: false,
				selected_items: [],
				// toggleSelectRiskForClone: function(risk) {
				// 	if( !risk.selected ) {
				// 		vm.utils.item_select.selected_items.push(risk._id);
				// 	}

				// 	if( risk.selected ) {
				// 		angular.forEach(vm.utils.item_select.selected_items, function(item, item_index) {
				// 			if( item._id == risk._id ) {
				// 				// REMOVE FROM SELECTED ARRAY
				// 				vm.utils.item_select.selected_items.splice(item_index, 1);
				// 			}
				// 		});
				// 	}

				// 	// TOGGLE SELECTED STATUS
				// 	risk.selected = !risk.selected;
				// },
				toggleSelectRiskForClone: function(risk){
					var index = $.inArray(risk._id, vm.utils.item_select.selected_items);

					if( index === -1 )
					{	
						// CAN ONLY SELECT 1 RISK TO REPLACE WITH
						if( (vm.utils.dest_relations.mode == 'replace_risk' || vm.utils.dest_relations.mode == 'suggest_risk') && vm.utils.item_select.selected_items.length ) {
							alert("Can only select 1 pool risk");
							return;
						}

						vm.utils.item_select.selected_items.push(risk._id);
						risk.selected = true;
					}
					else
					{
						vm.utils.item_select.selected_items.splice(index, 1);
						risk.selected = false;
					}
				},
				cloneSelectedRisks: function() {
					// vm.utils.item_select.cloning = true;

					// cloneUtilsFactory.assessments.cloneRiskAssessmentMultiple(vm.utils.item_select.selected_items, vm.utils.dest_relations).then(function() {					

					// 	vm.utils.item_select.cloning = false;

					// 	var data = {
					// 		risk_ids: vm.utils.item_select.selected_items
					// 	}

					// 	$rootScope.$broadcast("riskPools::clone", data);

					// }, function(error) {
					// 	vm.utils.item_select.cloning = false;
					// 	alert(error);
					// });

					var data = {
						risk_ids: vm.utils.item_select.selected_items
					}

					$rootScope.$broadcast("riskPools::clone", data);
				},
				itemSelectStyle: function(item){
					var style = {
						'background-color': 'white',
						'color': '#ddd'
					};

					if( item.selected )
					{
						style['background-color'] = 'green';
						style['color'] = '#fff';
					}

					return style;
				}
			},
			active_pool_risk: {
				record: null,
				select: function(record){
					vm.utils.active_pool_risk.record = record;
					// vm.utils.pool_risk_media.setRecord(vm.utils.active_pool_risk.record);
					// vm.utils.pool_risk_media.getAllRecordAttachments(vm.utils.pool_risk_media.record._id, 'assessment');
					// vm.utils.active_pool_risk.tabs.changeTab('media');
				},
				isActive: function(record){
					var active = false;

					if( !vm.utils.active_pool_risk.record )
					{
						return active;
					}

					if( vm.utils.active_pool_risk.record._id == record._id )
					{
						active = true;
					}

					return active;
				},
				activeStyle: function(record){
					var style = {
						'opacity': '1'
					};

					if( !vm.utils.active_pool_risk.record )
					{
						return style;
					}

					if( vm.utils.active_pool_risk.record._id != record._id )
					{
						style['opacity'] = '0.5';
					}

					return style;
				},
				tabs: {
					active_tab: 'media',
					changeTab: function(tab){
						vm.utils.active_pool_risk.tabs.active_tab = tab;

						if( tab == 'media' ) {
							vm.utils.pool_risk_media.setRecord(vm.utils.active_pool_risk.record);
							vm.utils.pool_risk_media.getAllRecordAttachments(vm.utils.pool_risk_media.record._id, 'assessment');
						}
					},
					tabActive: function(tab){
						var active = false;

						if( tab == vm.utils.active_pool_risk.tabs.active_tab )
						{
							active = true;
						}

						return active;
					}
				}
			},
			pool_risk_media: {
				loading: false,
				record: null,
				media_records: [],
				downloading_file: false,
				setRecord: function(record){
					vm.utils.pool_risk_media.record = record;
				},
				close: function() {
					vm.utils.pool_risk_media.record = null;
					vm.utils.pool_risk_media.media_records = [];
				},
				getAllRecordAttachments: function(record_id, record_type) {
					var defer = $q.defer();

					vm.utils.pool_risk_media.loading = true;

					mediaFactory.dbUtils.getAllStoredRecordAttachments(record_id, record_type, 'pool_risks').then(function(media_records) {

						var filtered_media = [];

						var i = 0;
						var len = media_records.length;

						while(i < len) {
							if( media_records[i].hasOwnProperty('status') && media_records[i].status == 1 ) {
								filtered_media.push(media_records[i]);
							}

							i++;
						}

						//ORDER BY DATE ADDED
						filtered_media = $filter('orderBy')(filtered_media, 'date_added');

						vm.utils.pool_risk_media.media_records = filtered_media;

						vm.utils.pool_risk_media.setProfileImage(vm.utils.pool_risk_media.record.profile_image_media_id);

						vm.utils.pool_risk_media.loading = false;

						defer.resolve();
						$scope.$apply();

					}, function(error) {
						vm.utils.pool_risk_media.loading = false;
						defer.reject(error);
					});

					return defer.promise;
				},
				setProfileImage: function(profile_image_id){

					angular.forEach(vm.utils.pool_risk_media.media_records, function(record, index) {
						if( record._id == profile_image_id ) {
							vm.utils.pool_risk_media.media_records[index].profile_image = true;
						} else {
							vm.utils.pool_risk_media.media_records[index].profile_image = false;
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
				downloadMediaFile: function(media_record, record) {
					// IF ALREADY DOWNLOADING A FILE, WAIT UNTIL FINISHED
					if( vm.utils.pool_risk_media.downloading_file ) {
						alert("File download already in progress. Please wait before trying to download another file.");
						return;
					}

					vm.utils.pool_risk_media.downloading_file = true;
					media_record.downloading_file = true;

					var chunk_size = 1 * 1024 * 1024;
					var pool_limit = 6;

					mediaFactory.downloads.downloadMediaFile(media_record, chunk_size, pool_limit).then(function() {

						media_record.downloading_file = false;

						vm.utils.pool_risk_media.calcRiskProfileImg(record, false).then(function() {
							vm.utils.pool_risk_media.getAllRecordAttachments(record._id, 'assessment');
						});

						vm.utils.pool_risk_media.downloading_file = false;

					}, function(error) {
						vm.utils.pool_risk_media.downloading_file = false;
						media_record.downloading_file = false;
						alert(error);
					});
				
				},
				calcRiskProfileImg: function(risk, skip_has_image_check) {
					var defer = $q.defer();

					// IF IMG URL ALREADY FETCHED IN ACTIVE SESSION
					// if( mediaFactory.profile_imgs.risks.hasOwnProperty(risk._id) ) {
					// 	risk.profile_img_url = mediaFactory.profile_imgs.getStoredUrl('risks', risk._id);

					// 	risk.loading_profile_img = false;

					// 	defer.resolve();

					// 	return defer.promise;
					// }

					// IF PROFILE IMG NOT DOWNLOADED
					if( risk.hasOwnProperty('profile_img_download_required') && risk.profile_img_download_required ) {
						risk.loading_profile_img = false;

						defer.resolve();
						return defer.promise;
					}

					// IF RISK PROFILE IMG STORED INLINE
					if( risk.hasOwnProperty('profile_img_id') && risk.profile_img_id && risk.hasOwnProperty('profile_img_attachment_key') && risk.profile_img_attachment_key ) {

						risk.loading_profile_img = true;

						// GET URL FOR STORED PROFILE IMG
						mediaFactory.dbUtils.getStoredAttachmentUrl('pool_risks', risk.profile_img_id, risk.profile_img_attachment_key).then(function(url) {

							// SET PROFILE IMG URL FOR RISK
							risk.profile_img_url = url;

							risk.loading_profile_img = false;

							// STORE URL IN FACTORY FOR SESSION
							// mediaFactory.profile_imgs.storeUrl('risks', risk._id, url);

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

					// FIND PROFILE IMG URL AND SAVE AGAINST RISK (IF DOWNLOADED ETC)

					risk.profile_img_url = null;
					risk.profile_img_download_required = false;

					// IF NO IMAGES, SKIP AND TRY NEXT RISK
					if( !skip_has_image_check && (!risk.hasOwnProperty('num_files') || !risk.num_files || risk.num_files == '0') ) {
						
						risk.loading_profile_img = false;
						
						defer.resolve();

						return defer.promise;
					}

					var risk_db = riskmachDatabasesFactory.databases.collection.assessments;

					risk.loading_profile_img = true;

					mediaFactory.dbUtils.getRecordMedia(risk._id, 'assessment').then(function(media) {

						if( !media.length ) {

							risk.loading_profile_img = false;

							defer.resolve();

							return defer.promise;
						}

						var filtered_media = [];

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
							// NO DOWNLOADED IMAGES TO SET AS PROFILE IMAGE
							risk.loading_profile_img = false;
							
							defer.resolve();
							return defer.promise;
						}

						// STORE ORIG SELECTED STATUS TO REAPPLY
						var orig_selected_status = risk.selected;

						if( !filtered_media[0].hasOwnProperty('file_downloaded') || filtered_media[0].file_downloaded != 'Yes' ) {
							// PROFILE IMAGE NOT DOWNLOADED
							risk.profile_img_download_required = true;
							risk.loading_profile_img = false;

							// IF RISK HAS SELECTED STATUS, REMOVE PROPERTY
							if( risk.hasOwnProperty('selected') && risk.selected ) {
								delete risk.selected;
							}

							risk_db.put(risk).then(function(result) {

								risk._id = result.id;
								risk._rev = result.rev;

								risk.selected = orig_selected_status;

								defer.resolve();

							}).catch(function(error) {
								defer.reject(error);
							});

							return;
						}

						// GET URL FOR FIRST IMAGE
						mediaFactory.dbUtils.getStoredAttachmentUrl('pool_risks', filtered_media[0]._id, filtered_media[0].attachment_key).then(function(url) {

							if( url == 'corrupt_file' ) {
								// HANDLE THIS
								
								risk.loading_profile_img = false;
								defer.resolve();
								return defer.promise;
							}

							// SET PROFILE IMAGE URL FOR RISK
							risk.profile_img_url = url;

							risk.loading_profile_img = false;

							risk.profile_img_id = filtered_media[0]._id;
							risk.profile_img_attachment_key = filtered_media[0].attachment_key;

							// STORE URL IN FACTORY FOR SESSION
							// mediaFactory.profile_imgs.storeUrl('risks', risk._id, url);

							// IF RISK HAS SELECTED STATUS, REMOVE PROPERTY
							if( risk.hasOwnProperty('selected') && risk.selected ) {
								delete risk.selected;
							}

							risk_db.put(risk).then(function(result) {

								risk._id = result.id;
								risk._rev = result.rev;

								// REAPPLY SELECTED STATUS
								risk.selected = orig_selected_status;

								defer.resolve();

							}).catch(function(error) {
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
				calcRiskProfileImgV1: function(risk, skip_has_image_check) {
					var defer = $q.defer();

					// FIND PROFILE IMG URL AND SAVE AGAINST RISK (IF DOWNLOADED ETC)

					risk.profile_img_url = null;
					risk.profile_img_download_required = false;

					// IF NO IMAGES, SKIP AND TRY NEXT RISK
					if( !skip_has_image_check && (!risk.hasOwnProperty('num_files') || !risk.num_files || risk.num_files == '0') ) {
						
						risk.loading_profile_img = false;
						
						defer.resolve();

						return defer.promise;
					}

					var risk_db = riskmachDatabasesFactory.databases.collection.assessments;

					risk.loading_profile_img = true;

					mediaFactory.dbUtils.getRecordMedia(risk._id, 'assessment').then(function(media) {

						if( !media.length ) {

							risk.loading_profile_img = false;

							defer.resolve();

							return defer.promise;
						}

						var filtered_media = [];

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
							// NO DOWNLOADED IMAGES TO SET AS PROFILE IMAGE
							risk.loading_profile_img = false;
							
							defer.resolve();
							return defer.promise;
						}

						if( !filtered_media[0].hasOwnProperty('file_downloaded') || filtered_media[0].file_downloaded != 'Yes' ) {
							// PROFILE IMAGE NOT DOWNLOADED
							risk.profile_img_download_required = true;
							risk.loading_profile_img = false;

							defer.resolve();

							return;
						}

						// GET URL FOR FIRST IMAGE
						mediaFactory.dbUtils.getAttachmentUrl(filtered_media[0]._id, filtered_media[0].attachment_key).then(function(url) {

							// SET PROFILE IMAGE URL FOR RISK
							risk.profile_img_url = url;

							risk.loading_profile_img = false;

							risk.profile_img_id = null;
							risk.profile_img_attachment_key = null;

							risk_db.put(risk).then(function(result) {

								risk._id = result.id;
								risk._rev = result.rev;

								defer.resolve();

							}).catch(function(error) {
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
				downloadRiskMedia: function(record) {
					var defer = $q.defer();

					record.downloading_files_multiple = true;

					var filters = {
						record_id: record._id, 
						record_type: 'assessment'
					}

					mediaFactory.downloadMediaMultiple(filters).then(function(saved_doc) {

						record.downloading_files_multiple = false;
						record.profile_img_download_required = false;

						if( saved_doc ) {
							record._id = saved_doc._id;
							record._rev = saved_doc._rev;
						}

						vm.utils.pool_risk_media.calcRiskProfileImg(record, true);

						defer.resolve();

					}, function(error) {
						record.downloading_files_multiple = false;
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
			exitModal: function() {
				// $rootScope.$broadcast("riskPools::closeModal");
				vm.utils.exit();
			},
			events: function() {
				$scope.$watchCollection('vm.relations', function(newVal, oldVal) {
					vm.utils.relations = vm.relations;
					console.log(vm.utils.relations);
				});

				$scope.$watchCollection('vm.destrelations', function(newVal, oldVal) {
					// USE THESE TO CLONE THE POOL RISKS TO LOCATION
					vm.utils.dest_relations = vm.destrelations;
				});
			}(),
			project_download: {
				downloading_project: false,
				active_fetch_item: null,
				display_message: null, 
				error_message: null,
				setDisplayMessage: function(active_fetch_item) {
					vm.utils.project_download.display_message = active_fetch_item.status + " " + active_fetch_item.display_name;
				},
				resetDownloadStatuses: function() {
					vm.utils.project_download.active_fetch_item = null;
					vm.utils.project_download.display_message = null;
					vm.utils.project_download.error_message = null;
				},
				downloadProjectData: function(project_id, download_type) {
					vm.utils.project_download.downloading_project = true;

					project_id = parseInt(project_id);

					var params = {
						activity_id: project_id,
						// activity_id: 60276,
						asset_id: null
					};
		
					var required_stages = ['projects','snapshot_assets','tasks','mr_hazards','mr_controls','hazard_control_relations','snapshot_asset_media','task_media','mr_hazard_media','mr_control_media','checklist_instances','checklist_question_records','uaudit_content','assessments','ra_question_relations','ra_control_item_relations','assessment_media','project_contributors'];
					var is_partial = 'No';

					var stages = projectDownloadFactory.download_setup.initStages(required_stages, params);

					fetchUtilsFactory.utils.initNewDownload('project', project_id, 'project', stages, download_type, is_partial).then(function() {
						fetchUtilsFactory.utils.doStartDownload().then(function() {

							projectDownloadFactory.dbUtils.projects.updateProjectDownloadStatus(projectDownloadFactory.download_setup.active.project_id, false);

							vm.utils.project_download.downloading_project = false;

							vm.utils.pool_listing.refresh();

						}, function(error) {
							alert(error);
							vm.utils.project_download.downloading_project = false;
						});

					}, function(error) {
						alert(error);
						vm.utils.project_download.downloading_project = false;
					});
				},
				reAttemptRefresh: function(fetch_id) {
					vm.utils.project_download.downloading_project = true;

					fetchUtilsFactory.active.fetch_id = fetch_id;

					fetchUtilsFactory.utils.doStartDownload().then(function() {
						vm.utils.project_download.downloading_project = false;
						
						vm.utils.pool_listing.init();

					}, function(error) {
						vm.utils.project_download.downloading_project = false;
						alert(error);
					});
				},
				events: function() {
					$scope.$on("projectDownload::status", function(event, data) {
						vm.utils.project_download.active_fetch_item = fetchUtilsFactory.active.stage;
						vm.utils.project_download.setDisplayMessage(vm.utils.project_download.active_fetch_item.record);
					});

					$scope.$on("projectDownload::itemInstalled", function(event, data) {
						vm.utils.project_download.active_fetch_item.record.total_items_installed = data.current_total;
					});
				}(),
			},
			files_download: {
				downloading: false,
				meta: mediaFactory.media_download.meta,
				downloadPoolMedia: function() {
					vm.utils.files_download.downloading = true;

					var filters = {
						activity_id: vm.utils.active_pool_project.record._id
					}

					mediaFactory.downloadMediaMultiple(filters).then(function() {

						vm.utils.files_download.downloading = false;

						vm.utils.pool_listing.refresh();

					}, function(error) {
						vm.utils.files_download.downloading = false;
						alert(error);
					});
				},
				cancel: function() {
					mediaFactory.media_download.cancel();
				},
				events: function() {
					$scope.$on("filesDownload::metaUpdated", function(event, data) {
						vm.utils.files_download.meta = mediaFactory.media_download.meta;
					});
				}
			},
		};

		$scope.$on("riskPoolList::exit", function(event, data){
			//THINK ABOUT USING DIRECTIVE ID ON THIS LISTING SO EVNTS CAN BE TARGETED

			setTimeout(function(){
				$scope.$destroy();
			}, 0);

		});

		vm.utils.pool_listing.init();
	}

	function riskPoolInfoController($scope) 
	{
		var vm = this;

		vm.utils = {};
	}

	function poolFactory($q, $http, $filter, riskmachDatabasesFactory, authFactory, rmUtilsFactory, modelsFactory) 
	{
		var factory = {};

		factory.dbUtils = {
			getPoolAssessmentsV1: function(relations) {
				var defer = $q.defer();

				console.log("POOL RELATIONS");
				console.log(relations);

				var selector = {
					user_id: authFactory.cloudUserId(),
					rm_activity_id: null,
					is_pool_item: 'Yes'
				};

				if( relations.hasOwnProperty('rm_activity_id') && relations.rm_activity_id != null ) {
					selector.rm_activity_id = relations.rm_activity_id;
				}

				riskmachDatabasesFactory.databases.collection.assessments.find({
					selector: selector
				}).then(function(results) {
					console.log("FETCHED POOL ASSESSMENTS");
					console.log(results);

					defer.resolve(results.docs);
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getPoolAssessments: function(relations) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.assessments;

				var options = {
					limit: 200, 
					include_docs: true
				}

				var risks = [];

				fetchNextPage(fetch_defer).then(function() {

					console.log("FETCHED RISK POOL LISTING DATA");
					console.log(risks);

					defer.resolve(risks);

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

								if( !result.rows[i].doc.hasOwnProperty('is_pool_item') || result.rows[i].doc.is_pool_item != 'Yes' ) {
									errors++;
								}

								// if( relations.hasOwnProperty('rm_activity_id') && relations.rm_activity_id != null ) {
									
								// 	if( !result.rows[i].doc.hasOwnProperty('rm_activity_id') || result.rows[i].doc.rm_activity_id != relations.rm_activity_id ) {
								// 		errors++;
								// 	}

								// }

								if( relations.hasOwnProperty('activity_id') && relations.activity_id ) {

									if( !result.rows[i].doc.hasOwnProperty('activity_id') || result.rows[i].doc.activity_id != relations.activity_id ) {
										errors++;
									}

								}

								if( errors == 0 ) {

									// FORMAT SELECTED IF PROPERTY PRESENT
									if( result.rows[i].doc.hasOwnProperty('selected') ) {
										result.rows[i].doc.selected = false;
									}

									risks.push(result.rows[i].doc);
								}

								i++;
							}

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							result.rows = null;

							fetchNextPage(defer);

						} else {
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
			getPoolProject: function(rm_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.projects.find({
					selector: {
						user_id: authFactory.cloudUserId(), 
						rm_id: rm_id
					},
					limit: 1
				}).then(function(results) {
					console.log("GOT POOL PROJECT RECORD");
					console.log(results.docs);
					if( results.docs.length == 0 ) {
						defer.resolve(null);
					} else {
						defer.resolve(results.docs[0]);
					};
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getPoolChecklist: function(project_id) {
				var defer = $q.defer();

				riskmachDatabasesFactory.databases.collection.checklist_instances.find({
					selector: {
						user_id: authFactory.cloudUserId(),
						activity_id: project_id
					}
				}).then(function(results) {

					console.log(results.docs);

					if( results.docs.length == 0 ) {
						defer.resolve(null);
						return defer.promise;
					}

					if( results.docs.length == 1 ) {
						defer.resolve(results.docs[0]);
						return defer.promise;
					}

					// ORDER BY LATEST BLUEPRINT REVISION FIRST
					results.docs = $filter('orderBy')(results.docs, 'rm_checklist_blueprint_revision_number', true);

					console.log(results.docs);

					// RESOLVE LATEST BLUEPRINT REVISION
					defer.resolve(results.docs[0]);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
		}

		factory.requests = {
			projects: function() {
				var defer = $q.defer();

	            var pre_filters = {
	                activity_id: null,
					paginate: 'yes',
					page_num: 1,
					per_page: 1000, 
					client_id: null,
					is_pool: 'yes'
	            };

	            var project_collection = [];

	            //SET THE FILTERS FOR THE INITIAL REQUEST
	            // already set by pre_filters that is passed into function

	            //GET THE INTIIAL LOAD FOR TOTALS
	            factory.requests.projectsPaginated(pre_filters).then(function(data) {

	                console.log( JSON.stringify(data, null, 2) );
	                // data = JSON.stringify(data);

	                project_collection = project_collection.concat( data.data );

	                var total_items = data.totals.TotalItems;

	                //CALC NUM PAGES
	                var num_pages = Math.ceil(total_items / pre_filters.per_page);
	                console.log("NUM PAGES OF PROJECTS:" + num_pages);
	                // alert("Number of pages to request");

	                if( num_pages > 1 )
	                {
	                    var chain = $q.when();

	                    for(var i = 2; i <= num_pages; i++)
	                    {
	                        (function(index) {

	                            chain = chain.then(function() {

	                                //SET THE FILTERS TO GET DESIRED PAGE
	                                console.log( JSON.stringify(pre_filters, null, 2) );
	                                var loop_filters = angular.copy(pre_filters);
	                                loop_filters.page_num = index;
	                                console.log( JSON.stringify(loop_filters, null, 2) );

	                                return factory.requests.projectsPaginated(loop_filters).then(function(data) {
	                                   
	                                    Array.prototype.push.apply(project_collection, data.data);
	                                    console.log( project_collection.length );
	                                    console.log( index + ' of ' + num_pages);

	                                    if( index == num_pages )
	                                    {
	                                        console.log("TOTAL FOUND PROJECTS");
	                                        console.log( JSON.stringify(project_collection, null, 2) );
	                                        console.log( project_collection.length );

	                                        defer.resolve(project_collection);
	                                    };

	                                }, function(error) {
	                             		defer.reject(error);
	                                });
	                            });

	                        })(i);
	                    }
	                }
	                else
	                {
	                    //IF ONLY 1 PAGE FOUND

	                    console.log("TOTAL FOUND PROJECTS");
	                    console.log( JSON.stringify(project_collection, null, 2) );
	                    console.log( project_collection.length );

	                    defer.resolve(project_collection);
	                };

	            }, function(error) {
	                defer.reject(error);
	            });

	            return defer.promise;
			},
			projectsPaginated: function(filters) {
				var defer = $q.defer();

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/Projects',{ 
	                params: {
	                	filters: filters
	                }
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("PROJECT LIST REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		defer.resolve(data);
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("PROJECT LIST ERROR REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );
	                defer.reject("Error connecting to API for projects");
	            });

				return defer.promise;
			}
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
			poolInfoSlideoutShown: function() {
				var shown = false;

				if( localStorage.getItem('poolInfoSlideout') ) {
					shown = true;
				}

				return shown;
			},
			projects: {
				formatProjectRecord: function(project_record) {
					var formatted = null;
					formatted = angular.copy(project_record);

					formatted.user_id = authFactory.cloudUserId();
					formatted.company_id = authFactory.cloudCompanyId();

					if( project_record.status == null || project_record.status == '' || project_record.status == 0 || project_record.status == '0' ) {
						formatted.status = 1;
					};

					return formatted;
				}
			},
		}

		factory.downloadPoolProjects = function() 
		{
			var defer = $q.defer();

			factory.requests.projects().then(function(projects) {

				factory.existingDbPoolProjects().then(function(existing_projects) {

					factory.savePoolProjects(projects, existing_projects).then(function() {

						factory.updateCloudDeletedPoolProjects(projects, existing_projects).then(function() {

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

		factory.requestPoolProjects = function() 
		{
			var defer = $q.defer();

			return defer.promise;
		}

		factory.existingDbPoolProjects = function() 
		{
			var defer = $q.defer();
			var fetch_defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.projects;
			var options = {
				limit: 100, 
				include_docs: true
			};

			var projects = {};

			fetchNextPage(fetch_defer).then(function() {

				console.log("EXISTING PROJECTS");
				console.log(projects);

				defer.resolve(projects);
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

							if( !result.rows[i].doc.hasOwnProperty('table') || result.rows[i].doc.table != 'projects' ) {
								errors++;
							}

							if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
								errors++;
							}

							if( result.rows[i].doc.hasOwnProperty('archived') && result.rows[i].doc.archived == 'Yes' ) {
								errors++;
							}

							if( !result.rows[i].doc.hasOwnProperty('is_pool_item') || result.rows[i].doc.is_pool_item != 'Yes' ) {
								errors++;
							}

							if( errors == 0 ) {
								var record = {
									_id: result.rows[i].doc._id, 
									_rev: result.rows[i].doc._rev, 
									record_modified: result.rows[i].doc.record_modified,
									rm_id: result.rows[i].doc.rm_id
								}

								projects[ result.rows[i].doc.rm_id ] = record;
							}

							i++;
						}

						options.startkey = result.rows[ result.rows.length - 1 ].id;
						options.skip = 1;

						result.rows = null;

						fetchNextPage(defer);

					} else {
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

		factory.savePoolProjects = function(projects, existing_projects) 
		{
			var defer = $q.defer();
			var save_defer = $q.defer();

			if( projects.length == 0 ) {
				defer.resolve();
				return defer.promise;
			}

			saveNextRecord(save_defer, projects, 0).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function saveNextRecord(defer, projects, active_index) {

				if( active_index > projects.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				factory.savePoolProjectRecord(projects[active_index], existing_projects).then(function() {

					active_index++;

					saveNextRecord(defer, projects, active_index);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;	
			}

			return defer.promise;
		}

		factory.savePoolProjectRecord = function(project_record, existing_projects) 
		{
			var defer = $q.defer();

			// ADD MODEL KEYS AND FORMAT
			project_record = factory.utils.formatRmRecordToModel('project', project_record);

			// SET VALUES FOR SYNC
			project_record = factory.utils.setSyncValues(project_record);

			// FORMAT ANY ANOMALIES
			project_record = factory.utils.projects.formatProjectRecord(project_record);

			var exists = false;
			var existing_record = null;

			if( angular.isDefined(existing_projects[project_record.rm_id]) && existing_projects[project_record.rm_id] ) {
				exists = true;
				existing_record = existing_projects[project_record.rm_id];
			}

			if( !exists ) {

				factory.saveNewPoolProjectRecord(project_record).then(function(saved_project) {
						
					project_record._id = saved_project._id;
					project_record._rev = saved_project._rev;

					defer.resolve(project_record);
				}, function(error) {
					defer.reject(error);
				});

			} else {

				factory.updatePoolProjectRecord(project_record, existing_record).then(function(saved_project) {

					project_record._id = saved_project._id;
					project_record._rev = saved_project._rev;

					defer.resolve(project_record);
				}, function(error) {
					defer.reject(error);
				});

			}

			return defer.promise;
		}

		factory.saveNewPoolProjectRecord = function(project_record) 
		{
			var defer = $q.defer();

			var options = {
				force: true
			};

			// SET RM OBJECT
			var rm_record = angular.copy(project_record);
			project_record.rm_record = rm_record;

			riskmachDatabasesFactory.databases.collection.projects.post(project_record, options).then(function(saved_record) {
				project_record._id = saved_record.id;
				project_record._rev = saved_record.rev;

				console.log("SAVED NEW POOL PROJECT");

				defer.resolve(project_record);
			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.updatePoolProjectRecord = function(project_record, existing_record) 
		{
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

				db.put(project_record).then(function(saved_record) {
					project_record._id = saved_record.id;
					project_record._rev = saved_record.rev;

					console.log("POOL PROJECT RECORD UPDATED ENTIRELY");

					defer.resolve(project_record);
				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			};

			db.get(existing_record._id).then(function(doc) {
				
				existing_record = doc;

				// IF CLOUD RECORD HAS BEEN MODIFIED MORE RECENTLY THAN APP RECORD
				if( project_record.date_modified > existing_record.date_modified ) {
					existing_record.rm_record_modified = 'Yes';
				};

				// CLEAR OLD RM RECORD
				existing_record.rm_record = null;

				// SET RM RECORD OBJECT
				var rm_record = angular.copy(project_record);
				existing_record.rm_record = rm_record;

				db.put(existing_record).then(function(saved_record) {
					existing_record._id = saved_record.id;
					existing_record._rev = saved_record.rev;

					console.log("POOL PROJECT RM RECORD UPDATED");

					defer.resolve(existing_record);
				}).catch(function(error) {
					defer.reject(error);
				});

			}).catch(function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.updateCloudDeletedPoolProjects = function(cloud_projects, existing_projects) 
		{
			var defer = $q.defer();

			var cloud_ids = [];
			var deleted_projects = [];

			var i = 0;
			var len = cloud_projects.length;
			while(i < len) {

				cloud_ids.push( parseInt(cloud_projects[i].rm_id) );

				i++;
			}

			Object.keys(existing_projects).forEach(function(current_key) {

				if( cloud_ids.indexOf(existing_projects[current_key].rm_id) === -1 ) {
					deleted_projects.push(existing_projects[current_key]._id);
				}

			});

			if( !deleted_projects.length ) {
				defer.resolve();
				return defer.promise;
			}

			factory.doUpdateCloudDeletedPoolProjects(deleted_projects).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.doUpdateCloudDeletedPoolProjects = function(projects) 
		{
			var defer = $q.defer();
			var save_defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.projects;

			deleteNextProject(save_defer, 0).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function deleteNextProject(defer, active_index) {

				if( active_index > projects.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				db.get(projects[active_index]).then(function(project_doc) {

					project_doc.status = 4;

					db.put(project_doc).then(function(result) {

						// CLEAN UP
						project_doc = null;

						active_index++;
						deleteNextProject(defer, active_index);

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

		return factory;
	}

	function riskPoolList() 
	{
		var directive = {};

		directive.scope = {
			relations: '=', 
			destrelations: '='
		};

		directive.restrict = 'A';
		directive.controller = 'riskPoolListingController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/pools/tpl/risk_pool_listing.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

	function riskPoolInfo() 
	{
		var directive = {};

		directive.scope = {};

		directive.restrict = 'A';
		directive.controller = 'riskPoolInfoController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/pools/tpl/risk_pool_info.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

}())