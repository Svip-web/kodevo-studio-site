(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const track = (event, parameters = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...parameters });
  };
  document.addEventListener('click', event => {
    const link = event.target.closest('a,button');
    if (!link) return;
    if (link.dataset.track) track(link.dataset.track, { link_text: link.textContent.trim().slice(0, 120), link_url: link.href || '' });
    else if (link.matches('a[href="#contact"]')) track('contact_cta_click', { link_text: link.textContent.trim().slice(0, 120) });
    else if (link.matches('a[href^="tel:"]')) track('phone_click', { link_url: link.href });
    else if (link.matches('a[href*="t.me/"]')) track('telegram_click', { link_url: link.href });
  });
  const form = $('#contact-form');
  const contactEstimate = document.createElement('p');
  contactEstimate.className = 'contact-estimate';
  contactEstimate.hidden = true;
  contactEstimate.setAttribute('aria-live', 'polite');
  $('.form-heading', form).after(contactEstimate);
  const estimator = $('#estimate-form');
  const prices = { landing: 190, corporate: 490, shop: 790 };
  const extras = {
    language: { price: 100, label: 'Друга мова' },
    integration: { price: 150, label: 'Додаткова інтеграція' },
    content: { price: 100, label: 'Допомога з текстами' },
  };
  $('#year').textContent = new Date().getFullYear();

  $$('[data-case-slider]').forEach(slider => {
    const viewport = $('.case-slider-viewport', slider);
    const buttons = $$('[data-slider-direction]', slider);
    const updateControls = () => {
      const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      buttons.forEach(button => {
        const direction = Number(button.dataset.sliderDirection);
        button.disabled = direction < 0 ? viewport.scrollLeft <= 2 : viewport.scrollLeft >= max - 2;
      });
    };
    buttons.forEach(button => button.addEventListener('click', () => {
      const direction = Number(button.dataset.sliderDirection);
      viewport.scrollBy({ left: direction * viewport.clientWidth, behavior: motion.matches ? 'auto' : 'smooth' });
      track('portfolio_slider', { direction: direction > 0 ? 'next' : 'previous' });
    }));
    viewport.addEventListener('scroll', updateControls, { passive: true });
    viewport.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      viewport.scrollBy({ left: (event.key === 'ArrowRight' ? 1 : -1) * viewport.clientWidth, behavior: motion.matches ? 'auto' : 'smooth' });
    });
    addEventListener('resize', updateControls, { passive: true });
    updateControls();
  });

  // Content stays visible if JavaScript or motion support is unavailable.
  if ('IntersectionObserver' in window && !motion.matches) {
    document.documentElement.classList.add('js-motion');
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        reveal.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    $$('.reveal').forEach(element => reveal.observe(element));
    motion.addEventListener('change', event => {
      if (event.matches) {
        document.documentElement.classList.remove('js-motion');
        reveal.disconnect();
      }
    });
  }

  const menuToggle = $('.menu-toggle');
  const mobileNav = $('#mobile-nav');
  const closeMenu = () => {
    mobileNav.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Відкрити меню');
  };
  menuToggle.addEventListener('click', () => {
    const open = mobileNav.hidden;
    mobileNav.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
  });
  $$('a', mobileNav).forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('click', event => {
    if (!event.target.closest('.header')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileNav.hidden) {
      closeMenu();
      menuToggle.focus();
    }
  });
  matchMedia('(min-width: 651px)').addEventListener('change', closeMenu);

  const progress = $('.scroll-progress');
  const header = $('.header');
  const steps = $$('.step');
  const navLinks = $$('.desktop-nav a');
  const navSections = navLinks.map(link => $(link.getAttribute('href')));
  let scrollQueued = false;
  function updateScroll() {
    scrollQueued = false;
    const range = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = `${range > 0 ? Math.min(100, scrollY / range * 100) : 0}%`;
    header.classList.toggle('scrolled', scrollY > 30);
    const current = navSections.findIndex(section => {
      const rect = section.getBoundingClientRect();
      return rect.top <= 180 && rect.bottom > 180;
    });
    navLinks.forEach((link, index) => {
      link.classList.toggle('active', index === current);
      if (index === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    let activeStep = 0;
    steps.forEach((step, index) => {
      if (step.getBoundingClientRect().top < innerHeight * 0.55) activeStep = index;
    });
    steps.forEach((step, index) => step.classList.toggle('is-current', index === activeStep));
  }
  function queueScroll() {
    if (!scrollQueued) {
      scrollQueued = true;
      requestAnimationFrame(updateScroll);
    }
  }
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll, { passive: true });
  updateScroll();

  const tilt = $('[data-tilt]');
  const visual = $('.hero-visual');
  let tiltFrame;
  visual.addEventListener('pointermove', event => {
    if (motion.matches || !finePointer.matches) return;
    cancelAnimationFrame(tiltFrame);
    const bounds = visual.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    tiltFrame = requestAnimationFrame(() => {
      tilt.style.transform = `perspective(1100px) rotateX(${-y * 7}deg) rotateY(${-9 + x * 10}deg) rotateZ(${-5 + x * 2}deg)`;
    });
  });
  const resetTilt = () => {
    cancelAnimationFrame(tiltFrame);
    tilt.style.transform = '';
  };
  visual.addEventListener('pointerleave', resetTilt);
  motion.addEventListener('change', resetTilt);

  $$('.magnetic').forEach(button => {
    button.addEventListener('pointermove', event => {
      if (motion.matches || !finePointer.matches) return;
      const rect = button.getBoundingClientRect();
      button.style.translate = `${(event.clientX - rect.left - rect.width / 2) * 0.07}px ${(event.clientY - rect.top - rect.height / 2) * 0.12}px`;
    });
    button.addEventListener('pointerleave', () => { button.style.translate = ''; });
  });

  function estimate() {
    const data = new FormData(estimator);
    const service = data.get('format');
    const selectedExtras = data.getAll('extra').map(key => extras[key]);
    const total = prices[service] + selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
    return { service, total, summary: `від $${total}${selectedExtras.length ? ' · ' + selectedExtras.map(extra => extra.label).join(', ') : ''}` };
  }
  estimator.addEventListener('submit', event => event.preventDefault());
  estimator.addEventListener('change', () => {
    const result = estimate();
    $('#estimate-total').textContent = `від $${result.total.toLocaleString('en-US')}`;
    if (!motion.matches) {
      $('#estimate-total').animate([{ opacity: 0.3, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220 });
    }
  });
  function selectService(service, summary = '') {
    form.elements.service.value = service;
    form.elements.estimate.value = summary;
    contactEstimate.hidden = !summary;
    contactEstimate.textContent = summary ? `Ваш розрахунок: ${summary}` : '';
  }
  $('#estimate-cta').addEventListener('click', () => {
    const result = estimate();
    selectService(result.service, result.summary);
  });
  $$('[data-select-service]').forEach(link => link.addEventListener('click', () => selectService(link.dataset.selectService)));
  form.elements.service.addEventListener('change', () => {
    form.elements.estimate.value = '';
    contactEstimate.hidden = true;
    contactEstimate.textContent = '';
  });

  const projects = {
    forma: { title: 'FORMA — простір відчуттів', service: 'corporate', description: 'Концепт сайту архітектурного бюро. Тепла палітра, виразна композиція та великі візуальні акценти. Такий напрям підходить бізнесу, де важливі естетика, довіра й увага до деталей.' },
    riva: { title: 'RIVA — краса щодня', service: 'shop', description: 'Концепт магазину предметів інтер’єру. Спокійні кольори, чиста типографіка й акцент на продукті. Для справжнього магазину я доповню цей напрям каталогом, картками товарів та зручним оформленням замовлення.' },
    move: { title: 'MOVE — енергія в русі', service: 'landing', description: 'Концепт лендінгу фітнес-студії. Контрастна палітра, смілива типографіка й відчуття руху. Цей візуальний напрям можна адаптувати для спортивного бренду, події або запуску нового продукту.' },
  };
  let selectedProject;
  const projectDialog = $('#project-dialog');
  const privacyDialog = $('#privacy-dialog');
  function openDialog(dialog) {
    closeMenu();
    dialog.showModal();
    document.body.classList.add('modal-open');
  }
  $$('[data-project]').forEach(button => button.addEventListener('click', () => {
    selectedProject = projects[button.dataset.project];
    $('#dialog-title').textContent = selectedProject.title;
    $('#dialog-description').textContent = selectedProject.description;
    const preview = $('.project-image', button).cloneNode(true);
    preview.setAttribute('aria-hidden', 'true');
    $('#dialog-preview').replaceChildren(preview);
    openDialog(projectDialog);
  }));
  $$('[data-case-link]').forEach(link => link.addEventListener('click', () => {
    track('portfolio_case_click', {
      case_name: link.dataset.caseLink,
      destination: link.href,
    });
  }));
  $$('.privacy-trigger').forEach(button => button.addEventListener('click', () => openDialog(privacyDialog)));
  const cookieDialog = $('#cookie-dialog');
  const cookieBanner = $('#cookie-banner');
  const cookieConsentKey = 'vp-agency-cookie-consent-v1';
  const readCookieConsent = () => {
    try {
      const value = JSON.parse(localStorage.getItem(cookieConsentKey));
      return value && typeof value.analytics === 'boolean' && typeof value.marketing === 'boolean' ? value : null;
    } catch { return null; }
  };
  const applyCookieConsent = (consent, announce = false) => {
    window.vpCookieConsent = consent;
    document.documentElement.dataset.cookieConsent = consent.analytics || consent.marketing ? 'custom' : 'essential';
    window.dispatchEvent(new CustomEvent('vp:cookie-consent', { detail: consent }));
    if (announce) track('cookie_consent_update', { analytics: consent.analytics, marketing: consent.marketing });
  };
  const saveCookieConsent = consent => {
    const value = { ...consent, updatedAt: new Date().toISOString() };
    try { localStorage.setItem(cookieConsentKey, JSON.stringify(value)); } catch { /* Choice still applies for this page view. */ }
    applyCookieConsent(value, true);
    document.body.classList.remove('cookie-choice-pending');
    cookieBanner.hidden = true;
    if (cookieDialog.open) cookieDialog.close();
  };
  const syncCookieControls = () => {
    const consent = readCookieConsent() || { analytics: false, marketing: false };
    $('#cookie-analytics').checked = consent.analytics;
    $('#cookie-marketing').checked = consent.marketing;
  };
  const savedCookieConsent = readCookieConsent();
  if (savedCookieConsent) applyCookieConsent(savedCookieConsent);
  else {
    document.body.classList.add('cookie-choice-pending');
    cookieBanner.hidden = false;
  }
  $$('.cookie-trigger').forEach(button => button.addEventListener('click', () => {
    syncCookieControls();
    openDialog(cookieDialog);
  }));
  $$('[data-cookie-choice]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.cookieChoice === 'all') saveCookieConsent({ analytics: true, marketing: true });
    else if (button.dataset.cookieChoice === 'essential') saveCookieConsent({ analytics: false, marketing: false });
    else saveCookieConsent({ analytics: $('#cookie-analytics').checked, marketing: $('#cookie-marketing').checked });
  }));
  $$('dialog').forEach(dialog => {
    $('.dialog-close', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (!$('dialog[open]')) document.body.classList.remove('modal-open');
    });
  });
  $('#dialog-cta').addEventListener('click', () => {
    selectService(selectedProject.service);
    if (!form.elements.message.value.trim()) form.elements.message.value = `Подобається напрям ${selectedProject.title}. Хочу обговорити сайт для мого бізнесу.`;
    projectDialog.close();
  });

  const contactInput = form.elements.contact;
  const contactPattern = /^(?:[^\s@]+@[^\s@]+\.[^\s@]+|@[a-zA-Z][a-zA-Z0-9_]{4,31})$/;
  contactInput.addEventListener('input', () => contactInput.setCustomValidity(''));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    track('lead_submit_attempt', { service: form.elements.service.value });
    if (location.hostname.endsWith('.github.io')) {
      const status = $('.form-status', form);
      status.className = 'form-status error';
      status.textContent = 'Форма ще очікує захищений серверний канал Telegram. Дані не надіслано.';
      return;
    }
    const contact = contactInput.value.trim();
    if (!contactPattern.test(contact)) {
      contactInput.setCustomValidity('Вкажіть email або Telegram у форматі @username (від 5 символів).');
      contactInput.reportValidity();
      return;
    }
    const button = $('button[type=submit]', form);
    if (button.disabled) return;
    const status = $('.form-status', form);
    const values = new FormData(form);
    const payload = Object.fromEntries(values);
    payload.consent = values.has('consent');
    const originalButton = button.innerHTML;
    button.disabled = true;
    button.textContent = 'Зберігаємо запит…';
    form.setAttribute('aria-busy', 'true');
    status.className = 'form-status';
    status.textContent = '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Не вдалося зберегти запит. Спробуйте ще раз.');
      status.className = 'form-status success';
      status.textContent = 'Готово! Заявку надіслано в Telegram. Я зв’яжуся з вами за вказаним контактом.';
      track('generate_lead', { service: payload.service, estimate: payload.estimate || '' });
      form.reset();
      form.elements.estimate.value = '';
      contactEstimate.hidden = true;
      contactEstimate.textContent = '';
    } catch (error) {
      status.className = 'form-status error';
      status.textContent = error.name === 'AbortError' || error instanceof TypeError || error instanceof SyntaxError
        ? 'Сервер недоступний. Запит не підтверджено — перевірте з’єднання та спробуйте ще раз. Ваші поля збережено.'
        : error.message;
    } finally {
      clearTimeout(timeout);
      button.disabled = false;
      button.innerHTML = originalButton;
      form.removeAttribute('aria-busy');
    }
  });
})();
