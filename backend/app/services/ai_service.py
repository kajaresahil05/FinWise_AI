import os
import re
import json
import requests
from app.models import AICorrection, UserProfile, Income, Expense, Budget, FinancialGoal
from datetime import date, datetime

class AIProvider:
    def categorize(self, text: str) -> dict:
        raise NotImplementedError
        
    def chat(self, prompt: str, history: list, context_str: str) -> str:
        raise NotImplementedError

    def parse_receipt(self, ocr_text: str) -> dict:
        raise NotImplementedError

    def parse_voice(self, text: str) -> dict:
        raise NotImplementedError

    def explain_recommendation(self, recommendation_data: dict) -> str:
        raise NotImplementedError

class HeuristicProvider(AIProvider):
    def categorize(self, text: str) -> dict:
        lower_text = text.lower()
        
        # 1. Try to extract amount
        amount = None
        amount_match = re.search(r'(?:[₹$]|rs\.?|usd|inr)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:rupees|rs\.?|usd|inr)?', lower_text)
        if amount_match:
            try:
                clean_num = amount_match.group(1).replace(',', '')
                amount = float(clean_num)
            except ValueError:
                pass
                
        if not amount:
            digits = re.findall(r'\b\d+(?:\.\d{1,2})?\b', lower_text)
            if digits:
                candidate_nums = []
                for d in digits:
                    val = float(d)
                    if val != 2025 and val != 2026 and val < 1000000:
                        candidate_nums.append(val)
                if candidate_nums:
                    amount = candidate_nums[0]
                    
        # 2. Match Category and Subcategory
        category = "Other"
        subcategory = "Uncategorized"
        merchant = "Unknown"
        
        rules = [
            (r'domino|pizza|burger|mcdonald|kfc|starbucks|cafe|restaurant|swiggy|zomato|dine|food|lunch|dinner|breakfast|eat|canteen', "Food", "Restaurant"),
            (r'grocery|groceries|supermarket|mart|walmart|target|spencer|bigbasket|blinkit|milk|egg|vegetable|fruit|store', "Groceries", "Supplies"),
            (r'uber|ola|cab|taxi|flight|train|bus|metro|irctc|travel|hotel|airbnb|vacation|trip', "Travel", "Transit"),
            (r'amazon|flipkart|myntra|zara|h&m|clothing|shoes|mall|shop|spent on shopping|bought|purchase', "Shopping", "Apparel"),
            (r'rent|landlord|flat rent|house rent', "Rent", "Housing"),
            (r'electricity|power|water|gas|utility|utilities|bill|broadband|wifi', "Bills", "Utilities"),
            (r'netflix|spotify|youtube premium|amazon prime|subscription|hotstar|icloud|drive storage', "Subscriptions", "Entertainment"),
            (r'hospital|doctor|pharmacy|medicine|meds|dentist|clinic|health|medical|drugstore', "Healthcare", "Medical"),
            (r'movie|theater|cinema|concert|ticket|game|pub|bar|club|party|entertainment', "Entertainment", "Leisure"),
            (r'tuition|course|book|udemy|coursera|college|school|fees|class|education', "Education", "Learning"),
            (r'petrol|diesel|fuel|gas station|toll|parking|garage|service', "Transportation", "Fuel"),
        ]
        
        for pattern, cat, sub in rules:
            if re.search(pattern, lower_text):
                category = cat
                subcategory = sub
                break
                
        # 3. Match Merchant
        merchants = [
            "Domino's", "McDonald's", "KFC", "Starbucks", "Swiggy", "Zomato",
            "Uber", "Ola", "Amazon", "Flipkart", "Netflix", "Spotify",
            "BigBasket", "Blinkit", "Myntra", "Walmart", "Target", "Zara", "H&M"
        ]
        
        for m in merchants:
            if m.lower() in lower_text:
                merchant = m
                break
                
        if merchant == "Unknown":
            match = re.search(r'\b(?:at|from|to|in)\s+([a-zA-Z\s\d\'\-]+)', text)
            if match:
                cand = match.group(1).strip()
                cand = re.split(r'\b(?:for|on|with|today|yesterday|this|spent|bought|rs|rupees|\d)\b', cand, flags=re.IGNORECASE)[0].strip()
                if cand and len(cand) < 30:
                    merchant = cand

        return {
            "category": category,
            "subcategory": subcategory,
            "merchant": merchant,
            "amount": amount if amount is not None else 0.0
        }

    def chat(self, prompt: str, history: list, context_str: str) -> str:
        lower_prompt = prompt.lower()
        
        # Load user context if present (represented as JSON string for easy parsing in python helper)
        context = {}
        try:
            context = json.loads(context_str)
        except Exception:
            pass
            
        currency = context.get("currency", "₹")
        actual_income = context.get("actual_income_this_month", 0.0)
        actual_expense = context.get("actual_expense_this_month", 0.0)
        net_savings = context.get("net_savings_this_month", 0.0)
        profile_savings_target = context.get("profile_monthly_savings_target", 0.0)
        budgets = context.get("budgets", [])
        goals = context.get("goals", [])
        
        # 1. Topic: SIP
        if "sip" in lower_prompt:
            return (
                "**SIP (Systematic Investment Plan)** is a disciplined investment approach where you invest a fixed sum "
                "regularly (usually monthly) in a mutual fund scheme. \n\n"
                "**Why it's great:**\n"
                "- **Rupee Cost Averaging:** You buy more units when prices are low and fewer when they are high.\n"
                "- **Power of Compounding:** Regular small additions grow exponentially over long horizons.\n"
                "- **Disciplined Habits:** Autopays help you invest before you spend."
            )
            
        # 2. Topic: Index Fund
        if "index fund" in lower_prompt or "passive" in lower_prompt:
            return (
                "An **Index Fund** is a type of mutual fund or ETF that tracks a specific market index, such as Nifty 50 or S&P 500. \n\n"
                "**Key details:**\n"
                "- **Low Expenses:** Because they are passively managed (matching the index rather than trying to beat it), fund management fees are extremely low.\n"
                "- **Diversification:** You instantly get exposure to the top companies in that index.\n"
                "- **Performance:** Over long periods, index funds frequently outperform most actively managed funds."
            )
            
        # 3. Topic: Diversification
        if "diversification" in lower_prompt or "diversify" in lower_prompt:
            return (
                "**Diversification** is the practice of spreading your investments across various assets, industries, and categories "
                "to minimize overall risk. In simple terms: *'Don't put all your eggs in one basket.'*\n\n"
                "**How to diversify:**\n"
                "1. **Asset Allocation:** Balance equities (growth but volatile), debt (stable but slow), gold (inflation hedge), and cash.\n"
                "2. **Sector Exposure:** Avoid placing all money in tech or banking. Spread it out.\n"
                "3. **Geographic Diversification:** Hold international funds/equities to hedge country-specific risks."
            )
            
        # 4. Topic: Savings
        if "save" in lower_prompt or "savings" in lower_prompt:
            suggestion = ""
            exceeded_budgets = [b for b in budgets if b["spent"] > b["limit"]]
            if exceeded_budgets:
                suggestion = (
                    f"I see you have exceeded budgets in: "
                    f"{', '.join(b['category'] + ' (limit ' + currency + str(b['limit']) + ', spent ' + currency + str(b['spent']) + ')' for b in exceeded_budgets)}. "
                    "Reducing spending in these areas is your fastest route to saving more."
                )
            else:
                suggestion = "Your active budgets look well-managed! Try putting any leftover cash directly into high-yield deposits or mutual funds."
                
            return (
                f"Here is your current savings context:\n"
                f"- **Monthly Income (Actual):** {currency}{actual_income:,.2f}\n"
                f"- **Monthly Expenses (Actual):** {currency}{actual_expense:,.2f}\n"
                f"- **Net Savings:** {currency}{net_savings:,.2f}\n"
                f"- **Monthly Profile Target:** {currency}{profile_savings_target:,.2f}\n\n"
                f"**Coach Suggestion:** {suggestion}"
            )
            
        # 5. Topic: Overspending / Budget Status
        if "overspending" in lower_prompt or "budget" in lower_prompt or "spend" in lower_prompt:
            exceeded_budgets = [b for b in budgets if b["spent"] > b["limit"]]
            warning_budgets = [b for b in budgets if b["limit"] >= b["spent"] > 0.7 * b["limit"]]
            
            response = "**Budget & Spending Coaching:**\n"
            if not budgets:
                response += "You have not set up any category budgets yet! Go to the Budgets page to create allocations so we can track them."
            else:
                if exceeded_budgets:
                    response += "🚨 **Exceeded Budgets:**\n"
                    for b in exceeded_budgets:
                        response += f"- **{b['category']}**: Spent {currency}{b['spent']:,.2f} / Limit {currency}{b['limit']:,.2f}\n"
                if warning_budgets:
                    response += "⚠️ **Approaching Limits (above 70%):**\n"
                    for b in warning_budgets:
                        response += f"- **{b['category']}**: Spent {currency}{b['spent']:,.2f} / Limit {currency}{b['limit']:,.2f}\n"
                if not exceeded_budgets and not warning_budgets:
                    response += "✅ All category spending is safely within your budgets. Great job staying disciplined!"
            return response
            
        # 6. Affordability Calculator ("Can I afford...")
        if "afford" in lower_prompt or "buy" in lower_prompt:
            # Extract number
            numbers = re.findall(r'\b\d+(?:,\d+)*(?:\.\d+)?\b', lower_prompt)
            amount_val = 0.0
            if numbers:
                try:
                    amount_val = float(numbers[0].replace(',', ''))
                except ValueError:
                    pass
            
            if amount_val <= 0:
                return (
                    "I can help you calculate if you can afford an item. "
                    "Please specify the price. E.g. *'Can I afford a new laptop costing 60000?'*"
                )
                
            # Calculation
            if net_savings >= amount_val:
                return (
                    f"**Yes!** You can afford this item ({currency}{amount_val:,.2f}) because your net savings this month "
                    f"({currency}{net_savings:,.2f}) are sufficient to cover it directly."
                )
            else:
                deficit = amount_val - net_savings
                months_needed = int(deficit / (profile_savings_target or 1000.0)) + 1
                return (
                    f"**No, not comfortably right now.** \n\n"
                    f"- **Item Cost:** {currency}{amount_val:,.2f}\n"
                    f"- **Net Savings This Month:** {currency}{net_savings:,.2f}\n"
                    f"- **Shortfall:** {currency}{deficit:,.2f}\n\n"
                    f"**Recommendation:** If you save your targeted {currency}{profile_savings_target:,.2f} per month, "
                    f"it will take you approximately **{months_needed} month(s)** to afford this item without drawing from your emergency funds or existing goals."
                )

        # 7. Topic: Health Score
        if "health score" in lower_prompt or "financial health" in lower_prompt:
            score = context.get("financial_health_score")
            if score is not None:
                return (
                    f"Your current **Financial Health Score is {score}/100**.\n\n"
                    f"- **Score status:** {'Excellent Health' if score >= 80 else 'Fair Health' if score >= 50 else 'Needs Optimization'}\n"
                    f"- For a complete diagnosis breakdown (including strengths and areas of improvements), "
                    f"visit the **Health Score** section in the sidebar menu!"
                )
            else:
                return (
                    "I haven't computed your Financial Health Score yet! "
                    "Please visit the **Health Score** diagnostics page in the sidebar menu to generate your rating index."
                )

        # 8. Topic: Emergency Fund
        if "emergency fund" in lower_prompt or "emergency savings" in lower_prompt:
            ef_info = context.get("emergency_fund", {})
            current_cush = ef_info.get("current_cushion", 0.0)
            target_m = ef_info.get("target_months", 6)
            
            # calculate target based on expenses
            profile_monthly_exp = context.get("profile_monthly_expenses", 0.0)
            if profile_monthly_exp <= 0:
                profile_monthly_exp = context.get("actual_expense_this_month", 0.0)
            target_amount = profile_monthly_exp * target_m
            deficit = max(0.0, target_amount - current_cush)
            
            status_msg = ""
            if deficit <= 0 and target_amount > 0:
                status_msg = "✅ **Congratulations!** Your emergency fund is fully funded according to your targets."
            elif target_amount > 0:
                status_msg = f"⚠️ You have a shortfall of **{currency}{deficit:,.2f}** to reach your target."
            else:
                status_msg = "Please initialize your monthly expenses profile to compute targets correctly."
                
            return (
                f"**Emergency Fund Diagnostics:**\n"
                f"- **Current Saved Cushion:** {currency}{current_cush:,.2f}\n"
                f"- **Target Cushion Period:** {target_m} months of essential expenses\n"
                f"- **Cushion Target:** {currency}{target_amount:,.2f}\n\n"
                f"{status_msg}\n\n"
                f"You can customize target months and track your progress in the **Health Score** section!"
            )

        # Default general response
        return (
            "Hello! I am your **FinWise AI Financial Coach**. I can help you review your financial data and answer questions.\n\n"
            "Try asking me:\n"
            "- *'How can I save money this month?'*\n"
            "- *'Can I afford a phone worth 45000?'*\n"
            "- *'Where am I overspending?'*\n"
            "- *'Explain SIP and Index Funds.'*"
        )

    def parse_receipt(self, ocr_text: str) -> dict:
        from app.services.ocr_service import parse_receipt_text_heuristically
        parsed = parse_receipt_text_heuristically(ocr_text)
        
        # Determine category and subcategory based on merchant and text
        cat_info = self.categorize(f"Spent {parsed['amount']} at {parsed['merchant']} for {ocr_text}")
        
        return {
            "merchant": parsed["merchant"],
            "amount": parsed["amount"],
            "tax": parsed["tax"],
            "date": parsed["date"],
            "category": cat_info["category"],
            "subcategory": cat_info["subcategory"]
        }

    def parse_voice(self, text: str) -> dict:
        cat_info = self.categorize(text)
        
        # Try to parse a relative date like "yesterday" or "today"
        from datetime import date, timedelta
        target_date = date.today()
        lower_text = text.lower()
        if "yesterday" in lower_text:
            target_date = date.today() - timedelta(days=1)
        elif "day before yesterday" in lower_text:
            target_date = date.today() - timedelta(days=2)
            
        return {
            "amount": cat_info["amount"],
            "category": cat_info["category"],
            "subcategory": cat_info["subcategory"],
            "merchant": cat_info["merchant"],
            "date": target_date.isoformat(),
            "description": text
        }

    def explain_recommendation(self, recommendation_data: dict) -> str:
        risk_level = recommendation_data.get("risk_level", "Moderate")
        monthly_investable = recommendation_data.get("monthly_investable", 0.0)
        
        if risk_level == "Conservative":
            return (
                f"Based on your Conservative risk profile and monthly investable amount of ₹{monthly_investable:,.2f}, "
                f"our primary recommendation is capital preservation and steady income generation. We suggest allocating 60% towards "
                f"low-volatility fixed income assets (Debt Funds, PPF, FDs) to protect against market fluctuations. A 20% exposure to "
                f"Large-Cap Index Funds provides a mild growth buffer, while 10% in Gold acts as a classic inflation hedge. "
                f"This combination minimizes potential drawdowns while ensuring stability."
            )
        elif risk_level == "Aggressive":
            return (
                f"With an Aggressive risk profile and a monthly investable capacity of ₹{monthly_investable:,.2f}, the primary "
                f"focus is long-term high compounding growth. We recommend placing 80% of your funds into diversified equities, with a "
                f"strong focus on Growth, Mid-Cap, and Small-Cap mutual funds and high-scoring growth stocks to capture market momentum. "
                f"Debt allocation is capped at 10% as a minimal cushion, with 5% in Gold and 5% Cash for liquidity. "
                f"This allocation is optimized for higher time horizons where you can absorb short-term drawdowns for superior returns."
            )
        else:
            # Moderate
            return (
                f"Your Moderate risk tolerance and monthly investable amount of ₹{monthly_investable:,.2f} suggest a balanced approach. "
                f"We recommend a 60% allocation to diversified equities (split across index and flexi-cap options) to benefit from "
                f"economic expansion, paired with 25% in stable Debt assets to reduce overall portfolio volatility. A 10% gold allocation "
                f"provides systemic risk protection, while a 5% cash reserve ensures short-term liquidity. This provides a robust asset mix "
                f"designed to grow steadily through market cycles."
            )

class OpenAIProvider(AIProvider):
    def categorize(self, text: str) -> dict:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return HeuristicProvider().categorize(text)
            
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        prompt = (
            "Analyze the following financial transaction text and extract the expense details.\n"
            "Respond ONLY with a valid JSON object containing exactly the following keys: "
            "\"category\", \"subcategory\", \"merchant\", \"amount\".\n"
            "The category must be one of: Food, Groceries, Travel, Shopping, Bills, Rent, Education, Healthcare, Entertainment, Subscriptions, Transportation, Other.\n"
            "If the subcategory, merchant, or amount cannot be found, provide null or a reasonable default.\n"
            f"Transaction text: \"{text}\""
        )
        
        payload = {
            "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that parses financial text into JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.0,
            "response_format": {"type": "json_object"}
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=8)
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                result = json.loads(content)
                return {
                    "category": result.get("category", "Other"),
                    "subcategory": result.get("subcategory", "Uncategorized"),
                    "merchant": result.get("merchant", "Unknown"),
                    "amount": float(result.get("amount")) if result.get("amount") is not None else 0.0
                }
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            
        return HeuristicProvider().categorize(text)

    def chat(self, prompt: str, history: list, context_str: str) -> str:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return HeuristicProvider().chat(prompt, history, context_str)
            
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        system_content = (
            "You are FinWise AI, a personal financial coach. Explain financial concepts in beginner-friendly, simple language.\n"
            f"Here is the user's current financial context:\n{context_str}\n"
            "Use this context when appropriate to give personalized, helpful answers. "
            "Never make up false details or promise guaranteed returns. Keep your answers concise, structured, and encouraging."
        )
        
        messages = [{"role": "system", "content": system_content}]
        for h in history:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            "messages": messages,
            "temperature": 0.5
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=12)
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"Error in OpenAI chat: {e}")
            
        return HeuristicProvider().chat(prompt, history, context_str)

    def parse_receipt(self, ocr_text: str) -> dict:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return HeuristicProvider().parse_receipt(ocr_text)
            
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        prompt = (
            "Analyze the following OCR text from a store receipt and extract details.\n"
            "Respond ONLY with a valid JSON object containing exactly the following keys: "
            "\"merchant\", \"date\", \"amount\", \"tax\", \"category\", \"subcategory\".\n"
            "Notes:\n"
            "- \"date\" should be in YYYY-MM-DD format if found, otherwise null.\n"
            "- \"amount\" must be a float of the total paid amount.\n"
            "- \"tax\" must be a float representing total taxes (like GST, VAT, service tax) or 0.0.\n"
            "- \"category\" must be one of: Food, Groceries, Travel, Shopping, Bills, Rent, Education, Healthcare, Entertainment, Subscriptions, Transportation, Other.\n"
            "- \"subcategory\" is a sub-division of the category.\n"
            f"Receipt text:\n\"\"\"\n{ocr_text}\n\"\"\""
        )
        
        payload = {
            "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            "messages": [
                {"role": "system", "content": "You are a helpful finance assistant that extracts receipt details into clean JSON objects."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.0,
            "response_format": {"type": "json_object"}
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                result = json.loads(content)
                return {
                    "merchant": result.get("merchant", "Unknown"),
                    "date": result.get("date"),
                    "amount": float(result.get("amount")) if result.get("amount") is not None else 0.0,
                    "tax": float(result.get("tax")) if result.get("tax") is not None else 0.0,
                    "category": result.get("category", "Other"),
                    "subcategory": result.get("subcategory", "Uncategorized")
                }
        except Exception as e:
            print(f"OpenAI parse_receipt failed: {e}")
            
        return HeuristicProvider().parse_receipt(ocr_text)

    def parse_voice(self, text: str) -> dict:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return HeuristicProvider().parse_voice(text)
            
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        current_date_str = date.today().isoformat()
        prompt = (
            "Analyze the following voice expense input and extract transaction details.\n"
            f"Note: Current date is {current_date_str}.\n"
            "Respond ONLY with a valid JSON object containing exactly the following keys: "
            "\"amount\", \"category\", \"subcategory\", \"merchant\", \"date\", \"description\".\n"
            "Notes:\n"
            "- \"date\" should be in YYYY-MM-DD format based on relative words like 'today' or 'yesterday'.\n"
            "- \"amount\" must be a float.\n"
            "- \"category\" must be one of: Food, Groceries, Travel, Shopping, Bills, Rent, Education, Healthcare, Entertainment, Subscriptions, Transportation, Other.\n"
            "- \"description\" is a short summary of the voice input.\n"
            f"Voice Input: \"{text}\""
        )
        
        payload = {
            "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            "messages": [
                {"role": "system", "content": "You are a helpful personal finance AI helper."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.0,
            "response_format": {"type": "json_object"}
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=8)
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                result = json.loads(content)
                return {
                    "amount": float(result.get("amount")) if result.get("amount") is not None else 0.0,
                    "category": result.get("category", "Other"),
                    "subcategory": result.get("subcategory", "Uncategorized"),
                    "merchant": result.get("merchant", "Unknown"),
                    "date": result.get("date") or current_date_str,
                    "description": result.get("description", text)
                }
        except Exception as e:
            print(f"OpenAI parse_voice failed: {e}")
            
        return HeuristicProvider().parse_voice(text)

    def explain_recommendation(self, recommendation_data: dict) -> str:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return HeuristicProvider().explain_recommendation(recommendation_data)
            
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        prompt = (
            "You are a professional financial advisor assistant. Your task is to write a personalized, "
            "clear, and beginner-friendly explainable paragraph explaining why the following structured "
            "investment recommendation was generated for the user. Do NOT invent or change any figures. "
            "Explain the rationale behind this asset allocation and candidates based on the user's risk profile.\n\n"
            f"Structured Recommendation Data:\n{json.dumps(recommendation_data)}\n\n"
            "Return ONLY the explanation paragraph itself. Do not include any greeting or filler text."
        )
        
        payload = {
            "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            "messages": [
                {"role": "system", "content": "You are a professional explainable finance assistant."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.5
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=8)
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"OpenAI explain_recommendation failed: {e}")
            
        return HeuristicProvider().explain_recommendation(recommendation_data)

class OllamaProvider(AIProvider):
    def categorize(self, text: str) -> dict:
        url = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/chat")
        model = os.getenv("OLLAMA_MODEL", "gemma2:2b")
        
        prompt = (
            "Analyze the following financial transaction text and extract the expense details.\n"
            "Respond ONLY with a valid JSON object containing exactly the following keys: "
            "\"category\", \"subcategory\", \"merchant\", \"amount\".\n"
            "The category must be one of: Food, Groceries, Travel, Shopping, Bills, Rent, Education, Healthcare, Entertainment, Subscriptions, Transportation, Other.\n"
            "Do not include any introductory or concluding text, only return the JSON markdown block or raw JSON.\n"
            f"Transaction text: \"{text}\""
        )
        
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a finance assistant. You output strict JSON containing category, subcategory, merchant, amount."},
                {"role": "user", "content": prompt}
            ],
            "stream": False,
            "options": {
                "temperature": 0.0
            }
        }
        
        try:
            response = requests.post(url, json=payload, timeout=8)
            if response.status_code == 200:
                data = response.json()
                content = data["message"]["content"]
                
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    content = json_match.group(0)
                    
                result = json.loads(content)
                return {
                    "category": result.get("category", "Other"),
                    "subcategory": result.get("subcategory", "Uncategorized"),
                    "merchant": result.get("merchant", "Unknown"),
                    "amount": float(result.get("amount")) if result.get("amount") is not None else 0.0
                }
        except Exception as e:
            print(f"Error calling Ollama API: {e}")
            
        return HeuristicProvider().categorize(text)

    def chat(self, prompt: str, history: list, context_str: str) -> str:
        url = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/chat")
        model = os.getenv("OLLAMA_MODEL", "gemma2:2b")
        
        system_content = (
            "You are FinWise AI, a personal financial coach. Explain financial concepts in beginner-friendly, simple language.\n"
            f"Here is the user's current financial context:\n{context_str}\n"
            "Use this context when appropriate to give personalized, helpful answers. "
            "Never make up false details or promise guaranteed returns. Keep your answers concise, structured, and encouraging."
        )
        
        messages = [{"role": "system", "content": system_content}]
        for h in history:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": 0.5}
        }
        
        try:
            response = requests.post(url, json=payload, timeout=12)
            if response.status_code == 200:
                data = response.json()
                return data["message"]["content"]
        except Exception as e:
            print(f"Error in Ollama chat: {e}")
            
        return HeuristicProvider().chat(prompt, history, context_str)

    def parse_receipt(self, ocr_text: str) -> dict:
        url = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/chat")
        model = os.getenv("OLLAMA_MODEL", "gemma2:2b")
        
        prompt = (
            "Analyze the following OCR text from a store receipt and extract details.\n"
            "Respond ONLY with a valid JSON object containing exactly the following keys: "
            "\"merchant\", \"date\", \"amount\", \"tax\", \"category\", \"subcategory\".\n"
            "Notes:\n"
            "- \"date\" should be in YYYY-MM-DD format if found, otherwise null.\n"
            "- \"amount\" must be a float of the total paid amount.\n"
            "- \"tax\" must be a float representing total taxes (like GST, VAT, service tax) or 0.0.\n"
            "- \"category\" must be one of: Food, Groceries, Travel, Shopping, Bills, Rent, Education, Healthcare, Entertainment, Subscriptions, Transportation, Other.\n"
            "- \"subcategory\" is a sub-division of the category.\n"
            f"Receipt text:\n\"\"\"\n{ocr_text}\n\"\"\""
        )
        
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a personal finance assistant. You output strict JSON."},
                {"role": "user", "content": prompt}
            ],
            "stream": False,
            "options": {"temperature": 0.0}
        }
        
        try:
            response = requests.post(url, json=payload, timeout=12)
            if response.status_code == 200:
                data = response.json()
                content = data["message"]["content"]
                
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    content = json_match.group(0)
                    
                result = json.loads(content)
                return {
                    "merchant": result.get("merchant", "Unknown"),
                    "date": result.get("date"),
                    "amount": float(result.get("amount")) if result.get("amount") is not None else 0.0,
                    "tax": float(result.get("tax")) if result.get("tax") is not None else 0.0,
                    "category": result.get("category", "Other"),
                    "subcategory": result.get("subcategory", "Uncategorized")
                }
        except Exception as e:
            print(f"Ollama parse_receipt failed: {e}")
            
        return HeuristicProvider().parse_receipt(ocr_text)

    def parse_voice(self, text: str) -> dict:
        url = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/chat")
        model = os.getenv("OLLAMA_MODEL", "gemma2:2b")
        current_date_str = date.today().isoformat()
        
        prompt = (
            "Analyze the following voice expense input and extract transaction details.\n"
            f"Note: Current date is {current_date_str}.\n"
            "Respond ONLY with a valid JSON object containing exactly the following keys: "
            "\"amount\", \"category\", \"subcategory\", \"merchant\", \"date\", \"description\".\n"
            "Notes:\n"
            "- \"date\" should be in YYYY-MM-DD format based on relative words like 'today' or 'yesterday'.\n"
            "- \"amount\" must be a float.\n"
            "- \"category\" must be one of: Food, Groceries, Travel, Shopping, Bills, Rent, Education, Healthcare, Entertainment, Subscriptions, Transportation, Other.\n"
            "- \"description\" is a short summary of the voice input.\n"
            f"Voice Input: \"{text}\""
        )
        
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a personal finance assistant. You output strict JSON."},
                {"role": "user", "content": prompt}
            ],
            "stream": False,
            "options": {"temperature": 0.0}
        }
        
        try:
            response = requests.post(url, json=payload, timeout=12)
            if response.status_code == 200:
                data = response.json()
                content = data["message"]["content"]
                
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    content = json_match.group(0)
                    
                result = json.loads(content)
                return {
                    "amount": float(result.get("amount")) if result.get("amount") is not None else 0.0,
                    "category": result.get("category", "Other"),
                    "subcategory": result.get("subcategory", "Uncategorized"),
                    "merchant": result.get("merchant", "Unknown"),
                    "date": result.get("date") or current_date_str,
                    "description": result.get("description", text)
                }
        except Exception as e:
            print(f"Ollama parse_voice failed: {e}")
            
        return HeuristicProvider().parse_voice(text)

    def explain_recommendation(self, recommendation_data: dict) -> str:
        url = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/chat")
        model = os.getenv("OLLAMA_MODEL", "gemma2:2b")
        
        prompt = (
            "You are a professional financial advisor assistant. Your task is to write a personalized, "
            "clear, and beginner-friendly explainable paragraph explaining why the following structured "
            "investment recommendation was generated for the user. Do NOT invent or change any figures. "
            "Explain the rationale behind this asset allocation and candidates based on the user's risk profile.\n\n"
            f"Structured Recommendation Data:\n{json.dumps(recommendation_data)}\n\n"
            "Return ONLY the explanation paragraph itself. Do not include any greeting or filler text."
        )
        
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a professional explainable finance assistant. You output plain text paragraphs."},
                {"role": "user", "content": prompt}
            ],
            "stream": False,
            "options": {"temperature": 0.5}
        }
        
        try:
            response = requests.post(url, json=payload, timeout=15)
            if response.status_code == 200:
                data = response.json()
                return data["message"]["content"].strip()
        except Exception as e:
            print(f"Ollama explain_recommendation failed: {e}")
            
        return HeuristicProvider().explain_recommendation(recommendation_data)

class GeminiProvider(AIProvider):
    def _call_gemini(self, prompt: str, system_prompt: str = "") -> str:
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("AI_API_KEY")
        if not api_key:
            return None
        
        preferred_model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
        models_to_try = [preferred_model, "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash"]
        # deduplicate while preserving order
        models_to_try = list(dict.fromkeys(models_to_try))
        
        contents = []
        if system_prompt:
            contents.append({"role": "user", "parts": [{"text": f"Instruction: {system_prompt}"}]})
            contents.append({"role": "model", "parts": [{"text": "Understood."}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})
        
        payload = {"contents": contents}
        
        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                res = requests.post(url, json=payload, timeout=12)
                if res.status_code == 200:
                    data = res.json()
                    if "candidates" in data and len(data["candidates"]) > 0:
                        parts = data["candidates"][0]["content"]["parts"]
                        if parts:
                            return parts[0]["text"]
            except Exception as e:
                print(f"Gemini API Exception on {model}: {e}")
        return None

    def categorize(self, text: str) -> dict:
        prompt = (
            "Analyze the following financial transaction text and extract the expense details.\n"
            "Respond ONLY with a valid JSON object containing exactly the following keys: "
            "\"category\", \"subcategory\", \"merchant\", \"amount\".\n"
            "The category must be one of: Food, Groceries, Travel, Shopping, Bills, Rent, Education, Healthcare, Entertainment, Subscriptions, Transportation, Other.\n"
            f"Transaction text: \"{text}\""
        )
        res_text = self._call_gemini(prompt, "You output strict JSON.")
        if res_text:
            try:
                json_match = re.search(r'\{.*\}', res_text, re.DOTALL)
                if json_match:
                    res_text = json_match.group(0)
                result = json.loads(res_text)
                return {
                    "category": result.get("category", "Other"),
                    "subcategory": result.get("subcategory", "Uncategorized"),
                    "merchant": result.get("merchant", "Unknown"),
                    "amount": float(result.get("amount")) if result.get("amount") is not None else 0.0
                }
            except Exception:
                pass
        return HeuristicProvider().categorize(text)

    def chat(self, prompt: str, history: list, context_str: str) -> str:
        system_content = (
            "You are FinWise AI, a personal financial coach. Explain financial concepts in beginner-friendly, simple language.\n"
            f"Here is the user's current financial context:\n{context_str}\n"
            "Use this context when appropriate to give personalized, helpful answers. "
            "Never make up false details or promise guaranteed returns. Keep your answers concise, structured, and encouraging."
        )
        res_text = self._call_gemini(prompt, system_content)
        if res_text:
            return res_text
        return HeuristicProvider().chat(prompt, history, context_str)

    def parse_receipt(self, ocr_text: str) -> dict:
        prompt = (
            "Analyze the following OCR text from a store receipt and extract details.\n"
            "Respond ONLY with a valid JSON object containing exactly the following keys: "
            "\"merchant\", \"date\", \"amount\", \"tax\", \"category\", \"subcategory\".\n"
            f"Receipt text:\n\"\"\"\n{ocr_text}\n\"\"\""
        )
        res_text = self._call_gemini(prompt, "You parse store receipts into clean JSON.")
        if res_text:
            try:
                json_match = re.search(r'\{.*\}', res_text, re.DOTALL)
                if json_match:
                    res_text = json_match.group(0)
                result = json.loads(res_text)
                return {
                    "merchant": result.get("merchant", "Unknown"),
                    "date": result.get("date"),
                    "amount": float(result.get("amount")) if result.get("amount") is not None else 0.0,
                    "tax": float(result.get("tax")) if result.get("tax") is not None else 0.0,
                    "category": result.get("category", "Other"),
                    "subcategory": result.get("subcategory", "Uncategorized")
                }
            except Exception:
                pass
        return HeuristicProvider().parse_receipt(ocr_text)

    def parse_voice(self, text: str) -> dict:
        current_date_str = date.today().isoformat()
        prompt = (
            "Analyze the following voice expense input and extract transaction details.\n"
            f"Note: Current date is {current_date_str}.\n"
            "Respond ONLY with a valid JSON object containing exactly the following keys: "
            "\"amount\", \"category\", \"subcategory\", \"merchant\", \"date\", \"description\".\n"
            f"Voice Input: \"{text}\""
        )
        res_text = self._call_gemini(prompt, "You parse voice expense entries into clean JSON.")
        if res_text:
            try:
                json_match = re.search(r'\{.*\}', res_text, re.DOTALL)
                if json_match:
                    res_text = json_match.group(0)
                result = json.loads(res_text)
                return {
                    "amount": float(result.get("amount")) if result.get("amount") is not None else 0.0,
                    "category": result.get("category", "Other"),
                    "subcategory": result.get("subcategory", "Uncategorized"),
                    "merchant": result.get("merchant", "Unknown"),
                    "date": result.get("date") or current_date_str,
                    "description": result.get("description", text)
                }
            except Exception:
                pass
        return HeuristicProvider().parse_voice(text)

    def explain_recommendation(self, recommendation_data: dict) -> str:
        prompt = (
            "You are a professional financial advisor assistant. Your task is to write a personalized, "
            "clear, and beginner-friendly paragraph explaining why the following structured "
            "investment recommendation was generated for the user.\n\n"
            f"Structured Recommendation Data:\n{json.dumps(recommendation_data)}"
        )
        res_text = self._call_gemini(prompt, "You write clear, explainable investment rationale paragraphs.")
        if res_text:
            return res_text.strip()
        return HeuristicProvider().explain_recommendation(recommendation_data)

def get_ai_provider() -> AIProvider:
    provider_name = os.getenv("AI_PROVIDER", "heuristic").lower()
    if provider_name == "gemini" or os.getenv("GEMINI_API_KEY"):
        return GeminiProvider()
    elif provider_name == "openai" or (os.getenv("OPENAI_API_KEY") and provider_name == "openai"):
        return OpenAIProvider()
    elif provider_name == "ollama":
        return OllamaProvider()
    else:
        return HeuristicProvider()


def categorize_expense(text: str, user_id: int) -> dict:
    # 1. Check for database-backed corrections by this user for the exact phrase
    stripped_text = text.strip()
    correction = AICorrection.query.filter_by(user_id=user_id, raw_text=stripped_text).order_by(AICorrection.id.desc()).first()
    
    if correction:
        return {
            "category": correction.corrected_category,
            "subcategory": correction.corrected_subcategory or "Uncategorized",
            "merchant": correction.corrected_merchant or "Unknown",
            "amount": float(correction.corrected_amount) if correction.corrected_amount is not None else 0.0,
            "is_correction": True
        }
        
    # 2. Fall back to AI Provider
    provider = get_ai_provider()
    result = provider.categorize(text)
    result["is_correction"] = False
    return result

def get_user_financial_context(user_id: int) -> dict:
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    
    # Defaults
    currency = '₹'
    risk = 'Moderate'
    monthly_income_profile = 0.0
    monthly_savings_profile = 0.0
    
    if profile:
        currency = '₹' if profile.currency == 'INR' else '$'
        risk = profile.risk_tolerance or 'Moderate'
        monthly_income_profile = float(profile.monthly_income or 0.0)
        monthly_savings_profile = float(profile.monthly_savings or 0.0)
        
    today = date.today()
    start_of_month = date(today.year, today.month, 1)
    
    # Calculate actual income/expenses for the current month
    incomes_curr_month = Income.query.filter(Income.user_id == user_id, Income.date >= start_of_month).all()
    expenses_curr_month = Expense.query.filter(Expense.user_id == user_id, Expense.date >= start_of_month).all()
    
    actual_income = sum(float(i.amount) for i in incomes_curr_month)
    actual_expense = sum(float(e.amount) for e in expenses_curr_month)
    
    # If no monthly income is recorded this month, use profile value
    base_income = actual_income if actual_income > 0 else monthly_income_profile
    net_savings = base_income - actual_expense
    
    # Budgets
    budgets = Budget.query.filter_by(user_id=user_id).all()
    budgets_list = []
    for b in budgets:
        # Calculate how much has been spent in this budget category this month
        spent = sum(float(e.amount) for e in expenses_curr_month if e.category == b.category)
        budgets_list.append({
            "category": b.category,
            "limit": float(b.amount),
            "spent": spent
        })
        
    # Goals
    goals = FinancialGoal.query.filter_by(user_id=user_id).all()
    goals_list = []
    for g in goals:
        goals_list.append({
            "name": g.name,
            "target": float(g.target_amount),
            "current": float(g.current_amount),
            "date": g.target_date.isoformat() if g.target_date else ""
        })

    # Emergency Fund & Health Score
    from app.models import EmergencyFund, FinancialScore
    ef = EmergencyFund.query.filter_by(user_id=user_id).first()
    ef_info = {
        "current_cushion": float(ef.current_amount) if ef else 0.0,
        "target_months": ef.target_months if ef else 6
    }
    latest_score = FinancialScore.query.filter_by(user_id=user_id).order_by(FinancialScore.created_at.desc()).first()
    health_score = latest_score.score if latest_score else None
        
    return {
        "currency": currency,
        "risk_tolerance": risk,
        "profile_monthly_income": monthly_income_profile,
        "profile_monthly_savings_target": monthly_savings_profile,
        "profile_investment_amount": float(profile.investment_amount or 0.0) if profile else 0.0,
        "actual_income_this_month": actual_income,
        "actual_expense_this_month": actual_expense,
        "net_savings_this_month": net_savings,
        "budgets": budgets_list,
        "goals": goals_list,
        "emergency_fund": ef_info,
        "financial_health_score": health_score
    }

def parse_ocr_text(text: str) -> dict:
    provider = get_ai_provider()
    return provider.parse_receipt(text)

def parse_voice_entry(text: str) -> dict:
    provider = get_ai_provider()
    return provider.parse_voice(text)
