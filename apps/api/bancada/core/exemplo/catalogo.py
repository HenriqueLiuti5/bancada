from collections.abc import Mapping
from dataclasses import dataclass
from decimal import Decimal

from bancada.financeiro.models import CategoriaDaConta, FormaDePagamentoDaConta

PRIMEIROS_NOMES = [
    "Ana",
    "Bruno",
    "Camila",
    "Diego",
    "Eduarda",
    "Felipe",
    "Gabriela",
    "Heitor",
    "Igor",
    "Isabela",
    "Júlia",
    "Karina",
    "Lucas",
    "Mariana",
    "Nicolas",
    "Olívia",
    "Paulo",
    "Rafaela",
    "Renato",
    "Sabrina",
    "Thiago",
    "Vanessa",
    "Vinícius",
    "Yasmin",
]

SOBRENOMES = [
    "Ribeiro",
    "Carvalho",
    "Duarte",
    "Martins",
    "Lopes",
    "Araújo",
    "Nunes",
    "Barros",
    "Teixeira",
    "Rocha",
    "Farias",
    "Pires",
    "Moreira",
    "Cardoso",
    "Mendes",
    "Freitas",
]

APARELHOS = [
    ("Samsung", "Galaxy A15"),
    ("Samsung", "Galaxy A54"),
    ("Apple", "iPhone 11"),
    ("Apple", "iPhone 13"),
    ("Motorola", "Moto G54"),
    ("Motorola", "Moto E22"),
    ("Xiaomi", "Redmi Note 12"),
    ("Xiaomi", "Redmi 13C"),
]

# A parte do modelo no código das peças, como a loja anota na etiqueta da gaveta.
SIGLAS = {
    "Galaxy A15": "A15",
    "Galaxy A54": "A54",
    "iPhone 11": "IP11",
    "iPhone 13": "IP13",
    "Moto G54": "G54",
    "Moto E22": "E22",
    "Redmi Note 12": "RN12",
    "Redmi 13C": "R13C",
}


@dataclass(frozen=True)
class PecaDoEstoque:
    tipo: str
    nome: str
    sigla: str
    custo_e_preco: Mapping[str, tuple[int, int]]
    minimo: int
    na_matriz: int
    na_filial: int


# As peças que a loja guarda para os consertos mais comuns. As outras são compradas para cada
# conserto, com o custo digitado no orçamento.
PECAS_DO_ESTOQUE = [
    PecaDoEstoque(
        tipo="tela",
        nome="Tela com moldura",
        sigla="TL",
        custo_e_preco={
            "Galaxy A15": (120, 290),
            "Galaxy A54": (310, 590),
            "iPhone 11": (180, 420),
            "iPhone 13": (420, 850),
            "Moto G54": (150, 330),
            "Moto E22": (85, 220),
            "Redmi Note 12": (160, 350),
            "Redmi 13C": (95, 240),
        },
        minimo=3,
        na_matriz=3,
        na_filial=2,
    ),
    PecaDoEstoque(
        tipo="bateria",
        nome="Bateria",
        sigla="BT",
        custo_e_preco={
            "Galaxy A15": (55, 160),
            "Galaxy A54": (70, 190),
            "iPhone 11": (75, 220),
            "iPhone 13": (110, 290),
            "Moto G54": (60, 170),
            "Moto E22": (40, 130),
            "Redmi Note 12": (55, 160),
            "Redmi 13C": (45, 140),
        },
        minimo=3,
        na_matriz=3,
        na_filial=2,
    ),
    PecaDoEstoque(
        tipo="conector",
        nome="Conector de carga",
        sigla="CC",
        custo_e_preco={
            "Galaxy A15": (18, 110),
            "Galaxy A54": (25, 130),
            "iPhone 11": (35, 160),
            "Moto G54": (15, 100),
            "Redmi Note 12": (18, 110),
        },
        minimo=2,
        na_matriz=2,
        na_filial=1,
    ),
]


@dataclass(frozen=True)
class PecaAvulsa:
    nome: str
    custo: tuple[int, int]
    valor: tuple[int, int]


CONECTOR_AVULSO = PecaAvulsa("Conector de carga", (20, 40), (100, 150))


@dataclass(frozen=True)
class Defeito:
    relato: str
    diagnostico: str
    peso: int
    peca: str | None = None
    avulsa: PecaAvulsa | None = None
    servico: tuple[str, int, int] | None = None
    mao_de_obra: tuple[int, int] = (40, 90)


DEFEITOS = [
    Defeito(
        "Tela trincada depois de uma queda",
        "Display e touch danificados. Troca da tela com moldura.",
        22,
        peca="tela",
        mao_de_obra=(60, 90),
    ),
    Defeito(
        "Touch não responde na parte de baixo",
        "Touch falhando na parte de baixo. Troca da tela com moldura.",
        12,
        peca="tela",
        mao_de_obra=(60, 90),
    ),
    Defeito(
        "Bateria descarregando muito rápido",
        "Bateria desgastada, segurando pouca carga. Troca da bateria.",
        12,
        peca="bateria",
        mao_de_obra=(40, 60),
    ),
    Defeito(
        "Bateria estufada, tampa levantando",
        "Bateria estufada. Troca da bateria e nova vedação da tampa.",
        7,
        peca="bateria",
        mao_de_obra=(50, 70),
    ),
    Defeito(
        "Não carrega, só com o cabo em certa posição",
        "Conector de carga com mau contato. Troca do conector.",
        11,
        peca="conector",
        mao_de_obra=(50, 70),
    ),
    Defeito(
        "Caiu na água e não liga",
        "Oxidação na placa. Limpeza química e teste dos componentes.",
        8,
        servico=("Limpeza de oxidação", 120, 250),
    ),
    Defeito(
        "Sem som nas ligações",
        "Alto-falante auricular sem resposta. Troca da peça.",
        7,
        avulsa=PecaAvulsa("Alto-falante auricular", (25, 45), (90, 140)),
    ),
    Defeito(
        "Câmera traseira embaçada",
        "Lente da câmera traseira trincada. Troca da lente.",
        6,
        avulsa=PecaAvulsa("Lente da câmera traseira", (15, 30), (70, 110)),
    ),
    Defeito(
        "Celular muito lento e reiniciando sozinho",
        "Sistema corrompido. Cópia dos dados, formatação e atualização.",
        9,
        servico=("Formatação e atualização", 60, 100),
    ),
    Defeito(
        "Botão de volume afundado",
        "Flex dos botões rompido. Troca do flex.",
        6,
        avulsa=PecaAvulsa("Flex dos botões", (20, 40), (90, 130)),
    ),
]


def ean13(doze_digitos: str) -> str:
    soma = sum(
        int(digito) * (3 if posicao % 2 else 1) for posicao, digito in enumerate(doze_digitos)
    )
    return doze_digitos + str((10 - soma % 10) % 10)


@dataclass(frozen=True)
class Acessorio:
    nome: str
    codigo: str
    custo: Decimal
    preco: Decimal
    minimo: int
    na_matriz: int
    na_filial: int
    peso: int


ACESSORIOS = [
    Acessorio(
        "Película de vidro 3D iPhone 11",
        ean13("789812340011"),
        Decimal("4.50"),
        Decimal("30"),
        17,
        12,
        8,
        10,
    ),
    Acessorio(
        "Película de vidro 3D Galaxy A15",
        ean13("789812340028"),
        Decimal("4.00"),
        Decimal("30"),
        17,
        12,
        8,
        10,
    ),
    Acessorio(
        "Película de vidro 3D Moto G54",
        ean13("789812340035"),
        Decimal("4.00"),
        Decimal("30"),
        13,
        10,
        6,
        7,
    ),
    Acessorio(
        "Película de vidro 3D Redmi Note 12",
        ean13("789812340042"),
        Decimal("4.00"),
        Decimal("30"),
        13,
        10,
        6,
        7,
    ),
    Acessorio(
        "Capinha anti-impacto iPhone 11",
        ean13("789812340059"),
        Decimal("9.00"),
        Decimal("45"),
        11,
        8,
        5,
        6,
    ),
    Acessorio(
        "Capinha anti-impacto Galaxy A15",
        ean13("789812340066"),
        Decimal("8.00"),
        Decimal("40"),
        11,
        8,
        5,
        6,
    ),
    Acessorio(
        "Carregador turbo 25 W USB-C",
        ean13("789812340073"),
        Decimal("38.00"),
        Decimal("99"),
        8,
        6,
        4,
        5,
    ),
    Acessorio(
        "Fonte 20 W USB-C", ean13("789812340080"), Decimal("32.00"), Decimal("89"), 6, 5, 3, 4
    ),
    Acessorio(
        "Cabo USB-C 1 m", ean13("789812340097"), Decimal("9.00"), Decimal("35"), 17, 12, 8, 9
    ),
    Acessorio(
        "Cabo Lightning 1 m", ean13("789812340103"), Decimal("14.00"), Decimal("49"), 11, 8, 5, 6
    ),
    Acessorio(
        "Fone de ouvido Bluetooth",
        ean13("789812340110"),
        Decimal("45.00"),
        Decimal("129"),
        5,
        4,
        2,
        3,
    ),
    Acessorio(
        "Cartão de memória 64 GB",
        ean13("789812340127"),
        Decimal("28.00"),
        Decimal("69"),
        6,
        5,
        3,
        2,
    ),
    Acessorio(
        "Suporte veicular magnético",
        ean13("789812340134"),
        Decimal("15.00"),
        Decimal("49"),
        5,
        4,
        2,
        2,
    ),
]

FORNECEDOR_DE_PECAS = "Fênix Peças"
FORNECEDOR_DE_ACESSORIOS = "Conecta Distribuidora"


@dataclass(frozen=True)
class ContaDoMes:
    descricao: str
    categoria: str
    fornecedor: str
    valor: Decimal
    dia: int
    forma: str
    na_filial: bool | None = None


# As contas que se repetem com o mesmo valor. As de valor que muda, como a luz e o imposto, chegam
# uma de cada vez. Sem loja, a conta é da assistência inteira.
CONTAS_FIXAS = [
    ContaDoMes(
        "Salário da Joana",
        CategoriaDaConta.SALARIOS,
        "Joana",
        Decimal("2200.00"),
        5,
        FormaDePagamentoDaConta.PIX,
    ),
    ContaDoMes(
        "Salário da Carla",
        CategoriaDaConta.SALARIOS,
        "Carla",
        Decimal("1700.00"),
        5,
        FormaDePagamentoDaConta.PIX,
    ),
    ContaDoMes(
        "Aluguel da Matriz",
        CategoriaDaConta.ALUGUEL,
        "Imobiliária Paulista",
        Decimal("1800.00"),
        10,
        FormaDePagamentoDaConta.BOLETO,
        na_filial=False,
    ),
    ContaDoMes(
        "Aluguel da Filial Centro",
        CategoriaDaConta.ALUGUEL,
        "Imobiliária Paulista",
        Decimal("1300.00"),
        10,
        FormaDePagamentoDaConta.BOLETO,
        na_filial=True,
    ),
    ContaDoMes(
        "Contabilidade",
        CategoriaDaConta.SERVICOS,
        "Prado Contabilidade",
        Decimal("420.00"),
        15,
        FormaDePagamentoDaConta.BOLETO,
    ),
    ContaDoMes(
        "Internet da Matriz",
        CategoriaDaConta.CONTAS_DA_LOJA,
        "Fibra Rápida",
        Decimal("119.90"),
        20,
        FormaDePagamentoDaConta.DEBITO,
        na_filial=False,
    ),
    ContaDoMes(
        "Internet da Filial Centro",
        CategoriaDaConta.CONTAS_DA_LOJA,
        "Fibra Rápida",
        Decimal("99.90"),
        20,
        FormaDePagamentoDaConta.DEBITO,
        na_filial=True,
    ),
]
