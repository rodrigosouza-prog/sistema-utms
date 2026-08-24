# Padrão de Nomenclatura — Aprova Total

## Princípio

Três níveis, três perguntas. Cada nível responde só a sua — nada se repete.

| Nível | Pergunta | Vira |
|---|---|---|
| **Campanha** | *Por que estou gastando esse dinheiro?* | `utm_campaign` |
| **Conjunto / Ad Group** | *Para quem?* | `utm_term` |
| **Anúncio** | *Com qual criativo?* | `utm_content` |

Regra de ouro: **se a informação já está no nível de cima, não repete embaixo.**

---

## Estrutura

```
CAMPANHA   obj_produto_funil_geo_periodo_resp
CONJUNTO   publico_detalhe_posicionamento
ANÚNCIO    formato_angulo_gancho_vNN
```

### Exemplo real

```
CAMPANHA   conv_intensivo-enem_fundo_br_2026t1_jvs
CONJUNTO   lal_compradores-180d_reels
ANÚNCIO    vid_prova-social_aprovada-usp_v03
```

Lido em voz alta: *"campanha de conversão do Intensivo Enem, fundo de funil, Brasil, 1º trimestre de 2026, feita pelo João; conjunto de lookalike de compradores de 180 dias no Reels; anúncio em vídeo com ângulo de prova social, gancho da aprovada da USP, versão 3."*

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

## Ordem dos tokens — decisão a tomar

Você pediu **quem fez → objetivo → produto**. Coloquei `resp` no fim, de propósito:

Toda plataforma de anúncio **ordena a lista de campanhas alfabeticamente pelo nome**. Com `resp` na frente, a lista agrupa por pessoa — você vê "todas as campanhas do João" mas nunca "todas as campanhas do Intensivo Enem". Com `obj_produto` na frente, a lista agrupa pelo que você realmente filtra no dia a dia, e o responsável continua rastreável (é o último token, e vira dimensão própria no GA4 e no banco).

Se accountability for prioridade sobre navegação, é trocar uma linha em `taxonomia/dicionario.json`. Só me avisar.

---

## Dimensões

### Nível CAMPANHA

| Token | Dimensão | Exemplos |
|---|---|---|
| 1 | **objetivo** | `conv` `lead` `remkt` `traf` `alc` `vid` `eng` `app` `mkt` |
| 2 | **produto** | `intensivo-enem` `reta-final` `aprovalive` `craques-enem` `treino-elite` |
| 3 | **funil** | `topo` `meio` `fundo` `reten` `recup` |
| 4 | **geo** | `br` `sudeste` `sp` `na` |
| 5 | **periodo** | `2026t1` `2026-01` `perene` |
| 6 | **responsavel** | iniciais, 2-4 letras |

### Nível CONJUNTO

| Token | Dimensão | Exemplos |
|---|---|---|
| 1 | **publico** | `lal` `int` `aberto` `custom` `remkt` `crm` `kw-exata` `dsa` `marca` `concorr` |
| 2 | **detalhe** | livre-controlado: `compradores-180d` `visitantes-30d` `enem-2026` |
| 3 | **posicionamento** | `auto` `feed` `stories` `reels` `search` `youtube` `display` |

### Nível ANÚNCIO

| Token | Dimensão | Exemplos |
|---|---|---|
| 1 | **formato** | `vid` `img` `carr` `rsa` `ugc` `story` |
| 2 | **angulo** | `prova-social` `dor` `autoridade` `oferta` `urgencia` |
| 3 | **gancho** | livre-controlado: `aprovada-usp` `nota-980-redacao` |
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

Nosso padrão gera ~45-55 chars. Folga confortável em todas.
