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
