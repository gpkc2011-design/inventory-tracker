# Inventory Tracker

A one-page stock tracker for a café with three outlets (Jurong, Tampines, Orchard). It reads and saves its data in Supabase.

## Features
- A tab for each outlet, with category filters (Milk, Coffee, Powders & syrups, Packaging, Bakery)
- Change the on-hand quantity and reorder level for each item, then save to Supabase
- Items at or below their reorder level are marked **Low**
- **Order from suppliers**: a combined list that tops up each Low item to 2× its reorder level across all outlets, with a Copy button

## Stack
- Plain `index.html` with no build step
- [`@supabase/supabase-js`](https://github.com/supabase/supabase-js) v2.45.4 loaded from jsDelivr
- Hosted as a static site on Vercel

## Sign-in and users
Staff sign in with a **username** and password. Behind the scenes each username maps to `<username>@stock-tracker.app` in Supabase Auth (`auth.users`); no emails are ever sent.

- New users start with a temporary password (default `password`) and **must choose their own** on first sign-in before they can see any stock.
- **Admins** get a **Users** tab to add users, reset passwords (which forces another change), change roles and remove users.
- Starting accounts: `priya` (admin), `dan` (staff) and `marcus` (staff).

## Supabase
The project URL and the **publishable** key are in the config block at the top of the script in `index.html`. A publishable key is safe to put in the browser. What it can do is set by Row Level Security:

| Table | Who can access it |
|---|---|
| `profiles` | Signed-in users read their own row; admins read all. Changes only happen through the `admin-users` function |
| `outlets`, `products` | Read by signed-in users who have set their own password |
| `stock_counts` | Read by those same users, who can also update `qty_on_hand` / `reorder_level` |

Signed-out visitors can't read anything.

Creating users needs the service role key, which must never be in the browser. So the Users tab calls the **`admin-users` Edge Function** ([source](supabase/functions/admin-users/index.ts)). It checks that the caller is a signed-in admin before doing anything.

## Deploy
1. Push this folder to GitHub.
2. In Vercel, choose **Add New → Project**, import the repo, and keep the defaults: Framework preset **Other**, no build command, and output directory set to the repo root.
3. Every push to `main` redeploys the site.

## Local preview
Open `index.html` in a browser, or run:

```bash
python3 -m http.server 8000
```
