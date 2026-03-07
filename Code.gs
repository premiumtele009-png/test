// ============================================================
// Smart 5G Dashboard — Google Apps Script (Code.gs)
// Spreadsheet: https://docs.google.com/spreadsheets/d/1olDtHW2temS2qee-OfCRYsJs4Ub_OJBADncCsibILHc/edit
// ============================================================

/**
 * doPost(e) — Receive sync payloads from the dashboard.
 * Expects JSON body: { sheet, action, data }
 *   sheet  : sheet tab name (e.g. "Sales", "Deposits", …)
 *   action : "sync" | "delete"
 *   data   : array of row objects (for "sync") or { id } (for "delete")
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var sheetName = payload.sheet;
    var action    = payload.action;
    var data      = payload.data;

    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (action === 'sync') {
      // Auto-create the sheet tab if it does not exist
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }

      // Clear existing data from row 2 downwards
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
      }

      if (!data || data.length === 0) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'ok' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // Write header row on first creation (row 1 is empty on a brand-new sheet)
      var headers = Object.keys(data[0]);
      if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() === '') {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length)
          .setFontWeight('bold')
          .setBackground('#1B7D3D')
          .setFontColor('#ffffff');
      } else {
        // Use existing headers from row 1 to keep column order consistent
        var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        headers = existingHeaders.filter(function(h) { return h !== ''; });
      }

      // Write all data rows
      var rows = data.map(function(item) {
        return headers.map(function(key) {
          var val = item[key];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return val;
        });
      });
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

    } else if (action === 'delete') {
      if (!sheet) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'ok' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // Find the row whose column A value matches data.id and delete it
      var targetId = String(data.id);
      var lastDataRow = sheet.getLastRow();
      for (var r = 2; r <= lastDataRow; r++) {
        if (String(sheet.getRange(r, 1).getValue()) === targetId) {
          sheet.deleteRow(r);
          break;
        }
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * doGet(e) — Read back a sheet for initial load / future use.
 * Query param: ?sheet=<sheetName>
 * Returns all rows as an array of objects (row 1 = headers).
 */
function doGet(e) {
  try {
    var sheetName = e.parameter.sheet;
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var allValues = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers   = allValues[0];
    var rows      = [];

    for (var i = 1; i < allValues.length; i++) {
      var row = allValues[i];
      var obj = {};
      headers.forEach(function(header, idx) {
        obj[header] = row[idx];
      });
      rows.push(obj);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', data: rows }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
