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

  if (data.versions && Array.isArray(data.versions) && data.versions.length > 0) {
    const versionIds = data.versions.map((v) => v.id);

    // Fetch the full version data
    const versions = await strapi.db.connection
      .select('*')
      .from(`components_common_guide_versions`)
      .whereIn('id', versionIds);

    const mainVersions = versions.filter((version) => !!version.main);

    if (mainVersions.length === 0) {
      throw new errors.ApplicationError(
        'A guide with versions must have exactly one version marked as main'
      );
    }

    if (mainVersions.length > 1) {
      throw new errors.ApplicationError(
        'A guide can have only one version marked as main'
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
    if (!event.params.where?.id) {
      console.log('No guide ID found in event params, skipping afterUpdate logic');
      return;
    }

    const unpublishing = event.params.data.publishedAt === null;
    const record = await strapi.db
      .query('api::guide.guide')
      .findOne({ where: { id: event.params.where.id }, select: ['publishedAt'] });
    const recordPublishedAt = record?.publishedAt;

    if (!recordPublishedAt && !unpublishing) {
      console.log('Guide not published, skipping GitHub workflow trigger');
      return;
    }

    console.log('Guide updated, triggering GitHub workflow...');

    try {
      // Fetch the guide with versions populated to get dirNames
      const guideId = event.params.where?.id;
      if (!guideId) {
        throw new Error('No guide ID found, triggering full sync');
      }

      const guide = await strapi.entityService.findOne(
        'api::guide.guide',
        guideId,
        { populate: ['versions'] }
      );

      if (!guide || !guide.versions || guide.versions.length === 0) {
        throw new Error('No versions found for guide, triggering full sync');
      }

      // Extract dirNames from all versions
      const dirNames = guide.versions
        .map((version: any) => version.dirName)
        .filter((dirName: string) => !!dirName);

      if (dirNames.length === 0) {
        throw new Error('No dirNames found in versions, triggering full sync');
      }

      console.log(`Syncing guide directories: ${dirNames.join(', ')}`);
      // Fire and forget - don't block the UI
      triggerGithubWorkflow('guides', dirNames).catch(error =>
        console.error('Failed to trigger workflow after update:', error)
      );
    } catch (error) {
      console.error('Error fetching guide versions:', error);
      // Fallback to full sync
      triggerGithubWorkflow('guides').catch(error =>
        console.error('Failed to trigger workflow after update:', error)
      );
    }
  },
};
