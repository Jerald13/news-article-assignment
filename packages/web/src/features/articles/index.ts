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

export { formatArticleDate, toSummaryPoints } from './model/formatArticleDate';
export { useArticleQueryParams } from './model/useArticleQueryParams';

export { ArticleCard } from './ui/ArticleCard';
export { ArticleEmptyState } from './ui/ArticleEmptyState';
export { ArticleList } from './ui/ArticleList';
export { ArticleListSkeleton } from './ui/ArticleListSkeleton';
export { ArticleResultsHeader } from './ui/ArticleResultsHeader';
