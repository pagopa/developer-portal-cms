import {
  validateAssociatedProductPresenceOnCreate,
  validateAssociatedProductPresenceOnUpdate
} from "./utils/validateProductPresence";
import { validateGuideVersions } from "./utils/validateGuideVersions";
import { onPublishedRecordTriggerGithubWorkflow } from "./utils/triggerGithubWorkflow";
import { validateWebinarDates } from "./utils/validateWebinarDates";
import {
  validateSlugBeforeCreate,
  validateSlugBeforeUpdate
} from "./utils/validateWebinarSlug";
import {
  createActiveCampaignList,
  deleteActiveCampaignList,
  preventBulkDeletion
} from "./utils/activeCampaignWebinar";

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
          onPublishedRecordTriggerGithubWorkflow("release-notes");
        }
        else if (context.uid === 'api::solution.solution') {
          onPublishedRecordTriggerGithubWorkflow("solutions");
        }
      }

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

    // Middleware for webinar content type
    // @ts-ignore
    strapi.documents.use(async (context, next) => {
      if (context.uid === 'api::webinar.webinar') {
        // Before create validations
        if (context.action === 'create') {
          validateWebinarDates(context);
          validateSlugBeforeCreate(context);
        }

        // Before update validations
        if (context.action === 'update') {
          validateWebinarDates(context);
          await validateSlugBeforeUpdate(context);
        }

        // Before delete - remove Active Campaign list
        if (context.action === 'delete') {
          await deleteActiveCampaignList(context);
        }

        // Prevent bulk deletion if Active Campaign is enabled
        if (context.action === 'delete' && context.params?.where?._q) {
          preventBulkDeletion();
        }
      }

      // Execute the action
      const result = await next();

      // After create - create Active Campaign list
      if (context.uid === 'api::webinar.webinar' && context.action === 'create') {
        await createActiveCampaignList({
          params: context.params,
          result: result
        });
      }

      return result;
    });
  },
};
