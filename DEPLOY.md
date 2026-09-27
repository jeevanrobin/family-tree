# Deploying Anvaya Family Tree (Firebase Hosting)

The website is hosted on **Firebase Hosting** (project `anvaya-familytree`).
Data and sign-in stay on **Supabase**; Firebase only serves the built app.

After the one-time setup below, every merge into `main` goes live
automatically, and every pull request gets its own preview link.

---

## 1. Supabase: make sure the database is up to date

In the Supabase dashboard → **SQL Editor**, run any of these you have not run yet,
in order: `supabase/migrations/009` … `013`.

## 2. GitHub secrets (one time)

GitHub → repository → **Settings → Secrets and variables → Actions → New repository secret**.
Add three secrets:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (same as in your local `.env`) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon (public) key (same as in `.env`) |
| `FIREBASE_SERVICE_ACCOUNT_ANVAYA_FAMILYTREE` | See step 3 |

## 3. Firebase service account (one time)

This lets GitHub deploy to Firebase. Easiest way, on your computer:

```bash
npm install -g firebase-tools
firebase login
cd D:\Projects\family-tree
firebase init hosting:github
```

When asked:
- **Repository:** `jeevanrobin/family-tree`
- It creates the `FIREBASE_SERVICE_ACCOUNT_ANVAYA_FAMILYTREE` secret for you.
- **Set up the workflow to run a build script?** → **No** (the workflows are already in the repo)
- **Overwrite** the workflow files? → **No**

If it asks about `firebase.json`, keep the existing file (public directory `dist`,
single-page app **Yes**, do not overwrite `index.html`).

## 4. First deploy

Merge anything into `main` (or re-run the "Deploy to Firebase Hosting (live)"
workflow from the **Actions** tab). The site appears at:

- `https://anvaya-familytree.web.app`
- `https://anvaya-familytree.firebaseapp.com`

To deploy by hand from your computer instead: `npm run build && firebase deploy --only hosting`
(your local `.env` supplies the Supabase settings).

## 5. Your own domain

1. Buy the domain (e.g. Cloudflare Registrar, Namecheap or GoDaddy).
2. Firebase console → **Hosting → Add custom domain** → enter it.
3. Add the DNS records Firebase shows (TXT to verify, then A records) at your
   domain registrar. HTTPS is set up automatically, usually within an hour.

## 6. Supabase sign-in URLs (important)

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://your-domain` (or `https://anvaya-familytree.web.app` until the domain is ready)
- **Redirect URLs:** add
  - `https://your-domain/**`
  - `https://anvaya-familytree.web.app/**`
  - `http://localhost:5173/**` (keeps local development working)

Without this, sign-up confirmation and password-reset emails point to the wrong address.

## 7. Before inviting family

- Download a backup: account menu → **Data management → Export**.
- Invite members from **Family settings**; give most people **Viewer**, and only
  trusted people **Editor** (editors see private details).
