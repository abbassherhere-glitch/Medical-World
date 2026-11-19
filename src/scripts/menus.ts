/**
 * Opens and closes folding menus on small screens.
 * A button with `data-menu-toggle` and `aria-controls="some-id"` shows or hides
 * the element with that id. Without JavaScript the menus are simply shown open.
 */
function setOpen(button: HTMLElement, menu: HTMLElement, open: boolean) {
  button.setAttribute('aria-expanded', String(open));
  menu.toggleAttribute('data-open', open);
}

for (const button of document.querySelectorAll<HTMLElement>('[data-menu-toggle]')) {
  const menu = document.getElementById(button.getAttribute('aria-controls') ?? '');
  if (!menu) continue;

  button.addEventListener('click', () => {
    setOpen(button, menu, button.getAttribute('aria-expanded') !== 'true');
  });

  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setOpen(button, menu, false);
      button.focus();
    }
  });
}
