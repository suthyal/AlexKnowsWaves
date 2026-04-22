(() => {
  const canvas = document.getElementById("hero-waves-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  let width = 0;
  let height = 0;
  let cx = 0;
  let cy = 0;
  let particles = [];
  let animationId = null;

  const SETTINGS = {
    particleCount: 520,
    baseRadius: 0.14,
    radiusJitter: 0.42,
    minSize: 0.8,
    maxSize: 2.8,
    angularSpeedMin: 0.0018,
    angularSpeedMax: 0.0065,
    inwardDrift: 0.0009,
    outwardDrift: 0.00035,
    centerPull: 0.00045,
    trailAlpha: 0.085,
    glowAlpha: 0.16,
    lineAlpha: 0.045,
    connectDistance: 48
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cx = width * 0.52;
    cy = height * 0.5;

    buildParticles();
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function buildParticles() {
    const maxR = Math.min(width, height) * 0.48;
    const innerR = Math.min(width, height) * 0.04;

    particles = Array.from({ length: SETTINGS.particleCount }, () => {
      const t = Math.random();
      const r =
        lerp(innerR, maxR, Math.pow(t, SETTINGS.baseRadius)) *
        rand(1 - SETTINGS.radiusJitter * 0.15, 1 + SETTINGS.radiusJitter * 0.15);

      const angle = rand(0, Math.PI * 2);
      const size = rand(SETTINGS.minSize, SETTINGS.maxSize);

      return {
        r,
        angle,
        size,
        spin: rand(SETTINGS.angularSpeedMin, SETTINGS.angularSpeedMax),
        drift:
          Math.random() < 0.82
            ? -rand(SETTINGS.inwardDrift * 0.3, SETTINGS.inwardDrift)
            : rand(SETTINGS.outwardDrift * 0.15, SETTINGS.outwardDrift),
        wobbleAmp: rand(0.2, 1.4),
        wobbleFreq: rand(0.4, 1.4),
        phase: rand(0, Math.PI * 2),
        hueShift: rand(-8, 10)
      };
    });
  }

  function drawBackground() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createRadialGradient(
      cx,
      cy,
      0,
      cx,
      cy,
      Math.min(width, height) * 0.55
    );
    grad.addColorStop(0, "rgba(0, 86, 255, 0.10)");
    grad.addColorStop(0.35, "rgba(0, 86, 255, 0.045)");
    grad.addColorStop(1, "rgba(0, 86, 255, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function step(time) {
    drawBackground();

    const positions = [];

    for (const p of particles) {
      p.angle += p.spin;
      p.r += p.drift;

      const maxR = Math.min(width, height) * 0.49;
      const minR = Math.min(width, height) * 0.028;

      if (p.r < minR) {
        p.r = maxR * rand(0.78, 1.02);
        p.angle = rand(0, Math.PI * 2);
      } else if (p.r > maxR) {
        p.r = rand(minR * 1.4, maxR * 0.35);
      }

      const wobble = Math.sin(time * 0.001 * p.wobbleFreq + p.phase) * p.wobbleAmp;
      const x = cx + Math.cos(p.angle) * (p.r + wobble);
      const y = cy + Math.sin(p.angle) * (p.r * 0.72 + wobble * 0.6);

      positions.push({ x, y, p });
    }

    for (let i = 0; i < positions.length; i++) {
      const a = positions[i];

      for (let j = i + 1; j < positions.length; j += 8) {
        const b = positions[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);

        if (dist < SETTINGS.connectDistance) {
          const alpha = (1 - dist / SETTINGS.connectDistance) * SETTINGS.lineAlpha;
          ctx.strokeStyle = `rgba(0, 86, 255, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (const { x, y, p } of positions) {
      const outer = ctx.createRadialGradient(x, y, 0, x, y, p.size * 5.5);
      outer.addColorStop(0, `rgba(0, 86, 255, ${SETTINGS.glowAlpha})`);
      outer.addColorStop(1, "rgba(0, 86, 255, 0)");
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.arc(x, y, p.size * 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(0, 86, 255, 0.90)";
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    animationId = requestAnimationFrame(step);
  }

  function onResize() {
    cancelAnimationFrame(animationId);
    resize();
    animationId = requestAnimationFrame(step);
  }

  window.addEventListener("resize", onResize, { passive: true });
  resize();
  animationId = requestAnimationFrame(step);
})();