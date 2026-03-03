"""
Fetch real stock data using Yahoo Finance APIs (stock-analysis skill)
and SimilarWeb analytics for competitor website analysis.
Saves results as JSON for the Stockify frontend to consume.
"""
import sys
sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient
import json
import os

client = ApiClient()
output_dir = "/home/ubuntu/Stockifydeca/web/public/data"
os.makedirs(output_dir, exist_ok=True)

SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "JPM", "V"]

# ─── 1. Fetch Stock Profiles ───
print("=== Fetching Stock Profiles ===")
profiles = {}
for sym in SYMBOLS:
    try:
        result = client.call_api('Yahoo/get_stock_profile', query={'symbol': sym, 'region': 'US', 'lang': 'en-US'})
        profiles[sym] = result
        print(f"  ✓ {sym} profile fetched")
    except Exception as e:
        print(f"  ✗ {sym} profile failed: {e}")
        profiles[sym] = None

with open(f"{output_dir}/stock_profiles.json", "w") as f:
    json.dump(profiles, f, indent=2, default=str)
print(f"Saved profiles to {output_dir}/stock_profiles.json")

# ─── 2. Fetch Stock Insights ───
print("\n=== Fetching Stock Insights ===")
insights = {}
for sym in SYMBOLS:
    try:
        result = client.call_api('Yahoo/get_stock_insights', query={'symbol': sym})
        insights[sym] = result
        print(f"  ✓ {sym} insights fetched")
    except Exception as e:
        print(f"  ✗ {sym} insights failed: {e}")
        insights[sym] = None

with open(f"{output_dir}/stock_insights.json", "w") as f:
    json.dump(insights, f, indent=2, default=str)
print(f"Saved insights to {output_dir}/stock_insights.json")

# ─── 3. Fetch Stock Charts (1Y daily) ───
print("\n=== Fetching Stock Charts ===")
charts = {}
for sym in SYMBOLS:
    try:
        result = client.call_api('Yahoo/get_stock_chart', query={
            'symbol': sym, 'region': 'US', 'interval': '1d', 'range': '1y',
            'includeAdjustedClose': 'true'
        })
        charts[sym] = result
        print(f"  ✓ {sym} chart fetched")
    except Exception as e:
        print(f"  ✗ {sym} chart failed: {e}")
        charts[sym] = None

with open(f"{output_dir}/stock_charts.json", "w") as f:
    json.dump(charts, f, indent=2, default=str)
print(f"Saved charts to {output_dir}/stock_charts.json")

# ─── 4. Fetch Stock Holders (Insider Activity) ───
print("\n=== Fetching Insider Holdings ===")
holders = {}
for sym in ["AAPL", "MSFT", "NVDA", "TSLA"]:
    try:
        result = client.call_api('Yahoo/get_stock_holders', query={'symbol': sym, 'region': 'US', 'lang': 'en-US'})
        holders[sym] = result
        print(f"  ✓ {sym} holders fetched")
    except Exception as e:
        print(f"  ✗ {sym} holders failed: {e}")
        holders[sym] = None

with open(f"{output_dir}/stock_holders.json", "w") as f:
    json.dump(holders, f, indent=2, default=str)
print(f"Saved holders to {output_dir}/stock_holders.json")

# ─── 5. Fetch SEC Filings ───
print("\n=== Fetching SEC Filings ===")
filings = {}
for sym in ["AAPL", "MSFT", "NVDA", "TSLA"]:
    try:
        result = client.call_api('Yahoo/get_stock_sec_filing', query={'symbol': sym, 'region': 'US', 'lang': 'en-US'})
        filings[sym] = result
        print(f"  ✓ {sym} filings fetched")
    except Exception as e:
        print(f"  ✗ {sym} filings failed: {e}")
        filings[sym] = None

with open(f"{output_dir}/stock_filings.json", "w") as f:
    json.dump(filings, f, indent=2, default=str)
print(f"Saved filings to {output_dir}/stock_filings.json")

print("\n=== All stock data fetched and saved! ===")
