import { supabase } from '../supabase/client';

export async function uploadProjectPreview(projectId: string, file: File): Promise<string | null> {
    try {
        const fileName = `preview_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const filePath = `${projectId}/${fileName}`;

        const { data, error } = await supabase.storage
            .from('projects')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Supabase upload error:', error);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('projects')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Error uploading to Supabase:', error);
        return null;
    }
}

export const uploadProjectImage = uploadProjectPreview;

export async function uploadTicketAttachment(projectId: string, file: File): Promise<string | null> {
    try {
        const fileName = `ticket_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const filePath = `${projectId}/tickets/${fileName}`;

        const { data, error } = await supabase.storage
            .from('projects')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Supabase upload error:', error);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('projects')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Error uploading ticket attachment to Supabase:', error);
        return null;
    }
}
