/* Companion Club — translation tables (see js/i18n.js).
 * Each row: [English key, es-419, de-DE, fr-FR, pt-BR, it-IT]. en-GB uses the
 * en-US text (no spelling differences in these strings); es-ES and fr-CA list
 * only their differences from es-419 and fr-FR. "Companion Club", "StarHermit"
 * and the companions' names (Pip, Momo, Bramble, Lumi) stay as they are.
 */
(function (root) {
  'use strict';
  var ROWS = [
    // ---- title
    ['Guide clubhouse friends, serve their wishes, and keep every station tidy.', 'Guía a los amigos del club, cumple sus deseos y mantén ordenada cada estación.', 'Lenke die Freunde im Clubhaus, erfülle ihre Wünsche und halte jede Station ordentlich.', 'Guidez les amis du club, exaucez leurs souhaits et gardez chaque poste bien rangé.', 'Guie os amigos do clube, realize os desejos deles e mantenha cada estação arrumada.', 'Guida gli amici del club, esaudisci i loro desideri e tieni in ordine ogni postazione.'],
    ['Play', 'Jugar', 'Spielen', 'Jouer', 'Jogar', 'Gioca'],
    ['Settings', 'Configuración', 'Einstellungen', 'Paramètres', 'Configurações', 'Impostazioni'],
    // ---- game screen
    ['Clubhouse Day {n}', 'Día {n} en el club', 'Clubhaus-Tag {n}', 'Journée {n} au club', 'Dia {n} no clube', 'Giorno {n} al club'],
    ['Served {served} · Turns {turns} · Score {score}', 'Servidos {served} · Turnos {turns} · Puntos {score}', 'Erfüllt {served} · Züge {turns} · Punkte {score}', 'Servis {served} · Tours {turns} · Score {score}', 'Servidos {served} · Turnos {turns} · Pontos {score}', 'Serviti {served} · Turni {turns} · Punti {score}'],
    ['Friends', 'Amigos', 'Freunde', 'Amis', 'Amigos', 'Amici'],
    ['Move up', 'Mover arriba', 'Nach oben', 'Vers le haut', 'Mover para cima', 'Sposta su'],
    ['Move left', 'Mover a la izquierda', 'Nach links', 'Vers la gauche', 'Mover para a esquerda', 'Sposta a sinistra'],
    ['Move down', 'Mover abajo', 'Nach unten', 'Vers le bas', 'Mover para baixo', 'Sposta giù'],
    ['Move right', 'Mover a la derecha', 'Nach rechts', 'Vers la droite', 'Mover para a direita', 'Sposta a destra'],
    ['Serve wish', 'Cumplir deseo', 'Wunsch erfüllen', 'Exaucer le souhait', 'Realizar desejo', 'Esaudisci desiderio'],
    ['Tidy', 'Ordenar', 'Aufräumen', 'Ranger', 'Arrumar', 'Riordina'],
    ['Hint', 'Pista', 'Hinweis', 'Indice', 'Dica', 'Suggerimento'],
    ['Clubhouse floor', 'Planta del club', 'Clubhaus-Boden', 'Salle du club', 'Salão do clube', 'Sala del club'],
    ['Wants {activity} · {n} patience', 'Quiere {activity} · {n} de paciencia', 'Wünscht {activity} · {n} Geduld', 'Veut {activity} · {n} de patience', 'Quer {activity} · {n} de paciência', 'Vuole {activity} · {n} di pazienza'],
    ['Row {row}, column {col}: {label}', 'Fila {row}, columna {col}: {label}', 'Reihe {row}, Spalte {col}: {label}', 'Rangée {row}, colonne {col} : {label}', 'Linha {row}, coluna {col}: {label}', 'Riga {row}, colonna {col}: {label}'],
    ['{activity}, messy', '{activity}, desordenado', '{activity}, unordentlich', '{activity}, en désordre', '{activity}, bagunçado', '{activity}, in disordine'],
    ['{name} at {station}', '{name} en {station}', '{name} bei {station}', '{name} à {station}', '{name} em {station}', '{name} a {station}'],
    ['Wall', 'Pared', 'Wand', 'Mur', 'Parede', 'Muro'],
    ['Open floor', 'Suelo libre', 'Freie Fläche', 'Sol libre', 'Piso livre', 'Pavimento libero'],
    ['rest', 'descanso', 'Pause', 'repos', 'descanso', 'riposo'],
    ['Choose a friend and guide them toward the station matching their wish.', 'Elige a un amigo y guíalo hacia la estación que coincide con su deseo.', 'Wähle einen Freund und führe ihn zur Station, die zu seinem Wunsch passt.', 'Choisissez un ami et guidez-le vers le poste qui correspond à son souhait.', 'Escolha um amigo e guie-o até a estação do desejo dele.', 'Scegli un amico e guidalo verso la postazione del suo desiderio.'],
    ['{name} selected.', '{name} seleccionado.', '{name} ausgewählt.', '{name} sélectionné.', '{name} selecionado.', '{name} selezionato.'],
    ['No messy station is within reach.', 'No hay ninguna estación desordenada al alcance.', 'Keine unordentliche Station in Reichweite.', 'Aucun poste en désordre à portée.', 'Nenhuma estação bagunçada ao alcance.', 'Nessuna postazione in disordine a portata.'],
    ['No legal action is available.', 'No hay ninguna acción válida.', 'Keine gültige Aktion verfügbar.', 'Aucune action permise.', 'Nenhuma ação válida disponível.', 'Nessuna azione valida disponibile.'],
    ['Hint: {action} with {name}.', 'Pista: {action} con {name}.', 'Hinweis: {action} mit {name}.', 'Indice : {action} avec {name}.', 'Dica: {action} com {name}.', 'Suggerimento: {action} con {name}.'],
    ['up', 'arriba', 'nach oben', 'vers le haut', 'para cima', 'su'],
    ['down', 'abajo', 'nach unten', 'vers le bas', 'para baixo', 'giù'],
    ['left', 'a la izquierda', 'nach links', 'vers la gauche', 'para a esquerda', 'a sinistra'],
    ['right', 'a la derecha', 'nach rechts', 'vers la droite', 'para a direita', 'a destra'],
    ['move', 'mover', 'bewegen', 'déplacer', 'mover', 'sposta'],
    ['serve', 'cumplir', 'erfüllen', 'exaucer', 'realizar', 'esaudisci'],
    ['tidy', 'ordenar', 'aufräumen', 'ranger', 'arrumar', 'riordina'],
    ['messy', 'desorden', 'Unordnung', 'désordre', 'bagunça', 'disordine'],
    ['round', 'oleada', 'Welle', 'vague', 'rodada', 'ondata'],
    ['win', 'victoria', 'Sieg', 'victoire', 'vitória', 'vittoria'],
    ['lose', 'derrota', 'Niederlage', 'défaite', 'derrota', 'sconfitta'],
    ['wish expired', 'deseo vencido', 'Wunsch abgelaufen', 'souhait expiré', 'desejo expirado', 'desiderio scaduto'],
    ['wish new', 'nuevo deseo', 'neuer Wunsch', 'nouveau souhait', 'novo desejo', 'nuovo desiderio'],
    ['Turn complete', 'Turno completado', 'Zug beendet', 'Tour terminé', 'Turno concluído', 'Turno completato'],
    ['That action is unavailable.', 'Esa acción no está disponible.', 'Diese Aktion ist nicht verfügbar.', 'Cette action est indisponible.', 'Essa ação não está disponível.', 'Questa azione non è disponibile.'],
    ['Achievement unlocked: {names}', 'Logro desbloqueado: {names}', 'Erfolg freigeschaltet: {names}', 'Succès débloqué : {names}', 'Conquista desbloqueada: {names}', 'Obiettivo sbloccato: {names}'],
    // ---- rule refusals
    ['The club day is over.', 'El día en el club terminó.', 'Der Clubtag ist vorbei.', 'La journée au club est terminée.', 'O dia no clube acabou.', 'La giornata al club è finita.'],
    ['Unknown action.', 'Acción desconocida.', 'Unbekannte Aktion.', 'Action inconnue.', 'Ação desconhecida.', 'Azione sconosciuta.'],
    ['That action was not understood.', 'No se entendió esa acción.', 'Diese Aktion wurde nicht verstanden.', 'Cette action n’a pas été comprise.', 'Essa ação não foi entendida.', 'Azione non compresa.'],
    ['That friend is not in the club.', 'Ese amigo no está en el club.', 'Dieser Freund ist nicht im Club.', 'Cet ami n’est pas au club.', 'Esse amigo não está no clube.', 'Questo amico non è nel club.'],
    ['That is not a direction.', 'Esa no es una dirección.', 'Das ist keine Richtung.', 'Ce n’est pas une direction.', 'Isso não é uma direção.', 'Questa non è una direzione.'],
    ['That would leave the clubhouse.', 'Eso saldría del club.', 'Damit würde man das Clubhaus verlassen.', 'Cela sortirait du club.', 'Isso sairia do clube.', 'Così si uscirebbe dal club.'],
    ['Furniture blocks the way.', 'Un mueble bloquea el paso.', 'Möbel versperren den Weg.', 'Un meuble bloque le passage.', 'Um móvel bloqueia o caminho.', 'Un mobile blocca il passaggio.'],
    ['Another friend is standing there.', 'Otro amigo está ahí.', 'Dort steht schon ein anderer Freund.', 'Un autre ami s’y trouve déjà.', 'Outro amigo já está lá.', 'Lì c’è già un altro amico.'],
    ['This friend has no wish right now.', 'Este amigo no tiene ningún deseo ahora.', 'Dieser Freund hat gerade keinen Wunsch.', 'Cet ami n’a pas de souhait pour l’instant.', 'Este amigo não tem desejo agora.', 'Questo amico non ha desideri adesso.'],
    ['This station does not match the wish.', 'Esta estación no coincide con el deseo.', 'Diese Station passt nicht zum Wunsch.', 'Ce poste ne correspond pas au souhait.', 'Esta estação não corresponde ao desejo.', 'Questa postazione non corrisponde al desiderio.'],
    ['Tidy this station first.', 'Primero ordena esta estación.', 'Räum diese Station zuerst auf.', 'Rangez d’abord ce poste.', 'Arrume esta estação primeiro.', 'Riordina prima questa postazione.'],
    ['Stand on a station to serve.', 'Párate en una estación para cumplir el deseo.', 'Stell dich auf eine Station, um den Wunsch zu erfüllen.', 'Placez-vous sur un poste pour exaucer.', 'Fique sobre uma estação para realizar.', 'Mettiti su una postazione per esaudire.'],
    ['That station is already tidy.', 'Esa estación ya está ordenada.', 'Diese Station ist schon aufgeräumt.', 'Ce poste est déjà rangé.', 'Essa estação já está arrumada.', 'Questa postazione è già in ordine.'],
    ['That station is out of reach.', 'Esa estación está fuera de alcance.', 'Diese Station ist außer Reichweite.', 'Ce poste est hors de portée.', 'Essa estação está fora de alcance.', 'Questa postazione è fuori portata.'],
    // ---- results
    ['Every wish on the club list was fulfilled in time.', 'Se cumplieron a tiempo todos los deseos de la lista del club.', 'Jeder Wunsch auf der Clubliste wurde rechtzeitig erfüllt.', 'Chaque souhait de la liste du club a été exaucé à temps.', 'Todos os desejos da lista do clube foram realizados a tempo.', 'Ogni desiderio della lista del club è stato esaudito in tempo.'],
    ['Too many wishes expired and the club’s harmony broke.', 'Vencieron demasiados deseos y se rompió la armonía del club.', 'Zu viele Wünsche sind abgelaufen, und die Harmonie im Club ist zerbrochen.', 'Trop de souhaits ont expiré et l’harmonie du club s’est brisée.', 'Muitos desejos expiraram e a harmonia do clube se rompeu.', 'Troppi desideri sono scaduti e l’armonia del club si è spezzata.'],
    ['The day ended before the club goal was met.', 'El día terminó antes de alcanzar la meta del club.', 'Der Tag endete, bevor das Clubziel erreicht war.', 'La journée s’est terminée avant l’objectif du club.', 'O dia acabou antes de atingir a meta do clube.', 'La giornata è finita prima di raggiungere l’obiettivo del club.'],
    ['No legal actions remained.', 'No quedaban acciones válidas.', 'Es gab keine gültigen Aktionen mehr.', 'Il ne restait aucune action permise.', 'Não restavam ações válidas.', 'Non restavano azioni valide.'],
    ['The club day was given up early.', 'Se abandonó el día en el club antes de tiempo.', 'Der Clubtag wurde vorzeitig aufgegeben.', 'La journée au club a été abandonnée en cours.', 'O dia no clube foi abandonado antes da hora.', 'La giornata al club è stata abbandonata in anticipo.'],
    ['Serving', 'Deseos cumplidos', 'Erfüllte Wünsche', 'Souhaits exaucés', 'Desejos realizados', 'Desideri esauditi'],
    ['Patience bonus', 'Bonificación de paciencia', 'Geduldsbonus', 'Bonus de patience', 'Bônus de paciência', 'Bonus pazienza'],
    ['Together bonus', 'Bonificación en equipo', 'Gemeinsam-Bonus', 'Bonus d’équipe', 'Bônus em equipe', 'Bonus di squadra'],
    ['Streak bonus', 'Bonificación de racha', 'Serienbonus', 'Bonus de série', 'Bônus de sequência', 'Bonus serie'],
    ['Tidying', 'Orden', 'Aufräumen', 'Rangement', 'Arrumação', 'Riordino'],
    ['Wave bonus', 'Bonificación de oleada', 'Wellenbonus', 'Bonus de vague', 'Bônus de rodada', 'Bonus ondata'],
    ['Day bonus', 'Bonificación del día', 'Tagesbonus', 'Bonus de journée', 'Bônus do dia', 'Bonus giornata'],
    ['Mood bonus', 'Bonificación de ánimo', 'Stimmungsbonus', 'Bonus d’humeur', 'Bônus de humor', 'Bonus umore'],
    ['Club day complete!', '¡Día en el club completado!', 'Clubtag geschafft!', 'Journée au club réussie !', 'Dia no clube concluído!', 'Giornata al club completata!'],
    ['Club day ended', 'Terminó el día en el club', 'Clubtag beendet', 'Journée au club terminée', 'Dia no clube encerrado', 'Giornata al club finita'],
    ['Total', 'Total', 'Gesamt', 'Total', 'Total', 'Totale'],
    ['Play again', 'Jugar de nuevo', 'Nochmal spielen', 'Rejouer', 'Jogar de novo', 'Gioca ancora'],
    // ---- content: activities
    ['Snack', 'Merienda', 'Snack', 'Collation', 'Lanche', 'Merenda'],
    ['Paint', 'Pintura', 'Malen', 'Peinture', 'Pintura', 'Pittura'],
    ['Music', 'Música', 'Musik', 'Musique', 'Música', 'Musica'],
    ['Nap', 'Siesta', 'Nickerchen', 'Sieste', 'Soneca', 'Pisolino'],
    ['Garden', 'Jardín', 'Garten', 'Jardin', 'Jardim', 'Giardino'],
    ['Read', 'Lectura', 'Lesen', 'Lecture', 'Leitura', 'Lettura'],
    // ---- content: achievements
    ['First Wish', 'Primer deseo', 'Erster Wunsch', 'Premier souhait', 'Primeiro desejo', 'Primo desiderio'],
    ['Club Hero', 'Héroe del club', 'Clubheld', 'Héros du club', 'Herói do clube', 'Eroe del club'],
    ['On a Roll', 'En racha', 'Lauf', 'En pleine forme', 'Embalado', 'In serie'],
    ['Wish Veteran', 'Veterano de deseos', 'Wunschveteran', 'Vétéran des souhaits', 'Veterano dos desejos', 'Veterano dei desideri'],
    ['Half the Journey', 'Medio camino', 'Halbe Reise', 'Mi-parcours', 'Meio caminho', 'Metà percorso'],
    ['Star Member', 'Miembro estrella', 'Sternmitglied', 'Membre étoile', 'Membro estrela', 'Socio stella'],
    ['Regular', 'Habitual', 'Stammgast', 'Habitué', 'Frequentador', 'Habitué'],
    ['Interior Designer', 'Interiorista', 'Innenarchitekt', 'Décorateur', 'Designer de interiores', 'Arredatore'],
    ['Club Level 5', 'Club nivel 5', 'Clubstufe 5', 'Club niveau 5', 'Clube nível 5', 'Club livello 5'],
    ['Sparkling', 'Reluciente', 'Funkelnd', 'Étincelant', 'Brilhante', 'Scintillante'],
    // ---- content: journey intros
    ['Guide a companion with arrow keys or taps. Stand on a station and serve the matching wish.', 'Guía a un compañero con las flechas o tocando. Párate en una estación y cumple el deseo que coincida.', 'Lenke einen Freund mit den Pfeiltasten oder per Tippen. Stell dich auf eine Station und erfülle den passenden Wunsch.', 'Guidez un compagnon avec les flèches ou au toucher. Placez-vous sur un poste et exaucez le souhait correspondant.', 'Guie um companheiro com as setas ou tocando. Fique sobre uma estação e realize o desejo correspondente.', 'Guida un compagno con le frecce o con il tocco. Mettiti su una postazione ed esaudisci il desiderio corrispondente.'],
    ['A new station: the Drum Kit. Music wishes need it.', 'Una estación nueva: la batería. Los deseos de música la necesitan.', 'Eine neue Station: das Schlagzeug. Musikwünsche brauchen es.', 'Un nouveau poste : la batterie. Les souhaits de musique en ont besoin.', 'Uma nova estação: a bateria. Os desejos de música precisam dela.', 'Una nuova postazione: la batteria. I desideri di musica ne hanno bisogno.'],
    ['Furniture blocks the floor. Route around it.', 'Los muebles bloquean el suelo. Rodéalos.', 'Möbel versperren den Boden. Geh außen herum.', 'Des meubles encombrent la salle. Contournez-les.', 'Móveis bloqueiam o piso. Contorne-os.', 'I mobili bloccano il pavimento. Girateci intorno.'],
    ['A third companion joins. Wishes decay for everyone, every turn.', 'Se une un tercer compañero. Los deseos se desgastan para todos en cada turno.', 'Ein dritter Freund kommt dazu. Die Wünsche aller verblassen mit jedem Zug.', 'Un troisième compagnon arrive. Les souhaits de chacun s’épuisent à chaque tour.', 'Um terceiro companheiro chega. Os desejos de todos se desgastam a cada turno.', 'Arriva un terzo compagno. I desideri di tutti calano a ogni turno.'],
    ['A new station: the Beanbag. Some companions just want a nap.', 'Una estación nueva: el puf. Algunos compañeros solo quieren una siesta.', 'Eine neue Station: der Sitzsack. Manche Freunde wollen nur ein Nickerchen.', 'Un nouveau poste : le pouf. Certains compagnons veulent juste une sieste.', 'Uma nova estação: o pufe. Alguns companheiros só querem uma soneca.', 'Una nuova postazione: il pouf. Alcuni compagni vogliono solo un pisolino.'],
    ['Serve wishes back-to-back: streaks earn bonus sparkle.', 'Cumple deseos seguidos: las rachas dan brillo extra.', 'Erfülle Wünsche nacheinander: Serien bringen Bonus-Glitzer.', 'Exaucez les souhaits à la suite : les séries rapportent des paillettes bonus.', 'Realize desejos em sequência: sequências dão brilho extra.', 'Esaudisci desideri uno dopo l’altro: le serie danno scintille bonus.'],
    ['MASTERY: everything so far, tighter harmony.', 'MAESTRÍA: todo lo visto hasta ahora, con menos margen de armonía.', 'MEISTERSCHAFT: alles bisher, knappere Harmonie.', 'MAÎTRISE : tout ce qui précède, harmonie plus serrée.', 'MAESTRIA: tudo até aqui, com harmonia mais apertada.', 'MAESTRIA: tutto finora, armonia più stretta.'],
    ['Companions daydream longer after being served.', 'Los compañeros sueñan despiertos más tiempo después de ser atendidos.', 'Freunde träumen nach einem erfüllten Wunsch länger vor sich hin.', 'Les compagnons rêvassent plus longtemps après avoir été servis.', 'Os companheiros sonham acordados por mais tempo depois de atendidos.', 'I compagni fantasticano più a lungo dopo essere stati serviti.'],
    ['A new station: the Planter.', 'Una estación nueva: la jardinera.', 'Eine neue Station: der Pflanzkübel.', 'Un nouveau poste : la jardinière.', 'Uma nova estação: o canteiro.', 'Una nuova postazione: la fioriera.'],
    ['Wishes expire faster now. Prioritize the lowest patience.', 'Ahora los deseos vencen más rápido. Prioriza la paciencia más baja.', 'Wünsche laufen jetzt schneller ab. Kümmere dich zuerst um die geringste Geduld.', 'Les souhaits expirent plus vite. Priorisez la patience la plus basse.', 'Agora os desejos expiram mais rápido. Priorize a menor paciência.', 'Ora i desideri scadono prima. Dai priorità alla pazienza più bassa.'],
    ['A new station: the Bookcase. The full club set.', 'Una estación nueva: la librería. El club completo.', 'Eine neue Station: das Bücherregal. Der Club ist komplett.', 'Un nouveau poste : la bibliothèque. Le club au complet.', 'Uma nova estação: a estante. O clube completo.', 'Una nuova postazione: la libreria. Il club al completo.'],
    ['A fourth companion. Serve beside a friend for a together bonus.', 'Un cuarto compañero. Cumple deseos junto a un amigo para ganar una bonificación en equipo.', 'Ein vierter Freund. Erfülle Wünsche neben einem Freund für einen Gemeinsam-Bonus.', 'Un quatrième compagnon. Exaucez à côté d’un ami pour un bonus d’équipe.', 'Um quarto companheiro. Realize desejos ao lado de um amigo para um bônus em equipe.', 'Un quarto compagno. Esaudisci accanto a un amico per un bonus di squadra.'],
    ['MASTERY: only three misses allowed.', 'MAESTRÍA: solo se permiten tres fallos.', 'MEISTERSCHAFT: nur drei verpasste Wünsche erlaubt.', 'MAÎTRISE : seulement trois échecs permis.', 'MAESTRIA: só três falhas permitidas.', 'MAESTRIA: solo tre mancati consentiti.'],
    ['Two Snack Counters. Duplicates ease the rush.', 'Dos barras de merienda. Las repetidas alivian la prisa.', 'Zwei Snacktheken. Doppelte Stationen entschärfen den Andrang.', 'Deux comptoirs à collation. Les doublons allègent la cohue.', 'Dois balcões de lanche. Estações repetidas aliviam a correria.', 'Due banconi della merenda. I doppioni alleggeriscono la ressa.'],
    ['MASTERY: fifteen wishes, three misses.', 'MAESTRÍA: quince deseos, tres fallos.', 'MEISTERSCHAFT: fünfzehn Wünsche, drei Fehler.', 'MAÎTRISE : quinze souhaits, trois échecs.', 'MAESTRIA: quinze desejos, três falhas.', 'MAESTRIA: quindici desideri, tre mancati.'],
    ['Very short patience. Plan two wishes ahead.', 'Paciencia muy corta. Planifica dos deseos por adelantado.', 'Sehr wenig Geduld. Plane zwei Wünsche voraus.', 'Patience très courte. Anticipez deux souhaits.', 'Paciência muito curta. Planeje dois desejos à frente.', 'Pazienza molto breve. Pianifica due desideri in anticipo.'],
    ['A cramped room with sixteen wishes to fulfill.', 'Una sala estrecha con dieciséis deseos por cumplir.', 'Ein enger Raum mit sechzehn Wünschen.', 'Une pièce exiguë avec seize souhaits à exaucer.', 'Uma sala apertada com dezesseis desejos a realizar.', 'Una stanza angusta con sedici desideri da esaudire.'],
    ['Only two misses. Every route matters.', 'Solo dos fallos. Cada ruta cuenta.', 'Nur zwei Fehler. Jeder Weg zählt.', 'Seulement deux échecs. Chaque trajet compte.', 'Só duas falhas. Cada rota importa.', 'Solo due mancati. Ogni percorso conta.'],
    ['MASTERY: the definitive club day. Good luck.', 'MAESTRÍA: el día definitivo en el club. Buena suerte.', 'MEISTERSCHAFT: der ultimative Clubtag. Viel Glück.', 'MAÎTRISE : la journée au club ultime. Bonne chance.', 'MAESTRIA: o dia definitivo no clube. Boa sorte.', 'MAESTRIA: la giornata al club definitiva. Buona fortuna.']
  ];

  var COLS = ['es-419', 'de-DE', 'fr-FR', 'pt-BR', 'it-IT'];
  var T = { 'en-US': {}, 'en-GB': {} };
  COLS.forEach(function (loc) { T[loc] = {}; });
  ROWS.forEach(function (row) { COLS.forEach(function (loc, i) { T[loc][row[0]] = row[i + 1]; }); });

  T['es-ES'] = {
    'Snack': 'Merienda',
    'Settings': 'Ajustes',
    'Stand on a station to serve.': 'Ponte en una estación para cumplir el deseo.',
    'The club day is over.': 'El día en el club ha terminado.',
    'Club day ended': 'Ha terminado el día en el club',
    'No legal actions remained.': 'No quedaba ninguna acción válida.'
  };
  T['fr-CA'] = {
    'Served {served} · Turns {turns} · Score {score}': 'Servis {served} · Tours {turns} · Pointage {score}',
    'Snack': 'Collation'
  };

  root.CC_STRINGS = T;
})(typeof self !== 'undefined' ? self : this);
