from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models
from django.utils import timezone

GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
BLOOD_GROUPS = [(g, g) for g in GROUPS]
COOLDOWN_DAYS = 90


class Donor(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="donors")
    name = models.CharField(max_length=120)
    age = models.PositiveSmallIntegerField(validators=[MinValueValidator(18), MaxValueValidator(65)])
    blood_group = models.CharField(max_length=3, choices=BLOOD_GROUPS)
    city = models.CharField(max_length=80)
    phone = models.CharField(max_length=10, validators=[RegexValidator(r"^\d{10}$", "Enter a 10-digit mobile number.")])
    last_donation = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def status(self):
        """'cooldown' for 90 days after the last donation, otherwise 'available'."""
        if self.last_donation and (timezone.localdate() - self.last_donation).days < COOLDOWN_DAYS:
            return "cooldown"
        return "available"

    def __str__(self):
        return f"{self.name} ({self.blood_group}, {self.city})"


class ContactRequest(models.Model):
    donor = models.ForeignKey(Donor, on_delete=models.CASCADE, related_name="contact_requests")
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="contact_requests_made")
    created_at = models.DateTimeField(auto_now_add=True)


class BloodBank(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="blood_banks")
    name = models.CharField(max_length=160)
    city = models.CharField(max_length=80)
    license_id = models.CharField(max_length=60, unique=True)
    address = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    email = models.EmailField(max_length=120, blank=True, default="")
    verified = models.BooleanField(default=False)  # set to True from the admin after checking the license
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-verified", "name"]

    def __str__(self):
        return self.name


class Inventory(models.Model):
    bank = models.ForeignKey(BloodBank, on_delete=models.CASCADE, related_name="inventory")
    blood_group = models.CharField(max_length=3, choices=BLOOD_GROUPS)
    units = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("bank", "blood_group")


class EmergencyRequest(models.Model):
    URGENCY = [("critical", "Critical"), ("high", "High")]
    raised_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="emergency_requests")
    blood_group = models.CharField(max_length=3, choices=BLOOD_GROUPS)
    units = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    hospital = models.CharField(max_length=200)
    urgency = models.CharField(max_length=10, choices=URGENCY)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
