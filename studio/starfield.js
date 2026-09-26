(() => {
  'use strict';

  const hero = document.querySelector('.hero');
  const sky = hero?.querySelector('.hero-sky');
  const canvas = sky?.querySelector('canvas');
  const context = canvas?.getContext('2d');
  if (!context) return; // CSS leaves a static sky if canvas is unavailable.

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const tau = Math.PI * 2;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, strength: 0, active: false };
  let width = 0;
  let height = 0;
  let stars = [];
  let frameId = 0;
  let previousTime = 0;
  let elapsed = 0;
  let visible = true;
  let meteor = null;
  let nextMeteor = 6500;

  // One cached glow sprite instead of a shadow/gradient for every star, every frame.
  const glow = document.createElement('canvas');
  glow.width = glow.height = 48;
  const glowContext = glow.getContext('2d');
  if (!glowContext) return;
  const halo = glowContext.createRadialGradient(24, 24, 0, 24, 24, 24);
  halo.addColorStop(0, '#f0f7ff');
  halo.addColorStop(0.07, '#d1e5ffdf');
  halo.addColorStop(0.2, '#74a8ff50');
  halo.addColorStop(1, '#538bff00');
  glowContext.fillStyle = halo;
  glowContext.fillRect(0, 0, 48, 48);

  function makeStars() {
    // A stable seed keeps the same constellation when the viewport is resized.
    let seed = 90421;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const count = Math.min(width < 651 ? 90 : 210, Math.max(65, Math.round(width * height / 5300)));
    stars = Array.from({ length: count }, (_, index) => ({
      u: random(), v: random(), depth: 0.25 + random() * 0.75,
      radius: 0.4 + random() * (index % 13 === 0 ? 1.55 : 0.75),
      opacity: 0.23 + random() * 0.52,
      phase: random() * tau, speed: 0.22 + random() * 0.43,
      blue: index % 3 === 0, flare: index % 31 === 0,
    }));
  }

  function paint() {
    context.clearRect(0, 0, width, height);
    const time = reducedMotion.matches ? 0 : elapsed / 1000;
    const strength = reducedMotion.matches ? 0 : pointer.strength;
    const parallaxX = (pointer.x / width - 0.5) * 25 * strength;
    const parallaxY = (pointer.y / height - 0.5) * 19 * strength;
    const radius = Math.min(225, width * 0.28);

    if (strength > 0.01) {
      const light = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, radius * 1.6);
      light.addColorStop(0, `rgba(65, 114, 230, ${strength * 0.16})`);
      light.addColorStop(0.4, `rgba(39, 78, 172, ${strength * 0.07})`);
      light.addColorStop(1, 'rgba(39, 78, 172, 0)');
      context.fillStyle = light;
      context.fillRect(0, 0, width, height);
    }

    const nearby = [];
    for (const star of stars) {
      let x = star.u * width + Math.sin(time * 0.075 + star.phase) * 10 * star.depth + parallaxX * star.depth;
      let y = star.v * height + Math.cos(time * 0.06 + star.phase) * 8 * star.depth + parallaxY * star.depth;
      const dx = pointer.x - x;
      const dy = pointer.y - y;
      const distance = Math.hypot(dx, dy);
      const influence = Math.max(0, 1 - distance / radius) ** 2 * strength;
      if (distance > 1) {
        x += dx / distance * influence * 32 * star.depth;
        y += dy / distance * influence * 32 * star.depth;
      }
      if (influence > 0.13) nearby.push({ x, y, influence, distance });

      const twinkle = 0.73 + Math.sin(time * star.speed + star.phase) * 0.27;
      // Slightly calmer behind the headline; no wash of light over the text.
      const textProtection = x < width * 0.49 ? 0.68 : 1;
      context.globalAlpha = Math.min(0.95, star.opacity * twinkle + influence * 0.7) * textProtection;
      const size = star.radius + influence * 0.9;
      if (star.flare || influence > 0.3) {
        const glowSize = size * 16;
        context.drawImage(glow, x - glowSize / 2, y - glowSize / 2, glowSize, glowSize);
      }
      context.fillStyle = star.blue ? '#a5c6ff' : '#edf3ff';
      context.beginPath();
      context.arc(x, y, size, 0, tau);
      context.fill();
      if (star.flare) {
        context.globalAlpha *= 0.42;
        context.strokeStyle = '#b6d2ff';
        context.lineWidth = 0.6;
        context.beginPath();
        context.moveTo(x - size * 3, y);
        context.lineTo(x + size * 3, y);
        context.moveTo(x, y - size * 3);
        context.lineTo(x, y + size * 3);
        context.stroke();
      }
    }

    // A small, transient constellation follows the pointer, not a full-screen mesh.
    nearby.sort((a, b) => a.distance - b.distance);
    const points = nearby.slice(0, 7);
    for (let i = 1; i < points.length; i++) {
      const start = points[i - 1];
      const end = points[i];
      if (Math.hypot(start.x - end.x, start.y - end.y) > 125) continue;
      context.globalAlpha = Math.min(start.influence, end.influence) * 0.25;
      context.strokeStyle = '#8fb8ff';
      context.lineWidth = 0.7;
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }

    if (!reducedMotion.matches && width > 650 && elapsed > nextMeteor) {
      meteor = { x: width * (0.4 + Math.random() * 0.5), y: height * Math.random() * 0.3, born: elapsed };
      nextMeteor = elapsed + 11000 + Math.random() * 6000;
    }
    if (meteor && !reducedMotion.matches) {
      const progress = (elapsed - meteor.born) / 1250;
      if (progress >= 1) meteor = null;
      else {
        const x = meteor.x - progress * 290;
        const y = meteor.y + progress * 135;
        const trail = context.createLinearGradient(x, y, x + 90, y - 42);
        trail.addColorStop(0, '#c6ddff');
        trail.addColorStop(1, '#89b4ff00');
        context.globalAlpha = Math.sin(progress * Math.PI) * 0.48;
        context.strokeStyle = trail;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + 90, y - 42);
        context.stroke();
      }
    }
    context.globalAlpha = 1;
  }

  function animate(timestamp) {
    frameId = 0;
    if (!visible || document.hidden || reducedMotion.matches) return;
    const delta = previousTime ? timestamp - previousTime : 34;
    if (delta >= 1000 / 30) {
      previousTime = timestamp;
      const step = Math.min(delta, 70);
      elapsed += step;
      const easing = 1 - Math.exp(-step / 180);
      pointer.x += (pointer.targetX - pointer.x) * easing;
      pointer.y += (pointer.targetY - pointer.y) * easing;
      pointer.strength += ((pointer.active ? 1 : 0) - pointer.strength) * easing;
      paint();
    }
    frameId = requestAnimationFrame(animate);
  }

  function syncAnimation() {
    cancelAnimationFrame(frameId);
    frameId = 0;
    previousTime = 0;
    if (reducedMotion.matches) {
      pointer.strength = 0;
      meteor = null;
      paint();
    } else if (visible && !document.hidden) frameId = requestAnimationFrame(animate);
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const resolution = Math.min(devicePixelRatio || 1, width < 651 ? 1.5 : 2);
    canvas.width = Math.round(width * resolution);
    canvas.height = Math.round(height * resolution);
    context.setTransform(resolution, 0, 0, resolution, 0, 0);
    pointer.x = pointer.targetX = width * 0.5;
    pointer.y = pointer.targetY = height * 0.45;
    pointer.active = false;
    pointer.strength = 0;
    makeStars();
    paint();
    sky.classList.add('is-ready');
  }

  hero.addEventListener('pointermove', event => {
    if (reducedMotion.matches || !finePointer.matches || event.pointerType === 'touch') return;
    const rect = hero.getBoundingClientRect();
    pointer.targetX = Math.max(0, Math.min(width, event.clientX - rect.left));
    pointer.targetY = Math.max(0, Math.min(height, event.clientY - rect.top));
    pointer.active = true;
  }, { passive: true });
  const releasePointer = () => { pointer.active = false; };
  hero.addEventListener('pointerleave', releasePointer);
  hero.addEventListener('pointercancel', releasePointer);
  finePointer.addEventListener('change', releasePointer);
  reducedMotion.addEventListener('change', syncAnimation);
  document.addEventListener('visibilitychange', syncAnimation);
  window.addEventListener('pagehide', () => cancelAnimationFrame(frameId));
  window.addEventListener('pageshow', syncAnimation);

  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero);
  else window.addEventListener('resize', resize, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      syncAnimation();
    }, { threshold: 0 }).observe(hero);
  }
  syncAnimation();
})();
