# Rapport d'usage de l'IA — TP1, TP2, TP3

## Modèle utilisé
Claude (Anthropic) dans Claude.ai.
Je n'ai pas de compteur de tokens visible dans l'interface claude.ai ; je n'ai donc pas de
chiffre exact. La consommation détaillée est disponible via l'API Anthropic (docs.claude.com).

**Méthode de travail** :j'ai utilisé l'assistant comme un guide pour comprendre l'architecture du
projet et obtenir des exemples de code par étapes. Je n'ai rien appliqué sans le tester : chaque
bloc a été intégré dans VS Code, vérifié dans le navigateur et dans les DevTools, puis corrigé
quand il ne fonctionnait pas. J'ai identifié moi-même plusieurs problèmes (affichage du menu
après rechargement, recherche limitée à la page courante, configuration de test) et j'ai décidé
du design de l'interface. Je travaille seule (monôme).

---

# TP1 — Authentification et profil

## Préparation (Atlas, backend, frontend)
- **Objectif** : backend connecté à MongoDB Atlas, frontend relié au backend.
- **Prompt principal** : aide pour configurer `backend/.env` (URI Atlas, `JWT_SECRET`, `PORT`).
- **Proposé par l'agent** : remplacer `<db_password>`, ajouter le nom de base avant le `?`, passer `PORT` à 3000.
- **Ce que j'ai fait** : création du cluster et de l'utilisateur Atlas, édition du `.env`, `npm install` et `npm start`.
- **Vérifications** : `/api/health` renvoie `{"status":"ok"}` ; utilisateur « Demo » visible dans Atlas ; `git check-ignore` confirme que `.env` est ignoré.
- **Erreur rencontrée** : `EADDRINUSE` sur le port 3000, car l'ancien backend tournait encore. Je l'ai conservé et j'ai lancé le frontend dans le terminal libre.
- **Fichiers** : `backend/.env` (non versionné).

## Mission 0 — Cartographie
- **Objectif** : repérer composant racine, routes, `HttpClient`, intercepteur JWT.
- **Proposé par l'agent** : tableau récapitulatif et schéma du flux de connexion (2 images dans `captures/`).
- **Vérification** : relecture des fichiers cités. Aucun fichier modifié.

## Mission 1 — Inscription, connexion, profil
- **Objectif** : déconnexion, gestion du 401, validations, profil chargé automatiquement.
- **Proposé par l'agent** : 4 blocs de code (voir fichiers ci-dessous), appliqués et testés un par un.
- **Ce que j'ai fait** : application des blocs, tests manuels (déconnexion, formulaires vides, mauvais mot de passe, `/profile`), vérification de l'onglet Problems.
- **Fichiers** : `app.ts`, `app.html`, `auth.interceptor.ts`, `register-page.ts/.html`, `login-page.ts/.html`, `profile-page.ts`.
- **Preuves** : menu « Demo » + Déconnexion ; messages de validation ; « Email déjà utilisé » ; « Identifiants incorrects ».
- **Problème trouvé** : après rechargement, le menu affichait parfois « Connexion » malgré un token valide. Correction dans `auth.service.ts` : si un token existe au démarrage, appel de `GET /api/users/me`.

## Checkpoint Network
- Connexion réussie : `POST /api/auth/login` → 200.
- Connexion refusée : `POST /api/auth/login` → 401 ![401](captures/network-connexion-refusee.png)
- Lecture du profil : `GET /api/users/me` → 200 ![me](captures/network-me-entetes.png)

## Signal vs localStorage
Un Signal est un état réactif en mémoire : il met l'interface à jour automatiquement mais disparaît au
rechargement. `localStorage` est persistant mais ne met pas l'interface à jour. Le JWT est donc stocké
dans `localStorage`, et le Signal `currentUser` est resynchronisé au démarrage via `/api/users/me`.

## Traces du backend
Dans le terminal où `npm start` a été lancé pour `backend/` : lignes `[http] MÉTHODE /chemin -> code`.

---

# TP2 — Bibliothèque, upload et lecture audio

## Mission 2 — Bibliothèque paginée
- **Constat** : `TrackService.list(page, limit)`, les Signals et les boutons Préc./Suiv. existaient déjà dans le projet fourni (relu et vérifié). J'ai ajouté le Signal `error`.
- **Preuve** : `GET /api/tracks?page=2&limit=5` à chaque changement de page ![page2](captures/network-pagination-page2.png)

## Mission 3 — Upload et lecture
- **Proposé par l'agent** : validation du fichier avant envoi (type, 25 Mo), états d'envoi, messages succès/erreur, cards, révocation de l'`ObjectURL` dans `ngOnDestroy`.
- **Ce que j'ai fait** : application, tests (upload, lecture, pagination), captures Network.
- **Fichiers** : `tracks-page.ts`, `tracks-page.html`, `tracks-page.css`.
- **Preuves** : upload multipart avec `audio` et `title` ![upload](captures/network-upload-multipart.png) ; réponse audio `Content-Type: audio/mpeg` ![audio](captures/network-audio-content-type.png).
- **Flux** : upload = `choose()` → `TrackService.upload()` (`FormData` avec `audio` et `title`) → `POST /api/tracks`. Lecture = `TrackService.audio()` (Blob via `HttpClient`) → `URL.createObjectURL` → `<audio>`.
- **Pourquoi un Blob** : une URL placée directement dans `src` est chargée par le navigateur hors d'`HttpClient`, donc l'intercepteur n'ajoute pas l'en-tête `Authorization`.
- **Validation frontend vs backend** : le frontend améliore l'expérience, mais peut être contourné ; seul le backend protège réellement.

## Questions mémoire / buffering / streaming
- Le backend peut envoyer le fichier par flux depuis le disque, sans le charger entièrement en mémoire.
- Avec `responseType: 'blob'`, le composant reçoit le fichier une fois la réponse entièrement reçue.
- La liste ne charge que les métadonnées ; l'audio n'est téléchargé qu'au clic sur ▶.
- 100 `<audio src>` directs : requêtes sans `Authorization` (donc 401) et préchargement possible par le navigateur.
- `revokeObjectURL` libère le Blob en mémoire, sinon la mémoire s'accumule.

---

# TP3 — Suppression, progression, tests

## Mission 5 — Suppression
- **Proposé par l'agent** : `TrackService.delete()`, confirmation, état anti-double-clic, notification, gestion des 404 et 403.
- **Choix** : Angular Material n'est pas installé dans le projet, j'ai donc réalisé un SnackBar simple (`SnackbarService` + composant).
- **Fichiers** : `track.service.ts`, `snackbar.service.ts`, `snackbar.ts`, `tracks-page.ts/.html`.
- **Preuve** : `DELETE /api/tracks/:id` → 204 ![delete](captures/network-delete.png)
- **Sécurité** : le guard et l'interface ne protègent que l'affichage ; le backend vérifie le JWT et le propriétaire de la piste.

## Mission 6 — Progression de l'upload
- `reportProgress: true` et `observe: 'events'` : le flux émet plusieurs événements (`UploadProgress`, puis `Response`), le pourcentage vaut `loaded / total`. Un upload simple n'émet qu'une réponse finale.
- En local, l'envoi est si rapide que la barre s'affiche moins d'une seconde.

## Mission 7 — Tests
- 3 fichiers, 5 tests : `track.service.spec.ts` (page/limit, DELETE), `auth.service.spec.ts` (POST login), `auth.interceptor.spec.ts` (header présent/absent).
- Résultat attendu : tous verts. Résultat observé : `Test Files 3 passed, Tests 5 passed` ![tests](captures/tests-frontend.png)
- Problèmes rencontrés : paquet `jsdom` manquant (installé) et configuration `development` absente dans `angular.json` (ajoutée).
- Les tests simulent le HTTP : ni backend ni MongoDB nécessaires.
- `npm run build` : **[À COMPLÉTER après exécution]**

## Ajouts personnels (hors sujet)
Thème violet avec mode sombre, recherche par titre sur toute la bibliothèque, badge de format, notes de musique animées en fond.
