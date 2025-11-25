import {
  validateAssociatedProductPresenceOnCreate,
  validateAssociatedProductPresenceOnUpdate
} from "./utils/validateProductPresence";
import {triggerGithubWorkflow} from "./utils/triggerGithubWorkflow";

const entitiesRequiringProductAssociation = [
  'api::use-case-list-page.use-case-list-page',
  'api::use-case.use-case',
  'api::tutorial-list-page.tutorial-list-page',
  'api::tutorial.tutorial',
  'api::quickstart-guide.quickstart-guide',
  'api::overview.overview',
  'api::guide-list-page.guide-list-page',
  'api::api-data-list-page.api-data-list-page',
  'api::api-data.api-data',
  'api::release-note.release-note'
];

export default {
  // @ts-ignore
  register: ({strapi}) => {
    // @ts-ignore
    strapi.documents.use(async (context, next) => {
      if (entitiesRequiringProductAssociation.includes(context.uid)) {
        if (context.action === 'create') {
          validateAssociatedProductPresenceOnCreate(context);
        } else if (context.action === 'update') {
          validateAssociatedProductPresenceOnUpdate(context);
        }
      }
      if(context.action === 'publish') {
        if (context.uid === 'api::release-note.release-note') {
          console.log('Release note updated, triggering GitHub workflow...');
          // Fire and forget - don't block the UI
          triggerGithubWorkflow('release-notes').catch(error =>
            console.error('Failed to trigger workflow after update:', error)
          );
        }
        else if (context.uid === 'api::solution.solution') {
          console.log('Solution updated, triggering GitHub workflow...');
          // Fire and forget - don't block the UI
          triggerGithubWorkflow('solutions').catch(error =>
            console.error('Failed to trigger workflow after update:', error)
          );
        }
      }


      return next();
    })
  },
};
