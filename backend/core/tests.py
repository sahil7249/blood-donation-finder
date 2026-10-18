from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token

User = get_user_model()


class ApiTests(TestCase):
    def setUp(self):
        call_command("seed_data", verbosity=0)
        self.user = User.objects.create_user(username="testuser@example.com", email="testuser@example.com", password="password123", first_name="Test")
        self.token, _ = Token.objects.get_or_create(user=self.user)
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_unauthenticated_access_allowed(self):
        # Unauthenticated users can find donors
        r = self.client.get("/api/donors/", {"blood_group": "O+", "city": "Pune", "status": "available"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual({d["name"] for d in r.json()}, {"Rohan Deshmukh", "Neha Joshi"})
        self.assertNotIn("phone", r.json()[0])

        # Unauthenticated users can list cities
        r_cities = self.client.get("/api/donors/cities/")
        self.assertEqual(r_cities.status_code, 200)
        self.assertIn("Pune", r_cities.json())

        # Unauthenticated users can view connected blood banks
        r_banks = self.client.get("/api/banks/")
        self.assertEqual(r_banks.status_code, 200)
        self.assertGreaterEqual(len(r_banks.json()), 1)

        # Unauthenticated users can view stats
        r_stats = self.client.get("/api/stats/")
        self.assertEqual(r_stats.status_code, 200)

    def test_unauthenticated_access_denied(self):
        # Unauthenticated user cannot register as a donor
        r_donor = self.client.post("/api/donors/", {"name": "Anon", "age": 25, "blood_group": "A+", "city": "Pune", "phone": "9876543210"})
        self.assertEqual(r_donor.status_code, 401)

        # Unauthenticated user cannot contact a donor
        d = self.client.get("/api/donors/", {"status": "available"}).json()[0]
        r_contact = self.client.post(f"/api/donors/{d['id']}/contact/")
        self.assertEqual(r_contact.status_code, 401)

        # Unauthenticated user cannot register a blood bank
        r_bank = self.client.post("/api/banks/", {"name": "Anon BB", "city": "Pune", "license_id": "L-ANON", "address": "x", "phone": "1"})
        self.assertEqual(r_bank.status_code, 401)

        # Unauthenticated user cannot view emergency requests
        r_reqs = self.client.get("/api/requests/")
        self.assertEqual(r_reqs.status_code, 401)

        # Unauthenticated user cannot raise emergency requests
        r_raise = self.client.post("/api/requests/", {"blood_group": "O-", "units": 2, "hospital": "H", "urgency": "critical"})
        self.assertEqual(r_raise.status_code, 401)

    def test_authenticated_features(self):
        # Authenticated user registers as donor with validation
        bad = self.client.post("/api/donors/", {"name": "X", "age": 17, "blood_group": "O+", "city": "Pune", "phone": "123"}, **self.auth_headers)
        self.assertEqual(bad.status_code, 400)

        ok = self.client.post("/api/donors/", {"name": "Aditi", "age": 30, "blood_group": "A+", "city": "Pune",
                                               "phone": "9876543210", "last_donation": str(timezone.localdate() - timedelta(days=10))}, **self.auth_headers)
        self.assertEqual(ok.status_code, 201)
        self.assertEqual(ok.json()["status"], "cooldown")

        # Contacting cooldown donor returns 400
        self.assertEqual(self.client.post(f"/api/donors/{ok.json()['id']}/contact/", **self.auth_headers).status_code, 400)

        # Authenticated user can contact available donor
        d = self.client.get("/api/donors/", {"status": "available"}).json()[0]
        self.assertEqual(self.client.post(f"/api/donors/{d['id']}/contact/", **self.auth_headers).status_code, 201)

        # Authenticated user can register a bank and update its inventory
        r = self.client.post("/api/banks/", {"name": "New BB", "city": "Pune", "license_id": "L-1", "address": "x", "phone": "1"}, **self.auth_headers)
        self.assertEqual(r.status_code, 201)
        bank_id = r.json()["id"]
        self.assertFalse(r.json()["verified"])
        self.assertEqual(r.json()["owner"], self.user.id)
        self.assertTrue(r.json()["is_owner"])

        # The registrant can update the inventory
        up = self.client.put(f"/api/banks/{bank_id}/inventory/", {"stock": {"O+": 12}}, content_type="application/json", **self.auth_headers)
        self.assertEqual(up.status_code, 200)
        self.assertEqual(up.json()["stock"]["O+"], 12)

        # Another user CANNOT update this bank's inventory (must return 403)
        other_user = User.objects.create_user(username="other@example.com", email="other@example.com", password="password123")
        other_token, _ = Token.objects.get_or_create(user=other_user)
        other_headers = {"HTTP_AUTHORIZATION": f"Token {other_token.key}"}
        forbidden_up = self.client.put(f"/api/banks/{bank_id}/inventory/", {"stock": {"O+": 99}}, content_type="application/json", **other_headers)
        self.assertEqual(forbidden_up.status_code, 403)

        # Mine filter returns only the user's banks
        my_banks = self.client.get("/api/banks/?mine=true", **self.auth_headers).json()
        self.assertEqual(len(my_banks), 1)
        self.assertEqual(my_banks[0]["id"], bank_id)

        other_banks = self.client.get("/api/banks/?mine=true", **other_headers).json()
        self.assertEqual(len(other_banks), 0)

        # Authenticated user can create and view emergency requests
        r_req = self.client.post("/api/requests/", {"blood_group": "O-", "units": 2, "hospital": "H", "urgency": "critical"}, **self.auth_headers)
        self.assertEqual(r_req.status_code, 201)
        r_list = self.client.get("/api/requests/", **self.auth_headers)
        self.assertEqual(r_list.status_code, 200)
        self.assertEqual(r_list.json()[0]["hospital"], "H")


