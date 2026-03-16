/**
 * Google Sheets storage via Google Apps Script Web App.
 *
 * The Apps Script acts as a free serverless backend — it receives
 * receipt data from this app and writes/reads rows in your Google Sheet.
 *
 * COLUMNS in the Sheet (in order):
 * A: receiptNo | B: date | C: receivedFrom | D: panNo1 | E: panNo2
 * F: amountInDigits | G: amountInWords | H: paymentMode | I: chequeNo
 * J: drawnOn | K: chequeDate | L: emailedTo | M: createdAt
 */

const SCRIPT_URL_KEY = "sheets_script_url";

export function getSavedScriptUrl() {
  return localStorage.getItem(SCRIPT_URL_KEY) || "";
}

export function saveScriptUrl(url) {
  localStorage.setItem(SCRIPT_URL_KEY, url);
}

export function clearScriptUrl() {
  localStorage.removeItem(SCRIPT_URL_KEY);
}

function getScriptUrl() {
  const url = getSavedScriptUrl();
  if (!url) throw new Error("Google Sheets not configured. Please set up your Apps Script URL in Settings.");
  return url;
}

/** Append a new receipt row to the sheet */
export async function sheetSaveReceipt(receipt) {
  const url = getScriptUrl();
  const row = [
    receipt.receiptNo,
    receipt.date,
    receipt.receivedFrom,
    receipt.panNo1 || "",
    receipt.panNo2 || "",
    receipt.amountInDigits,
    receipt.amountInWords || "",
    receipt.paymentMode || "",
    receipt.chequeNo || "",
    receipt.drawnOn || "",
    receipt.chequeDate || "",
    receipt.emailedTo || "",
    receipt.createdAt || new Date().toISOString(),
  ];

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // Apps Script needs text/plain to avoid CORS preflight
    body: JSON.stringify({ action: "save", row }),
  });

  if (!resp.ok) throw new Error(`Sheet save failed: ${resp.status}`);
  const result = await resp.json();
  if (result.error) throw new Error(result.error);
  return result;
}

/** Update the emailedTo column for an existing receipt */
export async function sheetUpdateEmail(receiptNo, emailedTo) {
  const url = getScriptUrl();
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "updateEmail", receiptNo: String(receiptNo), emailedTo }),
  });
  if (!resp.ok) throw new Error(`Sheet update failed: ${resp.status}`);
}

/** Fetch all receipts from the sheet */
export async function sheetGetAllReceipts() {
  const url = getScriptUrl();
  const resp = await fetch(`${url}?action=getAll`, { method: "GET" });
  if (!resp.ok) throw new Error(`Sheet fetch failed: ${resp.status}`);
  const result = await resp.json();
  if (result.error) throw new Error(result.error);

  // Map rows back to receipt objects
  return (result.rows || []).map((r) => ({
    receiptNo: r[0],
    date: r[1],
    receivedFrom: r[2],
    panNo1: r[3],
    panNo2: r[4],
    amountInDigits: r[5],
    amountInWords: r[6],
    paymentMode: r[7],
    chequeNo: r[8],
    drawnOn: r[9],
    chequeDate: r[10],
    emailedTo: r[11],
    createdAt: r[12],
  })).reverse(); // newest first
}

/** Delete a receipt row by receiptNo */
export async function sheetDeleteReceipt(receiptNo) {
  const url = getScriptUrl();
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "delete", receiptNo: String(receiptNo) }),
  });
  if (!resp.ok) throw new Error(`Sheet delete failed: ${resp.status}`);
}

/** Test the connection — returns sheet title */
export async function sheetTestConnection(url) {
  const resp = await fetch(`${url}?action=ping`, { method: "GET" });
  if (!resp.ok) throw new Error(`Connection failed: HTTP ${resp.status}`);
  const result = await resp.json();
  if (result.error) throw new Error(result.error);
  return result.title || "Connected";
}