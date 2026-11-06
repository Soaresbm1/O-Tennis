# Installer O’Tennis sur WordPress chez Infomaniak

L’archive `otennis-wordpress.zip` contient le thème à téléverser dans WordPress. Elle reprend l’apparence du site actuel et fournit l’accueil et l’intégralité de la carte sous forme de blocs modifiables, sans Elementor, Divi ou extension payante.

## 1. Préparer WordPress

1. Dans le Manager Infomaniak, ouvrir **Hébergement Web**, puis l’hébergement du restaurant.
2. Préparer un site de préproduction ou un sous-domaine, par exemple `test.restaurant-buvette-otennis.ch`, et y installer WordPress via l’installateur Infomaniak. Choisir le thème officiel provisoire, puisque le thème O’Tennis sera installé ensuite.
3. Utiliser PHP 8.3 ou supérieur et activer HTTPS.
4. Dans WordPress → **Réglages → Général**, renseigner le titre `O’Tennis`, le slogan `Restaurant - Buvette chez Kryste`, la langue française et le fuseau horaire de Zurich.
5. Dans **Réglages → Permaliens**, choisir **Titre de la publication** et enregistrer.

Le site public actuel contient déjà des fichiers HTML : installer d’abord sur un emplacement de préproduction évite de l’écraser. Conserver une sauvegarde des fichiers et de toute base existante avant la bascule.

Guide officiel Infomaniak : https://www.infomaniak.com/fr/support/faq/1931/installer-rapidement-wordpress-desinstaller

## 2. Installer le thème et les contenus

1. Ouvrir **Apparence → Thèmes → Ajouter un thème → Téléverser un thème**.
2. Sélectionner `otennis-wordpress.zip`, installer, puis activer **O’Tennis**.
3. Ouvrir **Apparence → Installation O’Tennis**.
4. Cliquer sur **Installer les pages O’Tennis**. Cela publie les pages Accueil et Menu, importe les photos dans la médiathèque et configure l’accueil. Les autres pages ne sont pas supprimées. Si une page appelée Menu existe déjà, WordPress attribue une adresse disponible à la nouvelle page.
5. Ouvrir les deux pages et vérifier les textes, les prix, les horaires, les photos et les coordonnées.
6. Dans **Apparence → Éditeur**, vérifier le logo, le titre, la navigation et le pied de page.

L’import initial conserve les identifiants des pages et des médias. Il ne réécrit pas une page déjà importée lors d’une reprise. Une réactivation du thème ne réimporte aucun contenu et ne remplace aucune modification.

## 3. Donner accès au gérant

Dans **Comptes / Utilisateurs → Ajouter**, créer un compte personnel avec le rôle **Éditeur**. Ce rôle permet de modifier et publier les pages et d’ajouter des photos. Le gérant n’a pas besoin d’un compte Infomaniak.

L’en-tête, le logo, la navigation et le pied de page sont accessibles via **Apparence → Éditeur**, avec un compte administrateur. Les coordonnées présentes dans le pied de page se modifient séparément de celles de la page Accueil.

Le guide `GUIDE-GERANT.md` détaille les modifications courantes.

## 4. Basculer sur le domaine public

Une fois la préproduction vérifiée, migrer cette installation sur le domaine définitif avec les outils de l’hébergeur ou une migration WordPress incluant une substitution des URL compatible avec les données sérialisées. Mettre à jour les adresses WordPress et du site et vérifier HTTPS.

**Déplacer les anciens `index.html`, `menu.html`, `404.html`, `robots.txt` et `sitemap.xml` hors du répertoire public**, en gardant leur sauvegarde. Sinon le serveur peut servir les anciens fichiers avant WordPress ou annoncer les anciennes URL aux moteurs de recherche. Les autres fichiers statiques historiques peuvent également être archivés une fois la migration vérifiée.

Le thème redirige les anciennes adresses `/index.html` vers l’accueil et `/menu.html` vers la nouvelle page Menu avec une redirection permanente, à condition que la requête arrive bien dans WordPress. Vérifier ces deux adresses après la bascule et réenregistrer les permaliens si nécessaire. Le sitemap WordPress se trouve à `/wp-sitemap.xml`.

Vérifier l’accueil et Menu sur ordinateur et téléphone, le menu mobile, les ancres de catégories, le clic sur le téléphone, l’email, la carte et les anciennes URL. Faire aussi une modification de prix et d’horaire avec le compte du gérant, puis vérifier le résultat public. Activer ensuite les mises à jour et les sauvegardes de l’hébergement.

## Contenu de l’archive

Le ZIP est un **thème WordPress**, pas une installation complète de WordPress ni une sauvegarde de base de données. Il s’installe via le tableau de bord WordPress ; déposer son ZIP dans le dossier public ne suffit pas.

Les pages et les photos importées sont enregistrées dans WordPress et restent présentes même si le thème change. La carte géographique utilise un bloc fourni par ce thème : conserver le thème actif pour l’afficher. Les polices restent hébergées localement ; Google Maps reste un service externe comme sur le site initial.
