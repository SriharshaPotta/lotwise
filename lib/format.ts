const MINUS = "−";
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** $12,980.00 / −$1,840.00 (a true minus sign, never a hyphen). */
export function money(n: number, { whole = false } = {}): string {
  const s = (whole ? usdWhole : usd).format(Math.abs(n));
  return n <= -0.005 ? MINUS + s : s;
}

/** "Nov 3" */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "November 15" (prose). */
export function longDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${d}`;
}

/** "OCT 15 2026" (receipts and stamps only). */
export function receiptDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1].toUpperCase()} ${d} ${y}`;
}
