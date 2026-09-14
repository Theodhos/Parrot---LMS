<?php
/**
 * REST API surface consumed by the Next.js server, under
 * /wp-json/course-platform/v1/*. Every route requires a valid
 * `Authorization: Bearer <COURSE_PLATFORM_BRIDGE_API_KEY>` header -- this is
 * a server-to-server API, never called from a browser, so a single shared
 * key (checked with a constant-time comparison) is sufficient. The login
 * route is additionally rate-limited per IP.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CPB_REST_API {

	const NAMESPACE_ = 'course-platform/v1';
	const LOGIN_RATE_LIMIT       = 10; // attempts
	const LOGIN_RATE_LIMIT_WINDOW = 300; // seconds

	private CPB_Course_Access $access;
	private CPB_Auth $auth;

	public function __construct( CPB_Course_Access $access, CPB_Auth $auth ) {
		$this->access = $access;
		$this->auth   = $auth;
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE_,
			'/login',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'handle_login' ),
				'permission_callback' => array( $this, 'check_api_key' ),
				'args'                => array(
					'email'    => array( 'required' => true, 'type' => 'string' ),
					'password' => array( 'required' => true, 'type' => 'string' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE_,
			'/register',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'handle_register' ),
				'permission_callback' => array( $this, 'check_api_key' ),
				'args'                => array(
					'name'     => array( 'required' => true, 'type' => 'string' ),
					'email'    => array( 'required' => true, 'type' => 'string' ),
					'password' => array( 'required' => true, 'type' => 'string' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE_,
			'/me',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'handle_me' ),
				'permission_callback' => array( $this, 'check_api_key' ),
				'args'                => array(
					'wordpressUserId' => array( 'required' => true, 'type' => 'integer' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE_,
			'/courses/(?P<courseId>[a-zA-Z0-9-]+)/access',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'handle_course_access' ),
				'permission_callback' => array( $this, 'check_api_key' ),
				'args'                => array(
					'wordpressUserId' => array( 'required' => true, 'type' => 'integer' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE_,
			'/me/courses',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'handle_my_courses' ),
				'permission_callback' => array( $this, 'check_api_key' ),
				'args'                => array(
					'wordpressUserId' => array( 'required' => true, 'type' => 'integer' ),
				),
			)
		);
	}

	public function check_api_key( WP_REST_Request $request ) {
		$expected = defined( 'COURSE_PLATFORM_BRIDGE_API_KEY' ) ? COURSE_PLATFORM_BRIDGE_API_KEY : '';
		if ( '' === $expected ) {
			return new WP_Error( 'cpb_not_configured', 'Bridge API key is not configured.', array( 'status' => 500 ) );
		}

		$auth_header = $request->get_header( 'authorization' ) ?? '';
		$provided    = '';
		if ( preg_match( '/^Bearer\s+(.+)$/i', $auth_header, $matches ) ) {
			$provided = trim( $matches[1] );
		}

		if ( '' === $provided || ! hash_equals( $expected, $provided ) ) {
			return new WP_Error( 'cpb_unauthorized', 'Invalid or missing API key.', array( 'status' => 401 ) );
		}

		return true;
	}

	private function rate_limit_exceeded( string $bucket ): bool {
		$ip  = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
		$key = 'cpb_rl_' . $bucket . '_' . md5( $ip );
		$count = (int) get_transient( $key );

		if ( $count >= self::LOGIN_RATE_LIMIT ) {
			return true;
		}

		set_transient( $key, $count + 1, self::LOGIN_RATE_LIMIT_WINDOW );
		return false;
	}

	public function handle_login( WP_REST_Request $request ) {
		if ( $this->rate_limit_exceeded( 'login' ) ) {
			return new WP_Error( 'cpb_rate_limited', 'Too many login attempts. Try again shortly.', array( 'status' => 429 ) );
		}

		$email    = (string) $request->get_param( 'email' );
		$password = (string) $request->get_param( 'password' );

		$profile = $this->auth->verify_credentials( $email, $password );

		if ( null === $profile ) {
			// Deliberately generic -- never reveal whether the account exists.
			return new WP_Error( 'cpb_invalid_credentials', 'Invalid email or password.', array( 'status' => 401 ) );
		}

		return new WP_REST_Response(
			array(
				'success'         => true,
				'wordpressUserId' => $profile['wordpressUserId'],
				'email'           => $profile['email'],
				'name'            => $profile['name'],
				'roles'           => $profile['roles'],
			),
			200
		);
	}

	public function handle_register( WP_REST_Request $request ) {
		if ( $this->rate_limit_exceeded( 'register' ) ) {
			return new WP_Error( 'cpb_rate_limited', 'Too many attempts. Try again shortly.', array( 'status' => 429 ) );
		}

		$name     = (string) $request->get_param( 'name' );
		$email    = (string) $request->get_param( 'email' );
		$password = (string) $request->get_param( 'password' );

		$profile = $this->auth->create_user( $name, $email, $password );

		if ( is_wp_error( $profile ) ) {
			return new WP_Error( $profile->get_error_code(), $profile->get_error_message(), array( 'status' => 422 ) );
		}

		return new WP_REST_Response( array_merge( array( 'success' => true ), $profile ), 201 );
	}

	public function handle_me( WP_REST_Request $request ) {
		$user_id = (int) $request->get_param( 'wordpressUserId' );
		$profile = $this->auth->get_user_by_id( $user_id );

		if ( null === $profile ) {
			return new WP_Error( 'cpb_not_found', 'User not found.', array( 'status' => 404 ) );
		}

		return new WP_REST_Response(
			array_merge( array( 'authenticated' => true ), $profile ),
			200
		);
	}

	public function handle_course_access( WP_REST_Request $request ) {
		$user_id   = (int) $request->get_param( 'wordpressUserId' );
		$course_id = (string) $request->get_param( 'courseId' );

		if ( ! get_userdata( $user_id ) ) {
			return new WP_Error( 'cpb_not_found', 'User not found.', array( 'status' => 404 ) );
		}

		$result = $this->access->get_access( $user_id, $course_id );

		return new WP_REST_Response(
			array(
				'authenticated'    => true,
				'wordpressUserId'  => $user_id,
				'courseId'         => $course_id,
				'hasAccess'        => $result['has_access'],
				'accessStatus'     => $result['status'],
			),
			200
		);
	}

	public function handle_my_courses( WP_REST_Request $request ) {
		$user_id = (int) $request->get_param( 'wordpressUserId' );

		if ( ! get_userdata( $user_id ) ) {
			return new WP_Error( 'cpb_not_found', 'User not found.', array( 'status' => 404 ) );
		}

		$rows = $this->access->list_access_for_user( $user_id );

		return new WP_REST_Response(
			array(
				'authenticated'   => true,
				'wordpressUserId' => $user_id,
				'courses'         => array_map(
					static function ( $row ) {
						return array(
							'courseId'     => $row['course_id'],
							'hasAccess'    => $row['has_access'],
							'accessStatus' => $row['status'],
						);
					},
					$rows
				),
			),
			200
		);
	}
}
