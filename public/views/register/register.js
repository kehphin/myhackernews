app.controller("RegisterCtrl", function($scope, $http, $location, $rootScope){
  $scope.register = function(user){
    console.log(user);
    if(user.password != user.password2 || !user.password || !user.password2) {
      $scope.message = "Your passwords don't match";
    } else {
      $http.post("/api/user", user).success(function(response) {
        console.log(response);
        if(response != null) {
          $rootScope.currentUser = response;
          $location.url("/profile/" + $rootScope.currentUser.username);
        }
      }).error(function(data, status, headers, config) {
        // handle case where user tries to register for a username that already exists
        if (status == 500) {
          $scope.message = "Username already exists";
        }
      });
    }
  }
});
