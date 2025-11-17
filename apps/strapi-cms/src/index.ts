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
        case 'api::api-data.api-data': {
          console.log(context.action)
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
