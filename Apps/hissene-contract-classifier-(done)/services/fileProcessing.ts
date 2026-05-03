
import ExcelJS from 'exceljs';
import mammoth from 'mammoth';

export interface ProcessedFile {
  data: string; // Base64 or Text
  mimeType: string;
}

export const processFileForAnalysis = async (file: File): Promise<ProcessedFile> => {
  const type = file.type;
  const name = file.name.toLowerCase();

  // Excel (.xlsx)
  if (type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || name.endsWith('.xlsx')) {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      
      let text = `FILE NAME: ${file.name}\n\n`;
      workbook.eachSheet((sheet) => {
        text += `--- SHEET: ${sheet.name} ---\n`;
        sheet.eachRow((row) => {
          // row.values is 1-based sparse array in ExcelJS
          const rowText = Array.isArray(row.values) 
            ? row.values.slice(1).map(v => v ? v.toString() : '').join(' | ')
            : ''; 
          text += rowText + '\n';
        });
        text += '\n';
      });
      return { data: text, mimeType: 'text/plain' };
    } catch (e) {
      console.error("Excel processing failed", e);
      throw new Error("Failed to process Excel file.");
    }
  }

  // Word (.docx)
  if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) {
    try {
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      return { data: result.value, mimeType: 'text/plain' };
    } catch (e) {
      console.error("Word processing failed", e);
      throw new Error("Failed to process Word document.");
    }
  }

  // Text / CSV
  if (type === 'text/plain' || type === 'text/csv' || name.endsWith('.txt') || name.endsWith('.csv')) {
    const text = await file.text();
    return { data: text, mimeType: 'text/plain' };
  }

  // Fallback for PDF / Images (Binary -> Base64)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract Base64 from Data URL
      const base64 = result.split(',')[1];
      resolve({ data: base64, mimeType: type || 'application/pdf' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
