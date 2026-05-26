from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

# Create your models here.
class Ingredient(models.Model):
    """
    Global master list of ingredients to ensure naming uniformity
    across pantry items and recipe lookup definitions. 
    """
    CATEGORY_CHOICES = [
        ('produce', 'Produce & Vegetables'),
        ('meat', 'Meat & Seafood'),
        ('dairy', 'Dairy & Eggs'),
        ('pantry', 'Grains, Baking & Pantry'),
        ('spices', 'Spices & Condiments'),
        ('other', 'Other'),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    
    def __str__(self):
        return f"Capstone Ingredient: {self.name}" 
    

class PantryItem(models.Model):
    """
    Tracks private, real-time physical inventory quantities
    and critical expiration tracking for invididual users.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="pantry_items")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT, related_name="pantry_stocks")
    quantity = models.DecimalField(max_digits=6, decimal_places=2, validators=[MinValueValidator(0.01)])
    unit = models.CharField(max_length=20, help_text="e.g., grams, pieces, ml")
    expiration_date = models.DateField()
    date_added = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['expiration_date']
    
    def is_expired(self):
        """Returns True if the item date is strictly before today."""
        return self.expiration_date < timezone.now().date()
    
    def days_until_expiration(self):
        """Calculates delta integer representation for dashboard priority sorting."""
        delta = self.expiration_date - timezone.now().date()
        return delta.days
    
    def __str__(self):
        return f"{self.user.username} - {self.ingredient.name} ({self.quantity} {self.unit})"
    
class Recipe(models.Model):
    """
    Stores cooking profiles containing calculation instructions
    and macro goals evaluated by the matching engine.
    """
    title = models.CharField(max_length=200, unique=True)
    instructions = models.TextField()
    prep_time = models.IntegerField(help_text="Time in minutes", validators=[MinValueValidator(1)])
    calories = models.IntegerField(validators=[MinValueValidator(0)], default=0)
    protein = models.DecimalField(max_digits=5, decimal_places=1, default=0.0, help_text="in grams")
    carbs = models.DecimalField(max_digits=5, decimal_places=1, default=0.0, help_text="in grams")
    fat = models.DecimalField(max_digits=5, decimal_places=1, default=0.0, help_text="in grams")
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title
    
class RecipeIngredient(models.Model):
    """
    Explicit multi-tier join entity connecting required item quantities
    directly to unique Recipe parent classes.
    """
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="recipe_ingredients")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=6, decimal_places=2, validators=[MinValueValidator(0.01)])
    unit = models.CharField(max_length=20)
    
    class Meta:
        unique_together = ('recipe', 'ingredient')
    
    def __str__(self):
        return f"Capstone Map: {self.quantity} {self.unit} of {self.ingredient.name} -> {self.recipe.title}"

    
class MealPlan(models.Model):
    """
    Binds recipes to a unique user account and specific calendar coordinates
    mainpulates by frontend drag-and-drop mechanisms.
    """
    MEAL_CHOICES = [
        ('Breakfast', 'Breakfast'),
        ('Lunch', 'Lunch'),
        ('Dinner', 'Dinner'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="meal_plans")
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE)
    date = models.DateField()
    meal_type = models.CharField(max_length=15, choices=MEAL_CHOICES, default='Dinner')
    
    class Meta:
        ordering = ['date']
        unique_together = ('user', 'date', 'meal_type')
        
    def __str__(self):
        return f"Capstone Schedule ({self.user.username}): {self.recipe.title} on {self.date}"
    