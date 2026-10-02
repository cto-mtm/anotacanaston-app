const es = {
  title: 'Ajustes',
  intro: 'Las reglas, penalidades y bonos pueden variar entre grupos de juego. Estos valores se usan en las partidas nuevas; las partidas ya creadas conservan sus reglas.',
  canastaValuesTitle: 'Valor de las canastas',
  bonusesTitle: 'Canastón y Súper Canastón',
  canastonThreshold: 'Canastas para Canastón',
  canastonBonus: 'Bono de Canastón',
  superCanastonThreshold: 'Canastas para Súper Canastón',
  superCanastonBonus: 'Bono de Súper Canastón',
  thresholdsInvalid: 'El Súper Canastón tiene que pedir más canastas que el Canastón.',
  gameTitle: 'Partida',
  penaltyValue: 'Puntos por penalidad (mal dada, bajarse mal, sugerir jugada)',
  gameTarget: 'Puntos para ganar la partida',
  sessionScoringTitle: 'Cómo se define el ganador',
  sessionScoring: {
    roundedThousands: {
      label: 'Redondeo al mil',
      body: 'Cada partida se redondea al mil más cercano (15.680 → 16, 14.300 → 14) y la diferencia (+2 / −2) se anota a cada jugador. Se suman las 3 vueltas.',
    },
    rawPoints: {
      label: 'Suma de puntos',
      body: 'Cada jugador suma los puntos de su equipo en todas las partidas.',
    },
  },
  restoreDefaults: 'Volver a la hoja de reglas',
  saved: 'Guardado',
}

// Typed against es: a missing or extra key here is a compile error.
const en: typeof es = {
  title: 'Settings',
  intro: 'Rules, penalties and bonuses vary between groups. These values apply to new sessions; existing sessions keep the rules they were created with.',
  canastaValuesTitle: 'Canasta values',
  bonusesTitle: 'Canastón and Super Canastón',
  canastonThreshold: 'Canastas for Canastón',
  canastonBonus: 'Canastón bonus',
  superCanastonThreshold: 'Canastas for Super Canastón',
  superCanastonBonus: 'Super Canastón bonus',
  thresholdsInvalid: 'Super Canastón must require more canastas than Canastón.',
  gameTitle: 'Game',
  penaltyValue: 'Points per penalty (misdeal, bad meld, suggesting a play)',
  gameTarget: 'Points to win a game',
  sessionScoringTitle: 'How the winner is decided',
  sessionScoring: {
    roundedThousands: {
      label: 'Rounded to thousands',
      body: 'Each game is rounded to the nearest thousand (15,680 → 16, 14,300 → 14) and the difference (+2 / −2) goes to each player. The 3 games are added up.',
    },
    rawPoints: {
      label: 'Total points',
      body: "Each player adds up their team's points across every game.",
    },
  },
  restoreDefaults: 'Reset to the rule sheet',
  saved: 'Saved',
}

export default { es, en }
