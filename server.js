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

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing
													// application/x-www-form-urlencoded
app.use(multer()); // for parsing multipart/form-data
app.use(session({ secret: 'this is the secret' }));
app.use(cookieParser())
app.use(passport.initialize());
app.use(passport.session());

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
app.post("/login", passport.authenticate('local'), function(req, res){
    var user = req.user;
    console.log(user);
    res.json(user);
});

// checks if the user is logged in
app.get('/loggedin', function(req, res)
{
    res.send(req.isAuthenticated() ? req.user : '0');
});

// logs the user out and returns the proper status code
app.post('/logout', function(req, res)
{
    req.logOut();
    res.send(200);
});

// //////////////////////////////////////////////
// User Endpoints
// //////////////////////////////////////////////

// create a new user
app.post('/user', function(req, res)
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
app.get("/users", function(req, res)
{
    User.find({}, {password: 0}, function(err, users)
    {
        res.json(users);
    });
});
}

// get a user by username
app.get("/user/:username", function(req, res)
{
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
app.delete("/user/:username", auth, function(req, res){
    User.find({username: req.params.username}).remove(function(err, user){
    	if(err) {
    		res.status(500).end();
    		return;
    	} else if(!user.result.n) {
    		res.status(404).end();
    		return;
    	}
    	res.status(200).end();
    	//now we want to go remove this user from all other's follower lists
    	User.update({following: req.params.username},
			    { $pull: {following: req.params.username}},
			    {multi: true},
			    function(err, modified) {
			 if(err) {
				 console.log('An error occured when trying to remove a deleted user ' +
						 'from the following list of others: ' + err);
			 }
			 return;
	});
    });
});
 

//add a user to the following list of a user
app.post("/user/:username/follow/:tofollow", function(req, res) {
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
app.delete("/user/:username/follow/:tounfollow", function(req, res) {
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
app.post("/user/:username/favorite/:articleId", function(req, res) {

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
		    }
		    res.status(200).end();
	    });
	});
});

//remove a favorite from list of a user
app.delete("/user/:username/favorite/:articleid", function(req, res) {
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


////////////////////////////////////////////////
//Comment Endpoints
////////////////////////////////////////////////

//post a comment to a story
app.post("/article/:articleid/comment", function(req, res) {
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
app.get("/article/:articleid/comments", function(req, res) {
	Comment.find({article: req.params.articleid}).sort({dateCreated: 1}).exec(function(err, comments) {
		if(err) {
			res.status(500).end();
			return;
		}
		res.json(comments);
		return;
	});
});

//delete a comment given its _id
app.delete("/article/:articleid/comment/:commentid", function(req, res) {
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