from django.contrib import admin

from .models import BloodBank, ContactRequest, Donor, EmergencyRequest, Inventory


class InventoryInline(admin.TabularInline):
    model = Inventory
    extra = 0


@admin.register(BloodBank)
class BloodBankAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "license_id", "verified")
    list_editable = ("verified",)  # tick this after checking the license
    list_filter = ("verified", "city")
    inlines = [InventoryInline]


@admin.register(Donor)
class DonorAdmin(admin.ModelAdmin):
    list_display = ("name", "blood_group", "city", "last_donation")
    list_filter = ("blood_group", "city")


admin.site.register(EmergencyRequest)
admin.site.register(ContactRequest)
