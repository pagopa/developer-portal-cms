import { errors } from '@strapi/utils';

export interface IWebinarEvent {
  readonly params: {
    readonly data: {
      readonly id?: string;
      readonly slug?: string;
      readonly title?: string;
      readonly locale?: string;
      readonly startDatetime?: string;
      readonly endDatetime?: string;
      readonly publishedAt?: string;
    };
    readonly where?: {
      readonly documentId?: string;
    };
  };
  readonly result?: {
    readonly id?: string;
    readonly slug?: string;
    readonly title?: string;
    readonly locale?: string;
    readonly startDatetime?: string;
    readonly endDatetime?: string;
    readonly publishedAt?: string;
  };
}

export const validateWebinarDates = (event: IWebinarEvent): boolean => {
  const { data } = event.params;

  const startDateTime = data.startDatetime ? new Date(data.startDatetime) : null;
  const endDateTime = data.endDatetime ? new Date(data.endDatetime) : null;

  if ((startDateTime && !endDateTime) || (!startDateTime && endDateTime)) {
    throw new errors.ApplicationError(
      'Both start and end dates must be provided, or none should be set'
    );
  }

  if (startDateTime && endDateTime && endDateTime <= startDateTime) {
    throw new errors.ApplicationError('End date must be after start date');
  }

  return true;
};
