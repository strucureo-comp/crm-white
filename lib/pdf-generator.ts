import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice, Project, User, Quotation } from './db/types';
import type { WorkspaceSettings } from '@/lib/settings/types';
import { DEFAULT_WORKSPACE_SETTINGS } from '@/lib/settings/types';

type S = WorkspaceSettings;

const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
        };
        img.onerror = error => reject(error);
        img.src = url;
    });
};

const formatCurrency = (amount: number, symbol: string = '$') => {
    const formattedNumber = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${symbol}${formattedNumber}`;
};

function getFromSection(s: S) {
    return {
        name: s.general.company_name || 'Your Company',
        tagline: s.general.tagline || '',
        email: s.branding.email || '',
        phone: s.branding.phone || '',
        address: s.branding.address || '',
    };
}

function getFooterText(s: S) {
    return s.branding.footer_text || '';
}

function getLogoUrl(s: S) {
    return s.branding.logo_url || '';
}

function getSymbol(s: S) {
    return s.general.currency_symbol || '$';
}

function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    const big = parseInt(clean, 16);
    return [(big >> 16) & 255, (big >> 8) & 255, big & 255];
}

export const createQuotationDoc = async (quotation: Quotation, client: User | null, settings?: S) => {
    const s = settings || DEFAULT_WORKSPACE_SETTINGS;
    const from = getFromSection(s);
    const symbol = getSymbol(s);
    const footer = getFooterText(s);
    const logoUrl = getLogoUrl(s);

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 210;
    const margin = 15;
    const rightColumnX = pageWidth - margin;

    // Add Logo
    if (logoUrl) {
        try {
            const logoData = await getBase64ImageFromURL(logoUrl);
            doc.addImage(logoData, 'PNG', margin, 10, 35, 35);
        } catch (error) {
            console.warn('Could not load logo for PDF:', error);
        }
    }

    // Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const [r, g, b] = hexToRgb(s.branding.primary_color);
    doc.setTextColor(r, g, b);
    doc.text('QUOTATION', rightColumnX, 20, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    let yPos = 28;

    doc.text(`Quotation #: ${quotation.quotation_number}`, rightColumnX, yPos, { align: 'right' });
    yPos += 5;
    doc.text(`Date: ${new Date(quotation.created_at).toLocaleDateString()}`, rightColumnX, yPos, { align: 'right' });
    yPos += 5;

    if (quotation.valid_until) {
        try {
            const validDate = new Date(quotation.valid_until);
            if (!isNaN(validDate.getTime())) {
                doc.text(`Valid Until: ${validDate.toLocaleDateString()}`, rightColumnX, yPos, { align: 'right' });
                yPos += 5;
            }
        } catch (e) {
            console.warn('Invalid valid_until date:', quotation.valid_until);
        }
    }

    if (quotation.project_title) {
        doc.text(`Project: ${quotation.project_title}`, rightColumnX, yPos, { align: 'right' });
        yPos += 5;
    }

    // From Section
    let leftY = 55;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('From:', margin, leftY);

    leftY += 6;
    doc.setFontSize(12);
    doc.text(from.name, margin, leftY);

    if (from.tagline) {
        leftY += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(from.tagline, margin, leftY);
    }

    if (from.email) {
        leftY += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(from.email, margin, leftY);
    }

    if (from.phone) {
        leftY += 5;
        doc.text(from.phone, margin, leftY);
    }

    if (from.address) {
        leftY += 5;
        doc.text(from.address, margin, leftY);
    }

    // To Section
    let rightY = 55;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('To:', rightColumnX, rightY, { align: 'right' });

    rightY += 6;
    doc.setFontSize(12);

    if (quotation.client_is_company) {
        const companyName = quotation.client_company || 'Company Name';
        doc.text(companyName, rightColumnX, rightY, { align: 'right' });
        rightY += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (quotation.client_name) {
            doc.text(`Attn: ${quotation.client_name}`, rightColumnX, rightY, { align: 'right' });
            rightY += 5;
        }
    } else {
        const clientName = quotation.client_name || client?.full_name || 'Client Name';
        doc.text(clientName, rightColumnX, rightY, { align: 'right' });
        rightY += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (quotation.client_company) {
            doc.text(quotation.client_company, rightColumnX, rightY, { align: 'right' });
            rightY += 5;
        }
    }

    if (quotation.client_address) {
        doc.text(quotation.client_address, rightColumnX, rightY, { align: 'right' });
        rightY += 5;
    }

    const clientEmail = quotation.client_email || client?.email || '';
    if (clientEmail) {
        doc.text(clientEmail, rightColumnX, rightY, { align: 'right' });
        rightY += 5;
    }

    // Table
    const tableStartY = Math.max(leftY, rightY) + 10;

    const tableData = quotation.items.map(item => [
        item.description || '',
        item.quantity.toString(),
        formatCurrency(item.unit_price, symbol),
        formatCurrency(item.total, symbol)
    ]);

    autoTable(doc, {
        startY: tableStartY,
        head: [['Description', 'Quantity', 'Unit Price', 'Total']],
        body: tableData,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 2,
            overflow: 'linebreak',
            cellWidth: 'wrap',
            lineColor: [200, 200, 200],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: hexToRgb(s.branding.primary_color),
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'left',
            valign: 'middle'
        },
        bodyStyles: {
            textColor: [0, 0, 0],
            valign: 'top'
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        columnStyles: {
            0: { cellWidth: 'auto', halign: 'left' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 30, halign: 'right' }
        },
        margin: { left: margin, right: margin }
    });

    // Total
    let finalY = (doc as any).lastAutoTable?.finalY || tableStartY + 50;
    finalY += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Amount: ${formatCurrency(quotation.amount, symbol)}`, rightColumnX, finalY, { align: 'right' });

    finalY += 15;

    // Notes
    if (quotation.notes) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Notes:', margin, finalY);
        finalY += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const splitNotes = doc.splitTextToSize(quotation.notes, pageWidth - (2 * margin));
        doc.text(splitNotes, margin, finalY);
        finalY += splitNotes.length * 5;
    }

    // Footer
    if (footer) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(footer, pageWidth / 2, 285, { align: 'center' });
    }

    return doc;
};

export const generateQuotationPDF = async (quotation: Quotation, client: User | null, settings?: S) => {
    const doc = await createQuotationDoc(quotation, client, settings);
    doc.save(`${quotation.quotation_number}.pdf`);
};

export const createInvoiceDoc = async (invoice: Invoice, client: User | null, project: Project | null, settings?: S) => {
    const s = settings || DEFAULT_WORKSPACE_SETTINGS;
    const from = getFromSection(s);
    const symbol = getSymbol(s);
    const footer = getFooterText(s);
    const logoUrl = getLogoUrl(s);

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 210;
    const margin = 15;
    const rightColumnX = pageWidth - margin;

    // Add Logo
    if (logoUrl) {
        try {
            const logoData = await getBase64ImageFromURL(logoUrl);
            doc.addImage(logoData, 'PNG', margin, 10, 35, 35);
        } catch (error) {
            console.warn('Could not load logo for PDF:', error);
        }
    }

    // Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const [r, g, b] = hexToRgb(s.branding.primary_color);
    doc.setTextColor(r, g, b);
    doc.text('INVOICE', rightColumnX, 20, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    let yPos = 28;

    doc.text(`Invoice #: ${invoice.invoice_number}`, rightColumnX, yPos, { align: 'right' });
    yPos += 5;
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, rightColumnX, yPos, { align: 'right' });
    yPos += 5;
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, rightColumnX, yPos, { align: 'right' });
    yPos += 5;

    // From Section
    let leftY = 55;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('From:', margin, leftY);

    leftY += 6;
    doc.setFontSize(12);
    doc.text(from.name, margin, leftY);

    if (from.tagline) {
        leftY += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(from.tagline, margin, leftY);
    }

    if (from.email) {
        leftY += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(from.email, margin, leftY);
    }

    if (from.phone) {
        leftY += 5;
        doc.text(from.phone, margin, leftY);
    }

    if (from.address) {
        leftY += 5;
        doc.text(from.address, margin, leftY);
    }

    // To Section
    let rightY = 55;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('To:', rightColumnX, rightY, { align: 'right' });

    rightY += 6;
    doc.setFontSize(12);
    doc.text(client?.full_name || 'Valued Client', rightColumnX, rightY, { align: 'right' });
    rightY += 5;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (client?.email) {
        doc.text(client.email, rightColumnX, rightY, { align: 'right' });
        rightY += 5;
    }

    if (project) {
        doc.text(`Project: ${project.title}`, rightColumnX, rightY, { align: 'right' });
        rightY += 5;
    }

    // Table
    const tableStartY = Math.max(leftY, rightY) + 10;

    const tableData = [[
        invoice.description || 'Professional Services',
        '1',
        formatCurrency(invoice.amount, symbol),
        formatCurrency(invoice.amount, symbol)
    ]];

    autoTable(doc, {
        startY: tableStartY,
        head: [['Description', 'Quantity', 'Amount', 'Total']],
        body: tableData,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 2
        },
        headStyles: {
            fillColor: hexToRgb(s.branding.primary_color),
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 'auto', halign: 'left' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 30, halign: 'right' }
        },
        margin: { left: margin, right: margin }
    });

    let finalY = (doc as any).lastAutoTable?.finalY || tableStartY + 30;
    finalY += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Due: ${formatCurrency(invoice.amount, symbol)}`, rightColumnX, finalY, { align: 'right' });

    finalY += 15;

    if (invoice.notes) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Notes:', margin, finalY);
        finalY += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const splitNotes = doc.splitTextToSize(invoice.notes, pageWidth - (2 * margin));
        doc.text(splitNotes, margin, finalY);
        finalY += splitNotes.length * 5;
    }

    if (invoice.bank_details) {
        finalY += 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Bank Details:', margin, finalY);
        finalY += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        Object.entries(invoice.bank_details).forEach(([key, value]) => {
            doc.text(`${key}: ${value}`, margin, finalY);
            finalY += 5;
        });
    }

    if (footer) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(footer, pageWidth / 2, 285, { align: 'center' });
    }

    return doc;
};

export const generateInvoicePDF = async (invoice: Invoice, client: User | null, project: Project | null, settings?: S) => {
    const doc = await createInvoiceDoc(invoice, client, project, settings);
    doc.save(`Invoice-${invoice.invoice_number}.pdf`);
};
