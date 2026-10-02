import os
import sqlite3
import json
import urllib.request
import urllib.parse
import urllib.error

DB_FILE = "database.db"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY", "")

if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
    raise SystemExit("Set SUPABASE_URL and SUPABASE_SECRET_KEY first.")


def request(method, table, payload=None, query=None):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if query:
        url += "?" + urllib.parse.urlencode(query, doseq=True)
    headers = {
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": f"Bearer {SUPABASE_SECRET_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    body = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode()
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as e:
        raise RuntimeError(e.read().decode(errors="replace"))


con = sqlite3.connect(DB_FILE)
con.row_factory = sqlite3.Row

products = [dict(r) for r in con.execute("select * from products order by created_at").fetchall()]
orders = [dict(r) for r in con.execute("select * from orders order by created_at").fetchall()]
items = [dict(r) for r in con.execute("select * from order_items").fetchall()]

print(f"Found {len(products)} products, {len(orders)} orders and {len(items)} order items.")

# Map old SQLite product IDs (p1, p2, ...) to new Supabase bigint IDs.
product_map = {}
for p in products:
    existing = request("GET", "products", query={"name": f"eq.{p['name']}", "select": "id", "limit": "1"})
    if existing:
        product_map[p["id"]] = existing[0]["id"]
        continue

    created = request("POST", "products", {
        "name": p["name"],
        "description": p["description"],
        "price": p["price"],
        "cost_price": p.get("cost_price") or 0,
        "image": p["image"],
        "category": p["category"],
        "available": bool(p["available"]),
        "stock_quantity": p["stock_quantity"],
    })
    product_map[p["id"]] = created[0]["id"]

# Old order IDs are strings. Supabase orders use bigint IDs, so keep a local
# mapping only for importing order_items.
order_map = {}
for o in orders:
    created = request("POST", "orders", {
        "customer_name": o["customer_name"],
        "room_number": o["room_number"],
        "phone": o["phone"],
        "total_amount": o["total_amount"],
        "total_profit": o.get("total_profit") or 0,
        "status": o["status"],
        "rejection_reason": o.get("rejection_reason"),
        "created_at": o["created_at"],
    })
    order_map[o["id"]] = created[0]["id"]

for item in items:
    request("POST", "order_items", {
        "order_id": order_map[item["order_id"]],
        "product_id": product_map[item["product_id"]],
        "quantity": item["quantity"],
        "price": item["price"],
    })

print("Migration complete.")
