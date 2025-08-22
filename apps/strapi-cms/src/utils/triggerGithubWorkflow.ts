import axios from 'axios';

type MetadataType = 'guides' | 'release-notes' | 'solutions';

export const triggerGithubWorkflow = async (metadataType: MetadataType) => {
  try {
    const githubPat = process.env.GITHUB_PAT;
    if (!githubPat) {
      console.warn('GITHUB_PAT not configured - skipping workflow trigger');
      return;
    }

    console.log('🚀 Triggering GitHub workflow...');
    
    const response = await axios.post(
      'https://api.github.com/repos/pagopa/developer-portal/actions/workflows/sync_gitbook_docs.yaml/dispatches',
      {
        ref: 'main',
        inputs: {
          environment: process.env.GITHUB_WORKFLOW_ENV || 'dev',
          metadata_type: metadataType,
          generate_metadata_only: 'false',
          incremental_mode: 'false'
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
