/* Wander Journal — site behaviour (plain JavaScript, no dependencies) */
(function () {
  'use strict';

  var config = window.WJ_CONFIG || {};
  var links = config.paymentLinks || {};

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* ---------- Stripe Payment Links ---------- */
  function linkState(key) {
    var url = String(links[key] || '').trim();
    if (url === 'sold-out') return { status: 'sold-out' };
    if (/^https:\/\//i.test(url)) return { status: 'ok', url: url };
    return { status: 'missing' };
  }

  function setBuyButton(el, key) {
    var state = linkState(key);
    var label = el.getAttribute('data-label') || 'Buy Now';
    if (state.status === 'ok') {
      el.setAttribute('href', state.url);
      el.removeAttribute('aria-disabled');
      el.textContent = label;
    } else {
      el.setAttribute('href', '#');
      el.setAttribute('aria-disabled', 'true');
      el.textContent = state.status === 'sold-out' ? 'Sold out' : 'Coming soon';
      if (state.status === 'missing' && window.console) {
        console.info('[Wander Journal] No Stripe Payment Link yet for "' + key + '" — add it in assets/js/config.js');
      }
    }
    return state;
  }

  document.querySelectorAll('[data-buy]').forEach(function (el) {
    setBuyButton(el, el.getAttribute('data-buy'));
  });

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a[aria-disabled="true"]');
    if (el) e.preventDefault();
  });

  /* ---------- Product gallery ---------- */
  var showSlide = function () {};
  var gallery = document.querySelector('[data-gallery]');
  if (gallery) {
    var mainImg = gallery.querySelector('[data-main-image]');
    var thumbs = Array.prototype.slice.call(gallery.querySelectorAll('[data-thumb]'));
    var current = 0;

    showSlide = function (i) {
      if (!thumbs.length) return;
      current = (i + thumbs.length) % thumbs.length;
      var t = thumbs[current];
      mainImg.srcset = t.getAttribute('data-srcset');
      mainImg.src = t.getAttribute('data-src');
      mainImg.alt = t.getAttribute('data-alt');
      thumbs.forEach(function (b, j) {
        b.setAttribute('aria-current', j === current ? 'true' : 'false');
      });
    };

    thumbs.forEach(function (b, i) {
      b.addEventListener('click', function () { showSlide(i); });
    });
    var prev = gallery.querySelector('[data-prev]');
    var next = gallery.querySelector('[data-next]');
    if (prev) prev.addEventListener('click', function () { showSlide(current - 1); });
    if (next) next.addEventListener('click', function () { showSlide(current + 1); });

    var startX = null;
    mainImg.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    mainImg.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) showSlide(current + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ---------- Colour options (single journal) ---------- */
  var colourOptions = document.querySelector('[data-colour-options]');
  var colourBuy = document.querySelector('[data-buy-colour]');
  if (colourOptions && colourBuy) {
    var base = colourBuy.getAttribute('data-buy-colour');
    var valueEl = document.querySelector('[data-colour-value]');
    var errorEl = document.querySelector('[data-colour-error]');
    var radios = Array.prototype.slice.call(colourOptions.querySelectorAll('input[type="radio"]'));
    var selected = null;

    var selectColour = function (radio, fromUser) {
      selected = radio.value;
      if (valueEl) valueEl.textContent = radio.getAttribute('data-name');
      if (errorEl) errorEl.hidden = true;
      setBuyButton(colourBuy, base + '-' + selected);
      var slide = parseInt(radio.getAttribute('data-slide'), 10);
      if (!isNaN(slide)) showSlide(slide);
      if (fromUser && window.history && history.replaceState) {
        var url = new URL(window.location.href);
        url.searchParams.set('colour', selected);
        history.replaceState(null, '', url);
      }
    };

    radios.forEach(function (r) {
      r.addEventListener('change', function () { if (r.checked) selectColour(r, true); });
    });

    colourBuy.addEventListener('click', function (e) {
      if (!selected) {
        e.preventDefault();
        if (errorEl) errorEl.hidden = false;
        if (radios[0]) radios[0].focus();
      }
    });

    var wanted = (new URLSearchParams(window.location.search).get('colour') || '').toLowerCase();
    radios.forEach(function (r) {
      if (r.value === wanted) { r.checked = true; selectColour(r, false); }
    });
  }

  /* ---------- Shop sorting ---------- */
  var sortSelect = document.querySelector('[data-sort]');
  var sortable = document.querySelector('[data-sortable]');
  if (sortSelect && sortable) {
    sortSelect.addEventListener('change', function () {
      var mode = sortSelect.value;
      var items = Array.prototype.slice.call(sortable.children);
      items.sort(function (a, b) {
        var pa = parseFloat(a.getAttribute('data-price'));
        var pb = parseFloat(b.getAttribute('data-price'));
        if (mode === 'price-asc') return pa - pb;
        if (mode === 'price-desc') return pb - pa;
        if (mode === 'name') return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'));
        return parseInt(a.getAttribute('data-order'), 10) - parseInt(b.getAttribute('data-order'), 10);
      });
      items.forEach(function (el) { sortable.appendChild(el); });
    });
  }

  /* ---------- Contact form ---------- */
  var form = document.querySelector('[data-contact-form]');
  if (form) {
    var status = form.querySelector('[data-form-status]');
    var to = config.contactEmail || 'wanderjournalglobal@gmail.com';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var data = new FormData(form);
      if (data.get('_gotcha')) return;

      var first = String(data.get('first-name') || '').trim();
      var last = String(data.get('last-name') || '').trim();
      var email = String(data.get('email') || '').trim();
      var message = String(data.get('message') || '').trim();
      var endpoint = String(config.contactFormEndpoint || '').trim();

      if (endpoint) {
        var button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        status.textContent = 'Sending…';
        fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
          .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            form.reset();
            status.textContent = 'Thanks for your message! We’ll get back to you as soon as we can.';
          })
          .catch(function () {
            status.textContent = 'Sorry, your message didn’t send. Please email us at ' + to + '.';
          })
          .then(function () { button.disabled = false; });
      } else {
        var name = (first + ' ' + last).trim();
        var subject = 'Website enquiry' + (name ? ' from ' + name : '');
        var body = message + '\n\n' + name + (email ? ' <' + email + '>' : '');
        window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        status.textContent = 'Opening your email app… If nothing happens, email us at ' + to + '.';
      }
    });
  }
})();
