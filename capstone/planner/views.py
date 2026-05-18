from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from decimal import Decimal
from .models import Ingredient, PantryItem, Recipe, RecipeIngredient, MealPlan

# Create your views here.
def index(request):
    return render(request, "planner/index.html")

# 1. User authentication controllers
def register_view(request):
    """Handles new user account registration"""
    if reuqest.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect("dashboard")
    else:
        form = UserCreationForm()
    return render(request, "planner/register.html", {"form": form})

def login_view(request):
    """Handles secure session authentication for returning users"""
    if reuqest.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect("dashboard")
    else:
        form = AuthenticationForm()
    return render(request, "planner/login.html", {"form": form})

def logout_view(request):
    """Terminates the user session and flushes state hooks."""
    logout(request)
    return redirect("login")

# 2. Analytical matching engine and dashboard.
@login_required
def dashboard_view(request):
    """
    Main execution engine. Analyzes private user pantry inventory against
    recipe join tables to dynamically calculate stock matchin precentages.
    """
    
    user = request.user
    today = timezone.now().date()
    
    # Fetch user's pantry items and prefetch ingredients to avoid N+1 queries
    pantry_items = PantryItem.objects.filter(user=user).select_related('ingredient')
    
    # Identify critical items expiring within the next 3 days
    expiring_items = [item for item in pantry_items if item.days_until_expiration() <= 3]
    
    # Build a flattered dictionary mapping avaiable ingredients to their total quantities
    user_stock = {}
    for item in pantry_items:
        ing_id = item.ingredient.id
        if ing_id not in user_stock:
            user_stock[ing_id] = Decimal("0.00")
        user_stock[ing_id] += item.quantity
    
    # Run the matching algorithm across all system recipes
    all_recipes = Recipe.objects.prefetch_related('recipe_ingredients__ingredient')
    recommended_recipes = []
    
    for recipe in all_recipes:
        requirements = recipe.recipe_ingredients.all()
        if not requirements:
            continue  
        
        matched_ingredients = 0
        total_ingredients_count = len(requirements)
        
        for req in requirements:
            req_ing_id = req.ingredient.id
            # Check if user owns the ingredient and has a sufficient quantity
            if req_ing_id in user_stock and user_stock[req_ing_id] >= req.quantity:
                matched_ingredients += 1
        
        # Calculate matching accuracy ration percentage
        match_percentage = int((matched_ingredients / total_ingredients_count) * 100)
        
        # Keep recipes that have a solid match footprint
        if match_percentage >= 25:
            recommended_recipes.append({
                "recipe": recipe,
                "match_percentage": match_percentage,
                "missing_count": total_ingredients_count - matched_ingredients_count
            })
            
        # Sort recommendations: highest matching percentages first
        recommended_recipes.sort(key=lambda x: x["match_percentage"], reverse=True)
        
        context = {
            "pantry_items": pantry_items,
            "expiring_items": expiring_items,
            "recommended_recipes": recommended_recipes[:6],
            "today": today
        }
        
        return render(request, "index.html", context)