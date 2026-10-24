/* Socle commun des 3 modèles de page « Diagnostic offert » ZTi.
   - calculateur du coût réel d'un poste (formule de l'offre : prix d'achat ÷ mois d'utilisation)
   - formulaire en 2 étapes (champs de la Fiche d'enregistrement de prospection), consentement loi n° 2024/017
   - confirmation : récapitulatif + envoi par WhatsApp et par e-mail
   - animations sobres : apparition au défilement, compteurs
   L'envoi vers Google Sheets sera branché sur le modèle retenu (ZTI.endpoint). */
window.ZTI = (() => {
  const WA = '237699324689', MAIL = 'zeltuminitiative@gmail.com';
  const fmt = n => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- apparition au défilement ---------- */
  function reveal() {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });
    $$('.rv').forEach(e => io.observe(e));
    const ioc = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { count(e.target); ioc.unobserve(e.target); } }), { threshold: .6 });
    $$('[data-count]').forEach(e => ioc.observe(e));
  }
  function count(e) {
    const to = +e.dataset.count, d = 1100, t0 = performance.now(), dec = +(e.dataset.dec || 0);
    const step = t => { const p = Math.min(1, (t - t0) / d), v = to * (1 - Math.pow(1 - p, 3)); e.textContent = dec ? v.toFixed(dec).replace('.', ',') : fmt(v); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  /* ---------- calculateur ---------- */
  // Pack 2 — Fiabilité, prix HT par poste selon le nombre de postes (4.1 · Grille tarifaire Salle TIC, 1er sept. 2026 – 31 août 2027)
  const PACK2 = [[4, 14000], [9, 12500], [29, 11000], [49, 9500], [Infinity, 8000]];
  function calc(root = document) {
    const prix = $('[data-calc="prix"]', root), postes = $('[data-calc="postes"]', root);
    if (!prix) return;
    const out = k => $(`[data-out="${k}"]`, root);
    const anim = (e, v) => { if (!e) return; const from = +(e.dataset.v || 0), t0 = performance.now();
      e.dataset.v = v; const step = t => { const p = Math.min(1, (t - t0) / 450); e.textContent = fmt(from + (v - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); };
    const upd = () => {
      const P = Math.max(0, +String(prix.value).replace(/\D/g, '') || 0), N = Math.max(1, +postes.value || 1);
      // un ordinateur : coût mensuel = prix ÷ mois ; coût annuel = coût mensuel × 12 (offre, § 8)
      anim(out('m24'), P / 24); anim(out('m36'), P / 36);
      anim(out('a24'), P / 24 * 12); anim(out('a36'), P / 36 * 12); anim(out('eco'), (P / 24 - P / 36) * 12);
      // la salle : investissement total = prix × postes
      anim(out('tot'), P * N);
      anim(out('s24'), P * N / 24); anim(out('s36'), P * N / 36);
      anim(out('sa24'), P * N / 24 * 12); anim(out('sa36'), P * N / 36 * 12);
      anim(out('seco'), (P / 24 - P / 36) * N * 12); anim(out('gain'), (P / 24 - P / 36) * N * 12);
      // maintenance rentable : prix du Pack 2 selon le nombre de postes (grille Salle TIC 4.1, jamais affichée en tableau)
      const p2 = PACK2.find(([max]) => N <= max)[1], mens = P / 36, mois = mens ? p2 / mens : 0;
      anim(out('p2'), p2); anim(out('p2s'), p2 * N); anim(out('mens'), mens);
      const txt = (k, v) => $$(`[data-out="${k}"]`, root).forEach(e => e.textContent = v);
      txt('prixp', fmt(P)); txt('p2b', fmt(p2)); txt('mensb', fmt(mens));
      txt('mois', mois.toFixed(1).replace('.', ',')); txt('moisb', mois.toFixed(1).replace('.', ','));
      const bar = $('[data-out="bar"]', root); if (bar) bar.style.setProperty('--r', (24 / 36).toFixed(3));
      $$('[data-out="n"]', root).forEach(e => e.textContent = N);
    };
    [prix, postes].forEach(i => i.addEventListener('input', upd)); upd();
  }

  /* ---------- type d'établissement reconnu d'après son nom (ordre : du plus englobant au plus précis) ---------- */
  // m(…) : le mot ou le sigle doit être isolé (fonctionne avec les lettres accentuées : « École », « Lycée »)
  const m = s => new RegExp(`(?:^|[^\\p{L}\\d])(?:${s})(?![\\p{L}\\d])`, 'iu');
  const TYPES_NOM = [
    [m('groupe\\s+scolaire|g\\.?\\s?s\\.?\\s?b?\\.?'), 'Groupe scolaire'],              // GS, GSB (groupe scolaire bilingue)
    [m('complexe\\s+scolaire|c\\.?\\s?s\\.?\\s?b?\\.?'), 'Complexe scolaire'],          // CS, CSB
    [m('cit[ée]\\s+scolaire'), 'Cité scolaire'],
    [m('campus'), 'Campus scolaire'],
    [m('lyc[ée]e|l\\.?\\s?b\\.?|l\\.?\\s?t\\.?'), 'Lycée'],                              // LB (lycée bilingue), LT (lycée technique)
    [m('coll[èe]ge|c\\.?e\\.?s\\.?|c\\.?e\\.?g\\.?|c\\.?e\\.?t\\.?i\\.?c\\.?'), 'Collège'], // CES, CEG, CETIC
    [m('[ée]cole\\s+maternelle|maternelle|e\\.?\\s?m\\.?'), 'École maternelle'],
    [m('[ée]cole\\s+primaire|e\\.?\\s?p\\.?\\s?b?\\.?'), 'École primaire'],               // EP, EPB
    [m('institut'), 'Institut'],
    [m('centre\\s+(?:de\\s+)?formation'), 'Centre de formation'],
    [m('centre\\s+[ée]ducatif'), 'Centre éducatif'],
  ];
  const typesDuNom = n => TYPES_NOM.filter(([re]) => re.test(n || '')).map(r => r[1]);   // « Collège Lycée X » → Collège et Lycée
  const typeDuNom = n => typesDuNom(n)[0] || '';

  /* ---------- formulaire en 2 étapes ---------- */
  function form(root = document) {
    const f = $('form[data-zti]', root); if (!f) return;
    const steps = $$('[data-step]', f), dots = $$('[data-dot]', root);
    let k = 0;
    const show = i => { k = i; steps.forEach((s, j) => s.hidden = j !== i); dots.forEach((d, j) => d.classList.toggle('on', j <= i));
      const t = $('[data-steptitle]', root); if (t) t.textContent = `Étape ${i + 1} sur ${steps.length}`;
      f.dispatchEvent(new CustomEvent('zti:step', { detail: i })); };
    // contrôles contre les saisies fantaisistes (« xwvc », « dghfdhghfg »…) : data-check sur le champ
    const voy = v => /[aeiouàâäéèêëîïôöùûü]/i.test(v);                       // un vrai mot contient au moins une voyelle
    const CHECK = {
      texte: v => v.length >= 3 && voy(v) && !/(.)\1{3,}/.test(v) && !/[bcdfghjklmnpqrstvwxz]{5,}/i.test(v.replace(/\s/g, '')),
      nom: v => v.length >= 2 && voy(v) && /^[a-zà-öø-ÿ' .-]+$/i.test(v) && !/[bcdfghjklmnpqrstvwxz]{5,}/i.test(v.replace(/\s/g, '')),
      tel: v => /^(237)?6\d{8}$/.test(v.replace(/[^\d]/g, '')),               // +237 obligatoire (affiché devant le champ) puis 9 chiffres commençant par 6
      email: v => /^[^\s@]+@[^\s@]+\.[a-z]{2,24}$/i.test(v) && voy(v.split('@')[1].split('.')[0] + 'a') && !/[bcdfghjklmnpqrstvwxz]{6,}/i.test(v.split('@')[1]),
      postes: v => +v >= 1 && +v <= 2000,
    };
    const valid = s => { let ok = true; $$('[required]', s).forEach(i => { const v = i.value.trim(), c = CHECK[i.dataset.check || (i.type === 'email' ? 'email' : '')];
      const bad = i.type === 'checkbox' ? !i.checked : (i.type === 'radio' ? !$$(`[name="${i.name}"]`, s).some(r => r.checked) : (!v || (c && !c(v))));
      i.closest('.fld')?.classList.toggle('err', bad); if (bad) ok = false; }); return ok; };
    const t0 = Date.now();   // envoi en moins de 5 s ou champ piège rempli = robot : la demande n'est pas transmise
    // cohérence nom ↔ type : le type est reconnu d'après le nom (mots et sigles courants au Cameroun) et choisi automatiquement ;
    // un type contraire au nom est refusé avec une explication
    const etab = f.elements.etab, type = f.elements.type;
    if (etab && type) {
      const note = document.createElement('span'); note.className = 'gok'; type.closest('.fld').appendChild(note);
      let auto = '';
      const maj = () => { const t = typeDuNom(etab.value);
        if (t && (!type.value || type.value === auto)) { type.value = t; auto = t; }
        note.textContent = t ? `✓ Type reconnu d'après le nom : ${t}` : ''; };
      etab.addEventListener('input', maj); type.addEventListener('change', () => { auto = ''; maj(); });
      CHECK.type = v => { const ts = typesDuNom(etab.value); return !ts.length || ts.includes(v); };
      type.dataset.check = 'type';
      const e = type.closest('.fld').querySelector('.e'); type.addEventListener('change', () => { const t = typeDuNom(etab.value);
        e.textContent = t && !typesDuNom(etab.value).includes(type.value) ? `Le nom « ${etab.value.trim()} » correspond à : ${t}. Corrigez le type ou le nom.` : 'Choisissez le type.'; });
    }
    $$('[data-next]', f).forEach(b => b.addEventListener('click', () => { if (valid(steps[k])) show(k + 1); }));
    $$('[data-prev]', f).forEach(b => b.addEventListener('click', () => show(k - 1)));
    f.addEventListener('submit', async e => {
      e.preventDefault(); if (!valid(steps[k])) return;
      if ((f.elements.site && f.elements.site.value) || Date.now() - t0 < 5000) return;
      const d = Object.fromEntries(new FormData(f)); d.parcs = $$('[name="parcs"]:checked', f).map(c => c.value).join(', ');
      d.problemes = $$('[name="problemes"]:checked', f).map(c => c.value).join(', ') || 'Non précisé'; d.origine = 'Site / tunnel en ligne'; delete d.site; d.date = new Date().toLocaleString('fr-FR');
      if (window.ZTI.endpoint) { try { await fetch(window.ZTI.endpoint, { method: 'POST', mode: 'no-cors', body: JSON.stringify(d) }); } catch (_) {} }
      // pixel Meta : événement « Lead » seulement après une demande valide (aucune donnée personnelle transmise)
      const parcs = d.parcs.split(', ').filter(Boolean);
      if (window.fbq) fbq('track', 'Lead', { content_name: 'Diagnostic scolaire offert', content_category: parcs.length > 1 ? 'Les deux' : (parcs[0] || 'Salle TIC') });
      done(d, root);
    });
    // position de l'établissement (facultatif) : lien Google Maps ajouté à la demande
    $$('[data-geo]', f).forEach(b => b.addEventListener('click', () => {
      const ok = $('[data-geook]', f), inp = $('[name="position"]', f);
      if (!navigator.geolocation) { ok.textContent = 'Position non disponible sur cet appareil.'; return; }
      ok.textContent = 'Recherche de la position…';
      navigator.geolocation.getCurrentPosition(p => { const { latitude: la, longitude: lo } = p.coords; inp.value = `https://maps.google.com/?q=${la.toFixed(6)},${lo.toFixed(6)}`; ok.textContent = '✓ Position enregistrée (à faire depuis l\'établissement).'; },
        () => { ok.textContent = 'Position refusée : le quartier et le repère suffisent.'; }, { enableHighAccuracy: true, timeout: 12000 });
    }));
    show(0);
  }
  // récapitulatif mis en forme : version WhatsApp (*gras*, repères visuels) et version texte (e-mail, page)
  const maj1 = s => (s || '').trim().replace(/^\p{L}/u, c => c.toUpperCase());                                  // « émana » → « Émana »
  const mots = s => (s || '').trim().toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, a, c) => a + c.toUpperCase()); // « jean-paul » → « Jean-Paul »
  // nom de l'établissement : sigles en capitales, mots principaux avec majuscule (« gs blaise » → « GS Blaise », « lycée d'emana » → « Lycée d'Emana »)
  const SIGLES = /^(gs|gsb|cs|csb|lb|lt|ces|ceg|cetic|em|ep|epb|ens|enieg|eniet)$/i, PETITS = /^(de|du|des|et|à|au|aux|en|sur)$/i;
  const nomEtab = s => (s || '').trim().replace(/\s+/g, ' ').split(' ').map((w, i, t) => {
    if (SIGLES.test(w.replace(/\./g, ''))) return w.toUpperCase();
    if (w === w.toUpperCase()) return w;                                  // déjà en capitales : on respecte la saisie
    if (i > 0 && (PETITS.test(w) || (/^(le|la|les)$/i.test(w) && PETITS.test(t[i - 1])))) return w.toLowerCase();   // « de la Retraite », mais « Les Anges »
    return w.replace(/(^|-)([dl]')?(\p{L})/giu, (m, h, a, c) => h + (a || '').toLowerCase() + c.toUpperCase());     // « ngoa-ekelle » → « Ngoa-Ekelle »
  }).join(' ');
  const telFmt = t => '+237 ' + (t || '').replace(/[^\d]/g, '').replace(/^237/, '').replace(/^(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1$2 $3 $4 $5');
  const FEM = { Fondateur: 'Fondatrice', Promoteur: 'Promotrice', Directeur: 'Directrice', Principal: 'Principale', Proviseur: 'Proviseure' };   // fonction accordée avec Mme / Mlle
  function infos(d) {
    const sans = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return { etab: nomEtab(d.etab), type: sans(d.etab).includes(sans(d.type)) ? '' : d.type,   // « Lycée de Nkol » + Lycée : pas de « (Lycée) » en double
      parcs: d.parcs, postes: d.postes,
      lieu: [maj1(d.quartier), maj1(d.repere)].filter(Boolean).join(', ') + ' — ' + (d.ville || 'Yaoundé'), position: d.position,
      qui: [d.civilite, (d.nom || '').trim().toUpperCase(), mots(d.prenom)].filter(Boolean).join(' '), fonction: /^M(me|lle)$/.test(d.civilite) ? (FEM[d.fonction] || d.fonction) : d.fonction,
      tel: telFmt(d.tel), email: (d.email || '').trim().toLowerCase(), moment: (d.moment || '').toLowerCase(), soucis: d.problemes,
      maintenance: d.maintenance, prix: d.prix };
  }
  function recapWA(d) {
    const i = infos(d);
    return [`*DEMANDE DE DIAGNOSTIC SCOLAIRE OFFERT — ZTi*`, ``,
      `🏫 *Établissement*`, (i.type ? `${i.etab} (${i.type})` : i.etab), `Parc : ${i.parcs} · ${i.postes} poste${+i.postes > 1 ? 's' : ''}`, ``,
      `📍 *Localisation*`, i.lieu, ...(i.position ? [`Position : ${i.position}`] : []), ``,
      `👤 *Décideur*`, `${i.qui} — ${i.fonction}`, `📞 ${i.tel}`, `✉️ ${i.email}`, `🕗 Meilleur moment : ${i.moment}`, ``,
      `⚠️ *Ce qui le préoccupe le plus*`, i.soucis,
      ...(i.maintenance ? [``, `Maintenance actuelle : ${i.maintenance}`] : []), ...(i.prix ? [`Prix d'achat moyen d'un poste : ${i.prix} F CFA`] : [])].join('\n');
  }
  function recap(d) {
    const i = infos(d);
    return [`DEMANDE DE DIAGNOSTIC SCOLAIRE OFFERT — ZTi`, ``,
      `ÉTABLISSEMENT`, (i.type ? `${i.etab} (${i.type})` : i.etab), `Parc : ${i.parcs} · ${i.postes} poste${+i.postes > 1 ? 's' : ''}`, ``,
      `LOCALISATION`, i.lieu, ...(i.position ? [`Position : ${i.position}`] : []), ``,
      `DÉCIDEUR`, `${i.qui} — ${i.fonction}`, `Téléphone / WhatsApp : ${i.tel}`, `E-mail : ${i.email}`, `Meilleur moment : ${i.moment}`, ``,
      `CE QUI LE PRÉOCCUPE LE PLUS`, i.soucis,
      ...(i.maintenance ? [``, `Maintenance actuelle : ${i.maintenance}`] : []), ...(i.prix ? [`Prix d'achat moyen d'un poste : ${i.prix} F CFA`] : [])].join('\n');
  }
  function done(d, root) {
    const box = $('[data-done]', root); if (!box) return;
    const txt = recap(d);
    $('[data-recap]', box).textContent = txt;
    $('[data-wa]', box).href = `https://wa.me/${WA}?text=${encodeURIComponent(recapWA(d))}`;
    $('[data-mail]', box).href = `mailto:${MAIL}?subject=${encodeURIComponent('Diagnostic scolaire offert — ' + nomEtab(d.etab))}&body=${encodeURIComponent(txt)}`;
    $('form[data-zti]', root).hidden = true; box.hidden = false; box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $$('[data-dot]', root).forEach(x => x.classList.add('on'));
  }

  /* ---------- visionneuse des attestations ---------- */
  // visionneuse : un clic sur le document zoome (x 2,5) à l'endroit cliqué, la souris déplace la loupe ; ✕ ou clic hors du document ferme
  function viewer() {
    const dlg = $('#viewer'); if (!dlg) return;
    const img = $('img', dlg); img.classList.add('protege'); img.draggable = false;
    dlg.insertAdjacentHTML('afterbegin', '<button type="button" class="v-fermer" aria-label="Fermer">×</button>');
    const zoom = on => { dlg.classList.toggle('zoom', on); if (!on) img.style.transformOrigin = '50% 50%'; };
    const loupe = e => { const r = img.getBoundingClientRect(); if (!dlg.classList.contains('zoom')) return;
      img.style.transformOrigin = `${Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100))}% ${Math.min(100, Math.max(0, (e.clientY - r.top) / r.height * 100))}%`; };
    $$('[data-att]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); img.src = a.dataset.att; zoom(false);
      $('figcaption', dlg).textContent = (a.dataset.cap || '') + ' · Cliquez sur le document pour zoomer.'; dlg.showModal(); }));
    img.addEventListener('click', e => { e.stopPropagation(); const r = img.getBoundingClientRect();
      if (!dlg.classList.contains('zoom')) img.style.transformOrigin = `${(e.clientX - r.left) / r.width * 100}% ${(e.clientY - r.top) / r.height * 100}%`;
      zoom(!dlg.classList.contains('zoom')); });
    img.addEventListener('mousemove', loupe);
    dlg.addEventListener('click', e => { if (e.target === dlg || e.target.classList.contains('v-fermer')) dlg.close(); });
    dlg.addEventListener('close', () => zoom(false));
  }
  // attestations et photo du fondateur : pas de clic droit « Enregistrer l'image », pas de glisser-déposer
  function protege() {
    ['contextmenu', 'dragstart'].forEach(t => document.addEventListener(t, e => { if (e.target.closest && e.target.closest('.protege, .att, #viewer')) e.preventDefault(); }));
  }

  // logo animé de la signature : sans son, joué une fois quand la section arrive à l'écran, puis arrêté sur le logo complet
  function logoAnime() {
    const v = $('.signature video'); if (!v) return; v.muted = true; v.defaultMuted = true;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;   // le visiteur voit l'image finale (poster)
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { v.currentTime = 0; v.play().catch(() => {}); io.disconnect(); } }, { threshold: .5 }); io.observe(v);
  }

  // politique de confidentialité : cachée, ouverte uniquement par le lien du pied de page ; ✕, Échap ou clic hors du texte ferme
  function politique() {
    const dlg = $('#politique'); if (!dlg) return;
    $$('[data-politique]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); dlg.showModal(); dlg.scrollTop = 0; }));
    dlg.addEventListener('click', e => { if (e.target === dlg || e.target.hasAttribute('data-fermer')) dlg.close(); });
  }

  /* ---------- « Suivez-nous » : comptes de ZTi ----------
     Pour ajouter un réseau : renseigner « compte » (ce qui s'affiche) et « url » (le lien). Une carte sans url s'affiche « Bientôt disponible », sans lien. */
  const RESEAUX = [
    { nom: 'Google Maps', compte: '', url: '', icone: 'maps' },   // fiche d'établissement Google : itinéraire, horaires, avis des clients
    { nom: 'Facebook',  compte: '', url: '', icone: 'facebook' },
    { nom: 'YouTube',   compte: '', url: '', icone: 'youtube' },
    { nom: 'TikTok',    compte: '', url: '', icone: 'tiktok' },
    { nom: 'LinkedIn',  compte: '', url: '', icone: 'linkedin' },
    { nom: 'Instagram', compte: '', url: '', icone: 'instagram' },
    { nom: 'X',         compte: '', url: '', icone: 'x' },
    { nom: 'Communauté WhatsApp', compte: '', url: '', icone: 'whatsapp' },
  ];
  const ICONES = {
    whatsapp: 'M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2s.2-1.1.2-1.2-.2-.2-.4-.3z',
    facebook: 'M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12z',
    youtube: 'M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.8 15.1V8.9l5.4 3.1z',
    tiktok: 'M16.6 2h-3.4v13.4a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.1a6.4 6.4 0 1 0 5.4 6.3V8.6a8 8 0 0 0 4.7 1.5V6.7a4.7 4.7 0 0 1-4.7-4.7z',
    instagram: 'M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4a3.7 3.7 0 0 1-1.4-.9 3.7 3.7 0 0 1-.9-1.4c-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1 0-1.7.2-2.1.4-.5.2-.9.4-1.2.8-.4.3-.6.7-.8 1.2-.2.4-.3 1-.4 2.1C2.8 8.5 2.8 8.9 2.8 12s0 3.5.1 4.7c0 1.1.2 1.7.4 2.1.2.5.4.9.8 1.2.3.4.7.6 1.2.8.4.2 1 .3 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1 0 1.7-.2 2.1-.4.5-.2.9-.4 1.2-.8.4-.3.6-.7.8-1.2.2-.4.3-1 .4-2.1.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c0-1.1-.2-1.7-.4-2.1a3.2 3.2 0 0 0-.8-1.2 3.2 3.2 0 0 0-1.2-.8c-.4-.2-1-.3-2.1-.4C15.5 4 15.1 4 12 4zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8zm0 8a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2zm6.2-8.3a1.1 1.1 0 1 1-2.3 0 1.1 1.1 0 0 1 2.3 0z',
    x: 'M18.2 2.3h3.4l-7.4 8.4 8.7 11.5h-6.8l-5.3-7-6.1 7H1.3l7.9-9L.9 2.3h7l4.8 6.4 5.5-6.4zm-1.2 17.9h1.9L7.1 4.2H5.1l11.9 16z',
    maps: 'M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z',
    linkedin: 'M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6h.1a3.8 3.8 0 0 1 3.4-1.9c3.6 0 4.3 2.4 4.3 5.5v6.3zM5.3 7.4a2.1 2.1 0 1 1 0-4.1 2.1 2.1 0 0 1 0 4.1zM7.1 20.5H3.6V9h3.5v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z',
  };
  function reseaux() {
    const ul = $('[data-reseaux]'); if (!ul) return;
    // toutes les cartes s'affichent ; sans lien, la carte n'est pas cliquable et indique « Bientôt disponible »
    const svg = r => `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="${ICONES[r.icone]}"/></svg>`;
    ul.innerHTML = RESEAUX.map(r => r.url
      ? `<li><a href="${r.url}" target="_blank" rel="noopener">${svg(r)}<span><b>${r.nom}</b><small>${r.compte}</small></span></a></li>`
      : `<li><span class="rs-off">${svg(r)}<span><b>${r.nom}</b><small>Bientôt disponible</small></span></span></li>`).join('');
  }

  function init() { reveal(); calc(); form(); viewer(); protege(); logoAnime(); politique(); reseaux(); $$('[data-year]').forEach(e => e.textContent = new Date().getFullYear()); }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
  return { WA, MAIL, endpoint: null };
})();
