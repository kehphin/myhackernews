app.controller('ArticleCtrl', function($scope, $http, $rootScope, $routeParams, StoryService) {
    $scope.$on('$viewContentLoaded', function() {
        $scope.tabView = 'comments-tab';

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


		if ($rootScope.currentUser) {
		    StoryService.getFavorites().then(function(json) {
				$rootScope.currentUser.favorites = json;
			});
		}

		$http.get('/api/article/' + $routeParams.articleId + '/similarArticles').success(function(similarArticles) {
			$scope.similarArticles = similarArticles;
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

        // BROKEN, NEED RETURNED COMMENT ARRAY OR COMMENT
        $http.post('/api/article/' + $scope.article.id + "/comment", commentBody).success(function(comment) {
            console.log("successfully posted comment");
            $scope.comments.push(comment);
        });

        $scope.commentText = '';
    };

    $scope.saveComment = function(comment) {
        comment.edit = undefined;

        $http.put('/api/article/' + $routeParams.articleId + "/comment/" + comment._id, comment).success(function() {
            console.log("comment saved");
        });
    }

    $scope.editComment = function(comment) {
        comment.edit = true;
        comment.oldText = comment.text;
    }

    $scope.cancelEditComment = function(comment) {
        comment.edit = false;
        comment.text = comment.oldText;
        comment.oldText = undefined;
    }

    $scope.deleteComment = function(index, comment) {
        $http.delete('/api/article/' + $routeParams.articleId + "/comment/" + comment._id).success(function() {
            console.log("comment deleted");
            $scope.comments.splice(index, 1);
        });
    }

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

    $scope.setArticleTabView = function(tab) {
        $(".profile-tab").removeClass('active');
        $("." + tab).addClass('active');

        $scope.tabView = tab;
    }
});
