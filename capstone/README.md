# Capstone Final Project: Smart Meal Planner & Food Waste Optimizer

## Distinctiveness and Complexity



## File Directory Documentation
* **models.py**: Defines core application objects including Ingredients, Recipe, RecipeIngredient, PantryItem, and MealPlan.
* **views.py**: Handles authentication routines, JSON API endpoints for macro processing, and the primary matching optimization algorithm.
* **static/js/calendar.js**: Coordinates client-side drag-and-drop grid mechanics, state changes, macro target updates, and asynchronous FETCH updates.
* **templates/layout.html**: Establishes global mobile-responsive UI frameworks and structural application shells.
[Document every single asset, style, template, or test suite file you manually authored].

## Installation and Execution Instructions
1. Clone this repository locally - `git clone <paste-your-repository-url-here>`
2. Initialize a clean Python virtual environment: `python -m venv env`
3. Activate the environment and install assets: `pip install -r requirements.txt`
4. Execute core database schema creation: `python manage.py migrate`
5. Launch the backend local instance: `python manage.py runserver`
