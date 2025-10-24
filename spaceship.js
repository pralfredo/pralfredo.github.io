
// THREE.js scene setup
const sceneEl = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
sceneEl.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 2000);
camera.position.set(16, 8, 22);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 8;
controls.maxDistance = 80;
controls.target.set(0, 2, 0);

// Lights
const amb = new THREE.AmbientLight(0x404040, 1.2);
scene.add(amb);
const key = new THREE.PointLight(0x00ffe7, 50, 120, 2.0);
key.position.set(10, 12, 6);
scene.add(key);
const rim = new THREE.PointLight(0xff51bc, 40, 140, 2.0);
rim.position.set(-12, 6, -8);
scene.add(rim);

// Starfield
const starGeo = new THREE.BufferGeometry();
const starCount = 3000;
const starPos = new Float32Array(starCount*3);
for(let i=0;i<starCount;i++){
  const r = 300 + Math.random()*600;
  const theta = Math.random()*Math.PI*2;
  const phi = Math.acos(2*Math.random()-1);
  starPos[i*3+0] = r*Math.sin(phi)*Math.cos(theta);
  starPos[i*3+1] = r*Math.sin(phi)*Math.sin(theta);
  starPos[i*3+2] = r*Math.cos(phi);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos,3));
const starMat = new THREE.PointsMaterial({ size: 1.4, sizeAttenuation:true, color: 0xffffff, transparent:true, opacity:0.9 });
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

// Floor / hangar sheen
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(1200,1200),
  new THREE.MeshStandardMaterial({ color: 0x0a0a18, roughness:0.6, metalness:0.2 })
);
floor.rotation.x = -Math.PI/2;
floor.position.y = -1.2;
scene.add(floor);

// --- Spaceship built from primitives (no external assets) ---
const ship = new THREE.Group();

// Hull
const hullMat = new THREE.MeshStandardMaterial({ color: 0x1b1e2a, roughness:0.45, metalness:0.85 });
const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 10, 16, 1, false), hullMat);
hull.rotation.z = Math.PI/2;
ship.add(hull);

// Cockpit
const cockpitMat = new THREE.MeshPhysicalMaterial({ color: 0x2b2f4a, metalness:0.9, roughness:0.1, transmission:0.2, transparent:true, opacity:0.9 });
const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1.05, 24, 18), cockpitMat);
cockpit.position.set(1.6, 0.6, 0);
ship.add(cockpit);

// Wings
const wingMat = new THREE.MeshStandardMaterial({ color: 0x141726, metalness:0.9, roughness:0.25 });
const wingL = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 2), wingMat);
wingL.position.set(0, -0.2, -1.6);
ship.add(wingL);
const wingR = wingL.clone();
wingR.position.z = 1.6;
ship.add(wingR);

// Engine cones (neon)
const engineMat = new THREE.MeshStandardMaterial({ color: 0x080a10, metalness:1, roughness:0.15, emissive:0x00ffe7, emissiveIntensity:1.6 });
const e1 = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2, 24), engineMat);
e1.rotation.z = -Math.PI/2;
e1.position.set(-5, 0, -0.9);
ship.add(e1);
const e2 = e1.clone(); e2.position.z = 0.9; ship.add(e2);

// Neon logo plate
const plateMat = new THREE.MeshStandardMaterial({ color: 0x0f121e, metalness:0.8, roughness:0.3, emissive:0x6b5cff, emissiveIntensity:0.4 });
const plate = new THREE.Mesh(new THREE.BoxGeometry(4,1.2,0.2), plateMat);
plate.position.set(2.8, 2.2, 0);
ship.add(plate);

// Floating text as Sprite (title on the ship)
const makeText = (txt, size=180, color='#00ffe7') => {
  const canvas = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = size*dpr; canvas.height = 64*dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  ctx.font = 'bold 28px Outfit, sans-serif';
  ctx.fillStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 18;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(txt, size/2, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest:true, transparent:true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.6, 1.1, 1);
  return sprite;
};
const logo = makeText("PRAMITHAS");
logo.position.set(2.8, 2.25, 0.02);
ship.add(logo);

// Slight bob animation
ship.position.y = 2;
scene.add(ship);

let t = 0;

// Simple particles for engine exhaust
const exhaustGeo = new THREE.BufferGeometry();
const particleCount = 200;
const exhaustPos = new Float32Array(particleCount*3);
exhaustGeo.setAttribute('position', new THREE.BufferAttribute(exhaustPos,3));
const exhaustMat = new THREE.PointsMaterial({ size: 0.12, color: 0x00ffe7, transparent:true, opacity:0.9 });
const exhaust = new THREE.Points(exhaustGeo, exhaustMat);
exhaust.position.set(-6.4, 0, 0);
ship.add(exhaust);

// Resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

// Nav panels
const buttons = document.querySelectorAll('.arrow');
buttons.forEach(b => b.addEventListener('click', () => {
  const id = 'panel-' + b.dataset.panel;
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('open'));
  const panel = document.getElementById(id);
  panel?.classList.add('open');
}));

// Close panel on click outside (or ESC)
document.addEventListener('keydown', e => { if(e.key === 'Escape'){ document.querySelectorAll('.panel').forEach(p=>p.classList.remove('open')); }});
renderer.domElement.addEventListener('pointerdown', () => document.querySelectorAll('.panel').forEach(p=>p.classList.remove('open')));

// Animation loop
function animate(){
  requestAnimationFrame(animate);
  t += 0.01;
  ship.rotation.y += 0.0025;
  ship.position.y = 2 + Math.sin(t)*0.15;

  // exhaust drift
  const arr = exhaust.geometry.attributes.position.array;
  for(let i=0;i<particleCount;i++){
    const idx = i*3;
    arr[idx] = -Math.random()*Math.random()*2; // back
    arr[idx+1] = (Math.random()-0.5)*0.6;      // vertical jitter
    arr[idx+2] = (Math.random()-0.5)*0.8;      // horizontal jitter
  }
  exhaust.geometry.attributes.position.needsUpdate = true;

  controls.update();
  renderer.render(scene,camera);
}
animate();
