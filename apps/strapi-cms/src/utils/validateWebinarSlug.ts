import { errors, env } from '@strapi/utils';
import type { IWebinarEvent } from './validateWebinarDates';

function getActiveCampaignIntegrationIsEnabled() {
  return env('ACTIVE_CAMPAIGN_INTEGRATION_IS_ENABLED', 'False') === 'True';
}

const validateSlug = (slug?: string): boolean => {
  if (!getActiveCampaignIntegrationIsEnabled()) {
    return true;
  }

  if (!slug) {
    throw new errors.ApplicationError(
      'The slug of a webinar cannot be an empty string'
    );
  }

  return true;
};

export const validateSlugBeforeCreate = (event: IWebinarEvent): boolean =>
  validateSlug(event.params.data.slug);

export const validateSlugBeforeUpdate = async (
  event: IWebinarEvent
): Promise<boolean> => {
  const documentId = event.params.where?.documentId;
  if (!documentId) {
    throw new errors.ApplicationError('Webinar documentId not found');
  }

  const previousWebinar = await strapi.db
    .query('api::webinar.webinar')
    .findOne({
      select: ['slug'],
      where: { documentId },
    });

  const slug = event.params.data.slug || previousWebinar?.slug;
  validateSlug(slug);

  if (
    (event.params.data.slug || event.params.data.slug === null) &&
    previousWebinar &&
    previousWebinar.slug !== event.params.data.slug
  ) {
    throw new errors.ApplicationError(
      'The slug of a webinar cannot be changed'
    );
  }

  return true;
};
