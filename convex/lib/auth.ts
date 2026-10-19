// Autenticación mínima para una app personal: todas las funciones de datos
// exigen una clave compartida configurada como variable de entorno del
// deployment (`npx convex env set KINETIX_SYNC_KEY <clave>`).
//
// Esto no reemplaza un sistema de usuarios, pero cierra el acceso anónimo a
// los datos de salud cuando la URL del deployment es pública (como ocurre en
// una PWA desplegada). La clave se guarda sólo en el dispositivo del usuario.

export function assertSyncKey(syncKey: string | undefined): void {
  const expected = process.env.KINETIX_SYNC_KEY;

  if (!expected) {
    throw new Error(
      "SYNC_KEY_NOT_CONFIGURED: configura KINETIX_SYNC_KEY en Convex (`npx convex env set KINETIX_SYNC_KEY <clave>`)."
    );
  }

  const provided = syncKey || "";
  let diff = provided.length ^ expected.length;
  const maxLength = Math.max(provided.length, expected.length);

  // Comparación de tiempo constante para no filtrar la clave por longitud.
  for (let i = 0; i < maxLength; i++) {
    diff |= (provided.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  }

  if (diff !== 0) {
    throw new Error("SYNC_KEY_INVALID: la clave de sincronización no es válida.");
  }
}
