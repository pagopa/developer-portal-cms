import { triggerGithubWorkflow } from '../../../../utils/triggerGithubWorkflow';

interface ISolution {
  readonly id?: string;
}

interface ISolutionEvent {
  readonly params: {
    readonly data: ISolution;
    readonly where?: {
      readonly id?: string;
    };
  };
}

module.exports = {
  async afterCreate(event: ISolutionEvent) {
    console.log('Solution created, triggering GitHub workflow...');
    // Fire and forget - don't block the UI
    triggerGithubWorkflow('solutions').catch(error =>
      console.error('Failed to trigger workflow after create:', error)
    );
  },
  async afterUpdate(event: ISolutionEvent) {
    console.log('Solution updated, triggering GitHub workflow...');
    // Fire and forget - don't block the UI
    triggerGithubWorkflow('solutions').catch(error =>
      console.error('Failed to trigger workflow after update:', error)
    );
  },
};
