import React, { useState } from "react";
import { getSavedScriptUrl, saveScriptUrl, clearScriptUrl, sheetTestConnection } from "../utils/sheets";

export default function Settings({ onClose }) {
  const [url, setUrl] = useState(getSavedScriptUrl());
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [step, setStep] = useState(getSavedScriptUrl() ? "connected" : "setup");

  const handleTest = async () => {
    if (!url.trim()) { setStatus({ type: "error", msg: "Please paste your Apps Script URL first." }); return; }
    setTesting(true);
    setStatus({ type: "", msg: "" });
    try {
      const title = await sheetTestConnection(url.trim());
      saveScriptUrl(url.trim());
      setStatus({ type: "success", msg: `✓ Connected to "${title}" successfully!` });
      setStep("connected");
    } catch (err) {
      setStatus({ type: "error", msg: "Connection failed: " + err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = () => {
    clearScriptUrl();
    setUrl("");
    setStep("setup");
    setStatus({ type: "", msg: "" });
  };

  return (
    <div>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal" style={{ maxWidth: "600px", width: "94vw" }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">⚙️ Google Sheets Storage Setup</div>
            <div className="modal-sub">Connect a Google Sheet so receipts are saved to the cloud — accessible from any device</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>

          {step === "connected" ? (
            <div>
              <div className="setup-success-banner">
                <span style={{ fontSize: "24px" }}>✅</span>
                <div>
                  <div style={{ fontWeight: 700, color: "#166534" }}>Google Sheets Connected</div>
                  <div style={{ fontSize: "12px", color: "#15803d", marginTop: "2px" }}>All receipts are automatically saved to your Google Sheet</div>
                </div>
              </div>
              <div className="setup-url-display">
                <div style={{ fontSize: "11px", color: "var(--text-light)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Connected URL</div>
                <div style={{ fontSize: "12px", color: "var(--text-mid)", wordBreak: "break-all", fontFamily: "monospace" }}>{url}</div>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button className="btn btn-ghost" onClick={handleDisconnect}>Disconnect & Reconfigure</button>
                <a
                  href="https://docs.google.com/spreadsheets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ textDecoration: "none" }}
                >
                  Open Google Sheets ↗
                </a>
              </div>
            </div>
          ) : (
            <div>
              {/* Step-by-step instructions */}
              <div className="setup-steps">
                <div className="setup-step">
                  <div className="step-num">1</div>
                  <div>
                    <div className="step-title">Create a Google Sheet</div>
                    <div className="step-desc">
                      Go to{" "}
                      <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer">sheets.google.com</a>
                      {" "}→ click <strong>"Blank"</strong> → name it <strong>"BSS Receipts"</strong>
                    </div>
                  </div>
                </div>

                <div className="setup-step">
                  <div className="step-num">2</div>
                  <div>
                    <div className="step-title">Open Apps Script</div>
                    <div className="step-desc">
                      In your sheet, click <strong>Extensions → Apps Script</strong>. Delete all existing code.
                    </div>
                  </div>
                </div>

                <div className="setup-step">
                  <div className="step-num">3</div>
                  <div>
                    <div className="step-title">Paste the Script</div>
                    <div className="step-desc">
                      Download and paste the contents of <code>GOOGLE_APPS_SCRIPT.js</code> (included with your app files) into the Apps Script editor. Press <strong>Ctrl+S</strong> to save.
                    </div>
                  </div>
                </div>

                <div className="setup-step">
                  <div className="step-num">4</div>
                  <div>
                    <div className="step-title">Deploy as Web App</div>
                    <div className="step-desc">
                      Click <strong>Deploy → New deployment</strong> → Type: <strong>Web app</strong><br />
                      Set <strong>"Execute as: Me"</strong> and <strong>"Who has access: Anyone"</strong><br />
                      Click <strong>Deploy</strong> → Authorize → Allow
                    </div>
                  </div>
                </div>

                <div className="setup-step">
                  <div className="step-num">5</div>
                  <div>
                    <div className="step-title">Copy & Paste the Web App URL</div>
                    <div className="step-desc">
                      After deploying, copy the <strong>Web App URL</strong> (starts with <code>https://script.google.com/macros/s/…</code>) and paste it below.
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "20px" }}>
                <label className="field-label">Apps Script Web App URL <span className="required">*</span></label>
                <input
                  type="url"
                  className="input"
                  style={{ width: "100%", marginTop: "6px", fontFamily: "monospace", fontSize: "12px" }}
                  placeholder="https://script.google.com/macros/s/…/exec"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              {status.msg && (
                <div className={`status-msg status-${status.type}`} style={{ marginTop: "12px" }}>
                  {status.msg}
                </div>
              )}
            </div>
          )}
        </div>

        {step === "setup" && (
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleTest} disabled={testing || !url.trim()}>
              {testing ? "⏳ Testing…" : "Test & Save Connection"}
            </button>
          </div>
        )}
        {step === "connected" && (
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}