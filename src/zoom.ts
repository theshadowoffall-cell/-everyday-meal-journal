// Safari can ignore viewport zoom restrictions. Cancel its gesture events and
// multi-touch moves as well, without preventing ordinary scrolling or taps.
export function installZoomLock() {
  const preventGesture = (event: Event) => {
    if (event.cancelable) event.preventDefault();
  };
  for (const name of ["gesturestart", "gesturechange", "gestureend"]) {
    document.addEventListener(name, preventGesture, { passive: false });
  }
  document.addEventListener("touchmove", (event: TouchEvent) => {
    if (event.touches.length > 1 && event.cancelable) event.preventDefault();
  }, { passive: false });
}
