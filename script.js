const outer = document.getElementById('canvas-outer');
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

let DPR = window.devicePixelRatio || 1;
let CW = 0;
let CH = 0;

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const R = 22;

let tool = 'pointer';
let nodes = [];
let edges = [];
let srcNode = null;
let dstNode = null;
let animId = null;
let dragging = null;
let dragOffX = 0;
let dragOffY = 0;
let hoveredNode = null;
let pathHL = [];
let packetPos = null;
let packetEdgeIdx = 0;
let packetT = 0;
let addCtr = 8;

let camScale = 1;
let camOffX = 0;
let camOffY = 0;

let panning = false;
let panStartX = 0;
let panStartY = 0;
let panCamStartX = 0;
let panCamStartY = 0;

let mouseDownX = 0;
let mouseDownY = 0;
let mouseMoved = false;

let connectStart = null;
let hoveredEdge = null;
let mouseX = 0;
let mouseY = 0;

function scrToWorld(sx, sy) {
  return { x: (sx - camOffX) / camScale, y: (sy - camOffY) / camScale };
}

function worldToScr(wx, wy) {
  return { x: wx * camScale + camOffX, y: wy * camScale + camOffY };
}

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

function resize() {
  DPR = window.devicePixelRatio || 1;
  const rect = outer.getBoundingClientRect();
  CW = rect.width;
  CH = rect.height;
  cv.width = Math.round(CW * DPR);
  cv.height = Math.round(CH * DPR);
  cv.style.width = CW + 'px';
  cv.style.height = CH + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (nodes.length === 0) initNetwork();
  else draw();
}

new ResizeObserver(() => resize()).observe(outer);
resize();

function nodeR() {
  return Math.max(14, Math.round(CW * 0.033));
}

function initNetwork() {
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  const px = x => Math.round(x * CW);
  const py = y => Math.round(y * CH);
  nodes = [
    { id: 0, x: px(.17), y: py(.20), on: true, label: 'A' },
    { id: 1, x: px(.44), y: py(.14), on: true, label: 'B' },
    { id: 2, x: px(.72), y: py(.20), on: true, label: 'C' },
    { id: 3, x: px(.17), y: py(.54), on: true, label: 'D' },
    { id: 4, x: px(.44), y: py(.50), on: true, label: 'E' },
    { id: 5, x: px(.72), y: py(.54), on: true, label: 'F' },
    { id: 6, x: px(.30), y: py(.82), on: true, label: 'G' },
    { id: 7, x: px(.60), y: py(.82), on: true, label: 'H' },
  ];
  edges = [[0,1],[1,2],[0,3],[1,4],[2,5],[3,4],[4,5],[3,6],[4,7],[5,7],[6,7]];
  srcNode = 0;
  dstNode = 2;
  pathHL = [];
  packetPos = null;
  addCtr = 8;
  updBadge();
  setStatus('Red lista — presioná <b>Enviar</b> para ver el mensaje viajar.');
  draw();
}

function getNode(id) {
  return nodes.find(n => n.id === id) || null;
}

function bfs(src, dst) {
  if (src === dst) return [src];
  const vis = new Set([src]);
  const q = [[src]];
  while (q.length) {
    const path = q.shift();
    const cur = path[path.length - 1];
    for (const [a, b] of edges) {
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

function sendPacket() {
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  pathHL = [];
  packetPos = null;
  if (srcNode === null || dstNode === null) {
    setStatus('Asigná un <b>emisor</b> y un <b>receptor</b> primero.');
    draw();
    return;
  }
  const ns = getNode(srcNode);
  const nd = getNode(dstNode);
  if (!ns || !ns.on) { setStatus('El emisor está apagado.'); draw(); return; }
  if (!nd || !nd.on) { setStatus('El receptor está apagado.'); draw(); return; }
  if (srcNode === dstNode) { setStatus('Emisor y receptor son el mismo nodo.'); draw(); return; }
  const path = bfs(srcNode, dstNode);
  if (!path) { setStatus('Sin ruta — todos los caminos están bloqueados.'); draw(); return; }
  pathHL = path;
  packetEdgeIdx = 0;
  packetT = 0;
  setStatus('Enviando: ' + path.map(i => getNode(i).label).join(' → '));
  animatePacket();
}

function animatePacket() {
  packetT += 0.038;
  if (packetT >= 1) { packetT = 0; packetEdgeIdx++; }
  if (packetEdgeIdx >= pathHL.length - 1) {
    const last = getNode(pathHL[pathHL.length - 1]);
    packetPos = { x: last.x, y: last.y };
    draw();
    setStatus('✓ Entregado a <b>' + (getNode(dstNode) || { label: '?' }).label + '</b> — ruta: ' + pathHL.map(i => getNode(i).label).join(' → '));
    setTimeout(() => { packetPos = null; pathHL = []; draw(); }, 1500);
    animId = null;
    return;
  }
  const a = getNode(pathHL[packetEdgeIdx]);
  const b = getNode(pathHL[packetEdgeIdx + 1]);
  if (!a || !b) { animId = null; return; }
  packetPos = { x: a.x + (b.x - a.x) * packetT, y: a.y + (b.y - a.y) * packetT };
  draw();
  animId = requestAnimationFrame(animatePacket);
}

function draw() {
  if (!CW || !CH) return;
  const c = pal();
  const nr = nodeR();
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, CW, CH);

  ctx.save();
  ctx.translate(camOffX, camOffY);
  ctx.scale(camScale, camScale);

  const step = Math.round(CW / 17 / camScale);
  const wLeft = -camOffX / camScale;
  const wTop = -camOffY / camScale;
  const wRight = (CW - camOffX) / camScale;
  const wBottom = (CH - camOffY) / camScale;
  ctx.strokeStyle = c.grid;
  ctx.lineWidth = 1 / camScale;
  for (let x = Math.floor(wLeft / step) * step; x <= wRight; x += step) {
    ctx.beginPath(); ctx.moveTo(x, wTop); ctx.lineTo(x, wBottom); ctx.stroke();
  }
  for (let y = Math.floor(wTop / step) * step; y <= wBottom; y += step) {
    ctx.beginPath(); ctx.moveTo(wLeft, y); ctx.lineTo(wRight, y); ctx.stroke();
  }

  const pSet = new Set();
  for (let i = 0; i < pathHL.length - 1; i++) {
    pSet.add([pathHL[i], pathHL[i + 1]].sort().join('-'));
  }

  ctx.lineCap = 'round';
  for (const [a, b] of edges) {
    const na = getNode(a);
    const nb = getNode(b);
    if (!na || !nb) continue;
    const isHL = pSet.has([a, b].sort().join('-'));
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    if (isHL) {
      ctx.strokeStyle = c.pathEdge;
      ctx.lineWidth = 3 / camScale;
      ctx.setLineDash([]);
    } else if (!na.on || !nb.on) {
      ctx.strokeStyle = c.edgeDead;
      ctx.lineWidth = 1.5 / camScale;
      ctx.setLineDash([5 / camScale, 5 / camScale]);
    } else {
      ctx.strokeStyle = c.edge;
      ctx.lineWidth = 1.5 / camScale;
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const n of nodes) {
    let fill, border;
    if (!n.on) { fill = c.nodeOff; border = c.nodeOffBr; }
    else if (n.id === srcNode && n.id === dstNode) { fill = '#c97cd4'; border = '#8a3a96'; }
    else if (n.id === srcNode) { fill = c.nodeSrc; border = c.nodeSrcBr; }
    else if (n.id === dstNode) { fill = c.nodeDst; border = c.nodeDstBr; }
    else if (pathHL.includes(n.id)) { fill = c.nodePath; border = c.nodePathBr; }
    else { fill = c.nodeActive; border = c.nodeActiveBr; }

    if (hoveredNode === n.id && tool !== 'add') {
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
    ctx.lineWidth = 2 / camScale;
    ctx.stroke();

    if (!n.on) {
      ctx.save();
      ctx.strokeStyle = isDark() ? '#666' : '#ccc';
      ctx.lineWidth = 2 / camScale;
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
    if (n.id === srcNode) { ctx.fillStyle = c.nodeSrcBr; ctx.fillText('TX', n.x, n.y + nr + tagFs + 2); }
    if (n.id === dstNode) { ctx.fillStyle = c.nodeDstBr; ctx.fillText('RX', n.x, n.y + nr + (n.id === srcNode ? tagFs * 2 + 4 : tagFs + 2)); }
  }

  if (packetPos) {
    const pr = Math.max(7, Math.round(CW * 0.012));
    ctx.beginPath();
    ctx.arc(packetPos.x, packetPos.y, pr, 0, Math.PI * 2);
    ctx.fillStyle = c.pkt;
    ctx.fill();
    ctx.strokeStyle = c.pktBr;
    ctx.lineWidth = 2 / camScale;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(packetPos.x, packetPos.y, pr + 5, 0, Math.PI * 2);
    ctx.strokeStyle = c.pkt + '55';
    ctx.lineWidth = 1 / camScale;
    ctx.stroke();
  }

  if (tool === 'connect' && connectStart !== null) {
    const ns = getNode(connectStart);
    if (ns) {
      const mw = scrToWorld(mouseX, mouseY);
      ctx.beginPath();
      ctx.moveTo(ns.x, ns.y);
      ctx.lineTo(mw.x, mw.y);
      ctx.strokeStyle = '#3db86b';
      ctx.lineWidth = 2 / camScale;
      ctx.setLineDash([6 / camScale, 4 / camScale]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  if (tool === 'disconnect' && hoveredEdge !== null) {
    const [a, b] = edges[hoveredEdge];
    const na = getNode(a);
    const nb = getNode(b);
    if (na && nb) {
      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(nb.x, nb.y);
      ctx.strokeStyle = '#e05b5b';
      ctx.lineWidth = 4 / camScale;
      ctx.setLineDash([]);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function getNodeAt(sx, sy) {
  const nr = nodeR();
  for (const n of nodes) {
    const sp = worldToScr(n.x, n.y);
    if (Math.hypot(sp.x - sx, sp.y - sy) <= nr * camScale + 6) return n.id;
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
  const threshold = 8 / camScale;
  for (let i = 0; i < edges.length; i++) {
    const [a, b] = edges[i];
    const na = getNode(a);
    const nb = getNode(b);
    if (!na || !nb) continue;
    if (distToSegment(wx, wy, na.x, na.y, nb.x, nb.y) <= threshold) return i;
  }
  return null;
}

function edgeExists(a, b) {
  return edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

function evXY(e, touch) {
  const r = cv.getBoundingClientRect();
  const cl = touch ? e.changedTouches[0] : e;
  return {
    x: (cl.clientX - r.left) * CW / r.width,
    y: (cl.clientY - r.top) * CH / r.height
  };
}

function handleClick(sx, sy) {
  const w = scrToWorld(sx, sy);
  const nid = getNodeAt(sx, sy);

  if (tool === 'add') {
    if (nid !== null) return;
    const label = addCtr < ALPHA.length ? ALPHA[addCtr] : String(addCtr);
    const newId = nodes.length ? Math.max(...nodes.map(n => n.id)) + 1 : 0;
    nodes.push({ id: newId, x: w.x, y: w.y, on: true, label });
    addCtr++;
    pathHL = [];
    packetPos = null;
    setStatus('Nodo <b>' + label + '</b> agregado. Usá <b>Conectar</b> para enlazarlo.');
    updBadge();
    draw();
    return;
  }

  if (nid === null) return;

  if (tool === 'delete') {
    const lbl = getNode(nid).label;
    nodes = nodes.filter(n => n.id !== nid);
    edges = edges.filter(([a, b]) => a !== nid && b !== nid);
    if (srcNode === nid) srcNode = null;
    if (dstNode === nid) dstNode = null;
    pathHL = [];
    packetPos = null;
    setStatus('Nodo <b>' + lbl + '</b> eliminado.');
    updBadge();
    draw();
    return;
  }

  if (tool === 'source') {
    if (nid === dstNode) { setStatus('Ese nodo ya es el receptor.'); return; }
    srcNode = nid;
    pathHL = [];
    packetPos = null;
    setStatus('Emisor: <b>' + getNode(nid).label + '</b>.');
    draw();
    return;
  }

  if (tool === 'dest') {
    if (nid === srcNode) { setStatus('Ese nodo ya es el emisor.'); return; }
    dstNode = nid;
    pathHL = [];
    packetPos = null;
    setStatus('Receptor: <b>' + getNode(nid).label + '</b>. Presioná <b>Enviar</b>.');
    draw();
    return;
  }

  if (tool === 'toggle') {
    if (nid === srcNode || nid === dstNode) {
      setStatus('No podés apagar el emisor o receptor activo.');
      return;
    }
    const n = getNode(nid);
    n.on = !n.on;
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    pathHL = [];
    packetPos = null;
    setStatus('Nodo <b>' + n.label + '</b> ' + (n.on ? 'encendido ✓' : 'apagado ✗') + '.');
    draw();
    return;
  }

  if (tool === 'disconnect') {
    const eidx = getEdgeAt(w.x, w.y);
    if (eidx === null) { setStatus('Clicá sobre una conexión para eliminarla.'); return; }
    const [a, b] = edges[eidx];
    edges.splice(eidx, 1);
    pathHL = [];
    packetPos = null;
    setStatus('Conexión eliminada: <b>' + getNode(a).label + '</b> — <b>' + getNode(b).label + '</b>.');
    draw();
    return;
  }

  if (tool === 'connect') {
    if (connectStart === null) {
      connectStart = nid;
      setStatus('Seleccioná el segundo nodo para conectar con <b>' + getNode(nid).label + '</b>.');
      draw();
      return;
    }
    if (nid === connectStart) {
      connectStart = null;
      setStatus('Conexión cancelada. Clic en un nodo para iniciar.');
      draw();
      return;
    }
    if (edgeExists(connectStart, nid)) {
      setStatus('Ya existe una conexión entre <b>' + getNode(connectStart).label + '</b> y <b>' + getNode(nid).label + '</b>.');
      connectStart = null;
      draw();
      return;
    }
    edges.push([connectStart, nid]);
    setStatus('Conexión creada: <b>' + getNode(connectStart).label + '</b> — <b>' + getNode(nid).label + '</b>.');
    connectStart = null;
    draw();
    return;
  }
}

cv.addEventListener('mousedown', e => {
  const { x, y } = evXY(e);
  const nid = getNodeAt(x, y);
  if (tool === 'pointer' && nid !== null) {
    const n = getNode(nid);
    dragging = nid;
    dragOffX = n.x - (x - camOffX) / camScale;
    dragOffY = n.y - (y - camOffY) / camScale;
    cv.style.cursor = 'grabbing';
  } else {
    panning = true;
    panStartX = x;
    panStartY = y;
    panCamStartX = camOffX;
    panCamStartY = camOffY;
    mouseDownX = x;
    mouseDownY = y;
    mouseMoved = false;
    cv.style.cursor = 'grabbing';
  }
});

cv.addEventListener('mouseup', e => {
  const { x, y } = evXY(e);
  if (dragging !== null) { dragging = null; cv.style.cursor = 'default'; return; }
  if (panning) {
    panning = false;
    if (!mouseMoved) handleClick(x, y);
    cv.style.cursor = 'default';
    return;
  }
  handleClick(x, y);
});

cv.addEventListener('mousemove', e => {
  const { x, y } = evXY(e);

  if (dragging !== null) {
    const n = nodes.find(nd => nd.id === dragging);
    if (n) {
      n.x = (x - camOffX) / camScale + dragOffX;
      n.y = (y - camOffY) / camScale + dragOffY;
    }
    draw();
    return;
  }

  if (panning) {
    camOffX = panCamStartX + (x - panStartX);
    camOffY = panCamStartY + (y - panStartY);
    if (Math.abs(x - mouseDownX) > 3 || Math.abs(y - mouseDownY) > 3) mouseMoved = true;
    draw();
    return;
  }

  mouseX = x;
  mouseY = y;

  if (tool === 'disconnect') {
    const w = scrToWorld(x, y);
    const ne = getEdgeAt(w.x, w.y);
    if (ne !== hoveredEdge) { hoveredEdge = ne; }
  }

  const hov = getNodeAt(x, y);
  if (hov !== hoveredNode) { hoveredNode = hov; }
  draw();

  if (tool === 'disconnect') cv.style.cursor = hoveredEdge !== null ? 'pointer' : 'default';
  else cv.style.cursor = (hov !== null && tool === 'pointer') ? 'grab' : (tool === 'add' ? 'crosshair' : 'default');
});

cv.addEventListener('mouseleave', () => {
  dragging = null;
  panning = false;
  hoveredNode = null;
  draw();
});

cv.addEventListener('wheel', e => {
  e.preventDefault();
  const { x, y } = evXY(e);
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.min(5, Math.max(0.2, camScale * delta));
  const ratio = newScale / camScale;
  camOffX = x - (x - camOffX) * ratio;
  camOffY = y - (y - camOffY) * ratio;
  camScale = newScale;
  draw();
}, { passive: false });

cv.addEventListener('touchstart', e => {
  e.preventDefault();
  const { x, y } = evXY(e, true);
  const nid = getNodeAt(x, y);
  if (tool === 'pointer' && nid !== null) {
    const n = getNode(nid);
    dragging = nid;
    dragOffX = n.x - (x - camOffX) / camScale;
    dragOffY = n.y - (y - camOffY) / camScale;
  } else {
    panning = true;
    panStartX = x;
    panStartY = y;
    panCamStartX = camOffX;
    panCamStartY = camOffY;
    mouseDownX = x;
    mouseDownY = y;
    mouseMoved = false;
  }
}, { passive: false });

cv.addEventListener('touchmove', e => {
  e.preventDefault();
  const { x, y } = evXY(e, true);
  if (dragging !== null) {
    const n = nodes.find(nd => nd.id === dragging);
    if (n) {
      n.x = (x - camOffX) / camScale + dragOffX;
      n.y = (y - camOffY) / camScale + dragOffY;
    }
    draw();
  } else if (panning) {
    camOffX = panCamStartX + (x - panStartX);
    camOffY = panCamStartY + (y - panStartY);
    if (Math.abs(x - mouseDownX) > 3 || Math.abs(y - mouseDownY) > 3) mouseMoved = true;
    draw();
  }
}, { passive: false });

cv.addEventListener('touchend', e => {
  e.preventDefault();
  if (dragging !== null) { dragging = null; return; }
  if (panning) {
    panning = false;
    if (!mouseMoved) { const { x, y } = evXY(e, true); handleClick(x, y); }
    return;
  }
  const { x, y } = evXY(e, true);
  handleClick(x, y);
}, { passive: false });

function setTool(t) {
  tool = t;
  connectStart = null;
  hoveredEdge = null;
  document.querySelectorAll('.tb').forEach(el => el.classList.remove('active'));
  const b = document.getElementById('btn-' + t);
  if (b) b.classList.add('active');
  const h = {
    pointer: 'Arrastrá nodos para moverlos.',
    add: 'Clic en espacio vacío para agregar un nodo.',
    delete: 'Clic en un nodo para eliminarlo.',
    source: 'Clic en un nodo para designarlo emisor (TX).',
    dest: 'Clic en un nodo para designarlo receptor (RX).',
    toggle: 'Clic en un nodo para apagarlo o encenderlo.',
    connect: 'Clic en un nodo, luego en otro para conectarlos.',
    disconnect: 'Clic sobre una conexión para eliminarla.'
  };
  setStatus(h[t] || '');
}

function setStatus(m) {
  document.getElementById('status').innerHTML = m;
}

function updBadge() {
  document.getElementById('badge').textContent = nodes.length + ' nodo' + (nodes.length !== 1 ? 's' : '');
}

function resetAll() {
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  camScale = 1;
  camOffX = 0;
  camOffY = 0;
  initNetwork();
}

document.getElementById('btn-reset').addEventListener('click', resetAll);
document.getElementById('btn-send').addEventListener('click', sendPacket);
document.getElementById('btn-pointer').addEventListener('click', () => setTool('pointer'));
document.getElementById('btn-add').addEventListener('click', () => setTool('add'));
document.getElementById('btn-delete').addEventListener('click', () => setTool('delete'));
document.getElementById('btn-source').addEventListener('click', () => setTool('source'));
document.getElementById('btn-dest').addEventListener('click', () => setTool('dest'));
document.getElementById('btn-toggle').addEventListener('click', () => setTool('toggle'));
document.getElementById('btn-connect').addEventListener('click', () => setTool('connect'));
document.getElementById('btn-disconnect').addEventListener('click', () => setTool('disconnect'));
