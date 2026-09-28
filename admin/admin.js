/* Trexora v2 — admin shared logic (guard, nav, helpers). */
(function () {
  "use strict";

  if (!TX.adminAuthed()) { window.location.replace("login.html"); return; }

  function $(id) { return document.getElementById(id); }

  window.ADM = {
    $: $,
    toast: function (msg) {
      var t = $("toast");
      if (!t) { alert(msg); return; }
      t.textContent = msg; t.classList.add("show");
      clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("show"); }, 2600);
    },
    userById: function (s, id) {
      for (var i = 0; i < s.users.length; i++) if (s.users[i].id === id) return s.users[i];
      return null;
    },
    userByEmail: function (s, email) {
      email = String(email).toLowerCase();
      for (var i = 0; i < s.users.length; i++) if (s.users[i].email.toLowerCase() === email) return s.users[i];
      return null;
    },
    logout: function () { TX.setAdminAuthed(false); window.location.replace("login.html"); },
    statusPill: function (st) {
      var map = { win: "result-win", loss: "result-loss", void: "result-void", tie: "result-void", early: "result-void", pending: "status-pending", approved: "status-approved", rejected: "status-rejected", open: "status-open", closed: "status-closed" };
      return '<span class="' + (map[st] || "") + '">' + TX.esc(st) + "</span>";
    }
  };

  var root = document.documentElement;
  var tt = $("themeToggle");
  if (tt) tt.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("trexora-theme", next); } catch (e) {}
  });
  var lo = $("logoutBtn");
  if (lo) lo.addEventListener("click", ADM.logout);
  var mnt = $("mobileNavToggle");
  var sb = $("sidebar");
  if (mnt && sb) {
    mnt.addEventListener("click", function () { sb.classList.toggle("open"); });
    sb.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { sb.classList.remove("open"); }); });
  }
  var page = document.body.getAttribute("data-page");
  if (page) {
    document.querySelectorAll(".side-link").forEach(function (a) {
      if (a.getAttribute("data-nav") === page) a.classList.add("active");
    });
  }
})();
