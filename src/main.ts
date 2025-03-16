import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

/**
 * Zeigt eine benutzerfreundliche Fehlermeldung an.
 */
function showErrorMessage(title: string, message: string, additionalInfo?: string): void {
  const appRoot = document.querySelector('app-root');
  if (appRoot) {
    appRoot.innerHTML = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; text-align: center;">
        <h1 style="color: #FF7F00;">ZSO Gantrisch - ${title}</h1>
        <div style="padding: 15px; background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 4px; margin: 20px 0; text-align: left;">
          <h3>${title}</h3>
          <p>Error: ${message || 'Unknown error'}</p>
          ${additionalInfo ? `<p>Additional info: ${additionalInfo}</p>` : ''}
        </div>
        <div style="margin-top: 30px;">
          <button onclick="window.location.reload()" 
                  style="padding: 10px 20px; background: #FF7F00; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
            Reload Application
          </button>
          <a href="/assets/angular-debug.html" 
             style="padding: 10px 20px; background: #6c757d; color: white; text-decoration: none; border-radius: 4px;">
            Run Diagnostics
          </a>
        </div>
      </div>
    `;
  }
}

// Globaler Fehler-Listener für unerwartete Fehler
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  showErrorMessage(
    'Initialization Error',
    event.error?.message || event.message || 'Unknown error'
  );
});

// Globaler Listener für unhandled Promise Rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  const message = typeof event.reason === 'object' && event.reason?.message 
    ? event.reason.message 
    : String(event.reason);
  showErrorMessage('Unhandled Promise Rejection', message);
});

console.log('🔄 Application bootstrap starting...');
console.log('💻 Environment:', environment.production ? 'Production' : 'Development');

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    console.log('✅ Application successfully bootstrapped!');
  })
  .catch((err) => {
    console.error('❌ Bootstrap error:', err);
    showErrorMessage(
      'Bootstrap Error',
      err.message || 'Unknown error',
      err.stack ? err.stack.split('\n')[0] : ''
    );
  });
