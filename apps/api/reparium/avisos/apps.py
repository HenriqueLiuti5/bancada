from django.apps import AppConfig


class AvisosConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "reparium.avisos"
    label = "avisos"

    def ready(self) -> None:
        from reparium.avisos import sinais  # noqa: F401
