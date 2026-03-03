"""
Fetch SimilarWeb analytics data for financial education competitor websites.
This data powers the competitive landscape section of the Stockify platform.
"""
import sys
sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient
import json
import os

client = ApiClient()
output_dir = "/home/ubuntu/Stockifydeca/web/public/data"
os.makedirs(output_dir, exist_ok=True)

# Financial education and trading platform competitors
DOMAINS = [
    "investopedia.com",
    "robinhood.com",
    "finance.yahoo.com",
    "tradingview.com",
    "marketwatch.com",
]

all_data = {}

for domain in DOMAINS:
    print(f"\n=== Fetching data for {domain} ===")
    domain_data = {}
    
    # Global Rank
    try:
        result = client.call_api('SimilarWeb/get_global_rank', path_params={'domain': domain})
        domain_data['global_rank'] = result
        print(f"  ✓ Global rank fetched")
    except Exception as e:
        print(f"  ✗ Global rank failed: {e}")
        domain_data['global_rank'] = None
    
    # Save immediately to prevent data loss
    all_data[domain] = domain_data
    with open(f"{output_dir}/similarweb_data.json", "w") as f:
        json.dump(all_data, f, indent=2, default=str)

    # Total Visits
    try:
        result = client.call_api('SimilarWeb/get_visits_total',
            path_params={'domain': domain},
            query={'country': 'world', 'granularity': 'monthly', 'start_date': '2025-09', 'end_date': '2026-02'})
        domain_data['visits_total'] = result
        print(f"  ✓ Total visits fetched")
    except Exception as e:
        print(f"  ✗ Total visits failed: {e}")
        domain_data['visits_total'] = None

    # Bounce Rate
    try:
        result = client.call_api('SimilarWeb/get_bounce_rate',
            path_params={'domain': domain},
            query={'country': 'world', 'granularity': 'monthly', 'start_date': '2025-09', 'end_date': '2026-02'})
        domain_data['bounce_rate'] = result
        print(f"  ✓ Bounce rate fetched")
    except Exception as e:
        print(f"  ✗ Bounce rate failed: {e}")
        domain_data['bounce_rate'] = None

    # Traffic Sources Desktop
    try:
        result = client.call_api('SimilarWeb/get_traffic_sources_desktop',
            path_params={'domain': domain},
            query={'country': 'world', 'granularity': 'monthly', 'start_date': '2025-11', 'end_date': '2026-02'})
        domain_data['traffic_sources_desktop'] = result
        print(f"  ✓ Desktop traffic sources fetched")
    except Exception as e:
        print(f"  ✗ Desktop traffic sources failed: {e}")
        domain_data['traffic_sources_desktop'] = None

    # Traffic by Country
    try:
        result = client.call_api('SimilarWeb/get_total_traffic_by_country',
            path_params={'domain': domain},
            query={'start_date': '2025-12', 'end_date': '2026-02', 'limit': '5'})
        domain_data['traffic_by_country'] = result
        print(f"  ✓ Traffic by country fetched")
    except Exception as e:
        print(f"  ✗ Traffic by country failed: {e}")
        domain_data['traffic_by_country'] = None

    all_data[domain] = domain_data
    # Save after each domain
    with open(f"{output_dir}/similarweb_data.json", "w") as f:
        json.dump(all_data, f, indent=2, default=str)

print(f"\n=== All SimilarWeb data saved to {output_dir}/similarweb_data.json ===")
