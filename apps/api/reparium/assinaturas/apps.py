from django.apps import AppConfig


class AssinaturasConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "reparium.assinaturas"
    label = "assinaturas"

    def ready(self) -> None:
        from reparium.assinaturas import sinais  # noqa: F401
