MOBA Draft System
Un sistema di draft per giochi MOBA implementato in React, una versione moderna e manutenibile del sistema originale in vanilla JavaScript.
Caratteristiche

Sistema di draft completo per giochi MOBA
Sequenza di pick e ban configurabile (1, 2, 3 o 4 ban)
Supporto per selezioni singole e multiple
Timer per ogni fase con autoselect allo scadere
Interfaccia per preview delle selezioni
Supporto multilingua (Inglese e Italiano)
Design responsive

Tecnologie utilizzate

React
Bootstrap 5
i18next per l'internazionalizzazione
FontAwesome per le icone

Installazione
bashCopy# Clona il repository
git clone https://github.com/tuousername/moba-draft.git

# Installa le dipendenze
cd moba-draft
npm install

# Avvia il server di sviluppo
npm start
Build
Per creare una versione ottimizzata per la produzione:
bashCopynpm run build
Questo comando creerà una versione produzione nella cartella build/. I file in questa cartella possono essere caricati direttamente su qualsiasi web server statico.
Configurazione
Campioni
Il sistema usa il file src/assets/ChampionsList.js per caricare i dati dei campioni. Questo file deve mantenere lo stesso formato del file originale.
Multilingua
Il sistema supporta l'italiano e l'inglese. Le traduzioni sono gestite attraverso i file JSON nella cartella public/locales/.
Struttura del progetto
Copymoba-draft/
├── public/                   # File statici
│   ├── locales/              # File di traduzione
│   └── images/               # Immagini dei campioni
├── src/
│   ├── assets/               # Asset del progetto
│   ├── components/           # Componenti React
│   ├── context/              # Context provider
│   ├── hooks/                # Custom React hooks
│   ├── pages/                # Pagine dell'applicazione
│   ├── styles/               # File CSS
│   ├── utils/                # Utility functions
│   ├── App.jsx               # Componente App principale
│   └── index.jsx             # Punto di ingresso
└── package.json              # Configurazione NPM
Estensione
Il sistema è stato progettato per essere facilmente estendibile:

Aggiungi nuovi campioni modificando il file ChampionsList.js
Aggiungi nuove lingue creando nuovi file di traduzione
Personalizza lo stile modificando i file CSS

Autori

Sparalo_ & DoctorColo - Creatori originali