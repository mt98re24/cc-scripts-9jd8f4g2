(function() {
    'use strict';

    // 1️⃣ Obtener el código de cliente de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const codCliente = urlParams.get('cod_cliente');
    if (!codCliente) return;

    // 2️⃣ Construir la URL de búsqueda
    const buscarUrl = `/gosbilling/user/incidencias/buscar-incidencias.xhtml?cod_cliente=${codCliente}`;

    // 3️⃣ Función para mostrar el panel flotante
    function mostrarAviso(htmlContenido) {
        const panel = document.createElement('div');
        panel.id = 'panel-incidencias-abiertas';
        panel.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 450px;
                max-height: 400px;
                overflow-y: auto;
                background: #fffbea;
                border: 2px solid #e6b800;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 9999;
                font-family: sans-serif;
                font-size: 13px;
                padding: 10px;
            ">
                <div style="font-weight:bold;color:#a67c00;margin-bottom:8px;">
                    ⚠️ Incidencias abiertas del cliente ${codCliente}
                    <button id="cerrar-aviso" style="float:right;border:none;background:none;cursor:pointer;">❌</button>
                </div>
                ${htmlContenido || '<p>✅ No hay incidencias abiertas.</p>'}
            </div>
        `;
        document.body.appendChild(panel);
        document.getElementById('cerrar-aviso').addEventListener('click', () => panel.remove());
    }

    // 4️⃣ Cargar incidencias y filtrar
    fetch(buscarUrl)
        .then(resp => resp.text())
        .then(html => {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const filas = [...doc.querySelectorAll('#panelResultadosClientes\\:listadoIncidencias_data tr')];

            // Filtra solo las incidencias abiertas (estado distinto de FINAL/CERRADA)
            const abiertas = filas.filter(tr => {
                const estado = tr.querySelector('td:nth-child(6)')?.innerText.trim().toUpperCase();
                return estado && !['FINAL', 'CERRADA', 'RESUELTA', 'FINALIZADA'].includes(estado);
            }).slice(0, 2); // solo 2 filas como máximo

            if (abiertas.length === 0) {
                mostrarAviso('<p>✅ No hay incidencias abiertas.</p>');
                return;
            }

            // Construir lista con formato
            const lista = abiertas.map(tr => {
                const num = tr.querySelector('td:nth-child(1) a')?.innerText.trim() || 'N/A';
                const enlace = tr.querySelector('td:nth-child(1) a')?.href || '#';
                const abonado = tr.querySelector('td:nth-child(4)')?.innerText.trim() || '';
                const razon = tr.querySelector('td:nth-child(5)')?.innerText.trim() || '';
                const estado = tr.querySelector('td:nth-child(6)')?.innerText.trim() || '';
                const tipoTrabajo = tr.querySelector('td:nth-child(10)')?.innerText.trim() || '';
                const asignacion = tr.querySelector('td:nth-child(10)')?.innerText.trim() || '';
                const usuario = tr.querySelector('td:nth-child(11)')?.innerText.trim() || '';

                return `
                    <div style="margin-bottom:8px;border-bottom:1px solid #f0e0a0;padding-bottom:6px;">
                        <a href="${enlace}" target="_blank" style="color:#b36b00;font-weight:bold;text-decoration:none;">
                            #${num}
                        </a>
                        <span style="color:#555;"> – ${asignacion} – ${abonado} – <b>${estado}</b></span><br>
                        <span style="font-size:12px;color:#555;">${razon} – ${tipoTrabajo} – ${usuario}</span>
                    </div>`;
            }).join('');

            mostrarAviso(lista);
        })
        .catch(err => {
            console.error('Error al obtener incidencias:', err);
            mostrarAviso('<p style="color:red;">Error al consultar las incidencias.</p>');
        });

})();


  // === Incidencia PRIORIDAD ALTA - TELEGRAM ===
(function () {
  'use strict';

  const norm = s => (s || '').toString().replace(/\s+\n/g, '\n').replace(/\n+\s*/g, '\n').replace(/[ \t]+/g, ' ').trim();
  const byIdText = id => { const el = document.getElementById(id); return el ? norm(el.textContent || el.value || '') : ''; };
  const stripDiacritics = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Primer número “real” (ignora horas tipo 14:00)
  function firstPhoneNumber(s) {
    if (!s) return '';
    const re = /(\+?\d[\d\s().-]{7,}\d)/g; // candidato con >=9 dígitos
    let m;
    while ((m = re.exec(s))) {
      const digits = m[1].replace(/\D+/g, '');
      if (digits.length >= 9 && digits.length <= 12) return digits;
    }
    return '';
  }

  // Escapar MarkdownV2 (Telegram)
  const escMd = s => (s || '').replace(/[_*\[\]()~`>#+\-=|{}.!]/g, m => '\\' + m);

  function readData() {
    const cliente = byIdText('viewAMIncidenciasRaiz:formIncidencia:textCliente');
    const prioridad = byIdText('viewAMIncidenciasRaiz:formIncidencia:j_idt397_label');

    const tokenEls = Array.from(document.querySelectorAll('span.ui-selectcheckboxmenu-token-label'));
    const tokens = tokenEls.map(el => el.textContent.trim());
    const asignado = tokens.find(t => /^(AVERIAS|AV)\b/i.test(stripDiacritics(t))) || '';

    // Dirección (multilínea)
    let direccion = '';
    const dirTable = document.getElementById('viewAMIncidenciasRaiz:formIncidencia:direccionPanel');
    if (dirTable) {
      const pre = dirTable.querySelector('pre');
      if (pre) direccion = pre.textContent.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean).join('\n');
    }

    const tel1 = firstPhoneNumber(byIdText('viewAMIncidenciasRaiz:popupIncidencias:j_idt590:txtNumtelf1'));
    const tel2 = firstPhoneNumber(byIdText('viewAMIncidenciasRaiz:popupIncidencias:j_idt590:txtNumtelf2-txtDesctelf2'));

    // ANCLA: el SPAN contenedor del widget (para poner el botón a su derecha)
    const spanAsign = document.getElementById('viewAMIncidenciasRaiz:formIncidencia:divAsignaciones');

    return { cliente, prioridad, asignado, direccion, tel1, tel2, spanAsign };
  }

  const conditionsMet = ({ prioridad, asignado }) =>
    /^ALTA$/i.test(prioridad) && /^(AVERIAS|AV)\b/i.test(stripDiacritics(asignado || ''));

  function buildTelegramMarkdown({ cliente, direccion, tel1, tel2, prioridad, asignado }) {
    // Unir teléfonos sin duplicar
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

  // Inserta el botón **después** del span del widget, como hermano dentro del mismo <td>
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
      // Recolocar si no está justo detrás del span
      if (btn.previousElementSibling !== spanAsign) btn.remove();
    }

    if (!btn.isConnected) {
      // Insertar como hermano justo detrás del SPAN (fuera del widget)
      if (spanAsign.nextSibling) td.insertBefore(btn, spanAsign.nextSibling);
      else td.appendChild(btn);
    }
    return btn;
  }

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
        ta.value = md; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { copied = document.execCommand('copy'); } catch {}
        ta.remove();
      }
      const old = btn.textContent;
      btn.textContent = copied ? '¡Copiado!' : 'Copiar manualmente';
      btn.style.background = copied ? '#10b981' : '#f59e0b';
      setTimeout(() => { btn.textContent = old; btn.style.background = '#1f6feb'; }, 1500);
    };
  }

  function startObserver() {
    evaluate();
    const obs = new MutationObserver(() => evaluate());
    obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObserver);
  else startObserver();
})();
