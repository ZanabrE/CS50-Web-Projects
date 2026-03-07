from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from decimal import Decimal, InvalidOperation

from .models import User, Category, Listing, Bid, Comment

def listingpage(request, id):
    listingData = Listing.objects.get(pk=id)
    isListingInWatchlist = request.user in listingData.watchlist.all()
    allComments = listingData.comments.all() # Using the related name to access comments directly from the listing object
    isOwner = request.user == listingData.owner
    
    # Get the last bid object for this listing, if it exists, and pass it to the template
    last_bid = listingData.bids.order_by('-amount').first()  # Get the highest bid for the listing
    
    # Identify the last bidder, if there is a last bid
    last_bidder = last_bid.bidder if last_bid else None
    
    return render(request, "auctions/listingpage.html", {
        "listings": listingData,
        "isListingInWatchlist": isListingInWatchlist,
        "allComments": allComments,
        "isOwner": request.user == listingData.owner,
        "last_bidder": last_bidder
    })

def close_auction(request, id):
    listingData = Listing.objects.get(pk=id)
    listingData.isActive = False
    listingData.save()
    isListingInWatchlist = request.user in listingData.watchlist.all()
    allComments = Comment.objects.filter(listing=listingData)
    isOwner = request.user == listingData.owner
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
            "updated": True,
            "isListingInWatchlist": request.user in listingData.watchlist.all(),
            "allComments": listingData.comments.all(), # Using the related name to access comments directly from the listing object
            "isOwner": request.user == listingData.owner,
        })

    try:
        # Attempt to convert the bid to a float, if it fails, return an error message
        new_bid_value = Decimal(request.POST['new_bid'])
    except (ValueError, KeyError, InvalidOperation):
        return render(request, "auctions/listingpage.html", {
            "listings": listingData,
            "message": "Invalid bid format.",
            "updated": False,
            "isListingInWatchlist": request.user in listingData.watchlist.all(),
            "allComments": listingData.comments.all(),
            "isOwner": request.user == listingData.owner,
        })
    
    # Check if the new bid is higher than the current price
    if new_bid_value > listingData.price:
        # Update the listing with the new bid
        new_bid_obj = Bid(bidder=request.user, amount=new_bid_value, listing=listingData)
        new_bid_obj.save()
        
        # Update the listing's price to the new bid amount
        listingData.price = new_bid_value
        listingData.save()
        
        return render(request, "auctions/listingpage.html", {
            "listings": listingData,
            "message": "Bid was updated successfully!",
            "updated": True,
            "isListingInWatchlist": request.user in listingData.watchlist.all(),
            "allComments": listingData.comments.all(),
            "isOwner": request.user == listingData.owner,
        })
    else:
        return render(request, "auctions/listingpage.html", {
            "listings": listingData,
            "message": "Your bid must be higher than the current price.",
            "updated": False,
            "isListingInWatchlist": request.user in listingData.watchlist.all(),
            "allComments": listingData.comments.all(),
            "isOwner": request.user == listingData.owner,
        })
        
def add_comment(request, id):
    if request.method == "POST":
        content = request.POST["new_comment"]
        listings = Listing.objects.get(pk=id)
        
        # Create a new comment object and save it to the database
        new_comment = Comment(
            commenter=request.user,
            listing=listings,
            content=content
        )
        new_comment.save()
    return HttpResponseRedirect(reverse("listingpage", args=(id,)))
    

def watchlist(request):
    listings = request.user.user_watchlist.all()
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

def categories(request):
    allCategories = Category.objects.all()
    return render(request, "auctions/categories.html", {
        "categories": allCategories
    })
    
def category_view(request):
    if request.method == "POST":
        category = request.POST.get('category')
        if category:    
            category = Category.objects.get(categoryName=category)
            listings = Listing.objects.filter(category=category, isActive=True)
            return render(request, "auctions/index.html", {
                "listings": listings,
                "category": category
        })
    return HttpResponseRedirect(reverse("categories"))

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
            price=Decimal(price),
            imageURL=image_url,
            owner=current_user,
            category=categoryDetails
        )
        # Saving the new listing
        new_listing.save()
        # Redirecting to index page after successful creation
        return HttpResponseRedirect(reverse("index"))

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
