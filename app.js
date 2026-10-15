import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.minDistance = 0.6; controls.maxDistance = 22;
controls.maxPolarAngle = Math.PI * 0.62; controls.target.set(0, 0.3, 0);

scene.add(new THREE.HemisphereLight(0xfff6e0, 0x5a5040, 1.4));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.2); sun.position.set(4, 10, 3); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 }); scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(4.5, 64), new THREE.ShadowMaterial({ opacity: 0.22 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// ---------- materials ----------
const FIN = { grey: 0x4a4e53, dark: 0x2c2f33, light: 0x7a7f85 };
const skin = new THREE.MeshPhysicalMaterial({ color: FIN.grey, metalness: 0.15, roughness: 0.62, clearcoat: 0.3, clearcoatRoughness: 0.5, envMapIntensity: 0.6, side: THREE.DoubleSide });
const xrayMats = [skin];
const ram = new THREE.MeshStandardMaterial({ color: 0x5c6167, roughness: 0.75, metalness: 0.1 });
const ctrl = new THREE.MeshStandardMaterial({ color: 0x43474c, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
const dark = new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.9, side: THREE.DoubleSide });
const glass = new THREE.MeshPhysicalMaterial({ color: 0x1a2a20, metalness: 0.6, roughness: 0.12, envMapIntensity: 1.2, side: THREE.DoubleSide });
const steel = new THREE.MeshStandardMaterial({ color: 0x9a9da2, roughness: 0.35, metalness: 0.85 });
const engMat = new THREE.MeshStandardMaterial({ color: 0x8a8d92, roughness: 0.4, metalness: 0.75 });
const hot = new THREE.MeshStandardMaterial({ color: 0x6b5a4a, roughness: 0.5, metalness: 0.6, side: THREE.DoubleSide });
const rubber = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.9 });
const white = new THREE.MeshStandardMaterial({ color: 0xd9d9d4, roughness: 0.6 });
const bayMat = new THREE.MeshStandardMaterial({ color: 0xb9bdb6, roughness: 0.7, side: THREE.DoubleSide });
const seatMat = new THREE.MeshStandardMaterial({ color: 0x4a4636, roughness: 0.8 });
const bombMat = new THREE.MeshStandardMaterial({ color: 0x5d6b4c, roughness: 0.6 });

function M(geo, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m); return m;
}
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const C = (rt, rb, h, s = 20) => new THREE.CylinderGeometry(rt, rb, h, s);

const tank = new THREE.Group(); scene.add(tank);
const parts = [];
function part(key, name) { const g = new THREE.Group(); g.name = key; tank.add(g); const p = { key, name, group: g, pieces: [] }; parts.push(p); g.userData.part = p; return p; }
function piece(p, dir, interior) { const o = new THREE.Group(); p.group.add(o); p.pieces.push({ obj: o, dir: new THREE.Vector3(...dir) }); if (interior) o.userData.interior = true; return o; }
const SIDE = [1, -1];

// ---------- geometry of the flying wing (1 unit = 10 m; x forward, z span) ----------
// spændvidde 52,4 m, længde 21,0 m, højde 5,18 m
const SPAN = 2.62, NOSE = 1.05, TAIL = -1.05, Y0 = 0.27;
const LE = z => NOSE - Math.abs(z) * Math.tan(THREE.MathUtils.degToRad(33)) * (Math.abs(z) < 0.18 ? 0.55 + 0.45 * Math.abs(z) / 0.18 : 1);
// W-formet savtakket bagkant (z, x)
const TEP = [[0, TAIL], [0.5, -0.4], [1.0, -0.86], [1.62, -0.24], [SPAN, -0.86]];
function TE(z) { z = Math.abs(z); for (let i = 1; i < TEP.length; i++) { const [z0, x0] = TEP[i - 1], [z1, x1] = TEP[i]; if (z <= z1) return x0 + (x1 - x0) * (z - z0) / (z1 - z0); } return TEP[TEP.length - 1][1]; }
const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const g2 = (a, s) => Math.exp(-(a * a) / (s * s));
function amp(x, z) { // top thickness
  const a = Math.abs(z);
  let h = 0.02 + 0.13 * (1 - sm((a - 0.25) / 1.3)) + 0.05 * (1 - sm(a / 0.35));
  h += 0.08 * g2(a - 0.68, 0.19) * sm((x + 0.75) / 0.5) * (1 - sm((x - 0.45) / 0.3)); // motorpukler
  h += 0.06 * g2(a, 0.22) * g2(x - 0.45, 0.4) + 0.04 * g2(a, 0.3) * sm((x + 0.9) / 0.6);   // cockpit
  return h;
}
const prof = t => Math.pow(t, 0.5) * (1 - t) / 0.385;
function topY(x, z) { const l = LE(z), r = TE(z); const t = THREE.MathUtils.clamp((l - x) / (l - r), 0, 1); return Y0 + amp(x, z) * prof(t); }
function botY(x, z) { const l = LE(z), r = TE(z); const t = THREE.MathUtils.clamp((l - x) / (l - r), 0, 1); return Y0 - 0.32 * (0.05 + 0.13 * (1 - sm((Math.abs(z) - 0.2) / 1.2))) * prof(t) * 0.95; }

function wingGeo() {
  const zs = []; const N = 160; for (let i = 0; i <= N; i++) zs.push(-SPAN + 2 * SPAN * i / N);
  for (const [k] of TEP) { zs.push(k, -k); } zs.sort((a, b) => a - b);
  const u = zs.filter((v, i) => i === 0 || v - zs[i - 1] > 1e-5); const Mn = 48;
  const pos = [], idx = []; const W = Mn + 1;
  for (const surf of [0, 1]) for (const z of u) for (let j = 0; j <= Mn; j++) {
    const t = 0.5 - 0.5 * Math.cos(Math.PI * j / Mn); const x = LE(z) + (TE(z) - LE(z)) * t;
    pos.push(x, surf ? botY(x, z) : topY(x, z), z);
  }
  const R = u.length;
  for (const surf of [0, 1]) { const o = surf * R * W; for (let i = 0; i < R - 1; i++) for (let j = 0; j < Mn; j++) {
    const a = o + i * W + j, b = a + 1, c = a + W, d = c + 1;
    if (surf) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
  } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function poly(pts, yf, mat, parent, off = 0.004) { // flat-ish patch following a surface function
  const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
  const g = new THREE.ShapeGeometry(sh, 8); const p = g.attributes.position;
  const v = []; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getY(i); v.push(x, yf(x, z) + off, z); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.setIndex(g.index); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function teAt(z) { return [TE(z), z]; }
function surfStrip(z0, z1, depth, mat, parent, yfOff = 0.006) { // control surface along trailing edge
  const s = Math.sign(z0 || z1);
  const pts = [teAt(z0), teAt(z1), [TE(z1) + depth, z1], [TE(z0) + depth, z0]];
  poly(pts, topY, mat, parent, yfOff); poly(pts, botY, mat, parent, -yfOff);
  return pts;
}

// ---------- parts ----------
const wing = part('wing', 'Flyvende vinge');
{ const w = piece(wing, [0, 0, 0]); M(wingGeo(), skin, 0, 0, 0, w); }

const cockpit = part('cockpit', 'Cockpit og besætning');
{
  const c = piece(cockpit, [0, 0.6, 0]);
  // 4 cockpitruder: to fronte, to side
  for (const s of SIDE) {
    poly([[0.80, 0.015 * s], [0.80, 0.14 * s], [0.70, 0.16 * s], [0.70, 0.02 * s]].map(p => p), topY, glass, c, 0.006);
    poly([[0.68, 0.17 * s], [0.66, 0.24 * s], [0.58, 0.22 * s], [0.6, 0.15 * s]], topY, glass, c, 0.006);
  }
  const crew = piece(cockpit, [0, 0.9, 0], true);
  for (const s of SIDE) { M(B(0.07, 0.02, 0.06), seatMat, 0.6, Y0 + 0.07, 0.07 * s, crew); M(B(0.02, 0.08, 0.06), seatMat, 0.565, Y0 + 0.1, 0.07 * s, crew);
    M(new THREE.SphereGeometry(0.018, 12, 8), white, 0.6, Y0 + 0.15, 0.07 * s, crew); }
  M(B(0.04, 0.04, 0.24), dark, 0.68, Y0 + 0.1, 0, crew);
}

const engines = part('engines', '4 × F118-motorer');
for (const s of SIDE) {
  const e = piece(engines, [0, 0.55, 0.35 * s], true);
  for (const zz of [0.6, 0.8]) {
    const g = M(C(0.045, 0.04, 0.42, 20), engMat, 0.05, Y0 + 0.04, zz * s, e); g.rotation.z = Math.PI / 2;
    const f = M(C(0.043, 0.043, 0.012, 20), dark, 0.265, Y0 + 0.04, zz * s, e); f.rotation.z = Math.PI / 2;
  }
}

const inlets = part('inlets', 'Luftindtag');
for (const s of SIDE) {
  const p = piece(inlets, [0.2, 0.8, 0.2 * s]);
  const z0 = 0.52 * s, z1 = 0.9 * s;
  // savtakket indtag (mørk åbning) foran motorpukkel
  poly([[0.36, z0], [0.31, (z0 + z1) / 2], [0.36, z1], [0.28, z1 * 1.0], [0.28, z0]], topY, dark, p, 0.012);
  poly([[0.38, z0], [0.33, (z0 + z1) / 2], [0.38, z1], [0.36, z1], [0.31, (z0 + z1) / 2], [0.36, z0]], topY, ram, p, 0.016);
  // hjælpeindtag (små døre)
  poly([[0.18, 0.62 * s], [0.18, 0.74 * s], [0.14, 0.74 * s], [0.14, 0.62 * s]], topY, dark, p, 0.008);
}

const exhausts = part('exhausts', 'Udstødning og afkøling');
for (const s of SIDE) {
  const p = piece(exhausts, [-0.6, 0.6, 0.1 * s]);
  const z0 = 0.54 * s, z1 = 0.88 * s;
  poly([[-0.12, z0], [-0.12, z1], [TE(z1) + 0.02, z1], [TE(z0) + 0.02, z0]], topY, hot, p, 0.006);
  poly([[-0.1, z0 * 1.06], [-0.1, z1 * 0.97], [-0.16, z1 * 0.97], [-0.16, z0 * 1.06]], topY, dark, p, 0.01);
}

const bays = part('bays', 'Bombeskakte');
for (const s of SIDE) {
  const p = piece(bays, [0, -0.6, 0.15 * s]);
  const z0 = 0.06 * s, z1 = 0.36 * s;
  poly([[0.48, z0], [0.48, z1], [-0.08, z1], [-0.08, z0]], botY, bayMat, p, -0.006);
  poly([[0.48, (z0 + z1) / 2 + 0.003], [0.48, (z0 + z1) / 2 - 0.003], [-0.08, (z0 + z1) / 2 - 0.003], [-0.08, (z0 + z1) / 2 + 0.003]], botY, dark, p, -0.008);
  const r = piece(bays, [0, -1.0, 0.3 * s], true);
  const rack = M(C(0.012, 0.012, 0.52, 10), steel, 0.2, Y0 - 0.0, 0.21 * s, r); rack.rotation.z = Math.PI / 2;
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const b = M(C(0.016, 0.016, 0.38, 12), bombMat, 0.2, Y0 + Math.sin(a) * 0.04, 0.21 * s + Math.cos(a) * 0.04, r); b.rotation.z = Math.PI / 2; }
}

const gear = part('gear', 'Landingsstel');
{
  const g = piece(gear, [0, -0.7, 0]);
  const wheel = (x, y, z, r, w) => { const m = M(C(r, r, w, 22), rubber, x, y, z, g); m.rotation.x = Math.PI / 2; const h = M(C(r * 0.55, r * 0.55, w + 0.004, 16), steel, x, y, z, g); h.rotation.x = Math.PI / 2; };
  // næsehjul
  const nx = 0.62, ny = botY(nx, 0); M(C(0.01, 0.01, ny - 0.04, 10), steel, nx, (ny + 0.04) / 2, 0, g);
  wheel(nx, 0.04, 0.025, 0.04, 0.03); wheel(nx, 0.04, -0.025, 0.04, 0.03);
  M(B(0.24, 0.004, 0.08), bayMat, nx - 0.05, ny - 0.003, 0.055, g).rotation.x = 1.2;
  for (const s of SIDE) {
    const mx = -0.05, mz = 0.61 * s, my = botY(mx, mz);
    M(C(0.016, 0.016, my - 0.07, 10), steel, mx, (my + 0.07) / 2, mz, g);
    M(B(0.2, 0.014, 0.014), steel, mx, 0.065, mz, g);
    for (const dx of [-0.07, 0.07]) for (const dz of [-0.035, 0.035]) wheel(mx + dx, 0.055, mz + dz, 0.055, 0.04);
    const d = M(B(0.3, 0.004, 0.12), bayMat, mx, my - 0.06, mz + 0.09 * s, g); d.rotation.x = 1.45 * s;
  }
}

const elevons = part('elevons', 'Elevons og "bæver-hale"');
for (const s of SIDE) {
  const p = piece(elevons, [-0.45, 0.1, 0.12 * s]);
  surfStrip(0.52 * s, 0.98 * s, 0.13, ctrl, p);
  surfStrip(1.04 * s, 1.58 * s, 0.13, ctrl, p);
  surfStrip(1.66 * s, 2.02 * s, 0.11, ctrl, p);
}
{ const p = piece(elevons, [-0.55, 0, 0]); // GLAS / beaver tail
  poly([[TAIL, 0], [TE(0.46), 0.46], [TE(0.46) + 0.18, 0.46], [TAIL + 0.3, 0], [TE(0.46) + 0.18, -0.46], [TE(0.46), -0.46]], topY, ctrl, p, 0.007);
  poly([[TAIL, 0], [TE(0.46), 0.46], [TE(0.46) + 0.18, 0.46], [TAIL + 0.3, 0], [TE(0.46) + 0.18, -0.46], [TE(0.46), -0.46]], botY, ctrl, p, -0.007); }

const rudders = part('rudders', 'Delte ror (drag rudders)');
for (const s of SIDE) {
  const p = piece(rudders, [-0.35, 0.25, 0.45 * s]);
  const z0 = 2.08 * s, z1 = 2.55 * s, d = 0.1;
  const pts = [teAt(z0), teAt(z1), [TE(z1) + d, z1], [TE(z0) + d, z0]];
  const up = poly(pts, topY, ctrl, p, 0.006), dn = poly(pts, botY, ctrl, p, -0.006);
  // let åbnet: drej op og ned omkring forkanten
  for (const [m, a] of [[up, 0.25], [dn, -0.25]]) {
    const pivot = new THREE.Group(); const cx = (TE(z0) + TE(z1)) / 2 + d, cz = (z0 + z1) / 2; pivot.position.set(cx, Y0, cz); p.add(pivot);
    m.position.set(-cx, -Y0, -cz); pivot.add(m);
    pivot.rotation.z = a; // hinge roughly spanwise
  }
}

const coating = part('coating', 'Stealth-form og belægning');
{
  const p = piece(coating, [0.35, 0.15, 0]);
  const pts = []; for (let i = 0; i <= 80; i++) { const z = -SPAN + 2 * SPAN * i / 80; const x = LE(z); pts.push(new THREE.Vector3(x - 0.004, Y0 + 0.002, z)); }
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05), 200, 0.008, 6), ram); m.castShadow = true; p.add(m);
  // RAM-paneler i sømme (lysere felter)
  for (const s of SIDE) { poly([[0.9, 0.01 * s], [0.5, 0.62 * s], [0.46, 0.62 * s], [0.86, 0.01 * s]], topY, ram, p, 0.003); }
}

// ---------- info (offentlige, encyklopædiske oplysninger) ----------
const INFO = {
  wing: ['B-2 er en ren "flyvende vinge" uden krop og uden halefinne. Hele flyet er én bærende flade, hvilket giver lav luftmodstand, lang rækkevidde og en meget lille radarsignatur.', ['Spændvidde 52,4 m · længde 21,0 m · højde 5,18 m', 'Vingeareal ca. 478 m²', 'Forkanten er pilformet med ca. 33°', 'Bygget i kompositmaterialer (kulfiber) og titanium', 'Rækkevidde ca. 11.000 km uden lufttankning']],
  cockpit: ['Cockpittet sidder i den hævede midtersektion. Besætningen er kun to personer: en pilot til venstre og en missionskommandør til højre.', ['Besætning: 2 (plads til en tredje)', 'Fire store ruder med særlig belægning, der dæmper radarrefleksion', 'Udskydersæder til begge', 'Glascockpit med multifunktionsskærme', 'Missioner på over 30 timer er gennemført']],
  engines: ['Fire General Electric F118-GE-100 turbofanmotorer ligger dybt begravet inde i vingen, to på hver side af midtersektionen, så de ikke kan ses af radar.', ['4 × F118-GE-100 uden efterbrænder', 'Ca. 77 kN trykkraft pr. motor', 'Topfart ca. Mach 0,95 (høj subsonisk)', 'Tophøjde ca. 15.200 m', 'Afledt af F110-motoren fra F-16']],
  inlets: ['Indtagene sidder på oversiden af vingen, så de er skjult for radar nedefra. De har savtakkede kanter og S-formede kanaler, der skjuler motorens blade.', ['Ét indtag forsyner to motorer', 'Savtakket kant spreder radarbølger væk fra modtageren', 'Hjælpeindtag foran åbner ved lav fart og start', 'S-kanal skjuler kompressorens front']],
  exhausts: ['Udstødningen ledes ud i flade, brede render på vingens overside foran bagkanten. Den varme gas blandes med kold luft, så den infrarøde signatur bliver lav.', ['Flade "trug" i varmebestandigt materiale', 'Dysen ligger skjult fra jorden', 'Blanding med kold luft sænker temperaturen', 'Mindsker kondensstriber med et tilsætningssystem']],
  bays: ['To bombeskakte sidder side om side under midtersektionen. Al last bæres indvendigt, så ydersiden forbliver glat og radarvenlig.', ['Nyttelast op til ca. 18.000 kg (40.000 lb)', 'Roterende affyringsramper (rotary launcher)', 'Kan bære både konventionelle og præcisionsstyrede våben', 'Skaktlågerne har savtakkede kanter']],
  gear: ['Trehjulet landingsstel: et næsehjul med to hjul og to hovedben med firehjulede bogier. Stellet foldes ind i skakte, hvis låger også er savtakkede.', ['Næsestel: 2 hjul', 'Hovedstel: 2 × 4 hjul', 'Sporvidde ca. 12 m', 'Lågerne lukker tæt for at bevare den glatte overflade']],
  elevons: ['Uden haleror styres B-2 med elevons langs den W-formede bagkant, som både virker som højde- og krængeror. Den spidse "bæver-hale" i midten dæmper vindstød.', ['Elevons på hver side af bagkanten', 'GLAS – gust load alleviation surface i midten', 'Fly-by-wire: en computer holder flyet stabilt', 'Ingen lodret finne mindsker radarsignaturen']],
  rudders: ['Yderst på vingerne sidder delte ror, som kan åbne op og ned samtidig. Det skaber modstand i den ene side, så flyet drejer (giver kurs) – i stedet for et sideror.', ['Fungerer som sideror og luftbremse', 'Åbner som en "næb" op og ned', 'Under stealth-flyvning holdes de lukkede', 'Styres automatisk af fly-by-wire']],
  coating: ['Stealth kommer af både form og belægning. Kanterne er parallelle i få vinkler, så radarekko samles i smalle "spidser" væk fra modtageren, og overfladen er dækket af radarabsorberende materialer (RAM).', ['Kun ca. et dusin forskellige kantvinkler', 'Radarabsorberende belægning og tape over sømme', 'Mørkegrå farve til natflyvning i stor højde', 'Kræver klimastyrede hangarer og meget vedligehold', 'Første flyvning 1989 · i tjeneste fra 1997 · 21 bygget']],
};
// ---------- base positions, centers ----------
for (const p of parts) for (const pc of p.pieces) pc.base = pc.obj.position.clone();
tank.updateMatrixWorld(true);
function partCenter(p) { const b = new THREE.Box3(); p.group.traverse(o => { if (o.isMesh && o.visible && !isHidden(o)) b.expandByObject(o); }); return b; }
function isHidden(o) { while (o) { if (o.visible === false) return true; o = o.parent; } return false; }

// interior hidden unless xray
const interiorObjs = []; tank.traverse(o => { if (o.userData.interior) interiorObjs.push(o); });
interiorObjs.forEach(o => (o.visible = false));
const isInterior = p => p.pieces.every(pc => pc.obj.userData.interior);

// ---------- labels ----------
const labelsEl = document.getElementById('labels'); const listEl = document.getElementById('partList');
parts.forEach((p, i) => {
  p.num = i + 1;
  const el = document.createElement('div'); el.className = 'lb'; el.innerHTML = `<span class="d">${p.num}</span><span class="t">${p.name}</span>`;
  el.addEventListener('click', e => { e.stopPropagation(); select(p, true); }); labelsEl.appendChild(el); p.label = el;
  const li = document.createElement('li'); li.innerHTML = `<button><b>${p.num}</b>${p.name}</button>`; li.firstChild.onclick = () => { select(p); flyTo(p); }; listEl.appendChild(li);
});
let showLabels = true;

// ---------- state ----------
let explode = 0, explodeTarget = 0, xray = false, spin = false, selected = null;
const exSlider = document.getElementById('explode'), exOut = document.getElementById('exv');
exSlider.oninput = () => { explodeTarget = exSlider.value / 100; };
const $ = id => document.getElementById(id);
$('bExplode').onclick = () => { explodeTarget = explodeTarget > 0.5 ? 0 : 1; exSlider.value = explodeTarget * 100; };
$('bXray').onclick = e => setXray(!xray);
$('bLabels').onclick = e => { showLabels = !showLabels; e.currentTarget.classList.toggle('on', showLabels); };
$('bSpin').onclick = e => { spin = !spin; controls.autoRotate = spin; e.currentTarget.classList.toggle('on', spin); };
function setXray(v) {
  xray = v; $('bXray').classList.toggle('on', v);
  for (const m of xrayMats) { m.transparent = v; m.opacity = v ? 0.18 : 1; m.depthWrite = !v; m.needsUpdate = true; }
  
}
document.querySelectorAll('[data-view]').forEach(b => (b.onclick = () => setView(b.dataset.view)));
document.querySelectorAll('[data-fin]').forEach(b => (b.onclick = () => {
  document.querySelectorAll('[data-fin]').forEach(x => x.classList.remove('on')); b.classList.add('on');
  skin.color.setHex(FIN[b.dataset.fin]);
}));
document.querySelectorAll('.tabs button').forEach(b => (b.onclick = () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.dataset.pane === b.dataset.tab));
  $('sheet').classList.remove('collapsed');
}));
$('handle').onclick = () => $('sheet').classList.toggle('collapsed');

// ---------- camera animation ----------
let anim = null;
function animateCam(pos, target, dur = 900) { anim = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, s: performance.now(), dur }; }
function fitDist(r) { const v = THREE.MathUtils.degToRad(camera.fov) / 2; const h = Math.min(1, camera.aspect); return r / Math.sin(v) / h * 0.9; }
function setView(name) {
  const narrow = innerWidth < 900; const T = new THREE.Vector3(0, narrow ? 0.05 : 0.25, 0); const d = fitDist(name === 'top' ? 3.0 : name === 'front' || name === 'rear' ? 2.9 : 3.7) * (narrow ? 0.9 : 1);
  const dirs = { iso: [0.95, 0.85, 0.75], side: [0, 0.12, 1], front: [1, 0.12, 0.02], rear: [-1, 0.15, 0.02], top: [-0.001, 1, 0] };
  const v = new THREE.Vector3(...dirs[name]).normalize().multiplyScalar(d);
  animateCam(T.clone().add(v), T);
}
function flyTo(p) {
  const b = partCenter(p); if (b.isEmpty()) return;
  const c = b.getCenter(new THREE.Vector3()), r = Math.max(0.25, b.getBoundingSphere(new THREE.Sphere()).radius);
  const dir = camera.position.clone().sub(controls.target).normalize();
  if (dir.y < 0.2) dir.y = 0.35; dir.normalize();
  animateCam(c.clone().add(dir.multiplyScalar(fitDist(r) * 1.1 + 0.3)), c);
}

// ---------- selection ----------
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let down = null;
canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) return;
  const r = canvas.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObject(tank, true).filter(h => !isHidden(h.object));
  // in x-ray prefer interior hits
  let h = xray ? (hits.find(h => partOf(h.object) && !xrayMats.includes(h.object.material)) || hits[0]) : hits[0];
  if (h) select(partOf(h.object)); else select(null);
});
function partOf(o) { while (o) { if (o.userData.part) return o.userData.part; o = o.parent; } return null; }
const hlMats = new Map();
function select(p, fly) {
  if (selected) selected.group.traverse(o => { if (o.isMesh && hlMats.has(o)) { o.material = hlMats.get(o); } });
  hlMats.clear(); selected = p;
  parts.forEach(q => q.label.classList.toggle('sel', q === p));
  if (!p) { $('card').hidden = true; return; }
  p.group.traverse(o => { if (o.isMesh) { hlMats.set(o, o.material); const m = o.material.clone(); m.emissive = new THREE.Color(0xc0581f); m.emissiveIntensity = 0.45; if (m.transparent) { m.opacity = Math.max(m.opacity, 0.5); } o.material = m; } });
  if (isInterior(p) && !xray && explode < 0.25) setXray(true);
  const [fn, facts] = INFO[p.key];
  $('cardNum').textContent = p.num; $('cardTitle').textContent = p.name; $('cardFn').textContent = fn;
  $('cardFacts').innerHTML = facts.map(f => `<li>${f}</li>`).join('');
  $('card').hidden = false; $('cardFly').onclick = () => flyTo(p);
  if (fly) flyTo(p);
}
$('cardX').onclick = () => select(null);

// ---------- loop ----------
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
camera.position.set(8, 5, 8); setView('iso'); anim.dur = 1;
const tmp = new THREE.Vector3();
function frame(now) {
  requestAnimationFrame(frame);
  if (flying) { flyStep(now); renderer.render(scene, camera); return; }
  if (anim) { let k = Math.min(1, (now - anim.s) / anim.dur); const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    camera.position.lerpVectors(anim.p0, anim.p1, e); controls.target.lerpVectors(anim.t0, anim.t1, e); if (k >= 1) anim = null; }
  explode += (explodeTarget - explode) * 0.12; if (Math.abs(explodeTarget - explode) < 0.001) explode = explodeTarget;
  interiorObjs.forEach(o => (o.visible = xray || explode > 0.25)); exOut.textContent = Math.round(explode * 100) + ' %';
  for (const p of parts) for (const pc of p.pieces) pc.obj.position.copy(pc.base).addScaledVector(pc.dir, explode);
  controls.update();
  // labels
  const w = innerWidth, h = innerHeight; const camDist = camera.position.distanceTo(controls.target);
  tank.updateMatrixWorld();
  for (const p of parts) {
    const vis = showLabels;
    if (!vis) { p.label.style.display = 'none'; continue; }
    if (!p._anchorT || now - p._anchorT > 120) { const b = partCenter(p); p._anchor = b.isEmpty() ? null : b.getCenter(new THREE.Vector3()); if (p._anchor && b.max.y) p._anchor.y = (b.max.y + p._anchor.y) / 2; p._anchorT = now; }
    if (!p._anchor) { p.label.style.display = 'none'; continue; }
    tmp.copy(p._anchor).project(camera);
    if (tmp.z > 1 || Math.abs(tmp.x) > 1.05 || Math.abs(tmp.y) > 1.05) { p.label.style.display = 'none'; continue; }
    p.label.style.display = 'flex';
    p.label.style.left = ((tmp.x + 1) / 2 * w) + 'px'; p.label.style.top = ((1 - tmp.y) / 2 * h) + 'px';
    const d = camera.position.distanceTo(p._anchor);
    const near = d < 3.2 || p === selected || (explode > 0.6 && camDist < 9);
    p.label.classList.toggle('near', near);
    p.label.style.opacity = (innerWidth < 900 && camDist > 5 && explode < 0.3 && p !== selected) ? 0 : 1;
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
$('load').style.opacity = 0; setTimeout(() => $('load').remove(), 450);
if (innerWidth < 900) $('sheet').classList.add('collapsed');

// ================= FLYV-TILSTAND =================
let flying = false, flyLast = 0, world = null, terrain = null, tCenter = new THREE.Vector2(1e9, 1e9);
const flyer = new THREE.Group(); scene.add(flyer);
const FS = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, roll: 0, thr: 0.5, speed: 16, jx: 0, jy: 0 };
const keys = {};
function hgt(x, z) {
  return 6 * Math.sin(x * 0.011) * Math.cos(z * 0.013) + 3.5 * Math.sin(x * 0.031 + 1.3) * Math.sin(z * 0.027 + 0.4)
    + 1.2 * Math.sin(x * 0.09 + z * 0.07) + 9 * Math.max(0, Math.sin(x * 0.004 + 2) * Math.cos(z * 0.0045)) ** 2;
}
const TS = 360, TN = 110;
function buildWorld() {
  world = new THREE.Group(); scene.add(world);
  const g = new THREE.PlaneGeometry(TS, TS, TN, TN); g.rotateX(-Math.PI / 2);
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
  terrain = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); world.add(terrain);
  const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  const sg = new THREE.IcosahedronGeometry(1, 1);
  world.userData.clouds = [];
  for (let i = 0; i < 26; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(sg, cm); m.scale.set(4 + Math.random() * 4, 1.6 + Math.random(), 3 + Math.random() * 3); m.position.set(k * 4 - 6, Math.random(), Math.random() * 3); c.add(m); }
    c.position.set((Math.random() - 0.5) * TS, 28 + Math.random() * 18, (Math.random() - 0.5) * TS); world.add(c); world.userData.clouds.push(c);
  }
}
function updateTerrain(cx, cz) {
  cx = Math.round(cx / 20) * 20; cz = Math.round(cz / 20) * 20;
  if (cx === tCenter.x && cz === tCenter.y) return; tCenter.set(cx, cz);
  const p = terrain.geometry.attributes.position, col = terrain.geometry.attributes.color; const g0 = terrain.geometry;
  const base = g0.userData.base || (g0.userData.base = p.array.slice());
  for (let i = 0; i < p.count; i++) {
    const x = base[i * 3] + cx, z = base[i * 3 + 2] + cz, h = hgt(x, z); p.setXYZ(i, x, h, z);
    const n = Math.sin(x * 0.21) * Math.sin(z * 0.19) + Math.sin(x * 0.05 + z * 0.08);
    let r = 0.93, gg = 0.95, b = 0.98; // sne
    if (n > 1.1 && h < 8) { r = 0.25; gg = 0.29; b = 0.27; } // skov
    else if (h > 12) { r = 0.98; gg = 0.99; b = 1; } else if (n < -1.3) { r = 0.62; gg = 0.66; b = 0.7; } // is/klippe
    col.setXYZ(i, r, gg, b);
  }
  p.needsUpdate = true; col.needsUpdate = true; g0.computeVertexNormals(); g0.computeBoundingSphere();
}
const flyUI = document.getElementById('fly');
function startFly() {
  if (!world) buildWorld(); world.visible = true;
  select(null); explodeTarget = explode = 0; exSlider.value = 0; setXray(false);
  for (const p of parts) for (const pc of p.pieces) pc.obj.position.copy(pc.base);
  flyer.add(tank); tank.position.set(0, -Y0, 0); gear.group.visible = false;
  Object.assign(FS, { yaw: 0, pitch: 0, roll: 0, thr: 0.5, speed: 16 }); FS.pos.set(0, hgt(0, 0) + 16, 0);
  scene.background = new THREE.Color(0xa9c3dc); scene.fog = new THREE.Fog(0xc3d4e4, 40, 170);
  ground.visible = false; sun.castShadow = false; controls.enabled = false; camera.far = 400; camera.updateProjectionMatrix();
  camera.position.set(-8, FS.pos.y + 3, 0);
  document.body.classList.add('flying'); flying = true; flyLast = performance.now(); tCenter.set(1e9, 1e9);
}
function stopFly() {
  flying = false; document.body.classList.remove('flying');
  scene.add(tank); tank.position.set(0, 0, 0); gear.group.visible = true; world.visible = false; scene.background = null; scene.fog = null;
  ground.visible = true; sun.castShadow = true; controls.enabled = true; sun.position.set(4, 10, 3); sun.target.position.set(0, 0, 0);
  camera.position.set(8, 6, 8); controls.target.set(0, 0.3, 0); setView('iso');
}
$('bFly').onclick = startFly; $('flyExit').onclick = stopFly;
// joystick
const joy = $('joy'), knob = $('knob'); let joyId = null;
function joyMove(e) { const r = joy.getBoundingClientRect(), R = r.width / 2; let dx = (e.clientX - r.left - R) / R, dy = (e.clientY - r.top - R) / R; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
  FS.jx = dx; FS.jy = dy; knob.style.transform = `translate(${dx * R * 0.6}px,${dy * R * 0.6}px)`; }
joy.addEventListener('pointerdown', e => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyMove(e); e.preventDefault(); });
joy.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
const joyEnd = e => { if (e.pointerId !== joyId) return; joyId = null; FS.jx = FS.jy = 0; knob.style.transform = ''; };
joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);
const thrEl = $('thr');
thrEl.oninput = () => { FS.thr = thrEl.value / 100; };
$('thrUp').onclick = () => { FS.thr = Math.min(1, FS.thr + 0.1); thrEl.value = FS.thr * 100; };
$('thrDn').onclick = () => { FS.thr = Math.max(0, FS.thr - 0.1); thrEl.value = FS.thr * 100; };
addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (flying && e.key.startsWith('Arrow')) e.preventDefault(); });
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
const fmt = n => Math.round(n).toLocaleString('da-DK');
const qY = new THREE.Quaternion(), qtmp = new THREE.Quaternion(), fwd = new THREE.Vector3(), camWant = new THREE.Vector3(), look = new THREE.Vector3();
function flyStep(now) {
  const dt = Math.min(0.05, (now - flyLast) / 1000); flyLast = now;
  let ix = FS.jx, iy = FS.jy;
  if (keys.arrowleft || keys.a) ix = -1; if (keys.arrowright || keys.d) ix = 1;
  if (keys.arrowup || keys.w) iy = -1; if (keys.arrowdown || keys.s) iy = 1;
  if (keys['+'] || keys.e) FS.thr = Math.min(1, FS.thr + dt * 0.5); if (keys['-'] || keys.q) FS.thr = Math.max(0, FS.thr - dt * 0.5);
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(g => g) : null;
  if (gp) { if (Math.abs(gp.axes[0]) > 0.12) ix = gp.axes[0]; if (Math.abs(gp.axes[1]) > 0.12) iy = gp.axes[1];
    if (gp.buttons[7]?.pressed || gp.buttons[0]?.pressed) FS.thr = Math.min(1, FS.thr + dt * 0.5); if (gp.buttons[6]?.pressed || gp.buttons[1]?.pressed) FS.thr = Math.max(0, FS.thr - dt * 0.5); }
  thrEl.value = FS.thr * 100;
  // op på joystick = stig (iy negativ)
  FS.pitch += (-iy * 0.9 - FS.pitch * (iy === 0 ? 0.6 : 0)) * dt; FS.pitch = THREE.MathUtils.clamp(FS.pitch, -0.7, 0.7);
  FS.roll += (ix * 0.85 - FS.roll) * Math.min(1, dt * 2.5);
  FS.yaw -= FS.roll * 0.75 * dt;
  const target = 9 + FS.thr * 22 - FS.pitch * 4; FS.speed += (target - FS.speed) * dt * 0.6;
  qY.setFromEuler(new THREE.Euler(FS.roll, FS.yaw, FS.pitch, 'YZX'));
  fwd.set(1, 0, 0).applyQuaternion(qY); FS.pos.addScaledVector(fwd, FS.speed * dt);
  const floor = hgt(FS.pos.x, FS.pos.z) + 3;
  if (FS.pos.y < floor + 4) { FS.pitch += (floor + 4 - FS.pos.y) * 0.25 * dt; } // blød optræk
  if (FS.pos.y < floor) FS.pos.y += (floor - FS.pos.y) * Math.min(1, dt * 8);
  if (FS.pos.y > 140) FS.pos.y = 140;
  flyer.position.copy(FS.pos); flyer.quaternion.copy(qY);
  // følgekamera
  qtmp.setFromEuler(new THREE.Euler(0, FS.yaw, 0, 'YZX'));
  camWant.set(-7.5, 2.6 - FS.pitch * 2, 0).applyQuaternion(qtmp).add(FS.pos);
  camWant.y = Math.max(camWant.y, hgt(camWant.x, camWant.z) + 1.5);
  camera.position.lerp(camWant, Math.min(1, dt * 3.5));
  look.set(4, FS.pitch * 2.5 - 0.2, 0).applyQuaternion(qtmp).add(FS.pos); camera.lookAt(look);
  camera.up.set(0, 1, 0);
  updateTerrain(FS.pos.x, FS.pos.z);
  sun.position.copy(FS.pos).add(new THREE.Vector3(30, 60, 20)); sun.target.position.copy(FS.pos); sun.target.updateMatrixWorld();
  for (const c of world.userData.clouds) { const dx = c.position.x - FS.pos.x, dz = c.position.z - FS.pos.z; if (Math.abs(dx) > TS / 2) c.position.x -= Math.sign(dx) * TS; if (Math.abs(dz) > TS / 2) c.position.z -= Math.sign(dz) * TS; }
  $('hudSpd').textContent = fmt(FS.speed * 36); $('hudAlt').textContent = fmt(FS.pos.y * 10); $('hudThr').textContent = Math.round(FS.thr * 100);
}

window.__app = { FS, startFly, stopFly, get flying() { return flying; }, parts, select, setXray, setView, flyTo, setExplode: v => { explodeTarget = v; exSlider.value = v * 100; }, camera, controls };
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
