// Tessera — site público: interações da página (tema, menu, entradas, telas da extensão, demonstração, ampliar imagem, sumário, lista de passos).
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

  // ---- entrada ao rolar: o JS só marca .is-in (com um atraso em cascata); o gesto está no CSS.
  // Sem JS ou com movimento reduzido, nada fica escondido.
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window && !reduced.matches) {
    root.classList.add('can-reveal');
    var seen = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            seen.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      var i = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.setProperty('--delay', (i % 4) * 80 + 'ms');
      seen.observe(el);
    });
    // na impressão, tudo aparece
    window.addEventListener('beforeprint', function () {
      root.classList.remove('can-reveal');
    });
  }

  // ---- telas da extensão recriadas: largura natural fixa, reduzidas com zoom para caber no espaço
  document.querySelectorAll('[data-clone]').forEach(function (slot) {
    var src = document.querySelector('.' + slot.getAttribute('data-clone'));
    if (src) slot.innerHTML = src.innerHTML;
  });
  var fits = Array.prototype.slice.call(document.querySelectorAll('.fit[data-fit]'));
  var narrow = window.matchMedia('(max-width: 639px)');
  function fitAll() {
    fits.forEach(function (f) {
      var w = f.clientWidth;
      // no celular as telas largas mostram só a parte principal (ver o CSS), com outra largura natural
      var natural = Number((narrow.matches && f.getAttribute('data-fit-sm')) || f.getAttribute('data-fit'));
      if (w) f.style.setProperty('--k', Math.min(1, w / natural).toFixed(4));
    });
  }
  if (fits.length) {
    fitAll();
    if ('ResizeObserver' in window) new ResizeObserver(fitAll).observe(document.body);
    else window.addEventListener('resize', fitAll);
  }

  // ---- experimente: abas com as quatro telas; a demonstração digita e revela os resultados, passa sozinha para a
  // próxima aba enquanto está na tela, e para quando a pessoa clica numa aba ou em "Pausar".
  document.querySelectorAll('[data-demo]').forEach(function (demo) {
    var tabs = Array.prototype.slice.call(demo.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (t) {
      return document.getElementById(t.getAttribute('aria-controls'));
    });
    var pauseBtn = demo.querySelector('[data-demo-pause]');
    var still = reduced.matches;
    // só passa sozinha em tela larga: lá o palco tem altura fixa e a troca não empurra a página
    var auto = !still && window.matchMedia('(min-width: 960px)').matches;
    var visible = false;
    var timers = [];
    var current = 0;
    var L = lang === 'pt' ? { pause: 'Pausar', play: 'Continuar' } : { pause: 'Pause', play: 'Play' };
    function clear() {
      timers.forEach(clearTimeout);
      timers = [];
    }
    function later(fn, ms) {
      timers.push(setTimeout(fn, ms));
    }
    // termina o painel na hora: consulta completa, resultados visíveis, sem cursor
    function finish(panel) {
      panel.querySelectorAll('[data-type]').forEach(function (el) {
        var full = el.getAttribute('data-full');
        if (full) el.textContent = full;
        el.parentNode.classList.remove('typing');
      });
      panel.querySelectorAll('[data-step]').forEach(function (el) {
        el.classList.add('on');
      });
    }
    function play(i) {
      clear();
      var panel = panels[i];
      var typed = Array.prototype.slice.call(panel.querySelectorAll('[data-type]'));
      var steps = Array.prototype.slice.call(panel.querySelectorAll('[data-step]'));
      if (still) {
        panel.classList.remove('playing');
        return;
      }
      panel.classList.add('playing');
      steps.forEach(function (el) {
        el.classList.remove('on');
      });
      var t = 300;
      typed.forEach(function (el) {
        var full = el.getAttribute('data-full') || el.textContent;
        el.setAttribute('data-full', full);
        el.textContent = '';
        var box = el.parentNode;
        box.classList.add('typing');
        for (var k = 1; k <= full.length; k++) {
          (function (n) {
            later(function () {
              el.textContent = full.slice(0, n);
            }, t + n * 45);
          })(k);
        }
        t += full.length * 45 + 350;
        later(function () {
          box.classList.remove('typing');
        }, t);
      });
      steps.forEach(function (el, n) {
        later(function () {
          el.classList.add('on');
        }, t + n * 260);
      });
      t += steps.length * 260 + 4200;
      later(function () {
        if (auto && visible) select((i + 1) % tabs.length, false);
      }, t);
    }
    function select(i, focus) {
      current = i;
      tabs.forEach(function (tab, n) {
        var on = n === i;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[n].hidden = !on;
      });
      if (focus) tabs[i].focus();
      fitAll();
      play(i);
    }
    function stopAuto() {
      auto = false;
      if (pauseBtn) pauseBtn.textContent = L.play;
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        stopAuto();
        select(i);
      });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next !== null) {
          e.preventDefault();
          stopAuto();
          select(next, true);
        }
      });
    });
    // focar uma aba pelo teclado também para a passagem automática
    if (tabs[0]) tabs[0].parentNode.addEventListener('focusin', stopAuto);
    if (pauseBtn) {
      // sem passagem automática (celular ou movimento reduzido) não há o que pausar
      if (!auto) pauseBtn.hidden = true;
      pauseBtn.addEventListener('click', function () {
        if (auto) stopAuto();
        else {
          auto = true;
          pauseBtn.textContent = L.pause;
          select(current);
        }
      });
    }
    demo.classList.add('demo-ready');
    select(0);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        var was = visible;
        visible = entries[0].isIntersecting;
        if (visible && !was && auto) select(current);
        if (!visible) {
          clear();
          if (!auto) finish(panels[current]);
        }
      }, { threshold: 0.25 }).observe(demo);
    } else visible = true;
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

  // ---- vídeo: o player do YouTube (modo de privacidade aprimorada) só é carregado quando a pessoa clica
  document.querySelectorAll('.video[data-video]').forEach(function (box) {
    var btn = box.querySelector('.video-play');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var id = box.getAttribute('data-video');
      var hl = box.getAttribute('data-hl') || 'en';
      var frame = document.createElement('iframe');
      frame.src =
        'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
        '?autoplay=1&rel=0&playsinline=1&cc_load_policy=1&hl=' + encodeURIComponent(hl) +
        '&cc_lang_pref=' + encodeURIComponent(hl.slice(0, 2));
      frame.title = box.getAttribute('data-title') || 'YouTube';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      // o site não manda referência para outros sites, mas o player do YouTube exige saber de onde vem
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      box.replaceChild(frame, btn);
      frame.focus();
    });
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
