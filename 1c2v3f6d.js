(function () {
  'use strict';

  // ======== [ SECCIÓN 1: UTILIDADES ] ========================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const norm = (s) => (s || '').toString().replace(/\s+/g, ' ').trim();
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // HUD simple de estado (no intrusivo)
  function hud(msg) {
    let el = $('#tm-kanales-hud');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tm-kanales-hud';
      el.style.cssText = `
        position: fixed; bottom: 80px; right: 16px; z-index: 999999;
        background: #111827; color: #e5e7eb; border: 1px solid #374151; border-radius: 8px;
        padding: 8px 10px; font: 12px system-ui; box-shadow: 0 8px 20px rgba(0,0,0,.35);
      `;
      document.body.appendChild(el);
    }
    el.textContent = msg;
  }
  function hudDone() { $('#tm-kanales-hud')?.remove(); }

  // ======== [ SECCIÓN 2: TABLA Y PARSEO ] ====================================
  function findTable() {
    return $('table#canalesTv') || $('table.reactive-table') || $('table.table');
  }

  // Normalización de nombres: eliminar tokens sueltos hd/hdtv/tv, sin romper "HIT"
  function canonicalName(raw) {
    const cleaned = (raw || '')
      .toLowerCase()
      .replace(/[()_\-.,/]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const toks = cleaned.split(' ').filter(t => !['hd','hdtv','tv'].includes(t));
    return toks.join(' ').trim();
  }
  function displayName(variants) {
    const arr = Array.from(variants);
    return arr.sort((a,b)=>a.length-b.length || a.localeCompare(b,'es'))[0] || '';
  }

  // Clasificación de descripción en flags
  function classify(desc) {
    const d = (desc || '').toLowerCase();
    return {
      video: /\btipo\s*video\b/.test(d),
      audio: /\btipo\s*audio\b/.test(d),
      teletexto: /teletexto/.test(d),
      epg: /\bepg\b/.test(d),
      otros: /\botros\b/.test(d),
    };
  }
  function decideDiagnosis(flags) {
    const { video, audio, teletexto, epg, otros } = flags;
    if (video && audio) return 'señal caída';
    if (video) return 'sin imagen';
    if (audio) return 'fallo de audio';
    const secundarios = [];
    if (teletexto) secundarios.push('teletexto');
    if (epg) secundarios.push('EPG');
    if (otros) secundarios.push('otros');
    return secundarios.length ? `fallo ${secundarios.join(' / ')}` : 'indeterminado';
  }

  // Lectura de filas actuales
  function parseCurrentTableRows() {
    const table = findTable();
    if (!table) return { fallen: [], ccerr: [], tableFound: false };

    const trs = $$('tbody tr', table).filter(tr => tr.children.length);
    const fallen = [];
    const ccerr = [];

    for (const tr of trs) {
      const nombre = norm($('.campoPMT_SrvName', tr)?.textContent || tr.querySelector('td:nth-child(2)')?.textContent);
      const estado = norm($('.campocolor', tr)?.textContent || tr.querySelector('td:nth-child(12)')?.textContent);
      const red    = norm($('.campoRed', tr)?.textContent || tr.querySelector('td:nth-child(11)')?.textContent);
      const desc   = norm($('.campodescripcion_errores', tr)?.textContent || tr.querySelector('td:last-child')?.textContent);
      if (!nombre) continue;

      const st = (estado || '').toLowerCase();
      if (/(^|\s)(scrambling|socketfailed)(\s|$)/.test(st)) {
        fallen.push({ nombre, estado, red, desc });
      } else if (/(^|\s)ccerr(\s|$)/.test(st)) {
        ccerr.push({ nombre, estado: 'CCerr', red, desc });
      }
    }
    return { fallen, ccerr, tableFound: true };
  }

  // Parseo de PIDs y tipos en descripciones (CCerr)
  function parsePIDsAndTypes(desc) {
    const d = (desc || '').toLowerCase();
    const re = /pid\s+numero\s+(\d+)\s+de\s+tipo\s+(video|audio|teletexto|otros)/g;
    const out = [];
    let m; while ((m = re.exec(d))) out.push({ pid: m[1], tipo: m[2] });
    return out;
  }

  // ======== [ SECCIÓN 3: AGREGACIÓN Y AGRUPACIÓN ] ===========================
  // Fuerza 200 filas SOLO si hay paginación visible
  async function forceRowsPerPage200() {
    const pager = $('.pagination, ul.pagination, nav .pagination');
    if (!pager) return false; // una sola página → no tocar
    const input = $('#filas_pags');
    if (!input) return false;

    const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
    const keyEvt = (el, type, key = 'Enter') => el.dispatchEvent(new KeyboardEvent(type, { bubbles: true, key }));

    input.value = '200';
    fire(input, 'input');
    keyEvt(input, 'keydown', 'Enter');
    keyEvt(input, 'keyup', 'Enter');
    fire(input, 'change');
    input.blur();
    await sleep(600);
    return true;
  }

  // Rastrear paginación y recolectar
  async function crawlAllPagesAndCollect() {
    const collectedFallen = [];
    const collectedCCerr  = [];
    const seen = new Set();

    let { fallen, ccerr, tableFound } = parseCurrentTableRows();
    if (!tableFound) return { collectedFallen, collectedCCerr, tableFound: false };
    collectedFallen.push(...fallen);
    collectedCCerr.push(...ccerr);

    const pager = $('.pagination, ul.pagination, nav .pagination');
    if (!pager) return { collectedFallen, collectedCCerr, tableFound: true };

    function pageKey() {
      const active = pager.querySelector('li.active, li[aria-current="page"], .page-item.active');
      return active ? norm(active.textContent) : location.href;
    }
    async function clickNext() {
      const links = Array.from(pager.querySelectorAll('a'));
      const next = links.find(a => /siguiente|next|»/i.test(a.textContent)) || pager.querySelector('a[rel="next"]');
      if (!next || next.closest('li')?.classList.contains('disabled')) return false;
      next.click();
      await sleep(800);
      return true;
    }

    seen.add(pageKey());
    for (let i = 0; i < 120; i++) {
      const moved = await clickNext();
      if (!moved) break;
      await sleep(800);
      const key = pageKey();
      if (seen.has(key)) break;
      seen.add(key);
      const r = parseCurrentTableRows();
      collectedFallen.push(...r.fallen);
      collectedCCerr.push(...r.ccerr);
      hud(`Recolectando… pág. ${seen.size}`);
    }
    return { collectedFallen, collectedCCerr, tableFound: true };
  }

  // Agregado de caídos (con nombre unificado y diagnóstico)
  function aggregateFallen(records) {
    const map = new Map(); // key: canonical
    for (const r of records) {
      const key = canonicalName(r.nombre);
      if (!map.has(key)) {
        map.set(key, {
          key,
          variants: new Set(),
          estados: new Set(),
          poblaciones: new Set(),
          flags: { video: false, audio: false, teletexto: false, epg: false, otros: false },
        });
      }
      const agg = map.get(key);
      agg.variants.add(norm(r.nombre));
      if (r.red) agg.poblaciones.add(r.red);
      if (r.estado) agg.estados.add(norm(r.estado));
      const c = classify(r.desc);
      agg.flags.video ||= c.video;
      agg.flags.audio ||= c.audio;
      agg.flags.teletexto ||= c.teletexto;
      agg.flags.epg ||= c.epg;
      agg.flags.otros ||= c.otros;
    }
    const out = [];
    for (const agg of map.values()) {
      out.push({
        canal: displayName(agg.variants),
        fallo: decideDiagnosis(agg.flags),
        estados: Array.from(agg.estados),
        poblaciones: Array.from(agg.poblaciones).sort(),
      });
    }
    return out.sort((a,b)=>a.canal.localeCompare(b.canal,'es'));
  }

  // Agregado de CCerr (PIDs unificados POR TIPO, no por número)
  function aggregateCCerr(records) {
    const map = new Map();
    for (const r of records) {
      const key = canonicalName(r.nombre);
      if (!map.has(key)) {
        map.set(key, {
          key,
          variants: new Set(),
          poblaciones: new Set(),
          tipos: new Set(), // ← guardamos tipos únicos: video/audio/teletexto/otros
        });
      }
      const agg = map.get(key);
      agg.variants.add(norm(r.nombre));
      if (r.red) agg.poblaciones.add(r.red);

      const found = parsePIDsAndTypes(r.desc);
      if (found.length === 0) {
        // Si no hay detalle, no añadimos tipo; quedará vacío (—) en UI/MD.
      } else {
        for (const { tipo } of found) {
          if (tipo) agg.tipos.add(tipo);
        }
      }
    }
    const out = [];
    for (const agg of map.values()) {
      out.push({
        canal: displayName(agg.variants),
        poblaciones: Array.from(agg.poblaciones).sort(),
        tipos: Array.from(agg.tipos).sort(), // tipos únicos
      });
    }
    return out.sort((a,b)=>a.canal.localeCompare(b.canal,'es'));
  }

    // ======== [ SECCIÓN 4: GENERACIÓN DE MARKDOWN ] ============================
    // *Sin encabezados Markdown ni estilos.* PIDs → tipos por barras.
    function buildMarkdown({ fallenAgg, ccerrAgg, selected }) {
        const now = new Date();
        const fecha = now.toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).replace(',', '');

        const lines = [];
        lines.push(`**RESUMEN DE CANALES — ${fecha}**`);

        const fallen = fallenAgg.filter(it => selected.has(canonicalName(it.canal)));
        const ccerr  = ccerrAgg.filter(it => selected.has(canonicalName(it.canal)));

        // ---------------- Caídos ----------------
        if (fallen.length) {
            lines.push('', '**CANALES CAÍDOS (SCRAMBLING / SOCKETFAILED)**');
            for (const it of fallen) {
                const estados = it.estados.join(', ') || '—';
                const pobl    = it.poblaciones.join(', ') || '—';
                lines.push(`- **${it.canal}** — **${it.fallo}** _(Estados: ${estados})_`);
                lines.push(`  - **Poblaciones:** ${pobl}`);
            }
        }

        // ---------------- CCerr ----------------
        if (ccerr.length) {
            lines.push('', '**CANALES CON AUMENTO DE FALLOS CCERR**');
            for (const it of ccerr) {
                const pobl = it.poblaciones.join(', ') || '—';
                const tipos = (it.tipos && it.tipos.length) ? it.tipos.join('/') : '—';
                lines.push(`- **${it.canal}**`);
                lines.push(`  - **Poblaciones:** ${pobl}`);
                lines.push(`  - **PIDs:** ${tipos}`);
            }
        }

        return lines.join('\n');
    }


  // ======== [ SECCIÓN 5: PANEL DE INTERFAZ (UI) ] ============================
  function showPanel(fallenAgg, ccerrAgg) {
    $('#tm-kanales-panel')?.remove();

    const panel = document.createElement('div');
    panel.id = 'tm-kanales-panel';
    panel.style.cssText = `
      position: fixed; top: 20px; right: 20px;
      width: 400px; height: 440px; background: #fff;
      border: 2px solid #007bff; border-radius: 12px;
      font: 13px Arial, sans-serif; color: #333;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      display: flex; flex-direction: column;
      overflow: hidden; z-index: 999999;
      transition: top .2s ease, left .2s ease, width .2s ease, height .2s ease, transform .2s ease;
    `;

    // Cabecera
    const header = document.createElement('div');
    header.style.cssText = `
      position: relative; z-index: 2;
      background: #007bff; color: white; padding: 8px 10px;
      display: flex; justify-content: space-between; align-items: center;
      cursor: move; user-select: none;
    `;
    header.innerHTML = `<span style="font-weight:bold;">Resumen fallos canales</span>
      <div style="display:flex; gap:6px;">
        <button class="panel-btn" data-action="min" title="Minimizar">–</button>
        <button class="panel-btn" data-action="max" title="Maximizar">□</button>
        <button class="panel-btn" data-action="close" title="Cerrar">✕</button>
      </div>`;
    header.querySelectorAll('.panel-btn').forEach(btn => {
      btn.style.cssText = `
        background:none; border:none; color:white;
        cursor:pointer; width:22px; height:22px;
        border-radius:4px; transition:background 0.2s;
      `;
      btn.onmouseenter = () => (btn.style.background = 'rgba(255,255,255,0.2)');
      btn.onmouseleave = () => (btn.style.background = 'none');
    });

    // Cuerpo
    const body = document.createElement('div');
    body.style.cssText = `
      flex:1; overflow:auto; padding:8px; background:#f8f9fa;
      transition:max-height 0.3s ease, opacity .2s ease;
    `;
    const list = document.createElement('div');
    list.style.cssText = 'display:flex; flex-direction:column; gap:6px;';

    const hasFallen = fallenAgg.length > 0;
    const hasCCerr  = ccerrAgg.length > 0;

    function makeSectionTitle(text){
      const h = document.createElement('div');
      h.textContent = text;
      h.style.cssText = 'font-weight:bold; color:#222; margin:6px 2px;';
      return h;
    }

    // Tarjeta con checkbox + meta
    function makeCard({ tipo, canal, fallo, estados, poblaciones, tipos }) {
      const label = document.createElement('label');
      label.style.cssText = `
        display:grid; grid-template-columns:auto 1fr; gap:8px;
        background:#fff; padding:8px; border-radius:10px; border:1px solid #e6ecf5;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      `;
      const checked = document.createElement('input');
      checked.type = 'checkbox';
      checked.checked = true;
      checked.dataset.key = canonicalName(canal);
      checked.style.marginTop = '3px';

      const right = document.createElement('div');
      const title = document.createElement('div');
      title.innerHTML = `<strong>${canal}</strong>`;

      const meta = document.createElement('div');
      meta.style.cssText = 'color:#555;';
      const estadoTxt = estados && estados.length ? estados.join(', ') : (tipo==='ccerr' ? 'CCerr' : '—');
      const diag = (tipo === 'fallen') ? (fallo || '—') : '—';
      const poblTxt = poblaciones && poblaciones.length ? poblaciones.join(', ') : '—';
      const pidTipos = (tipo==='ccerr' && tipos && tipos.length) ? ` · PIDs: ${tipos.join('/')}` : '';

      meta.textContent = `Diagnóstico: ${diag} · Estados: ${estadoTxt} · Poblaciones: ${poblTxt}${pidTipos}`;

      right.appendChild(title);
      right.appendChild(meta);
      label.appendChild(checked);
      label.appendChild(right);
      return label;
    }

    if (hasFallen) {
      list.appendChild(makeSectionTitle('Caídos (Scrambling / SocketFailed)'));
      fallenAgg.forEach(it => list.appendChild(makeCard({ tipo:'fallen', ...it })));
    }
    if (hasCCerr) {
      list.appendChild(makeSectionTitle('CCerr'));
      ccerrAgg.forEach(it => list.appendChild(makeCard({ tipo:'ccerr', ...it })));
    }
    if (!hasFallen && !hasCCerr) {
      const empty = document.createElement('div');
      empty.textContent = 'No se encontraron incidencias.';
      empty.style.cssText = 'opacity:.8; padding:6px;';
      list.appendChild(empty);
    }

    body.appendChild(list);

    // Pie
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding:8px; background:#f0f2f5; display:flex; justify-content:flex-end; gap:8px;
    `;
    const btnMd = document.createElement('button');
    btnMd.textContent = 'Copiar Rocket';
    btnMd.style.cssText = `
      background:#007bff; color:white; border:none; border-radius:6px;
      padding:6px 10px; cursor:pointer; transition:background 0.2s;
    `;
    btnMd.onmouseenter = () => (btnMd.style.background = '#0069d9');
    btnMd.onmouseleave = () => (btnMd.style.background = '#007bff');
    footer.appendChild(btnMd);

    panel.append(header, body, footer);
    document.body.appendChild(panel);

    // Movimiento
    let isDragging = false, startX, startY, startLeft, startTop;
    function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
    function rectWithinWindow(left, top, width, height) {
      const w = window.innerWidth, h = window.innerHeight;
      return { left: clamp(left, 0, Math.max(0, w - width)), top: clamp(top, 0, Math.max(0, h - height)) };
    }
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.panel-btn')) return;
      isDragging = true;
      const r = panel.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      startLeft = r.left; startTop = r.top;
      function onMove(ev){
        if (!isDragging) return;
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        const rect = panel.getBoundingClientRect();
        const pos = rectWithinWindow(startLeft + dx, startTop + dy, rect.width, rect.height);
        panel.style.left = pos.left + 'px';
        panel.style.top = pos.top + 'px';
        panel.style.right = 'auto'; panel.style.bottom = 'auto'; panel.style.position = 'fixed';
      }
      function onUp(){ isDragging = false; document.removeEventListener('mousemove', onMove); }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp, { once:true });
    });

    // Redimensionadores (todos los bordes/esquinas)
    const dirs = ['n','e','s','w','ne','se','sw','nw'];
    dirs.forEach(dir => {
      const h = document.createElement('div');
      h.dataset.dir = dir;
      h.style.position = 'absolute';
      h.style.zIndex = '1'; // header está en 2
      h.style.userSelect = 'none';
      const size = 8, edge = 4;
      if (dir==='n'||dir==='s') {
        h.style.left = edge+'px'; h.style.right = edge+'px';
        h.style.height = size+'px';
        h.style.cursor = 'ns-resize';
        h.style[dir==='n'?'top':'bottom'] = '0';
      } else if (dir==='e'||dir==='w') {
        h.style.top = edge+'px'; h.style.bottom = edge+'px';
        h.style.width = size+'px';
        h.style.cursor = 'ew-resize';
        h.style[dir==='e'?'right':'left'] = '0';
      } else {
        h.style.width = size+'px'; h.style.height = size+'px';
        h.style.cursor = (dir==='ne'?'ne-resize':dir==='se'?'se-resize':dir==='sw'?'sw-resize':'nw-resize');
        if (dir.includes('n')) h.style.top = '0';
        if (dir.includes('s')) h.style.bottom = '0';
        if (dir.includes('e')) h.style.right = '0';
        if (dir.includes('w')) h.style.left = '0';
      }
      panel.appendChild(h);
      let rx, ry, rw, rh;
      h.addEventListener('mousedown', (e)=>{
        e.stopPropagation();
        const r = panel.getBoundingClientRect();
        rx = r.left; ry = r.top; rw = r.width; rh = r.height;
        function onMove(ev){
          let x=ev.clientX, y=ev.clientY;
          let left=rx, top=ry, width=rw, height=rh;
          if (dir.includes('e')) width = clamp(x - rx, 300, window.innerWidth - rx);
          if (dir.includes('s')) height = clamp(y - ry, 200, window.innerHeight - ry);
          if (dir.includes('w')) {
            const newLeft = clamp(x, 0, rx + rw - 300);
            width = rw + (rx - newLeft); left = newLeft;
          }
          if (dir.includes('n')) {
            const newTop = clamp(y, 0, ry + rh - 100);
            height = rh + (ry - newTop); top = newTop;
          }
          const pos = rectWithinWindow(left, top, width, height);
          panel.style.left = pos.left + 'px';
          panel.style.top = pos.top + 'px';
          panel.style.width = width + 'px';
          panel.style.height = height + 'px';
          panel.style.right = 'auto'; panel.style.bottom = 'auto';
        }
        function onUp(){ document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });

    // Acciones de cabecera
    let minimized = false, maximized = false, prevRect = null, prevHeight = null;
    header.addEventListener('click', (e) => {
      const act = e.target.dataset.action;
      if (!act) return;
      if (act === 'close') { panel.remove(); return; }
      if (act === 'min') {
        minimized = !minimized;
        if (minimized) {
          prevHeight = panel.style.height || panel.getBoundingClientRect().height + 'px';
          body.style.display = 'none'; footer.style.display = 'none';
          panel.style.height = 'auto';
        } else {
          body.style.display = 'block'; footer.style.display = 'flex';
          panel.style.height = prevHeight || '440px';
        }
        return;
      }
      if (act === 'max') {
        maximized = !maximized;
        if (maximized) {
          const r = panel.getBoundingClientRect();
          prevRect = { left:r.left, top:r.top, width:r.width, height:r.height };
          panel.style.left = Math.round(window.innerWidth*0.1)+'px';
          panel.style.top = Math.round(window.innerHeight*0.1)+'px';
          panel.style.width = Math.round(window.innerWidth*0.8)+'px';
          panel.style.height = Math.round(window.innerHeight*0.8)+'px';
          panel.style.right = 'auto'; panel.style.bottom = 'auto';
        } else if (prevRect) {
          panel.style.left = prevRect.left+'px';
          panel.style.top = prevRect.top+'px';
          panel.style.width = prevRect.width+'px';
          panel.style.height = prevRect.height+'px';
        }
      }
    });

    // Copiar MD (solo seleccionados)
    btnMd.onclick = async () => {
      const checkedKeys = new Set($$('input[type=checkbox]:checked', list).map(ch => ch.dataset.key));
      const selFallen = fallenAgg.filter(it => checkedKeys.has(canonicalName(it.canal)));
      const selCCerr  = ccerrAgg.filter(it => checkedKeys.has(canonicalName(it.canal)));
      const md = buildMarkdown({ fallenAgg: selFallen, ccerrAgg: selCCerr, selected: checkedKeys });
      try { await navigator.clipboard.writeText(md); btnMd.textContent = '¡Copiado!'; }
      catch { prompt('Copia el Markdown:', md); }
      finally { setTimeout(() => (btnMd.textContent = 'Copiar MD'), 1500); }
    };
  }

  // ======== [ SECCIÓN 6: PROCESO PRINCIPAL Y BOTÓN FLOTANTE ] ================
  async function run(btn) {
    try {
      if (btn) { btn.textContent = 'Procesando…'; btn.style.opacity = '0.7'; btn.dataset.busy='1'; }
      let tries = 0;
      while (!findTable() && tries < 12) { hud('Esperando tabla…'); await sleep(350); tries++; }
      if (!findTable()) { hud('No se encontró la tabla.'); await sleep(1000); hudDone(); return; }

      hud('Ajustando vista…');
      await forceRowsPerPage200();

      hud('Leyendo tabla…');
      let { fallen, ccerr } = parseCurrentTableRows();
      const pager = $('.pagination, ul.pagination, nav .pagination');
      if (pager) {
        hud('Rastreando paginación…');
        const r = await crawlAllPagesAndCollect();
        fallen = r.collectedFallen; ccerr = r.collectedCCerr;
      }

      hud('Agregando…');
      const fallenAgg = aggregateFallen(fallen);
      const ccerrAgg  = aggregateCCerr(ccerr);

      hudDone();
      showPanel(fallenAgg, ccerrAgg);
    } finally {
      if (btn) { btn.textContent = 'Resumen fallos'; btn.style.opacity = '1'; btn.dataset.busy=''; }
    }
  }

  // Botón flotante persistente
  function addFloatingButton() {
    if ($('#tm-kanales-fab')) return;
    const btn = document.createElement('button');
    btn.id = 'tm-kanales-fab';
    btn.textContent = 'Resumen fallos';
    btn.title = 'Generar resumen (Markdown)';
    btn.style.cssText = `
      position: fixed; right: 16px; bottom: 16px; z-index: 999999;
      padding: 10px 14px; border-radius: 999px; border: none;
      box-shadow: 0 8px 20px rgba(0,0,0,.25); cursor: pointer;
      background: #007bff; color: #fff;
      transition: transform .15s ease;
      font: 13px Arial, sans-serif;
    `;
    btn.addEventListener('mousedown', ()=>btn.style.transform='scale(0.98)');
    btn.addEventListener('mouseup', ()=>btn.style.transform='scale(1)');
    btn.addEventListener('click', () => { if (btn.dataset.busy!=='1') run(btn); });
    document.body.appendChild(btn);
  }
  function keepButtonAlive() {
    addFloatingButton();
    const obs = new MutationObserver(() => addFloatingButton());
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', keepButtonAlive);
  else keepButtonAlive();

})();
