import re

with open('lib/db/types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Clean up duplicate `workspace_id: string;` which appears consecutively
content = re.sub(r'  workspace_id: string;\n  workspace_id: string;\n', '  workspace_id: string;\n', content)

# 2. Clean up duplicate `discount?: number;` which appears consecutively or nearby
content = re.sub(r"  discount\?: number; // Legacy\n  discount_type\?: 'percentage' \| 'fixed'; // Legacy\n  discount_percent\?: number;\n  cgst_percent\?: number;\n  tax_rate\?: number;\n  discount\?: number; // Legacy\n  discount_type\?: 'percentage' \| 'fixed'; // Legacy", "  discount?: number; // Legacy\n  discount_type?: 'percentage' | 'fixed'; // Legacy\n  discount_percent?: number;\n  cgst_percent?: number;\n  tax_rate?: number;", content)

# Fix discount duplicates explicitly
content = re.sub(r"  discount\?: number;\n  discount_type\?: 'percentage' \| 'fixed';\n  tax_rate\?: number;\n  discount\?: number;\n  discount_type\?: 'percentage' \| 'fixed';", "  discount?: number;\n  discount_type?: 'percentage' | 'fixed';\n  tax_rate?: number;", content)
content = re.sub(r"  discount\?: number; // Legacy\n  discount_type\?: 'percentage' \| 'fixed'; // Legacy\n  discount\?: number; // Legacy\n  discount_type\?: 'percentage' \| 'fixed'; // Legacy", "  discount?: number; // Legacy\n  discount_type?: 'percentage' | 'fixed'; // Legacy", content)

# 3. Add payment_type to NormalizedPayment if not exists
if 'payment_type' not in content.split('export interface NormalizedPayment')[1]:
    content = content.replace("  notes?: string;\n\n  // Computed from relationships", "  notes?: string;\n  payment_type?: 'full' | 'partial' | 'excess';\n\n  // Computed from relationships")

with open('lib/db/types.ts', 'w', encoding='utf-8') as f:
    f.write(content)
