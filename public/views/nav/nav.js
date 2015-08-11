app.controller("NavCtrl", function($scope, $http, $location, $rootScope){
   $scope.logout = function(){
       $http.post("/api/logout")
       .success(function(){
           $rootScope.currentUser = null;
           $location.url("/home");
       });
   }
   // want to check if the user has a valid session on page load
   var checkLoggedin = function()
    {
        $http.get('/api/loggedin').success(function(user)
        {
            $rootScope.errorMessage = null;
            // User is Authenticated
            if (user !== '0')
            {
                $rootScope.currentUser = user;
            }
            // User is Not Authenticated
            else
            {
                $rootScope.errorMessage = 'You need to log in.';
                $location.url('/login');
            }
        });

    };
    checkLoggedin();
});