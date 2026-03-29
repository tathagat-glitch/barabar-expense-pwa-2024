export function computeBalances(expenses, settlements) {
  const net = {};

  const ensure = (uid) => {
    if (!net[uid]) net[uid] = 0;
  };

  for (const exp of expenses) {
    const { amount, paidBy, splitBetween, splitType, customSplits } = exp;
    if (!amount || !paidBy) continue;

    if (splitType === 'custom' && customSplits && typeof customSplits === 'object') {
      for (const [uid, share] of Object.entries(customSplits)) {
        const val = Number(share);
        if (!isNaN(val) && val > 0) {
          ensure(uid);
          net[uid] -= val;
        }
      }
      ensure(paidBy);
      net[paidBy] += amount;
    } else if (splitBetween && splitBetween.length > 0) {
      const share = amount / splitBetween.length;
      for (const uid of splitBetween) {
        ensure(uid);
        net[uid] -= share;
      }
      ensure(paidBy);
      net[paidBy] += amount;
    }
  }

  for (const s of settlements) {
    const { from, to, amount } = s;
    if (!amount || !from || !to) continue;
    ensure(from);
    ensure(to);
    net[from] += amount;
    net[to] -= amount;
  }

  const creditors = [];
  const debtors = [];
  Object.entries(net).forEach(([uid, value]) => {
    const rounded = Math.round(value * 100) / 100;
    if (rounded > 0.01) creditors.push({ uid, amount: rounded });
    else if (rounded < -0.01) debtors.push({ uid, amount: -rounded });
  });

  const edges = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const amount = Math.min(d.amount, c.amount);
    edges.push({ from: d.uid, to: c.uid, amount });

    d.amount -= amount;
    c.amount -= amount;

    if (d.amount < 0.01) i++;
    if (c.amount < 0.01) j++;
  }

  return { net, debts: edges };
}

