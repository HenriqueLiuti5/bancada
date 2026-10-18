from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "bancada.core"
    label = "core"

    def ready(self) -> None:
        from bancada.core import papel_do_banco  # noqa: F401
