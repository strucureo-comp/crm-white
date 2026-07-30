'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Upload, Search, Folder, CloudUpload, Eye, Download, Trash2, 
  MoreHorizontal, FileImage, FileVideo, FileText, File as FileIcon, 
  CheckCircle2, FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

// --- Data Schema ---
export type Asset = { 
  id: string;
  name: string; 
  type: string; 
  size: string; 
  folder: string; 
  badge: string; 
  icon: string;  
  date: string;
};

const FOLDERS = [
  'Brand guidelines',
  'Campaign creatives',
  'Product screenshots',
  'Social media templates',
  'Videos & reels'
];

const ASSET_TYPES = ['Image', 'Video', 'PDF', 'Document'];

const TYPE_CONFIG: Record<string, { badge: string; icon: string }> = {
  'Image': { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', icon: '🖼️' },
  'Video': { badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400', icon: '🎥' },
  'PDF': { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400', icon: '📄' },
  'Document': { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400', icon: '📝' }
};

export default function AssetsPage() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // State
  const [assets, setAssets] = useState<Asset[]>([]);
  
  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All types');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);

  // Upload Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Image');
  const [formFolder, setFormFolder] = useState(FOLDERS[0]);

  // Derived Data
  const recentUploads = useMemo(() => {
    return [...assets].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'All types' || asset.type === typeFilter;
      const matchesFolder = activeFolder ? asset.folder === activeFolder : true;
      return matchesSearch && matchesType && matchesFolder;
    });
  }, [assets, search, typeFilter, activeFolder]);

  // KPIs
  const totalAssets = assets.length;
  const imageCount = assets.filter(a => a.type === 'Image').length;
  const videoCount = assets.filter(a => a.type === 'Video').length;
  const documentCount = assets.filter(a => a.type === 'PDF' || a.type === 'Document').length;

  // Handlers
  const handleUpload = () => {
    if (!formName.trim()) return toast.error('File name is required');
    
    const config = TYPE_CONFIG[formType] || TYPE_CONFIG['Document'];
    const newAsset: Asset = {
      id: Date.now().toString(),
      name: formName,
      type: formType,
      folder: formFolder,
      size: `${(Math.random() * 10 + 0.1).toFixed(1)} MB`, // Mock size
      date: new Date().toISOString(),
      badge: config.badge,
      icon: config.icon
    };

    setAssets([newAsset, ...assets]);
    setIsUploadOpen(false);
    
    // Reset Form
    setFormName('');
    setFormType('Image');
    setFormFolder(FOLDERS[0]);
    
    toast.success('Asset uploaded successfully!', {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-lg'
    });
  };

  const handleDelete = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
    toast.success('Asset deleted.', {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-lg'
    });
    if (viewingAsset?.id === id) setViewingAsset(null);
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6 flex flex-col min-h-0">
      
      {/* 2. Global Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Assets</h2>
          <p className="text-sm text-muted-foreground mt-1">Images, videos, brand files</p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)} className="shadow-sm bg-primary text-primary-foreground font-semibold">
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      </div>

      {/* 3. KPIs Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <Card className="border shadow-sm">
          <CardContent className="p-6 flex flex-col justify-center">
            <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
            <p className="text-4xl font-bold mt-2">{totalAssets}</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium">+{(totalAssets * 0.1).toFixed(0)} this month</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-6 flex flex-col justify-center">
            <p className="text-sm font-medium text-muted-foreground">Images</p>
            <p className="text-4xl font-bold mt-2">{imageCount}</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium">PNG, JPG, SVG</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-6 flex flex-col justify-center">
            <p className="text-sm font-medium text-muted-foreground">Videos</p>
            <p className="text-4xl font-bold mt-2">{videoCount}</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium">MP4, MOV</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-6 flex flex-col justify-center">
            <p className="text-sm font-medium text-muted-foreground">Documents</p>
            <p className="text-4xl font-bold mt-2">{documentCount}</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium">PDF, DOCX</p>
          </CardContent>
        </Card>
      </div>

      {/* 4. Folders & Recent Uploads (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
        
        {/* Left Column - Folders */}
        <Card className="border shadow-sm flex flex-col h-[320px]">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" /> Folders
            </CardTitle>
          </CardHeader>
          <div className="p-2 flex-1 overflow-y-auto">
            <div 
              onClick={() => setActiveFolder(null)}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${activeFolder === null ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-muted border border-transparent'}`}
            >
              <div className="flex items-center gap-3">
                <Folder className={`w-5 h-5 ${activeFolder === null ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium ${activeFolder === null ? 'text-primary' : 'text-foreground'}`}>All Assets</span>
              </div>
              <Badge variant="secondary" className="bg-background border shadow-sm text-xs">{totalAssets}</Badge>
            </div>
            
            {FOLDERS.map(folder => {
              const count = assets.filter(a => a.folder === folder).length;
              const isActive = activeFolder === folder;
              
              return (
                <div 
                  key={folder}
                  onClick={() => setActiveFolder(folder)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-muted border border-transparent'}`}
                >
                  <div className="flex items-center gap-3">
                    <Folder className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>{folder}</span>
                  </div>
                  <Badge variant="secondary" className="bg-background border shadow-sm text-xs">{count}</Badge>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right Column - Recent Uploads */}
        <Card className="border shadow-sm flex flex-col h-[320px]">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CloudUpload className="w-5 h-5 text-emerald-500" /> Recent uploads
            </CardTitle>
          </CardHeader>
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {recentUploads.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <CloudUpload className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm font-medium">No recent uploads</p>
              </div>
            ) : (
              recentUploads.map(asset => (
                <div key={`recent-${asset.id}`} className="flex items-center justify-between p-3 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner ${asset.badge}`}>
                      {asset.icon}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">{asset.name}</p>
                      <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                        {asset.size} &bull; {new Date(asset.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* 5. Filters Section */}
      <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search assets..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-9 bg-background focus-visible:ring-1" 
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-background">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All types">All types</SelectItem>
            {ASSET_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* 6. Assets Data Table */}
      <Card className="border shadow-sm flex-1 flex flex-col min-h-[300px] overflow-hidden">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-medium whitespace-nowrap">File name</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Type</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Size</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Folder</th>
                <th className="px-6 py-4 font-medium text-center whitespace-nowrap w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {filteredAssets.map(asset => (
                <tr key={asset.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{asset.icon}</span>
                      <span className="font-bold text-foreground group-hover:text-primary transition-colors cursor-pointer" onClick={() => setViewingAsset(asset)}>{asset.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border-transparent ${asset.badge}`}>
                      {asset.type}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground font-medium text-xs">
                    {asset.size}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-xs">
                      <Folder className="w-3.5 h-3.5" />
                      {asset.folder}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 border-border/60 shadow-xl backdrop-blur-xl bg-background/95">
                        <DropdownMenuItem onClick={() => setViewingAsset(asset)} className="cursor-pointer">
                          <Eye className="w-4 h-4 mr-2 text-muted-foreground" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Download className="w-4 h-4 mr-2 text-muted-foreground" /> Download
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(asset.id)} className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 font-medium">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="w-10 h-10 mb-3 opacity-20" />
                      <p className="font-medium text-foreground">No assets found.</p>
                      <p className="text-xs mt-1">Try adjusting your filters or search query.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 7. Modals & Notifications */}

      {/* Upload Asset Modal */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl shadow-2xl border-border/60 rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <DialogTitle className="text-xl font-bold">Upload Asset</DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-6">
            
            {/* Drag & Drop Zone */}
            <div className="border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors p-8 flex flex-col items-center justify-center text-center cursor-pointer group">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <CloudUpload className="w-6 h-6 text-primary" />
              </div>
              <p className="font-bold text-sm text-foreground">Drag & drop or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, MP4, PDF supported</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">File Name</Label>
                <Input placeholder="E.g. Logo-Vector-2026.png" value={formName} onChange={(e) => setFormName(e.target.value)} className="bg-background focus-visible:ring-1" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger className="bg-background focus:ring-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Folder</Label>
                  <Select value={formFolder} onValueChange={setFormFolder}>
                    <SelectTrigger className="bg-background focus:ring-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FOLDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

          </div>
          
          <DialogFooter className="p-6 pt-4 border-t bg-muted/10">
            <Button variant="ghost" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} className="shadow-sm font-semibold">Upload Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={!!viewingAsset} onOpenChange={(open) => { if(!open) setViewingAsset(null); }}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl shadow-2xl border-border/60 rounded-2xl">
          {viewingAsset && (
            <>
              <DialogHeader className="p-5 border-b bg-muted/20">
                <DialogTitle className="text-lg font-bold truncate pr-6">{viewingAsset.name}</DialogTitle>
              </DialogHeader>
              
              <div className="p-6">
                <div className={`w-full aspect-video rounded-xl flex items-center justify-center text-7xl shadow-inner mb-6 ${viewingAsset.badge}`}>
                  {viewingAsset.icon}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-transparent">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</span>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border-transparent ${viewingAsset.badge}`}>
                      {viewingAsset.type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-transparent">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Size</span>
                    <span className="text-sm font-bold">{viewingAsset.size}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-transparent">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Folder</span>
                    <div className="flex items-center gap-1.5 text-sm font-bold">
                      <Folder className="w-4 h-4 text-muted-foreground" />
                      {viewingAsset.folder}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="p-5 pt-4 border-t bg-muted/10">
                <Button variant="ghost" onClick={() => setViewingAsset(null)}>Close</Button>
                <Button className="shadow-sm font-semibold bg-primary text-primary-foreground">
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
