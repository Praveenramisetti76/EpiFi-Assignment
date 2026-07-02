import { GoogleGenAI } from '@google/genai';

/**
 * Calls Gemini API to extract structured bill and mapping data from receipt and description.
 * @param {string} base64Image - Base64 encoded receipt image bytes (no data URI prefix)
 * @param {string} description - The plain-English description of who ate what and who paid.
 * @returns {Promise<object>} Extracted structured data
 */
export async function extractReceiptData(base64Image, description) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set. Please add it to your .env file.");
  }

  // Initialize the GenAI client
  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const prompt = `
You are a receipt parsing and expense mapping system.
Analyze the provided receipt image and the plain-English description of who had what.

Extract the following structured data exactly matching the provided JSON schema:
1. items: List all food and drink items from the receipt. Do NOT include subtotal, tax, GST, service charge, round-off, or discounts as items.
   - For each item, extract the name (string), quantity (integer, default to 1 if not clear), and total_price (number, the total printed price for that line item).
2. subtotal: The printed subtotal on the receipt (before tax, service charge, and discounts).
3. service_charge: The service charge amount printed on the receipt. If none is printed, set to 0.
4. discount: The total discount amount printed on the receipt. If none is printed, set to 0.
5. tax: The total tax/GST amount printed on the receipt. Include CGST + SGST if separated. If none, set to 0.
6. grand_total: The printed grand total on the receipt (rounded to a whole number or as printed).
7. people: List of unique names of people mentioned in the description.
   - Resolve pronouns and phrases like "the rest of us", "me", "I", "we", "three of us" based on context.
   - If "I" or "me" is used in the description, extract this person as "Me" unless the context indicates a specific name.
8. payer: Who paid the bill. Extract this name from the description (e.g., "Priya paid"). If no payer is named, return an empty string "".
9. consumption_mappings: Map each extracted receipt item to the list of people who shared it based on the description.
   - For each item, provide the "item_name" (must match or be similar to the name in the "items" list) and "consumers" (array of strings, containing names from the "people" list).
   - If an item was shared by everyone or is "common", map it to the full list of people.
   - If a person skipped an item, exclude them from its consumers.
   - If the description does not mention an item, leave "consumers" empty or map it to everyone.

Description: "${description}"
`;

  // Construct inline image parts
  const contents = [
    {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg"
      }
    },
    prompt
  ];

  // Define structured output schema using OpenAPI 3.0 format supported by Gemini
  const schema = {
    type: "OBJECT",
    properties: {
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            quantity: { type: "INTEGER" },
            total_price: { type: "NUMBER" }
          },
          required: ["name", "quantity", "total_price"]
        }
      },
      subtotal: { type: "NUMBER" },
      service_charge: { type: "NUMBER" },
      discount: { type: "NUMBER" },
      tax: { type: "NUMBER" },
      grand_total: { type: "NUMBER" },
      people: {
        type: "ARRAY",
        items: { type: "STRING" }
      },
      payer: { type: "STRING" },
      consumption_mappings: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            item_name: { type: "STRING" },
            consumers: {
              type: "ARRAY",
              items: { type: "STRING" }
            }
          },
          required: ["item_name", "consumers"]
        }
      }
    },
    required: [
      "items",
      "subtotal",
      "service_charge",
      "discount",
      "tax",
      "grand_total",
      "people",
      "payer",
      "consumption_mappings"
    ]
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1
      }
    });

    const text = typeof response.text === 'function' ? response.text() : response.text;
    if (!text) {
      throw new Error("Empty response from Gemini API.");
    }

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error(`Failed to extract receipt data using Gemini: ${error.message}`);
  }
}
