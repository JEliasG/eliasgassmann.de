/**
 * Anbindung des Anfrageformulars (Du-Form).
 * Passt zum Markup in /workspace/mk/seo-pages/factoring-kosten/index.html:
 *   form.fwx-lead-form#factoring-check-form
 *   Felder: name, kontakt, branche, forderungshoehe, betriebsgroesse, anliegen, datenschutz
 *   Status: p.fwx-form-status[data-form-status]
 *
 * Nutzung:
 *   <script src="/js/anfrage-formular.js" defer></script>
 *   <script>
 *     document.addEventListener('DOMContentLoaded', function () {
 *       bindeAnfrageFormular(document.getElementById('factoring-check-form'), {
 *         endpoint: 'https://eg-anfragen.elias-gassmann.workers.dev/anfrage'
 *       });
 *     });
 *   </script>
 *
 * Vor dem Livegang data-backend bzw. endpoint erst setzen, wenn der Worker
 * freigegeben ist. Ein Wert, der nicht mit http beginnt, bleibt unverbunden.
 */
(function (wurzel) {
  var OK_TEXT = "Danke, deine Anfrage ist angekommen. Ich melde mich in Kürze bei dir.";
  var NETZ_TEXT = "Die Anfrage konnte gerade nicht gesendet werden. Bitte versuch es noch einmal oder schreib an elias@eliasgassmann.de.";
  var OFFEN_TEXT = "Dieses Formular ist noch nicht angebunden. Bitte nutze die 20-Minuten-Erstprüfung oder schreibe an elias@eliasgassmann.de.";

  function einwilligungText(form) {
    var kasten = form.querySelector(".fwx-consent span") || form.querySelector("label.fwx-consent");
    var roh = kasten ? kasten.textContent : "";
    return roh.replace(/\s+/g, " ").trim();
  }

  function setzeStatus(el, text, art) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.remove("is-ok", "is-error");
    if (art) el.classList.add(art);
  }

  function honeypotAnlegen(form) {
    if (form.querySelector('[name="website"]')) return;
    var wrap = document.createElement("div");
    wrap.className = "fwx-honeypot";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = '<label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>';
    form.appendChild(wrap);
  }

  function seiteAnlegen(form) {
    if (form.querySelector('[name="seite"]')) return;
    var hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = "seite";
    form.appendChild(hidden);
  }

  function endpunkt(form, optionen) {
    var ausOption = optionen && optionen.endpoint;
    var ausAttribut = form.getAttribute("data-backend");
    var wert = ausOption || ausAttribut || "";
    if (/^https?:\/\//i.test(wert)) return wert;
    return "";
  }

  function bindeAnfrageFormular(form, optionen) {
    if (!form) return;
    optionen = optionen || {};
    var status = form.querySelector("[data-form-status]");
    var knopf = form.querySelector('button[type="submit"]');
    var start = Date.now();
    honeypotAnlegen(form);
    seiteAnlegen(form);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var url = endpunkt(form, optionen);
      if (!url) {
        setzeStatus(status, optionen.offenText || OFFEN_TEXT, "is-error");
        return;
      }
      if (form.reportValidity && !form.reportValidity()) return;

      var seiteFeld = form.querySelector('[name="seite"]');
      if (seiteFeld && !seiteFeld.value) seiteFeld.value = window.location.href.split("#")[0];

      var daten = {
        name: (form.elements.name && form.elements.name.value) || "",
        kontakt: (form.elements.kontakt && form.elements.kontakt.value) || "",
        branche: (form.elements.branche && form.elements.branche.value) || "",
        forderungshoehe: (form.elements.forderungshoehe && form.elements.forderungshoehe.value) || "",
        betriebsgroesse: (form.elements.betriebsgroesse && form.elements.betriebsgroesse.value) || "",
        anliegen: (form.elements.anliegen && form.elements.anliegen.value) || "",
        datenschutz: !!(form.elements.datenschutz && form.elements.datenschutz.checked),
        seite: (form.elements.seite && form.elements.seite.value) || "",
        website: (form.elements.website && form.elements.website.value) || "",
        dauerMs: Date.now() - start,
        einwilligungText: einwilligungText(form)
      };
      if (optionen.turnstileToken) daten.turnstile = optionen.turnstileToken();

      if (knopf) knopf.disabled = true;
      setzeStatus(status, "Einen Moment, deine Anfrage wird gesendet …", "");

      fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(daten)
      }).then(function (res) {
        return res.json().then(function (body) {
          return { res: res, body: body || {} };
        }).catch(function () {
          return { res: res, body: {} };
        });
      }).then(function (ergebnis) {
        var body = ergebnis.body;
        if (ergebnis.res.ok && body.ok) {
          setzeStatus(status, optionen.okText || OK_TEXT, "is-ok");
          form.reset();
          start = Date.now();
          if (form.elements.seite) form.elements.seite.value = window.location.href.split("#")[0];
          return;
        }
        setzeStatus(status, body.fehler || NETZ_TEXT, "is-error");
        if (body.feld && form.elements[body.feld] && form.elements[body.feld].focus) {
          form.elements[body.feld].focus();
        }
      }).catch(function () {
        setzeStatus(status, NETZ_TEXT, "is-error");
      }).then(function () {
        if (knopf) knopf.disabled = false;
      });
    });
  }

  wurzel.bindeAnfrageFormular = bindeAnfrageFormular;
})(typeof window !== "undefined" ? window : globalThis);
