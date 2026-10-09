// DRAFT — describes what the app actually stores, but has not had a legal
// review. Add the operator's legal name and a contact address before launch.
const es = {
  title: 'Privacidad',
  updated: 'Borrador — última actualización: octubre de 2026',
  sections: {
    device: {
      title: 'Lo que se guarda en tu dispositivo',
      body: 'Tus partidas (fechas, nombres de jugadoras, puntajes) y tus ajustes se guardan en este dispositivo. Sin cuenta, nunca salen de él.',
    },
    account: {
      title: 'Si inicias sesión',
      body: 'Usamos tu cuenta de Google solo para identificarte: guardamos tu nombre, tu correo y un identificador de usuario.',
    },
    cloud: {
      title: 'Si tienes Club',
      body: 'Tus partidas y tus reglas de la casa se copian a nuestra base de datos en la nube (Google Firebase) para respaldarlas y sincronizarlas entre tus dispositivos. Solo tú puedes leerlas.',
    },
    payments: {
      title: 'Pagos',
      body: 'Los pagos los procesa Stripe. Nosotros no vemos ni guardamos los datos de tu tarjeta; solo sabemos si tu suscripción está activa.',
    },
    deletion: {
      title: 'Borrar tus datos',
      body: 'Desde Ajustes puedes eliminar tu cuenta: se cancela tu suscripción y se borran tu cuenta y tus partidas de la nube. Las partidas guardadas en tu dispositivo se borran desinstalando la app o limpiando los datos del navegador.',
    },
    sharing: {
      title: 'Lo que no hacemos',
      body: 'No vendemos tus datos ni los usamos para publicidad.',
    },
  },
}

// Typed against es: a missing or extra key here is a compile error.
const en: typeof es = {
  title: 'Privacy',
  updated: 'Draft — last updated: October 2026',
  sections: {
    device: {
      title: 'What is stored on your device',
      body: 'Your games (dates, player names, scores) and settings are stored on this device. Without an account, they never leave it.',
    },
    account: {
      title: 'If you sign in',
      body: 'We use your Google account only to identify you: we store your name, email and a user id.',
    },
    cloud: {
      title: 'If you have Club',
      body: 'Your games and house rules are copied to our cloud database (Google Firebase) to back them up and sync them across your devices. Only you can read them.',
    },
    payments: {
      title: 'Payments',
      body: "Payments are processed by Stripe. We never see or store your card details; we only know whether your subscription is active.",
    },
    deletion: {
      title: 'Deleting your data',
      body: 'You can delete your account from Settings: your subscription is canceled and your account and cloud games are deleted. Games stored on your device are removed by uninstalling the app or clearing browser data.',
    },
    sharing: {
      title: "What we don't do",
      body: "We don't sell your data or use it for advertising.",
    },
  },
}

export default { es, en }
