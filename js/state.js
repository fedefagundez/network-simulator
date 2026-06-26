const outer = document.getElementById('canvas-outer');
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const R = 22;

const state = {
  DPR: window.devicePixelRatio || 1,
  CW: 0,
  CH: 0,

  tool: 'pointer',
  nodes: [],
  edges: [],
  srcNode: null,
  dstNode: null,

  animId: null,
  dragging: null,
  dragOffX: 0,
  dragOffY: 0,
  hoveredNode: null,

  pathHL: [],
  packetPos: null,
  packetEdgeIdx: 0,
  packetT: 0,
  addCtr: 8,

  camScale: 1,
  camOffX: 0,
  camOffY: 0,

  panning: false,
  panStartX: 0,
  panStartY: 0,
  panCamStartX: 0,
  panCamStartY: 0,

  mouseDownX: 0,
  mouseDownY: 0,
  mouseMoved: false,

  connectStart: null,
  hoveredEdge: null,
  mouseX: 0,
  mouseY: 0,
  clearTimer: null,
};

export { state, outer, cv, ctx, ALPHA, R };
