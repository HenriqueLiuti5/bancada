from django.db import transaction
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from bancada.clientes.views import AparelhoViewSet, ClienteViewSet
from bancada.ordens.views import FotoViewSet, OrdemServicoViewSet
from bancada.ordens.views_fotos import ArquivoDaFotoView
from bancada.ordens.views_publicas import AcompanhamentoPublicoView
from bancada.tenants.views import (
    AssistenciaView,
    EquipeView,
    LojasView,
    LojaView,
    UsuarioViewSet,
)
from bancada.tenants.views_contas import (
    CadastroView,
    ConfirmarEmailView,
    EsqueciASenhaView,
    EuView,
    LoginView,
    LogoutView,
    RedefinirASenhaView,
    ReenviarConfirmacaoView,
)
from bancada.tenants.views_convites import (
    AceiteDeConviteView,
    ConvitePublicoView,
    ConviteViewSet,
)

router = DefaultRouter()
router.register("clientes", ClienteViewSet, basename="cliente")
router.register("aparelhos", AparelhoViewSet, basename="aparelho")
router.register("ordens", OrdemServicoViewSet, basename="ordem")
router.register("fotos", FotoViewSet, basename="foto")
router.register("usuarios", UsuarioViewSet, basename="usuario")
router.register("convites", ConviteViewSet, basename="convite")

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/eu/", EuView.as_view(), name="eu"),
    path("auth/cadastro/", CadastroView.as_view(), name="cadastro"),
    path("auth/senha/esqueci/", EsqueciASenhaView.as_view(), name="esqueci-a-senha"),
    path("auth/senha/redefinir/", RedefinirASenhaView.as_view(), name="redefinir-a-senha"),
    path("auth/email/confirmar/", ConfirmarEmailView.as_view(), name="confirmar-email"),
    path("auth/email/reenviar/", ReenviarConfirmacaoView.as_view(), name="reenviar-confirmacao"),
    path("assistencia/", AssistenciaView.as_view(), name="assistencia"),
    path("lojas/", LojasView.as_view(), name="lojas"),
    path("lojas/<int:pk>/", LojaView.as_view(), name="loja"),
    path("equipe/", EquipeView.as_view(), name="equipe"),
    path(
        "fotos/arquivo/<str:assinatura>/",
        transaction.non_atomic_requests(ArquivoDaFotoView.as_view()),
        name="arquivo-da-foto",
    ),
    path(
        "publico/os/<str:token>/",
        transaction.non_atomic_requests(AcompanhamentoPublicoView.as_view()),
        name="acompanhamento-publico",
    ),
    path("publico/convites/<str:token>/", ConvitePublicoView.as_view(), name="convite-publico"),
    path(
        "publico/convites/<str:token>/aceitar/",
        AceiteDeConviteView.as_view(),
        name="aceite-de-convite",
    ),
    path("", include(router.urls)),
]
