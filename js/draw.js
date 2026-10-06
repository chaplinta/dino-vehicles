// Cartoon drawing helpers: thick outlines, bright fills.
function rrPath(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function fillStroke(c, fill, lw = 4) {
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (lw) { c.lineWidth = lw; c.strokeStyle = OUT; c.lineJoin = 'round'; c.stroke(); }
}
function rbox(c, x, y, w, h, r, fill, lw = 4) { rrPath(c, x, y, w, h, r); fillStroke(c, fill, lw); }
function ell(c, x, y, rx, ry, fill, lw = 4, rot = 0) {
  c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); fillStroke(c, fill, lw);
}
function poly(c, pts, fill, lw = 4) {
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath(); fillStroke(c, fill, lw);
}
// Thick outlined stroke, for necks, legs, arms, tails.
function limb(c, pts, width, fill, lw = 4) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  if (pts.length === 6) c.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]);
  else for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  if (lw) { c.lineWidth = width + lw * 2; c.strokeStyle = OUT; c.stroke(); }
  c.lineWidth = width; c.strokeStyle = fill; c.stroke();
}
function drawStar(c, x, y, r, rot = 0, fill = '#ffd43b', lw = 3) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.48 : r;
    c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  c.closePath(); fillStroke(c, fill, lw);
  c.restore();
}
function bigText(c, str, x, y, size, fill = '#fff', align = 'center') {
  c.font = `900 ${size}px ${FONT}`;
  c.textAlign = align; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = Math.max(4, size * 0.18); c.strokeStyle = OUT;
  c.strokeText(str, x, y);
  c.fillStyle = fill; c.fillText(str, x, y);
}
function drawCloud(c, x, y, s) {
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.beginPath();
  c.arc(x, y, 30 * s, 0, TAU); c.arc(x + 30 * s, y - 14 * s, 34 * s, 0, TAU);
  c.arc(x + 64 * s, y, 28 * s, 0, TAU); c.arc(x + 32 * s, y + 8 * s, 30 * s, 0, TAU);
  c.fill();
}
function drawSun(c, x, y, t, cool) {
  c.save(); c.translate(x, y); c.rotate(t * 0.2);
  c.fillStyle = '#ffe066';
  for (let i = 0; i < 12; i++) {
    c.rotate(TAU / 12);
    c.beginPath(); c.moveTo(-8, -50); c.lineTo(0, -72); c.lineTo(8, -50); c.fill();
  }
  c.restore();
  ell(c, x, y, 42, 42, '#ffd43b', 4);
  ell(c, x - 13, y - 6, 4, 5, OUT, 0); ell(c, x + 13, y - 6, 4, 5, OUT, 0);
  c.beginPath(); c.arc(x, y + 4, 16, 0.3, Math.PI - 0.3); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
  ell(c, x - 24, y + 8, 7, 4, 'rgba(255,120,120,0.6)', 0); ell(c, x + 24, y + 8, 7, 4, 'rgba(255,120,120,0.6)', 0);
  if (cool) {
    rbox(c, x - 27, y - 14, 22, 14, 6, OUT, 0); rbox(c, x + 5, y - 14, 22, 14, 6, OUT, 0);
    c.fillStyle = OUT; c.fillRect(x - 6, y - 11, 12, 3);
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x - 23, y - 11, 6, 3); c.fillRect(x + 9, y - 11, 6, 3);
  }
}
function drawHills(c, camX, factor, baseY, amp, color, seed) {
  c.beginPath(); c.moveTo(0, H);
  for (let x = 0; x <= W + 20; x += 20) {
    const wx = x + camX * factor;
    c.lineTo(x, baseY - (Math.sin(wx * 0.004 + seed) * amp + Math.sin(wx * 0.011 + seed * 2) * amp * 0.4));
  }
  c.lineTo(W, H); c.closePath(); c.fillStyle = color; c.fill();
}
