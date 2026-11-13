# Reglas del proyecto Kinetix

## Despliegue de nuevas versiones
Al finalizar cualquier cambio o nueva versión en este repositorio, **siempre** completa el despliegue para que quede disponible en producción (GitHub Pages y Convex) sin dejar cambios pendientes solo en local:

1. **Sincronización de versión**: verificar que `package.json`, `js/config.js` (`APP_VERSION`), `sw.js` (`CACHE_NAME = 'kinetix-vX.Y.Z'`) e `index.html` (`headerVersionBadge` y `?v=X.Y.Z`) coincidan.
2. **Validación local**: ejecutar `npm run build:css` y `npm run check` (`eslint .` + `node --test tests/*.test.js`), asegurando que no queden errores ni cambios sin compilar en `assets/css/tailwind.css`.
3. **Backend Convex**: si hubo cambios en `convex/`, publicar las funciones en el deployment apuntado por `js/config.js` (`rightful-mule-879.convex.cloud`) ejecutando `npx convex dev --once`.
4. **Publicación en GitHub Pages**: hacer `git add`, `git commit` y `git push origin main` para disparar los workflows `CI` y `pages-build-deployment` hacia `https://menchathor.github.io/kinetix/`.
5. **Verificación del despliegue**: confirmar con `gh run list -L 3` / `gh run watch` que tanto `CI` como `pages build and deployment` terminen en estado `success`.
