'use client';

import { DashboardContent } from 'src/layouts/dashboard';

import { WorkspaceForm } from '../components/workspace-form';

// ----------------------------------------------------------------------

export function WorkspaceCreateView() {
  return (
    <DashboardContent>
      <h2>Create workspace</h2>
      <WorkspaceForm />
    </DashboardContent>
  );
}
