import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api', // Remplacez par l'URL de votre backend si différent
});

// Ajouter un intercepteur pour les requêtes (envoyer le token)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Ajouter un intercepteur pour les réponses (gérer les erreurs 401)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Si l'accès est non autorisé (token expiré ou invalide)
    if (error.response && error.response.status === 401) {
      // Optionnel: Gérer le rafraîchissement du token ici
      // Pour l'instant, on déconnecte l'utilisateur
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      // Rediriger vers la page de login seulement si on n'y est pas déjà
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
