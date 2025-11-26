(function(){

	var app = angular.module('riskmachVideoUtils', ['riskmachDatabases','vjs.video']);
	app.controller('onlineVideoPlaylistController', onlineVideoPlaylistController);
	app.controller('onlineVideoPlayerController', onlineVideoPlayerController);
	app.controller('recordVideoController', recordVideoController);
	app.controller('videoPlayerController', videoPlayerController);
	app.factory('videoFactory', videoFactory);
	app.directive('videoRecorder', videoRecorder);
	app.directive('isolatedVideoPlayer', isolatedVideoPlayer);
	app.directive('onlineVideoPlayer', onlineVideoPlayer);
	app.directive('onlineVideoPlaylist', onlineVideoPlaylist);
	app.filter('secondsToDateTime', secondsToDateTime);

	function onlineVideoPlaylistController($scope, $rootScope, $q, $http, riskmachDatabasesFactory, rmConnectivityFactory, videoFactory) 
	{
		var vm = this;

		vm.utils = {
			directive_id: vm.directiveid, 
			tabs: {
				active_tab: 'playlists',
				tabActive: function(tab) {
					if( vm.utils.tabs.active_tab == tab ) {
						return true;
					} else {
						return false;
					}
				},
				changeTab: function(tab) {
					vm.utils.tabs.active_tab = tab;
				}
			},
			playlist_listing: {
				loading: false, 
				playlist_id: null,
				data: [],
				error_handler: {
					error: false, 
					error_message: null, 
					logError: function(error) {
						vm.utils.playlist_listing.error_handler.error = true;
						vm.utils.playlist_listing.error_handler.error_message = error;
					},
					clear: function() {
						vm.utils.playlist_listing.error_handler.error = false;
						vm.utils.playlist_listing.error_handler.error_message = null;
					}
				},
				filters: {
					general_search: ''
				},
				refresh: function() {
					var defer = $q.defer();

					vm.utils.playlist_listing.loading = true;

					videoFactory.requests.playlists(null).then(function(data) {

						vm.utils.playlist_listing.data = data;

						vm.utils.playlist_listing.loading = false;

						defer.resolve();

					}, function(error) {
						vm.utils.playlist_listing.loading = false;
						vm.utils.playlist_listing.error_handler.logError(error);
						defer.reject(error);
					});

					return defer.promise;
				},
				enterPlaylist: function(playlist_record) {
					vm.utils.video_listing.playlist_id = playlist_record.ID;

					vm.utils.active_playlist.setRecord(playlist_record);

					vm.utils.tabs.changeTab('playlist_items');

					vm.utils.video_listing.refresh();
				}, 
				findPlaylistListingRecord: function(playlist_id) {
					var i = 0;
					var len = vm.utils.playlist_listing.data.length;
					var playlist_record = null;

					while(i < len) {

						if( playlist_id == vm.utils.playlist_listing.data[i].ID ) {
							playlist_record = vm.utils.playlist_listing.data[i];
						}

						i++;
					}

					return playlist_record;
				}
			},
			active_playlist: {
				record: null, 
				setRecord: function(record) {
					vm.utils.active_playlist.record = record;
				}
			},
			video_listing: {
				loading: false,
				playlist_id: null,
				data: [], 
				error_handler: {
					error: false, 
					logError: function(error) {
						vm.utils.video_listing.error_handler.error = true;
						vm.utils.video_listing.error_handler.error_message = error;
					},
					clear: function() {
						vm.utils.video_listing.error_handler.error = false;
						vm.utils.video_listing.error_handler.error_message = null;
					}
				},
				filters: {
					general_search: ''
				},
				refresh: function() {
					vm.utils.video_listing.loading = true;

					videoFactory.requests.playlistVideos(vm.utils.video_listing.playlist_id).then(function(data) {

						var i = 0;
						var len = data.length;

						while(i < len) {

							data[i].vid_poster = 'https://elasticbeanstalk-eu-west-1-638507748612.s3-eu-west-1.amazonaws.com/RiskMach Data/VideoFiles/'+ data[i].VideoID +'/poster-00001.png';

							i++;
						}

						vm.utils.video_listing.data = data;

						vm.utils.video_listing.loading = false;

					}, function(error) {
						vm.utils.video_listing.loading = false;
						vm.utils.video_listing.error_handler.logError(error);
					});
				},
				watchVideo: function(video_record) {

					// var data = {
					// 	directive_id: vm.utils.directive_id,
					// 	video_ref: video_record.VideoRef
					// }

					// $rootScope.$broadcast("onlineVideoPlayer::viewVideo", data);

					vm.utils.tabs.changeTab('video_player');

					vm.utils.online_video_player.start(video_record);

				}
			},
			online_video_player: {
				directive_id: 'OnlineVideoPlaylist',
				video_record: null,
				video_ref: null,
				start: function(video_record) {
					vm.utils.online_video_player.video_record = video_record;
					vm.utils.online_video_player.video_ref = video_record.VideoRef;
				},
				close: function() {
					var data = {
						directive_id: vm.utils.online_video_player.directive_id
					}

					$rootScope.$broadcast("onlineVideoPlayer::close", data);

					vm.utils.online_video_player.video_ref = null;
				}
			},
			events: function() {

				$scope.$watch("vm.directiveid", function(newVal, oldVal) {
					vm.utils.directive_id = vm.directiveid;
				});

				$scope.$on("onlineVideoPlaylist::start", function(event, data) {
					vm.utils.playlist_listing.playlist_id = data.playlist_id;

					// SHOW PLAYLIST LISTING
					vm.utils.tabs.changeTab('playlists');

					vm.utils.playlist_listing.refresh().then(function() {

						if( vm.utils.playlist_listing.playlist_id ) {

							var playlist_record = vm.utils.playlist_listing.findPlaylistListingRecord(vm.utils.playlist_listing.playlist_id);

							if( playlist_record ) {
								vm.utils.playlist_listing.enterPlaylist(playlist_record);
							}

						}

					});
				});

			}()
		}
	}

	function onlineVideoPlayerController($scope, $rootScope, $q, $http, riskmachDatabasesFactory, rmConnectivityFactory) 
	{
		var vm = this;

		vm.utils = {
			directive_id: vm.directiveid, 
			video_ref: vm.videoref,
			video_record: null,
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
			player: {
				record: null,
				sources: [],
				mediaToggle: {},
				id: null,
				player: null,
				control_bar: null,
				started: false,
				finished: false,
				current_time: null,
				watched_time: null,
				seconds_since_update: 0,
				preview_length: 0,
				selectVideo: function(record){
					vm.utils.player.record = record;
					vm.utils.player.calcPreviewTime();
					vm.utils.player.started = false;
					vm.utils.player.finished = false;
					vm.utils.player.seconds_since_update = 0;
					// vm.utils.player.watched_time = parseInt(vm.utils.watch_record.CurrentWatchTime);
					vm.utils.player.toggleMedia();

					// setTimeout(function(){
					// 	vm.utils.player.player.play();
					// 	$scope.$apply();
					// }, 0);

					// console.log("START AT: " + vm.utils.player.watched_time);

					// if( parseInt(vm.utils.player.watched_time) > 0 )
					// {
					// 	setTimeout(function(){
					// 		var start_at = parseInt(vm.utils.player.watched_time);
					// 		vm.utils.player.player.currentTime(start_at);
					// 	}, 1000);
					// }
				},
				clear: function(){
					vm.utils.player.player.pause();
					vm.utils.player.record = null;
					vm.utils.player.started = false;
					vm.utils.player.finished = false;
					vm.utils.player.seconds_since_update = 0;
					vm.utils.player.preview_length = 0;
					vm.utils.player.clearMedia();
				},
				calcPreviewTime: function(){
					// var vid_length = parseInt(vm.utils.player.record.VideoLength);
					// var preview_length = Math.floor(vid_length * 0.20);
					// vm.utils.player.preview_length = preview_length;
					// console.log("VIDEO PREVIEW LENGTH:" + preview_length);
				},
				clearMedia: function(){
					var toggle = {
						sources: [],
						tracks: [],
						poster: null
					};

					$scope.mediaToggle = toggle;
				},
				toggleMedia: function(){
					var toggle = {
						sources: [],
						tracks: [],
						poster: null
					};

					toggle.sources = vm.utils.player.createSources();
					// toggle.poster = vm.utils.player.createPoster();
					$scope.mediaToggle = toggle;
				},
				createSources: function(){
					// var sources = [{
					// 	// src: 'https://elasticbeanstalk-eu-west-1-638507748612.s3-eu-west-1.amazonaws.com/RiskMach Data/VideoFiles/16/RiskMach Introduction Video.mp4',
					// 	src: 'https://elasticbeanstalk-eu-west-1-638507748612.s3-eu-west-1.amazonaws.com/RiskMach Data/VideoFiles/'+ vm.utils.player.record.ID +'/' + vm.utils.player.record.Filename.replace(/\.[^/.]+$/, "") + '.mp4',
					// 	type: 'video/mp4'
					// },{
					// 	// src: 'https://elasticbeanstalk-eu-west-1-638507748612.s3-eu-west-1.amazonaws.com/RiskMach Data/VideoFiles/16/RiskMach Introduction Video.webm',
					// 	src: 'https://elasticbeanstalk-eu-west-1-638507748612.s3-eu-west-1.amazonaws.com/RiskMach Data/VideoFiles/'+ vm.utils.player.record.ID +'/' + vm.utils.player.record.Filename.replace(/\.[^/.]+$/, "") + '.webm',
					// 	type: 'video/webm'
					// },{
					// 	// src: 'https://elasticbeanstalk-eu-west-1-638507748612.s3-eu-west-1.amazonaws.com/RiskMach Data/VideoFiles/16/RiskMach Introduction Video.flv',
					// 	src: 'https://elasticbeanstalk-eu-west-1-638507748612.s3-eu-west-1.amazonaws.com/RiskMach Data/VideoFiles/'+ vm.utils.player.record.ID +'/' + vm.utils.player.record.Filename.replace(/\.[^/.]+$/, "") + '.flv',
					// 	type: 'video/x-flv'
					// },{
					// 	// src: 'https://elasticbeanstalk-eu-west-1-638507748612.s3-eu-west-1.amazonaws.com/RiskMach Data/VideoFiles/16/RiskMach Introduction Video.ogg',
					// 	src: 'https://elasticbeanstalk-eu-west-1-638507748612.s3-eu-west-1.amazonaws.com/RiskMach Data/VideoFiles/'+ vm.utils.player.record.ID +'/' + vm.utils.player.record.Filename.replace(/\.[^/.]+$/, "") + '.ogg',
					// 	type: 'video/ogg'
					// }];

					var sources = [{
						src: vm.utils.video_url,
						type: "video/mp4"
					}];

					console.log("Player Sources");
					console.log(sources);

					return sources;
				},
				getTime: function(){
					var time = vm.utils.player.player.currentTime();
					return time;
				},
				init: function(){

				}()
			},
			video: {
				loading: false,
				requestVideoRecord: function() {
					var defer = $q.defer();

					vm.utils.video.loading = true;

					if( !rmConnectivityFactory.online_detection.online ) {
						vm.utils.video.loading = false;
						vm.utils.error_handler.logError("You require an internet connection to watch this video");
						defer.reject();
						return defer.promise;
					}

				 	$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/LatestAvailableVideoRevision',{
		            	params: {
		            		video_ref: vm.utils.video_ref
		            	}
		            })
					.success(function(data, status, headers, config) {

						console.log("REQUEST VIDEO RECORD RESPONSE");
						console.log(data);

						vm.utils.video.loading = false;

						if( data.error ) {
							vm.utils.error_handler.logError(data.error_messages[0]);
							defer.reject();
							return defer.promise;
						}

						defer.resolve(data.data);

						vm.utils.video.formatVideoRecord(data.data.record);

						vm.utils.video_record = data.data.record;

						var vid_url = vm.utils.video.getSourceUrl(data.data.sources, 'video/mp4');

						console.log("VIDEO'S URL");
						console.log(vid_url);

						vm.utils.video_url = vid_url;
						vm.utils.watch_record = null;
						vm.utils.player.selectVideo(vm.utils.video_record);

						var params = {
							directive_id: vm.utils.directive_id,
							video_record: vm.utils.video_record,
							watch_record: null
						};

						$rootScope.$broadcast("videoPlayer::videoLoaded", params);

		            })
		            .error(function(data, status, headers, config) {
		            	vm.utils.video.loading = false;
		            	vm.utils.error_handler.logError("Error connecting to API for video");
		            	defer.reject();
					});

					return defer.promise;
				},
				formatVideoRecord: function(video_record) {

					if( !video_record ) {
						return;
					}

					if( video_record.hasOwnProperty('Timestamps') && video_record.Timestamps ) {
						video_record.Timestamps = JSON.parse(video_record.Timestamps);
					} else {
						video_record.Timestamps = [];
					}

				},
				getSourceUrl: function(sources, type) {
					var source_url = null;

					var i = 0;
					var len = sources.length;

					while(i < len) {

						if( sources[i].type == type ) {
							source_url = sources[i].path;
						}

						i++;
					}

					return source_url;
				},
				retry: function() {
					// CLEAR ANY PREVIOUS ERRORS
					vm.utils.error_handler.clear();

					if( !vm.utils.video_ref ) {

						if( vm.utils.player.player ) {
							// vm.utils.player.player.pause();
							vm.utils.player.clear();
						}

						return;
					}

					// ONLINE REQUEST VIDEO RECORD
					vm.utils.video.requestVideoRecord();
				}
			},
			events: function() {

				$scope.$watch('vm.directiveid', function(newVal, oldVal) {
					vm.utils.directive_id = vm.directiveid;
				});

				$scope.$watch('vm.videoref', function(newVal, oldVal) {
					vm.utils.video_ref = vm.videoref;

					// CLEAR ANY PREVIOUS ERRORS
					vm.utils.error_handler.clear();

					console.log("RECEIVED NEW VIDEO REF");
					console.log(vm.videoref);

					if( !vm.utils.video_ref ) {

						if( vm.utils.player.player ) {
							// vm.utils.player.player.pause();
							vm.utils.player.clear();
						}

						return;
					}

					// ONLINE REQUEST VIDEO RECORD
					vm.utils.video.requestVideoRecord();

				});

				$scope.$on("$destroy", function(){

				});

				$scope.$on("videoPlayer::pause", function(){
					vm.utils.player.player.pause();
				});

				$scope.$on("videoPlayer::play", function(event, data){

					if( data.directive_id != vm.utils.directive_id )
					{
						return;
					}

					vm.utils.player.player.play();
				});

				$scope.$on('vjsVideoReady', function (e, data) {
		            //data contains `id`, `vid`, `player` and `controlBar`
		            //NOTE: vid is depricated, use player instead
		            console.log('video id:' + data.id);
		            console.log(data.player);
		            console.log(data.controlBar);

		            vm.utils.player.id = data.id;
		            vm.utils.player.player = data.player;
		            vm.utils.player.control_bar = data.controlBar;

		            vm.utils.player.player.setAttribute('disablePictureInPicture', true);

		            vm.utils.player.player.on('play', function(event, data){

		            	setTimeout(function(){
		            		vm.utils.player.started = true;
		            		$scope.$apply();
		            	}, 0);

		            });

		            vm.utils.player.player.on('pause', function(event, data){

		            });

		            vm.utils.player.player.on('ended', function(event, data){

		            });

		            vm.utils.player.player.on('seeking', function(event, data){

		            });

		            vm.utils.player.player.on('seeked', function(event, data){

		            });

		        });

		        $scope.$on("onlineVideoPlayer::close", function(event, data) {

		        	if( data.directive_id != vm.utils.directive_id ) {
		        		return;
		        	}

		        	if( vm.utils.player.player ) {
		        		// vm.utils.player.player.pause();
		        		vm.utils.player.clear();
		        	}

		        });

			}()
		}

	}

	function videoPlayerController($scope, $rootScope, $q, riskmachDatabasesFactory)
	{
		var vm = this;

		vm.utils = {
			directive_id: vm.directiveid,
			media_id: vm.mediaid,
			minimised: false,
			hidden: true,
			video_record: null,
			video_url: null,
			watch_record: null,
			is_loading: false,
			player: {
				record: null,
				sources: [],
				mediaToggle: {},
				id: null,
				player: null,
				control_bar: null,
				started: false,
				finished: false,
				current_time: null,
				watched_time: null,
				seconds_since_update: 0,
				preview_length: 0,
				selectVideo: function(record){
					vm.utils.player.record = record;
					vm.utils.player.calcPreviewTime();
					vm.utils.player.started = false;
					vm.utils.player.finished = false;
					vm.utils.player.seconds_since_update = 0;
					// vm.utils.player.watched_time = parseInt(vm.utils.watch_record.CurrentWatchTime);
					vm.utils.player.toggleMedia();

					setTimeout(function(){
						vm.utils.player.player.play();
						$scope.$apply();
					}, 0);

					// console.log("START AT: " + vm.utils.player.watched_time);

					// if( parseInt(vm.utils.player.watched_time) > 0 )
					// {
					// 	setTimeout(function(){
					// 		var start_at = parseInt(vm.utils.player.watched_time);
					// 		vm.utils.player.player.currentTime(start_at);
					// 	}, 1000);
					// }
				},
				clear: function(){
					vm.utils.player.player.pause();
					vm.utils.player.record = null;
					vm.utils.player.started = false;
					vm.utils.player.finished = false;
					vm.utils.player.seconds_since_update = 0;
					vm.utils.player.preview_length = 0;
					vm.utils.player.clearMedia();
				},
				calcPreviewTime: function(){
					// var vid_length = parseInt(vm.utils.player.record.VideoLength);
					// var preview_length = Math.floor(vid_length * 0.20);
					// vm.utils.player.preview_length = preview_length;
					// console.log("VIDEO PREVIEW LENGTH:" + preview_length);
				},
				clearMedia: function(){
					var toggle = {
						sources: [],
						tracks: [],
						poster: null
					};

					$scope.mediaToggle = toggle;
				},
				toggleMedia: function(){
					var toggle = {
						sources: [],
						tracks: [],
						poster: null
					};

					toggle.sources = vm.utils.player.createSources();
					// toggle.poster = vm.utils.player.createPoster();
					$scope.mediaToggle = toggle;
				},
				createSources: function(){
					// var sources = [{
					// 	// src: 'https://elasticbeanstalk-eu-west-1-638507748612.s3-eu-west-1.amazonaws.com/RiskMach Data/VideoFiles/16/RiskMach Introduction Video.mp4',
					// 	src: 'https://elasticbeanstalk-eu-west-1-638507748612.s3-eu-west-1.amazonaws.com/RiskMach Data/VideoFiles/'+ vm.utils.player.record.ID +'/' + vm.utils.player.record.Filename.replace(/\.[^/.]+$/, "") + '.mp4',
					// 	type: 'video/mp4'
					// },{
					// 	// src: 'https://elasticbeanstalk-eu-west-1-638507748612.s3-eu-west-1.amazonaws.com/RiskMach Data/VideoFiles/16/RiskMach Introduction Video.webm',
					// 	src: 'https://elasticbeanstalk-eu-west-1-638507748612.s3-eu-west-1.amazonaws.com/RiskMach Data/VideoFiles/'+ vm.utils.player.record.ID +'/' + vm.utils.player.record.Filename.replace(/\.[^/.]+$/, "") + '.webm',
					// 	type: 'video/webm'
					// },{
					// 	// src: 'https://elasticbeanstalk-eu-west-1-638507748612.s3-eu-west-1.amazonaws.com/RiskMach Data/VideoFiles/16/RiskMach Introduction Video.flv',
					// 	src: 'https://elasticbeanstalk-eu-west-1-638507748612.s3-eu-west-1.amazonaws.com/RiskMach Data/VideoFiles/'+ vm.utils.player.record.ID +'/' + vm.utils.player.record.Filename.replace(/\.[^/.]+$/, "") + '.flv',
					// 	type: 'video/x-flv'
					// },{
					// 	// src: 'https://elasticbeanstalk-eu-west-1-638507748612.s3-eu-west-1.amazonaws.com/RiskMach Data/VideoFiles/16/RiskMach Introduction Video.ogg',
					// 	src: 'https://elasticbeanstalk-eu-west-1-638507748612.s3-eu-west-1.amazonaws.com/RiskMach Data/VideoFiles/'+ vm.utils.player.record.ID +'/' + vm.utils.player.record.Filename.replace(/\.[^/.]+$/, "") + '.ogg',
					// 	type: 'video/ogg'
					// }];

					var sources = [{
						src: vm.utils.video_url,
						type: "video/mp4"
					}];

					console.log("Player Sources");
					console.log(sources);

					return sources;
				},
				getTime: function(){
					var time = vm.utils.player.player.currentTime();
					return time;
				},
				init: function(){

				}()
			},
		};

		$scope.$watch('vm.directiveid', function(newVal, oldVal){
			vm.utils.directive_id = vm.directiveid;
		});

		$scope.$watch('vm.mediaid', function(newVal, oldVal){
			
			vm.utils.media_id = vm.mediaid;

			if( !vm.utils.media_id )
			{
				if( vm.utils.player.player )
				{
					vm.utils.player.player.pause();
				}

				return;
			}

			vm.getVideoRecord(vm.utils.media_id);
			vm.utils.hidden = false;
			vm.utils.minimised = false;

		});

		$scope.$on("$destroy", function(){
			// clearTimeout(vm.seconds_timeout);
			// clearTimeout(vm.playback_timeout);
		});

		$scope.$on("videoPlayer::pause", function(){
			vm.utils.player.player.pause();
		});

		$scope.$on("videoPlayer::play", function(event, data){

			if( data.directive_id != vm.utils.directive_id )
			{
				return;
			}

			vm.utils.player.player.play();
		});

		$scope.$on('vjsVideoReady', function (e, data) {
            //data contains `id`, `vid`, `player` and `controlBar`
            //NOTE: vid is depricated, use player instead
            console.log('video id:' + data.id);
            console.log(data.player);
            console.log(data.controlBar);

            // alert("Video Ready");

            vm.utils.player.id = data.id;
            vm.utils.player.player = data.player;
            vm.utils.player.control_bar = data.controlBar;

            vm.utils.player.player.setAttribute('disablePictureInPicture', true);

            vm.utils.player.player.on('play', function(event, data){
            	//alert("The Player Was Started!");

            	setTimeout(function(){
            		vm.utils.player.started = true;
            		$scope.$apply();
            	}, 0);

            });

            vm.utils.player.player.on('pause', function(event, data){
            	//alert("The Player Was Paused at: " + vm.utils.player.player.currentTime());
            
      //       	setTimeout(function(){
      //       		var play_time = Math.ceil(vm.utils.player.player.currentTime());
      //       		// vm.utils.learner_progress.updateVideoWatchedTime(vm.utils.active_topic.record, play_time, 'No');
      //       		videoFactory.updateVideoWatchRecord(vm.utils.video_record.ID, play_time, null, false).then(function(d){
						// vm.broadcastProgress(d.watch_record);
      //       		});

      //       		var event_params = {
	     //        		directive_id: vm.utils.directive_id,
	     //        		video_record: vm.utils.video_record,
	     //        		video_id: vm.utils.video_record.ID,
	     //        		time: Math.ceil(vm.utils.player.player.currentTime())
	     //        	};

	     //        	$rootScope.$broadcast("videoPlayer::paused", event_params);

      //       		$scope.$apply();
      //       	}, 0);

            });

            vm.utils.player.player.on('ended', function(event, data){
            	//alert("The Video ended!");
           
            	// setTimeout(function(){
            	// 	var play_time = Math.ceil(vm.utils.player.player.currentTime());
            	// 	// vm.utils.learner_progress.updateVideoWatchedTime(vm.utils.active_topic.record, play_time, 'Yes');
            	// 	videoFactory.updateVideoWatchRecord(vm.utils.video_record.ID, play_time, null, true).then(function(d){
            	// 		vm.broadcastProgress(d.watch_record);
            	// 	});

            	// 	vm.utils.player.finished = true;
            	// 	$scope.$apply();
            	// }, 0);

            });

            vm.utils.player.player.on('seeking', function(event, data){
            	//alert("Viewer Skipped");
 
            	// if( vm.utils.player.watched_time < vm.utils.player.player.currentTime() )
            	// {
            	// 	vm.utils.player.player.currentTime(vm.utils.player.watched_time);
            	// }

            	// setTimeout(function(){
            	// 	$scope.$apply();
            	// }, 0);

            });

            vm.utils.player.player.on('seeked', function(event, data){
            	//alert("Viewer Skipped and resumed");
            	
            	// if( vm.utils.learners.active_learner.Manager != 'Yes' && vm.utils.player.watched_time < vm.utils.player.player.currentTime() )
            	// {
            	// 	vm.utils.player.player.currentTime(vm.utils.player.watched_time);
            	// }

            	// setTimeout(function(){
            	// 	var play_time = Math.ceil(vm.utils.player.player.currentTime());
            	// 	// vm.utils.learner_progress.updateVideoWatchedTime(vm.utils.active_topic.record, play_time, 'No');
            		
            	// 	videoFactory.updateVideoWatchRecord(vm.utils.video_record.ID, play_time, null, false).then(function(d){
            	// 		vm.broadcastProgress(d.watch_record);
            	// 	});

            	// 	$scope.$apply();
            	// }, 0);

            });

        });

		// vm.getVideoRecord = function()
		// {
		// 	vm.utils.watch_record = null;
		// 	vm.utils.video_record = null;

		// 	vm.utils.is_loading = true;

		// 	//GET MEDIA RECORD

		// 	//GET VIDEO URL

		// 	//CREATE SOURCES - PLAY VIDEO

		// 	videoFactory.videoRecordForPlayer( vm.utils.video_id ).then(function(d){

		// 		if( d.error == true )
		// 		{
		// 			alert( d.error_messages[0] );
		// 		}
		// 		else
		// 		{
		// 			vm.utils.video_record = d.video_record;
		// 			vm.utils.watch_record = d.watch_record;
		// 			vm.utils.player.selectVideo(vm.utils.video_record);

		// 			var params = {
		// 				directive_id: vm.utils.directive_id,
		// 				video_record: d.video_record,
		// 				watch_record: d.watch_record
		// 			};

		// 			$rootScope.$broadcast("videoPlayer::videoLoaded", params);
		// 		}

		// 		vm.utils.is_loading = false;

		// 	}, function(error){
		// 		vm.utils.is_loading = false;
		// 		alert(error);
		// 	});
		// }

		vm.getVideoRecord = function(media_id){
			var defer = $q.defer();

			vm.utils.watch_record = null;
			vm.utils.video_record = null;
			vm.utils.is_loading = true;

			//GET MEDIA RECORD
			riskmachDatabasesFactory.databases.collection.media.get(media_id, {}).then(function(doc){

				console.log("FOUND MEDIA RECORD");
				console.log(doc);

				//FIND THE ATTACHMENT AND URL
				vm.attachmentUrl(media_id, doc.attachment_key).then(function(url){

					defer.resolve(url);

					vm.utils.video_record = doc;
					vm.utils.video_url = url;
					vm.utils.watch_record = null;
					vm.utils.player.selectVideo(vm.utils.video_record);

					vm.utils.is_loading = false;

					var params = {
						directive_id: vm.utils.directive_id,
						video_record: doc,
						watch_record: null
					};

					$rootScope.$broadcast("videoPlayer::videoLoaded", params);

					// alert("URL: "+ url);
					// window.open(url, "_blank");

				}, function(error){
					vm.utils.is_loading = false;
					defer.reject();
				});

			}).catch(function(error){
				vm.utils.is_loading = false;
				defer.reject();
				alert(error);
			});

			return defer.promise;
		};

		vm.attachmentUrl = function(doc_id, attachment_id){
			var defer = $q.defer();
			
			riskmachDatabasesFactory.databases.collection.media.getAttachment(doc_id, attachment_id).then(function(blob){
				var url = URL.createObjectURL(blob);
				console.log("ATTACHMENT URL");
				console.log(url);
				defer.resolve(url);
			}).catch(function(error){
				console.log(error);
				defer.reject();
			});

			return defer.promise;
		};

		vm.broadcastProgress = function(watch_record)
		{
			var params = {
				watch_record: watch_record
			};

			$rootScope.$broadcast("videoPlayer::progress", params);
		}

		vm.toggleMinimised = function()
		{
			vm.utils.minimised = !vm.utils.minimised;
		}

		vm.minimise = function()
		{
			vm.utils.minimised = true;
		}

		vm.maximise = function()
		{
			vm.utils.minimised = false;
		}

		vm.toggleShow = function()
		{
			if( !vm.utils.hidden && vm.utils.in_progress )
			{
				return;
			}

			vm.utils.hidden = !vm.utils.hidden;

			if( vm.utils.hidden )
			{
				if( vm.utils.player.player )
				{
					vm.utils.player.player.pause();
				}
			}
		}

		vm.show = function()
		{
			vm.utils.hidden = false;
		}

		vm.hide = function()
		{
			vm.utils.hidden = true;

			if( vm.utils.player.player )
			{
				vm.utils.player.player.pause();
			}
		}
	}

	function recordVideoController($scope, $rootScope, $q)
	{
		var vm = this;

		vm.utils = {
			minimised: false,
			hidden: true,
			is_uploading: false,
			in_progress: false,
			upload_complete: null,
			recording_finished: false,
			options: null,
			cameras: [],
			microphones: [],
			active_camera: null,
			active_microphone: null,
			resetUpload: function(){
				vm.utils.is_uploading = false;
				vm.utils.upload_complete = null;
				vm.utils.recording_finished = false;
				var parentNode = vm.utils.vid_recorder.recordingPlayer.parentNode;
                parentNode.removeChild(vm.utils.vid_recorder.recordingPlayer);
                vm.utils.vid_recorder.vid_el.remove();
                vm.utils.vid_recorder.media_el.remove();
                vm.utils.vid_recorder.vid_el = null;
                vm.utils.vid_recorder.media_el = null;
                parentNode.innerHTML = '';
                vm.utils.in_progress = false;
                vm.utils.vid_recorder.init();

                setTimeout(function(){
                	vm.initSettings();
                	$scope.$apply();
                }, 0);

			},
			vid_recorder: {
				vid_el: null,
				media_el: null,
				recordingPlayer: null,
				recordingMedia: null,
				mediaContainerFormat: null,
				selectedResolution: 'default',
				selectedFramerate: 15,
				mimeType: null,
				fileExtension: null,
				type: null,
				recordType: null,
				defaultWidth: null,
				defaultHeight: null,
				btnStartRecording: null,
				btnPauseRecording: null,
				chkFixSeeking: null,
				videoBitsPerSecond: 'default',
				// chkTimeSlice: null,
				params: {},
				timeSlice: null,
				is_recording: false,
				source_options: [{
					value: 'record-audio-plus-video',
					display: 'Microphone & Camera'
				},{
					value: 'record-audio',
					display: 'Microphone'
				},{
					value: 'record-screen',
					display: 'Screen'
				},{
					value: 'record-audio-plus-screen',
					display: 'Screen & Audio'
				}],
				resolution_options: [{
					value: 'default',
					display: 'Default Resolution'
				},{
					value: '1920x1080',
					display: '1080p'
				},{
					value: '1280x720',
					display: '720p'
				},{
					value: '640x480',
					display: '480p'
				},{
					value: '3840x2160',
					display: '4K Ultra HD (3840x2160)'
				}],
				framerate_options: [{
					value: 'default',
					display: 'Default framerates'
				},{
					value: 5,
					display: '5 fps'
				},{
					value: 15,
					display: '15 fps'
				},{
					value: 24,
					display: '24 fps'
				},{
					value: 30,
					display: '30 fps'
				},{
					value: 60,
					display: '60 fps'
				}],
				bitrate_options: [{
					value: 'default',
					display: 'Default bitrates'
				},{
					value: 8000000000,
					display: '1 GB bps'
				},{
					value: 800000000,
					display: '100 MB bps'
				},{
					value: 8000000,
					display: '1 MB bps'
				},{
					value: 800000,
					display: '100 KB bps'
				},{
					value: 8000,
					display: '1 KB bps'
				},{
					value: 800,
					display: '100 Bytes bps'
				}],
				init: function(){
					vm.utils.vid_recorder.initVidEl();
					vm.utils.vid_recorder.initMediaEl();
				},
				getDevices: function(){
					var defer = $q.defer();

					vm.utils.cameras = [];
					vm.utils.microphones = [];

					navigator.mediaDevices.enumerateDevices().then(function(devices){

						console.log("FETCHED DEVICES");
						console.log(devices);

						devices.forEach(function(record, index){

							console.log("CURRENT DEVICE: " + record.kind);
							console.log(record);

							if( record.kind == 'videoinput' )
							{
								vm.utils.cameras.push(record);
							}

							if( record.kind == 'audioinput' )
							{
								vm.utils.microphones.push(record);
							}

						});

						console.log("CAMERAS");
						console.log(vm.utils.cameras);

						console.log("MICROPHONES");
						console.log(vm.utils.microphones);

						defer.resolve();
						
					}, function(error){
						alert(error);
						defer.reject(error);
					});

					return defer.promise;
				},
				initVidEl: function(){
					vm.utils.vid_recorder.vid_el = document.createElement('video');
					vm.utils.vid_recorder.vid_el.controls = true;
				},
				initMediaEl: function(){
					vm.utils.vid_recorder.media_el = getHTMLMediaElement(vm.utils.vid_recorder.vid_el, {
		                title: '',
		                buttons: [],
		                showOnMouseEnter: false,
		                width: 500,
		                controls: true,
		                onTakeSnapshot: function(){
		                    // var canvas = document.createElement('canvas');
		                    // canvas.width = vm.utils.vid_recorder.media_el.clientWidth;
		                    // canvas.height = vm.utils.vid_recorder.media_el.clientHeight;

		                    // var context = canvas.getContext('2d');
		                    // context.drawImage(recordingPlayer, 0, 0, canvas.width, canvas.height);

		                    // window.open(canvas.toDataURL('image/png'));
		                }
		            });

					document.getElementById('recording-player').appendChild(vm.utils.vid_recorder.media_el);

		            var div = document.createElement('section');
		            vm.utils.vid_recorder.vid_el.controls = true;
		            vm.utils.vid_recorder.media_el.media.parentNode.appendChild(div);
		            vm.utils.vid_recorder.media_el.media.muted = false;
		            vm.utils.vid_recorder.media_el.media.autoplay = true;
		            vm.utils.vid_recorder.media_el.media.playsinline = true;
		            div.appendChild(vm.utils.vid_recorder.media_el.media);

		            vm.utils.vid_recorder.recordingPlayer = vm.utils.vid_recorder.media_el.media;
		            vm.utils.vid_recorder.recordingMedia = null;
		            vm.utils.vid_recorder.mediaContainerFormat = null;
		            vm.utils.vid_recorder.mimeType = 'video/webm';
		            vm.utils.vid_recorder.fileExtension = 'webm';
		            vm.utils.vid_recorder.type = 'video';
		            vm.utils.vid_recorder.recorderType = null;
		            vm.utils.vid_recorder.defaultWidth = null;
		            vm.utils.vid_recorder.defaultHeight = null;
		            vm.utils.vid_recorder.timeSlice = 2000;
		            // vm.utils.vid_recorder.chkTimeSlice = document.querySelector('#chk-timeSlice');

		            if(typeof MediaRecorder === 'undefined') {
		                // vm.utils.vid_recorder.chkTimeSlice.disabled = true;
		            }

		            vm.utils.vid_recorder.btnStartRecording = document.querySelector('#btn-start-recording');
		            vm.utils.vid_recorder.btnPauseRecording = document.querySelector('#btn-pause-recording');
		            vm.utils.vid_recorder.chkFixSeeking = document.querySelector('#chk-fixSeeking');

		            if(typeof MediaRecorder === 'undefined' && (DetectRTC.browser.name === 'Edge' || DetectRTC.browser.name === 'Safari')) {
		                // webp isn't supported in Microsoft Edge
		                // neither MediaRecorder API
		                // so lets disable both video/screen recording options

		                console.warn('Neither MediaRecorder API nor webp is supported in ' + DetectRTC.browser.name + '. You cam merely record audio.');

		                // vm.utils.vid_recorder.recordingMedia.innerHTML = '<option value="record-audio">Audio</option>';
		                vm.utils.vid_recorder.setMediaContainerFormat(['pcm']);
		            }

		            // vm.utils.vid_recorder.chkTimeSlice.addEventListener('change', function() {
		            //     if(vm.utils.vid_recorder.chkTimeSlice.checked === true)
		            //     {
		            //         var _timeSlice = prompt('Please enter timeSlice in milliseconds e.g. 1000 or 2000 or 3000.', 1000);
		            //         _timeSlice = parseInt(_timeSlice);
		            //         if(!_timeSlice || _timeSlice == NaN || typeof _timeSlice === 'undefined') {
		            //             vm.utils.vid_recorder.timeSlice = false;
		            //             return;
		            //         }

		            //         vm.utils.vid_recorder.timeSlice = _timeSlice;
		            //     }
		            //     else
		            //     {
		            //         vm.utils.vid_recorder.timeSlice = false;
		            //     }

		            // }, false);

				},
				recordingMediaChanged: function(){
					if(vm.utils.vid_recorder.recordingMedia === 'record-audio') {
	                    var recordingOptions = [];
	                    
	                    if(vm.utils.vid_recorder.isMimeTypeSupported('audio/webm')) {
	                        recordingOptions.push('opus');
	                    }

	                    if(vm.utils.vid_recorder.isMimeTypeSupported('audio/ogg')) {
	                        recordingOptions.push('ogg');
	                    }

	                    recordingOptions.push('pcm');

	                    vm.utils.vid_recorder.setMediaContainerFormat(recordingOptions);
	                    return;
	                }

	                var isChrome = !!window.chrome && !(!!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0);

	                var recordingOptions = ['vp8']; // MediaStreamRecorder with vp8

	                if(vm.utils.vid_recorder.isMimeTypeSupported('video/webm\;codecs=vp9')) {
	                    recordingOptions.push('vp9'); // MediaStreamRecorder with vp9
	                }

	                if(vm.utils.vid_recorder.isMimeTypeSupported('video/webm\;codecs=h264')) {
	                    recordingOptions.push('h264'); // MediaStreamRecorder with h264
	                }

	                if(vm.utils.vid_recorder.isMimeTypeSupported('video/x-matroska;codecs=avc1')) {
	                    recordingOptions.push('mkv'); // MediaStreamRecorder with mkv/matroska
	                }

	                recordingOptions.push('gif'); // GifRecorder

	                if(DetectRTC.browser.name == 'Chrome') {
	                    recordingOptions.push('whammy'); // WhammyRecorder
	                }

	                if(DetectRTC.browser.name == 'Chrome') {
	                    recordingOptions.push('WebAssembly'); // WebAssemblyRecorder
	                }

	                recordingOptions.push('default'); // Default mimeType for MediaStreamRecorder

	                vm.utils.vid_recorder.setMediaContainerFormat(recordingOptions);
				},
				addStreamStopListener: function(stream, callback) {
	                stream.addEventListener('ended', function() {
	                    callback();
	                    callback = function(){};
	                }, false);

	                stream.addEventListener('inactive', function() {
	                    callback();
	                    callback = function(){};
	                }, false);

	                stream.getTracks().forEach(function(track) {
	                    track.addEventListener('ended', function() {
	                        callback();
	                        callback = function(){};
	                    }, false);
	                    track.addEventListener('inactive', function() {
	                        callback();
	                        callback = function(){};
	                    }, false);
	                });
	            },
	            startRecording: function(event){
	            	vm.utils.in_progress = true;

	                var button = vm.utils.vid_recorder.btnStartRecording;
	                vm.utils.vid_recorder.vid_el.controls = true;

	                if(button.innerHTML === 'Stop Recording')
	                {
	                	vm.utils.vid_recorder.is_recording = false;

	                    vm.utils.vid_recorder.btnPauseRecording.style.display = 'none';
	                    button.disabled = true;
	                    button.disableStateWaiting = true;

	                    setTimeout(function() {
	                        button.disabled = false;
	                        button.disableStateWaiting = false;
	                        $scope.$apply();
	                    }, 2000);

	                    button.innerHTML = 'Start Recording';

	                    function stopStream() {
	                        if(button.stream && button.stream.stop) {
	                            button.stream.stop();
	                            button.stream = null;
	                        }

	                        if(button.stream instanceof Array) {
	                            button.stream.forEach(function(stream) {
	                                stream.stop();
	                            });
	                            button.stream = null;
	                        }

	                        vm.utils.vid_recorder.videoBitsPerSecond = null;
	                        var html = 'Recording status: stopped';
	                        html += '<br>Size: ' + bytesToSize(button.recordRTC.getBlob().size);
	                        // vm.utils.vid_recorder.recordingPlayer.parentNode.parentNode.querySelector('h2').innerHTML = html;
	                    }

	                    if(button.recordRTC) {
	                        if(button.recordRTC.length) {
	                            button.recordRTC[0].stopRecording(function(url){
	                                if(!button.recordRTC[1]) {
	                                    button.recordingEndedCallback(url);
	                                    stopStream();

	                                    vm.utils.vid_recorder.saveToDiskOrOpenNewTab(button.recordRTC[0]);
	                                    return;
	                                }

	                                button.recordRTC[1].stopRecording(function(url) {
	                                    button.recordingEndedCallback(url);
	                                    stopStream();
	                                });
	                            });
	                        }
	                        else {
	                            button.recordRTC.stopRecording(function(url) {
	                                if(button.blobs && button.blobs.length) {
	                                    var blob = new File(button.blobs, vm.utils.vid_recorder.getFileName(vm.utils.vid_recorder.fileExtension), {
	                                        type: vm.utils.vid_recorder.mimeType
	                                    });
	                                    
	                                    button.recordRTC.getBlob = function() {
	                                        return blob;
	                                    };

	                                    url = URL.createObjectURL(blob);
	                                }

	                                if(vm.utils.vid_recorder.chkFixSeeking.checked === true) {
	                                    // to fix video seeking issues
	                                    getSeekableBlob(button.recordRTC.getBlob(), function(seekableBlob) {
	                                        button.recordRTC.getBlob = function() {
	                                            return seekableBlob;
	                                        };

	                                        url = URL.createObjectURL(seekableBlob);

	                                        button.recordingEndedCallback(url);
	                                        vm.utils.vid_recorder.saveToDiskOrOpenNewTab(button.recordRTC);
	                                        stopStream();
	                                    })
	                                    return;
	                                }

	                                button.recordingEndedCallback(url);
	                                vm.utils.vid_recorder.saveToDiskOrOpenNewTab(button.recordRTC);
	                                stopStream();
	                            });
	                        }
	                    }

	                    $scope.$apply();
	                    return;
	                }

	                // if(!event) return;

	                vm.minimise();

	                vm.utils.vid_recorder.is_recording = true;
	                button.disabled = true;

	                var commonConfig = {
	                    onMediaCaptured: function(stream) {
	                        button.stream = stream;
	                        if(button.mediaCapturedCallback) {
	                            button.mediaCapturedCallback();
	                        }

	                        button.innerHTML = 'Stop Recording';
	                        button.disabled = false;

	                        vm.utils.vid_recorder.chkFixSeeking.parentNode.style.display = 'none';
	                    },
	                    onMediaStopped: function() {
	                        button.innerHTML = 'Start Recording';

	                        if(!button.disableStateWaiting) {
	                            button.disabled = false;
	                        }

	                        vm.utils.vid_recorder.chkFixSeeking.parentNode.style.display = 'inline-block';
	                    },
	                    onMediaCapturingFailed: function(error) {
	                        console.error('onMediaCapturingFailed:', error);

	                        if(error.toString().indexOf('no audio or video tracks available') !== -1) {
	                            alert('RecordRTC failed to start because there are no audio or video tracks available.');
	                        }
	                        
	                        if(error.name === 'PermissionDeniedError' && DetectRTC.browser.name === 'Firefox') {
	                            alert('Firefox requires version >= 52. Firefox also requires HTTPs.');
	                        }

	                        commonConfig.onMediaStopped();
	                    }
	                };

	                if(vm.utils.vid_recorder.mediaContainerFormat === 'h264') {
	                    vm.utils.vid_recorder.mimeType = 'video/webm\;codecs=h264';
	                    vm.utils.vid_recorder.fileExtension = 'mp4';

	                    // video/mp4;codecs=avc1    
	                    if(vm.utils.vid_recorder.isMimeTypeSupported('video/mpeg')) {
	                        vm.utils.vid_recorder.mimeType = 'video/mpeg';
	                    }
	                }

	                if(vm.utils.vid_recorder.mediaContainerFormat === 'mkv' && vm.utils.vid_recorder.isMimeTypeSupported('video/x-matroska;codecs=avc1')) {
	                    vm.utils.vid_recorder.mimeType = 'video/x-matroska;codecs=avc1';
	                    vm.utils.vid_recorder.fileExtension = 'mkv';
	                }

	                if(vm.utils.vid_recorder.mediaContainerFormat === 'vp8' && vm.utils.vid_recorder.isMimeTypeSupported('video/webm\;codecs=vp8')) {
	                    vm.utils.vid_recorder.mimeType = 'video/webm\;codecs=vp8';
	                    vm.utils.vid_recorder.fileExtension = 'webm';
	                    vm.utils.vid_recorder.recorderType = null;
	                    vm.utils.vid_recorder.type = 'video';
	                }

	                if(vm.utils.vid_recorder.mediaContainerFormat === 'vp9' && vm.utils.vid_recorder.isMimeTypeSupported('video/webm\;codecs=vp9')) {
	                    vm.utils.vid_recorder.mimeType = 'video/webm\;codecs=vp9';
	                    vm.utils.vid_recorder.fileExtension = 'webm';
	                    vm.utils.vid_recorder.recorderType = null;
	                    vm.utils.vid_recorder.type = 'video';
	                }

	                if(vm.utils.vid_recorder.mediaContainerFormat === 'pcm') {
	                    vm.utils.vid_recorder.mimeType = 'audio/wav';
	                    vm.utils.vid_recorder.fileExtension = 'wav';
	                    vm.utils.vid_recorder.recorderType = StereoAudioRecorder;
	                    vm.utils.vid_recorder.type = 'audio';
	                }

	                if(vm.utils.vid_recorder.mediaContainerFormat === 'opus' || vm.utils.vid_recorder.mediaContainerFormat === 'ogg') {
	                    if(vm.utils.vid_recorder.isMimeTypeSupported('audio/webm')) {
	                        vm.utils.vid_recorder.mimeType = 'audio/webm';
	                        vm.utils.vid_recorder.fileExtension = 'webm'; // webm
	                    }

	                    if(vm.utils.vid_recorder.isMimeTypeSupported('audio/ogg')) {
	                        vm.utils.vid_recorder.mimeType = 'audio/ogg; codecs=opus';
	                        vm.utils.vid_recorder.fileExtension = 'ogg'; // ogg
	                    }

	                    vm.utils.vid_recorder.recorderType = null;
	                    vm.utils.vid_recorder.type = 'audio';
	                }

	                if(vm.utils.vid_recorder.mediaContainerFormat === 'whammy') {
	                    vm.utils.vid_recorder.mimeType = 'video/webm';
	                    vm.utils.vid_recorder.fileExtension = 'webm';
	                    vm.utils.vid_recorder.recorderType = WhammyRecorder;
	                    vm.utils.vid_recorder.type = 'video';
	                }

	                if(vm.utils.vid_recorder.mediaContainerFormat === 'WebAssembly') {
	                    vm.utils.vid_recorder.mimeType = 'video/webm';
	                    vm.utils.vid_recorder.fileExtension = 'webm';
	                    vm.utils.vid_recorder.recorderType = WebAssemblyRecorder;
	                    vm.utils.vid_recorder.type = 'video';
	                }

	                if(vm.utils.vid_recorder.mediaContainerFormat === 'gif') {
	                    vm.utils.vid_recorder.mimeType = 'image/gif';
	                    vm.utils.vid_recorder.fileExtension = 'gif';
	                    vm.utils.vid_recorder.recorderType = GifRecorder;
	                    vm.utils.vid_recorder.type = 'gif';
	                }

	                if(vm.utils.vid_recorder.mediaContainerFormat === 'default') {
	                    vm.utils.vid_recorder.mimeType = 'video/webm';
	                    vm.utils.vid_recorder.fileExtension = 'webm';
	                    vm.utils.vid_recorder.recorderType = null;
	                    vm.utils.vid_recorder.type = 'video';
	                }

	                console.log("VIDEO RECORDER");
	                console.log(vm.utils.vid_recorder.recordingMedia);

	                if(vm.utils.vid_recorder.recordingMedia === 'record-audio') {

	                    vm.utils.vid_recorder.captureAudio(commonConfig);

	                    button.mediaCapturedCallback = function() {
	                        var options = {
	                            type: vm.utils.vid_recorder.type,
	                            mimeType: vm.utils.vid_recorder.mimeType,
	                            leftChannel: vm.utils.vid_recorder.params.leftChannel || false,
	                            disableLogs: vm.utils.vid_recorder.params.disableLogs || false
	                        };

	                        if(vm.utils.vid_recorder.params.sampleRate) {
	                            options.sampleRate = parseInt(vm.utils.vid_recorder.params.sampleRate);
	                        }

	                        if(vm.utils.vid_recorder.params.bufferSize) {
	                            options.bufferSize = parseInt(vm.utils.vid_recorder.params.bufferSize);
	                        }

	                        if(vm.utils.vid_recorder.recorderType) {
	                            options.recorderType = vm.utils.vid_recorder.recorderType;
	                        }

	                        if(vm.utils.vid_recorder.videoBitsPerSecond) {
	                            options.videoBitsPerSecond = vm.utils.vid_recorder.videoBitsPerSecond;
	                        }

	                        if(DetectRTC.browser.name === 'Edge') {
	                            options.numberOfAudioChannels = 1;
	                        }

	                        options.ignoreMutedMedia = false;
	                        button.recordRTC = RecordRTC(button.stream, options);

	                        button.recordingEndedCallback = function(url){
	                            vm.utils.vid_recorder.setVideoURL(url);
	                        };

	                        console.log("GOT HERE");

	                        button.recordRTC.startRecording();
	                        vm.utils.vid_recorder.btnPauseRecording.style.display = '';
	                    };
	                }

	                if(vm.utils.vid_recorder.recordingMedia === 'record-audio-plus-video') {
	                    vm.utils.vid_recorder.captureAudioPlusVideo(commonConfig);

	                    button.mediaCapturedCallback = function() {
	                        if(typeof MediaRecorder === 'undefined') { // opera or chrome etc.
	                            button.recordRTC = [];

	                            if(!vm.utils.vid_recorder.params.bufferSize) {
	                                // it fixes audio issues whilst recording 720p
	                                vm.utils.vid_recorder.params.bufferSize = 16384;
	                            }

	                            var options = {
	                                type: 'audio', // hard-code to set "audio"
	                                leftChannel: vm.utils.vid_recorder.params.leftChannel || false,
	                                disableLogs: vm.utils.vid_recorder.params.disableLogs || false,
	                                video: vm.utils.vid_recorder.recordingPlayer
	                            };

	                            if(vm.utils.vid_recorder.params.sampleRate) {
	                                options.sampleRate = parseInt(vm.utils.vid_recorder.params.sampleRate);
	                            }

	                            if(vm.utils.vid_recorder.params.bufferSize) {
	                                options.bufferSize = parseInt(vm.utils.vid_recorder.params.bufferSize);
	                            }

	                            if(vm.utils.vid_recorder.params.frameInterval) {
	                                options.frameInterval = parseInt(vm.utils.vid_recorder.params.frameInterval);
	                            }

	                            if(vm.utils.vid_recorder.recorderType) {
	                                options.recorderType = vm.utils.vid_recorder.recorderType;
	                            }

	                            if(vm.utils.vid_recorder.videoBitsPerSecond) {
	                                options.videoBitsPerSecond = vm.utils.vid_recorder.videoBitsPerSecond;
	                            }

	                            options.ignoreMutedMedia = false;
	                            var audioRecorder = RecordRTC(button.stream, options);

	                            options.type = vm.utils.vid_recorder.type;
	                            var videoRecorder = RecordRTC(button.stream, options);

	                            // to sync audio/video playbacks in browser!
	                            videoRecorder.initRecorder(function() {
	                                audioRecorder.initRecorder(function() {
	                                    audioRecorder.startRecording();
	                                    videoRecorder.startRecording();
	                                    vm.utils.vid_recorder.btnPauseRecording.style.display = '';
	                                });
	                            });

	                            button.recordRTC.push(audioRecorder, videoRecorder);

	                            button.recordingEndedCallback = function() {
	                                var audio = new Audio();
	                                audio.src = audioRecorder.toURL();
	                                audio.controls = true;
	                                audio.autoplay = true;

	                                vm.utils.vid_recorder.recordingPlayer.parentNode.appendChild(document.createElement('hr'));
	                                vm.utils.vid_recorder.recordingPlayer.parentNode.appendChild(audio);

	                                if(audio.paused) audio.play();
	                            };

	                            return;
	                        }

	                        var options = {
	                            type: vm.utils.vid_recorder.type,
	                            mimeType: vm.utils.vid_recorder.mimeType,
	                            disableLogs: vm.utils.vid_recorder.params.disableLogs || false,
	                            getNativeBlob: false, // enable it for longer recordings
	                            video: vm.utils.vid_recorder.recordingPlayer
	                        };

	                        if(vm.utils.vid_recorder.recorderType) {
	                            options.recorderType = vm.utils.vid_recorder.recorderType;

	                            if(vm.utils.vid_recorder.recorderType == WhammyRecorder || vm.utils.vid_recorder.recorderType == GifRecorder || vm.utils.vid_recorder.recorderType == WebAssemblyRecorder) {
	                                options.canvas = options.video = {
	                                    width: vm.utils.vid_recorder.defaultWidth || 320,
	                                    height: vm.utils.vid_recorder.defaultHeight || 240
	                                };
	                            }
	                        }

	                        if(vm.utils.vid_recorder.videoBitsPerSecond) {
	                            options.videoBitsPerSecond = vm.utils.vid_recorder.videoBitsPerSecond;
	                        }

	                        if(vm.utils.vid_recorder.timeSlice && typeof MediaRecorder !== 'undefined') {
	                            options.timeSlice = vm.utils.vid_recorder.timeSlice;
	                            button.blobs = [];
	                            options.ondataavailable = function(blob) {
	                                button.blobs.push(blob);
	                            };
	                        }

	                        options.ignoreMutedMedia = false;
	                        button.recordRTC = RecordRTC(button.stream, options);

	                        button.recordingEndedCallback = function(url) {
	                            vm.utils.vid_recorder.setVideoURL(url);
	                        };

	                        button.recordRTC.startRecording();
	                        vm.utils.vid_recorder.btnPauseRecording.style.display = '';
	                        //vm.utils.vid_recorder.recordingPlayer.parentNode.parentNode.querySelector('h2').innerHTML = '<img src="https://www.webrtc-experiment.com/images/progress.gif">';
	                    };
	                }

	                if(vm.utils.vid_recorder.recordingMedia === 'record-screen') {
	                    vm.utils.vid_recorder.captureScreen(commonConfig);

	                    button.mediaCapturedCallback = function() {
	                        var options = {
	                            type: vm.utils.vid_recorder.type,
	                            mimeType: vm.utils.vid_recorder.mimeType,
	                            disableLogs: vm.utils.vid_recorder.params.disableLogs || false,
	                            getNativeBlob: false, // enable it for longer recordings
	                            video: vm.utils.vid_recorder.recordingPlayer
	                        };

	                        if(vm.utils.vid_recorder.recorderType) {
	                            options.recorderType = vm.utils.vid_recorder.recorderType;

	                            if(vm.utils.vid_recorder.recorderType == WhammyRecorder || vm.utils.vid_recorder.recorderType == GifRecorder || vm.utils.vid_recorder.recorderType == WebAssemblyRecorder) {
	                                options.canvas = options.video = {
	                                    width: vm.utils.vid_recorder.defaultWidth || 320,
	                                    height: vm.utils.vid_recorder.defaultHeight || 240
	                                };
	                            }
	                        }

	                        if(vm.utils.vid_recorder.videoBitsPerSecond) {
	                            options.videoBitsPerSecond = vm.utils.vid_recorder.videoBitsPerSecond;
	                        }

	                        options.ignoreMutedMedia = false;
	                        button.recordRTC = RecordRTC(button.stream, options);

	                        button.recordingEndedCallback = function(url) {
	                            vm.utils.vid_recorder.setVideoURL(url);
	                        };

	                        button.recordRTC.startRecording();
	                        vm.utils.vid_recorder.btnPauseRecording.style.display = '';
	                    };
	                }

	                // note: audio+tab is supported in Chrome 50+
	                // todo: add audio+tab recording
	                if(vm.utils.vid_recorder.recordingMedia === 'record-audio-plus-screen') {
	                    vm.utils.vid_recorder.captureAudioPlusScreen(commonConfig);

	                    button.mediaCapturedCallback = function() {
	                        var options = {
	                            type: vm.utils.vid_recorder.type,
	                            mimeType: vm.utils.vid_recorder.mimeType,
	                            disableLogs: vm.utils.vid_recorder.params.disableLogs || false,
	                            getNativeBlob: false, // enable it for longer recordings
	                            video: vm.utils.vid_recorder.recordingPlayer
	                        };

	                        if(vm.utils.vid_recorder.recorderType) {
	                            options.recorderType = vm.utils.vid_recorder.recorderType;

	                            if(vm.utils.vid_recorder.recorderType == WhammyRecorder || vm.utils.vid_recorder.recorderType == GifRecorder || vm.utils.vid_recorder.recorderType == WebAssemblyRecorder) {
	                                options.canvas = options.video = {
	                                    width: vm.utils.vid_recorder.defaultWidth || 320,
	                                    height: vm.utils.vid_recorder.defaultHeight || 240
	                                };
	                            }
	                        }

	                        if(vm.utils.vid_recorder.videoBitsPerSecond) {
	                            options.videoBitsPerSecond = vm.utils.vid_recorder.videoBitsPerSecond;
	                        }

	                        options.ignoreMutedMedia = false;
	                        button.recordRTC = RecordRTC(button.stream, options);

	                        button.recordingEndedCallback = function(url) {
	                            vm.utils.vid_recorder.setVideoURL(url);
	                        };

	                        button.recordRTC.startRecording();
	                        vm.utils.vid_recorder.btnPauseRecording.style.display = '';
	                    };
	                }
	            },
	            pauseRecording: function(){


	                if(!vm.utils.vid_recorder.btnStartRecording.recordRTC) {
	                    vm.utils.vid_recorder.btnPauseRecording.style.display = 'none';
	                    return;
	                }

	                vm.utils.vid_recorder.btnPauseRecording.disabled = true;

	                if(vm.utils.vid_recorder.btnPauseRecording.innerHTML === 'Pause') {

	                	vm.utils.vid_recorder.is_recording = false;
	                    vm.utils.vid_recorder.btnStartRecording.disabled = true;
	                    vm.utils.vid_recorder.chkFixSeeking.parentNode.style.display = 'none';
	                    vm.utils.vid_recorder.btnStartRecording.style.fontSize = '15px';
	                    vm.utils.vid_recorder.btnStartRecording.recordRTC.pauseRecording();
	                    // vm.utils.vid_recorder.recordingPlayer.parentNode.parentNode.querySelector('h2').innerHTML = 'Recording status: paused';
	                    vm.utils.vid_recorder.recordingPlayer.pause();

	                    vm.utils.vid_recorder.btnPauseRecording.style.fontSize = 'inherit';
	                    setTimeout(function() {
	                        vm.utils.vid_recorder.btnPauseRecording.innerHTML = 'Resume Recording';
	                        vm.utils.vid_recorder.btnPauseRecording.disabled = false;
	                    }, 2000);

	                }

	                if(vm.utils.vid_recorder.btnPauseRecording.innerHTML === 'Resume Recording') {
	                    
	                    vm.utils.vid_recorder.is_recording = true;
	                    vm.utils.vid_recorder.btnStartRecording.disabled = false;
	                    vm.utils.vid_recorder.chkFixSeeking.parentNode.style.display = 'none';
	                    vm.utils.vid_recorder.btnStartRecording.style.fontSize = 'inherit';
	                    vm.utils.vid_recorder.btnStartRecording.recordRTC.resumeRecording();
	                    //vm.utils.vid_recorder.recordingPlayer.parentNode.parentNode.querySelector('h2').innerHTML = '<img src="https://www.webrtc-experiment.com/images/progress.gif">';
	                    vm.utils.vid_recorder.recordingPlayer.play();

	                    vm.utils.vid_recorder.btnPauseRecording.style.fontSize = '15px';
	                    vm.utils.vid_recorder.btnPauseRecording.innerHTML = 'Pause';
	                    setTimeout(function() {
	                        vm.utils.vid_recorder.btnPauseRecording.disabled = false;
	                    }, 2000);

	                }
	            },
	            captureVideo: function(config){
	                vm.utils.vid_recorder.captureUserMedia({video: true}, function(videoStream) {
	                    config.onMediaCaptured(videoStream);

	                    vm.utils.vid_recorder.addStreamStopListener(videoStream, function() {
	                        config.onMediaStopped();
	                    });

	                }, function(error) {
	                    config.onMediaCapturingFailed(error);
	                });
	            },
	            captureAudio: function(config) {
	                vm.utils.vid_recorder.captureUserMedia({audio: true}, function(audioStream) {
	                    config.onMediaCaptured(audioStream);

	                    vm.utils.vid_recorder.addStreamStopListener(audioStream, function() {
	                        config.onMediaStopped();
	                    });
	                }, function(error) {
	                    config.onMediaCapturingFailed(error);
	                });
	            },
	            captureAudioPlusVideo: function(config) {
	                vm.utils.vid_recorder.captureUserMedia({video: true, audio: true}, function(audioVideoStream) {
	                    config.onMediaCaptured(audioVideoStream);

	                    if(audioVideoStream instanceof Array) {
	                        audioVideoStream.forEach(function(stream) {
	                            vm.utils.vid_recorder.addStreamStopListener(stream, function() {
	                                config.onMediaStopped();
	                            });
	                        });
	                        return;
	                    }

	                    vm.utils.vid_recorder.addStreamStopListener(audioVideoStream, function() {
	                        config.onMediaStopped();
	                    });
	                }, function(error) {
	                    config.onMediaCapturingFailed(error);
	                });
	            },
	            setVideoBitrates: function(){
	                // var select = document.querySelector('.media-bitrates');
	                // var value = vm.utils.vid_recorder.selectedBitrate;

	                // if(value == 'default') {
	                //     vm.utils.vid_recorder.videoBitsPerSecond = null;
	                //     return;
	                // }

	                // vm.utils.vid_recorder.videoBitsPerSecond = parseInt(value);
	            },
	            getFrameRates: function(mediaConstraints) {
	                if(!mediaConstraints.video) {
	                    return mediaConstraints;
	                }

	                // var select = document.querySelector('.media-framerates');
	                var value = vm.utils.vid_recorder.selectedFramerate;

	                if(value == 'default') {
	                    return mediaConstraints;
	                }

	                value = parseInt(value);

	                if(DetectRTC.browser.name === 'Firefox') {
	                    mediaConstraints.video.frameRate = value;
	                    return mediaConstraints;
	                }

	                if(!mediaConstraints.video.mandatory) {
	                    mediaConstraints.video.mandatory = {};
	                    mediaConstraints.video.optional = [];
	                }

	                var isScreen = vm.utils.vid_recorder.recordingMedia.toString().toLowerCase().indexOf('screen') != -1;
	                
	                if(isScreen) {
	                    mediaConstraints.video.mandatory.maxFrameRate = value;
	                }
	                else {
	                    mediaConstraints.video.mandatory.minFrameRate = value;
	                }

	                return mediaConstraints;
	            },
	            setGetFromLocalStorage: function(selectors) {
	                // selectors.forEach(function(selector) {
	                //     var storageItem = selector.replace(/\.|#/g, '');
	                //     if(localStorage.getItem(storageItem)) {
	                //         document.querySelector(selector).value = localStorage.getItem(storageItem);
	                //     }

	                //     vm.utils.vid_recorder.addEventListenerToUploadLocalStorageItem(selector, ['change', 'blur'], function() {
	                //         localStorage.setItem(storageItem, document.querySelector(selector).value);
	                //     });
	                // });
	            },
	            addEventListenerToUploadLocalStorageItem: function(selector, arr, callback) {
	                arr.forEach(function(event) {
	                    document.querySelector(selector).addEventListener(event, callback, false);
	                });
	            },
	            getVideoResolutions: function(mediaConstraints){
	                if(!mediaConstraints.video) {
	                    return mediaConstraints;
	                }

	                var value = vm.utils.vid_recorder.selectedResolution;

	                if(value == 'default') {
	                    return mediaConstraints;
	                }

	                value = value.split('x');

	                if(value.length != 2) {
	                    return mediaConstraints;
	                }

	                vm.utils.vid_recorder.defaultWidth = parseInt(value[0]);
	                vm.utils.vid_recorder.defaultHeight = parseInt(value[1]);


	                if(DetectRTC.browser.name === 'Firefox') {
	                    mediaConstraints.video.width = vm.utils.vid_recorder.defaultWidth;
	                    mediaConstraints.video.height = vm.utils.vid_recorder.defaultHeight;
	                    return mediaConstraints;
	                }

	                if(!mediaConstraints.video.mandatory) {
	                    mediaConstraints.video.mandatory = {};
	                    mediaConstraints.video.optional = [];
	                }

	                var isScreen = vm.utils.vid_recorder.recordingMedia.toString().toLowerCase().indexOf('screen') != -1;

	                if(isScreen) {
	                    mediaConstraints.video.mandatory.maxWidth = vm.utils.vid_recorder.defaultWidth;
	                    mediaConstraints.video.mandatory.maxHeight = vm.utils.vid_recorder.defaultHeight;
	                }
	                else {
	                    mediaConstraints.video.mandatory.minWidth = vm.utils.vid_recorder.defaultWidth;
	                    mediaConstraints.video.mandatory.minHeight = vm.utils.vid_recorder.defaultHeight;
	                }

	                return mediaConstraints;
	            },
	            captureUserMedia: function(mediaConstraints, successCallback, errorCallback){
	               
	                if(mediaConstraints.video == true) {
	                    mediaConstraints.video = {};

	                    //SET TO THE ACTIVE CAMERA SELECTION
	                    if( vm.utils.active_camera )
	                    {
	                    	// mediaConstraints.video.deviceId = vm.utils.active_camera;
	                    	mediaConstraints.video = {
	                    		deviceId: {
	                    			exact: vm.utils.active_camera
	                    		}
	                    	};
	                    }
	                }

	                if( mediaConstraints.audio == true )
	                {
	                	mediaConstraints.audio = {};

	                	if( vm.utils.active_microphone )
	                	{
	                		// mediaConstraints.audio.deviceId = vm.utils.active_microphone;
	                		//mediaConstraints.audio = {deviceId: vm.utils.active_microphone ? {exact: vm.utils.active_microphone} : undefined};

	                		mediaConstraints.audio = {
	                    		deviceId: {
	                    			exact: vm.utils.active_microphone
	                    		}
	                    	};
	                	}
	                }

	                vm.utils.vid_recorder.setVideoBitrates();

	                // mediaConstraints = vm.utils.vid_recorder.getVideoResolutions(mediaConstraints);
	                // mediaConstraints = vm.utils.vid_recorder.getFrameRates(mediaConstraints);

	                var isBlackBerry = !!(/BB10|BlackBerry/i.test(navigator.userAgent || ''));
	                if(isBlackBerry && !!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia)) {
	                    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
	                    navigator.getUserMedia(mediaConstraints, successCallback, errorCallback);
	                    return;
	                }

	                navigator.mediaDevices.getUserMedia(mediaConstraints).then(function(stream) {
	                    successCallback(stream);
	                    vm.utils.vid_recorder.setVideoURL(stream, true);
	                }).catch(function(error) {
	                    if(error && (error.name === 'ConstraintNotSatisfiedError' || error.name === 'OverconstrainedError')) {
	                        alert('Your camera or browser does NOT supports selected resolutions or frame-rates. \n\nPlease select "default" resolutions.');
	                    }
	                    else if(error && error.message) {
	                        alert(error.message);
	                    }
	                    else {
	                        alert('Unable to make getUserMedia request. Please check browser console logs.');
	                    }

	                    errorCallback(error);
	                });
	            },
	            setMediaContainerFormat: function(arrayOfOptionsSupported){
	            	//CHANGE THIS LATER SO ANGULAR ONLY
	            	var mfe = document.querySelector('.media-container-format');

	                var options = Array.prototype.slice.call(
	                   mfe.querySelectorAll('option')
	                );

	                var localStorageItem;
	                if(localStorage.getItem('media-container-format')) {
	                    localStorageItem = localStorage.getItem('media-container-format');
	                }

	                var selectedItem;
	                options.forEach(function(option){
	                    option.disabled = true;

	                    if(arrayOfOptionsSupported.indexOf(option.value) !== -1) {
	                        option.disabled = false;

	                        if(localStorageItem && arrayOfOptionsSupported.indexOf(localStorageItem) != -1) {
	                            if(option.value != localStorageItem) return;
	                            option.selected = true;
	                            selectedItem = option;
	                            return;
	                        }

	                        if(!selectedItem) {
	                            option.selected = true;
	                            selectedItem = option;
	                        }
	                    }
	                });
	            },
	            isMimeTypeSupported: function(mimeType){
	                if(typeof MediaRecorder === 'undefined') {
	                    return false;
	                }

	                if(typeof MediaRecorder.isTypeSupported !== 'function') {
	                    return true;
	                }

	                return MediaRecorder.isTypeSupported(mimeType);
	            },
	            stringify: function(obj){
	                var result = '';
	                Object.keys(obj).forEach(function(key) {
	                    if(typeof obj[key] === 'function') {
	                        return;
	                    }

	                    if(result.length) {
	                        result += ',';
	                    }

	                    result += key + ': ' + obj[key];
	                });

	                return result;
	            },
	            mediaRecorderToStringify: function(mediaRecorder){
	                var result = '';
	                result += 'mimeType: ' + mediaRecorder.mimeType;
	                result += ', state: ' + mediaRecorder.state;
	                result += ', audioBitsPerSecond: ' + mediaRecorder.audioBitsPerSecond;
	                result += ', videoBitsPerSecond: ' + mediaRecorder.videoBitsPerSecond;

	                if(mediaRecorder.stream) {
	                    result += ', streamid: ' + mediaRecorder.stream.id;
	                    result += ', stream-active: ' + mediaRecorder.stream.active;
	                }

	                return result;
	            },
	            getFailureReport: function(){
	                var info = 'RecordRTC seems failed. \n\n' + vm.utils.vid_recorder.stringify(DetectRTC.browser) + '\n\n' + DetectRTC.osName + ' ' + DetectRTC.osVersion + '\n';

	                if (typeof vm.utils.vid_recorder.recorderType !== 'undefined' && vm.utils.vid_recorder.recorderType) {
	                    info += '\nrecorderType: ' + vm.utils.vid_recorder.recorderType.name;
	                }

	                if (typeof vm.utils.vid_recorder.mimeType !== 'undefined') {
	                    info += '\nmimeType: ' + vm.utils.vid_recorder.mimeType;
	                }

	                Array.prototype.slice.call(document.querySelectorAll('select')).forEach(function(select) {
	                    info += '\n' + (select.id || select.className) + ': ' + select.value;
	                });

	                if (vm.utils.vid_recorder.btnStartRecording.recordRTC) {
	                    info += '\n\ninternal-recorder: ' + vm.utils.vid_recorder.btnStartRecording.recordRTC.getInternalRecorder().name;
	                    
	                    if(vm.utils.vid_recorder.btnStartRecording.recordRTC.getInternalRecorder().getAllStates) {
	                        info += '\n\nrecorder-states: ' + vm.utils.vid_recorder.btnStartRecording.recordRTC.getInternalRecorder().getAllStates();
	                    }
	                }

	                if(vm.utils.vid_recorder.btnStartRecording.stream) {
	                    info += '\n\naudio-tracks: ' + getTracks(vm.utils.vid_recorder.btnStartRecording.stream, 'audio').length;
	                    info += '\nvideo-tracks: ' + getTracks(vm.utils.vid_recorder.btnStartRecording.stream, 'video').length;
	                    info += '\nstream-active? ' + !!vm.utils.vid_recorder.btnStartRecording.stream.active;

	                    vm.utils.vid_recorder.btnStartRecording.stream.getTracks().forEach(function(track) {
	                        info += '\n' + track.kind + '-track-' + (track.label || track.id) + ': (enabled: ' + !!track.enabled + ', readyState: ' + track.readyState + ', muted: ' + !!track.muted + ')';

	                        if(track.getConstraints && Object.keys(track.getConstraints()).length) {
	                            info += '\n' + track.kind + '-track-getConstraints: ' + vm.utils.vid_recorder.stringify(track.getConstraints());
	                        }

	                        if(track.getSettings && Object.keys(track.getSettings()).length) {
	                            info += '\n' + track.kind + '-track-getSettings: ' + vm.utils.vid_recorder.stringify(track.getSettings());
	                        }
	                    });
	                }

	                if(vm.utils.vid_recorder.timeSlice && vm.utils.vid_recorder.btnStartRecording.recordRTC) {
	                    info += '\ntimeSlice: ' + vm.utils.vid_recorder.timeSlice;

	                    if(vm.utils.vid_recorder.btnStartRecording.recordRTC.getInternalRecorder().getArrayOfBlobs) {
	                        var blobSizes = [];
	                        vm.utils.vid_recorder.btnStartRecording.recordRTC.getInternalRecorder().getArrayOfBlobs().forEach(function(blob) {
	                            blobSizes.push(blob.size);
	                        });
	                        info += '\nblobSizes: ' + blobSizes;
	                    }
	                }

	                else if(vm.utils.vid_recorder.btnStartRecording.recordRTC && vm.utils.vid_recorder.btnStartRecording.recordRTC.getBlob()) {
	                    info += '\n\nblobSize: ' + bytesToSize(vm.utils.vid_recorder.btnStartRecording.recordRTC.getBlob().size);
	                }

	                if(vm.utils.vid_recorder.btnStartRecording.recordRTC && vm.utils.vid_recorder.btnStartRecording.recordRTC.getInternalRecorder() && vm.utils.vid_recorder.btnStartRecording.recordRTC.getInternalRecorder().getInternalRecorder && vm.utils.vid_recorder.btnStartRecording.recordRTC.getInternalRecorder().getInternalRecorder()) {
	                    info += '\n\ngetInternalRecorder: ' + vm.utils.vid_recorder.mediaRecorderToStringify(vm.utils.vid_recorder.btnStartRecording.recordRTC.getInternalRecorder().getInternalRecorder());
	                }

	                return info;
	            },
	            saveToDiskOrOpenNewTab: function(recordRTC){
	                if(!recordRTC.getBlob().size) {
	                    var info = vm.utils.vid_recorder.getFailureReport();
	                    console.log('blob', recordRTC.getBlob());
	                    console.log('recordrtc instance', recordRTC);
	                    console.log('report', info);

	                    if(vm.utils.vid_recorder.mediaContainerFormat !== 'default') {
	                        alert('RecordRTC seems failed recording using ' + vm.utils.vid_recorder.mediaContainerFormat + '. Please choose "default" option from the drop down and record again.');
	                    }
	                    else {
	                        alert('RecordRTC seems failed. Unexpected issue. You can read the email in your console log. \n\nPlease report using disqus chat below.');
	                    }

	                    if(vm.utils.vid_recorder.mediaContainerFormat !== 'vp9' && DetectRTC.browser.name === 'Chrome') {
	                        alert('Please record using VP9 encoder. (select from the dropdown)');
	                    }
	                }

	                var fileName = vm.utils.vid_recorder.getFileName(vm.utils.vid_recorder.fileExtension);

	                //MARK THE RECORDING AS FINISHED
	                vm.utils.recording_finished = true;

	                // document.querySelector('#save-to-disk').parentNode.style.display = 'block';
	                // document.querySelector('#save-to-disk').onclick = function() {
	                //     if(!recordRTC) return alert('No recording found.');

	                //     var file = new File([recordRTC.getBlob()], fileName, {
	                //         type: vm.utils.vid_recorder.mimeType
	                //     });

	                //     invokeSaveAsDialog(file, file.name);
	                // };

	                // document.querySelector('#open-new-tab').onclick = function() {
	                //     if(!recordRTC) return alert('No recording found.');

	                //     var file = new File([recordRTC.getBlob()], fileName, {
	                //         type: vm.utils.vid_recorder.mimeType
	                //     });

	                //     window.open(URL.createObjectURL(file));
	                // };

	                // upload to PHP server
	                // if(isMyOwnDomain()) {
	                //     document.querySelector('#upload-to-php').disabled = true;
	                //     document.querySelector('#upload-to-php').style.display = 'none';
	                // }
	                // else {
	                //     document.querySelector('#upload-to-php').disabled = false;
	                // }
	                
	                // document.querySelector('#upload-to-php').onclick = function() {
	                //     // if(isMyOwnDomain()) {
	                //     //     alert('PHP Upload is not available on this domain.');
	                //     //     return;
	                //     // }

	                //     if(!recordRTC) return alert('No recording found.');
	                //     this.disabled = true;

	                //     var button = this;
	                //     vm.utils.vid_recorder.uploadToPHPServer(fileName, recordRTC, function(progress, fileURL) {
	                //         if(progress === 'ended') {
	                //             button.disabled = false;
	                //             button.innerHTML = 'Click to download from server';
	                //             button.onclick = function() {
	                //                 vm.utils.vid_recorder.SaveFileURLToDisk(fileURL, fileName);
	                //             };

	                //             vm.utils.vid_recorder.setVideoURL(fileURL);

	                //             var html = 'Uploaded to PHP.<br>Download using below link:<br>';
	                //             html += '<a href="'+fileURL+'" download="'+fileName+'" style="color: yellow; display: block; margin-top: 15px;">'+fileName+'</a>';
	                //             vm.utils.vid_recorder.recordingPlayer.parentNode.parentNode.querySelector('h2').innerHTML = html;
	                //             return;
	                //         }
	                //         button.innerHTML = progress;
	                //         vm.utils.vid_recorder.recordingPlayer.parentNode.parentNode.querySelector('h2').innerHTML = progress;
	                //     });
	                // };
	            },
	            saveLocal: function(){
	            	var recordRTC = vm.utils.vid_recorder.btnStartRecording.recordRTC;

	            	if(!recordRTC){
	            		return alert('No recording found.');
	            	}

	            	var fileName = vm.utils.vid_recorder.getFileName(vm.utils.vid_recorder.fileExtension);

                    var file = new File([recordRTC.getBlob()], fileName, {
                        type: vm.utils.vid_recorder.mimeType
                    });

                    invokeSaveAsDialog(file, file.name);
	            },
	            openNewTab: function(){
	            	var recordRTC = vm.utils.vid_recorder.btnStartRecording.recordRTC;

	            	if(!recordRTC){
	            		return alert('No recording found.');
	            	}

	            	var fileName = vm.utils.vid_recorder.getFileName(vm.utils.vid_recorder.fileExtension);

                    var file = new File([recordRTC.getBlob()], fileName, {
                        type: vm.utils.vid_recorder.mimeType
                    });

                    window.open(URL.createObjectURL(file));
	            },
	            uploadToRiskMach: function(){
	            	var recordRTC = vm.utils.vid_recorder.btnStartRecording.recordRTC;

	            	if(!recordRTC.getBlob().size){
	                    var info = vm.utils.vid_recorder.getFailureReport();
	                    console.log('blob', recordRTC.getBlob());
	                    console.log('recordrtc instance', recordRTC);
	                    console.log('report', info);

	                    if(vm.utils.vid_recorder.mediaContainerFormat !== 'default') {
	                        alert('RecordRTC seems failed recording using ' + vm.utils.vid_recorder.mediaContainerFormat + '. Please choose "default" option from the drop down and record again.');
	                    }
	                    else {
	                        alert('RecordRTC seems failed. Unexpected issue. You can read the email in your console log. \n\nPlease report using disqus chat below.');
	                    }

	                    if(vm.utils.vid_recorder.mediaContainerFormat !== 'vp9' && DetectRTC.browser.name === 'Chrome') {
	                        alert('Please record using VP9 encoder. (select from the dropdown)');
	                    }
	                }

	                var fileName = vm.utils.vid_recorder.getFileName(vm.utils.vid_recorder.fileExtension);

                    var file = new File([recordRTC.getBlob()], fileName, {
                        type: vm.utils.vid_recorder.mimeType
                    });

                    var params = {
                    	file: file
                    };

                    $rootScope.$broadcast("videoRecorder::videoRecorded", params);

                    vm.utils.in_progress = false;
                    vm.utils.is_uploading = false;
					vm.utils.upload_complete = true;

					//CLEAR VIDEO PLAYBACK
					vm.utils.resetUpload();

                    //ADD FILE TO UPLOADER
     //                vm.utils.uploader.addFile(file, fileName);

					// console.log("FILES IN QUEUE");
     //                console.log(vm.utils.uploader.files);

     //                vm.utils.uploader.start();
     //                vm.utils.is_uploading = true;
     //                vm.utils.upload_complete = false;
	            },
	            uploadToPHPServer: function(fileName, recordRTC, callback){
	                var blob = recordRTC instanceof Blob ? recordRTC : recordRTC.getBlob();
	                
	                blob = new File([blob], vm.utils.vid_recorder.getFileName(vm.utils.vid_recorder.fileExtension), {
	                    type: vm.utils.vid_recorder.mimeType
	                });

	                // create FormData
	                var formData = new FormData();
	                formData.append('video-filename', fileName);
	                formData.append('video-blob', blob);

	                callback('Uploading recorded-file to server.');

	                // var upload_url = 'https://your-domain.com/files-uploader/';
	                var upload_url = 'RecordRTC-to-PHP/save.php';

	                // var upload_directory = upload_url;
	                var upload_directory = 'RecordRTC-to-PHP/uploads/';

	                vm.utils.vid_recorder.makeXMLHttpRequest(upload_url, formData, function(progress) {
	                    if (progress !== 'upload-ended') {
	                        callback(progress);
	                        return;
	                    }

	                    callback('ended', upload_directory + fileName);
	                });
	            },
	            makeXMLHttpRequest: function(url, data, callback){
	                var request = new XMLHttpRequest();
	                request.onreadystatechange = function() {
	                    if (request.readyState == 4 && request.status == 200) {
	                        if(request.responseText === 'success') {
	                            callback('upload-ended');
	                            return;
	                        }

	                        document.querySelector('.header').parentNode.style = 'text-align: left; color: red; padding: 5px 10px;';
	                        document.querySelector('.header').parentNode.innerHTML = request.responseText;
	                    }
	                };

	                request.upload.onloadstart = function() {
	                    callback('Upload started...');
	                };

	                request.upload.onprogress = function(event) {
	                    callback('Upload Progress ' + Math.round(event.loaded / event.total * 100) + "%");
	                };

	                request.upload.onload = function() {
	                    callback('progress-about-to-end');
	                };

	                request.upload.onload = function() {
	                    callback('Getting File URL..');
	                };

	                request.upload.onerror = function(error) {
	                    callback('Failed to upload to server');
	                };

	                request.upload.onabort = function(error) {
	                    callback('Upload aborted.');
	                };

	                request.open('POST', url);
	                request.send(data);
	            },
	            getRandomString: function(){
	                if (window.crypto && window.crypto.getRandomValues && navigator.userAgent.indexOf('Safari') === -1) {
	                    var a = window.crypto.getRandomValues(new Uint32Array(3)),
	                        token = '';
	                    for (var i = 0, l = a.length; i < l; i++) {
	                        token += a[i].toString(36);
	                    }
	                    return token;
	                } else {
	                    return (Math.random() * new Date().getTime()).toString(36).replace(/\./g, '');
	                }
	            },
	            getFileName: function(fileExtension) {
	                var d = new Date();
	                var year = d.getUTCFullYear();
	                var month = d.getUTCMonth();
	                var date = d.getUTCDate();
	                return 'RecordRTC-' + year + month + date + '-' + vm.utils.vid_recorder.getRandomString() + '.' + fileExtension;
	            },
	            SaveFileURLToDisk: function(fileUrl, fileName){
	                var hyperlink = document.createElement('a');
	                hyperlink.href = fileUrl;
	                hyperlink.target = '_blank';
	                hyperlink.download = fileName || fileUrl;

	                (document.body || document.documentElement).appendChild(hyperlink);
	                hyperlink.onclick = function() {
	                   (document.body || document.documentElement).removeChild(hyperlink);

	                   // required for Firefox
	                   window.URL.revokeObjectURL(hyperlink.href);
	                };

	                var mouseEvent = new MouseEvent('click', {
	                    view: window,
	                    bubbles: true,
	                    cancelable: true
	                });

	                hyperlink.dispatchEvent(mouseEvent);
	            },
	            getURL: function(arg){
	                var url = arg;

	                if(arg instanceof Blob || arg instanceof File) {
	                    url = URL.createObjectURL(arg);
	                }

	                if(arg instanceof RecordRTC || arg.getBlob) {
	                    url = URL.createObjectURL(arg.getBlob());
	                }

	                if(arg instanceof MediaStream || arg.getTracks) {
	                    // url = URL.createObjectURL(arg);
	                }

	                return url;
	            },
	            setVideoURL: function(arg, forceNonImage){
	                var url = vm.utils.vid_recorder.getURL(arg);

	                var parentNode = vm.utils.vid_recorder.recordingPlayer.parentNode;
	                parentNode.removeChild(vm.utils.vid_recorder.recordingPlayer);
	                parentNode.innerHTML = '';

	                var elem = 'video';
	            
	                if(vm.utils.vid_recorder.type == 'gif' && !forceNonImage){
	                    elem = 'img';
	                }

	                // if(vm.utils.vid_recorder.type == 'audio') {
	                //     elem = 'audio';
	                // }

	                if( vm.utils.vid_recorder.recordingMedia == 'record-audio' )
	                {
	                	elem = 'audio';
	                }

	                vm.utils.vid_recorder.recordingPlayer = document.createElement(elem);

	                if(arg instanceof MediaStream) {
	                    vm.utils.vid_recorder.recordingPlayer.muted = true;
	                }

	                vm.utils.vid_recorder.recordingPlayer.addEventListener('loadedmetadata', function() {
	                    if(navigator.userAgent.toLowerCase().indexOf('android') == -1) return;

	                    // android
	                    setTimeout(function() {
	                        if(typeof vm.utils.vid_recorder.recordingPlayer.play === 'function') {
	                            vm.utils.vid_recorder.recordingPlayer.play();
	                        }
	                    }, 2000);
	                }, false);

	                vm.utils.vid_recorder.recordingPlayer.poster = '';
	                vm.utils.vid_recorder.recordingPlayer.controls = true;

	                if(arg instanceof MediaStream) {
	                    vm.utils.vid_recorder.recordingPlayer.srcObject = arg;
	                }
	                else {
	                    vm.utils.vid_recorder.recordingPlayer.src = url;
	                }

	                if(typeof vm.utils.vid_recorder.recordingPlayer.play === 'function') {
	                    vm.utils.vid_recorder.recordingPlayer.play();
	                }

	                vm.utils.vid_recorder.recordingPlayer.addEventListener('ended', function() {
	                    url = vm.utils.vid_recorder.getURL(arg);
	                    
	                    if(arg instanceof MediaStream) {
	                        vm.utils.vid_recorder.recordingPlayer.srcObject = arg;
	                    }
	                    else {
	                        vm.utils.vid_recorder.recordingPlayer.src = url;
	                    }
	                });

	                parentNode.appendChild(vm.utils.vid_recorder.recordingPlayer);
	            },
	            captureScreen: function(config){

	                if (navigator.getDisplayMedia) {
	                    navigator.getDisplayMedia({
	                        video: true
	                    }).then(function(screenStream){

	                        config.onMediaCaptured(screenStream);

	                        vm.utils.vid_recorder.addStreamStopListener(screenStream, function() {
	                            // config.onMediaStopped();

	                            vm.utils.vid_recorder.btnStartRecording.onclick();
	                        });

	                        vm.utils.vid_recorder.setVideoURL(screenStream, true);
	                    }).catch(function(error) {
	                        config.onMediaCapturingFailed(error);
	                    });

	                } else if (navigator.mediaDevices.getDisplayMedia) {
	                    navigator.mediaDevices.getDisplayMedia({
	                        video: true
	                    }).then(function(screenStream){
	                        config.onMediaCaptured(screenStream);

	                        vm.utils.vid_recorder.addStreamStopListener(screenStream, function() {
	                            // config.onMediaStopped();

	                            // vm.utils.vid_recorder.btnStartRecording.onclick();
	                        });

	                        vm.utils.vid_recorder.setVideoURL(screenStream, true);
	                    }).catch(function(error) {
	                        config.onMediaCapturingFailed(error);
	                    });
	                } else {
	                    var error = 'getDisplayMedia API are not supported in this browser.';
	                    config.onMediaCapturingFailed(error);
	                    alert(error);
	                }
	            },
	            captureAudioPlusScreen: function(config){

	                if (navigator.getDisplayMedia){

	                    navigator.getDisplayMedia({
	                        video: true
	                    }).then(function(screenStream){
	                        navigator.mediaDevices.getUserMedia({audio:true}).then(function(mic) {
	                            screenStream.addTrack(mic.getTracks()[0]);

	                            config.onMediaCaptured(screenStream);

	                            vm.utils.vid_recorder.addStreamStopListener(screenStream, function() {
	                                // config.onMediaStopped();

	                                vm.utils.vid_recorder.btnStartRecording.onclick();
	                            });

	                            vm.utils.vid_recorder.setVideoURL(screenStream, true);
	                        });
	                    }).catch(function(error) {
	                        config.onMediaCapturingFailed(error);
	                    });

	                } else if (navigator.mediaDevices.getDisplayMedia){

	                    navigator.mediaDevices.getDisplayMedia({
	                        video: true
	                    }).then(function(screenStream){
	                        navigator.mediaDevices.getUserMedia({audio:true}).then(function(mic) {
	                            screenStream.addTrack(mic.getTracks()[0]);

	                            config.onMediaCaptured(screenStream);

	                            vm.utils.vid_recorder.addStreamStopListener(screenStream, function() {
	                                // config.onMediaStopped();

	                                // vm.utils.vid_recorder.btnStartRecording.onclick();
	                            });

	                            vm.utils.vid_recorder.setVideoURL(screenStream, true);
	                        });
	                    }).catch(function(error) {
	                        config.onMediaCapturingFailed(error);
	                    });

	                } else {
	                    var error = 'getDisplayMedia API are not supported in this browser.';
	                    config.onMediaCapturingFailed(error);
	                    alert(error);
	                }
	            }
			}
		};


		$scope.$on("$destroy", function(event, data){

			// setTimeout(function(){
			// 	// alert("Destroy Video Scope");
			// }, 0);

		});

		$scope.$on("videoRecorder::destroy", function(event, data){
			$scope.$destroy();
		});

		$scope.$on("videoRecorder::hide", function(){
			vm.utils.hidden = true;
		});

		$scope.$on("videoRecorder::startRecording", function(event, data){
			
			if( vm.utils.in_progress == true )
			{
				alert("A recording is currently in progress. Please finish the current recording first.");
				return;
			}

			console.log("RECIEVED VIDEO OPTIONS DATA");
			console.log(data);

			$rootScope.$broadcast("draggable::reset");
			vm.utils.options = data;

			console.log("VIDEO RECORDER OPTIONS");
			console.log(data);

			vm.utils.resetUpload();
			vm.utils.minimised = false;
			vm.utils.hidden = false;

		});

		vm.initSettings = function()
		{
			if( vm.utils.options.mode == 'audio-screen' )
			{
				vm.utils.vid_recorder.recordingMedia = 'record-audio-plus-screen';
				vm.utils.vid_recorder.mediaContainerFormat = 'mkv';
				vm.utils.vid_recorder.selectedResolution = 'default';
				vm.utils.vid_recorder.selectedFramerate = 30;
				vm.utils.vid_recorder.videoBitsPerSecond = 800000;
			}

			if( vm.utils.options.mode == 'screen' )
			{
				vm.utils.vid_recorder.recordingMedia = 'record-screen';
				vm.utils.vid_recorder.mediaContainerFormat = 'mkv';
				vm.utils.vid_recorder.selectedResolution = 'default';
				vm.utils.vid_recorder.selectedFramerate = 30;
				vm.utils.vid_recorder.videoBitsPerSecond = 800000;
			}

			if( vm.utils.options.mode == 'audio' )
			{
				vm.utils.vid_recorder.recordingMedia = 'record-audio';
				vm.utils.vid_recorder.mediaContainerFormat = 'default';
				vm.utils.vid_recorder.selectedResolution = 'default';
				vm.utils.vid_recorder.selectedFramerate = 'default';
				vm.utils.vid_recorder.videoBitsPerSecond = 'default';
			}

			if( vm.utils.options.mode == 'webcam-audio' )
			{
				vm.utils.vid_recorder.recordingMedia = 'record-audio-plus-video';
				vm.utils.vid_recorder.mediaContainerFormat = 'mkv';
				vm.utils.vid_recorder.selectedResolution = 'default';
				vm.utils.vid_recorder.selectedFramerate = 30;
				vm.utils.vid_recorder.videoBitsPerSecond = 800000;
			}
		}

		// vm.utils.vid_recorder.setGetFromLocalStorage(['.media-resolutions', '.media-framerates', '.media-bitrates', '.recording-media', '.media-container-format']);
	
		vm.toggleMinimised = function()
		{
			vm.utils.minimised = !vm.utils.minimised;
		}

		vm.minimise = function()
		{
			vm.utils.minimised = true;
		}

		vm.maximise = function()
		{
			vm.utils.minimised = false;
		}

		vm.toggleShow = function()
		{
			if( !vm.utils.hidden && vm.utils.in_progress )
			{
				return;
			}

			vm.utils.hidden = !vm.utils.hidden;

			if( vm.utils.hidden )
			{
				vm.utils.resetUpload();

				setTimeout(function(){
					$rootScope.$broadcast("videoRecorder::exit");
					$scope.$apply();
				}, 0);
			}
		}

		vm.show = function()
		{
			vm.utils.hidden = false;
		}

		vm.hide = function()
		{
			vm.utils.hidden = true;
			$rootScope.$broadcast("videoRecorder::exit");
		}

		// vm.utils.uploader = new plupload.Uploader({
		// 	runtimes : 'html5,flash,silverlight,html4',
		//     browse_button : 'pickfiles',
		//     container: document.getElementById('container'),
		//     url : "../laravel/public/rms/v1/PlupVideoUpload",
		//     chunk_size: '200kb',
  //   		max_retries: 999,
		//     filters : {
		//     	prevent_duplicates: true,
		//     	max_file_size : '2gb',
		//     	// mime_types: [
		//     	// 	{title : "Image files", extensions : "jpg,gif,png"},
		//     	// 	{title : "Zip files", extensions : "zip"}
		//     	// ]
		//     },
		//     flash_swf_url : '/plupload/js/Moxie.swf',
		//     silverlight_xap_url : '/plupload/js/Moxie.xap',
		//     headers: {
		//     	Authorization: 'Bearer ' +  localStorage.getItem('rm_wa_token'),
		//     },
		//     init: {
		//     	PostInit: function(){
		//     		document.getElementById('filelist').innerHTML = '';

		//     		document.getElementById('uploadfiles').onclick = function() {
		//     			vm.utils.uploader.start();
		//     			return false;
		//     		};
		//     	},
		//     	BeforeUpload: function(up, file){
		//     		var params = {};
		// 			params.file_id = file.id;
		// 			params.Ref = null;
		// 			params.IsAudio = 'No';

		// 			if( vm.utils.options.mode == 'audio' )
		// 			{
		// 				params.IsAudio = 'Yes';
		// 			}

		// 			// $.extend( params, vm.utils.file_meta[file.id] );

		// 			console.log("PARAMS");
		// 			console.log(params);

		// 			vm.utils.uploader.setOption('multipart_params', params);
		//     	},
		//     	UploadComplete: function(up, files){
		    		
		//     	},
		//     	FilesAdded: function(up, files) {
		//     		plupload.each(files, function(file) {
		//     			document.getElementById('filelist').innerHTML = '<div id="' + file.id + '" class="text-center" style="font-size: 2em;"></div>';
		//     		});
		//     	},
		//     	FileUploaded: function(up, file, result){

		//     		vm.utils.uploader.files.forEach(function(file, index){
		//     			vm.utils.uploader.removeFile(file);
		//     		});

		//     		vm.utils.is_uploading = false;
		//     		vm.utils.upload_complete = true;
		//     		vm.utils.in_progress = false;

		//     		// alert("File Uploaded!");
		//     		// console.log("File Uploaded!");
		//     		// console.log(result);

		//     		var response = JSON.parse(result.response);

		//     		var params = {
		//     			directive_id: vm.utils.options.directive_id,
		//     			file_record: response.video_record
		//     		};

		//     		$rootScope.$broadcast("videoRecorder::fileUploaded", params);

		//     	},
		//     	UploadProgress: function(up, file) {
		//     		document.getElementById(file.id).innerHTML = '<span>' + file.percent + "%</span>";
		//     	},
		//     	Error: function(up, err) {
		//     		vm.utils.is_uploading = false;
		//     		document.getElementById('console').innerHTML += "\nError #" + err.code + ": " + err.message;
		//     	}
		//     }
		// });
		 
		// vm.utils.uploader.init();
		vm.utils.vid_recorder.getDevices();
		vm.utils.vid_recorder.init();
	}

	function videoFactory($q, $rootScope, $http, rmConnectivityFactory) 
	{
		var factory = {};

		factory.utils = {};

		factory.requests = {
			playlists: function(playlist_id) {
				var defer = $q.defer();

				if( !rmConnectivityFactory.online_detection.online ) {
					defer.reject("No internet connection");
					return defer.promise;
				}

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/Playlists',{
	            	params: {
	            		filters: {
	            			playlist_id: playlist_id, 
	            			status: null, 
	            			general_search: null,
	            			order_by: null, 
	            			sort_by: null
	            		}
	            	}
	            })
				.success(function(data, status, headers, config) {

					console.log("REQUEST PLAYLISTS RESPONSE");
					console.log(data);

					if( data.error ) {
						defer.reject(data.error_messages[0]);
						return defer.promise;
					}

					defer.resolve(data.playlists);

	            })
	            .error(function(data, status, headers, config) {
	            	console.log(data);
	            	defer.reject("Error connecting to API for video playlists");
				});

				return defer.promise;
			},
			playlistVideos: function(playlist_id) {
				var defer = $q.defer();

				console.log("PLAYLIST ID");
				console.log(playlist_id);

				if( !rmConnectivityFactory.online_detection.online ) {
					defer.reject("No internet connection");
					return defer.promise;
				}

				$http.get('https://system.riskmach.co.uk/laravel/public/webapp/v1/PlaylistItems',{
            		params: {
            			playlist_id: playlist_id,
            			filters: {
	            			playlist_id: null, 
	            			item_id: null
	            		}
            		}
	            })
				.success(function(data, status, headers, config) {

					console.log("REQUEST PLAYLIST VIDEOS RESPONSE");
					console.log(data);

					if( data.error ) {
						defer.reject(data.error_messages[0]);
						return defer.promise;
					}

					defer.resolve(data.items);

	            })
	            .error(function(data, status, headers, config) {
	            	console.log(data);
	            	defer.reject("Error connecting to API for playlist's videos");
				});

				return defer.promise;
			}
		};

		return factory;
	}

	function videoRecorder()
    {
    	var directive = {};

        directive.scope = {};

        directive.restrict = 'A';
        directive.controller = 'recordVideoController';
        directive.controllerAs = 'vm';
        directive.bindToController = true;
        directive.templateUrl = '../rm-utils/videos/tpl/video_recorder.html';
        directive.replace = false;

        return directive;
    }

    function isolatedVideoPlayer()
	{
		var directive = {};

		directive.scope = {
			directiveid: '=',
			mediaid: '='
		};

		directive.restrict = 'A';
		directive.templateUrl = '../rm-utils/videos/tpl/isolated_video_player.html';
		directive.controller = 'videoPlayerController';
		directive.controllerAs = 'vm';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

	function onlineVideoPlayer() 
	{
		var directive = {};

		directive.scope = {
			directiveid: '=',
			videoref: '='
		};

		directive.restrict = 'A';
		directive.controller = 'onlineVideoPlayerController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/videos/tpl/online_video_player.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

	function onlineVideoPlaylist() 
	{
		var directive = {};

		directive.scope = {
			directiveid: '='
		}

		directive.restrict = 'A';
		directive.controller = 'onlineVideoPlaylistController';
		directive.controllerAs = 'vm';
		directive.templateUrl = '../rm-utils/videos/tpl/online_video_playlist.html';
		directive.bindToController = true;
		directive.replace = false;

		return directive;
	}

	function secondsToDateTime(seconds) 
	{
		return new Date(1970, 0, 1).setSeconds(seconds);
	}

})();