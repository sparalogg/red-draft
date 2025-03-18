import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const QueryParamRedirect = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Non è necessario fare nulla dato che ora usiamo direttamente i parametri di query
    // Questo componente potrebbe non essere più necessario
  }, [location, navigate]);

  return null;
};

export default QueryParamRedirect;