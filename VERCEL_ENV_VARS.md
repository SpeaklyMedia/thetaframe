# Vercel Environment Variables

Set these in the Vercel project dashboard before your first deploy (Settings → Environment Variables).
All variables should be set for the **Production** environment. Adjust staging/preview as needed.

## Required

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. Use the external URL from Replit or a Vercel Postgres / Neon database. |
| `CLERK_SECRET_KEY` | Clerk server secret. Found in the Clerk dashboard under API Keys. |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key. Found in the Clerk dashboard under API Keys. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Same value as `CLERK_PUBLISHABLE_KEY`. Prefixed `VITE_` so Vite injects it into the frontend bundle. |
| `VITE_CLERK_PROXY_URL` | Full URL to the Clerk proxy endpoint on your Vercel domain. Example: `https://your-app.vercel.app/api/__clerk`. Set this in the Clerk dashboard under Domains too. |
| `NODE_ENV` | Set to `production`. |

## Google Cloud Storage (for REACH file uploads)

| Variable | Description |
| --- | --- |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Base-64-encoded GCS service account JSON key. Create a service account in Google Cloud Console with Storage Object Admin on the bucket, download the JSON key, then run `base64 -w0 key.json` to encode it. |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Your GCS bucket name (same value as used in Replit Object Storage). |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Comma-separated GCS paths for public objects, e.g. `/your-bucket/public`. |
| `PRIVATE_OBJECT_DIR` | GCS path prefix for private uploaded files, e.g. `/your-bucket/private`. |

## Optional

| Variable | Description |
| --- | --- |
| `ALLOWED_ORIGINS` | Comma-separated list of additional CORS origins. Set to your production domain if using a custom domain, e.g. `https://thetaframe.app`. `*.vercel.app` origins are allowed automatically. |
| `LOG_LEVEL` | Logging verbosity for the API server. Defaults to `info`. |
| `OPENAI_API_KEY` | Required for `C28` Baby-4 assignment suggestion generation. Server-side API key used for the Baby suggestion draft runtime. |
| `OPENAI_MODEL` | Optional model override for `C28` Baby-4 suggestions. Defaults to `gpt-4o-mini`. |
| `OPENAI_BASE_URL` | Optional base URL override for compatible provider routing. Defaults to `https://api.openai.com/v1`. |

## Notes

- **Clerk proxy**: After setting `VITE_CLERK_PROXY_URL`, go to the Clerk dashboard → Domains and add your Vercel domain as a production domain. Set the proxy URL there too so Clerk knows to route through your API.
- **Database**: The Replit-provisioned PostgreSQL has an external connection URL. You can find it in the Replit Secrets panel as `DATABASE_URL`. Use that string in Vercel, or provision a new Neon/Vercel Postgres database and migrate your schema with `pnpm --filter @workspace/db run push`.
- **REACH storage**: If you do not configure the GCS variables, the REACH module will still load but file uploads and downloads will fail with a configuration error. All other modules are unaffected.
