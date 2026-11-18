// SPF / DKIM / DMARC record builder and explainer. Builds the DNS TXT value, or parses one
// and explains each tag. Offline — it does not query DNS.

export function buildSPF(o) {
  const parts = ['v=spf1'];
  for (const ip of (o.ip4 || '').split(/[\s,]+/).filter(Boolean)) parts.push('ip4:' + ip);
  for (const ip of (o.ip6 || '').split(/[\s,]+/).filter(Boolean)) parts.push('ip6:' + ip);
  for (const inc of (o.include || '').split(/[\s,]+/).filter(Boolean)) parts.push('include:' + inc);
  if (o.a) parts.push('a');
  if (o.mx) parts.push('mx');
  parts.push((o.all || '~') + 'all');
  return parts.join(' ');
}
export function buildDMARC(o) {
  const t = [`v=DMARC1`, `p=${o.p || 'none'}`];
  if (o.sp) t.push(`sp=${o.sp}`);
  if (o.rua) t.push(`rua=mailto:${o.rua}`);
  if (o.ruf) t.push(`ruf=mailto:${o.ruf}`);
  if (o.pct && +o.pct !== 100) t.push(`pct=${o.pct}`);
  if (o.adkim) t.push(`adkim=${o.adkim}`);
  if (o.aspf) t.push(`aspf=${o.aspf}`);
  if (o.fo) t.push(`fo=${o.fo}`);
  return { host: `_dmarc.${o.domain || 'example.com'}`, value: t.join('; ') };
}

const SPF_MECH = { all: 'matches everything — the catch-all, always last', include: 'authorise another domain’s SPF', a: 'the domain’s A/AAAA records may send', mx: 'the domain’s MX hosts may send', ip4: 'this IPv4 / range may send', ip6: 'this IPv6 / range may send', exists: 'conditional match', ptr: 'reverse-DNS match (deprecated — avoid)', redirect: 'replace this record with another domain’s' };
const QUAL = { '+': 'pass (default)', '-': 'fail — reject', '~': 'softfail — accept but mark', '?': 'neutral' };
const DMARC_TAG = { v: 'version, must be DMARC1', p: 'policy for the domain: none (monitor) / quarantine / reject', sp: 'policy for subdomains', rua: 'where to send aggregate (daily) reports', ruf: 'where to send forensic (per-failure) reports', pct: 'percent of mail the policy applies to', adkim: 'DKIM alignment: r=relaxed, s=strict', aspf: 'SPF alignment: r=relaxed, s=strict', fo: 'forensic options: 0/1/d/s', rf: 'forensic report format', ri: 'aggregate report interval (seconds)' };
const DKIM_TAG = { v: 'version (DKIM1)', k: 'key type (rsa/ed25519)', p: 'the public key (base64) — empty means the key was revoked', t: 'flags: y=testing, s=strict', h: 'allowed hash algorithms', s: 'service type' };

export function explain(record) {
  const r = record.trim().replace(/^.*?\bv=/i, 'v=');
  if (/^v=spf1/i.test(r)) {
    const rows = [];
    for (const term of r.split(/\s+/)) {
      if (/^v=spf1$/i.test(term)) { rows.push([term, 'start of an SPF record']); continue; }
      const q = '+-~?'.includes(term[0]) ? term[0] : '+';
      const body = '+-~?'.includes(term[0]) ? term.slice(1) : term;
      const mech = body.split(':')[0].replace(/\/.*/, '');
      rows.push([term, `${SPF_MECH[mech] || 'mechanism'} — qualifier ${q} = ${QUAL[q]}`]);
    }
    return { type: 'SPF', rows };
  }
  if (/^v=DMARC1/i.test(r)) {
    return { type: 'DMARC', rows: r.split(/;\s*/).filter(Boolean).map((p) => { const [k, v] = p.split('='); return [p, `${DMARC_TAG[k.trim()] || k}${v ? '' : ''}`]; }) };
  }
  if (/(^|;|\s)k=|DKIM1|p=MIG|p=MII/i.test(r)) {
    return { type: 'DKIM', rows: r.split(/;\s*/).filter(Boolean).map((p) => { const k = p.split('=')[0].trim(); return [p.length > 60 ? p.slice(0, 60) + '…' : p, DKIM_TAG[k] || k]; }) };
  }
  return { type: 'unknown', rows: [[record, 'not recognised as SPF, DKIM or DMARC']] };
}
