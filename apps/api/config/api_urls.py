from django.urls import include, path
from rest_framework.routers import DefaultRouter

from bancada.clientes.views import AparelhoViewSet, ClienteViewSet
from bancada.ordens.views import OrdemServicoViewSet
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
    path("", include(router.urls)),
]
