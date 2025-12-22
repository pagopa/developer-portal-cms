import axios from 'axios';

type MetadataType = 'guides' | 'release-notes' | 'solutions';

export const onPublishedRecordTriggerGithubWorkflow = (metadataType: MetadataType) => {
  console.log(`${metadataType} updated, triggering GitHub workflow...`);
  // Fire and forget - don't block the UI
  triggerGithubWorkflow(metadataType).catch(error =>
    console.error(`Failed to trigger workflow after ${metadataType} update:`, error)
  );
}

export const triggerGithubWorkflow = async (metadataType: MetadataType) => {
  try {
    const githubPat = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    if (!githubPat) {
      console.warn('GITHUB_PERSONAL_ACCESS_TOKEN not configured - skipping workflow trigger');
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
          incremental_mode: 'true'
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
