<?php
/**
 * Title: En-tête O’Tennis
 * Slug: otennis/header
 * Inserter: no
 */
defined( 'ABSPATH' ) || exit;
$links = array(
	array( 'label' => 'Accueil', 'url' => home_url( '/' ) ),
	array( 'label' => 'Menu', 'url' => otennis_menu_url() ),
	array( 'label' => 'Contact', 'url' => home_url( '/#contact' ) ),
);
?>
<!-- wp:group {"className":"header-inner","layout":{"type":"default"}} -->
<div class="wp-block-group header-inner">
<!-- wp:group {"className":"logo-bloc","layout":{"type":"default"}} -->
<div class="wp-block-group logo-bloc">
<!-- wp:site-logo {"width":64} /-->
<!-- wp:group {"className":"logo-texte","layout":{"type":"default"}} -->
<div class="wp-block-group logo-texte"><!-- wp:site-title {"level":1} /--><!-- wp:site-tagline /--></div>
<!-- /wp:group --></div>
<!-- /wp:group -->
<!-- wp:navigation {"overlayMenu":"mobile","ariaLabel":"Navigation principale","layout":{"type":"flex","justifyContent":"right"}} -->
<?php foreach ( $links as $link ) : ?>
<!-- wp:navigation-link <?php echo wp_json_encode( $link, JSON_HEX_TAG | JSON_HEX_AMP ); ?> /-->
<?php endforeach; ?>
<!-- /wp:navigation -->
</div><!-- /wp:group -->
