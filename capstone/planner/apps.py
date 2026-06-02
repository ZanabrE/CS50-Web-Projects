from django.apps import AppConfig


class PlannerConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'planner'
    
    def ready(self):
        # Import the signal handlers to ensure they are registered
        import planner.signals
