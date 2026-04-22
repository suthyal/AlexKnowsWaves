(() => {
  const canvas = document.getElementById("hero-waves-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  let width = 0;
  let height = 0;
  let animationId = null;

  const DOMAIN = {
    Lx: 2 * Math.PI,
    h: 1.0
  };

  const SETTINGS = {
    surfaceLevel: 0.50,
    bottomLevel: 0.96,

    streamlineCols: 34,
    streamlineRows: 12,
    streamlineSteps: 52,
    streamlineStepSize: 0.030,
    streamlineAlpha: 0.22,
    streamlineWidth: 1.1,

    fadeAlpha: 0.075,
    bottomAlpha: 0.16,

    velocityScaleX: 0.34,
    velocityScaleZ: 0.24,

    surfaceBandAlpha: 0.04,
    interiorBandAlpha: 0.03
  };

  const MODES = [
    { A: 1.00, k: 1, omega: 1.00, phase: 0.25, modAmp: 0.16, modFreq: 0.21, modPhase: 1.10 },
    { A: 0.58, k: 2, omega: 1.37, phase: 2.10, modAmp: 0.12, modFreq: 0.16, modPhase: 0.50 },
    { A: 0.30, k: 3, omega: 1.82, phase: 4.30, modAmp: 0.09, modFreq: 0.12, modPhase: 2.40 }
  ];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function wrapX(x) {
    const Lx = DOMAIN.Lx;
    x = x % Lx;
    return x < 0 ? x + Lx : x;
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function toScreenX(x) {
    return (x / DOMAIN.Lx) * width;
  }

  function toScreenY(z) {
    const zNorm = (z + DOMAIN.h) / DOMAIN.h;
    const topY = height * SETTINGS.surfaceLevel;
    const botY = height * SETTINGS.bottomLevel;
    return botY - zNorm * (botY - topY);
  }

  function phaseOf(mode, x, t) {
    return (
      mode.k * x -
      mode.omega * t +
      mode.phase +
      mode.modAmp * Math.sin(mode.modFreq * t + mode.modPhase)
    );
  }

  function surfaceEta(x, t) {
    let eta = 0;
    for (const m of MODES) {
      eta += 0.11 * m.A * Math.cos(phaseOf(m, x, t));
    }
    return Math.min(0.26, eta);
  }

  function phi(x, z, t) {
    let val = 0;
    for (const m of MODES) {
      const vertical = Math.cosh(m.k * (z + DOMAIN.h)) / Math.cosh(m.k * DOMAIN.h);
      val += m.A * vertical * Math.sin(phaseOf(m, x, t));
    }
    return val;
  }

  function velocity(x, z, t) {
    let u = 0;
    let w = 0;

    for (const m of MODES) {
      const ph = phaseOf(m, x, t);
      const denom = Math.cosh(m.k * DOMAIN.h);

      const horiz = Math.cosh(m.k * (z + DOMAIN.h)) / denom;
      const vert = Math.sinh(m.k * (z + DOMAIN.h)) / denom;

      u += m.A * m.k * horiz * Math.cos(ph);
      w += m.A * m.k * vert * Math.sin(ph);
    }

    return { u, w };
  }

  function drawBackground(t) {
    ctx.clearRect(0, 0, width, height);

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, "rgba(0, 86, 255, 0.04)");
    bg.addColorStop(0.50, "rgba(0, 86, 255, 0.018)");
    bg.addColorStop(1, "rgba(0, 86, 255, 0.0)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const topY = height * SETTINGS.surfaceLevel;
    const botY = height * SETTINGS.bottomLevel;

    const band = ctx.createLinearGradient(0, topY, 0, botY);
    band.addColorStop(0, `rgba(0, 86, 255, ${SETTINGS.surfaceBandAlpha})`);
    band.addColorStop(0.35, `rgba(0, 86, 255, ${SETTINGS.interiorBandAlpha})`);
    band.addColorStop(1, "rgba(0, 86, 255, 0.0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, topY, width, botY - topY);
  }

  function drawBottom() {
    ctx.strokeStyle = `rgba(0, 86, 255, ${SETTINGS.bottomAlpha})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, toScreenY(-DOMAIN.h));
    ctx.lineTo(width, toScreenY(-DOMAIN.h));
    ctx.stroke();
  }

  function drawSingleStreamline(x0, z0, t) {
    let x = x0;
    let z = z0;

    ctx.beginPath();

    for (let step = 0; step < SETTINGS.streamlineSteps; step++) {
      const sx = toScreenX(x);
      const sy = toScreenY(z);

      if (step === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);

      const vel = velocity(x, z, t);

      x = wrapX(x + vel.u * SETTINGS.velocityScaleX * SETTINGS.streamlineStepSize);
      z = z + vel.w * SETTINGS.velocityScaleZ * SETTINGS.streamlineStepSize;

      const zSurf = surfaceEta(x, t);
      z = clamp(z, -DOMAIN.h, zSurf);
    }

    ctx.stroke();
  }

  function drawStreamlines(t) {
    ctx.lineWidth = SETTINGS.streamlineWidth;

    for (let j = 0; j < SETTINGS.streamlineRows; j++) {
      const zFrac = (j + 0.5) / SETTINGS.streamlineRows;
      const z0 = -DOMAIN.h + zFrac * DOMAIN.h * 0.96;

      for (let i = 0; i < SETTINGS.streamlineCols; i++) {
        const x0 = ((i + 0.5) / SETTINGS.streamlineCols) * DOMAIN.Lx;

        const depthNorm = (z0 + DOMAIN.h) / DOMAIN.h;
        const alpha = SETTINGS.streamlineAlpha * (0.45 + 0.85 * depthNorm);

        ctx.strokeStyle = `rgba(0, 86, 255, ${alpha})`;
        drawSingleStreamline(x0, z0, t);
      }
    }
  }

  function frame(ms) {
    const t = ms * 0.001;

    drawBackground(t);
    drawBottom();
    drawStreamlines(t);

    animationId = requestAnimationFrame(frame);
  }

  function restart() {
    cancelAnimationFrame(animationId);
    resize();
    animationId = requestAnimationFrame(frame);
  }

  window.addEventListener("resize", restart, { passive: true });

  resize();
  animationId = requestAnimationFrame(frame);
})();