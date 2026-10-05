const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('templates/00-number-format.html','utf8').replace(/<\/?script[^>]*>/g,''),ctx);
const n=ctx.window.PS_NUMBERS;
assert.equal(n.result(12.349),12.35);assert.equal(n.display(12.349),'12.3');
assert.equal(n.result(1.005),1.01);assert.equal(n.display(1.25),'1.3');
assert.equal(n.display(-1.25),'-1.3');assert.equal(n.result(-1.005),-1.01);
assert.equal(n.display(1234.55),'1,234.6');assert.equal(n.result(null),null);assert.equal(n.result(NaN),null);
assert.equal(n.fixed(1e-7,2),'0.00');assert.equal(n.display(-0.01),'0.0');
// Result precision must never become an intermediate input for display or totals.
const raw=0.0249+0.0249;assert.equal(n.result(raw),0.05);assert.equal(n.display(raw),'0.0');
assert.equal(n.display(n.result(raw)),'0.1');
console.log('Number policy: half-up, negative ties, null, exponents and no double rounding passed.');
