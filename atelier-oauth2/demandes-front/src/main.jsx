import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import keycloak from './keycloak.js';

keycloak.init({
  onLoad: 'login-required',
  pkceMethod: 'S256',
  checkLoginIframe: false
}).then(() => {
  ReactDOM.createRoot(
    document.getElementById('root')
  ).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}).catch((error) => {
  console.error(
    'Erreur de connexion Keycloak',
    error
  );
  document.getElementById('root').innerHTML = `
    <div style="font-family: sans-serif; padding: 40px; text-align: center; max-width: 600px; margin: 100px auto; background: white; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #fee2e2;">
      <h2 style="color: #ef4444; margin-bottom: 12px;">Erreur de connexion Keycloak</h2>
      <p style="color: #64748b; line-height: 1.6;">Impossible de joindre le serveur d'authentification Keycloak sur <strong>http://localhost:8080</strong>.</p>
      <p style="font-size: 13px; color: #94a3b8; margin-top: 16px;">Vérifiez que le conteneur Docker <code>keycloak-atelier</code> est démarré et que le realm <code>enset-realm</code> est bien créé.</p>
      <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Réessayer</button>
    </div>
  `;
});

