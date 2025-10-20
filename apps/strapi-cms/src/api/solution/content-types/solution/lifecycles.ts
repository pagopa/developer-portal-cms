import { triggerGithubWorkflow } from '../../../../utils/triggerGithubWorkflow';

interface ISolution {
  readonly id?: string;
  readonly publishedAt?: string | null;
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
  async afterUpdate(event: ISolutionEvent) {
    if (event.params.data.publishedAt === undefined) {
      console.log('Solution not published, skipping GitHub workflow trigger');
      return;
    }

    console.log('Solution updated, triggering GitHub workflow...');
    // Fire and forget - don't block the UI
    triggerGithubWorkflow('solutions').catch(error =>
      console.error('Failed to trigger workflow after update:', error)
    );
  },
};
