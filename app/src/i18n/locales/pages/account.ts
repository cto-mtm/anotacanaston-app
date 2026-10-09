const es = {
  signIn: 'Iniciar sesión con Google',
  signingIn: 'Iniciando sesión…',
  signOut: 'Cerrar sesión',
  signInError: 'No se pudo iniciar sesión. Intenta de nuevo.',
  signOutError: 'No se pudo cerrar la sesión. Intenta de nuevo.',
  signedInAs: 'Conectada como {name}',
  keepCopyQuestion:
    '¿Dejar una copia de tu partida en este dispositivo? (Aceptar: dejar la copia · Cancelar: no dejar nada aquí. En tu cuenta queda guardada igual.) | ¿Dejar una copia de tus {count} partidas en este dispositivo? (Aceptar: dejar la copia · Cancelar: no dejar nada aquí. En tu cuenta quedan guardadas igual.)',
  unsavedWarning:
    'Hay cambios que todavía no llegaron a la nube (¿sin conexión?). Si sigues, esos cambios solo van a quedar en la copia de este dispositivo. ¿Seguir?',
  manageBilling: 'Gestionar suscripción',
  manageBillingError: 'No se pudo abrir la gestión de la suscripción. Intenta de nuevo.',
  deleteAccount: 'Eliminar mi cuenta',
  deleteAccountConfirm:
    'Se cancela tu suscripción y se borran tu cuenta y tus partidas de la nube. Después vas a poder elegir si dejar una copia en este dispositivo. ¿Eliminar tu cuenta?',
  deleteAccountDone: 'Tu cuenta fue eliminada.',
  deleteAccountError: 'No se pudo eliminar la cuenta. Intenta de nuevo.',
}

const en: typeof es = {
  signIn: 'Sign in with Google',
  signingIn: 'Signing in…',
  signOut: 'Sign out',
  signInError: "Couldn't sign in. Please try again.",
  signOutError: "Couldn't sign out. Please try again.",
  signedInAs: 'Signed in as {name}',
  keepCopyQuestion:
    'Keep a copy of your game on this device? (OK: keep the copy · Cancel: leave nothing here. It stays saved in your account either way.) | Keep a copy of your {count} games on this device? (OK: keep the copy · Cancel: leave nothing here. They stay saved in your account either way.)',
  unsavedWarning:
    "Some changes haven't reached the cloud yet (offline?). If you continue, they'll only be in this device's copy. Continue?",
  manageBilling: 'Manage subscription',
  manageBillingError: "Couldn't open subscription management. Please try again.",
  deleteAccount: 'Delete my account',
  deleteAccountConfirm:
    "Your subscription will be canceled and your account and cloud games deleted. You'll then choose whether to keep a copy on this device. Delete your account?",
  deleteAccountDone: 'Your account was deleted.',
  deleteAccountError: "Couldn't delete the account. Please try again.",
}

export default { es, en }
