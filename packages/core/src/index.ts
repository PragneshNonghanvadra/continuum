export const CONTINUUM_PRODUCT_NAME = "Continuum";

export type ApiHealth = {
  ok: boolean;
  product: typeof CONTINUUM_PRODUCT_NAME;
  version: string;
};
