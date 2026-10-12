// Vehicle fleet: dimensions (metres) and handling. Proportions follow typical UK vehicles of each
// class; liveries and names are fictional (no real operators, brands or emergency-service markings).
// Handling: accel = m/s² from rest, vmax = m/s, brake = m/s², steer = max front-wheel angle (rad),
// grip = max lateral acceleration (m/s²), mass in kg (used for momentum and collisions).

export const VEHICLES = {
  hatchback: { name: 'Hatchback', cat: 'car', len: 4.05, wid: 1.76, hgt: 1.47, wb: 2.56, wheelR: 0.31, track: 1.5, mass: 1150, accel: 3.4, vmax: 31, brake: 8.8, steer: 0.62, grip: 8.2, seats: 5, colours: [0xb3262b, 0x1f4e8c, 0xe9e6df, 0x2b2d31, 0x6f8f3a, 0xf0b429], shape: 'hatch' },
  saloon: { name: 'Saloon', cat: 'car', len: 4.72, wid: 1.82, hgt: 1.44, wb: 2.82, wheelR: 0.32, track: 1.56, mass: 1450, accel: 3.6, vmax: 35, brake: 9.0, steer: 0.58, grip: 8.4, seats: 5, colours: [0x2b2d31, 0x8a8f96, 0x1d3a60, 0x7a1f2b, 0xf4f2ee], shape: 'saloon' },
  family: { name: 'Family estate', cat: 'car', len: 4.65, wid: 1.82, hgt: 1.52, wb: 2.72, wheelR: 0.32, track: 1.55, mass: 1500, accel: 3.0, vmax: 32, brake: 8.6, steer: 0.6, grip: 8.0, seats: 5, colours: [0x3d5a80, 0x9aa0a6, 0x5c4033, 0x2e6b4f, 0xe7e3d8], shape: 'estate' },
  sports: { name: 'Sports coupé', cat: 'car', len: 4.3, wid: 1.86, hgt: 1.24, wb: 2.48, wheelR: 0.33, track: 1.6, mass: 1300, accel: 6.2, vmax: 44, brake: 10.5, steer: 0.56, grip: 10, seats: 2, colours: [0xd7261e, 0xf2b632, 0x0e7c7b, 0x111111], shape: 'coupe' },
  taxi: { name: 'Seaside Cabs taxi (fictional)', cat: 'car', len: 4.72, wid: 1.82, hgt: 1.44, wb: 2.82, wheelR: 0.32, track: 1.56, mass: 1480, accel: 3.4, vmax: 33, brake: 9.0, steer: 0.6, grip: 8.2, seats: 5, colours: [0xf6f3ea], shape: 'saloon', livery: 'taxi' },
  suv: { name: 'SUV', cat: 'car', len: 4.6, wid: 1.9, hgt: 1.72, wb: 2.73, wheelR: 0.36, track: 1.62, mass: 1900, accel: 3.1, vmax: 33, brake: 8.2, steer: 0.58, grip: 7.6, seats: 5, colours: [0x2b2d31, 0xe9e6df, 0x41526b, 0x6b5b45], shape: 'suv' },
  van: { name: 'Small van', cat: 'van', len: 4.45, wid: 1.8, hgt: 1.86, wb: 2.75, wheelR: 0.31, track: 1.52, mass: 1450, accel: 2.8, vmax: 29, brake: 8.0, steer: 0.6, grip: 7.4, seats: 2, colours: [0xf4f2ee, 0x1f4e8c, 0xb3262b], shape: 'smallvan' },
  parcel: { name: 'Parcel van (fictional courier)', cat: 'van', len: 5.93, wid: 2.02, hgt: 2.6, wb: 3.66, wheelR: 0.34, track: 1.72, mass: 2800, accel: 2.3, vmax: 27, brake: 7.4, steer: 0.62, grip: 6.4, seats: 3, colours: [0xf4f2ee], shape: 'panelvan', livery: 'parcel' },
  boxtruck: { name: '7.5-tonne box truck', cat: 'truck', len: 8.1, wid: 2.45, hgt: 3.55, wb: 4.5, wheelR: 0.45, track: 1.96, mass: 7500, accel: 1.55, vmax: 25, brake: 6.2, steer: 0.62, grip: 4.8, seats: 3, colours: [0xf4f2ee], shape: 'boxtruck', livery: 'freight' },
  flatbed: { name: 'Flatbed truck', cat: 'truck', len: 7.6, wid: 2.45, hgt: 2.95, wb: 4.3, wheelR: 0.45, track: 1.96, mass: 6800, accel: 1.6, vmax: 25, brake: 6.3, steer: 0.62, grip: 4.8, seats: 3, colours: [0x1f4e8c, 0xb3262b], shape: 'flatbed' },
  refuse: { name: 'Refuse collection vehicle', cat: 'truck', len: 9.6, wid: 2.5, hgt: 3.6, wb: 4.8, wheelR: 0.48, track: 2.0, mass: 18000, accel: 1.1, vmax: 20, brake: 5.6, steer: 0.64, grip: 4.2, seats: 3, colours: [0x2e8a57], shape: 'refuse' },
  roadworks: { name: 'Road maintenance truck', cat: 'truck', len: 6.8, wid: 2.3, hgt: 3.05, wb: 3.9, wheelR: 0.42, track: 1.9, mass: 6000, accel: 1.7, vmax: 24, brake: 6.4, steer: 0.62, grip: 5.0, seats: 3, colours: [0xf2a900], shape: 'roadworks' },
  bus: { name: 'Single-decker bus (Coastline Buses, fictional)', cat: 'bus', len: 11.6, wid: 2.55, hgt: 3.15, wb: 5.95, wheelR: 0.5, track: 2.1, mass: 12500, accel: 1.3, vmax: 22, brake: 6.0, steer: 0.66, grip: 3.8, seats: 41, colours: [0x0e7c7b], shape: 'bus', livery: 'bus' },
  doubledecker: { name: 'Double-decker bus (Coastline Buses, fictional)', cat: 'bus', len: 10.9, wid: 2.55, hgt: 4.38, wb: 5.95, wheelR: 0.5, track: 2.1, mass: 16000, accel: 1.1, vmax: 20, brake: 5.8, steer: 0.66, grip: 3.4, seats: 79, colours: [0x0e7c7b], shape: 'decker', livery: 'bus' },
  artic: { name: 'Articulated HGV with container', cat: 'hgv', len: 6.2, wid: 2.5, hgt: 3.95, wb: 3.8, wheelR: 0.5, track: 2.04, mass: 36000, accel: 0.85, vmax: 25, brake: 5.2, steer: 0.6, grip: 3.6, seats: 2, colours: [0x1d3a60, 0xb3262b, 0xf4f2ee], shape: 'tractor',
    trailer: { len: 13.6, kingpin: 1.2, axleBack: 10.6, hgt: 4.0, wid: 2.55, wheelR: 0.45 } },
};
export const VEHICLE_ORDER = ['hatchback', 'saloon', 'family', 'sports', 'taxi', 'suv', 'van', 'parcel', 'boxtruck', 'flatbed', 'refuse', 'roadworks', 'bus', 'doubledecker', 'artic'];

/** Driver position (local, +z forward, UK right-hand drive so the driver sits on local -x). */
export function driverSeat(s) {
  if (s.cat === 'bus') return { x: -0.65, y: 1.35, z: s.len / 2 - 1.3, eye: 2.25 };
  if (s.cat === 'truck' || s.cat === 'hgv') return { x: -0.62, y: 1.3, z: s.len / 2 - 1.1, eye: 2.35 };
  if (s.cat === 'van') return { x: -0.4, y: 0.7, z: s.wb / 2 - 0.25, eye: s.hgt > 2.2 ? 1.75 : 1.45 };
  return { x: -0.37, y: 0.45, z: -0.1 + (s.shape === 'coupe' ? -0.25 : 0), eye: s.shape === 'suv' ? 1.35 : s.shape === 'coupe' ? 1.0 : 1.18 };
}
/** Where you stand to get in (beside the driver's door). */
export function doorPoint(s) { const d = driverSeat(s); return { x: -(s.wid / 2 + 0.75), z: d.z + (s.cat === 'bus' ? 0.6 : 0.1), bus: s.cat === 'bus' }; }
