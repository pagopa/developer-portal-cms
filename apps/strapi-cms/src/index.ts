import {
  entitiesRequiringProductAssociation,
  GUIDES_UID,
  IGuideData,
  RELEASE_NOTES_UID,
  SOLUTIONS_UID,
  triggerGuideWorkflow,
  triggerReleaseNoteWorkflow, triggerSolutionWorkflow,
  validateGuideVersions
} from './middlewares/documentHooks';
import {
  validateAssociatedProductPresenceOnCreate,
  validateAssociatedProductPresenceOnUpdate
} from "./utils/validateProductPresence";

export default {
// @ts-ignore
  register: ({ strapi }) => {
    const documentService = strapi.documents;
    if (!documentService?.use) {
      console.warn('Document service middleware unavailable - skipping custom document hooks');
      return;
    }
// @ts-ignore
    strapi.documents.use(async (context, next) => {
      if (entitiesRequiringProductAssociation.includes(context.uid)) {
        if (context.action === 'create') {
          validateAssociatedProductPresenceOnCreate(context);
        } else if (context.action === 'update') {
          validateAssociatedProductPresenceOnUpdate(context);
        }
      }

      if (context.uid === GUIDES_UID && (context.action === 'create' || context.action === 'update')) {
        await validateGuideVersions(strapi, context.params?.data as IGuideData | undefined);
      }
      if (context.action === 'publish' || context.action === 'unpublish') {
        if (context.uid === GUIDES_UID) {
          await triggerGuideWorkflow(strapi, context);
        } else if (context.uid === RELEASE_NOTES_UID) {
          await triggerReleaseNoteWorkflow(strapi, context);
        } else if (context.uid === SOLUTIONS_UID) {
          await triggerSolutionWorkflow(strapi, context);
        }
      }
      return next();
    });
  },
};
