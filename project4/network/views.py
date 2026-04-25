from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render, get_object_or_404
from django.urls import reverse
from django.contrib.auth.decorators import login_required

from .models import User, Post


def index(request):
    # Fetch all posts, ordered by newest first.
    posts = Post.objects.all().order_by("-timestamp")
    return render(request, "network/index.html", {
        "posts": posts
    })


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
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")

# New entries for project 4 below.
@login_required
def create_post(request):
    if request.method == "POST":
        content = request.POST.get("content", "").strip()
        if content: # Only save if there is actual text.
            Post.objects.create(user=request.user, content=content)
        return HttpResponseRedirect(reverse("index"))
    
# Fetching the user's profile.
def profile(request, username):
    # Fetch the user whose profile is being viewed.
    profile_user = get_object_or_404(User, username=username)
    
    # Get all posts from this user in reverse chronological order.
    posts = profile_user.posts.all().order_by("-timestamp")
    
    # Check if the logged-in user is already following this person.
    is_following = False
    if request.user.is_authenticated:
        is_following = profile_user.followers.filter(id=request.user.id).exists()
        
    return render(request, "network/profile.html", {
        "profile_user": profile_user,
        "posts": posts,
        "is_following": is_following,
        "follower_count": profile_user.followers.count(),
        "following_count": profile_user.following.count()
    })
    
# This will implement the follow/unfollow functionality.
@login_required
def toggle_follow(request, username):
    user_to_modify = get_object_or_404(User, username=username)
    
    # Prevent users from follwowing themselves.
    if request.user != user_to_modify:
        if request.user.following.filter(id=user_to_modify.id).exists():
            request.user.following.remove(user_to_modify)
        else:
            request.user.following.add(user_to_modify)
    
    return HttpResponseRedirect(reverse("profile", args=[username]))

