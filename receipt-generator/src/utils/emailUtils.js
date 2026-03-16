import { blobToBase64 } from "./pdfUtils";

export async function sendReceiptEmail({ toEmail, receiptNo, amountInDigits, receivedFrom, pdfBlob }) {
  const base64PDF = await blobToBase64(pdfBlob);

  const subject = `Election Fund Receipt No. ${receiptNo} — Bright Scholar School`;
  const body = `Dear ${receivedFrom || "Donor"},

Please find attached your official Election Fund Receipt No. ${receiptNo} for an amount of Rs. ${amountInDigits}.

Kindly retain this receipt for your official records as proof of your contribution towards the Election Fund.

For any queries, please contact us at support@krytons.in.

Warm regards,
Bright Scholar School
support@krytons.in`;

  const mcpUrl = "https://gmail.mcp.claude.com/mcp";

  const requestBody = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: {
      name: "send_email",
      arguments: {
        to: toEmail,
        subject: subject,
        body: body,
        attachments: [
          {
            filename: `Receipt_${receiptNo}.pdf`,
            mimeType: "application/pdf",
            data: base64PDF,
          },
        ],
      },
    },
  };

  const response = await fetch(mcpUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", 
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gmail MCP error ${response.status}: ${text}`);
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(result.error.message || "Failed to send email via Gmail MCP");
  }

  return result;
}