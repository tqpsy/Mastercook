import { describe, expect, it } from 'vitest';
import { interpretaErrore } from './verificaChiave';

describe('interpretaErrore', () => {
  it('riconosce la chiave errata', () => {
    const corpo = { error: { code: 400, status: 'INVALID_ARGUMENT', message: 'API key not valid. Please pass a valid API key.', details: [{ reason: 'API_KEY_INVALID' }] } };
    expect(interpretaErrore('gemini', 400, corpo)).toMatch(/Chiave errata/);
  });
  it('riconosce l’API non abilitata', () => {
    const corpo = { error: { code: 403, status: 'PERMISSION_DENIED', message: 'Generative Language API has not been used in project 123 before or it is disabled.', details: [{ reason: 'SERVICE_DISABLED' }] } };
    expect(interpretaErrore('gemini', 403, corpo)).toMatch(/Generative Language API non è abilitata/);
  });
  it('riconosce la quota esaurita', () => {
    expect(interpretaErrore('gemini', 429, { error: { status: 'RESOURCE_EXHAUSTED' } })).toMatch(/Quota esaurita/);
  });
  it('riconosce le restrizioni della chiave', () => {
    expect(interpretaErrore('gemini', 403, { error: { details: [{ reason: 'API_KEY_HTTP_REFERRER_BLOCKED' }] } })).toMatch(/limitata/);
  });
});
