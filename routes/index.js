var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");
var Campground = require("../models/campground");
var Notification = require("../models/notification");
var middleware = require("../middleware");


//Root Route
router.get("/", function(req, res){
    res.render("landing");
});


//REGISTER FORM
router.get("/register", function(req, res){
    res.render("register");
});

//Sign Up
router.post("/register", function(req, res){
    var newUser = new User({
        username: req.body.username, 
        firstName: req.body.firstName, 
        lastName: req.body.lastName, 
        email: req.body.email
    });
    if(req.body.adminCode === "secretcode123"){
        newUser.isAdmin = true;
    }
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            return res.render("register", {"error": err.message});
        }
        passport.authenticate("local")(req, res, function(){
            req.flash("success", "Welcome to YelpCamp "+ user.username);
            res.redirect("/campgrounds");
        });
    });
});

//LOGIN FORM
router.get("/login", function(req, res){
    res.render("login");
});

//Login
router.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/campgrounds",
        failureRedirect: "/login"
    }), function(req, res){
});

//Logout
router.get("/logout", function(req, res){
    req.logout();
    req.flash("success", "Logged You Out.!!");
    res.redirect("/campgrounds");
});


//USER Profiles
router.get("/users/:id", function(req, res){
    User.findById(req.params.id).populate('followers').exec(function(err, foundUser){
        if(err){
            req.flash("error", "Something went wrong");
            res.redirect("back");
        }
        Campground.find().where('author.id').equals(foundUser._id).exec(function(err, campgrounds){
            if(err){
                req.flash("error", "Something went wrong");
                res.redirect("back");
            }
            res.render("users/show", {user: foundUser, campgrounds: campgrounds}); 
        });
    })
});

//FOLLOW User
router.post('/follow/:id', middleware.isLoggedIn, function(req, res) {
        var user = User.findById(req.params.id, function(err, foundFollower){
        if(err){
            req.flash('error', err.message);
            res.redirect('back');
        
        }
        var foundUserFollower = foundFollower.followers.some(function(follower) {
            return follower.equals(req.user._id);
        });

        if (foundUserFollower) {
            foundFollower.followers.pull(req.user._id);
        } else {
            foundFollower.followers.push(req.user._id);
        }
        foundFollower.save();
        req.flash('success', 'Successfully followed ' + foundFollower.username + '!');
        res.redirect('/users/' + req.params.id);
        });
  });
  
//VIEW notifications
router.get('/notifications', middleware.isLoggedIn, async function(req, res) {
    try {
      let user = await User.findById(req.user._id).populate({
        path: 'notifications',
        options: { sort: { "_id": -1 } }
      }).exec();
      let allNotifications = user.notifications;
      res.render('notifications/index', { allNotifications });
    } catch(err) {
      req.flash('error', err.message);
      res.redirect('back');
    }
  });
  
//HANDLE notification
router.get('/notifications/:id', middleware.isLoggedIn, async function(req, res) {
    try {
      let notification = await Notification.findById(req.params.id);
      notification.isRead = true;
      notification.save();
      res.redirect(`/campgrounds/${notification.campgroundId}`);
    } catch(err) {
      req.flash('error', err.message);
      res.redirect('back');
    }
  });
  


module.exports = router;
