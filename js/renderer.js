import { state, ctx } from './state.js';
import { scrToWorld } from './camera.js';
import { getNode, nodeR } from './network.js';

function isDark() {
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

function pal() {
  const d = isDark();
  return {
    bg: d ? '#1e1e1c' : '#f0efeb',
    grid: d ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.035)',
    edge: d ? '#3a3a36' : '#c8c7c0',
    edgeDead: d ? '#262624' : '#e2e1db',
    pathEdge: '#c8880a',
    nodeActive: d ? '#4a76d4' : '#5b87e0',
    nodeActiveBr: d ? '#2a4fa4' : '#3a5fa8',
    nodeOff: d ? '#363634' : '#bebdb8',
    nodeOffBr: d ? '#282826' : '#a0a09a',
    nodeSrc: '#3db86b',
    nodeSrcBr: '#1e8a44',
    nodeDst: '#e05b5b',
    nodeDstBr: '#a83333',
    nodePath: '#7c5ce0',
    nodePathBr: '#5a3fa4',
    pkt: '#f5a623',
    pktBr: '#b87a10',
    lblOn: '#fff',
    lblOff: d ? '#555' : '#b8b8b0',
    hover: d ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
  };
}

function draw() {
  if (!state.CW || !state.CH) return;
  const c = pal();
  const nr = nodeR();
  ctx.clearRect(0, 0, state.CW, state.CH);
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, state.CW, state.CH);

  ctx.save();
  ctx.translate(state.camOffX, state.camOffY);
  ctx.scale(state.camScale, state.camScale);

  const step = Math.round(state.CW / 17 / state.camScale);
  const wLeft = -state.camOffX / state.camScale;
  const wTop = -state.camOffY / state.camScale;
  const wRight = (state.CW - state.camOffX) / state.camScale;
  const wBottom = (state.CH - state.camOffY) / state.camScale;
  ctx.strokeStyle = c.grid;
  ctx.lineWidth = 1 / state.camScale;
  for (let x = Math.floor(wLeft / step) * step; x <= wRight; x += step) {
    ctx.beginPath(); ctx.moveTo(x, wTop); ctx.lineTo(x, wBottom); ctx.stroke();
  }
  for (let y = Math.floor(wTop / step) * step; y <= wBottom; y += step) {
    ctx.beginPath(); ctx.moveTo(wLeft, y); ctx.lineTo(wRight, y); ctx.stroke();
  }

  const pSet = new Set();
  for (let i = 0; i < state.pathHL.length - 1; i++) {
    pSet.add([state.pathHL[i], state.pathHL[i + 1]].sort().join('-'));
  }

  ctx.lineCap = 'round';
  for (const [a, b] of state.edges) {
    const na = getNode(a);
    const nb = getNode(b);
    if (!na || !nb) continue;
    const isHL = pSet.has([a, b].sort().join('-'));
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    if (isHL) {
      ctx.strokeStyle = c.pathEdge;
      ctx.lineWidth = 3 / state.camScale;
      ctx.setLineDash([]);
    } else if (!na.on || !nb.on) {
      ctx.strokeStyle = c.edgeDead;
      ctx.lineWidth = 1.5 / state.camScale;
      ctx.setLineDash([5 / state.camScale, 5 / state.camScale]);
    } else {
      ctx.strokeStyle = c.edge;
      ctx.lineWidth = 1.5 / state.camScale;
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const n of state.nodes) {
    let fill, border;
    if (!n.on) { fill = c.nodeOff; border = c.nodeOffBr; }
    else if (n.id === state.srcNode && n.id === state.dstNode) { fill = '#c97cd4'; border = '#8a3a96'; }
    else if (n.id === state.srcNode) { fill = c.nodeSrc; border = c.nodeSrcBr; }
    else if (n.id === state.dstNode) { fill = c.nodeDst; border = c.nodeDstBr; }
    else if (state.pathHL.includes(n.id)) { fill = c.nodePath; border = c.nodePathBr; }
    else { fill = c.nodeActive; border = c.nodeActiveBr; }

    if (state.hoveredNode === n.id && state.tool !== 'add') {
      ctx.beginPath();
      ctx.arc(n.x, n.y, nr + 7, 0, Math.PI * 2);
      ctx.fillStyle = c.hover;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(n.x, n.y, nr, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 2 / state.camScale;
    ctx.stroke();

    if (!n.on) {
      ctx.save();
      ctx.strokeStyle = isDark() ? '#666' : '#ccc';
      ctx.lineWidth = 2 / state.camScale;
      ctx.lineCap = 'round';
      const s = Math.round(nr * .38);
      ctx.beginPath(); ctx.moveTo(n.x - s, n.y - s); ctx.lineTo(n.x + s, n.y + s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(n.x + s, n.y - s); ctx.lineTo(n.x - s, n.y + s); ctx.stroke();
      ctx.restore();
    }

    const fs = Math.max(11, Math.round(nr * 0.62));
    ctx.fillStyle = n.on ? c.lblOn : c.lblOff;
    ctx.font = `bold ${fs}px -apple-system,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.label, n.x, n.y);

    const tagFs = Math.max(9, Math.round(nr * 0.44));
    ctx.font = `${tagFs}px -apple-system,sans-serif`;
    if (n.id === state.srcNode) { ctx.fillStyle = c.nodeSrcBr; ctx.fillText('TX', n.x, n.y + nr + tagFs + 2); }
    if (n.id === state.dstNode) { ctx.fillStyle = c.nodeDstBr; ctx.fillText('RX', n.x, n.y + nr + (n.id === state.srcNode ? tagFs * 2 + 4 : tagFs + 2)); }
  }

  if (state.packetPos) {
    const pr = Math.max(7, Math.round(state.CW * 0.012));
    ctx.beginPath();
    ctx.arc(state.packetPos.x, state.packetPos.y, pr, 0, Math.PI * 2);
    ctx.fillStyle = c.pkt;
    ctx.fill();
    ctx.strokeStyle = c.pktBr;
    ctx.lineWidth = 2 / state.camScale;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(state.packetPos.x, state.packetPos.y, pr + 5, 0, Math.PI * 2);
    ctx.strokeStyle = c.pkt + '55';
    ctx.lineWidth = 1 / state.camScale;
    ctx.stroke();
  }

  if (state.tool === 'connect' && state.connectStart !== null) {
    const ns = getNode(state.connectStart);
    if (ns) {
      const mw = scrToWorld(state.mouseX, state.mouseY);
      ctx.beginPath();
      ctx.moveTo(ns.x, ns.y);
      ctx.lineTo(mw.x, mw.y);
      ctx.strokeStyle = '#3db86b';
      ctx.lineWidth = 2 / state.camScale;
      ctx.setLineDash([6 / state.camScale, 4 / state.camScale]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  if (state.tool === 'disconnect' && state.hoveredEdge !== null) {
    const [a, b] = state.edges[state.hoveredEdge];
    const na = getNode(a);
    const nb = getNode(b);
    if (na && nb) {
      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(nb.x, nb.y);
      ctx.strokeStyle = '#e05b5b';
      ctx.lineWidth = 4 / state.camScale;
      ctx.setLineDash([]);
      ctx.stroke();
    }
  }

  ctx.restore();
}

export { draw, pal, isDark };
