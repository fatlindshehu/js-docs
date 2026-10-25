(function () {
  function $(id) { return document.getElementById(id); }
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
  /* green or red result chip */
  function tone(e, ok) { e.classList.toggle('yes', ok); e.classList.toggle('no', !ok); }

  var svg = $('split');
  function play() {
    svg.classList.remove('play');
    void svg.getBoundingClientRect();
    svg.classList.add('play');
  }
  $('replay').addEventListener('click', play);

  /* pages: one article visible at a time, chosen by #hash */
  var pages = all('article.doc');
  var navLinks = all('.side .nav-group a');
  var navById = {};
  navLinks.forEach(function (a, i) {
    a.insertBefore(el('span', 'nav-n', String(i + 1)), a.firstChild);
    navById[a.hash.slice(1)] = a;
  });
  var current = null;
  function route() {
    var id = location.hash.slice(1);
    var target = id ? document.getElementById(id) : null;
    var page = target ? target.closest('article.doc') : null;
    if (!page) { page = pages[0]; target = page; }
    var changed = page !== current;
    pages.forEach(function (p) { p.hidden = p !== page; });
    current = page;
    navLinks.forEach(function (a) {
      var hid = a.hash.slice(1);
      a.classList.toggle('on', hid === page.id || (target !== page && hid === target.id));
    });
    if (target === page) { window.scrollTo(0, 0); } else { target.scrollIntoView(); }
    if (changed && page.id === 'values') play();
  }

  /* breadcrumbs come from the nav headings above the page's link, the pager from neighbouring pages */
  function title(pg) { return pg.querySelector('h1').textContent; }
  function crumbPath(a) {
    var path = [];
    for (var n = a.previousElementSibling; n; n = n.previousElementSibling) {
      if (n.classList.contains('nav-sub') && !path.length) path.push(n.textContent);
      if (n.classList.contains('nav-h')) { path.unshift(n.textContent); break; }
    }
    return path;
  }
  function link(other, cls, label) {
    var a = el('a', cls);
    a.href = '#' + other.id;
    a.appendChild(el('span', 'pg-l', label));
    a.appendChild(el('span', '', title(other)));
    return a;
  }
  pages.forEach(function (pg, i) {
    var crumbs = pg.querySelector('.crumbs');
    if (crumbs && navById[pg.id]) {
      crumbs.textContent = crumbPath(navById[pg.id]).join(' / ') + ' / ';
      crumbs.appendChild(el('b', '', title(pg)));
    }
    var box = pg.querySelector('.pager');
    if (!box) return;
    if (pages[i - 1]) box.appendChild(link(pages[i - 1], 'prev', 'Previous'));
    if (pages[i + 1]) box.appendChild(link(pages[i + 1], 'next', 'Next'));
  });
  window.addEventListener('hashchange', route);
  route();

  /* boolean lab */
  var state = { a: true, b: false };
  function show(e, v) { e.textContent = String(v); tone(e, v); }
  function update() {
    ['a', 'b'].forEach(function (k) {
      var t = $('tog-' + k);
      t.setAttribute('aria-pressed', String(state[k]));
      t.querySelector('.tog-val').textContent = String(state[k]);
    });
    show($('r-and'), state.a && state.b);
    show($('r-or'), state.a || state.b);
    show($('r-nota'), !state.a);
    show($('r-notb'), !state.b);
  }
  ['a', 'b'].forEach(function (k) {
    $('tog-' + k).addEventListener('click', function () { state[k] = !state[k]; update(); });
  });
  update();

  /* short-circuit lab */
  var vals = [
    ['"hello"', 'hello'], ['""', ''], ['0', 0], ['42', 42], ['null', null],
    ['undefined', undefined], ['true', true], ['false', false], ['[]', []], ['"0"', '0'], ['NaN', NaN]
  ];
  function kind(v) { return v ? 'truthy' : 'falsy'; }
  function names(ops) { return ops.map(function (o) { return o[0]; }); }
  function listJoin(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function explain(op, ops) {
    var want = op === '||';
    var parts = [];
    for (var i = 0; i < ops.length; i++) {
      var lbl = ops[i][0], tr = !!ops[i][1];
      if (tr === want) {
        parts.push(lbl + ' is the first ' + kind(want) + ' value encountered, so ' + op + ' stops and returns it.');
        var rest = names(ops.slice(i + 1));
        if (rest.length) parts.push(listJoin(rest) + (rest.length > 1 ? ' are' : ' is') + ' never evaluated.');
        return { val: lbl, why: parts.join(' ') };
      }
      if (i < ops.length - 1) parts.push(lbl + ' is ' + kind(tr) + ', so ' + op + ' moves on to ' + ops[i + 1][0] + '.');
      else parts.push(lbl + ' is ' + kind(tr) + ' too.');
    }
    var last = ops[ops.length - 1][0];
    parts.push('No ' + kind(want) + ' value was found, so ' + op + ' returns the last value, ' + last + '.');
    return { val: last, why: parts.join(' ') };
  }
  var OPS = ['&&', '||'];
  var ROW = '<div class="sc-row"><div class="sc-expr"><code></code></div>' +
    '<div class="sc-result"><span class="sc-arrow">&rarr;</span> <code class="sc-val"></code></div>' +
    '<p class="sc-why"></p></div>';
  /* fills figure #id with one select per label and one result row per operator */
  function setupLab(id, labels, optionalFrom, defaults) {
    var fig = $(id);
    fig.querySelector('.sc-controls').innerHTML = labels.map(function (label, n) {
      var sid = id + '-v' + (n + 1);
      return '<span class="sc-field"><label for="' + sid + '">' + label + '</label><select id="' + sid + '"></select></span>';
    }).join('');
    fig.querySelector('.sc-out').innerHTML = OPS.map(function () { return ROW; }).join('');
    var sels = all('select', fig);
    var rows = all('.sc-row', fig);
    sels.forEach(function (s, n) {
      if (n >= optionalFrom) s.add(new Option('none', ''));
      vals.forEach(function (v, i) { s.add(new Option(v[0], i)); });
      s.value = defaults[n];
      s.addEventListener('change', sc);
    });
    function sc() {
      var ops = sels.filter(function (s) { return s.value !== ''; }).map(function (s) { return vals[s.value]; });
      rows.forEach(function (row, i) {
        var r = explain(OPS[i], ops);
        row.querySelector('.sc-expr code').textContent = names(ops).join(' ' + OPS[i] + ' ');
        row.querySelector('.sc-val').textContent = r.val;
        row.querySelector('.sc-why').textContent = r.why;
      });
    }
    sc();
  }
  setupLab('sc2', ['Left', 'Right'], 2, ['0', '2']);
  setupLab('scm', ['Value 1', 'Value 2', 'Value 3', 'Value 4'], 3, ['0', '3', '2', '']);

  /* ternary lab */
  var tScore = $('tern-score');
  function tern() {
    var score = Number(tScore.value), ok = score >= 50;
    $('tern-score-v').textContent = score;
    $('tern-cond').textContent = score + ' >= 50';
    $('tern-yes').classList.toggle('off', !ok);
    $('tern-no').classList.toggle('off', ok);
    var res = $('tern-res');
    res.textContent = ok ? '"Passed"' : '"Failed"';
    tone(res, ok);
  }
  tScore.addEventListener('input', tern);
  tern();

  var btn = $('menu-btn');
  function setNav(open) {
    document.body.classList.toggle('nav-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? 'Close' : 'Menu';
  }
  btn.addEventListener('click', function () { setNav(!document.body.classList.contains('nav-open')); });
  all('.side a').forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });

  var search = $('search');
  search.addEventListener('input', function () {
    var q = search.value.trim().toLowerCase();
    navLinks.forEach(function (a) {
      a.hidden = q && a.textContent.toLowerCase().indexOf(q) === -1;
    });
  });
})();
