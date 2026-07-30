'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Calendar, Building2, Users, Tag, Share2, Download, LayoutTemplate, 
  Plus, X, Save, Settings, Trash2, LayoutDashboard, ArrowUpRight, ArrowDownRight, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog';

// --- Data Schemas ---
type WidgetType = 'kpi' | 'bar' | 'donut' | 'line' | 'pie' | 'funnel' | 'area';

interface WidgetConfig {
  module: string;
  metric: string;
  groupBy?: string;
  colorTheme: string;
  dateRange?: string;
  dataSource?: string;
}

interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  config: WidgetConfig;
}

interface GlobalFilters {
  dateRange: string;
  pipeline: string;
  owner: string;
  tag: string;
}

// --- Mock Data ---
const MOCK_BAR_DATA = [
  { name: 'Jan', value: 400 }, { name: 'Feb', value: 300 }, { name: 'Mar', value: 550 },
  { name: 'Apr', value: 450 }, { name: 'May', value: 600 }, { name: 'Jun', value: 800 }
];

const MOCK_LINE_DATA = [
  { name: 'Week 1', value: 120 }, { name: 'Week 2', value: 250 }, { name: 'Week 3', value: 180 }, { name: 'Week 4', value: 390 }
];

const MOCK_PIE_DATA = [
  { name: 'Enterprise', value: 400 }, { name: 'SMB', value: 300 }, { name: 'Startup', value: 300 }
];

const MOCK_FUNNEL_DATA = [
  { name: 'Leads', value: 1000 },
  { name: 'Qualified', value: 800 },
  { name: 'Proposals', value: 600 },
  { name: 'Negotiation', value: 300 },
  { name: 'Closed Won', value: 150 },
];

const INITIAL_WIDGETS: Widget[] = [];

const THEME_COLORS: Record<string, string[]> = {
  '#8b5cf6': ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'],
  '#ec4899': ['#ec4899', '#f472b6', '#fbcfe8', '#fce7f3'],
  '#3b82f6': ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
  '#10b981': ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
  '#f59e0b': ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],
};

// --- Components ---

const WidgetRenderer = ({ widget }: { widget: Widget }) => {
  const color = widget.config.colorTheme || '#8b5cf6';
  const palette = THEME_COLORS[color] || THEME_COLORS['#8b5cf6'];

  switch (widget.type) {
    case 'kpi':
      return (
        <div className="flex flex-col h-full justify-center">
          <div className="flex items-end gap-3 mb-2">
            <span className="text-4xl font-black tracking-tighter text-slate-900">$124.5k</span>
            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 font-bold mb-1"><ArrowUpRight className="w-3 h-3 mr-0.5" /> 12%</Badge>
          </div>
          <span className="text-sm font-semibold text-slate-500">vs last month</span>
        </div>
      );
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={MOCK_BAR_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }} />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    case 'line':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={MOCK_LINE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={{ strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    case 'area':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={MOCK_BAR_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`color-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }} />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={3} fillOpacity={1} fill={`url(#color-${widget.id})`} />
          </AreaChart>
        </ResponsiveContainer>
      );
    case 'pie':
    case 'donut':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={MOCK_PIE_DATA} innerRadius={widget.type === 'donut' ? 60 : 0} outerRadius={100} paddingAngle={2} dataKey="value" stroke="none">
              {MOCK_PIE_DATA.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }} />
          </PieChart>
        </ResponsiveContainer>
      );
    case 'funnel':
      // Custom Funnel Approximation since Recharts Funnel isn't perfectly responsive out of the box in this setup
      const maxVal = Math.max(...MOCK_FUNNEL_DATA.map(d => d.value));
      return (
        <div className="flex flex-col h-full justify-center gap-2">
          {MOCK_FUNNEL_DATA.map((step, i) => {
            const width = Math.max((step.value / maxVal) * 100, 10);
            return (
              <div key={i} className="flex flex-col items-center group">
                <div className="w-full flex justify-between text-xs font-bold text-slate-500 mb-1 px-4">
                  <span>{step.name}</span>
                  <span>{step.value}</span>
                </div>
                <div 
                  className="h-8 rounded-full transition-all duration-500 flex items-center justify-center relative overflow-hidden"
                  style={{ width: `${width}%`, backgroundColor: palette[i % palette.length] }}
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {i < MOCK_FUNNEL_DATA.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-slate-300 my-1 rotate-90" />
                )}
              </div>
            )
          })}
        </div>
      );
    default:
      return <div className="flex items-center justify-center h-full text-slate-400 font-bold">Unsupported Type</div>;
  }
};

export default function AnalyticsDashboard() {
  const [isClient, setIsClient] = useState(false);
  
  // Global State
  const [isEditMode, setIsEditMode] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>(INITIAL_WIDGETS);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  
  const [globalFilters, setGlobalFilters] = useState<GlobalFilters>({
    dateRange: '30days',
    pipeline: 'all',
    owner: 'all',
    tag: 'all'
  });

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => setIsClient(true), []);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !isEditMode) return;
    
    const items = Array.from(widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setWidgets(items);
  };

  const removeWidget = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWidgets(prev => prev.filter(w => w.id !== id));
    if (selectedWidgetId === id) setSelectedWidgetId(null);
  };

  const getWidgetStyle = (type: WidgetType) => {
    switch (type) {
      case 'kpi': return { width: 'calc(25% - 15px)', minWidth: '200px', height: '160px', flexGrow: 1 };
      case 'pie':
      case 'donut': return { width: '380px', height: '380px' };
      case 'funnel': return { width: '380px', height: '460px' };
      default: return { width: 'calc(50% - 10px)', minWidth: '400px', height: '380px', flexGrow: 1 };
    }
  };

  if (!isClient) return null; // Avoid hydration mismatch with DndKit/Recharts

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-0 bg-[#f8fafc]">
      
      {/* 2. Global Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border-b border-slate-200 shrink-0 z-20 shadow-sm relative">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#1e1a4f] font-sans" style={{ fontFamily: "'Outfit', sans-serif" }}>Analytics Dashboard</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Real-time performance metrics across all client accounts.</p>
          </div>
          {isEditMode && <Badge className="bg-blue-50 text-blue-700 border-blue-200 uppercase font-black tracking-widest text-[10px] h-6 px-3">Edit Mode</Badge>}
        </div>
        
        <div className="flex items-center gap-3">
          {!isEditMode ? (
            <>
              <Button variant="ghost" className="font-bold text-slate-600 hover:text-slate-900 rounded-xl"><Share2 className="w-4 h-4 mr-2" /> Share</Button>
              <Button variant="ghost" className="font-bold text-slate-600 hover:text-slate-900 rounded-xl"><Download className="w-4 h-4 mr-2" /> Export</Button>
              <Button className="bg-[#1e1a4f] hover:bg-[#2d2770] text-white rounded-xl shadow-md font-bold px-5" onClick={() => setIsEditMode(true)}>
                <LayoutTemplate className="w-4 h-4 mr-2" /> Edit Layout
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50 font-bold rounded-xl shadow-sm bg-white" onClick={() => setIsAddOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Component
              </Button>
              <div className="w-px h-8 bg-slate-200 mx-1" />
              <Button variant="ghost" className="font-bold text-slate-600 hover:text-slate-900 rounded-xl" onClick={() => { setIsEditMode(false); setSelectedWidgetId(null); }}>
                Cancel
              </Button>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md font-bold px-5" onClick={() => { setIsEditMode(false); setSelectedWidgetId(null); }}>
                <Save className="w-4 h-4 mr-2" /> Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Global Filters Row */}
      <div className="bg-white border-b border-slate-200 p-3 px-5 flex flex-wrap items-center gap-4 shrink-0 z-10">
        <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Filters:</span>
        <Select value={globalFilters.dateRange} onValueChange={v => setGlobalFilters(p => ({...p, dateRange: v}))}>
          <SelectTrigger className="w-[180px] h-9 bg-slate-50 border-transparent shadow-none font-bold text-sm hover:bg-slate-100 transition-colors rounded-lg"><Calendar className="w-4 h-4 mr-2 text-slate-400" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="7days">Last 7 Days</SelectItem><SelectItem value="30days">Last 30 Days</SelectItem><SelectItem value="thisYear">This Year</SelectItem></SelectContent>
        </Select>
        <Select value={globalFilters.pipeline} onValueChange={v => setGlobalFilters(p => ({...p, pipeline: v}))}>
          <SelectTrigger className="w-[180px] h-9 bg-slate-50 border-transparent shadow-none font-bold text-sm hover:bg-slate-100 transition-colors rounded-lg"><Building2 className="w-4 h-4 mr-2 text-slate-400" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Pipelines</SelectItem><SelectItem value="sales">Sales Pipeline</SelectItem><SelectItem value="partners">Partner Pipeline</SelectItem></SelectContent>
        </Select>
        <Select value={globalFilters.owner} onValueChange={v => setGlobalFilters(p => ({...p, owner: v}))}>
          <SelectTrigger className="w-[180px] h-9 bg-slate-50 border-transparent shadow-none font-bold text-sm hover:bg-slate-100 transition-colors rounded-lg"><Users className="w-4 h-4 mr-2 text-slate-400" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Owners</SelectItem><SelectItem value="me">Assigned to Me</SelectItem></SelectContent>
        </Select>
        <Select value={globalFilters.tag} onValueChange={v => setGlobalFilters(p => ({...p, tag: v}))}>
          <SelectTrigger className="w-[180px] h-9 bg-slate-50 border-transparent shadow-none font-bold text-sm hover:bg-slate-100 transition-colors rounded-lg"><Tag className="w-4 h-4 mr-2 text-slate-400" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Tags</SelectItem><SelectItem value="enterprise">Enterprise</SelectItem><SelectItem value="smb">SMB</SelectItem></SelectContent>
        </Select>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* 3. The Canvas Grid */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
          {widgets.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mb-6">
                <LayoutDashboard className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Your Dashboard is Empty</h3>
              <p className="text-slate-500 font-medium mt-2 mb-6 max-w-sm">Start building your custom view by adding components to the grid.</p>
              {!isEditMode && <Button onClick={() => setIsEditMode(true)} className="rounded-xl font-bold bg-[#1e1a4f] text-white">Edit Layout</Button>}
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="dashboard" direction="horizontal" isDropDisabled={!isEditMode}>
                {(provided, snapshot) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    className="flex flex-wrap gap-5 w-full items-start"
                  >
                    {widgets.map((w, index) => (
                      <Draggable key={w.id} draggableId={w.id} index={index} isDragDisabled={!isEditMode}>
                        {(provided, snapshot) => {
                          const style = getWidgetStyle(w.type);
                          const isSelected = selectedWidgetId === w.id;
                          
                          return (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{ 
                                ...provided.draggableProps.style,
                                ...style,
                                opacity: snapshot.isDragging ? 0.8 : 1,
                                zIndex: snapshot.isDragging ? 50 : 1,
                              }}
                              className={`relative group bg-white rounded-[16px] border shadow-sm flex flex-col transition-all duration-200
                                ${isEditMode ? 'cursor-grab active:cursor-grabbing hover:border-slate-300' : ''}
                                ${isSelected && isEditMode ? 'ring-2 ring-blue-500 border-blue-500 shadow-md' : 'border-slate-200'}
                              `}
                              onClick={() => { if(isEditMode) setSelectedWidgetId(w.id); }}
                            >
                              <div className="p-5 border-b border-slate-100 shrink-0 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800">{w.title}</h3>
                                {isEditMode && (
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-slate-100 absolute top-3 right-3">
                                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Settings className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={(e) => removeWidget(w.id, e)}><Trash2 className="w-4 h-4" /></Button>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 p-5 min-h-0 relative">
                                <WidgetRenderer widget={w} />
                                {isEditMode && <div className="absolute inset-0 bg-transparent" />} {/* Overlay to prevent interactions during edit mode */}
                              </div>
                            </div>
                          )
                        }}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>

        {/* 6. Configurator Panel */}
        {isEditMode && selectedWidgetId && (
          <div className="w-80 border-l border-slate-200 bg-white shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.1)] z-20 flex flex-col shrink-0 animate-in slide-in-from-right-4 duration-300">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900 tracking-tight">Widget Settings</h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setSelectedWidgetId(null)}><X className="w-4 h-4" /></button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Widget Title</label>
                <Input 
                  value={widgets.find(w => w.id === selectedWidgetId)?.title || ''} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWidgets(prev => prev.map(w => w.id === selectedWidgetId ? {...w, title: e.target.value} : w))}
                  className="h-10 bg-slate-50 border-slate-200 font-bold rounded-xl focus-visible:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Data Source</label>
                <Select defaultValue="sales">
                  <SelectTrigger className="h-10 bg-slate-50 border-slate-200 font-bold rounded-xl focus-visible:ring-blue-500"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="sales">Sales Module</SelectItem><SelectItem value="marketing">Marketing Module</SelectItem></SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Color Theme</label>
                <div className="flex items-center gap-3 flex-wrap">
                  {Object.keys(THEME_COLORS).map(c => (
                    <button
                      key={c}
                      className={`w-8 h-8 rounded-full ring-2 ring-offset-2 transition-all ${widgets.find(w => w.id === selectedWidgetId)?.config.colorTheme === c ? 'ring-blue-500' : 'ring-transparent hover:ring-slate-300'}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setWidgets(prev => prev.map(w => w.id === selectedWidgetId ? {...w, config: {...w.config, colorTheme: c}} : w))}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Component Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[600px] p-8 bg-white border-0 shadow-2xl rounded-[1.5rem] gap-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-[#1e1a4f] tracking-tight">Add Component</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {['KPI', 'Bar Chart', 'Line Chart', 'Donut Chart', 'Funnel', 'Area Chart'].map(type => (
              <div key={type} className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors group">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <LayoutDashboard className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                </div>
                <span className="font-bold text-sm text-slate-700">{type}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
