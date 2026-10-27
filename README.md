# Lista de la compra con NFC

Lista de la compra familiar para el móvil, pensada para abrirse al acercar el teléfono a una **etiqueta NFC pegada en la nevera**.
Sin cuentas ni contraseñas individuales, sin instalar nada. Aspecto de libreta dibujada a mano.

- Una lista compartida por familia, sincronizada en tiempo real entre móviles.
- Un supermercado por pestaña (Mercadona, LIDL, Carrefour, ALDI, BonÀrea, Kiwoko, La Sirena, Jardiland).
- Añadir, editar, marcar, cantidades y borrar deslizando.
- Al finalizar la compra se genera un **ticket**; se conserva el historial (y se puede borrar ticket a ticket).
- Funciona sin conexión: los cambios se guardan y se envían al reconectar.

**Cada persona usa su propio proyecto gratuito de Firebase.** Tus datos viven en TU proyecto: nadie más los ve ni comparte cuota contigo.

## Puesta en marcha (≈15 minutos)

### 1. Crea tu proyecto de Firebase (gratis, sin tarjeta)
1. Entra en <https://console.firebase.google.com> > **Añadir proyecto** (puedes desactivar Google Analytics).
2. **Compilación > Firestore Database > Crear base de datos**: modo **producción**, ubicación europea (p. ej. `eur3`).
3. **Configuración del proyecto > Tus apps > `</>` (Web)**: registra una app y copia el objeto `firebaseConfig`.

### 2. Configura la web
Copia `firebase-config.example.js` como `firebase-config.js` y pega tus datos. Esos datos **no son secretos**; la seguridad la dan las reglas de `firestore.rules`.
Deja `allowCreate: true` si quieres ver el botón "Crear mi lista" la primera vez.

### 3. Publica (Firebase Hosting, también gratis)
    npm install -g firebase-tools
    firebase login
    firebase use --add            # elige tu proyecto
    firebase deploy --only firestore:rules,hosting
Tu web quedará en `https://TU_PROYECTO.web.app`.

### 4. Crea tu lista y programa la etiqueta
1. Abre tu web en el móvil y pulsa **Crear mi lista**. Se genera una clave aleatoria y verás un enlace del tipo `https://TU_PROYECTO.web.app/#CLAVE`.
2. Cópialo y escríbelo en la etiqueta NFC (app "NFC Tools" > Escribir > Registro URL). **Ese enlace es la contraseña de tu lista.**
3. Para entrar desde otros móviles, acércalos a la etiqueta. Si necesitas ver el enlace de nuevo, **mantén pulsado el nombre del supermercado** (el título grande) unos segundos.
4. Cuando ya hayas creado tu lista, puedes poner `allowCreate: false` en `firebase-config.js` y volver a desplegar para que nadie más pueda crear listas en tu proyecto.

## Cómo está protegida
No hay cuentas. La lista cuelga de una clave larga y aleatoria (`familias/{clave}/…`). Las reglas de Firestore **no permiten listar** las familias: sin la clave no se puede leer ni borrar nada. Además validan el formato de los datos.
Es el mismo nivel de protección que un enlace de "cualquiera con el enlace" de Google Docs: si se filtra, genera otra clave (cambia lo que hay tras `#`) y reescribe la etiqueta.

## Costes y límites
El plan gratuito de Firebase (Spark) cubre de sobra el uso de una familia y no genera facturas: si se agotara una cuota, el servicio se detiene hasta que se reinicia. Revisa las cuotas vigentes en la documentación de Firebase.

## Desarrollo
- `index.html`, `app.js`, `style.css`: la interfaz (JavaScript sin frameworks).
- `fuente-db/`: la capa de datos (Firestore). Para reconstruir `db.bundle.js`: `cd fuente-db && npm install && npm run build`.
- Para probar en local: `python3 -m http.server` y abre `http://localhost:8000/#CLAVE_DE_PRUEBA` (24-64 caracteres: letras, números, `-`, `_`).

## Licencias
- **Código:** MIT (ver `LICENSE`).
- **Ilustraciones** de la carpeta `assets/` (dibujos de la libreta, botones, iconos y títulos): CC BY-NC 4.0 (ver `LICENSE-ARTE.md`).
- Los nombres y logotipos de supermercados son marcas de sus respectivos propietarios; aquí aparecen como ilustraciones y este proyecto no está afiliado a ellos.
