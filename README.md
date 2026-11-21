# Casa C&J: Vercel (frontend) + Apps Script (backend) + Sheets (datos)

La rama implementa comunicacion privada a traves de `/api/bridge`. La funcion Vercel **solo transporta** las peticiones HTTPS; toda la logica de negocio y el acceso a Sheets siguen en `Code.gs`.

## Activacion (una vez)

1. En el proyecto Apps Script **que tiene permisos sobre Home**, actualizar `Code.gs` con este repositorio. Ya no es necesario subir `Index.html` a Apps Script.
2. En Apps Script, Configuracion del proyecto > Propiedades de secuencia de comandos, crear `BRIDGE_SECRET` con un valor aleatorio de 32+ caracteres. No publicar ese valor en GitHub ni en chats.
3. Implementar > Nueva implementacion > Aplicacion web. Ejecutar como **yo** (propietario autorizado del Sheet), acceso **Cualquier usuario**; la funcion verifica el secreto antes de leer datos. Copiar la URL /exec NUEVA. Esta opcion comparte los datos con quien tenga acceso a la pasarela, por lo que el secreto debe ser fuerte. El usuario necesita autorizar permisos de Sheets/Drive en Apps Script.
4. Vercel > Proyecto home > Settings > Environment Variables (Preview y Production):
   - `APPS_SCRIPT_URL`: URL completa /exec recien implementada (Secret)
   - `APPS_SCRIPT_BRIDGE_SECRET`: mismo valor de la propiedad BRIDGE_SECRET (Secret)
   - `GOOGLE_CLIENT_ID`: ID de cliente OAuth web (Config)
   - `ALLOWED_EMAILS`: correos autorizados separados por coma (Secret)
   - `SESSION_SECRET`: clave privada aleatoria de 32+ caracteres (Secret)
   - En Google Auth Platform, registrar el origen exacto de Vercel (incluido el dominio Preview si se prueba alli) y los usuarios de prueba si corresponde.
5. Probar el despliegue Preview de esta rama. Comprobar lectura y guardado en `Botiquín` y `Compras` con dos dispositivos.
6. Solo tras comprobarlo, fusionar la rama a `main`, que Vercel publicara automaticamente.

**Google Cloud solo se utiliza para OAuth; no se necesita cuenta de servicio ni Sheets API.**

**Importante:** El archivo `Code.gs` en GitHub **no se sincroniza automaticamente con Apps Script**; actualizar el proyecto de Apps Script es un paso manual. La URL antigua de Apps Script no parece funcionar. Una pasarela publicada con `Cualquier usuario` requiere mantener ambos secretos privados. Se verifica el token de Google en servidor, se restringe por correo autorizado y se emite una cookie HttpOnly de ocho horas. Vercel puede limitar el tamaño de las fotos que se suben por la API. Las fotografias y el reconocimiento no se consideran verificados hasta realizar una prueba de extremo a extremo.

**El frontend no debe re-inicializar ni sobrescribir un Sheet existente con datos locales**. Por eso se reemplaza `bootstrap(state)` por `getState()`.
