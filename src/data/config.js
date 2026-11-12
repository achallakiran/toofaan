/* data layer: constants and tables only. No logic that touches the outside world. */
'use strict';

var CONFIG = {
  BUILD: 'build 87',          /* shown in the corner so you can tell which copy you are playing */
  TICK_HZ: 60,
  MAX_STEPS_PER_FRAME: 5,

  /* real-world metres. Each asset class picks its own voxel size. */
  VOXEL: { hero: 0.025, enemy: 0.025, bike: 0.075, car: 0.075, building: 0.15, prop: 0.10 },

  /* a fight arena's square (metres) and the per-scene budget */
  CHUNK_SIZE: 32,
  BUDGET: { maxTriangles: 120000, maxDrawCalls: 80 },

  /* quality tiers: phones start on 'low', computers on 'high'. pr = pixel-ratio cap, lod = metres within which fine props show, fogFar = where the world fades out */
  TIERS: {
    low: { pr: 1.5, aa: false, lod: 36, fogFar: 78 },
    medium: { pr: 2, aa: true, lod: 46, fogFar: 85 },
    high: { pr: 2, aa: true, lod: 52, fogFar: 85 }
  },

  PLAYER: { walkSpeed: 4.0, radius: 0.35, height: 1.9 },

  /* palette indices used by the arenas, the hideout and the box meshes, resolved to colours by the view */
  PALETTE: [
    '#6b6f76', '#3a3d42', '#b9a98f', '#c76b4a', '#d9b24a', '#4f7fb0',
    '#7a9a6a', '#8a5a44', '#c9c3b6', '#5d4a63', '#a34a52', '#2f6f6a',
    '#2b2d31', '#7d8087', '#f2c230', '#17181b', '#f08a24', '#c2306f', '#18a0a8', '#8cc63f', '#2a55b8', '#d0312d', '#efe3c8', '#7a3fa0',
    '#7b5a3c', '#f2f2ee', '#9b4a2a', '#e8708a',
    '#e9a23b', '#d4577c', '#5bb5b0', '#9cc84e', '#4f7fd0', '#e8d9a8', '#c8762f', '#b86ad0',
    /* 36+: the fight arenas' kit (stone, wood, brass, marigold, brick, foliage, paint) */
    '#9b958b', '#80796f', '#5e5850', '#b07a45', '#7a4f2a', '#c9a227', '#ff9f1c', '#ffd166', '#e63946', '#2d6a4f', '#52b788', '#264653',
    '#a8854c', '#a89f8c', '#8a8a83', '#3d405b', '#f4f1de', '#1d3557', '#457b9d', '#bc6c25', '#8b3a1e', '#606c38', '#ffb4a2', '#6d597a'
  ]
};

module.exports = CONFIG;
