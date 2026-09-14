/**
 * The shape Next.js hands a page for `searchParams`.
 *
 * Kept separate from any feature module so route files can type their props
 * without importing a feature's data layer.
 */
export type SearchParamsInput = Record<string, string | string[] | undefined>;
