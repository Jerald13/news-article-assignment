/**
 * The articles feature's public surface.
 *
 * Pages import from here and never reach into the folders below. That is what
 * keeps the feature's internals free to be renamed, split or restructured
 * without touching a page — and it is enforced by ESLint, not just convention.
 */

export {
  articlesApi,
  useCreateArticleMutation,
  useDeleteArticleMutation,
  useGetArticleQuery,
  useListArticlesQuery,
  useUpdateArticleMutation,
  type UpdateArticleArgs,
} from './api/articlesApi';
