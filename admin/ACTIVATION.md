# Activer la gestion gratuite du site

Le site reste sur GitHub Pages, avec le domaine Infomaniak actuel. Aucun nouvel hébergement Infomaniak n’est nécessaire.

## Une seule activation par le propriétaire du dépôt

1. Ouvrir https://app.pagescms.org/ et se connecter avec le compte GitHub **Soaresbm1**, propriétaire du dépôt.
2. Installer l’application GitHub **Pages CMS** en sélectionnant **Only select repositories**, puis uniquement **O-Tennis**. Cette autorisation permet au service d’enregistrer les contenus et les images dans ce dépôt.
3. Dans Pages CMS, ouvrir **Soaresbm1 / O-Tennis**, branche **main**. La configuration `.pages.yml` est déjà préparée ; les formulaires sont **Menu du jour**, **Photos du restaurant et des plats**, **Accueil et présentation**, **Coordonnées et horaires**, **Carte — plats, boissons et prix**.
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
5. Pour ajouter ou supprimer un article, utiliser les boutons de sa liste. Une catégorie possède un repère unique sans espace ni accent : les liens de navigation sont reconstruits automatiquement à partir de ces repères. **Nom court de l’onglet** est facultatif ; il permet d’abréger le bouton sans changer le titre de la catégorie. L’ordre des catégories dans la liste détermine celui de la carte ; les plats sont initialement placés avant les boissons.
6. Pour les horaires, activer **Fermé ce jour** ou renseigner les heures au format `10:00` / `22:30`. L’indicateur ouvert/fermé et les horaires du jour utilisent ces données, selon l’heure suisse. Le jour courant est mis en évidence dans la semaine.
7. Pour une photo, utiliser le sélecteur d’image et téléverser un fichier JPG, PNG, WebP ou AVIF. Donner un nom simple au fichier. Une photo de plat est facultative.
8. **Annonce temporaire** sur l’accueil permet d’afficher une information de congés ou d’événement. Vider le champ pour la retirer. Saisir les congés aussi dans **Congés et fermetures exceptionnelles** pour mettre à jour l’indicateur ouvert/fermé. Utiliser **Menu du jour** pour le menu quotidien.

Les changements sont enregistrés dans GitHub, partagés avec tous les visiteurs et conservés dans son historique. Ils peuvent mettre quelques minutes à devenir visibles le temps que GitHub Pages republie le site. Actualiser la page publique pour voir la dernière version.

## Publier le menu du jour depuis un téléphone ou un ordinateur

1. Ouvrir l’espace de gestion, puis le formulaire **Menu du jour**.
2. Ajouter un menu dans **Menus par date**, ou ouvrir le menu de la date souhaitée pour le corriger.
3. Choisir la **Date du menu**, saisir le **Plat principal et accompagnement** et le **Prix du menu**, par exemple `21.50 CHF`.
4. Ajouter, si souhaité, l’**Entrée**, le **Dessert** et une **Photo facultative**. Les rubriques laissées vides ne s’affichent pas.
5. Cliquer sur **Save / Enregistrer**, attendre quelques minutes puis vérifier l’accueil ou la page de la carte.

Un seul menu est affiché par jour, sur l’accueil et sur la page de la carte. Utiliser **une seule entrée par date** ; en cas de doublon, le premier menu de cette date dans la liste est utilisé. Pour corriger un menu, modifier son entrée existante.

Vous pouvez préparer toute la semaine à l’avance : les menus futurs restent masqués jusqu’au jour choisi. La date de référence est celle de la Suisse (**Europe/Zurich**), même si un visiteur consulte le site depuis un autre fuseau horaire. Une fois sa date passée, un menu est automatiquement masqué. Sans menu pour aujourd’hui, aucun bloc « Menu du jour » n’est affiché. Il n’est pas nécessaire de supprimer les menus passés pour les masquer.

Pour retirer le menu d’aujourd’hui, supprimer son entrée et enregistrer. Pour masquer tous les menus, vider la liste **Menus par date** et enregistrer. La liste est vide au départ afin de ne pas publier de menu fictif.

## Gérer la galerie

Ouvrir **Photos du restaurant et des plats**, puis ajouter ou modifier une entrée dans **Photos de la galerie**. Choisir la **Photo**, décrire ce qu’elle montre dans **Description de la photo**, puis saisir sa **Légende**. Le **Prix facultatif** peut rester vide ; lorsqu’il est renseigné, conserver le même prix que dans la carte. Enregistrer pour publier.

Les photos s’affichent sur l’accueil et peuvent être agrandies au clic. L’ordre des entrées détermine celui de la galerie. Supprimer une entrée retire la photo de cette galerie ; vider la liste masque la section.

## Réservation, accès et fermetures

Dans **Coordonnées et horaires** :

- Modifier **Téléphone** met à jour les boutons **Réserver / Appeler**. La réservation se fait par téléphone.
- **Consigne pour les groupes** et **Plats à commander à l’avance** alimentent les encadrés de réservation de l’accueil et de la carte. Mettre à jour les plats concernés et le délai lorsqu’ils changent ; vider un champ masque sa consigne.
- **Adresse sur Google Maps** sert aux boutons **Itinéraire** et à la carte d’accès.
- Pour des congés, ajouter une période dans **Congés et fermetures exceptionnelles**. Choisir le **Premier jour fermé**, le **Dernier jour fermé** et le **Motif affiché**. Les deux dates sont comprises et la fin doit être égale ou postérieure au début. Pour une seule journée, choisir la même date dans les deux champs.

Les fermetures exceptionnelles portent sur des journées entières. L’indicateur affiche la fermeture et son motif pendant la période, puis reprend automatiquement les horaires habituels. Une liste de fermetures vide applique uniquement les horaires de la semaine. Les horaires et fermetures sont évalués selon **Europe/Zurich**, quel que soit le fuseau du visiteur ; les onglets ouverts sont revérifiés régulièrement.

## Fonctionnement

Les textes sont dans `data/home.json`, les coordonnées, horaires et consignes de réservation dans `data/restaurant.json`, la carte dans `data/menu.json`, les menus du jour dans `data/daily-menu.json`, la galerie dans `data/gallery.json`, les photos dans `image/`. Les formulaires modifient ces fichiers ; le site les charge depuis son propre domaine. Aucune donnée de connexion n’est envoyée par le site public et aucun changement n’est stocké seulement dans le navigateur du gérant.

Le HTML existant sert de secours si JavaScript est désactivé ou si un fichier de contenu ne peut pas être chargé. Dans ce cas, cette copie initiale reste affichée et peut être plus ancienne que les données du gestionnaire. Les robots de partage qui n’exécutent pas JavaScript utilisent aussi les balises initiales. Le domaine, les DNS et les fichiers du dépôt GitHub restent sous le contrôle du propriétaire.

Le menu du jour nécessite JavaScript et le chargement de ses données. Si elles sont indisponibles, le bloc reste masqué ; aucun ancien menu n’est présenté comme celui d’aujourd’hui.

Cette solution utilise le site HTML existant et fonctionne sans WordPress.
