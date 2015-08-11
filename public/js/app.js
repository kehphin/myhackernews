
var app = angular.module("MyHackerNewsApp", ["ngRoute"]);

app.config(function($routeProvider, $httpProvider) {
    $routeProvider
      .when('/home', {
          templateUrl: 'views/home/home.html',
          controller: 'HomeCtrl',
      })
      .when('/profile', {
          templateUrl: 'views/profile/profile.html',
          controller: 'ProfileCtrl'
      })
      .when('/login', {
          templateUrl: 'views/login/login.html',
          controller: 'LoginCtrl'
      })
      .when('/register', {
          templateUrl: 'views/register/register.html',
          controller: 'RegisterCtrl'
      })
      .when('/article/:articleId', {
        templateUrl: 'views/article/article.html',
        controller: 'ArticleCtrl'
      })
      .when('/profile/:username', {
        templateUrl: 'views/profile/profile.html',
        controller: 'ProfileCtrl'
      })
      .otherwise({
          redirectTo: '/home'
      });
});

app.factory('StoryService', function StoryService($q, $http, $rootScope) {

    var favorites = [];
    
    var HNUrlBase = 'https://news.ycombinator.com/item?id=';

    var getStory = function(id) {
      var deferred = $q.defer();

      $http.get("https://hacker-news.firebaseio.com/v0/item/"+ id + ".json").success(function(json) {
    	  if(json.url == null || json.url == '') {
    		  json.url = HNUrlBase + json.id;
    	  }
        deferred.resolve(json);
      });

      return deferred.promise;
    }

    var getStories = function(sortType) {
      var deferred = $q.defer();

      // Get array of IDs of the top 20 stories
      $http.get("https://hacker-news.firebaseio.com/v0/" + sortType + ".json").success(function(json) {
        var stories = {};
        var storyCounter = 0; // keep track of when we reach 20 stories in the story list so we can resolve the deferred

        // make each individual GET request (get story by ID)
        for (var i=0; i<20; i++) {
          $http.get("https://hacker-news.firebaseio.com/v0/item/" + json[i] + ".json?").success(function(story) {
            stories[story.id.toString()] = story;
            storyCounter++;

            if(storyCounter == 20) {
              var storyList = [];
              $.each(json, function(index, storyId) {
                if (index == 20) {
                	return false; // break out of loop after first 20 stories
                }
                var curStory = stories[storyId.toString()];
                //sometimes a story doesn't have a url so we want the hyperlink to point
                //to the HN details page for the story
                if (curStory.url == null || curStory.url == '') {
                	curStory.url = HNUrlBase + curStory.id;
                	
                }
                storyList.push(curStory);
              });

              deferred.resolve(storyList);
            }
          });
        }
      });

      return deferred.promise;
    }

    var addToFavorites = function(story) {
      var reqBody = {
        author: story.by,
        HNId: story.id,
        dateCreated: story.time,
        title: story.title,
        url: story.url
      }

      $http.post("/api/user/" + $rootScope.currentUser.username + "/favorite/" + story.id, reqBody).success(function(story) {
        console.log("successfully added to favorites");
      });
    }
    
    var removeFavorite = function(id) {
    	$http.delete('/api/user/' + $rootScope.currentUser.username + "/favorite/" + id)
        .success(function(users) {
            console.log("deleted favorited article");
        });
    }

    var getFavorites = function()
    {
    	var deferred = $q.defer();

        $http.get("/api/user/"+ $rootScope.currentUser.username + "/favorites").success(function(json) {
          deferred.resolve(json);
        });

        return deferred.promise;
    }

    return {
        getStory: getStory,
        getStories: getStories,
        addToFavorites: addToFavorites,
        getFavorites: getFavorites,
        removeFavorite: removeFavorite
    };
});