import os
from typing import TYPE_CHECKING

from django.conf import settings
from django.core.wsgi import get_wsgi_application
from whitenoise import WhiteNoise

if TYPE_CHECKING:
    from _typeshed.wsgi import WSGIApplication

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

application: "WSGIApplication" = get_wsgi_application()

# A imagem de produção traz os arquivos do painel administrativo já coletados, e o WhiteNoise os
# serve. No desenvolvimento a pasta não existe, e quem serve esses arquivos é o runserver.
if os.path.isdir(settings.STATIC_ROOT):
    application = WhiteNoise(application, root=settings.STATIC_ROOT, prefix=settings.STATIC_URL)
