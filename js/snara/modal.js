/* ─────────────────────────────────────────────────
   js/snara/modal.js — shared overlay + modal helpers

   FIX 1: closeModal() now accepts an optional id.
   Previously it ignored any id passed to it and
   closed ALL modals — called everywhere as
   closeModal('some-id') but behaved as closeModal().

   FIX 2: window.openModal / window.closeModal exposed
   so inline onclick="closeModal()" strings in HTML
   templates work. They were commented out, causing
   ReferenceError on every modal close button.
─────────────────────────────────────────────────── */

export function openModal(id) {
  document.getElementById('app-overlay')?.removeAttribute('hidden');
  document.getElementById(id)?.removeAttribute('hidden');
  document.body.classList.add('modal-open');
}

// With id   → hides only that modal.
//             Hides overlay too if no other modals remain visible.
// Without id → hides overlay + ALL modals (global dismiss).
export function closeModal(id) {
  if (id) {
    document.getElementById(id)?.setAttribute('hidden', '');

    const anyOpen = document.querySelectorAll(
      '#app-overlay .app-modal:not([hidden])'
    ).length > 0;

    if (!anyOpen) {
      document.getElementById('app-overlay')?.setAttribute('hidden', '');
      document.body.classList.remove('modal-open');
    }
  } else {
    document.getElementById('app-overlay')?.setAttribute('hidden', '');
    document.querySelectorAll('#app-overlay .app-modal').forEach(m =>
      m.setAttribute('hidden', '')
    );
    document.body.classList.remove('modal-open');
  }
}

// Expose globally so inline onclick="closeModal()" and
// onclick="openModal('x')" strings in HTML templates work.
window.openModal  = openModal;
window.closeModal = closeModal;