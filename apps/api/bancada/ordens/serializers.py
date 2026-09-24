from decimal import Decimal

from rest_framework import serializers

from bancada.clientes.models import Aparelho, Cliente
from bancada.core.telefones import so_digitos, telefone_brasileiro
from bancada.ordens.estados import TRANSICOES, StatusOS
from bancada.ordens.fotos import MomentoDaFoto, assinar
from bancada.ordens.models import EventoOS, FotoOS, ItemOrcamento, OrdemServico
from bancada.tenants.models import Loja


class ItemOrcamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemOrcamento
        fields = ["id", "tipo", "descricao", "valor", "aprovado"]
        read_only_fields = ["aprovado"]
        extra_kwargs = {
            "valor": {
                "min_value": Decimal("0"),
                "error_messages": {"min_value": "O valor não pode ser negativo."},
            }
        }


class FotoOSSerializer(serializers.ModelSerializer):
    momento_label = serializers.CharField(source="get_momento_display", read_only=True)
    assinatura = serializers.SerializerMethodField()

    class Meta:
        model = FotoOS
        fields = [
            "id",
            "momento",
            "momento_label",
            "legenda",
            "largura",
            "altura",
            "visivel_ao_cliente",
            "assinatura",
            "criado_em",
        ]
        read_only_fields = ["momento", "legenda", "largura", "altura", "criado_em"]

    def get_assinatura(self, obj: FotoOS) -> str:
        return assinar(obj.pk)


class EnvioDeFotoSerializer(serializers.Serializer):
    arquivo = serializers.FileField()
    momento = serializers.ChoiceField(choices=MomentoDaFoto.choices, default=MomentoDaFoto.ENTRADA)
    legenda = serializers.CharField(required=False, allow_blank=True, default="", max_length=140)


class EventoOSSerializer(serializers.ModelSerializer):
    usuario = serializers.CharField(source="usuario.nome_de_exibicao", read_only=True, default=None)
    de_label = serializers.SerializerMethodField()
    para_label = serializers.SerializerMethodField()
    aviso = serializers.SerializerMethodField()

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
            "aviso",
            "criado_em",
        ]

    def get_aviso(self, obj: EventoOS) -> dict[str, str] | None:
        aviso = getattr(obj, "aviso", None)
        if aviso is None or aviso.enviado_em is None:
            return None
        return {"destino": aviso.destino, "enviado_em": aviso.enviado_em.isoformat()}

    def get_de_label(self, obj: EventoOS) -> str:
        return StatusOS(obj.de_status).label if obj.de_status else "Abertura"

    def get_para_label(self, obj: EventoOS) -> str:
        return StatusOS(obj.para_status).label


class OrdemServicoListSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source="cliente.nome", read_only=True)
    aparelho_descricao = serializers.CharField(source="aparelho.__str__", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    tecnico_nome = serializers.CharField(
        source="tecnico.nome_de_exibicao", read_only=True, default=None
    )

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
    fotos = FotoOSSerializer(many=True, read_only=True)
    transicoes_possiveis = serializers.SerializerMethodField()
    total_orcamento = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_aprovado = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    orcamento_editavel = serializers.BooleanField(read_only=True)
    orcamento_aprovado = serializers.BooleanField(read_only=True)
    imei_mascarado = serializers.CharField(source="aparelho.imei_mascarado", read_only=True)

    class Meta(OrdemServicoListSerializer.Meta):
        fields = [
            *OrdemServicoListSerializer.Meta.fields,
            "aparelho",
            "tecnico",
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
            "total_aprovado",
            "orcamento_editavel",
            "orcamento_aprovado",
        ]

    def get_transicoes_possiveis(self, obj: OrdemServico) -> list[dict[str, str]]:
        return [
            {"valor": status, "rotulo": StatusOS(status).label}
            for status in sorted(TRANSICOES.get(obj.status, frozenset()))
        ]


class EdicaoDaOrdemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrdemServico
        fields = ["diagnostico", "laudo", "prometida_para", "garantia_ate", "tecnico"]

    def validate_tecnico(self, valor: object) -> object:
        tenant = self.context["tenant"]
        if valor is not None and getattr(valor, "tenant_id", None) != tenant.id:
            raise serializers.ValidationError("Esse usuário não é da sua assistência.")
        return valor


class NovoClienteSerializer(serializers.Serializer):
    nome = serializers.CharField(max_length=140)
    telefone = serializers.CharField(max_length=30)
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    documento = serializers.CharField(max_length=14, required=False, allow_blank=True, default="")

    def validate_nome(self, valor: str) -> str:
        return valor.strip()

    def validate_telefone(self, valor: str) -> str:
        digitos = telefone_brasileiro(valor)
        if digitos is None:
            raise serializers.ValidationError("Informe o telefone com DDD.")
        return digitos


class NovoAparelhoSerializer(serializers.Serializer):
    marca = serializers.CharField(max_length=60)
    modelo = serializers.CharField(max_length=80)
    cor = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    imei = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    senha_desbloqueio = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_imei(self, valor: str) -> str:
        return so_digitos(valor)


class AberturaOrdemSerializer(serializers.Serializer):
    loja = serializers.PrimaryKeyRelatedField(queryset=Loja.objects.all())
    cliente = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.all(), required=False, allow_null=True
    )
    cliente_novo = NovoClienteSerializer(required=False, allow_null=True)
    aparelho = serializers.PrimaryKeyRelatedField(
        queryset=Aparelho.objects.all(), required=False, allow_null=True
    )
    aparelho_novo = NovoAparelhoSerializer(required=False, allow_null=True)
    problema_relatado = serializers.CharField()

    def _exigir_um_dos_dois(self, attrs: dict, existente: str, novo: str, rotulo: str) -> None:
        if bool(attrs.get(existente)) == bool(attrs.get(novo)):
            raise serializers.ValidationError(
                {existente: f"Escolha um {rotulo} já cadastrado ou cadastre um novo."}
            )

    def validate(self, attrs: dict) -> dict:
        self._exigir_um_dos_dois(attrs, "cliente", "cliente_novo", "cliente")
        self._exigir_um_dos_dois(attrs, "aparelho", "aparelho_novo", "aparelho")

        tenant = self.context["tenant"]
        for campo in ["loja", "cliente", "aparelho"]:
            registro = attrs.get(campo)
            if registro is not None and registro.tenant_id != tenant.id:
                raise serializers.ValidationError({campo: "Não pertence à sua assistência."})

        aparelho = attrs.get("aparelho")
        cliente = attrs.get("cliente")
        if aparelho is not None and (cliente is None or aparelho.cliente_id != cliente.id):
            raise serializers.ValidationError({"aparelho": "Não pertence a esse cliente."})
        return attrs


class TransicaoSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=StatusOS.choices)
    nota = serializers.CharField(required=False, allow_blank=True, default="")
    itens_aprovados = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=False,
        error_messages={
            "empty": "Marque ao menos um item. Se o cliente recusou tudo, use Reprovado."
        },
    )

    def validate(self, attrs: dict) -> dict:
        ordem: OrdemServico = self.context["ordem"]
        destino = attrs["status"]

        if destino == StatusOS.ORCAMENTO_ENVIADO and not ordem.itens.exists():
            raise serializers.ValidationError(
                {"status": "Adicione ao menos um item ao orçamento antes de enviá-lo ao cliente."}
            )

        aprovados = attrs.get("itens_aprovados")
        if aprovados is None:
            return attrs
        if destino != StatusOS.APROVADO:
            raise serializers.ValidationError(
                {"itens_aprovados": "Só se escolhem itens ao aprovar o orçamento."}
            )
        do_orcamento = set(ordem.itens.values_list("pk", flat=True))
        if not set(aprovados) <= do_orcamento:
            raise serializers.ValidationError(
                {"itens_aprovados": "Há itens que não fazem parte deste orçamento."}
            )
        return attrs
