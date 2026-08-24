# Tracking Templates por Plataforma

## Diagnóstico do template atual

```
{lpurl}&utm_source=google&utm_medium={ifsearch:cpc}{ifcontent:display}&utm_campaign={_campaign}&utm_content={_content}&utm_term={keyword}&matchtype={matchtype}&device={device}&network={network}&adgroupid={adgroupid}&campaignid={campaignid}&creative={creative}&adposition={adposition}
```

### 🔴 1. `{lpurl}&` quebra URL de LP sem query string

`{lpurl}` devolve a Final URL como ela é. Se a LP for `https://aprovatotal.com.br/intensivo-enem`, o resultado é:

```
https://aprovatotal.com.br/intensivo-enem&utm_source=google...
```

Sem `?`, **nada disso é query string** — vira parte do path. Nenhum UTM é lido, nem pelo GA4, nem pelo GTM, nem pelo n8n.

**Correção:** trocar `&` por `?`. O Google converte o `?` em `&` automaticamente quando a Final URL já tem query string, então `?` funciona nos dois casos e `&` só funciona em um.
> Confirme no botão **"Testar"** do campo de tracking template com uma LP com `?` e outra sem.

### 🔴 2. `utm_medium` fica vazio em metade das campanhas

Só existem quatro if-functions no ValueTrack: `{ifmobile:}`, `{ifnotmobile:}`, `{ifsearch:}`, `{ifcontent:}`. **Não existe `{ifvideo:}` nem `{ifshopping:}`.**

Em Video, Shopping, Demand Gen e boa parte do PMax, as duas condições falham e o resultado é `utm_medium=` vazio → o GA4 joga a sessão em *Unassigned* ou reatribui pelo referrer.

**Correção:** medium estático por tipo de campanha (um template por tipo), ou custom parameter `{_medium:cpc}` com default garantido.

### 🟠 3. Sete parâmetros que não fazem absolutamente nada

`matchtype`, `device`, `network`, `adgroupid`, `campaignid`, `creative`, `adposition` **não têm prefixo `utm_`** — o GA4 ignora todos. Hoje eles só:

- alongam a URL
- criam variação infinita de URL (derruba cache hit de CDN, polui canonical)
- aparecem na barra de endereço do aluno

Eles **só passam a valer** quando o GTM lê e manda como event parameter. Isso está no patch do GTM (`gtm-patch/`).

### 🟠 4. `{_campaign}` sem default = `utm_campaign` vazio

Custom parameter não herdado/não preenchido resolve para string vazia, silenciosamente. **Sempre use default:** `{_campaign:na}`.
Limites: **8 custom parameters por nível**, nome ≤ 16 chars, valor ≤ 250 chars.

### 🟡 5. `{adposition}` é lixo pós-2019

Média de posição foi descontinuada. Devolve códigos tipo `1t2`. Descartar.

### 🟡 6. Faltam os 4 UTMs que o GA4 lê nativamente

`utm_id`, `utm_source_platform`, `utm_creative_format`, `utm_marketing_tactic`.
O **`utm_id`** é o mais importante do projeto: com `utm_id={campaignid}` você casa custo do Google Ads com receita no GA4/BigQuery **por ID**, sem depender de string matching de nome de campanha (que quebra no primeiro rename).

### ℹ️ 7. Não desligue o auto-tagging

`gclid`/`gbraid`/`wbraid` continuam obrigatórios. No GA4 com Google Ads vinculado, o `gclid` tem precedência sobre UTM manual para os relatórios de Google Ads. As UTMs manuais servem para o **banco de vocês (n8n)**, para consistência cross-canal e para quem não tem link nativo.

---

## ✅ Google Ads

> **Templates oficiais do time.** Ficam no `src/lib/utm.js` como `GADS_TEMPLATES` e são usados **verbatim** — o sistema não reescreve. Alterar aqui só com quem opera a conta.

### Completo

```
{lpurl}&utm_source=google&utm_medium={ifsearch:cpc}{ifcontent:display}&utm_campaign={_campaign}&utm_content={_content}&utm_term={keyword}&matchtype={matchtype}&device={device}&network={network}&adgroupid={adgroupid}&campaignid={campaignid}&creative={creative}&adposition={adposition}
```

### Simples

```
{lpurl}&utm_source=google&utm_medium=cpc&utm_campaign={_campaign}&utm_term={keyword}
```

### Custom parameters

O template é **fixo** — cola uma vez em *Configurações da campanha → Opções de URL*. O que muda a cada campanha são os dois custom parameters, e é isso que o gerador entrega:

| Parâmetro | Recebe | Nível |
|---|---|---|
| `_campaign` | nome da campanha gerado | Campanha |
| `_content` | nome do anúncio gerado | Anúncio |

### Pontos a verificar quando sobrar tempo

Nenhum destes é bloqueante — o template roda. Ficam registrados para decisão futura:

1. **`{lpurl}&`** — funciona quando a Final URL já tem `?`. Em LP sem query string o resultado é `.../intensivo-enem&utm_source=google`, sem `?`, e nenhum UTM é lido. O gerador avisa quando a LP informada não tem query string. Teste no botão **Testar** do campo.
2. **`{ifsearch:}{ifcontent:}`** — não existe `{ifvideo:}` nem `{ifshopping:}`. Em Video, Shopping e Demand Gen as duas condições falham e `utm_medium` sai vazio.
3. **Os 7 sem prefixo `utm_`** (`matchtype`, `device`, `network`, `adgroupid`, `campaignid`, `creative`, `adposition`) — o GA4 ignora. Só viram dimensão com o patch do GTM, que está no roadmap.
4. **`{_campaign}` sem default** — custom parameter não herdado resolve para vazio silenciosamente. `{_campaign:na}` evitaria.
5. **`{adposition}`** — descontinuado desde 2019 (média de posição).

---

## ✅ Meta Ads

Campo **URL parameters** (nível anúncio) — cole sem `?` inicial:

```
utm_id={{campaign.id}}&utm_source={{site_source_name}}&utm_source_platform=meta_ads&utm_medium=paid-social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}&utm_marketing_tactic={{adset.name}}&mt_placement={{placement}}&mt_adset={{adset.id}}&mt_ad={{ad.id}}
```

| Macro | Devolve |
|---|---|
| `{{site_source_name}}` | `fb` · `ig` · `msg` · `an` |
| `{{placement}}` | ex. `Instagram_Reels` |
| `{{campaign.name}}` / `{{campaign.id}}` | nome / ID |
| `{{adset.name}}` / `{{adset.id}}` | nome / ID |
| `{{ad.name}}` / `{{ad.id}}` | nome / ID |

⚠️ `{{site_source_name}}` devolve **`fb`**, não `facebook`. Sem normalização, seu relatório terá `fb` e `facebook` como fontes diferentes. A camada de sanitização do GTM resolve isso via `aliases_normalizacao` — é o principal motivo dela existir.

⚠️ Ative **"Adicionar parâmetros a todos os URLs"** no nível do anúncio para cobrir também o botão de CTA e o destino do Reels.

---

## ✅ TikTok Ads

```
utm_id=__CAMPAIGN_ID__&utm_source=tiktok&utm_source_platform=tiktok_ads&utm_medium=paid-social&utm_campaign=__CAMPAIGN_NAME__&utm_content=__CID_NAME__&utm_term=__AID_NAME__&tt_placement=__PLACEMENT__&tt_adgroup=__AID__&tt_ad=__CID__
```

| Macro | Devolve |
|---|---|
| `__CAMPAIGN_ID__` / `__CAMPAIGN_NAME__` | campanha |
| `__AID__` / `__AID_NAME__` | ad group |
| `__CID__` / `__CID_NAME__` | ad |
| `__PLACEMENT__` | posicionamento |

---

## ✅ Microsoft Ads (Bing)

ValueTrack compatível com Google. `msclkid` é auto-tagged.

```
{lpurl}?utm_id={campaignid}&utm_source=bing&utm_source_platform=microsoft_ads&utm_medium=cpc&utm_campaign={_campaign:na}&utm_content={_content:na}&utm_term={keyword}&utm_marketing_tactic=fundo&ms_grp={adgroupid}&ms_mt={matchtype}&ms_dev={device}&ms_net={network}
```

---

## ⚠️ LinkedIn Ads

**Não tem macro dinâmica de URL.** Toda UTM é digitada à mão no campo Destination URL de cada anúncio — é a plataforma de maior risco de erro humano do stack. Usar o gerador, sempre.

```
?utm_id=<ID_DA_CAMPANHA_MANUAL>&utm_source=linkedin&utm_source_platform=linkedin_ads&utm_medium=paid-social&utm_campaign=<NOME>&utm_content=<NOME_ANUNCIO>&utm_term=<NOME_ADSET>
```

---

## ✅ Reddit Ads

```
?utm_id={{CAMPAIGN_ID}}&utm_source=reddit&utm_source_platform=reddit_ads&utm_medium=paid-social&utm_campaign={{CAMPAIGN_NAME}}&utm_content={{AD_NAME}}&utm_term={{ADGROUP_NAME}}
```
> Confirmar disponibilidade das macros na conta — o Reddit habilita por conta.

---

## ✅ E-mail (ActiveCampaign)

```
?utm_id=%SUBSCRIBERID%&utm_source=activecampaign&utm_source_platform=activecampaign&utm_medium=email&utm_campaign=<nome_automacao>&utm_content=<posicao_do_link>&utm_term=<segmento>
```

---

## ✅ Orgânico / manual (bio, WhatsApp, influencer, afiliado)

Sempre pelo gerador. Nunca `utm_medium=social` genérico — usa `social-organic`, `bio`, `messaging`, `influencer`, `affiliate` conforme o dicionário.

---

## Click IDs — cobertura

| Plataforma | Parâmetro | Capturado hoje |
|---|---|---|
| Google Ads | `gclid` | ✅ |
| Google Ads (iOS app) | `gbraid` | ✅ |
| Google Ads (iOS web) | `wbraid` | ❌ **falta** |
| Meta | `fbclid` → `_fbc` | ✅ |
| TikTok | `ttclid` → `_ttclid` | ✅ |
| Microsoft | `msclkid` | ❌ **falta** |
| LinkedIn | `li_fat_id` | ❌ **falta** |
| Reddit | `rdt_cid` | ❌ **falta** |
| Twitter/X | `twclid` | ❌ **falta** |
| Pinterest | `epik` | ❌ **falta** |
| Snapchat | `ScCid` | ❌ **falta** |
| Afiliados (Impact) | `irclickid` | ❌ **falta** |

Todos entram no patch do GTM.
