export function calculateSplit(extractedData) {
  const flags = [];
  const assumptions = [];
  const items = extractedData.items || [];
  let computedSubtotal = 0;
  items.forEach(item => { computedSubtotal += item.total_price; });
  return { computedSubtotal };
}
