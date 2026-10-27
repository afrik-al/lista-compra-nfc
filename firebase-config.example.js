// 1) Copia este archivo como "firebase-config.js"  2) Sustituye los datos por los de TU proyecto de Firebase
//    (Consola de Firebase > Configuración del proyecto > Tus apps > Configuración de SDK). Estos datos no son secretos.
window.FIREBASE_CONFIG = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.firebasestorage.app",
  messagingSenderId: "TU_NUMERO",
  appId: "TU_APP_ID"
};
// true: quien abra la web sin clave verá el botón "Crear mi lista".  false: solo se entra con el enlace/etiqueta NFC.
window.APP_CONFIG = { allowCreate: true };
