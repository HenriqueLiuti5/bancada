from django.apps import AppConfig


class AvisosConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "bancada.avisos"
    label = "avisos"

    def ready(self) -> None:
        from bancada.avisos import sinais  # noqa: F401
