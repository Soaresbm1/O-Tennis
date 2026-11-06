<?php
// Run only in an isolated WordPress Playground instance, never on the live site.
require '/wordpress/wp-load.php';
wp_set_current_user( 1 );
function otennis_assert( $condition, $message ) {
	if ( ! $condition ) { throw new Exception( $message ); }
}
$result = otennis_install_content();
otennis_assert( ! is_wp_error( $result ), is_wp_error( $result ) ? $result->get_error_message() : 'Import failed' );
$ids = get_option( 'otennis_page_ids' );
$media = get_option( 'otennis_media_ids' );
otennis_assert( 2 === count( $ids ), 'Expected two pages' );
otennis_assert( 10 === count( $media ), 'Expected all ten image assets' );
otennis_assert( (int) get_option( 'page_on_front' ) === $ids['accueil'], 'Front page missing' );
otennis_assert( wp_is_block_theme(), 'Theme must support the Site Editor' );
$menu = get_post( $ids['menu'] )->post_content;
otennis_assert( false === strpos( $menu, '{{' ), 'Unresolved URL token' );
otennis_assert( false !== strpos( $menu, '37.50 CHF' ), 'Menu price missing' );
otennis_assert( false !== strpos( $menu, 'spiritueux' ), 'Menu category missing' );
$home = get_post( $ids['accueil'] )->post_content;
otennis_assert( false !== strpos( $home, '22h30' ), 'Opening hours missing' );
otennis_assert( false !== strpos( do_blocks( $home ), 'google.com/maps?q=' ), 'Map must render server-side' );
$original_pages = $ids;
$original_media = $media;
wp_update_post( array( 'ID' => $ids['menu'], 'post_content' => str_replace( '37.50 CHF', '38.50 CHF', $menu ) ) );
$result = otennis_install_content();
otennis_assert( true === $result, 'Second import failed' );
otennis_assert( $original_pages === get_option( 'otennis_page_ids' ), 'Import duplicated pages' );
otennis_assert( $original_media === get_option( 'otennis_media_ids' ), 'Import duplicated media' );
otennis_assert( false !== strpos( get_post( $ids['menu'] )->post_content, '38.50 CHF' ), 'Import overwrote manager edits' );
wp_update_post( wp_slash( array( 'ID' => $ids['menu'], 'post_content' => $menu ) ) );
$editor = wp_insert_user( array( 'user_login' => 'gerant-test', 'user_pass' => wp_generate_password(), 'role' => 'editor' ) );
otennis_assert( ! is_wp_error( $editor ), 'Could not create manager test user' );
wp_set_current_user( $editor );
otennis_assert( current_user_can( 'edit_post', $ids['accueil'] ) && current_user_can( 'edit_post', $ids['menu'] ), 'Manager cannot edit pages' );
otennis_assert( current_user_can( 'upload_files' ) && ! current_user_can( 'manage_options' ), 'Manager permissions incorrect' );
// Exercise the same KSES filters used when the editor saves a page.
wp_update_post( wp_slash( array( 'ID' => $ids['accueil'], 'post_content' => str_replace( '22h30', '23h00', $home ) ) ) );
$saved_home = get_post( $ids['accueil'] )->post_content;
otennis_assert( false !== strpos( $saved_home, '23h00' ), 'Hours update failed' );
otennis_assert( false !== strpos( do_blocks( $saved_home ), 'google.com/maps?q=' ), 'Map lost when editor saved' );
wp_update_post( wp_slash( array( 'ID' => $ids['accueil'], 'post_content' => $home ) ) );
wp_set_current_user( 1 );
update_option( 'blogname', 'O’Tennis' );
update_option( 'blogdescription', 'Restaurant - Buvette chez Kryste' );
update_option( 'timezone_string', 'Europe/Zurich' );
global $wp_rewrite;
$wp_rewrite->set_permalink_structure( '/%postname%/' );
flush_rewrite_rules();
// Resolve links again after the test switches from plain to pretty permalinks.
$current_menu = otennis_menu_url();
wp_update_post( wp_slash( array( 'ID' => $ids['accueil'], 'post_content' => str_replace( esc_url( home_url( '/?page_id=' . $ids['menu'] ) ), esc_url( $current_menu ), $home ) ) ) );
file_put_contents( '/wordpress/wp-content/otennis-qa-result.json', wp_json_encode( array( 'status' => 'PASS', 'pages' => $ids, 'media_count' => count( $media ), 'checks' => 'Import, native blocks, full menu, map, idempotency, preserved edits, manager permissions, manager saving hours' ) ) );
echo 'O’Tennis WordPress runtime checks: PASS';
