// ==UserScript==
// @name         Copiar WD junto a FIBRABLANCA (NEW 06/2026)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Inserta un botón junto a la tipología FIBRABLANCA que copia el último código WD_ de las observaciones si no tiene varios
// @author       Tú
// @match        https://gossan.onlycable.es:8083/gosbilling/user/clientes/servicios-clientes.xhtml?cod_cliente=*
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  /*************** CONFIG ***************/
  const TIPO_OBJETIVO  = 'FIBRABLANCA';
  const OBS_SELECTOR   = '.styleObservacionesCliente';
  const BTN_RESET_MS   = 1500;
  const wdRegex        = /WD_\d+/g;
  /**************************************/

  function findTecnologiaContainer() {
    const candidatos = document.querySelectorAll('[id^="txtWelcomeClienteServicio:fverCli:j_"]');
    return Array.from(candidatos).find(el => el.textContent.includes('Tecnología:')) || null;
  }

  /** Recoge texto de Observaciones del cliente */
  function getObservacionesText() {
    const el = document.querySelector(OBS_SELECTOR);
    return el ? el.textContent : '';
  }

  /** Recoge texto de Observaciones en Factura */
  function getObservacionesFacturaText() {
    const resaltares = document.querySelectorAll('span.resaltar');
    for (const span of resaltares) {
      if (span.textContent.trim() === 'Observaciones en Factura:') {
        // El contenido puede estar en el siguiente sibling o en un span hermano
        const siguiente = span.nextElementSibling;
        if (siguiente) return siguiente.textContent;
      }
    }
    return '';
  }

  /** Extrae todos los códigos WD únicos de un texto */
  function extractUniqueWDs(text) {
    if (!text) return [];
    const matches = text.match(wdRegex);
    if (!matches) return [];
    return [...new Set(matches)];
  }

  /** Copia texto al portapapeles */
  async function copyToClipboard(text) {
    try {
      if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(text);
        return true;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch (e) {
      console.error('Error copiando:', e);
      return false;
    }
  }

  function ensureButton() {
    const techContainer = findTecnologiaContainer();
    if (!techContainer) return;

    const spans = techContainer.querySelectorAll('span');
    if (!spans.length) return;

    const tipSpan = Array.from(spans).find(s => s.textContent.trim().toUpperCase() === TIPO_OBJETIVO);
    if (!tipSpan) return;

    // Evitar duplicados
    if (tipSpan.nextSibling && tipSpan.nextSibling.classList?.contains('wd-copy-btn')) return;

    // Recoger WDs de ambas fuentes y deduplicar
    const textoObs     = getObservacionesText();
    const textoFactura = getObservacionesFacturaText();
    const wdsUnicos    = extractUniqueWDs(textoObs + ' ' + textoFactura);

    if (wdsUnicos.length === 0) return;

    const esVarios  = wdsUnicos.length > 1;
    const labelText = esVarios ? 'Varios WD, ver en Observaciones' : wdsUnicos[0];

    const box = document.createElement('span');
    box.className = 'wd-copy-btn';
    box.textContent = labelText;
    box.style.marginLeft   = '8px';
    box.style.padding      = '2px 8px';
    box.style.fontSize     = '12px';
    box.style.lineHeight   = '1.6';
    box.style.border       = '1px solid #888';
    box.style.borderRadius = '6px';
    box.style.background   = '#fff';
    box.style.display      = 'inline-block';

    if (!esVarios) {
      box.style.cursor = 'pointer';
      box.title = 'Pulsa para copiar';

      box.addEventListener('click', async () => {
        const ok = await copyToClipboard(wdsUnicos[0]);
        if (ok) {
          const prev = box.textContent;
          box.textContent = 'Copiado ✓';
          setTimeout(() => { box.textContent = prev; }, BTN_RESET_MS);
        }
      });
    }

    tipSpan.insertAdjacentElement('afterend', box);
  }

  ensureButton();

  const obs = new MutationObserver(() => ensureButton());
  obs.observe(document.documentElement, { childList: true, subtree: true });

})();
