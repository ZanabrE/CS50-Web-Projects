import os
import django
import random
from decimal import Decimal
from django.utils import timezone

# Set up Django environment configuration hooks
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "capstone.settings")
django.setup()

from django.contrib.auth.models import User
from planner.models import Ingredient, PantryItem, Recipe, RecipeIngredient

def seed_project_database():
    print("Initializing test infrastructure database seeding...")
    
    PantryItem.objects.all().delete()
    Recipe.objects.all().delete()
    RecipeIngredient.objects.all().delete()
    
     # 1. Fetch or Create a Default Operational User Profile
    user = User.objects.first()
    if not user:
        user = User.objects.create_user(username="testuser", password="password123")
        print("Created default dashboard test profile -> User: testuser | Pass: password123")

    # 2. Bulk Create a Master Global Ingredient Pool
    ingredients_data = [
        # Produce
        ("Rolled Oats", "pantry"), ("Whole Milk", "dairy"), ("Honey", "pantry"),
        ("Chicken Breast", "meat"), ("White Rice", "pantry"), ("Broccoli", "produce"),
        ("Soy Sauce", "spices"), ("Avocado", "produce"), ("Eggs", "dairy"),
        ("Spinach", "produce"), ("Sweet Potatoes", "produce"), ("Olive Oil", "spices"),
        ("Salmon Fillet", "meat"), ("Quinoa", "pantry"), ("Greek Yogurt", "dairy"),
        ("Garlic", "spices"), ("Onions", "produce"), ("Black Beans", "pantry")
    ]
    
    db_ingredients = {}
    for name, cat in ingredients_data:
        ing, _ = Ingredient.objects.get_or_create(name=name, category=cat)
        db_ingredients[name] = ing

    # 3. Give the Active User Initial Pantry Stock (Base Staples)
    # Some items are fresh (expiring in 2 days), some last longer (expiring in 10 days)
    pantry_items_to_add = [
        ("Rolled Oats", "500.00", "grams", 2),
        ("Whole Milk", "1000.00", "ml", 2),
        ("Honey", "300.00", "grams", 10),
        ("Chicken Breast", "800.00", "grams", 2),
        ("White Rice", "2000.00", "grams", 30),
        ("Eggs", "12.00", "pieces", 3),
        ("Olive Oil", "500.00", "ml", 60),
        ("Garlic", "5.00", "pieces", 14),
        ("Sweet Potatoes", "500.00", "grams", 7),
        ("Black Beans", "400.00", "grams", 30),
        ("Onions", "3.00", "pieces", 14),
        ("Salmon Fillet", "150.00", "grams", 3),
        ("Quinoa", "500.00", "grams", 30),
        ("Avocado", "2.00", "pieces", 2),
        ("Spinach", "200.00", "grams", 2),
        ("Broccoli", "300.00", "grams", 3),
        ("Soy Sauce", "250.00", "ml", 60),
        ("Greek Yogurt", "500.00", "grams", 7)
    ]

    for name, qty, unit, days_out in pantry_items_to_add:
        exp_date = timezone.now().date() + timezone.timedelta(days=days_out)
        
        # Use filter and first() to safely handle pre-existing duplicate test data
        existing_item = PantryItem.objects.filter(user=user, ingredient=db_ingredients[name]).first()
        
        if existing_item:
            # Update the first one found to match our new seed variables
            existing_item.quantity = Decimal(qty)
            existing_item.unit = unit
            existing_item.expiration_date = exp_date
            existing_item.save()
        else:
            # Create a brand new item entry if it doesn't exist yet
            PantryItem.objects.create(
                user=user,
                ingredient=db_ingredients[name],
                quantity=Decimal(qty),
                unit=unit,
                expiration_date=exp_date
            )

    # 4. Define Automated Mock Recipe Blueprints
    # Mixing owned pantry items with unowned items forces varied matching tiers
    recipe_blueprints = [
        {
            "title": "Protein Oatmeal",
            "instructions": "Boil oats in milk until creamy. Drizzle with honey.",
            "ingredients": [("Rolled Oats", "50.00", "grams"), ("Whole Milk", "200.00", "ml"), ("Honey", "15.00", "grams")]
        },
        {
            "title": "Garlic Chicken & Rice",
            "instructions": "Pan-fry chicken with minced garlic in olive oil. Serve over cooked rice.",
            "ingredients": [("Chicken Breast", "200.00", "grams"), ("White Rice", "100.00", "grams"), ("Garlic", "1.00", "pieces"), ("Olive Oil", "15.00", "ml")]
        },
        {
            "title": "Chicken Broccoli Stir-Fry",
            "instructions": "Stir-fry chicken and broccoli. Season with soy sauce and serve over rice.",
            "ingredients": [("Chicken Breast", "200.00", "grams"), ("White Rice", "100.00", "grams"), ("Broccoli", "150.00", "grams"), ("Soy Sauce", "20.00", "ml")]
        },
        {
            "title": "Salmon Quinoa Bowl",
            "instructions": "Bake salmon fillet. Serve over cooked quinoa with sliced avocado.",
            "ingredients": [("Salmon Fillet", "150.00", "grams"), ("Quinoa", "80.00", "grams"), ("Avocado", "0.50", "pieces")]
        },
        {
            "title": "Protein Power Scramble",
            "instructions": "Scramble eggs with chicken strips and fresh spinach leaves.",
            "ingredients": [("Eggs", "3.00", "pieces"), ("Chicken Breast", "100.00", "grams"), ("Spinach", "50.00", "grams")]
        },
        {
            "title": "Sweet Potato and Black Bean Hash",
            "instructions": "Dice sweet potatoes and sauté with onions and black beans until soft.",
            "ingredients": [("Sweet Potatoes", "200.00", "grams"), ("Black Beans", "150.00", "grams"), ("Onions", "0.50", "pieces"), ("Olive Oil", "10.00", "ml")]
        },
        {
            "title": "Honey Garlic Salmon",
            "instructions": "Glaze salmon fillets with warm honey and minced garlic.",
            "ingredients": [("Salmon Fillet", "300.00", "grams"), ("Honey", "30.00", "grams"), ("Garlic", "2.00", "pieces")]
        }
    ]

    # 5. Loop Through and Seed Recipes Instantly
    for bp in recipe_blueprints:
        recipe, created = Recipe.objects.get_or_create(
            title=bp["title"],
            defaults={
                "instructions": bp["instructions"],
                "prep_time": random.randint(10, 35),
                "calories": random.randint(300, 750),
                "protein": Decimal(str(random.randint(15, 45))),
                "carbs": Decimal(str(random.randint(20, 60))),
                "fat": Decimal(str(random.randint(5, 25)))
            }
        )
        
        # Connect ingredients to the specific recipe
        for ing_name, qty, unit in bp["ingredients"]:
            RecipeIngredient.objects.get_or_create(
                recipe=recipe, 
                ingredient=db_ingredients[ing_name],
                defaults={"quantity": Decimal(qty), "unit": unit}
            )

    print(f"Successfully seeded testing modules. Total recipes tracked: {Recipe.objects.count()}")

if __name__ == "__main__":
    seed_project_database()
