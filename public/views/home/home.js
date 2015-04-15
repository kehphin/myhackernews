app.controller("HomeCtrl", function($scope, $http, $location, $rootScope, StoryService) {
  $scope.init = function() {
    StoryService.getTopStories().then(function (stories) {
      $scope.stories = stories;
    });

  }

  $scope.addToFavorites = function(story) {
    StoryService.addToFavorites(story);
  }


});