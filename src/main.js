import './style.css';
import { ANSWERSPACE } from './ANSWERSPACE.js';

// Initialize ANSWERSPACE when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const app = new ANSWERSPACE();

  try {
    await app.init();
    await app.start();
  } catch (error) {
    console.error('Failed to initialize ANSWERSPACE:', error);

    // Show fallback message
    const container = document.getElementById('webgl-container');
    if (container) {
      container.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #6b6b6b;
          font-family: 'IBM Plex Mono', monospace;
          text-align: center;
          padding: 2rem;
        ">
          <p>Unable to initialize experience.<br>Please ensure WebGL is supported.</p>
        </div>
      `;
    }
  }

  // Handle cleanup on page unload
  window.addEventListener('beforeunload', () => {
    app.dispose();
  });
});
