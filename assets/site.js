// Tessera — site público: interações da página (tema, menu, tour, ampliar imagem, sumário, lista de passos).
// Sem dependências, sem rastreamento, sem requisições externas.
(function () {
  'use strict';

  var root = document.documentElement;
  var lang = root.lang && root.lang.indexOf('pt') === 0 ? 'pt' : 'en';
  var T = {
    pt: { dark: 'Tema escuro', light: 'Tema claro', close: 'Fechar', copied: 'Copiado', done: '{n} de {t} feitos', zoom: 'Ampliar imagem' },
    en: { dark: 'Dark theme', light: 'Light theme', close: 'Close', copied: 'Copied', done: '{n} of {t} done', zoom: 'Enlarge image' },
  }[lang];

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) {
      return null;
    }
  }

  // ---- tema claro/escuro (segue o sistema até a pessoa escolher)
  var themeBtn = document.querySelector('[data-theme-toggle]');
  function isDark() {
    var t = root.dataset.theme;
    if (t) return t === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function paintThemeBtn() {
    if (!themeBtn) return;
    var dark = isDark();
    themeBtn.setAttribute('aria-pressed', String(dark));
    themeBtn.setAttribute('aria-label', dark ? T.light : T.dark);
    themeBtn.title = dark ? T.light : T.dark;
    // SVG não tem a propriedade .hidden: usa o atributo
    themeBtn.querySelector('[data-icon="moon"]').toggleAttribute('hidden', dark);
    themeBtn.querySelector('[data-icon="sun"]').toggleAttribute('hidden', !dark);
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.dataset.theme = next;
      store('tessera-theme', next);
      paintThemeBtn();
    });
    paintThemeBtn();
  }

  // ---- cabeçalho: borda ao rolar, menu no celular
  var header = document.querySelector('.site-header');
  var readBar = document.querySelector('.read-bar');
  function onScroll() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 4);
    if (readBar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      readBar.style.width = (max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var menuBtn = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---- tour por abas (setas do teclado trocam de aba)
  document.querySelectorAll('[data-tour]').forEach(function (tour) {
    var tabs = Array.prototype.slice.call(tour.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        select(tab);
      });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) {
          e.preventDefault();
          select(next, true);
        }
      });
    });
  });

  // ---- ampliar capturas
  var dialog = null;
  function openLightbox(src, alt) {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'lightbox';
      dialog.innerHTML =
        '<button type="button" class="chip close"></button><img alt=""><p></p>';
      dialog.querySelector('.close').textContent = T.close;
      dialog.querySelector('.close').addEventListener('click', function () {
        dialog.close();
      });
      dialog.addEventListener('click', function (e) {
        if (e.target === dialog) dialog.close();
      });
      document.body.appendChild(dialog);
    }
    var img = dialog.querySelector('img');
    img.src = src;
    img.alt = alt;
    dialog.querySelector('p').textContent = alt;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else window.open(src, '_blank', 'noopener');
  }
  document.querySelectorAll('.shot img').forEach(function (img) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', T.zoom + ': ' + img.alt);
    img.parentNode.insertBefore(btn, img);
    btn.appendChild(img);
    btn.addEventListener('click', function () {
      openLightbox(img.currentSrc || img.src, img.alt);
    });
  });

  // ---- sumário que acompanha a leitura: a última seção cujo topo já passou do cabeçalho
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc a[href^="#"]'));
  var sections = tocLinks
    .map(function (a) {
      return document.getElementById(a.getAttribute('href').slice(1));
    })
    .filter(Boolean);
  function spy() {
    if (!sections.length) return;
    var current = sections[0];
    var atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (atEnd) current = sections[sections.length - 1];
    else
      sections.forEach(function (sec) {
        if (sec.getBoundingClientRect().top <= 140) current = sec;
      });
    tocLinks.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current.id);
    });
  }
  if (sections.length) {
    window.addEventListener('scroll', spy, { passive: true });
    window.addEventListener('hashchange', spy);
    spy();
  }
  // no celular, o sumário fecha depois de escolher uma seção
  var tocDetails = document.querySelector('.toc details');
  if (tocDetails) {
    if (window.matchMedia('(min-width: 1000px)').matches) tocDetails.open = true;
    tocDetails.addEventListener('click', function (e) {
      if (e.target.closest('a') && !window.matchMedia('(min-width: 1000px)').matches) tocDetails.open = false;
    });
  }

  // ---- primeiros passos marcáveis (lembrados só neste navegador)
  document.querySelectorAll('[data-checklist]').forEach(function (list) {
    var key = 'tessera-steps-' + list.getAttribute('data-checklist');
    var boxes = Array.prototype.slice.call(list.querySelectorAll('input[type="checkbox"]'));
    var progress = document.querySelector('[data-progress="' + list.getAttribute('data-checklist') + '"]');
    var saved = (store(key) || '').split(',');
    boxes.forEach(function (b, i) {
      b.checked = saved[i] === '1';
    });
    function update() {
      var n = boxes.filter(function (b) {
        return b.checked;
      }).length;
      store(key, boxes.map(function (b) {
        return b.checked ? '1' : '0';
      }).join(','));
      if (progress) {
        progress.querySelector('i').style.width = (n / boxes.length) * 100 + '%';
        progress.querySelector('span').textContent = T.done.replace('{n}', n).replace('{t}', boxes.length);
      }
    }
    boxes.forEach(function (b) {
      b.addEventListener('change', update);
    });
    update();
  });

  // ---- copiar comandos
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var original = btn.textContent;
      function ok() {
        btn.textContent = T.copied;
        setTimeout(function () {
          btn.textContent = original;
        }, 1500);
      }
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, function () {});
    });
  });
})();
