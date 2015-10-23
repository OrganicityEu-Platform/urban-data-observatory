(function() {
  'use strict';

  angular.module('app.components')
    .factory('sensor', sensor);

    sensor.$inject = ['Restangular', 'utils', 'sensorUtils'];
    function sensor(Restangular, utils, sensorUtils) {
      // var sensorTypes;
      // callAPI().then(function(data) { //temp. disable for test
        setTypes([]);
      // });

      var service = {
        callAPI: callAPI,
        setTypes: setTypes,
        getTypes: getTypes,
        getSensorsDataNew: getSensorsDataNew
      };
      return service;

      ////////////////

      function callAPI() {
        return Restangular.all('sensors').getList();
      }

      function setTypes(sensorTypes) {
        sensorTypes = sensorTypes;
      }

      function getTypes() {
        return sensorTypes;
      }

      function getSensorsDataNew(deviceID, sensorID, dateFrom, dateTo) {
        var rollup = sensorUtils.getRollup(dateFrom, dateTo);
        dateFrom = utils.convertTime(dateFrom);
        dateTo = utils.convertTime(dateTo);

        return Restangular.one('devices', deviceID).customGET('readings', {'from': dateFrom, 'to': dateTo, 'rollup': rollup, 'sensor_id': sensorID, 'all_intervals': true});
      }
    }
})();
