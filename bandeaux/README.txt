Méthodologie /bandeaux (Modèles & options)

Structure attendue :
/bandeaux/M01/
  Image.webp              (image principale du modèle)
  description.txt         (texte associé au modèle)
  Image01.webp            (déclinaison 1)  [optionnel]
  description01.txt       (texte déclinaison 1)
  Image02.webp
  description02.txt
  ...

Règles :
- Le numéro du dossier (M01, M02, ...) représente un groupe (un modèle).
- Les déclinaisons sont numérotées à partir de 01.
- Le site détecte automatiquement les fichiers numérotés existants.
- Les fichiers description*.txt peuvent contenir :
    <h3>Mon titre</h3>
    <p>Mon texte (4 lignes max affichées)</p>
  ou du texte brut :
    Ligne 1 = titre
    Ligne 2+ = corps de texte
- Maximum 6 déclinaisons affichées en miniatures dans la modale (les premières trouvées).
