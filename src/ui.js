/* UI controller — owns app state and renders the DOM chrome
   (legend, speed/play controls, info panel, rotating ticker).
   The 3D scene reads SolarUI.state every frame and calls SolarUI.select(). */
window.SolarUI = (function () {
  const DATA = window.SOLAR_DATA;
  const FACTS = window.SOLAR_FACTS;

  // shared, live state — read directly by the scene loop
  const state = { selectedKey: null, playing: true, speed: 0.5 };
  let resetRequested = false;

  // cached DOM refs (filled on init)
  let el = {};

  // ---------- legend ----------
  function renderLegend() {
    el.legendList.innerHTML = '';
    DATA.forEach((d, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sol-legend-item';
      btn.dataset.key = d.key;

      const num = document.createElement('span');
      num.className = 'sol-legend-num';
      num.textContent = String(i + 1).padStart(2, '0');

      const dot = document.createElement('span');
      dot.className = 'sol-legend-dot';
      dot.style.background = d.color;
      dot.style.boxShadow = '0 0 8px ' + d.color;

      const name = document.createElement('span');
      name.textContent = d.name;

      btn.append(num, dot, name);
      btn.addEventListener('click', () => select(d.key));
      el.legendList.appendChild(btn);
    });
  }

  function updateLegendHighlight() {
    el.legendList.querySelectorAll('.sol-legend-item').forEach((btn) => {
      btn.classList.toggle('is-selected', btn.dataset.key === state.selectedKey);
    });
  }

  // ---------- speed ----------
  function renderSpeeds() {
    el.speedList.innerHTML = '';
    [0.5, 1, 2, 4].forEach((m) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sol-speed-btn';
      btn.dataset.mult = String(m);
      btn.textContent = m + '×';
      btn.addEventListener('click', () => setSpeed(m));
      el.speedList.appendChild(btn);
    });
    updateSpeedHighlight();
  }

  function updateSpeedHighlight() {
    el.speedList.querySelectorAll('.sol-speed-btn').forEach((btn) => {
      btn.classList.toggle('is-active', Number(btn.dataset.mult) === state.speed);
    });
  }

  // ---------- play / pause ----------
  function updatePlayButton() {
    el.playGlyph.textContent = state.playing ? '❚❚' : '▶';
    el.playLabel.textContent = state.playing ? 'PAUSE' : 'PLAY';
  }

  // ---------- info panel ----------
  function updatePanel() {
    const d = DATA.find((x) => x.key === state.selectedKey) || null;
    if (!d) {
      el.panel.hidden = true;
      el.ticker.style.display = 'block';
      return;
    }
    el.panelAccent.style.background = d.color;
    el.panelAccent.style.boxShadow = '0 0 16px ' + d.color;
    el.panelType.textContent = d.type;
    el.panelName.textContent = d.name;
    el.panelTagline.textContent = d.tagline;
    el.panelBlurb.textContent = d.blurb;

    el.panelStats.innerHTML = '';
    d.stats.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'sol-stat-row';
      const l = document.createElement('span');
      l.className = 'sol-stat-label';
      l.textContent = label;
      const v = document.createElement('span');
      v.className = 'sol-stat-value';
      v.textContent = value;
      row.append(l, v);
      el.panelStats.appendChild(row);
    });

    // restart the slide-in animation each time a new body is shown
    el.panel.hidden = false;
    el.panel.style.animation = 'none';
    void el.panel.offsetWidth;
    el.panel.style.animation = '';

    el.ticker.style.display = 'none';
  }

  // ---------- actions ----------
  function select(key) {
    state.selectedKey = key;
    updateLegendHighlight();
    updatePanel();
  }
  function closePanel() {
    state.selectedKey = null;
    updateLegendHighlight();
    updatePanel();
  }
  function togglePlay() {
    state.playing = !state.playing;
    updatePlayButton();
  }
  function setSpeed(m) {
    state.speed = m;
    updateSpeedHighlight();
  }
  function resetView() {
    resetRequested = true;
    closePanel();
  }
  function consumeReset() {
    const r = resetRequested;
    resetRequested = false;
    return r;
  }

  // ---------- rotating ticker ----------
  function startTicker() {
    const list = FACTS || [];
    if (!list.length || !el.ticker) return;

    const wrap = document.createElement('div');
    wrap.className = 'sol-ticker-wrap';
    const tag = document.createElement('div');
    tag.className = 'sol-ticker-tag';
    const dot = document.createElement('span');
    dot.className = 'sol-ticker-dot';
    const tagText = document.createElement('span');
    tag.append(dot, tagText);
    const txt = document.createElement('div');
    txt.className = 'sol-ticker-text';
    wrap.append(tag, txt);
    el.ticker.appendChild(wrap);

    // shuffle so it never repeats until the full pool cycles
    const order = list.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }

    let k = 0;
    const show = () => {
      const it = list[order[k % order.length]];
      txt.textContent = it.text;
      tagText.textContent = it.tag;
      wrap.style.opacity = '1';
    };
    const cycle = () => {
      wrap.style.opacity = '0';
      setTimeout(() => { k++; show(); }, 650);
    };
    setTimeout(show, 900);
    setInterval(cycle, 6500);
  }

  // ---------- init ----------
  function init() {
    el = {
      legendList: document.getElementById('legend-list'),
      speedList: document.getElementById('speed-list'),
      playBtn: document.getElementById('play-btn'),
      playGlyph: document.getElementById('play-glyph'),
      playLabel: document.getElementById('play-label'),
      resetBtn: document.getElementById('reset-btn'),
      ticker: document.getElementById('ticker'),
      panel: document.getElementById('panel'),
      panelClose: document.getElementById('panel-close'),
      panelAccent: document.getElementById('panel-accent'),
      panelType: document.getElementById('panel-type'),
      panelName: document.getElementById('panel-name'),
      panelTagline: document.getElementById('panel-tagline'),
      panelBlurb: document.getElementById('panel-blurb'),
      panelStats: document.getElementById('panel-stats')
    };

    renderLegend();
    renderSpeeds();
    updatePlayButton();
    updatePanel();

    el.playBtn.addEventListener('click', togglePlay);
    el.resetBtn.addEventListener('click', resetView);
    el.panelClose.addEventListener('click', closePanel);

    startTicker();
  }

  return { state, init, select, closePanel, consumeReset };
})();
