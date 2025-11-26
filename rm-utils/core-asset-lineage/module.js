(function() {

	var app = angular.module('riskmachCoreAssetLineage', []);
	app.controller('coreAssetLineageController', coreAssetLineageController);
	app.factory('coreAssetLineageFactory', coreAssetLineageFactory);
	app.directive('coreAssetLineage', coreAssetLineage);

	function coreAssetLineageController($scope, coreAssetLineageFactory) 
	{
		var vm = this;

		vm.utils = {
			src_asset_id: vm.srcassetid,
			asset_lineage: {
				loading: false,
				data: null, 
				fetch: function() {
					vm.utils.asset_lineage.loading = true;

					// CLEAR ANY PREVIOUS ERRORS
					vm.utils.asset_lineage.error_handler.clear();

					coreAssetLineageFactory.dbUtils.getCoreAssetLineage(vm.utils.src_asset_id).then(function(data) {

						vm.utils.asset_lineage.data = data;

						vm.utils.asset_lineage.loading = false;

					}, function(error) {
						vm.utils.asset_lineage.loading = false;
						vm.utils.asset_lineage.error_handler.logError(error);
					});
				},
				toggleShowSubAssets: function(asset) {
					asset.show_sub_assets = !asset.show_sub_assets;
				},
				toggleShowMoreInfo: function(asset_id) {
					var i = 0;
					var len = vm.utils.asset_lineage.data.flat_list.length;

					while(i < len) {

						if( vm.utils.asset_lineage.data.flat_list[i]._id == asset_id ) {
							vm.utils.asset_lineage.data.flat_list[i].show_more_info = !vm.utils.asset_lineage.data.flat_list[i].show_more_info;
						} else {
							vm.utils.asset_lineage.data.flat_list[i].show_more_info = false;
						}

						i++;
					}
				},
				error_handler: {
					error: false,
					error_message: null, 
					logError: function(error) {
						vm.utils.asset_lineage.error_handler.error = true;
						vm.utils.asset_lineage.error_handler.error_message = error;
					},
					clear: function() {
						vm.utils.asset_lineage.error_handler.error = false;
						vm.utils.asset_lineage.error_handler.error_message = null;
					}
				}
			}
		};

		$scope.$watch('vm.srcassetid', function(newVal, oldVal) {
			vm.utils.src_asset_id = vm.srcassetid;

			vm.utils.asset_lineage.fetch();
		});
	}

	function coreAssetLineageFactory($q, riskmachDatabasesFactory, authFactory) 
	{
		var factory = {};

		factory.utils = {
			orig_asset_id: null,
			structureAssetLineage: function(collection) {
				var lineage = [];
				var parent_asset = null;

				// FORMAT COLLECTION
				collection.forEach(function(record, index) {

					// SET TOP LEVEL ASSET
					if( !record.hasOwnProperty('parent_asset_id') || !record.parent_asset_id ) {
						parent_asset = record;
						parent_asset.top_level_asset = 'Yes';
						parent_asset.asset_indent = 0;
					}

					// SET ORIG ASSET
					if( record._id == factory.utils.orig_asset_id ) {
						record.highlighted = 'Yes';
					}

					// INIT VALUES
					record.show_sub_assets = true;
					record.show_more_info = false;

				});

				// ADD PARENT ASSET TO LINEAGE
				lineage.push(parent_asset);

				// FIND DIRECT CHILDREN OF PARENT ASSET
				findDirectChildren(parent_asset, collection);

				function findDirectChildren(parent_asset, collection) {

					parent_asset.sub_assets = [];

					collection.forEach(function(record, index) {

						if( record.hasOwnProperty('parent_asset_id') && record.parent_asset_id == parent_asset._id ) {
							
							record.asset_indent = parent_asset.asset_indent + 20;

							parent_asset.sub_assets.push(record);

							// FIND SUB ASSET DIRECT CHILDREN
							findDirectChildren(record, collection);
						}

					});

				}

				return lineage;
			}
		}

		factory.dbUtils = {
			getCoreAssetLineage: function(core_asset_id) {
				var defer = $q.defer();

				if( !core_asset_id ) {
					defer.resolve(null);
					return defer.promise;
				}

				// SET SRC ASSET ID
				factory.utils.orig_asset_id = core_asset_id;

				factory.dbUtils.getLineageParentCoreAsset(core_asset_id).then(function(parent_asset) {

					var asset_collection = [];

					// ADD PARENT ASSET TO ASSET COLLECTION
					asset_collection.push(parent_asset);

					// NOW WE HAVE TOP LEVEL PARENT ASSET ID, LOOK FOR CHILDREN RECURSIVELY
					factory.dbUtils.collectCoreAssetLineage(parent_asset._id, asset_collection).then(function() {

						var data = {
							flat_list: asset_collection, 
							structured_list: null
						}

						// CREATE STRUCTURED LINEAGE OBJECT
						data.structured_list = factory.utils.structureAssetLineage(data.flat_list);

						console.log("ASSET LINEAGE DATA");
						console.log(data);

						defer.resolve(data);

					}, function(error) {
						defer.reject(error);
					});

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			getLineageParentCoreAsset: function(src_asset_id) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				factory.dbUtils.lookupLineageParentCoreAsset(fetch_defer, src_asset_id).then(function(parent_asset) {

					defer.resolve(parent_asset);

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			lookupLineageParentCoreAsset: function(defer, src_asset_id) {

				var db = riskmachDatabasesFactory.databases.collection.register_assets;

				db.get(src_asset_id).then(function(src_asset_doc) {

					// HAS NO PARENT, IS TOP LEVEL PARENT ASSET
					if( !src_asset_doc.hasOwnProperty('parent_asset_id') || !src_asset_doc.parent_asset_id ) {
						defer.resolve(src_asset_doc);
						return defer.promise;
					}

					factory.dbUtils.lookupLineageParentCoreAsset(defer, src_asset_doc.parent_asset_id);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			collectCoreAssetLineage: function(parent_asset_id, asset_collection) {
				var defer = $q.defer();
				var fetch_defer = $q.defer();

				factory.dbUtils.collectChildrenRecursively(fetch_defer, parent_asset_id, asset_collection).then(function() {

					defer.resolve();

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			collectChildrenRecursively: function(defer, parent_asset_id, asset_collection) {

				factory.dbUtils.fetchChildAssets(parent_asset_id).then(function(child_assets) {

					// PUSH CHILDREN INTO ASSET COLLECTION
					asset_collection.push(...child_assets);

					runNextNode(0);

					function runNextNode(active_index) {

						if( active_index > child_assets.length - 1 ) {
							defer.resolve();
							return defer.promise;
						}

						// factory.dbUtils.collectChildrenRecursively(defer, child_assets[active_index]._id, asset_collection).then(function() {

						// 	active_index++;
						// 	runNextNode(active_index);

						// }, function(error) {
						// 	defer.reject(error);
						// });

						factory.dbUtils.collectCoreAssetLineage(child_assets[active_index]._id, asset_collection).then(function() {

							active_index++;
							runNextNode(active_index);

						}, function(error) {
							defer.reject(error);
						});

					}

				}, function(error) {
					defer.reject(error);
				});

				return defer.promise;
			},
			fetchChildAssets: function(parent_asset_id) {
				var defer = $q.defer();

				var db = riskmachDatabasesFactory.databases.collection.register_assets;

				db.find({
					selector: {
						table: 'register_assets',
						company_id: authFactory.getActiveCompanyId(), 
						user_id: authFactory.cloudUserId(),
						parent_asset_id: parent_asset_id
					}
				}).then(function(result) {

					console.log("CHILD ASSETS FOR: " + parent_asset_id + "[" + result.docs.length + "]");
					defer.resolve(result.docs);

				}).catch(function(error) {
					console.log("ERROR FETCHING CHILD ASSETS FOR: " + parent_asset_id);
					defer.reject(error);
				});

				return defer.promise;
			}
		}

		return factory;
	}

	function coreAssetLineage() 
	{
		var directive = {};

		directive.scope = {
			srcassetid: '='
		};

		directive.restrict = 'A';
		directive.controller = 'coreAssetLineageController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/core-asset-lineage/tpl/core_asset_lineage.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

})();