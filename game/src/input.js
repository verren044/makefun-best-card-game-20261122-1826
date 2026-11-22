// Pointer and keyboard input for a click-driven card game. Clicks are reported with
// canvas coordinates (the canvas is scaled to the window); keys 1-7 play hand cards,
// Space/Enter ends the turn, P pauses, M mutes, R restarts after a duel.
export function createInput(canvas, onClick, onKey) {
  function toCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }
  canvas.addEventListener('pointerdown', (event) => {
    onClick(toCanvas(event));
  });
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    onKey(event.code);
  });
  return {};
}
