from decimal import Decimal
from typing import Any

from django.db.models import Count, QuerySet, Sum

from bancada.ordens.models import OrdemServico, Pagamento
from bancada.ordens.painel.periodo import Periodo
from bancada.tenants.models import Usuario

SEM_TECNICO = "Sem técnico"


def _nomes(ids: set[int]) -> dict[int, str]:
    return {usuario.pk: usuario.nome_de_exibicao for usuario in Usuario.objects.filter(pk__in=ids)}


def por_tecnico(consulta: QuerySet[OrdemServico], periodo: Periodo) -> list[dict[str, Any]]:
    concluidas = {
        linha["tecnico"]: linha["total"]
        for linha in consulta.filter(periodo.filtro("entregue_em"))
        .values("tecnico")
        .annotate(total=Count("id"))
    }
    recebido = {
        linha["ordem__tecnico"]: linha["total"]
        for linha in Pagamento.objects.filter(ordem__in=consulta)
        .filter(periodo.filtro("recebido_em"))
        .values("ordem__tecnico")
        .annotate(total=Sum("valor"))
    }

    tecnicos = set(concluidas) | set(recebido)
    nomes = _nomes({tecnico for tecnico in tecnicos if tecnico is not None})

    linhas = [
        {
            "tecnico": tecnico,
            "nome": nomes.get(tecnico, SEM_TECNICO) if tecnico is not None else SEM_TECNICO,
            "concluidas": concluidas.get(tecnico, 0),
            "recebido": recebido.get(tecnico, Decimal("0.00")),
        }
        for tecnico in tecnicos
    ]
    linhas.sort(key=lambda linha: (-linha["concluidas"], -linha["recebido"], linha["nome"]))
    return [{**linha, "recebido": str(linha["recebido"])} for linha in linhas]
