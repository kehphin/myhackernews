app.controller('ProfileCtrl', function($scope, $http, $rootScope, $routeParams) {
    $scope.$on('$viewContentLoaded', function() {
        $scope.username = $routeParams.username;
        $scope.tabView = 'favorites-tab';

        $http.get('/api/user/' + $scope.username).success(function(user){
           $scope.favorites = user.favorites;
           $scope.following = user.following;
           $scope.followers = user.followers;
        });

        $http.get('/api/user/' + $scope.username + '/similarUsers').success(function(users) {
            console.log(users);
            $scope.similarUsers = users;

            if ($scope.similarUsers.length > 0) {
                $(".profile-tab-container").addClass("col-md-8");
            }
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

    $scope.followUser = function()
    {
        $http.post('/api/user/' + $rootScope.currentUser.username + "/follow/" + $scope.username)
        .success(function(users) {
            $scope.followers.push($rootScope.currentUser.username);
        });
    }

    $scope.unfollowUser = function()
    {
        $http.delete('/api/user/' + $rootScope.currentUser.username + "/follow/" + $scope.username)
        .success(function(users) {
            $scope.followers.splice($scope.followers.indexOf($rootScope.currentUser.username), 1);
        });
    }

    $scope.setProfileTabView = function(tab)
    {
        $(".profile-tab").removeClass('active');
        $("." + tab).addClass('active');

        $scope.tabView = tab;

    }
});