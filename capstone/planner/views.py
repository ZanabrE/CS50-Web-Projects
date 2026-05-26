from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from datetime import timedelta 
from decimal import Decimal
from .models import Ingredient, PantryItem, Recipe, RecipeIngredient, MealPlan
import json

# Create your views here.
def index(request):
    return render(request, "planner/index.html")

# 1. User authentication controllers
def register_view(request):
    """Handles new user account registration"""
    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect("dashboard")
    else:
        form = UserCreationForm()
    
    # Add Bootstrap styling class directly to fields dynamically
    for field in form.fields.values():
        field.widget.attrs.update({
            'class': 'form-control',
            'placeholder': ' '
        })
    return render(request, "planner/register.html", {"form": form})

def login_view(request):
    """Handles secure session authentication for returning users"""
    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect("dashboard")
    else:
        form = AuthenticationForm()
        # Add Bootstrap styling class directly to fields dynamically
        for field in form.fields.values():
            field.widget.attrs.update({'class': 'form-contro'}) 
            
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
    expiring_items = []
    seen_ingredients = set()

    for item in pantry_items:
        # Safely handle potential model method errors
        try:
            days_left = item.days_until_expiration()
        except:
            days_left = 99
        
        if days_left <= 3:
            if item.ingredient.id not in seen_ingredients:
                expiring_items.append(item)
                seen_ingredients.add(item.ingredient.id)
    
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
                "missing_count": total_ingredients_count - matched_ingredients
            })
            
    # Sort recommendations: highest matching percentages first
    recommended_recipes.sort(key=lambda x: x["match_percentage"], reverse=True)
        
    calendar_days = [
        {"code": "MON", "name": "Monday"},
        {"code": "TUE", "name": "Tuesday"},
        {"code": "WED", "name": "Wednesday"},
        {"code": "THU", "name": "Thursday"},
        {"code": "FRI", "name": "Friday"},
        {"code": "SAT", "name": "Saturday"},
        {"code": "SUN", "name": "Sunday"},
    ]

    # Fetch existing meals already saved by this user
    saved_meals = MealPlan.objects.filter(user=user).select_related('recipe')

    context = {
        "pantry_items": pantry_items,
        "expiring_items": expiring_items,
        "recommended_recipes": recommended_recipes[:6],
        "today": today,
        "calendar_days": calendar_days,  
        "saved_meals": saved_meals,      
    }
        
    return render(request, "planner/index.html", context) 
    
@login_required
def api_add_pantry_item(request):
    """Asysnchronously adds a new item to the user's pantry via a JavaScript POST payload."""
    if request.method == "POST":
        import json
        try:
            data = json.loads(request.body)
            ingredient_id = data.get("ingredient_id")
            quantity = Decimal(str(data.get("quantity", 0.01)))
            unit = data.get("unit","grams")
            expiration_date = data.get("expiration_date")
            
            ingredient = Ingredient.objects.get(id=ingredient_id)
            
            item = PantryItem.objects.create(
                user=request.user,
                ingredient=ingredient,
                quantity=quantity,
                unit=unit,
                expiration_date=expiration_date
            )
            return JsonResponse({
                    "status": "success",
                    "item_id": item.id,
                    "message": f"Added {ingredient.name} successfully."
                }, status=201)
        except (Ingredient.DoesNotExist, Exception) as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)
        
    return JsonResponse({"status": "error", "message": "Invalid request method."}, status=405)

@login_required
def api_delete_pantry_item(request, item_id):
    """Asynchronously deletes an item from the user's pantry via a JavaScript DELETE request."""
    if request.method == "DELETE":
        try:
            item = PantryItem.objects.get(id=item_id, user=request.user)
            item.delete()
            return JsonResponse({"status": "success", "message": "Item removed from inventory."})
        except PantryItem.DoesNotExist:
            return JsonResponse({"status": "error", "message": "Item not found."}, status=404)
    
    return JsonResponse({"status": "error", "message": "Invalid request method."}, status=405)

@login_required
def api_move_meal_plan(request):
    """Updates backend calendar dates asynchronously during frontend drag-and-drop operations."""
    if request.method == "PUT":
        import json
        try:
            data = json.loads(request.body)
            recipe_id = data.get("plan_id")         # Coming from data-recipe-id in the JS.
            day_code = data.get("new_date")      # e.g., "MON", "TUE", etc.
            meal_type = data.get("meal_type")       # e.g., "breakfast", "lunch", "dinner"
            
            # 1. Map frontend day codes to clean database date strings for this current week
            today = timezone.now().date()
            start_of_week = today - timedelta(days=today.weekday()) # Finds Monday
            
            day_offsets = {
                "MON": 0, "TUE": 1, "WED": 2, "THU": 3, "FRI": 4, "SAT": 5, "SUN": 6
            }
            
            # Force matching to uppercase to prevent casing mismatches from frontend
            lookup_code = str(day_code).upper() if day_code else ""
            
            if lookup_code in day_offsets:
                target_date = start_of_week + timedelta(days=day_offsets[lookup_code])
            else:
                return JsonResponse({"status": "error", "message": f"Invalid day code: {day_code}"}, status=400)
                
            # 2. Fetch the recipe being dragged.
            try:
                recipe = Recipe.objects.get(id=recipe_id)
            except Recipe.DoesNotExist:
                return JsonResponse({"status": "error", "message": f"Recipe ID {recipe_id} not found."}, status=404)
            
            # 3. Updated or create the meal plan entry in your calendar matrix.
            plan, created = MealPlan.objects.update_or_create(
                user=request.user,
                date=target_date,      
                meal_type=meal_type,
                defaults={"recipe": recipe}
            )
            
            return JsonResponse({"status": "success", "message": f"{recipe.title} scheduled successfully."})
            
        except Exception as e:
            # Helpful for debugging terminal output
            print(f"Exception encountered: {str(e)}")
            return JsonResponse({"status": "error", "message": str(e)}, status=400)
    
    return JsonResponse({"status": "error", "message": "Invalid request method."}, status=405) 
