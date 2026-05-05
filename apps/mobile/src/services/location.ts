import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { addDoc, collection } from 'firebase/firestore';

import { getDb } from './firebase';
import { addAlert } from './rules';

const TASK_NAME = 'KIDSAFE_BACKGROUND_LOCATION';

let _activeChildId: string | null = null;
let _geofences: Array<{ id: string; lat: number; lon: number; radiusM: number; name: string }> = [];

export const setActiveChildId = (id: string | null): void => {
  _activeChildId = id;
};

export const setGeofences = (
  fences: Array<{ id: string; lat: number; lon: number; radiusM: number; name: string }>,
): void => {
  _geofences = fences;
};

const distMeters = (a: { lat: number; lon: number }, b: { lat: number; lon: number }): number => {
  const R = 6371000;
  const toRad = (x: number): number => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

interface BgTaskData {
  locations: Location.LocationObject[];
}

interface BgTaskBody {
  data?: BgTaskData;
  error?: TaskManager.TaskManagerError | null;
}

const insideMap = new Map<string, boolean>();

TaskManager.defineTask(TASK_NAME, async (body: BgTaskBody) => {
  if (body.error) return;
  const locations = body.data?.locations ?? [];
  if (locations.length === 0 || !_activeChildId) return;
  const childId = _activeChildId;
  const last = locations[locations.length - 1];
  const ts = last.timestamp || Date.now();
  const lat = last.coords.latitude;
  const lon = last.coords.longitude;
  const accuracy = last.coords.accuracy ?? null;

  try {
    await addDoc(collection(getDb(), 'locations'), {
      childId,
      lat,
      lon,
      accuracy,
      ts,
    });
  } catch {
    // best-effort
  }

  // Geofence transitions
  for (const f of _geofences) {
    const inside = distMeters({ lat, lon }, { lat: f.lat, lon: f.lon }) <= f.radiusM;
    const wasInside = insideMap.get(f.id);
    if (wasInside !== undefined && wasInside !== inside) {
      try {
        await addAlert({
          childId,
          kind: 'geofence',
          title: inside ? `Entrée: ${f.name}` : `Sortie: ${f.name}`,
          description: `Position: ${lat.toFixed(5)}, ${lon.toFixed(5)}`,
          severity: 'warn',
          metadata: { geofenceId: f.id, lat, lon, inside },
        });
      } catch {
        // ignore
      }
    }
    insideMap.set(f.id, inside);
  }
});

export const requestLocationPermission = async (): Promise<{
  foreground: boolean;
  background: boolean;
}> => {
  const fg = await Location.requestForegroundPermissionsAsync();
  let bg = { status: 'denied' as Location.PermissionStatus };
  if (fg.status === 'granted') {
    bg = await Location.requestBackgroundPermissionsAsync();
  }
  return {
    foreground: fg.status === 'granted',
    background: bg.status === 'granted',
  };
};

export const startBackgroundTracking = async (childId: string): Promise<boolean> => {
  setActiveChildId(childId);
  const perms = await requestLocationPermission();
  if (!perms.foreground) return false;
  const already = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (already) return true;
  await Location.startLocationUpdatesAsync(TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 60_000,
    distanceInterval: 75,
    deferredUpdatesInterval: 60_000,
    foregroundService: {
      notificationTitle: 'KidSafe+ — Localisation',
      notificationBody: 'Votre famille suit votre position pour votre sécurité.',
      notificationColor: '#10B981',
    },
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });
  return true;
};

export const stopBackgroundTracking = async (): Promise<void> => {
  const reg = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (reg) await Location.stopLocationUpdatesAsync(TASK_NAME);
  setActiveChildId(null);
};

export const getCurrentPosition = async (): Promise<{
  lat: number;
  lon: number;
  accuracy: number | null;
} | null> => {
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    const req = await Location.requestForegroundPermissionsAsync();
    if (req.status !== 'granted') return null;
  }
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? null,
    };
  } catch {
    return null;
  }
};

export const writeLocationPing = async (
  childId: string,
  pos: { lat: number; lon: number; accuracy: number | null },
): Promise<void> => {
  try {
    await addDoc(collection(getDb(), 'locations'), {
      childId,
      lat: pos.lat,
      lon: pos.lon,
      accuracy: pos.accuracy,
      ts: Date.now(),
    });
  } catch {
    // best-effort
  }
};
