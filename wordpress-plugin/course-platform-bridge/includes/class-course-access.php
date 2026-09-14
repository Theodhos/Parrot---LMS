<?php
/**
 * Resolves and stores course access grants.
 *
 * WooCommerce order/product data is the source of truth for whether a
 * purchase happened at all; this class maintains a small denormalized table
 * (one row per user+course) so access checks are a single indexed lookup
 * instead of re-scanning orders on every request. Rows are only ever written
 * from CPB_WooCommerce's order-status hooks, never from client input.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CPB_Course_Access {

	const STATUS_ACTIVE  = 'active';
	const STATUS_REVOKED = 'revoked';
	const STATUS_EXPIRED = 'expired';

	public static function table_name(): string {
		global $wpdb;
		return $wpdb->prefix . 'cpb_course_access';
	}

	/**
	 * Runs on plugin activation. Idempotent (dbDelta only applies diffs).
	 */
	public static function install_schema(): void {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$table_name      = self::table_name();
		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table_name} (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			user_id BIGINT UNSIGNED NOT NULL,
			course_id VARCHAR(191) NOT NULL,
			product_id BIGINT UNSIGNED NOT NULL,
			order_id BIGINT UNSIGNED NOT NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'active',
			granted_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY user_course (user_id, course_id),
			KEY order_id (order_id)
		) {$charset_collate};";

		dbDelta( $sql );
	}

	/** Reads the course id a WooCommerce product maps to, or null if unmapped. */
	public function resolve_course_id_from_product( int $product_id ): ?string {
		$course_id = get_post_meta( $product_id, '_course_id', true );
		return ( is_string( $course_id ) && '' !== $course_id ) ? $course_id : null;
	}

	/**
	 * Grants (or re-activates) access. Upserts on the (user_id, course_id)
	 * unique key, so replaying the same webhook/event never creates
	 * duplicate rows -- this is what makes the whole pipeline idempotent.
	 */
	public function grant_access( int $user_id, string $course_id, int $product_id, int $order_id ): array {
		global $wpdb;
		$now = current_time( 'mysql', true );

		$wpdb->query(
			$wpdb->prepare(
				"INSERT INTO " . self::table_name() . "
					(user_id, course_id, product_id, order_id, status, granted_at, updated_at)
				VALUES (%d, %s, %d, %d, %s, %s, %s)
				ON DUPLICATE KEY UPDATE
					product_id = VALUES(product_id),
					order_id = VALUES(order_id),
					status = VALUES(status),
					updated_at = VALUES(updated_at)",
				$user_id,
				$course_id,
				$product_id,
				$order_id,
				self::STATUS_ACTIVE,
				$now,
				$now
			)
		);

		return $this->get_access( $user_id, $course_id );
	}

	/** Revokes access (refund/cancellation/failure) -- row stays for audit history. */
	public function revoke_access( int $user_id, string $course_id, int $order_id ): array {
		global $wpdb;
		$now = current_time( 'mysql', true );

		$wpdb->query(
			$wpdb->prepare(
				'UPDATE ' . self::table_name() . '
					SET status = %s, order_id = %d, updated_at = %s
					WHERE user_id = %d AND course_id = %s',
				self::STATUS_REVOKED,
				$order_id,
				$now,
				$user_id,
				$course_id
			)
		);

		return $this->get_access( $user_id, $course_id );
	}

	public function get_access( int $user_id, string $course_id ): array {
		global $wpdb;
		$row = $wpdb->get_row(
			$wpdb->prepare(
				'SELECT * FROM ' . self::table_name() . ' WHERE user_id = %d AND course_id = %s',
				$user_id,
				$course_id
			),
			ARRAY_A
		);

		if ( ! $row ) {
			return array(
				'course_id'   => $course_id,
				'has_access'  => false,
				'status'      => 'none',
				'product_id'  => null,
				'order_id'    => null,
			);
		}

		return array(
			'course_id'  => $row['course_id'],
			'has_access' => self::STATUS_ACTIVE === $row['status'],
			'status'     => $row['status'],
			'product_id' => (int) $row['product_id'],
			'order_id'   => (int) $row['order_id'],
		);
	}

	/** All access rows for a user -- used by the /me/courses endpoint the dashboard syncs from. */
	public function list_access_for_user( int $user_id ): array {
		global $wpdb;
		$rows = $wpdb->get_results(
			$wpdb->prepare( 'SELECT * FROM ' . self::table_name() . ' WHERE user_id = %d', $user_id ),
			ARRAY_A
		);

		return array_map(
			static function ( $row ) {
				return array(
					'course_id'  => $row['course_id'],
					'has_access' => self::STATUS_ACTIVE === $row['status'],
					'status'     => $row['status'],
					'product_id' => (int) $row['product_id'],
					'order_id'   => (int) $row['order_id'],
				);
			},
			$rows
		);
	}
}
