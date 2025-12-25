import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const groundGeometry = new THREE.PlaneGeometry(10, 10);
const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const pyramidGeometry = new THREE.ConeGeometry(1, 2, 3);
const pyramidMaterial = new THREE.MeshLambertMaterial({ color: 0xFF6347 });
const pyramid = new THREE.Mesh(pyramidGeometry, pyramidMaterial);
pyramid.position.set(-2, 1, 0);
pyramid.castShadow = true;
scene.add(pyramid);

const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const canvas = document.createElement('canvas');
canvas.width = 256;
canvas.height = 256;
const context = canvas.getContext('2d');
context.fillStyle = '#8B4513';
context.fillRect(0, 0, 256, 256);
context.fillStyle = '#654321';
for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
        if ((i + j) % 2 === 0) {
            context.fillRect(i * 64, j * 64, 64, 64);
        }
    }
}
context.strokeStyle = '#000000';
context.lineWidth = 2;
for (let i = 0; i <= 4; i++) {
    context.beginPath();
    context.moveTo(i * 64, 0);
    context.lineTo(i * 64, 256);
    context.stroke();
    context.beginPath();
    context.moveTo(0, i * 64);
    context.lineTo(256, i * 64);
    context.stroke();
}
const cubeTexture = new THREE.CanvasTexture(canvas);
const cubeMaterial = new THREE.MeshLambertMaterial({ map: cubeTexture });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.set(2, 0.5, 0);
cube.castShadow = true;
scene.add(cube);

const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const sphereMaterial = new THREE.MeshLambertMaterial({ color: 0x4169E1 });
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.set(0, 0.5, -2);
sphere.castShadow = true;
scene.add(sphere);

const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xff0000, 1, 10);
pointLight.position.set(-2, 3, 2);
pointLight.castShadow = true;
scene.add(pointLight);

const spotLight = new THREE.SpotLight(0x00ff00, 1);
spotLight.position.set(0, 5, 0);
spotLight.target.position.set(0, 0, 0);
spotLight.castShadow = true;
spotLight.angle = Math.PI / 6;
spotLight.penumbra = 0.1;
scene.add(spotLight);
scene.add(spotLight.target);

const controlsDiv = document.createElement('div');
controlsDiv.style.position = 'absolute';
controlsDiv.style.top = '10px';
controlsDiv.style.left = '10px';
controlsDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
controlsDiv.style.color = 'white';
controlsDiv.style.padding = '15px';
controlsDiv.style.borderRadius = '8px';
controlsDiv.style.fontFamily = 'Arial, sans-serif';
controlsDiv.style.zIndex = '1000';

controlsDiv.innerHTML = `
  <h3 style="margin: 0 0 10px 0;">Управление сценой</h3>

  <label>Интенсивность направленного света: <span id="dirIntensityValue">1.0</span></label><br>
  <input type="range" id="dirIntensity" min="0" max="2" step="0.1" value="1.0"><br><br>

  <label>Цвет направленного света:</label><br>
  <input type="color" id="dirColor" value="#ffffff"><br><br>

  <label>Интенсивность точечного света: <span id="pointIntensityValue">1.0</span></label><br>
  <input type="range" id="pointIntensity" min="0" max="2" step="0.1" value="1.0"><br><br>

  <label>Цвет точечного света:</label><br>
  <input type="color" id="pointColor" value="#ff0000"><br><br>

  <label>Цвет пирамиды:</label><br>
  <input type="color" id="pyramidColor" value="#FF6347"><br><br>

  <label>Цвет сферы:</label><br>
  <input type="color" id="sphereColor" value="#4169E1"><br><br>
`;

document.body.appendChild(controlsDiv);
document.getElementById('dirIntensity').addEventListener('input', function (e) {
    directionalLight.intensity = parseFloat(e.target.value);
    document.getElementById('dirIntensityValue').textContent = e.target.value;
});

document.getElementById('dirColor').addEventListener('input', function (e) {
    directionalLight.color.setStyle(e.target.value);
});

document.getElementById('pointIntensity').addEventListener('input', function (e) {
    pointLight.intensity = parseFloat(e.target.value);
    document.getElementById('pointIntensityValue').textContent = e.target.value;
});

document.getElementById('pointColor').addEventListener('input', function (e) {
    pointLight.color.setStyle(e.target.value);
});

document.getElementById('pyramidColor').addEventListener('input', function (e) {
    pyramidMaterial.color.setStyle(e.target.value);
});

document.getElementById('sphereColor').addEventListener('input', function (e) {
    sphereMaterial.color.setStyle(e.target.value);
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});