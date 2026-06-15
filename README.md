# Controle de Desperdício de Perecíveis

MVP para lançar manualmente desperdícios do Supermercado Castanha em uma planilha Google Sheets.

## Arquitetura

- `index.html`: formulário operacional.
- `src/app.js`: validação, normalização numérica e envio ao Apps Script.
- `src/styles.css`: layout responsivo.
- `src/config.js`: URL do Web App do Apps Script.
- `apps-script/Code.gs`: endpoint que grava na planilha.

Planilha alvo:

https://docs.google.com/spreadsheets/d/1dCdJ6O8HAKerJAmrVeeJi3ipyK7wN4eVrAFSK5Hhcrc/edit

## Campos gravados

`#`, `DATA`, `SETOR`, `ITEM`, `CÓDIGO`, `QTD (KG)`, `QTD (UN)`, `R$`, `MOTIVO DO DESCARTE`, `OBSERVAÇÃO`

O campo `R$` representa preço unitário. O operador deve informar `QTD (KG)` ou `QTD (UN)`, nunca os dois.

## Configurar o Apps Script

1. Abra a planilha.
2. Acesse `Extensões > Apps Script`.
3. Cole o conteúdo de `apps-script/Code.gs`.
4. Salve o projeto.
5. Execute manualmente a função `setupSheet` uma vez e autorize o acesso.
6. Acesse `Implantar > Nova implantação`.
7. Tipo: `App da Web`.
8. Executar como: `Eu`.
9. Quem pode acessar: `Qualquer pessoa`.
10. Copie a URL gerada terminando em `/exec`.

## Configurar o frontend

Edite `src/config.js`:

```js
window.DESPERDICIO_CONFIG = {
  appsScriptUrl: "https://script.google.com/macros/s/SEU_DEPLOYMENT_ID/exec",
  spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1dCdJ6O8HAKerJAmrVeeJi3ipyK7wN4eVrAFSK5Hhcrc/edit",
  sheetName: "Página1",
  requestMode: "cors"
};
```

Se o navegador bloquear a leitura da resposta por CORS, altere `requestMode` para `"no-cors"`. Nesse modo o envio é disparado, mas o navegador não consegue confirmar a resposta do Apps Script.

## Rodar localmente

Abra `index.html` no navegador ou rode um servidor estático:

```bash
python -m http.server 5173
```

Depois acesse `http://localhost:5173`.

## Testes

```bash
npm test
```

## Segurança do MVP

Este MVP foi definido sem login e sem token. Quem tiver a URL publicada do formulário e a URL do Apps Script poderá enviar lançamentos. Para produção mais controlada, adicionar token simples, login Google ou validação por domínio.

## Fase 2

Adicionar leitura de imagens de etiquetas a partir de uma pasta no Google Drive, com IA/OCR, tela de revisão e gravação dos dados aprovados na mesma planilha.
