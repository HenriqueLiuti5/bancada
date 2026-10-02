import os
from decimal import Decimal
from pathlib import Path

from celery.schedules import crontab

BASE_DIR = Path(__file__).resolve().parent.parent


def env_list(name: str, default: str = "") -> list[str]:
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "insecure-dev-key")
DEBUG = os.environ.get("DJANGO_DEBUG", "0") == "1"
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "bancada.core",
    "bancada.tenants",
    "bancada.clientes",
    "bancada.ordens",
    "bancada.avisos",
    "bancada.auditoria",
    "bancada.orientacao",
    "bancada.assinaturas",
    "bancada.plataforma",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
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
CELERY_BEAT_SCHEDULE = {
    "recuperar-avisos-perdidos": {
        "task": "avisos.recuperar_avisos_perdidos",
        "schedule": crontab(minute="*/15"),
    },
    "purgar-senhas-de-desbloqueio": {
        "task": "clientes.purgar_senhas_de_desbloqueio",
        "schedule": crontab(hour=3, minute=30),
    },
    "revisar-assinaturas": {
        "task": "assinaturas.revisar_assinaturas",
        "schedule": crontab(hour=7, minute=0),
    },
    "sincronizar-cobrancas": {
        "task": "assinaturas.sincronizar_cobrancas",
        "schedule": crontab(minute=10),
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
    "DEFAULT_THROTTLE_RATES": {
        "acompanhamento_publico": os.environ.get("THROTTLE_PUBLICO", "60/min"),
        "arquivo_de_foto": os.environ.get("THROTTLE_FOTOS", "240/min"),
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

CORS_ALLOWED_ORIGINS = env_list("DJANGO_CORS_ALLOWED_ORIGINS", "http://localhost:3000")
CORS_ALLOW_CREDENTIALS = True

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

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
