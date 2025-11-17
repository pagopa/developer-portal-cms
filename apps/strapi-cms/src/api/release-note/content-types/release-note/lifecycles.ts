import {
  IEventWithProduct,
  validateAssociatedProductPresenceOnCreate,
  validateAssociatedProductPresenceOnUpdate,
} from '../../../../utils/validateProductPresence';
import { triggerGithubWorkflow } from '../../../../utils/triggerGithubWorkflow';


const onPublishedAtPresent = (publishedAt: string | null | undefined) => {
  if (!publishedAt) {
    console.log('Release Note not published, skipping GitHub workflow trigger');
    return;
  }

  console.log('Release Note updated, triggering GitHub workflow...');
  // Fire and forget - don't block the UI
  triggerGithubWorkflow('release-notes').catch(error => 
    console.error('Failed to trigger workflow after update:', error)
  );
}

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

    const latestPublishedAt = event.params.data.publishedAt || (
      await strapi.db
        .query('api::release-note.release-note')
        .findOne({ where: { id: event.params.where.id }, select: ['publishedAt'] })
    )?.publishedAt
    onPublishedAtPresent(latestPublishedAt);
  },
};
