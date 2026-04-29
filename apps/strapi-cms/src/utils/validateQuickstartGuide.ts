import { errors } from "@strapi/utils";

export interface IQuickstartGuideEvent {
  readonly params: {
    readonly data: {
      readonly documentId?: string;
      readonly quickstartGuideItems?: {
        readonly connect?: IQuickstartGuideItemsEvent[];
        readonly disconnect?: IQuickstartGuideItemsEvent[];
      };
    };
    readonly documentId?: string;
  };
}

export interface IQuickstartGuideItemsEvent {
  readonly id?: string;
  readonly documentId?: string;
  readonly locale?: string;
  readonly isTemporary?: boolean;
}

export const validateQuickstartGuideItemsPresenceOnCreate = (event: IQuickstartGuideEvent) => {
  const { quickstartGuideItems } = event.params.data;

  if (!quickstartGuideItems?.connect?.length) {
    throw new errors.ApplicationError('QuickstartGuide must have at least one quickstart guide item');
  }

  return true;
};

export const validateQuickstartGuideItemsPresenceOnUpdate = async (event: IQuickstartGuideEvent) => {
  const documentId = event.params.data.documentId || event.params.documentId;

  if (!documentId) {
    throw new errors.ApplicationError('QuickstartGuide documentId not found');
  }

  const foundQuickstartGuide = await strapi.db
    .query('api::quickstart-guide.quickstart-guide')
    .findOne({
      where: { documentId },
      populate: ['quickstartGuideItems'],
    });

  if (!foundQuickstartGuide) {
    throw new errors.ApplicationError('QuickstartGuide not found');
  }

  const items = event.params.data.quickstartGuideItems;
  const connectLength = items?.connect?.length || 0;
  const disconnectLength = items?.disconnect?.length || 0;
  const currentLength = foundQuickstartGuide.quickstartGuideItems?.length || 0;

  const newLength = currentLength - disconnectLength + connectLength;

  if (newLength <= 0) {
    throw new errors.ApplicationError('QuickstartGuide must have at least one quickstart guide item');
  }

  return true;
};
