# Naqdi X

Website (naqdix.com) and admin panel (admin.naqdix.com) for Naqdi X point of sale solutions.

- POS plans, monthly or yearly, paid by Visa / Mastercard or PayPal (checkout shows "Naqdi X").
- Android POS app, one full payment. After paying, the customer gets a serial activation code
  (on screen and by email) and sends it to the Naqdi X team to activate the app.
- Admin panel: orders, serial codes (activate / revoke / issue by hand), products and prices, demo requests, contact settings.
- English and Arabic.

## Server (same server as WappFlow)

1. Point `naqdix.com`, `www.naqdix.com` and `admin.naqdix.com` (A records) to the server.
2. Push this repo to `github.com/Eslamatef1992/naqdix`.
3. On the server, once:
   ```
   curl -fsSL https://raw.githubusercontent.com/Eslamatef1992/naqdix/main/deploy/update.sh -o /tmp/naqdix-update.sh
   sudo bash /tmp/naqdix-update.sh --install
   ```
4. After that, push changes to GitHub and run `naqdix-update` on the server.

Settings live in `/var/www/naqdix/.env` (PayPal and Mailgun keys are copied from WappFlow on the first install).
After editing: `pm2 reload naqdix --update-env`.

Reset the admin password: `cd /var/www/naqdix && node server/scripts/create-admin.js you@example.com "Name"`.

## Development

```
npm install
npm run dev        # API + built site on :4200 (uses SQLite in ./data)
npm run dev:web    # Vite dev server on :5300 (proxies /api)
npm test
```
