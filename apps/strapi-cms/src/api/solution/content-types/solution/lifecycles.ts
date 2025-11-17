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


const onPublishedAtPresent = (publishedAt: string | null | undefined) => {
  if (!publishedAt) {
    console.log('Solution not published, skipping GitHub workflow trigger');
    return;
  }

  console.log('Solution updated, triggering GitHub workflow...');
  // Fire and forget - don't block the UI
  triggerGithubWorkflow('solutions').catch(error => 
    console.error('Failed to trigger workflow after update:', error)
  );
}

module.exports = {
  async afterUpdate(event: ISolutionEvent) {
    if (!event.params.where?.id) {
      console.log('No solution ID found in event params, skipping afterUpdate logic');
      return;
    }

    const latestPublishedAt = event.params.data.publishedAt || (
      await strapi.db
        .query('api::solution.solution')
        .findOne({ where: { id: event.params.where.id }, select: ['publishedAt'] })
    )?.publishedAt
    onPublishedAtPresent(latestPublishedAt);
  },
};
