  /*************** COPIAR WD - FIBRABLANCA ***************/

(function() {
  'use strict';

  /*************** CONFIG ***************/
  const TIPO_OBJETIVO = 'FIBRABLANCA';           // Texto de tipología
  const OBS_SELECTOR = '.styleObservacionesCliente'; // Selector del texto Observaciones
  const BTN_RESET_MS = 1500;                     // Tiempo de mensaje
  const wdRegex = /WD_\d+/g;                     // Patrón de código WD
  /**************************************/

  /** ✅ Método robusto para encontrar el contenedor de Tecnología **/
  function findTecnologiaContainer() {
    // Buscar todos los divs cuyo id empiece por la parte estable
    const candidatos = document.querySelectorAll('[id^="txtWelcomeClienteServicio:fverCli:j_"]');
    // Buscar el que contenga el texto "Tecnología:"
    return Array.from(candidatos).find(el => el.textContent.includes('Tecnología:')) || null;
  }

  /** Extrae el texto de observaciones */
  function getObservacionesText() {
    const el = document.querySelector(OBS_SELECTOR);
    if (el && el.textContent) return el.textContent;
    // Fallback amplio por si el overlay aún no abrió:
    const bodyText = document.body ? document.body.innerText : '';
    return bodyText;
  }

  /** Busca el último código WD_ */
  function extractLastWD(text) {
    if (!text) return null;
    const matches = text.match(wdRegex);
    return matches && matches.length ? matches[matches.length - 1] : null;
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
      // Fallback clásico
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

  /** Inserta el botón junto a FIBRABLANCA */
  function ensureButton() {
    const techContainer = findTecnologiaContainer();
    if (!techContainer) return;

    const spans = techContainer.querySelectorAll('span');
    if (!spans.length) return;

    // Buscar el span con el texto FIBRABLANCA
    const tipSpan = Array.from(spans).find(s => s.textContent.trim().toUpperCase() === TIPO_OBJETIVO);
    if (!tipSpan) return;

    // Evitar duplicados
    if (tipSpan.nextSibling && tipSpan.nextSibling.classList?.contains('wd-copy-btn')) return;

    // Crear botón inline
    const btn = document.createElement('button');
    btn.className = 'wd-copy-btn';
    btn.type = 'button';
    btn.textContent = 'Copiar WD';
    btn.style.marginLeft = '8px';
    btn.style.padding = '2px 8px';
    btn.style.fontSize = '12px';
    btn.style.lineHeight = '1.6';
    btn.style.border = '1px solid #888';
    btn.style.borderRadius = '6px';
    btn.style.background = '#fff';
    btn.style.cursor = 'pointer';

    btn.addEventListener('click', async () => {
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Buscando…';

      try {
        const obs = getObservacionesText();
        const code = extractLastWD(obs);

        if (!code) {
          btn.textContent = 'No encontrado';
          setTimeout(() => { btn.textContent = original; btn.disabled = false; }, BTN_RESET_MS);
          return;
        }

        const ok = await copyToClipboard(code);
        btn.textContent = ok ? 'Copiado ✓' : 'Error al copiar';
        setTimeout(() => { btn.textContent = original; btn.disabled = false; }, BTN_RESET_MS);
        console.log('WD extraído:', code, 'copiado:', ok);
      } catch (e) {
        console.error(e);
        btn.textContent = 'Error';
        setTimeout(() => { btn.textContent = original; btn.disabled = false; }, BTN_RESET_MS);
      }
    });

    // Insertar justo después del span de tipología
    tipSpan.insertAdjacentElement('afterend', btn);
  }

  // Inicial: intentar insertar si ya está en el DOM
  ensureButton();

  // Observer para páginas dinámicas (si el contenido se refresca sin recargar)
  const obs = new MutationObserver(() => {
    ensureButton();
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

})();
