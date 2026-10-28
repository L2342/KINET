# KINET Architecture Lab

## Alcance y ejecucion

El laboratorio compara tres disenos hipoteticos para la evolucion tecnica de KINET. Es un modulo estatico independiente: no inicia la camara, no importa MediaPipe y no modifica las metricas posturales. La interfaz guia el recorrido en cuatro pasos: proyecto, escenario, comparacion e interpretacion; la metodologia queda plegada hasta solicitarla. La pagina original se conserva en `index.html`; ambas direcciones tienen enlaces de navegacion.

Para servirlo desde la carpeta del proyecto:

```powershell
python server.py
```

Abre `http://localhost:8000/` para el prototipo postural o `http://localhost:8000/architecture-lab.html` para el simulador. El boton de ejecucion avanza a la comparacion; modifica solicitudes/s y ejecuta otra vez para observar cambios. Para ejecutar la suite unitaria del motor, con Node.js 18 o posterior:

```powershell
node --test architecture-model.test.mjs
```

## Despliegue estático

El laboratorio funciona sin `server.py`: `architecture-lab.js` importa `architecture-model.js` usando rutas relativas y extensiones JavaScript estándar. Compruébalo desde la carpeta padre con `python -m http.server 8022` y abre `/KINET-prototype/architecture-lab.html`. Para GitHub Pages: publica el contenido del proyecto en la rama/carpeta configurada en Settings → Pages; confirma que `architecture-lab.html`, `architecture-lab.js`, `architecture-model.js` y `architecture-lab.css` quedan en la misma carpeta. El enlace público está **PENDIENTE DE PUBLICACIÓN Y VERIFICACIÓN**. Para `L2342/KINET`, el URL esperado si Pages se habilita desde `main`/root es `https://l2342.github.io/KINET/architecture-lab.html`; no afirmo que esté activo.

El perfil, los escenarios modificados, ponderaciones y tasas/topes/costos/eficiencia por arquitectura se guardan en `localStorage`. **Restaurar supuestos** devuelve todos los campos a sus valores académicos iniciales. **Exportar JSON** descarga entradas, parámetros, catálogo de procedencia, las dos latencias, indicadores, componentes de disponibilidad, restricciones y contribuciones de la última ejecución válida. Una entrada editada invalida y oculta los resultados anteriores hasta ejecutar otra vez.

## Alternativas

| Diseno | Flujo y despliegue asumidos | Ventajas modeladas | Limites modelados |
| --- | --- | --- | --- |
| Monolito modular | Cliente -> API -> modulos internos -> base de datos. Una aplicacion desplegada y replicada completa. | Cero saltos internos; menor costo base y menor complejidad operativa implicita. | Escala todos los modulos juntos; capacidad maxima de 4 instancias. |
| Microservicios | Cliente -> gateway -> autenticacion, analisis, sesiones y reportes -> base de datos. Servicios desplegados por separado; escala de analisis independiente. | Tres saltos internos; capacidad por instancia de analisis; maximo 8. | Serializacion, mas trafico y costo base; componentes criticos en serie. |
| Orientada a eventos | Cliente -> API -> broker/cola -> consumidores -> base de datos y almacen de reportes. Consumidores escalan segun carga. | La cola absorbe picos; tasa de consumidor escalable hasta 10 instancias. | Espera asincrona fija, broker critico y mayor complejidad operacional. No se marca como tiempo real estricto. |

Son esquemas comparables, no afirmaciones de despliegues existentes. Los componentes, flujo, despliegue, ventajas, limitaciones y supuestos tambien aparecen en la interfaz.

## Catalogo de entradas

| Entrada | Unidad / rango | Inicial (Referencia) | Uso |
| --- | --- | --- | --- |
| Usuarios concurrentes | personas, 1-100 000 | 80 | Determina el factor de pico. No es el total de usuarios registrados. |
| Solicitudes backend | solicitudes/s, 0,1-10 000 | 18 | Demanda media total de procesamiento. No es FPS de la camara. |
| Latencia de red | ms/salto, 0-2 000 | 24 | Se multiplica por el numero de saltos externos e internos modelados. |
| Presupuesto | COP/mes, 0-1 000 000 000 | 1 500 000 | Restriccion de elegibilidad cuando se marca obligatoria. |
| Latencia maxima | ms, 50-10 000 | 450 | Limite obligatorio opcional para elegibilidad. |
| Privacidad minima | puntos, 0-100 | 70 | Se contrasta con el indice del diseno. |
| Disponibilidad minima | %, 90-99,99 | 97 | Se contrasta con el producto de componentes criticos. |
| Tipo de aplicacion | vision tiempo real / API / lotes | vision tiempo real | Multiplica procesamiento por 1,3 / 1 / 0,7. |
| Infraestructura | nube / centro de datos propio | nube | Multiplica costo por 1 / 1,18; supuesto de planeacion, no cotizacion. |
| Escalado independiente | booleano | No obligatorio | Si es obligatorio, excluye el monolito. |
| Tiempo real | booleano | No obligatorio | Si es obligatorio, excluye procesamiento orientado a eventos asincrono. |
| Broker de eventos permitido | booleano | Si | Si no se permite, excluye la alternativa orientada a eventos. |

Los cuatro escenarios completos son editables y restaurables. Piloto: 12 concurrentes, 3 solicitudes/s, 18 ms, 800 000 COP; Institucional: 420, 75 solicitudes/s, 28 ms, 3 500 000 COP; Crecimiento: 1 600, 260 solicitudes/s, 35 ms, 9 000 000 COP. Cada escenario especifica ademas latencia maxima, privacidad, disponibilidad y restricciones obligatorias. Son supuestos academicos ilustrativos, no mediciones ni requisitos oficiales.

## Campos que afectan el cálculo

| Campo visible | Clave de código | Uso en el motor |
| --- | --- | --- |
| Tipo de aplicación | `project.applicationType` | Multiplica `processingMs` por `APPLICATION_FACTORS` para latencia de finalización. |
| Infraestructura de referencia | `project.infrastructureMode` | Multiplica costo por `INFRASTRUCTURE_FACTORS`. |
| Usuarios concurrentes | `scenario.concurrentUsers` | Determina `peakFactor = 1 + concurrentUsers/200`; relación supuesta del equipo. |
| Solicitudes al backend | `scenario.requestsPerSecond` | Se multiplica por factor de pico; unidad req/s, no FPS. |
| Latencia de red | `scenario.networkLatencyMs` | Afecta ambos tiempos de latencia según cantidad de saltos modelada. |
| Presupuesto | `scenario.monthlyBudgetCOP` | Solo excluye si `scenario.mandatory.budget` es true. |
| Latencia máxima, privacidad mínima y disponibilidad mínima | `maxLatencyMs`, `minPrivacyScore`, `minAvailability` | Solo excluyen respectivamente cuando están marcadas obligatorias. |
| Escalado independiente, tiempo real y broker permitido | Campos booleanos de `DEFAULT_PROJECT` | Excluyen alternativas incompatibles cuando la regla está configurada como requisito. |
| Ponderaciones | `state.weights` → `recommend()` | Se normalizan por la suma y afectan cada contribución del score. |
| Tasa, tope, eficiencia, costo base/unitario | `architectureParameters[id]` | Afectan instancias, capacidad, saturación, costo, score y traza. |
| Nombre, alcance y texto de usuarios previstos | `projectName`, `scope`, `intendedUsers` | Se conservan/exportan; no entran en fórmulas ni restricciones. P36 comprueba que cambiarlos no altera resultados. |

Los escenarios aplican las mismas entradas y flags obligatorios a cada arquitectura; los parámetros propios de arquitectura sí difieren por diseño supuesto.

## Parametros y formulas

El modulo puro `architecture-model.js` recibe perfil, escenario, pesos y parametros de arquitectura; no depende del DOM, cámara ni MediaPipe. `architecture-model.mjs` solo reexporta ese módulo para la suite Node.

- Factor de pico supuesto: `1 + usuarios concurrentes / 200`.
- Demanda pico (RPS): `peakFactor = 1 + scenario.concurrentUsers / 200`; `peakRequestsPerSecond = scenario.requestsPerSecond * peakFactor`. No convierte FPS de cámara a RPS.
- Tasa efectiva por instancia: `effectiveRatePerInstance = architecture.serviceRate * (architecture.scalingEfficiency ?? 1)`. Instancias: `min(architecture.maxInstances, max(1, ceil(peakRequestsPerSecond / effectiveRatePerInstance)))`.
- Capacidad asignada (RPS): `instances * effectiveRatePerInstance`. Capacidad máxima (RPS): `architecture.maxInstances * effectiveRatePerInstance`. Valores iniciales no modificados: monolito 50×4=200; microservicios 35×8=280; eventos 28×10=280. Eficiencia inicial 1.0 conserva exactamente los resultados previos; no es cifra de artículo. Utilización (%) = `peak / capacity * 100`; uso máximo = `peak / maxCapacity * 100`. Margen (RPS) = `maxCapacity - peak`; saturado si `peak >= maxCapacity`.
- Espera por utilización (ms): `u = utilizationPercent / 100`; si `u < 0.95`, `15 * u / (1 - u)`; si no, `300 + max(0, u - 0.95) * 1200`. Función por tramos didáctica, no cola calibrada.
- El conteo de instancias aplica de inmediato y sin demora. Por eso, al cruzar el umbral de una instancia, la latencia puede bajar aunque la demanda suba: se asigna capacidad adicional instantaneamente. P15 reproduce esta discontinuidad didactica; no representa autoscaling medido ni su tiempo de aprovisionamiento.
- Componentes de finalización (ms), código `latencyComponents`: `processingMs = architecture.processingMs * APPLICATION_FACTORS[project.applicationType]`; `networkMs = scenario.networkLatencyMs * (1 + architecture.internalHops)`; `serializationMs = architecture.serializationMs`; `fixedQueueMs = architecture.queueBaseMs`; `utilizationQueueMs = queueingMs`. `completionLatencyMs` es la suma de esos cinco valores. Solo finalización entra al score.
- Aceptación informativa (ms) para eventos: `scenario.networkLatencyMs * (1 + architecture.acceptanceInternalHops) + architecture.serializationMs`; un salto al broker es supuesto. No incluye procesamiento, cola ni persistencia durable. Para alternativas síncronas aceptación = finalización. No es una medición ni ACK durable. AD p. 150 define respuesta petición→respuesta en su estudio; ninguna fuente estudia eventos.
- Costo ilustrativo mensual: `(paquete fijo por arquitectura + instancias * costo unitario mensual por instancia) * factor de infraestructura`. En COP, región Colombia como supuesto de planeación, fecha de referencia 2026-10-28 y sin cotización: monolito base 180 000 + 160 000/instancia; microservicios 620 000 + 130 000/instancia; eventos 715 000 + 110 000/instancia. El paquete fijo no está desglosado por servicio por falta de inventario/cotización; no representa tarifa actual.
- Disponibilidad por componentes criticos nombrados: monolito Aplicacion `0,997`, Base de datos `0,999`; microservicios Gateway `0,999`, Autenticacion `0,999`, Analisis `0,997`, Sesiones `0,995`, Reportes `0,997`, Base de datos `0,999`; eventos API de ingreso `0,999`, Broker/cola `0,995`, Consumidores `0,997`, Base de datos `0,999`, Almacen de reportes `0,997`. Disponibilidad del sistema = producto. Se asumen fallos independientes y todos los componentes listados en serie; no se atribuye beneficio por redundancia.
- Privacidad: minimizacion (20 si no se transmite video crudo, 0 si se transmite) + ubicacion regional (20; de lo contrario 10) + retencion (20 si <=7 dias, 15 si <=30, si no 0) + cifrado en transito (20 si asumido) + control de acceso (20 si asumido). En las tres alternativas se supone que no se transmite video crudo, que existe cifrado en transito y control de acceso; el monolito se supone regional y los otros dos no lo garantizan. Retencion asumida: 30, 30 y 7 dias. Es un indice heuristico de atributos, no una evaluacion de seguridad, certificacion ni cumplimiento.
- `normalized()`: min-max sobre elegibles; menor finalización/costo es mejor, mayor capacidad máxima/disponibilidad/privacidad es mejor; si `high === low`, retorna 50. Pesos de `recommend()` son 30/20/20/20/10 y se normalizan como `weight / sum(weights)` para sumar 1. Contribución = `normalized * normalizedWeight`; score = suma. Una elegible recibe 50 en criterios constantes y se marca `singleEligible`; no significa 50% calidad. Pareto compara costo mensual menor/igual y capacidad máxima mayor/igual, con una mejora estricta; no usa pesos.

Primero se aplican restricciones obligatorias de presupuesto, latencia, privacidad, disponibilidad, escalado independiente y tiempo real; la prohibicion de un broker excluye eventos. Solo las elegibles compiten por puntaje. Si ninguna cumple, no se recomienda una. Diferencias inferiores a 5 puntos se etiquetan como cercanas.

### Limites de las aproximaciones

- La carga pico `1 + concurrentes/200` es un factor didactico fijo, no una distribucion temporal observada. No modela sesiones inactivas, diferencias entre rutas ni correlacion de solicitudes.
- La tasa por instancia y la capacidad maxima suponen instancias homogeneas, rendimiento lineal y ausencia de sobrecosto de coordinacion; no modelan limites de base de datos, gateway, CPU, memoria, I/O ni ramp-up de escalado.
- La espera por utilizacion es una funcion por tramos, no una teoria de colas calibrada; tiene un cambio de pendiente en 95% y no produce percentiles ni variabilidad.
- El costo es una suma plana mensual; omite almacenamiento, egreso, licencias, soporte, observabilidad, costos de personal y descuentos. No es una cotizacion.
- La disponibilidad supone fallos independientes y componentes en serie; no incluye reparacion, redundancia, zona de fallo compartida ni SLA.
- El indice de privacidad asigna puntos a atributos asumidos. No es un control de cumplimiento legal ni una auditoria de seguridad.
- Los resultados ilustran sensibilidad y compromisos. No son benchmarks, garantias de rendimiento ni evidencia de que una alternativa sea universalmente superior.

## Registro de procedencia de parámetros

Categorías: A = medición directa de KINET; B = respaldo parcial en evidencia con alcance distinto; C = supuesto de modelado/equipo; D = magnitud pendiente de validación; E = sin evidencia en los documentos revisados. Un parámetro puede ser C por origen y D por su magnitud. La columna de fuente no implica transferibilidad.

Referencias según análisis del equipo, pendientes de verificación contra el artículo completo: [AD] Al-Debagy y Martinek (2018), CINTI, pp. 149–153; [BL] Blinowski, Ojdowska y Przybyłek (2022), IEEE Access 10, pp. 20357–20374; [SS] Sunardi y Suharjito (2019), Procedia Computer Science 157, pp. 134–141. AD y BL comparan monolito y microservicios en sus propios entornos; SS compara frameworks PHP, no arquitecturas. Ninguna de las tres estudia una alternativa orientada a eventos, privacidad o disponibilidad.

| Parametro | Valor usado | Clasificacion y evidencia disponible | Tratamiento |
| --- | --- | --- | --- |
| Tasas 50/35/28 req/s | Monolito/micro/eventos | C (valores del equipo) + D (magnitud por validar). BL pp. 20364–70 respalda mecanismos cualitativos, no estas tasas; AD pp. 151–152 reporta resultados no equivalentes. E para eventos. | Editables; medir por instancia bajo carga representativa de video; no importar cifras de artículos. |
| Topes 4/8/10 | Instancias máximas | C + D. BL pp. 20365–70 observa techo/degradación hasta ~6 en una configuración Spring Cloud; no transferible. E para eventos. | Editables; obtener de cotas/costo/arranque del entorno objetivo. |
| Eficiencia de escalado 1,0 | Factor común por arquitectura, editable 0,1–1 | C; D sin calibración; BL pp. 20366, 20370 respalda solo retornos decrecientes cualitativos. | 1,0 neutral conserva fórmula previa exactamente. Calibrar con throughput por instancia y nivel de escala; no usar cifras de BL. |
| Factor concurrencia→RPS | `1 + usuarios/200` | C + D; no hay relación equivalente en AD/BL. | Sustituir por perfil medido de solicitudes por sesión/usuario concurrente. |
| Procesamiento, saltos y serialización | 120/100/95 ms; 0/3/2 saltos; 0/18/12 ms | C + D. BL pp. 20364–65 respalda que la sobrecarga relativa depende del cómputo, no estos milisegundos. | Medir traces/RPS con despliegues funcionalmente equivalentes. |
| Cola/acuse de eventos | 55 ms de espera fija; aceptación red+serialización | E: AD, BL, SS no estudian eventos. | Supuesto ilustrativo editable por otros componentes de latencia; medir ACK y completion por separado en un broker real. |
| Costos fijos + por instancia | COP 180k/160k, 620k/130k, 715k/110k | C + D en valores. Según análisis del equipo, pendiente de verificar contra BL p. 20363, Tablas 2–3: estructura recurso-hora + gateway en Azure (sept. 2020); no precios COP ni valores KINET. | COP, región y fecha de referencia son supuestos; reemplazar con cotizaciones fechadas. Paquete fijo no desglosado por servicio. |
| Disponibilidad por componente | 0,995–0,999 | C + E; no hay SLA ni medición en las fuentes. | Validar con SLO/telemetría y dependencias de fallo; el producto supone independencia/serie. |
| Privacidad | Video, región, retención, cifrado, acceso | C + E; ninguna fuente mide estos atributos. | Verificar controles reales y requisitos legales; el índice no es certificación. |
| Pesos | 30/20/20/20/10 | C + E; preferencias del equipo, no hallazgo científico. | UI muestra normalización a suma 1 y sensibilidad por criterio; justificar con stakeholders. |
| Escenarios/factores/tarifas | Valores iniciales en `SCENARIOS`, multiplicadores | C + D; no son requisitos/SLA medidos de KINET. | Editables o sustituibles por demanda y precios validados. |

No se recibieron los PDF/artículos completos en el repositorio; todas las referencias AD/BL/SS que aparecen arriba o en el catálogo de la interfaz son **según análisis del equipo, pendientes de verificación contra el artículo**. Por tanto, A (medición KINET) = ninguno; B es solo cualitativo/parcial; ningún parámetro numérico del modelo está validado ni respaldado como valor transferible. AD/BL no estudian eventos, disponibilidad ni privacidad; SS compara frameworks y no respalda parámetros arquitectónicos. No se atribuyen cifras experimentales de los artículos al simulador.

## Pruebas ejecutadas

Suite unitaria del motor: `node --test architecture-model.test.mjs`; estado en esta iteración: **36 pruebas aprobadas, 0 fallidas**. Estas pruebas verifican código determinista, no validez experimental.

Comprobaciones de integración/UI separadas: ejecuté desde `python -m http.server` bajo la subruta `/KINET-prototype/`; módulos `.js` cargan con `application/javascript`, el formulario se inicializa, el escenario Referencia calcula tres filas y diez columnas, aparecen tres trazas, Pareto y sensibilidad, y no hubo requests externos. A 375 y 360 px el documento no desborda; tabla/traza usan scroll interno. No ejecuté cámara/MediaPipe, no se midió rendimiento y no hice estudio de usabilidad.

| ID | Entrada / operación | Resultado esperado que comprueba el test |
| --- | --- | --- |
| P01 | Referencia válida por defecto. | Tres arquitecturas con latencia, capacidad, costo, disponibilidad y privacidad calculadas. |
| P02 | Concurrentes=-1, RPS=0, presupuesto=-5. | Rechazo de entradas y cero resultados. |
| P03 | Demanda baja frente a Crecimiento. | Capacidad, uso, costo y latencia cambian según las fórmulas. |
| P04 | Presupuesto obligatorio=1 COP. | Ninguna elegible y recomendación nula. |
| P05 | Carga alta; peso 100 a costo y después 100 a latencia. | El ganador cambia entre criterios configurados. |
| P06 | Ejecutar dos veces la misma referencia. | Objetos de resultados idénticos. |
| P07 | Tres alternativas con una referencia. | La demanda pico es igual para todas. |
| P08 | Evaluar `SCENARIOS`. | Cuatro escenarios, tres alternativas y cargas diferentes. |
| P09 | Escalado independiente obligatorio. | Monolito queda no elegible. |
| P10 | Broker prohibido. | Eventos queda no elegible. |
| P11 | Referencia; verificar identidades de capacidad/uso/margen. | Asignada=instancias×tasa efectiva; máxima=tope×tasa efectiva; saturación coherente. |
| P12 | Score de alternativas elegibles. | Suma de contribuciones = score. |
| P13 | Pesos todos cero y peso 101. | Entradas rechazadas, sin score. |
| P14 | Restricciones que cumplen y presupuesto=1 que incumple. | Signos `<=`, `>=`, `>` describen el resultado real. |
| P15 | 49→51 RPS con 1 concurrente. | Cruza de 1 a 2 instancias y puede bajar latencia por escalado instantáneo asumido. |
| P16 | Demanda a máximo−0,1, máximo y máximo+0,1. | Margen positivo/0/negativo y saturación false/true/true. |
| P17 | RPS fijo 2; concurrentes 1→80. | Pico, uso y latencia crecen con concurrencia. |
| P18 | Peso de costo=100. | Monolito gana bajo esa prioridad y puntúa 100. |
| P19 | Peso de capacidad máxima=100. | Microservicios/eventos empatan; diferencia se marca cercana. |
| P20 | Límites mínimos y máximos de cada variable. | La validación acepta los extremos admitidos. |
| P21 | Tasa 0 y tope fraccionario. | Parámetros de arquitectura inválidos rechazados. |
| P22 | Componentes críticos de cada alternativa. | Nombres y disponibilidad tienen correspondencia; valores en (0,1]. |
| P23 | Cifrado asumido true→false. | Índice heurístico cambia 20 puntos. |
| P24 | Escalado independiente + tiempo real obligatorios. | Solo microservicios queda elegible. |
| P25 | Cambiar tasa, tope y costos del monolito. | Capacidad/costo del monolito recalculados; microservicios no cambia. |
| P26 | Tres diseños, mismo escenario. | Las claves/estados de requisitos obligatorios son iguales. |
| P27 | Fórmula legacy sin eficiencia frente a eficiencia=1.0. | Métricas exactas iguales para cada arquitectura. |
| P28 | Pesos iniciales y métricas de referencia. | Pesos normalizados suman 1; Pareto devuelve frontera/dominadas sin usar score. |
| P29 | Referencia con eventos. | Aceptación < finalización; alias `latencyMs` = finalización. |
| P30 | Sensibilidad de cinco pesos. | Un resultado por criterio, recalculado sobre la misma referencia. |
| P31 | Eficiencia monolito=0,8. | Capacidad asignada y máxima bajan. |
| P32 | Cambiar solo el acuse de eventos a 999999 ms. | Score/ganador no cambian; solo finalización se puntúa. |
| P33 | Todas incumplen presupuesto obligatorio. | Pareto queda vacío y lista las tres como no elegibles. |
| P34 | Cuatro escenarios, tres alternativas. | Demanda/capacidad/latencia/costo/privacidad de traza coinciden con salida. |
| P35 | Trazas de cada alternativa en cuatro escenarios. | Fórmula, sustitución, resultado, restricciones y rama de score presentes. |
| P36 | Cambiar solo nombre, alcance y texto de usuarios. | Indicadores y recomendación quedan idénticos. |

## Matriz de trazabilidad

| Req. | Funcionalidad / ubicacion | Estado | Evidencia y pendiente |
| --- | --- | --- | --- |
| 1. Proyecto y usuarios | Perfil editable, guardado en `localStorage`. | Implementado y verificado | Flujo por pasos y exportacion; validar usuarios/requisitos oficiales con el equipo. |
| 2. Tres arquitecturas | Alternativas, flujo, despliegue, componentes y limites en modelo/UI. | Implementado y verificado | P01, P22; no son despliegues reales. |
| 3. Variables relevantes | Carga, red, presupuesto, calidad, parametros arquitectonicos y pesos. | Implementado y verificado | P03, P17, P20, P21, P25; tasas/costos se pueden ajustar. |
| 4. Modelo y supuestos | Motor puro y formulas/metodologia. | Implementado; coherencia unitaria verificada | P11, P14-P17, P22-P23; validez empirica pendiente. |
| 5. Cuatro escenarios | `SCENARIOS` y editor. | Implementado y verificado | P08 y comparacion en navegador; valores ilustrativos. |
| 6. Cuatro indicadores | Latencia, capacidad, costo, disponibilidad y privacidad. | Implementado y verificado | P01, P11, P22-P23; todos estimados/heuristicos. |
| 7. Condiciones equivalentes | Mismo escenario, proyecto, restricciones y parametros para tres alternativas. | Implementado y probado | P07, P26; traza muestra entradas comunes. |
| 8. Recomendacion con restricciones | Elegibilidad antes de puntuacion, score y traza. | Implementado y probado | P04, P05, P18-P19, P24, P32-P35. |
| 9. Interfaz adaptable | Cuatro etapas, traza plegable, comparación y metodología. | Implementado; navegador verificado | 375/360 px y escritorio, incluida tabla/traza; sin estudio humano de usabilidad. |
| 10. Validacion y pruebas | Controles de entradas, parámetros y pesos. | Implementado y probado | P01-P36 en Node; comprobaciones estáticas en navegador se describen aparte. |
| 11. Documentacion y enlace | Fórmulas, parámetros, pruebas y despliegue. | Documentado; enlace público pendiente | URL prevista `https://l2342.github.io/KINET/architecture-lab.html`, no publicada/activada/verificada. |
| 12. Sustentacion reproducible | Configurar, seleccionar, ejecutar, modificar, comparar y explicar. | Flujo local verificado | Validar requisitos/datos con equipo y ejecutar pruebas de carga reales sigue pendiente. |

## Guion breve de demostracion

1. Iniciar `python server.py` y abrir `http://localhost:8000/architecture-lab.html`.
2. Revisar el perfil y las advertencias de estimaciones.
3. En Referencia, explicar usuarios concurrentes y solicitudes/s; abrir los parametros avanzados para mostrar que tasa, tope y costos son supuestos editables.
4. Ejecutar y comparar tabla, latencia y utilizacion maxima; abrir la arquitectura para explicar sus componentes.
5. Cambiar solicitudes/s o seleccionar Crecimiento, ejecutar de nuevo y comparar nueva carga, instancias, costo y elegibilidad.
6. Interpretar puntuacion y aportes en el paso 4; explicar las restricciones que excluyen candidatos.
7. Abrir Metodologia y reconocer las categorias C/D y los datos requeridos para calibracion. No describir las salidas como mediciones o predicciones validadas.

## Publicación

No se realizó un push ni se habilitó GitHub Pages: el remoto no devolvió ramas, no hay commits locales y GitHub CLI no está instalado. Para publicar: (1) conservar los archivos de esta carpeta en el repositorio `L2342/KINET`; (2) crear y subir un commit en `main`; (3) en GitHub abrir Settings → Pages y elegir Deploy from a branch, `main`, `/ (root)`; (4) esperar la URL que GitHub muestre y sustituir el marcador público en README/esta guía; (5) verificar `/KINET/architecture-lab.html`, carga del módulo, navegación y exportación. Ningún enlace público está confirmado todavía.

## Referencias academicas y alcance

Se toman como lineas de investigacion los temas indicados por el profesor: comparacion de monolitos, microservicios y eventos; pruebas de carga; consumo de CPU/memoria; tiempo de respuesta y throughput; comparaciones de frameworks bajo escenarios controlados. No se incluyeron articulos completos en los archivos inspeccionados y no se atribuyen cifras ni hallazgos bibliograficos sin consultar fuentes. El modelo no representa resultados de publicaciones.

Para validar en un sistema real se requieren implementaciones funcionalmente equivalentes, recursos e infraestructura comparables, pruebas de carga repetibles y medicion de latencia, CPU, memoria, throughput y errores; experimentos de escalabilidad, disponibilidad y fallos; y cotizaciones/costos de infraestructura reales. Hasta entonces, los parametros solo permiten explorar relaciones y compromisos de forma reproducible.