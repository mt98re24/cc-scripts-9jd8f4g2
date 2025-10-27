(function () {
  'use strict';

  const norm = s => (s || '').toString().replace(/\s+/g, ' ').trim();

  function textById(id) {
    const el = document.getElementById(id);
    return el ? norm(el.textContent) : '';
  }

  // Busca el <td> que sea exactamente "CPE" o "Servicio" (ignorando espacios)
  function findTdByLabel(labelText) {
    const tds = Array.from(document.querySelectorAll('td'));
    const target = labelText.toUpperCase();
    return tds.find(td => norm(td.textContent).toUpperCase() === target) || null;
  }

    function buildSummary() {
        const olt = textById('oltRx'); // ej: "-28.87 dBm"
        const ont = textById('ontRx'); // ej: "-24.43 dBm"

        // Modelo (CPE)
        let modelo = '—';
        const cpeTd = findTdByLabel('CPE');
        if (cpeTd && cpeTd.nextElementSibling) {
            const s = cpeTd.nextElementSibling.querySelector('strong, span, b');
            modelo = norm(s ? s.textContent : cpeTd.nextElementSibling.textContent) || '—';
        }

        // Servicio
        let servicio = '—';
        const srvTd = findTdByLabel('Servicio');
        if (srvTd && srvTd.nextElementSibling) {
            const s = srvTd.nextElementSibling.querySelector('strong, span, b');
            servicio = norm(s ? s.textContent : srvTd.nextElementSibling.textContent) || '—';
        }

        // Detectar si hay una IP fija aplicada
        const ipFijaIcon = document.querySelector(
            'td i.fa-exclamation-triangle[title*="dirección ip estática"]'
        );
        const tieneIpFija = !!ipFijaIcon;

        let resumen = `Niveles: OLT RX: ${olt || '—'} / ONT RX: ${ont || '—'}. Modelo: ${modelo}. Servicio: ${servicio}.`;
        if (tieneIpFija) resumen += ' Tiene IP fija aplicada.';

        return resumen;
    }


  function makeCopyButton() {
    const btn = document.createElement('button');
    btn.id = 'copy-ont-summary-btn';
    btn.type = 'button';
    btn.title = 'Copiar resumen';
    btn.style.cssText = `
      margin-left:6px; padding:4px; border:none; cursor:pointer;
      background:transparent; vertical-align:middle; line-height:0;
    `;
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor"
          d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
      </svg>
    `;
    btn.style.color = '#1f6feb';
    return btn;
  }

  function setCopiedVisual(btn, ok) {
    const prev = btn.innerHTML;
    const prevTitle = btn.title;
    btn.title = ok ? '¡Copiado!' : 'No se pudo copiar';
    btn.style.color = ok ? '#10b981' : '#f59e0b';
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor"
          d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
      </svg>
    `;
    setTimeout(() => {
      btn.style.color = '#1f6feb';
      btn.innerHTML = prev;
      btn.title = prevTitle;
    }, 1200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch {}
      ta.remove();
      return ok;
    }
  }

  function insertButton() {
    // Evitar duplicados
    if (document.getElementById('copy-ont-summary-btn')) return;

    const ontEl = document.getElementById('ontRx');
    if (!ontEl) return;

    const td = ontEl.closest('td') || ontEl.parentElement;
    if (!td) return;

    const btn = makeCopyButton();
    btn.addEventListener('click', async () => {
      const summary = buildSummary();
      const ok = await copyText(summary);
      setCopiedVisual(btn, ok);
      // console.log('[Resumen copiado]', summary);
    });

    // Insertar inmediatamente después del valor ONT RX
    td.appendChild(btn);
  }

  function init() {
    insertButton();
    // Por si la página es SPA o re-renderiza
    const obs = new MutationObserver(() => insertButton());
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
