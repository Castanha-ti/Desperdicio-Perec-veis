const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../src/app.js");

test("parseLocaleNumber accepts Brazilian comma decimals", () => {
  assert.equal(core.parseLocaleNumber("1,224"), 1.224);
  assert.equal(core.parseLocaleNumber("59,90"), 59.9);
});

test("parseLocaleNumber accepts dot decimals from spreadsheet exports", () => {
  assert.equal(core.parseLocaleNumber("1.224"), 1.224);
  assert.equal(core.parseLocaleNumber("59.90"), 59.9);
});

test("validateEntry accepts one KG quantity", () => {
  const result = core.validateEntry({
    setor: "Padaria",
    data: "2026-06-15",
    item: "Pizza Presunto",
    codigo: "22400",
    tipoQuantidade: "kg",
    quantidadeKg: "1,224",
    quantidadeUn: "",
    precoUnitario: "59,90",
    motivo: "Qualidade",
    observacao: ""
  });

  assert.equal(result.valid, true);
  assert.equal(result.payload.quantidadeKg, 1.224);
  assert.equal(result.payload.quantidadeUn, "");
});

test("validateEntry rejects KG and UN together", () => {
  const result = core.validateEntry({
    setor: "Padaria",
    data: "2026-06-15",
    item: "Pizza Presunto",
    codigo: "22400",
    tipoQuantidade: "kg",
    quantidadeKg: "1,224",
    quantidadeUn: "2",
    precoUnitario: "59,90",
    motivo: "Qualidade",
    observacao: ""
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /apenas KG ou UN/);
});

test("calculateEstimatedLoss uses quantity times unit price", () => {
  const value = core.calculateEstimatedLoss({
    quantidadeKg: 1.224,
    quantidadeUn: "",
    precoUnitario: 59.9
  });

  assert.equal(Number(value.toFixed(3)), 73.318);
});

test("findItemSuggestion matches item names ignoring case and extra spaces", () => {
  const suggestion = core.findItemSuggestion(
    [
      { item: "Pizza Presunto", codigo: "22400", precoUnitario: 59.9 },
      { item: "Bolo de Fubá", codigo: "10730", precoUnitario: 31.9 }
    ],
    "  pizza presunto  "
  );

  assert.deepEqual(suggestion, { item: "Pizza Presunto", codigo: "22400", precoUnitario: 59.9 });
});

test("upsertItemSuggestion keeps the newest data for an item", () => {
  const suggestions = core.upsertItemSuggestion(
    [{ item: "Pizza Presunto", codigo: "22400", precoUnitario: 59.9 }],
    { item: "pizza presunto", codigo: "22401", precoUnitario: 62.5 }
  );

  assert.deepEqual(suggestions, [{ item: "pizza presunto", codigo: "22401", precoUnitario: 62.5 }]);
});
