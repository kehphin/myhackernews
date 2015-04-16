app.controller('ProfileCtrl', function($scope, $http, $rootScope, $routeParams){


    $scope.$on('$viewContentLoaded', function() {
        $http.get('/api/user/' + $routeParams.username).success(function(user){
           $scope.favorites = user.favorites;
           $scope.following = user.following;
           $scope.followers = user.followers;
        });
    });

    $scope.removeFavorite = function(story, index)
    {
        $http.delete('/api/user/' + $rootScope.currentUser.username + "/favorite/" + story.HNId)
        .success(function(users) {
            console.log("deleted favorited article");
            $scope.favorites.splice(index, 1);
        });
    }

    $scope.update = function(user)
    {
        $http.put('/api/user/'+user._id, user)
        .success(function(users){
            $scope.users = users;
        });
    }

    $scope.add = function(user)
    {
        $http.post('/api/user', user)
        .success(function(users){
            $scope.users = users;
        });
    }

    $scope.select = function(user)
    {
        $scope.user = user;
    }
});