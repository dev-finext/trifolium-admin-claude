// Reference catalog: herbs, preparation forms, and the documented herb ⇄ drug
// interactions the compounding wizard warns on.
//
// This lives under demo/ because in production every row here is a database
// record an admin edits, not a rule baked into the build. A Chinese *name* is
// not what makes a herb part of the Chinese materia medica — the catalog
// carries one for western herbs too. Membership is the explicit decision in
// TCM_HERB_IDS, and it is what drives the ingredient card.
import { L } from '@/lib/localized';

/** Herbs the pharmacy compounds with. Latin and Chinese names are neutral. */
const HERBS = [
    {
        id: 'ashwagandha',
        name: L('אשווגנדה', 'Ashwagandha'),
        lat: 'Withania somnifera',
        cn: '睡茄 · Shuì Qié',
    },
    {
        id: 'echinacea',
        name: L('אכינצאה', 'Echinacea'),
        lat: 'Echinacea purpurea',
        cn: '紫锥菊 · Zǐ Zhuī Jú',
    },
    {
        id: 'calendula',
        name: L('ציפורן חתול', 'Calendula'),
        lat: 'Calendula officinalis',
        cn: '金盏花 · Jīn Zhǎn Huā',
    },
    {
        id: 'chamomile',
        name: L('בבונג', 'Chamomile'),
        lat: 'Matricaria chamomilla',
        cn: '洋甘菊 · Yáng Gān Jú',
    },
    {
        id: 'valerian',
        name: L('ולריאן', 'Valerian'),
        lat: 'Valeriana officinalis',
        cn: '缬草 · Xié Cǎo',
    },
    {
        id: 'passionflower',
        name: L('פסיפלורה', 'Passionflower'),
        lat: 'Passiflora incarnata',
        cn: '西番莲 · Xī Fān Lián',
    },
    {
        id: 'milkthistle',
        name: L('גדילן מצוי', 'Milk thistle'),
        lat: 'Silybum marianum',
        cn: '水飞蓟 · Shuǐ Fēi Jì',
    },
    {
        id: 'dandelion',
        name: L('שן הארי', 'Dandelion'),
        lat: 'Taraxacum officinale',
        cn: '蒲公英 · Pú Gōng Yīng',
    },
    {
        id: 'nettle',
        name: L('סרפד', 'Nettle'),
        lat: 'Urtica dioica',
        cn: '荨麻 · Qián Má',
    },
    {
        id: 'ginger',
        name: L('זנגביל', 'Ginger'),
        lat: 'Zingiber officinale',
        cn: '生姜 · Shēng Jiāng',
    },
    {
        id: 'turmeric',
        name: L('כורכום', 'Turmeric'),
        lat: 'Curcuma longa',
        cn: '姜黄 · Jiāng Huáng',
    },
    {
        id: 'licorice',
        name: L('שוש קרח', 'Licorice'),
        lat: 'Glycyrrhiza glabra',
        cn: '甘草 · Gān Cǎo',
    },
    {
        id: 'rhodiola',
        name: L('רודיולה', 'Rhodiola'),
        lat: 'Rhodiola rosea',
        cn: '红景天 · Hóng Jǐng Tiān',
    },
    {
        id: 'lemonbalm',
        name: L('מליסה', 'Lemon balm'),
        lat: 'Melissa officinalis',
        cn: '香蜂草 · Xiāng Fēng Cǎo',
    },
    {
        id: 'sage',
        name: L('מרווה', 'Sage'),
        lat: 'Salvia officinalis',
        cn: '鼠尾草 · Shǔ Wěi Cǎo',
    },
    {
        id: 'rosemary',
        name: L('רוזמרין', 'Rosemary'),
        lat: 'Rosmarinus officinalis',
        cn: '迷迭香 · Mí Dié Xiāng',
    },
    {
        id: 'hawthorn',
        name: L('עוזרר', 'Hawthorn'),
        lat: 'Crataegus monogyna',
        cn: '山楂 · Shān Zhā',
    },
    {
        id: 'astragalus',
        name: L('אסטרגלוס', 'Astragalus'),
        lat: 'Astragalus membranaceus',
        cn: '黄芪 · Huáng Qí',
    },
    {
        id: 'reishi',
        name: L('ריישי', 'Reishi'),
        lat: 'Ganoderma lucidum',
        cn: '灵芝 · Líng Zhī',
    },
    {
        id: 'lavender',
        name: L('לבנדר', 'Lavender'),
        lat: 'Lavandula angustifolia',
        cn: '薰衣草 · Xūn Yī Cǎo',
    },
    {
        id: 'stjohnswort',
        name: L('פרע מחורר', "St John's wort"),
        lat: 'Hypericum perforatum',
        cn: '贯叶连翘 · Guàn Yè Lián Qiào',
    },
    {
        id: 'ginseng',
        name: L('ג׳ינסנג', 'Ginseng'),
        lat: 'Panax ginseng',
        cn: '人参 · Rén Shēn',
    },
    {
        id: 'schisandra',
        name: L('שיזנדרה', 'Schisandra'),
        lat: 'Schisandra chinensis',
        cn: '五味子 · Wǔ Wèi Zǐ',
    },
    {
        id: 'olive',
        name: L('עלי זית', 'Olive leaf'),
        lat: 'Olea europaea',
        cn: '橄榄叶 · Gǎn Lǎn Yè',
    },
    {
        id: 'thyme',
        name: L('קורנית', 'Thyme'),
        lat: 'Thymus vulgaris',
        cn: '百里香 · Bǎi Lǐ Xiāng',
    },
    {
        id: 'mullein',
        name: L('בוצין', 'Mullein'),
        lat: 'Verbascum thapsus',
        cn: '毛蕊花 · Máo Ruǐ Huā',
    },
    {
        id: 'marshmallow',
        name: L('חטמית רפואית', 'Marshmallow root'),
        lat: 'Althaea officinalis',
        cn: '药蜀葵 · Yào Shǔ Kuí',
    },
    {
        id: 'plantain',
        name: L('לחך', 'Plantain'),
        lat: 'Plantago lanceolata',
        cn: '车前 · Chē Qián',
    },
    {
        id: 'eucalyptus',
        name: L('אקליפטוס', 'Eucalyptus'),
        lat: 'Eucalyptus globulus',
        cn: '桉叶 · Ān Yè',
    },
    {
        id: 'elder',
        name: L('סמבוק שחור', 'Black elder'),
        lat: 'Sambucus nigra',
        cn: '接骨木 · Jiē Gǔ Mù',
    },
    {
        id: 'peppermint',
        name: L('מנטה', 'Peppermint'),
        lat: 'Mentha piperita',
        cn: '薄荷 · Bò He',
    },
    {
        id: 'fennel',
        name: L('שומר', 'Fennel'),
        lat: 'Foeniculum vulgare',
        cn: '茴香 · Huí Xiāng',
    },
    {
        id: 'yarrow',
        name: L('אכילאה', 'Yarrow'),
        lat: 'Achillea millefolium',
        cn: '蓍草 · Shī Cǎo',
    },
    {
        id: 'cinnamon',
        name: L('קינמון', 'Cinnamon'),
        lat: 'Cinnamomum verum',
        cn: '肉桂 · Ròu Guì',
    },
    {
        id: 'cardamom',
        name: L('הל', 'Cardamom'),
        lat: 'Elettaria cardamomum',
        cn: '小豆蔻 · Xiǎo Dòu Kòu',
    },
    {
        id: 'clove',
        name: L('ציפורן', 'Clove'),
        lat: 'Syzygium aromaticum',
        cn: '丁香 · Dīng Xiāng',
    },
    {
        id: 'gentian',
        name: L('גנציאנה צהובה', 'Yellow gentian'),
        lat: 'Gentiana lutea',
        cn: '龙胆 · Lóng Dǎn',
    },
    {
        id: 'wormwood',
        name: L('לענה', 'Wormwood'),
        lat: 'Artemisia absinthium',
        cn: '苦艾 · Kǔ Ài',
    },
    {
        id: 'gotukola',
        name: L('גוטו קולה', 'Gotu kola'),
        lat: 'Centella asiatica',
        cn: '积雪草 · Jī Xuě Cǎo',
    },
    {
        id: 'oats',
        name: L('שיבולת שועל', 'Oat straw'),
        lat: 'Avena sativa',
        cn: '燕麦 · Yàn Mài',
    },
    {
        id: 'skullcap',
        name: L('סקולקאפ', 'Skullcap'),
        lat: 'Scutellaria lateriflora',
        cn: '美黄芩 · Měi Huáng Qín',
    },
    {
        id: 'motherwort',
        name: L('לב הארי', 'Motherwort'),
        lat: 'Leonurus cardiaca',
        cn: '益母草 · Yì Mǔ Cǎo',
    },
    {
        id: 'ginkgo',
        name: L('גינקו', 'Ginkgo'),
        lat: 'Ginkgo biloba',
        cn: '银杏 · Yín Xìng',
    },
    {
        id: 'garlic',
        name: L('שום', 'Garlic'),
        lat: 'Allium sativum',
        cn: '大蒜 · Dà Suàn',
    },
    {
        id: 'vitex',
        name: L('שיח אברהם', 'Chaste tree'),
        lat: 'Vitex agnus-castus',
        cn: '牡荆 · Mǔ Jīng',
    },
    {
        id: 'blackcohosh',
        name: L('קוהוש שחור', 'Black cohosh'),
        lat: 'Actaea racemosa',
        cn: '升麻 · Shēng Má',
    },
    {
        id: 'raspberry',
        name: L('עלי פטל', 'Raspberry leaf'),
        lat: 'Rubus idaeus',
        cn: '覆盆子 · Fù Pén Zǐ',
    },
    {
        id: 'cranberry',
        name: L('חמוצית', 'Cranberry'),
        lat: 'Vaccinium macrocarpon',
        cn: '蔓越莓 · Màn Yuè Méi',
    },
    {
        id: 'uvaursi',
        name: L('ענבי דוב', 'Uva-ursi'),
        lat: 'Arctostaphylos uva-ursi',
        cn: '熊果 · Xióng Guǒ',
    },
    {
        id: 'goldenrod',
        name: L('שבט הזהב', 'Goldenrod'),
        lat: 'Solidago virgaurea',
        cn: '一枝黄花 · Yī Zhī Huáng Huā',
    },
    {
        id: 'burdock',
        name: L('לפה גדולה', 'Burdock'),
        lat: 'Arctium lappa',
        cn: '牛蒡 · Niú Bàng',
    },
    {
        id: 'redclover',
        name: L('תלתן אדום', 'Red clover'),
        lat: 'Trifolium pratense',
        cn: '红车轴草 · Hóng Chē Zhóu Cǎo',
    },
    {
        id: 'guizhi',
        name: L('גוי ג׳י', 'Gui Zhi'),
        lat: 'Cinnamomum cassia',
        cn: '桂枝 · Guì Zhī',
    },
    {
        id: 'baishao',
        name: L('ביי שאו', 'Bai Shao'),
        lat: 'Paeonia lactiflora',
        cn: '白芍 · Bái Sháo',
    },
    {
        id: 'dazao',
        name: L('דא ג׳או', 'Da Zao'),
        lat: 'Ziziphus jujuba',
        cn: '大枣 · Dà Zǎo',
    },
    {
        id: 'baitouweng',
        name: L('ביי טאו וונג', 'Bai Tou Weng'),
        lat: 'Pulsatilla chinensis',
        cn: '白头翁 · Bái Tóu Wēng',
    },
    {
        id: 'huanglian',
        name: L('הואנג ליאן', 'Huang Lian'),
        lat: 'Coptis chinensis',
        cn: '黄连 · Huáng Lián',
    },
    {
        id: 'huangbai',
        name: L('הואנג בּאי', 'Huang Bai'),
        lat: 'Phellodendron amurense',
        cn: '黄柏 · Huáng Bǎi',
    },
    {
        id: 'qinpi',
        name: L('צ׳ין פּי', 'Qin Pi'),
        lat: 'Fraxinus rhynchophylla',
        cn: '秦皮 · Qín Pí',
    },
    {
        id: 'danggui',
        name: L('דאנג גוּאי', 'Dang Gui'),
        lat: 'Angelica sinensis',
        cn: '当归 · Dāng Guī',
    },
    {
        id: 'baizhu',
        name: L('ביי ג׳ו', 'Bai Zhu'),
        lat: 'Atractylodes macrocephala',
        cn: '白术 · Bái Zhú',
    },
    {
        id: 'fuling',
        name: L('פוּ לינג', 'Fu Ling'),
        lat: 'Poria cocos',
        cn: '茯苓 · Fú Líng',
    },
    {
        id: 'chaihu',
        name: L('צ׳אי הוּ', 'Chai Hu'),
        lat: 'Bupleurum chinense',
        cn: '柴胡 · Chái Hú',
    },
    {
        id: 'shudihuang',
        name: L('שוּ דּי הוּאנג', 'Shu Di Huang'),
        lat: 'Rehmannia glutinosa',
        cn: '熟地黄 · Shú Dì Huáng',
    },
    {
        id: 'shanyurou',
        name: L('שאן ג׳וּ רוּ', 'Shan Zhu Yu'),
        lat: 'Cornus officinalis',
        cn: '山茱萸 · Shān Zhū Yú',
    },
    {
        id: 'shanyao',
        name: L('שאן יאו', 'Shan Yao'),
        lat: 'Dioscorea opposita',
        cn: '山药 · Shān Yào',
    },
    {
        id: 'zexie',
        name: L('זה שייה', 'Ze Xie'),
        lat: 'Alisma orientale',
        cn: '泽泻 · Zé Xiè',
    },
    {
        id: 'mudanpi',
        name: L('מוּ דאן פּי', 'Mu Dan Pi'),
        lat: 'Paeonia suffruticosa',
        cn: '牡丹皮 · Mǔ Dān Pí',
    },
    {
        id: 'chuanxiong',
        name: L('צ׳ואן שיונג', 'Chuan Xiong'),
        lat: 'Ligusticum chuanxiong',
        cn: '川芎 · Chuān Xiōng',
    },
];

/** Herbs that belong to the Chinese materia medica. */
export const TCM_HERB_IDS = [
    'guizhi',
    'baishao',
    'dazao',
    'baitouweng',
    'huanglian',
    'huangbai',
    'qinpi',
    'danggui',
    'baizhu',
    'fuling',
    'chaihu',
    'shudihuang',
    'shanyurou',
    'shanyao',
    'zexie',
    'mudanpi',
    'chuanxiong',
    'astragalus',
    'schisandra',
    'ginseng',
    'reishi',
];

export const DEMO_HERBS = HERBS.map((herb) => ({
    ...herb,
    system: TCM_HERB_IDS.includes(herb.id) ? 'chinese' : 'west',
}));

export const DEMO_HERB_BY_ID = Object.fromEntries(
    DEMO_HERBS.map((herb) => [herb.id, herb]),
);

/** Preparation forms a formula can be compounded into. */
export const PREPARATION_FORMS = [
    { id: 'tincture', name: L('טינקטורה', 'Tincture'), unit: 'ml' },
    { id: 'capsule', name: L('קפסולות', 'Capsules'), unit: 'capsule' },
    { id: 'powder', name: L('אבקה', 'Powder'), unit: 'g' },
    { id: 'tea', name: L('חליטה', 'Infusion'), unit: 'g' },
    { id: 'decoction', name: L('בישול אישי', 'Decoction'), unit: 'ml' },
    { id: 'gel', name: L('ג׳ל', 'Gel'), unit: 'g' },
    { id: 'cream', name: L('קרם', 'Cream'), unit: 'g' },
    { id: 'eoil', name: L('שמן אתרי', 'Essential oil'), unit: 'ml' },
    { id: 'ioil', name: L('שמן מושרה', 'Infused oil'), unit: 'ml' },
];

export const PREPARATION_FORM_IDS = PREPARATION_FORMS.map((form) => form.id);

/** How a dose is measured out. */
export const DOSE_UNIT_IDS = ['ml', 'tsp', 'capsule'];

/** When in relation to a meal the dose is taken. */
export const DOSE_TIMING_IDS = [
    'before_meal',
    'with_meal',
    'after_meal',
    'empty_stomach',
];

/** What the alcohol in a tincture is evaporated down into, if anything. */
export const EVAPORATION_IDS = [
    'none',
    'glycerin',
    'glycerin_honey',
    'carob',
    'molasses',
];

/**
 * Documented herb ⇄ drug interactions. A plain link with no severity grading:
 * the pharmacist decides, the console only makes sure nobody misses the pair.
 * Drug names are brand names and stay language-neutral.
 */
export const HERB_INTERACTIONS = [
    {
        id: 'i1',
        herbId: 'stjohnswort',
        drug: 'SSRI, Cipralex, Prozac, Zoloft, Lustral, Seroxat',
    },
    { id: 'i2', herbId: 'stjohnswort', drug: 'Coumadin, Warfarin' },
    { id: 'i3', herbId: 'ginkgo', drug: 'Coumadin, Aspirin, Clopidogrel' },
    { id: 'i4', herbId: 'garlic', drug: 'Coumadin, Aspirin' },
    { id: 'i5', herbId: 'ashwagandha', drug: 'Eltroxin, Euthyrox' },
    { id: 'i6', herbId: 'licorice', drug: 'Lasix, Hydrochlorothiazide' },
    { id: 'i7', herbId: 'hawthorn', drug: 'Digoxin' },
    { id: 'i8', herbId: 'cinnamon', drug: 'Metformin, Insulin' },
    { id: 'i9', herbId: 'ginseng', drug: 'Metformin, Insulin' },
    {
        id: 'i10',
        herbId: 'valerian',
        drug: 'Clonex, Bondormin, Benzodiazepines',
    },
    { id: 'i11', herbId: 'milkthistle', drug: 'Statins, Simvastatin' },
    { id: 'i12', herbId: 'turmeric', drug: 'Coumadin' },
    { id: 'i13', herbId: 'rhodiola', drug: 'SSRI, MAOI' },
    {
        id: 'i14',
        herbId: 'echinacea',
        drug: 'Immunosuppressants, Prednisone',
    },
];

const WARN = {
    ssri: L('נטילת SSRI', 'Taking an SSRI'),
    anticoagulants: L('נוגדי קרישה', 'Anticoagulants'),
    pregnancy: L('הריון', 'Pregnancy'),
    photosensitivity: L('רגישות לאור', 'Photosensitivity'),
    surgery: L('לפני ניתוח', 'Before surgery'),
    hypertension: L('יתר לחץ דם', 'High blood pressure'),
    kidney: L('מחלות כליה', 'Kidney disease'),
    autoimmune: L('אוטואימוני', 'Autoimmune condition'),
    thyroid: L('תת/יתר תריס', 'Under- or over-active thyroid'),
    heartMeds: L('תרופות לב', 'Heart medication'),
    breastfeeding: L('הנקה', 'Breastfeeding'),
    infants: L('ילדים קטנים', 'Young children'),
    contraceptives: L('גלולות', 'Oral contraceptives'),
};

/** Conditions under which a herb needs a second look before it is compounded. */
export const HERB_WARNINGS = {
    stjohnswort: [
        WARN.ssri,
        WARN.anticoagulants,
        WARN.pregnancy,
        WARN.photosensitivity,
    ],
    ginkgo: [WARN.anticoagulants, WARN.surgery],
    licorice: [WARN.hypertension, WARN.pregnancy, WARN.kidney],
    ashwagandha: [WARN.pregnancy, WARN.autoimmune, WARN.thyroid],
    hawthorn: [WARN.heartMeds],
    valerian: [WARN.pregnancy, WARN.breastfeeding, WARN.infants],
    echinacea: [WARN.autoimmune],
    sage: [WARN.pregnancy, WARN.breastfeeding],
    vitex: [WARN.pregnancy, WARN.contraceptives],
};
