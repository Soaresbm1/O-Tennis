# Vérifications de la version WordPress

Vérifications effectuées le 24 octobre 2026 :

- 329 blocs des contenus et modèles reconnus comme valides par les bibliothèques de l’éditeur WordPress ; aucun bloc HTML ou classique pour les contenus éditables.
- Analyse syntaxique des fichiers PHP et JavaScript.
- Comparaison automatisée des noms de plats, titres de catégories, listes, prix et cellules du tableau des horaires entre les pages HTML sources et les contenus convertis.
- Import exécuté dans une véritable installation WordPress locale via WordPress Playground, PHP 8.3 et SQLite : deux pages, dix images, accueil statique, logo et carte géographique.
- Deuxième import : aucun doublon et conservation d’un prix modifié.
- Compte de rôle Éditeur : modification des deux pages, droit d’ajouter des photos, absence de droits d’administration, sauvegarde d’un changement d’horaire et conservation de la carte.
- Réponses HTTP 200 de l’accueil et du menu, présence des contenus et absence de jetons de remplacement non résolus.
- Redirections permanentes HTTP 301 de `/index.html` vers `/` et de `/menu.html` vers `/menu/`.

Le navigateur de cette session est indisponible : le rendu visuel et les interactions mobiles restent à contrôler sur la préproduction Infomaniak. Ces vérifications locales ne constituent pas une mise en ligne. La base de production Infomaniak utilisera MySQL/MariaDB, et non la base SQLite de l’environnement de test.
