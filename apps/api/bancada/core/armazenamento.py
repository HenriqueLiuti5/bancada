from typing import Any

from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class ArmazenamentoDeFotos(S3Boto3Storage):
    def url(self, name: str, parameters: Any = None, expire: Any = None, **kwargs: Any) -> str:
        endereco = super().url(name, parameters, expire, **kwargs)
        interno = settings.AWS_S3_ENDPOINT_URL
        publico = settings.S3_PUBLIC_ENDPOINT
        if interno and publico and endereco.startswith(interno):
            return publico + endereco[len(interno) :]
        return endereco
