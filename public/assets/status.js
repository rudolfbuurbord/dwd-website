/* Open/dicht-knopje bovenaan de site. Tijden hier aanpassen (0 = zondag). */
(function () {
  var W = [null, [9, 21], [9, 21], [9, 21], [9, 21], [9, 21], [10, 14]];
  var TXT = 'Ma t/m vr 9:00 tot 21:00 · za 10:00 tot 14:00 · zo gesloten';
  var host = document.querySelector('.nav-r'); if (!host) return;
  var st = document.createElement('style');
  st.textContent = '.ostat{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 13px 0 11px;border-radius:99px;font:600 13px/1 var(--f-b,system-ui,sans-serif);color:var(--fg,#FDF8F3);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);white-space:nowrap;margin-right:6px}' +
    '.ostat i{position:relative;width:9px;height:9px;border-radius:50%;background:var(--c);flex:none}' +
    '.ostat i::after{content:"";position:absolute;inset:0;border-radius:50%;background:var(--c);animation:ostat 1.8s ease-out infinite}' +
    '.ostat[data-s=open]{--c:#3DDC84}.ostat[data-s=dicht]{--c:#FB3D32}' +
    '@keyframes ostat{0%{transform:scale(1);opacity:.65}100%{transform:scale(3);opacity:0}}' +
    '@media (prefers-reduced-motion:reduce){.ostat i::after{animation:none}}' +
    '@media (max-width:380px){.ostat{padding:0 10px 0 9px;gap:6px;font-size:12px;margin-right:2px}}';
  document.head.appendChild(st);
  var el = document.createElement('span'); el.className = 'ostat'; el.setAttribute('role', 'status'); el.innerHTML = '<i></i><b></b>';
  host.insertBefore(el, host.firstChild);
  function tick() {
    var o = {}; try { new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).forEach(function (x) { o[x.type] = x.value; }); } catch (e) { return; }
    var d = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday], h = (+o.hour % 24) + (+o.minute) / 60, w = W[d];
    var open = !!w && h >= w[0] && h < w[1];
    el.setAttribute('data-s', open ? 'open' : 'dicht'); el.title = TXT;
    el.lastChild.textContent = open ? 'Nu open' : 'Nu dicht';
  }
  tick(); setInterval(tick, 60000);
})();
