import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';

const Instructions = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef(null);
  
  // Funzione di fallback per gestire casi inattesi
  const getSafeSteps = (key) => {
    try {
      const steps = t(key, { returnObjects: true });
      return Array.isArray(steps) ? steps : 
             typeof steps === 'string' ? [steps] : [];
    } catch (error) {
      console.error('Errore nel recuperare i passaggi:', error);
      return [];
    }
  };
  
  // Funzione per gestire in modo sicuro l'array di traduzioni
  const getSteps = (key) => {
    try {
      const steps = t(key, { returnObjects: true });
      return Array.isArray(steps) ? steps : [];
    } catch (error) {
      console.error('Errore nel recuperare i passaggi:', error);
      return [];
    }
  };

  const toggleInstructions = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    
    // Se stiamo espandendo, scorriamo verso il contenuto dopo un breve ritardo
    // per dare il tempo all'animazione di iniziare
    if (newExpandedState) {
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 100);
    }
  };
  
  return (
    <div className="instructions-wrapper mt-4">
      <div className="d-flex justify-content-end mb-2">
        <div 
          className="instructions-toggle cursor-pointer"
          onClick={toggleInstructions}
        >
          <span className="text-warning btn-draft">
            <i className="fa-solid fa-circle-info"></i>Show  {t('instruction.title')} {isExpanded ? '▲' : '▼'}
          </span>
        </div>
      </div>
      
      <div 
        ref={contentRef}
        className={`instructions-content overflow-hidden ${isExpanded ? 'expanded' : 'collapsed'}`}
        style={{
          maxHeight: isExpanded ? '2000px' : '0',
          opacity: isExpanded ? '1' : '0',
          transition: 'max-height 0.5s ease-in-out, opacity 0.4s ease-in-out',
        }}
      >
        <div className="instructions-container bg-dark bg-opacity-70 p-4 mt-2 rounded-3">
          <div className="row">
            {/* Draft sequence based on number of bans */}
            <div className="col-md-3">
              <h5 className="text-primary">
                {t(`instruction.draftSequence.${settings.numberOfBans}ban.title`)}
              </h5>
              <ol className="text-light">
                {getSteps(`instruction.draftSequence.${settings.numberOfBans}ban.steps`).map((step, index) => (
                  <li key={index}><strong>{step}</strong></li>
                ))}
              </ol>
            </div>
            
            {/* Multiple sequences for other ban options */}
            {settings.numberOfBans !== 1 && (
              <div className="col-md-3">
                <h5 className="text-primary">
                  {t('instruction.draftSequence.1ban.title')}
                </h5>
                <ol className="text-light">
                  {getSteps('instruction.draftSequence.1ban.steps').map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
            
            {settings.numberOfBans !== 2 && settings.numberOfBans !== 1 && (
              <div className="col-md-3">
                <h5 className="text-primary">
                  {t('instruction.draftSequence.2ban.title')}
                </h5>
                <ol className="text-light">
                  {getSteps('instruction.draftSequence.2ban.steps').map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
            
            {settings.numberOfBans !== 3 && settings.numberOfBans !== 1 && (
              <div className="col-md-3">
                <h5 className="text-primary">
                  {t('instruction.draftSequence.3ban.title')}
                </h5>
                <ol className="text-light">
                  {getSteps('instruction.draftSequence.3ban.steps').map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
            
            {/* Special features */}
            <div className="col-md-3">
              <h5 className="text-primary">{t('instruction.specialFeatures.title')}</h5>
              <ul className="text-light">
                {t('instruction.specialFeatures.features', { returnObjects: true }).map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Footer */}
          <div className="text-light text-center mt-3">
            {t('instruction.footer')} <i className="fa-solid fa-copyright"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Instructions;