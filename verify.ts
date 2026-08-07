import { computeForecast, DEFAULT_FORECAST_STATE } from './utils/forecast';

const baseF = computeForecast(DEFAULT_FORECAST_STATE);
const zilrettaActuals = (baseF as any).zilrettaActuals;

function rebase(f: any) {
  return f.years.map((y: any, i: number) => {
    const baseModeled = baseF.revenue[i] || 1;
    const currentModeled = f.revenue[i] || 0;
    const actual = zilrettaActuals[i] || 0;
    const ratio = currentModeled / baseModeled;
    return actual * ratio;
  });
}

const baseRebased = rebase(baseF);
console.log("FRESH LOAD:");
console.log("Zilretta Actuals (Y1, Y5):", zilrettaActuals[0], zilrettaActuals[4]);
console.log("Base Rebased   (Y1, Y5):", baseRebased[0], baseRebased[4]);
console.log("Ratio on load          :", baseRebased[0] / (zilrettaActuals[0] || 1));
console.log("-----------------------");

const fOn = computeForecast({ ...DEFAULT_FORECAST_STATE, patientAssistanceProgramInPlace: true });
const onRebased = rebase(fOn);
console.log("TOGGLE ON (PAP in place = true):");
console.log("Rebased (Y1, Y5):", onRebased[0], onRebased[4]);
console.log("Multiplier applied:", onRebased[0] / baseRebased[0]);
console.log("-----------------------");

const fUp = computeForecast({ ...DEFAULT_FORECAST_STATE, diagnosisRate: 0.052 });
const upRebased = rebase(fUp);
console.log("DIAGNOSIS RATE UP (0.051 -> 0.052):");
console.log("Rebased (Y1, Y5):", upRebased[0], upRebased[4]);
console.log("Change %:", ((upRebased[0] / baseRebased[0]) - 1) * 100, "%");
console.log("-----------------------");

const fDown = computeForecast({ ...DEFAULT_FORECAST_STATE, diagnosisRate: 0.049 });
const downRebased = rebase(fDown);
console.log("DIAGNOSIS RATE DOWN (0.051 -> 0.049):");
console.log("Rebased (Y1, Y5):", downRebased[0], downRebased[4]);
console.log("Change %:", ((downRebased[0] / baseRebased[0]) - 1) * 100, "%");
