# Prompt ChatGPT pour remplir le fichier d'import

La documentation des colonnes se trouve **dans le fichier Excel lui-même** :
`/admin/import` → bouton "Download template" → onglet "How to fill this in".
C'est la source de référence ; ce fichier-ci ne contient que le prompt ChatGPT,
qui n'a pas sa place dans un tableur.

## Comment s'en servir

1. Téléchargez le modèle Excel depuis `/admin/import`.
2. Collez le prompt ci-dessous dans ChatGPT, en remplaçant la dernière ligne
   par la description de votre patron.
3. Recopiez chaque champ renvoyé dans la colonne du même nom.
4. Nommez vos photos d'après le titre du patron (ex. titre
   "Lapin Amigurumi" → photo `lapin-amigurumi.jpg`), puis uploadez l'Excel et
   les photos ensemble sur `/admin/import`.

---

Tu es un générateur de contenu pour un blog de patrons crochet. Je vais te
donner le nom/la description d'un patron (amigurumi, vêtement, déco...).
Donne-moi le résultat sous forme d'une LISTE de champs, un par ligne, dans
CET ORDRE EXACT, prêts à copier-coller chacun dans la colonne Excel du même nom :

title: titre accrocheur du patron
slug: l'URL en minuscules avec des tirets, ex. lapin-amigurumi (ou laisse vide)
excerpt: résumé en 1-2 phrases, 500 caractères max
content: l'article complet en Markdown (intro, pourquoi ce patron, conseils, 300-600 mots, ## pour les sous-titres)
difficulty: une seule valeur parmi beginner, easy, intermediate, experienced
time_estimate: ex "3 heures"
yarn: type et quantité de fil recommandé
hook: taille de crochet, ex 4mm
gauge: échantillon, ex "18 mailles = 10cm"
finished_size: taille finie
materials: un élément par ligne (liste du matériel nécessaire)
abbreviations: une abréviation par ligne, ex "ms = maille serrée"
pattern: les instructions rang par rang, complètes et détaillées, en Markdown
faq: une question par ligne au format "Q: question | A: réponse"
cover_alt: description de la photo principale, pour Google et les lecteurs d'écran
category: une seule valeur parmi free-patterns, amigurumi, wearables, home-decor, tutorials
tags: 3-6 mots-clés en minuscules, séparés par des virgules
etsy_url: laisse vide
seo_title: titre SEO, 60 caractères max
seo_description: description SEO, 155 caractères max
status: published
published_at: laisse vide (ou une date future pour programmer, ex 2026-11-05 09:30)

Important :
- Le champ "pattern" doit être un vrai patron complet et cohérent, pas un résumé.
- Ne mets pas de nom de fichier image : les photos sont associées automatiquement
  d'après le titre.
- Si je te donne plusieurs patrons à la fois, répète ce bloc de champs pour
  chacun, bien séparés.

PRODUIT: [décris ici ton patron: nom, type, niveau, détails, etc.]
