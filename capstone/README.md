# Capstone Final Project: Smart Meal Planner & Food Waste Optimizer

## Distinctiveness and Complexity

### Distinctiveness

This application is completely distinct from the foundational assignments provided in the CS50W curriculum:

- **Not an E-Commerce Site (Project 2 - Commerce):** It features no commercial shopping \
    carts, listings, bids, or payment processing workflows. Instead, it operates as a \
    personalized utility for resource tracking, inventory control, and calendar orchestration.

- **Not an Email Client (Project 3- Mail):** While it uses modern Single Page Application \
    (SPA) design features, it manages multi-tier associate databases (Meals map to specific \
    dates, tracking relational Ingredients down to exact metrics) rather than managing isolated, \
    linear inbox tables.

- **Not a Messaging/Social Network (Project 4 - Network):** The site does not contain public \
    timelines, global social updates, direct messages, follow systems, or user-to-user \
    intereactions. It acts as a secure, private dashboard tailored exclusively to the individual \
    user's operational metrics.


### Complexity

The underlying code complexity relies on tight cross-platform integration between a mathematical \
optimization backend and an interactive frontend:

**1. Intricate Relational Data Schema:** The database uses multiple linked entities \
    (`PantryItem, Recipe, Ingredient, RecipeIngredient,` and `MealPlan`) featuring strict \
    foreign keys, cascading deletions, and conditional field restrictions. Querying these \
    requires multi-table joins and pre-fetching optimization logic to avoid costly performance \
    bottlenecks.

**2. Automated Mathematical Matching Engine:** The backend handles programmatic logic \
    that scans expiring `PantryItem` records and automatically cross-references them \ 
    against required quantities inside the `RecipeIngredient` connection tables. This isolates \
    valid recipe suggestions through a dynamic filtering matrix based on what the user \
    already has on hand.

**3. Asynchronous Single-Page Interactions:** The application completely bypasses standard \
    page refreshes. The frontend utilizes JavaScript (`fetch`) to issue `POST` and `PUT` \
    payloads to backend API endpoints. Moving items within the calendar recalculates \
    macronutrient aggregates instantaneously on the client side using structured state logic.

**4. Fluid Drag-and-Drop Lifecycle Management:** The interactive calendar leverages \
    JavaScript event listeners to monitor live elements. When a user drags a meal card to a \
    new date, custom event script collect data attributes, parse the structural DOM change, \
    update the backend database asynchronously, and update visual dashboard counters \
    dynamically.

**5. Mobile-Responsive Adaptability:** Built completely from scratch using robust CSS \
    Flexbox and responsive Grid breakpoints. The massive desktop-friendly structural \
    calendar shifts seamlessly into a stacked accordion view on small mobile interfaces, \
    preserving usability across small viewports without losing underlying interactive layout \
    options.

## File Directory Documentation

*   `models.py`: Defines core application database objects including Ingredients, Recipe, RecipeIngredient, PantryItem, and MealPlan.
*   `views.py`: Handles authentication routines, JSON API endpoints for macro processing, and the primary matching optimization algorithm.
*   `urls.py`: [Defines API endpoints and page routing paths.]
*   `static/js/calendar.js`: Coordinates client-side drag-and-drop grid mechanics, state changes, macro target updates, and asynchronous FETCH updates.
*   `static/css/styles.css`: [Describe your custom styling, flexbox, and grid layouts here.]
*   `templates/layout.html`: Establishes global mobile-responsive UI frameworks and structural application shells.
*   `templates/index.html`: [Describe what your main dashboard template does.]
*   `tests.py`: [Describe any automated test suites you wrote to test the matching engine or APIs.]


## Installation and Execution Instructions

### Prerequisites
Ensure you have Python 3.x and `pip` installed on your local machine.

## Project Setup Instructions

Follow these steps to set up and initialize the Django project locally.


| Step | Description | Command |
| :--- | :--- | :--- |
| **1a** | Set up a virtual environment | `python -m venv .venv` |
| **1b** | **Activate (macOS / Linux)** | `source .venv/bin/activate` |
| | **Activate (Windows Command Prompt)** | `.venv\Scripts\activate.bat` |
| | **Activate (Windows PowerShell)** | `.venv\Scripts\Activate.ps1` |
| **2a** | Install Django | `python -m pip install django` |
| **2b** | Pin your dependencies | `python -m pip freeze > requirements.txt` |
| **3** | Set up a Django project | `django-admin startproject <projectname>` |
| **4** | Start a Django app | `python manage.py startapp <appname>` |

> [!NOTE]  
> Replace `<projectname>` and `<appname>` with your actual project and application names.
