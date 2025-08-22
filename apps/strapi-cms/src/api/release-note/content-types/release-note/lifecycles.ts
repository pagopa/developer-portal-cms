import {
  IEventWithProduct,
  validateAssociatedProductPresenceOnCreate,
  validateAssociatedProductPresenceOnUpdate,
} from '../../../../utils/validateProductPresence';
import { triggerGithubWorkflow } from '../../../../utils/triggerGithubWorkflow';


module.exports = {
  beforeCreate(event: IEventWithProduct) {
    validateAssociatedProductPresenceOnCreate(event);
  },
  beforeUpdate(event: IEventWithProduct) {
    validateAssociatedProductPresenceOnUpdate(event);
  },
  async afterCreate(event: IEventWithProduct) {
    console.log('Release note created, triggering GitHub workflow...');
    // Fire and forget - don't block the UI
    triggerGithubWorkflow('release-notes').catch(error => 
      console.error('Failed to trigger workflow after create:', error)
    );
  },
  async afterUpdate(event: IEventWithProduct) {
    console.log('Release note updated, triggering GitHub workflow...');
    // Fire and forget - don't block the UI
    triggerGithubWorkflow('release-notes').catch(error => 
      console.error('Failed to trigger workflow after update:', error)
    );
  },
};
