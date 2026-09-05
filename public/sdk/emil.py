"""EMIL Platform API - minimal Python SDK (requests).

    from emil import EmilClient
    emil = EmilClient(api_key="emil_test_...", base_url="https://<your-emil-host>")
    print(emil.state())

Non-2xx responses raise EmilError with .status and .retry_after_sec (honour it on 429).
Webhook receivers: verify_webhook(raw_body, signature_header, secret) -> bool
"""
import hashlib
import hmac
import time

import requests


class EmilError(Exception):
    def __init__(self, message, status, retry_after_sec=0):
        super().__init__(message)
        self.status = status
        self.retry_after_sec = retry_after_sec


class EmilClient:
    def __init__(self, api_key, base_url="", timeout=30):
        if not api_key:
            raise ValueError("api_key is required")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/") + "/api/v1"
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers["x-api-key"] = api_key

    def request(self, method, path, params=None, json=None):
        r = self.session.request(method, self.base_url + path, params=params, json=json, timeout=self.timeout)
        try:
            body = r.json() if r.text else {}
        except ValueError:
            body = {"raw": r.text}
        if not r.ok:
            retry = body.get("retryAfterSec") or int(r.headers.get("retry-after", 0) or 0)
            raise EmilError(body.get("error") or body.get("message") or "HTTP %d" % r.status_code, r.status_code, retry)
        return body

    def get(self, path, **params):
        return self.request("GET", path, params={k: v for k, v in params.items() if v is not None} or None)

    def post(self, path, **json):
        return self.request("POST", path, json=json)

    def delete(self, path, **params):
        return self.request("DELETE", path, params={k: v for k, v in params.items() if v is not None} or None)

    # Account / EMIL
    def ping(self): return self.get("/ping")
    def me(self): return self.get("/me")
    def usage(self): return self.get("/usage")
    def state(self): return self.get("/state")
    def strategies(self): return self.get("/strategies")

    # Market data
    def board(self): return self.get("/market/board")
    def quotes(self, symbols):
        return self.get("/market/quotes", symbols=",".join(symbols) if isinstance(symbols, (list, tuple)) else symbols)
    def candles(self, symbol, interval="1day", outputsize=90):
        return self.get("/market/candles", symbol=symbol, interval=interval, outputsize=outputsize)
    def correlation(self, a, b, days=365): return self.get("/market/correlation", a=a, b=b, days=days)
    def news(self, category="markets", score=True): return self.get("/news", category=category, score=1 if score else 0)
    def calendar(self): return self.get("/calendar")
    def central_banks(self): return self.get("/calendar/central-banks")
    def report(self, symbol): return self.get("/research/report", symbol=symbol)
    def brief(self): return self.get("/research/brief")

    # Alerts & watchlist
    def watchlist(self): return self.get("/watchlist")
    def track(self, symbol): return self.post("/watchlist", symbol=symbol)
    def untrack(self, symbol): return self.delete("/watchlist/" + symbol)
    def alerts(self): return self.get("/alerts")
    def create_alert(self, symbol, condition, threshold, note=None):
        return self.post("/alerts", symbol=symbol, condition=condition, threshold=threshold, note=note)
    def delete_alert(self, alert_id): return self.delete("/alerts/" + alert_id)
    def notifications(self): return self.get("/notifications")

    # Journal & portfolio
    def journal(self): return self.get("/journal")
    def journal_write(self, **entry): return self.post("/journal", **entry)
    def portfolio(self): return self.get("/portfolio")

    # Paper trading (never live)
    def paper_venues(self): return self.get("/paper/venues")
    def paper_orders(self, venue=None): return self.get("/paper/orders", venue=venue)
    def paper_place(self, venue, symbol, side, order_type, qty, price=None):
        return self.post("/paper/orders", venue=venue, symbol=symbol, side=side, orderType=order_type, qty=qty, price=price)
    def paper_cancel(self, order_id, venue, symbol=None):
        return self.delete("/paper/orders/" + order_id, venue=venue, symbol=symbol)

    # Webhooks
    def webhooks(self): return self.get("/webhooks")
    def create_webhook(self, url, events=("*",), description=None):
        return self.post("/webhooks", url=url, events=list(events), description=description)
    def delete_webhook(self, endpoint_id): return self.delete("/webhooks/" + endpoint_id)
    def test_webhook(self, endpoint_id): return self.post("/webhooks/" + endpoint_id + "/test")

    # Bring-your-own data
    def ingest_quotes(self, rows): return self.post("/ingest/quotes", rows=rows)
    def ingest_orders(self, rows): return self.post("/ingest/orders", rows=rows)
    def ingest_pnl(self, rows): return self.post("/ingest/pnl", rows=rows)
    def ingest_summary(self): return self.get("/ingest/summary")


def verify_webhook(raw_body, signature_header, secret, tolerance_sec=300):
    parts = dict(p.split("=", 1) for p in (signature_header or "").split(",") if "=" in p)
    try:
        t = int(parts.get("t", "0"))
    except ValueError:
        return False
    v1 = parts.get("v1", "")
    if not t or not v1 or abs(time.time() - t) > tolerance_sec:
        return False
    if isinstance(raw_body, str):
        raw_body = raw_body.encode()
    expected = hmac.new(secret.encode(), ("%d." % t).encode() + raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, v1)
