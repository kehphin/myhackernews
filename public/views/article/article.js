app.controller('ArticleCtrl', function($scope, $http, $rootScope, $routeParams, StoryService) {
    $scope.$on('$viewContentLoaded', function() {

        StoryService.getStory($routeParams.articleId).then(function(story) {
            $scope.article = story;
        });

        $http.get('/api/article/' + $routeParams.articleId + "/comments").success(function(comments) {
            console.log(comments);
            $scope.comments = comments;
        });

        $http.get('/api/article/' + $routeParams.articleId + "/usersFavorited").success(function(articleFavorited) {
            console.log(articleFavorited.users);
            $scope.articleFavorited = articleFavorited.users;
        });
    });
});