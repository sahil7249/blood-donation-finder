from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import GROUPS, BloodBank, Donor, EmergencyRequest, Inventory


class Command(BaseCommand):
    help = "Load the sample donors, blood banks and requests from the original prototype."

    def handle(self, *args, **opts):
        recent = timezone.localdate() - timedelta(days=30)  # inside the 90-day cooldown
        donors = [
            ("Rohan Deshmukh", "O+", "Pune", None), ("Sneha Kulkarni", "A-", "Pimpri-Chinchwad", None),
            ("Imran Shaikh", "B+", "Mumbai", recent), ("Priya Nair", "AB+", "Pune", None),
            ("Karan Mehta", "O-", "Nagpur", None), ("Ayesha Khan", "A+", "Pimpri-Chinchwad", recent),
            ("Vikram Patil", "B-", "Nashik", None), ("Neha Joshi", "O+", "Pune", None),
            ("Arjun Rao", "AB-", "Mumbai", None),
        ]
        for i, (name, group, city, last) in enumerate(donors):
            Donor.objects.get_or_create(name=name, defaults=dict(
                age=25 + i, blood_group=group, city=city, phone=f"98000000{i:02d}", last_donation=last))

        banks = [
            ("Sanjeevani Blood Bank", "Pune", {"O+": 42, "A+": 18, "B+": 9, "AB+": 5}),
            ("Red Cross Blood Centre", "Pimpri-Chinchwad", {"O+": 11, "A-": 4, "B+": 22, "O-": 3}),
            ("Lifeline Municipal Blood Bank", "Mumbai", {"A+": 30, "O+": 8, "AB-": 2, "B-": 6}),
            ("Nagpur Central Blood Bank", "Nagpur", {"O-": 7, "A+": 14, "B+": 19, "AB+": 3}),
        ]
        for i, (name, city, stock) in enumerate(banks):
            bank, created = BloodBank.objects.get_or_create(name=name, defaults=dict(
                city=city, license_id=f"MH-BB-{2290 + i}", address=f"{name}, {city}", phone="0200000000", verified=True))
            if created:
                Inventory.objects.bulk_create([Inventory(bank=bank, blood_group=g, units=stock.get(g, 0)) for g in GROUPS])

        if not EmergencyRequest.objects.exists():
            for g, u, h, urg in [("B+", 3, "YCM Hospital, Pimpri-Chinchwad", "critical"),
                                 ("AB+", 1, "KEM Hospital, Mumbai", "high"),
                                 ("O-", 2, "Sassoon General Hospital, Pune", "critical")]:
                EmergencyRequest.objects.create(blood_group=g, units=u, hospital=h, urgency=urg)
        self.stdout.write(self.style.SUCCESS("Sample data loaded."))
