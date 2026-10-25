import type { NetworkModel } from '../models/network';
import type { RouteUIState, RouteAction } from '../state/routeReducer';
import { StationSearch } from './StationSearch';
export function RouteControls({ model, state, dispatch, find }: { model: NetworkModel; state: RouteUIState; dispatch: (a: RouteAction) => void; find: () => void }) {
  return <section className="controls" aria-label="Route planner"><div className="eyebrow">YOUR JOURNEY</div><h1>A better way<br/>through the city.</h1><p className="muted">Pick your stations. We’ll connect the dots.</p>
    <StationSearch key={`from-${state.resetVersion}`} label="From" model={model} selectedId={state.sourceId} onSelect={id => dispatch({ type: 'select', field: 'sourceId', id })}/>
    <StationSearch key={`to-${state.resetVersion}`} label="To" model={model} selectedId={state.destinationId} onSelect={id => dispatch({ type: 'select', field: 'destinationId', id })}/>
    <div className="actions"><button className="primary" disabled={!state.sourceId || !state.destinationId || state.status === 'computing'} onClick={find}>{state.status === 'computing' ? 'Finding route…' : 'Find fastest route'} <span aria-hidden="true">↗</span></button><button className="text-button" onClick={() => dispatch({ type: 'clear' })}>New route</button></div>
  </section>;
}
