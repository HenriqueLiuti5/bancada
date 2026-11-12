from datetime import date
from typing import Any

from rest_framework import serializers

from reparium.assinaturas import fundadores, regras
from reparium.assinaturas.models import Assinatura, Ciclo, Fatura, Plano, SituacaoDaAssinatura
from reparium.assinaturas.planos import (
    PLANOS,
    CondicoesDoPlano,
    Tamanho,
    plano_que_cabe,
    tamanho_da,
)
from reparium.core.cpf_cnpj import cpf_ou_cnpj


def resumo_da_assinatura(assinatura: Assinatura, hoje: date) -> dict[str, Any]:
    retrato = regras.retrato(assinatura, hoje)
    pagar_ate = (
        regras.ultimo_dia_para_pagar(retrato.em_atraso_desde) if retrato.em_atraso_desde else None
    )
    return {
        "situacao": retrato.situacao,
        "situacao_rotulo": SituacaoDaAssinatura(retrato.situacao).label,
        "pode_editar": retrato.pode_editar,
        "contratada": assinatura.contratada,
        "ciclo": assinatura.ciclo,
        "em_teste": hoje <= assinatura.teste_termina_em,
        "teste_termina_em": assinatura.teste_termina_em,
        "dias_de_teste": max(regras.dias_para_o_fim_do_teste(assinatura, hoje), 0),
        "pagar_ate": pagar_ate,
        "acesso_ate": assinatura.acesso_ate,
        "apaga_em": regras.dia_de_apagar(assinatura, hoje),
    }


class FaturaSerializer(serializers.ModelSerializer):
    situacao_rotulo = serializers.CharField(source="get_situacao_display", read_only=True)
    forma_rotulo = serializers.CharField(source="get_forma_de_pagamento_display", read_only=True)

    class Meta:
        model = Fatura
        fields = [
            "id",
            "valor",
            "vencimento",
            "situacao",
            "situacao_rotulo",
            "forma_de_pagamento",
            "forma_rotulo",
            "paga_em",
            "link_de_pagamento",
            "link_da_devolucao",
        ]


def dados_do_plano(condicoes: CondicoesDoPlano) -> dict[str, Any]:
    return {
        "plano": condicoes.plano.value,
        "nome": condicoes.plano.label,
        "lojas": condicoes.lojas,
        "pessoas": condicoes.pessoas,
        "mensal": str(condicoes.mensal),
        "anual": str(condicoes.anual),
        "fundador_mensal": str(condicoes.fundador_mensal),
        "fundador_anual": str(condicoes.fundador_anual),
    }


def _planos(tamanho: Tamanho) -> list[dict[str, Any]]:
    return [
        {**dados_do_plano(condicoes), "por_que_nao_cabe": condicoes.por_que_nao_cabe(tamanho)}
        for condicoes in PLANOS.values()
    ]


def _cancelamento(assinatura: Assinatura, hoje: date) -> dict[str, Any] | None:
    if not assinatura.contratada:
        return None
    devolve = regras.fatura_a_devolver(assinatura, hoje)
    return {
        "devolve": str(devolve.valor) if devolve else None,
        "acesso_ate": regras.acesso_depois_do_cancelamento(assinatura, hoje, sem=devolve),
    }


def detalhe_da_assinatura(assinatura: Assinatura, hoje: date) -> dict[str, Any]:
    tamanho = tamanho_da(assinatura.tenant)
    sugerido = plano_que_cabe(tamanho)
    return {
        **resumo_da_assinatura(assinatura, hoje),
        "plano": assinatura.plano,
        "plano_rotulo": assinatura.get_plano_display(),
        "ciclo_rotulo": assinatura.get_ciclo_display(),
        "valor": None if assinatura.valor is None else str(assinatura.valor),
        "fundador": assinatura.fundador,
        "ganha_preco_de_fundador": fundadores.ganha_preco_de_fundador(assinatura.tenant),
        "fundadores": fundadores.situacao_dos_fundadores(),
        "planos": _planos(tamanho),
        "plano_sugerido": sugerido.value if sugerido else None,
        "tamanho": {"lojas": tamanho.lojas, "pessoas": tamanho.pessoas},
        "cancelamento": _cancelamento(assinatura, hoje),
        "primeiro_vencimento": regras.primeiro_vencimento(assinatura, hoje),
        "documento_do_pagador": assinatura.documento_do_pagador,
        "assinada_em": assinatura.assinada_em,
        "faturas": FaturaSerializer(assinatura.faturas.all(), many=True).data,
    }


class AssinarSerializer(serializers.Serializer):
    documento = serializers.CharField(max_length=24)
    plano = serializers.ChoiceField(
        choices=Plano.choices, error_messages={"invalid_choice": "Escolha um dos planos."}
    )
    ciclo = serializers.ChoiceField(
        choices=Ciclo.choices,
        error_messages={"invalid_choice": "Escolha entre o pagamento mensal e o anual."},
    )

    def validate_documento(self, valor: str) -> str:
        documento = cpf_ou_cnpj(valor)
        if documento is None:
            raise serializers.ValidationError("Informe um CPF ou CNPJ válido.")
        return documento
