/**
 * Sends the "Find schools" picker straight to the chosen state page,
 * for example /dental-hygienist/texas/. Without JavaScript the form is
 * submitted to its normal `action` address instead.
 */
for (const form of document.querySelectorAll<HTMLFormElement>('form[data-state-picker]')) {
  form.addEventListener('submit', (event) => {
    const data = new FormData(form);
    const profession = String(data.get('profession') ?? form.dataset.profession ?? '');
    const state = String(data.get('state') ?? '');
    if (!profession || !state) return;
    event.preventDefault();
    const section = form.dataset.section ? `#${form.dataset.section}` : '';
    window.location.assign(`/${profession}/${state}/${section}`);
  });
}
