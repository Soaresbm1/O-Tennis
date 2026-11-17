# O-Tennis

Site du restaurant-buvette O’Tennis à Reconvilier.

Le site reste hébergé sur **GitHub Pages**, avec son domaine géré chez Infomaniak. La gestion des contenus utilise **Pages CMS**, dont le service hébergé est actuellement gratuit : pas besoin de commander un hébergement WordPress.

## Gestion des contenus

- Entrée du gérant : `https://restaurant-buvette-otennis.ch/admin/`.
- [Activation par le propriétaire et guide du gérant](admin/ACTIVATION.md).
- `.pages.yml` définit les formulaires de gestion.
- **Menu du jour** permet de choisir une date, saisir le plat et le prix, puis ajouter une entrée et un dessert facultatifs. Son affichage est sans photo. Plusieurs jours peuvent être préparés à l’avance.
- `data/home.json` contient l’accueil, la photo, les points forts et une annonce temporaire.
- `data/restaurant.json` contient les coordonnées, le logo, les horaires, les fermetures exceptionnelles, les consignes de réservation et les réseaux sociaux. Le téléphone et l’adresse alimentent aussi les boutons d’appel et d’itinéraire.
- `data/menu.json` contient la carte, avec descriptions, prix, portions et photos facultatives. Les catégories présentent d’abord les plats, puis les boissons ; leur ordre et le nom court de chaque onglet (`navLabel`, facultatif) sont modifiables dans le gestionnaire.
- **Photos du restaurant et des plats** gère `data/gallery.json` : photo, description et légende, avec prix facultatif. La liste vide masque la galerie.
- `data/daily-menu.json` contient la liste des menus par date. Seul le menu de la date courante en **Europe/Zurich** est affiché sur l’accueil et la page de la carte ; les dates passées ou futures restent masquées. La liste vide initiale masque ce bloc. Prévoir un seul menu par date ; en cas de doublon, le premier de cette date est utilisé.
- `content.js` charge les données depuis le site avec revalidation du cache et les affiche avec des nœuds texte, sans interpréter de HTML fourni par les champs.

L’activation nécessite une autorisation de l’application Pages CMS pour **ce seul dépôt**, puis une invitation email du gérant depuis ce service. Le propriétaire effectue ces étapes dans son compte ; aucune invitation n’est envoyée automatiquement. Les sauvegardes du gestionnaire sont de vrais commits GitHub et déclenchent la publication GitHub Pages habituelle.

## Accès rapides et présentation

- Boutons **Réserver / Appeler** dans l’en-tête, l’accueil et les blocs de réservation.
- Indicateur ouvert/fermé, horaires du jour et jour courant mis en évidence dans la semaine. `opening-hours.js` utilise l’heure **Europe/Zurich**, les horaires enregistrés et les congés (`closures`, dates `start` et `end` incluses, motif `reason`). Un horaire incohérent affiche « Horaires à confirmer ».
- Galerie de la salle, de la terrasse et des plats en carrousel : défilement au doigt, flèches et navigation au clavier, avec agrandissement des photos. Trois photos sont visibles sur ordinateur, deux sur tablette et une sur téléphone.
- Carte par onglets, navigation au clavier et liens directs vers les catégories ; les plats précèdent les boissons dans le contenu initial.
- Boutons **Itinéraire** ouvrant le trajet Google Maps vers l’adresse du restaurant.
- Consignes pour les groupes (`groupReservation`) et les commandes anticipées (`preorderNote`), modifiables dans **Coordonnées et horaires**.

## Vérification locale

Installer les outils avec `npm install --prefix .cms-qa jsdom@26.1.0 yaml@2.8.1`, puis exécuter :

```text
node tools/test-content.cjs
node tools/test-daily-menu.cjs
node tools/test-opening-hours.cjs
node tools/test-menu-tabs.cjs
node tools/test-gallery.cjs
node tools/test-gallery-carousel.cjs
```

Ces outils ne sont pas chargés par le site. Pour un aperçu manuel : `python -m http.server 8090 --bind 127.0.0.1`, puis ouvrir `http://127.0.0.1:8090/`, `/menu.html` et `/admin/`.

Avec cet aperçu en cours, `node tools/test-visitor-flow.cjs` vérifie aussi le chargement réel des pages, scripts, données et photos, les onglets, le menu mobile, l’appel et l’itinéraire.

`tools/import-cms-content.py` a servi à la migration initiale. Il refuse de réécrire les fichiers JSON existants pour préserver les modifications du gérant.

Les fichiers HTML initiaux servent de secours si les données ne peuvent pas être chargées. Les pages publiques chargent les dernières données avec JavaScript ; les aperçus de partage et les navigateurs sans JavaScript peuvent afficher cette copie initiale.

Le menu du jour reste masqué si JavaScript est désactivé ou si ses données ne peuvent pas être chargées, pour éviter de présenter un menu périmé. Le formulaire est configuré dans les fichiers du projet ; l’accès de la gérante dépend toujours de l’activation Pages CMS et de son invitation par le propriétaire.
