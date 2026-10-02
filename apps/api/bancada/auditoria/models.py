from django.conf import settings
from django.db import models

from bancada.core.models import Carimbado


class Acao(models.TextChoices):
    SENHA_VISTA = "senha_vista", "Senha de desbloqueio consultada"
    SENHA_NEGADA = "senha_negada", "Consulta à senha negada"
    SENHA_PURGADA = "senha_purgada", "Senha de desbloqueio removida"
    USUARIO_CRIADO = "usuario_criado", "Usuário criado"
    USUARIO_ALTERADO = "usuario_alterado", "Usuário alterado"
    SENHA_REDEFINIDA = "senha_redefinida", "Senha de acesso redefinida"
    ASSISTENCIA_CRIADA = "assistencia_criada", "Assistência criada"
    ASSISTENCIA_ALTERADA = "assistencia_alterada", "Dados da assistência alterados"
    CONVITE_CRIADO = "convite_criado", "Convite para a equipe criado"
    CONVITE_CANCELADO = "convite_cancelado", "Convite para a equipe cancelado"
    LINK_COMPARTILHADO = "link_compartilhado", "Link de acompanhamento compartilhado"
    PAGAMENTO_REMOVIDO = "pagamento_removido", "Pagamento removido"
    ASSINATURA_CONTRATADA = "assinatura_contratada", "Assinatura contratada"
    ASSINATURA_CANCELADA = "assinatura_cancelada", "Assinatura cancelada"
    PLATAFORMA_CONSULTADA = "plataforma_consultada", "Painel da plataforma consultado"
    CUSTO_LANCADO = "custo_lancado", "Custo da plataforma lançado"
    CUSTO_REMOVIDO = "custo_removido", "Custo da plataforma removido"


class RegistroDeAuditoria(Carimbado):
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="registros_de_auditoria",
        null=True,
        blank=True,
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="registros_de_auditoria",
        null=True,
        blank=True,
    )
    acao = models.CharField(max_length=30, choices=Acao.choices)
    objeto = models.CharField(max_length=40)
    objeto_id = models.PositiveBigIntegerField()
    detalhe = models.CharField(max_length=200, blank=True)
    origem = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        verbose_name = "registro de auditoria"
        verbose_name_plural = "registros de auditoria"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["tenant", "-criado_em"]),
            models.Index(fields=["objeto", "objeto_id"]),
        ]

    def __str__(self) -> str:
        quem = self.usuario.get_username() if self.usuario else "sistema"
        return f"{self.get_acao_display()} — {self.objeto} {self.objeto_id} por {quem}"
