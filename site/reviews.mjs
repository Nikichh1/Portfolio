// Original fine-point light study. No Google/Gemini SDK, network or tracking.
// The actual Google mark stays in a separate, unchanged image in the HTML.
const FIELD_COLOURS = [[242,62,171],[142,71,239],[20,98,255]];
const BURST_MS = 1550;
const MAX_BURST_FRAMES = 180;
const CLOCK_FALLBACK_MS = 1000 / 60;
const POINT_BUDGET = 3200;
const MOBILE_POINTS = 2400;

function fieldColour(horizontal) {
  const position = Math.max(0,Math.min(1,horizontal))*(FIELD_COLOURS.length-1);
  const step = Math.min(FIELD_COLOURS.length-2,Math.floor(position));
  const from = FIELD_COLOURS[step];
  const to = FIELD_COLOURS[step+1];
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
  let capsule = {x:0,y:0,width:1,height:1};
  let pointerX = .5;
  let pointerY = .5;
  let lastPointerStart = -Infinity;
  canvas.dataset.reviewStyle = 'fine-diamond-wave';

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
    const target = host.querySelector?.('.review-presentation');
    const targetBounds = target?.getBoundingClientRect();
    capsule = targetBounds?.width > 0 && targetBounds?.height > 0
      ? {x:targetBounds.left-bounds.left,y:targetBounds.top-bounds.top,width:targetBounds.width,height:targetBounds.height}
      : {x:(width-Math.min(500,Math.max(1,width-72)))/2,y:(height-(width<600?180:210))/2,width:Math.min(500,Math.max(1,width-72)),height:width<600?180:210};
    // This transparent editorial group has no panel or capsule. Protect its
    // logo, heading and separate review link with their individual soft masks.
    exclusions = Array.from(host.querySelectorAll('[data-review-protect],h1,h2,h3,p,a,button,img'))
      // Protect the actual content, not a large anchor wrapping that content.
      .filter(element => !element.matches('a,button') || element.matches('[data-review-protect]') ||
        !element.querySelector('h1,h2,h3,p,img,[data-review-protect]'))
      .map(element => {
        const box=element.getBoundingClientRect();
        // Canonical 564x564 G: alpha>8 bounds [189,187,375,377]. Its large
        // transparent margins are not visible content and need no clearance.
        return element.matches('.review-google-mark')
          ? {left:box.left+box.width*189/564,top:box.top+box.height*187/564,width:box.width*186/564,height:box.height*190/564}
          : box;
      })
      .filter(box => box.width > 0 && box.height > 0)
      .map(box => ({x:box.left-bounds.left-8,y:box.top-bounds.top-8,width:box.width+16,height:box.height+16}));
  }
  function paint(value, activity = 0) {
    context.setTransform(scale,0,0,scale,0,0);
    context.clearRect(0,0,width,height);
    context.save();

    const narrow = width < 600, strength = isReduced() ? .6 : 1;
    const cx=capsule.x+capsule.width/2,cy=capsule.y+capsule.height/2;
    const radius=capsule.height/2,halfWidth=Math.max(0,capsule.width/2-radius);
    const envelopeX=narrow?Math.min(width*.59,capsule.width/2+height*.46):Math.min(width*.49,capsule.width/2+140);
    const envelopeY=narrow?Math.min(height*.49,capsule.height/2+height*.31):Math.min(height*.44,capsule.height/2+118);
    // Only a little light spills from the two group edges. The points carry
    // the colour: no paths, orbit tracks or shaded spheres sit behind them.
    const glowRadius=Math.min(width*.27,height*.30);
    for(const [side,colour]of [[-1,FIELD_COLOURS[0]],[1,FIELD_COLOURS[2]]]){
      const x=cx+side*(capsule.width/2-18),glow=context.createRadialGradient(x,cy,0,x,cy,glowRadius);
      glow.addColorStop(0,`rgba(${colour.join(',')},.27)`);glow.addColorStop(1,`rgba(${colour.join(',')},0)`);
      context.globalAlpha=strength;context.fillStyle=glow;context.fillRect(x-glowRadius,cy-glowRadius,glowRadius*2,glowRadius*2);
    }
    // A regular staggered lattice is deformed by one coherent, shallow wave.
    // The fixed horizontal spectrum never rotates through unrelated colours.
    const budget=narrow?MOBILE_POINTS:POINT_BUDGET,spacing=narrow?8:11;
    // On wide screens rasterize the envelope itself, not unused host margins.
    // This keeps its fine matrix dense without increasing the point budget.
    const left=narrow?0:Math.max(0,cx-envelopeX),top=narrow?0:Math.max(0,cy-envelopeY);
    const fieldWidth=narrow?width:Math.min(width,cx+envelopeX)-left,fieldHeight=narrow?height:Math.min(height,cy+envelopeY)-top;
    let columns=Math.ceil(fieldWidth/spacing)+1,rows=Math.ceil(fieldHeight/spacing)+1;
    if(columns*rows>budget){const shrink=Math.sqrt(budget/(columns*rows));columns=Math.max(2,Math.floor(columns*shrink));rows=Math.max(2,Math.floor(rows*shrink));}
    const stepX=fieldWidth/(columns-1),stepY=fieldHeight/(rows-1),diagonal=scale/Math.SQRT2;
    const sway=(pointerX-.5)*activity*.12+(pointerY-.5)*activity*.08;
    context.setTransform(diagonal,diagonal,-diagonal,diagonal,0,0);
    let pointCount=0;
    for(let column=0;column<columns;column++){
      context.fillStyle=`rgb(${fieldColour(column/(columns-1))})`;
      for(let row=0;row<rows;row++){
        const baseX=left+column*stepX+(row%2)*stepX*.5,baseY=top+row*stepY;
        const x=baseX+Math.sin(baseY/height*5+value*.3)*stepX*.18;
        const y=baseY+Math.sin(baseX/width*5.4+value*.45+sway)*height*.017;
        const outer=1-((x-cx)/envelopeX)**2-((y-cy)/envelopeY)**2;
        if(outer<=0)continue;
        const qx=Math.abs(x-cx)-halfWidth,qy=Math.abs(y-cy);
        const clearance=Math.hypot(Math.max(qx,0),qy)-radius;
        // Distance shapes a broad lighting band only: an invisible capsule
        // must not cut the matrix around the transparent editorial content.
        const edge=Math.exp(-((clearance/(height*.22))**2));
        const light=.84+.16*Math.sin(baseX/width*4.2-baseY/height*2.4-value*.9);
        const alpha=strength*Math.pow(outer,narrow?.35:.30)*(.25+.75*edge)*light;
        const size=narrow?.78+1.16*edge:1+1.9*edge,u=(x+y)/Math.SQRT2,v=(y-x)/Math.SQRT2;
        context.globalAlpha=alpha;context.fillRect(u-size/2,v-size/2,size,size);pointCount++;
      }
    }
    canvas.dataset.reviewPoints=String(pointCount);
    canvas.dataset.reviewGridPoints=String(columns*rows);
    canvas.dataset.reviewPointBudget=String(budget);
    canvas.dataset.reviewPointSpacing=Math.max(stepX,stepY).toFixed(2);
    // Soft elliptical clearance keeps a completely clear content core and
    // fades the surrounding colour smoothly, without rectangular cutouts.
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'destination-out';
    exclusions.forEach(box => {
      const x = box.x+box.width/2;
      const y = box.y+box.height/2;
      const radiusX = box.width/Math.SQRT2+16;
      const radiusY = box.height/Math.SQRT2+16;
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
