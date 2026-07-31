const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/(dashboard)/payments/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Imports
content = content.replace(
  "import { createPayment, deletePayment, subscribeToPayments } from '@/lib/db/payments/api';",
  "import { createPayment, updatePayment, deletePayment, subscribeToPayments } from '@/lib/db/payments/api';\nimport {\n  DropdownMenu,\n  DropdownMenuContent,\n  DropdownMenuItem,\n  DropdownMenuSeparator,\n  DropdownMenuTrigger,\n} from '@/components/ui/dropdown-menu';"
);

// 2. State
content = content.replace(
  "const [modalOpen, setModalOpen] = useState(false);",
  "const [modalOpen, setModalOpen] = useState(false);\n  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);\n  const [viewingPayment, setViewingPayment] = useState<NormalizedPayment | null>(null);"
);

// 3. Form submission
content = content.replace(
  /const handleRecordPayment = async \(e: React\.FormEvent\) => \{.*?setForm\(\{ client: '', invoiceId: '', amount: '', method: 'upi', status: 'completed' \}\);\n    \} catch \(error\) \{.*?^\s*\};/ms,
  `const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client || !form.invoiceId || !form.amount) return;

    try {
      if (editingPaymentId) {
        await updatePayment(WORKSPACE_ID, editingPaymentId, {
          company_id: form.client,
          invoice_id: form.invoiceId,
          amount: parseFloat(form.amount),
          method: form.method,
          status: form.status,
        });
        toast.success('Payment updated');
      } else {
        await createPayment(WORKSPACE_ID, {
          company_id: form.client,
          contact_id: '',
          invoice_id: form.invoiceId,
          quote_id: '',
          deal_id: '',
          amount: parseFloat(form.amount),
          currency: 'INR',
          method: form.method,
          reference: '',
          status: form.status,
          date: new Date().toISOString(),
          notes: ''
        });
        toast.success('Payment recorded');
      }
      setModalOpen(false);
      setEditingPaymentId(null);
      setForm({ client: '', invoiceId: '', amount: '', method: 'upi', status: 'completed' });
    } catch (error) {
      toast.error('Failed to save payment');
    }
  };`
);

// 4. Dropdown Menu in JSX
const oldMenuRegex = /<div className="relative group inline-block">.*?<\/div>\s*<\/div>/s;
const newMenu = `<DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingPayment(txn)}>
                            <Eye size={14} className="mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setEditingPaymentId(txn.payment_id);
                            setForm({
                              client: txn.company_id,
                              invoiceId: txn.invoice_id,
                              amount: txn.amount.toString(),
                              method: txn.method,
                              status: txn.status
                            });
                            setModalOpen(true);
                          }}>
                            <Pencil size={14} className="mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDelete(txn.payment_id)} 
                            disabled={deleting === txn.payment_id}
                          >
                            <Trash size={14} className="mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>`;
content = content.replace(oldMenuRegex, newMenu);

// replace all instances of oldMenuRegex if there are more
while(oldMenuRegex.test(content)) {
    content = content.replace(oldMenuRegex, newMenu);
}

// 5. Open Modal button
content = content.replace(
  /onClick=\{\(\) => setModalOpen\(true\)\}/,
  `onClick={() => {
            setEditingPaymentId(null);
            setForm({ client: '', invoiceId: '', amount: '', method: 'upi', status: 'completed' });
            setModalOpen(true);
          }}`
);

// 6. Close Modal button
content = content.replace(
  /onClick=\{\(\) => setModalOpen\(false\)\}/g,
  `onClick={() => {
                  setModalOpen(false);
                  setEditingPaymentId(null);
                  setForm({ client: '', invoiceId: '', amount: '', method: 'upi', status: 'completed' });
                }}`
);

// 7. Modal Title
content = content.replace(
  /<h3 className="text-lg font-semibold">Record Payment<\/h3>/,
  '<h3 className="text-lg font-semibold">{editingPaymentId ? "Edit Payment" : "Record Payment"}</h3>'
);

// 8. View Modal JSX
const viewModalJSX = `
      {/* View Payment Modal */}
      {viewingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setViewingPayment(null)}></div>
          <div className="bg-background rounded-xl border shadow-lg w-full max-w-md relative z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-semibold">Payment Details</h3>
              <button onClick={() => setViewingPayment(null)} className="text-muted-foreground hover:bg-muted p-1 rounded-md transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Transaction ID</p>
                  <p className="font-medium font-mono">{viewingPayment.payment_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Date</p>
                  <p className="font-medium">{new Date(viewingPayment.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Client</p>
                  <p className="font-medium">{viewingPayment.company_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Invoice ID</p>
                  <p className="font-medium text-blue-600 dark:text-blue-400">{viewingPayment.invoice_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Amount</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(viewingPayment.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Method</p>
                  <p className="font-medium capitalize">{viewingPayment.method.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <span className={\`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium \${
                    viewingPayment.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    viewingPayment.status === 'failed' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  }\`}>
                    {viewingPayment.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-5 border-t flex justify-end">
              <button onClick={() => setViewingPayment(null)} className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-sm font-medium rounded-md transition-colors shadow-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

content = content.replace(/<\/div>\s*<\/div>\s*\)\s*\}\s*$/s, "</div>" + viewModalJSX);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update complete');
