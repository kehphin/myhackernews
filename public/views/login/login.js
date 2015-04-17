app.controller("LoginCtrl", function($scope, $http, $location, $rootScope) {
  $scope.login = function(user) {
    if (!user) {
      $scope.message = "Missing username and password";
      return;
    }

    if (user.username == "") {
     $scope.message = "Missing username";
      return;
    }

    $http.post("/api/login", user).success(function(response){
      $rootScope.currentUser = response;
      $location.url("/profile/" + user.username);
    }).error(function(data, status, headers, config) {
      // handle case where user tries to login with an invalid password
      if (status == 401 || status == 400) {
        $scope.message = "Invalid password";
      }
    });
  }
});
