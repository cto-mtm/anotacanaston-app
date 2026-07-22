const es = {
  title: 'Partida {n}',
  scoreboard: 'Tablero',
  meldThreshold: 'Mínimo para bajar',
  cleanOnlyNote: 'Con este mínimo solo se permiten bajadas limpias: sin comodines en tríos, salvo un juego limpio de 2s o de comodines.',
  pilonTriadoInfo: 'Sobre el pilón triado',
  pilonTriadoBody: 'Si se tira un pato o un comodín al pilón, el mazo queda triado y solo se puede levantar con un trío natural, no con una pareja. Los patos y comodines no se pueden usar para levantar el pilón.',
  roundHistory: 'Historial de manos',
  noRounds: 'Todavía no se anotó ninguna mano.',
  addRound: 'Anotar mano',
  editRound: 'Editar mano',
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
  pilonTriadoBody: "If a deuce or a joker is thrown into the discard pile, it freezes and can only be picked up with a natural trio, not a pair. Deuces and jokers can't be used to pick up the pile.",
  roundHistory: 'Round history',
  noRounds: 'No rounds have been recorded yet.',
  addRound: 'Record round',
  editRound: 'Edit round',
  finished: 'Game finished',
  winner: '{team} wins',
  nextGame: 'Next game',
  viewSummary: 'View session summary',
}

export default { es, en }
