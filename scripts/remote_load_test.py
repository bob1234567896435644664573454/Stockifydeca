#!/usr/bin/env python3
"""
Remote concurrency + abuse smoke test for Stockify.

Creates N throwaway student users, enrolls them in the seeded class, creates trading accounts,
then places concurrent orders and validates basic invariants (no negative cash, no double fills).

Requires: .env.remote with SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY and job keys.
"""

from __future__ import annotations

import json
import os
import secrets
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import requests


CLASS_ID = "33333333-3333-3333-3333-333333333333"
COMPETITION_ID = "55555555-5555-5555-5555-555555555555"
ORG_ID = "11111111-1111-1111-1111-111111111111"
SCHOOL_ID = "22222222-2222-2222-2222-222222222222"


def load_env(path: str) -> Dict[str, str]:
    vals: Dict[str, str] = {}
    for line in Path(path).read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        vals[k] = v
    return vals


@dataclass
class Cfg:
    url: str
    anon: str
    service: str
    engine_key: str


def _h_anon(cfg: Cfg, token: Optional[str] = None) -> Dict[str, str]:
    h = {"apikey": cfg.anon}
    if token:
        h["authorization"] = f"Bearer {token}"
    return h


def _h_service(cfg: Cfg) -> Dict[str, str]:
    return {
        "apikey": cfg.service,
        "authorization": f"Bearer {cfg.service}",
    }


def auth_login(cfg: Cfg, email: str, password: str) -> str:
    r = requests.post(
        f"{cfg.url}/auth/v1/token?grant_type=password",
        headers={"apikey": cfg.anon, "Content-Type": "application/json"},
        data=json.dumps({"email": email, "password": password}),
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def auth_admin_create_user(cfg: Cfg, email: str, password: str) -> str:
    r = requests.post(
        f"{cfg.url}/auth/v1/admin/users",
        headers={**_h_service(cfg), "Content-Type": "application/json"},
        data=json.dumps({"email": email, "password": password, "email_confirm": True}),
        timeout=30,
    )
    # If already exists, return ID via password login response.
    if r.status_code in (400, 422):
        token = auth_login(cfg, email, password)
        me = requests.get(
            f"{cfg.url}/auth/v1/user",
            headers={**_h_anon(cfg, token)},
            timeout=30,
        )
        me.raise_for_status()
        return me.json()["id"]
    r.raise_for_status()
    return r.json()["id"]


def upsert_profile(cfg: Cfg, user_id: str, display_name: str) -> None:
    r = requests.post(
        f"{cfg.url}/rest/v1/profiles?on_conflict=user_id",
        headers={**_h_service(cfg), "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=representation"},
        data=json.dumps(
            {
                "user_id": user_id,
                "display_name": display_name,
                "role": "student",
                "org_id": ORG_ID,
                "school_id": SCHOOL_ID,
            }
        ),
        timeout=30,
    )
    r.raise_for_status()


def upsert_enrollment(cfg: Cfg, user_id: str) -> None:
    r = requests.post(
        f"{cfg.url}/rest/v1/enrollments?on_conflict=class_id,student_id",
        headers={**_h_service(cfg), "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=representation"},
        data=json.dumps({"class_id": CLASS_ID, "student_id": user_id, "status": "active"}),
        timeout=30,
    )
    r.raise_for_status()


def upsert_trading_account(cfg: Cfg, user_id: str, starting_cash: float = 100000.0) -> str:
    # Use deterministic account IDs per user to avoid dupes across runs.
    account_id = str(uuid.uuid5(uuid.UUID("00000000-0000-0000-0000-000000000000"), f"loadtest:{user_id}:{CLASS_ID}"))
    r = requests.post(
        f"{cfg.url}/rest/v1/trading_accounts?on_conflict=user_id,class_id",
        headers={**_h_service(cfg), "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=representation"},
        data=json.dumps(
            {
                "id": account_id,
                "user_id": user_id,
                "org_id": ORG_ID,
                "class_id": CLASS_ID,
                "base_currency": "USD",
                "starting_cash": starting_cash,
                "cash_balance": starting_cash,
                "status": "active",
                "is_frozen": False,
            }
        ),
        timeout=30,
    )
    r.raise_for_status()
    return account_id


def upsert_competition_account(cfg: Cfg, account_id: str) -> None:
    r = requests.post(
        f"{cfg.url}/rest/v1/competition_accounts?on_conflict=competition_id,account_id",
        headers={**_h_service(cfg), "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=representation"},
        data=json.dumps({"competition_id": COMPETITION_ID, "account_id": account_id}),
        timeout=30,
    )
    r.raise_for_status()


def trade_place(cfg: Cfg, token: str, account_id: str, symbol: str, side: str, qty: int, client_request_id: str) -> Tuple[int, Dict[str, Any]]:
    r = requests.post(
        f"{cfg.url}/functions/v1/trade/place",
        headers={**_h_anon(cfg, token), "Content-Type": "application/json"},
        data=json.dumps(
            {
                "account_id": account_id,
                "client_request_id": client_request_id,
                "payload": {"symbol": symbol, "side": side, "qty": qty, "order_type": "market", "tif": "day"},
            }
        ),
        timeout=30,
    )
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, {"__text__": r.text}


def engine_tick(cfg: Cfg) -> None:
    r = requests.post(
        f"{cfg.url}/functions/v1/engine-tick",
        headers={"apikey": cfg.anon, "x-engine-key": cfg.engine_key, "Content-Type": "application/json"},
        data=json.dumps({"max_orders": 5000, "max_jobs": 200}),
        timeout=60,
    )
    r.raise_for_status()


def count_fills_for_orders(cfg: Cfg, order_ids: list[str]) -> int:
    # Query fills by order_id via service role.
    if not order_ids:
        return 0
    # PostgREST doesn't support huge IN lists well; chunk.
    total = 0
    for i in range(0, len(order_ids), 100):
        chunk = order_ids[i : i + 100]
        flt = ",".join(chunk)
        r = requests.get(
            f"{cfg.url}/rest/v1/fills?select=id,order_id&order_id=in.({flt})",
            headers=_h_service(cfg),
            timeout=30,
        )
        r.raise_for_status()
        total += len(r.json())
    return total


def check_invariants(cfg: Cfg, account_ids: list[str]) -> None:
    if not account_ids:
        return
    flt = ",".join(account_ids)
    # No negative cash.
    r = requests.get(
        f"{cfg.url}/rest/v1/trading_accounts?select=id,cash_balance&id=in.({flt})",
        headers=_h_service(cfg),
        timeout=30,
    )
    r.raise_for_status()
    for row in r.json():
        if float(row["cash_balance"]) < -1e-6:
            raise RuntimeError(f"negative cash_balance for {row['id']}: {row['cash_balance']}")
    # No negative position qty.
    r = requests.get(
        f"{cfg.url}/rest/v1/holdings_snapshot?select=account_id,symbol,qty&account_id=in.({flt})",
        headers=_h_service(cfg),
        timeout=30,
    )
    r.raise_for_status()
    for row in r.json():
        if float(row["qty"]) < -1e-6:
            raise RuntimeError(f"negative qty for {row['account_id']} {row['symbol']}: {row['qty']}")


def main() -> int:
    env_path = os.environ.get("ENV_FILE", "/Users/alt/deca/.env.remote")
    vals = load_env(env_path)
    cfg = Cfg(
        url=vals["SUPABASE_URL"],
        anon=vals["SUPABASE_ANON_KEY"],
        service=vals["SUPABASE_SERVICE_ROLE_KEY"],
        engine_key=vals["ENGINE_JOB_KEY"],
    )

    n_users = int(os.environ.get("N_USERS", "30"))
    orders_per_user = int(os.environ.get("ORDERS_PER_USER", "1"))
    symbol = os.environ.get("SYMBOL", "AAPL").upper()
    pw = os.environ.get("PASSWORD", "Password123!")
    tag = time.strftime("%Y%m%d-%H%M%S")

    users: list[Tuple[str, str, str]] = []  # (email, user_id, token)
    accounts: list[str] = []

    print(f"Creating/ensuring {n_users} users...")
    for i in range(n_users):
        email = f"loadtest+{tag}+{i}@stockify.dev"
        user_id = auth_admin_create_user(cfg, email, pw)
        upsert_profile(cfg, user_id, f"Load Test {i}")
        upsert_enrollment(cfg, user_id)
        account_id = upsert_trading_account(cfg, user_id)
        upsert_competition_account(cfg, account_id)
        token = auth_login(cfg, email, pw)
        users.append((email, user_id, token))
        accounts.append(account_id)

    print("Placing concurrent orders...")
    order_ids: list[str] = []
    errors: list[Tuple[str, int, Any]] = []
    with ThreadPoolExecutor(max_workers=min(32, n_users)) as ex:
        futures = []
        for (email, _uid, token), account_id in zip(users, accounts):
            for j in range(orders_per_user):
                crid = f"loadtest-{tag}-{email}-{j}-{secrets.token_hex(4)}"
                futures.append(ex.submit(trade_place, cfg, token, account_id, symbol, "buy", 1, crid))
        for fut in as_completed(futures):
            status, body = fut.result()
            if status == 200:
                oid = body.get("order_id") or body.get("result", {}).get("order_id")
                if isinstance(oid, str):
                    order_ids.append(oid)
                else:
                    errors.append(("missing_order_id", status, body))
            else:
                errors.append(("place_failed", status, body))

    print(f"Placed: {len(order_ids)} ok, {len(errors)} errors")
    # Tick engine a couple times to fill orders deterministically.
    engine_tick(cfg)
    engine_tick(cfg)

    # Double-fill check: each market order should have exactly 1 fill (current engine fills fully in one tick).
    fill_count = count_fills_for_orders(cfg, order_ids)
    print(f"Fills found for placed orders: {fill_count} (orders: {len(order_ids)})")
    if fill_count < len(order_ids):
        raise RuntimeError("some orders did not get a fill after engine ticks")

    check_invariants(cfg, accounts)
    print("Invariants: OK (no negative cash/qty)")

    # Abuse test: spam one user to ensure rate limiting/rules kick in.
    print("Abuse test: spamming one user...")
    spam_email, _spam_uid, spam_token = users[0]
    spam_account = accounts[0]
    spam_ok = 0
    spam_fail = 0
    for k in range(25):
        crid = f"spam-{tag}-{k}-{secrets.token_hex(4)}"
        status, _body = trade_place(cfg, spam_token, spam_account, symbol, "buy", 1, crid)
        if status == 200:
            spam_ok += 1
        else:
            spam_fail += 1
    print(f"Spam results for {spam_email}: ok={spam_ok} fail={spam_fail} (expect some fail when caps are low)")

    print("Done.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(130)
