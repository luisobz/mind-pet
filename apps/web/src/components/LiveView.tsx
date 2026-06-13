import { useState } from 'react';
import { api, type CameraResponse } from '../api/client';

interface Props {
  camera: CameraResponse | null;
  connected: boolean;
}

export function LiveView({ camera, connected }: Props) {
  const [dispensing, setDispensing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const dispense = async (): Promise<void> => {
    setDispensing(true);
    setFeedback(null);
    try {
      await api.dispenseTreat(1);
      setFeedback('🦴 ¡Premio dispensado!');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Error al dispensar');
    } finally {
      setDispensing(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <section className="card">
      <header className="card-header">
        <h2>Cámara en directo</h2>
        <span className={connected ? 'badge ok' : 'badge warn'}>
          {connected ? 'En tiempo real' : 'Reconectando…'}
        </span>
      </header>

      <div className="live-view">
        {camera?.stream?.protocol === 'mock' ? (
          <div className="live-placeholder">
            <span className="live-emoji">🐕</span>
            <p>Proveedor simulado activo</p>
            <p className="muted">
              El simulador genera comportamiento del perro para desarrollar sin hardware.
            </p>
          </div>
        ) : camera?.stream !== null && camera !== null ? (
          <div className="live-placeholder">
            <span className="live-emoji">📡</span>
            <p>
              Stream {camera.stream.protocol.toUpperCase()}: <code>{camera.stream.url}</code>
            </p>
            <p className="muted">
              Los navegadores no reproducen RTSP directamente; usa una pasarela como go2rtc o
              MediaMTX para verlo aquí.
            </p>
          </div>
        ) : (
          <div className="live-placeholder">
            <span className="live-emoji">📷</span>
            <p className="muted">Stream no disponible</p>
          </div>
        )}
      </div>

      <footer className="card-footer">
        <div>
          <strong>{camera?.info.name ?? 'Cámara'}</strong>
          <span className="muted"> · {camera?.status ?? 'desconocido'}</span>
        </div>
        <button onClick={() => void dispense()} disabled={dispensing}>
          {dispensing ? 'Dispensando…' : '🦴 Dar premio'}
        </button>
      </footer>
      {feedback !== null && <p className="feedback">{feedback}</p>}
    </section>
  );
}
