<?php
/**
 * Pushes signed access-change events to the Next.js application so its
 * MongoDB cache stays in sync without polling. Every payload is HMAC-SHA256
 * signed with COURSE_PLATFORM_BRIDGE_WEBHOOK_SECRET; Next.js must verify the
 * signature before trusting the body (see src/features/access/services in
 * the Next.js repo).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CPB_Webhooks {

	const EVENT_GRANTED = 'access.granted';
	const EVENT_REVOKED = 'access.revoked';

	public function send( string $event, array $payload ): void {
		$url = defined( 'COURSE_PLATFORM_BRIDGE_NEXTJS_URL' ) ? rtrim( COURSE_PLATFORM_BRIDGE_NEXTJS_URL, '/' ) : '';
		$secret = defined( 'COURSE_PLATFORM_BRIDGE_WEBHOOK_SECRET' ) ? COURSE_PLATFORM_BRIDGE_WEBHOOK_SECRET : '';

		if ( '' === $url || '' === $secret ) {
			error_log( 'Course Platform Bridge: webhook not sent -- missing NEXTJS_URL or WEBHOOK_SECRET config.' );
			return;
		}

		$body = wp_json_encode(
			array_merge(
				array(
					'event'     => $event,
					'timestamp' => time(),
				),
				$payload
			)
		);

		$signature = hash_hmac( 'sha256', $body, $secret );

		$response = wp_remote_post(
			$url . '/api/webhooks/woocommerce',
			array(
				'timeout' => 8,
				'headers' => array(
					'Content-Type'        => 'application/json',
					'X-Bridge-Signature'  => 'sha256=' . $signature,
					'X-Bridge-Event'      => $event,
				),
				'body'    => $body,
			)
		);

		if ( is_wp_error( $response ) ) {
			// Deliberately no payload details in the log -- event name and
			// error message only, nothing that could include user PII.
			error_log( 'Course Platform Bridge: webhook delivery failed for ' . $event . ': ' . $response->get_error_message() );
			return;
		}

		$status = wp_remote_retrieve_response_code( $response );
		if ( $status < 200 || $status >= 300 ) {
			error_log( 'Course Platform Bridge: webhook for ' . $event . ' got HTTP ' . $status );
		}
	}

	/**
	 * Synchronous counterpart to send(): called from the order-received page
	 * while the buyer's browser is still here, so (unlike the fire-and-forget
	 * webhook above) it needs an answer in the same request -- where to send
	 * the buyer next. Returns null on any failure; the caller should just not
	 * redirect in that case rather than break checkout.
	 */
	public function complete_purchase( array $payload ): ?string {
		$url    = defined( 'COURSE_PLATFORM_BRIDGE_NEXTJS_URL' ) ? rtrim( COURSE_PLATFORM_BRIDGE_NEXTJS_URL, '/' ) : '';
		$secret = defined( 'COURSE_PLATFORM_BRIDGE_WEBHOOK_SECRET' ) ? COURSE_PLATFORM_BRIDGE_WEBHOOK_SECRET : '';

		if ( '' === $url || '' === $secret ) {
			error_log( 'Course Platform Bridge: purchase-complete not sent -- missing NEXTJS_URL or WEBHOOK_SECRET config.' );
			return null;
		}

		$body = wp_json_encode( array_merge( array( 'timestamp' => time() ), $payload ) );
		$signature = hash_hmac( 'sha256', $body, $secret );

		$response = wp_remote_post(
			$url . '/api/webhooks/woocommerce/purchase-complete',
			array(
				'timeout' => 8,
				'headers' => array(
					'Content-Type'       => 'application/json',
					'X-Bridge-Signature' => 'sha256=' . $signature,
				),
				'body'    => $body,
			)
		);

		if ( is_wp_error( $response ) ) {
			error_log( 'Course Platform Bridge: purchase-complete request failed: ' . $response->get_error_message() );
			return null;
		}

		$status = wp_remote_retrieve_response_code( $response );
		if ( $status < 200 || $status >= 300 ) {
			error_log( 'Course Platform Bridge: purchase-complete got HTTP ' . $status );
			return null;
		}

		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $data ) || empty( $data['data']['redirectUrl'] ) || ! is_string( $data['data']['redirectUrl'] ) ) {
			return null;
		}
		return $data['data']['redirectUrl'];
	}
}
