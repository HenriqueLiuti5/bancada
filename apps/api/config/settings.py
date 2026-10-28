import os
from decimal import Decimal
from pathlib import Path
from typing import Any

from celery.schedules import crontab
from django.core.exceptions import ImproperlyConfigured

from config.monitoramento import iniciar_monitoramento

BASE_DIR = Path(__file__).resolve().parent.parent


def env_list(name: str, default: str = "") -> list[str]:
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


CHAVE_DE_DESENVOLVIMENTO = "insecure-dev-key"
CHAVES_DE_EXEMPLO = {CHAVE_DE_DESENVOLVIMENTO, "troque-esta-chave-em-producao"}
TAMANHO_MINIMO_DA_CHAVE = 50

DEBUG = os.environ.get("DJANGO_DEBUG", "0") == "1"
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not DEBUG and (SECRET_KEY in CHAVES_DE_EXEMPLO or len(SECRET_KEY) < TAMANHO_MINIMO_DA_CHAVE):
    raise ImproperlyConfigured(
        f"Defina DJANGO_SECRET_KEY com uma chave própria de pelo menos {TAMANHO_MINIMO_DA_CHAVE} "
        'caracteres. Para gerar uma: python -c "import secrets; print(secrets.token_urlsafe(50))"'
    )
SECRET_KEY = SECRET_KEY or CHAVE_DE_DESENVOLVIMENTO
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SILENCED_SYSTEM_CHECKS = ["security.W004", "security.W008"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "bancada.core",
    "bancada.tenants",
    "bancada.clientes",
    "bancada.ordens",
    "bancada.estoque",
    "bancada.financeiro",
    "bancada.avisos",
    "bancada.auditoria",
    "bancada.orientacao",
    "bancada.assinaturas",
    "bancada.plataforma",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "bancada.core.fuso.FusoDoPedido",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "bancada"),
        "USER": os.environ.get("POSTGRES_APP_USER") or os.environ.get("POSTGRES_USER", "bancada"),
        "PASSWORD": os.environ.get("POSTGRES_APP_PASSWORD")
        or os.environ.get("POSTGRES_PASSWORD", "bancada"),
        "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        "ATOMIC_REQUESTS": True,
    }
}

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
    }
}

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_TIME_LIMIT = 300
CELERY_TASK_SOFT_TIME_LIMIT = 270
CELERY_TIMEZONE = "America/Sao_Paulo"
CELERY_BEAT_SCHEDULER = "bancada.core.agendador:AgendadorComTrava"
CELERY_BEAT_SCHEDULE = {
    "recuperar-avisos-perdidos": {
        "task": "avisos.recuperar_avisos_perdidos",
        "schedule": crontab(minute="*/15"),
    },
    "purgar-senhas-de-desbloqueio": {
        "task": "clientes.purgar_senhas_de_desbloqueio",
        "schedule": crontab(hour=3, minute=30),
    },
    "apagar-registros-de-acesso-vencidos": {
        "task": "auditoria.apagar_registros_de_acesso_vencidos",
        "schedule": crontab(hour=3, minute=45),
    },
    "revisar-assinaturas": {
        "task": "assinaturas.revisar_assinaturas",
        "schedule": crontab(hour=7, minute=0),
    },
    "apagar-contas-so-para-consulta": {
        "task": "plataforma.apagar_contas_so_para_consulta",
        "schedule": crontab(hour=7, minute=30),
    },
    "sincronizar-cobrancas": {
        "task": "assinaturas.sincronizar_cobrancas",
        "schedule": crontab(minute=10),
    },
    "criar-contas-fixas": {
        "task": "financeiro.criar_contas_fixas",
        "schedule": crontab(hour=5, minute=0),
    },
}

EMAIL_BACKEND = os.environ.get(
    "DJANGO_EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
)
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "1") == "1"
EMAIL_TIMEOUT = 15
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "Bancada <nao-responda@bancada.local>")

APP_PUBLIC_URL = os.environ.get("APP_PUBLIC_URL", "http://localhost:3000").rstrip("/")

ASAAS_API_URL = os.environ.get("ASAAS_API_URL", "https://api-sandbox.asaas.com/v3")
ASAAS_API_KEY = os.environ.get("ASAAS_API_KEY", "")
ASAAS_WEBHOOK_TOKEN = os.environ.get("ASAAS_WEBHOOK_TOKEN", "")
VALOR_DA_ASSINATURA = Decimal(os.environ.get("VALOR_DA_ASSINATURA", "59.90"))

PASSWORD_RESET_TIMEOUT = 60 * 60 * 2

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "bancada.core.autenticacao.TokenQueRegistraAcesso",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "NUM_PROXIES": 1,
    "DEFAULT_THROTTLE_RATES": {
        "acompanhamento_publico": os.environ.get("THROTTLE_PUBLICO", "60/min"),
        "arquivo_de_foto": os.environ.get("THROTTLE_FOTOS", "240/min"),
        "envio_de_foto": os.environ.get("THROTTLE_ENVIO_DE_FOTO", "120/hour"),
        "arquivo_de_logo": os.environ.get("THROTTLE_LOGOS", "240/min"),
        "login": os.environ.get("THROTTLE_LOGIN", "20/min"),
        "cadastro": os.environ.get("THROTTLE_CADASTRO", "10/hour"),
        "recuperacao_de_senha": os.environ.get("THROTTLE_RECUPERACAO_DE_SENHA", "10/hour"),
        "confirmacao_de_email": os.environ.get("THROTTLE_CONFIRMACAO_DE_EMAIL", "10/hour"),
        "convite": os.environ.get("THROTTLE_CONVITE", "30/hour"),
    },
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

S3_BUCKET = os.environ.get("S3_BUCKET", "")

STORAGES: dict[str, dict[str, Any]] = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
if S3_BUCKET:
    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "bucket_name": S3_BUCKET,
            "endpoint_url": os.environ.get("S3_ENDPOINT_URL") or None,
            "region_name": os.environ.get("S3_REGION") or None,
            "access_key": os.environ.get("S3_ACCESS_KEY_ID", ""),
            "secret_key": os.environ.get("S3_SECRET_ACCESS_KEY", ""),
            "addressing_style": os.environ.get("S3_ADDRESSING_STYLE") or None,
            "default_acl": None,
        },
    }

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple": {"format": "{levelname} {asctime} {name} {message}", "style": "{"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "simple"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "weasyprint": {"level": "WARNING"},
        "fontTools": {"level": "WARNING"},
    },
}

AUTH_USER_MODEL = "tenants.Usuario"

BANCADA_ENCRYPTION_KEY = os.environ.get("BANCADA_ENCRYPTION_KEY", "")

SENTRY_DSN = os.environ.get("SENTRY_DSN", "")
if SENTRY_DSN:
    iniciar_monitoramento(SENTRY_DSN)
