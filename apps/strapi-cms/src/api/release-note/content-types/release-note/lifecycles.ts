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
  async afterUpdate(event: IEventWithProduct) {
    if (!event.params.where?.id) {
      console.log('No release-note ID found in event params, skipping afterUpdate logic');
      return;
    }

    const unpublishing = event.params.data.publishedAt === null;
    const record = await strapi.db
      .query('api::release-note.release-note')
      .findOne({ where: { id: event.params.where.id }, select: ['publishedAt'] });
    const recordPublishedAt = record?.publishedAt;

    if (!recordPublishedAt && !unpublishing) {
      console.log('Release note not published, skipping GitHub workflow trigger');
      return;
    }

    console.log('Release note updated, triggering GitHub workflow...');

    try {
      // Fetch the release note to get dirName
      const releaseNoteId = event.params.where?.id || event.params.data.id;
      if (!releaseNoteId) {
        throw new Error('No release note ID found, triggering full sync');
      }

      const releaseNote = await strapi.entityService.findOne(
        'api::release-note.release-note',
        releaseNoteId,
        {}
      );

      if (!releaseNote || !releaseNote.dirName) {
        throw new Error('No dirName found for release note, triggering full sync');
      }

      console.log(`Syncing release note directory: ${releaseNote.dirName}`);
      // Fire and forget - don't block the UI
      triggerGithubWorkflow('release_notes', [releaseNote.dirName]).catch(error =>
        console.error('Failed to trigger workflow after update:', error)
      );
    } catch (error) {
      console.error('Error fetching release note:', error);
      // Fallback to full sync
      triggerGithubWorkflow('release_notes').catch(error =>
        console.error('Failed to trigger workflow after update:', error)
      );
    }
  },
};
