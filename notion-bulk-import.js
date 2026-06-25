/* ============================================================
   Fonction relais vers Notion — IMPORT EN LOT des ventes comparables
   ============================================================
   Reçoit un paquet de ventes (envoyées par l'outil
   "nettoyer-dvf-pour-notion.html") et les crée une par une dans votre
   base Notion "Ventes comparables".

   Vous n'avez rien à modifier dans ce fichier.
   URL à utiliser dans l'outil de nettoyage :
   https://VOTRE-SITE.netlify.app/.netlify/functions/notion-bulk-import

   IMPORTANT : Netlify limite l'exécution d'une fonction à 10 secondes
   (plan gratuit). On traite donc les lignes par petits paquets envoyés
   successivement par l'outil, plutôt qu'en un seul appel géant.

   Une clé "IdVente" (texte) est utilisée pour éviter les doublons : si
   une ligne avec la même IdVente existe déjà dans la base, elle est
   ignorée plutôt que recréée. Cela permettra plus tard d'importer
   uniquement les nouvelles ventes d'un mois, sans dupliquer les
   anciennes, en relançant le même outil sur un fichier mis à jour.
*/

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Méthode non autorisée" }) };
  }

  try {
    const payload = JSON.parse(event.body);
    const { token, databaseId, rows } = payload;

    if (!token || !databaseId || !Array.isArray(rows)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Champs manquants (token, databaseId, rows)" }) };
    }

    // Garde-fou : un paquet trop gros dépasserait la limite de temps de la
    // fonction. L'outil appelant doit déjà envoyer par petits paquets, mais
    // on sécurise aussi ici.
    const batch = rows.slice(0, 25);

    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of batch) {
      try {
        if (row.idVente) {
          const exists = await checkExisting(token, databaseId, row.idVente);
          if (exists) {
            results.skipped += 1;
            continue;
          }
        }

        const notionBody = {
          parent: { database_id: databaseId },
          properties: {
            Adresse: { title: [{ text: { content: row.adresse || "(sans adresse)" } }] },
            Commune: { rich_text: [{ text: { content: row.commune || "" } }] },
            CodePostal: { rich_text: [{ text: { content: String(row.codePostal || "") } }] },
            TypeBien: { rich_text: [{ text: { content: row.typeBien || "" } }] },
            Surface: { number: row.surface ?? null },
            Pieces: { rich_text: [{ text: { content: String(row.pieces ?? "") } }] },
            Prix: { number: row.prix ?? null },
            PrixM2: { number: row.prixM2 ?? null },
            Date: row.date ? { date: { start: row.date } } : { date: null },
            Latitude: { number: row.latitude ?? null },
            Longitude: { number: row.longitude ?? null },
            IdVente: { rich_text: [{ text: { content: row.idVente || "" } }] },
          },
        };

        const notionRes = await fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
          },
          body: JSON.stringify(notionBody),
        });

        if (!notionRes.ok) {
          const errJson = await notionRes.json();
          results.errors.push({ row: row.idVente || row.adresse, error: errJson });
        } else {
          results.created += 1;
        }
      } catch (rowErr) {
        results.errors.push({ row: row.idVente || row.adresse, error: String(rowErr) });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...results,
        processedCount: batch.length,
        remaining: rows.length - batch.length,
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err) }) };
  }
};

// Vérifie si une vente avec cet IdVente existe déjà dans la base, pour
// éviter les doublons lors de futurs imports incrémentaux.
async function checkExisting(token, databaseId, idVente) {
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      filter: {
        property: "IdVente",
        rich_text: { equals: idVente },
      },
      page_size: 1,
    }),
  });
  if (!res.ok) return false; // en cas de doute, on tente la création plutôt que de bloquer
  const json = await res.json();
  return (json.results || []).length > 0;
}
