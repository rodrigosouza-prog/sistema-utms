# Sistema de UTM — Aprova Total

Gerador de nomenclatura de campanha e UTM. Padroniza o nome de **campanha**,
**conjunto** e **anúncio** a partir de um dicionário controlado, e monta a URL
final, o tracking template ou os parâmetros de URL de cada plataforma.

Astro estático, sem backend. Roda inteiro no navegador.

## Rodar local

```bash
npm install
npm run dev      # http://localhost:4330
npm run build    # gera dist/
npm run preview
```

## Estrutura

```
taxonomia/dicionario.json   fonte da verdade: valores válidos de cada dimensão
src/lib/fields.js           campos, seções e regras de validação
src/lib/utm.js              macros, tracking templates e montagem da URL
src/scripts/generator.js    runtime: estado, combobox, dicionário editável
src/pages/index.astro       as 4 telas (Gerador, Histórico, Dicionário, Regras)
docs/                       nomenclatura e tracking templates
```

## Como o nome é montado

O gerador tem quatro modos, escolhidos no menu lateral. **Canal e campanha são
idênticos em todos**; os blocos 3 e 4 mudam.

**Anúncios** — mídia paga:

| Saída | Fórmula |
|---|---|
| `utm_campaign` | `objetivo_produto_funil_geo_data` |
| `utm_content` | `publico_detalhe_posicionamento` |
| `utm_term` | `formato_angulo_gancho_versao` |

**Orgânico** — canal próprio (e-mail, WhatsApp, SMS, push, social):

| Saída | Fórmula |
|---|---|
| `utm_campaign` | `objetivo_produto_funil_geo_data` |
| `utm_content` | `segmento_detalhe` |
| `utm_term` | `peca_posicao_assunto_versao` |

**Inside sales** — link 1:1 do comercial:

| Saída | Fórmula |
|---|---|
| `utm_campaign` | `objetivo_produto_funil_geo_data` |
| `utm_content` | `vendedor_origem-do-lead` |
| `utm_term` | `etapa_material_versao` |

**CS** — retenção e reversão da base:

| Saída | Fórmula |
|---|---|
| `utm_campaign` | `objetivo_produto_funil_geo_data` |
| `utm_content` | `agente_situacao` |
| `utm_term` | `acao_material_versao` |

Canal próprio não tem placement nem criativo: tem segmento, peça e o ponto da
peça onde o link estava. Inside e CS são 1:1, então importa quem falou e em
que contexto.

No CS, **retenção e reversão já vêm separadas pelo canal**: o `utm_medium` sai
como `cs-retencao` ou `cs-reversao`, então dá para filtrar uma frente ou outra
sem depender do nome.

O **bloco 4 é opcional** nos dois modos: se ninguém encostar nele, `utm_term`
não entra na URL. Se preencher parte, o resto vira `na` — token vazio nunca
fica em branco. Data no formato `12-12-26`, ou `perene` para campanha sem
data de corte.

Regras completas em `_meta.regras_globais` do dicionário e na tela
**Regras & padrão**.

## Editar o dicionário

A tela **Dicionário** permite adicionar, editar e remover valores. As alterações
ficam no `localStorage` do navegador — são suas até você clicar em **Baixar JSON**
e substituir `taxonomia/dicionario.json` neste repositório. É o commit desse
arquivo que faz a mudança valer para o time.

## Exports do GTM não entram aqui

`GTM-*.json` está no `.gitignore` por regra, não por acaso: o export do
container **server-side** guarda access tokens da Meta Conversions API em
texto puro. Se precisar versionar um container, troque os valores das
variáveis de token por placeholders antes.

O patch de normalização do GTM (referenciado em `docs/02-tracking-templates.md`)
vive em `gtm-patch/` e ainda está no roadmap.
