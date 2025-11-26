(function(){

	var app = angular.module('riskmachRasic', ['riskmachUtils','riskmachDatabases','riskmachModels']);
	app.factory('rasicFactory', rasicFactory);

	function rasicFactory($q, $http, riskmachDatabasesFactory, rmConnectivityFactory, authFactory, modelsFactory) 
	{
		var factory = {};

		factory.utils = {
			rasic_filters: {
				record_type: null, 
				record_id: null, 
				user_id: null, 
				record_ref: null, 
				paginate: 'no',
				page_num: null, 
				per_page: null
			},
			formatCloudRasicRecord: function(rasic_record) {
				rasic_record.user_id = authFactory.cloudUserId();
			}
		}

		factory.requests = {
			rasic: function(filters) {
				var defer = $q.defer();

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/RasicRoles',{ 
	                params: {
	                	filters: filters
	                }
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("RASIC REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		defer.resolve(data.data);
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("RASIC REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );
	                defer.reject("Error connecting to API for RASIC");
	            });

				return defer.promise;
			},
			inviteProjectMember: function(params) {
				var defer = $q.defer();

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/InviteProjectMember',{ 
	                params: params
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("INVITE PROJECT MEMBER REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		defer.resolve(data.data);
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("INVITE PROJECT MEMBER ERROR REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );
	                defer.reject("Error connecting to API to invite project member");
	            });

				return defer.promise;
			},
			removeProjectMember: function(params) {
				var defer = $q.defer();

				console.log(params);

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/RemoveProjectMember',{ 
	                params: params
	            })
	            .success(function(data, status, headers, config) {
	            	console.log("REMOVE PROJECT MEMBER REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );

	            	if( data.error == true ) {
	            		defer.reject(data.error_messages[0]);
	            	} else {
	            		defer.resolve(data.data);
	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("REMOVE PROJECT MEMBER REQUEST RESPONSE");
	            	console.log( JSON.stringify(data, null, 2) );
	                defer.reject("Error connecting to API to remove project member");
	            });

				return defer.promise;
			}
		}

		factory.dbUtils = {
			saveCloudRasicRecord: function(rasic_record) {
				var defer = $q.defer();

				factory.utils.formatCloudRasicRecord(rasic_record);

				factory.dbUtils.fetchCloudRasicRecord(rasic_record).then(function(existing_record) {

					if( !existing_record ) {

						factory.dbUtils.saveNewCloudRasicRecord(rasic_record).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});

					} else {

						factory.dbUtils.updateCloudRasicRecord(rasic_record, existing_record).then(function() {
							defer.resolve();
						}, function(error) {
							defer.reject(error);
						});

					}

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}, 
			fetchCloudRasicRecord: function(rasic_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.rasic;

				db.find({
					selector: {
						rasic_id: rasic_record.rasic_id,
						user_id: authFactory.cloudUserId()
					}
				}).then(function(result) {

					if( !result.docs.length ) {
						defer.resolve(null);
					} else {
						defer.resolve(result.docs[0]);
					}

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			saveNewCloudRasicRecord: function(rasic_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.rasic;

				db.post(rasic_record, {force: true}).then(function(result) {

					rasic_record._id = result.id;
					rasic_record._rev = result.rev;

					console.log("SAVED NEW CLOUD RASIC RECORD");

					defer.resolve();

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}, 
			updateCloudRasicRecord: function(rasic_record, existing_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.rasic;

				// SET DB VALUES FOR UPDATE
				rasic_record._id = existing_record._id;
				rasic_record._rev = existing_record._rev;

				db.put(rasic_record).then(function(result) {

					rasic_record._id = result.id;
					rasic_record._rev = result.rev;

					console.log("UPDATED CLOUD RASIC RECORD");

					defer.resolve();

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getRasic: function(filters) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.rasic;

				db.find({
					selector: filters
				}).then(function(result) {

					console.log(filters);
					console.log(result.docs);
					console.log("GET RASIC");

					defer.resolve(result.docs);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			saveRasicRecord: function(rasic_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.rasic;

				if( !rasic_record.hasOwnProperty('_id') || !rasic_record._id ) {

					db.post(rasic_record, {force: true}).then(function(result) {
						rasic_record._id = result.id;
						rasic_record._rev = result.rev;

						defer.resolve();
					}).catch(function(error) {
						defer.reject(error);
					});

				} else {

					db.put(rasic_record).then(function(result) {
						rasic_record._id = result.id;
						rasic_record._rev = result.rev;

						defer.resolve();
					}).catch(function(error) {
						defer.reject(error);
					});

				}

				return defer.promise;
			}
		}

		factory.refreshRasic = function(filters) 
		{
			var defer = $q.defer();

			factory.requests.rasic(filters).then(function(rasic) {

				factory.saveRasic(rasic).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.saveRasic = function(rasic) 
		{
			var defer = $q.defer();
			var save_defer = $q.defer();

			if( !rasic.length ) {
				defer.resolve();
				return defer.promise;
			}

			saveNextRasic(save_defer, 0).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function saveNextRasic(defer, active_index) {

				// FINISHED SAVING RASIC
				if( active_index > rasic.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				factory.dbUtils.saveCloudRasicRecord(rasic[active_index]).then(function() {

					active_index++;

					saveNextRasic(defer, active_index);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;	
			}

			return defer.promise;
		}

		factory.addProjectInvite = function(params) 
		{
			var defer = $q.defer();

			factory.requests.inviteProjectMember(params).then(function() {

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.removeProjectInvite = function(params) 
		{
			var defer = $q.defer();

			factory.requests.removeProjectMember(params).then(function() {

				defer.resolve();

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		return factory;
	}

})();