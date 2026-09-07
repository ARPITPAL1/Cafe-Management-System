import urllib.request
import json

BASE = "http://127.0.0.1:8000/api"

def make_req(path, data=None, method="GET"):
    url = f"{BASE}{path}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"error": raw}


print("=== 1. TESTING CALL WAITER FLOW ===")
# Get a table
s, tables = make_req("/tables/")
table = tables[0]
token = table["public_token"]
table_id = table["id"]
print(f"Table #{table['number']} (Token: {token})")

# Call waiter
s, res = make_req(f"/tables/by-token/{token}/call-waiter/", {"customer_name": "Arpit Sharma"}, "POST")
print("Call Waiter status:", s, res["message"])
assert s == 200 and res["table"]["waiter_called"] == True

# Dismiss waiter
s, res = make_req(f"/tables/{table_id}/dismiss-waiter/", {"staff_name": "Rahul (Manager)"}, "POST")
print("Dismiss Waiter status:", s, res["message"])
assert s == 200 and res["table"]["waiter_called"] == False
print(">>> Call Waiter Test PASSED! [OK]\n")

print("=== 2. TESTING SPLIT PAYMENT & OVERPAYMENT CAPPING ===")
# Fetch menu item
s, menu = make_req("/menu/")
item = menu["categories"][0]["items"][0]
print("Using menu item:", item["id"], item["name"], "Price:", item["price"])

# Create an order and bill to test split payment
order_payload = {
    "table_id": table_id,
    "customer_name": "Test Split Customer",
    "customer_phone": "+91 99999 88888",
    "order_type": "DINE_IN",
    "items": [
        {"menu_item_id": item["id"], "quantity": 2, "special_instructions": "Extra hot"}
    ]
}
s, order = make_req("/orders/", order_payload, "POST")
if s not in [200, 201]:
    print("Failed to create order:", s, order)
    exit(1)
print("Order created:", s, order["order_number"], "Subtotal:", order["subtotal"])



# Get active session
session_id = order.get("session") or table.get("active_session", {}).get("id")
if not session_id:
    s, tbl_detail = make_req(f"/tables/{table_id}/")
    session_id = tbl_detail["active_session"]["id"]
print("Active Session ID:", session_id)

# Generate Bill
s, bill = make_req(f"/billing/session/{session_id}/generate/", {}, "POST")
print("Bill generated:", s, bill["bill_number"], "Grand Total:", bill["grand_total"], "Remaining:", bill["amount_remaining"])
grand_total = float(bill["grand_total"])



# Test 1: Try to overpay (pay grand_total + 50)
overpay_amount = grand_total + 50.0
s, res = make_req(f"/billing/{bill['id']}/payment/", {"method": "UPI", "amount": overpay_amount}, "POST")
err_text = str(res.get("error", "")).replace("\u20b9", "Rs.")
print("Overpayment rejected status (Expected 400):", s, err_text)
assert s == 400 and "exceeds" in err_text
print(">>> Overpayment prevention PASSED! [OK]")

# Test 2: Split Payment - Pay 50% in UPI
half_amount = round(grand_total / 2.0, 2)
s, res = make_req(f"/billing/{bill['id']}/payment/", {"method": "UPI", "amount": half_amount, "transaction_ref": "UPI-TXN-12345"}, "POST")
print("Split 1 (UPI) status:", s, "Paid:", res["bill"]["total_paid"], "Remaining:", res["bill"]["amount_remaining"], "Status:", res["bill"]["status"])
assert s == 200 and res["bill"]["status"] == "PARTIALLY_PAID"

# Test 3: Settle Remaining in Cash
remaining = float(res["bill"]["amount_remaining"])
s, res = make_req(f"/billing/{bill['id']}/payment/", {"method": "CASH", "amount": remaining}, "POST")
print("Split 2 (Cash) status:", s, "Paid:", res["bill"]["total_paid"], "Remaining:", res["bill"]["amount_remaining"], "Status:", res["bill"]["status"])
assert s == 200 and res["bill"]["status"] == "PAID"
print(">>> Split Payment Test PASSED! [OK]\n")

print("=== 3. TESTING DEVELOPER ONBOARDING / PROVISIONING PORTAL ===")
dev_payload = {
    "cafe_name": "The Velvet Bean & Bistro",
    "tagline": "Specialty Coffee & Gourmet Cuisine",
    "logo_url": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=120&h=120&fit=crop",
    "owner_name": "Arpit Sharma",
    "owner_email": "owner@velvetbean.cafe",
    "owner_password": "secureOwnerPass123",
    "manager_password": "managerSecurePass456",
    "cashier_password": "cashierSecurePass789",
    "kitchen_password": "chefSecurePass321",
    "address": "900 Bistro Walk, Bandra, Mumbai",
    "phone": "+91 98765 43210",
    "email": "contact@velvetbean.cafe",
    "gstin": "27AABCU9603R1ZN",
    "cgst": 2.5,
    "sgst": 2.5,
    "service_charge": 0.0
}
s, res = make_req("/core/provision/", dev_payload, "POST")
msg = str(res.get("message", "")).replace("\U0001F389", "[Party]")
print("Developer Provisioning status:", s, msg)
assert s == 200 and res["cafe"]["name"] == "The Velvet Bean & Bistro"

# Test Owner login with new credentials
s, login_res = make_req("/core/login/", {"email": "owner@velvetbean.cafe", "password": "secureOwnerPass123", "role": "OWNER"}, "POST")
print("Owner Login status with newly provisioned password:", s, login_res["user"]["name"], "Role:", login_res["user"]["role"])
assert s == 200 and login_res["user"]["role"] == "OWNER"

print(">>> Developer Provisioning & Role Auth PASSED! [OK]\n")
print("ALL TESTS COMPLETED SUCCESSFULLY! [PASSED]")


