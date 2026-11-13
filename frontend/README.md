This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Design system

The UI is macOS-inspired: layered surfaces, an 8px spacing rhythm, a 10/14/18px
radius scale, very soft navy-tinted shadows, and one spring easing shared by
every transition. Brand hues are unchanged (Brand Guidelines §12).

- **Tokens** live in `src/app/globals.css`. `--canvas` is the window behind
  everything, `--background` a surface on it, `--background-subtle` a tinted
  band, `--surface-2` a hover/pressed surface. Every token has a dark value
  under both `prefers-color-scheme` and an explicit `[data-theme]`, so a theme
  toggle needs no CSS work — set `data-theme="dark"` on `<html>`.
- **Primitives** are in `src/components/ui/`: `button` (variants + 32/36/44px
  sizes), `input` (Label/Input/Textarea/Select/FileInput/Hint/FieldError, all
  36px), `card` (Card/CardHeader/Badge/StatCard/Divider), `alert`, `toast`,
  `skeleton`, `empty-state`, `segmented`, `page-header`, `icon`.
- **Icons** come only from `src/components/ui/icon.tsx` — one 24×24 grid, 1.75
  stroke, sizes 13/14/16/18/20/24. Don't mix in another set or typographic
  glyphs.
- **Brand mark**: `src/components/logo.tsx` — `<Logo />` (N mark + live-text
  "Nexa**Forge**" wordmark, theme-aware) and `<LogoMark />` (mark only). The
  mark image is `public/brand/nexaforge-mark.png`; favicons are `src/app/favicon.ico`,
  `icon.png` and `apple-icon.png` (picked up by Next.js file conventions).
- **Tables** use the shared `.data-table` class (sticky header, row hover).
- **Motion**: `--ease-spring` / `--ease-out-soft` with 120/200/320ms durations.
  Everything decorative is disabled under `prefers-reduced-motion`.

Inline `Alert`s are for messages a user must be able to re-read; `useToast()` is
for transient confirmations only.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
