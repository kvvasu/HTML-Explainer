// The "Was this helpful?" row at the end of a page (src/render.js writes the markup). A vote is a toggle: clicking a button
// presses it and takes the other one back, and clicking the pressed one again clears the vote. The answer stays in the page —
// it has no server to send to and no storage to write, which is why the row is a local state, not a report.
// The labels come from the markup (the page language), and the state from aria-pressed, which the styles read too.
(() => {
  const box = document.querySelector('[data-am="feedback"]');
  if (!box) return;
  const buttons = [...box.querySelectorAll('button[data-vote]')];
  const status = box.querySelector('.am-feedback-status');
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const pressed = button.getAttribute('aria-pressed') !== 'true';
      for (const other of buttons) other.setAttribute('aria-pressed', String(pressed && other === button));
      if (status) status.textContent = pressed ? box.dataset.thanks : '';
    });
  }
})();
