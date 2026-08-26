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

Canal e campanha são iguais nos dois. O que muda são os dois de baixo:
mídia paga fala de público e criativo, canal próprio fala de segmento,
peça e o ponto da peça onde o link estava.

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
| 2 | **produto** | `intensivo-enem` `reta-final` `aprovalive` `craques-enem` `treino-elite` |
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
| 1 | **peca** | `email` `newsletter` `broadcast` `grupo` `status` `sms` `push-app` `post` `reels` `story` `bio` |
| 2 | **posicao** | `header` `banner` `cta-principal` `corpo` `rodape` `assinatura` `legenda` `bio-link` |
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
