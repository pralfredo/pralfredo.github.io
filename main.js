import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/* ---------- renderer / scene / camera ---------- */
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x02040a, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

/* tiny environment map to give nicer lighting reflections */
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 800);
camera.position.set(0, 2, 9);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 3.5;
controls.maxDistance = 22;

/* ---------- lights (key/fill + rim) ---------- */
scene.add(new THREE.AmbientLight(0x687088, 0.55));

const key = new THREE.PointLight(0x9ecfff, 110, 140);
key.position.set(8, 6, 10); scene.add(key);

const fill = new THREE.PointLight(0xff9ff3, 70, 100);
fill.position.set(-8, -4, -9); scene.add(fill);

/* Rim/back light (edge highlight) */
const rim = new THREE.DirectionalLight(0xa6d2ff, 1.2);
rim.position.set(-2.5, 1.5, -4.5);
scene.add(rim);

/* Subtle sun glow sprite behind the planet */
function makeRadialGlow(size = 30, inner = "rgba(124,247,255,0.35)", outer = "rgba(124,247,255,0)") {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(128,128,10,128,128,128);
  grd.addColorStop(0, inner); grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0,0,256,256);
  const tex = new THREE.CanvasTexture(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  sprite.scale.set(size, size, 1);
  return sprite;
}
const sunGlow = makeRadialGlow(22);
sunGlow.position.set(-2.2, 1.2, -6);
scene.add(sunGlow);

/* ---------- main planet (with ring) ---------- */
const planetGroup = new THREE.Group(); scene.add(planetGroup);

/* richer physical material for more “depth” */
const planet = new THREE.Mesh(
  new THREE.SphereGeometry(2, 160, 160),
  new THREE.MeshPhysicalMaterial({
    color: 0x1b1b3c,
    roughness: 0.55,
    metalness: 0.08,
    clearcoat: 0.6,
    clearcoatRoughness: 0.35,
    sheen: 0.4,
    sheenColor: new THREE.Color(0x1a2a6d),
    emissive: 0x0a1236,
    emissiveIntensity: 0.45
  })
);
planet.castShadow = planet.receiveShadow = true;
planetGroup.add(planet);

/* atmosphere + faint cloud shell */
const atm = new THREE.Mesh(
  new THREE.SphereGeometry(2.12, 128, 128),
  new THREE.MeshBasicMaterial({ color: 0x7cf7ff, transparent: true, opacity: 0.22 })
);
planetGroup.add(atm);

const clouds = new THREE.Mesh(
  new THREE.SphereGeometry(2.06, 128, 128),
  new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.22, emissive: 0xffffff, emissiveIntensity: 0.05 })
);
planetGroup.add(clouds);

/* neon “city arcs” */
const arcMatA = new THREE.LineBasicMaterial({ color: 0xff9ff3, transparent: true, opacity: 0.75 });
const arcMatB = new THREE.LineBasicMaterial({ color: 0x7cf7ff, transparent: true, opacity: 0.75 });
function addArc(lat, lon0, span, mat) {
  const g = new THREE.BufferGeometry(); const pts = [];
  for (let t=0; t<=1; t+=0.02) {
    const lon = lon0 + t*span, r = 2.02;
    const x = r * Math.cos(lat) * Math.cos(lon);
    const y = r * Math.sin(lat);
    const z = r * Math.cos(lat) * Math.sin(lon);
    pts.push(new THREE.Vector3(x,y,z));
  }
  g.setFromPoints(pts);
  planetGroup.add(new THREE.Line(g, mat));
}
for (let i=0;i<26;i++){
  addArc((Math.random()*Math.PI)-Math.PI/2, Math.random()*Math.PI*2, 0.9*Math.PI, (i%2?arcMatA:arcMatB));
}

/* aurora ribbon (additive billboard) */
function makeAurora() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0,0,0,256);
  grd.addColorStop(0,"rgba(156,255,181,0)");
  grd.addColorStop(0.35,"rgba(156,255,181,0.35)");
  grd.addColorStop(1,"rgba(124,247,255,0)");
  g.fillStyle = grd; g.fillRect(0,0,256,256);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const geo = new THREE.PlaneGeometry(4.8, 2.1, 40, 1);
  const pos = geo.attributes.position;
  for (let i=0;i<pos.count;i++){
    const x = pos.getX(i);
    pos.setZ(i, Math.sin(x*1.4)*0.25);
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.y = Math.PI/3;
  mesh.position.set(0, 1.6, 0.1);
  return mesh;
}
const aurora = makeAurora();
planetGroup.add(aurora);

/* --------- ring with soft alpha + asteroid belt --------- */
function makeRingTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const g = c.getContext("2d");
  const cx = 256, cy = 256, rOuter = 250, rInner = 190;
  // base color gradient
  for (let r = rInner; r <= rOuter; r++){
    const t = (r - rInner) / (rOuter - rInner);
    g.strokeStyle = `rgba(124,247,255,${0.35*(1-Math.abs(t-0.5)*2)})`;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI*2); g.stroke();
  }
  // soft alpha edges
  const alpha = g.createRadialGradient(cx, cy, rInner-30, cx, cy, rOuter+30);
  alpha.addColorStop(0, "rgba(255,255,255,1)");
  alpha.addColorStop(0.08, "rgba(255,255,255,0.7)");
  alpha.addColorStop(0.92, "rgba(255,255,255,0.7)");
  alpha.addColorStop(1, "rgba(255,255,255,0)");
  g.globalCompositeOperation = "destination-in";
  g.fillStyle = alpha; g.fillRect(0,0,512,512);

  return new THREE.CanvasTexture(c);
}
const ringTex = makeRingTexture();
ringTex.wrapS = ringTex.wrapT = THREE.ClampToEdgeWrapping;

const ring = new THREE.Mesh(
  new THREE.RingGeometry(2.55, 3.25, 256, 1),
  new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false })
);
ring.rotation.x = Math.PI * 0.53;
ring.rotation.y = Math.PI * 0.18;
ring.position.y = 0.05;
planetGroup.add(ring);

/* asteroid belt (instanced pebbles along ring) */
{
  const pebbleGeo = new THREE.DodecahedronGeometry(0.025, 0);
  const pebbleMat = new THREE.MeshStandardMaterial({ color: 0xcfefff, roughness: 0.9, metalness: 0.05, emissive: 0x7cf7ff, emissiveIntensity: 0.05 });
  const count = 420;
  const inst = new THREE.InstancedMesh(pebbleGeo, pebbleMat, count);
  const m = new THREE.Matrix4();
  for (let i=0;i<count;i++){
    const a = Math.random()*Math.PI*2;
    const r = THREE.MathUtils.randFloat(2.62, 3.18);
    const y = THREE.MathUtils.randFloatSpread(0.08);
    const x = Math.cos(a)*r, z = Math.sin(a)*r;
    m.makeRotationFromEuler(new THREE.Euler(Math.random(), Math.random(), Math.random()));
    m.setPosition(new THREE.Vector3(x, y, z));
    inst.setMatrixAt(i, m);
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.rotation.x = ring.rotation.x;
  inst.rotation.y = ring.rotation.y;
  inst.position.copy(ring.position);
  planetGroup.add(inst);
}

/* ---------- starfield (multi-layer + big twinkle) ---------- */
function starLayer(count, size, minR=40, maxR=260) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count*3);
  for (let i=0;i<count;i++){
    const r = THREE.MathUtils.randFloat(minR, maxR);
    const th = Math.random()*Math.PI*2;
    const ph = Math.acos(THREE.MathUtils.randFloatSpread(2));
    pos[i*3] = r*Math.sin(ph)*Math.cos(th);
    pos[i*3+1] = r*Math.cos(ph);
    pos[i*3+2] = r*Math.sin(ph)*Math.sin(th);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos,3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9
  });
  return new THREE.Points(geo, mat);
}
const starsNear   = starLayer(1400, 0.2, 35, 120);
const starsMid    = starLayer(1200, 0.12, 60, 160);
const starsFar    = starLayer(1600, 0.07, 140, 320);
scene.add(starsFar, starsMid, starsNear);

/* brighter billboard “big stars” */
function makeBigStar(x,y,z, s=0.7){
  const sp = makeRadialGlow(2.2,"rgba(255,255,255,0.95)","rgba(255,255,255,0)");
  sp.scale.setScalar(s*4);
  sp.position.set(x,y,z);
  scene.add(sp);
  return sp;
}
const bigStars = [];
for (let i=0;i<14;i++){
  const r = THREE.MathUtils.randFloat(60,180);
  const th = Math.random()*Math.PI*2;
  const ph = Math.acos(THREE.MathUtils.randFloatSpread(2));
  bigStars.push(makeBigStar(
    r*Math.sin(ph)*Math.cos(th),
    r*Math.cos(ph),
    r*Math.sin(ph)*Math.sin(th),
    THREE.MathUtils.randFloat(0.8,1.35)
  ));
}

/* ---------- satellites = spherical moons ---------- */
const satellites = new THREE.Group(); scene.add(satellites);

function makeHalo(size=2.2, inner="rgba(255,255,255,0.35)", outer="rgba(255,255,255,0)"){
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(128,128,10,128,128,128);
  grd.addColorStop(0, inner); grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0,0,256,256);
  const tex = new THREE.CanvasTexture(c);
  return new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  }));
}

/* subtle fresnel-ish rim using onBeforeCompile (keeps it lightweight) */
function moonMaterial(hex){
  const mat = new THREE.MeshStandardMaterial({
    color: hex,
    roughness: 0.35,
    metalness: 0.25,
    emissive: hex,
    emissiveIntensity: 0.35
  });
  mat.onBeforeCompile = (shader)=>{
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       varying vec3 vWorldPosition;`
    ).replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
       vWorldPosition = worldPosition.xyz;`
    ).replace(
      '#include <output_fragment>',
      `#include <output_fragment>
       // cheap fresnel
       vec3 V = normalize(cameraPosition - vWorldPosition);
       float fres = pow(1.0 - max(dot(normal, V), 0.0), 2.0);
       vec3 rim = vec3(${new THREE.Color(hex).r.toFixed(3)}, ${new THREE.Color(hex).g.toFixed(3)}, ${new THREE.Color(hex).b.toFixed(3)}) * fres * 0.6;
       gl_FragColor.rgb += rim;`
    );
  };
  return mat;
}

function makeMoon(color, radius, speed, label, href, size=0.26){
  const g = new THREE.Group();

  // sphere
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(size, 48, 48), moonMaterial(color));
  g.add(sphere);

  // tiny halo sprite
  const halo = makeHalo(); halo.scale.set(1.1,1.1,1); g.add(halo);

  g.userData = { radius, angle: Math.random()*Math.PI*2, speed, label, href };
  satellites.add(g);
  return g;
}

/* three moons */
const satProjects = makeMoon(0x7cf7ff, 3.6, 0.62, "Projects", "#projects", 0.28);
const satAbout    = makeMoon(0xff9ff3, 4.6, 0.44, "About",    "#about",   0.28);
const satResume   = makeMoon(0x9cffb5, 5.4, 0.30, "Resume",   "Resume.pdf", 0.28);

/* optional DOM labels if you added #labels */
const labelsRoot = document.getElementById("labels");
const labelFor = new Map();
if (labelsRoot){
  [satProjects, satAbout, satResume].forEach(g=>{
    const d = document.createElement("div"); d.className="label";
    const {label, href} = g.userData;
    d.innerHTML = href.endsWith(".pdf") ? `<a href="${href}" target="_blank" rel="noopener">${label} ↗</a>` : `<a href="${href}">${label}</a>`;
    labelsRoot.appendChild(d); labelFor.set(g,d);
  });
}

/* ---------- distant secondary planet (parallax depth) ---------- */
const farGroup = new THREE.Group();
farGroup.position.set(-12, 6, -24); scene.add(farGroup);

const farPlanet = new THREE.Mesh(
  new THREE.SphereGeometry(1.25, 96, 96),
  new THREE.MeshPhysicalMaterial({
    color: 0x142438,
    roughness: 0.5,
    metalness: 0.1,
    clearcoat: 0.5,
    clearcoatRoughness: 0.4,
    emissive: 0x081426,
    emissiveIntensity: 0.25
  })
);
farGroup.add(farPlanet);

const farAtm = new THREE.Mesh(
  new THREE.SphereGeometry(1.31, 64, 64),
  new THREE.MeshBasicMaterial({ color: 0x9abfff, transparent: true, opacity: 0.15 })
);
farGroup.add(farAtm);

/* small tilted ring for the far planet */
const farRing = new THREE.Mesh(
  new THREE.RingGeometry(1.5, 1.85, 160, 1),
  new THREE.MeshBasicMaterial({ map: makeRingTexture(), transparent: true, depthWrite: false })
);
farRing.rotation.x = Math.PI * 0.72;
farRing.rotation.y = Math.PI * 0.18;
farGroup.add(farRing);

/* ---------- raycaster for clicks ---------- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
window.addEventListener("pointermove", (e)=> {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
});
window.addEventListener("click", () => {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(satellites.children, true);
  if (hits[0]){
    let g = hits[0].object;
    while (g.parent && !g.userData.href) g = g.parent;
    const { href } = g.userData;
    if (href.endsWith(".pdf")) window.open(href, "_blank", "noopener");
    else window.location.hash = href;
  }
});

/* ---------- responsive ---------- */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------- animate ---------- */
let t = 0;
function animate(){
  requestAnimationFrame(animate);
  t += 0.005;

  // main planet motion
  planet.rotation.y += 0.0012;
  clouds.rotation.y += 0.0018;
  planetGroup.rotation.y += 0.0009;
  atm.material.opacity = 0.2 + Math.sin(t*2)*0.03;
  aurora.position.y = 1.55 + Math.sin(t*1.5)*0.05;

  // ring slow precession
  ring.rotation.z += 0.0006;

  // asteroid belt subtle shimmer
  sunGlow.material.opacity = 0.3 + Math.sin(t*1.3)*0.05;

  // far planet slow parallax spin
  farGroup.rotation.y -= 0.0006;
  farRing.rotation.z -= 0.0003;

  // star drift + stronger twinkle
  starsFar.rotation.y  -= 0.0001;
  starsMid.rotation.y  -= 0.00025;
  starsNear.rotation.y -= 0.00045;
  const tw = 0.2 * (Math.sin(t*5) * 0.5 + 0.5);
  starsNear.material.opacity = 0.85 + tw*0.2;
  starsMid.material.opacity  = 0.75 + Math.sin(t*3+1.2)*0.18;
  starsFar.material.opacity  = 0.65 + Math.sin(t*2.1+2.3)*0.15;
  bigStars.forEach((s,i)=>{ s.material.opacity = 0.55 + Math.sin(t*3 + i)*0.4; });

  // satellites
  satellites.children.forEach((g) => {
    const u = g.userData;
    u.angle += 0.01 * u.speed;
    const r = u.radius;
    g.position.set(Math.cos(u.angle)*r, Math.sin(u.angle*1.15)*0.45, Math.sin(u.angle)*r);
    g.rotation.y += 0.01;
  });

  // DOM labels (if enabled)
  if (labelsRoot){
    const W = renderer.domElement.clientWidth, H = renderer.domElement.clientHeight;
    satellites.children.forEach((g)=>{
      const d = labelFor.get(g); if (!d) return;
      const p = g.position.clone().project(camera);
      d.style.display = p.z>1 ? "none" : "block";
      d.style.left = `${(p.x*0.5+0.5)*W}px`;
      d.style.top  = `${(-p.y*0.5+0.5)*H}px`;
    });
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

/* footer year */
const yEl = document.getElementById("year");
if (yEl) yEl.textContent = new Date().getFullYear();