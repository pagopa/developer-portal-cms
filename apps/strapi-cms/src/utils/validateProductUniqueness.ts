import { errors } from "@strapi/utils";

const PRODUCT_UID = "api::product.product";

interface ProductData {
  readonly name?: string | null;
  readonly slug?: string | null;
  readonly locale?: string;
  readonly documentId?: string;
}

interface ProductValidationParams {
  readonly data?: ProductData;
  readonly locale?: string;
  readonly documentId?: string;
  readonly where?: {
    readonly documentId?: string;
  };
}

export interface ProductValidationContext {
  readonly uid: string;
  readonly action: string;
  readonly documentId?: string;
  readonly params?: ProductValidationParams;
}

interface ProductValues {
  readonly name?: string | null;
  readonly slug?: string | null;
}

const getLocale = (context: ProductValidationContext): string =>
  context.params?.locale ?? context.params?.data?.locale ?? "it";

const getDocumentId = (context: ProductValidationContext): string | undefined =>
  context.documentId ||
  context.params?.documentId ||
  context.params?.where?.documentId ||
  context.params?.data?.documentId;

const findConflictingProduct = async ({
  name,
  slug,
  locale,
  documentId,
}: ProductValues & {
  readonly locale: string;
  readonly documentId?: string;
}) => {
  const conditions: Array<Record<string, unknown>> = [];

  if (name) {
    conditions.push({ name });
  }

  if (slug) {
    conditions.push({ slug });
  }

  if (conditions.length === 0) {
    return undefined;
  }

  const filters: Record<string, unknown> = {
    $or: conditions,
  };

  if (documentId) {
    filters.documentId = {
      $ne: documentId,
    };
  }

  const products = await strapi.documents(PRODUCT_UID).findMany({
    locale,
    status: "draft",
    filters,
    fields: ["name", "slug", "documentId"],
  });

  return products[0];
};

const validateProductValues = async ({
  name,
  slug,
  locale,
  documentId,
}: ProductValues & {
  readonly locale: string;
  readonly documentId?: string;
}): Promise<void> => {
  const conflictingProduct = await findConflictingProduct({
    name,
    slug,
    locale,
    documentId,
  });

  if (!conflictingProduct) {
    return;
  }

  if (name && conflictingProduct.name === name) {
    throw new errors.ApplicationError(
      `A product with name "${name}" already exists for locale "${locale}"`
    );
  }

  if (slug && conflictingProduct.slug === slug) {
    throw new errors.ApplicationError(
      `A product with slug "${slug}" already exists for locale "${locale}"`
    );
  }
};

export const validateProductUniquenessBeforeCreate = async (
  context: ProductValidationContext
): Promise<void> => {
  const data = context.params?.data;

  await validateProductValues({
    name: data?.name,
    slug: data?.slug,
    locale: getLocale(context),
  });
};

export const validateProductUniquenessBeforeUpdate = async (
  context: ProductValidationContext
): Promise<void> => {
  const documentId = getDocumentId(context);

  if (!documentId) {
    throw new errors.ApplicationError("Product documentId not found");
  }

  const locale = getLocale(context);
  const data = context.params?.data;

  const previousProduct = await strapi.documents(PRODUCT_UID).findOne({
    documentId,
    locale,
    status: "draft",
    fields: ["name", "slug"],
  });

  await validateProductValues({
    name: data?.name ?? previousProduct?.name,
    slug: data?.slug ?? previousProduct?.slug,
    locale,
    documentId,
  });
};
