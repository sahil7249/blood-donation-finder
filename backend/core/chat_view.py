"""
POST /api/chat/
Body: { "message": "...", "history": [{"role": "user"|"model", "text": "..."}] }
Response: { "reply": "..." }

All google.generativeai imports are intentionally deferred (inside the view function)
so that gRPC background threads don't start at Django import-time, which would crash
Python 3.15's threading during startup.
"""

import os

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status as drf_status

from .chat_tools import TOOL_REGISTRY

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are LifeLink Assistant 🩸, an expert and empathetic AI assistant for the LifeLink Blood Donation platform.

Your capabilities:
- Find blood donors by city, blood group, or availability status.
- List blood banks, their contact details, verification status, and real-time blood inventory.
- Show which blood banks have specific blood groups in stock.
- Show active emergency blood requests.
- Check blood type compatibility (who can donate to whom and who can receive from whom).
- Check donor medical eligibility (age, weight, cooldown periods, general health).
- Provide platform statistics.

STRICT RULES:
1. ONLY answer questions related to blood donation, donors, blood banks, emergency blood requests, eligibility, compatibility, or how to use LifeLink.
2. If a user asks something unrelated (e.g. cricket, weather, general trivia, coding), politely decline and redirect them to blood donation topics.
3. Always use the provided tools to query real data — never fabricate donor names, phone numbers, units, or addresses.
4. When phone numbers are shown, remind users that this information is sensitive and should be used strictly for blood donation coordination.
5. In urgent life-or-death situations, remind the user to also contact national emergency helplines (India: 104 for Blood Helpline, 112 for Emergency, 1910 for Blood Bank information).
6. When recommending platform actions, always use markdown links so users can click them directly:
   - [Find Donors](/find-donors)
   - [Become a Donor](/become-donor)
   - [Blood Bank Portal](/blood-banks)
   - [Emergency Requests](/emergency)
   - [Sign In / Sign Up](/auth)
7. Format responses clearly using markdown: bold highlights, bullet points, and concise sections.
8. Be warm, concise, reassuring, and helpful.
"""

# ---------------------------------------------------------------------------
# Tool definitions for Gemini (passed as Python callables)
# ---------------------------------------------------------------------------
def _make_tools(is_authenticated: bool):
    """
    Build the list of tool functions that Gemini will see.
    `is_authenticated` is baked in via closures so Gemini never needs to pass it.
    """

    def get_donors(city: str = "", blood_group: str = "", availability: str = "") -> dict:
        """
        Fetch blood donors from the database.
        Args:
            city: City name to filter by (e.g. 'Pune', 'Mumbai'). Leave empty for all cities.
            blood_group: Blood group to filter by (e.g. 'O+', 'A-', 'AB+'). Leave empty for all groups.
            availability: Filter by donor status. Use 'available' or 'cooldown'. Leave empty for all.
        Returns:
            A dict with 'count' and 'donors' list.
        """
        return TOOL_REGISTRY["get_donors"](
            city=city,
            blood_group=blood_group,
            status=availability,
            authenticated=is_authenticated,
        )

    def get_blood_banks(city: str = "") -> dict:
        """
        Fetch registered blood banks, optionally filtered by city.
        Returns name, address, phone, email, verification status, and blood inventory.
        Args:
            city: City name to filter by. Leave empty for all cities.
        Returns:
            A dict with 'count' and 'banks' list.
        """
        return TOOL_REGISTRY["get_blood_banks"](city=city)

    def get_inventory(blood_group: str = "", city: str = "") -> dict:
        """
        Find blood banks that have a specific blood group in stock.
        Args:
            blood_group: Blood group to search for (e.g. 'O+', 'AB-'). Leave empty for all groups.
            city: City name to filter by. Leave empty for all cities.
        Returns:
            A dict with 'count' and 'results' list.
        """
        return TOOL_REGISTRY["get_inventory"](blood_group=blood_group, city=city)

    def get_emergency_requests() -> dict:
        """
        Fetch all active emergency blood requests posted on the platform.
        Returns:
            A dict with 'count' and 'requests' list.
        """
        return TOOL_REGISTRY["get_emergency_requests"]()

    def get_stats() -> dict:
        """
        Get overall LifeLink platform statistics.
        Returns:
            A dict with total donors, available donors, blood banks, and active emergencies.
        """
        return TOOL_REGISTRY["get_stats"]()

    def get_blood_compatibility(blood_group: str) -> dict:
        """
        Get blood compatibility details: who can donate to this blood group and who can receive from it.
        Args:
            blood_group: The blood group to query (e.g. 'O+', 'AB-', 'A+').
        Returns:
            A dict with can_donate_to, can_receive_from, and clinical notes.
        """
        return TOOL_REGISTRY["get_blood_compatibility"](blood_group=blood_group)

    def check_eligibility(age: int = 25, weight_kg: float = 55.0, days_since_last_donation: int = 100) -> dict:
        """
        Check if a person is medically eligible to donate blood based on age, weight, and cooldown.
        Args:
            age: Donor's age in years (must be between 18 and 65).
            weight_kg: Donor's weight in kilograms (minimum 45 kg).
            days_since_last_donation: Days since their last donation (standard cooldown is 90 days).
        Returns:
            A dict with eligibility status, reasons, and donation guidelines.
        """
        return TOOL_REGISTRY["check_eligibility"](
            age=age,
            weight_kg=weight_kg,
            days_since_last_donation=days_since_last_donation,
        )

    return [
        get_donors,
        get_blood_banks,
        get_inventory,
        get_emergency_requests,
        get_stats,
        get_blood_compatibility,
        check_eligibility,
    ]


# ---------------------------------------------------------------------------
# View — genai is imported here (lazily) to avoid startup thread crashes
# ---------------------------------------------------------------------------
@api_view(["POST"])
@permission_classes([AllowAny])
def chat(request):
    # ── lazy import: new SDK, no gRPC ──────────
    from google import genai
    from google.genai import types

    message = str(request.data.get("message", "")).strip()
    history = request.data.get("history", [])

    if not message:
        return Response({"detail": "message is required."}, status=drf_status.HTTP_400_BAD_REQUEST)

    is_authenticated = bool(request.user and request.user.is_authenticated)
    api_key = os.environ.get("GEMINI_API_KEY", "")

    if not api_key:
        return Response(
            {"reply": "⚠ GEMINI_API_KEY is not configured on the server. Please check environment variables."},
            status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    client = genai.Client(api_key=api_key)
    tools = _make_tools(is_authenticated)

    # Build prior history for Gemini
    gemini_history = []
    for turn in history[-10:]:
        role = turn.get("role", "user")
        text = turn.get("text", "")
        if role in ("user", "model") and text:
            gemini_history.append(
                types.Content(role=role, parts=[types.Part.from_text(text=text)])
            )

    # Try models in priority order for resilience
    candidate_models = ["gemini-2.5-flash", "gemini-3.8-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
    last_error = None

    for model_name in candidate_models:
        try:
            chat_session = client.chats.create(
                model=model_name,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    tools=tools,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(
                        disable=False
                    ),
                ),
                history=gemini_history,
            )

            response = chat_session.send_message(message)
            reply_text = response.text or ""

            if not reply_text:
                reply_text = "I'm here to help with LifeLink! Please let me know what blood donor, bank, or emergency information you need."

            return Response({"reply": reply_text})

        except Exception as e:
            last_error = e
            err_str = str(e).lower()
            # If model is not found, continue to next candidate model
            if "not found" in err_str or "not_found" in err_str or "404" in err_str:
                continue
            # For other errors, log and try fallback
            print(f"Gemini model {model_name} error: {e}")

    # If all models failed
    print(f"All Gemini models failed. Last error: {last_error}")
    return Response(
        {
            "reply": f"⚠ LifeLink Assistant is currently experiencing a connection issue ({str(last_error)}). Please try again in a moment."
        },
        status=drf_status.HTTP_200_OK,
    )