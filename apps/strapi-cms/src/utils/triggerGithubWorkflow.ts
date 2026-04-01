import axios from 'axios';

type MetadataType = 'guides' | 'release_notes' | 'solutions';

export const triggerGithubWorkflow = async (props: {
  metadataType: MetadataType,
  dirNames?: string[],
  locale: string
}) => {
  const { metadataType, dirNames, locale } = props;
  try {
    const githubPat = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    if (!githubPat) {
      console.warn('GITHUB_PERSONAL_ACCESS_TOKEN not configured - skipping workflow trigger');
      return;
    }

    const dirNamesFilter = dirNames && dirNames.length > 0 ? dirNames.join(',') : '';

    console.log('Triggering GitHub workflow...');
    if (dirNamesFilter) {
      console.log(`   Syncing specific directories: ${dirNamesFilter}`);
    } else {
      console.log('   Syncing all directories');
    }

    const env = process.env.GITHUB_WORKFLOW_ENV || 'dev';
    const ref = env !== 'dev' ? `nextjs-website@latest-deployed-in-${env}` : 'main'
    const response = await axios.post(
      'https://api.github.com/repos/pagopa/developer-portal/actions/workflows/sync_gitbook_docs.yaml/dispatches',
      {
        ref: ref,
        inputs: {
          environment: process.env.GITHUB_WORKFLOW_ENV || 'dev',
          metadata_type: metadataType,
          locale: locale,
          incremental_mode: 'true',
          dir_names_filter: dirNamesFilter,
          invalidate_opennext_cache: 'false'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${githubPat}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Strapi-CMS-Webhook'
        }
      }
    );

    if (response.status === 204) {
      console.log('GitHub workflow triggered successfully');
    } else {
      console.error('Failed to trigger GitHub workflow:', response.status, response.data);
    }
  } catch (error) {
    console.error('Error triggering GitHub workflow:', error);
    // Don't throw the error to avoid breaking the lifecycle operation
  }
};
