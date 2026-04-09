import { errors } from '@strapi/utils';
import { GUIDES_UID, RELEASE_NOTES_UID } from '../middlewares/documentHooks';

const validatorsAreDisabled = process.env.DISABLE_CUSTOM_VALIDATORS === 'True';

export interface IEventWithProduct {
  readonly params: {
    readonly data: {
      readonly id?: string;
      readonly product?: {
        readonly connect?: Array<{
          readonly id: string;
        }>;
        readonly disconnect?: Array<{
          readonly id: string;
        }>;
      };
      readonly publishedAt?: string | null;
    };
    readonly where?: {
      readonly id?: string;
    };
  };
  readonly result?: {
    readonly locale?: string;
  };
}

export const entitiesRequiringProductAssociation = [
  'api::api-data-list-page.api-data-list-page',
  'api::api-data.api-data',
  GUIDES_UID,
  'api::guide-list-page.guide-list-page',
  'api::overview.overview',
  'api::quickstart-guide.quickstart-guide',
  'api::tutorial-list-page.tutorial-list-page',
  'api::tutorial.tutorial',
  'api::use-case-list-page.use-case-list-page',
  'api::use-case.use-case',
  RELEASE_NOTES_UID,
];

export const validateAssociatedProductPresenceOnUpdate = (
  event: IEventWithProduct
): boolean => {
  if (validatorsAreDisabled) {
    return true;
  }
  // if there's only disconnect and no connect, throw error
  if (
    (event.params.data.product?.disconnect?.length ?? 0) > 0 &&
    (event.params.data.product?.connect?.length ?? 0) === 0
  ) {
    throw new errors.ApplicationError('Product is required');
  }

  return true;
};

export const validateAssociatedProductPresenceOnCreate = (
  event: IEventWithProduct
): boolean => {
  if (validatorsAreDisabled) {
    return true;
  }
  // if theres no connect inside connect elements throw error
  if ((event.params.data.product?.connect?.length ?? 0) === 0) {
    throw new errors.ApplicationError('Product is required');
  }
  return true;
};
