(function() {

	var app = angular.module('riskmachComplianceSetup', ['mgcrea.ngStrap','riskmachUtils','riskmachDatabases','riskmachModels']);
	app.controller('complianceSetupController', complianceSetupController);
	app.factory('complianceSetupFactory', complianceSetupFactory);
	app.directive('complianceSetup', complianceSetup);
	app.directive('complianceSetupBasic', complianceSetupBasic);

	function complianceSetupController($scope, $rootScope, $aside, $q, $sce, rmUtilsFactory, authFactory, riskmachDatabasesFactory, modelsFactory, complianceSetupFactory) 
	{
		authFactory.secureLoggedInPage();
		
		var vm = this;

		vm.utils = {
			test: false,
			theme: {
                currentTheme: localStorage.getItem("theme")
            },
			compliance_setup: {
				loading: false,
				saving: false,
				frequency_unit_options: [{
					label: 'Days',
					value: 'day'
				},{
					label: 'Weeks', 
					value: 'week'
				},{
					label: 'Months', 
					value: 'month'
				},{
					label: 'Years', 
					value: 'year'
				}],
				init: function() {

					if( !vm.utils.pp_relations.record_id ) {
						console.log("NO ACTIVE RECORD FOR COMPLIANCE SETUP");
						return;
					}

					vm.utils.compliance_setup.loading = true;

					vm.utils.active_record.getActiveRecord().then(function() {

						vm.utils.profile_points.refresh().then(function() {

							vm.utils.pp_relations.refresh().then(function() {

								vm.utils.compliance_setup.loading = false;

							}, function(error) {
								vm.utils.compliance_setup.loading = false;
								console.log(error);
								alert("Error fetching record compliance profiles");
							});

						}, function(error) {
							vm.utils.compliance_setup.loading = false;
							alert("Error fetching company profile points");
						});

					}, function(error) {
						vm.utils.compliance_setup.loading = false;
						alert("Error fetching active record");
					});
				},
				exit: function() {
					if( vm.utils.ipp_score_form.show ) {
						vm.utils.ipp_score_form.close();
						return;
					}

					$rootScope.$broadcast("complianceSetup::close");
				},
				events: function() {
					// $scope.$watch("vm.record_id", function(newVal, oldVal) {
					// 	vm.utils.pp_relations.record_id = vm.record_id;
					// });

					// $scope.$watch("vm.record_type", function(newVal, oldVal) {
					// 	vm.utils.pp_relations.record_type = vm.record_type;
					// });

					// $scope.$watchCollection("vm.profile_refs", function(newVal, oldVal) {
					// 	vm.utils.profile_points.profile_refs = vm.profile_refs;
					// });

					$scope.$on("complianceSetup::refresh", function(event, data) {

						vm.utils.pp_relations.record_id = data.record_id;
						vm.utils.pp_relations.record_type = data.record_type;

						vm.utils.profile_points.profile_refs = data.profile_refs;

						vm.utils.compliance_setup.init();
					});

					$scope.$on("complianceSetup::destroy", function(event, data) {

						setTimeout(function() {
							$scope.$destroy();
						}, 0);

					});

				}()
			},
			profile_points: {
				profile_refs: [],
				data: null, 
				visible_data: [],
				refresh: function() {
					var defer = $q.defer();

					rmUtilsFactory.dbUtils.profile_points.getProfilePoints().then(function(profile_points) {

						angular.forEach(profile_points, function(pp_record, pp_index) {
							profile_points[pp_index].setup_changed = false;
							profile_points[pp_index].saving = false;
						});

						// vm.utils.profile_points.data = profile_points;
						vm.utils.profile_points.data = vm.utils.profile_points.filterBannedProfilePoints(profile_points);

						vm.utils.profile_points.autoFilter();

						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				filterBannedProfilePoints: function(profile_points) {
					return rmUtilsFactory.utils.profile_points.filterBannedProfilePoints(profile_points);
				},
				autoFilter: function() {

					console.log(vm.utils.profile_points.profile_refs);

					if( !vm.utils.profile_points.profile_refs.length ) {
						vm.utils.profile_points.visible_data = vm.utils.profile_points.data;
						return;
					}

					vm.utils.profile_points.visible_data = [];

					var i = 0;
					var len = vm.utils.profile_points.data.length;

					while(i < len) {
						if( vm.utils.profile_points.profile_refs.indexOf( parseInt(vm.utils.profile_points.data[i].ProfileRef) ) !== -1 ) {
							vm.utils.profile_points.visible_data.push(vm.utils.profile_points.data[i]);
						}

						i++;	
					}
				},
				hasLiveIppRecord: function(profile_point) {
					var live_ipp_record = false;

					if( profile_point.ipp_record != null && profile_point.ipp_record.status == 1 ) {
						live_ipp_record = true;
					};

					return live_ipp_record;
				}, 
				profilePointStyle: function(profile_point) {
					var style = null;

					if( vm.utils.profile_points.hasLiveIppRecord(profile_point) ) {

						if( vm.utils.theme.currentTheme && vm.utils.theme.currentTheme == 'dark' ) {
							style = {
								'border-color': '#334155 #334155 #334155 rgb(1, 158, 223)',
								'color': 'lightgrey'
							};
						} else {
							style = {
								'border-color': 'rgb(221, 221, 221) rgb(221, 221, 221) rgb(221, 221, 221) rgb(1, 158, 223)', 
								'color': 'black'
							};
						}

					} else {

						if( vm.utils.theme.currentTheme && vm.utils.theme.currentTheme == 'dark' ) {
							style = {
								'border-color': '#334155 #334155 #334155 #334155',
								'color': '#64748b'
							};
						} else {
							style = {
								'border-color': 'rgb(221, 221, 221) rgb(221, 221, 221) rgb(221, 221, 221) rgb(221, 221, 221)',
								'color': 'lightgrey'
							};
						}
					};

					return style;
				},
				markProfilePointChanged: function(profile_point) {
					profile_point.setup_changed = true;
				},
				toggleProfilePointApplicable: function(profile_point) {

					vm.utils.profile_points.markProfilePointChanged(profile_point);

					// IF NEVER LINKED, CREATE PP RELATION
					if( profile_point.ipp_record == null ) {
						var ipp_record = modelsFactory.models.newIppScore(vm.utils.active_record.record._id, profile_point);
						profile_point.ipp_record = ipp_record;

						return;
					}

					if( profile_point.ipp_record ) {

						var status = 1; // live

						if( profile_point.ipp_record.status == 1 ) {
							status = 2; // deleted
						};

						profile_point.ipp_record.status = status;
					}
				},
				toggleSaveProfilePointApplicable: function(profile_point) {
					var defer = $q.defer();

					profile_point.saving = true;

					vm.utils.profile_points.toggleProfilePointApplicable(profile_point);

					vm.utils.pp_relations.saveProfilePointRelation(profile_point).then(function(saved_record) {

						// INDEX ON ASSET, BROADCAST ONCE INDEXED
						// CAN'T TOGGLE ANY PPS UNTIL SAVED?

						complianceSetupFactory.dbUtils.indexIppScoreOnCoreAsset(vm.utils.active_record.record._id, profile_point.ipp_record).then(function(saved_asset) {

							profile_point.saving = false;

							$rootScope.$broadcast("complianceSetup::coreAssetIppScoreIndexed", {asset_record: saved_asset});

							defer.resolve();

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveComplianceSetup: function() {
					var defer = $q.defer();

					vm.utils.compliance_setup.saving = true;
					
					complianceSetupFactory.dbUtils.pp_relations.saveComplianceSetup(vm.utils.profile_points.data, vm.utils.active_record.record._id).then(function() {
						
						console.log("FINISHED");

						complianceSetupFactory.dbUtils.indexAllIppScoresOnCoreAsset(vm.utils.active_record.record._id, vm.utils.profile_points.data).then(function(saved_asset) {

							vm.utils.compliance_setup.saving = false;
							$rootScope.$broadcast("complianceSetup::close");

							defer.resolve();

						}, function(error) {
							vm.utils.compliance_setup.saving = false;
							defer.reject(error);
						});

					}, function(error) {
						vm.utils.compliance_setup.saving = false;
						defer.reject(error);
					});

					return defer.promise;
				},
				ippScoreIcon: function(profile_point) {
					var icon = '../images/custom_icons/Pipp Not Rated.png';
					var matrix_score_phrase = null;

					if( !profile_point ) {
						return icon;
					};

                    if( angular.isUndefined(profile_point.ipp_record) ) {
                        return icon;
                    };

                    if( profile_point.ipp_record == null ) {
                   		return icon;
                   	};

                    if( angular.isUndefined(profile_point.ipp_record.matrix_score_phrase_initial) ) {
                    	return icon;
                    };

        			matrix_score_phrase = profile_point.ipp_record.matrix_score_phrase_initial;

                    if( matrix_score_phrase == null || matrix_score_phrase == '' ) {
                        return icon;
                    };

                    if( matrix_score_phrase == 'Low' ) {
                        icon = '../images/custom_icons/Pipp Low.png';
                        return icon;
                    };

                    if( matrix_score_phrase == 'Medium' ) {
                        icon = '../images/custom_icons/Pipp Medium.png';
                        return icon;
                    };

                    if( matrix_score_phrase == 'High' ) {
                        icon = '../images/custom_icons/Pipp High.png';
                        return icon;
                    };

                    if( matrix_score_phrase == 'Very High' ) {
                        icon = '../images/custom_icons/Pipp Very High.png';
                        return icon;
                    };

                    return icon;
				}
			},
			pp_relations: {
				record_id: null, 
				record_type: null,
				data: null, 
				refresh: function() {
					var defer = $q.defer();

					complianceSetupFactory.dbUtils.pp_relations.getRecordLiveProfilePointRelations(vm.utils.pp_relations.record_id).then(function(pp_relations) {
						vm.utils.pp_relations.data = pp_relations;



						vm.utils.pp_relations.overlayProfilePointRelations();

						defer.resolve();
					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				overlayProfilePointRelations: function() {
					angular.forEach(vm.utils.profile_points.data, function(pp_record, pp_index) {
						vm.utils.profile_points.data[pp_index].ipp_record = null;
						vm.utils.profile_points.data[pp_index].has_ipp_record = false;

						angular.forEach(vm.utils.pp_relations.data, function(ipp_record, ipp_index) {
							
							if( ipp_record.rm_profile_point_ref == pp_record.ProfileRef ) {
								vm.utils.profile_points.data[pp_index].ipp_record = ipp_record;

								if( vm.utils.profile_points.hasLiveIppRecord(vm.utils.profile_points.data[pp_index]) ) {
									vm.utils.profile_points.data[pp_index].has_ipp_record = true;
								}
							};

						});
					});

					console.log("PROFILE POINTS OVERLAY");
					console.log(vm.utils.profile_points.data);
					console.log(vm.utils.pp_relations.data);
				},
				saveProfilePointRelation: function(profile_point) {
					var defer = $q.defer();

					rmUtilsFactory.sync_decoration.ipp_scores.ippScoreModified(profile_point.ipp_record).then(function(modified_doc) {

						profile_point.ipp_record = modified_doc;

						complianceSetupFactory.dbUtils.pp_relations.saveIppScoreRecord(profile_point.ipp_record).then(function(saved_record) {

							profile_point.ipp_record._id = saved_record._id;
							profile_point.ipp_record._rev = saved_record._rev;

							defer.resolve(profile_point);

						}, function(error) {
							defer.reject(error);
						});

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			active_record: {
				record: null, 
				getActiveRecord: function() {
					var defer = $q.defer();

					var record_id = vm.utils.pp_relations.record_id;

					if( record_id == null ) {
						return defer.promise;
					}

					// INTERROGATE RECORD_TYPE TO SEE WHAT RECORD TO FETCH

					riskmachDatabasesFactory.databases.collection.register_assets.get(record_id).then(function(record) {
						if( !record ) {
							alert("Couldn't find the asset record");
							return;
						};

						vm.utils.active_record.record = record;

						defer.resolve();

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
			},
			ipp_score_form: {
				show: false,
				record_id: null,
				profile_point_ref: null,
				active_profile_point: null,
				open: function(profile_point) {
					
					// IF IPP RECORD NOT SAVED, SAVE FIRST
					if( profile_point.ipp_record._id == null ) {
						vm.utils.pp_relations.saveProfilePointRelation(profile_point).then(function(saved_record) {

							vm.utils.ipp_score_form.active_profile_point = profile_point;
							vm.utils.ipp_score_form.record_id = vm.utils.active_record.record._id;
							vm.utils.ipp_score_form.record_type = vm.utils.pp_relations.record_type;
							vm.utils.ipp_score_form.profile_point_ref = profile_point.ProfileRef;

							var ipp_score = angular.copy(vm.utils.ipp_score_form.active_profile_point.ipp_record);

							complianceSetupFactory.dbUtils.indexIppScoreOnCoreAsset(vm.utils.active_record.record._id, ipp_score).then(function(saved_asset) {

								$rootScope.$broadcast("complianceSetup::coreAssetIppScoreIndexed", {asset_record: saved_asset});

								vm.utils.ipp_score_form.show = true;

							});

						}, function(error) {
							defer.reject(error);
						});
					}

					// IPP RECORD SAVED
					if( profile_point.ipp_record._id != null ) {
						vm.utils.ipp_score_form.active_profile_point = profile_point;
						vm.utils.ipp_score_form.record_id = vm.utils.active_record.record._id;
						vm.utils.ipp_score_form.record_type = vm.utils.pp_relations.record_type;
						vm.utils.ipp_score_form.profile_point_ref = profile_point.ProfileRef;

						vm.utils.ipp_score_form.show = true;
					}
				},
				close: function() {
					vm.utils.ipp_score_form.show = false;

					vm.utils.ipp_score_form.record_id = null;
					vm.utils.ipp_score_form.record_type = null;
					vm.utils.ipp_score_form.profile_point_ref = null;
					vm.utils.ipp_score_form.active_profile_point = null;
				},
				events: function() {
					$scope.$on("ippScoreForm::saved", function(event, data) {

						if( vm.utils.ipp_score_form.record_type == 'asset' ) {
							// UPDATE IDs
							vm.utils.ipp_score_form.active_profile_point.ipp_record._id = data._id;
							vm.utils.ipp_score_form.active_profile_point.ipp_record._rev = data._rev;
							// UPDATE PROFILE POINT
							vm.utils.ipp_score_form.active_profile_point.ipp_record.matrix_consequence_initial = data.consequence;
							vm.utils.ipp_score_form.active_profile_point.ipp_record.matrix_consequence_phrase_initial = data.consequence_phrase;
							vm.utils.ipp_score_form.active_profile_point.ipp_record.matrix_likelihood_initial = data.likelihood;
							vm.utils.ipp_score_form.active_profile_point.ipp_record.matrix_likelihood_phrase_initial = data.likelihood_phrase;
							vm.utils.ipp_score_form.active_profile_point.ipp_record.matrix_score_initial = data.score;
							vm.utils.ipp_score_form.active_profile_point.ipp_record.matrix_score_phrase_initial = data.score_phrase;
							vm.utils.ipp_score_form.active_profile_point.ipp_record.excluded_from_inspection = data.excluded_from_inspection;
							vm.utils.ipp_score_form.active_profile_point.ipp_record.deterioration_risk = data.deterioration_risk;
							vm.utils.ipp_score_form.active_profile_point.ipp_record.pipp_notes = data.pipp_notes;
							vm.utils.ipp_score_form.active_profile_point.ipp_record.agent_asset_size = data.agent_asset_size;
							vm.utils.ipp_score_form.active_profile_point.ipp_record.agent_inspection_time = data.agent_inspection_time;
						
							var ipp_score = angular.copy(vm.utils.ipp_score_form.active_profile_point.ipp_record);

							complianceSetupFactory.dbUtils.indexIppScoreOnCoreAsset(vm.utils.active_record.record._id, ipp_score).then(function(saved_asset) {

								$rootScope.$broadcast("complianceSetup::coreAssetIppScoreIndexed", {asset_record: saved_asset});

							});

						};

						$scope.$apply();

					});

					$scope.$on("ippScoreForm::exit", function(event, data) {
						vm.utils.ipp_score_form.close();
					});
				}()
			}
		};
	}

	function complianceSetupFactory($q, riskmachDatabasesFactory, authFactory, rmUtilsFactory) 
	{
		var factory = {};

		factory.utils = {
			pp_relations: {
				filterLpaProgrammeIppRelations: function(pp_relations) {
					var filtered = [];

					var i = 0;
					var len = pp_relations.length;
					while(i < len) {
						var errors = 0;

						if( pp_relations[i].hasOwnProperty('lpa_programme_id') && pp_relations[i].lpa_programme_id ) {
							errors++;
						}

						if( !errors ) {
							filtered.push(pp_relations[i]);
						}

						i++;
					}

					return filtered;
				}
			}
		}

		factory.dbUtils = {
			pp_relations: {
				getRecordProfilePointRelations: function(record_id) {
					var defer = $q.defer();

					riskmachDatabasesFactory.databases.collection.register_asset_ipp.find({
						selector: {
							table: 'register_asset_ipp',
							company_id: authFactory.getActiveCompanyId(),
							user_id: authFactory.cloudUserId(), 
							asset_id: record_id
						}
					}).then(function(results){

						defer.resolve(results.docs);

					}).catch(function(error){
						defer.reject(error);
					});

					return defer.promise;
				},
				getRecordLiveProfilePointRelations: function(record_id) {
					var defer = $q.defer();

					factory.dbUtils.pp_relations.getRecordProfilePointRelations(record_id).then(function(data) {

						data = factory.utils.pp_relations.filterLpaProgrammeIppRelations(data);

						var live_data = [];

						if( data.length == 0 ) {
							defer.resolve(live_data);
							return defer.promise;
						}

						angular.forEach(data, function(record, index) {
							if( record.status == 1 ) {
								live_data.push(record);
							}
						});

						defer.resolve(live_data);

					}, function(error) {
						defer.reject(error);
					});

					return defer.promise;
				},
				saveComplianceSetup: function(profile_points, asset_id) {
					var defer = $q.defer();
					var save_defer = $q.defer();

					if( profile_points.length == 0 ) {
						defer.resolve();
						return defer.promise;
					};

					var active_index = 0;

					saveIppScoreRecord(save_defer, profile_points[active_index]).then(function() {
							
						rmUtilsFactory.sync_decoration.register_assets.markAssetModified(asset_id).then(function() {
							defer.resolve();
						});

					}, function(error) {
						defer.reject(error);
					});

					function saveIppScoreRecord(defer, profile_point) {

						if( !profile_point.setup_changed ) 
						{
							active_index++;

							if( active_index > profile_points.length - 1 ) {
								defer.resolve();
							} else {
								saveIppScoreRecord(defer, profile_points[active_index]);
							}
							
						}
						else
						{
							if( profile_point.ipp_record ) {

								profile_point.ipp_record = rmUtilsFactory.sync_decoration.ipp_scores.ippScoreModifiedOnly(profile_point.ipp_record);

								factory.dbUtils.pp_relations.saveIppScoreRecord(profile_point.ipp_record).then(function() {

									active_index++;

									if( active_index > profile_points.length - 1 ) {
										defer.resolve();
									} else {
										saveIppScoreRecord(defer, profile_points[active_index]);
									}

								}, function(error) {
									defer.reject(error);
								});
							}
						}

						return defer.promise;
					}

					return defer.promise;
				},
				saveIppScoreRecord: function(doc) {
					var defer = $q.defer();

					var options = {
						force: true
					};

					riskmachDatabasesFactory.databases.collection.register_asset_ipp.post(doc, options).then(function(ipp_result) {

						doc._id = ipp_result.id;
						doc._rev = ipp_result.rev;

						console.log("IPP SCORE SAVED");

						defer.resolve(doc);

					}).catch(function(error) {
						console.log("ERROR 2: " + error);
						defer.reject(error);
					});

					return defer.promise;
				}
			},
			indexAllIppScoresOnCoreAsset: function(asset_id, profile_points) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.register_assets;

				db.get(asset_id).then(function(asset_doc) {

					// SETUP ARRAY
					asset_doc.associated_ipp_scores = [];

					var i = 0;
					var len = profile_points.length;
					while(i < len) {

						// IF LIVE IPP SCORE, PUSH INTO ARRAY
						if( profile_points[i].ipp_record && profile_points[i].ipp_record.status == 1 ) {
							asset_doc.associated_ipp_scores.push(profile_points[i].ipp_record);
						}

						i++;
					}

					// MARK ASSET MODIFIED
					asset_doc = rmUtilsFactory.sync_decoration.register_assets.assetModified(asset_doc);

					db.put(asset_doc).then(function(result) {

						asset_doc._id = result.id;
						asset_doc._rev = result.rev;

						defer.resolve(asset_doc);

					}).catch(function(error) {
						console.log("ERROR: " + error);
						defer.reject(error);
					});

				}).catch(function(error) {
					console.log("ERROR 2: " + error);
					defer.reject(error);
				});

				return defer.promise;
			},
			indexIppScoreOnCoreAsset: function(asset_id, ipp_score) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.register_assets;

				db.get(asset_id).then(function(asset_doc) {

					var deleted = false;
					if( ipp_score.status == 2 ) {
						deleted = true;
					}

					// SETUP ARRAY IF NOT ONE
					if( !asset_doc.hasOwnProperty('associated_ipp_scores') || !asset_doc.associated_ipp_scores ) {
						asset_doc.associated_ipp_scores = [];
					}

					var i = 0;
					var len = asset_doc.associated_ipp_scores.length;
					var ipp_index = null;

					if( deleted ) {

						if( asset_doc.associated_ipp_scores.length > 0 ) {
							// ATTEMPT FIND AND SPLICE
							while(i < len) {
								if( asset_doc.associated_ipp_scores[i]._id == ipp_score._id ) {
									ipp_index = i;
								}

								i++;
							}

							// IF IPP SCORE FOUND, UPDATE ELSE ADD NEW TO ARRAY
							if( ipp_index != null ) {
								asset_doc.associated_ipp_scores.splice(ipp_index, 1);
							}
						}

					} else {

						if( asset_doc.associated_ipp_scores.length > 0 ) {
							
							// ATTEMPT FIND EXISTING IPP SCORE IN ARRAY
							while(i < len) {
								if( asset_doc.associated_ipp_scores[i]._id == ipp_score._id ) {
									ipp_index = i;
								}

								i++;
							}

							// IF IPP SCORE FOUND, UPDATE ELSE ADD NEW TO ARRAY
							if( ipp_index != null ) {
								asset_doc.associated_ipp_scores[ipp_index] = ipp_score;
							} else {
								asset_doc.associated_ipp_scores.push(ipp_score);
							}

						} else {
							asset_doc.associated_ipp_scores.push(ipp_score);
						}

					}

					// MARK ASSET MODIFIED
					asset_doc = rmUtilsFactory.sync_decoration.register_assets.assetModified(asset_doc);

					db.put(asset_doc).then(function(result) {

						asset_doc._id = result.id;
						asset_doc._rev = result.rev;

						defer.resolve(asset_doc);

					}).catch(function(error) {
						console.log("ERROR: " + error);
						defer.reject(error);
					});

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}
		};

		return factory;
	}

	function complianceSetup() 
	{
		var directive = {};

		directive.scope = {
			// record_id: '=recordid',
			// record_type: '=recordtype',
			// profile_refs: '=profilerefs'
		};

		directive.restrict = 'A';
		directive.controller = 'complianceSetupController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/compliance-setup/tpl/compliance_setup.html';
		directive.bindToController = true;

		return directive;
	}

	function complianceSetupBasic() 
	{
		var directive = {};

		directive.scope = {
			// record_id: '=recordid',
			// record_type: '=recordtype',
			// profile_refs: '=profilerefs'
		};

		directive.restrict = 'A';
		directive.controllerAs = 'vm';
		directive.controller = 'complianceSetupController';
		directive.templateUrl = '../rm-utils/compliance-setup/tpl/compliance_setup_basic.html';
		directive.bindToController = true;

		return directive;
	}

}())