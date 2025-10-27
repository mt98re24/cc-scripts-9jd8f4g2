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
