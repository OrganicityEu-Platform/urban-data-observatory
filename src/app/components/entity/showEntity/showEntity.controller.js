(function() {
  'use strict';

  angular.module('app.components')
    .controller('entityController', entityController);

    entityController.$inject = ['$state','$scope', '$stateParams', 'entityData',
      // 'ownerEntitites',
      'utils', 'sensor', '$mdDialog',
      // 'belongsToUser',
      'timeUtils', 'animation', '$location', 'auth', 'entityUtils', 'userUtils',
      '$timeout', 'mainSensors', 'compareSensors', 'alert', '$q', 'asset', 'HasSensorEntity', 'geolocation', 'annotation', 'socialSharing'];

    function entityController($state, $scope, $stateParams, entityData,
      // ownerEntitites,
      utils, sensor, $mdDialog,
      // belongsToUser,
      timeUtils, animation, $location, auth, entityUtils, userUtils,
      $timeout, mainSensors, compareSensors, alert, $q, asset, HasSensorEntity, geolocation, annotation, socialSharing) {

      var vm = this;
      var sensorsData = [];

      var mainSensorID, compareSensorID;
      var picker = initializePicker();

      if(entityData){
        animation.entityLoaded({lat: entityData.latitude ,lng: entityData.longitude, id: $stateParams.id });
      }

      vm.hasHistorical = false;

      // TODO: This can be undefined
      vm.entity = entityData;
      vm.geolocate = geolocate;

      vm.isAuth = auth.isAuth();

      vm.twitter = socialSharing.twitter;
      vm.facebook = socialSharing.facebook;
      vm.email = socialSharing.email;
      vm.copyUrl = socialSharing.copyUrl;

      vm.snippetOptions = {
          lineWrapping: false,
          lineNumbers: true,
          mode: 'json',
      };

      // vm.ownerEntitites = ownerEntitites;
      // vm.entityBelongsToUser = belongsToUser;
      vm.removeUser = removeUser;

      vm.sensors = mainSensors ? mainSensors : undefined;
      vm.sensorsToCompare = compareSensors;

      vm.slide = slide;

      vm.selectedSensor = (vm.sensors && vm.sensors.length > 0) ? vm.sensors[0].uuid : undefined;
      vm.selectedSensorData = {};

      vm.selectedSensorToCompare = undefined;
      vm.selectedSensorToCompareData = {};

      vm.showSensorOnChart = showSensorOnChart;
      vm.moveChart = moveChart;
      vm.chartAvailable = vm.entity && vm.entity.dataSourceURL ? true : false;
      vm.loadingChart = vm.chartAvailable ? true : false;

      if (vm.chartAvailable) {

        // event listener on change of value of main sensor selector
        $scope.$watch('vm.selectedSensor', function(newVal, oldVal) {
          vm.selectedSensorToCompare = undefined;
          vm.selectedSensorToCompareData = {};
          vm.chartDataCompare = [];
          compareSensorID = undefined;

          if(vm.sensors){
            vm.sensors.forEach(function(sensor) {
              if(sensor.uuid === newVal) {
                _.extend(vm.selectedSensorData, sensor);
              }
            });
          }

          vm.sensorsToCompare = getSensorsToCompare();

          $timeout(function() {
            colorClock();
            colorSensorMainIcon();
            colorSensorCompareName();

            setSensor({type: 'main', value: newVal});
            if (picker){
              changeChart([mainSensorID]);
            }
          }, 100);

        });

        // event listener on change of value of compare sensor selector
        $scope.$watch('vm.selectedSensorToCompare', function(newVal, oldVal) {
          vm.sensorsToCompare.forEach(function(sensor) {
            if(sensor.uuid === newVal) {
              _.extend(vm.selectedSensorToCompareData, sensor);
            }
          });

          $timeout(function() {
            colorSensorCompareName();
            setSensor({type: 'compare', value: newVal});

            if(oldVal === undefined && newVal === undefined) {
              return;
            }
            changeChart([compareSensorID]);
          }, 100);

        });

        $scope.$on('hideChartSpinner', function() {
          vm.loadingChart = false;
        });

      }

      ///////////////

      function removeUser() {
      }

      function showSensorOnChart(sensorID) {
        vm.selectedSensor = sensorID;
      }

      function slide(direction) {
        var slideContainer = angular.element('.sensors_container');
        var scrollPosition = slideContainer.scrollLeft();
        var slideStep = 20;

        if(direction === 'left') {
          slideContainer.scrollLeft(scrollPosition + slideStep);
        } else if(direction === 'right') {
          slideContainer.scrollLeft(scrollPosition - slideStep);
        }
      }

      function getSensorsToCompare() {
        return vm.sensors ? vm.sensors.filter(function(sensor) {
          return sensor.uuid !== vm.selectedSensor;
        }) : [];
      }

      function changeChart(sensorsID, options) {

        if(!sensorsID[0]) {
          return;
        }

        if(!options) {
          options = {};
        }
        options.from = options && options.from || picker.getValuePickerFrom();
        options.to = options && options.to || picker.getValuePickerTo();

        //show spinner
        vm.loadingChart = true;
        //grab chart data and save it
        // it can be either 2 sensors or 1 sensor, so we use $q.all to wait for all
       $q.all(
          _.map(sensorsID, function(sensorID) {
            var chartData = getChartData(vm.entity.dataSourceURL, vm.entity.uuid, sensorID, options.from, options.to)
            if(chartData) {
              return chartData
              .then(function(data) {
                return data.data;
              });
            }
          })
        ).then(function() {
          // after all sensors resolve, prepare data and attach it to scope
          // the variable on the scope will pass the data to the chart directive
          vm.chartDataMain = prepareChartData([mainSensorID, compareSensorID]);
        });
      }
      // calls api to get sensor data and saves it to sensorsData array
      function getChartData(dataSourceURL, entityID, sensorID, dateFrom, dateTo, options) {
        var sensorsHistoricalData = sensor.getSensorsData(dataSourceURL, entityID, sensorID, dateFrom, dateTo);
        if(sensorsHistoricalData) {
          return sensorsHistoricalData
          .then(function(data) {
            if (data && data.data && data.data.readings && data.data.readings.length) {
              sensorsData[sensorID] = data.data;
              return data;
            } else {
              sensorsData[sensorID] = [];
              return false;
            }
          }, function(data) {
            sensorsData[sensorID] = [];
            return false;
          });
        }
      }

      function prepareChartData(sensorsID) {
        var compareSensor;
        var parsedDataMain = parseSensorData(sensorsData, sensorsID[0]);
        if(parsedDataMain && parsedDataMain.length) {
          vm.hasHistorical = true;
          var mainSensor = {
            data: parsedDataMain,
            color: vm.selectedSensorData.color,
            unit: vm.selectedSensorData.unit
          };
          if(sensorsID[1] && sensorsID[1] !== -1) {
            var parsedDataCompare = parseSensorData(sensorsData, sensorsID[1]);
            compareSensor = {
              data: parsedDataCompare,
              color: vm.selectedSensorToCompareData.color,
              unit: vm.selectedSensorToCompareData.unit
            };
          }
          var newChartData = [mainSensor, compareSensor];
          return newChartData;
        } else {
          vm.loadingChart = false;
          vm.hasHistorical = false;
          return false;
        }
      }

      function parseSensorData(data, sensorID) {
        if((typeof data[sensorID] === 'undefined') || (data[sensorID].length === 0)) {
          return [];
        }
        return data[sensorID].readings.map(function(dataPoint) {
          var time = moment(new Date(dataPoint.recvTime)).format('YYYY-MM-DD[T]HH:mm:ss[Z]'); //tmp. ensure validation
          var value = Number(dataPoint.attrValue);
          var count = value === null ? 0 : value;

          return {
            time: time,
            count: count,
            value: value
          };
        });
      }

      function setSensor(options) {
        var sensorID = options.value;
        if(sensorID === undefined) {
          return;
        }
        if(options.type === 'main') {
          mainSensorID = sensorID;
        } else if(options.type === 'compare') {
          compareSensorID = sensorID;
        }
      }

      function colorSensorMainIcon() {
        var svgContainer = angular.element('.sensor_icon_selected');
        var parent = svgContainer.find('.container_parent');
        parent.css('fill', vm.selectedSensorData.color);
      }

      function colorSensorCompareName() {
        var name = angular.element('.sensor_compare').find('md-select-label').find('span');
        name.css('color', vm.selectedSensorToCompareData.color || 'white');
        var icon = angular.element('.sensor_compare').find('md-select-label').find('.md-select-icon');
        icon.css('color', 'white');
      }

      function colorArrows() {
        var svgContainer;

        svgContainer = angular.element('.chart_move_left').find('svg');
        svgContainer.find('.fill_container').css('fill', '#03252D');

        svgContainer = angular.element('.chart_move_right').find('svg');
        svgContainer.find('.fill_container').css('fill', '#4E656B');
      }

      function colorClock() {
        var svgContainer = angular.element('.entity_time_icon');
        svgContainer.find('.stroke_container').css({'stroke-width': '0.5px', 'stroke':'#A4B0B3'});
        svgContainer.find('.fill_container').css('fill', '#A4B0B3');
      }

      function getSecondsFromDate(date) {
        return (new Date(date)).getTime();
      }

      function getCurrentRange() {
        return getSecondsFromDate( picker.getValuePickerTo() ) - getSecondsFromDate( picker.getValuePickerFrom() );
      }

      function moveChart(direction) {
        var valueTo, valueFrom;
        //grab current date range
        var currentRange = getCurrentRange();

        if(direction === 'left') {
          //set both from and to pickers to prev range
          valueTo = picker.getValuePickerFrom();
          valueFrom = getSecondsFromDate( picker.getValuePickerFrom() ) - currentRange;
          picker.setValuePickers([valueFrom, valueTo]);
        } else if(direction === 'right') {
          var today = timeUtils.getToday();
          var currentValueTo = picker.getValuePickerTo();
          if( timeUtils.isSameDay(today, currentValueTo) ) {
            return;
          }

          //set both from and to pickers  to next range
          valueFrom = picker.getValuePickerTo();
          valueTo = getSecondsFromDate( picker.getValuePickerTo() ) + currentRange;
          picker.setValuePickers([valueFrom, valueTo]);
        }
      }

      //hide everything but the functions to interact with the pickers
      function initializePicker() {
        var updateType = 'single'; //set update type to single by default

        /*jshint camelcase: false*/
        var from_$input = angular.element('#picker_from').pickadate({
          onOpen: function(){
            ga('send', 'event', 'entity Chart', 'click', 'Date Picker');
          },
          onClose: function(){
            angular.element(document.activeElement).blur();
          },
          container: 'body',
          klass: {
            holder: 'picker__holder picker_container'
          }
        });
        var from_picker = from_$input.pickadate('picker');

        var to_$input = angular.element('#picker_to').pickadate({
          onOpen: function(){
            ga('send', 'event', 'entity Chart', 'click', 'Date Picker');
          },
          onClose: function(){
            angular.element(document.activeElement).blur();
          },
          container: 'body',
          klass: {
            holder: 'picker__holder picker_container'
          }
        });
        var to_picker = to_$input.pickadate('picker');

        if( from_picker.get('value') ) {
          to_picker.set('min', from_picker.get('select') );
        }
        if( to_picker.get('value') ) {
          from_picker.set('max', to_picker.get('select') );
        }

        from_picker.on('set', function(event) {
          if(event.select) {
            if(to_picker.get('value') && updateType === 'single') {
              var sensors = [mainSensorID, compareSensorID];
              sensors = sensors.filter(function(sensor) {
                return sensor;
              });
              changeChart(sensors, {
                from: from_picker.get('value'),
                to: to_picker.get('value')
              });
            }
            to_picker.set('min', from_picker.get('select') );
          } else if( 'clear' in event) {
            to_picker.set('min', false);
          }
        });

        to_picker.on('set', function(event) {
          if(event.select) {
            if(from_picker.get('value')) {
              var sensors = [mainSensorID, compareSensorID];
              sensors = sensors.filter(function(sensor) {
                return sensor;
              });
              changeChart(sensors, {
                from: from_picker.get('value'),
                to: to_picker.get('value')
              });
            }
            from_picker.set('max', to_picker.get('select'));
          } else if( 'clear' in event) {
            from_picker.set('max', false);
          }
        });

        //set to-picker max to today
        to_picker.set('max', new Date());

        function getToday() {
          return getSecondsFromDate(new Date());
        }

        function getSevenDaysAgo() {
          return getSecondsFromDate( getToday() - (7 * 24 * 60 * 60 * 1000) );
        }

        function getHalfAYearAgo() {
          return getSecondsFromDate( getToday() - (6 * 30 * 24 * 60 * 60 * 1000) );
        }

        function getDateToHaveDataInChart() {
          var today = moment();
          var lastTime = moment(entityData.time);
          var difference = today.diff(lastTime, 'days');
          var result = difference * 3;

          return lastTime.subtract(result, 'days').valueOf();
        }

        if(entityData){
          if(timeUtils.isWithin(7, 'days', entityData.time) || !entityData.time) {
            //set from-picker to seven days ago
            from_picker.set('select', getHalfAYearAgo());
            //from_picker.set('select', getSevenDaysAgo());
          } else {
            // set from-picker to
            from_picker.set('select', getDateToHaveDataInChart());
          }
          //set to-picker to today
          to_picker.set('select', getToday());
        }

        // api to interact with the picker from outside
        return {
          getValuePickerFrom: function() {
            return from_picker.get('value');
          },
          setValuePickerFrom: function(newValue) {
            updateType = 'single';
            from_picker.set('select', newValue);
          },
          getValuePickerTo: function() {
            return to_picker.get('value');
          },
          setValuePickerTo: function(newValue) {
            updateType = 'single';
            to_picker.set('select', newValue);
          },
          setValuePickers: function(newValues) {
            var from = newValues[0];
            var to = newValues[1];

            updateType = 'pair';
            from_picker.set('select', from);
            to_picker.set('select', to);
          }
        };
      }

      function geolocate() {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function(position){
            if(!position){
              alert.error('Please, allow Organicity to geolocate your' +
                'position so we can find a entity near you.');
              return;
            }

            geolocation.grantHTML5Geolocation();

            var location = {
              lat:position.coords.latitude,
              lng:position.coords.longitude
            };

            if (typeof entity === 'undefined' ) {
              // Instead of erroring, log this warning and return.
              console.log('Entity not defined, returning.');
              return;
            }

            // TODO: Where is this entity defined?
            entity.getEntities(location)
              .then(function(data){
                data = data.plain();
                _(data)
                  .chain()
                  .map(function(entity) {
                    return new HasSensorEntity(entity);
                  })
                  .filter(function(entity) {
                    return !!entity.longitude && !!entity.latitude;
                  })
                  .find(function(entity) {
                    return _.contains(entity.labels, 'online');
                  })
                  .tap(function(closestentity) {
                    if(closestentity) {
                      $state.go('layout.home.entity', {id: closestentity.id});
                    } else {
                      $state.go('layout.home.entity', {id: data[0].id});
                    }
                  })
                  .value();
              });
          });
        }
      }

    }
})();
