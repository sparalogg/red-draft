import React, { useState } from "react";
import ChampionCard from "./ChampionCard";
import { useChampions } from "../../hooks/useChampions";
import { useDraft } from "../../context/DraftContext";
// import "./ChampionGrid.css"; // Importiamo gli stili per i filtri

const roles = {
  ADC: "adc",
  Jungle: "jungle",
  Offlane: "offlane",
  Support: "support",
  Midlane: "midlane",
};

const ChampionGrid = ({ canSelect = true }) => {
  const { champions, loading, error } = useChampions();
  const { state } = useDraft();
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [searchQuery, setSearchQuery] = useState(""); // Nuovo stato per la ricerca

  const isSpectator = state.userTeam === "spectator";

  // Funzione per attivare/disattivare i filtri
  const toggleRole = (role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  // Gestisce il cambiamento nel campo di ricerca
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Filtra i campioni in base ai ruoli selezionati E alla ricerca per nome
  const filteredChampions = (champions || []).filter((champion) => {
    // Filtra per ruolo se ci sono ruoli selezionati
    const matchesRole = selectedRoles.length
      ? (champion.roles || []).some((role) => selectedRoles.includes(role))
      : true;
    
    // Filtra per nome (case insensitive)
    const matchesSearch = searchQuery
      ? champion.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    // Ritorna true solo se corrisponde ad entrambi i filtri
    return matchesRole && matchesSearch;
  });

  if (loading) {
    return <div className="champions-grid-container">Loading...</div>;
  }

  if (error) {
    return <div className="champions-grid-container">Error: {error}</div>;
  }

  return (
    <div className="champions-grid-container">
      {/* Area filtri - visibile solo se non è in modalità spettatore */}
      {!isSpectator && (
        <div className="filter-area">
          {/* Pulsanti dei filtri */}
          <div className="filter-buttons">
            {/* Campo di ricerca (integrato nella stessa riga dei filtri) */}
            <div className="search-container">
              <input
                type="text"
                placeholder="Filter by name..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="search-input"
              />
            </div>
            
            {Object.entries(roles).map(([label, role]) => (
              <button
                key={role}
                className={`filter-btn ${selectedRoles.includes(role) ? "active" : ""}`}
                onClick={() => toggleRole(role)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Griglia dei campioni */}
      <div className={`champions-grid ${isSpectator ? "spectator-mode" : ""}`}>
        {filteredChampions.length > 0 ? (
          filteredChampions.map((champion) => (
            <ChampionCard key={champion.id} champion={champion} canSelect={canSelect} />
          ))
        ) : (
          <div className="find-no-results">Nessun campione trovato</div>
        )}
      </div>
    </div>
  );
};

export default ChampionGrid;