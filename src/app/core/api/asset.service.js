(function() {
	'use strict';

	angular.module('app.components')
	  .factory('asset', asset);

    asset.$inject = ['assetsAPI', '$window', 'timeUtils', '$filter', '$q'];
	  function asset(assetsAPI, $window, timeUtils, $filter, $q) {

      var worldMarkers, assets, assetsPrevious, worldClusters;

      initialize();

	  	var service = {
        getAllEntities: getAllEntities,
        setAllEntities: setAllEntities,
        getAllClusters: getAllClusters,
        setAllClusters: setAllClusters,
				getMetadata: getMetadata,
        getAsset: getAsset,
        createAsset: createAsset,
        updateAsset: updateAsset,
        getWorldMarkers: getWorldMarkers,
        setWorldMarkers: setWorldMarkers,
				getClusterGeoJSON: getClusterGeoJSON,
        getGeoJSON: getGeoJSON,
        getGeoJSONSite: getGeoJSONSite
	  	};

	  	return service;

	  	//////////////////////////

      function initialize() {
        if(areMarkersOld()) {
          removeMarkers();
        }
      }


      function setAllEntities(data) {
        var obj = {
          timestamp: new Date(),
          data: data
        };
        removeEntitiesMarkers();
        $window.localStorage.setItem('organicity.assets', JSON.stringify(obj));
        assets = obj.data;
				return assets;
      }

      function setAllClusters(data) {
        worldClusters = data;
      }

      function getAllClusters() {
        return (worldClusters) ? worldClusters : false;
      }

      function setPrevAllEntities() {
        assetsPrevious = assets;
      }

      function getPrevAllEntities() {
        var deferred = $q.defer();
        deferred.resolve(assetsPrevious);
        return deferred.promise;
      }

      function getAllEntities() {
          console.log('Data expired: Refreshing assets');
          return assetsAPI.one('assets').get({'page': '1', 'per': '100'});
      }

			function getMetadata(query) {
				return assetsAPI.one('assets/metadata/search').get({'page': '1', 'per': '20', 'query': query});
			}

			function getGeoJSONSite(site) {
				var endpoint = 'assets/sites/' + site + '/geo';
        return assetsAPI.one(endpoint).get();
			}

			function getGeoJSON(params) {
				var endpoint = 'assets/geo/search';
				return  assetsAPI.one(endpoint).get(params);
			}

      function getClusterGeoJSON() {

            /* 

            This implementation is completly temporary to support first
            Open Call while the cluster service on the Asset Discovery Backend 
            is finalized.

            */

					var devices = [];

					var locations = [
            ['43.45487000', '-3.81289000', 'Santander'],  // Santander
            ['51.50722200', '-0.12750000', 'London'],     // London
            ['56.15720000', '10.21070000', 'Aarhus'],     // Aarhus
            ['38.25000000', '21.73333300', 'Patras'],     // Patras
            ['55.953252', '-3.188267', 'Edinburgh'],  // Edinburgh
            ['50.879844', '4.700518', 'Leuven'],     // Leuven
            ['38.722252', '-9.139337', 'Lisbon'],     // Lisbon
            ['45.267135', '19.833550', 'NoviSad'],    // Novisad
            ['46.362274', '15.110658', 'Velenje']         // Velenje
					];

					//for(var i = 0; i < 4; i++) {
        for(var i = 0; i < locations.length; i++) {
						var endpoint = 'assets/geo/zoom/1';
						var params = {lat: locations[i][0],  long: locations[i][1]};

				    var devs = assetsAPI.one(endpoint).get(params);
						devices.push(devs);
					}

					var data = $q.all(devices).then(function(devices) {
						return '{ "type": "FeatureCollection", "properties": { "name": "urn:oc:assettype:clusters"}, "features": [' + getGeoDevices(devices) + ']}';
					});
					return data;
      }

			function getGeoDevices(devices) {
				return devices.map(getGeoData);
			}

			function getGeoData(elem) {
				return '{ "type": "' + elem.type + '", "geometry":' + JSON.stringify(elem.geometry) + ', "properties":' + JSON.stringify(elem.properties) + '}';
			}

      function getEntitiesMarkers(location) {
        var parameter = '';
        parameter += location.lat + ',' + location.lng;
        return assetsAPI.all('assets').getList({'page': '1', 'per': '100'});
      }

      function getAsset(id) {
				var endpoint = 'assets/' + id;
        return assetsAPI.one(endpoint).get({});
      }

      function createAsset(data) {
        return assetsAPI.all('assets').post(data);
      }

      function updateAsset(id, data) {
        return assetsAPI.one('assets', id).patch(data);
      }

      function getWorldMarkers() {
        console.log('Data is cached: Markers are less than 60sec old.');
        return worldMarkers || ($window.localStorage.getItem('organicity.markers') && JSON.parse($window.localStorage.getItem('organicity.markers') ).data);
      }

      function setWorldMarkers(data) {
        var obj = {
          timestamp: new Date(),
          data: data
        };

        $window.localStorage.setItem('organicity.markers', JSON.stringify(obj) );
        worldMarkers = obj.data;
      }

      function getEntitiesTimeStamp() {
        return ($window.localStorage.getItem('organicity.assets') && JSON.parse($window.localStorage.getItem('organicity.assets') ).timestamp);
      }

      function areEntitiesMarkersOld() {
        var markersDate = getEntitiesTimeStamp();
        return !timeUtils.isWithin(60, 'seconds', markersDate);
      }

      function removeEntitiesMarkers() {
        $window.localStorage.removeItem('organicity.assets');
      }

      function getTimeStamp() {
        return ($window.localStorage.getItem('organicity.markers') && JSON.parse($window.localStorage.getItem('organicity.markers') ).timestamp);
      }

      function areMarkersOld() {
        var markersDate = getTimeStamp();
        return !timeUtils.isWithin(60, 'seconds', markersDate);
      }

      function removeMarkers() {
        $window.localStorage.removeItem('organicity.markers');
      }
	  }
})();
