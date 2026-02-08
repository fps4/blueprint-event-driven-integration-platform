// ----------------------------------------------------------------------

const ROOTS = {
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
};

// ----------------------------------------------------------------------

export const paths = {
  faqs: '/faqs',
  minimalStore: 'https://mui.com/store/items/minimal-dashboard/',
  // AUTH
  auth: {
    amplify: {
      signIn: `${ROOTS.AUTH}/amplify/sign-in`,
      verify: `${ROOTS.AUTH}/amplify/verify`,
      signUp: `${ROOTS.AUTH}/amplify/sign-up`,
      updatePassword: `${ROOTS.AUTH}/amplify/update-password`,
      resetPassword: `${ROOTS.AUTH}/amplify/reset-password`,
    },
    jwt: {
      signIn: `${ROOTS.AUTH}/jwt/sign-in`,
      signUp: `${ROOTS.AUTH}/jwt/sign-up`,
    },
    firebase: {
      signIn: `${ROOTS.AUTH}/firebase/sign-in`,
      verify: `${ROOTS.AUTH}/firebase/verify`,
      signUp: `${ROOTS.AUTH}/firebase/sign-up`,
      resetPassword: `${ROOTS.AUTH}/firebase/reset-password`,
    },
    auth0: {
      signIn: `${ROOTS.AUTH}/auth0/sign-in`,
    },
    supabase: {
      signIn: `${ROOTS.AUTH}/supabase/sign-in`,
      verify: `${ROOTS.AUTH}/supabase/verify`,
      signUp: `${ROOTS.AUTH}/supabase/sign-up`,
      updatePassword: `${ROOTS.AUTH}/supabase/update-password`,
      resetPassword: `${ROOTS.AUTH}/supabase/reset-password`,
    },
  },
  // DASHBOARD
    dashboard: {
      root: ROOTS.DASHBOARD,
      two: `${ROOTS.DASHBOARD}/two`,
      three: `${ROOTS.DASHBOARD}/three`,
      workspace: {
        root: `${ROOTS.DASHBOARD}/workspace`,
        new: `${ROOTS.DASHBOARD}/workspace/new`,
        details: (id) => `${ROOTS.DASHBOARD}/workspace/${id}`,
        edit: (id) => `${ROOTS.DASHBOARD}/workspace/${id}/edit`,
      },
      pipeline: {
        root: `${ROOTS.DASHBOARD}/pipeline`,
        new: `${ROOTS.DASHBOARD}/pipeline/new`,
        details: (pipelineId) => `${ROOTS.DASHBOARD}/pipeline/${pipelineId}`,
        edit: (pipelineId) => `${ROOTS.DASHBOARD}/pipeline/${pipelineId}/edit`,
        flow: (pipelineId) => `${ROOTS.DASHBOARD}/pipeline/${pipelineId}/details`,
      },
      client: {
        root: `${ROOTS.DASHBOARD}/client`,
        new: `${ROOTS.DASHBOARD}/client/new`,
        edit: (clientId) => `${ROOTS.DASHBOARD}/client/${clientId}/edit`,
      },
      connection: {
        root: `${ROOTS.DASHBOARD}/connection`,
        new: `${ROOTS.DASHBOARD}/connection/new`,
        edit: (connectionId) => `${ROOTS.DASHBOARD}/connection/${connectionId}/edit`,
      },
      user: {
        root: `${ROOTS.DASHBOARD}/user`,
        new: `${ROOTS.DASHBOARD}/user/new`,
        edit: (userId) => `${ROOTS.DASHBOARD}/user/${userId}/edit`,
      },
      operations: {
          root: `${ROOTS.DASHBOARD}/operations`,
          logs: `${ROOTS.DASHBOARD}/operations/logs`,
      },      
      group: {
          root: `${ROOTS.DASHBOARD}/group`,
          five: `${ROOTS.DASHBOARD}/group/five`,
          six: `${ROOTS.DASHBOARD}/group/six`,
      },
  },
};
