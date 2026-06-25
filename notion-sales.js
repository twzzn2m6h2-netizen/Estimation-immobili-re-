/* ============================================================
   Fonction relais vers Notion — LECTURE des ventes comparables
   ============================================================
   Cette fonction interroge votre base Notion "Ventes comparables"
   et renvoie toutes les lignes au site, qui calculera ensuite
   lui-même la distance avec l'adresse du visiteur.

   Vous n'avez rien à modifier dans ce fichier.
   URL à utiliser dans config.js (notion.salesProxyUrl) :
   https://VOTRE-SITE.netlify.app/.netlify/functions/notion-sales
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
    const { token, databaseId } = payload;

    if (!token || !databaseId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Champs manquants" }) };
    }

    const results = [];
    let cursor = undefined;
    let pageCount = 0;

    // Notion limite à 100 lignes par appel : on boucle avec la pagination
    // jusqu'à tout récupérer, avec un garde-fou de 20 pages (2000 lignes).
    do {
      const notionRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          start_cursor: cursor,
          page_size: 100,
        }),
      });

      const notionJson = await notionRes.json();
      if (!notionRes.ok) {
        return { statusCode: notionRes.status, headers, body: JSON.stringify({ error: notionJson }) };
      }

      (notionJson.results || []).forEach((page) => {
        const p = page.properties || {};
        results.push({
          adresse: getText(p.Adresse),
          commune: getText(p.Commune),
          codePostal: getText(p.CodePostal),
          typeBien: getText(p.TypeBien),
          surface: getNumber(p.Surface),
          pieces: getText(p.Pieces),
          prix: getNumber(p.Prix),
          prixM2: getNumber(p.PrixM2),
          date: getDate(p.Date),
          latitude: getNumber(p.Latitude),
          longitude: getNumber(p.Longitude),
        });
      });

      cursor = notionJson.has_more ? notionJson.next_cursor : undefined;
      pageCount += 1;
    } while (cursor && pageCount < 20);

    return { statusCode: 200, headers, body: JSON.stringify({ sales: results }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err) }) };
  }
};

function getText(prop) {
  if (!prop) return "";
  if (prop.title) return prop.title.map((t) => t.plain_text).join("");
  if (prop.rich_text) return prop.rich_text.map((t) => t.plain_text).join("");
  if (prop.select) return prop.select.name || "";
  return "";
}

function getNumber(prop) {
  if (!prop) return null;
  if (typeof prop.number === "number") return prop.number;
  return null;
}

function getDate(prop) {
  if (!prop || !prop.date) return null;
  return prop.date.start || null;
}
