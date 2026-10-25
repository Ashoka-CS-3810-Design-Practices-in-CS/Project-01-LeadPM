# LeadsPM Delhi Metro website

This is a self-contained React website for GitHub Pages. Its validated metro
network is served as `public/metro-network.json`, and route calculations run in
the browser; no Flask server or API is needed.

## Run and test

```powershell
npm ci
npm test
npm run build
npm run preview
```

## GitHub Pages

Push the `github-pages` branch to build and deploy the site with GitHub Actions.
The workflow publishes only `website/dist`. For the Project Pages URL, configure
GitHub Pages to deploy from this workflow:
`https://ashoka-cs-3810-design-practices-in-cs.github.io/Project-01-LeadPM/`.
