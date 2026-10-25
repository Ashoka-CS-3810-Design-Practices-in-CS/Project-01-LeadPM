import { useEffect, useReducer, useState } from 'react';
import { loadNetwork } from './data/loader';
import type { NetworkModel } from './models/network';
import { findRoute } from './services/routeService';
import { initialRouteState, routeReducer } from './state/routeReducer';
import { RouteControls } from './components/RouteControls';
import { RouteDetails } from './components/RouteDetails';
import { StatusMessage } from './components/StatusMessage';
import { MetroMap } from './components/MetroMap';
export default function App() {
  const [model, setModel] = useState<NetworkModel | null>(null), [loadError, setLoadError] = useState(false), [attempt, setAttempt] = useState(0);
  const [state, dispatch] = useReducer(routeReducer, initialRouteState);
  useEffect(() => { let cancelled = false; setLoadError(false); loadNetwork().then(m => { if (!cancelled) setModel(m); }).catch(() => { if (!cancelled) setLoadError(true); }); return () => { cancelled = true; }; }, [attempt]);
  const find = async () => { if (!model) return; const { sourceId, destinationId, revision } = state; dispatch({ type: 'start' }); const outcome = await findRoute(sourceId, destinationId, model.data.version); dispatch({ type: 'result', revision, outcome }); };
  return <><header className="site-header"><a href="./" className="brand"><span className="brand-mark" aria-hidden="true">m</span><span>DELHI<span className="brand-light"> / METRO</span></span></a><div className="header-note">A city of connections.<span>Route planner by LeadsPM</span></div></header>
    <div className="notice"><span className="notice-dot"/>Delhi Metro + Noida Aqua + Gurugram Rapid Metro | Estimated travel times</div>
    {!model ? <main className="load-screen"><StatusMessage error={loadError} message={loadError ? 'Metro data is unavailable or inconsistent. Please retry.' : 'Loading and validating the metro network…'}/>{loadError && <button onClick={() => setAttempt(n => n + 1)}>Retry loading</button>}</main> : <main className="workspace"><aside className="sidebar"><RouteControls model={model} state={state} dispatch={dispatch} find={find}/><StatusMessage message={state.message} error={state.status === 'error' || state.status === 'no-route'}/><RouteDetails model={model} route={state.route}/></aside><MetroMap model={model} route={state.route} sourceId={state.sourceId} destinationId={state.destinationId} onSelect={id => dispatch({ type: 'select', field: !state.sourceId ? 'sourceId' : 'destinationId', id })}/></main>}
    <footer className="site-footer"><span>CS-3810 · Design Practices in Computer Science</span><span>LeadsPM / Delhi NCR</span></footer></>;
}
