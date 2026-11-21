# Casa C&J: Vercel (frontend) + Apps Script (backend) + Sheets (datos)

La rama implementa comunicacion privada a traves de `/api/bridge`. La funcion Vercel **solo transporta** las peticiones HTTPS; toda la logica de negocio y el acceso a Sheets siguen en `Code.gs`.

## Activacion (una vez)

1. En el proyecto Apps Script **que tiene permisos sobre Home**, actualizar `Code.gs` con este repositorio. Ya no es necesario subir `Index.html` a Apps Script.
2. En Apps Script, Configuracion del proyecto > Propiedades de secuencia de comandos, crear `BRIDGE_SECRET` con un valor aleatorio de 32+ caracteres. No publicar ese valor en GitHub ni en chats.
3. Implementar > Nueva implementacion > Aplicacion web. Ejecutar como **yo** (propietario autorizado del Sheet), acceso **Cualquier usuario**; la funcion verifica el secreto antes de leer datos. Copiar la URL /exec NUEVA. Esta opcion comparte los datos con quien tenga acceso a la pasarela, por lo que la contrasena y el secreto deben ser fuertes. El usuario necesita autorizar permisos de Sheets/Drive en Apps Script.
4. Vercel > Proyecto home > Settings > Environment Variables (Preview y Production):
   - `APPS_SCRIPT_URL`: URL completa /exec recien implementada (Secret)
   - `APPS_SCRIPT_BRIDGE_SECRET`: mismo valor de la propiedad BRIDGE_SECRET (Secret)
   - `HOUSEHOLD_PASSWORD`: contrasena independiente de 12+ caracteres para Claudia y Jorge (Secret)
5. Probar el despliegue Preview de esta rama. Comprobar lectura y guardado en `Botiquín` y `Compras` con dos dispositivos.
6. Solo tras comprobarlo, fusionar la rama a `main`, que Vercel publicara automaticamente.

**No se necesita Google Cloud ni cuenta de servicio.**

**Importante:** El archivo `Code.gs` en GitHub **no se sincroniza automaticamente con Apps Script**; actualizar el proyecto de Apps Script es un paso manual. La URL antigua de Apps Script no parece funcionar. Una pasarela publicada con `Cualquier usuario` requiere mantener ambos secretos privados. Se usa contraseña de hogar durante la sesion del navegador. Vercel puede limitar el tamaño de las fotos que se suben por la API. Las fotografias y el reconocimiento no se consideran verificados hasta realizar una prueba de extremo a extremo.

**El frontend no debe re-inicializar ni sobrescribir un Sheet existente con datos locales**. Por eso se reemplaza `bootstrap(state)` por `getState()`.
