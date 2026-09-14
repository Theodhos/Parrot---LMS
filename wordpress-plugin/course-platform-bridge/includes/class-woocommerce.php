<?php
/**
 * WooCommerce integration: maps products to courses (via _course_id product
 * meta) and reacts to order status transitions to grant/revoke access.
 * Access is granted only on "completed" (WooCommerce auto-transitions
 * virtual/downloadable-only orders straight to completed once paid) and
 * revoked on cancelled/refunded/failed -- never on pending/processing.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CPB_WooCommerce {

	const META_KEY = '_course_id';

	/** Statuses (without the "wc-" prefix) that grant access. */
	const GRANTING_STATUSES = array( 'completed' );

	/** Statuses that revoke a previously-granted access. */
	const REVOKING_STATUSES = array( 'cancelled', 'refunded', 'failed' );

	private CPB_Course_Access $access;
	private CPB_Webhooks $webhooks;

	public function __construct( CPB_Course_Access $access, CPB_Webhooks $webhooks ) {
		$this->access   = $access;
		$this->webhooks = $webhooks;

		add_action( 'woocommerce_order_status_changed', array( $this, 'on_order_status_changed' ), 10, 4 );

		// Admin UI: a "Course ID" field on the product edit screen's General tab.
		add_action( 'woocommerce_product_options_general_product_data', array( $this, 'render_course_id_field' ) );
		add_action( 'woocommerce_process_product_meta', array( $this, 'save_course_id_field' ) );
	}

	public function render_course_id_field(): void {
		global $post;
		woocommerce_wp_text_input(
			array(
				'id'          => '_course_id',
				'label'       => __( 'Course ID', 'course-platform-bridge' ),
				'desc_tip'    => true,
				'description' => __( 'The Parrot LMS course slug this product grants access to (e.g. "java-programming"). Required for course-access purchases.', 'course-platform-bridge' ),
				'value'       => get_post_meta( $post->ID, self::META_KEY, true ),
			)
		);
	}

	public function save_course_id_field( int $product_id ): void {
		if ( isset( $_POST['_course_id'] ) ) {
			$course_id = sanitize_title( wp_unslash( $_POST['_course_id'] ) );
			update_post_meta( $product_id, self::META_KEY, $course_id );
		}
	}

	/**
	 * @param int      $order_id
	 * @param string   $old_status status without the "wc-" prefix
	 * @param string   $new_status status without the "wc-" prefix
	 * @param WC_Order $order
	 */
	public function on_order_status_changed( int $order_id, string $old_status, string $new_status, $order ): void {
		if ( ! $order instanceof WC_Order ) {
			$order = wc_get_order( $order_id );
			if ( ! $order ) {
				return;
			}
		}

		$user_id = $order->get_customer_id();
		if ( ! $user_id ) {
			return; // guest checkout has no platform identity to grant access to
		}

		$course_ids = $this->course_ids_in_order( $order );
		if ( empty( $course_ids ) ) {
			return; // this order has no course-mapped products
		}

		if ( in_array( $new_status, self::GRANTING_STATUSES, true ) ) {
			foreach ( $course_ids as $course_id => $product_id ) {
				$result = $this->access->grant_access( $user_id, $course_id, $product_id, $order_id );
				$this->webhooks->send(
					CPB_Webhooks::EVENT_GRANTED,
					array(
						'wordpressUserId' => $user_id,
						'courseId'        => $course_id,
						'productId'       => $product_id,
						'orderId'         => $order_id,
						'status'          => $result['status'],
					)
				);
			}
		} elseif ( in_array( $new_status, self::REVOKING_STATUSES, true ) ) {
			foreach ( $course_ids as $course_id => $product_id ) {
				$result = $this->access->revoke_access( $user_id, $course_id, $order_id );
				$this->webhooks->send(
					CPB_Webhooks::EVENT_REVOKED,
					array(
						'wordpressUserId' => $user_id,
						'courseId'        => $course_id,
						'productId'       => $product_id,
						'orderId'         => $order_id,
						'status'          => $result['status'],
					)
				);
			}
		}
	}

	/** @return array<string,int> course_id => product_id for every course-mapped line item in the order. */
	private function course_ids_in_order( WC_Order $order ): array {
		$map = array();
		foreach ( $order->get_items() as $item ) {
			if ( ! $item instanceof WC_Order_Item_Product ) {
				continue;
			}
			$product_id = $item->get_product_id();
			$course_id  = $this->access->resolve_course_id_from_product( $product_id );
			if ( null !== $course_id ) {
				$map[ $course_id ] = $product_id;
			}
		}
		return $map;
	}
}
