/* Toestemming en Meta Pixel.
   De pixel laadt NOOIT voor toestemming. Zonder PIXEL_ID doet dit script niets (geen banner, geen tracking). */
(function () {
  var PIXEL_ID = '1090997543918277'; /* vul hier het Pixel-ID van Meta in, alleen cijfers */
  var KEY = 'dwd_consent', VERSION = 1, MAXAGE = 365 * 864e5;
  var d = document;
  function read() { try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && v.v === VERSION && Date.now() - v.t < MAXAGE && (v.c === 'granted' || v.c === 'denied')) return v.c; } catch (e) {} return null; }
  function write(c) { try { localStorage.setItem(KEY, JSON.stringify({ v: VERSION, c: c, t: Date.now() })); } catch (e) {} }
  var loaded = false;
  function loadPixel() {
    if (loaded || !PIXEL_ID) return; loaded = true;
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, d, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* Dit script laadt alleen na toestemming. Geen 'revoke' voor 'init': dat blokkeert de wachtrij van fbevents. */
    fbq('init', PIXEL_ID); fbq('consent', 'grant'); fbq('track', 'PageView');
  }
  function stopPixel() {
    try { if (window.fbq) window.fbq('consent', 'revoke'); } catch (e) {}
    ['_fbp', '_fbc'].forEach(function (n) {
      var h = location.hostname.split('.'); for (var i = 0; i < h.length - 1; i++) { var dom = h.slice(i).join('.'); d.cookie = n + '=; Max-Age=0; path=/; domain=.' + dom; d.cookie = n + '=; Max-Age=0; path=/; domain=' + dom; }
      d.cookie = n + '=; Max-Age=0; path=/';
    });
  }
  /* voor gebeurtenissen: alleen met toestemming */
  window.dwdTrack = function (name, params, eventId) {
    try { if (read() === 'granted' && window.fbq) window.fbq('track', name, params || {}, eventId ? { eventID: eventId } : undefined); } catch (e) {}
  };
  if (!PIXEL_ID) return;

  var css = '#dwd-cb{position:fixed;left:max(12px,env(safe-area-inset-left,0px));right:max(12px,env(safe-area-inset-right,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:2147483000;max-width:560px;margin:0 auto;background:#141416;color:#FDF8F3;border:1px solid rgba(253,248,243,.18);border-radius:20px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.6);font:500 15px/1.5 Figtree,system-ui,sans-serif}' +
    '#dwd-cb h2{margin:0 0 6px;font:800 18px/1.2 Gabarito,system-ui,sans-serif;letter-spacing:-.01em}#dwd-cb p{margin:0 0 14px;color:#D8D2CB}#dwd-cb a{color:#FDF8F3;text-decoration:underline}' +
    '#dwd-cb .r{display:flex;gap:10px;align-items:center}#dwd-cb button{border-radius:14px;font-family:Figtree,system-ui,sans-serif;cursor:pointer}' +
    '#dwd-cb button[data-c=denied]{flex:0 0 auto;min-height:44px;padding:0 16px;border:1.5px solid rgba(253,248,243,.45);background:#000;color:#fff;font-weight:600;font-size:14px}' +
    '#dwd-cb button[data-c=granted]{flex:1;min-height:54px;border:1.5px solid #17914F;background:#17914F;color:#fff;font-weight:800;font-size:17px}' +
    '#dwd-cb button:focus-visible{outline:3px solid #FF6E2E;outline-offset:2px}.dwd-cs{background:none;border:0;padding:0;color:inherit;font:inherit;text-decoration:underline;cursor:pointer}';
  var st = d.createElement('style'); st.textContent = css; d.head.appendChild(st);

  var box;
  function close() { if (box) { box.remove(); box = null; } }
  function choose(c) { write(c); close(); if (c === 'granted') loadPixel(); else stopPixel(); }
  function open() {
    if (box) return;
    box = d.createElement('div'); box.id = 'dwd-cb'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-labelledby', 'dwd-cbh');
    box.innerHTML = '<h2 id="dwd-cbh">Mogen we meten of onze advertenties werken?</h2><p>Daarmee kunnen we onze prijzen laag houden. We gebruiken hiervoor de Meta Pixel, alleen met jouw toestemming. Lees meer in ons <a href="/cookiebeleid">cookiebeleid</a>.</p><div class="r"><button type="button" data-c="denied">Liever niet</button><button type="button" data-c="granted">Prima</button></div>';
    box.addEventListener('click', function (e) { var b = e.target.closest('button[data-c]'); if (b) choose(b.getAttribute('data-c')); });
    d.body.appendChild(box);
  }
  function addSettingsLink() {
    var a = d.querySelector('footer a[href*="cookiebeleid"], a[href*="cookiebeleid"]');
    var b = d.createElement('button'); b.type = 'button'; b.className = 'dwd-cs'; b.textContent = 'Cookie-instellingen';
    b.addEventListener('click', function () { open(); });
    if (a && a.parentNode) { a.parentNode.insertBefore(b, a.nextSibling); a.parentNode.insertBefore(d.createTextNode(' '), b); }
    else { b.style.cssText = 'position:fixed;left:12px;bottom:8px;z-index:5;font-size:12px;color:#8B857F;background:none'; d.body.appendChild(b); }
  }
  function start() {
    addSettingsLink();
    var c = read();
    if (c === 'granted') { loadPixel(); return; }
    if (c !== null) return;
    /* Op de funnel: pas vragen na de eerste keuze, zodat de banner de eerste vraag niet bedekt. */
    var first = d.querySelectorAll('[data-route]');
    if (!first.length) { open(); return; }
    var once = function () { for (var i = 0; i < first.length; i++) first[i].removeEventListener('click', once); setTimeout(function () { if (read() === null) open(); }, 600); };
    for (var i = 0; i < first.length; i++) first[i].addEventListener('click', once);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})();
