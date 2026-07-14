'use server';

import { revalidatePath } from 'next/cache';
import { updateProject, createProject } from '@/lib/firebase/database';
import { Project } from '@/lib/db/types';

export async function updateProjectAction(projectId: string, updates: Partial<Project>, path?: string) {
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

export async function addProjectTicketAction(projectId: string, ticket: any, path?: string) {
  try {
    // This assumes updateProject handles the list merging, 
    // or we'd need a specific addTicket function in database.ts
    // For now, let's stick to the existing pattern but wrapped in an action
    const success = await updateProject(projectId, { tickets: ticket });
    
    if (success && path) {
      revalidatePath(path);
    }
    
    return { success, error: success ? null : 'Failed to add ticket' };
  } catch (error) {
    return { success: false, error: 'Internal server error' };
  }
}

export async function createProjectAction(projectData: any) {
  try {
    const id = await createProject(projectData);
    
    if (id) {
      revalidatePath('/admin/projects');
      revalidatePath('/dashboard');
      return { success: true, id };
    }
    
    return { success: false, error: 'Failed to create project' };
  } catch (error) {
    return { success: false, error: 'Internal server error' };
  }
}
