import { v4 as uuidv4 } from 'uuid'
import type { Profile } from '../types'
import { supabase } from './supabase'

const DEVICE_ID_KEY = 'adoptatap_device_id'

/**
 * Returns the persistent anonymous device ID from localStorage,
 * generating and storing a new UUID if one doesn't exist yet.
 */
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId = uuidv4()
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  return deviceId
}

/**
 * Finds or creates the anonymous profile row for the current device.
 * Uses upsert so it's safe to call on every app boot.
 * Returns the resolved Profile.
 */
export async function getOrCreateProfile(): Promise<Profile> {
  const deviceId = getOrCreateDeviceId()

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        device_id: deviceId,
        display_name: 'Anonymous Guardian',
      },
      {
        onConflict: 'device_id',
        ignoreDuplicates: false, // merge so we always get the latest row back
      },
    )
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to resolve profile: ${error.message}`)
  }

  return data as Profile
}
