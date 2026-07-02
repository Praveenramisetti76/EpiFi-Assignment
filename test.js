import { calculateSplit } from './utils/splitCalculator.js';

// --- Helper assert functions ---
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected: ${expected}, Got: ${actual}`);
  }
}

function runTests() {
  console.log("=========================================");
  console.log("Running Fair Split Mathematical Tests...");
  console.log("=========================================");

  // =========================================
  // TEST CASE 1: Brew & Bite Cafe (R1)
  // =========================================
  console.log("\n[Test 1] Brew & Bite Cafe (R1)...");
  const r1Input = {
    items: [
      { name: "Cappuccino", quantity: 1, total_price: 180 },
      { name: "Grilled Chicken Sandwich", quantity: 1, total_price: 260 },
      { name: "Penne Arrabiata", quantity: 1, total_price: 320 },
      { name: "Fresh Lime Soda", quantity: 1, total_price: 120 },
      { name: "Brownie", quantity: 1, total_price: 160 }
    ],
    subtotal: 1040,
    service_charge: 52,
    discount: 0,
    tax: 54.60,
    grand_total: 1147,
    people: ["Ravi", "Neha", "Sameer"],
    payer: "Sameer",
    consumption_mappings: [
      { item_name: "Cappuccino", consumers: ["Ravi"] },
      { item_name: "Grilled Chicken Sandwich", consumers: ["Ravi"] },
      { item_name: "Penne Arrabiata", consumers: ["Neha"] },
      { item_name: "Fresh Lime Soda", consumers: ["Neha"] },
      { item_name: "Brownie", consumers: ["Sameer"] }
    ]
  };

  const r1Result = calculateSplit(r1Input);
  
  // Reconcile verification
  assertEquals(r1Result.grand_total, 1147, "Grand total should be 1147");
  assertEquals(r1Result.reconciliation.matches_bill, true, "Reconciliation matches_bill should be true");
  assertEquals(r1Result.reconciliation.sum_of_person_totals, 1147, "Sum of person totals should be 1147");
  assertEquals(r1Result.paid_by, "Sameer", "Payer should be Sameer");

  // Individual totals verification
  const raviResult = r1Result.per_person.find(p => p.name === "Ravi");
  const nehaResult = r1Result.per_person.find(p => p.name === "Neha");
  const sameerResult = r1Result.per_person.find(p => p.name === "Sameer");

  // Ravi: exact 485.10 -> rounds to 485
  assertEquals(raviResult.total, 485, "Ravi total should be 485");
  // Neha: exact 485.10 -> rounds to 485
  assertEquals(nehaResult.total, 485, "Neha total should be 485");
  // Sameer: exact 176.40 -> rounds to 176 + 1 adjustment (absorbs leftover paise) -> 177
  assertEquals(sameerResult.total, 177, "Sameer total should be 177");

  // Settle-up verification
  assertEquals(r1Result.settle_up.length, 2, "Should have 2 transactions");
  const raviSettle = r1Result.settle_up.find(s => s.from === "Ravi");
  const nehaSettle = r1Result.settle_up.find(s => s.from === "Neha");
  assertEquals(raviSettle.to, "Sameer", "Ravi should pay Sameer");
  assertEquals(raviSettle.amount, 485, "Ravi should pay 485");
  assertEquals(nehaSettle.to, "Sameer", "Neha should pay Sameer");
  assertEquals(nehaSettle.amount, 485, "Neha should pay 485");

  console.log("R1 Test Passed!");

  // =========================================
  // TEST CASE 2: Tamarind Kitchen (R2)
  // =========================================
  console.log("\n[Test 2] Tamarind Kitchen (R2)...");
  const r2Input = {
    items: [
      { name: "Paneer Butter Masala", quantity: 1, total_price: 320 },
      { name: "Dal Makhani", quantity: 1, total_price: 260 },
      { name: "Butter Naan", quantity: 4, total_price: 240 },
      { name: "Jeera Rice", quantity: 1, total_price: 180 },
      { name: "Gulab Jamun", quantity: 2, total_price: 120 },
      { name: "Masala Papad", quantity: 2, total_price: 100 }
    ],
    subtotal: 1220,
    service_charge: 61,
    discount: 0,
    tax: 64.05,
    grand_total: 1345,
    people: ["Aman", "Priya", "Karan", "Sara"],
    payer: "Priya",
    consumption_mappings: [
      { item_name: "Gulab Jamun", consumers: ["Priya", "Karan"] },
      // The rest are common (we will map them to everyone)
      { item_name: "Paneer Butter Masala", consumers: ["Aman", "Priya", "Karan", "Sara"] },
      { item_name: "Dal Makhani", consumers: ["Aman", "Priya", "Karan", "Sara"] },
      { item_name: "Butter Naan", consumers: ["Aman", "Priya", "Karan", "Sara"] },
      { item_name: "Jeera Rice", consumers: ["Aman", "Priya", "Karan", "Sara"] },
      { item_name: "Masala Papad", consumers: ["Aman", "Priya", "Karan", "Sara"] }
    ]
  };

  const r2Result = calculateSplit(r2Input);
  
  assertEquals(r2Result.grand_total, 1345, "Grand total should be 1345");
  assertEquals(r2Result.reconciliation.matches_bill, true, "Reconciliation matches_bill should be true");
  assertEquals(r2Result.reconciliation.sum_of_person_totals, 1345, "Sum of person totals should be 1345");
  assertEquals(r2Result.paid_by, "Priya", "Payer should be Priya");

  const amanResult = r2Result.per_person.find(p => p.name === "Aman");
  const saraResult = r2Result.per_person.find(p => p.name === "Sara");
  const priyaResult = r2Result.per_person.find(p => p.name === "Priya");
  const karanResult = r2Result.per_person.find(p => p.name === "Karan");

  // Aman and Sara: exact 303.19 -> round to 303
  assertEquals(amanResult.total, 303, "Aman total should be 303");
  assertEquals(saraResult.total, 303, "Sara total should be 303");
  // Karan: exact 369.34 -> rounds to 369
  assertEquals(karanResult.total, 369, "Karan total should be 369");
  // Priya: exact 369.34 -> rounds to 369 + 1 adjustment (absorbs leftover paise) -> 370
  assertEquals(priyaResult.total, 370, "Priya total should be 370");

  // Settle-up
  assertEquals(r2Result.settle_up.length, 3, "Should have 3 transactions");
  const amanSettle = r2Result.settle_up.find(s => s.from === "Aman");
  const saraSettle = r2Result.settle_up.find(s => s.from === "Sara");
  const karanSettle = r2Result.settle_up.find(s => s.from === "Karan");
  
  assertEquals(amanSettle.to, "Priya", "Aman pays Priya");
  assertEquals(amanSettle.amount, 303, "Aman pays 303");
  assertEquals(saraSettle.to, "Priya", "Sara pays Priya");
  assertEquals(saraSettle.amount, 303, "Sara pays 303");
  assertEquals(karanSettle.to, "Priya", "Karan pays Priya");
  assertEquals(karanSettle.amount, 369, "Karan pays 369");

  console.log("R2 Test Passed!");

  // =========================================
  // TEST CASE 3: The Daily Grind (R3)
  // =========================================
  console.log("\n[Test 3] The Daily Grind (R3)...");
  const r3Input = {
    items: [
      { name: "Margherita Pizza", quantity: 1, total_price: 380 },
      { name: "Arrabiata Pasta", quantity: 1, total_price: 340 },
      { name: "Garlic Bread", quantity: 1, total_price: 160 },
      { name: "Craft Beer", quantity: 2, total_price: 500 },
      { name: "Virgin Mojito", quantity: 1, total_price: 180 }
    ],
    subtotal: 1560,
    service_charge: 78,
    discount: 0,
    tax: 81.90,
    grand_total: 1720,
    people: ["Ishaan", "Meera", "Rohit"],
    payer: "Rohit",
    consumption_mappings: [
      { item_name: "Margherita Pizza", consumers: ["Ishaan", "Meera", "Rohit"] },
      { item_name: "Arrabiata Pasta", consumers: ["Ishaan", "Meera", "Rohit"] },
      { item_name: "Garlic Bread", consumers: ["Ishaan", "Meera", "Rohit"] },
      { item_name: "Craft Beer", consumers: ["Ishaan", "Rohit"] },
      { item_name: "Virgin Mojito", consumers: ["Meera"] }
    ]
  };

  const r3Result = calculateSplit(r3Input);
  
  assertEquals(r3Result.grand_total, 1720, "Grand total should be 1720");
  assertEquals(r3Result.reconciliation.matches_bill, true, "Reconciliation matches_bill should be true");
  assertEquals(r3Result.reconciliation.sum_of_person_totals, 1720, "Sum of person totals should be 1720");
  assertEquals(r3Result.paid_by, "Rohit", "Payer should be Rohit");

  const ishaanResult = r3Result.per_person.find(p => p.name === "Ishaan");
  const meeraResult = r3Result.per_person.find(p => p.name === "Meera");
  const rohitResult = r3Result.per_person.find(p => p.name === "Rohit");

  // Ishaan & Rohit: exact 599.025 -> rounds to 599
  assertEquals(ishaanResult.total, 599, "Ishaan total should be 599");
  assertEquals(rohitResult.total, 599, "Rohit total should be 599");
  // Meera: exact 521.85 -> rounds to 522
  assertEquals(meeraResult.total, 522, "Meera total should be 522");

  console.log("R3 Test Passed!");

  // =========================================
  // TEST CASE 4: Spice Route (R4)
  // =========================================
  console.log("\n[Test 4] Spice Route (R4)...");
  const r4Input = {
    items: [
      { name: "Chicken Biryani", quantity: 2, total_price: 560 },
      { name: "Veg Biryani", quantity: 1, total_price: 240 },
      { name: "Mutton Rogan Josh", quantity: 1, total_price: 420 },
      { name: "Raita", quantity: 2, total_price: 120 },
      { name: "Soft Drinks", quantity: 3, total_price: 180 }
    ],
    subtotal: 1520,
    service_charge: 76,
    discount: 228,
    tax: 68.40,
    grand_total: 1436,
    people: ["Dev", "Nikhil", "Anjali", "Farah"],
    payer: "Anjali",
    consumption_mappings: [
      { item_name: "Chicken Biryani", consumers: ["Dev", "Nikhil"] },
      { item_name: "Veg Biryani", consumers: ["Anjali"] },
      { item_name: "Mutton Rogan Josh", consumers: ["Farah"] },
      { item_name: "Raita", consumers: ["Dev", "Nikhil", "Anjali", "Farah"] },
      { item_name: "Soft Drinks", consumers: ["Dev", "Nikhil", "Anjali", "Farah"] }
    ]
  };

  const r4Result = calculateSplit(r4Input);
  
  assertEquals(r4Result.grand_total, 1436, "Grand total should be 1436");
  assertEquals(r4Result.reconciliation.matches_bill, true, "Reconciliation matches_bill should be true");
  assertEquals(r4Result.reconciliation.sum_of_person_totals, 1436, "Sum of person totals should be 1436");
  assertEquals(r4Result.paid_by, "Anjali", "Payer should be Anjali");

  const devResult = r4Result.per_person.find(p => p.name === "Dev");
  const nikhilResult = r4Result.per_person.find(p => p.name === "Nikhil");
  const anjaliResult = r4Result.per_person.find(p => p.name === "Anjali");
  const farahResult = r4Result.per_person.find(p => p.name === "Farah");

  // Dev & Nikhil: exact 335.4868 -> rounds to 335
  assertEquals(devResult.total, 335, "Dev total should be 335");
  assertEquals(nikhilResult.total, 335, "Nikhil total should be 335");
  // Anjali: exact 297.6868 -> rounds to 298
  assertEquals(anjaliResult.total, 298, "Anjali total should be 298");
  // Farah: exact 467.796 -> rounds to 468
  assertEquals(farahResult.total, 468, "Farah total should be 468");

  console.log("R4 Test Passed!");

  console.log("\n=========================================");
  console.log("All Mathematical Split Tests Passed Successfully!");
  console.log("=========================================");
}

try {
  runTests();
} catch (err) {
  console.error("\nTEST RUNNER FAILURE:", err.message);
  process.exit(1);
}
