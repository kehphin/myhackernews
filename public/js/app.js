
var app = angular.module("MyHackerNewsApp", ["ngRoute"]);

app.config(function($routeProvider, $httpProvider) {
    $routeProvider
      .when('/home', {
          templateUrl: 'views/home/home.html',
          controller: 'HomeCtrl',
      })
      .when('/profile', {
          templateUrl: 'views/profile/profile.html',
          controller: 'ProfileCtrl',
          resolve: {
              loggedin: checkLoggedin
          }
      })
      .when('/login', {
          templateUrl: 'views/login/login.html',
          controller: 'LoginCtrl'
      })
      .when('/register', {
          templateUrl: 'views/register/register.html',
          controller: 'RegisterCtrl'
      })
      .otherwise({
          redirectTo: '/home'
      });
});

app.factory('StoryService', function StoryService($q, $http) {

    var favorites = [];

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
                if (index == 20) return false; // break out of loop after first 20 stories
                storyList.push(stories[storyId.toString()]);
              });

              deferred.resolve(storyList);
            }
          });
        }
      });

      return deferred.promise;
    }

    var addToFavorites = function(story)
    {
        favorites.push(story);
    }

    var getFavorites = function()
    {
        return favorites;
    }

    return {
        getStories: getStories,
        addToFavorites: addToFavorites,
        getFavorites: getFavorites
    };
});

var checkLoggedin = function($q, $timeout, $http, $location, $rootScope)
{
    var deferred = $q.defer();

    $http.get('/loggedin').success(function(user)
    {
        $rootScope.errorMessage = null;
        // User is Authenticated
        if (user !== '0')
        {
            $rootScope.currentUser = user;
            deferred.resolve();
        }
        // User is Not Authenticated
        else
        {
            $rootScope.errorMessage = 'You need to log in.';
            deferred.reject();
            $location.url('/login');
        }
    });

    return deferred.promise;
};