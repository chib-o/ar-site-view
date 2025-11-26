(function() {

	var app = angular.module('riskmachReporting', []);
	app.factory('reportingUtilsFactory', reportingUtilsFactory);

	function reportingUtilsFactory($q, $http, riskmachDatabasesFactory, authFactory) 
	{
		var factory = {};

		factory.requests = {
			requestProjectRecord: function(project_id) {
				var defer = $q.defer();

				var filters = {
					activity_id: project_id, 
					paginate: null, 
					page_num: null, 
					per_page: null, 
					client_id: null,
				}

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/Projects',{ 
	                params: {
	                	filters: filters
	                }
	            })
	            .success(function(data, status, headers, config) {
	           		
	            	console.log("PROJECT RECORD REQUEST RESPONSE");
	            	console.log(data);

	            	if( data.error == true ) {

	            		if( data.error_messages && data.error_messages.length > 0 ) {
	            			defer.reject(data.error_messages[0]);
	            		} else {
	            			defer.reject("Error requesting project record");
	            		}

	            	} else {

	            		if( data.data && data.data.length > 0 ) {
	            			defer.resolve(data.data[0]);
	            		} else {
	            			defer.reject("Couldn't find the project record");
	            		}

	            	};
	            })
	            .error(function(data, status, headers, config) {
	            	console.log("PROJECT RECORD API ERROR RESPONSE");
	            	console.log(data);
	            	defer.reject("Error connecting to API for project record");
	            });

				return defer.promise;
			}
		}

		factory.utils = {

		}
		
		factory.updateProjectReportMeta = function(project_id, rm_id) 
		{
			var defer = $q.defer();

			factory.requests.requestProjectRecord(rm_id).then(function(project_record) {

				if( !project_record.hasOwnProperty('report_ref') || !project_record.report_ref ) {
					console.log("PROJECT NOT YET REPORTED");
					defer.resolve(null);
					return defer.promise;
				}

				factory.dbUtils.updateProjectRecordReportMeta(project_id, project_record).then(function(data) {

					defer.resolve(data);

				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.dbUtils = {
			updateProjectRecordReportMeta: function(project_id, project_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.projects;

				var resolve_data = {
					project: null, 
					asset: null
				}

				db.get(project_id).then(function(project_doc) {

					if( project_record.hasOwnProperty('report_id') && project_record.report_id ) {
						project_doc.report_id = parseInt(project_record.report_id);
					} else {
						project_doc.report_id = project_record.report_id;
					}

					if( project_record.hasOwnProperty('report_ref') && project_record.report_ref ) {
						project_doc.report_ref = parseInt(project_record.report_ref);
					} else {
						project_doc.report_ref = project_record.report_ref;
					}

					if( project_record.hasOwnProperty('report_status') && project_record.report_status ) {
						project_doc.report_status = parseInt(project_record.report_status);
					} else {
						project_doc.report_status = project_record.report_status;
					}

					project_doc.report_ref_guid = project_record.report_ref_guid;
					project_doc.report_date = project_record.report_date;
					project_doc.report_status_name = project_record.report_status_name;

					db.put(project_doc).then(function(result) {

						console.log("UPDATED PROJECT RECORD REPORT META");

						project_doc._id = result.id;
						project_doc._rev = result.rev;

						resolve_data.project = project_doc;

						factory.dbUtils.updateProjectAssetsReportMeta(project_id, project_record).then(function(saved_asset) {

							if( saved_asset ) {
								resolve_data.asset = saved_asset;
							} 

							defer.resolve(resolve_data);

						}, function(error) {
							defer.reject(error);
						});

					}).catch(function(error) {
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			updateProjectAssetsReportMeta: function(project_id, project_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.assets;

				db.find({
					selector: {
						table: 'assets',
						user_id: authFactory.cloudUserId(),
						project_id: project_id
					}
				}).then(function(result) {

					if( !result.docs.length ) {
						defer.resolve(null);
						return defer.promise;
					}

					var fetch_defer = $q.defer();

					var resolve_asset = null;

					updateNextAsset(fetch_defer, 0).then(function() {
						console.log("UPDATED PROJECT ASSETS REPORT META");
						defer.resolve(resolve_asset);
					}, function(error) {
						defer.reject(error);
					});

					function updateNextAsset(defer, active_index) {

						if( active_index > result.docs.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						factory.dbUtils.updateAssetRecordReportMeta(result.docs[0], project_record).then(function() {

							// RESOLVE ASSET IF ISSINGLEINSPECTION
							if( result.docs[0].hasOwnProperty('is_single_inspection') && result.docs[0].is_single_inspection == 'Yes' ) {
								resolve_asset = result.docs[0];
							}

							active_index++;

							updateNextAsset(defer, active_index);

						}, function(error) {
							defer.reject(error);
						});

						return defer.promise;
					}

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			updateAssetRecordReportMeta: function(asset_doc, project_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.assets;

				if( project_record.hasOwnProperty('report_id') && project_record.report_id ) {
					asset_doc.report_id = parseInt(project_record.report_id);
				} else {
					asset_doc.report_id = project_record.report_id;
				}

				if( project_record.hasOwnProperty('report_ref') && project_record.report_ref ) {
					asset_doc.report_ref = parseInt(project_record.report_ref);
				} else {
					asset_doc.report_ref = project_record.report_ref;
				}

				if( project_record.hasOwnProperty('report_status') && project_record.report_status ) {
					asset_doc.report_status = parseInt(project_record.report_status);
				} else {
					asset_doc.report_status = project_record.report_status;
				}
				
				asset_doc.report_ref_guid = project_record.report_ref_guid;
				asset_doc.report_date = project_record.report_date;
				asset_doc.report_status_name = project_record.report_status_name;

				db.put(asset_doc).then(function(result) {

					console.log("UPDATED ASSET RECORD REPORT META");

					asset_doc._id = result.id;
					asset_doc._rev = result.rev;

					defer.resolve();

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
		}

		return factory;
	}

})()