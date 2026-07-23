'use server';

import { revalidatePath } from 'next/cache';
import { updateProject, createProject } from '@/lib/firebase/database';

export async function updateProjectAction(projectId: string, updates: Record<string, unknown>, path?: string) {
  try {
    const success = await updateProject(projectId, updates);

    if (success && path) {
      revalidatePath(path);
    }

    return { success, error: success ? null : 'Failed to update project' };
  } catch (error) {
    console.error('Project Update Action Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function createProjectAction(projectData: Record<string, unknown>) {
  try {
    const id = await createProject(projectData as any);

    if (id) {
      revalidatePath('/projects');
      return { success: true, id };
    }

    return { success: false, error: 'Failed to create project' };
  } catch (error) {
    return { success: false, error: 'Internal server error' };
  }
}
