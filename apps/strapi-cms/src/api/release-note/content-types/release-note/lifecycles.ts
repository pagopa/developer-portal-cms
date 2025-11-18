import {
  IEventWithProduct,
  validateAssociatedProductPresenceOnCreate,
  validateAssociatedProductPresenceOnUpdate,
} from '../../../../utils/validateProductPresence';
import { onPublishedRecordTriggerGithubWorkflow } from '../../../../utils/triggerGithubWorkflow';

module.exports = {
  beforeCreate(event: IEventWithProduct) {
    validateAssociatedProductPresenceOnCreate(event);
  },
  beforeUpdate(event: IEventWithProduct) {
    validateAssociatedProductPresenceOnUpdate(event);
  },
  async afterUpdate(event: IEventWithProduct) {
    if (!event.params.where?.id) {
      console.log('No release-note ID found in event params, skipping afterUpdate logic');
      return;
    }

    const unpublishing = event.params.data.publishedAt === null;
    const recordPublishedAt = (
      await strapi.db
        .query('api::release-note.release-note')
        .findOne({ where: { id: event.params.where.id }, select: ['publishedAt'] })
    )?.publishedAt
    onPublishedRecordTriggerGithubWorkflow('release-notes' ,recordPublishedAt, unpublishing);
  },
};
