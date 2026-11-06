<?php
/** O'Tennis: native blocks, safe initial import and manager shortcuts. */
defined( 'ABSPATH' ) || exit;

add_action( 'after_setup_theme', function () {
	add_theme_support( 'title-tag' );
	add_theme_support( 'editor-styles' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'wp-block-styles' );
	add_theme_support( 'custom-logo' );
	add_editor_style( array( 'assets/site.css', 'assets/wordpress.css' ) );
	add_post_type_support( 'page', 'excerpt' );
} );

add_action( 'wp_enqueue_scripts', function () {
	$version = wp_get_theme()->get( 'Version' );
	wp_enqueue_style( 'otennis-site', get_theme_file_uri( 'assets/site.css' ), array(), $version );
	wp_enqueue_style( 'otennis-wordpress', get_theme_file_uri( 'assets/wordpress.css' ), array( 'otennis-site' ), $version );
} );

function otennis_menu_url() {
	$pages = get_option( 'otennis_page_ids', array() );
	return ! empty( $pages['menu'] ) && get_post_status( $pages['menu'] ) === 'publish'
		? get_permalink( $pages['menu'] ) : home_url( '/menu/' );
}

add_action( 'init', function () {
	wp_register_script( 'otennis-map-editor', get_theme_file_uri( 'assets/map-editor.js' ), array( 'wp-blocks', 'wp-element', 'wp-components', 'wp-block-editor' ), '1.0.0', true );
	register_block_type( 'otennis/map', array(
		'api_version' => 3,
		'editor_script' => 'otennis-map-editor',
		'attributes' => array( 'address' => array( 'type' => 'string', 'default' => 'Vie des Crêts 49, 2732 Reconvilier, Suisse' ) ),
		'render_callback' => function ( $attributes ) {
			$address = sanitize_text_field( $attributes['address'] ?? '' );
			if ( ! $address ) {
				return '';
			}
			return '<iframe class="otennis-map" src="' . esc_url( 'https://www.google.com/maps?q=' . rawurlencode( $address ) . '&output=embed' ) . '" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" title="' . esc_attr( 'Carte : ' . $address ) . '" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>';
		},
	) );
} );

/** Import bundled images into the Media Library once; retain attachment IDs on retry. */
function otennis_import_media() {
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';
	$media = get_option( 'otennis_media_ids', array() );
	$base = get_theme_file_path( 'assets/image' );
	$files = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $base, FilesystemIterator::SKIP_DOTS ) );
	foreach ( $files as $file ) {
		if ( ! $file->isFile() || ! in_array( strtolower( $file->getExtension() ), array( 'jpg', 'jpeg', 'png' ), true ) ) {
			continue;
		}
		$key = 'image/' . str_replace( '\\', '/', substr( $file->getPathname(), strlen( $base ) + 1 ) );
		if ( ! empty( $media[ $key ] ) && wp_get_attachment_url( $media[ $key ] ) ) {
			continue;
		}
		$temp = wp_tempnam( $file->getFilename() );
		if ( ! $temp || ! copy( $file->getPathname(), $temp ) ) {
			if ( $temp ) { wp_delete_file( $temp ); }
			return new WP_Error( 'media_copy', 'Impossible de préparer une photo. Vérifiez les permissions du serveur puis réessayez.' );
		}
		$id = media_handle_sideload( array( 'name' => $file->getFilename(), 'tmp_name' => $temp ), 0 );
		if ( is_wp_error( $id ) ) {
			wp_delete_file( $temp );
			return $id;
		}
		update_post_meta( $id, '_wp_attachment_image_alt', 'O’Tennis — ' . str_replace( array( '_', '-' ), ' ', $file->getBasename( '.' . $file->getExtension() ) ) );
		$media[ $key ] = $id;
		update_option( 'otennis_media_ids', $media, false );
	}
	return $media;
}

/** Explicit administrator action only. Never overwrite a manager's previously imported page. */
function otennis_install_content() {
	$media = otennis_import_media();
	if ( is_wp_error( $media ) ) { return $media; }
	$pages = get_option( 'otennis_page_ids', array() );
	foreach ( array( 'accueil' => 'Accueil', 'menu' => 'Menu' ) as $slug => $title ) {
		if ( empty( $pages[ $slug ] ) || ! get_post( $pages[ $slug ] ) || 'trash' === get_post_status( $pages[ $slug ] ) ) {
			$id = wp_insert_post( array( 'post_type' => 'page', 'post_title' => $title, 'post_name' => $slug, 'post_status' => 'draft' ), true );
			if ( is_wp_error( $id ) ) { return $id; }
			$pages[ $slug ] = $id;
			update_option( 'otennis_page_ids', $pages, false );
		}
	}
	$replacements = array( '{{HOME_URL}}' => esc_url( home_url( '/' ) ), '{{MENU_URL}}' => esc_url( get_permalink( $pages['menu'] ) ) );
	foreach ( $media as $key => $id ) {
		$replacements[ '{{MEDIA:' . $key . '}}' ] = esc_url( wp_get_attachment_url( $id ) );
	}
	foreach ( $pages as $slug => $id ) {
		if ( get_post_meta( $id, '_otennis_seeded', true ) ) { continue; }
		$content = file_get_contents( get_theme_file_path( 'content/' . $slug . '.html' ) );
		if ( false === $content ) { return new WP_Error( 'content_missing', 'Un fichier de contenu est manquant dans le thème.' ); }
		// Publish first so get_permalink resolves the final permalink for every structure.
		$result = wp_update_post( array( 'ID' => $id, 'post_status' => 'publish' ), true );
		if ( is_wp_error( $result ) ) { return $result; }
	}
	// Resolve links after both pages have their public permalinks (including plain permalinks).
	$replacements['{{MENU_URL}}'] = esc_url( get_permalink( $pages['menu'] ) );
	foreach ( $pages as $slug => $id ) {
		if ( get_post_meta( $id, '_otennis_seeded', true ) ) { continue; }
		$content = strtr( file_get_contents( get_theme_file_path( 'content/' . $slug . '.html' ) ), $replacements );
		$result = wp_update_post( wp_slash( array( 'ID' => $id, 'post_content' => $content ) ), true );
		if ( is_wp_error( $result ) ) { return $result; }
		update_post_meta( $id, '_otennis_seeded', 1 );
	}
	update_option( 'show_on_front', 'page' );
	update_option( 'page_on_front', $pages['accueil'] );
	if ( ! get_theme_mod( 'custom_logo' ) && ! empty( $media['image/logo.jpeg'] ) ) {
		set_theme_mod( 'custom_logo', $media['image/logo.jpeg'] );
	}
	if ( ! get_option( 'site_icon' ) && ! empty( $media['image/apple-touch-icon.png'] ) ) {
		update_option( 'site_icon', $media['image/apple-touch-icon.png'] );
	}
	update_option( 'otennis_installed', 1, false );
	return true;
}

add_action( 'admin_menu', function () {
	add_theme_page( 'Installation O’Tennis', 'Installation O’Tennis', 'manage_options', 'otennis-setup', 'otennis_setup_screen' );
} );

function otennis_setup_screen() {
	if ( ! current_user_can( 'manage_options' ) ) { return; }
	echo '<div class="wrap"><h1>Installation O’Tennis</h1>';
	if ( isset( $_POST['otennis_install'] ) ) {
		check_admin_referer( 'otennis_install' );
		$result = otennis_install_content();
		echo is_wp_error( $result ) ? '<div class="notice notice-error"><p>' . esc_html( $result->get_error_message() ) . '</p></div>' : '<div class="notice notice-success"><p>Les pages et les photos sont prêtes. L’accueil du site est configuré.</p></div>';
	}
	if ( ! get_option( 'otennis_installed' ) ) {
		echo '<p>Importe l’accueil, toute la carte et les photos du site existant. Les pages sont publiées et Accueil devient la page d’accueil du site. Les autres pages sont conservées.</p><form method="post">';
		wp_nonce_field( 'otennis_install' );
		submit_button( 'Installer les pages O’Tennis', 'primary', 'otennis_install' );
		echo '</form>';
	} else {
		echo '<p>Installation terminée. Les modifications se font dans <a href="' . esc_url( admin_url( 'edit.php?post_type=page' ) ) . '">Pages</a>. L’en-tête, la navigation et le pied de page sont accessibles dans Apparence → Éditeur.</p>';
	}
	echo '<h2>Pour le gérant</h2><p>Pages → Accueil : textes, photo, horaires, coordonnées et carte. Pages → Menu : plats, boissons, descriptions et prix. Cliquez sur Enregistrer après vos changements.</p><p>Pour ajouter un plat, dupliquez son groupe dans la Vue en liste. Ajoutez un bloc Image dans ce groupe pour sa photo. Aucun constructeur de pages payant n’est nécessaire.</p></div>';
}

add_action( 'admin_notices', function () {
	if ( current_user_can( 'manage_options' ) && ! get_option( 'otennis_installed' ) ) {
		echo '<div class="notice notice-info"><p>Bienvenue chez O’Tennis. <a href="' . esc_url( admin_url( 'themes.php?page=otennis-setup' ) ) . '">Installer les pages et la carte du restaurant</a>.</p></div>';
	}
} );

add_action( 'wp_dashboard_setup', function () {
	if ( ! current_user_can( 'edit_pages' ) ) { return; }
	wp_add_dashboard_widget( 'otennis_manager', 'Modifier le site O’Tennis', function () {
		$pages = get_option( 'otennis_page_ids', array() );
		foreach ( array( 'accueil' => 'Accueil, horaires et contact', 'menu' => 'Carte, plats et prix' ) as $slug => $label ) {
			if ( ! empty( $pages[ $slug ] ) && current_user_can( 'edit_post', $pages[ $slug ] ) ) {
				echo '<p><a class="button" href="' . esc_url( get_edit_post_link( $pages[ $slug ] ) ) . '">' . esc_html( $label ) . '</a></p>';
			}
		}
		echo '<p>Modifiez le texte ou cliquez sur une image pour la remplacer, puis cliquez sur Enregistrer. Pour ajouter un plat, dupliquez son groupe dans la Vue en liste.</p>';
	} );
} );

add_action( 'template_redirect', function () {
	$path = wp_parse_url( wp_unslash( $_SERVER['REQUEST_URI'] ?? '' ), PHP_URL_PATH );
	$base = wp_parse_url( home_url( '/' ), PHP_URL_PATH );
	$legacy = trim( substr( (string) $path, strlen( (string) $base ) ), '/' );
	$target = 'menu.html' === $legacy ? otennis_menu_url() : ( 'index.html' === $legacy ? home_url( '/' ) : '' );
	if ( $target ) { wp_safe_redirect( $target, 301 ); exit; }
} );

add_action( 'wp_head', function () {
	if ( defined( 'WPSEO_VERSION' ) || defined( 'RANK_MATH_VERSION' ) || defined( 'AIOSEO_VERSION' ) || defined( 'SEOPRESS_VERSION' ) || ! is_singular() ) { return; }
	$post = get_queried_object();
	$description = has_excerpt( $post ) ? get_the_excerpt( $post ) : wp_trim_words( wp_strip_all_tags( strip_shortcodes( $post->post_content ) ), 30, '…' );
	echo '<meta name="description" content="' . esc_attr( $description ) . '">' . "\n";
	echo '<meta property="og:type" content="website"><meta property="og:title" content="' . esc_attr( wp_get_document_title() ) . '"><meta property="og:url" content="' . esc_url( get_permalink( $post ) ) . '"><meta property="og:description" content="' . esc_attr( $description ) . '">' . "\n";
	if ( preg_match( '/<img[^>]+src="([^"]+)"/', $post->post_content, $matches ) ) {
		echo '<meta property="og:image" content="' . esc_url( html_entity_decode( $matches[1], ENT_QUOTES, 'UTF-8' ) ) . '">' . "\n";
	}
}, 5 );
