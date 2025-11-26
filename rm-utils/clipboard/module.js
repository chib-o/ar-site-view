(function(){

	var module = angular.module('rmClipboard', ['riskmachDatabases','riskmachUtils','angularUtils.directives.dirPagination','riskmachMedia']);
	module.controller('clipboardController', clipboardController);
	module.controller('quickAddClipboardController', quickAddClipboardController);
	module.factory('clipboardFactory', clipboardFactory);
	module.directive('riskmachClipboard', riskmachClipboard);
	module.directive('toggleOnClipboard', toggleOnClipboard);

	module.config(function(paginationTemplateProvider) {
    	paginationTemplateProvider.setPath('../common/tpl/dirPagination.tpl.html');
	});

	function quickAddClipboardController($scope, $rootScope, $alert, clipboardFactory)
	{
		var vm = this;

		vm.on_clipboard = false;
		vm.is_loading = false;
		vm.skip_review_check = false;

		// vm.iteminfo;

		$scope.$watch("vm.iteminfo", function(newVal, oldVal){
			vm.on_clipboard = clipboardFactory.itemOnClipboard(vm.iteminfo);
		});

		$scope.$on("clipboard::itemChanged", function(event, data){

			if( parseInt(data.item.record_id) == parseInt(vm.iteminfo.record_id) && data.item.record_type == vm.iteminfo.record_type )
			{
				vm.on_clipboard = clipboardFactory.itemOnClipboard(vm.iteminfo);
			}

		});

		$scope.$on("clipboard::itemsLoaded", function(){
			vm.on_clipboard = clipboardFactory.itemOnClipboard(vm.iteminfo);
		});

		$scope.$on("clipboard::toggleOnClipboard", function(event, data) {

			if( data.item_info.record_id == vm.iteminfo.record_id && data.item_info.directive_id == vm.iteminfo.directive_id ) {
				vm.imageReviewedOnSuccess(data.item_info);
			}

		});

		vm.toast = {
			addToClipboard: function() {
				var toastEl = document.getElementById('AddToClipboardToast');
				if( !toastEl ) {
					return;
				}
                var myToast = bootstrap.Toast.getOrCreateInstance(toastEl);
                myToast.show();
			},
			removeFromClipboard: function() {
				var toastEl = document.getElementById('RemoveFromClipboardToast');
				if( !toastEl ) {
					return;
				}
				var myToast = bootstrap.Toast.getOrCreateInstance(toastEl);
				myToast.show();
			}
		}

		vm.toggleOnClipboard = function()
		{
			// console.log("ITEM INFO");
			// console.log(vm.iteminfo);

			// var found_data = clipboardFactory.findClipboardItem(vm.iteminfo);
			// console.log("FOUND CLIPBOARD DATA: " + vm.iteminfo.record_id );
			// console.log(found_data);
			// return;

			if( !clipboardFactory.clipboard.record )
			{
				alert("Clipboard not initialised");
				return;
			}

			if( vm.is_loading )
			{
				return;
			}

			// IF ADDING TO CLIPBOARD, NOT SKIP REVIEW AND RECORD TYPE IS RA/IMAGE
			// if( !vm.on_clipboard && !vm.skip_review_check && (vm.iteminfo.record_type == 'assessment' || vm.iteminfo.record_type == 'image') ) {
					
			// 	console.log("RUN REVIEW");

			// 	$rootScope.$broadcast("imageSensitivity::review", {item_info: vm.iteminfo});
			// 	return;
			// }

			vm.is_loading = true;

			// RESET THIS TO FALSE
			vm.skip_review_check = false;

			if( !vm.on_clipboard )
			{
				var save_info = angular.copy(vm.iteminfo);
				save_info.status = 1;

				clipboardFactory.saveClipboardItem(save_info).then(function(item_record){

					vm.is_loading = false;

					// $alert({
					// 	title: 'Item added to clipboard',
					// 	content: '',
					// 	placement: 'top-left',
					// 	type: 'success',
					// 	show: true,
					// 	duration: 3
					// });

					// SHOW ADDED TO CLIPBOARD TOAST
					vm.toast.addToClipboard();

					clipboardFactory.addLocalClipboardItem(item_record);
					vm.on_clipboard = clipboardFactory.itemOnClipboard(save_info);

					console.log("ITEM ON CLIPBOARD");
					console.log(clipboardFactory.itemOnClipboard(save_info));
					
				}, function(error){
					vm.is_loading = false;
					alert(error);
				});

				return;
			}

			if( vm.on_clipboard )
			{
				//REMOVE FROM CLIPBOARD

				var item = clipboardFactory.findClipboardItem(vm.iteminfo);

				if( item == null )
				{
					$alert({
						title: 'Error removing item from clipboard',
						content: '', 
						placement: 'top-left',
						type: 'danger',
						show: true,
						duration: 3
					});

					vm.is_loading = false;

					return;
				}

				item.status = 2;

				clipboardFactory.saveClipboardItem(item).then(function(item){

					// $alert({
					// 	title: 'Item removed from clipboard',
					// 	content: '',
					// 	placement: 'top-left',
					// 	type: 'danger',
					// 	show: true,
					// 	duration: 3
					// });

					// REMOVE FROM CLIPBOARD TOAST
					vm.toast.removeFromClipboard();

					item.status = 2;
					// clipboardFactory.removeLocalClipboardItem(item);
					clipboardFactory.updateLocalItemStatus(item, 2);
					vm.on_clipboard = clipboardFactory.itemOnClipboard(vm.iteminfo);
					console.log(vm.on_clipboard);
					console.log(vm.iteminfo);
					vm.is_loading = false;
				
					$scope.$apply();

				}, function(error){
					vm.is_loading = false;
				});

				return;
			}
		}

		vm.imageReviewedOnSuccess = function(item_info) 
		{
			// SET ITEM INFO
			// vm.iteminfo = item_info;

			vm.skip_review_check = true;

			vm.toggleOnClipboard();
		}

		vm.iconStyle = function()
		{
			var style = {
				'color': '#ddd'
			};

			if( vm.on_clipboard )
			{
				style['color'] = 'green';
			}

			return style;
		}
	}

	function clipboardController($scope, $rootScope, clipboardFactory, $alert, $filter)
	{
		var vm = this;

		vm.utils = {
			clipboard: clipboardFactory.clipboard,
			record_types: clipboardFactory.record_types,
			visible_data: null,
			tabs: {
				active: 'browse',
				changeTab: function(tab){
					vm.utils.tabs.active = tab;
				},
				tabActive: function(tab){
					var active = false;

					if( tab == vm.utils.tabs.active )
					{
						active = true;
					}

					return active;
				}
			},
			select_mode: {
				enabled: clipboardFactory.select_mode_enabled,
				record_types: clipboardFactory.selectable_record_types,
				items: [],
				selectable: function(item){
					var selectable = false;

					if( !vm.utils.select_mode.enabled )
					{
						return false;
					}

					if( $.inArray( item.record_type, vm.utils.select_mode.record_types ) !== -1 || $.inArray( item.data_type, vm.utils.select_mode.record_types ) !== -1 )
					{
						selectable = true;
					}

					return selectable;
				},
				itemStyle: function(item){
					var style = {
						'background-color': 'white',
						'color': '#ddd'
					};

					if( vm.utils.select_mode.selected(item) )
					{
						style['background-color'] = 'green';
						style['color'] = '#fff';
					}

					return style;
				},
				selected: function(item){
					var selected = false;

					var matches = 0;
					angular.forEach(vm.utils.select_mode.items, function(record, index){

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
					angular.forEach(vm.utils.select_mode.items, function(record, index){

						if( record._id == item._id )
						{
							num_matches++;
							existing_index = index;
						}

					});

					if( num_matches == 0 )
					{
						vm.utils.select_mode.items.push( item );
					}
					else
					{
						vm.utils.select_mode.items.splice( existing_index, 1 );
					}
				},
				clearSelection: function(){
					vm.utils.select_mode.items = [];
				},
				confirmSelection: function(){

					if( vm.utils.select_mode.items.length == 0 )
					{
						alert("You have not selected anything");
						return;
					}

					$rootScope.$broadcast("clipboard::itemsConfirmed", {
						items: vm.utils.select_mode.items,
						directive_id: clipboardFactory.directive_id
					});
				},
			},
			active_item: {
				record: null,
				select: function(record){
					vm.utils.active_item.record = record;
				}
			},
			file_uploader: {
				directive_id: 'clipboardFileUploader',
				relations: {
					clipboard_id: null,
				},
				events: function(){

					$scope.$on("clipboard::fileUploaded", function(event, data){

						clipboardFactory.clipboard.items.unshift( data.item_record );
						vm.utils.tabs.changeTab('browse');
						vm.utils.autoFilter();

						$alert({
							title: 'Clipboard item uploaded successfully',
							content: '',
							placement: 'top-left',
							type: 'success',
							show: true,
							duration: 3
						});

					});

				}()
			},
			quick_add: {
				record: {
					record_id: null,
					record_ref: null,
					record_type: null,
					title: "",
					description: "",
					data: null,
					data_type: "string",
					status: 1
				},
				is_loading: false,
				clear: function(){
					vm.utils.quick_add.record = {
						record_id: null,
						record_ref: null,
						record_type: null,
						title: "",
						description: "",
						data: null,
						data_type: "string",
						status: 1
					};
				},
				save: function(){

					if( !vm.utils.quick_add.record.data )
					{
						alert("You have not entered anything");
						return;
					}

					vm.utils.quick_add.is_loading = true;

					clipboardFactory.saveClipboardItem(vm.utils.quick_add.record).then(function(new_item_record){

						vm.utils.quick_add.is_loading = false;

						$alert({
							title: 'Item was added to the clipboard',
							content: '',
							placement: 'top-left',
							type: 'success',
							show: true,
							duration: 3
						});

						clipboardFactory.clipboard.items.unshift( new_item_record );
						vm.utils.autoFilter();
						vm.utils.quick_add.clear();
						vm.utils.tabs.changeTab('browse');

					}, function(error){
						vm.utils.quick_add.is_loading = false;

						$alert({
							title: 'Error adding item to clipboard',
							content: '',
							placement: 'top-left',
							type: 'danger',
							show: true,
							duration: 3
						});

						alert(error);
					});
				}
			},
			active_edit: {
				record: null,
				edit_record: null,
				field_name: null,
				enabled: false,
				is_loading: false,
				editField: function(field_name, record){
					vm.utils.active_edit.record = record;
					vm.utils.active_edit.edit_record = angular.copy( record );
					vm.utils.active_edit.field_name = field_name;
					vm.utils.active_edit.enabled = true;
				},
				fieldActive: function(field_name, record){
					var active = false;

					if( !vm.utils.active_edit.enabled )
					{
						return false;
					}

					if( parseInt(record._id) == parseInt(vm.utils.active_edit.record._id) && field_name == vm.utils.active_edit.field_name )
					{
						active = true;
					}

					return active;
				},
				saveChanges: function(){

					if( !vm.utils.active_edit.edit_record[vm.utils.active_edit.field_name] )
					{
						alert("You must enter a value");
						return;
					}

					vm.utils.active_edit.is_loading = true;

					clipboardFactory.saveClipboardItem(vm.utils.active_edit.edit_record).then(function(new_item_record){
						vm.utils.active_edit.is_loading = false;
						clipboardFactory.replaceClipboardItem(new_item_record);
						vm.utils.autoFilter();
						vm.utils.active_edit.enabled = false;
					}, function(error){
						vm.utils.active_edit.is_loading = false;
						alert(error);
					});

					// clipboardFactory.updateClipboardInfo(vm.utils.active_edit.edit_record).then(function(item_record){

					// 	vm.utils.active_edit.is_loading = false;

					// 	//USE NEW INFO
					// 	clipboardFactory.replaceClipboardItem(item_record);
					// 	vm.utils.autoFilter();
					// 	vm.utils.active_edit.enabled = false;
						
					// }, function(error){
					// 	vm.utils.active_edit.is_loading = false;
					// 	alert(error);
					// });
				}
			},
			filters: {
				local_search: '',
				status: 1,
				record_types: [], 
				record_type: null
			},
			toggleStatus: function(status){
				vm.utils.filters.status = status;
				vm.utils.autoFilter();
			},
			updateLocalFilter: function(){
				setTimeout(function(){
					vm.utils.autoFilter();
					$scope.$apply();
				}, 150);
			},
			selectRecordTypeFilter: function() {
				vm.utils.filters.record_types = [];
				vm.utils.filters.record_types.push(vm.utils.filters.record_type);

				vm.utils.autoFilter();
			},
			autoFilter: function(){
				var visible_data = [];
				var filtered_items = $filter('filter')(vm.utils.clipboard.items, vm.utils.filters.local_search);

				console.log("FULL CLIPBOARD ITEMS");
				console.log(vm.utils.clipboard.items);

				angular.forEach(filtered_items, function(record, index){

					var non_matches = 0;

					if( parseInt(vm.utils.filters.status) != parseInt(record.status) )
					{
						non_matches++;
					}

					if( vm.utils.filters.record_types.length > 0 )
					{
						if( $.inArray( record.record_type, vm.utils.filters.record_types ) === -1 && $.inArray( record.data_type, vm.utils.filters.record_types ) === -1 )
						{
							non_matches++;
						}
					}

					// if( vm.utils.filters.record_type ) 
					// {
					// 	if( record.record_type != vm.utils.filters.record_type && record.data_type != vm.utils.filters.record_type ) 
					// 	{
					// 		non_matches++;
					// 	}
					// }

					if( non_matches == 0 )
					{
						visible_data.push( record );
					}

				});

				console.log("VISIBLE CLIPBOARD ITEMS");
				console.log(visible_data);

				vm.utils.visible_data = visible_data;
			},
			canBrowseRecordTypes: function() {
				if( vm.utils.filters.record_types.length == 0 ) {
					return true;
				}

				if( vm.utils.filters.record_types.length == 1 ) {

					if( vm.utils.filters.record_types[0] == 'snapshot_asset' ) {
						return false;
					} 

					if( vm.utils.filters.record_types[0] == 'procedure' ) {
						return false;
					}

					if( vm.utils.filters.record_types[0] == 'section' ) {
						return false;
					}

					if( vm.utils.filters.record_types[0] == 'image' ) {
						return false;
					}

					return true;

				} else {
					return true;
				}
			},
			refreshClipboard: function() {
				clipboardFactory.doGetClipboardData().then(function() {
					vm.utils.clipboard = clipboardFactory.clipboard;

					vm.utils.autoFilter();

					$scope.$apply();
				}, function(error) {
					alert(error);
				});
			},
			clear_clipboard: {
				loading: false, 
				start: function() {
					vm.utils.tabs.changeTab('clear_clipboard_confirmation');
				},
				confirm: function() {
					vm.utils.is_loading = true;
					vm.utils.clear_clipboard.loading = true;

					clipboardFactory.hardClearClipboard(vm.utils.clipboard.record._id).then(function() {
						vm.utils.is_loading = false;
						vm.utils.clear_clipboard.loading = false;

						vm.utils.refreshClipboard();

						vm.utils.tabs.changeTab('browse');

					}, function(error) {
						vm.utils.is_loading = false;
						vm.utils.clear_clipboard.loading = false;
						alert(error);
					});
				}
			},
			gallery_view: {
				active_url: null, 
				setActiveImage: function(item, change_tab) {

					if( !item.hasOwnProperty('url') || !item.url ) {
						vm.utils.gallery_view.active_url = null;
						return;
					}

					vm.utils.gallery_view.active_url = item.url;

					if( change_tab ) {
						vm.utils.tabs.changeTab('gallery_view');
					} 
				},
				clear: function() {
					vm.utils.gallery_view.url = null;
				}
			}
		};

		$scope.$on("clipboard::exit", function(){

			setTimeout(function(){

				console.log("EXIT CLIPBOARD");

				if( clipboardFactory.aside ) {
					vm.utils.select_mode.clearSelection();
					console.log("CLOSE ASIDE");
					clipboardFactory.aside.hide();
				}

				if( !clipboardFactory.clipboard_inline ) {
					vm.utils.select_mode.clearSelection();
					console.log("DESTROY SCOPE");
					$scope.$destroy();
				}
		
			}, 0);

		});

		$scope.$on("clipboard::destroy", function(event, data) {
			setTimeout(function() {
				$scope.$destroy();
			}, 0);
		});

		$scope.$watch(function(){
			return clipboardFactory.clipboard;
		}, function(){
			vm.utils.clipboard = clipboardFactory.clipboard;
			vm.utils.file_uploader.relations.clipboard_id = vm.utils.clipboard.record.ID;
			vm.utils.autoFilter();
		});

		$scope.$watch(function(){
			return clipboardFactory.select_mode_enabled;
		}, function(newVal, oldVal){
			vm.utils.select_mode.enabled = clipboardFactory.select_mode_enabled;
		});

		//WATCH FOR A CHANGE IN SELECTABLE RECORD TYPES
		$scope.$watch(function(){
			return clipboardFactory.selectable_record_types;
		}, function(newVal, oldVal){

			vm.utils.select_mode.record_types = clipboardFactory.selectable_record_types;

			if( clipboardFactory.select_mode_enabled )
			{
				vm.utils.filters.record_types = clipboardFactory.selectable_record_types;
				if( vm.utils.filters.record_types.length > 0 ) {
					vm.utils.filters.record_type = vm.utils.filters.record_types[0];
				}
			}

			vm.utils.autoFilter();
		});

		$scope.$watch(function(){
			return clipboardFactory.is_loading;
		}, function(){
			vm.utils.is_loading = clipboardFactory.is_loading;
			$scope.$apply();
		});


		// $scope.$on("clipboard::itemsLoaded", function(){
		// 	vm.utils.clipboard = clipboardFactory.clipboard;
		// 	vm.utils.file_uploader.relations.clipboard_id = vm.utils.clipboard.record.ID;
		// 	vm.utils.autoFilter();
		// });

		vm.profileImagePath = function(item)
		{
			var style = {
				"background-image": "url('../images/RiskMach Homepage.png')", 
				"height": "100px"
			};

			if( item.url )
			{
				style["background-image"] = "url('"+ item.url +"')";
				style["height"] = "400px";
			}

			return style;
		}

		vm.exitClipboard = function(){
			vm.utils.gallery_view.clear();

			$rootScope.$broadcast("clipboard::exit");
		}

		vm.removeItem = function(item)
		{
			item.status = 2;

			clipboardFactory.saveClipboardItem(item).then(function(new_item){

				vm.is_loading = false;

				$alert({
					title: 'Item removed from clipboard',
					content: '',
					placement: 'top-left',
					type: 'danger',
					show: true,
					duration: 3
				});

				clipboardFactory.replaceClipboardItem(new_item);
				vm.utils.autoFilter();
				$rootScope.$broadcast("clipboard::itemChanged", { item: new_item });

			}, function(error){
				alert(error);
				vm.is_loading = false;
			});

			// clipboardFactory.removeClipboardItem(item._id).then(function(d){

			// 	vm.is_loading = false;

				
			// 	$alert({
			// 		title: 'Item removed from clipboard',
			// 		content: '',
			// 		placement: 'top-left',
			// 		type: 'danger',
			// 		show: true,
			// 		duration: 3
			// 	});

			// 	// item.Status = 2;
			// 	clipboardFactory.updateLocalItemStatus(item, 2);
			// 	vm.on_clipboard = clipboardFactory.itemOnClipboard(item);
			// 	vm.utils.autoFilter();
			// 	$rootScope.$broadcast("clipboard::itemChanged", { item: item });
				

			// }, function(error){
			// 	vm.is_loading = false;
			// });
		}

		vm.recoverItem = function(item)
		{
			item.status = 1;

			clipboardFactory.saveClipboardItem(item).then(function(new_item){

				vm.is_loading = false;

				$alert({
					title: 'Item re-added from clipboard',
					content: '',
					placement: 'top-left',
					type: 'success',
					show: true,
					duration: 3
				});

				clipboardFactory.replaceClipboardItem(new_item);
				vm.utils.autoFilter();
				$rootScope.$broadcast("clipboard::itemChanged", { item: new_item });

			}, function(error){
				alert(error);
				vm.is_loading = false;
			});
		}

		setTimeout(function(){

			if( vm.utils.clipboard.hasOwnProperty('items') )
			{
				vm.utils.autoFilter();
				$scope.$apply();
			}

		}, 100);

		if( clipboardFactory.select_mode_enabled )
		{
			vm.utils.filters.record_types = clipboardFactory.selectable_record_types;
			if( vm.utils.filters.record_types.length > 0 ) {
				vm.utils.filters.record_type = vm.utils.filters.record_types[0];
			}
			vm.utils.autoFilter();
		}
	}

	function clipboardFactory($q, $http, $aside, $rootScope, riskmachDatabasesFactory, authFactory, mediaFactory)
	{
		var factory = {};

		factory.is_loading = false;
		factory.initialised = false;

		factory.clipboard = {
			record: null,
			items: [],
		};

		factory.select_mode_enabled = false;
		factory.selectable_record_types = [];

		factory.clipboard_inline = false;

		factory.directive_id = null;

		factory.browseClipboardForRecord = function(record_types)
		{
			factory.enableSelectionMode(record_types);
			factory.aside.show();
		}

		// OPEN CLIPBOARD WITHOUT CLIPBOARD ASIDE
		factory.browseClipboardForRecordInline = function(record_types) 
		{
			factory.enableSelectionMode(record_types);

			factory.clipboard_inline = true;
		}

		factory.setDirectiveId = function(directive_id) 
		{
			factory.directive_id = directive_id;
		}

		factory.enableSelectionMode = function(record_types)
		{
			factory.select_mode_enabled = true;
			factory.selectable_record_types = record_types;
		}

		factory.record_types = [{
			value: 'mr_hazard',
			label: 'Managed Risk Hazard'
		},{
			value: 'mr_control',
			label: 'Managed Risk Control'
		},{
			value: 'assessment', 
			label: 'Risk Assessment'
		},{
			value: 'image',
			label: 'Images'
		},{
			value: 'video', 
			label: 'Video'
		},{
			value: 'audio',
			label: 'Audio'
		}];

		factory.aside = $aside({
			contentTemplate: '../rm-utils/clipboard/tpl/clipboard_aside.html',
			template: '../rm-utils/clipboard/tpl/blank_aside.html',
			backdrop: 'static',
			container: 'body',
			show: false,
			// scope: $scope
		});

		//CLEAR CLIPBOARD OR LOAD NEW USERS CLIPBOARD ON LOG IN / SWITCH PROFILE
		// $rootScope.$watch(function(){
		// 	return localStorage.getItem('id_token');
		// }, function(newVal, oldVal){
		// 	var token_data = rmLoginFactory.getReadJwt();

		// 	if( token_data == null )
		// 	{
		// 		factory.clipboard = {
		// 			record: null,
		// 			items: [],
		// 		};
		// 	}
		// 	else
		// 	{
		// 		factory.doGetClipboardData();
		// 	}

		// });

		factory.itemOnClipboard = function(item_info)
		{
			var on_clipboard = false;
			var matches = 0;

			angular.forEach(factory.clipboard.items, function(record, index){

				if( record.record_type == item_info.record_type && record.record_id == item_info.record_id && parseInt(record.status) == 1 )
				{
					matches++;
				}

			});

			if( matches > 0 )
			{
				on_clipboard = true;
			}

			return on_clipboard;
		}

		factory.findClipboardItem = function(item_info)
		{
			var item_record = null;

			angular.forEach(factory.clipboard.items, function(record, index){

				if( record.record_type == item_info.record_type && record.record_id == item_info.record_id)
				{
					item_record = record;
				}

			});
			
			return item_record;
		}

		factory.replaceClipboardItem = function(item)
		{
			var existing_index = null;

			angular.forEach(factory.clipboard.items, function(record, index){

				if( parseInt(record._id) == parseInt(item._id) )
				{
					existing_index = index;
				}

			});

			if( existing_index != null )
			{
				factory.clipboard.items[existing_index] = item;
			}
			else
			{
				factory.clipboard.items.unshift(item);
			}
		}

		factory.updateLocalItemStatus = function(item, status)
		{
			var local_item = factory.findClipboardItem(item);

			console.log("FOUND LOCAL ITEM");
			console.log(local_item);

			if( local_item != null )
			{
				local_item.status = status;
			}

			return local_item;
		}

		factory.removeLocalClipboardItem = function(item)
		{
			var existing_index = null;

			angular.forEach(factory.clipboard.items, function(record, index){

				if( record._id == item._id && parseInt(record._id) == parseInt(item._id) )
				{
					existing_index = index;
				}

			});

			if( existing_index != null )
			{
				factory.clipboard.items.splice(existing_index, 1);
			}
		}

		factory.doGetClipboardData = function(){
			var defer = $q.defer();

			factory.clipboard.record = null;
			factory.clipboard.items = null;
			factory.is_loading = true;

			factory.getCreateUserClipboard().then(function(clipboard_record){

				factory.clipboard.record = clipboard_record;

				factory.getClipboardItems(factory.clipboard.record._id).then(function(items){
					console.log("GOT CLIPBOARD ITEMS");
					console.log(items);

					factory.getAllAttachmentUrls(items).then(function(items){
						factory.clipboard.items = items;
						factory.is_loading = false;
						$rootScope.$broadcast("clipboard::itemsLoaded");
						defer.resolve();
					});

				}, function(error){
					factory.is_loading = false;
					defer.reject(error);
				});

			}, function(error){
				factory.is_loading = false;
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.listenClipboard = function(){

			$('body').keydown(function(event){

				if(event.ctrlKey && event.which == 66)
				{
					event.preventDefault();
		            // alert("Open Clipboard");
		            factory.select_mode_enabled = false;
					factory.selectable_record_types = [];
		            factory.aside.show();
		        }

			});

		}

		factory.getUserClipboard = function() 
		{
			var defer = $q.defer();

			riskmachDatabasesFactory.databases.collection.clipboard.find({
            	selector: {
            		table: 'clipboards',
            		company_id: authFactory.cloudCompanyId(),
            		user_id: authFactory.cloudUserId()
            	}
            }).then(function(result){

            	if( result.docs.length > 0 ) {
            		defer.resolve( result.docs[0] );
            	} else {
            		defer.resolve(null);
            	}

            }).catch(function(error){
            	defer.reject(error);
            });

			return defer.promise;
		}

		factory.getCreateUserClipboard = function()
		{
			var defer = $q.defer();

			factory.getUserClipboard().then(function(clipboard_doc) {

				if( clipboard_doc ) {

					console.log("FOUND EXISTING USER CLIPBOARD");
            		console.log( clipboard_doc );
            		defer.resolve(clipboard_doc);

				} else {

					console.log("CREATING NEW USER CLIPBOARD");

            		//CREATE CLIPBOARD
            		var clipboard_record = {
            			company_id: authFactory.cloudCompanyId(),
            			user_id: authFactory.cloudUserId(),
            			table: 'clipboards'
            		};

            		riskmachDatabasesFactory.databases.collection.clipboard.post(clipboard_record, { force: true }).then(function(result){

            			clipboard_record._id = result.id;
            			clipboard_record._rev = result.rev;

            			console.log("CREATED NEW USER CLIPBOARD");
            			console.log(clipboard_record);

            			defer.resolve( clipboard_record );

            		}).catch(function(error){
            			defer.reject("Error creating clipboard record: " + error);
            		});

				}

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.getClipboardItems = function(clipboard_id)
		{
			var defer = $q.defer();

            riskmachDatabasesFactory.databases.collection.clipboard.find({
            	selector: {
            		table: 'clipboard_items',
            		company_id: authFactory.cloudCompanyId(),
            		user_id: authFactory.cloudUserId(),
            		clipboard_id: clipboard_id,
            		status: 1
            	}
            }).then(function(result){
            	defer.resolve( result.docs );
            }).catch(function(error){
            	defer.reject("Error getting clipboard items: " + error);
            });

			return defer.promise;
		}

		factory.getClipboardItemsV2 = function(clipboard_id) 
		{
			var defer = $q.defer();
			var fetch_defer = $q.defer();

			var db = riskmachDatabasesFactory.databases.collection.clipboard;
			var options = {
				limit: 200, 
				include_docs: true
			}

			var clipboard_items = [];

			fetchNextPage(fetch_defer).then(function() {
				defer.resolve(clipboard_items);
			}, function(error) {
				defer.reject(error);
			});

			function fetchNextPage(defer) {

				db.allDocs(options).then(function(result) {

					if( result && result.rows.length > 0 ) {

						var filtered_items = [];

						var i = 0;
						var len = result.rows.length;

						while(i < len) {
							var errors = 0;

							if( !result.rows[i].doc.hasOwnProperty('table') || result.rows[i].doc.table != 'clipboard_items' ) {
								errors++;
							}

							if( !result.rows[i].doc.hasOwnProperty('company_id') || result.rows[i].doc.company_id != authFactory.cloudCompanyId() ) {
								errors++;
							}

							if( !result.rows[i].doc.hasOwnProperty('user_id') || result.rows[i].doc.user_id != authFactory.cloudUserId() ) {
								errors++;
							}

							if( !result.rows[i].doc.hasOwnProperty('status') || result.rows[i].doc.status != 1 ) {
								errors++;
							}

							if( !result.rows[i].doc.hasOwnProperty('clipboard_id') || result.rows[i].doc.clipboard_id != clipboard_id ) {
								errors++;
							}
 
							if( errors == 0 ) {
								filtered_items.push(result.rows[i].doc);
							}

							i++;
						}

						clipboard_items.push(...filtered_items);

						options.startkey = result.rows[ result.rows.length - 1 ].id;
						options.skip = 1;

						result.rows = null;
						filtered_items = null;

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

		factory.saveClipboardItem = function( item_info )
		{
			var defer = $q.defer();

			riskmachDatabasesFactory.databases.collection.clipboard.find({
				selector: {
					table: 'clipboard_items',
					company_id: authFactory.cloudCompanyId(),
	        		user_id: authFactory.cloudUserId(),
	        		clipboard_id: factory.clipboard.record._id,
	     			record_type: item_info.record_type,
	     			record_id: item_info.record_id
	     		}
			}).then(function(result){

				//SAVE NEW
				if( result.docs.length == 0 )
				{
					console.log("SAVING NEW CLIPBOARD ITEM");

					var record = item_info;
					record.table = 'clipboard_items';
					record.clipboard_id = factory.clipboard.record._id;
					record.user_id = authFactory.cloudUserId();
					record.company_id = authFactory.cloudCompanyId();
					record.date_added = new Date().getTime();

					//FIND MEDIA INFO FOR PROIFLE IMAGE
					factory.getItemProfileImageMediaInfo(record.record_id, record.record_type).then(function(media_info){
						record.profile_image_id = media_info.id;
						record.attachment_key = media_info.attachment_key;
						// record.url = media_info.url;

						riskmachDatabasesFactory.databases.collection.clipboard.post(record, {force: true}).then(function(new_result){
							record._id = new_result.id;
							record._rev = new_result.rev;

							factory.getAttachmentUrl(record).then(function(record){
								defer.resolve(record);
								console.log("SAVED NEW CLIPBOARD ITEM");
								console.log(record);
							});

						}).catch(function(error){
							defer.reject("Error adding new clipboard item: " + error);
						});

					});
				}
				else
				{
					//UPDATE EXISTING
					var record = result.docs[0];
					record.status = item_info.status;
					record.data = item_info.data;
					record.title = item_info.title;
					record.description = item_info.description;

					factory.getItemProfileImageMediaInfo(record.record_id, record.record_type).then(function(media_info){
						record.profile_image_id = media_info.id;
						record.attachment_key = media_info.attachment_key;
						// record.url = media_info.url;

						riskmachDatabasesFactory.databases.collection.clipboard.put(record).then(function(update_result){

							record._id = update_result.id;
							record._rev = update_result.rev;

							factory.getAttachmentUrl(record).then(function(record){
								console.log("UPDATED CLIPBOARD ITEM");
								console.log(record);
								defer.resolve(record);
							});

						}).catch(function(error){
							console.log("ERROR UPDATING CLIPBOARD ITEM");
							defer.reject("Error updating clipboard item: " + error);
						});

					});
				}

			}).catch(function(error){
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.getItemProfileImageMediaInfo = function(record_id, record_type){
			var defer = $q.defer();

			var media_info = {
				id: null,
				attachment_key: null,
				url: null
			};

			// IF IMAGE, FETCH MEDIA RECORD
			if( record_type == 'image' ) 
			{
				riskmachDatabasesFactory.databases.collection.media.get(record_id).then(function(media_doc) {

					media_info.id = media_doc._id;
					media_info.attachment_key = media_doc.attachment_key;
					defer.resolve(media_info);

				}).catch(function(error) {
					defer.reject(error);
				});

				return defer.promise;
			}

			var media_record_type = record_type;

			if( record_type == 'mr_hazard' )
			{
				media_record_type = 'assessment_hazard';
			}

			if( record_type == 'mr_control' )
			{
				media_record_type = 'control_item';
			}

			if( record_type == 'assessment' || record_type == 'basic_ob' ) 
			{
				media_record_type = 'assessment';
			}

			if( record_type == 'snapshot_asset' ) 
			{
				media_record_type = 'asset';
			}

			if( $.inArray(record_type, ['mr_hazard','mr_control','assessment','snapshot_asset','basic_ob']) !== -1 )
			{
				mediaFactory.dbUtils.getRecordMedia(record_id, media_record_type).then(function(media_records){

					if( media_records.length == 0 ) {
						defer.resolve(media_info);
						return defer.promise;
					}

					var filtered_media = [];

					var i = 0;
					var len = media_records.length;

					while(i < len) {
						var errors = 0;

						if( !media_records[i].hasOwnProperty('status') || media_records[i].status != 1 || media_records[i].status != '1' ) {
							errors++;
						}

						if( media_records[i].hasOwnProperty('file_does_not_exist') && media_records[i].file_does_not_exist ) {
							errors++;
						}

						if( !errors ) {
							filtered_media.push(media_records[i]);
						}

						i++;
					}

					if( filtered_media.length == 0 ) {
						defer.resolve(media_info);
					} else {
						var media_record = filtered_media[0];
						media_info.id = media_record._id;
						media_info.attachment_key = media_record.attachment_key;
						defer.resolve(media_info);
					}

				}, function(error){
					defer.reject(media_info);
				});
			}
			else
			{
				defer.resolve(media_info);
			}

			return defer.promise;
		}

		factory.getAllAttachmentUrls = function(item_records){
			var defer = $q.defer();
			var url_defer = $q.defer();

			function getNextUrl(item_records, current_index, defer)
			{
				if( !item_records )
				{
					defer.resolve(item_records);
					return defer.promise;
				}

				if( item_records.length == 0 )
				{
					defer.resolve(item_records);
					return defer.promise;
				}

				if( current_index > item_records.length - 1 )
				{
					defer.resolve(item_records);
					return defer.promise;
				}

				var current_item = item_records[current_index];

				factory.getAttachmentUrl(current_item).then(function(){
					current_index++;
					getNextUrl(item_records, current_index, defer);
				});

				return defer.promise;
			}

			getNextUrl(item_records, 0, url_defer).then(function(item_records){
				defer.resolve(item_records);
			});

			return defer.promise;
		}

		factory.getAttachmentUrl = function(item)
		{
			var defer = $q.defer();

			item.url = null;

			if( !item.profile_image_id )
			{
				defer.resolve(item);
				return defer.promise;
			}

			if( $.inArray(item.record_type, ['mr_hazard','mr_control','assessment','image','snapshot_asset','basic_ob']) !== -1 )
			{
				mediaFactory.dbUtils.getAttachmentUrl(item.profile_image_id, item.attachment_key).then(function(url){
					
					if( url == 'corrupt_file' ) {
						item.url = null;
					} else {
						item.url = url;
					}

					defer.resolve(item);
				}, function(){
					defer.resolve(item);
				});
			}
			else
			{
				defer.resolve(item);
			}

			return defer.promise;
		}

		factory.addLocalClipboardItem = function(item)
		{
			factory.removeLocalClipboardItem(item);
			factory.clipboard.items.push(item);
		}

		factory.removeLocalClipboardItem = function(item)
		{
			var existing_index = null;

			console.log("REMOVE LOCAL CLIPBOARD ITEM");
			console.log(item);

			angular.forEach(factory.clipboard.items, function(record, index){

				if( record._id == item._id && record.record_id == item.record_id )
				{
					existing_index = index;
				}

			});

			if( existing_index != null )
			{
				factory.clipboard.items.splice(existing_index, 1);
			}
		}

		factory.hardClearClipboard = function(clipboard_id) 
		{
			var defer = $q.defer();

			factory.getClipboardItems(clipboard_id).then(function(clipboard_items) {

				if( clipboard_items.length == 0 ) {
					defer.resolve();
					return defer.promise;
				}

				factory.deleteClipboardItems(clipboard_items).then(function() {
					defer.resolve();
				}, function(error) {
					defer.reject(error);
				});

			}, function(error) {
				defer.reject(error);
			});

			return defer.promise;
		}

		factory.deleteClipboardItems = function(clipboard_items) 
		{
			var defer = $q.defer();
			var delete_defer = $q.defer();

			deleteClipboardItem(delete_defer, clipboard_items, 0).then(function() {
				defer.resolve();
			}, function(error) {
				defer.reject(error);
			});

			function deleteClipboardItem(defer, clipboard_items, active_index) 
			{
				if( active_index > clipboard_items.length - 1 ) {
					defer.resolve();
					return defer.promise;
				}

				riskmachDatabasesFactory.databases.collection.clipboard.remove(clipboard_items[active_index]).then(function() {

					active_index++;

					deleteClipboardItem(defer, clipboard_items, active_index);

				}).catch(function(error) {
					defer.reject(error);
				});
 
				return defer.promise;
			}

			return defer.promise;
		}

		factory.getClipboardRecordTypeItems = function(record_type) 
		{
			var defer = $q.defer();

			var filtered_items = [];

			factory.getUserClipboard().then(function(clipboard_doc) {

				if( !clipboard_doc ) {
					defer.resolve(filtered_items);
					return defer.promise;
				}

				factory.getClipboardItems(clipboard_doc._id).then(function(items) {

					if( !items.length ) {
						defer.resolve(filtered_items);
						return defer.promise;
					}

					var i = 0;
					var len = items.length;

					while(i < len) {
						var errors = 0;

						if( items[i].record_type != record_type ) {
							errors++;
						}

						if( !errors ) {
							filtered_items.push(items[i]);
						}

						i++;
					}

					defer.resolve(filtered_items);

				});

			});

			return defer.promise;
		}

		factory.listenClipboard();

		return factory;
	}

	function riskmachClipboard()
    {
    	var directive = {};

        directive.scope = {};

        directive.restrict = 'A';
        directive.controller = 'clipboardController';
        directive.controllerAs = 'vm';
        directive.bindToController = true;
        directive.templateUrl = '../rm-utils/clipboard/tpl/clipboard.html';
        directive.replace = false;

        return directive;
    }

    function toggleOnClipboard()
    {
    	var directive = {};

        directive.scope = {
        	iteminfo: '='
        };

        directive.restrict = 'A';
        directive.controller = 'quickAddClipboardController';
        directive.controllerAs = 'vm';
        directive.bindToController = true;
        directive.templateUrl = '../rm-utils/clipboard/tpl/toggle_on_clipboard.html';
        directive.replace = false;

        return directive;
    }

})();