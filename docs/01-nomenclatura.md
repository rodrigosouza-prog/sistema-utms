# Padrão de Nomenclatura — Aprova Total

## Princípio

Três níveis, três perguntas. Cada nível responde só a sua — nada se repete.

| Nível | Pergunta | Vira |
|---|---|---|
| **Campanha** | *Por que estou gastando esse dinheiro?* | `utm_campaign` |
| **Conjunto / Ad Group** | *Para quem?* | `utm_content` |
| **Anúncio** | *Com qual criativo?* | `utm_term` |

Regra de ouro: **se a informação já está no nível de cima, não repete embaixo.**

---

## Estrutura

**Anúncios** — mídia paga:

```
CAMPANHA   objetivo_produto_funil_geo_data
CONJUNTO   publico_detalhe_posicionamento
ANÚNCIO    formato_angulo_gancho_vNN          (opcional)
```

**Orgânico** — canal próprio:

```
CAMPANHA   objetivo_produto_funil_geo_data
SEGMENTO   segmento_detalhe
PEÇA       peca_posicao_assunto_vNN          (opcional)
```

**Inside sales** — link 1:1 do comercial:

```
CAMPANHA   objetivo_produto_funil_geo_data
VENDEDOR   vendedor_origem-do-lead_operador
ABORDAGEM  etapa_material_vNN                (opcional)
```

**Afiliados** — programa de indicação:

```
CAMPANHA   objetivo_produto_funil_geo_data
AFILIADO   afiliado_categoria
DIVULGAÇÃO divulgacao_formato_vNN            (opcional)
```

**CS** — retenção e reversão:

```
CAMPANHA   objetivo_produto_funil_geo_data
AGENTE     agente_situacao
AÇÃO       acao_material_vNN                 (opcional)
```

Canal e campanha são iguais nos quatro. O que muda são os dois de baixo:
mídia paga fala de público e criativo, canal próprio fala de segmento e
peça, inside e CS falam de quem falou e em que contexto.

No CS a frente não é um token: **retenção e reversão vêm do canal**, como
`utm_medium=cs-retencao` ou `cs-reversao`. Medium é dimensão de primeira
classe no GA4, então dá para filtrar sem quebrar o nome em pedaços.

### utm_medium tem dois valores, só

| Valor | Quando | Canais |
|---|---|---|
| `cpc` | pagamos pelo clique | 18 |
| `organico` | todo o resto | 23 |

Não existe terceiro valor. A granularidade mora na `utm_source`, que é única
por canal — é ela que separa o WhatsApp de marketing (`whatsapp`) do WhatsApp
do vendedor (`whatsapp-inside`) e do WhatsApp da retenção
(`whatsapp-cs-retencao`).

Nunca use `organic`, em inglês: é o valor que o GA4 reserva para busca não
paga, e marcar link próprio com ele contamina o dado de SEO.

> ⚠️ `utm_medium=organico` não casa com nenhuma regra padrão do GA4 e cai em
> "Unassigned". Crie um **grupo de canais personalizado** com uma condição só:
> `Medium corresponde exatamente a organico`. Já `cpc` o GA4 resolve sozinho,
> classificando pela source.

### Blog: cuidado com link interno

O canal **blog** (`utm_source=blog`, `utm_medium=conteudo`) só deve marcar
links que **saem do domínio**. Se o blog vive no mesmo domínio da landing
page, colocar UTM num link interno **zera a origem real do visitante**: quem
chegou por um anúncio do Meta vira "blog" no relatório, e o GA4 abre uma
sessão nova ali. Para link interno, use um parâmetro sem prefixo `utm_` e
leia com o GTM. O gerador avisa isso na tela quando você escolhe o blog.

### Exemplo real

```
CAMPANHA   conversao_intensivo-enem_fundo_sao-paulo_12-12-26
CONJUNTO   lookalike_compradores-180d_reels
ANÚNCIO    video_prova-social_aprovada-usp_v01
```

Lido em voz alta: *"campanha de conversão do Intensivo Enem, fundo de funil, São Paulo, começando em 12 de dezembro de 2026; conjunto de lookalike de compradores de 180 dias no Reels; anúncio em vídeo com ângulo de prova social, gancho da aprovada da USP, versão 1."*

O nível **ANÚNCIO é opcional**. Se ninguém preencher, `utm_content` não entra
na URL. Se preencher parte, os tokens restantes viram `na` — a posição nunca
muda, então dá para separar por coluna em qualquer planilha.

---

## Regras de formatação

| Regra | Valor |
|---|---|
| Caixa | `minúscula` sempre |
| Entre tokens | `_` (underline) |
| Dentro do token | `-` (hífen) |
| Acentos / cedilha | **proibido** |
| Espaços | **proibido** |
| Caracteres válidos | `a-z 0-9 - _` |
| Token vazio | escrever `na` — nunca deixar em branco |
| Regex por token | `^[a-z0-9]+(-[a-z0-9]+)*$` |

**Por que `_` fora e `-` dentro:** ambos passam em URL sem encoding, e a inversão permite fazer `split("_")` para separar dimensões e ler o valor inteiro sem ambiguidade. `|`, espaço e `/` exigiriam `%7C`, `%20`, `%2F` e quebram relatório.

---

## Dimensões

### Nível CAMPANHA

| Token | Dimensão | Exemplos |
|---|---|---|
| 1 | **objetivo** | `conversao` `lead` `remarketing` `trafego` `alcance` `video` `engajamento` |
| 2 | **produto** | `intensivo-enem` `reta-final` `aprovalive` `craques-enem` `treino-elite` `plataforma-2026` `plataforma-2027` `combo-plataforma-resolve` |
| 3 | **funil** | `topo` `meio` `fundo` `retencao` `recuperacao` |
| 4 | **geo** | `brasil` `sudeste` `sao-paulo` `na` |
| 5 | **data** | `12-12-26` (dia-mês-ano, ano com 2 dígitos) · `perene` |

### Nível CONJUNTO

| Token | Dimensão | Exemplos |
|---|---|---|
| 1 | **publico** | `lookalike` `interesses` `aberto` `personalizado` `remarketing` `crm` `keyword-exata` `dynamic-search` `concorrentes` |
| 2 | **detalhe** | livre-controlado: `compradores-180d` `visitantes-30d` `enem-2026` |
| 3 | **posicionamento** | `automatico` `feed` `stories` `reels` `search` `youtube` `display` |

### Nível ANÚNCIO — só no modo Anúncios

| Token | Dimensão | Exemplos |
|---|---|---|
| 1 | **formato** | `video` `imagem` `carrossel` `responsive-search` `ugc` `vertical` |
| 2 | **angulo** | `prova-social` `dor` `autoridade` `oferta` `urgencia` |
| 3 | **gancho** | livre-controlado: `aprovada-usp` `nota-980-redacao` |
| 4 | **versao** | `v01` … `v99` |

### Nível SEGMENTO — só no modo Orgânico

| Token | Dimensão | Exemplos |
|---|---|---|
| 1 | **segmento** | `crm` `lista` `tag` `engajados` `inativos` `carrinho` `alunos` `compradores` |
| 2 | **detalhe** | livre-controlado: `24h` `carrinho-abandonado` `turma-2026` |

### Nível PEÇA — só no modo Orgânico

| Token | Dimensão | Exemplos |
|---|---|---|
| 1 | **peca** | `email` `newsletter` `broadcast` `grupo` `status` `sms` `push-app` `app-banner` `app-card` `post` `reels` `story` `bio` `blog-post` `ebook` |
| 2 | **posicao** | `header` `banner` `cta-principal` `corpo` `rodape` `assinatura` `legenda` `bio-link` `meio-artigo` `fim-artigo` `sidebar` `pop-up` |
| 3 | **assunto** | livre-controlado: `ultimo-aviso` `vagas-acabando` |
| 4 | **versao** | `v01` … `v99` |

---

## Limites das plataformas

| Plataforma | Limite nome campanha | Observação |
|---|---|---|
| Google Ads | 255 chars | nome não é ValueTrack — precisa de custom parameter |
| Meta Ads | ~400 chars | `{{campaign.name}}` disponível nativamente |
| TikTok Ads | 512 chars | `__CAMPAIGN_NAME__` disponível |
| LinkedIn | 255 chars | **sem macro dinâmica** — UTM manual obrigatória |
| Microsoft | 255 chars | ValueTrack compatível com Google |

Nosso padrão gera ~50-70 chars. Folga confortável em todas.
