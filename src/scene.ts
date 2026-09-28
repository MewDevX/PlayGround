import * as THREE from "three";

export interface Instrument {
  setProgress: (p: number, velocity: number) => void;
  setPointer: (nx: number, ny: number) => void;
  impulse: (nx: number, ny: number, strength?: number) => void;
  addDrag: (dx: number) => void;
  resize: () => void;
  dispose: () => void;
}

const PAPER = new THREE.Color("#e8e5dd");
const INK = new THREE.Color("#191712");
const SIGNAL = new THREE.Color("#bc3f16");

const vertexInject = /* glsl */ `
  uniform float uProgress;
  uniform vec2 uPointerW;
  uniform vec4 uImpulse; // x, y, startTime, strength
  uniform float uTime;
  uniform float uAmp;
  uniform float uDrag;
  varying vec2 vUvF;
  varying float vDisp;

  float ridgeAt(vec2 p, float prog) {
    float rise = smoothstep(0.10, 0.36, prog);
    float fall = 1.0 - smoothstep(0.60, 0.78, prog);
    float amp = rise * fall * 2.1;
    float after = smoothstep(0.80, 1.0, prog) * 0.12;
    float foldY = mix(-0.6, 0.9, smoothstep(0.10, 0.62, prog));
    float d = p.y - foldY;
    float ridge = exp(-d * d * 1.15) * amp;
    float second = exp(-pow(p.y + 1.6, 2.0) * 0.8) * rise * fall * 0.5;
    return ridge + second + after * sin(p.x * 0.8) * 0.15;
  }

  void displaced(vec2 p, out float dz) {
    float prog = uProgress;
    float r = ridgeAt(p, prog);
    vec2 dp = p - uPointerW;
    float dent = -exp(-dot(dp, dp) * 1.4) * 0.85;
    float dt = uTime - uImpulse.z;
    float ripple = 0.0;
    if (dt > 0.0 && dt < 4.0) {
      vec2 ip = p - uImpulse.xy;
      float dist = length(ip);
      ripple = sin(dist * 11.0 - dt * 8.0) * exp(-dist * 1.7) * exp(-dt * 1.5) * uImpulse.w;
    }
    float micro = sin(p.x * 2.6 + uTime * 0.35) * sin(p.y * 2.1 - uTime * 0.22) * 0.035;
    float dragBend = uDrag * p.x * 0.12;
    dz = (r + dent + ripple + micro + dragBend) * uAmp;
  }
`;

const vertexHead = /* glsl */ `
  #include <common>
  #include <uv_pars_vertex>
` ;

export function createInstrument(canvas: HTMLCanvasElement, opts: { reduced: boolean; mobile: boolean }): Instrument | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  const reduced = opts.reduced;
  const mobile = opts.mobile;

  renderer.setClearColor(PAPER, 1);
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !mobile && !reduced;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  scene.background = PAPER.clone();
  scene.fog = new THREE.Fog(PAPER.clone(), 13, 26);

  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 60);
  camera.position.set(0, 0.1, 10.4);

  scene.add(new THREE.HemisphereLight(0xfff9ec, 0x8a877b, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(4.5, 6, 7);
  key.castShadow = !mobile && !reduced;
  key.shadow.mapSize.set(mobile ? 512 : 1024, mobile ? 512 : 1024);
  key.shadow.camera.left = -9; key.shadow.camera.right = 9;
  key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
  key.shadow.radius = 6;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd8d2c2, 0.35);
  rim.position.set(-6, -2, 4);
  scene.add(rim);

  const uniforms = {
    uProgress: { value: 0 },
    uPointerW: { value: new THREE.Vector2(99, 99) },
    uImpulse: { value: new THREE.Vector4(0, 0, -10, 0) },
    uTime: { value: 0 },
    uAmp: { value: reduced ? 0.18 : 1 },
    uDrag: { value: 0 },
  };

  const segX = mobile ? 120 : 220;
  const segY = mobile ? 80 : 140;
  const fieldGeo = new THREE.PlaneGeometry(15, 9.5, segX, segY);
  const fieldMat = new THREE.MeshStandardMaterial({ color: PAPER.clone(), roughness: 0.95, metalness: 0 });

  fieldMat.onBeforeCompile = (shader) => {
    shader.uniforms.uProgress = uniforms.uProgress;
    shader.uniforms.uPointerW = uniforms.uPointerW;
    shader.uniforms.uImpulse = uniforms.uImpulse;
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uAmp = uniforms.uAmp;
    shader.uniforms.uDrag = uniforms.uDrag;

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", vertexHead + vertexInject)
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `
        #include <begin_vertex>
        {
          float dz;
          displaced(position.xy, dz);
          transformed.z += dz;
          vUvF = uv;
          vDisp = dz;
        }
        `
      );

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", /* glsl */ `
        #include <common>
        varying vec2 vUvF;
        varying float vDisp;
        uniform float uProgress;
      `)
      .replace(
        "#include <color_fragment>",
        /* glsl */ `
        #include <color_fragment>
        {
          float rows = 96.0;
          float g = vUvF.y * rows;
          float w = fwidth(g) * 1.1 + 0.015;
          float lh = 1.0 - smoothstep(0.0, w, abs(fract(g) - 0.5) - (0.5 - 0.06));
          float cols = 150.0;
          float gv = vUvF.x * cols;
          float wv = fwidth(gv) * 1.1 + 0.015;
          float lv = 1.0 - smoothstep(0.0, wv, abs(fract(gv) - 0.5) - (0.5 - 0.03));
          float weight = clamp(abs(vDisp) * 0.55, 0.0, 1.0);
          float lineAlpha = 0.10 + weight * 0.30;
          vec3 ink = vec3(0.098, 0.090, 0.070);
          diffuseColor.rgb = mix(diffuseColor.rgb, ink, lh * lineAlpha);
          diffuseColor.rgb = mix(diffuseColor.rgb, ink, lv * 0.045);
          float threadA = smoothstep(0.30, 0.42, uProgress) * (1.0 - smoothstep(0.66, 0.80, uProgress));
          float threadD = abs(vUvF.y - 0.63);
          float thread = (1.0 - smoothstep(0.0, 0.0035 + fwidth(vUvF.y) * 1.5, threadD)) * threadA;
          vec3 sig = vec3(0.737, 0.247, 0.086);
          diffuseColor.rgb = mix(diffuseColor.rgb, sig, thread * 0.95);
          float shade = clamp(vDisp * 0.10, -0.12, 0.16);
          diffuseColor.rgb *= (1.0 - shade);
        }
        `
      );
  };

  const field = new THREE.Mesh(fieldGeo, fieldMat);
  field.receiveShadow = true;
  scene.add(field);

  // two masses
  const inkMat = new THREE.MeshStandardMaterial({ color: INK.clone(), roughness: 0.55, metalness: 0.08 });
  const sigMat = new THREE.MeshStandardMaterial({ color: SIGNAL.clone(), roughness: 0.5, metalness: 0 });
  const massA = new THREE.Group();
  const barA = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.11, 0.9), inkMat);
  barA.castShadow = true;
  const edgeA = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.115, 0.91), sigMat);
  edgeA.position.x = 3.6;
  massA.add(barA, edgeA);
  const massB = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.09, 0.66), inkMat);
  massB.castShadow = true;
  scene.add(massA, massB);

  // state
  let progress = 0;
  let targetProgress = 0;
  let velocity = 0;
  const pointerT = new THREE.Vector2(99, 99);
  const pointerW = new THREE.Vector2(99, 99);
  let drag = 0;
  let dragT = 0;
  let time = 0;
  let last = performance.now();
  let dead = false;
  let raf = 0;

  const camBase = new THREE.Vector3();
  const camLook = new THREE.Vector3(0, 0, 0);
  const par = new THREE.Vector2();

  function cameraFor(p: number, out: THREE.Vector3) {
    // keyframed dolly: arrive -> push -> slit -> release
    const z =
      p < 0.4 ? THREE.MathUtils.lerp(10.4, 8.6, p / 0.4)
      : p < 0.7 ? THREE.MathUtils.lerp(8.6, 7.6, (p - 0.4) / 0.3)
      : THREE.MathUtils.lerp(7.6, 11.6, (p - 0.7) / 0.3);
    const y =
      p < 0.4 ? THREE.MathUtils.lerp(0.1, 0.4, p / 0.4)
      : p < 0.7 ? THREE.MathUtils.lerp(0.4, -0.05, (p - 0.4) / 0.3)
      : THREE.MathUtils.lerp(-0.05, 0.25, (p - 0.7) / 0.3);
    out.set(0, y, z);
  }

  function tick(now: number) {
    if (dead) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!reduced) time += dt;
    else time += dt * 0.15;

    progress += (targetProgress - progress) * (reduced ? 0.12 : 0.08);
    if (Math.abs(targetProgress - progress) < 0.0004) progress = targetProgress;
    pointerW.lerp(pointerT, 0.07);
    drag += (dragT - drag) * 0.06;
    dragT *= 0.94;

    uniforms.uProgress.value = progress;
    uniforms.uTime.value = time;
    uniforms.uPointerW.value.copy(pointerW);
    uniforms.uDrag.value = drag;

    // masses choreography
    const enterA = THREE.MathUtils.smoothstep(progress, 0.30, 0.48);
    const exitA = THREE.MathUtils.smoothstep(progress, 0.54, 0.68);
    massA.position.set(
      THREE.MathUtils.lerp(-11, 0.4, enterA) + exitA * 9.5,
      0.85 - exitA * 0.4,
      2.1 - enterA * 0.25
    );
    massA.rotation.z = -0.045 * enterA + exitA * 0.12 + drag * 0.02;
    massA.rotation.y = 0.06 * enterA;

    const enterB = THREE.MathUtils.smoothstep(progress, 0.36, 0.55);
    const exitB = THREE.MathUtils.smoothstep(progress, 0.54, 0.70);
    massB.position.set(
      THREE.MathUtils.lerp(10.5, -0.6, enterB) - exitB * 9.0,
      -1.25 + exitB * 0.5,
      1.6 - enterB * 0.2
    );
    massB.rotation.z = 0.06 * enterB - exitB * 0.1;

    // stillness after collapse: sink masses away
    const gone = THREE.MathUtils.smoothstep(progress, 0.78, 0.92);
    massA.position.z += gone * 7;
    massB.position.z += gone * 7;
    massA.position.y += gone * 2.5;
    massB.position.y -= gone * 2.5;

    cameraFor(progress, camBase);
    const px = pointerW.x === 99 ? 0 : THREE.MathUtils.clamp(pointerW.x / 7.5, -1, 1);
    const py = pointerW.y === 99 ? 0 : THREE.MathUtils.clamp(pointerW.y / 4.75, -1, 1);
    par.x += (px * 0.4 - par.x) * 0.05;
    par.y += (py * 0.28 - par.y) * 0.05;
    const still = reduced ? 0.15 : 1;
    camera.position.set(
      camBase.x + par.x * still + Math.sin(time * 0.18) * 0.05 * still,
      camBase.y + par.y * still + Math.cos(time * 0.14) * 0.04 * still,
      camBase.z
    );
    camera.lookAt(camLook);
    camera.rotation.z += drag * 0.004;

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(tick);

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  return {
    setProgress(p: number, v: number) {
      targetProgress = THREE.MathUtils.clamp(p, 0, 1);
      velocity = v;
      void velocity;
    },
    setPointer(nx: number, ny: number) {
      // nx, ny in [-1, 1]; map to world on the membrane
      pointerT.set(nx * 7.5, ny * 4.75);
    },
    impulse(nx: number, ny: number, strength = 0.9) {
      uniforms.uImpulse.value.set(nx * 7.5, ny * 4.75, time, strength);
    },
    addDrag(dx: number) {
      dragT = THREE.MathUtils.clamp(dragT + dx * 0.02, -1.5, 1.5);
    },
    resize,
    dispose() {
      dead = true;
      cancelAnimationFrame(raf);
      fieldGeo.dispose();
      fieldMat.dispose();
      inkMat.dispose();
      sigMat.dispose();
      renderer.dispose();
    },
  };
}
