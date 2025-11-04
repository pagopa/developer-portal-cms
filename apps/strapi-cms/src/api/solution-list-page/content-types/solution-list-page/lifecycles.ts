import {
  IEventWithProduct,
} from '../../../../utils/validateProductPresence';
import { triggerGithubWorkflow } from '../../../../utils/triggerGithubWorkflow';


module.exports = {
  async afterUpdate(event: IEventWithProduct) {
    if (event.params.data.publishedAt === undefined) {
      console.log(
        'SolutionListPage not published, skipping GitHub workflow trigger'
      );
      return;
    }

    console.log('SolutionListPage updated, triggering GitHub workflow...');
    // Fire and forget - don't block the UI
    triggerGithubWorkflow('solutions').catch(error => 
      console.error('Failed to trigger workflow after update:', error)
    );
  },
};
