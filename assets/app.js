/* =========================================================================
   Interview-Prep Suite — shared shell
   Theme, top bar, tabs/sub-nav, copy, highlight, live-search, progress.
   Exposed as window.PrepUI. Auto-inits on DOMContentLoaded.
   ========================================================================= */
(function (w, d) {
  'use strict';

  var THEME_KEY = 'prep:theme';
  var PROG_KEY = 'prep:progress:v1';

  /* ---- storage (localStorage with in-memory fallback for file://) ---- */
  var mem = {};
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] || null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }
  };

  /* ===================== Theme ===================== */
  var SUN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>';
  var MOON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/></svg>';

  function systemDark() {
    return w.matchMedia && w.matchMedia('(prefers-color-scheme:dark)').matches;
  }
  function currentTheme() {
    var saved = store.get(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return systemDark() ? 'dark' : 'light';
  }
  function applyTheme(t) {
    d.documentElement.setAttribute('data-theme', t);
    var dark = t === 'dark';
    var btns = d.querySelectorAll('.theme-toggle');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var ic = b.querySelector('.tt-ic'), lab = b.querySelector('.tt-label');
      if (ic) ic.innerHTML = dark ? SUN : MOON;
      if (lab) lab.textContent = dark ? 'Light' : 'Dark';
      b.setAttribute('aria-pressed', dark ? 'true' : 'false');
    }
  }
  function toggleTheme() {
    var t = d.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    store.set(THEME_KEY, t);
    applyTheme(t);
  }
  // expose early so inline onclick=toggleTheme() works and FOUC is minimized
  w.toggleTheme = toggleTheme;

  /* ===================== Tabs ===================== */
  function panelFor(tab) {
    return d.getElementById('tab-' + tab) || d.querySelector('.panel[data-tab="' + tab + '"]');
  }
  function initTabs(nav) {
    var btns = [].slice.call(nav.querySelectorAll('.tab-btn'));
    if (!btns.length) return;
    function select(tab, focus) {
      btns.forEach(function (b) {
        var on = b.getAttribute('data-tab') === tab;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on && focus) b.focus();
        if (on) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
      [].slice.call((nav.closest('[data-tabscope]') || d).querySelectorAll('.panel')).forEach(function (p) {
        // only toggle panels that belong to this nav's scope
        var t = (p.id || '').replace(/^tab-/, '') || p.getAttribute('data-tab');
        if (panelOwnedBy(p, btns)) p.classList.toggle('active', t === tab);
      });
    }
    function panelOwnedBy(panel, btnList) {
      var t = (panel.id || '').replace(/^tab-/, '') || panel.getAttribute('data-tab');
      return btnList.some(function (b) { return b.getAttribute('data-tab') === t; });
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { select(b.getAttribute('data-tab'), false); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var j = (i + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length;
          select(btns[j].getAttribute('data-tab'), true);
        }
      });
    });
    nav._select = select;
    // initial: aria-selected=true button, else first
    var sel = btns.filter(function (b) { return b.getAttribute('aria-selected') === 'true'; })[0] || btns[0];
    select(sel.getAttribute('data-tab'), false);
  }

  /* ===================== Sub-nav (sections) ===================== */
  function initSubnav(sub, opts) {
    opts = opts || {};
    var btns = [].slice.call(sub.querySelectorAll('button[data-section]'));
    if (!btns.length) return;
    function select(name, updateHash) {
      btns.forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-section') === name ? 'true' : 'false'); });
      [].slice.call(d.querySelectorAll('[data-section-panel]')).forEach(function (p) {
        p.style.display = (p.getAttribute('data-section-panel') === name) ? '' : 'none';
      });
      if (opts.onChange) opts.onChange(name);
      if (updateHash !== false) {
        try { history.replaceState(null, '', '#' + name); } catch (e) { }
        Progress.setLastVisited(location.pathname.split('/').pop() + '#' + name);
      }
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () { select(b.getAttribute('data-section'), true); });
    });
    sub._select = select;
    var initial = (location.hash || '').replace('#', '');
    var has = btns.some(function (b) { return b.getAttribute('data-section') === initial; });
    select(has ? initial : btns[0].getAttribute('data-section'), false);
  }

  /* ===================== Copy buttons ===================== */
  function initCopy(root) {
    root = root || d;
    [].slice.call(root.querySelectorAll('.codewrap')).forEach(function (wrap) {
      if (wrap.querySelector('.copy-btn')) return;
      var pre = wrap.querySelector('pre');
      if (!pre) return;
      var btn = d.createElement('button');
      btn.type = 'button'; btn.className = 'copy-btn'; btn.textContent = 'copy';
      btn.addEventListener('click', function () {
        var txt = pre.innerText;
        var done = function () { btn.textContent = 'copied'; btn.classList.add('copied'); setTimeout(function () { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1400); };
        if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, done); else done();
      });
      wrap.appendChild(btn);
    });
  }

  /* ===================== Snippet injection + highlight ===================== */
  function injectCode(map) {
    [].slice.call(d.querySelectorAll('code[data-snippet]')).forEach(function (el) {
      var key = el.getAttribute('data-snippet');
      if (map[key] != null) el.textContent = map[key];
    });
  }
  function highlight(root) {
    if (!w.hljs) return;
    [].slice.call((root || d).querySelectorAll('pre code')).forEach(function (el) {
      // skip hand-highlighted blocks (they carry <span class="k"> etc.) and already-processed nodes
      if (el.querySelector('.k,.s,.n,.c,.f')) return;
      if (el.dataset.highlighted || el.classList.contains('hljs')) return;
      try { w.hljs.highlightElement(el); } catch (e) { }
    });
  }

  /* ===================== Live search + scroll-spy (frontend) ===================== */
  function initSearch(opts) {
    opts = opts || {};
    var input = d.querySelector(opts.input || '#search');
    if (!input) return;
    var items = opts.itemSelector || '.card,.qa';
    var sectionSel = opts.sectionSelector || 'section[id]';
    var empty = opts.empty ? d.querySelector(opts.empty) : null;
    function run() {
      var q = input.value.trim().toLowerCase();
      var any = false;
      [].slice.call(d.querySelectorAll(sectionSel)).forEach(function (sec) {
        var hits = 0;
        [].slice.call(sec.querySelectorAll(items)).forEach(function (it) {
          var on = !q || it.textContent.toLowerCase().indexOf(q) > -1;
          it.style.display = on ? '' : 'none';
          if (on) hits++;
        });
        sec.style.display = (q && hits === 0) ? 'none' : '';
        if (hits) any = true;
      });
      if (empty) empty.style.display = (q && !any) ? '' : 'none';
    }
    input.addEventListener('input', run);
    d.addEventListener('keydown', function (e) {
      if (e.key === '/' && d.activeElement !== input) { e.preventDefault(); input.focus(); }
      if (e.key === 'Escape' && d.activeElement === input) { input.value = ''; run(); input.blur(); }
    });
    // scroll-spy
    if (opts.toc) {
      var links = [].slice.call(d.querySelectorAll(opts.toc + ' a'));
      var map = {};
      links.forEach(function (a) { map[a.getAttribute('href')] = a; });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            links.forEach(function (a) { a.classList.remove('active'); });
            var a = map['#' + en.target.id]; if (a) a.classList.add('active');
          }
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      [].slice.call(d.querySelectorAll(sectionSel)).forEach(function (s) { io.observe(s); });
    }
  }

  /* ===================== Progress ===================== */
  function defProg() {
    return { decks: { sysdesign: { good: [], again: [] }, behavioral: { done: [] } }, lastVisited: '', updated: 0 };
  }
  var Progress = {
    get: function () {
      try {
        var raw = store.get(PROG_KEY);
        if (!raw) return defProg();
        var o = JSON.parse(raw);
        o.decks = o.decks || {};
        o.decks.sysdesign = o.decks.sysdesign || { good: [], again: [] };
        o.decks.behavioral = o.decks.behavioral || { done: [] };
        return o;
      } catch (e) { return defProg(); }
    },
    save: function (o) { o.updated = Date.now(); store.set(PROG_KEY, JSON.stringify(o)); return o; },
    /* status: 'good' | 'again' | 'none' for sysdesign; 'done' | 'none' for behavioral */
    setCard: function (deck, id, status) {
      var o = Progress.get(); var dk = o.decks[deck] = o.decks[deck] || {};
      function pull(arr) { var i = arr.indexOf(id); if (i > -1) arr.splice(i, 1); }
      if (deck === 'behavioral') {
        dk.done = dk.done || [];
        pull(dk.done);
        if (status === 'done') dk.done.push(id);
      } else {
        dk.good = dk.good || []; dk.again = dk.again || [];
        pull(dk.good); pull(dk.again);
        if (status === 'good') dk.good.push(id);
        else if (status === 'again') dk.again.push(id);
      }
      return Progress.save(o);
    },
    deckStats: function (deck, total) {
      var dk = Progress.get().decks[deck] || {};
      if (deck === 'behavioral') return { done: (dk.done || []).length, total: total };
      return { good: (dk.good || []).length, again: (dk.again || []).length, total: total };
    },
    setLastVisited: function (href) {
      var o = Progress.get(); o.lastVisited = href; Progress.save(o);
    }
  };

  /* ===================== Boot ===================== */
  function boot() {
    applyTheme(currentTheme());
    [].slice.call(d.querySelectorAll('.theme-toggle')).forEach(function (b) {
      if (!b.getAttribute('onclick')) b.addEventListener('click', toggleTheme);
    });
    [].slice.call(d.querySelectorAll('nav.tabs')).forEach(initTabs);
    initCopy();
    highlight();
    // record visit (page-level; subnav refines it)
    if (!/index\.html?$|\/$/.test(location.pathname)) {
      Progress.setLastVisited(location.pathname.split('/').pop() + (location.hash || ''));
    }
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();
  // react to OS theme change when user hasn't pinned a choice
  if (w.matchMedia) w.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', function () {
    if (!store.get(THEME_KEY)) applyTheme(currentTheme());
  });

  w.PrepUI = {
    toggleTheme: toggleTheme, applyTheme: applyTheme, currentTheme: currentTheme,
    initTabs: initTabs, initSubnav: initSubnav, initCopy: initCopy,
    injectCode: injectCode, highlight: highlight, initSearch: initSearch,
    Progress: Progress
  };
})(window, document);
