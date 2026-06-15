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

  function normalizeItemKey(value) {
    return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
  }

  function findItemSuggestion(suggestions, value) {
    const key = normalizeItemKey(value);
    if (!key) return null;
    return suggestions.find((suggestion) => normalizeItemKey(suggestion.item) === key) || null;
  }

  function upsertItemSuggestion(suggestions, payload, limit = 500) {
    const item = String(payload.item || "").trim();
    if (!item) return suggestions.slice(0, limit);

    const key = normalizeItemKey(item);
    const nextSuggestion = {
      item,
      codigo: String(payload.codigo || "").trim(),
      precoUnitario: payload.precoUnitario
    };

    const filtered = suggestions.filter((suggestion) => normalizeItemKey(suggestion.item) !== key);
    return [nextSuggestion, ...filtered].slice(0, limit);
  }

  const Core = {
    SECTORS,
    REASONS,
    parseLocaleNumber,
    validateEntry,
    calculateEstimatedLoss,
    findItemSuggestion,
    upsertItemSuggestion,
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
  const itemInput = document.getElementById("item");
  const codigoInput = document.getElementById("codigo");
  const precoUnitarioInput = document.getElementById("precoUnitario");
  const itemSuggestionsList = document.getElementById("item-suggestions");
  const itemSuggestionStatus = document.getElementById("item-suggestion-status");
  const quantidadeKg = document.getElementById("quantidadeKg");
  const quantidadeUn = document.getElementById("quantidadeUn");
  const kgField = document.getElementById("kg-field");
  const unField = document.getElementById("un-field");
  const statusMessage = document.getElementById("status-message");
  const submitButton = document.getElementById("submit-button");
  const estimatedLoss = document.getElementById("estimated-loss");
  const lastEntry = document.getElementById("last-entry");
  let itemSuggestions = [];

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

  function formatNumberInput(value) {
    if (value === "" || value === null || value === undefined) return "";
    const number = Number(value);
    if (!Number.isFinite(number)) return "";
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3
    }).format(number);
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

  function setSuggestionStatus(message) {
    if (!itemSuggestionStatus) return;
    itemSuggestionStatus.textContent = message;
  }

  function renderItemSuggestions(items) {
    itemSuggestions = Array.isArray(items) ? items.slice(0, 500) : [];
    if (!itemSuggestionsList) return;

    itemSuggestionsList.innerHTML = "";
    itemSuggestions.forEach((suggestion) => {
      const option = document.createElement("option");
      option.value = suggestion.item;
      option.label = [suggestion.codigo, formatNumberInput(suggestion.precoUnitario)]
        .filter(Boolean)
        .join(" | ");
      itemSuggestionsList.appendChild(option);
    });

    setSuggestionStatus(
      itemSuggestions.length
        ? `${itemSuggestions.length} itens recentes disponíveis para sugestão.`
        : "Nenhum item anterior encontrado para sugestão."
    );
  }

  function requestItemsJsonp(url) {
    return new Promise((resolve, reject) => {
      const callbackName = `__desperdicioItems${Date.now()}${Math.floor(Math.random() * 100000)}`;
      const separator = url.includes("?") ? "&" : "?";
      const script = document.createElement("script");
      const timeout = global.setTimeout(() => {
        cleanup();
        reject(new Error("Tempo esgotado ao carregar sugestões."));
      }, 12000);

      function cleanup() {
        global.clearTimeout(timeout);
        delete global[callbackName];
        script.remove();
      }

      global[callbackName] = (data) => {
        cleanup();
        resolve(data);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("Não foi possível carregar sugestões."));
      };
      script.src = `${url}${separator}action=items&callback=${encodeURIComponent(callbackName)}`;
      document.head.appendChild(script);
    });
  }

  async function loadItemSuggestions() {
    const url = String(config.appsScriptUrl || "").trim();
    if (!url || url.includes("COLE_A_URL")) {
      setSuggestionStatus("Configure o Apps Script para carregar sugestões.");
      return;
    }

    setSuggestionStatus("Carregando sugestões...");
    try {
      const data = await requestItemsJsonp(url);
      if (!data || data.ok === false) {
        throw new Error(data && data.message ? data.message : "Resposta inválida.");
      }
      renderItemSuggestions(data.items || []);
    } catch (error) {
      renderItemSuggestions([]);
      setSuggestionStatus("Sugestões indisponíveis. O lançamento manual continua funcionando.");
    }
  }

  function applyItemSuggestion() {
    const suggestion = findItemSuggestion(itemSuggestions, itemInput.value);
    if (!suggestion) return;

    if (!codigoInput.value.trim() && suggestion.codigo) {
      codigoInput.value = suggestion.codigo;
    }

    if (!precoUnitarioInput.value.trim() && suggestion.precoUnitario) {
      precoUnitarioInput.value = formatNumberInput(suggestion.precoUnitario);
    }

    setSuggestionStatus("Código e preço sugeridos a partir do último lançamento desse item.");
    updateEstimate();
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
      renderItemSuggestions(upsertItemSuggestion(itemSuggestions, result.payload));
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
  itemInput.addEventListener("change", applyItemSuggestion);
  itemInput.addEventListener("blur", applyItemSuggestion);
  form.querySelectorAll("input[name='tipoQuantidade']").forEach((input) => {
    input.addEventListener("change", updateQuantityMode);
  });

  fillOptions(setorSelect, SECTORS);
  fillOptions(motivoSelect, REASONS);
  dataInput.value = todayIso();
  updateQuantityMode();
  updateEstimate();
  loadItemSuggestions();
})(typeof window !== "undefined" ? window : globalThis);
