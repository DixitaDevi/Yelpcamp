var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
var middleware = require("../middleware");
var User = require("../models/user");
var Notification = require("../models/notification");

//INDEX - show all campgrounds
router.get("/", function (req, res){
    var noMatch = null;
    if(req.query.search){
        var perPage = 8;
        var pageQuery = parseInt(req.query.page);
        var pageNumber = pageQuery ? pageQuery : 1;
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec( function (err, allCampgrounds) {
            Campground.estimatedDocumentCount().exec(function (err, count) {
                if (err) {
                    res.redirect("back");
                } else {
                    if(allCampgrounds.length < 1) {
                        noMatch = "No campgrounds match that query, please try again.";
                    }
                    res.render("campgrounds/index", {
                        campgrounds: allCampgrounds, 
                        noMatch: noMatch,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage)
                    });
                }
            });
        
        });
    }
    var perPage = 8;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    Campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds){
        Campground.estimatedDocumentCount().exec(function (err, count) {
            if (err) {
                console.log(err);
            } else {
                res.render("campgrounds/index", {
                    campgrounds: allCampgrounds,
                    noMatch: noMatch,
                    current: pageNumber,
                    pages: Math.ceil(count / perPage)
            });
            }
        });
    });
});


//CREATE - add new campgrounds to database
router.post("/", middleware.isLoggedIn, async function(req, res){
    var name = req.body.name;
    var price = req.body.price;
    var image = req.body.image;
    var desc = req.body.description;
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    var newCampground = {name: name, price: price, image: image, description: desc, author: author};
    try {
        let campground = await Campground.create(newCampground);
        let user = await User.findById(req.user._id).populate('followers').exec();
        let newNotification = {
          username: req.user.username,
          campgroundId: campground.id
        }
        for(const follower of user.followers) {
          let notification = await Notification.create(newNotification);
          follower.notifications.push(notification);
          follower.save();
        }
  
        //redirect back to campgrounds page
        req.flash("success", "Campground created successfully!");
        res.redirect("/campgrounds");
      } catch(err) {
        req.flash('error', err.message);
        res.redirect('back');
      }
  });

//NEW - show form to create new campground
router.get("/new", middleware.isLoggedIn, function(req, res){
    res.render("campgrounds/new");
});

//SHOW - shows more info about one campground
router.get("/:id", function(req, res){
    Campground.findById(req.params.id).populate("comments likes").exec(function (err, foundCampground) {
        if(err){
            console.log(err);
            req.flash("error", "Something went wrong");
        }
        else{
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });    
});

//EDIT Campground
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req,res){
        Campground.findById(req.params.id, function(err, foundCampground){
                res.render("campgrounds/edit", {campground: foundCampground});
        });
});


//UPDATE Campground
router.put("/:id", middleware.checkCampgroundOwnership, function(req, res){
   Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground){
       if(err){
        req.flash("error", "Something went wrong");
           res.redirect("/campgrounds");
       }
       else{
           req.flash("success", "Campground updated successfully!");
           res.redirect("/campgrounds/"+ req.params.id);
       }
   }); 
});


//DESTOY Campground
router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res){
    Campground.findByIdAndRemove(req.params.id, function(err){
        if(err){
            req.flash("error", "Something went wrong");
            res.redirect("/campgrounds");
        }else{
            req.flash("error", "Campground deleted!");
            res.redirect("/campgrounds");
        }
    });
});


//LIKE Campground
router.post("/:id/like", middleware.isLoggedIn, function (req, res) {
    Campground.findById(req.params.id, function (err, foundCampground) {
        if (err) {
            console.log(err);
            return res.redirect("/campgrounds");
        }

        // check if req.user._id exists in foundCampground.likes
        var foundUserLike = foundCampground.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
            foundCampground.likes.pull(req.user._id);
        } else {
            // adding the new user like
            foundCampground.likes.push(req.user);
        }

        foundCampground.save(function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/campgrounds");
            }
            return res.redirect("/campgrounds/" + foundCampground._id);
        });
    });
});

// Define escapeRegex function for search feature
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;