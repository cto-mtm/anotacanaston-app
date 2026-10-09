import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionsStore } from '../stores/sessions'
import { useSyncStore } from '../stores/sync'
import { deleteAccountAndSignOut, signOutCloud } from '../lib/auth'

/**
 * Sign-out and account deletion with the plan's explicit choices
 * (docs/plans/membership-and-storage.md §3): a member is asked whether to keep
 * a copy of their games on this device (default: keep), and warned when
 * changes haven't reached the server yet.
 */
export function useAccountActions() {
  const { t } = useI18n()
  const sessions = useSessionsStore()
  const sync = useSyncStore()
  const busy = ref(false)
  const error = ref<string | null>(null)

  /** null = the user cancelled. Only members have cloud games to keep. */
  function askKeepCopy(): boolean | null {
    if (!sessions.usingCloud) return false
    const unsaved = sync.saveState === 'saving' || sync.saveState === 'offline' || sync.saveState === 'error'
    if (unsaved && !confirm(t('account.unsavedWarning'))) return null
    return confirm(t('account.keepCopyQuestion', sessions.cloudSessions.length))
  }

  async function signOut() {
    const keepCopy = askKeepCopy()
    if (keepCopy === null) return
    busy.value = true
    error.value = null
    try {
      await signOutCloud({ keepCopy })
    } catch {
      error.value = t('account.signOutError')
    } finally {
      busy.value = false
    }
  }

  async function deleteAccount() {
    if (!confirm(t('account.deleteAccountConfirm'))) return
    const keepCopy = askKeepCopy()
    if (keepCopy === null) return
    busy.value = true
    error.value = null
    try {
      await deleteAccountAndSignOut({ keepCopy })
      alert(t('account.deleteAccountDone'))
    } catch {
      error.value = t('account.deleteAccountError')
    } finally {
      busy.value = false
    }
  }

  return { busy, error, signOut, deleteAccount }
}
