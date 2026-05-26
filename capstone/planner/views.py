from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from datetime import timedelta 
from decimal import Decimal
from django.db.models import Q
from .models import Ingredient, PantryItem, Recipe, RecipeIngredient, MealPlan
import json

# Create your views here.
def index(request):
    """Renders the public landing homepage of the meal planner application."""
    return render(request, "planner/index.html")

# =========================================================================
# 1. USER AUTHENTICATION CONTROLLERS
# =========================================================================

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
    
    # Inject styling helper classes dynamically across all active fields
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
            field.widget.attrs.update({'class': 'form-control'}) 
            
    return render(request, "planner/login.html", {"form": form})

def logout_view(request):
    """Terminates the user session and flushes state hooks."""
    logout(request)
    return redirect("login")

# =========================================================================
# 2. ANALYTICAL MATCHING ENGINE AND DASHBOARD
# =========================================================================

@login_required
def dashboard_view(request):
    """
    Automated Mathematical Matching Engine Backend Core Logic.
    
    Main execution engine. Analyzes private user pantry inventory against
    recipe join tables to dynamically calculate stock matchin precentages.
    """
    
    user = request.user
    today = timezone.now().date()
    
    # Prefetch ingredients to minimize overhead database hits (Avoids N+1 Query Problem)
    pantry_items = PantryItem.objects.filter(user=user).select_related('ingredient')
    
    user_stock = {}
    expiring_items = []
    seen_ingredients = set()

    # Consolidated logic pass loop. This ensures ALL pantry ingredients are counted 
    # for recipe matching, while safely isolating expiring items under a 3-day window threshold.
    for item in pantry_items:
        ing_id = item.ingredient.id
        
        # Aggregate inventory quantities together (handles duplicate items seamlessly)
        if ing_id not in user_stock:
            user_stock[ing_id] = Decimal("0.00")
        user_stock[ing_id] += item.quantity
        
        # Evaluate date metrics to catch critical spoilage candidates
        try:
            days_left = item.days_until_expiration()
        except Exception:
            days_left = 99
        
        if days_left <= 3 and ing_id not in seen_ingredients:
            expiring_items.append(item)
            seen_ingredients.add(ing_id)
    
    # Query recipes and prefetch join table parameters
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
            # Validate user owns the item and satisfies the requested baseline recipe quantity
            if req_ing_id in user_stock and user_stock[req_ing_id] >= req.quantity:
                matched_ingredients += 1
        
        # Quantitative Matching Accuracy Formula Ratio
        match_percentage = int((matched_ingredients / total_ingredients_count) * 100)
        
        # Filter threshold gatekeeping layer (requires minimum 25% completion footprint)
        if match_percentage >= 25:
            recommended_recipes.append({
                "recipe": recipe,
                "match_percentage": match_percentage,
                "missing_count": total_ingredients_count - matched_ingredients
            })
            
    # Sort recommendations: highest matching percentages first
    recommended_recipes.sort(key=lambda x: x["match_percentage"], reverse=True)
        
    # Configuration structure for structural frontend calendar template loops
    calendar_days = [
        {"code": "MON", "name": "Monday"},
        {"code": "TUE", "name": "Tuesday"},
        {"code": "WED", "name": "Wednesday"},
        {"code": "THU", "name": "Thursday"},
        {"code": "FRI", "name": "Friday"},
        {"code": "SAT", "name": "Saturday"},
        {"code": "SUN", "name": "Sunday"},
    ]

    # Fetch scheduled meal plans already saved by this active profile
    saved_meals = MealPlan.objects.filter(user=user).select_related('recipe')
    
    # Map calendar datetime indices into standard layout codes
    day_map = {0: "MON", 1: "TUE", 2: "WED", 3: "THU", 4: "FRI", 5: "SAT", 6: "SUN"}
    for plan in saved_meals:
        plan.day_code = day_map.get(plan.date.weekday(), "MON")

    context = {
        "pantry_items": pantry_items,
        "expiring_items": expiring_items,
        "recommended_recipes": recommended_recipes[:6],  # Constrain UI view window to top 6 hits
        "today": today,
        "calendar_days": calendar_days,  
        "saved_meals": saved_meals,      
    }
    
    return render(request, "planner/dashboard.html", context) 

# =========================================================================
# 3. ASYNCHRONOUS REST API ENDPOINTS
# =========================================================================
  
@login_required
def api_add_pantry_item(request):
    """Asysnchronously adds a new item to the user's pantry via a JavaScript POST payload."""
    if request.method == "POST":
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
        try:
            data = json.loads(request.body)
            recipe_id = data.get("plan_id")      # Coming from data-recipe-id in the JS.
            day_code = data.get("new_date")      # e.g., "MON", "TUE", etc.
            meal_type = data.get("meal_type")    # e.g., "breakfast", "lunch", "dinner"
            
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

def get_recommended_recipes(user):
    """
    Compares active user pantry quantities against recipe needs.
    Generates a dynamic list of matches with percentage values.
    """ 

    # 1. Get all unique ingredients IDs currently sitting in the user's pantry
    # Filter out items that are strictly expired to optimized food safety
    active_pantry = PantryItem.objects.filter(
        user=user,
        expiration_date_gte=timezone.now().date()
    )
    pantry_ingredient_ids = set(active_pantry.values_list('ingredient_id', flat=True))
    
    recommended_pool =[]
    all_recipes = Recipe.objects.prefetch_related('recipe_ingredients__ingredient').all()
    
    for recipe in all_recipes:
        recipe_ingredients = recipe.recipe_ingredients.all()
        total_required_items = recipe_ingredients.count()
        
        if total_required_items == 0:
            continue
        
        # Count how many ingredients for this recipe exist in the user's pantry
        matching_count = 0
        for req  in recipe_ingredients:
            if req.ingredient.id in pantry_ingredient_ids:
                matching_count += 1
                
        # 2. Calculate the match percentage
        match_percentage = int((matching_count / total_required_items) * 100)
        missing_count = total_required_items - matching_count
        
        # 3. Cap the results to your template requirment: Min. 25% match required
        if match_percentage >= 25:
            recommended_pool.append({
                "recipe": recipe,
                "match_percentage": match_percentage,
                "missing_count": missing_count
            })
    
    # 4. Sort pool so highest matches appear at the top of the sidebar matrix
    recommended_pool.sort(key=lambda x: x["match_percentage"], reverse=True)
    return recommended_pool