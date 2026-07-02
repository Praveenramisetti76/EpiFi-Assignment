export function calculateSplit(extractedData) {
  const flags = [];
  const assumptions = [];
  const items = extractedData.items || [];
  let computedSubtotal = 0;
  items.forEach(item => { computedSubtotal += item.total_price; });
  
  const serviceCharge = extractedData.service_charge || 0;
  // Service charge logic
  return { computedSubtotal, serviceCharge };
}
