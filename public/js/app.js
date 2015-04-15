
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

    var getTopStories = function() {
      var deferred = $q.defer();

      $http.get("https://hacker-news.firebaseio.com/v0/topstories.json").success(function(json) {
        var topStoryList = [];
        for (var i=0; i<20; i++) {
          $http.get("https://hacker-news.firebaseio.com/v0/item/" + json[i] + ".json").success(function(story) {
            topStoryList.push(story);

            if(topStoryList.length == 20) {
              deferred.resolve(topStoryList);
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
        getTopStories: getTopStories,
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