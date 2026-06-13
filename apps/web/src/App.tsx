import { EventLog } from './components/EventLog';
import { LiveView } from './components/LiveView';
import { RulesPanel } from './components/RulesPanel';
import { StatePanel } from './components/StatePanel';
import { useDashboard } from './hooks/useDashboard';

export function App() {
  const { snapshot, events, camera, connected } = useDashboard();

  return (
    <div className="app">
      <header className="app-header">
        <h1>🐾 Mind Pet</h1>
        <p className="muted">Asistente autónomo para el bienestar y entrenamiento de tu perro</p>
      </header>
      <main className="layout">
        <div className="column">
          <LiveView camera={camera} connected={connected} />
          <StatePanel snapshot={snapshot} />
        </div>
        <div className="column">
          <RulesPanel />
          <EventLog events={events} />
        </div>
      </main>
    </div>
  );
}
