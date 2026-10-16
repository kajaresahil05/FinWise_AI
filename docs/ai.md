# FinWise AI — AI Engine & Provider Architecture

FinWise AI uses an extensible strategy design pattern (`AIProvider` abstraction) to decouple natural language parsing, expense classification, and conversational coaching from any single proprietary LLM provider.

---

## 1. Provider Abstraction Architecture

```
                       +-------------------+
                       |    AIProvider     |
                       |    Interface      |
                       +---------+---------+
                                 |
     +-------------------+-------+-------+-------------------+
     |                   |               |                   |
     v                   v               v                   v
+----+----+      +-------+----+    +-----+-----+      +------+------+
|Heuristic|      |  Gemini    |    |  Ollama   |      |   OpenAI    |
|Provider |      | Provider   |    | Provider  |      |  Provider   |
+---------+      +------------+    +-----------+      +-------------+
```

---

## 2. Supported AI Engines

### 1. Heuristic Provider (`AIProvider = heuristic`)
- **Mode**: 100% Offline / Rule-Based.
- **Capabilities**: Uses regular expressions and heuristic scoring for categorization, voice parsing, receipt itemization, and financial coaching.
- **Use Case**: Default fallback when no internet or external API key is present.

### 2. Gemini Provider (`AIProvider = gemini`)
- **Mode**: Cloud API via Google AI Studio.
- **Key**: `GEMINI_API_KEY` (configured in `.env`).
- **Model**: `gemini-1.5-flash` or configurable model.
- **Use Case**: High-speed, high-accuracy conversational AI financial coach and OCR receipt structurer.

### 3. OpenAI Provider (`AIProvider = openai`)
- **Mode**: Cloud API via OpenAI REST API.
- **Key**: `OPENAI_API_KEY` (configured in `.env`).
- **Model**: `gpt-4o-mini`.

### 4. Ollama Provider (`AIProvider = ollama`)
- **Mode**: Local Open-Source LLM.
- **URL**: `http://localhost:11434`.
- **Supported Models**: `gemma2:2b`, `llama3`, `mistral`, `qwen`.

---

## 3. Human Feedback & Self-Correction Engine (`AICorrection`)
When a user manually corrects an AI categorization in the UI, the system logs the correction in `AICorrection` database table. Future transactions matching that merchant/description query database corrections first before calling AI, allowing user preferences to override LLM predictions.
