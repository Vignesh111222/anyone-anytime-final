# Anyone Anytime — Supabase version

## What changed

- The customer/seller frontend remains in the same project.
- `server.py` now uses Supabase instead of SQLite.
- Order creation uses a PostgreSQL function so stock checks are atomic.
- Delivery stock updates are also handled atomically.
- The Python server uses threads so multiple customer requests can be handled concurrently.
- The existing `database.db` is kept as a backup.

## Supabase setup

1. Open your Supabase project.
2. Open **SQL Editor**.
3. Run all of `supabase_setup.sql`.
4. Keep your Supabase secret key private.

## Environment variables

The backend needs:

`SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co`

`SUPABASE_SECRET_KEY=YOUR_PRIVATE_SECRET_KEY`

Optional:

`SELLER_PASSWORD=choose-a-new-seller-password`

`PORT=8000`

Do not put `SUPABASE_SECRET_KEY` in HTML, JavaScript, GitHub, or the browser.

## Existing local data

If you want the products/orders currently in `database.db` copied into Supabase:

1. Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
2. Run:

`python migrate_sqlite_to_supabase.py`

Run it only once for the existing data.

## Local test

From this project folder:

`python server.py`

Then open:

`http://localhost:8000`

## Production

Deploy this Python project to your chosen Python host.

After you know the deployed backend URL, change `BACKEND_URL` in `js/config.js` from:

`https://YOUR-APP-NAME.onrender.com`

to your real backend URL.

Then the frontend can be deployed as a static website.

## Seller login

The old default password is still supported as a fallback for testing (`admin123`).
For public deployment, set `SELLER_PASSWORD` to a new value.
