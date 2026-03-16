const RECEIPT_START = 26001;
const RECEIPT_STORAGE_KEY = "election_fund_receipt_counter";

export function peekNextReceiptNo() {
  const current = parseInt(localStorage.getItem(RECEIPT_STORAGE_KEY) || String(RECEIPT_START - 1), 10);
  return String(current + 1);
}

export function consumeReceiptNo() {
  const current = parseInt(localStorage.getItem(RECEIPT_STORAGE_KEY) || String(RECEIPT_START - 1), 10);
  const next = current + 1;
  localStorage.setItem(RECEIPT_STORAGE_KEY, String(next));
  return String(next);
}

export function numberToWords(num) {
  if (!num || isNaN(num)) return "";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  function convert(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  }

  const n = Math.floor(Number(num));
  const paise = Math.round((Number(num) - n) * 100);

  let result = convert(n) + " Rupees";
  if (paise > 0) {
    result += " and " + convert(paise) + " Paise";
  }
  return result + " Only";
}