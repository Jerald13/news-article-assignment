import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { makeArticle, paginated, serverDownHandlers } from '../../tests/msw/handlers';
import { server } from '../../tests/msw/server';
import { renderWithProviders } from '../../tests/renderWithProviders';
import { ArticleListPage } from './ArticleListPage';

describe('ArticleListPage — loading and results', () => {
  it('announces the wait, then renders the articles', async () => {
    renderWithProviders(<ArticleListPage />, { route: '/articles' });

    expect(screen.getByText('Loading articles')).toBeInTheDocument();

    expect(await screen.findByText(/EU relaxes food safety requirements/i)).toBeInTheDocument();
    expect(screen.getByText(/Indonesia nickel export curbs/i)).toBeInTheDocument();
  });

  it('renders each summary as bullet points, as the design does', async () => {
    renderWithProviders(<ArticleListPage />, { route: '/articles' });

    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(2);

    // Two sentences in the fixture summary become two list items, rather than
    // one paragraph.
    expect(within(cards[0]!).getAllByRole('listitem')).toHaveLength(2);
  });

  it('exposes a machine-readable date alongside the relative label', async () => {
    renderWithProviders(<ArticleListPage />, { route: '/articles' });

    const cards = await screen.findAllByRole('article');
    const time = within(cards[0]!).getByText(/ago|today|yesterday|\d{4}/i, { selector: 'time' });

    expect(time).toHaveAttribute('dateTime', '2026-07-30');
  });

  it('agrees the noun with the count', async () => {
    server.use(http.get('*/api/articles', () => HttpResponse.json(paginated([makeArticle()]))));

    renderWithProviders(<ArticleListPage />, { route: '/articles' });

    // "1 articles found" is exactly the kind of detail a reviewer notices.
    expect(await screen.findByText('1 article found')).toBeInTheDocument();
  });
});

describe('ArticleListPage — empty states', () => {
  it('invites the reader to create one when nothing exists', async () => {
    server.use(http.get('*/api/articles', () => HttpResponse.json(paginated([]))));

    renderWithProviders(<ArticleListPage />, { route: '/articles' });

    expect(await screen.findByRole('heading', { name: 'No articles yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create the first article/i })).toBeInTheDocument();
  });

  it('says the search matched nothing, rather than that nothing exists', async () => {
    // Different situation, different message: articles do exist, the filter is
    // hiding them, and telling the user to create one would be misleading.
    server.use(http.get('*/api/articles', () => HttpResponse.json(paginated([]))));

    renderWithProviders(<ArticleListPage />, { route: '/articles?q=nothingmatches' });

    expect(
      await screen.findByRole('heading', { name: 'No matching articles' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/nothingmatches/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /create the first article/i })).toBeNull();
  });
});

describe('ArticleListPage — failure', () => {
  it('shows a recoverable error when the server returns an HTML error page', async () => {
    // A 502 from a proxy is a string, not JSON. The naive reading of
    // response.data.error.message throws while handling the error.
    server.use(...serverDownHandlers);

    renderWithProviders(<ArticleListPage />, { route: '/articles' });

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Could not load articles')).toBeInTheDocument();
    expect(within(alert).getByRole('button', { name: /try again/i })).toBeInTheDocument();

    // Never the raw HTML body.
    expect(screen.queryByText(/502 Bad Gateway/)).toBeNull();
  });

  it('recovers when retried after the server comes back', async () => {
    server.use(...serverDownHandlers);

    const user = userEvent.setup();
    renderWithProviders(<ArticleListPage />, { route: '/articles' });

    await screen.findByRole('alert');

    server.use(http.get('*/api/articles', () => HttpResponse.json(paginated([makeArticle()]))));
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText(/EU relaxes food safety requirements/i)).toBeInTheDocument();
  });
});

describe('ArticleListPage — search', () => {
  it('sends one request for a burst of typing, not one per keystroke', async () => {
    const requestedTerms: string[] = [];

    server.use(
      http.get('*/api/articles', ({ request }) => {
        requestedTerms.push(new URL(request.url).searchParams.get('q') ?? '');
        return HttpResponse.json(paginated([makeArticle()]));
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<ArticleListPage />, { route: '/articles' });
    await screen.findByText(/EU relaxes food safety/i);

    requestedTerms.length = 0;
    await user.type(screen.getByRole('searchbox', { name: /search articles/i }), 'nickel');

    await waitFor(
      () => {
        expect(requestedTerms).toContain('nickel');
      },
      { timeout: 3000 },
    );

    // Six keystrokes; anything beyond a couple of requests means the debounce
    // is not doing its job.
    expect(requestedTerms.length).toBeLessThanOrEqual(2);
  });
});
