export function formatNumber(n, useHindiDigits = false) {
  if (n == null) return '-';
  const num = Number(n);
  if (!Number.isFinite(num)) return '-';
  if (useHindiDigits) {
    // Convert to Indian-style groupings and then replace digits with Devanagari digits
    const en = num.toLocaleString('en-IN');
    const devanagariMap = { '0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९', ',':',' };
    return en.split('').map(ch => devanagariMap[ch] || ch).join('');
  }
  return num.toLocaleString('en-IN');
}
