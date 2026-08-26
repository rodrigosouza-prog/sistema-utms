/* Montagem de UTMs, tracking templates e macros por plataforma. */

/* ───────────────────────────────────────────────────────────────
   GOOGLE ADS — templates oficiais do time, usados verbatim.
   Nao alterar sem alinhar com quem opera a conta.
   O sistema NAO monta esses: ele preenche {_campaign} e {_content}
   com os nomes gerados, que sao configurados como custom parameters.
   ─────────────────────────────────────────────────────────────── */
export const GADS_TEMPLATES = {
  completo: '{lpurl}&utm_source=google&utm_medium={ifsearch:cpc}{ifcontent:display}&utm_campaign={_campaign}&utm_content={_content}&utm_term={keyword}&matchtype={matchtype}&device={device}&network={network}&adgroupid={adgroupid}&campaignid={campaignid}&creative={creative}&adposition={adposition}',
  simples: '{lpurl}&utm_source=google&utm_medium=cpc&utm_campaign={_campaign}&utm_term={keyword}'
};

/* Microsoft Ads usa o mesmo ValueTrack do Google — mesma estrutura, outro source. */
export const MSADS_TEMPLATES = {
  completo: '{lpurl}&utm_source=bing&utm_medium=cpc&utm_campaign={_campaign}&utm_content={_content}&utm_term={keyword}&matchtype={matchtype}&device={device}&network={network}&adgroupid={adgroupid}&campaignid={campaignid}',
  simples: '{lpurl}&utm_source=bing&utm_medium=cpc&utm_campaign={_campaign}&utm_term={keyword}'
};

/* ───────────────────────────────────────────────────────────────
   Plataformas com macro nativa de URL (nao usam custom parameter)
   ─────────────────────────────────────────────────────────────── */
/* utm_term carrega o ANUNCIO e utm_content carrega o CONJUNTO — por isso
   term aponta para o nome do anuncio e content para o nome do adset. */
const META = {
  source: '{{site_source_name}}', campaign: '{{campaign.name}}',
  content: '{{adset.name}}', term: '{{ad.name}}'
};

export const MACROS = {
  'meta-facebook': META, 'meta-instagram': META, 'meta-messenger': META, 'meta-audience': META,
  'tiktok': { campaign: '__CAMPAIGN_NAME__', content: '__AID_NAME__', term: '__CID_NAME__' },
  'reddit': { campaign: '{{CAMPAIGN_NAME}}', content: '{{ADGROUP_NAME}}', term: '{{AD_NAME}}' }
};

/* parametros granulares — sem prefixo utm_, lidos pela camada do GTM */
const META_X = [['mt_placement', '{{placement}}'], ['mt_adset', '{{adset.id}}'], ['mt_ad', '{{ad.id}}']];
export const EXTRAS = {
  'meta-facebook': META_X, 'meta-instagram': META_X, 'meta-messenger': META_X, 'meta-audience': META_X,
  'tiktok': [['tt_placement', '__PLACEMENT__'], ['tt_adgroup', '__AID__'], ['tt_ad', '__CID__']]
};

export const isGoogleAds = canal => !!canal && canal.startsWith('google-');
export const isMsAds = canal => canal === 'microsoft';
/* usa custom parameter ({_campaign}) em vez de macro de nome */
export const usaCustomParam = canal => isGoogleAds(canal) || isMsAds(canal);
/* tem alguma forma de preenchimento automatico de URL */
export const isDyn = canal => usaCustomParam(canal) || !!MACROS[canal];

/* ─────────── UTMs para canal SEM macro (e-mail, whats, influencer...) ─────────── */
export function utmPairs(S, canalCfg, nomes, dyn) {
  const cfg = canalCfg || {};
  const M = dyn ? (MACROS[S.canal] || {}) : {};
  return [
    ['utm_source', M.source || cfg.utm_source],
    ['utm_medium', cfg.utm_medium],
    ['utm_campaign', M.campaign || nomes.campanha],
    ['utm_content', M.content || nomes.conjunto],
    ['utm_term', M.term || nomes.anuncio]
  ].filter(p => p[1]);
}

/* macros nunca podem ser encodadas — chaves e underscores precisam passar cruas */
export function qs(pairs) {
  return pairs.map(p => {
    const v = String(p[1]);
    const raw = v.charAt(0) === '{' || v.slice(0, 2) === '__';
    return p[0] + '=' + (raw ? v : encodeURIComponent(v));
  }).join('&');
}

/**
 * Tracking template / URL parameters da plataforma.
 * @param variante 'completo' | 'simples' — so vale para Google e Microsoft.
 */
export function trackingTemplate(S, canalCfg, nomes, variante = 'completo') {
  if (isGoogleAds(S.canal)) return GADS_TEMPLATES[variante] || GADS_TEMPLATES.completo;
  if (isMsAds(S.canal)) return MSADS_TEMPLATES[variante] || MSADS_TEMPLATES.completo;
  return qs([].concat(utmPairs(S, canalCfg, nomes, true), EXTRAS[S.canal] || []));
}

/**
 * Valores que vao nos custom parameters da conta (Google / Microsoft).
 * O template le {_content} dentro de utm_content, que agora carrega o CONJUNTO.
 *
 * ⚠️ No Google e no Microsoft o utm_term continua sendo {keyword} do ValueTrack,
 * e nao o nome do anuncio — os templates sao os oficiais da conta e nao foram
 * alterados. O anuncio ja vem identificado por creative={creative}.
 */
export function customParams(nomes) {
  return [
    ['_campaign', nomes.campanha],
    ['_content', nomes.conjunto]
  ].filter(p => p[1]);
}

export function urlFinal(S, canalCfg, nomes) {
  /* sem canal nao ha source nem medium: melhor nao mostrar URL nenhuma
     do que mostrar uma pela metade */
  if (!S.lp || !canalCfg) return null;
  return S.lp + (S.lp.indexOf('?') > -1 ? '&' : '?') + qs(utmPairs(S, canalCfg, nomes, false));
}
