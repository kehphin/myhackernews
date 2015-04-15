var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');
var passport      = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var cookieParser  = require('cookie-parser');
var session       = require('express-session');
var mongoose      = require('mongoose');
var http          = require('http');

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
        res.send(401);
    else
        next();
};

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

// get a list of all users, just for testing probably should take this out
// TODO
app.get("/users", function(req, res)
{
    User.find({}, {password: 0}, function(err, users)
    {
        res.json(users);
    });
});

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
        res.json(user);
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
    });
});


app.listen(port, ip);