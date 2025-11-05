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

const validateDirNameImmutability = async (event: IGuideEvent) => {
  const guideFromDb = await strapi.db.query('api::guide.guide').findOne({
    where: { id: event.params.where?.id || '' },
    populate: { versions: true },
  });

  console.log(`guideFromDb: ${JSON.stringify(guideFromDb)}`);

  const versions = guideFromDb?.versions || [];

  for (const version of versions) {
    console.log('version', version)
    if(version.dirName !== version.oldDirName) {
      console.log(`dirName changed from '${version.oldDirName}' to '${version.dirName}' error`);

      // Revert the change in the database
      await strapi.db.connection
        .from('components_common_guide_versions')
        .where({ id: version.id })
        .update({ dir_name: version.oldDirName });

      throw new errors.ApplicationError(
        `The dirName cannot be changed from '${version.oldDirName}' to '${version.dirName}': the field is immutable.`
      );
    }
  }
};

// On create, set oldDirName to the initial dirName
const setOldDirNameOnCreate = async (event: IGuideEvent) => {
  if (event.params.data.versions && Array.isArray(event.params.data.versions) && event.params.data.versions.length > 0) {
    const versionIds = event.params.data.versions.map((v) => v.id);

    console.log(`Setting oldDirName for versions: ${JSON.stringify(versionIds)}`);

    // Fetch the full version data
    const versions = await strapi.db.connection
      .select('*')
      .from(`components_common_guide_versions`)
      .whereIn('id', versionIds);

    console.log(`Fetched versions: ${JSON.stringify(versions)}`);

    await Promise.all(versions.map(async (version) => {
      version.oldDirName = version.dir_name;
      // save the change back to the database
      await strapi.db.connection
        .from('components_common_guide_versions')
        .where({ id: version.id })
        .update({ old_dir_name: version.oldDirName });
    }));
  }
}

module.exports = {
  async beforeCreate(event: IGuideEvent) {
    await validateGuideVersions(event);
    await setOldDirNameOnCreate(event);
  },
  async beforeUpdate(event: IGuideEvent) {
    await validateGuideVersions(event);
    await validateDirNameImmutability(event);
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
