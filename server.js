import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractReceiptData } from './utils/geminiExtractor.js';
import { calculateSplit } from './utils/splitCalculator.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable CORS and JSON parsing
app.use(cors());
// Increase JSON payload limit to handle large base64 images
app.use(express.json({ limit: '10mb' }));

// Serve frontend static assets from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// POST /api/split endpoint
app.post('/api/split', async (req, res) => {
  try {
    const { receipt_base64, description } = req.body;

    if (!receipt_base64) {
      return res.status(400).json({
        error: "Missing required field 'receipt_base64'. Please upload a receipt image."
      });
    }

    if (!description) {
      return res.status(400).json({
        error: "Missing required field 'description'. Please write who had what."
      });
    }

    // Strip data-URI prefix if present in the base64 string
    let cleanBase64 = receipt_base64;
    if (cleanBase64.startsWith('data:')) {
      const commaIndex = cleanBase64.indexOf(',');
      if (commaIndex !== -1) {
        cleanBase64 = cleanBase64.substring(commaIndex + 1);
      }
    }
    // Remove whitespace/newlines if any
    cleanBase64 = cleanBase64.replace(/\s/g, '');

    console.log(`[API] Received split request. Description: "${description.substring(0, 60)}..."`);

    // Step 1: Call Gemini to extract structured receipt and consumption data
    const extractedData = await extractReceiptData(cleanBase64, description);
    
    console.log("[API] Extraction complete. Running split calculations...");
    console.log("Extracted Data:", JSON.stringify(extractedData, null, 2));

    // Step 2: Compute split using deterministic logic
    const result = calculateSplit(extractedData);

    console.log("[API] Calculations and reconciliation successful.");

    // Step 3: Return the calculated result
    return res.status(200).json(result);

  } catch (error) {
    console.error("[API Error]:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
      flags: [`API Error occurred: ${error.message}`],
      assumptions: [],
      per_person: [],
      grand_total: 0,
      reconciliation: { sum_of_person_totals: 0, matches_bill: false },
      paid_by: "Unknown",
      settle_up: []
    });
  }
});

// Fallback for SPA static routing or index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`Fair Split server is running on port ${PORT}`);
  console.log(`Local url: http://localhost:${PORT}`);
  console.log(`===============================================`);
});
