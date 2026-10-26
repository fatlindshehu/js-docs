(function () {
  function $(id) {
    return document.getElementById(id);
  }
  function all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
  /* green or red result chip */
  function tone(e, ok) {
    e.classList.toggle('yes', ok);
    e.classList.toggle('no', !ok);
  }

  /* syntax colours: each code block is re-tokenised from its text, so the existing comment spans come back the same */
  var hlRe = new RegExp(
    [
      '(\\/\\/.*|\\/\\*[\\s\\S]*?\\*\\/)',
      '("(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'|`(?:\\\\.|[^`\\\\])*`)',
      '\\b(\\d[\\d_]*(?:\\.\\d+)?n?|true|false|null|undefined|NaN|Infinity)\\b',
      '\\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|typeof|instanceof|async|await|try|catch|finally|throw|of|in|default|delete|this|import|export|from)\\b',
      '([A-Za-z_$][\\w$]*)(?=\\s*\\()'
    ].join('|'),
    'g'
  );
  var hlCls = [null, 'cm', 'tk-s', 'tk-n', 'tk-k', 'tk-f'];
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function hl(src) {
    var out = '', last = 0, m;
    hlRe.lastIndex = 0;
    while ((m = hlRe.exec(src))) {
      var g = 1;
      while (m[g] === undefined) g++;
      /* a token spanning lines is closed and reopened at each line break, so the output can be split into lines */
      var open = '<span class="' + hlCls[g] + '">';
      out += esc(src.slice(last, m.index)) + open + esc(m[0]).split('\n').join('</span>\n' + open) + '</span>';
      last = hlRe.lastIndex;
    }
    return out + esc(src.slice(last));
  }
  /* HTML snippets start with "<" and are left as they are */
  all('pre.code code').forEach(function (c) {
    if (c.textContent.trim().charAt(0) !== '<') c.innerHTML = hl(c.textContent);
  });

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
  var chapters = all('.side .nav-chap');
  /* page id -> its nav item: a link, or a chapter's summary for the chapter's own page */
  var navById = {};
  navLinks.forEach(function (a) {
    navById[a.hash.slice(1)] = a;
  });
  chapters.forEach(function (d) {
    var s = d.querySelector('summary');
    navById[d.dataset.page] = s;
    all('a', d).forEach(function (a, i) {
      a.insertBefore(el('span', 'nav-n', String(i + 1)), a.firstChild);
    });
    /* clicking a closed chapter opens it and shows its overview page */
    s.addEventListener('click', function () {
      if (!d.open) location.hash = d.dataset.page;
    });
  });
  var current = null;
  function route() {
    var id = location.hash.slice(1);
    var target = id ? document.getElementById(id) : null;
    var page = target ? target.closest('article.doc') : null;
    if (!page) {
      page = pages[0];
      target = page;
    }
    var changed = page !== current;
    pages.forEach(function (p) {
      p.hidden = p !== page;
    });
    current = page;
    navLinks.forEach(function (a) {
      var hid = a.hash.slice(1);
      a.classList.toggle(
        'on',
        hid === page.id || (target !== page && hid === target.id),
      );
    });
    chapters.forEach(function (d) {
      d.querySelector('summary').classList.toggle(
        'on',
        d.dataset.page === page.id,
      );
      if (d.contains(navById[page.id])) d.open = true;
    });
    if (target === page) {
      window.scrollTo(0, 0);
    } else {
      target.scrollIntoView();
    }
    if (changed && page.id === 'values') play();
  }

  /* breadcrumbs come from the nav group and chapter around the page's nav item, the pager from neighbouring pages */
  function title(pg) {
    return pg.querySelector('h1').textContent;
  }
  function crumbPath(item) {
    var path = [item.closest('.nav-group').querySelector('.nav-h').textContent];
    var chap = item.closest('.nav-chap');
    if (chap && item.tagName === 'A')
      path.push(chap.querySelector('summary').textContent);
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
  /* chapter overview: one card per page in the chapter, built from the page's h1 and lede */
  all('article.doc .toc').forEach(function (ol) {
    all('a', navById[ol.closest('article').id].closest('.nav-chap')).forEach(
      function (a) {
        var pg = $(a.hash.slice(1));
        var card = el('a');
        card.href = a.hash;
        card.appendChild(
          el('span', 'sec-no op', a.querySelector('.nav-n').textContent),
        );
        card.appendChild(el('span', 'toc-t', title(pg)));
        card.appendChild(
          el('span', 'toc-d', pg.querySelector('.lede').textContent),
        );
        var li = el('li');
        li.appendChild(card);
        ol.appendChild(li);
      },
    );
  });
  window.addEventListener('hashchange', route);
  route();

  /* boolean lab */
  var state = { a: true, b: false };
  function show(e, v) {
    e.textContent = String(v);
    tone(e, v);
  }
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
    $('tog-' + k).addEventListener('click', function () {
      state[k] = !state[k];
      update();
    });
  });
  update();

  /* short-circuit lab */
  var vals = [
    ['"hello"', 'hello'],
    ['""', ''],
    ['0', 0],
    ['42', 42],
    ['null', null],
    ['undefined', undefined],
    ['true', true],
    ['false', false],
    ['[]', []],
    ['"0"', '0'],
    ['NaN', NaN],
  ];
  function kind(v) {
    return v ? 'truthy' : 'falsy';
  }
  function names(ops) {
    return ops.map(function (o) {
      return o[0];
    });
  }
  function listJoin(a) {
    return a.length < 2
      ? a.join('')
      : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  }
  function explain(op, ops) {
    var want = op === '||';
    var parts = [];
    for (var i = 0; i < ops.length; i++) {
      var lbl = ops[i][0],
        tr = !!ops[i][1];
      if (tr === want) {
        parts.push(
          lbl +
            ' is the first ' +
            kind(want) +
            ' value encountered, so ' +
            op +
            ' stops and returns it.',
        );
        var rest = names(ops.slice(i + 1));
        if (rest.length)
          parts.push(
            listJoin(rest) +
              (rest.length > 1 ? ' are' : ' is') +
              ' never evaluated.',
          );
        return { val: lbl, why: parts.join(' ') };
      }
      if (i < ops.length - 1)
        parts.push(
          lbl +
            ' is ' +
            kind(tr) +
            ', so ' +
            op +
            ' moves on to ' +
            ops[i + 1][0] +
            '.',
        );
      else parts.push(lbl + ' is ' + kind(tr) + ' too.');
    }
    var last = ops[ops.length - 1][0];
    parts.push(
      'No ' +
        kind(want) +
        ' value was found, so ' +
        op +
        ' returns the last value, ' +
        last +
        '.',
    );
    return { val: last, why: parts.join(' ') };
  }
  var OPS = ['&&', '||'];
  var ROW =
    '<div class="sc-row"><div class="sc-expr"><code></code></div>' +
    '<div class="sc-result"><span class="sc-arrow">&rarr;</span> <code class="sc-val"></code></div>' +
    '<p class="sc-why"></p></div>';
  /* fills figure #id with one select per label and one result row per operator */
  function setupLab(id, labels, optionalFrom, defaults) {
    var fig = $(id);
    fig.querySelector('.sc-controls').innerHTML = labels
      .map(function (label, n) {
        var sid = id + '-v' + (n + 1);
        return (
          '<span class="sc-field"><label for="' +
          sid +
          '">' +
          label +
          '</label><select id="' +
          sid +
          '"></select></span>'
        );
      })
      .join('');
    fig.querySelector('.sc-out').innerHTML = OPS.map(function () {
      return ROW;
    }).join('');
    var sels = all('select', fig);
    var rows = all('.sc-row', fig);
    sels.forEach(function (s, n) {
      if (n >= optionalFrom) s.add(new Option('none', ''));
      vals.forEach(function (v, i) {
        s.add(new Option(v[0], i));
      });
      s.value = defaults[n];
      s.addEventListener('change', sc);
    });
    function sc() {
      var ops = sels
        .filter(function (s) {
          return s.value !== '';
        })
        .map(function (s) {
          return vals[s.value];
        });
      rows.forEach(function (row, i) {
        var r = explain(OPS[i], ops);
        row.querySelector('.sc-expr code').textContent = names(ops).join(
          ' ' + OPS[i] + ' ',
        );
        row.querySelector('.sc-val').textContent = r.val;
        row.querySelector('.sc-why').textContent = r.why;
      });
    }
    sc();
  }
  setupLab('sc2', ['Left', 'Right'], 2, ['0', '2']);
  setupLab('scm', ['Value 1', 'Value 2', 'Value 3', 'Value 4'], 3, [
    '0',
    '3',
    '2',
    '',
  ]);

  /* ternary lab */
  var tScore = $('tern-score');
  function tern() {
    var score = Number(tScore.value),
      ok = score >= 50;
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

  /* return stepper */
  var rIn = $('ret-in');
  function retStep() {
    var h = rIn.value;
    $('ret-in-v').textContent = h;
    $('ret-a1').textContent = h;
    $('ret-a2').textContent = h;
    $('ret-out').textContent = h * 60;
  }
  rIn.addEventListener('input', retStep);
  retStep();

  /* call stack player: each step is the highlighted line, the frames bottom first, and an optional pushed or popped frame */
  var csCode = [
    'function square(n) {',
    '  return n * n;',
    '}',
    'function sumOfSquares(a, b) {',
    '  const x = square(a);',
    '  const y = square(b);',
    '  return x + y;',
    '}',
    'function printResult() {',
    '  const total = sumOfSquares(3, 4);',
    '  console.log(total);',
    '}',
    '',
    'printResult();',
  ];
  var G = { f: 'global' },
    PR = { f: 'printResult()' };
  var csSteps = [
    {
      l: 14,
      s: [G],
      say: 'The script starts at the last line. The global frame is always at the bottom of the stack.',
    },
    {
      l: 10,
      s: [G, PR],
      push: 1,
      say: '<code>printResult()</code> is called and pushed on top. Its first line calls <code>sumOfSquares(3, 4)</code>.',
    },
    {
      l: 5,
      s: [G, PR, { f: 'sumOfSquares(3, 4)', v: 'a = 3, b = 4' }],
      push: 1,
      say: '<code>sumOfSquares(3, 4)</code> is pushed. <code>printResult()</code> is paused below it, waiting for the result.',
    },
    {
      l: 2,
      s: [
        G,
        PR,
        { f: 'sumOfSquares(3, 4)', v: 'a = 3, b = 4' },
        { f: 'square(3)', v: 'n = 3' },
      ],
      push: 1,
      say: '<code>square(3)</code> is pushed. Only the top frame runs; the three below it wait.',
    },
    {
      l: 5,
      s: [G, PR, { f: 'sumOfSquares(3, 4)', v: 'a = 3, b = 4, x = 9' }],
      pop: { f: 'square(3)', r: '9' },
      say: '<code>square(3)</code> returns 9 and is popped. <code>sumOfSquares</code> continues on the same line and stores <code>x = 9</code>.',
    },
    {
      l: 2,
      s: [
        G,
        PR,
        { f: 'sumOfSquares(3, 4)', v: 'a = 3, b = 4, x = 9' },
        { f: 'square(4)', v: 'n = 4' },
      ],
      push: 1,
      say: '<code>square(4)</code> is pushed: the same function, but a new frame with its own <code>n</code>.',
    },
    {
      l: 6,
      s: [G, PR, { f: 'sumOfSquares(3, 4)', v: 'a = 3, b = 4, x = 9, y = 16' }],
      pop: { f: 'square(4)', r: '16' },
      say: '<code>square(4)</code> returns 16 and is popped. <code>sumOfSquares</code> stores <code>y = 16</code>.',
    },
    {
      l: 10,
      s: [G, { f: 'printResult()', v: 'total = 25' }],
      pop: { f: 'sumOfSquares(3, 4)', r: '25' },
      say: '<code>sumOfSquares</code> returns <code>x + y</code>, which is 25, and is popped. <code>printResult()</code> continues and stores <code>total = 25</code>.',
    },
    {
      l: 11,
      s: [G, { f: 'printResult()', v: 'total = 25' }, { f: 'console.log(25)' }],
      push: 1,
      out: '25',
      say: '<code>console.log(25)</code> is pushed and prints 25 to the console.',
    },
    {
      l: 11,
      s: [G, { f: 'printResult()', v: 'total = 25' }],
      pop: { f: 'console.log(25)' },
      say: '<code>console.log</code> is done and is popped.',
    },
    {
      l: 14,
      s: [G],
      pop: { f: 'printResult()' },
      say: '<code>printResult()</code> reaches its end and is popped. Only the global frame is left, so the script is finished.',
    },
  ];
  var csLines = csCode.map(function (t) {
    var ln = el('span', 'ln');
    ln.innerHTML = hl(t);
    $('cs-code').appendChild(ln);
    return ln;
  });
  function frame(fr, cls) {
    var d = el('div', 'cs-fr' + (cls ? ' ' + cls : ''));
    d.appendChild(el('span', '', fr.f));
    if (fr.v) d.appendChild(el('small', '', fr.v));
    if (fr.r) d.appendChild(el('span', 'cs-ret', 'returns ' + fr.r));
    return d;
  }
  var csAt = 0,
    csTimer = null;
  function csShow() {
    var st = csSteps[csAt],
      box = $('cs-stack');
    csLines.forEach(function (ln, i) {
      ln.classList.toggle('cur', i + 1 === st.l);
    });
    box.textContent = '';
    st.s.forEach(function (fr, i) {
      var top = i === st.s.length - 1;
      box.appendChild(
        frame(
          fr,
          (fr === G ? 'glob ' : '') +
            (top ? 'top' : '') +
            (top && st.push ? ' in' : ''),
        ),
      );
    });
    if (st.pop) box.appendChild(frame(st.pop, 'gone'));
    var outs = csSteps.slice(0, csAt + 1).filter(function (x) {
      return x.out;
    });
    $('cs-out').textContent = outs
      .map(function (x) {
        return x.out;
      })
      .join('\n');
    $('cs-say').innerHTML = st.say;
    $('cs-count').textContent = 'Step ' + (csAt + 1) + ' / ' + csSteps.length;
    $('cs-prev').disabled = csAt === 0;
    $('cs-next').disabled = csAt === csSteps.length - 1;
  }
  function csGo(i) {
    csAt = Math.max(0, Math.min(csSteps.length - 1, i));
    csShow();
  }
  function csStop() {
    clearInterval(csTimer);
    csTimer = null;
    $('cs-play').textContent = 'Play';
  }
  $('cs-prev').addEventListener('click', function () {
    csStop();
    csGo(csAt - 1);
  });
  $('cs-next').addEventListener('click', function () {
    csStop();
    csGo(csAt + 1);
  });
  $('cs-reset').addEventListener('click', function () {
    csStop();
    csGo(0);
  });
  $('cs-play').addEventListener('click', function () {
    if (csTimer) {
      csStop();
      return;
    }
    if (csAt === csSteps.length - 1) csGo(0);
    $('cs-play').textContent = 'Pause';
    csTimer = setInterval(function () {
      csGo(csAt + 1);
      if (csAt === csSteps.length - 1) csStop();
    }, 2200);
  });
  csShow();

  /* runtime player: chips carry a key (k), and a chip whose key was already on screen glides from its old box to its new one */
  var rtCode = [
    'const user = { name: "Anna" };',
    'console.log("Start");',
    'setTimeout(() => {',
    '  console.log("Hi " + user.name);',
    '}, 2000);',
    'console.log("End");'
  ];
  var OBJ = { k: 'obj', t: '{ name: "Anna" }', c: 'obj' }, GL = { k: 'g', t: 'global', v: 'user → heap' };
  function cb(p) { return { k: 'cb', t: '() => {…}', c: 'arg', v: p === undefined ? '' : 'timer: 2 s', p: p }; }
  var rtSteps = [
    { l: 1, stack: [GL], heap: [OBJ], say: 'The object <code>{ name: "Anna" }</code> is stored in the <b>heap</b>. The variable <code>user</code> in the global frame points to it.' },
    { l: 2, stack: [GL, { k: 'log1', t: 'console.log("Start")' }], out: 'Start', say: '<code>console.log</code> runs on the call stack straight away.' },
    { l: 3, stack: [GL, { k: 'st', t: 'setTimeout(cb, 2000)' }], web: [cb(0)], arrows: ['sw'], say: '<code>setTimeout</code> is a Web API. It hands the callback and the 2-second timer to the browser, and returns right away.' },
    { l: 6, stack: [GL, { k: 'log2', t: 'console.log("End")' }], web: [cb(40)], out: 'End', say: 'JavaScript does not wait for the timer. It moves on to the next line while the timer runs in the browser.' },
    { l: 0, stack: [], web: [cb(75)], say: 'The script is finished and the call stack is empty. The timer is still running.' },
    { l: 0, stack: [], queue: [cb()], arrows: ['wq'], say: 'After 2 seconds the timer is done. The browser puts the callback in the <b>callback queue</b>, where it waits for its turn.' },
    { l: 3, stack: [{ k: 'cb', t: 'callback()', c: 'arg' }], loop: 1, arrows: ['ql', 'ls'], say: 'The <b>event loop</b> sees that the call stack is empty and moves the callback onto it. Only now does the callback run.' },
    { l: 4, stack: [{ k: 'cb', t: 'callback()', c: 'arg' }, { k: 'log3', t: 'console.log("Hi " + user.name)' }], out: 'Hi Anna', say: 'The callback reads <code>user.name</code> from the heap and logs <b>Hi Anna</b>, after Start and End.' },
    { l: 0, stack: [], say: 'The callback returns and the stack is empty again. The event loop keeps watching for the next callback.' }
  ];
  var rtLines = rtCode.map(function (t) {
    var ln = el('span', 'ln');
    ln.innerHTML = hl(t);
    $('rt-code').appendChild(ln);
    return ln;
  });
  var rtMotion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rtChip(it) {
    var d = el('div', 'rt-chip ' + (it.c || 'val'));
    d.dataset.k = it.k;
    d.appendChild(el('span', '', it.t));
    if (it.v) d.appendChild(el('small', '', it.v));
    if (it.p !== undefined) {
      var bar = el('div', 'rt-bar'), fill = el('i');
      fill.style.width = it.p + '%';
      bar.appendChild(fill);
      d.appendChild(bar);
    }
    return d;
  }
  var rtAt = 0, rtTimer = null;
  function rtShow() {
    var st = rtSteps[rtAt], fig = $('rt'), before = {}, bars = {};
    all('[data-k]', fig).forEach(function (e) {
      before[e.dataset.k] = e.getBoundingClientRect();
      var f = e.querySelector('.rt-bar i');
      if (f) bars[e.dataset.k] = f.style.width;
    });
    rtLines.forEach(function (ln, i) { ln.classList.toggle('cur', i + 1 === st.l); });
    [['rt-stack', st.stack], ['rt-heap', [OBJ]], ['rt-web', st.web], ['rt-queue', st.queue]].forEach(function (b) {
      var box = $(b[0]);
      box.textContent = '';
      (b[1] || []).forEach(function (it) { box.appendChild(rtChip(it)); });
    });
    all('.rt-arrow', fig).forEach(function (a) { a.classList.toggle('on', (st.arrows || []).indexOf(a.dataset.a) > -1); });
    $('rt-loop').classList.toggle('on', !!st.loop);
    $('rt-loop-t').textContent = st.loop ? 'Stack is empty: moving the callback' : 'Watching the call stack';
    $('rt-out').textContent = rtSteps.slice(0, rtAt + 1).filter(function (x) { return x.out; }).map(function (x) { return x.out; }).join('\n');
    $('rt-say').innerHTML = st.say;
    $('rt-count').textContent = 'Step ' + (rtAt + 1) + ' / ' + rtSteps.length;
    $('rt-prev').disabled = rtAt === 0;
    $('rt-next').disabled = rtAt === rtSteps.length - 1;
    if (!rtMotion) return;
    all('[data-k]', fig).forEach(function (e) {
      var old = before[e.dataset.k];
      if (!old) { e.classList.add('in'); return; }
      var now = e.getBoundingClientRect(), dx = old.left - now.left, dy = old.top - now.top;
      var f = e.querySelector('.rt-bar i');
      if (f && bars[e.dataset.k]) {
        var w = f.style.width;
        f.style.transition = 'none';
        f.style.width = bars[e.dataset.k];
        void f.offsetWidth;
        f.style.transition = '';
        f.style.width = w;
      }
      if (!dx && !dy) return;
      e.style.transition = 'none';
      e.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
      void e.offsetWidth;
      e.style.transition = 'transform .7s cubic-bezier(.3, .7, .3, 1)';
      e.style.transform = '';
    });
  }
  function rtGo(i) { rtAt = Math.max(0, Math.min(rtSteps.length - 1, i)); rtShow(); }
  function rtStop() { clearInterval(rtTimer); rtTimer = null; $('rt-play').textContent = 'Play'; }
  $('rt-prev').addEventListener('click', function () { rtStop(); rtGo(rtAt - 1); });
  $('rt-next').addEventListener('click', function () { rtStop(); rtGo(rtAt + 1); });
  $('rt-reset').addEventListener('click', function () { rtStop(); rtGo(0); });
  $('rt-play').addEventListener('click', function () {
    if (rtTimer) { rtStop(); return; }
    if (rtAt === rtSteps.length - 1) rtGo(0);
    $('rt-play').textContent = 'Pause';
    rtTimer = setInterval(function () {
      rtGo(rtAt + 1);
      if (rtAt === rtSteps.length - 1) rtStop();
    }, 2600);
  });
  rtShow();

  /* XMLHttpRequest player: each step names the highlighted line(s) and the state of the request object, network, variables and page */
  var xrCode = [
    'const request = new XMLHttpRequest();',
    "request.open('GET', 'https://countries-api-836d.onrender.com/countries/name/portugal');",
    'request.send();',
    '',
    "request.addEventListener('load', function () {",
    '  const [data] = JSON.parse(this.responseText);',
    '',
    '  const html = `',
    '    <article class="country">',
    '      <img class="country__img" src="${data.flag}" />',
    '      <h3 class="country__name">${data.name}</h3>',
    '      <h4 class="country__region">${data.region}</h4>',
    '    </article>`;',
    '',
    "  countriesContainer.insertAdjacentHTML('beforeend', html);",
    '  countriesContainer.style.opacity = 1;',
    '});'
  ].join('\n');
  var xrRes = '"[{\\"name\\":\\"Portugal\\",\\"region\\":\\"Europe\\", …}]"';
  var xrSteps = [
    { l: [1], net: 'idle', req: ['0 · UNSENT', '0', '—', '""', '—'],
      say: '<code>new XMLHttpRequest()</code> creates an empty request object and stores it in <code>request</code>. Nothing has been sent.' },
    { l: [2], net: 'idle', req: ['1 · OPENED', '0', "GET …/name/portugal", '""', '—'],
      say: '<code>open()</code> only configures the request: the method <code>GET</code> and the URL. Still nothing is sent.' },
    { l: [3], net: 'out', req: ['1 · OPENED', '0', "GET …/name/portugal", '""', '—'],
      say: '<code>send()</code> hands the request to the Web APIs, which send it to the server. JavaScript does not wait; it moves on to the next line.' },
    { l: [5], net: 'wait', req: ['1 · OPENED', '0', "GET …/name/portugal", '""', 'function () {…}'],
      say: '<code>addEventListener</code> registers the callback for the <code>load</code> event. The script is finished and the call stack is empty while the server works.' },
    { l: [5], net: 'back', req: ['4 · DONE', '200', "GET …/name/portugal", xrRes, 'function () {…}'],
      say: 'The response arrives: <code>readyState</code> 4 (done), <code>status</code> 200, and <code>responseText</code> holds the data as one long <b>string</b>. The <code>load</code> event fires, and the callback goes through the callback queue onto the call stack.' },
    { l: [6], net: 'done', data: 1,
      say: '<code>JSON.parse</code> turns the text into a real array. Destructuring <code>[data]</code> takes its first element: the Portugal object.' },
    { l: [8, 13], net: 'done', data: 1, html: 1,
      say: 'The template literal fills the card\'s HTML with values from <code>data</code>. It is still only a string, not on the page.' },
    { l: [15], net: 'done', data: 1, html: 1, page: 'o0',
      say: '<code>insertAdjacentHTML</code> adds the card to the page, at the end of the container. It is there, but the container\'s <code>opacity</code> is still 0.' },
    { l: [16], net: 'done', data: 1, html: 1, page: 'o1',
      say: 'Setting <code>opacity</code> to 1 fades the container in. The card is visible, and the page never reloaded.' }
  ];
  /* steps from the callback on keep the request as it was when the response arrived */
  xrSteps.forEach(function (st, i) {
    if (!st.req) st.req = xrSteps[i - 1].req;
  });
  var xrReqKeys = ['readyState', 'status', 'method, URL', 'responseText', "'load' listener"];
  var xrNetText = {
    idle: 'No request yet',
    out: 'Request on its way: GET /countries/name/portugal',
    wait: 'The server is working…',
    back: 'Response on its way back: 200 OK + data',
    done: 'Request finished'
  };
  var xrLines = hl(xrCode).split('\n').map(function (h) {
    var ln = el('span', 'ln');
    ln.innerHTML = h;
    $('xr-code').appendChild(ln);
    return ln;
  });
  function xrRows(id, rows, prev) {
    var box = $(id);
    box.textContent = '';
    rows.forEach(function (r, i) {
      var row = el('div', 'xr-row' + (prev && prev[i] !== r[1] ? ' chg' : ''));
      row.appendChild(el('span', 'xr-k', r[0]));
      row.appendChild(el('code', 'xr-v', r[1]));
      box.appendChild(row);
    });
  }
  var xrPrev = null;
  function xrShow(i) {
    var st = xrSteps[i], prev = xrPrev, from = st.l[0], to = st.l[st.l.length - 1];
    xrLines.forEach(function (ln, n) { ln.classList.toggle('cur', n + 1 >= from && n + 1 <= to); });
    $('xr-say').innerHTML = st.say;
    xrRows('xr-req', xrReqKeys.map(function (k, n) { return [k, st.req[n]]; }), prev && prev.req);
    var vars = [
      ['data', st.data ? '{ name: "Portugal", region: "Europe", flag: "…/pt.svg", … }' : '—'],
      ['html', st.html ? '"<article class=\\"country\\"> … Portugal … </article>"' : '—']
    ];
    xrRows('xr-vars', vars, prev && prev.vars);
    var net = $('xr-net');
    if (!prev || prev.net !== st.net) {
      net.className = 'xr-net';
      void net.offsetWidth;
      net.classList.add(st.net);
    }
    $('xr-net-t').textContent = xrNetText[st.net];
    var cont = $('xr-cont');
    cont.className = 'xr-countries' + (st.page ? ' ' + st.page : '');
    if (!st.page) cont.textContent = '';
    else if (!cont.firstChild) {
      cont.innerHTML = '<div class="xr-card"><img src="https://flagcdn.com/pt.svg" alt=""><div><b>Portugal</b><small>EUROPE</small></div></div>';
    }
    xrPrev = { req: st.req, vars: vars.map(function (v) { return v[1]; }), net: st.net };
  }

  /* step controls shared by players: prefix-prev / -play / -next / -reset buttons and a prefix-count label */
  function stepper(p, n, show, ms) {
    var at = 0, timer = null;
    function go(i) {
      at = Math.max(0, Math.min(n - 1, i));
      show(at);
      $(p + '-count').textContent = 'Step ' + (at + 1) + ' / ' + n;
      $(p + '-prev').disabled = at === 0;
      $(p + '-next').disabled = at === n - 1;
    }
    function stop() {
      clearInterval(timer);
      timer = null;
      $(p + '-play').textContent = 'Play';
    }
    $(p + '-prev').addEventListener('click', function () { stop(); go(at - 1); });
    $(p + '-next').addEventListener('click', function () { stop(); go(at + 1); });
    $(p + '-reset').addEventListener('click', function () { stop(); go(0); });
    $(p + '-play').addEventListener('click', function () {
      if (timer) { stop(); return; }
      if (at === n - 1) go(0);
      $(p + '-play').textContent = 'Pause';
      timer = setInterval(function () {
        go(at + 1);
        if (at === n - 1) stop();
      }, ms);
    });
    go(0);
  }
  stepper('xr', xrSteps.length, xrShow, 2800);

  var btn = $('menu-btn');
  function setNav(open) {
    document.body.classList.toggle('nav-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? 'Close' : 'Menu';
  }
  btn.addEventListener('click', function () {
    setNav(!document.body.classList.contains('nav-open'));
  });
  all('.side a').forEach(function (a) {
    a.addEventListener('click', function () {
      setNav(false);
    });
  });

  var search = $('search');
  search.addEventListener('input', function () {
    var q = search.value.trim().toLowerCase();
    if (q)
      chapters.forEach(function (d) {
        d.open = true;
      });
    navLinks.forEach(function (a) {
      a.hidden = q && a.textContent.toLowerCase().indexOf(q) === -1;
    });
  });
})();
