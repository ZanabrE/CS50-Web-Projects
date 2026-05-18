from django.urls import path
from . import views

urlpatterns = [
    # Main dashbaord page.
    path('', views.dashboard_view, name='dashboard'),
    
    # User authentication paths.
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    
    # Asynchronous REST API Endpoints for JavaScript Operations.
    path('api/pantry/add/', views.api_add_pantry_item, name='api_add_pantry_item'),
    path('api/pantry/delete/<int:item_id>/', views.api_delete_pantry_item, name='api_delete_pantry_item'),
    path('api/calendar/move/', views.api_move_meal_plan, name='api_move_meal_plan'),
]
