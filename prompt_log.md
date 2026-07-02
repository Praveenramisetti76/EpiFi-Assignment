# Prompt Log - "Fair Split"

This document records the prompt engineering iterations for the Gemini model and answers the architectural question regarding arithmetic calculations.

## Prompt Iterations

1. **Iteration 1: Initial Structured Extraction**
   - *Prompt Change*: Created a schema with basic items, subtotal, tax, service, discount, grand total, people list, and consumption mappings.
   - *Why*: To extract raw bill information and map description items directly to named entities.
   
2. **Iteration 2: Pronoun and Speaker Resolution**
   - *Prompt Change*: Added specific instructions: *"If 'I' or 'me' is used in the description, extract this person as 'Me' unless the context indicates a specific name. Resolve pronouns and phrases like 'the rest of us', 'we', 'three of us' based on context."*
   - *Why*: In trials with descriptions like "Priya and I shared the pasta", the model would otherwise either create a person named "I" (which doesn't match normal names) or fail to link the consumer to the people array. Now it resolves to "Me" or correlates it correctly.

3. **Iteration 3: Strict Payer and Fallback Instructions**
   - *Prompt Change*: Instructed the model to: *"Extract who paid the bill. If no payer is named, return an empty string "". Ensure every extracted item is mapped in consumption_mappings."*
   - *Why*: Prevent parser crashes on missing `payer` fields by providing a type-safe empty string fallback, and ensure the consumption mapping contains all receipt items.

---

## Architectural Decision: Arithmetic

### Question: Did you let the model do the arithmetic, or extract structured data and compute the totals in code? Why?

**Answer:** We chose to **extract structured data and compute all totals in deterministic code**. 

### Why?
1. **Mathematical Precision**: LLMs are probabilistic text-prediction engines. They frequently fail at basic arithmetic, floating-point division, and complex proportions—especially when distributing multi-person shares of service charges and taxes.
2. **Rounding & Reconciliation Mismatches**: When dividing bills (e.g., splitting a ₹100 item among 3 people, yielding ₹33.33 each), standard rounding can lead to a sum of totals that is off by a few rupees compared to the bill's grand total. Solving this discrepancy requires comparing the sum of rounded totals to the grand total and allocating the leftover paise to the person with the largest remainder. An LLM cannot guarantee this level of reconciliation.
3. **Auditability and Flags**: By writing the calculation engine in code, we can compare the computed parts (items sum, service, tax, discount) against the receipt's printed totals and raise flags if they don't match. This satisfies the requirement to flag arithmetic discrepancies instead of guessing.
4. **Testability**: Computing in code allows us to write unit tests (like `test.js`) to assert calculation correctness on sample inputs, ensuring 100% reliability.
