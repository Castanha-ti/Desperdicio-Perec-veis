# Controle de Desperdicio MVP Design

## Objetivo

Criar uma pagina web simples para lancamento manual de desperdicio de pereciveis do Supermercado Castanha, gravando diretamente na planilha Google Sheets `Controle_Desperdicio v1`.

## Escopo do MVP

- Frontend estatico separado do Google Apps Script, pronto para GitHub Pages ou Vercel.
- Um item por envio.
- Sem login e sem token no MVP.
- Gravacao direta na aba `Pagina1` da planilha via Web App do Apps Script.
- Campos: `#`, `DATA`, `SETOR`, `ITEM`, `CODIGO`, `QTD (KG)`, `QTD (UN)`, `R$`, `MOTIVO DO DESCARTE`, `OBSERVACAO`.
- Quantidade deve usar KG ou UN, nunca ambos.
- `R$` representa preco unitario.
- Campo `ITEM` oferece sugestoes dos itens ja lancados e pode preencher `CODIGO` e `R$` com base no ultimo lancamento daquele item.
- Leitura de imagens por IA fica fora do MVP e entra como fase 2.

## Arquitetura

O frontend coleta e valida os dados no navegador, normaliza numeros brasileiros e envia JSON para um endpoint publico do Apps Script. O Apps Script valida novamente os campos, prepara a estrutura da aba, calcula o proximo sequencial e adiciona uma nova linha na planilha.

Para sugestoes de itens, o frontend chama `doGet?action=items` no Apps Script ao abrir a pagina. O Apps Script le a aba, monta uma lista unica dos itens mais recentes, limita a 500 registros e usa cache de curta duracao para reduzir leituras da planilha.

## Interface

A pagina inicial e o proprio formulario operacional, sem landing page. O layout deve funcionar bem em celular e desktop, com feedback de carregamento, erro, sucesso e uma area de ultimo lancamento para conferencia imediata.

## Dados

Setores iniciais:

- Padaria
- Confeitaria
- Hortifruti
- Acougue
- Frios/Laticinios

Motivos iniciais:

- Qualidade
- Validade
- Quebra
- Avaria
- Producao excedente
- Outros

## Fase 2

Adicionar upload/leitura de imagens de etiquetas a partir de uma pasta no Google Drive, processar com IA/OCR, apresentar revisao humana e gravar os dados aprovados na mesma planilha.
