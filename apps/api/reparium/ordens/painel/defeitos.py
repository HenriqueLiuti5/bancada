import re
import unicodedata
from collections import Counter
from collections.abc import Iterable

CATEGORIAS: dict[str, tuple[str, ...]] = {
    "Tela": ("tela", "display", "touch", "vidro", "trinc", "lcd", "oled", "frontal"),
    "Bateria": ("bateria", "descarreg", "estufad", "nao segura carga"),
    "Carregamento": ("carreg", "conector", "entrada usb", r"cabo\b"),
    "Não liga": ("nao liga", "nao esta ligando", "desligou", "apagou", "morreu"),
    "Contato com líquido": ("agua", "molh", "liquido", "oxid", "umidade", "chuva"),
    "Câmera": ("camera", r"foco\b", "lente"),
    "Som e microfone": (
        r"som\b",
        "audio",
        "alto.?falante",
        "microfone",
        "auricular",
        "nao ouve",
        "nao escuta",
    ),
    "Botões": (r"bot(ao|oes)\b", "power", "volume"),
    "Sistema": (
        "trav",
        r"lent(o|a|idao)\b",
        "reinici",
        "sistema",
        "software",
        "atualiz",
        r"format(ar|ou|acao)\b",
        "conta google",
        "bloque",
        "virus",
    ),
    "Sinal e conexão": ("sinal", "chip", r"wi.?fi\b", "bluetooth", r"rede\b", "operadora"),
}


def _sem_acentos(texto: str) -> str:
    decomposto = unicodedata.normalize("NFKD", texto.lower())
    return "".join(letra for letra in decomposto if not unicodedata.combining(letra))


def _padrao(trechos: tuple[str, ...]) -> re.Pattern[str]:
    return re.compile(rf"\b(?:{'|'.join(trechos)})")


PADROES = {categoria: _padrao(trechos) for categoria, trechos in CATEGORIAS.items()}


def categorias_do_relato(relato: str) -> set[str]:
    texto = _sem_acentos(relato)
    return {categoria for categoria, padrao in PADROES.items() if padrao.search(texto)}


def mais_comuns(relatos: Iterable[str], limite: int) -> list[dict[str, str | int]]:
    contagem: Counter[str] = Counter()
    for relato in relatos:
        contagem.update(categorias_do_relato(relato))
    return [
        {"defeito": categoria, "total": total} for categoria, total in contagem.most_common(limite)
    ]
