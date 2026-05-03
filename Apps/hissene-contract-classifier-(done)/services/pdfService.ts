import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportHtmlToPdf = async (element: HTMLElement, filenamePrefix: string) => {
  try {
    // Add a temporary wrapper style to prevent scrolling overflow bugs in html2canvas
    const originalStyle = element.style.cssText;
    element.style.height = 'max-content';
    element.style.overflow = 'visible';

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#020617', // Match the app's slate-950 background
      ignoreElements: (el) => el.classList.contains('no-print'),
      logging: false,
      windowHeight: element.scrollHeight,
      windowWidth: element.scrollWidth,
    });

    // Restore style
    element.style.cssText = originalStyle;

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgProps = pdf.getImageProperties(imgData);
    const ratio = pdfWidth / imgProps.width;
    const totalPdfHeight = imgProps.height * ratio;

    let heightLeft = totalPdfHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalPdfHeight);
    heightLeft -= pdfHeight;

    // Remaining pages
    while (heightLeft > 0) {
      position = heightLeft - totalPdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalPdfHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(`${filenamePrefix}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error("PDF generation failed", error);
    alert("Failed to generate PDF. Please try again.");
  }
};
