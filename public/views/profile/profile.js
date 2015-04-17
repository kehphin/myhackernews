app.controller('ProfileCtrl', function($scope, $http, $rootScope, $routeParams, StoryService){
    $scope.$on('$viewContentLoaded', function() {
        $scope.username = $routeParams.username;

        $http.get('/api/user/' + $scope.username).success(function(user){
           $scope.favorites = user.favorites;
           $scope.following = user.following;
           $scope.followers = user.followers;
        });
        
        $http.get('/api/user/' + $scope.username + '/similarUsers').success(function(users) {
        	console.log(users);
        	$scope.similarUsers = users;
        });
    });

    $scope.removeFavorite = function(story, index)
    {
    	StoryService.removeFavorite(story.HNId);
        $scope.favorites.splice(index, 1);
        $rootScope.currentUser.favorites.splice(index, 1);
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
});