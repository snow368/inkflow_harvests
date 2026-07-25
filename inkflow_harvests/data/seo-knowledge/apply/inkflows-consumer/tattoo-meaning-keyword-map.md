# Tattoo Meaning Finder — 关键词归类映射表

> 生成自 `src/data/tattoo-meanings.ts`（单一数据源）。

> 当前共 **70 个符号 / 15 个类别**。本表用于把 `“X tattoo meaning”` 类搜索词归入 Tattoo Meaning Finder，并在 Finder 无对应类别时新建小类。

## 状态说明

| 状态 | 含义 |
|------|------|
| `existing` | 任务前已在 Finder 中（类别与符号都存在） |
| `extended` | 在**已有类别**中补充了新符号（本次任务扩展，未新建类别） |
| `new_category` | 属于本次任务**新建的小类** |
| `variant` | 同义/变体搜索词，路由到已有符号 |
| `gap` | 常见搜索词，Finder 暂缺对应符号（待补充内容） |

## 类别汇总（15 类）

| 类别 ID | 类别名 | 来源 | 符号数 |
|---------|--------|------|--------|
| animals | Animals | 原有 | 6 |
| flowers | Flowers | 原有 | 5 |
| mythological | Mythological | 原有 | 5 |
| geometric | Geometric & Celestial | 扩展 | 11 |
| religious | Religious & Spiritual | 原有 | 4 |
| cultural | Cultural & Tribal | 原有 | 4 |
| nature | Nature | 原有 | 4 |
| objects | Objects & Symbols | 原有 | 4 |
| modern | Modern Styles | 原有 | 4 |
| birds | Birds | 新建 | 4 |
| zodiac | Zodiac & Astrology | 新建 | 4 |
| insects | Insects | 新建 | 4 |
| sea-life | Sea Life | 新建 | 4 |
| time | Time & Mortality | 新建 | 3 |
| words | Words & Lettering | 新建 | 4 |

## 完整归类映射

| 搜索词 | 符号 slug | 类别 | 状态 | 备注 |
|--------|-----------|------|------|------|
| Wolf tattoo meaning | wolf | Animals | existing |  |
| Lion tattoo meaning | lion | Animals | existing |  |
| Snake tattoo meaning | snake | Animals | existing |  |
| Eagle tattoo meaning | eagle | Animals | existing |  |
| Butterfly tattoo meaning | butterfly | Animals | existing |  |
| Owl tattoo meaning | owl | Animals | existing |  |
| Rose tattoo meaning | rose | Flowers | existing |  |
| Lotus tattoo meaning | lotus | Flowers | existing |  |
| Cherry Blossom tattoo meaning | cherry-blossom | Flowers | existing |  |
| Sunflower tattoo meaning | sunflower | Flowers | existing |  |
| Peony tattoo meaning | peony | Flowers | existing |  |
| Phoenix tattoo meaning | phoenix | Mythological | existing |  |
| Dragon tattoo meaning | dragon | Mythological | existing |  |
| Koi Fish tattoo meaning | koi-fish | Mythological | existing |  |
| Griffin tattoo meaning | griffin | Mythological | existing |  |
| Mermaid tattoo meaning | mermaid | Mythological | existing |  |
| Mandala tattoo meaning | mandala | Geometric & Celestial | existing |  |
| Compass tattoo meaning | compass | Geometric & Celestial | existing |  |
| Moon tattoo meaning | moon | Geometric & Celestial | existing |  |
| Arrow tattoo meaning | arrow | Geometric & Celestial | existing |  |
| Star tattoo meaning | star | Geometric & Celestial | existing |  |
| Infinity tattoo meaning | infinity | Geometric & Celestial | extended |  |
| Sun tattoo meaning | sun | Geometric & Celestial | extended |  |
| Galaxy tattoo meaning | galaxy | Geometric & Celestial | extended |  |
| Comet tattoo meaning | comet | Geometric & Celestial | extended |  |
| Planet tattoo meaning | planet | Geometric & Celestial | extended |  |
| Aurora tattoo meaning | aurora | Geometric & Celestial | extended |  |
| Cross tattoo meaning | cross | Religious & Spiritual | existing |  |
| Eye of Horus tattoo meaning | eye-of-horus | Religious & Spiritual | existing |  |
| Hamsa tattoo meaning | hamsa | Religious & Spiritual | existing |  |
| Om / Aum tattoo meaning | om | Religious & Spiritual | existing |  |
| Tribal tattoo meaning | tribal | Cultural & Tribal | existing |  |
| Celtic Knot tattoo meaning | celtic-knot | Cultural & Tribal | existing |  |
| Dreamcatcher tattoo meaning | dreamcatcher | Cultural & Tribal | existing |  |
| Egyptian Symbols tattoo meaning | egyptian | Cultural & Tribal | existing |  |
| Tree of Life tattoo meaning | tree-of-life | Nature | existing |  |
| Wave tattoo meaning | wave | Nature | existing |  |
| Mountain tattoo meaning | mountain | Nature | existing |  |
| Feather tattoo meaning | feather | Nature | existing |  |
| Anchor tattoo meaning | anchor | Objects & Symbols | existing |  |
| Skull tattoo meaning | skull | Objects & Symbols | existing |  |
| Heart tattoo meaning | heart | Objects & Symbols | existing |  |
| Key tattoo meaning | key | Objects & Symbols | existing |  |
| Geometric tattoo meaning | geometric | Modern Styles | existing |  |
| Watercolor tattoo meaning | watercolor | Modern Styles | existing |  |
| Minimalist tattoo meaning | minimalist | Modern Styles | existing |  |
| Abstract tattoo meaning | abstract | Modern Styles | existing |  |
| Swallow tattoo meaning | swallow | Birds | new_category |  |
| Hummingbird tattoo meaning | hummingbird | Birds | new_category |  |
| Dove tattoo meaning | dove | Birds | new_category |  |
| Raven tattoo meaning | raven | Birds | new_category |  |
| Constellation tattoo meaning | constellation | Zodiac & Astrology | new_category |  |
| Pisces tattoo meaning | pisces | Zodiac & Astrology | new_category |  |
| Scorpio tattoo meaning | scorpio | Zodiac & Astrology | new_category |  |
| Gemini tattoo meaning | gemini | Zodiac & Astrology | new_category |  |
| Bee tattoo meaning | bee | Insects | new_category |  |
| Spider tattoo meaning | spider | Insects | new_category |  |
| Dragonfly tattoo meaning | dragonfly | Insects | new_category |  |
| Ladybug tattoo meaning | ladybug | Insects | new_category |  |
| Whale tattoo meaning | whale | Sea Life | new_category |  |
| Dolphin tattoo meaning | dolphin | Sea Life | new_category |  |
| Octopus tattoo meaning | octopus | Sea Life | new_category |  |
| Shark tattoo meaning | shark | Sea Life | new_category |  |
| Clock tattoo meaning | clock | Time & Mortality | new_category |  |
| Hourglass tattoo meaning | hourglass | Time & Mortality | new_category |  |
| Pocket Watch tattoo meaning | pocket-watch | Time & Mortality | new_category |  |
| Name / Initial tattoo meaning | name-initial | Words & Lettering | new_category |  |
| Quote / Word tattoo meaning | quote | Words & Lettering | new_category |  |
| Coordinate tattoo meaning | coordinate | Words & Lettering | new_category |  |
| Roman Numeral tattoo meaning | roman-numeral | Words & Lettering | new_category |  |
| koi tattoo meaning | koi-fish | Mythological | variant | alias of koi fish |
| crescent moon tattoo meaning | moon | Geometric & Celestial | variant | variant of moon |
| nautical star tattoo meaning | star | Geometric & Celestial | variant | variant of star |
| saturn tattoo meaning | planet | Geometric & Celestial | variant | variant of planet |
| aurora borealis tattoo meaning | aurora | Geometric & Celestial | variant | variant of aurora |
| sugar skull tattoo meaning | skull | Objects & Symbols | variant | variant of skull |
| sacred heart tattoo meaning | heart | Objects & Symbols | variant | variant of heart |
| ouroboros tattoo meaning | snake | Animals | variant | variant of snake |
| sun and moon tattoo meaning | sun | Geometric & Celestial | variant | sun (moon also in geometric) |
| celtic tree of life tattoo meaning | tree-of-life | Nature | variant | variant of tree of life |
| cat tattoo meaning | — | Animals | gap | missing symbol |
| bear tattoo meaning | — | Animals | gap | missing symbol |
| deer tattoo meaning | — | Animals | gap | missing symbol |
| fox tattoo meaning | — | Animals | gap | missing symbol |
| elephant tattoo meaning | — | Animals | gap | missing symbol |
| tiger tattoo meaning | — | Animals | gap | missing symbol |
| wolf pack tattoo meaning | — | Animals | gap | covered by wolf customSections |
| lily tattoo meaning | — | Flowers | gap | missing symbol |
| daisy tattoo meaning | — | Flowers | gap | missing symbol |
| lavender tattoo meaning | — | Flowers | gap | missing symbol |
| tulip tattoo meaning | — | Flowers | gap | missing symbol |
| hibiscus tattoo meaning | — | Flowers | gap | missing symbol |
| unicorn tattoo meaning | — | Mythological | gap | missing symbol |
| fairy tattoo meaning | — | Mythological | gap | missing symbol |
| kraken tattoo meaning | — | Sea Life | gap | missing symbol |
| seahorse tattoo meaning | — | Sea Life | gap | missing symbol |
| turtle tattoo meaning | — | Sea Life | gap | missing symbol |
| fish tattoo meaning | — | Sea Life | gap | missing symbol (generic) |
| crow tattoo meaning | — | Birds | gap | missing symbol (raven exists) |
| sparrow tattoo meaning | — | Birds | gap | missing symbol (swallow exists) |
| peacock tattoo meaning | — | Birds | gap | missing symbol |
| leo tattoo meaning | — | Zodiac & Astrology | gap | missing symbol (sign, category exists) |
| virgo tattoo meaning | — | Zodiac & Astrology | gap | missing symbol (sign, category exists) |
| aries tattoo meaning | — | Zodiac & Astrology | gap | missing symbol (sign, category exists) |
| angel tattoo meaning | — | Religious & Spiritual | gap | missing symbol |
| buddha tattoo meaning | — | Religious & Spiritual | gap | missing symbol |
| ganesha tattoo meaning | — | Religious & Spiritual | gap | missing symbol |
| yin yang tattoo meaning | — | Cultural & Tribal | gap | missing symbol |
| chakra tattoo meaning | — | Religious & Spiritual | gap | missing symbol |
| ship tattoo meaning | — | Objects & Symbols | gap | missing symbol |
| music note tattoo meaning | — | Objects & Symbols | gap | missing symbol |
| lightning tattoo meaning | — | Geometric & Celestial | gap | missing symbol |
| cloud tattoo meaning | — | Nature | gap | missing symbol |
| leaf tattoo meaning | — | Nature | gap | missing symbol |

## 缺口与下一步建议

`gap` 状态的关键词表示有搜索量但 Finder 暂无对应符号。建议优先级：

1. **已有类别直接补符号**：如 `cat`, `bear`, `deer`, `fox`, `tiger`（animals）；`lily`, `daisy`, `hibiscus`（flowers）；`unicorn`, `fairy`（mythological）；`kraken`, `seahorse`, `turtle`（sea-life）；`crow`, `sparrow`, `peacock`（birds）；`angel`, `buddha`, `ganesha`, `chakra`（religious）；`yin yang`（cultural）。
2. **星座符号扩充**：zodiac 类别已建，但仅 4 个符号；可补 `leo`, `virgo`, `aries`, `taurus`, `cancer`, `libra`, `sagittarius`, `capricorn`, `aquarius` 等 12 星座。
3. **跨类别通用词**：`bird`, `fish`, `flower`, `tree` 等通用词可由现有具体符号承接，并在详情页增加 "related" 引导。

---

*Mapping generated programmatically from `tattoo-meanings.ts` (70 symbols / 15 categories).*
