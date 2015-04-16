var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');
var passport      = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var cookieParser  = require('cookie-parser');
var session       = require('express-session');
var mongoose      = require('mongoose');
var https          = require('https');

var connectionString = process.env.OPENSHIFT_MONGODB_DB_URL || 'mongodb://localhost/test';
var ip = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var port = process.env.OPENSHIFT_NODEJS_PORT || 3000;

var db = mongoose.connect(connectionString);


// //////////////////////////////////////////////
// MODELS
// //////////////////////////////////////////////
var UserSchema = new mongoose.Schema({
    username: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    following: [String],
    favorites: [String]
    });

var User = mongoose.model('User', UserSchema);

var ArticleSchema = new mongoose.Schema({
	HNId: {type: String, unique: true, required: true},
	author: {type: String},
	dateCreated: {type: String},
	title: {type: String, required: true},
	url: {type: String, required: true}
	
});

var Article = mongoose.model('Article', ArticleSchema);

// making comments its own collection because will be a lot easier
// to edit and delete comments when they have an _id than by updating
// them in a set embedded in an article
var CommentSchema = new mongoose.Schema({
	poster: {type: String, required: true},
	text: {type: String, required: true},
	dateCreated: {type: Date, default: Date.now},
	article: {type: String, required: true}
});

var Comment = mongoose.model('Comment', CommentSchema);


// //////////////////////////////////////////////
// Configure Express
// //////////////////////////////////////////////

function logRequestBody(req, res, next) {
	console.log(req.method + ' path=' + req.originalUrl + ' body=' + JSON.stringify(req.body));
	next();
}

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing
													// application/x-www-form-urlencoded
app.use(multer()); // for parsing multipart/form-data
app.use(session({ secret: 'this is the secret' }));
app.use(cookieParser())
app.use(passport.initialize());
app.use(passport.session());
app.use(logRequestBody);
app.use(express.static(__dirname + '/public'));


// //////////////////////////////////////////////
// Passport Functions
// //////////////////////////////////////////////

passport.use(new LocalStrategy(
function(username, password, done)
{
	// probably want to change this to hash passwords before they are stored and
	// then compare
	// hashed passwords
	// TODO
    User.findOne({username: username, password: password}, function(err, user)
    {
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        return done(null, user);
    })
}));

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

var auth = function(req, res, next)
{
    if (!req.isAuthenticated())
        res.status(401).end();
    else
        next();
};

////////////////////////////////////////////////
//Hacker News API
////////////////////////////////////////////////
var HackerNews = {
	host: 'hacker-news.firebaseio.com',
	path: '/v0/item/'
}

// //////////////////////////////////////////////
// REST Endpoints
// //////////////////////////////////////////////

// //////////////////////////////////////////////
// Auth/Session Endpoints
// //////////////////////////////////////////////

// simple login endpoint, the authenticate function does the username-password
// check here
app.post("/api/login", passport.authenticate('local'), function(req, res){
    var user = req.user;
    console.log(user);
    res.json(user);
});

// checks if the user is logged in
app.get('/api/loggedin', function(req, res)
{
    res.send(req.isAuthenticated() ? req.user : '0');
});

// logs the user out and returns the proper status code
app.post('/api/logout', function(req, res)
{
    req.logOut();
    res.send(200);
});

// //////////////////////////////////////////////
// User Endpoints
// //////////////////////////////////////////////

// create a new user
/* An example input JSON:
{
    "username":"chris",
    "password":"foobar"
}
 */
/* An example response JSON:
{
    "__v": 0,
    "username": "chris",
    "password": null,
    "_id": "552edc222a9229800b7ee285",
    "favorites": [],
    "following": []
} 
 */
app.post('/api/user', function(req, res)
{
    var newUser = new User(req.body);
    // save the user to the DB
    newUser.save(function(err, user)
    {
      	if(err) {
       		res.status(500).json(err);
       		return;
       	}
       	// now that the user is created we want to log them in
        req.login(user, function(err)
        {
            if(err) { 
               	res.status(500);
               	return;
            }
            user.password = null;
            res.json(user);
        });
    });
});

if(!process.env.OPENSHIFT_NODEJS_PORT) {
// get a list of all users, just for testing locally
/* An example response JSON:
 * [
    {
        "_id": "552dc8c706de35e41a298624",
        "username": "cflood",
        "__v": 0,
        "favorites": [
            "123",
            "8863"
        ],
        "following": [
            "cjf2xn"
        ]
    },
    {
        "_id": "552dde1a54d64e9815714af2",
        "username": "flood.chr",
        "__v": 0,
        "favorites": [],
        "following": [
            "cflood"
        ]
    }
]
 */
app.get("/api/users", function(req, res)
{
    User.find({}, {password: 0}, function(err, users)
    {
        res.json(users);
    });
});
}

// get a user by username
/* An example response JSON:
{
    "_id": "552dc8c706de35e41a298624",
    "username": "cflood",
    "__v": 0,
    "favorites": [
        {
            "_id": "552dd4906458dbc8009c5bf9",
            "author": "beau",
            "HNId": "123",
            "dateCreated": "1171923673",
            "title": "Design Quotations: &#34;And if in fact you do know the e technology is obsolete.&#34;",
            "url": "http://design.caltech.edu/erik/Misc/design_quotes.html",
            "__v": 0
        },
        {
            "_id": "552de3c2c8378da00fece2e4",
            "author": "dhouston",
            "HNId": "8863",
            "title": "My YC app: Dropbox - Throw away your USB drive",
            "url": "http://www.getdropbox.com/u/2/screencast.html",
            "__v": 0
        }
    ],
    "following": [
        "cjf2xn"
    ],
    "followers": [
        "flood.chr",
        "cjf2xn"
    ]
}
 */
app.get("/api/user/:username", function(req, res)
{
	//{password: 0} tells mongo not to give us the password back in its return JSON
    User.find({username: req.params.username}, {password: 0}, function(err, user)
	{
    	if(err) {
    		res.status(500).end();
    		return;
    	} else if(!user.length) {
    		res.status(404).end();
    		return;
    	}
    	//need to do a find for all HNId's in the favorited section
    	//Mongoose has some control over when the object is stringified and since we want
    	//to add the followers field on our own below we need to make a copy of the object
    	var curUser = JSON.parse(JSON.stringify(user[0]));
    	var complete = false;
    	Article.find({HNId: { $in: curUser.favorites}}, function(err, articles) {
    		if(err) {
    			console.log("The error when looking by HNId for favorites is " + err);
    			res.status(500).end();
    			return;
    		}
    		curUser.favorites = articles;
    		if(complete) {
        		res.json(curUser);
    		}
    		complete = true;
    		
    	});
    	User.find({following: curUser.username}, {username: 1, _id: 0}, function(err, users) {
    		if(err) {
    			console.log("An error when looking for number of followers for " + curUser.username);
    			res.status(500).end();
    			return;
    		}
    		curUser.followers = users.map(function(el) {return el.username;});
    		if(complete) {
    			res.json(curUser);
    		}
    		complete = true;
    		
    	})
    });
});

// delete a user by username, need to be logged in to do this
app.delete("/api/user/:username", auth, function(req, res){
    User.find({username: req.params.username}).remove(function(err, user){
    	if(err) {
    		res.status(500).end();
    		return;
    	} else if(!user.result.n) {
    		res.status(404).end();
    		return;
    	}
    	res.status(200).end();
    	//now we want to go remove this user from all other's following lists
    	User.update({following: req.params.username},
			    { $pull: {following: req.params.username}},
			    {multi: true},
			    function(err, modified) {
			 if(err) {
				 console.error('An error occured when trying to remove a deleted user ' +
						 'from the following list of others: ' + err);
			 }
			 return;
	});
    });
});
 

//add a user to the following list of a user
app.post("/api/user/:username/follow/:tofollow", function(req, res) {
	User.find({username: req.params.tofollow}, function(err, user) {
		if(err) {
			res.status(500).end();
			return;
		} else if(!user.length) {
			res.status(404).end();
			return;
		}
		//we found the user they want to add
		User.update({username: req.params.username},
                { $addToSet: {following: req.params.tofollow}},
                function(err, modified) {
            if(err) {
	    	    res.status(500).end();
	        	return;
	        }
	        res.status(200).end();
        });
	});
});

//remove a user from the following list of a user
app.delete("/api/user/:username/follow/:tounfollow", function(req, res) {
	//don't really care if the tounfollow person is a user or not
	//if they aren't that might mean they deleted their account so could 
	//be useful for logging
	User.update({username: req.params.username},
		        { $pull: {following: req.params.tounfollow}},
		        function(err, modified) {
		     if(err) {
	    		 res.status(500).end();
	    		 return;
	    	 } else if(!modified.nModified) {
	    		 //if nothing was modified then the tounfollow was never on the list
	     		 res.status(404).end();
	     		 return;
	    	 }
	    	 res.status(200).end();
	    	 return;
    });
});

////////////////////////////////////////////////
//Article Endpoints
////////////////////////////////////////////////

//add a story to the favorites list of a user
/* An example input JSON:
{ 
  "author": "beau",
  "HNId": 123,
  "dateCreated": 1171923673,
  "title": "Design Quotations: &#34;And if in fact you do know the e technology is obsolete.&#34;",
  "url": "http://design.caltech.edu/erik/Misc/design_quotes.html" 
}
 */
app.post("/api/user/:username/favorite/:articleId", function(req, res) {

	var toAdd = new Article(req.body);
	//need to make sure we store the relevant info from the article in our DB
	toAdd.save(function(err, article) {
		
		//do not care about the error if it only occurs 
		//because the item already exists, this is fine
		if(err && err.message.indexOf('duplicate key error') == -1) {
			res.status(500).end();
			return;
		}
		//update the set so we don't favorite the same story more than once
		User.update({username: req.params.username},
	                { $addToSet: {favorites: req.params.articleId}},
	                function(err, modified) {
	        if(err) {
		    	res.status(500).end();
		    	return;
		    } else if(!modified.n) {
		    	res.status(404).end();
		    	return;
		    }
		    res.status(200).end();
	    });
	});
});

//remove a favorite from list of a user
app.delete("/api/user/:username/favorite/:articleid", function(req, res) {
	User.update({username: req.params.username},
			    { $pull: {favorites: req.params.articleid}},
			    function(err, modified) {
			 if(err) {
				 res.status(500).end();
				 return;
			 } else if(!modified.nModified) {
				 //if nothing was modified then the articleid was never on the list
				 res.status(404).end();
				 return;
			 }
			 res.status(200).end();
			 return;
	});
});

//given an article id this will return a list of all users that have favorited the article
/* An example response JSON:
{
    "users": [
        {
            "username": "cflood"
        },
        {
            "username": "cjf2xn"
        }
    ]
}
 */
app.get("/api/article/:articleid/usersFavorited", function(req, res) {
	User.find({favorites: req.params.articleid}, {username: 1, _id: 0}, function(err, users) {
		if(err) {
			res.status(500).end();
			return;
		}
		res.json({users: users});
	})
})


////////////////////////////////////////////////
//Comment Endpoints
////////////////////////////////////////////////

//post a comment to a story
/* An example input JSON:
{ 
  "article": {
    "author":"dhouston",
    "descendants":71,
    "HNId":8863,
    "score":111,
    "time":1175714200,
    "title":"My YC app: Dropbox - Throw away your USB drive",
    "type":"story",
    "url":"http://www.getdropbox.com/u/2/screencast.html"
  },
  "comment": {
    "poster":"cjf2xn",
    "article":"12",
    "text":"This is another test comment."
 }
}
 */
app.post("/api/article/:articleid/comment", function(req, res) {
    // need to make sure the article exists first
    var toAdd = new Article(req.body.article);
    // need to make sure we store the relevant info from the article in our DB
    toAdd.save(function(err, article) {

        // do not care about the error if it only occurs
        // because the item already exists, this is fine
        if(err && err.message.indexOf('duplicate key error') == -1) {
            res.status(500).end();
            return;
        }
        var newComment = new Comment(req.body.comment);
        newComment.save(function(err, comment) {
            if(err) {
                res.status(500).end();
                return;
            }
            res.status(200).end();
        });
    });
});

//get a list of all the comments for a story sorted by post time
/* An example response JSON:
[
    {
        "_id": "552e8f1a2cf60f0810778da1",
        "poster": "cjf2xn",
        "article": "12",
        "text": "This is a test comment.",
        "__v": 0,
        "dateCreated": "2015-04-15T16:17:30.888Z"
    },
    {
        "_id": "552edde02a9229800b7ee287",
        "poster": "cjf2xn",
        "article": "12",
        "text": "This is another test comment.",
        "__v": 0,
        "dateCreated": "2015-04-15T21:53:36.072Z"
    }
]
 */
app.get("/api/article/:articleid/comments", function(req, res) {
	Comment.find({article: req.params.articleid}).sort({dateCreated: 1}).exec(function(err, comments) {
		if(err) {
			res.status(500).end();
			return;
		}
		res.json(comments);
		return;
	});
});

//edit a comment given its _id
/* An example input JSON:
{
    "poster": "cjf2xn",
    "article": "12",
    "text": "This is the newer content of the comment.",
    "dateCreated": "2015-04-15T21:53:36.072Z"
}
 */
app.put("/api/article/:articleid/comment/:commentid", function(req, res) {
	Comment.update({_id: req.params.commentid}, req.body, function(err, comment) {
		if(err) {
			res.status(500).end();
			return;
		} else if(!comment.n) {
			res.status(404).end();
			return;
		}
		res.status(200).end();
	});
});

//delete a comment given its _id
app.delete("/api/article/:articleid/comment/:commentid", function(req, res) {
	Comment.findById(req.params.commentid).remove(function(err, removed) {
		if(err) {
			res.status(500).end();
			return;
		} else if(!removed.result.n) {
			res.status(404).end();
			return;
		}
		res.status(200).end();

	});
});

app.listen(port, ip);