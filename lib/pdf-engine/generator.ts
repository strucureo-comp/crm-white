import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  CompanySettings,
  PdfDocumentInput,
  PdfLineItem,
  PdfTemplateStyle,
} from './types';
import {
  getCompanySettings,
  formatCurrency as fmtCurrency,
  formatDate,
  getBase64ImageFromURL,
} from './helpers';
import { getTemplateConfig, PdfTemplateConfig } from './templates';
import type { Quotation, QuotationItem, Invoice, User, Project } from '@/lib/db/types';

const A4_WIDTH = 210;
const A4_HEIGHT = 297;
const MARGIN = 15;
const CONTENT_WIDTH = A4_WIDTH - 2 * MARGIN;
const FOOTER_Y = 282;

async function loadLogo(settings: CompanySettings): Promise<string | null> {
  if (settings.logo_url) {
    try {
      return await getBase64ImageFromURL(settings.logo_url);
    } catch {
    }
  }
  return null;
}

function addPageHeader(
  doc: jsPDF,
  config: PdfTemplateConfig,
  settings: CompanySettings,
  documentType: string,
  logoData: string | null,
  pageNum: number,
) {
  const { colors, headerStyle } = config;

  if (headerStyle === 'filled' && colors.headerBg && colors.headerText) {
    doc.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2]);
    doc.rect(0, 0, A4_WIDTH, 38, 'F');
    doc.setTextColor(colors.headerText[0], colors.headerText[1], colors.headerText[2]);
  } else {
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  }

  if (logoData && pageNum === 0) {
    const maxW = 50;
    const maxH = config.logoHeight;
    try {
      doc.addImage(logoData, 'PNG', MARGIN, 5, maxW, maxH);
    } catch {
    }
  }

  doc.setFontSize(config.titleFontSize);
  doc.setFont('helvetica', 'bold');
  const titleY = logoData && pageNum === 0 ? 14 : 14;
  doc.text(documentType, A4_WIDTH - MARGIN, titleY, { align: 'right' });

  if (headerStyle === 'line') {
    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, 36, A4_WIDTH - MARGIN, 36);
  }
}

function addFooter(doc: jsPDF, config: PdfTemplateConfig, settings: CompanySettings) {
  const { colors } = config;
  doc.setFontSize(config.smallFontSize);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.footer[0], colors.footer[1], colors.footer[2]);

  const footerText = settings.footer_text || '—';
  doc.text(footerText, A4_WIDTH / 2, FOOTER_Y, { align: 'center' });

  doc.setDrawColor(colors.tableBorder[0], colors.tableBorder[1], colors.tableBorder[2]);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, FOOTER_Y - 3, A4_WIDTH - MARGIN, FOOTER_Y - 3);

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    if (i > 1) {
      addPageHeader(doc, config, settings, '', null, i - 1);
    }
    doc.setFontSize(config.smallFontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.footer[0], colors.footer[1], colors.footer[2]);
    doc.text(`Page ${i} of ${pageCount}`, A4_WIDTH - MARGIN, FOOTER_Y, { align: 'right' });
    doc.setLineWidth(0.3);
    doc.setDrawColor(colors.tableBorder[0], colors.tableBorder[1], colors.tableBorder[2]);
    doc.line(MARGIN, FOOTER_Y - 3, A4_WIDTH - MARGIN, FOOTER_Y - 3);
    doc.text(settings.footer_text || '—', A4_WIDTH / 2, FOOTER_Y, { align: 'center' });
  }
}

function addAddressBlock(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  name: string,
  extra: string[],
  maxWidth: number,
  config: PdfTemplateConfig,
): number {
  const { colors, bodyFontSize, spacing } = config;
  let cursor = y;

  doc.setFontSize(bodyFontSize + 1);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text(label, x, cursor);
  cursor += spacing + 2;

  doc.setFontSize(bodyFontSize + 2);
  doc.setFont('helvetica', 'bold');
  doc.text(name, x, cursor);
  cursor += spacing + 2;

  doc.setFontSize(bodyFontSize);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);

  for (const line of extra) {
    const lines = doc.splitTextToSize(line, maxWidth);
    for (const l of lines) {
      doc.text(l, x, cursor);
      cursor += spacing + 1;
    }
  }

  return cursor;
}

async function generateDocument(
  input: PdfDocumentInput,
  documentType: string,
  filename: string,
  style?: PdfTemplateStyle,
): Promise<jsPDF> {
  const settings = await getCompanySettings();
  const templateStyle = style || settings.template_style || 'modern';
  const config = getTemplateConfig(templateStyle, settings.primary_color);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { colors, bodyFontSize, smallFontSize, spacing, tableStyle } = config;

  const logoData = await loadLogo(settings);

  addPageHeader(doc, config, settings, input.meta.title || documentType, logoData, 0);

  let yPos = logoData ? 42 : 32;

  const metaItems: string[] = [];
  if (input.meta.number) metaItems.push(`${documentType} #: ${input.meta.number}`);
  if (input.meta.date) metaItems.push(`Date: ${formatDate(input.meta.date, settings)}`);
  if (input.meta.due_date) metaItems.push(`Due Date: ${formatDate(input.meta.due_date, settings)}`);
  if (input.meta.valid_until) metaItems.push(`Valid Until: ${formatDate(input.meta.valid_until, settings)}`);
  if (input.meta.status) metaItems.push(`Status: ${input.meta.status}`);

  if (metaItems.length > 0) {
    doc.setFontSize(bodyFontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
    const metaX = A4_WIDTH - MARGIN;
    for (const item of metaItems) {
      doc.text(item, metaX, yPos, { align: 'right' });
      yPos += spacing + 1;
    }
    yPos += 4;
  }

  yPos += 4;

  const fromLines: string[] = [];
  if (input.from.email) fromLines.push(input.from.email);
  if (input.from.phone) fromLines.push(input.from.phone);
  if (input.from.address) fromLines.push(input.from.address);

  yPos = addAddressBlock(doc, MARGIN, yPos, input.from.label, input.from.name, fromLines, CONTENT_WIDTH * 0.45, config);
  const addressEndY = yPos;

  const toLines: string[] = [];
  if (input.to.company && input.to.company !== input.to.name) toLines.push(input.to.company);
  if (input.to.email) toLines.push(input.to.email);
  if (input.to.phone) toLines.push(input.to.phone);
  if (input.to.address) toLines.push(input.to.address);

  const toStartY = Math.max(addressEndY - (fromLines.length + 2) * (spacing + 1) - 10, logoData ? 42 : 32);
  addAddressBlock(doc, A4_WIDTH / 2, toStartY, input.to.label, input.to.name, toLines, CONTENT_WIDTH * 0.45, config);

  const maxAddressY = Math.max(yPos, addressEndY, toStartY + (toLines.length + 3) * (spacing + 2));
  yPos = maxAddressY + 8;

  const colWidths = [0, 20, 30, 30];
  const headRow = ['Description', 'Quantity', 'Unit Price', 'Total'];

  const tableBody = input.items.map((item) => [
    item.description,
    item.quantity,
    item.unit_price,
    item.total,
  ]);

  const totalWidth = CONTENT_WIDTH;
  const descWidth = totalWidth - colWidths[1] - colWidths[2] - colWidths[3];

  autoTable(doc, {
    startY: yPos,
    head: [headRow],
    body: tableBody,
    theme: tableStyle === 'clean' ? 'plain' : tableStyle === 'grid' ? 'grid' : 'striped',
    styles: {
      font: 'helvetica',
      fontSize: bodyFontSize,
      cellPadding: 3,
      overflow: 'linebreak',
      lineColor: [colors.tableBorder[0], colors.tableBorder[1], colors.tableBorder[2]],
      lineWidth: 0.1,
      textColor: [colors.text[0], colors.text[1], colors.text[2]],
      valign: 'top',
    },
    headStyles: {
      fillColor: [colors.tableHead[0], colors.tableHead[1], colors.tableHead[2]],
      textColor: [colors.tableHeadText[0], colors.tableHeadText[1], colors.tableHeadText[2]],
      fontSize: bodyFontSize,
      fontStyle: 'bold',
      halign: 'left' as const,
      valign: 'middle' as const,
    },
    bodyStyles: {
      valign: 'top' as const,
    },
    alternateRowStyles: {
      fillColor: [colors.tableAlt[0], colors.tableAlt[1], colors.tableAlt[2]],
    },
    columnStyles: {
      0: { cellWidth: 'auto' as const, halign: 'left' as const },
      1: { cellWidth: colWidths[1], halign: 'center' as const },
      2: { cellWidth: colWidths[2], halign: 'right' as const },
      3: { cellWidth: colWidths[3], halign: 'right' as const },
    },
    margin: { left: MARGIN, right: MARGIN },
    tableLineWidth: 0.1,
    tableLineColor: [colors.tableBorder[0], colors.tableBorder[1], colors.tableBorder[2]],
  });

  let finalY = (doc as any).lastAutoTable?.finalY || yPos + 20;
  finalY += 8;

  for (const total of input.totals) {
    if (finalY > 260) {
      doc.addPage();
      finalY = 42;
    }
    doc.setFontSize(bodyFontSize + (total.bold ? 3 : 1));
    doc.setFont('helvetica', total.bold ? 'bold' : 'normal');
    doc.setTextColor(total.bold ? colors.primary[0] : colors.text[0], total.bold ? colors.primary[1] : colors.text[1], total.bold ? colors.primary[2] : colors.text[2]);
    doc.text(total.label, A4_WIDTH - MARGIN - 60, finalY, { align: 'left' });
    doc.text(total.value, A4_WIDTH - MARGIN, finalY, { align: 'right' });
    finalY += spacing + 3;
  }

  finalY += 6;

  if (input.notes) {
    if (finalY > 240) { doc.addPage(); finalY = 42; }
    doc.setFontSize(bodyFontSize + 1);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text('Notes:', MARGIN, finalY);
    finalY += spacing + 2;
    doc.setFontSize(bodyFontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
    const noteLines = doc.splitTextToSize(input.notes, CONTENT_WIDTH);
    for (const line of noteLines) {
      if (finalY > 270) { doc.addPage(); finalY = 42; }
      doc.text(line, MARGIN, finalY);
      finalY += spacing + 1;
    }
    finalY += 4;
  }

  if (input.terms) {
    if (finalY > 240) { doc.addPage(); finalY = 42; }
    doc.setFontSize(bodyFontSize + 1);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text('Terms & Conditions:', MARGIN, finalY);
    finalY += spacing + 2;
    doc.setFontSize(bodyFontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
    const termsLines = doc.splitTextToSize(input.terms, CONTENT_WIDTH);
    for (const line of termsLines) {
      if (finalY > 270) { doc.addPage(); finalY = 42; }
      doc.text(line, MARGIN, finalY);
      finalY += spacing + 1;
    }
    finalY += 4;
  }

  if (input.bank_details && input.bank_details.length > 0) {
    if (finalY > 230) { doc.addPage(); finalY = 42; }
    doc.setFontSize(bodyFontSize + 1);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text('Bank Details:', MARGIN, finalY);
    finalY += spacing + 2;
    doc.setFontSize(bodyFontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
    for (const detail of input.bank_details) {
      if (finalY > 270) { doc.addPage(); finalY = 42; }
      doc.text(detail, MARGIN, finalY);
      finalY += spacing + 1;
    }
  }

  addFooter(doc, config, settings);
  return doc;
}

export async function generateQuotationPdf(
  quotation: Quotation,
  client: User | null,
  style?: PdfTemplateStyle,
): Promise<jsPDF> {
  const settings = await getCompanySettings();
  const config = getTemplateConfig(style || settings.template_style, settings.primary_color);

  const fromLines: string[] = [];
  if (settings.email) fromLines.push(settings.email);
  if (settings.phone) fromLines.push(settings.phone);
  if (settings.address) fromLines.push(settings.address);
  if (settings.gst_number) fromLines.push(`GST: ${settings.gst_number}`);

  const toLines: string[] = [];
  if (quotation.client_company && quotation.client_is_company) {
    toLines.push(quotation.client_company);
  }
  if (quotation.client_name) {
    toLines.push(`Attn: ${quotation.client_name}`);
  }
  if (quotation.client_email) toLines.push(quotation.client_email);
  if (quotation.client_address) toLines.push(quotation.client_address);

  const currency = quotation.currency || settings.default_currency || 'USD';
  const fmt = (v: number) => fmtCurrency(v, settings);

  const items: PdfLineItem[] = quotation.items.map((item: QuotationItem) => ({
    description: item.description || '',
    quantity: item.quantity.toString(),
    unit_price: fmt(item.unit_price),
    total: fmt(item.total),
  }));

  const subtotal = quotation.items.reduce((s, i) => s + i.total, 0);
  const totals: { label: string; value: string; bold?: boolean }[] = [
    { label: 'Subtotal', value: fmt(subtotal) },
  ];

  if (settings.tax_cgst && settings.tax_sgst) {
    const cgst = subtotal * (settings.tax_cgst / 100);
    const sgst = subtotal * (settings.tax_sgst / 100);
    totals.push({ label: `CGST (${settings.tax_cgst}%)`, value: fmt(cgst) });
    totals.push({ label: `SGST (${settings.tax_sgst}%)`, value: fmt(sgst) });
  }
  if (settings.tax_igst) {
    const igst = subtotal * (settings.tax_igst / 100);
    totals.push({ label: `IGST (${settings.tax_igst}%)`, value: fmt(igst) });
  }
  if (settings.tax_vat) {
    const vat = subtotal * (settings.tax_vat / 100);
    totals.push({ label: `VAT (${settings.tax_vat}%)`, value: fmt(vat) });
  }

  totals.push({ label: 'Total Amount', value: fmt(quotation.amount), bold: true });

  const bankDetails: string[] = [];
  if (settings.bank_name) bankDetails.push(`Bank: ${settings.bank_name}`);
  if (settings.bank_account) bankDetails.push(`Account: ${settings.bank_account}`);
  if (settings.bank_ifsc) bankDetails.push(`IFSC: ${settings.bank_ifsc}`);
  if (settings.upi_id) bankDetails.push(`UPI: ${settings.upi_id}`);

  return generateDocument(
    {
      meta: {
        title: 'QUOTATION',
        number: quotation.quotation_number,
        date: quotation.created_at,
        valid_until: quotation.valid_until,
      },
      from: {
        label: 'From',
        name: settings.company_name,
        company: settings.legal_name,
        email: settings.email,
        phone: settings.phone,
        address: settings.address,
      },
      to: {
        label: 'To',
        name: quotation.client_name || client?.full_name || 'Client',
        company: quotation.client_company || '',
        email: quotation.client_email || client?.email || '',
        address: quotation.client_address || '',
      },
      items,
      totals,
      notes: quotation.notes || settings.default_notes || undefined,
      terms: settings.default_terms || undefined,
      bank_details: bankDetails.length > 0 ? bankDetails : undefined,
    },
    'QUOTATION',
    `${quotation.quotation_number}.pdf`,
    style,
  );
}

export async function generateInvoicePdf(
  invoice: Invoice,
  client: User | null,
  project: Project | null,
  style?: PdfTemplateStyle,
): Promise<jsPDF> {
  const settings = await getCompanySettings();
  const fmt = (v: number) => fmtCurrency(v, settings);

  const items: PdfLineItem[] = [
    {
      description: invoice.description || 'Professional Services',
      quantity: '1',
      unit_price: fmt(invoice.amount),
      total: fmt(invoice.amount),
    },
  ];

  const bankDetails: string[] = [];
  if (settings.bank_name) bankDetails.push(`Bank: ${settings.bank_name}`);
  if (settings.bank_account) bankDetails.push(`Account: ${settings.bank_account}`);
  if (settings.bank_ifsc) bankDetails.push(`IFSC: ${settings.bank_ifsc}`);
  if (settings.upi_id) bankDetails.push(`UPI: ${settings.upi_id}`);

  return generateDocument(
    {
      meta: {
        title: 'INVOICE',
        number: invoice.invoice_number,
        date: invoice.created_at,
        due_date: invoice.due_date,
        status: invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1),
      },
      from: {
        label: 'From',
        name: settings.company_name,
        email: settings.email,
        phone: settings.phone,
        address: settings.address,
      },
      to: {
        label: 'Bill To',
        name: client?.full_name || 'Client',
        email: client?.email || '',
      },
      items,
      totals: [
        { label: 'Subtotal', value: fmt(invoice.amount) },
        { label: 'Total Due', value: fmt(invoice.amount), bold: true },
      ],
      notes: invoice.notes || settings.default_notes || undefined,
      terms: settings.default_terms || undefined,
      bank_details: bankDetails.length > 0 ? bankDetails : undefined,
    },
    'INVOICE',
    `Invoice-${invoice.invoice_number}.pdf`,
    style,
  );
}

export async function downloadPdf(doc: jsPDF, filename: string): Promise<void> {
  doc.save(filename);
}

export async function openPdfPreview(doc: jsPDF): Promise<string> {
  return doc.output('datauristring');
}
