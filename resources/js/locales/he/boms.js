// עצי מוצר — the bills-of-materials page. The table and drawer keep reading
// the older `items.bom.*` block; this holds what the page itself says.
export default {
    title: 'עצי מוצר',
    sub: '{total} עצי מוצר · {internal} מתכונים לייצור פנימי',
    produce: 'הוראת ייצור חדשה',
    col: {
        prepType: 'סוג הכנה',
        yield: 'תפוקה לריצה',
        canProduce: 'ריצות אפשריות',
    },
    perUnit: 'ליחידה',
};
