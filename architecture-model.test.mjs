import test from "node:test";
import assert from "node:assert/strict";
import {
  ARCHITECTURES,
  DEFAULT_ARCHITECTURE_PARAMETERS,
  DEFAULT_PROJECT,
  DEFAULT_WEIGHTS,
  SCENARIOS,
  analyzeWeightSensitivity,
  computeParetoFrontier,
  evaluateScenarios,
  recommend,
  simulateArchitecture,
  simulateScenario,
} from "./architecture-model.mjs";

const reference = SCENARIOS[0];
const run = (scenario = reference, project = DEFAULT_PROJECT, weights = DEFAULT_WEIGHTS, parameters = DEFAULT_ARCHITECTURE_PARAMETERS) => simulateScenario(project, scenario, weights, parameters);

test("P01: entradas válidas producen indicadores completos para tres arquitecturas", () => {
  const result = run();
  assert.deepEqual(result.errors, []);
  assert.equal(result.results.length, 3);
  for (const architecture of result.results) {
    assert.ok(architecture.latencyMs > 0);
    assert.ok(architecture.capacityRps > 0);
    assert.ok(architecture.maxCapacityRps >= architecture.capacityRps);
    assert.ok(Number.isFinite(architecture.capacityHeadroomRps));
    assert.ok(architecture.monthlyCostCOP > 0);
    assert.ok(architecture.availabilityPercent > 0);
    assert.ok(architecture.privacyScore >= 0);
  }
});

test("P02: entradas fuera de rango se rechazan antes del cálculo", () => {
  const invalid = { ...reference, concurrentUsers: -1, requestsPerSecond: 0, monthlyBudgetCOP: -5 };
  const result = run(invalid);
  assert.equal(result.results.length, 0);
  assert.ok(result.errors.length >= 3);
});

test("P03: más demanda modifica capacidad, utilización, costo y latencia", () => {
  const low = run({ ...reference, concurrentUsers: 10, requestsPerSecond: 2 });
  const high = run({ ...reference, concurrentUsers: 1600, requestsPerSecond: 260 });
  for (let index = 0; index < ARCHITECTURES.length; index += 1) {
    assert.ok(high.results[index].capacityRps >= low.results[index].capacityRps);
    assert.ok(high.results[index].monthlyCostCOP > low.results[index].monthlyCostCOP);
    assert.ok(high.results[index].utilizationPercent > low.results[index].utilizationPercent);
    assert.ok(high.results[index].latencyMs > low.results[index].latencyMs);
  }
});

test("P04: una restricción obligatoria excluye alternativas que no la cumplen", () => {
  const result = run({ ...reference, monthlyBudgetCOP: 1, mandatory: { ...reference.mandatory, budget: true } });
  assert.ok(result.results.every((architecture) => !architecture.constraints.eligible));
  assert.equal(result.recommendation.winner, null);
});

test("P05: cambiar prioridades cambia los puntajes según los indicadores", () => {
  const busy = { ...reference, concurrentUsers: 1200, requestsPerSecond: 180, monthlyBudgetCOP: 9000000, maxLatencyMs: 10000, minAvailability: 90, minPrivacyScore: 0 };
  const costPriority = { latency: 0, capacity: 0, cost: 100, availability: 0, privacy: 0 };
  const latencyPriority = { latency: 100, capacity: 0, cost: 0, availability: 0, privacy: 0 };
  const costResult = run(busy, DEFAULT_PROJECT, costPriority);
  const latencyResult = run(busy, DEFAULT_PROJECT, latencyPriority);
  assert.notEqual(costResult.recommendation.winner.architecture.id, latencyResult.recommendation.winner.architecture.id);
});

test("P06: la misma entrada produce resultados reproducibles", () => {
  assert.deepEqual(run(), run());
});

test("P07: las arquitecturas comparten las mismas entradas de escenario", () => {
  const { results } = run();
  assert.equal(new Set(results.map((result) => result.peakRequestsPerSecond)).size, 1);
});

test("P08: los cuatro escenarios se recalculan con sus respectivas cargas", () => {
  const results = evaluateScenarios(DEFAULT_PROJECT, SCENARIOS);
  assert.equal(results.length, 4);
  assert.ok(results.every((result) => result.results.length === 3));
  assert.notEqual(results[0].results[0].peakRequestsPerSecond, results[1].results[0].peakRequestsPerSecond);
});

test("P09: el requisito de escalado independiente excluye el monolito", () => {
  const result = run(reference, { ...DEFAULT_PROJECT, requireIndependentScaling: true });
  assert.equal(result.results.find((item) => item.architecture.id === "monolith").constraints.eligible, false);
});

test("P10: la restriccion de no usar broker excluye la arquitectura orientada a eventos", () => {
  const result = run(reference, { ...DEFAULT_PROJECT, eventBrokerAllowed: false });
  assert.equal(result.results.find((item) => item.architecture.id === "event-driven").constraints.eligible, false);
});

test("P11: capacidad asignada, maxima, utilizacion y margen son coherentes", () => {
  const { results } = run();
  for (const result of results) {
    assert.equal(result.capacityRps, result.instances * result.architecture.serviceRate);
    assert.equal(result.maxCapacityRps, result.architecture.maxInstances * result.architecture.serviceRate);
    assert.equal(result.capacityHeadroomRps, result.maxCapacityRps - result.peakRequestsPerSecond);
    assert.equal(result.maxCapacityUtilizationPercent, result.peakRequestsPerSecond / result.maxCapacityRps * 100);
    assert.equal(result.saturated, result.peakRequestsPerSecond >= result.maxCapacityRps);
    assert.ok(result.capacityRps <= result.maxCapacityRps);
  }
});

test("P12: las contribuciones ponderadas suman el puntaje final", () => {
  const { recommendation } = run();
  for (const result of recommendation.ranked) {
    const total = Object.values(result.scoreContributions).reduce((sum, value) => sum + value, 0);
    assert.ok(Math.abs(total - result.score) < 1e-10);
  }
});

test("P13: ponderaciones invalidas no producen puntajes", () => {
  const zeroWeights = { latency: 0, capacity: 0, cost: 0, availability: 0, privacy: 0 };
  const excessiveWeight = { ...DEFAULT_WEIGHTS, latency: 101 };
  assert.ok(run(reference, DEFAULT_PROJECT, zeroWeights).errors.length > 0);
  assert.ok(run(reference, DEFAULT_PROJECT, excessiveWeight).errors.length > 0);
});

test("P14: el detalle de restricciones usa signos coherentes con cumplimiento", () => {
  const valid = run();
  for (const result of valid.results) {
    assert.ok(result.constraints.checks.filter((check) => check.mandatory).every((check) => check.passes));
    assert.ok(result.constraints.checks.filter((check) => ["budget", "latency", "privacy", "availability"].includes(check.key))
      .every((check) => check.detail.includes("<=") || check.detail.includes(">=")));
  }
  const constrained = run({ ...reference, monthlyBudgetCOP: 1 });
  const budget = constrained.results[0].constraints.checks.find((check) => check.key === "budget");
  assert.equal(budget.passes, false);
  assert.ok(budget.detail.includes("> 1 COP"));
});

test("P15: el escalado instantaneo puede bajar la latencia al cruzar el umbral", () => {
  const scenario = { ...reference, concurrentUsers: 1, networkLatencyMs: 24 };
  const before = run({ ...scenario, requestsPerSecond: 49 }).results[0];
  const after = run({ ...scenario, requestsPerSecond: 51 }).results[0];
  assert.ok(after.peakRequestsPerSecond > before.peakRequestsPerSecond);
  assert.equal(before.instances, 1);
  assert.equal(after.instances, 2);
  assert.ok(after.utilizationPercent < before.utilizationPercent);
  assert.ok(after.latencyMs < before.latencyMs);
});

test("P16: demanda proxima, igual y superior al maximo refleja margen y saturacion", () => {
  const concurrentUsers = 80;
  const peakFactor = 1 + concurrentUsers / 200;
  for (const architecture of ARCHITECTURES) {
    const maximum = architecture.serviceRate * architecture.maxInstances;
    const runAtPeak = (peak) => run({ ...reference, concurrentUsers, requestsPerSecond: peak / peakFactor })
      .results.find((result) => result.architecture.id === architecture.id);
    const near = runAtPeak(maximum - 0.1);
    const exact = runAtPeak(maximum);
    const above = runAtPeak(maximum + 0.1);
    assert.ok(near.capacityHeadroomRps > 0);
    assert.equal(near.saturated, false);
    assert.ok(Math.abs(exact.peakRequestsPerSecond - maximum) < 1e-10);
    assert.equal(exact.saturated, true);
    assert.ok(exact.capacityHeadroomRps <= 1e-10);
    assert.equal(above.saturated, true);
    assert.ok(above.capacityHeadroomRps < 0);
    assert.ok(above.latencyMs > exact.latencyMs);
  }
});

test("P17: con frecuencia fija, mas concurrencia eleva demanda y utilizacion", () => {
  const low = run({ ...reference, concurrentUsers: 1, requestsPerSecond: 2 });
  const high = run({ ...reference, concurrentUsers: 80, requestsPerSecond: 2 });
  for (let index = 0; index < ARCHITECTURES.length; index += 1) {
    assert.equal(high.results[index].instances, low.results[index].instances);
    assert.ok(high.results[index].peakRequestsPerSecond > low.results[index].peakRequestsPerSecond);
    assert.ok(high.results[index].utilizationPercent > low.results[index].utilizationPercent);
    assert.ok(high.results[index].latencyMs > low.results[index].latencyMs);
  }
});

test("P18: al priorizar costo, la alternativa mas economica gana claramente", () => {
  const weights = { latency: 0, capacity: 0, cost: 100, availability: 0, privacy: 0 };
  const result = run(reference, DEFAULT_PROJECT, weights);
  assert.equal(result.recommendation.winner.architecture.id, "monolith");
  assert.equal(result.recommendation.winner.score, 100);
  assert.equal(result.recommendation.close, false);
});

test("P19: priorizar capacidad maxima identifica puntuaciones empatadas", () => {
  const weights = { latency: 0, capacity: 100, cost: 0, availability: 0, privacy: 0 };
  const result = run(reference, DEFAULT_PROJECT, weights);
  assert.equal(result.recommendation.ranked[0].score, result.recommendation.ranked[1].score);
  assert.equal(result.recommendation.close, true);
});

test("P20: los limites inferiores y superiores de entrada son aceptados", () => {
  const minimum = { ...reference, concurrentUsers: 1, requestsPerSecond: 0.1, networkLatencyMs: 0, monthlyBudgetCOP: 0, maxLatencyMs: 50, minPrivacyScore: 0, minAvailability: 90 };
  const maximum = { ...reference, concurrentUsers: 100000, requestsPerSecond: 10000, networkLatencyMs: 2000, monthlyBudgetCOP: 1000000000, maxLatencyMs: 10000, minPrivacyScore: 100, minAvailability: 99.99 };
  assert.deepEqual(run(minimum).errors, []);
  assert.deepEqual(run(maximum).errors, []);
});

test("P21: parametros de arquitectura fuera de rango o no enteros se rechazan", () => {
  const invalidRate = { ...DEFAULT_ARCHITECTURE_PARAMETERS, monolith: { ...DEFAULT_ARCHITECTURE_PARAMETERS.monolith, serviceRate: 0 } };
  const invalidInstances = { ...DEFAULT_ARCHITECTURE_PARAMETERS, monolith: { ...DEFAULT_ARCHITECTURE_PARAMETERS.monolith, maxInstances: 1.5 } };
  assert.ok(run(reference, DEFAULT_PROJECT, DEFAULT_WEIGHTS, invalidRate).errors.length > 0);
  assert.ok(run(reference, DEFAULT_PROJECT, DEFAULT_WEIGHTS, invalidInstances).errors.length > 0);
});

test("P22: cada disponibilidad corresponde a un componente critico nombrado", () => {
  for (const architecture of ARCHITECTURES) {
    assert.deepEqual(architecture.availabilityComponents.map((component) => component.name), architecture.criticalComponents);
    assert.ok(architecture.availabilityComponents.every((component) => component.availability > 0 && component.availability <= 1));
  }
});

test("P23: desactivar cifrado asumido reduce el indice heuristico en 20 puntos", () => {
  const architecture = ARCHITECTURES[0];
  const baseline = simulateArchitecture(DEFAULT_PROJECT, reference, architecture);
  const withoutEncryption = simulateArchitecture(DEFAULT_PROJECT, reference, {
    ...architecture,
    privacy: { ...architecture.privacy, encryptedInTransit: false },
  });
  assert.equal(baseline.privacyScore - withoutEncryption.privacyScore, 20);
});

test("P24: requisitos combinados pueden dejar una sola alternativa elegible", () => {
  const project = { ...DEFAULT_PROJECT, requireIndependentScaling: true, realTimeRequired: true };
  const result = run(reference, project);
  assert.equal(result.recommendation.ranked.length, 1);
  assert.equal(result.recommendation.winner.architecture.id, "microservices");
  assert.equal(result.recommendation.winner.constraints.eligible, true);
});

test("P25: supuestos editables cambian capacidad y costo solo en su arquitectura", () => {
  const parameters = {
    ...DEFAULT_ARCHITECTURE_PARAMETERS,
    monolith: { ...DEFAULT_ARCHITECTURE_PARAMETERS.monolith, serviceRate: 60, maxInstances: 5, baseCostCOP: 200000, instanceCostCOP: 170000 },
  };
  const result = run(reference, DEFAULT_PROJECT, DEFAULT_WEIGHTS, parameters);
  const monolith = result.results.find((item) => item.architecture.id === "monolith");
  const microservices = result.results.find((item) => item.architecture.id === "microservices");
  assert.equal(monolith.maxCapacityRps, 300);
  assert.equal(monolith.monthlyCostCOP, 370000);
  assert.equal(microservices.maxCapacityRps, 280);
  assert.equal(microservices.monthlyCostCOP, 750000);
});

test("P26: las arquitecturas comparten las mismas reglas obligatorias de escenario", () => {
  const { results } = run();
  const requiredChecks = (result) => result.constraints.checks.map(({ key, mandatory }) => ({ key, mandatory }));
  assert.deepEqual(requiredChecks(results[1]), requiredChecks(results[0]));
  assert.deepEqual(requiredChecks(results[2]), requiredChecks(results[0]));
});

test("P27: eficiencia de escalado 1.0 conserva exactamente la salida base", () => {
  for (const architecture of ARCHITECTURES) {
     const { scalingEfficiency, ...legacyArchitecture } = architecture;
     const legacy = simulateArchitecture(DEFAULT_PROJECT, reference, legacyArchitecture);
     const neutral = simulateArchitecture(DEFAULT_PROJECT, reference, { ...architecture, scalingEfficiency: 1 });
     const { architecture: ignoredLegacy, ...legacyMetrics } = legacy;
     const { architecture: ignoredNeutral, ...neutralMetrics } = neutral;
     assert.deepEqual(neutralMetrics, legacyMetrics);
  }
});

test("P28: pesos normalizados suman uno y una frontera pareto no usa ponderaciones", () => {
  const result = run();
  const normalizedTotal = Object.values(result.recommendation.normalizedWeights).reduce((sum, weight) => sum + weight, 0);
  assert.ok(Math.abs(normalizedTotal - 1) < 1e-12);
  const frontier = computeParetoFrontier(result.results);
  assert.deepEqual(frontier.frontier.map((item) => item.architecture.id).sort(), ["microservices", "monolith"]);
  assert.deepEqual(frontier.dominated.map((item) => item.architecture.id), ["event-driven"]);
});

test("P29: aceptación de eventos y resultado disponible son latencias distintas", () => {
  const { results } = run();
  const synchronous = results.filter((result) => result.architecture.id !== "event-driven");
  const events = results.find((result) => result.architecture.id === "event-driven");
  assert.ok(synchronous.every((result) => result.acceptanceLatencyMs === result.completionLatencyMs));
  assert.ok(events.acceptanceLatencyMs < events.completionLatencyMs);
  assert.equal(events.latencyMs, events.completionLatencyMs);
});

test("P30: sensibilidad recalcula cada prioridad desde el mismo escenario", () => {
  const sensitivity = analyzeWeightSensitivity(DEFAULT_PROJECT, reference);
  assert.equal(sensitivity.criteria.length, Object.keys(DEFAULT_WEIGHTS).length);
  assert.equal(sensitivity.baselineWinner, run().recommendation.winner.architecture.id);
  assert.ok(sensitivity.criteria.some((item) => item.changesAtHundred));
});

test("P31: eficiencia menor reduce capacidad asignada y maxima", () => {
  const reduced = {
    ...DEFAULT_ARCHITECTURE_PARAMETERS,
    monolith: { ...DEFAULT_ARCHITECTURE_PARAMETERS.monolith, scalingEfficiency: 0.8 },
  };
  const baseline = run().results[0];
  const result = run(reference, DEFAULT_PROJECT, DEFAULT_WEIGHTS, reduced).results[0];
  assert.ok(result.capacityRps < baseline.capacityRps);
  assert.ok(result.maxCapacityRps < baseline.maxCapacityRps);
  assert.equal(result.architecture.scalingEfficiency, 0.8);
});

test("P32: la puntuacion de latencia usa finalizacion, no acuse de eventos", () => {
  const { results } = run();
  const baseline = recommend(results);
  const changedAcknowledgement = results.map((result) => ({
    ...result,
    acceptanceLatencyMs: result.architecture.id === "event-driven" ? 999999 : result.acceptanceLatencyMs,
  }));
  const decision = recommend(changedAcknowledgement);
  assert.equal(decision.winner.architecture.id, baseline.winner.architecture.id);
  assert.deepEqual(decision.ranked.map((result) => result.score), baseline.ranked.map((result) => result.score));
});

test("P33: Pareto no considera opciones que incumplen restricciones obligatorias", () => {
  const { results } = run({ ...reference, monthlyBudgetCOP: 1 });
  const frontier = computeParetoFrontier(results);
  assert.equal(frontier.frontier.length, 0);
  assert.equal(frontier.dominated.length, 0);
  assert.equal(frontier.ineligible.length, 3);
});

test("P34: la traza reproduce las salidas del motor para los cuatro escenarios", () => {
  for (const scenario of SCENARIOS) {
    const output = run(scenario);
    for (const result of output.results) {
      const trace = result.calculationTrace;
      assert.ok(trace.length >= 15);
      const demand = trace.find((line) => line.label === "Demanda pico");
      const capacity = trace.find((line) => line.label === "Capacidad asignada");
      const completion = trace.find((line) => line.label === "Componentes de finalización");
      const cost = trace.find((line) => line.label === "Costo mensual");
      const privacy = trace.find((line) => line.label === "Índice heurístico de privacidad");
      assert.equal(demand.result, `${result.peakRequestsPerSecond.toFixed(3)} req/s`);
      assert.equal(capacity.result, `${result.capacityRps.toFixed(3)} req/s`);
      assert.equal(completion.result, `${result.completionLatencyMs.toFixed(3)} ms disponibles`);
      assert.equal(cost.result, `${result.monthlyCostCOP} COP/mes`);
      assert.equal(privacy.result, `${result.privacyScore}/100; no certifica seguridad`);
      assert.ok(trace.some((line) => line.label === "Decisión"));
      if (result.constraints.eligible) assert.ok(trace.some((line) => line.label.startsWith("Normalización:")));
    }
  }
});

test("P35: la traza incluye entradas, fórmulas, restricciones y decisión para cada alternativa", () => {
  const requiredLabels = [
    "Entradas comunes", "Demanda pico", "Instancias", "Eficiencia de escalado",
    "Capacidad asignada", "Capacidad máxima modelada", "Utilización asignada", "Utilización máxima",
    "Margen y saturación", "Componentes de finalización", "Latencia de aceptación", "Costo mensual",
    "Disponibilidad estimada", "Índice heurístico de privacidad", "Decisión",
  ];
  for (const scenario of SCENARIOS) {
    const output = run(scenario);
    for (const result of output.results) {
      for (const label of requiredLabels) assert.ok(result.calculationTrace.some((step) => step.label === label), `${scenario.id}/${result.architecture.id}: ${label}`);
      assert.ok(result.calculationTrace.every((step) => step.formula && step.substitution && step.result));
      assert.ok(result.calculationTrace.some((step) => step.label.startsWith("Restricción:")));
      if (result.constraints.eligible) {
        assert.ok(result.calculationTrace.some((step) => step.label === "Puntuación total"));
        assert.ok(result.calculationTrace.some((step) => step.label.startsWith("Normalización:")));
      } else {
        assert.ok(result.calculationTrace.some((step) => step.label === "Puntuación" && step.result.includes("sin puntuación")));
      }
    }
  }
});

test("P36: nombre, alcance y texto de usuarios previstos no alteran los cálculos", () => {
  const metadataOnly = {
    ...DEFAULT_PROJECT,
    projectName: "Otro nombre",
    scope: "Otro alcance",
    intendedUsers: "Otro grupo previsto",
  };
  const baseline = run();
  const changedMetadata = run(reference, metadataOnly);
  assert.deepEqual(changedMetadata.results, baseline.results);
  assert.deepEqual(changedMetadata.recommendation, baseline.recommendation);
});