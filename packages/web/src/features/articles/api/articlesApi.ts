import type { Article, ArticleInput, ListQuery, Paginated } from '@news/contracts';
import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/shared/api/axiosBaseQuery';

const ARTICLE_TAG = 'Article' as const;
/** Sentinel id standing for "the collection", as opposed to one article. */
const LIST_ID = 'LIST' as const;

export interface UpdateArticleArgs {
  id: string;
  input: ArticleInput;
}

/**
 * Every article request the app makes.
 *
 * The tag declarations below are the reason there is no manual cache
 * management anywhere in this codebase. A query *provides* tags describing what
 * it holds; a mutation *invalidates* tags describing what it changed. RTK Query
 * refetches the overlap. Creating an article therefore refreshes the list on
 * its own — no `refetch()` call, no event bus, and no possibility of forgetting
 * one of the places that needed updating.
 */
export const articlesApi = createApi({
  reducerPath: 'articlesApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: [ARTICLE_TAG],

  endpoints: (build) => ({
    listArticles: build.query<Paginated<Article>, Partial<ListQuery>>({
      query: (params) => ({ url: '/articles', method: 'GET', params }),

      // Tag every row as well as the collection, so updating one article
      // refreshes any list holding it without invalidating unrelated pages.
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: ARTICLE_TAG, id })),
              { type: ARTICLE_TAG, id: LIST_ID },
            ]
          : [{ type: ARTICLE_TAG, id: LIST_ID }],
    }),

    getArticle: build.query<Article, string>({
      query: (id) => ({ url: `/articles/${id}`, method: 'GET' }),
      providesTags: (_result, _error, id) => [{ type: ARTICLE_TAG, id }],
    }),

    createArticle: build.mutation<Article, ArticleInput>({
      query: (input) => ({ url: '/articles', method: 'POST', data: input }),
      invalidatesTags: [{ type: ARTICLE_TAG, id: LIST_ID }],
    }),

    updateArticle: build.mutation<Article, UpdateArticleArgs>({
      query: ({ id, input }) => ({ url: `/articles/${id}`, method: 'PUT', data: input }),
      // Both the row and the collection: the article itself changed, and its
      // position in a sorted list may have changed with it.
      invalidatesTags: (_result, _error, { id }) => [
        { type: ARTICLE_TAG, id },
        { type: ARTICLE_TAG, id: LIST_ID },
      ],
    }),

    // Typed as `null` rather than `void`. A 204 carries no body, and Axios
    // surfaces that as an empty string — so `void` would be a lie, and the
    // value still has to be serialisable to sit in the Redux store.
    // `transformResponse` makes the declared type the true one.
    deleteArticle: build.mutation<null, string>({
      query: (id) => ({ url: `/articles/${id}`, method: 'DELETE' }),
      transformResponse: () => null,
      invalidatesTags: (_result, _error, id) => [
        { type: ARTICLE_TAG, id },
        { type: ARTICLE_TAG, id: LIST_ID },
      ],
    }),
  }),
});

export const {
  useListArticlesQuery,
  useGetArticleQuery,
  useCreateArticleMutation,
  useUpdateArticleMutation,
  useDeleteArticleMutation,
} = articlesApi;
