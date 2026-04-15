# Deploy admin-panel on Vercel

Use these settings in Vercel for the **admin** project:

- **Root Directory**: `admin-panel`
- **Framework**: `Next.js`
- **Install Command**: `npm install`
- **Build Command**: `npm run build`

After deploy, open:

- `/admin` for the admin panel
- `/login` for login page

## Important: avoid 401/404 on admin URLs

If `/admin` or `/admin/login` show `401`/`404` on Vercel, check these first:

1. **Deployment Protection**  
   In Vercel project settings, disable `Vercel Authentication` for **Production**
   (you can keep it enabled for Preview deployments).

2. **Correct deployment hostname**  
   Use the active deployment URL (for example the current project URL with
   `...lqbav...vercel.app`). A typo in the hostname (like `...lgbav...`) will
   return `DEPLOYMENT_NOT_FOUND`.

If you get `404: NOT_FOUND` from Vercel, the project is almost always connected to the wrong root directory.

