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
        
        StoryService.getFavorites().then(function(json) {
        	$rootScope.currentUser.favorites = json;
        })
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
            commentBody.comment.dateCreated = Date.now();
            $scope.comments.push(commentBody.comment);
        });
    };
    
    $scope.addToFavorites = function(article) {
    	StoryService.addToFavorites(article);
    	$rootScope.currentUser.favorites.push(article.id.toString());
    	$scope.articleFavorited.push({username: $rootScope.currentUser.username});
    }
    
    $scope.removeFromFavorites = function(article) {
    	StoryService.removeFavorite(article.id);
    	$rootScope.currentUser.favorites.splice($rootScope.currentUser.favorites.indexOf(article.id.toString()), 1);
    	$scope.articleFavorited.splice($scope.articleFavorited.indexOf($rootScope.currentUser.username), 1);
    }
});