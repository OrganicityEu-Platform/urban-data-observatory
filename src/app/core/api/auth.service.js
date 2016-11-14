(function() {
  'use strict';

  angular.module('app.components')
    .factory('auth', auth);

    auth.$inject = ['$http', '$location', '$rootScope', '$state', '$timeout', '$window', 'accountsAPI', 'alert', 'AuthUser', 'jwtHelper'];
    function auth($http, $location, $rootScope, $state, $timeout, $window, accountsAPI, alert, AuthUser, jwtHelper) {

    	var user = {
        token: null,
        data: null
      };

      //wait until http interceptor is added to Restangular
      $timeout(function() {
    	  initialize();
      }, 100);

    	var service = {
        isAuth: isAuth,
        setCurrentUser: setCurrentUser,
        getCurrentUser: getCurrentUser,
        updateUser: updateUser,
        saveData: saveData,
        login: login,
        logout: logout,
        callback: callback,
        recoverPassword: recoverPassword,
        getResetPassword: getResetPassword,
        patchResetPassword: patchResetPassword,
        isAdmin: isAdmin
    	};
    	return service;

      //////////////////////////

      function initialize() {
        setCurrentUser('appLoad');
      }
      //run on app initialization so that we can keep auth across different sessions
      function setCurrentUser(time) {
        user.token = $window.localStorage.getItem('organicity.token') && JSON.parse( $window.localStorage.getItem('organicity.token') );
        // Check for user properties
        user.data = $window.localStorage.getItem('organicity.data') && new AuthUser(JSON.parse( $window.localStorage.getItem('organicity.data') ));
        if(!user.token) {
          return;
        }
        var data = JSON.parse(getCurrentUserInfo());
        $window.localStorage.setItem('organicity.data', JSON.stringify(data) );
        var newUser = new AuthUser(data);
        //check sensitive information
        if(user.data && user.data.role !== newUser.role) {
          user.data = newUser;
          $location.path('/');
        }
        user.data = newUser;

        // used for app initialization
        if(time && time === 'appLoad') {
          //wait until navbar is loaded to emit event
          $timeout(function() {
            $rootScope.$broadcast('loggedIn', {time: 'appLoad'});
          }, 3000);
        } else {
          // used for login
          $state.reload();
          $timeout(function() {
            alert.success('Login was successful');
            $rootScope.$broadcast('loggedIn', {});
          }, 2000);
        }
        // return getCurrentUserInfo()
        //   .then(function(data) {
        //     $window.localStorage.setItem('organicity.data', JSON.stringify(data.plain()) );
        //
        //     var newUser = new AuthUser(data);
        //     //check sensitive information
        //     if(user.data && user.data.role !== newUser.role) {
        //       user.data = newUser;
        //       $location.path('/');
        //     }
        //     user.data = newUser;
        //
        //     // used for app initialization
        //     if(time && time === 'appLoad') {
        //       //wait until navbar is loaded to emit event
        //       $timeout(function() {
        //         $rootScope.$broadcast('loggedIn', {time: 'appLoad'});
        //       }, 3000);
        //     } else {
        //       // used for login
        //       $state.reload();
        //       $timeout(function() {
        //         alert.success('Login was successful');
        //         $rootScope.$broadcast('loggedIn', {});
        //       }, 2000);
        //     }
        //   });
      }

      function updateUser() {
        return getCurrentUserInfo()
          .then(function(data) {
            $window.localStorage.setItem('organicity.data', JSON.stringify(data.plain()) );
          });
      }

      function getCurrentUser() {
        return user;
      }

      function isAuth() {
        return !!$window.localStorage.getItem('organicity.token');
      }
      //save to localstorage and
      function saveData(token) {
        $window.localStorage.setItem('organicity.token', JSON.stringify(token) );
        setCurrentUser();
      }

      function login() {

        // Here it should go the logic for the login oauth flow
        // GET https://accounts.organicity.eu/realms/organicity/protocol/openid-connect/auth/?response_type=token&client_id=udo-dev&redirect_uri=http://localhost:8080/resources/&scope=&state=
        // POST https://accounts.organicity.eu/realms/organicity/login-actions/authenticate?code=QZXmSAhIOKkMv1Wqw0qA5j__l-hIWCYdaO6niY5B9Bc.3dd256c6-1ad5-4f87-9ba1-cbdac04a9e2c&execution=7c8382a4-624c-4911-9135-242e1f2b0af1

        console.log('NEW LOGIN!');
        window.location.href = 'https://accounts.organicity.eu/realms/organicity/protocol/openid-connect/auth/?response_type=token&client_id=udo&redirect_uri=http://observatory.organicity.eu/callback&scope=&state=';
      }

      function callback() {
        console.log($location.$$hash);
        var token = $location.$$hash.split('&')[1].slice(13);
        window.localStorage.setItem('organicity.token', JSON.stringify(token) );
        var jwtDecoded = jwtHelper.decodeToken(token);
        window.localStorage.setItem('organicity.data', userData(jwtDecoded) );

        return $location.path('/resources');
      }

      function logout() {
        $window.location.href = 'https://accounts.organicity.eu/realms/organicity/protocol/openid-connect/logout?redirect_uri=http://observatory.organicity.eu'
        $window.localStorage.removeItem('organicity.token');
        $window.localStorage.removeItem('organicity.data');
      }

      function getCurrentUserInfo() {
        var token = $window.localStorage.getItem('organicity.token');
        var jwtDecoded = jwtHelper.decodeToken(token);
        if (jwtHelper.isTokenExpired(token)) {
          console.log('EXPIRED');
          return login();
        } else {
          return userData(jwtDecoded);
        }
      }

      function userData(jwtDecoded) {
        return JSON.stringify({ id: jwtDecoded.sub,
                                uuid: jwtDecoded.sub,
                                role: '',
                                name: jwtDecoded.name,
                                username: jwtDecoded.preferred_username,
                                avatar: './mediassets/images/avatar.svg',
                                url: '',
                                location: { city: 'null', country: 'null', country_code: 'null'},
                                email: jwtDecoded.email,
                              });
      }

      function recoverPassword(data) {
        return accountsAPI.all('password_resets').post(data);
      }

      function getResetPassword(code) {
        return accountsAPI.one('password_resets', code).get();
      }
      function patchResetPassword(code, data) {
        return accountsAPI.one('password_resets', code).patch(data);
      }
      function isAdmin(userData) {
        return userData.role === 'admin';
      }
    }
})();
