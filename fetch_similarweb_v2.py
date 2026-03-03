"""
Retry SimilarWeb APIs with corrected date ranges.
The latest complete month is January 2026 (2026-01).
"""
import sys
sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient
import json
import os
import time

client = ApiClient()
output_dir = "/home/ubuntu/Stockifydeca/web/public/data"

DOMAINS = ["investopedia.com", "robinhood.com", "finance.yahoo.com", "tradingview.com", "marketwatch.com"]

all_data = {}

for domain in DOMAINS:
    print(f"\n=== {domain} ===")
    dd = {}
    
    # Global Rank (already works)
    try:
        result = client.call_api('SimilarWeb/get_global_rank', path_params={'domain': domain})
        dd['global_rank'] = result.get('global_rank', [])
        print(f"  ✓ Global rank: {dd['global_rank']}")
    except Exception as e:
        print(f"  ✗ Global rank: {e}")
        dd['global_rank'] = []
    
    time.sleep(1)
    
    # Total Visits - use 2025-07 to 2025-12
    try:
        result = client.call_api('SimilarWeb/get_visits_total',
            path_params={'domain': domain},
            query={'country': 'world', 'granularity': 'monthly', 'start_date': '2025-07', 'end_date': '2025-12'})
        if 'visits' in result:
            dd['visits'] = result['visits']
        elif 'code' not in result:
            dd['visits'] = result
        else:
            dd['visits'] = []
        print(f"  ✓ Visits: {str(dd['visits'])[:100]}")
    except Exception as e:
        print(f"  ✗ Visits: {e}")
        dd['visits'] = []
    
    time.sleep(1)
    
    # Bounce Rate
    try:
        result = client.call_api('SimilarWeb/get_bounce_rate',
            path_params={'domain': domain},
            query={'country': 'world', 'granularity': 'monthly', 'start_date': '2025-07', 'end_date': '2025-12'})
        if 'bounce_rate' in result:
            dd['bounce_rate'] = result['bounce_rate']
        elif 'code' not in result:
            dd['bounce_rate'] = result
        else:
            dd['bounce_rate'] = []
        print(f"  ✓ Bounce rate: {str(dd['bounce_rate'])[:100]}")
    except Exception as e:
        print(f"  ✗ Bounce rate: {e}")
        dd['bounce_rate'] = []
    
    time.sleep(1)
    
    # Traffic Sources Desktop - 3 month window
    try:
        result = client.call_api('SimilarWeb/get_traffic_sources_desktop',
            path_params={'domain': domain},
            query={'country': 'world', 'granularity': 'monthly', 'start_date': '2025-10', 'end_date': '2025-12'})
        if 'overview' in result:
            dd['traffic_sources'] = result['overview']
        elif 'code' not in result:
            dd['traffic_sources'] = result
        else:
            dd['traffic_sources'] = []
        print(f"  ✓ Traffic sources: {str(dd['traffic_sources'])[:100]}")
    except Exception as e:
        print(f"  ✗ Traffic sources: {e}")
        dd['traffic_sources'] = []
    
    time.sleep(1)
    
    # Traffic by Country - 3 month max
    try:
        result = client.call_api('SimilarWeb/get_total_traffic_by_country',
            path_params={'domain': domain},
            query={'start_date': '2025-10', 'end_date': '2025-12', 'limit': '5'})
        if 'records' in result:
            dd['top_countries'] = result['records']
        elif 'code' not in result:
            dd['top_countries'] = result
        else:
            dd['top_countries'] = []
        print(f"  ✓ Top countries: {str(dd['top_countries'])[:100]}")
    except Exception as e:
        print(f"  ✗ Top countries: {e}")
        dd['top_countries'] = []
    
    all_data[domain] = dd
    # Save after each domain
    with open(f"{output_dir}/similarweb_v2.json", "w") as f:
        json.dump(all_data, f, indent=2, default=str)
    
    time.sleep(2)

print(f"\n=== Saved to {output_dir}/similarweb_v2.json ===")
