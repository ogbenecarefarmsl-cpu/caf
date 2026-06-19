import { Capacitor } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'

export type DownloadedUpdate = {
  id: string
  version: string
}

type LiveUpdateManifest = {
  version: string
  url: string
  releaseNotes?: string
  mandatory?: boolean
}

const ENABLE_LIVE_UPDATES =
  import.meta.env.VITE_ENABLE_LIVE_UPDATES === 'true'

const LIVE_UPDATE_CHANNEL =
  import.meta.env.VITE_LIVE_UPDATE_CHANNEL || 'production'

const DEFAULT_LIVE_UPDATE_MANIFEST_URL =
  'https://github.com/ogbenecarefarmsl-cpu/caf/releases/download/live-update/latest.json'

const LIVE_UPDATE_MANIFEST_URL =
  import.meta.env.VITE_LIVE_UPDATE_MANIFEST_URL?.trim() ||
  DEFAULT_LIVE_UPDATE_MANIFEST_URL

let updateCheck: Promise<DownloadedUpdate | null> | null = null
const APPLIED_LIVE_UPDATE_VERSION_KEY = 'caf-live-update-version'

const isValidManifest = (value: unknown): value is LiveUpdateManifest => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<LiveUpdateManifest>

  return (
    typeof candidate.version === 'string' &&
    candidate.version.trim().length > 0 &&
    typeof candidate.url === 'string' &&
    candidate.url.startsWith('https://')
  )
}

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

      const manifestResponse = await fetch(LIVE_UPDATE_MANIFEST_URL, {
        cache: 'no-store',
      })

      if (!manifestResponse.ok) {
        return null
      }

      const manifest = (await manifestResponse.json()) as unknown
      if (!isValidManifest(manifest)) {
        console.warn('Live update manifest is invalid')
        return null
      }

      if (localStorage.getItem(APPLIED_LIVE_UPDATE_VERSION_KEY) === manifest.version) {
        return null
      }

      const update = await CapacitorUpdater.download({
        version: manifest.version,
        url: manifest.url,
      })

      const id = update?.bundle?.id
      return id ? { id, version: manifest.version } : null
    } catch (error) {
      console.warn('Live update check failed:', error)
      return null
    }
  })()

  return updateCheck
}

export const applyLiveUpdate = async (id: string, version: string) => {
  await CapacitorUpdater.set({ id })
  localStorage.setItem(APPLIED_LIVE_UPDATE_VERSION_KEY, version)
  window.location.reload()
}
