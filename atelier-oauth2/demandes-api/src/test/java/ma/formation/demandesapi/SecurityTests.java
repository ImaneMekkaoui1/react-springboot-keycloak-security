package ma.formation.demandesapi;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void test1_requeteSansTokenRefusee() throws Exception {
        // 1. Une requête sans token vers une ressource protégée est refusée (401)
        mockMvc.perform(get("/api/demandes"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void test2_requetePubliqueAccessibleSansToken() throws Exception {
        // L'API publique est accessible à tous
        mockMvc.perform(get("/api/public"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("API publique accessible"));
    }

    @Test
    void test3_userPeutCreerDemande() throws Exception {
        // Un utilisateur avec ROLE_USER peut créer une demande
        mockMvc.perform(post("/api/demandes")
                .with(jwt().jwt(j -> j.subject("user-alice").claim("preferred_username", "alice"))
                           .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"objet\":\"Demande Test Alice\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.objet").value("Demande Test Alice"))
                .andExpect(jsonPath("$.statut").value("EN_ATTENTE"))
                .andExpect(jsonPath("$.owner").value("user-alice"));
    }

    @Test
    void test4_userNePeutPasAccederAdmin() throws Exception {
        // 3. Un utilisateur USER ne peut pas accéder ni modifier via l'API d'administration (403)
        mockMvc.perform(get("/api/admin/demandes")
                .with(jwt().jwt(j -> j.subject("user-alice"))
                           .authorities(new SimpleGrantedAuthority("ROLE_USER"))))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/admin/demandes/1")
                .with(jwt().jwt(j -> j.subject("user-alice"))
                           .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"statut\":\"VALIDEE\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void test5_adminPeutAccederEtModifierStatut() throws Exception {
        // 4. Un utilisateur ADMIN peut accéder et modifier le statut (200)
        mockMvc.perform(get("/api/admin/demandes")
                .with(jwt().jwt(j -> j.subject("admin-bob"))
                           .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk());
    }

    @Test
    void test6_profilAccessibleAvecToken() throws Exception {
        // 16.2 Endpoint /api/profil retourne sub et username
        mockMvc.perform(get("/api/profil")
                .with(jwt().jwt(j -> j.subject("sub-12345").claim("preferred_username", "alice"))
                           .authorities(new SimpleGrantedAuthority("ROLE_USER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("sub-12345"))
                .andExpect(jsonPath("$.username").value("alice"));
    }
}

