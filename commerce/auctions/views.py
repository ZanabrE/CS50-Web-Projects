from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse

from .models import User, Category, Listing, Bid, Comment

def listingpage(request, id):
    listingData = Listing.objects.get(pk=id)
    isListingInWatchlist = request.user in listingData.watchlist.all()
    allComments = Comment.objects.filter(listing=listingData)
    isOwner = request.user.username == listingData.owner.username
    return render(request, "auctions/listingpage.html", {
        "listings": listingData,
        "isListingInWatchlist": isListingInWatchlist,
        "allComments": allComments,
        "isOwner": isOwner
    })

def close_auction(request, id):
    listingData = Listing.objects.get(pk=id)
    listingData.isActive = False
    listingData.save()
    isListingInWatchlist = request.user in listingData.watchlist.all()
    allComments = Comment.objects.filter(listing=listingData)
    isOwner = request.user.username == listingData.owner.username
    return render(request, "auctions/listingpage.html", {
        "listings": listingData,
        "isListingInWatchlist": isListingInWatchlist,
        "allComments": allComments,
        "isOwner": isOwner,
        "updated": True,
        "message": "Auction closed successfully."
    })

def place_bid(request, id):
    listingData = Listing.objects.get(pk=id)
     
    if not listingData.isActive:
        return render(request, "auctions/listingpage.html", {
            "listings": listingData,
            "message": "This auction is already closed.",
            "updated": False,
            "isListingInWatchlist": listingData.watchlist.filter(id=request.user.id).exists(),
            "allComments": Comment.objects.filter(listing=listingData),
            "isOwner": request.user == listingData.owner,
        })

    try:
        new_bid = float(request.POST['new_bid'])
    except:
        return render(request, "auctions/listingpage.html", {
            "listings": listingData,
            "message": "Invalid bid format.",
            "updated": False,
            "isListingInWatchlist": request.user in listingData.watchlist.all(),
            "allComments": Comment.objects.filter(listing=listingData),
            "isOwner": request.user.username == listingData.owner.username,
        })

    isListingInWatchlist = request.user in listingData.watchlist.all()
    allComments = Comment.objects.filter(listing=listingData)
    isOwner = request.user.username == listingData.owner.username
    
    if new_bid > listingData.price.bid:
        updateBid = Bid(user=request.user, bid=new_bid)
        updateBid.save()
        listingData.price = updateBid
        listingData.save()
        return render(request, "auctions/listingpage.html", {
            "listings": listingData,
            "message": "Bid was updated successfully!",
            "updated": True,
            "isListingInWatchlist": isListingInWatchlist,
            "allComments": allComments,
            "isOwner": isOwner,
        })
    else:
        return render(request, "auctions/listingpage.html", {
            "listings": listingData,
            "message": "Your bid must be higher than the current price.",
            "updated": False,
            "isListingInWatchlist": isListingInWatchlist,
            "allComments": allComments,
            "isOwner": isOwner,
        })
        
def add_comment(request, id):
    listingData = Listing.objects.get(pk=id)

    # Prevent commenting on closed auctions
    if not listingData.isActive:
        return render(request, "auctions/listingpage.html", {
            "listings": listingData,
            "message": "This auction is closed. Comments are not allowed.",
            "updated": False,
            "isListingInWatchlist": request.user in listingData.watchlist.all(),
            "allComments": Comment.objects.filter(listing=listingData),
            "isOwner": request.user.username == listingData.owner.username,
        })

    user = request.user
    message = request.POST["newComment"]

    newComment = Comment(
        author=user,
        listing=listingData,
        message=message
    )
    newComment.save()

    return HttpResponseRedirect(reverse("listingpage", args=(id,)))

def watchlist(request):
    user = request.user
    #listings = user.user_watchlist.all()
    listings = Listing.objects.filter(watchlist=request.user)
    return render(request, "auctions/watchlist.html", {
        "listings": listings
    })
    
def remove_watchlist(request, id):
    listingData = Listing.objects.get(pk=id)
    user = request.user
    listingData.watchlist.remove(user)
    return HttpResponseRedirect(reverse("listingpage", args=(id,)))

def add_watchlist(request, id):
    listingData = Listing.objects.get(pk=id)
    user = request.user
    listingData.watchlist.add(user)
    return HttpResponseRedirect(reverse("listingpage", args=(id,)))

def index(request):
    active_listings = Listing.objects.filter(isActive=True)
    allCategories = Category.objects.all()
    return render(request, "auctions/index.html", {
        "listings": active_listings,
        "categories": allCategories
    })

def category_view(request):
    if request.method == "POST":
        form = request.POST.get('category')
        if form != '':
            categoryForm = request.POST["category"]
            category = Category.objects.get(categoryName=categoryForm)
            active_listings = Listing.objects.filter(isActive=True, category=category)
            allCategories = Category.objects.all()
            return render(request, "auctions/index.html", {
                "listings": active_listings,
                "categories": allCategories
            })
        else:
            return render(request, "auctions/index.html", {
                "listings": Listing.objects.filter(isActive=True),
                "categories": Category.objects.all(),
            })

def newlisting(request):
    if request.method == "GET":
        allCategories = Category.objects.all()
        return render(request, "auctions/newlisting.html", {
            "categories": allCategories
        })
    else:
        # Getting the form data
        title = request.POST["title"]
        description = request.POST["description"]
        price = request.POST["price"]
        image_url = request.POST["image_url"]
        category = request.POST["category"]

        # Getting the user
        current_user = request.user
        
        # Getting the category object
        categoryDetails = Category.objects.get(categoryName=category)
    
        # Creating and saving the new listing
        new_listing = Listing(
            title=title,
            description=description,
            price=float(price),
            imageURL=image_url,
            owner=current_user,
            category=categoryDetails
        )
        # Saving the new listing
        new_listing.save()
        # Redirecting to index page after successful creation
        return HttpResponseRedirect(reverse(index))

def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "auctions/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "auctions/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"), {
        "message": "Logged out successfully."
    })


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "auctions/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "auctions/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "auctions/register.html")
