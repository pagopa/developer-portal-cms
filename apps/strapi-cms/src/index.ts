import {
  validateAssociatedProductPresenceOnCreate,
  validateAssociatedProductPresenceOnUpdate
} from "./utils/validateProductPresence";
import { validateGuideVersions } from "./utils/validateGuideVersions";
import { onPublishedRecordTriggerGithubWorkflow } from "./utils/triggerGithubWorkflow";

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
        if (!context.params.where?.documentId) {
          console.log('No guide ID found in context params, skipping afterUpdate logic');
          return result;
        }

        const unpublishing = context.params.data.publishedAt === null;
        const recordPublishedAt = (
          await strapi.db
            .query('api::guide.guide')
            .findOne({ where: { documentId: context.params.where.documentId }, select: ['publishedAt'] })
        )?.publishedAt
        onPublishedRecordTriggerGithubWorkflow('guides' ,recordPublishedAt, unpublishing);
      }

      return result;
    });
  },
};
