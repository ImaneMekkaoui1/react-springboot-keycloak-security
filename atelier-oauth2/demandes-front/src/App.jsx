import { useEffect, useState, useMemo } from 'react';
import keycloak from './keycloak.js';
import { appelerApi } from './api.js';
import './App.css';

export default function App() {
  const [objet, setObjet] = useState('');
  const [mesDemandes, setMesDemandes] = useState([]);
  const [toutes, setToutes] = useState([]);
  const [message, setMessage] = useState({ text: '', type: 'info' });
  const [loading, setLoading] = useState(false);
  const [profilBackend, setProfilBackend] = useState(null);
  const [showTokenDetails, setShowTokenDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('mes-demandes'); // 'mes-demandes' | 'admin' | 'profil' | 'jwt'
  const [filterStatut, setFilterStatut] = useState('ALL');

  // Extraction des rôles et informations depuis Keycloak
  const roles = keycloak.tokenParsed?.realm_access?.roles || [];
  const isAdmin = roles.includes('ADMIN');
  const isUser = roles.includes('USER');
  const username = keycloak.tokenParsed?.preferred_username || 'Utilisateur';
  const fullName = keycloak.tokenParsed?.name || username;
  const email = keycloak.tokenParsed?.email || 'Non renseigné';
  const userId = keycloak.tokenParsed?.sub || '';

  // Chargement des données
  async function charger() {
    setLoading(true);
    try {
      const dataMesDemandes = await appelerApi('/api/demandes');
      setMesDemandes(dataMesDemandes);

      if (isAdmin) {
        const dataToutes = await appelerApi('/api/admin/demandes');
        setToutes(dataToutes);
      }

      // Appel de l'endpoint supplémentaire /api/profil (Travail supplémentaire 16.2)
      try {
        const profil = await appelerApi('/api/profil');
        setProfilBackend(profil);
      } catch (err) {
        console.warn('Impossible de charger le profil backend', err);
      }
    } catch (e) {
      afficherNotification('Erreur de chargement : ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function afficherNotification(texte, type = 'info') {
    setMessage({ text: texte, type });
    setTimeout(() => {
      setMessage((prev) => (prev.text === texte ? { text: '', type: 'info' } : prev));
    }, 4500);
  }

  useEffect(() => {
    charger();
  }, []);

  // Création d'une demande (Section 12)
  async function creer(e) {
    e.preventDefault();
    if (!objet.trim()) return;

    try {
      await appelerApi('/api/demandes', {
        method: 'POST',
        body: JSON.stringify({
          objet: objet.trim()
        })
      });
      setObjet('');
      afficherNotification('Demande créée avec succès !', 'success');
      await charger();
    } catch (e) {
      afficherNotification('Erreur lors de la création : ' + e.message, 'error');
    }
  }

  // Validation d'une demande par l'admin (Section 12)
  async function valider(id) {
    try {
      await appelerApi(`/api/admin/demandes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          statut: 'VALIDEE'
        })
      });
      afficherNotification(`Demande #${id} validée.`, 'success');
      await charger();
    } catch (e) {
      afficherNotification('Erreur : ' + e.message, 'error');
    }
  }

  // Travail supplémentaire 16.1 : Refuser une demande
  async function refuser(id) {
    try {
      await appelerApi(`/api/admin/demandes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          statut: 'REFUSEE'
        })
      });
      afficherNotification(`Demande #${id} refusée.`, 'warning');
      await charger();
    } catch (e) {
      afficherNotification('Erreur : ' + e.message, 'error');
    }
  }

  // Calcul des statistiques
  const stats = useMemo(() => {
    const dataSource = isAdmin && activeTab === 'admin' ? toutes : mesDemandes;
    return {
      total: dataSource.length,
      enAttente: dataSource.filter((d) => d.statut === 'EN_ATTENTE').length,
      validee: dataSource.filter((d) => d.statut === 'VALIDEE').length,
      refusee: dataSource.filter((d) => d.statut === 'REFUSEE').length
    };
  }, [mesDemandes, toutes, isAdmin, activeTab]);

  // Filtrage des demandes selon le statut sélectionné
  const demandesAffichees = useMemo(() => {
    const list = activeTab === 'admin' && isAdmin ? toutes : mesDemandes;
    if (filterStatut === 'ALL') return list;
    return list.filter((d) => d.statut === filterStatut);
  }, [mesDemandes, toutes, activeTab, isAdmin, filterStatut]);

  // Helper pour formater la date d'expiration du token
  const tokenExpiresAt = keycloak.tokenParsed?.exp
    ? new Date(keycloak.tokenParsed.exp * 1000).toLocaleTimeString()
    : 'N/A';

  return (
    <div className="app-container">
      {/* Top Notification Toast */}
      {message.text && (
        <div className={`notification-toast ${message.type}`}>
          <div className="toast-icon">
            {message.type === 'success' && '✓'}
            {message.type === 'error' && '✕'}
            {message.type === 'warning' && '⚠'}
            {message.type === 'info' && 'ℹ'}
          </div>
          <span className="toast-text">{message.text}</span>
          <button
            className="toast-close"
            onClick={() => setMessage({ text: '', type: 'info' })}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Header / Navigation */}
      <header className="main-header">
        <div className="brand-section">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="brand-title">Gestion des Demandes</h1>
            <p className="brand-subtitle">
              Sécurisé OAuth 2.0 & OpenID Connect — Keycloak + Spring Boot
            </p>
          </div>
        </div>

        {/* User Card */}
        <div className="user-profile-header">
          <div className="user-avatar">{username.charAt(0).toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name-line">
              <span className="user-name">{fullName}</span>
              <span className="user-login">(@{username})</span>
            </div>
            <div className="user-badges">
              {isAdmin && <span className="badge badge-admin">🛡️ ADMIN</span>}
              {isUser && <span className="badge badge-user">👤 USER</span>}
              <span className="badge badge-session">Exp: {tokenExpiresAt}</span>
            </div>
          </div>
          <button
            className="btn-logout"
            title="Se déconnecter de Keycloak"
            onClick={() =>
              keycloak.logout({
                redirectUri: 'http://localhost:5173/'
              })
            }
          >
            <svg
              className="btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Déconnexion</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'mes-demandes' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('mes-demandes');
            setFilterStatut('ALL');
          }}
        >
          📋 Mes Demandes ({mesDemandes.length})
        </button>

        {isAdmin && (
          <button
            className={`tab-btn tab-admin ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('admin');
              setFilterStatut('ALL');
            }}
          >
            ⚡ Administration : Toutes les Demandes ({toutes.length})
          </button>
        )}

        <button
          className={`tab-btn ${activeTab === 'profil' ? 'active' : ''}`}
          onClick={() => setActiveTab('profil')}
        >
          👤 Mon Profil & Droits
        </button>

        <button
          className={`tab-btn ${activeTab === 'jwt' ? 'active' : ''}`}
          onClick={() => setActiveTab('jwt')}
        >
          🔍 Inspecteur JWT (Section 15)
        </button>

        <button
          className="tab-btn refresh-btn"
          onClick={charger}
          disabled={loading}
          title="Rafraîchir les données"
        >
          {loading ? '⏳ Chargement...' : '🔄 Actualiser'}
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        {/* TAB 1: Mes Demandes (or Tab 2: Admin) */}
        {(activeTab === 'mes-demandes' || activeTab === 'admin') && (
          <>
            {/* KPI Stats Cards */}
            <div className="stats-grid">
              <div
                className={`stat-card ${filterStatut === 'ALL' ? 'selected' : ''}`}
                onClick={() => setFilterStatut('ALL')}
              >
                <div className="stat-label">Total</div>
                <div className="stat-value">{stats.total}</div>
                <div className="stat-sub">Toutes demandes</div>
              </div>
              <div
                className={`stat-card warning ${filterStatut === 'EN_ATTENTE' ? 'selected' : ''}`}
                onClick={() => setFilterStatut('EN_ATTENTE')}
              >
                <div className="stat-label">En attente</div>
                <div className="stat-value text-amber">{stats.enAttente}</div>
                <div className="stat-sub">À traiter</div>
              </div>
              <div
                className={`stat-card success ${filterStatut === 'VALIDEE' ? 'selected' : ''}`}
                onClick={() => setFilterStatut('VALIDEE')}
              >
                <div className="stat-label">Validées</div>
                <div className="stat-value text-emerald">{stats.validee}</div>
                <div className="stat-sub">Approuvées</div>
              </div>
              <div
                className={`stat-card danger ${filterStatut === 'REFUSEE' ? 'selected' : ''}`}
                onClick={() => setFilterStatut('REFUSEE')}
              >
                <div className="stat-label">Refusées</div>
                <div className="stat-value text-rose">{stats.refusee}</div>
                <div className="stat-sub">Rejetées (16.1)</div>
              </div>
            </div>

            {/* Formulaire de création de demande (Section 12) */}
            <section className="card form-card">
              <div className="card-header">
                <div className="card-title-group">
                  <span className="card-icon">➕</span>
                  <h2 className="card-title">Créer une nouvelle demande</h2>
                </div>
                <span className="card-badge">OpenID Connect Authenticated</span>
              </div>
              <form onSubmit={creer} className="create-form">
                <div className="input-group">
                  <input
                    type="text"
                    className="styled-input"
                    value={objet}
                    onChange={(e) => setObjet(e.target.value)}
                    placeholder="Ex: Demande de matériel informatique, congé, accès VPN..."
                    required
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!objet.trim() || loading}
                  >
                    <span>Envoyer la demande</span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="btn-icon"
                    >
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
                <p className="input-helper">
                  Le propriétaire de la demande sera automatiquement extrait du claim JWT{' '}
                  <code>sub</code> côté Spring Boot.
                </p>
              </form>
            </section>

            {/* Liste des demandes */}
            <section className="card list-card">
              <div className="card-header">
                <div className="card-title-group">
                  <span className="card-icon">
                    {activeTab === 'admin' ? '🛡️' : '📋'}
                  </span>
                  <div>
                    <h2 className="card-title">
                      {activeTab === 'admin'
                        ? 'Administration : Toutes les demandes du système'
                        : 'Mes demandes personnelles'}
                    </h2>
                    <p className="card-desc">
                      {activeTab === 'admin'
                        ? 'En tant qu’administrateur (ROLE_ADMIN), vous pouvez valider ou refuser n’importe quelle demande.'
                        : 'Filtrées automatiquement par Spring Boot selon votre identifiant sub.'}
                    </p>
                  </div>
                </div>

                {filterStatut !== 'ALL' && (
                  <button
                    className="btn-reset-filter"
                    onClick={() => setFilterStatut('ALL')}
                  >
                    ✕ Effacer le filtre ({filterStatut})
                  </button>
                )}
              </div>

              {demandesAffichees.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <h3>Aucune demande trouvée</h3>
                  <p>
                    {filterStatut !== 'ALL'
                      ? `Aucune demande n'a le statut "${filterStatut}".`
                      : 'Utilisez le formulaire ci-dessus pour soumettre une première demande.'}
                  </p>
                </div>
              ) : (
                <ul className="demandes-list">
                  {demandesAffichees.map((d) => (
                    <li key={d.id} className={`demande-item statut-${d.statut.toLowerCase()}`}>
                      <div className="demande-main">
                        <div className="demande-id-tag">#{d.id}</div>
                        <div className="demande-details">
                          <h3 className="demande-objet">{d.objet}</h3>
                          <div className="demande-meta">
                            <span className="meta-owner">
                              Propriétaire (sub) : <code>{d.owner}</code>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="demande-actions-zone">
                        {/* Status Badge */}
                        <span className={`status-pill pill-${d.statut.toLowerCase()}`}>
                          {d.statut === 'EN_ATTENTE' && '⏳ En attente'}
                          {d.statut === 'VALIDEE' && '✓ Validée'}
                          {d.statut === 'REFUSEE' && '✕ Refusée'}
                        </span>

                        {/* Actions Administrateur (Section 12 + 16.1 Travail Supplémentaire) */}
                        {isAdmin && (
                          <div className="admin-actions-group">
                            {d.statut !== 'VALIDEE' && (
                              <button
                                className="btn btn-sm btn-valider"
                                onClick={() => valider(d.id)}
                                title="Valider cette demande"
                              >
                                ✓ Valider
                              </button>
                            )}

                            {/* Section 16.1 : Refuser une demande */}
                            {d.statut !== 'REFUSEE' && (
                              <button
                                className="btn btn-sm btn-refuser"
                                onClick={() => refuser(d.id)}
                                title="Refuser cette demande (16.1 Travail supplémentaire)"
                              >
                                ✕ Refuser
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {/* TAB 3: Profil utilisateur & Droits (Section 16.2 Travail supplémentaire) */}
        {activeTab === 'profil' && (
          <section className="card profile-card">
            <div className="card-header">
              <div className="card-title-group">
                <span className="card-icon">👤</span>
                <div>
                  <h2 className="card-title">Profil Utilisateur & Autorisations</h2>
                  <p className="card-desc">
                    Vérification des informations d'identité et appel de l'API /api/profil
                    (Section 16.2).
                  </p>
                </div>
              </div>
            </div>

            <div className="profile-grid">
              <div className="profile-box">
                <h3 className="box-title">Identité OpenID Connect (ID/Access Token)</h3>
                <table className="info-table">
                  <tbody>
                    <tr>
                      <td>Nom d'utilisateur</td>
                      <td>
                        <strong>{username}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td>Nom complet</td>
                      <td>{fullName}</td>
                    </tr>
                    <tr>
                      <td>Email</td>
                      <td>{email}</td>
                    </tr>
                    <tr>
                      <td>Identifiant unique (sub)</td>
                      <td>
                        <code className="code-id">{userId}</code>
                      </td>
                    </tr>
                    <tr>
                      <td>Émetteur (iss)</td>
                      <td>
                        <code>{keycloak.tokenParsed?.iss}</code>
                      </td>
                    </tr>
                    <tr>
                      <td>Audience (aud)</td>
                      <td>{JSON.stringify(keycloak.tokenParsed?.aud)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="profile-box">
                <h3 className="box-title">Rôles Keycloak & Spring Security</h3>
                <div className="roles-list-display">
                  <p className="roles-desc">
                    Ces rôles sont envoyés dans le claim <code>realm_access.roles</code> et
                    convertis par <code>JwtAuthenticationConverter</code> en autorités Spring :
                  </p>
                  <div className="role-tags">
                    {roles.map((r) => (
                      <span
                        key={r}
                        className={`role-tag ${
                          r === 'ADMIN'
                            ? 'role-admin'
                            : r === 'USER'
                            ? 'role-user'
                            : 'role-system'
                        }`}
                      >
                        {r === 'ADMIN' && '🛡️ '}
                        {r === 'USER' && '👤 '}
                        ROLE_{r}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="backend-profil-section">
                  <h4 className="subbox-title">
                    Réponse de Spring Boot (<code>GET /api/profil</code>) :
                  </h4>
                  {profilBackend ? (
                    <div className="profil-backend-response">
                      <pre>{JSON.stringify(profilBackend, null, 2)}</pre>
                      <span className="verified-badge">✓ Validé par Spring Security</span>
                    </div>
                  ) : (
                    <p className="text-muted">Chargement de la réponse backend...</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: Inspecteur JWT (Section 15 : Analyse du contenu d'un JWT) */}
        {activeTab === 'jwt' && (
          <section className="card jwt-card">
            <div className="card-header">
              <div className="card-title-group">
                <span className="card-icon">🔍</span>
                <div>
                  <h2 className="card-title">Analyse du Contenu du JWT (Section 15)</h2>
                  <p className="card-desc">
                    Inspection détaillée des claims décodés transmis dans l'en-tête{' '}
                    <code>Authorization: Bearer &lt;token&gt;</code>.
                  </p>
                </div>
              </div>
              <button
                className="btn btn-outline"
                onClick={() => {
                  navigator.clipboard.writeText(keycloak.token || '');
                  afficherNotification('Token copié dans le presse-papier !', 'info');
                }}
              >
                📋 Copier l'Access Token brut
              </button>
            </div>

            <div className="jwt-analysis-grid">
              <div className="jwt-claims-card">
                <h3>Claims Standards & Rôles</h3>
                <div className="claims-list">
                  <div className="claim-row">
                    <span className="claim-name">sub</span>
                    <span className="claim-desc">Identifiant unique du sujet</span>
                    <code className="claim-val">{keycloak.tokenParsed?.sub}</code>
                  </div>
                  <div className="claim-row">
                    <span className="claim-name">iss</span>
                    <span className="claim-desc">Émetteur du jeton (Issuer)</span>
                    <code className="claim-val">{keycloak.tokenParsed?.iss}</code>
                  </div>
                  <div className="claim-row">
                    <span className="claim-name">preferred_username</span>
                    <span className="claim-desc">Nom d'utilisateur de connexion</span>
                    <code className="claim-val">{keycloak.tokenParsed?.preferred_username}</code>
                  </div>
                  <div className="claim-row">
                    <span className="claim-name">realm_access.roles</span>
                    <span className="claim-desc">Rôles de sécurité du Realm</span>
                    <code className="claim-val">
                      {JSON.stringify(keycloak.tokenParsed?.realm_access?.roles)}
                    </code>
                  </div>
                  <div className="claim-row">
                    <span className="claim-name">scope</span>
                    <span className="claim-desc">Scopes OAuth 2.0 accordés</span>
                    <code className="claim-val">{keycloak.tokenParsed?.scope}</code>
                  </div>
                  <div className="claim-row">
                    <span className="claim-name">exp</span>
                    <span className="claim-desc">Expiration temporelle</span>
                    <code className="claim-val">
                      {keycloak.tokenParsed?.exp} ({tokenExpiresAt})
                    </code>
                  </div>
                  <div className="claim-row">
                    <span className="claim-name">iat</span>
                    <span className="claim-desc">Date d'émission (Issued At)</span>
                    <code className="claim-val">
                      {keycloak.tokenParsed?.iat} (
                      {new Date(keycloak.tokenParsed?.iat * 1000).toLocaleTimeString()})
                    </code>
                  </div>
                </div>
              </div>

              <div className="jwt-json-viewer">
                <div className="viewer-header">
                  <span>Payload JSON complet</span>
                  <button
                    className="btn-toggle-json"
                    onClick={() => setShowTokenDetails(!showTokenDetails)}
                  >
                    {showTokenDetails ? 'Réduire' : 'Déplier tout'}
                  </button>
                </div>
                <pre className="jwt-pre">
                  {JSON.stringify(
                    showTokenDetails
                      ? keycloak.tokenParsed
                      : {
                          sub: keycloak.tokenParsed?.sub,
                          iss: keycloak.tokenParsed?.iss,
                          preferred_username: keycloak.tokenParsed?.preferred_username,
                          realm_access: keycloak.tokenParsed?.realm_access,
                          scope: keycloak.tokenParsed?.scope,
                          exp: keycloak.tokenParsed?.exp
                        },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="main-footer">
        <p>
          Atelier Pratique : OAuth 2.0 / OpenID Connect • Module : Sécurité des Systèmes
          Distribués • ENSET
        </p>
      </footer>
    </div>
  );
}

