from email.message import Message
from email.mime.image import MIMEImage
from typing import Any, NamedTuple, cast

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.core.mail.message import SafeMIMEMultipart

from bancada.tenants import logo
from bancada.tenants.models import Tenant

CID_DA_LOGO = "logo-da-assistencia"
ALTURA_MAXIMA_DA_LOGO_EM_PIXELS = 48
LARGURA_MAXIMA_DA_LOGO_EM_PIXELS = 200


class EmailComImagens(EmailMultiAlternatives):
    def __init__(self, *args: Any, imagens: list[MIMEImage] | None = None, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.imagens = imagens or []

    def message(self, **opcoes: Any) -> Any:
        mensagem = super().message(**opcoes)
        if not self.imagens or not self.alternatives:
            return mensagem

        alternativas = cast(
            Message,
            mensagem
            if mensagem.get_content_type() == "multipart/alternative"
            else mensagem.get_payload(0),
        )
        *demais, html = cast(list[Message], alternativas.get_payload())
        relacionadas = SafeMIMEMultipart(
            _subtype="related", encoding=self.encoding or settings.DEFAULT_CHARSET
        )
        relacionadas.attach(html)
        for imagem in self.imagens:
            relacionadas.attach(imagem)
        alternativas.set_payload([*demais, relacionadas])
        return mensagem

class LogoDoEmail(NamedTuple):
    imagem: MIMEImage
    cid: str
    largura: int
    altura: int

def logo_do_email(tenant: Tenant) -> LogoDoEmail | None:
    medidas = logo.caber(tenant, LARGURA_MAXIMA_DA_LOGO_EM_PIXELS, ALTURA_MAXIMA_DA_LOGO_EM_PIXELS)
    conteudo = logo.conteudo(tenant)
    if medidas is None or conteudo is None:
        return None

    imagem = MIMEImage(conteudo, _subtype="png")
    imagem.add_header("Content-ID", f"<{CID_DA_LOGO}>")
    imagem.add_header("Content-Disposition", "inline", filename="logo.png")
    largura, altura = medidas
    return LogoDoEmail(imagem=imagem, cid=CID_DA_LOGO, largura=round(largura), altura=round(altura))
