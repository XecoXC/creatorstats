# 🚀 CreatorStats — Guide de déploiement

## Ce que tu as dans ce dossier

```
creatorstats/
├── index.html        → Le dashboard complet
├── manifest.json     → Config PWA (app mobile)
├── sw.js             → Service worker (mode offline)
├── vercel.json       → Config déploiement Vercel
└── icons/            → Icônes app (toutes tailles)
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```

---

## ÉTAPE 1 — Mettre en ligne sur Vercel (5 min)

### Option A — Via GitHub (recommandé)

1. Crée un compte sur **github.com** si t'en as pas
2. Crée un nouveau repo : github.com/new → nom : `creatorstats`
3. Upload tous les fichiers de ce dossier dans le repo
4. Va sur **vercel.com** → "Sign up" avec ton compte GitHub
5. Clique "Add New Project" → importe ton repo `creatorstats`
6. Clique "Deploy" → c'est en ligne en 30 secondes

✅ Tu reçois une URL : `creatorstats.vercel.app`

### Option B — Sans GitHub (encore plus rapide)

1. Va sur **vercel.com/new**
2. Fais glisser tout le dossier `creatorstats/` dans la page
3. Clique "Deploy"

Done.

---

## ÉTAPE 2 — Domaine personnalisé (optionnel, ~10€/an)

1. Achète un domaine sur **namecheap.com** ou **cloudflare.com**
   → Exemple : `creatorstats.io` (~10€/an)
2. Dans Vercel → ton projet → "Settings" → "Domains"
3. Ajoute ton domaine → Vercel te donne 2 records DNS à copier
4. Dans ton registrar (Namecheap/Cloudflare) → colle les records
5. Attends 5-30 min → ton site est sur ton domaine

---

## ÉTAPE 3 — PWA : installable comme une app mobile

Une fois le site en ligne, les utilisateurs peuvent l'installer
comme une vraie app sur leur téléphone :

### Sur Android (Chrome)
1. Ouvre le site dans Chrome
2. Menu (3 points) → "Ajouter à l'écran d'accueil"
3. L'icône CreatorStats apparaît → ça s'ouvre comme une app native

### Sur iPhone (Safari)
1. Ouvre le site dans Safari
2. Bouton partage (carré avec flèche) → "Sur l'écran d'accueil"
3. Même résultat

### Sur desktop (Chrome/Edge)
1. Une icône d'installation apparaît dans la barre d'adresse
2. Clique → "Installer CreatorStats"
3. S'ouvre comme une fenêtre app sans navigateur

---

## ÉTAPE 4 — Brancher le vrai Google OAuth (optionnel)

Pour l'instant le "Login avec Google" est simulé.
Pour le rendre réel, 2 options :

### Option A — Firebase Auth (gratuit, 30 min)
1. Va sur console.firebase.google.com
2. Crée un projet → "Authentication" → "Google" → Active
3. Copie la config Firebase
4. Ajoute dans index.html avant </body> :
   ```html
   <script src="https://www.gstatic.com/firebasejs/10.x.x/firebase-app.js"></script>
   <script src="https://www.gstatic.com/firebasejs/10.x.x/firebase-auth.js"></script>
   ```
5. Remplace la fonction loginWithGoogle() par :
   ```js
   import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
   const provider = new GoogleAuthProvider();
   signInWithPopup(auth, provider).then(result => {
     completeLogin({ name: result.user.displayName, email: result.user.email, ... });
   });
   ```

### Option B — Supabase Auth (gratuit, base de données incluse)
1. Va sur supabase.com → crée un projet
2. Authentication → Providers → Google → Active
3. Utilise le SDK Supabase pour gérer auth + stockage des données users

---

## ÉTAPE 5 — App Store & Play Store (optionnel, plus tard)

Si tu veux une vraie app dans les stores :

### Android (Play Store) — 25$ une fois
```bash
npm install -g @capacitor/cli
npx cap init CreatorStats io.creatorstats.app
npx cap add android
npx cap copy
npx cap open android
```
→ Build l'APK dans Android Studio → Upload sur Play Store

### iOS (App Store) — 99$/an Apple Developer
```bash
npx cap add ios
npx cap open ios
```
→ Build dans Xcode → Soumet sur App Store Connect
→ Validation Apple : 1-3 jours

---

## Stack technique résumé

| Composant | Techno | Coût |
|-----------|--------|------|
| Hébergement | Vercel | Gratuit |
| Domaine | Namecheap/Cloudflare | ~10€/an |
| Auth Google réelle | Firebase Auth | Gratuit jusqu'à 10K users/mois |
| Base de données users | Supabase | Gratuit jusqu'à 500MB |
| IA (Claude API) | Anthropic | ~0.003€/requête |
| App mobile (PWA) | Natif navigateur | Gratuit |
| App stores | Capacitor | 25$ Android / 99$/an iOS |

---

## 🔑 Checklist avant de partager le lien

- [ ] Site déployé sur Vercel ✓
- [ ] URL accessible depuis mobile ✓  
- [ ] PWA testée (icône installable) ✓
- [ ] Clé API Anthropic configurée dans le dashboard ✓
- [ ] Domaine custom (optionnel) ✓

---

*CreatorStats — Dashboard analytics IA pour créateurs*
