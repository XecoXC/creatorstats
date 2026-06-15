const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const dir = path.join(__dirname, 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#1a0e2e');
  grad.addColorStop(1, '#0e0e1a');
  ctx.fillStyle = grad;
  const r = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // Accent circle
  const accentGrad = ctx.createRadialGradient(size*0.4, size*0.4, 0, size*0.5, size*0.5, size*0.45);
  accentGrad.addColorStop(0, 'rgba(124,92,252,0.3)');
  accentGrad.addColorStop(1, 'rgba(124,92,252,0)');
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, size, size);

  // Chart bars icon
  const p = size * 0.2;
  const w = size - p * 2;
  const barW = w / 5;
  const bars = [0.5, 0.75, 0.4, 0.9, 0.65];
  bars.forEach((h, i) => {
    const bh = w * h;
    const bx = p + i * barW + barW * 0.15;
    const bw2 = barW * 0.7;
    const by = p + w - bh;
    const barGrad = ctx.createLinearGradient(0, by, 0, by + bh);
    barGrad.addColorStop(0, '#a78bfa');
    barGrad.addColorStop(1, '#7c5cfc');
    ctx.fillStyle = barGrad;
    const br = bw2 * 0.3;
    ctx.beginPath();
    ctx.moveTo(bx + br, by);
    ctx.lineTo(bx + bw2 - br, by);
    ctx.quadraticCurveTo(bx + bw2, by, bx + bw2, by + br);
    ctx.lineTo(bx + bw2, by + bh);
    ctx.lineTo(bx, by + bh);
    ctx.lineTo(bx, by + br);
    ctx.quadraticCurveTo(bx, by, bx + br, by);
    ctx.closePath();
    ctx.fill();
  });

  // Sparkle dot
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(size * 0.78, size * 0.25, size * 0.06, 0, Math.PI * 2);
  ctx.fill();

  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(dir, `icon-${size}.png`), buf);
  console.log(`✓ icon-${size}.png`);
});
console.log('Icons generated!');
