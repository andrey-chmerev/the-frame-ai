# THE Frame

FRAME — AI-सहायता प्राप्त एकल विकास के लिए फ्रेमवर्क

[🇺🇸 English](README.md) | [🇨🇳 中文](README.zh.md) | [🇮🇳 हिंदी](README.hi.md) | [🇯🇵 日本語](README.ja.md) | [🇩🇪 Deutsch](README.de.md) | [🇪🇸 Español](README.es.md) | [🇷🇺 Русский](README.ru.md)

## FRAME क्या है?

**FRAME (Framework for AI-Assisted Solo Development)** Claude Code के साथ उत्पाद बनाने वाले एकल डेवलपर्स के लिए एक फ्रेमवर्क है। यह अव्यवस्थित AI-सहायता प्राप्त विकास को एक पूर्वानुमानित प्रक्रिया में बदलता है — विचार से लेकर डिप्लॉय तक — मेमोरी, संरचना और गलतियों से सुरक्षा के साथ।

यदि आप Claude Code के साथ अकेले कोई उत्पाद बना रहे हैं और एक टीम की तरह काम करना चाहते हैं — FRAME आपके लिए है।

## FRAME कौन सी समस्याएं हल करता है?

| समस्या | FRAME क्या प्रदान करता है |
|--------|--------------------------|
| सत्रों के बीच संदर्भ खोना | प्रोजेक्ट मेमोरी और सत्र शुरू होने पर स्वचालित स्थिति डंप |
| कार्यों और प्राथमिकताओं में अव्यवस्था | 6-चरण वर्कफ़्लो: अनुसंधान → योजना → निर्माण → समीक्षा → शिप → प्रतिबिंब |
| कुछ महत्वपूर्ण तोड़ने का डर | सेफ्टी हुक्स विनाशकारी कमांड को चलने से पहले ब्लॉक करते हैं |
| दोहराव वाले नियमित कार्य | पूर्ण विकास चक्र के लिए 35 तैयार कमांड |
| निर्भरताओं वाली जटिल सुविधाएं | स्वतंत्र कार्यों के लिए समानांतर सब-एजेंट |
| एकल कार्य के लिए कोई संरचना नहीं | Roadmap, STATE.md, MAP.md — हमेशा जानें आप कहां हैं और आगे क्या है |
| डिप्लॉय पर सुरक्षा कमजोरियां | Security एजेंट OWASP Top 10, secrets, infrastructure, AI risks की जांच करता है |

## FRAME के साथ कैसे काम करें

```
अनुसंधान → योजना → निर्माण → समीक्षा → शिप → प्रतिबिंब
```

प्रत्येक सत्र एक चक्र है। `/frame:daily` से शुरू करें, `/frame:ship` के साथ समाप्त करें।

**अनुसंधान** — बनाने से पहले समझें
`/frame:research <विषय>` चलाएं — Claude कोडबेस, बाहरी स्रोतों का पता लगाता है और अगले चरण के लिए संदर्भ बनाता है।

**योजना** — कार्यों में विभाजित करें
`/frame:plan <सुविधा>` अनुसंधान को अनुमानों के साथ एक ठोस कार्य सूची में बदलता है।

**निर्माण** — लागू करें
`/frame:build` TDD के साथ क्रमिक रूप से कार्य निष्पादित करता है (एक बार में 1–3)। कई स्वतंत्र कार्यों के लिए — `/frame:wave` उन्हें समानांतर बैचों में चलाता है। जब गुणवत्ता गति से अधिक महत्वपूर्ण हो — `/frame:wave-team` प्रत्येक कार्य के बाद एक समीक्षा टीम (Security, Performance, Tests, Conventions) जोड़ता है। अटक गए — `/frame:unstuck`। बग मिला — `/frame:debug`।

**समीक्षा** — डिप्लॉय करने से पहले जांचें
`/frame:review` स्वचालित जांच चलाता है और एक चेकलिस्ट देता है: परीक्षण, प्रकार, सुरक्षा, प्रदर्शन।

**शिप** — डिप्लॉय करें और रिकॉर्ड करें
`/frame:ship` कमिट करता है, वैकल्पिक पुश/PR, और प्रोजेक्ट मेमोरी अपडेट करता है।

**प्रतिबिंब** — सीखें और सुधारें
डिप्लॉय के बाद `/frame:retrospective` मेट्रिक्स अपडेट करता है और भविष्य के सत्रों के लिए पैटर्न कैप्चर करता है।

## उदाहरण

### नई सुविधा: Google प्रमाणीकरण जोड़ें

```
/frame:daily
# → वर्तमान प्रोजेक्ट स्थिति और क्या योजना है देखें

/frame:research "Google OAuth"
# → Claude कोडबेस का अध्ययन करता है: वर्तमान auth कैसे काम करता है,
#   कौन से पैटर्न पहले से उपयोग किए जा रहे हैं, क्या जोड़ना है

/frame:plan "Google OAuth"
# → एक ठोस कार्य सूची प्राप्त करें:
#   1. Google OAuth क्रेडेंशियल कॉन्फ़िगर करें
#   2. कॉलबैक रूट जोड़ें
#   3. सत्रों से कनेक्ट करें
#   4. UI में बटन जोड़ें

/frame:checkpoint
# → एक रिस्टोर पॉइंट सेव करें — अगर कुछ गलत हो जाए, तो रोलबैक कर सकते हैं

/frame:wave
# → कार्य 1–4 स्वतंत्र हैं, Claude उन्हें समानांतर में चलाता है

/frame:review
# → स्वचालित जांच: परीक्षण, प्रकार, सुरक्षा

/frame:ship
# → कमिट, वैकल्पिक पुश/PR, प्रोजेक्ट मेमोरी अपडेट
```

### बग: पासवर्ड रीसेट के बाद उपयोगकर्ता लॉग इन नहीं कर सकते

```
/frame:daily
# → संदर्भ पुनर्स्थापित करें, देखें कि बग पहले से योजना में है या इसे जोड़ें

/frame:debug "login after reset"
# → Claude व्यवस्थित रूप से जांचता है: लॉग, रीसेट फ्लो, सत्र, टोकन
# → आपको कोड में एक विशिष्ट स्थान के साथ एक परिकल्पना मिलती है

# यदि कारण तुरंत मिल जाए:
/frame:checkpoint                        # फिक्स से पहले रिस्टोर पॉइंट
/frame:fast "fix: invalidate old session after password reset"
# → Claude एक लक्षित फिक्स करता है, एक रिग्रेशन टेस्ट लिखता है

# यदि कारण अस्पष्ट हो — गहराई में जाएं:
/frame:forensics
# → इस क्षेत्र में परिवर्तनों के git इतिहास का विश्लेषण करता है,
#   वह कमिट ढूंढता है जिसने व्यवहार तोड़ा

/frame:checkpoint
/frame:fast "fix: ..."                   # मिले कारण को ठीक करें

/frame:review
# → पुष्टि करें कि फिक्स ने अन्य लॉगिन परिदृश्यों को नहीं तोड़ा

/frame:ship
```

### UI सत्यापन: इंटरफ़ेस काम करता है यह सुनिश्चित करें

```
/frame:build
# → Claude कार्य लागू करता है, "तैयार" कहता है

/frame:verify-ui
# → Playwright MCP के माध्यम से ब्राउज़र खोलता है, स्क्रीनशॉट लेता है
# → कार्य विवरण से तुलना करता है
# → PASS: इंटरफ़ेस अपेक्षाओं से मेल खाता है
# → FAIL: बिल्कुल क्या गलत है और कहाँ देखना है यह बताता है

# अगर कुछ गलत है:
/frame:fast "fix: मोबाइल पर बटन नहीं दिख रहा"
/frame:verify-ui
# → फिक्स के बाद पुनः जांच
```

कमांड केवल **सत्यापित** करता है — स्वचालित रूप से ठीक नहीं करता। अगर कोई समस्या मिलती है — सटीक रूप से बताता है: कौन सा तत्व, कौन सा व्यवहार, क्या अपेक्षित था।

**स्वचालित जांच**: `/frame:build`, `/frame:fast`, `/frame:wave` और `/frame:debug` में — अगर कार्य UI फ़ाइलों (`.tsx`, `.vue`, `.css`, `component`, `page`) को छूता है — quality gates के बाद ब्राउज़र जांच स्वचालित रूप से चलती है।

**Playwright MCP आवश्यक है** — `npx the-frame init` या `npx the-frame update` पर frontend project प्रश्न का "y" उत्तर देने पर स्वचालित रूप से जोड़ा जाता है।

### सुरक्षा: लॉन्च से पहले ऑडिट

```
/frame:daily
# → ब्रीफिंग दिखाता है: "Security: ⚠️ never run" — इसे ठीक करने का समय

/frame:security
# → सभी श्रेणियों में पूर्ण प्रोजेक्ट स्कैन:
#   - secrets: AWS keys, GitHub tokens, Stripe keys, private keys, git में .env
#   - OWASP Top 10: SQL injection, XSS, CSRF, path traversal, SSRF, command injection
#   - infrastructure: Dockerfile (root user, :latest), debug endpoints
#   - AI/LLM: prompt injection, असुरक्षित output handling, system prompt leakage
#   - dependencies: npm audit के माध्यम से ज्ञात CVE

# → रिपोर्ट .planning/reports/security/security-{date}.md में सहेजी जाती है
# → STATE.md Security Status के साथ अपडेट होता है

# CRITICAL या HIGH निष्कर्ष होने पर:
# ⛔ Ship BLOCKED. Critical findings ठीक करने के लिए /frame:security-fix चलाएं।

/frame:security-fix
# → नवीनतम रिपोर्ट पढ़ता है और प्राथमिकता के अनुसार findings ठीक करता है:
#   पहले CRITICAL, फिर HIGH
#   - .env को git tracking से हटाता है (git rm --cached)
#   - next.config.js / Express में missing security headers जोड़ता है
#   - Route Handlers पर CSRF protection जोड़ता है
#   - vulnerable dependencies के लिए npm audit fix चलाता है
#   - Dockerfile ठीक करता है: USER directive जोड़ता है, :latest बदलता है
#   - history में पहले से मौजूद secrets के लिए: rotate + history rewrite कैसे करें बताता है
# → प्रत्येक fix लागू करने के बाद verify करता है
# → STATE.md अपडेट करता है: सभी CRITICAL हल होने पर ship unblock करता है

# Targeted fixes:
/frame:security-fix critical     # केवल CRITICAL ठीक करें
/frame:security-fix high         # केवल HIGH ठीक करें
/frame:security-fix SEC-1        # ID से specific finding ठीक करें

/frame:security
# → सब कुछ साफ है यह confirm करने के लिए audit फिर चलाएं

# सब कुछ साफ होने पर:
# ✓ कोई critical समस्या नहीं। /frame:ship के साथ आगे बढ़ना सुरक्षित है।

/frame:ship
# → security check पास, commit और push

# जब आप जानते हों क्या खोजना है तो targeted scans:
/frame:security secrets          # केवल secrets (~30 सेकंड)
/frame:security src/api/         # specific directory स्कैन करें
```

```
/frame:daily

/frame:perf-audit
# → स्टैक डिटेक्ट करता है (Next.js + PostgreSQL + Redis आदि)
# → उस स्टैक के लिए वर्तमान ज्ञात समस्याएं खोजता है
# → गहरा स्कैन: N+1 क्वेरी, मेमोरी लीक, ब्लॉकिंग ऑपरेशन,
#   कैश हेडर की कमी, re-render के कारण, bundle साइज
# → रिपोर्ट .planning/reports/performance/PERF_REPORT.md में सेव
#   Critical/High/Medium/Low प्राथमिकताओं और effort अनुमान के साथ

# उदाहरण आउटपुट:
# Critical: 2 | High: 4 | Medium: 3 | Low: 1
# [PERF-1] /api/users में N+1 क्वेरी — प्रति request 47 अतिरिक्त DB क्वेरी (S)
# [PERF-2] Dashboard में setInterval बिना cleanup — मेमोरी लीक (XS)

/frame:perf-fix
# → PERF_REPORT.md पढ़ता है, Critical से शुरू करता है
# → प्रत्येक समस्या के लिए दिखाता है:
#   --- BEFORE ---
#   const users = await db.findMany()
#   --- AFTER ---
#   const users = await db.findMany({ select: { id, name, email } })
# → पूछता है: Apply this fix? [y/n/skip]
# → लागू करता है, typecheck + tests चलाता है, विफल होने पर revert करता है

# विशिष्ट fixes:
/frame:perf-fix PERF-1      # एक समस्या ठीक करें
/frame:perf-fix high        # सभी High ठीक करें
/frame:perf-fix all         # Critical + High ठीक करें

/frame:perf-audit
# → सुधार की पुष्टि के लिए फिर से चलाएं
```

## अंदर क्या है

FRAME प्रदान करता है:

- **6-चरण वर्कफ़्लो**: अनुसंधान → योजना → निर्माण → समीक्षा → शिप → प्रतिबिंब
- **37 कमांड**: त्वरित कार्यों से लेकर पूर्ण सुविधा विकास चक्र तक
- **7 AI एजेंट**: शोधकर्ता, योजनाकार, निर्माता, समीक्षक, शैतान का वकील, सुरक्षा, प्रदर्शन ऑडिटर
- **सेफ्टी हुक्स**: विनाशकारी ऑपरेशन ब्लॉक करते हैं, गुणवत्ता गेट लागू करते हैं
- **Git सुरक्षा**: चेकपॉइंट, रोलबैक, वर्कट्री, पॉज/रिज्यूम
- **Security Auditing**: OWASP Top 10, secret detection, infrastructure checks, AI/LLM risks

## पूर्वापेक्षाएं

- Node.js >= 18
- Git (प्रोजेक्ट एक git रिपॉजिटरी होनी चाहिए)

## त्वरित शुरुआत

```bash
# यदि आवश्यक हो तो git रेपो इनिशियलाइज़ करें
git init && git commit --allow-empty -m "init"

# FRAME इंस्टॉल करें
npx the-frame-ai init

# इस प्रोजेक्ट में Claude Code खोलें और चलाएं:
/frame:init    # कोडबेस स्कैन करता है, MAP.md भरता है
/frame:daily   # हर दिन आपका प्रवेश बिंदु
```

## कमांड

### कोर — यहां से शुरू करें

ये 7 कमांड एकल dev कार्य का 90% कवर करते हैं:

| कमांड | कब उपयोग करें |
|-------|--------------|
| `/frame:daily` | किसी भी ब्रेक के बाद **यहां से शुरू करें** — क्या हुआ, आगे क्या है |
| `/frame:research <विषय>` | नई सुविधा की योजना बनाने से पहले |
| `/frame:plan <सुविधा>` | अनुसंधान को एक कार्ययोग्य कार्य सूची में बदलें |
| `/frame:build` | TDD के साथ 1–3 कार्य लागू करें (क्रमिक) |
| `/frame:wave` | 4+ स्वतंत्र कार्य लागू करें (समानांतर सब-एजेंट) |
| `/frame:wave-team` | wave की तरह, लेकिन प्रत्येक कार्य के बाद समीक्षा टीम के साथ |
| `/frame:review` | डिप्लॉय करने से पहले — स्वचालित जांच + चेकलिस्ट |
| `/frame:ship` | कमिट, वैकल्पिक पुश/PR, मेमोरी अपडेट करें |

### चरण के अनुसार सभी कमांड

<details>
<summary>अनुसंधान</summary>

| कमांड | कब उपयोग करें |
|-------|--------------|
| `/frame:research <विषय>` | नई सुविधा की योजना बनाने से पहले |
| `/frame:explain <फ़ाइल>` | यह कोड ऐसा क्यों दिखता है? |
| `/frame:why <विषय>` | निर्णय इतिहास खोजें |
| `/frame:arch <मॉड्यूल>` | मॉड्यूल की आर्किटेक्चर `docs/arch/{मॉड्यूल}.md` में दस्तावेज़ करें |
</details>

<details>
<summary>योजना</summary>

| कमांड | कब उपयोग करें |
|-------|--------------|
| `/frame:plan <सुविधा>` | अनुसंधान को एक कार्ययोग्य कार्य सूची में बदलें |
| `/frame:add-task` | काम बाधित किए बिना योजना में कार्य जोड़ें |
</details>

<details>
<summary>निर्माण</summary>

| कमांड | कब उपयोग करें |
|-------|--------------|
| `/frame:build` | TDD के साथ योजना लागू करें (1–3 कार्य, क्रमिक) |
| `/frame:wave` | समानांतर बैचों में 4+ स्वतंत्र कार्य लागू करें |
| `/frame:wave-team` | wave की तरह, लेकिन प्रत्येक कार्य के बाद समीक्षा टीम के साथ |
| `/frame:fast <कार्य>` | 30 मिनट से कम का त्वरित कार्य |
| `/frame:debug <समस्या>` | व्यवस्थित बग जांच |
| `/frame:forensics` | कुछ क्यों टूटा इसकी गहरी जांच |
| `/frame:refactor` | TDD सेफ्टी नेट के साथ रिफैक्टर |
| `/frame:migrate` | रोलबैक योजना के साथ DB/API/deps माइग्रेशन |
</details>

<details>
<summary>समीक्षा</summary>

| कमांड | कब उपयोग करें |
|-------|--------------|
| `/frame:review` | डिप्लॉय करने से पहले — स्वचालित जांच + चेकलिस्ट |
| `/frame:security` | गहरा सुरक्षा ऑडिट: secrets, OWASP, infrastructure, AI/LLM risks |
| `/frame:security-fix` | नवीनतम रिपोर्ट से findings ठीक करें (पहले CRITICAL, फिर HIGH) |
| `/frame:perf-audit` | गहरा performance audit: स्टैक डिटेक्ट, वर्तमान समस्याएं खोजें, PERF_REPORT.md लिखें |
| `/frame:perf-fix` | PERF_REPORT.md की समस्याएं ठीक करें — before/after दिखाएं, प्रत्येक fix पर पुष्टि |
| `/frame:health` | पूर्ण प्रोजेक्ट स्वास्थ्य जांच |
| `/frame:check-deps` | सुरक्षा ऑडिट + पुराने पैकेज |
| `/frame:performance` | Bundle आकार और Lighthouse ऑडिट |
</details>

<details>
<summary>शिप</summary>

| कमांड | कब उपयोग करें |
|-------|--------------|
| `/frame:ship` | कमिट, वैकल्पिक पुश/PR, मेमोरी अपडेट करें |
| `/frame:checkpoint` | जोखिम भरे बदलाव से पहले git टैग सेव करें |
| `/frame:rollback` | चेकपॉइंट पर रोलबैक करें |
</details>

<details>
<summary>प्रतिबिंब</summary>

| कमांड | कब उपयोग करें |
|-------|--------------|
| `/frame:retrospective` | डिप्लॉय के बाद — मेमोरी और मेट्रिक्स अपडेट करें |
| `/frame:sprint-check` | रोडमैप के विरुद्ध साप्ताहिक प्रगति |
| `/frame:cleanup-memory` | पुरानी मेमोरी ट्रिम और आर्काइव करें |
</details>

<details>
<summary>दैनिक और उपयोगिताएं</summary>

| कमांड | कब उपयोग करें |
|-------|--------------|
| `/frame:daily` | दिन की शुरुआत — क्या हुआ, आगे क्या है |
| `/frame:status` | पूर्ण स्थिति डंप (git, मेमोरी, ब्लॉकर्स) |
| `/frame:note` | एक पैटर्न, निर्णय, या एंटी-पैटर्न कैप्चर करें |
| `/frame:unstuck` | अटक गए? अनब्लॉक करने के लिए 3 ठोस विकल्प प्राप्त करें |
| `/frame:context` | वर्तमान कार्य संदर्भ दिखाएं |
| `/frame:init` | पहली बार चलाएं — कोडबेस स्कैन करें, MAP.md भरें |
| `/frame:doctor` | FRAME इंस्टॉलेशन सत्यापित करें |
| `/frame:pause` / `/frame:resume` | मध्य-कार्य स्थिति सेव और पुनर्स्थापित करें |
</details>

<details>
<summary>उन्नत</summary>

| कमांड | कब उपयोग करें |
|-------|--------------|
| `/frame:worktree` | समानांतर प्रयोगों के लिए अलग git वर्कट्री |
| `/frame:headless` | स्वायत्त CI मोड (कोई इंटरैक्शन नहीं) |
| `/frame:estimate <कार्य>` | शुरू करने से पहले स्कोप और समय अनुमान |
</details>

## हुक्स

FRAME `.claude/hooks/` में 4 हुक्स इंस्टॉल करता है। वे स्वचालित रूप से चलते हैं।

| हुक | ट्रिगर | क्या करता है | अक्षम करने के लिए |
|-----|--------|-------------|-----------------|
| `safety-net.sh` | Bash से पहले | `rm -rf` और `DROP TABLE/DATABASE` ब्लॉक करता है | `.claude/settings.local.json` से हटाएं |
| `git-safety.sh` | Bash से पहले | फोर्स पुश, `reset --hard` ब्लॉक करता है, `git add -A` पर चेतावनी देता है | `.claude/settings.local.json` से हटाएं |
| `quality-gate.sh` | फ़ाइल लिखने के बाद | बदली गई फ़ाइल पर typecheck + lint चलाता है | `.claude/settings.local.json` से हटाएं |
| `session-init.sh` | सत्र शुरू | वर्तमान चरण/कार्य दिखाता है; 24h से अधिक दूर होने पर पूर्ण संदर्भ डंप | `.claude/settings.local.json` से हटाएं |

## कॉन्फ़िगरेशन

FRAME को `.frame/config.json` के माध्यम से कॉन्फ़िगर किया जाता है। मुख्य सेटिंग्स:

```json
{
  "quality": {
    "commands": {
      "typecheck": "npx tsc --noEmit",
      "test": "npx vitest run",
      "lint": "npx eslint .",
      "build": "npm run build"
    }
  }
}
```

## CLI

```bash
npx the-frame-ai init [target-dir]     # FRAME इंस्टॉल करें
npx the-frame-ai update [target-dir]   # कमांड, एजेंट, हुक्स अपडेट करें
npx the-frame-ai doctor [target-dir]   # इंस्टॉलेशन स्वास्थ्य जांचें
npx the-frame-ai version               # CLI संस्करण दिखाएं
```

`update` केवल कमांड, एजेंट और हुक्स अपडेट करता है। प्रोजेक्ट फ़ाइलें (STATE.md, MAP.md, memory/, आदि) कभी ओवरराइट नहीं होती हैं।

## इंस्टॉलेशन के बाद प्रोजेक्ट संरचना

```
.claude/
  commands/          # 35 FRAME कमांड
  agents/            # 6 AI एजेंट
  hooks/             # 4 सेफ्टी हुक्स
.frame/
  config.json        # FRAME कॉन्फ़िगरेशन
.planning/
  STATE.md           # वर्तमान स्थिति
  MAP.md             # प्रोजेक्ट मैप
  ROADMAP.md         # रोडमैप
  memory/            # प्रोजेक्ट मेमोरी
  specs/             # सुविधा विशिष्टताएं
  reviews/           # समीक्षा परिणाम
  reports/           # रिपोर्ट (दैनिक, deps, गुणवत्ता, स्प्रिंट, सुरक्षा)
```

## लाइसेंस

MIT
