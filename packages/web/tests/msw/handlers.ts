import type { Article, ApiErrorBody, Paginated } from '@news/contracts';
import { HttpResponse, http } from 'msw';

/**
 * A tiny in-memory stand-in for the API.
 *
 * MSW intercepts at the network boundary, so the component under test runs the
 * real Axios instance, the real `axiosBaseQuery`, and the real RTK Query cache.
 * `vi.mock('axios')` would replace exactly the code most worth testing and the
 * suite would be verifying its own mock.
 */

export function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: '3f8c1b2e-9d4a-4c7e-8b1f-2a6d5e0c9a13',
    title: 'EU relaxes food safety requirements for Vietnamese instant noodles',
    summary: 'The EU will remove noodles from Annex II. Exporters still face border checks.',
    date: '2026-07-30',
    publisher: 'Saigon Times',
    createdAt: '2026-07-30T09:15:00.000Z',
    updatedAt: '2026-07-30T09:15:00.000Z',
    ...overrides,
  };
}

export function paginated(articles: Article[], page = 1, limit = 10): Paginated<Article> {
  return {
    data: articles,
    meta: {
      page,
      limit,
      total: articles.length,
      totalPages: Math.max(1, Math.ceil(articles.length / limit)),
    },
  };
}

/** Default: two articles, filtered by `q` so search behaviour is exercisable. */
export const handlers = [
  http.get('*/api/articles', ({ request }) => {
    const term = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? '';

    const all = [
      makeArticle(),
      makeArticle({
        id: '7c2d4f9a-1b3e-4a8d-9f6c-5e0a2b7d1c48',
        title: 'Indonesia nickel export curbs push battery makers to rethink supply',
        publisher: 'Nikkei Asia',
      }),
    ];

    const matching = term
      ? all.filter((article) => article.title.toLowerCase().includes(term))
      : all;

    return HttpResponse.json(paginated(matching));
  }),
];

/** Every article request fails with a 500 that is not even JSON. */
export const serverDownHandlers = [
  http.get('*/api/articles', () =>
    HttpResponse.text('<html><body>502 Bad Gateway</body></html>', { status: 502 }),
  ),
];

/** A validation rejection carrying per-field detail, as the real API returns. */
export function validationErrorBody(field: string, message: string): ApiErrorBody {
  return {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'The submitted data is invalid.',
      details: [{ field, message }],
    },
  };
}
