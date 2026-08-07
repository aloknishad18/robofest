import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { updateHUD } from './hud.js';

export let scene, camera, renderer, controls, robotModel;
export let initialCameraPosition = new THREE.Vector3();
export let initialTargetPosition = new THREE.Vector3();

export function getModel() {
    return robotModel;
}

export function getScene() {
    return scene;
}

export function initViewer() {
    const container = document.getElementById('canvas-container');

    scene = new THREE.Scene();
    
    // Camera - Will be animated into final position on load
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    // Start camera far away for the load animation
    camera.position.set(10, 8, 12); 

    // Renderer (High Quality)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // High res but capped for performance
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3; // Increased brightness
    container.appendChild(renderer.domElement);

    // Premium Environment Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Prevent going too far below ground
    controls.minDistance = 1;
    controls.maxDistance = 15;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.target.set(0, 0, 0);

    setupLighting();
    loadModel();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}

function setupLighting() {
    // Professional Studio Lighting Setup
    
    // 1. Hemisphere Light (Soft ambient from sky/ground)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    // 2. Main Key Light (Casts soft shadows)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    // 3. Fill Light (Softens harsh shadows on the opposite side)
    const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    // 4. Subtle Glowing Blue Rim Light (Separates robot from black background)
    const rimLight = new THREE.SpotLight(0x00C2FF, 4.0);
    rimLight.position.set(0, 5, -8);
    rimLight.angle = Math.PI / 4;
    rimLight.penumbra = 0.5;
    rimLight.lookAt(0, 0, 0);
    scene.add(rimLight);
}

function loadModel() {
    const loader = new GLTFLoader();
    
    loader.load(
        'assets/models/agribot.glb',
        (gltf) => {
            robotModel = gltf.scene;
            setupModel(robotModel);
            document.dispatchEvent(new Event('modelLoaded'));
        },
        (xhr) => {
            const percent = Math.round((xhr.loaded / xhr.total) * 100) || 0;
            document.dispatchEvent(new CustomEvent('modelProgress', { detail: percent }));
        },
        (error) => {
            console.warn("Model failed to load, creating premium placeholder.", error);
            createPlaceholderModel();
            document.dispatchEvent(new Event('modelLoaded'));
        }
    );
}

function setupModel(model) {
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Fix: Preserve exact original materials (do not override)
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        mat.envMapIntensity = 1.0;
                        mat.needsUpdate = true;
                    });
                    child.userData.originalMaterial = child.material.map(m => m.clone());
                } else {
                    child.material.envMapIntensity = 1.0; 
                    child.material.needsUpdate = true;
                    child.userData.originalMaterial = child.material.clone();
                }
            }
        }
    });

    // 1. Calculate Bounding Box of original model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    
    // 2. Fix CAD Z-up to Three.js Y-up orientation
    // This rotates the model so it stands upright and the front faces the camera
    model.rotation.set(-Math.PI / 2, 0, 0); 
    
    // 3. Center the model at 0,0,0
    model.position.sub(center);
    
    // 4. Scale model up by 50%
    model.scale.set(1.5, 1.5, 1.5);

    // 5. Re-calculate bounding box after scaling and rotating
    const scaledBox = new THREE.Box3().setFromObject(model);
    const scaledSize = scaledBox.getSize(new THREE.Vector3());
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

    // 6. Rest model exactly on the ground plane (Y=0)
    model.position.y += (scaledSize.y / 2) - scaledCenter.y;

    scene.add(model);
    
    // 7. Calculate camera distance to occupy ~70% of the viewport height
    const maxDim = Math.max(scaledSize.x, scaledSize.y, scaledSize.z);
    const fov = camera.fov * (Math.PI / 180);
    let baseDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    let targetDistance = baseDistance / 0.70; // Scale to 70% of view
    
    // 8. Position camera 15-20 degrees downward facing the front (+Z)
    const angleDown = 18 * (Math.PI / 180); // 18 degrees downward
    const targetY = scaledSize.y * 0.4; // Target slightly below center to emphasize the mast

    initialTargetPosition.copy(new THREE.Vector3(0, targetY, 0));
    
    initialCameraPosition.copy(new THREE.Vector3(
        0, // Centered horizontally
        targetY + (Math.sin(angleDown) * targetDistance), // Height based on angle
        Math.cos(angleDown) * targetDistance // Distance pushed back on Z axis
    ));
    
    controls.target.copy(initialTargetPosition);
    controls.update();

}

function createPlaceholderModel() {
    robotModel = new THREE.Group();
    
    const matBody = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.8 });
    const matAccent = new THREE.MeshStandardMaterial({ color: 0x00C2FF, roughness: 0.1, metalness: 0.9 });
    const matTire = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9, metalness: 0.1 });
    
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1), matBody);
    chassis.name = 'Chassis'; chassis.position.y = 0.5; robotModel.add(chassis);

    const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 32); wheelGeo.rotateZ(Math.PI / 2);
    [[0.55,0.2,0.4],[-0.55,0.2,0.4],[0.55,0.2,-0.4],[-0.55,0.2,-0.4]].forEach((pos,i) => {
        const w = new THREE.Mesh(wheelGeo, matTire); w.name = 'Wheel_'+i; w.position.set(...pos); robotModel.add(w);
    });

    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), matBody);
    mast.name = 'Mast'; mast.position.set(0, 1.3, -0.3); robotModel.add(mast);

    const cam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.15), matAccent);
    cam.name = 'Camera_Top'; cam.position.set(0, 1.75, -0.3); robotModel.add(cam);

    scene.add(robotModel);
    setupModel(robotModel);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (controls) controls.update();
    
    updateHUD(); // Constantly project 3D to 2D for HUD labels
    
    renderer.render(scene, camera);
}
