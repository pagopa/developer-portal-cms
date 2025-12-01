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

    try {
      // Fetch the solution to get dirName
      const solutionId = event.params.where?.id || event.params.data.id;
      if (!solutionId) {
        throw new Error('No solution ID found, triggering full sync');
      }

      const solution = await strapi.entityService.findOne(
        'api::solution.solution',
        solutionId,
        {}
      );

      if (!solution || !solution.dirName) {
        throw new Error('No dirName found for solution, triggering full sync');
      }

      console.log(`Syncing solution directory: ${solution.dirName}`);
      // Fire and forget - don't block the UI
      triggerGithubWorkflow('solutions', [solution.dirName]).catch(error =>
        console.error('Failed to trigger workflow after update:', error)
      );
    } catch (error) {
      console.error('Error fetching solution:', error);
      // Fallback to full sync
      triggerGithubWorkflow('solutions').catch(error =>
        console.error('Failed to trigger workflow after update:', error)
      );
    }
  },
};
