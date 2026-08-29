const es = {
  mano: 'Mano',
  dealer: 'Reparte',
  exactCut: 'Corte exacto',
  misdeal: 'Mal dada',
  honors: 'Honores',
  goingOut: 'La ida',
  blackThreesBonus: 'Las 6 tapas negras de una vez',
  meldedPoints: 'Puntos bajados',
  handPoints: 'Puntos en mano',
  pilonTriado: 'Pilón triado',
  wentOut: 'Cerró la mano',
  canastas: 'Canastas',
  countBonus: 'Bono por cantidad',
  canastaType: {
    clean: 'Limpia',
    dirty: 'Sucia',
    cleanAce: 'Limpia de ases',
    dirtyAce: 'Sucia de ases',
    cleanDeuce: 'Canastón de patos (limpia)',
    dirtyDeuce: 'Canastón de patos (sucia)',
    joker: 'Canastón de comodines',
    monkey: 'Canastón de mono',
  },
  team: {
    A: 'Equipo A',
    B: 'Equipo B',
    C: 'Equipo C',
  },
  playerCount: {
    4: '4 jugadores',
    6: '6 jugadores',
  },
  sixPlayerFormat: {
    '2x3': '2 equipos de 3',
    '3x2': '3 equipos de 2',
  },
}

// Typed against es: a missing or extra key here is a compile error.
const en: typeof es = {
  mano: 'Lead (mano)',
  dealer: 'Dealer',
  exactCut: 'Exact cut',
  misdeal: 'Misdeal',
  honors: 'Honors',
  goingOut: 'Going out (la ida)',
  blackThreesBonus: 'All 6 black threes at once',
  meldedPoints: 'Melded points',
  handPoints: 'Hand points',
  pilonTriado: 'Frozen pile (pilón triado)',
  wentOut: 'Closed the round',
  canastas: 'Canastas',
  countBonus: 'Count bonus',
  canastaType: {
    clean: 'Clean',
    dirty: 'Dirty',
    cleanAce: 'Clean aces',
    dirtyAce: 'Dirty aces',
    cleanDeuce: 'Clean deuces canasta',
    dirtyDeuce: 'Dirty deuces canasta',
    joker: 'Joker canasta',
    monkey: 'Monkey canasta',
  },
  team: {
    A: 'Team A',
    B: 'Team B',
    C: 'Team C',
  },
  playerCount: {
    4: '4 players',
    6: '6 players',
  },
  sixPlayerFormat: {
    '2x3': '2 teams of 3',
    '3x2': '3 teams of 2',
  },
}

export default { es, en }
