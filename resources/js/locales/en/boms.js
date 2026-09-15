// Bills of materials — the page. The table and drawer keep reading the older
// `items.bom.*` block; this holds what the page itself says.
export default {
    title: 'Bills of materials',
    sub: '{total} bills of materials · {internal} recipes for in-house production',
    produce: 'New production order',
    col: {
        prepType: 'Preparation type',
        yield: 'Yield per run',
        canProduce: 'Runs possible',
    },
    perUnit: 'per unit',
};
