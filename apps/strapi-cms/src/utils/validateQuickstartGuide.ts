import {errors} from "@strapi/utils";

export interface IQuickstartGuideEvent {
  readonly params: {
    readonly data: {
      readonly documentId?: string;
      readonly quickstartGuideItems?: {
        readonly connect?: IQuickstartGuideItemsEvent[]
        readonly disconnect?: IQuickstartGuideItemsEvent[]
      }
    }
    readonly documentId?: string;
  }
}

interface IQuickstartGuideItemsEvent {
  readonly id?: string;
  readonly documentId?: string;
  readonly locale?: string;
  readonly isTemporary?: boolean;
}

export const validateQuickstartGuideItemsPresenceOnCreate = (event: IQuickstartGuideEvent) => {
  if(!event.params.data.quickstartGuideItems || event.params.data.quickstartGuideItems!.connect!.length === 0){
    throw new errors.ApplicationError('QuickstartGuide must have at least one quickstart guide item');
  }
  return true;
}

export const validateQuickstartGuideItemsPresenceOnUpdate = async (event: IQuickstartGuideEvent) => {
  const documentId = event.params.data.documentId || event.params.documentId;
  if (!documentId) {
    throw new errors.ApplicationError('QuickstartGuide documentId not found');
  }
  const foundQuickstartGuide = await strapi.db
    .query('api::quickstart-guide.quickstart-guide')
    .findOne({
      where: {documentId},
      populate: ['quickstartGuideItems'],
    });

  if (!foundQuickstartGuide) {
    throw new errors.ApplicationError('QuickstartGuide not found');
  }
  const quickstartGuideItemsDelta =event.params.data.quickstartGuideItems!.disconnect!.length - event.params.data.quickstartGuideItems!.connect!.length

  if(event.params.data.quickstartGuideItems && event.params.data.quickstartGuideItems.disconnect!.length > 0) {
    if (foundQuickstartGuide.quickstartGuideItems.length === 0 || foundQuickstartGuide.quickstartGuideItems.length <= quickstartGuideItemsDelta) {
      throw new errors.ApplicationError('QuickstartGuide must have at least one quickstart guide item');
    }
  }
  else if(foundQuickstartGuide.quickstartGuideItems.length === 0 && quickstartGuideItemsDelta === 0) {throw new errors.ApplicationError('QuickstartGuide must have at least one quickstart guide item');
  }
  return true;
}
