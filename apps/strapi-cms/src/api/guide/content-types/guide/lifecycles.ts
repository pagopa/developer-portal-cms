
/*
 *
 * ============================================================
 * WARNING: THIS FILE HAS BEEN COMMENTED OUT
 * ============================================================
 *
 * CONTEXT:
 *
 * The lifecycles.js file has been commented out to prevent unintended side effects when starting Strapi 5 for the first time after migrating to the document service.
 *
 * STRAPI 5 introduces a new document service that handles lifecycles differently compared to previous versions. Without migrating your lifecycles to document service middlewares, you may experience issues such as:
 *
 * - `unpublish` actions triggering `delete` lifecycles for every locale with a published entity, which differs from the expected behavior in v4.
 * - `discardDraft` actions triggering both `create` and `delete` lifecycles, leading to potential confusion.
 *
 * MIGRATION GUIDE:
 *
 * For a thorough guide on migrating your lifecycles to document service middlewares, please refer to the following link:
 * [Document Services Middlewares Migration Guide](https://docs.strapi.io/dev-docs/migration/v4-to-v5/breaking-changes/lifecycle-hooks-document-service)
 *
 * IMPORTANT:
 *
 * Simply uncommenting this file without following the migration guide may result in unexpected behavior and inconsistencies. Ensure that you have completed the migration process before re-enabling this file.
 *
 * ============================================================
 */
import { errors } from '@strapi/utils';
import { onPublishedRecordTriggerGithubWorkflow } from '../../../../utils/triggerGithubWorkflow';

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
    const recordPublishedAt = (
      await strapi.db
        .query('api::guide.guide')
        .findOne({ where: { id: event.params.where.id }, select: ['publishedAt'] })
    )?.publishedAt
    onPublishedRecordTriggerGithubWorkflow('guides' ,recordPublishedAt, unpublishing);
  },
};
