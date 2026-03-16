import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function generatePDFFromElement(element, receiptNo) {
  const host = document.createElement("div");
  host.style.cssText = [
    "position:fixed",
    "left:-9999px",
    "top:0",
    "z-index:-999",
    "width:794px",
    "background:#fff",
    "transform:none",
    "overflow:visible",
  ].join(";");

  const clone = element.cloneNode(true);
  clone.style.transform = "none";
  clone.style.width = "794px";
  host.appendChild(clone);
  document.body.appendChild(host);

  await new Promise((r) => setTimeout(r, 200));

  let canvas;
  try {
    canvas = await html2canvas(host, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: 794,
      windowWidth: 1200,
    });
  } finally {
    document.body.removeChild(host);
  }

  const imgData = canvas.toDataURL("image/png");

  // A4 dimensions in mm
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;

  // Scale image to fill A4 width, preserve aspect ratio
  const imgH = (canvas.height / canvas.width) * pageW;
  const finalW = pageW;
  const finalH = Math.min(imgH, pageH);

  pdf.addImage(imgData, "PNG", 0, 0, finalW, finalH);

  const fileName = `Receipt_${receiptNo}.pdf`;
  const blob = pdf.output("blob");
  const dataUrl = pdf.output("datauristring");

  return { pdf, fileName, blob, dataUrl };
}

export function downloadPDF(pdf, fileName) {
  pdf.save(fileName);
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}