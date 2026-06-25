import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/*
  NEON PROTOCOL — Holographic Arena FPS (by Fable). Wrapped for the extension:
  game logic kept, but DOM lookups are scoped to this component (shadow DOM has no
  document IDs), it's sized to the cabinet screen, uses bundled three.js, and tears
  down (loop + listeners + GL) on unmount. Click to play (pointer-lock captures the
  mouse); ESC pauses.
*/

const HUD_HTML = `
  <div id="game-canvas" style="position:absolute;inset:0"></div>
  <div id="hud" class="np-abs np-inset0 np-pe-none np-hidden">
    <div id="crosshair"><span class="h l"></span><span class="h r"></span><span class="v t"></span><span class="v b"></span></div>
    <div id="damage-vignette"></div>
    <div id="wave-banner" class="neon-magenta mono"></div>
    <div class="np-abs hud-panel mono" style="top:14px;left:14px;padding:10px 16px">
      <div class="hud-label">Wave</div>
      <div id="hud-wave" class="neon-magenta" style="font-size:26px;font-weight:700;line-height:1">01</div>
      <div class="hud-label" style="margin-top:6px">Hostiles</div>
      <div id="hud-enemies" class="neon-cyan" style="font-size:17px;font-weight:700;line-height:1">0</div>
    </div>
    <div class="np-abs hud-panel mono" style="top:14px;right:14px;padding:10px 16px;text-align:right">
      <div class="hud-label">Score</div>
      <div id="hud-score" class="neon-lime" style="font-size:26px;font-weight:700;line-height:1">0</div>
    </div>
    <div class="np-abs hud-panel mono" style="bottom:14px;left:14px;padding:10px 16px;width:230px">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="hud-label">Integrity</span><span id="hud-hp-num" class="neon-cyan" style="font-size:13px;font-weight:700">100</span></div>
      <div class="bar-track" style="margin-top:5px"><div id="health-fill"></div></div>
    </div>
    <div class="np-abs hud-panel mono" style="bottom:14px;right:14px;padding:10px 16px;width:200px">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="hud-label">Dash <span class="keycap" style="font-size:9px">SPACE</span></span><span id="hud-dash-state" class="neon-magenta" style="font-size:12px;font-weight:700">READY</span></div>
      <div class="bar-track" style="margin-top:5px"><div id="dash-fill"></div></div>
    </div>
  </div>
  <div id="overlay" class="np-abs np-inset0 np-flex scanlines" style="background:radial-gradient(ellipse at center, rgba(10,6,30,.82), rgba(2,1,8,.96))">
    <div style="text-align:center;padding:0 24px">
      <div class="mono neon-cyan flicker" style="font-size:12px;letter-spacing:.5em">// SIMULATION 7 — UNAUTHORIZED INTRUSION //</div>
      <h1 class="mono" style="font-weight:800;margin:10px 0 0;font-size:clamp(32px,7vw,60px);letter-spacing:.12em"><span class="neon-cyan">NEON</span> <span class="neon-magenta">PROTOCOL</span></h1>
      <p class="mono" style="font-size:13px;margin:8px 0 0;color:rgba(170,220,255,.7);letter-spacing:.15em">PURGE THE HOLOGRAM SWARM. SURVIVE THE WAVES.</p>
      <div class="mono" style="margin:26px 0;font-size:12px;color:rgba(190,230,255,.85);line-height:2">
        <div><span class="keycap">W</span><span class="keycap">A</span><span class="keycap">S</span><span class="keycap">D</span> MOVE • <span class="keycap">MOUSE</span> LOOK • <span class="keycap">LMB</span> FIRE</div>
        <div><span class="keycap">SPACE</span> DASH • <span class="keycap">ESC</span> PAUSE</div>
      </div>
      <button id="play-btn" class="btn-neon mono np-pe-auto" style="font-size:16px">CLICK TO PLAY</button>
      <div id="overlay-sub" class="mono" style="margin-top:14px;font-size:11px;color:rgba(140,200,255,.5);letter-spacing:.2em">POINTER LOCK WILL CAPTURE YOUR MOUSE</div>
    </div>
  </div>
  <div id="gameover" class="np-abs np-inset0 np-hidden scanlines" style="align-items:center;justify-content:center;background:radial-gradient(ellipse at center, rgba(40,4,18,.85), rgba(4,1,8,.97))">
    <div style="text-align:center;padding:0 24px">
      <div class="mono flicker" style="font-size:12px;letter-spacing:.5em;color:#ff7a9a;text-shadow:0 0 10px rgba(255,50,90,.8)">// SIGNAL LOST — AVATAR DERESOLUTION //</div>
      <h1 class="mono" style="font-weight:800;margin:10px 0 0;font-size:clamp(34px,6vw,60px);letter-spacing:.14em;color:#ff3355;text-shadow:0 0 12px rgba(255,51,85,.9),0 0 40px rgba(255,51,85,.4)">TERMINATED</h1>
      <div class="mono" style="margin-top:22px;display:flex;justify-content:center;gap:14px">
        <div class="hud-panel" style="padding:10px 20px"><div class="hud-label">Final Score</div><div id="go-score" class="neon-lime" style="font-size:26px;font-weight:700">0</div></div>
        <div class="hud-panel" style="padding:10px 20px"><div class="hud-label">Waves</div><div id="go-wave" class="neon-magenta" style="font-size:26px;font-weight:700">0</div></div>
        <div class="hud-panel" style="padding:10px 20px"><div class="hud-label">Best</div><div id="go-best" class="neon-cyan" style="font-size:26px;font-weight:700">0</div></div>
      </div>
      <button id="retry-btn" class="btn-neon mono np-pe-auto" style="font-size:16px;margin-top:28px">RE-ENTER SIMULATION</button>
    </div>
  </div>
`;

const STYLE = `
  .np-root { --cyan:#00f6ff; --magenta:#ff2bd6; --lime:#b6ff00; position:absolute; inset:0; overflow:hidden; background:#04020a; font-family:'Segoe UI',Arial,sans-serif; }
  .np-root canvas { display:block; }
  .np-abs{position:absolute} .np-inset0{inset:0} .np-pe-none{pointer-events:none} .np-pe-auto{pointer-events:auto}
  .np-hidden{display:none!important} .np-flex{display:flex;align-items:center;justify-content:center}
  .mono{font-family:'Geist Mono','SF Mono',Consolas,monospace}
  .neon-cyan{color:var(--cyan);text-shadow:0 0 6px rgba(0,246,255,.9),0 0 18px rgba(0,246,255,.45)}
  .neon-magenta{color:var(--magenta);text-shadow:0 0 6px rgba(255,43,214,.9),0 0 18px rgba(255,43,214,.45)}
  .neon-lime{color:var(--lime);text-shadow:0 0 6px rgba(182,255,0,.9),0 0 18px rgba(182,255,0,.4)}
  .hud-panel{background:linear-gradient(160deg,rgba(6,12,28,.78),rgba(10,4,24,.62));border:1px solid rgba(0,246,255,.35);box-shadow:0 0 14px rgba(0,246,255,.18),inset 0 0 22px rgba(0,246,255,.06);backdrop-filter:blur(4px);clip-path:polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,14px 100%,0 calc(100% - 14px))}
  .hud-label{font-size:9.5px;letter-spacing:.28em;color:rgba(160,225,255,.75);text-transform:uppercase}
  .bar-track{height:11px;background:rgba(0,20,30,.7);border:1px solid rgba(0,246,255,.3);overflow:hidden;clip-path:polygon(0 0,calc(100% - 6px) 0,100% 100%,6px 100%)}
  #health-fill{height:100%;width:100%;background:linear-gradient(90deg,#00ffa3,#00f6ff);box-shadow:0 0 10px rgba(0,255,190,.8);transition:width .15s ease-out,background .2s}
  #health-fill.low{background:linear-gradient(90deg,#ff3355,#ff8a00);box-shadow:0 0 12px rgba(255,60,90,.9)}
  #dash-fill{height:100%;width:100%;background:linear-gradient(90deg,#ff2bd6,#9d4dff);box-shadow:0 0 10px rgba(255,43,214,.8)}
  #crosshair{position:absolute;left:50%;top:50%;width:26px;height:26px;transform:translate(-50%,-50%);pointer-events:none}
  #crosshair span{position:absolute;background:var(--cyan);box-shadow:0 0 6px var(--cyan);transition:transform .07s}
  #crosshair .h{width:8px;height:2px;top:12px} #crosshair .v{width:2px;height:8px;left:12px}
  #crosshair .l{left:0} #crosshair .r{right:0} #crosshair .t{top:0} #crosshair .b{bottom:0;top:auto}
  #crosshair.hit span{background:var(--lime);box-shadow:0 0 8px var(--lime)}
  #crosshair.kick .l{transform:translateX(-3px)} #crosshair.kick .r{transform:translateX(3px)} #crosshair.kick .t{transform:translateY(-3px)} #crosshair.kick .b{transform:translateY(3px)}
  #damage-vignette{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,transparent 42%,rgba(255,30,70,.55) 100%);transition:opacity .35s ease-out}
  #wave-banner{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%) scale(.9);font-size:42px;font-weight:800;letter-spacing:.3em;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s}
  #wave-banner.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
  .scanlines::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 1px,transparent 1px 3px);mix-blend-mode:overlay}
  .btn-neon{border:1px solid var(--cyan);color:var(--cyan);padding:12px 36px;letter-spacing:.3em;font-weight:700;background:rgba(0,246,255,.06);cursor:pointer;box-shadow:0 0 16px rgba(0,246,255,.25),inset 0 0 14px rgba(0,246,255,.08);clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px));transition:background .15s,box-shadow .15s,transform .1s}
  .btn-neon:hover{background:rgba(0,246,255,.16);box-shadow:0 0 26px rgba(0,246,255,.5)}
  .btn-neon:active{transform:scale(.97)}
  .keycap{display:inline-block;min-width:22px;padding:2px 6px;margin:0 2px;border:1px solid rgba(0,246,255,.5);color:var(--cyan);font-size:11px;text-align:center;border-radius:4px;background:rgba(0,246,255,.07)}
  @keyframes np-flicker{0%,100%{opacity:1}92%{opacity:1}93%{opacity:.4}94%{opacity:1}97%{opacity:.6}98%{opacity:1}}
  .flicker{animation:np-flicker 4s infinite}
`;

export function NeonProtocol() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const $ = (id: string) => root.querySelector<HTMLElement>('#' + id)!;
    const mount = $('game-canvas');
    let disposed = false;
    // In a shadow DOM, document.pointerLockElement retargets to the shadow HOST, not
    // the canvas — so the lock checks must read from the shadow root (falls back to
    // document). Without this the game never leaves the start screen ("not loading").
    const sr = root.getRootNode() as { pointerLockElement?: Element | null };
    const lockedEl = () => sr.pointerLockElement ?? document.pointerLockElement;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04020a);
    scene.fog = new THREE.FogExp2(0x04020a, 0.022);

    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 300);
    const BASE_FOV = 75;
    const pitchObj = new THREE.Object3D(); pitchObj.add(camera);
    const playerObj = new THREE.Object3D(); playerObj.add(pitchObj);
    playerObj.position.set(0, 1.7, 0); scene.add(playerObj);

    scene.add(new THREE.AmbientLight(0x223344, 1.4));
    const keyLight = new THREE.PointLight(0x00f6ff, 1.1, 80); keyLight.position.set(0, 16, 0); scene.add(keyLight);
    const magLight = new THREE.PointLight(0xff2bd6, 0.9, 70); magLight.position.set(-22, 8, -22); scene.add(magLight);
    const cyanLight2 = new THREE.PointLight(0x00f6ff, 0.7, 70); cyanLight2.position.set(22, 8, 22); scene.add(cyanLight2);

    const ARENA = 58, HALF = ARENA / 2;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA, ARENA), new THREE.MeshStandardMaterial({ color: 0x07091a, roughness: 0.45, metalness: 0.65 }));
    floor.rotation.x = -Math.PI / 2; scene.add(floor);
    const grid = new THREE.GridHelper(ARENA, 29, 0x00f6ff, 0x103a66);
    grid.position.y = 0.02; (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.55; scene.add(grid);
    const ring = new THREE.Mesh(new THREE.RingGeometry(4.4, 4.7, 48), new THREE.MeshBasicMaterial({ color: 0xff2bd6, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; scene.add(ring);

    const WALL_H = 9;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0a0d22, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide });
    const wallGridMat = new THREE.LineBasicMaterial({ color: 0x00f6ff, transparent: true, opacity: 0.35 });
    const wallTrimMat = new THREE.MeshBasicMaterial({ color: 0xff2bd6 });
    function makeWallGrid(width: number, height: number, cols: number, rows: number) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= cols; i++) { const x = -width / 2 + (i / cols) * width; pts.push(new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, height, 0)); }
      for (let j = 0; j <= rows; j++) { const y = (j / rows) * height; pts.push(new THREE.Vector3(-width / 2, y, 0), new THREE.Vector3(width / 2, y, 0)); }
      return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), wallGridMat);
    }
    function buildWall(rotY: number, x: number, z: number) {
      const g = new THREE.Group();
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(ARENA, WALL_H), wallMat); panel.position.y = WALL_H / 2; g.add(panel);
      const wg = makeWallGrid(ARENA, WALL_H, 18, 4); wg.position.z = 0.04; g.add(wg);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(ARENA, 0.18, 0.18), wallTrimMat); trim.position.y = WALL_H; g.add(trim);
      const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(ARENA, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0x00f6ff })); baseTrim.position.y = 0.06; g.add(baseTrim);
      g.rotation.y = rotY; g.position.set(x, 0, z); scene.add(g);
    }
    buildWall(0, 0, -HALF); buildWall(Math.PI, 0, HALF); buildWall(Math.PI / 2, -HALF, 0); buildWall(-Math.PI / 2, HALF, 0);

    const pillars: { x: number; z: number; half: number }[] = [];
    const pillarMeshes: THREE.Mesh[] = [];
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x0c1030, roughness: 0.4, metalness: 0.7 });
    const pillarGeo = new THREE.BoxGeometry(2.6, 7, 2.6);
    const pillarEdgeGeo = new THREE.EdgesGeometry(pillarGeo);
    const pillarPositions = [[-14, -14], [14, -14], [-14, 14], [14, 14], [0, -20], [0, 20], [-20, 0], [20, 0]];
    for (let i = 0; i < pillarPositions.length; i++) {
      const [px, pz] = pillarPositions[i];
      const p = new THREE.Mesh(pillarGeo, pillarMat); p.position.set(px, 3.5, pz); scene.add(p); pillarMeshes.push(p);
      const edges = new THREE.LineSegments(pillarEdgeGeo, new THREE.LineBasicMaterial({ color: i % 2 ? 0xff2bd6 : 0x00f6ff, transparent: true, opacity: 0.9 })); edges.position.copy(p.position); scene.add(edges);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.14, 2.9), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff2bd6 : 0x00f6ff })); cap.position.set(px, 7.02, pz); scene.add(cap);
      pillars.push({ x: px, z: pz, half: 1.75 });
    }

    const shardGeo = new THREE.TetrahedronGeometry(0.35, 0);
    const shardMat = new THREE.MeshBasicMaterial({ color: 0x00f6ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
    const shards: THREE.Mesh[] = [];
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Mesh(shardGeo, shardMat);
      s.position.set((Math.random() - 0.5) * ARENA * 0.9, 3 + Math.random() * 5, (Math.random() - 0.5) * ARENA * 0.9);
      s.userData.spin = 0.4 + Math.random(); s.userData.bob = Math.random() * 10; scene.add(s); shards.push(s);
    }

    const gun = new THREE.Group();
    gun.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.62), new THREE.MeshStandardMaterial({ color: 0x101830, roughness: 0.35, metalness: 0.8 })));
    const gunRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.66), new THREE.MeshBasicMaterial({ color: 0x00f6ff })); gunRail.position.y = 0.1; gun.add(gunRail);
    const gunGrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.14), new THREE.MeshStandardMaterial({ color: 0x0a0f22, roughness: 0.5, metalness: 0.6 })); gunGrip.position.set(0, -0.18, 0.18); gunGrip.rotation.x = 0.3; gun.add(gunGrip);
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.1, 8), new THREE.MeshBasicMaterial({ color: 0xff2bd6 })); muzzle.rotation.x = Math.PI / 2; muzzle.position.z = -0.36; gun.add(muzzle);
    const muzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0x9bf6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); muzzleFlash.position.z = -0.46; gun.add(muzzleFlash);
    gun.position.set(0.32, -0.28, -0.55); camera.add(gun);
    const GUN_BASE = gun.position.clone();

    const holoCyan = () => new THREE.MeshBasicMaterial({ color: 0x36e6ff, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const holoMag = () => new THREE.MeshBasicMaterial({ color: 0xff4de3, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const wireCyan = () => new THREE.MeshBasicMaterial({ color: 0x9bf3ff, wireframe: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
    const wireMag = () => new THREE.MeshBasicMaterial({ color: 0xffb1ef, wireframe: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
    const G = {
      torso: new THREE.BoxGeometry(0.85, 1.15, 0.4), head: new THREE.SphereGeometry(0.3, 10, 8), limb: new THREE.BoxGeometry(0.22, 0.95, 0.22),
      core: new THREE.OctahedronGeometry(0.22, 0), droneBody: new THREE.OctahedronGeometry(0.62, 0), droneRing: new THREE.TorusGeometry(0.85, 0.05, 6, 22), eye: new THREE.SphereGeometry(0.09, 6, 6),
    };
    function buildStalker() {
      const r = new THREE.Group(); const body = holoCyan(), wire = wireCyan();
      const torso = new THREE.Mesh(G.torso, body); torso.position.y = 1.35; r.add(torso);
      const torsoW = new THREE.Mesh(G.torso, wire); torsoW.position.y = 1.35; torsoW.scale.setScalar(1.02); r.add(torsoW);
      const head = new THREE.Mesh(G.head, body); head.position.y = 2.18; r.add(head);
      const headW = new THREE.Mesh(G.head, wire); headW.position.y = 2.18; headW.scale.setScalar(1.05); r.add(headW);
      const eyeL = new THREE.Mesh(G.eye, new THREE.MeshBasicMaterial({ color: 0xff2bd6 })); eyeL.position.set(-0.11, 2.22, 0.26); r.add(eyeL);
      const eyeR = eyeL.clone(); eyeR.position.x = 0.11; r.add(eyeR);
      const armL = new THREE.Mesh(G.limb, body); armL.position.set(-0.62, 1.35, 0); r.add(armL);
      const armR = new THREE.Mesh(G.limb, body); armR.position.set(0.62, 1.35, 0); r.add(armR);
      const legL = new THREE.Mesh(G.limb, body); legL.position.set(-0.24, 0.45, 0); r.add(legL);
      const legR = new THREE.Mesh(G.limb, body); legR.position.set(0.24, 0.45, 0); r.add(legR);
      const core = new THREE.Mesh(G.core, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })); core.position.y = 1.45; r.add(core);
      r.userData.anim = { armL, armR, legL, legR, core, mats: [body, wire] }; return r;
    }
    function buildDrone() {
      const r = new THREE.Group(); const body = holoMag(), wire = wireMag();
      const hull = new THREE.Mesh(G.droneBody, body); r.add(hull);
      const hullW = new THREE.Mesh(G.droneBody, wire); hullW.scale.setScalar(1.04); r.add(hullW);
      const ringM = new THREE.Mesh(G.droneRing, new THREE.MeshBasicMaterial({ color: 0xff2bd6, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); ringM.rotation.x = Math.PI / 2; r.add(ringM);
      const eye = new THREE.Mesh(G.eye, new THREE.MeshBasicMaterial({ color: 0xffffff })); eye.position.z = 0.5; eye.scale.setScalar(1.4); r.add(eye);
      r.userData.anim = { ring: ringM, hull, mats: [body, wire] }; return r;
    }
    const enemyPool: Record<string, THREE.Group[]> = { stalker: [], drone: [] };
    interface En { type: string; mesh: THREE.Group; hp: number; speed: number; attackCd: number; flash: number; grow: number; phase: number }
    const enemies: En[] = [];
    function spawnEnemy(type: string, speedMul: number) {
      let mesh = enemyPool[type].pop();
      if (!mesh) { mesh = type === 'stalker' ? buildStalker() : buildDrone(); scene.add(mesh); }
      mesh.visible = true;
      let x = 0, z = 0;
      do { const edge = Math.floor(Math.random() * 4); const tt = (Math.random() - 0.5) * (ARENA - 8); x = edge === 0 ? -HALF + 3 : edge === 1 ? HALF - 3 : tt; z = edge === 2 ? -HALF + 3 : edge === 3 ? HALF - 3 : tt; }
      while (Math.hypot(x - playerObj.position.x, z - playerObj.position.z) < 14);
      mesh.position.set(x, type === 'drone' ? 2.1 : 0, z); mesh.scale.setScalar(0.01);
      enemies.push({ type, mesh, hp: type === 'stalker' ? 3 : 2, speed: (type === 'stalker' ? 3.0 : 4.4) * speedMul, attackCd: 0, flash: 0, grow: 0, phase: Math.random() * 10 });
    }
    function recycleEnemy(i: number) { const e = enemies[i]; e.mesh.visible = false; enemyPool[e.type].push(e.mesh); enemies.splice(i, 1); }
    function clearEnemies() { for (let i = enemies.length - 1; i >= 0; i--) recycleEnemy(i); }

    const beamGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 5, 1, true); beamGeo.translate(0, 0.5, 0); beamGeo.rotateX(Math.PI / 2);
    const beams: { mesh: THREE.Mesh; life: number }[] = [];
    function fireBeamVisual(from: THREE.Vector3, to: THREE.Vector3) {
      let b = beams.find((bb) => bb.life <= 0);
      if (!b) { const mesh = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0x6cf6ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(mesh); b = { mesh, life: 0 }; beams.push(b); }
      const len = new THREE.Vector3().subVectors(to, from).length();
      b.mesh.visible = true; b.mesh.position.copy(from); b.mesh.lookAt(to); b.mesh.scale.set(1, 1, len); (b.mesh.material as THREE.Material).opacity = 0.95; b.life = 0.09;
    }

    const PART = 22;
    const bursts: { points: THREE.Points; vels: Float32Array; life: number; maxLife: number }[] = [];
    function makeBurst() {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PART * 3), 3));
      const mat = new THREE.PointsMaterial({ color: 0x66f0ff, size: 0.16, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
      const points = new THREE.Points(geo, mat); points.visible = false; scene.add(points);
      return { points, vels: new Float32Array(PART * 3), life: 0, maxLife: 0.7 };
    }
    for (let i = 0; i < 14; i++) bursts.push(makeBurst());
    function explodeAt(pos: THREE.Vector3, color: number, power: number) {
      const b = bursts.find((bb) => bb.life <= 0) || bursts[0];
      (b.points.material as THREE.PointsMaterial).color.setHex(color); (b.points.material as THREE.Material).opacity = 1;
      const arr = b.points.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < PART; i++) {
        arr[i * 3] = pos.x; arr[i * 3 + 1] = pos.y; arr[i * 3 + 2] = pos.z;
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), sp = (2 + Math.random() * 4.5) * power;
        b.vels[i * 3] = Math.sin(ph) * Math.cos(th) * sp; b.vels[i * 3 + 1] = Math.cos(ph) * sp * 0.9 + 1.2; b.vels[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp;
      }
      b.points.geometry.attributes.position.needsUpdate = true; b.points.visible = true; b.life = b.maxLife;
    }
    function updateBursts(dt: number) {
      for (const b of bursts) {
        if (b.life <= 0) continue; b.life -= dt;
        const arr = b.points.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < PART; i++) { arr[i * 3] += b.vels[i * 3] * dt; arr[i * 3 + 1] += b.vels[i * 3 + 1] * dt; arr[i * 3 + 2] += b.vels[i * 3 + 2] * dt; b.vels[i * 3 + 1] -= 6 * dt; }
        b.points.geometry.attributes.position.needsUpdate = true; (b.points.material as THREE.Material).opacity = Math.max(0, b.life / b.maxLife); if (b.life <= 0) b.points.visible = false;
      }
    }

    let audioCtx: AudioContext | null = null;
    function ensureAudio() { if (!audioCtx) { try { audioCtx = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)(); } catch { audioCtx = null; } } if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); }
    function blip(freq: number, dur: number, type: OscillatorType, vol: number, slide: number) {
      if (!audioCtx) return; const t = audioCtx.currentTime; const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t + dur);
    }
    const sfx = {
      shoot: () => { blip(1400, 0.09, 'sawtooth', 0.05, 0.25); blip(420, 0.07, 'square', 0.03, 0.5); },
      hit: () => blip(900, 0.06, 'square', 0.04, 0.6),
      kill: () => { blip(220, 0.3, 'sawtooth', 0.07, 0.3); blip(1200, 0.22, 'triangle', 0.05, 0.12); },
      dash: () => blip(300, 0.18, 'sine', 0.07, 3.2), hurt: () => blip(140, 0.25, 'sawtooth', 0.08, 0.6),
      wave: () => { blip(523, 0.14, 'triangle', 0.06, 1); setTimeout(() => blip(784, 0.2, 'triangle', 0.06, 1), 130); }, dead: () => blip(400, 0.7, 'sawtooth', 0.09, 0.12),
    };

    const STATE = { phase: 'menu' as 'menu' | 'playing' | 'dead' };
    const player = { hp: 100, maxHp: 100, vel: new THREE.Vector3(), yaw: 0, pitch: 0, dashCd: 0, dashCdMax: 2.4, dashTime: 0, dashDir: new THREE.Vector3(), fireCd: 0, fireRate: 0.16, bob: 0 };
    let score = 0, best = 0, wave = 0, waveActive = false, interWaveTimer = 0, speedMul = 1;
    const keys: Record<string, boolean> = {}; let mouseDown = false;

    const hud = $('hud'), overlay = $('overlay'), gameover = $('gameover');
    const hudWave = $('hud-wave'), hudScore = $('hud-score'), hudEnemies = $('hud-enemies'), hudHpNum = $('hud-hp-num'), healthFill = $('health-fill');
    const dashFill = $('dash-fill'), dashState = $('hud-dash-state'), crosshair = $('crosshair'), vignette = $('damage-vignette'), waveBanner = $('wave-banner');
    const playBtn = $('play-btn');

    function setHealth(v: number) { player.hp = Math.max(0, Math.min(player.maxHp, v)); const pct = (player.hp / player.maxHp) * 100; healthFill.style.width = pct + '%'; healthFill.classList.toggle('low', pct < 35); hudHpNum.textContent = String(Math.ceil(player.hp)); }
    function showWaveBanner(text: string, color: string) { waveBanner.textContent = text; waveBanner.className = color + ' mono'; waveBanner.classList.add('show'); setTimeout(() => waveBanner.classList.remove('show'), 1600); }
    function startWave() {
      wave++; hudWave.textContent = String(wave).padStart(2, '0'); speedMul = 1 + (wave - 1) * 0.07;
      const count = Math.min(4 + wave * 2, 26), droneRatio = Math.min(0.15 + wave * 0.06, 0.55);
      for (let i = 0; i < count; i++) spawnEnemy(Math.random() < droneRatio ? 'drone' : 'stalker', speedMul);
      waveActive = true; showWaveBanner('WAVE ' + String(wave).padStart(2, '0'), 'neon-magenta'); sfx.wave();
    }
    function resetGame() {
      clearEnemies(); score = 0; wave = 0; waveActive = false; interWaveTimer = 0.8; speedMul = 1; setHealth(100);
      player.vel.set(0, 0, 0); player.dashCd = 0; player.dashTime = 0; player.fireCd = 0; player.yaw = 0; player.pitch = 0;
      playerObj.position.set(0, 1.7, 0); playerObj.rotation.y = 0; pitchObj.rotation.x = 0; hudScore.textContent = '0'; hudWave.textContent = '00';
    }
    function die() {
      STATE.phase = 'dead'; best = Math.max(best, score); $('go-score').textContent = String(score); $('go-wave').textContent = String(Math.max(0, wave)); $('go-best').textContent = String(best);
      sfx.dead(); document.exitPointerLock && document.exitPointerLock(); hud.classList.add('np-hidden'); gameover.classList.remove('np-hidden'); gameover.style.display = 'flex';
    }

    // Best-effort pointer lock — swallow the promise rejection Chrome throws when a
    // re-lock is requested during its ~1s post-ESC cooldown.
    const requestLock = () => { try { const p = renderer.domElement.requestPointerLock() as unknown as Promise<void> | undefined; if (p && typeof p.catch === 'function') p.catch(() => {}); } catch { /* ignore */ } };

    // Overlay visibility follows GAME PHASE (set synchronously on click) — never the
    // pointer-lock state. Pointer lock drops easily on a small embedded canvas and used
    // to leave the start/pause overlay stuck on top of a running game. Now losing the
    // lock just soft-pauses (cursor freed, no overlay) and clicking back into the arena
    // re-captures it.
    const enterPlaying = () => {
      ensureAudio();
      resetGame();
      STATE.phase = 'playing';
      overlay.classList.add('np-hidden');
      gameover.classList.add('np-hidden'); gameover.style.display = '';
      hud.classList.remove('np-hidden');
      requestLock();
    };
    playBtn.addEventListener('click', enterPlaying);
    $('retry-btn').addEventListener('click', enterPlaying);

    const onMove = (e: MouseEvent) => { if (lockedEl() !== renderer.domElement) return; const s = 0.0022; player.yaw -= e.movementX * s; player.pitch -= e.movementY * s; player.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, player.pitch)); playerObj.rotation.y = player.yaw; pitchObj.rotation.x = player.pitch; };
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      // Playing but cursor not captured → a click re-grabs the mouse instead of firing.
      if (STATE.phase === 'playing' && lockedEl() !== renderer.domElement) { requestLock(); return; }
      mouseDown = true;
    };
    const onUp = (e: MouseEvent) => { if (e.button === 0) mouseDown = false; };
    const onKD = (e: KeyboardEvent) => { keys[e.code] = true; if (e.code === 'Space') e.preventDefault(); };
    const onKU = (e: KeyboardEvent) => { keys[e.code] = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('keydown', onKD);
    document.addEventListener('keyup', onKU);

    const raycaster = new THREE.Raycaster(); const screenCenter = new THREE.Vector2(0, 0); const tmpV1 = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
    function tryShoot() {
      if (player.fireCd > 0) return; player.fireCd = player.fireRate; sfx.shoot();
      (muzzleFlash.material as THREE.Material).opacity = 1; gun.position.z = GUN_BASE.z + 0.07; crosshair.classList.add('kick'); setTimeout(() => crosshair.classList.remove('kick'), 70);
      raycaster.setFromCamera(screenCenter, camera); raycaster.far = 120;
      const targets = enemies.map((e) => e.mesh);
      const hits = raycaster.intersectObjects((targets as THREE.Object3D[]).concat(pillarMeshes), true);
      const from = muzzle.getWorldPosition(tmpV1.clone()); let endPoint: THREE.Vector3;
      if (hits.length > 0) {
        const hit = hits[0]; endPoint = hit.point.clone(); let obj: THREE.Object3D | null = hit.object; while (obj && !targets.includes(obj as THREE.Group)) obj = obj.parent;
        const idx = enemies.findIndex((e) => e.mesh === obj);
        if (idx < 0) explodeAt(hit.point, 0x3a7fff, 0.3);
        else {
          const e = enemies[idx]; e.hp -= 1; e.flash = 0.12; explodeAt(hit.point, 0xaffaff, 0.45); crosshair.classList.add('hit'); setTimeout(() => crosshair.classList.remove('hit'), 90); sfx.hit();
          if (e.hp <= 0) { const c = e.type === 'drone' ? 0xff4de3 : 0x36e6ff; explodeAt(e.mesh.position.clone().add(tmpV2.set(0, e.type === 'drone' ? 0 : 1.3, 0)), c, 1); explodeAt(e.mesh.position.clone().add(tmpV2.set(0, e.type === 'drone' ? 0.2 : 1.6, 0)), 0xffffff, 0.6); score += e.type === 'drone' ? 150 : 100; hudScore.textContent = String(score); recycleEnemy(idx); sfx.kill(); }
        }
      } else endPoint = raycaster.ray.at(60, new THREE.Vector3());
      fireBeamVisual(from, endPoint);
    }
    function tryDash(moveDir: THREE.Vector3) { if (player.dashCd > 0) return; player.dashCd = player.dashCdMax; player.dashTime = 0.16; if (moveDir.lengthSq() > 0.01) player.dashDir.copy(moveDir).normalize(); else player.dashDir.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)); sfx.dash(); }
    function collidePlayer(pos: THREE.Vector3) {
      const m = 1.0; pos.x = Math.max(-HALF + m, Math.min(HALF - m, pos.x)); pos.z = Math.max(-HALF + m, Math.min(HALF - m, pos.z));
      for (const p of pillars) { const dx = pos.x - p.x, dz = pos.z - p.z; if (Math.abs(dx) < p.half && Math.abs(dz) < p.half) { const ox = p.half - Math.abs(dx), oz = p.half - Math.abs(dz); if (ox < oz) pos.x = p.x + Math.sign(dx || 1) * p.half; else pos.z = p.z + Math.sign(dz || 1) * p.half; } }
    }

    const clock = new THREE.Clock();
    function loop() {
      if (disposed) return; raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05); const t = clock.elapsedTime;
      const playing = STATE.phase === 'playing' && lockedEl() === renderer.domElement;
      for (const s of shards) { s.rotation.y += s.userData.spin * dt; s.rotation.x += s.userData.spin * 0.6 * dt; s.position.y += Math.sin(t * 1.2 + s.userData.bob) * 0.0035; }
      ring.rotation.z += dt * 0.25; magLight.intensity = 0.85 + Math.sin(t * 2.3) * 0.15;
      if (playing) {
        const fwd = tmpV1.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)); const right = tmpV2.set(-fwd.z, 0, fwd.x); const wish = new THREE.Vector3();
        if (keys['KeyW']) wish.add(fwd); if (keys['KeyS']) wish.sub(fwd); if (keys['KeyD']) wish.add(right); if (keys['KeyA']) wish.sub(right); if (wish.lengthSq() > 0) wish.normalize();
        if (keys['Space']) { tryDash(wish); keys['Space'] = false; }
        const MOVE = 9.5, accel = 42; player.vel.x += (wish.x * MOVE - player.vel.x) * Math.min(1, accel * dt / MOVE); player.vel.z += (wish.z * MOVE - player.vel.z) * Math.min(1, accel * dt / MOVE);
        if (player.dashTime > 0) { player.dashTime -= dt; playerObj.position.x += player.dashDir.x * 34 * dt; playerObj.position.z += player.dashDir.z * 34 * dt; }
        playerObj.position.x += player.vel.x * dt; playerObj.position.z += player.vel.z * dt; collidePlayer(playerObj.position);
        const targetFov = player.dashTime > 0 ? BASE_FOV + 14 : BASE_FOV; camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 12); camera.updateProjectionMatrix();
        const moving = wish.lengthSq() > 0; player.bob += dt * (moving ? 11 : 3); camera.position.y = Math.sin(player.bob) * (moving ? 0.035 : 0.008);
        gun.position.x = GUN_BASE.x + Math.sin(player.bob * 0.5) * (moving ? 0.012 : 0.004); gun.position.y = GUN_BASE.y + Math.abs(Math.cos(player.bob * 0.5)) * (moving ? 0.014 : 0.004); gun.position.z += (GUN_BASE.z - gun.position.z) * Math.min(1, dt * 14);
        (muzzleFlash.material as THREE.Material).opacity = Math.max(0, (muzzleFlash.material as THREE.Material).opacity - dt * 14); muzzleFlash.scale.setScalar(0.7 + Math.random() * 0.8);
        player.fireCd -= dt; if (mouseDown) tryShoot();
        player.dashCd = Math.max(0, player.dashCd - dt); dashFill.style.width = 100 * (1 - player.dashCd / player.dashCdMax) + '%';
        if (player.dashCd <= 0) { dashState.textContent = 'READY'; dashState.className = 'neon-magenta'; } else { dashState.textContent = player.dashCd.toFixed(1) + 's'; dashState.className = 'mono'; dashState.style.color = 'rgba(255,150,230,.55)'; }
        if (!waveActive) { interWaveTimer -= dt; if (interWaveTimer <= 0) startWave(); }
        else if (enemies.length === 0) { waveActive = false; interWaveTimer = 2.4; score += 250; hudScore.textContent = String(score); showWaveBanner('WAVE CLEAR +250', 'neon-lime'); setHealth(player.hp + 18); }
        hudEnemies.textContent = String(enemies.length);
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i]; const m = e.mesh;
          if (e.grow < 1) { e.grow = Math.min(1, e.grow + dt * 2.2); m.scale.setScalar(e.grow); }
          if (e.flash > 0) { e.flash -= dt; const f = e.flash > 0 ? 0.85 : 0.34; for (const mat of e.mesh.userData.anim.mats) mat.opacity = f; }
          const dx = playerObj.position.x - m.position.x, dz = playerObj.position.z - m.position.z; const dist = Math.hypot(dx, dz); const nx = dx / (dist || 1), nz = dz / (dist || 1);
          let sx = 0, sz = 0; for (let j = 0; j < enemies.length; j++) { if (j === i) continue; const o = enemies[j].mesh; const ox = m.position.x - o.position.x, oz = m.position.z - o.position.z; const od = Math.hypot(ox, oz); if (od < 1.6 && od > 0.001) { sx += ox / od; sz += oz / od; } }
          if (dist > 1.7 && e.grow >= 0.6) {
            const strafe = e.type === 'drone' ? Math.sin(t * 2.4 + e.phase) * 0.7 : 0;
            m.position.x += (nx + sx * 0.5 - nz * strafe) * e.speed * dt; m.position.z += (nz + sz * 0.5 + nx * strafe) * e.speed * dt;
            m.position.x = Math.max(-HALF + 1.2, Math.min(HALF - 1.2, m.position.x)); m.position.z = Math.max(-HALF + 1.2, Math.min(HALF - 1.2, m.position.z));
            for (const p of pillars) { const pdx = m.position.x - p.x, pdz = m.position.z - p.z; if (Math.abs(pdx) < p.half && Math.abs(pdz) < p.half) { if (Math.abs(pdx) > Math.abs(pdz)) m.position.x = p.x + Math.sign(pdx || 1) * p.half; else m.position.z = p.z + Math.sign(pdz || 1) * p.half; } }
          }
          m.rotation.y = Math.atan2(nx, nz);
          const a = e.mesh.userData.anim;
          if (e.type === 'stalker') { const sw = Math.sin(t * 9 + e.phase); a.armL.rotation.x = sw * 0.8; a.armR.rotation.x = -sw * 0.8; a.legL.rotation.x = -sw * 0.8; a.legR.rotation.x = sw * 0.8; a.core.rotation.y += dt * 4; m.position.y = Math.abs(Math.sin(t * 9 + e.phase)) * 0.05; }
          else { m.position.y = 2.1 + Math.sin(t * 3 + e.phase) * 0.25; a.ring.rotation.z += dt * 3; a.hull.rotation.y += dt * 1.5; }
          e.attackCd -= dt;
          if (dist < 2.1 && e.attackCd <= 0 && e.grow >= 1) { e.attackCd = 0.9; setHealth(player.hp - (e.type === 'drone' ? 9 : 12)); sfx.hurt(); vignette.style.opacity = '1'; setTimeout(() => (vignette.style.opacity = '0'), 120); explodeAt(playerObj.position.clone().add(tmpV2.set(nx * -0.5, -0.4, nz * -0.5)), 0xff3355, 0.5); player.vel.x -= nx * 6; player.vel.z -= nz * 6; if (player.hp <= 0) { die(); break; } }
        }
      }
      for (const b of beams) { if (b.life > 0) { b.life -= dt; (b.mesh.material as THREE.Material).opacity = Math.max(0, (b.life / 0.09) * 0.95); if (b.life <= 0) b.mesh.visible = false; } }
      updateBursts(dt);
      renderer.render(scene, camera);
    }
    let raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => { const w = mount.clientWidth, h = mount.clientHeight; if (!w || !h) return; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); });
    ro.observe(mount);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.exitPointerLock && lockedEl() === renderer.domElement && document.exitPointerLock();
      playBtn.removeEventListener('click', enterPlaying);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('keydown', onKD);
      document.removeEventListener('keyup', onKU);
      if (audioCtx) audioCtx.close().catch(() => {});
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={rootRef} className="np-root">
      <style>{STYLE}</style>
      <div dangerouslySetInnerHTML={{ __html: HUD_HTML }} />
    </div>
  );
}
