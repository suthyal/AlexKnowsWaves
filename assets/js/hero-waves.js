document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("hero-waves-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  const waveColor = "#0056FF";

  const componentWaves = [
    { yOffset: 0.56, amp: 16, len: 190, speed: 0.28, modSpeed: 0.0013, phase: 0.0, width: 1.45, alpha: 0.22 },
    { yOffset: 0.68, amp: 20, len: 125, speed: 0.38, modSpeed: 0.0018, phase: 1.2, width: 1.45, alpha: 0.26 },
    { yOffset: 0.80, amp: 15, len: 82,  speed: 0.48, modSpeed: 0.0014, phase: 2.4, width: 1.45, alpha: 0.22 },
    { yOffset: 0.92, amp: 11, len: 52,  speed: 0.62, modSpeed: 0.0020, phase: 3.2, width: 1.45, alpha: 0.18 }
  ];

  const sumWave = {
    yOffset: 0.23,
    width: 2.6,
    alpha: 0.96
  };

  function waveValue(x, time, wave) {
    const drift = time * wave.speed * 0.001;
    const mod = 0.78 + 0.45 * Math.sin(time * wave.modSpeed + wave.phase);
    return Math.sin((x / wave.len) + drift + wave.phase) * wave.amp * mod;
  }

  function drawSingleWave(time, wave, width, height) {
    const baseY = height * wave.yOffset;

    ctx.beginPath();

    for (let x = 0; x <= width; x += 2) {
      const y = baseY + waveValue(x, time, wave);

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.lineWidth = wave.width;
    ctx.strokeStyle = waveColor;
    ctx.globalAlpha = wave.alpha;
    ctx.stroke();
  }

  function drawSumWave(time, width, height) {
    const baseY = height * sumWave.yOffset;

    ctx.beginPath();

    for (let x = 0; x <= width; x += 2) {
      let sum = 0;
      for (const wave of componentWaves) {
        sum += waveValue(x, time, wave);
      }

      const y = baseY + 1.9 * sum;

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.lineWidth = sumWave.width;
    ctx.strokeStyle = waveColor;
    ctx.globalAlpha = sumWave.alpha;
    ctx.stroke();
  }

  function drawDivider(width, height) {
    const y = height * 0.42;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.lineWidth = 1;
    ctx.strokeStyle = waveColor;
    ctx.globalAlpha = 0.08;
    ctx.stroke();
  }

  function animate(time) {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    drawSumWave(time, width, height);
    drawDivider(width, height);

    for (const wave of componentWaves) {
      drawSingleWave(time, wave, width, height);
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(animate);
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  requestAnimationFrame(animate);
});