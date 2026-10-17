import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { box, car, label, cyan, pink, amber, dark } from "./models";
import { Run, beatAt, seeded } from "./game";
export class World {
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(57, 1, 0.1, 750);
  renderer: T.WebGLRenderer;
  hero = car(0xb5c8ce);
  chunks: T.Group[] = [];
  cars: T.Group[] = [];
  stars: T.Points;
  rain: T.LineSegments;
  speedLines: T.LineSegments;
  boostFlames: T.Mesh[] = [];
  cells: T.Group[] = [];
  sparkTime = 0;
  sparkX = 0;
  sparks: T.Points;
  low = false;
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  constructor(container: HTMLElement) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    container.append(this.renderer.domElement);
    this.scene.background = new T.Color(0x080b1c);
    this.scene.fog = new T.FogExp2(0x11132c, 0.0042);
    this.scene.add(new T.HemisphereLight(0x83baff, 0x211330, 3.2));
    const key = new T.DirectionalLight(0xc8ddff, 3);
    key.position.set(-20, 35, 15);
    this.scene.add(key);
    this.scene.add(this.hero);
    this.hero.position.set(0, 0, 3);
    const glow = new T.PointLight(0x12bdff, 35, 16, 2);
    glow.position.set(0, 1, 3);
    this.scene.add(glow);
    const moon = new T.Mesh(
      new T.CircleGeometry(29, 64),
      new T.MeshBasicMaterial({ color: 0xaaa0b8 }),
    );
    moon.position.set(-72, 87, -510);
    this.scene.add(moon);
    for (let i = 0; i < 12; i++) {
      box(
        this.scene,
        63,
        0.6 + i * 0.13,
        0.1,
        -72,
        63 + i * 2,
        -509,
        new T.MeshBasicMaterial({ color: 0x191932 }),
      );
    }
    const rng = seeded(47);
    for (let i = 0; i < 11; i++) {
      const g = this.chunk(i, rng);
      g.position.z = 60 - i * 60;
      this.chunks.push(g);
      this.scene.add(g);
    }
    for (let i = 0; i < 10; i++) {
      const g = new T.Group();
      for (let kind = 0; kind < 4; kind++) {
        const c = car(
          [0x233647, 0x655170, 0x1f4e62, 0x936b48][kind],
          kind === 0,
        );
        g.add(c);
      }
      this.cars.push(g);
      this.scene.add(g);
    }
    for (const x of [-0.5, 0.5]) {
      const flame = new T.Mesh(
        new T.ConeGeometry(0.22, 2.4, 8),
        new T.MeshBasicMaterial({
          color: 0x80f8ff,
          transparent: true,
          opacity: 0.85,
        }),
      );
      flame.rotation.x = Math.PI / 2;
      flame.position.set(x, 0.53, 6);
      this.boostFlames.push(flame);
      this.scene.add(flame);
    }
    for (let i = 0; i < 3; i++) {
      const g = new T.Group();
      const ring = new T.Mesh(new T.TorusGeometry(0.65, 0.06, 6, 24), cyan);
      g.add(ring);
      const core = new T.Mesh(new T.OctahedronGeometry(0.35), amber);
      g.add(core);
      this.cells.push(g);
      this.scene.add(g);
    }
    const starGeo = new T.BufferGeometry(),
      pts = [];
    for (let i = 0; i < 650; i++)
      pts.push((rng() - 0.5) * 900, 50 + rng() * 230, -rng() * 600);
    starGeo.setAttribute("position", new T.Float32BufferAttribute(pts, 3));
    this.stars = new T.Points(
      starGeo,
      new T.PointsMaterial({ color: 0xa9d7ef, size: 0.35 }),
    );
    this.scene.add(this.stars);
    const rainGeo = new T.BufferGeometry(),
      r: number[] = [];
    for (let i = 0; i < 400; i++) {
      const x = (rng() - 0.5) * 100,
        y = rng() * 65,
        z = -rng() * 200;
      r.push(x, y, z, x - 0.06, y + 0.65, z - 0.25);
    }
    rainGeo.setAttribute("position", new T.Float32BufferAttribute(r, 3));
    this.rain = new T.LineSegments(
      rainGeo,
      new T.LineBasicMaterial({
        color: 0x8cc2e9,
        transparent: true,
        opacity: 0.22,
      }),
    );
    this.scene.add(this.rain);
    const streakGeo = new T.BufferGeometry(),
      streaks: number[] = [];
    for (let i = 0; i < 32; i++) {
      const x = (i % 2 ? 1 : -1) * (3 + rng() * 15),
        y = 0.3 + rng() * 10,
        z = -rng() * 100;
      streaks.push(x, y, z, x, y, z + 5 + rng() * 9);
    }
    streakGeo.setAttribute(
      "position",
      new T.Float32BufferAttribute(streaks, 3),
    );
    this.speedLines = new T.LineSegments(
      streakGeo,
      new T.LineBasicMaterial({
        color: 0x8fffe9,
        transparent: true,
        opacity: 0.23,
      }),
    );
    this.scene.add(this.speedLines);
    const sparkGeo = new T.BufferGeometry();
    sparkGeo.setAttribute(
      "position",
      new T.Float32BufferAttribute(new Float32Array(180), 3),
    );
    this.sparks = new T.Points(
      sparkGeo,
      new T.PointsMaterial({
        color: 0xffd180,
        size: 0.1,
        transparent: true,
        opacity: 1,
      }),
    );
    this.sparks.frustumCulled = false;
    this.scene.add(this.sparks);
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  chunk(i: number, rng: () => number) {
    const g = new T.Group();
    g.userData.index = i;
    const roadmat = new T.MeshStandardMaterial({
      color: 0x111b30,
      metalness: 0.7,
      roughness: 0.24,
    });
    box(g, 15, 0.3, 60, 0, -0.2, 0, roadmat);
    for (const side of [-1, 1]) {
      box(g, 0.35, 0.85, 60, side * 7.8, 0.3, 0, dark);
      box(g, 0.11, 0.055, 60, side * 7.52, 0.75, 0, cyan);
      box(g, 0.12, 0.02, 60, side * 6.8, 0.01, 0, amber);
      for (let z = -28; z < 30; z += 12) {
        box(g, 0.14, 8, 0.14, side * 8.5, 4, z, dark);
        box(g, 3, 0.1, 0.2, side * 7.2, 8, z, cyan);
        box(g, 0.07, 5, 0.15, side * 8.4, 3, z, pink);
      }
      for (let j = 0; j < 4; j++) {
        const h = 18 + rng() * 68,
          w = 7 + rng() * 9,
          z = -25 + j * 16,
          x = side * (18 + rng() * 22);
        const b = box(
          g,
          w,
          h,
          11,
          x,
          h / 2 - 2,
          z,
          new T.MeshStandardMaterial({
            color: [0x17213a, 0x261b38, 0x122b39][j % 3],
            roughness: 0.7,
          }),
        );
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 256;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#101629";
        ctx.fillRect(0, 0, 128, 256);
        for (let y = 4; y < 256; y += 9)
          for (let x = 3; x < 128; x += 12) {
            ctx.fillStyle =
              rng() > 0.34 ? (rng() > 0.5 ? "#397482" : "#825371") : "#142036";
            ctx.fillRect(x, y, 5, 3);
          }
        const texture = new T.CanvasTexture(canvas);
        texture.colorSpace = T.SRGBColorSpace;
        b.material = new T.MeshStandardMaterial({
          map: texture,
          emissiveMap: texture,
          emissive: 0xffffff,
          emissiveIntensity: 0.65,
          color: 0x8299b0,
        });
        box(g, w * 0.63, 4, 8, x, h, z, dark);
        box(
          g,
          0.1,
          h,
          11.1,
          x + side * w * 0.49,
          h / 2,
          z,
          j % 2 ? pink : cyan,
        );
        box(g, w, 0.12, 11, x, h - 1, z, j % 2 ? pink : cyan);
        if (j === 1) {
          const sign = box(
            g,
            8,
            4,
            0.1,
            x,
            h * 0.54,
            z + 5.6,
            new T.MeshBasicMaterial({
              map: label(
                i % 2 ? "AFTER / 9" : "KAIRO",
                "THE CITY NEVER IDLES",
                "#25102c",
                "#ff80bb",
              ),
            }),
          );
          sign.rotation.y = -side * 0.08;
        }
      }
    }
    for (const x of [-2.1, 2.1])
      for (let z = -27; z < 30; z += 9)
        box(
          g,
          0.12,
          0.025,
          4,
          x,
          0.01,
          z,
          new T.MeshBasicMaterial({ color: 0x8e9aaa }),
        );
    // Soft streak reflections are authored into road geometry.
    for (let j = 0; j < 20; j++) {
      const col = j % 2 ? 0xec458d : 0x28ccf0;
      box(
        g,
        0.07 + rng() * 0.22,
        0.008,
        2 + rng() * 9,
        (rng() - 0.5) * 14,
        0.02,
        (rng() - 0.5) * 60,
        new T.MeshBasicMaterial({
          color: col,
          transparent: true,
          opacity: 0.08 + rng() * 0.13,
        }),
      );
    }
    const tunnel = new T.Group();
    for (let z = -27; z < 30; z += 6) {
      box(tunnel, 0.4, 10, 0.35, -7.2, 5, z, pink);
      box(tunnel, 0.4, 10, 0.35, 7.2, 5, z, pink);
      box(tunnel, 14.8, 0.25, 0.35, 0, 10, z, cyan);
    }
    box(tunnel, 15, 0.4, 60, 0, 10.5, 0, dark);
    box(tunnel, 0.25, 10, 60, -7.7, 5, 0, dark);
    box(tunnel, 0.25, 10, 60, 7.7, 5, 0, dark);
    g.add(tunnel);
    g.userData.tunnel = tunnel;
    const bridge = new T.Group();
    for (const side of [-1, 1]) {
      box(bridge, 0.6, 25, 1, side * 9, 12, -8, cyan);
      box(bridge, 0.6, 25, 1, side * 9, 12, 8, cyan);
      for (let z = -28; z < 30; z += 4) {
        const line = box(bridge, 0.055, 18, 0.06, side * 8.4, 8, z, pink);
        line.rotation.z = side * 0.16;
      }
    }
    box(bridge, 19, 0.65, 1, 0, 24, -8, dark);
    box(bridge, 19, 0.65, 1, 0, 24, 8, dark);
    g.add(bridge);
    g.userData.bridge = bridge;
    if (i % 3 === 0) {
      const sign = new T.Group();
      g.add(sign);
      g.userData.sign = sign;
      box(sign, 18, 0.2, 0.25, 0, 9, -20, dark);
      for (const side of [-1, 1])
        box(sign, 0.25, 9, 0.25, side * 9, 4.5, -20, dark);
      box(
        sign,
        7.5,
        2,
        0.16,
        0,
        8,
        -20,
        new T.MeshBasicMaterial({
          map: label(
            "AFTERHOURS",
            "↓  EXPRESSWAY  /  09",
            "#0b302d",
            "#b8f7d1",
          ),
        }),
      );
    }
    this.batch(tunnel);
    this.batch(bridge);
    this.batch(g);
    return g;
  }
  burst(x: number) {
    this.sparkTime = 0.7;
    this.sparkX = x;
  }
  batch(g: T.Group) {
    const groups = new Map<T.Material, T.Mesh[]>();
    for (const child of [...g.children]) {
      if (child instanceof T.Mesh && !Array.isArray(child.material)) {
        const list = groups.get(child.material) || [];
        list.push(child);
        groups.set(child.material, list);
      }
    }
    for (const [material, meshes] of groups) {
      if (meshes.length < 2) continue;
      const geometries = meshes.map((m) => {
        m.updateMatrix();
        return m.geometry.clone().applyMatrix4(m.matrix);
      });
      const merged = mergeGeometries(geometries);
      if (merged) {
        for (const m of meshes) {
          g.remove(m);
          m.geometry.dispose();
        }
        g.add(new T.Mesh(merged, material));
      }
      geometries.forEach((v) => v.dispose());
    }
  }
  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }
  quality(low: boolean) {
    this.low = low;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1 : 1.75));
    this.rain.visible = !low;
  }
  update(run: Run, dt: number, time: number) {
    const distance =
      run.phase === "menu"
        ? this.reduced
          ? 30
          : 30 + ((time * 8) % 250)
        : run.distance;
    for (let i = 0; i < this.chunks.length; i++) {
      const g = this.chunks[i];
      const wrapped = (((distance + 60 - i * 60) % 660) + 660) % 660;
      g.position.z = wrapped - 570;
      const worldD = distance - g.position.z;
      const beat = beatAt(Math.max(0, worldD));
      if (g.userData.sign) g.userData.sign.visible = run.phase !== "menu";
      g.userData.tunnel.visible = run.phase !== "menu" && beat === 1;
      g.userData.bridge.visible = run.phase !== "menu" && beat === 2;
    }
    this.hero.position.x = run.x;
    this.hero.rotation.z = -(run.lane * 4.2 - 4.2 - run.x) * 0.045;
    this.hero.rotation.y = (run.lane * 4.2 - 4.2 - run.x) * 0.045;
    if (run.phase === "menu") {
      this.hero.rotation.y = Math.sin(time * 0.32) * 0.07;
      this.hero.position.y = Math.sin(time * 1.4) * 0.025;
    }
    this.cells.forEach((g, i) => {
      const c = run.cells[i];
      g.visible = run.phase !== "menu";
      g.position.set(c.x, 1.5 + Math.sin(time * 3 + i) * 0.15, c.z);
      g.rotation.y = time * 1.5;
    });
    this.cars.forEach((g, i) => {
      const t = run.traffic[i];
      g.visible = !!t && run.phase !== "menu";
      if (t) {
        g.position.set(t.x, 0, t.z);
        g.children.forEach((c, j) => (c.visible = j === t.kind));
      }
    });
    this.boostFlames.forEach((f, i) => {
      f.visible = run.boost;
      f.position.x = run.x + (i === 0 ? -0.5 : 0.5);
      f.scale.y = 1 + Math.sin(time * 60) * 0.15;
    });
    const mobile = innerWidth < 700;
    const desiredX = mobile
      ? run.x
      : run.x * 0.36 + (run.phase === "menu" ? -1.6 : 0);
    this.camera.position.x +=
      (desiredX - this.camera.position.x) * Math.min(1, dt * 4);
    this.camera.position.y = mobile ? 7.3 : 5.1;
    this.camera.position.z = mobile ? 19 : 13.4;
    this.camera.fov +=
      ((run.boost && !this.reduced ? 68 : 57) - this.camera.fov) * dt * 3;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(run.x * (mobile ? 0.95 : 0.22), 1.3, mobile ? -10 : -24);
    if (!this.reduced) {
      this.rain.position.y = -(time * 17) % 55;
      this.rain.position.z = (time * 25) % 50;
    }
    this.speedLines.visible = run.boost && !this.reduced;
    this.speedLines.position.set(run.x, 0, (time * 75) % 30);
    this.sparkTime = Math.max(0, this.sparkTime - dt);
    this.sparks.visible = this.sparkTime > 0;
    if (this.sparkTime > 0) {
      const a = this.sparks.geometry.attributes.position as T.BufferAttribute;
      const progress = 1 - this.sparkTime / 0.7;
      for (let i = 0; i < 60; i++) {
        const angle = i * 2.399;
        const spread = 1 + (i % 7);
        a.setXYZ(
          i,
          this.sparkX + Math.sin(angle) * progress * spread,
          0.5 + Math.cos(angle) * progress * 2 - progress * progress,
          3 + progress * (i % 11),
        );
      }
      a.needsUpdate = true;
      (this.sparks.material as T.PointsMaterial).opacity = this.sparkTime / 0.7;
    }
    this.renderer.render(this.scene, this.camera);
  }
}
