app.controller("HomeCtrl", function($scope, $http, $location, $rootScope, StoryService) {
  $scope.init = function() {
    StoryService.getStories("topstories").then(function(article) {
      $scope.articles = article;
    });
    if($rootScope.currentUser) {
        StoryService.getFavorites().then(function(favorites) {
    	    $scope.currentUser.favorites = favorites;
        });
    }
  }

  $scope.sortStories = function(sortType) {
    StoryService.getStories(sortType).then(function(article) {
      $scope.articles = article;

      if (sortType == "topstories") {
        $scope.newest = false;
      } else {
        $scope.newest = true;
      }
    });
  }

  $scope.addToFavorites = function(article) {
    StoryService.addToFavorites(article);
    $rootScope.currentUser.favorites.push(article.id.toString());
  }
  
  $scope.removeFromFavorites = function(article) {
  	StoryService.removeFavorite(article.id);
  	$rootScope.currentUser.favorites.splice($rootScope.currentUser.favorites.indexOf(article.id.toString()), 1);
  }

});