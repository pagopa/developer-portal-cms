import { errors } from '@strapi/utils';
import axios from 'axios';

interface IGuide {
  readonly versions?: Array<{
    id: number;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __pivot: { field: string; component_type: string };
  }>;
}

interface IGuideEvent {
  readonly params: {
    readonly data: IGuide;
    readonly where?: {
      readonly id?: string;
    };
  };
}

const validateGuideVersions = async (event: IGuideEvent) => {
  const { data } = event.params;

  if (data.versions && Array.isArray(data.versions)) {
    const versionIds = data.versions.map((v) => v.id);

    // Fetch the full version data
    const versions = await strapi.db.connection
      .select('*')
      .from(`components_common_guide_versions`)
      .whereIn('id', versionIds);

    const mainVersions = versions.filter((version) => version.main === 1);

    if (mainVersions.length > 1) {
      throw new errors.ApplicationError(
        'Only one version can have main set to true'
      );
    }
  }

  return true;
};

const triggerGithubWorkflow = async () => {
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
          metadata_type: 'guides',
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
    // Don't throw the error to avoid breaking the guide creation/update
  }
};

module.exports = {
  async beforeCreate(event: IGuideEvent) {
    await validateGuideVersions(event);
  },
  async beforeUpdate(event: IGuideEvent) {
    await validateGuideVersions(event);
  },
  async afterCreate(event: IGuideEvent) {
    console.log('Guide created, triggering GitHub workflow...');
    // Fire and forget - don't block the UI
    triggerGithubWorkflow().catch(error => 
      console.error('Failed to trigger workflow after create:', error)
    );
  },
  async afterUpdate(event: IGuideEvent) {
    console.log('Guide updated, triggering GitHub workflow...');
    // Fire and forget - don't block the UI
    triggerGithubWorkflow().catch(error => 
      console.error('Failed to trigger workflow after update:', error)
    );
  },
};
