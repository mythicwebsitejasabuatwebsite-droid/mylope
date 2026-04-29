import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { createNebulaSystem, getWarmNebulaColors } from './nebula-system.js';

// ===================== KONFIGURASI UTAMA =====================
const CONFIG = {
  images: Array.from({length: 15}, (_, i) => `assets/images/b${i+1}.png`),
  ringRadius: 350,
  ringImageSize: 60,
  rotationSpeed: 0.0008,
  bloomStrength: 1.2,
  bloomRadius: 0.8,
  bloomThreshold: 0.1,
  modelPath: 'assets/images/heart_in_love.glb',
  musicPath: 'assets/images/music.mp3',
};

// ===================== SCENE SETUP =====================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100000);
camera.position.set(0, 100, 700);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '2';
renderer.domElement.style.pointerEvents = 'auto';

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 100;
controls.maxDistance = 3000;

// Bloom post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  CONFIG.bloomStrength,
  CONFIG.bloomRadius,
  CONFIG.bloomThreshold
);
composer.addPass(bloomPass);

// ===================== PENCAHAYAAN =====================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const pointLight1 = new THREE.PointLight(0xff6b9d, 2, 2000);
pointLight1.position.set(300, 300, 300);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x6bc5ff, 1.5, 2000);
pointLight2.position.set(-300, -200, -300);
scene.add(pointLight2);

// ===================== NEBULA =====================
createNebulaSystem(scene, {
  count: 20,
  colorPalette: getWarmNebulaColors(),
  spreadRadius: 30000,
  minScale: 100,
  maxScale: 180,
});

// ===================== BINTANG =====================
function createStars() {
  const geometry = new THREE.BufferGeometry();
  const count = 3000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 60000;
    colors[i] = 0.8 + Math.random() * 0.2;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
  });

  scene.add(new THREE.Points(geometry, material));
}
createStars();

// ===================== RING FOTO =====================
const ringGroup = new THREE.Group();
scene.add(ringGroup);
const textureLoader = new THREE.TextureLoader();
const imageSprites = [];

function createImageRing() {
  CONFIG.images.forEach((src, i) => {
    textureLoader.load(src, (texture) => {
      const mat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(CONFIG.ringImageSize, CONFIG.ringImageSize, 1);
      const angle = (i / CONFIG.images.length) * Math.PI * 2;
      sprite.position.set(
        Math.cos(angle) * CONFIG.ringRadius,
        0,
        Math.sin(angle) * CONFIG.ringRadius
      );
      sprite.userData.angle = angle;
      ringGroup.add(sprite);
      imageSprites.push(sprite);
    }, undefined, () => {
      // fallback jika gambar error
      const mat = new THREE.SpriteMaterial({ color: 0xff6b9d, transparent: true, opacity: 0.5 });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(CONFIG.ringImageSize, CONFIG.ringImageSize, 1);
      const angle = (i / CONFIG.images.length) * Math.PI * 2;
      sprite.position.set(Math.cos(angle) * CONFIG.ringRadius, 0, Math.sin(angle) * CONFIG.ringRadius);
      sprite.userData.angle = angle;
      ringGroup.add(sprite);
      imageSprites.push(sprite);
    });
  });
}
createImageRing();

// ===================== MODEL 3D (PLANET/HATI) =====================
const gltfLoader = new GLTFLoader();
gltfLoader.load(CONFIG.modelPath, (gltf) => {
  const model = gltf.scene;
  model.scale.set(30, 30, 30);
  model.position.set(0, 0, 0);
  scene.add(model);
  window.centralModel = model;
}, undefined, () => {
  // Fallback: bola merah kalau model gagal load
  const geo = new THREE.SphereGeometry(60, 32, 32);
  const mat = new THREE.MeshPhongMaterial({ color: 0xff6b9d, emissive: 0x550033, shininess: 80 });
  const sphere = new THREE.Mesh(geo, mat);
  scene.add(sphere);
  window.centralModel = sphere;
});

// ===================== AUDIO =====================
const audio = document.getElementById('bg-audio') || document.createElement('audio');
audio.src = CONFIG.musicPath;
audio.loop = true;
audio.volume = 0.5;
window.audioManager = {
  play: () => audio.play().catch(() => {}),
  pause: () => audio.pause(),
  playOnly: () => audio.play().catch(() => {}),
  setAudioUrl: (url) => { audio.src = url; audio.play().catch(() => {}); },
  defaultAudioUrl: CONFIG.musicPath,
};

// ===================== MUSIK SAAT KLIK =====================
let musicStarted = false;
function startMusic() {
  if (!musicStarted) {
    audio.play().catch(() => {});
    musicStarted = true;
  }
}
document.addEventListener('click', startMusic, { once: true });
document.addEventListener('dblclick', startMusic);

// ===================== POPUP QUESTION =====================
const questionPanel = document.getElementById('questionPanel');
const btnYes = document.getElementById('btnYes');
const noBtn = document.getElementById('noBtn');

if (btnYes) {
  btnYes.addEventListener('click', () => {
    if (questionPanel) {
      questionPanel.style.opacity = '0';
      questionPanel.style.transition = 'opacity 0.8s ease';
      setTimeout(() => { questionPanel.style.display = 'none'; }, 800);
    }
    startMusic();
  });
}

function moveNoBtn() {
  if (!noBtn) return;
  const maxX = window.innerWidth - 120;
  const maxY = window.innerHeight - 60;
  noBtn.style.position = 'fixed';
  noBtn.style.left = Math.random() * maxX + 'px';
  noBtn.style.top = Math.random() * maxY + 'px';
}
window.moveNoBtn = moveNoBtn;

// ===================== LOADING SCREEN =====================
function hideLoading() {
  const overlay = document.getElementById('flower-loading-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 1s ease';
    setTimeout(() => { overlay.style.display = 'none'; }, 1000);
  }
}

// Sembunyikan loading setelah semua siap
window.addEventListener('load', () => {
  setTimeout(hideLoading, 2000);
});
// Fallback timer
setTimeout(hideLoading, 6000);

// ===================== RESIZE =====================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ===================== ANIMASI =====================
let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.01;

  // Rotasi ring foto
  ringGroup.rotation.y += CONFIG.rotationSpeed;

  // Animasi naik turun tiap foto
  imageSprites.forEach((sprite, i) => {
    sprite.position.y = Math.sin(time + i * 0.4) * 20;
  });

  // Animasi model 3D
  if (window.centralModel) {
    window.centralModel.rotation.y += 0.005;
  }

  // Animasi lampu
  pointLight1.position.x = Math.sin(time * 0.5) * 400;
  pointLight1.position.z = Math.cos(time * 0.5) * 400;

  controls.update();
  composer.render();
}

animate();
console.log('🌌 Galaksi siap!');
