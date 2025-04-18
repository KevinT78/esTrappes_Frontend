document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("newsContainer");
    const searchInput = document.getElementById("searchTerm");
    let newsList = [];
  
    // Fonction pour charger les actualités depuis l'API
    async function loadNewsFromAPI() {
      try {
        const response = await fetch("https://backendestrappes.fr/actualites/api/news?status=active");
        if (!response.ok) {
          throw new Error("Erreur lors de la récupération des actualités");
        }
        newsList = await response.json();
        displayNews(newsList);
      } catch (error) {
        console.error("Erreur:", error);
        container.innerHTML = "<p>Erreur lors du chargement des actualités. Veuillez réessayer plus tard.</p>";
      }
    }
  
    // Fonction pour afficher les actualités
    function displayNews(filteredNews) {
      container.innerHTML = "";
      if (filteredNews.length === 0) {
        container.innerHTML = "<p>Aucune actualité trouvée.</p>";
        return;
      }
  
      filteredNews.forEach((news) => {
        const col = document.createElement("div");
        col.className = "col-lg-4 col-md-6 col-12 mb-4 fadeIn";
  
        const card = document.createElement("div");
        card.className = "news-card shadow-sm card-3d";
  
        let mediaHTML = "";
        let isVideo = false;
        let isExternalLink = false;
        let videoId = null;
        let externalUrl = null;
  
        // Vérifier si nous avons une URL média
        if (news.mediaUrl) {
          // Vérifier si c'est une vidéo YouTube
          if (news.mediaUrl.includes("youtube.com") || news.mediaUrl.includes("youtu.be")) {
            isVideo = true;
            videoId = extractYouTubeId(news.mediaUrl);
            mediaHTML = `
              <div class="ratio ratio-16x9">
                  <iframe src="https://www.youtube.com/embed/${videoId}?controls=0" frameborder="0" allowfullscreen></iframe>
              </div>`;
          } else {
            // C'est une URL externe non-YouTube
            isExternalLink = true;
            externalUrl = news.mediaUrl;
  
            // Afficher l'image normalement
            if (news.image && news.image.data) {
              mediaHTML = `<img src="https://backendestrappes.fr/actualites/api/news/${news._id}/image" class="card-img-top" alt="Image">`;
            } else {
              mediaHTML = `<img src="./img/default-news.jpg" class="card-img-top" alt="Image par défaut">`;
            }
          }
        } else if (news.image && news.image.data) {
          mediaHTML = `<img src="https://backendestrappes.fr/actualites/api/news/${news._id}/image" class="card-img-top" alt="Image">`;
        } else {
          mediaHTML = `<img src="./img/default-news.jpg" class="card-img-top" alt="Image par défaut">`;
        }
  
        const date = news.createdAt ? new Date(news.createdAt).toLocaleDateString("fr-FR") : "";
        const hashtags = Array.isArray(news.hashtags) && news.hashtags.length > 0
          ? news.hashtags.map((tag) => `<span class="hashtag">#${tag}</span>`).join("")
          : "";
  
        card.innerHTML = `
          ${mediaHTML}
          <div class="card-content">
              <div class="card-title">${news.title}</div>
              <div class="card-description">${news.description}</div>
              <div class="card-hashtags">${hashtags}</div>
              <div class="card-date">${date}</div>
              ${isExternalLink ? '<div class="card-link mt-2"><small>(Cliquez pour plus d\'informations)</small></div>' : ""}
          </div>
        `;
  
        // Ajoute le comportement pour les vidéos YouTube
        if (isVideo && videoId) {
          card.style.cursor = "pointer";
          card.addEventListener("click", () => {
            const iframe = document.getElementById("modalVideoIframe");
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            const videoModal = new bootstrap.Modal(document.getElementById("videoModal"));
            videoModal.show();
  
            // Arrêter la vidéo quand on ferme la modale
            document.getElementById("videoModal").addEventListener("hidden.bs.modal", () => {
              iframe.src = "";
            });
          });
        }
        // Ajoute le comportement pour les liens externes
        else if (isExternalLink && externalUrl) {
          card.style.cursor = "pointer";
          card.addEventListener("click", () => {
            window.open(externalUrl, "_blank");
          });
        }
  
        col.appendChild(card);
        container.appendChild(col);
      });
  
      apply3DEffect();
    }
  
    // Appliquer l'effet 3D sur les cartes
    function apply3DEffect() {
      document.querySelectorAll(".card-3d").forEach((card) => {
        card.addEventListener("mousemove", (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = ((y - centerY) / centerY) * 10;
          const rotateY = ((x - centerX) / centerX) * -10;
          card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
  
        card.addEventListener("mouseleave", () => {
          card.style.transform = "rotateX(0) rotateY(0)";
        });
      });
    }
  
    // Filtrer les actualités selon la recherche
    function filterNews() {
      const searchValue = searchInput.value.toLowerCase();
      const filtered = newsList.filter((news) => 
        news.title.toLowerCase().includes(searchValue) || 
        news.description.toLowerCase().includes(searchValue) ||
        (Array.isArray(news.hashtags) && news.hashtags.some(tag => tag.toLowerCase().includes(searchValue)))
      );
      displayNews(filtered);
    }
  
    // Fonction pour extraire l'ID YouTube
    function extractYouTubeId(url) {
      const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = url.match(regex);
      return match ? match[1] : null;
    }
  
    // Chargement initial des actualités
    loadNewsFromAPI();
  
    // Écouter les changements dans la barre de recherche
    searchInput.addEventListener("input", filterNews);
  });