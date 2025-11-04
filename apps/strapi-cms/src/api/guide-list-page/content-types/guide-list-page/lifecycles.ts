import { triggerGithubWorkflow } from '../../../../utils/triggerGithubWorkflow';
import {
  IEventWithProduct,
  validateAssociatedProductPresenceOnCreate,
  validateAssociatedProductPresenceOnUpdate,
} from '../../../../utils/validateProductPresence';

module.exports = {
  beforeCreate(event: IEventWithProduct) {
    validateAssociatedProductPresenceOnCreate(event);
  },
  beforeUpdate(event: IEventWithProduct) {
    validateAssociatedProductPresenceOnUpdate(event);
  },
  async afterUpdate(event: IEventWithProduct) {
      if (event.params.data.publishedAt === undefined) {
        console.log(
          'GuideListPage not published, skipping GitHub workflow trigger'
        );
        return;
      }
  
      console.log('GuideListPage updated, triggering GitHub workflow...');
      // Fire and forget - don't block the UI
      triggerGithubWorkflow('guides').catch(error => 
        console.error('Failed to trigger workflow after update:', error)
      );
    },
};
