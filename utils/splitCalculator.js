/**
 * Deterministic Split Calculator
 * Performs fair splitting calculations based on the rules:
 * 1. Each person pays for items they consumed.
 * 2. Shared items split equally.
 * 3. Tax + service charge allocated proportional to pre-tax food subtotal.
 * 4. Bill-level discount allocated proportional to subtotal.
 * 5. Round to the rupee; state in assumptions who absorbs leftover paise.
 */

export function calculateSplit(extractedData) {
  const flags = [];
  const assumptions = [];

  // 1. Basic properties extraction and sanitization
  const items = extractedData.items || [];
  const people = (extractedData.people || []).map(p => p.trim());
  const payer = extractedData.payer ? extractedData.payer.trim() : null;
  const grandTotal = Math.round(extractedData.grand_total || 0);

  const serviceCharge = extractedData.service_charge || 0;
  const discount = extractedData.discount || 0;
  const tax = extractedData.tax || 0;

  if (people.length === 0) {
    return {
      per_person: [],
      grand_total: grandTotal,
      reconciliation: { sum_of_person_totals: 0, matches_bill: false },
      paid_by: payer,
      settle_up: [],
      assumptions: ["No people specified in input"],
      flags: ["No people found in the description. Split cannot be calculated."]
    };
  }

  if (!payer) {
    flags.push("No payer specified in the description. Settle-up transactions could not be generated.");
  }

  // 2. Validate extracted items and calculate total food cost
  let computedSubtotal = 0;
  items.forEach(item => {
    computedSubtotal += item.total_price;
  });

  const printedSubtotal = extractedData.subtotal || computedSubtotal;
  if (Math.abs(computedSubtotal - printedSubtotal) > 0.01) {
    flags.push(`Extracted line items sum to ₹${computedSubtotal.toFixed(2)} but printed subtotal is ₹${printedSubtotal.toFixed(2)} — ₹${Math.abs(printedSubtotal - computedSubtotal).toFixed(2)} unexplained.`);
  }

  // 3. Initialize person breakdown objects
  const personBreakdowns = {};
  people.forEach(name => {
    personBreakdowns[name] = {
      name,
      items: [],
      subtotal: 0,
      tax_share: 0,
      service_share: 0,
      discount_share: 0,
      total: 0
    };
  });

  // 4. Map items to consumers
  const mappings = extractedData.consumption_mappings || [];
  items.forEach(item => {
    // Find consumer mapping for this item (case-insensitive matching)
    const mapping = mappings.find(m => m.item_name.toLowerCase().trim() === item.name.toLowerCase().trim())
      || mappings.find(m => item.name.toLowerCase().includes(m.item_name.toLowerCase().trim()) || m.item_name.toLowerCase().includes(item.name.toLowerCase().trim()));

    let consumers = [];
    if (mapping && Array.isArray(mapping.consumers) && mapping.consumers.length > 0) {
      // Filter only people who are in our main people list
      consumers = mapping.consumers
        .map(c => c.trim())
        .filter(c => people.some(p => p.toLowerCase() === c.toLowerCase()));
      
      // Resolve casing to match the original name in the people list
      consumers = consumers.map(c => people.find(p => p.toLowerCase() === c.toLowerCase()));
    }

    // Fallback: If no consumers mapped, split among everyone
    if (consumers.length === 0) {
      consumers = [...people];
      flags.push(`Item "${item.name}" was not mapped in description, split equally among everyone.`);
    }

    const shareCount = consumers.length;
    const priceShare = item.total_price / shareCount;

    consumers.forEach(consumer => {
      const pData = personBreakdowns[consumer];
      pData.subtotal += priceShare;
      if (shareCount === 1) {
        pData.items.push(item.name);
      } else {
        // Use nice fraction formatting
        pData.items.push(`${item.name} (1/${shareCount})`);
      }
    });
  });

  // 5. Total computed subtotal from people (should equal computedSubtotal)
  let totalPersonSubtotal = 0;
  people.forEach(name => {
    totalPersonSubtotal += personBreakdowns[name].subtotal;
  });

  if (totalPersonSubtotal === 0) {
    totalPersonSubtotal = 1; // Prevent division by zero
  }

  // 6. Allocate tax, service, discount proportionally
  const exactTotals = {};
  people.forEach(name => {
    const pData = personBreakdowns[name];
    const ratio = pData.subtotal / totalPersonSubtotal;

    pData.service_share = serviceCharge * ratio;
    // Discount share should be stored as negative as per example output
    pData.discount_share = -discount * ratio;
    pData.tax_share = tax * ratio;

    exactTotals[name] = pData.subtotal + pData.service_share + pData.discount_share + pData.tax_share;
  });

  // 7. Round to nearest rupee and accumulate
  let sumOfPersonTotals = 0;
  const roundedTotals = {};
  people.forEach(name => {
    const rounded = Math.round(exactTotals[name]);
    roundedTotals[name] = rounded;
    sumOfPersonTotals += rounded;
  });

  // 8. Reconcile rounding to match grand total exactly
  let diff = grandTotal - sumOfPersonTotals;
  if (diff !== 0) {
    // Sort people by their rounding discrepancy (exact - rounded)
    // If diff > 0, we need to add money. Sort descending (closest to being rounded up).
    // If diff < 0, we need to subtract money. Sort ascending (closest to being rounded down).
    const discrepancies = people.map(name => ({
      name,
      discrepancy: exactTotals[name] - roundedTotals[name]
    }));

    if (diff > 0) {
      discrepancies.sort((a, b) => b.discrepancy - a.discrepancy);
      for (let i = 0; i < diff && i < discrepancies.length; i++) {
        const name = discrepancies[i].name;
        const oldRounded = roundedTotals[name];
        roundedTotals[name] += 1;
        const paiseDiff = (exactTotals[name] - oldRounded).toFixed(2);
        assumptions.push(`${name} absorbed the leftover paise (adjusted by +1 rupee to reconcile round-off). Original exact share: ₹${exactTotals[name].toFixed(2)}, rounded: ₹${oldRounded}`);
      }
    } else {
      discrepancies.sort((a, b) => a.discrepancy - b.discrepancy);
      const absDiff = Math.abs(diff);
      for (let i = 0; i < absDiff && i < discrepancies.length; i++) {
        const name = discrepancies[i].name;
        const oldRounded = roundedTotals[name];
        roundedTotals[name] -= 1;
        const paiseDiff = (oldRounded - exactTotals[name]).toFixed(2);
        assumptions.push(`${name} absorbed the leftover paise (adjusted by -1 rupee to reconcile round-off). Original exact share: ₹${exactTotals[name].toFixed(2)}, rounded: ₹${oldRounded}`);
      }
    }
  } else {
    assumptions.push("No rounding adjustment needed; exact totals split clean.");
  }

  // 9. Assign final totals to personBreakdowns (rounded and reconciled)
  people.forEach(name => {
    const pData = personBreakdowns[name];
    pData.subtotal = Math.round(pData.subtotal);
    pData.service_share = Math.round(pData.service_share);
    pData.discount_share = Math.round(pData.discount_share);
    pData.tax_share = Math.round(pData.tax_share);
    pData.total = roundedTotals[name];
  });

  const finalSumOfPersonTotals = Object.values(roundedTotals).reduce((a, b) => a + b, 0);
  const matchesBill = finalSumOfPersonTotals === grandTotal;

  // Validate grand total against printed parts
  const computedGrandTotal = printedSubtotal + serviceCharge - discount + tax;
  if (Math.abs(grandTotal - computedGrandTotal) > 0.01) {
    flags.push(`Extracted line items + charges sum to ₹${computedGrandTotal.toFixed(2)} but printed total is ₹${grandTotal} — ₹${Math.abs(grandTotal - computedGrandTotal).toFixed(2)} unexplained.`);
  }

  // 10. Generate Settle Up transactions
  const settleUp = [];
  if (payer) {
    // Verify if payer is in the people list
    const payerResolvedName = people.find(p => p.toLowerCase() === payer.toLowerCase());
    
    // Net balance = paid_amount - total_cost
    // Payer paid grandTotal, everyone else paid 0
    const balances = {};
    people.forEach(name => {
      const paid = (payerResolvedName && name === payerResolvedName) ? grandTotal : 0;
      balances[name] = paid - roundedTotals[name];
    });

    // If payer is NOT in the people list, they paid grandTotal and are owed grandTotal
    if (!payerResolvedName) {
      balances[payer] = grandTotal;
    }

    // Separate debtors and creditors
    const debtors = [];
    const creditors = [];

    Object.keys(balances).forEach(name => {
      const bal = balances[name];
      if (bal < -0.01) {
        debtors.push({ name, balance: bal });
      } else if (bal > 0.01) {
        creditors.push({ name, balance: bal });
      }
    });

    // Sort debtors ascending (largest debt first) and creditors descending (largest credit first)
    debtors.sort((a, b) => a.balance - b.balance);
    creditors.sort((a, b) => b.balance - a.balance);

    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];

      const amountToTransfer = Math.min(Math.abs(debtor.balance), creditor.balance);
      if (amountToTransfer > 0.01) {
        settleUp.push({
          from: debtor.name,
          to: creditor.name,
          amount: Math.round(amountToTransfer)
        });
      }

      debtor.balance += amountToTransfer;
      creditor.balance -= amountToTransfer;

      if (Math.abs(debtor.balance) < 0.01) dIdx++;
      if (Math.abs(creditor.balance) < 0.01) cIdx++;
    }
  }

  // 11. Final output format matching requested shape
  return {
    per_person: people.map(name => personBreakdowns[name]),
    grand_total: grandTotal,
    reconciliation: {
      sum_of_person_totals: finalSumOfPersonTotals,
      matches_bill: matchesBill
    },
    paid_by: payer || "Unknown",
    settle_up: settleUp,
    assumptions: assumptions,
    flags: flags
  };
}
