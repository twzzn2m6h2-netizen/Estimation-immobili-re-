/* ============================================================
   DONNÉES DU PARCOURS — questions, options, icônes
   ============================================================
   Vous pouvez modifier les libellés ici sans toucher à app.js.
*/

const ICONS = {
  achat: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  vente: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M20.59 13.41L11.41 4.24a2 2 0 00-1.41-.59H4a1 1 0 00-1 1v6a2 2 0 00.59 1.41l9.18 9.18a2 2 0 002.82 0l5-5a2 2 0 000-2.82z" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/></svg>`,
  appartement: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M4 21V7l8-4 8 4v14M9 21v-5h6v5M9 11h.01M14 11h.01M9 7h.01M14 7h.01" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  maison: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M3 11l9-7 9 7M5 10v10h14V10M9 20v-6h6v6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

const STEPS = [
  "adresse",
  "projet",
  "type",
  "surface",
  "pieces",
  "etage",       // conditionnel : appartement uniquement
  "caracteristiques",
  "vue",
  "luminosite",
  "calme",
  "annee",
  "etat",
  "contact",
];

const QUESTIONS = {

  projet: {
    eyebrow: "Votre projet",
    title: "Quel est votre projet ?",
    type: "single-card",
    options: [
      { value: "achat", label: "Achat", icon: ICONS.achat },
      { value: "vente", label: "Vente", icon: ICONS.vente },
    ],
  },

  type: {
    eyebrow: "Le bien",
    title: "De quel type de bien s'agit-il ?",
    type: "single-card",
    options: [
      { value: "appartement", label: "Appartement", icon: ICONS.appartement },
      { value: "maison", label: "Maison", icon: ICONS.maison },
    ],
  },

  surface: {
    eyebrow: "Surface",
    title: "Quelle est la surface habitable ?",
    help: "Renseignez uniquement la surface habitable (hors balcon, cave, garage).",
    type: "number",
    suffix: "m²",
    placeholder: "Ex : 65",
  },

  pieces: {
    eyebrow: "Composition",
    title: "Combien y a-t-il de pièces ?",
    help: "On compte les pièces de vie et les chambres, hors cuisine et salle de bain.",
    type: "single-list",
    options: [
      { value: "1", label: "1 pièce" },
      { value: "2", label: "2 pièces" },
      { value: "3", label: "3 pièces" },
      { value: "4", label: "4 pièces" },
      { value: "5+", label: "5 pièces et +" },
    ],
  },

  etage: {
    eyebrow: "Localisation dans l'immeuble",
    title: "À quel étage se trouve l'appartement ?",
    type: "select",
    onlyIf: { field: "type", equals: "appartement" },
    options: [
      { value: "rdc", label: "Rez-de-chaussée" },
      ...Array.from({ length: 14 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}${i === 0 ? "er" : "ème"} étage` })),
    ],
  },

  caracteristiques: {
    eyebrow: "Équipements",
    title: "Le bien est-il équipé de l'une de ces caractéristiques ?",
    help: "Sélectionnez seulement les caractéristiques présentes.",
    type: "multi-list",
    options: [
      { value: "balcon", label: "Balcon / Terrasse" },
      { value: "garage", label: "Garage / Parking" },
      { value: "cave", label: "Cave" },
    ],
  },

  vue: {
    eyebrow: "Environnement",
    title: "Comment est la vue ?",
    type: "single-list",
    options: [
      { value: "exceptionnelle", label: "Exceptionnelle" },
      { value: "degagee", label: "Dégagée" },
      { value: "vis_a_vis_eloigne", label: "Vis-à-vis éloigné" },
      { value: "vis_a_vis_proche", label: "Vis-à-vis proche" },
    ],
  },

  luminosite: {
    eyebrow: "Confort",
    title: "Comment est la luminosité au sein du bien ?",
    type: "single-list",
    options: [
      { value: "tres_clair", label: "Très clair" },
      { value: "clair", label: "Clair" },
      { value: "peu_clair", label: "Peu clair" },
      { value: "sombre", label: "Sombre" },
    ],
  },

  calme: {
    eyebrow: "Environnement",
    title: "Comment qualifieriez-vous le calme du quartier ?",
    type: "single-list",
    options: [
      { value: "tres_calme", label: "Très calme" },
      { value: "calme", label: "Calme" },
      { value: "passant", label: "Passant" },
      { value: "bruyant", label: "Bruyant" },
    ],
  },

  annee: {
    eyebrow: "Ancienneté",
    title: "Quand l'immeuble a-t-il été construit ?",
    type: "single-list",
    options: [
      { value: "avant_1900", label: "Avant 1900" },
      { value: "1900_1950", label: "Entre 1900 et 1950" },
      { value: "1950_1990", label: "Entre 1950 et 1990" },
      { value: "apres_1990", label: "Après 1990" },
      { value: "inconnu", label: "Je ne sais pas" },
    ],
  },

  etat: {
    eyebrow: "État général",
    title: "Dans quel état général se trouve le bien ?",
    type: "single-list",
    options: [
      { value: "tres_bon", label: "Très bon état" },
      { value: "bon", label: "Bon état" },
      { value: "acceptable", label: "État acceptable" },
      { value: "mauvais", label: "Mauvais état" },
    ],
  },
};

const ETAT_COEFFICIENTS = {
  tres_bon: 1.08,
  bon: 1.0,
  acceptable: 0.92,
  mauvais: 0.80,
};

const LABELS_RECAP = {
  type: { appartement: "Appartement", maison: "Maison" },
  pieces: { "1": "1 pièce", "2": "2 pièces", "3": "3 pièces", "4": "4 pièces", "5+": "5 pièces et +" },
  etat: { tres_bon: "Très bon état", bon: "Bon état", acceptable: "État acceptable", mauvais: "Mauvais état" },
  vue: { exceptionnelle: "Vue exceptionnelle", degagee: "Vue dégagée", vis_a_vis_eloigne: "Vis-à-vis éloigné", vis_a_vis_proche: "Vis-à-vis proche" },
  luminosite: { tres_clair: "Très clair", clair: "Clair", peu_clair: "Peu clair", sombre: "Sombre" },
  calme: { tres_calme: "Très calme", calme: "Calme", passant: "Passant", bruyant: "Bruyant" },
  annee: { avant_1900: "Avant 1900", "1900_1950": "1900–1950", "1950_1990": "1950–1990", apres_1990: "Après 1990", inconnu: "Année inconnue" },
};
