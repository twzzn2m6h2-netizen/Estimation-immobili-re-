/* ============================================================
   Fonction relais vers Notion (résout le problème CORS)
   ============================================================
   Notion refuse les appels directs depuis un navigateur. Cette petite
   fonction tourne gratuitement sur Netlify et fait le relais :
   le navigateur l'appelle, elle appelle Notion, et renvoie la réponse.

   Vous n'avez rien à modifier dans ce fichier.
   Le déploiement sur Netlify l'active automatiquement (dossier
   netlify/functions). L'URL à mettre dans config.js (proxyUrl) sera :
   https://VOTRE-SITE.netlify.app/.netlify/functions/notion-lead
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
    const { token, databaseId, properties } = payload;

    if (!token || !databaseId || !properties) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Champs manquants" }) };
    }

    const notionBody = {
      parent: { database_id: databaseId },
      properties: {
        Nom: { title: [{ text: { content: properties.Nom || "" } }] },
        Prenom: { rich_text: [{ text: { content: properties.Prenom || "" } }] },
        Email: { email: properties.Email || null },
        Telephone: { phone_number: properties.Telephone || null },
        Adresse: { rich_text: [{ text: { content: properties.Adresse || "" } }] },
        TypeBien: { rich_text: [{ text: { content: properties.TypeBien || "" } }] },
        Surface: { number: properties.Surface || null },
        Pieces: { rich_text: [{ text: { content: String(properties.Pieces || "") } }] },
        EstimationMin: { number: properties.EstimationMin },
        EstimationMax: { number: properties.EstimationMax },
        NbComparables: { number: properties.NbComparables || 0 },
        Date: { date: { start: properties.Date || new Date().toISOString() } },
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

    const notionJson = await notionRes.json();

    if (!notionRes.ok) {
      return { statusCode: notionRes.status, headers, body: JSON.stringify({ error: notionJson }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err) }) };
  }
};
