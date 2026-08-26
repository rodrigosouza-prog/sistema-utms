/* Definicao dos campos e secoes do gerador.
   Compartilhado entre o render de build (.astro) e o runtime no cliente. */

export const TOKEN_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const PERIODO_RE = /^((0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{2}|perene)$/;
export const VERSAO_RE = /^v[0-9]{2}$/;

/* O regex garante o formato dd-mm-aa; isto garante que a data existe —
   31-02-26 passa no regex mas nao e um dia real.
   Barra nao entra: '/' quebraria a URL e nao esta nos caracteres validos. */
export function dataValida(v) {
  if (v === 'perene') return true;
  const [d, m, aa] = v.split('-').map(Number);
  const y = 2000 + aa;
  const dt = new Date(y, m - 1, d);
  return dt.getDate() === d && dt.getMonth() === m - 1 && dt.getFullYear() === y;
}

/* kind:
   select -> valor fechado (so canal, porque mapeia source/medium/platform)
   combo  -> texto livre COM sugestoes do dicionario
   text   -> texto livre puro
   url    -> landing page                                            */
export const FIELDS = {
  canal: {
    kind: 'canal', label: 'Canal', req: true,
    hint: 'escolha o canal — ele define utm_source e utm_medium'
  },
  lp: {
    kind: 'url', label: 'Landing page', req: true,
    ph: 'https://aprovatotal.com.br/intensivo-enem',
    hint: 'sem UTM na URL — o gerador adiciona'
  },
  objetivo: { kind: 'combo', dim: 'objetivo', label: 'Objetivo', req: true, ph: 'conversao' },
  produto: { kind: 'combo', dim: 'produto', label: 'Produto / evento', req: true, ph: 'intensivo-enem' },
  funil: { kind: 'combo', dim: 'funil', label: 'Funil', req: true, ph: 'fundo' },
  geo: { kind: 'combo', dim: 'geo', label: 'Geo', req: true, ph: 'brasil' },
  periodo: {
    kind: 'text', label: 'Data', req: true, ph: '12-12-26',
    hint: 'dia-mes-ano — <b>12-12-26</b> · ou <b>perene</b>',
    re: 'PERIODO', chk: dataValida, chkWhy: 'essa data nao existe'
  },
  publico: { kind: 'combo', dim: 'publico', label: 'Publico', req: true, ph: 'lookalike' },
  detalhe: {
    kind: 'text', label: 'Detalhe', req: false, ph: 'compradores-180d',
    hint: 'opcional — vazio vira <b>na</b>'
  },
  posicionamento: { kind: 'combo', dim: 'posicionamento', label: 'Posicionamento', req: true, ph: 'reels' },
  formato: { kind: 'combo', dim: 'formato', label: 'Formato', req: false, ph: 'video' },
  angulo: { kind: 'combo', dim: 'angulo', label: 'Angulo', req: false, ph: 'prova-social' },
  gancho: {
    kind: 'text', label: 'Gancho', req: false, ph: 'aprovada-usp',
    hint: 'vazio vira <b>na</b>'
  },
  versao: { kind: 'text', label: 'Versao', req: false, ph: 'v01', hint: '<b>v01</b> ate <b>v99</b>', re: 'VERSAO' }
};

export const RE_MAP = { PERIODO: PERIODO_RE, VERSAO: VERSAO_RE };

export const SECTIONS = [
  {
    n: '0', title: 'Canal & destino', map: null,
    desc: 'De onde vem o clique e para onde ele vai.',
    rows: [['canal', 'lp']]
  },
  {
    n: '1', title: 'Campanha', map: 'utm_campaign',
    desc: 'Por que estou gastando esse dinheiro?',
    rows: [['objetivo', 'produto'], ['funil', 'geo'], ['periodo']]
  },
  {
    n: '2', title: 'Conjunto / Ad group', map: 'utm_content',
    desc: 'Para quem?',
    rows: [['publico', 'detalhe'], ['posicionamento']]
  },
  {
    n: '3', title: 'Anuncio', map: 'utm_term',
    desc: 'Com qual criativo? Bloco opcional — preencha o que fizer sentido.',
    rows: [['formato', 'angulo'], ['gancho', 'versao']]
  }
];

/* normaliza qualquer coisa digitada para um token valido */
export const slug = s => String(s == null ? '' : s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-')
  .replace(/-{2,}/g, '-')
  .replace(/^-+/, '');
