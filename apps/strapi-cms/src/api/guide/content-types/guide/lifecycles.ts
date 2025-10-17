import { errors } from '@strapi/utils';
import { triggerGithubWorkflow } from '../../../../utils/triggerGithubWorkflow';

interface IGuide {
  readonly publishedAt?: string | null;
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

module.exports = {
  async beforeCreate(event: IGuideEvent) {
    await validateGuideVersions(event);
  },
  async beforeUpdate(event: IGuideEvent) {
    await validateGuideVersions(event);
  },
  async afterUpdate(event: IGuideEvent) {
    if (event.params.data.publishedAt === undefined) {
      console.log('Guide not published, skipping GitHub workflow trigger');
      return;
    }

    console.log('Guide updated, triggering GitHub workflow...');
    // Fire and forget - don't block the UI
    triggerGithubWorkflow('guides').catch(error => 
      console.error('Failed to trigger workflow after update:', error)
    );
  },
};
