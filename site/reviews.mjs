// Original directed spectrum study. No Google/Gemini SDK, network or tracking.
// The actual Google mark stays in a separate, unchanged image in the HTML.
const COLOURS = ['#4285f4', '#ea4335', '#fbbc05', '#34a853', '#35c9e4', '#8b70ea', '#de70c5'];
const FIELD_COLOURS = [0,4,5,6].map(index => {
  const hex = COLOURS[index];
  return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
});
const TAU = Math.PI * 2;
const BURST_MS = 1550;
const MAX_BURST_FRAMES = 180;
const CLOCK_FALLBACK_MS = 1000 / 60;

function fieldColour(phase, index) {
  const safePhase = Number.isFinite(phase) ? Math.max(0,phase) : 0;
  const position = (safePhase*.65+index) % FIELD_COLOURS.length;
  const step = Math.floor(position);
  const from = FIELD_COLOURS[step];
  const to = FIELD_COLOURS[(step+1) % FIELD_COLOURS.length];
  return from.map((channel,channelIndex) => Math.round(channel+(to[channelIndex]-channel)*(position-step))).join(',');
}

/**
 * Finite decorative motion around a review link.
 * @param {{canvas:HTMLCanvasElement,host:HTMLElement,reducedMotion?:boolean|MediaQueryList}} options
 * @returns {{setVisible:(visible:boolean)=>void,dispose:()=>void}}
 *
 * Root sets the host position and canvas inset/size in CSS, then calls
 * setVisible(true) while the section is visible. Internal visibility guards
 * provide a second offscreen/tab-hidden stop. Call dispose when unmounting.
 */
export function mountReviews({canvas, host, reducedMotion}) {
  const empty = {setVisible() {}, dispose() {}};
  if (!canvas || !host || typeof canvas.getContext !== 'function') return empty;
  let context;
  try { context = canvas.getContext('2d', {alpha:true}); } catch { return empty; }
  if (!context) return empty;

  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('role', 'presentation');
  canvas.tabIndex = -1;
  canvas.style.pointerEvents = 'none';
  canvas.dataset.reviewFrames = '0';
  canvas.dataset.reviewState = 'paused';
  canvas.dataset.reviewBudget = String(MAX_BURST_FRAMES);
  canvas.dataset.reviewBurstFrames = '0';

  const motionQuery = typeof reducedMotion === 'object' && reducedMotion !== null
    ? reducedMotion : matchMedia('(prefers-reduced-motion: reduce)');
  const isReduced = () => typeof reducedMotion === 'boolean' ? reducedMotion || motionQuery.matches : motionQuery.matches;
  let requestedVisible = false;
  let intersecting = typeof IntersectionObserver === 'undefined';
  let disposed = false;
  let frame = 0;
  let paintedFrames = 0;
  let previousFrameAt = 0;
  let elapsedMs = 0;
  let burstFrames = 0;
  let phase = 0;
  let startPhase = 0;
  let width = 1;
  let height = 1;
  let scale = 1;
  let exclusions = [];
  let pointerX = .5;
  let pointerY = .5;
  let lastPointerStart = -Infinity;
  const particles = Array.from({length:220}, (_, index) => ({
    seed:index * 2.399963229728653,
    size:.55 + ((index * 13) % 15) / 15,
    alpha:.24 + ((index * 7) % 35) / 100
  }));
  canvas.dataset.reviewStyle = 'directed-spectrum';

  const canDraw = () => !disposed && requestedVisible && intersecting && !document.hidden;
  function stop(state = 'paused') {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    canvas.dataset.reviewState = state;
  }
  function measure() {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, Math.min(1800, bounds.width || host.clientWidth || 1));
    height = Math.max(1, Math.min(560, bounds.height || host.clientHeight || 1));
    scale = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1400000 / (width * height)));
    const pixelWidth = Math.max(1, Math.floor(width * scale));
    const pixelHeight = Math.max(1, Math.floor(height * scale));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    // Text, interactive controls and logos always have a clear canvas behind
    // them; the particles occupy the surrounding space, never the letterforms.
    exclusions = Array.from(host.querySelectorAll('[data-review-protect],h1,h2,h3,p,a,button,img'))
      // Protect the actual content, not a large anchor wrapping that content.
      .filter(element => !element.matches('a,button') || element.matches('[data-review-protect]') ||
        !element.querySelector('h1,h2,h3,p,img,[data-review-protect]'))
      .map(element => element.getBoundingClientRect())
      .filter(box => box.width > 0 && box.height > 0)
      .map(box => ({x:box.left-bounds.left-13,y:box.top-bounds.top-13,width:box.width+26,height:box.height+26}));
  }
  function paint(value, activity = 0) {
    context.setTransform(scale,0,0,scale,0,0);
    context.clearRect(0,0,width,height);
    context.save();

    const narrow = width < 600;
    const swayX = (pointerX-.5) * 7 * activity;
    const swayY = (pointerY-.5) * 5 * activity;
    const travel = Math.max(0,Math.min(1,1-activity));
    const head = .18+.58*(1-Math.pow(1-travel,3));
    const contentBottom = exclusions.reduce((bottom,box) => Math.max(bottom,box.y+box.height),0);
    const flowY = Math.max(height*.72,Math.min(height*.85,contentBottom+30));
    const point = t => {
      const angle = (t-.13)*TAU+Math.sin(value*.28)*.18;
      const x = width*(-.08+1.16*t)+swayX;
      const y = flowY+Math.sin(angle)*height*.08+swayY;
      const dx = width*1.16;
      const dy = Math.cos(angle)*height*.08*TAU;
      const length = Math.hypot(dx,dy);
      return {x,y,tx:dx/length,ty:dy/length,nx:-dy/length,ny:dx/length};
    };
    const spectrum = context.createLinearGradient(0,flowY,width,flowY-height*.1);
    [0,.27,.58,.82,1].forEach((position,index) => {
      spectrum.addColorStop(position,`rgb(${fieldColour(value*.23,index*.72)})`);
    });
    context.fillStyle = spectrum;
    // One connected ribbon carries a concentrated front and a quieter tail.
    // Nested translucent widths give it a diffused edge without a large blur.
    const layers = [[narrow?30:46,.08],[narrow?20:30,.14],[narrow?8:13,.5],[1.8,.9]];
    for (const [thickness,alpha] of layers) {
      context.globalAlpha = alpha;
      context.beginPath();
      for (let side=0;side<2;side++) {
        for (let sample=0;sample<=64;sample++) {
          const t = side ? 1-sample/64 : sample/64;
          const p = point(t);
          const energy = .21+.79*Math.exp(-Math.pow((t-head)/.21,2));
          const edge = Math.pow(Math.max(0,Math.sin(Math.PI*t)),.4);
          const offset = thickness*energy*edge*(side?-1:1);
          const x = p.x+p.nx*offset;
          const y = p.y+p.ny*offset;
          if (!side&&!sample) context.moveTo(x,y); else context.lineTo(x,y);
        }
      }
      context.closePath();
      context.fill();
    }
    // Small separated responses share the ribbon's left-to-right direction.
    // These are accents in the composition, not a second cloud or orbit.
    for (const [start,span,colour] of [[.065,.18,'53,201,228'],[.79,.15,'234,92,131']]) {
      const cue = context.createLinearGradient(width*start,0,width*(start+span),0);
      cue.addColorStop(0,`rgba(${colour},0)`);
      cue.addColorStop(.68,`rgba(${colour},.65)`);
      cue.addColorStop(1,`rgba(${colour},0)`);
      context.strokeStyle = cue;
      context.lineWidth = narrow?2:2.7;
      context.globalAlpha = .5;
      context.beginPath();
      for (let sample=0;sample<=24;sample++) {
        const t = sample/24;
        const x = width*(start+t*span);
        const y = height*(.19+Math.sin(t*Math.PI)*.022)+Math.sin(value*.24)*3;
        if (!sample) context.moveTo(x,y); else context.lineTo(x,y);
      }
      context.stroke();
    }
    const count = narrow ? 132 : particles.length;
    context.lineCap = 'round';
    for (let index=0;index<count;index++) {
      const particle = particles[index];
      const tail = index/(count-1);
      const t = head-Math.pow(tail,.68)*.7+Math.sin(particle.seed)*.006;
      if (t<0||t>1) continue;
      const p = point(t);
      const spread = Math.sin(particle.seed+value*.21)*(2+tail*(narrow?17:25));
      const x = p.x+p.nx*spread;
      const y = p.y+p.ny*spread;
      const stretch = particle.size+(1-tail)*activity*(narrow?3.5:6);
      context.globalAlpha = particle.alpha*Math.pow(1-tail,.48);
      context.strokeStyle = `rgb(${fieldColour(value*.23,t*2.5)})`;
      context.lineWidth = particle.size;
      context.beginPath();
      context.moveTo(x-p.tx*stretch,y-p.ty*stretch);
      context.lineTo(x+p.tx*stretch,y+p.ty*stretch);
      context.stroke();
    }
    // Soft elliptical clearance keeps a completely clear content core and
    // fades the surrounding colour smoothly, without rectangular cutouts.
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'destination-out';
    exclusions.forEach(box => {
      const x = box.x+box.width/2;
      const y = box.y+box.height/2;
      const radiusX = box.width/Math.SQRT2+36;
      const radiusY = box.height/Math.SQRT2+36;
      context.setTransform(scale*radiusX,0,0,scale*radiusY,scale*x,scale*y);
      const mask = context.createRadialGradient(0,0,0,0,0,1);
      mask.addColorStop(0,'rgba(0,0,0,1)');
      mask.addColorStop(.76,'rgba(0,0,0,1)');
      mask.addColorStop(.9,'rgba(0,0,0,.45)');
      mask.addColorStop(1,'rgba(0,0,0,0)');
      context.fillStyle = mask;
      context.fillRect(-1,-1,2,2);
    });
    context.restore();
    canvas.dataset.reviewFrames = String(++paintedFrames);
  }
  function tick(now) {
    frame = 0;
    if (!canDraw()) { stop(); return; }
    if (isReduced()) { stop('static'); paint(0); return; }
    const delta = Number.isFinite(now) ? now-previousFrameAt : 0;
    elapsedMs += Number.isFinite(delta) && delta > 0 ? Math.min(delta,BURST_MS) : CLOCK_FALLBACK_MS;
    if (Number.isFinite(now)) previousFrameAt = now;
    burstFrames++;
    canvas.dataset.reviewBurstFrames = String(burstFrames);
    canvas.dataset.reviewBudget = String(MAX_BURST_FRAMES-burstFrames);
    const finished = elapsedMs >= BURST_MS || burstFrames >= MAX_BURST_FRAMES;
    const progress = finished ? 1 : elapsedMs / BURST_MS;
    const ease = 1-Math.pow(1-progress,3);
    phase = startPhase + ease * 1.7;
    paint(phase,1-progress);
    if (!finished) frame = requestAnimationFrame(tick);
    else canvas.dataset.reviewState = 'idle';
  }
  function wake() {
    if (!canDraw()) { stop(); return; }
    measure();
    if (isReduced()) {
      stop('static');
      paint(0);
      return;
    }
    if (frame) return;
    const now = performance.now();
    previousFrameAt = Number.isFinite(now) ? now : 0;
    elapsedMs = 0;
    burstFrames = 0;
    canvas.dataset.reviewBurstFrames = '0';
    canvas.dataset.reviewBudget = String(MAX_BURST_FRAMES);
    startPhase = phase;
    canvas.dataset.reviewState = 'active';
    frame = requestAnimationFrame(tick);
  }
  function setVisible(visible) {
    const next = Boolean(visible);
    if (requestedVisible === next) return;
    requestedVisible = next;
    if (next) wake(); else stop();
  }
  function onPointer(event) {
    if (!canDraw() || isReduced() || event.pointerType === 'touch') return;
    const bounds = host.getBoundingClientRect();
    pointerX = Math.max(0,Math.min(1,(event.clientX-bounds.left)/Math.max(1,bounds.width)));
    pointerY = Math.max(0,Math.min(1,(event.clientY-bounds.top)/Math.max(1,bounds.height)));
    const now = performance.now();
    if (now-lastPointerStart > BURST_MS) {
      lastPointerStart = now;
      wake();
    }
  }
  function onResize() {
    if (!canDraw()) return;
    measure();
    paint(isReduced() ? 0 : phase);
    if (!frame) canvas.dataset.reviewState = isReduced() ? 'static' : 'idle';
  }
  function onMotionChange() {
    stop();
    if (canDraw()) {
      measure();
      paint(isReduced() ? 0 : phase);
      canvas.dataset.reviewState = isReduced() ? 'static' : 'idle';
    }
  }
  function onDocumentVisibility() {
    if (document.hidden) stop(); else wake();
  }
  const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    intersecting = entries.some(entry => entry.isIntersecting);
    if (intersecting) wake(); else stop();
  }, {threshold:0});
  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
  observer?.observe(host);
  resizeObserver?.observe(host);
  host.addEventListener('pointermove',onPointer,{passive:true});
  host.addEventListener('focusin',wake);
  document.addEventListener('visibilitychange',onDocumentVisibility);
  window.addEventListener('resize',onResize,{passive:true});
  motionQuery.addEventListener?.('change',onMotionChange);

  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    observer?.disconnect();
    resizeObserver?.disconnect();
    host.removeEventListener('pointermove',onPointer);
    host.removeEventListener('focusin',wake);
    document.removeEventListener('visibilitychange',onDocumentVisibility);
    window.removeEventListener('resize',onResize);
    motionQuery.removeEventListener?.('change',onMotionChange);
    context.setTransform(1,0,0,1,0,0);
    context.clearRect(0,0,canvas.width,canvas.height);
  }
  return {setVisible,dispose};
}
