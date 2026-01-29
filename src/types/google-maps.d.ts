/// <reference types="@types/google.maps" />

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
    initGoogleMapsTracking: () => void;
  }
}

export {};
