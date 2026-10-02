from django.apps import AppConfig


class AssinaturasConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "bancada.assinaturas"
    label = "assinaturas"

    def ready(self) -> None:
        from bancada.assinaturas import sinais  # noqa: F401
