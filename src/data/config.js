/* data layer: constants and tables only. No logic that touches the outside world. */
'use strict';

var CONFIG = {
  BUILD: 'build 34',          /* shown in the corner so you can tell which copy you are playing */
  TICK_HZ: 60,
  MAX_STEPS_PER_FRAME: 5,

  /* real-world metres. Each asset class picks its own voxel size. */
  VOXEL: { hero: 0.025, enemy: 0.025, bike: 0.075, car: 0.075, building: 0.15, prop: 0.10 },

  /* world streaming */
  CHUNK_SIZE: 32,
  STREAM_RADIUS: 2,          /* chunks kept loaded around the player: (2r+1)^2 */
  CACHE_SPECS: 30,           /* generated chunk specs kept after unload (cheap data, no GPU memory) */
  BUDGET: { maxLoadedChunks: 25, maxTriangles: 120000, maxDrawCalls: 80 },

  PLAYER: { walkSpeed: 4.0, radius: 0.35, height: 1.9 },

  /* palette indices used by chunk specs, resolved to colours by the view */
  PALETTE: [
    '#6b6f76', '#3a3d42', '#b9a98f', '#c76b4a', '#d9b24a', '#4f7fb0',
    '#7a9a6a', '#8a5a44', '#c9c3b6', '#5d4a63', '#a34a52', '#2f6f6a'
  ],
  GROUND: { road: 1, sidewalk: 8, dirt: 2 }
};

module.exports = CONFIG;
