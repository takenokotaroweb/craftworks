// 1) 日本語 / English の表示切り替え
//    英語の文は、各要素の data-en(文字)、data-en-alt(画像の説明)、
//    data-en-label(読み上げ用の名前)、data-en-content(検索用の説明)に入っている
(function () {
  var KEY = 'lang';
  var ATTRS = [['alt', 'en-alt'], ['aria-label', 'en-label'], ['content', 'en-content']];

  function readSaved() {
    try {
      var v = window.localStorage.getItem(KEY);
      if (v === 'ja' || v === 'en') { return v; }
    } catch (e) { /* 保存できない環境では何もしない */ }
    return null;
  }

  function save(lang) {
    try { window.localStorage.setItem(KEY, lang); } catch (e) { /* 何もしない */ }
  }

  // 保存した選択がなければ、ブラウザの言語が日本語かどうかで決める
  function firstLang() {
    var saved = readSaved();
    if (saved) { return saved; }
    var nav = String(window.navigator.language || 'ja').toLowerCase();
    return nav.indexOf('ja') === 0 ? 'ja' : 'en';
  }

  // 日本語の元の文を覚えておく
  var textNodes = document.querySelectorAll('[data-en]');
  Array.prototype.forEach.call(textNodes, function (el) {
    el.setAttribute('data-ja', el.innerHTML);
  });
  ATTRS.forEach(function (pair) {
    var nodes = document.querySelectorAll('[data-' + pair[1] + ']');
    Array.prototype.forEach.call(nodes, function (el) {
      el.setAttribute('data-ja-' + pair[0], el.getAttribute(pair[0]) || '');
    });
  });

  var buttons = document.querySelectorAll('.lang [data-lang]');

  function apply(lang) {
    var en = lang === 'en';
    document.documentElement.lang = en ? 'en' : 'ja';
    Array.prototype.forEach.call(textNodes, function (el) {
      el.innerHTML = en ? el.getAttribute('data-en') : el.getAttribute('data-ja');
    });
    ATTRS.forEach(function (pair) {
      var nodes = document.querySelectorAll('[data-' + pair[1] + ']');
      Array.prototype.forEach.call(nodes, function (el) {
        el.setAttribute(pair[0], en ? el.getAttribute('data-' + pair[1]) : el.getAttribute('data-ja-' + pair[0]));
      });
    });
    Array.prototype.forEach.call(buttons, function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
  }

  Array.prototype.forEach.call(buttons, function (b) {
    b.addEventListener('click', function () {
      var lang = b.getAttribute('data-lang');
      apply(lang);
      save(lang);
    });
  });

  var start = firstLang();
  if (start === 'en') { apply('en'); }
})();

// 2) 商品ページの写真を、クリックで拡大表示(もう一度クリック、または Esc で閉じる)
(function () {
  var links = document.querySelectorAll('.gallery .g-link');
  if (!links.length) { return; }

  var overlay = null;
  var big = null;
  var lastLink = null;

  function label() {
    return document.documentElement.lang === 'en'
      ? 'Enlarged photo (click or press Esc to close)'
      : '拡大した写真(クリックまたはEscキーで閉じます)';
  }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.tabIndex = -1;
    big = document.createElement('img');
    big.className = 'lightbox-img';
    overlay.appendChild(big);
    overlay.addEventListener('click', close);
    document.body.appendChild(overlay);
  }

  function open(link) {
    var img = link.querySelector('img');
    if (!overlay) { build(); }
    overlay.setAttribute('aria-label', label());
    big.src = link.getAttribute('href');
    big.alt = img ? img.alt : '';
    lastLink = link;
    overlay.classList.add('is-open');
    document.body.classList.add('lightbox-lock');
    overlay.focus();
  }

  function close() {
    if (!overlay || !overlay.classList.contains('is-open')) { return; }
    overlay.classList.remove('is-open');
    document.body.classList.remove('lightbox-lock');
    big.removeAttribute('src');
    if (lastLink) { lastLink.focus(); }
  }

  Array.prototype.forEach.call(links, function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      open(link);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') { close(); }
  });
})();

// 3) トップの切り替え写真: 「動きを減らす」設定の端末では、動きなしで6秒ごとに入れ替える
//    (設定がオフの端末は、CSSのふわっと切り替わる動きで動く)
(function () {
  var box = document.querySelector('.hero-slides');
  if (!box || !window.matchMedia) { return; }
  var slides = box.querySelectorAll('.hero-slide');
  if (slides.length < 2) { return; }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var canHover = window.matchMedia('(hover: hover)').matches;
  var timer = null;
  var index = 0;
  var held = false;

  function show(i) {
    Array.prototype.forEach.call(slides, function (s, n) {
      if (n === i) { s.classList.add('is-on'); } else { s.classList.remove('is-on'); }
    });
  }

  function tick() {
    if (held) { return; }
    index = (index + 1) % slides.length;
    show(index);
  }

  function start() {
    box.classList.add('is-stepping');
    index = 0;
    show(0);
    if (timer === null) { timer = window.setInterval(tick, 6000); }
  }

  function stop() {
    box.classList.remove('is-stepping');
    Array.prototype.forEach.call(slides, function (s) { s.classList.remove('is-on'); });
    if (timer !== null) { window.clearInterval(timer); timer = null; }
  }

  function update() {
    if (reduce.matches) { start(); } else { stop(); }
  }

  // 写真に乗っている間・操作している間は、入れ替えを止める
  if (canHover) {
    box.addEventListener('mouseenter', function () { held = true; });
    box.addEventListener('mouseleave', function () { held = false; });
  }
  box.addEventListener('focusin', function () { held = true; });
  box.addEventListener('focusout', function () { held = false; });

  update();
  if (reduce.addEventListener) { reduce.addEventListener('change', update); }
  else if (reduce.addListener) { reduce.addListener(update); }
})();

// 4) スマホ・タブレット(指で操作する端末)では、メルカリへのリンクを「同じタブ」で開く
//    新しいタブで開くと、iPhoneのSafariで、メルカリのアプリが起動しないことがあるため。
//    パソコンでは、これまでどおり新しいタブで開く。
(function () {
  if (!window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) { return; }
  var links = document.querySelectorAll('a[href^="https://jp.mercari.com/"]');
  Array.prototype.forEach.call(links, function (a) {
    a.removeAttribute('target');
  });
})();