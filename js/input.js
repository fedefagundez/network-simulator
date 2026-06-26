import { state, cv } from './state.js';
import { scrToWorld } from './camera.js';
import { getNode, getNodeAt, getEdgeAt } from './network.js';
import { draw } from './renderer.js';
import { handleClick } from './tools.js';

function evXY(e, touch) {
  const r = cv.getBoundingClientRect();
  const cl = touch ? e.changedTouches[0] : e;
  return {
    x: (cl.clientX - r.left) * state.CW / r.width,
    y: (cl.clientY - r.top) * state.CH / r.height,
  };
}

function setupInput() {
  cv.addEventListener('mousedown', e => {
    if (typeof Sounds !== 'undefined') Sounds.init();
    const { x, y } = evXY(e);
    const nid = getNodeAt(x, y);
    if (state.tool === 'pointer' && nid !== null) {
      const n = getNode(nid);
      state.dragging = nid;
      state.dragOffX = n.x - (x - state.camOffX) / state.camScale;
      state.dragOffY = n.y - (y - state.camOffY) / state.camScale;
      cv.style.cursor = 'grabbing';
    } else {
      state.panning = true;
      state.panStartX = x;
      state.panStartY = y;
      state.panCamStartX = state.camOffX;
      state.panCamStartY = state.camOffY;
      state.mouseDownX = x;
      state.mouseDownY = y;
      state.mouseMoved = false;
      cv.style.cursor = 'grabbing';
    }
  });

  cv.addEventListener('mouseup', e => {
    const { x, y } = evXY(e);
    if (state.dragging !== null) { state.dragging = null; cv.style.cursor = 'default'; return; }
    if (state.panning) {
      state.panning = false;
      if (!state.mouseMoved) handleClick(x, y);
      cv.style.cursor = 'default';
      return;
    }
    handleClick(x, y);
  });

  cv.addEventListener('mousemove', e => {
    const { x, y } = evXY(e);

    if (state.dragging !== null) {
      const n = state.nodes.find(nd => nd.id === state.dragging);
      if (n) {
        n.x = (x - state.camOffX) / state.camScale + state.dragOffX;
        n.y = (y - state.camOffY) / state.camScale + state.dragOffY;
      }
      draw();
      return;
    }

    if (state.panning) {
      state.camOffX = state.panCamStartX + (x - state.panStartX);
      state.camOffY = state.panCamStartY + (y - state.panStartY);
      if (Math.abs(x - state.mouseDownX) > 3 || Math.abs(y - state.mouseDownY) > 3) state.mouseMoved = true;
      draw();
      return;
    }

    state.mouseX = x;
    state.mouseY = y;

    if (state.tool === 'disconnect') {
      const w = scrToWorld(x, y);
      const ne = getEdgeAt(w.x, w.y);
      if (ne !== state.hoveredEdge) { state.hoveredEdge = ne; }
    }

    const hov = getNodeAt(x, y);
    if (hov !== state.hoveredNode) { state.hoveredNode = hov; }
    draw();

    if (state.tool === 'disconnect') cv.style.cursor = state.hoveredEdge !== null ? 'pointer' : 'default';
    else cv.style.cursor = (hov !== null && state.tool === 'pointer') ? 'grab' : (state.tool === 'add' ? 'crosshair' : 'default');
  });

  cv.addEventListener('mouseleave', () => {
    state.dragging = null;
    state.panning = false;
    state.hoveredNode = null;
    draw();
  });

  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const { x, y } = evXY(e);
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(5, Math.max(0.2, state.camScale * delta));
    const ratio = newScale / state.camScale;
    state.camOffX = x - (x - state.camOffX) * ratio;
    state.camOffY = y - (y - state.camOffY) * ratio;
    state.camScale = newScale;
    draw();
  }, { passive: false });

  cv.addEventListener('touchstart', e => {
    e.preventDefault();
    const { x, y } = evXY(e, true);
    const nid = getNodeAt(x, y);
    if (state.tool === 'pointer' && nid !== null) {
      const n = getNode(nid);
      state.dragging = nid;
      state.dragOffX = n.x - (x - state.camOffX) / state.camScale;
      state.dragOffY = n.y - (y - state.camOffY) / state.camScale;
    } else {
      state.panning = true;
      state.panStartX = x;
      state.panStartY = y;
      state.panCamStartX = state.camOffX;
      state.panCamStartY = state.camOffY;
      state.mouseDownX = x;
      state.mouseDownY = y;
      state.mouseMoved = false;
    }
  }, { passive: false });

  cv.addEventListener('touchmove', e => {
    e.preventDefault();
    const { x, y } = evXY(e, true);
    if (state.dragging !== null) {
      const n = state.nodes.find(nd => nd.id === state.dragging);
      if (n) {
        n.x = (x - state.camOffX) / state.camScale + state.dragOffX;
        n.y = (y - state.camOffY) / state.camScale + state.dragOffY;
      }
      draw();
    } else if (state.panning) {
      state.camOffX = state.panCamStartX + (x - state.panStartX);
      state.camOffY = state.panCamStartY + (y - state.panStartY);
      if (Math.abs(x - state.mouseDownX) > 3 || Math.abs(y - state.mouseDownY) > 3) state.mouseMoved = true;
      draw();
    }
  }, { passive: false });

  cv.addEventListener('touchend', e => {
    e.preventDefault();
    if (state.dragging !== null) { state.dragging = null; return; }
    if (state.panning) {
      state.panning = false;
      if (!state.mouseMoved) { const { x, y } = evXY(e, true); handleClick(x, y); }
      return;
    }
    const { x, y } = evXY(e, true);
    handleClick(x, y);
  }, { passive: false });
}

export { setupInput, evXY };
