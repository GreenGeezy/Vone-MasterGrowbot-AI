export type GrowEnvironment = 'Indoor' | 'Outdoor' | 'Greenhouse';
export interface PlantHealthSettings { strain: string; growMethod: GrowEnvironment }
const KEY = 'mg_plant_health_settings_v1';
const environments: GrowEnvironment[] = ['Indoor', 'Outdoor', 'Greenhouse'];

export function readPlantHealthSettings(defaultEnvironment?: GrowEnvironment): PlantHealthSettings {
  const fallback: PlantHealthSettings = { strain: 'Generic', growMethod: defaultEnvironment || 'Indoor' };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    return {
      strain: typeof saved?.strain === 'string' && saved.strain.trim() ? saved.strain.trim().slice(0, 120) : fallback.strain,
      growMethod: environments.includes(saved?.growMethod) ? saved.growMethod : fallback.growMethod,
    };
  } catch { return fallback; }
}

export function savePlantHealthSettings(settings: PlantHealthSettings): void {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* Selection still applies to this analysis. */ }
}
