(function() {
  'use strict';

  angular.module('app.components')
    .factory('miniMarker', ['markerUtils', '$location', '$state', function (markerUtils, $location, $state) {

      /**
       * Marker constructor
       * @constructor
       * @param {Object} entityData - Object with data about marker from API
       * @property {number} lat - Latitude
       * @property {number} lng - Longitude
       * @property {string} message - Message inside marker popup
       * @property {Object} icon - Object with classname, size and type of marker icon
       * @property {string} layer - Map layer that icons belongs to
       * @property {boolean} focus - Whether marker popup is opened
       * @property {Object} myData - Marker id and labels
       */

      function miniMarker(entityFeature) {
        this.entityFeature = entityFeature;
        this.popupHtml = markerPopup(entityFeature);
        this.focus = false;
      }
      return miniMarker;

      function markerPopup(entityFeature){
        var location = (markerUtils.parseLocation(entityFeature.properties)) ? '<p class="popup_location"><md-icon class="popup_icon" md-svg-src="./mediassets/images/location_icon_dark.svg"></md-icon>'+
                markerUtils.parseLocation(entityFeature.properties)+
                '</p>' : ''; // This is tmp. We need a better constructor.
                
        return  '<div class="popup"><div class="popup_top '+
                markerUtils.classify(markerUtils.parseType(entityFeature.properties))+
                '"><p class="popup_name">'+
                markerUtils.parseName(entityFeature.properties)+
                '</p><p class="popup_type">'+
                markerUtils.parseType(entityFeature)+
                //'</p><p class="popup_time"><md-icon class="popup_icon" md-svg-src="./mediassets/images/update_icon.svg"></md-icon>'+ // md-icon fails?
                '</p><p class="popup_time">'+
                markerUtils.parseTime(entityFeature.properties)+
                '</p></div><div class="popup_bottom">'+
                location+
                '<div class="popup_labels">'+
                createTagsTemplate(markerUtils.parseLabels(entityFeature.properties))+
                createTagsTemplate(markerUtils.parseUserTags(entityFeature.properties))+
                '</div><div class="clearfix"></div></div></div>';
      }

      function createTagsTemplate(tagsArr) {
        return _.reduce(tagsArr, function(acc, label) {
          return acc.concat('<span>' + label + '</span>');
        }, '');
      }

    }]);
})();
