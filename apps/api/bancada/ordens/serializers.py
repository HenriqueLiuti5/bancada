from pathlib import Path
from typing import Any

from rest_framework import serializers

from bancada.clientes.models import Aparelho, Cliente
from bancada.ordens.estados import TRANSICOES, StatusOS
from bancada.ordens.fotos import EXTENSOES_ACEITAS, TAMANHO_MAXIMO_EM_BYTES, FotoOrdem
from bancada.ordens.models import EventoOS, ItemOrcamento, OrdemServico
from bancada.tenants.models import Loja


class ItemOrcamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemOrcamento
        fields = ["id", "tipo", "descricao", "valor", "aprovado"]


class EventoOSSerializer(serializers.ModelSerializer):
    usuario = serializers.CharField(source="usuario.username", read_only=True, default=None)
    de_label = serializers.SerializerMethodField()
    para_label = serializers.SerializerMethodField()

    class Meta:
        model = EventoOS
        fields = [
            "id",
            "de_status",
            "de_label",
            "para_status",
            "para_label",
            "usuario",
            "nota",
            "criado_em",
        ]

    def get_de_label(self, obj: EventoOS) -> str:
        return StatusOS(obj.de_status).label if obj.de_status else "Abertura"

    def get_para_label(self, obj: EventoOS) -> str:
        return StatusOS(obj.para_status).label


class FotoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    momento_label = serializers.CharField(source="get_momento_display", read_only=True)

    class Meta:
        model = FotoOrdem
        fields = ["id", "url", "momento", "momento_label", "legenda", "criado_em"]

    def get_url(self, obj: FotoOrdem) -> str:
        return obj.arquivo.url


class EnvioDeFotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FotoOrdem
        fields = ["arquivo", "momento", "legenda"]

    def validate_arquivo(self, arquivo: Any) -> Any:
        if arquivo.size > TAMANHO_MAXIMO_EM_BYTES:
            limite = TAMANHO_MAXIMO_EM_BYTES // (1024 * 1024)
            raise serializers.ValidationError(f"A foto passa de {limite} MB.")
        extensao = Path(arquivo.name).suffix.lower()
        if extensao not in EXTENSOES_ACEITAS:
            aceitas = ", ".join(sorted(EXTENSOES_ACEITAS))
            raise serializers.ValidationError(f"Formato não aceito. Use: {aceitas}.")
        return arquivo


class OrdemServicoListSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source="cliente.nome", read_only=True)
    aparelho_descricao = serializers.CharField(source="aparelho.__str__", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    tecnico_nome = serializers.CharField(source="tecnico.username", read_only=True, default=None)

    class Meta:
        model = OrdemServico
        fields = [
            "id",
            "numero",
            "status",
            "status_label",
            "cliente_nome",
            "aparelho_descricao",
            "tecnico_nome",
            "problema_relatado",
            "token_publico",
            "criado_em",
        ]


class OrdemServicoDetailSerializer(OrdemServicoListSerializer):
    itens = ItemOrcamentoSerializer(many=True, read_only=True)
    eventos = EventoOSSerializer(many=True, read_only=True)
    fotos = FotoSerializer(many=True, read_only=True)
    transicoes_possiveis = serializers.SerializerMethodField()
    total_orcamento = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    imei_mascarado = serializers.CharField(source="aparelho.imei_mascarado", read_only=True)

    class Meta(OrdemServicoListSerializer.Meta):
        fields = [
            *OrdemServicoListSerializer.Meta.fields,
            "diagnostico",
            "laudo",
            "prometida_para",
            "garantia_ate",
            "entregue_em",
            "imei_mascarado",
            "itens",
            "eventos",
            "fotos",
            "transicoes_possiveis",
            "total_orcamento",
        ]

    def get_transicoes_possiveis(self, obj: OrdemServico) -> list[dict[str, str]]:
        return [
            {"valor": status, "rotulo": StatusOS(status).label}
            for status in sorted(TRANSICOES.get(obj.status, frozenset()))
        ]


class AberturaOrdemSerializer(serializers.Serializer):
    loja = serializers.PrimaryKeyRelatedField(queryset=Loja.objects.all())
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all())
    aparelho = serializers.PrimaryKeyRelatedField(queryset=Aparelho.objects.all())
    problema_relatado = serializers.CharField()

    def validate(self, attrs: dict) -> dict:
        tenant = self.context["tenant"]
        for campo in ["loja", "cliente", "aparelho"]:
            if attrs[campo].tenant_id != tenant.id:
                raise serializers.ValidationError({campo: "Não pertence à sua assistência."})
        if attrs["aparelho"].cliente_id != attrs["cliente"].id:
            raise serializers.ValidationError({"aparelho": "Não pertence a esse cliente."})
        return attrs


class TransicaoSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=StatusOS.choices)
    nota = serializers.CharField(required=False, allow_blank=True, default="")
