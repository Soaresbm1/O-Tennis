# O-Tennis

Site du restaurant-buvette O’Tennis à Reconvilier.

Le site reste hébergé sur **GitHub Pages**, avec son domaine géré chez Infomaniak. La gestion des contenus utilise **Pages CMS**, dont le service hébergé est actuellement gratuit : pas besoin de commander un hébergement WordPress.

## Gestion des contenus

- Entrée du gérant : `https://restaurant-buvette-otennis.ch/admin/`.
- [Activation par le propriétaire et guide du gérant](admin/ACTIVATION.md).
- `.pages.yml` définit les formulaires de gestion.
- `data/home.json` contient l’accueil, la photo, les points forts et une annonce temporaire.
- `data/restaurant.json` contient les coordonnées, le logo, les horaires et les réseaux sociaux, partagés entre l’accueil et le pied de page.
- `data/menu.json` contient les 11 catégories initiales et les 91 plats et boissons, avec descriptions, prix, portions et photos facultatives.
- `content.js` charge les données depuis le site avec revalidation du cache et les affiche avec des nœuds texte, sans interpréter de HTML fourni par les champs.

L’activation nécessite une autorisation de l’application Pages CMS pour **ce seul dépôt**, puis une invitation email du gérant depuis ce service. Le propriétaire effectue ces étapes dans son compte ; aucune invitation n’est envoyée automatiquement. Les sauvegardes du gestionnaire sont de vrais commits GitHub et déclenchent la publication GitHub Pages habituelle.

Pour vérifier localement le contenu et sa mise à jour : installer les outils de test avec `npm install --prefix .cms-qa jsdom@26.1.0 yaml@2.8.1`, puis exécuter `node tools/test-content.cjs`. Ces outils ne sont pas chargés par le site. Pour un aperçu manuel : `python -m http.server 8090 --bind 127.0.0.1`, puis ouvrir `http://127.0.0.1:8090/` et `/admin/`.

`tools/import-cms-content.py` a servi à la migration initiale. Il refuse de réécrire les fichiers JSON existants pour préserver les modifications du gérant.

Les fichiers HTML initiaux servent de secours si les données ne peuvent pas être chargées. Les pages publiques chargent les dernières données avec JavaScript ; les aperçus de partage et les navigateurs sans JavaScript peuvent afficher cette copie initiale.
