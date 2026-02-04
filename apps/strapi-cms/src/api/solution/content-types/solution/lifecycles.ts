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
  readonly result?: {
    readonly locale?: string;
  };
}


module.exports = {
  async afterUpdate(event: ISolutionEvent) {
    if (!event.params.where?.id) {
      console.log('No solution ID found in event params, skipping afterUpdate logic');
      return;
    }

    const unpublishing = event.params.data.publishedAt === null;
    const record = await strapi.db
      .query('api::solution.solution')
      .findOne({ where: { id: event.params.where.id }, select: ['publishedAt'] });
    const recordPublishedAt = record?.publishedAt;

    if (!recordPublishedAt && !unpublishing) {
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

      if (!event?.result?.locale) {
        throw new Error('No locale found in event result, triggering full sync with default locale "it"');
      }
      
      console.log(`Syncing solution directory: ${solution.dirName}`);
      // Fire and forget - don't block the UI
      triggerGithubWorkflow({
        metadataType: 'solutions',
        dirNames: [solution.dirName],
        locale: event.result.locale
      }).catch(error =>
        console.error('Failed to trigger workflow after update:', error)
      );
    } catch (error) {
      console.error('Error fetching solution:', error);
      // Fallback to full sync
      triggerGithubWorkflow({metadataType: 'solutions', locale: 'it'}).catch(error =>
        console.error('Failed to trigger workflow after update:', error)
      );
    }
  },
};
