// QR check-in service.
//
// DemoCheckinService runs in the browser and stands in for the backend. It keeps the code registry
// and check-in records in its own "server" state, separate from player progress, and every reward
// in the game flows from a record it creates. It is NOT secure: its state and signing key live on
// the player's device. A production backend implements the same interface behind
// POST /api/checkins (see docs/mayor/PRODUCTION.md), with authentication, a secret key, rate limiting
// and duplicate prevention enforced on the server.
//
// A check-in proves that a code was presented. It does not prove a purchase, and the analytics never
// count it as one.

const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function ukDay(ts) { // calendar day in Felixstowe (Europe/London), e.g. 2026-10-12
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts));
}

export const ERRORS = {
  rate_limited: 'Too many attempts. Wait a minute, then try again.',
  unreadable: 'That isn’t a Race to Be Mayor code. Check you scanned the poster with the game’s logo.',
  invalid: 'We don’t recognise this code. Check the letters, or ask staff for the current poster.',
  tampered: 'This code has been altered, so it can’t be accepted.',
  revoked: 'This code has been replaced. Ask staff for the current poster.',
  expired: 'This code has expired.',
  inactive: 'This location isn’t taking part in the game at the moment.',
  duplicate_today: 'You’ve already checked in here today. Come back on another day for repeat-visit challenges.',
  duplicate_once: 'You’ve already checked in here. Each player can check in once.',
};

export class DemoCheckinService {
  /** server: persisted object { codes, checkins, attempts, analytics }; ctx: { config, now(), targetInfo(type, id) } */
  constructor(server, ctx) {
    this.s = server; this.ctx = ctx;
    this.s.codes ||= {}; this.s.checkins ||= []; this.s.attempts ||= {}; this.s.analytics ||= [];
  }
  _rand(n) { let out = ''; for (let i = 0; i < n; i++) out += ALPHA[Math.floor(Math.random() * ALPHA.length)]; return out; }
  sign(code) { return fnv(this.ctx.config.demoSecret + '|' + code).slice(0, 6).toUpperCase(); }
  payload(codeRec) { return `FXG1:${codeRec.code}:${this.sign(codeRec.code)}`; }

  /** Admin: issue a new code for a location or event (revokes the previous active one). */
  issue(type, id, { expiresAt = null } = {}) {
    for (const c of Object.values(this.s.codes)) if (c.type === type && c.target === id && !c.revokedAt) c.revokedAt = this.ctx.now();
    const prefix = id.replace(/[^a-z]/gi, '').slice(0, 4).toUpperCase().padEnd(4, 'X');
    let code; do code = `FX-${prefix}-${this._rand(4)}`; while (this.s.codes[code]);
    const rec = { code, type, target: id, createdAt: this.ctx.now(), revokedAt: null, expiresAt };
    this.s.codes[code] = rec; return rec;
  }
  revoke(code) { const c = this.s.codes[code]; if (c && !c.revokedAt) c.revokedAt = this.ctx.now(); return c; }
  activeCode(type, id) { return Object.values(this.s.codes).find((c) => c.type === type && c.target === id && !c.revokedAt && !(c.expiresAt && c.expiresAt < this.ctx.now())) || null; }
  ensureCodes(targets) { for (const [type, id] of targets) if (!this.activeCode(type, id)) this.issue(type, id); }

  /** Parse a scanned payload or a typed code. */
  parse(input) {
    const raw = String(input || '').trim().toUpperCase();
    const m = raw.match(/^FXG1:(FX-[A-Z]{4}-[A-Z2-9]{4}):([A-Z0-9]{1,6})$/);
    if (m) return { code: m[1], signed: true, sigOk: m[2] === this.sign(m[1]) };
    const c = raw.replace(/\s+/g, '').match(/^(FX-?[A-Z]{4}-?[A-Z2-9]{4})$/);
    if (c) { const k = c[1].replace(/^FX-?([A-Z]{4})-?([A-Z2-9]{4})$/, 'FX-$1-$2'); return { code: k, signed: false, sigOk: true }; }
    return null;
  }

  /**
   * Validate a check-in. method: 'camera' | 'photo' | 'typed' | 'simulated'.
   * Returns { ok:true, checkin, first } or { ok:false, error, message }.
   */
  checkIn({ playerId, input, method }) {
    const now = this.ctx.now(), cfg = this.ctx.config;
    const att = (this.s.attempts[playerId] ||= []).filter((t) => now - t < cfg.rateLimit.perSeconds * 1000);
    att.push(now); this.s.attempts[playerId] = att;
    const fail = (error) => { this._log('checkin_rejected', { error, method }); return { ok: false, error, message: ERRORS[error] }; };
    if (att.length > cfg.rateLimit.attempts) return fail('rate_limited');
    const p = this.parse(input); if (!p) return fail('unreadable');
    if (!p.sigOk) return fail('tampered');
    const rec = this.s.codes[p.code]; if (!rec) return fail('invalid');
    if (rec.revokedAt) return fail('revoked');
    if (rec.expiresAt && rec.expiresAt < now) return fail('expired');
    const info = this.ctx.targetInfo(rec.type, rec.target);
    if (!info || info.active === false) return fail('inactive');
    const rule = rec.type === 'event' ? cfg.repeatRules.event : cfg.repeatRules[info.kind] || 'once';
    const mine = this.s.checkins.filter((c) => c.playerId === playerId && c.type === rec.type && c.target === rec.target);
    const day = ukDay(now);
    if (rule === 'once' && mine.length) return fail('duplicate_once');
    if (rule === 'daily' && mine.some((c) => c.day === day)) return fail('duplicate_today');
    const checkin = { id: 'ci_' + now.toString(36) + this._rand(3), playerId, type: rec.type, target: rec.target, code: rec.code, ts: now, day, method, simulated: method === 'simulated', validatedBy: 'demo-client' };
    this.s.checkins.push(checkin);
    this._log('checkin', { type: rec.type, target: rec.target, method, simulated: checkin.simulated, repeat: mine.length > 0 });
    return { ok: true, checkin, first: mine.length === 0 };
  }
  _log(type, data) { this.s.analytics.push({ t: this.ctx.now(), type, ...data }); if (this.s.analytics.length > 5000) this.s.analytics.splice(0, 1000); }
}
