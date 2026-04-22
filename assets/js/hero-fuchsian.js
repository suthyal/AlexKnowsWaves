(() => {
  const canvas = document.getElementById("hero-waves-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  let cx = 0;
  let cy = 0;
  let R = 0;
  let circles = [];
  let animationId = null;
  let startTime = null;

  const SETTINGS = {
    stroke: "rgba(0, 86, 255, 0.92)",
    outerStroke: "rgba(0, 86, 255, 0.82)",
    lineWidthOuter: 1.15,
    lineWidthInner: 0.85,
    minRadiusPx: 0.1,
    maxCircles: 12800,
    revealSeconds: 5.5,
    breatheAmp: 0.004,
    breatheFreq: 0.55
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cx = width * 0.5;
    cy = height * 0.5;
    R = Math.min(width, height) * 0.43;

    buildPacking();
  }

  function clear() {
    ctx.clearRect(0, 0, width, height);
  }

  function cAdd(a, b) {
    return { re: a.re + b.re, im: a.im + b.im };
  }

  function cSub(a, b) {
    return { re: a.re - b.re, im: a.im - b.im };
  }

  function cMul(a, b) {
    return {
      re: a.re * b.re - a.im * b.im,
      im: a.re * b.im + a.im * b.re
    };
  }

  function cScale(a, s) {
    return { re: a.re * s, im: a.im * s };
  }

  function cAbs(a) {
    return Math.hypot(a.re, a.im);
  }

  function cSqrt(a) {
    const r = cAbs(a);
    const theta = Math.atan2(a.im, a.re) / 2;
    const sr = Math.sqrt(r);
    return { re: sr * Math.cos(theta), im: sr * Math.sin(theta) };
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function keyFor(c) {
    return `${c.x.toFixed(7)}|${c.y.toFixed(7)}|${c.r.toFixed(7)}`;
  }

  // Descartes theorem for four mutually tangent circles.
  // Uses signed curvature: enclosing circle has negative curvature.
  function descartesFourth(c1, c2, c3, signK = 1, signZ = 1) {
    const k1 = c1.k, k2 = c2.k, k3 = c3.k;

    const s = k1 + k2 + k3;
    const q = 2 * Math.sqrt(k1 * k2 + k2 * k3 + k3 * k1);
    const k4 = s + signK * q;

    if (!isFinite(k4) || Math.abs(k4) < 1e-12) return null;

    const z1 = { re: c1.x, im: c1.y };
    const z2 = { re: c2.x, im: c2.y };
    const z3 = { re: c3.x, im: c3.y };

    const kz1 = cScale(z1, k1);
    const kz2 = cScale(z2, k2);
    const kz3 = cScale(z3, k3);

    const t1 = cAdd(cAdd(kz1, kz2), kz3);

    const rad = cSqrt(
      cAdd(
        cAdd(cMul(kz1, kz2), cMul(kz2, kz3)),
        cMul(kz3, kz1)
      )
    );

    const kz4 = cAdd(t1, cScale(rad, 2 * signZ));
    const z4 = cScale(kz4, 1 / k4);
    const r4 = Math.abs(1 / k4);

    return { x: z4.re, y: z4.im, r: r4, k: k4 };
  }

  function validInnerCircle(c) {
    if (!c || !isFinite(c.x) || !isFinite(c.y) || !isFinite(c.r)) return false;
    if (c.k <= 0) return false;
    if (c.r * R < SETTINGS.minRadiusPx) return false;
    if (Math.hypot(c.x, c.y) + c.r > 1.000001) return false;
    return true;
  }

  function buildPacking() {
    circles = [];
    const seen = new Set();

    // Outer boundary of Poincare disk as enclosing circle with negative curvature
    const outer = { x: 0, y: 0, r: 1, k: -1 };

    // Three symmetric tangent circles inside the unit disk
    // Radius for 3 equal circles tangent to each other and tangent internally to unit circle:
    // s = 2r / sqrt(3) and s + r = 1 => r = sqrt(3)/(2 + sqrt(3))
    const r = Math.sqrt(3) / (2 + Math.sqrt(3));
    const s = 1 - r;

    const seeds = [];
    for (let j = 0; j < 3; j++) {
      const th = -Math.PI / 2 + j * (2 * Math.PI / 3);
      seeds.push({
        x: s * Math.cos(th),
        y: s * Math.sin(th),
        r,
        k: 1 / r
      });
    }

    function addCircle(c) {
      if (!validInnerCircle(c)) return false;
      const k = keyFor(c);
      if (seen.has(k)) return false;
      seen.add(k);
      circles.push(c);
      return true;
    }

    for (const s0 of seeds) addCircle(s0);

    const queue = [];

    // Each Descartes quadruple: [a,b,c,d]
    // Starting configuration uses outer + any two inner + one opposite inner
    queue.push([outer, seeds[0], seeds[1], seeds[2]]);

    function enqueueIfNew(a, b, c, d) {
      queue.push([a, b, c, d]);
    }

    while (queue.length && circles.length < SETTINGS.maxCircles) {
      const [a, b, c, d] = queue.shift();

      // Replace each one of the four with the alternate Descartes solution
      const triples = [
        [b, c, d, a],
        [a, c, d, b],
        [a, b, d, c],
        [a, b, c, d]
      ];

      for (const [u, v, w, replaced] of triples) {
        // Compute both center branches, choose the one not equal to replaced
        const candA = descartesFourth(u, v, w, 1, 1);
        const candB = descartesFourth(u, v, w, 1, -1);
        const cands = [candA, candB].filter(validInnerCircle);

        for (const cand of cands) {
          if (
            Math.abs(cand.x - replaced.x) < 1e-6 &&
            Math.abs(cand.y - replaced.y) < 1e-6 &&
            Math.abs(cand.r - replaced.r) < 1e-6
          ) {
            continue;
          }

          if (addCircle(cand)) {
            enqueueIfNew(u, v, w, cand);
            enqueueIfNew(outer, u, v, cand);
            enqueueIfNew(outer, v, w, cand);
            enqueueIfNew(outer, w, u, cand);
          }
        }
      }
    }

    circles.sort((a, b) => b.r - a.r);
  }

  function drawDisk(t) {
    const breathe = 1 + SETTINGS.breatheAmp * Math.sin(SETTINGS.breatheFreq * t);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(R * breathe, R * breathe);

    ctx.strokeStyle = SETTINGS.outerStroke;
    ctx.lineWidth = SETTINGS.lineWidthOuter / (R * breathe);
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.stroke();

    const reveal = Math.min(1, t / SETTINGS.revealSeconds);
    const shownCount = Math.floor(reveal * circles.length);

    for (let i = 0; i < shownCount; i++) {
      const c = circles[i];
      const alpha = Math.max(0.16, Math.min(0.92, 0.20 + 0.55 * Math.pow(c.r / circles[0].r, 0.18)));
      ctx.strokeStyle = `rgba(0, 86, 255, ${alpha})`;
      ctx.lineWidth = SETTINGS.lineWidthInner / (R * breathe);

      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function frame(ms) {
    if (startTime === null) startTime = ms;
    const t = (ms - startTime) * 0.001;

    clear();
    drawDisk(t);

    animationId = requestAnimationFrame(frame);
  }

  function restart() {
    cancelAnimationFrame(animationId);
    startTime = null;
    resize();
    animationId = requestAnimationFrame(frame);
  }

  window.addEventListener("resize", restart, { passive: true });
  resize();
  animationId = requestAnimationFrame(frame);
})();