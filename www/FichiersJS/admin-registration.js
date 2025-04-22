/**
 * SYSTÈME DE GESTION DES INSCRIPTIONS - ESTRAPPES
 * ==============================================
 * Ce script gère le tableau de bord d'administration pour la gestion des inscriptions.
 * Il permet de visualiser, filtrer, accepter ou refuser des inscriptions.
 */

// ========================================================================================
// SECTION 1: AUTHENTIFICATION ET SÉCURITÉ
// ========================================================================================

/**
 * Vérifie si l'utilisateur est connecté avec un token administrateur valide
 * @returns {boolean} Vrai si l'utilisateur est authentifié comme admin, sinon faux
 */
function checkAdminToken() {
  const adminToken = localStorage.getItem("adminToken");

  if (!adminToken) {
    alert("Vous devez être connecté en tant qu'administrateur pour accéder à cette page.");
    window.location.href = "Admin.html";
    return false;
  }

  try {
    const decodedToken = jwt_decode(adminToken);
    const role = decodedToken.role;

    if (role !== "admin" && role !== "superadmin") {
      alert("Accès refusé : rôle insuffisant.");
      window.location.href = "Admin.html";
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erreur lors du décodage du token :", error);
    alert("Token invalide ou expiré.");
    window.location.href = "Admin.html";
    return false;
  }
}

/**
 * Déconnecte l'utilisateur en supprimant son token et le redirige vers la page de connexion
 */
function logout() {
  localStorage.removeItem("adminToken");
  window.location.href = "Admin.html";
}

// ========================================================================================
// SECTION 2: INITIALISATION ET CHARGEMENT DE LA PAGE
// ========================================================================================

/**
 * Point d'entrée principal - Initialise la page après chargement du DOM
 */
document.addEventListener("DOMContentLoaded", initializePage);

/**
 * Initialise la page du tableau de bord si l'utilisateur est authentifié
 */
function initializePage() {
  if (checkAdminToken()) {
    document.querySelector(".container").style.display = "block";

    // Gestion du bouton de déconnexion
    document.getElementById("logoutBtn").addEventListener("click", logout);

    // Gestion des accès aux liens selon le rôle de l'utilisateur
    configureAccessControl();

    // Configuration des événements et chargement des données
    setupEventListeners();
    loadRegistrations();
  }
}

/**
 * Configure les restrictions d'accès aux fonctionnalités selon le rôle de l'utilisateur
 */
function configureAccessControl() {
  const token = localStorage.getItem("adminToken");
  const decoded = jwt_decode(token);
  const role = decoded.role;

  document.querySelectorAll(".restricted-link").forEach((link) => {
    const allowedRoles = link.getAttribute("data-roles");
    if (!allowedRoles) return;

    const allowedList = allowedRoles.split(",").map((r) => r.trim());
    if (!allowedList.includes(role)) {
      link.classList.add("disabled-link");
      link.addEventListener("click", function (e) {
        e.preventDefault();
        alert("Accès réservé aux rôles : " + allowedList.join(", "));
      });
    }
  });
}

// ========================================================================================
// SECTION 3: GESTION DES INSCRIPTIONS
// ========================================================================================

/**
 * Charge les inscriptions depuis l'API avec filtres optionnels
 */
async function loadRegistrations() {
  const statusFilter = document.getElementById("statusFilter").value;
  const typeFilter = document.getElementById("typeFilter").value;

  try {
    let url = "https://backendestrappes.fr/registration?";
    const params = [];

    if (statusFilter) params.push(`status=${statusFilter}`);
    if (typeFilter) params.push(`typeInscription=${typeFilter}`);

    if (params.length > 0) {
      url += params.join("&");
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });

    if (!response.ok)
      throw new Error("Erreur lors du chargement des inscriptions");

    const registrations = await response.json();
    displayRegistrations(registrations);
  } catch (error) {
    console.error("Erreur:", error);
    alert("Erreur lors du chargement des inscriptions");
  }
}

/**
 * Affiche les inscriptions dans le tableau HTML
 * @param {Array} registrations - Liste des inscriptions à afficher
 */
function displayRegistrations(registrations) {
  const tbody = document.getElementById("registrationsTableBody");
  tbody.innerHTML = "";

  registrations.forEach((registration) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${registration.lastName}</td>
      <td>${registration.firstName}</td>
      <td>${registration.typeInscription}</td>
      <td>${registration.status}</td>
      <td>${registration.paymentStatus || "Non payé"}</td>
      <td class="action-buttons">
        <button class="btn btn-info details-btn" data-id="${registration._id}" onclick="showDetails('${
      registration._id
    }')">Détails</button>
        ${
          registration.status === "attente"
            ? `<button class="btn btn-success accept-btn" data-id="${registration._id}" onclick="updateStatus('${registration._id}', 'accepté')">Accepter</button>
             <button class="btn btn-danger reject-btn" data-id="${registration._id}" onclick="updateStatus('${registration._id}', 'refusé')">Refuser</button>`
            : registration.status === "refusé"
            ? `<button class="btn btn-danger delete-btn" data-id="${registration._id}" onclick="deleteRegistration('${registration._id}')">Supprimer</button>`
            : ""
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Affiche les détails complets d'une inscription dans une fenêtre modale
 * @param {string} id - Identifiant de l'inscription à afficher
 */
async function showDetails(id) {
  try {
    const response = await fetch(`https://backendestrappes.fr/registration/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });

    if (!response.ok) throw new Error("Erreur lors du chargement des détails");

    const registration = await response.json();
    const detailsDiv = document.getElementById("registrationDetails");

    detailsDiv.innerHTML = `
      <div class="detail-row">
          <div class="detail-label">Type d'inscription:</div>
          <div class="detail-value">${registration.typeInscription}</div>
      </div>
      <div class="detail-row">
          <div class="detail-label">Nom complet:</div>
          <div class="detail-value">${registration.firstName} ${registration.lastName}</div>
      </div>
      <div class="detail-row">
          <div class="detail-label">Date de naissance:</div>
          <div class="detail-value">${new Date(registration.birthDate).toLocaleDateString()}</div>
      </div>
      <div class="detail-row">
          <div class="detail-label">Genre:</div>
          <div class="detail-value">${registration.gender}</div>
      </div>
      <div class="detail-row">
          <div class="detail-label">Contact:</div>
          <div class="detail-value">
              Tél: ${registration.contact.phone}<br>
              Email: ${registration.contact.email}
          </div>
      </div>
      ${
        registration.tutor
          ? `
          <div class="detail-row">
              <div class="detail-label">Tuteur:</div>
              <div class="detail-value">
                  Nom: ${registration.tutor.name}<br>
                  Tél: ${registration.tutor.phone}<br>
                  Email: ${registration.tutor.email}
              </div>
          </div>
      `
          : ""
      }
      <div class="detail-row">
          <div class="detail-label">Adresse:</div>
          <div class="detail-value">
              ${registration.address.fullAddress}<br>
              ${registration.address.city}, ${registration.address.postalCode}
          </div>
      </div>
      <div class="detail-row">
          <div class="detail-label">Documents:</div>
          <div class="detail-value">
              ${
                registration.documents.carteIdentite
                  ? `<div><strong>Carte d'identité :</strong></div>
                     ${
                       registration.documents.carteIdentite.startsWith("data:application/pdf;base64")
                         ? `<iframe class="document-pdf" src="${registration.documents.carteIdentite}" frameborder="0"></iframe>`
                         : `<img src="${registration.documents.carteIdentite}" class="document-image" alt="Carte d'identité">`
                     }`
                  : "Carte d'identité: Non fourni"
              }
              <br>
              ${
                registration.documents.justificatifDomicile
                  ? `<div><strong>Justificatif de domicile :</strong></div>
                  ${
                    registration.documents.justificatifDomicile.startsWith("data:application/pdf;base64")
                      ? `<iframe class="document-pdf" src="${registration.documents.justificatifDomicile}" frameborder="0"></iframe>`
                      : `<img src="${registration.documents.justificatifDomicile}" class="document-image" alt="Justificatif de domicile">`
                  }`
                  : "Justificatif de domicile: Non fourni"
              }
              <br>
              ${
                registration.documents.certificatMedical
                  ? `<div><strong>Certificat médical :</strong></div>
                           ${
                             registration.documents.certificatMedical.startsWith("data:application/pdf;base64")
                               ? `<iframe class="document-pdf" src="${registration.documents.certificatMedical}" frameborder="0"></iframe>`
                               : `<img src="${registration.documents.certificatMedical}" class="document-image" alt="Certificat médical">`
                           }`
                  : "Certificat médical: Non fourni"
              }
          </div>
      </div>
      <div class="detail-row">
          <div class="detail-label">Droit à l'image:</div>
          <div class="detail-value">${registration.droitImage}</div>
      </div>
    `;

    document.getElementById("detailsModal").style.display = "block";
  } catch (error) {
    console.error("Erreur:", error);
    alert("Erreur lors du chargement des détails");
  }
}

/**
 * Met à jour le statut d'une inscription (acceptation ou refus)
 * @param {string} id - Identifiant de l'inscription
 * @param {string} newStatus - Nouveau statut ('accepté' ou 'refusé')
 */
async function updateStatus(id, newStatus) {
  try {
    // Récupérer les détails de l'inscription pour vérifier son type
    const detailsResponse = await fetch(`https://backendestrappes.fr/registration/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    
    if (!detailsResponse.ok) {
      throw new Error("Erreur lors de la récupération des détails de l'inscription");
    }
    
    const registrationDetails = await detailsResponse.json();
    
    if (newStatus === "accepté") {
      // Si c'est une mutation, afficher le modal de prix
      if (registrationDetails.typeInscription === "mutation") {
        // Stocker l'ID de l'inscription dans un champ caché pour référence
        document.getElementById("registrationIdForPrice").value = id;
        
        // Réinitialiser le champ de prix
        document.getElementById("licencePrice").value = "";
        
        // Afficher le modal
        const licencePriceModal = document.getElementById("licencePriceModal");
        licencePriceModal.style.display = "block";
        return; // Sortir de la fonction, le reste sera géré par l'événement du modal
      } else {
        // Pour les autres types, continuer comme avant
        if (!confirm("Accepter cette inscription ? Un email avec un lien de paiement sera envoyé à l'inscrit.")) {
          return;
        }
        
        // Afficher un indicateur de chargement
        const actionCell = document.querySelector(`button[data-id="${id}"].accept-btn`).closest('td');
        const originalContent = actionCell.innerHTML;
        actionCell.innerHTML = `<span class="spinner">Envoi du lien de paiement...</span>`;
        
        try {
          // D'abord essayer d'envoyer le lien de paiement
          const paymentResponse = await fetch(`https://backendestrappes.fr/stripe/registration/${id}/payment-link`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
            }
          });

          if (!paymentResponse.ok) {
            const errorText = await paymentResponse.text();
            throw new Error(`Erreur lors de l'envoi du lien de paiement: ${errorText}`);
          }

          // Mettre à jour le statut vers "accepté"
          const statusResponse = await fetch(`https://backendestrappes.fr/registration/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
            },
            body: JSON.stringify({ status: newStatus }),
          });

          if (!statusResponse.ok) {
            const errorText = await statusResponse.text();
            throw new Error(`Erreur lors de la mise à jour du statut: ${errorText}`);
          }
          
          alert(`Inscription acceptée et lien de paiement envoyé par email.`);
        } catch (error) {
          console.error("Erreur:", error);
          // En cas d'erreur, restaurer le contenu original de la cellule d'action
          actionCell.innerHTML = originalContent;
          alert(`Erreur: ${error.message}. Le statut n'a pas été changé.`);
          return;
        }
      }
    } else {
      // Pour les autres statuts (comme "refusé"), mettre à jour directement
      const response = await fetch(`https://backendestrappes.fr/registration/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur lors de la mise à jour du statut: ${errorText}`);
      }
    }

    // Recharger les inscriptions pour mettre à jour l'interface
    await loadRegistrations();
  } catch (error) {
    console.error("Erreur:", error);
    alert(error.message || "Une erreur est survenue");
  }
}

/**
 * Supprime une inscription du système
 * @param {string} id - Identifiant de l'inscription à supprimer
 */
async function deleteRegistration(id) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer cette inscription ?"))
    return;

  try {
    const response = await fetch(`https://backendestrappes.fr/registration/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });

    if (!response.ok)
      throw new Error("Erreur lors de la suppression de l'inscription");

    await loadRegistrations();
  } catch (error) {
    console.error("Erreur:", error);
    alert("Erreur lors de la suppression de l'inscription");
  }
}

// ========================================================================================
// SECTION 4: GESTION DES PRIX PERSONNALISÉS (pour les mutations)
// ========================================================================================

/**
 * Gère la soumission du prix personnalisé pour une inscription de type mutation
 */
async function handleLicencePriceConfirmation() {
  const priceInput = document.getElementById("licencePrice");
  const id = document.getElementById("registrationIdForPrice").value;

  if (!priceInput.value || isNaN(parseFloat(priceInput.value))) {
    alert("Veuillez entrer un montant valide");
    return;
  }

  const price = parseFloat(priceInput.value);
  const actionCell = document.querySelector(`button[data-id="${id}"].accept-btn`).closest("td");
  const originalContent = actionCell.innerHTML;
  
  try {
    actionCell.innerHTML = `<span class="spinner">Envoi du lien...</span>`;
    
    // Envoyer le prix personnalisé
    const paymentResponse = await fetch(
      `https://backendestrappes.fr/stripe/registration/${id}/payment-link`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify({ customPrice: price }),
      }
    );

    if (!paymentResponse.ok) throw new Error(await paymentResponse.text());

    // Mettre à jour le statut
    await fetch(`https://backendestrappes.fr/registration/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: JSON.stringify({ status: "accepté" }),
    });

    await loadRegistrations();
    alert(`Lien de paiement (${price}€) envoyé avec succès !`);
  } catch (error) {
    console.error(error);
    actionCell.innerHTML = originalContent;
    alert(`Erreur: ${error.message}`);
  } finally {
    document.getElementById("licencePriceModal").style.display = "none";
  }
}

// ========================================================================================
// SECTION 5: GESTION DES ÉVÉNEMENTS UI ET CONFIGURATION DES MODALES
// ========================================================================================

/**
 * Configure tous les gestionnaires d'événements nécessaires à l'interface
 */
function setupEventListeners() {
  // Configuration des modales
  setupModals();

  // Gestionnaire pour les filtres
  const statusFilter = document.getElementById("statusFilter");
  const typeFilter = document.getElementById("typeFilter");
  
  if (statusFilter) statusFilter.addEventListener("change", loadRegistrations);
  if (typeFilter) typeFilter.addEventListener("change", loadRegistrations);
  
  // Confirmation de prix de licence
  const confirmLicencePrice = document.getElementById("confirmLicencePrice");
  const cancelLicencePrice = document.getElementById("cancelLicencePrice");
  
  if (confirmLicencePrice) {
    confirmLicencePrice.addEventListener("click", handleLicencePriceConfirmation);
  }
  
  if (cancelLicencePrice) {
    cancelLicencePrice.addEventListener("click", () => {
      document.getElementById("licencePriceModal").style.display = "none";
    });
  }
}

/**
 * Configure les fenêtres modales de l'interface
 */
function setupModals() {
  const detailsModal = document.getElementById("detailsModal");
  const licencePriceModal = document.getElementById("licencePriceModal");

  // Fermer les modals en cliquant sur ×
  document.querySelector(".close").onclick = () => (detailsModal.style.display = "none");
  document.getElementById("closeLicenceModal").onclick = () => (licencePriceModal.style.display = "none");

  // Fermer les modals en cliquant à l'extérieur
  window.onclick = (event) => {
    if (event.target === detailsModal) detailsModal.style.display = "none";
    if (event.target === licencePriceModal) licencePriceModal.style.display = "none";
  };
}

// Initialisation additionnelle une fois que la page est complètement chargée
window.addEventListener("load", function() {
  console.log("Page entièrement chargée");
  setupEventListeners();
  loadRegistrations();
});