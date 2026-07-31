import Box from '@mui/material/Box';
import Pagination from '@mui/material/Pagination';
import type { Article, PaginationMeta } from '@news/contracts';
import { ArticleCard } from './ArticleCard';

export interface ArticleListProps {
  articles: Article[];
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onDelete: (article: Article) => void;
}

/**
 * The card list and its pager.
 *
 * Presentational: it renders what it is given and reports which page was
 * clicked. Fetching, URL syncing and state all stay in the page above it, which
 * is what keeps this component testable with a plain array and no store.
 *
 * The pager is hidden on a single page rather than shown disabled — controls
 * that can never do anything are noise.
 */
export function ArticleList({ articles, meta, onPageChange, onDelete }: ArticleListProps) {
  return (
    <Box>
      <Box sx={{ display: 'grid', gap: 2 }}>
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} onDelete={onDelete} />
        ))}
      </Box>

      {meta.totalPages > 1 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={meta.totalPages}
            page={meta.page}
            onChange={(_event, page) => {
              onPageChange(page);
            }}
            color="primary"
            shape="rounded"
            // Scroll back to the top on page change; otherwise the reader lands
            // mid-list on the new page, at the scroll position of the old one.
            getItemAriaLabel={(type, page) =>
              type === 'page' ? `Go to page ${String(page)}` : `Go to ${type} page`
            }
          />
        </Box>
      ) : null}
    </Box>
  );
}
