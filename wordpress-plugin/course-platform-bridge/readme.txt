=== Course Platform Bridge ===
Contributors: parrot-lms
Tags: woocommerce, rest-api, lms, sso
Requires at least: 6.4
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

Secure bridge between WordPress/WooCommerce and the Parrot LMS Next.js application.

== Description ==

WordPress remains the source of truth for user identity, passwords, checkout,
payments and orders. WooCommerce products represent purchasable courses via a
`_course_id` product meta field. This plugin:

* Exposes `/wp-json/course-platform/v1/{login,me,courses/{id}/access,me/courses}`
  for the Next.js server to verify credentials and course access. Every route
  requires an `Authorization: Bearer <shared API key>` header -- it is a
  server-to-server API only, never called from a browser.
* Listens to WooCommerce order status transitions and grants course access on
  `completed`, revokes it on `cancelled` / `refunded` / `failed`.
* Maintains a small custom table (`{prefix}cpb_course_access`) as a fast,
  idempotent (unique on user+course) cache of access state.
* Pushes an HMAC-SHA256-signed webhook to the Next.js app whenever access
  changes, so its own cache can stay in sync without polling.

Never stores or transmits plaintext passwords outside WordPress's own
authentication system, and never modifies WordPress or WooCommerce core.

== Configuration ==

Define these constants in `wp-config.php`:

    define( 'COURSE_PLATFORM_BRIDGE_API_KEY', '<random 64-char hex string>' );
    define( 'COURSE_PLATFORM_BRIDGE_WEBHOOK_SECRET', '<a different random 64-char hex string>' );
    define( 'COURSE_PLATFORM_BRIDGE_NEXTJS_URL', 'https://your-nextjs-app.example.com' );

Then, for each course you sell, create a WooCommerce product and set its
"Course ID" field (General tab, product data panel) to the matching Parrot
LMS course slug -- never rely on the product title to identify the course.

== Changelog ==

= 1.0.0 =
* Initial release.
