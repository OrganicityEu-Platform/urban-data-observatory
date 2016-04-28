(function() {
  'use strict';

  angular.module('app.components')
    .factory('auth', auth);
    
    auth.$inject = ['$location', '$window', '$state', 'accountsAPI', '$rootScope', 'AuthUser', '$timeout', 'alert'];
    function auth($location, $window, $state, accountsAPI, $rootScope, AuthUser, $timeout, alert) {

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
        user.data = $window.localStorage.getItem('organicity.data') && new AuthUser(JSON.parse( $window.localStorage.getItem('organicity.data') ));
        if(!user.token) {
          return;
        }
        return getCurrentUserInfo()
          .then(function(data) {
            $window.localStorage.setItem('organicity.data', JSON.stringify(data.plain()) );

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
          });
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

      function login(loginData) {
        return accountsAPI.all('sessions').post(loginData);
      }

      function logout() {
        $window.localStorage.removeItem('organicity.token');
        $window.localStorage.removeItem('organicity.data');
      }

      function getCurrentUserInfo() {
        return accountsAPI.all('').customGET('me');
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
