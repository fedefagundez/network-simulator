import { state, outer } from './state.js';
import { resize } from './camera.js';
import { initNetwork } from './network.js';
import { draw } from './renderer.js';
import { setupInput } from './input.js';
import { sendPacket, setTool, resetAll } from './tools.js';

function onResize() {
  resize();
  if (state.nodes.length === 0) initNetwork();
  draw();
}

new ResizeObserver(onResize).observe(outer);
onResize();
setupInput();

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
