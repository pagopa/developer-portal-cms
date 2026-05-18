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
    readonly locale?: string;
  };
  readonly action?: string;
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
  const documentId = event.params.data?.documentId || event.params.documentId;
  const locale = event.params.locale;

  if (!documentId) {
    throw new errors.ApplicationError('QuickstartGuide documentId not found');
  }

  const quickstartGuide = await strapi
    .documents('api::quickstart-guide.quickstart-guide')
    .findOne({
      documentId,
      status: event.action === 'publish' ? 'draft' : 'published',
      ...(locale ? { locale } : {}),
      populate: ['quickstartGuideItems'],
    });

  if (!quickstartGuide) {
    throw new errors.ApplicationError('QuickstartGuide not found');
  }

  const items = event.params.data?.quickstartGuideItems;
  const connectLength = items?.connect?.length || 0;
  const disconnectLength = items?.disconnect?.length || 0;
  const currentLength = quickstartGuide.quickstartGuideItems?.length || 0;

  const newLength = currentLength - disconnectLength + connectLength;

  if (newLength <= 0) {
    throw new errors.ApplicationError('QuickstartGuide must have at least one quickstart guide item');
  }

  return true;
};
