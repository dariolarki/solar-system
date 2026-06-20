/* Entry point — boot the UI chrome and the 3D scene. */
(function () {
  function boot() {
    window.SolarUI.init();
    window.SolarScene.init(
      document.getElementById('mount'),
      document.getElementById('labels'),
      document.getElementById('loading')
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
