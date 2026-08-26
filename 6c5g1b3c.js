// ==BOTON TELEGRAM/ROCKET - AVERIAS / AT. CLIENTE PRIORIDAD ALTA ==

(function () {
  'use strict';

  // === UTILIDADES BÁSICAS ===
  const norm = s => (s || '').toString()
    .replace(/\s+\n/g, '\n')
    .replace(/\n+\s*/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  const byIdText = id => {
    const el = document.getElementById(id);
    return el ? norm(el.textContent || el.value || '') : '';
  };

  const stripDiacritics = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  function firstPhoneNumber(s) {
    if (!s) return '';
    const re = /(\+?\d[\d\s().-]{7,}\d)/g;
    let m;
    while ((m = re.exec(s))) {
      const digits = m[1].replace(/\D+/g, '');
      if (digits.length >= 9 && digits.length <= 12) return digits;
    }
    return '';
  }

  // === ESCAPAR MARKDOWN (Telegram MarkdownV2) ===
  const escMd = s => (s || '').replace(/[_*\[\]()~`>#+\-=|{}.!]/g, m => '\\' + m);

  // === LECTURA ROBUSTA DE DATOS ===
  function readData() {
    // Cliente (ID estable)
    const cliente = byIdText('viewAMIncidenciasRaiz:formIncidencia:textCliente');

    // PRIORIDAD (busca por texto "Prioridad")
    let prioridad = '';
    const spanPrior = Array.from(document.querySelectorAll('span.campo-obligatorio'))
      .find(el => /^Prioridad\b/i.test(stripDiacritics(el.textContent || '')));
    if (spanPrior) {
      const td = spanPrior.closest('td');
      const nextTd = td?.nextElementSibling;
      const label = nextTd?.querySelector('.ui-selectonemenu-label');
      if (label) prioridad = norm(label.textContent);
    }

    // ASIGNADO (mantiene la lógica anterior)
    const tokenEls = Array.from(document.querySelectorAll('span.ui-selectcheckboxmenu-token-label'));
    const tokens = tokenEls.map(el => el.textContent.trim());
    const asignadoRaw = tokens.join(' | '); // texto completo de todos los tokens asignados
    const asignado = tokens.find(t => /^(AVERIAS|AV)\b/i.test(stripDiacritics(t))) || '';

    // DIRECCIÓN (multilínea)
    let direccion = '';
    const dirTable = document.getElementById('viewAMIncidenciasRaiz:formIncidencia:direccionPanel');
    if (dirTable) {
      const pre = dirTable.querySelector('pre');
      if (pre) direccion = pre.textContent.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean).join('\n');
    }

    // TELÉFONO 1 (busca por texto "Teléfono 1")
    let tel1 = '';
    const tel1Label = Array.from(document.querySelectorAll('span'))
      .find(el => /^Tel[eé]fono\s*1\b/i.test(stripDiacritics(el.textContent || '')));
    if (tel1Label) {
      const tr = tel1Label.closest('tr');
      const nextTd = tr?.querySelectorAll('td')[1];
      if (nextTd) tel1 = firstPhoneNumber(nextTd.textContent);
    }

    // TELÉFONO 2 (busca por texto "Teléfono 2")
    let tel2 = '';
    const tel2Label = Array.from(document.querySelectorAll('span'))
      .find(el => /^Tel[eé]fono\s*2\b/i.test(stripDiacritics(el.textContent || '')));
    if (tel2Label) {
      const tr = tel2Label.closest('tr');
      const nextTd = tr?.querySelectorAll('td')[1];
      if (nextTd) tel2 = firstPhoneNumber(nextTd.textContent);
    }

    // ANCLA para los botones (ID suele ser estable)
    const spanAsign = document.getElementById('viewAMIncidenciasRaiz:formIncidencia:divAsignaciones');

    return { cliente, prioridad, asignado, asignadoRaw, direccion, tel1, tel2, spanAsign };
  }

  // === CONDICIONES PARA MOSTRAR BOTONES ===
  const isPrioridadAlta = prioridad => /^ALTA$/i.test(prioridad);

  const telegramConditionsMet = ({ prioridad, asignado }) =>
    isPrioridadAlta(prioridad) && /^(AVERIAS|AV)\b/i.test(stripDiacritics(asignado || ''));

  const rocketConditionsMet = ({ prioridad, asignadoRaw }) =>
    isPrioridadAlta(prioridad) && /AT\.?\s*CLIENTE/i.test(stripDiacritics(asignadoRaw || ''));

  // === CONSTRUIR MENSAJE TELEGRAM ===
  function buildTelegramMarkdown({ cliente, direccion, tel1, tel2, prioridad, asignado }) {
    const phones = Array.from(new Set([tel1, tel2].filter(Boolean))).join(' / ');
    const parts = [];
    if (cliente) parts.push(`**Cliente:** ${escMd(cliente)}`);
    if (direccion) parts.push(`**Dirección:**\n${direccion.split('\n').map(escMd).join('\n')}`);
    if (phones) parts.push(`**Teléfono de contacto:** ${escMd(phones)}`);
    if (prioridad) parts.push(`**Prioridad:** ${escMd(prioridad)}`);
    if (asignado) parts.push(`**Asignado a:** ${escMd(asignado)}`);
    parts.push(`**Motivo de la urgencia:** `);
    return parts.join('\n');
  }

  // === EXTRAER SOLO EL CÓDIGO DE CLIENTE (sin el nombre) ===
  function extractClienteCode(raw) {
    const s = norm(raw);
    if (!s) return '';
    // Caso "CODIGO - Nombre Apellido"
    const dashSplit = s.split(/\s+-\s+/);
    if (dashSplit.length > 1) return dashSplit[0].trim();
    // Si no hay separador " - ", coger el primer token si contiene un dígito (parece código)
    const firstToken = s.split(/\s+/)[0];
    if (/\d/.test(firstToken)) return firstToken;
    // Fallback: devolver el texto completo tal cual
    return s;
  }

  // === EXTRAER POBLACIÓN DESDE LA DIRECCIÓN ===
  // Formato esperado en la 2ª línea del bloque de dirección: "30204 CARTAGENA (Murcia)"
  function extractPoblacion(direccion) {
    if (!direccion) return '';
    const m = direccion.match(/\d{5}\s+([A-ZÀ-ÚÑ\s.'-]+?)\s*\(/i);
    return m ? norm(m[1]) : '';
  }

  // === CONSTRUIR MENSAJE ROCKET CHAT ===
  function buildRocketMessage({ cliente, direccion }) {
    const codigo = extractClienteCode(cliente);
    const poblacion = extractPoblacion(direccion);
    // Rocket.Chat usa Markdown estándar: *negrita* (un solo asterisco)
    const clientePart = poblacion ? `*${codigo}* (${poblacion})` : `*${codigo}*`;
    return `${clientePart} - Revisad incidencia en prioridad ALTA. Motivo: `;
  }

  // === COPIAR AL PORTAPAPELES (con fallback) ===
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch {}
      ta.remove();
      return copied;
    }
  }

  function flashButton(btn, copied, baseColor) {
    const old = btn.textContent;
    btn.textContent = copied ? '¡Copiado!' : 'Copiar manualmente';
    btn.style.background = copied ? '#10b981' : '#f59e0b';
    setTimeout(() => { btn.textContent = old; btn.style.background = baseColor; }, 1500);
  }

  // === CREAR/REUTILIZAR UN BOTÓN GENÉRICO ===
  function ensureButton(id, label, color, spanAsign, afterEl) {
    if (!spanAsign) return null;
    const td = spanAsign.closest('td') || spanAsign.parentElement;
    if (!td) return null;

    let btn = document.getElementById(id);
    if (!btn) {
      btn = document.createElement('button');
      btn.id = id;
      btn.type = 'button';
      btn.textContent = label;
      btn.style.cssText = `
        display:inline-block; margin-left:8px; padding:6px 10px; border-radius:999px; border:none;
        background:${color}; color:#fff; cursor:pointer; font:12px/1 system-ui; vertical-align:middle;
      `;
    } else {
      // si el elemento de referencia previo ya no es el correcto, lo recolocamos
      if (btn.previousElementSibling !== afterEl) btn.remove();
    }

    if (!btn.isConnected) {
      if (afterEl.nextSibling) td.insertBefore(btn, afterEl.nextSibling);
      else td.appendChild(btn);
    }
    return btn;
  }

  // === EVALUACIÓN Y EVENTOS ===
  function evaluate() {
    const data = readData();
    if (!data.spanAsign) return;

    // --- Botón Telegram (AVERIAS) ---
    const tgOk = telegramConditionsMet(data);
    const tgBtn = ensureButton('tg-inline-btn', 'Telegram', '#1f6feb', data.spanAsign, data.spanAsign);
    if (tgBtn) {
      tgBtn.style.display = tgOk ? '' : 'none';
      tgBtn.disabled = !tgOk;
      tgBtn.onclick = async () => {
        const fresh = readData();
        const md = buildTelegramMarkdown(fresh);
        const copied = await copyToClipboard(md);
        flashButton(tgBtn, copied, '#1f6feb');
      };
    }

    // --- Botón Rocket Chat (AT. CLIENTE) ---
    // se coloca justo después del botón de Telegram para no pisarlo
    const rocketAfterEl = tgBtn || data.spanAsign;
    const rkOk = rocketConditionsMet(data);
    const rkBtn = ensureButton('rocket-inline-btn', 'Copiar Rocket', '#F5455C', data.spanAsign, rocketAfterEl);
    if (rkBtn) {
      rkBtn.style.display = rkOk ? '' : 'none';
      rkBtn.disabled = !rkOk;
      rkBtn.onclick = async () => {
        const fresh = readData();
        const msg = buildRocketMessage(fresh);
        const copied = await copyToClipboard(msg);
        flashButton(rkBtn, copied, '#F5455C');
      };
    }
  }

  // === OBSERVADOR DE CAMBIOS (para páginas dinámicas) ===
  function startObserver() {
    evaluate();
    const obs = new MutationObserver(() => evaluate());
    obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', startObserver);
  else
    startObserver();
})();
