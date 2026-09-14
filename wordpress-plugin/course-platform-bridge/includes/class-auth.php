<?php
/**
 * Credential verification. The WordPress password never leaves this class --
 * it is checked in-process via wp_authenticate() and the plaintext is never
 * logged, stored elsewhere, or included in any response.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CPB_Auth {

	/**
	 * Verifies an email/username + password pair against WordPress's own
	 * authentication system. Returns a safe public-profile array on success,
	 * or null on failure -- callers must not distinguish "no such user" from
	 * "wrong password" in their response (avoids user enumeration).
	 */
	public function verify_credentials( string $identifier, string $password ): ?array {
		if ( '' === trim( $identifier ) || '' === $password ) {
			return null;
		}

		$user = wp_authenticate( $identifier, $password );

		if ( is_wp_error( $user ) || ! ( $user instanceof WP_User ) ) {
			return null;
		}

		return $this->to_public_profile( $user );
	}

	public function get_user_by_id( int $user_id ): ?array {
		$user = get_userdata( $user_id );
		if ( ! $user ) {
			return null;
		}
		return $this->to_public_profile( $user );
	}

	/**
	 * Creates a new WordPress/WooCommerce customer account. Returns a
	 * WP_Error (never a raw exception) on validation failure -- e.g. email
	 * already registered -- so the REST layer can map it to a clean 4xx.
	 */
	public function create_user( string $name, string $email, string $password ) {
		$email = sanitize_email( $email );
		$name  = sanitize_text_field( $name );

		if ( ! is_email( $email ) ) {
			return new WP_Error( 'cpb_invalid_email', 'Enter a valid email address.' );
		}
		if ( email_exists( $email ) ) {
			return new WP_Error( 'cpb_email_exists', 'An account with this email already exists.' );
		}
		if ( strlen( $password ) < 8 ) {
			return new WP_Error( 'cpb_weak_password', 'Password must be at least 8 characters.' );
		}

		$username = $this->unique_username_from_email( $email );

		if ( function_exists( 'wc_create_new_customer' ) ) {
			$user_id = wc_create_new_customer(
				$email,
				$username,
				$password,
				array( 'display_name' => '' !== $name ? $name : $username )
			);
		} else {
			$user_id = wp_create_user( $username, $password, $email );
		}

		if ( is_wp_error( $user_id ) ) {
			return $user_id;
		}

		if ( '' !== $name ) {
			wp_update_user( array( 'ID' => $user_id, 'display_name' => $name, 'first_name' => $name ) );
		}

		return $this->to_public_profile( get_userdata( $user_id ) );
	}

	private function unique_username_from_email( string $email ): string {
		$base     = sanitize_user( current( explode( '@', $email ) ), true );
		$base     = '' !== $base ? $base : 'user';
		$username = $base;
		$suffix   = 1;
		while ( username_exists( $username ) ) {
			$username = $base . $suffix;
			$suffix++;
		}
		return $username;
	}

	private function to_public_profile( WP_User $user ): array {
		return array(
			'wordpressUserId' => $user->ID,
			'email'           => $user->user_email,
			'name'            => $user->display_name,
			'roles'           => array_values( $user->roles ),
		);
	}
}
