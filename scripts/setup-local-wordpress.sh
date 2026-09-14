#!/usr/bin/env bash
#
# Sets up a throwaway local WordPress + WooCommerce site to develop and test
# the course-platform-bridge integration against, with NO Docker, MySQL, or
# admin/root privileges required:
#
#   - Downloads a portable PHP build and runs it with its own built-in
#     server (no system-wide install).
#   - Runs WordPress on SQLite (via the official "SQLite Database
#     Integration" plugin) instead of MySQL.
#   - Installs WooCommerce and this repo's course-platform-bridge plugin.
#   - Creates demo WordPress users and WooCommerce products matching
#     prisma/seed.ts, plus a couple of completed test orders so the demo
#     accounts already have purchased-course access.
#
# Safe to re-run: every step is idempotent (skips work that's already done).
#
# Requires: bash, curl, unzip, node (for generating random secrets).
# Tested on Windows/Git Bash. On Linux/macOS this should work unchanged,
# except the PHP download URL below is Windows-specific -- swap in your
# system PHP (`which php`) and skip the "Download PHP" step if you're not
# on Windows.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_DIR="$REPO_ROOT/.wordpress-dev"
PHP_DIR="$DEV_DIR/php"
SITE_DIR="$DEV_DIR/site"
WP_PORT="${WP_PORT:-8090}"
NEXTJS_URL="${NEXTJS_URL:-http://localhost:3010}"

PHP_VERSION="8.3.33"
PHP_ZIP_URL="https://windows.php.net/downloads/releases/php-${PHP_VERSION}-nts-Win32-vs16-x64.zip"

mkdir -p "$DEV_DIR"
cd "$DEV_DIR"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

# ---------------------------------------------------------------------------
# 1. PHP (portable, no install)
# ---------------------------------------------------------------------------
if [ ! -x "$PHP_DIR/php.exe" ] && [ ! -x "$(command -v php || true)" ]; then
  log "Downloading portable PHP ${PHP_VERSION}..."
  curl -fsSL -o php.zip "$PHP_ZIP_URL"
  mkdir -p "$PHP_DIR"
  unzip -q -o php.zip -d "$PHP_DIR"
  rm php.zip
fi

if [ -x "$PHP_DIR/php.exe" ]; then
  PHP_BIN="$PHP_DIR/php.exe"
  PHP_WIN_DIR="$(cygpath -w "$PHP_DIR" 2>/dev/null || echo "$PHP_DIR")"

  if [ ! -f "$PHP_DIR/php.ini" ]; then
    log "Configuring php.ini..."
    cp "$PHP_DIR/php.ini-development" "$PHP_DIR/php.ini"
    for ext in curl fileinfo gd mbstring exif mysqli openssl pdo_mysql pdo_sqlite sqlite3 zip; do
      sed -i "s/^;extension=${ext}\$/extension=${ext}/" "$PHP_DIR/php.ini"
    done
    ESCAPED_DIR=$(printf '%s' "${PHP_WIN_DIR//\\/\/}/ext" | sed 's/[&/]/\\&/g')
    sed -i "s/^;extension_dir = \"ext\"\$/extension_dir = \"${ESCAPED_DIR}\"/" "$PHP_DIR/php.ini"
  fi
else
  PHP_BIN="php"
fi

"$PHP_BIN" -v

# ---------------------------------------------------------------------------
# 2. WordPress core + WooCommerce + SQLite integration + WP-CLI
# ---------------------------------------------------------------------------
if [ ! -f "$DEV_DIR/wp-cli.phar" ]; then
  log "Downloading WP-CLI..."
  curl -fsSL -o "$DEV_DIR/wp-cli.phar" "https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar"
fi
# An array, not a plain string: several of these paths (the repo directory
# itself included) contain spaces, and a string would word-split wrongly
# when later expanded unquoted as "${WP[@]}" core install ...
WP=("$PHP_BIN" "$DEV_DIR/wp-cli.phar" "--path=$SITE_DIR")

if [ ! -f "$SITE_DIR/wp-config.php" ]; then
  log "Downloading WordPress, WooCommerce, and the SQLite integration plugin..."
  mkdir -p "$DEV_DIR/src"
  cd "$DEV_DIR/src"
  [ -f wordpress.zip ] || curl -fsSL -o wordpress.zip "https://wordpress.org/latest.zip"
  [ -f woocommerce.zip ] || curl -fsSL -o woocommerce.zip "https://downloads.wordpress.org/plugin/woocommerce.latest-stable.zip"
  [ -f sqlite-db.zip ] || curl -fsSL -o sqlite-db.zip "https://downloads.wordpress.org/plugin/sqlite-database-integration.zip"

  log "Assembling the site..."
  rm -rf "$DEV_DIR/extract" "$SITE_DIR"
  unzip -q -o wordpress.zip -d "$DEV_DIR/extract"
  # mv (a same-volume rename) instead of cp -r: WordPress core is ~4000
  # small files, and Git Bash's cp -r is slow enough on Windows for that to
  # take many minutes; mv is instant since it doesn't touch file contents.
  mv "$DEV_DIR/extract/wordpress" "$SITE_DIR"
  rm -rf "$DEV_DIR/extract"
  unzip -q -o woocommerce.zip -d "$SITE_DIR/wp-content/plugins"
  unzip -q -o sqlite-db.zip -d "$SITE_DIR/wp-content/plugins"
  cp "$SITE_DIR/wp-content/plugins/sqlite-database-integration/db.copy" "$SITE_DIR/wp-content/db.php"
  cd "$DEV_DIR"

  log "Generating secrets and writing wp-config.php..."
  SALTS=$(curl -fsSL "https://api.wordpress.org/secret-key/1.1/salt/")
  API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

  cat > "$SITE_DIR/wp-config.php" <<PHP_EOF
<?php
define( 'DB_NAME', 'wordpress' );
define( 'DB_USER', 'unused' );
define( 'DB_PASSWORD', 'unused' );
define( 'DB_HOST', 'localhost' );
define( 'DB_CHARSET', 'utf8mb4' );
define( 'DB_COLLATE', '' );

${SALTS}

\$table_prefix = 'wp_';

define( 'WP_DEBUG', true );
define( 'WP_DEBUG_LOG', true );
define( 'WP_DEBUG_DISPLAY', false );

define( 'WP_HOME', 'http://localhost:${WP_PORT}' );
define( 'WP_SITEURL', 'http://localhost:${WP_PORT}' );

define( 'COURSE_PLATFORM_BRIDGE_API_KEY', '${API_KEY}' );
define( 'COURSE_PLATFORM_BRIDGE_WEBHOOK_SECRET', '${WEBHOOK_SECRET}' );
define( 'COURSE_PLATFORM_BRIDGE_NEXTJS_URL', '${NEXTJS_URL}' );

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

require_once ABSPATH . 'wp-settings.php';
PHP_EOF

  cat > "$SITE_DIR/router.php" <<'PHP_EOF'
<?php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . $path;
if ($path !== '/' && file_exists($file) && !is_dir($file)) {
    return false;
}
$_SERVER['SCRIPT_FILENAME'] = __DIR__ . '/index.php';
$_SERVER['SCRIPT_NAME'] = '/index.php';
require __DIR__ . '/index.php';
PHP_EOF

  log "Installing WordPress..."
  "${WP[@]}" core install \
    --url="http://localhost:${WP_PORT}" \
    --title="Parrot LMS Store" \
    --admin_user="admin" \
    --admin_password="AdminPass123!" \
    --admin_email="wpadmin@parrot.dev" \
    --skip-email

  "${WP[@]}" plugin activate sqlite-database-integration
  "${WP[@]}" plugin activate woocommerce
  "${WP[@]}" rewrite structure '/%postname%/' --hard
  "${WP[@]}" rewrite flush --hard
  "${WP[@]}" option update woocommerce_currency USD
  "${WP[@]}" option update woocommerce_store_address "1 Market St"
  "${WP[@]}" option update woocommerce_store_city "San Francisco"
  "${WP[@]}" option update woocommerce_store_postcode "94105"

  echo ""
  echo "WORDPRESS_URL=\"http://127.0.0.1:${WP_PORT}\""
  echo "WORDPRESS_BRIDGE_API_KEY=\"${API_KEY}\""
  echo "WORDPRESS_BRIDGE_WEBHOOK_SECRET=\"${WEBHOOK_SECRET}\""
  echo ""
  echo "^ Add these three lines to .env (or let this script append them -- see below)."

  ENV_FILE="$REPO_ROOT/.env"
  if [ -f "$ENV_FILE" ] && ! grep -q "WORDPRESS_BRIDGE_API_KEY" "$ENV_FILE"; then
    log "Appending WordPress bridge config to .env..."
    {
      echo ""
      echo "WORDPRESS_URL=\"http://127.0.0.1:${WP_PORT}\""
      echo "WORDPRESS_BRIDGE_API_KEY=\"${API_KEY}\""
      echo "WORDPRESS_BRIDGE_WEBHOOK_SECRET=\"${WEBHOOK_SECRET}\""
    } >> "$ENV_FILE"
  fi
else
  log "WordPress already installed at $SITE_DIR -- skipping install."
fi

# ---------------------------------------------------------------------------
# 3. course-platform-bridge plugin (this repo's plugin, copied in + activated)
# ---------------------------------------------------------------------------
log "Deploying course-platform-bridge plugin..."
rm -rf "$SITE_DIR/wp-content/plugins/course-platform-bridge"
cp -r "$REPO_ROOT/wordpress-plugin/course-platform-bridge" "$SITE_DIR/wp-content/plugins/course-platform-bridge"
"${WP[@]}" plugin activate course-platform-bridge

# ---------------------------------------------------------------------------
# 4. Demo users + WooCommerce products + orders matching prisma/seed.ts
# ---------------------------------------------------------------------------
if ! "${WP[@]}" user get admin-parrot --field=ID >/dev/null 2>&1; then
  log "Creating demo users (password: password123 for all)..."
  "${WP[@]}" user create admin-parrot admin@parrot.dev --user_pass="password123" --role=administrator --display_name="Ada Admin"
  "${WP[@]}" user create instructor instructor@parrot.dev --user_pass="password123" --role=shop_manager --display_name="Ian Instructor"
  "${WP[@]}" user create priya priya@parrot.dev --user_pass="password123" --role=shop_manager --display_name="Priya Patel"
  "${WP[@]}" user create alice alice@parrot.dev --user_pass="password123" --role=customer --display_name="Alice Student"
  "${WP[@]}" user create bob bob@parrot.dev --user_pass="password123" --role=customer --display_name="Bob Student"
  "${WP[@]}" user create carol carol@parrot.dev --user_pass="password123" --role=customer --display_name="Carol Student"
fi

JAVA_PRODUCT_ID=$("${WP[@]}" post list --post_type=product --name=java-programming-course --field=ID 2>/dev/null || true)
if [ -z "$JAVA_PRODUCT_ID" ]; then
  log "Creating WooCommerce products (mapped to prisma/seed.ts course slugs)..."
  JAVA_PRODUCT_ID=$("${WP[@]}" wc product create \
    --name="Java Programming" --slug="java-programming-course" --type="simple" --status="publish" \
    --regular_price="99" --virtual=true --downloadable=true \
    --description="Full access to the Java Programming course on Parrot LMS." \
    --meta_data='[{"key":"_course_id","value":"java-programming"}]' \
    --user=1 --porcelain)
  WEB_PRODUCT_ID=$("${WP[@]}" wc product create \
    --name="Modern Web Development" --slug="modern-web-development-course" --type="simple" --status="publish" \
    --regular_price="79" --virtual=true --downloadable=true \
    --description="Full access to the Modern Web Development course on Parrot LMS." \
    --meta_data='[{"key":"_course_id","value":"modern-web-development"}]' \
    --user=1 --porcelain)

  log "Creating demo orders (Alice: both courses, Bob: Java, Carol: Web)..."
  for pair in "5:$JAVA_PRODUCT_ID" "5:$WEB_PRODUCT_ID" "6:$JAVA_PRODUCT_ID" "7:$WEB_PRODUCT_ID"; do
    CUSTOMER_ID="${pair%%:*}"
    PRODUCT_ID="${pair##*:}"
    ORDER_ID=$("${WP[@]}" wc shop_order create --customer_id="$CUSTOMER_ID" --status=pending \
      --line_items="[{\"product_id\":${PRODUCT_ID},\"quantity\":1}]" --user=1 --porcelain)
    "${WP[@]}" wc shop_order update "$ORDER_ID" --status=completed --user=1 >/dev/null
  done
fi

log "Done."
cat <<EOF

Local WordPress site ready at $SITE_DIR

To start it:
  "$PHP_BIN" -S 127.0.0.1:${WP_PORT} -t "$SITE_DIR" "$SITE_DIR/router.php"

WordPress admin: http://localhost:${WP_PORT}/wp-admin  (admin / AdminPass123!)
Demo accounts (password123): admin@parrot.dev, instructor@parrot.dev, priya@parrot.dev,
  alice@parrot.dev, bob@parrot.dev, carol@parrot.dev

Make sure .env has matching WORDPRESS_URL / WORDPRESS_BRIDGE_API_KEY /
WORDPRESS_BRIDGE_WEBHOOK_SECRET values (this script appends them
automatically on first run if .env exists and doesn't have them yet).

Then run the Next.js seed script so MongoDB's course slugs/instructor
accounts line up with what was just created here:
  npm run db:seed
EOF
