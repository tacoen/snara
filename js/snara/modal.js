
export function openModal(id) {
  document.getElementById('app-overlay')?.removeAttribute('hidden');
  document.getElementById(id)?.removeAttribute('hidden');
  document.body.classList.add('modal-open');
}

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

window.openModal  = openModal;
window.closeModal = closeModal;

export function _modalHeader(titleHTML, closeId = 'modal-close') {
  return `
    <div class="modal-header">
      <span class="modal-title">${titleHTML}</span>
      <button class="modal-close" id="${closeId}" title="Close"><i data-icon="x"></i></button>
    </div>`;
}

export function _modalFooter(additionalHTML = '') {
  return `
    <div class="modal-footer">
      ${additionalHTML.trim()}
      <button class="cfg-btn mute" id="modal-cancel">Cancel</button>
      <button class="cfg-btn primary" id="modal-save">Save</button>
    </div>`;
}