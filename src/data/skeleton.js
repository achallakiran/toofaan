/* data layer: hero skeleton layout in voxel units (1 voxel = 2.5 cm). Offsets are relative to the parent joint.
   Facing is +z, up is +y, the hero's left is +x. Lead limbs are "A", rear limbs are "B". */
'use strict';

var SKEL = {
  VS: 0.025,
  hipY: 34,                    /* hip centre above the sole */
  spine: [0, 6, 0],            /* waist, from hips */
  neck: [0, 19, 0],            /* neck base, from spine */
  head: [0, 3.0, 0],           /* jaw hinge, from neck base */
  hair: [0, 4.5, -3.0],        /* where the long hair leaves the back of the skull, from head joint */
  hairStep: [0, -4.5, 0],
  beard: [0, 0.2, 5.4],        /* where the beard hangs from the chin, from head joint */
  guitarBack: { pos: [1, -1, -9.5], rot: [-6, 180, -35] },  /* slung on the back: spine-local voxel units, degrees (YXZ) */
  shoulder: [10.4, 17.5, 0],   /* mirrored for the right side, from spine */
  elbow: [0, -12, 0],
  wrist: [0, -10.5, 0],
  hip: [4.6, 0, 0],            /* mirrored, from hips */
  knee: [0, -16, 0],
  ankle: [0, -15, 0],
  toe: [0, -2, 5.5]            /* ball of the foot, from ankle */
};

module.exports = SKEL;
