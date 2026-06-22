/* ============================================================
   APPLICATION — logique du parcours, calcul, envoi des leads
   ============================================================ */

const state = {
  stepIndex: 0,
  answers: {},          // réponses aux questions
  addressLabel: "",
  addressCoords: null,  // { lat, lon }
  addressCity: "",
  addressPostcode: "",
  comparables: [],
  estimation: null,     // { min, max, count }
  submitting: false,
};

function activeSteps() {
  return STEPS.filter((key) => {
    const q = QUESTIONS[key];
    if (key === "adresse" || key === "contact") return true;
    if (!q) return true;
    if (q.onlyIf) {
      const cond = q.onlyIf;
      return state.answers[cond.field] === cond.equals;
    }
    return true;
  });
}

function currentStepKey() {
  return activeSteps()[state.stepIndex];
}

function goNext() {
  const steps = activeSteps();
  if (state.stepIndex < steps.length - 1) {
    state.stepIndex += 1;
    render();
  }
}

function goBack() {
  if (state.stepIndex > 0) {
    state.stepIndex -= 1;
    render();
  } else {
    render(); // déjà au début
  }
}

function setAnswer(key, value) {
  state.answers[key] = value;
}

function toggleMultiAnswer(key, value) {
  const current = state.answers[key] || [];
  const idx = current.indexOf(value);
  if (idx >= 0) current.splice(idx, 1);
  else current.push(value);
  state.answers[key] = current;
}

/* ------------------------------------------------------------
   Rendu — on régénère le markup de l'étape courante à chaque fois
   ------------------------------------------------------------ */

const app = document.getElementById("app");

function render() {
  const key = currentStepKey();
  const steps = activeSteps();
  const progressPct = Math.round(((state.stepIndex) / (steps.length)) * 100) + 4;

  app.innerHTML = `
    <div class="topbar">
      <div class="brand">
        <div class="brand-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fdfcf8" stroke-width="1.8"><path d="M3 11l9-7 9 7M5 10v10h14V10" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div>
          <div class="brand-name">${CONFIG.agence.nomCourt}</div>
        </div>
      </div>
      <div class="step-counter">${state.stepIndex + 1} / ${steps.length}</div>
    </div>
    <div class="progress-track"><div class="progress-fill" style="width:${progressPct}%"></div></div>
    <div id="stage" class="stage"></div>
  `;

  const stage = document.getElementById("stage");

  if (key === "adresse") return renderAdresse(stage);
  if (key === "contact") return renderContact(stage);

  const q = QUESTIONS[key];
  renderQuestion(stage, key, q);
}

function renderBackButton(stage) {
  if (state.stepIndex === 0) return "";
  return `<button class="back-link" id="btnBack">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    Retour
  </button>`;
}

function attachBack() {
  const b = document.getElementById("btnBack");
  if (b) b.addEventListener("click", goBack);
}

/* ------------------------------------------------------------
   Étape : adresse (autocomplétion via l'API officielle adresse.data.gouv.fr)
   ------------------------------------------------------------ */

function renderAdresse(stage) {
  stage.innerHTML = `
    ${renderBackButton(stage)}
    <div class="question-eyebrow">L'adresse du bien</div>
    <h1 class="question-title">Où se situe le bien ?</h1>
    <p class="question-help">Commencez à taper l'adresse, puis choisissez-la dans la liste qui apparaît.</p>
    <div class="field">
      <input type="text" id="addrInput" placeholder="Ex : 12 rue de la République, Lyon" autocomplete="off" value="${state.addressLabel || ""}">
      <div id="addrSuggestions"></div>
    </div>
    <div class="stage-footer">
      <button class="btn-primary" id="btnNext" ${state.addressCoords ? "" : "disabled"}>Confirmer<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </div>
  `;
  attachBack();

  const input = document.getElementById("addrInput");
  const suggestions = document.getElementById("addrSuggestions");
  const btnNext = document.getElementById("btnNext");
  let debounceTimer = null;

  input.addEventListener("input", () => {
    state.addressCoords = null;
    btnNext.disabled = true;
    const q = input.value.trim();
    clearTimeout(debounceTimer);
    if (q.length < 4) { suggestions.innerHTML = ""; return; }
    debounceTimer = setTimeout(() => fetchAddressSuggestions(q, suggestions, input, btnNext), 280);
  });

  btnNext.addEventListener("click", () => {
    if (!state.addressCoords) return;
    goNext();
  });
}

async function fetchAddressSuggestions(query, suggestionsEl, input, btnNext) {
  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`;
    const res = await fetch(url);
    const json = await res.json();
    const features = json.features || [];
    if (!features.length) {
      suggestionsEl.innerHTML = `<div class="addr-suggestion">Aucune adresse trouvée</div>`;
      return;
    }
    suggestionsEl.innerHTML = features.map((f, i) => `
      <div class="addr-suggestion" data-idx="${i}">${f.properties.label}</div>
    `).join("");
    suggestionsEl.querySelectorAll(".addr-suggestion[data-idx]").forEach((el) => {
      el.addEventListener("click", () => {
        const f = features[parseInt(el.dataset.idx, 10)];
        input.value = f.properties.label;
        state.addressLabel = f.properties.label;
        state.addressCoords = { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
        state.addressCity = f.properties.city || "";
        state.addressPostcode = f.properties.postcode || "";
        suggestionsEl.innerHTML = "";
        btnNext.disabled = false;
      });
    });
  } catch (e) {
    suggestionsEl.innerHTML = `<div class="addr-suggestion">Recherche indisponible pour le moment</div>`;
  }
}

/* ------------------------------------------------------------
   Étape : questions génériques (cartes, listes, nombre, select)
   ------------------------------------------------------------ */

function renderQuestion(stage, key, q) {
  let bodyHtml = "";

  if (q.type === "single-card") {
    bodyHtml = `<div class="options-grid">${q.options.map((o) => `
      <div class="opt-card ${state.answers[key] === o.value ? "selected" : ""}" data-value="${o.value}">
        ${o.icon || ""}
        <span>${o.label}</span>
      </div>`).join("")}</div>`;
  }

  if (q.type === "single-list") {
    bodyHtml = `<div class="options-list">${q.options.map((o) => `
      <div class="opt-row ${state.answers[key] === o.value ? "selected" : ""}" data-value="${o.value}">
        <div class="opt-row-main"><span>${o.label}</span></div>
        <input type="radio" name="${key}" ${state.answers[key] === o.value ? "checked" : ""} readonly>
      </div>`).join("")}</div>`;
  }

  if (q.type === "multi-list") {
    const current = state.answers[key] || [];
    bodyHtml = `<div class="options-list">${q.options.map((o) => `
      <div class="opt-row ${current.includes(o.value) ? "selected" : ""}" data-value="${o.value}">
        <div class="opt-row-main"><span>${o.label}</span></div>
        <input type="checkbox" ${current.includes(o.value) ? "checked" : ""} readonly>
      </div>`).join("")}</div>`;
  }

  if (q.type === "number") {
    bodyHtml = `<div class="field field-suffix-wrap">
      <input type="number" id="qInput" inputmode="decimal" placeholder="${q.placeholder || ""}" value="${state.answers[key] || ""}">
      <span class="field-suffix">${q.suffix || ""}</span>
    </div>`;
  }

  if (q.type === "select") {
    bodyHtml = `<div class="field">
      <select id="qInput">
        <option value="" disabled ${!state.answers[key] ? "selected" : ""}>Choisissez...</option>
        ${q.options.map((o) => `<option value="${o.value}" ${state.answers[key] === o.value ? "selected" : ""}>${o.label}</option>`).join("")}
      </select>
    </div>`;
  }

  stage.innerHTML = `
    ${renderBackButton(stage)}
    <div class="question-eyebrow">${q.eyebrow || ""}</div>
    <h1 class="question-title">${q.title}</h1>
    ${q.help ? `<p class="question-help">${q.help}</p>` : ""}
    ${bodyHtml}
    <div class="stage-footer">
      <button class="btn-primary" id="btnNext">Suivant<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </div>
  `;
  attachBack();

  const btnNext = document.getElementById("btnNext");

  function refreshNextState() {
    if (q.type === "multi-list") { btnNext.disabled = false; return; } // optionnel
    if (q.type === "number") {
      const v = document.getElementById("qInput").value;
      btnNext.disabled = !(v && parseFloat(v) > 0);
      return;
    }
    btnNext.disabled = !state.answers[key];
  }

  if (q.type === "single-card" || q.type === "single-list") {
    stage.querySelectorAll(".opt-card, .opt-row").forEach((el) => {
      el.addEventListener("click", () => {
        setAnswer(key, el.dataset.value);
        render();
        goNextAfterPaint();
      });
    });
  }

  if (q.type === "multi-list") {
    stage.querySelectorAll(".opt-row").forEach((el) => {
      el.addEventListener("click", () => {
        toggleMultiAnswer(key, el.dataset.value);
        const current = state.answers[key] || [];
        el.classList.toggle("selected", current.includes(el.dataset.value));
        el.querySelector("input").checked = current.includes(el.dataset.value);
      });
    });
  }

  if (q.type === "number") {
    const input = document.getElementById("qInput");
    input.addEventListener("input", () => {
      setAnswer(key, input.value);
      refreshNextState();
    });
  }

  if (q.type === "select") {
    const sel = document.getElementById("qInput");
    sel.addEventListener("change", () => {
      setAnswer(key, sel.value);
      refreshNextState();
    });
  }

  refreshNextState();
  btnNext.addEventListener("click", () => {
    if (btnNext.disabled) return;
    goNext();
  });
}

// Pour les cartes / listes à sélection unique, on avance automatiquement
// après un court délai pour laisser voir la sélection (comme l'original).
function goNextAfterPaint() {
  setTimeout(() => goNext(), 260);
}

/* ------------------------------------------------------------
   Étape : contact (capture du lead, avant calcul)
   ------------------------------------------------------------ */

function renderContact(stage) {
  const c = state.answers.contact || {};
  stage.innerHTML = `
    ${renderBackButton(stage)}
    <div class="question-eyebrow">Dernière étape</div>
    <h1 class="question-title">Recevez votre estimation</h1>
    <p class="question-help">Indiquez vos coordonnées pour recevoir votre fourchette d'estimation par e-mail, sans aucun engagement.</p>

    <div class="field">
      <label for="cNom">Nom</label>
      <input type="text" id="cNom" value="${c.nom || ""}" placeholder="Nom">
    </div>
    <div class="field">
      <label for="cPrenom">Prénom</label>
      <input type="text" id="cPrenom" value="${c.prenom || ""}" placeholder="Prénom">
    </div>
    <div class="field">
      <label for="cEmail">E-mail</label>
      <input type="email" id="cEmail" value="${c.email || ""}" placeholder="vous@exemple.fr">
    </div>
    <div class="field">
      <label for="cTel">Téléphone</label>
      <input type="tel" id="cTel" value="${c.telephone || ""}" placeholder="06 12 34 56 78">
    </div>

    <label class="checkbox-row">
      <input type="checkbox" id="cConsent" ${c.consent ? "checked" : ""}>
      <span>J'accepte que mes données soient utilisées pour recevoir mon estimation et être recontacté(e) à ce sujet.</span>
    </label>
    <div class="field-error" id="cError">Merci de compléter tous les champs et d'accepter les conditions pour continuer.</div>

    <div class="stage-footer">
      <button class="btn-primary" id="btnNext">Découvrir mon estimation<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </div>
  `;
  attachBack();

  document.getElementById("btnNext").addEventListener("click", () => {
    const nom = document.getElementById("cNom").value.trim();
    const prenom = document.getElementById("cPrenom").value.trim();
    const email = document.getElementById("cEmail").value.trim();
    const telephone = document.getElementById("cTel").value.trim();
    const consent = document.getElementById("cConsent").checked;
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!nom || !prenom || !emailValid || !telephone || !consent) {
      document.getElementById("cError").classList.add("show");
      return;
    }
    state.answers.contact = { nom, prenom, email, telephone, consent };
    runEstimation();
  });
}

/* ------------------------------------------------------------
   Calcul de l'estimation — recherche de comparables via DVF
   ------------------------------------------------------------ */

async function runEstimation() {
  renderLoading();

  const a = state.answers;
  const surface = parseFloat(a.surface);
  const typeLocalCible = a.type === "maison" ? "Maison" : "Appartement";

  let raw = [];
  let radius = CONFIG.estimation.rayonRechercheMetres;
  let attempts = 0;

  // On élargit progressivement le rayon si pas assez de comparables.
  while (attempts < 3) {
    try {
      raw = await fetchDVF(state.addressCoords.lat, state.addressCoords.lon, radius);
    } catch (e) {
      raw = [];
    }
    const filtered = filterComparables(raw, typeLocalCible, surface);
    if (filtered.length >= CONFIG.estimation.minComparables || radius > 3000) {
      break;
    }
    radius = radius * 2;
    attempts += 1;
  }

  const comparables = filterComparables(raw, typeLocalCible, surface);
  state.comparables = comparables;
  state.estimation = computeRange(comparables, surface, a.etat);

  // Pendant que l'utilisateur regarde l'animation, on en profite pour
  // envoyer le lead (Notion + email) en arrière-plan.
  sendLeadEverywhere();

  setTimeout(() => renderResult(), 2200);
}

function renderLoading() {
  const stage = document.getElementById("stage");
  if (!stage) return;
  stage.innerHTML = `
    <div class="loading-screen">
      <div class="loading-orb"></div>
      <div class="loading-title">Calcul de votre estimation…</div>
      <div class="loading-steps">
        <div class="loading-step" id="ls1"><span class="dot"></span> Analyse de vos caractéristiques</div>
        <div class="loading-step" id="ls2"><span class="dot"></span> Recherche des ventes comparables</div>
        <div class="loading-step" id="ls3"><span class="dot"></span> Compilation de l'estimation</div>
      </div>
    </div>
  `;
  setTimeout(() => document.getElementById("ls1")?.classList.add("active"), 150);
  setTimeout(() => document.getElementById("ls2")?.classList.add("active"), 850);
  setTimeout(() => document.getElementById("ls3")?.classList.add("active"), 1600);
}

async function fetchDVF(lat, lon, dist) {
  const url = `https://api.cquest.org/dvf?lat=${lat}&lon=${lon}&dist=${Math.round(dist)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("DVF indisponible");
  const json = await res.json();
  return json.resultats || json.features || [];
}

function filterComparables(raw, typeLocalCible, surfaceCible) {
  const tolerance = CONFIG.estimation.surfaceToleranceRatio;
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - CONFIG.estimation.anneesHistorique);

  return raw
    .map(normalizeDvfRecord)
    .filter((r) => r && r.valeurFonciere > 1000 && r.surface > 8)
    .filter((r) => !typeLocalCible || !r.typeLocal || r.typeLocal === typeLocalCible)
    .filter((r) => {
      if (!surfaceCible) return true;
      const min = surfaceCible * (1 - tolerance);
      const max = surfaceCible * (1 + tolerance);
      return r.surface >= min && r.surface <= max;
    })
    .filter((r) => !r.date || isNaN(new Date(r.date).getTime()) || new Date(r.date) >= minDate);
}

function normalizeDvfRecord(r) {
  // L'API cquest renvoie des champs à plat ; certaines variantes les nichent dans "fields".
  const f = r.fields || r;
  const valeurFonciere = parseFloat(f.valeur_fonciere ?? f.valeurfonc ?? f.valeur_fonciere_ ?? NaN);
  const surface = parseFloat(f.surface_relle_bati ?? f.surface_reelle_bati ?? f.sbati ?? NaN);
  const typeLocalRaw = f.type_local || f.libtyploc || "";
  const typeLocal = typeLocalRaw.includes("Appartement") ? "Appartement" : typeLocalRaw.includes("Maison") ? "Maison" : typeLocalRaw;
  const date = f.date_mutation || f.datemut || null;
  const adresse = [f.adresse_numero, f.adresse_nom_voie].filter(Boolean).join(" ") || f.l_voie || "";
  const commune = f.nom_commune || f.libcom || state.addressCity;
  if (!valeurFonciere || !surface) return null;
  return { valeurFonciere, surface, typeLocal, date, adresse, commune, prixM2: valeurFonciere / surface };
}

function computeRange(comparables, surfaceCible, etatKey) {
  if (!comparables.length) return null;

  const prixM2List = comparables.map((c) => c.prixM2).sort((a, b) => a - b);
  const minM2 = prixM2List[0];
  const maxM2 = prixM2List[prixM2List.length - 1];

  const coef = ETAT_COEFFICIENTS[etatKey] || 1;
  const min = Math.round((minM2 * surfaceCible * coef) / 100) * 100;
  const max = Math.round((maxM2 * surfaceCible * coef) / 100) * 100;

  return { min: Math.min(min, max), max: Math.max(min, max), count: comparables.length };
}

/* ------------------------------------------------------------
   Envoi du lead — Notion (stockage) + EmailJS (email au prospect)
   ------------------------------------------------------------ */

function sendLeadEverywhere() {
  sendLeadToNotion().catch((e) => console.warn("Notion : envoi impossible", e));
  sendEmailToProspect().catch((e) => console.warn("EmailJS : envoi impossible", e));
}

async function sendLeadToNotion() {
  if (!CONFIG.notion.enabled) return;
  if (!CONFIG.notion.proxyUrl) {
    console.warn("Notion : proxyUrl non configuré, voir NOTICE.md");
    return;
  }
  const a = state.answers;
  const c = a.contact || {};
  const est = state.estimation;

  const body = {
    token: CONFIG.notion.token,
    databaseId: CONFIG.notion.databaseId,
    properties: {
      Nom: c.nom || "",
      Prenom: c.prenom || "",
      Email: c.email || "",
      Telephone: c.telephone || "",
      Adresse: state.addressLabel || "",
      TypeBien: a.type === "maison" ? "Maison" : "Appartement",
      Surface: parseFloat(a.surface) || 0,
      Pieces: a.pieces || "",
      EstimationMin: est ? est.min : null,
      EstimationMax: est ? est.max : null,
      NbComparables: est ? est.count : 0,
      Date: new Date().toISOString(),
    },
  };

  await fetch(CONFIG.notion.proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

let emailjsLoaded = false;
function ensureEmailJsLoaded() {
  return new Promise((resolve, reject) => {
    if (emailjsLoaded || window.emailjs) { emailjsLoaded = true; resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    script.onload = () => {
      emailjsLoaded = true;
      window.emailjs.init({ publicKey: CONFIG.emailjs.publicKey });
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function sendEmailToProspect() {
  if (!CONFIG.emailjs.enabled) return;
  await ensureEmailJsLoaded();

  const a = state.answers;
  const c = a.contact || {};
  const est = state.estimation;

  const params = {
    prenom: c.prenom || "",
    nom: c.nom || "",
    email: c.email || "",
    adresse: state.addressLabel || "",
    type_bien: a.type === "maison" ? "maison" : "appartement",
    surface: a.surface || "",
    estimation_min: est ? formatEUR(est.min) : "non disponible",
    estimation_max: est ? formatEUR(est.max) : "non disponible",
    agence_nom: CONFIG.agence.nom,
    agence_telephone: CONFIG.agence.telephone,
  };

  await window.emailjs.send(CONFIG.emailjs.serviceId, CONFIG.emailjs.templateId, params);
}

/* ------------------------------------------------------------
   Écran de résultat
   ------------------------------------------------------------ */

function formatEUR(n) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €";
}

function renderResult() {
  const a = state.answers;
  const est = state.estimation;
  const stage = document.getElementById("stage");
  if (!stage) return;

  const pills = [];
  if (a.type) pills.push(LABELS_RECAP.type[a.type]);
  if (a.surface) pills.push(`${a.surface} m² de surface habitable`);
  if (a.pieces) pills.push(LABELS_RECAP.pieces[a.pieces]);
  if (a.etage !== undefined && a.etage !== "") pills.push(a.etage === "rdc" ? "Rez-de-chaussée" : `${a.etage}${a.etage === "1" ? "er" : "ème"} étage`);
  if (a.etat) pills.push(LABELS_RECAP.etat[a.etat]);
  if (a.vue) pills.push(LABELS_RECAP.vue[a.vue]);
  if (a.luminosite) pills.push(LABELS_RECAP.luminosite[a.luminosite]);
  if (a.calme) pills.push(LABELS_RECAP.calme[a.calme]);
  if (a.annee) pills.push(LABELS_RECAP.annee[a.annee]);
  if (a.caracteristiques && a.caracteristiques.length) {
    a.caracteristiques.forEach((c) => {
      if (c === "balcon") pills.push("Balcon / Terrasse");
      if (c === "garage") pills.push("Garage / Parking");
      if (c === "cave") pills.push("Cave");
    });
  }

  let resultCardHtml = "";
  if (est) {
    resultCardHtml = `
      <div class="result-card">
        <div class="result-range">${formatEUR(est.min)}<span class="sep">à</span>${formatEUR(est.max)}</div>
        <div class="result-meta">Basé sur ${est.count} vente${est.count > 1 ? "s" : ""} comparable${est.count > 1 ? "s" : ""} dans le secteur</div>
      </div>
    `;
  } else {
    resultCardHtml = `
      <div class="empty-note">
        Nous n'avons pas trouvé assez de ventes comparables récentes dans ce secteur pour calculer une fourchette fiable.
        Un conseiller ${CONFIG.agence.nomCourt} vous recontactera pour une estimation personnalisée.
      </div>
    `;
  }

  const compsHtml = state.comparables.length ? `
    <div class="recap-title">Ventes comparables ayant servi au calcul</div>
    <div class="comp-list">
      ${state.comparables.slice(0, 6).map((c) => `
        <div class="comp-item">
          <div class="comp-top">
            <span>${c.typeLocal || "Bien"} ${Math.round(c.surface)} m²</span>
            <span class="comp-price">${formatEUR(c.valeurFonciere)}</span>
          </div>
          <div class="comp-meta">${c.commune || ""} ${c.date ? "· " + new Date(c.date).toLocaleDateString("fr-FR") : ""}</div>
        </div>
      `).join("")}
    </div>
  ` : "";

  stage.innerHTML = `
    <div class="result-wrap">
      <div class="result-badge">Votre estimation</div>
      <h1 class="result-title">${a.type === "maison" ? "Votre maison" : "Votre appartement"} est estimé entre</h1>
      <p class="result-sub">Cette fourchette est calculée à partir des ventes réelles enregistrées par les services fiscaux (DVF) pour des biens comparables au vôtre, dans votre secteur. Elle est indicative et peut être affinée par un professionnel local.</p>

      ${resultCardHtml}

      ${pills.length ? `
        <div class="recap-title">Récapitulatif de vos critères</div>
        <div class="recap-pills">${pills.map((p) => `<span class="pill">${p}</span>`).join("")}</div>
      ` : ""}

      ${compsHtml}

      <div class="disclaimer">
        Cette estimation est fournie à titre indicatif à partir des données DVF (Demandes de Valeurs Foncières, DGFiP — data.gouv.fr) et ne constitue pas une évaluation contractuelle. Conformément à vos droits, vous pouvez vous inscrire sur la liste d'opposition au démarchage téléphonique sur <a href="https://www.bloctel.gouv.fr" target="_blank">bloctel.gouv.fr</a>. Vos données ne sont pas partagées avec des tiers.
      </div>

      <div style="margin-top:28px;">
        <button class="btn-primary" id="btnRestart">Refaire une estimation</button>
      </div>
    </div>
  `;

  document.getElementById("btnRestart").addEventListener("click", () => {
    state.stepIndex = 0;
    state.answers = {};
    state.addressLabel = "";
    state.addressCoords = null;
    state.comparables = [];
    state.estimation = null;
    render();
  });
}

/* ------------------------------------------------------------
   Démarrage
   ------------------------------------------------------------ */

render();
