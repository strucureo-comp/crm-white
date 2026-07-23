'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DocumentPayment } from './types';
import { formatDocumentCurrency } from './types';

interface PaymentSectionProps {
  payment: DocumentPayment;
  onPaymentChange: (payment: Partial<DocumentPayment>) => void;
  grandTotal: number;
  currency: string;
}

export function PaymentSection({ payment, onPaymentChange, grandTotal, currency }: PaymentSectionProps) {
  const balanceDue = grandTotal - payment.amount_paid;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Payment Details</h2>
        <p className="text-sm text-muted-foreground">Configure payment terms and track payment status.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Payment Terms</Label>
          <Select
            value={payment.payment_terms}
            onValueChange={(v) => onPaymentChange({ payment_terms: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
              <SelectItem value="net_7">Net 7 Days</SelectItem>
              <SelectItem value="net_15">Net 15 Days</SelectItem>
              <SelectItem value="net_30">Net 30 Days</SelectItem>
              <SelectItem value="net_45">Net 45 Days</SelectItem>
              <SelectItem value="net_60">Net 60 Days</SelectItem>
              <SelectItem value="50_advance">50% Advance</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select
            value={payment.payment_method}
            onValueChange={(v) => onPaymentChange({ payment_method: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bank_transfer">Bank Transfer (NEFT/RTGS)</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
              <SelectItem value="credit_card">Credit Card</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Amount Paid</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={payment.amount_paid}
            onChange={(e) => onPaymentChange({ amount_paid: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Balance Due</Label>
          <div className={`h-10 flex items-center text-sm font-semibold border rounded-md px-3 ${balanceDue > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {formatDocumentCurrency(balanceDue, currency)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Payment Date</Label>
          <Input
            type="date"
            value={payment.payment_date}
            onChange={(e) => onPaymentChange({ payment_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Transaction ID</Label>
          <Input
            value={payment.transaction_id}
            onChange={(e) => onPaymentChange({ transaction_id: e.target.value })}
            placeholder="TXN-2024-001"
          />
        </div>
      </div>
    </div>
  );
}
