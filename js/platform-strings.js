/* Companion Club — the account and leaderboard lines (the title screen's
 * account line, Sign in, Invite and the results card's leaderboard line) in
 * the nine locales, as the browser build's js/main.js held them (PT).
 * Classic script / CommonJS: global CCPlatformStrings = { platformStrings(lang), fmtPlatform(s, vars) }.
 */
(function (root) {
  'use strict';
  var TABLE = {
    'en-US': {
      offline: "Offline — progress is stored on this device.",
      playing: "Playing as {name}",
      synced: "progress synced",
      saving: "saving…",
      nosync: "cloud sync unavailable",
      signIn: "Sign in with StarHermit",
      invite: "Invite a friend",
      copied: "Invite link copied to the clipboard.",
      copyFail: "Could not copy — invite link: {link}",
      lbPosting: "Posting score to the leaderboard…",
      lbRank: "Leaderboard rank: #{rank}",
      lbPosted: "Score posted to the leaderboard.",
      lbFailed: "Score not posted to the leaderboard."
    },
    'en-GB': {
      offline: "Offline — progress is stored on this device.",
      playing: "Playing as {name}",
      synced: "progress synced",
      saving: "saving…",
      nosync: "cloud sync unavailable",
      signIn: "Sign in with StarHermit",
      invite: "Invite a friend",
      copied: "Invite link copied to the clipboard.",
      copyFail: "Could not copy — invite link: {link}",
      lbPosting: "Posting score to the leaderboard…",
      lbRank: "Leaderboard rank: #{rank}",
      lbPosted: "Score posted to the leaderboard.",
      lbFailed: "Score not posted to the leaderboard."
    },
    'es-419': {
      offline: "Sin conexión: el progreso se guarda en este dispositivo.",
      playing: "Jugando como {name}",
      synced: "progreso sincronizado",
      saving: "guardando…",
      nosync: "sincronización en la nube no disponible",
      signIn: "Iniciar sesión con StarHermit",
      invite: "Invitar a un amigo",
      copied: "Enlace de invitación copiado al portapapeles.",
      copyFail: "No se pudo copiar. Enlace de invitación: {link}",
      lbPosting: "Publicando la puntuación en la clasificación…",
      lbRank: "Puesto en la clasificación: #{rank}",
      lbPosted: "Puntuación publicada en la clasificación.",
      lbFailed: "No se publicó la puntuación en la clasificación."
    },
    'es-ES': {
      offline: "Sin conexión: el progreso se guarda en este dispositivo.",
      playing: "Jugando como {name}",
      synced: "progreso sincronizado",
      saving: "guardando…",
      nosync: "sincronización en la nube no disponible",
      signIn: "Iniciar sesión con StarHermit",
      invite: "Invitar a un amigo",
      copied: "Enlace de invitación copiado al portapapeles.",
      copyFail: "No se ha podido copiar. Enlace de invitación: {link}",
      lbPosting: "Publicando la puntuación en la clasificación…",
      lbRank: "Puesto en la clasificación: #{rank}",
      lbPosted: "Puntuación publicada en la clasificación.",
      lbFailed: "No se ha publicado la puntuación en la clasificación."
    },
    'de-DE': {
      offline: "Offline – der Fortschritt wird auf diesem Gerät gespeichert.",
      playing: "Du spielst als {name}",
      synced: "Fortschritt synchronisiert",
      saving: "wird gespeichert…",
      nosync: "Cloud-Synchronisierung nicht verfügbar",
      signIn: "Mit StarHermit anmelden",
      invite: "Freund einladen",
      copied: "Einladungslink in die Zwischenablage kopiert.",
      copyFail: "Kopieren fehlgeschlagen – Einladungslink: {link}",
      lbPosting: "Punktzahl wird in die Bestenliste eingetragen…",
      lbRank: "Platz in der Bestenliste: #{rank}",
      lbPosted: "Punktzahl in die Bestenliste eingetragen.",
      lbFailed: "Punktzahl nicht in die Bestenliste eingetragen."
    },
    'fr-FR': {
      offline: "Hors ligne : la progression est enregistrée sur cet appareil.",
      playing: "Vous jouez en tant que {name}",
      synced: "progression synchronisée",
      saving: "enregistrement…",
      nosync: "synchronisation cloud indisponible",
      signIn: "Se connecter avec StarHermit",
      invite: "Inviter un ami",
      copied: "Lien d’invitation copié dans le presse-papiers.",
      copyFail: "Copie impossible — lien d’invitation : {link}",
      lbPosting: "Envoi du score au classement…",
      lbRank: "Rang au classement : #{rank}",
      lbPosted: "Score envoyé au classement.",
      lbFailed: "Score non envoyé au classement."
    },
    'fr-CA': {
      offline: "Hors ligne : la progression est enregistrée sur cet appareil.",
      playing: "Vous jouez en tant que {name}",
      synced: "progression synchronisée",
      saving: "enregistrement…",
      nosync: "synchronisation infonuagique non disponible",
      signIn: "Se connecter avec StarHermit",
      invite: "Inviter un ami",
      copied: "Lien d’invitation copié dans le presse-papiers.",
      copyFail: "Copie impossible — lien d’invitation : {link}",
      lbPosting: "Envoi du pointage au classement…",
      lbRank: "Rang au classement : #{rank}",
      lbPosted: "Pointage envoyé au classement.",
      lbFailed: "Pointage non envoyé au classement."
    },
    'pt-BR': {
      offline: "Offline — o progresso fica salvo neste dispositivo.",
      playing: "Jogando como {name}",
      synced: "progresso sincronizado",
      saving: "salvando…",
      nosync: "sincronização na nuvem indisponível",
      signIn: "Entrar com StarHermit",
      invite: "Convidar um amigo",
      copied: "Link de convite copiado para a área de transferência.",
      copyFail: "Não foi possível copiar — link de convite: {link}",
      lbPosting: "Enviando a pontuação para o ranking…",
      lbRank: "Posição no ranking: #{rank}",
      lbPosted: "Pontuação enviada para o ranking.",
      lbFailed: "Pontuação não enviada para o ranking."
    },
    'it-IT': {
      offline: "Offline: i progressi sono salvati su questo dispositivo.",
      playing: "Giochi come {name}",
      synced: "progressi sincronizzati",
      saving: "salvataggio…",
      nosync: "sincronizzazione cloud non disponibile",
      signIn: "Accedi con StarHermit",
      invite: "Invita un amico",
      copied: "Link di invito copiato negli appunti.",
      copyFail: "Impossibile copiare. Link di invito: {link}",
      lbPosting: "Invio del punteggio alla classifica…",
      lbRank: "Posizione in classifica: #{rank}",
      lbPosted: "Punteggio inviato alla classifica.",
      lbFailed: "Punteggio non inviato alla classifica."
    }
  };
  /** The table for a locale (en-US when it has none). */
  function platformStrings(lang) { return TABLE[lang] || TABLE['en-US']; }
  /** {name} placeholders filled from vars. */
  function fmtPlatform(s, vars) {
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars && k in vars ? String(vars[k]) : m; });
  }
  var api = { platformStrings: platformStrings, fmtPlatform: fmtPlatform, LOCALES: Object.keys(TABLE) };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CCPlatformStrings = api;
})(typeof self !== 'undefined' ? self : globalThis);
