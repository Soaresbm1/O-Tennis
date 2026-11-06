(function (blocks, element, components, editor) {
  const el = element.createElement;
  blocks.registerBlockType('otennis/map', {
    apiVersion: 3,
    title: 'Carte du restaurant',
    icon: 'location-alt',
    category: 'embed',
    attributes: {
      address: { type: 'string', default: 'Vie des Crêts 49, 2732 Reconvilier, Suisse' }
    },
    edit: function (props) {
      return el('div', editor.useBlockProps({ className: 'otennis-map-editor' }),
        el(components.TextControl, {
          label: 'Adresse affichée sur Google Maps',
          value: props.attributes.address,
          onChange: function (address) { props.setAttributes({ address: address }); },
          help: 'La carte publique se met à jour après l’enregistrement de la page.'
        }),
        el('a', {
          href: 'https://www.google.com/maps?q=' + encodeURIComponent(props.attributes.address),
          target: '_blank', rel: 'noopener noreferrer'
        }, 'Vérifier l’adresse sur Google Maps')
      );
    },
    save: function () { return null; }
  });
})(window.wp.blocks, window.wp.element, window.wp.components, window.wp.blockEditor);
