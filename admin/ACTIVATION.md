# Activer la gestion gratuite du site

Le site reste sur GitHub Pages, avec le domaine Infomaniak actuel. Aucun nouvel hébergement Infomaniak n’est nécessaire.

## Une seule activation par le propriétaire du dépôt

1. Ouvrir https://app.pagescms.org/ et se connecter avec le compte GitHub **Soaresbm1**, propriétaire du dépôt.
2. Installer l’application GitHub **Pages CMS** en sélectionnant **Only select repositories**, puis uniquement **O-Tennis**. Cette autorisation permet au service d’enregistrer les contenus et les images dans ce dépôt.
3. Dans Pages CMS, ouvrir **Soaresbm1 / O-Tennis**, branche **main**. La configuration `.pages.yml` est déjà préparée ; les formulaires sont **Accueil et présentation**, **Coordonnées et horaires**, **Carte — plats, boissons et prix**.
4. Dans la gestion des collaborateurs de Pages CMS, inviter l’adresse email du gérant. C’est cette invitation qui lui donne accès ; aucune adresse n’est préautorisée dans les fichiers publics. Il n’a pas besoin d’un compte GitHub.
5. Faire une modification de test, enregistrer, attendre la publication GitHub Pages puis vérifier le site public. Pour revenir en arrière, modifier à nouveau le champ ou rétablir la version précédente du fichier dans l’historique GitHub.

L’installation de l’application et l’invitation doivent être effectuées par le propriétaire. Elles ne sont pas réalisées automatiquement par les fichiers du site. N’ajouter aucun mot de passe ou jeton GitHub dans le dépôt.

Documentation officielle :
- https://pagescms.org/docs/quick-start/
- https://pagescms.org/docs/configuration/collaborators/
- https://pagescms.org/ (gratuité actuelle du service hébergé)

## Utilisation par le gérant

1. Ouvrir `https://restaurant-buvette-otennis.ch/admin/` puis **Se connecter à la gestion**. La connexion et l’édition se font dans le service Pages CMS.
2. Utiliser l’adresse email invitée et suivre la connexion proposée par le service.
3. Choisir le formulaire voulu, modifier les informations puis cliquer sur **Save / Enregistrer**.
4. Pour changer un prix, ouvrir **Carte — plats, boissons et prix**, développer la catégorie, le groupe puis le plat. Les prix sont du texte : conserver l’indication CHF. Pour plusieurs portions, modifier chaque prix dans **Portions ou tailles**.
5. Pour ajouter ou supprimer un article, utiliser les boutons de sa liste. Une catégorie possède un repère unique sans espace ni accent : les liens de navigation sont reconstruits automatiquement à partir de ces repères.
6. Pour les horaires, activer **Fermé ce jour** ou renseigner les heures au format `10:00` / `22:30`. Les coordonnées du pied de page et les données destinées aux moteurs de recherche utilisent les mêmes informations.
7. Pour une photo, utiliser le sélecteur d’image et téléverser un fichier JPG, PNG, WebP ou AVIF. Donner un nom simple au fichier. Une photo de plat est facultative.
8. **Annonce temporaire** sur l’accueil permet d’afficher une information de congés, d’événement ou de plat du jour. Vider le champ pour la retirer.

Les changements sont enregistrés dans GitHub, partagés avec tous les visiteurs et conservés dans son historique. Ils peuvent mettre quelques minutes à devenir visibles le temps que GitHub Pages republie le site. Actualiser la page publique pour voir la dernière version.

## Fonctionnement

Les textes sont dans `data/home.json`, les coordonnées et horaires dans `data/restaurant.json`, la carte dans `data/menu.json`, les photos dans `image/`. Les formulaires modifient ces fichiers ; le site les charge depuis son propre domaine. Aucune donnée de connexion n’est envoyée par le site public et aucun changement n’est stocké seulement dans le navigateur du gérant.

Le HTML existant sert de secours si JavaScript est désactivé ou si un fichier de contenu ne peut pas être chargé. Dans ce cas, cette copie initiale reste affichée et peut être plus ancienne que les données du gestionnaire. Les robots de partage qui n’exécutent pas JavaScript utilisent aussi les balises initiales. Le domaine, les DNS et les fichiers du dépôt GitHub restent sous le contrôle du propriétaire.

Cette solution utilise le site HTML existant et fonctionne sans WordPress.
