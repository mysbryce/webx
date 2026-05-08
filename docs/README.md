# WebX 5M Documentation

![WebX 5M logo](public/webx-logo.svg)

This is the documentation site for WebX 5M. It is built with Next.js and Fumadocs, and the content lives in `content/docs`.

## Development

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Type Check

```bash
npm run types:check
```

This generates Fumadocs MDX files, generates Next.js route types, and runs TypeScript with `--noEmit`.

## Build

```bash
npm run build
```

## Important Files

- `content/docs`: MDX documentation pages
- `app/docs`: Fumadocs documentation routes
- `app/(home)`: Landing page route
- `components/mdx.tsx`: MDX component mapping
- `lib/source.ts`: Fumadocs content source
- `source.config.ts`: Fumadocs MDX collection config
- `public/fonts`: Local LINE Seed Sans TH fonts used by the site

## Style

The documentation site uses a black and white visual direction and local fonts from `public/fonts`.
