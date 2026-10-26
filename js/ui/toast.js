// Notificaciones no bloqueantes y diálogos de confirmación accesibles.
// Reemplazan alert()/confirm() para no congelar la app en móvil.

let toastContainer = null;

// Pila de modales abiertos. El botón "atrás" del móvil cierra el modal
// superior antes de cambiar de pestaña.
const modalStack = [];

export function hasOpenModal() {
  return modalStack.length > 0;
}

export function closeTopModal() {
  const top = modalStack[modalStack.length - 1];
  if (!top) return;
  modalStack.pop();
  top.open = false;
  try {
    top.onBack?.();
  } catch (err) {
    console.error('[Modal] Error al cerrar con atrás:', err);
  }
}

// Registra una entrada de historial para que "atrás" cierre el modal.
export function pushModalHistory(onBack) {
  const entry = {
    open: true,
    onBack,
    release({ fromPop = false } = {}) {
      if (!entry.open) return;
      entry.open = false;
      const index = modalStack.indexOf(entry);
      if (index >= 0) modalStack.splice(index, 1);
      // Consume la entrada extra salvo que el navegador ya la haya consumido.
      if (!fromPop && history.state?.kinetixModal) history.back();
    }
  };
  modalStack.push(entry);
  history.pushState({ ...(history.state || {}), kinetixModal: true }, '');
  return entry;
}

function ensureToastContainer() {
  if (toastContainer && document.body.contains(toastContainer)) return toastContainer;
  toastContainer = document.createElement('div');
  toastContainer.id = 'kinetixToasts';
  toastContainer.setAttribute('aria-live', 'polite');
  toastContainer.setAttribute('aria-atomic', 'false');
  toastContainer.className = 'fixed left-0 right-0 z-[80] flex flex-col items-center gap-2 px-4 pointer-events-none';
  toastContainer.style.bottom = 'calc(6rem + env(safe-area-inset-bottom, 0px))';
  document.body.appendChild(toastContainer);
  return toastContainer;
}

const TOAST_STYLES = {
  success: 'bg-emerald-500 text-slate-950 border-emerald-400',
  error: 'bg-rose-500 text-white border-rose-400',
  warning: 'bg-amber-500 text-slate-950 border-amber-400',
  info: 'bg-slate-800 text-slate-100 border-slate-600'
};

export function showToast(message, type = 'info', duration = 3500, action = null) {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.className = [
    'pointer-events-auto w-full max-w-md rounded-xl border px-4 py-3 text-[13px] font-semibold shadow-lg',
    'flex items-start gap-3',
    'break-words [overflow-wrap:anywhere]',
    'opacity-0 translate-y-2 transition-all duration-200',
    TOAST_STYLES[type] || TOAST_STYLES.info
  ].join(' ');

  const text = document.createElement('span');
  text.className = 'min-w-0 flex-1';
  text.textContent = String(message ?? '');
  toast.appendChild(text);

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

  if (action && action.label && typeof action.onClick === 'function') {
    const actionButton = document.createElement('button');
    actionButton.type = 'button';
    actionButton.className = 'shrink-0 min-h-11 px-2 font-bold underline underline-offset-2 hover:opacity-80';
    actionButton.textContent = action.label;
    actionButton.addEventListener('click', (event) => {
      event.stopPropagation();
      clearTimeout(timer);
      try {
        action.onClick();
      } finally {
        remove();
      }
    });
    toast.appendChild(actionButton);
  }

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
        <h2 id="kinetixConfirmTitle" class="text-base font-bold text-[var(--foreground)] break-words"></h2>
        <p class="mt-2 text-[13px] leading-relaxed text-[var(--muted-foreground)] whitespace-pre-line break-words [overflow-wrap:anywhere]"></p>
        <div class="mt-5 flex gap-2">
          <button type="button" data-action="cancel" class="btn-touch flex-1 rounded-xl border border-[var(--border)] px-3 text-[13px] font-semibold text-[var(--foreground)] hover:bg-[var(--accent)]"></button>
          <button type="button" data-action="confirm" class="btn-touch flex-1 rounded-xl px-3 text-[13px] font-bold text-slate-950"></button>
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
    confirmBtn.className = `btn-touch flex-1 rounded-xl px-3 text-[13px] font-bold transition-colors ${
      danger ? 'bg-rose-500 hover:bg-rose-400 text-white' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
    }`;

    let modalHistory = null;
    const close = (result, { fromPop = false } = {}) => {
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      modalHistory?.release({ fromPop });
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
    modalHistory = pushModalHistory(() => close(false, { fromPop: true }));
    confirmBtn.focus();
  });
}

export function showError(error, fallback = 'Ocurrió un error inesperado.') {
  const message = typeof error === 'string' ? error : (error?.message || fallback);
  return showToast(message, 'error', 5000);
}
