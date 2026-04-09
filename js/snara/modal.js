/* ─────────────────────────────────────────────────
   js/snara/modal.js — single overlay, all modals share it

   PITFALL 4 (Performance) — Event Delegation:
     Instead of each class calling addEventListener
     after every _render(), ONE delegated listener on
     #app-overlay handles all [data-action] buttons.

     This means zero rebinding cost on open, and no
     risk of ghost listeners accumulating over time.

   Supported data-action values:
     close         — closeModal()
     switch-tab    — calls window[data-handler](data-tab)
                     e.g. data-handler="settingsInst"

   PITFALL 3 — No Globals:
     openModal / closeModal are named exports only.
     The window bridges at the bottom are intentional
     and minimal — only what inline HTML onclick= needs.
─────────────────────────────────────────────────── */

// ── Single delegated listener — boots once at module load ──
//    Safe: module code runs after the script tag is parsed,
//    and #app-overlay is defined before any modal is opened.

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('app-overlay');
  if (!overlay) return;

  // ── Pitfall 1 (Scope Creep): this handler does TWO things only:
  //    close a modal, or switch a tab. Nothing else.

  overlay.addEventListener('click', e => {

    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const { action, target, tab, handler } = btn.dataset;

    // ── action: close ──────────────────────────────
    if (action === 'close') {
      closeModal();
      return;
    }

    // ── action: switch-tab ─────────────────────────
    //    Requires data-handler="settingsInst" (or any
    //    window-exposed instance) and data-tab="general"
    if (action === 'switch-tab' && handler && tab) {
      const inst = window[handler];
      if (inst && typeof inst._switchTab === 'function') {
        inst._switchTab(tab);
      }
      return;
    }
  });

  // ── Overlay click = close top-most modal ──────────
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });
});

// ── Core functions ─────────────────────────────────

export function openModal(id) {
  const overlay = document.getElementById('app-overlay');
  const modal   = document.getElementById(id);
  if (!overlay || !modal) {
    console.warn(`[Snara] openModal: missing element "${id}" or #app-overlay`);
    return;
  }
  overlay.removeAttribute('hidden');
  modal.removeAttribute('hidden');
  document.body.classList.add('modal-open');
}

export function closeModal() {
  const overlay = document.getElementById('app-overlay');
  if (!overlay) return;
  overlay.setAttribute('hidden', '');
  overlay.querySelectorAll('.app-modal').forEach(m => m.setAttribute('hidden', ''));
  document.body.classList.remove('modal-open');
}

// ── Intentional window bridge ──────────────────────
//    Only needed for inline onclick= in partials HTML.
//    Keep this list as short as possible.
window.openModal  = openModal;
window.closeModal = closeModal;