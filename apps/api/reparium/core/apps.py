from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "reparium.core"
    label = "core"

    def ready(self) -> None:
        from reparium.core import papel_do_banco  # noqa: F401
