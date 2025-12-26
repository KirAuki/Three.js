import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

class ModelManager {
    constructor(scene, camera, renderer, controls) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = controls;
        this.models = [];
        this.selectedModel = null;
        this.transformControls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.initTransformControls();
        this.initLoaders();
        this.initEventListeners();
    }

    initTransformControls() {
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControls.setMode('translate');
        this.transformControls.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
        });
        this.transformControls.addEventListener('objectChange', () => {
            this.updateUI();
        });
        this.scene.add(this.transformControls);
    }

    initLoaders() {
        this.loaders = {
            gltf: new GLTFLoader(),
            obj: new OBJLoader(),
            stl: new STLLoader()
        };
    }

    initEventListeners() {
        this.renderer.domElement.addEventListener('click', (event) => {
            this.onMouseClick(event);
        });
    }

    onMouseClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.models, true);

        if (intersects.length > 0) {
            const clickedObject = this.findModelByMesh(intersects[0].object);
            this.selectModel(clickedObject);
        } else {
            this.deselectModel();
        }
    }

    findModelByMesh(mesh) {
        let directMatch = this.models.find(model => model.object === mesh);
        if (directMatch) return directMatch;

        let current = mesh;
        while (current.parent && current.parent !== this.scene) {
            current = current.parent;
            let modelMatch = this.models.find(model => model.object === current);
            if (modelMatch) return modelMatch;
        }

        for (let model of this.models) {
            if (this.isDescendantOf(mesh, model.object)) {
                return model;
            }
        }

        return null;
    }

    isDescendantOf(child, parent) {
        let current = child;
        while (current) {
            if (current === parent) return true;
            current = current.parent;
        }
        return false;
    }

    selectModel(model) {
        if (this.selectedModel === model) return;

        this.deselectModel();
        this.selectedModel = model;

        if (model) {
            this.transformControls.attach(model.object);
            this.updateUI();
            if (window.uiManager) {
                window.uiManager.updateTransformControls();
            }
        }
    }

    deselectModel() {
        if (this.selectedModel) {
            this.transformControls.detach();
            this.selectedModel = null;
            if (window.uiManager) {
                window.uiManager.updateTransformControls();
            }
        }
    }

    async loadModel(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        const url = URL.createObjectURL(file);

        try {
            let object;

            switch (extension) {
                case 'gltf':
                case 'glb':
                    object = await this.loadGLTF(url);
                    break;
                case 'obj':
                    object = await this.loadOBJ(url);
                    break;
                case 'stl':
                    object = await this.loadSTL(url);
                    break;
                default:
                    throw new Error(`Неподдерживаемый формат файла: ${extension}. Поддерживаемые форматы: GLTF, GLB, OBJ, STL`);
            }

            const model = {
                object: object,
                name: file.name,
                id: Date.now()
            };

            this.models.push(model);
            this.scene.add(object);
            this.selectModel(model);

            if (window.uiManager) {
                window.uiManager.updateObjectList();
            }

        } catch (error) {
            console.error('Error loading model:', error);
            alert(`Ошибка загрузки модели: ${error.message}`);
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    loadGLTF(url) {
        return new Promise((resolve, reject) => {
            this.loaders.gltf.load(
                url,
                (gltf) => resolve(gltf.scene),
                undefined,
                reject
            );
        });
    }

    loadOBJ(url) {
        return new Promise((resolve, reject) => {
            this.loaders.obj.load(
                url,
                resolve,
                undefined,
                reject
            );
        });
    }

    loadSTL(url) {
        return new Promise((resolve, reject) => {
            this.loaders.stl.load(
                url,
                (geometry) => {
                    const material = new THREE.MeshLambertMaterial({ color: 0x888888 });
                    const mesh = new THREE.Mesh(geometry, material);
                    resolve(mesh);
                },
                undefined,
                reject
            );
        });
    }

    updateUI() {
        if (window.uiManager && this.selectedModel) {
            window.uiManager.updateTransformControls();
        }
    }

    removeModel(model) {
        if (model === this.selectedModel) {
            this.deselectModel();
        }

        this.scene.remove(model.object);
        this.models = this.models.filter(m => m !== model);

        if (window.uiManager) {
            window.uiManager.updateObjectList();
        }
    }

    getSelectedModel() {
        return this.selectedModel;
    }

    getModels() {
        return this.models;
    }
}

class UIManager {
    constructor(modelManager, lights, materials) {
        this.modelManager = modelManager;
        this.lights = lights;
        this.materials = materials;
        this.controlsDiv = null;
        this.initUI();
    }

    initUI() {
        this.createMainUI();
        this.setupDragAndDrop();
    }

    createMainUI() {
        this.controlsDiv = document.createElement('div');
        this.controlsDiv.style.position = 'absolute';
        this.controlsDiv.style.top = '10px';
        this.controlsDiv.style.left = '10px';
        this.controlsDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.controlsDiv.style.color = 'white';
        this.controlsDiv.style.padding = '15px';
        this.controlsDiv.style.borderRadius = '8px';
        this.controlsDiv.style.fontFamily = 'Arial, sans-serif';
        this.controlsDiv.style.zIndex = '1000';
        this.controlsDiv.style.maxWidth = '300px';
        this.controlsDiv.style.maxHeight = '80vh';
        this.controlsDiv.style.overflowY = 'auto';

        this.controlsDiv.innerHTML = `
            <h3 style="margin: 0 0 15px 0;">Управление сценой</h3>

            <div style="margin-bottom: 15px;">
                <h4 style="margin: 5px 0;">Загрузка моделей</h4>
                <p style="font-size: 12px; color: #ccc; margin: 5px 0;">
                    Поддерживаемые форматы: <strong>GLTF/GLB</strong>, <strong>OBJ</strong>, <strong>STL</strong>
                </p>
                <input type="file" id="modelFileInput" accept=".gltf,.glb,.obj,.stl" multiple style="margin-bottom: 10px; width: 100%;"><br>
                <div id="dropZone" style="border: 2px dashed #666; padding: 20px; text-align: center; margin-bottom: 15px; border-radius: 5px;">
                    Перетащите файлы моделей сюда<br>
                    <small style="color: #ccc;">Форматы: GLTF, OBJ, STL</small>
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <h4 style="margin: 5px 0;">Объекты сцены</h4>
                <select id="objectList" size="5" style="width: 100%; margin-bottom: 10px;"></select>
                <button id="removeModelBtn" style="width: 100%; padding: 5px; background: #ff4444; color: white; border: none; border-radius: 3px;">Удалить выбранный</button>
            </div>

            <div id="transformControls" style="display: none; margin-bottom: 15px;">
                <h4 style="margin: 5px 0;">Трансформация</h4>
                <div style="margin-bottom: 10px;">
                    <label>Режим:</label><br>
                    <select id="transformMode">
                        <option value="translate">Перемещение</option>
                        <option value="rotate">Поворот</option>
                        <option value="scale">Масштаб</option>
                    </select>
                </div>

                <div style="margin-bottom: 10px;">
                    <label>Положение:</label><br>
                    X: <input type="number" id="posX" step="0.1" style="width: 60px;">
                    Y: <input type="number" id="posY" step="0.1" style="width: 60px;">
                    Z: <input type="number" id="posZ" step="0.1" style="width: 60px;">
                </div>

                <div style="margin-bottom: 10px;">
                    <label>Поворот (°):</label><br>
                    X: <input type="number" id="rotX" step="1" style="width: 60px;">
                    Y: <input type="number" id="rotY" step="1" style="width: 60px;">
                    Z: <input type="number" id="rotZ" step="1" style="width: 60px;">
                </div>

                <div style="margin-bottom: 10px;">
                    <label>Масштаб:</label><br>
                    X: <input type="number" id="scaleX" step="0.1" min="0.1" style="width: 60px;">
                    Y: <input type="number" id="scaleY" step="0.1" min="0.1" style="width: 60px;">
                    Z: <input type="number" id="scaleZ" step="0.1" min="0.1" style="width: 60px;">
                </div>
            </div>

            <div>
                <h4 style="margin: 5px 0;">Освещение</h4>
                <label>Направленный свет: <span id="dirIntensityValue">1.0</span></label><br>
                <input type="range" id="dirIntensity" min="0" max="2" step="0.1" value="1.0"><br><br>

                <label>Цвет направленного света:</label><br>
                <input type="color" id="dirColor" value="#ffffff"><br><br>

                <label>Точечный свет: <span id="pointIntensityValue">1.0</span></label><br>
                <input type="range" id="pointIntensity" min="0" max="2" step="0.1" value="1.0"><br><br>

                <label>Цвет точечного света:</label><br>
                <input type="color" id="pointColor" value="#ff0000"><br><br>
            </div>

            <div>
                <h4 style="margin: 5px 0;">Цвета фигур</h4>
                <label>Цвет пирамиды:</label><br>
                <input type="color" id="pyramidColor" value="#FF6347"><br><br>

                <label>Цвет сферы:</label><br>
                <input type="color" id="sphereColor" value="#4169E1"><br><br>
            </div>
        `;

        document.body.appendChild(this.controlsDiv);
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('modelFileInput').addEventListener('change', (e) => {
            Array.from(e.target.files).forEach(file => {
                this.modelManager.loadModel(file);
            });
        });

        document.getElementById('objectList').addEventListener('change', (e) => {
            const modelId = parseInt(e.target.value);
            const model = this.modelManager.getModels().find(m => m.id === modelId);
            this.modelManager.selectModel(model);
        });

        document.getElementById('removeModelBtn').addEventListener('click', () => {
            const selectedModel = this.modelManager.getSelectedModel();
            if (selectedModel) {
                const builtInNames = ['Пирамида', 'Куб', 'Сфера'];
                if (builtInNames.includes(selectedModel.name)) {
                    if (confirm(`Встроенный объект "${selectedModel.name}" нельзя удалить. Он является частью базовой сцены.`)) {
                        return;
                    }
                } else {
                    this.modelManager.removeModel(selectedModel);
                }
            }
        });

        document.getElementById('transformMode').addEventListener('change', (e) => {
            this.modelManager.transformControls.setMode(e.target.value);
        });

        ['posX', 'posY', 'posZ', 'rotX', 'rotY', 'rotZ', 'scaleX', 'scaleY', 'scaleZ'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                this.updateModelTransform(id, parseFloat(e.target.value));
            });
        });

        document.getElementById('dirIntensity').addEventListener('input', (e) => {
            this.lights.directionalLight.intensity = parseFloat(e.target.value);
            document.getElementById('dirIntensityValue').textContent = e.target.value;
        });

        document.getElementById('dirColor').addEventListener('input', (e) => {
            this.lights.directionalLight.color.setStyle(e.target.value);
        });

        document.getElementById('pointIntensity').addEventListener('input', (e) => {
            this.lights.pointLight.intensity = parseFloat(e.target.value);
            document.getElementById('pointIntensityValue').textContent = e.target.value;
        });

        document.getElementById('pointColor').addEventListener('input', (e) => {
            this.lights.pointLight.color.setStyle(e.target.value);
        });

        document.getElementById('pyramidColor').addEventListener('input', (e) => {
            this.materials.pyramidMaterial.color.setStyle(e.target.value);
        });

        document.getElementById('sphereColor').addEventListener('input', (e) => {
            this.materials.sphereMaterial.color.setStyle(e.target.value);
        });
    }

    setupDragAndDrop() {
        const dropZone = document.getElementById('dropZone');

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.backgroundColor = 'rgba(100, 100, 100, 0.5)';
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.style.backgroundColor = '';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.backgroundColor = '';

            Array.from(e.dataTransfer.files).forEach(file => {
                const extension = file.name.split('.').pop().toLowerCase();
                if (['gltf', 'glb', 'obj', 'stl'].includes(extension)) {
                    this.modelManager.loadModel(file);
                } else {
                    alert(`Файл ${file.name} имеет неподдерживаемый формат. Поддерживаемые форматы: GLTF, GLB, OBJ, STL`);
                }
            });
        });
    }

    updateObjectList() {
        const objectList = document.getElementById('objectList');
        objectList.innerHTML = '';

        this.modelManager.getModels().forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            if (model === this.modelManager.getSelectedModel()) {
                option.selected = true;
            }
            objectList.appendChild(option);
        });
    }

    updateTransformControls() {
        const transformDiv = document.getElementById('transformControls');
        const selectedModel = this.modelManager.getSelectedModel();

        if (selectedModel) {
            transformDiv.style.display = 'block';

            const pos = selectedModel.object.position;
            const rot = selectedModel.object.rotation;
            const scale = selectedModel.object.scale;

            document.getElementById('posX').value = pos.x.toFixed(1);
            document.getElementById('posY').value = pos.y.toFixed(1);
            document.getElementById('posZ').value = pos.z.toFixed(1);

            document.getElementById('rotX').value = THREE.MathUtils.radToDeg(rot.x).toFixed(0);
            document.getElementById('rotY').value = THREE.MathUtils.radToDeg(rot.y).toFixed(0);
            document.getElementById('rotZ').value = THREE.MathUtils.radToDeg(rot.z).toFixed(0);

            document.getElementById('scaleX').value = scale.x.toFixed(1);
            document.getElementById('scaleY').value = scale.y.toFixed(1);
            document.getElementById('scaleZ').value = scale.z.toFixed(1);

            document.getElementById('transformMode').value = this.modelManager.transformControls.mode;
        } else {
            transformDiv.style.display = 'none';
        }
    }

    updateModelTransform(fieldId, value) {
        const selectedModel = this.modelManager.getSelectedModel();
        if (!selectedModel) return;

        switch (fieldId) {
            case 'posX':
                selectedModel.object.position.x = value;
                break;
            case 'posY':
                selectedModel.object.position.y = value;
                break;
            case 'posZ':
                selectedModel.object.position.z = value;
                break;
            case 'rotX':
                selectedModel.object.rotation.x = THREE.MathUtils.degToRad(value);
                break;
            case 'rotY':
                selectedModel.object.rotation.y = THREE.MathUtils.degToRad(value);
                break;
            case 'rotZ':
                selectedModel.object.rotation.z = THREE.MathUtils.degToRad(value);
                break;
            case 'scaleX':
                selectedModel.object.scale.x = value;
                break;
            case 'scaleY':
                selectedModel.object.scale.y = value;
                break;
            case 'scaleZ':
                selectedModel.object.scale.z = value;
                break;
        }
    }
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.overflow = 'hidden';
document.documentElement.style.overflow = 'hidden';

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

const modelManager = new ModelManager(scene, camera, renderer, controls);
const uiManager = new UIManager(modelManager, {
    directionalLight,
    pointLight,
    spotLight,
    ambientLight
}, {
    pyramidMaterial,
    sphereMaterial
});

window.modelManager = modelManager;
window.uiManager = uiManager;

const builtInModels = [
    { object: pyramid, name: 'Пирамида' },
    { object: cube, name: 'Куб' },
    { object: sphere, name: 'Сфера' }
];

builtInModels.forEach((model, index) => {
    model.id = Date.now() + Math.random() + index;
    modelManager.models.push(model);
});

uiManager.updateObjectList();

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    if (modelManager.transformControls) {
        modelManager.transformControls.update();
    }

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});