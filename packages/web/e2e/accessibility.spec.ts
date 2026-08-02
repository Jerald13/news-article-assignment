import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Automated accessibility checks.
 *
 * axe catches perhaps a third of real accessibility problems — the mechanical
 * ones: missing labels, insufficient contrast, broken heading order, controls
 * with no accessible name. The keyboard and focus tests below cover what it
 * cannot see, which is whether the page can actually be operated.
 *
 * WCAG 2.1 AA is the level referenced by most accessibility legislation, so it
 * is the bar worth holding to rather than "no obvious problems".
 */

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test.describe('automated audit', () => {
  test('the article list has no violations', async ({ page }) => {
    await page.goto('/articles');
    await page.waitForSelector('article');

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();

    expect(violations.map((v) => `${v.id}: ${v.description}`)).toEqual([]);
  });

  test('the article form has no violations', async ({ page }) => {
    await page.goto('/articles/new');
    await page.waitForSelector('#article-title');

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();

    expect(violations.map((v) => `${v.id}: ${v.description}`)).toEqual([]);
  });

  test('a form showing validation errors has no violations', async ({ page }) => {
    // The error state is a different DOM with different ARIA, so passing in the
    // clean state says nothing about it.
    await page.goto('/articles/new');
    await page.getByRole('button', { name: 'Create article' }).click();
    await page.getByText('Article title is required').waitFor();

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();

    expect(violations.map((v) => `${v.id}: ${v.description}`)).toEqual([]);
  });

  test('the delete dialog has no violations while open', async ({ page }) => {
    await page.goto('/articles');
    await page.locator('button[aria-label^="Actions for"]').first().click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('dialog').waitFor();

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();

    expect(violations.map((v) => `${v.id}: ${v.description}`)).toEqual([]);
  });

  test('the empty state has no violations', async ({ page }) => {
    await page.goto('/articles?q=zzzznothingmatchesthis');
    await page.getByRole('heading', { name: 'No matching articles' }).waitFor();

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();

    expect(violations.map((v) => `${v.id}: ${v.description}`)).toEqual([]);
  });
});

test.describe('keyboard operation', () => {
  test('every field and the submit button are reachable by tabbing forward', async ({ page }) => {
    await page.goto('/articles/new');

    // The first field is focused on arrival, so typing can start immediately.
    await expect(page.locator('#article-title')).toBeFocused();

    const visited: string[] = [];

    // A generous bound rather than one press per field: Chrome renders
    // <input type="date"> as several internal tab stops — day, month, year and
    // the picker — so the number of presses is a browser detail, while the
    // property worth asserting is that nothing is unreachable.
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      visited.push(
        await page.evaluate(() => {
          const element = document.activeElement;
          if (!element) return '';
          const text = element.textContent;
          return element.id || (text ? text.trim().slice(0, 20) : '') || element.tagName;
        }),
      );
    }

    expect(visited).toContain('article-summary');
    expect(visited).toContain('article-date');
    expect(visited).toContain('article-publisher');
    expect(visited).toContain('Create article');
    expect(visited).toContain('Cancel');
  });

  test('the form can be filled and submitted without a mouse', async ({ page }) => {
    await page.goto('/articles/new');

    await page.locator('#article-title').focus();
    await page.keyboard.type(`Keyboard only ${Date.now().toString(36)}`);
    await page.keyboard.press('Tab');
    await page.keyboard.type('Written entirely from the keyboard.');

    // Chrome's date widget takes digits per segment, not an ISO string.
    await page.locator('#article-date').focus();
    await page.keyboard.type('07272026');

    await page.locator('#article-publisher').focus();
    await page.keyboard.type('Keyboard Wire');

    // Enter from within a field submits the form, as a native form should.
    await page.keyboard.press('Enter');
    await expect(page.getByText('Article created.')).toBeVisible();
  });

  test('the invalid submit button stays reachable by keyboard', async ({ page }) => {
    // A submit disabled because the form is invalid drops out of the tab order,
    // so a keyboard user cannot reach it to find out what is wrong.
    await page.goto('/articles/new');

    const submit = page.getByRole('button', { name: 'Create article' });
    await expect(submit).toBeEnabled();
  });

  test('every interactive element on the list is reachable by tabbing', async ({ page }) => {
    await page.goto('/articles');
    await page.waitForSelector('article');

    const reached = new Set<string>();

    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      const description = await page.evaluate(() => {
        const element = document.activeElement;
        if (!element || element === document.body) return '';
        const label = element.getAttribute('aria-label');
        const text = element.textContent;
        const name = label ?? (text ? text.trim().slice(0, 20) : '');
        return `${element.tagName}:${name}`;
      });
      if (description) reached.add(description);
    }

    // The nav links, the search field and at least one card action.
    expect([...reached].some((d) => d.includes('Browse'))).toBe(true);
    expect([...reached].some((d) => d.includes('Search articles'))).toBe(true);
    expect([...reached].some((d) => d.includes('Actions for'))).toBe(true);
  });

  test('focus is visible wherever it lands', async ({ page }) => {
    await page.goto('/articles');

    // Wait for a real control before tabbing. `goto` resolves on load, which can
    // precede React rendering the header — and a Tab pressed before there is
    // anything focusable leaves focus on <body>, whose computed outline style is
    // 'none'. That read as a genuine failure and was the source of this test's
    // flakiness in CI.
    await page.getByRole('link', { name: 'Browse' }).waitFor();
    await page.keyboard.press('Tab');

    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      return { tag: el.tagName, width: style.outlineWidth, style: style.outlineStyle };
    });

    expect(focused, 'Tab should move focus to a control, not the body').not.toBeNull();
    // outline: none on a focused control makes the page unusable by keyboard.
    expect(focused?.style).not.toBe('none');
  });
});

test.describe('responsive layout', () => {
  for (const [label, width] of [
    ['small phone', 360],
    ['tablet', 768],
    ['desktop', 1440],
  ] as const) {
    test(`does not scroll horizontally on a ${label}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/articles');
      await page.waitForSelector('article');

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );

      expect(overflows).toBe(false);
    });
  }
});

test.describe('page titles', () => {
  test('each route sets a distinct title', async ({ page }) => {
    // Someone with several tabs open, or using a screen reader, identifies the
    // page by its title before anything else.
    await page.goto('/articles');
    await expect(page).toHaveTitle('Articles · News Articles');

    await page.goto('/articles/new');
    await expect(page).toHaveTitle('New article · News Articles');
  });
});
