/* js/modal.js — single overlay, all modals share it */

const overlay = () => document.getElementById('app-overlay');
let _active = null;

export function openModal(id) {
  document.getElementById('app-overlay').removeAttribute('hidden');
  document.getElementById(id)?.removeAttribute('hidden');
  document.body.classList.add('modal-open');
}


export function closeModal() {
  document.getElementById('app-overlay').setAttribute('hidden', '');
  document.querySelectorAll('#app-overlay .app-modal').forEach(m => m.setAttribute('hidden', ''));
  document.body.classList.remove('modal-open');
}

/*
export function closeModal(id) {
  const target = id ?? _active;
  document.getElementById(target)?.setAttribute('hidden', '');
  if (!target || target === _active) {
    overlay().setAttribute('hidden', '');
    document.body.classList.remove('modal-open');
    _active = null;
  }
}


export function closeModal() {
  closeModal(_active);
}

// expose for inline onclick= usage
window.closeModal       = closeModal;
window.closeModal = closeModal;
*/