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
  publico: { kind: 'combo', dim: 'publico', label: 'Publico', req: true, ph: 'lookalike', modo: 'anuncio' },
  detalhe: {
    kind: 'text', label: 'Detalhe', req: false, ph: 'compradores-180d',
    hint: 'opcional — vazio vira <b>na</b>', modo: 'anuncio'
  },
  posicionamento: { kind: 'combo', dim: 'posicionamento', label: 'Posicionamento', req: true, ph: 'reels', modo: 'anuncio' },
  formato: { kind: 'combo', dim: 'formato', label: 'Formato', req: false, ph: 'video', modo: 'anuncio' },
  angulo: { kind: 'combo', dim: 'angulo', label: 'Angulo', req: false, ph: 'prova-social', modo: 'anuncio' },
  gancho: {
    kind: 'text', label: 'Gancho', req: false, ph: 'aprovada-usp',
    hint: 'vazio vira <b>na</b>', modo: 'anuncio'
  },
  versao: { kind: 'text', label: 'Versao', req: false, ph: 'v01', hint: '<b>v01</b> ate <b>v99</b>', re: 'VERSAO', modo: 'anuncio' },

  /* ── so no modo Organico ─────────────────────────────────────────
     Canal proprio nao tem placement nem criativo: tem segmento, peca
     e o ponto da peca onde o link estava. Chaves proprias para nao
     colidir com os campos de anuncio, que ficam no mesmo HTML.       */
  segmento: { kind: 'combo', dim: 'segmento', label: 'Segmento', req: true, ph: 'crm', modo: 'organico' },
  segmento_detalhe: {
    kind: 'text', label: 'Detalhe', req: false, ph: 'carrinho-abandonado',
    hint: 'opcional — vazio vira <b>na</b>', modo: 'organico'
  },
  peca: { kind: 'combo', dim: 'peca', label: 'Tipo de peca', req: false, ph: 'email', modo: 'organico' },
  posicao: { kind: 'combo', dim: 'posicao', label: 'Posicao do link', req: false, ph: 'cta-principal', modo: 'organico' },
  assunto: {
    kind: 'text', label: 'Assunto / chamada', req: false, ph: 'ultimo-aviso',
    hint: 'vazio vira <b>na</b>', modo: 'organico'
  },
  peca_versao: { kind: 'text', label: 'Versao', req: false, ph: 'v01', hint: '<b>v01</b> ate <b>v99</b>', re: 'VERSAO', modo: 'organico' },

  /* ── so no modo Inside ───────────────────────────────────────────
     Link 1:1 do comercial: importa quem mandou, de onde veio o lead,
     em que etapa da conversa e com que material.                    */
  vendedor: { kind: 'combo', dim: 'vendedor', label: 'Vendedor', req: true, ph: 'joao-victor', modo: 'inside' },
  origem_lead: { kind: 'combo', dim: 'origem_lead', label: 'Origem do lead', req: true, ph: 'meta-lead', modo: 'inside' },
  etapa: { kind: 'combo', dim: 'etapa', label: 'Etapa', req: false, ph: 'follow-up', modo: 'inside' },
  material: { kind: 'combo', dim: 'material', label: 'Material', req: false, ph: 'proposta', modo: 'inside' },
  inside_versao: { kind: 'text', label: 'Versao', req: false, ph: 'v01', hint: '<b>v01</b> ate <b>v99</b>', re: 'VERSAO', modo: 'inside' },

  /* ── so no modo CS ───────────────────────────────────────────────
     Retencao e reversao ja vem separadas pelo canal (utm_medium).
     Aqui importa quem falou, como o aluno estava e o que se tentou. */
  agente: { kind: 'combo', dim: 'agente', label: 'Agente', req: true, ph: 'maria-clara', modo: 'cs' },
  situacao: { kind: 'combo', dim: 'situacao', label: 'Situacao do aluno', req: true, ph: 'em-risco', modo: 'cs' },
  acao: { kind: 'combo', dim: 'acao', label: 'Acao', req: false, ph: 'oferta-retencao', modo: 'cs' },
  material_cs: { kind: 'combo', dim: 'material_cs', label: 'Material', req: false, ph: 'segunda-via', modo: 'cs' },
  cs_versao: { kind: 'text', label: 'Versao', req: false, ph: 'v01', hint: '<b>v01</b> ate <b>v99</b>', re: 'VERSAO', modo: 'cs' },

  /* ── so no modo Afiliados ────────────────────────────────────────
     Um canal so (utm_source=afiliado); quem indicou vai no content,
     e onde e como divulgou vao no term.                             */
  afiliado: { kind: 'combo', dim: 'afiliado', label: 'Afiliado', req: true, ph: 'joao-silva', modo: 'afiliado' },
  categoria: { kind: 'combo', dim: 'categoria_afiliado', label: 'Categoria', req: true, ph: 'creator', modo: 'afiliado' },
  divulgacao: { kind: 'combo', dim: 'divulgacao', label: 'Onde divulgou', req: false, ph: 'instagram', modo: 'afiliado' },
  af_formato: { kind: 'combo', dim: 'formato_afiliado', label: 'Formato', req: false, ph: 'review', modo: 'afiliado' },
  af_versao: { kind: 'text', label: 'Versao', req: false, ph: 'v01', hint: '<b>v01</b> ate <b>v99</b>', re: 'VERSAO', modo: 'afiliado' }
};

export const RE_MAP = { PERIODO: PERIODO_RE, VERSAO: VERSAO_RE };

/* Canal e campanha sao iguais nos dois modos. O que muda sao os blocos
   3 e 4: anuncio fala de publico/criativo, organico fala de segmento/peca. */
const BLOCO_CANAL = {
  n: '0', num: 1, title: 'Canal & destino', map: null,
  desc: 'De onde vem o clique e para onde ele vai.',
  rows: [['canal', 'lp']]
};
const BLOCO_CAMPANHA = {
  n: '1', num: 2, title: 'Campanha', map: 'utm_campaign',
  desc: 'Por que estou gastando esse dinheiro?',
  rows: [['objetivo', 'produto'], ['funil', 'geo'], ['periodo']]
};

export const SECOES = {
  anuncio: [BLOCO_CANAL, BLOCO_CAMPANHA,
    {
      n: '2a', num: 3, modo: 'anuncio', title: 'Conjunto / Ad group', map: 'utm_content',
      desc: 'Para quem?',
      rows: [['publico', 'detalhe'], ['posicionamento']]
    },
    {
      n: '3a', num: 4, modo: 'anuncio', title: 'Anuncio', map: 'utm_term',
      desc: 'Com qual criativo? Bloco opcional — preencha o que fizer sentido.',
      rows: [['formato', 'angulo'], ['gancho', 'versao']]
    }
  ],
  inside: [BLOCO_CANAL, BLOCO_CAMPANHA,
    {
      n: '2i', num: 3, modo: 'inside', title: 'Vendedor / origem', map: 'utm_content',
      desc: 'Quem mandou e de onde veio o lead?',
      rows: [['vendedor', 'origem_lead']]
    },
    {
      n: '3i', num: 4, modo: 'inside', title: 'Abordagem', map: 'utm_term',
      desc: 'Em que etapa e com que material? Bloco opcional.',
      rows: [['etapa', 'material'], ['inside_versao']]
    }
  ],
  cs: [BLOCO_CANAL, BLOCO_CAMPANHA,
    {
      n: '2c', num: 3, modo: 'cs', title: 'Agente / situacao', map: 'utm_content',
      desc: 'Quem falou e como o aluno estava?',
      rows: [['agente', 'situacao']]
    },
    {
      n: '3c', num: 4, modo: 'cs', title: 'Acao', map: 'utm_term',
      desc: 'O que se tentou e com que material? Bloco opcional.',
      rows: [['acao', 'material_cs'], ['cs_versao']]
    }
  ],
  afiliado: [BLOCO_CANAL, BLOCO_CAMPANHA,
    {
      n: '2f', num: 3, modo: 'afiliado', title: 'Afiliado', map: 'utm_content',
      desc: 'Quem indicou?',
      rows: [['afiliado', 'categoria']]
    },
    {
      n: '3f', num: 4, modo: 'afiliado', title: 'Divulgacao', map: 'utm_term',
      desc: 'Onde e como ele divulgou? Bloco opcional.',
      rows: [['divulgacao', 'af_formato'], ['af_versao']]
    }
  ],
  organico: [BLOCO_CANAL, BLOCO_CAMPANHA,
    {
      n: '2o', num: 3, modo: 'organico', title: 'Publico / segmento', map: 'utm_content',
      desc: 'Para quem foi o envio?',
      rows: [['segmento', 'segmento_detalhe']]
    },
    {
      n: '3o', num: 4, modo: 'organico', title: 'Peca', map: 'utm_term',
      desc: 'Qual peca e onde estava o link? Bloco opcional.',
      rows: [['peca', 'posicao'], ['assunto', 'peca_versao']]
    }
  ]
};

/* ordem de render no HTML: os compartilhados uma vez, depois os dois pares */
export const SECOES_RENDER = [
  BLOCO_CANAL, BLOCO_CAMPANHA,
  ...SECOES.anuncio.slice(2),
  ...SECOES.organico.slice(2),
  ...SECOES.inside.slice(2),
  ...SECOES.cs.slice(2),
  ...SECOES.afiliado.slice(2)
];

/* rotulos do painel de saida, por modo */
export const PREVIEWS = {
  anuncio: [
    { id: 'campanha', titulo: 'Campanha', map: 'utm_campaign', vazio: 'complete o bloco 2' },
    { id: 'conjunto', titulo: 'Conjunto / ad group', map: 'utm_content', vazio: 'complete o bloco 3' },
    { id: 'anuncio', titulo: 'Anuncio', map: 'utm_term', vazio: 'opcional — preencha o bloco 4 se quiser' }
  ],
  organico: [
    { id: 'campanha', titulo: 'Campanha', map: 'utm_campaign', vazio: 'complete o bloco 2' },
    { id: 'conjunto', titulo: 'Publico / segmento', map: 'utm_content', vazio: 'complete o bloco 3' },
    { id: 'anuncio', titulo: 'Peca', map: 'utm_term', vazio: 'opcional — preencha o bloco 4 se quiser' }
  ],
  inside: [
    { id: 'campanha', titulo: 'Campanha', map: 'utm_campaign', vazio: 'complete o bloco 2' },
    { id: 'conjunto', titulo: 'Vendedor / origem', map: 'utm_content', vazio: 'complete o bloco 3' },
    { id: 'anuncio', titulo: 'Abordagem', map: 'utm_term', vazio: 'opcional — preencha o bloco 4 se quiser' }
  ],
  cs: [
    { id: 'campanha', titulo: 'Campanha', map: 'utm_campaign', vazio: 'complete o bloco 2' },
    { id: 'conjunto', titulo: 'Agente / situacao', map: 'utm_content', vazio: 'complete o bloco 3' },
    { id: 'anuncio', titulo: 'Acao', map: 'utm_term', vazio: 'opcional — preencha o bloco 4 se quiser' }
  ],
  afiliado: [
    { id: 'campanha', titulo: 'Campanha', map: 'utm_campaign', vazio: 'complete o bloco 2' },
    { id: 'conjunto', titulo: 'Afiliado', map: 'utm_content', vazio: 'complete o bloco 3' },
    { id: 'anuncio', titulo: 'Divulgacao', map: 'utm_term', vazio: 'opcional — preencha o bloco 4 se quiser' }
  ]
};

/* normaliza qualquer coisa digitada para um token valido */
export const slug = s => String(s == null ? '' : s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-')
  .replace(/-{2,}/g, '-')
  .replace(/^-+/, '');
