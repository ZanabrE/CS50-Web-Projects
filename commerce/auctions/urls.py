from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path("newlisting", views.newlisting, name="newlisting"),
    path("category_view", views.category_view, name="category_view"),
    path("listingpage/<int:id>", views.listingpage, name="listingpage"),
    path("watchlist", views.watchlist, name="watchlist"),
    path("remove_watchlist/<int:id>", views.remove_watchlist, name="remove_watchlist"),
    path("add_watchlist/<int:id>", views.add_watchlist, name="add_watchlist"),
    path("place_bid/<int:id>", views.place_bid, name="place_bid"),
    path("add_comment/<int:id>", views.add_comment, name="add_comment"),
    path("close_auction/<int:id>", views.close_auction, name="close_auction"),
]
