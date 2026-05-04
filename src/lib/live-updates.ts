import { Capacitor } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'

export type DownloadedUpdate = {
  id: string
}

const ENABLE_LIVE_UPDATES =
  import.meta.env.VITE_ENABLE_LIVE_UPDATES === 'true'

const LIVE_UPDATE_CHANNEL =
  import.meta.env.VITE_LIVE_UPDATE_CHANNEL || 'production'

let updateCheck: Promise<DownloadedUpdate | null> | null = null

export const checkForLiveUpdate = async (): Promise<DownloadedUpdate | null> => {
  if (!ENABLE_LIVE_UPDATES || Capacitor.getPlatform() === 'web') {
    return null
  }

  if (updateCheck) {
    return updateCheck
  }

  updateCheck = (async () => {
    try {
      await CapacitorUpdater.notifyAppReady()
      await CapacitorUpdater.setChannel({ channel: LIVE_UPDATE_CHANNEL })

      const update = await CapacitorUpdater.download({
        channel: LIVE_UPDATE_CHANNEL,
      })

      const id = update?.bundle?.id
      return id ? { id } : null
    } catch (error) {
      console.warn('Live update check failed:', error)
      return null
    }
  })()

  return updateCheck
}

export const applyLiveUpdate = async (id: string) => {
  await CapacitorUpdater.set({ id })
  window.location.reload()
}
