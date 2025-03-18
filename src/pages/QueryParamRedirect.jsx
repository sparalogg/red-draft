import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const QueryParamRedirect = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Ottieni i parametri dalla query string
    const params = new URLSearchParams(location.search);
    
    // Verifica se sono presenti i parametri di quick-access
    if (params.has('quick-access') && params.has('d') && params.has('r')) {
      const draftId = params.get('d');
      const accessCode = params.get('r');
      
      // Reindirizza alla rotta di quick-access
      navigate(`/quick-access/${draftId}/${accessCode}`);
    } else {
      // Se non ci sono i parametri necessari, vai alla pagina principale
      navigate('/');
    }
  }, [location, navigate]);

  // Mostra un loader durante il redirect
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Redirecting...</p>
    </div>
  );
};

export default QueryParamRedirect;