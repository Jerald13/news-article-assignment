import { createBrowserRouter, Navigate } from 'react-router';
import { ArticleFormPage } from '@/pages/ArticleFormPage';
import { ArticleListPage } from '@/pages/ArticleListPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AppLayout } from '@/shared/ui/AppLayout';

/**
 * The route table.
 *
 * Note the imports come from 'react-router', not 'react-router-dom' — v8
 * removed that package entirely, so every tutorial written before mid-2026 has
 * an import path that no longer resolves.
 *
 * Create and edit share one route element deliberately: the brief describes a
 * single "Create / Update" page, and one component with an optional id keeps
 * the two flows from drifting into two subtly different forms.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/articles" replace /> },
      { path: 'articles', element: <ArticleListPage /> },
      { path: 'articles/new', element: <ArticleFormPage /> },
      { path: 'articles/:id/edit', element: <ArticleFormPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
