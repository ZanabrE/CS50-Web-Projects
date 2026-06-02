from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import PantryItem, Ingredient
from decimal import Decimal
from django.utils import timezone

@receiver(post_save, sender=User)
def auto_seed_pantry(sender, instance, created, **kwargs):
    # ONLY run this when a new user is actually created
    if created:
        # Define the staples needed to hit that 25% match threshold
        default_items = [
            ("Rolled Oats", "", "grams"),
            ("Whole Milk", "", "ml"),
            ("Honey", "", "grams"),
            ("Chicken Breast", "", "grams"),
            ("White Rice", "", "grams"),
            ("Eggs", "", "pieces"),
            ("Olive Oil", "", "ml"),
            ("Garlic", "", "pieces"),
        ]

        for name, qty, unit, days_out in default_items:
            # Look up the ingredient in your master global pool
            ingredient = Ingredient.objects.filter(name=name).first()
            if ingredient:
                exp_date = timezone.now().date() + timezone.timedelta(days=days_out)
                PantryItem.objects.create(
                    user=instance,
                    ingredient=ingredient,
                    quantity=Decimal(qty),
                    unit=unit,
                    expiration_date=exp_date
                )
