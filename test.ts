import { computeForecast, defaultState } from './utils/forecast';

const base = computeForecast(defaultState);
console.log('Base Revenue:', base.revenue);

const changedState = { ...defaultState, wacPrice: defaultState.wacPrice + 10 };
const changed = computeForecast(changedState);
console.log('Changed Revenue (+10 WAC):', changed.revenue);

const changedState2 = { ...defaultState, peakShare: 0.30 };
const changed2 = computeForecast(changedState2);
console.log('Changed Revenue (0.30 Peak Share):', changed2.revenue);
