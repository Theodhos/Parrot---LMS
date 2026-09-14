<?php
/**
 * Plugin Name:       Course Platform Bridge
 * Description:       Secure bridge between WordPress/WooCommerce (identity, checkout, payments, orders) and the Parrot LMS Next.js application (course delivery, learning experience). Exposes a REST API the Next.js server uses to verify credentials and course purchase status, and pushes signed webhooks to Next.js when access changes.
 * Version:           1.0.0
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Requires Plugins:  woocommerce
 * Author:            Parrot LMS
 * License:           GPL-2.0-or-later
 * Text Domain:       course-platform-bridge
 *
 * This plugin never modifies WordPress core or WooCommerce core -- it only
 * hooks into their public actions/filters and registers its own REST routes
 * and a small custom database table.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CPB_VERSION', '1.0.0' );
define( 'CPB_PLUGIN_FILE', __FILE__ );
define( 'CPB_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'CPB_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once CPB_PLUGIN_DIR . 'includes/class-course-access.php';
require_once CPB_PLUGIN_DIR . 'includes/class-auth.php';
require_once CPB_PLUGIN_DIR . 'includes/class-webhooks.php';
require_once CPB_PLUGIN_DIR . 'includes/class-woocommerce.php';
require_once CPB_PLUGIN_DIR . 'includes/class-rest-api.php';

/**
 * Central plugin bootstrap. Kept intentionally thin -- each concern lives in
 * its own class under includes/.
 */
final class Course_Platform_Bridge {

	private static ?Course_Platform_Bridge $instance = null;

	public CPB_Course_Access $access;
	public CPB_Auth $auth;
	public CPB_Webhooks $webhooks;
	public CPB_WooCommerce $woocommerce;
	public CPB_REST_API $rest_api;

	public static function instance(): Course_Platform_Bridge {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		$this->access      = new CPB_Course_Access();
		$this->auth        = new CPB_Auth();
		$this->webhooks    = new CPB_Webhooks();
		$this->woocommerce = new CPB_WooCommerce( $this->access, $this->webhooks );
		$this->rest_api    = new CPB_REST_API( $this->access, $this->auth );

		add_action( 'admin_notices', array( $this, 'maybe_show_missing_config_notice' ) );
	}

	public function maybe_show_missing_config_notice(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$missing = array();
		foreach ( array( 'COURSE_PLATFORM_BRIDGE_API_KEY', 'COURSE_PLATFORM_BRIDGE_WEBHOOK_SECRET', 'COURSE_PLATFORM_BRIDGE_NEXTJS_URL' ) as $constant ) {
			if ( ! defined( $constant ) || '' === constant( $constant ) ) {
				$missing[] = $constant;
			}
		}
		if ( empty( $missing ) ) {
			return;
		}
		printf(
			'<div class="notice notice-warning"><p><strong>Course Platform Bridge:</strong> define %s in wp-config.php.</p></div>',
			esc_html( implode( ', ', $missing ) )
		);
	}
}

register_activation_hook( __FILE__, array( 'CPB_Course_Access', 'install_schema' ) );

add_action(
	'plugins_loaded',
	static function () {
		if ( ! class_exists( 'WooCommerce' ) ) {
			add_action(
				'admin_notices',
				static function () {
					echo '<div class="notice notice-error"><p><strong>Course Platform Bridge</strong> requires WooCommerce to be installed and active.</p></div>';
				}
			);
			return;
		}
		Course_Platform_Bridge::instance();
	}
);
