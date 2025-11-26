(function(){

	var app = angular.module('riskmachProjectInvites', ['riskmachUtils','riskmachDatabases','riskmachModels','riskmachRasic']);
	app.controller('projectInvitesController', projectInvitesController);
	app.factory('projectInvitesFactory', projectInvitesFactory);
	app.directive('projectInvites', projectInvites);

	function projectInvitesController($scope, $rootScope, $q, riskmachDatabasesFactory, projectInvitesFactory, rasicFactory, authFactory, modelsFactory) 
	{
		var vm = this;

		vm.utils = {
			loading: false,
			initProjectInvites: function() {
				vm.utils.loading = true;

				// CLEAR ANY PREVIOUS ERRORS
				vm.utils.error_handler.clear();

				// CLOSE PROJECT INVITE FORM
				vm.utils.add_project_invite.hideForm();

				vm.utils.project.fetch().then(function() {

					vm.utils.users.refresh().then(function() {

						vm.utils.project_invites.refresh().then(function() {

							vm.utils.loading = false;

						}, function(error) {
							vm.utils.loading = false;
							vm.utils.error_handler.logError(error);
						});

					}, function(error) {
						vm.utils.loading = false;
						vm.utils.error_handler.logError(error);
					});

				}, function(error) {
					vm.utils.loading = false;
					vm.utils.error_handler.logError(error);
				});
			},
			error_handler: {
				error: false, 
				error_message: null, 
				logError: function(error) {
					vm.utils.error_handler.error = true;
					vm.utils.error_handler.error_message = error;
				},
				clear: function() {
					vm.utils.error_handler.error = false;
					vm.utils.error_handler.error_message = null;
				}
			},
			project: {
				id: vm.projectid,
				record: null, 
				fetch: function() {
					var defer = $q.defer();

					projectInvitesFactory.dbUtils.project.fetch(vm.utils.project.id).then(function(project_doc) {

						vm.utils.project.record = project_doc;

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				save: function() {
					var defer = $q.defer();

					if( !vm.utils.project.isProjectAdmin() ) {
						defer.reject("Only the project admin can update the project's privacy settings");
						return defer.promise;
					}

					projectInvitesFactory.updateProjectPrivacyStatus(vm.utils.project.record).then(function() {

						projectInvitesFactory.dbUtils.project.save(vm.utils.project.record).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveAndClose: function() {
					vm.utils.project.save().then(function() {

						var data = {
							project: vm.utils.project.record
						}

						$rootScope.$broadcast("projectInvites::saveAndClose", data);

					}, function(error) {
						vm.utils.error_handler.logError(error);
					});
				},
				isProjectAdmin: function() {
					return projectInvitesFactory.utils.isProjectAdmin(vm.utils.project.record);
				},
				isProjectPrivate: function() {
					return projectInvitesFactory.utils.isProjectPrivate(vm.utils.project.record);
				}
			},
			users: {
				loading: false,
				data: null, 
				refresh: function() {
					var defer = $q.defer();

					vm.utils.users.loading = true;

					projectInvitesFactory.users.requestCompanyUserList().then(function(data) {

						var filtered_data = vm.utils.users.autoFilter(data);

						vm.utils.users.data = filtered_data;

						vm.utils.users.loading = false;

						defer.resolve();

					}, function(error) {
						vm.utils.users.loading = false;
						defer.reject(error);
					});

					return defer.promise;
				},
				autoFilter: function(data) {
					var filtered_data = [];
					var i = 0;
					var len = data.length;

					while(i < len) {
						var errors = 0;

						// DELETED USER
						if( data[i].hasOwnProperty('Status') && data[i].Status == 3 ) {
							errors++;
						}

						// DISABLED USER
						if( data[i].hasOwnProperty('Status') && data[i].Status == 2 ) {
							errors++;
						}

						if( !errors ) {
							filtered_data.push(data[i]);
						}

						i++;
					}

					return filtered_data;
				}
			},
			project_invites: {
				loading: false,
				refreshing: false,
				data: [], 
				visible_data: [],
				selected_user: null,
				fetch: function() {
					var defer = $q.defer();

					vm.utils.project_invites.loading = true;

					var filters = {
						rm_record_id: vm.utils.project.record.rm_id,
						record_type: 'project',
						user_id: authFactory.cloudUserId()
					}

					rasicFactory.dbUtils.getRasic(filters).then(function(data) {

						vm.utils.project_invites.data = data;

						vm.utils.project_invites.autoFilter();

						console.log("FETCHED PROJECT INVITES");
						console.log(data);

						vm.utils.project_invites.loading = false;

						defer.resolve();

					}, function(error) {
						vm.utils.project_invites.loading = false;
						defer.reject(error);
					});

					return defer.promise;
				},
				autoFilter: function() {
					vm.utils.project_invites.visible_data = [];

					var i = 0;
					var len = vm.utils.project_invites.data.length;

					while(i < len) {
						var errors = 0;

						if( vm.utils.project_invites.data[i].r != 'Yes' ) {
							errors++;
						}

						if( !errors ) {
							vm.utils.project_invites.visible_data.push(vm.utils.project_invites.data[i]);
						}

						i++;
					}
				},
				refresh: function() {
					var defer = $q.defer();

					vm.utils.project_invites.refreshing = true;

					// GET UP TO DATE PROJECT RECORD
					projectInvitesFactory.getSaveProjectPrivacyStatus(vm.utils.project.record).then(function() {

						$rootScope.$broadcast("projectInvites::updateProject", {project: vm.utils.project.record});

						var filters = angular.copy(rasicFactory.utils.rasic_filters);
						filters.record_type = 'project';
						filters.record_id = vm.utils.project.record.rm_id;

						rasicFactory.refreshRasic(filters).then(function() {

							vm.utils.project_invites.refreshing = false;

							vm.utils.project_invites.fetch().then(function() {
								defer.resolve();
							}, function(error) {
								defer.reject(error);
							});

						}, function(error) {
							vm.utils.project_invites.refreshing = false;
							defer.reject(error);
						});

					}, function(error) {
						vm.utils.project_invites.refreshing = false;
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			add_project_invite: {
				loading: false,
				selected_user: null,
				show_form: false,
				showForm: function() {
					// IF PROJECT IS PRIVATE AND USER IS NOT THE ADMIN
					if( vm.utils.project.isProjectPrivate() && !vm.utils.project.isProjectAdmin() ) {
						vm.utils.error_handler.logError("Only the project admin can invite users to the project");
						return;
					}

					vm.utils.add_project_invite.show_form = true;
				}, 
				hideForm: function() {
					vm.utils.add_project_invite.selected_user = null;
					vm.utils.add_project_invite.show_form = false;
				},
				addProjectInvite: function(user) {
					if( !user ) {
						return;
					}

					if( vm.utils.project.record.hasOwnProperty('iqa_user_id') && vm.utils.project.record.iqa_user_id ) {
						vm.utils.project.record.iqa_user_id = parseInt(vm.utils.project.record.iqa_user_id);
					}

					// DON'T CREATE PROJECT INVITE IF USER IS IQA
					if( vm.utils.project.record.hasOwnProperty('iqa_user_id') && vm.utils.project.record.iqa_user_id == user.UserID ) {
						alert("You can not invite the project IQA to be a contributing member to the project");
						return;
					}

					var i = 0;
					var len = vm.utils.project_invites.data.length;
					var invite_index = null;

					// ATTEMPT FIND USER IN PROJECT MEMBERS
					while(i < len) {
						if( user.UserID == vm.utils.project_invites.data[i].grantee_id ) {
							invite_index = i;
						}

						i++;
					}

					if( invite_index != null && vm.utils.project_invites.data[invite_index].r == 'Yes' ) {
						alert("This user is already a member of this project");
						return;
					}

					vm.utils.add_project_invite.loading = true;

					var data = {
						activity_id: vm.utils.project.record.rm_id, 
						user_id: user.UserID
					}

					rasicFactory.addProjectInvite(data).then(function() {

						vm.utils.add_project_invite.loading = false;

						// HIDE INVITE FORM
						vm.utils.add_project_invite.hideForm();

						vm.utils.project_invites.refresh();

					}, function(error) {
						vm.utils.add_project_invite.loading = false;
						vm.utils.error_handler.logError(error);
					});
				},
			},
			remove_project_invite: {
				loading: false,
				selected_user: null,
				show_confirmation: false,
				showConfirmation: function() {
					vm.utils.remove_project_invite.show_confirmation = true;
				}, 
				hideConfirmation: function() {
					vm.utils.remove_project_invite.selected_user = null;
					vm.utils.remove_project_invite.show_confirmation = false;
				},
				start: function(user) {
					if( !vm.utils.project.isProjectAdmin() ) {
						vm.utils.error_handler.logError("Only the project admin can remove user from the project");
						return;
					}

					vm.utils.remove_project_invite.selected_user = user;
					vm.utils.remove_project_invite.showConfirmation();
				},
				removeProjectInvite: function(user) {
					if( !user ) {
						return;
					}

					vm.utils.remove_project_invite.loading = true;

					var data = {
						activity_id: vm.utils.project.record.rm_id, 
						user_id: user.grantee_id
					}

					rasicFactory.removeProjectInvite(data).then(function() {

						vm.utils.remove_project_invite.loading = false;

						// HIDE INVITE FORM
						vm.utils.remove_project_invite.hideConfirmation();

						vm.utils.project_invites.refresh();

					}, function(error) {
						vm.utils.remove_project_invite.loading = false;
						vm.utils.error_handler.logError(error);
					});
				},
			},
			events: function() {

				$scope.$watch('vm.projectid', function(event, data) {

					console.log("PROJECT INVITES ID");
					console.log(vm.projectid);

					vm.utils.project.id = vm.projectid;

					if( !vm.utils.project.id ) {
						return;
					}

					vm.utils.initProjectInvites();
				});

			}()
		}
	}

	function projectInvitesFactory($q, $http, riskmachDatabasesFactory, rmConnectivityFactory, authFactory, rasicFactory, modelsFactory) 
	{
		var factory = {};

		factory.utils = {
			isProjectAdmin: function(project) {
				var is_admin = false;
				var admin_user_id = null;

				if( !project ) {
					return is_admin;
				}

				if( project.hasOwnProperty('admin_user_id') && project.admin_user_id ) {
					admin_user_id = parseInt(project.admin_user_id);
				} else {
					admin_user_id = parseInt(project.added_by);
				}

				if( admin_user_id == authFactory.rmCloudUserId() ) {
					is_admin = true;
				}

				return is_admin;
			},
			isProjectPrivate: function(project) {
				var is_private = false;

				if( !project ) {
					return is_private;
				}

				if( project.hasOwnProperty('is_private') && project.is_private == 'Yes' ) {
					is_private = true;
				}

				return is_private;
			},
			isProjectMember: function(project_rasic) {
				var is_member = false;

				if( !project_rasic.length ) {
					return is_member;
				}

				var i = 0;
				var len = project_rasic.length;
				while(i < len) {
					if( project_rasic[i].grantee_id == authFactory.rmCloudUserId() && project_rasic[i].r == 'Yes' ) {
						is_member = true;
					}

					i++;
				}

				return is_member;
			}
		}

		factory.dbUtils = {
			project: {
				fetch: function(project_id) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.projects;

					db.get(project_id).then(function(project_doc) {

						console.log("GOT PROJECT");
						defer.resolve(project_doc);

					}).catch(function(error) {
						console.log("ERROR FETCHING PROJECT");
						defer.reject(error);
					});

					return defer.promise;
				},
				save: function(project_doc) {
					var defer = $q.defer();

					var db = riskmachDatabasesFactory.databases.collection.projects;

					db.put(project_doc).then(function(result) {
						project_doc._id = result.id;
						project_doc._rev = result.rev;

						defer.resolve();
					}).catch(function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
			}
		}

		factory.users = {
			requestCompanyUserList: function() {
				var defer = $q.defer();

				if( !rmConnectivityFactory.online_detection.online ) {
					defer.reject("No internet connection");
					return defer.promise;
				}

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/CompanyUserList',{ 
	                params: {
	                	client_id: authFactory.getActiveCompanyId()
	                }
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("COMPANY USER LIST REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		defer.resolve(data.users);
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("COMPANY USER LIST ERROR REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );
	                defer.reject("Error connecting to API for Company User List");
	            });

				return defer.promise;
			}
		}

		factory.requests = {
			projectsRequest: function(filters) {
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
			},
			projectRecord: function(rm_activity_id) {
				var defer = $q.defer();

				var filters = {
					activity_id: rm_activity_id, 
					paginate: 'no',
					page_num: 1,
					per_page: 1000, 
					client_id: authFactory.getClientId()
				}

				factory.requests.projectsRequest(filters).then(function(data) {

					if( !data.data || data.data.length == 0 ) {
						defer.reject("Couldn't find project record");
					} else {
						defer.resolve(data.data[0]);
					}

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
		}

		factory.updateProjectPrivacyStatus = function(project) 
		{
			var defer = $q.defer();

			var params = {
				activity_id: project.rm_id, 
				private: 'No'
			}

			if( project.hasOwnProperty('is_private') && project.is_private == 'Yes' ) {
				params.private = 'Yes';
			}

			$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/SetProjectPrivate',{ 
                params: params
            })
            .success(function(data, status, headers, config) {
            	console.log("SET PROJECT PRIVATE REQUEST RESPONSE");
            	console.log( JSON.stringify(data, null, 2) );

            	if( data.error == true ) {
            		defer.reject(data.error_messages[0]);
            	} else {
            		defer.resolve();
            	};
            })
            .error(function(data, status, headers, config) {
            	console.log("SET PROJECT PRIVATE REQUEST ERROR RESPONSE");
            	console.log( JSON.stringify(data, null, 2) );
                defer.reject("Error connecting to API for updating project privacy");
            });

			return defer.promise;
		}

		factory.runProjectAccessCheck = function(project_record) 
		{
			var defer = $q.defer();

			var has_access = false;
			var is_admin = factory.utils.isProjectAdmin(project_record);

			factory.runProjectMemberCheck(project_record.rm_id).then(function(is_member) {

				// IF PROJECT IQA ALLOW ACCESS FOR QC
				if( project_record.hasOwnProperty('iqa_user_id') && project_record.iqa_user_id && parseInt(project_record.iqa_user_id) == authFactory.rmCloudUserId() ) {
					has_access = true;
				}

				// IF ADMIN OR MEMBER ALLOW ACCESS
				if( is_admin || is_member ) {
					has_access = true;
				}

				defer.resolve(has_access);

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.runProjectMemberCheck = function(rm_project_id) 
		{
			var defer = $q.defer();

			var params = angular.copy(rasicFactory.utils.rasic_filters);
			params.record_type = 'project';
			params.record_id = parseInt(rm_project_id);

			rasicFactory.refreshRasic(params).then(function() {

				var filters = {
					rm_record_id: parseInt(rm_project_id),
					record_type: 'project',
					user_id: authFactory.cloudUserId()
				}

				rasicFactory.dbUtils.getRasic(filters).then(function(data) {

					var is_member = factory.utils.isProjectMember(data);

					defer.resolve(is_member);

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.simpleCheckProjectAccess = function(project_record, project_invites) 
		{
			var has_access = false;
			var is_admin = factory.utils.isProjectAdmin(project_record);
			var is_member = factory.utils.isProjectMember(project_invites);

			// IF PROJECT IQA ALLOW ACCESS FOR QC
			if( project_record.hasOwnProperty('iqa_user_id') && project_record.iqa_user_id && parseInt(project_record.iqa_user_id) == authFactory.rmCloudUserId() ) {
				has_access = true;
			}

			// IF ADMIN OR MEMBER ALLOW ACCESS
			if( is_admin || is_member ) {
				has_access = true;
			}

			return has_access;
		}

		factory.getSaveProjectPrivacyStatus = function(project_record) 
		{
			var defer = $q.defer();

			factory.requests.projectRecord(project_record.rm_id, false).then(function(cloud_project_record) {

				cloud_project_record = modelsFactory.utils.formatRmRecordToModel('project', cloud_project_record);

				// UPDATE VALUES
				project_record.is_private = cloud_project_record.is_private;
				project_record.admin_user_id = cloud_project_record.admin_user_id;

				factory.dbUtils.project.save(project_record).then(function() {
					defer.resolve();
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
	
	function projectInvites() 
	{
		var directive = {};

		directive.scope = {
			projectid: '='
		};

		directive.restrict = 'A';
		directive.controller = 'projectInvitesController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/project-invites/tpl/project_invites.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

})();