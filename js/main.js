/* Meraki Psychological Services — site scripts (no dependencies) */

/* ==== Practice settings: update these before going live ==== */
const PRACTICE = {
  email: "drhemababaria@gmail.com",
  phone: "610-888-3425",
  // Web3Forms access key (free: https://web3forms.com — enter the practice email, the key is emailed to you).
  // While this is empty, forms are delivered through FormSubmit (https://formsubmit.co) instead;
  // the very first submission triggers a one-time "Activate form" email to the practice inbox.
  web3formsKey: "004c3692-47f5-4d8e-baee-b742859f09ff"
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

  // Sends a form to the practice inbox in the background (no email app needed)
  async function deliver(subject, fields, replyTo, honeypot) {
    if (honeypot) return true; // bot filled the hidden field: pretend success, send nothing
    if (PRACTICE.web3formsKey) {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(Object.assign({
          access_key: PRACTICE.web3formsKey,
          subject: subject,
          from_name: "Meraki Psychological Services website",
          replyto: replyTo
        }, fields))
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.message || "Send failed");
      return true;
    }
    const res = await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(PRACTICE.email), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(Object.assign({
        _subject: subject,
        _template: "table",
        _captcha: "false",
        _replyto: replyTo
      }, fields))
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || String(data.success) === "false") throw new Error(data.message || "Send failed");
    return true;
  }

  // Wires a form: disables the button while sending and shows success / error messages
  function wireForm(form, successEl, errorEl, build) {
    const btn = form.querySelector('button[type="submit"]');
    const label = btn ? btn.textContent : "";
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const f = new FormData(form);
      const { subject, fields, replyTo } = build(f);
      successEl.classList.remove("show"); errorEl.classList.remove("show");
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      try {
        await deliver(subject, fields, replyTo, f.get("website_hp"));
        form.querySelectorAll("input:not([type=hidden]), textarea").forEach((el) => { if (el.type !== "checkbox") el.value = ""; });
        successEl.classList.add("show");
        successEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (err) {
        errorEl.classList.add("show");
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = label; }
      }
    });
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
    wireForm(reqForm, document.getElementById("request-success"), document.getElementById("request-error"), (f) => {
      const ack = store.get(ACK_KEY) || {};
      return {
        subject: "New patient appointment request — " + f.get("name"),
        replyTo: f.get("email"),
        fields: {
          "Name": f.get("name"),
          "Phone": f.get("phone"),
          "Email": f.get("email"),
          "Preferred contact": f.get("contact_pref"),
          "Preferred days / times": f.get("availability") || "—",
          "What brings you to therapy": f.get("message") || "—",
          "Welcome Note acknowledged": ack.name ? "Yes — " + ack.name + " on " + ack.date : "Yes"
        }
      };
    });
  }

  /* ---------- General contact form ---------- */
  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    wireForm(contactForm, document.getElementById("contact-success"), document.getElementById("contact-error"), (f) => ({
      subject: "Website inquiry — " + f.get("name") + " (" + f.get("topic") + ")",
      replyTo: f.get("email"),
      fields: {
        "Name": f.get("name"),
        "Email": f.get("email"),
        "Phone": f.get("phone") || "—",
        "Topic": f.get("topic"),
        "Message": f.get("message")
      }
    }));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
})();
