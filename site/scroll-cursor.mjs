// One shared, finite motion cursor for the photographic/product presentation.
// The owner samples native scroll and renders every layer from the SAME value.
// This module owns neither DOM state nor requestAnimationFrame scheduling.
const OMEGA = 38;
const SETTLE_MS = 400;
const FALLBACK_MS = 1000 / 60;
const POSITION_EPSILON = .000002;
const VELOCITY_EPSILON = .00002;
const clamp = value => Math.max(0, Math.min(1, value));

/**
 * Analytic critically damped 0..1 cursor. Retargeting preserves velocity;
 * constant-target trajectories are independent of frame rate. A full-range
 * change has less than .000005 residual at the 400ms finite endpoint.
 *
 * setTarget returns true only for a new finite target. The owner schedules
 * step(timestamp) while its result.active is true, and stops when settled.
 * Use snap(target) for reduced motion, hidden/offscreen resumption or restores.
 */
export function createScrollCursor({value = 0} = {}) {
  let current = Number.isFinite(value) ? clamp(value) : 0;
  let target = current;
  let velocity = 0;
  let active = false;
  let previousTime = null;
  let elapsedMs = 0;
  let frames = 0;
  let dt = 0;
  let correction = 0;

  function snapshot() {
    return {value:current,target,velocity,active,settled:!active,elapsedMs,frames,dt,correction};
  }
  function snap(next = target) {
    if (Number.isFinite(next)) target = clamp(next);
    current = target;
    velocity = 0;
    active = false;
    previousTime = null;
    elapsedMs = frames = dt = correction = 0;
    return snapshot();
  }
  function setTarget(next) {
    if (!Number.isFinite(next)) return false;
    const bounded = clamp(next);
    if (bounded === target) return false;
    target = bounded;
    if (!active) previousTime = null;
    active = true;
    elapsedMs = frames = correction = 0;
    return true;
  }
  function step(timestamp) {
    if (!active) return snapshot();
    const timeIsFinite = Number.isFinite(timestamp);
    // The first frame establishes a clock without moving the image. Subsequent
    // repeated/backward/non-finite or sub-millisecond privacy clocks advance at
    // a bounded fallback rate. Genuine 30/60/120/144Hz intervals stay untouched.
    if (previousTime === null && timeIsFinite) {
      previousTime = timestamp;
      dt = 0;
      return snapshot();
    }
    const delta = timeIsFinite && previousTime !== null ? timestamp - previousTime : NaN;
    dt = Number.isFinite(delta) && delta >= 1 ? delta : FALLBACK_MS;
    if (timeIsFinite) previousTime = timestamp;
    const seconds = dt / 1000;
    const error = current - target;
    const impulse = velocity + OMEGA * error;
    const decay = Math.exp(-OMEGA * seconds);
    const next = target + (error + impulse * seconds) * decay;
    velocity = (velocity - OMEGA * impulse * seconds) * decay;
    current = clamp(next);
    if (current !== next) velocity = 0;
    elapsedMs += dt;
    frames++;
    const resting = Math.abs(target-current) <= POSITION_EPSILON && Math.abs(velocity) <= VELOCITY_EPSILON;
    if (resting || elapsedMs >= SETTLE_MS) {
      correction = target-current;
      current = target;
      velocity = 0;
      active = false;
      previousTime = null;
    }
    return snapshot();
  }
  return {setTarget,step,snap,snapshot};
}
