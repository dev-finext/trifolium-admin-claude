// V3 — ניהול אצוות: how a batch gets its number, and what it inherits.
//
// Where every rule here comes from:
//
//   * Natalie's note "ניהול אצוות" and her note "מספור אצוות - קובץ אקסל חיצוני",
//     both of 09.2026, with Noam's and Yaron's replies inside them.
//   * The workbook those notes attach, "קובץ ספרור אצוות כיום.xlsx" — a single
//     column of running numbers from 10316 to 16922, with the item's name typed
//     beside a number to claim it.
//   * The restored SAP database, which settles what actually happens today:
//     of the 5,830 batches opened since 2025, 3,646 carry a number from that
//     running series and every one of them is an item the pharmacy makes
//     (blocks 11, 20, 50, 23, 24, 27, 21, 14); the other 2,184 carry the
//     supplier's own code in whatever shape the supplier writes it, and every
//     one of them is an item the pharmacy buys (blocks 10, 12, 13, 55, 30, 15,
//     40, 41, 47). The pharmacy's practice and Yaron's instruction agree.
//
// Display text lives in the locale catalogs under `batches.*`.

/**
 * Where a batch comes from. The number is formed differently for each, and so
 * is everything that follows from it.
 */
export const BATCH_KIND_IDS = ['production', 'purchase', 'waste'];

/**
 * The running series the pharmacy's workbook keeps.
 *
 * It is not restarted: the console carries on from where the workbook and SAP
 * stopped, so no number is ever issued twice and yesterday's label still means
 * what it meant. SAP's highest is 16941 and the workbook is pre-allocated to
 * 16922; the next number this console hands out is the one after both.
 */
export const HOUSE_SERIES_NEXT = 16942;

/**
 * How a batch number is formed — the pharmacy's single running series.
 *
 * Yaron proposed a structured, year+item+serial form instead ("ניהול סיפרור
 * אצוות לא צריך בהכרח להיות מספר רץ"), but his scheme was never completed (no
 * prefix for an intermediate, no form code for a personal preparation, no
 * waste prefix) and DEMO_INVENTORY_FIXES_PROMPT.md §2 rule "מספור אצוות"
 * settles on the running series the pharmacy actually uses — "השיטה המובנית
 * יורדת". It is no longer a choice the console offers.
 */
export function batchNumberFor({
    kind,
    serial,
    supplierBatch = '',
    production = '',
}) {
    if (kind === 'purchase') {
        return String(supplierBatch || '').trim();
    }

    if (kind === 'waste') {
        return String(production || '').trim();
    }

    return String(serial);
}

/**
 * Which kinds this console assigns a number to on its own.
 *
 * Only production. A purchase takes the supplier's code and waste takes the
 * order's, so there is nothing to allocate — and a number the system allocated
 * is never editable, which is the whole point of replacing the workbook.
 */
export const SYSTEM_NUMBERED_KINDS = ['production'];

/**
 * Where a batch's expiry date comes from when it is received from production.
 *
 * Noam: "נגדיר לכל קבוצת פריטים (100…200… וכו׳) מה תאריך התפוגה שלה בקבלה מיצור,
 * באופן קבוע ... ובנוסף אופציה לשנות ידנית את התאריך המוצע כמו שנטלי ציינה".
 * Natalie gave two of the figures herself — אבקה שנתיים, טינקטורה 3 שנים — and
 * left "מוצר מדף - תלוי סוג מוצר" open, which is why a shelf product falls
 * through to its preparation type rather than to a number nobody stated.
 *
 * It applies to production only. Natalie is explicit about that — "שים לב שרק
 * מייצור פנימי ולא הזמנת רכש מספק" — and it is the safer reading anyway: a
 * purchased batch's expiry is a fact on the supplier's certificate, not
 * something to calculate.
 */
export const EXPIRY_SUGGESTED_FOR_KINDS = ['production', 'waste'];

/**
 * Every batch may carry documents — the certificate of analysis above all.
 *
 * Natalie: "צירוף אנליזות לאצווה מסויימת ... זה אמור להיות חסום בסיסמא ולא תינתן
 * לשם גישה לכל אחד ... הקובץ לא עושה שום דבר במערכת, המערכת רק שומרת אותו".
 * The gate is `batch_analyses` in config/gates.js.
 */
export const BATCH_FILE_GATE = 'batch_analyses';

/**
 * The batch label the pharmacy prints, at the size it prints it.
 *
 * Taken from the label in Natalie's note: item number, item name, the foreign
 * name under it, the supplier, the batch, the production date, the expiry date,
 * a division note and a barcode — 120 × 60 mm, "בדומה לשאר המדבקות שלנו".
 */
export const BATCH_LABEL_SIZE = { w: 120, h: 60 };
