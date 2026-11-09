#!/usr/bin/env bash
# Install or update Naqdi X (naqdix.com website + admin.naqdix.com admin panel) on this server,
# next to WappFlow. Pulls the code from GitHub, builds it and (re)starts it. Keeps .env and the database.
#
# First time:  sudo bash update.sh --install     (also installs the `naqdix-update` command)
# Afterwards:  naqdix-update
#
# Options (environment variables):
#   DOMAIN=naqdix.com                         website on DOMAIN (www. redirects), admin on admin.DOMAIN
#   REPO=https://github.com/Eslamatef1992/naqdix.git
#   BRANCH=main   PORT=4200   ADMIN_EMAIL=eslam@teknulugy.com
set -euo pipefail

DOMAIN="${DOMAIN:-$(cat /etc/naqdix-domain 2>/dev/null || true)}"; DOMAIN="${DOMAIN:-naqdix.com}"
REPO="${REPO:-https://github.com/Eslamatef1992/naqdix.git}"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-4200}"
ADMIN_EMAIL="${ADMIN_EMAIL:-eslam@teknulugy.com}"
SRC=/opt/naqdix-src
APP=/var/www/naqdix
ENV_FILE="$APP/.env"
WAPPFLOW_ENV=/var/www/wappflow/api/.env
WWW="www.$DOMAIN"; ADMIN="admin.$DOMAIN"

ok()   { printf '\033[32m✓\033[0m %s\n' "$*"; }
info() { printf '\033[36m→\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
rnd()  { head -c 64 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c "$1"; }
from_wappflow() { [ -f "$WAPPFLOW_ENV" ] && grep -E "^$1=" "$WAPPFLOW_ENV" | tail -1 | cut -d= -f2- || true; }

[ "$(id -u)" = 0 ] || die "Run as root"
for c in git node npm pm2 nginx mysql; do command -v "$c" >/dev/null || die "$c is not installed (WappFlow's installer sets these up)"; done
echo "$DOMAIN" > /etc/naqdix-domain

if [ "${1:-}" = "--install" ]; then
  install -m 755 "$(readlink -f "$0")" /usr/local/bin/naqdix-update
  ok "Installed the command: naqdix-update"
fi

# ---- code ----
if [ -d "$SRC/.git" ]; then
  git -C "$SRC" fetch -q origin "$BRANCH" || die "Could not fetch $REPO"
  git -C "$SRC" reset -q --hard "origin/$BRANCH"
else
  info "Cloning $REPO"
  git clone -q --branch "$BRANCH" "$REPO" "$SRC" || die "Could not clone $REPO. Create the repo on GitHub and push the code first."
fi
ok "naqdix at $(git -C "$SRC" log -1 --format='%h %s' | cut -c1-70)"
install -m 755 "$SRC/deploy/update.sh" /usr/local/bin/naqdix-update 2>/dev/null || true

# ---- safety checks: never take over another site or port ----
for d in "$DOMAIN" "$WWW" "$ADMIN"; do
  hits=$(grep -rlsE "server_name[^;]*[[:space:]]$d([[:space:]]|;)" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | grep -v '/naqdix' || true)
  [ -z "$hits" ] || die "$d is already used by another Nginx site: $hits"
done
if ss -ltn 2>/dev/null | grep -q ":$PORT "; then
  pm2 describe naqdix >/dev/null 2>&1 || die "Port $PORT is already used by another program. Run again with PORT=another-port."
fi
ok "Domains and port $PORT are free"

# ---- files ----
mkdir -p "$APP"
tar -C "$SRC" --exclude=.git --exclude=node_modules --exclude=dist --exclude=data -cf - . | tar -C "$APP" -xf -

# ---- settings (.env is created once, then kept) ----
if [ ! -f "$ENV_FILE" ]; then
  info "Creating the database and settings"
  DB_PASS=$(rnd 32)
  MYSQL=(mysql); [ -n "${MYSQL_ROOT_PASSWORD:-}" ] && MYSQL=(mysql -uroot "-p$MYSQL_ROOT_PASSWORD")
  "${MYSQL[@]}" -e "CREATE DATABASE IF NOT EXISTS naqdix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE USER IF NOT EXISTS 'naqdix'@'localhost' IDENTIFIED BY '$DB_PASS';
    ALTER USER 'naqdix'@'localhost' IDENTIFIED BY '$DB_PASS';
    GRANT ALL PRIVILEGES ON naqdix.* TO 'naqdix'@'localhost'; FLUSH PRIVILEGES;" || die "Could not create the MySQL database (set MYSQL_ROOT_PASSWORD if root needs a password)"
  MG_DOMAIN=$(from_wappflow MAILGUN_DOMAIN)
  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=$PORT
SITE_URL=https://$DOMAIN
ADMIN_URL=https://$ADMIN
JWT_SECRET=$(rnd 48)

DB_CLIENT=mysql2
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=naqdix
DB_PASSWORD=$DB_PASS
DB_NAME=naqdix

# PayPal (copied from WappFlow; checkout shows "Naqdi X"). card,paypal = both buttons
PAYPAL_CLIENT_ID=$(from_wappflow PAYPAL_CLIENT_ID)
PAYPAL_SECRET=$(from_wappflow PAYPAL_SECRET)
PAYPAL_MODE=$(from_wappflow PAYPAL_MODE)
PAYPAL_CURRENCY=USD
PAYPAL_FX_RATE=$(from_wappflow PAYPAL_FX_RATE)
PAYMENT_METHODS=card,paypal

# Mailgun (copied from WappFlow; leave the key empty to send no emails)
MAILGUN_API_KEY=$(from_wappflow MAILGUN_API_KEY)
MAILGUN_DOMAIN=$MG_DOMAIN
MAILGUN_REGION=$(from_wappflow MAILGUN_REGION)
MAILGUN_FROM="Naqdi X <noreply@${MG_DOMAIN:-$DOMAIN}>"
SUPPORT_EMAIL=support@$DOMAIN
# gets an email for every paid order and demo request
NOTIFY_EMAIL=$ADMIN_EMAIL
EOF
  sed -i 's/^PAYPAL_FX_RATE=$/PAYPAL_FX_RATE=3.26/; s/^PAYPAL_MODE=$/PAYPAL_MODE=sandbox/; s/^MAILGUN_REGION=$/MAILGUN_REGION=us/' "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  ok "Settings created ($ENV_FILE). PayPal and Mailgun keys were copied from WappFlow."
else
  sed -i "s|^SITE_URL=.*|SITE_URL=https://$DOMAIN|; s|^ADMIN_URL=.*|ADMIN_URL=https://$ADMIN|" "$ENV_FILE"
  ok "Keeping existing settings ($ENV_FILE)"
fi

# ---- build ----
info "Installing and building"
(cd "$APP" && npm ci --no-audit --no-fund --loglevel=error && npm run build --silent) >/tmp/naqdix-build.log 2>&1 \
  || { tail -30 /tmp/naqdix-build.log; die "Build failed (log: /tmp/naqdix-build.log)"; }
ok "Built"

# ---- first admin login ----
cd "$APP"
if ! node --input-type=module -e "import('./server/db.js').then(async ({db,migrate})=>{await migrate();const n=(await db('admins').count({c:'*'}).first()).c;await db.destroy();process.exit(+n>0?0:1)})" 2>/dev/null; then
  node server/scripts/create-admin.js "$ADMIN_EMAIL" "Eslam" > /root/naqdix-admin-login.txt
  chmod 600 /root/naqdix-admin-login.txt
  NEW_LOGIN=1
  ok "Admin login created (saved in /root/naqdix-admin-login.txt)"
fi

# ---- start ----
if pm2 describe naqdix >/dev/null 2>&1; then pm2 reload naqdix --update-env >/dev/null; else pm2 start server/index.js --name naqdix --cwd "$APP" >/dev/null; fi
pm2 save >/dev/null
for i in $(seq 1 20); do curl -fs "http://127.0.0.1:$PORT/health" >/dev/null && break; sleep 1; done
curl -fs "http://127.0.0.1:$PORT/health" >/dev/null || { pm2 logs naqdix --lines 30 --nostream; die "Naqdi X did not start"; }
ok "Running on 127.0.0.1:$PORT (pm2: naqdix)"

# ---- nginx ----
NGX_AVAIL=/etc/nginx/sites-available; NGX_EN=/etc/nginx/sites-enabled
[ -d "$NGX_AVAIL" ] || { NGX_AVAIL=/etc/nginx/conf.d; NGX_EN=""; }
proxy="location / { proxy_pass http://127.0.0.1:$PORT; proxy_http_version 1.1; proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; client_max_body_size 5m; }"
write_site() {
  local name=$1 body=$2 file="$NGX_AVAIL/naqdix-$1.conf"
  if [ -f "$file" ] && grep -q "managed by Certbot" "$file" && grep -q "$3" "$file"; then ok "naqdix-$name.conf already has SSL; left as is"; return; fi
  printf '%s\n' "$body" > "$file"
  [ -n "$NGX_EN" ] && ln -sf "$file" "$NGX_EN/naqdix-$name.conf"
}
write_site web "server { listen 80; server_name $DOMAIN; $proxy }" "$DOMAIN"
write_site www "server { listen 80; server_name $WWW; location / { return 301 https://$DOMAIN\$request_uri; } }" "$WWW"
write_site admin "server { listen 80; server_name $ADMIN; $proxy }" "$ADMIN"
nginx -t >/dev/null 2>&1 || { nginx -t; die "Nginx configuration error"; }
systemctl reload nginx
ok "Nginx sites written"

# ---- SSL ----
IP=$(curl -fs4 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
for d in "$DOMAIN" "$WWW" "$ADMIN"; do
  dns=$(getent ahostsv4 "$d" 2>/dev/null | awk 'NR==1{print $1}' || true)
  if [ "$dns" != "$IP" ]; then warn "$d does not point to this server yet (DNS: ${dns:-none}, server: $IP). Add an A record, then run naqdix-update again."; continue; fi
  case "$d" in "$DOMAIN") f=web ;; "$WWW") f=www ;; *) f=admin ;; esac
  if grep -q "ssl_certificate" "$NGX_AVAIL/naqdix-$f.conf" 2>/dev/null; then ok "SSL for $d"; continue; fi
  certbot --nginx --non-interactive --agree-tos -m "$ADMIN_EMAIL" --redirect --cert-name "$d" -d "$d" >/tmp/naqdix-certbot.log 2>&1 && ok "SSL for $d" || warn "SSL for $d failed (log: /tmp/naqdix-certbot.log)"
done

echo
echo "──────────────────────────── Naqdi X is installed ────────────────────────────"
echo " Website      https://$DOMAIN"
echo " Admin        https://$ADMIN/admin"
[ -n "${NEW_LOGIN:-}" ] && sed 's/^/ /' /root/naqdix-admin-login.txt
echo
echo " PayPal → Webhooks (optional backup)"
echo "   URL        https://$DOMAIN/api/paypal/webhook   events: Checkout order approved, Payment capture completed"
echo " Settings     $ENV_FILE   (after editing: pm2 reload naqdix --update-env)"
echo " Update later push to GitHub, then run: naqdix-update"
echo "───────────────────────────────────────────────────────────────────────────────"
