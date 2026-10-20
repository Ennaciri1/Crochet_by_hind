# Importer plusieurs patrons en une fois (via /admin/import)

Il y a maintenant une section **Import** dans l'admin (`/admin/import`). Vous
n'avez plus besoin de me donner un fichier — vous l'importez vous-même en
quelques clics :

1. Sur `/admin/import`, cliquez **"Download template"** pour récupérer le
   fichier Excel vide (avec un exemple rempli et des explications par colonne).
2. Remplissez une ligne par patron. Pour chaque ligne, utilisez le prompt
   ChatGPT ci-dessous pour générer le texte, puis copiez-collez chaque champ
   dans la bonne colonne.
3. Mettez toutes vos photos dans un seul endroit sur votre ordinateur.
4. Sur `/admin/import` : uploadez le fichier Excel rempli + sélectionnez toutes
   les photos en une fois (sélection multiple).
5. Une table d'aperçu s'affiche — vérifiez que chaque ligne a bien trouvé sa
   photo et sa catégorie, avant de cliquer **"Import"**.

## Comment les photos sont associées aux articles

Pas besoin de taper un nom de fichier nulle part : le système compare le
**titre de l'article** (colonne "title") au **nom du fichier image**. Donc
nommez vos photos de façon proche du titre, par exemple :
- Titre : `Lapin Amigurumi au Crochet`
- Photo : `lapin-amigurumi.jpg` ou `lapin-amigurumi-final.jpg` → ça matchera automatiquement

Une photo n'est utilisée que pour un seul article. Si aucune photo ne
correspond à une ligne, l'article est importé sans photo (vous pourrez
l'ajouter plus tard depuis l'éditeur).

## Format exact des colonnes Excel (important)

- **materials** : un élément par ligne dans la cellule (dans Excel : Alt+Entrée
  pour aller à la ligne dans une même cellule). Si vous mettez tout sur une
  seule ligne, séparez par des virgules.
- **faq** : une question par ligne, au format :
  `Q: ma question ici | A: ma réponse ici`
- **tags** : séparés par des virgules, en minuscules.
- **category** : une seule valeur parmi `free-patterns`, `amigurumi`,
  `wearables`, `home-decor`, `tutorials`.
- **difficulty** : une seule valeur parmi `beginner`, `easy`, `intermediate`,
  `experienced`.
- **status** : `published` pour publier tout de suite, ou `draft` pour brouillon.

---

# Prompt à coller dans ChatGPT (pour générer le texte de chaque ligne)

Collez ceci dans ChatGPT, en remplaçant la ligne "PRODUIT: ..." par la
description de votre patron. Demandez-lui de vous le donner **ligne par ligne,
prêt à copier dans Excel** plutôt qu'en JSON.

---

Tu es un générateur de contenu pour un blog de patrons crochet. Je vais te
donner le nom/la description d'un patron (amigurumi, vêtement, déco...).
Donne-moi le résultat sous forme d'une LISTE de champs, un par ligne, dans
CET ORDRE EXACT, prêts à copier-coller chacun dans une colonne Excel :

title: titre accrocheur du patron
category: une seule valeur parmi free-patterns, amigurumi, wearables, home-decor, tutorials
excerpt: résumé en 1-2 phrases, 500 caractères max
content: article complet en Markdown (intro, pourquoi ce patron, conseils, 300-600 mots, utilise ## pour les sous-titres)
difficulty: une seule valeur parmi beginner, easy, intermediate, experienced
yarn: type et quantité de fil recommandé
hook: taille de crochet, ex 4mm
gauge: échantillon, ex "18 mailles = 10cm"
finished_size: taille finie
time_estimate: ex "3 heures"
materials: un élément par ligne (liste du matériel nécessaire)
abbreviations: une abréviation par ligne, ex "ms = maille serrée"
pattern: les instructions rang par rang, complètes et détaillées, en Markdown
faq: une question par ligne au format "Q: question | A: réponse"
tags: 3-6 mots-clés en minuscules, séparés par des virgules
seo_title: titre SEO, 60 caractères max
seo_description: description SEO, 155 caractères max
status: published

Important :
- Le champ "pattern" doit être un vrai patron complet et cohérent, pas un résumé.
- Ne mets pas de nom de fichier image, je choisis mes photos moi-même.
- Si je te donne plusieurs patrons à la fois, répète ce bloc de champs pour chacun, bien séparés.

PRODUIT: [décris ici ton patron: nom, type, niveau, détails, etc.]

---

Collez ensuite chaque champ dans la colonne Excel correspondante, dans le
fichier téléchargé depuis `/admin/import`.
