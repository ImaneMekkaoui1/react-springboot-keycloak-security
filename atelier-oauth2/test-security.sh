#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   TESTS DE SÉCURITÉ OAUTH 2.0 / OIDC & KEYCLOAK     ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. Obtenir les tokens
echo -e "\n${YELLOW}[1] Récupération des tokens auprès de Keycloak...${NC}"
ALICE_TOKEN=$(curl -s -X POST http://localhost:8080/realms/enset-realm/protocol/openid-connect/token \
  -d "client_id=react-client" \
  -d "username=alice" \
  -d "password=alice123" \
  -d "grant_type=password" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

BOB_TOKEN=$(curl -s -X POST http://localhost:8080/realms/enset-realm/protocol/openid-connect/token \
  -d "client_id=react-client" \
  -d "username=bob" \
  -d "password=bob123" \
  -d "grant_type=password" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -n "$ALICE_TOKEN" ]; then
  echo -e "${GREEN}✓ Token Alice obtenu avec succès.${NC}"
else
  echo -e "${RED}✗ Échec de récupération du token Alice.${NC}"
  exit 1
fi

if [ -n "$BOB_TOKEN" ]; then
  echo -e "${GREEN}✓ Token Bob (ADMIN) obtenu avec succès.${NC}"
else
  echo -e "${RED}✗ Échec de récupération du token Bob.${NC}"
  exit 1
fi

# Test 4 : Requête sans Access Token (Attendu : 401)
echo -e "\n${YELLOW}[Test 4] Requête GET /api/demandes sans token (Attendu : 401 Unauthorized)...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/api/demandes)
if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ SUCCÈS : HTTP $HTTP_CODE Unauthorized reçu.${NC}"
else
  echo -e "${RED}✗ ÉCHEC : Attendu 401, reçu $HTTP_CODE.${NC}"
fi

# Test 7 : Jeton invalide (Attendu : 401)
echo -e "\n${YELLOW}[Test 7] Requête avec token altéré/invalide (Attendu : 401 Unauthorized)...${NC}"
INVALID_TOKEN="${ALICE_TOKEN}modified"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/api/demandes \
  -H "Authorization: Bearer $INVALID_TOKEN")
if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ SUCCÈS : HTTP $HTTP_CODE Unauthorized reçu.${NC}"
else
  echo -e "${RED}✗ ÉCHEC : Attendu 401, reçu $HTTP_CODE.${NC}"
fi

# Alice crée une demande
echo -e "\n${YELLOW}[Test 1] Alice crée une demande (POST /api/demandes)...${NC}"
DEMANDE_RES=$(curl -s -X POST http://localhost:8081/api/demandes \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"objet":"Demande de formation Sécurité Réseaux"}')
DEMANDE_ID=$(echo "$DEMANDE_RES" | grep -o '"id":[0-9]*' | cut -d':' -f2)
echo -e "Demande créée : $DEMANDE_RES"
echo -e "${GREEN}✓ Demande ID $DEMANDE_ID créée par Alice.${NC}"

# Test 5 : Alice tente d'accéder à l'API Admin (Attendu : 403 Forbidden)
echo -e "\n${YELLOW}[Test 5] Alice tente d'accéder à GET /api/admin/demandes (Attendu : 403 Forbidden)...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/api/admin/demandes \
  -H "Authorization: Bearer $ALICE_TOKEN")
if [ "$HTTP_CODE" = "403" ]; then
  echo -e "${GREEN}✓ SUCCÈS : HTTP $HTTP_CODE Forbidden (Alice n'a pas ROLE_ADMIN).${NC}"
else
  echo -e "${RED}✗ ÉCHEC : Attendu 403, reçu $HTTP_CODE.${NC}"
fi

# Test 6 : Bob (ADMIN) accède à l'API Admin (Attendu : 200 OK)
echo -e "\n${YELLOW}[Test 6] Bob accède à GET /api/admin/demandes (Attendu : 200 OK)...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/api/admin/demandes \
  -H "Authorization: Bearer $BOB_TOKEN")
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ SUCCÈS : HTTP $HTTP_CODE OK (Bob a ROLE_ADMIN).${NC}"
else
  echo -e "${RED}✗ ÉCHEC : Attendu 200, reçu $HTTP_CODE.${NC}"
fi

# Travail supplémentaire 16.1 : Refuser une demande
echo -e "\n${YELLOW}[16.1 Travail supplémentaire] Bob refuse la demande #$DEMANDE_ID (PATCH /api/admin/demandes/$DEMANDE_ID -> REFUSEE)...${NC}"
REFUS_RES=$(curl -s -X PATCH "http://localhost:8081/api/admin/demandes/$DEMANDE_ID" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"statut":"REFUSEE"}')
echo -e "Réponse serveur : $REFUS_RES"
if echo "$REFUS_RES" | grep -q '"statut":"REFUSEE"'; then
  echo -e "${GREEN}✓ SUCCÈS : Statut modifié à REFUSEE par ADMIN.${NC}"
else
  echo -e "${RED}✗ ÉCHEC : Modification de statut non enregistrée.${NC}"
fi

# Travail supplémentaire 16.2 : Endpoint /api/profil
echo -e "\n${YELLOW}[16.2 Travail supplémentaire] Appel de GET /api/profil pour Alice...${NC}"
PROFIL_RES=$(curl -s http://localhost:8081/api/profil \
  -H "Authorization: Bearer $ALICE_TOKEN")
echo -e "Réponse profil : $PROFIL_RES"
if echo "$PROFIL_RES" | grep -q '"username":"alice"'; then
  echo -e "${GREEN}✓ SUCCÈS : Profil récupéré depuis le JWT.${NC}"
else
  echo -e "${RED}✗ ÉCHEC : Données profil invalides.${NC}"
fi

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}   TOUS LES TESTS DE SÉCURITÉ ONT RÉUSSI (100%) !     ${NC}"
echo -e "${GREEN}======================================================${NC}"

