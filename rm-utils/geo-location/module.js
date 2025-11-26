(function() {

	var app = angular.module('riskmachGeoLocation', []);
	app.factory('geoLocationFactory', geoLocationFactory);

	function geoLocationFactory($q, $window) 
	{
		var factory = {};

		factory.utils = {
			cloneAsObject: function(obj) {

				if (obj === null || !(obj instanceof Object)) {
			        return obj;
			    }

			    var temp = (obj instanceof Array) ? [] : {};

			    // ReSharper disable once MissingHasOwnPropertyInForeach
			    for (var key in obj) {
			        temp[key] = factory.utils.cloneAsObject(obj[key]);
			    }

			    return temp;
			}
		}

		factory.geoLocationEnabled = function() 
		{
			if( $window.navigator.geolocation ) {
				return true;
			} else {
				return false;
			}
		}

		factory.getCurrentGeoLocation = function() 
		{
			var defer = $q.defer();

			// WHEN REMOVE TEST ACCESS, REMOVE AUTHFACTORY AND UTILS DEPENDENCY
			var test_access_emails = [
				'e.jones@spierssafety.co.uk',
				'elliott_wfc@live.co.uk',
				'a.ginn@riskmach.co.uk',
				'a.thomas@spierssafety.co.uk',
				'w.spiers@spierssafety.co.uk'
			];

			var data = {
				coords_data: null,
				attempt_date: null,
				error_message: null
			}

			// TEST ACCESS
			// var email = authFactory.active_profile.EmailAddress;
			// if( test_access_emails.indexOf(email) === -1 ) {
			// 	data.attempt_date = new Date().getTime();
			// 	data.error_message = 'Does not have test access';

			// 	defer.resolve(data);

			// 	return defer.promise;
			// }

			// IF GEO LOCATION NOT ENABLED IN BROWSER
			if( !factory.geoLocationEnabled() ) {
				data.attempt_date = new Date().getTime();
				data.error_message = "You have not enabled Geolocation";
				
				defer.resolve(data);

				return defer.promise;
			}

			// SET GEO OPTIONS
			var geo_options = {
				enableHighAccuracy: true,
				timeout: 10000 // 10 SECONDS
			}

			// SUCCESS FUNCTION
			function geoPosition(position) {

				console.log(position);

				data.coords_data = factory.utils.cloneAsObject(position);

				data.attempt_date = position.timestamp;

				defer.resolve(data);
			}

			// ERROR FUNCTION
			function geoError(error) {

				switch(error.code) {
				    case error.PERMISSION_DENIED:
				    	data.error_message = "User denied the request for Geolocation."
				     	break;
				    case error.POSITION_UNAVAILABLE:
				    	data.error_message = "Location information is unavailable."
				     	break;
				    case error.TIMEOUT:
				      	data.error_message = "The request to get user location timed out."
				      	break;
				    case error.UNKNOWN_ERROR:
				      	data.error_message = "An unknown error occurred."
				      	break;
			  	}

			  	data.attempt_date = new Date().getTime();

			  	defer.resolve(data);
			}

			// ATTEMPT TO GET GEO LOCATION
			$window.navigator.geolocation.getCurrentPosition(geoPosition, geoError, geo_options);

			return defer.promise;
		}

		factory.attemptTriggerLocationPermission = function() 
		{
			var defer = $q.defer();

			// IF GEO LOCATION NOT ENABLED IN BROWSER
			if( !factory.geoLocationEnabled() ) {
				defer.reject("Permission denied");
				return defer.promise;
			}

			// SET GEO OPTIONS
			var geo_options = {
				enableHighAccuracy: false,
				timeout: 10000 // 10 SECONDS
			}

			// SUCCESS FUNCTION
			function geoPosition(position) {

				console.log(position);
				var data = {
					coords_data: factory.utils.cloneAsObject(position),
					attempt_date: position.timestamp
				}

				defer.resolve(data);
			}

			// ERROR FUNCTION
			function geoError(error) {

				// DEFAULT MESSAGE
				var error = false;
				var error_message = "Permission denied";

				switch(error.code) {
				    case error.PERMISSION_DENIED:
				    	// ERROR AS PERMISSION DENIED
				    	error = true;
				    	error_message = "Permission denied";
				     	break;
				    case error.POSITION_UNAVAILABLE:
				   		// NOT ERROR AS PERMISSION ENABLED, POSITION ERROR
				    	error = false;
				    	error_message = "Location information is unavailable.";
				     	break;
				    case error.TIMEOUT:
				    	// NOT ERROR AS PERMISSION ENABLED, TIMEOUT ERROR
				    	error = false;
				      	error_message = "The request to get user location timed out.";
				      	break;
				    case error.UNKNOWN_ERROR:
				    	// NOT ERROR AS PERMISSION ENABLED, UNKNOWN ERROR
				    	error = false;
				      	error_message = "An unknown error occurred.";
				      	break;
			  	}

				if( error ) {
					defer.reject(error_message);
				} else {
					defer.resolve();
				}
			}

			// ATTEMPT TO GET GEO LOCATION
			$window.navigator.geolocation.getCurrentPosition(geoPosition, geoError, geo_options);

			return defer.promise;
		}

		return factory;
	}

})()