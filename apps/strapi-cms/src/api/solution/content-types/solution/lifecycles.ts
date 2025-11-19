import { onPublishedRecordTriggerGithubWorkflow } from '../../../../utils/triggerGithubWorkflow';

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
    if (!event.params.where?.id) {
      console.log('No solution ID found in event params, skipping afterUpdate logic');
      return;
    }

    const unpublishing = event.params.data.publishedAt === null;
    const recordPublishedAt = (
      await strapi.db
        .query('api::solution.solution')
        .findOne({ where: { id: event.params.where.id }, select: ['publishedAt'] })
    )?.publishedAt
    onPublishedRecordTriggerGithubWorkflow('solutions' ,recordPublishedAt, unpublishing);
  },
};
