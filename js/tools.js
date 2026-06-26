import { state, ALPHA } from './state.js';
import { scrToWorld } from './camera.js';
import { getNode, getNodeAt, getEdgeAt, edgeExists, bfs, initNetwork, updBadge, setStatus } from './network.js';
import { draw } from './renderer.js';

function sendPacket() {
  if (state.animId) { cancelAnimationFrame(state.animId); state.animId = null; }
  if (state.clearTimer) { clearTimeout(state.clearTimer); state.clearTimer = null; }
  state.pathHL = [];
  state.packetPos = null;
  if (state.srcNode === null || state.dstNode === null) {
    Sounds.error();
    setStatus('Asigná un <b>emisor</b> y un <b>receptor</b> primero.');
    draw();
    return;
  }
  const ns = getNode(state.srcNode);
  const nd = getNode(state.dstNode);
  if (!ns || !ns.on) { Sounds.error(); setStatus('El emisor está apagado.'); draw(); return; }
  if (!nd || !nd.on) { Sounds.error(); setStatus('El receptor está apagado.'); draw(); return; }
  if (state.srcNode === state.dstNode) { Sounds.error(); setStatus('Emisor y receptor son el mismo nodo.'); draw(); return; }
  const path = bfs(state.srcNode, state.dstNode);
  if (!path) { Sounds.error(); setStatus('Sin ruta — todos los caminos están bloqueados.'); draw(); return; }
  state.pathHL = path;
  state.packetEdgeIdx = 0;
  state.packetT = 0;
  Sounds.send();
  setStatus('Enviando: ' + path.map(i => getNode(i).label).join(' → '));
  animatePacket();
}

function animatePacket() {
  state.packetT += 0.038;
  if (state.packetT >= 1) { state.packetT = 0; state.packetEdgeIdx++; }
  if (state.packetEdgeIdx >= state.pathHL.length - 1) {
    const last = getNode(state.pathHL[state.pathHL.length - 1]);
    state.packetPos = { x: last.x, y: last.y };
    draw();
    Sounds.deliver();
    setStatus('✓ Entregado a <b>' + (getNode(state.dstNode) || { label: '?' }).label + '</b> — ruta: ' + state.pathHL.map(i => getNode(i).label).join(' → '));
    state.clearTimer = setTimeout(() => { state.packetPos = null; state.pathHL = []; state.clearTimer = null; draw(); }, 1500);
    state.animId = null;
    return;
  }
  const a = getNode(state.pathHL[state.packetEdgeIdx]);
  const b = getNode(state.pathHL[state.packetEdgeIdx + 1]);
  if (!a || !b) { state.animId = null; return; }
  state.packetPos = { x: a.x + (b.x - a.x) * state.packetT, y: a.y + (b.y - a.y) * state.packetT };
  draw();
  state.animId = requestAnimationFrame(animatePacket);
}

function handleClick(sx, sy) {
  const w = scrToWorld(sx, sy);
  const nid = getNodeAt(sx, sy);

  if (state.tool === 'add') {
    if (nid !== null) return;
    const label = state.addCtr < ALPHA.length ? ALPHA[state.addCtr] : String(state.addCtr);
    const newId = state.nodes.length ? Math.max(...state.nodes.map(n => n.id)) + 1 : 0;
    state.nodes.push({ id: newId, x: w.x, y: w.y, on: true, label });
    state.addCtr++;
    Sounds.add();
    state.pathHL = [];
    state.packetPos = null;
    setStatus('Nodo <b>' + label + '</b> agregado. Usá <b>Conectar</b> para enlazarlo.');
    updBadge();
    draw();
    return;
  }

  if (nid === null) return;

  if (state.tool === 'delete') {
    const lbl = getNode(nid).label;
    state.nodes = state.nodes.filter(n => n.id !== nid);
    state.edges = state.edges.filter(([a, b]) => a !== nid && b !== nid);
    if (state.srcNode === nid) state.srcNode = null;
    if (state.dstNode === nid) state.dstNode = null;
    Sounds.delete();
    state.pathHL = [];
    state.packetPos = null;
    setStatus('Nodo <b>' + lbl + '</b> eliminado.');
    updBadge();
    draw();
    return;
  }

  if (state.tool === 'source') {
    if (nid === state.dstNode) { Sounds.error(); setStatus('Ese nodo ya es el receptor.'); return; }
    state.srcNode = nid;
    state.pathHL = [];
    state.packetPos = null;
    setStatus('Emisor: <b>' + getNode(nid).label + '</b>.');
    draw();
    return;
  }

  if (state.tool === 'dest') {
    if (nid === state.srcNode) { Sounds.error(); setStatus('Ese nodo ya es el emisor.'); return; }
    state.dstNode = nid;
    state.pathHL = [];
    state.packetPos = null;
    setStatus('Receptor: <b>' + getNode(nid).label + '</b>. Presioná <b>Enviar</b>.');
    draw();
    return;
  }

  if (state.tool === 'toggle') {
    if (nid === state.srcNode || nid === state.dstNode) {
      Sounds.error();
      setStatus('No podés apagar el emisor o receptor activo.');
      return;
    }
    const n = getNode(nid);
    n.on = !n.on;
    if (state.animId) { cancelAnimationFrame(state.animId); state.animId = null; }
    state.pathHL = [];
    state.packetPos = null;
    setStatus('Nodo <b>' + n.label + '</b> ' + (n.on ? 'encendido ✓' : 'apagado ✗') + '.');
    draw();
    return;
  }

  if (state.tool === 'disconnect') {
    const eidx = getEdgeAt(w.x, w.y);
    if (eidx === null) { Sounds.error(); setStatus('Clicá sobre una conexión para eliminarla.'); return; }
    const [a, b] = state.edges[eidx];
    state.edges.splice(eidx, 1);
    Sounds.disconnect();
    state.pathHL = [];
    state.packetPos = null;
    setStatus('Conexión eliminada: <b>' + getNode(a).label + '</b> — <b>' + getNode(b).label + '</b>.');
    draw();
    return;
  }

  if (state.tool === 'connect') {
    if (state.connectStart === null) {
      state.connectStart = nid;
      setStatus('Seleccioná el segundo nodo para conectar con <b>' + getNode(nid).label + '</b>.');
      draw();
      return;
    }
    if (nid === state.connectStart) {
      state.connectStart = null;
      setStatus('Conexión cancelada. Clic en un nodo para iniciar.');
      draw();
      return;
    }
    if (edgeExists(state.connectStart, nid)) {
      Sounds.error();
      setStatus('Ya existe una conexión entre <b>' + getNode(state.connectStart).label + '</b> y <b>' + getNode(nid).label + '</b>.');
      state.connectStart = null;
      draw();
      return;
    }
    state.edges.push([state.connectStart, nid]);
    Sounds.connect();
    setStatus('Conexión creada: <b>' + getNode(state.connectStart).label + '</b> — <b>' + getNode(nid).label + '</b>.');
    state.connectStart = null;
    draw();
    return;
  }
}

function setTool(t) {
  state.tool = t;
  state.connectStart = null;
  state.hoveredEdge = null;
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

function resetAll() {
  if (state.animId) { cancelAnimationFrame(state.animId); state.animId = null; }
  if (state.clearTimer) { clearTimeout(state.clearTimer); state.clearTimer = null; }
  state.camScale = 1;
  state.camOffX = 0;
  state.camOffY = 0;
  initNetwork();
}

export { sendPacket, handleClick, setTool, resetAll };
