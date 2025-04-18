// Fonction pour charger les inscriptions
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

// Fonction pour afficher les inscriptions dans le tableau
// function displayRegistrations(registrations) {
//   const tbody = document.getElementById("registrationsTableBody");
//   tbody.innerHTML = "";

//   registrations.forEach((registration) => {
//     const tr = document.createElement("tr");
//     tr.innerHTML = `
//       <td>${registration.lastName}</td>
//       <td>${registration.firstName}</td>
//       <td>${registration.typeInscription}</td>
//       <td>${registration.status}</td>
//       <td class="action-buttons">
//         <button class="btn btn-info details-btn" onclick="showDetails('${
//           registration._id
//         }')">Détails</button>
//         ${
//           registration.status === "attente"
//             ? `<button class="btn btn-success accept-btn" onclick="updateStatus('${registration._id}', 'accepté')">Accepter</button>
//              <button class="btn btn-danger reject-btn" onclick="updateStatus('${registration._id}', 'refusé')">Refuser</button>`
//             : registration.status === "refusé"
//             ? `<button class="btn btn-danger delete-btn" onclick="deleteRegistration('${registration._id}')">Supprimer</button>`
//             : ""
//         }
//       </td>
//     `;
//     tbody.appendChild(tr);
//   });
// }
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
      <td>${registration.paymentStatus}</td>
      <td class="action-buttons">
        <button class="btn btn-info details-btn" onclick="showDetails('${
          registration._id
        }')">Détails</button>
        ${
          registration.status === "attente"
            ? `<button class="btn btn-success accept-btn" onclick="updateStatus('${registration._id}', 'accepté')">Accepter</button>
             <button class="btn btn-danger reject-btn" onclick="updateStatus('${registration._id}', 'refusé')">Refuser</button>`
            : registration.status === "refusé"
            ? `<button class="btn btn-danger delete-btn" onclick="deleteRegistration('${registration._id}')">Supprimer</button>`
            : ""
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Fonction pour mettre à jour le statut d'une inscription
// async function updateStatus(id, newStatus) {
//   try {
//     if (newStatus === "accepté") {
//       if (!confirm("Accepter cette inscription ? Un email avec un lien de paiement sera envoyé à l'inscrit.")) {
//         return;
//       }
//     }

//     console.log(`Mise à jour du statut de l'inscription ID: ${id} vers ${newStatus}`);

//     const response = await fetch(`https://backendestrappes.fr/registration/${id}`, {
//       method: "PUT",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
//       },
//       body: JSON.stringify({ status: newStatus }),
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`Erreur lors de la mise à jour du statut: ${errorText}`);
//     }

//     if (newStatus === "accepté") {
//       const actionCell = document.querySelector(`button[onclick="updateStatus('${id}', 'accepté')"]`).closest('td');
//       const originalContent = actionCell.innerHTML;
//       actionCell.innerHTML = `<span class="spinner">Envoi du lien de paiement...</span>`;

//       try {
//         console.log(`Envoi du lien de paiement pour ID: ${id}`);
//         const paymentResponse = await fetch(`https://backendestrappes.fr/stripe/registration/${id}/payment-link`, {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
//           }
//         });

//         if (!paymentResponse.ok) {
//           const errorText = await paymentResponse.text();
//           throw new Error(`Erreur lors de l'envoi du lien de paiement: ${errorText}`);
//         }

//         const paymentData = await paymentResponse.json();
//         console.log("Lien de paiement envoyé avec succès:", paymentData);
//         alert(`Inscription acceptée et lien de paiement envoyé par email.`);
//       } catch (error) {
//         console.error("Erreur d'envoi du lien de paiement:", error);
//         alert(`L'inscription a été acceptée, mais il y a eu un problème lors de l'envoi du lien de paiement: ${error.message}`);
//       } finally {
//         await loadRegistrations();
//       }
//     } else {
//       await loadRegistrations();
//     }
//   } catch (error) {
//     console.error("Erreur:", error);
//     alert(error.message || "Une erreur est survenue");
//   }
// }
async function updateStatus(id, newStatus) {
  try {
    if (newStatus === "accepté") {
      if (!confirm("Accepter cette inscription ? Un email avec un lien de paiement sera envoyé à l'inscrit.")) {
        return;
      }
      
      // Afficher un indicateur de chargement
      const actionCell = document.querySelector(`button[onclick="updateStatus('${id}', 'accepté')"]`).closest('td');
      const originalContent = actionCell.innerHTML;
      actionCell.innerHTML = `<span class="spinner">Envoi du lien de paiement...</span>`;
      
      console.log(`Envoi du lien de paiement pour ID: ${id}`);
      
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

        const paymentData = await paymentResponse.json();
        console.log("Lien de paiement envoyé avec succès:", paymentData);
        
        // C'est seulement maintenant qu'on met à jour le statut vers "accepté"
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
        return; // Sortir de la fonction sans changement de statut
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


// Fonction pour supprimer une inscription
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

// Fonction pour afficher les détails d'une inscription
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
                        <div class="detail-value">${
                          registration.typeInscription
                        }</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Nom complet:</div>
                        <div class="detail-value">${registration.firstName} ${
      registration.lastName
    }</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Date de naissance:</div>
                        <div class="detail-value">${new Date(
                          registration.birthDate
                        ).toLocaleDateString()}</div>
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
                            ${registration.address.city}, ${
      registration.address.postalCode
    }
                        </div>
                    </div>
                    <div class="detail-row">
    <div class="detail-label">Documents:</div>
    <div class="detail-value">
        ${
          registration.documents.carteIdentite
            ? `<div><strong>Carte d'identité :</strong></div>
               ${
                 registration.documents.carteIdentite.startsWith(
                   "data:application/pdf;base64"
                 )
                   ? `<iframe class="document-pdf" src="${registration.documents.carteIdentite}" frameborder="0"></iframe>`
                   : `<img src="${registration.documents.carteIdentite}" class="document-image" alt="Carte d'identité">`
               }`
            : "Carte d'identité: Non fourni"
        }
        <br>
        ${
          registration.documents.justificatifDomicile
            ? `<div><strong>Justificatif de domicile  :</strong></div>
            ${
              registration.documents.justificatifDomicile.startsWith(
                "data:application/pdf;base64"
              )
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
                       registration.documents.certificatMedical.startsWith(
                         "data:application/pdf;base64"
                       )
                         ? `<iframe class="document-pdf" src="${registration.documents.certificatMedical}" frameborder="0"></iframe>`
                         : `<img src="${registration.documents.certificatMedical}" class="document-image" alt="Certificat médical">`
                     }`
            : "Certificat médical: Non fourni"
        }
    </div>
</div>
                    <div class="detail-row">
                        <div class="detail-label">Droit à l'image:</div>
                        <div class="detail-value">${
                          registration.droitImage
                        }</div>
                    </div>
                `;

    document.getElementById("detailsModal").style.display = "block";
  } catch (error) {
    console.error("Erreur:", error);
    alert("Erreur lors du chargement des détails");
  }
}

// Gestionnaire d'événements pour la fermeture du modal
document.querySelector(".close").addEventListener("click", () => {
  document.getElementById("detailsModal").style.display = "none";
});

// Gestionnaire d'événements pour les filtres
document
  .getElementById("statusFilter")
  .addEventListener("change", loadRegistrations);
document
  .getElementById("typeFilter")
  .addEventListener("change", loadRegistrations);

// Charger les inscriptions au chargement de la page
window.onload = loadRegistrations;
