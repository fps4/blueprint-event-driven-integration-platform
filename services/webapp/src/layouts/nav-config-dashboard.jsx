import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

//import { Label } from 'src/components/label';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name) => <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />;

const ICONS = {
  job: icon('ic-job'),
  chat: icon('ic-chat'),
  mail: icon('ic-mail'),
  file: icon('ic-file'),
  lock: icon('ic-lock'),
  tour: icon('ic-tour'),
  order: icon('ic-order'),
  label: icon('ic-label'),
  blank: icon('ic-blank'),
  kanban: icon('ic-kanban'),
  folder: icon('ic-folder'),
  course: icon('ic-course'),
  banking: icon('ic-banking'),
  booking: icon('ic-booking'),
  invoice: icon('ic-invoice'),
  product: icon('ic-product'),
  calendar: icon('ic-calendar'),
  disabled: icon('ic-disabled'),
  external: icon('ic-external'),
  menuItem: icon('ic-menu-item'),
  ecommerce: icon('ic-ecommerce'),
  analytics: icon('ic-analytics'),
  dashboard: icon('ic-dashboard'),
  parameter: icon('ic-parameter'),
  // Add more icons as needed
  workspace: icon('crop-svgrepo-com'),
  client: icon('ferris-wheel-svgrepo-com'),
  pipeline: icon('routing-3-svgrepo-com'),
  user: icon('users-group-two-rounded-svgrepo-com'),
  wiki: icon('document-1-svgrepo-com'),
  connection: icon('logout-svgrepo-com'),
  infrastructure: icon('code-square-svgrepo-com'),

};

// ----------------------------------------------------------------------

export const navData = [
  /**
   * Overview
   */
  {
    subheader: 'Overview',
    items: [
      // {
      //   title: 'One',
      //   path: paths.dashboard.root,
      //   icon: ICONS.dashboard,
      //   info: <Label>v{CONFIG.appVersion}</Label>,
      // },
      { title: 'Workspaces', path: paths.dashboard.workspace.root, icon: ICONS.workspace },
      { title: 'Pipelines', path: paths.dashboard.pipeline.root, icon: ICONS.pipeline },
      { title: 'Clients', path: paths.dashboard.client.root, icon: ICONS.client },
      { title: 'Connections', path: paths.dashboard.connection.root, icon: ICONS.connection },
      { title: 'Users', path: paths.dashboard.group.root, icon: ICONS.user },
    ],
  },
  /**
   * Operations
   */
  {
    subheader: 'Operations',
    items: [
      {
        title: 'Infrastructure',
        path: paths.dashboard.operations.root,
        icon: ICONS.infrastructure,
        children: [
          { title: 'Logs', path: paths.dashboard.operations.logs },
        ],
      },
    ],
  },
  /**
   * Documentation
   */
  {
    subheader: 'Manuals & Guides',
    items: [
      {
        title: 'User Manual',
        path: paths.dashboard.group.root,
        icon: ICONS.wiki,
        children: [
          { title: 'Four', path: paths.dashboard.group.root },
          { title: 'Five', path: paths.dashboard.group.five },
          { title: 'Six', path: paths.dashboard.group.six },
        ],
      },
    ],
  },
];
