'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createMediaItem } from '@/lib/firebase/database';
import { Upload, ImageIcon, FileText, Video, Music } from 'lucide-react';

interface MediaItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function MediaItemDialog({ open, onOpenChange, onSaved }: MediaItemDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'media');
      formData.append('path', `uploads/${Date.now()}-${file.name}`);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Upload failed');
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let type = 'document';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) type = 'image';
      else if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) type = 'video';
      else if (['mp3', 'wav', 'ogg'].includes(ext)) type = 'audio';

      const sizeInMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

      await createMediaItem({
        name: file.name,
        type,
        size: sizeInMB,
        dimensions: type === 'image' ? '-' : '-',
        url: data.url,
      });

      toast.success('File uploaded');
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const typeIcon = file
    ? file.type.startsWith('image') ? <ImageIcon size={32} className="text-muted-foreground/50" />
      : file.type.startsWith('video') ? <Video size={32} className="text-muted-foreground/50" />
      : file.type.startsWith('audio') ? <Music size={32} className="text-muted-foreground/50" />
      : <FileText size={32} className="text-muted-foreground/50" />
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
          <DialogDescription>Select a file to upload to the media library.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />
            {file ? (
              <div className="space-y-2">
                {preview ? (
                  <Image src={preview} alt="Preview" width={200} height={128} className="max-h-32 w-auto mx-auto rounded" />
                ) : (
                  <div className="flex justify-center">{typeIcon}</div>
                )}
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload size={32} className="mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Click to select a file</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>Cancel</Button>
            <Button type="submit" disabled={!file || uploading}>{uploading ? 'Uploading...' : 'Upload'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
