import { supabase } from './client';

export const uploadFile = async (bucket: string, path: string, file: File) => {
    try {
        // Sanitize path/filename
        const sanitizedPath = path.split('/').map(p => p.replace(/[^a-zA-Z0-9.-]/g, '_')).join('/');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', bucket);
        formData.append('path', sanitizedPath);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Upload failed');
        }

        const data = await response.json();
        return data.url;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
};

export const deleteFile = async (bucket: string, path: string) => {
    try {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([path]);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
};

export const getPublicUrl = (bucket: string, path: string) => {
    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

    return publicUrl;
};
