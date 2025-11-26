(function() {

	var app = angular.module('riskmachQualityCheck', ['riskmachUtils','riskmachDatabases']);
	app.factory('qualityCheckFactory', qualityCheckFactory);

	function qualityCheckFactory($q, riskmachDatabasesFactory, authFactory, rmUtilsFactory) 
	{
		var factory = {};

		factory.utils = {
			calcQcStats: function(qc_check_records) {
				var i = 0;
				var data = {
					total: qc_check_records.length,
					num_checked: 0,
					num_approved: 0, 
					num_rejected: 0,
					num_fixed: 0,
					percentage_checked: 0,
					percentage_approved: 0,
					percentage_rejected: 0,
					percentage_fixed: 0, 
					iqa_eligible: {
						total: 0,
						num_checked: 0,
						num_approved: 0, 
						num_rejected: 0,
						num_fixed: 0,
						percentage_checked: 0,
						percentage_approved: 0,
						percentage_rejected: 0,
						percentage_fixed: 0
					}, 
					author_eligible: {
						total: 0,
						num_checked: 0,
						num_approved: 0, 
						num_rejected: 0,
						num_fixed: 0,
						percentage_checked: 0,
						percentage_approved: 0,
						percentage_rejected: 0,
						percentage_fixed: 0
					}
				}

				var qc_checked_statuses = [2,3];

				while(i < data.total) {

					// *** TOTALS ***

					// QUALITY CHECKS REVIEWED
					if( qc_checked_statuses.indexOf(qc_check_records[i].ReviewStatus) !== -1 ) {
						data.num_checked++;
					}

					// APPROVED QUALITY CHECKS
					if( qc_check_records[i].ReviewStatus == 2 ) {
						data.num_approved++;
					}

					// REJECTED QUALITY CHECKS
					if( qc_check_records[i].ReviewStatus == 3 ) {
						data.num_rejected++;
					}

					// FIXED REJECTIONS
					if( qc_check_records[i].RejectionOutcome == 'Fixed' ) {
						data.num_fixed++;
					}


					// *** IQA ELIGIBLE ***

					// IF NOT AUTHOR OF RISK
					if( qc_check_records[i].hasOwnProperty('AssessmentAddedBy') && qc_check_records[i].AssessmentAddedBy && qc_check_records[i].AssessmentAddedBy != authFactory.rmCloudUserId() ) {

						data.iqa_eligible.total++;

						// QUALITY CHECKS REVIEWED
						if( qc_checked_statuses.indexOf(qc_check_records[i].ReviewStatus) !== -1 ) {
							data.iqa_eligible.num_checked++;
						}

						// APPROVED QUALITY CHECKS
						if( qc_check_records[i].ReviewStatus == 2 ) {
							data.iqa_eligible.num_approved++;
						}

						// REJECTED QUALITY CHECKS
						if( qc_check_records[i].ReviewStatus == 3 ) {
							data.iqa_eligible.num_rejected++;
						}

						// FIXED REJECTIONS
						if( qc_check_records[i].RejectionOutcome == 'Fixed' ) {
							data.iqa_eligible.num_fixed++;
						}

					}


					// ***AUTHOR ELIGIBLE***

					// IF AUTHOR OF RISK
					if( qc_check_records[i].hasOwnProperty('AssessmentAddedBy') && qc_check_records[i].AssessmentAddedBy && qc_check_records[i].AssessmentAddedBy == authFactory.rmCloudUserId() ) {

						data.author_eligible.total++;

						// QUALITY CHECKS REVIEWED
						if( qc_checked_statuses.indexOf(qc_check_records[i].ReviewStatus) !== -1 ) {
							data.author_eligible.num_checked++;
						}

						// APPROVED QUALITY CHECKS
						if( qc_check_records[i].ReviewStatus == 2 ) {
							data.author_eligible.num_approved++;
						}

						// REJECTED QUALITY CHECKS
						if( qc_check_records[i].ReviewStatus == 3 ) {
							data.author_eligible.num_rejected++;
						}

						// FIXED REJECTIONS
						if( qc_check_records[i].RejectionOutcome == 'Fixed' ) {
							data.author_eligible.num_fixed++;
						}

					}

					// IF NO ASSESSMENT ADDED BY DUE TO OLD RECORD BEFORE UPDATE
					if( !qc_check_records[i].hasOwnProperty('AssessmentAddedBy') || !qc_check_records[i].AssessmentAddedBy ) {
						
						data.iqa_eligible.total++;
						data.author_eligible.total++;

						// QUALITY CHECKS REVIEWED
						if( qc_checked_statuses.indexOf(qc_check_records[i].ReviewStatus) !== -1 ) {
							data.iqa_eligible.num_checked++;
							data.author_eligible.num_checked++;
						}

						// APPROVED QUALITY CHECKS
						if( qc_check_records[i].ReviewStatus == 2 ) {
							data.iqa_eligible.num_approved++;
							data.author_eligible.num_approved++;
						}

						// REJECTED QUALITY CHECKS
						if( qc_check_records[i].ReviewStatus == 3 ) {
							data.iqa_eligible.num_rejected++;
							data.author_eligible.num_rejected++;
						}

						// FIXED REJECTIONS
						if( qc_check_records[i].RejectionOutcome == 'Fixed' ) {
							data.iqa_eligible.num_fixed++;
							data.author_eligible.num_fixed++;
						}

					}

					i++;
				}

				// CALCULATE TOTAL PERCENTAGES
				if( data.total > 0 ) {
					data.percentage_checked = Math.round( (data.num_checked / data.total) * 100 );
					data.percentage_approved = Math.round( (data.num_approved / data.total) * 100 );
					data.percentage_rejected = Math.round( (data.num_rejected / data.total ) * 100 );
				}

				if( data.num_rejected > 0 ) {
					data.percentage_fixed = Math.round( (data.num_fixed / data.num_rejected) * 100 );
				} else {

					// IF QC 100% CHECKED AND NO REJECTIONS
					if( data.num_checked > 0 && data.percentage_checked == 100 ) {
						data.percentage_fixed = 100;
					}

				}

				// CALCULATE IQA PERCENTAGES
				if( data.iqa_eligible.total > 0 ) {
					data.iqa_eligible.percentage_checked = Math.round( (data.iqa_eligible.num_checked / data.iqa_eligible.total) * 100 );
					data.iqa_eligible.percentage_approved = Math.round( (data.iqa_eligible.num_approved / data.iqa_eligible.total) * 100 );
					data.iqa_eligible.percentage_rejected = Math.round( (data.iqa_eligible.num_rejected / data.iqa_eligible.total ) * 100 );
				}

				if( data.iqa_eligible.num_rejected > 0 ) {
					data.iqa_eligible.percentage_fixed = Math.round( (data.iqa_eligible.num_fixed / data.iqa_eligible.num_rejected) * 100 );
				} else {

					// IF IQA QC 100% CHECKED AND NO REJECTIONS
					if( data.iqa_eligible.num_checked > 0 && data.iqa_eligible.percentage_checked == 100 ) {
						data.iqa_eligible.percentage_fixed = 100;
					}

				}

				// CALCULATE AUTHOR PERCENTAGES
				if( data.author_eligible.total > 0 ) {
					data.author_eligible.percentage_checked = Math.round( (data.author_eligible.num_checked / data.author_eligible.total) * 100 );
					data.author_eligible.percentage_approved = Math.round( (data.author_eligible.num_approved / data.author_eligible.total) * 100 );
					data.author_eligible.percentage_rejected = Math.round( (data.author_eligible.num_rejected / data.author_eligible.total ) * 100 );
				}

				if( data.author_eligible.num_rejected > 0 ) {
					data.author_eligible.percentage_fixed = Math.round( (data.author_eligible.num_fixed / data.author_eligible.num_rejected) * 100 );
				} else {

					// IF AUTHOR QC 100% CHECKED AND NO REJECTIONS
					if( data.author_eligible.num_checked > 0 && data.author_eligible.percentage_checked == 100 ) {
						data.author_eligible.percentage_fixed = 100;
					}

				}

				return data;
			},
			formatQcCollection: function(records) {
				var i = 0;
				var len = records.length;

				while(i < len) {

					factory.utils.formatQcRecord(records[i]);

					i++;
				}
			},
			formatQcRecord: function(record) {
				// IF REJECTED BUT NOT OUTCOME SET
				if( record.ReviewStatus == 3 && !record.RejectionOutcome ) {
					record.RejectionOutcome = 'Not Fixed';
				}
			}
		}

		factory.dbUtils = {
			fetchQcCheckRecords: function(params) {
				var defer = $q.defer();

				if( !params.activity_id || !params.review_id ) {
					defer.resolve([]);
					return defer.promise;
				}

				var db = riskmachDatabasesFactory.databases.collection.qc_check_records;

				db.find({
					selector: {
						user_id: authFactory.cloudUserId(),
						company_id: authFactory.cloudCompanyId(),
						activity_id: params.activity_id,
						ReviewID: params.review_id
					}
				}).then(function(result) {

					console.log("FETCHED QC CHECK RECORDS");
					console.log(result.docs);

					defer.resolve(result.docs);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			fetchQcCheckRecordsMultiple: function(params) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				// PREPARE COLLECTION ARRAY
				var collection = [];

				var options = {
					limit: 100,
					include_docs: true
				}

				var db = riskmachDatabasesFactory.databases.collection.qc_check_records;

				fetchNextPage(fetch_defer).then(function() {
					defer.resolve(collection);
				}, function(error) {
					console.log(error);
					defer.reject(error);
				});

				function fetchNextPage(defer) 
				{
					db.allDocs(options).then(function(result) {

						if( result && result.rows.length > 0 ) 
						{
							var i = 0;
							var len = result.rows.length;
							var filtered_array = [];

							while(i < len) {
								var errors = 0;

								// IF USER ID DOES NOT MATCH
								if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
									errors++;
								}

								// IF COMPANY ID DOES NOT MATCH
								if( !result.rows[i].doc.hasOwnProperty('company_id') || result.rows[i].doc.company_id != authFactory.cloudCompanyId() ) {
									errors++;
								}

								// IF ACTIVITY ID OR REVIEW ID DO NOT MATCH
								if( !result.rows[i].doc.hasOwnProperty('activity_id') || !result.rows[i].doc.hasOwnProperty('ReviewID') || (params.activity_ids.indexOf(result.rows[i].doc.activity_id) === -1 && params.review_ids.indexOf(result.rows[i].doc.ReviewID) === -1) ) {
									errors++;
								}

								if( !errors ) {
									filtered_array.push(result.rows[i].doc);
								}

								i++;
							}

							collection.push(...filtered_array);

							options.startkey = result.rows[ result.rows.length - 1 ].id;
							options.skip = 1;

							// CLEAN UP
							result.rows = null;
							filtered_array = [];

							fetchNextPage(defer);
						} 
						else 
						{
							// FINISHED PAGINATION, RESOLVE
							defer.resolve();
						}

					}).catch(function(error) {
						console.log(error);
						defer.reject(error);
					});

					return defer.promise;
				}

				return defer.promise;
			},
			saveQcCheckRecord: function(qc_check_record) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.qc_check_records;

				rmUtilsFactory.sync_decoration.qc_check_records.qualityCheckRecordModified(qc_check_record);

				if( !qc_check_record.hasOwnProperty('_id') || !qc_check_record._id ) {

					db.post(qc_check_record, {force: true}).then(function(result) {
						qc_check_record._id = result.id;
						qc_check_record._rev = result.rev;

						defer.resolve();
					}).catch(function(error) {
						defer.reject(error);
					});

				} else {

					db.put(qc_check_record).then(function(result) {
						qc_check_record._id = result.id;
						qc_check_record._rev = result.rev;

						defer.resolve();
					}).catch(function(error) {
						defer.reject(error);
					});

				}

				return defer.promise;
			}
		}

		return factory;
	}

})()