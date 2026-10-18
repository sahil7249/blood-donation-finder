from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from .models import COOLDOWN_DAYS, BloodBank, ContactRequest, Donor, EmergencyRequest, Inventory
from .serializers import (BloodBankSerializer, DonorSerializer, EmergencyRequestSerializer, StockSerializer)


class DonorViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """List/search donors (public), register a donor (authenticated), request contact (authenticated)."""
    serializer_class = DonorSerializer

    def get_permissions(self):
        if self.action in ["list", "cities"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs, p = Donor.objects.all(), self.request.query_params
        if p.get("blood_group"):
            qs = qs.filter(blood_group=p["blood_group"])
        if p.get("city"):
            qs = qs.filter(city=p["city"])
        cutoff = timezone.localdate() - timedelta(days=COOLDOWN_DAYS)
        if p.get("status") == "cooldown":
            qs = qs.filter(last_donation__gt=cutoff)
        elif p.get("status") == "available":
            qs = qs.filter(Q(last_donation__isnull=True) | Q(last_donation__lte=cutoff))
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user if self.request.user.is_authenticated else None)

    @action(detail=False, methods=["get"])
    def cities(self, request):
        return Response(Donor.objects.order_by("city").values_list("city", flat=True).distinct())

    @action(detail=True, methods=["post"])
    def contact(self, request, pk=None):
        donor = self.get_object()
        if donor.status != "available":
            return Response({"detail": f"{donor.name} is on a 90-day cooldown and can't be contacted yet."},
                            status=status.HTTP_400_BAD_REQUEST)
        ContactRequest.objects.create(
            donor=donor,
            requested_by=request.user if request.user.is_authenticated else None
        )
        return Response({"detail": f"Request sent. {donor.name} has been notified and will respond shortly."},
                        status=status.HTTP_201_CREATED)


class BloodBankViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = BloodBankSerializer

    def get_queryset(self):
        qs = BloodBank.objects.prefetch_related("inventory")
        if self.request.query_params.get("mine") == "true":
            if self.request.user and self.request.user.is_authenticated:
                return qs.filter(owner=self.request.user)
            return qs.none()
        return qs

    def get_permissions(self):
        if self.action == "list":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user if self.request.user.is_authenticated else None)

    @action(detail=True, methods=["put"])
    def inventory(self, request, pk=None):
        bank = self.get_object()
        if bank.owner_id != request.user.id:
            return Response({"detail": "Only the user that registered this blood bank can update its inventory."},
                            status=status.HTTP_403_FORBIDDEN)
        ser = StockSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        with transaction.atomic():
            for group, units in ser.validated_data["stock"].items():
                Inventory.objects.update_or_create(bank=bank, blood_group=group, defaults={"units": units})
        bank = self.get_queryset().get(pk=bank.pk)
        return Response(self.get_serializer(bank).data)


class EmergencyRequestViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = EmergencyRequestSerializer
    queryset = EmergencyRequest.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(raised_by=self.request.user if self.request.user.is_authenticated else None)

    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        self.get_object()  # hook point: notify matching donors and nearby banks here
        return Response({"detail": "Notified matching donors and blood banks nearby."})


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def stats(request):
    return Response({"donors": Donor.objects.count(), "banks": BloodBank.objects.filter(verified=True).count()})

