from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse

from .models import User, Category, Listing, Bid, Comment

def listingpage(request, id):
    return render(request, "auctions/listingpage.html")

def index(request):
    active_listings = Listing.objects.filter(isActive=True)
    allCategories = Category.objects.all()
    return render(request, "auctions/index.html", {
        "listings": active_listings,
        "categories": allCategories
    })

def category_view(request):
    if request.method == "POST":
        categoryForm = request.POST["category"]
        category = Category.objects.get(categoryName=categoryForm)
        active_listings = Listing.objects.filter(isActive=True, category=category)
        allCategories = Category.objects.all()
        return render(request, "auctions/index.html", {
            "listings": active_listings,
            "categories": allCategories
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
