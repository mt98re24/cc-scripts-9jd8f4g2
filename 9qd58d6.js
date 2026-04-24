// ==UserScript==
// @name         Asistente de Incidencias CRM
// @namespace    gosbilling.crm
// @version      4.3
// @description  Estructura modular con movimiento y redimensionado funcional (base limpia)
// @match        https://gossan.onlycable.es:8083/gosbilling/user/incidencias/ma-incidencias.xhtml*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  /**************************************************************************
   *  🎨 SECCIÓN 1: DISEÑO Y ESTRUCTURA BASE
   **************************************************************************/
  if (!location.href.includes('/gosbilling/user/incidencias/ma-incidencias.xhtml')) return;
  console.log('%c[Asistente RECALL] Iniciado ✅', 'color: lime; font-weight: bold;');

  // Crear panel principal
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '400px',
    height: '440px',
    background: '#fff',
    border: '2px solid #007bff',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    fontFamily: 'Arial, sans-serif',
    zIndex: '999999',
    overflow: 'hidden'
  });

  panel.innerHTML = `
    <div id="asistente-header" style="
      background:#007bff;
      color:#fff;
      padding:6px 10px;
      font-weight:bold;
      cursor:move;
      user-select:none;
    ">
      🧭 Asistente RECALL
      <button id="cerrar-asistente" style="float:right;border:none;background:none;color:white;cursor:pointer;">✖</button>
    </div>

    <div id="asistente-body" style="display:flex;height:calc(100% - 40px);">
      <div id="menu-lateral" style="width:45%;border-right:1px solid #ccc;padding:5px;overflow-y:auto;">
        <input type="text" id="buscador-flujos" placeholder="🔍 Buscar flujo..." style="
          width:95%;
          padding:5px;
          margin-bottom:6px;
          border:1px solid #ccc;
          border-radius:4px;
        ">
        <div id="menu-listado"></div>
      </div>
      <div id="menu-contenido" style="flex:1;padding:8px;overflow:auto;font-size:13px;">
        <p>Selecciona un flujo o usa el buscador.</p>
      </div>
    </div>

    <div id="asistente-resize" style="position:absolute;width:16px;height:16px;right:0;bottom:0;cursor:se-resize;"></div>
  `;
  document.body.appendChild(panel);

  const header = panel.querySelector('#asistente-header');
  const resizeHandle = panel.querySelector('#asistente-resize');
  const buscador = panel.querySelector('#buscador-flujos');
  const menuListado = panel.querySelector('#menu-listado');
  const menuContenido = panel.querySelector('#menu-contenido');

  document.getElementById('cerrar-asistente').onclick = () => panel.remove();

// --- Botones cabecera: minimizar → maximizar → cerrar ---
const closeBtn = document.getElementById('cerrar-asistente');
closeBtn.remove(); // quitamos el original para recolocarlo

const btnMin = document.createElement('button');
btnMin.textContent = '–';
Object.assign(btnMin.style, { border:'none', background:'none', color:'#fff', cursor:'pointer', marginLeft:'6px', fontSize:'16px', lineHeight:'14px' });

const btnMax = document.createElement('button');
btnMax.textContent = '□';
Object.assign(btnMax.style, { border:'none', background:'none', color:'#fff', cursor:'pointer', marginLeft:'6px', fontSize:'14px', lineHeight:'12px' });

const btnClose = document.createElement('button');
btnClose.textContent = '✕';
Object.assign(btnClose.style, { border:'none', background:'none', color:'#fff', cursor:'pointer', marginLeft:'6px', fontSize:'15px', lineHeight:'14px' });

// contenedor de botones
const btnContainer = document.createElement('div');
Object.assign(btnContainer.style, { float:'right', display:'flex', gap:'4px', alignItems:'center', height:'100%' });
btnContainer.append(btnMin, btnMax, btnClose);
header.appendChild(btnContainer);

btnClose.onclick = () => panel.remove();

// comportamiento
let savedRect = null;
let minimized = false;

btnMin.onclick = () => {
  const body = document.getElementById('asistente-body');
  if (!minimized) {
    body.style.display = 'none';
    panel.style.height = (header.offsetHeight + 6) + 'px';
    minimized = true;
  } else {
    body.style.display = 'flex';
    panel.style.height = '440px';
    minimized = false;
  }
};

btnMax.onclick = () => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!savedRect) {
    savedRect = { left: panel.offsetLeft, top: panel.offsetTop, w: panel.offsetWidth, h: panel.offsetHeight };
    const W = Math.floor(vw * 0.8), H = Math.floor(vh * 0.8);
    panel.style.left = Math.floor((vw - W) / 2) + 'px';
    panel.style.top = Math.floor((vh - H) / 2) + 'px';
    panel.style.width = W + 'px';
    panel.style.height = H + 'px';
  } else {
    panel.style.left = savedRect.left + 'px';
    panel.style.top = savedRect.top + 'px';
    panel.style.width = savedRect.w + 'px';
    panel.style.height = savedRect.h + 'px';
    savedRect = null;
  }
};


/**************************************************************************
 *  🖱️ MOVIMIENTO, REDIMENSIONADO EN 8 LADOS y LÍMITES DE PANTALLA
 **************************************************************************/
let dragging = false;
let resizeDir = null; // 'n','s','e','w','ne','nw','se','sw'
let offsetX = 0, offsetY = 0, startX = 0, startY = 0, startW = 0, startH = 0, startLeft = 0, startTop = 0;

function clampPanelToViewport() {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const minLeft = 0;
  const minTop  = 0;            // tope superior (no se mete bajo la barra del navegador)
  const maxLeft = Math.max(0, vw - panel.offsetWidth);
  const maxTop  = Math.max(0, vh - panel.offsetHeight);
  panel.style.left = Math.min(Math.max(parseInt(panel.style.left || panel.offsetLeft), minLeft), maxLeft) + 'px';
  panel.style.top  = Math.min(Math.max(parseInt(panel.style.top  || panel.offsetTop ), minTop ), maxTop ) + 'px';
}

// --- Movimiento (drag) con cabecera, con límites ---
header.addEventListener('mousedown', e => {
  if (e.target.closest('button')) return; // no iniciar drag si pulsa un botón de la cabecera
  dragging = true;
  offsetX = e.clientX - panel.offsetLeft;
  offsetY = e.clientY - panel.offsetTop;
  document.body.style.userSelect = 'none';
});

// --- Crear 8 “handles” para resize ---
const edges = [
  { dir:'n',  style:{ top:'-2px',  left:'8px',  right:'8px',  height:'6px', cursor:'ns-resize' }},
  { dir:'s',  style:{ bottom:'-2px',left:'8px',  right:'8px',  height:'6px', cursor:'ns-resize' }},
  { dir:'e',  style:{ right:'-2px', top:'8px',  bottom:'8px', width:'6px',  cursor:'ew-resize' }},
  { dir:'w',  style:{ left:'-2px',  top:'8px',  bottom:'8px', width:'6px',  cursor:'ew-resize' }},
  { dir:'ne', style:{ right:'-2px', top:'-2px', width:'10px', height:'10px', cursor:'nesw-resize' }},
  { dir:'nw', style:{ left:'-2px',  top:'-2px', width:'10px', height:'10px', cursor:'nwse-resize' }},
  { dir:'se', style:{ right:'-2px', bottom:'-2px', width:'14px', height:'14px', cursor:'nwse-resize' }},
  { dir:'sw', style:{ left:'-2px',  bottom:'-2px', width:'14px', height:'14px', cursor:'nesw-resize' }},
];

edges.forEach(cfg => {
  const h = document.createElement('div');
  h.dataset.dir = cfg.dir;
  Object.assign(h.style, {
    position:'absolute', zIndex:'1000000', background:'transparent',
    ...cfg.style
  });
  h.addEventListener('mousedown', e => {
    resizeDir = cfg.dir;
    startX = e.clientX; startY = e.clientY;
    startW = panel.offsetWidth; startH = panel.offsetHeight;
    startLeft = panel.offsetLeft; startTop = panel.offsetTop;
    document.body.style.userSelect = 'none';
    e.preventDefault(); e.stopPropagation();
  });
  panel.appendChild(h);
});

// --- Indicador visual en esquina inferior derecha (triangulito) ---
const resizeDecor = document.getElementById('asistente-resize');
if (resizeDecor) {
  Object.assign(resizeDecor.style, {
    width:'16px', height:'16px', right:'0', bottom:'0',
    cursor:'nwse-resize', position:'absolute',
    background:'linear-gradient(135deg, transparent 50%, #007bff 50%)',
    pointerEvents:'none'
  });
}

// --- Movimiento global del ratón ---
window.addEventListener('mousemove', e => {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const minW = 280, minH = 260;

  if (dragging && !resizeDir) {
    let newLeft = e.clientX - offsetX;
    let newTop  = e.clientY - offsetY;
    newLeft = Math.min(Math.max(0, newLeft), vw - panel.offsetWidth);
    newTop  = Math.min(Math.max(0, newTop ), vh - panel.offsetHeight);
    panel.style.left = `${newLeft}px`;
    panel.style.top  = `${newTop}px`;
    panel.style.right = 'auto';
    return;
  }

  if (resizeDir) {
    let w = startW, h = startH, L = startLeft, T = startTop;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // horizontal
    if (resizeDir.includes('e')) w = startW + dx;
    if (resizeDir.includes('w')) { w = startW - dx; L = startLeft + dx; }
    // vertical
    if (resizeDir.includes('s')) h = startH + dy;
    if (resizeDir.includes('n')) { h = startH - dy; T = startTop + dy; }

    w = Math.max(minW, Math.min(w, vw - 8));
    h = Math.max(minH, Math.min(h, vh - 8));
    L = Math.min(Math.max(0, L), vw - w);
    T = Math.min(Math.max(0, T), vh - h);

    panel.style.width = w + 'px';
    panel.style.height = h + 'px';
    panel.style.left = L + 'px';
    panel.style.top  = T + 'px';
  }
});

// --- Soltar ratón / failsafe ---
function stopAll() {
  dragging = false;
  resizeDir = null;
  document.body.style.userSelect = '';
  clampPanelToViewport();
}
window.addEventListener('mouseup', stopAll);
window.addEventListener('blur',  stopAll);

// Asegura que al crear el panel queda dentro
clampPanelToViewport();

/**************************************************************************
 * 🧩 Ampliador avanzado de textareas (⤢ visible y centrado)
 **************************************************************************/
function enhanceTextareas(scopeEl) {
  const areas = scopeEl.querySelectorAll('textarea');
  areas.forEach(t => {
    if (t.dataset.enhanced === '1') return;
    t.dataset.enhanced = '1';

    // Envolver para posicionar el botón
    const wrap = document.createElement('div');
    wrap.style.position = 'relative';
    wrap.style.display = 'block';
    wrap.style.width = '100%';
    t.parentNode.insertBefore(wrap, t);
    wrap.appendChild(t);

    // Botón ⤢ en esquina inferior izquierda
    const btn = document.createElement('span');
    btn.textContent = '⤢';
    Object.assign(btn.style, {
      position: 'absolute',
      left: '4px',
      bottom: '4px',
      fontSize: '14px',
      color: '#007bff',
      cursor: 'pointer',
      userSelect: 'none',
      background: '#fff',
      borderRadius: '3px',
      padding: '0 2px',
      lineHeight: '12px'
    });
    wrap.appendChild(btn);

    btn.addEventListener('mouseenter', () => btn.style.color = '#0056b3');
    btn.addEventListener('mouseleave', () => btn.style.color = '#007bff');

    btn.addEventListener('click', () => {
      // Crear modal ampliado
      const modal = document.createElement('div');
      Object.assign(modal.style, {
        position: 'fixed',
        top: '10%',
        left: '10%',
        width: '80%',
        height: '80%',
        background: '#fff',
        border: '2px solid #007bff',
        borderRadius: '8px',
        boxShadow: '0 0 20px rgba(0,0,0,0.4)',
        zIndex: '10000000',
        display: 'flex',
        flexDirection: 'column'
      });

      const topBar = document.createElement('div');
      Object.assign(topBar.style, {
        background: '#007bff',
        color: '#fff',
        padding: '6px 10px',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      });
      topBar.innerHTML = '<span>✏️ Edición ampliada</span>';

      const close = document.createElement('button');
      close.textContent = '✕';
      Object.assign(close.style, {
        border: 'none',
        background: 'none',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '16px'
      });
      topBar.appendChild(close);
      modal.appendChild(topBar);

      const area = document.createElement('textarea');
      area.value = t.value;
      Object.assign(area.style, {
        flex: '1',
        margin: '8px',
        resize: 'none',
        fontFamily: 'inherit',
        fontSize: '14px'
      });
      modal.appendChild(area);

      const saveBtn = document.createElement('button');
      saveBtn.textContent = '💾 Guardar y cerrar';
      Object.assign(saveBtn.style, {
        background: '#007bff',
        color: '#fff',
        border: 'none',
        padding: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        margin: '8px',
        borderRadius: '6px'
      });
      modal.appendChild(saveBtn);

      document.body.appendChild(modal);

      const cerrar = () => {
        t.value = area.value;
        t.dispatchEvent(new Event('input', { bubbles: true }));
        modal.remove();
      };
      saveBtn.addEventListener('click', cerrar);
      close.addEventListener('click', cerrar);
    });
  });
}

const mcObserver = new MutationObserver(() => enhanceTextareas(menuContenido));
mcObserver.observe(menuContenido, { childList: true, subtree: true });


/**************************************************************************
 *  ⚙️ SECCIÓN 2: SISTEMA DE FLUJOS DINÁMICO (modular, global y sin duplicar listas)
 **************************************************************************/

// Campo descripción
const campoDescripcion =
  document.querySelector('form[id*="formIncidencia"] textarea') ||
  document.querySelector('textarea[role="textbox"]');
function pegarTexto(txt) {
  if (!campoDescripcion) return alert('No se encontró el campo de descripción');

  const agente = window.crmAgente || 'Agente.';

  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const encabezado = `**${agente} ${fecha} ${hora} - `;

  const actual = campoDescripcion.value.trim();
  const nuevoTexto = `${encabezado}${txt.trim()}`;
  const nuevo = actual ? `${actual}\n${nuevoTexto}` : nuevoTexto;

  campoDescripcion.value = nuevo;
  campoDescripcion.dispatchEvent(new Event('input', { bubbles: true }));
  campoDescripcion.dispatchEvent(new Event('change', { bubbles: true }));
}


// 🔹 SISTEMA GLOBAL DE FLUJOS
// (Evita el error "Flujos is not defined" y permite acceder desde cualquier parte del script)
window.Flujos = window.Flujos || {
  _lista: [],

  registrar({ id, nombre, tipos, render }) {
    // Validaciones básicas
    if (!id || !nombre || !Array.isArray(tipos) || typeof render !== 'function') {
      console.warn(`[Asistente RECALL] Flujo inválido: ${id || '(sin id)'}`);
      return;
    }

    // Evitar duplicados
    const existe = this._lista.some(f => f.id === id);
    if (existe) {
      console.warn(`[Asistente RECALL] Flujo duplicado ignorado: ${id}`);
      return;
    }

    // Registrar flujo
    const flujo = { id, nombre, tipos, render };
    this._lista.push(flujo);
    this[id] = flujo; // acceso directo (Flujos.bono, Flujos.compromiso, etc.)
    console.log(`[Asistente RECALL] ✅ Flujo registrado: ${nombre} (${id})`);
  },

  // Obtener flujos según tipo de abonado y filtro de búsqueda
  obtenerPorTipo(tipo, filtro = '') {
    return this._lista.filter(f =>
      f.tipos.includes(tipo) &&
      f.nombre.toLowerCase().includes(filtro.toLowerCase())
    );
  },

  // Renderizar menú lateral dinámico
  renderMenu(tipo, filtro = '') {
    menuListado.innerHTML = '';

    const disponibles = this.obtenerPorTipo(tipo, filtro);
    if (disponibles.length === 0) {
      menuListado.innerHTML = '<p style="color:#888;">Sin flujos disponibles para este abonado.</p>';
      return;
    }

    for (const flujo of disponibles) {
      const item = document.createElement('div');
      item.textContent = flujo.nombre;
      Object.assign(item.style, {
        cursor: 'pointer',
        padding: '4px 6px',
        borderRadius: '4px'
      });

      item.addEventListener('mouseover', () => item.style.background = '#f0f8ff');
      item.addEventListener('mouseout', () => item.style.background = 'transparent');
      item.addEventListener('click', () => flujo.render(menuContenido, pegarTexto));
      menuListado.appendChild(item);
    }
  }
};

// 🔹 Tipo actual de abonado
let tipoAbonadoActual = 'administrativo';

// 🔹 Detección del tipo de abonado
function detectarTipoAbonado(texto) {
  if (!texto) return 'administrativo';
  const t = texto.trim().toLowerCase();
  if (t.startsWith('int') || t.startsWith('internet')) return 'internet';
  if (t.startsWith('tv') || t.startsWith('television')) return 'television';
  if (t.startsWith('zapi')) return 'zapi';
  if (/^[67]\d{8}$/.test(t)) return 'movil';
  if (/^[89]\d{8}$/.test(t)) return 'fijo';
  return 'administrativo';
}

// 🔹 Renderizado del menú lateral (usando el sistema global)
function renderMenu(filtro = '') {
  Flujos.renderMenu(tipoAbonadoActual, filtro);
}

// 🔹 Buscador de flujos
buscador.addEventListener('input', e => renderMenu(e.target.value));

console.log('%c[Asistente RECALL] Sistema de flujos dinámico cargado correctamente', 'color: dodgerblue; font-weight:bold;');


/**************************************************************************
 * 🔍 DETECCIÓN REACTIVA DEL ABONADO (espera segura hasta tener valor real)
 **************************************************************************/

function obtenerElementoAbonado() {
  const contenedor = document.querySelector('div[id*="formIncidencia"][class*="ui-selectonemenu"]');
  if (!contenedor) return {};
  const label = contenedor.querySelector('.ui-selectonemenu-label');
  const select = contenedor.querySelector('select[id*="formIncidencia"][id$="_input"]');
  return { contenedor, label, select };
}

function obtenerTextoAbonado() {
  const { label, select } = obtenerElementoAbonado();
  if (label && label.textContent.trim() !== '') return label.textContent.trim();
  if (select && select.selectedIndex >= 0)
    return select.options[select.selectedIndex].text.trim();
  return '';
}

let abonadoPrevio = null;

function actualizarAbonadoSiCambia(forzar = false) {
  const nuevo = obtenerTextoAbonado();
  if (!nuevo) return;
  if (forzar || nuevo !== abonadoPrevio) {
    abonadoPrevio = nuevo;
    tipoAbonadoActual = detectarTipoAbonado(nuevo);
    window.tipoAbonadoActual = tipoAbonadoActual; // ✅ Exportar al contexto global
    console.log(`[Asistente RECALL] Abonado detectado → ${nuevo} (${tipoAbonadoActual})`);
    renderMenu(buscador.value || '');
  }
}

function iniciarObservadorAbonado() {
  const { contenedor } = obtenerElementoAbonado();
  if (!contenedor) {
    console.log('[Asistente RECALL] Esperando a que se cargue el combo de abonado...');
    setTimeout(iniciarObservadorAbonado, 800);
    return;
  }

  // 👁️ Observar cualquier cambio dentro del contenedor
  const observer = new MutationObserver(() => {
    const texto = obtenerTextoAbonado();
    if (texto && texto !== abonadoPrevio) {
  // Si el texto incluye "seleccione", tratamos como administrativo
  if (texto.toLowerCase().includes('seleccione')) {
    tipoAbonadoActual = 'administrativo';
    abonadoPrevio = texto;
    window.tipoAbonadoActual = tipoAbonadoActual;
    console.log(`[Asistente RECALL] Abonado → ${texto} (administrativo)`);
    renderMenu(buscador.value || '');
  } else {
    actualizarAbonadoSiCambia(true);
  }
}

  });
  observer.observe(contenedor, { childList: true, subtree: true });

  // 📡 Escuchar cambios manuales (por si el usuario selecciona otro)
  const { select } = obtenerElementoAbonado();
  if (select) select.addEventListener('change', () => actualizarAbonadoSiCambia(true));

  // 🔁 Reintentar lectura inicial hasta que haya valor real
  function esperarValorInicial() {
    const texto = obtenerTextoAbonado();
    if (texto && !texto.toLowerCase().includes('seleccione')) {
      actualizarAbonadoSiCambia(true);
    } else {
      console.log('[Asistente RECALL] Esperando valor real de abonado...');
      setTimeout(esperarValorInicial, 800);
    }
  }
  esperarValorInicial();
}

// 🚀 Inicio
iniciarObservadorAbonado();

/**************************************************************************
 * ⚙️ NUEVO SISTEMA – Todos los flujos visibles + botón rápido Reclama
 **************************************************************************/

// 🔹 Todos los flujos disponibles por defecto
function renderMenu(filtro = '') {
  Flujos.renderMenu(tipoAbonadoActual, filtro);
}
buscador.addEventListener('input', e => renderMenu(e.target.value));

// 🔹 Crear botón de acción "📢 Reclama" en la parte superior del menú lateral
const btnReclama = document.createElement('button');
btnReclama.textContent = '📢 Reclama';
Object.assign(btnReclama.style, {
  width: '95%',
  padding: '6px',
  marginBottom: '6px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  background: '#fff',
  color: '#333',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'background 0.2s',
});
btnReclama.onmouseenter = () => (btnReclama.style.background = '#f0f8ff');
btnReclama.onmouseleave = () => (btnReclama.style.background = '#fff');
btnReclama.title = 'Abrir flujo de reclamación';

// Acción al pulsar “📢 Reclama”
btnReclama.addEventListener('click', () => {
  const flujoReclama =
    Flujos.reclama ||
    Object.values(Flujos._lista).find(f =>
      f.nombre.toLowerCase().includes('reclama')
    );

  if (!flujoReclama) {
    alert('⚠️ No se encontró el flujo de reclamaciones.');
    return;
  }
  flujoReclama.render(menuContenido, pegarTexto);
});

// 🔹 Insertarlo justo encima del buscador
const buscadorFlujos = document.getElementById('buscador-flujos');
buscadorFlujos.parentNode.insertBefore(btnReclama, buscadorFlujos);

// 🔹 Establecer color base del encabezado
header.style.background = '#007bff';
renderMenu('');


/**************************************************************************
 * 💳 FLUJO: COBRO FACTURA (versión revisada y coherente)
 **************************************************************************/

Flujos.registrar({
  id: 'cobro',
  nombre: '💳 Cobro factura',
  tipos: ['administrativo'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>💳 Cobro factura</h3>

      <label><b>Factura(s):</b></label><br>
      <select id="facturasSelect" multiple size="6" style="width:100%;margin-bottom:4px;">
        <option>Enero</option><option>Febrero</option><option>Marzo</option>
        <option>Abril</option><option>Mayo</option><option>Junio</option>
        <option>Julio</option><option>Agosto</option><option>Septiembre</option>
        <option>Octubre</option><option>Noviembre</option><option>Diciembre</option>
      </select>
      <p style="font-size:11px;color:#555;margin-top:-5px;">Puedes seleccionar varias facturas con Ctrl (Windows) o Cmd (Mac)</p>

      <label><b>¿Cliente suspendido?</b></label><br>
      <select id="suspendidoSelect" style="width:100%;margin-bottom:10px;">
        <option>No</option>
        <option>Sí</option>
      </select>

      <div id="bloqueSuspendido" style="display:none;margin-left:10px;">

        <label><b>¿Paga reconexión?</b></label><br>
        <select id="pagaReconexionSelect" style="width:100%;margin-bottom:10px;">
          <option>Sí</option>
          <option>No</option>
        </select>

        <div id="bloqueMotivo" style="display:none;margin-left:10px;">
          <label>Motivo (si no paga reconexión):</label>
          <input id="motivoInput" type="text" style="width:100%;margin-bottom:10px;">
        </div>

        <div id="bloqueChecklist" style="margin-top:5px;">
          <label><input type="checkbox" id="reconexionRealizada"> Reconexión realizada</label>
        </div>
      </div>

      <button id="generarBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    // Referencias
    const suspendido = contenedor.querySelector('#suspendidoSelect');
    const bloqueSuspendido = contenedor.querySelector('#bloqueSuspendido');
    const pagaReconexion = contenedor.querySelector('#pagaReconexionSelect');
    const bloqueMotivo = contenedor.querySelector('#bloqueMotivo');
    const motivoInput = contenedor.querySelector('#motivoInput');
    const reconexionChk = contenedor.querySelector('#reconexionRealizada');
    const btnGenerar = contenedor.querySelector('#generarBtn');

    // Mostrar/ocultar según valores
    suspendido.addEventListener('change', () => {
      bloqueSuspendido.style.display = suspendido.value === 'Sí' ? 'block' : 'none';
    });

    pagaReconexion.addEventListener('change', () => {
      bloqueMotivo.style.display = pagaReconexion.value === 'No' ? 'block' : 'none';
    });

    // Generar resultado final coherente
    btnGenerar.addEventListener('click', () => {
      const facturas = [...contenedor.querySelector('#facturasSelect').selectedOptions]
        .map(o => o.text)
        .join(', ') || 'no especificadas';

      let texto = `Cliente paga factura(s) de: ${facturas}.`;

      // Si está suspendido
      if (suspendido.value === 'Sí') {
        texto += ' Cliente suspendido.';

        if (pagaReconexion.value === 'Sí') {
          texto += ' Paga reconexión.';
          if (reconexionChk.checked) {
            texto += ' Servicio reconectado.';
          } else {
            texto += ' Pendiente de reconexión.';
          }
        } else {
          const motivo = motivoInput.value.trim() || 'no especificado';
          texto += ` No paga reconexión. Motivo: ${motivo}.`;

          if (reconexionChk.checked) {
            // coherencia: si marca el checklist, debe indicarse servicio reconectado
            texto += ' Servicio reconectado.';
          } else {
            texto += ' No se reconecta servicio.';
          }
        }
      }

      pegarTexto(texto.trim());
    });
  }
});

/**************************************************************************
 * 💰 FLUJO: DUDAS FACTURA (versión final)
 **************************************************************************/

Flujos.registrar({
  id: 'facturas',
  nombre: '💰 Dudas factura',
  tipos: ['administrativo'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>💰 Dudas sobre factura</h3>

      <label><b>Descripción:</b></label>
      <textarea id="descripcionFactura" rows="3" style="width:100%;margin-bottom:10px;"></textarea>

      <label><b>¿Conforme?</b></label><br>
      <select id="conformeSelect" style="width:100%;margin-bottom:10px;">
        <option>Sí</option>
        <option>No</option>
      </select>

      <div id="bloqueNoConforme" style="display:none;margin-left:10px;">
        <label><b>¿Por qué no conforme?</b></label><br>
        <textarea id="motivoInput" rows="3" style="width:100%;margin-bottom:10px;"></textarea>

        <label><b>Teléfono de contacto:</b></label><br>
        <input id="telefonoContacto" type="text" placeholder="Ej: 678123456" style="width:100%;margin-bottom:10px;">
      </div>

      <button id="generarBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    const descripcion = contenedor.querySelector('#descripcionFactura');
    const conforme = contenedor.querySelector('#conformeSelect');
    const bloqueNoConforme = contenedor.querySelector('#bloqueNoConforme');
    const motivo = contenedor.querySelector('#motivoInput');
    const telefono = contenedor.querySelector('#telefonoContacto');
    const btnGenerar = contenedor.querySelector('#generarBtn');

    // Mostrar campos adicionales solo si el cliente no está conforme
    conforme.addEventListener('change', () => {
      bloqueNoConforme.style.display = conforme.value === 'No' ? 'block' : 'none';
    });

    // Generar resultado final coherente
    btnGenerar.addEventListener('click', () => {
      const textoDesc = descripcion.value.trim() || 'Sin descripción';
      let resultado = `Dudas factura: ${textoDesc}. `;

      if (conforme.value === 'Sí') {
        resultado += 'Se queda conforme.';
      } else {
        const motivoTexto = motivo.value.trim() || 'no especificado';
        const telefonoTxt = telefono.value.trim();
        resultado += `No conforme. Motivo: ${motivoTexto}.`;
        if (telefonoTxt) {
          resultado += ` Teléfono de contacto: ${telefonoTxt}.`;
        }
      }

      pegarTexto(resultado.trim());
    });
  }
});

/**************************************************************************
 * 🗓️ FLUJO: COMPROMISO DE PAGO (Protocolo cortes automáticos - versión con TC)
 **************************************************************************/

Flujos.registrar({
  id: 'compromiso_pago_protocolo_final_v3',
  nombre: '🗓️ Compromiso de pago',
  tipos: ['administrativo'],
  render: (contenedor, pegarTexto) => {

    contenedor.innerHTML = `
      <h3>🗓️ Compromiso de pago</h3>

      <button id="toggleProtocolo" style="
        background:#007bff;
        color:white;
        border:none;
        border-radius:6px;
        padding:4px 8px;
        cursor:pointer;
        margin-bottom:8px;
        font-size:13px;
      ">📘 Mostrar protocolo</button>

      <div id="bannerProtocolo" style="
        display:none;
        background:#eaf3ff;
        border:1px solid #bcd3ff;
        padding:10px;
        border-radius:8px;
        margin-bottom:10px;
      ">
        <b>⚠️ Protocolo de compromisos de pago – Cortes automáticos</b><br><br>
        Cuando un cliente llama para informar de la fecha en que pagará sus facturas:
        <ul style="margin:5px 0 0 18px; padding:0;">
          <li>Si la fecha indicada <b>es anterior</b> a la fecha de corte → se agradece el aviso, no se aplica <b>“No cortar”</b>.</li>
          <li>Si la fecha indicada <b>es posterior</b> a la fecha de corte → se informa que <b>el sistema no permite registrar</b> compromisos de pago.</li>
          <li>Solo en caso de <b>fuerza mayor justificada</b> (viaje, hospitalización, etc.) se registrará el compromiso y se aplicará <b>“No cortar”</b>.</li>
        </ul>
      </div>

      <div style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">
        <button id="btnAnterior" style="background:#28a745;color:white;border:none;padding:8px;border-radius:6px;cursor:pointer;">🟩 Previo a fecha corte</button>
        <button id="btnPosterior" style="background:#dc3545;color:white;border:none;padding:8px;border-radius:6px;cursor:pointer;">🟥 Posterior a fecha corte</button>
        <button id="btnFuerzaMayor" style="background:#ffc107;color:black;border:none;padding:8px;border-radius:6px;cursor:pointer;">⚠️ Caso de fuerza mayor</button>
      </div>

      <div id="formPosterior" style="display:none; margin-top:12px;">
        <hr>
        <p style="margin-bottom:6px;">¿El cliente no está conforme y debe derivarse a ATC?</p>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
          <input type="checkbox" id="checkDerivo" style="transform:scale(1.2);cursor:pointer;">
          <label for="checkDerivo" style="cursor:pointer;">Derivar a ATC</label>
        </div>

        <div id="campoDerivo" style="display:none;">
          <textarea id="motivoATC" placeholder="Motivo de la derivación..." rows="2"
            style="width:100%;margin-bottom:8px;resize:vertical;"></textarea>

          <label><b>Teléfono de contacto:</b></label><br>
          <input id="telefonoATC" type="text" placeholder="Ej: 600123456" style="width:100%;margin-bottom:10px;">
        </div>

        <button id="generarPosteriorBtn" style="width:100%;background:#007bff;color:white;border:none;padding:8px;border-radius:6px;cursor:pointer;">
          📝 Generar resultado
        </button>
      </div>

      <div id="formFuerzaMayor" style="display:none; margin-top:12px;">
        <hr>
        <label><b>Fecha de pago:</b></label><br>
        <input id="fechaPago" type="date" style="width:100%;margin-bottom:8px;">

        <label><b>Factura(s):</b></label><br>
        <select id="facturasSelect" multiple size="5" style="width:100%;margin-bottom:8px;">
          <option>Enero</option><option>Febrero</option><option>Marzo</option>
          <option>Abril</option><option>Mayo</option><option>Junio</option>
          <option>Julio</option><option>Agosto</option><option>Septiembre</option>
          <option>Octubre</option><option>Noviembre</option><option>Diciembre</option>
        </select>
        <p style="font-size:11px;color:#555;margin-top:-5px;">Puedes seleccionar varias facturas con Ctrl (Windows) o Cmd (Mac)</p>

        <label><b>Motivo de fuerza mayor:</b></label><br>
        <textarea id="motivo" rows="3" style="width:100%;margin-bottom:8px;resize:vertical;"></textarea>

        <button id="generarFuerzaBtn" style="width:100%;background:#007bff;color:white;border:none;padding:8px;border-radius:6px;cursor:pointer;">
          📝 Generar resultado
        </button>
      </div>
    `;

    // ---- ELEMENTOS ----
    const toggle = contenedor.querySelector('#toggleProtocolo');
    const banner = contenedor.querySelector('#bannerProtocolo');
    const btnAnterior = contenedor.querySelector('#btnAnterior');
    const btnPosterior = contenedor.querySelector('#btnPosterior');
    const btnFuerza = contenedor.querySelector('#btnFuerzaMayor');
    const formPosterior = contenedor.querySelector('#formPosterior');
    const formFuerza = contenedor.querySelector('#formFuerzaMayor');
    const generarPosterior = contenedor.querySelector('#generarPosteriorBtn');
    const generarFuerza = contenedor.querySelector('#generarFuerzaBtn');
    const checkDerivo = contenedor.querySelector('#checkDerivo');
    const campoDerivo = contenedor.querySelector('#campoDerivo');
    const motivoATC = contenedor.querySelector('#motivoATC');
    const telefonoATC = contenedor.querySelector('#telefonoATC');

    // ---- Mostrar / ocultar protocolo ----
    toggle.addEventListener('click', () => {
      const abierto = banner.style.display === 'block';
      banner.style.display = abierto ? 'none' : 'block';
      toggle.textContent = abierto ? '📘 Mostrar protocolo' : '📘 Ocultar protocolo';
    });

    // ---- Utilidad: cerrar otros formularios ----
    const cerrarOtros = (excepto) => {
      if (excepto !== 'posterior') formPosterior.style.display = 'none';
      if (excepto !== 'fuerza') formFuerza.style.display = 'none';
    };

    // ---- Caso A: previo a corte ----
    btnAnterior.addEventListener('click', () => {
      cerrarOtros();
      const texto = `Cliente llama para informar del día en que pagará sus facturas. Dado que la fecha indicada es previa a la fecha de corte, se agradece el aviso y no se aplica el protocolo de “No cortar”.`;
      pegarTexto(texto.trim());
      alert('✅ Resultado generado (previo a fecha de corte).');
    });

    // ---- Caso B: posterior a corte ----
    btnPosterior.addEventListener('click', () => {
      const visible = formPosterior.style.display === 'block';
      cerrarOtros(visible ? null : 'posterior');
      formPosterior.style.display = visible ? 'none' : 'block';
    });

    checkDerivo.addEventListener('change', () => {
      campoDerivo.style.display = checkDerivo.checked ? 'block' : 'none';
    });

    generarPosterior.addEventListener('click', () => {
      if (checkDerivo.checked) {
        const motivo = motivoATC.value.trim();
        const telefono = telefonoATC.value.trim();
        if (!motivo) {
          alert('⚠️ Debes indicar el motivo de la derivación a ATC.');
          return;
        }
        if (!telefono) {
          alert('⚠️ Debes indicar el teléfono de contacto del cliente.');
          return;
        }
      }

      let texto = `Cliente llama para informar del día en que pagará sus facturas. Dado que la fecha indicada es posterior a la fecha de corte, se le informa de que el sistema no permite registrar compromisos de pago. Se le indica que debe abonar antes del día de corte para evitar la suspensión automática del servicio.`;
      if (checkDerivo.checked) {
        const motivo = motivoATC.value.trim();
        const telefono = telefonoATC.value.trim();
        texto += ` Se deriva a ATC por el siguiente motivo: ${motivo}. TC: ${telefono}.`;
      }

      pegarTexto(texto.trim());
      alert('✅ Resultado generado (posterior a fecha de corte).');
    });

    // ---- Caso C: fuerza mayor ----
    btnFuerza.addEventListener('click', () => {
      const visible = formFuerza.style.display === 'block';
      cerrarOtros(visible ? null : 'fuerza');
      formFuerza.style.display = visible ? 'none' : 'block';
    });

    generarFuerza.addEventListener('click', () => {
      const fecha = contenedor.querySelector('#fechaPago').value;
      const facturas = [...contenedor.querySelector('#facturasSelect').selectedOptions].map(o => o.text).join(', ') || 'no especificadas';
      const motivo = contenedor.querySelector('#motivo').value.trim();

      if (!fecha || !motivo) {
        alert('⚠️ Debes indicar la fecha de pago y el motivo de fuerza mayor.');
        return;
      }

      const [yyyy, mm, dd] = fecha.split('-');
      const fechaFormateada = `${dd}/${mm}/${yyyy}`;

      const texto = `Compromiso por fuerza mayor: ${motivo}. Cliente indica que realizará el pago el ${fechaFormateada} correspondiente a la(s) factura(s): ${facturas}. Se registra el compromiso y se asigna “No cortar” hasta dicha fecha.`;
      pegarTexto(texto.trim());

      try {
        const campoCita = document.querySelector(
          'input[name*="formIncidencia"][class*="ui-inputfield"][class*="datepicker"], ' +
          'input[name*="formIncidencia"][class*="ui-inputfield"][class*="hasDatepicker"], ' +
          'input[name*="formIncidencia"][class*="ui-inputfield"][type="text"]:not([aria-expanded])'
        );
        if (campoCita) {
          campoCita.value = fechaFormateada;
          campoCita.dispatchEvent(new Event('input', { bubbles: true }));
          campoCita.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const panel = document.querySelector('div[id*="multipleAsignaciones_panel"]');
        if (panel) {
          const labels = panel.querySelectorAll('label');
          labels.forEach(label => {
            if (label.textContent.trim().toUpperCase() === 'NO CORTAR') label.click();
          });
        }
      } catch (e) {
        console.warn('[Asistente RECALL] No se pudo marcar “NO CORTAR” automáticamente:', e);
      }

      alert('✅ Compromiso por fuerza mayor registrado.');
    });
  }
});




/**************************************************************************
 * 🔁 FLUJO: CAMBIO COMPROMISO DE PAGO (misma estructura visual que "Compromiso de pago")
 **************************************************************************/

Flujos.registrar({
  id: 'cambio',
  nombre: '🔁 Cambio compromiso de pago',
  tipos: ['administrativo'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>🔁 Cambio de compromiso de pago</h3>

      <div style="background:#f8f9fa;border:1px solid #ddd;padding:6px 8px;border-radius:5px;margin-bottom:8px;">
        Primero explícale que el sistema no permite cambiar la fecha.<br>
        Si el cliente se muestra disconforme, continúa.
      </div>

      <label><b>Nueva fecha solicitada:</b></label><br>
      <input id="fechaCambioPago" type="date" style="width:100%;margin-bottom:10px;">

      <button id="generarCambioBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    const fechaInput = contenedor.querySelector('#fechaCambioPago');
    const btn = contenedor.querySelector('#generarCambioBtn');

    btn.addEventListener('click', () => {
      const fecha = fechaInput.value;
      if (!fecha) {
        alert('⚠️ Debes indicar la nueva fecha solicitada.');
        return;
      }

      // Formatear fecha dd/mm/aaaa
      const partes = fecha.split('-');
      const fechaFormateada = `${partes[2]}/${partes[1]}/${partes[0]}`;

      const texto = `Cliente solicita cambio de fecha de compromiso de pago. Se informa que el sistema no lo permite, no está conforme, solicita ampliación a ${fechaFormateada}. Derivo a ATC para valorarlo.`;
      pegarTexto(texto.trim());

      // Banner recordatorio
      const banner = document.createElement('div');
      banner.textContent = '⚠️ No olvides poner en copia de esta incidencia a ATC.';
      Object.assign(banner.style, {
        marginTop: '10px',
        background: '#fff3cd',
        color: '#856404',
        border: '1px solid #ffeeba',
        borderRadius: '6px',
        padding: '8px',
        textAlign: 'center',
        fontWeight: 'bold',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        zIndex: '1000000'
      });
      contenedor.appendChild(banner);
      setTimeout(() => banner.remove(), 6000);
    });
  }
});

/**************************************************************************
 * 💳 FLUJO: CAMBIO CUENTA BANCARIA (mismo formato visual que los anteriores)
 **************************************************************************/

Flujos.registrar({
  id: 'cuenta',
  nombre: '🏦 Cambio cuenta bancaria',
  tipos: ['administrativo'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>🏦 Cambio de cuenta bancaria</h3>

      <div style="background:#f8f9fa;border:1px solid #ddd;padding:6px 8px;border-radius:5px;margin-bottom:8px;">
        Informa al cliente que debe hacer la solicitud escrita desde un medio de contacto autorizado con el nuevo número de cuenta, para que le manden el documento para su firma.
      </div>

      <button id="generarCambioCuentaBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    const btn = contenedor.querySelector('#generarCambioCuentaBtn');

    btn.addEventListener('click', () => {
      const texto = `Cliente solicita cambio de cuenta bancaria. Se le informa que haga la solicitud por escrito desde un medio de contacto autorizado con el nuevo número de cuenta bancaria, para que le manden el documento de cambio para su firma.`;

      pegarTexto(texto.trim());
    });
  }
});

/**************************************************************************
 * 📱 FLUJO: CONSULTA PORTABILIDAD (mismo formato visual que los anteriores)
 **************************************************************************/

Flujos.registrar({
  id: 'portabilidad',
  nombre: '📱 Consulta portabilidad',
  tipos: ['movil'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>📱 Consulta portabilidad</h3>

      <div style="background:#f8f9fa;border:1px solid #ddd;padding:6px 8px;border-radius:5px;margin-bottom:8px;">
        Revisa en el portal el estado de la portabilidad. Para ver el operador receptor, revisa el documento de portabilidad en Gestión documental.
      </div>

      <label><b>Resultado:</b></label><br>
      <select id="resultadoPorta" style="width:100%;margin-bottom:10px;">
        <option value="">Seleccione una opción</option>
        <option>Se informa</option>
        <option>No sale información en el portal</option>
      </select>

      <div id="operadorBox" style="display:none;">
        <label><b>Operador:</b></label><br>
        <select id="operadorPorta" style="width:100%;margin-bottom:10px;">
          <option value="">Seleccione operador</option>
          <option>Lemonvil</option>
          <option>Cablemovil</option>
          <option>Aire</option>
          <option>PTV</option>
        </select>
      </div>

      <button id="generarPortaBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    const resultadoSel = contenedor.querySelector('#resultadoPorta');
    const operadorBox = contenedor.querySelector('#operadorBox');
    const operadorSel = contenedor.querySelector('#operadorPorta');
    const btn = contenedor.querySelector('#generarPortaBtn');

    // Mostrar operador solo cuando haya resultado seleccionado
    resultadoSel.addEventListener('change', () => {
      operadorBox.style.display = resultadoSel.value ? 'block' : 'none';
    });

    btn.addEventListener('click', () => {
      const resultado = resultadoSel.value;
      const operador = operadorSel.value;

      if (!resultado) {
        alert('⚠️ Debes seleccionar un resultado.');
        return;
      }
      if (!operador) {
        alert('⚠️ Debes seleccionar un operador.');
        return;
      }

      let texto = `Cliente consulta portabilidad, se revisa en el portal de ${operador}. ${resultado}.`;
      if (resultado === 'No sale información en el portal') {
        texto += ' Derivo a ATC.';
      }

      pegarTexto(texto.trim());
    });
  }
});

/**************************************************************************
 * 🔐 FLUJO: PUK (mismo formato visual que los anteriores)
 **************************************************************************/

Flujos.registrar({
  id: 'puk',
  nombre: '🔐 PUK',
  tipos: ['movil'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>🔐 PUK</h3>

      <label><b>Petición:</b></label><br>
      <select id="tipoPeticionPuk" style="width:100%;margin-bottom:10px;">
        <option value="">Seleccione una opción</option>
        <option>Se informa del procedimiento para solicitar el código PUK</option>
        <option>Se informa del código PUK</option>
      </select>

      <div id="detallePukBox" style="display:none;">
        <label><b>Origen de la solicitud:</b></label><br>
        <select id="origenPuk" style="width:100%;margin-bottom:10px;">
          <option value="">Seleccione una opción</option>
          <option>Solicitado desde el propio número</option>
          <option>Solicitado desde el número autorizado del contrato</option>
          <option>Solicitado por método selfie</option>
          <option>Solicitado por método de grabación de llamada</option>
          <option>Solicitado desde el correo autorizado del contrato</option>
        </select>

        <div id="numeroBox" style="display:none;">
          <label><b>Número desde el que se solicita:</b></label><br>
          <input id="numeroPuk" type="text" placeholder="Ej: 612345678" style="width:100%;margin-bottom:10px;">
        </div>
      </div>

      <button id="generarPukBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    const tipoPeticion = contenedor.querySelector('#tipoPeticionPuk');
    const detalleBox = contenedor.querySelector('#detallePukBox');
    const origenSel = contenedor.querySelector('#origenPuk');
    const numeroBox = contenedor.querySelector('#numeroBox');
    const numeroInput = contenedor.querySelector('#numeroPuk');
    const btn = contenedor.querySelector('#generarPukBtn');

    // Mostrar el bloque de detalles si elige "Se informa del código PUK"
    tipoPeticion.addEventListener('change', () => {
      detalleBox.style.display =
        tipoPeticion.value === 'Se informa del código PUK' ? 'block' : 'none';
    });

    // Mostrar campo número solo en opciones que lo requieran
    origenSel.addEventListener('change', () => {
      const texto = origenSel.value.toLowerCase();
      if (texto.includes('selfie') || texto.includes('grabación')) {
        numeroBox.style.display = 'block';
      } else {
        numeroBox.style.display = 'none';
        numeroInput.value = '';
      }
    });

    btn.addEventListener('click', () => {
      const peticion = tipoPeticion.value;
      if (!peticion) {
        alert('⚠️ Debes seleccionar el tipo de petición.');
        return;
      }

      // Caso 1: solo procedimiento
      if (peticion === 'Se informa del procedimiento para solicitar el código PUK') {
        const texto = `Se informa del procedimiento para solicitar el código PUK.`;
        pegarTexto(texto);
        return;
      }

      // Caso 2: código PUK
      const origen = origenSel.value;
      if (!origen) {
        alert('⚠️ Debes seleccionar el origen de la solicitud.');
        return;
      }

      let texto = `Se informa del código PUK. ${origen}`;
      const num = numeroInput.value.trim();

      if (num && (origen.includes('selfie') || origen.includes('grabación'))) {
        texto += ` desde el número ${num}.`;
      } else {
        texto += `.`;
      }

      pegarTexto(texto.trim());
    });
  }
});

/**************************************************************************
 * 📶 FLUJO: BONO ADICIONAL (modo pasivo para subflujos)
**************************************************************************/

Flujos.registrar({
  id: 'bono',
  nombre: '📶 Bono adicional',
  tipos: ['movil'],
  render: (contenedor, pegarTexto, esSubflujo = false) => {
    contenedor.innerHTML = `
      <h3>📶 Bono adicional</h3>

      <label><b>Operador:</b></label><br>
      <select id="operadorBono" style="width:100%;margin-bottom:10px;">
        <option value="">Seleccione operador</option>
        <option>Lemonvil</option>
        <option>Cablemovil</option>
        <option>Aire</option>
        <option>PTV</option>
      </select>

      <div id="bonosBox" style="display:none;">
        <label><b>Bono:</b></label><br>
        <select id="bonoSelect" style="width:100%;margin-bottom:10px;"></select>
        <div id="otroBonoBox" style="display:none;">
          <input id="otroBonoInput" type="text" placeholder="Especificar otro bono" style="width:100%;margin-bottom:10px;">
        </div>
      </div>

      <label><b>Población:</b></label><br>
      <select id="poblacionSelect" style="width:100%;margin-bottom:10px;">
        <option value="">Seleccione población</option>
        <option>AGUILAS</option>
        <option>ARCOS</option>
        <option>CARTAGENA</option>
        <option>MARCHENA</option>
        <option>MOLINA</option>
        <option>MORON</option>
        <option>OSUNA</option>
        <option>PUEBLA</option>
        <option>VALENCIA</option>
        <option>VILLANUEVA</option>
      </select>

      ${
        esSubflujo
          ? ''
          : `<button id="generarBonoBtn" style="
              width:100%;
              background:#007bff;
              color:white;
              border:none;
              padding:8px;
              border-radius:6px;
              cursor:pointer;
            ">📝 Generar resultado</button>`
      }
    `;

    const operadorSel   = contenedor.querySelector('#operadorBono');
    const bonosBox      = contenedor.querySelector('#bonosBox');
    const bonoSelect    = contenedor.querySelector('#bonoSelect');
    const otroBonoBox   = contenedor.querySelector('#otroBonoBox');
    const otroBonoInput = contenedor.querySelector('#otroBonoInput');
    const poblacionSel  = contenedor.querySelector('#poblacionSelect');
    const btn           = contenedor.querySelector('#generarBonoBtn');

    const bonosPorOperador = {
      'Lemonvil': [
        'Nacional 1GB (5€)', 'Nacional 3GB (10€)', 'Nacional 5GB (19€)',
        'Roaming 1GB ZONA 1 (3€)', 'Roaming 3GB ZONA 1 (5€)',
        'Roaming 5GB ZONA 1 (6€)', 'Roaming 10GB + 100min ZONA 2 (26€)',
        'Roaming 5GB + 100min ZONA 3 (39€)', 'Otro'
      ],
      'Cablemovil': [
        '1GB (5€)', '3GB (10€)', '5GB (19€)', '10GB (29€)',
        'Compartido 10GB (10€)', 'Otro'
      ],
      'Aire': ['3GB (10€)', '10GB (19,90€)', 'Otro'],
      'PTV':  ['1GB (5€)', '10GB (19,90€)', 'Otro']
    };

    operadorSel.addEventListener('change', () => {
      const op = operadorSel.value;
      bonosBox.style.display = op ? 'block' : 'none';
      bonoSelect.innerHTML   = '';
      if (op && bonosPorOperador[op]) {
        bonosPorOperador[op].forEach(b => {
          const opt = document.createElement('option');
          opt.textContent = b;
          bonoSelect.appendChild(opt);
        });
      }
      otroBonoBox.style.display = 'none';
    });

    bonoSelect.addEventListener('change', () => {
      otroBonoBox.style.display = bonoSelect.value === 'Otro' ? 'block' : 'none';
    });

    /**************************************************************************
     * FUNCIONES INTERNAS
     **************************************************************************/

    function _getLinea() {
      let linea = '(sin línea)';
      try {
        const texto = obtenerTextoAbonado()?.trim() || '';
        if (texto && texto !== 'ES' && !texto.toLowerCase().includes('seleccione')) linea = texto;
      } catch {}
      return linea;
    }

    function _enviarCorreo({ operador, bono, otro, poblacion }) {
      const correosPoblacion = {
        'AGUILAS':    'atencionalcliente@teleaguilas.es',
        'ARCOS':      'atencionalcliente@arcotel.es',
        'CARTAGENA':  'atencionalcliente@telecartagena.es',
        'MARCHENA':   'atencionalcliente@martiatel.es',
        'MOLINA':     'atencionalcliente@molinafibra.es',
        'MORON':      'atencionalcliente@canal4moron.es',
        'OSUNA':      'atencionalcliente@ursotel.es',
        'PUEBLA':     'atencionalcliente@pueblatel.es',
        'VALENCIA':   'atencionalcliente@valenciacable.es',
        'VILLANUEVA': 'atencionalcliente@novatel.es'
      };

      const correoPob     = correosPoblacion[poblacion];
      const linea         = _getLinea();
      const bonoFinal     = bono === 'Otro' ? otro : bono;
      const clienteLink   = document.querySelector('a[id*="textCliente"]');
      const codCliente    = clienteLink ? clienteLink.textContent.trim().split('-')[0].trim() : '(sin código)';

      const to     = `grabaciondecontratos@onlycable.es,${correoPob}`;
      const asunto = `${codCliente} - Línea ${linea} - BONO ADICIONAL`;
      const cuerpo = `Buenas,%0D%0A%0D%0ASe aplica bono adicional (${bonoFinal}) de ${operador} en la línea ${linea} de ${poblacion}.%0D%0A%0D%0AUn saludo.`;

      window.location.href = `mailto:${to}?from=${encodeURIComponent('onlycable@recallsoluciones.es')}&subject=${encodeURIComponent(asunto)}&body=${cuerpo}`;
    }

    function _generarYEnviar(datos) {
      const bonoFinal = datos.bono === 'Otro' ? datos.otro : datos.bono;
      const linea     = _getLinea();
      pegarTexto(`Se aplica bono adicional (${bonoFinal}) de ${datos.operador} en la línea ${linea}.`);
      _enviarCorreo(datos);
    }

    /**************************************************************************
     * MÉTODOS PÚBLICOS
     **************************************************************************/

    // Obtener datos del formulario
    contenedor.getDatosBono = () => ({
      operador:  operadorSel.value,
      bono:      bonoSelect.value,
      otro:      otroBonoInput.value.trim(),
      poblacion: poblacionSel.value
    });

    // Solo el fragmento de texto (para insertar en la línea de la incidencia)
    contenedor.getTextoBono = () => {
      const datos = contenedor.getDatosBono();
      if (!datos.operador || !datos.bono || !datos.poblacion) return null;
      const bonoFinal = datos.bono === 'Otro' ? datos.otro : datos.bono;
      return `Datos agotados. Se aplica bono adicional (${bonoFinal}) de ${datos.operador} en la línea ${_getLinea()}.`;
    };

    // Solo el correo (sin pegarTexto)
    contenedor.enviarCorreoBono = () => {
      const datos = contenedor.getDatosBono();
      if (!datos.operador || !datos.bono || !datos.poblacion) return;
      _enviarCorreo(datos);
    };

    // Usado cuando el bono funciona como flujo independiente
    contenedor.generarYEnviarBono = () => {
      const datos = contenedor.getDatosBono();
      if (!datos.operador || !datos.bono || !datos.poblacion) {
        alert('⚠️ Debes completar operador, bono y población antes de generar el resultado.');
        return false;
      }
      _generarYEnviar(datos);
      return true;
    };

    // Botón visible solo en modo independiente
    if (!esSubflujo && btn) {
      btn.addEventListener('click', () => {
        const datos = contenedor.getDatosBono();
        if (!datos.operador || !datos.bono || !datos.poblacion) {
          alert('⚠️ Debes seleccionar operador, bono y población.');
          return;
        }
        _generarYEnviar(datos);
      });
    }
  }
});

/**************************************************************************
 * 📊 FLUJO: CONSUMO DE DATOS (ajuste: texto coherente con bono + tarifa)
 **************************************************************************/

Flujos.registrar({
  id: 'consumoDatos',
  nombre: '📊 Consumo de datos',
  tipos: ['movil'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>📊 Consumo de datos</h3>

      <label><b>¿Ha agotado los datos móviles?</b></label><br>
      <select id="agotadoDatos" style="width:100%;margin-bottom:10px;">
        <option value="no">No</option>
        <option value="si">Sí</option>
      </select>

      <div id="opcionesAgotado" style="display:none;">
        <label><b>¿Interesado en contratar un bono adicional?</b></label><br>
        <select id="interesadoBono" style="width:100%;margin-bottom:10px;">
          <option value="no">No</option>
          <option value="si">Sí</option>
        </select>

        <div id="subBonoBox" style="display:none; margin-bottom:10px; border:1px solid #ccc; border-radius:6px; padding:6px;"></div>

        <label><b>¿Interesado en ampliar tarifa?</b></label><br>
        <select id="interesadoTarifa" style="width:100%;margin-bottom:10px;">
          <option value="no">No</option>
          <option value="si">Sí</option>
        </select>
      </div>

      <button id="generarBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    const selectAgotado = contenedor.querySelector('#agotadoDatos');
    const opcionesAgotado = contenedor.querySelector('#opcionesAgotado');
    const selectBono = contenedor.querySelector('#interesadoBono');
    const selectTarifa = contenedor.querySelector('#interesadoTarifa');
    const subBonoBox = contenedor.querySelector('#subBonoBox');
    const btn = contenedor.querySelector('#generarBtn');

    let subflujoBono = null;

    // Mostrar opciones si ha agotado datos
    selectAgotado.addEventListener('change', () => {
      opcionesAgotado.style.display = selectAgotado.value === 'si' ? 'block' : 'none';
      if (selectAgotado.value !== 'si') subBonoBox.style.display = 'none';
    });

    // Cargar flujo bono si selecciona "Sí"
    selectBono.addEventListener('change', () => {
      if (selectBono.value === 'si') {
        subBonoBox.style.display = 'block';
        subBonoBox.innerHTML = '';
        if (Flujos.bono) {
          Flujos.bono.render(subBonoBox, pegarTexto, true);
          subflujoBono = subBonoBox;
        }
      } else {
        subBonoBox.style.display = 'none';
        subflujoBono = null;
      }
    });

    // Generar resultado
    btn.addEventListener('click', () => {
      const agotado = selectAgotado.value;
      const bono = selectBono.value;
      const tarifa = selectTarifa.value;

      // No ha agotado datos
      if (agotado === 'no') {
        pegarTexto('Cliente consulta consumo de datos móviles, se informa. No los tiene agotados.');
        return;
      }

      // Ha agotado datos
      if (agotado === 'si') {

        // Caso: bono + tarifa (ambos sí)
        if (bono === 'si' && tarifa === 'si') {
          pegarTexto('Cliente con datos agotados. Se informa y se ofrece bono adicional. Interesado en ampliar tarifa.');
          if (subflujoBono?.generarYEnviarBono) subflujoBono.generarYEnviarBono();

          const aviso = document.createElement('div');
          aviso.textContent = '⚠️ Crea una nueva incidencia a ATC para un aumento de tarifa.';
          Object.assign(aviso.style, {
            background: '#fff3cd',
            color: '#856404',
            border: '1px solid #ffeeba',
            padding: '6px',
            borderRadius: '6px',
            marginTop: '8px'
          });
          contenedor.appendChild(aviso);
          return;
        }

        // Caso: sin bono, pero sí tarifa
        if (bono === 'no' && tarifa === 'si') {
          pegarTexto('Cliente con datos agotados, no interesado en bono adicional. Interesado en ampliar tarifa. Derivo a ATC. TC:');
          return;
        }

        // Caso: sin bono, sin tarifa
        if (bono === 'no' && tarifa === 'no') {
          pegarTexto('Cliente con datos agotados. No interesado en bono ni en ampliar tarifa.');
          return;
        }

        // Caso: solo bono
        if (bono === 'si' && tarifa === 'no') {
          pegarTexto('Cliente con datos agotados. Se informa y se ofrece bono adicional.');
          if (subflujoBono?.generarYEnviarBono) subflujoBono.generarYEnviarBono();
          return;
        }
      }
    });
  }
});

/**************************************************************************
 * 📱 FLUJO: INTERESADO AMPLIACIÓN TARIFA
 **************************************************************************/

Flujos.registrar({
  id: 'ampliacionTarifa',
  nombre: '📱 Interesado ampliación tarifa',
  tipos: ['movil'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>📱 Interesado ampliación tarifa</h3>

      <label><b>Línea detectada:</b></label><br>
      <input id="lineaPrincipal" type="text" readonly style="width:100%;margin-bottom:8px;">

      <label><b>Aplicar a:</b></label><br>
      <select id="opcionLineas" style="width:100%;margin-bottom:10px;">
        <option value="una">Solo esta línea</option>
        <option value="todas">Todas las líneas móviles</option>
      </select>

      <label><b>Teléfono contacto:</b></label><br>
      <input id="telefonoContacto" type="text" placeholder="Ej. 612345678" style="width:100%;margin-bottom:10px;">

      <button id="generarBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    const inputLinea = contenedor.querySelector('#lineaPrincipal');
    const selectOpcion = contenedor.querySelector('#opcionLineas');
    const inputTel = contenedor.querySelector('#telefonoContacto');
    const btn = contenedor.querySelector('#generarBtn');

    // --- Leer la línea actual desde el abonado seleccionado ---
    let lineaActual = '';
    try {
      if (typeof obtenerTextoAbonado === 'function') {
        lineaActual = obtenerTextoAbonado()?.trim() || '';
      }
    } catch (e) {
      console.warn('[Asistente RECALL] ⚠️ No se pudo leer la línea actual del abonado.');
    }

    inputLinea.value = lineaActual || '(sin línea detectada)';

    // --- Generar resultado ---
    btn.addEventListener('click', () => {
      const linea = inputLinea.value.trim();
      const opcion = selectOpcion.value;
      const tel = inputTel.value.trim();

      if (!tel) {
        alert('⚠️ Debes indicar un teléfono de contacto.');
        return;
      }

      let texto = '';

      if (opcion === 'todas') {
        texto = `Interesado en ampliación de tarifa en todas las líneas. TC: ${tel}`;
      } else {
        texto = `Interesado en ampliación de tarifa en la línea: ${linea}. TC: ${tel}`;
      }

      pegarTexto(texto);
    });
  }
});

/**************************************************************************
 * 🌍 FLUJO: CONSULTA ROAMING (versión refinada con texto natural)
 **************************************************************************/

Flujos.registrar({
  id: 'roaming',
  nombre: '🌍 Consulta roaming',
  tipos: ['movil'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>🌍 Consulta roaming</h3>

      <label><b>Operador:</b></label><br>
      <select id="operadorRoaming" style="width:100%;margin-bottom:10px;">
        <option value="">Seleccione operador</option>
        <option>Lemonvil</option>
        <option>Cablemovil</option>
        <option>Aire</option>
        <option>PTV</option>
      </select>

      <div id="zonaBox" style="display:none;">
        <label><b>Zona:</b></label><br>
        <select id="zonaRoaming" style="width:100%;margin-bottom:10px;">
          <option value="">Seleccione zona</option>
        </select>
      </div>

      <div id="avisoBox" style="
        display:none;
        margin-bottom:10px;
        padding:8px;
        border:1px solid #ffc107;
        background:#fff8e1;
        border-radius:6px;
      ">
        <p style="margin:0 0 6px 0;">Revisa si hay un bono para dicha zona y ofréceselo. Si no existe, avísale del coste de uso.</p>
        <div style="display:flex;gap:8px;">
          <button id="btnInformado" style="flex:1;background:#28a745;color:white;border:none;padding:6px;border-radius:5px;cursor:pointer;">Informado</button>
          <button id="btnNoExiste" style="flex:1;background:#6c757d;color:white;border:none;padding:6px;border-radius:5px;cursor:pointer;">No existe</button>
        </div>
      </div>

      <label><b>¿Se activa roaming?</b></label><br>
      <select id="activarRoaming" style="width:100%;margin-bottom:10px;">
        <option value="">Seleccione una opción</option>
        <option value="activa">Sí</option>
        <option value="ya">No, ya estaba activado</option>
        <option value="no">No, no quiere</option>
      </select>

      <button id="generarRoamingBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    const operadorSel = contenedor.querySelector('#operadorRoaming');
    const zonaBox = contenedor.querySelector('#zonaBox');
    const zonaSel = contenedor.querySelector('#zonaRoaming');
    const avisoBox = contenedor.querySelector('#avisoBox');
    const btnInformado = contenedor.querySelector('#btnInformado');
    const btnNoExiste = contenedor.querySelector('#btnNoExiste');
    const activarSel = contenedor.querySelector('#activarRoaming');
    const btnGenerar = contenedor.querySelector('#generarRoamingBtn');

    const zonasPorOperador = {
      Lemonvil: ['ZONA 1', 'ZONA 2', 'ZONA 3', 'ZONA 4', 'ZONA 5'],
      Cablemovil: ['ZONA 1', 'ZONA 2', 'ZONA 3', 'ZONA 4'],
      Aire: ['ZONA 1', 'ZONA 2', 'ZONA 3'],
      PTV: ['ZONA 1', 'ZONA 2', 'ZONA 3', 'ZONA 4', 'ZONA 5']
    };

    let bonoSeleccion = null;

    operadorSel.addEventListener('change', () => {
      const operador = operadorSel.value;
      zonaSel.innerHTML = '';
      bonoSeleccion = null;
      avisoBox.style.display = 'none';
      if (operador && zonasPorOperador[operador]) {
        zonasPorOperador[operador].forEach(z => {
          const opt = document.createElement('option');
          opt.textContent = z;
          zonaSel.appendChild(opt);
        });
        zonaBox.style.display = 'block';
      } else {
        zonaBox.style.display = 'none';
      }
    });

    zonaSel.addEventListener('change', () => {
      const zona = zonaSel.value;
      bonoSeleccion = null;
      if (!zona) {
        avisoBox.style.display = 'none';
        return;
      }
      const numeroZona = parseInt(zona.replace(/\D/g, ''), 10);
      avisoBox.style.display = numeroZona >= 2 ? 'block' : 'none';
    });

    btnInformado.addEventListener('click', () => {
      bonoSeleccion = 'informado';
      btnInformado.style.opacity = '1';
      btnNoExiste.style.opacity = '0.5';
    });
    btnNoExiste.addEventListener('click', () => {
      bonoSeleccion = 'noExiste';
      btnInformado.style.opacity = '0.5';
      btnNoExiste.style.opacity = '1';
    });

    btnGenerar.addEventListener('click', () => {
      const operador = operadorSel.value;
      const zona = zonaSel.value;
      const activacion = activarSel.value;

      if (!operador || !zona || !activacion) {
        alert('⚠️ Debes seleccionar operador, zona y si se activa o no.');
        return;
      }

      // Detectar línea actual
      let linea = '(sin línea detectada)';
      try {
        if (typeof obtenerTextoAbonado === 'function') {
          const texto = obtenerTextoAbonado()?.trim() || '';
          if (texto && texto !== 'ES' && !texto.toLowerCase().includes('seleccione')) {
            linea = texto;
          }
        }
      } catch {}

      // Construcción coherente del resultado
      let texto = `Cliente consulta roaming de la línea ${linea} en ${zona}.`;

      const numZona = parseInt(zona.replace(/\D/g, ''), 10);
      if (numZona >= 2 && bonoSeleccion === 'informado') {
        texto += ' Se informa de bono disponible, no le interesa.';
      }

      // Traducción natural del estado de activación
      if (activacion === 'activa') texto += ' Se activa roaming.';
      else if (activacion === 'ya') texto += ' Lo tenía activado.';
      else if (activacion === 'no') texto += ' No quiere activarlo.';

      pegarTexto(texto.trim());
    });
  }
});

/**************************************************************************
 * 📢 FLUJO: RECLAMA (genérico para todos los tipos)
 **************************************************************************/

Flujos.registrar({
  id: 'reclama',
  nombre: '📢 Reclama',
  tipos: ['administrativo', 'movil', 'internet', 'television', 'zapi', 'fijo'],
  categorias: ['reclamar'], // 👈 solo visible en categoría Reclama
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>📢 Reclama</h3>

      <label><b>Más información (opcional):</b></label><br>
      <textarea id="infoReclama" rows="3" placeholder="Rellena si cliente añade mas información" style="width:100%;margin-bottom:10px;"></textarea>

      <label><b>Teléfono de contacto (TC):</b></label><br>
      <input id="telefonoReclama" type="text" placeholder="Ej: 612345678" style="width:100%;margin-bottom:10px;">

      <button id="generarReclamaBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    // Referencias
    const info = contenedor.querySelector('#infoReclama');
    const tel = contenedor.querySelector('#telefonoReclama');
    const btn = contenedor.querySelector('#generarReclamaBtn');

    // Evento generar texto
    btn.addEventListener('click', () => {
      const telefono = tel.value.trim();
      const detalle = info.value.trim();

      if (!telefono) {
        alert('⚠️ Debes indicar un teléfono de contacto (TC).');
        return;
      }

      // Detectar tipo de abonado para adaptar texto
      let linea = '(sin línea detectada)';
      try {
        if (typeof obtenerTextoAbonado === 'function') {
          const texto = obtenerTextoAbonado()?.trim();
          if (texto && texto !== 'ES' && !texto.toLowerCase().includes('seleccione')) {
            linea = texto;
          }
        }
      } catch {}

      // Texto final
      let texto = `Cliente reclama.`;
      if (detalle) texto += `${detalle}.`;
      texto += ` TC: ${telefono}.`;

      pegarTexto(texto.trim());

      // Banner visual recordatorio
      const aviso = document.createElement('div');
      aviso.textContent = '⚠️ Si puedes dar una solución, en vez de reclamarlo, hazlo';
      Object.assign(aviso.style, {
        background: '#fff3cd',
        color: '#856404',
        border: '1px solid #ffeeba',
        padding: '6px',
        borderRadius: '6px',
        marginTop: '8px',
        textAlign: 'center',
        fontWeight: 'bold'
      });
      contenedor.appendChild(aviso);
      setTimeout(() => aviso.remove(), 6000);
    });
  }
});

/**************************************************************************
 * ⚡ FLUJO: AFECTADO AVERÍA GENERAL
 **************************************************************************/

Flujos.registrar({
  id: 'averiaGeneral',
  nombre: '⚡ Afectado avería general',
  tipos: ['movil', 'internet', 'television', 'zapi', 'fijo'], // 👈 excluye administrativo
  categorias: ['nueva', 'actualizar', 'reclama'], // visible en todas las categorías
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>⚡ Afectado avería general</h3>
      <div style="
        background:#f8f9fa;
        border:1px solid #ddd;
        border-radius:6px;
        padding:8px;
        text-align:center;
        font-weight:bold;
      ">
        Resultado generado automáticamente.
      </div>
    `;

    // 🔹 Generar resultado automático en la descripción
    pegarTexto('Afectado por avería general.');

    // 🔹 Mostrar confirmación visual breve
    const aviso = document.createElement('div');
    aviso.textContent = '✅ Texto añadido: "Afectado por avería general."';
    Object.assign(aviso.style, {
      marginTop: '10px',
      background: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb',
      borderRadius: '6px',
      padding: '6px',
      textAlign: 'center',
      fontSize: '13px',
    });
    contenedor.appendChild(aviso);

    // 🔹 El aviso se borra a los pocos segundos
    setTimeout(() => aviso.remove(), 4000);
  }
});

/**************************************************************************
 * 🛍️ FLUJO: INTERESADO SHOPPING (una sola línea)
 **************************************************************************/

Flujos.registrar({
  id: 'interesadoShopping',
  nombre: '🛍️ Interesado shopping',
  tipos: ['administrativo'],
  categorias: ['nueva'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>🛍️ Interesado shopping</h3>

      <label><b>Producto interesado:</b></label><br>
      <select id="productoSelect" style="width:100%;margin-bottom:10px;">
        <option value="Teléfono móvil" selected>Teléfono móvil</option>
        <option>Tablet</option>
        <option>Smartwatch</option>
        <option>Televisor</option>
        <option>Otro</option>
      </select>

      <div id="otroProductoBox" style="display:none;">
        <input id="otroProductoInput" type="text" placeholder="Especifique otro producto" style="width:100%;margin-bottom:10px;">
      </div>

      <label><b>Marca / Modelo:</b></label><br>
      <textarea id="modeloInput" rows="2" style="width:100%;margin-bottom:10px;"></textarea>

      <label><b>Teléfono de contacto:</b></label><br>
      <input id="telefonoInput" type="text" placeholder="Ej: 612345678" style="width:100%;margin-bottom:10px;">

      <button id="generarShoppingBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    const productoSel = contenedor.querySelector('#productoSelect');
    const otroBox = contenedor.querySelector('#otroProductoBox');
    const otroInput = contenedor.querySelector('#otroProductoInput');
    const modeloInput = contenedor.querySelector('#modeloInput');
    const telefonoInput = contenedor.querySelector('#telefonoInput');
    const btn = contenedor.querySelector('#generarShoppingBtn');

    // Mostrar campo "Otro" si se selecciona esa opción
    productoSel.addEventListener('change', () => {
      otroBox.style.display = productoSel.value === 'Otro' ? 'block' : 'none';
    });

    btn.addEventListener('click', () => {
      let producto = productoSel.value;
      if (producto === 'Otro') {
        const otro = otroInput.value.trim();
        if (!otro) {
          alert('⚠️ Debes especificar el producto en "Otro".');
          return;
        }
        producto = otro;
      }

      const modelo = modeloInput.value.trim();
      const telefono = telefonoInput.value.trim();

      if (!telefono) {
        alert('⚠️ Debes indicar un teléfono de contacto.');
        return;
      }

      // 🧾 Resultado en una sola línea
      let texto = `Interesado en producto de shopping: ${producto}`;
      if (modelo) texto += ` (${modelo})`;
      texto += `. TC: ${telefono}.`;

      pegarTexto(texto.trim());

      // ✅ Marcar la asignación automáticamente
      try {
        const panel = document.querySelector('div[id*="multipleAsignaciones_panel"]');
        if (!panel) throw new Error('No se encontró el panel de asignaciones.');

        const labels = panel.querySelectorAll('label');
        for (const label of labels) {
          if (label.textContent.trim().toUpperCase() === 'INFORMACION VENTA MOVILES') {
            const input = document.getElementById(label.getAttribute('for'));
            if (input && !input.checked) label.click();
            break;
          }
        }
      } catch (e) {
        console.warn('[Asistente RECALL] No se pudo marcar la asignación automáticamente:', e);
      }
    });
  }
});

/**************************************************************************
 * 🧾 FLUJO 7: INTERESADO SEGURO
 **************************************************************************/

Flujos.registrar({
  id: 'interesadoSeguro',
  nombre: '🧾 Interesado seguro',
  tipos: ['administrativo'],
  categorias: ['nueva'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>🧾 Interesado seguro</h3>

      <label><b>Tipo de seguro:</b></label><br>
      <input id="tipoSeguro" type="text" placeholder="Ej: de vida, de hogar, etc." style="width:100%;margin-bottom:10px;">

      <label><b>Teléfono de contacto:</b></label><br>
      <input id="telefonoSeguro" type="text" placeholder="Ej: 612345678" style="width:100%;margin-bottom:10px;">

      <button id="generarSeguroBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    const tipoSeguro = contenedor.querySelector('#tipoSeguro');
    const telefono = contenedor.querySelector('#telefonoSeguro');
    const btn = contenedor.querySelector('#generarSeguroBtn');

    btn.addEventListener('click', () => {
      const tipo = tipoSeguro.value.trim();
      const tel = telefono.value.trim();

      if (!tel) {
        alert('⚠️ Debes indicar un teléfono de contacto.');
        return;
      }

      // 🧾 Resultado en una sola línea
      let texto = 'Interesado en contratar un seguro.';
      if (tipo) texto += ` Tipo: ${tipo}.`;
      texto += ` TC: ${tel}.`;

      pegarTexto(texto.trim());

      // ✅ Autoasignación a "POLIZAS"
      try {
        const panel = document.querySelector('div[id*="multipleAsignaciones_panel"]');
        if (!panel) throw new Error('No se encontró el panel de asignaciones.');

        const labels = panel.querySelectorAll('label');
        let encontrado = false;

        labels.forEach(label => {
          if (label.textContent.trim().toUpperCase() === 'POLIZAS') {
            const forAttr = label.getAttribute('for');
            const input = document.getElementById(forAttr);
            if (input && !input.checked) {
              label.click(); // ✅ Simula clic para marcar en PrimeFaces
              console.log('[Asistente RECALL] ✅ Asignación marcada: POLIZAS');
            }
            encontrado = true;
          }
        });

        if (!encontrado) {
          console.warn('[Asistente RECALL] ⚠️ No se encontró la asignación "POLIZAS" en el panel.');
        }
      } catch (e) {
        console.error('[Asistente RECALL] ❌ Error al marcar la asignación "POLIZAS":', e);
      }
    });
  }
});

/**************************************************************************
 * 🧾 FLUJO 8: CONSULTA PERMANENCIA
 **************************************************************************/

Flujos.registrar({
  id: 'consultaPermanencia',
  nombre: '🧾 Consulta permanencia',
  tipos: ['administrativo'],
  categorias: ['nueva'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>🧾 Consulta permanencia</h3>

      <label><b>Motivo:</b></label><br>
      <textarea id="motivoPermanencia" rows="3" style="width:100%;margin-bottom:10px;"></textarea>

      <label><b>Resultado:</b></label><br>
      <select id="resultadoPermanencia" style="width:100%;margin-bottom:10px;">
        <option value="">Seleccione una opción</option>
        <option value="informa">Se informa</option>
        <option value="noinforma">No se informa, no es el titular del contrato</option>
      </select>

      <div id="checkOpciones" style="display:none; margin-left:10px; margin-bottom:10px;">
        <label><input type="checkbox" id="checkPenalizacion"> Quiere saber importe penalización</label><br>
        <label><input type="checkbox" id="checkRenovacion"> Interesado en renovación de contrato</label>
      </div>

      <label><b>Teléfono de contacto (si se transfiere):</b></label><br>
      <input id="telefonoPermanencia" type="text" placeholder="Ej: 612345678" style="width:100%;margin-bottom:10px;">

      <div style="
        background:#fff3cd;
        color:#856404;
        border:1px solid #ffeeba;
        border-radius:6px;
        padding:6px;
        font-size:12px;
        margin-bottom:10px;
      ">
        ⚠️ Si el cliente quiere darse de baja o cambiarse de operador, asigna la incidencia a ATC + RESPONSABLE DE RED.
      </div>

      <button id="generarPermanenciaBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    const motivo = contenedor.querySelector('#motivoPermanencia');
    const resultadoSel = contenedor.querySelector('#resultadoPermanencia');
    const checkOpciones = contenedor.querySelector('#checkOpciones');
    const checkPenalizacion = contenedor.querySelector('#checkPenalizacion');
    const checkRenovacion = contenedor.querySelector('#checkRenovacion');
    const telefono = contenedor.querySelector('#telefonoPermanencia');
    const btn = contenedor.querySelector('#generarPermanenciaBtn');

    // Mostrar checkboxes solo si se selecciona "Se informa"
    resultadoSel.addEventListener('change', () => {
      checkOpciones.style.display = resultadoSel.value === 'informa' ? 'block' : 'none';
    });

    btn.addEventListener('click', () => {
      const mot = motivo.value.trim() || 'no especificado';
      const resultado = resultadoSel.value;
      const tel = telefono.value.trim();

      if (!resultado) {
        alert('⚠️ Debes seleccionar un resultado.');
        return;
      }

      // --- Construir resultado ---
      let texto = `Pregunta por su permanencia. Motivo: ${mot}. `;

      if (resultado === 'informa') {
        texto += 'Se informa.';
        if (checkPenalizacion.checked) texto += ' Quiere saber importe penalización.';
        if (checkRenovacion.checked) texto += ' Interesado en renovación de contrato.';
      } else {
        texto += 'No se informa, no es el titular del contrato.';
      }

      if (tel) texto += ` TC: ${tel}.`;

      pegarTexto(texto.trim());

      // --- Detección automática de motivo sensible ---
      const motLower = mot.toLowerCase();
      if (motLower.includes('baja') || motLower.includes('operador')) {
        try {
          const panel = document.querySelector('div[id*="multipleAsignaciones_panel"]');
          if (!panel) throw new Error('No se encontró el panel de asignaciones.');

          const labels = panel.querySelectorAll('label');
          const asignaciones = ['ATC', 'RESPONSABLE DE RED'];
          let marcadas = [];

          labels.forEach(label => {
            const texto = label.textContent.trim().toUpperCase();
            if (asignaciones.includes(texto)) {
              const input = document.getElementById(label.getAttribute('for'));
              if (input && !input.checked) label.click();
              marcadas.push(texto);
            }
          });

          if (marcadas.length > 0) {
            console.log(`[Asistente RECALL] ✅ Asignaciones automáticas aplicadas: ${marcadas.join(', ')}`);
          } else {
            console.warn('[Asistente RECALL] ⚠️ No se encontraron las asignaciones ATC / RESPONSABLE DE RED.');
          }
        } catch (e) {
          console.error('[Asistente RECALL] ❌ Error al aplicar asignaciones automáticas:', e);
        }
      }
    });
  }
});

/**************************************************************************
 * 💰 FLUJO 9: INFORMACIÓN PENALIZACIÓN
 **************************************************************************/

Flujos.registrar({
  id: 'ConsultaPenalizacion',
  nombre: '💰 Consulta penalización',
  tipos: ['administrativo'],
  categorias: ['nueva'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>💰 Consulta penalización</h3>

      <label><b>Motivo (opcional):</b></label><br>
      <textarea id="motivoPenalizacion" rows="3" style="width:100%;margin-bottom:10px;"></textarea>

      <label><b>Teléfono de contacto:</b></label><br>
      <input id="telefonoPenalizacion" type="text" placeholder="Ej: 612345678" style="width:100%;margin-bottom:10px;">

      <button id="generarPenalizacionBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    const motivo = contenedor.querySelector('#motivoPenalizacion');
    const telefono = contenedor.querySelector('#telefonoPenalizacion');
    const btn = contenedor.querySelector('#generarPenalizacionBtn');

    btn.addEventListener('click', () => {
      const mot = motivo.value.trim() || 'no especificado';
      const tel = telefono.value.trim();

      if (!tel) {
        alert('⚠️ Debes indicar un teléfono de contacto.');
        return;
      }

      // 🧾 Resultado en una sola línea
      const texto = `Quiere saber el importe de su penalización. Motivo: ${mot}. TC: ${tel}.`;
      pegarTexto(texto.trim());
    });
  }
});

/**************************************************************************
 * 🏗️ FLUJO 10: INSTALACIÓN
 **************************************************************************/

Flujos.registrar({
  id: 'instalacion',
  nombre: '🏗️ Instalación',
  tipos: ['administrativo'],
  categorias: ['nueva', 'actualizar', 'reclamar'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>🏗️ Instalación</h3>

      <label><b>Consulta:</b></label><br>
      <select id="tipoConsulta" style="width:100%;margin-bottom:10px;">
        <option value="">Seleccione una opción</option>
        <option value="reclama">Reclama cita</option>
        <option value="informa">Se informa de su cita</option>
        <option value="anular">Quiere anular su cita</option>
        <option value="cambiar">Quiere cambiar su cita</option>
      </select>

      <div id="bloqueTelefono" style="display:none;">
        <label><b>Teléfono de contacto:</b></label><br>
        <input id="telefonoInstalacion" type="text" placeholder="Ej: 612345678" style="width:100%;margin-bottom:10px;">
      </div>

      <div id="bloquePreferencia" style="display:none;">
        <label><b>¿Preferencia por nueva cita?</b></label><br>
        <textarea id="preferenciaCita" rows="3" style="width:100%;margin-bottom:10px;"></textarea>
      </div>

      <div style="display:flex; gap:6px;">
        <button id="generarInstalacionBtn" style="
          flex:1;
          background:#007bff;
          color:white;
          border:none;
          padding:8px;
          border-radius:6px;
          cursor:pointer;
        ">📝 Generar resultado</button>

        <button id="generarRocketBtn" style="
          flex:1;
          background:#28a745;
          color:white;
          border:none;
          padding:8px;
          border-radius:6px;
          cursor:pointer;
        ">🚀 Generar mensaje Rocket</button>
      </div>
    `;

    // --- Referencias ---
    const tipoSel = contenedor.querySelector('#tipoConsulta');
    const bloqueTel = contenedor.querySelector('#bloqueTelefono');
    const bloquePref = contenedor.querySelector('#bloquePreferencia');
    const inputTel = contenedor.querySelector('#telefonoInstalacion');
    const inputPref = contenedor.querySelector('#preferenciaCita');
    const btnGenerar = contenedor.querySelector('#generarInstalacionBtn');
    const btnRocket = contenedor.querySelector('#generarRocketBtn');

    // --- Mostrar campos según selección ---
    tipoSel.addEventListener('change', () => {
      const val = tipoSel.value;
      bloqueTel.style.display = ['reclama', 'anular', 'cambiar'].includes(val) ? 'block' : 'none';
      bloquePref.style.display = ['anular', 'cambiar'].includes(val) ? 'block' : 'none';
    });

    // --- Obtener población desde el CRM ---
    function obtenerPoblacionCRM() {
      try {
        const pre = document.querySelector('#viewAMIncidenciasRaiz\\:formIncidencia\\:direccionPanel pre');
        if (!pre) return '(sin población)';
        const texto = pre.textContent.trim();
        // Extrae el bloque entre el código postal y la provincia
        const match = texto.match(/\d{5}\s+([A-ZÁÉÍÓÚÜÑ ]+)\s*\(/i);
        return match ? match[1].trim() : '(sin población)';
      } catch {
        return '(sin población)';
      }
    }

    // --- Obtener código de cliente ---
    function obtenerCodigoCliente() {
      const link = document.querySelector('a[id*="textCliente"]');
      if (!link) return '(sin código)';
      return link.textContent.trim().split('-')[0].trim();
    }

    // --- Generar resultado principal ---
    btnGenerar.addEventListener('click', () => {
      const tipo = tipoSel.value;
      const tel = inputTel.value.trim();
      const pref = inputPref.value.trim();

      if (!tipo) {
        alert('⚠️ Debes seleccionar una opción de consulta.');
        return;
      }

      if (['reclama', 'anular', 'cambiar'].includes(tipo) && !tel) {
        alert('⚠️ Debes indicar un teléfono de contacto.');
        return;
      }

      let texto = '';

      switch (tipo) {
        case 'reclama':
          texto = 'Cliente reclama cita.';
          break;
        case 'informa':
          texto = 'Cliente consulta su cita. Se informa.';
          break;
        case 'anular':
          texto = 'Cliente solicita anular su cita.';
          break;
        case 'cambiar':
          texto = 'Cliente solicita cambiar su cita.';
          break;
      }

      if (pref && ['anular', 'cambiar'].includes(tipo)) {
        texto += ` Preferencia: ${pref}.`;
      }

      if (tel) texto += ` TC: ${tel}.`;

      pegarTexto(texto.trim());
    });

    // --- Generar mensaje Rocket ---
    btnRocket.addEventListener('click', () => {
      const tipo = tipoSel.value;
      const tel = inputTel.value.trim();

      if (!tipo) {
        alert('⚠️ Debes seleccionar una opción de consulta.');
        return;
      }

      if (['reclama', 'anular', 'cambiar'].includes(tipo) && !tel) {
        alert('⚠️ Debes indicar un teléfono de contacto.');
        return;
      }

      const codigoCliente = obtenerCodigoCliente();
      const poblacion = obtenerPoblacionCRM();

      const descripcion = {
        reclama: 'Reclama cita',
        anular: 'Quiere anular su cita',
        cambiar: 'Quiere cambiar su cita',
        informa: 'Se informa de su cita'
      }[tipo];

      const mensaje = `${codigoCliente} - ${descripcion} - TC: ${tel || '(sin teléfono)'} - ${poblacion}`;

      // Mostrar el mensaje en un popup simple (puedes copiarlo o usar Rocket API más adelante)
      navigator.clipboard.writeText(mensaje).then(() => {
        alert(`✅ Mensaje Rocket copiado:\n\n${mensaje}`);
      }).catch(() => {
        prompt('📋 Copia el mensaje Rocket:', mensaje);
      });
    });
  }
});

/**************************************************************************
 * 📶 FLUJO 6: INCIDENCIA SERVICIO
 **************************************************************************/

Flujos.registrar({
  id: 'incidenciaServicio',
  nombre: '📶 Incidencia servicio',
  tipos: ['movil'],
  categorias: ['nueva', 'actualizar'],
  render: (contenedor, pegarTexto) => {

    contenedor.innerHTML = `
      <h3>📶 Incidencia servicio</h3>

      <label><b>Tipo de gestión:</b></label><br>
      <select id="tipoGestion" style="width:100%;margin-bottom:10px;">
        <option value="">Seleccione...</option>
        <option value="nueva">🆕 Nueva incidencia</option>
        <option value="actualizacion">🔄 Actualización</option>
      </select>

      <!-- ══════════════════════════════════════════
           NUEVA INCIDENCIA
      ══════════════════════════════════════════ -->
      <div id="bloqueNueva" style="display:none;">

        <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;cursor:pointer;">
          <input type="checkbox" id="esHija">
          <b>Incidencia hija</b>
        </label>
        <div id="bloqueHija" style="display:none;margin-bottom:10px;">
          <label>Nº incidencia madre:</label><br>
          <input type="text" id="incMadre" placeholder="Ej: INC-00123" style="width:100%;box-sizing:border-box;">
        </div>

        <label><b>Operador:</b></label><br>
        <select id="operador" style="width:100%;margin-bottom:10px;">
          <option value="">Seleccione operador</option>
          <option>Lemonvil</option>
          <option>Cablemovil</option>
          <option>Aire</option>
          <option>PTV</option>
        </select>

        <label><b>Motivo incidencia:</b></label><br>
        <select id="motivoInc" style="width:100%;margin-bottom:10px;">
          <option value="">Seleccione motivo</option>
          <optgroup label="España">
            <option>Sin servicio (voz/datos)</option>
            <option>Sin voz</option>
            <option>Problema llamadas entrantes</option>
            <option>Problema llamadas salientes</option>
            <option>Sin datos móviles</option>
            <option>Lentitud datos móviles</option>
            <option>Cobertura</option>
            <option>Otro</option>
          </optgroup>
          <optgroup label="Roaming">
            <option>Sin servicio (voz/datos)</option>
            <option>Sin voz</option>
            <option>Problema llamadas entrantes</option>
            <option>Problema llamadas salientes</option>
            <option>Sin datos móviles</option>
            <option>Lentitud datos móviles</option>
            <option>Cobertura</option>
            <option>Otro</option>
          </optgroup>
        </select>

        <!-- Datos agotados Nueva -->
        <div id="bloqueDatosAgotadosNueva" style="display:none;margin-bottom:10px;padding:8px;border:1px solid #d0e8d0;border-radius:6px;background:#f4fff4;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:8px;">
            <input type="checkbox" id="datosAgotadosNueva"> <b>Datos agotados</b>
          </label>
          <div id="preguntasBonoNueva" style="display:none;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <label style="flex:1;">¿Interesado en bono adicional?</label>
              <select id="interesBonoNueva" style="width:80px;">
                <option value="">—</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <label style="flex:1;">¿Interesado en ampliar tarifa?</label>
              <select id="interesTarifaNueva" style="width:80px;">
                <option value="">—</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </div>
            <div id="subBonoBoxNueva" style="display:none;margin-top:8px;border:1px solid #ccc;border-radius:6px;padding:6px;background:#fff;"></div>
          </div>
        </div>

        <label><b>Información adicional <span style="font-weight:normal;">(opcional)</span>:</b></label><br>
        <textarea id="infoAdicional" rows="2" style="width:100%;margin-bottom:10px;box-sizing:border-box;"></textarea>

        <label><b>Pruebas realizadas <span style="font-weight:normal;">(opcional)</span>:</b></label><br>
        <textarea id="pruebasRealizadas" rows="2" style="width:100%;margin-bottom:10px;box-sizing:border-box;"></textarea>

        <label><b>Estado:</b></label><br>
        <select id="estadoNueva" style="width:100%;margin-bottom:8px;">
          <option value="">Seleccione estado</option>
          <option value="pte_cliente">PTE CLIENTE</option>
          <option value="pte_proveedor">PTE PROVEEDOR</option>
          <option value="pte_atc">PTE ATC</option>
          <option value="pte_interno">PTE INTERNO</option>
          <option value="resuelta">RESUELTA</option>
        </select>

        <!-- Sub PTE CLIENTE Nueva -->
        <div id="subClienteNueva" style="display:none;margin-bottom:10px;padding:8px;border:1px solid #cce0ff;border-radius:6px;background:#f0f7ff;">
          <label><b>Situación:</b></label><br>
          <select id="subEstClienteNueva" style="width:100%;margin-bottom:8px;">
            <option value="">Seleccione...</option>
            <option value="avisara">Avisará cuando pueda</option>
            <option value="no_localizado">No localizado</option>
            <option value="citado">Citado</option>
          </select>
          <div id="bloqueAvisaraNueva" style="display:none;">
            <label><b>Pruebas:</b></label><br>
            <select id="pruebasIndNueva" style="width:100%;margin-bottom:4px;">
              <option value="">Seleccione...</option>
              <option value="indicadas">Pruebas indicadas</option>
              <option value="no_indicadas">Pruebas no indicadas</option>
            </select>
          </div>
          <div id="bloqueNoLocNueva" style="display:none;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="checkbox" id="waEnviadoNueva"> Se envía WhatsApp
            </label>
          </div>
        </div>

        <!-- Sub PTE PROVEEDOR Nueva -->
        <div id="subProveedorNueva" style="display:none;margin-bottom:10px;padding:8px;border:1px solid #ffd6a5;border-radius:6px;background:#fff8ee;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:6px;">
            <input type="checkbox" id="seReclamaNueva"> Se reclama
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:6px;">
            <input type="checkbox" id="escN2Nueva"> Escalado a N2 operador
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:8px;">
            <input type="checkbox" id="escCoordNueva"> Escalado a coordinador
          </label>
          <label><b>Nº ticket operador:</b></label><br>
          <input type="text" id="ticketProveedorNueva" placeholder="Ej: TK-98765" style="width:100%;box-sizing:border-box;">
        </div>

        <div id="bloquePrioridadNueva" style="display:none;margin-bottom:12px;">
          <label><b>Prioridad:</b></label><br>
          <select id="prioridadNueva" style="width:100%;">
            <option value="">Seleccione prioridad</option>
            <option value="extrema">🔴 Extrema</option>
            <option value="alta">🟠 Alta</option>
            <option value="baja">🟢 Baja</option>
          </select>
        </div>

        <button id="btnGenerarNueva" style="
          width:100%;background:#007bff;color:white;
          border:none;padding:8px;border-radius:6px;cursor:pointer;
          transition:background 0.3s;">
          📝 Generar resultado
        </button>
      </div>

      <!-- ══════════════════════════════════════════
           ACTUALIZACIÓN
      ══════════════════════════════════════════ -->
      <div id="bloqueActualizacion" style="display:none;">

        <!-- Cambiar motivo -->
        <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;cursor:pointer;">
          <input type="checkbox" id="cambiarMotivo"> <b>Cambiar motivo de incidencia</b>
        </label>
        <div id="bloqueNuevoMotivo" style="display:none;margin-bottom:10px;">
          <select id="motivoAct" style="width:100%;margin-bottom:10px;">
            <option value="">Seleccione motivo</option>
            <optgroup label="España">
              <option>Sin servicio (voz/datos)</option>
              <option>Sin voz</option>
              <option>Problema llamadas entrantes</option>
              <option>Problema llamadas salientes</option>
              <option>Sin datos móviles</option>
              <option>Lentitud datos móviles</option>
              <option>Cobertura</option>
              <option>Otro</option>
            </optgroup>
            <optgroup label="Roaming">
              <option>Sin servicio (voz/datos)</option>
              <option>Sin voz</option>
              <option>Problema llamadas entrantes</option>
              <option>Problema llamadas salientes</option>
              <option>Sin datos móviles</option>
              <option>Lentitud datos móviles</option>
              <option>Cobertura</option>
              <option>Otro</option>
            </optgroup>
          </select>

          <!-- Datos agotados Actualización -->
          <div id="bloqueDatosAgotadosAct" style="display:none;margin-bottom:10px;padding:8px;border:1px solid #d0e8d0;border-radius:6px;background:#f4fff4;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:8px;">
              <input type="checkbox" id="datosAgotadosAct"> <b>Datos agotados</b>
            </label>
            <div id="preguntasBonoAct" style="display:none;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <label style="flex:1;">¿Interesado en bono adicional?</label>
                <select id="interesBonoAct" style="width:80px;">
                  <option value="">—</option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <label style="flex:1;">¿Interesado en ampliar tarifa?</label>
                <select id="interesTarifaAct" style="width:80px;">
                  <option value="">—</option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div id="subBonoBoxAct" style="display:none;margin-top:8px;border:1px solid #ccc;border-radius:6px;padding:6px;background:#fff;"></div>
            </div>
          </div>
        </div>

        <!-- Campos opcionales con checkbox -->
        <div style="margin-bottom:10px;">

          <!-- Información adicional -->
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;">
            <input type="checkbox" id="cbInfoAct"> <b>Información adicional</b>
          </label>
          <div id="bloqueInfoAct" style="display:none;margin-bottom:8px;">
            <textarea id="infoAct" rows="2" style="width:100%;box-sizing:border-box;"
              placeholder="Información adicional de la gestión..."></textarea>
          </div>

          <!-- Actualización proveedor -->
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;">
            <input type="checkbox" id="cbActProvAct"> <b>Actualización proveedor</b>
          </label>
          <div id="bloqueActProvAct" style="display:none;margin-bottom:8px;">
            <textarea id="actProvAct" rows="2" style="width:100%;box-sizing:border-box;"
              placeholder="Respuesta o novedad del proveedor..."></textarea>
          </div>

          <!-- Pruebas adicionales -->
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;">
            <input type="checkbox" id="cbPruebasAct"> <b>Pruebas adicionales</b>
          </label>
          <div id="bloquePruebasAct" style="display:none;margin-bottom:8px;">
            <textarea id="pruebasAct" rows="2" style="width:100%;box-sizing:border-box;"
              placeholder="Pruebas realizadas en esta gestión..."></textarea>
          </div>
        </div>

        <label><b>Estado:</b></label><br>
        <select id="estadoAct" style="width:100%;margin-bottom:8px;">
          <option value="">Seleccione estado</option>
          <option value="pte_cliente">PTE CLIENTE</option>
          <option value="pte_proveedor">PTE PROVEEDOR</option>
          <option value="pte_atc">PTE ATC</option>
          <option value="pte_interno">PTE INTERNO</option>
          <option value="resuelta">RESUELTA</option>
        </select>

        <!-- Sub PTE CLIENTE Actualización -->
        <div id="subClienteAct" style="display:none;margin-bottom:10px;padding:8px;border:1px solid #cce0ff;border-radius:6px;background:#f0f7ff;">
          <label><b>Situación:</b></label><br>
          <select id="subEstClienteAct" style="width:100%;margin-bottom:8px;">
            <option value="">Seleccione...</option>
            <option value="avisara">Avisará cuando pueda</option>
            <option value="no_localizado">No localizado</option>
            <option value="citado">Citado</option>
          </select>
          <div id="bloqueAvisaraAct" style="display:none;">
            <label><b>Pruebas:</b></label><br>
            <select id="pruebasIndAct" style="width:100%;margin-bottom:4px;">
              <option value="">Seleccione...</option>
              <option value="indicadas">Pruebas indicadas</option>
              <option value="no_indicadas">Pruebas no indicadas</option>
            </select>
          </div>
          <div id="bloqueNoLocAct" style="display:none;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="checkbox" id="waEnviadoAct"> Se envía WhatsApp
            </label>
          </div>
        </div>

        <!-- Sub PTE PROVEEDOR Actualización -->
        <div id="subProveedorAct" style="display:none;margin-bottom:10px;padding:8px;border:1px solid #ffd6a5;border-radius:6px;background:#fff8ee;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:6px;">
            <input type="checkbox" id="seReclamaAct"> Se reclama
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:6px;">
            <input type="checkbox" id="escN2Act"> Escalado a N2 operador
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:8px;">
            <input type="checkbox" id="escCoordAct"> Escalado a coordinador
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:6px;">
            <input type="checkbox" id="cbTicketProvAct"> <b>Añadir ticket operador</b>
          </label>
          <div id="bloqueTicketProvAct" style="display:none;">
            <input type="text" id="ticketProveedorAct" placeholder="Ej: TK-98765" style="width:100%;box-sizing:border-box;">
          </div>
        </div>

        <!-- Cambiar prioridad -->
        <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;cursor:pointer;">
          <input type="checkbox" id="cambiarPrioridad"> <b>Cambiar prioridad</b>
        </label>
        <div id="bloqueNuevaPrioridad" style="display:none;margin-bottom:12px;">
          <select id="prioridadAct" style="width:100%;">
            <option value="">Seleccione prioridad</option>
            <option value="extrema">🔴 Extrema</option>
            <option value="alta">🟠 Alta</option>
            <option value="baja">🟢 Baja</option>
          </select>
        </div>

        <button id="btnGenerarAct" style="
          width:100%;background:#007bff;color:white;
          border:none;padding:8px;border-radius:6px;cursor:pointer;
          transition:background 0.3s;">
          📝 Generar resultado
        </button>
      </div>
    `;

    /**************************************************************************
     * REFERENCIAS
     **************************************************************************/
    const q = id => contenedor.querySelector(`#${id}`);

    const tipoGestion         = q('tipoGestion');
    const bloqueNueva         = q('bloqueNueva');
    const bloqueActualizacion = q('bloqueActualizacion');

    // Nueva
    const esHija                   = q('esHija');
    const bloqueHija               = q('bloqueHija');
    const incMadre                 = q('incMadre');
    const operador                 = q('operador');
    const motivoInc                = q('motivoInc');
    const bloqueDatosAgotadosNueva = q('bloqueDatosAgotadosNueva');
    const datosAgotadosNueva       = q('datosAgotadosNueva');
    const preguntasBonoNueva       = q('preguntasBonoNueva');
    const interesBonoNueva         = q('interesBonoNueva');
    const interesTarifaNueva       = q('interesTarifaNueva');
    const subBonoBoxNueva          = q('subBonoBoxNueva');
    const infoAdicional            = q('infoAdicional');
    const pruebasRealizadas        = q('pruebasRealizadas');
    const estadoNueva              = q('estadoNueva');
    const subClienteNueva          = q('subClienteNueva');
    const subEstClienteNueva       = q('subEstClienteNueva');
    const bloqueAvisaraNueva       = q('bloqueAvisaraNueva');
    const pruebasIndNueva          = q('pruebasIndNueva');
    const bloqueNoLocNueva         = q('bloqueNoLocNueva');
    const waEnviadoNueva           = q('waEnviadoNueva');
    const subProveedorNueva        = q('subProveedorNueva');
    const seReclamaNueva           = q('seReclamaNueva');
    const escN2Nueva               = q('escN2Nueva');
    const escCoordNueva            = q('escCoordNueva');
    const ticketProveedorNueva     = q('ticketProveedorNueva');
    const bloquePrioridadNueva     = q('bloquePrioridadNueva');
    const prioridadNueva           = q('prioridadNueva');
    const btnGenerarNueva          = q('btnGenerarNueva');

    // Actualización
    const cambiarMotivo            = q('cambiarMotivo');
    const bloqueNuevoMotivo        = q('bloqueNuevoMotivo');
    const motivoAct                = q('motivoAct');
    const bloqueDatosAgotadosAct   = q('bloqueDatosAgotadosAct');
    const datosAgotadosAct         = q('datosAgotadosAct');
    const preguntasBonoAct         = q('preguntasBonoAct');
    const interesBonoAct           = q('interesBonoAct');
    const interesTarifaAct         = q('interesTarifaAct');
    const subBonoBoxAct            = q('subBonoBoxAct');
    const cbInfoAct                = q('cbInfoAct');
    const bloqueInfoAct            = q('bloqueInfoAct');
    const infoAct                  = q('infoAct');
    const cbActProvAct             = q('cbActProvAct');
    const bloqueActProvAct         = q('bloqueActProvAct');
    const actProvAct               = q('actProvAct');
    const cbPruebasAct             = q('cbPruebasAct');
    const bloquePruebasAct         = q('bloquePruebasAct');
    const pruebasAct               = q('pruebasAct');
    const estadoAct                = q('estadoAct');
    const subClienteAct            = q('subClienteAct');
    const subEstClienteAct         = q('subEstClienteAct');
    const bloqueAvisaraAct         = q('bloqueAvisaraAct');
    const pruebasIndAct            = q('pruebasIndAct');
    const bloqueNoLocAct           = q('bloqueNoLocAct');
    const waEnviadoAct             = q('waEnviadoAct');
    const subProveedorAct          = q('subProveedorAct');
    const seReclamaAct             = q('seReclamaAct');
    const escN2Act                 = q('escN2Act');
    const escCoordAct              = q('escCoordAct');
    const cbTicketProvAct          = q('cbTicketProvAct');
    const bloqueTicketProvAct      = q('bloqueTicketProvAct');
    const ticketProveedorAct       = q('ticketProveedorAct');
    const cambiarPrioridad         = q('cambiarPrioridad');
    const bloqueNuevaPrioridad     = q('bloqueNuevaPrioridad');
    const prioridadAct             = q('prioridadAct');
    const btnGenerarAct            = q('btnGenerarAct');

    let subflujoBono    = null;
    let subflujoBonoAct = null;

    /**************************************************************************
     * HELPERS
     **************************************************************************/
    function necesitaBono(motivo) {
      const t = motivo.toLowerCase();
      return t.includes('datos móviles') || t.includes('lentitud');
    }

    function limpiarBono(caja, checkbox, preguntas, interesSelect, tarifaSelect) {
      checkbox.checked        = false;
      preguntas.style.display = 'none';
      caja.style.display      = 'none';
      caja.innerHTML          = '';
      interesSelect.value     = '';
      tarifaSelect.value      = '';
      return null;
    }

    function montarBono(caja) {
      caja.style.display = 'block';
      caja.innerHTML     = '';
      if (Flujos.bono) {
        Flujos.bono.render(caja, pegarTexto, true);
        return caja;
      }
      return null;
    }

    function buildTextoEstado(est, subEstCliente, pruebasInd, waEnviado, seReclama, escN2, escCoord, ticket) {
      if (est === 'pte_cliente') {
        if (subEstCliente === 'avisara') {
          const pruTxt = pruebasInd === 'indicadas' ? 'pruebas indicadas' : 'pruebas no indicadas';
          return `PTE CLIENTE (avisará; ${pruTxt})`;
        } else if (subEstCliente === 'no_localizado') {
          return `PTE CLIENTE (no localizado${waEnviado ? '; WA enviado' : ''})`;
        } else if (subEstCliente === 'citado') {
          return `PTE CLIENTE (citado)`;
        }
      } else if (est === 'pte_proveedor') {
        const d = [];
        if (ticket)    d.push(`ticket: ${ticket}`);
        if (seReclama) d.push('reclamado');
        if (escN2)     d.push('escalado N2');
        if (escCoord)  d.push('escalado coordinador');
        return `PTE PROVEEDOR${d.length ? ` (${d.join(', ')})` : ''}`;
      }
      const nombres = { pte_atc: 'PTE ATC', pte_interno: 'PTE INTERNO', resuelta: 'RESUELTA' };
      return nombres[est] || est.toUpperCase();
    }

    function buildTextoDatos(interesBono, interesTarifa, subflujo) {
      const partes = ['Datos agotados'];
      partes.push(`Interesado en bono adicional: ${interesBono === 'si' ? 'Sí' : 'No'}`);
      partes.push(`Interesado en ampliar tarifa: ${interesTarifa === 'si' ? 'Sí' : 'No'}`);
      if (interesBono === 'si' && subflujo) {
        const textoBono = subflujo.getTextoBono?.();
        if (textoBono) partes.push(textoBono);
      }
      return partes.join('. ');
    }

    function feedbackBoton(btn) {
      btn.style.background = '#28a745';
      btn.textContent      = '✅ Generado';
      setTimeout(() => {
        btn.style.background = '#007bff';
        btn.textContent      = '📝 Generar resultado';
      }, 1500);
    }

    /**************************************************************************
     * EVENTOS — CONTROL PRINCIPAL
     **************************************************************************/
    tipoGestion.addEventListener('change', () => {
      bloqueNueva.style.display         = tipoGestion.value === 'nueva'         ? 'block' : 'none';
      bloqueActualizacion.style.display = tipoGestion.value === 'actualizacion' ? 'block' : 'none';
    });

    /**************************************************************************
     * EVENTOS — NUEVA INCIDENCIA
     **************************************************************************/
    esHija.addEventListener('change', () => {
      bloqueHija.style.display = esHija.checked ? 'block' : 'none';
    });

    motivoInc.addEventListener('change', () => {
      const mostrar = necesitaBono(motivoInc.value);
      bloqueDatosAgotadosNueva.style.display = mostrar ? 'block' : 'none';
      if (!mostrar) {
        subflujoBono = limpiarBono(subBonoBoxNueva, datosAgotadosNueva,
          preguntasBonoNueva, interesBonoNueva, interesTarifaNueva);
      }
    });

    datosAgotadosNueva.addEventListener('change', () => {
      preguntasBonoNueva.style.display = datosAgotadosNueva.checked ? 'block' : 'none';
      if (!datosAgotadosNueva.checked) {
        subBonoBoxNueva.style.display = 'none';
        subflujoBono                  = null;
        interesBonoNueva.value        = '';
        interesTarifaNueva.value      = '';
      }
    });

    interesBonoNueva.addEventListener('change', () => {
      if (interesBonoNueva.value === 'si') {
        subflujoBono = montarBono(subBonoBoxNueva);
      } else {
        subBonoBoxNueva.style.display = 'none';
        subBonoBoxNueva.innerHTML     = '';
        subflujoBono                  = null;
      }
    });

    estadoNueva.addEventListener('change', () => {
      const est = estadoNueva.value;
      subClienteNueva.style.display      = est === 'pte_cliente'   ? 'block' : 'none';
      subProveedorNueva.style.display    = est === 'pte_proveedor' ? 'block' : 'none';
      bloquePrioridadNueva.style.display = est && est !== 'resuelta' ? 'block' : 'none';
      subEstClienteNueva.value           = '';
      bloqueAvisaraNueva.style.display   = 'none';
      bloqueNoLocNueva.style.display     = 'none';
      prioridadNueva.value               = '';
    });

    subEstClienteNueva.addEventListener('change', () => {
      bloqueAvisaraNueva.style.display = subEstClienteNueva.value === 'avisara'       ? 'block' : 'none';
      bloqueNoLocNueva.style.display   = subEstClienteNueva.value === 'no_localizado' ? 'block' : 'none';
    });

    /**************************************************************************
     * EVENTOS — ACTUALIZACIÓN
     **************************************************************************/
    cambiarMotivo.addEventListener('change', () => {
      bloqueNuevoMotivo.style.display = cambiarMotivo.checked ? 'block' : 'none';
      if (!cambiarMotivo.checked) {
        motivoAct.value = '';
        bloqueDatosAgotadosAct.style.display = 'none';
        subflujoBonoAct = limpiarBono(subBonoBoxAct, datosAgotadosAct,
          preguntasBonoAct, interesBonoAct, interesTarifaAct);
      }
    });

    motivoAct.addEventListener('change', () => {
      const mostrar = necesitaBono(motivoAct.value);
      bloqueDatosAgotadosAct.style.display = mostrar ? 'block' : 'none';
      if (!mostrar) {
        subflujoBonoAct = limpiarBono(subBonoBoxAct, datosAgotadosAct,
          preguntasBonoAct, interesBonoAct, interesTarifaAct);
      }
    });

    datosAgotadosAct.addEventListener('change', () => {
      preguntasBonoAct.style.display = datosAgotadosAct.checked ? 'block' : 'none';
      if (!datosAgotadosAct.checked) {
        subBonoBoxAct.style.display = 'none';
        subflujoBonoAct             = null;
        interesBonoAct.value        = '';
        interesTarifaAct.value      = '';
      }
    });

    interesBonoAct.addEventListener('change', () => {
      if (interesBonoAct.value === 'si') {
        subflujoBonoAct = montarBono(subBonoBoxAct);
      } else {
        subBonoBoxAct.style.display = 'none';
        subBonoBoxAct.innerHTML     = '';
        subflujoBonoAct             = null;
      }
    });

    // Checkboxes campos opcionales actualización
    cbInfoAct.addEventListener('change', () => {
      bloqueInfoAct.style.display = cbInfoAct.checked ? 'block' : 'none';
      if (!cbInfoAct.checked) infoAct.value = '';
    });

    cbActProvAct.addEventListener('change', () => {
      bloqueActProvAct.style.display = cbActProvAct.checked ? 'block' : 'none';
      if (!cbActProvAct.checked) actProvAct.value = '';
    });

    cbPruebasAct.addEventListener('change', () => {
      bloquePruebasAct.style.display = cbPruebasAct.checked ? 'block' : 'none';
      if (!cbPruebasAct.checked) pruebasAct.value = '';
    });

    estadoAct.addEventListener('change', () => {
      const est = estadoAct.value;
      subClienteAct.style.display    = est === 'pte_cliente'   ? 'block' : 'none';
      subProveedorAct.style.display  = est === 'pte_proveedor' ? 'block' : 'none';
      subEstClienteAct.value         = '';
      bloqueAvisaraAct.style.display = 'none';
      bloqueNoLocAct.style.display   = 'none';
    });

    subEstClienteAct.addEventListener('change', () => {
      bloqueAvisaraAct.style.display = subEstClienteAct.value === 'avisara'       ? 'block' : 'none';
      bloqueNoLocAct.style.display   = subEstClienteAct.value === 'no_localizado' ? 'block' : 'none';
    });

    cbTicketProvAct.addEventListener('change', () => {
      bloqueTicketProvAct.style.display = cbTicketProvAct.checked ? 'block' : 'none';
      if (!cbTicketProvAct.checked) ticketProveedorAct.value = '';
    });

    cambiarPrioridad.addEventListener('change', () => {
      bloqueNuevaPrioridad.style.display = cambiarPrioridad.checked ? 'block' : 'none';
      if (!cambiarPrioridad.checked) prioridadAct.value = '';
    });

    /**************************************************************************
     * GENERAR — NUEVA INCIDENCIA
     **************************************************************************/
    btnGenerarNueva.addEventListener('click', () => {
      const est = estadoNueva.value;

      if (!operador.value)  return alert('⚠️ Selecciona el operador.');
      if (!motivoInc.value) return alert('⚠️ Selecciona el motivo de la incidencia.');
      if (!est)             return alert('⚠️ Selecciona el estado.');
      if (est !== 'resuelta' && !prioridadNueva.value)
                            return alert('⚠️ Selecciona la prioridad.');
      if (est === 'pte_cliente' && !subEstClienteNueva.value)
                            return alert('⚠️ Selecciona la situación del cliente.');
      if (subEstClienteNueva.value === 'avisara' && !pruebasIndNueva.value)
                            return alert('⚠️ Indica si las pruebas fueron indicadas o no.');
      if (datosAgotadosNueva.checked) {
        if (!interesBonoNueva.value)   return alert('⚠️ Indica si el cliente está interesado en bono adicional.');
        if (!interesTarifaNueva.value) return alert('⚠️ Indica si el cliente está interesado en ampliar tarifa.');
        if (interesBonoNueva.value === 'si' && !subflujoBono?.getTextoBono?.())
          return alert('⚠️ Completa los datos del bono adicional.');
      }
        if (est === 'pte_proveedor' && !ticketProveedorNueva.value.trim())
            return alert('⚠️ Indica el número de ticket del operador.');

      const zona    = motivoInc.selectedOptions[0]?.parentElement?.label || '';
      const ticket  = ticketProveedorNueva.value.trim();
      const textoEstado = buildTextoEstado(
        est,
        subEstClienteNueva.value, pruebasIndNueva.value, waEnviadoNueva.checked,
        seReclamaNueva.checked, escN2Nueva.checked, escCoordNueva.checked,
        ticket
      );

      const partes = [];
      partes.push('Nueva incidencia');
      if (esHija.checked) partes.push(`hija de ${incMadre.value.trim() || 'sin nº'}`);
      partes.push(`Operador: ${operador.value}`);
      partes.push(`Motivo: ${motivoInc.value} [${zona}]`);

      const info = infoAdicional.value.trim();
      const pru  = pruebasRealizadas.value.trim();
      if (info) partes.push(`Info: ${info}`);
      if (pru)  partes.push(`Pruebas: ${pru}`);

      if (datosAgotadosNueva.checked) {
        partes.push(buildTextoDatos(interesBonoNueva.value, interesTarifaNueva.value, subflujoBono));
      }

      if (est !== 'resuelta') partes.push(`Prioridad: ${prioridadNueva.value.toUpperCase()}`);
      partes.push(`Estado: ${textoEstado}`);

      pegarTexto(partes.join('. ') + '.');
      feedbackBoton(btnGenerarNueva);

      if (datosAgotadosNueva.checked && interesBonoNueva.value === 'si' && subflujoBono) {
        subflujoBono.enviarCorreoBono?.();
      }
    });

    /**************************************************************************
     * GENERAR — ACTUALIZACIÓN
     **************************************************************************/
    btnGenerarAct.addEventListener('click', () => {
      const est = estadoAct.value;

      if (!est) return alert('⚠️ Selecciona el nuevo estado.');
      if (est === 'pte_cliente' && !subEstClienteAct.value)
                return alert('⚠️ Selecciona la situación del cliente.');
      if (subEstClienteAct.value === 'avisara' && !pruebasIndAct.value)
                return alert('⚠️ Indica si las pruebas fueron indicadas o no.');
      if (cambiarMotivo.checked && !motivoAct.value)
                return alert('⚠️ Selecciona el nuevo motivo o desmarca la opción.');
      if (cambiarPrioridad.checked && !prioridadAct.value)
                return alert('⚠️ Selecciona la nueva prioridad o desmarca la opción.');
      if (cbTicketProvAct.checked && !ticketProveedorAct.value.trim())
                return alert('⚠️ Indica el número de ticket o desmarca la opción.');
      if (datosAgotadosAct.checked) {
        if (!interesBonoAct.value)   return alert('⚠️ Indica si el cliente está interesado en bono adicional.');
        if (!interesTarifaAct.value) return alert('⚠️ Indica si el cliente está interesado en ampliar tarifa.');
        if (interesBonoAct.value === 'si' && !subflujoBonoAct?.getTextoBono?.())
          return alert('⚠️ Completa los datos del bono adicional.');
      }

      const ticket = cbTicketProvAct.checked ? ticketProveedorAct.value.trim() : '';
      const textoEstado = buildTextoEstado(
        est,
        subEstClienteAct.value, pruebasIndAct.value, waEnviadoAct.checked,
        seReclamaAct.checked, escN2Act.checked, escCoordAct.checked,
        ticket
      );

      const partes = [];
      partes.push('Actualización');

      if (cambiarMotivo.checked) {
        const zona = motivoAct.selectedOptions[0]?.parentElement?.label || '';
        partes.push(`Motivo: ${motivoAct.value} [${zona}]`);
      }

      // Campos opcionales
      if (cbInfoAct.checked && infoAct.value.trim())
        partes.push(`Info: ${infoAct.value.trim()}`);
      if (cbActProvAct.checked && actProvAct.value.trim())
        partes.push(`Actualización proveedor: ${actProvAct.value.trim()}`);
      if (cbPruebasAct.checked && pruebasAct.value.trim())
        partes.push(`Pruebas: ${pruebasAct.value.trim()}`);

      if (datosAgotadosAct.checked) {
        partes.push(buildTextoDatos(interesBonoAct.value, interesTarifaAct.value, subflujoBonoAct));
      }

      if (cambiarPrioridad.checked && est !== 'resuelta') {
        partes.push(`Prioridad: ${prioridadAct.value.toUpperCase()}`);
      }
      partes.push(`Estado: ${textoEstado}`);

      pegarTexto(partes.join('. ') + '.');
      feedbackBoton(btnGenerarAct);

      if (datosAgotadosAct.checked && interesBonoAct.value === 'si' && subflujoBonoAct) {
        subflujoBonoAct.enviarCorreoBono?.();
      }
    });

  }
});

/**************************************************************************
 * 🌐 FLUJO: INCIDENCIA SERVICIO (INTERNET)
 **************************************************************************/

Flujos.registrar({
  id: 'incidenciaServicioInternet',
  nombre: '🌐 Incidencia servicio (Internet)',
  tipos: ['internet'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>🌐 Incidencia servicio (Internet)</h3>

      <label><b>Gestión:</b></label><br>
      <select id="tipoGestion" style="width:100%;margin-bottom:10px;">
        <option value="inicio">Inicio gestión</option>
        <option value="seguimiento">Seguimiento</option>
        <option value="derivada">Derivada (otro departamento)</option>
      </select>

      <!-- BLOQUE INICIO / DERIVADA -->
      <div id="bloqueInicio">
        <label><b>Tipo de incidencia:</b></label><br>
        <select id="tipoIncidencia" style="width:100%;margin-bottom:10px;">
          <option value="Sin servicio">Sin servicio</option>
          <option value="Sin internet">Sin internet</option>
          <option value="Lentitud">Lentitud</option>
          <option value="Cortes">Cortes</option>
          <option value="Desconexiones / cobertura wifi">Desconexiones / cobertura wifi</option>
          <option value="Configuración solicitada">Configuración solicitada</option>
          <option value="Otro">Otro</option>
        </select>

        <label id="labelDescripcion"><b>Descripción:</b></label><br>
        <textarea id="descripcion" rows="3" style="width:100%;margin-bottom:10px;"></textarea>

        <label><b>Niveles / Equipos:</b></label><br>
        <textarea id="niveles" rows="2" style="width:100%;margin-bottom:10px;"></textarea>

        <label><b>Pruebas realizadas:</b></label><br>
        <textarea id="pruebas" rows="3" style="width:100%;margin-bottom:10px;"></textarea>
      </div>

      <!-- BLOQUE SEGUIMIENTO -->
      <div id="bloqueSeguimiento" style="display:none;">
        <label><b>Información adicional (opcional):</b></label><br>
        <textarea id="infoAdicional" rows="4" style="width:100%;margin-bottom:10px;"></textarea>
      </div>

      <label><b>¿Se soluciona la incidencia?</b></label><br>
      <select id="resultado" style="width:100%;margin-bottom:10px;">
        <option value="si">Sí</option>
        <option value="pendiente">Pendiente comprobación</option>
        <option value="noLocalizado">No localizado</option>
        <option value="derivaTecnicos">Se deriva a técnicos</option>
        <option value="ingenieria">Se deriva a ingeniería</option>
        <option value="sinProblema">No tiene problemas con el servicio</option>
        <option value="ticket">Se crea ticket</option>
      </select>

      <!-- 🕓 Subbloques dinámicos -->
      <div id="bloquePendiente" style="display:none;margin-left:10px;">
        <label><b>Detalle:</b></label><br>
        <select id="detallePendiente" style="width:100%;margin-bottom:10px;">
          <option value="seCita">Se cita</option>
          <option value="avisara">Nos avisará cuando pueda</option>
        </select>

        <div id="bloqueCita" style="display:none;margin-left:10px;">
          <label>📅 Fecha de cita:</label>
          <input id="fechaCita" type="date" style="width:100%;margin-bottom:6px;">
          <label>🕒 Hora de cita:</label>
          <input id="horaCita" type="time" style="width:100%;margin-bottom:10px;">
        </div>
      </div>

      <div id="bloqueNoLocalizado" style="display:none;margin-left:10px;">
        <label><input type="checkbox" id="whatsapp"> Se envía WhatsApp</label>
      </div>

      <div id="bloqueDeriva" style="display:none;margin-left:10px;">
        <label><b>Motivo de derivación:</b></label><br>
        <select id="motivoDeriva" style="width:100%;margin-bottom:8px;">
          <option value="Tras pruebas realizadas no se soluciona">Tras pruebas realizadas no se soluciona</option>
          <option value="Cliente no colabora">Cliente no colabora</option>
          <option value="Cliente no se aclara">Cliente no se aclara</option>
          <option value="Problema físico">Problema físico</option>
          <option value="Cliente exige visita técnica">Cliente exige visita técnica</option>
          <option value="Otro">Otro</option>
        </select>

        <div id="bloqueMotivoOtro" style="display:none;margin-left:10px;">
          <label>Motivo (especificar):</label>
          <input id="motivoOtro" type="text" style="width:100%;margin-bottom:8px;" placeholder="Indica el motivo">
        </div>

        <label><b>Teléfono de contacto:</b></label><br>
        <input id="telefonoDeriva" type="text" style="width:100%;margin-bottom:10px;" placeholder="Ej. 612345678">
      </div>

      <!-- 🆕 BLOQUE TICKET -->
      <div id="bloqueTicket" style="display:none;margin-left:10px;">
        <label><b>Número de ticket:</b></label><br>
        <input id="numeroTicket" type="text" style="width:100%;margin-bottom:10px;" placeholder="Ej. INC123456">
      </div>

      <button id="generarBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    // --- Referencias ---
    const tipoGestion = contenedor.querySelector('#tipoGestion');
    const bloqueInicio = contenedor.querySelector('#bloqueInicio');
    const bloqueSeguimiento = contenedor.querySelector('#bloqueSeguimiento');
    const tipoIncidencia = contenedor.querySelector('#tipoIncidencia');
    const descripcion = contenedor.querySelector('#descripcion');
    const niveles = contenedor.querySelector('#niveles');
    const pruebas = contenedor.querySelector('#pruebas');
    const infoAdicional = contenedor.querySelector('#infoAdicional');
    const resultado = contenedor.querySelector('#resultado');
    const detallePendiente = contenedor.querySelector('#detallePendiente');
    const bloquePendiente = contenedor.querySelector('#bloquePendiente');
    const bloqueCita = contenedor.querySelector('#bloqueCita');
    const fechaCita = contenedor.querySelector('#fechaCita');
    const horaCita = contenedor.querySelector('#horaCita');
    const bloqueNoLocalizado = contenedor.querySelector('#bloqueNoLocalizado');
    const whatsapp = contenedor.querySelector('#whatsapp');
    const bloqueDeriva = contenedor.querySelector('#bloqueDeriva');
    const motivoDeriva = contenedor.querySelector('#motivoDeriva');
    const telefonoDeriva = contenedor.querySelector('#telefonoDeriva');
    const motivoOtro = contenedor.querySelector('#motivoOtro');
    const bloqueMotivoOtro = contenedor.querySelector('#bloqueMotivoOtro');
    const labelDescripcion = contenedor.querySelector('#labelDescripcion');
    const bloqueTicket = contenedor.querySelector('#bloqueTicket');
    const numeroTicket = contenedor.querySelector('#numeroTicket');
    const btn = contenedor.querySelector('#generarBtn');

    // --- Inicializar fecha por defecto ---
    const hoy = new Date();
    fechaCita.value = hoy.toISOString().split('T')[0];

    // --- Mostrar/ocultar según tipo gestión ---
    tipoGestion.addEventListener('change', () => {
      const tipo = tipoGestion.value;
      bloqueInicio.style.display = tipo === 'inicio' || tipo === 'derivada' ? 'block' : 'none';
      bloqueSeguimiento.style.display = tipo === 'seguimiento' ? 'block' : 'none';

      // Cambiar etiqueta del campo descripción según tipo
      if (tipo === 'derivada') {
        labelDescripcion.innerHTML = '<b>Información adicional (opcional):</b>';
      } else {
        labelDescripcion.innerHTML = '<b>Descripción:</b>';
      }

      // 🔄 Añadir o eliminar la opción "Cierre incidencia, no localizado tras varios intentos"
      const existeOpcion = Array.from(resultado.options).some(opt => opt.value === 'noLocalizadoVarios');
      if (tipo === 'seguimiento' && !existeOpcion) {
        const nuevaOpcion = document.createElement('option');
        nuevaOpcion.value = 'noLocalizadoVarios';
        nuevaOpcion.textContent = 'Cierre incidencia, no localizado tras varios intentos';
        const opcionNoLocalizado = Array.from(resultado.options).find(opt => opt.value === 'noLocalizado');
        if (opcionNoLocalizado && opcionNoLocalizado.nextSibling) {
          resultado.insertBefore(nuevaOpcion, opcionNoLocalizado.nextSibling);
        } else {
          resultado.appendChild(nuevaOpcion);
        }
      } else if (tipo !== 'seguimiento' && existeOpcion) {
        const opcion = Array.from(resultado.options).find(opt => opt.value === 'noLocalizadoVarios');
        if (opcion) {
          if (resultado.value === 'noLocalizadoVarios') resultado.value = 'si';
          opcion.remove();
        }
      }
    });

    // --- Mostrar subbloques según selección ---
    resultado.addEventListener('change', () => {
      bloquePendiente.style.display = resultado.value === 'pendiente' ? 'block' : 'none';
      bloqueNoLocalizado.style.display = resultado.value === 'noLocalizado' ? 'block' : 'none';
      bloqueDeriva.style.display = resultado.value === 'derivaTecnicos' ? 'block' : 'none';
      bloqueTicket.style.display = resultado.value === 'ticket' ? 'block' : 'none';
    });

    // --- Mostrar campos de cita ---
    detallePendiente.addEventListener('change', () => {
      bloqueCita.style.display = detallePendiente.value === 'seCita' ? 'block' : 'none';
    });

    // --- Mostrar campo "Otro" ---
    motivoDeriva.addEventListener('change', () => {
      bloqueMotivoOtro.style.display = motivoDeriva.value === 'Otro' ? 'block' : 'none';
    });

    // --- Generar resultado ---
    btn.addEventListener('click', () => {
      const gestion = tipoGestion.value;
      let texto = '';

      // --- Inicio gestión ---
      if (gestion === 'inicio') {
        const tipo = tipoIncidencia.value;
        const desc = descripcion.value.trim() || 'no especificada';
        const niv = niveles.value.trim() || 'no indicado';
        const pru = pruebas.value.trim() || 'no indicadas';
        texto = `Inicio gestión incidencia Internet. Tipo: ${tipo}. Descripción: ${desc}. Niveles/Equipos: ${niv}. Pruebas realizadas: ${pru}. `;
      }

      // --- Derivada ---
      if (gestion === 'derivada') {
        const tipo = tipoIncidencia.value;
        const desc = descripcion.value.trim();
        const niv = niveles.value.trim() || 'no indicado';
        const pru = pruebas.value.trim() || 'no indicadas';
        texto = `Gestión derivada de otro departamento. Tipo: ${tipo}. `;
        if (desc) texto += `Información adicional: ${desc}. `;
        texto += `Niveles/Equipos: ${niv}. Pruebas realizadas: ${pru}. `;
      }

      // --- Seguimiento ---
      if (gestion === 'seguimiento') {
        const info = infoAdicional.value.trim();
        texto = info
          ? `Seguimiento incidencia Internet. Información adicional: ${info}. `
          : `Seguimiento incidencia Internet. `;
      }

      // --- Resultado final ---
      switch (resultado.value) {
        case 'si':
          texto += 'Se soluciona.';
          break;
        case 'pendiente':
          if (detallePendiente.value === 'seCita') {
            if (!horaCita.value) {
              alert('⚠️ Debes indicar la hora de la cita.');
              return;
            }
            const [yyyy, mm, dd] = fechaCita.value.split('-');
            texto += `Pendiente comprobación: se cita el ${dd}/${mm}/${yyyy} a las ${horaCita.value}.`;
          } else {
            texto += 'Pendiente comprobación: el cliente nos avisará cuando pueda.';
          }
          break;
        case 'noLocalizado':
          texto += whatsapp.checked ? 'No localizado, se envía WhatsApp.' : 'No localizado.';
          break;
        case 'noLocalizadoVarios':
          texto += 'Cierre incidencia: no localizado tras varios intentos.';
          break;
        case 'derivaTecnicos':
          const tel = telefonoDeriva.value.trim();
          if (!tel) {
            alert('⚠️ Debes indicar un teléfono de contacto.');
            return;
          }
          if (motivoDeriva.value === 'Otro' && !motivoOtro.value.trim()) {
            alert('⚠️ Debes especificar el motivo de derivación.');
            return;
          }
          const motivo = motivoDeriva.value === 'Otro'
            ? motivoOtro.value.trim()
            : motivoDeriva.value;
          texto += `Se deriva a técnicos. Motivo: ${motivo}. TC: ${tel}.`;
          break;
        case 'ingenieria':
          texto += 'Se deriva a ingeniería para revisión.';
          break;
        case 'sinProblema':
          texto += 'No se detectan problemas con el servicio.';
          break;
        case 'ticket':
          const ticket = numeroTicket.value.trim();
          if (!ticket) {
            alert('⚠️ Debes indicar el número de ticket.');
            return;
          }
          texto += `Se crea ticket ${ticket}.`;
          break;
      }

      pegarTexto(texto.trim());
    });
  }
});




/**************************************************************************
 * 🌐 Flujo: Fibrablanca Community (Internet) — Categorías: nueva, actualizar
 **************************************************************************/
Flujos.registrar({
  id: 'fibrablanca-community',
  nombre: 'Fibrablanca Community',
  tipos: ['internet'],
  categorias: ['nueva', 'actualizar'],

  render(contenedor, pegarTexto) {
    contenedor.innerHTML = `
      <h3 style="margin-bottom:8px;">🌐 Fibrablanca Community</h3>

      <label>Nº OT (obligatorio):</label>
      <input id="fb-ot" type="text" style="width:100%;margin-bottom:6px;" required>

      <label>Instalación YMO:</label>
      <select id="fb-ymo" style="width:100%;margin-bottom:6px;">
        <option selected>NO</option>
        <option>SI</option>
      </select>

      <label>Teléfono fijo servicio (opcional):</label>
      <input id="fb-fijo" type="text" style="width:100%;margin-bottom:6px;">

      <label>Teléfono móvil de contacto (obligatorio):</label>
      <input id="fb-movil" type="text" style="width:100%;margin-bottom:6px;" required>

      <label>Nombre de contacto (obligatorio):</label>
      <input id="fb-nombre" type="text" style="width:100%;margin-bottom:6px;" required>

      <label>Horario de contacto para pruebas (opcional):</label>
      <input id="fb-horario" type="text" style="width:100%;margin-bottom:6px;">

      <label>Información adicional:</label>
      <textarea id="fb-info" style="width:100%;height:60px;margin-bottom:6px;">Se realiza diagnóstico en Schaman.</textarea>

      <fieldset style="border:1px solid #ccc;border-radius:6px;padding:6px;margin-bottom:8px;">
        <legend>💡 Luces router</legend>

        <label>PWR / POWER:</label>
        <select id="fb-pwr" style="width:100%;margin-bottom:4px;">
          <option selected>Verde</option>
          <option>Apagado</option>
        </select>

        <label>PON / DSL / WAN:</label>
        <select id="fb-pon" style="width:100%;margin-bottom:4px;">
          <option>Encendido</option>
          <option selected>Apagado</option>
        </select>

        <label>LOS:</label>
        <select id="fb-los" style="width:100%;margin-bottom:4px;">
          <option>Verde</option>
          <option selected>Rojo</option>
          <option>Apagado</option>
        </select>

        <label>INTERNET / @:</label>
        <select id="fb-internet" style="width:100%;margin-bottom:4px;">
          <option>Encendido</option>
          <option selected>Apagado</option>
        </select>
      </fieldset>

      <fieldset style="border:1px solid #ccc;border-radius:6px;padding:6px;margin-bottom:8px;">
        <legend>⚙️ Diagnóstico</legend>

        <label>¿Router enciende?</label>
        <select id="fb-router" style="width:100%;margin-bottom:4px;">
          <option selected>SI</option>
          <option>NO</option>
        </select>

        <label>¿Reinicio del router?</label>
        <select id="fb-reinicio" style="width:100%;margin-bottom:4px;">
          <option selected>SI</option>
          <option>NO</option>
        </select>

        <label>¿Reset de palillo?</label>
        <select id="fb-reset" style="width:100%;margin-bottom:4px;">
          <option>SI</option>
          <option selected>NO</option>
        </select>

        <label>¿Apagado 15 min router y ONT?</label>
        <select id="fb-apagado" style="width:100%;margin-bottom:4px;">
          <option selected>SI</option>
          <option>NO</option>
        </select>

        <label>Comprobación de cableado:</label>
        <textarea id="fb-cableado" style="width:100%;height:40px;">Todo OK</textarea>
      </fieldset>

      <button id="fb-generar" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        font-weight:bold;
        border-radius:6px;
        cursor:pointer;
      ">📋 Copiar resultado Community</button>
    `;

    // Añadimos la función del botón
    contenedor.querySelector('#fb-generar').addEventListener('click', () => {
      // Campos
      const ot = document.getElementById('fb-ot').value.trim();
      const fijo = document.getElementById('fb-fijo').value.trim();
      const movil = document.getElementById('fb-movil').value.trim();
      const nombre = document.getElementById('fb-nombre').value.trim();
      const horario = document.getElementById('fb-horario').value.trim();
      const info = document.getElementById('fb-info').value.trim();
      const pwr = document.getElementById('fb-pwr').value.trim();
      const pon = document.getElementById('fb-pon').value.trim();
      const los = document.getElementById('fb-los').value.trim();
      const internet = document.getElementById('fb-internet').value.trim();
      const router = document.getElementById('fb-router').value.trim();
      const reinicio = document.getElementById('fb-reinicio').value.trim();
      const reset = document.getElementById('fb-reset').value.trim();
      const apagado = document.getElementById('fb-apagado').value.trim();
      const cableado = document.getElementById('fb-cableado').value.trim();

      // Validaciones mínimas
      if (!ot || !movil || !nombre) {
        alert('⚠️ Faltan campos obligatorios: Nº OT, Teléfono móvil y Nombre de contacto.');
        return;
      }

      // Construcción del texto
      const resultado =
`Nº OT: ${ot}
Instalación YMO: NO
Teléfono fijo servicio: ${fijo}
Teléfono móvil de contacto: ${movil}
Nombre de contacto: ${nombre}
Horario de contacto para pruebas en domicilio: ${horario}
Información adicional: ${info}

Motivo avería: Incomunicado
Luces router (según modelo)
- PWR/POWER: ${pwr}
- PON/DSL/WAN: ${pon}
- LOS / ! : ${los}
- INTERNET/@: ${internet}
Descripcion del problema:
Router enciende: ${router}
Reinicio del router: ${reinicio}
Reset de palillo: ${reset}
Apagado de 15 min de router y ONT: ${apagado}
Comprobacion de cableado: ${cableado}`;

      // Copiar al portapapeles
      navigator.clipboard.writeText(resultado).then(() => {
        alert('📋 Resultado copiado al portapapeles (Community).');
      }).catch(() => {
        alert('⚠️ No se pudo copiar automáticamente. Copia manualmente el texto.');
      });

      // Opcional: también pegar en el CRM
      pegarTexto(resultado);
    });
  }
});

/**************************************************************************
 * 📺 FLUJO: INCIDENCIA SERVICIO (TELEVISIÓN)
 **************************************************************************/

Flujos.registrar({
  id: 'incidenciaServicioTelevision',
  nombre: '📺 Incidencia servicio (Televisión)',
  tipos: ['television'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>📺 Incidencia servicio (Televisión)</h3>

      <label><b>Gestión:</b></label><br>
      <select id="tipoGestion" style="width:100%;margin-bottom:10px;">
        <option value="inicio">Inicio gestión</option>
        <option value="seguimiento">Seguimiento</option>
        <option value="derivada">Derivada (otro departamento)</option>
      </select>

      <!-- BLOQUE INICIO GESTIÓN -->
      <div id="bloqueInicio">
        <label><b>Descripción:</b></label><br>
        <textarea id="descripcion" rows="3" style="width:100%;margin-bottom:10px;"></textarea>

        <label><b>Niveles / Equipos:</b></label><br>
        <textarea id="niveles" rows="2" style="width:100%;margin-bottom:10px;"></textarea>

        <label><b>CATV (opcional):</b></label><br>
        <input id="catv" type="text" style="width:100%;margin-bottom:10px;" placeholder="Ej. 0012345678">

        <label><b>Pruebas realizadas:</b></label><br>
        <textarea id="pruebas" rows="3" style="width:100%;margin-bottom:10px;"></textarea>
      </div>

      <!-- BLOQUE SEGUIMIENTO -->
      <div id="bloqueSeguimiento" style="display:none;">
        <label><b>Información adicional (opcional):</b></label><br>
        <textarea id="infoAdicional" rows="3" style="width:100%;margin-bottom:10px;"></textarea>
      </div>

      <!-- BLOQUE DERIVADA -->
      <div id="bloqueDerivada" style="display:none;">
        <label><b>Información adicional (opcional):</b></label><br>
        <textarea id="infoAdicionalDerivada" rows="3" style="width:100%;margin-bottom:10px;"></textarea>

        <label><b>Niveles / Equipos:</b></label><br>
        <textarea id="nivelesDerivada" rows="2" style="width:100%;margin-bottom:10px;"></textarea>

        <label><b>CATV (opcional):</b></label><br>
        <input id="catvDerivada" type="text" style="width:100%;margin-bottom:10px;" placeholder="Ej. 0012345678">

        <label><b>Pruebas realizadas:</b></label><br>
        <textarea id="pruebasDerivada" rows="3" style="width:100%;margin-bottom:10px;"></textarea>
      </div>

      <!-- RESULTADO -->
      <label><b>¿Se soluciona la incidencia?</b></label><br>
      <select id="resultado" style="width:100%;margin-bottom:10px;">
        <option value="si">Sí</option>
        <option value="pendiente">Pendiente comprobación</option>
        <option value="noLocalizado">No localizado</option>
        <option value="derivaTecnicos">Se deriva a técnicos</option>
        <option value="derivaIngenieria">Se deriva a ingeniería</option>
        <option value="noProblema">No tiene problemas con el servicio</option>
      </select>

      <!-- SUBBLOQUES -->
      <div id="bloquePendiente" style="display:none;margin-left:10px;">
        <label><b>Detalle:</b></label><br>
        <select id="detallePendiente" style="width:100%;margin-bottom:10px;">
          <option value="seCita">Se cita</option>
          <option value="avisara">Nos avisará cuando pueda</option>
        </select>

        <div id="bloqueCita" style="display:none;margin-left:10px;">
          <label>📅 Fecha de cita:</label>
          <input id="fechaCita" type="date" style="width:100%;margin-bottom:6px;">
          <label>🕒 Hora de cita:</label>
          <input id="horaCita" type="time" style="width:100%;margin-bottom:10px;">
        </div>
      </div>

      <div id="bloqueNoLocalizado" style="display:none;margin-left:10px;">
        <label><input type="checkbox" id="whatsapp"> Se envía WhatsApp</label><br>
        <div id="cierreIntentos" style="display:none;margin-top:4px;">
          <label><input type="checkbox" id="cierreNoLocalizado"> Cierre incidencia, no localizado tras varios intentos</label>
        </div>
      </div>

      <div id="bloqueDerivaTecnicos" style="display:none;margin-left:10px;">
        <label><b>Motivo de derivación:</b></label><br>
        <select id="motivoDeriva" style="width:100%;margin-bottom:8px;">
          <option value="Tras pruebas realizadas no se soluciona">Tras pruebas realizadas no se soluciona</option>
          <option value="Cliente no colabora">Cliente no colabora</option>
          <option value="Cliente no se aclara">Cliente no se aclara</option>
          <option value="Problema físico">Problema físico</option>
          <option value="Cliente exige visita técnica">Cliente exige visita técnica</option>
          <option value="Otro">Otro</option>
        </select>

        <div id="bloqueMotivoOtro" style="display:none;">
          <label><b>Especificar motivo:</b></label><br>
          <input id="motivoOtro" type="text" style="width:100%;margin-bottom:8px;">
        </div>

        <label><b>Teléfono de contacto:</b></label><br>
        <input id="telefonoDeriva" type="text" style="width:100%;margin-bottom:10px;" placeholder="Ej. 612345678">
      </div>

      <div id="bloqueIngenieria" style="display:none;margin-left:10px;">
        <label><input type="checkbox" id="checkMonitorizacion"> Se comprueba monitorización</label>
        <div id="bloqueMonitorizacion" style="display:none;margin-top:6px;margin-left:10px;">
          <label><input type="radio" name="monitorizacion" value="ok"> Se ve bien en monitorización</label><br>
          <label><input type="radio" name="monitorizacion" value="falla"> Ocurre el mismo problema en la monitorización</label>
        </div>
      </div>

      <button id="generarBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    // Referencias
    const tipoGestion = contenedor.querySelector('#tipoGestion');
    const bloqueInicio = contenedor.querySelector('#bloqueInicio');
    const bloqueSeguimiento = contenedor.querySelector('#bloqueSeguimiento');
    const bloqueDerivada = contenedor.querySelector('#bloqueDerivada');
    const descripcion = contenedor.querySelector('#descripcion');
    const niveles = contenedor.querySelector('#niveles');
    const catv = contenedor.querySelector('#catv');
    const pruebas = contenedor.querySelector('#pruebas');
    const infoAdicional = contenedor.querySelector('#infoAdicional');
    const infoAdicionalDerivada = contenedor.querySelector('#infoAdicionalDerivada');
    const nivelesDerivada = contenedor.querySelector('#nivelesDerivada');
    const catvDerivada = contenedor.querySelector('#catvDerivada');
    const pruebasDerivada = contenedor.querySelector('#pruebasDerivada');
    const resultado = contenedor.querySelector('#resultado');
    const detallePendiente = contenedor.querySelector('#detallePendiente');
    const bloquePendiente = contenedor.querySelector('#bloquePendiente');
    const bloqueCita = contenedor.querySelector('#bloqueCita');
    const fechaCita = contenedor.querySelector('#fechaCita');
    const horaCita = contenedor.querySelector('#horaCita');
    const bloqueNoLocalizado = contenedor.querySelector('#bloqueNoLocalizado');
    const whatsapp = contenedor.querySelector('#whatsapp');
    const cierreNoLocalizado = contenedor.querySelector('#cierreNoLocalizado');
    const bloqueDerivaTecnicos = contenedor.querySelector('#bloqueDerivaTecnicos');
    const motivoDeriva = contenedor.querySelector('#motivoDeriva');
    const bloqueMotivoOtro = contenedor.querySelector('#bloqueMotivoOtro');
    const motivoOtro = contenedor.querySelector('#motivoOtro');
    const telefonoDeriva = contenedor.querySelector('#telefonoDeriva');
    const bloqueIngenieria = contenedor.querySelector('#bloqueIngenieria');
    const checkMonitorizacion = contenedor.querySelector('#checkMonitorizacion');
    const bloqueMonitorizacion = contenedor.querySelector('#bloqueMonitorizacion');
    const btn = contenedor.querySelector('#generarBtn');

    // Fecha de hoy por defecto
    const hoy = new Date();
    fechaCita.value = hoy.toISOString().split('T')[0];

    // Mostrar/ocultar bloques según gestión
    tipoGestion.addEventListener('change', () => {
      bloqueInicio.style.display = tipoGestion.value === 'inicio' ? 'block' : 'none';
      bloqueSeguimiento.style.display = tipoGestion.value === 'seguimiento' ? 'block' : 'none';
      bloqueDerivada.style.display = tipoGestion.value === 'derivada' ? 'block' : 'none';
    });

    // Subbloques dinámicos
    resultado.addEventListener('change', () => {
      bloquePendiente.style.display = resultado.value === 'pendiente' ? 'block' : 'none';
      bloqueNoLocalizado.style.display = resultado.value === 'noLocalizado' ? 'block' : 'none';
      bloqueDerivaTecnicos.style.display = resultado.value === 'derivaTecnicos' ? 'block' : 'none';
      bloqueIngenieria.style.display = resultado.value === 'derivaIngenieria' ? 'block' : 'none';
    });

    detallePendiente.addEventListener('change', () => {
      bloqueCita.style.display = detallePendiente.value === 'seCita' ? 'block' : 'none';
    });

    motivoDeriva.addEventListener('change', () => {
      bloqueMotivoOtro.style.display = motivoDeriva.value === 'Otro' ? 'block' : 'none';
    });

    checkMonitorizacion.addEventListener('change', () => {
      bloqueMonitorizacion.style.display = checkMonitorizacion.checked ? 'block' : 'none';
    });

    // Generar resultado
    btn.addEventListener('click', () => {
      const gestion = tipoGestion.value;
      let texto = '';

      if (gestion === 'inicio') {
        const desc = descripcion.value.trim();
        const niv = niveles.value.trim();
        const pruebasTxt = pruebas.value.trim();
        const catvTxt = catv.value.trim();
        if (!desc || !pruebasTxt) {
          alert('⚠️ Debes completar descripción y pruebas realizadas.');
          return;
        }
        texto = `Inicio gestión incidencia Televisión. Descripción: ${desc}. Niveles/Equipos: ${niv || 'no indicado'}. `;
        if (catvTxt) texto += `CATV: ${catvTxt}. `;
        texto += `Pruebas realizadas: ${pruebasTxt}. `;
      }

      if (gestion === 'seguimiento') {
        const info = infoAdicional.value.trim();
        texto = info ? `Seguimiento incidencia Televisión. Información adicional: ${info}. ` : `Seguimiento incidencia Televisión. `;
      }

      if (gestion === 'derivada') {
        const desc = infoAdicionalDerivada.value.trim();
        const niv = nivelesDerivada.value.trim();
        const pruebasTxt = pruebasDerivada.value.trim();
        texto = `Derivada desde otro departamento. Información adicional: ${desc || 'sin detalles'}. Niveles/Equipos: ${niv || 'no indicado'}. Pruebas: ${pruebasTxt || 'no indicadas'}. `;
        const catvTxt = catvDerivada.value.trim();
        if (catvTxt) texto += `CATV: ${catvTxt}. `;
      }

      switch (resultado.value) {
        case 'si':
          texto += 'Se soluciona.';
          break;
        case 'pendiente':
          if (detallePendiente.value === 'seCita') {
            if (!horaCita.value) {
              alert('⚠️ Debes indicar la hora de la cita.');
              return;
            }
            const [yyyy, mm, dd] = fechaCita.value.split('-');
            texto += `Pendiente comprobación: se cita el ${dd}/${mm}/${yyyy} a las ${horaCita.value}.`;
          } else {
            texto += 'Pendiente comprobación: el cliente nos avisará cuando pueda.';
          }
          break;
        case 'noLocalizado':
          texto += whatsapp.checked ? 'No localizado, se envía WhatsApp.' : 'No localizado.';
          if (cierreNoLocalizado.checked) texto += ' Cierre incidencia, no localizado tras varios intentos.';
          break;
        case 'derivaTecnicos':
          const tel = telefonoDeriva.value.trim();
          if (!tel) {
            alert('⚠️ Debes indicar un teléfono de contacto.');
            return;
          }
          if (motivoDeriva.value === 'Otro' && !motivoOtro.value.trim()) {
            alert('⚠️ Debes especificar el motivo de derivación.');
            return;
          }
          texto += `Se deriva a técnicos. Motivo: ${motivoDeriva.value === 'Otro' ? motivoOtro.value : motivoDeriva.value}. TC: ${tel}.`;
          break;
        case 'derivaIngenieria':
          texto += 'Se deriva a ingeniería.';
          if (checkMonitorizacion.checked) {
            const seleccion = contenedor.querySelector('input[name="monitorizacion"]:checked');
            if (seleccion) {
              texto += ` Monitorización: ${seleccion.value === 'ok' ? 'se ve bien' : 'ocurre el mismo problema'}.`;
            }
          }
          break;
        case 'noProblema':
          texto += 'No tiene problemas con el servicio.';
          break;
      }

      pegarTexto(texto.trim());
    });
  }
});

/**************************************************************************
 * ☎️ FLUJO: INCIDENCIA SERVICIO (FIJO)
 **************************************************************************/

Flujos.registrar({
  id: 'incidenciaServicioFijo',
  nombre: '☎️ Incidencia servicio (Fijo)',
  tipos: ['fijo'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>☎️ Incidencia servicio (Fijo)</h3>

      <label><b>Gestión:</b></label><br>
      <select id="tipoGestion" style="width:100%;margin-bottom:10px;">
        <option value="inicio">Inicio gestión</option>
        <option value="seguimiento">Seguimiento</option>
        <option value="derivada">Derivada (otro departamento)</option>
      </select>

      <!-- BLOQUE INICIO GESTIÓN -->
      <div id="bloqueInicio">
        <label><b>Descripción:</b></label><br>
        <textarea id="descripcion" rows="3" style="width:100%;margin-bottom:10px;"></textarea>

        <label><b>Niveles / Equipos:</b></label><br>
        <textarea id="niveles" rows="2" style="width:100%;margin-bottom:10px;"></textarea>

        <label><b>Pruebas realizadas:</b></label><br>
        <textarea id="pruebas" rows="3" style="width:100%;margin-bottom:10px;"></textarea>
      </div>

      <!-- BLOQUE SEGUIMIENTO -->
      <div id="bloqueSeguimiento" style="display:none;">
        <label><b>Información adicional (opcional):</b></label><br>
        <textarea id="infoAdicional" rows="3" style="width:100%;margin-bottom:10px;"></textarea>
      </div>

      <!-- BLOQUE DERIVADA -->
      <div id="bloqueDerivada" style="display:none;">
        <label><b>Información adicional (opcional):</b></label><br>
        <textarea id="infoAdicionalDerivada" rows="3" style="width:100%;margin-bottom:10px;"></textarea>

        <label><b>Niveles / Equipos:</b></label><br>
        <textarea id="nivelesDerivada" rows="2" style="width:100%;margin-bottom:10px;"></textarea>

        <label><b>Pruebas realizadas:</b></label><br>
        <textarea id="pruebasDerivada" rows="3" style="width:100%;margin-bottom:10px;"></textarea>
      </div>

      <!-- RESULTADO -->
      <label><b>¿Se soluciona la incidencia?</b></label><br>
      <select id="resultado" style="width:100%;margin-bottom:10px;">
        <option value="si">Sí</option>
        <option value="pendiente">Pendiente comprobación</option>
        <option value="noLocalizado">No localizado</option>
        <option value="derivaTecnicos">Se deriva a técnicos</option>
        <option value="derivaIngenieria">Se deriva a ingeniería</option>
        <option value="noProblema">No tiene problemas con el servicio</option>
      </select>

      <!-- SUBBLOQUES -->
      <div id="bloquePendiente" style="display:none;margin-left:10px;">
        <label><b>Detalle:</b></label><br>
        <select id="detallePendiente" style="width:100%;margin-bottom:10px;">
          <option value="seCita">Se cita</option>
          <option value="avisara">Nos avisará cuando pueda</option>
        </select>

        <div id="bloqueCita" style="display:none;margin-left:10px;">
          <label>📅 Fecha de cita:</label>
          <input id="fechaCita" type="date" style="width:100%;margin-bottom:6px;">
          <label>🕒 Hora de cita:</label>
          <input id="horaCita" type="time" style="width:100%;margin-bottom:10px;">
        </div>
      </div>

      <div id="bloqueNoLocalizado" style="display:none;margin-left:10px;">
        <label><input type="checkbox" id="whatsapp"> Se envía WhatsApp</label><br>
        <div id="cierreIntentos" style="display:none;margin-top:4px;">
          <label><input type="checkbox" id="cierreNoLocalizado"> Cierre incidencia, no localizado tras varios intentos</label>
        </div>
      </div>

      <div id="bloqueDerivaTecnicos" style="display:none;margin-left:10px;">
        <label><b>Motivo de derivación:</b></label><br>
        <select id="motivoDeriva" style="width:100%;margin-bottom:8px;">
          <option value="Tras pruebas realizadas no se soluciona">Tras pruebas realizadas no se soluciona</option>
          <option value="Cliente no colabora">Cliente no colabora</option>
          <option value="Cliente no se aclara">Cliente no se aclara</option>
          <option value="Problema físico">Problema físico</option>
          <option value="Cliente exige visita técnica">Cliente exige visita técnica</option>
          <option value="Otro">Otro</option>
        </select>

        <div id="bloqueMotivoOtro" style="display:none;">
          <label><b>Especificar motivo:</b></label><br>
          <input id="motivoOtro" type="text" style="width:100%;margin-bottom:8px;">
        </div>

        <label><b>Teléfono de contacto:</b></label><br>
        <input id="telefonoDeriva" type="text" style="width:100%;margin-bottom:10px;" placeholder="Ej. 612345678">
      </div>

      <div id="bloqueIngenieria" style="display:none;margin-left:10px;">
        <label><input type="checkbox" id="checkMonitorizacion"> Se comprueba monitorización</label>
        <div id="bloqueMonitorizacion" style="display:none;margin-top:6px;margin-left:10px;">
          <label><input type="radio" name="monitorizacion" value="ok"> Se ve bien en monitorización</label><br>
          <label><input type="radio" name="monitorizacion" value="falla"> Ocurre el mismo problema en la monitorización</label>
        </div>
      </div>

      <button id="generarBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    // Referencias
    const tipoGestion = contenedor.querySelector('#tipoGestion');
    const bloqueInicio = contenedor.querySelector('#bloqueInicio');
    const bloqueSeguimiento = contenedor.querySelector('#bloqueSeguimiento');
    const bloqueDerivada = contenedor.querySelector('#bloqueDerivada');
    const descripcion = contenedor.querySelector('#descripcion');
    const niveles = contenedor.querySelector('#niveles');
    const pruebas = contenedor.querySelector('#pruebas');
    const infoAdicional = contenedor.querySelector('#infoAdicional');
    const infoAdicionalDerivada = contenedor.querySelector('#infoAdicionalDerivada');
    const nivelesDerivada = contenedor.querySelector('#nivelesDerivada');
    const pruebasDerivada = contenedor.querySelector('#pruebasDerivada');
    const resultado = contenedor.querySelector('#resultado');
    const detallePendiente = contenedor.querySelector('#detallePendiente');
    const bloquePendiente = contenedor.querySelector('#bloquePendiente');
    const bloqueCita = contenedor.querySelector('#bloqueCita');
    const fechaCita = contenedor.querySelector('#fechaCita');
    const horaCita = contenedor.querySelector('#horaCita');
    const bloqueNoLocalizado = contenedor.querySelector('#bloqueNoLocalizado');
    const whatsapp = contenedor.querySelector('#whatsapp');
    const cierreNoLocalizado = contenedor.querySelector('#cierreNoLocalizado');
    const bloqueDerivaTecnicos = contenedor.querySelector('#bloqueDerivaTecnicos');
    const motivoDeriva = contenedor.querySelector('#motivoDeriva');
    const bloqueMotivoOtro = contenedor.querySelector('#bloqueMotivoOtro');
    const motivoOtro = contenedor.querySelector('#motivoOtro');
    const telefonoDeriva = contenedor.querySelector('#telefonoDeriva');
    const bloqueIngenieria = contenedor.querySelector('#bloqueIngenieria');
    const checkMonitorizacion = contenedor.querySelector('#checkMonitorizacion');
    const bloqueMonitorizacion = contenedor.querySelector('#bloqueMonitorizacion');
    const btn = contenedor.querySelector('#generarBtn');

    const hoy = new Date();
    fechaCita.value = hoy.toISOString().split('T')[0];

    tipoGestion.addEventListener('change', () => {
      bloqueInicio.style.display = tipoGestion.value === 'inicio' ? 'block' : 'none';
      bloqueSeguimiento.style.display = tipoGestion.value === 'seguimiento' ? 'block' : 'none';
      bloqueDerivada.style.display = tipoGestion.value === 'derivada' ? 'block' : 'none';
    });

    resultado.addEventListener('change', () => {
      bloquePendiente.style.display = resultado.value === 'pendiente' ? 'block' : 'none';
      bloqueNoLocalizado.style.display = resultado.value === 'noLocalizado' ? 'block' : 'none';
      bloqueDerivaTecnicos.style.display = resultado.value === 'derivaTecnicos' ? 'block' : 'none';
      bloqueIngenieria.style.display = resultado.value === 'derivaIngenieria' ? 'block' : 'none';
    });

    detallePendiente.addEventListener('change', () => {
      bloqueCita.style.display = detallePendiente.value === 'seCita' ? 'block' : 'none';
    });

    motivoDeriva.addEventListener('change', () => {
      bloqueMotivoOtro.style.display = motivoDeriva.value === 'Otro' ? 'block' : 'none';
    });

    checkMonitorizacion.addEventListener('change', () => {
      bloqueMonitorizacion.style.display = checkMonitorizacion.checked ? 'block' : 'none';
    });

    btn.addEventListener('click', () => {
      const gestion = tipoGestion.value;
      let texto = '';

      if (gestion === 'inicio') {
        const desc = descripcion.value.trim();
        const niv = niveles.value.trim();
        const pru = pruebas.value.trim();
        if (!desc || !pru) {
          alert('⚠️ Debes completar descripción y pruebas realizadas.');
          return;
        }
        texto = `Inicio gestión incidencia Fijo. Descripción: ${desc}. Niveles/Equipos: ${niv || 'no indicado'}. Pruebas realizadas: ${pru}. `;
      }

      if (gestion === 'seguimiento') {
        const info = infoAdicional.value.trim();
        texto = info ? `Seguimiento incidencia Fijo. Información adicional: ${info}. ` : `Seguimiento incidencia Fijo. `;
      }

      if (gestion === 'derivada') {
        const desc = infoAdicionalDerivada.value.trim();
        const niv = nivelesDerivada.value.trim();
        const pru = pruebasDerivada.value.trim();
        texto = `Derivada desde otro departamento. Información adicional: ${desc || 'sin detalles'}. Niveles/Equipos: ${niv || 'no indicado'}. Pruebas: ${pru || 'no indicadas'}. `;
      }

      switch (resultado.value) {
        case 'si':
          texto += 'Se soluciona.';
          break;
        case 'pendiente':
          if (detallePendiente.value === 'seCita') {
            if (!horaCita.value) {
              alert('⚠️ Debes indicar la hora de la cita.');
              return;
            }
            const [yyyy, mm, dd] = fechaCita.value.split('-');
            texto += `Pendiente comprobación: se cita el ${dd}/${mm}/${yyyy} a las ${horaCita.value}.`;
          } else {
            texto += 'Pendiente comprobación: el cliente nos avisará cuando pueda.';
          }
          break;
        case 'noLocalizado':
          texto += whatsapp.checked ? 'No localizado, se envía WhatsApp.' : 'No localizado.';
          if (cierreNoLocalizado.checked) texto += ' Cierre incidencia, no localizado tras varios intentos.';
          break;
        case 'derivaTecnicos':
          const tel = telefonoDeriva.value.trim();
          if (!tel) {
            alert('⚠️ Debes indicar un teléfono de contacto.');
            return;
          }
          if (motivoDeriva.value === 'Otro' && !motivoOtro.value.trim()) {
            alert('⚠️ Debes especificar el motivo de derivación.');
            return;
          }
          texto += `Se deriva a técnicos. Motivo: ${motivoDeriva.value === 'Otro' ? motivoOtro.value : motivoDeriva.value}. TC: ${tel}.`;
          break;
        case 'derivaIngenieria':
          texto += 'Se deriva a ingeniería.';
          if (checkMonitorizacion.checked) {
            const seleccion = contenedor.querySelector('input[name="monitorizacion"]:checked');
            if (seleccion) {
              texto += ` Monitorización: ${seleccion.value === 'ok' ? 'se ve bien' : 'ocurre el mismo problema'}.`;
            }
          }
          break;
        case 'noProblema':
          texto += 'No tiene problemas con el servicio.';
          break;
      }

      pegarTexto(texto.trim());
    });
  }
});

/**************************************************************************
 * 📺 FLUJO: INCIDENCIA SERVICIO (ZAPI)
 **************************************************************************/

Flujos.registrar({
  id: 'incidenciaServicioZapi',
  nombre: '📺 Incidencia servicio (ZAPI)',
  tipos: ['zapi'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>📺 Incidencia servicio (ZAPI)</h3>

      <!-- Tipo de gestión -->
      <label><b>Gestión:</b></label><br>
      <select id="tipoGestion" style="width:100%;margin-bottom:10px;">
        <option value="inicio">Inicio gestión</option>
        <option value="seguimiento">Seguimiento</option>
        <option value="derivada">Derivada (otro departamento)</option>
      </select>

      <!-- BLOQUE INICIO -->
      <div id="bloqueInicio">
        <label><b>Tecnología afectada:</b></label><br>
        <label><input type="checkbox" class="tecnologia" value="STB"> STB</label><br>
        <label><input type="checkbox" class="tecnologia" value="Web"> Web</label><br>
        <label><input type="checkbox" class="tecnologia" value="App"> App</label><br><br>

        <label><b>Descripción:</b></label><br>
        <textarea id="descripcion" rows="3" style="width:100%;margin-bottom:10px;"></textarea>

        <label><b>Niveles / Equipos:</b></label><br>
        <textarea id="niveles" rows="2" style="width:100%;margin-bottom:10px;"></textarea>

        <label><b>Pruebas realizadas:</b></label><br>
        <textarea id="pruebas" rows="3" style="width:100%;margin-bottom:10px;"></textarea>
      </div>

      <!-- BLOQUE SEGUIMIENTO -->
      <div id="bloqueSeguimiento" style="display:none;">
        <label><b>Información adicional (opcional):</b></label><br>
        <textarea id="infoAdicional" rows="3" style="width:100%;margin-bottom:10px;"></textarea>
      </div>

      <!-- BLOQUE DERIVADA -->
      <div id="bloqueDerivada" style="display:none;">
        <label><b>Tecnología afectada:</b></label><br>
        <label><input type="checkbox" class="tecnologiaDerivada" value="STB"> STB</label><br>
        <label><input type="checkbox" class="tecnologiaDerivada" value="Web"> Web</label><br>
        <label><input type="checkbox" class="tecnologiaDerivada" value="App"> App</label><br><br>

        <label><b>Información adicional (opcional):</b></label><br>
        <textarea id="infoAdicionalDerivada" rows="3" style="width:100%;margin-bottom:10px;"></textarea>

        <label><b>Niveles / Equipos:</b></label><br>
        <textarea id="nivelesDerivada" rows="2" style="width:100%;margin-bottom:10px;"></textarea>

        <label><b>Pruebas realizadas:</b></label><br>
        <textarea id="pruebasDerivada" rows="3" style="width:100%;margin-bottom:10px;"></textarea>
      </div>

      <!-- RESULTADO -->
      <label><b>¿Se soluciona la incidencia?</b></label><br>
      <select id="resultado" style="width:100%;margin-bottom:10px;">
        <option value="si">Sí</option>
        <option value="pendiente">Pendiente comprobación</option>
        <option value="noLocalizado">No localizado</option>
        <option value="derivaTecnicos">Se deriva a técnicos</option>
        <option value="ticket">Se crea ticket</option>
        <option value="noProblema">No tiene problemas con el servicio</option>
      </select>

      <!-- SUBBLOQUES -->
      <div id="bloquePendiente" style="display:none;margin-left:10px;">
        <label><b>Detalle:</b></label><br>
        <select id="detallePendiente" style="width:100%;margin-bottom:10px;">
          <option value="seCita">Se cita</option>
          <option value="avisara">Nos avisará cuando pueda</option>
        </select>

        <div id="bloqueCita" style="display:none;margin-left:10px;">
          <label>📅 Fecha de cita:</label>
          <input id="fechaCita" type="date" style="width:100%;margin-bottom:6px;">
          <label>🕒 Hora de cita:</label>
          <input id="horaCita" type="time" style="width:100%;margin-bottom:10px;">
        </div>
      </div>

      <div id="bloqueNoLocalizado" style="display:none;margin-left:10px;">
        <label><input type="checkbox" id="whatsapp"> Se envía WhatsApp</label><br>
        <div id="cierreIntentos" style="display:none;margin-top:4px;">
          <label><input type="checkbox" id="cierreNoLocalizado"> Cierre incidencia, no localizado tras varios intentos</label>
        </div>
      </div>

      <div id="bloqueDerivaTecnicos" style="display:none;margin-left:10px;">
        <label><b>Motivo de derivación:</b></label><br>
        <select id="motivoDeriva" style="width:100%;margin-bottom:8px;">
          <option value="Tras pruebas realizadas no se soluciona">Tras pruebas realizadas no se soluciona</option>
          <option value="Cliente no colabora">Cliente no colabora</option>
          <option value="Cliente no se aclara">Cliente no se aclara</option>
          <option value="Problema físico">Problema físico</option>
          <option value="Cliente exige visita técnica">Cliente exige visita técnica</option>
          <option value="Otro">Otro</option>
        </select>

        <div id="bloqueMotivoOtro" style="display:none;">
          <label><b>Especificar motivo:</b></label><br>
          <input id="motivoOtro" type="text" style="width:100%;margin-bottom:8px;">
        </div>

        <label><b>Teléfono de contacto:</b></label><br>
        <input id="telefonoDeriva" type="text" style="width:100%;margin-bottom:10px;" placeholder="Ej. 612345678">
      </div>

      <div id="bloqueTicket" style="display:none;margin-left:10px;">
        <label><b>Número de ticket (4 dígitos):</b></label><br>
        <input id="numeroTicket" type="text" maxlength="4" style="width:100%;margin-bottom:10px;" placeholder="Ej. 1234">
      </div>

      <button id="generarBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    // Referencias
    const tipoGestion = contenedor.querySelector('#tipoGestion');
    const bloqueInicio = contenedor.querySelector('#bloqueInicio');
    const bloqueSeguimiento = contenedor.querySelector('#bloqueSeguimiento');
    const bloqueDerivada = contenedor.querySelector('#bloqueDerivada');
    const descripcion = contenedor.querySelector('#descripcion');
    const niveles = contenedor.querySelector('#niveles');
    const pruebas = contenedor.querySelector('#pruebas');
    const infoAdicional = contenedor.querySelector('#infoAdicional');
    const infoAdicionalDerivada = contenedor.querySelector('#infoAdicionalDerivada');
    const nivelesDerivada = contenedor.querySelector('#nivelesDerivada');
    const pruebasDerivada = contenedor.querySelector('#pruebasDerivada');
    const resultado = contenedor.querySelector('#resultado');
    const detallePendiente = contenedor.querySelector('#detallePendiente');
    const bloquePendiente = contenedor.querySelector('#bloquePendiente');
    const bloqueCita = contenedor.querySelector('#bloqueCita');
    const fechaCita = contenedor.querySelector('#fechaCita');
    const horaCita = contenedor.querySelector('#horaCita');
    const bloqueNoLocalizado = contenedor.querySelector('#bloqueNoLocalizado');
    const whatsapp = contenedor.querySelector('#whatsapp');
    const cierreNoLocalizado = contenedor.querySelector('#cierreNoLocalizado');
    const bloqueDerivaTecnicos = contenedor.querySelector('#bloqueDerivaTecnicos');
    const motivoDeriva = contenedor.querySelector('#motivoDeriva');
    const bloqueMotivoOtro = contenedor.querySelector('#bloqueMotivoOtro');
    const motivoOtro = contenedor.querySelector('#motivoOtro');
    const telefonoDeriva = contenedor.querySelector('#telefonoDeriva');
    const bloqueTicket = contenedor.querySelector('#bloqueTicket');
    const numeroTicket = contenedor.querySelector('#numeroTicket');
    const btn = contenedor.querySelector('#generarBtn');

    const hoy = new Date();
    fechaCita.value = hoy.toISOString().split('T')[0];

    tipoGestion.addEventListener('change', () => {
      bloqueInicio.style.display = tipoGestion.value === 'inicio' ? 'block' : 'none';
      bloqueSeguimiento.style.display = tipoGestion.value === 'seguimiento' ? 'block' : 'none';
      bloqueDerivada.style.display = tipoGestion.value === 'derivada' ? 'block' : 'none';
    });

    resultado.addEventListener('change', () => {
      bloquePendiente.style.display = resultado.value === 'pendiente' ? 'block' : 'none';
      bloqueNoLocalizado.style.display = resultado.value === 'noLocalizado' ? 'block' : 'none';
      bloqueDerivaTecnicos.style.display = resultado.value === 'derivaTecnicos' ? 'block' : 'none';
      bloqueTicket.style.display = resultado.value === 'ticket' ? 'block' : 'none';
    });

    detallePendiente.addEventListener('change', () => {
      bloqueCita.style.display = detallePendiente.value === 'seCita' ? 'block' : 'none';
    });

    motivoDeriva.addEventListener('change', () => {
      bloqueMotivoOtro.style.display = motivoDeriva.value === 'Otro' ? 'block' : 'none';
    });

    btn.addEventListener('click', () => {
      const gestion = tipoGestion.value;
      let texto = '';

      if (gestion === 'inicio') {
        const tecnologias = Array.from(contenedor.querySelectorAll('.tecnologia:checked'))
          .map(ch => ch.value)
          .join(', ') || 'no indicada';
        const desc = descripcion.value.trim();
        const niv = niveles.value.trim();
        const pru = pruebas.value.trim();
        if (!desc || !pru) {
          alert('⚠️ Debes completar descripción y pruebas realizadas.');
          return;
        }
        texto = `Inicio gestión incidencia ZAPI. Tecnología afectada: ${tecnologias}. Descripción: ${desc}. Niveles/Equipos: ${niv || 'no indicado'}. Pruebas realizadas: ${pru}. `;
      }

      if (gestion === 'seguimiento') {
        const info = infoAdicional.value.trim();
        texto = info ? `Seguimiento incidencia ZAPI. Información adicional: ${info}. ` : `Seguimiento incidencia ZAPI. `;
      }

      if (gestion === 'derivada') {
        const tecnologiasDer = Array.from(contenedor.querySelectorAll('.tecnologiaDerivada:checked'))
          .map(ch => ch.value)
          .join(', ') || 'no indicada';
        const desc = infoAdicionalDerivada.value.trim();
        const niv = nivelesDerivada.value.trim();
        const pru = pruebasDerivada.value.trim();
        texto = `Derivada desde otro departamento. Tecnología afectada: ${tecnologiasDer}. Información adicional: ${desc || 'sin detalles'}. Niveles/Equipos: ${niv || 'no indicado'}. Pruebas realizadas: ${pru || 'no indicadas'}. `;
      }

      switch (resultado.value) {
        case 'si':
          texto += 'Se soluciona.'; break;
        case 'pendiente':
          if (detallePendiente.value === 'seCita') {
            if (!horaCita.value) { alert('⚠️ Debes indicar la hora de la cita.'); return; }
            const [yyyy, mm, dd] = fechaCita.value.split('-');
            texto += `Pendiente comprobación: se cita el ${dd}/${mm}/${yyyy} a las ${horaCita.value}.`;
          } else texto += 'Pendiente comprobación: el cliente nos avisará cuando pueda.';
          break;
        case 'noLocalizado':
          texto += whatsapp.checked ? 'No localizado, se envía WhatsApp.' : 'No localizado.';
          if (cierreNoLocalizado.checked) texto += ' Cierre incidencia, no localizado tras varios intentos.';
          break;
        case 'derivaTecnicos':
          const tel = telefonoDeriva.value.trim();
          if (!tel) { alert('⚠️ Debes indicar un teléfono de contacto.'); return; }
          if (motivoDeriva.value === 'Otro' && !motivoOtro.value.trim()) {
            alert('⚠️ Debes especificar el motivo de derivación.'); return;
          }
          texto += `Se deriva a técnicos. Motivo: ${motivoDeriva.value === 'Otro' ? motivoOtro.value : motivoDeriva.value}. TC: ${tel}.`;
          break;
        case 'ticket':
          const ticket = numeroTicket.value.trim();
          if (!/^[0-9]{4}$/.test(ticket)) { alert('⚠️ El número de ticket debe tener 4 dígitos numéricos.'); return; }
          texto += `Se crea ticket ${ticket} para seguimiento.`; break;
        case 'noProblema':
          texto += 'No tiene problemas con el servicio.'; break;
      }

      pegarTexto(texto.trim());
    });
  }
});

/**************************************************************************
 * 🔑 FLUJO: GENERACIÓN CLAVES ZAPI
 **************************************************************************/

Flujos.registrar({
  id: 'zapiGeneracionClaves',
  nombre: '🔑 Generación claves',
  tipos: ['zapi'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>🔑 Generación de claves ZAPI</h3>
      <p>Este flujo genera automáticamente el texto correspondiente.</p>
      <button id="generarBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    contenedor.querySelector('#generarBtn').addEventListener('click', () => {
      pegarTexto('Se regeneran las credenciales de ZAPI.');
    });
  }
});

/**************************************************************************
 * 📦 FLUJO: ASIGNACIÓN STB (ZAPI)
 **************************************************************************/

Flujos.registrar({
  id: 'zapiAsignacionSTB',
  nombre: '📦 Asignación STB',
  tipos: ['zapi'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>📦 Asignación de STB (ZAPI)</h3>

      <label><b>Nº de serie:</b></label><br>
      <input id="numSerie" type="text" style="width:100%;margin-bottom:10px;" placeholder="Ej. ZAPI123456"><br>

      <label><b>Solicitado por:</b></label><br>
      <select id="solicitadoPor" style="width:100%;margin-bottom:10px;">
        <option value="">Selecciona...</option>
        <option value="Atención al cliente">Atención al cliente</option>
        <option value="Grabación de contratos">Grabación de contratos</option>
        <option value="Técnicos">Técnicos</option>
        <option value="Otros">Otros</option>
      </select>

      <div id="bloqueOtros" style="display:none;">
        <label><b>Especificar (obligatorio si se selecciona Otros):</b></label><br>
        <textarea id="otrosTexto" rows="3" style="width:100%;margin-bottom:10px;" placeholder="Indica quién solicita la asignación"></textarea>
      </div>

      <button id="generarBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    const numSerie = contenedor.querySelector('#numSerie');
    const solicitadoPor = contenedor.querySelector('#solicitadoPor');
    const bloqueOtros = contenedor.querySelector('#bloqueOtros');
    const otrosTexto = contenedor.querySelector('#otrosTexto');
    const btn = contenedor.querySelector('#generarBtn');

    // Mostrar/ocultar campo “Otros”
    solicitadoPor.addEventListener('change', () => {
      bloqueOtros.style.display = solicitadoPor.value === 'Otros' ? 'block' : 'none';
    });

    // Generar resultado
    btn.addEventListener('click', () => {
      if (!numSerie.value.trim()) {
        alert('⚠️ Debes indicar el número de serie.');
        return;
      }
      if (!solicitadoPor.value) {
        alert('⚠️ Debes seleccionar quién solicita la asignación.');
        return;
      }
      if (solicitadoPor.value === 'Otros' && !otrosTexto.value.trim()) {
        alert('⚠️ Debes especificar quién solicita la asignación.');
        return;
      }

      let texto = `Asignación de STB ZAPI. Nº de serie: ${numSerie.value.trim()}. Solicitado por: ${solicitadoPor.value}`;
      if (solicitadoPor.value === 'Otros') texto += ` (${otrosTexto.value.trim()})`;
      texto += '.';

      pegarTexto(texto);
    });
  }
});

/**************************************************************************
 * 🆕 FLUJO: ALTA SUSCRIPTOR (ZAPI)
 **************************************************************************/

Flujos.registrar({
  id: 'zapiAltaSuscriptor',
  nombre: '🆕 Alta suscriptor',
  tipos: ['zapi'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>🆕 Alta de suscriptor ZAPI</h3>

      <label><b>Solicitado por:</b></label><br>
      <select id="solicitadoPor" style="width:100%;margin-bottom:10px;">
        <option value="">Selecciona...</option>
        <option value="Atención al cliente">Atención al cliente</option>
        <option value="Grabación de contratos">Grabación de contratos</option>
        <option value="Técnicos">Técnicos</option>
        <option value="Otros">Otros</option>
      </select>

      <div id="bloqueOtros" style="display:none;">
        <label><b>Especificar (obligatorio si se selecciona Otros):</b></label><br>
        <textarea id="otrosTexto" rows="3" style="width:100%;margin-bottom:10px;" placeholder="Indica quién solicita el alta"></textarea>
      </div>

      <label><b>¿Se asigna STB?</b></label><br>
      <select id="asignaSTB" style="width:100%;margin-bottom:10px;">
        <option value="no" selected>No</option>
        <option value="si">Sí</option>
      </select>

      <div id="bloqueSTB" style="display:none;margin-left:10px;">
        <label><b>Nº de serie:</b></label><br>
        <input id="numSerie" type="text" style="width:100%;margin-bottom:10px;" placeholder="Ej. ZAPI123456">
      </div>

      <button id="generarBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    const solicitadoPor = contenedor.querySelector('#solicitadoPor');
    const bloqueOtros = contenedor.querySelector('#bloqueOtros');
    const otrosTexto = contenedor.querySelector('#otrosTexto');
    const asignaSTB = contenedor.querySelector('#asignaSTB');
    const bloqueSTB = contenedor.querySelector('#bloqueSTB');
    const numSerie = contenedor.querySelector('#numSerie');
    const btn = contenedor.querySelector('#generarBtn');

    // Mostrar/ocultar campo “Otros”
    solicitadoPor.addEventListener('change', () => {
      bloqueOtros.style.display = solicitadoPor.value === 'Otros' ? 'block' : 'none';
    });

    // Mostrar/ocultar campo STB
    asignaSTB.addEventListener('change', () => {
      bloqueSTB.style.display = asignaSTB.value === 'si' ? 'block' : 'none';
    });

    // Generar resultado
    btn.addEventListener('click', () => {
      if (!solicitadoPor.value) {
        alert('⚠️ Debes seleccionar quién solicita el alta.');
        return;
      }
      if (solicitadoPor.value === 'Otros' && !otrosTexto.value.trim()) {
        alert('⚠️ Debes especificar quién solicita el alta.');
        return;
      }

      let texto = `Alta de suscriptor ZAPI. Solicitado por: ${solicitadoPor.value}`;
      if (solicitadoPor.value === 'Otros') texto += ` (${otrosTexto.value.trim()})`;
      texto += '. ';

      if (asignaSTB.value === 'si') {
        if (!numSerie.value.trim()) {
          alert('⚠️ Debes indicar el número de serie del STB.');
          return;
        }
        texto += `Se asigna STB con Nº de serie: ${numSerie.value.trim()}.`;
      } else {
        texto += 'No se asigna STB.';
      }

      pegarTexto(texto.trim());
    });
  }
});

 /**************************************************************************
 * 🧭 FLUJO: INTERESADO BALIZA
 **************************************************************************/

Flujos.registrar({
  id: 'interesadoBaliza',
  nombre: '🧭 Interesado baliza',
  tipos: ['administrativo'],
  categorias: ['nueva'],
  render: (contenedor, pegarTexto) => {
    contenedor.innerHTML = `
      <h3>🧭 Interesado baliza</h3>

      <label><b>Número de balizas:</b></label><br>
      <input id="numeroBalizas" type="text" placeholder="Ej: 1, 2, 3..." style="width:100%;margin-bottom:10px;">

      <label><b>Teléfono de contacto:</b></label><br>
      <input id="telefonoBaliza" type="text" placeholder="Ej: 612345678" style="width:100%;margin-bottom:10px;">

      <button id="generarBalizaBtn" style="
        width:100%;
        background:#007bff;
        color:white;
        border:none;
        padding:8px;
        border-radius:6px;
        cursor:pointer;
      ">📝 Generar resultado</button>
    `;

    const numeroBalizas = contenedor.querySelector('#numeroBalizas');
    const telefono = contenedor.querySelector('#telefonoBaliza');
    const btn = contenedor.querySelector('#generarBalizaBtn');

    btn.addEventListener('click', () => {
      const num = numeroBalizas.value.trim();
      const tel = telefono.value.trim();

      if (!num) {
        alert('⚠️ Debes indicar el número de balizas.');
        return;
      }

      if (!tel) {
        alert('⚠️ Debes indicar un teléfono de contacto.');
        return;
      }

      // 🧾 Resultado en una sola línea
      let texto = `Interesado en ${num} baliza(s). TC: ${tel}.`;

      pegarTexto(texto.trim());

      // ✅ Autoasignación a "BALIZA DGT"
      try {
        const panel = document.querySelector('div[id*="multipleAsignaciones_panel"]');
        if (!panel) throw new Error('No se encontró el panel de asignaciones.');

        const labels = panel.querySelectorAll('label');
        let encontrado = false;

        labels.forEach(label => {
          if (label.textContent.trim().toUpperCase() === 'BALIZA DGT') {
            const forAttr = label.getAttribute('for');
            const input = document.getElementById(forAttr);
            if (input && !input.checked) {
              label.click();
              console.log('[Asistente RECALL] ✅ Asignación marcada: BALIZA DGT');
            }
            encontrado = true;
          }
        });

        if (!encontrado) {
          console.warn('[Asistente RECALL] ⚠️ No se encontró la asignación "BALIZA DGT" en el panel.');
        }
      } catch (e) {
        console.error('[Asistente RECALL] ❌ Error al marcar la asignación "BALIZA DGT":', e);
      }
    });
  }
});

// ============================================================
// FLUJO: Reconexión / Suspensión Fibraverde
// ============================================================

function fvFindSelectTipoTrabajo() {
  return [...document.querySelectorAll('select[id*="formIncidencia"]')]
    .find(s => [...s.options].some(o => o.value === '19' && o.text.trim() === 'RECONEXION'));
}

function fvFindSelectEstado() {
  return [...document.querySelectorAll('select[id*="formIncidencia"]')]
    .find(s => [...s.options].some(o => o.value === '22' && o.text.trim() === 'INTERMEDIO'));
}

function fvSetPFSelect(findFn, value) {
  const sel = findFn();
  if (!sel) { console.warn('[FV] Select no encontrado'); return; }
  sel.value = String(value);
  const opt = [...sel.options].find(o => o.value === String(value));
  const container = sel.closest('[class*="ui-selectonemenu"]');
  const lbl = container && container.querySelector('.ui-selectonemenu-label');
  if (lbl && opt) lbl.textContent = opt.text;
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  try { window.jQuery && jQuery(sel).trigger('change'); } catch (_) {}
}

function fvSetAsignacion(value) {
  const cb = document.querySelector(`input[name*="multipleAsignaciones"][value="${value}"]`);
  if (!cb) { console.warn('[FV] Checkbox asignación no encontrado:', value); return; }
  if (cb.checked) return;
  cb.checked = true;
  cb.dispatchEvent(new Event('change', { bubbles: true }));
  try { window.jQuery && jQuery(cb).trigger('change'); } catch (_) {}
  const container = cb.closest('[class*="ui-selectcheckboxmenu"]');
  const labelEl = container && container.querySelector('.ui-selectcheckboxmenu-multiple-container');
  if (labelEl) {
    const labelFor = document.querySelector(`label[for="${cb.id}"]`);
    const txt = labelFor ? labelFor.textContent.trim() : value;
    if (![...labelEl.querySelectorAll('li')].some(li => li.textContent.trim() === txt)) {
      const li = document.createElement('li');
      li.className = 'ui-selectcheckboxmenu-token ui-state-active ui-corner-all';
      li.innerHTML = `<span class="ui-selectcheckboxmenu-token-label">${txt}</span>`;
      labelEl.appendChild(li);
    }
  }
}

function fvSetFecha(ddmmyyyy) {
  const campo = document.querySelector('form[id*="formIncidencia"] input.hasDatepicker');
  if (!campo) { console.warn('[FV] Campo fecha no encontrado'); return; }
  campo.value = ddmmyyyy;
  ['input', 'change', 'blur'].forEach(ev => campo.dispatchEvent(new Event(ev, { bubbles: true })));
  try { window.jQuery && jQuery(campo).datepicker('setDate', ddmmyyyy); } catch (_) {}
}

function fvObtenerCodCliente() {
  const link = document.querySelector('a[id*="textCliente"]');
  const m = link && (link.getAttribute('href') || '').match(/[?&]id=(\d+)/);
  return m ? m[1] : null;
}

function fvFmtFecha(isoVal) {
  if (!isoVal) return '';
  const [y, m, d] = isoVal.split('-');
  return `${d}/${m}/${y}`;
}

function fvIsoADate(isoVal) {
  if (!isoVal) return null;
  const [y, m, d] = isoVal.split('-');
  return new Date(y, m - 1, d);
}

function fvAplicarCampos({ tipoTrabajo, estado, fecha }) {
  fvSetPFSelect(fvFindSelectTipoTrabajo, tipoTrabajo);
  fvSetPFSelect(fvFindSelectEstado, estado);
  fvSetAsignacion('230'); // BAJAS FIBRAVERDE
  if (fecha) fvSetFecha(fecha);
}

function fvAbrirPestana(url) {
  if (typeof GM_openInTab === 'function') {
    GM_openInTab(url, false);
  } else {
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
}

// ── Construcción del correo ───────────────────────────────────

function fvBuildEmail({ cod, canal, dato, hr, hs, mr, ms, frFmt, fsFmt, frRaw, fsRaw }) {
  const esOnlycable = canal === 'onlycable';
  const CANAL_LABEL = { correo: 'correo', whatsapp: 'WhatsApp', llamada: 'llamada' };

  // Asunto
  let asuntoParte = '';
  if (hr && hs)       asuntoParte = 'RECONEXION + SUSPENSION';
  else if (hr)        asuntoParte = 'RECONEXION';
  else                asuntoParte = 'SUSPENSION';
  const asunto = `${cod} - ${asuntoParte} FIBRAVERDE`;

  // Cabecera del cuerpo
  const cl  = !esOnlycable ? CANAL_LABEL[canal] : null;
  const ct  = !esOnlycable ? ` (${dato})` : '';
  const pfx = esOnlycable
    ? 'Entra correo interno con solicitud'
    : `Cliente solicita por ${cl}${ct}`;

  // ── Una sola acción → párrafo simple ──
  if (!hr || !hs) {
    const esInmediata = hr ? mr === 'inmediata' : ms === 'inmediata';
    const accionTxt   = hr ? 'reconexión' : 'suspensión';
    const fechaTxt    = hr ? frFmt : fsFmt;
    let linea = '';
    if (esOnlycable) {
      linea = esInmediata
        ? `${pfx} de ${accionTxt}. ${hr ? 'Reconexión' : 'Suspensión'} realizada.`
        : `${pfx} de ${accionTxt} para el día ${fechaTxt}. Creada incidencia.`;
    } else {
      linea = esInmediata
        ? `${pfx} ${accionTxt} inmediata del servicio de fibraverde. ${hr ? 'Reconexión' : 'Suspensión'} realizada.`
        : `${pfx} ${accionTxt} del servicio de fibraverde para el día ${fechaTxt}. Creada incidencia.`;
    }
    const cuerpo = `Buenas,\n\n${linea}\n\nUn saludo.`;
    return { asunto, cuerpo };
  }

  // ── Dos acciones → bullets ordenados ──
  // Determinar orden: inmediata primero; si ambas programadas, fecha más próxima primero
  let primera, segunda;

  if (mr === 'inmediata' && ms !== 'inmediata') {
    primera = 'r'; segunda = 's';
  } else if (ms === 'inmediata' && mr !== 'inmediata') {
    primera = 's'; segunda = 'r';
  } else if (mr === 'inmediata' && ms === 'inmediata') {
    primera = 'r'; segunda = 's'; // ambas inmediatas: reconexión primero
  } else {
    // ambas programadas: fecha más próxima primero
    const dr = fvIsoADate(frRaw), ds = fvIsoADate(fsRaw);
    primera = (dr <= ds) ? 'r' : 's';
    segunda = primera === 'r' ? 's' : 'r';
  }

  function bulletTexto(accion) {
    const esR       = accion === 'r';
    const modo      = esR ? mr : ms;
    const fecha     = esR ? frFmt : fsFmt;
    const nombre    = esR ? 'Reconexión' : 'Suspensión';
    const gestionada = esR ? 'Gestionada reconexión.' : 'Gestionada suspensión.';
    if (modo === 'inmediata') {
      return `* ${nombre}: inmediata. ${gestionada}`;
    } else {
      return `* ${nombre}: para el día ${fecha}. Creada incidencia.`;
    }
  }

  const cabecera = esOnlycable
    ? `${pfx}:`
    : `${pfx}:`;

  const cuerpo = `Buenas,\n\n${cabecera}\n\n${bulletTexto(primera)}\n${bulletTexto(segunda)}\n\nUn saludo.`;
  return { asunto, cuerpo };
}

function fvAbrirCorreo({ asunto, cuerpo }) {
  const a = encodeURIComponent(asunto);
  const c = encodeURIComponent(cuerpo);
  location.href = `mailto:grabaciondecontratos@onlycable.es,atencionalcliente@telecartagena.es?subject=${a}&body=${c}`;
}

// ── Prefill automático para la segunda pestaña ────────────────

(function fvInitPrefill() {
  const params = new URLSearchParams(location.search);
  const key = params.get('recall_fv');
  if (!key) return;
  const raw = localStorage.getItem(key);
  if (!raw) return;
  let datos;
  try { datos = JSON.parse(raw); } catch (_) { return; }
  localStorage.removeItem(key);

  function escribirDesc(texto) {
    const campo =
      document.querySelector('form[id*="formIncidencia"] textarea') ||
      document.querySelector('textarea[role="textbox"]');
    if (!campo) return;
    const agente = window.crmAgente || 'MusinT.';
    const ahora  = new Date();
    const f = ahora.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const h = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    campo.value = `**${agente} ${f} ${h} - ${texto}`;
    ['input', 'change'].forEach(ev => campo.dispatchEvent(new Event(ev, { bubbles: true })));
  }

  function intentar(n = 0) {
    if (n > 30) return;
    if (!document.querySelector('form[id*="formIncidencia"]')) {
      setTimeout(() => intentar(n + 1), 500); return;
    }
    setTimeout(() => {
      fvAplicarCampos(datos);
      escribirDesc(datos.descripcion);
    }, 800);
  }
  intentar();
})();

// ── Registro del flujo ────────────────────────────────────────

Flujos.registrar({
  id: 'reconexionSuspensionFV',
  nombre: 'Reconexión / Suspensión FV',
  tipos: ['administrativo'],
  categorias: ['administrativo'],

  render(contenedor, pegarTexto) {

    const CANAL_LABEL = {
      correo:   'correo',
      whatsapp: 'WhatsApp',
      llamada:  'llamada'
    };

    const SB  = 'border:1px solid #ccc;border-radius:4px;background:#fff;padding:5px 8px;cursor:pointer;font-size:12px;';
    const SBO = 'border:1px solid #007bff;border-radius:4px;background:#e8f0fe;color:#007bff;font-weight:bold;padding:5px 8px;cursor:pointer;font-size:12px;';
    const SBL = 'background:#f8f9fa;border-left:3px solid #007bff;padding:6px 8px;margin-top:5px;border-radius:0 4px 4px 0;';
    const RW  = 'display:block;cursor:pointer;margin-bottom:4px;';

    contenedor.innerHTML = `
      <div style="font-size:12px;padding:4px 2px;">

        <div style="font-weight:bold;margin-bottom:5px;color:#444;">📡 Canal de entrada</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;">
          <button class="fv-c" data-c="onlycable" style="${SB}">Correo Onlycable</button>
          <button class="fv-c" data-c="correo"    style="${SB}">Correo cliente</button>
          <button class="fv-c" data-c="whatsapp"  style="${SB}">WhatsApp cliente</button>
          <button class="fv-c" data-c="llamada"   style="${SB}" title="No recomendado">📵 Llamada cliente</button>
        </div>
        <div id="fv-av-llamada" style="display:none;color:#c0392b;font-size:11px;margin-bottom:5px;">
          ⚠️ Canal no recomendado
        </div>
        <div id="fv-dato-wrap" style="display:none;margin-bottom:8px;">
          <input id="fv-dato" type="text" placeholder="..."
            style="width:95%;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:12px;">
        </div>

        <div id="fv-acc" style="display:none;">
          <div style="font-weight:bold;margin-bottom:5px;color:#444;">⚙️ Acciones</div>

          <!-- Reconexión -->
          <div style="margin-bottom:7px;">
            <label style="cursor:pointer;font-weight:bold;">
              <input type="checkbox" id="fv-chk-r"> Reconexión
            </label>
            <div id="fv-bl-r" style="display:none;${SBL}">
              <label style="${RW}"><input type="radio" name="fv-mr" value="inmediata"> Inmediata</label>
              <label style="${RW}"><input type="radio" name="fv-mr" value="programada"> Programada</label>
              <div id="fv-fr-w" style="display:none;margin-top:4px;">
                <input type="date" id="fv-fr"
                  style="padding:3px;border:1px solid #ccc;border-radius:4px;font-size:12px;">
              </div>
            </div>
          </div>

          <!-- Suspensión -->
          <div style="margin-bottom:10px;">
            <label style="cursor:pointer;font-weight:bold;">
              <input type="checkbox" id="fv-chk-s"> Suspensión
            </label>
            <div id="fv-bl-s" style="display:none;${SBL}">
              <label style="${RW}"><input type="radio" name="fv-ms" value="inmediata"> Inmediata</label>
              <label style="${RW}"><input type="radio" name="fv-ms" value="programada"> Programada</label>
              <div id="fv-fs-w" style="display:none;margin-top:4px;">
                <input type="date" id="fv-fs"
                  style="padding:3px;border:1px solid #ccc;border-radius:4px;font-size:12px;">
              </div>
            </div>
          </div>

          <button id="fv-gen" style="
            width:100%;padding:7px;background:#007bff;color:#fff;border:none;
            border-radius:5px;font-weight:bold;cursor:pointer;font-size:12px;
            transition:background 0.2s;">
            ⚡ Generar
          </button>

        </div>
      </div>
    `;

    const q = id => contenedor.querySelector('#' + id);
    let canal = null;

    const getModo = name =>
      (contenedor.querySelector(`input[name="${name}"]:checked`) || {}).value || null;

    // ── Descripción incidencia ────────────────────────────────

    function buildDesc({ hr, hs, mr, ms, frFmt, fsFmt, dato }) {
      const esOnlycable = canal === 'onlycable';
      const cl  = !esOnlycable ? CANAL_LABEL[canal] : null;
      const ct  = !esOnlycable ? ` (${dato})` : '';
      const pfx = esOnlycable
        ? 'Entra correo interno con solicitud de'
        : `Cliente solicita por ${cl}${ct}`;

      if (hr && !hs) {
        return mr === 'inmediata'
          ? (esOnlycable
              ? `${pfx} reconexión. Reconexión realizada.`
              : `${pfx} reconexión inmediata del servicio de fibraverde. Reconexión realizada.`)
          : (esOnlycable
              ? `${pfx} reconexión para el día ${frFmt}.`
              : `${pfx} reconexión del servicio de fibraverde para el día ${frFmt}.`);
      }

      if (!hr && hs) {
        return ms === 'inmediata'
          ? (esOnlycable
              ? `${pfx} suspensión. Suspensión realizada.`
              : `${pfx} suspensión inmediata del servicio de fibraverde. Suspensión realizada.`)
          : (esOnlycable
              ? `${pfx} suspensión para el día ${fsFmt}.`
              : `${pfx} suspensión del servicio de fibraverde para el día ${fsFmt}.`);
      }

      // Ambas
      if (mr === 'inmediata' && ms === 'inmediata') {
        return esOnlycable
          ? `${pfx} reconexión y suspensión inmediatas. Reconexión y suspensión realizadas.`
          : `${pfx} reconexión y suspensión inmediatas del servicio de fibraverde. Reconexión y suspensión realizadas.`;
      }
      if (mr === 'inmediata' && ms === 'programada') {
        return esOnlycable
          ? `${pfx} reconexión inmediata y suspensión para el día ${fsFmt}. Reconexión realizada.`
          : `${pfx} reconexión inmediata y suspensión para el día ${fsFmt} del servicio de fibraverde. Reconexión realizada.`;
      }
      if (mr === 'programada' && ms === 'inmediata') {
        return esOnlycable
          ? `${pfx} suspensión inmediata y reconexión para el día ${frFmt}. Suspensión realizada.`
          : `${pfx} suspensión inmediata y reconexión para el día ${frFmt} del servicio de fibraverde. Suspensión realizada.`;
      }
      return ''; // ambas programadas — no usa esta función
    }

    function buildDescSimple(accion, fecha, dato) {
      const esOnlycable = canal === 'onlycable';
      const cl  = !esOnlycable ? CANAL_LABEL[canal] : null;
      const ct  = !esOnlycable ? ` (${dato})` : '';
      const pfx = esOnlycable
        ? 'Entra correo interno con solicitud de'
        : `Cliente solicita por ${cl}${ct}`;
      const accionTxt = accion === 'r' ? 'reconexión' : 'suspensión';
      return esOnlycable
        ? `${pfx} ${accionTxt} para el día ${fecha}.`
        : `${pfx} ${accionTxt} del servicio de fibraverde para el día ${fecha}.`;
    }

    function feedbackGen() {
      const b = q('fv-gen');
      b.style.background = '#28a745';
      b.textContent = '✅ Generado';
      setTimeout(() => { b.style.background = '#007bff'; b.textContent = '⚡ Generar'; }, 1500);
    }

    // ── Canal ─────────────────────────────────────────────────
    contenedor.querySelectorAll('.fv-c').forEach(btn => btn.addEventListener('click', () => {
      contenedor.querySelectorAll('.fv-c').forEach(b => b.style.cssText = SB);
      btn.style.cssText = SBO;
      canal = btn.dataset.c;
      q('fv-av-llamada').style.display = canal === 'llamada' ? 'block' : 'none';
      const nd = canal !== 'onlycable';
      q('fv-dato-wrap').style.display = nd ? 'block' : 'none';
      if (!nd) q('fv-dato').value = '';
      const inp = q('fv-dato');
      inp.type = canal === 'correo' ? 'email' : 'tel';
      inp.placeholder = canal === 'correo' ? 'correo@ejemplo.com' : 'Número de teléfono';
      q('fv-acc').style.display = 'block';
    }));

    // ── Checkboxes ────────────────────────────────────────────
    q('fv-chk-r').addEventListener('change', e => {
      q('fv-bl-r').style.display = e.target.checked ? 'block' : 'none';
      if (!e.target.checked) {
        contenedor.querySelectorAll('[name="fv-mr"]').forEach(r => r.checked = false);
        q('fv-fr-w').style.display = 'none';
      }
    });
    q('fv-chk-s').addEventListener('change', e => {
      q('fv-bl-s').style.display = e.target.checked ? 'block' : 'none';
      if (!e.target.checked) {
        contenedor.querySelectorAll('[name="fv-ms"]').forEach(r => r.checked = false);
        q('fv-fs-w').style.display = 'none';
      }
    });

    // ── Radios fecha ──────────────────────────────────────────
    contenedor.querySelectorAll('[name="fv-mr"]').forEach(r =>
      r.addEventListener('change', () =>
        q('fv-fr-w').style.display = r.value === 'programada' && r.checked ? 'block' : 'none'));
    contenedor.querySelectorAll('[name="fv-ms"]').forEach(r =>
      r.addEventListener('change', () =>
        q('fv-fs-w').style.display = r.value === 'programada' && r.checked ? 'block' : 'none'));

    // ── Botón generar ─────────────────────────────────────────
    q('fv-gen').addEventListener('click', () => {

      if (!canal) return alert('Selecciona el canal de entrada.');
      const dato = q('fv-dato').value.trim();
      if (canal !== 'onlycable' && !dato) return alert('Introduce el dato de contacto del cliente.');
      const hr = q('fv-chk-r').checked, hs = q('fv-chk-s').checked;
      if (!hr && !hs) return alert('Selecciona al menos una acción.');
      const mr = hr ? getModo('fv-mr') : null;
      const ms = hs ? getModo('fv-ms') : null;
      if (hr && !mr) return alert('Indica si la reconexión es inmediata o programada.');
      if (hs && !ms) return alert('Indica si la suspensión es inmediata o programada.');
      const frRaw = mr === 'programada' ? q('fv-fr').value : null;
      const fsRaw = ms === 'programada' ? q('fv-fs').value : null;
      if (mr === 'programada' && !frRaw) return alert('Selecciona la fecha de reconexión.');
      if (ms === 'programada' && !fsRaw) return alert('Selecciona la fecha de suspensión.');

      const frFmt = fvFmtFecha(frRaw);
      const fsFmt = fvFmtFecha(fsRaw);
      const esCliente = canal !== 'onlycable';
      const cod = fvObtenerCodCliente();
      const emailParams = { cod, canal, dato, hr, hs, mr, ms, frFmt, fsFmt, frRaw, fsRaw };

      // ── CASO A: 2 programadas → 2 incidencias ─────────────
      if (hr && hs && mr === 'programada' && ms === 'programada') {
        const dr = buildDescSimple('r', frFmt, dato);
        const ds = buildDescSimple('s', fsFmt, dato);

        fvAplicarCampos({ tipoTrabajo: 19, estado: 1, fecha: frFmt });
        pegarTexto(dr);
        feedbackGen();

        if (cod) {
          const key = `recall_fv_${Date.now()}`;
          localStorage.setItem(key, JSON.stringify({
            tipoTrabajo: 32, estado: 1, fecha: fsFmt, descripcion: ds
          }));
          const url = `${location.origin}/gosbilling/user/incidencias/ma-incidencias.xhtml?cod_cliente=${cod}&recall_fv=${key}`;
          setTimeout(() => fvAbrirPestana(url), 600);
        } else {
          console.warn('[FV] No se pudo obtener código de cliente para segunda pestaña.');
        }

        if (esCliente && cod) {
          const email = fvBuildEmail(emailParams);
          setTimeout(() => fvAbrirCorreo(email), 900);
        }
        return;
      } // ── fin CASO A ──

      // ── CASO B: 1 incidencia ──────────────────────────────
      const desc   = buildDesc({ hr, hs, mr, ms, frFmt, fsFmt, dato });
      const tipo   = mr === 'programada' ? 19 : (ms === 'programada' ? 32 : 19);
      const estado = (mr === 'programada' || ms === 'programada') ? 1 : 2;
      const fecha  = mr === 'programada' ? frFmt : (ms === 'programada' ? fsFmt : null);

      fvAplicarCampos({ tipoTrabajo: tipo, estado, fecha });
      pegarTexto(desc);
      feedbackGen();

      if (esCliente && cod) {
        const email = fvBuildEmail(emailParams);
        setTimeout(() => fvAbrirCorreo(email), 400);
      }

    }); // ── fin fv-gen listener

  } // ── fin render
}); // ── fin Flujos.registrar
  
/**************************************************************************
FORZAR RENDERIZADO
**************************************************************************/
 setTimeout(() => {
  try {
    if (window.Flujos && typeof window.Flujos.renderMenu === 'function') {
      // Intentamos usar el tipo actual de abonado detectado
      const tipo = window.tipoAbonadoActual || 'administrativo';
      window.Flujos.renderMenu(tipo);
      console.log('[Asistente RECALL] 🔁 Render forzado de menú inicial.');
    } else {
      console.warn('[Asistente RECALL] No se pudo forzar el render inicial (Flujos no disponible).');
    }
  } catch (err) {
    console.error('[Asistente RECALL] Error al forzar render inicial:', err);
  }
}, 400);


})();
