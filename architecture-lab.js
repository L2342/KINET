import {
  ARCHITECTURES,
  COST_ASSUMPTIONS,
  DEFAULT_ARCHITECTURE_PARAMETERS,
  DEFAULT_PROJECT,
  DEFAULT_WEIGHTS,
  PARAMETER_CATALOG,
  SCENARIOS,
  analyzeWeightSensitivity,
  computeParetoFrontier,
  evaluateScenarios,
  simulateScenario,
} from "./architecture-model.js?v=12";

const STORAGE_KEY = "kinet-architecture-lab-v1";
const copy = (value) => JSON.parse(JSON.stringify(value));
const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const defaults = { project: copy(DEFAULT_PROJECT), scenarios: copy(SCENARIOS), weights: copy(DEFAULT_WEIGHTS), architectureParameters: copy(DEFAULT_ARCHITECTURE_PARAMETERS) };

function restoreSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return copy(defaults);
    const scenarios = copy(defaults.scenarios).map((scenario) => ({
      ...scenario,
      ...(saved.scenarios?.find((item) => item.id === scenario.id) ?? {}),
      mandatory: { ...scenario.mandatory, ...(saved.scenarios?.find((item) => item.id === scenario.id)?.mandatory ?? {}) },
    }));
    return {
      project: { ...copy(DEFAULT_PROJECT), ...saved.project },
      scenarios,
      weights: { ...copy(DEFAULT_WEIGHTS), ...saved.weights },
      architectureParameters: Object.fromEntries(ARCHITECTURES.map((architecture) => [architecture.id, {
        ...copy(DEFAULT_ARCHITECTURE_PARAMETERS[architecture.id]),
        ...(saved.architectureParameters?.[architecture.id] ?? {}),
      }])),
    };
  } catch {
    return copy(defaults);
  }
}

let state = restoreSavedState();
let activeScenarioId = "reference";
let lastOutput = null;
let activeStep = 1;

function activeScenario() {
  return state.scenarios.find((scenario) => scenario.id === activeScenarioId);
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Storage can be disabled by the browser. */ }
}

function fillScenarioSelect() {
  const select = $("#scenarioSelect");
  select.replaceChildren(...state.scenarios.map((scenario) => {
    const option = document.createElement("option");
    option.value = scenario.id;
    option.textContent = scenario.name;
    return option;
  }));
  select.value = activeScenarioId;
}

function loadForm() {
  for (const input of $$('[data-project]')) {
    const value = state.project[input.dataset.project];
    if (input.type === "checkbox") input.checked = Boolean(value);
    else input.value = value ?? "";
  }
  const scenario = activeScenario();
  for (const input of $$('[data-scenario]')) input.value = scenario[input.dataset.scenario];
  for (const input of $$('[data-mandatory]')) input.checked = Boolean(scenario.mandatory[input.dataset.mandatory]);
  for (const input of $$('[data-weight]')) input.value = state.weights[input.dataset.weight];
  for (const input of $$('[data-architecture-param]')) {
    const [architectureId, key] = input.dataset.architectureParam.split(":");
    input.value = state.architectureParameters[architectureId][key];
  }
  $("#scenarioDescription").textContent = `${scenario.description} · valores supuestos de simulacion.`;
  renderScenarioDelta();
}

function readForm() {
  const scenario = activeScenario();
  for (const input of $$('[data-scenario]')) scenario[input.dataset.scenario] = input.value === "" ? Number.NaN : Number(input.value);
  for (const input of $$('[data-mandatory]')) scenario.mandatory[input.dataset.mandatory] = input.checked;
  for (const input of $$('[data-project]')) {
    state.project[input.dataset.project] = input.type === "checkbox" ? input.checked : input.value;
  }
  for (const input of $$('[data-weight]')) state.weights[input.dataset.weight] = input.value === "" ? Number.NaN : Number(input.value);
  for (const input of $$('[data-architecture-param]')) {
    const [architectureId, key] = input.dataset.architectureParam.split(":");
    state.architectureParameters[architectureId][key] = input.value === "" ? Number.NaN : Number(input.value);
  }
  persist();
  return scenario;
}

function renderScenarioDelta() {
  const scenario = activeScenario();
  const referenceScenario = state.scenarios.find((item) => item.id === "reference");
  const keys = ["concurrentUsers", "requestsPerSecond", "networkLatencyMs", "monthlyBudgetCOP", "maxLatencyMs", "minPrivacyScore", "minAvailability"];
  const changed = keys.filter((key) => scenario.id !== "reference" && scenario[key] !== referenceScenario[key]);
  const labels = {
    concurrentUsers: ["Usuarios concurrentes", "personas"], requestsPerSecond: ["Solicitudes backend", "req/s"],
    networkLatencyMs: ["Latencia de red", "ms"], monthlyBudgetCOP: ["Presupuesto", "COP/mes"],
    maxLatencyMs: ["Latencia máxima", "ms"], minPrivacyScore: ["Privacidad mínima", "puntos"],
    minAvailability: ["Disponibilidad mínima", "%"],
  };
  const summary = $("#scenarioDelta");
  if (!summary) return;
  summary.textContent = scenario.id === "reference"
    ? "Escenario base. Los escenarios adicionales modifican las variables que se indican al seleccionarlos."
    : changed.length
      ? `Diferencias frente a Referencia: ${changed.map((key) => `${labels[key][0]} ${number.format(referenceScenario[key])} → ${number.format(scenario[key])} ${labels[key][1]}`).join(" · ")}.`
      : "Sin diferencias respecto al escenario Referencia.";
}

function goToStep(step) {
  const changed = activeStep !== step;
  activeStep = step;
  for (const panel of $$('[data-stage]')) panel.hidden = Number(panel.dataset.stage) !== step;
  for (const tab of $$("[data-step]")) {
    const selected = Number(tab.dataset.step) === step;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
  if (changed) window.scrollTo({ top: 0, behavior: "instant" });
}

function formatCapacity(value) {
  return new Intl.NumberFormat("es-CO", { minimumFractionDigits: Math.abs(value) < 1 ? 3 : 1, maximumFractionDigits: Math.abs(value) < 1 ? 3 : 1 }).format(value);
}

function formatCapacityPercent(value) {
  const roundedToTenth = Math.round(value * 10) / 10;
  return Math.abs(value - roundedToTenth) < 1e-7
    ? number.format(value)
    : new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(value);
}

function clearResults(message) {
  lastOutput = null;
  $("#resultStatus").textContent = message;
  $("#charts").replaceChildren();
  const empty = document.createElement("tr");
  const emptyCell = cell("Ejecuta la simulacion para ver resultados actuales.");
  emptyCell.colSpan = 10;
  empty.append(emptyCell);
  $("#resultRows").replaceChildren(empty);
  const recommendation = document.createElement("p");
  recommendation.textContent = "Sin recomendacion actual: ejecuta el escenario con las entradas vigentes.";
  $("#recommendation").replaceChildren(recommendation);
  $("#scenarioComparison").hidden = true;
  $("#scenarioRows").replaceChildren();
  $("#paretoFrontier").replaceChildren();
  $("#sensitivityResults").replaceChildren();
  $("#sensitivityResults").hidden = true;
  $("#exportButton").disabled = true;
}

function renderParameterInputs() {
  const host = $("#architectureParameters");
  for (const architecture of ARCHITECTURES) {
    const group = document.createElement("fieldset");
    group.className = "parameter-group";
    const legend = document.createElement("legend");
    legend.textContent = architecture.name;
    group.append(legend);
    for (const [key, label, min, max, step, unit] of [
      ["serviceRate", "Tasa por instancia", 0.1, 100000, 0.1, "solicitudes/s"],
      ["maxInstances", "Máximo de instancias", 1, 1000, 1, "instancias"],
      ["scalingEfficiency", "Eficiencia de escalado", 0.1, 1, 0.01, "factor 0,1-1 (1,0 neutral)"],
      ["baseCostCOP", "Infraestructura base", 0, 1000000000, 10000, "COP/mes"],
      ["instanceCostCOP", "Costo por instancia", 0, 1000000000, 10000, "COP/mes"],
    ]) {
      const field = document.createElement("label");
      field.textContent = `${label} (${unit})`;
      const input = document.createElement("input");
      input.type = "number";
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.dataset.architectureParam = `${architecture.id}:${key}`;
      input.required = true;
      field.append(input);
      group.append(field);
    }
    host.append(group);
  }
}

function renderParameterCatalog() {
  const host = $("#parameterCatalog");
  const table = document.createElement("table");
  const heading = document.createElement("thead");
  const header = document.createElement("tr");
  for (const label of ["Parámetro", "Clase", "Fuente / alcance"]) header.append(cell(label));
  heading.append(header);
  const body = document.createElement("tbody");
  for (const parameter of PARAMETER_CATALOG) {
    const row = document.createElement("tr");
    row.append(cell(parameter.label), cell(parameter.classification), cell(parameter.source));
    body.append(row);
  }
  table.append(heading, body);
  host.replaceChildren(table);
  $("#costAssumptions").textContent = `Costos en ${COST_ASSUMPTIONS.currency}; región: ${COST_ASSUMPTIONS.region}; referencia: ${COST_ASSUMPTIONS.referenceDate}. ${COST_ASSUMPTIONS.pricingSource}. Los costos se modelan como paquete fijo por arquitectura + costo mensual por instancia; aún no están desglosados por proveedor o servicio.`;
}

function showValidation(errors) {
  const box = $("#validationErrors");
  box.hidden = errors.length === 0;
  box.replaceChildren();
  if (!errors.length) return;
  const list = document.createElement("ul");
  for (const error of errors) {
    const item = document.createElement("li");
    item.textContent = error;
    list.append(item);
  }
  box.append(list);
}

function cell(text, className = "") {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function addMetricChart(host, title, field, format, higherIsBetter) {
  const values = lastOutput.results.map((result) => result[field]);
  const max = Math.max(...values, 1);
  const chart = document.createElement("div");
  chart.className = "metric-chart";
  const heading = document.createElement("h3");
  heading.textContent = title;
  chart.append(heading);
  for (const result of lastOutput.results) {
    const row = document.createElement("div");
    row.className = "chart-row";
    const name = document.createElement("span");
    name.className = "chart-name";
    name.textContent = result.architecture.name;
    const track = document.createElement("div");
    track.className = "chart-track";
    track.setAttribute("role", "img");
    track.setAttribute("aria-label", `${title}: ${format(result[field])}`);
    const bar = document.createElement("div");
    bar.className = "chart-fill";
    bar.style.width = `${Math.max(2, (result[field] / max) * 100)}%`;
    bar.dataset.better = String(higherIsBetter);
    track.append(bar);
    const value = document.createElement("span");
    value.className = "chart-value";
    value.textContent = format(result[field]);
    row.append(name, track, value);
    chart.append(row);
  }
  host.append(chart);
}

function renderRecommendation() {
  const host = $("#recommendation");
  host.replaceChildren();
  const decision = lastOutput.recommendation;
  if (!decision.winner) {
    const heading = document.createElement("h3");
    heading.textContent = "Sin alternativa viable";
    const explanation = document.createElement("p");
    explanation.textContent = decision.explanation;
    const review = document.createElement("button");
    review.type = "button";
    review.textContent = "Revisar escenario y restricciones";
    review.addEventListener("click", () => goToStep(2));
    host.append(heading, explanation, review);
    return;
  }
  const winner = decision.winner;
  const titleRow = document.createElement("div");
  titleRow.className = "winner-row";
  const heading = document.createElement("h3");
  heading.textContent = winner.architecture.name;
  const score = document.createElement("span");
  score.className = "score-badge";
  score.textContent = `${winner.score.toFixed(1)} / 100`;
  titleRow.append(heading, score);
  const explanation = document.createElement("p");
  explanation.textContent = `${decision.explanation} Puntaje relativo min-max entre alternativas elegibles, no porcentaje de calidad. La latencia que puntúa es el tiempo hasta que el resultado está disponible.`;
  const factors = document.createElement("ul");
  const factorNames = { latency: "latencia", capacity: "capacidad máxima teórica", cost: "costo", availability: "disponibilidad", privacy: "privacidad" };
  const weightTotal = Object.values(state.weights).reduce((sum, value) => sum + value, 0);
  const notes = [
    `Mayor contribución al puntaje: ${factorNames[decision.topCriterion]} (${decision.topContribution.toFixed(1)} de 100 puntos ponderados).`,
    `Costo ${currency.format(winner.monthlyCostCOP)}; latencia estimada ${number.format(winner.latencyMs)} ms; capacidad asignada ${number.format(winner.capacityRps)} de ${number.format(winner.maxCapacityRps)} req/s máximos.`,
    `Disponibilidad en serie ${winner.availabilityPercent.toFixed(2)}%; privacidad por criterios ${winner.privacyScore}/100.`,
    `Trade-off: ${winner.architecture.tradeoffs.join("; ")}. Supuestos: ${winner.architecture.assumptions}`,
  ];
  if (decision.singleEligible) notes.push("Solo hay una alternativa elegible: su puntuación neutral de 50 no permite compararla con alternativas descartadas.");
  for (const note of notes) {
    const item = document.createElement("li");
    item.textContent = note;
    factors.append(item);
  }
  for (const [criterion, contribution] of Object.entries(winner.scoreContributions).sort((a, b) => b[1] - a[1])) {
    const item = document.createElement("li");
    const effectiveWeight = weightTotal > 0 ? state.weights[criterion] / weightTotal * 100 : 0;
    item.textContent = `${factorNames[criterion]}: contribución ${contribution.toFixed(1)} pts; peso efectivo ${effectiveWeight.toFixed(1)}%; valor normalizado ${winner.scoreBreakdown[criterion].toFixed(1)}/100.`;
    factors.append(item);
  }
  const mandatoryChecks = winner.constraints.checks.filter((check) => check.mandatory);
  const checksItem = document.createElement("li");
  checksItem.textContent = mandatoryChecks.length
    ? `Restricciones obligatorias cumplidas: ${mandatoryChecks.filter((check) => check.passes).map((check) => check.label).join(", ") || "ninguna"}.`
    : "No se marcaron restricciones cuantitativas como obligatorias.";
  factors.append(checksItem);
  const criteriaParameters = {
    latency: ["processingMs", "networkHops", "queueLatency"],
    capacity: ["serviceRate", "maxInstances", "scalingEfficiency"],
    cost: ["cost"],
    availability: ["availability"],
    privacy: ["privacy"],
  };
  const evidenceKeys = [...new Set(Object.entries(winner.scoreContributions).filter(([, contribution]) => contribution > 0)
    .flatMap(([criterion]) => criteriaParameters[criterion]))];
  if (Object.values(winner.scoreContributions).some((contribution) => contribution > 0)) evidenceKeys.push("weights");
  const evidence = document.createElement("details");
  const evidenceSummary = document.createElement("summary");
  evidenceSummary.textContent = "Clase y fuente de los parámetros que influyeron";
  const evidenceList = document.createElement("ul");
  for (const key of evidenceKeys) {
    const source = PARAMETER_CATALOG.find((parameter) => parameter.key === key);
    if (!source) continue;
    const item = document.createElement("li");
    item.textContent = `${source.label} [${source.classification}]: ${source.source}`;
    evidenceList.append(item);
  }
  evidence.append(evidenceSummary, evidenceList);
  const rejected = decision.ineligible.map((result) => `${result.architecture.name}: ${result.constraints.reasons.join("; ")}`).join(" | ");
  if (rejected) {
    const item = document.createElement("li");
    item.textContent = `No elegibles: ${rejected}`;
    factors.append(item);
  }
  for (const alternative of lastOutput.results.filter((result) => result.constraints.eligible && result.architecture.id !== winner.architecture.id)) {
    const item = document.createElement("li");
    const winnerMaximum = winner.architecture.serviceRate * winner.architecture.maxInstances;
    const alternativeMaximum = alternative.architecture.serviceRate * alternative.architecture.maxInstances;
    if (alternativeMaximum > winnerMaximum) {
      item.textContent = `${alternative.architecture.name} puede ser preferible si la carga pico supera ${winnerMaximum} solicitudes/s, se acepta su modelo de despliegue y el presupuesto permite escalar (capacidad maxima supuesta: ${alternativeMaximum} solicitudes/s).`;
    } else if (alternative.latencyMs < winner.latencyMs) {
      item.textContent = `${alternative.architecture.name} puede ser preferible si se prioriza latencia y su costo estimado cabe en el presupuesto.`;
    } else if (alternative.availabilityPercent > winner.availabilityPercent || alternative.privacyScore > winner.privacyScore) {
      item.textContent = `${alternative.architecture.name} puede ser preferible si disponibilidad o privacidad ganan prioridad y se aceptan sus costos y latencia estimados.`;
    } else {
      item.textContent = `${alternative.architecture.name} puede resultar preferible al cambiar carga, restricciones obligatorias o ponderaciones.`;
    }
    if (alternative.architecture.id === "event-driven") item.textContent += " Requiere aceptar procesamiento asincrono y latencia de cola.";
    factors.append(item);
  }
  host.append(titleRow, explanation, factors, evidence);
}

function renderTraceCell(trace, recommended) {
  const cellElement = document.createElement("td");
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = recommended ? "Ver traza · recomendada" : "Ver traza";
  const steps = document.createElement("ol");
  for (const step of trace) {
    const item = document.createElement("li");
    const label = document.createElement("strong");
    label.textContent = step.label;
    const formula = document.createElement("code");
    formula.textContent = step.formula;
    const substitution = document.createElement("span");
    substitution.textContent = `Sustitución: ${step.substitution}`;
    const result = document.createElement("span");
    result.textContent = `Resultado: ${step.result}`;
    item.append(label, formula, substitution, result);
    if (step.evidence) {
      const evidence = document.createElement("small");
      evidence.textContent = `Respaldo: ${step.evidence}`;
      item.append(evidence);
    }
    steps.append(item);
  }
  details.append(summary, steps);
  cellElement.append(details);
  return cellElement;
}

function renderResults() {
  const rows = $("#resultRows");
  rows.replaceChildren();
  const decision = lastOutput.recommendation;
  const ranked = new Map(decision.ranked.map((result) => [result.architecture.id, result]));
  for (const result of lastOutput.results) {
    const mandatory = result.constraints.checks.filter((check) => check.mandatory).map((check) => `${check.label}: ${check.passes ? "cumple" : "incumple"}`);
    if (state.project.requireIndependentScaling) mandatory.push(`Escalado independiente: ${result.architecture.independentScaling ? "cumple" : "incumple"}`);
    if (state.project.realTimeRequired) mandatory.push(`Tiempo real: ${result.architecture.realTime ? "cumple" : "incumple"}`);
    if (!state.project.eventBrokerAllowed) mandatory.push(`Broker prohibido: ${result.architecture.id !== "event-driven" ? "cumple" : "incumple"}`);
    const row = document.createElement("tr");
    const score = ranked.get(result.architecture.id)?.score;
    const recommended = decision.winner?.architecture.id === result.architecture.id;
    if (recommended) row.classList.add("recommended-row");
    row.append(cell(result.architecture.name));
    row.append(cell(result.architecture.id === "event-driven"
      ? `${number.format(result.acceptanceLatencyMs)} ms acuse / ${number.format(result.completionLatencyMs)} ms disponible`
      : `${number.format(result.completionLatencyMs)} ms aceptación y resultado`));
    row.append(cell(`${number.format(result.capacityRps)} asignada / ${number.format(result.maxCapacityRps)} max req/s`));
    row.append(cell(`${number.format(result.utilizationPercent)}% asignada / ${formatCapacityPercent(result.maxCapacityUtilizationPercent)}% max`));
    const headroom = result.capacityHeadroomRps;
    const marginCell = cell(headroom >= 0 ? `${formatCapacity(headroom)} req/s libres` : `${formatCapacity(Math.abs(headroom))} req/s de déficit`, result.saturated ? "ineligible" : "eligible");
    const saturation = document.createElement("small");
    saturation.textContent = result.saturated ? "SATURADO" : "NO SATURADO";
    marginCell.append(saturation);
    row.append(marginCell);
    row.append(cell(currency.format(result.monthlyCostCOP)));
    const quality = cell(`${result.availabilityPercent.toFixed(2)}% disponibilidad`);
    const privacy = document.createElement("small");
    privacy.textContent = `${result.privacyScore} / 100 índice heurístico`;
    quality.append(privacy);
    row.append(quality);
    const eligibility = cell(result.constraints.eligible ? "ELEGIBLE" : "NO ELEGIBLE", result.constraints.eligible ? "eligible" : "ineligible");
    const reasons = document.createElement("small");
    reasons.textContent = result.constraints.reasons.length ? result.constraints.reasons.join("; ") : mandatory.join(" · ") || "Sin restricciones obligatorias";
    eligibility.append(reasons);
    row.append(eligibility, cell(score == null ? "—" : `${score.toFixed(1)} / 100`, score == null ? "ineligible" : ""), renderTraceCell(result.calculationTrace, recommended));
    rows.append(row);
  }
  renderRecommendation();
  const charts = $("#charts");
  charts.replaceChildren();
  addMetricChart(charts, "Latencia de resultado disponible estimada · ms", "completionLatencyMs", (value) => `${number.format(value)} ms`, false);
  addMetricChart(charts, "Uso de capacidad máxima modelada · %", "maxCapacityUtilizationPercent", (value) => `${value.toFixed(2)}%`, false);
  renderParetoFrontier();
  $("#resultStatus").textContent = `Calculado para ${activeScenario().name}; carga pico ${number.format(lastOutput.results[0].peakRequestsPerSecond)} solicitudes/s. Todas las alternativas recibieron las mismas entradas.`;
  $("#exportButton").disabled = false;
}

function renderParetoFrontier() {
  const host = $("#paretoFrontier");
  host.replaceChildren();
  const { frontier, dominated, ineligible } = computeParetoFrontier(lastOutput.results);
  if (!frontier.length) {
    const empty = document.createElement("p");
    empty.textContent = "No hay alternativas elegibles para formar una frontera Pareto.";
    host.append(empty);
    return;
  }
  const svgNamespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNamespace, "svg");
  svg.setAttribute("viewBox", "0 0 680 340");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Frontera Pareto de costo mensual contra capacidad máxima modelada");
  const left = 78, right = 635, top = 26, bottom = 278;
  const costs = lastOutput.results.map((result) => result.monthlyCostCOP);
  const capacities = lastOutput.results.map((result) => result.maxCapacityRps);
  const minCost = Math.min(...costs), maxCost = Math.max(...costs);
  const minCapacity = Math.min(...capacities), maxCapacity = Math.max(...capacities);
  const x = (value) => left + (value - minCost) / Math.max(1, maxCost - minCost) * (right - left);
  const y = (value) => bottom - (value - minCapacity) / Math.max(1, maxCapacity - minCapacity) * (bottom - top);
  const add = (name, attributes, text) => {
    const element = document.createElementNS(svgNamespace, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    if (text) element.textContent = text;
    svg.append(element);
    return element;
  };
  add("line", { x1: left, y1: bottom, x2: right, y2: bottom, stroke: "#7d8998" });
  add("line", { x1: left, y1: top, x2: left, y2: bottom, stroke: "#7d8998" });
  add("text", { x: (left + right) / 2, y: 322, fill: "#91a9a9", "text-anchor": "middle", "font-size": 12 }, "Costo ilustrativo (COP/mes) · menor es mejor");
  add("text", { x: 18, y: (top + bottom) / 2, fill: "#91a9a9", "text-anchor": "middle", "font-size": 12, transform: `rotate(-90 18 ${(top + bottom) / 2})` }, "Capacidad máxima modelada (req/s) · mayor es mejor");
  for (const result of lastOutput.results) {
    const pareto = frontier.includes(result);
    const eligible = result.constraints.eligible;
    const cx = x(result.monthlyCostCOP), cy = y(result.maxCapacityRps);
    const point = add("circle", {
      cx, cy, r: pareto ? 8 : 6,
      fill: !eligible ? "#ff4d5a" : pareto ? "#00e5ff" : "#7d8998",
      stroke: "#030407", "stroke-width": 2,
    });
    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = `${result.architecture.name}: ${currency.format(result.monthlyCostCOP)}, ${number.format(result.maxCapacityRps)} req/s; ${!eligible ? "no elegible" : pareto ? "frontera" : "dominada"}`;
    point.append(title);
    add("text", { x: cx + 10, y: cy - 9, fill: eligible ? "#f8fafc" : "#ff969e", "font-size": 11 }, result.architecture.name);
  }
  const summary = document.createElement("p");
  summary.textContent = `Frontera no ponderada: ${frontier.map((result) => result.architecture.name).join(", ")}. Dominadas: ${dominated.map((result) => result.architecture.name).join(", ") || "ninguna"}. No elegibles: ${ineligible.map((result) => result.architecture.name).join(", ") || "ninguna"}.`;
  host.append(svg, summary);
}

function runWeightSensitivity() {
  if (!lastOutput) return;
  const result = analyzeWeightSensitivity(state.project, lastOutput.scenario, state.weights, state.architectureParameters);
  const host = $("#sensitivityResults");
  host.replaceChildren();
  const table = document.createElement("table");
  const body = document.createElement("tbody");
  const header = document.createElement("tr");
  for (const label of ["Criterio", "Peso actual", "Ganador al 0%", "Ganador al 100%", "¿Cambia respecto a hoy?"]) header.append(cell(label));
  table.append(header);
  const name = (id) => ARCHITECTURES.find((architecture) => architecture.id === id)?.name ?? "Ninguna opción";
  for (const item of result.criteria) {
    const row = document.createElement("tr");
    row.append(cell(item.criterion), cell(`${item.currentWeight}%`), cell(name(item.winnerAtZero)), cell(name(item.winnerAtHundred)), cell(item.changesAtZero || item.changesAtHundred ? "Sí" : "No"));
    body.append(row);
  }
  table.append(body);
  const note = document.createElement("p");
  note.textContent = `Ganador de referencia: ${name(result.baselineWinner)}. Se varia un peso cada vez y los demas se redistribuyen proporcionalmente; esto explora preferencias de este escenario, no robustez universal.`;
  host.append(note, table);
  host.hidden = false;
}

function runSimulation() {
  const scenario = readForm();
  const output = simulateScenario(state.project, scenario, state.weights, state.architectureParameters);
  showValidation(output.errors);
  if (output.errors.length) {
    clearResults("Entradas invalidas. Corrige los campos indicados; no se muestran resultados de una ejecucion anterior.");
    return false;
  }
  lastOutput = { scenario: copy(scenario), ...output };
  renderResults();
  return true;
}

function renderScenarioComparison() {
  const host = $("#scenarioRows");
  host.replaceChildren();
  const results = evaluateScenarios(state.project, state.scenarios, state.weights, state.architectureParameters);
  for (const item of results) {
    const row = document.createElement("tr");
    row.append(cell(item.scenario.name));
    row.append(cell(item.errors.length ? "Entradas invalidas" : `${number.format(item.results[0].peakRequestsPerSecond)} req/s`));
    row.append(cell(item.recommendation?.winner?.architecture.name ?? "Sin alternativa viable", item.recommendation?.winner ? "eligible" : "ineligible"));
    row.append(cell(item.recommendation?.winner ? `${item.recommendation.winner.score.toFixed(1)} / 100` : "—"));
    row.append(cell(`${item.results.filter((result) => result.constraints.eligible).length} / ${item.results.length}`));
    host.append(row);
  }
  $("#scenarioComparison").hidden = false;
}

function renderArchitectureDetails() {
  const host = $("#architectureDetails");
  for (const architecture of ARCHITECTURES) {
    const card = document.createElement("article");
    card.className = "architecture-card";
    const heading = document.createElement("h3");
    heading.textContent = architecture.name;
    const summary = document.createElement("p");
    summary.textContent = architecture.summary;
    card.append(heading, summary);
    for (const [title, values] of [
      ["Componentes", architecture.components],
      ["Flujo", [architecture.flow]],
      ["Despliegue", [architecture.deployment]],
      ["Ventajas", architecture.advantages],
      ["Limitaciones", architecture.tradeoffs],
      ["Supuestos", [architecture.assumptions]],
    ]) {
      const label = document.createElement("h4");
      label.textContent = title;
      const list = document.createElement("ul");
      for (const value of values) {
        const item = document.createElement("li");
        item.textContent = value;
        list.append(item);
      }
      card.append(label, list);
    }
    host.append(card);
  }
}

function renderTests() {
  const tests = [
    ["P01", "Entradas validas / resultados completos"], ["P02", "Entradas fuera de rango rechazadas"],
    ["P03", "Incremento de carga modifica indicadores"], ["P04", "Restriccion obligatoria excluye"],
    ["P05", "Prioridades modifican puntajes y decision"], ["P06", "Resultados reproducibles"],
    ["P07", "Comparacion con entradas equivalentes"], ["P08", "Cambio de escenario recalcula"],
    ["P09", "Escalado independiente excluye monolito"], ["P10", "Broker prohibido excluye eventos"],
    ["P11", "Indicadores de capacidad coherentes"], ["P12", "Contribuciones suman puntaje"],
    ["P13", "Ponderaciones inválidas rechazadas"],
    ["P14", "Detalles de restricciones coherentes"],
    ["P15", "Salto de latencia por escalado instantáneo"], ["P16", "Demanda cercana e igual al máximo"],
    ["P17", "Concurrencia aislada incrementa demanda"], ["P18", "Ganador claro según prioridad"],
    ["P19", "Puntuaciones similares informadas"], ["P20", "Límites de entrada aceptados"],
    ["P21", "Parámetros arquitectónicos validados"], ["P22", "Disponibilidad con componentes nombrados"],
    ["P23", "Atributos de privacidad afectan índice"], ["P24", "Requisitos dejan una opción elegible"],
    ["P25", "Supuestos editables recalculan alternativa"],
    ["P26", "Restricciones iguales para las arquitecturas"],
    ["P27", "Eficiencia neutral conserva resultados"], ["P28", "Pesos normalizados y Pareto no ponderado"],
    ["P29", "Acuse y resultado usan latencias distintas"], ["P30", "Sensibilidad recalcula preferencias"],
    ["P31", "Menor eficiencia reduce capacidad"], ["P32", "Acuse no afecta score de latencia"],
    ["P33", "Pareto excluye alternativas inviables"],
    ["P34", "Traza coincide con motor en escenarios"], ["P35", "Traza completa por alternativa"],
    ["P36", "Metadatos no alteran cálculos"],
  ];
  const host = $("#testList");
  for (const [id, description] of tests) {
    const item = document.createElement("div");
    item.className = "test-item";
    const label = document.createElement("span");
    label.textContent = `${id} · ${description}`;
    const status = document.createElement("strong");
    status.textContent = "CASO DOCUMENTADO";
    item.append(label, status);
    host.append(item);
  }
}

function exportResults() {
  if (!lastOutput) return;
  const payload = {
    generatedAt: new Date().toISOString(),
    note: "Simulación académica determinista con parámetros del equipo; no son mediciones ni validación experimental.",
    project: state.project,
    weights: state.weights,
    normalizedWeights: lastOutput.recommendation.normalizedWeights,
    architectureParameters: state.architectureParameters,
    parameterCatalog: PARAMETER_CATALOG,
    costAssumptions: COST_ASSUMPTIONS,
    scenario: lastOutput.scenario,
    results: lastOutput.results.map((result) => ({
      architecture: result.architecture.name,
      instances: result.instances,
      peakRequestsPerSecond: result.peakRequestsPerSecond,
      capacityRps: result.capacityRps,
      maxCapacityRps: result.maxCapacityRps,
      utilizationPercent: result.utilizationPercent,
      maxCapacityUtilizationPercent: result.maxCapacityUtilizationPercent,
      capacityHeadroomRps: result.capacityHeadroomRps,
      saturated: result.saturated,
      scalingEfficiency: result.architecture.scalingEfficiency,
      acceptanceLatencyMs: result.acceptanceLatencyMs,
      completionLatencyMs: result.completionLatencyMs,
      latencyComponents: result.latencyComponents,
      latencyMs: result.latencyMs,
      monthlyCostCOP: result.monthlyCostCOP,
      availabilityPercent: result.availabilityPercent,
      privacyScore: result.privacyScore,
      privacyCriteria: result.privacyCriteria,
      availabilityComponents: result.availabilityComponents,
      constraints: result.constraints,
      score: lastOutput.recommendation.ranked.find((ranked) => ranked.architecture.id === result.architecture.id)?.score ?? null,
      scoreBreakdown: lastOutput.recommendation.ranked.find((ranked) => ranked.architecture.id === result.architecture.id)?.scoreBreakdown ?? null,
      scoreContributions: lastOutput.recommendation.ranked.find((ranked) => ranked.architecture.id === result.architecture.id)?.scoreContributions ?? null,
      calculationTrace: result.calculationTrace,
    })),
    recommendation: {
      winner: lastOutput.recommendation.winner?.architecture.name ?? null,
      explanation: lastOutput.recommendation.explanation,
      singleEligible: lastOutput.recommendation.singleEligible,
      relativeScoresOnly: true,
    },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `kinet-architecture-${activeScenarioId}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function resetAll() {
  state = copy(defaults);
  activeScenarioId = "reference";
  localStorage.removeItem(STORAGE_KEY);
  fillScenarioSelect();
  loadForm();
  $("#scenarioComparison").hidden = true;
  $("#scenarioRows").replaceChildren();
  $("#paretoFrontier").replaceChildren();
  $("#sensitivityResults").replaceChildren();
  $("#sensitivityResults").hidden = true;
  $("#resultStatus").textContent = "Supuestos originales restaurados; ejecuta el escenario para calcular.";
  $("#recommendation").innerHTML = "<p>La recomendacion aparecera despues del calculo.</p>";
  $("#charts").replaceChildren();
  $("#resultRows").innerHTML = '<tr><td colspan="10">Sin resultados calculados.</td></tr>';
  $("#exportButton").disabled = true;
  showValidation([]);
  lastOutput = null;
  goToStep(1);
}

fillScenarioSelect();
renderParameterInputs();
loadForm();
renderArchitectureDetails();
renderTests();
renderParameterCatalog();
goToStep(1);

$("#scenarioSelect").addEventListener("change", (event) => {
  readForm();
  activeScenarioId = event.target.value;
  loadForm();
  showValidation([]);
  clearResults("Escenario cambiado; ejecuta el modelo para calcular resultados actuales.");
});
$("#runButton").addEventListener("click", () => { if (runSimulation()) goToStep(3); });
$("#compareButton").addEventListener("click", () => { readForm(); renderScenarioComparison(); });
$("#runSensitivityButton").addEventListener("click", runWeightSensitivity);
$("#resetButton").addEventListener("click", resetAll);
$("#exportButton").addEventListener("click", exportResults);
for (const tab of $$("[data-step]")) tab.addEventListener("click", () => goToStep(Number(tab.dataset.step)));
$(".section-nav").addEventListener("keydown", (event) => {
  const current = event.target.closest("[data-step]");
  if (!current || !["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(event.key)) return;
  event.preventDefault();
  const tabs = $$("[data-step]");
  const direction = ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1;
  const index = (tabs.indexOf(current) + direction + tabs.length) % tabs.length;
  tabs[index].focus();
  goToStep(Number(tabs[index].dataset.step));
});
for (const button of $$('[data-go-step]')) button.addEventListener("click", () => goToStep(Number(button.dataset.goStep)));
for (const input of $$('[data-scenario], [data-project], [data-mandatory], [data-weight], [data-architecture-param]')) {
  input.addEventListener("input", () => {
    readForm();
    showValidation([]);
    clearResults("Entradas modificadas; ejecuta la simulacion para actualizar los resultados.");
  });
  input.addEventListener("change", () => { readForm(); });
}