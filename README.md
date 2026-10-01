# PDF Vault

Sito Node.js/Express per pubblicare PDF protetti.

## Avvio locale
1. Installa Node.js 20+.
2. Apri il terminale nella cartella del progetto.
3. Esegui `npm install`.
4. Imposta una password amministratore:
   - macOS/Linux: `ADMIN_PASSWORD="una-password-forte" npm start`
   - Windows PowerShell: `$env:ADMIN_PASSWORD="una-password-forte"; npm start`
5. Apri `http://localhost:3000`.

## Funzioni
- Login per accedere alla libreria.
- Area admin separata.
- Upload PDF fino a 50 MB.
- Password individuale per ogni PDF.
- Password memorizzate come hash bcrypt.
- I PDF non sono nella cartella pubblica.
- Il file viene servito solo dopo autenticazione e sblocco del documento.
- Eliminazione dei documenti dall'area admin.

## Pubblicazione online
Per renderlo accessibile da internet serve un hosting che esegua Node.js (ad esempio un VPS o una piattaforma Node) e HTTPS. Imposta sempre `ADMIN_PASSWORD` e `SESSION_SECRET` come variabili d'ambiente e non inserirle nel codice.

Nota: nessun sistema web può impedire a un utente autorizzato di fare screenshot o di salvare una copia del contenuto visualizzato.

## Versione GitHub da iPhone
Questa versione è appiattita apposta per permettere il caricamento dei file dal browser GitHub senza dover caricare cartelle.
