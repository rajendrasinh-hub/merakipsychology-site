/* Meraki Psychological Services — site scripts (no dependencies) */

/* ==== Practice settings: update these before going live ==== */
const PRACTICE = {
  email: "drhemababaria@gmail.com"
};

(function () {
  "use strict";

  // Mobile navigation
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  // Practice email links
  document.querySelectorAll("[data-email]").forEach((el) => {
    el.textContent = PRACTICE.email;
    el.setAttribute("href", "mailto:" + PRACTICE.email);
  });

  // Gentle reveal on scroll
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("visible"));
  }

  // Safe storage helpers (storage can be unavailable in some browsers)
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };
  const ACK_KEY = "meraki_welcome_ack";

  // Opens the visitor's email app with the form contents
  function sendViaEmail(subject, lines) {
    const body = lines.filter(Boolean).join("\n");
    window.location.href = "mailto:" + PRACTICE.email +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
  }

  /* ---------- New patient welcome acknowledgement ---------- */
  const ackForm = document.getElementById("ack-form");
  if (ackForm) {
    const check = document.getElementById("ack-check");
    const nameEl = document.getElementById("ack-name");
    const btn = document.getElementById("ack-submit");
    const status = document.getElementById("ack-status");
    const requestSection = document.getElementById("request-section");

    const refresh = () => { btn.disabled = !(check.checked && nameEl.value.trim().length > 1); };
    check.addEventListener("change", refresh);
    nameEl.addEventListener("input", refresh);

    const unlock = (ack) => {
      status.innerHTML = "Thank you, <strong>" + escapeHtml(ack.name) +
        "</strong>. You acknowledged the Welcome Note on " + ack.date +
        ". You may now request your first appointment below.";
      status.classList.add("show");
      if (requestSection) {
        requestSection.classList.remove("locked");
        requestSection.removeAttribute("aria-disabled");
        const reqName = document.getElementById("req-name");
        if (reqName && !reqName.value) reqName.value = ack.name;
      }
    };

    const existing = store.get(ACK_KEY);
    if (existing && existing.name) {
      check.checked = true; nameEl.value = existing.name; refresh(); unlock(existing);
    }

    ackForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (btn.disabled) return;
      const ack = {
        name: nameEl.value.trim(),
        date: new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
      };
      store.set(ACK_KEY, ack);
      unlock(ack);
      if (requestSection) requestSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ---------- New patient appointment request ---------- */
  const reqForm = document.getElementById("request-form");
  if (reqForm) {
    reqForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const ack = store.get(ACK_KEY) || {};
      const f = new FormData(reqForm);
      sendViaEmail("New patient appointment request — " + f.get("name"), [
        "Name: " + f.get("name"),
        "Phone: " + f.get("phone"),
        "Email: " + f.get("email"),
        "Preferred contact: " + f.get("contact_pref"),
        "Preferred days/times: " + (f.get("availability") || "—"),
        "",
        "What brings you to therapy (optional):",
        f.get("message") || "—",
        "",
        "Welcome Note acknowledged: " + (ack.name ? "Yes — " + ack.name + " on " + ack.date : "Yes")
      ]);
      document.getElementById("request-success").classList.add("show");
    });
  }

  /* ---------- General contact form ---------- */
  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(contactForm);
      sendViaEmail("Website inquiry — " + f.get("name"), [
        "Name: " + f.get("name"),
        "Email: " + f.get("email"),
        "Phone: " + (f.get("phone") || "—"),
        "Topic: " + f.get("topic"),
        "",
        f.get("message")
      ]);
      document.getElementById("contact-success").classList.add("show");
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
})();
