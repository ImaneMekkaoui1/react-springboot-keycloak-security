import keycloak from './keycloak.js';

const API = 'http://localhost:8081';

export async function appelerApi(path, options = {}) {
  // Renouveler le token s'il expire dans moins de 30 secondes
  await keycloak.updateToken(30);

  const response = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${keycloak.token}`,
      ...options.headers
    }
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.message) {
        errorDetail += ` : ${errJson.message}`;
      }
    } catch {
      // Pas de corps JSON d'erreur
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

