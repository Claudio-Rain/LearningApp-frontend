let toastTimer = null;

// Lightweight transient toast for background notifications (auto-answer result).
export function showToast(message, isError = false) {
  let toast = document.getElementById('learning-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'learning-toast';
    toast.className = 'learning-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.toggle('error', !!isError);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}
