'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Invoice, Transaction } from '@/lib/db/types';

interface FinanceChartsProps {
    invoices: Invoice[];
    transactions: Transaction[];
}

export function FinanceCharts({ invoices, transactions }: FinanceChartsProps) {
    const chartData = useMemo(() => {
        const months: Record<string, { income: number; expense: number; name: string; sortKey: number }> = {};

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            const name = d.toLocaleString('default', { month: 'short' });
            months[key] = { income: 0, expense: 0, name, sortKey: d.getTime() };
        }

        // Process Invoices (Income)
        invoices.forEach(inv => {
            if (inv.status === 'paid' && inv.paid_at) {
                const d = new Date(inv.paid_at);
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                if (months[key]) months[key].income += inv.amount;
            }
        });

        // Process Transactions (Income & Expense)
        transactions.forEach(t => {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (months[key]) {
                if (t.type === 'income') months[key].income += t.amount;
                else months[key].expense += t.amount;
            }
        });

        return Object.values(months).sort((a, b) => a.sortKey - b.sortKey);
    }, [invoices, transactions]);

    const expenseData = useMemo(() => {
        const categories: Record<string, number> = {};
        transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                const cat = t.category || 'Other';
                categories[cat] = (categories[cat] || 0) + t.amount;
            });

        return Object.keys(categories).map(name => ({ name, value: categories[name] })).sort((a, b) => b.value - a.value);
    }, [transactions]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mb-8">
            <Card className="col-span-4 shadow-sm border-none bg-gradient-to-br from-white to-gray-50/50">
                <CardHeader>
                    <CardTitle>Revenue & Expenses</CardTitle>
                    <CardDescription>Monthly financial performance over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <Area type="monotone" dataKey="income" name="Income" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                            <Area type="monotone" dataKey="expense" name="Expenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="col-span-3 shadow-sm border-none bg-gradient-to-br from-white to-gray-50/50">
                <CardHeader>
                    <CardTitle>Expense Breakdown</CardTitle>
                    <CardDescription>Spending by category</CardDescription>
                </CardHeader>
                <CardContent>
                    {expenseData.length === 0 ? (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">No expenses recorded</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={expenseData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {expenseData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
