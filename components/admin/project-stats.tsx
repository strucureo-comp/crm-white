'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Project } from '@/lib/db/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DollarSign, FolderKanban, CheckCircle2, Clock } from 'lucide-react';

interface ProjectStatsProps {
    projects: Project[];
}

export function ProjectStats({ projects }: ProjectStatsProps) {
    const stats = useMemo(() => {
        const total = projects.length;
        const active = projects.filter(p => ['accepted', 'in_progress', 'testing'].includes(p.status)).length;
        const completed = projects.filter(p => p.status === 'completed').length;
        const pending = projects.filter(p => ['pending', 'under_review'].includes(p.status)).length;

        // Calculate total estimated value (just a rough sum of estimated_cost)
        const totalValue = projects.reduce((acc, curr) => acc + (curr.estimated_cost || 0), 0);
        const activeValue = projects
            .filter(p => ['accepted', 'in_progress', 'testing'].includes(p.status))
            .reduce((acc, curr) => acc + (curr.estimated_cost || 0), 0);

        return { total, active, completed, pending, totalValue, activeValue };
    }, [projects]);

    const chartData = [
        { name: 'Active', value: stats.active, color: '#3b82f6' }, // blue-500
        { name: 'Completed', value: stats.completed, color: '#22c55e' }, // green-500
        { name: 'Pending', value: stats.pending, color: '#eab308' }, // yellow-500
        { name: 'Other', value: stats.total - (stats.active + stats.completed + stats.pending), color: '#94a3b8' }, // slate-400
    ].filter(item => item.value > 0);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground">
                        {stats.active} active now
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.pending}</div>
                    <p className="text-xs text-muted-foreground">
                        Awaiting approval
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.completed}</div>
                    <p className="text-xs text-muted-foreground">
                        Successfully delivered
                    </p>
                </CardContent>
            </Card>

            <Card className="col-span-1 md:col-span-2 lg:col-span-1 border-none shadow-none bg-transparent p-0">
                {/* Placeholder for alignment or extra card */}
                <div className="h-full w-full flex items-center justify-center p-4">
                    <ResponsiveContainer width="100%" height={100}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={25}
                                outerRadius={40}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ fontSize: '12px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
}
