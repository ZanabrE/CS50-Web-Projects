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

---

## File Directory Documentation

To help understand the architecture of this application, here is a breakdown of every file created and modified for this project:

### Backend Python Architecture
*   `config/settings.py`: Configures global project parameters, registers the modular core application, establishes secure media/static routing paths, and points the project toward the local SQLite database instance.
*   `my_app/models.py`: Contains the object-relational mapping (ORM) abstractions for the application database. Defines `Ingredient` (tracking names and categories), `Recipe` (tracking instructions and prep times), `RecipeIngredient` (a custom join table establishing specific quantities/units per recipe), `PantryItem` (tracking user inventory, amounts, and expiration dates), and `MealPlan` (binding recipes to specific user accounts and calendar dates).
*   `my_app/views.py`: Controls the application logic. Contains the user registration, login, and logout controller routines. Houses the primary analytical matching engine that loops through expiring pantry elements to filter valid recipe structures. Additionally, manages the RESTful JSON API endpoints that respond to frontend JavaScript requests.
*   `my_app/urls.py`: Defines the routing matrix for the application. Maps the primary visual templates to their respective view controllers and organizes the dedicated API endpoints (e.g., `/api/pantry`, `/api/calendar/move`) used by the client-side scripts.
*   `my_app/tests.py`: Implements automated test suites utilizing Django’s testing framework. Validates the mathematical accuracy of the recipe matching engine, ensures expiration warnings trigger under correct date thresholds, and verifies that the JSON API endpoints respond with accurate HTTP status codes under valid or invalid user states.

### Frontend JavaScript & CSS Engineering
*   `static/js/calendar.js`: The primary engine driving the frontend experience. Manages HTML5 drag-and-drop event handlers (`dragstart`, `dragover`, `drop`). Collects item identifiers from DOM nodes during move events, transmits asynchronous `PUT` requests to the Django API, processes the JSON responses, and modifies the DOM to update visual nutrition counters on the fly. It also handles triggers for Bootstrap 5 interactive notification popovers and feedback modals.
*   `static/js/pantry.js`: Orchestrates inventory interactions. Listens for ingredient submission forms, fires asynchronous `POST` operations to add items to the pantry, updates expiration warning styling dynamically using time differentials, and handles row removal animations when items are deleted.
*   `static/css/styles.css`: Houses custom styling definitions that override Bootstrap 5 defaults. It implements specialized CSS Grid structures for the 7-day calendar view, establishes unique drag-and-drop visual states (e.g., hover indicators, drop-zone highlights), and uses custom media queries to force grid components into vertical column layouts on mobile screen sizes.

### HTML5 UI Templates
*   `templates/layout.html`: The base HTML5 structural framework. Integrates Bootstrap 5 via CDN for standardized base components, imports custom typography layers, and manages the global responsive navigation menu toggles.
*   `templates/index.html`: The main user dashboard. Displays urgent expiration metrics using Bootstrap card elements, showcases top recipe recommendations generated by the matching engine, and renders the weekly interactive planning grid.
*   `templates/pantry.html`: The ingredient configuration space. Renders an intuitive list view of current kitchen assets alongside Bootstrap form groups to add ingredients, adjust inventory levels, and manually track item conditions.
*   `templates/login.html` & `register.html`: Secure, clean authentication interfaces styled with interactive Bootstrap focus utilities and custom CSS focus animations to onboard users into their private workspaces.

---

## Project Setup and Execution Instructions

Follow these steps to set up, initialize, and run the Django project locally from scratch.

### 1. Initialize Your Project Directory
Create a dedicated folder for your project and navigate inside it:
```bash
mkdir my_django_project
cd my_django_project
```

### 2. Set Up a Virtual Environment
Isolate your project dependencies from your global system environment:
*   **macOS / Linux:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```
*   **Windows (Command Prompt):**
    ```bash
    python -m venv venv
    venv\Scripts\activate
    ```

### 3. Install Django
Upgrade `pip` and install the Django framework environment:
```bash
python -m pip install --upgrade pip
python -m pip install django
```
*Note: The frontend layouts utilize Bootstrap 5 via CDN integration, which requires an active internet connection to download styling libraries and icons during runtime execution.*

### 4. Create the Django Project Configuration
Generate the boilerplate structural configuration files. The trailing dot (`.`) ensures the script initializes files right within your main folder without creating an unnecessary nested root directory:
```bash
django-admin startproject config .
```

### 5. Run Initial Database Migrations
Initialize the default local SQLite core system database tables:
```bash
python manage.py migrate
```

### 6. Start the Development Server
Launch Django's built-in local background web server:
```bash
python manage.py runserver
```
*Navigate to `http://127.0.0.1:8000` in your web browser to confirm the initial interface builds successfully.*

### 7. Pin Project Dependencies
Save your currently active library setup to a flat text file configuration layout for deployment standards:
```bash
python -m pip freeze > requirements.txt
```

### 8. Create Your Modular Feature Application
Generate your custom modular data application components within the directory block:
```bash
python manage.py startapp my_app
```
*Note: To complete the backend integration, remember to add your newly initialized application directory string (`'my_app'`) to the global `INSTALLED_APPS` cluster array located inside your `config/settings.py` file.*
