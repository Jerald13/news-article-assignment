import type { Article, ApiErrorBody, ArticleInput, Paginated } from '@news/contracts';
import type { DatabaseSync } from 'node:sqlite';
import type { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createDatabase } from '../src/db/connection';
import { migrate } from '../src/db/migrate';
import { SqliteArticleRepository } from '../src/repositories/SqliteArticleRepository';

/**
 * These are integration tests, not unit tests with mocks. Each one drives the
 * real Express app, the real routing, the real validation and the real SQL —
 * only the database file is swapped for an in-memory one. That is what makes
 * them worth having: a mocked repository would happily pass while the actual
 * query was broken.
 */

const validInput: ArticleInput = {
  title: 'EU relaxes food safety requirements for Vietnamese instant noodles',
  summary: 'The EU will remove Vietnamese instant noodles from its Annex II control list.',
  date: '2026-07-30',
  publisher: 'Saigon Times',
};

let db: DatabaseSync;
let app: Express;

beforeEach(() => {
  db = createDatabase(':memory:');
  migrate(db);
  app = createApp({ repository: new SqliteArticleRepository(db) });
});

afterEach(() => {
  db.close();
});

async function createArticle(overrides: Partial<ArticleInput> = {}): Promise<Article> {
  const response = await request(app)
    .post('/api/articles')
    .send({ ...validInput, ...overrides });

  return response.body as Article;
}

describe('POST /api/articles', () => {
  it('creates an article and returns 201 with the stored resource', async () => {
    const response = await request(app).post('/api/articles').send(validInput);

    expect(response.status).toBe(201);

    const article = response.body as Article;
    expect(article).toMatchObject(validInput);
    expect(article.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(article.createdAt).toBe(article.updatedAt);
  });

  it('rejects an empty body with 400 and one detail per missing field', async () => {
    const response = await request(app).post('/api/articles').send({});

    expect(response.status).toBe(400);

    const body = response.body as ApiErrorBody;
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details?.map((d) => d.field).sort()).toEqual([
      'date',
      'publisher',
      'summary',
      'title',
    ]);
  });

  it('names the offending field so the client can attach the message to an input', async () => {
    const response = await request(app)
      .post('/api/articles')
      .send({ ...validInput, title: '' });

    const body = response.body as ApiErrorBody;
    expect(body.error.details).toEqual([{ field: 'title', message: 'Article title is required' }]);
  });

  it('rejects a whitespace-only field, which looks filled but is not', async () => {
    const response = await request(app)
      .post('/api/articles')
      .send({ ...validInput, publisher: '    ' });

    expect(response.status).toBe(400);
  });

  it('rejects a date that does not exist on the calendar', async () => {
    const response = await request(app)
      .post('/api/articles')
      .send({ ...validInput, date: '2026-02-30' });

    expect(response.status).toBe(400);
  });

  it('does not trust the client with server-owned fields', async () => {
    const response = await request(app)
      .post('/api/articles')
      .send({ ...validInput, id: 'client-chosen-id', createdAt: '1999-01-01T00:00:00.000Z' });

    const article = response.body as Article;
    expect(article.id).not.toBe('client-chosen-id');
    expect(article.createdAt).not.toBe('1999-01-01T00:00:00.000Z');
  });

  it('answers malformed JSON with 400 rather than 500', async () => {
    const response = await request(app)
      .post('/api/articles')
      .set('Content-Type', 'application/json')
      .send('{"title": broken');

    expect(response.status).toBe(400);
    expect((response.body as ApiErrorBody).error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/articles', () => {
  it('returns an empty page with coherent meta when there are no articles', async () => {
    const response = await request(app).get('/api/articles');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });
  });

  it('paginates and reports totals independent of the page size', async () => {
    for (let i = 0; i < 25; i++) {
      await createArticle({ title: `Article ${String(i).padStart(2, '0')}` });
    }

    const response = await request(app).get('/api/articles?page=3&limit=10');
    const body = response.body as Paginated<Article>;

    expect(body.data).toHaveLength(5);
    expect(body.meta).toEqual({ page: 3, limit: 10, total: 25, totalPages: 3 });
  });

  it('returns an empty page rather than an error when the page is past the end', async () => {
    await createArticle();

    const response = await request(app).get('/api/articles?page=99');

    expect(response.status).toBe(200);
    expect((response.body as Paginated<Article>).data).toEqual([]);
  });

  it('falls back to defaults for a nonsense query instead of failing the request', async () => {
    await createArticle();

    const response = await request(app).get('/api/articles?page=abc&limit=-4&sort=nope');

    expect(response.status).toBe(200);
    expect((response.body as Paginated<Article>).meta).toMatchObject({ page: 1, limit: 10 });
  });

  it('caps the page size so a caller cannot request the whole table', async () => {
    const response = await request(app).get('/api/articles?limit=100000');

    expect((response.body as Paginated<Article>).meta.limit).toBeLessThanOrEqual(50);
  });

  it('sorts by date descending by default', async () => {
    await createArticle({ title: 'Older', date: '2026-01-01' });
    await createArticle({ title: 'Newer', date: '2026-06-01' });

    const body = (await request(app).get('/api/articles')).body as Paginated<Article>;

    expect(body.data.map((a) => a.title)).toEqual(['Newer', 'Older']);
  });

  it('honours an explicit sort field and direction', async () => {
    await createArticle({ title: 'Beta' });
    await createArticle({ title: 'Alpha' });

    const body = (await request(app).get('/api/articles?sort=title&order=asc'))
      .body as Paginated<Article>;

    expect(body.data.map((a) => a.title)).toEqual(['Alpha', 'Beta']);
  });

  it('paginates without repeating or skipping rows that share a sort value', async () => {
    // Every article has the same date, so without a tie-breaker in the ORDER BY
    // the row order is undefined and items can appear on two pages at once.
    for (let i = 0; i < 6; i++) {
      await createArticle({ title: `Same day ${i}`, date: '2026-05-05' });
    }

    const first = (await request(app).get('/api/articles?page=1&limit=3'))
      .body as Paginated<Article>;
    const second = (await request(app).get('/api/articles?page=2&limit=3'))
      .body as Paginated<Article>;

    const ids = [...first.data, ...second.data].map((a) => a.id);
    expect(new Set(ids).size).toBe(6);
  });
});

describe('GET /api/articles — search', () => {
  beforeEach(async () => {
    await createArticle({ title: 'Nickel export curbs', publisher: 'Nikkei Asia' });
    await createArticle({ title: 'Coffee exports hit record', publisher: 'Saigon Times' });
    await createArticle({
      title: 'Unrelated story',
      summary: 'Mentions nickel deep in the body text.',
      publisher: 'Bangkok Post',
    });
  });

  it('matches the title', async () => {
    const body = (await request(app).get('/api/articles?q=curbs')).body as Paginated<Article>;
    expect(body.meta.total).toBe(1);
  });

  it('matches the publisher', async () => {
    const body = (await request(app).get('/api/articles?q=Nikkei')).body as Paginated<Article>;
    expect(body.meta.total).toBe(1);
  });

  it('matches the summary as well as the title', async () => {
    const body = (await request(app).get('/api/articles?q=nickel')).body as Paginated<Article>;
    expect(body.meta.total).toBe(2);
  });

  it('is case insensitive', async () => {
    const body = (await request(app).get('/api/articles?q=NICKEL')).body as Paginated<Article>;
    expect(body.meta.total).toBe(2);
  });

  it('reports a total that reflects the filter, not the table', async () => {
    const body = (await request(app).get('/api/articles?q=curbs')).body as Paginated<Article>;

    expect(body.meta.total).toBe(1);
    expect(body.meta.totalPages).toBe(1);
  });

  it('returns an empty page for a term that matches nothing', async () => {
    const body = (await request(app).get('/api/articles?q=zzzzz')).body as Paginated<Article>;

    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
  });

  it('treats LIKE wildcards in the search term as literal characters', async () => {
    // Unescaped, '%' matches everything and the search silently returns the
    // whole table instead of nothing.
    const body = (await request(app).get('/api/articles?q=%25')).body as Paginated<Article>;

    expect(body.meta.total).toBe(0);
  });
});

describe('GET /api/articles/:id', () => {
  it('returns the article', async () => {
    const created = await createArticle();

    const response = await request(app).get(`/api/articles/${created.id}`);

    expect(response.status).toBe(200);
    expect((response.body as Article).id).toBe(created.id);
  });

  it('returns 404 for an unknown id', async () => {
    const response = await request(app).get('/api/articles/3f8c1b2e-9d4a-4c7e-8b1f-2a6d5e0c9a13');

    expect(response.status).toBe(404);
    expect((response.body as ApiErrorBody).error.code).toBe('NOT_FOUND');
  });

  it('returns 404 rather than 500 for an id that is not a uuid', async () => {
    const response = await request(app).get('/api/articles/not-a-uuid');

    expect(response.status).toBe(404);
  });
});

describe('PUT /api/articles/:id', () => {
  it('updates the article and advances updatedAt', async () => {
    const created = await createArticle();

    const response = await request(app)
      .put(`/api/articles/${created.id}`)
      .send({ ...validInput, title: 'Revised headline' });

    expect(response.status).toBe(200);

    const updated = response.body as Article;
    expect(updated.title).toBe('Revised headline');
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(created.createdAt));
  });

  it('validates the body before checking whether the article exists', async () => {
    const created = await createArticle();

    const response = await request(app)
      .put(`/api/articles/${created.id}`)
      .send({ ...validInput, summary: '' });

    expect(response.status).toBe(400);
  });

  it('returns 404 for an unknown id', async () => {
    const response = await request(app)
      .put('/api/articles/3f8c1b2e-9d4a-4c7e-8b1f-2a6d5e0c9a13')
      .send(validInput);

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/articles/:id', () => {
  it('deletes the article and returns 204 with no body', async () => {
    const created = await createArticle();

    const response = await request(app).delete(`/api/articles/${created.id}`);

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});

    expect((await request(app).get(`/api/articles/${created.id}`)).status).toBe(404);
  });

  it('returns 404 on a second delete, so the outcome is never ambiguous', async () => {
    const created = await createArticle();

    await request(app).delete(`/api/articles/${created.id}`);
    const second = await request(app).delete(`/api/articles/${created.id}`);

    expect(second.status).toBe(404);
  });
});

describe('security and error handling', () => {
  it('does not execute SQL supplied in the search term', async () => {
    await createArticle();

    const response = await request(app).get(
      `/api/articles?q=${encodeURIComponent("'; DROP TABLE articles; --")}`,
    );

    expect(response.status).toBe(200);

    // The table survives, which it would not if the term were concatenated in.
    expect((await request(app).get('/api/articles')).body).toMatchObject({
      meta: { total: 1 },
    });
  });

  it('does not execute SQL supplied in the sort parameter', async () => {
    await createArticle();

    const response = await request(app).get(
      `/api/articles?sort=${encodeURIComponent('title; DROP TABLE articles')}`,
    );

    expect(response.status).toBe(200);
    expect((await request(app).get('/api/articles')).body).toMatchObject({ meta: { total: 1 } });
  });

  it('answers an unknown route with the same error shape as everything else', async () => {
    const response = await request(app).get('/api/nope');

    expect(response.status).toBe(404);
    expect((response.body as ApiErrorBody).error).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('does not advertise the server implementation', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('sets security headers', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});
