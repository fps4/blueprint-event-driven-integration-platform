import { CONFIG } from 'src/global-config';

import { WorkspaceListView } from 'src/sections/workspace/view/workspace-list-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Workspace List | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <WorkspaceListView />;
}
