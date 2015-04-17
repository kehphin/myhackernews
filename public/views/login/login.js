app.controller("LoginCtrl", function($scope, $http, $location, $rootScope){
  $scope.login = function(user){
    $http.post("/api/login", user).success(function(response){
      $rootScope.currentUser = response;
      $location.url("/profile/" + user.username);
    }).error(function(data, status, headers, config) {
      // handle case where user tries to login with an invalid password
      if (status == 401) {
        $scope.message = "Invalid password";
      }
    });
  }
});
