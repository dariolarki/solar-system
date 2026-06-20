/* 3D scene — Three.js orrery.
   Ported from the design prototype's initScene(): procedural textures,
   monochrome galaxy backdrop, orbit rings, atmospheres, rings, bloom,
   shadows, hover highlight, parallax/twinkle stars, shooting stars,
   intro dolly, and the camera/label/animation loop. */
window.SolarScene = (function () {
  // toggles that were component props in the prototype
  const PROPS = { showOrbits: true, showLabels: true, autoRotate: false };

  function init(mount, labelsEl, loadingEl) {
    const THREE = window.THREE;
    if (!THREE) { setTimeout(() => init(mount, labelsEl, loadingEl), 80); return; }

    const DATA = window.SOLAR_DATA;
    const UI = window.SolarUI;

    const haveBloom = !!(THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass);

    let W = mount.clientWidth || window.innerWidth;
    let H = mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 6000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // ---------- post-processing (bloom) ----------
    let composer = null, bloom = null;
    if (haveBloom) {
      try {
        composer = new THREE.EffectComposer(renderer);
        composer.addPass(new THREE.RenderPass(scene, camera));
        bloom = new THREE.UnrealBloomPass(new THREE.Vector2(W, H), 0.85, 0.5, 0.62);
        composer.addPass(bloom);
      } catch (e) { composer = null; bloom = null; }
    }

    // ---------- texture helpers ----------
    const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const mkTex = (c) => { const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.needsUpdate = true; return t; };
    const lerpHex = (a, b, t) => {
      const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
      const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
      return 'rgb(' + Math.round(pa[0] + (pb[0] - pa[0]) * t) + ',' + Math.round(pa[1] + (pb[1] - pa[1]) * t) + ',' + Math.round(pa[2] + (pb[2] - pa[2]) * t) + ')';
    };
    const R = Math.random;

    function rockTex(base, dark, light) {
      const c = cv(512, 256), x = c.getContext('2d');
      x.fillStyle = base; x.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 900; i++) { x.fillStyle = 'rgba(0,0,0,' + (R() * 0.05) + ')'; x.fillRect(R() * 512, R() * 256, 2, 2); }
      for (let i = 0; i < 150; i++) {
        const cx = R() * 512, cy = R() * 256, r = 2 + R() * 16;
        x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fillStyle = dark; x.globalAlpha = 0.35; x.fill();
        x.beginPath(); x.arc(cx - r * 0.2, cy - r * 0.2, r * 0.7, 0, 7); x.fillStyle = light; x.globalAlpha = 0.22; x.fill();
        x.globalAlpha = 1;
      }
      return mkTex(c);
    }
    function earthTex() {
      const c = cv(640, 320), x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, 320);
      g.addColorStop(0, '#0e2f5c'); g.addColorStop(.5, '#13518f'); g.addColorStop(1, '#0e2f5c');
      x.fillStyle = g; x.fillRect(0, 0, 640, 320);
      const greens = ['#2e6b34', '#3f7a3a', '#6b7a3a', '#5d6e2f', '#7a6a3e'];
      for (let i = 0; i < 26; i++) {
        const cx = R() * 640, cy = 40 + R() * 240, n = 8 + R() * 18;
        x.fillStyle = greens[(R() * greens.length) | 0];
        for (let j = 0; j < n; j++) { x.globalAlpha = 0.55; x.beginPath(); x.arc(cx + (R() - .5) * 70, cy + (R() - .5) * 50, 8 + R() * 22, 0, 7); x.fill(); }
      }
      x.globalAlpha = 1;
      x.fillStyle = '#eef3f6';
      x.fillRect(0, 0, 640, 16); x.fillRect(0, 304, 640, 16);
      for (let i = 0; i < 60; i++) { x.globalAlpha = 0.5 * R(); x.beginPath(); x.arc(R() * 640, R() * 40, 4 + R() * 10, 0, 7); x.fill(); x.beginPath(); x.arc(R() * 640, 280 + R() * 40, 4 + R() * 10, 0, 7); x.fill(); }
      x.globalAlpha = 0.4;
      for (let i = 0; i < 40; i++) { x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(R() * 640, R() * 320, 12 + R() * 30, 5 + R() * 10, R() * 3, 0, 7); x.fill(); }
      x.globalAlpha = 1;
      return mkTex(c);
    }
    function marsTex() {
      const c = cv(512, 256), x = c.getContext('2d');
      x.fillStyle = '#b5481f'; x.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 60; i++) { x.globalAlpha = 0.4; x.fillStyle = R() > .5 ? '#8a3415' : '#cf6a36'; x.beginPath(); x.ellipse(R() * 512, R() * 256, 12 + R() * 40, 8 + R() * 20, R() * 3, 0, 7); x.fill(); }
      for (let i = 0; i < 300; i++) { x.globalAlpha = 0.18; x.fillStyle = '#5e2410'; x.beginPath(); x.arc(R() * 512, R() * 256, 1 + R() * 6, 0, 7); x.fill(); }
      x.globalAlpha = 0.85; x.fillStyle = '#f0e6dd'; x.fillRect(0, 0, 512, 10); x.fillRect(0, 246, 512, 10);
      x.globalAlpha = 1; return mkTex(c);
    }
    function venusTex() {
      const c = cv(512, 256), x = c.getContext('2d');
      x.fillStyle = '#d9b06a'; x.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 50; i++) {
        x.globalAlpha = 0.3; x.strokeStyle = R() > .5 ? '#bb8c45' : '#f0dca6'; x.lineWidth = 4 + R() * 14;
        x.beginPath(); const y = R() * 256; x.moveTo(0, y); x.bezierCurveTo(170, y + (R() - .5) * 40, 340, y + (R() - .5) * 40, 512, y + (R() - .5) * 30); x.stroke();
      }
      x.globalAlpha = 1; return mkTex(c);
    }
    function gasTex(bands, storm) {
      const c = cv(640, 320), x = c.getContext('2d');
      for (let y = 0; y < 320; y++) {
        const t = y / 320;
        let n = 0.5 + 0.5 * Math.sin(t * Math.PI * bands.length * 1.6) + 0.18 * Math.sin(t * 60);
        n = Math.max(0, Math.min(0.999, n));
        const idx = n * (bands.length - 1); const i0 = Math.floor(idx); const f = idx - i0;
        x.fillStyle = lerpHex(bands[i0], bands[Math.min(i0 + 1, bands.length - 1)], f);
        x.fillRect(0, y, 640, 1);
      }
      x.globalAlpha = 0.25;
      for (let i = 0; i < 200; i++) { x.fillStyle = R() > .5 ? '#ffffff' : '#000000'; x.beginPath(); x.ellipse(R() * 640, R() * 320, 8 + R() * 30, 2 + R() * 4, 0, 0, 7); x.fill(); }
      x.globalAlpha = 1;
      if (storm) {
        x.fillStyle = storm; x.globalAlpha = 0.85; x.beginPath(); x.ellipse(430, 200, 44, 22, 0, 0, 7); x.fill();
        x.fillStyle = '#7a2a18'; x.globalAlpha = 0.6; x.beginPath(); x.ellipse(430, 200, 26, 12, 0, 0, 7); x.fill(); x.globalAlpha = 1;
      }
      return mkTex(c);
    }
    function iceTex(base, band, storm) {
      const c = cv(512, 256), x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, band); g.addColorStop(.5, base); g.addColorStop(1, band);
      x.fillStyle = g; x.fillRect(0, 0, 512, 256);
      x.globalAlpha = 0.16;
      for (let i = 0; i < 14; i++) { x.fillStyle = '#ffffff'; x.fillRect(0, i * 18 + (R() * 6), 512, 3 + R() * 4); }
      x.globalAlpha = 1;
      if (storm) { x.fillStyle = storm; x.globalAlpha = 0.7; x.beginPath(); x.ellipse(340, 150, 30, 16, 0, 0, 7); x.fill(); x.globalAlpha = 1; }
      return mkTex(c);
    }
    function plutoTex() {
      const c = cv(512, 256), x = c.getContext('2d');
      x.fillStyle = '#c9b79b'; x.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 80; i++) { x.globalAlpha = 0.3; x.fillStyle = R() > .5 ? '#9c8467' : '#e3d6bf'; x.beginPath(); x.ellipse(R() * 512, R() * 256, 10 + R() * 36, 8 + R() * 18, R() * 3, 0, 7); x.fill(); }
      // heart-shaped lighter region
      x.globalAlpha = 0.85; x.fillStyle = '#ece1cb';
      x.beginPath(); x.arc(250, 150, 26, 0, 7); x.fill();
      x.beginPath(); x.arc(290, 150, 22, 0, 7); x.fill();
      x.beginPath(); x.moveTo(228, 162); x.lineTo(312, 162); x.lineTo(270, 210); x.closePath(); x.fill();
      x.globalAlpha = 1; return mkTex(c);
    }
    function sunTex() {
      const c = cv(512, 256), x = c.getContext('2d');
      x.fillStyle = '#ffcb3a'; x.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 2200; i++) { x.globalAlpha = 0.4 * R(); x.fillStyle = R() > .5 ? '#ff9617' : '#fff0b0'; const r = 1 + R() * 4; x.beginPath(); x.arc(R() * 512, R() * 256, r, 0, 7); x.fill(); }
      for (let i = 0; i < 24; i++) { x.globalAlpha = 0.4; x.fillStyle = '#c8550a'; x.beginPath(); x.arc(R() * 512, R() * 256, 3 + R() * 7, 0, 7); x.fill(); }
      x.globalAlpha = 1; return mkTex(c);
    }
    function ringTex(c0) {
      const c = cv(512, 512), x = c.getContext('2d'); const cc = 256;
      for (let r = 40; r < 252; r++) {
        const t = (r - 40) / 212;
        let a = 0.5 + 0.35 * Math.sin(r * 0.5) + 0.1 * Math.sin(r * 0.13);
        if (t > 0.58 && t < 0.66) a = 0.04;      // Cassini division
        if (t > 0.9) a *= 0.4;
        a = Math.max(0, Math.min(0.92, a));
        x.strokeStyle = 'rgba(' + c0 + ',' + a + ')'; x.lineWidth = 1.3;
        x.beginPath(); x.arc(cc, cc, r, 0, 7); x.stroke();
      }
      return mkTex(c);
    }
    function makeTex(d) {
      switch (d.tex) {
        case 'sun': return sunTex();
        case 'earth': return earthTex();
        case 'mars': return marsTex();
        case 'venus': return venusTex();
        case 'jupiter': return gasTex(['#caa06a', '#e8d3aa', '#b07b48', '#dcc296', '#9c6b3e', '#e8d3aa'], '#b5432a');
        case 'saturn': return gasTex(['#e6c98f', '#f0e0b4', '#d4b377', '#efe3bf', '#cda66a'], null);
        case 'uranus': return iceTex('#a6e1e6', '#c4eef0', null);
        case 'neptune': return iceTex('#3a64d6', '#5b86ea', '#1d2f6b');
        case 'pluto': return plutoTex();
        case 'rock':
          if (d.key === 'moon') return rockTex('#b8b8be', '#6f6f76', '#e2e2e6');
          return rockTex('#9a8a73', '#5f5246', '#c7b79a');
        default: return rockTex(d.color, '#444', '#aaa');
      }
    }

    // ---------- background: nebula + stars ----------
    (function buildSky() {
      const c = cv(2048, 1024), x = c.getContext('2d');
      x.fillStyle = '#04050a'; x.fillRect(0, 0, 2048, 1024);
      // milky way band (diagonal)
      x.save(); x.translate(1024, 512); x.rotate(-0.5);
      const bg = x.createLinearGradient(0, -220, 0, 220);
      bg.addColorStop(0, 'rgba(44,52,76,0)'); bg.addColorStop(.5, 'rgba(82,88,116,0.34)'); bg.addColorStop(1, 'rgba(44,52,76,0)');
      x.fillStyle = bg; x.fillRect(-1300, -220, 2600, 440);
      x.restore();
      // faint colored nebula blobs (subtle)
      const blobs = [['80,120,180', 300, 260, 260], ['150,90,170', 1500, 640, 320], ['70,150,150', 1150, 300, 240], ['120,110,180', 600, 760, 300]];
      blobs.forEach(b => { const rg = x.createRadialGradient(b[1], b[2], 0, b[1], b[2], b[3]); rg.addColorStop(0, 'rgba(' + b[0] + ',0.18)'); rg.addColorStop(1, 'rgba(' + b[0] + ',0)'); x.fillStyle = rg; x.fillRect(0, 0, 2048, 1024); });
      // stars
      for (let i = 0; i < 2600; i++) { const s = R(); x.globalAlpha = 0.25 + R() * 0.75; x.fillStyle = s > 0.94 ? '#bcd0ff' : (s > 0.88 ? '#ffe6c0' : '#ffffff'); const r = R() < 0.92 ? 0.6 + R() * 0.9 : 1.4 + R() * 1.4; x.beginPath(); x.arc(R() * 2048, R() * 1024, r, 0, 7); x.fill(); }
      x.globalAlpha = 1;
      const tx = new THREE.CanvasTexture(c); tx.mapping = THREE.EquirectangularReflectionMapping;
      const sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 48, 48), new THREE.MeshBasicMaterial({ map: tx, side: THREE.BackSide }));
      scene.add(sky);
    })();

    // foreground stars — layered parallax + per-star twinkle
    const starU = { time: { value: 0 } };
    const starGroup = new THREE.Group(); scene.add(starGroup);
    const twinkleLayer = (count, rMin, rMax, szMin, szMax, op) => {
      const pos = new Float32Array(count * 3), ph = new Float32Array(count), sz = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const r = rMin + R() * (rMax - rMin), th = R() * Math.PI * 2, pp = Math.acos(R() * 2 - 1);
        pos[i * 3] = r * Math.sin(pp) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(pp); pos[i * 3 + 2] = r * Math.sin(pp) * Math.sin(th);
        ph[i] = R() * 6.283; sz[i] = szMin + R() * (szMax - szMin);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
      g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
      const m = new THREE.ShaderMaterial({
        uniforms: { time: starU.time, uOpacity: { value: op } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: 'attribute float aPhase; attribute float aSize; uniform float time; varying float vT; void main(){ vT=0.4+0.6*abs(sin(time*0.7+aPhase)); vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=aSize*(280.0/-mv.z); gl_Position=projectionMatrix*mv; }',
        fragmentShader: 'uniform float uOpacity; varying float vT; void main(){ vec2 d=gl_PointCoord-0.5; float r=length(d); if(r>0.5) discard; float a=(1.0-r*2.0)*vT*uOpacity; gl_FragColor=vec4(1.0,1.0,1.0,a); }'
      });
      starGroup.add(new THREE.Points(g, m));
    };
    twinkleLayer(1500, 420, 1100, 1.4, 3.2, 0.95);
    twinkleLayer(2000, 1300, 2400, 0.8, 1.8, 0.55);

    // ---------- lights ----------
    scene.add(new THREE.AmbientLight(0x3a4258, 0.34));
    const sunLight = new THREE.PointLight(0xfff1d4, 2.6, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 460;
    sunLight.shadow.bias = -0.0006;
    sunLight.shadow.radius = 4;
    scene.add(sunLight);

    // ---------- bodies ----------
    const orbiters = [];   // {pivot, holder, mesh, orbit, spin}
    const pickables = [];
    const labelInfo = [];  // {key, obj, el}
    const focusMap = {};
    const orbitsGroup = new THREE.Group(); scene.add(orbitsGroup);

    // orbit rings
    DATA.forEach(d => {
      if (d.dist > 0 && !d.belt && !d.moonOf) {
        const seg = 160, p = [];
        for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; p.push(new THREE.Vector3(Math.cos(a) * d.dist, 0, Math.sin(a) * d.dist)); }
        const g = new THREE.BufferGeometry().setFromPoints(p);
        const ring = new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: d.key === 'pluto' ? 0.1 : 0.16 }));
        if (d.incl) ring.rotation.z = d.incl;
        orbitsGroup.add(ring);
      }
    });

    let earthHolder = null;
    let moonPivot = null;
    let beltGroup = null;

    DATA.forEach(d => {
      if (d.belt || d.moonOf) return;
      if (d.sun) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(d.radius, 64, 64), new THREE.MeshBasicMaterial({ map: makeTex(d) }));
        mesh.userData.key = 'sun'; scene.add(mesh); pickables.push(mesh); focusMap.sun = mesh;
        // glow
        const gc = cv(256, 256), gx = gc.getContext('2d'); const rg = gx.createRadialGradient(128, 128, 10, 128, 128, 128);
        rg.addColorStop(0, 'rgba(255,210,110,0.9)'); rg.addColorStop(.25, 'rgba(255,170,60,0.5)'); rg.addColorStop(1, 'rgba(255,150,40,0)');
        gx.fillStyle = rg; gx.fillRect(0, 0, 256, 256);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        sp.scale.set(d.radius * 5.4, d.radius * 5.4, 1); scene.add(sp);
        orbiters.push({ pivot: null, holder: mesh, mesh, orbit: 0, spin: 0.06 });
        labelInfo.push({ key: 'sun', obj: mesh, el: null });
        return;
      }
      const pivot = new THREE.Object3D(); pivot.rotation.y = R() * Math.PI * 2; scene.add(pivot);
      if (d.incl) pivot.rotation.z = d.incl;
      const holder = new THREE.Object3D(); holder.position.x = d.dist; pivot.add(holder);
      const mat = new THREE.MeshStandardMaterial({ map: makeTex(d), roughness: 1, metalness: 0 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(d.radius, 48, 48), mat);
      mesh.rotation.z = (d.key === 'uranus') ? 1.6 : 0.25 * R();
      mesh.userData.key = d.key; holder.add(mesh); pickables.push(mesh); focusMap[d.key] = holder;
      labelInfo.push({ key: d.key, obj: holder, el: null });
      if (d.key === 'saturn') { mesh.castShadow = true; mesh.receiveShadow = true; }
      const ATMO = { earth: [0x6ab4ff, 1.13, 3.0], venus: [0xf2d693, 1.15, 2.4], mars: [0xff9a72, 1.07, 4.0], jupiter: [0xf0d2a0, 1.05, 3.4], saturn: [0xf1e2bc, 1.05, 3.4], uranus: [0xbdeef2, 1.07, 3.0], neptune: [0x7aa0ff, 1.08, 2.8] };
      if (ATMO[d.key]) {
        const A = ATMO[d.key];
        const am = new THREE.ShaderMaterial({
          uniforms: { uColor: { value: new THREE.Color(A[0]) }, uPow: { value: A[2] } }, side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
          vertexShader: 'varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
          fragmentShader: 'uniform vec3 uColor; uniform float uPow; varying vec3 vN; void main(){ float i=pow(1.0-abs(vN.z),uPow); gl_FragColor=vec4(uColor, i); }'
        });
        holder.add(new THREE.Mesh(new THREE.SphereGeometry(d.radius * A[1], 48, 48), am));
      }

      if (d.rings) {
        const inner = d.radius * 1.35, outer = d.radius * (d.key === 'saturn' ? 2.35 : 1.9);
        const rg = new THREE.RingGeometry(inner, outer, 96);
        const col = d.key === 'saturn' ? '226,200,150' : '170,210,220';
        const rmesh = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: ringTex(col), side: THREE.DoubleSide, transparent: true, opacity: d.key === 'saturn' ? 0.95 : 0.6, roughness: 1, metalness: 0 }));
        rmesh.rotation.x = -Math.PI / 2 + (d.key === 'uranus' ? 1.6 : 0.28);
        if (d.key === 'saturn') { rmesh.receiveShadow = true; }
        holder.add(rmesh);
      }
      const orbit = 1.6 / Math.sqrt(d.dist);
      orbiters.push({ pivot, holder, mesh, orbit, spin: 0.18 + R() * 0.2 });
      if (d.key === 'earth') earthHolder = holder;
    });

    // Moon
    const moonData = DATA.find(d => d.key === 'moon');
    if (earthHolder && moonData) {
      const mp = new THREE.Object3D(); earthHolder.add(mp);
      const mh = new THREE.Object3D(); mh.position.x = 2.6; mp.add(mh);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(moonData.radius, 32, 32), new THREE.MeshStandardMaterial({ map: makeTex(moonData), roughness: 1 }));
      moon.userData.key = 'moon'; mh.add(moon); pickables.push(moon); focusMap.moon = mh;
      labelInfo.push({ key: 'moon', obj: mh, el: null });
      moonPivot = mp;
    }

    // Asteroid belt
    const beltData = DATA.find(d => d.belt);
    beltGroup = new THREE.Group(); scene.add(beltGroup);
    if (beltData) {
      const N = 900;
      const geo = new THREE.DodecahedronGeometry(0.12, 0);
      const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x8d8278, roughness: 1 }), N);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < N; i++) {
        const a = R() * Math.PI * 2; const rad = beltData.dist - 7 + R() * 14; const y = (R() - .5) * 2.4;
        dummy.position.set(Math.cos(a) * rad, y, Math.sin(a) * rad); const s = 0.4 + R() * 1.6; dummy.scale.set(s, s, s); dummy.rotation.set(R() * 7, R() * 7, R() * 7); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
      }
      beltGroup.add(im);
      // invisible pick torus + label anchor
      const tor = new THREE.Mesh(new THREE.TorusGeometry(beltData.dist, 5, 8, 80), new THREE.MeshBasicMaterial({ visible: false }));
      tor.rotation.x = Math.PI / 2; tor.userData.key = 'belt'; scene.add(tor); pickables.push(tor);
      const anchor = new THREE.Object3D(); anchor.position.set(beltData.dist, 3, 0); scene.add(anchor); focusMap.belt = anchor;
      labelInfo.push({ key: 'belt', obj: anchor, el: null });
    }

    // ---------- labels (DOM) ----------
    labelInfo.forEach(li => {
      const d = DATA.find(x => x.key === li.key);
      const el = document.createElement('div'); el.className = 'sol-label';
      el.innerHTML = '<span class="d" style="color:' + d.color + '"></span><span>' + d.name + '</span><span class="t"></span>';
      el.addEventListener('click', (e) => { e.stopPropagation(); UI.select(li.key); });
      labelsEl.appendChild(el); li.el = el;
    });

    // ---------- hover highlight ----------
    const hoverRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 56), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, depthTest: false }));
    hoverRing.visible = false; hoverRing.renderOrder = 5; scene.add(hoverRing);
    const rc = new THREE.Raycaster();

    // ---------- camera controls (spherical around target) ----------
    const C = { theta: 0.42, phi: 0.62, radius: 470, tTheta: 0.72, tPhi: 1.04, tRadius: 200, defR: 200 };
    const target = new THREE.Vector3(0, 0, 0), tTarget = new THREE.Vector3(0, 0, 0);
    const dom = renderer.domElement;
    let down = false, moved = false, px = 0, py = 0;
    let dragging = false, hasHover = false, hx = 0, hy = 0;

    dom.addEventListener('pointerdown', (e) => { down = true; moved = false; px = e.clientX; py = e.clientY; dragging = true; dom.style.cursor = 'grabbing'; });
    window.addEventListener('pointermove', (e) => {
      if (!down) return; const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      C.tTheta -= dx * 0.005; C.tPhi -= dy * 0.005;
      C.tPhi = Math.max(0.12, Math.min(Math.PI - 0.12, C.tPhi));
    });
    window.addEventListener('pointerup', (e) => {
      if (down && !moved) {
        const r = dom.getBoundingClientRect();
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
        const hit = ray.intersectObjects(pickables, false);
        if (hit.length) { UI.select(hit[0].object.userData.key); }
        else { UI.closePanel(); }
      }
      down = false; dragging = false; dom.style.cursor = 'grab';
    });
    dom.addEventListener('wheel', (e) => { e.preventDefault(); C.tRadius = Math.max(11, Math.min(420, C.tRadius * (1 + e.deltaY * 0.0011))); }, { passive: false });
    dom.addEventListener('pointermove', (e) => { const r = dom.getBoundingClientRect(); hx = ((e.clientX - r.left) / r.width) * 2 - 1; hy = -((e.clientY - r.top) / r.height) * 2 + 1; hasHover = true; });
    dom.addEventListener('pointerleave', () => { hasHover = false; hoverRing.visible = false; });

    // ---------- shooting stars ----------
    const spawnMeteor = () => {
      if (labelsEl) {
        const mt = document.createElement('div');
        mt.style.cssText = 'position:absolute;top:' + (4 + R() * 38) + '%;left:' + (45 + R() * 45) + '%;width:' + (90 + R() * 70) + 'px;height:2px;border-radius:2px;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.95));filter:drop-shadow(0 0 5px rgba(255,255,255,.9));pointer-events:none;opacity:0;animation:solShoot ' + (1.0 + R() * 0.5) + 's ease-out forwards;';
        labelsEl.appendChild(mt);
        mt.addEventListener('animationend', () => mt.remove());
      }
      setTimeout(spawnMeteor, 5000 + R() * 9000);
    };
    setTimeout(spawnMeteor, 2600);

    // ---------- resize ----------
    const onResize = () => { W = mount.clientWidth || window.innerWidth; H = mount.clientHeight || window.innerHeight; camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H); if (composer) composer.setSize(W, H); if (bloom) bloom.setSize(W, H); };
    window.addEventListener('resize', onResize);

    // ---------- animation loop ----------
    const clock = new THREE.Clock();
    const tmp = new THREE.Vector3();
    let lastSel = null;

    const tick = () => {
      requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      const playing = UI.state.playing, speed = UI.state.speed;
      const sel = UI.state.selectedKey;

      if (playing) {
        orbiters.forEach(o => { if (o.pivot) o.pivot.rotation.y += dt * o.orbit * speed; o.mesh.rotation.y += dt * o.spin * speed; });
        if (moonPivot) moonPivot.rotation.y += dt * 0.5 * speed;
        if (beltGroup) beltGroup.rotation.y += dt * 0.03 * speed;
      }
      starU.time.value += dt; starGroup.rotation.y += dt * 0.003;

      // props-driven toggles
      orbitsGroup.visible = PROPS.showOrbits !== false;
      labelsEl.style.display = (PROPS.showLabels === false) ? 'none' : 'block';
      if (PROPS.autoRotate && !dragging && !sel) C.tTheta += dt * 0.05;

      // reset request
      if (UI.consumeReset()) { C.tTheta = 0.7; C.tPhi = 1.05; C.tRadius = C.defR; }

      // when leaving a planet, pull the camera back out to the wide view
      if (sel !== lastSel) { if (!sel) { C.tRadius = C.defR; } lastSel = sel; }

      // focus target
      if (sel && focusMap[sel]) {
        focusMap[sel].getWorldPosition(tmp); tTarget.copy(tmp);
        const d = DATA.find(x => x.key === sel);
        const fr = sel === 'sun' ? d.radius * 4 : Math.max(7, (d.radius || 1) * 7);
        C.tRadius += (fr - C.tRadius) * 0.08;
      } else {
        tTarget.set(0, 0, 0);
      }

      // smooth
      C.theta += (C.tTheta - C.theta) * 0.2;
      C.phi += (C.tPhi - C.phi) * 0.2;
      C.radius += (C.tRadius - C.radius) * 0.1;
      target.lerp(tTarget, sel ? 0.12 : 0.08);

      camera.position.set(
        target.x + C.radius * Math.sin(C.phi) * Math.sin(C.theta),
        target.y + C.radius * Math.cos(C.phi),
        target.z + C.radius * Math.sin(C.phi) * Math.cos(C.theta)
      );
      camera.lookAt(target);

      // hover highlight
      if (hasHover && !dragging) {
        rc.setFromCamera({ x: hx || 0, y: hy || 0 }, camera);
        const hh = rc.intersectObjects(pickables, false);
        if (hh.length) {
          const key = hh[0].object.userData.key; const fo = focusMap[key];
          if (fo) { fo.getWorldPosition(tmp); const dd = DATA.find(x => x.key === key); const rad = key === 'belt' ? 6 : ((dd && dd.radius) || 1); hoverRing.position.copy(tmp); hoverRing.scale.setScalar(Math.max(2, rad * 1.7)); hoverRing.lookAt(camera.position); hoverRing.visible = true; }
          dom.style.cursor = 'pointer';
        } else { hoverRing.visible = false; dom.style.cursor = 'grab'; }
      }

      if (composer) composer.render(); else renderer.render(scene, camera);

      // labels
      if (PROPS.showLabels !== false) {
        for (let i = 0; i < labelInfo.length; i++) {
          const li = labelInfo[i]; li.obj.getWorldPosition(tmp); tmp.project(camera);
          if (tmp.z < 1 && tmp.z > -1) {
            const sx = (tmp.x * 0.5 + 0.5) * W, sy = (-tmp.y * 0.5 + 0.5) * H;
            li.el.style.display = 'flex';
            li.el.style.transform = 'translate(' + sx + 'px,' + sy + 'px) translate(-50%,-150%)';
            li.el.style.opacity = (sel && sel !== li.key) ? '0.4' : '1';
          } else { li.el.style.display = 'none'; }
        }
      }
    };
    tick();

    // dismiss the loading overlay once the first frames are up
    setTimeout(() => { if (loadingEl) loadingEl.classList.add('is-hidden'); }, 350);
  }

  return { init, PROPS };
})();
