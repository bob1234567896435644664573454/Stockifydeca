"""
Final processing: create clean competitor data from SimilarWeb v2.
"""
import json

output_dir = "/home/ubuntu/Stockifydeca/web/public/data"

with open(f"{output_dir}/similarweb_v2.json") as f:
    sw = json.load(f)

competitors = []
for domain, data in sw.items():
    comp = {"domain": domain}
    
    # Global rank
    ranks = data.get("global_rank", [])
    comp["globalRank"] = ranks[-1].get("global_rank", 0) if ranks else 0
    
    # Visits (monthly trend)
    visits = data.get("visits", [])
    if visits:
        comp["monthlyVisits"] = round(visits[-1].get("visits", 0))
        comp["visitsTrend"] = [{"date": v["date"][:7], "visits": round(v["visits"])} for v in visits]
    else:
        comp["monthlyVisits"] = 0
        comp["visitsTrend"] = []
    
    # Bounce rate
    br = data.get("bounce_rate", [])
    if br:
        comp["bounceRate"] = round(br[-1].get("bounce_rate", 0) * 100, 1)
        comp["bounceRateTrend"] = [{"date": b["date"][:7], "rate": round(b["bounce_rate"] * 100, 1)} for b in br]
    else:
        comp["bounceRate"] = 0
        comp["bounceRateTrend"] = []
    
    # Traffic sources
    ts = data.get("traffic_sources", {})
    if isinstance(ts, dict) and "meta" in ts:
        # Extract from nested structure
        overview = ts
        # Try to find the actual data
        for key in ["overview", "visits"]:
            if key in ts:
                overview = ts[key]
                break
        comp["trafficSources"] = {}
    elif isinstance(ts, list) and ts:
        latest = ts[-1]
        comp["trafficSources"] = {
            "organic": round(latest.get("organic_search", 0) * 100, 1),
            "paid": round(latest.get("paid_search", 0) * 100, 1),
            "direct": round(latest.get("direct", 0) * 100, 1),
            "social": round(latest.get("social", 0) * 100, 1),
            "referral": round(latest.get("referrals", 0) * 100, 1),
            "email": round(latest.get("email", 0) * 100, 1),
            "display": round(latest.get("display_ad", 0) * 100, 1),
        }
    else:
        comp["trafficSources"] = {}
    
    # Top countries
    tc = data.get("top_countries", [])
    if tc:
        # Map country codes to names
        country_map = {840: "United States", 826: "United Kingdom", 124: "Canada", 
                       276: "Germany", 356: "India", 36: "Australia", 250: "France",
                       392: "Japan", 76: "Brazil", 156: "China", 380: "Italy",
                       528: "Netherlands", 724: "Spain", 410: "South Korea",
                       643: "Russia", 484: "Mexico", 792: "Turkey", 616: "Poland",
                       566: "Nigeria", 608: "Philippines", 360: "Indonesia",
                       704: "Vietnam", 764: "Thailand", 818: "Egypt", 682: "Saudi Arabia"}
        comp["topCountries"] = [
            {
                "country": country_map.get(c.get("country", 0), f"Country {c.get('country', 'Unknown')}"),
                "share": round(c.get("share", 0) * 100, 1),
                "visits": round(c.get("visits", 0))
            }
            for c in tc[:5]
        ]
    else:
        comp["topCountries"] = []
    
    competitors.append(comp)

with open(f"{output_dir}/competitors_processed.json", "w") as f:
    json.dump(competitors, f, indent=2)

print("Processed competitors:")
for c in competitors:
    print(f"  {c['domain']}: Rank #{c['globalRank']} | {c['monthlyVisits']:,} visits | {c['bounceRate']}% bounce")

print(f"\nSaved to {output_dir}/competitors_processed.json")
