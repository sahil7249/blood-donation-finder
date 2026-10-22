"""
Gemini tool-callable functions that query the LifeLink database.
Each function returns a plain Python dict/list that Gemini will use to compose a reply.
Phone numbers are only included when `authenticated=True`.
"""

from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from .models import COOLDOWN_DAYS, BloodBank, Donor, EmergencyRequest


def _donor_to_dict(donor: Donor, authenticated: bool) -> dict:
    data = {
        "name": donor.name,
        "blood_group": donor.blood_group,
        "city": donor.city,
        "status": donor.status,
    }
    if authenticated:
        data["phone"] = donor.phone
    return data


def get_donors(city: str = "", blood_group: str = "", status: str = "", authenticated: bool = False) -> dict:
    """Return donors filtered by optional city, blood_group and status ('available'|'cooldown')."""
    qs = Donor.objects.all()
    if city:
        qs = qs.filter(city__icontains=city)
    if blood_group:
        qs = qs.filter(blood_group__iexact=blood_group)
    if status == "available":
        cutoff = timezone.localdate() - timedelta(days=COOLDOWN_DAYS)
        qs = qs.filter(Q(last_donation__isnull=True) | Q(last_donation__lte=cutoff))
    elif status == "cooldown":
        cutoff = timezone.localdate() - timedelta(days=COOLDOWN_DAYS)
        qs = qs.filter(last_donation__gt=cutoff)

    donors = [_donor_to_dict(d, authenticated) for d in qs[:50]]
    return {
        "count": len(donors),
        "authenticated": authenticated,
        "donors": donors,
    }


def get_blood_banks(city: str = "") -> dict:
    """Return blood banks filtered by optional city, including their blood inventory."""
    qs = BloodBank.objects.prefetch_related("inventory")
    if city:
        qs = qs.filter(city__icontains=city)

    banks = []
    for bank in qs[:30]:
        stock = {i.blood_group: i.units for i in bank.inventory.all()}
        banks.append({
            "name": bank.name,
            "city": bank.city,
            "address": bank.address,
            "phone": bank.phone,
            "email": bank.email or "N/A",
            "verified": bank.verified,
            "stock": stock,
        })

    return {"count": len(banks), "banks": banks}


def get_inventory(blood_group: str = "", city: str = "") -> dict:
    """Return blood banks that have stock for a given blood_group, optionally filtered by city."""
    qs = BloodBank.objects.prefetch_related("inventory")
    if city:
        qs = qs.filter(city__icontains=city)

    results = []
    for bank in qs:
        stock = {i.blood_group: i.units for i in bank.inventory.all()}
        if blood_group:
            units = stock.get(blood_group.upper(), 0)
            if units == 0:
                continue
            results.append({
                "name": bank.name,
                "city": bank.city,
                "phone": bank.phone,
                "verified": bank.verified,
                "units_available": units,
                "blood_group": blood_group.upper(),
            })
        else:
            results.append({
                "name": bank.name,
                "city": bank.city,
                "phone": bank.phone,
                "verified": bank.verified,
                "stock": stock,
            })

    return {"count": len(results), "results": results}


def get_emergency_requests() -> dict:
    """Return all active emergency blood requests."""
    reqs = EmergencyRequest.objects.order_by("-created_at")[:20]
    data = [
        {
            "blood_group": r.blood_group,
            "units": r.units,
            "hospital": r.hospital,
            "urgency": r.urgency,
            "created_at": r.created_at.strftime("%d %b %Y, %I:%M %p"),
        }
        for r in reqs
    ]
    return {"count": len(data), "requests": data}


def get_stats() -> dict:
    """Return overall LifeLink platform statistics."""
    total_donors = Donor.objects.count()
    cutoff = timezone.localdate() - timedelta(days=COOLDOWN_DAYS)
    available_donors = Donor.objects.filter(
        Q(last_donation__isnull=True) | Q(last_donation__lte=cutoff)
    ).count()
    total_banks = BloodBank.objects.count()
    verified_banks = BloodBank.objects.filter(verified=True).count()
    active_emergencies = EmergencyRequest.objects.count()

    return {
        "total_donors": total_donors,
        "available_donors": available_donors,
        "total_blood_banks": total_banks,
        "verified_blood_banks": verified_banks,
        "active_emergency_requests": active_emergencies,
    }


# Blood compatibility matrix
COMPATIBILITY = {
    "O-": {
        "can_donate_to": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
        "can_receive_from": ["O-"],
        "type_info": "Universal red blood cell donor. Can donate red cells to all types.",
    },
    "O+": {
        "can_donate_to": ["O+", "A+", "B+", "AB+"],
        "can_receive_from": ["O+", "O-"],
        "type_info": "Can donate to all Rh-positive blood groups. Highly needed.",
    },
    "A-": {
        "can_donate_to": ["A-", "A+", "AB-", "AB+"],
        "can_receive_from": ["A-", "O-"],
        "type_info": "Can donate to A and AB blood types.",
    },
    "A+": {
        "can_donate_to": ["A+", "AB+"],
        "can_receive_from": ["A+", "A-", "O+", "O-"],
        "type_info": "Can donate to A+ and AB+. Can receive from A and O groups.",
    },
    "B-": {
        "can_donate_to": ["B-", "B+", "AB-", "AB+"],
        "can_receive_from": ["B-", "O-"],
        "type_info": "Can donate to B and AB blood types.",
    },
    "B+": {
        "can_donate_to": ["B+", "AB+"],
        "can_receive_from": ["B+", "B-", "O+", "O-"],
        "type_info": "Can donate to B+ and AB+. Can receive from B and O groups.",
    },
    "AB-": {
        "can_donate_to": ["AB-", "AB+"],
        "can_receive_from": ["AB-", "A-", "B-", "O-"],
        "type_info": "Universal plasma donor. Rare red cell type.",
    },
    "AB+": {
        "can_donate_to": ["AB+"],
        "can_receive_from": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
        "type_info": "Universal red blood cell recipient. Can receive from all blood groups.",
    },
}


def get_blood_compatibility(blood_group: str) -> dict:
    """Return compatibility rules (who can donate to whom and who can receive from whom) for a given blood group."""
    bg = blood_group.strip().upper()
    if bg in COMPATIBILITY:
        return {"blood_group": bg, **COMPATIBILITY[bg]}
    return {
        "error": f"Unknown blood group '{blood_group}'. Valid groups are: {', '.join(COMPATIBILITY.keys())}",
        "all_groups": list(COMPATIBILITY.keys()),
    }


def check_eligibility(age: int = 25, weight_kg: float = 55.0, days_since_last_donation: int = 100) -> dict:
    """Check whether a person meets the standard medical criteria to donate blood."""
    reasons = []
    eligible = True

    if age < 18:
        eligible = False
        reasons.append("Must be at least 18 years old.")
    elif age > 65:
        eligible = False
        reasons.append("Maximum age limit for regular donation is 65 years.")

    if weight_kg < 45.0:
        eligible = False
        reasons.append("Minimum body weight required is 45 kg (some centers require 50 kg).")

    if days_since_last_donation < COOLDOWN_DAYS:
        eligible = False
        remaining = COOLDOWN_DAYS - days_since_last_donation
        reasons.append(f"Cooldown period is {COOLDOWN_DAYS} days. Please wait {remaining} more day(s) before donating again.")

    return {
        "eligible": eligible,
        "cooldown_days_required": COOLDOWN_DAYS,
        "reasons": reasons if not eligible else ["You meet the primary criteria (age, weight, and cooldown) for blood donation."],
        "additional_guidelines": [
            "Hemoglobin level must be at least 12.5 g/dL.",
            "Avoid alcohol consumption for 24 hours prior to donation.",
            "Must be well-rested and have had a light meal before donation.",
            "Wait 6-12 months after major surgery, tattoo, or piercing.",
            "Not eligible if pregnant, breastfeeding, or currently taking certain antibiotics."
        ]
    }


# -----------------------------------------------------------------------
# Registry used by chat_view to dispatch Gemini tool calls
# -----------------------------------------------------------------------
TOOL_REGISTRY = {
    "get_donors": get_donors,
    "get_blood_banks": get_blood_banks,
    "get_inventory": get_inventory,
    "get_emergency_requests": get_emergency_requests,
    "get_stats": get_stats,
    "get_blood_compatibility": get_blood_compatibility,
    "check_eligibility": check_eligibility,
}
