import React, { useState, useRef, useEffect } from "react";
import { getAllReceipts, getAllReceiptsLocal, deleteReceipt, updateReceiptEmail } from "../utils/storage";
import { getSavedScriptUrl } from "../utils/sheets";
import ReceiptTemplate from "../templates/ReceiptTemplate";
import { generatePDFFromElement, downloadPDF } from "../utils/pdfUtils";
import { sendReceiptEmail } from "../utils/emailUtils";

let signatureImg = null;
try { signatureImg = new URL("../assets/signature.png", import.meta.url).href; } catch {}
let logoImg = null;
try { logoImg = new URL("../assets/logo.png", import.meta.url).href; } catch {}

function formatDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
}

function formatAmount(val) {
  if (!val) return "—";
  return "₹ " + Number(val).toLocaleString("en-IN");
}

// ── Email Modal ───────────────────────────────────────────────────
function EmailModal({ receipt, onClose, onSent }) {
  const [email, setEmail] = useState(receipt.emailedTo || "");
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [sending, setSending] = useState(false);
  const hiddenRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  const handleSend = async () => {
    if (!email.trim()) { setStatus({ type: "error", msg: "Please enter an email address." }); return; }
    setSending(true);
    setStatus({ type: "", msg: "" });
    try {
      const { blob } = await generatePDFFromElement(hiddenRef.current, receipt.receiptNo);
      setStatus({ type: "info", msg: "📧 Sending via Gmail…" });
      await sendReceiptEmail({ toEmail: email.trim(), receiptNo: receipt.receiptNo, amountInDigits: receipt.amountInDigits, receivedFrom: receipt.receivedFrom, pdfBlob: blob });
      await updateReceiptEmail(receipt.receiptNo, email.trim());
      setStatus({ type: "success", msg: `✓ Sent to ${email.trim()}` });
      setTimeout(() => onSent(email.trim()), 1200);
    } catch (err) {
      setStatus({ type: "error", msg: "Error: " + err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1, pointerEvents: "none" }}>
        <ReceiptTemplate ref={hiddenRef} data={receipt} signatureUrl={signatureImg} logo={logoImg} />
      </div>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">📧 Send Receipt by Email</div>
            <div className="modal-sub">Receipt <strong>#{receipt.receiptNo}</strong> — {receipt.receivedFrom || "—"} — {formatAmount(receipt.amountInDigits)}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label className="field-label">Recipient Email Address <span className="required">*</span></label>
          <input
            type="email" className="input"
            style={{ width: "100%", marginTop: "6px" }}
            placeholder="e.g. donor@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            autoFocus
          />
          {receipt.emailedTo && (
            <p style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "6px" }}>
              Previously sent to: <strong>{receipt.emailedTo}</strong>
            </p>
          )}
        </div>
        {status.msg && <div className={`status-msg status-${status.type}`} style={{ margin: "0 20px 4px" }}>{status.msg}</div>}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={sending}>Cancel</button>
          <button className="btn btn-accent" onClick={handleSend} disabled={sending || !ready}>
            {sending ? "⏳ Sending…" : "📧 Send Email"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function ReceiptHistory({ onNewReceipt, onOpenSettings }) {
  const isSheetConfigured = !!getSavedScriptUrl();

  // Start with local cache instantly, then upgrade with Sheets data
  const [receipts, setReceipts] = useState(() => getAllReceiptsLocal());
  const [loading, setLoading] = useState(isSheetConfigured);
  const [syncError, setSyncError] = useState("");
  const [search, setSearch] = useState("");
  const [downloadingNo, setDownloadingNo] = useState(null);
  const [emailModal, setEmailModal] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const hiddenRef = useRef(null);

  // Fetch from Sheets on mount (if configured)
  useEffect(() => {
    if (!isSheetConfigured) return;
    getAllReceipts()
      .then((rows) => { setReceipts(rows); setSyncError(""); })
      .catch((err) => setSyncError(err.message))
      .finally(() => setLoading(false));
  }, [isSheetConfigured]);

  const filtered = receipts.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(r.receiptNo).includes(q) ||
      (r.receivedFrom || "").toLowerCase().includes(q) ||
      (r.panNo1 || "").toLowerCase().includes(q) ||
      (r.amountInDigits || "").includes(q)
    );
  });

  const handleDownload = async (receipt) => {
    setDownloadingNo(receipt.receiptNo);
    setPreviewData(receipt);
    await new Promise((r) => setTimeout(r, 400));
    try {
      const { pdf, fileName } = await generatePDFFromElement(hiddenRef.current, receipt.receiptNo);
      downloadPDF(pdf, fileName);
    } catch (err) {
      alert("Failed to generate PDF: " + err.message);
    } finally {
      setDownloadingNo(null);
      setPreviewData(null);
    }
  };

  const handleDelete = async (receiptNo) => {
    if (!window.confirm(`Delete Receipt #${receiptNo}? This cannot be undone.`)) return;
    await deleteReceipt(receiptNo);
    setReceipts((prev) => prev.filter((r) => r.receiptNo !== receiptNo));
  };

  const handleEmailSent = (receiptNo, emailedTo) => {
    setReceipts((prev) => prev.map((r) => r.receiptNo === receiptNo ? { ...r, emailedTo } : r));
    setEmailModal(null);
  };

  return (
    <div className="history-page">
      {previewData && (
        <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1 }}>
          <ReceiptTemplate ref={hiddenRef} data={previewData} signatureUrl={signatureImg} logo={logoImg} />
        </div>
      )}
      {emailModal && (
        <EmailModal
          receipt={emailModal}
          onClose={() => setEmailModal(null)}
          onSent={(sentTo) => handleEmailSent(emailModal.receiptNo, sentTo)}
        />
      )}

      {/* Header */}
      <div className="history-header">
        <div>
          <h2 className="history-title">Receipt Records</h2>
          <p className="history-sub">{receipts.length} receipt{receipts.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* Storage indicator */}
          {isSheetConfigured ? (
            <div className="storage-badge storage-cloud" title="Synced to Google Sheets">
              ☁️ Google Sheets
            </div>
          ) : (
            <button className="storage-badge storage-local" onClick={onOpenSettings} title="Click to connect Google Sheets">
              💾 Local only — Connect Sheets ↗
            </button>
          )}
          <button className="btn btn-primary" onClick={onNewReceipt}>+ New Receipt</button>
        </div>
      </div>

      {/* Sync error */}
      {syncError && (
        <div className="status-msg status-error" style={{ marginBottom: "14px" }}>
          ⚠️ Google Sheets sync error: {syncError} — showing local data
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="sheets-loading">
          <div className="sheets-spinner" />
          Fetching latest records from Google Sheets…
        </div>
      )}

      {/* Toolbar */}
      {!loading && (
        <>
          <div className="history-toolbar">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                type="text" className="search-input"
                placeholder="Search by receipt no., name, PAN, amount…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && <button className="search-clear" onClick={() => setSearch("")}>✕</button>}
            </div>
            <span className="history-count">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="history-empty">
              {receipts.length === 0 ? (
                <>
                  <div className="empty-icon">🗂️</div>
                  <div className="empty-title">No receipts yet</div>
                  <div className="empty-sub">Save your first receipt and it will appear here.</div>
                  <button className="btn btn-primary" style={{ marginTop: "16px" }} onClick={onNewReceipt}>Create First Receipt</button>
                </>
              ) : (
                <>
                  <div className="empty-icon">🔍</div>
                  <div className="empty-title">No results for "{search}"</div>
                  <div className="empty-sub">Try searching by receipt number, name, or PAN.</div>
                </>
              )}
            </div>
          ) : (
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Receipt No.</th>
                    <th>Date</th>
                    <th>Received From</th>
                    <th>PAN (Donor)</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Emailed To</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.receiptNo} className="history-row">
                      <td><span className="receipt-no-badge">#{r.receiptNo}</span></td>
                      <td className="text-mid">{formatDate(r.date)}</td>
                      <td className="text-bold">{r.receivedFrom || "—"}</td>
                      <td className="text-mono">{r.panNo1 || "—"}</td>
                      <td className="text-amount">{formatAmount(r.amountInDigits)}</td>
                      <td>
                        <span className={`mode-tag mode-${(r.paymentMode || "cash").toLowerCase().replace(/[^a-z]/g, "")}`}>
                          {r.paymentMode || "—"}
                        </span>
                      </td>
                      <td className="text-mid text-small">
                        {r.emailedTo
                          ? <span className="emailed-badge" title={r.emailedTo}>✓ {r.emailedTo}</span>
                          : <span className="not-emailed">Not sent</span>
                        }
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-action btn-download" onClick={() => handleDownload(r)} disabled={downloadingNo === r.receiptNo} title="Download PDF">
                            {downloadingNo === r.receiptNo ? "⏳" : "⬇"} PDF
                          </button>
                          <button className="btn-action btn-email" onClick={() => setEmailModal(r)} disabled={!!downloadingNo} title="Send by Email">
                            📧 Mail
                          </button>
                          <button className="btn-action btn-delete" onClick={() => handleDelete(r.receiptNo)} title="Delete">
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}