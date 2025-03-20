<?php
/**
 * SCF Block Bindings
 *
 * @since ACF 6.2.8
 * @package wordpress/secure-custom-fields
 */

namespace ACF\Blocks;

/**
 * The core SCF Blocks binding class.
 */
class Bindings {
	/**
	 * Block Bindings constructor.
	 */
	public function __construct() {
		// Final check we're on WP 6.5 or newer.
		if ( ! function_exists( 'register_block_bindings_source' ) ) {
			return;
		}

		add_action( 'acf/init', array( $this, 'register_binding_sources' ) );
		add_action( 'acf/init', array( $this, 'register_acf_to_rest' ) );
	}

	/**
	 * Hooked to acf/init, register our binding sources.
	 */
	public function register_binding_sources() {
		if ( acf_get_setting( 'enable_block_bindings' ) ) {
			register_block_bindings_source(
				'acf/field',
				array(
					'label'              => _x( 'SCF Fields', 'The core SCF block binding source name for fields on the current page', 'secure-custom-fields' ),
					'get_value_callback' => array( $this, 'get_value' ),
				)
			);
		}
	}

	/**
	 * Handle returning the block binding value for an ACF meta value.
	 *
	 * @since ACF 6.2.8
	 *
	 * @param array     $source_attrs   An array of the source attributes requested.
	 * @param \WP_Block $block_instance The block instance.
	 * @param string    $attribute_name The block's bound attribute name.
	 * @return string|null The block binding value or an empty string on failure.
	 */
	public function get_value( array $source_attrs, \WP_Block $block_instance, string $attribute_name ) {
		if ( ! isset( $source_attrs['key'] ) || ! is_string( $source_attrs['key'] ) ) {
			$value = '';
		} else {
			$field = get_field_object( $source_attrs['key'], false, true, true, true );

			if ( ! $field ) {
				return '';
			}

			if ( ! acf_field_type_supports( $field['type'], 'bindings', true ) ) {
				if ( is_preview() ) {
					return apply_filters( 'acf/bindings/field_not_supported_message', '[' . esc_html__( 'The requested SCF field type does not support output in Block Bindings or the SCF shortcode.', 'secure-custom-fields' ) . ']' );
				} else {
					return '';
				}
			}

			if ( isset( $field['allow_in_bindings'] ) && ! $field['allow_in_bindings'] ) {
				if ( is_preview() ) {
					return apply_filters( 'acf/bindings/field_not_allowed_message', '[' . esc_html__( 'The requested SCF field is not allowed to be output in bindings or the SCF Shortcode.', 'secure-custom-fields' ) . ']' );
				} else {
					return '';
				}
			}

			$value = $field['value'];

			if ( is_array( $value ) ) {
				$value = implode( ', ', $value );
			}

			// If we're not a scalar we'd throw an error, so return early for safety.
			if ( ! is_scalar( $value ) ) {
				$value = null;
			}
		}

		return apply_filters( 'acf/blocks/binding_value', $value, $source_attrs, $block_instance, $attribute_name );
	}

	/**
	 * Register ACF fields to REST API
	 *
	 * @return void
	 */
	public function register_acf_to_rest(): void {
		// Check if already registered in this request
		static $registered     = false;
		static $allowed_fields = array( 'text', 'number' );
		if ( $registered ) {
			return;
		}

		$fields          = acf_get_field_groups();
		$registered_meta = array(); // Track which meta we've registered

		foreach ( $fields as $field_group ) {
			// Skip inactive field groups
			if ( ! empty( $field_group['active'] ) && ! $field_group['active'] ) {
				continue;
			}

			$post_types = $this->get_post_types_from_location( $field_group );
			$fields     = acf_get_fields( $field_group );
			foreach ( $fields as $field ) {
				if ( isset( $field['type'] ) && in_array( $field['type'], $allowed_fields, true ) && isset( $field['allow_in_bindings'] ) && $field['allow_in_bindings'] ) {
					$meta_key = $field['name'];

					foreach ( $post_types as $post_type ) {
						// Skip if we've already registered this meta for this post type
						if ( isset( $registered_meta[ $post_type ][ $meta_key ] ) ) {
							continue;
						}

						register_post_meta(
							$post_type,
							$meta_key,
							array(
								'show_in_rest'  => true,
								'single'        => true,
								'type'          => 'string',
								'auth_callback' => function () {
									return current_user_can( 'edit_posts' );
								},
							)
						);

						$registered_meta[ $post_type ][ $meta_key ] = true;
					}
				}
			}
		}

		$registered = true;
	}

	/**
	 * Get post types from field group location rules
	 *
	 * @param array $field_group ACF field group array.
	 * @return array Array of post types
	 */
	private function get_post_types_from_location( array $field_group ): array {
		$post_types = array();

		if ( ! isset( $field_group['location'] ) || ! is_array( $field_group['location'] ) ) {
			return array( 'post' ); // Default to 'post' if no location rules
		}

		foreach ( $field_group['location'] as $location_group ) {
			foreach ( $location_group as $location_rule ) {
				if ( 'post_type' === $location_rule['param'] && '==' === $location_rule['operator'] ) {
					$post_types[] = $location_rule['value'];
				}
			}
		}

		return array_unique( $post_types );
	}
}
