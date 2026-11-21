# Casa C&J · despliegue único en Vercel

**Estado:** migración preparada en rama de trabajo; NO fusionar hasta configurar las variables privadas y probar una vista previa. La aplicación actual en producción continúa intacta.

## Arquitectura
- GitHub: código fuente; Vercel: web estática y funciones privadas en `/api`.
- Google Sheets existente: fuente única de datos, incluidos los 37 medicamentos recuperados. No se vuelven a sembrar ni reemplazar datos al iniciar.
- OpenAI: análisis de fotografías por `/api/scan`. La fotografía **no se guarda todavía**: falta elegir almacenamiento privado para imágenes.
- Acceso protegido por contraseña doméstica y cookie de sesión HttpOnly/Secure. No hay claves en el navegador ni en GitHub.

## Configuración inicial (Vercel → proyecto → Settings → Environment Variables)

| Variable | Qué colocar |
|---|---|
| `GOOGLE_SHEET_ID` | `1Y-4sv-EbY5i-fEXEbM1NGuuz11n8bki0IjzkcmeNOck` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON completo de una cuenta de servicio de Google Cloud (privado) |
| `HOUSEHOLD_PASSWORD` | Frase de acceso larga y exclusiva (mínimo 12 caracteres) |
| `SESSION_SECRET` | Valor aleatorio fuerte, 32 bytes o más |
| `OPENAI_API_KEY` | Clave de OpenAI API existente; copiarla **solo** al panel de Vercel |
| `OPENAI_MODEL` | Opcional: `gpt-4.1-mini` |

**No pegues estos secretos en ChatGPT, GitHub ni en el HTML.** Los secretos de Apps Script no se transfieren automáticamente a Vercel.

### Google Cloud
1. Crear o seleccionar proyecto en Google Cloud, activar **Google Sheets API**.
2. Crear cuenta de servicio y su clave JSON; almacenarla exclusivamente como variable de entorno de Vercel.
3. Compartir el Sheet *Home* con el `client_email` de esa cuenta de servicio como **Editor**. No hacerlo público.
4. Mantener el Sheet privado, solo con las cuentas necesarias. Revisar permisos y rotar la clave si se expone.

### Validación antes de fusionar
1. Configurar las variables para el entorno **Preview** en Vercel.
2. Abrir la vista previa de la rama y comprobar inicio de sesión y que **Botiquín muestre 37 registros**.
3. Probar un cambio no sensible en compras y comprobar que aparece en Sheets y en otro dispositivo.
4. Probar una fotografía: debe proponer datos; **no se almacena la imagen** en esta versión.
5. Revisar que una visita sin contraseña no pueda acceder a `/api/state` ni `/api/scan`.
6. Solo después, configurar las mismas variables en **Production**, fusionar PR y verificar el despliegue.

## Limitaciones
- Google Sheets no ofrece transacciones condicionales sobre revisiones; hay detección de conflictos, pero dos guardados estrictamente simultáneos podrían pisarse. Para alta concurrencia, migrar a base de datos transaccional.
- La sesión utiliza una contraseña compartida, no cuentas individuales; para permisos por persona usar autenticación de usuarios.
- Fotos: la IA analiza la imagen enviada, pero no la conserva. Para conservarlas en privado, integrar almacenamiento privado con permisos y URL de descarga autenticada.
- Vercel despliega automáticamente al recibir cambios en la rama de producción **si la integración Git está habilitada**.
