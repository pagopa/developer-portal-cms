import { errors } from '@strapi/utils';
import { triggerGithubWorkflow } from '../utils/triggerGithubWorkflow';
import {
  type IEventWithProduct,
} from '../utils/validateProductPresence';

export const GUIDES_UID = 'api::guide.guide';
export const RELEASE_NOTES_UID = 'api::release-note.release-note';
export const SOLUTIONS_UID = 'api::solution.solution';
const GUIDE_VERSION_TABLE = 'components_common_guide_versions';

export const entitiesRequiringProductAssociation = [
  'api::use-case-list-page.use-case-list-page',
  'api::use-case.use-case',
  'api::tutorial-list-page.tutorial-list-page',
  'api::tutorial.tutorial',
  'api::quickstart-guide.quickstart-guide',
  'api::overview.overview',
  'api::guide-list-page.guide-list-page',
  'api::api-data-list-page.api-data-list-page',
  'api::api-data.api-data',
  RELEASE_NOTES_UID,
];

type EntryWhereClause =
  | { readonly id: number | string }
  | { readonly id: { readonly $in: ReadonlyArray<number | string> } }
  | { readonly documentId: string }
  | { readonly documentId: { readonly $in: ReadonlyArray<string> } };

type BaseParams = IEventWithProduct['params'];

type DocumentWhereParams =
  NonNullable<BaseParams['where']> & {
    readonly documentId?: string;
  };

type DocumentData = BaseParams['data'] & {
  readonly id?: number | string;
  readonly documentId?: string;
};

type DocumentParams = Omit<BaseParams, 'data' | 'where'> & {
  readonly data: DocumentData;
  readonly documentId?: string;
  readonly where?: DocumentWhereParams;
};

export interface DocumentMiddlewareContext extends IEventWithProduct {
  readonly uid: string;
  readonly action: string;
  readonly documentId?: string;
  readonly params: DocumentParams;
  readonly result?: Record<string, unknown>;
}

interface IGuideVersionInput {
  readonly id?: number | string;
}

export interface IGuideData {
  readonly versions?: ReadonlyArray<IGuideVersionInput>;
}

const parseNumericId = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const parseDocumentId = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }

  return undefined;
};

const getEntryWhereClause = (
  context: DocumentMiddlewareContext
): EntryWhereClause | undefined => {
  type IdInClause = { $in: Array<number | string> };
  type DocumentIdInClause = { $in: string[] };
  type ParamsWhere = {
    id?: number | string | Array<number | string> | IdInClause;
    documentId?: string | string[] | DocumentIdInClause;
  };
  const paramsWhere = (context.params?.where ?? {}) as ParamsWhere;

  // Check for bulk operations first
  const idWhere = paramsWhere.id;
  if (
    idWhere &&
    typeof idWhere === 'object' &&
    !Array.isArray(idWhere) &&
    '$in' in idWhere
  ) {
    return { id: { $in: idWhere.$in } };
  }

  const documentIdWhere = paramsWhere.documentId;
  if (
    documentIdWhere &&
    typeof documentIdWhere === 'object' &&
    !Array.isArray(documentIdWhere) &&
    '$in' in documentIdWhere
  ) {
    return { documentId: { $in: documentIdWhere.$in } };
  }

  if (Array.isArray(idWhere)) {
    return { id: { $in: idWhere } };
  }

  if (Array.isArray(documentIdWhere)) {
    return { documentId: { $in: documentIdWhere } };
  }


  const rawNumericId =
    context.result?.id ??
    paramsWhere?.id ??
    context.params?.data?.id;

  const numericId = parseNumericId(rawNumericId);
  if (numericId !== undefined) {
    return { id: numericId };
  }

  const rawDocumentId =
    context.result?.documentId ??
    context.documentId ??
    context.params?.documentId ??
    paramsWhere?.documentId ??
    context.params?.data?.documentId;

  const documentId = parseDocumentId(rawDocumentId);
  if (documentId) {
    return { documentId };
  }

  return undefined;
};
//@ts-ignore
export const validateGuideVersions = async (strapi: Strapi, data?: IGuideData) => {
  if (!strapi.db?.connection) {
    console.warn('Strapi database connection unavailable - skipping guide version validation');
    return;
  }

  if (!data?.versions?.length) {
    return;
  }

  const versionIds = data.versions
    .map((version) => parseNumericId(version.id))
    .filter((id): id is number => typeof id === 'number');

  if (versionIds.length === 0) {
    return;
  }

  const versions = await strapi.db.connection
    .select('*')
    .from(GUIDE_VERSION_TABLE)
    .whereIn('id', versionIds);

  const mainVersions = versions.filter((version: Record<string, unknown>) =>
    Boolean(version.main)
  );

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
};
//@ts-ignore

export const triggerGuideWorkflow = async (strapi: Strapi, context: DocumentMiddlewareContext) => {
  const db = strapi.db;
  if (!db) {
    console.warn('Strapi database unavailable - skipping guide workflow trigger');
    return;
  }

  const where = getEntryWhereClause(context);

  if (!where) {
    console.log('No guide identifier found, triggering full sync');
    triggerGithubWorkflow('guides').catch((error) =>
      console.error('Failed to trigger workflow after update:', error)
    );
    return;
  }

  console.log('Guide updated, triggering GitHub workflow...');

  try {
    let guides: any[] = [];

    // @ts-ignore
    if ((where.id && where.id['$in']) || (where.documentId && where.documentId['$in'])) {
      guides = await db.query(GUIDES_UID).findMany({ where, populate: ['versions'] });
    } else {
      const guide = await db.query(GUIDES_UID).findOne({ where, populate: ['versions'] });
      if (guide) guides = [guide];
    }

    if (guides.length === 0) {
      throw new Error('No guides found, triggering full sync');
    }

    const dirNames = guides.flatMap(guide =>
      (guide.versions || [])
        .map((version: Record<string, unknown>) => version?.dirName as string | undefined)
    ).filter((dirName: string | undefined): dirName is string => Boolean(dirName));

    // Deduplicate dirNames
    const uniqueDirNames = Array.from(new Set(dirNames));

    if (uniqueDirNames.length === 0) {
      throw new Error('No dirNames found in versions, triggering full sync');
    }

    console.log(`Syncing guide directories: ${uniqueDirNames.join(', ')}`);
    triggerGithubWorkflow('guides', uniqueDirNames).catch((error) =>
      console.error('Failed to trigger workflow after update:', error)
    );
  } catch (error) {
    console.error('Error fetching guide versions:', error);
    triggerGithubWorkflow('guides').catch((innerError) =>
      console.error('Failed to trigger workflow after update:', innerError)
    );
  }
};
//@ts-ignore

export const triggerSolutionWorkflow = async (strapi: Strapi, context: DocumentMiddlewareContext) => {
  const db = strapi.db;
  if (!db) {
    console.warn('Strapi database unavailable - skipping solution workflow trigger');
    return;
  }

  const where = getEntryWhereClause(context);

  if (!where) {
    console.log('No solution identifier found, triggering full sync');
    triggerGithubWorkflow('solutions').catch((error) =>
      console.error('Failed to trigger workflow after update:', error)
    );
    return;
  }

  console.log('Solution updated, triggering GitHub workflow...');

  try {
    let solutions: any[] = [];
    // @ts-ignore
    if ((where.id && where.id['$in']) || (where.documentId && where.documentId['$in'])) {
      solutions = await db.query(SOLUTIONS_UID).findMany({ where, select: ['dirName'] });
    } else {
      const solution = await db.query(SOLUTIONS_UID).findOne({ where, select: ['dirName'] });
      if (solution) solutions = [solution];
    }

    if (solutions.length === 0) {
      throw new Error('No solutions found, triggering full sync');
    }

    const dirNames = solutions
      .map(s => s.dirName)
      .filter((dirName): dirName is string => Boolean(dirName));

    const uniqueDirNames = Array.from(new Set(dirNames));

    if (uniqueDirNames.length === 0) {
      throw new Error('No dirName found for solution, triggering full sync');
    }

    console.log(`Syncing solution directory: ${uniqueDirNames.join(', ')}`);
    triggerGithubWorkflow('solutions', uniqueDirNames).catch((error) =>
      console.error('Failed to trigger workflow after update:', error)
    );
  } catch (error) {
    console.error('Error fetching solution:', error);
    triggerGithubWorkflow('solutions').catch((innerError) =>
      console.error('Failed to trigger workflow after update:', innerError)
    );
  }
};
//@ts-ignore

export const triggerReleaseNoteWorkflow = async (strapi: Strapi, context: DocumentMiddlewareContext) => {
  const db = strapi.db;
  if (!db) {
    console.warn('Strapi database unavailable - skipping release note workflow trigger');
    return;
  }

  const where = getEntryWhereClause(context);

  if (!where) {
    console.log('No release note identifier found, triggering full sync');
    triggerGithubWorkflow('release-notes').catch((error) =>
      console.error('Failed to trigger workflow after update:', error)
    );
    return;
  }

  console.log('Release note updated, triggering GitHub workflow...');

  try {
    let releaseNotes: any[] = [];
    // @ts-ignore
    if ((where.id && where.id['$in']) || (where.documentId && where.documentId['$in'])) {
      releaseNotes = await db.query(RELEASE_NOTES_UID).findMany({ where, select: ['dirName'] });
    } else {
      const releaseNote = await db.query(RELEASE_NOTES_UID).findOne({ where, select: ['dirName'] });
      if (releaseNote) releaseNotes = [releaseNote];
    }

    if (releaseNotes.length === 0) {
      throw new Error('No release notes found, triggering full sync');
    }

    const dirNames = releaseNotes
      .map(n => n.dirName)
      .filter((dirName): dirName is string => Boolean(dirName));

    const uniqueDirNames = Array.from(new Set(dirNames));

    if (uniqueDirNames.length === 0) {
      throw new Error('No dirName found for release note, triggering full sync');
    }

    console.log(`Syncing release note directory: ${uniqueDirNames.join(', ')}`);
    triggerGithubWorkflow('release-notes', uniqueDirNames).catch((error) =>
      console.error('Failed to trigger workflow after update:', error)
    );
  } catch (error) {
    console.error('Error fetching release note:', error);
    triggerGithubWorkflow('release-notes').catch((innerError) =>
      console.error('Failed to trigger workflow after update:', innerError)
    );
  }
};
