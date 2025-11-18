import {
  validateAssociatedProductPresenceOnCreate,
  validateAssociatedProductPresenceOnUpdate
} from "./utils/validateProductPresence";

export default {
  // @ts-ignore
  register: ({ strapi }) => {
    // @ts-ignore
    strapi.documents.use(async (context,next)=> {
      switch (context.uid){
        case 'api::use-case-list-page.use-case-list-page':
        case 'api::use-case.use-case':
        case 'api::tutorial-list-page.tutorial-list-page':
        case 'api::tutorial.tutorial':
        case 'api::quickstart-guide.quickstart-guide':
        case 'api::overview.overview':
        case 'api::guide-list-page.guide-list-page':
        case 'api::api-data-list-page.api-data-list-page':
        case 'api::api-data.api-data': {
          if(context.action === 'create'){
            validateAssociatedProductPresenceOnCreate(context);
          }
          else if(context.action === 'update'){
            validateAssociatedProductPresenceOnUpdate(context);
          }
        }
      }
      return next();
    })
  },
};
