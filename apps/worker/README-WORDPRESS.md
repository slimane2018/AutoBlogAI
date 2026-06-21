# WordPress integration notes

This folder contains the web UI and API for connecting WordPress sites, and worker helpers to publish articles and upload media.

- Web UI: apps/web/src/pages/websites/index.tsx
- API: apps/web/src/pages/api/websites/connect.ts
- Worker services: apps/worker/src/services/wordpress.ts

How it works

1. User POSTs siteUrl, username, applicationPassword to /api/websites/connect.
2. Server verifies by calling /wp-json/wp/v2/users/me with Basic Auth.
3. If verified, the applicationPassword is encrypted and stored in the Website model.
4. Publishing: enqueue a publish:article job (via /api/articles/publish) which the worker will process.
5. Worker uploads featured image (if available) and POSTs the article to /wp-json/wp/v2/posts.

Security

- applicationPassword is encrypted at rest using WP_ENCRYPTION_KEY. Ensure the same key is available to both web and worker.
- Use a dedicated WP account with an Application Password scoped to posts/media.
