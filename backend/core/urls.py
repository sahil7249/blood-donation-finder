from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views, auth_views
from .chat_view import chat

router = DefaultRouter()
router.register("donors", views.DonorViewSet, basename="donor")
router.register("banks", views.BloodBankViewSet, basename="bank")
router.register("requests", views.EmergencyRequestViewSet, basename="request")

urlpatterns = [
    path("stats/", views.stats),
    path("chat/", chat),
    path("auth/signup/", auth_views.signup),
    path("auth/login/", auth_views.login),
    path("auth/logout/", auth_views.logout),
    path("auth/me/", auth_views.me),
    path("", include(router.urls)),
]