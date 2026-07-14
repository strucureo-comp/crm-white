'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, X, FileIcon } from 'lucide-react';
import { uploadFile } from '@/lib/supabase/storage';
import { toast } from 'sonner';

interface FileUploaderProps {
    bucket: string;
    path: string;
    onUploadComplete: (url: string) => void;
    label?: string;
    disabled?: boolean;
}

export function FileUploader({
    bucket,
    path,
    onUploadComplete,
    label = 'Upload File',
    disabled = false,
}: FileUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        try {
            const fileName = `${Date.now()}-${file.name}`;
            const filePath = `${path}/${fileName}`;
            const url = await uploadFile(bucket, filePath, file);

            onUploadComplete(url);
            setFile(null);
            toast.success('File uploaded successfully!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            {label && <Label>{label}</Label>}
            <div className="flex items-center gap-4">
                {!file ? (
                    <div className="flex-1">
                        <Input
                            type="file"
                            onChange={handleFileChange}
                            disabled={disabled || uploading}
                            className="cursor-pointer"
                        />
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-between p-2 border rounded-md bg-muted/50">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <FileIcon className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm truncate">{file.name}</span>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setFile(null)}
                            disabled={uploading}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {file && (
                    <Button
                        type="button"
                        onClick={handleUpload}
                        disabled={disabled || uploading}
                    >
                        {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload
                    </Button>
                )}
            </div>
        </div>
    );
}
