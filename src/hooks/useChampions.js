import { useState, useEffect } from 'react';

// Importiamo direttamente la variabile defaultChampionsFile
// Nota: Assicurati che il percorso sia corretto in base alla tua struttura
import { defaultChampionsFile } from '../ChampionsList';

/**
 * Custom hook to manage champions data
 */
export function useChampions() {
  const [champions, setChampions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load champions on mount
  useEffect(() => {
    try {
      // Se defaultChampionsFile è undefined, usa un array vuoto
      if (!defaultChampionsFile) {
        console.error('defaultChampionsFile is undefined');
        setChampions([{
          id: 'empty',
          name: 'Empty Champion',
          image: null,
          isReusable: true
        }]);
        setLoading(false);
        return;
      }

      // Parse the champions data from the string
      const parsedChampions = JSON.parse(defaultChampionsFile);

      // Add an empty champion at the beginning (can be selected multiple times)
      const championsWithEmpty = [
        ...parsedChampions,
        {
          id: 'empty',
          name: 'Empty Champion',
          image: null,
          isReusable: true
        }
      ];

      setChampions(championsWithEmpty);
      setLoading(false);
    } catch (err) {
      console.error('Error parsing champions:', err);
      setError('Failed to load champions data');
      setLoading(false);
      
      // Fallback con solo empty champion in caso di errore
      setChampions([{
        id: 'empty',
        name: 'Empty Champion',
        image: null,
        isReusable: true
      }]);
    }
  }, []);

  // Function to update champions (e.g. when loading a custom configuration)
  const updateChampions = (newChampionsData) => {
    try {
      // If it's a string, parse it
      const parsedData = typeof newChampionsData === 'string' 
        ? JSON.parse(newChampionsData) 
        : newChampionsData;

      // Always ensure we have the empty champion
      const existingEmptyChampion = parsedData.find(c => c.id === 'empty' || c.isReusable);
      
      let newChampions;
      if (existingEmptyChampion) {
        // Ensure the empty champion has the correct properties
        existingEmptyChampion.isReusable = true;
        newChampions = parsedData;
      } else {
        // Add the empty champion
        newChampions = [
          ...parsedData,
          {
            id: 'empty',
            name: 'Empty Champion',
            image: null,
            isReusable: true
          }
        ];
      }

      setChampions(newChampions);
      return true;
    } catch (err) {
      console.error('Error updating champions:', err);
      setError('Failed to update champions data');
      return false;
    }
  };

  return {
    champions,
    loading,
    error,
    updateChampions
  };
}