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

## Supabase
The project URL and the **publishable** key are in the config block at the top of the script in `index.html`. A publishable key is meant to be used in the browser. What it can do is set by Row Level Security:

| Table | Public (publishable key) access |
|---|---|
| `outlets` | read |
| `products` | read |
| `stock_counts` | read, and update `qty_on_hand` / `reorder_level` only |

Anyone who can open the deployed site can change stock numbers. To limit that, add Supabase Auth and change the update policy to `to authenticated`.

## Deploy
1. Push this folder to GitHub.
2. In Vercel, choose **Add New → Project**, import the repo, and keep the defaults: Framework preset **Other**, no build command, and output directory set to the repo root.
3. Every push to `main` redeploys the site.

## Local preview
Open `index.html` in a browser, or run:

```bash
python3 -m http.server 8000
```
