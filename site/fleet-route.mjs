const gallery = document.querySelector('#fleet');
const route = gallery.querySelector('.fleet-route');
const routePath = route.querySelector('#fleet-route-path');
const streets = route.querySelector('.fleet-route__streets');
const startPin = route.querySelector('.fleet-route__origin');
const endPin = route.querySelector('.fleet-route__destination');
const fair = gallery.querySelector('.fair-photo');
const fairImage = fair.querySelector('img');
const editorial = gallery.querySelector('.fleet-editorial');
const nightImage = gallery.querySelector('.hospital-photo img');
const story = document.querySelector('.product-story');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const forceReduced = new URLSearchParams(location.search).get('motion') === 'reduce';
const reduced = () => motion.matches || forceReduced;
const mobileLayout = matchMedia('(max-width: 700px)');

let bounds;
let visible = !('IntersectionObserver' in window);
let frame = 0;
let previous = -1;

function paint() {
  frame = 0;
  if (!bounds) return;
  const progress = reduced() ? 1 : Math.min(1, Math.max(0, (scrollY - bounds.start) / bounds.length));
  const step = Math.round(progress * 500) / 500;
  if (step === previous) return;
  previous = step;
  route.style.setProperty('--route-progress', step);
}

function measure() {
  const section = gallery.getBoundingClientRect();
  const photo = fairImage.getBoundingClientRect();
  const slot = fair.getBoundingClientRect();
  const upper = editorial.getBoundingClientRect();
  const night = nightImage.getBoundingClientRect();
  const mobile = mobileLayout.matches;

  const startX = Math.round(mobile ? photo.right - 31 : photo.left - (photo.left - slot.left) * .47);
  const endX = Math.round((upper.left + night.left) / 2);
  const startY = Math.round(mobile ? photo.bottom + 18 : photo.top + 25);
  const elbowY = Math.round((upper.bottom + night.top) / 2);
  const endY = Math.round(night.top + Math.min(night.height * .62, 315));
  const radius = mobile ? 14 : 24;

  // Keep the drawing surface confined to the gap between the photographs.
  const left = endX - 16;
  const top = startY - 16;
  const width = startX - left + 23;
  const height = endY - top + 17;
  route.style.left = (left - section.left) + 'px';
  route.style.top = (top - section.top) + 'px';
  route.style.width = width + 'px';
  route.style.height = height + 'px';
  route.setAttribute('viewBox', '0 0 ' + width + ' ' + height);

  const sx = startX - left;
  const ex = endX - left;
  const sy = startY - top;
  const ey = endY - top;
  const elbow = elbowY - top;
  routePath.setAttribute('d', [
    'M', sx, sy,
    'V', elbow - radius, 'Q', sx, elbow, sx - radius, elbow,
    'H', ex + radius, 'Q', ex, elbow, ex, elbow + radius,
    'V', ey,
  ].join(' '));

  // Short side streets carry the map styling into the open margins.
  const junction = Math.round(ex + (sx - ex) * .62);
  const block = Math.round((ex + sx) / 2);
  const cross = Math.round((elbow + ey) / 2);
  streets.setAttribute('d', [
    'M', junction, elbow - 12, 'V', elbow + 13,
    'M', block, elbow - 12, 'V', elbow + 13,
    'M', ex - 9, cross, 'H', ex + 10,
  ].join(' '));
  startPin.setAttribute('transform', 'translate(' + sx + ' ' + sy + ')');
  endPin.setAttribute('transform', 'translate(' + ex + ' ' + ey + ')');

  const viewport = innerHeight;
  const start = scrollY + startY - viewport * .82;
  const end = scrollY + endY - viewport * .67;
  bounds = {start, length: Math.max(1, end - start)};
  route.removeAttribute('hidden');
  paint();
}

function onScroll() {
  if (visible && !frame && !reduced()) frame = requestAnimationFrame(paint);
}

const intersection = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  if (visible) measure();
}) : null;
intersection?.observe(route);

const layout = 'ResizeObserver' in window ? new ResizeObserver(measure) : null;
for (const element of [gallery, story, document.querySelector('#app-install'), editorial, fairImage, nightImage]) layout?.observe(element);
addEventListener('resize', measure, {passive: true});
addEventListener('scroll', onScroll, {passive: true});
addEventListener('pageshow', measure);
motion.addEventListener('change', paint);
measure();
