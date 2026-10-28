# KINET Prototype

Prototipo académico de análisis postural de Iris Systems.

## Requisitos

- Windows, macOS o Linux.
- Python 3 instalado.
- Navegador moderno con acceso a cámara.
- Cámara web disponible.
- Conexión a Internet para cargar MediaPipe desde CDN.

## Ejecutar

Abre una terminal en esta carpeta y ejecuta:

```powershell
python server.py
```

Luego abre:

```text
http://localhost:8000/
```

Es importante usar `localhost` o HTTPS. La cámara normalmente no funciona al abrir `index.html` directamente como archivo local. `server.py` conserva el proxy DroidCam; Architecture Lab no depende de ese proxy.

## Architecture Lab

Abre `http://localhost:8000/architecture-lab.html` desde el mismo servidor. El laboratorio compara tres alternativas arquitectónicas mediante escenarios editables; no inicia cámara ni altera el análisis postural. También puede servirse como sitio estático: el navegador importa `architecture-model.js` por ruta relativa y no depende de `server.py` ni de CDN. Consulta [ARCHITECTURE-LAB.md](ARCHITECTURE-LAB.md) para fórmulas, supuestos, trazabilidad y pruebas.

El Architecture Lab también es estático y puede probarse sin el handler DroidCam con `python -m http.server 8021`; abre `http://localhost:8021/architecture-lab.html`. El motor que importa el navegador es `architecture-model.js` (MIME JavaScript estándar), con rutas relativas; `architecture-model.mjs` reexporta la API para Node.js.

Para ejecutar las pruebas del motor aislado, instala Node.js 18 o posterior y ejecuta:

```powershell
node --test architecture-model.test.mjs
```

`KINET-Architecture-Lab-completo.zip` incluye el prototipo postural, `server.py`, el laboratorio, motor, pruebas y documentación. `architecture-model.zip` contiene solo el módulo y no es el paquete integral para ejecución.

## Publicar Architecture Lab con GitHub Pages

1. Sube el contenido de la carpeta del proyecto a la raíz del repositorio `L2342/KINET`, conservando `index.html` y `architecture-lab.html` en esa raíz.
2. En GitHub abre **Settings → Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`; guarda.
4. Espera el build de Pages y copia el URL que GitHub muestre.
5. Comprueba el laboratorio en `<URL-del-sitio>/architecture-lab.html`, incluyendo motor, navegación, traza y exportación.

Enlace público verificado en navegador: [KINET Architecture Lab](https://l2342.github.io/KINET/architecture-lab.html). El laboratorio estático no necesita `server.py`; el prototipo postural conserva MediaPipe desde CDN y su endpoint DroidCam local requiere `server.py`.

## Uso recomendado

1. Cierra otras pestañas o aplicaciones que estén usando la cámara.
2. Abre `http://localhost:8000/`.
3. Pulsa **INICIAR ANÁLISIS** y acepta el permiso de cámara.
4. Colócate en vista lateral o 3/4.
5. Encuadra desde la cabeza hasta las rodillas.
6. Mantén hombros, cadera, rodilla y cuello visibles.
7. Espera la cuenta regresiva y los 10 segundos de calibración.
8. Mantén una postura natural durante la calibración.
9. Después cambia deliberadamente de postura para observar la exposición.

## Modo demostración

El archivo `app.js` contiene:

```js
const DEMO_MODE = true;
```

Con `DEMO_MODE = true`, KINET utiliza tiempos rápidos para una grabación audiovisual. La detección sigue siendo real y depende de MediaPipe, landmarks, geometría, desviación y duración.

Con `DEMO_MODE = false`, se utiliza el comportamiento temporal normal del prototipo.

Los umbrales del modo demo son experimentales:

- `0-12 grados`: LOW EXPOSURE.
- `>12-20 grados`: MODERATE EXPOSURE.
- `>20-30 grados`: ELEVATED EXPOSURE.
- `>30 grados`: HIGH EXPOSURE.

No son límites médicos ni universales.

## Calibración

La calibración toma aproximadamente 10 segundos después de una cuenta regresiva de 3 segundos.

Durante la calibración:

- No se muestra un estado de riesgo.
- No se acumula exposición.
- Se calcula una referencia individual de la postura habitual.
- La referencia se guarda en `localStorage`.

Usa **REINICIAR CALIBRACIÓN** si la referencia fue tomada con una postura incorrecta.

## Controles

- **INICIAR ANÁLISIS**: inicia cámara y MediaPipe.
- **CALIBRAR POSICIÓN**: crea una nueva referencia individual.
- **DETENER**: termina la sesión y guarda el resumen.
- **CONGELAR Y ANALIZAR**: pausa un frame y muestra el cálculo paso a paso.
- **GUARDAR RESUMEN**: guarda las métricas de la sesión.
- **MODO GRABACIÓN**: oculta el panel lateral para una captura limpia.
- `R`: alterna modo debug/grabación.
- `F`: congela o reanuda el frame.
- `C`: inicia calibración.

## Qué muestra KINET

KINET usa MediaPipe Pose y landmarks 3D para estimar:

- Torso.
- Hombros.
- Caderas.
- Rodillas.
- Cuello/carga cervical como indicador geométrico experimental.
- Desviación respecto a la referencia individual.
- Exposición acumulada.
- Tendencia: `STABLE`, `INCREASING`, `SUSTAINED` o `RECOVERING`.

La carga cervical es un proxy geométrico. KINET no mide fuerza, peso real, lesión ni realiza un diagnóstico médico.

## Problemas frecuentes

### Usar DroidCam

1. Abre DroidCam en el teléfono.
2. Abre DroidCam Client en Windows y conecta el teléfono por USB o Wi-Fi.
3. Comprueba que la vista previa del cliente muestre la imagen correctamente.
4. Cierra otras aplicaciones que estén usando la cámara.
5. Abre KINET desde `http://localhost:8000/` y acepta el permiso.

KINET solicita la cámara sin forzar resolución ni `facingMode`, para permitir que DroidCam negocie su formato compatible con el navegador. Si el navegador muestra una imagen verde, cierra Chrome y DroidCam Client, vuelve a abrir primero DroidCam y después KINET. Si el cliente muestra imagen pero Chrome continúa verde, revisa que `DroidCam Source` aparezca como cámara en la configuración de Windows.

### No aparece el permiso de cámara

- Usa `http://localhost:8000/`.
- Revisa el permiso de cámara del navegador.
- Cierra otras pestañas que estén usando la webcam.
- Recarga con `Ctrl + F5`.

### La cámara no inicia

Si aparece `NotReadableError`, otra aplicación o pestaña está usando la cámara. Cierra esa aplicación y vuelve a iniciar.

### La postura aparece incompleta

Aleja la cámara y encuadra desde la cabeza hasta las rodillas. Usa luz frontal y evita contraluz.

### La referencia parece incorrecta

Pulsa **REINICIAR CALIBRACIÓN**, adopta una postura natural y espera los 10 segundos completos sin moverte.

## Aviso académico

KINET es un prototipo conceptual. Sus métricas y umbrales son experimentales y están destinados a demostración audiovisual y académica, no a evaluación clínica.
