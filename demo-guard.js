(() => {
  const DEMO = { moderate: 20, elevated: 28, high: 35, moderateAfter: 3, elevatedAfter: 2.5, highAfter: 2, recovery: 1 };
  let band = 'low', bandSince = 0, rank = 0, recoverySince = 0;
  const read = id => document.getElementById(id);
  const fmt = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const tick = () => {
    const status = read('calibrationStatus'), badge = read('riskBadge'), reason = read('riskReason');
    const deviation = read('deviationReadout'), exposure = read('exposureReadout'), state = read('stateReadout'), trend = read('trendReadout');
    const wrap = read('videoWrap');
    if (!badge || !deviation || !wrap) return;
    if (status?.textContent.includes('CALIBRANDO') || status?.textContent.includes('PREPÁRATE') || !status?.textContent.includes('GUARDADA')) {
      band = 'low'; bandSince = performance.now(); rank = 0; recoverySince = 0;
      badge.textContent = '...  CALIBRANDO REFERENCIA';
      if (reason) reason.textContent = 'Mantén tu postura natural durante 10 segundos.';
      if (state) state.textContent = 'ESTADO CALIBRANDO';
      if (trend) trend.textContent = 'STABLE';
      wrap.dataset.risk = 'healthy';
      return;
    }
    const match = deviation.textContent.match(/TORSO\s+([0-9.]+)/);
    if (!match) return;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) return;
    const now = performance.now();
    const nextBand = value <= DEMO.moderate ? 'low' : value <= DEMO.elevated ? 'moderate' : value <= DEMO.high ? 'elevated' : 'high';
    if (nextBand !== band) { band = nextBand; bandSince = now; }
    const duration = (now - bandSince) / 1000;
    const target = band === 'low' ? 0 : band === 'moderate' ? (duration >= DEMO.moderateAfter ? 1 : 0) : band === 'elevated' ? (duration >= DEMO.elevatedAfter ? 2 : 1) : (duration >= DEMO.highAfter ? 3 : 2);
    if (target > rank) rank += 1;
    else if (target < rank) { if (!recoverySince) recoverySince = now; if ((now - recoverySince) / 1000 >= DEMO.recovery) { rank -= 1; recoverySince = now; } }
    else recoverySince = 0;
    const levels = [['LOW EXPOSURE', 'healthy', '✓'], ['MODERATE EXPOSURE', 'warning', '!'], ['ELEVATED EXPOSURE', 'elevated', '!'], ['HIGH EXPOSURE', 'risk', '✕']];
    const current = levels[Math.max(0, Math.min(3, rank))];
    if (badge) badge.textContent = `${current[2]}  ${current[0]}`;
    wrap.dataset.risk = current[1];
    if (state) state.textContent = `ESTADO ${current[0]}`;
    if (trend) trend.textContent = target > rank ? 'INCREASING' : target < rank ? 'RECOVERING' : 'SUSTAINED';
    if (exposure && value > DEMO.moderate) exposure.textContent = fmt(duration);
  };
  setInterval(tick, 250);
  document.addEventListener('DOMContentLoaded', () => {
    const app = document.querySelector('.app');
    const workspace = document.querySelector('.workspace');
    if (!app || !workspace || document.querySelector('.lab-launch')) return;
    const link = document.createElement('a');
    link.className = 'lab-launch';
    link.href = 'architecture-lab.html';
    link.textContent = 'KINET ARCHITECTURE LAB';
    link.style.cssText = 'display:block;width:max-content;margin:-10px 0 12px auto;padding:8px 11px;border:1px solid #1b2430;color:#00e5ff;background:#080b10;text-decoration:none;font:600 10px ui-monospace,monospace;letter-spacing:.08em';
    app.insertBefore(link, workspace);
  });
})();
