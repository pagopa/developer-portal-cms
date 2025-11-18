import { errors } from '@strapi/utils';

interface IGuideVersion {
  readonly id: number;
  readonly main?: boolean;
}

export interface IGuideEvent {
  readonly params: {
    readonly data: {
      readonly publishedAt?: string | null;
      readonly versions?: Array<{
        readonly id: number;
      }>;
    };
    readonly where?: {
      readonly documentId?: string;
    };
  };
}

export const validateGuideVersions = async (event: IGuideEvent): Promise<boolean> => {
  const { data } = event.params;

  if (data.versions && Array.isArray(data.versions) && data.versions.length > 0) {
    const versionIds = data.versions.map((v) => v.id);

    // Fetch the full version data
    const versions = await strapi.db.connection
      .select('*')
      .from('components_common_guide_versions')
      .whereIn('id', versionIds);

    const mainVersions = versions.filter((version: IGuideVersion) => !!version.main);

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
