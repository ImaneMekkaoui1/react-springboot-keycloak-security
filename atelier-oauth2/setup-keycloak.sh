#!/usr/bin/env bash
set -e

echo "=== Configuration Automatisée de Keycloak (enset-realm) ==="

KEYCLOAK_URL="http://localhost:8080"
ADMIN_USER="admin"
ADMIN_PASS="admin"

echo "1. Connexion kcadm.sh..."
docker exec keycloak-atelier /opt/keycloak/bin/kcadm.sh config credentials \
  --server "$KEYCLOAK_URL" \
  --realm master \
  --user "$ADMIN_USER" \
  --password "$ADMIN_PASS"

echo "2. Création du Realm enset-realm..."
docker exec keycloak-atelier /opt/keycloak/bin/kcadm.sh create realms \
  -s realm=enset-realm \
  -s enabled=true || true

echo "3. Création des rôles Realm (USER, ADMIN)..."
docker exec keycloak-atelier /opt/keycloak/bin/kcadm.sh create roles -r enset-realm -s name=USER || true
docker exec keycloak-atelier /opt/keycloak/bin/kcadm.sh create roles -r enset-realm -s name=ADMIN || true

echo "4. Création du client OpenID Connect react-client..."
docker exec keycloak-atelier /opt/keycloak/bin/kcadm.sh create clients -r enset-realm \
  -s clientId=react-client \
  -s protocol=openid-connect \
  -s publicClient=true \
  -s standardFlowEnabled=true \
  -s implicitFlowEnabled=false \
  -s directAccessGrantsEnabled=true \
  -s rootUrl="http://localhost:5173/" \
  -s baseUrl="http://localhost:5173/" \
  -s 'redirectUris=["http://localhost:5173/*"]' \
  -s 'webOrigins=["http://localhost:5173"]' \
  -s 'attributes={"pkce.code.challenge.method":"S256"}' || true

echo "5. Création de l'utilisateur alice (rôle USER)..."
docker exec keycloak-atelier /opt/keycloak/bin/kcadm.sh create users -r enset-realm \
  -s username=alice -s enabled=true -s firstName=Alice -s lastName=Smith -s email=alice@example.com || true
docker exec keycloak-atelier /opt/keycloak/bin/kcadm.sh set-password -r enset-realm \
  --username alice --new-password alice123
docker exec keycloak-atelier /opt/keycloak/bin/kcadm.sh add-roles -r enset-realm \
  --uusername alice --rolename USER

echo "6. Création de l'utilisateur bob (rôles USER, ADMIN)..."
docker exec keycloak-atelier /opt/keycloak/bin/kcadm.sh create users -r enset-realm \
  -s username=bob -s enabled=true -s firstName=Bob -s lastName=Admin -s email=bob@example.com || true
docker exec keycloak-atelier /opt/keycloak/bin/kcadm.sh set-password -r enset-realm \
  --username bob --new-password bob123
docker exec keycloak-atelier /opt/keycloak/bin/kcadm.sh add-roles -r enset-realm \
  --uusername bob --rolename USER
docker exec keycloak-atelier /opt/keycloak/bin/kcadm.sh add-roles -r enset-realm \
  --uusername bob --rolename ADMIN

echo "=== Configuration Keycloak terminée avec succès ! ==="

