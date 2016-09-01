(function() {
  'use strict';

  angular.module('app.components')
    .controller('MapController', MapController);

    MapController.$inject = ['$scope', '$state', '$timeout', 'markers', 'device', '$mdDialog', 'leafletData', 'mapUtils', 'markerUtils', 'alert'];
    function MapController($scope, $state, $timeout, markers, device, $mdDialog, leafletData, mapUtils, markerUtils, alert) {
    	var vm = this;
      var updateType;
      var mapMoved = false;
      var entityLoaded = false;
      var mapClicked = false;

      var initialLocation = markers[0];
      var markersByIndex = markersIndexes(markers);
      var focusedMarkerID = $state.params.id?
        markersByIndex[parseInt($state.params.id)].myData.id :
        undefined;

      vm.markers = markers;

      vm.tiles = {
        url: 'https://api.tiles.mapbox.com/v4/tomasdiez.ed7899f5/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoidG9tYXNkaWV6IiwiYSI6ImRTd01HSGsifQ.loQdtLNQ8GJkJl2LUzzxVg'
      };
      //previous tile -->'https://a.tiles.mapbox.com/v4/tomasdiez.jnbhcnb2/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoidG9tYXNkaWV6IiwiYSI6ImRTd01HSGsifQ.loQdtLNQ8GJkJl2LUzzxVg'

      vm.layers = {
        baselayers: {
          osm: {
            name: 'OpenStreetMap',
            type: 'xyz',
            url: 'https://api.tiles.mapbox.com/v4/tomasdiez.ed7899f5/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoidG9tYXNkaWV6IiwiYSI6ImRTd01HSGsifQ.loQdtLNQ8GJkJl2LUzzxVg'
          }
        },
        overlays: {
          realworld: {
            name: 'Devices',
            type: 'markercluster',
            visible: true,
            layerOptions: {
              showCoverageOnHover: false,
              iconCreateFunction: function (cluster) {
                  var childCount = cluster.getChildCount();
                  var c = ' marker-cluster-';
                  if (childCount < 5) {
                      c += 'small';
                  } else if (childCount < 40) {
                      c += 'medium';
                  } else {
                      c += 'large';
                  }
                  return new L.DivIcon({ html: '<div><span>' + childCount + '</span></div>', className: 'marker-cluster' + c, iconSize: new L.Point(40, 40) });
              }
              //disableClusteringAtZoom: 15,
              //iconCreateFunction: customMarkerCluster
            }
          }
        }
      };

      vm.center = {
        lat: 48,
        lng: 18.5,
        zoom: 3
      };


    	vm.defaults = {
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true
    	};

    	vm.events = {
    	  map: {
    	  	enable: ['dragend', 'zoomend', 'moveend', 'popupopen', 'popupclose', 'mousedown', 'dblclick', 'click', 'touchstart', 'mouseup'],
    	  	logic: 'broadcast'
    	  }
    	};

      $scope.$on('leafletDirectiveMarker.click', function(event, data) {
        var id = data.leafletEvent.target.options.myData.id;

        vm.entityLoading = true;
        vm.center.lat = data.leafletEvent.latlng.lat;
        vm.center.lng = data.leafletEvent.latlng.lng;

        if(id === parseInt($state.params.id)) {
          $timeout(function() {
            vm.entityLoading = false;
          }, 0);
          return;
        }

        focusedMarkerID = data.leafletEvent.target.options.myData.id;

        updateType = 'map';
        var id = data.leafletEvent.target.options.myData.id;

        var availability = data.leafletEvent.target.options.myData.labels[0];

        ga('send', 'event', 'entity Marker', 'click', availability);

        $state.go('layout.home.entity', {id: id});
      });

      $scope.$on('leafletDirectiveMarker.popupclose', function(event, data) {
        if(focusedMarkerID) {
          var marker = vm.markers[focusedMarkerID];
          if(marker) {
            vm.markers[focusedMarkerID].focus = false;
          }
        }
      });

      $scope.$on('entityLoaded', function(event, data) {
        vm.entityLoading = false;
        if(updateType === 'map') {
          updateType = undefined;
          return;
        }

        vm.center.lat = data.lat;
        vm.center.lng = data.lng;

        $timeout(function() {
          leafletData.getMarkers()
            .then(function(markers) {
              var currentMarker = _.find(markers, function(marker) {
                return data.id === marker.options.myData.id;
              });

              leafletData.getLayers()
                .then(function(layers) {
                  layers.overlays.realworld.zoomToShowLayer(currentMarker, function() {
                    var selectedMarker = vm.markers[data.id];

                    if(selectedMarker) {
                      selectedMarker.focus = true;
                    }
                    if(!$scope.$$phase) {
                      $scope.$digest();
                    }

                    entityLoaded = true;
                  });
                });
            });
        }, 3000);
      });

      $scope.$on('goToLocation', function(event, data) {
        vm.center.lat = data.lat;
        vm.center.lng = data.lng;
        vm.center.zoom = data.type === 'City' ? 8 : 8;
      });

      $scope.$on('leafletDirectiveMap.moveend', function(){
        reportMapMove();
      });

      $scope.$on('leafletDirectiveMap.zoomend', function(){
        reportMapMove();
      });

      $scope.$on('leafletDirectiveMap.mousedown', function(){
        mapClicked = true;
      });

      var defaultFilters = {
        exposure: null,
        status: null
      };

      vm.filterData = {
        online: true,
        offline: true
      };

      vm.openFilterPopup = openFilterPopup;
      vm.removeFilter = removeFilter;

      initialize();

      /////////////////////

      function initialize() {
        checkFiltersSelected();
      }

      function markersIndexes(markers) {
        if (markers.route == "assets/geo") {
          return [];
        }
        else {
          _.indexBy(markers, function(marker) {
            return marker.myData.id;
          });
        }
      }


      function checkFiltersSelected() {
        var allFiltersSelected = _.every(vm.filterData, function(filterValue) {
          return filterValue;
        });
        if(allFiltersSelected) {
          vm.allFiltersSelected = true;
        } else {
          vm.allFiltersSelected = false;
        }
      }

      function openFilterPopup() {
        $mdDialog.show({
          hasBackdrop: true,
          controller: 'MapFilterDialogController',
          templateUrl: 'app/components/map/mapFilterPopup.html',
          //targetEvent: ev,
          clickOutsideToClose: true,
          locals: {
            filterData: vm.filterData,
            defaultFiltersFromController: defaultFilters
          }
        })
        .then(function(obj) {
          _.extend(vm.filterData, obj.data);
          _.extend(defaultFilters, obj.defaultFilters);
          updateMarkers(obj.data);
          checkFiltersSelected();
          $timeout(function() {
            checkMarkersLeftOnMap();
          });
        });
      }

      function removeFilter(filterName) {
        if(!mapUtils.canFilterBeRemoved(vm.filterData, filterName)) {
          return;
        }
        vm.filterData[filterName] = false;
        _.extend(defaultFilters, mapUtils.setDefaultFilters(vm.filterData, defaultFilters));
        updateMarkers(vm.filterData);
        checkFiltersSelected();
        $timeout(function() {
          checkMarkersLeftOnMap();
        });
      }

      function filterMarkers(filterData) {
        return markers.filter(function(marker) {
          var labels = marker.myData.labels;
          return _.every(labels, function(label) {
            return filterData[label];
          });
        });
      }

      function updateMarkers(filterData) {
        vm.markers = [];
        $timeout(function() {
          $scope.$apply(function() {
            vm.markers = filterMarkers(filterData);
          });
        });
      }

      function checkMarkersLeftOnMap() {
        return leafletData.getMarkers()
          .then(function(markers) {
            return leafletData.getLayers()
              .then(function(layers) {
                var isThereMarkers = mapContainsAnyMarker(layers, markers);

                if(!isThereMarkers) {
                  leafletData.getMap()
                    .then(function(map) {
                      var center = L.latLng(vm.center.lat, vm.center.lng);
                      var closestMarker = _.reduce(markers, function(closestMarkerSoFar, marker) {
                        var distanceToMarker = center.distanceTo(marker.getLatLng());
                        var distanceToClosest = center.distanceTo(closestMarkerSoFar.getLatLng());
                        return distanceToMarker < distanceToClosest ? marker : closestMarkerSoFar;
                      }, markers[0]);

                      if(closestMarker) {
                        zoomOutWhileNoMarker(layers, closestMarker);
                      } else {
                        alert.info('No markers found with those filters', 5000);
                      }
                    });
                }
              });
          });
      }
      function mapContainsAnyMarker(layers, data) {
        var bounds = layers.overlays.realworld._currentShownBounds;
        return _.some(data, function(marker) {
          return mapContainsMarker(bounds, marker);
        });
      }

      function mapContainsMarker(bounds, marker) {
        return bounds.contains(marker.getLatLng());
      }

      function zoomOutWhileNoMarker(layers, marker) {
        var bounds = layers.overlays.realworld._currentShownBounds;

        if(!mapContainsMarker(bounds, marker)) {
          zoomOutMap();
          leafletData.getLayers()
            .then(function(newLayers) {
              $timeout(function() {
                zoomOutWhileNoMarker(newLayers, marker);
              });
            });
        }
      }

      function zoomOutMap() {
        if(vm.center.zoom === 0) {
          return;
        }
        vm.center.zoom = vm.center.zoom - 3;
      }

      function reportMapMove(){
        if(entityLoaded && !mapMoved && mapClicked){
          ga('send', 'event', 'Map', 'moved');
          mapMoved = true;
        }
      }
    }

})();
