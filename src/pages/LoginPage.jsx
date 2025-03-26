import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDraft } from '../context/DraftContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import ReCAPTCHA from 'react-google-recaptcha';
import { ref, get } from 'firebase/database';
import { database } from '../services/firebase';
import { saveDraftRole } from '../utils/draftRoleStorage';
import { Link } from 'react-router-dom';
import TiltCard from "../components/common/TiltCard";

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation()
  const { settings } = useSettings();
  const { user } = useAuth();
  const draftContext = useDraft();
  const [toastMessage, setToastMessage] = useState('');
  
  // State per il form di join
  const [draftCode, setDraftCode] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  // State per la creazione draft
  const [isCreating, setIsCreating] = useState(false);
  const [createdDraft, setCreatedDraft] = useState(null);
  
  // State per i form
  const [formValues, setFormValues] = useState({
    timePerPick: settings.timePerPick || 30,
    timePerBan: settings.timePerBan || 20,
    numberOfBans: settings.numberOfBans || 2,
    mirrorPicks: settings.mirrorPicks || false,
    teamBonusTime: settings.teamBonusTime || 20,
    blueTeamName: 'Blue Team',
    redTeamName: 'Red Team'
  });
  
  // State per captcha
  const [captchaVerified, setCaptchaVerified] = useState(false);
  
  // State per errori
  const [error, setError] = useState(null);
  
  // State per tab attivo
  const [activeTab, setActiveTab] = useState('join');

  // Gestore del captcha
  const handleCaptchaVerify = (token) => {
    setCaptchaVerified(!!token);
    setError(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    if (params.has('quick-access') && params.has('d') && params.has('r')) {
      const draftId = params.get('d');
      const accessCode = params.get('r');
      
      // Reindirizza alla rotta di quick-access
      navigate(`/?quick-access=true&d=${draftId}&r=${accessCode}`);
    }
  }, [location, navigate]);

  // Copia negli appunti
  const copyToClipboard = React.useCallback((text, successMessage) => {
    // Verifica preliminare
    if (!text || text.trim() === '') {
      console.error('Nessun testo da copiare');
      return;
    }

    // Usa direttamente l'API del clipboard
    navigator.clipboard.writeText(text)
      .then(() => {
        // Imposta immediatamente il messaggio
        setToastMessage(successMessage || 'Copiato!');
        
        // Cancella il messaggio dopo 3 secondi
        setTimeout(() => {
          setToastMessage('');
        }, 3000);
      })
      .catch(err => {
        console.error('Errore durante la copia:', err);
        
        // Metodo di fallback con execCommand
        try {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-9999px';
          document.body.appendChild(textArea);
          textArea.select();
          
          const successful = document.execCommand('copy');
          if (successful) {
            setToastMessage(successMessage || 'Copiato!');
            setTimeout(() => setToastMessage(''), 3000);
          } else {
            setToastMessage('Copia fallita');
            setTimeout(() => setToastMessage(''), 3000);
          }
          
          document.body.removeChild(textArea);
        } catch (fallbackErr) {
          console.error('Errore nel metodo di fallback:', fallbackErr);
          setToastMessage('Copia non supportata');
          setTimeout(() => setToastMessage(''), 3000);
        }
      });
  }, []); // Dipendenze vuote per evitare ri-creazioni non necessarie


  // Gestore del join draft
  const handleJoinDraft = async (e) => {
    e.preventDefault();
    
    if (!captchaVerified) {
      setError('Verifica di non essere un robot');
      return;
    }
    
    if (!draftCode) {
      setError('Inserisci il codice draft');
      return;
    }
    
    setIsJoining(true);
    setError(null);
    
    try {
      // Verifica esistenza draft
      const draftRef = ref(database, `drafts/${draftCode}`);
      const snapshot = await get(draftRef);
      
      if (!snapshot.exists()) {
        setError("Draft not found. Check the Draft Code.");
        setIsJoining(false);
        return;
      }
      
      // Determina il ruolo
      let role = 'spectator';
      if (accessCode) {
        if (accessCode.startsWith('AD')) role = 'admin';
        else if (accessCode.startsWith('BL')) role = 'blue';
        else if (accessCode.startsWith('RD')) role = 'red';
      }
      
      // Salva il codice di accesso
      if (accessCode) {
        sessionStorage.setItem('draftAccessCode', accessCode);
        saveDraftRole(draftCode, role, accessCode);
      }
      
      // Naviga al draft
      navigate(`/?d=${draftCode}`);
      
    } catch (error) {
      setError(`Errore durante l'accesso al draft: ${error.message}`);
      setIsJoining(false);
    }
  };

  // Gestore della creazione draft
  const handleCreateDraft = async () => {
    if (!captchaVerified) {
      setError('Verifica di non essere un robot');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    try {
      // Assicurati che i nomi dei team siano quelli inseriti dall'utente
      const blueTeamName = formValues.blueTeamName.trim() || 'Blue Team';
      const redTeamName = formValues.redTeamName.trim() || 'Red Team';
      
      //console.log("Creazione draft con nomi team:", { blueTeamName, redTeamName });
      
      // Crea il draft con i nomi dei team
      const draftDetails = await draftContext.createDraft(
        null, 
        blueTeamName, 
        redTeamName
      );
      
      // Assicurati che i nomi dei team siano correttamente salvati
      //console.log("Draft creato:", draftDetails);
      
      // Imposta i dettagli del draft creato
      setCreatedDraft({
        draftCode: draftDetails.draftCode,
        accessCodes: draftDetails.accessCodes,
        startingTeam: 'coinFlip',
        teamNames: {
          blue: blueTeamName, // Assicurati di usare i nomi originali
          red: redTeamName
        }
      });
      
    } catch (error) {
      setError(`Errore durante la creazione del draft: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };


  // Rendering della schermata di draft creato
  const renderCreatedDraftScreen = () => {
    if (!createdDraft) return null;

      // Add null checks for accessCodes
      const basePath = window.location.origin + window.location.pathname.replace(/\/+$/, '');

      const blueTeamLink = createdDraft.accessCodes?.blue 
        ? `${basePath}?quick-access&d=${createdDraft.draftCode}&r=${createdDraft.accessCodes.blue}` 
        : '#';
      const redTeamLink = createdDraft.accessCodes?.red 
        ? `${basePath}?quick-access&d=${createdDraft.draftCode}&r=${createdDraft.accessCodes.red}` 
        : '#';
      const adminLink = createdDraft.accessCodes?.admin 
        ? `${basePath}?quick-access&d=${createdDraft.draftCode}&r=${createdDraft.accessCodes.admin}` 
        : '#';
    
    return (
      <div className="login-card">
        <br></br>
            <button 
              className='predButton'
              onClick={() => window.location.href = '/'}
            >
              <span className="predButtonSpan">Create New</span>
            </button>
            <br></br>
        <h1 className="login-title createdLoginTitle mb-2">Draft Created Successfully!</h1>
        
        <div className="draft-code-info">
          <div className="code-box createdCodeBox">
            <h3>Draft Code</h3>
            <div className="code-value main-code pe-0">{createdDraft.draftCode}</div>
            <div className="code-note">
              Team Blue: {createdDraft.teamNames?.blue || 'Blue Team'}
              <br />
              Team Red: {createdDraft.teamNames?.red || 'Red Team'}
            </div>
          </div>
          
          <div className="access-codes createdAccessCodes">
          <div className="code-box blue-code createdCodeBox">
            <h3>Blue Team Code</h3> {createdDraft.teamNames?.blue || 'Blue Team'}
            <div className="code-value pe-0">
              {createdDraft.accessCodes?.blue}
              
            </div>
            <Link 
              to={blueTeamLink} 
              className="quick-access-link"
            >
              Join as Blue Team Captain
            </Link>
          </div>
          
          <div className="code-box red-code createdCodeBox">
            <h3>Red Team Code</h3> {createdDraft.teamNames?.red || 'Red Team'}
            <div className="code-value pe-0">
              {createdDraft.accessCodes?.red}
              
            </div>
            <Link 
              to={redTeamLink} 
              className="quick-access-link"
            >
              Join as Red Team Captain
            </Link>
          </div>
          
          <div className="code-box admin-code createdCodeBox">
            <h3>Admin Code</h3>
            <div className="code-value pe-0">
              {createdDraft.accessCodes?.admin}
             
            </div>
            <Link 
              to={adminLink} 
              className="quick-access-link"
            >
              Join as Admin
            </Link>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div 
            className="toast show position-fixed bottom-0 end-0 m-3 bg-success text-white" 
            role="alert"
          >
            <div className="toast-body">{toastMessage}</div>
          </div>
        )}
      <div className="">
            <button 
              className='submit-btn predButton'
              onClick={() => {
                sessionStorage.setItem('draftAccessCode', '');
                navigate(`/?d=${createdDraft.draftCode}`);
              }}
            >
              <span className="predButtonSpan">View as Spectator</span>
            </button>
            <br></br>
            <button 
                className='submit-btn predButton'
                onClick={() => {
                  sessionStorage.setItem('draftAccessCode', createdDraft.accessCodes?.admin);
                  // Salva i nomi dei team in sessionStorage per assicurarsi che siano disponibili nella pagina DraftPage
                  sessionStorage.setItem('teamNames', JSON.stringify({
                    blue: createdDraft.teamNames.blue,
                    red: createdDraft.teamNames.red
                  }));
                  navigate(`/?d=${createdDraft.draftCode}`);
                }}
              >
                <span className="predButtonSpan">View as Admin</span>
              </button>
          </div>
      </div>
      </div>
    );
  };

  // Se un draft è stato appena creato, mostra la schermata di creazione
  if (createdDraft) {
    return (
      <div className="login-container">
        {renderCreatedDraftScreen()}
      </div>
    );
  }

  // Rendering principale
  return (
    <div className="login-container">
      <div className="spriteWrapper">
        <img 
          className="loginDraftSprite" 
          src="/images/rotationSprite.webp" 
          alt="Draft Rotation Sprite" 
        />    
      </div>
      
      <div className="login-card">
        <h1 className="login-title">
          <img 
            className="login-logo" 
            src="/images/pred-draft.png" 
            alt="Draft Logo" 
          />
        </h1>
        
        <div className="mode-tabs">
          <button 
            className={`mode-tab predModeTabLeft ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            JOIN A DRAFT
          </button>
          <button 
            className={`mode-tab predModeTabRight ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            CREATE NEW DRAFT
          </button>
        </div>
        
        {activeTab === 'join' ? (
          <form onSubmit={handleJoinDraft} className="login-form">
            <div className="form-group">
              <label htmlFor="draftCode">Draft Code</label>
              <input
                type="text"
                id="draftCode"
                value={draftCode}
                onChange={(e) => setDraftCode(e.target.value.toUpperCase())}
                placeholder="Enter draft code"
                className="form-control predInputText"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="accessCode">Access Code (optional)</label>
              <input
                type="text"
                id="accessCode"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Admin/Team code"
                className="form-control predInputText"
              />
              <p className="form-help">
                Admin/Team codes determine your role in the draft. Leave it blank to log in as a spectator.
              </p>
            </div>
            
            <div className="captcha-container">
              <ReCAPTCHA
                sitekey="6Le0p-oqAAAAAKu_IiJqY9VGncAbu-nmhnAYM7vU"
                onChange={handleCaptchaVerify}
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button 
              type="submit" 
              className="submit-btn predButton"
              disabled={isJoining || !draftCode || !captchaVerified}
            >
              <span className="predButtonSpan">
                {isJoining ? 'JOINING...' : 'JOIN DRAFT'}
              </span>
            </button>
          </form>
        ) : (
          <div className="create-form">
            <div className="form-group">
              <label htmlFor="blueTeamName">Blue Team Name</label>
              <input
                type="text"
                id="blueTeamName"
                value={formValues.blueTeamName}
                onChange={(e) => setFormValues(prev => ({
                  ...prev,
                  blueTeamName: e.target.value
                }))}
                placeholder="Enter Blue Team name"
                className="form-control predInputText"
                maxLength={20}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="redTeamName">Red Team Name</label>
              <input
                type="text"
                id="redTeamName"
                value={formValues.redTeamName}
                onChange={(e) => setFormValues(prev => ({
                  ...prev,
                  redTeamName: e.target.value
                }))}
                placeholder="Enter Red Team name"
                className="form-control predInputText"
                maxLength={20}
              />
            </div>
            
            <div>
              <small class="text-white">
                Default settings: Coinf Flip, Pick Time 30 seconds, Ban Time 30 seconds, Bonus Time 30 seconds, No Mirror Picks, English language, 2 bans per team. 
              </small>
            </div>


            <div className="captcha-container">
              <ReCAPTCHA
                sitekey="6Le0p-oqAAAAAKu_IiJqY9VGncAbu-nmhnAYM7vU"
                onChange={handleCaptchaVerify}
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button 
              onClick={handleCreateDraft} 
              className="create-btn predButton"
              disabled={isCreating || !captchaVerified}
            >
              <span className="predButtonSpan">
                {isCreating ? 'CREATING...' : 'CREATE NEW DRAFT'}
              </span>
            </button>
          </div>
        )}
      </div>
      <div className="partnerSection">
        <a className="parazombiesLink" href="https://discord.gg/UdRNhCXwqK" target='_blank'>
        <span>Cerchi persone con cui giocare?<br />
        Entra nella nostra community!<br />
        <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" fill="currentColor" class="bi bi-discord" viewBox="0 0 16 16">
  <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
</svg>
        </span>
      <TiltCard />
      </a>
      </div>
    </div>
  );
};

export default LoginPage;