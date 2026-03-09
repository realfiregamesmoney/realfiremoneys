import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// GAME STATE
let score = 0;
let health = 100;
let gameOver = false;
let gameStarted = false;
let gameSpeed = 50; // Units per second
let currentLevel = 1;
let weaponLevel = 1; // Up to 3
const clock = new THREE.Clock();

// SOUND SYSTEM (Web Audio API for lightweight no-load sounds)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'laser') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'explosion') {
        osc.type = 'triangle'; // Simulating sub-bass thump
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'powerup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.1);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    }
}

// SCENE SETUP
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x151821, 0.012); // Lighter, thinner fog for visibility

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, -20);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Lightweight
renderer.shadowMap.enabled = true; // Light shadow for cinematic effect
renderer.shadowMap.type = THREE.BasicShadowMap;
document.body.appendChild(renderer.domElement);
scene.background = new THREE.Color(0x151821); // Lighter sky color

// POST-PROCESSING (Cinematic Aesthetic)
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Lightweight Bloom: High Threshold to only bloom bright neon/fires, reducing load.
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,  // strength
    0.4,  // radius
    0.75  // threshold
);
composer.addPass(bloomPass);

// LIGHTS
const ambientLight = new THREE.AmbientLight(0x2a2d3b); // Brighter ambient
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0x90a8d6, 1.2); // Stronger Moonlight
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

const pointLight = new THREE.PointLight(0xff5500, 2, 50); // Fire / Explosion orange
pointLight.position.set(0, 2, 0);
scene.add(pointLight);

// CINEMATIC AESTHETIC LIGHT
const dirLight2 = new THREE.DirectionalLight(0xff3300, 0.4); // Reddish glow from a side
dirLight2.position.set(-10, 5, -10);
scene.add(dirLight2);

// PLAYER
const playerBox = new THREE.Box3();
let player = new THREE.Group();
player.position.set(0, 1, 0);
scene.add(player);

let mixer; // For animations

const loader = new GLTFLoader();
loader.load('/models/player.glb', (gltf) => {
    const model = gltf.scene;
    // Tweak model scale and positioning to fit the game scale
    model.scale.set(1.5, 1.5, 1.5);
    model.position.y = -1; // Align feet with grid

    // Rotate to face forward (away from camera)
    model.rotation.y = Math.PI;

    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    player.add(model);

    // Play default animation (running/idle)
    if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(gltf.animations[0]);
        action.play();
    }
}, undefined, (error) => {
    console.error('An error occurred loading the model', error);
    // Fallback cone if load fails
    const fallbackGeo = new THREE.ConeGeometry(1, 4, 4);
    fallbackGeo.rotateX(Math.PI / 2);
    const fallbackMat = new THREE.MeshPhongMaterial({ color: 0x00ffff });
    const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
    player.add(fallbackMesh);
});

// ZOMBIE (ENEMY)
let zumbiModelBase = null;
let zumbiAnimations = null;

loader.load('/models/zumbi.glb', (gltf) => {
    zumbiModelBase = gltf.scene;
    zumbiAnimations = gltf.animations;

    zumbiModelBase.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
}, undefined, (error) => {
    console.error('Error loading zombie model:', error);
});

// CINEMATIC RUINS ENVIRONMENT (Extremely Lightweight using InstancedMesh)

// 1. Dark Wet Road Ground
const groundGeo = new THREE.PlaneGeometry(200, 400);

// Procedural grid texture for the floor to fake detail
const fCanvas = document.createElement('canvas');
fCanvas.width = 128; fCanvas.height = 128;
const fCtx = fCanvas.getContext('2d');
fCtx.fillStyle = '#0f1115';
fCtx.fillRect(0, 0, 128, 128);
fCtx.strokeStyle = '#222530';
fCtx.lineWidth = 1;
fCtx.strokeRect(0, 0, 128, 128);
const floorTex = new THREE.CanvasTexture(fCanvas);
floorTex.wrapS = THREE.RepeatWrapping;
floorTex.wrapT = THREE.RepeatWrapping;
floorTex.repeat.set(100, 200);

const groundMat = new THREE.MeshStandardMaterial({
    color: 0x181a1f,
    map: floorTex,
    roughness: 0.2, // Smooth, reflective wet asphalt look
    metalness: 0.8  // Reflects city lights
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.5;
ground.receiveShadow = true;
scene.add(ground);

// 2. Instanced Buildings (City Environment)
const buildingCount = 80; // More buildings since it's a city
const ruinGeo = new THREE.BoxGeometry(1, 1, 1);

// Procedural window texture using a JS Canvas (0 internet cost)
const bCanvas = document.createElement('canvas');
bCanvas.width = 256; bCanvas.height = 256;
const bCtx = bCanvas.getContext('2d');
bCtx.fillStyle = '#101216'; // dark wall color
bCtx.fillRect(0, 0, 256, 256);
bCtx.fillStyle = '#ffcf8e'; // warm glowing window light
for (let y = 10; y < 256; y += 35) {
    for (let x = 10; x < 256; x += 25) {
        if (Math.random() > 0.6) { // 40% chance of lit window
            bCtx.shadowBlur = 10;
            bCtx.shadowColor = '#ffcf8e';
            bCtx.fillRect(x, y, 15, 20);
        }
    }
}
const windowTexture = new THREE.CanvasTexture(bCanvas);
windowTexture.wrapS = THREE.RepeatWrapping;
windowTexture.wrapT = THREE.RepeatWrapping;

const coords = ruinGeo.attributes.uv.array;
for (let i = 0; i < coords.length; i += 2) {
    coords[i] *= 4; // Repeat horizontally
    coords[i + 1] *= 10; // Repeat vertically
}

const ruinMat = new THREE.MeshPhongMaterial({
    color: 0xffffff, // White to let texture color show
    map: windowTexture,
    flatShading: true,
    shininess: 30
});
const ruinInstancedMesh = new THREE.InstancedMesh(ruinGeo, ruinMat, buildingCount);
ruinInstancedMesh.castShadow = true;
ruinInstancedMesh.receiveShadow = true;

const dummy = new THREE.Object3D();
const ruinData = [];

for (let i = 0; i < buildingCount; i++) {
    const zOffset = -Math.random() * 400 + 50;

    // Align buildings strictly to the left or right side like a city street
    const isRightSide = Math.random() > 0.5;
    const xOffset = isRightSide ? (15 + Math.random() * 10) : -(15 + Math.random() * 10);

    // Taller sizes to look like city skyscrapers or big blocks
    const sX = 8 + Math.random() * 10;
    const sY = 15 + Math.random() * 35; // Tall buildings
    const sZ = 8 + Math.random() * 10;

    dummy.position.set(xOffset, sY / 2 - 1.5, zOffset);
    dummy.scale.set(sX, sY, sZ);
    // Align them parallel to the street (0 or 90 degrees essentially)
    dummy.rotation.y = Math.random() > 0.5 ? 0 : Math.PI / 2;
    dummy.updateMatrix();

    ruinInstancedMesh.setMatrixAt(i, dummy.matrix);

    ruinData.push({
        x: dummy.position.x,
        y: dummy.position.y,
        z: zOffset,
        sX, sY, sZ,
        rotY: dummy.rotation.y
    });
}
scene.add(ruinInstancedMesh);

// ARRAYS
const lasers = [];
const enemies = [];
const particles = [];
const powerUps = [];

// AMBIENT DUST / ATMOSPHERE
const dustGeo = new THREE.BufferGeometry();
const dustCount = 400; // Lightweight points
const dustPos = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount * 3; i += 3) {
    dustPos[i] = (Math.random() - 0.5) * 100;
    dustPos[i + 1] = Math.random() * 20;
    dustPos[i + 2] = (Math.random() - 0.5) * 100;
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dustMat = new THREE.PointsMaterial({ color: 0x7c9bc3, size: 0.15, transparent: true, opacity: 0.6 });
const dustPoints = new THREE.Points(dustGeo, dustMat);
scene.add(dustPoints);

// SPAWNERS
let enemySpawnTimer = 0;
const enemySpawnRate = 0.5; // Seconds

// CONTROLS
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    a: false,
    A: false,
    d: false,
    D: false,
    " ": false // Space
};

let touchX = null;
let isTouching = false;
let lastShotTime = 0;

window.addEventListener('touchstart', (e) => {
    if (gameOver && e.touches.length > 0) {
        resetGame();
        return;
    }
    isTouching = true;
    touchX = e.touches[0].clientX;
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (!isTouching || gameOver) return;
    e.preventDefault(); // Prevent scrolling
    const newTouchX = e.touches[0].clientX;
    const deltaX = newTouchX - touchX;

    // Convert screen delta to world delta roughly
    player.position.x += deltaX * 0.06;
    player.position.x = Math.max(-safeClampX, Math.min(safeClampX, player.position.x)); // Clamp immediately during touch scroll
    touchX = newTouchX;
}, { passive: false });

window.addEventListener('touchend', () => {
    isTouching = false;
});

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key) || Object.keys(keys).some(k => k.toLowerCase() === e.key.toLowerCase())) {
        keys[e.key.toLowerCase()] = true;
    }
    if (e.key === 'r' || e.key === 'R') resetGame();
    if (e.key === " " && !gameOver) shootLaser();
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key.toLowerCase()] = false;
    }
});

// Helper var to dynamically limit movement based on screen width
let safeClampX = 6.0;

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);

    // Dynamically constrain the player so they can't hide off-screen on narrow mobile devices
    if (window.innerWidth < 600) {
        safeClampX = 4.0; // Very tight clamp for vertical mobile screens
        camera.position.set(0, 5, 10); // Standard close-up mobile cam
    } else {
        safeClampX = 7.0; // Moderate clamp for standard screens
        camera.position.set(0, 6.5, 16); // Pull camera higher and further back on PC so player is visible
    }
    camera.lookAt(0, 0, -20); // Re-focus down the street
});
// Trigger once to set initial clamp
window.dispatchEvent(new Event('resize'));

// UI ELEMENTS
const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const levelEl = document.getElementById('level');
const gameOverEl = document.getElementById('gameover');
const finalScoreEl = document.getElementById('final-score');
const startScreenEl = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');

startBtn.addEventListener('click', () => {
    startScreenEl.style.display = 'none';
    scoreEl.style.display = 'block';
    healthEl.style.display = 'block';
    levelEl.style.display = 'block';
    gameStarted = true;
    resetGame();
});

// FUNCTIONS
function shootLaser() {
    playSound('laser');
    const fireSingle = (offsetX) => {
        const laserGeo = new THREE.CylinderGeometry(0.1 + (weaponLevel * 0.05), 0.1 + (weaponLevel * 0.05), 2, 8);
        laserGeo.rotateX(Math.PI / 2);

        let hexColor = 0x00ffff;
        if (weaponLevel === 2) hexColor = 0x00ff00;
        if (weaponLevel >= 3) hexColor = 0xff00ff;

        const laserMat = new THREE.MeshBasicMaterial({ color: hexColor });
        const laser = new THREE.Mesh(laserGeo, laserMat);

        laser.position.copy(player.position);
        laser.position.x += offsetX;
        laser.position.z -= 2;
        scene.add(laser);
        lasers.push({ root: laser, box: new THREE.Box3(), damage: weaponLevel });
    };

    if (weaponLevel === 1) {
        fireSingle(0);
    } else if (weaponLevel === 2) {
        fireSingle(-0.4);
        fireSingle(0.4);
    } else {
        fireSingle(-0.6);
        fireSingle(0);
        fireSingle(0.6);
    }
}

function spawnPowerUp() {
    const puGroup = new THREE.Group();

    // Outer floating gem
    const puGeo = new THREE.IcosahedronGeometry(0.6, 0);
    const puMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true });
    const puMesh = new THREE.Mesh(puGeo, puMat);
    puGroup.add(puMesh);

    // Inner glowing core
    const coreGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    puGroup.add(coreMesh);

    const light = new THREE.PointLight(0xff00ff, 2, 10);
    puGroup.add(light);

    const x = (Math.random() - 0.5) * (safeClampX * 2);
    puGroup.position.set(x, 1.5, -120);

    scene.add(puGroup);
    powerUps.push({ root: puGroup, box: new THREE.Box3() });
}

function spawnEnemy() {
    const isBig = Math.random() > 0.8;
    const size = isBig ? 3 : 1.5;

    const enemy = new THREE.Group();
    let zMixer = null;

    if (zumbiModelBase) {
        const zumbiClone = SkeletonUtils.clone(zumbiModelBase);
        // Adjust size to match the original game's scaling needs
        zumbiClone.scale.set(size * 0.8, size * 0.8, size * 0.8);
        zumbiClone.position.y = -size / 2; // align to floor roughly

        // Face the player
        zumbiClone.rotation.y = 0;

        enemy.add(zumbiClone);

        if (zumbiAnimations && zumbiAnimations.length > 0) {
            zMixer = new THREE.AnimationMixer(zumbiClone);
            zMixer.clipAction(zumbiAnimations[0]).play();
        }
    } else {
        // Fallback if zombie isn't loaded yet
        const enemyGeo = new THREE.IcosahedronGeometry(size, 0);
        const enemyMat = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xaa0000,
            flatShading: true
        });
        const mesh = new THREE.Mesh(enemyGeo, enemyMat);
        enemy.add(mesh);
    }

    // Spawn purely within the player's safe clamp width limit to guarantee we can hit them
    const x = (Math.random() - 0.5) * (safeClampX * 2);
    enemy.position.set(x, size / 2, -100);

    if (isBig) {
        const light = new THREE.PointLight(0xff0000, 1, 20);
        enemy.add(light);
    }

    // CREATE HEALTH BAR
    const hpBarGeo = new THREE.PlaneGeometry(size * 0.4, 0.08);
    const hpBarMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false, transparent: true });
    const hpBar = new THREE.Mesh(hpBarGeo, hpBarMat);
    hpBar.position.y = size + 0.2; // Hover above enemy head
    enemy.add(hpBar);

    scene.add(enemy);
    enemies.push({
        root: enemy,
        hp: isBig ? 5 : 2,
        maxHp: isBig ? 5 : 2,
        hpBar: hpBar,
        box: new THREE.Box3(),
        mixer: zMixer
    });
}

function createExplosion(pos, color) {
    const pCount = 20;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(pCount * 3);
    const velocities = [];

    for (let i = 0; i < pCount; i++) {
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
        velocities.push(
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 30
        );
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: color, size: 0.5 });
    const pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);
    particles.push({ root: pointCloud, vels: velocities, life: 1.0 });
}

function resetGame() {
    gameOver = false;
    gameStarted = true;
    score = 0;
    health = 100;
    gameSpeed = 50;
    currentLevel = 1;
    weaponLevel = 1;
    player.position.x = 0;

    enemies.forEach(e => scene.remove(e.root));
    enemies.length = 0;
    lasers.forEach(l => scene.remove(l.root));
    lasers.length = 0;
    particles.forEach(p => scene.remove(p.root));
    particles.length = 0;
    powerUps.forEach(p => scene.remove(p.root));
    powerUps.length = 0;

    gameOverEl.style.display = 'none';
    updateUI();
}

function updateUI() {
    scoreEl.innerText = `Pontos: ${score}`;
    healthEl.innerText = `Vida: ${health}`;
    levelEl.innerText = `Nv. ${currentLevel}`;
    if (health <= 0) {
        gameOver = true;
        gameOverEl.style.display = 'block';
        finalScoreEl.innerText = score;
    }
}

function calculateLevelAndDifficulty() {
    let newLevel = 1;
    if (score >= 500) {
        newLevel = Math.floor((score - 500) / 1000) + 2;
    }

    if (newLevel !== currentLevel) {
        currentLevel = newLevel;
    }

    // Apply difficulty strictly based on current level
    let targetSpeed = 50 + (currentLevel - 1) * 8; // Smoother base logic

    if (currentLevel >= 10) {
        targetSpeed += (currentLevel - 9) * 20; // Major spike in difficulty moved to >= 10
    }
    gameSpeed = Math.min(220, targetSpeed);
}

// GAME LOOP
function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();

    // Update character animation
    if (mixer) {
        mixer.update(dt);
    }

    if (!gameStarted) {
        // Render holding screen and pull camera back specifically on PC to see character waiting
        if (window.innerWidth >= 600) {
            camera.position.set(0, 6.5, 16);
            camera.lookAt(0, 0, -20);
        }
    } else if (!gameOver) {
        // Player Movement
        const speed = 30;
        if (keys.arrowleft || keys.a) player.position.x -= speed * dt;
        if (keys.arrowright || keys.d) player.position.x += speed * dt;

        // Clamp player
        player.position.x = Math.max(-safeClampX, Math.min(safeClampX, player.position.x));

        // Banking effect
        let targetRotationZ = 0;
        if (keys.arrowright || keys.d) targetRotationZ = -1;
        else if (keys.arrowleft || keys.a) targetRotationZ = 1;

        // Mobile banking effect based on touch drag
        if (isTouching) {
            targetRotationZ = 0; // Simple center when just touching, or could calculate delta
        }

        player.rotation.z += (targetRotationZ * 0.5 - player.rotation.z) * 10 * dt;

        playerBox.setFromCenterAndSize(
            new THREE.Vector3(player.position.x, 1.5, player.position.z),
            new THREE.Vector3(1.8, 3, 1.8) // Width, Height, Depth
        );

        // Auto shoot on mobile
        if (isTouching && clock.getElapsedTime() - lastShotTime > 0.15) {
            shootLaser();
            lastShotTime = clock.getElapsedTime();
        }

        // Cinematic Ruin Scrolling
        for (let i = 0; i < buildingCount; i++) {
            const r = ruinData[i];
            r.z += gameSpeed * dt;
            if (r.z > 50) {
                // Recycle to back
                r.z -= 300;
                r.x = (Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 30);
            }

            dummy.position.set(r.x, r.y, r.z);
            dummy.scale.set(r.sX, r.sY, r.sZ);
            dummy.rotation.y = r.rotY;
            dummy.updateMatrix();
            ruinInstancedMesh.setMatrixAt(i, dummy.matrix);
        }
        ruinInstancedMesh.instanceMatrix.needsUpdate = true;

        // Ambient dust scrolling
        const dPos = dustPoints.geometry.attributes.position.array;
        for (let i = 2; i < dustCount * 3; i += 3) {
            dPos[i] += gameSpeed * 0.4 * dt;
            if (dPos[i] > 50) dPos[i] -= 100;
        }
        dustPoints.geometry.attributes.position.needsUpdate = true;

        // Spawn Enemies
        calculateLevelAndDifficulty(); // Update level and difficulty if score changed

        enemySpawnTimer -= dt;
        if (enemySpawnTimer <= 0) {
            spawnEnemy();

            // Very rare chance to spawn weapon upgrade
            let canSpawnUpgrade = false;
            // Nv 2 weapon upgrade only available >= Nv. 5
            if (weaponLevel === 1 && currentLevel >= 5) canSpawnUpgrade = true;
            // Nv 3 weapon upgrade only available >= Nv. 10
            if (weaponLevel === 2 && currentLevel >= 10) canSpawnUpgrade = true;

            if (canSpawnUpgrade && Math.random() < 0.03) {
                spawnPowerUp();
            }

            // Enemy spawns faster as level goes up
            let dynamicRate = enemySpawnRate * Math.max(0.15, 1.0 - (currentLevel * 0.12));
            enemySpawnTimer = dynamicRate;
        }

        // Update Lasers
        for (let i = lasers.length - 1; i >= 0; i--) {
            const l = lasers[i];
            l.root.position.z -= 150 * dt;
            l.box.setFromObject(l.root);
            // Expand the hitbox backwards along Z to prevent physics tunneling at high speeds
            l.box.max.z += 5.0;
            l.box.min.z -= 5.0;
            l.box.max.x += 1.0;
            l.box.min.x -= 1.0;

            if (l.root.position.z < -120) {
                scene.remove(l.root);
                lasers.splice(i, 1);
            }
        }

        // Update Powerups
        for (let i = powerUps.length - 1; i >= 0; i--) {
            const pu = powerUps[i];
            pu.root.position.z += gameSpeed * dt;

            // Spin it
            pu.root.rotation.x += dt * 3;
            pu.root.rotation.y += dt * 3;

            pu.box.setFromObject(pu.root);

            if (pu.root.position.z > 20) {
                scene.remove(pu.root);
                powerUps.splice(i, 1);
                continue;
            }

            // Collision with player
            if (pu.box.intersectsBox(playerBox)) {
                if (weaponLevel < 3) weaponLevel++;
                playSound('powerup');
                createExplosion(player.position, 0xffffff); // White flash for upgrade
                scene.remove(pu.root);
                powerUps.splice(i, 1);
            }
        }

        // Update Enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            e.root.position.z += gameSpeed * dt;

            if (e.mixer) {
                e.mixer.update(dt);
            } else if (!zumbiModelBase) {
                // Rotate fallback ball
                e.root.rotation.x += dt;
                e.root.rotation.y += dt;
            }

            e.box.setFromObject(e.root);

            if (e.root.position.z > 20) {
                scene.remove(e.root);
                enemies.splice(i, 1);
                continue;
            }

            // Laser Collision
            let dead = false;
            for (let j = lasers.length - 1; j >= 0; j--) {
                const l = lasers[j];
                if (e.box.intersectsBox(l.box)) {
                    e.hp -= (l.damage || 1);

                    // Update health bar visually
                    e.hpBar.scale.x = Math.max(0, e.hp / e.maxHp);
                    if (e.hp / e.maxHp <= 0.4) {
                        e.hpBar.material.color.setHex(0xff0000); // Turns red when low
                    } else if (e.hp / e.maxHp <= 0.7) {
                        e.hpBar.material.color.setHex(0xffff00); // Turns yellow
                    }

                    scene.remove(l.root);
                    lasers.splice(j, 1);
                    createExplosion(l.root.position, 0x00ffff);

                    if (e.hp <= 0) {
                        dead = true;
                        score += (e.maxHp >= 5 ? 50 : 10); // 50 points for big, 10 for small
                        updateUI();
                        playSound('explosion');
                        createExplosion(e.root.position, 0xff0000);
                        scene.remove(e.root);
                        enemies.splice(i, 1);
                    } else {
                        playSound('hit');
                    }
                    break;
                }
            }
            if (dead) continue;

            // Player Collision
            if (e.box.intersectsBox(playerBox)) {
                const damage = e.maxHp >= 5 ? 10 : 5;
                health -= damage;

                updateUI();
                playSound('hit');
                createExplosion(player.position, 0xff0000); // Red explosion for damage
                scene.remove(e.root);
                enemies.splice(i, 1);
            }
        }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt * 2;
        if (p.life <= 0) {
            scene.remove(p.root);
            particles.splice(i, 1);
            continue;
        }

        const pos = p.root.geometry.attributes.position.array;
        for (let j = 0; j < pos.length; j += 3) {
            pos[j] += p.vels[j] * dt;
            pos[j + 1] += p.vels[j + 1] * dt;
            pos[j + 2] += p.vels[j + 2] * dt;
        }
        p.root.geometry.attributes.position.needsUpdate = true;
        p.root.material.opacity = p.life;
        p.root.material.transparent = true;
    }

    composer.render();
}

animate();
