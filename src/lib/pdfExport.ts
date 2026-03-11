import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function exportAnalysisToPdf(
  element: HTMLElement,
  fileName: string,
): Promise<void> {
  const captureWidth = Math.max(element.offsetWidth, element.scrollWidth);
  const captureHeight = Math.max(element.offsetHeight, element.scrollHeight);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#1e1e2e",
    ignoreElements: (node) => (node as Element).classList?.contains("no-pdf"),
    width: captureWidth,
    height: captureHeight,
    windowWidth: captureWidth,
    windowHeight: captureHeight,
    scrollX: 0,
    scrollY: 0,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;
  const imgProps = pdf.getImageProperties(imgData);

  const imgHeightAtFullWidth = (imgProps.height * usableWidth) / imgProps.width;

  if (imgHeightAtFullWidth <= usableHeight) {
    pdf.addImage(imgData, "PNG", margin, margin, usableWidth, imgHeightAtFullWidth);
  } else {
    const scale = usableHeight / imgHeightAtFullWidth;
    const scaledWidth = usableWidth * scale;
    const scaledHeight = usableHeight;
    pdf.addImage(imgData, "PNG", margin, margin, scaledWidth, scaledHeight);
  }

  pdf.save(fileName);
}
