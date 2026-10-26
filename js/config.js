// Configuración Central de Kinetix
export const CONFIG = {
  // URL pública del deployment de Convex. El acceso a los datos está protegido
  // por una clave de sincronización que se configura en Ajustes.
  CONVEX_URL: 'https://rightful-mule-879.convex.cloud',
  APP_VERSION: '1.18',
  DEFAULT_REST_SECONDS: 90,
  TARGET_WATER_ML: 3000,
  WEIGHT_UNIT: 'kg',
  DEBUG: false,
};

// Logging de desarrollo: evita llenar la consola en producción.
export function debugLog(...args) {
  if (CONFIG.DEBUG) console.log(...args);
}
