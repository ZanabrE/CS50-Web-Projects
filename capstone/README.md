# Capstone Final Project: Smart Meal Planner & Food Waste Optimizer

## Distinctiveness and Complexity

### Distinctiveness
The Smart Meal Planner & Food Waste Optimizer is entirely distinct from any project provided in the CS50W curriculum. It does not mimic a social network, an e-commerce platform, an email client, or a basic search engine. Instead, it serves as a highly personalized productivity and sustainability utility focused on resource tracking, inventory control, and calendar orchestration. 

To ensure complete compliance with the course constraints, the application was designed from the ground up to avoid the architecture of past projects:
*   **Not an E-Commerce Site (Project 2 - Commerce):** The application features no commercial shopping carts, public listings, bidding systems, comments, or payment processing workflows. Users are not buying or selling goods; they are managing their own existing, private physical inventory to minimize ecological and financial waste.
*   **Not an Email Client (Project 3 - Mail):** While the application adopts a modern, fluid Single Page Application (SPA) design, it does not route linear text communications or manage inbox/sent/archive states. Instead, it handles a multi-tier relational data structure where ingredients dynamically update dashboard statistics based on calendar manipulation.
*   **Not a Messaging/Social Network (Project 4 - Network):** This application strictly rejects social elements. There are no public timelines, global status updates, user-to-user interactions, direct messaging systems, profile pages, or "following" mechanics. It functions exclusively as a secure, private dashboard tailored to an individual user's personal kitchen metrics.

By focusing on a utility-driven, data-dense optimization tool, this project addresses a unique real-world problem—food waste reduction—using architectural patterns completely missing from the standard course curriculum.

### Complexity
The technical complexity of this application lies in its data integration, algorithmic matching engine, and highly interactive asynchronous frontend. The site goes far beyond basic Create, Read, Update, and Delete (CRUD) operations by linking client-side UI states directly with backend database queries.

The complexity of the system is driven by five distinct engineering implementations:

1. **Intricate Relational Data Schema:** The backend database coordinates five distinct models (`PantryItem`, `Recipe`, `Ingredient`, `RecipeIngredient`, and `MealPlan`) using strict foreign keys, cascading deletions, and conditional field restrictions. Fetching this data efficiently required utilizing Django's optimization patterns to prevent performance bottlenecks when loading large quantities of ingredient data.
2. **Automated Mathematical Matching Engine:** A custom-built Python algorithm forms the core backend logic. When a user checks their dashboard, the engine scans the `PantryItem` table for records approaching their expiration date. It cross-references these specific ingredients against the required quantities inside the `RecipeIngredient` join tables. The engine filters out recipes the user cannot make, calculating a percentage match based on what the user already owns versus what they need to buy.
3. **Asynchronous Single-Page Interactions:** To deliver a premium user experience, the application entirely avoids full-page browser refreshes. The frontend relies heavily on JavaScript `fetch` API calls to handle asynchronous `POST` and `PUT` payloads. When an ingredient is added or marked as used, the frontend DOM dynamically updates, recalculating available inventory states instantaneously on the client side.
4. **Fluid Drag-and-Drop Lifecycle Management:** The interactive meal planning calendar utilizes native JavaScript event listeners to capture layout shifts. When a user drags a meal card from one day to another, custom scripts capture data attributes from the DOM elements, parse the date change, update the backend database via an asynchronous API call, and dynamically recalculate the daily macronutrient aggregates without interrupting the user's workflow.
5. **Hybrid Mobile-Responsive Architecture:** The interface blends the utility of Bootstrap 5 with advanced custom layout overrides. While Bootstrap handles global components (like navbars, buttons, and alert messages), standard framework utility classes are fundamentally inadequate for a dynamic 7-day interactive calendar. Therefore, custom CSS Flexbox and Grid breakpoint matrices were engineered from scratch. On desktop screens, a comprehensive multi-column grid layouts the week; on mobile viewports, custom media queries seamlessly collapse the calendar into an accessible, stacked accordion view without breaking the underlying JavaScript drag-and-drop mechanics.
6. **Transactional Account Lifecycle Seeding:** To preserve user data boundaries without leaving newly registered users with an unpopulated dashboard (which would naturally drop below the application's strict 25% matching footprint gatekeeper), the backend couples account generation with automated procedural stock backfilling. Directly inside the view registration transaction block, the engine isolates the newly registered profile token and instantiates an 18-item baseline pantry setup mapped exclusively to that individual's key metrics.

---

## File Directory Documentation

To help understand the architecture of this application, here is a breakdown of every file created and modified for this project:

### Backend Python Architecture
*   `capstone/settings.py`: Configures global project parameters, registers the core application module, establishes secure static media paths, and configures the database settings. It was modified to map the explicit application configuration class (`planner.apps.PlannerConfig`) to enable modern project features.
*   `planner/models.py`: Contains the object-relational mapping (ORM) abstractions for the application database. Defines `Ingredient` (tracking names and categories), `Recipe` (tracking instructions and prep times), `RecipeIngredient` (a custom join table establishing specific quantities/units per recipe), `PantryItem` (tracking user inventory, amounts, and expiration dates), and `MealPlan` (binding recipes to specific user accounts and calendar dates).
*   `planner/views.py`: Controls the application logic. Contains the user registration, login, and logout controller routines. Houses the primary analytical matching engine that loops through expiring pantry elements to filter valid recipe structures. Additionally, manages the RESTful JSON API endpoints that respond to frontend JavaScript requests.
*   `planner/urls.py`: Defines the routing matrix for the application. Maps the primary visual templates to their respective view controllers and organizes the dedicated API endpoints (e.g., `/api/pantry`, `/api/calendar/move`) used by the client-side scripts.
*   `planner/tests.py`: Implements automated test suites utilizing Django’s testing framework. Validates the mathematical accuracy of the recipe matching engine, ensures expiration warnings trigger under correct date thresholds, and verifies that the JSON API endpoints respond with accurate HTTP status codes under valid or invalid user states.
*   `seed_data.py`: A database population utility script. It automatically interfaces with the Django ORM to generate dummy user accounts, preloaded ingredients, sample recipes, and baseline kitchen mock data, enabling testers to instantly view the software's data processing potential without manual data entry.

### Frontend JavaScript & CSS Engineering
*   `static/planner/js/bootstrap.local.js`: A custom, lightweight vanilla JavaScript layout initializer script built specifically for this project. To ensure high-speed, local reliability and eliminate bloated external web dependencies, this script handles the programmatic UI triggers, setup operations, and event bindings for dashboard alerts and visual state adjustments asynchronously.
*   `static/planner/js/calendar.js`: The primary engine driving the frontend experience. Manages HTML5 drag-and-drop event handlers (`dragstart`, `dragover`, `drop`). Collects item identifiers from DOM nodes during move events, transmits asynchronous `PUT` requests to the Django API, processes the JSON responses, and modifies the DOM to update visual nutrition counters on the fly. It also handles triggers for Bootstrap 5 interactive notification popovers and feedback modals.
*   `static/planner/js/pantry.js`: Orchestrates inventory interactions. Listens for ingredient submission forms, fires asynchronous `POST` operations to add items to the pantry, updates expiration warning styling dynamically using time differentials, and handles row removal animations when items are deleted.
*   `static/planner/css/styles.css`: Houses custom styling definitions that override Bootstrap 5 defaults. It implements specialized CSS Grid structures for the 7-day calendar view, establishes unique drag-and-drop visual states (e.g., hover indicators, drop-zone highlights), and uses custom media queries to force grid components into vertical column layouts on mobile screen sizes.

### HTML5 UI Templates
*   `templates/planner/layout.html`: The base HTML5 structural framework. Integrates Bootstrap 5 via CDN for standardized base components, imports custom typography layers, and manages the global responsive navigation menu toggles.
*   `templates/planner/index.html`: The main user dashboard. Displays urgent expiration metrics using Bootstrap card elements, showcases top recipe recommendations generated by the matching engine, and renders the weekly interactive planning grid.
*   `templates/planner/pantry.html`: The ingredient configuration space. Renders an intuitive list view of current kitchen assets alongside Bootstrap form groups to add ingredients, adjust inventory levels, and manually track item conditions.
*   `templates/planner/login.html` & `register.html`: Secure, clean authentication interfaces styled with interactive Bootstrap focus utilities and custom CSS focus animations to onboard users into their private workspaces.

---

## Project Setup and Execution Instructions

Follow these precise steps to clone, configure, initialize, and execute the application locally from a clean terminal window environment.

### 1. Clone and Navigate to the Project Root Folder
Clone your project repository from your code hosting provider, and navigate directly into the root workspace folder containing your `manage.py` and `seed_data.py` files:
```bash
git clone <your-repository-url-here>
cd capstone
```

### 2. Set Up a Virtual Environment
Isolate the project dependencies from your global system environment variables:
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
Upgrade your internal library management system installer and run the project prerequisite configurations:
```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```
*Note: The frontend layouts utilize a localized Bootstrap 5 architecture served directly from the project's internal asset directories (planner/static/planner/js). An active internet connection is NOT required during runtime execution, ensuring ultra-fast loading times and total offline reliability.

### 4. Apply Database Migrations
Initialize the system architecture and construct the foundational structural database tables designed inside your core database models:
```bash
python manage.py makemigrations planner
python manage.py migrate
```

### 5. Seed the Application Database (Crucial Step)
To experience the application immediately with predefined assets without having to manually type in entries, execute the database seeding utility script:
```bash
python seed_data.py
```
*Note: This script will run seamlessly from the root folder directory and inject testing data directly into your local `db.sqlite3` framework.*

### 6. Launch the Local Development Web Server
Boot up Django's internal system development server environment:
```bash
python manage.py runserver
```
Open your preferred browser window and navigate to `http://127.0.0.1:8000` to interact directly with the Smart Meal Planner dashboard interface.

---

## Additional Information for Staff Evaluators

* **Preconfigured Testing Profile:** The `seed_data.py` script automatically configures a default user account so you do not have to waste time registering profiles manually. You can log in instantly using the following test credentials:
  * **Username:** `testuser`
  * **Password:** `Password123!`
* **Static Assets Note:** All custom files (`styles.css`, `calendar.js`, `pantry.js`, and `bootstrap.local.js`) are housed strictly within local static directories and managed safely using Django’s standard `staticfiles` discovery configuration.
