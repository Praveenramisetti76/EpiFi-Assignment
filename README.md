# Fair Split ─ AI-Powered Receipt Scanner & Expense Splitter

A restaurant bill splitting application that takes a photo of a receipt and a plain-English description of consumption, returning a fair, fully-reconciled, per-person expense breakdown. It handles service charges, GST, discounts, and computes minimized settle-up transactions.

---

##  Tech Stack & Core Architecture

The project is structured to run as a unified Node.js Express application serving a single-page web frontend.

```
Client (Web UI / Custom client POST)
  │
  ├── 1. POSTs JSON base64 + description text to /api/split
  ▼
Express Backend Server (server.js)
  │
  ├── 2. Forwards image + prompt to Gemini API
  ▼
Gemini Developer API (gemini-2.5-flash)
  │
  ├── 3. Performs OCR and structured entity extraction via JSON Schema
  ▼
Express Backend Server (server.js)
  │
  ├── 4. Processes data using deterministic Javascript calculator (splitCalculator.js)
  ▼
Client (Web UI / Custom client POST) <-- Returns fully reconciled JSON payload
```

* **Frontend**: Vanilla HTML5, CSS3, and JavaScript. Styled with a premium glassmorphic dark-mode theme, utilizing custom vector SVG icons and generated scanned-receipt illustrations to avoid an "AI-generated template" appearance.
* **Backend**: Node.js + Express. Exposes the required POST `/api/split` JSON endpoint.
* **AI Extraction**: Integrated with the official `@google/genai` Node.js SDK using `gemini-2.5-flash` with a strict OpenAPI schema enforcement.
* **Calculation Engine**: A custom mathematical resolver that calculates shares, distributes taxes and discounts proportionally, handles rupee rounding, and minimizes settle-up transactions.

---

##  Decision Log: Why Calculations are Executed in Code

### The Question
*Did you let the model do the arithmetic, or extract structured data and compute the totals in code? Why?*

### The Answer
We **extract structured data using the LLM and calculate all totals in deterministic Javascript code**. 

### The Rationale
1. **Mathematical Precision**: LLMs are probabilistic text-completion networks and are highly unreliable at multi-step floating-point arithmetic (especially proportions). 
2. **Strict Reconciliation (Leftover Paise)**: When splitting bill items (e.g. ₹100 split 3 ways is ₹33.33 each), standard rounding leads to a sum that is off by a few paise or rupees. To reconcile the total exactly to the bill's grand total, the leftover amount must be allocated to the people with the highest rounding fractions. We implement this deterministically in code and state who absorbed the paise in the `assumptions` array.
3. **Audit Audits (Flags)**: Code-level math allows us to compare the sum of extracted item prices against the printed subtotal and grand total. If there are discrepancies, we surface warning flags rather than silently guessing or modifying the bill.
4. **Testability**: Computing in code allows us to write unit tests to assert calculation correctness on sample inputs, ensuring 100% mathematical accuracy.

---

##  Edge Case Handling Matrix

The application is built around the rule: *If an input is ambiguous or doesn't reconcile, flag it rather than fabricate an answer.*

| Edge Case | Input Condition | System Resolution |
| :--- | :--- | :--- |
| **Printed Parts Mismatch** | The sum of items + service + tax - discount does not equal the grand total. | The code performs an audit check and adds a warning to the `flags` array with the exact unexplained difference amount. |
| **Ambiguous Pronouns** | Wording like "we", "the rest of us", "me", "I". | The LLM prompt resolves "I"/"me" to "Me" and maps "the rest of us" or "we" to the resolved set of names, adding them to the `people` array. |
| **No Payer Specified** | Description outlines consumption but omits who paid. | The LLM returns an empty string `""` for the payer. The backend calculator skips generating `settle_up` transactions and raises a warning flag in `flags`. |
| **Unmapped Receipt Items** | Receipt lists an item that is not mentioned in the description. | The calculator splits this item equally among everyone and raises a warning flag stating the item was split by default. |
| **No Service Charge / Tax** | Charges are missing or set to 0 on the bill. | The calculator handles `0` values gracefully and divides individual shares as `0` without throwing division-by-zero errors. |
| **Zero People Found** | Empty or unrelated description input. | The engine blocks the split, returns an empty table, and sets `matches_bill` to false with a fatal validation flag. |

Detailed specifications are documented in [edge_cases.md](file:///c:/Users/LENOVO/OneDrive/Desktop/Epifi/edge_cases.md).

---

##  Premium UI Experience

We built an interface designed to impress:
* **Glassmorphic Design**: Card containers hover over an ambient radial glow background with deep violet/neon cyan accents.
* **Canvas-based Mock Receipt Presets**: If you select any preset (R1–R4) on the frontend, it programmatically draws a thermal-styled bill onto an HTML5 canvas to pass to the API. This lets you test the full end-to-end OCR and parser instantly without having to download or upload receipt images manually!
* **Responsive Layout**: Adapts perfectly from wide monitor screens down to mobile layouts.
* **Micro-Animations**: Hover scales on buttons, glowing box-shadows, and checklist crossed-out transitions for settle-up instructions.

---

## 🔌 API Contract

### Request Shape
`POST /api/split` (Content-Type: `application/json`)
```json
{
  "receipt_base64": "<base64-encoded image bytes, no data-URI prefix>",
  "description": "<the plain-English string>"
}
```

### Response Shape
`application/json`
```json
{
  "per_person": [
    {
      "name": "Ravi",
      "items": ["Cappuccino", "Grilled Chicken Sandwich"],
      "subtotal": 440,
      "tax_share": 23,
      "service_share": 22,
      "discount_share": 0,
      "total": 485
    }
  ],
  "grand_total": 1147,
  "reconciliation": {
    "sum_of_person_totals": 1147,
    "matches_bill": true
  },
  "paid_by": "Sameer",
  "settle_up": [
    { "from": "Ravi", "to": "Sameer", "amount": 485 }
  ],
  "assumptions": [
    "Sameer absorbed the leftover paise (adjusted by +1 rupee to reconcile round-off)..."
  ],
  "flags": []
}
```

---

## 🏃 Running Locally

### 1. Prerequisite Setup
Configure your environment variables in the [.env](file:///c:/Users/LENOVO/OneDrive/Desktop/Epifi/.env) file:
```env
# Your Google Gemini API Key from Google AI Studio
GEMINI_API_KEY=your_actual_key_here
PORT=3000
```

### 2. Install and Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local server:
   ```bash
   npm start
   ```
3. Open your browser and navigate to: **`http://localhost:3000`**

### 3. Run Automated Tests
Execute the mathematical validation runner to assert calculation precision against R1–R4 samples:
```bash
node test.js
```
