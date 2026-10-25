# LeadsPM Delhi Metro website

This is the React and TypeScript frontend for the Flask-backed Delhi Metro route
planner. In the deployed app it loads the validated network from Flask's
`GET /api/network` endpoint and submits route requests to `POST /api/routes`.
The browser validates both responses with Zod; Python owns route calculation.

## Run and test

```powershell
npm ci
npm test
npm run build
npm run preview
```

## Development

Start Flask on port 5000, then run `npm run dev`. Vite on port 5173 proxies
`/api` requests to Flask. The production build is served by Flask locally and
copied into the repository root `public/` directory by Vercel's `build.py`.

The existing GitHub Pages branch remains available as its own static deployment;
this Vercel project uses the Flask-backed application source at the repository
root.
