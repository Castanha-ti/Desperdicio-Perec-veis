function desperdicioConfig_() {
  return {
    spreadsheetId: '1dCdJ6O8HAKerJAmrVeeJi3ipyK7wN4eVrAFSK5Hhcrc',
    sheetName: 'Página1',
    headers: ['#', 'DATA', 'SETOR', 'ITEM', 'CÓDIGO', 'QTD (KG)', 'QTD (UN)', 'R$', 'MOTIVO DO DESCARTE', 'OBSERVAÇÃO'],
    sectors: ['Padaria', 'Confeitaria', 'Hortifruti', 'Açougue', 'Frios/Laticínios'],
    reasons: ['Qualidade', 'Validade', 'Quebra', 'Avaria', 'Produção excedente', 'Outros']
  };
}

function doGet(e) {
  try {
    var config = desperdicioConfig_();
    var action = e && e.parameter ? String(e.parameter.action || '') : '';

    if (action === 'items') {
      return respond_(getItemSuggestions_(), e);
    }

    return respond_({
      ok: true,
      service: 'controle-desperdicio',
      spreadsheetId: config.spreadsheetId,
      sheetName: config.sheetName
    }, e);
  } catch (error) {
    return respond_({
      ok: false,
      message: error.message || String(error)
    }, e);
  }
}

function doPost(e) {
  try {
    var payload = parseBody_(e);
    var entry = validateEntry_(payload);
    var sheet = getSheet_();

    ensureSheetLayout_(sheet);

    var sequence = getNextSequence_(sheet);
    var row = [
      sequence,
      parseDate_(entry.data),
      entry.setor,
      entry.item,
      entry.codigo,
      entry.quantidadeKg === '' ? '' : entry.quantidadeKg,
      entry.quantidadeUn === '' ? '' : entry.quantidadeUn,
      entry.precoUnitario,
      entry.motivo,
      entry.observacao
    ];

    sheet.appendRow(row);
    formatLastRow_(sheet);
    clearItemsCache_();

    return json_({
      ok: true,
      sequence,
      row: sheet.getLastRow()
    });
  } catch (error) {
    return json_({
      ok: false,
      message: error.message || String(error)
    });
  }
}

function doOptions() {
  return json_({ ok: true });
}

function setupSheet() {
  var config = desperdicioConfig_();
  var sheet = getSheet_();
  ensureSheetLayout_(sheet);
  sheet.setFrozenRows(2);
  sheet.getRange(2, 1, 1, config.headers.length).setFontWeight('bold');
  sheet.autoResizeColumns(1, config.headers.length);
  return 'Planilha preparada.';
}

function getSheet_() {
  var config = desperdicioConfig_();
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  var sheet = spreadsheet.getSheetByName(config.sheetName);
  if (!sheet) {
    throw new Error('A aba "' + config.sheetName + '" não foi encontrada.');
  }
  return sheet;
}

function ensureSheetLayout_(sheet) {
  var config = desperdicioConfig_();
  var currentHeaders = sheet.getRange(2, 1, 1, Math.max(sheet.getLastColumn(), config.headers.length)).getValues()[0];

  if (normalize_(currentHeaders[0]) === '#' && normalize_(currentHeaders[1]) === 'DATA' && normalize_(currentHeaders[2]) === 'ITEM') {
    sheet.insertColumnBefore(3);
  }

  sheet.getRange(2, 1, 1, config.headers.length).setValues([config.headers]);
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Requisição sem corpo.');
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error('JSON inválido.');
  }
}

function validateEntry_(payload) {
  var config = desperdicioConfig_();
  var entry = {
    data: String(payload.data || '').trim(),
    setor: String(payload.setor || '').trim(),
    item: String(payload.item || '').trim(),
    codigo: String(payload.codigo || '').trim(),
    quantidadeKg: normalizeNumber_(payload.quantidadeKg),
    quantidadeUn: normalizeNumber_(payload.quantidadeUn),
    precoUnitario: normalizeNumber_(payload.precoUnitario),
    motivo: String(payload.motivo || '').trim(),
    observacao: String(payload.observacao || '').trim()
  };

  var errors = [];
  if (config.sectors.indexOf(entry.setor) === -1) errors.push('Setor inválido.');
  if (!entry.data || !/^\d{4}-\d{2}-\d{2}$/.test(entry.data)) errors.push('Data inválida.');
  if (!entry.item) errors.push('Item obrigatório.');
  if (!entry.codigo) errors.push('Código obrigatório.');
  if (config.reasons.indexOf(entry.motivo) === -1) errors.push('Motivo inválido.');
  if (entry.precoUnitario === '' || entry.precoUnitario <= 0) errors.push('Preço unitário inválido.');

  var hasKg = entry.quantidadeKg !== '';
  var hasUn = entry.quantidadeUn !== '';
  if (hasKg === hasUn) errors.push('Informe apenas KG ou UN.');
  if (hasKg && entry.quantidadeKg <= 0) errors.push('QTD (KG) inválida.');
  if (hasUn && entry.quantidadeUn <= 0) errors.push('QTD (UN) inválida.');

  if (errors.length) {
    throw new Error(errors.join(' '));
  }

  return entry;
}

function normalizeNumber_(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : '';
  }

  var raw = String(value).trim().replace(/\s/g, '').replace(/R\$/gi, '');
  if (!raw) return '';

  var normalized = raw.indexOf(',') >= 0 ? raw.replace(/\./g, '').replace(',', '.') : raw;
  var number = Number(normalized);
  return Number.isFinite(number) ? number : '';
}

function parseDate_(value) {
  var parts = value.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getNextSequence_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return 1;

  var values = sheet.getRange(3, 1, lastRow - 2, 1).getValues();
  return values.reduce(function(max, row) {
    var value = Number(row[0]);
    return Number.isFinite(value) && value > max ? value : max;
  }, 0) + 1;
}

function getItemSuggestions_() {
  var cache = CacheService.getScriptCache();
  var cacheKey = 'desperdicio_item_suggestions_v2';
  var cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) {
    return { ok: true, items: [] };
  }

  var lastColumn = Math.max(sheet.getLastColumn(), desperdicioConfig_().headers.length);
  var headers = sheet.getRange(2, 1, 1, lastColumn).getValues()[0].map(normalize_);
  var itemIndex = headers.indexOf('ITEM');
  var codigoIndex = headers.indexOf('CÓDIGO');
  var precoIndex = headers.indexOf('R$');

  if (itemIndex === -1) {
    throw new Error('Coluna ITEM não encontrada.');
  }

  var rows = sheet.getRange(3, 1, lastRow - 2, lastColumn).getValues();
  var seen = {};
  var items = [];

  for (var i = rows.length - 1; i >= 0 && items.length < 500; i--) {
    var row = rows[i];
    var item = String(row[itemIndex] || '').trim();
    var key = normalizeItemKey_(item);
    if (!item || seen[key]) continue;

    seen[key] = true;
    items.push({
      item: item,
      codigo: codigoIndex >= 0 ? String(row[codigoIndex] || '').trim() : '',
      precoUnitario: precoIndex >= 0 ? normalizeNumber_(row[precoIndex]) : ''
    });
  }

  var payload = { ok: true, items: items };
  cache.put(cacheKey, JSON.stringify(payload), 600);
  return payload;
}

function clearItemsCache_() {
  CacheService.getScriptCache().remove('desperdicio_item_suggestions_v2');
}

function formatLastRow_(sheet) {
  var row = sheet.getLastRow();
  sheet.getRange(row, 2).setNumberFormat('dd/MM/yyyy');
  sheet.getRange(row, 6, 1, 2).setNumberFormat('0.000');
  sheet.getRange(row, 8).setNumberFormat('0.00');
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function respond_(payload, e) {
  var callback = e && e.parameter ? String(e.parameter.callback || '').trim() : '';
  if (/^[A-Za-z_$][0-9A-Za-z_$]*(\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(payload);
}

function normalize_(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeItemKey_(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}
