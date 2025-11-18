import {
  validateAssociatedProductPresenceOnCreate,
  validateAssociatedProductPresenceOnUpdate
} from "./utils/validateProductPresence";
import { validateGuideVersions } from "./utils/validateGuideVersions";
import { triggerGithubWorkflow } from "./utils/triggerGithubWorkflow";

const entitiesRequiringProductAssociation = [
  'api::use-case-list-page.use-case-list-page',
  'api::use-case.use-case',
  'api::tutorial-list-page.tutorial-list-page',
  'api::tutorial.tutorial',
  'api::quickstart-guide.quickstart-guide',
  'api::overview.overview',
  'api::guide-list-page.guide-list-page',
  'api::api-data-list-page.api-data-list-page',
  'api::api-data.api-data'
];

export default {
  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap: (): undefined => {
    // do nothing for now
  },

  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  // @ts-ignore
  register: ({strapi}) => {
    // Middleware for entities requiring product association validation
    // @ts-ignore
    strapi.documents.use(async (context, next) => {
      if (entitiesRequiringProductAssociation.includes(context.uid)) {
        if (context.action === 'create') {
          validateAssociatedProductPresenceOnCreate(context);
        } else if (context.action === 'update') {
          validateAssociatedProductPresenceOnUpdate(context);
        }
      }
      return next();
    });

    // Middleware for guide content type
    // @ts-ignore
    strapi.documents.use(async (context, next) => {
      if (context.uid === 'api::guide.guide') {
        // Validate versions before create/update
        if (context.action === 'create' || context.action === 'update') {
          await validateGuideVersions(context);
        }
      }

      // Execute the action
      const result = await next();

      // After update, trigger GitHub workflow if published
      if (context.uid === 'api::guide.guide' && context.action === 'update') {
        if (context.params.data.publishedAt !== undefined) {
          console.log('Guide updated, triggering GitHub workflow...');
          // Fire and forget - don't block the UI
          triggerGithubWorkflow('guides').catch(error =>
            console.error('Failed to trigger workflow after update:', error)
          );
        } else {
          console.log('Guide not published, skipping GitHub workflow trigger');
        }
      }

      return result;
    });
  },
};
