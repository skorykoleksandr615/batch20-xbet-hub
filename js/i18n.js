/**
 * Hub i18n engine — translates ALL visible text on every page.
 * Depends on window.HUB_I18N_DICT from i18n-dict.js
 */
(function () {
 var dict = window.HUB_I18N_DICT;
 if (!dict || !dict.meta) {
  dict = {
   meta: {
    en:{name:"English",code:"gb"}, de:{name:"Deutsch",code:"de"}, ru:{name:"Русский",code:"ru"},
    uk:{name:"Українська",code:"ua"}, pl:{name:"Polski",code:"pl"}, es:{name:"Español",code:"es"},
    pt:{name:"Português",code:"pt"}, fr:{name:"Français",code:"fr"}, it:{name:"Italiano",code:"it"},
    tr:{name:"Türkçe",code:"tr"}, nl:{name:"Nederlands",code:"nl"}
   },
   phrases: {}
  };
  window.HUB_I18N_DICT = dict;
 }
 if (!dict.phrases) dict.phrases = {};

 var STORAGE = "hub_lang_v1";
 var langs = Object.keys(dict.meta);
 var brand = "";
 var domain = "";
 var cached = false;
 var textNodes = [];

 function detectBrandDomain() {
 var bn = document.querySelector(".brand-name");
 brand = bn ? (bn.textContent || "").trim() : "";
 var can = document.querySelector('link[rel="canonical"]');
 if (can && can.href) {
 try {
 domain = new URL(can.href).hostname;
 } catch (e) {}
 }
 if (!domain) {
 var m = (document.querySelector('meta[property="og:url"]') || {}).content || "";
 try {
 if (m) domain = new URL(m).hostname;
 } catch (e2) {}
 }
 if (!brand) brand = document.title.split(/[|,–—-]/)[0].trim();
 }

 function replaceCI(hay, needle, repl) {
 if (!needle) return hay;
 var out = "";
 var lower = hay.toLowerCase();
 var n = needle.toLowerCase();
 var i = 0;
 while (i < hay.length) {
 var at = lower.indexOf(n, i);
 if (at < 0) {
 out += hay.slice(i);
 break;
 }
 out += hay.slice(i, at) + repl;
 i = at + needle.length;
 }
 return out;
 }

 function normalize(s) {
 if (!s) return s;
 var t = s
 .replace(/\u00e2\u0080\u0094/g, "\u2014")
 .replace(/\u00e2\u0080\u0093/g, "\u2013")
 .replace(/\u00e2\u0080\u0099/g, "\u2019")
 .replace(/\u00e2\u0080\u009c/g, "\u201c")
 .replace(/\u00e2\u0080\u009d/g, "\u201d")
 .replace(/\u00e2\u0080\u00a6/g, "\u2026")
 .replace(/&amp;/gi, "&")
 .replace(/&nbsp;/gi, " ")
 .replace(/&#8212;|&#x2014;/gi, "\u2014")
 .replace(/&#8211;|&#x2013;/gi, "\u2013")
 .replace(/\u00d0\u0092\u00c2\u00b7/g, "\u00b7")
 .replace(/\u00c2\u00b7/g, "\u00b7");
 if (domain) t = replaceCI(t, domain, "{Domain}");
 if (brand) t = replaceCI(t, brand, "{Brand}");
 return t.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
 }

 function fill(s) {
 if (!s) return s;
 return s.split("{Brand}").join(brand).split("{Domain}").join(domain);
 }

 var phraseIndex = null;
 function buildPhraseIndex() {
 if (phraseIndex) return;
 phraseIndex = {};
 Object.keys(dict.phrases).forEach(function (k) {
 phraseIndex[k.toLowerCase()] = k;
 });
 }

 function lookup(en, lang) {
 if (!en) return en;
 if (lang === "en") return en;
 buildPhraseIndex();
 var key = normalize(en);
 var variants = [
 key,
 key.replace(/\s*[\u2014\u2013\u2212-]\s*/g, " — "),
 key.replace(/\s*[\u2014\u2013\u2212-]\s*/g, " - ")
 ];
 for (var i = 0; i < variants.length; i++) {
 var v = variants[i];
 var pack = dict.phrases[v];
 if (!pack) {
 var canon = phraseIndex[v.toLowerCase()];
 if (canon) pack = dict.phrases[canon];
 }
 if (pack && pack[lang]) return fill(pack[lang]);
 }
 return null;
 }

 function translateString(en, lang) {
 if (lang === "en") return en;
 var hit = lookup(en, lang);
 if (hit != null) return hit;
 var parts = en.split(/(?<=[.!?])\s+/);
 if (parts.length > 1) {
 var out = parts.map(function (p) {
 var h = lookup(p, lang);
 return h != null ? h : p;
 });
 if (out.some(function (x, i) { return x !== parts[i]; })) return out.join(" ");
 }
 return en;
 }

 function shouldSkip(el) {
 if (!el || el.closest("script,style,noscript,code,pre,.lang-switch,[data-i18n-skip]")) return true;
 if (el.closest(".brand-name,.brand-mark")) return true;
 if (el.tagName === "IMG" || el.tagName === "SVG" || el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true;
 return false;
 }

 function cacheAllTextNodes() {
 if (cached) return;
 textNodes = [];
 var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
 var node;
 while ((node = walk.nextNode())) {
 if (!node.nodeValue || !node.nodeValue.trim()) continue;
 if (node.parentElement && shouldSkip(node.parentElement)) continue;
 node._i18nEn = node.nodeValue;
 textNodes.push(node);
 }
 cached = true;
 }

 function applyAllTextNodes(lang) {
 cacheAllTextNodes();
 for (var i = 0; i < textNodes.length; i++) {
 var node = textNodes[i];
 if (!node || !node.parentElement) continue;
 if (shouldSkip(node.parentElement)) continue;
 var en = node._i18nEn;
 if (en == null) continue;
 var trimmed = en.replace(/\s+/g, " ").trim();
 if (!trimmed) continue;
 var lead = en.match(/^\s*/)[0];
 var trail = en.match(/\s*$/)[0];
 if (lang === "en") {
 node.nodeValue = en;
 } else {
 var tr = translateString(trimmed, lang);
 node.nodeValue = lead + tr + trail;
 }
 }
 }

 function applyLang(lang) {
 if (langs.indexOf(lang) < 0) lang = "en";
 document.documentElement.lang = lang === "uk" ? "uk" : lang;
 applyAllTextNodes(lang);
 syncLangUrl(lang);
 try {
 localStorage.setItem(STORAGE, lang);
 } catch (e) {}
 syncSwitcher(lang);
 document.dispatchEvent(new CustomEvent("hub:lang", { detail: { lang: lang } }));
 }

 function flagHtml(meta) {
 var code = (meta && meta.code) || "gb";
 return (
 '<img class="lang-flag-img" src="https://flagcdn.com/w40/' +
 code +
 '.png" width="22" height="16" alt="' + ((meta && meta.name) ? (String(meta.name) + ' flag') : 'Language flag') + '" loading="lazy" decoding="async">'
 );
 }

 function syncSwitcher(lang) {
 var root = document.getElementById("langSwitch");
 if (!root) return;
 var meta = dict.meta[lang] || dict.meta.en;
 var btn = root.querySelector(".lang-switch-btn");
 if (btn) {
 btn.innerHTML =
 flagHtml(meta) +
 '<span class="lang-code">' +
 String(lang).toUpperCase() +
 '</span><span class="lang-name" data-i18n-skip="1">' +
 meta.name +
 "</span>";
 }
 root.querySelectorAll(".lang-option").forEach(function (opt) {
 opt.classList.toggle("is-active", opt.getAttribute("data-lang") === lang);
 });
 }

 function buildSwitcher() {
 try {
 var headerBar = document.querySelector(".header-bar") || document.querySelector(".site-header .wrap");
 if (!headerBar) return;
 var cta = headerBar.querySelector(".header-cta");
 var toggle = headerBar.querySelector(".nav-toggle");
 var actions = headerBar.querySelector(".header-actions");
 if (!actions) {
  actions = document.createElement("div");
  actions.className = "header-actions";
  if (cta && cta.parentNode === headerBar) headerBar.insertBefore(actions, cta);
  else if (toggle && toggle.parentNode === headerBar) headerBar.insertBefore(actions, toggle);
  else headerBar.appendChild(actions);
 }
 if (cta && cta.parentNode === headerBar) actions.appendChild(cta);
 if (toggle && toggle.parentNode === headerBar) actions.appendChild(toggle);
 var wrap = document.getElementById("langSwitch");
 if (!wrap) {
  wrap = document.createElement("div");
  wrap.className = "lang-switch";
  wrap.id = "langSwitch";
  actions.insertBefore(wrap, actions.firstChild);
 } else if (wrap.parentNode !== actions) {
  actions.insertBefore(wrap, actions.firstChild);
 }
 wrap.className = "lang-switch";
 wrap.innerHTML = '<button type="button" class="lang-switch-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Language"></button><div class="lang-switch-panel" role="listbox"></div>';
 var panel = wrap.querySelector(".lang-switch-panel");
 langs.forEach(function (code) {
  var m = dict.meta[code] || { name: String(code).toUpperCase(), code: "gb" };
  var b = document.createElement("button");
  b.type = "button";
  b.className = "lang-option";
  b.setAttribute("data-lang", code);
  b.setAttribute("role", "option");
  b.innerHTML = flagHtml(m) + '<span class="lang-code">' + String(code).toUpperCase() + "</span><span>" + (m.name || code) + "</span>";
  b.addEventListener("click", function () {
   wrap.classList.remove("is-open");
   wrap.querySelector(".lang-switch-btn").setAttribute("aria-expanded", "false");
   applyLang(code);
  });
  panel.appendChild(b);
 });
 var btn = wrap.querySelector(".lang-switch-btn");
 btn.addEventListener("click", function (e) {
  e.stopPropagation();
  var open = wrap.classList.toggle("is-open");
  btn.setAttribute("aria-expanded", open ? "true" : "false");
 });
 document.addEventListener("click", function () {
  wrap.classList.remove("is-open");
  btn.setAttribute("aria-expanded", "false");
 });
 } catch (err) {
  if (typeof console !== "undefined" && console.error) console.error("lang switcher", err);
 }
 }

 function readLangFromUrl() {
 try {
  var q = new URLSearchParams(location.search).get("lang");
  if (q) {
   q = String(q).toLowerCase();
   if (langs.indexOf(q) >= 0) return q;
  }
 } catch (e) {}
 return null;
 }
 function syncLangUrl(lang) {
 try {
  var u = new URL(location.href);
  if (lang && lang !== "en") u.searchParams.set("lang", lang);
  else u.searchParams.delete("lang");
  history.replaceState(null, "", u.pathname + u.search + u.hash);
 } catch (e2) {}
 }
 function boot() {
 detectBrandDomain();
 buildSwitcher();
 var lang = "en";
 var fromUrl = readLangFromUrl();
 if (fromUrl) lang = fromUrl;
 else {
 try { lang = localStorage.getItem(STORAGE) || "en"; } catch (e) {}
 }
 if (langs.indexOf(lang) < 0) lang = "en";
 applyLang(lang);
 }

 if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
 else boot();

 window.HUB_I18N = {
 apply: applyLang,
 getBrand: function () { return brand; },
 getDomain: function () { return domain; },
 missing: function (lang) {
 lang = lang || "ru";
 cacheAllTextNodes();
 var out = [];
 for (var i = 0; i < textNodes.length; i++) {
 var en = (textNodes[i]._i18nEn || "").replace(/\s+/g, " ").trim();
 if (!en || en.length < 3) continue;
 if (/^[\d\s.,:%+\-–—|/]+$/.test(en)) continue;
 if (lookup(en, lang) == null) out.push(en);
 }
 return out;
 }
 };
})();
