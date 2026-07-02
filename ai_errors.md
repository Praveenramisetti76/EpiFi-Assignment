# Where the AI was Wrong - "Fair Split"

This document details 3 concrete examples where the LLM's first-draft parsing or mapping was incorrect, how the system caught the error, and how it was resolved.

---

### Example 1: Pronoun Omission and Mapped-Name Crash ("Priya and I")
* **The Error**: When parsing the description *"Priya and I shared the pasta"*, the model's first output mapped the pasta's consumers to `["Priya", "I"]`. However, it only extracted `["Aman", "Priya", "Karan"]` in the `people` array (since "I" is not a formal name). This caused a crash in the calculator when attempting to access a person who wasn't in the breakdown list.
* **How it was caught**: We wrote a safety check in `splitCalculator.js` that filters consumers against the main `people` list. It noticed that `"I"` was a consumer but not in the `people` list.
* **How it was fixed**: 
  1. We modified the Gemini prompt to explicitly state: *"If 'I' or 'me' is used in the description, extract this person as 'Me' in the people list and mappings."*
  2. In `splitCalculator.js`, we added a fallback: if a consumer is extracted who isn't in the `people` array, we filter them out or resolve them to one of the main people. If no consumers remain, we fall back to splitting the item among everyone.

---

### Example 2: Quantity vs. Total Price Confusion (Naan Multiplier)
* **The Error**: On bill R2, the receipt lists `Butter Naan 4 240`. The model extracted this as:
  ```json
  { "name": "Butter Naan", "quantity": 4, "total_price": 960 }
  ```
  It mistakenly multiplied the total price (₹240) by the quantity (4), thinking ₹240 was the unit price, making the computed subtotal massive and failing the reconciliation checks.
* **How it was caught**: The server's validation code compared the computed items sum (₹1940) against the printed subtotal (₹1220). The ₹720 discrepancy was flagged instantly.
* **How it was fixed**: We updated the prompt instructions to specify that `total_price` must represent the **total printed price for that line item as a whole** on the receipt, not a unit price, and added the schema type constraints.

---

### Example 3: Service Charge / Round-off Omission
* **The Error**: When scanning R1, the model extracted the items and subtotal correctly but set `service_charge = 0` and `tax = 107` (merging service charge and GST together under tax). This led to incorrect individual shares because service charges and taxes have different allocation/audit properties on bills.
* **How it was caught**: The unit tests for R1 failed because the individual totals did not match the expected rounded shares (since tax and service allocations were skewed).
* **How it was fixed**: We added a strict schema enforcement utilizing `responseSchema` with separate properties for `service_charge`, `tax`, `discount`, and `grand_total`. We also added system prompt instructions telling the model to separate CGST/SGST/GST from service charges, preventing them from being merged.
