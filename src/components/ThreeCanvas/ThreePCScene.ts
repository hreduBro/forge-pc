import * as THREE from 'three';
import { PCBuild, StudioSettings, PCCategory } from '../../types/pc';

interface SceneCallbacks {
  onSelectCategory?: (category: PCCategory) => void;
  onHoverCategory?: (category: PCCategory | null) => void;
}

export type CameraPreset = 'hero' | 'internals' | 'gpu' | 'cpu' | 'top' | 'rear';

export class ThreePCScene {
  private container: HTMLElement;
  private callbacks: SceneCallbacks;

  // Three.js Core
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private pmremGenerator: THREE.PMREMGenerator | null = null;
  private envMapRenderTarget: THREE.WebGLRenderTarget | null = null;
  private clock = new THREE.Clock();
  private animationFrameId: number | null = null;

  // Scene Root Groups
  private rootGroup: THREE.Group;
  private caseGroup: THREE.Group;
  private moboGroup: THREE.Group;
  private cpuGroup: THREE.Group;
  private coolerGroup: THREE.Group;
  private ramGroup: THREE.Group;
  private gpuGroup: THREE.Group;
  private storageGroup: THREE.Group;
  private psuGroup: THREE.Group;
  private fansGroup: THREE.Group;
  private cablesGroup: THREE.Group;

  // Interactive Meshes & Parts
  private interactiveMeshes = new Map<THREE.Object3D, PCCategory>();
  private hoveredMesh: THREE.Object3D | null = null;
  private hoveredCategory: PCCategory | null = null;
  private spinningFans: THREE.Group[] = [];
  private rgbMaterials: THREE.MeshStandardMaterial[] = [];
  private glassHingeGroup: THREE.Group | null = null;
  private glassPanel: THREE.Mesh | null = null;
  private groundMesh: THREE.Mesh | null = null;

  // High-Resolution Procedural Textures & PBR Maps
  private moboTexture: THREE.CanvasTexture | null = null;
  private moboBumpTexture: THREE.CanvasTexture | null = null;
  private brushedMetalNormalTexture: THREE.CanvasTexture | null = null;
  private carbonTexture: THREE.CanvasTexture | null = null;
  private carbonNormalTexture: THREE.CanvasTexture | null = null;
  private radiatorFinNormalTexture: THREE.CanvasTexture | null = null;
  private fanHubTexture: THREE.CanvasTexture | null = null;
  private psuLabelTexture: THREE.CanvasTexture | null = null;
  private honeycombTexture: THREE.CanvasTexture | null = null;
  private cableBraidedTexture: THREE.CanvasTexture | null = null;
  private gpuBackplateTexture: THREE.CanvasTexture | null = null;
  private gpuShroudTexture: THREE.CanvasTexture | null = null;
  private gpuPortTexture: THREE.CanvasTexture | null = null;

  // Dynamic Case Interior Lighting
  private internalRgbLight1!: THREE.PointLight;
  private internalRgbLight2!: THREE.PointLight;
  private internalRgbLight3!: THREE.PointLight;

  // Thermal Airflow System
  private thermalParticles: THREE.Points | null = null;
  private particlePositions: Float32Array | null = null;
  private particleColors: Float32Array | null = null;

  // AIO LCD Screen Canvas
  private lcdCanvas: HTMLCanvasElement | null = null;
  private lcdTexture: THREE.CanvasTexture | null = null;
  private lastLcdUpdate = 0;

  // Debug LED display texture
  private debugLedCanvas: HTMLCanvasElement | null = null;
  private debugLedTexture: THREE.CanvasTexture | null = null;

  // Lighting & Environment
  private ambientLight!: THREE.AmbientLight;
  private mainSpotLight!: THREE.SpotLight;
  private rimLight!: THREE.DirectionalLight;
  private fillLight!: THREE.PointLight;
  private topLight!: THREE.DirectionalLight;

  // Interaction State
  private isMouseDown = false;
  private isRightMouseDown = false;
  private isDragging = false;
  private mouseDownStartPos = { x: 0, y: 0 };
  private mousePrev = { x: 0, y: 0 };
  private touchPrev = { x: 0, y: 0 };
  private touchStartPos = { x: 0, y: 0 };
  private touchStartDist = 0;
  private isTouchPanning = false;
  private mouse = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private currentBuild: PCBuild | null = null;
  private currentSettings: StudioSettings | null = null;
  private lastRaycastTime = 0;
  private resizeObserver: ResizeObserver | null = null;

  // Turntable Showcase Mode
  public isTurntableActive = false;
  public turntableSpeed = 0.45;

  // Camera Orbit Settings & Smooth Interpolation
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private desiredTarget = new THREE.Vector3(0, 0, 0);
  private spherical = { radius: 6.2, theta: 0.75, phi: 1.15 };
  private desiredSpherical = { radius: 6.2, theta: 0.75, phi: 1.15 };

  // Event handlers
  private boundOnMouseDown: (e: MouseEvent) => void;
  private boundOnMouseUp: () => void;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnWheel: (e: WheelEvent) => void;
  private boundOnClick: (e: MouseEvent) => void;
  private boundOnContextMenu: (e: MouseEvent) => void;
  private boundOnTouchStart: (e: TouchEvent) => void;
  private boundOnTouchMove: (e: TouchEvent) => void;
  private boundOnTouchEnd: (e: TouchEvent) => void;
  private boundOnResize: () => void;

  constructor(container: HTMLElement, callbacks: SceneCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050608);

    // 2. Camera with natural FOV for product architectural photography
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(36, aspect, 0.1, 100);
    this.updateCameraPosition();

    // 3. Renderer with high visual fidelity, physical lighting & tone mapping
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    container.appendChild(this.renderer.domElement);

    // 4. Photorealistic Procedural HDR Studio Environment & Textures
    this.setupStudioEnvironment();
    this.generateProceduralTextures();

    // 5. Root Groups
    this.rootGroup = new THREE.Group();
    this.caseGroup = new THREE.Group();
    this.moboGroup = new THREE.Group();
    this.cpuGroup = new THREE.Group();
    this.coolerGroup = new THREE.Group();
    this.ramGroup = new THREE.Group();
    this.gpuGroup = new THREE.Group();
    this.storageGroup = new THREE.Group();
    this.psuGroup = new THREE.Group();
    this.fansGroup = new THREE.Group();
    this.cablesGroup = new THREE.Group();

    this.rootGroup.add(
      this.caseGroup,
      this.moboGroup,
      this.cpuGroup,
      this.coolerGroup,
      this.ramGroup,
      this.gpuGroup,
      this.storageGroup,
      this.psuGroup,
      this.fansGroup,
      this.cablesGroup
    );
    this.scene.add(this.rootGroup);

    // 6. Lighting & Studio Environment
    this.setupLighting();
    this.setupGround();

    // 7. Sub-systems
    this.initLCDScreen();
    this.initDebugLED();
    this.initThermalAirflow();

    // 8. Event listeners
    this.boundOnMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        this.isMouseDown = true;
        this.isTurntableActive = false;
      }
      if (e.button === 2) {
        this.isRightMouseDown = true;
      }
      this.mouseDownStartPos = { x: e.clientX, y: e.clientY };
      this.mousePrev = { x: e.clientX, y: e.clientY };
      this.isDragging = false;
    };

    this.boundOnMouseUp = () => {
      this.isMouseDown = false;
      this.isRightMouseDown = false;
    };

    this.boundOnContextMenu = (e: MouseEvent) => e.preventDefault();

    this.boundOnMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - this.mousePrev.x;
      const dy = e.clientY - this.mousePrev.y;
      this.mousePrev = { x: e.clientX, y: e.clientY };

      if (this.isMouseDown) {
        const totalDist = Math.hypot(e.clientX - this.mouseDownStartPos.x, e.clientY - this.mouseDownStartPos.y);
        if (totalDist > 5) {
          this.isDragging = true;
        }
        this.desiredSpherical.theta -= dx * 0.007;
        this.desiredSpherical.phi = Math.max(0.08, Math.min(Math.PI / 2 + 0.25, this.desiredSpherical.phi - dy * 0.007));
        this.spherical.theta = this.desiredSpherical.theta;
        this.spherical.phi = this.desiredSpherical.phi;
        this.updateCameraPosition();
      } else if (this.isRightMouseDown) {
        const totalDist = Math.hypot(e.clientX - this.mouseDownStartPos.x, e.clientY - this.mouseDownStartPos.y);
        if (totalDist > 5) {
          this.isDragging = true;
        }
        const panSpeed = 0.004;
        const right = new THREE.Vector3().crossVectors(this.camera.up, this.camera.position.clone().sub(this.cameraTarget)).normalize();
        this.desiredTarget.addScaledVector(right, -dx * panSpeed);
        this.desiredTarget.y += dy * panSpeed;
        this.cameraTarget.copy(this.desiredTarget);
        this.updateCameraPosition();
      } else {
        const now = performance.now();
        if (now - this.lastRaycastTime > 35) {
          this.lastRaycastTime = now;
          const rect = this.renderer.domElement.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            this.handleRaycastHover();
          }
        }
      }
    };

    this.boundOnWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.desiredSpherical.radius = Math.max(1.6, Math.min(13.0, this.desiredSpherical.radius + e.deltaY * 0.005));
      this.spherical.radius = this.desiredSpherical.radius;
      this.updateCameraPosition();
    };

    this.boundOnClick = (e: MouseEvent) => {
      // If user dragged to rotate or pan camera (moved more than 5px), ignore click event!
      const totalDist = Math.hypot(e.clientX - this.mouseDownStartPos.x, e.clientY - this.mouseDownStartPos.y);
      if (this.isDragging || totalDist > 5) {
        this.isDragging = false;
        return;
      }

      const rect = this.renderer.domElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.handleRaycastClick();
      }
    };

    this.boundOnTouchStart = (e: TouchEvent) => {
      this.isTurntableActive = false;
      if (e.touches.length === 1) {
        const t = e.touches[0];
        this.touchStartPos = { x: t.clientX, y: t.clientY };
        this.touchPrev = { x: t.clientX, y: t.clientY };
        this.isDragging = false;
        this.isTouchPanning = false;
      } else if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        this.touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        this.isTouchPanning = true;
        this.isDragging = true;
      }
    };

    this.boundOnTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && !this.isTouchPanning) {
        const t = e.touches[0];
        const dx = t.clientX - this.touchPrev.x;
        const dy = t.clientY - this.touchPrev.y;
        this.touchPrev = { x: t.clientX, y: t.clientY };

        const totalDist = Math.hypot(t.clientX - this.touchStartPos.x, t.clientY - this.touchStartPos.y);
        if (totalDist > 6) {
          this.isDragging = true;
        }

        this.desiredSpherical.theta -= dx * 0.007;
        this.desiredSpherical.phi = Math.max(0.08, Math.min(Math.PI / 2 + 0.25, this.desiredSpherical.phi - dy * 0.007));
        this.spherical.theta = this.desiredSpherical.theta;
        this.spherical.phi = this.desiredSpherical.phi;
        this.updateCameraPosition();
      } else if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const deltaDist = dist - this.touchStartDist;
        this.touchStartDist = dist;
        this.desiredSpherical.radius = Math.max(1.6, Math.min(13.0, this.desiredSpherical.radius - deltaDist * 0.01));
        this.spherical.radius = this.desiredSpherical.radius;
        this.updateCameraPosition();
      }
    };

    this.boundOnTouchEnd = (e: TouchEvent) => {
      if (!this.isDragging && e.changedTouches.length === 1) {
        const t = e.changedTouches[0];
        const totalDist = Math.hypot(t.clientX - this.touchStartPos.x, t.clientY - this.touchStartPos.y);
        if (totalDist <= 6) {
          const rect = this.renderer.domElement.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            this.mouse.x = ((t.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((t.clientY - rect.top) / rect.height) * 2 + 1;
            this.handleRaycastClick();
          }
        }
      }
      this.isDragging = false;
      this.isTouchPanning = false;
    };

    this.boundOnResize = () => {
      this.handleResize();
    };

    this.setupEventListeners();

    // 9. Start Loop
    this.animate = this.animate.bind(this);
    this.animate();

    requestAnimationFrame(() => {
      this.handleResize();
    });
  }

  // =========================================================================
  // PHOTOREALISTIC STUDIO ENVIRONMENT MAP (PMREM)
  // =========================================================================

  private setupStudioEnvironment() {
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();

    // Create a 2048x1024 High-Definition Equirectangular Studio Texture
    const envCan = document.createElement('canvas');
    envCan.width = 2048;
    envCan.height = 1024;
    const ectx = envCan.getContext('2d');
    if (ectx) {
      // Dark neutral studio horizon gradient
      const bgGrad = ectx.createLinearGradient(0, 0, 0, 1024);
      bgGrad.addColorStop(0, '#0d1118');
      bgGrad.addColorStop(0.35, '#07090e');
      bgGrad.addColorStop(0.65, '#040508');
      bgGrad.addColorStop(1, '#020304');
      ectx.fillStyle = bgGrad;
      ectx.fillRect(0, 0, 2048, 1024);

      // 1. Primary Studio Softbox (Large diffuse overhead key light)
      const softbox1 = ectx.createRadialGradient(500, 320, 20, 500, 320, 340);
      softbox1.addColorStop(0, '#ffffff');
      softbox1.addColorStop(0.25, '#f8fafc');
      softbox1.addColorStop(0.6, '#64748b');
      softbox1.addColorStop(0.9, '#1e293b');
      softbox1.addColorStop(1, 'transparent');
      ectx.fillStyle = softbox1;
      ectx.fillRect(150, 0, 700, 640);

      // 2. Secondary Rim Softbox (Cyan / cool-toned specular edge)
      const softbox2 = ectx.createRadialGradient(1560, 360, 20, 1560, 360, 320);
      softbox2.addColorStop(0, '#e0f2fe');
      softbox2.addColorStop(0.3, '#38bdf8');
      softbox2.addColorStop(0.7, '#0284c7');
      softbox2.addColorStop(1, 'transparent');
      ectx.fillStyle = softbox2;
      ectx.fillRect(1240, 40, 640, 640);

      // 3. Overhead Continuous Light Strips (Produces crisp anisotropic line reflections across brushed aluminum & heatpipes)
      ectx.fillStyle = '#ffffff';
      ectx.fillRect(800, 80, 440, 36);
      ectx.fillRect(860, 150, 320, 22);
      ectx.fillRect(920, 210, 200, 16);

      // 4. Warm subtle floor bounce reflection gradient
      const floorGrad = ectx.createLinearGradient(0, 800, 0, 1024);
      floorGrad.addColorStop(0, '#000000');
      floorGrad.addColorStop(0.5, '#1e1b4b');
      floorGrad.addColorStop(1, '#0f172a');
      ectx.fillStyle = floorGrad;
      ectx.fillRect(0, 800, 2048, 224);
    }

    const envTexture = new THREE.CanvasTexture(envCan);
    envTexture.mapping = THREE.EquirectangularReflectionMapping;
    envTexture.colorSpace = THREE.SRGBColorSpace;

    this.envMapRenderTarget = this.pmremGenerator.fromEquirectangular(envTexture);
    this.scene.environment = this.envMapRenderTarget.texture;
    envTexture.dispose();
  }

  // =========================================================================
  // PROCEDURAL PBR TEXTURES, NORMAL MAPS & BUMP MAPS
  // =========================================================================

  private generateProceduralTextures() {
    // 1. Motherboard PCB Multi-Layer Circuit Canvas (1024x1024)
    const moboCan = document.createElement('canvas');
    moboCan.width = 1024;
    moboCan.height = 1024;
    const mctx = moboCan.getContext('2d');
    if (mctx) {
      mctx.fillStyle = '#0a0c10';
      mctx.fillRect(0, 0, 1024, 1024);

      // Circuit Trace Layers (Matte Gold & Copper)
      mctx.strokeStyle = '#1e2433';
      mctx.lineWidth = 1.8;
      for (let i = 0; i < 140; i++) {
        mctx.beginPath();
        const startX = Math.random() * 1024;
        const startY = Math.random() * 1024;
        mctx.moveTo(startX, startY);
        mctx.lineTo(startX + (Math.random() - 0.5) * 160, startY + (Math.random() - 0.5) * 160);
        mctx.lineTo(startX + (Math.random() - 0.5) * 280, startY + (Math.random() - 0.5) * 280);
        mctx.stroke();
      }

      // SMD Surface Mount Component pads (Resistors / Capacitors matrix)
      mctx.fillStyle = '#475569';
      for (let s = 0; s < 250; s++) {
        const sx = Math.random() * 1000 + 12;
        const sy = Math.random() * 1000 + 12;
        mctx.fillRect(sx, sy, 3, 5);
      }

      // LGA Socket grid with gold pins
      mctx.fillStyle = '#11151f';
      mctx.fillRect(360, 220, 300, 300);
      mctx.strokeStyle = '#ca8a04';
      mctx.lineWidth = 2;
      mctx.strokeRect(360, 220, 300, 300);

      // Gold pins pattern in socket center
      mctx.fillStyle = '#eab308';
      for (let px = 380; px < 640; px += 8) {
        for (let py = 240; py < 500; py += 8) {
          mctx.fillRect(px, py, 2.5, 2.5);
        }
      }

      // Isolated Audio Section with glowing trace line
      mctx.strokeStyle = '#f59e0b';
      mctx.lineWidth = 2.5;
      mctx.beginPath();
      mctx.moveTo(60, 720);
      mctx.lineTo(160, 720);
      mctx.lineTo(160, 980);
      mctx.stroke();

      // Precision Silk-screen Typography & Badges
      mctx.font = 'bold 20px "JetBrains Mono", monospace';
      mctx.fillStyle = '#94a3b8';
      mctx.fillText('FORGE PRO Z890-E GAMING WIFI', 360, 180);
      mctx.fillText('PCIE 5.0 x16 ARMOR CORE', 380, 680);
      mctx.fillText('DDR5 8400+ MT/s DUAL CHANNEL', 740, 140);
      mctx.fillText('AUDIO BOOST • ESS SABRE DAC', 80, 890);
      mctx.fillText('PCIe 5.0 M.2 GEN5 NVMe', 390, 560);
      mctx.fillText('DEBUG CODE // 0xAA', 840, 960);
    }
    this.moboTexture = new THREE.CanvasTexture(moboCan);

    // 2. Motherboard Bump Map
    const moboBumpCan = document.createElement('canvas');
    moboBumpCan.width = 512;
    moboBumpCan.height = 512;
    const bctx = moboBumpCan.getContext('2d');
    if (bctx) {
      bctx.fillStyle = '#808080';
      bctx.fillRect(0, 0, 512, 512);
      bctx.fillStyle = '#ffffff';
      for (let i = 0; i < 90; i++) {
        bctx.fillRect(Math.random() * 500, Math.random() * 500, 2, 4);
      }
    }
    this.moboBumpTexture = new THREE.CanvasTexture(moboBumpCan);

    // 3. Anisotropic Brushed Aluminum Normal Map (for heatsinks, backplates, and case panels)
    const brushCan = document.createElement('canvas');
    brushCan.width = 256;
    brushCan.height = 256;
    const brctx = brushCan.getContext('2d');
    if (brctx) {
      brctx.fillStyle = '#8080ff'; // Neutral normal base
      brctx.fillRect(0, 0, 256, 256);

      // Micro striations in horizontal direction
      for (let y = 0; y < 256; y += 2) {
        const noise = Math.random() * 30 - 15;
        brctx.fillStyle = `rgb(${128 + noise}, ${128}, 255)`;
        brctx.fillRect(0, y, 256, 1);
      }
    }
    this.brushedMetalNormalTexture = new THREE.CanvasTexture(brushCan);
    this.brushedMetalNormalTexture.wrapS = THREE.RepeatWrapping;
    this.brushedMetalNormalTexture.wrapT = THREE.RepeatWrapping;
    this.brushedMetalNormalTexture.repeat.set(4, 4);

    // 4. Carbon Fiber 2x2 Twill Weave Texture & Normal Map
    const carbCan = document.createElement('canvas');
    carbCan.width = 64;
    carbCan.height = 64;
    const cctx = carbCan.getContext('2d');
    if (cctx) {
      cctx.fillStyle = '#0f1115';
      cctx.fillRect(0, 0, 64, 64);
      cctx.fillStyle = '#1c2027';
      cctx.fillRect(0, 0, 32, 32);
      cctx.fillRect(32, 32, 32, 32);
      cctx.fillStyle = '#090a0d';
      cctx.fillRect(16, 16, 32, 32);
    }
    this.carbonTexture = new THREE.CanvasTexture(carbCan);
    this.carbonTexture.wrapS = THREE.RepeatWrapping;
    this.carbonTexture.wrapT = THREE.RepeatWrapping;
    this.carbonTexture.repeat.set(8, 8);

    // 5. Radiator Ultra-Fine Cooling Fins Normal Map
    const finCan = document.createElement('canvas');
    finCan.width = 128;
    finCan.height = 128;
    const fctx = finCan.getContext('2d');
    if (fctx) {
      fctx.fillStyle = '#8080ff';
      fctx.fillRect(0, 0, 128, 128);
      for (let z = 0; z < 128; z += 4) {
        fctx.fillStyle = '#9070ff';
        fctx.fillRect(0, z, 128, 2);
        fctx.fillStyle = '#7090ff';
        fctx.fillRect(0, z + 2, 128, 2);
      }
    }
    this.radiatorFinNormalTexture = new THREE.CanvasTexture(finCan);
    this.radiatorFinNormalTexture.wrapS = THREE.RepeatWrapping;
    this.radiatorFinNormalTexture.wrapT = THREE.RepeatWrapping;
    this.radiatorFinNormalTexture.repeat.set(6, 18);

    // 6. Center Fan Holographic Radial Hub Badge
    const hubCan = document.createElement('canvas');
    hubCan.width = 256;
    hubCan.height = 256;
    const hctx = hubCan.getContext('2d');
    if (hctx) {
      const grad = hctx.createRadialGradient(128, 128, 10, 128, 128, 128);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#94a3b8');
      grad.addColorStop(0.6, '#38bdf8');
      grad.addColorStop(0.85, '#a855f7');
      grad.addColorStop(1, '#0f172a');
      hctx.fillStyle = grad;
      hctx.fillRect(0, 0, 256, 256);

      hctx.beginPath();
      hctx.arc(128, 128, 120, 0, Math.PI * 2);
      hctx.strokeStyle = '#e2e8f0';
      hctx.lineWidth = 6;
      hctx.stroke();

      hctx.font = 'bold 28px sans-serif';
      hctx.fillStyle = '#0f172a';
      hctx.textAlign = 'center';
      hctx.fillText('FORGE', 128, 138);
    }
    this.fanHubTexture = new THREE.CanvasTexture(hubCan);

    // 7. PSU Specification Laser-Etched Label
    const psuCan = document.createElement('canvas');
    psuCan.width = 512;
    psuCan.height = 256;
    const pctx = psuCan.getContext('2d');
    if (pctx) {
      pctx.fillStyle = '#0d0f12';
      pctx.fillRect(0, 0, 512, 256);
      pctx.strokeStyle = '#eab308';
      pctx.lineWidth = 4;
      pctx.strokeRect(10, 10, 492, 236);

      pctx.font = '900 36px "Inter", sans-serif';
      pctx.fillStyle = '#ffffff';
      pctx.fillText('FORGE 1000W PLATINUM', 30, 60);

      pctx.font = 'bold 22px "Inter", sans-serif';
      pctx.fillStyle = '#eab308';
      pctx.fillText('80 PLUS PLATINUM ATX 3.1 PCIe 5.1 READY', 30, 100);

      pctx.font = '16px monospace';
      pctx.fillStyle = '#94a3b8';
      pctx.fillText('+12V-2x6 NATIVE: 600W  •  +12V: 83.3A (1000W)', 30, 145);
      pctx.fillText('ACTIVE PFC • JAPANESE 105°C CAPACITORS', 30, 180);
      pctx.fillText('CYBENETICS TITANIUM NOISE LEVEL', 30, 215);
    }
    this.psuLabelTexture = new THREE.CanvasTexture(psuCan);

    // 8. Honeycomb Ventilation Grille Pattern
    const hexCan = document.createElement('canvas');
    hexCan.width = 64;
    hexCan.height = 64;
    const hxctx = hexCan.getContext('2d');
    if (hxctx) {
      hxctx.fillStyle = '#0d0e12';
      hxctx.fillRect(0, 0, 64, 64);
      hxctx.strokeStyle = '#1e2433';
      hxctx.lineWidth = 2;
      hxctx.strokeRect(4, 4, 24, 24);
      hxctx.strokeRect(36, 36, 24, 24);
    }
    this.honeycombTexture = new THREE.CanvasTexture(hexCan);
    this.honeycombTexture.wrapS = THREE.RepeatWrapping;
    this.honeycombTexture.wrapT = THREE.RepeatWrapping;
    this.honeycombTexture.repeat.set(10, 10);

    // 9. Ultra-Fine Braided Sleeving Texture for Cables (64x64 herringbone weave)
    const braidCan = document.createElement('canvas');
    braidCan.width = 64;
    braidCan.height = 64;
    const brictx = braidCan.getContext('2d');
    if (brictx) {
      brictx.fillStyle = '#222630';
      brictx.fillRect(0, 0, 64, 64);
      brictx.strokeStyle = '#3e4657';
      brictx.lineWidth = 3;
      for (let i = -32; i < 96; i += 8) {
        brictx.beginPath();
        brictx.moveTo(i, 0);
        brictx.lineTo(i + 32, 64);
        brictx.stroke();

        brictx.beginPath();
        brictx.moveTo(i + 32, 0);
        brictx.lineTo(i, 64);
        brictx.stroke();
      }
    }
    this.cableBraidedTexture = new THREE.CanvasTexture(braidCan);
    this.cableBraidedTexture.wrapS = THREE.RepeatWrapping;
    this.cableBraidedTexture.wrapT = THREE.RepeatWrapping;
    this.cableBraidedTexture.repeat.set(4, 24);

    // 10. GPU Backplate Brushed Gunmetal Texture with Geometric Air Vents & Laser Etch
    const gpuBpCan = document.createElement('canvas');
    gpuBpCan.width = 512;
    gpuBpCan.height = 256;
    const bpctx = gpuBpCan.getContext('2d');
    if (bpctx) {
      // Sleek brushed gunmetal background
      bpctx.fillStyle = '#232733';
      bpctx.fillRect(0, 0, 512, 256);

      // Fine brushed metal striations
      bpctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      for (let y = 0; y < 256; y += 2) {
        bpctx.fillRect(0, y, 512, 1);
      }

      // Stylized geometric chamfer lines & accents
      bpctx.strokeStyle = '#38bdf8';
      bpctx.lineWidth = 3;
      bpctx.beginPath();
      bpctx.moveTo(30, 30);
      bpctx.lineTo(240, 30);
      bpctx.lineTo(280, 80);
      bpctx.lineTo(480, 80);
      bpctx.stroke();

      // Laser Etched Branding
      bpctx.font = '900 28px "Inter", sans-serif';
      bpctx.fillStyle = '#ffffff';
      bpctx.fillText('GEFORCE RTX', 45, 68);

      bpctx.font = 'bold 13px monospace';
      bpctx.fillStyle = '#94a3b8';
      bpctx.fillText('FORGE ADVANCED EDITION • 24GB GDDR6X • PCIE 5.0', 45, 96);

      // Flow-through rear ventilation cutout pattern
      bpctx.fillStyle = '#0f1118';
      bpctx.fillRect(320, 110, 160, 120);
      bpctx.strokeStyle = '#38bdf8';
      bpctx.lineWidth = 2;
      bpctx.strokeRect(320, 110, 160, 120);

      bpctx.strokeStyle = '#475569';
      bpctx.lineWidth = 3;
      for (let vx = 330; vx < 470; vx += 14) {
        bpctx.beginPath();
        bpctx.moveTo(vx, 120);
        bpctx.lineTo(vx + 14, 220);
        bpctx.stroke();
      }
    }
    this.gpuBackplateTexture = new THREE.CanvasTexture(gpuBpCan);

    // 11. GPU Shroud Precision Die-Cast Texture
    const gpuShCan = document.createElement('canvas');
    gpuShCan.width = 512;
    gpuShCan.height = 256;
    const shctx = gpuShCan.getContext('2d');
    if (shctx) {
      shctx.fillStyle = '#1c202a';
      shctx.fillRect(0, 0, 512, 256);

      // Beveled armor borders
      shctx.strokeStyle = '#3b82f6';
      shctx.lineWidth = 3;
      shctx.strokeRect(12, 12, 488, 232);

      // Metallic chamfer striations
      shctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      for (let x = 0; x < 512; x += 4) {
        shctx.fillRect(x, 0, 2, 256);
      }

      shctx.font = '900 22px "Inter", sans-serif';
      shctx.fillStyle = '#ffffff';
      shctx.fillText('FORGE OC TRIPLE-AXIAL CORE', 35, 45);

      shctx.font = 'bold 12px monospace';
      shctx.fillStyle = '#38bdf8';
      shctx.fillText('AUTO-STOP FAN TECHNOLOGY // ZERO-RPM IDLE', 35, 70);
    }
    this.gpuShroudTexture = new THREE.CanvasTexture(gpuShCan);

    // 12. GPU Rear PCIe I/O Ports Texture
    const portCan = document.createElement('canvas');
    portCan.width = 128;
    portCan.height = 256;
    const portCtx = portCan.getContext('2d');
    if (portCtx) {
      portCtx.fillStyle = '#cbd5e1';
      portCtx.fillRect(0, 0, 128, 256);

      // 3x DisplayPort 2.1 sockets
      portCtx.fillStyle = '#0f172a';
      portCtx.fillRect(24, 40, 80, 28);
      portCtx.fillRect(24, 85, 80, 28);
      portCtx.fillRect(24, 130, 80, 28);

      // 1x HDMI 2.1 socket
      portCtx.fillRect(24, 180, 80, 32);

      // Gold internal contacts
      portCtx.fillStyle = '#eab308';
      portCtx.fillRect(36, 50, 56, 8);
      portCtx.fillRect(36, 95, 56, 8);
      portCtx.fillRect(36, 140, 56, 8);
      portCtx.fillRect(36, 192, 56, 8);
    }
    this.gpuPortTexture = new THREE.CanvasTexture(portCan);
  }

  private setupLighting() {
    // Ambient light - calibrated for deep blacks with crystal clear shadow definition
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(this.ambientLight);

    // Primary Studio Key Spotlight (45 degree angle for dramatic metallic specular highlights)
    this.mainSpotLight = new THREE.SpotLight(0xfffbf5, 5.2);
    this.mainSpotLight.position.set(4.2, 7.5, 5.0);
    this.mainSpotLight.angle = Math.PI / 3.2;
    this.mainSpotLight.penumbra = 0.7;
    this.mainSpotLight.castShadow = true;
    this.mainSpotLight.shadow.mapSize.width = 4096;
    this.mainSpotLight.shadow.mapSize.height = 4096;
    this.mainSpotLight.shadow.radius = 2.4;
    this.mainSpotLight.shadow.bias = -0.00003;
    this.mainSpotLight.shadow.normalBias = 0.02;
    this.mainSpotLight.shadow.camera.near = 1.0;
    this.mainSpotLight.shadow.camera.far = 28.0;
    this.scene.add(this.mainSpotLight);

    // Soft Diffuse Front-Left Fill Light (lifts interior dark corners and mobo details)
    this.fillLight = new THREE.PointLight(0xe2e8f0, 3.4, 26);
    this.fillLight.position.set(-4.0, 3.0, 4.0);
    this.scene.add(this.fillLight);

    // Overhead Diffuser Light (illuminates top radiator, RAM diffusers, and cables)
    this.topLight = new THREE.DirectionalLight(0xf8fafc, 2.4);
    this.topLight.position.set(0, 7.0, 0.5);
    this.scene.add(this.topLight);

    // Silhouette Rim Light (crisp edge definition for glass & brushed aluminum bevels)
    this.rimLight = new THREE.DirectionalLight(0x38bdf8, 3.6);
    this.rimLight.position.set(-5.2, 4.2, -4.8);
    this.scene.add(this.rimLight);

    // Dynamic Interior Glow Lights (illumination inside chassis)
    this.internalRgbLight1 = new THREE.PointLight(0x38bdf8, 2.2, 4.2);
    this.internalRgbLight1.position.set(-0.1, 0.9, 0.2);
    this.rootGroup.add(this.internalRgbLight1);

    this.internalRgbLight2 = new THREE.PointLight(0x818cf8, 2.0, 4.0);
    this.internalRgbLight2.position.set(0.1, -0.2, 0.5);
    this.rootGroup.add(this.internalRgbLight2);

    this.internalRgbLight3 = new THREE.PointLight(0xffffff, 1.8, 3.8);
    this.internalRgbLight3.position.set(0.0, 0.3, 0.9);
    this.rootGroup.add(this.internalRgbLight3);
  }

  private setupGround() {
    // Showroom Dark Pedestal Floor with High-End Reflection
    const groundGeo = new THREE.PlaneGeometry(42, 42);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x050608,
      roughness: 0.65,
      metalness: 0.45,
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = -2.15;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // Circular Brushed Dark Turntable Pedestal
    const pedestalGeo = new THREE.CylinderGeometry(2.85, 2.95, 0.09, 64);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x090b0e,
      metalness: 0.92,
      roughness: 0.22,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -2.10;
    pedestal.receiveShadow = true;
    this.scene.add(pedestal);

    // Glowing Neon Perimeter Ring
    const rimRingGeo = new THREE.TorusGeometry(2.87, 0.016, 16, 64);
    const rimRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const rimRing = new THREE.Mesh(rimRingGeo, rimRingMat);
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = -2.06;
    this.scene.add(rimRing);

    // Ground Soft Contact Shadow Disc under PC Case
    const shadowGeo = new THREE.PlaneGeometry(3.6, 4.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.75,
    });
    const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = -2.05;
    this.scene.add(shadowDisc);

    // Studio Grid
    const grid = new THREE.GridHelper(28, 28, 0x1e293b, 0x0b0f19);
    grid.position.y = -2.14;
    this.scene.add(grid);
  }

  private initLCDScreen() {
    this.lcdCanvas = document.createElement('canvas');
    this.lcdCanvas.width = 512;
    this.lcdCanvas.height = 512;
    this.lcdTexture = new THREE.CanvasTexture(this.lcdCanvas);
    this.updateLCDScreen(38, 5.4, 1450);
  }

  private initDebugLED() {
    this.debugLedCanvas = document.createElement('canvas');
    this.debugLedCanvas.width = 128;
    this.debugLedCanvas.height = 64;
    this.debugLedTexture = new THREE.CanvasTexture(this.debugLedCanvas);
    const ctx = this.debugLedCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#050608';
      ctx.fillRect(0, 0, 128, 64);
      ctx.font = 'bold 44px "JetBrains Mono", monospace';
      ctx.fillStyle = '#22c55e';
      ctx.textAlign = 'center';
      ctx.fillText('A0', 64, 48);
    }
  }

  private updateLCDScreen(temp: number, clock: number, pumpRpm: number) {
    if (!this.lcdCanvas || !this.lcdTexture) return;
    const ctx = this.lcdCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#040507';
    ctx.fillRect(0, 0, 512, 512);

    // High-tech circular outer track
    ctx.beginPath();
    ctx.arc(256, 256, 225, 0, Math.PI * 2);
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Active temperature gauge arc with gradient
    const progress = Math.max(0.08, Math.min((temp - 25) / 60, 1.0));
    ctx.beginPath();
    ctx.arc(256, 256, 225, -Math.PI * 0.75, -Math.PI * 0.75 + progress * (Math.PI * 1.5));
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#06b6d4');
    grad.addColorStop(0.5, '#3b82f6');
    grad.addColorStop(1, temp > 72 ? '#ef4444' : '#10b981');
    ctx.strokeStyle = grad;
    ctx.stroke();

    // Inner dial ring
    ctx.beginPath();
    ctx.arc(256, 256, 175, 0, Math.PI * 2);
    ctx.fillStyle = '#090c14';
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Header Label
    ctx.font = '700 26px "Inter", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('CPU TEMPERATURE', 256, 145);

    // High contrast temperature readout
    ctx.font = '900 114px "Inter", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.round(temp)}°C`, 256, 265);

    // Clock & RPM badge bar
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(96, 320, 320, 52);
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${clock.toFixed(1)} GHz  •  ${pumpRpm} RPM`, 256, 356);

    // Live status dot
    ctx.beginPath();
    ctx.arc(256, 412, 7, 0, Math.PI * 2);
    ctx.fillStyle = temp > 75 ? '#ef4444' : '#10b981';
    ctx.fill();

    this.lcdTexture.needsUpdate = true;
  }

  private initThermalAirflow() {
    const particleCount = 280;
    const geometry = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(particleCount * 3);
    this.particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      this.resetThermalParticle(i);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    this.thermalParticles = new THREE.Points(geometry, material);
    this.thermalParticles.visible = false;
    this.rootGroup.add(this.thermalParticles);
  }

  private resetThermalParticle(i: number) {
    if (!this.particlePositions || !this.particleColors) return;
    const idx = i * 3;
    this.particlePositions[idx] = (Math.random() - 0.5) * 1.6;
    this.particlePositions[idx + 1] = -1.1 + Math.random() * 1.2;
    this.particlePositions[idx + 2] = 1.6 + Math.random() * 0.4;

    this.particleColors[idx] = 0.05;
    this.particleColors[idx + 1] = 0.75;
    this.particleColors[idx + 2] = 1.0;
  }

  private updateThermalParticles(delta: number) {
    if (!this.thermalParticles || !this.thermalParticles.visible || !this.particlePositions || !this.particleColors) return;

    const count = this.particlePositions.length / 3;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      this.particlePositions[idx + 2] -= delta * 1.8;
      this.particlePositions[idx + 1] += delta * 0.98;
      this.particlePositions[idx] += (Math.random() - 0.5) * delta * 0.2;

      const progress = (1.6 - this.particlePositions[idx + 2]) / 3.2;
      if (progress > 0.35) {
        this.particleColors[idx] = 1.0;
        this.particleColors[idx + 1] = Math.max(0.1, 0.45 * (1.0 - progress));
        this.particleColors[idx + 2] = 0.05;
      }

      if (this.particlePositions[idx + 2] < -1.8 || this.particlePositions[idx + 1] > 1.9) {
        this.resetThermalParticle(i);
      }
    }

    this.thermalParticles.geometry.attributes.position.needsUpdate = true;
    this.thermalParticles.geometry.attributes.color.needsUpdate = true;
  }

  // =========================================================================
  // 3D GEOMETRY GENERATORS WITH PHOTOREALISTIC HARDWARE CRAFTSMANSHIP
  // =========================================================================

  public updateBuild(build: PCBuild, settings: StudioSettings) {
    this.currentBuild = build;
    this.currentSettings = settings;

    this.clearGroup(this.caseGroup);
    this.clearGroup(this.moboGroup);
    this.clearGroup(this.cpuGroup);
    this.clearGroup(this.coolerGroup);
    this.clearGroup(this.ramGroup);
    this.clearGroup(this.gpuGroup);
    this.clearGroup(this.storageGroup);
    this.clearGroup(this.psuGroup);
    this.clearGroup(this.fansGroup);
    this.clearGroup(this.cablesGroup);

    this.spinningFans = [];
    this.rgbMaterials = [];
    this.interactiveMeshes.clear();
    this.glassHingeGroup = null;
    this.glassPanel = null;

    if (build.case) this.buildCaseModel(build.case, settings);
    if (build.motherboard) this.buildMotherboardModel(build.motherboard, settings);
    if (build.cpu) this.buildCPUModel(build.cpu, settings);
    if (build.ram) this.buildRAMModel(build.ram, settings);
    if (build.storage) this.buildStorageModel(build.storage, settings);
    if (build.gpu) this.buildGPUModel(build.gpu, settings);
    if (build.cooler) this.buildCoolerModel(build.cooler, settings);
    if (build.psu) this.buildPSUModel(build.psu, settings);
    if (build.fans) this.buildFansModel(build.fans, settings);
    if (build.cables || (build.psu && build.gpu)) this.buildCablesModel(build.cables, build, settings);

    this.applySettings(settings);
  }

  private clearGroup(group: THREE.Group) {
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      this.disposeObject(obj);
    }
  }

  private disposeObject(obj: THREE.Object3D) {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    }
    if (obj.children && obj.children.length > 0) {
      for (let i = obj.children.length - 1; i >= 0; i--) {
        this.disposeObject(obj.children[i]);
      }
    }
  }

  private registerInteractive(mesh: THREE.Object3D, category: PCCategory) {
    this.interactiveMeshes.set(mesh, category);
  }

  // --- 1. CASE MODEL ---
  private buildCaseModel(part: PCBuild['case'], _settings: StudioSettings) {
    if (!part) return;

    const isWhite = part.color === 'white';
    const isWood = part.color === 'wood';
    const primaryColor = isWhite ? 0xf8fafc : 0x111216;
    const accentColor = isWhite ? 0xe2e8f0 : 0x181a20;

    const frameMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: isWhite ? 0.35 : 0.42,
      metalness: 0.82,
      normalMap: this.brushedMetalNormalTexture || undefined,
    });

    const innerMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.52,
      metalness: 0.65,
    });

    const isITX = part.formFactor === 'Mini-ITX';
    const width = isITX ? 1.7 : 2.3;
    const height = isITX ? 3.3 : 4.0;
    const depth = isITX ? 2.5 : 4.0;

    const chassis = new THREE.Group();

    // Top Panel with magnetic ventilation mesh
    const topGeo = new THREE.BoxGeometry(width, 0.08, depth);
    const topMesh = new THREE.Mesh(topGeo, frameMat);
    topMesh.position.set(0, height / 2, 0);
    topMesh.castShadow = true;
    chassis.add(topMesh);

    // Top Magnetic Mesh Dust Filter
    const dustFilterMat = new THREE.MeshStandardMaterial({
      map: this.honeycombTexture || undefined,
      color: 0x090a0d,
      roughness: 0.92,
      metalness: 0.1,
    });
    const dustFilter = new THREE.Mesh(new THREE.BoxGeometry(width - 0.3, 0.01, depth - 0.4), dustFilterMat);
    dustFilter.position.set(0, height / 2 + 0.045, 0);
    chassis.add(dustFilter);

    // Bottom Base
    const bottomGeo = new THREE.BoxGeometry(width, 0.1, depth);
    const bottomMesh = new THREE.Mesh(bottomGeo, frameMat);
    bottomMesh.position.set(0, -height / 2, 0);
    bottomMesh.receiveShadow = true;
    chassis.add(bottomMesh);

    // PSU Shroud Compartment (Lower Deck)
    const psuShroudGeo = new THREE.BoxGeometry(width - 0.1, 0.85, depth - 0.2);
    const psuShroud = new THREE.Mesh(psuShroudGeo, innerMat);
    psuShroud.position.set(0, -height / 2 + 0.48, 0);
    psuShroud.receiveShadow = true;
    chassis.add(psuShroud);

    // PSU Cutout Window on shroud with beveled border
    const cutoutMat = new THREE.MeshStandardMaterial({ color: 0x0a0b0e, roughness: 0.8 });
    const psuWindow = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.35, 1.2), cutoutMat);
    psuWindow.position.set(width / 2 - 0.04, -height / 2 + 0.48, -0.6);
    chassis.add(psuWindow);

    // Back Panel (I/O shield area & PCIe brackets)
    const backGeo = new THREE.BoxGeometry(width, height, 0.08);
    const backMesh = new THREE.Mesh(backGeo, frameMat);
    backMesh.position.set(0, 0, -depth / 2);
    backMesh.castShadow = true;
    chassis.add(backMesh);

    // PCIe Slot Covers with thumbscrews on rear
    const pcieCoverMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.92, roughness: 0.18 });
    for (let s = 0; s < 7; s++) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.7), pcieCoverMat);
      slot.position.set(width / 2 - 0.08, -0.2 - s * 0.12, -depth / 2 + 0.45);
      chassis.add(slot);
    }

    // Motherboard Tray with Stamped Cable Channels
    const trayGeo = new THREE.BoxGeometry(0.06, height - 1.1, depth - 0.4);
    const trayMesh = new THREE.Mesh(trayGeo, innerMat);
    trayMesh.position.set(-width / 2 + 0.52, 0.38, 0);
    trayMesh.receiveShadow = true;
    chassis.add(trayMesh);

    // Rubber Cable Pass-Through Grommets
    const grommetMat = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.95 });
    const grommet1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.18), grommetMat);
    grommet1.position.set(-width / 2 + 0.52, 0.6, 0.9);
    chassis.add(grommet1);

    const grommet2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.18), grommetMat);
    grommet2.position.set(-width / 2 + 0.52, -0.1, 0.9);
    chassis.add(grommet2);

    // Front Panel (Timber Wood Slats or High-Gloss Glass / Mesh)
    if (isWood) {
      const woodGroup = new THREE.Group();
      const slatMat = new THREE.MeshStandardMaterial({
        color: 0x5e3720, // Real Walnut Grain
        roughness: 0.65,
        metalness: 0.08,
      });
      const slatCount = 12;
      const slatW = (width - 0.35) / slatCount;
      for (let i = 0; i < slatCount; i++) {
        const slatGeo = new THREE.BoxGeometry(slatW * 0.65, height - 0.25, 0.08);
        const slat = new THREE.Mesh(slatGeo, slatMat);
        slat.position.set(-width / 2 + 0.22 + i * slatW, 0, depth / 2);
        slat.castShadow = true;
        woodGroup.add(slat);
      }
      chassis.add(woodGroup);
    } else {
      const frontGeo = new THREE.BoxGeometry(width, height - 0.1, 0.08);
      const frontMesh = new THREE.Mesh(frontGeo, frameMat);
      frontMesh.position.set(0, 0, depth / 2);
      frontMesh.castShadow = true;
      chassis.add(frontMesh);

      if (part.visuals.hasRGB) {
        const rgbStripGeo = new THREE.BoxGeometry(0.04, height - 0.5, 0.08);
        const rgbMat = new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x06b6d4,
          emissiveIntensity: 2.2,
          roughness: 0.1,
        });
        this.rgbMaterials.push(rgbMat);
        const rgbStrip = new THREE.Mesh(rgbStripGeo, rgbMat);
        rgbStrip.position.set(width / 2 - 0.12, 0, depth / 2 + 0.03);
        chassis.add(rgbStrip);
      }
    }

    // Top Front I/O Cluster (Illuminated Power button, Type-C, Audio)
    const ioCluster = new THREE.Group();
    const btnMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.95, roughness: 0.12 });
    const powerBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 20), btnMat);
    powerBtn.position.set(width / 2 - 0.25, height / 2 + 0.042, depth / 2 - 0.2);
    ioCluster.add(powerBtn);

    const typeC = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.015, 0.06), btnMat);
    typeC.position.set(width / 2 - 0.25, height / 2 + 0.042, depth / 2 - 0.35);
    ioCluster.add(typeC);
    chassis.add(ioCluster);

    // Tempered Glass Left Side Panel (Physical Material with Optical Transmission)
    this.glassHingeGroup = new THREE.Group();
    this.glassHingeGroup.position.set(width / 2, 0, -depth / 2);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.20,
      roughness: 0.02,
      metalness: 0.05,
      transmission: 0.96,
      ior: 1.52,
      thickness: 0.4,
      specularIntensity: 1.0,
      specularColor: new THREE.Color(0xffffff),
      clearcoat: 0.6,
      clearcoatRoughness: 0.02,
      reflectivity: 0.5,
    });
    const glassGeo = new THREE.BoxGeometry(0.03, height - 0.18, depth - 0.15);
    this.glassPanel = new THREE.Mesh(glassGeo, glassMat);
    this.glassPanel.position.set(0, 0, depth / 2);
    this.glassPanel.castShadow = false;
    this.glassPanel.receiveShadow = false;
    this.glassHingeGroup.add(this.glassPanel);

    // Black Ceramic Frit Border Mask on Glass Panel
    const fritMat = new THREE.MeshStandardMaterial({ color: 0x090a0d, roughness: 0.8 });
    const fritTop = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.08, depth - 0.15), fritMat);
    fritTop.position.set(0, (height - 0.18) / 2 - 0.04, depth / 2);
    this.glassHingeGroup.add(fritTop);

    const fritBtm = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.08, depth - 0.15), fritMat);
    fritBtm.position.set(0, -(height - 0.18) / 2 + 0.04, depth / 2);
    this.glassHingeGroup.add(fritBtm);

    // Glass panel knurled thumbscrews with rubber washers
    const screwMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.15 });
    const screwCorners = [
      [0.02, (height - 0.3) / 2, 0.15],
      [0.02, -(height - 0.3) / 2, 0.15],
      [0.02, (height - 0.3) / 2, depth - 0.25],
      [0.02, -(height - 0.3) / 2, depth - 0.25],
    ];
    screwCorners.forEach(([x, y, z]) => {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 20), screwMat);
      screw.rotation.z = Math.PI / 2;
      screw.position.set(x, y, z);
      this.glassHingeGroup?.add(screw);
    });

    chassis.add(this.glassHingeGroup);

    // Solid Aluminum Feet with Polished Trim Ring & Rubber Pads
    const footBaseMat = new THREE.MeshStandardMaterial({ color: 0x090a0d, roughness: 0.95 });
    const footRingMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.95, roughness: 0.15 });
    const footPositions = [
      [-width / 2 + 0.2, -height / 2 - 0.08, -depth / 2 + 0.3],
      [width / 2 - 0.2, -height / 2 - 0.08, -depth / 2 + 0.3],
      [-width / 2 + 0.2, -height / 2 - 0.08, depth / 2 - 0.3],
      [width / 2 - 0.2, -height / 2 - 0.08, depth / 2 - 0.3],
    ];
    footPositions.forEach(([x, y, z]) => {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 24), footBaseMat);
      foot.position.set(x, y, z);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 24), footRingMat);
      ring.position.set(x, y + 0.04, z);
      chassis.add(foot);
      chassis.add(ring);
    });

    this.registerInteractive(chassis, 'case');
    this.caseGroup.add(chassis);
  }

  // --- 2. MOTHERBOARD MODEL ---
  private buildMotherboardModel(part: PCBuild['motherboard'], _settings: StudioSettings) {
    if (!part) return;

    const mobo = new THREE.Group();
    const isWhite = part.color === 'white';

    // PCB Board (High-grade matte black or silver FR4 laminate)
    const pcbMat = new THREE.MeshStandardMaterial({
      map: this.moboTexture || undefined,
      bumpMap: this.moboBumpTexture || undefined,
      bumpScale: 0.02,
      color: isWhite ? 0xf8fafc : 0x101218,
      roughness: 0.42,
      metalness: 0.38,
    });
    const pcbGeo = new THREE.BoxGeometry(0.05, 2.45, 2.45);
    const pcb = new THREE.Mesh(pcbGeo, pcbMat);
    pcb.position.set(-0.55, 0.4, 0);
    pcb.receiveShadow = true;
    mobo.add(pcb);

    // Multi-Tier Anodized Brushed Aluminum VRM Heatspreaders
    const heatsinkMat = new THREE.MeshStandardMaterial({
      color: isWhite ? 0x94a3b8 : 0x1b1d24,
      metalness: 0.94,
      roughness: 0.18,
      normalMap: this.brushedMetalNormalTexture || undefined,
    });

    // Top VRM Heatsink
    const vrmTop = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.38, 1.25), heatsinkMat);
    vrmTop.position.set(-0.41, 1.38, -0.38);
    vrmTop.castShadow = true;
    mobo.add(vrmTop);

    // Left I/O Armor & Heatsink Tower
    const ioArmor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.85, 0.48), heatsinkMat);
    ioArmor.position.set(-0.40, 0.62, -0.96);
    ioArmor.castShadow = true;
    mobo.add(ioArmor);

    // Embedded Copper Heatpipe interconnecting top and left VRM heatsinks
    const vrmPipeMat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.96, roughness: 0.15 });
    const vrmPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.1, 16), vrmPipeMat);
    vrmPipe.rotation.x = Math.PI / 2;
    vrmPipe.position.set(-0.35, 1.2, -0.7);
    mobo.add(vrmPipe);

    // Solid Polymer VRM Capacitors (Cylindrical silver cans with black polar marking)
    const capMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.96, roughness: 0.12 });
    for (let c = 0; c < 10; c++) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 16), capMat);
      cap.rotation.z = Math.PI / 2;
      cap.position.set(-0.48, 1.15, -0.85 + c * 0.12);
      mobo.add(cap);
    }

    // Audio Section Nichicon Gold Filtering Capacitors
    const goldCapMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.92, roughness: 0.2 });
    for (let a = 0; a < 4; a++) {
      const gCap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 16), goldCapMat);
      gCap.rotation.z = Math.PI / 2;
      gCap.position.set(-0.48, -0.65 + a * 0.1, -1.05);
      mobo.add(gCap);
    }

    // 2-Digit 7-Segment Diagnostic Debug Display (Glowing A0)
    if (this.debugLedTexture) {
      const debugMat = new THREE.MeshBasicMaterial({ map: this.debugLedTexture });
      const debugMesh = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.16), debugMat);
      debugMesh.position.set(-0.51, 1.45, 0.95);
      mobo.add(debugMesh);
    }

    // 24-Pin ATX Power Socket Housing
    const atxMat = new THREE.MeshStandardMaterial({ color: 0x090a0d, roughness: 0.85 });
    const atxSocket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.16), atxMat);
    atxSocket.position.set(-0.48, 0.7, 1.05);
    mobo.add(atxSocket);

    // M.2 Aluminum Armor Heatsink with laser branding
    const m2Armor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 1.2), heatsinkMat);
    m2Armor.position.set(-0.48, -0.4, 0.2);
    mobo.add(m2Armor);

    // Blue Thermal Pad Peek beneath M.2 heatsink
    const padMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.9 });
    const thermalPad = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 1.1), padMat);
    thermalPad.position.set(-0.51, -0.4, 0.2);
    mobo.add(thermalPad);

    // Chipset Heatsink with geometric chamfer
    const chipsetHeatsink = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.65), heatsinkMat);
    chipsetHeatsink.position.set(-0.46, -0.5, 0.65);
    mobo.add(chipsetHeatsink);

    // CMOS Coin Cell Battery (CR2032 mirror steel)
    const cmosMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.98, roughness: 0.08 });
    const cmosBattery = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 24), cmosMat);
    cmosBattery.rotation.z = Math.PI / 2;
    cmosBattery.position.set(-0.51, -0.15, -0.4);
    mobo.add(cmosBattery);

    // PCIe 5.0 Steel Reinforced Armor Slots
    const pcieMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.15 });
    const pcie1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 1.55), pcieMat);
    pcie1.position.set(-0.48, -0.05, 0.2);
    mobo.add(pcie1);

    const pcie2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 1.55), pcieMat);
    pcie2.position.set(-0.48, -0.65, 0.2);
    mobo.add(pcie2);

    // 4x DDR5 Memory Slots with locking clips
    const slotMat = new THREE.MeshStandardMaterial({ color: 0x090a0d, roughness: 0.8 });
    const clipMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.3 });
    const ramZOffsets = [0.18, 0.28, 0.38, 0.48];
    ramZOffsets.forEach((z) => {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.04), slotMat);
      slot.position.set(-0.5, 0.7, z);
      mobo.add(slot);

      const clipTop = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.05), clipMat);
      clipTop.position.set(-0.49, 1.04, z);
      mobo.add(clipTop);
      const clipBtm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.05), clipMat);
      clipBtm.position.set(-0.49, 0.36, z);
      mobo.add(clipBtm);
    });

    this.registerInteractive(mobo, 'motherboard');
    this.moboGroup.add(mobo);
  }

  // --- 3. CPU MODEL ---
  private buildCPUModel(part: PCBuild['cpu'], _settings: StudioSettings) {
    if (!part) return;

    const cpu = new THREE.Group();

    // Socket Retention Bracket (Stainless steel latch mechanism)
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.94, roughness: 0.18 });
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.68, 0.68), bracketMat);
    bracket.position.set(-0.5, 0.7, -0.1);
    cpu.add(bracket);

    // Socket Lever Arm (Stainless steel down-locked rod)
    const leverMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.98, roughness: 0.1 });
    const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.65, 12), leverMat);
    lever.position.set(-0.45, 0.7, 0.28);
    cpu.add(lever);

    // Integrated Heat Spreader (IHS - Nickel Plated Copper Mirror Finish)
    const ihsMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.98,
      roughness: 0.10,
    });
    const ihs = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.52, 0.52), ihsMat);
    ihs.position.set(-0.45, 0.7, -0.1);
    ihs.castShadow = true;
    cpu.add(ihs);

    // Golden Alignment Corner Triangle
    const triMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.95, roughness: 0.1 });
    const triangle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.06), triMat);
    triangle.position.set(-0.448, 0.92, -0.32);
    cpu.add(triangle);

    this.registerInteractive(cpu, 'cpu');
    this.cpuGroup.add(cpu);
  }

  // --- 4. RAM MODEL ---
  private buildRAMModel(part: PCBuild['ram'], _settings: StudioSettings) {
    if (!part) return;

    const ramGroup = new THREE.Group();
    const isWhite = part.color === 'white';
    const stickMat = new THREE.MeshStandardMaterial({
      color: isWhite ? 0xffffff : 0x14161d,
      metalness: 0.92,
      roughness: 0.18,
      normalMap: this.brushedMetalNormalTexture || undefined,
    });

    const rgbMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 2.4,
      roughness: 0.1,
    });
    this.rgbMaterials.push(rgbMat);

    const stickOffsets = [0.28, 0.48];

    stickOffsets.forEach((zOffset) => {
      const stick = new THREE.Group();

      // Billet Aluminum Heatspreader with precision beveled edges
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.68, 0.05), stickMat);
      body.position.set(-0.46, 0.7, zOffset);
      body.castShadow = true;
      stick.add(body);

      // Polished Chamfer Ridge Line
      const ridgeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.98, roughness: 0.08 });
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.02, 0.05), ridgeMat);
      ridge.position.set(-0.458, 0.92, zOffset);
      stick.add(ridge);

      // Diamond-Cut Top ARGB Light Diffuser
      if (part.visuals.hasRGB) {
        const lightbar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.06), rgbMat);
        lightbar.position.set(-0.42, 0.7, zOffset);
        stick.add(lightbar);
      }

      ramGroup.add(stick);
    });

    this.registerInteractive(ramGroup, 'ram');
    this.ramGroup.add(ramGroup);
  }

  // --- 5. STORAGE MODEL ---
  private buildStorageModel(part: PCBuild['storage'], _settings: StudioSettings) {
    if (!part) return;

    const ssdGroup = new THREE.Group();
    const ssdMat = new THREE.MeshStandardMaterial({ color: 0x181a22, metalness: 0.85, roughness: 0.25 });
    const ssd = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.48), ssdMat);
    ssd.position.set(-0.48, -0.25, 0.2);

    const screwMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.95, roughness: 0.1 });
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12), screwMat);
    screw.rotation.z = Math.PI / 2;
    screw.position.set(-0.44, -0.25, 0.42);
    ssdGroup.add(screw);

    if (part.visuals.hasRGB) {
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 1.8,
      });
      this.rgbMaterials.push(ledMat);
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.04), ledMat);
      led.position.set(-0.44, -0.25, 0.2);
      ssdGroup.add(led);
    }

    ssdGroup.add(ssd);
    this.registerInteractive(ssdGroup, 'storage');
    this.storageGroup.add(ssdGroup);
  }

  // --- 6. MASTER-CRAFT HIGH-FIDELITY GPU MODEL ---
  private buildGPUModel(part: PCBuild['gpu'], settings: StudioSettings) {
    if (!part) return;

    const gpu = new THREE.Group();
    const isWhite = part.color === 'white';
    const isVertical = !!settings.gpuVertical;

    // Materials with realistic metal reflections and accurate albedo
    const shroudMat = new THREE.MeshStandardMaterial({
      map: this.gpuShroudTexture || undefined,
      color: isWhite ? 0xf8fafc : 0xd1d5db,
      metalness: 0.90,
      roughness: 0.20,
    });

    const backplateMat = new THREE.MeshStandardMaterial({
      map: this.gpuBackplateTexture || undefined,
      color: isWhite ? 0xf1f5f9 : 0xcccccc,
      metalness: 0.95,
      roughness: 0.16,
      normalMap: this.brushedMetalNormalTexture || undefined,
    });

    const finStackMat = new THREE.MeshStandardMaterial({
      color: isWhite ? 0xffffff : 0xb0b8c4,
      metalness: 0.96,
      roughness: 0.18,
      normalMap: this.radiatorFinNormalTexture || undefined,
    });

    const copperPipeMat = new THREE.MeshStandardMaterial({
      color: 0xc26118,
      metalness: 0.98,
      roughness: 0.10,
    });

    const nickelPipeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.98,
      roughness: 0.08,
    });

    const bracketMat = new THREE.MeshStandardMaterial({
      map: this.gpuPortTexture || undefined,
      color: 0xffffff,
      metalness: 0.95,
      roughness: 0.15,
    });

    const fanMat = new THREE.MeshStandardMaterial({
      color: isWhite ? 0xffffff : 0x111317,
      metalness: 0.35,
      roughness: 0.30,
    });

    const fanHubMat = new THREE.MeshStandardMaterial({
      map: this.fanHubTexture || undefined,
      color: 0xffffff,
      metalness: 0.98,
      roughness: 0.06,
    });

    const rgbMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.8,
      roughness: 0.1,
    });
    if (part.visuals.hasRGB) {
      this.rgbMaterials.push(rgbMat);
    }

    // Modern 3-Slot Flagship Triple-Fan GPU Dimensions
    const cardLength = 2.65;
    const cardDepth = 1.08;   // X axis (from motherboard to glass)
    const cardHeight = 0.58;  // Y axis (3-slot thickness)

    const cardPivot = new THREE.Group();

    // 1. Dense Silver Aluminum Heatsink Fin-Stack Assembly
    const finStack = new THREE.Mesh(new THREE.BoxGeometry(cardDepth - 0.14, cardHeight - 0.14, cardLength - 0.16), finStackMat);
    finStack.position.set(0, 0, 0);
    finStack.castShadow = true;
    cardPivot.add(finStack);

    // 2. Sculpted Armor Shroud Frame
    const shroudOuter = new THREE.Mesh(new THREE.BoxGeometry(cardDepth - 0.04, cardHeight - 0.08, cardLength), shroudMat);
    shroudOuter.position.set(0, 0, 0);
    shroudOuter.castShadow = true;
    cardPivot.add(shroudOuter);

    // 3. Exposed Heavy Heatpipes (4 thick copper & nickel pipes looping through heatsink)
    for (let p = 0; p < 4; p++) {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.026, 0.026, cardLength - 0.22, 16),
        p % 2 === 0 ? copperPipeMat : nickelPipeMat
      );
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(
        cardDepth / 2 - 0.08,
        -cardHeight / 2 + 0.12 + p * 0.11,
        0
      );
      cardPivot.add(pipe);
    }

    // 4. Brushed Metal Backplate (Top surface)
    const backplate = new THREE.Mesh(
      new THREE.BoxGeometry(cardDepth - 0.04, 0.035, cardLength - 0.04),
      backplateMat
    );
    backplate.position.set(0, cardHeight / 2 + 0.015, 0);
    cardPivot.add(backplate);

    // Flow-through rear cooling fin window
    const flowThroughFin = new THREE.Mesh(
      new THREE.BoxGeometry(cardDepth * 0.60, 0.04, 0.65),
      finStackMat
    );
    flowThroughFin.position.set(0, cardHeight / 2 + 0.02, cardLength * 0.28);
    cardPivot.add(flowThroughFin);

    // 5. Triple Axial Fan Array (with proper horizontal X-Z plane alignment)
    const fanZPositions = [-0.72, 0.0, 0.72];
    fanZPositions.forEach((fz, fanIdx) => {
      // Recessed Fan Cowling Bezel
      const bayBezelMat = new THREE.MeshStandardMaterial({
        color: isWhite ? 0xe2e8f0 : 0x222632,
        metalness: 0.92,
        roughness: 0.18,
      });
      const bayRim = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.022, 16, 36), bayBezelMat);
      bayRim.rotation.x = Math.PI / 2;
      bayRim.position.set(0, -cardHeight / 2 - 0.032, fz);
      cardPivot.add(bayRim);

      // Fan Rotor Pivot Group
      const fanPivot = new THREE.Group();
      fanPivot.position.set(0, -cardHeight / 2 - 0.035, fz);

      // Holographic Center Magnetic Hub
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.035, 24), fanHubMat);
      fanPivot.add(hub);

      // 9 Sculpted Curved Aerofoil Fan Blades radiating outward in the X-Z plane
      const bladeCount = 9;
      for (let b = 0; b < bladeCount; b++) {
        const angle = (b * Math.PI * 2) / bladeCount;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.008, 0.22), fanMat);
        const r = 0.23;
        blade.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
        blade.rotation.y = -angle;
        blade.rotation.x = fanIdx === 1 ? -0.32 : 0.32; // Center fan counter-rotates!
        fanPivot.add(blade);
      }

      // Outer Barrier Ring (Horizontal X-Z plane)
      const barrierRingMat = new THREE.MeshStandardMaterial({
        color: isWhite ? 0xf1f5f9 : 0x181a22,
        roughness: 0.35,
      });
      const barrierRing = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.012, 8, 32), barrierRingMat);
      barrierRing.rotation.x = Math.PI / 2;
      fanPivot.add(barrierRing);

      (fanPivot as any).userData = { isGpuFan: true, isReversed: fanIdx === 1 };
      this.spinningFans.push(fanPivot);
      cardPivot.add(fanPivot);
    });

    // 6. Side ARGB Illuminated "GEFORCE RTX" Logo Plate (facing glass)
    const logoBaseMat = new THREE.MeshStandardMaterial({
      color: 0x090a10,
      metalness: 0.92,
      roughness: 0.18,
    });
    const logoPlate = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 1.25), logoBaseMat);
    logoPlate.position.set(cardDepth / 2 + 0.01, 0.12, -0.1);
    cardPivot.add(logoPlate);

    if (part.visuals.hasRGB) {
      const logoLight = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.10, 0.95), rgbMat);
      logoLight.position.set(cardDepth / 2 + 0.02, 0.12, -0.1);
      cardPivot.add(logoLight);
    }

    // 7. 12V-2x6 / 16-Pin Power Connector Receptacle
    const portHousingMat = new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.85 });
    const pwrSocket = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.19), portHousingMat);
    pwrSocket.position.set(cardDepth / 2 - 0.02, 0.18, 0.45);
    cardPivot.add(pwrSocket);

    // 8. Rear 3-Slot Stainless Steel I/O Bracket
    const ioBracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, cardHeight * 1.2, cardDepth * 0.92),
      bracketMat
    );
    ioBracket.rotation.y = Math.PI / 2;
    ioBracket.position.set(0, 0.02, -cardLength / 2 - 0.015);
    cardPivot.add(ioBracket);

    // 9. PCIe 5.0 Gold Contact Finger Connector (Motherboard side)
    const goldPcbMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, metalness: 0.96, roughness: 0.12 });
    const pcieTab = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 1.35), goldPcbMat);
    pcieTab.position.set(-cardDepth / 2 + 0.04, cardHeight / 2 + 0.07, -0.2);
    cardPivot.add(pcieTab);

    // 10. CNC Billet Aluminum Anti-Sag Support Arm
    const sagMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.95, roughness: 0.15 });
    const sagPost = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.75, 16), sagMat);
    sagPost.position.set(cardDepth / 2 - 0.05, -cardHeight / 2 - 0.42, cardLength / 2 - 0.15);
    cardPivot.add(sagPost);

    const sagCradle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.08), sagMat);
    sagCradle.position.set(cardDepth / 2 - 0.05, -cardHeight / 2 - 0.06, cardLength / 2 - 0.15);
    cardPivot.add(sagCradle);

    // Placement in Case
    if (isVertical) {
      cardPivot.rotation.z = Math.PI / 2;
      cardPivot.position.set(0.32, -0.15, 0.35);
    } else {
      cardPivot.rotation.z = 0;
      cardPivot.position.set(0.02, -0.05, 0.35);
    }

    gpu.add(cardPivot);
    this.registerInteractive(gpu, 'gpu');
    this.gpuGroup.add(gpu);
  }

  // --- 7. CPU COOLER MODEL ---
  private buildCoolerModel(part: PCBuild['cooler'], _settings: StudioSettings) {
    if (!part) return;

    const cooler = new THREE.Group();
    const isAIO = part.coolerType?.startsWith('AIO');
    const isWhite = part.color === 'white';

    if (isAIO) {
      // 1. Top Aluminum Radiator Core with High-Density Fin Texturing
      const radMat = new THREE.MeshStandardMaterial({
        color: isWhite ? 0xf8fafc : 0x111216,
        metalness: 0.88,
        roughness: 0.26,
        normalMap: this.radiatorFinNormalTexture || undefined,
      });
      const rad = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.24, 3.2), radMat);
      rad.position.set(0, 1.72, 0);
      rad.castShadow = true;
      cooler.add(rad);

      // Radiator Fans (3x 120mm RGB Fans)
      const fanPositions = [-0.9, 0, 0.9];
      fanPositions.forEach((z) => {
        const fanUnit = this.createCaseFanMesh(isWhite, true);
        fanUnit.position.set(0, 1.5, z);
        fanUnit.rotation.x = Math.PI / 2;
        cooler.add(fanUnit);
      });

      // 2. AIO Pump Block over CPU with LCD Display or ARGB Halo
      const pumpBlock = new THREE.Group();
      pumpBlock.position.set(-0.35, 0.7, -0.1);

      const pumpBodyMat = new THREE.MeshStandardMaterial({
        color: isWhite ? 0xffffff : 0x101115,
        metalness: 0.95,
        roughness: 0.12,
        normalMap: this.brushedMetalNormalTexture || undefined,
      });
      const pumpCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 36), pumpBodyMat);
      pumpCylinder.rotation.z = Math.PI / 2;
      pumpBlock.add(pumpCylinder);

      // CNC Machined Chamfer Bezel Ring
      const bezelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.98, roughness: 0.08 });
      const bezelRing = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.02, 16, 36), bezelMat);
      bezelRing.rotation.y = Math.PI / 2;
      bezelRing.position.set(0.11, 0, 0);
      pumpBlock.add(bezelRing);

      // High-Contrast LCD Screen Face or ARGB Ring
      if (part.visuals.lcdScreen && this.lcdTexture) {
        const lcdMat = new THREE.MeshBasicMaterial({ map: this.lcdTexture });
        const lcdMesh = new THREE.Mesh(new THREE.CircleGeometry(0.30, 36), lcdMat);
        lcdMesh.rotation.y = Math.PI / 2;
        lcdMesh.position.set(0.12, 0, 0);
        pumpBlock.add(lcdMesh);
      } else {
        const pumpRgbMat = new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x06b6d4,
          emissiveIntensity: 2.4,
        });
        this.rgbMaterials.push(pumpRgbMat);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 16, 36), pumpRgbMat);
        ring.rotation.y = Math.PI / 2;
        ring.position.set(0.12, 0, 0);
        pumpBlock.add(ring);
      }
      cooler.add(pumpBlock);

      // 3. Braided Sleeved Coolant Lines with Knurled Rotary Fittings
      const tubeMat = new THREE.MeshStandardMaterial({
        map: this.cableBraidedTexture || undefined,
        color: isWhite ? 0x94a3b8 : 0x18181f,
        roughness: 0.75,
        metalness: 0.2,
      });
      const fittingMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.98, roughness: 0.08 });

      const curve1 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.2, 1.55, 0.8),
        new THREE.Vector3(0.4, 1.2, 0.5),
        new THREE.Vector3(0.1, 0.85, 0.1),
        new THREE.Vector3(-0.25, 0.75, -0.05),
      ]);
      const tube1 = new THREE.Mesh(new THREE.TubeGeometry(curve1, 32, 0.045, 16, false), tubeMat);
      cooler.add(tube1);

      const curve2 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.2, 1.55, 1.0),
        new THREE.Vector3(0.45, 1.15, 0.6),
        new THREE.Vector3(0.15, 0.75, 0.15),
        new THREE.Vector3(-0.25, 0.65, -0.15),
      ]);
      const tube2 = new THREE.Mesh(new THREE.TubeGeometry(curve2, 32, 0.045, 16, false), tubeMat);
      cooler.add(tube2);

      // Metallic swivel fitting collars at pump
      const fitting1 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.06, 20), fittingMat);
      fitting1.position.set(-0.25, 0.75, -0.05);
      cooler.add(fitting1);

      const fitting2 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.06, 20), fittingMat);
      fitting2.position.set(-0.25, 0.65, -0.15);
      cooler.add(fitting2);
    } else {
      // Massive Dual-Tower Air Cooler (Noctua / DeepCool Assassin style)
      const heatsinkMat = new THREE.MeshStandardMaterial({
        color: isWhite ? 0xffffff : 0xd1d5db,
        metalness: 0.94,
        roughness: 0.18,
        normalMap: this.radiatorFinNormalTexture || undefined,
      });

      const tower1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.92, 0.92), heatsinkMat);
      tower1.position.set(-0.2, 0.7, -0.4);
      tower1.castShadow = true;
      cooler.add(tower1);

      const tower2 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.92, 0.92), heatsinkMat);
      tower2.position.set(-0.2, 0.7, 0.2);
      tower2.castShadow = true;
      cooler.add(tower2);

      // Copper Heatpipe End Caps
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.96, roughness: 0.12 });
      for (let p = -0.3; p <= 0.3; p += 0.15) {
        const cap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 16), pipeMat);
        cap1.position.set(-0.2, 1.18, -0.4 + p);
        cooler.add(cap1);
        const cap2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 16), pipeMat);
        cap2.position.set(-0.2, 1.18, 0.2 + p);
        cooler.add(cap2);
      }

      const centerFan = this.createCaseFanMesh(isWhite, part.visuals.hasRGB);
      centerFan.position.set(-0.2, 0.7, -0.1);
      cooler.add(centerFan);
    }

    this.registerInteractive(cooler, 'cooler');
    this.coolerGroup.add(cooler);
  }

  // --- 8. PSU MODEL ---
  private buildPSUModel(part: PCBuild['psu'], _settings: StudioSettings) {
    if (!part) return;

    const psu = new THREE.Group();
    const isWhite = part.color === 'white';
    const psuMat = new THREE.MeshStandardMaterial({
      color: isWhite ? 0xffffff : 0x111216,
      metalness: 0.88,
      roughness: 0.32,
      normalMap: this.brushedMetalNormalTexture || undefined,
    });

    const psuBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.68, 1.45), psuMat);
    psuBody.position.set(0, -1.48, -0.8);
    psuBody.castShadow = true;
    psu.add(psuBody);

    // 80+ Platinum Specification Badge
    const badgeMat = new THREE.MeshStandardMaterial({
      map: this.psuLabelTexture || undefined,
      color: 0xffffff,
      metalness: 0.3,
      roughness: 0.4,
    });
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.34, 0.85), badgeMat);
    badge.position.set(0.81, -1.48, -0.8);
    psu.add(badge);

    // Rear AC power rocker switch & C14 inlet socket
    const switchMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    const rockerSwitch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), switchMat);
    rockerSwitch.position.set(0.4, -1.48, -1.53);
    psu.add(rockerSwitch);

    this.registerInteractive(psu, 'psu');
    this.psuGroup.add(psu);
  }

  // --- 9. FANS MODEL ---
  private buildFansModel(part: PCBuild['fans'], _settings: StudioSettings) {
    if (!part) return;

    const fans = new THREE.Group();
    const isWhite = part.color === 'white';
    const hasRGB = part.visuals.hasRGB;

    const rearFan = this.createCaseFanMesh(isWhite, hasRGB);
    rearFan.position.set(-0.2, 0.7, -1.68);
    fans.add(rearFan);

    const frontYPositions = [1.25, 0.35, -0.55];
    frontYPositions.forEach((y) => {
      const frontFan = this.createCaseFanMesh(isWhite, hasRGB);
      frontFan.position.set(0, y, 1.72);
      fans.add(frontFan);
    });

    this.registerInteractive(fans, 'fans');
    this.fansGroup.add(fans);
  }

  // --- 10. HIGH-END PARACORD BRAIDED SLEEVED CABLING HARNESS ---
  private buildCablesModel(part: PCBuild['cables'] | null, _build: PCBuild, settings: StudioSettings) {
    const cables = new THREE.Group();
    const isWhite = part?.color === 'white';
    const isRGB = part?.visuals?.hasRGB || false;

    let wireMat: THREE.MeshStandardMaterial;
    if (isRGB) {
      wireMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.3,
        roughness: 0.25,
        metalness: 0.1,
      });
      this.rgbMaterials.push(wireMat);
    } else {
      wireMat = new THREE.MeshStandardMaterial({
        map: this.cableBraidedTexture || undefined,
        color: isWhite ? 0xf8fafc : 0x222632,
        roughness: 0.65,
        metalness: 0.20,
      });
    }

    const combMat = new THREE.MeshStandardMaterial({
      color: isWhite ? 0xffffff : 0x475569,
      metalness: 0.95,
      roughness: 0.12,
    });

    const connectorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0c10,
      roughness: 0.85,
    });

    // 1. Motherboard 24-Pin ATX Cable Harness (12 tightly combed strands in 2 layers of 6)
    const atxPlug = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.40, 0.14), connectorMat);
    atxPlug.position.set(-0.46, 0.70, 1.05);
    cables.add(atxPlug);

    const wireCount = 6;
    for (let layer = 0; layer < 2; layer++) {
      const layerOffset = (layer - 0.5) * 0.024;
      for (let w = 0; w < wireCount; w++) {
        const wireOffset = (w - (wireCount - 1) / 2) * 0.022;
        const curve = new THREE.CatmullRomCurve3([
          // Emerging from motherboard tray grommet
          new THREE.Vector3(-0.48 + layerOffset, 0.50 + wireOffset, 1.25),
          // Clean, tight ergonomic S-curve arc hugging motherboard tray
          new THREE.Vector3(-0.35 + layerOffset, 0.58 + wireOffset, 1.18),
          new THREE.Vector3(-0.37 + layerOffset, 0.66 + wireOffset, 1.10),
          // Entering 24-pin socket securely
          new THREE.Vector3(-0.46, 0.70 + wireOffset, 1.05 + layerOffset),
        ]);
        const wireMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.011, 8, false), wireMat);
        wireMesh.castShadow = true;
        cables.add(wireMesh);
      }
    }

    // Billet Aluminum Cable Combs clamping the 24-Pin harness
    const atxComb1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.04), combMat);
    atxComb1.position.set(-0.36, 0.57, 1.20);
    atxComb1.rotation.y = 0.45;
    cables.add(atxComb1);

    const atxComb2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.04), combMat);
    atxComb2.position.set(-0.40, 0.67, 1.11);
    atxComb2.rotation.y = 0.55;
    cables.add(atxComb2);

    // 2. GPU 12V-2x6 / 16-Pin Power Cable Harness (8 tightly combed strands in 2 layers of 4)
    const isVertical = !!settings.gpuVertical;
    const gpuPlug = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.16), connectorMat);

    if (isVertical) {
      gpuPlug.position.set(0.32, 0.05, 0.85);
      cables.add(gpuPlug);

      for (let layer = 0; layer < 2; layer++) {
        const layerOffset = (layer - 0.5) * 0.022;
        for (let g = 0; g < 4; g++) {
          const gOffset = (g - 1.5) * 0.020;
          const gpuCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0.32 + layerOffset, -1.05, 0.85 + gOffset),
            new THREE.Vector3(0.40 + layerOffset, -0.55, 0.85 + gOffset),
            new THREE.Vector3(0.38 + layerOffset, -0.15, 0.85 + gOffset),
            new THREE.Vector3(0.32, 0.05 + layerOffset, 0.85 + gOffset),
          ]);
          const gpuWire = new THREE.Mesh(new THREE.TubeGeometry(gpuCurve, 20, 0.011, 8, false), wireMat);
          cables.add(gpuWire);
        }
      }
    } else {
      gpuPlug.position.set(0.44, 0.18, 0.85);
      cables.add(gpuPlug);

      for (let layer = 0; layer < 2; layer++) {
        const layerOffset = (layer - 0.5) * 0.022;
        for (let g = 0; g < 4; g++) {
          const gOffset = (g - 1.5) * 0.020;
          const gpuCurve = new THREE.CatmullRomCurve3([
            // Emerging vertically from PSU shroud top pass-through grommet
            new THREE.Vector3(0.38 + layerOffset, -1.05, 0.85 + gOffset),
            // Swooping up in a tight, parallel combed harness
            new THREE.Vector3(0.48 + layerOffset, -0.45, 0.85 + gOffset),
            new THREE.Vector3(0.48 + layerOffset, -0.05, 0.85 + gOffset),
            // Plugs securely into side 12V-2x6 socket
            new THREE.Vector3(0.44, 0.18 + gOffset, 0.85 + layerOffset),
          ]);
          const gpuWire = new THREE.Mesh(new THREE.TubeGeometry(gpuCurve, 20, 0.011, 8, false), wireMat);
          gpuWire.castShadow = true;
          cables.add(gpuWire);
        }
      }

      // GPU Billet Aluminum Cable Comb
      const gpuComb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.18), combMat);
      gpuComb.position.set(0.48, -0.45, 0.85);
      cables.add(gpuComb);
    }

    // 3. Dual 8-Pin CPU EPS Cables (Top-Left Motherboard VRM Corner)
    for (let c = 0; c < 4; c++) {
      const cOffset = (c - 1.5) * 0.022;
      const epsCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.35, 1.58, -1.35 + cOffset),
        new THREE.Vector3(-0.38, 1.50, -1.20 + cOffset),
        new THREE.Vector3(-0.48, 1.42, -1.00 + cOffset),
      ]);
      const epsWire = new THREE.Mesh(new THREE.TubeGeometry(epsCurve, 16, 0.011, 8, false), wireMat);
      cables.add(epsWire);
    }

    this.registerInteractive(cables, 'cables');
    this.cablesGroup.add(cables);
  }

  // Realistic spinning case fan generator
  private createCaseFanMesh(isWhite: boolean, hasRGB: boolean): THREE.Group {
    const fanGroup = new THREE.Group();

    // Outer Fan Square Frame with rubber corner vibration pads
    const frameMat = new THREE.MeshStandardMaterial({
      color: isWhite ? 0xf8fafc : 0x111215,
      metalness: 0.78,
      roughness: 0.32,
    });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.88, 0.15), frameMat);
    fanGroup.add(frame);

    // Anti-Vibration Silicone Rubber Corner Pads
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.95 });
    const cornerOffsets = [
      [0.38, 0.38],
      [-0.38, 0.38],
      [0.38, -0.38],
      [-0.38, -0.38],
    ];
    cornerOffsets.forEach(([cx, cy]) => {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.16), rubberMat);
      pad.position.set(cx, cy, 0);
      fanGroup.add(pad);
    });

    // ARGB Diffusion Halo Ring
    if (hasRGB) {
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 2.4,
        roughness: 0.1,
      });
      this.rgbMaterials.push(ringMat);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.038, 16, 36), ringMat);
      fanGroup.add(ring);
    }

    // Rotating Rotor Hub & Swept Aerofoil Blades
    const rotor = new THREE.Group();
    const bladeMat = new THREE.MeshStandardMaterial({
      color: isWhite ? 0xffffff : 0x1c1e24,
      roughness: 0.32,
    });
    const hubMat = new THREE.MeshStandardMaterial({
      map: this.fanHubTexture || undefined,
      color: 0xffffff,
      metalness: 0.96,
      roughness: 0.08,
    });
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 24), hubMat);
    hub.rotation.x = Math.PI / 2;
    rotor.add(hub);

    const bladeCount = 9;
    for (let i = 0; i < bladeCount; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.29, 0.08), bladeMat);
      blade.rotation.z = (i * Math.PI * 2) / bladeCount;
      blade.rotation.x = 0.32;
      rotor.add(blade);
    }

    this.spinningFans.push(rotor);
    fanGroup.add(rotor);

    return fanGroup;
  }

  // =========================================================================
  // SETTINGS & VISUAL CONTROLS
  // =========================================================================

  public applySettings(settings: StudioSettings) {
    this.currentSettings = settings;

    // 1. Exploded View Offsets
    const exp = settings.explodedProgress;
    this.caseGroup.position.set(0, 0, exp * 0.8);
    this.moboGroup.position.set(-exp * 0.9, 0, 0);
    this.cpuGroup.position.set(-exp * 1.3, 0, 0);
    this.coolerGroup.position.set(exp * 1.2, exp * 0.8, -exp * 0.5);
    this.ramGroup.position.set(0, exp * 0.9, exp * 0.3);
    this.gpuGroup.position.set(exp * 1.4, -exp * 0.5, exp * 0.4);
    this.storageGroup.position.set(0, -exp * 0.8, 0);
    this.psuGroup.position.set(0, -exp * 1.1, -exp * 0.6);
    this.fansGroup.position.set(0, exp * 0.6, exp * 1.2);
    this.cablesGroup.position.set(exp * 0.7, -exp * 0.3, exp * 0.6);

    // 2. Glass Door Open/Close
    if (this.glassHingeGroup) {
      const targetAngle = settings.glassPanelOpen ? -Math.PI / 2.2 : 0;
      this.glassHingeGroup.rotation.y = targetAngle;
    }

    // 3. Thermal Airflow Mode
    if (this.thermalParticles) {
      this.thermalParticles.visible = settings.viewMode === 'thermals';
    }

    // 4. Wireframe / X-Ray / Normal Mode Material Restoration
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.material && mesh !== this.groundMesh) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (settings.viewMode === 'wireframe') {
            mat.wireframe = true;
          } else {
            mat.wireframe = false;
          }

          if (settings.viewMode === 'xray') {
            mat.transparent = true;
            mat.opacity = 0.25;
          } else {
            if (mesh !== this.glassPanel) {
              mat.transparent = false;
              mat.opacity = 1.0;
            } else {
              mat.transparent = true;
              mat.opacity = 0.28;
            }
          }
        }
      }
    });

    // 5. High-End Studio Environment Lighting Presets
    if (settings.environmentLighting === 'cyberpunk_neon') {
      this.scene.background = new THREE.Color(0x070812);
      this.rimLight.color.setHex(0xf43f5e);
      this.rimLight.intensity = 3.5;
      this.fillLight.color.setHex(0x06b6d4);
      this.fillLight.intensity = 3.2;
      this.mainSpotLight.color.setHex(0xfff5ea);
      this.mainSpotLight.intensity = 4.6;
      this.topLight.color.setHex(0xa855f7);
      this.topLight.intensity = 2.4;
      this.ambientLight.intensity = 0.65;
    } else if (settings.environmentLighting === 'studio_clean') {
      this.scene.background = new THREE.Color(0x0d1017);
      this.rimLight.color.setHex(0xffffff);
      this.rimLight.intensity = 3.4;
      this.fillLight.color.setHex(0xe2e8f0);
      this.fillLight.intensity = 3.4;
      this.mainSpotLight.color.setHex(0xffffff);
      this.mainSpotLight.intensity = 5.0;
      this.topLight.color.setHex(0xf8fafc);
      this.topLight.intensity = 2.5;
      this.ambientLight.intensity = 0.75;
    } else if (settings.environmentLighting === 'warm_amber') {
      this.scene.background = new THREE.Color(0x0a0806);
      this.rimLight.color.setHex(0xf59e0b);
      this.rimLight.intensity = 3.5;
      this.fillLight.color.setHex(0xd97706);
      this.fillLight.intensity = 3.2;
      this.mainSpotLight.color.setHex(0xffedd5);
      this.mainSpotLight.intensity = 4.6;
      this.topLight.color.setHex(0xfef3c7);
      this.topLight.intensity = 2.4;
      this.ambientLight.intensity = 0.70;
    } else {
      // Midnight Stealth (Default)
      this.scene.background = new THREE.Color(0x06070a);
      this.rimLight.color.setHex(0x38bdf8);
      this.rimLight.intensity = 3.4;
      this.fillLight.color.setHex(0x94a3b8);
      this.fillLight.intensity = 3.2;
      this.mainSpotLight.color.setHex(0xfffbf5);
      this.mainSpotLight.intensity = 4.8;
      this.topLight.color.setHex(0xf8fafc);
      this.topLight.intensity = 2.2;
      this.ambientLight.intensity = 0.70;
    }
  }

  // =========================================================================
  // CAMERA ORBIT & INTERACTION
  // =========================================================================

  private updateCameraPosition() {
    const { radius, theta, phi } = this.spherical;
    this.camera.position.x = this.cameraTarget.x + radius * Math.sin(phi) * Math.sin(theta);
    this.camera.position.y = this.cameraTarget.y + radius * Math.cos(phi);
    this.camera.position.z = this.cameraTarget.z + radius * Math.sin(phi) * Math.cos(theta);
    this.camera.lookAt(this.cameraTarget);
  }

  public setCameraPreset(preset: CameraPreset) {
    this.isTurntableActive = false;
    const presets: Record<CameraPreset, { radius: number; theta: number; phi: number; target: [number, number, number] }> = {
      hero: { radius: 6.2, theta: 0.75, phi: 1.15, target: [0, 0, 0] },
      internals: { radius: 4.2, theta: 1.55, phi: 1.35, target: [0, 0.2, 0] },
      gpu: { radius: 2.8, theta: 1.25, phi: 1.45, target: [0.1, -0.05, 0.5] },
      cpu: { radius: 2.6, theta: 1.45, phi: 1.20, target: [-0.35, 0.7, -0.1] },
      top: { radius: 5.5, theta: 0.0, phi: 0.15, target: [0, 0, 0] },
      rear: { radius: 5.8, theta: -2.35, phi: 1.25, target: [0, 0, 0] },
    };

    const cfg = presets[preset];
    if (cfg) {
      this.desiredSpherical = { radius: cfg.radius, theta: cfg.theta, phi: cfg.phi };
      this.desiredTarget.set(cfg.target[0], cfg.target[1], cfg.target[2]);
    }
  }

  public resetCamera() {
    this.setCameraPreset('hero');
  }

  public zoomBy(delta: number) {
    this.desiredSpherical.radius = Math.max(1.5, Math.min(12.0, this.desiredSpherical.radius + delta));
  }

  public focusOnCategory(cat: PCCategory | null) {
    if (!cat) {
      this.resetCamera();
      return;
    }
    const targetMap: Record<PCCategory, { target: [number, number, number]; radius: number; theta?: number; phi?: number }> = {
      case: { target: [0, 0, 0], radius: 6.2, theta: 0.75, phi: 1.15 },
      motherboard: { target: [-0.5, 0.4, 0], radius: 3.2, theta: 1.45, phi: 1.3 },
      cpu: { target: [-0.45, 0.7, -0.1], radius: 2.2, theta: 1.45, phi: 1.2 },
      cooler: { target: [0, 1.2, 0], radius: 3.6, theta: 1.2, phi: 1.1 },
      ram: { target: [-0.46, 0.7, 0.35], radius: 2.2, theta: 1.35, phi: 1.25 },
      gpu: { target: [0.1, -0.05, 0.5], radius: 3.0, theta: 1.25, phi: 1.4 },
      storage: { target: [-0.48, -0.25, 0.2], radius: 2.2, theta: 1.45, phi: 1.35 },
      psu: { target: [0, -1.45, -0.8], radius: 3.5, theta: 1.1, phi: 1.35 },
      fans: { target: [0, 0.4, 1.7], radius: 3.8, theta: 0.2, phi: 1.2 },
      cables: { target: [0.2, -0.2, 0.7], radius: 3.0, theta: 1.3, phi: 1.3 },
    };

    const config = targetMap[cat];
    if (config) {
      this.desiredTarget.set(config.target[0], config.target[1], config.target[2]);
      this.desiredSpherical.radius = config.radius;
      if (config.theta !== undefined) this.desiredSpherical.theta = config.theta;
      if (config.phi !== undefined) this.desiredSpherical.phi = config.phi;
    }
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    if (this.isTurntableActive && !this.isMouseDown && !this.isRightMouseDown) {
      this.desiredSpherical.theta += delta * this.turntableSpeed;
    }

    const lerpFactor = Math.min(1.0, delta * 7.5);
    this.spherical.radius += (this.desiredSpherical.radius - this.spherical.radius) * lerpFactor;
    this.spherical.theta += (this.desiredSpherical.theta - this.spherical.theta) * lerpFactor;
    this.spherical.phi += (this.desiredSpherical.phi - this.spherical.phi) * lerpFactor;
    this.cameraTarget.lerp(this.desiredTarget, lerpFactor);
    this.updateCameraPosition();

    // Fan spinning animation based on power & fan speed
    const isPowered = this.currentSettings?.isPoweredOn ?? true;
    const fanSpeedMultiplier = isPowered ? (this.currentSettings?.fanSpeed ?? 75) / 100 : 0;

    if (fanSpeedMultiplier > 0) {
      const rotationStep = delta * Math.PI * 9 * fanSpeedMultiplier;
      this.spinningFans.forEach((fan) => {
        if ((fan as any).userData?.isGpuFan) {
          const dir = (fan as any).userData?.isReversed ? -1 : 1;
          fan.rotation.y += rotationStep * dir;
        } else {
          fan.rotation.z += rotationStep;
        }
      });
    }

    // RGB Lighting Engine + Realistic Bounce Illumination
    if (this.currentSettings && isPowered && this.currentSettings.rgb.enabled) {
      const { mode, color1, color2, speed, brightness } = this.currentSettings.rgb;
      const t = elapsedTime * speed;
      let primaryHex = 0x06b6d4;

      this.rgbMaterials.forEach((mat, idx) => {
        let finalHex = 0x06b6d4;
        if (mode === 'rainbow') {
          const hue = (t * 0.2 + idx * 0.15) % 1.0;
          const color = new THREE.Color().setHSL(hue, 1.0, 0.55);
          finalHex = color.getHex();
        } else if (mode === 'breathing') {
          const intensity = 0.5 + 0.5 * Math.sin(t * 2);
          const c1 = new THREE.Color(color1);
          finalHex = c1.getHex();
          mat.emissiveIntensity = intensity * (brightness / 100) * 2.8;
        } else if (mode === 'synthwave') {
          const mixFactor = 0.5 + 0.5 * Math.sin(t * 1.5 + idx * 0.4);
          const c1 = new THREE.Color(color1 || '#ec4899');
          const c2 = new THREE.Color(color2 || '#06b6d4');
          const blended = c1.clone().lerp(c2, mixFactor);
          finalHex = blended.getHex();
        } else {
          finalHex = new THREE.Color(color1).getHex();
        }

        if (idx === 0) primaryHex = finalHex;
        mat.color.setHex(finalHex);
        mat.emissive.setHex(finalHex);
        if (mode !== 'breathing') {
          mat.emissiveIntensity = 2.4 * (brightness / 100);
        }
      });

      const lightIntensity = (brightness / 100) * 2.2;
      this.internalRgbLight1.color.setHex(primaryHex);
      this.internalRgbLight1.intensity = lightIntensity;
      this.internalRgbLight2.color.setHex(primaryHex);
      this.internalRgbLight2.intensity = lightIntensity * 0.9;
      this.internalRgbLight3.color.setHex(primaryHex);
      this.internalRgbLight3.intensity = lightIntensity * 0.75;
    } else if (!isPowered) {
      this.rgbMaterials.forEach((mat) => {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      });
      this.internalRgbLight1.intensity = 0;
      this.internalRgbLight2.intensity = 0;
      this.internalRgbLight3.intensity = 0;
    }

    // Thermal Airflow Particle Dynamics
    this.updateThermalParticles(delta);

    // LCD screen update
    if (this.lcdCanvas && isPowered) {
      const now = performance.now();
      if (now - this.lastLcdUpdate > 250) {
        this.lastLcdUpdate = now;
        const simulatedTemp = 36 + Math.sin(elapsedTime * 0.5) * 4 + (fanSpeedMultiplier < 0.3 ? 16 : 0);
        const simulatedClock = 5.4 + Math.cos(elapsedTime * 0.8) * 0.2;
        const pumpRpm = Math.round(1450 + fanSpeedMultiplier * 1200);
        this.updateLCDScreen(simulatedTemp, simulatedClock, pumpRpm);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  private setupEventListeners() {
    const el = this.renderer.domElement;

    el.addEventListener('mousedown', this.boundOnMouseDown);
    window.addEventListener('mouseup', this.boundOnMouseUp);
    el.addEventListener('contextmenu', this.boundOnContextMenu);
    el.addEventListener('mousemove', this.boundOnMouseMove);
    el.addEventListener('wheel', this.boundOnWheel, { passive: false });
    el.addEventListener('click', this.boundOnClick);

    el.addEventListener('touchstart', this.boundOnTouchStart, { passive: true });
    el.addEventListener('touchmove', this.boundOnTouchMove, { passive: true });
    el.addEventListener('touchend', this.boundOnTouchEnd, { passive: true });

    window.addEventListener('resize', this.boundOnResize);

    if (typeof ResizeObserver !== 'undefined' && this.container) {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(this.container);
    }
  }

  private handleRaycastClick() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.rootGroup.children, true);

    if (intersects.length > 0) {
      let current: THREE.Object3D | null = intersects[0].object;
      while (current && current !== this.rootGroup) {
        if (this.interactiveMeshes.has(current)) {
          const category = this.interactiveMeshes.get(current);
          if (category && this.callbacks.onSelectCategory) {
            this.callbacks.onSelectCategory(category);
            return;
          }
        }
        current = current.parent;
      }
    }
  }

  private handleRaycastHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.rootGroup.children, true);

    if (intersects.length > 0) {
      let current: THREE.Object3D | null = intersects[0].object;
      let matchedCategory: PCCategory | null = null;
      let matchedMesh: THREE.Object3D | null = null;

      while (current && current !== this.rootGroup) {
        if (this.interactiveMeshes.has(current)) {
          matchedCategory = this.interactiveMeshes.get(current) || null;
          matchedMesh = current;
          break;
        }
        current = current.parent;
      }

      if (matchedCategory !== this.hoveredCategory) {
        this.hoveredCategory = matchedCategory;
        this.hoveredMesh = matchedMesh;
        if (this.callbacks.onHoverCategory) {
          this.callbacks.onHoverCategory(matchedCategory);
        }
      }
    } else {
      if (this.hoveredCategory !== null) {
        this.hoveredCategory = null;
        this.hoveredMesh = null;
        if (this.callbacks.onHoverCategory) {
          this.callbacks.onHoverCategory(null);
        }
      }
    }
  }

  public handleResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width <= 0 || height <= 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public captureSnapshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const el = this.renderer?.domElement;
    if (el) {
      el.removeEventListener('mousedown', this.boundOnMouseDown);
      el.removeEventListener('contextmenu', this.boundOnContextMenu);
      el.removeEventListener('mousemove', this.boundOnMouseMove);
      el.removeEventListener('wheel', this.boundOnWheel);
      el.removeEventListener('click', this.boundOnClick);
      el.removeEventListener('touchstart', this.boundOnTouchStart);
      el.removeEventListener('touchmove', this.boundOnTouchMove);
      el.removeEventListener('touchend', this.boundOnTouchEnd);
    }

    window.removeEventListener('mouseup', this.boundOnMouseUp);
    window.removeEventListener('resize', this.boundOnResize);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.envMapRenderTarget) {
      this.envMapRenderTarget.dispose();
      this.envMapRenderTarget = null;
    }
    if (this.pmremGenerator) {
      this.pmremGenerator.dispose();
      this.pmremGenerator = null;
    }

    if (this.lcdTexture) {
      this.lcdTexture.dispose();
      this.lcdTexture = null;
    }
    if (this.debugLedTexture) {
      this.debugLedTexture.dispose();
      this.debugLedTexture = null;
    }
    if (this.moboTexture) {
      this.moboTexture.dispose();
      this.moboTexture = null;
    }
    if (this.moboBumpTexture) {
      this.moboBumpTexture.dispose();
      this.moboBumpTexture = null;
    }
    if (this.brushedMetalNormalTexture) {
      this.brushedMetalNormalTexture.dispose();
      this.brushedMetalNormalTexture = null;
    }
    if (this.radiatorFinNormalTexture) {
      this.radiatorFinNormalTexture.dispose();
      this.radiatorFinNormalTexture = null;
    }
    if (this.fanHubTexture) {
      this.fanHubTexture.dispose();
      this.fanHubTexture = null;
    }
    if (this.carbonTexture) {
      this.carbonTexture.dispose();
      this.carbonTexture = null;
    }
    if (this.carbonNormalTexture) {
      this.carbonNormalTexture.dispose();
      this.carbonNormalTexture = null;
    }
    if (this.psuLabelTexture) {
      this.psuLabelTexture.dispose();
      this.psuLabelTexture = null;
    }
    if (this.honeycombTexture) {
      this.honeycombTexture.dispose();
      this.honeycombTexture = null;
    }
    if (this.cableBraidedTexture) {
      this.cableBraidedTexture.dispose();
      this.cableBraidedTexture = null;
    }

    this.clearGroup(this.rootGroup);

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement) {
        this.renderer.domElement.remove();
      }
    }
  }
}
