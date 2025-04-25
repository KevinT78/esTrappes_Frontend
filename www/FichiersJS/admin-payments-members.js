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






// ======================================
// GESTION DES MEMBRES AVEC COMMENTAIRES
// ======================================

/**
 * Affiche les membres avec des commentaires dans un modal
 */
document.getElementById("showMembersWithComments").addEventListener("click", async function () {
  try {
    const response = await fetch(
      "https://backendestrappes.fr/protected/import/entries-with-comments", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      }
    );
    
    const data = await response.json();
    const membersList = document.getElementById("membersWithCommentsList");
    
    if (membersList) {
      membersList.innerHTML = "";
      data.members.forEach((member) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${member.lastName}</td>
          <td>${member.firstName}</td>
          <td>${member.comments.join("<br>")}</td>
        `;
        membersList.appendChild(row);
      });
      
      document.getElementById("membersWithCommentsModal").style.display = "block";
    } else {
      console.error("L'élément membersWithCommentsList n'a pas été trouvé dans le DOM.");
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des membres avec commentaires:", error);
  }
});

/**
 * Ferme le modal des membres avec commentaires
 */
function closeMembersWithCommentsModal() {
  document.getElementById("membersWithCommentsModal").style.display = "none";
}



// =======================================
// FONCTIONS D'EXPORTATION OPTIMISÉES
// =======================================

/**
 * Fonction pour exporter toutes les données des membres de manière optimisée
 */
async function exportAllMemberData() {
  showLoading("Préparation de l'exportation des données...");

  try {
    // Récupérer tous les membres
    const response = await fetch('https://backendestrappes.fr/protected/members', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem("adminToken")}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des membres');
    }

    const members = await response.json();

    // Afficher la progression
    updateLoadingMessage(`0/${members.length} membres traités...`);

    const completeMemberData = [];
    const batchSize = 10; // Nombre de requêtes simultanées
    let processedCount = 0;

    // Traitement par lots
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);

      // Exécuter les requêtes en parallèle pour ce lot
      const batchPromises = batch.map(member =>
        fetchMemberDetails(member._id)
          .then(detailedMember => {
            if (detailedMember) {
              completeMemberData.push(detailedMember);
            }
            processedCount++;
            updateLoadingMessage(`${processedCount}/${members.length} membres traités...`);
          })
          .catch(error => {
            console.error(`Erreur pour le membre ID ${member._id}:`, error);
            processedCount++;
            updateLoadingMessage(`${processedCount}/${members.length} membres traités...`);
          })
      );

      // Attendre que toutes les requêtes du lot soient terminées
      await Promise.all(batchPromises);
    }

    // Une fois toutes les données collectées, les exporter en Excel
    updateLoadingMessage("Génération du fichier Excel...");
    exportToExcel(completeMemberData);
    hideLoading();
  } catch (error) {
    console.error('Erreur:', error);
    alert('Une erreur est survenue lors de l\'exportation des données');
    hideLoading();
  }
}

/**
 * Récupère les détails d'un membre spécifique
 * @param {string} memberId - ID du membre
 * @return {Promise} - Promesse résolue avec les détails du membre
 */
async function fetchMemberDetails(memberId) {
  try {
    const memberDetailsResponse = await fetch(`https://backendestrappes.fr/protected/members/${memberId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem("adminToken")}`,
        'Content-Type': 'application/json'
      }
    });

    if (!memberDetailsResponse.ok) {
      throw new Error(`Erreur HTTP: ${memberDetailsResponse.status}`);
    }

    return await memberDetailsResponse.json();
  } catch (error) {
    console.error(`Échec de récupération des détails pour le membre ${memberId}:`, error);
    return null;
  }
}

/**
 * Met à jour le message de chargement
 * @param {string} message - Le nouveau message
 */
function updateLoadingMessage(message) {
  const loadingMessage = document.getElementById('loadingMessage');
  if (loadingMessage) {
    loadingMessage.textContent = message;
  }
}

/**
 * Fonction pour exporter les données au format Excel avec usage de Web Workers
 * @param {Array} data - Données à exporter
 */
function exportToExcel(data) {
  // Si les données sont vides, afficher un message et arrêter
  if (!data || data.length === 0) {
    alert('Aucune donnée à exporter');
    hideLoading();
    return;
  }

  // Vérifier si on peut utiliser les Web Workers
  if (window.Worker) {
    try {
      // Créer un blob URL pour notre code de worker
      const workerCode = `
        importScripts('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');

        self.onmessage = function(e) {
          const { data, formattedDate } = e.data;

          // Créer un classeur
          const workbook = XLSX.utils.book_new();

          // Préparer les données formatées
          const flatData = formatDataForExcel(data);

          // Convertir le tableau en feuille de calcul
          const worksheet = XLSX.utils.aoa_to_sheet(flatData);

          // Calculer les largeurs de colonnes automatiquement
          worksheet['!cols'] = calculateColumnWidths(flatData);

          // Ajouter la feuille au classeur
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Membres et Historique');

          // Générer le fichier Excel
          const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

          // Envoyer le buffer au thread principal
          self.postMessage({
            buffer: excelBuffer,
            fileName: \`members_data_\${formattedDate}.xlsx\`
          });
        };

        function formatDataForExcel(data) {
          const flatData = [];

          // En-têtes
          const memberHeaders = [
            'ID', 'Numéro de licence', 'Nom', 'Prénom', 'Email', 'Téléphone',
            'Date de naissance', 'Genre', 'Catégorie', 'Statut de paiement',
            'Montant dû', 'Montant payé'
          ];

          const historyHeaders = ['Date', 'Montant', 'Méthode de paiement'];

          // Ajouter l'en-tête
          flatData.push([...memberHeaders, '', ...historyHeaders]);

          // Pour chaque membre
          data.forEach(member => {
            // Préparer les données du membre
            const memberData = [
              member._id,
              member.licenseNumber,
              member.lastName,
              member.firstName,
              member.email,
              member.phone,
              formatDate(member.birthDate),
              member.gender === 'M' ? 'Homme' : member.gender === 'F' ? 'Femme' : 'Inconnu',
              member.category,
              member.paymentStatus,
              member.totalDue || '',
              member.totalPaid || ''
            ];

            // Historique des paiements
            if (!member.paymentHistory || member.paymentHistory.length === 0) {
              flatData.push([...memberData, '', 'Aucun historique', '', '']);
            } else {
              // Premier paiement
              const firstPayment = member.paymentHistory[0];
              flatData.push([
                ...memberData,
                '',
                formatDate(firstPayment.date),
                firstPayment.amount,
                firstPayment.paymentMethod || 'N/A'
              ]);

              // Paiements suivants
              for (let i = 1; i < member.paymentHistory.length; i++) {
                const payment = member.paymentHistory[i];
                const emptyMemberData = Array(memberHeaders.length).fill('');
                flatData.push([
                  ...emptyMemberData,
                  '',
                  formatDate(payment.date),
                  payment.amount,
                  payment.paymentMethod || 'N/A'
                ]);
              }
            }
          });

          return flatData;
        }

        function calculateColumnWidths(flatData) {
          const maxColLengths = [];

          flatData.forEach(row => {
            row.forEach((cell, colIndex) => {
              const cellLength = cell ? String(cell).length : 0;

              if (!maxColLengths[colIndex]) {
                maxColLengths[colIndex] = cellLength;
              } else {
                maxColLengths[colIndex] = Math.max(maxColLengths[colIndex], cellLength);
              }
            });
          });

          return maxColLengths.map(length => ({
            wch: Math.min(Math.max(length * 1.2, 10), 50)
          }));
        }

        function formatDate(dateString) {
          if (!dateString) return '';

          const date = new Date(dateString);
          if (isNaN(date.getTime())) return dateString;

          return \`\${date.getDate().toString().padStart(2, '0')}/\${(date.getMonth() + 1).toString().padStart(2, '0')}/\${date.getFullYear()}\`;
        }
      `;

      const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(workerBlob);
      const worker = new Worker(workerUrl);

      // Date pour le nom du fichier
      const date = new Date();
      const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

      // Écouter les messages du worker
      worker.onmessage = function(e) {
        const { buffer, fileName } = e.data;
        saveExcelFile(buffer, fileName);

        // Nettoyer
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        hideLoading();
      };

      // Gérer les erreurs du worker
      worker.onerror = function(error) {
        console.error('Erreur dans le worker:', error);
        alert('Une erreur est survenue lors de la génération du fichier Excel');

        // Nettoyer
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        hideLoading();

        // Retomber sur la méthode classique
        processExcelExport(data);
      };

      // Envoyer les données au worker
      worker.postMessage({ data, formattedDate });

    } catch (error) {
      console.error('Erreur lors de la création du worker:', error);
      // Retomber sur la méthode classique
      processExcelExport(data);
    }
  } else {
    // Si les Web Workers ne sont pas disponibles, utiliser la méthode classique
    // Inclure dynamiquement la bibliothèque SheetJS
    if (typeof XLSX === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = function() {
        processExcelExport(data);
      };
      document.head.appendChild(script);
    } else {
      processExcelExport(data);
    }
  }
}

/**
 * Fonction pour traiter l'export Excel une fois la bibliothèque chargée (méthode classique de secours)
 * @param {Array} data - Données à exporter
 */
function processExcelExport(data) {
  // Format de date pour le nom du fichier
  const date = new Date();
  const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

  // Créer un classeur
  const workbook = XLSX.utils.book_new();

  // Préparer les données pour l'export
  const flatData = [];

  // En-têtes pour les membres
  const memberHeaders = [
    'ID', 'Numéro de licence', 'Nom', 'Prénom', 'Email', 'Téléphone',
    'Date de naissance', 'Genre', 'Catégorie', 'Statut de paiement',
    'Montant dû', 'Montant payé'
  ];

  // En-têtes pour l'historique des paiements
  const historyHeaders = ['Date', 'Montant', 'Méthode de paiement'];

  // Ajouter une ligne d'en-tête au début
  flatData.push([...memberHeaders, '', ...historyHeaders]);

  // Pour chaque membre
  data.forEach(member => {
    // Préparer les données du membre
    const memberData = [
      member._id,
      member.licenseNumber,
      member.lastName,
      member.firstName,
      member.email,
      member.phone,
      formatDate(member.birthDate),
      member.gender === 'M' ? 'Homme' : member.gender === 'F' ? 'Femme' : 'Inconnu',
      member.category,
      member.paymentStatus,
      member.totalDue || '',
      member.totalPaid || ''
    ];

    // Si le membre n'a pas d'historique de paiement, ajouter une seule ligne
    if (!member.paymentHistory || member.paymentHistory.length === 0) {
      flatData.push([...memberData, '', 'Aucun historique', '', '']);
    } else {
      // Pour le premier paiement, combiner avec les données du membre
      const firstPayment = member.paymentHistory[0];
      flatData.push([
        ...memberData,
        '',
        formatDate(firstPayment.date),
        firstPayment.amount,
        firstPayment.paymentMethod || 'N/A'
      ]);

      // Pour les paiements suivants, ajouter des lignes avec uniquement l'historique
      for (let i = 1; i < member.paymentHistory.length; i++) {
        const payment = member.paymentHistory[i];
        // Créer un tableau vide pour les colonnes des membres
        const emptyMemberData = Array(memberHeaders.length).fill('');
        flatData.push([
          ...emptyMemberData,
          '',
          formatDate(payment.date),
          payment.amount,
          payment.paymentMethod || 'N/A'
        ]);
      }
    }
  });

  // Convertir le tableau plat en feuille de calcul
  const worksheet = XLSX.utils.aoa_to_sheet(flatData);

  // Calculer les largeurs de colonnes automatiquement
  worksheet['!cols'] = calculateColumnWidths(flatData);

  // Ajouter la feuille au classeur
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Membres et Historique');

  // Générer le fichier Excel
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  saveExcelFile(excelBuffer, `members_data_${formattedDate}.xlsx`);
  hideLoading();
}

/**
 * Fonction pour sauvegarder le fichier Excel
 * @param {ArrayBuffer} buffer - Données du fichier Excel
 * @param {string} fileName - Nom du fichier
 */
function saveExcelFile(buffer, fileName) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  // Créer un lien pour télécharger le fichier
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;

  // Ajouter temporairement le lien au document et cliquer dessus
  document.body.appendChild(a);
  a.click();

  // Nettoyer
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

/**
 * Fonction utilitaire pour formater les dates
 * @param {string} dateString - Chaîne de date à formater
 * @return {string} - Date formatée
 */
function formatDate(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // Retourner la chaîne originale si la date est invalide

  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}

/**
 * Fonction pour afficher un indicateur de chargement amélioré
 * @param {string} message - Message à afficher
 */
function showLoading(message) {
  // Créer un élément de chargement s'il n'existe pas déjà
  if (!document.getElementById('loadingOverlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '9999';

    const loadingBox = document.createElement('div');
    loadingBox.style.backgroundColor = 'white';
    loadingBox.style.padding = '20px';
    loadingBox.style.borderRadius = '8px';
    loadingBox.style.textAlign = 'center';
    loadingBox.style.minWidth = '300px';

    const loadingMessage = document.createElement('p');
    loadingMessage.id = 'loadingMessage';
    loadingMessage.textContent = message || 'Chargement en cours...';

    // Ajouter une barre de progression
    const progressContainer = document.createElement('div');
    progressContainer.id = 'progressContainer';
    progressContainer.style.width = '100%';
    progressContainer.style.height = '10px';
    progressContainer.style.backgroundColor = '#f0f0f0';
    progressContainer.style.borderRadius = '5px';
    progressContainer.style.marginTop = '10px';
    progressContainer.style.overflow = 'hidden';
    progressContainer.style.display = 'none'; // Caché par défaut

    const progressBar = document.createElement('div');
    progressBar.id = 'progressBar';
    progressBar.style.width = '0%';
    progressBar.style.height = '100%';
    progressBar.style.backgroundColor = '#4CAF50';
    progressBar.style.transition = 'width 0.3s';

    progressContainer.appendChild(progressBar);
    loadingBox.appendChild(loadingMessage);
    loadingBox.appendChild(progressContainer);
    overlay.appendChild(loadingBox);
    document.body.appendChild(overlay);
  } else {
    document.getElementById('loadingMessage').textContent = message || 'Chargement en cours...';
    document.getElementById('loadingOverlay').style.display = 'flex';
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressContainer').style.display = 'none';
  }
}

/**
 * Met à jour la barre de progression
 * @param {number} percent - Pourcentage de progression (0-100)
 */
function updateProgressBar(percent) {
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');

  if (progressContainer && progressBar) {
    progressContainer.style.display = 'block';
    progressBar.style.width = `${percent}%`;
  }
}

/**
 * Fonction pour masquer l'indicateur de chargement
 */
function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}