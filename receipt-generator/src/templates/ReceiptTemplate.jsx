import React, { forwardRef } from "react";

const ReceiptTemplate = forwardRef(({ data, logo, signatureUrl }, ref) => {
  const {
    receiptNo,
    date,
    receivedFrom,
    panNo1,
    panNo2,
    amountInWords,
    amountInDigits,
    chequeNo,
    drawnOn,
    chequeDate,
  } = data;

  return (
    <div
      ref={ref}
      style={{
        width: "794px",
        fontFamily: "Times New Roman",
        padding: "20px",
        background: "#fff",
      }}
    >
      <div style={{ border: "1px solid black", padding: "20px" }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 30px" }}>
          {logo && (
            <img src={logo} style={{ height: "50px", width: "auto" }} alt="logo" />
          )}
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#c0392b", fontWeight: "bold", fontSize: "26px", borderBottom: "1px solid #ccc", paddingBottom: "4px", marginBottom: "4px" }}>
              Bright Scholar School
            </div>
            <div style={{ fontSize: "11px" }}>
              Siya Ram Dungri, Shikshak Colony Amer, Jaipur Amer S.O, Rajasthan 302028
              <br />
              PAN No: AADAB2228H | Reg No: AADAB/2228/HF/20251
            </div>
          </div>
        </div>

        {/* RED & BLUE LINES */}
        <div style={{ marginTop: "8px" }}>
          <div style={{ borderTop: "3px solid red", marginBottom: "1px" }} />
          <div style={{ borderTop: "3px solid #1f4e79" }} />
        </div>

        <div style={{ height: "18px" }} />

        {/* RECEIPT NO & DATE */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div><b>Receipt No.</b> {receiptNo}</div>
          <div><b>Date:</b> {date}</div>
        </div>

        {/* RECEIVED FROM */}
        <div style={{ marginTop: "14px", display: "flex", alignItems: "baseline" }}>
          <span style={{ whiteSpace: "nowrap" }}>Received with thanks from M/s.</span>
          <span style={{ borderBottom: "1px solid black", flex: 1, marginLeft: "10px", minHeight: "18px", display: "inline-block" }}>
            {receivedFrom}
          </span>
        </div>

        {/* PAN FIELDS — two side by side */}
        <div style={{ display: "flex", gap: "20px", marginTop: "12px" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "baseline" }}>
            <span style={{ whiteSpace: "nowrap" }}>Pan No:</span>
            <span style={{ borderBottom: "1px solid black", flex: 1, marginLeft: "10px", minHeight: "18px", display: "inline-block" }}>
              {panNo1}
            </span>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "baseline" }}>
            <span style={{ whiteSpace: "nowrap" }}>Pan No:</span>
            <span style={{ borderBottom: "1px solid black", flex: 1, marginLeft: "10px", minHeight: "18px", display: "inline-block" }}>
              {panNo2}
            </span>
          </div>
        </div>

        {/* SUM OF RUPEES */}
        <div style={{ marginTop: "12px", display: "flex", alignItems: "baseline" }}>
          <span style={{ whiteSpace: "nowrap" }}>the sum of Rupees</span>
          <span style={{ borderBottom: "1px solid black", flex: 1, marginLeft: "10px", minHeight: "18px", display: "inline-block" }}>
            {amountInWords}
          </span>
        </div>

        {/* TOWARDS ELECTION FUND */}
        <div style={{ marginTop: "12px", display: "flex", alignItems: "baseline" }}>
          <span style={{ whiteSpace: "nowrap" }}>towards Election Fund by Cash/Cheque/D.D. No.</span>
          <span style={{ borderBottom: "1px solid black", flex: 1, marginLeft: "10px", minHeight: "18px", display: "inline-block" }}>
            {chequeNo}
          </span>
        </div>

        {/* DRAWN ON & DATED */}
        <div style={{ display: "flex", gap: "20px", marginTop: "12px" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "baseline" }}>
            <span style={{ whiteSpace: "nowrap" }}>Drawn on</span>
            <span style={{ borderBottom: "1px solid black", flex: 1, marginLeft: "10px", minHeight: "18px", display: "inline-block" }}>
              {drawnOn}
            </span>
          </div>
          <div style={{ width: "30%", display: "flex", alignItems: "baseline" }}>
            <span style={{ whiteSpace: "nowrap" }}>Dated</span>
            <span style={{ borderBottom: "1px solid black", flex: 1, marginLeft: "10px", minHeight: "18px", display: "inline-block" }}>
              {chequeDate}
            </span>
          </div>
        </div>

        {/* AMOUNT + SIGNATURE */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "30px", alignItems: "center" }}>
          <div style={{ border: "1px solid black", width: "150px", padding: "8px", textAlign: "left" }}>
            <span style={{ color: "red", fontWeight: "bold" }}>Rs.</span> {amountInDigits}
          </div>

          {/* Signature block — tight, no extra space */}
          <div style={{ textAlign: "center", lineHeight: "1" }}>
            {signatureUrl ? (
              <img
                src={signatureUrl}
                style={{
                  display: "block",
                  margin: "0 auto 0",
                  width: "70px",
                  transform: "rotate(270deg)",
                  transformOrigin: "center",
                }}
                alt="signature"
              />
            ) : (
              <div style={{ width: "70px", height: "50px" }} />
            )}
            <div style={{ marginTop: "4px", fontSize: "13px" }}>For, Bright Scholar School</div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ display: "flex", marginTop: "20px", fontSize: "11px" }}>
          <div style={{ flex: 1, textAlign: "left", color: "#c0392b" }}>
            Subject To Realization Of Cheque
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <div style={{ border: "1px solid #999", padding: "6px 10px", textAlign: "center" }}>
              This Donation is Eligible For Exemption Under
              <br />
              Income Tax Act 1961 U/S 80GGC, 80GGB
            </div>
          </div>
          <div style={{ flex: 1 }} />
        </div>

      </div>
    </div>
  );
});

ReceiptTemplate.displayName = "ReceiptTemplate";
export default ReceiptTemplate;