// ==UserScript==
// @name         Wasapi - Copiar número limpio (dinámico)
// @namespace    http://tu-empresa.local
// @version      1.1
// @description  Añade botón "Copiar" que siempre toma el número actual del enlace tel:
// @match        https://app.wasapi.io/chat*
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
  'use strict';

  // Normaliza a 9 dígitos españoles (quita +34, espacios, etc.)
  function limpiarNumero(str) {
    if (!str) return "";
    let digits = String(str).replace(/\D+/g, "");
    if (digits.startsWith("34") && digits.length > 9) digits = digits.slice(2);
    return digits;
  }

  // Dado un <a href="tel:..."> devuelve el número limpio
  function numeroDesdeAnchor(a) {
    if (!a) return "";
    // Prioriza href (más fiable), cae a textContent si hiciera falta
    const href = a.getAttribute("href") || "";
    const fromHref = href.startsWith("tel:") ? href.slice(4) : "";
    return limpiarNumero(fromHref || a.textContent || "");
  }

  function crearBoton() {
    const btn = document.createElement("button");
    btn.className = "copy-tel-btn";
    btn.type = "button";
    btn.textContent = "📋 Copiar";
    Object.assign(btn.style, {
      display: "block",
      marginTop: "4px",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "6px",
      border: "1px solid #ccc",
      cursor: "pointer",
      background: "#f5f5f5"
    });
    return btn;
  }

  function addButtons() {
    document.querySelectorAll('a[href^="tel:"]').forEach(a => {
      // Evita duplicados: si ya hay un botón de copiar justo después, no crees otro
      const next = a.nextElementSibling;
      if (next && next.classList && next.classList.contains("copy-tel-btn")) return;

      // Inserta botón justo debajo del <a>
      a.insertAdjacentElement("afterend", crearBoton());
    });
  }

  // Delegación: calculamos el número AL HACER CLICK, leyendo el anchor actual
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".copy-tel-btn");
    if (!btn) return;

    // El anchor suele estar justo antes del botón
    let a = btn.previousElementSibling;
    if (!(a && a.matches && a.matches('a[href^="tel:"]'))) {
      // Fallback: busca el <a> más cercano en el mismo contenedor
      a = btn.parentElement?.querySelector?.('a[href^="tel:"]') || null;
    }

    const limpio = numeroDesdeAnchor(a);
    if (!limpio) {
      alert("No se pudo obtener el número.");
      return;
    }

    try {
      if (typeof GM_setClipboard !== "undefined") {
        GM_setClipboard(limpio);
      } else if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(limpio);
      } else {
        // Fallback muy básico
        const ta = document.createElement("textarea");
        ta.value = limpio;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      const old = btn.textContent;
      btn.textContent = "✅ Copiado";
      setTimeout(() => { btn.textContent = old; }, 1500);
    } catch {
      alert("No se pudo copiar al portapapeles.");
    }
  });

  // Corre al inicio y reintenta cuando cambie el DOM (SPA)
  addButtons();
  const obs = new MutationObserver(() => addButtons());
  obs.observe(document.body, { childList: true, subtree: true });
})();
