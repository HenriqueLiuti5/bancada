from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import models


def _cifra() -> Fernet:
    return Fernet(settings.BANCADA_ENCRYPTION_KEY.encode())


class CampoCriptografado(models.TextField):
    def get_prep_value(self, value: str | None) -> str | None:
        if not value:
            return value
        return _cifra().encrypt(value.encode()).decode()

    def from_db_value(
        self,
        value: str | None,
        expression: Any,
        connection: Any,
    ) -> str | None:
        if not value:
            return value
        try:
            return _cifra().decrypt(value.encode()).decode()
        except InvalidToken:
            return None
