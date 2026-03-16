import React, { useState, useRef, useEffect } from "react";
import ReceiptTemplate from "./templates/ReceiptTemplate";
import ReceiptHistory from "./components/ReceiptHistory";
import { generatePDFFromElement, downloadPDF, blobToBase64 } from "./utils/pdfUtils";
import { sendReceiptEmail } from "./utils/emailUtils";
import { peekNextReceiptNo, consumeReceiptNo, numberToWords } from "./utils/receiptUtils";
import { saveReceipt } from "./utils/storage";
import { getSavedScriptUrl, saveScriptUrl, sheetTestConnection } from "./utils/sheets";
import "./App.css";

let signatureImg = null;
try { signatureImg = new URL("./assets/signature.png", import.meta.url).href; } catch {}
let logoImg = null;
try { logoImg = new URL("./assets/logo.png", import.meta.url).href; } catch {}

function Field({ label, children, required, hint, span2 }) {
  return (
    <div className={`field-group${span2 ? " span2" : ""}`}>
      <label className="field-label">
        {label}{required && <span className="required"> *</span>}
      </label>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

// ── Inline Sheets Setup Banner (shown at top of Records tab) ──────
function SheetsBanner() {
  const [url, setUrl] = useState(getSavedScriptUrl());
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [connected, setConnected] = useState(!!getSavedScriptUrl());

  const handleSave = async () => {
    if (!url.trim()) return;
    setTesting(true);
    setMsg({ type: "", text: "" });
    try {
      const title = await sheetTestConnection(url.trim());
      saveScriptUrl(url.trim());
      setConnected(true);
      setMsg({ type: "success", text: `✓ Connected to "${title}"! All receipts will now sync to Google Sheets.` });
    } catch (err) {
      setMsg({ type: "error", text: "Connection failed: " + err.message });
    } finally {
      setTesting(false);
    }
  };

  if (connected) {
    return (
      <div className="sheets-connected-bar">
        <span>☁️</span>
        <span>Syncing to Google Sheets</span>
        <a href="https://docs.google.com/spreadsheets" target="_blank" rel="noopener noreferrer" className="sheets-open-link">
          Open Sheet ↗
        </a>
        <button className="sheets-disconnect" onClick={() => { saveScriptUrl(""); setConnected(false); setUrl(""); }}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="sheets-setup-bar">
      <div className="sheets-setup-top">
        <div>
          <strong>💾 Storage: Local only</strong>
          <span className="sheets-setup-hint"> — Connect Google Sheets to access receipts from any device</span>
        </div>
      </div>
      <div className="sheets-setup-row">
        <input
          type="url"
          className="input sheets-url-input"
          placeholder="Paste your Apps Script Web App URL here  (https://script.google.com/macros/s/…/exec)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button className="btn btn-primary" onClick={handleSave} disabled={testing || !url.trim()}>
          {testing ? "⏳ Testing…" : "Connect"}
        </button>
        <a
          href="https://script.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost"
          style={{ textDecoration: "none", fontSize: "12px" }}
        >
          Get URL ↗
        </a>
      </div>
      {msg.text && <div className={`status-msg status-${msg.type}`} style={{ margin: "8px 0 0" }}>{msg.text}</div>}
      <details className="sheets-howto">
        <summary>How to get the Apps Script URL</summary>
        <ol>
          <li>Open <strong>BSS Receipts</strong> sheet → <strong>Extensions → Apps Script</strong></li>
          <li>Delete existing code → paste contents of <code>GOOGLE_APPS_SCRIPT.js</code> → Save</li>
          <li><strong>Deploy → New deployment → Web app</strong></li>
          <li>Execute as: <strong>Me</strong> · Who has access: <strong>Anyone</strong> → Deploy → Authorize</li>
          <li>Copy the <strong>Web App URL</strong> and paste it above</li>
        </ol>
      </details>
    </div>
  );
}

const EMPTY_FORM = {
  receiptNo: "",
  date: new Date().toISOString().slice(0, 10),
  receivedFrom: "",
  panNo1: "",
  panNo2: "",
  amountInWords: "",
  amountInDigits: "",
  paymentMode: "Cash",
  chequeNo: "",
  drawnOn: "",
  chequeDate: "",
};

export default function App() {
  const templateRef = useRef(null);
  const [tab, setTab] = useState("new");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [recipientEmail, setRecipientEmail] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setForm((f) => ({ ...f, receiptNo: peekNextReceiptNo() }));
  }, []);

  useEffect(() => {
    if (form.amountInDigits) {
      setForm((f) => ({ ...f, amountInWords: numberToWords(form.amountInDigits) }));
    } else {
      setForm((f) => ({ ...f, amountInWords: "" }));
    }
  }, [form.amountInDigits]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const panFields = ["panNo1", "panNo2"];
    setForm((f) => ({ ...f, [name]: panFields.includes(name) ? value.toUpperCase() : value }));
  };

  const persistAndAdvance = (currentReceiptNo, emailedTo = null) => {
    const record = {
      ...form,
      receiptNo: currentReceiptNo,
      createdAt: new Date().toISOString(),
      ...(emailedTo ? { emailedTo } : {}),
    };
    saveReceipt(record);
    consumeReceiptNo();
    setForm((f) => ({ ...f, receiptNo: peekNextReceiptNo() }));
  };

  const handleSave = () => {
    if (!form.receivedFrom || !form.amountInDigits) {
      setStatus({ type: "error", message: "Please fill in Received From and Amount fields." });
      return;
    }
    const currentReceiptNo = form.receiptNo;
    persistAndAdvance(currentReceiptNo);
    setStatus({ type: "success", message: `✓ Receipt #${currentReceiptNo} saved to records!` });
  };

  const handleGeneratePDF = async () => {
    if (!form.receivedFrom || !form.amountInDigits) {
      setStatus({ type: "error", message: "Please fill in Received From and Amount fields." });
      return;
    }
    setIsGenerating(true);
    setStatus({ type: "", message: "" });
    try {
      await new Promise((r) => setTimeout(r, 300));
      const currentReceiptNo = form.receiptNo;
      const { pdf, fileName } = await generatePDFFromElement(templateRef.current, currentReceiptNo);
      downloadPDF(pdf, fileName);
      persistAndAdvance(currentReceiptNo);
      setStatus({ type: "success", message: `✓ Receipt #${currentReceiptNo} saved & downloaded!` });
    } catch (err) {
      setStatus({ type: "error", message: "PDF error: " + err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAndEmail = async () => {
    if (!form.receivedFrom || !form.amountInDigits) {
      setStatus({ type: "error", message: "Please fill in Received From and Amount fields." });
      return;
    }
    if (!recipientEmail) {
      setStatus({ type: "error", message: "Please enter a recipient email address." });
      return;
    }
    setIsGenerating(true);
    setIsSending(true);
    setStatus({ type: "", message: "" });
    try {
      await new Promise((r) => setTimeout(r, 300));
      const currentReceiptNo = form.receiptNo;
      const { pdf, fileName, blob } = await generatePDFFromElement(templateRef.current, currentReceiptNo);
      downloadPDF(pdf, fileName);
      persistAndAdvance(currentReceiptNo, recipientEmail);
      setStatus({ type: "info", message: "📧 Sending email via Gmail..." });
      await sendReceiptEmail({ toEmail: recipientEmail, receiptNo: currentReceiptNo, amountInDigits: form.amountInDigits, receivedFrom: form.receivedFrom, pdfBlob: blob });
      setStatus({ type: "success", message: `✓ Receipt #${currentReceiptNo} saved, downloaded & emailed to ${recipientEmail}` });
    } catch (err) {
      setStatus({ type: "error", message: "Error: " + err.message });
    } finally {
      setIsGenerating(false);
      setIsSending(false);
    }
  };

  const handleReset = () => {
    const currentReceiptNo = form.receiptNo;
    setForm({ ...EMPTY_FORM, receiptNo: currentReceiptNo, date: new Date().toISOString().slice(0, 10) });
    setRecipientEmail("");
    setStatus({ type: "", message: "" });
  };

  const isCheque = form.paymentMode === "Cheque" || form.paymentMode === "D.D";

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <span className="header-badge">OFFICIAL</span>
          <div style={{ flex: 1 }}>
            <h1 className="header-title">Bright Scholar School — Receipt Generator</h1>
            <p className="header-sub">Generate & email official Election Fund receipts</p>
          </div>
          <div className="header-tabs">
            <button className={`header-tab${tab === "new" ? " active" : ""}`} onClick={() => setTab("new")}>
              ✏️ New Receipt
            </button>
            <button className={`header-tab${tab === "history" ? " active" : ""}`} onClick={() => setTab("history")}>
              🗂️ Records
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">

        {/* ══ HISTORY TAB ══ */}
        {tab === "history" && (
          <>
            <SheetsBanner />
            <ReceiptHistory onNewReceipt={() => setTab("new")} />
          </>
        )}

        {/* ══ NEW RECEIPT TAB ══ */}
        {tab === "new" && (
          <div className="layout">
            <section className="form-panel">
              <h2 className="panel-title"><span className="panel-icon">📋</span> Receipt Details</h2>

              <div className="form-grid">
                <Field label="Receipt No." required hint="Auto-generated — never editable">
                  <input type="text" name="receiptNo" value={form.receiptNo} readOnly className="input receipt-no-input" />
                </Field>

                <Field label="Date" required>
                  <input type="date" name="date" value={form.date} onChange={handleChange} className="input" />
                </Field>

                <Field label="Received with thanks from M/s." required span2>
                  <input type="text" name="receivedFrom" value={form.receivedFrom} onChange={handleChange} className="input" placeholder="Full name / Organisation name" />
                </Field>

                <Field label="PAN No. (Donor)">
                  <input type="text" name="panNo1" value={form.panNo1} onChange={handleChange} className="input pan-input" placeholder="ABCDE1234F" maxLength={10} />
                </Field>

                <Field label="PAN No. (Organisation)">
                  <input type="text" name="panNo2" value={form.panNo2} onChange={handleChange} className="input pan-input" placeholder="ABCDE1234F" maxLength={10} />
                </Field>

                <Field label="Amount (₹)" required>
                  <input type="number" name="amountInDigits" value={form.amountInDigits} onChange={handleChange} className="input amount-input" placeholder="e.g. 50000" min="0" />
                </Field>

                <Field label="Amount in Words" hint="Auto-filled">
                  <input type="text" name="amountInWords" value={form.amountInWords} onChange={handleChange} className="input" placeholder="Auto-fills from amount" />
                </Field>

                <Field label="Payment Mode" required span2>
                  <div className="payment-mode-group">
                    {["Cash", "Cheque", "D.D", "NEFT/RTGS", "UPI"].map((mode) => (
                      <label key={mode} className={`mode-pill${form.paymentMode === mode ? " active" : ""}`}>
                        <input type="radio" name="paymentMode" value={mode} checked={form.paymentMode === mode} onChange={handleChange} style={{ display: "none" }} />
                        {mode}
                      </label>
                    ))}
                  </div>
                </Field>

                {isCheque && (
                  <>
                    <Field label={`${form.paymentMode} No.`}>
                      <input type="text" name="chequeNo" value={form.chequeNo} onChange={handleChange} className="input" placeholder="Cheque / DD number" />
                    </Field>
                    <Field label={`${form.paymentMode} Date`}>
                      <input type="date" name="chequeDate" value={form.chequeDate} onChange={handleChange} className="input" />
                    </Field>
                    <Field label="Drawn On (Bank & Branch)" span2>
                      <input type="text" name="drawnOn" value={form.drawnOn} onChange={handleChange} className="input" placeholder="Bank name and branch" />
                    </Field>
                  </>
                )}
              </div>

              <div className="divider" />
              <div className="email-section">
                <h3 className="email-title"><span>📧</span> Send to Email for Official Records</h3>
                <p className="email-desc">PDF will be sent via your connected Gmail.</p>
                <div className="form-grid" style={{ padding: "0" }}>
                  <Field label="Recipient Email Address" span2>
                    <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} className="input" placeholder="e.g. youroffice@gmail.com" />
                  </Field>
                </div>
              </div>

              {status.message && (
                <div className={`status-msg status-${status.type}`}>
                  {status.message}
                  {status.type === "success" && (
                    <button className="status-link" onClick={() => setTab("history")}>View Records →</button>
                  )}
                </div>
              )}

              <div className="btn-row">
                <button className="btn btn-ghost" onClick={handleReset} disabled={isGenerating}>Reset</button>
                <button className="btn btn-save" onClick={handleSave} disabled={isGenerating}>✓ Save Receipt</button>
                <button className="btn btn-primary" onClick={handleGeneratePDF} disabled={isGenerating}>
                  {isGenerating && !isSending ? "⏳ Generating…" : "⬇ Save & Download PDF"}
                </button>
                <button className="btn btn-accent" onClick={handleGenerateAndEmail} disabled={isGenerating || !recipientEmail}>
                  {isSending ? "⏳ Sending…" : "📧 Save & Email"}
                </button>
              </div>
            </section>

            <section className="preview-panel">
              <h2 className="panel-title"><span className="panel-icon">👁</span> Live Preview</h2>
              <div className="preview-outer">
                <div className="preview-inner">
                  <ReceiptTemplate ref={templateRef} data={form} signatureUrl={signatureImg} logo={logoImg} />
                </div>
              </div>
              <p className="preview-note">
                Signature: <code>src/assets/signature.png</code> &nbsp;|&nbsp; Logo: <code>src/assets/logo.png</code>
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}