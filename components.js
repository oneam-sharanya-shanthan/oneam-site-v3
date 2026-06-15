/* ================================================================
   OneAM V3 — Shared Component Behaviours
   Requires: components.css + brand.css

   Each init function is self-contained and silently no-ops when
   its target element isn't on the page, so every page can load
   this file unconditionally.
   ================================================================ */

(function () {
  'use strict';


  /* ── Nav scroll + sticky CTA ─────────────────────────────────── */

  function initNav() {
    var nav      = document.getElementById('mainNav');
    var stickyCta = document.getElementById('stickyCta');
    var navCta   = document.getElementById('navCta');
    var finalCta = document.getElementById('get-started');

    if (!nav) return;

    function handleScroll() {
      var scrollY = window.scrollY;
      nav.classList.toggle('scrolled', scrollY > 10);

      if (stickyCta) {
        var finalCtaTop = finalCta
          ? finalCta.getBoundingClientRect().top
          : Number.POSITIVE_INFINITY;
        var showSticky = scrollY > 400 && finalCtaTop > window.innerHeight;
        stickyCta.classList.toggle('visible', showSticky);
        if (navCta) navCta.classList.toggle('hidden', showSticky);
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
  }


  /* ── Hamburger mobile menu ───────────────────────────────────── */

  function initHamburger() {
    var hamburger  = document.getElementById('hamburger');
    var mobileMenu = document.getElementById('mobileMenu');

    if (!hamburger || !mobileMenu) return;

    hamburger.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('active');
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }


  /* ── Scroll reveal ───────────────────────────────────────────── */

  function initReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) {
        el.classList.add('visible');
      });
      return;
    }

    var elements = document.querySelectorAll('.reveal, .reveal-stagger');
    if (!elements.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el      = entry.target;
        var parent  = el.parentElement;
        var siblings = parent
          ? Array.from(parent.querySelectorAll('.reveal-stagger, .reveal'))
          : [el];
        var idx   = siblings.indexOf(el);
        var delay = el.classList.contains('reveal-stagger') ? idx * 150 : 0;

        setTimeout(function () { el.classList.add('visible'); }, delay);
        observer.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    elements.forEach(function (el) { observer.observe(el); });
  }


  /* ── How it works: step line + waypoint animation ────────────── */

  function initSteps() {
    var stepsGrid = document.querySelector('.steps-grid');
    if (!stepsGrid) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stepsGrid.classList.add('line-visible');
      document.querySelectorAll('.step-waypoint, .step-content').forEach(function (el) {
        el.style.opacity = '1';
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      stepsGrid.classList.add('line-visible');
      setTimeout(function () {
        document.querySelectorAll('.step-waypoint').forEach(function (wp) {
          wp.classList.add('animate');
        });
      }, 1600);
      observer.disconnect();
    }, { threshold: 0.1 });

    observer.observe(stepsGrid);
  }


  /* ── Testimonial carousel ────────────────────────────────────── */

  function initCarousel() {
    /* Config — adjust these two values to tune timing/speed:
         CARD_GAP: must match `gap` in .carousel-track (px)
         AUTO_MS:  milliseconds between auto-advances            */
    var CARD_GAP = 24;
    var AUTO_MS  = 3000;

    var viewport  = document.querySelector('.carousel-viewport');
    var track     = document.querySelector('.carousel-track');
    var realCards = Array.from(document.querySelectorAll('.testimonial-card'));
    var btnPrev   = document.querySelector('.carousel-arrow--prev');
    var btnNext   = document.querySelector('.carousel-arrow--next');

    if (!viewport || !track || !realCards.length) return;

    var REAL_COUNT   = realCards.length;
    var CLONE_BEFORE = 3;
    var visible      = 3;
    var currIdx      = CLONE_BEFORE;
    var cardW        = 0;
    var autoTimer;

    /* Build infinite buffer */
    realCards.slice(-CLONE_BEFORE).forEach(function (c) {
      track.insertBefore(c.cloneNode(true), track.firstChild);
    });
    realCards.slice(0, CLONE_BEFORE).forEach(function (c) {
      track.appendChild(c.cloneNode(true));
    });

    var allCards = Array.from(track.querySelectorAll('.testimonial-card'));

    function calcVisible() {
      var vw = window.innerWidth;
      if (vw < 600) return 1;
      if (vw < 900) return 2;
      return 3;
    }

    function render(animate) {
      track.style.transition = animate
        ? 'transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        : 'none';
      track.style.transform = 'translateX(' + -(currIdx * (cardW + CARD_GAP)) + 'px)';
      allCards.forEach(function (c, i) {
        c.classList.toggle('is-active', i >= currIdx && i < currIdx + visible);
      });
      if (!animate) { void track.offsetWidth; }
    }

    function layout() {
      visible = calcVisible();
      cardW = (viewport.clientWidth - (visible - 1) * CARD_GAP) / visible;
      allCards.forEach(function (c) { c.style.width = cardW + 'px'; });
      render(false);
    }

    track.addEventListener('transitionend', function (e) {
      if (e.target !== track) return;
      if (currIdx < CLONE_BEFORE) {
        currIdx += REAL_COUNT; render(false);
      } else if (currIdx >= CLONE_BEFORE + REAL_COUNT) {
        currIdx -= REAL_COUNT; render(false);
      }
    });

    function next() { currIdx++; render(true); resetAuto(); }
    function prev() { currIdx--; render(true); resetAuto(); }

    function startAuto() { autoTimer = setInterval(next, AUTO_MS); }
    function stopAuto()  { clearInterval(autoTimer); }
    function resetAuto() { stopAuto(); startAuto(); }

    if (btnNext) btnNext.addEventListener('click', next);
    if (btnPrev) btnPrev.addEventListener('click', prev);

    viewport.addEventListener('mouseenter', stopAuto);
    viewport.addEventListener('mouseleave', startAuto);

    var swipeX = 0;
    viewport.addEventListener('touchstart', function (e) {
      swipeX = e.touches[0].clientX; stopAuto();
    }, { passive: true });
    viewport.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - swipeX;
      if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
      else { startAuto(); }
    }, { passive: true });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layout, 150);
    });

    layout();
    startAuto();
  }


  /* ── FAQ group expand / collapse all ────────────────────────── */

  function initFaqGroupToggle() {
    document.querySelectorAll('.faq-group__toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var group = btn.closest('.faq-group');
        if (!group) return;
        var items    = Array.from(group.querySelectorAll('details.faq-item'));
        var expanding = btn.getAttribute('aria-expanded') !== 'true';

        if (expanding) {
          items.forEach(function (item) { item.setAttribute('open', ''); });
          btn.textContent = '−'; /* − */
          btn.setAttribute('aria-expanded', 'true');
          btn.setAttribute('aria-label', 'Collapse all');
        } else {
          items.forEach(function (item) {
            if (!item.hasAttribute('open')) return;
            item.classList.add('closing');
            item.addEventListener('transitionend', function handler() {
              item.classList.remove('closing');
              item.removeAttribute('open');
              item.removeEventListener('transitionend', handler);
            });
          });
          btn.textContent = '+';
          btn.setAttribute('aria-expanded', 'false');
          btn.setAttribute('aria-label', 'Expand all');
        }
      });
    });
  }


  /* ── FAQ animated close ──────────────────────────────────────── */

  function initFaqClose() {
    document.querySelectorAll('.faq-item summary').forEach(function (summary) {
      summary.addEventListener('click', function (e) {
        var item = summary.closest('details');
        if (!item || !item.hasAttribute('open')) return;
        e.preventDefault();
        item.classList.add('closing');
        item.addEventListener('transitionend', function handler() {
          item.classList.remove('closing');
          item.removeAttribute('open');
          item.removeEventListener('transitionend', handler);
        });
      });
    });
  }


  /* ── Boot ────────────────────────────────────────────────────── */

  initNav();
  initHamburger();
  initReveal();
  initSteps();
  initCarousel();
  initFaqClose();
  initFaqGroupToggle();

}());
