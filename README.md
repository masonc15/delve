# Delve

Script to get to level 500 in Fernswarthy's Basement.

Install using `git checkout loathers/delve release`, then run `delve` from
KoLmafia.

## Requirements

- Fernswarthy's Basement unlocked. Complete [The Wizard of Ego](https://kol.coldfront.net/thekolwiki/index.php/The_Wizard_of_Ego) manually.
- Saucegeyser skill.
- The CCS below selected as KoLmafia's Custom Combat Script.
- A current Git installation of [Gain](https://github.com/Ezandora/Gain). Delve was checked with Gain 1.2.5 at commit `75109224c2fd4485c48eed16cb590462220b2154`.

```text
[ default ]
item gas balloon
while !pastround 5
    if hascombatitem divine noise
        item divine noisemaker,divine noisemaker
    endif
    if hascombatitem divine can
        item divine can of silly string,divine can of silly string
    endif
    if hascombatitem divine blow
        item divine blowout,divine blowout
    endif
endwhile

[ ghost of fernswarthy's ]
skill saucegeyser
```

## Scope and cautions

Delve supports unrestricted aftercore runs. It refuses to start in an
ascension challenge path because its divine combat items and recovery items
may be disallowed by current path/date restrictions.

The `noCheck` argument skips only Delve's monster-survival check. It does not
skip prerequisite, page, item, or combat-result checks.

Level 30 is suggested before basement diving. Maintaining the required buffs
can cost millions of meat. At level 500, Delve stops so the telescope can be
taken manually.
