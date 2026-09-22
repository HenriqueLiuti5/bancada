from django.apps import AppConfig


class OrdensConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "bancada.ordens"
    label = "ordens"

    def ready(self) -> None:
        from bancada.ordens import sinais  # noqa: F401
