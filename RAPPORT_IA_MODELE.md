# Rapport d'usage de l'IA — TP1

## Modèle utilisé

Assistant : Claude (Anthropic), dans Claude.ai.
Modèle : Claude Sonnet 5 (vérifié dans le sélecteur de modèle de l'interface).
Je n'ai pas suivi précisément ma consommation de tokens au fil du TP ; la documentation
Anthropic (docs.claude.com) explique où consulter cette information selon l'interface
utilisée (claude.ai, API).

---

## Préparation (Atlas, backend, frontend)

**Objectif** : obtenir un backend connecté à MongoDB Atlas et un frontend qui communique
avec lui en local, avant de commencer le TP.

**Prompt principal** : question ponctuelle sur la configuration du `.env` du backend
(`MONGODB_URI`, `JWT_SECRET`, `PORT`), à partir d'une capture d'écran du fichier en cours de
modification dans VS Code.

**Plan proposé par l'agent** : vérifier que `<db_password>` et les chevrons avaient bien été
remplacés par le vrai mot de passe de l'utilisateur Atlas, corriger `PORT` (`6000` → `3000`
pour correspondre à `proxy.conf.json`), ajouter le nom de la base (`guitar-practice-cloud`)
dans l'URI avant le `?`.

**Ce que j'ai fait moi-même** : création du cluster et de l'utilisateur dans Atlas, édition
du fichier `.env`, lancement de `npm install` et `npm start` dans `backend/`, puis du
frontend.

**Vérifications réalisées** : ouverture de `http://localhost:3000/api/health` (réponse
`{"status":"ok"}`), vérification dans Atlas → Browse Collections que la base et la
collection `users` existaient avec le compte « Demo », `git status` + `git check-ignore -v
backend/.env` pour confirmer que `.env` n'était jamais suivi par Git.

**Erreurs rencontrées** : une tentative de `npm start` a échoué avec `EADDRINUSE` sur le
port 3000, car un ancien processus backend tournait encore après la fermeture accidentelle
d'un terminal ; corrigé en relançant depuis un nouveau terminal.

**Fichiers modifiés** : `backend/.env` (non versionné, créé à partir de `.env.example`).

**Preuve de fonctionnement** : capture de la collection `users` dans Atlas avec le document
`Demo`, capture du terminal backend montrant `[startup] Connecté à MongoDB Atlas`.

**Ce que je sais maintenant expliquer sans l'agent** : la différence entre `.env` et
`.env.example`, pourquoi `.env` ne doit jamais être commité, le rôle de `Network Access`
dans Atlas, et comment relancer backend et frontend après un redémarrage du PC.

---

## Mission 0 — Cartographie de l'application

**Objectif** : identifier les responsabilités de chaque fichier Angular avant toute
modification (composant racine, routes, `HttpClient`, intercepteur JWT).

**Prompt principal** : demande d'aide pour localiser dans le projet fourni le composant
racine, les routes, l'enregistrement de `HttpClient` et le mécanisme d'ajout du JWT.

**Plan proposé par l'agent** : repérage dans `main.ts`, `routes.ts`,
`app/components/app/app.ts`, `shared/services/auth.service.ts`,
`shared/interceptors/auth.interceptor.ts`, restitué sous forme de tableau récapitulatif et
d'un schéma en deux parties (flux Angular → proxy, puis backend → retour Angular).

**Vérifications réalisées** : relecture manuelle des fichiers cités, pour confirmer que les
informations correspondaient au code réel du projet avant de les retenir.

**Fichiers modifiés** : aucun (mission d'observation).

**Preuve de fonctionnement** : schéma annoté du flux de connexion, en deux images
(`schema-frontend.png`, `schema-backend-retour.png`).

**Ce que je sais maintenant expliquer sans l'agent** : le trajet complet d'un clic sur « Se
connecter » (template → composant → service → `HttpClient` → proxy → Express → MongoDB →
réponse → `storeAuthentication()` → Signals → redirection), et où se trouve le code qui
ajoute l'en-tête `Authorization`.

---

## Mission 1 — Inscription, connexion et profil

**Objectif** : compléter la partie utilisateur du frontend : déconnexion, gestion du 401,
validations de formulaire, profil chargé automatiquement.

**Prompt principal** : demande d'aide pour corriger les manques identifiés lors de la
cartographie (pas de bouton de déconnexion, pas de gestion du 401, validations
insuffisantes, profil non auto-chargé).

**Plan proposé par l'agent** : quatre blocs de code à implémenter puis tester un par un :
1. `app.ts` / `app.html` : injection d'`AuthService`, méthode `logout()`, affichage
   conditionnel du menu selon `auth.currentUser()`.
2. `auth.interceptor.ts` : `catchError` pour détecter un `401`, appeler `auth.logout()` et
   rediriger vers `/login`.
3. `register-page.ts/.html` et `login-page.ts/.html` : `Validators.email`,
   `Validators.minLength(8)`, message d'erreur par champ.
4. `profile-page.ts` : `ngOnInit()` appelant `load()` automatiquement.

**Ce que j'ai fait moi-même** : application de chaque bloc de code dans VS Code, lecture et
compréhension de chaque ligne avant de l'enregistrer, tests manuels dans Chrome après chaque
étape.

**Vérifications réalisées** : à chaque bloc, rechargement de la page et test manuel (clic
sur Déconnexion, soumission de formulaires vides, connexion avec mauvais mot de passe,
navigation directe vers `/profile`) ; vérification de l'onglet *Problems* de VS Code après
chaque modification.

**Erreurs rencontrées** : un avertissement préexistant sur `tsconfig.app.json` (non lié au
code modifié) a été repéré et identifié comme déjà présent avant toute modification.

**Fichiers modifiés** :
- `app/components/app/app.ts`, `app.html`
- `app/shared/interceptors/auth.interceptor.ts`
- `app/components/register-page/register-page.ts`, `.html`
- `app/components/login-page/login-page.ts`, `.html`
- `app/components/profile-page/profile-page.ts`

**Preuve de fonctionnement** :
- menu affichant « Demo » + bouton Déconnexion après connexion ;
- messages de validation affichés sur les trois champs du formulaire d'inscription ;
- message serveur « Email déjà utilisé » après tentative avec un email existant ;
- message « Identifiants incorrects » après connexion refusée ;
- profil affiché sans clic sur `/profile`.

**Ce que je sais maintenant expliquer sans l'agent** : pourquoi le guard seul ne suffit pas,
la différence entre validation `Validators` côté formulaire et validation backend, le rôle
de `markAllAsTouched()`, et pourquoi l'intercepteur est le bon endroit pour gérer un `401`.

---

## Checkpoint Network

### 1. Connexion réussie
`POST /api/auth/login` → statut `200`.

### 2. Connexion refusée
![Connexion refusée](captures/network-connexion-refusee.png)
`POST /api/auth/login` → statut `401`, réponse `{"message":"Identifiants incorrects"}`.

### 3. Lecture de /api/users/me
![GET /api/users/me](captures/network-me-entetes.png)
`GET /api/users/me` → statut `200 OK`.

## Signal vs localStorage

- `Signal` (`currentUser`, `token`) : état réactif en mémoire, propre à l'instance de
  l'application dans l'onglet ouvert. Il pilote automatiquement l'affichage dès qu'il
  change, mais disparaît si la page est rechargée.
- `localStorage` : stockage persistant dans le navigateur, qui survit au rechargement de la
  page. Le JWT y est sauvegardé pour que la connexion ne soit pas perdue à chaque F5, mais
  lui seul ne met pas l'interface à jour : au démarrage d'`AuthService`, si un token existe
  déjà, le service rappelle `GET /api/users/me` pour resynchroniser le Signal `currentUser`
  avec `localStorage`.

## Où trouver les traces du backend

Dans le terminal où `npm start` a été lancé pour `backend/` : chaque requête y affiche une
ligne `[http] MÉTHODE /chemin -> code (durée)`. Si ce terminal est fermé, les traces ne sont
plus visibles tant que le backend n'est pas relancé.
