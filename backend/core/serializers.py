from django.utils import timezone
from rest_framework import serializers

from .models import GROUPS, BloodBank, Donor, EmergencyRequest, Inventory


class DonorSerializer(serializers.ModelSerializer):
    status = serializers.ReadOnlyField()
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Donor
        fields = ["id", "name", "age", "blood_group", "city", "phone", "last_donation", "status", "user"]
        read_only_fields = ["user"]
        # The phone number and age are accepted on sign-up but never returned: donors stay private.
        extra_kwargs = {
            "phone": {"write_only": True},
            "age": {"write_only": True},
            "last_donation": {"write_only": True},
        }

    def validate_last_donation(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError("Last donation date can't be in the future.")
        return value


class BloodBankSerializer(serializers.ModelSerializer):
    stock = serializers.SerializerMethodField()
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = BloodBank
        fields = ["id", "name", "city", "license_id", "address", "phone", "email", "verified", "stock", "owner", "is_owner"]
        read_only_fields = ["verified", "owner", "is_owner"]
        extra_kwargs = {"license_id": {"write_only": True}}

    def get_stock(self, bank):
        return {i.blood_group: i.units for i in bank.inventory.all()}

    def get_is_owner(self, bank):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            return bank.owner_id == request.user.id
        return False

    def create(self, validated_data):
        bank = super().create(validated_data)
        Inventory.objects.bulk_create([Inventory(bank=bank, blood_group=g) for g in GROUPS])
        return bank


class StockSerializer(serializers.Serializer):
    stock = serializers.DictField(child=serializers.IntegerField(min_value=0))

    def validate_stock(self, value):
        bad = set(value) - set(GROUPS)
        if bad:
            raise serializers.ValidationError(f"Unknown blood group(s): {', '.join(sorted(bad))}")
        return value


class EmergencyRequestSerializer(serializers.ModelSerializer):
    raised_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = EmergencyRequest
        fields = ["id", "blood_group", "units", "hospital", "urgency", "created_at", "raised_by"]
        read_only_fields = ["created_at", "raised_by"]

