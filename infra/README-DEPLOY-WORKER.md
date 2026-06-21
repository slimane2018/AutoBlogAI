Docker deployment & Railway/Render/Fly deployment notes

This document explains how to run and deploy the worker using the provided Dockerfile and a few hosting options (Railway, Render, Fly.io). The Dockerfile includes libvips so sharp works out-of-the-box.

Files added
- apps/worker/Dockerfile  - Dockerfile that installs libvips and builds the TypeScript worker
- docker-compose.worker.yml - Example docker-compose for local development (Redis + Postgres + Worker)

Before you deploy
- Ensure environment variables are set (see .env.example). Critical ones for the worker:
  - DATABASE_URL
  - REDIS_URL
  - OPENAI_API_KEY
  - WP_ENCRYPTION_KEY
  - NEXTAUTH_SECRET

Local development with Docker Compose
1. Copy .env.example -> .env and fill values, or set envs in your shell.
2. Start services:
   docker compose -f docker-compose.worker.yml up --build
3. The worker will run and connect to Redis/Postgres in the compose network.

Deploying to Railway (recommended quick flow)
Railway supports deploying services with a Dockerfile directly from your repo.

1. In Railway dashboard create a new Project.
2. Click "Deploy from GitHub" and connect your repository.
3. When prompted for the service to deploy, choose the worker path and specify the Dockerfile path: apps/worker/Dockerfile
4. Add the required environment variables in the Railway project settings (DATABASE_URL, REDIS_URL, OPENAI_API_KEY, WP_ENCRYPTION_KEY, NEXTAUTH_SECRET, etc.).
   - For Redis, add a Redis plugin in Railway and use the provided REDIS_URL.
   - For Postgres, add the PostgreSQL plugin and use its DATABASE_URL.
5. Railway will build the Dockerfile and run the container. Check logs in the Railway UI.

Notes for Railway
- Railway build environment will run npm ci and build the project; ensure your package.json contains the build script (apps/worker/package.json has "build").
- If your build needs extra time or memory, use the Railway settings to increase build resources.

Deploying to Render
1. Create a new "Private Service" on Render.
2. Connect the GitHub repo, choose the branch and set the Build Command to:
   - docker build -t worker -f apps/worker/Dockerfile .
   - (Render can also detect Dockerfile automatically)
3. Set Start Command to: docker run worker
4. Add Environment variables in Render dashboard.

Deploying to Fly.io
1. Install flyctl and run: flyctl launch
2. When prompted, choose to deploy a custom Dockerfile and point to apps/worker/Dockerfile.
3. Add secrets via: flyctl secrets set DATABASE_URL=... REDIS_URL=... OPENAI_API_KEY=... WP_ENCRYPTION_KEY=...
4. Deploy with: flyctl deploy

CI/CD notes (GitHub Actions)
- You can add a GitHub Actions workflow to build and push the worker image to Docker Hub or GitHub Container Registry and then deploy via Railway/Render/Fly APIs.

Troubleshooting
- Sharp/libvips installation errors: ensure the base image includes the required build deps. The Dockerfile above installs libvips-dev and build-essential to compile any native modules.
- Prisma client: the Dockerfile runs `npx prisma generate` during the build stage. If your prisma schema is in a different path or you need migrations to run on startup, ensure the DATABASE_URL is set or run `npx prisma migrate deploy` in your deploy pipeline.

Security
- Keep WP_ENCRYPTION_KEY and OPENAI_API_KEY secret (Railway/Render/Fly secret managers).
- Do not store secrets in your repo or Docker images.

If you want, I can also:
- Add a GitHub Actions workflow that builds the image and deploys to a registry or calls Railway's Deploy API.
- Create a Fly.toml example or Render service YAML file for one-click deploy.
