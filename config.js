/* ============================================================
   CONFIGURATION — à remplir avec vos propres identifiants
   ============================================================

   Ce fichier regroupe tous les réglages que vous devez personnaliser.
   Vous n'avez besoin de modifier QUE ce fichier pour faire fonctionner
   l'outil avec votre compte Notion et votre compte EmailJS.

   Rien à installer : ouvrez ce fichier dans un éditeur de texte simple
   (Bloc-notes, TextEdit, ou directement sur GitHub/Netlify) et remplacez
   les valeurs entre guillemets.
*/

const CONFIG = {

  // ----------------------------------------------------------
  // 1) IDENTITÉ DE VOTRE AGENCE / GROUPE
  // ----------------------------------------------------------
  agence: {
    nom: "Votre Agence Immobilière",
    nomCourt: "Votre Agence",
    telephone: "06 00 00 00 00",
    email: "contact@votre-agence.fr",
  },

  // ----------------------------------------------------------
  // 2) NOTION — stockage des leads (obligatoire)
  // ----------------------------------------------------------
  // Comment obtenir ces valeurs :
  // 1. Allez sur https://www.notion.so/my-integrations
  // 2. Cliquez "+ New integration", donnez-lui un nom (ex: "Estimateur")
  // 3. Copiez la "Internal Integration Secret" -> collez-la dans notionToken
  // 4. Créez une base de données Notion (table) avec ces colonnes EXACTES :
  //      Nom (titre), Prenom (texte), Email (e-mail), Telephone (texte),
  //      Adresse (texte), TypeBien (texte), Surface (nombre),
  //      Pieces (texte), EstimationMin (nombre), EstimationMax (nombre),
  //      NbComparables (nombre), Date (date)
  // 5. Ouvrez la base, cliquez "..." en haut à droite -> "Connexions" ->
  //    ajoutez votre intégration créée à l'étape 2
  // 6. Copiez l'ID de la base depuis son URL :
  //    https://notion.so/VOTREESPACE/CECI_EST_LID?v=...
  //
  // IMPORTANT : Notion bloque les requêtes directes depuis un navigateur
  // (CORS). Il faut donc passer par un petit relais gratuit -- voir la
  // note "proxyUrl" ci-dessous, expliquée dans le fichier NOTICE.md.
  notion: {
    enabled: false,           // mettez true une fois configuré
    token: "ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    databaseId: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    proxyUrl: "",             // voir NOTICE.md — laissez vide en attendant
  },

  // ----------------------------------------------------------
  // 3) EMAILJS — envoi automatique de l'email au prospect
  // ----------------------------------------------------------
  // Comment obtenir ces valeurs :
  // 1. Créez un compte gratuit sur https://www.emailjs.com
  // 2. "Email Services" -> "Add new service" -> connectez votre Gmail/Outlook
  //    -> notez le "Service ID"
  // 3. "Email Templates" -> "Create new template" -> rédigez le modèle
  //    (variables disponibles : {{prenom}}, {{nom}}, {{adresse}}, {{type_bien}},
  //     {{surface}}, {{estimation_min}}, {{estimation_max}}, {{agence_nom}},
  //     {{agence_telephone}}) -> notez le "Template ID"
  // 4. "Account" -> "General" -> notez votre "Public Key"
  emailjs: {
    enabled: false,           // mettez true une fois configuré
    publicKey: "VOTRE_PUBLIC_KEY",
    serviceId: "VOTRE_SERVICE_ID",
    templateId: "VOTRE_TEMPLATE_ID",
  },

  // ----------------------------------------------------------
  // 4) MOTEUR D'ESTIMATION (DVF — Demandes de Valeurs Foncières)
  // ----------------------------------------------------------
  // Source officielle et gratuite : data.gouv.fr / DGFiP.
  // Aucune clé nécessaire. Vous pouvez ajuster le rayon de recherche
  // et le nombre d'années d'historique si besoin.
  estimation: {
    rayonRechercheMetres: 600,       // périmètre autour de l'adresse
    surfaceToleranceRatio: 0.35,     // +/- 35% de surface pour rester "comparable"
    anneesHistorique: 5,             // profondeur d'historique des ventes DVF
    minComparables: 3,               // sous ce seuil, on élargit la recherche
  },
};
