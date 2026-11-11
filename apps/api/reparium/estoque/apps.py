from django.apps import AppConfig


class EstoqueConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "reparium.estoque"
    label = "estoque"

    def ready(self) -> None:
        from reparium.estoque import sinais  # noqa: F401
