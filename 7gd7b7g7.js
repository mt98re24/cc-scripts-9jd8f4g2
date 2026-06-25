// ==UserScript==
// @name         Llamadas no atendidas - Panel Pro
// @namespace    llamadas-prioridad-pro
// @version      2.1
// @description  Panel compacto para agrupar llamadas no atendidas, ver repeticiones, desplegar historial y copiar números.
// @match        https://amr.onlycable.es/llamadas_perdidas
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';

  const CONFIG = {
    refrescarCadaMs: 5000,

    // Fecha y hora / Origen / Atendiendo / Último contacto / Contestada / Contestada por / Localidad / Opción
    columnaFecha: 0,
    columnaNumero: 1,
    columnaAtendiendo: 2,
    columnaContestada: 4,
    columnaLocalidad: 6,
    columnaOpcion: 7,

    soloContestadaNo: true
  };

  let minimizado = true;
  let cerrado = false;
  let numerosDesplegados = new Set();
  let ultimaFirmaDatos = '';

  iniciar();

  function iniciar() {
    crearPanel();
    procesarYRenderizar(true);

    setInterval(() => {
      if (!cerrado) {
        procesarYRenderizar(false);
      }
    }, CONFIG.refrescarCadaMs);
  }

  function crearPanel() {
    if (document.querySelector('#tm-call-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'tm-call-panel';
    panel.className = 'tm-call-panel minimized';

    panel.innerHTML = `
      <div class="tm-call-header">
        <button class="tm-call-brand" id="tm-toggle-panel" title="Abrir panel">
          <span class="tm-call-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
            </svg>
          </span>

          <span class="tm-call-text">
            <span class="tm-call-title">Llamadas</span>
            <span class="tm-call-subtitle" id="tm-call-subtitle">Pendientes</span>
          </span>

          <span class="tm-call-badge" id="tm-call-badge">0</span>
        </button>

        <div class="tm-call-actions">
          <button id="tm-minimize-panel" class="tm-icon-button tm-minimize-button" title="Minimizar">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 13H5v-2h14v2z"/>
            </svg>
          </button>

          <button id="tm-refresh-panel" class="tm-icon-button" title="Actualizar">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.45 5.08h-2.13A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h8V3l-3.35 3.35z"/>
            </svg>
          </button>

          <button id="tm-close-panel" class="tm-icon-button tm-close-button" title="Cerrar hasta recargar">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3l6.3 6.29 6.3-6.29 1.41 1.41z"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="tm-call-body">
        <div class="tm-call-summary">
          <div>
            <strong id="tm-total-numeros">0</strong>
            números
          </div>
          <div>
            <strong id="tm-total-llamadas">0</strong>
            llamadas
          </div>
        </div>

        <div class="tm-call-list" id="tm-call-list"></div>
      </div>

      <div class="tm-call-toast" id="tm-call-toast">Copiado</div>
    `;

    document.body.appendChild(panel);
    insertarEstilos();

    document.querySelector('#tm-toggle-panel').addEventListener('click', () => {
      if (minimizado) {
        minimizado = false;
        aplicarEstadoPanel();
      }
    });

    document.querySelector('#tm-minimize-panel').addEventListener('click', event => {
      event.stopPropagation();
      minimizado = true;
      aplicarEstadoPanel();
    });

    document.querySelector('#tm-refresh-panel').addEventListener('click', event => {
      event.stopPropagation();
      procesarYRenderizar(true);
    });

    document.querySelector('#tm-close-panel').addEventListener('click', event => {
      event.stopPropagation();
      cerrado = true;
      panel.remove();
    });

    document.querySelector('#tm-call-list').addEventListener('click', manejarClickLista);

    aplicarEstadoPanel();
  }

  function insertarEstilos() {
    const style = document.createElement('style');

    style.textContent = `
      #tm-call-panel,
      #tm-call-panel * {
        box-sizing: border-box;
      }

      #tm-call-panel {
        position: fixed;
        right: 18px;
        bottom: 18px;
        width: 360px;
        max-width: calc(100vw - 36px);
        background: #ffffff;
        color: #1f2937;
        border: 1px solid rgba(15, 23, 42, 0.14);
        border-radius: 18px;
        box-shadow:
          0 18px 45px rgba(15, 23, 42, 0.22),
          0 3px 10px rgba(15, 23, 42, 0.12);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        font-size: 13px;
        z-index: 999999;
        overflow: hidden;
        transition: width 0.18s ease, border-radius 0.18s ease;
      }

      #tm-call-panel.minimized {
        width: 238px;
        border-radius: 18px;
      }

      .tm-call-header {
        height: 58px;
        background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px;
        gap: 8px;
      }

      .tm-call-brand {
        min-width: 0;
        flex: 1;
        height: 40px;
        border: 0;
        background: transparent;
        color: inherit;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0;
        cursor: pointer;
        text-align: left;
        overflow: hidden;
      }

      .tm-call-icon {
        width: 34px;
        height: 34px;
        min-width: 34px;
        border-radius: 11px;
        background: rgba(255, 255, 255, 0.10);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .tm-call-icon svg {
        width: 19px;
        height: 19px;
        fill: #dbeafe;
      }

      .tm-call-text {
        min-width: 0;
        max-width: 130px;
        display: flex;
        flex-direction: column;
        line-height: 1.1;
        overflow: hidden;
      }

      .tm-call-title {
        font-size: 14px;
        font-weight: 800;
        letter-spacing: -0.01em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .tm-call-subtitle {
        margin-top: 3px;
        font-size: 11px;
        color: #cbd5e1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .tm-call-badge {
        min-width: 30px;
        height: 25px;
        padding: 0 8px;
        border-radius: 999px;
        background: #ef4444;
        color: white;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 900;
        box-shadow: 0 4px 10px rgba(239, 68, 68, 0.35);
        flex-shrink: 0;
      }

      .tm-call-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }

      .tm-icon-button {
        width: 34px;
        height: 34px;
        border: 0;
        border-radius: 11px;
        background: rgba(255, 255, 255, 0.10);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.15s ease, transform 0.15s ease;
      }

      .tm-icon-button:hover {
        background: rgba(255, 255, 255, 0.18);
        transform: translateY(-1px);
      }

      .tm-icon-button svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }

      .tm-close-button:hover {
        background: rgba(239, 68, 68, 0.80);
      }

      .tm-call-body {
        display: block;
        max-height: min(620px, calc(100vh - 110px));
        overflow: hidden;
        background: #f8fafc;
      }

      #tm-call-panel.minimized .tm-call-body {
        display: none;
      }

      /*
        Corrección del estado minimizado:
        quitamos subtítulo y botón de minimizar,
        reducimos espacios y evitamos solapes.
      */
      #tm-call-panel.minimized .tm-call-header {
        height: 52px;
        padding: 8px;
        gap: 6px;
      }

      #tm-call-panel.minimized .tm-call-brand {
        height: 36px;
        gap: 8px;
      }

      #tm-call-panel.minimized .tm-call-icon {
        width: 32px;
        height: 32px;
        min-width: 32px;
      }

      #tm-call-panel.minimized .tm-call-text {
        max-width: 64px;
      }

      #tm-call-panel.minimized .tm-call-subtitle {
        display: none;
      }

      #tm-call-panel.minimized .tm-call-title {
        font-size: 13px;
      }

      #tm-call-panel.minimized .tm-call-badge {
        min-width: 28px;
        height: 24px;
        padding: 0 7px;
        font-size: 12px;
      }

      #tm-call-panel.minimized .tm-minimize-button {
        display: none;
      }

      #tm-call-panel.minimized .tm-icon-button {
        width: 32px;
        height: 32px;
        border-radius: 10px;
      }

      .tm-call-summary {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        padding: 10px;
        border-bottom: 1px solid #e5e7eb;
        background: #ffffff;
        color: #64748b;
        font-size: 12px;
      }

      .tm-call-summary div {
        background: #f1f5f9;
        border-radius: 12px;
        padding: 8px 10px;
      }

      .tm-call-summary strong {
        display: block;
        color: #111827;
        font-size: 17px;
        line-height: 1;
        margin-bottom: 3px;
      }

      .tm-call-list {
        max-height: min(520px, calc(100vh - 210px));
        overflow-y: auto;
        padding: 8px;
      }

      .tm-call-list::-webkit-scrollbar {
        width: 9px;
      }

      .tm-call-list::-webkit-scrollbar-track {
        background: transparent;
      }

      .tm-call-list::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 999px;
        border: 2px solid #f8fafc;
      }

      .tm-empty {
        padding: 16px;
        color: #64748b;
        text-align: center;
      }

      .tm-call-item {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        margin-bottom: 8px;
        overflow: hidden;
        transition: box-shadow 0.15s ease, border-color 0.15s ease;
      }

      .tm-call-item:hover {
        border-color: #cbd5e1;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
      }

      .tm-call-main {
        min-height: 50px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 8px;
        padding: 9px 10px;
      }

      .tm-number-block {
        min-width: 0;
      }

      .tm-call-number {
        display: inline-flex;
        align-items: center;
        max-width: 100%;
        color: #0f172a;
        font-size: 15px;
        font-weight: 850;
        letter-spacing: 0.01em;
        cursor: pointer;
        border-radius: 8px;
        padding: 2px 3px;
      }

      .tm-call-number:hover {
        background: #eff6ff;
        color: #1d4ed8;
      }

      .tm-last-call {
        margin-top: 3px;
        color: #64748b;
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .tm-count-pill {
        min-width: 42px;
        height: 30px;
        padding: 0 10px;
        border-radius: 999px;
        background: #e2e8f0;
        color: #334155;
        font-weight: 900;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .tm-count-pill.media {
        background: #fef3c7;
        color: #92400e;
      }

      .tm-count-pill.alta {
        background: #fee2e2;
        color: #b91c1c;
      }

      .tm-expand-button {
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 10px;
        background: #f1f5f9;
        color: #334155;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .tm-expand-button:hover {
        background: #e2e8f0;
      }

      .tm-expand-button svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
        transition: transform 0.15s ease;
      }

      .tm-call-item.open .tm-expand-button svg {
        transform: rotate(180deg);
      }

      .tm-call-details {
        display: none;
        padding: 0 10px 10px 10px;
      }

      .tm-call-item.open .tm-call-details {
        display: block;
      }

      .tm-details-inner {
        border-top: 1px solid #e5e7eb;
        padding-top: 9px;
      }

      .tm-details-title {
        color: #475569;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 6px;
      }

      .tm-date-list {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .tm-date-row {
        padding: 6px 8px;
        border-radius: 9px;
        background: #f8fafc;
        color: #334155;
        font-size: 12px;
        border: 1px solid #eef2f7;
      }

      .tm-extra-info {
        margin-top: 8px;
        padding: 8px;
        border-radius: 10px;
        background: #f8fafc;
        border: 1px solid #eef2f7;
        color: #64748b;
        font-size: 12px;
        line-height: 1.45;
      }

      .tm-call-toast {
        position: absolute;
        left: 50%;
        bottom: 10px;
        transform: translateX(-50%);
        max-width: 90%;
        background: #111827;
        color: #ffffff;
        padding: 8px 11px;
        border-radius: 999px;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
        font-size: 12px;
        font-weight: 700;
        display: none;
        pointer-events: none;
        white-space: nowrap;
      }
    `;

    document.head.appendChild(style);
  }

  function aplicarEstadoPanel() {
    const panel = document.querySelector('#tm-call-panel');
    const toggle = document.querySelector('#tm-toggle-panel');

    if (!panel) return;

    panel.classList.toggle('minimized', minimizado);

    if (toggle) {
      toggle.title = minimizado ? 'Abrir panel' : 'Panel abierto';
    }
  }

  function procesarYRenderizar(forzarRender) {
    const datos = obtenerLlamadasAgrupadas();
    const firma = crearFirmaDatos(datos);

    if (!forzarRender && firma === ultimaFirmaDatos) {
      actualizarContadores(datos);
      return;
    }

    ultimaFirmaDatos = firma;
    renderizar(datos);
  }

  function obtenerLlamadasAgrupadas() {
    const filas = Array.from(document.querySelectorAll('tr'));
    const llamadasPorNumero = {};

    filas.forEach(fila => {
      const celdas = fila.querySelectorAll('td');
      if (celdas.length < 8) return;

      const fecha = limpiarTexto(celdas[CONFIG.columnaFecha]?.innerText);
      const numero = limpiarNumero(celdas[CONFIG.columnaNumero]?.innerText);
      const atendiendo = limpiarTexto(celdas[CONFIG.columnaAtendiendo]?.innerText);
      const contestada = limpiarTexto(celdas[CONFIG.columnaContestada]?.innerText);
      const localidad = limpiarTexto(celdas[CONFIG.columnaLocalidad]?.innerText);
      const opcion = limpiarTexto(celdas[CONFIG.columnaOpcion]?.innerText);

      if (!numero) return;

      if (CONFIG.soloContestadaNo && contestada.toLowerCase() !== 'no') {
        return;
      }

      if (!llamadasPorNumero[numero]) {
        llamadasPorNumero[numero] = {
          numero,
          total: 0,
          fechas: [],
          atendiendo: new Set(),
          localidades: new Set(),
          opciones: new Set()
        };
      }

      llamadasPorNumero[numero].total++;

      if (fecha) llamadasPorNumero[numero].fechas.push(fecha);
      if (atendiendo) llamadasPorNumero[numero].atendiendo.add(atendiendo);
      if (localidad) llamadasPorNumero[numero].localidades.add(localidad);
      if (opcion) llamadasPorNumero[numero].opciones.add(opcion);
    });

    return Object.values(llamadasPorNumero)
      .map(item => {
        item.fechas = item.fechas.sort(compararFechas);
        item.ultimaFecha = item.fechas[item.fechas.length - 1] || '';
        item.atendiendo = Array.from(item.atendiendo);
        item.localidades = Array.from(item.localidades);
        item.opciones = Array.from(item.opciones);
        return item;
      })
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return convertirFecha(b.ultimaFecha) - convertirFecha(a.ultimaFecha);
      });
  }

  function renderizar(datos) {
    actualizarContadores(datos);

    const list = document.querySelector('#tm-call-list');
    if (!list) return;

    if (datos.length === 0) {
      list.innerHTML = `
        <div class="tm-empty">
          No hay llamadas no atendidas.
        </div>
      `;
      return;
    }

    list.innerHTML = datos.map(item => {
      const abierto = numerosDesplegados.has(item.numero);
      const clasePrioridad =
        item.total >= 3 ? 'alta' :
        item.total === 2 ? 'media' :
        '';

      return `
        <div class="tm-call-item ${abierto ? 'open' : ''}" data-numero="${escaparAtributo(item.numero)}">
          <div class="tm-call-main">
            <div class="tm-number-block">
              <div class="tm-call-number" data-action="copy" data-numero="${escaparAtributo(item.numero)}" title="Copiar número">
                ${escaparHTML(item.numero)}
              </div>
              <div class="tm-last-call">
                Última: ${escaparHTML(item.ultimaFecha || 'Sin fecha')}
              </div>
            </div>

            <div class="tm-count-pill ${clasePrioridad}" title="Veces que ha llamado">
              x${item.total}
            </div>

            <button class="tm-expand-button" data-action="toggle" data-numero="${escaparAtributo(item.numero)}" title="Ver historial">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
              </svg>
            </button>
          </div>

          <div class="tm-call-details">
            <div class="tm-details-inner">
              <div class="tm-details-title">Historial de llamadas</div>

              <div class="tm-date-list">
                ${item.fechas.map(fecha => `
                  <div class="tm-date-row">${escaparHTML(fecha)}</div>
                `).join('')}
              </div>

              ${
                item.localidades.length || item.opciones.length || item.atendiendo.length
                  ? `
                    <div class="tm-extra-info">
                      ${item.localidades.length ? `<div><strong>Localidad:</strong> ${escaparHTML(item.localidades.join(', '))}</div>` : ''}
                      ${item.opciones.length ? `<div><strong>Opción:</strong> ${escaparHTML(item.opciones.join(', '))}</div>` : ''}
                      ${item.atendiendo.length ? `<div><strong>Atendiendo:</strong> ${escaparHTML(item.atendiendo.join(', '))}</div>` : ''}
                    </div>
                  `
                  : ''
              }
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function actualizarContadores(datos) {
    const totalNumeros = datos.length;
    const totalLlamadas = datos.reduce((acc, item) => acc + item.total, 0);

    const badge = document.querySelector('#tm-call-badge');
    const subtitle = document.querySelector('#tm-call-subtitle');
    const totalNumerosEl = document.querySelector('#tm-total-numeros');
    const totalLlamadasEl = document.querySelector('#tm-total-llamadas');

    if (badge) badge.textContent = totalNumeros;
    if (subtitle) subtitle.textContent = `${totalLlamadas} llamadas`;
    if (totalNumerosEl) totalNumerosEl.textContent = totalNumeros;
    if (totalLlamadasEl) totalLlamadasEl.textContent = totalLlamadas;
  }

  function manejarClickLista(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const numero = target.dataset.numero;

    if (!numero) return;

    if (action === 'copy') {
      copiarNumero(numero);
      return;
    }

    if (action === 'toggle') {
      const item = target.closest('.tm-call-item');
      if (!item) return;

      const abierto = item.classList.toggle('open');

      if (abierto) {
        numerosDesplegados.add(numero);
      } else {
        numerosDesplegados.delete(numero);
      }
    }
  }

  function copiarNumero(numero) {
    if (!numero) return;

    try {
      if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(numero);
        mostrarToast(`Copiado: ${numero}`);
        return;
      }
    } catch (error) {}

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(numero)
        .then(() => mostrarToast(`Copiado: ${numero}`))
        .catch(() => copiarFallback(numero));
    } else {
      copiarFallback(numero);
    }
  }

  function copiarFallback(numero) {
    const textarea = document.createElement('textarea');
    textarea.value = numero;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      document.execCommand('copy');
      mostrarToast(`Copiado: ${numero}`);
    } catch (error) {
      mostrarToast('No se pudo copiar');
    }

    textarea.remove();
  }

  function mostrarToast(texto) {
    const toast = document.querySelector('#tm-call-toast');
    if (!toast) return;

    toast.textContent = texto;
    toast.style.display = 'block';

    clearTimeout(mostrarToast.timeout);
    mostrarToast.timeout = setTimeout(() => {
      toast.style.display = 'none';
    }, 1400);
  }

  function crearFirmaDatos(datos) {
    return datos
      .map(item => `${item.numero}|${item.total}|${item.fechas.join(';')}`)
      .join('||');
  }

  function limpiarTexto(texto) {
    return String(texto || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function limpiarNumero(texto) {
    return limpiarTexto(texto)
      .replace(/[^\d+]/g, '');
  }

  function convertirFecha(fechaTexto) {
    if (!fechaTexto) return new Date(0);

    const partes = fechaTexto.split(',');
    if (partes.length < 2) return new Date(0);

    const fecha = partes[0].trim();
    const hora = partes[1].trim();

    const partesFecha = fecha.split('/');
    const partesHora = hora.split(':');

    if (partesFecha.length < 3) return new Date(0);

    const dia = parseInt(partesFecha[0], 10);
    const mes = parseInt(partesFecha[1], 10) - 1;
    const anio = parseInt(partesFecha[2], 10);

    const horas = parseInt(partesHora[0] || '0', 10);
    const minutos = parseInt(partesHora[1] || '0', 10);
    const segundos = parseInt(partesHora[2] || '0', 10);

    return new Date(anio, mes, dia, horas, minutos, segundos);
  }

  function compararFechas(a, b) {
    return convertirFecha(a) - convertirFecha(b);
  }

  function escaparHTML(texto) {
    return String(texto || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escaparAtributo(texto) {
    return escaparHTML(texto);
  }

})();
