app.controller("HomeCtrl", function($scope, $http, $location, $rootScope, StoryService) {
  $scope.init = function() {
    StoryService.getStories("topstories").then(function(stories) {
      $scope.stories = stories;
    });
  }

  $scope.sortStories = function(sortType) {
    StoryService.getStories(sortType).then(function(stories) {
      $scope.stories = stories;

      if (sortType == "topstories") {
        $scope.newest = false;
      } else {
        $scope.newest = true;
      }
    });
  }

  $scope.addToFavorites = function(story) {
    StoryService.addToFavorites(story);
    $rootScope.currentUser.favorites.push(story.id.toString());
  }

});