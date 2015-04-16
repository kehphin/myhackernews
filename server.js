var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');
var passport      = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var cookieParser  = require('cookie-parser');
var session       = require('express-session');
var mongoose      = require('mongoose');
var https         = require('https');
var crypto        = require('crypto');

var connectionString = process.env.OPENSHIFT_MONGODB_DB_URL || 'mongodb://localhost/test';
var ip = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var port = process.env.OPENSHIFT_NODEJS_PORT || 3000;

var db = mongoose.connect(connectionString);


// //////////////////////////////////////////////
// MODELS
// //////////////////////////////////////////////
var UserSchema = new mongoose.Schema({
    username: {type: String, required: true, unique: true, index: true},
    password: {type: String, required: true},
    following: [String],
    favorites: [String]
    });

var User = mongoose.model('User', UserSchema);

var ArticleSchema = new mongoose.Schema({
	HNId: {type: String, unique: true, required: true, index: true},
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
	article: {type: String, required: true, index: true}
});

var Comment = mongoose.model('Comment', CommentSchema);


// //////////////////////////////////////////////
// Configure Express
// //////////////////////////////////////////////

//this function is used as middleware to log the request type,
//path and body of all requests
function logRequestBody(req, res, next) {
	var body = JSON.stringify(req.body);
	var toLog = req.method + ' path=' + req.originalUrl;
	//don't want to log passwords
	if(body.indexOf('password') == -1) {
		toLog += ' body=' + body;
	}
	console.log(toLog);
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
app.use(logRequestBody); //for logging requests
app.use(express.static(__dirname + '/public'));


// //////////////////////////////////////////////
// Passport Functions
// //////////////////////////////////////////////

//wrapper around the hashing function with the iterations and length hardcoded
//to be consistent when calling
function hashPassword(password, salt, callback) {
	crypto.pbkdf2(password, salt, 10, 32, callback);
}

passport.use(new LocalStrategy(
function(username, password, done)
{
	//ideally we run this server under HTTPS so that the request
	//bodies are encrypted so the passwords don't transmit in plaintext
    User.findOne({username: username}, function(err, user) {
    	hashPassword(password, username, function(err, key) {
    		if (err) {
    			return done(err);
    		}
            if (!user) {
            	return done(null, false);
            }
            if(!(key.toString('hex') == user.password)) {
            	return done(null, false);
            }
            return done(null, user);
    	});
    });
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
//don't currently use this but leaving it in
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
/* An example input JSON:
{
    "username":"cflood",
    "password":"foobar"
}
An example response JSON:
{
    "_id": "552dc8c706de35e41a298624",
    "username": "cflood",
    "password": "chris",
    "__v": 0,
    "favorites": [
        "123",
        "8863"
    ],
    "following": [
        "cjf2xn"
    ]
}
 */
app.post("/api/login", passport.authenticate('local'), function(req, res){
    var user = req.user;
    console.log(user);
    res.json(user);
});

// checks if the user is logged in
//if the user is not logged in then it receives the integer 0
//if the user is logged in then it receives the user document from mongo
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
    hashPassword(newUser.password, newUser.username, function(err, key) {
    	newUser.password = key.toString('hex');
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
    		            //don't want to transmit the password back over the wire
    		            user.password = null;
    		            res.json(user);
    		        });
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
	//{password: 0} tells mongo to omit the password field in any return documents
    User.find({username: req.params.username}, {password: 0}, function(err, user)
	{
    	if(err) {
    		res.status(500).end();
    		return;
    	//if no users exist with the username return 404
    	} else if(!user.length) {
    		res.status(404).end();
    		return;
    	}
    	//need to do a find for all HNId's in the favorited section
    	//Mongoose has some control over when the object is sent in the request and since we want
    	//to add the followers field on our own below we need to make a copy of the object
    	//quick clone of the object
    	var curUser = JSON.parse(JSON.stringify(user[0]));
    	//make 2 async requests so only want to return to client when both requests have come back
    	var complete = false;
    	//want to find all articles which the user has favorited
    	//lookup by HNId
    	Article.find({HNId: { $in: curUser.favorites}}, function(err, articles) {
    		if(err) {
    			console.log("The error when looking by HNId for favorites is " + err);
    			res.status(500).end();
    			return;
    		}
    		//set the favorites field to contain the list of article documents
    		curUser.favorites = articles;
    		//complete is true if the other async already returned so send data to client
    		if(complete) {
        		res.json(curUser);
    		}
    		//let the other function know we have returned
    		complete = true;

    	});
    	//find all users that follow our current user, these are the 'followers'
    	//{username: 1, _id: 0} tells mongo to only return the username field in the document and to omit
    	//_id field which comes by default
    	User.find({following: curUser.username}, {username: 1, _id: 0}, function(err, users) {
    		if(err) {
    			console.log("An error when looking for number of followers for " + curUser.username);
    			res.status(500).end();
    			return;
    		}
    		//set the followers field to a list of usernames
    		//the map is used to get rid of the JSON and just have a list of usernames
    		curUser.followers = users.map(function(el) {return el.username;});
    		//complete is true if the other async already returned so send data to client
    		if(complete) {
    			res.json(curUser);
    		}
    		//let the other function know we have returned
    		complete = true;
    	});
    });
});

// delete a user by username, need to be logged in to do this
app.delete("/api/user/:username", auth, function(req, res){
    User.find({username: req.params.username}).remove(function(err, user){
    	if(err) {
    		res.status(500).end();
    		return;
        //if the delete did not modify the collection in any way then no user matched so send a 404
    	} else if(!user.result.n) {
    		res.status(404).end();
    		return;
    	}
    	res.status(200).end();
    	//now we want to go remove this user from any other user's following list because of the deletion
    	User.update({following: req.params.username},
    			//pull removes the req.params.username from the following array
			    { $pull: {following: req.params.username}},
			    //multi tells mongo to update multiple documents if they match the find query
			    {multi: true},
			    function(err, modified) {
			 if(err) {
				 console.error('An error occured when trying to remove a deleted user ' +
						 'from the following list of others: ' + err);
			 }
	    });
    });
});


//add a user to the following list of a user
app.post("/api/user/:username/follow/:tofollow", function(req, res) {
	User.find({username: req.params.tofollow}, function(err, user) {
		if(err) {
			res.status(500).end();
			return;
		//if no users match then return 404
		} else if(!user.length) {
			res.status(404).end();
			return;
		}
		//we found the user they want to add
		User.update({username: req.params.username},
				//addToSet adds the req.params.tofollow to the array only if it does not already contain it
				//prevents same item added more than once
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
			    //pull removes the req.params.tounfollow from the favorites array
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
    });
});

////////////////////////////////////////////////
//Article Endpoints
////////////////////////////////////////////////

//add a story to the favorites list of a user
/* An example input JSON:
{
  "author": "beau",
  "HNId": "123",
  "dateCreated": "1171923673",
  "title": "Design Quotations: &#34;And if in fact you do know the e technology is obsolete.&#34;",
  "url": "http://design.caltech.edu/erik/Misc/design_quotes.html"
}
 */
app.post("/api/user/:username/favorite/:articleId", function(req, res) {

	var toAdd = new Article(req.body);
    console.log(req.body);
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
				    //addToSet adds the req.params.articleid to the favorites array
				    //if it does not already contain it
	                { $addToSet: {favorites: req.params.articleId}},
	                function(err, modified) {
            console.log(modified.n);
	        if(err) {
		    	res.status(500).end();
		    	return;
		    //if nothing was modified then it didn't contain it so return 404
		    } else if(!modified.n) {
                console.log("asdfasdfas");
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
			    //pull removes the req.params.articleid from the favorites array
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
	//{username: 1, _id: 0} tells mongo to only return the username field in documents that match
	User.find({favorites: req.params.articleid}, {username: 1, _id: 0}, function(err, users) {
		if(err) {
			res.status(500).end();
			return;
		}
		//return a list of the usernames which have favorited the indicated article
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
	//want to sort the comments from oldest to newest
	Comment.find({article: req.params.articleid}).sort({dateCreated: 1}).exec(function(err, comments) {
		if(err) {
			res.status(500).end();
			return;
		}
		res.json(comments);
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
	//want to replace the comment at _id with the body of the request
	Comment.update({_id: req.params.commentid}, req.body, function(err, comment) {
		if(err) {
			res.status(500).end();
			return;
	    //if nothing was found for the _id then return a 404
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
		//if nothing was removed then return a 404
		} else if(!removed.result.n) {
			res.status(404).end();
			return;
		}
		res.status(200).end();

	});
});

//start the server
app.listen(port, ip);