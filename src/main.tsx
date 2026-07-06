import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { authApi, clearToken, getErrorMessage, hasToken, saveToken, tripsApi } from './api';
import type { Role, Trip, TripStatus, User } from './types';
import './styles.css';

type View = 'dashboard' | 'request' | 'detail';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [loading, setLoading] = useState(hasToken());
  const [error, setError] = useState('');

  const loadMe = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const me = await authApi.me();
      setUser(me);
      setView('dashboard');
    } catch (err) {
      clearToken();
      setUser(null);
      if (hasToken()) setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasToken()) void loadMe();
    const onExpired = () => {
      setUser(null);
      setView('dashboard');
      setSelectedTripId(null);
      setError('Sesion expirada. Inicia sesion nuevamente.');
    };
    window.addEventListener('auth-expired', onExpired);
    return () => window.removeEventListener('auth-expired', onExpired);
  }, [loadMe]);

  const openTrip = (id: number) => {
    setSelectedTripId(id);
    setView('detail');
  };

  const logout = () => {
    clearToken();
    setUser(null);
    setView('dashboard');
    setSelectedTripId(null);
  };

  if (loading) return <Shell><p className="muted">Cargando sesion...</p></Shell>;

  if (!user) {
    return (
      <Shell>
        <AuthScreen onAuthenticated={loadMe} initialError={error} />
      </Shell>
    );
  }

  return (
    <Shell user={user} onLogout={logout} onHome={() => setView('dashboard')}>
      {view === 'dashboard' && user.role === 'PASSENGER' && (
        <PassengerDashboard user={user} onRequest={() => setView('request')} onOpenTrip={openTrip} />
      )}
      {view === 'dashboard' && user.role === 'DRIVER' && (
        <DriverDashboard user={user} onOpenTrip={openTrip} onUserChange={setUser} />
      )}
      {view === 'request' && user.role === 'PASSENGER' && (
        <RequestTrip onCreated={openTrip} onCancel={() => setView('dashboard')} />
      )}
      {view === 'detail' && selectedTripId && (
        <TripDetail tripId={selectedTripId} user={user} onBack={() => setView('dashboard')} />
      )}
    </Shell>
  );
}

function Shell({ children, user, onLogout, onHome }: {
  children: React.ReactNode;
  user?: User;
  onLogout?: () => void;
  onHome?: () => void;
}) {
  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={onHome}>Uber Clone</button>
        {user && (
          <div className="session">
            <span>{user.firstName} {user.lastName}</span>
            <span className="pill">{user.role}</span>
            <button className="secondary" onClick={onLogout}>Salir</button>
          </div>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}

function AuthScreen({ onAuthenticated, initialError }: { onAuthenticated: () => Promise<void>; initialError: string }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<Role>('PASSENGER');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('ana@uber.com');
  const [password, setPassword] = useState('pass123');
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setError(initialError), [initialError]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = mode === 'login'
        ? await authApi.login(email, password)
        : await authApi.register({ firstName, lastName, email, password, role });
      saveToken(response.token);
      await onAuthenticated();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-panel">
      <div>
        <h1>Acceso</h1>
        <p className="muted">Usa los usuarios seed del README o registra uno nuevo.</p>
      </div>
      <div className="tabs">
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
        <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Registro</button>
      </div>
      <form onSubmit={submit} className="form-grid">
        {mode === 'register' && (
          <>
            <label>Nombre<input value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></label>
            <label>Apellido<input value={lastName} onChange={(e) => setLastName(e.target.value)} required /></label>
          </>
        )}
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Contrasena<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></label>
        <label>Rol
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="PASSENGER">PASSENGER</option>
            <option value="DRIVER">DRIVER</option>
          </select>
        </label>
        {error && <p className="error">{error}</p>}
        <button disabled={submitting}>{submitting ? 'Enviando...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</button>
      </form>
    </section>
  );
}

function PassengerDashboard({ user, onRequest, onOpenTrip }: {
  user: User;
  onRequest: () => void;
  onOpenTrip: (id: number) => void;
}) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [status, setStatus] = useState<TripStatus | 'ALL'>('ALL');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setTrips(await tripsApi.passengerTrips());
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const filtered = filterTrips(trips, status);

  return (
    <section className="stack">
      <div className="hero">
        <div>
          <h1>Hola, {user.firstName}</h1>
          <p className="muted">Solicita viajes y revisa su avance.</p>
        </div>
        <button onClick={onRequest}>Pedir viaje</button>
      </div>
      {error && <p className="error">{error}</p>}
      <History trips={filtered} status={status} onStatus={setStatus} onOpenTrip={onOpenTrip} />
    </section>
  );
}

function RequestTrip({ onCreated, onCancel }: { onCreated: (id: number) => void; onCancel: () => void }) {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    tripsApi.availableDrivers().then(setDrivers).catch((err) => setError(getErrorMessage(err)));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const trip = await tripsApi.create(pickup, dropoff);
      onCreated(trip.id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="two-column">
      <div className="panel">
        <h2>Conductores disponibles</h2>
        <div className="list">
          {drivers.length === 0 && <p className="muted">No hay conductores disponibles ahora.</p>}
          {drivers.map((driver) => (
            <div className="list-row" key={driver.id}>
              <div><strong>{driver.firstName} {driver.lastName}</strong><span>{driver.email}</span></div>
              <span className="rating">{driver.rating.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
      <form className="panel form-grid" onSubmit={submit}>
        <h2>Solicitar viaje</h2>
        <label>Origen<input value={pickup} onChange={(e) => setPickup(e.target.value)} required /></label>
        <label>Destino<input value={dropoff} onChange={(e) => setDropoff(e.target.value)} required /></label>
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button type="button" className="secondary" onClick={onCancel}>Cancelar</button>
          <button disabled={submitting}>{submitting ? 'Creando...' : 'Confirmar'}</button>
        </div>
      </form>
    </section>
  );
}

function DriverDashboard({ user, onOpenTrip, onUserChange }: {
  user: User;
  onOpenTrip: (id: number) => void;
  onUserChange: (user: User) => void;
}) {
  const [pending, setPending] = useState<Trip[]>([]);
  const [mine, setMine] = useState<Trip[]>([]);
  const [status, setStatus] = useState<TripStatus | 'ALL'>('ALL');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [nextPending, nextMine, me] = await Promise.all([
        tripsApi.pendingTrips(),
        tripsApi.driverTrips(),
        authApi.me(),
      ]);
      setPending(nextPending);
      setMine(nextMine);
      onUserChange(me);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [onUserChange]);

  useEffect(() => { void load(); }, [load]);

  const activeTrip = mine.find((trip) => trip.status === 'IN_PROGRESS');
  const completed = mine.filter((trip) => trip.status === 'COMPLETED');

  const accept = async (id: number) => {
    try {
      const trip = await tripsApi.accept(id);
      await load();
      onOpenTrip(trip.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const complete = async (id: number) => {
    try {
      await tripsApi.complete(id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <section className="stack">
      <div className="hero">
        <div>
          <h1>Panel conductor</h1>
          <p className="muted">Rating {user.rating.toFixed(1)} · {user.available ? 'Disponible' : 'Ocupado'}</p>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {activeTrip && (
        <div className="panel highlight">
          <h2>Viaje activo</h2>
          <TripSummary trip={activeTrip} onOpen={() => onOpenTrip(activeTrip.id)} />
          <button onClick={() => complete(activeTrip.id)}>Completar viaje</button>
        </div>
      )}
      <div className="panel">
        <h2>Viajes disponibles</h2>
        <div className="list">
          {pending.length === 0 && <p className="muted">No hay viajes pendientes.</p>}
          {pending.map((trip) => (
            <div className="list-row" key={trip.id}>
              <TripSummary trip={trip} onOpen={() => onOpenTrip(trip.id)} />
              <button onClick={() => accept(trip.id)}>Aceptar</button>
            </div>
          ))}
        </div>
      </div>
      <History trips={filterTrips(completed, status)} status={status} onStatus={setStatus} onOpenTrip={onOpenTrip} />
    </section>
  );
}

function TripDetail({ tripId, user, onBack }: { tripId: number; user: User; onBack: () => void }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setTrip(await tripsApi.byId(tripId));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [tripId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!trip || trip.status === 'COMPLETED') return;
    const id = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(id);
  }, [load, trip]);

  const complete = async () => {
    try {
      setTrip(await tripsApi.complete(tripId));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const rate = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setTrip(await tripsApi.rate(tripId, rating, comment));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (!trip) {
    return <section className="panel"><button className="secondary" onClick={onBack}>Volver</button><p className="muted">Cargando viaje...</p></section>;
  }

  const canRate = user.role === 'PASSENGER' && trip.status === 'COMPLETED' && trip.passengerRating === null;
  const canComplete = user.role === 'DRIVER' && trip.status === 'IN_PROGRESS' && trip.driver?.id === user.id;

  return (
    <section className="stack">
      <button className="secondary fit" onClick={onBack}>Volver</button>
      {error && <p className="error">{error}</p>}
      <div className="panel">
        <div className="panel-head">
          <h1>Viaje #{trip.id}</h1>
          <StatusBadge status={trip.status} />
        </div>
        <dl className="details">
          <div><dt>Origen</dt><dd>{trip.pickupAddress}</dd></div>
          <div><dt>Destino</dt><dd>{trip.dropoffAddress}</dd></div>
          <div><dt>Pasajero</dt><dd>{trip.passenger.firstName} {trip.passenger.lastName}</dd></div>
          <div><dt>Conductor</dt><dd>{trip.driver ? `${trip.driver.firstName} ${trip.driver.lastName} · ${trip.driver.rating.toFixed(1)}` : 'buscando conductor...'}</dd></div>
          <div><dt>Solicitado</dt><dd>{formatDate(trip.requestedAt)}</dd></div>
          <div><dt>Aceptado</dt><dd>{trip.acceptedAt ? formatDate(trip.acceptedAt) : '-'}</dd></div>
          <div><dt>Completado</dt><dd>{trip.completedAt ? formatDate(trip.completedAt) : '-'}</dd></div>
          <div><dt>Calificacion</dt><dd>{trip.passengerRating ? `${trip.passengerRating}/5 ${trip.ratingComment ?? ''}` : '-'}</dd></div>
        </dl>
        {canComplete && <button onClick={complete}>Completar viaje</button>}
        {trip.status === 'COMPLETED' && user.role === 'DRIVER' && <p className="success">Viaje completado.</p>}
      </div>
      {canRate && (
        <form className="panel form-grid" onSubmit={rate}>
          <h2>Calificar conductor</h2>
          <label>Estrellas
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label>Comentario<input value={comment} onChange={(e) => setComment(e.target.value)} /></label>
          <button>Enviar calificacion</button>
        </form>
      )}
    </section>
  );
}

function History({ trips, status, onStatus, onOpenTrip }: {
  trips: Trip[];
  status: TripStatus | 'ALL';
  onStatus: (status: TripStatus | 'ALL') => void;
  onOpenTrip: (id: number) => void;
}) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Historial</h2>
        <select value={status} onChange={(e) => onStatus(e.target.value as TripStatus | 'ALL')}>
          <option value="ALL">Todos</option>
          <option value="PENDING">PENDING</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Ruta</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
          <tbody>
            {trips.map((trip) => (
              <tr key={trip.id}>
                <td>#{trip.id}</td>
                <td>{trip.pickupAddress} {'->'} {trip.dropoffAddress}</td>
                <td><StatusBadge status={trip.status} /></td>
                <td>{formatDate(trip.requestedAt)}</td>
                <td><button className="secondary" onClick={() => onOpenTrip(trip.id)}>Ver</button></td>
              </tr>
            ))}
            {trips.length === 0 && <tr><td colSpan={5} className="muted">Sin viajes para mostrar.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TripSummary({ trip, onOpen }: { trip: Trip; onOpen: () => void }) {
  return (
    <div className="summary">
      <button className="link" onClick={onOpen}>Viaje #{trip.id}</button>
      <span>{trip.pickupAddress} {'->'} {trip.dropoffAddress}</span>
      <StatusBadge status={trip.status} />
    </div>
  );
}

function StatusBadge({ status }: { status: TripStatus }) {
  return <span className={`status ${status.toLowerCase()}`}>{status}</span>;
}

function filterTrips(trips: Trip[], status: TripStatus | 'ALL') {
  const filtered = status === 'ALL' ? trips : trips.filter((trip) => trip.status === status);
  return [...filtered].sort((a, b) => b.id - a.id);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
