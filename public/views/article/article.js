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
            $scope.articleFavorited = articleFavorited.users;
        });
    });

    $scope.postComment = function() {
        var commentBody = {
            article: {
                author: $scope.article.by,
                descendants: $scope.article.descendants,
                HNId: $scope.article.id,
                score: $scope.article.score,
                time: $scope.article.time,
                title: $scope.article.title,
                type: $scope.article.type,
                url: $scope.article.url
            },
            comment: {
                poster: $rootScope.currentUser.username,
                article: $scope.article.id,
                text: $scope.commentText
            }
        };

        $http.post('/api/article/' + $scope.article.id + "/comment", commentBody).success(function(users) {
            console.log("successfully posted comment");
            $scope.comments.push($scope.commentText);
        });
    };
});