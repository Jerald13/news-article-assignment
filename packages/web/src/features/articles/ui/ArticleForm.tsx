import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { ARTICLE_FIELD_LIMITS, type ArticleInput, articleInputSchema } from '@news/contracts';
import { useEffect, useState, type MouseEvent } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { hasFieldErrors } from '@/shared/api/ApiError';
import { normalizeError } from '@/shared/api/normalizeError';

const EMPTY_ARTICLE: ArticleInput = { title: '', summary: '', date: '', publisher: '' };

/** Field order, used to focus the first invalid input after a server rejection. */
const FIELD_ORDER: (keyof ArticleInput)[] = ['title', 'summary', 'date', 'publisher'];

/**
 * Open the native date picker from a click anywhere in the field.
 *
 * By default a date input only opens its calendar from the small icon at the
 * right edge; clicking the rest of the control just places a caret in one of
 * the dd/mm/yyyy segments. That is a tiny target, and most people expect the
 * whole field to be clickable.
 *
 * `showPicker()` requires user activation, which a click provides. It throws
 * rather than returning a value if the browser refuses — for instance if the
 * input is hidden — so the call is guarded.
 *
 * The trade-off: while the native picker is open it owns the keyboard, so
 * clicking the field and then typing the date does not work. Both keyboard
 * routes remain — tabbing into the field types straight into the segments, and
 * Escape dismisses the picker and hands the keyboard back. Clicking to pick is
 * how most people use a date field; typing is the power-user path and is still
 * available.
 */
function openNativeDatePicker(event: MouseEvent<HTMLElement>): void {
  const input = event.currentTarget.querySelector('input');

  if (!(input instanceof HTMLInputElement) || typeof input.showPicker !== 'function') {
    return;
  }

  try {
    input.showPicker();
  } catch {
    // Some browsers refuse outside a trusted gesture. Falling back to the
    // icon is a degraded experience, not a broken one.
  }
}

export interface ArticleFormProps {
  defaultValues?: ArticleInput;
  submitLabel: string;
  /** Clear the form after a successful submit. True when creating, so the user can enter the next article. */
  resetAfterSubmit?: boolean;
  /** Throws on failure. An ApiError carrying `details` is mapped onto the fields. */
  onSubmit: (input: ArticleInput) => Promise<void>;
}

/**
 * The create/update form.
 *
 * Validation comes from `articleInputSchema` in the contracts package — the
 * exact schema the Express middleware enforces. There is no second copy of the
 * rules here to drift out of step with the server.
 *
 * Presentational: it knows nothing about RTK Query, routing or which mutation
 * it is driving. It takes default values and an async `onSubmit`, and renders
 * whatever that submission produces.
 */
export function ArticleForm({
  defaultValues = EMPTY_ARTICLE,
  submitLabel,
  resetAfterSubmit = false,
  onSubmit,
}: ArticleFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ArticleInput>({
    resolver: zodResolver(articleInputSchema),
    defaultValues,
    // Validate on blur, then keep validating as they type. Validating on the
    // first keystroke means an error appears before anyone could plausibly have
    // finished, which reads as the form arguing with you.
    mode: 'onTouched',
  });

  // Edit mode fetches its article after the first render, so the form has to
  // adopt the values when they arrive rather than only at mount.
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const submit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      await onSubmit(values);

      if (resetAfterSubmit) {
        reset(EMPTY_ARTICLE);

        // Deferred by a frame: reset schedules a re-render, and focusing in the
        // same tick targets inputs that React is about to update, so the focus
        // is discarded. The brief asks for the form to clear "so the user can
        // input the next article" — landing the caret in the first field is
        // what makes that actually continue the task rather than just empty it.
        requestAnimationFrame(() => {
          setFocus('title');
        });
      }
    } catch (error) {
      const apiError = normalizeError(error);

      // The point of the server returning `details: [{ field, message }]`:
      // a rejection lands under the input that caused it rather than as a
      // detached banner the user has to map back to a field themselves.
      if (hasFieldErrors(apiError)) {
        for (const detail of apiError.details) {
          setError(detail.field as keyof ArticleInput, { message: detail.message });
        }

        const firstInvalid = FIELD_ORDER.find((field) =>
          apiError.details.some((detail) => detail.field === field),
        );

        if (firstInvalid) {
          setFocus(firstInvalid);
        }

        return;
      }

      setFormError(apiError.message);
    }
  });

  return (
    <Box component="form" onSubmit={(event) => void submit(event)} noValidate>
      {formError ? (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          onClose={() => {
            setFormError(null);
          }}
        >
          {formError}
        </Alert>
      ) : null}

      <Stack spacing={3}>
        <TextField
          {...register('title')}
          id="article-title"
          label="Article title"
          error={Boolean(errors.title)}
          helperText={errors.title?.message ?? `Up to ${ARTICLE_FIELD_LIMITS.title} characters`}
          autoComplete="off"
          autoFocus
        />

        <TextField
          {...register('summary')}
          id="article-summary"
          label="Article summary"
          multiline
          minRows={4}
          error={Boolean(errors.summary)}
          helperText={
            errors.summary?.message ?? 'One sentence per point — each becomes a bullet in the list.'
          }
        />

        <TextField
          {...register('date')}
          id="article-date"
          label="Article date"
          type="date"
          onClick={openNativeDatePicker}
          error={Boolean(errors.date)}
          helperText={errors.date?.message ?? 'Click to pick a date, or tab in to type it.'}
          slotProps={{
            // A date input always renders a value, so the label must stay
            // shrunk or it overlaps the placeholder text.
            inputLabel: { shrink: true },
            htmlInput: {
              max: new Date().toISOString().slice(0, 10),
              // The whole control opens the picker, so a pointer is the honest
              // cursor for it rather than a text caret.
              style: { cursor: 'pointer' },
            },
          }}
        />

        <TextField
          {...register('publisher')}
          id="article-publisher"
          label="Publisher"
          error={Boolean(errors.publisher)}
          helperText={errors.publisher?.message ?? 'The masthead that published it.'}
          autoComplete="organization"
        />
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
        <Button
          type="submit"
          variant="contained"
          // Disabled only while the request is in flight. Disabling an invalid
          // form hides *why* nothing happens on click, and removes the button
          // from the tab order — submitting and being told what is wrong is
          // more useful than a control that silently refuses.
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>

        <Button component={Link} to="/articles" variant="text" disabled={isSubmitting}>
          Cancel
        </Button>
      </Stack>
    </Box>
  );
}
