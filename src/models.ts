import * as T from "three";
export const cyan = new T.MeshBasicMaterial({ color: 0x51efff }),
  pink = new T.MeshBasicMaterial({ color: 0xff458e }),
  amber = new T.MeshBasicMaterial({ color: 0xffce76 });
export const dark = new T.MeshStandardMaterial({
  color: 0x111728,
  roughness: 0.45,
  metalness: 0.65,
});
export function box(
  g: T.Group | T.Scene,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  m: T.Material,
) {
  const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  g.add(mesh);
  return mesh;
}
export function car(color = 0xb8c6c8, truck = false) {
  const g = new T.Group(),
    paint = new T.MeshStandardMaterial({
      color,
      metalness: 0.7,
      roughness: 0.26,
    }),
    glass = new T.MeshStandardMaterial({
      color: 0x082333,
      metalness: 0.8,
      roughness: 0.12,
      emissive: 0x062331,
    });
  paint.name = "vehicle-paint";
  if (truck) {
    box(g, 2.35, 2.8, 5.9, 0, 1.9, 0, dark);
    box(g, 2.25, 1.9, 1.9, 0, 1.45, -3.1, paint);
    box(g, 2.05, 0.7, 0.08, 0, 1.9, -4.08, glass);
    for (let z = -2; z < 3; z += 0.7)
      box(g, 2.39, 0.035, 0.08, 0, 2.6, z, cyan);
    box(
      g,
      1.8,
      0.85,
      0.05,
      0,
      2.1,
      3.01,
      new T.MeshBasicMaterial({
        map: label("NOVA / 24", "DELIVERY", "#142b41", "#53f3ff"),
      }),
    );
  } else {
    const shape = new T.Shape();
    shape.moveTo(-1.02, 2.1);
    shape.lineTo(1.02, 2.1);
    shape.lineTo(1.18, 1.3);
    shape.lineTo(1.03, -1.6);
    shape.lineTo(0.72, -2.3);
    shape.lineTo(-0.72, -2.3);
    shape.lineTo(-1.03, -1.6);
    shape.lineTo(-1.18, 1.3);
    shape.closePath();
    const geom = new T.ExtrudeGeometry(shape, {
      depth: 0.48,
      bevelEnabled: true,
      bevelSize: 0.12,
      bevelThickness: 0.12,
      bevelSegments: 1,
      steps: 1,
    });
    geom.rotateX(Math.PI / 2);
    const body = new T.Mesh(geom, paint);
    body.position.y = 1;
    g.add(body);
    box(g, 1.62, 0.55, 1.85, 0, 1.21, 0.05, glass).rotation.x = -0.09;
    box(g, 0.12, 0.08, 1.85, -0.84, 1.52, 0.05, paint);
    box(g, 0.12, 0.08, 1.85, 0.84, 1.52, 0.05, paint);
    box(g, 2.42, 0.1, 0.38, 0, 1.15, 1.85, dark);
    for (const x of [-0.92, 0.92]) box(g, 0.08, 0.32, 0.12, x, 1, 1.85, dark);
    box(g, 1.95, 0.09, 0.08, 0, 0.78, 2.24, pink);
    box(g, 0.6, 0.05, 0.1, -0.6, 0.84, -2.32, cyan);
    box(g, 0.6, 0.05, 0.1, 0.6, 0.84, -2.32, cyan);
    for (const x of [-0.5, 0.5]) {
      box(g, 0.26, 0.18, 0.13, x, 0.51, 2.3, amber);
    }
    for (const x of [-1.12, 1.12])
      for (const z of [-1.3, 1.35]) {
        const wheel = new T.Mesh(
          new T.CylinderGeometry(0.44, 0.44, 0.3, 12),
          dark,
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.43, z);
        g.add(wheel);
        const hub = new T.Mesh(new T.TorusGeometry(0.26, 0.045, 5, 12), amber);
        hub.rotation.y = Math.PI / 2;
        hub.position.set(x * 1.14, 0.43, z);
        g.add(hub);
      }
    box(g, 0.12, 0.025, 2.5, 0, 1.02, -0.45, dark);
  }
  box(
    g,
    2,
    0.025,
    3.7,
    0,
    0.08,
    0,
    new T.MeshBasicMaterial({
      color: 0x00cfff,
      transparent: true,
      opacity: 0.26,
    }),
  );
  return g;
}
export function label(
  title: string,
  sub: string,
  bg = "#091525",
  fg = "#a9fcff",
) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const a = c.getContext("2d")!;
  a.fillStyle = bg;
  a.fillRect(0, 0, 512, 256);
  a.strokeStyle = fg;
  a.lineWidth = 5;
  a.strokeRect(10, 10, 492, 236);
  a.fillStyle = fg;
  a.font = "bold 66px sans-serif";
  a.textAlign = "center";
  a.fillText(title, 256, 120);
  a.font = "22px monospace";
  a.fillText(sub, 256, 175);
  return new T.CanvasTexture(c);
}
