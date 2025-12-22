// @ts-ignore
import type { Strapi } from '@strapi/types';
import { createDocumentMiddleware } from './middlewares/documentHooks';

export default {
  register: ({ strapi }: { readonly strapi: Strapi }) => {
    // @ts-ignore
    const documentService = strapi.documents;
    if (!documentService?.use) {
      console.warn('Document service middleware unavailable - skipping custom document hooks');
      return;
    }

    documentService.use(createDocumentMiddleware(strapi));
  },
};
