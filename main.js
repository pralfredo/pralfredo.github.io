import * as THREE from './three/three.module.js';
import { OrbitControls } from './three/OrbitControls.js';

/* ---------- Scene, Camera, Renderer ---------- */
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02040a);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 2, 8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 3;
controls.maxDistance = 20;

/* ---------- Lights ---------- */
scene.add(new THREE.AmbientLight(0x666677, 0.6));
const sunLight = new THREE.PointLight(0x9ecfff, 100, 100);
sunLight.position.set(10, 6, 10);
scene.add(sunLight);
const pinkLight = new THREE.PointLight(0xff9ff3, 60, 60);
pinkLight.position.set(-8, -4, -8);
scene.add(pinkLight);

/* ---------- Planet Core ---------- */
const planetGroup = new THREE.Group();
scene.add(planetGroup);

const planetGeo = new THREE.SphereGeometry(2, 128, 128);
const planetMat = new THREE.MeshStandardMaterial({
  color: 0x2b2b6f,
  roughness: 0.7,
  metalness: 0.1,
  emissive: 0x080b30,
  emissiveIntensity: 0.5
});
const planet = new THREE.Mesh(planetGeo, planetMat);
planetGroup.add(planet);

/* ---------- Atmospheric Glow ---------- */
const atmosphereGeo = new THREE.SphereGeometry(2.1, 128, 128);
const atmosphereMat = new THREE.MeshBasicMaterial({
  color: 0x7cf7ff,
  transparent: true,
  opacity: 0.3
});
const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
planetGroup.add(atmosphere);

/* ---------- Cloud Layer ---------- */
const cloudGeo = new THREE.SphereGeometry(2.05, 128, 128);
const cloudMat = new THREE.MeshStandardMaterial({
  transparent: true,
  opacity: 0.3,
  emissive: 0xffffff,
  emissiveIntensity: 0.1
});
const clouds = new THREE.Mesh(cloudGeo, cloudMat);
planetGroup.add(clouds);

/* ---------- Procedural Starfield ---------- */
function generateStars(count, radiusMin = 40, radiusMax = 200) {
  const starGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = THREE.MathUtils.randFloat(radiusMin, radiusMax);
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    pos[i*3+1] = r * Math.cos(phi);
    pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
    transparent: true,
    opacity: 0.8
  });
  return new THREE.Points(starGeo, starMat);
}
const stars = generateStars(2500);
scene.add(stars);

/* ---------- Orbiting Menu Planets ---------- */
const satellites = new THREE.Group();
scene.add(satellites);

function createMoon(color, size, orbitRadius, speed, label, href) {
  const moonGeo = new THREE.SphereGeometry(size, 32, 32);
  const moonMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.5,
    metalness: 0.4,
    roughness: 0.6
  });
  const moon = new THREE.Mesh(moonGeo, moonMat);
  moon.userData = { angle: Math.random() * Math.PI * 2, orbitRadius, speed, label, href };
  satellites.add(moon);
}

createMoon(0x7cf7ff, 0.25, 3.5, 0.6, "Projects", "#projects");
createMoon(0xff9ff3, 0.25, 4.5, 0.4, "About", "#about");
createMoon(0x9cffb5, 0.25, 5.2, 0.3, "Resume", "Resume.pdf");

/* ---------- Raycaster for Clicks ---------- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function onPointerMove(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
}
window.addEventListener("pointermove", onPointerMove);

window.addEventListener("click", () => {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(satellites.children);
  if (hits[0]) {
    const { href } = hits[0].object.userData;
    if (href.endsWith(".pdf")) window.open(href, "_blank", "noopener");
    else window.location.hash = href;
  }
});

/* ---------- Handle Resize ---------- */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------- Animation Loop ---------- */
let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.005;

  planet.rotation.y += 0.001;
  clouds.rotation.y += 0.002;

  // Subtle pulsating atmosphere
  atmosphere.material.opacity = 0.25 + Math.sin(t * 2) * 0.05;

  // Rotate planet group slowly
  planetGroup.rotation.y += 0.0008;

  // Twinkle star opacity
  stars.material.opacity = 0.7 + 0.1 * Math.sin(t * 5);

  // Move satellites around
  satellites.children.forEach((m) => {
    m.userData.angle += 0.01 * m.userData.speed;
    const r = m.userData.orbitRadius;
    m.position.set(
      Math.cos(m.userData.angle) * r,
      Math.sin(m.userData.angle * 1.3) * 0.4,
      Math.sin(m.userData.angle) * r
    );
  });

  controls.update();
  renderer.render(scene, camera);
}
animate();

/* ---------- Year Updater ---------- */
document.getElementById("year").textContent = new Date().getFullYear();
