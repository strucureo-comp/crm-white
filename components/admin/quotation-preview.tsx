import { format } from 'date-fns';
import { Quote } from 'lucide-react';
import Image from 'next/image';
import type { Quotation, QuotationItem, User } from '@/lib/db/types';

interface QuotationPreviewProps {
    data: Partial<Quotation>;
    client?: User | null;
}

export function QuotationPreview({ data, client }: QuotationPreviewProps) {
    const {
        quotation_number = 'DRAFT',
        created_at = new Date().toISOString(),
        valid_until,
        items = [],
        currency = 'USD',
        amount = 0,
        notes,
    } = data;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    return (
        <div className="bg-white text-black p-8 rounded-lg shadow-sm border h-full overflow-y-auto min-h-[600px] text-sm font-sans" id="quotation-preview">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div className="w-32 h-32 relative">
                    <Image
                        src="/logo_trans_(4884x4884)px_for_white_bg.png"
                        alt="Company Logo"
                        fill
                        className="object-contain"
                    />
                </div>
                <div className="text-right">
                    <h1 className="text-4xl font-bold text-black mb-2">QUOTATION</h1>
                    <div className="text-black space-y-1">
                        <p><span className="font-semibold">Quotation #:</span> {quotation_number}</p>
                        <p><span className="font-semibold">Date:</span> {format(new Date(created_at), 'MM/dd/yyyy')}</p>
                        {valid_until && (
                            <p><span className="font-semibold">Valid Until:</span> {format(new Date(valid_until), 'MM/dd/yyyy')}</p>
                        )}
                        {data.project_title && (
                            <p><span className="font-semibold">Project:</span> {data.project_title}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Entities */}
            <div className="flex justify-between mb-8">
                <div>
                    <h3 className="font-bold text-black mb-1">From:</h3>
                    <div className="text-black">
                        <p className="font-semibold text-lg">Strucureo</p>
                        <p>Your Professional Solution Partner</p>
                        <p>support@strucureo.com</p>
                        <p>+91 6385362719</p>
                    </div>
                </div>
                <div className="text-right">
                    <h3 className="font-bold text-black mb-1">To:</h3>
                    <div className="text-black">
                        {data.client_is_company ? (
                            <>
                                <p className="font-semibold text-lg">{data.client_company || 'Company Name'}</p>
                                {data.client_name && <p>Attn: {data.client_name}</p>}
                            </>
                        ) : (
                            <>
                                <p className="font-semibold text-lg">{data.client_name || client?.full_name || 'Client Name'}</p>
                                {data.client_company && <p>{data.client_company}</p>}
                            </>
                        )}
                        {data.client_address && <p>{data.client_address}</p>}
                        <p>{data.client_email || client?.email || ''}</p>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-800 text-white">
                            <th className="py-2 px-4 text-left rounded-tl-md">Description</th>
                            <th className="py-2 px-4 text-right">Quantity</th>
                            <th className="py-2 px-4 text-right">Unit Price</th>
                            <th className="py-2 px-4 text-right rounded-tr-md">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-gray-400">
                                    No items added
                                </td>
                            </tr>
                        ) : (
                            items.map((item, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="py-2 px-4 border-b">{item.description || 'Item Name'}</td>
                                    <td className="py-2 px-4 text-right border-b">{item.quantity}</td>
                                    <td className="py-2 px-4 text-right border-b">{formatCurrency(item.unit_price)}</td>
                                    <td className="py-2 px-4 text-right border-b font-medium">{formatCurrency(item.total)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
                <div className="w-1/2">
                    <div className="flex justify-between py-2 border-t border-b border-gray-200">
                        <span className="font-bold text-lg">Total Amount</span>
                        <span className="font-bold text-2xl text-black">{formatCurrency(amount)}</span>
                    </div>
                </div>
            </div>

            {/* Notes */}
            {notes && (
                <div className="mb-8 border-t pt-4">
                    <h3 className="font-bold text-black mb-2">Notes</h3>
                    <p className="text-black whitespace-pre-wrap">{notes}</p>
                </div>
            )}

            {/* Footer */}
            <div className="text-center text-black text-xs mt-12 border-t pt-4">
                Powered by BridgeBreak Software
            </div>
        </div>
    );
}
