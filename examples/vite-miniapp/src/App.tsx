import { useEvent, useMethod } from '@alien-id/miniapps-react';
import { useState } from 'react';
import './App.css';
import { CallabilityBanner } from './CallabilityBanner';
import { EventLog, type EventLogEntry } from './EventLog';
import {
  type DemoEvent,
  type DemoMethod,
  type DemoPayload,
  RequestForm,
} from './RequestForm';
import { RequestHistory, type RequestLogEntry } from './RequestHistory';
import { StatusGrid } from './StatusGrid';

const DEMO_METHOD: DemoMethod = 'payment:request';
const DEMO_EVENT: DemoEvent = 'payment:response';

function App() {
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [requests, setRequests] = useState<RequestLogEntry[]>([]);

  const { execute, callable, error, data, isLoading } = useMethod(
    DEMO_METHOD,
    DEMO_EVENT,
  );

  useEvent(DEMO_EVENT, (payload) => {
    setEvents((prev) => [
      {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        event: DEMO_EVENT,
        payload,
      },
      ...prev,
    ]);
  });

  const handleSend = async (payload: DemoPayload) => {
    const id = crypto.randomUUID();
    setRequests((prev) => [
      {
        id,
        timestamp: new Date(),
        method: DEMO_METHOD,
        requestPayload: payload,
        status: 'pending',
      },
      ...prev,
    ]);
    const { data: respData, error: respError } = await execute(payload, {
      timeout: 5000,
    });
    setRequests((prev) =>
      prev.map((req) =>
        req.id === id
          ? {
              ...req,
              response: respError ? { error: respError.message } : respData,
              status: respError ? 'error' : 'success',
            }
          : req,
      ),
    );
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Alien Miniapp SDK</h1>
        <p className="subtitle">Request & Event Example</p>
      </header>
      <StatusGrid />
      <CallabilityBanner method={DEMO_METHOD} />
      <RequestForm
        method={DEMO_METHOD}
        responseEvent={DEMO_EVENT}
        callable={callable}
        isLoading={isLoading}
        error={error}
        data={data}
        onSend={handleSend}
      />
      <RequestHistory requests={requests} onClear={() => setRequests([])} />
      <EventLog events={events} onClear={() => setEvents([])} />
    </div>
  );
}

export default App;
