app.controller("HomeCtrl", function($scope, $http, $location, $rootScope, StoryService) {
  $scope.init = function() {
    StoryService.getStories("topstories").then(function(stories) {
      $scope.stories = stories;
    });
  }

  $scope.sortStories = function(sortType) {
    StoryService.getStories(sortType).then(function(stories) {
      $scope.stories = stories;
    });
  }

  $scope.addToFavorites = function(story) {
    StoryService.addToFavorites(story);
  }
});