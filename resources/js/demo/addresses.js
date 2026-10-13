// The address book: the towns the pharmacy delivers to and the streets in each.
//
// It exists so an address is picked rather than typed. A street belongs to
// exactly one town — that is the whole point of the list — so the streets are
// child rows of their city and nothing here holds a street on its own.
//
// Sample content, deliberately short: a handful of towns with their main
// streets, enough to show how the screen behaves. The real list is the one the
// pharmacy builds on this screen.
import { L } from '@/lib/localized';

/** `[hebrew, english]` pairs → street records under `cityId`. */
function streets(cityId, pairs) {
    return pairs.map(([he, en], index) => ({
        id: `${cityId}-s${index + 1}`,
        name: L(he, en),
    }));
}

function city(id, he, en, pairs) {
    return { id, name: L(he, en), streets: streets(id, pairs) };
}

export const DEMO_CITIES = [
    city('ct1', 'תל אביב', 'Tel Aviv', [
        ['רוטשילד', 'Rothschild'],
        ['אלנבי', 'Allenby'],
        ['אבן גבירול', 'Ibn Gabirol'],
        ['דיזנגוף', 'Dizengoff'],
        ['בן יהודה', 'Ben Yehuda'],
        ['אחד העם', 'Ahad Ha’am'],
    ]),
    city('ct2', 'רמת גן', 'Ramat Gan', [
        ['ביאליק', 'Bialik'],
        ['ז׳בוטינסקי', 'Jabotinsky'],
        ['בן גוריון', 'Ben Gurion'],
        ['קריניצי', 'Krinitzi'],
        ['הרא״ה', 'HaRoeh'],
    ]),
    city('ct3', 'חיפה', 'Haifa', [
        ['הנשיא', 'HaNasi'],
        ['הרצל', 'Herzl'],
        ['מוריה', 'Moriah'],
        ['הכרמל', 'HaCarmel'],
        ['העצמאות', 'HaAtzmaut'],
    ]),
    city('ct4', 'ירושלים', 'Jerusalem', [
        ['יפו', 'Jaffa'],
        ['קינג ג׳ורג׳', 'King George'],
        ['עזה', 'Aza'],
        ['אגרון', 'Agron'],
        ['בן יהודה', 'Ben Yehuda'],
    ]),
    city('ct5', 'פתח תקווה', 'Petah Tikva', [
        ['ז׳בוטינסקי', 'Jabotinsky'],
        ['ההסתדרות', 'HaHistadrut'],
        ['חיים עוזר', 'Chaim Ozer'],
        ['הברון הירש', 'Baron Hirsch'],
    ]),
    city('ct6', 'כפר סבא', 'Kfar Saba', [
        ['ויצמן', 'Weizmann'],
        ['תל חי', 'Tel Hai'],
        ['הרצל', 'Herzl'],
        ['ששת הימים', 'Sheshet HaYamim'],
    ]),
    city('ct7', 'נתניה', 'Netanya', [
        ['הרצל', 'Herzl'],
        ['שדרות בנימין', 'Binyamin Blvd'],
        ['דיזנגוף', 'Dizengoff'],
        ['סמילנסקי', 'Smilansky'],
    ]),
    city('ct8', 'באר שבע', 'Beer Sheva', [
        ['שדרות רגר', 'Rager Blvd'],
        ['הרצל', 'Herzl'],
        ['הדסה', 'Hadassah'],
        ['טרומפלדור', 'Trumpeldor'],
    ]),
];
