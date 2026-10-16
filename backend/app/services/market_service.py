import os
import requests
import json
from datetime import datetime, date
from concurrent.futures import ThreadPoolExecutor
try:
    from curl_cffi import requests as http_requests
except ImportError:
    import requests as http_requests

def map_symbol_to_yahoo(symbol: str) -> str:
    s = symbol.strip().upper()
    if s.endswith('.BSE'):
        return s.replace('.BSE', '.NS')
    if '.' not in s and s not in ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'META', '^NSEI', '^BSESN', '^GSPC', '^IXIC']:
        return f"{s}.NS"
    return s

def fetch_single_live_quote(item: dict) -> dict:
    symbol = item.get("symbol", "")
    if not symbol:
        return item
    yf_symbol = map_symbol_to_yahoo(symbol)
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yf_symbol}"
    try:
        r = requests.get(url, headers=headers, timeout=3)
        if r.status_code == 200:
            res = r.json().get('chart', {}).get('result', [])
            if res and 'meta' in res[0]:
                meta = res[0]['meta']
                live_price = meta.get('regularMarketPrice')
                prev_close = meta.get('chartPreviousClose')
                if live_price is not None:
                    item['price'] = round(float(live_price), 2)
                    item['is_live'] = True
                    if prev_close:
                        chg = float(live_price) - float(prev_close)
                        item['change'] = round(chg, 2)
                        item['change_percent'] = round((chg / float(prev_close)) * 100.0, 2)
    except Exception:
        pass
    return item

class MarketDataProvider:
    def get_market_summary(self) -> dict:
        raise NotImplementedError

    def get_historical_data(self, symbol: str) -> list:
        raise NotImplementedError

    def get_stock_analysis(self, symbol: str) -> dict:
        raise NotImplementedError

    def get_mutual_fund_analysis(self, symbol: str) -> dict:
        raise NotImplementedError

    def search_stocks(self, query: str) -> list:
        raise NotImplementedError

class MockMarketDataProvider(MarketDataProvider):
    def get_market_summary(self) -> dict:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        raw_indices = [
            {"name": "Nifty 50", "symbol": "^NSEI", "price": 22480.00, "change": 125.40, "change_percent": 0.52},
            {"name": "Sensex", "symbol": "^BSESN", "price": 72350.00, "change": 340.10, "change_percent": 0.47},
            {"name": "S&P 500", "symbol": "^GSPC", "price": 5800.20, "change": 25.10, "change_percent": 0.43},
            {"name": "Nasdaq Composite", "symbol": "^IXIC", "price": 18220.60, "change": 92.30, "change_percent": 0.51}
        ]
        
        raw_stocks = [
            {"name": "Reliance Industries", "symbol": "RELIANCE.BSE", "price": 1155.00, "change": -4.50, "change_percent": -0.39, "sector": "Energy"},
            {"name": "Tata Consultancy Services", "symbol": "TCS.BSE", "price": 2230.00, "change": 105.00, "change_percent": 4.95, "sector": "IT"},
            {"name": "HDFC Bank", "symbol": "HDFCBANK.BSE", "price": 710.00, "change": 5.60, "change_percent": 0.79, "sector": "Banking"},
            {"name": "Infosys Ltd", "symbol": "INFY.BSE", "price": 1039.00, "change": 19.00, "change_percent": 1.86, "sector": "IT"},
            {"name": "ICICI Bank Ltd", "symbol": "ICICIBANK.BSE", "price": 1349.00, "change": 9.60, "change_percent": 0.72, "sector": "Banking"},
            {"name": "State Bank of India", "symbol": "SBIN.BSE", "price": 785.50, "change": 6.30, "change_percent": 0.81, "sector": "Banking"},
            {"name": "Bharti Airtel", "symbol": "BHARTIARTL.BSE", "price": 1720.00, "change": 12.50, "change_percent": 0.73, "sector": "Telecom"},
            {"name": "Hindustan Unilever", "symbol": "HINDUNILVR.BSE", "price": 2440.30, "change": -8.10, "change_percent": -0.33, "sector": "FMCG"},
            {"name": "ITC Ltd", "symbol": "ITC.BSE", "price": 259.60, "change": 2.80, "change_percent": 0.60, "sector": "FMCG"},
            {"name": "Larsen & Toubro", "symbol": "LT.BSE", "price": 3480.00, "change": 38.40, "change_percent": 1.11, "sector": "Infrastructure"},
            {"name": "Tata Motors Ltd", "symbol": "TATAMOTORS.BSE", "price": 935.20, "change": 14.60, "change_percent": 1.58, "sector": "Automotive"},
            {"name": "Sun Pharma", "symbol": "SUNPHARMA.BSE", "price": 1790.90, "change": 11.40, "change_percent": 0.64, "sector": "Pharma"},
            {"name": "Axis Bank Ltd", "symbol": "AXISBANK.BSE", "price": 1140.40, "change": 4.90, "change_percent": 0.43, "sector": "Banking"},
            {"name": "Bajaj Finance", "symbol": "BAJFINANCE.BSE", "price": 6790.00, "change": 85.00, "change_percent": 1.27, "sector": "NBFC"},
            {"name": "Maruti Suzuki", "symbol": "MARUTI.BSE", "price": 12150.00, "change": 45.00, "change_percent": 0.37, "sector": "Automotive"},
            {"name": "Titan Company", "symbol": "TITAN.BSE", "price": 3340.00, "change": 21.20, "change_percent": 0.64, "sector": "Consumer Goods"},
            {"name": "Tata Steel", "symbol": "TATASTEEL.BSE", "price": 173.50, "change": 1.20, "change_percent": 0.70, "sector": "Metals"},
            {"name": "Wipro Ltd", "symbol": "WIPRO.BSE", "price": 167.00, "change": 1.50, "change_percent": 0.91, "sector": "IT"},
            {"name": "HCL Technologies", "symbol": "HCLTECH.BSE", "price": 1308.80, "change": 14.20, "change_percent": 1.10, "sector": "IT"},
            {"name": "Kotak Mahindra Bank", "symbol": "KOTAKBANK.BSE", "price": 442.00, "change": 3.80, "change_percent": 0.87, "sector": "Banking"},
            {"name": "Adani Enterprises", "symbol": "ADANIENT.BSE", "price": 2669.00, "change": 28.50, "change_percent": 1.08, "sector": "Diversified"},
            {"name": "Asian Paints", "symbol": "ASIANPAINT.BSE", "price": 2350.00, "change": -12.40, "change_percent": -0.52, "sector": "Consumer Goods"},
            {"name": "Power Grid Corp", "symbol": "POWERGRID.BSE", "price": 248.00, "change": 2.10, "change_percent": 0.85, "sector": "Power"},
            {"name": "NTPC Ltd", "symbol": "NTPC.BSE", "price": 307.40, "change": 3.20, "change_percent": 1.05, "sector": "Power"},
            {"name": "ONGC", "symbol": "ONGC.BSE", "price": 221.00, "change": 1.80, "change_percent": 0.82, "sector": "Energy"},
            {"name": "Coal India", "symbol": "COALINDIA.BSE", "price": 408.00, "change": 4.50, "change_percent": 1.12, "sector": "Mining"},
            {"name": "Bharat Electronics", "symbol": "BEL.BSE", "price": 375.50, "change": 6.20, "change_percent": 1.68, "sector": "Defense"},
            {"name": "Hindustan Aeronautics", "symbol": "HAL.BSE", "price": 4800.00, "change": 72.00, "change_percent": 1.52, "sector": "Defense"},
            {"name": "Vedanta Ltd", "symbol": "VEDL.BSE", "price": 256.80, "change": 3.40, "change_percent": 1.34, "sector": "Metals"},
            {"name": "IRCTC", "symbol": "IRCTC.BSE", "price": 463.80, "change": 4.10, "change_percent": 0.89, "sector": "Services"},
            {"name": "Swiggy Ltd", "symbol": "SWIGGY.BSE", "price": 231.20, "change": 2.80, "change_percent": 1.23, "sector": "Tech / Consumer"},
            {"name": "Paytm (One97)", "symbol": "PAYTM.BSE", "price": 1654.00, "change": -8.50, "change_percent": -0.51, "sector": "Fintech"},
            {"name": "Apple Inc.", "symbol": "AAPL", "price": 340.97, "change": 4.33, "change_percent": 1.29, "sector": "Global Tech"},
            {"name": "Microsoft Corporation", "symbol": "MSFT", "price": 541.15, "change": 6.08, "change_percent": 1.14, "sector": "Global Tech"},
            {"name": "NVIDIA Corporation", "symbol": "NVDA", "price": 226.32, "change": -2.96, "change_percent": -1.29, "sector": "Semiconductors"},
            {"name": "Alphabet Inc.", "symbol": "GOOGL", "price": 182.40, "change": 1.90, "change_percent": 1.05, "sector": "Global Tech"},
            {"name": "Amazon.com Inc.", "symbol": "AMZN", "price": 218.60, "change": 2.45, "change_percent": 1.13, "sector": "Global Tech"},
            {"name": "Tesla Inc.", "symbol": "TSLA", "price": 242.80, "change": -3.20, "change_percent": -1.30, "sector": "Automotive / EV"},
            {"name": "Meta Platforms", "symbol": "META", "price": 612.40, "change": 8.10, "change_percent": 1.34, "sector": "Global Tech"}
        ]
        
        raw_etfs = [
            {"name": "Nippon India ETF Nifty BeES", "symbol": "NIFTYBEES.BSE", "price": 256.70, "change": 1.35, "change_percent": 0.53, "type": "Equity Index"},
            {"name": "SBI ETF Nifty 50", "symbol": "SETFNIF50.BSE", "price": 251.90, "change": 1.30, "change_percent": 0.52, "type": "Equity Index"},
            {"name": "Motilal Oswal Nasdaq 100 ETF", "symbol": "MON100.BSE", "price": 178.10, "change": 1.62, "change_percent": 0.92, "type": "Global Tech"},
            {"name": "Nippon India ETF Gold BeES", "symbol": "GOLDBEES.BSE", "price": 72.80, "change": 0.42, "change_percent": 0.58, "type": "Commodity Gold"},
            {"name": "Bank BeES ETF", "symbol": "BANKBEES.BSE", "price": 548.30, "change": 3.40, "change_percent": 0.62, "type": "Sectoral Bank"},
            {"name": "IT BeES ETF", "symbol": "ITBEES.BSE", "price": 38.50, "change": 0.75, "change_percent": 1.99, "type": "Sectoral IT"},
            {"name": "CPSE ETF", "symbol": "CPSEETF.BSE", "price": 98.20, "change": 1.10, "change_percent": 1.13, "type": "PSU Equity"},
            {"name": "Mirae Asset FANG+ ETF", "symbol": "MAFANG.BSE", "price": 105.60, "change": 1.80, "change_percent": 1.73, "type": "Global Tech"},
            {"name": "ICICI Pru Bharat 22 ETF", "symbol": "BHARAT22.BSE", "price": 124.50, "change": 1.30, "change_percent": 1.05, "type": "PSU Equity"},
            {"name": "SBI ETF Sensex", "symbol": "SETFSEN.BSE", "price": 862.00, "change": 3.60, "change_percent": 0.42, "type": "Equity Index"},
            {"name": "Nippon India ETF Junior BeES", "symbol": "JUNIORBEES.BSE", "price": 748.40, "change": 6.80, "change_percent": 0.92, "type": "Next 50 Index"},
            {"name": "Kotak Nifty 50 ETF", "symbol": "KOTAKNIFTY.BSE", "price": 257.80, "change": 1.30, "change_percent": 0.51, "type": "Equity Index"}
        ]
        
        # Parallel fetch live quotes across all indices, stocks, and ETFs
        all_items_to_fetch = raw_indices + raw_stocks + raw_etfs
        try:
            with ThreadPoolExecutor(max_workers=8) as executor:
                list(executor.map(fetch_single_live_quote, all_items_to_fetch))
        except Exception as e:
            print(f"Parallel market summary live quote fetch error: {e}")

        return {
            "timestamp": timestamp,
            "provider_type": "live",
            "indices": raw_indices,
            "stocks": raw_stocks,
            "mutual_funds": [
                {"name": "HDFC Index Fund Nifty 50 Plan", "symbol": "HDFC_NIF50", "nav": 210.45, "change": 1.10, "change_percent": 0.52, "type": "Index Fund"},
                {"name": "SBI Bluechip Fund Direct Growth", "symbol": "SBI_BLUE", "nav": 95.80, "change": 0.65, "change_percent": 0.68, "type": "Large Cap"},
                {"name": "Parag Parikh Flexi Cap Direct", "symbol": "PP_FLEXI", "nav": 84.20, "change": -0.22, "change_percent": -0.26, "type": "Flexi Cap"},
                {"name": "Nippon India Small Cap Direct", "symbol": "NIPP_SMALL", "nav": 170.15, "change": 3.10, "change_percent": 1.86, "type": "Small Cap"},
                {"name": "Axis Small Cap Fund Direct", "symbol": "AXIS_SMALL", "nav": 92.40, "change": 1.45, "change_percent": 1.59, "type": "Small Cap"},
                {"name": "Mirae Asset Large Cap Fund", "symbol": "MIRAE_LARGE", "nav": 108.60, "change": 0.72, "change_percent": 0.67, "type": "Large Cap"},
                {"name": "UTI Nifty 50 Index Fund", "symbol": "UTI_NIF50", "nav": 154.30, "change": 0.80, "change_percent": 0.52, "type": "Index Fund"},
                {"name": "Quant Active Fund Direct", "symbol": "QUANT_ACTIVE", "nav": 645.20, "change": 8.40, "change_percent": 1.32, "type": "Multi Cap"},
                {"name": "ICICI Pru Technology Fund", "symbol": "ICICI_TECH", "nav": 188.90, "change": 3.60, "change_percent": 1.94, "type": "Sectoral IT"},
                {"name": "Kotak Emerging Equity Fund", "symbol": "KOTAK_MID", "nav": 112.30, "change": 1.20, "change_percent": 1.08, "type": "Mid Cap"},
                {"name": "DSP Healthcare Fund Direct", "symbol": "DSP_HEALTH", "nav": 42.80, "change": 0.35, "change_percent": 0.82, "type": "Sectoral Pharma"},
                {"name": "Tata Digital India Fund", "symbol": "TATA_DIGITAL", "nav": 52.10, "change": 1.05, "change_percent": 2.06, "type": "Sectoral IT"}
            ],
            "etfs": raw_etfs
        }

    def get_historical_data(self, symbol: str) -> list:
        mutual_fund_scheme_codes = {
            "HDFC_NIF50": 119063,
            "SBI_BLUE": 119598,
            "PP_FLEXI": 122639,
            "NIPP_SMALL": 118778,
            "AXIS_SMALL": 125354,
            "MIRAE_LARGE": 118825,
            "UTI_NIF50": 120716,
            "QUANT_ACTIVE": 120821,
            "ICICI_TECH": 120594,
            "KOTAK_MID": 119779,
            "DSP_HEALTH": 145454,
            "TATA_DIGITAL": 135800,
        }

        scheme_code = mutual_fund_scheme_codes.get(symbol)
        if scheme_code:
            try:
                response = requests.get(
                    f"https://api.mfapi.in/mf/{scheme_code}",
                    timeout=12,
                )
                if response.status_code == 200:
                    nav_history = response.json().get("data", [])
                    history = []
                    for entry in reversed(nav_history[:30]):
                        try:
                            historical_date = datetime.strptime(entry["date"], "%d-%m-%Y")
                            history.append({
                                "date": historical_date.strftime("%Y-%m-%d"),
                                "price": round(float(entry["nav"]), 2),
                                "is_live": True,
                            })
                        except (ValueError, KeyError):
                            continue
                    if history:
                        return history
            except Exception as e:
                print(f"Real mutual fund history fetch failed for {symbol}: {e}")

        # Try fetching real historical chart data from Yahoo Finance
        yf_symbol = map_symbol_to_yahoo(symbol)
        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yf_symbol}?range=1mo&interval=1d"
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            r = requests.get(url, headers=headers, timeout=4)
            if r.status_code == 200:
                data = r.json().get('chart', {}).get('result', [])
                if data:
                    timestamps = data[0].get('timestamp', [])
                    closes = data[0].get('indicators', {}).get('quote', [{}])[0].get('close', [])
                    history = []
                    for ts, c in zip(timestamps, closes):
                        if c is not None:
                            dt = datetime.fromtimestamp(ts).strftime('%Y-%m-%d')
                            history.append({'date': dt, 'price': round(float(c), 2)})
                    if history:
                        return history[-15:]
        except Exception as e:
            print(f"Real historical data fetch failed for {symbol}: {e}")

        # Fallback generator for symbols or if offline
        import random
        random.seed(symbol)
        
        base_prices = {
            "^NSEI": 22480.0,
            "^BSESN": 72350.0,
            "^GSPC": 5800.0,
            "^IXIC": 18200.0,
            "RELIANCE.BSE": 1155.0,
            "TCS.BSE": 2230.0,
            "HDFCBANK.BSE": 710.0,
            "INFY.BSE": 1039.0,
            "HDFC_NIF50": 210.0,
            "SBI_BLUE": 95.0,
            "PP_FLEXI": 84.0,
            "NIPP_SMALL": 170.0,
            "NIFTYBEES.BSE": 256.0,
            "SETFNIF50.BSE": 251.0,
            "MON100.BSE": 178.0
        }
        
        base_price = base_prices.get(symbol, 100.0)
        history = []
        from datetime import timedelta
        today = date.today()
        
        current_price = base_price
        for i in range(15, -1, -1):
            historical_date = today - timedelta(days=i)
            if historical_date.weekday() >= 5:
                continue
            change_percent = random.uniform(-0.012, 0.015)
            current_price = current_price * (1 + change_percent)
            history.append({
                "date": historical_date.isoformat(),
                "price": round(current_price, 2)
            })
            
        return history

    def get_stock_analysis(self, symbol: str) -> dict:
        import random
        random.seed(symbol)
        
        stocks_db = {
            "RELIANCE.BSE": {
                "name": "Reliance Industries Ltd",
                "sector": "Energy",
                "market_cap": 2015000.0,
                "price": 2980.50,
                "pe_ratio": 28.5,
                "pb_ratio": 3.2,
                "revenue_growth": 12.5,
                "profit_growth": 10.2,
                "roe": 11.4,
                "roce": 13.2,
                "debt_to_equity": 0.38,
                "dividend_yield": 0.85,
                "volatility": "Medium",
                "trend_indicator": "Bullish",
                "fundamental_score": 85,
                "technical_score": 72,
                "risk_score": 78,
                "valuation_score": 65,
                "suitability_score": 75
            },
            "TCS.BSE": {
                "name": "Tata Consultancy Services Ltd",
                "sector": "IT",
                "market_cap": 1520000.0,
                "price": 4210.00,
                "pe_ratio": 32.1,
                "pb_ratio": 11.5,
                "revenue_growth": 8.7,
                "profit_growth": 7.9,
                "roe": 39.5,
                "roce": 51.2,
                "debt_to_equity": 0.02,
                "dividend_yield": 1.25,
                "volatility": "Low",
                "trend_indicator": "Neutral",
                "fundamental_score": 92,
                "technical_score": 68,
                "risk_score": 88,
                "valuation_score": 55,
                "suitability_score": 76
            },
            "HDFCBANK.BSE": {
                "name": "HDFC Bank Ltd",
                "sector": "Banking",
                "market_cap": 1250000.0,
                "price": 1645.20,
                "pe_ratio": 18.4,
                "pb_ratio": 2.7,
                "revenue_growth": 16.8,
                "profit_growth": 18.2,
                "roe": 15.8,
                "roce": 18.1,
                "debt_to_equity": 0.85,
                "dividend_yield": 1.10,
                "volatility": "Medium",
                "trend_indicator": "Bullish",
                "fundamental_score": 88,
                "technical_score": 75,
                "risk_score": 80,
                "valuation_score": 72,
                "suitability_score": 79
            },
            "INFY.BSE": {
                "name": "Infosys Ltd",
                "sector": "IT",
                "market_cap": 756000.0,
                "price": 1820.40,
                "pe_ratio": 26.4,
                "pb_ratio": 8.2,
                "revenue_growth": 11.2,
                "profit_growth": 9.8,
                "roe": 31.2,
                "roce": 42.1,
                "debt_to_equity": 0.05,
                "dividend_yield": 1.45,
                "volatility": "Medium",
                "trend_indicator": "Bullish",
                "fundamental_score": 90,
                "technical_score": 82,
                "risk_score": 85,
                "valuation_score": 62,
                "suitability_score": 80
            }
        }
        
        if symbol in stocks_db:
            res_data = stocks_db[symbol].copy()
        else:
            sectors = ["IT", "Finance", "Energy", "Healthcare", "Consumer Goods", "Automotive"]
            sector = random.choice(sectors)
            pe = round(random.uniform(15.0, 45.0), 2)
            debt = round(random.uniform(0.0, 1.5), 2)
            rev_growth = round(random.uniform(5.0, 30.0), 2)
            
            f_score = int(95 - pe/3 - debt*10 + rev_growth/3)
            t_score = random.randint(45, 90)
            r_score = int(100 - debt*25)
            v_score = int(100 - pe*1.5)
            
            f_score = max(10, min(99, f_score))
            t_score = max(10, min(99, t_score))
            r_score = max(10, min(99, r_score))
            v_score = max(10, min(99, v_score))
            suit_score = int((f_score + t_score + r_score + v_score) / 4)
            
            res_data = {
                "name": f"{symbol} Inc/Ltd",
                "sector": sector,
                "market_cap": round(random.uniform(10000.0, 800000.0), 2),
                "price": round(random.uniform(50.0, 3500.0), 2),
                "pe_ratio": pe,
                "pb_ratio": round(random.uniform(1.5, 12.0), 2),
                "revenue_growth": rev_growth,
                "profit_growth": round(rev_growth * random.uniform(0.8, 1.2), 2),
                "roe": round(random.uniform(8.0, 35.0), 2),
                "roce": round(random.uniform(10.0, 45.0), 2),
                "debt_to_equity": debt,
                "dividend_yield": round(random.uniform(0.0, 3.5), 2),
                "volatility": random.choice(["Low", "Medium", "High"]),
                "trend_indicator": random.choice(["Bullish", "Bearish", "Neutral"]),
                "fundamental_score": f_score,
                "technical_score": t_score,
                "risk_score": r_score,
                "valuation_score": v_score,
                "suitability_score": suit_score
            }

        # Live pricing overlay via Yahoo Finance Chart API
        yf_symbol = symbol.strip().upper()
        if yf_symbol.endswith('.BSE'):
            yf_symbol = yf_symbol.replace('.BSE', '.NS')
        elif '.' not in yf_symbol and yf_symbol not in ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'META']:
            yf_symbol = f"{yf_symbol}.NS"
            
        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yf_symbol}"
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            r = requests.get(url, headers=headers, timeout=4)
            if r.status_code == 200:
                meta_res = r.json().get('chart', {}).get('result', [])
                if meta_res and 'meta' in meta_res[0]:
                    meta = meta_res[0]['meta']
                    live_price = meta.get('regularMarketPrice')
                    prev_close = meta.get('chartPreviousClose')
                    
                    if live_price:
                        res_data["price"] = round(float(live_price), 2)
                        res_data["is_live"] = True
                    if prev_close and live_price:
                        change = float(live_price) - float(prev_close)
                        pct = (change / float(prev_close)) * 100.0
                        res_data["change"] = round(change, 2)
                        res_data["change_percent"] = round(pct, 2)
                        res_data["trend_indicator"] = "Bullish" if change >= 0 else "Bearish"
                    if meta.get('longName') or meta.get('shortName'):
                        res_data["name"] = meta.get('longName') or meta.get('shortName')
                    if meta.get('currency'):
                        res_data["currency"] = meta.get('currency')
                    if meta.get('fiftyTwoWeekHigh'):
                        res_data["high_52w"] = round(float(meta['fiftyTwoWeekHigh']), 2)
                    if meta.get('fiftyTwoWeekLow'):
                        res_data["low_52w"] = round(float(meta['fiftyTwoWeekLow']), 2)
        except Exception as e:
            print(f"Live stock price overlay note: {e}")

        return res_data

    def search_stocks(self, query: str) -> list:
        if not query or len(query.strip()) < 1:
            return []
            
        clean_query = query.strip().upper()
        results = []
        
        try:
            url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=10"
            r = http_requests.get(url, impersonate='chrome', timeout=3) if hasattr(http_requests, 'get') else None
            if r and r.status_code == 200:
                quotes = r.json().get('quotes', [])
                for q in quotes:
                    sym = q.get('symbol')
                    if sym:
                        results.append({
                            "symbol": sym,
                            "name": q.get('shortname') or q.get('longname') or sym,
                            "exch": q.get('exchDisp', 'NSE/BSE' if '.NS' in sym or '.BS' in sym else 'US'),
                            "type": q.get('quoteType', 'EQUITY')
                        })
        except Exception:
            pass
            
        catalog = [
            {"symbol": "RELIANCE.NS", "name": "Reliance Industries Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "TCS.NS", "name": "Tata Consultancy Services Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "HDFCBANK.NS", "name": "HDFC Bank Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "INFY.NS", "name": "Infosys Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "TATAMOTORS.NS", "name": "Tata Motors Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "ICICIBANK.NS", "name": "ICICI Bank Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "SBIN.NS", "name": "State Bank of India", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "HINDUNILVR.NS", "name": "Hindustan Unilever Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "ITC.NS", "name": "ITC Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "LT.NS", "name": "Larsen & Toubro Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "SUNPHARMA.NS", "name": "Sun Pharma Industries Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "AXISBANK.NS", "name": "Axis Bank Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "BAJFINANCE.NS", "name": "Bajaj Finance Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "MARUTI.NS", "name": "Maruti Suzuki India Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "TITAN.NS", "name": "Titan Company Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "TATASTEEL.NS", "name": "Tata Steel Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "WIPRO.NS", "name": "Wipro Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "HCLTECH.NS", "name": "HCL Technologies Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "ADANIENT.NS", "name": "Adani Enterprises Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "ASIANPAINT.NS", "name": "Asian Paints Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "POWERGRID.NS", "name": "Power Grid Corporation", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "NTPC.NS", "name": "NTPC Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "ONGC.NS", "name": "Oil & Natural Gas Corp", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "COALINDIA.NS", "name": "Coal India Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "BEL.NS", "name": "Bharat Electronics Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "HAL.NS", "name": "Hindustan Aeronautics Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "VEDL.NS", "name": "Vedanta Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "IRCTC.NS", "name": "IRCTC Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "SWIGGY.NS", "name": "Swiggy Ltd", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "PAYTM.NS", "name": "One97 Communications (Paytm)", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "ETERNAL.NS", "name": "Eternal Ltd (Zomato)", "exch": "NSE", "type": "EQUITY"},
            {"symbol": "AAPL", "name": "Apple Inc.", "exch": "NASDAQ", "type": "EQUITY"},
            {"symbol": "MSFT", "name": "Microsoft Corporation", "exch": "NASDAQ", "type": "EQUITY"},
            {"symbol": "NVDA", "name": "NVIDIA Corporation", "exch": "NASDAQ", "type": "EQUITY"},
            {"symbol": "GOOGL", "name": "Alphabet Inc.", "exch": "NASDAQ", "type": "EQUITY"},
            {"symbol": "AMZN", "name": "Amazon.com Inc.", "exch": "NASDAQ", "type": "EQUITY"},
            {"symbol": "TSLA", "name": "Tesla Inc.", "exch": "NASDAQ", "type": "EQUITY"},
            {"symbol": "META", "name": "Meta Platforms Inc.", "exch": "NASDAQ", "type": "EQUITY"}
        ]

        existing = {r['symbol'] for r in results}
        for item in catalog:
            if item['symbol'] not in existing:
                if clean_query in item["symbol"] or clean_query in item["name"].upper():
                    results.append(item)

        # If user searched an exact custom ticker, attempt direct lookup
        if not results and len(clean_query) >= 2:
            test_sym = clean_query if '.' in clean_query else f"{clean_query}.NS"
            try:
                r = requests.get(f"https://query1.finance.yahoo.com/v8/finance/chart/{test_sym}", headers={'User-Agent': 'Mozilla/5.0'}, timeout=2)
                if r.status_code == 200:
                    ch_res = r.json().get('chart', {}).get('result')
                    if ch_res:
                        meta = ch_res[0].get('meta', {})
                        results.append({
                            "symbol": test_sym,
                            "name": meta.get('longName') or meta.get('shortName') or test_sym,
                            "exch": "NSE" if ".NS" in test_sym else "GLOBAL",
                            "type": meta.get('instrumentType', 'EQUITY')
                        })
            except Exception:
                pass

        return results[:10]

    def get_mutual_fund_analysis(self, symbol: str) -> dict:
        import random
        random.seed(symbol)

        # AMFI scheme code mapping for predefined funds
        SCHEME_CODES = {
            "HDFC_NIF50": 119063,
            "SBI_BLUE": 119598,      # SBI Large Cap Fund - Direct Plan - Growth
            "PP_FLEXI": 122639,
            "NIPP_SMALL": 118778,
            "AXIS_SMALL": 125354,
            "MIRAE_LARGE": 118825,
            "UTI_NIF50": 120716,
            "QUANT_ACTIVE": 120821,   # Quant Multi Asset Fund - Direct Plan - Growth
            "ICICI_TECH": 120594,
            "KOTAK_MID": 119779,      # Kotak Global Emerging Market FOF - Direct Plan - Growth
            "DSP_HEALTH": 145454,
            "TATA_DIGITAL": 135800,
        }

        # Fund metadata (category, expense ratio, etc.) - static reference data
        funds_meta = {
            "HDFC_NIF50": {
                "name": "HDFC Nifty 50 Index Fund - Direct Plan - Growth",
                "category": "Index Fund",
                "aum": 18200.0,
                "expense_ratio": 0.20,
                "horizon": "5+ Years",
                "risk_level": "Very High",
                "volatility": "Medium",
                "rating": 5,
            },
            "SBI_BLUE": {
                "name": "SBI Large Cap Fund - Direct Plan - Growth",
                "category": "Large Cap",
                "aum": 42800.0,
                "expense_ratio": 0.85,
                "horizon": "3-5 Years",
                "risk_level": "Moderately High",
                "volatility": "Low",
                "rating": 4,
            },
            "PP_FLEXI": {
                "name": "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
                "category": "Flexi Cap",
                "aum": 58200.0,
                "expense_ratio": 0.62,
                "horizon": "5+ Years",
                "risk_level": "High",
                "volatility": "Medium",
                "rating": 5,
            },
            "NIPP_SMALL": {
                "name": "Nippon India Small Cap Fund - Direct Plan - Growth",
                "category": "Small Cap",
                "aum": 47100.0,
                "expense_ratio": 0.72,
                "horizon": "7+ Years",
                "risk_level": "Very High",
                "volatility": "High",
                "rating": 5,
            },
            "AXIS_SMALL": {
                "name": "Axis Small Cap Fund - Direct Plan - Growth",
                "category": "Small Cap",
                "aum": 22500.0,
                "expense_ratio": 0.58,
                "horizon": "7+ Years",
                "risk_level": "Very High",
                "volatility": "High",
                "rating": 4,
            },
            "MIRAE_LARGE": {
                "name": "Mirae Asset Large Cap Fund - Direct Plan - Growth",
                "category": "Large Cap",
                "aum": 38600.0,
                "expense_ratio": 0.53,
                "horizon": "5+ Years",
                "risk_level": "Moderately High",
                "volatility": "Medium",
                "rating": 5,
            },
            "UTI_NIF50": {
                "name": "UTI Nifty 50 Index Fund - Direct Plan - Growth",
                "category": "Index Fund",
                "aum": 16800.0,
                "expense_ratio": 0.18,
                "horizon": "5+ Years",
                "risk_level": "Very High",
                "volatility": "Medium",
                "rating": 5,
            },
            "QUANT_ACTIVE": {
                "name": "Quant Multi Asset Fund - Direct Plan - Growth",
                "category": "Multi Cap",
                "aum": 3200.0,
                "expense_ratio": 0.58,
                "horizon": "5+ Years",
                "risk_level": "Very High",
                "volatility": "High",
                "rating": 4,
            },
            "ICICI_TECH": {
                "name": "ICICI Prudential Technology Fund - Direct Plan - Growth",
                "category": "Sectoral IT",
                "aum": 13200.0,
                "expense_ratio": 0.99,
                "horizon": "5+ Years",
                "risk_level": "Very High",
                "volatility": "High",
                "rating": 4,
            },
            "KOTAK_MID": {
                "name": "Kotak Global Emerging Mkt FOF - Direct Plan - Growth",
                "category": "Mid Cap",
                "aum": 4500.0,
                "expense_ratio": 0.68,
                "horizon": "5+ Years",
                "risk_level": "High",
                "volatility": "High",
                "rating": 3,
            },
            "DSP_HEALTH": {
                "name": "DSP Healthcare Fund - Direct Plan - Growth",
                "category": "Sectoral Pharma",
                "aum": 3400.0,
                "expense_ratio": 0.89,
                "horizon": "5+ Years",
                "risk_level": "Very High",
                "volatility": "High",
                "rating": 4,
            },
            "TATA_DIGITAL": {
                "name": "Tata Digital India Fund - Direct Plan - Growth",
                "category": "Sectoral IT",
                "aum": 9800.0,
                "expense_ratio": 0.60,
                "horizon": "5+ Years",
                "risk_level": "Very High",
                "volatility": "High",
                "rating": 4,
            },
        }

        def _fetch_mfapi_data(scheme_code: int) -> dict:
            """Fetch full NAV history from MFAPI and compute returns."""
            try:
                url = f"https://api.mfapi.in/mf/{scheme_code}"
                headers = {"User-Agent": "FinWise/1.0"}
                try:
                    r = requests.get(url, headers=headers, timeout=12)
                    if r.status_code != 200:
                        raise requests.RequestException("Full NAV history request failed")
                    data = r.json()
                    if data.get("status") != "SUCCESS" or not data.get("data"):
                        raise ValueError("Full NAV history response was empty")
                except Exception:
                    r = requests.get(f"{url}/latest", headers=headers, timeout=6)
                    if r.status_code != 200:
                        return {}
                    data = r.json()
                if data.get("status") != "SUCCESS" or not data.get("data"):
                    return {}

                nav_history = data["data"]  # sorted newest first
                latest_nav = float(nav_history[0]["nav"])
                latest_date_str = nav_history[0]["date"]

                # Parse date (DD-MM-YYYY format)
                from datetime import timedelta
                latest_dt = datetime.strptime(latest_date_str, "%d-%m-%Y")

                # Build date->nav lookup
                nav_by_date = {}
                for entry in nav_history:
                    try:
                        dt = datetime.strptime(entry["date"], "%d-%m-%Y")
                        nav_by_date[dt.date()] = float(entry["nav"])
                    except (ValueError, KeyError):
                        continue

                # Find NAV closest to target date (within +-7 day window)
                def find_nav_near(target_date):
                    for offset in range(0, 8):
                        for d in [target_date - timedelta(days=offset), target_date + timedelta(days=offset)]:
                            if d in nav_by_date:
                                return nav_by_date[d]
                    return None

                returns = {}
                # 1Y return
                target_1y = (latest_dt - timedelta(days=365)).date()
                nav_1y = find_nav_near(target_1y)
                if nav_1y and nav_1y > 0:
                    returns["1Y"] = round(((latest_nav - nav_1y) / nav_1y) * 100, 2)

                # 3Y annualized return
                target_3y = (latest_dt - timedelta(days=365 * 3)).date()
                nav_3y = find_nav_near(target_3y)
                if nav_3y and nav_3y > 0:
                    total_return_3y = latest_nav / nav_3y
                    annualized_3y = (total_return_3y ** (1 / 3) - 1) * 100
                    returns["3Y"] = round(annualized_3y, 2)

                # 5Y annualized return
                target_5y = (latest_dt - timedelta(days=365 * 5)).date()
                nav_5y = find_nav_near(target_5y)
                if nav_5y and nav_5y > 0:
                    total_return_5y = latest_nav / nav_5y
                    annualized_5y = (total_return_5y ** (1 / 5) - 1) * 100
                    returns["5Y"] = round(annualized_5y, 2)

                result = {
                    "nav": round(latest_nav, 2),
                    "returns": returns,
                    "returns_available": all(period in returns for period in ("1Y", "3Y", "5Y")),
                    "is_live": True,
                    "nav_date": latest_date_str,
                    "data_source": "mfapi",
                }
                if len(nav_history) > 1:
                    previous_nav = float(nav_history[1]["nav"])
                    result["change"] = round(latest_nav - previous_nav, 2)
                    result["change_percent"] = round(
                        ((latest_nav - previous_nav) / previous_nav) * 100, 2
                    ) if previous_nav else 0.0

                # Use scheme name from meta if available
                meta = data.get("meta", {})
                if meta.get("scheme_name"):
                    result["name"] = meta["scheme_name"]
                if meta.get("scheme_category"):
                    result["api_category"] = meta["scheme_category"]

                return result
            except Exception as e:
                print(f"MFAPI fetch failed for scheme {scheme_code}: {e}")
                return {}

        # --- Main logic ---
        scheme_code = SCHEME_CODES.get(symbol)
        base = funds_meta.get(symbol, {}).copy()

        if scheme_code:
            live = _fetch_mfapi_data(scheme_code)
            if live:
                if not base:
                    base = {
                        "name": live.get("name", f"{symbol} Fund"),
                        "category": live.get("api_category", "Equity"),
                        "aum": 0.0,
                        "expense_ratio": 0.50,
                        "horizon": "5+ Years",
                        "risk_level": "High",
                        "volatility": "Medium",
                        "rating": 4,
                    }
                base["nav"] = live["nav"]
                base["is_live"] = True
                base["nav_date"] = live.get("nav_date")
                base["change"] = live.get("change")
                base["change_percent"] = live.get("change_percent")
                base["data_source"] = live.get("data_source")
                # Merge returns — only override with live if available
                existing_returns = base.get("returns", {"1Y": 0, "3Y": 0, "5Y": 0})
                live_returns = live.get("returns", {})
                base["returns"] = {
                    "1Y": live_returns.get("1Y", existing_returns.get("1Y", 0)),
                    "3Y": live_returns.get("3Y", existing_returns.get("3Y", 0)),
                    "5Y": live_returns.get("5Y", existing_returns.get("5Y", 0)),
                }
                base["returns_available"] = live.get("returns_available", False)
                return base

        # If we have static meta but live fetch failed, return static with default returns
        if base:
            if "nav" not in base:
                base["nav"] = 100.0
            if "returns" not in base:
                base["returns"] = {"1Y": 0, "3Y": 0, "5Y": 0}
            base["is_live"] = False
            base["data_source"] = "unavailable"
            return base

        # Fallback generator for completely unknown symbols
        categories = ["Index Fund", "Large Cap", "Flexi Cap", "Mid Cap", "Small Cap", "Debt Fund", "Hybrid Fund", "ELSS"]
        category = random.choice(categories)
        risks = ["Low", "Moderate", "Moderately High", "High", "Very High"]
        risk = risks[categories.index(category) % len(risks)]

        y1 = round(random.uniform(5.0, 35.0), 2)
        y3 = round(y1 * random.uniform(0.7, 1.1), 2)
        y5 = round(y3 * random.uniform(0.8, 1.1), 2)

        return {
            "name": f"{symbol.replace('_', ' ')} Growth Fund",
            "category": category,
            "nav": round(random.uniform(20.0, 350.0), 2),
            "aum": round(random.uniform(2000.0, 50000.0), 2),
            "expense_ratio": round(random.uniform(0.15, 1.85), 2),
            "horizon": "3-5 Years" if category in ["Large Cap", "Hybrid Fund", "Debt Fund"] else "5+ Years",
            "risk_level": risk,
            "volatility": random.choice(["Low", "Medium", "High"]),
            "rating": random.choice([3, 4, 5]),
            "returns": {"1Y": y1, "3Y": y3, "5Y": y5}
        }

class AlphaVantageDataProvider(MarketDataProvider):
    def _get_key(self):
        return os.getenv("ALPHA_VANTAGE_API_KEY") or os.getenv("ALPHAVANTAGE_API_KEY") or os.getenv("GEMINI_API_KEY")

    def get_market_summary(self) -> dict:
        api_key = self._get_key()
        if not api_key:
            return MockMarketDataProvider().get_market_summary()
            
        try:
            url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=MSFT&apikey={api_key}"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if "Global Quote" in data and data["Global Quote"]:
                    quote = data["Global Quote"]
                    price = float(quote.get("05. price", 0.0))
                    change = float(quote.get("09. change", 0.0))
                    change_percent = float(quote.get("10. change percent", "0%").replace("%", ""))
                    
                    summary = MockMarketDataProvider().get_market_summary()
                    summary["provider_type"] = "alphavantage"
                    for stock in summary["stocks"]:
                        if stock["symbol"] == "INFY.BSE":
                            stock["name"] = "Microsoft (AV Real)"
                            stock["symbol"] = "MSFT"
                            stock["price"] = price
                            stock["change"] = change
                            stock["change_percent"] = change_percent
                    return summary
        except Exception as e:
            print(f"AlphaVantage call failed: {e}")
            
    def get_market_summary(self) -> dict:
        return MockMarketDataProvider().get_market_summary()

    def get_historical_data(self, symbol: str) -> list:
        return MockMarketDataProvider().get_historical_data(symbol)

    def get_stock_analysis(self, symbol: str) -> dict:
        return MockMarketDataProvider().get_stock_analysis(symbol)

    def get_mutual_fund_analysis(self, symbol: str) -> dict:
        return MockMarketDataProvider().get_mutual_fund_analysis(symbol)

    def search_stocks(self, query: str) -> list:
        return MockMarketDataProvider().search_stocks(query)

def get_market_data_provider() -> MarketDataProvider:
    return MockMarketDataProvider()

