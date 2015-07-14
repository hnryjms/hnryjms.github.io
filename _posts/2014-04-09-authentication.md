---
layout: post
title:  "Using Passport.js and Mongoose for Local User Authentication"
date:   2014-04-09
---
Building an authentication system in Node.js can be challenging, especially for
integrating OAuth2.0 and authenticated API-based endpoints. Passport.js is great
for connecting services and for a base to integrate OAuth, but getting
Passport.js set up for an existing Mongoose User model can be a little
challenging. In this guide, you'll see the fastest and easiest way to integrate
Mongoose and Passport.js for local user authentication.

### Adding Libraries & the User Schema

For this tutorial, we're assuming you already have an Express.js project set up.
If you don't, there are countless great guides for getting started with Express
on various websites. After you're set up in Express, you'll need to install a
few libraries that we're going to be using in this project. The following
command should get everything set up and saved into your `package.json` file:

```bash
$ npm install mongoose password-hash passport passport-local connect-flash --save
```

To start our app off, we need to create a user schema with Mongoose. If you're
adding Passport.js into an existing project, you probably already have a
Mongoose schema for users, but make sure to add the `authenticate` static method
into this schema to make implementing Passport a little easier later on. For
this tutorial, we're going to use email addresses rather than usernames (because
in the end, it's one less thing to make our users remember)—you're free to
replace `email` with `username` to ask for usernames instead. Here's the schema
we're using (note that we're automatically hashing the users password):

```js
var Mongoose = require('mongoose');
var Hash = require('password-hash');
var Schema = Mongoose.Schema;

var UserSchema = new Schema({
	email: { type: String },
	password: { type: String, set: function(newValue) {
		return Hash.isHashed(newValue) ? newValue : Hash.generate(newValue);
	} },

	// ... add any other properties you want to save with users ...
});

UserSchema.statics.authenticate = function(email, password, callback) {
	this.findOne({ email: email }, function(error, user) {
		if (user &amp;&amp; Hash.verify(password, user.password)) {
			callback(null, user);
		} else if (user || !error) {
			// Email or password was invalid (no MongoDB error)
			error = new Error("Your email address or password is invalid. Please try again.");
			callback(error, null);
		} else {
			// Something bad happened with MongoDB. You shouldn't run into this often.
			callback(error, null);
		}
	});
};
```

Because we want to keep our code organized, we're adding that new static
function `authenticate(email, password, callback)` to this model for checking if
credentials match a user in our table. We're going to use a callback function
with two parameters, `error, user` (and they'll translate nicely to Passport in
that order).

### Configuring a Passport Strategy

[Passport.js](http://passportjs.org/ _blank) uses Strategies for serving
different sources of users. For example, a Facebook strategy would let your
users sign in with Facebook, and in our case, a **local strategy** will let us
use our own database to store account info. We already have a Mongoose user
schema set up from the last step, so we're ready to write a strategy for
Passport now. We're also going to add a serializer and deserializer, which will
tell Passport how to save the login credentials in the browser session and
retrieve them later, and we're adding the `connect-flash` module into Express so
we can show error messages for invalid credentials.

```js
// ... set up & connect mongoose here ...

var User = mongoose.model(UserSchema);

var passport = require('passport');
var PassportLocalStrategy = require('passport-local');

var authStrategy = new PassportLocalStrategy({
	usernameField: 'email',
	passwordField: 'password'
}, function(email, password, done) {
	User.authenticate(email, password, function(error, user){
		// You can write any kind of message you'd like.
		// The message will be displayed on the next page the user visits.
		// We're currently not displaying any success message for logging in.
		done(error, user, error ? { message: error.message } : null);
	});
});

var authSerializer = function(user, done) {
	done(null, user.id);
};

var authDeserializer = function(id, done) {
	User.findById(id, function(error, user) {
		done(error, user);
	});
};

passport.use(authStrategy);
passport.serializeUser(authSerializer);
passport.deserializeUser(authDeserializer);

// ... continue with Express.js app initialization ...
app.use(require('connect-flash')()); // see the next section
app.use(passport.initialize());
```

### Authenticating Users

By integrating Passport.js, authenticating users is now extremely simple. First,
we're going to need a form that sends an `HTTP-POST` request to our login route
with a `email` field and a `password` field—if they're named incorrectly, the
form **will not work**. You can take care of that form page on your own. We're
going to handle that form with this route:

```js
app.post('/login', passport.authenticate('local', {
	successRedirect: '/home',
	failureRedirect: '/login',
	failureFlash: true
}));
```

Also notice that we're using Flash. We added `connect-flash` into our project,
an extension for displaying one-time messages and objects. With Flash, we're
able to get error info during the next request (presumably for the login form
again), as an array (either empty, or an array filled with a string error
message). You can also use Flash for other kinds of messages, like success
messages, or for persisting any Javascript object. Once a single Flash message
is retrieved by your app with the code below, it will be removed and not
redisplayed. With Flash, everything will be as an array (sometimes empty) for
multiple messages.

```js
app.get('/login', function(req, res, next) {
	var errors = req.flash('error');

	// req.flash('success', 'You can add messages by including a second parameter with the function.');
	
	// ... respond to the request ...
});
```

### Success!

Congratulations on building a new Strategy for authenticating your users in
Passport. Stay tuned for the next article on how to implement OAuth2.0 into a
Mongoose local stategy with Passport. If you have any questions about this
article or find any issues, just let me know on
Twitter—[@hnryjms](https://twitter.com/hnryjms _blank).
