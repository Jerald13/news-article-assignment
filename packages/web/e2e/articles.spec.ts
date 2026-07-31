import { expect, test, type Page } from '@playwright/test';

/**
 * End-to-end journeys through the real stack: browser, React, Axios, Express
 * and SQLite, with nothing mocked.
 *
 * These are deliberately few. Unit and component tests already cover the rules
 * and the rendering; what only an end-to-end test can prove is that the pieces
 * are wired to each other — that a form submission really reaches the database
 * and really comes back out on the other page.
 */

/** Unique per run, so tests never collide with earlier data or each other. */
function uniqueTitle(label: string): string {
  return `E2E ${label} ${Date.now().toString(36)}`;
}

async function createArticle(page: Page, title: string): Promise<void> {
  await page.goto('/articles/new');
  await page.getByLabel('Article title').fill(title);
  await page
    .getByLabel('Article summary')
    .fill('First point for the end-to-end run. Second point for the same run.');
  await page.getByLabel('Article date').fill('2026-07-28');
  await page.getByLabel('Publisher').fill('E2E Wire Service');
  await page.getByRole('button', { name: 'Create article' }).click();
  await expect(page.getByText('Article created.')).toBeVisible();
}

test.describe('creating an article', () => {
  test('an article created on page 1 appears on page 2', async ({ page }) => {
    const title = uniqueTitle('create');

    await createArticle(page, title);

    // The form clears itself, ready for the next entry — an explicit
    // requirement of the brief.
    await expect(page.getByLabel('Article title')).toHaveValue('');

    await page.goto('/articles?sort=createdAt&order=desc');
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  });

  test('an empty submission is refused and nothing is created', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST') {
        requests.push(request.url());
      }
    });

    await page.goto('/articles/new');
    await page.getByRole('button', { name: 'Create article' }).click();

    await expect(page.getByText('Article title is required')).toBeVisible();
    await expect(page.getByText('Article summary is required')).toBeVisible();
    await expect(page.getByText('Article date is required')).toBeVisible();
    await expect(page.getByText('Publisher is required')).toBeVisible();

    expect(requests).toHaveLength(0);
  });
});

test.describe('editing an article', () => {
  test('an edit survives a full page reload', async ({ page }) => {
    const original = uniqueTitle('edit');
    const revised = `${original} revised`;

    await createArticle(page, original);
    await page.goto('/articles?sort=createdAt&order=desc');

    const card = page.locator('article').filter({ hasText: original });
    await card.getByRole('button', { name: /^Actions for/ }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();

    await expect(page.getByLabel('Article title')).toHaveValue(original);
    await page.getByLabel('Article title').fill(revised);
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page).toHaveURL(/\/articles$/);

    // Reload rather than trusting the in-memory cache: this is what proves the
    // change reached the database.
    await page.goto('/articles?sort=createdAt&order=desc');
    await page.reload();
    await expect(page.getByRole('heading', { name: revised })).toBeVisible();
  });

  test('an edit link pasted into a cold tab arrives prefilled', async ({ page, context }) => {
    const title = uniqueTitle('deeplink');

    await createArticle(page, title);
    await page.goto('/articles?sort=createdAt&order=desc');

    const card = page.locator('article').filter({ hasText: title });
    await card.getByRole('button', { name: /^Actions for/ }).click();
    const href = await page.getByRole('menuitem', { name: 'Edit' }).getAttribute('href');

    const coldTab = await context.newPage();
    await coldTab.goto(href ?? '');

    await expect(coldTab.getByLabel('Article title')).toHaveValue(title);
    await coldTab.close();
  });
});

test.describe('searching and deleting', () => {
  test('search narrows the list and the term is shareable', async ({ page }) => {
    const title = uniqueTitle('search');

    await createArticle(page, title);
    await page.goto('/articles');

    await page.getByRole('searchbox', { name: /Search articles/ }).fill(title);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByText('1 article found')).toBeVisible();

    // The term is in the URL, so the filtered view can be linked to.
    await expect(page).toHaveURL(
      new RegExp(`q=${encodeURIComponent(title).replace(/%20/g, '\\+|%20')}`),
    );
  });

  test('deleting asks first, and cancelling keeps the article', async ({ page }) => {
    const title = uniqueTitle('cancel');

    await createArticle(page, title);
    await page.goto('/articles?sort=createdAt&order=desc');

    const card = page.locator('article').filter({ hasText: title });
    await card.getByRole('button', { name: /^Actions for/ }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    // The title is quoted back, so a misclick is visible before it is acted on.
    await expect(page.getByRole('dialog')).toContainText(title);

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  });

  test('confirming a delete removes the article for good', async ({ page }) => {
    const title = uniqueTitle('delete');

    await createArticle(page, title);
    await page.goto('/articles?sort=createdAt&order=desc');

    const card = page.locator('article').filter({ hasText: title });
    await card.getByRole('button', { name: /^Actions for/ }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByText('Article deleted.')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: title })).toHaveCount(0);
  });
});

test.describe('navigation', () => {
  test('both pages link to each other', async ({ page }) => {
    // An explicit requirement of the brief, and easy to ship without.
    await page.goto('/articles');
    await page.getByRole('link', { name: 'New article' }).click();
    await expect(page).toHaveURL(/\/articles\/new$/);

    await page.getByRole('link', { name: 'Browse' }).click();
    await expect(page).toHaveURL(/\/articles$/);
  });

  test('an unknown route shows a 404 page with a way back', async ({ page }) => {
    await page.goto('/nope');

    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to articles' }).click();
    await expect(page).toHaveURL(/\/articles$/);
  });
});
