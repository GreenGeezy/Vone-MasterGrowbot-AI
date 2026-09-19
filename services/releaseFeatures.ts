import { Capacitor } from '@capacitor/core';

/** Keep the Android release experience unchanged. Web enables local preview. */
export const proFirstRelease = Capacitor.getPlatform() !== 'android';
