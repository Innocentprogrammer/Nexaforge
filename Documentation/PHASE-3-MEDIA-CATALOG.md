# Phase 3 – Media Management and Catalogue Completion

## Included

- Authenticated, user-scoped media upload/list/delete API.
- JPEG, PNG and WebP validation; 10 MB maximum upload; 8000 × 8000 maximum dimensions.
- Media metadata (MIME type, byte size, dimensions) and per-user storage paths.
- Invitation editor image upload, preview and removal; image URL is stored in `invitation_json`.
- Starter invitation-card catalogue across Wedding, Birthday, Anniversary, Corporate, Religious and Baby Shower categories.
- NexaForge product-suite catalogue with populated descriptions, features, target audiences and highlights.
- Generic product detail route for products other than the existing dedicated NexaInvite page.
- Product and media API tests.

## Apply changes

From `backend/`:

```bash
python manage.py migrate
python manage.py seed_catalog
python manage.py check
python manage.py test media_manager products templates_app
```

The catalogue now contains 20 invitation cards (the original eight plus twelve extended designs) and ten product records. The original eight card designs are restored by a non-destructive data migration. The newer anniversary card is named “Golden Anniversary Modern” so it cannot overwrite the original “Golden Anniversary”. Original descriptions for the five products that existed in the first database are retained in `legacy_tagline` and `legacy_description`, and are visible on the product detail page when they differ from current copy. Seed commands are safe to rerun; existing template records are not overwritten, and product legacy copy is retained.

## API

- `GET /api/v1/media/` – list the authenticated user's uploads.
- `POST /api/v1/media/` – upload multipart fields `file` and optional `title`.
- `GET /api/v1/media/{uuid}/` – retrieve one owned asset.
- `DELETE /api/v1/media/{uuid}/` – delete one owned asset.
- `GET /api/v1/templates/` – public invitation card gallery.
- `GET /api/v1/products/` – public NexaForge product catalogue.
- `GET /api/v1/products/{slug}/` – public product detail.

## UI routes

- `/templates` – invitation card gallery.
- `/products` – NexaForge product suite.
- `/products/{slug}` – product details (existing `/products/nexainvite` page remains intact).
- `/invitations/{id}/edit` – upload or remove a personal image in the invitation editor.

## Storage note

Local development uses Django's configured `MEDIA_ROOT`. Production should configure a private object-storage bucket and a CDN, with access rules and lifecycle policies. This phase intentionally does not hard-code AWS credentials or claim S3 is configured.

## Validation status in the build workspace

- Python `compileall` passed for backend source.
- TypeScript/TSX transpilation syntax check passed for all 42 frontend source files.
- Django runtime tests and migration execution were not run in this workspace because the pinned Python dependencies were not available offline.
- Full Next.js type-check/build was not run because frontend npm packages were not available offline.
