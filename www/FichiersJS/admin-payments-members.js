/**
 * admin-payments-members.js
 * Script principal pour la gestion des cotisations des membres
 * Ce fichier gère le chargement, l'ajout, la modification et la suppression des membres
 * ainsi que le filtrage, la pagination et l'affichage des détails
 */

// ======================================
// VARIABLES GLOBALES
// ======================================
let allMembers = [];            // Stocke tous les membres récupérés du serveur
let currentPage = 1;            // Page actuelle pour la pagination
const limit = 10;               // Nombre de membres affichés par page
let sortOrder = 'asc';           // Ordre de tri (ascendant ou descendant)
let filteredMembers = [];        // Stocke les membres après filtrage

// ======================================
// INITIALISATION ET AUTHENTIFICATION
// ======================================

/**
 * Fonction exécutée au chargement de la page
 * Initialise tous les événements et vérifie l'authentification
 */
window.onload = function () {
  // Vérifier l'authentification avant d'afficher le contenu
  if (checkAdminToken()) {
    document.querySelector(".container").style.display = "block";

    // Gestion du bouton de déconnexion
    document.getElementById("logoutBtn").addEventListener("click", logout);

    // Configuration des modals
    setupModals();

    // Gestion des accès aux liens de la navbar
    setupNavbarAccess();

    // Initialiser les écouteurs d'événements
    setupEventListeners();

    // Charger les membres
    loadMembers();
  }
};

/**
 * Vérifie si l'utilisateur est connecté avec un token d'administrateur valide
 * @return {boolean} true si le token est valide, false sinon
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
 * Déconnecte l'utilisateur en supprimant le token et redirigeant vers la page de connexion
 */
function logout() {
  localStorage.removeItem("adminToken");
  window.location.href = "Admin.html";
}

/**
 * Configure les modals (fenêtres modales) pour la fermeture
 */
function setupModals() {
  const modals = document.querySelectorAll(".modal");
  modals.forEach((modal) => {
    const closeBtn = modal.querySelector(".close");
    closeBtn.onclick = () => {
      modal.style.display = "none";
    };
  });

  // Fermer les modals quand on clique en dehors
  window.onclick = function(event) {
    if (event.target.classList.contains("modal")) {
      event.target.style.display = "none";
    }
  };
}

/**
 * Configure les accès aux liens de la navbar selon le rôle de l'utilisateur
 */
function setupNavbarAccess() {
  const token = localStorage.getItem("adminToken");
  const decoded = jwt_decode(token);
  const role = decoded.role;

  document.querySelectorAll(".restricted-link").forEach((link) => {
    const allowedRoles = link.getAttribute("data-roles");
    if (!allowedRoles) return; // pas de restriction

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

/**
 * Initialise tous les écouteurs d'événements de la page
 */
function setupEventListeners() {
  // Écouteurs d'événements pour les filtres
  document.getElementById("searchInput").addEventListener("input", applyFilters);
  document.getElementById("paymentStatusFilter").addEventListener("change", applyFilters);
  document.getElementById("categoryFilter").addEventListener("change", applyFilters);
  document.getElementById("activeFilter").addEventListener("change", applyFilters);

  // Écouteurs d'événements pour les formulaires
  document.getElementById("addMemberForm").addEventListener("submit", addMember);
  document.getElementById("editMemberForm").addEventListener("submit", updateMember);
  document.getElementById("additionalCostForm").addEventListener("submit", handleAdditionalCost);
  document.getElementById("paymentForm").addEventListener("submit", handlePayment);

  // Écouteurs d'événements pour les boutons
  document.getElementById("addLicenseCostBtn").addEventListener("click", function () {
    document.getElementById("confirmAddLicenseCostModal").style.display = "block";
  });

  // Gestion des clics en dehors des modals pour les fermer
  window.onclick = function (event) {
    if (event.target == document.getElementById("memberDetailsModal")) {
      closeModal();
    }
    if (event.target == document.getElementById("addMemberModal")) {
      closeAddMemberModal();
    }
    if (event.target == document.getElementById("editMemberModal")) {
      closeEditMemberModal();
    }
    if (event.target == document.getElementById("additionalCostModal")) {
      closeAdditionalCostModal();
    }
    if (event.target == document.getElementById("paymentModal")) {
      closePaymentModal();
    }
  };
}

// ======================================
// GESTION DES ONGLETS
// ======================================

/**
 * Affiche un onglet et cache les autres
 * @param {string} tabId - L'ID de l'onglet à afficher
 */
function showTab(tabId) {
  // Cacher tous les onglets
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.add("hidden");
  });

  // Afficher l'onglet sélectionné
  document.getElementById(tabId).classList.remove("hidden");

  // Mettre à jour les boutons d'onglet
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.remove("active");
  });

  document.querySelector(`[onclick="showTab('${tabId}')"]`).classList.add("active");
}

// ======================================
// CHARGEMENT ET FILTRAGE DES DONNÉES
// ======================================

/**
 * Charge les membres depuis le serveur
 */
async function loadMembers() {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append(
      "paymentStatus",
      document.getElementById("paymentStatusFilter").value
    );
    queryParams.append(
      "category",
      document.getElementById("categoryFilter").value
    );
    const activeFilter = document.getElementById("activeFilter").value;
    if (activeFilter !== "") {
      queryParams.append("active", activeFilter);
    }

    const response = await fetch(
      `https://backendestrappes.fr/protected/members?${queryParams}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      }
    );
    if (!response.ok) throw new Error("Erreur lors du chargement des membres");
    allMembers = await response.json();
    applyFilters();
    updatePaginationControls();
  } catch (error) {
    console.error("Erreur de chargement des membres:", error);
  }
}

/**
 * Applique les filtres aux membres et met à jour l'affichage
 */
function applyFilters() {
  const searchQuery = document.getElementById("searchInput").value.trim().toLowerCase();
  const paymentStatus = document.getElementById("paymentStatusFilter").value;
  const category = document.getElementById("categoryFilter").value;
  const activeFilter = document.getElementById("activeFilter").value;

  // Filtrer les membres selon les critères
  filteredMembers = allMembers.filter(member => {
    const matchesSearch = !searchQuery ||
      member.firstName.toLowerCase().includes(searchQuery) ||
      member.lastName.toLowerCase().includes(searchQuery);
    const matchesPaymentStatus = !paymentStatus || member.paymentStatus === paymentStatus;
    const matchesCategory = !category || member.category === category;
    const matchesActive = activeFilter === "" || member.active.toString() === activeFilter;

    return matchesSearch && matchesPaymentStatus && matchesCategory && matchesActive;
  });

  // Trier les membres par nom
  filteredMembers.sort((a, b) => {
    if (sortOrder === 'asc') {
      return a.lastName.localeCompare(b.lastName);
    } else {
      return b.lastName.localeCompare(a.lastName);
    }
  });

  // Paginer les résultats
  const startIndex = (currentPage - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

  // Afficher les membres et mettre à jour la pagination
  displayMembers(paginatedMembers);
  updatePaginationControls(filteredMembers.length);
}

/**
 * Change l'ordre de tri et applique les filtres
 * @param {string} field - Le champ sur lequel trier
 */
function toggleSort(field) {
  sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
  applyFilters();
}

// ======================================
// AFFICHAGE DES DONNÉES
// ======================================

/**
 * Affiche les membres dans le tableau
 * @param {Array} members - Liste des membres à afficher
 */
function displayMembers(members) {
  const tbody = document.getElementById("membersTableBody");
  tbody.innerHTML = "";

  const statusTranslations = {
    paid: "Payé",
    unpaid: "Non payé",
    partial: "Partiel",
  };

  members.forEach((member) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${member.lastName}</td>
      <td>${member.firstName}</td>
      <td>${member.category}</td>
      <td>${statusTranslations[member.paymentStatus] || member.paymentStatus}</td>
      <td>${member.totalDue - (member.totalPaid || 0)}€</td>
      <td class="action-buttons">
        <button onclick="showPaymentModal('${member._id}')" class="btn btn-success">Paiement</button>
        <button onclick="showAdditionalCostModal('${member._id}')" class="btn btn-warning">Coût</button>
        <button onclick="showMemberDetails('${member._id}')" class="btn btn-info">Détails</button>
        <button onclick="editMember('${member._id}')" class="btn btn-primary">Modifier</button>
        <button onclick="deleteMember('${member._id}')" class="btn btn-danger">Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ======================================
// GESTION DE LA PAGINATION
// ======================================

/**
 * Met à jour les contrôles de pagination
 * @param {number} filteredCount - Nombre de membres filtrés
 */
function updatePaginationControls(filteredCount = null) {
  const pageInfo = document.getElementById("pageInfo");
  // Utiliser le nombre de membres filtrés
  const count = filteredCount !== null ? filteredCount : (window.filteredMembers ? window.filteredMembers.length : allMembers.length);
  const totalPages = Math.ceil(count / limit);

  // Assurer que currentPage ne dépasse pas le nombre total de pages
  if (currentPage > totalPages && totalPages > 0) {
    currentPage = totalPages;
  }

  pageInfo.innerHTML = `Page ${currentPage} sur ${totalPages}`;

  // Mettre à jour l'état des boutons
  const paginationButtons = document.querySelectorAll(".pagination-controls .btn-secondary");
  paginationButtons[0].disabled = currentPage === 1; // First page
  paginationButtons[1].disabled = currentPage === 1; // Previous page
  paginationButtons[2].disabled = currentPage === totalPages || totalPages === 0; // Next page
  paginationButtons[3].disabled = currentPage === totalPages || totalPages === 0; // Last page
}

/**
 * Aller à la première page
 */
function firstPage() {
  currentPage = 1;
  applyFilters();
}

/**
 * Aller à la page précédente
 */
function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    applyFilters();
  }
}

/**
 * Aller à la page suivante
 */
function nextPage() {
  const totalPages = Math.ceil(filteredMembers.length / limit);

  if (currentPage < totalPages) {
    currentPage++;
    applyFilters();
  }
}

/**
 * Aller à la dernière page
 */
function lastPage() {
  currentPage = Math.ceil(filteredMembers.length / limit);
  applyFilters();
}

// ======================================
// FORMATAGE DES DONNÉES
// ======================================

/**
 * Formate une date au format JJ/MM/AAAA
 * @param {string} dateString - Date à formater
 * @return {string} Date formatée
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Les mois sont indexés à partir de 0
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// ======================================
// GESTION DES DÉTAILS D'UN MEMBRE
// ======================================

/**
 * Affiche les détails d'un membre
 * @param {string} memberId - ID du membre
 */
async function showMemberDetails(memberId) {
  try {
    const statusTranslations = {
      paid: "Payé",
      unpaid: "Non payé",
      partial: "Partiel",
    };

    const response = await fetch(`https://backendestrappes.fr/protected/members/${memberId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    if (!response.ok) throw new Error("Erreur lors du chargement des détails");
    const member = await response.json();

    const content = document.getElementById("memberDetailsContent");
    content.innerHTML = `
      <div><strong>Numéro de licence:</strong> ${member.licenseNumber}</div>
      <div><strong>Email:</strong> ${member.email}</div>
      <div><strong>Téléphone:</strong> ${member.phone}</div>
      <div><strong>Date de naissance:</strong> ${member.birthDate}</div>
      <div><strong>Genre:</strong> ${member.gender}</div>
      <div><strong>Catégorie:</strong> ${member.category}</div>
      <div><strong>Statut:</strong> ${member.active ? "Actif" : "Inactif"}</div>
      <div><strong>Montant total dû:</strong> ${member.totalDue}€</div>
      <div><strong>Montant payé:</strong> ${member.totalPaid || 0}€</div>
      <div><strong>Statut paiement:</strong> ${statusTranslations[member.paymentStatus] || member.paymentStatus}</div>
    `;

    const paymentHistoryBody = document.getElementById("paymentHistoryBody");
    paymentHistoryBody.innerHTML = "";
    member.paymentHistory.forEach((payment) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${payment.amount}€</td>
        <td>${payment.paymentMethod}</td>
        <td>${formatDate(payment.date)}</td>
        <td>${payment.status}</td>
      `;
      paymentHistoryBody.appendChild(tr);
    });

    document.getElementById("memberDetailsModal").style.display = "flex";
  } catch (error) {
    console.error("Erreur de chargement des détails:", error);
  }
}

/**
 * Ferme le modal des détails d'un membre
 */
function closeModal() {
  document.getElementById("memberDetailsModal").style.display = "none";
}

// ======================================
// GESTION DES MODALS D'AJOUT DE MEMBRE
// ======================================

/**
 * Affiche le modal d'ajout d'un membre
 */
function showAddMemberModal() {
  document.getElementById("addMemberModal").style.display = "flex";
}

/**
 * Ferme le modal d'ajout d'un membre
 */
function closeAddMemberModal() {
  document.getElementById("addMemberModal").style.display = "none";
  document.getElementById("addMemberForm").reset();
}

/**
 * Ajoute un nouveau membre
 * @param {Event} event - Événement du formulaire
 */
async function addMember(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const memberData = Object.fromEntries(formData.entries());

  // Formater la date de naissance
  if (memberData.birthDate) {
    memberData.birthDate = formatDate(memberData.birthDate);
  }

  try {
    const response = await fetch("https://backendestrappes.fr/protected/members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: JSON.stringify(memberData),
    });
    if (!response.ok) throw new Error("Erreur lors de l'ajout du membre");
    alert("Membre ajouté avec succès");
    closeAddMemberModal();
    loadMembers();
  } catch (error) {
    console.error("Erreur d'ajout:", error);
    alert("Erreur lors de l'ajout du membre");
  }
}

// ======================================
// GESTION DES MODALS DE MODIFICATION DE MEMBRE
// ======================================

/**
 * Affiche le modal de modification d'un membre
 * @param {string} memberId - ID du membre à modifier
 */
async function editMember(memberId) {
  try {
    const response = await fetch(`https://backendestrappes.fr/protected/members/${memberId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    if (!response.ok) throw new Error("Erreur lors du chargement des détails");
    const member = await response.json();

    document.getElementById("editMemberId").value = member._id;
    document.getElementById("editLicenseNumber").value = member.licenseNumber;
    document.getElementById("editEmail").value = member.email;
    document.getElementById("editPhone").value = member.phone;
    document.getElementById("editFirstName").value = member.firstName;
    document.getElementById("editLastName").value = member.lastName;
    document.getElementById("editGender").value = member.gender;
    document.getElementById("editCategory").value = member.category;
    document.getElementById("editActive").value = member.active;

    document.getElementById("editMemberModal").style.display = "flex";
  } catch (error) {
    console.error("Erreur de chargement pour modification:", error);
    alert("Erreur lors du chargement des détails du membre");
  }
}

/**
 * Ferme le modal de modification d'un membre
 */
function closeEditMemberModal() {
  document.getElementById("editMemberModal").style.display = "none";
  document.getElementById("editMemberForm").reset();
}

/**
 * Met à jour un membre
 * @param {Event} event - Événement du formulaire
 */
async function updateMember(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const memberData = Object.fromEntries(formData.entries());
  const memberId = memberData.id;
  delete memberData.id;

  try {
    const response = await fetch(`https://backendestrappes.fr/protected/members/${memberId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: JSON.stringify(memberData),
    });
    if (!response.ok) throw new Error("Erreur lors de la mise à jour du membre");
    alert("Membre mis à jour avec succès");
    closeEditMemberModal();
    loadMembers();
  } catch (error) {
    console.error("Erreur de mise à jour:", error);
    alert("Erreur lors de la mise à jour du membre");
  }
}

// ======================================
// GESTION DE LA SUPPRESSION DE MEMBRE
// ======================================

/**
 * Supprime un membre
 * @param {string} memberId - ID du membre à supprimer
 */
async function deleteMember(memberId) {
  if (confirm("Êtes-vous sûr de vouloir supprimer ce membre ?")) {
    try {
      const response = await fetch(
        `https://backendestrappes.fr/protected/members/${memberId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Erreur lors de la suppression du membre");
      alert("Membre supprimé avec succès");
      loadMembers();
    } catch (error) {
      console.error("Erreur de suppression:", error);
      alert("Erreur lors de la suppression du membre");
    }
  }
}

// ======================================
// GESTION DES COÛTS SUPPLÉMENTAIRES
// ======================================

/**
 * Affiche le modal d'ajout d'un coût supplémentaire
 * @param {string} memberId - ID du membre
 */
function showAdditionalCostModal(memberId) {
  document.getElementById("memberIdForCost").value = memberId;
  document.getElementById("additionalCostModal").style.display = "flex";
}

/**
 * Ferme le modal d'ajout d'un coût supplémentaire
 */
function closeAdditionalCostModal() {
  document.getElementById("additionalCostModal").style.display = "none";
  document.getElementById("additionalCostForm").reset();
}

/**
 * Gère l'ajout d'un coût supplémentaire
 * @param {Event} event - Événement du formulaire
 */
async function handleAdditionalCost(event) {
  event.preventDefault();
  const memberId = document.getElementById("memberIdForCost").value;
  const additionalCost = parseFloat(
    document.getElementById("additionalCost").value
  );

  try {
    const response = await fetch(`https://backendestrappes.fr/protected/members/${memberId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: JSON.stringify({ totalDue: additionalCost }),
    });

    if (!response.ok) throw new Error("Erreur lors de l'ajout du coût supplémentaire");

    alert("Coût supplémentaire ajouté avec succès");
    closeAdditionalCostModal();
    loadMembers();
  } catch (error) {
    console.error("Erreur d'ajout du coût supplémentaire:", error);
    alert("Erreur lors de l'ajout du coût supplémentaire");
  }
}

// ======================================
// GESTION DES PAIEMENTS
// ======================================

/**
 * Affiche le modal d'enregistrement d'un paiement
 * @param {string} memberId - ID du membre
 */
function showPaymentModal(memberId) {
  document.getElementById("memberIdForPayment").value = memberId;
  document.getElementById("paymentModal").style.display = "flex";
}

/**
 * Ferme le modal d'enregistrement d'un paiement
 */
function closePaymentModal() {
  document.getElementById("paymentModal").style.display = "none";
  document.getElementById("paymentForm").reset();
}

/**
 * Gère l'enregistrement d'un paiement
 * @param {Event} event - Événement du formulaire
 */
async function handlePayment(event) {
  event.preventDefault();
  const memberId = document.getElementById("memberIdForPayment").value;
  const paymentAmount = parseFloat(
    document.getElementById("paymentAmount").value
  );
  const paymentMethod = document.getElementById("paymentMethod").value;

  try {
    const response = await fetch(
      `https://backendestrappes.fr/protected/members/${memberId}/payment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify({ amount: paymentAmount, paymentMethod }),
      }
    );

    if (!response.ok) throw new Error("Erreur lors de l'ajout du paiement");

    alert("Paiement ajouté avec succès");
    closePaymentModal();
    loadMembers();
  } catch (error) {
    console.error("Erreur d'ajout du paiement:", error);
    alert("Erreur lors de l'ajout du paiement");
  }
}

// ======================================
// GESTION DE L'IMPORTATION DES MEMBRES
// ======================================

/**
 * Gère l'importation des membres depuis un fichier
 */
document.getElementById("importMembersBtn").addEventListener("click", function () {
  document.getElementById("importFileInput").click();
});

document.getElementById("importFileInput").addEventListener("change", async function (event) {
  const file = event.target.files[0];
  if (!file) {
    alert("Veuillez sélectionner un fichier à importer.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("https://backendestrappes.fr/protected/import", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Erreur lors de l'importation des membres");
    }

    const data = await response.json();
    alert("Importation des membres réussie");
    console.log("Résumé de l'importation:", data);
    loadMembers(); // Recharger les membres après l'importation
  } catch (error) {
    console.error("Erreur lors de l'importation des membres:", error);
    alert("Erreur lors de l'importation des membres");
  }
});

// ======================================
// GESTION DES RAPPELS DE PAIEMENT
// ======================================

/**
 * Affiche le modal de confirmation d'envoi des rappels de paiement
 */
function showConfirmReminderModal() {
  document.getElementById("confirmReminderModal").style.display = "block";
}

/**
 * Ferme le modal de confirmation d'envoi des rappels de paiement
 */
function closeConfirmReminderModal() {
  document.getElementById("confirmReminderModal").style.display = "none";
}

/**
 * Confirme l'envoi des rappels de paiement
 */
function confirmSendReminders() {
  closeConfirmReminderModal();
  sendPaymentReminders();
}

/**
 * Envoie les rappels de paiement
 */
async function sendPaymentReminders() {
  const sendButton = document.getElementById("sendRemindersBtn");
  const resultsDiv = document.getElementById("reminderResults");

  if (!sendButton) {
    console.error("Le bouton sendRemindersBtn n'a pas été trouvé !");
    return;
  }

  try {
    sendButton.disabled = true;
    sendButton.innerHTML = 'Envoi en cours... <span class="loader"></span>';

    resultsDiv.innerHTML = `
      <div class="reminder-loading">
        <p>Envoi des rappels en cours...</p>
        <div class="spinner"></div>
      </div>
    `;

    const response = await fetch(
      "https://backendestrappes.fr/protected/members/send-payment-reminders",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }

    const data = await response.json();
    console.log("API Response:", data);

    if (!data.results || typeof data.results !== "object") {
      console.error("Structure de réponse inattendue:", data);
      throw new Error("Unexpected response structure");
    }

    const totalSent = data.results.success.length;
    const totalFailed = data.results.failed.length;

    resultsDiv.innerHTML = `
      <div class="reminder-results">
        <p><strong>Total des rappels envoyés :</strong> ${totalSent}</p>
        <p><strong>Échecs :</strong> ${totalFailed}</p>
      </div>
    `;

    document.getElementById("reminderResultsModal").style.display = "block";
  } catch (error) {
    console.error("Erreur:", error);
    alert("Une erreur est survenue lors de l'envoi des rappels");
  } finally {
    sendButton.disabled = false;
    sendButton.innerHTML = "Envoyer les rappels de paiement";
  }
}

/**
 * Ferme le modal des résultats des rappels de paiement
 */
function closeReminderResultsModal() {
  document.getElementById("reminderResultsModal").style.display = "none";
}

// ======================================
// GESTION DE L'AJUSTEMENT DU COÛT DE LA LICENCE
// ======================================

/**
 * Affiche le modal de confirmation d'ajustement du coût de la licence
 */
function showConfirmAddLicenseCostModal() {
  document.getElementById("confirmAddLicenseCostModal").style.display = "block";
}

/**
 * Ferme le modal de confirmation d'ajustement du coût de la licence
 */
function closeConfirmAddLicenseCostModal() {
  document.getElementById("confirmAddLicenseCostModal").style.display = "none";
}

/**
 * Confirme l'ajustement du coût de la licence
 */
async function confirmAddLicenseCost() {
  // Sélectionner les éléments
  const addLicenseCostBtn = document.getElementById("addLicenseCostBtn");
  const loadingIndicator = document.getElementById("loadingIndicator");

  closeConfirmAddLicenseCostModal();

  const licenseCostInput = document.getElementById("licenseCost").value;
  const licenseCost = parseFloat(licenseCostInput);

  if (isNaN(licenseCost) || licenseCost <= 0) {
    alert("Veuillez entrer un coût de licence valide.");
    return;
  }

  // Vérifier que allMembers contient des données
  if (!allMembers || allMembers.length === 0) {
    alert("Aucun membre trouvé pour appliquer le coût de licence.");
    return;
  }

  const memberIds = allMembers.map(member => member._id);

  try {
    // Remplacer le bouton par l'indicateur de chargement
    addLicenseCostBtn.style.display = "none";
    loadingIndicator.style.display = "block";

    // Ajout de logs pour debug
    console.log("Envoi de la requête avec:", {
      memberIds,
      updateData: { totalDue: licenseCost }
    });

    const response = await fetch("https://backendestrappes.fr/protected/members/update-multiple", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: JSON.stringify({
        memberIds,
        updateData: { totalDue: licenseCost }
      }),
    });

    // Récupérer et afficher les détails de l'erreur si disponibles
    const responseData = await response.json().catch(e => null);
    if (!response.ok) {
      console.error("Détails de l'erreur:", responseData);
      throw new Error(responseData?.message || "Erreur lors de l'ajout du coût de la licence");
    }

    alert("Coût de la licence ajouté avec succès à tous les membres");
    loadMembers();
  } catch (error) {
    console.error("Erreur d'ajout du coût de la licence:", error);
    alert(`Erreur lors de l'ajout du coût de la licence: ${error.message}`);
  } finally {
    // Restaurer le bouton et masquer l'indicateur de chargement
    addLicenseCostBtn.style.display = "inline-block";
    loadingIndicator.style.display = "none";
  }
}
