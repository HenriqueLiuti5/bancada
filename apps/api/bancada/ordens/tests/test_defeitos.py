import pytest

from bancada.ordens.painel.defeitos import categorias_do_relato, mais_comuns


@pytest.mark.parametrize(
    ("relato", "categorias"),
    [
        ("Tela trincada após queda", {"Tela"}),
        ("Caiu na água e não liga", {"Contato com líquido", "Não liga"}),
        ("NÃO CARREGA", {"Carregamento"}),
        ("Bateria descarregando rápido", {"Bateria"}),
        ("Sem som nas ligações", {"Som e microfone"}),
        ("Somente a lente da câmera riscada", {"Câmera"}),
        ("Celular muito lento e reiniciando", {"Sistema"}),
        ("Botão de volume afundado", {"Botões"}),
        ("Não pega sinal do chip", {"Sinal e conexão"}),
        ("Cliente quer película nova", set()),
    ],
)
def test_relato_ganha_as_categorias_que_menciona(relato: str, categorias: set[str]) -> None:
    assert categorias_do_relato(relato) == categorias


def test_mais_comuns_conta_cada_ordem_em_todas_as_categorias_dela() -> None:
    relatos = ["Tela quebrada", "Tela e bateria", "Bateria estufada", "Tela manchada"]

    assert mais_comuns(relatos, limite=2) == [
        {"defeito": "Tela", "total": 3},
        {"defeito": "Bateria", "total": 2},
    ]
