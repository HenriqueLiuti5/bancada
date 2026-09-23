import io
from typing import Any

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from PIL import Image, ImageDraw, ImageFont

from bancada.clientes.models import Aparelho, Cliente
from bancada.ordens.estados import StatusOS
from bancada.ordens.fotos import MomentoDaFoto
from bancada.ordens.models import FotoOS, ItemOrcamento, OrdemServico, TipoItem
from bancada.tenants.models import Loja, Papel, Tenant, Usuario

SENHA_DEMO = "bancada123"


def imagem_de_demonstracao(texto: str, fundo: tuple[int, int, int]) -> ContentFile:
    imagem = Image.new("RGB", (1200, 900), fundo)
    desenho = ImageDraw.Draw(imagem)
    desenho.text((70, 70), texto, fill=(245, 245, 245), font=ImageFont.load_default(size=52))
    destino = io.BytesIO()
    imagem.save(destino, format="JPEG", quality=90)
    return ContentFile(destino.getvalue(), name="demonstracao.jpg")


class Command(BaseCommand):
    help = "Cria dados de demonstração para uso local"

    def handle(self, *args: Any, **options: Any) -> None:
        if not settings.DEBUG:
            raise CommandError("Este comando só roda com DJANGO_DEBUG=1")

        tenant, _ = Tenant.objects.get_or_create(
            slug="assistencia-central",
            defaults={"nome": "Assistência Central", "documento": "12.345.678/0001-90"},
        )
        loja, _ = Loja.objects.get_or_create(
            tenant=tenant,
            nome="Matriz",
            defaults={"telefone": "1133334444", "endereco": "Rua das Flores, 100"},
        )

        if not Usuario.objects.filter(username="admin").exists():
            Usuario.objects.create_superuser(
                username="admin", email="admin@bancada.local", password=SENHA_DEMO
            )

        tecnico, criado = Usuario.objects.get_or_create(
            username="joana",
            defaults={"tenant": tenant, "papel": Papel.TECNICO, "first_name": "Joana"},
        )
        if criado:
            tecnico.set_password(SENHA_DEMO)
            tecnico.save(update_fields=["password"])

        maria, _ = Cliente.objects.get_or_create(
            tenant=tenant,
            telefone="11999990000",
            defaults={"nome": "Maria Souza", "email": "maria@exemplo.com"},
        )
        moto, _ = Aparelho.objects.get_or_create(
            tenant=tenant,
            cliente=maria,
            marca="Motorola",
            modelo="Moto G54",
            defaults={"cor": "Azul", "imei": "358240051111110", "senha_desbloqueio": "1234"},
        )

        joao, _ = Cliente.objects.get_or_create(
            tenant=tenant,
            telefone="11988887777",
            defaults={"nome": "João Pereira"},
        )
        samsung, _ = Aparelho.objects.get_or_create(
            tenant=tenant,
            cliente=joao,
            marca="Samsung",
            modelo="Galaxy A15",
            defaults={"cor": "Preto", "imei": "352099001761481"},
        )

        if OrdemServico.objects.filter(tenant=tenant).exists():
            self.stdout.write(self.style.WARNING("Já existem ordens; nada foi criado."))
            self._garantir_fotos(tenant, tecnico)
            self._resumo(tenant)
            return

        recebida = OrdemServico.abrir(
            tenant=tenant,
            loja=loja,
            cliente=maria,
            aparelho=moto,
            problema_relatado="Não carrega. Caiu na água há dois dias.",
            aberta_por=tecnico,
            tecnico=tecnico,
        )

        em_reparo = OrdemServico.abrir(
            tenant=tenant,
            loja=loja,
            cliente=joao,
            aparelho=samsung,
            problema_relatado="Tela trincada após queda.",
            aberta_por=tecnico,
            tecnico=tecnico,
        )
        for status in [
            StatusOS.EM_DIAGNOSTICO,
            StatusOS.ORCAMENTO_ENVIADO,
            StatusOS.APROVADO,
            StatusOS.EM_REPARO,
        ]:
            em_reparo.transicionar(status, usuario=tecnico)

        ItemOrcamento.objects.create(
            ordem=em_reparo,
            tipo=TipoItem.PECA,
            descricao="Tela completa Galaxy A15",
            valor="320.00",
            aprovado=True,
        )
        ItemOrcamento.objects.create(
            ordem=em_reparo,
            tipo=TipoItem.SERVICO,
            descricao="Mão de obra",
            valor="90.00",
            aprovado=True,
        )

        self._garantir_fotos(tenant, tecnico)

        self.stdout.write(self.style.SUCCESS("Dados de demonstração criados."))
        self.stdout.write(f"  OS #{recebida.numero}: {recebida.status}")
        self.stdout.write(f"  OS #{em_reparo.numero}: {em_reparo.status}")
        self._resumo(tenant)

    def _garantir_fotos(self, tenant: Tenant, tecnico: Usuario) -> None:
        for ordem in OrdemServico.objects.filter(tenant=tenant).select_related("aparelho"):
            if ordem.fotos.exists():
                continue
            FotoOS.registrar(
                ordem=ordem,
                enviado=imagem_de_demonstracao(f"{ordem.aparelho} na entrada", (31, 41, 55)),
                momento=MomentoDaFoto.ENTRADA,
                legenda="Aparelho como foi recebido",
                enviada_por=tecnico,
            )
            self.stdout.write(f"  foto de demonstração criada na OS #{ordem.numero}")

    def _resumo(self, tenant: Tenant) -> None:
        self.stdout.write("")
        self.stdout.write(f"  admin / {SENHA_DEMO}  (superusuário)")
        self.stdout.write(f"  joana / {SENHA_DEMO}  (técnica de {tenant.nome})")
        for ordem in OrdemServico.objects.filter(tenant=tenant):
            self.stdout.write(f"  token público da OS #{ordem.numero}: {ordem.token_publico}")
