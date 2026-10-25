/*
 * Avvisi di scadenza nel service worker (caricato da sw.js con importScripts).
 * L'app prepara i promemoria dei prossimi giorni in IndexedDB; qui, con la sincronizzazione
 * periodica del browser (Chrome su Android, app installata), si mostra quello di oggi.
 */
const DB_AVVISI = 'masterfood-avvisi';
const STORE_AVVISI = 'avvisi';
const ETICHETTA_AVVISI = 'masterfood-scadenze';

function apriAvvisi() {
  return new Promise((ok, ko) => {
    const r = indexedDB.open(DB_AVVISI, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE_AVVISI);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}

async function operaAvvisi(modo, fai) {
  const db = await apriAvvisi();
  try {
    return await new Promise((ok, ko) => {
      const tx = db.transaction(STORE_AVVISI, modo);
      const r = fai(tx.objectStore(STORE_AVVISI));
      tx.oncomplete = () => ok(r && r.result);
      tx.onerror = () => ko(tx.error);
    });
  } finally {
    db.close();
  }
}

function adessoARoma() {
  const parti = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return { giorno: `${parti.year}-${parti.month}-${parti.day}`, ora: Number(parti.hour) };
}

async function controllaScadenze() {
  const dati = await operaAvvisi('readonly', (s) => s.get('promemoria'));
  if (!dati || !dati.attivi) return;
  const { giorno, ora } = adessoARoma();
  // Niente avvisi di notte: la prossima sincronizzazione arriva più tardi.
  if (ora < 8 || ora >= 21 || dati.mostrato === giorno) return;
  const p = (dati.elenco || []).find((x) => x.giorno === giorno);
  if (!p) return;
  await self.registration.showNotification(p.titolo, {
    body: p.testo,
    icon: 'pwa-192.png',
    badge: 'pwa-192.png',
    tag: ETICHETTA_AVVISI,
    data: { apri: p.apri },
  });
  await operaAvvisi('readwrite', (s) => s.put({ ...dati, mostrato: giorno }, 'promemoria'));
}

self.addEventListener('periodicsync', (e) => {
  if (e.tag === ETICHETTA_AVVISI) e.waitUntil(controllaScadenze());
});

self.addEventListener('notificationclick', (e) => {
  if (e.notification.tag !== ETICHETTA_AVVISI) return;
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.apri) || '', self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((finestre) => {
      const f = finestre[0];
      if (f) return f.focus().then(() => f.navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});
