import { CONFIG } from 'src/global-config';

import { WorkspaceCreateView } from 'src/sections/workspace/view/workspace-create-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Create workspace | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <WorkspaceCreateView />;
}
