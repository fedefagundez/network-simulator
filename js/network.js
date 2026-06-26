import { state } from './state.js';
import { worldToScr } from './camera.js';

function nodeR() {
  return Math.max(14, Math.round(state.CW * 0.033));
}

function initNetwork() {
  if (state.animId) { cancelAnimationFrame(state.animId); state.animId = null; }
  if (state.clearTimer) { clearTimeout(state.clearTimer); state.clearTimer = null; }
  const px = x => Math.round(x * state.CW);
  const py = y => Math.round(y * state.CH);
  state.nodes = [
    { id: 0, x: px(.17), y: py(.20), on: true, label: 'A' },
    { id: 1, x: px(.44), y: py(.14), on: true, label: 'B' },
    { id: 2, x: px(.72), y: py(.20), on: true, label: 'C' },
    { id: 3, x: px(.17), y: py(.54), on: true, label: 'D' },
    { id: 4, x: px(.44), y: py(.50), on: true, label: 'E' },
    { id: 5, x: px(.72), y: py(.54), on: true, label: 'F' },
    { id: 6, x: px(.30), y: py(.82), on: true, label: 'G' },
    { id: 7, x: px(.60), y: py(.82), on: true, label: 'H' },
  ];
  state.edges = [[0,1],[1,2],[0,3],[1,4],[2,5],[3,4],[4,5],[3,6],[4,7],[5,7],[6,7]];
  state.srcNode = 0;
  state.dstNode = 2;
  state.pathHL = [];
  state.packetPos = null;
  state.addCtr = 8;
  updBadge();
  setStatus('Red lista — presioná <b>Enviar</b> para ver el mensaje viajar.');
}

function getNode(id) {
  return state.nodes.find(n => n.id === id) || null;
}

function bfs(src, dst) {
  if (src === dst) return [src];
  const vis = new Set([src]);
  const q = [[src]];
  while (q.length) {
    const path = q.shift();
    const cur = path[path.length - 1];
    for (const [a, b] of state.edges) {
      const nb = a === cur ? b : b === cur ? a : -1;
      if (nb === -1 || vis.has(nb)) continue;
      const nn = getNode(nb);
      if (!nn || !nn.on) continue;
      const np = [...path, nb];
      if (nb === dst) return np;
      vis.add(nb);
      q.push(np);
    }
  }
  return null;
}

function getNodeAt(sx, sy) {
  const nr = nodeR();
  for (const n of state.nodes) {
    const sp = worldToScr(n.x, n.y);
    if (Math.hypot(sp.x - sx, sp.y - sy) <= nr * state.camScale + 6) return n.id;
  }
  return null;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function getEdgeAt(wx, wy) {
  const threshold = 8 / state.camScale;
  for (let i = 0; i < state.edges.length; i++) {
    const [a, b] = state.edges[i];
    const na = getNode(a);
    const nb = getNode(b);
    if (!na || !nb) continue;
    if (distToSegment(wx, wy, na.x, na.y, nb.x, nb.y) <= threshold) return i;
  }
  return null;
}

function edgeExists(a, b) {
  return state.edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

function updBadge() {
  document.getElementById('badge').textContent = state.nodes.length + ' nodo' + (state.nodes.length !== 1 ? 's' : '');
}

function setStatus(m) {
  document.getElementById('status').innerHTML = m;
}

export { nodeR, initNetwork, getNode, bfs, getNodeAt, distToSegment, getEdgeAt, edgeExists, updBadge, setStatus };
