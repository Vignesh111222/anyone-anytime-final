import http.server
import socketserver
import json
import os
import urllib.request
import urllib.parse
import urllib.error

PORT = int(os.environ.get("PORT", "8000"))
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY", "")
SELLER_PASSWORD = os.environ.get("SELLER_PASSWORD", "admin123")


def require_supabase():
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        raise RuntimeError(
            "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY."
        )


def supabase_request(method, path, payload=None, query=None):
    require_supabase()
    url = path if path.startswith("http") else f"{SUPABASE_URL}/rest/v1/{path}"
    if query:
        url += "?" + urllib.parse.urlencode(query, doseq=True)

    headers = {
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": f"Bearer {SUPABASE_SECRET_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if method in ("POST", "PATCH", "DELETE"):
        headers["Prefer"] = "return=representation"

    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase HTTP {exc.code}: {detail}")
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Supabase connection error: {exc.reason}")


def rpc(function_name, payload):
    return supabase_request("POST", f"rpc/{function_name}", payload)


def first(rows):
    return rows[0] if rows else None


def send_json(handler, data, status=200):
    body = json.dumps(data, default=str).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class APIHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8"))

    def do_GET(self):
        try:
            path = urllib.parse.urlparse(self.path).path.rstrip("/")

            if path == "/api/products":
                rows = supabase_request(
                    "GET", "products",
                    query={"select": "*", "order": "created_at.asc"}
                )
                send_json(self, rows)
                return

            if path == "/api/orders":
                orders = supabase_request(
                    "GET", "orders",
                    query={"select": "*", "order": "created_at.desc"}
                )
                for order in orders:
                    order["items"] = supabase_request(
                        "GET", "order_items",
                        query={"order_id": f"eq.{order['id']}", "select": "*"}
                    )
                send_json(self, orders)
                return

            if path.startswith("/api/orders/"):
                order_id = path.split("/")[-1]
                order = first(supabase_request(
                    "GET", "orders",
                    query={"id": f"eq.{order_id}", "select": "*", "limit": "1"}
                ))
                if not order:
                    send_json(self, {"error": "Order not found"}, 404)
                    return
                order["items"] = supabase_request(
                    "GET", "order_items",
                    query={"order_id": f"eq.{order_id}", "select": "*"}
                )
                send_json(self, order)
                return

            super().do_GET()

        except Exception as exc:
            send_json(self, {"error": str(exc)}, 500)

    def do_POST(self):
        try:
            path = urllib.parse.urlparse(self.path).path.rstrip("/")
            data = self.read_json()

            if path == "/api/login":
                if data.get("password", "") == SELLER_PASSWORD:
                    send_json(self, {"token": "seller-token-valid", "status": "success"})
                else:
                    send_json(self, {"error": "Invalid credentials"}, 401)
                return

            if path == "/api/products":
                product = {
                    "name": data.get("name", ""),
                    "description": data.get("description", ""),
                    "price": data.get("price", 0),
                    "cost_price": data.get("cost_price", 0),
                    "image": data.get("image", ""),
                    "category": data.get("category", ""),
                    "available": data.get("available", True),
                    "stock_quantity": data.get("stock_quantity", 0),
                    "deleted": data.get("deleted"),
                }
                if not product["name"]:
                    send_json(self, {"error": "Product name is required"}, 400)
                    return
                created = supabase_request("POST", "products", product)
                send_json(self, first(created) or created, 201)
                return

            if path == "/api/orders":
                if not data.get("customer_name") or not data.get("room_number"):
                    send_json(self, {"error": "Customer name and room number are required"}, 400)
                    return
                items = data.get("items", [])
                if not items:
                    send_json(self, {"error": "Order has no items"}, 400)
                    return

                rpc_result = rpc("create_order", {
                    "p_customer_name": data["customer_name"],
                    "p_room_number": data["room_number"],
                    "p_phone": data.get("phone", ""),
                    "p_items": items,
                })

                order = first(rpc_result) if isinstance(rpc_result, list) else rpc_result
                if not order:
                    raise RuntimeError("Supabase did not return the created order")

                order_id = order["id"]
                order["items"] = supabase_request(
                    "GET", "order_items",
                    query={"order_id": f"eq.{order_id}", "select": "*"}
                )
                send_json(self, order, 201)
                return

            send_json(self, {"error": "Not found"}, 404)

        except Exception as exc:
            send_json(self, {"error": str(exc)}, 400)

    def do_PUT(self):
        try:
            path = urllib.parse.urlparse(self.path).path.rstrip("/")
            data = self.read_json()

            if path.startswith("/api/orders/") and path.endswith("/status"):
                order_id = path.split("/")[-2]
                status = data.get("status")
                reason = data.get("reason", data.get("rejection_reason", ""))

                allowed = {
                    "received", "preparing", "out_for_delivery",
                    "delivered", "cancelled"
                }
                if status not in allowed:
                    send_json(self, {"error": "Invalid status"}, 400)
                    return

                result = rpc("update_order_status", {
                    "p_order_id": int(order_id),
                    "p_status": status,
                    "p_reason": reason or None,
                })
                send_json(self, first(result) if isinstance(result, list) and result else {"status": "success"})
                return

            if path.startswith("/api/products/"):
                product_id = path.split("/")[-1]
                allowed_fields = {
                    "name", "description", "price", "cost_price",
                    "image", "category", "available", "stock_quantity"
                }
                update = {k: data[k] for k in allowed_fields if k in data}

                if "stock_quantity" in update:
                    update["stock_quantity"] = int(update["stock_quantity"])
                    if "available" not in update and update["stock_quantity"] <= 0:
                        update["available"] = False

                updated = supabase_request(
                    "PATCH", "products", update,
                    query={"id": f"eq.{product_id}"}
                )
                if not updated:
                    send_json(self, {"error": "Product not found"}, 404)
                    return
                send_json(self, first(updated))
                return

            send_json(self, {"error": "Not found"}, 404)

        except Exception as exc:
            send_json(self, {"error": str(exc)}, 400)

    def do_DELETE(self):
        try:
            path = urllib.parse.urlparse(self.path).path.rstrip("/")
            if path.startswith("/api/products/"):
                product_id = path.split("/")[-1]
                deleted = supabase_request(
                    "DELETE", "products",
                    query={"id": f"eq.{product_id}"}
                )
                if not deleted:
                    send_json(self, {"error": "Product not found"}, 404)
                    return
                send_json(self, {"success": True})
                return
            send_json(self, {"error": "Not found"}, 404)
        except Exception as exc:
            send_json(self, {"error": str(exc)}, 400)


def main():
    print(f"Anyone Anytime server starting on port {PORT}...")
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        print("WARNING: SUPABASE_URL / SUPABASE_SECRET_KEY are not set.")

    # Threading allows many customer requests to be served concurrently.
    with socketserver.ThreadingTCPServer(("0.0.0.0", PORT), APIHandler) as httpd:
        httpd.daemon_threads = True
        print(f"Serving at http://0.0.0.0:{PORT}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
