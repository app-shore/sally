let flashInterval: ReturnType<typeof setInterval> | null = null;
let originalTitle = '';

export function flashTabTitle(alertTitle: string) {
  if (flashInterval) return;
  originalTitle = document.title;

  let showAlert = true;
  flashInterval = setInterval(() => {
    document.title = showAlert ? alertTitle : originalTitle;
    showAlert = !showAlert;
  }, 1000);

  const stopFlash = () => {
    if (flashInterval) {
      clearInterval(flashInterval);
      flashInterval = null;
      document.title = originalTitle;
    }
    window.removeEventListener('focus', stopFlash);
  };
  window.addEventListener('focus', stopFlash);
}
