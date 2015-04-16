app.controller("LoginCtrl", function($scope, $http, $location, $rootScope){
    $scope.login = function(user){
        $http.post("/api/login", user).success(function(response){
          $rootScope.currentUser = response;
          $location.url("/profile/" + user.username);
        });
    }
});
