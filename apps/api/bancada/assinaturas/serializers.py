from datetime import date
from typing import Any

from django.conf import settings
from rest_framework import serializers

from bancada.assinaturas import regras
from bancada.assinaturas.models import Assinatura, Fatura, SituacaoDaAssinatura
from bancada.core.cpf_cnpj import cpf_ou_cnpj


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
        "em_teste": hoje <= assinatura.teste_termina_em,
        "teste_termina_em": assinatura.teste_termina_em,
        "dias_de_teste": max((assinatura.teste_termina_em - hoje).days, 0),
        "pagar_ate": pagar_ate,
        "acesso_ate": assinatura.acesso_ate,
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
        ]


def detalhe_da_assinatura(assinatura: Assinatura, hoje: date) -> dict[str, Any]:
    return {
        **resumo_da_assinatura(assinatura, hoje),
        "valor_mensal": str(assinatura.valor_mensal or settings.VALOR_DA_ASSINATURA),
        "primeiro_vencimento": regras.primeiro_vencimento(assinatura, hoje),
        "documento_do_pagador": assinatura.documento_do_pagador,
        "assinada_em": assinatura.assinada_em,
        "faturas": FaturaSerializer(assinatura.faturas.all(), many=True).data,
    }


class AssinarSerializer(serializers.Serializer):
    documento = serializers.CharField(max_length=24)

    def validate_documento(self, valor: str) -> str:
        documento = cpf_ou_cnpj(valor)
        if documento is None:
            raise serializers.ValidationError("Informe um CPF ou CNPJ válido.")
        return documento
