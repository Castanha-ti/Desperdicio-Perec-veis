(function bootstrap(global) {
  "use strict";

  const SECTORS = ["Padaria", "Confeitaria", "Hortifruti", "Açougue", "Frios/Laticínios"];
  const REASONS = ["Qualidade", "Validade", "Quebra", "Avaria", "Produção excedente", "Outros"];

  function parseLocaleNumber(value) {
    if (value === null || value === undefined) return null;
    const raw = String(value)
      .trim()
      .replace(/\s/g, "")
      .replace(/R\$/gi, "");

    if (!raw) return null;

    let normalized = raw;
    if (raw.includes(",")) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value || 0);
  }

  function todayIso() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 10);
  }

  function validateEntry(raw) {
    const errors = [];
    const quantidadeKg = parseLocaleNumber(raw.quantidadeKg);
    const quantidadeUn = parseLocaleNumber(raw.quantidadeUn);
    const precoUnitario = parseLocaleNumber(raw.precoUnitario);
    const usesKg = raw.tipoQuantidade === "kg";
    const usesUn = raw.tipoQuantidade === "un";

    if (!SECTORS.includes(raw.setor)) errors.push("Selecione um setor válido.");
    if (!raw.data) errors.push("Informe a data.");
    if (!String(raw.item || "").trim()) errors.push("Informe o item.");
    if (!String(raw.codigo || "").trim()) errors.push("Informe o código.");
    if (!REASONS.includes(raw.motivo)) errors.push("Selecione um motivo válido.");
    if (precoUnitario === null || precoUnitario <= 0) errors.push("Informe um preço unitário maior que zero.");

    if (!usesKg && !usesUn) {
      errors.push("Escolha se a quantidade será em KG ou UN.");
    }

    if (usesKg) {
      if (quantidadeKg === null || quantidadeKg <= 0) errors.push("Informe QTD (KG) maior que zero.");
      if (quantidadeUn !== null) errors.push("Preencha apenas KG ou UN, nunca os dois.");
    }

    if (usesUn) {
      if (quantidadeUn === null || quantidadeUn <= 0) errors.push("Informe QTD (UN) maior que zero.");
      if (quantidadeKg !== null) errors.push("Preencha apenas KG ou UN, nunca os dois.");
    }

    return {
      valid: errors.length === 0,
      errors,
      payload: {
        data: raw.data,
        setor: raw.setor,
        item: String(raw.item || "").trim(),
        codigo: String(raw.codigo || "").trim(),
        quantidadeKg: usesKg ? quantidadeKg : "",
        quantidadeUn: usesUn ? quantidadeUn : "",
        precoUnitario,
        motivo: raw.motivo,
        observacao: String(raw.observacao || "").trim()
      }
    };
  }

  function getQuantityValue(payload) {
    return payload.quantidadeKg || payload.quantidadeUn || 0;
  }

  function calculateEstimatedLoss(payload) {
    return getQuantityValue(payload) * (payload.precoUnitario || 0);
  }

  const Core = {
    SECTORS,
    REASONS,
    parseLocaleNumber,
    validateEntry,
    calculateEstimatedLoss,
    todayIso
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Core;
  }

  global.DesperdicioCore = Core;

  if (!global.document) return;

  const config = global.DESPERDICIO_CONFIG || {};
  const form = document.getElementById("waste-form");
  const setorSelect = document.getElementById("setor");
  const motivoSelect = document.getElementById("motivo");
  const dataInput = document.getElementById("data");
  const quantidadeKg = document.getElementById("quantidadeKg");
  const quantidadeUn = document.getElementById("quantidadeUn");
  const kgField = document.getElementById("kg-field");
  const unField = document.getElementById("un-field");
  const statusMessage = document.getElementById("status-message");
  const submitButton = document.getElementById("submit-button");
  const estimatedLoss = document.getElementById("estimated-loss");
  const lastEntry = document.getElementById("last-entry");

  function fillOptions(select, values) {
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  }

  function readForm() {
    const formData = new FormData(form);
    return {
      setor: formData.get("setor"),
      data: formData.get("data"),
      item: formData.get("item"),
      codigo: formData.get("codigo"),
      tipoQuantidade: formData.get("tipoQuantidade"),
      quantidadeKg: formData.get("quantidadeKg"),
      quantidadeUn: formData.get("quantidadeUn"),
      precoUnitario: formData.get("precoUnitario"),
      motivo: formData.get("motivo"),
      observacao: formData.get("observacao")
    };
  }

  function setStatus(type, message) {
    statusMessage.className = `status-message visible ${type || ""}`.trim();
    statusMessage.textContent = message;
  }

  function clearStatus() {
    statusMessage.className = "status-message";
    statusMessage.textContent = "";
  }

  function setSubmitting(isSubmitting) {
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? "Salvando..." : "Salvar lançamento";
  }

  function updateQuantityMode() {
    const type = new FormData(form).get("tipoQuantidade") || "kg";
    const kgEnabled = type === "kg";

    quantidadeKg.disabled = !kgEnabled;
    quantidadeUn.disabled = kgEnabled;
    kgField.classList.toggle("disabled", !kgEnabled);
    unField.classList.toggle("disabled", kgEnabled);

    if (kgEnabled) {
      quantidadeUn.value = "";
    } else {
      quantidadeKg.value = "";
    }

    updateEstimate();
  }

  function updateEstimate() {
    const result = validateEntry(readForm());
    const payload = result.payload;
    const value = calculateEstimatedLoss(payload);
    estimatedLoss.textContent = `Perda estimada: ${formatCurrency(value)}`;
  }

  function renderLastEntry(payload, response) {
    lastEntry.className = "last-entry";
    const quantityLabel = payload.quantidadeKg ? "KG" : "UN";
    const quantityValue = payload.quantidadeKg || payload.quantidadeUn;
    const sequence = response && response.sequence ? `#${response.sequence}` : "Enviado";

    lastEntry.innerHTML = `
      <dl>
        <dt>Status</dt><dd>${sequence}</dd>
        <dt>Setor</dt><dd>${payload.setor}</dd>
        <dt>Item</dt><dd>${payload.item}</dd>
        <dt>Qtd.</dt><dd>${quantityValue} ${quantityLabel}</dd>
        <dt>Perda</dt><dd>${formatCurrency(calculateEstimatedLoss(payload))}</dd>
      </dl>
    `;
  }

  async function submitEntry(payload) {
    const url = String(config.appsScriptUrl || "").trim();
    if (!url || url.includes("COLE_A_URL")) {
      throw new Error("Configure a URL do Apps Script em src/config.js antes de salvar.");
    }

    const response = await fetch(url, {
      method: "POST",
      mode: config.requestMode || "cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload),
      redirect: "follow"
    });

    if (config.requestMode === "no-cors") {
      return { ok: true };
    }

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok || data.ok === false) {
      throw new Error(data.message || "O Apps Script recusou o lançamento.");
    }
    return data;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearStatus();

    const result = validateEntry(readForm());
    if (!result.valid) {
      setStatus("error", result.errors.join(" "));
      return;
    }

    setSubmitting(true);
    try {
      const response = await submitEntry(result.payload);
      setStatus("success", "Lançamento salvo na planilha.");
      renderLastEntry(result.payload, response);
      form.reset();
      dataInput.value = todayIso();
      updateQuantityMode();
      updateEstimate();
    } catch (error) {
      setStatus("error", error.message || "Falha ao salvar o lançamento.");
    } finally {
      setSubmitting(false);
    }
  });

  form.addEventListener("reset", () => {
    global.setTimeout(() => {
      dataInput.value = todayIso();
      updateQuantityMode();
      updateEstimate();
      clearStatus();
    }, 0);
  });

  form.addEventListener("input", updateEstimate);
  form.addEventListener("change", updateEstimate);
  form.querySelectorAll("input[name='tipoQuantidade']").forEach((input) => {
    input.addEventListener("change", updateQuantityMode);
  });

  fillOptions(setorSelect, SECTORS);
  fillOptions(motivoSelect, REASONS);
  dataInput.value = todayIso();
  updateQuantityMode();
  updateEstimate();
})(typeof window !== "undefined" ? window : globalThis);
