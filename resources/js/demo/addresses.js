// The address book: the towns the pharmacy delivers to and the streets in each.
//
// It exists so an address is picked rather than typed. A street belongs to
// exactly one town — that is the whole point of the list — so the streets are
// child rows of their city and nothing here holds a street on its own.
//
// Not sample content. These are the Central Bureau of Statistics' own lists —
// every settlement in Israel that has named streets (818 of them) and all
// 62,260 streets in them — keyed by the CBS codes, which is why a city's id is
// `3000` and a street's is `3000-164`. See `real/README.md` for where the files
// came from and what was dropped on the way in.
//
// Two things the national list does not carry, and so neither does this:
//
//   * an English street name — there is none, in any settlement, so a street
//     record holds Hebrew alone and `loc()` falls back to it;
//   * a settlement with no named streets — a kibbutz where the address is the
//     settlement itself. The CBS marks those with street code 9000 and they are
//     left out, because there is nothing there to pick.
//
// The English town names are the CBS transliterations, which are not always the
// spelling in common use (`Petah Tiqwa`, `Rishon Leziyyon`) and are cut at
// twenty characters. They are what the source says; the screen is where the
// pharmacy corrects them.
import CITIES from '@/demo/real/cities.json';

export const DEMO_CITIES = CITIES;
