// ==BOTON TELEGRAM - AVERIAS PRIORIDAD ALTA ==

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

  // === ESCAPAR MARKDOWN (Telegram) ===
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

    // ANCLA para el botón (ID suele ser estable)
    const spanAsign = document.getElementById('viewAMIncidenciasRaiz:formIncidencia:divAsignaciones');

    return { cliente, prioridad, asignado, direccion, tel1, tel2, spanAsign };
  }

  // === CONDICIONES PARA MOSTRAR BOTÓN ===
  const conditionsMet = ({ prioridad, asignado }) =>
    /^ALTA$/i.test(prioridad) && /^(AVERIAS|AV)\b/i.test(stripDiacritics(asignado || ''));

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

  // === BOTÓN DE TELEGRAM ===
  function ensureRightSideButton(spanAsign) {
    if (!spanAsign) return null;
    const td = spanAsign.closest('td') || spanAsign.parentElement;
    if (!td) return null;

    let btn = document.getElementById('tg-inline-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'tg-inline-btn';
      btn.type = 'button';
      btn.textContent = 'Telegram';
      btn.title = 'Copiar mensaje para Telegram';
      btn.style.cssText = `
        display:inline-block; margin-left:8px; padding:6px 10px; border-radius:999px; border:none;
        background:#1f6feb; color:#fff; cursor:pointer; font:12px/1 system-ui; vertical-align:middle;
      `;
    } else {
      if (btn.previousElementSibling !== spanAsign) btn.remove();
    }

    if (!btn.isConnected) {
      if (spanAsign.nextSibling) td.insertBefore(btn, spanAsign.nextSibling);
      else td.appendChild(btn);
    }
    return btn;
  }

  // === EVALUACIÓN Y EVENTO DE COPIAR ===
  function evaluate() {
    const data = readData();
    const ok = conditionsMet(data);
    const btn = ensureRightSideButton(data.spanAsign);
    if (!btn) return;

    btn.style.display = ok ? '' : 'none';
    btn.disabled = !ok;

    btn.onclick = async () => {
      const fresh = readData();
      const md = buildTelegramMarkdown(fresh);

      let copied = false;
      try { await navigator.clipboard.writeText(md); copied = true; }
      catch {
        const ta = document.createElement('textarea');
        ta.value = md;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { copied = document.execCommand('copy'); } catch {}
        ta.remove();
      }
      const old = btn.textContent;
      btn.textContent = copied ? '¡Copiado!' : 'Copiar manualmente';
      btn.style.background = copied ? '#10b981' : '#f59e0b';
      setTimeout(() => { btn.textContent = old; btn.style.background = '#1f6feb'; }, 1500);
    };
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

