"""
Process raw API data into clean, frontend-ready JSON files.
"""
import json
import os
from datetime import datetime

output_dir = "/home/ubuntu/Stockifydeca/web/public/data"

SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "JPM", "V"]

# Load raw data
with open(f"{output_dir}/stock_charts.json") as f:
    charts_raw = json.load(f)
with open(f"{output_dir}/stock_profiles.json") as f:
    profiles_raw = json.load(f)
with open(f"{output_dir}/stock_insights.json") as f:
    insights_raw = json.load(f)
with open(f"{output_dir}/stock_holders.json") as f:
    holders_raw = json.load(f)
with open(f"{output_dir}/stock_filings.json") as f:
    filings_raw = json.load(f)
with open(f"{output_dir}/similarweb_data.json") as f:
    similarweb_raw = json.load(f)

# ─── Process Stocks ───
stocks = []
for sym in SYMBOLS:
    stock = {"symbol": sym}
    
    # Chart meta (current price, 52w range, volume)
    try:
        meta = charts_raw[sym]["chart"]["result"][0]["meta"]
        stock["price"] = meta.get("regularMarketPrice", 0)
        stock["high52w"] = meta.get("fiftyTwoWeekHigh", 0)
        stock["low52w"] = meta.get("fiftyTwoWeekLow", 0)
        stock["volume"] = meta.get("regularMarketVolume", 0)
        stock["name"] = meta.get("longName", sym)
        stock["exchange"] = meta.get("fullExchangeName", "")
        stock["previousClose"] = meta.get("chartPreviousClose", 0)
        stock["dayHigh"] = meta.get("regularMarketDayHigh", 0)
        stock["dayLow"] = meta.get("regularMarketDayLow", 0)
        
        # Calculate change
        prev = meta.get("chartPreviousClose", meta.get("regularMarketPrice", 0))
        curr = meta.get("regularMarketPrice", 0)
        stock["change"] = round(curr - prev, 2) if prev else 0
        stock["changePercent"] = round(((curr - prev) / prev) * 100, 2) if prev else 0
        
        # Price history (last 30 days for sparkline)
        timestamps = charts_raw[sym]["chart"]["result"][0].get("timestamp", [])
        quotes = charts_raw[sym]["chart"]["result"][0]["indicators"]["quote"][0]
        closes = quotes.get("close", [])
        stock["priceHistory"] = [
            {"date": datetime.fromtimestamp(t).strftime("%Y-%m-%d"), "close": round(c, 2) if c else None}
            for t, c in zip(timestamps[-60:], closes[-60:])
            if c is not None
        ]
    except Exception as e:
        print(f"  Chart error for {sym}: {e}")
    
    # Profile (sector, industry, description)
    try:
        profile = profiles_raw[sym]["quoteSummary"]["result"][0]["summaryProfile"]
        stock["sector"] = profile.get("sector", "")
        stock["industry"] = profile.get("industry", "")
        stock["description"] = profile.get("longBusinessSummary", "")
        stock["website"] = profile.get("website", "")
        stock["employees"] = profile.get("fullTimeEmployees", 0)
        stock["city"] = profile.get("city", "")
        stock["state"] = profile.get("state", "")
        stock["country"] = profile.get("country", "")
    except Exception as e:
        print(f"  Profile error for {sym}: {e}")
    
    # Insights (technical outlook, valuation, recommendation)
    try:
        result = insights_raw[sym]["finance"]["result"]
        
        # Technical events
        tech = result.get("instrumentInfo", {}).get("technicalEvents", {})
        stock["shortTermOutlook"] = tech.get("shortTermOutlook", {}).get("direction", "")
        stock["intermediateOutlook"] = tech.get("intermediateTermOutlook", {}).get("direction", "")
        stock["longTermOutlook"] = tech.get("longTermOutlook", {}).get("direction", "")
        
        # Key technicals
        kt = result.get("instrumentInfo", {}).get("keyTechnicals", {})
        stock["support"] = kt.get("support", 0)
        stock["resistance"] = kt.get("resistance", 0)
        stock["stopLoss"] = kt.get("stopLoss", 0)
        
        # Valuation
        val = result.get("instrumentInfo", {}).get("valuation", {})
        stock["valuationDescription"] = val.get("description", "")
        stock["valuationDiscount"] = val.get("discount", "")
        stock["relativeValue"] = val.get("relativeValue", "")
        
        # Recommendation
        rec = result.get("recommendation", {})
        stock["targetPrice"] = rec.get("targetPrice", 0)
        stock["rating"] = rec.get("rating", "")
        stock["ratingProvider"] = rec.get("provider", "")
        
        # Company snapshot scores
        cs = result.get("companySnapshot", {}).get("company", {})
        stock["innovativeness"] = round(cs.get("innovativeness", 0) * 100)
        stock["hiring"] = round(cs.get("hiring", 0) * 100)
        stock["sustainability"] = round(cs.get("sustainability", 0) * 100)
        stock["insiderSentiment"] = round(cs.get("insiderSentiments", 0) * 100)
        stock["earningsReports"] = round(cs.get("earningsReports", 0) * 100)
        stock["dividends"] = round(cs.get("dividends", 0) * 100)
        
        # Significant developments
        stock["sigDevs"] = [
            {"headline": sd.get("headline", ""), "date": sd.get("date", "")}
            for sd in result.get("sigDevs", [])[:5]
        ]
        
        # Research reports
        stock["reports"] = [
            {"title": r.get("reportTitle", ""), "date": r.get("reportDate", ""), "provider": r.get("provider", "")}
            for r in result.get("reports", [])[:3]
        ]
    except Exception as e:
        print(f"  Insights error for {sym}: {e}")
    
    # Holders
    if sym in holders_raw and holders_raw[sym]:
        try:
            ih = holders_raw[sym].get("quoteSummary", {}).get("result", [{}])[0].get("insiderHolders", {}).get("holders", [])
            stock["insiders"] = [
                {
                    "name": h.get("name", ""),
                    "relation": h.get("relation", ""),
                    "transaction": h.get("transactionDescription", ""),
                    "shares": h.get("positionDirect", {}).get("raw", 0),
                    "date": h.get("latestTransDate", {}).get("fmt", ""),
                }
                for h in ih[:5]
            ]
        except Exception as e:
            print(f"  Holders error for {sym}: {e}")
    
    # Filings
    if sym in filings_raw and filings_raw[sym]:
        try:
            fl = filings_raw[sym].get("quoteSummary", {}).get("result", [{}])[0].get("secFilings", {}).get("filings", [])
            stock["filings"] = [
                {
                    "type": f.get("type", ""),
                    "title": f.get("title", ""),
                    "date": f.get("date", ""),
                    "url": f.get("edgarUrl", ""),
                }
                for f in fl[:10]
            ]
        except Exception as e:
            print(f"  Filings error for {sym}: {e}")
    
    # Calculate market cap from price (approximate)
    # Use real data if available
    stock["marketCap"] = stock.get("price", 0) * 1e9  # placeholder
    
    stocks.append(stock)

# Save processed stocks
with open(f"{output_dir}/stocks_processed.json", "w") as f:
    json.dump(stocks, f, indent=2)
print(f"Saved {len(stocks)} processed stocks")

# ─── Process SimilarWeb Data ───
competitors = []
for domain, data in similarweb_raw.items():
    comp = {"domain": domain}
    
    # Global rank
    try:
        ranks = data.get("global_rank", [])
        if ranks and len(ranks) > 0:
            latest = ranks[-1] if isinstance(ranks, list) else ranks
            comp["globalRank"] = latest.get("global_rank", 0) if isinstance(latest, dict) else 0
    except:
        comp["globalRank"] = 0
    
    # Visits
    try:
        visits = data.get("visits_total", [])
        if visits and len(visits) > 0:
            latest = visits[-1] if isinstance(visits, list) else visits
            comp["monthlyVisits"] = latest.get("visits", 0) if isinstance(latest, dict) else 0
    except:
        comp["monthlyVisits"] = 0
    
    # Bounce rate
    try:
        br = data.get("bounce_rate", [])
        if br and len(br) > 0:
            latest = br[-1] if isinstance(br, list) else br
            comp["bounceRate"] = round(latest.get("bounce_rate", 0) * 100, 1) if isinstance(latest, dict) else 0
    except:
        comp["bounceRate"] = 0
    
    # Traffic sources
    try:
        ts = data.get("traffic_sources_desktop", [])
        if ts and len(ts) > 0:
            latest = ts[-1] if isinstance(ts, list) else ts
            if isinstance(latest, dict):
                comp["trafficSources"] = {
                    "organic": round(latest.get("organic_search", 0) * 100, 1),
                    "paid": round(latest.get("paid_search", 0) * 100, 1),
                    "direct": round(latest.get("direct", 0) * 100, 1),
                    "social": round(latest.get("social", 0) * 100, 1),
                    "referral": round(latest.get("referrals", 0) * 100, 1),
                    "email": round(latest.get("email", 0) * 100, 1),
                    "display": round(latest.get("display_ad", 0) * 100, 1),
                }
    except:
        pass
    
    # Top countries
    try:
        tc = data.get("traffic_by_country", [])
        if tc and len(tc) > 0:
            comp["topCountries"] = [
                {"country": c.get("country", ""), "share": round(c.get("share", 0) * 100, 1)}
                for c in (tc if isinstance(tc, list) else [tc])[:5]
            ]
    except:
        pass
    
    competitors.append(comp)

with open(f"{output_dir}/competitors_processed.json", "w") as f:
    json.dump(competitors, f, indent=2)
print(f"Saved {len(competitors)} competitor profiles")

print("\n=== Processing complete! ===")
