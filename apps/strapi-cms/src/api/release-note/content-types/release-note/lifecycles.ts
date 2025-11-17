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
    if (event.params.data.publishedAt === undefined) {
      console.log(
        'Release note not published, skipping GitHub workflow trigger'
      );
      return;
    }

    console.log('Release note updated, triggering GitHub workflow...');

    // Fetch the release note to get dirName
    const releaseNoteId = event.params.where?.id || event.params.data.id;
    if (!releaseNoteId) {
      console.warn('No release note ID found, triggering full sync');
      triggerGithubWorkflow('release-notes').catch(error =>
        console.error('Failed to trigger workflow after update:', error)
      );
      return;
    }

    try {
      const releaseNote = await strapi.entityService.findOne(
        'api::release-note.release-note',
        releaseNoteId,
        {}
      );

      if (!releaseNote || !releaseNote.dirName) {
        console.warn('No dirName found for release note, triggering full sync');
        triggerGithubWorkflow('release-notes').catch(error =>
          console.error('Failed to trigger workflow after update:', error)
        );
        return;
      }

      console.log(`Syncing release note directory: ${releaseNote.dirName}`);
      // Fire and forget - don't block the UI
      triggerGithubWorkflow('release-notes', [releaseNote.dirName]).catch(error =>
        console.error('Failed to trigger workflow after update:', error)
      );
    } catch (error) {
      console.error('Error fetching release note:', error);
      // Fallback to full sync
      triggerGithubWorkflow('release-notes').catch(error =>
        console.error('Failed to trigger workflow after update:', error)
      );
    }
  },
};
