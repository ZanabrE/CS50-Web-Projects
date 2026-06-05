# Capstone Final Project: Smart Meal Planner & Food Waste Optimizer

#### Video Demo: <INSERT_YOUR_YOUTUBE_LINK_HERE>

## Distinctiveness and Complexity

### Distinctiveness
The Smart Meal Planner & Food Waste Optimizer is entirely distinct from any project provided in the CS50W curriculum. It does not mimic a social network, an e-commerce platform, an email client, or a basic search engine. Instead, it serves as a highly personalized productivity and sustainability utility focused on resource tracking, inventory control, and calendar orchestration. To ensure complete compliance with the course constraints, the application was designed from the ground up to avoid the architecture of past projects:

* **Not an E-Commerce Site (Project 2 - Commerce):** The application features no commercial shopping carts, public listings, bidding systems, comments, or payment processing workflows. Users are not buying or selling goods; they are managing their own existing, private physical inventory to minimize ecological and financial waste.
* **Not an Email Client (Project 3 - Mail):** While the application adopts a modern, fluid Single Page Application (SPA) design, it does not route linear text communications or manage inbox/sent/archive states. Instead, it handles a multi-tier relational data structure where ingredients dynamically update dashboard statistics based on calendar manipulation.
* **Not a Messaging/Social Network (Project 4 - Network):** This application strictly rejects social elements. There are no public timelines, global status updates, user-to-user interactions, direct messaging systems, profile pages, or "following" mechanics. It functions exclusively as a secure, private dashboard tailored to an individual user's personal kitchen metrics.

By focusing on a utility-driven, data-dense optimization tool, this project addresses a unique real-world problem—food waste reduction—using architectural patterns completely missing from the standard course curriculum.

### Complexity
The technical complexity of this application lies in its data integration, algorithmic matching engine, and highly interactive asynchronous frontend. The site goes far beyond basic Create, Read, Update, and Delete (CRUD) operations by linking client-side UI states directly with backend database queries. The complexity of the system is driven by distinct engineering implementations:

1. **Intricate Relational Data Schema:** The backend database coordinates five distinct models (`PantryItem`, `Recipe`, `Ingredient`, `RecipeIngredient`, and `MealPlan`) using strict foreign keys, cascading deletions, and conditional field restrictions. Fetching this data efficiently required utilizing Django's optimization patterns (like `select_related` and `prefetch_related`) to prevent performance bottlenecks.
2. **Automated Mathematical Matching Engine:** A custom-built Python algorithm forms the core backend logic. When a user checks their dashboard, the engine scans the `PantryItem` table for records approaching their expiration date and cross-references them against requirements in `RecipeIngredient` join tables. The engine filters recipes, calculating a percentage match based on owned versus needed ingredients.
3. **Asynchronous Single-Page Interactions:** The application entirely avoids full-page browser refreshes. The frontend relies on JavaScript `fetch` API calls to handle asynchronous `POST` and `PUT` payloads. When an ingredient is added or marked as used, the frontend DOM dynamically updates, recalculating inventory states instantaneously on the client side.
4. **Fluid Drag-and-Drop Lifecycle Management:** The interactive meal planning calendar utilizes native JavaScript event listeners to capture layout shifts. When a user drags a meal card, custom scripts capture data attributes, update the backend database via an asynchronous API call, and dynamically recalculate daily macronutrient aggregates.
5. **Hybrid Mobile-Responsive Architecture:** The interface blends Bootstrap 5 with advanced custom layout overrides. Custom CSS Flexbox and Grid breakpoint matrices were engineered to allow the 7-day interactive calendar to collapse seamlessly into an accessible, stacked accordion view on mobile viewports without breaking underlying JavaScript mechanics.
6. **Transactional Account Lifecycle Seeding:** Directly inside the view registration transaction block, the engine isolates newly registered profile tokens and instantiates an 18-item baseline pantry setup mapped exclusively to that individual's metrics.

---

## File Directory Documentation

Every file listed below was either created specifically for this project or significantly modified to support the application's unique features.

### Backend Python Architecture
* `capstone/settings.py`: Configures global project parameters, registers the core application module, establishes secure static media paths, and maps the explicit application configuration class.
* `capstone/asgi.py` & `wsgi.py`: Standard entry-point configuration files used by web servers to deploy and run the Django application.
* `capstone/__init__.py` & `planner/__init__.py`: Empty Python files that allow the system to treat these folders as packages.
* `planner/admin.py`: Registers custom models (`PantryItem`, `Recipe`, etc.) with the Django Admin portal for easy database management.
* `planner/apps.py`: Contains system configuration settings for the `planner` application module.
* `planner/models.py`: Contains ORM abstractions for the database, including `Ingredient`, `Recipe`, `RecipeIngredient`, `PantryItem`, and `MealPlan`.
* `planner/signals.py`: Houses custom background triggers that automatically perform actions when database changes occur.
* `planner/views.py`: Controls core application logic and session management. It houses the primary analytical matching engine and managing RESTful JSON API endpoints.
* `planner/urls.py`: Defines the routing matrix for the application, mapping visual templates and organizing API endpoints.
* `planner/tests.py`: Implements automated test suites validating the recipe matching engine, expiration warnings, and JSON API status codes.
* `planner/migrations/`: Contains database history files (e.g., `0001_initial.py`) detailing the construction of SQL tables over time.
* `seed_data.py`: A database population utility script that generates dummy user accounts, preloaded ingredients, and sample recipes for immediate testing.

### Frontend JavaScript & CSS Engineering
* `static/planner/js/bootstrap.local.js`: A custom, lightweight vanilla JavaScript layout initializer handling programmatic UI triggers and event bindings asynchronously.
* `static/planner/js/calendar.js`: The primary engine for the calendar. Manages HTML5 drag-and-drop event handlers, transmits asynchronous `PUT` requests to the Django API, and modifies the DOM to update nutrition counters on the fly.
* `static/planner/js/pantry.js`: Orchestrates inventory interactions by listening for ingredient submissions and firing asynchronous `POST` operations to add items to the pantry.
* `static/planner/css/styles.css`: Houses custom styling definitions, including specialized CSS Grid structures for the 7-day calendar and unique drag-and-drop visual states.

### HTML5 UI Templates
* `templates/planner/layout.html`: The base HTML5 structural framework, integrating Bootstrap 5 and managing global responsive navigation.
* `templates/planner/index.html`: The main SPA dashboard integrating the Planning Matrix, Pantry panel, and Recipe Recommendations.
* `templates/planner/login.html` & `register.html`: Secure authentication interfaces with interactive Bootstrap focus utilities and custom CSS animations.

---

## Project Setup and Execution Instructions

### 1. Clone and Navigate to the Project Root Folder
```bash
git clone <your-repository-url-here>
cd capstone
```

### 2. Set Up a Virtual Environment
* **macOS / Linux:**
```bash
python3 -m venv my_project_env
source my_project_env/bin/activate
```
* **Windows (Command Prompt):**
```cmd
python -m venv my_project_env
my_project_env\Scripts\activate.bat
```

### 3. Install Required Dependencies
```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```
*Note: The frontend layouts utilize a localized Bootstrap 5 architecture served directly from the project's internal asset directories. An active internet connection is NOT required during runtime execution.*

### 4. Apply Database Migrations
```bash
python manage.py makemigrations planner
python manage.py migrate
```

### 5. Seed the Application Database (Crucial Step)
To experience the application immediately with predefined assets, execute the database seeding utility script:
```bash
python seed_data.py
```

### 6. Launch the Local Development Web Server
```bash
python manage.py runserver
```
Navigate to `http://127.0.0.1:8000` to interact with the dashboard.

---

## Additional Information for Staff Evaluators
* **Preconfigured Testing Profile:** You can log in instantly using the following test credentials:
  * **Username:** `testuser`
  * **Password:** `Password123!`
* **Scalability:** All custom files are housed strictly within local static directories and managed safely using Django’s standard `staticfiles` discovery configuration.

