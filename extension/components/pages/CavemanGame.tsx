import React, { useRef, useEffect, useState } from 'react';
// Type-only: the runtime namespace is lazy-loaded via loadThree() so three.js
// stays out of the main content-script bundle until a game actually mounts.
import type * as THREE from 'three';
import { loadThree, type ThreeModule } from '../../lib/load-three';

/*
  CAVEMAN CANYON RUN — 3D low-poly prehistoric endless dodger (by Fable).
  Adapted into the extension: three.js logic verbatim; the Tailwind UI was converted
  to inline styles (the shadow DOM has no Tailwind) and the canvas fills the page.
  Lanes: ←/→ or A/D · Jump: ↑/W/Space · Duck: ↓/S · Mobile: swipe.
*/

const LANES = [-2.4, 0, 2.4];
const PLAYER_Z = 7;
const SPAWN_Z = -130;
const KILL_Z = 22;

export function CavemanGame() {
  const mountRef = useRef<HTMLDivElement>(null);
  const metersRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const phaseRef = useRef<'ready' | 'running' | 'dying' | 'dead'>('ready');
  const apiRef = useRef<Record<string, ((...a: never[]) => void) | undefined>>({});

  const [phase, setPhase] = useState<'ready' | 'running' | 'dying' | 'dead'>('ready');
  const [finalMeters, setFinalMeters] = useState(0);
  const [bestMeters, setBestMeters] = useState(0);
  const [causeOfDeath, setCauseOfDeath] = useState('boulder');

  useEffect(() => {
    // three.js loads lazily (separate extension chunk) — the game world is built
    // once it arrives. `unmounted` guards the gap between unmount and resolution.
    let unmounted = false;
    let teardown: (() => void) | undefined;
    loadThree().then((three) => {
      if (unmounted) return;
      teardown = start(three);
    }).catch((err) => console.error('[BS] Failed to load three.js for Caveman Canyon Run:', err));
    return () => {
      unmounted = true;
      teardown?.();
    };

    function start(THREE: ThreeModule): (() => void) | undefined {
    const mount = mountRef.current;
    if (!mount) return;

    // ---------- RENDERER / SCENE / CAMERA ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const fogColor = new THREE.Color(0xf2a45e);
    scene.fog = new THREE.Fog(fogColor, 45, 125);

    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 500);
    const CAM_BASE = new THREE.Vector3(0, 4.8, 14);
    camera.position.copy(CAM_BASE);
    camera.lookAt(0, 1.4, -10);

    // ---------- LIGHTS ----------
    const hemi = new THREE.HemisphereLight(0xffe3b8, 0x8a5a2e, 0.95);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffd9a0, 0.9);
    sun.position.set(-18, 30, -20);
    scene.add(sun);

    // ---------- SKY DOME + SUN ----------
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(0xffe9c2) },
        mid: { value: new THREE.Color(0xffb469) },
        bot: { value: new THREE.Color(0xef8a4d) },
      },
      vertexShader:
        'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP;' +
        'void main(){ float h = normalize(vP).y; vec3 c = h > 0.18 ? mix(mid, top, smoothstep(0.18, 0.75, h)) : mix(bot, mid, smoothstep(-0.08, 0.18, h)); gl_FragColor = vec4(c, 1.0); }',
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(380, 24, 16), skyMat));

    const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(16, 24), new THREE.MeshBasicMaterial({ color: 0xfff0c8, fog: false }));
    sunDisc.position.set(-60, 52, -300);
    scene.add(sunDisc);
    const sunGlow = new THREE.Mesh(new THREE.CircleGeometry(30, 24), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.35, fog: false }));
    sunGlow.position.set(-60, 52, -301);
    scene.add(sunGlow);

    // ---------- MATERIALS ----------
    const M = {
      pathDirt: new THREE.MeshLambertMaterial({ color: 0xc9853f }),
      groundDirt: new THREE.MeshLambertMaterial({ color: 0xa9682c }),
      rockWall: new THREE.MeshLambertMaterial({ color: 0xb06a36 }),
      rockWallDark: new THREE.MeshLambertMaterial({ color: 0x91532a }),
      boulder: new THREE.MeshLambertMaterial({ color: 0x8d7a64 }),
      boulderDark: new THREE.MeshLambertMaterial({ color: 0x6f5f4c }),
      wood: new THREE.MeshLambertMaterial({ color: 0x7a4a21 }),
      woodDark: new THREE.MeshLambertMaterial({ color: 0x5b3617 }),
      spike: new THREE.MeshLambertMaterial({ color: 0xd8c9a3 }),
      leaf: new THREE.MeshLambertMaterial({ color: 0x4d7c2e }),
      leafDark: new THREE.MeshLambertMaterial({ color: 0x3a6322 }),
      skin: new THREE.MeshLambertMaterial({ color: 0xcf8f5b }),
      fur: new THREE.MeshLambertMaterial({ color: 0x8a5a26 }),
      furSpot: new THREE.MeshLambertMaterial({ color: 0x5e3c17 }),
      hair: new THREE.MeshLambertMaterial({ color: 0x3a281a }),
      stoneClub: new THREE.MeshLambertMaterial({ color: 0x9a9182 }),
      dust: new THREE.MeshBasicMaterial({ color: 0xb9824a, transparent: true, opacity: 0.8 }),
      shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
      birdMat: new THREE.MeshBasicMaterial({ color: 0x5a3a26 }),
    };

    const decorList: THREE.Object3D[] = [];

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M.groundDirt);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    scene.add(ground);

    const path = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 320), M.pathDirt);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0, -120);
    scene.add(path);

    const edgeGeo = new THREE.BoxGeometry(0.5, 0.32, 0.9);
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 26; i++) {
        const s = new THREE.Mesh(edgeGeo, i % 2 ? M.boulder : M.boulderDark);
        s.position.set(side * 4.95, 0.14, 12 - i * 6.4);
        s.rotation.y = Math.random() * Math.PI;
        s.userData.decor = { recycleAt: 25, span: 26 * 6.4 };
        scene.add(s);
        decorList.push(s);
      }
    }

    function makeRockCluster() {
      const g = new THREE.Group();
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const size = 2.4 + Math.random() * 4.2;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), Math.random() < 0.5 ? M.rockWall : M.rockWallDark);
        rock.position.set((Math.random() - 0.5) * 4, size * (0.35 + Math.random() * 0.3), (Math.random() - 0.5) * 4);
        rock.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
        rock.scale.y = 0.7 + Math.random() * 0.9;
        g.add(rock);
      }
      return g;
    }
    function makePalm() {
      const g = new THREE.Group();
      const h = 3.2 + Math.random() * 2.2;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, h, 6), M.woodDark);
      trunk.position.y = h / 2;
      trunk.rotation.z = (Math.random() - 0.5) * 0.25;
      g.add(trunk);
      for (let i = 0; i < 6; i++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.32, 2.4, 4), i % 2 ? M.leaf : M.leafDark);
        const a = (i / 6) * Math.PI * 2;
        frond.position.set(Math.cos(a) * 0.9, h + 0.15, Math.sin(a) * 0.9);
        frond.rotation.z = Math.cos(a) * 1.25;
        frond.rotation.x = -Math.sin(a) * 1.25;
        g.add(frond);
      }
      return g;
    }
    function makeBush() {
      const g = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + Math.random() * 0.5, 0), i % 2 ? M.leaf : M.leafDark);
        b.position.set((Math.random() - 0.5) * 1.2, 0.4 + Math.random() * 0.3, (Math.random() - 0.5) * 1.2);
        g.add(b);
      }
      return g;
    }

    const DECOR_SPAN = 175;
    for (let i = 0; i < 22; i++) {
      const wall = makeRockCluster();
      const side = i % 2 === 0 ? -1 : 1;
      wall.position.set(side * (8.5 + Math.random() * 5), 0, 15 - Math.random() * DECOR_SPAN);
      wall.userData.decor = { recycleAt: 28, span: DECOR_SPAN, sideSwap: true };
      scene.add(wall);
      decorList.push(wall);
    }
    for (let i = 0; i < 10; i++) {
      const palm = makePalm();
      const side = Math.random() < 0.5 ? -1 : 1;
      palm.position.set(side * (6.5 + Math.random() * 3.5), 0, 15 - Math.random() * DECOR_SPAN);
      palm.userData.decor = { recycleAt: 26, span: DECOR_SPAN, sideSwap: true };
      scene.add(palm);
      decorList.push(palm);
    }
    for (let i = 0; i < 12; i++) {
      const bush = makeBush();
      const side = Math.random() < 0.5 ? -1 : 1;
      bush.position.set(side * (5.6 + Math.random() * 6), 0, 15 - Math.random() * DECOR_SPAN);
      bush.userData.decor = { recycleAt: 24, span: DECOR_SPAN, sideSwap: true };
      scene.add(bush);
      decorList.push(bush);
    }

    for (let i = 0; i < 9; i++) {
      const mtn = new THREE.Mesh(new THREE.ConeGeometry(16 + Math.random() * 18, 24 + Math.random() * 26, 5), i % 2 ? M.rockWallDark : M.rockWall);
      mtn.position.set(-110 + i * 27 + (Math.random() - 0.5) * 12, 0, -200 - Math.random() * 60);
      scene.add(mtn);
    }

    const birds: THREE.Group[] = [];
    function makeBird() {
      const g = new THREE.Group();
      const wingGeo = new THREE.ConeGeometry(0.9, 2.6, 3);
      const lw = new THREE.Mesh(wingGeo, M.birdMat);
      lw.rotation.z = Math.PI / 2;
      lw.position.x = -1.2;
      const rw = new THREE.Mesh(wingGeo, M.birdMat);
      rw.rotation.z = -Math.PI / 2;
      rw.position.x = 1.2;
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.6, 4), M.birdMat);
      body.rotation.x = -Math.PI / 2;
      g.add(lw, rw, body);
      g.userData = { lw, rw, speed: 3 + Math.random() * 3, flap: Math.random() * 10 };
      return g;
    }
    for (let i = 0; i < 3; i++) {
      const b = makeBird();
      b.position.set(-40 + Math.random() * 80, 18 + Math.random() * 12, -90 - Math.random() * 60);
      scene.add(b);
      birds.push(b);
    }

    // ---------- THE CAVEMAN ----------
    const player = new THREE.Group();
    const pose = new THREE.Group();
    player.add(pose);
    player.position.set(0, 0, PLAYER_Z);
    scene.add(player);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.95, 8), M.fur);
    torso.position.y = 1.05;
    pose.add(torso);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.06), M.furSpot);
    strap.position.set(0.14, 1.1, -0.42);
    strap.rotation.x = 0.08;
    pose.add(strap);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), M.skin);
    head.position.y = 1.85;
    pose.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), M.hair);
    hair.position.set(0, 1.95, 0.06);
    hair.scale.set(1, 0.75, 1);
    pose.add(hair);
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 7), M.hair);
    beard.position.set(0, 1.62, -0.26);
    beard.rotation.x = Math.PI - 0.5;
    pose.add(beard);
    const noseP = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), M.skin);
    noseP.position.set(0, 1.86, -0.34);
    pose.add(noseP);

    const armGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.85, 6);
    const armL = new THREE.Group();
    const armLm = new THREE.Mesh(armGeo, M.skin);
    armLm.position.y = -0.38;
    armL.add(armLm);
    armL.position.set(-0.55, 1.45, 0);
    pose.add(armL);

    const armR = new THREE.Group();
    const armRm = new THREE.Mesh(armGeo, M.skin);
    armRm.position.y = -0.38;
    armR.add(armRm);
    armR.position.set(0.55, 1.45, 0);
    pose.add(armR);

    const club = new THREE.Group();
    const clubShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.9, 6), M.wood);
    clubShaft.position.y = -0.3;
    club.add(clubShaft);
    const clubHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 7, 6), M.stoneClub);
    clubHead.position.y = -0.75;
    clubHead.scale.set(1, 1.25, 1);
    club.add(clubHead);
    for (let i = 0; i < 4; i++) {
      const spk = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), M.spike);
      const a = (i / 4) * Math.PI * 2;
      spk.position.set(Math.cos(a) * 0.24, -0.78, Math.sin(a) * 0.24);
      spk.rotation.z = -Math.cos(a) * Math.PI * 0.5;
      spk.rotation.x = Math.sin(a) * Math.PI * 0.5;
      club.add(spk);
    }
    club.position.set(0, -0.78, 0);
    club.rotation.x = -0.9;
    armR.add(club);

    const legGeo = new THREE.CylinderGeometry(0.13, 0.15, 0.78, 6);
    const footGeo = new THREE.SphereGeometry(0.16, 6, 5);
    const legL = new THREE.Group();
    const legLm = new THREE.Mesh(legGeo, M.skin);
    legLm.position.y = -0.34;
    const footL = new THREE.Mesh(footGeo, M.skin);
    footL.position.set(0, -0.7, -0.06);
    footL.scale.set(1, 0.7, 1.4);
    legL.add(legLm, footL);
    legL.position.set(-0.22, 0.72, 0);
    pose.add(legL);

    const legR = new THREE.Group();
    const legRm = new THREE.Mesh(legGeo, M.skin);
    legRm.position.y = -0.34;
    const footR = new THREE.Mesh(footGeo, M.skin);
    footR.position.set(0, -0.7, -0.06);
    footR.scale.set(1, 0.7, 1.4);
    legR.add(legRm, footR);
    legR.position.set(0.22, 0.72, 0);
    pose.add(legR);

    const blobShadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), M.shadow);
    blobShadow.rotation.x = -Math.PI / 2;
    blobShadow.position.set(0, 0.02, PLAYER_Z);
    scene.add(blobShadow);

    // ---------- OBSTACLES ----------
    function makeBoulder() {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 0), M.boulder);
      g.add(core);
      for (let i = 0; i < 3; i++) {
        const chip = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), M.boulderDark);
        chip.position.set((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.4);
        g.add(chip);
      }
      const sh = new THREE.Mesh(new THREE.CircleGeometry(1.15, 14), M.shadow);
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = -1.12;
      g.add(sh);
      g.userData.spin = core;
      return g;
    }
    function makeSpear() {
      const g = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), M.wood);
      shaft.rotation.x = Math.PI / 2;
      g.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.55, 6), M.spike);
      tip.rotation.x = Math.PI / 2;
      tip.position.z = 1.95;
      g.add(tip);
      for (let i = 0; i < 3; i++) {
        const feather = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 4), M.leafDark);
        const a = (i / 3) * Math.PI * 2;
        feather.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, -1.62);
        feather.rotation.x = -Math.PI / 2;
        g.add(feather);
      }
      return g;
    }
    function makeLog() {
      const g = new THREE.Group();
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 8.6, 9), M.woodDark);
      log.rotation.z = Math.PI / 2;
      g.add(log);
      const cap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.1, 9), M.wood);
      cap1.rotation.z = Math.PI / 2;
      cap1.position.x = 4.3;
      g.add(cap1);
      const cap2 = cap1.clone();
      cap2.position.x = -4.3;
      g.add(cap2);
      for (let i = 0; i < 14; i++) {
        const spk = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 5), M.spike);
        const x = -3.9 + (i / 13) * 7.8;
        const a = Math.random() * Math.PI;
        spk.position.set(x, Math.sin(a) * 0.42 + Math.cos(a) * 0, Math.cos(a) * 0.42 * (Math.random() < 0.5 ? 1 : -1));
        spk.position.y = Math.abs(spk.position.y) + 0.3;
        spk.lookAt(spk.position.x, spk.position.y * 3, spk.position.z * 3);
        g.add(spk);
      }
      g.userData.spin = log;
      return g;
    }

    const pools: Record<string, THREE.Group[]> = { boulder: [], spear: [], log: [] };
    interface Obs { type: string; mesh: THREE.Group; lane: number; speedMul: number; wobble: number }
    const active: Obs[] = [];
    function spawnObstacle(type: string, lane: number) {
      let g = pools[type].pop();
      if (!g) {
        g = type === 'boulder' ? makeBoulder() : type === 'spear' ? makeSpear() : makeLog();
        scene.add(g);
      }
      g.visible = true;
      const o: Obs = { type, mesh: g, lane, speedMul: type === 'spear' ? 1.55 : 1, wobble: Math.random() * 10 };
      if (type === 'boulder') g.position.set(LANES[lane], 1.15, SPAWN_Z - Math.random() * 8);
      if (type === 'spear') g.position.set(LANES[lane], 1.42, SPAWN_Z - Math.random() * 8);
      if (type === 'log') g.position.set(0, 0.46, SPAWN_Z - Math.random() * 8);
      active.push(o);
    }
    function recycleObstacle(i: number) {
      const o = active[i];
      o.mesh.visible = false;
      pools[o.type].push(o.mesh);
      active.splice(i, 1);
    }
    function clearObstacles() {
      for (let i = active.length - 1; i >= 0; i--) recycleObstacle(i);
    }

    // ---------- DUST ----------
    const dustPool: THREE.Mesh[] = [];
    interface Dust { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number; t: number }
    const dustLive: Dust[] = [];
    const dustGeo = new THREE.SphereGeometry(0.09, 5, 4);
    function emitDust(x: number, z: number, count = 1) {
      for (let c = 0; c < count; c++) {
        let p = dustPool.pop();
        if (!p) {
          p = new THREE.Mesh(dustGeo, M.dust.clone());
          scene.add(p);
        }
        p.visible = true;
        p.position.set(x + (Math.random() - 0.5) * 0.4, 0.08, z + 0.3 + Math.random() * 0.3);
        p.scale.setScalar(0.7 + Math.random() * 0.8);
        (p.material as THREE.MeshBasicMaterial).opacity = 0.75;
        dustLive.push({ mesh: p, vx: (Math.random() - 0.5) * 1.2, vy: 1.2 + Math.random() * 1.6, vz: 2.5 + Math.random() * 2, life: 0.5 + Math.random() * 0.3, t: 0 });
      }
    }
    function updateDust(dt: number) {
      for (let i = dustLive.length - 1; i >= 0; i--) {
        const d = dustLive[i];
        d.t += dt;
        d.mesh.position.x += d.vx * dt;
        d.mesh.position.y += d.vy * dt;
        d.mesh.position.z += d.vz * dt;
        d.vy -= 2.4 * dt;
        d.mesh.scale.multiplyScalar(1 + dt * 2.2);
        (d.mesh.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - d.t / d.life);
        if (d.t >= d.life) {
          d.mesh.visible = false;
          dustPool.push(d.mesh);
          dustLive.splice(i, 1);
        }
      }
    }

    // ---------- STATE ----------
    const state = {
      lane: 1, targetX: 0, y: 0, vy: 0, crouch: 1, duckHeld: false, distance: 0, speed: 16,
      spawnTimer: 1.2, shake: 0, deathT: 0, deathSpin: new THREE.Vector3(), runT: 0, dustClock: 0, lastType: '',
    };

    function resetGame() {
      state.lane = 1; state.targetX = 0; state.y = 0; state.vy = 0; state.crouch = 1; state.duckHeld = false;
      state.distance = 0; state.speed = 16; state.spawnTimer = 1.0; state.shake = 0; state.deathT = 0; state.runT = 0; state.lastType = '';
      player.position.set(0, 0, PLAYER_Z);
      player.rotation.set(0, 0, 0);
      pose.rotation.set(0, 0, 0);
      pose.scale.set(1, 1, 1);
      pose.position.y = 0;
      clearObstacles();
      camera.position.copy(CAM_BASE);
    }

    apiRef.current.start = () => { resetGame(); phaseRef.current = 'running'; };

    function moveLane(dir: number) {
      if (phaseRef.current !== 'running') return;
      state.lane = Math.max(0, Math.min(2, state.lane + dir));
      state.targetX = LANES[state.lane];
    }
    function jump() {
      if (phaseRef.current !== 'running') return;
      if (state.y <= 0.01 && state.crouch > 0.85) {
        state.vy = 9.4;
        emitDust(player.position.x, PLAYER_Z, 6);
      }
    }
    function setDuck(v: boolean) { state.duckHeld = v; }

    function onKeyDown(e: KeyboardEvent) {
      const k = e.key;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) e.preventDefault();
      if (phaseRef.current === 'ready' || phaseRef.current === 'dead') {
        if (k === 'Enter' || k === ' ') { apiRef.current.reactStart && apiRef.current.reactStart(); return; }
      }
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') moveLane(-1);
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') moveLane(1);
      else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') jump();
      else if (k === 'ArrowDown' || k === 's' || k === 'S') setDuck(true);
    }
    function onKeyUp(e: KeyboardEvent) {
      const k = e.key;
      if (k === 'ArrowDown' || k === 's' || k === 'S') setDuck(false);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let touchStart: { x: number; y: number; t: number } | null = null;
    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      touchStart = { x: t.clientX, y: t.clientY, t: performance.now() };
    }
    function onTouchEnd(e: TouchEvent) {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (Math.max(adx, ady) < 24) { touchStart = null; return; }
      if (adx > ady) moveLane(dx > 0 ? 1 : -1);
      else if (dy < 0) jump();
      else { setDuck(true); setTimeout(() => setDuck(false), 650); }
      touchStart = null;
    }
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchend', onTouchEnd, { passive: true });

    function pickType() {
      const r = Math.random();
      let t = r < 0.4 ? 'boulder' : r < 0.72 ? 'spear' : 'log';
      if (t === 'log' && state.lastType === 'log') t = 'boulder';
      state.lastType = t;
      return t;
    }
    function doSpawn() {
      const t = pickType();
      if (t === 'log') {
        spawnObstacle('log', 1);
      } else {
        const lane = Math.floor(Math.random() * 3);
        spawnObstacle(t, lane);
        if (t === 'boulder' && state.distance > 250 && Math.random() < 0.4) {
          let lane2 = Math.floor(Math.random() * 3);
          if (lane2 === lane) lane2 = (lane2 + 1) % 3;
          spawnObstacle('boulder', lane2);
        }
      }
    }

    function die(byType: string) {
      phaseRef.current = 'dying';
      state.shake = 0.8;
      state.deathT = 0;
      state.deathSpin.set(6 + Math.random() * 4, 8 + Math.random() * 5, (Math.random() - 0.5) * 6);
      apiRef.current.onDeath && (apiRef.current.onDeath as (m: number, t: string) => void)(Math.floor(state.distance), byType);
    }

    const clock = new THREE.Clock();
    let raf = 0;

    function animate() {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const ph = phaseRef.current;
      const time = clock.elapsedTime;

      for (const b of birds) {
        const ud = b.userData as { flap: number; lw: THREE.Mesh; rw: THREE.Mesh; speed: number };
        ud.flap += dt * 7;
        ud.lw.rotation.z = Math.PI / 2 + Math.sin(ud.flap) * 0.55;
        ud.rw.rotation.z = -Math.PI / 2 - Math.sin(ud.flap) * 0.55;
        b.position.x += ud.speed * dt;
        if (b.position.x > 70) {
          b.position.x = -70;
          b.position.y = 16 + Math.random() * 14;
          b.position.z = -80 - Math.random() * 70;
        }
      }

      if (ph === 'running') {
        state.distance += state.speed * dt;
        state.speed = Math.min(40, 16 + state.distance * 0.028);
        if (metersRef.current) metersRef.current.textContent = String(Math.floor(state.distance));
        if (speedRef.current) speedRef.current.textContent = (state.speed / 16).toFixed(1) + 'x';

        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          doSpawn();
          const interval = Math.max(0.5, 1.25 - state.distance * 0.0011);
          state.spawnTimer = interval * (0.8 + Math.random() * 0.4);
        }

        player.position.x += (state.targetX - player.position.x) * Math.min(1, dt * 14);
        pose.rotation.z = (state.targetX - player.position.x) * -0.18;

        if (state.y > 0 || state.vy !== 0) {
          state.vy -= 26 * dt;
          state.y += state.vy * dt;
          if (state.y <= 0) {
            state.y = 0;
            state.vy = 0;
            state.shake = Math.max(state.shake, 0.12);
            emitDust(player.position.x, PLAYER_Z, 5);
          }
        }
        player.position.y = state.y;

        const crouchTarget = state.duckHeld && state.y <= 0.01 ? 0.55 : 1;
        state.crouch += (crouchTarget - state.crouch) * Math.min(1, dt * 12);
        pose.scale.y = state.crouch;
        pose.rotation.x = (1 - state.crouch) * 0.7;

        state.runT += dt * (8 + state.speed * 0.25);
        const swing = Math.sin(state.runT);
        legL.rotation.x = swing * 0.95;
        legR.rotation.x = -swing * 0.95;
        armL.rotation.x = -swing * 0.85;
        armR.rotation.x = swing * 0.85 - 0.25;
        pose.position.y = Math.abs(Math.cos(state.runT)) * 0.09;
        head.rotation.y = Math.sin(time * 1.6) * 0.18;

        state.dustClock -= dt;
        if (state.y <= 0.01 && state.dustClock <= 0) {
          emitDust(player.position.x, PLAYER_Z, 2);
          state.dustClock = 0.06;
        }

        blobShadow.position.x = player.position.x;
        const shScale = Math.max(0.35, 1 - state.y * 0.18);
        blobShadow.scale.setScalar(shScale);

        for (const d of decorList) {
          d.position.z += state.speed * dt;
          const cfg = d.userData.decor;
          if (d.position.z > cfg.recycleAt) {
            d.position.z -= cfg.span;
            if (cfg.sideSwap && Math.random() < 0.5) d.position.x *= -1;
          }
        }

        for (let i = active.length - 1; i >= 0; i--) {
          const o = active[i];
          const m = o.mesh;
          m.position.z += state.speed * o.speedMul * dt;

          if (o.type === 'boulder' && m.userData.spin) {
            m.userData.spin.rotation.x += (state.speed * dt) / 1.15;
          } else if (o.type === 'log' && m.userData.spin) {
            m.userData.spin.rotation.x -= state.speed * dt * 0.9;
            m.position.y = 0.46 + Math.sin(time * 9 + o.wobble) * 0.04;
          } else if (o.type === 'spear') {
            m.rotation.z += dt * 2.2;
            m.position.y = 1.42 + Math.sin(time * 5 + o.wobble) * 0.06;
          }

          const dz = Math.abs(m.position.z - PLAYER_Z);
          const window_ = o.type === 'log' ? 0.9 : o.type === 'boulder' ? 1.25 : 1.0;
          if (dz < window_) {
            let hit = false;
            if (o.type === 'boulder') {
              hit = Math.abs(m.position.x - player.position.x) < 1.35 && state.y < 1.7;
            } else if (o.type === 'spear') {
              const sameLane = Math.abs(m.position.x - player.position.x) < 1.0;
              const standing = state.crouch > 0.78 && state.y < 0.9;
              hit = sameLane && standing;
            } else if (o.type === 'log') {
              hit = state.y < 0.95;
            }
            if (hit) { die(o.type); break; }
          }
          if (m.position.z > KILL_Z) recycleObstacle(i);
        }
      } else if (ph === 'dying') {
        state.deathT += dt;
        player.position.y += (7 - state.deathT * 14) * dt;
        player.position.z += 4.5 * dt;
        pose.rotation.x += state.deathSpin.x * dt;
        pose.rotation.y += state.deathSpin.y * dt;
        pose.rotation.z += state.deathSpin.z * dt;
        if (player.position.y < 0.1 && state.deathT > 0.5) player.position.y = 0.1;
        for (let i = active.length - 1; i >= 0; i--) {
          const o = active[i];
          o.mesh.position.z += state.speed * 0.5 * o.speedMul * dt;
          if (o.mesh.position.z > KILL_Z) recycleObstacle(i);
        }
        if (state.deathT > 1.05 && phaseRef.current === 'dying') {
          phaseRef.current = 'dead';
          apiRef.current.onDead && apiRef.current.onDead();
        }
      } else if (ph === 'ready' || ph === 'dead') {
        const idle = Math.sin(time * 2.2);
        if (ph === 'ready') {
          pose.position.y = Math.abs(idle) * 0.03;
          armR.rotation.x = -0.25 + idle * 0.08;
          legL.rotation.x = 0;
          legR.rotation.x = 0;
          head.rotation.y = Math.sin(time * 0.8) * 0.3;
        }
        for (const d of decorList) {
          d.position.z += 2.5 * dt;
          const cfg = d.userData.decor;
          if (d.position.z > cfg.recycleAt) d.position.z -= cfg.span;
        }
      }

      updateDust(dt);

      if (state.shake > 0) {
        state.shake = Math.max(0, state.shake - dt);
        const s = state.shake;
        camera.position.set(
          CAM_BASE.x + (Math.random() - 0.5) * s * 1.6,
          CAM_BASE.y + (Math.random() - 0.5) * s * 1.2,
          CAM_BASE.z + (Math.random() - 0.5) * s * 0.6,
        );
      } else {
        camera.position.x += (player.position.x * 0.25 - camera.position.x) * dt * 3;
        camera.position.y = CAM_BASE.y;
        camera.position.z = CAM_BASE.z;
      }
      camera.lookAt(player.position.x * 0.4, 1.4, -10);

      renderer.render(scene, camera);
    }
    animate();

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      renderer.domElement.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) mesh.material.forEach((mm) => mm.dispose());
          else mesh.material.dispose();
        }
      });
    };
    } // end start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    apiRef.current.onDeath = ((meters: number, type: string) => {
      setFinalMeters(meters);
      setCauseOfDeath(type);
      setBestMeters((b) => Math.max(b, meters));
    }) as never;
    apiRef.current.onDead = (() => setPhase('dead')) as never;
    apiRef.current.reactStart = (() => {
      setPhase('running');
      apiRef.current.start && apiRef.current.start();
    }) as never;
  }, []);

  const startGame = () => apiRef.current.reactStart && apiRef.current.reactStart();

  const deathLine =
    causeOfDeath === 'boulder' ? 'FLATTENED BY A BOULDER' :
    causeOfDeath === 'spear' ? 'SKEWERED BY A SPEAR' : 'SWEPT BY A SPIKED LOG';

  const stoneStyle: React.CSSProperties = {
    background: 'radial-gradient(120% 140% at 30% 20%, #8d8273 0%, #6e6354 45%, #564c3f 100%)',
    border: '3px solid #3e362b',
    boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -4px 6px rgba(0,0,0,0.45), 0 6px 14px rgba(0,0,0,0.45)',
    borderRadius: '14px 18px 12px 20px',
  };
  const woodStyle: React.CSSProperties = {
    background: 'repeating-linear-gradient(95deg, #7a4a21 0px, #7a4a21 9px, #6b3f1b 9px, #6b3f1b 13px, #835026 13px, #835026 22px)',
    border: '3px solid #44280f',
    boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.18), inset 0 -4px 6px rgba(0,0,0,0.5), 0 6px 14px rgba(0,0,0,0.5)',
    borderRadius: '10px 16px 10px 18px',
  };
  const carved: React.CSSProperties = {
    fontFamily: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif",
    letterSpacing: '0.08em',
    textShadow: '0 2px 0 rgba(0,0,0,0.55), 0 0 1px rgba(0,0,0,0.4)',
  };
  const overlay: React.CSSProperties = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' };
  const btn: React.CSSProperties = { ...stoneStyle, borderRadius: 999, padding: '14px 36px', fontSize: 24, color: '#fffbeb', cursor: 'pointer', ...carved };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', userSelect: 'none', background: '#431407' }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

      {phase === 'running' && (
        <>
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 12 }}>
            <div style={{ ...stoneStyle, padding: '8px 20px', textAlign: 'center' }}>
              <div style={{ ...carved, fontSize: 11, color: 'rgba(253,230,138,0.9)' }}>METERS ESCAPED</div>
              <div style={{ ...carved, fontSize: 34, color: '#fffbeb', lineHeight: 1, marginTop: 2 }}><span ref={metersRef}>0</span></div>
            </div>
            <div style={{ ...woodStyle, padding: '8px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ ...carved, fontSize: 11, color: 'rgba(253,230,138,0.9)' }}>DANGER</div>
              <div style={{ ...carved, fontSize: 22, color: '#fffbeb', lineHeight: 1, marginTop: 2 }}><span ref={speedRef}>1.0x</span></div>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', ...woodStyle, borderRadius: 999, padding: '6px 16px' }}>
            <span style={{ ...carved, color: '#fef3c7', fontSize: 13 }}>← → SWERVE &nbsp;•&nbsp; ↑ JUMP LOGS &nbsp;•&nbsp; ↓ DUCK SPEARS</span>
          </div>
        </>
      )}

      {phase === 'ready' && (
        <div style={{ ...overlay, background: 'rgba(0,0,0,0.35)' }}>
          <div style={{ padding: 16 }}>
            <div style={{ ...stoneStyle, transform: 'rotate(-1.5deg)', display: 'inline-block', padding: '24px 40px', marginBottom: 24 }}>
              <h1 style={{ ...carved, fontSize: 48, color: '#fffbeb', lineHeight: 1.1, margin: 0 }}>CAVEMAN<br />CANYON RUN</h1>
              <p style={{ ...carved, color: 'rgba(253,230,138,0.9)', marginTop: 8, fontSize: 15 }}>THE STAMPEDE IS COMING. RUN, GRUG, RUN!</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 26 }}>
              {[['← →', 'DODGE BOULDERS'], ['↑', 'JUMP SPIKED LOGS'], ['↓', 'DUCK FLYING SPEARS']].map(([key, label]) => (
                <div key={label} style={{ ...woodStyle, padding: '8px 14px' }}>
                  <div style={{ ...carved, color: '#fffbeb', fontSize: 18, lineHeight: 1 }}>{key}</div>
                  <div style={{ ...carved, color: 'rgba(253,230,138,0.9)', fontSize: 10, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
            <button onClick={startGame} style={btn}>GRAB CLUB &amp; RUN</button>
            <p style={{ ...carved, color: 'rgba(254,243,199,0.7)', fontSize: 12, marginTop: 16 }}>KEYBOARD OR SWIPE • PRESS ENTER TO START</p>
          </div>
        </div>
      )}

      {phase === 'dead' && (
        <div style={{ ...overlay, background: 'rgba(0,0,0,0.55)' }}>
          <div style={{ padding: 16 }}>
            <div style={{ marginBottom: -56, animation: 'bsStomp 0.45s cubic-bezier(0.2,2.2,0.4,1) both' }}>
              <svg width="220" height="220" viewBox="0 0 200 200" style={{ filter: 'drop-shadow(0 14px 24px rgba(0,0,0,0.7))' }}>
                <ellipse cx="100" cy="132" rx="52" ry="46" fill="#2b1c10" />
                <ellipse cx="100" cy="130" rx="44" ry="38" fill="#3d2917" />
                <g fill="#2b1c10">
                  <ellipse cx="44" cy="74" rx="20" ry="34" transform="rotate(-24 44 74)" />
                  <ellipse cx="100" cy="58" rx="20" ry="38" />
                  <ellipse cx="156" cy="74" rx="20" ry="34" transform="rotate(24 156 74)" />
                </g>
                <g fill="#3d2917">
                  <ellipse cx="46" cy="78" rx="14" ry="26" transform="rotate(-24 46 78)" />
                  <ellipse cx="100" cy="62" rx="14" ry="30" />
                  <ellipse cx="154" cy="78" rx="14" ry="26" transform="rotate(24 154 78)" />
                </g>
                <g fill="#1c120a">
                  <path d="M33 44 L44 40 L42 56 Z" transform="rotate(-24 38 48)" />
                  <path d="M93 16 L107 16 L100 36 Z" />
                  <path d="M156 40 L167 44 L158 56 Z" transform="rotate(24 162 48)" />
                </g>
              </svg>
            </div>
            <div style={{ ...stoneStyle, transform: 'rotate(1deg)', display: 'inline-block', padding: '24px 40px', position: 'relative' }}>
              <h2 style={{ ...carved, fontSize: 48, color: '#fffbeb', margin: 0 }}>EXTINCT!</h2>
              <p style={{ ...carved, color: 'rgba(253,230,138,0.9)', marginTop: 4, fontSize: 15 }}>{deathLine}</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
                <div style={{ ...woodStyle, padding: '8px 16px' }}>
                  <div style={{ ...carved, fontSize: 10, color: 'rgba(253,230,138,0.9)' }}>METERS ESCAPED</div>
                  <div style={{ ...carved, fontSize: 24, color: '#fffbeb' }}>{finalMeters}</div>
                </div>
                <div style={{ ...woodStyle, padding: '8px 16px' }}>
                  <div style={{ ...carved, fontSize: 10, color: 'rgba(253,230,138,0.9)' }}>TRIBE RECORD</div>
                  <div style={{ ...carved, fontSize: 24, color: '#fffbeb' }}>{bestMeters}</div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 24 }}>
              <button onClick={startGame} style={btn}>RUN AGAIN</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes bsStomp { 0% { transform: scale(3.2) rotate(-8deg); opacity: 0; } 60% { transform: scale(0.92) rotate(1deg); opacity: 1; } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }`}</style>
    </div>
  );
}
