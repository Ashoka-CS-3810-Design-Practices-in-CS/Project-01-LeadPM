import type { RouteResult } from '../models/RouteResult';
import type { RouteOutcome } from '../services/routeService';
export interface RouteUIState { sourceId: string | null; destinationId: string | null; revision: number; resetVersion: number; route: RouteResult | null; status: 'ready' | 'computing' | 'success' | 'error' | 'no-route'; message: string }
export const initialRouteState: RouteUIState = { sourceId: null, destinationId: null, revision: 0, resetVersion: 0, route: null, status: 'ready', message: 'Choose two stations to plan your journey.' };
export type RouteAction = { type: 'select'; field: 'sourceId' | 'destinationId'; id: string | null } | { type: 'clear' } | { type: 'start' } | { type: 'result'; revision: number; outcome: RouteOutcome };
export function routeReducer(state: RouteUIState, action: RouteAction): RouteUIState {
  switch (action.type) {
    case 'select': return { ...state, [action.field]: action.id, revision: state.revision + 1, route: null, status: 'ready', message: 'Selection updated. Find a route when both stations are selected.' };
    case 'clear': return { ...initialRouteState, revision: state.revision + 1, resetVersion: state.resetVersion + 1 };
    case 'start': return { ...state, route: null, status: 'computing', message: 'Finding the fastest route…' };
    case 'result':
      if (action.revision !== state.revision) return state;
      return action.outcome.status === 'success' ? { ...state, status: 'success', route: action.outcome.route, message: 'Route ready. Times are model estimates, not live schedules.' } : { ...state, route: null, status: action.outcome.status, message: action.outcome.message };
  }
}
