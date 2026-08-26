// ==UserScript==
// @name         Alertas incidencias Gossan
// @namespace    gosbilling.crm
// @version      3.0
// @description  Se usará para añadir aquí todas las alertas que tengan que ver con la pagina de incidencias
// @match        https://gossan.onlycable.es:8083/gosbilling/user/incidencias/ma-incidencias.xhtml*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    console.log("[ATC ALERT] Script iniciado.");

    // ======================================================
    // 🧭 1) Obtener las ASIGNACIONES (buscar "INC. AT CLIENTE")
    // ======================================================
    function obtenerAsignaciones() {
        try {
            const celdaAsign = [...document.querySelectorAll("td")]
                .find(td => td.textContent.trim() === "A quien se la asigna");

            if (!celdaAsign) {
                console.warn("[ATC ALERT] No se encontró sección de asignaciones.");
                return [];
            }

            const celdaValor = celdaAsign.nextElementSibling;
            if (!celdaValor) return [];

            const tokens = [...celdaValor.querySelectorAll(".ui-selectcheckboxmenu-token-label")];
            const asignaciones = tokens.map(t => t.textContent.trim());

            console.log("[ATC ALERT] Asignaciones detectadas:", asignaciones);
            return asignaciones;

        } catch (e) {
            console.error("[ATC ALERT] Error obteniendo asignaciones:", e);
            return [];
        }
    }

    // ======================================================
    // 📅 2) Obtener FECHA DE CITA (buscar en la sección "Cita")
    // ======================================================
    function obtenerFechaCita() {
        try {
            const celdaCita = [...document.querySelectorAll("td")]
                .find(td => td.textContent.trim() === "Cita");

            if (!celdaCita) return null;

            const celdaValor = celdaCita.nextElementSibling;
            if (!celdaValor) return null;

            const inputs = [...celdaValor.querySelectorAll("input[type='text']")];
            const regexFecha = /^\d{2}\/\d{2}\/\d{4}$/;

            const fecha = inputs
                .map(i => i.value.trim())
                .find(v => regexFecha.test(v));

            console.log("[ATC ALERT] Fecha cita detectada:", fecha);
            return fecha || null;

        } catch (e) {
            console.error("[ATC ALERT] Error obteniendo fecha cita:", e);
            return null;
        }
    }

    // ======================================================
    // 📆 2b) Comprobar si la fecha de cita es futura (estrictamente posterior a hoy)
    // ======================================================
    function esFechaFutura(fechaStr) {
        if (!fechaStr) return false;

        try {
            const [dia, mes, anio] = fechaStr.split("/").map(Number);
            const fechaCita = new Date(anio, mes - 1, dia);

            // Validar que la fecha parseada sea real (evita 99/99/9999, 31/02/2026, etc.)
            const esValida =
                fechaCita.getFullYear() === anio &&
                fechaCita.getMonth() === mes - 1 &&
                fechaCita.getDate() === dia;

            if (!esValida) {
                console.warn("[ATC ALERT] Fecha con formato correcto pero valor inválido:", fechaStr);
                return false;
            }

            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            fechaCita.setHours(0, 0, 0, 0);

            const esFutura = fechaCita.getTime() > hoy.getTime();
            console.log("[ATC ALERT] ¿Fecha cita es futura?:", esFutura, "(hoy no cuenta)");
            return esFutura;

        } catch (e) {
            console.error("[ATC ALERT] Error evaluando si la fecha es futura:", e);
            return false;
        }
    }

    // ======================================================
    // 🪧 3) Mostrar BANNER de alerta centrado
    // ======================================================
    function mostrarBannerATC() {
        try {
            if (document.getElementById("banner-atc-alerta")) return; // evitar duplicados

            const div = document.createElement("div");
            div.id = "banner-atc-alerta";

            div.innerHTML = `
                <div style="
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 600px;
                    background: #fff0f0;
                    border: 3px solid #cc0000;
                    border-radius: 12px;
                    padding: 25px;
                    text-align: center;
                    font-family: sans-serif;
                    font-size: 16px;
                    line-height: 1.4;
                    color: #660000;
                    z-index: 9999999;
                    box-shadow: 0 0 20px rgba(0,0,0,0.3);
                ">
                    <div style="font-weight:bold; font-size: 20px; margin-bottom: 15px;">
                        ⚠ INCIDENCIA CITADA POR ATC ⚠
                    </div>
                    <div style="margin-bottom: 20px;">
                        Esta incidencia está <b>asignada en INC. AT CLIENTE</b> y tiene una <b>cita programada</b>.<br><br>
                        <b>No debe tocarse</b>.
                        De lo contrario, fallará el sistema de recordatorios programado para ATC.
                    </div>
                    <button id="cerrar-banner-atc"
                        style="
                            padding: 10px 20px;
                            background-color: #cc0000;
                            color: white;
                            font-weight: bold;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 14px;
                        ">
                        Cerrar
                    </button>
                </div>
            `;

            document.body.appendChild(div);

            document.getElementById("cerrar-banner-atc")
                .addEventListener("click", () => div.remove());

            console.warn("[ATC ALERT] Banner ATC mostrado.");

        } catch (e) {
            console.error("[ATC ALERT] Error mostrando banner ATC:", e);
        }
    }

    // ======================================================
    // 🔍 4) Lógica principal – comprobar condiciones
    // ======================================================
    const asignaciones = obtenerAsignaciones();
    const fechaCita = obtenerFechaCita();

    const tieneAsignacionATC = asignaciones.includes("INC. AT CLIENTE");
    const tieneFechaCita = esFechaFutura(fechaCita); // ahora exige fecha futura (hoy no cuenta)

    console.log("[ATC ALERT] ¿Asignado a ATC?:", tieneAsignacionATC);
    console.log("[ATC ALERT] ¿Tiene fecha cita futura?:", tieneFechaCita);

    if (tieneAsignacionATC && tieneFechaCita) {
        mostrarBannerATC();
    }

})();
