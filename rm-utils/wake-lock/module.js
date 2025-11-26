(function() {

	var app = angular.module('riskmachWakeLock', []);
	app.factory('wakeLockFactory', wakeLockFactory);

	function wakeLockFactory($q) 
	{
		var factory = {};

		factory.wake_lock = {
			enabled: false,
			wakeLock: null,
			wakeLockSupported: function() {
				var supported = false;

				if( "wakeLock" in navigator ) {
					supported = true;
				}

				console.log("WAKE LOCK SUPPORTED: " + supported);

				return supported;
			},
			enable: function() {
				var defer = $q.defer();

				if( !factory.wake_lock.wakeLockSupported() ) {
					factory.wake_lock.enabled = false;
					factory.wake_lock.wakeLock = null;
					defer.reject("Wake Lock not supported");
					return defer.promise;
				}

				return navigator.wakeLock.request("screen").then(function(wakeLock) {

		        	factory.wake_lock.wakeLock = wakeLock;
		        	factory.wake_lock.enabled = true;
		        	console.log("ENABLED WAKE LOCK!");

		        	// factory.wake_lock.wakeLock.addEventListener("release", function () {
			        //     // ToDo: Potentially emit an event for the page to observe since
			        //     // Wake Lock releases happen when page visibility changes.
			        //     // (https://web.dev/wakelock/#wake-lock-lifecycle)
			        //     console.log("Wake Lock released.");
		        	// });

		        	defer.resolve();

		        }).catch(function(error) {
		        	factory.wake_lock.enabled = false;
		        	factory.wake_lock.wakeLock = null;
		        	console.log(error);
		        	defer.reject(error);
		        });

				return defer.promise;
			},
			disable: function() {
				var defer = $q.defer();

				// WAKE LOCK ALREADY RELEASED
				if( !factory.wake_lock.wakeLock ) {
					defer.resolve();
					return defer.promise;
				}

				factory.wake_lock.wakeLock.release().then(function() {

					console.log("WAKE LOCK DISBALED!");

					factory.wake_lock.enabled = false;
					factory.wake_lock.wakeLock = null;
					defer.resolve();
				});

				return defer.promise;
			},
			init: function() {

				setTimeout(function() {

					var handleVisibilityChange = function handleVisibilityChange() {
				        if (factory.wake_lock.wakeLock !== null && document.visibilityState === "visible") {
				        	factory.wake_lock.enable();
				        }
				    };
				    
				    document.addEventListener("visibilitychange", handleVisibilityChange);
				    document.addEventListener("fullscreenchange", handleVisibilityChange);

				}, 0);

			}()
		}

		return factory;
	}

})()