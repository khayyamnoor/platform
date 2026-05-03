import ExcelJS from 'exceljs';
import FileSaver from 'file-saver';
import { AnalysisResult, ContractData, SupplierAnalysisData } from '../types';

export const exportToExcel = async (results: AnalysisResult[]) => {
  const workbook = new ExcelJS.Workbook();
  
  const contracts = results.filter(r => r.type === 'CONTRACT') as ContractData[];
  const suppliers = results.filter(r => r.type === 'SUPPLIER') as SupplierAnalysisData[];

  if (contracts.length > 0) {
    const summarySheet = workbook.addWorksheet('Contract Summary');
    createContractSummarySheet(summarySheet, contracts);

    contracts.forEach((contract, index) => {
      const sheetName = (contract.company_name || `Contract ${index + 1}`).substring(0, 30).replace(/[\\/?*[\]]/g, ''); 
      const sheet = workbook.addWorksheet(sheetName);
      createContractDetailSheet(sheet, contract);
    });
  }

  if (suppliers.length > 0) {
    const supplierSummary = workbook.addWorksheet('Supplier Summary');
    createSupplierSummarySheet(supplierSummary, suppliers);

    suppliers.forEach((supplier, index) => {
      const sheetName = (supplier.supplier_name || `Supplier ${index + 1}`).substring(0, 30).replace(/[\\/?*[\]]/g, '');
      const sheet = workbook.addWorksheet(sheetName);
      createSupplierDetailSheet(sheet, supplier);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const save = (FileSaver as any).saveAs || FileSaver;
  save(blob, `Hissene_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Creates the "Dashboard Summary" sheet with a list of all contracts.
 */
const createContractSummarySheet = (sheet: ExcelJS.Worksheet, contracts: ContractData[]) => {
  sheet.columns = [
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Company', key: 'company', width: 25 },
    { header: 'Counterparty', key: 'counterparty', width: 25 },
    { header: 'Subject', key: 'subject', width: 40 },
    { header: 'Total Value', key: 'value', width: 20 },
    { header: 'Currency', key: 'curr', width: 10 },
    { header: 'Start Date', key: 'start', width: 15 },
    { header: 'End Date', key: 'end', width: 15 },
    { header: 'Alert', key: 'alert', width: 15 },
  ];

  // Dark Header Style
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  headerRow.height = 30;
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  contracts.forEach(contract => {
    const row = sheet.addRow({
      status: contract.contract_status,
      company: contract.company_name,
      counterparty: contract.counterparty_name,
      subject: contract.contract_subject,
      value: contract.amounts.total_contract_amount,
      curr: contract.currency,
      start: contract.contract_start_date,
      end: contract.contract_end_date,
      alert: contract.expiration_alert.is_within_2_months === 'YES' ? 'EXPIRING' : '-',
    });
    
    // Status Coloring
    const statusCell = row.getCell('status');
    if (contract.contract_status === 'ACTIVE') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
      statusCell.font = { color: { argb: 'FF166534' }, bold: true };
    } else if (contract.contract_status === 'EXPIRED') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      statusCell.font = { color: { argb: 'FF991B1B' }, bold: true };
    }
    statusCell.alignment = { horizontal: 'center' };
  });
};

/**
 * Creates the Detailed Financial Sheet exactly like the provided screenshot template.
 */
const createContractDetailSheet = (sheet: ExcelJS.Worksheet, data: ContractData) => {
  // Define exact columns to match the screenshot: N° | LIBELLE | % | RG 10% | PAIEMENT | CHQ
  sheet.columns = [
    { key: 'A', width: 8 },  // N°
    { key: 'B', width: 45 }, // LIBELLE
    { key: 'C', width: 10 }, // %
    { key: 'D', width: 15 }, // RG 10%
    { key: 'E', width: 20 }, // PAIEMENT
    { key: 'F', width: 25 }, // CHQ
  ];

  // --- 1. TITLE HEADER (Yellow) ---
  const titleRow = sheet.getRow(1);
  titleRow.height = 35;
  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = (data.contract_subject || "CONTRACT FINANCIAL STATUS").toUpperCase();
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Yellow
  titleCell.font = { bold: true, size: 16, name: 'Calibri' };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.border = { top: { style: 'thick' }, left: { style: 'thick' }, right: { style: 'thick' }, bottom: { style: 'thick' } };

  // --- 2. INFO BLOCK ---
  // Row 2: Client / Provider
  const r2 = sheet.getRow(2);
  r2.height = 20;
  sheet.mergeCells('A2:C2');
  const clientCell = sheet.getCell('A2');
  clientCell.value = `CLIENT: ${data.company_name}`;
  clientCell.font = { bold: true };
  
  sheet.mergeCells('D2:F2');
  const valCell = sheet.getCell('D2');
  valCell.value = `VALEUR: ${data.amounts.total_contract_amount} ${data.currency}`;
  valCell.font = { bold: true };
  valCell.alignment = { horizontal: 'right' };

  // Row 3: Counterparty
  const r3 = sheet.getRow(3);
  sheet.mergeCells('A3:C3');
  const provCell = sheet.getCell('A3');
  provCell.value = `ENTREPRISE: ${data.counterparty_name}`;
  
  sheet.mergeCells('D3:F3');
  const durCell = sheet.getCell('D3');
  durCell.value = `DUREE: ${data.contract_duration_description || 'N/A'}`;
  durCell.alignment = { horizontal: 'right' };

  // Row 4: Dates
  const r4 = sheet.getRow(4);
  sheet.mergeCells('A4:C4');
  sheet.getCell('A4').value = `REF: ${data.classifier_name}`; // Placeholder for MF/ID
  
  sheet.mergeCells('D4:F4');
  const dateCell = sheet.getCell('D4');
  dateCell.value = `SIGNATURE: ${data.contract_start_date}`;
  dateCell.alignment = { horizontal: 'right' };

  // Add borders to Info Block
  ['A2', 'D2', 'A3', 'D3', 'A4', 'D4'].forEach(key => {
     sheet.getCell(key).border = { bottom: { style: 'thin' } };
  });
  
  sheet.addRow([]); // Spacer

  // --- 3. FINANCIAL SUMMARY TABLES (CONTRAT / AVENANT / BC) ---
  // We mimic the look: Header Row (Blueish), Data Row
  
  const createSummaryTable = (startRow: number, label: string, amount: string) => {
    const headerRow = sheet.getRow(startRow);
    headerRow.values = [label, 'H.TVA', 'TVA', 'TTC', 'RETENUE 10%', 'A PAYER TTC'];
    headerRow.font = { bold: true, size: 10 };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Header Style (Blue/Grey)
    for(let i=1; i<=6; i++) {
      const cell = headerRow.getCell(i);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } }; // Light Blue
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'}, bottom: {style:'thin'} };
    }

    const dataRow = sheet.getRow(startRow + 1);
    // Logic: We usually only have TTC from AI. We will populate TTC and leave others blank for manual fill,
    // or estimate if we want, but better safe. We place Total in TTC.
    // label "CONTRAT" -> Total. Others -> 0 or empty.
    
    let ttcVal = label === 'CONTRAT' ? parseFloat(amount.replace(/[^0-9.]/g, '')) || 0 : 0;
    
    dataRow.getCell(1).value = label === 'CONTRAT' ? '' : ''; // Label cell is merged usually or just blank in data
    dataRow.getCell(4).value = label === 'CONTRAT' ? amount : '-'; // TTC
    dataRow.getCell(6).value = label === 'CONTRAT' ? amount : '-'; // A PAYER

    dataRow.font = { bold: true };
    dataRow.alignment = { horizontal: 'center' };
    for(let i=1; i<=6; i++) {
       dataRow.getCell(i).border = { top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'}, bottom: {style:'thin'} };
    }
  };

  let currentRow = 6;
  createSummaryTable(currentRow, 'CONTRAT', data.amounts.total_contract_amount);
  
  currentRow += 3;
  createSummaryTable(currentRow, 'AVENANT', '0.00'); // Placeholder
  
  currentRow += 3;
  createSummaryTable(currentRow, 'BC N°', '0.00'); // Placeholder

  sheet.addRow([]); // Spacer
  currentRow += 3;

  // --- 4. PAYMENT SCHEDULE TABLE ---
  // Headers: N° | LIBELLE | % | RG 10% | PAIEMENT | CHQ
  const tableHeaderRow = sheet.getRow(currentRow);
  tableHeaderRow.values = ['N°', 'LIBELLE', '%', 'RG 10%', 'PAIEMENT', 'CHQ / DATE'];
  tableHeaderRow.height = 25;
  tableHeaderRow.font = { bold: true, color: { argb: 'FF000000' } };
  tableHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

  for(let i=1; i<=6; i++) {
    const cell = tableHeaderRow.getCell(i);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }; // Grey
    cell.border = { top: {style:'medium'}, left: {style:'medium'}, right: {style:'medium'}, bottom: {style:'medium'} };
  }

  currentRow++;

  // Data Rows
  let totalPaid = 0;
  
  data.payment_schedule.forEach((item, idx) => {
    const row = sheet.getRow(currentRow + idx);
    row.height = 20;
    
    // 1. N°
    const cellId = row.getCell(1);
    cellId.value = idx + 1;
    cellId.alignment = { horizontal: 'center' };

    // 2. LIBELLE
    const cellDesc = row.getCell(2);
    cellDesc.value = item.payment_description;
    
    // 3. % (Try to extract from description)
    const cellPct = row.getCell(3);
    const pctMatch = item.payment_description.match(/(\d+)%/);
    cellPct.value = pctMatch ? pctMatch[0] : '-';
    cellPct.alignment = { horizontal: 'center' };

    // 4. RG 10% (Placeholder calculation)
    const cellRg = row.getCell(4);
    cellRg.value = '-'; // Logic for RG calculation would go here if extracted
    cellRg.alignment = { horizontal: 'center' };

    // 5. PAIEMENT
    const cellPay = row.getCell(5);
    const amountNum = parseFloat(item.payment_amount.replace(/[^0-9.]/g, '')) || 0;
    cellPay.value = item.payment_amount; // Keep original string for formatting or use number
    if (amountNum) totalPaid += amountNum;
    cellPay.font = { bold: true, color: { argb: 'FFCC0000' } }; // Red text like in screenshot
    cellPay.alignment = { horizontal: 'right' };

    // 6. CHQ / DATE
    const cellDate = row.getCell(6);
    cellDate.value = item.payment_date;
    cellDate.alignment = { horizontal: 'center' };

    // Borders
    for(let i=1; i<=6; i++) {
       row.getCell(i).border = { top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'}, bottom: {style:'thin'} };
    }
  });

  // Footer Row (Total)
  const footerRowIdx = currentRow + data.payment_schedule.length;
  const footerRow = sheet.getRow(footerRowIdx);
  footerRow.height = 25;
  
  const totalLabel = footerRow.getCell(2);
  totalLabel.value = 'TOTAL';
  totalLabel.font = { bold: true };
  totalLabel.alignment = { horizontal: 'center' };
  totalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

  const totalValue = footerRow.getCell(5);
  totalValue.value = data.amounts.total_amount_paid || totalPaid.toFixed(2);
  totalValue.font = { bold: true, color: { argb: 'FFCC0000' } };
  totalValue.alignment = { horizontal: 'right' };
  
  // Outer Borders for footer
  footerRow.getCell(1).border = { top: {style:'thick'}, bottom: {style:'thick'}, left: {style:'thick'} };
  footerRow.getCell(2).border = { top: {style:'thick'}, bottom: {style:'thick'} };
  footerRow.getCell(3).border = { top: {style:'thick'}, bottom: {style:'thick'} };
  footerRow.getCell(4).border = { top: {style:'thick'}, bottom: {style:'thick'} };
  footerRow.getCell(5).border = { top: {style:'thick'}, bottom: {style:'thick'} };
  footerRow.getCell(6).border = { top: {style:'thick'}, bottom: {style:'thick'}, right: {style:'thick'} };

  // Bottom "Reste a Payer"
  const resteRow = sheet.getRow(footerRowIdx + 2);
  resteRow.height = 30;
  sheet.mergeCells(`A${footerRowIdx+2}:E${footerRowIdx+2}`);
  
  const resteLabel = sheet.getCell(`A${footerRowIdx+2}`);
  resteLabel.value = "RESTE A PAYER";
  resteLabel.font = { bold: true, size: 12 };
  resteLabel.alignment = { horizontal: 'center', vertical: 'middle' };
  resteLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } }; // Blue
  resteLabel.border = { top: {style:'medium'}, left: {style:'medium'}, bottom: {style:'medium'}, right: {style:'medium'} };

  const resteValue = sheet.getCell(`F${footerRowIdx+2}`);
  // Calculate remaining if possible
  const totalNum = parseFloat(data.amounts.total_contract_amount.replace(/[^0-9.]/g, '')) || 0;
  const paidNum = parseFloat(data.amounts.total_amount_paid.replace(/[^0-9.]/g, '')) || 0;
  const remaining = totalNum - paidNum;
  
  resteValue.value = remaining > 0 ? remaining.toLocaleString() : "0.00";
  resteValue.font = { bold: true, size: 12 };
  resteValue.alignment = { horizontal: 'center', vertical: 'middle' };
  resteValue.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } };
  resteValue.border = { top: {style:'medium'}, left: {style:'medium'}, bottom: {style:'medium'}, right: {style:'medium'} };
};

/**
 * Creates Supplier Summary Sheet
 */
const createSupplierSummarySheet = (sheet: ExcelJS.Worksheet, suppliers: SupplierAnalysisData[]) => {
  sheet.columns = [
    { header: 'Supplier Name', key: 'name', width: 30 },
    { header: 'Document', key: 'docType', width: 20 },
    { header: 'Score', key: 'score', width: 10 },
    { header: 'Risk Level', key: 'risk', width: 15 },
    { header: 'Trend', key: 'trend', width: 15 },
    { header: 'Items Count', key: 'items', width: 15 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  headerRow.height = 30;

  suppliers.forEach(supp => {
    const row = sheet.addRow({
      name: supp.supplier_name,
      docType: supp.document_type,
      score: supp.supplier_evaluation.score,
      risk: supp.supplier_evaluation.risk_level,
      trend: supp.supplier_evaluation.trend || '-',
      items: supp.products.length
    });

    const riskCell = row.getCell('risk');
    if (supp.supplier_evaluation.risk_level === 'HIGH') {
      riskCell.font = { color: { argb: 'FFDC2626' }, bold: true };
    } else if (supp.supplier_evaluation.risk_level === 'LOW') {
      riskCell.font = { color: { argb: 'FF16A34A' }, bold: true };
    }
  });
};

/**
 * Creates Supplier Detail Sheet
 */
const createSupplierDetailSheet = (sheet: ExcelJS.Worksheet, data: SupplierAnalysisData) => {
  sheet.columns = [
    { key: 'A', width: 20 },
    { key: 'B', width: 40 },
    { key: 'C', width: 15 },
    { key: 'D', width: 20 },
    { key: 'E', width: 20 },
  ];

  // Title
  sheet.mergeCells('A1:E1');
  const title = sheet.getCell('A1');
  title.value = `SUPPLIER: ${data.supplier_name.toUpperCase()}`;
  title.font = { bold: true, size: 16 };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
  title.alignment = { horizontal: 'center' };

  // Info
  sheet.getCell('A3').value = "Document Type:";
  sheet.getCell('B3').value = data.document_type;
  
  sheet.getCell('A4').value = "Tax ID / RC:";
  sheet.getCell('B4').value = data.supplier_metadata.tax_id;
  
  sheet.getCell('A5').value = "Contact:";
  sheet.getCell('B5').value = `${data.supplier_metadata.email} | ${data.supplier_metadata.phone}`;

  sheet.getCell('D3').value = "Score:";
  sheet.getCell('E3').value = data.supplier_evaluation.score;
  
  sheet.getCell('D4').value = "Risk Level:";
  sheet.getCell('E4').value = data.supplier_evaluation.risk_level;

  let currentRow = 7;

  // Products Table
  const tableHeader = sheet.getRow(currentRow);
  tableHeader.values = ['REF / SKU', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL PRICE'];
  tableHeader.font = { bold: true };
  tableHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  currentRow++;

  data.products.forEach(p => {
    sheet.getRow(currentRow).values = [
      p.product_id,
      p.product_name + (p.description ? ` - ${p.description}` : ''),
      p.quantity,
      p.unit_price,
      p.total_price
    ];
    currentRow++;
  });
};