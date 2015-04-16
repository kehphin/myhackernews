app.controller('ArticleCtrl', function($scope, $http, $rootScope, $routeParams) {
    $scope.init = function() {
        StoryService.getStories("topstories").then(function(stories) {
          $scope.stories = stories;
        });
      }

    $scope.favorites = $rootScope.currentUser.favorites;

    $scope.remove = function(user)
    {
        $http.delete('/api/user/'+user._id)
        .success(function(users){
           $scope.users = users;
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