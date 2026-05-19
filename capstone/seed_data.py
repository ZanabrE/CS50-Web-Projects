import os
import django
from decimal import Decimal
from django.utils import timezone

# Set up Django environment configuration hooks
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "capstone.settings")
django.setup()

from django.contrib.auth.models import User
from planner.models import Ingredient, PantryItem, Recipe, RecipeIngredient

def seed_project_database():
    print("Initializing test infrastructure database seeding...")
    
    # 1. Create a Master Global Ingredient Pool
    oats, _ = Ingredient.objects.get_or_create(name="Rolled Oats", category="pantry")
    milk, _ = Ingredient.objects.get_or_create(name="Whole Milk", category="dairy")
    honey, _ = Ingredient.objects.get_or_create(name="Honey", category="pantry")
    
    # 2. Create a Mock Recipe (Requires Oats and Milk)
    recipe, _ = Recipe.objects.get_or_create(
        title="Protein Oatmeal",
        instructions="Boil oats in milk until creamy. Drizzle with honey.",
        prep_time=10,
        calories=350,
        protein=Decimal("15.0"),
        carbs=Decimal("45.0"),
        fat=Decimal("6.0")
    )
    
    # Map required ingredient items to your parent recipe structural profile
    RecipeIngredient.objects.get_or_create(recipe=recipe, ingredient=oats, quantity=Decimal("50.00"), unit="grams")
    RecipeIngredient.objects.get_or_create(recipe=recipe, ingredient=milk, quantity=Decimal("200.00"), unit="ml")
    RecipeIngredient.objects.get_or_create(recipe=recipe, ingredient=honey, quantity=Decimal("15.00"), unit="grams")
    
    # 3. Fetch or Create a Default Operational User Profile
    user = User.objects.first()
    if not user:
        user = User.objects.create_user(username="testuser", password="password123")
        print("Created default dashboard test profile -> User: testuser | Pass: password123")
        
    # 4. Give the active user stock matching requirements (100% Match footprint)
    future_date = timezone.now().date() + timezone.timedelta(days=2) # Triggers expiration warning dialog
    PantryItem.objects.get_or_create(user=user, ingredient=oats, quantity=Decimal("500.00"), unit="grams", expiration_date=future_date)
    PantryItem.objects.get_or_create(user=user, ingredient=milk, quantity=Decimal("1000.00"), unit="ml", expiration_date=future_date)
    PantryItem.objects.get_or_create(user=user, ingredient=honey, quantity=Decimal("300.00"), unit="grams", expiration_date=future_date)

    print("Successfully seeded testing modules. Restart your server and evaluate.")

if __name__ == "__main__":
    seed_project_database()

