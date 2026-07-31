import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArticleInput } from '@news/contracts';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/renderWithProviders';
import type { ApiError } from '@/shared/api/ApiError';
import { ArticleForm } from './ArticleForm';

const validInput: ArticleInput = {
  title: 'EU relaxes food safety requirements for Vietnamese instant noodles',
  summary: 'The EU will remove noodles from Annex II.',
  date: '2026-07-30',
  publisher: 'Saigon Times',
};

async function fillValidForm(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText(/article title/i), validInput.title);
  await user.type(screen.getByLabelText(/article summary/i), validInput.summary);
  await user.type(screen.getByLabelText(/article date/i), validInput.date);
  await user.type(screen.getByLabelText(/publisher/i), validInput.publisher);
}

describe('ArticleForm — required fields', () => {
  it('blocks submission and shows a message for every empty field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(input: ArticleInput) => Promise<void>>();

    renderWithProviders(<ArticleForm submitLabel="Create article" onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /create article/i }));

    expect(await screen.findByText('Article title is required')).toBeInTheDocument();
    expect(screen.getByText('Article summary is required')).toBeInTheDocument();
    expect(screen.getByText('Article date is required')).toBeInTheDocument();
    expect(screen.getByText('Publisher is required')).toBeInTheDocument();

    // The important half of the assertion: the request is not merely rejected
    // by the server, it is never sent.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('marks the invalid inputs so assistive technology reports them', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ArticleForm submitLabel="Create article" onSubmit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /create article/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/article title/i)).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('rejects a field containing only whitespace', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(input: ArticleInput) => Promise<void>>();

    renderWithProviders(<ArticleForm submitLabel="Create article" onSubmit={onSubmit} />);
    await fillValidForm(user);
    await user.clear(screen.getByLabelText(/publisher/i));
    await user.type(screen.getByLabelText(/publisher/i), '   ');
    await user.click(screen.getByRole('button', { name: /create article/i }));

    expect(await screen.findByText('Publisher is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('ArticleForm — successful submission', () => {
  it('submits trimmed values', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(input: ArticleInput) => Promise<void>>().mockResolvedValue();

    renderWithProviders(<ArticleForm submitLabel="Create article" onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/article title/i), `  ${validInput.title}  `);
    await user.type(screen.getByLabelText(/article summary/i), validInput.summary);
    await user.type(screen.getByLabelText(/article date/i), validInput.date);
    await user.type(screen.getByLabelText(/publisher/i), validInput.publisher);
    await user.click(screen.getByRole('button', { name: /create article/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(validInput);
    });
  });

  it('clears the form afterwards so the next article can be entered', async () => {
    // The brief: "After successful submission, clear the form fields so that
    // user can input next article".
    const user = userEvent.setup();

    renderWithProviders(
      <ArticleForm
        submitLabel="Create article"
        resetAfterSubmit
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create article/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/article title/i)).toHaveValue('');
    });
    expect(screen.getByLabelText(/publisher/i)).toHaveValue('');
  });

  it('keeps the values when editing, so a save is not mistaken for a reset', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ArticleForm
        submitLabel="Save changes"
        defaultValues={validInput}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/article title/i)).toHaveValue(validInput.title);
    });
  });
});

describe('ArticleForm — server rejections', () => {
  it('places a server validation message under the field it belongs to', async () => {
    // The whole reason the API returns details: [{ field, message }].
    const user = userEvent.setup();
    const serverError: ApiError = {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'The submitted data is invalid.',
      details: [{ field: 'publisher', message: 'That publisher is not recognised.' }],
    };

    renderWithProviders(
      <ArticleForm
        submitLabel="Create article"
        onSubmit={vi.fn().mockRejectedValue(serverError)}
      />,
    );
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create article/i }));

    const message = await screen.findByText('That publisher is not recognised.');
    expect(message).toBeInTheDocument();
    expect(screen.getByLabelText(/publisher/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a banner for a failure that belongs to no particular field', async () => {
    const user = userEvent.setup();
    const serverError: ApiError = {
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Could not reach the server. Check your connection and try again.',
    };

    renderWithProviders(
      <ArticleForm
        submitLabel="Create article"
        onSubmit={vi.fn().mockRejectedValue(serverError)}
      />,
    );
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create article/i }));

    expect(await screen.findByText(/could not reach the server/i)).toBeInTheDocument();
  });

  it('does not clear the form when the submission failed', async () => {
    // Clearing on failure would destroy the user's work and leave them with
    // nothing to correct.
    const user = userEvent.setup();

    renderWithProviders(
      <ArticleForm
        submitLabel="Create article"
        resetAfterSubmit
        onSubmit={vi
          .fn()
          .mockRejectedValue({ status: 500, code: 'INTERNAL_ERROR', message: 'Server error.' })}
      />,
    );
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create article/i }));

    expect(await screen.findByText('Server error.')).toBeInTheDocument();
    expect(screen.getByLabelText(/article title/i)).toHaveValue(validInput.title);
  });
});
