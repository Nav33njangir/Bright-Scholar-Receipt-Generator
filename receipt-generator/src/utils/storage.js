/**
 * Dual-layer storage:
 * - localStorage  → instant local cache (works offline, fast reads)
 * - Google Sheets → cloud backup via Apps Script (accessible from any device)
 *
 * Writes go to both. Reads prefer Sheets when configured, fall back to localStorage.
 */

import { sheetSaveReceipt, sheetUpdateEmail, sheetDeleteReceipt, sheetGetAllReceipts, getSavedScriptUrl } from "./sheets";

const PREFIX = "receipt:";
const INDEX_KEY = "receipt:index";

// ── localStorage helpers ──────────────────────────────────────────

function getIndex() {
  try { return JSON.parse(localStorage.getItem(INDEX_KEY) || "[]"); }
  catch { return []; }
}

function saveIndex(index) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

function localSave(receiptData) {
  const { receiptNo } = receiptData;
  if (!receiptNo) return;
  localStorage.setItem(PREFIX + receiptNo, JSON.stringify(receiptData));
  const index = getIndex();
  if (!index.includes(receiptNo)) {
    index.unshift(receiptNo);
    saveIndex(index);
  }
}

function localUpdateEmail(receiptNo, emailedTo) {
  const raw = localStorage.getItem(PREFIX + receiptNo);
  if (!raw) return;
  const record = JSON.parse(raw);
  record.emailedTo = emailedTo;
  localStorage.setItem(PREFIX + receiptNo, JSON.stringify(record));
}

function localGetAll() {
  return getIndex().map((no) => {
    try { return JSON.parse(localStorage.getItem(PREFIX + no)); }
    catch { return null; }
  }).filter(Boolean);
}

function localDelete(receiptNo) {
  localStorage.removeItem(PREFIX + receiptNo);
  saveIndex(getIndex().filter((n) => n !== receiptNo));
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Save receipt to localStorage immediately.
 * Also fires off a background save to Google Sheets if configured.
 * Returns a promise that resolves with { sheetSaved: true/false }
 */
export async function saveReceipt(receiptData) {
  const record = {
    ...receiptData,
    createdAt: receiptData.createdAt || new Date().toISOString(),
  };

  // Always save locally first — instant
  localSave(record);

  // Background sync to Sheets
  if (getSavedScriptUrl()) {
    try {
      await sheetSaveReceipt(record);
      return { sheetSaved: true };
    } catch (err) {
      console.warn("Google Sheets sync failed (saved locally):", err.message);
      return { sheetSaved: false, error: err.message };
    }
  }
  return { sheetSaved: false };
}

/**
 * Update emailedTo — both layers
 */
export async function updateReceiptEmail(receiptNo, emailedTo) {
  localUpdateEmail(receiptNo, emailedTo);
  if (getSavedScriptUrl()) {
    try { await sheetUpdateEmail(receiptNo, emailedTo); } catch {}
  }
}

/**
 * Get all receipts.
 * If Sheets is configured, fetch from there (cloud, always up-to-date).
 * Falls back to localStorage if Sheets fails or isn't configured.
 */
export async function getAllReceipts() {
  if (getSavedScriptUrl()) {
    try {
      const rows = await sheetGetAllReceipts();
      // Sync back to localStorage as cache
      rows.forEach((r) => localSave(r));
      return rows;
    } catch (err) {
      console.warn("Google Sheets fetch failed, using local cache:", err.message);
    }
  }
  return localGetAll();
}

/**
 * Synchronous local-only read — for immediate UI render before async fetch
 */
export function getAllReceiptsLocal() {
  return localGetAll();
}

/**
 * Delete receipt — both layers
 */
export async function deleteReceipt(receiptNo) {
  localDelete(receiptNo);
  if (getSavedScriptUrl()) {
    try { await sheetDeleteReceipt(receiptNo); } catch {}
  }
}