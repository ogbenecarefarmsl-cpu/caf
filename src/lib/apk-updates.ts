import { Capacitor } from '@capacitor/core'

export type ApkUpdate = {
  versionCode: number
  versionName: string
  downloadUrl: string
  releaseNotes?: string
  mandatory?: boolean
}

const DEFAULT_APK_MANIFEST_URL =
  'https://github.com/ogbenecarefarmsl-cpu/caf/releases/download/android-latest/apk-update.json'

const APK_UPDATE_MANIFEST_URL =
  import.meta.env.VITE_APK_UPDATE_MANIFEST_URL?.trim() ||
  DEFAULT_APK_MANIFEST_URL

const CURRENT_ANDROID_VERSION_CODE = Number(
  import.meta.env.VITE_ANDROID_VERSION_CODE || '1',
)

const isValidApkUpdate = (value: unknown): value is ApkUpdate => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<ApkUpdate>

  return (
    typeof candidate.versionCode === 'number' &&
    Number.isFinite(candidate.versionCode) &&
    typeof candidate.versionName === 'string' &&
    typeof candidate.downloadUrl === 'string' &&
    candidate.downloadUrl.startsWith('https://')
  )
}

export const checkForApkUpdate = async (): Promise<ApkUpdate | null> => {
  if (Capacitor.getPlatform() !== 'android') {
    return null
  }

  try {
    const response = await fetch(APK_UPDATE_MANIFEST_URL, {
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const manifest = (await response.json()) as unknown

    if (!isValidApkUpdate(manifest)) {
      console.warn('APK update manifest is invalid')
      return null
    }

    return manifest.versionCode > CURRENT_ANDROID_VERSION_CODE
      ? manifest
      : null
  } catch (error) {
    console.warn('APK update check failed:', error)
    return null
  }
}

export const openApkDownload = (downloadUrl: string) => {
  window.open(downloadUrl, '_system', 'noopener,noreferrer')
}
