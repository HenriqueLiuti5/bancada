from django.apps import AppConfig


class EstoqueConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "bancada.estoque"
    label = "estoque"

    def ready(self) -> None:
        from bancada.estoque import sinais  # noqa: F401
