import { CONFIG } from 'src/global-config';

import { WorkspaceEditView } from 'src/sections/workspace/view/workspace-edit-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Edit workspace | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <WorkspaceEditView />;
}
