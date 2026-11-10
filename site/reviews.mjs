// Original directed spectrum study. No Google/Gemini SDK, network or tracking.
// The actual Google mark stays in a separate, unchanged image in the HTML.
const COLOURS = ['#4285f4', '#ea4335', '#fbbc05', '#34a853', '#35c9e4', '#8b70ea', '#de70c5'];
const RGB_COLOURS = COLOURS.map(hex => {
  return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
});
const FIELD_COLOURS = [0,4,5,6,1,2,3].map(index => RGB_COLOURS[index]);
const TAU = Math.PI * 2;
const BURST_MS = 1550;
const MAX_BURST_FRAMES = 180;
const CLOCK_FALLBACK_MS = 1000 / 60;
const PARTICLE_COUNT = 120;
const MOBILE_PARTICLES = 76;

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
  const particles = Array.from({length:PARTICLE_COUNT}, (_, index) => ({
    seed:index * 2.399963229728653,
    size:1.2 + ((index * 13) % 15) / 10,
    alpha:.4 + ((index * 7) % 35) / 100
  }));
  canvas.dataset.reviewStyle = 'directed-edge-orbits';

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

    const narrow = width < 600, strength = isReduced() ? .52 : 1;
    const swayX = (pointerX-.5)*7*activity, swayY = (pointerY-.5)*5*activity;
    const orbit = (t, lane=0) => {
      const angle = TAU*(t+value*.075*(lane?-1:1));
      const rx=width*(lane?.55:.51),ry=height*(lane?.35:.45);
      const dx=-rx*Math.sin(angle),dy=ry*Math.cos(angle),length=Math.hypot(dx,dy)||1;
      return {x:width*.5+rx*Math.cos(angle)+swayX,y:height*(lane?.54:.50)+ry*Math.sin(angle)+swayY,tx:dx/length,ty:dy/length};
    };
    // Four authentic Google colours anchor the edges; cyan/violet transitions
    // connect them. The unchanged content mask below clears the entire core.
    const glowRadius=Math.min(width*.43,height*.88);
    for(const [x,y,index]of [[.08,.12,0],[.94,.25,1],[.84,.94,2],[.13,.91,3]]){
      const cx=width*x+swayX,cy=height*y+swayY,colour=RGB_COLOURS[index].join(','),glow=context.createRadialGradient(cx,cy,0,cx,cy,glowRadius);
      glow.addColorStop(0,`rgba(${colour},.36)`);glow.addColorStop(.45,`rgba(${colour},.18)`);glow.addColorStop(1,`rgba(${colour},0)`);
      context.globalAlpha=strength;context.fillStyle=glow;context.fillRect(cx-glowRadius,cy-glowRadius,glowRadius*2,glowRadius*2);
    }
    const spectrum=context.createLinearGradient(0,0,width,height);
    [0,.16,.34,.5,.67,.84,1].forEach((position,index)=>spectrum.addColorStop(position,`rgb(${fieldColour(value*.08,index)})`));
    context.lineCap='round';context.strokeStyle=spectrum;
    for(let lane=0;lane<2;lane++)for(const [thickness,alpha]of [[narrow?20:30,.16],[narrow?7:10,.42],[narrow?1.5:2,.68]]){
      context.lineWidth=thickness;context.globalAlpha=alpha*strength*(lane?.65:1);context.beginPath();
      for(let sample=0;sample<=72;sample++){const p=orbit(sample/72,lane);if(!sample)context.moveTo(p.x,p.y);else context.lineTo(p.x,p.y);}context.stroke();
    }
    const count=narrow?MOBILE_PARTICLES:particles.length;
    canvas.dataset.reviewParticles=String(count);
    for(let index=0;index<count;index++){
      const particle=particles[index],lane=index%2,t=(index/count+Math.sin(particle.seed)*.012+1)%1,p=orbit(t,lane),spread=Math.sin(particle.seed+value*.2)*4,x=p.x-p.ty*spread,y=p.y+p.tx*spread,stretch=particle.size+activity*(narrow?2.5:4);
      context.globalAlpha=particle.alpha*strength;context.strokeStyle=`rgb(${fieldColour(value*.08,t*7)})`;context.lineWidth=particle.size;
      context.beginPath();context.moveTo(x-p.tx*stretch,y-p.ty*stretch);context.lineTo(x+p.tx*stretch,y+p.ty*stretch);context.stroke();
    }
    const orbCount=narrow?4:6;
    canvas.dataset.reviewOrbs=String(orbCount);
    for(let index=0;index<orbCount;index++){
      const p=orbit([.04,.23,.43,.62,.78,.92][index],index%2),radius=(narrow?7:10)+(index*7%10),colour=RGB_COLOURS[index].join(','),halo=context.createRadialGradient(p.x,p.y,0,p.x,p.y,radius*3.2);
      halo.addColorStop(0,`rgba(${colour},.42)`);halo.addColorStop(.4,`rgba(${colour},.2)`);halo.addColorStop(1,`rgba(${colour},0)`);
      context.globalAlpha=strength;context.fillStyle=halo;context.beginPath();context.arc(p.x,p.y,radius*3.2,0,TAU);context.fill();
      const sphere=context.createRadialGradient(p.x-radius*.28,p.y-radius*.3,radius*.04,p.x,p.y,radius);
      sphere.addColorStop(0,'rgba(255,255,255,.98)');sphere.addColorStop(.22,`rgba(${colour},.98)`);sphere.addColorStop(.72,`rgba(${colour},.84)`);sphere.addColorStop(1,`rgba(${colour},0)`);
      context.fillStyle=sphere;context.beginPath();context.arc(p.x,p.y,radius,0,TAU);context.fill();
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
