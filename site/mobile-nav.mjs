const header = document.querySelector('.site-header');
const toggle = header.querySelector('.mobile-nav-toggle');
const nav = header.querySelector('#site-navigation');
const compact = matchMedia('(max-width: 700px)');

function setOpen(open) {
  header.toggleAttribute('data-mobile-menu-open', open);
  toggle.setAttribute('aria-expanded', String(open));
}

toggle.addEventListener('click', event => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  setOpen(open);

  if (open && event.detail === 0) {
    nav.querySelector('a').focus({ preventScroll: true });
  }
});

nav.addEventListener('click', event => {
  if (compact.matches && event.target.closest('a')) {
    setOpen(false);
  }
});

document.addEventListener('pointerdown', event => {
  if (header.hasAttribute('data-mobile-menu-open') && !header.contains(event.target)) {
    setOpen(false);
  }
});

document.addEventListener('focusin', event => {
  if (header.hasAttribute('data-mobile-menu-open') && !header.contains(event.target)) {
    setOpen(false);
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && header.hasAttribute('data-mobile-menu-open')) {
    setOpen(false);
    toggle.focus({ preventScroll: true });
  }
});

compact.addEventListener('change', () => setOpen(false));
toggle.hidden = false;
