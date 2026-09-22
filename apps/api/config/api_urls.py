from django.db import transaction
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from bancada.clientes.views import AparelhoViewSet, ClienteViewSet
from bancada.ordens.views import OrdemServicoViewSet
from bancada.ordens.views_publicas import AcompanhamentoPublicoView
from bancada.tenants.views import EuView, LoginView, LogoutView, LojasView

router = DefaultRouter()
router.register("clientes", ClienteViewSet, basename="cliente")
router.register("aparelhos", AparelhoViewSet, basename="aparelho")
router.register("ordens", OrdemServicoViewSet, basename="ordem")

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/eu/", EuView.as_view(), name="eu"),
    path("lojas/", LojasView.as_view(), name="lojas"),
    path(
        "publico/os/<str:token>/",
        transaction.non_atomic_requests(AcompanhamentoPublicoView.as_view()),
        name="acompanhamento-publico",
    ),
    path("", include(router.urls)),
]
