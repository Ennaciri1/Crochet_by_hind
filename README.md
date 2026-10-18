# Blog de patrons de crochet — guide pas à pas

Ce projet est un blog complet de patrons de crochet gratuits (en anglais, termes US) :

- **site public** : accueil, 5 catégories, recherche, articles avec fiche patron imprimable, FAQ, pages légales, 404 ;
- **SEO** : balises meta, données structurées (HowTo, BlogPosting, FAQ, fil d'Ariane), `sitemap.xml`, `robots.txt` ;
- **Google AdSense** : script chargé seulement sur les pages publiques, emplacements de pub, `ads.txt` automatique ;
- **admin** (`/admin`) : écrire, publier, programmer et supprimer des articles, envoyer des photos, lire les messages.

Technologies : Next.js 16 (App Router), Supabase (base de données, connexion, photos), Vercel (hébergement).

> 💡 Vous n'avez **aucune clé secrète** à gérer : le site utilise seulement la clé publique « anon » de Supabase.
> La sécurité est assurée par les règles RLS (Row Level Security) dans la base de données.

---

## Sommaire

1. [Créer le projet Supabase](#1-créer-le-projet-supabase)
2. [Lancer le site sur votre ordinateur](#2-lancer-le-site-sur-votre-ordinateur)
3. [Mettre en ligne avec GitHub et Vercel](#3-mettre-en-ligne-avec-github-et-vercel)
4. [Brancher votre nom de domaine](#4-brancher-votre-nom-de-domaine)
5. [Google Search Console et sitemap](#5-google-search-console-et-sitemap)
6. [Google AdSense](#6-google-adsense)
7. [Écrire un bon article (checklist)](#7-écrire-un-bon-article-checklist)
8. [Où modifier quoi ?](#8-où-modifier-quoi-)

---

## 1. Créer le projet Supabase

1. Allez sur [supabase.com](https://supabase.com), créez un compte gratuit, puis **New project**.
   - Nom : ce que vous voulez (ex. `crochet-blog`).
   - Mot de passe de la base : générez-le et gardez-le dans un endroit sûr.
   - Région : choisissez **East US** (votre public est américain).
2. Attendez 1 à 2 minutes que le projet soit prêt.
3. **Créer les tables** : menu de gauche **SQL Editor** → **New query** → ouvrez le fichier
   [`supabase/schema.sql`](supabase/schema.sql), copiez **tout** son contenu, collez-le, cliquez **Run**.
   Vous devez voir « Success. No rows returned ».
4. **Ajouter l'article d'exemple** : **New query** → collez le contenu de [`supabase/seed.sql`](supabase/seed.sql) → **Run**.
5. **Créer votre utilisateur** : **Authentication** → **Users** → **Add user** → **Create new user**.
   Entrez votre e-mail et un mot de passe solide, et cochez **Auto Confirm User**.
6. **Vous rendre administratrice / administrateur** : **SQL Editor** → **New query**, collez ceci
   en remplaçant l'e-mail par le vôtre, puis **Run** :

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'votre-email@exemple.com'
   on conflict do nothing;
   ```

7. **Récupérer vos clés** : **Project Settings** (roue dentée) → **API** (ou **Data API**). Notez :
   - **Project URL** (ex. `https://abcd1234.supabase.co`)
   - **anon public key** (une longue chaîne qui commence par `eyJ...`, ou une clé « publishable »)

   ⚠️ N'utilisez **jamais** la clé `service_role` / « secret » dans ce projet.

---

## 2. Lancer le site sur votre ordinateur

Prérequis : installez [Node.js](https://nodejs.org) version 20 ou plus récente (bouton « LTS »).

1. Ouvrez un terminal dans le dossier du projet.
2. Copiez le fichier d'exemple des réglages :

   ```bash
   cp .env.example .env.local
   ```

3. Ouvrez `.env.local` et remplissez :

   | Variable | Quoi mettre |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | la Project URL de Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la clé anon public |
   | `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` pour l'instant |
   | `NEXT_PUBLIC_SITE_NAME` | le nom de votre site |
   | `NEXT_PUBLIC_AUTHOR_NAME` | votre nom |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | votre e-mail de contact |
   | `NEXT_PUBLIC_ETSY_SHOP_URL` | l'adresse de votre boutique Etsy |
   | `NEXT_PUBLIC_PINTEREST_URL` | l'adresse de votre profil Pinterest |
   | `NEXT_PUBLIC_ADSENSE_*` | laissez **vide** pour l'instant (étape 6) |

4. Installez les dépendances (une seule fois) :

   ```bash
   npm install
   ```

5. Lancez le site :

   ```bash
   npm run dev
   ```

6. Ouvrez [http://localhost:3000](http://localhost:3000) : vous devez voir l'article « Easy Crochet Coaster ».
   Les cadres en pointillés « Ad slot » montrent où les publicités apparaîtront (ils ne s'affichent qu'en local).
7. Allez sur [http://localhost:3000/admin](http://localhost:3000/admin) et connectez-vous avec l'e-mail et le mot de passe de l'étape 1.

Pour vérifier que tout est prêt pour la mise en ligne :

```bash
npm run build
```

---

## 3. Mettre en ligne avec GitHub et Vercel

### a) Envoyer le code sur GitHub

1. Créez un compte sur [github.com](https://github.com), puis **New repository** (privé, sans README).
2. Dans le terminal du projet :

   ```bash
   git init
   git add .
   git commit -m "Premier envoi du blog"
   git branch -M main
   git remote add origin https://github.com/VOTRE-NOM/VOTRE-DEPOT.git
   git push -u origin main
   ```

   Le fichier `.env.local` n'est **pas** envoyé (il est dans `.gitignore`) : c'est voulu.

### b) Déployer sur Vercel

1. Créez un compte sur [vercel.com](https://vercel.com) avec votre compte GitHub.
2. **Add New… → Project** → choisissez votre dépôt → **Import**.
3. Ouvrez **Environment Variables** et ajoutez **toutes** les variables de votre `.env.local`
   (même nom, même valeur), sauf :
   - `NEXT_PUBLIC_SITE_URL` = l'adresse finale, ex. `https://votre-site.com` (ou l'adresse `.vercel.app` en attendant).
4. Cliquez **Deploy**. Après 1 à 2 minutes, votre site est en ligne 🎉

> ⚠️ Chaque fois que vous modifiez une variable d'environnement sur Vercel, il faut **redéployer**
> (onglet **Deployments** → les trois points du dernier déploiement → **Redeploy**).
> Écrire un article dans l'admin, en revanche, ne demande **aucun** redéploiement : le site se met à jour tout seul.

---

## 4. Brancher votre nom de domaine

1. Achetez un domaine (ex. chez Namecheap, OVH, Cloudflare, ou directement sur Vercel).
2. Vercel → votre projet → **Settings** → **Domains** → tapez `votre-site.com` → **Add**.
   Ajoutez aussi `www.votre-site.com` et choisissez lequel est l'adresse principale (redirection de l'autre).
3. Vercel affiche les enregistrements DNS à créer (en général un enregistrement **A** et un **CNAME**).
   Copiez-les dans la zone DNS chez votre registrar. La propagation prend de quelques minutes à quelques heures.
4. Quand le domaine est vert ✅ sur Vercel, changez `NEXT_PUBLIC_SITE_URL` en `https://votre-site.com`, puis **Redeploy**.
5. Dans Supabase → **Authentication** → **URL Configuration**, mettez votre domaine dans **Site URL**.

---

## 5. Google Search Console et sitemap

1. Allez sur [search.google.com/search-console](https://search.google.com/search-console).
2. **Ajouter une propriété** → type **Domaine** → `votre-site.com`.
3. Google vous donne un enregistrement **TXT** : ajoutez-le dans les DNS de votre domaine, puis **Valider**.
4. Menu **Sitemaps** → entrez `sitemap.xml` → **Envoyer**.
   (Votre sitemap est généré automatiquement à `https://votre-site.com/sitemap.xml`.)
5. Pour accélérer l'indexation d'un nouvel article : collez son adresse dans la barre **Inspection de l'URL**
   en haut, puis **Demander une indexation**.

Bonus Pinterest : sur Pinterest (compte professionnel) → **Paramètres** → **Revendiquer** → votre site.

---

## 6. Google AdSense

> Conseil : publiez au moins **15 à 20 articles** de qualité, avec vos propres photos, avant de postuler.
> Les pages About, Contact, Privacy Policy, Terms et Disclaimer sont déjà prêtes.

1. Allez sur [adsense.google.com](https://adsense.google.com) → inscrivez-vous avec l'adresse de votre site.
2. AdSense vous donne votre **ID d'éditeur** : `ca-pub-1234567890123456`.
3. Sur Vercel, ajoutez la variable `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-1234567890123456` → **Redeploy**.
   Cela ajoute automatiquement :
   - la balise `<meta name="google-adsense-account">` (validation du site) ;
   - le script AdSense sur les pages publiques (jamais dans l'admin) ;
   - le fichier [`/ads.txt`](http://localhost:3000/ads.txt) avec votre ID.
4. Dans AdSense, cliquez **Valider** / **Demander un examen**. L'examen prend de quelques jours à quelques semaines.
5. **Une fois accepté**, créez deux blocs d'annonces : **Annonces** → **Par bloc d'annonces** :
   - un bloc **Display** (Annonces display, responsive) → copiez son `data-ad-slot` (un nombre)
     dans `NEXT_PUBLIC_ADSENSE_SLOT_DISPLAY` ;
   - un bloc **In-article** (Annonces In-Article) → copiez son `data-ad-slot`
     dans `NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE`.
   Puis **Redeploy** sur Vercel.
6. **Consentement Europe / Royaume-Uni (obligatoire)** : AdSense → **Confidentialité et messages** →
   **RGPD européen** → **Créer un message** → choisissez votre site, la langue anglaise, votre lien
   vers `https://votre-site.com/privacy-policy`, puis **Publier**. Google affiche alors lui-même la bannière
   de consentement aux visiteurs européens. (Faites de même pour **Réglementations des États américains** si proposé.)
7. Vérifiez `https://votre-site.com/ads.txt` : vous devez voir `google.com, pub-..., DIRECT, f08c47fec0942fa0`.

Où sont les pubs ? Une sur l'accueil, une au milieu de chaque article (insérée automatiquement entre deux
paragraphes), une après la boîte Etsy, et une dans les catégories longues. Toutes portent l'étiquette « Advertisement ».
Elles ne sont **jamais** imprimées avec le bouton « Print pattern ».

---

## 7. Écrire un bon article (checklist)

Dans `/admin` → **+ New post**. Le formulaire est pré-rempli avec un modèle : remplacez le texte.

**Avant de publier**

- [ ] **Titre** avec le mot-clé principal, tel que les gens le tapent sur Google :
      « Easy Crochet Coaster Free Pattern », « Crochet Bunny Amigurumi Pattern ».
- [ ] **URL (slug)** courte : `easy-crochet-coaster` (elle se remplit toute seule, modifiable).
- [ ] **Short summary** : 1 à 2 phrases qui donnent envie (affichées sous le titre et sur les cartes).
- [ ] **Photo de couverture verticale 4:5** (ex. 1000 × 1250 px), lumineuse, avec l'ouvrage bien visible :
      c'est elle qui sera épinglée sur Pinterest. Fichier de moins de 1 Mo si possible (compressez avec squoosh.app).
- [ ] **Texte alternatif** (alt) de la photo : décrivez ce qu'on voit, en anglais.
- [ ] **Article** : une introduction courte, puis des intertitres `## ...` (ils créent la table des matières).
      Au moins 4 paragraphes (la pub du milieu a besoin de place), 2 à 5 photos d'étapes avec **+ Add photos**.
- [ ] **Fiche patron** : niveau, laine, crochet, échantillon (gauge), taille finale, temps, matériel (un par ligne),
      abréviations US, et instructions **un rang par paragraphe** : `**Rnd 1:** ... *(6 sts)*`.
      Pour un tutoriel sans patron, laissez **Instructions** vide : la fiche est masquée.
- [ ] **FAQ** : 3 à 5 vraies questions (« Can I use acrylic yarn? »), au format `Q: ...` / `A: ...`,
      séparées par une ligne vide. Elles peuvent apparaître directement dans Google.
- [ ] **Catégorie** et **tags** (séparés par des virgules).
- [ ] **Lien Etsy** vers la fiche PDF de ce patron (sinon, le lien va vers votre boutique).
- [ ] **SEO title** (60 caractères max) et **SEO description** (140 à 160 caractères, le compteur vous aide).
- [ ] Vérifiez l'onglet **Preview**, puis **Publish**.

**Programmer un article** : choisissez une date future dans **Publish date**, puis **Schedule**.
L'article apparaît tout seul (dans les 5 minutes suivant l'heure choisie).

**Après publication**

- [ ] Ouvrez l'article (lien **View post**) et testez **Print pattern**.
- [ ] Épinglez-le avec **Save to Pinterest** (créez 2 ou 3 épingles avec des photos différentes au fil des semaines).
- [ ] Demandez l'indexation dans la Search Console.
- [ ] Ajoutez un lien vers ce nouvel article depuis 1 ou 2 anciens articles proches.

**Boutons de l'éditeur** : *Publish / Update* (mettre en ligne), *Save draft* (brouillon invisible),
*Unpublish* (retirer du site), *Delete post* (suppression définitive, en bas de page).

**Messages** : l'onglet **Messages** affiche les messages du formulaire de contact
(les robots sont filtrés par un champ piège invisible).

---

## 8. Où modifier quoi ?

| Je veux changer… | Fichier |
| --- | --- |
| Couleurs, polices, espacements | `app/globals.css` (variables en haut du fichier) |
| Polices | `app/layout.tsx` |
| Texte de l'accueil | `app/(site)/page.tsx` |
| Noms et descriptions des catégories | `lib/categories.ts` |
| Pages About / légales | `app/(site)/about`, `privacy-policy`, `terms`, `disclaimer` |
| Fiche patron | `components/PatternCard.tsx` |
| Page article | `app/(site)/blog/[slug]/page.tsx` |
| Éditeur d'articles | `app/admin/(panel)/posts/PostEditor.tsx` |
| Base de données | `supabase/schema.sql` |

Structure rapide :

```
app/
  (site)/          pages publiques (avec en-tête, pied de page et AdSense)
  admin/           panneau d'administration (sans pub, non indexé)
  sitemap.ts       sitemap.xml
  robots.ts        robots.txt
  ads.txt/         ads.txt automatique
components/        morceaux réutilisables (AdSlot, PatternCard, PostCard…)
lib/               réglages, accès à Supabase, Markdown
proxy.ts           protège /admin (nouveau nom du « middleware » depuis Next.js 16)
supabase/          schema.sql et seed.sql
```

Les pages publiques sont mises en cache et reconstruites toutes les 5 minutes au maximum, et immédiatement
après chaque enregistrement dans l'admin.

Bon crochet ! 🧶
