from django.apps import AppConfig


class OrdensConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "reparium.ordens"
    label = "ordens"

    def ready(self) -> None:
        from reparium.ordens import sinais  # noqa: F401
