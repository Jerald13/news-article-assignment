import { createTheme } from '@mui/material/styles';

/**
 * Design tokens read off `sample-display-page-design.png`.
 *
 * The point of naming them is that the sample is a specification, not a
 * suggestion — and a themed MUI app should look like *that* design rather than
 * like stock Material.
 */
const tokens = {
  /** Page canvas: the pale grey the white cards sit on. */
  canvas: '#f4f6f8',
  surface: '#ffffff',
  /** The teal of the "N ARTICLES FOUND" header and the pagination controls. */
  accent: '#00838f',
  accentDark: '#006064',
  headline: '#1f2933',
  body: '#3e4c59',
  /** Uppercase publisher/date micro-text. Dark enough to clear 4.5:1 on white. */
  muted: '#616e7c',
  hairline: '#e4e7eb',
  danger: '#b3261e',
} as const;

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: tokens.accent, dark: tokens.accentDark, contrastText: '#ffffff' },
    error: { main: tokens.danger },
    background: { default: tokens.canvas, paper: tokens.surface },
    text: { primary: tokens.headline, secondary: tokens.muted },
    divider: tokens.hairline,
  },

  // The sample uses square corners throughout — no rounded cards.
  shape: { borderRadius: 2 },

  typography: {
    fontFamily: [
      '"Segoe UI"',
      'system-ui',
      '-apple-system',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),

    // Headlines in the sample are large but *regular* weight, not bold. That
    // restraint is most of why the design reads as editorial rather than
    // dashboard-like.
    h1: { fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.01em' },
    h2: { fontSize: '1.5rem', fontWeight: 400, lineHeight: 1.3, color: tokens.headline },
    h3: { fontSize: '1.125rem', fontWeight: 600 },

    body1: { fontSize: '0.9375rem', lineHeight: 1.6, color: tokens.body },
    body2: { fontSize: '0.875rem', lineHeight: 1.55, color: tokens.body },

    // The `SAIGON TIMES  YESTERDAY` micro-text.
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: tokens.muted,
      lineHeight: 1.6,
    },

    button: { textTransform: 'none', fontWeight: 600 },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: tokens.canvas },
        // Never remove focus outlines; make them unmistakable instead.
        ':focus-visible': {
          outline: `2px solid ${tokens.accent}`,
          outlineOffset: '2px',
        },
      },
    },

    // Flat surfaces separated by the canvas colour, as in the sample — not
    // floating cards with drop shadows.
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
    },

    MuiTextField: {
      defaultProps: { variant: 'outlined', fullWidth: true },
    },

    MuiFormHelperText: {
      styleOverrides: {
        // Validation messages sit directly under their input, aligned with it.
        root: { marginLeft: 0, marginRight: 0 },
      },
    },
  },
});
