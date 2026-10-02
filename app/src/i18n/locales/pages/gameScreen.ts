const es = {
  title: 'Partida {n}',
  scoreboard: 'Tablero',
  meldThreshold: 'Mínimo para bajar',
  cleanOnlyNote: 'Con este mínimo solo se permiten bajadas limpias: sin comodines en tríos, salvo un juego limpio de 2s o de comodines.',
  pilonTriadoInfo: 'Sobre el pilón triado',
  pilonTriadoBody: 'El pilón se tría cuando alguien bota un mono (pato o comodín). Desde ese momento y hasta que alguien se lo lleve, hacen falta 3 cartas iguales a la botada: si botan un comodín, 3 comodines; si botan un pato, 3 patos; si botan una Q, 3 Q.',
  roundHistory: 'Historial de manos',
  noRounds: 'Todavía no se anotó ninguna mano.',
  addRound: 'Anotar mano',
  editRound: 'Editar mano',
  deleteRound: 'Eliminar mano',
  confirmDeleteRound: '¿Eliminar esta mano? Esta acción no se puede deshacer.',
  finished: 'Partida finalizada',
  winner: 'Gana {team}',
  nextGame: 'Siguiente partida',
  viewSummary: 'Ver resumen de la sesión',
}

const en: typeof es = {
  title: 'Game {n}',
  scoreboard: 'Scoreboard',
  meldThreshold: 'Minimum opening meld',
  cleanOnlyNote: 'At this threshold only clean melds are allowed: no wildcards in trios, except a clean run of 2s or of jokers.',
  pilonTriadoInfo: 'About the frozen pile',
  pilonTriadoBody: 'The pile freezes when someone discards a wildcard (deuce or joker). From then until someone takes it, you need 3 cards matching the discard: 3 jokers for a joker, 3 deuces for a deuce, 3 queens for a queen.',
  roundHistory: 'Round history',
  noRounds: 'No rounds have been recorded yet.',
  addRound: 'Record round',
  editRound: 'Edit round',
  deleteRound: 'Delete round',
  confirmDeleteRound: 'Delete this round? This cannot be undone.',
  finished: 'Game finished',
  winner: '{team} wins',
  nextGame: 'Next game',
  viewSummary: 'View session summary',
}

export default { es, en }
