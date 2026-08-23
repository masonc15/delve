# Delve

Script to get to level 500 in Fernswarthy's Basement.

Install using `git checkout loathers/delve release`, then run `delve` from
KoLmafia.

## Requirements

- Fernswarthy's Basement unlocked. Complete [The Wizard of Ego](https://kol.coldfront.net/thekolwiki/index.php/The_Wizard_of_Ego) manually.
- Saucegeyser skill.
- A current Git installation of [Gain](https://github.com/Ezandora/Gain). Delve was checked with Gain 1.2.5 at commit `75109224c2fd4485c48eed16cb590462220b2154`.

Delve controls basement monster fights with a short, bounded strategy. It uses
one gas balloon and then one matching divine combat item per server round. It
does not require Ambidextrous Funkslinging, WHAM, or SmartStasis.

## Scope and cautions

Delve supports unrestricted aftercore runs. It refuses to start in an
ascension challenge path because its divine combat items and recovery items
may be disallowed by current path/date restrictions.

The `noCheck` argument skips only Delve's monster-survival check. It does not
skip prerequisite, page, item, or combat-result checks.

Level 30 is suggested before basement diving. Maintaining the required buffs
can cost millions of meat. At level 500, Delve stops so the telescope can be
taken manually. If equipment, normal stat buffs, and Gain cannot pass an MP
test, Delve can drink one mulled hobo wine. This uses one point of inebriety.
