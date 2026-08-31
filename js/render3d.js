/* Companion Club — Three.js presentation layer.
 * A cozy miniature clubhouse: warm key light, wooden floors, authored
 * procedural stations and companions. The renderer consumes immutable
 * rules snapshots + event lists; it never mutates game state. All
 * decorative randomness comes from the decor/av seed streams, never the
 * rules stream.
 *
 * Layers: 0 environment, 1 gameplay (cells, stations, companions),
 * 2 selection/ghosts, 3 effects. Raycasts only hit layer 1.
 */
import * as THREE from '../vendor/three.module.min.js';

const LAYER_ENV = 0, LAYER_GAME = 1, LAYER_SEL = 2, LAYER_FX = 3;
const CELL = 1.0;

// ---------- tiny deterministic tween manager (no per-frame allocation) ----------
class Tweens {
  constructor() { this.list = []; }
  add(t) { // {dur, ease, onUpdate(k), onDone, tag}
    t.t = 0;
    if (t.tag) this.kill(t.tag);
    this.list.push(t);
    return t;
  }
  kill(tag) {
    for (let i = this.list.length - 1; i >= 0; i--)
      if (this.list[i].tag === tag) this.list.splice(i, 1);
  }
  tick(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.onUpdate((tw.ease || easeInOut)(k));
      if (k >= 1) { this.list.splice(i, 1); if (tw.onDone) tw.onDone(); }
    }
  }
  finishAll() {
    for (const tw of this.list) { tw.onUpdate(1); if (tw.onDone) tw.onDone(); }
    this.list.length = 0;
  }
  get busy() { return this.list.length > 0; }
}
const easeInOut = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const easeOutBack = k => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const easeOut = k => 1 - Math.pow(1 - k, 3);

// ---------- shared geometry cache (original procedural assets) ----------
function geoCache() {
  const g = {};
  // companions
  g.body = new THREE.SphereGeometry(0.3, 20, 14);
  g.head = new THREE.SphereGeometry(0.21, 16, 12);
  g.earCone = new THREE.ConeGeometry(0.08, 0.2, 8);
  g.earTri = new THREE.ConeGeometry(0.09, 0.16, 4);
  g.snout = new THREE.ConeGeometry(0.09, 0.2, 10);
  g.beak = new THREE.ConeGeometry(0.06, 0.16, 8);
  g.tail = new THREE.ConeGeometry(0.09, 0.34, 8);
  g.tailArc = new THREE.TorusGeometry(0.16, 0.045, 8, 14, Math.PI * 0.9);
  g.spikeShell = new THREE.IcosahedronGeometry(0.3, 0);
  g.eye = new THREE.SphereGeometry(0.035, 8, 6);
  g.belly = new THREE.SphereGeometry(0.2, 14, 10);
  // stations
  g.counter = new THREE.BoxGeometry(0.8, 0.5, 0.5);
  g.counterTop = new THREE.BoxGeometry(0.88, 0.06, 0.56);
  g.pot = new THREE.CylinderGeometry(0.12, 0.1, 0.16, 12);
  g.fruit = new THREE.SphereGeometry(0.07, 10, 8);
  g.easelLeg = new THREE.BoxGeometry(0.05, 0.8, 0.05);
  g.canvas = new THREE.BoxGeometry(0.5, 0.55, 0.04);
  g.drum = new THREE.CylinderGeometry(0.22, 0.24, 0.3, 16);
  g.drumSkin = new THREE.CylinderGeometry(0.2, 0.2, 0.03, 16);
  g.cymbal = new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16);
  g.cymbalPole = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6);
  g.beanbag = new THREE.SphereGeometry(0.34, 14, 10);
  g.pillow = new THREE.SphereGeometry(0.16, 10, 8);
  g.planter = new THREE.BoxGeometry(0.7, 0.3, 0.4);
  g.leaf = new THREE.IcosahedronGeometry(0.14, 0);
  g.bookcase = new THREE.BoxGeometry(0.7, 0.9, 0.25);
  g.bookRow = new THREE.BoxGeometry(0.6, 0.05, 0.2);
  g.book = new THREE.BoxGeometry(0.07, 0.22, 0.16);
  // environment
  g.cell = new THREE.BoxGeometry(0.96, 0.06, 0.96);
  g.stationBase = new THREE.CylinderGeometry(0.44, 0.48, 0.07, 20);
  g.marker = new THREE.RingGeometry(0.3, 0.4, 24);
  g.cursorRing = new THREE.RingGeometry(0.42, 0.48, 24);
  g.wishGem = new THREE.OctahedronGeometry(0.13, 0);
  g.wishRing = new THREE.TorusGeometry(0.2, 0.025, 8, 24);
  g.messBlob = new THREE.CircleGeometry(0.26, 12);
  g.messBit = new THREE.BoxGeometry(0.1, 0.06, 0.12);
  g.spark = new THREE.SphereGeometry(0.045, 6, 5);
  g.wall = new THREE.BoxGeometry(1, 1, 0.2);
  g.trim = new THREE.BoxGeometry(1, 0.12, 0.06);
  g.window = new THREE.BoxGeometry(1.4, 1.6, 0.06);
  g.rug = new THREE.CircleGeometry(1.1, 24);
  g.crate = new THREE.BoxGeometry(0.7, 0.55, 0.7);
  g.crateTop = new THREE.BoxGeometry(0.74, 0.08, 0.74);
  // decor
  g.lampPole = new THREE.CylinderGeometry(0.04, 0.06, 1.1, 8);
  g.lampShade = new THREE.ConeGeometry(0.24, 0.3, 12);
  g.banner = new THREE.PlaneGeometry(1.2, 0.5);
  g.tank = new THREE.BoxGeometry(0.8, 0.5, 0.4);
  g.fish = new THREE.SphereGeometry(0.05, 8, 6);
  g.fountainBase = new THREE.CylinderGeometry(0.4, 0.45, 0.25, 14);
  g.fountainTop = new THREE.CylinderGeometry(0.1, 0.14, 0.3, 10);
  g.scope = new THREE.CylinderGeometry(0.08, 0.12, 0.7, 10);
  g.teapot = new THREE.SphereGeometry(0.12, 12, 8);
  g.kite = new THREE.PlaneGeometry(0.4, 0.5);
  g.table = new THREE.CylinderGeometry(0.35, 0.3, 0.08, 14);
  g.tableLeg = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
  g.jukebox = new THREE.BoxGeometry(0.5, 0.7, 0.4);
  g.jukeboxTop = new THREE.CylinderGeometry(0.25, 0.25, 0.4, 12, 1, false, 0, Math.PI);
  g.pot2 = new THREE.CylinderGeometry(0.14, 0.11, 0.2, 10);
  return g;
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) { return false; }
}

export function createRenderer(opts) {
  const host = opts.host;
  const Content = opts.content;
  const RNG = opts.rng;
  const geos = geoCache();

  // ---------- renderer / scene ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

  const hemi = new THREE.HemisphereLight(0xfff4e0, 0x40342a, 0.75);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffc98a, 1.6);
  key.position.set(4, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0005;
  scene.add(key);
  const fill = new THREE.PointLight(0xffb066, 0.5, 20);
  fill.position.set(-3, 3, 2);
  scene.add(fill);

  // ---------- quality / theme state ----------
  let quality = 'medium';
  let reducedMotion = false;
  let theme = Content.THEMES[0];
  let palette = theme.palette;
  let running = true;
  let mode = 'hub'; // 'hub' | 'board'
  const tweens = new Tweens();

  // ---------- materials (rebuilt on theme change) ----------
  let MAT = null;
  function buildMaterials() {
    if (MAT) for (const k in MAT) MAT[k].dispose();
    const p = palette;
    MAT = {
      floor: new THREE.MeshStandardMaterial({ color: p.floor, roughness: 0.9 }),
      floorAlt: new THREE.MeshStandardMaterial({ color: p.floorAlt, roughness: 0.9 }),
      wall: new THREE.MeshStandardMaterial({ color: p.wall, roughness: 0.95 }),
      wood: new THREE.MeshStandardMaterial({ color: p.wood, roughness: 0.7 }),
      woodDark: new THREE.MeshStandardMaterial({ color: p.woodDark, roughness: 0.75 }),
      metal: new THREE.MeshStandardMaterial({ color: p.metal, roughness: 0.4, metalness: 0.6 }),
      glow: new THREE.MeshStandardMaterial({ color: 0xffe0aa, emissive: 0xffbb66, emissiveIntensity: 1.4 }),
      marker: new THREE.MeshBasicMaterial({ color: 0x8fce6e, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
      markerTidy: new THREE.MeshBasicMaterial({ color: 0x7fb0ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
      cursor: new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
      ghost: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }),
      mess: new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 1 }),
      hint: new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    };
    key.color.set(p.light);
    fill.color.set(p.accent);
    scene.fog = new THREE.Fog(p.fog, 18, 42);
    renderer.setClearColor(p.fog);
  }

  function actColor(activity) {
    const hv = opts.settings.colorPalette === 'high-visibility';
    const a = Content.ACTIVITIES[activity];
    return hv && a.colorHC ? a.colorHC : a.color;
  }
  function compColor(id) {
    const hv = opts.settings.colorPalette === 'high-visibility';
    const c = Content.COMPANIONS[id];
    return hv && c.colorHC ? c.colorHC : c.color;
  }

  // ---------- board groups ----------
  let boardGroup = null;     // rebuilt per board
  let cols = 0, rows = 0;
  let cellMeshes = [];       // pick targets
  let stationViews = [];     // {x,y,group,messGroup,activity}
  let companionViews = {};   // id -> {group, body, wishGem, wishRing, target:{x,z}, phase, id}
  let selRing = null, cursorRingMesh = null, ghostMesh = null, hintRing = null;
  let targetRings = [];
  let stateRef = null;
  const decorRng = RNG.derive(0xC0FFEE, RNG.STREAM_DECOR);

  function cellToWorld(x, y) {
    return { x: (x - (cols - 1) / 2) * CELL, z: (y - (rows - 1) / 2) * CELL };
  }

  function disposeGroup(gr) {
    gr.traverse(o => {
      if (o.geometry && !Object.values(geos).includes(o.geometry)) o.geometry.dispose();
      if (o.material && o.material !== MAT && !Object.values(MAT || {}).includes(o.material)) {
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
        else if (!o.material._shared) o.material.dispose();
      }
    });
  }

  function clearBoard() {
    if (boardGroup) {
      scene.remove(boardGroup);
      disposeGroup(boardGroup);
    }
    boardGroup = null;
    cellMeshes = [];
    stationViews = [];
    companionViews = {};
    targetRings = [];
    selRing = cursorRingMesh = ghostMesh = hintRing = null;
  }

  // ---------- environment ----------
  function buildRoom(gr, w, d) {
    const p = palette;
    // floor slab beyond the board
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 6, 0.3, d + 6), MAT.floor);
    floor.position.y = -0.18;
    floor.receiveShadow = true;
    floor.layers.set(LAYER_ENV);
    gr.add(floor);

    const mkWall = (ww, x, z, ry) => {
      const wall = new THREE.Mesh(geos.wall, MAT.wall);
      wall.scale.set(ww, 4.2, 1);
      wall.position.set(x, 2.0, z);
      wall.rotation.y = ry;
      wall.receiveShadow = true;
      wall.layers.set(LAYER_ENV);
      gr.add(wall);
      const trim = new THREE.Mesh(geos.trim, MAT.wood);
      trim.scale.set(ww, 1, 1);
      trim.position.set(x, 0.16, z + (ry === 0 ? 0.13 : 0));
      trim.rotation.y = ry;
      trim.layers.set(LAYER_ENV);
      gr.add(trim);
    };
    mkWall(w + 6, 0, -(d / 2 + 2.6), 0);            // back
    mkWall(d + 6, -(w / 2 + 2.6), 0, Math.PI / 2);  // left

    // window glow on the back wall
    const win = new THREE.Mesh(geos.window, MAT.glow);
    win.position.set(w / 4, 2.4, -(d / 2 + 2.48));
    win.layers.set(LAYER_ENV);
    gr.add(win);

    if (quality === 'high') {
      // restrained environmental storytelling: corner plant + stack of books
      const pot = new THREE.Mesh(geos.pot2, MAT.woodDark);
      pot.position.set(-(w / 2 + 1.6), 0.1, -(d / 2 + 1.4));
      const l1 = new THREE.Mesh(geos.leaf, new THREE.MeshStandardMaterial({ color: 0x5d9c59, roughness: 0.8 }));
      l1.position.set(0, 0.35, 0); l1.scale.setScalar(1.4);
      const l2 = l1.clone(); l2.position.set(0.12, 0.5, 0.06); l2.scale.setScalar(0.9);
      pot.add(l1, l2);
      pot.layers.set(LAYER_ENV);
      gr.add(pot);
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(geos.book, new THREE.MeshStandardMaterial({ color: [0xb8734f, 0x6f8fb8, 0x8e6fc0][i], roughness: 0.8 }));
        b.position.set(w / 2 + 1.4, 0.11 + i * 0.07, -(d / 2 + 1.2));
        b.rotation.y = 0.3 * i;
        b.rotation.z = Math.PI / 2;
        b.layers.set(LAYER_ENV);
        gr.add(b);
      }
    }
  }

  // ---------- stations ----------
  function buildStation(activity) {
    const gr = new THREE.Group();
    const c = actColor(activity);
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 });
    mat._shared = false;
    const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(0.55), roughness: 0.75 });
    let m;
    switch (activity) {
      case 'snack':
        m = new THREE.Mesh(geos.counter, MAT.wood); m.position.y = 0.25; m.castShadow = true; gr.add(m);
        m = new THREE.Mesh(geos.counterTop, MAT.woodDark); m.position.y = 0.53; gr.add(m);
        m = new THREE.Mesh(geos.pot, MAT.metal); m.position.set(-0.2, 0.63, 0); gr.add(m);
        m = new THREE.Mesh(geos.fruit, mat); m.position.set(0.18, 0.62, 0.05); gr.add(m);
        m = new THREE.Mesh(geos.fruit, dark); m.position.set(0.3, 0.62, -0.08); gr.add(m);
        break;
      case 'paint':
        m = new THREE.Mesh(geos.easelLeg, MAT.woodDark); m.position.set(-0.2, 0.4, 0.1); m.rotation.z = 0.2; gr.add(m);
        m = new THREE.Mesh(geos.easelLeg, MAT.woodDark); m.position.set(0.2, 0.4, 0.1); m.rotation.z = -0.2; gr.add(m);
        m = new THREE.Mesh(geos.easelLeg, MAT.woodDark); m.position.set(0, 0.4, -0.15); m.rotation.x = -0.25; gr.add(m);
        m = new THREE.Mesh(geos.canvas, mat); m.position.set(0, 0.55, 0.05); m.rotation.x = -0.08; m.castShadow = true; gr.add(m);
        break;
      case 'music':
        m = new THREE.Mesh(geos.drum, mat); m.position.y = 0.15; m.castShadow = true; gr.add(m);
        m = new THREE.Mesh(geos.drumSkin, new THREE.MeshStandardMaterial({ color: 0xf3e6d8, roughness: 0.9 })); m.position.y = 0.31; gr.add(m);
        m = new THREE.Mesh(geos.cymbalPole, MAT.metal); m.position.set(0.3, 0.25, -0.1); gr.add(m);
        m = new THREE.Mesh(geos.cymbal, MAT.metal); m.position.set(0.3, 0.52, -0.1); gr.add(m);
        break;
      case 'nap':
        m = new THREE.Mesh(geos.beanbag, mat); m.scale.set(1, 0.55, 1); m.position.y = 0.18; m.castShadow = true; gr.add(m);
        m = new THREE.Mesh(geos.pillow, dark); m.scale.set(1, 0.5, 1); m.position.set(0.1, 0.34, 0.05); gr.add(m);
        break;
      case 'garden':
        m = new THREE.Mesh(geos.planter, MAT.wood); m.position.y = 0.15; m.castShadow = true; gr.add(m);
        m = new THREE.Mesh(geos.leaf, mat); m.position.set(-0.15, 0.42, 0); gr.add(m);
        m = new THREE.Mesh(geos.leaf, mat); m.scale.setScalar(0.75); m.position.set(0.14, 0.5, 0.05); gr.add(m);
        m = new THREE.Mesh(geos.leaf, dark); m.scale.setScalar(0.6); m.position.set(0.02, 0.38, -0.1); gr.add(m);
        break;
      case 'read':
        m = new THREE.Mesh(geos.bookcase, MAT.wood); m.position.y = 0.45; m.castShadow = true; gr.add(m);
        for (let i = 0; i < 2; i++) {
          m = new THREE.Mesh(geos.bookRow, MAT.woodDark); m.position.set(0, 0.3 + i * 0.3, 0.13); gr.add(m);
        }
        const cols3 = [0xd9534f, 0x6f8fb8, 0x5d9c59];
        for (let i = 0; i < 3; i++) {
          m = new THREE.Mesh(geos.book, new THREE.MeshStandardMaterial({ color: cols3[i], roughness: 0.8 }));
          m.position.set(-0.15 + i * 0.12, 0.42, 0.14); gr.add(m);
        }
        break;
    }
    const base = new THREE.Mesh(geos.stationBase, MAT.floorAlt);
    base.position.y = 0.045;
    base.receiveShadow = true;
    gr.add(base);
    gr.traverse(o => o.layers.set(LAYER_GAME));
    return gr;
  }

  function buildMess() {
    const gr = new THREE.Group();
    const blob = new THREE.Mesh(geos.messBlob, MAT.mess);
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.075;
    gr.add(blob);
    for (let i = 0; i < 3; i++) {
      const bit = new THREE.Mesh(geos.messBit, MAT.mess);
      const a = i * 2.2;
      bit.position.set(Math.cos(a) * 0.22, 0.09, Math.sin(a) * 0.22);
      bit.rotation.y = a;
      gr.add(bit);
    }
    gr.traverse(o => o.layers.set(LAYER_GAME));
    return gr;
  }

  // ---------- companions ----------
  function buildCompanion(id) {
    const c = compColor(id);
    const shape = Content.COMPANIONS[id].shape;
    const gr = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(0.6), roughness: 0.7 });
    const cream = new THREE.MeshStandardMaterial({ color: 0xfff3e0, roughness: 0.8 });
    const eyeM = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.4 });
    let m;
    const body = new THREE.Mesh(geos.body, mat);
    body.position.y = 0.32;
    body.castShadow = true;
    gr.add(body);
    const head = new THREE.Mesh(geos.head, mat);
    head.position.set(0, 0.6, 0.14);
    gr.add(head);
    for (const sx of [-1, 1]) {
      m = new THREE.Mesh(geos.eye, eyeM);
      m.position.set(sx * 0.08, 0.64, 0.32);
      gr.add(m);
    }
    switch (shape) {
      case 'fox':
        for (const sx of [-1, 1]) {
          m = new THREE.Mesh(geos.earCone, dark);
          m.position.set(sx * 0.12, 0.78, 0.1);
          gr.add(m);
        }
        m = new THREE.Mesh(geos.snout, cream);
        m.position.set(0, 0.57, 0.34); m.rotation.x = Math.PI / 2; gr.add(m);
        m = new THREE.Mesh(geos.tail, dark);
        m.position.set(0, 0.3, -0.34); m.rotation.x = -Math.PI / 2.4; gr.add(m);
        break;
      case 'cat':
        for (const sx of [-1, 1]) {
          m = new THREE.Mesh(geos.earTri, dark);
          m.position.set(sx * 0.11, 0.77, 0.1);
          gr.add(m);
        }
        m = new THREE.Mesh(geos.belly, cream);
        m.scale.set(0.8, 0.9, 0.6); m.position.set(0, 0.28, 0.16); gr.add(m);
        m = new THREE.Mesh(geos.tailArc, dark);
        m.position.set(0.05, 0.25, -0.3); m.rotation.y = Math.PI / 2; gr.add(m);
        break;
      case 'hog': {
        m = new THREE.Mesh(geos.spikeShell, dark);
        m.scale.set(1.05, 0.85, 1.05); m.position.set(0, 0.36, -0.06);
        m.castShadow = true; gr.add(m);
        m = new THREE.Mesh(geos.snout, cream);
        m.scale.setScalar(0.7); m.position.set(0, 0.55, 0.32); m.rotation.x = Math.PI / 2; gr.add(m);
        break;
      }
      case 'bird':
        m = new THREE.Mesh(geos.beak, new THREE.MeshStandardMaterial({ color: 0xe8a84b, roughness: 0.6 }));
        m.position.set(0, 0.6, 0.36); m.rotation.x = Math.PI / 2; gr.add(m);
        m = new THREE.Mesh(geos.tail, dark);
        m.scale.set(0.7, 0.8, 0.7); m.position.set(0, 0.36, -0.3); m.rotation.x = -Math.PI / 2.2; gr.add(m);
        for (const sx of [-1, 1]) {
          m = new THREE.Mesh(geos.belly, dark);
          m.scale.set(0.35, 0.6, 0.8); m.position.set(sx * 0.26, 0.36, 0); gr.add(m);
        }
        break;
    }
    // wish indicator: floating gem + patience ring
    const wish = new THREE.Group();
    const gem = new THREE.Mesh(geos.wishGem, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const ring = new THREE.Mesh(geos.wishRing, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    ring.rotation.x = Math.PI / 2;
    wish.add(gem, ring);
    wish.position.y = 1.15;
    wish.visible = false;
    gr.add(wish);
    gr.traverse(o => { if (o.layers.mask === 1) o.layers.set(LAYER_GAME); });
    gem.layers.set(LAYER_GAME); ring.layers.set(LAYER_GAME);
    return { group: gr, body, wishGroup: wish, gem, ring, id, target: null, phase: Math.random() * Math.PI * 2, lift: 0 };
  }

  // ---------- particles (bounded pool, cosmetic only) ----------
  const POOL = 72;
  const particles = [];
  function initParticles() {
    for (let i = 0; i < POOL; i++) {
      const m = new THREE.Mesh(geos.spark, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
      m.visible = false;
      m.layers.set(LAYER_FX);
      scene.add(m);
      particles.push({ mesh: m, life: 0, dur: 0, vx: 0, vy: 0, vz: 0 });
    }
  }
  let poolIdx = 0;
  function burst(x, z, color, n, spread, up) {
    const count = quality === 'low' ? Math.ceil(n / 2) : n;
    for (let i = 0; i < count; i++) {
      const p = particles[poolIdx++ % POOL];
      p.mesh.visible = true;
      p.mesh.material.color.set(color);
      p.mesh.material.opacity = 1;
      p.mesh.position.set(x, 0.5, z);
      const a = Math.random() * Math.PI * 2;
      const r = (0.6 + Math.random() * 0.8) * (spread || 1);
      p.vx = Math.cos(a) * r;
      p.vz = Math.sin(a) * r;
      p.vy = (up || 1.6) * (0.7 + Math.random() * 0.6);
      p.life = 0;
      p.dur = 0.5 + Math.random() * 0.35;
    }
  }
  function tickParticles(dt) {
    for (const p of particles) {
      if (!p.mesh.visible) continue;
      p.life += dt;
      if (p.life >= p.dur) { p.mesh.visible = false; continue; }
      p.vy -= 4.5 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (p.mesh.position.y < 0.06) p.mesh.position.y = 0.06;
      p.mesh.material.opacity = 1 - p.life / p.dur;
    }
  }

  // ---------- selection / hints ----------
  function ensureSelMeshes() {
    if (!selRing) {
      selRing = new THREE.Mesh(geos.marker, MAT.marker);
      selRing.rotation.x = -Math.PI / 2;
      selRing.position.y = 0.09;
      selRing.layers.set(LAYER_SEL);
      selRing.raycast = () => {};
      boardGroup.add(selRing);
    }
    if (!cursorRingMesh) {
      cursorRingMesh = new THREE.Mesh(geos.cursorRing, MAT.cursor);
      cursorRingMesh.rotation.x = -Math.PI / 2;
      cursorRingMesh.position.y = 0.09;
      cursorRingMesh.layers.set(LAYER_SEL);
      cursorRingMesh.raycast = () => {};
      boardGroup.add(cursorRingMesh);
    }
    if (!ghostMesh) {
      ghostMesh = new THREE.Mesh(geos.body, MAT.ghost);
      ghostMesh.scale.setScalar(0.9);
      ghostMesh.position.y = 0.32;
      ghostMesh.visible = false;
      ghostMesh.layers.set(LAYER_SEL);
      ghostMesh.raycast = () => {};
      boardGroup.add(ghostMesh);
    }
    if (!hintRing) {
      hintRing = new THREE.Mesh(geos.cursorRing, MAT.hint);
      hintRing.rotation.x = -Math.PI / 2;
      hintRing.position.y = 0.1;
      hintRing.visible = false;
      hintRing.layers.set(LAYER_SEL);
      hintRing.raycast = () => {};
      boardGroup.add(hintRing);
    }
  }

  function setSelection(id, targets) {
    clearSelection();
    if (!stateRef || !id) return;
    const v = companionViews[id];
    if (!v) return;
    v.lift = 1;
    ensureSelMeshes();
    const c = stateRef.companions[Rules0.companionIndex(stateRef, id)];
    const w = cellToWorld(c.x, c.y);
    selRing.position.x = w.x; selRing.position.z = w.z;
    selRing.visible = true;
    for (const t of targets || []) {
      const ring = new THREE.Mesh(geos.marker, t.kind === 'tidy' ? MAT.markerTidy : MAT.marker);
      ring.rotation.x = -Math.PI / 2;
      const tw = cellToWorld(t.x, t.y);
      ring.position.set(tw.x, 0.09, tw.z);
      ring.layers.set(LAYER_SEL);
      ring.raycast = () => {};
      boardGroup.add(ring);
      targetRings.push(ring);
    }
  }
  function clearSelection() {
    for (const id in companionViews) companionViews[id].lift = 0;
    if (selRing) selRing.visible = false;
    for (const r of targetRings) { boardGroup.remove(r); r.geometry = geos.marker; }
    targetRings = [];
    hideGhost();
  }
  function setCursor(cell) {
    if (!boardGroup) return;
    ensureSelMeshes();
    if (!cell) { cursorRingMesh.visible = false; return; }
    const w = cellToWorld(cell.x, cell.y);
    cursorRingMesh.position.x = w.x; cursorRingMesh.position.z = w.z;
    cursorRingMesh.visible = true;
  }
  function showGhost(x, y) {
    if (!boardGroup) return;
    ensureSelMeshes();
    const w = cellToWorld(x, y);
    ghostMesh.position.x = w.x; ghostMesh.position.z = w.z;
    ghostMesh.visible = true;
  }
  function hideGhost() { if (ghostMesh) ghostMesh.visible = false; }
  function setHint(action) {
    if (!boardGroup || !action) return;
    ensureSelMeshes();
    const c = stateRef && stateRef.companions[Rules0.companionIndex(stateRef, action.companion)];
    let cell = null;
    if (action.type === 'tidy') cell = { x: action.x, y: action.y };
    else if (c) {
      const d = Rules0.DIRS[action.dir];
      cell = action.type === 'move' && d ? { x: c.x + d[0], y: c.y + d[1] } : { x: c.x, y: c.y };
    }
    if (!cell) return;
    const w = cellToWorld(cell.x, cell.y);
    hintRing.position.x = w.x; hintRing.position.z = w.z;
    hintRing.visible = true;
  }
  function clearHint() { if (hintRing) hintRing.visible = false; }

  // ---------- board building ----------
  // Rules facade injected lazily to avoid a circular import in main.
  let Rules0 = null;
  function bindRules(R) { Rules0 = R; }

  function buildBoard(state) {
    clearBoard();
    stateRef = state;
    mode = 'board';
    cols = state.cfg.board.cols;
    rows = state.cfg.board.rows;
    boardGroup = new THREE.Group();
    scene.add(boardGroup);
    buildRoom(boardGroup, cols, rows);

    // walkable cell tiles
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = state.grid[y][x];
        const w = cellToWorld(x, y);
        if (cell === '#') {
          const crate = new THREE.Mesh(geos.crate, MAT.wood);
          crate.position.set(w.x, 0.28, w.z);
          crate.castShadow = true; crate.receiveShadow = true;
          const top = new THREE.Mesh(geos.crateTop, MAT.woodDark);
          top.position.y = 0.3;
          crate.add(top);
          crate.rotation.y = ((x * 7 + y * 13) % 8) * 0.04 - 0.16;
          crate.layers.set(LAYER_GAME);
          boardGroup.add(crate);
          continue;
        }
        const tile = new THREE.Mesh(geos.cell, (x + y) % 2 ? MAT.floor : MAT.floorAlt);
        tile.position.set(w.x, 0.0, w.z);
        tile.receiveShadow = true;
        tile.layers.set(LAYER_GAME);
        tile.userData.cell = { x, y };
        boardGroup.add(tile);
        cellMeshes.push(tile);
      }
    }
    // stations
    for (const st of state.stations) {
      const gr = buildStation(st.activity);
      const w = cellToWorld(st.x, st.y);
      gr.position.set(w.x, 0.06, w.z);
      boardGroup.add(gr);
      const mess = buildMess();
      mess.position.set(w.x, 0, w.z);
      mess.visible = !!st.messy;
      boardGroup.add(mess);
      stationViews.push({ x: st.x, y: st.y, group: gr, messGroup: mess, activity: st.activity });
    }
    // companions
    for (const c of state.companions) {
      const v = buildCompanion(c.id);
      const w = cellToWorld(c.x, c.y);
      v.group.position.set(w.x, 0.06, w.z);
      boardGroup.add(v.group);
      companionViews[c.id] = v;
      updateWishView(v, c);
    }
    frameCamera(false);
  }

  function updateWishView(v, c) {
    if (c.wish) {
      v.wishGroup.visible = true;
      const col = actColor(c.wish.activity);
      v.gem.material.color.set(col);
      const frac = c.wish.patience / c.wish.maxPatience;
      v.ring.material.color.set(frac > 0.4 ? 0xf3e6d8 : 0xe05a4e);
      v.ring.scale.setScalar(0.6 + 0.6 * frac);
    } else {
      v.wishGroup.visible = false;
    }
  }

  // ---------- hub (title backdrop: the clubhouse itself) ----------
  let hubWalkers = [];
  function buildHub(ownedDecor) {
    clearBoard();
    mode = 'hub';
    cols = 8; rows = 6;
    boardGroup = new THREE.Group();
    scene.add(boardGroup);
    buildRoom(boardGroup, cols, rows);
    stateRef = null;

    // checkerboard floor (non-interactive)
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const w = cellToWorld(x, y);
      const tile = new THREE.Mesh(geos.cell, (x + y) % 2 ? MAT.floor : MAT.floorAlt);
      tile.position.set(w.x, 0, w.z);
      tile.receiveShadow = true;
      tile.layers.set(LAYER_ENV);
      boardGroup.add(tile);
    }
    // club stations along the back
    const acts = ['snack', 'music', 'read', 'nap'];
    acts.forEach((a, i) => {
      const gr = buildStation(a);
      const w = cellToWorld(1 + i * 2, 0);
      gr.position.set(w.x, 0.06, w.z);
      boardGroup.add(gr);
    });
    // owned decor
    hubWalkers = [];
    placeDecor(ownedDecor || {});
    // all four companions idling
    Content.COMPANION_ORDER.forEach((id, i) => {
      const v = buildCompanion(id);
      const w = cellToWorld(1 + i * 2, 3 + (i % 2));
      v.group.position.set(w.x, 0.06, w.z);
      boardGroup.add(v.group);
      companionViews[id] = v;
      hubWalkers.push({ v, tx: w.x, tz: w.z, wait: decorRng.next() * 3 });
    });
    frameCamera(true);
  }

  function placeDecor(owned) {
    const spots = {
      rug:       { x: 0, z: 0.6, build: () => {
        const m = new THREE.Mesh(geos.rug, new THREE.MeshStandardMaterial({ color: actColor('music'), roughness: 1 }));
        m.rotation.x = -Math.PI / 2; m.position.y = 0.075; return m; } },
      fern:      { x: -3.2, z: -1.8, build: () => {
        const g = new THREE.Group();
        const pot = new THREE.Mesh(geos.pot2, MAT.woodDark); pot.position.y = 0.1; g.add(pot);
        const l = new THREE.Mesh(geos.leaf, new THREE.MeshStandardMaterial({ color: 0x5d9c59, roughness: 0.8 }));
        l.scale.setScalar(1.5); l.position.y = 0.42; g.add(l); return g; } },
      lamp:      { x: 3.2, z: -1.8, build: () => {
        const g = new THREE.Group();
        const pole = new THREE.Mesh(geos.lampPole, MAT.metal); pole.position.y = 0.55; g.add(pole);
        const shade = new THREE.Mesh(geos.lampShade, MAT.glow); shade.position.y = 1.2; g.add(shade); return g; } },
      banner:    { x: 0, z: -2.4, y: 2.6, build: () => {
        const m = new THREE.Mesh(geos.banner, new THREE.MeshStandardMaterial({ color: actColor('paint'), side: THREE.DoubleSide }));
        return m; } },
      cushion:   { x: -2.2, z: 1.8, build: () => {
        const m = new THREE.Mesh(geos.beanbag, new THREE.MeshStandardMaterial({ color: actColor('nap'), roughness: 0.9 }));
        m.scale.set(1, 0.5, 1); m.position.y = 0.16; return m; } },
      teaset:    { x: 2.2, z: 1.8, build: () => {
        const g = new THREE.Group();
        const t = new THREE.Mesh(geos.table, MAT.wood); t.position.y = 0.5; g.add(t);
        const leg = new THREE.Mesh(geos.tableLeg, MAT.woodDark); leg.position.y = 0.25; g.add(leg);
        const pot = new THREE.Mesh(geos.teapot, new THREE.MeshStandardMaterial({ color: actColor('snack'), roughness: 0.6 }));
        pot.position.y = 0.62; g.add(pot); return g; } },
      shelf:     { x: -3.4, z: 0.4, build: () => buildStation('read') },
      kite:      { x: -2.8, z: -2.4, y: 2.4, build: () => {
        const m = new THREE.Mesh(geos.kite, new THREE.MeshStandardMaterial({ color: actColor('music'), side: THREE.DoubleSide }));
        m.rotation.z = Math.PI / 4; return m; } },
      jukebox:   { x: 3.4, z: 0.4, build: () => {
        const g = new THREE.Group();
        const b = new THREE.Mesh(geos.jukebox, new THREE.MeshStandardMaterial({ color: actColor('music'), roughness: 0.5 }));
        b.position.y = 0.35; g.add(b);
        const top = new THREE.Mesh(geos.jukeboxTop, MAT.glow);
        top.rotation.z = Math.PI / 2; top.position.y = 0.7; g.add(top); return g; } },
      aquarium:  { x: -1.4, z: -2.2, build: () => {
        const g = new THREE.Group();
        const tank = new THREE.Mesh(geos.tank, new THREE.MeshStandardMaterial({
          color: 0x6fb8dc, transparent: true, opacity: 0.5, roughness: 0.2 }));
        tank.position.y = 0.55; g.add(tank);
        const stand = new THREE.Mesh(geos.crate, MAT.woodDark); stand.scale.set(1.1, 0.6, 0.6); stand.position.y = 0.16; g.add(stand);
        const fish = new THREE.Mesh(geos.fish, new THREE.MeshStandardMaterial({ color: 0xe8a84b }));
        fish.position.set(0.15, 0.58, 0); g.add(fish); return g; } },
      fountain:  { x: 1.4, z: -2.2, build: () => {
        const g = new THREE.Group();
        const base = new THREE.Mesh(geos.fountainBase, MAT.floorAlt); base.position.y = 0.12; g.add(base);
        const top = new THREE.Mesh(geos.fountainTop, MAT.floorAlt); top.position.y = 0.38; g.add(top); return g; } },
      telescope: { x: 2.8, z: -2.2, build: () => {
        const g = new THREE.Group();
        const scope = new THREE.Mesh(geos.scope, MAT.metal);
        scope.position.y = 0.7; scope.rotation.z = 0.5; g.add(scope);
        const leg = new THREE.Mesh(geos.lampPole, MAT.woodDark); leg.scale.setScalar(0.6); leg.position.y = 0.3; g.add(leg); return g; } }
    };
    for (const id in owned) {
      if (!owned[id] || !spots[id]) continue;
      const s = spots[id];
      const m = s.build();
      m.position.x = s.x; m.position.z = s.z;
      if (s.y) m.position.y = s.y;
      m.traverse ? m.traverse(o => { if (o.layers.mask === 1) o.layers.set(LAYER_ENV); }) : m.layers.set(LAYER_ENV);
      boardGroup.add(m);
    }
  }

  // ---------- state sync ----------
  function syncState(state, events, instant) {
    stateRef = state;
    if (!boardGroup || mode !== 'board') return;
    for (const c of state.companions) {
      const v = companionViews[c.id];
      if (!v) continue;
      const w = cellToWorld(c.x, c.y);
      if (instant || reducedMotion) {
        v.group.position.x = w.x; v.group.position.z = w.z;
      } else if (v.group.position.x !== w.x || v.group.position.z !== w.z) {
        const sx = v.group.position.x, sz = v.group.position.z;
        tweens.add({
          dur: 0.22, ease: easeOut, tag: 'mv-' + c.id,
          onUpdate: k => {
            v.group.position.x = sx + (w.x - sx) * k;
            v.group.position.z = sz + (w.z - sz) * k;
          }
        });
      }
      updateWishView(v, c);
    }
    for (const sv of stationViews) {
      const st = state.stations.find(s => s.x === sv.x && s.y === sv.y);
      if (st) sv.messGroup.visible = !!st.messy;
    }
    if (!instant) {
      for (const ev of events || []) {
        if (ev.type === 'serve') {
          const w = cellToWorld(ev.cell.x, ev.cell.y);
          burst(w.x, w.z, actColor(ev.activity), 14, 1, 2.2);
          if (ev.together > 0) burst(w.x, w.z, 0xffe08a, 8, 1.4, 2.6);
        } else if (ev.type === 'tidy') {
          const w = cellToWorld(ev.cell.x, ev.cell.y);
          burst(w.x, w.z, 0xcfd8dc, 8, 0.8, 1.4);
        } else if (ev.type === 'wish-expired') {
          const c = state.companions[Rules0.companionIndex(state, ev.companion)];
          if (c) { const w = cellToWorld(c.x, c.y); burst(w.x, w.z, 0x777777, 6, 0.6, 0.8); }
        } else if (ev.type === 'win') {
          burst(0, 0, 0xffe08a, 30, 2.2, 3.2);
        } else if (ev.type === 'round') {
          burst(0, 0, 0x8fce6e, 20, 1.8, 2.6);
        }
      }
    }
  }

  // ---------- camera ----------
  const camState = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0, parX: 0, parY: 0 };
  function frameCamera(hub) {
    const size = Math.max(cols, rows);
    const dist = hub ? size * 1.25 + 5.5 : size * 1.05 + 4.2;
    const target = { px: 0, py: dist * 0.95, pz: dist * (hub ? 0.72 : 0.66), tx: 0, ty: 0, tz: hub ? -0.4 : 0.2 };
    if (reducedMotion) {
      Object.assign(camState, target);
      applyCamera();
      return;
    }
    const from = { ...camState };
    tweens.add({
      dur: 0.9, ease: easeInOut, tag: 'cam',
      onUpdate: k => {
        camState.px = from.px + (target.px - from.px) * k;
        camState.py = from.py + (target.py - from.py) * k;
        camState.pz = from.pz + (target.pz - from.pz) * k;
        camState.tx = from.tx + (target.tx - from.tx) * k;
        camState.ty = from.ty + (target.ty - from.ty) * k;
        camState.tz = from.tz + (target.tz - from.tz) * k;
      }
    });
  }
  function applyCamera() {
    const par = reducedMotion ? 0 : 0.5;
    camera.position.set(
      camState.px + camState.parX * par,
      camState.py + camState.parY * par * 0.5,
      camState.pz
    );
    camera.lookAt(camState.tx, camState.ty, camState.tz);
  }
  function setParallax(nx, ny) { camState.parX = nx; camState.parY = ny; }

  // ---------- picking ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pickCell(px, py) {
    if (mode !== 'board' || !cellMeshes.length) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((px - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((py - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    raycaster.layers.set(LAYER_GAME);
    const hits = raycaster.intersectObjects(cellMeshes, false);
    return hits.length ? hits[0].object.userData.cell : null;
  }

  // ---------- quality / theme ----------
  function applyQuality() {
    const dpr = window.devicePixelRatio || 1;
    const cap = quality === 'low' ? 1 : quality === 'medium' ? 1.5 : 2;
    renderer.setPixelRatio(Math.min(dpr, cap));
    key.castShadow = quality !== 'low';
    renderer.shadowMap.enabled = quality !== 'low';
    resize();
  }
  function setQuality(tier) {
    if (tier === 'auto') {
      const dpr = window.devicePixelRatio || 1;
      const small = Math.min(window.innerWidth, window.innerHeight) < 720;
      quality = (dpr > 2 || small) ? 'medium' : 'high';
    } else quality = tier;
    applyQuality();
  }
  function setTheme(id) {
    const t = Content.THEMES.find(x => x.id === id);
    if (t) { theme = t; palette = t.palette; }
    buildMaterials();
  }
  function setReducedMotion(b) { reducedMotion = !!b; }

  // ---------- resize ----------
  function resize() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // ---------- main loop ----------
  let raf = 0, lastT = 0, hubTime = 0;
  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    tweens.tick(dt);
    tickParticles(dt);
    const time = t / 1000;
    // idle animation: gentle bob + wish float (amplitude halved for reduced motion)
    const amp = reducedMotion ? 0.4 : 1;
    for (const id in companionViews) {
      const v = companionViews[id];
      v.group.position.y = 0.06 + Math.sin(time * 2 + v.phase) * 0.015 * amp + v.lift * 0.18;
      if (v.wishGroup.visible) {
        v.wishGroup.position.y = 1.15 + Math.sin(time * 2.6 + v.phase) * 0.05 * amp;
        v.wishGroup.rotation.y = time * 1.2;
      }
    }
    if (mode === 'hub') {
      hubTime += dt;
      for (const w of hubWalkers) {
        w.wait -= dt;
        const gx = w.v.group.position.x, gz = w.v.group.position.z;
        const dx = w.tx - gx, dz = w.tz - gz;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.05) {
          const sp = Math.min(1, dt * 1.2 / dist);
          w.v.group.position.x = gx + dx * sp;
          w.v.group.position.z = gz + dz * sp;
          w.v.group.rotation.y = Math.atan2(dx, dz);
        } else if (w.wait <= 0) {
          w.tx = (decorRng.next() * (cols - 2) - (cols - 2) / 2);
          w.tz = (decorRng.next() * (rows - 3) - (rows - 3) / 2) + 0.6;
          w.wait = 2 + decorRng.next() * 4;
        }
      }
    }
    applyCamera();
    renderer.render(scene, camera);
  }
  function setRunning(on) {
    running = !!on;
    if (running && !raf) { lastT = performance.now(); raf = requestAnimationFrame(loop); }
    else if (!running && raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  function skipAll() {
    tweens.finishAll();
    if (stateRef) syncState(stateRef, [], true);
  }

  // ---------- boot ----------
  buildMaterials();
  initParticles();
  setQuality(opts.settings.graphicsTier || 'auto');
  resize();
  setRunning(true);

  return {
    bindRules,
    buildBoard, buildHub, syncState,
    setSelection, clearSelection, setCursor,
    showGhost, hideGhost, setHint, clearHint,
    pickCell, setParallax,
    setReducedMotion, setQuality, setTheme,
    setRunning, skipAll, resize,
    isBusy: () => tweens.busy,
    get mode() { return mode; }
  };
}
