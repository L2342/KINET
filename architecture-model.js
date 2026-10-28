export const ARCHITECTURES = [
  {
    id: "monolith",
    name: "Monolito modular",
    summary: "Módulos separados dentro de una aplicación desplegada como unidad.",
    flow: "Cliente -> API -> módulos internos -> base de datos -> respuesta.",
    deployment: "Una aplicación y una base de datos; se replica la aplicación completa.",
    assumptions: "Los módulos comparten proceso y recursos; la base de datos es un componente crítico.",
    components: ["API y módulos de dominio", "Base de datos", "Escalado de la aplicación completa"],
    criticalComponents: ["Aplicación", "Base de datos"],
    advantages: ["Menos saltos de red", "Operación y despliegue más sencillos"],
    tradeoffs: ["Escala todos los módulos juntos", "Un fallo de aplicación afecta a todos los módulos"],
    serviceRate: 50,
    maxInstances: 4,
    scalingEfficiency: 1,
    instanceCostCOP: 160000,
    baseCostCOP: 180000,
    processingMs: 120,
    internalHops: 0,
    serializationMs: 0,
    queueBaseMs: 0,
    availabilityComponents: [{ name: "Aplicación", availability: 0.997 }, { name: "Base de datos", availability: 0.999 }],
    privacy: { transmitsRawVideo: false, regionLocal: true, retentionDays: 30, encryptedInTransit: true, accessControls: true },
    independentScaling: false,
    realTime: true,
  },
  {
    id: "microservices",
    name: "Microservicios",
    summary: "Autenticación, análisis, sesiones y reportes como servicios independientes.",
    flow: "Cliente -> gateway -> autenticación/análisis/sesiones/reportes -> base de datos.",
    deployment: "Gateway, servicios y base de datos desplegados por separado; análisis escala independientemente.",
    assumptions: "Tres saltos internos y serialización por petición; los componentes críticos no tienen redundancia modelada.",
    components: ["Gateway", "Autenticación", "Análisis", "Sesiones", "Reportes", "Base de datos"],
    criticalComponents: ["Gateway", "Autenticación", "Análisis", "Sesiones", "Reportes", "Base de datos"],
    advantages: ["Escalado independiente del análisis", "Aislamiento por servicio"],
    tradeoffs: ["Más comunicación y serialización", "Mayor costo y carga operativa"],
    serviceRate: 35,
    maxInstances: 8,
    scalingEfficiency: 1,
    instanceCostCOP: 130000,
    baseCostCOP: 620000,
    processingMs: 100,
    internalHops: 3,
    serializationMs: 18,
    queueBaseMs: 0,
    availabilityComponents: [
      { name: "Gateway", availability: 0.999 }, { name: "Autenticación", availability: 0.999 },
      { name: "Análisis", availability: 0.997 }, { name: "Sesiones", availability: 0.995 },
      { name: "Reportes", availability: 0.997 }, { name: "Base de datos", availability: 0.999 },
    ],
    privacy: { transmitsRawVideo: false, regionLocal: false, retentionDays: 30, encryptedInTransit: true, accessControls: true },
    independentScaling: true,
    realTime: true,
  },
  {
    id: "event-driven",
    name: "Orientada a eventos",
    summary: "API, intermediario y consumidores procesan eventos de forma desacoplada.",
    flow: "Cliente -> API -> broker/cola -> consumidores -> base de datos y reportes.",
    deployment: "API, broker, consumidores y base de datos; consumidores escalan según demanda estimada.",
    assumptions: "La cola amortigua picos, pero añade espera; retención de eventos asumida de 7 días.",
    components: ["API de ingreso", "Broker/cola", "Consumidores", "Base de datos", "Almacén de reportes"],
    criticalComponents: ["API de ingreso", "Broker/cola", "Consumidores", "Base de datos", "Almacén de reportes"],
    advantages: ["Absorbe picos mediante cola", "Productores y consumidores desacoplados"],
    tradeoffs: ["La tarea completa puede tardar más", "Broker y observabilidad agregan operación"],
    serviceRate: 28,
    maxInstances: 10,
    scalingEfficiency: 1,
    instanceCostCOP: 110000,
    baseCostCOP: 715000,
    processingMs: 95,
    internalHops: 2,
    serializationMs: 12,
    queueBaseMs: 55,
    acceptanceInternalHops: 1,
    availabilityComponents: [
      { name: "API de ingreso", availability: 0.999 }, { name: "Broker/cola", availability: 0.995 },
      { name: "Consumidores", availability: 0.997 }, { name: "Base de datos", availability: 0.999 },
      { name: "Almacén de reportes", availability: 0.997 },
    ],
    privacy: { transmitsRawVideo: false, regionLocal: false, retentionDays: 7, encryptedInTransit: true, accessControls: true },
    independentScaling: true,
    realTime: false,
  },
];

export const DEFAULT_WEIGHTS = { latency: 30, capacity: 20, cost: 20, availability: 20, privacy: 10 };
export const COST_ASSUMPTIONS = {
  currency: "COP",
  region: "Colombia (supuesto de planeación del equipo)",
  referenceDate: "2026-10-28 (fecha del modelo, no de cotización)",
  pricingSource: "Supuesto académico; no cotización de proveedor",
};
export const PARAMETER_CATALOG = [
  { key: "serviceRate", label: "Tasa por instancia", classification: "C + D", source: "Supuesto del equipo. Según análisis del equipo, pendiente de verificación contra AD p. 151 y BL pp. 20365-20370; describen tendencias cualitativas, no estas tasas req/s." },
  { key: "maxInstances", label: "Máximo de instancias", classification: "C + D; B parcial", source: "Supuesto del equipo. Según análisis del equipo, pendiente de verificación contra BL pp. 20365-20370; el comportamiento de techo de su entorno no fija el tope de KINET." },
  { key: "scalingEfficiency", label: "Eficiencia de escalado", classification: "C + D; E numérico", source: "Supuesto del equipo. Según análisis del equipo, pendiente de verificación contra AD/BL: retornos decrecientes cualitativos; 1.0 es neutral por diseño, no medido ni cifra del artículo." },
  { key: "processingMs", label: "Procesamiento base", classification: "C + D", source: "Supuesto del equipo. Según análisis del equipo, pendiente de verificación contra AD p. 150: define respuesta petición→respuesta; no justifica tiempos de procesamiento de KINET." },
  { key: "networkHops", label: "Red, saltos y serialización", classification: "C + D; B parcial", source: "Topología y milisegundos supuestos. Según análisis del equipo, pendiente de verificación contra BL pp. 20364-20365: mecanismo cualitativo, sin tiempos transferibles." },
  { key: "networkLatency", label: "Latencia de red por salto", classification: "C + D", source: "Supuesto del escenario; AD/BL no aportan una latencia de red para KINET." },
  { key: "applicationFactors", label: "Factor por tipo de aplicación", classification: "C + D", source: "Supuesto del equipo; multiplicadores sin calibración con cargas de análisis de video." },
  { key: "infrastructureFactor", label: "Factor de infraestructura", classification: "C + D", source: "Supuesto del equipo; no representa tarifa, proveedor ni región cotizados." },
  { key: "queueLatency", label: "Aceptación y cola de eventos", classification: "E", source: "Sin respaldo en AD, BL o SS; eventos no fueron estudiados. ACK y finalización requieren medición separada." },
  { key: "queueModel", label: "Espera por utilización", classification: "C + D", source: "Función por tramos supuesta; no es una cola calibrada con mediciones." },
  { key: "demandFactor", label: "Factor de demanda pico", classification: "C + D", source: "Supuesto del equipo; los artículos reportan hilos/cargas de prueba, sin relación calibrada con usuarios concurrentes y req/s de KINET." },
  { key: "cost", label: "Costos base y por instancia", classification: "C + D; B parcial", source: "Valores COP supuestos del equipo. Según análisis del equipo, pendiente de verificación contra BL p. 20363, Tablas 2–3: estructura recurso-hora y gateway en Azure, septiembre de 2020; precios y plataforma no transferibles." },
  { key: "availability", label: "Disponibilidad por componente", classification: "C + E", source: "Supuestos del equipo; ninguna fuente mide disponibilidad para estas alternativas." },
  { key: "privacy", label: "Atributos de privacidad", classification: "C + E", source: "Heurística de diseño; ninguna de las tres fuentes mide privacidad ni cumplimiento." },
  { key: "weights", label: "Pesos de decisión", classification: "C + E", source: "Preferencias iniciales del equipo; no son resultados científicos." },
  { key: "scenarios", label: "Escenarios de demanda y calidad", classification: "C + D", source: "Supuestos académicos del equipo; no son requisitos/SLA medidos de KINET." },
  { key: "normalization", label: "Normalización min-max y puntuación", classification: "C", source: "Regla de decisión del equipo; resultados relativos solo al conjunto elegible." },
  { key: "pareto", label: "Dominancia Pareto costo-capacidad", classification: "B parcial + C", source: "Método inspirado en figuras de BL (6, 8, 13, 18), según análisis del equipo, pendiente de verificación contra el artículo; no se transfieren cifras." },
];
export const DEFAULT_ARCHITECTURE_PARAMETERS = Object.fromEntries(ARCHITECTURES.map((architecture) => [architecture.id, {
  serviceRate: architecture.serviceRate,
  maxInstances: architecture.maxInstances,
  scalingEfficiency: architecture.scalingEfficiency,
  baseCostCOP: architecture.baseCostCOP,
  instanceCostCOP: architecture.instanceCostCOP,
}]));

export const SCENARIOS = [
  { id: "reference", name: "Referencia", description: "Carga intermedia con presupuesto moderado.", concurrentUsers: 80, requestsPerSecond: 18, networkLatencyMs: 24, monthlyBudgetCOP: 1500000, maxLatencyMs: 450, minPrivacyScore: 70, minAvailability: 97 },
  { id: "pilot", name: "Piloto", description: "Grupo pequeño y recursos limitados.", concurrentUsers: 12, requestsPerSecond: 3, networkLatencyMs: 18, monthlyBudgetCOP: 800000, maxLatencyMs: 400, minPrivacyScore: 70, minAvailability: 96 },
  { id: "institutional", name: "Institucional", description: "Más usuarios y mayor disponibilidad requerida.", concurrentUsers: 420, requestsPerSecond: 75, networkLatencyMs: 28, monthlyBudgetCOP: 3500000, maxLatencyMs: 600, minPrivacyScore: 75, minAvailability: 97 },
  { id: "growth", name: "Crecimiento", description: "Demanda alta y presión de escalado.", concurrentUsers: 1600, requestsPerSecond: 260, networkLatencyMs: 35, monthlyBudgetCOP: 9000000, maxLatencyMs: 900, minPrivacyScore: 75, minAvailability: 97 },
].map((scenario) => ({ ...scenario, mandatory: { budget: true, latency: true, privacy: true, availability: true } }));

export const DEFAULT_PROJECT = {
  projectName: "KINET Architecture Lab",
  scope: "Evolución arquitectónica del análisis postural; no ejecuta MediaPipe ni procesa cámara.",
  applicationType: "real-time-vision",
  intendedUsers: "Personas usuarias, investigadores y equipo académico de KINET",
  infrastructureMode: "cloud",
  eventBrokerAllowed: true,
  requireIndependentScaling: false,
  realTimeRequired: false,
};

const APPLICATION_FACTORS = { "real-time-vision": 1.3, "web-api": 1, batch: 0.7 };
const INFRASTRUCTURE_FACTORS = { cloud: 1, "on-prem": 1.18 };

export function validateInputs(project, scenario, weights = DEFAULT_WEIGHTS, architectureParameters = DEFAULT_ARCHITECTURE_PARAMETERS) {
  const errors = [];
  const checks = [
    ["Usuarios concurrentes", scenario.concurrentUsers, 1, 100000],
    ["Solicitudes por segundo", scenario.requestsPerSecond, 0.1, 10000],
    ["Latencia de red", scenario.networkLatencyMs, 0, 2000],
    ["Presupuesto mensual", scenario.monthlyBudgetCOP, 0, 1000000000],
    ["Latencia máxima", scenario.maxLatencyMs, 50, 10000],
    ["Privacidad mínima", scenario.minPrivacyScore, 0, 100],
    ["Disponibilidad mínima", scenario.minAvailability, 90, 99.99],
  ];
  for (const [label, value, min, max] of checks) {
    if (!Number.isFinite(value) || value < min || value > max) errors.push(`${label}: debe estar entre ${min} y ${max}.`);
  }
  if (!project?.projectName?.trim()) errors.push("El nombre del proyecto es obligatorio.");
  if (!APPLICATION_FACTORS[project?.applicationType]) errors.push("Tipo de aplicación no reconocido.");
  if (!INFRASTRUCTURE_FACTORS[project?.infrastructureMode]) errors.push("Tipo de infraestructura no reconocido.");
  if (Object.keys(DEFAULT_WEIGHTS).some((key) => !Number.isFinite(weights?.[key]) || weights[key] < 0 || weights[key] > 100)) {
    errors.push("Cada ponderación debe estar entre 0 y 100.");
  } else if (Object.values(weights).reduce((sum, value) => sum + value, 0) <= 0) {
    errors.push("La suma de ponderaciones debe ser mayor que cero.");
  }
  for (const architecture of ARCHITECTURES) {
    const parameters = architectureParameters?.[architecture.id];
    for (const [key, min, max] of [["serviceRate", 0.1, 100000], ["maxInstances", 1, 1000], ["scalingEfficiency", 0.1, 1], ["baseCostCOP", 0, 1000000000], ["instanceCostCOP", 0, 1000000000]]) {
      const value = parameters?.[key];
      if (!Number.isFinite(value) || value < min || value > max || (key === "maxInstances" && !Number.isInteger(value))) {
        errors.push(`${architecture.name}: ${key} debe estar entre ${min} y ${max}${key === "maxInstances" ? " y ser entero" : ""}.`);
      }
    }
  }
  if (scenario.mandatory && Object.values(scenario.mandatory).some((value) => typeof value !== "boolean")) {
    errors.push("Las restricciones obligatorias deben ser booleanas.");
  }
  return errors;
}

function privacyScore(architecture) {
  const dataMinimization = architecture.privacy.transmitsRawVideo ? 0 : 20;
  const processingLocation = architecture.privacy.regionLocal ? 20 : 10;
  const retention = architecture.privacy.retentionDays <= 7 ? 20 : architecture.privacy.retentionDays <= 30 ? 15 : 0;
  const encryption = architecture.privacy.encryptedInTransit ? 20 : 0;
  const accessControl = architecture.privacy.accessControls ? 20 : 0;
  return { score: dataMinimization + processingLocation + retention + encryption + accessControl, criteria: { dataMinimization, processingLocation, retention, encryption, accessControl } };
}

function evaluateConstraints(project, scenario, result) {
  const mandatory = scenario.mandatory ?? {};
  const checks = [
    ["budget", "Presupuesto", result.monthlyCostCOP <= scenario.monthlyBudgetCOP,
      `${result.monthlyCostCOP.toLocaleString("es-CO")} COP ${result.monthlyCostCOP <= scenario.monthlyBudgetCOP ? "<=" : ">"} ${scenario.monthlyBudgetCOP.toLocaleString("es-CO")} COP`],
    ["latency", "Latencia", result.latencyMs <= scenario.maxLatencyMs,
      `${result.latencyMs.toFixed(1)} ms ${result.latencyMs <= scenario.maxLatencyMs ? "<=" : ">"} ${scenario.maxLatencyMs} ms`],
    ["privacy", "Privacidad", result.privacyScore >= scenario.minPrivacyScore,
      `${result.privacyScore} ${result.privacyScore >= scenario.minPrivacyScore ? ">=" : "<"} ${scenario.minPrivacyScore} puntos`],
    ["availability", "Disponibilidad", result.availabilityPercent >= scenario.minAvailability,
      `${result.availabilityPercent.toFixed(2)}% ${result.availabilityPercent >= scenario.minAvailability ? ">=" : "<"} ${scenario.minAvailability}%`],
  ];
  const failed = checks.filter(([key, , passes]) => mandatory[key] && !passes).map(([, label, , detail]) => `${label}: ${detail}`);
  const projectChecks = [
    { key: "independentScaling", label: "Escalado independiente", mandatory: Boolean(project.requireIndependentScaling), passes: result.architecture.independentScaling, detail: result.architecture.independentScaling ? "Disponible en el diseño supuesto" : "No disponible en el diseño supuesto" },
    { key: "realTime", label: "Tiempo real", mandatory: Boolean(project.realTimeRequired), passes: result.architecture.realTime, detail: result.architecture.realTime ? "Procesamiento sin cola asíncrona modelada" : "Procesamiento asíncrono; no garantiza tiempo real" },
    { key: "eventBroker", label: "Broker permitido", mandatory: !project.eventBrokerAllowed, passes: project.eventBrokerAllowed || result.architecture.id !== "event-driven", detail: project.eventBrokerAllowed || result.architecture.id !== "event-driven" ? "Compatible con la restricción" : "La alternativa requiere un broker" },
  ];
  for (const check of projectChecks) {
    if (check.mandatory && !check.passes) failed.push(`${check.label}: ${check.detail}.`);
  }
  const quantitativeChecks = checks.map(([key, label, passes, detail]) => ({ key, label, mandatory: Boolean(mandatory[key]), passes, detail }));
  return { eligible: failed.length === 0, checks: [...quantitativeChecks, ...projectChecks], reasons: failed };
}

export function simulateArchitecture(project, scenario, architecture) {
  const peakFactor = 1 + scenario.concurrentUsers / 200;
  const peakRequestsPerSecond = scenario.requestsPerSecond * peakFactor;
  const scalingEfficiency = architecture.scalingEfficiency ?? 1;
  const effectiveRatePerInstance = architecture.serviceRate * scalingEfficiency;
  const instances = Math.min(architecture.maxInstances, Math.max(1, Math.ceil(peakRequestsPerSecond / effectiveRatePerInstance)));
  const capacityRps = instances * effectiveRatePerInstance;
  const maxCapacityRps = architecture.maxInstances * effectiveRatePerInstance;
  const utilizationPercent = (peakRequestsPerSecond / capacityRps) * 100;
  const maxCapacityUtilizationPercent = (peakRequestsPerSecond / maxCapacityRps) * 100;
  const capacityHeadroomRps = maxCapacityRps - peakRequestsPerSecond;
  const utilization = utilizationPercent / 100;
  const queueingMs = utilization >= 0.95 ? 300 + Math.max(0, utilization - 0.95) * 1200 : 15 * utilization / (1 - utilization);
  const latencyComponents = {
    processingMs: architecture.processingMs * APPLICATION_FACTORS[project.applicationType],
    networkMs: scenario.networkLatencyMs * (1 + architecture.internalHops),
    serializationMs: architecture.serializationMs,
    fixedQueueMs: architecture.queueBaseMs,
    utilizationQueueMs: queueingMs,
  };
  const completionLatencyMs = latencyComponents.processingMs + latencyComponents.networkMs
    + latencyComponents.serializationMs + latencyComponents.fixedQueueMs + latencyComponents.utilizationQueueMs;
  const acceptanceLatencyMs = architecture.id === "event-driven"
    ? scenario.networkLatencyMs * (1 + architecture.acceptanceInternalHops) + architecture.serializationMs
    : completionLatencyMs;
  const costBreakdown = {
    fixedBaseCOP: architecture.baseCostCOP,
    instanceCostCOP: instances * architecture.instanceCostCOP,
    infrastructureFactor: INFRASTRUCTURE_FACTORS[project.infrastructureMode],
  };
  const monthlyCostCOP = Math.round((costBreakdown.fixedBaseCOP + costBreakdown.instanceCostCOP) * costBreakdown.infrastructureFactor);
  const availability = architecture.availabilityComponents.reduce((product, component) => product * component.availability, 1);
  const privacy = privacyScore(architecture);
  const result = {
    architecture,
    peakFactor,
    peakRequestsPerSecond,
    instances,
    capacityRps,
    maxCapacityRps,
    utilizationPercent,
    maxCapacityUtilizationPercent,
    capacityHeadroomRps,
    saturated: peakRequestsPerSecond >= maxCapacityRps,
    acceptanceLatencyMs,
    completionLatencyMs,
    latencyMs: completionLatencyMs,
    latencyComponents,
    monthlyCostCOP,
    costBreakdown,
    availabilityPercent: availability * 100,
    availabilityComponents: architecture.availabilityComponents,
    privacyScore: privacy.score,
    privacyCriteria: privacy.criteria,
  };
  result.constraints = evaluateConstraints(project, scenario, result);
  return result;
}

function normalized(value, values, higherIsBetter) {
  const low = Math.min(...values);
  const high = Math.max(...values);
  if (high === low) return 50;
  const score = ((value - low) / (high - low)) * 100;
  return higherIsBetter ? score : 100 - score;
}

export function recommend(results, weights = DEFAULT_WEIGHTS) {
  const eligible = results.filter((result) => result.constraints.eligible);
  const ineligible = results.filter((result) => !result.constraints.eligible);
  if (!eligible.length) return { winner: null, explanation: "Ninguna arquitectura cumple las restricciones obligatorias.", ranked: [], ineligible };
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const criteria = [
    ["latency", "completionLatencyMs", false],
    ["capacity", "maxCapacityRps", true],
    ["cost", "monthlyCostCOP", false],
    ["availability", "availabilityPercent", true],
    ["privacy", "privacyScore", true],
  ];
  const valuesByCriterion = Object.fromEntries(criteria.map(([key, field]) => [key, eligible.map((result) => result[field])]));
  const ranked = eligible.map((result) => {
    const breakdown = Object.fromEntries(criteria.map(([key, field, higherIsBetter]) => [key, normalized(result[field], valuesByCriterion[key], higherIsBetter)]));
    const contributions = Object.fromEntries(criteria.map(([key]) => [key, breakdown[key] * weights[key] / totalWeight]));
    const score = Object.values(contributions).reduce((sum, contribution) => sum + contribution, 0);
    return { ...result, score, scoreBreakdown: breakdown, scoreContributions: contributions };
  }).sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  const close = ranked.length > 1 && winner.score - ranked[1].score < 5;
  const topContribution = Object.entries(winner.scoreContributions).sort((a, b) => b[1] - a[1])[0];
  const normalizedWeights = Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, value / totalWeight]));
  return {
    winner,
    ranked,
    ineligible,
    close,
    topCriterion: topContribution[0],
    topContribution: topContribution[1],
    normalizedWeights,
    singleEligible: eligible.length === 1,
    explanation: eligible.length === 1
      ? `${winner.architecture.name} es la única alternativa elegible; no existe comparación relativa entre opciones.`
      : close
        ? "Las dos mejores alternativas están a menos de 5 puntos; la diferencia es pequeña con estas ponderaciones."
        : `${winner.architecture.name} obtiene la mayor puntuación ponderada entre las alternativas elegibles de este modelo.`,
  };
}

export function simulateScenario(project, scenario, weights = DEFAULT_WEIGHTS, architectureParameters = DEFAULT_ARCHITECTURE_PARAMETERS) {
  const errors = validateInputs(project, scenario, weights, architectureParameters);
  if (errors.length) return { errors, results: [], recommendation: null };
  const results = ARCHITECTURES.map((architecture) => simulateArchitecture(project, scenario, { ...architecture, ...architectureParameters[architecture.id] }));
  const recommendation = recommend(results, weights);
  for (const result of results) result.calculationTrace = buildCalculationTrace(project, scenario, weights, architectureParameters, result, recommendation);
  return { errors: [], results, recommendation };
}

export function evaluateScenarios(project, scenarios, weights = DEFAULT_WEIGHTS, architectureParameters = DEFAULT_ARCHITECTURE_PARAMETERS) {
  return scenarios.map((scenario) => ({ scenario, ...simulateScenario(project, scenario, weights, architectureParameters) }));
}

export function analyzeWeightSensitivity(project, scenario, weights = DEFAULT_WEIGHTS, architectureParameters = DEFAULT_ARCHITECTURE_PARAMETERS) {
  const baseline = simulateScenario(project, scenario, weights, architectureParameters);
  if (baseline.errors.length) return { errors: baseline.errors, baselineWinner: null, criteria: [] };
  const keys = Object.keys(weights);
  const baselineWinner = baseline.recommendation.winner?.architecture.id ?? null;
  const criteria = keys.map((target) => {
    const others = keys.filter((key) => key !== target);
    const otherTotal = others.reduce((sum, key) => sum + weights[key], 0);
    const makeWeights = (targetWeight) => Object.fromEntries(keys.map((key) => [
      key,
      key === target ? targetWeight : otherTotal > 0 ? (100 - targetWeight) * weights[key] / otherTotal : (100 - targetWeight) / others.length,
    ]));
    const lowResult = simulateScenario(project, scenario, makeWeights(0), architectureParameters);
    const highResult = simulateScenario(project, scenario, makeWeights(100), architectureParameters);
    return {
      criterion: target,
      currentWeight: weights[target],
      winnerAtZero: lowResult.recommendation?.winner?.architecture.id ?? null,
      winnerAtHundred: highResult.recommendation?.winner?.architecture.id ?? null,
      changesAtZero: (lowResult.recommendation?.winner?.architecture.id ?? null) !== baselineWinner,
      changesAtHundred: (highResult.recommendation?.winner?.architecture.id ?? null) !== baselineWinner,
    };
  });
  return { errors: [], baselineWinner, criteria };
}

export function computeParetoFrontier(results) {
  const eligible = results.filter((result) => result.constraints.eligible);
  const dominates = (left, right) => left.monthlyCostCOP <= right.monthlyCostCOP
    && left.maxCapacityRps >= right.maxCapacityRps
    && (left.monthlyCostCOP < right.monthlyCostCOP || left.maxCapacityRps > right.maxCapacityRps);
  const frontier = eligible.filter((candidate) => !eligible.some((other) => other !== candidate && dominates(other, candidate)));
  const dominated = eligible.filter((candidate) => !frontier.includes(candidate));
  return { frontier, dominated, ineligible: results.filter((result) => !result.constraints.eligible) };
}

function buildCalculationTrace(project, scenario, weights, architectureParameters, result, recommendation) {
  const architecture = result.architecture;
  const parameterClass = (key) => PARAMETER_CATALOG.find((parameter) => parameter.key === key)?.classification ?? "C: supuesto del equipo";
  const trace = [];
  const add = (label, formula, substitution, value, evidence = "") => trace.push({ label, formula, substitution, result: value, evidence });
  const n = (value, digits = 3) => Number(value).toFixed(digits);

  add("Entradas comunes", "mismo proyecto + escenario + restricciones para las 3 alternativas",
    JSON.stringify({ projectType: project.applicationType, infrastructure: project.infrastructureMode, concurrentUsers: scenario.concurrentUsers, requestsPerSecond: scenario.requestsPerSecond, networkLatencyMs: scenario.networkLatencyMs, monthlyBudgetCOP: scenario.monthlyBudgetCOP, maxLatencyMs: scenario.maxLatencyMs, minAvailability: scenario.minAvailability, minPrivacyScore: scenario.minPrivacyScore, mandatory: scenario.mandatory, weights }),
    "aplicadas sin variar por arquitectura");
  add("Factor de demanda", "1 + concurrentUsers / 200", `1 + ${scenario.concurrentUsers} / 200`, n(result.peakFactor), parameterClass("demandFactor"));
  add("Demanda pico", "requestsPerSecond × peakFactor", `${scenario.requestsPerSecond} × ${n(result.peakFactor)}`, `${n(result.peakRequestsPerSecond)} req/s`, parameterClass("demandFactor"));
  add("Instancias", "min(maxInstances, max(1, ceil(demanda / (serviceRate × efficiency))))", `min(${architecture.maxInstances}, max(1, ceil(${n(result.peakRequestsPerSecond)} / (${architectureParameters[architecture.id].serviceRate} × ${architectureParameters[architecture.id].scalingEfficiency}))))`, `${result.instances} instancias`, `${parameterClass("serviceRate")}; ${parameterClass("maxInstances")}`);
  add("Eficiencia de escalado", "serviceRate efectivo = serviceRate × efficiency", `${architectureParameters[architecture.id].serviceRate} × ${architectureParameters[architecture.id].scalingEfficiency}`, `${n(architectureParameters[architecture.id].serviceRate * architectureParameters[architecture.id].scalingEfficiency)} req/s por instancia efectivo`, parameterClass("scalingEfficiency"));
  add("Capacidad asignada", "instancias × serviceRate × efficiency", `${result.instances} × ${architectureParameters[architecture.id].serviceRate} × ${architectureParameters[architecture.id].scalingEfficiency}`, `${n(result.capacityRps)} req/s`);
  add("Capacidad máxima modelada", "maxInstances × serviceRate × efficiency", `${architecture.maxInstances} × ${architectureParameters[architecture.id].serviceRate} × ${architectureParameters[architecture.id].scalingEfficiency}`, `${n(result.maxCapacityRps)} req/s`);
  add("Utilización asignada", "demanda pico / capacidad asignada × 100", `${n(result.peakRequestsPerSecond)} / ${n(result.capacityRps)} × 100`, `${n(result.utilizationPercent)}%`);
  add("Utilización máxima", "demanda pico / capacidad máxima × 100", `${n(result.peakRequestsPerSecond)} / ${n(result.maxCapacityRps)} × 100`, `${n(result.maxCapacityUtilizationPercent)}%`);
  add("Margen y saturación", "capacidad máxima − demanda pico; saturado si demanda ≥ máximo", `${n(result.maxCapacityRps)} − ${n(result.peakRequestsPerSecond)}; ${n(result.peakRequestsPerSecond)} ≥ ${n(result.maxCapacityRps)}`, `${n(result.capacityHeadroomRps)} req/s; ${result.saturated ? "SATURADO" : "NO SATURADO"}`);
  add("Componentes de finalización", "procesamiento + red + serialización + cola fija + espera por utilización",
    `${n(result.latencyComponents.processingMs)} + ${n(result.latencyComponents.networkMs)} + ${n(result.latencyComponents.serializationMs)} + ${n(result.latencyComponents.fixedQueueMs)} + ${n(result.latencyComponents.utilizationQueueMs)} ms`, `${n(result.completionLatencyMs)} ms disponibles`, `${parameterClass("processingMs")}; ${parameterClass("networkHops")}; ${architecture.id === "event-driven" ? parameterClass("queueLatency") : "sin cola fija"}`);
  add("Latencia de aceptación", architecture.id === "event-driven" ? "red × (1 + saltos hasta broker) + serialización" : "síncrona: coincide con resultado disponible",
    architecture.id === "event-driven" ? `${scenario.networkLatencyMs} × (1 + ${architecture.acceptanceInternalHops}) + ${architecture.serializationMs}` : `${n(result.completionLatencyMs)} ms`, `${n(result.acceptanceLatencyMs)} ms; informativa, no puntuada`, architecture.id === "event-driven" ? "E: sin evidencia; acuse no modela persistencia/CPU" : "modelo síncrono supuesto");
  add("Costo mensual", "(paquete fijo + instancias × costo unitario) × factor infraestructura",
    `(${result.costBreakdown.fixedBaseCOP} + ${result.instances} × ${architectureParameters[architecture.id].instanceCostCOP}) × ${result.costBreakdown.infrastructureFactor}`, `${result.monthlyCostCOP} COP/mes`, `${parameterClass("cost")}; sin cotización`);
  add("Disponibilidad estimada", "producto de componentes críticos en serie e independientes",
    result.availabilityComponents.map((component) => `${component.name}=${component.availability}`).join(" × "), `${n(result.availabilityPercent, 4)}%; supuesto, no SLA` , parameterClass("availability"));
  add("Índice heurístico de privacidad", "minimización + ubicación + retención + cifrado + acceso",
    Object.values(result.privacyCriteria).join(" + "), `${result.privacyScore}/100; no certifica seguridad`, parameterClass("privacy"));
  for (const check of result.constraints.checks) {
    add(`Restricción: ${check.label}`, check.mandatory ? "obligatoria → debe cumplirse para ser elegible" : "informativa; no excluye",
      check.detail, `${check.mandatory ? "obligatoria" : "preferencia"}: ${check.passes ? "cumple" : "incumple"}`);
  }
  const ranked = recommendation.ranked.find((candidate) => candidate.architecture.id === architecture.id);
  if (!ranked) {
    add("Puntuación", "solo las alternativas elegibles reciben puntuación", result.constraints.reasons.join("; "), "sin puntuación: no elegible");
  } else {
    const rawValues = { latency: result.completionLatencyMs, capacity: result.maxCapacityRps, cost: result.monthlyCostCOP, availability: result.availabilityPercent, privacy: result.privacyScore };
    for (const [criterion, normalizedValue] of Object.entries(ranked.scoreBreakdown)) {
      add(`Normalización: ${criterion}`, "min-max entre alternativas elegibles; dirección según criterio", `valor absoluto=${rawValues[criterion]}; normalizado=${n(normalizedValue)}/100; peso normalizado=${n(recommendation.normalizedWeights[criterion])}`, `${n(normalizedValue)} × ${n(recommendation.normalizedWeights[criterion])} = ${n(ranked.scoreContributions[criterion])} puntos`);
    }
    add("Puntuación total", "suma de contribuciones ponderadas", Object.values(ranked.scoreContributions).map((value) => n(value)).join(" + "), `${n(ranked.score)} / 100 relativo`);
  }
  add("Decisión", "máxima puntuación entre elegibles; restricciones aplicadas primero", recommendation.ranked.map((candidate) => `${candidate.architecture.name}=${n(candidate.score)}`).join("; ") || "ninguna elegible", recommendation.winner?.architecture.id === architecture.id ? "RECOMENDADA POR EL MODELO" : result.constraints.eligible ? "elegible, no primera en score" : "descartada por restricción", "no demuestra superioridad en producción");
  return trace;
}