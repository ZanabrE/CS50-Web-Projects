from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from planner.models import Ingredient, PantryItem, Recipe, RecipeIngredient, MealPlan

# Create your tests here.
class CapstoneModelTest(TestCase):
    
    def setUp(self):
        """Set up standard baseline test records before each evaluation routine."""
        # 1. Create a test user
        self.user = User.objects.create_user(username='testuser', password='securepassword123')
        
        # 2. Create sample ingredients
        self.spinach = Ingredient.objects.create(name="Fresh Spinach", category="produce")
        self.chicken = Ingredient.objects.create(name="Chicken Breast", category="meat")
        
        # 3. Create a sample Recipe
        self.recipe = Recipe.objects.create(
            title="Garlic Chicken Spinach",
            instructions="Cook chicken. Toss in spinach and garlic.",
            prep_time=20,
            calories=350,
            protein=Decimal("40.0"),
            carbs=Decimal("5.0"),
            fat=Decimal("12.0")
        
        )
    
    def test_ingredient_creation(self):
        """Validates that ingredients register with unique constraints and correct string mapping."""
        self.assertEqual(str(self.spinach), "Capstone Ingredient: Fresh Spinach")
        self.assertEqual(self.spinach.category, "produce")
    
    def test_pantry_item_expiration_logic(self):
        """Ensures math metrics calculate correct days-remaining thresholds and flag expired items."""
        today = timezone.now().date()
        
        # Create and unexpired item (expires in 3 days)
        fresh_item = PantryItem.objects.create(
            user=self.user,
            ingredient=self.spinach,
            quantity=Decimal("200.00"),
            unit="grams",
            expiration_date=today + timedelta(days=3)
        )
        
        # Create an expired item (expired 2 days ago)
        expired_item = PantryItem.objects.create(
            user=self.user,
            ingredient=self.chicken,
            quantity=Decimal("500.00"),
            unit="grams",
            expiration_date=today - timedelta(days=2)
        )
        
        # Evaluate calculations
        self.assertFalse(fresh_item.is_expired())
        self.assertEqual(fresh_item.days_until_expiration(), 3)
        
        self.assertTrue(expired_item.is_expired())
        self.assertEqual(expired_item.days_until_expiration(), -2)
        
    def test_pantry_item_min_quantity_validation(self):
        """Ensures quantities below 0.01 raise explicit validation errors."""
        today = timezone.now().date()
        invalid_item = PantryItem(
            user=self.user,
            ingredient=self.spinach,
            quantity=Decimal("0.00"),
            unit="grams",
            expiration_date=today
        )
        with self.assertRaises(ValidationError):
            invalid_item.full_clean()
            
    def test_recipe_ingredient_join_table(self):
        """Verifies relational linking structure maps accurately accross tables."""
        mapping = RecipeIngredient.objects.create(
            recipe=self.recipe,
            ingredient=self.spinach,
            quantity=Decimal("150.00"),
            unit="grams"
        )
        self.assertEqual(
            str(mapping),
            "Capstone Map: 150.00 grams of Fresh Spinach -> Garlic Chicken Spinach"
        )
    
    def test_meal_plan_scheduling(self):
        """Ensures meal calendar entities bind coordinates cleanly to timeline entries."""
        target_date = timezone.now().date() +timedelta(days=1)
        plan = MealPlan.objects.create(
            user=self.user,
            recipe=self.recipe,
            date=target_date
        )
        self.assertEqual(
            str(plan),
            f"Capstone Schedule (testuser): Garlic Chicken Spinach on {target_date}"
        )