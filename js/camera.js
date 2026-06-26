import { state, outer, cv, ctx } from './state.js';

function scrToWorld(sx, sy) {
  return {
    x: (sx - state.camOffX) / state.camScale,
    y: (sy - state.camOffY) / state.camScale,
  };
}

function worldToScr(wx, wy) {
  return {
    x: wx * state.camScale + state.camOffX,
    y: wy * state.camScale + state.camOffY,
  };
}

function resize() {
  state.DPR = window.devicePixelRatio || 1;
  const rect = outer.getBoundingClientRect();
  state.CW = rect.width;
  state.CH = rect.height;
  cv.width = Math.round(state.CW * state.DPR);
  cv.height = Math.round(state.CH * state.DPR);
  cv.style.width = state.CW + 'px';
  cv.style.height = state.CH + 'px';
  ctx.setTransform(state.DPR, 0, 0, state.DPR, 0, 0);
}

export { scrToWorld, worldToScr, resize };
