
from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path("create",views.create_post, name="create_post"),
    path("profile/<str:username>", views.profile, name="profile"),
    path("toggle_follow/<str:username>", views.toggle_follow, name="toggle_follow"),
    path("following", views.following, name="following"),
    path("like/<int:post_id>", views.toggle_like, name="toggle_like"),
    path("edit/<int:post_id>", views.edit_post, name="edit_post"),
]
