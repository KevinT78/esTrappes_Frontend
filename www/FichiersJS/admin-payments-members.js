// ----------------------------
// FONCTIONS DE GESTION DES MODALS
// ----------------------------

function showConfirmReminderModal() {
  document.getElementById("confirmReminderModal").style.display = "block";
}

function closeConfirmReminderModal() {
  document.getElementById("confirmReminderModal").style.display = "none";
}

function confirmSendReminders() {
  closeConfirmReminderModal();
  sendPaymentReminders();
}

function closeConfirmAddLicenseCostModal() {
  document.getElementById("confirmAddLicenseCostModal").style.display = "none";
}

// ----------------------------
// VARIABLES GLOBALES
// ----------------------------

let allMembers = [];
let currentPage = 1;
const limit = 10; // Nombre d'éléments par page

// ----------------------------
// INITIALISATION ET ÉVÉNEMENTS
// ----------------------------

window.onload = function () {
  loadMembers();

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
};

// ----------------------------
// CHARGEMENT ET FILTRAGE DES DONNÉES
// ----------------------------

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

function applyFilters() {
  const searchQuery = document.getElementById("searchInput").value.trim().toLowerCase();
  const paymentStatus = document.getElementById("paymentStatusFilter").value;
  const category = document.getElementById("categoryFilter").value;
  const activeFilter = document.getElementById("activeFilter").value;

  // Filtrer les membres selon les critères
  let filteredMembers = allMembers.filter(member => {
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

  // Stocker le résultat filtré dans une variable globale
  window.filteredMembers = filteredMembers;

  const startIndex = (currentPage - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

  displayMembers(paginatedMembers);
  updatePaginationControls(filteredMembers.length);
}

let sortOrder = 'asc'; // Variable pour suivre l'ordre de tri

function toggleSort(field) {
  sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
  applyFilters();
}

// ----------------------------
// AFFICHAGE DES DONNÉES
// ----------------------------

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

// ----------------------------
// GESTION DE LA PAGINATION
// ----------------------------

function updatePaginationControls(filteredCount = null) {
  const pageInfo = document.getElementById("pageInfo");
  // Utilisez le nombre de membres filtrés plutôt que tous les membres
  const count = filteredCount !== null ? filteredCount : (window.filteredMembers ? window.filteredMembers.length : allMembers.length);
  const totalPages = Math.ceil(count / limit);

  // Assurer que currentPage ne dépasse pas le nombre total de pages
  if (currentPage > totalPages && totalPages > 0) {
    currentPage = totalPages;
  }

  pageInfo.innerHTML = `Page ${currentPage} sur ${totalPages}`;

  const paginationButtons = document.querySelectorAll(".pagination-controls .btn-secondary");
  paginationButtons[0].disabled = currentPage === 1; // First page
  paginationButtons[1].disabled = currentPage === 1; // Previous page
  paginationButtons[2].disabled = currentPage === totalPages || totalPages === 0; // Next page
  paginationButtons[3].disabled = currentPage === totalPages || totalPages === 0; // Last page
}

function firstPage() {
  currentPage = 1;
  applyFilters();
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    applyFilters();
  }
}

function nextPage() {
  const count = window.filteredMembers ? window.filteredMembers.length : allMembers.length;
  const totalPages = Math.ceil(count / limit);

  if (currentPage < totalPages) {
    currentPage++;
    applyFilters();
  }
}

function lastPage() {
  const count = window.filteredMembers ? window.filteredMembers.length : allMembers.length;
  currentPage = Math.ceil(count / limit);
  applyFilters();
}

// ----------------------------
// FORMATAGE DES DONNÉES
// ----------------------------

function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Les mois sont indexés à partir de 0
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// ----------------------------
// GESTION DES DÉTAILS D'UN MEMBRE
// ----------------------------

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

function closeModal() {
  document.getElementById("memberDetailsModal").style.display = "none";
}

// ----------------------------
// GESTION DES MODALS D'AJOUT DE MEMBRE
// ----------------------------

function showAddMemberModal() {
  document.getElementById("addMemberModal").style.display = "flex";
}

function closeAddMemberModal() {
  document.getElementById("addMemberModal").style.display = "none";
  document.getElementById("addMemberForm").reset();
}

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

// ----------------------------
// GESTION DES MODALS DE MODIFICATION DE MEMBRE
// ----------------------------

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

function closeEditMemberModal() {
  document.getElementById("editMemberModal").style.display = "none";
  document.getElementById("editMemberForm").reset();
}

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

// ----------------------------
// GESTION DE LA SUPPRESSION DE MEMBRE
// ----------------------------

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

// ----------------------------
// GESTION DES COÛTS SUPPLÉMENTAIRES
// ----------------------------

function showAdditionalCostModal(memberId) {
  document.getElementById("memberIdForCost").value = memberId;
  document.getElementById("additionalCostModal").style.display = "flex";
}

function closeAdditionalCostModal() {
  document.getElementById("additionalCostModal").style.display = "none";
  document.getElementById("additionalCostForm").reset();
}

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

// ----------------------------
// GESTION DES PAIEMENTS
// ----------------------------

function showPaymentModal(memberId) {
  document.getElementById("memberIdForPayment").value = memberId;
  document.getElementById("paymentModal").style.display = "flex";
}

function closePaymentModal() {
  document.getElementById("paymentModal").style.display = "none";
  document.getElementById("paymentForm").reset();
}

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

// ----------------------------
// GESTION DE L'IMPORTATION DES MEMBRES
// ----------------------------

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

// ----------------------------
// GESTION DES RAPPELS DE PAIEMENT
// ----------------------------

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

function closeReminderResultsModal() {
  document.getElementById("reminderResultsModal").style.display = "none";
}

// ----------------------------
// GESTION DE L'AJUSTEMENT DU COÛT DE LA LICENCE
// ----------------------------
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