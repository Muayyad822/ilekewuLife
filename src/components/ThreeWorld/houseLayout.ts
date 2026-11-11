/**
 * Single source of truth for the residential quarter.
 *
 * Ruwaq (the Madrasah boarding house) is located directly adjacent to the school
 * compound and Classroom Hall (at cx = 51).
 *
 * The other off-campus houses are relocated to their authentic geographic areas:
 * - Off-Campus Student Room (Ejigbo): cx = 180, cz = -14
 * - Self-Contained Mini-Flat (Oke-Afa): cx = 380, cz = -14
 * - Sheikh's Personal Villa (Isolo): cx = 540, cz = -14
 *
 * Both the 3D builder (worldBuilders.ts) and the interaction zones (LagosWorld.tsx)
 * read from here so furniture, vehicles, doors, and hotspots are always synchronized.
 */

export type HouseTierId = 'ruwaq' | 'shared_room' | 'mini_flat' | 'personal_villa';
export type VehicleKey = 'car' | 'keke' | 'okada' | 'scooter' | 'bicycle';

export interface Spot {
  x: number;
  z: number;
}

export interface Carport {
  /** Centre line of the covered bay. */
  cx: number;
  /** Open (street) end and closed (rear) end of the slab. */
  zFront: number;
  zBack: number;
  w: number;
  slots: Record<VehicleKey, Spot>;
}

export interface HouseLayout {
  id: HouseTierId;
  label: string;
  cx: number;
  cz: number;
  w: number;
  d: number;
  doorW: number;
  bed: Spot;
  desk: Spot;
  rug: Spot;
  wardrobe: Spot;
  ledger: Spot;
  fan: Spot;
  shelf: Spot;
  solar: Spot;
  /** Wall-hung split AC, always on the back (north) wall. */
  ac: Spot;
  rehal: Spot;
  whiteboard: Spot;
  carport: Carport;
}

const makeCarport = (cx: number, w: number, zFront: number, zBack: number): Carport => {
  const zMid = (zFront + zBack) / 2;
  return {
    cx,
    zFront,
    zBack,
    w,
    slots: {
      car: { x: cx - 1.1, z: zMid + 2.0 },
      bicycle: { x: cx - 1.1, z: zBack + 2.2 },
      keke: { x: cx + 1.1, z: zMid + 2.3 },
      okada: { x: cx + 1.1, z: zMid - 1.0 },
      scooter: { x: cx + 1.1, z: zBack + 1.6 },
    },
  };
};

/** Helper: local (lx, lz) offsets from a house centre. */
const at = (cx: number, cz: number) => (lx: number, lz: number): Spot => ({ x: cx + lx, z: cz + lz });

// 1. Ruwaq is next to the school compound (cx = 51, cz = -12)
const ruwaqAt = at(51, -12);

// 2. Off-campus residences are separated at their respective Lagos neighborhoods along the highway:
const sharedAt = at(180, -14); // Ejigbo Tenement
const flatAt = at(380, -14);   // Oke-Afa Mini-Flat
const villaAt = at(540, -14);  // Isolo Sheikh Villa

export const HOUSES: Record<HouseTierId, HouseLayout> = {
  // ---------------------------------------------------------------- RUWAQ
  // Madrasah Boarding Dormitory (next to Classroom Hall at x = 31)
  ruwaq: {
    id: 'ruwaq',
    label: 'Ruwaq Dorm',
    cx: 51,
    cz: -12,
    w: 13,
    d: 12,
    doorW: 3.4,
    bed: ruwaqAt(-4.2, -3.5),
    desk: ruwaqAt(-4.2, 0.5),
    rug: ruwaqAt(0, -3.6),
    wardrobe: ruwaqAt(-4.4, 4.0),
    ledger: ruwaqAt(3.8, 4.8),
    fan: ruwaqAt(-2.5, -4.8),
    shelf: ruwaqAt(-5.8, 0.5),
    solar: ruwaqAt(-2.0, -5.5),
    ac: ruwaqAt(2.6, -5.7),
    rehal: ruwaqAt(-2.0, 0.6),
    whiteboard: ruwaqAt(1.9, -5.0),
    carport: makeCarport(59.5, 4.4, -4.9, -15.4),
  },

  // ---------------------------------------------------------- SHARED ROOM
  // Ejigbo Face-Me-I-Face-You Tenement (Off-Campus at x = 180)
  shared_room: {
    id: 'shared_room',
    label: 'Off-Campus Room (Ejigbo)',
    cx: 180,
    cz: -14,
    w: 13,
    d: 12,
    doorW: 3.4,
    bed: sharedAt(-4.2, -3.8),
    desk: sharedAt(-4.4, -0.9),
    rug: sharedAt(-1.4, -3.6),
    wardrobe: sharedAt(-1.6, -5.45),
    ledger: sharedAt(4.6, 4.9),
    fan: sharedAt(-0.2, -1.0),
    shelf: sharedAt(-4.2, -5.58),
    solar: sharedAt(-0.15, -5.7),
    ac: sharedAt(-3.0, -5.7),
    rehal: sharedAt(-5.8, -0.9),
    whiteboard: sharedAt(-5.7, -2.0),
    carport: makeCarport(189.5, 4.6, -6.9, -17.4),
  },

  // ------------------------------------------------------------ MINI-FLAT
  // Oke-Afa Modern Self-Contained 1-Bedroom (Off-Campus at x = 380)
  mini_flat: {
    id: 'mini_flat',
    label: 'Mini-Flat (Oke-Afa)',
    cx: 380,
    cz: -14,
    w: 16,
    d: 13,
    doorW: 3.8,
    bed: flatAt(-4.9, -4.8),
    desk: flatAt(-2.6, -5.2),
    rug: flatAt(-6.0, -2.3),
    wardrobe: flatAt(-7.0, -5.95),
    ledger: flatAt(5.2, 5.1),
    fan: flatAt(-2.05, -2.0),
    shelf: flatAt(-6.0, -0.55),
    solar: flatAt(-0.9, -0.68),
    ac: flatAt(-4.9, -6.2),
    rehal: flatAt(-4.6, 2.9),
    whiteboard: flatAt(-4.6, 0.9),
    carport: makeCarport(391.5, 4.8, -6.5, -17.5),
  },

  // ---------------------------------------------------------------- VILLA
  // Isolo Sheikh's Duplex Villa & Courtyard (Off-Campus at x = 540)
  personal_villa: {
    id: 'personal_villa',
    label: "Sheikh's Villa (Isolo)",
    cx: 540,
    cz: -14,
    w: 20,
    d: 15,
    doorW: 4.6,
    bed: villaAt(-6.8, -5.0),
    desk: villaAt(7.9, -6.5),
    rug: villaAt(7.3, -3.0),
    wardrobe: villaAt(-9.0, -6.95),
    ledger: villaAt(7.5, 6.3),
    fan: villaAt(-9.0, -2.4),
    shelf: villaAt(5.4, -7.08),
    solar: villaAt(9.2, -7.1),
    ac: villaAt(-6.8, -7.2),
    rehal: villaAt(-5.5, 3.6),
    whiteboard: villaAt(5.6, -4.2),
    carport: makeCarport(553.5, 5.2, -5.5, -18.5),
  },
};

export const HOUSE_LIST: HouseLayout[] = [
  HOUSES.ruwaq,
  HOUSES.shared_room,
  HOUSES.mini_flat,
  HOUSES.personal_villa,
];

/** Z of the front doorway of a house (centre of the door gap). */
export const doorZ = (h: HouseLayout) => h.cz + h.d / 2;

/** Highway geometry shared by the road builder, traffic and U-turn logic. */
export const HIGHWAY = {
  median: 17.2,
  /** Lane centre lines. North carriageway runs east (+x); south runs west (-x). */
  lanes: { eastOuter: 10.8, eastInner: 14.8, westInner: 19.6, westOuter: 23.6 },
  /** Median breaks where vehicles may turn around. */
  uTurnCenters: [-500, -380, -240, -100, 0, 110, 200, 290, 400, 520],
  uTurnHalfGap: 6,
} as const;
