/**
 * Selettore file di Google (Picker). Con lo scope drive.file l'app vede solo i file che ha
 * creato o che l'utente le ha affidato: chi riceve un invito conferma qui i file condivisi.
 */
import { config, numeroProgettoGoogle } from '../config';

interface Builder {
  addView(v: unknown): Builder;
  setOAuthToken(t: string): Builder;
  setDeveloperKey(k: string): Builder;
  setAppId(id: string): Builder;
  setLocale(l: string): Builder;
  setTitle(t: string): Builder;
  enableFeature(f: unknown): Builder;
  setCallback(c: (d: Record<string, unknown>) => void): Builder;
  build(): { setVisible(v: boolean): void };
}
interface Picker {
  PickerBuilder: new () => Builder;
  DocsView: new () => { setFileIds(ids: string): unknown; setMode(m: unknown): unknown };
  DocsViewMode: { LIST: unknown };
  Feature: { MULTISELECT_ENABLED: unknown; NAV_HIDDEN: unknown };
  Action: { PICKED: string; CANCEL: string };
  Response: { ACTION: string; DOCUMENTS: string };
  Document: { ID: string };
}
declare global {
  interface Window {
    gapi?: { load(nome: string, fatto: () => void): void };
  }
}

let caricamento: Promise<Picker> | undefined;

function caricaPicker(): Promise<Picker> {
  caricamento ??= new Promise<Picker>((ok, ko) => {
    const pronto = () => window.gapi!.load('picker', () => ok((window as unknown as { google: { picker: Picker } }).google.picker));
    if (window.gapi) return pronto();
    const s = document.createElement('script');
    s.src = 'https://apis.google.com/js/api.js';
    s.async = true;
    s.onload = pronto;
    s.onerror = () => {
      caricamento = undefined;
      ko(new Error('rete'));
    };
    document.head.appendChild(s);
  });
  return caricamento;
}

export const pickerDisponibile = () => !!config.googleApiKey;

/** Apre il selettore già posizionato sui file indicati; restituisce gli id confermati. */
export async function confermaFile(ids: string[], token: string, titolo: string): Promise<string[]> {
  if (!pickerDisponibile()) throw new Error('picker');
  const picker = await caricaPicker();
  const vista = new picker.DocsView();
  vista.setFileIds(ids.join(','));
  vista.setMode(picker.DocsViewMode.LIST);
  return new Promise<string[]>((ok) => {
    new picker.PickerBuilder()
      .addView(vista)
      .enableFeature(picker.Feature.MULTISELECT_ENABLED)
      .enableFeature(picker.Feature.NAV_HIDDEN)
      .setOAuthToken(token)
      .setDeveloperKey(config.googleApiKey)
      .setAppId(numeroProgettoGoogle())
      .setLocale('it')
      .setTitle(titolo)
      .setCallback((d) => {
        const azione = d[picker.Response.ACTION];
        if (azione === picker.Action.PICKED) {
          ok(((d[picker.Response.DOCUMENTS] as Record<string, string>[]) ?? []).map((x) => x[picker.Document.ID]!));
        } else if (azione === picker.Action.CANCEL) {
          ok([]);
        }
      })
      .build()
      .setVisible(true);
  });
}
