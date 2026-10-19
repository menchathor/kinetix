// Notificaciones no bloqueantes y diálogos de confirmación accesibles.
// Reemplazan alert()/confirm() para no congelar la app en móvil.

let toastContainer = null;

function ensureToastContainer() {
  if (toastContainer && document.body.contains(toastContainer)) return toastContainer;
  toastContainer = document.createElement('div');
  toastContainer.id = 'kinetixToasts';
  toastContainer.setAttribute('aria-live', 'polite');
  toastContainer.setAttribute('aria-atomic', 'false');
  toastContainer.className = 'fixed left-0 right-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 pointer-events-none';
  document.body.appendChild(toastContainer);
  return toastContainer;
}

const TOAST_STYLES = {
  success: 'bg-emerald-500 text-slate-950 border-emerald-400',
  error: 'bg-rose-500 text-white border-rose-400',
  warning: 'bg-amber-500 text-slate-950 border-amber-400',
  info: 'bg-slate-800 text-slate-100 border-slate-600'
};

export function showToast(message, type = 'info', duration = 3500) {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.className = [
    'pointer-events-auto w-full max-w-md rounded-xl border px-4 py-3 text-xs font-semibold shadow-lg',
    'opacity-0 translate-y-2 transition-all duration-200',
    TOAST_STYLES[type] || TOAST_STYLES.info
  ].join(' ');
  toast.textContent = String(message ?? '');

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-y-2');
  });

  const remove = () => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 220);
  };
  const timer = setTimeout(remove, Math.max(1200, duration));
  toast.addEventListener('click', () => {
    clearTimeout(timer);
    remove();
  });
  return remove;
}

// Diálogo de confirmación con foco atrapado, Escape y soporte de teclado.
export function confirmAction({
  title = '¿Confirmar acción?',
  message = '',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = false
} = {}) {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4';
    overlay.innerHTML = `
      <div role="dialog" aria-modal="true" aria-labelledby="kinetixConfirmTitle" class="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl">
        <h2 id="kinetixConfirmTitle" class="text-sm font-bold text-[var(--foreground)]"></h2>
        <p class="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)] whitespace-pre-line"></p>
        <div class="mt-5 flex gap-2">
          <button type="button" data-action="cancel" class="flex-1 rounded-xl border border-[var(--border)] px-3 py-2.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--accent)]"></button>
          <button type="button" data-action="confirm" class="flex-1 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-950"></button>
        </div>
      </div>
    `;
    const titleEl = overlay.querySelector('#kinetixConfirmTitle');
    const msgEl = overlay.querySelector('p');
    const cancelBtn = overlay.querySelector('[data-action="cancel"]');
    const confirmBtn = overlay.querySelector('[data-action="confirm"]');

    titleEl.textContent = title;
    msgEl.textContent = message;
    cancelBtn.textContent = cancelText;
    confirmBtn.textContent = confirmText;
    confirmBtn.className = `flex-1 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${
      danger ? 'bg-rose-500 hover:bg-rose-400 text-white' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
    }`;

    const close = (result) => {
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
      resolve(result);
    };

    const focusables = () => Array.from(overlay.querySelectorAll('button'));
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    cancelBtn.addEventListener('click', () => close(false));
    confirmBtn.addEventListener('click', () => close(true));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close(false);
    });
    document.addEventListener('keydown', onKeyDown);
    document.body.appendChild(overlay);
    confirmBtn.focus();
  });
}

export function showError(error, fallback = 'Ocurrió un error inesperado.') {
  const message = typeof error === 'string' ? error : (error?.message || fallback);
  return showToast(message, 'error', 5000);
}
