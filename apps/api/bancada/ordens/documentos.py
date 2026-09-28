import base64
import io
from typing import Any

import qrcode
from django.conf import settings
from django.template.loader import render_to_string
from weasyprint import HTML

from bancada.ordens.estados import StatusOS
from bancada.ordens.fotos import MomentoDaFoto
from bancada.ordens.models import FotoOS, OrdemServico

FOTOS_NO_COMPROVANTE = 4


def _data_uri(conteudo: bytes, tipo: str) -> str:
    return f"data:{tipo};base64,{base64.b64encode(conteudo).decode()}"


def qrcode_do_acompanhamento(link: str) -> str:
    imagem = qrcode.make(link, box_size=6, border=2)
    destino = io.BytesIO()
    imagem.save(destino, format="PNG")
    return _data_uri(destino.getvalue(), "image/png")


def foto_embutida(foto: FotoOS) -> str | None:
    try:
        with foto.arquivo.open("rb") as arquivo:
            return _data_uri(arquivo.read(), "image/jpeg")
    except OSError:
        return None


def _fotos_da_entrada(ordem: OrdemServico) -> list[str]:
    entradas = [foto for foto in ordem.fotos.all() if foto.momento == MomentoDaFoto.ENTRADA]
    embutidas = (foto_embutida(foto) for foto in entradas[:FOTOS_NO_COMPROVANTE])
    return [uri for uri in embutidas if uri]


def _link_publico(ordem: OrdemServico) -> str:
    return f"{settings.APP_PUBLIC_URL}/os/{ordem.token_publico}"


def _comum(ordem: OrdemServico) -> dict[str, Any]:
    link = _link_publico(ordem)
    return {
        "ordem": ordem,
        "assistencia": ordem.tenant,
        "loja": ordem.loja,
        "cliente": ordem.cliente,
        "aparelho": ordem.aparelho,
        "link": link,
        "qrcode": qrcode_do_acompanhamento(link),
    }


def html_do_comprovante(ordem: OrdemServico) -> str:
    return render_to_string(
        "ordens/documentos/comprovante.html",
        {**_comum(ordem), "fotos": _fotos_da_entrada(ordem)},
    )


def _linha_do_tempo(ordem: OrdemServico) -> list[dict[str, Any]]:
    return [
        {"em": evento.criado_em, "rotulo": StatusOS(evento.para_status).label}
        for evento in ordem.eventos.all()
    ]


def html_do_recibo(ordem: OrdemServico) -> str:
    return render_to_string(
        "ordens/documentos/recibo.html",
        {
            **_comum(ordem),
            "itens": list(ordem.itens.filter(aprovado=True)),
            "total": ordem.total_aprovado,
            "pagamentos": list(ordem.pagamentos.all()),
            "linha_do_tempo": _linha_do_tempo(ordem),
        },
    )


def em_pdf(html: str) -> bytes:
    return HTML(string=html).write_pdf()


def comprovante_em_pdf(ordem: OrdemServico) -> bytes:
    return em_pdf(html_do_comprovante(ordem))


def recibo_em_pdf(ordem: OrdemServico) -> bytes:
    return em_pdf(html_do_recibo(ordem))


def nome_do_arquivo(ordem: OrdemServico, documento: str) -> str:
    return f"OS-{ordem.numero}-{documento}.pdf"
