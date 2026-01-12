export default ({ env }: any) => ({
  upload: {
    config: {
      provider: 'local',
    },
  },
  'strapi-plugin-sso': {
    enabled: true,
    config: {
      // Google
      GOOGLE_OAUTH_CLIENT_ID: env('GOOGLE_OAUTH_CLIENT_ID'),
      GOOGLE_OAUTH_CLIENT_SECRET: env('GOOGLE_OAUTH_CLIENT_SECRET'),
      GOOGLE_OAUTH_REDIRECT_URI: env('GOOGLE_OAUTH_REDIRECT_URI'), // URI after successful login
      GOOGLE_GSUITE_HD: env('GOOGLE_GSUITE_HD', ''), // G Suite Primary Domain
    }
  },
  seo: {
    enabled: true,
  },
});
