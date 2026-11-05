(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement; root.classList.add('js');
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  /* beweging pauzeren */
  var mtog = $('#mtog');
  var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  function setMotion(off) {
    if (off) root.setAttribute('data-motion', 'off'); else root.removeAttribute('data-motion');
    mtog.setAttribute('aria-pressed', String(off)); mtog.textContent = off ? 'Beweging hervatten' : 'Beweging pauzeren';
  }
  setMotion(store.get('dwd-motion') === 'off' || (mq && mq.matches));
  mtog.addEventListener('click', function () { var off = !root.hasAttribute('data-motion'); setMotion(off); store.set('dwd-motion', off ? 'off' : 'on'); });
  function still() { return root.hasAttribute('data-motion'); }
  /* header en menu */
  var top = $('#top'), burger = $('#burger'), menu = $('#menu');
  function onScroll() { top.classList.toggle('on', window.scrollY > 40); }
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  function closeMenu() { menu.hidden = true; burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Open menu'); }
  burger.addEventListener('click', function () { var o = menu.hidden; menu.hidden = !o; burger.setAttribute('aria-expanded', String(o)); burger.setAttribute('aria-label', o ? 'Sluit menu' : 'Open menu'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { closeMenu(); burger.focus(); } });
  document.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target) && !burger.contains(e.target)) closeMenu(); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });
  /* onthullen bij scrollen */
  var rvs = $$('.rv');
  if ('IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } }); }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    rvs.forEach(function (r) { rio.observe(r); });
  } else { rvs.forEach(function (r) { r.classList.add('in'); }); }
  /* ===== lava-knoppen ===== */
  (function () {
    var bs = $$('.btn:not(.plain)').concat($$('.num'));
    bs.forEach(function (b) {
      var lv = document.createElement('span');
      lv.className = 'lv'; lv.setAttribute('aria-hidden', 'true');
      lv.innerHTML = '<span class="g"><i></i><i></i><i></i><i></i><i></i><i class="cur"></i></span>';
      b.insertBefore(lv, b.firstChild);
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--mx', (e.clientX - r.left + r.width * .3) + 'px');
        b.style.setProperty('--my', (e.clientY - r.top + r.height * .3) + 'px');
      });
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (en) { en.target.classList.toggle('lv-on', en.isIntersecting); }); });
      bs.forEach(function (b) { io.observe(b); });
    } else { bs.forEach(function (b) { b.classList.add('lv-on'); }); }
  })();
  /* ===== lava (hero en footer) ===== */
  function Lava(cv, cfg) {
    var ctx = cv.getContext('2d'), W = 0, H = 0, img, d, asp = 1, vis = false, last = 0;
    var B = cfg.blobs.map(function (b, i) { return { x: b[0], y: b[1], r: b[2], ax: b[3], ay: b[4], fx: b[5], fy: b[6], px: i * 1.7 + 1, py: i * 2.3 + .5 }; });
    var n = B.length, bx = new Float32Array(n), by = new Float32Array(n), br = new Float32Array(n);
    var stops = [[0, 150, 8, 42], [.28, 217, 15, 56], [.55, 251, 61, 50], [.8, 255, 112, 46], [1, 255, 176, 96]], lut = new Uint8Array(256 * 3);
    for (var k = 0; k < 256; k++) { var t = k / 255, a = 0; while (a < stops.length - 2 && t > stops[a + 1][0]) a++; var s0 = stops[a], s1 = stops[a + 1], u = Math.max(0, Math.min(1, (t - s0[0]) / (s1[0] - s0[0]))); for (var c = 0; c < 3; c++) lut[k * 3 + c] = s0[c + 1] + (s1[c + 1] - s0[c + 1]) * u; }
    function size() {
      var cw = cv.clientWidth, ch = cv.clientHeight; if (!cw || !ch) return false;
      var res = window.innerWidth < 640 ? cfg.res * .8 : cfg.res;
      W = Math.max(36, Math.round(cw / res)); H = Math.max(28, Math.round(ch / res));
      cv.width = W; cv.height = H; img = ctx.createImageData(W, H); d = img.data; asp = W / H; return true;
    }
    function draw(tm) {
      if (!d) return;
      for (var i = 0; i < n; i++) { var b = B[i]; bx[i] = (b.x + b.ax * Math.sin(tm * b.fx + b.px)) * asp; by[i] = b.y + b.ay * Math.sin(tm * b.fy + b.py); br[i] = b.r * b.r; }
      var o = 0;
      for (var y = 0; y < H; y++) {
        var py = y / H;
        for (var x = 0; x < W; x++) {
          var px = x / W * asp, f = 0;
          for (var q = 0; q < n; q++) { var dx = px - bx[q], dy = py - by[q]; f += br[q] / (dx * dx + dy * dy + 1e-4); }
          if (f < .88) { d[o + 3] = 0; o += 4; continue; }
          var e = (f - .88) / .4; e = e > 1 ? 1 : e; e = e * e * (3 - 2 * e);
          var ff = (f - 1) / 2.6; ff = ff < 0 ? 0 : ff > 1 ? 1 : ff; var tt = .18 + .5 * py + .2 * ff + .1 * Math.sin(px * 3 + tm * .6); tt = tt < 0 ? 0 : tt > 1 ? 1 : tt; var li = ((tt * 255) | 0) * 3;
          d[o] = lut[li]; d[o + 1] = lut[li + 1]; d[o + 2] = lut[li + 2]; d[o + 3] = e * 255; o += 4;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    function loop(ts) {
      if (!vis) { last = 0; return; }
      if (!still() && ts - last > 32) { last = ts; draw(ts / 1000 * cfg.speed); }
      requestAnimationFrame(loop);
    }
    if (size()) draw(cfg.still);
    if ('ResizeObserver' in window) new ResizeObserver(function () { if (size()) draw(cfg.still); }).observe(cv);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { var was = vis; vis = en[0].isIntersecting; if (vis && !was) requestAnimationFrame(loop); }).observe(cv);
  }
  var hv = $('canvas[data-lava="hero"]'), fv = $('canvas[data-lava="footer"]');
  if (hv) Lava(hv, { res: 5, speed: .42, still: 14, blobs: [[.08, 1.08, .22, .08, .10, .31, .23], [.30, 1.10, .26, .10, .08, .19, .27], [.52, 1.08, .24, .08, .10, .23, .17], [.74, 1.10, .26, .08, .09, .29, .21], [.94, 1.08, .22, .06, .10, .25, .19], [.20, .78, .09, .16, .14, .37, .31], [.46, .70, .10, .15, .13, .27, .35], [.72, .76, .085, .13, .14, .33, .25], [.58, .50, .06, .25, .10, .21, .40], [.34, .46, .05, .22, .12, .39, .29]] });
  if (fv) Lava(fv, { res: 6, speed: .34, still: 9, blobs: [[.10, 1.0, .20, .08, .08, .27, .19], [.38, 1.04, .24, .10, .07, .21, .25], [.66, 1.0, .22, .08, .09, .25, .17], [.92, 1.02, .20, .06, .08, .19, .23], [.24, .64, .085, .14, .14, .33, .29], [.62, .58, .095, .13, .13, .23, .31], [.46, .34, .07, .22, .12, .29, .37], [.10, .30, .06, .12, .14, .35, .21], [.88, .28, .06, .10, .14, .19, .33]] });

  /* ===== mega-footer: logo vult de breedte ===== */
  var mg = $('#footer'), mgFit = $('#mgFit'), mgLogo = $('#mgLogo');
  function fitLogo() {
    mgLogo.style.fontSize = '100px';
    var w = mgLogo.getBoundingClientRect().width, cw = mgFit.clientWidth;
    if (w && cw) mgLogo.style.fontSize = (100 * cw / w * .995).toFixed(2) + 'px';
  }
  fitLogo(); window.addEventListener('resize', fitLogo);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLogo);
  var ticking = false;
  function rise() {
    ticking = false;
    if (still()) { mg.style.setProperty('--p', '1'); return; }
    var r = mg.getBoundingClientRect(), vh = window.innerHeight;
    var p = (vh - r.top) / Math.min(r.height * .9, vh * .95);
    mg.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(3));
  }
  function onRise() { if (!ticking) { ticking = true; requestAnimationFrame(rise); } }
  window.addEventListener('scroll', onRise, { passive: true }); window.addEventListener('resize', onRise); rise();
})();


/* ===== binnenpagina's ===== */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  /* exclusieve details voor browsers zonder name-ondersteuning */
  $$('.faq-list details').forEach(function (d) {
    d.addEventListener('toggle', function () { if (d.open) $$('.faq-list details').forEach(function (o) { if (o !== d) o.open = false; }); });
  });
  /* filter inzichten */
  var fb = $$('.filters button');
  fb.forEach(function (b) { b.addEventListener('click', function () {
    fb.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
    var f = b.getAttribute('data-filter');
    $$('.card[data-category]').forEach(function (c) { c.hidden = !(f === 'all' || c.getAttribute('data-category') === f); });
  }); });
  /* afdrukken */
  $$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

  /* aanvraagformulier */
  var form = $('#request-form'); if (!form) return;
  function clean(v) { return v.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/[\/?#].*$/, ''); }
  function validDomain(d) { return /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(d); }
  function phone10(v) { var d = v.replace(/\D/g, ''); if (d.indexOf('0031') === 0) d = '0' + d.slice(4); else if (d.indexOf('31') === 0 && d.length >= 11) d = '0' + d.slice(2); return d; }
  var st = $('.rstatus', form), btn = $('button[type=submit]', form);
  function say(msg, cls) { st.textContent = msg; st.className = 'rstatus ' + (cls || ''); }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var em = $('#email'), ph = $('#phone'), wb = $('#website'), bad = [];
    [em, ph, wb].forEach(function (i) { i.removeAttribute('aria-invalid'); });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.value.trim())) bad.push([em, 'Vul een geldig e-mailadres in.']);
    var p = phone10(ph.value); if (!/^0\d{9}$/.test(p)) bad.push([ph, 'Vul een geldig Nederlands telefoonnummer in.']);
    var site = clean(wb.value); if (!validDomain(site)) bad.push([wb, 'Vul een geldig website-adres in, bijvoorbeeld jouwbedrijf.nl.']);
    if (bad.length) { say(bad[0][1], 'bad'); bad.forEach(function (b) { b[0].setAttribute('aria-invalid', 'true'); }); bad[0][0].focus(); return; }
    if ($('[name=company_check]', form).value) { say('Je aanvraag is ontvangen. We nemen contact met je op.', 'ok'); return; }
    var cfg = window.DWD || {};
    if (!cfg.sb || !cfg.k) { say('Versturen is op deze testversie nog niet gekoppeld. Mail ons op info@dewebsitedokters.nl.', 'bad'); return; }
    btn.disabled = true; say('Even geduld…');
    var ref = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    fetch(cfg.sb + '/rest/v1/dwd_site_requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.k, Authorization: 'Bearer ' + cfg.k, Prefer: 'return=minimal' },
      body: JSON.stringify({ id: ref, email: em.value.trim(), phone: p, website: site, source: location.pathname })
    }).then(function (r) {
      if (!r.ok) throw new Error('status ' + r.status);
      form.reset(); say('Je aanvraag is ontvangen. We nemen contact met je op. Je referentie: ' + ref.slice(0, 8), 'ok');
    }).catch(function () { say('Versturen lukte niet. Probeer het opnieuw of mail ons op info@dewebsitedokters.nl.', 'bad'); }).then(function () { btn.disabled = false; });
  });
})();
