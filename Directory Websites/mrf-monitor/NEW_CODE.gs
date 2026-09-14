const CONFIG = {
  spreadsheetId: '',
  sheetName: 'MRF Requests',
  applicantsSheetName: 'Applicants',
  driveFolderId: '',
  driveFolderName: 'MRF Monitor Uploads',
  applicantFilesDriveFolderId: ''
};

const HEADERS = [
  'id', 'mrfNumber', 'department', 'position', 'headcount', 'dateRequested',
  'dateNeeded', 'requestedBy', 'status', 'remarks', 'fileName', 'fileUrl',
  'createdAt', 'updatedAt'
];

const DISPLAY_HEADERS = HEADERS.map(header => header.replace(/[A-Z]/g, letter => ' ' + letter).toUpperCase());

const APPLICANT_HEADERS = [
  'id', 'fullName', 'email', 'phone', 'positionApplied', 'department', 'source',
  'availabilityDate', 'resumeLink', 'status', 'remarks', 'createdAt', 'updatedAt'
];

const DISPLAY_APPLICANT_HEADERS = APPLICANT_HEADERS.map(header => header.replace(/[A-Z]/g, letter => ' ' + letter).toUpperCase());

const SHEET_FONT_FAMILY = 'Arial';
const SHEET_FONT_SIZE = 10;

function getSpreadsheet() {
  if (CONFIG.spreadsheetId) {
    return SpreadsheetApp.openById(CONFIG.spreadsheetId);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function doGet(e) {
  try {
    applyWorkbookDefaults();
    const action = (e && e.parameter && e.parameter.action) || 'list';
    if (action === 'applicant-list') return json({ ok: true, records: readApplicants() });
    if (action !== 'list') return json({ ok: false, error: 'Unknown action' });
    return json({ ok: true, records: readRecords() });
  } catch (error) {
    return json({ ok: false, error: error.message });
  }
}

function doPost(e) {
  try {
    applyWorkbookDefaults();
    const body = parseJsonBody(e);
    if (!body || typeof body !== 'object') {
      return json({ ok: false, error: 'Invalid request payload' });
    }

    if (!body.action) return json({ ok: false, error: 'No action supplied' });
    if (body.action === 'save') return json({ ok: true, record: saveRecord(body.record) });
    if (body.action === 'delete') {
      deleteRecord(body.id);
      return json({ ok: true });
    }
    if (body.action === 'save-applicant') return json({ ok: true, record: saveApplicant(body.record) });
    if (body.action === 'delete-applicant') {
      deleteApplicant(body.id);
      return json({ ok: true });
    }

    return json({ ok: false, error: 'Unknown action' });
  } catch (error) {
    return json({ ok: false, error: error.message || 'Unexpected server error' });
  }
}

function parseJsonBody(e) {
  const raw = (e && e.postData && e.postData.contents) || '';
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    throw new Error('Invalid JSON payload');
  }
}

function getSheet() {
  const spreadsheet = getSpreadsheet();
  let sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(CONFIG.sheetName);
  if (sheet.getLastRow() === 0) sheet.appendRow(DISPLAY_HEADERS);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setFontColor('#1f2933')
    .setBackground('#d9ead3')
    .setHorizontalAlignment('center');
  sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), HEADERS.length)
    .setFontWeight('normal')
    .setFontColor('#000000')
    .setBackground('#FFFFFF');
  sheet.getRange('A:A').setNumberFormat('@');
  applySheetDefaults(sheet, HEADERS.length);
  normalizeNamedLinks(sheet, HEADERS.indexOf('fileUrl') + 1, 'MRF_LINK_');
  return sheet;
}

function readRecords() {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const richValues = sheet.getDataRange().getRichTextValues();
  if (values.length < 2) return [];

  return values.slice(1).map((row, rowIndex) => ({ row, rowIndex }))
    .filter(item => item.row[0])
    .map(item => {
      const row = item.row;
      const rowIndex = item.rowIndex;
      const record = {};
      HEADERS.forEach((header, index) => record[header] = row[index] === '' ? '' : row[index]);
      record.fileUrl = getRichTextUrl(richValues[rowIndex + 1][HEADERS.indexOf('fileUrl')]) || record.fileUrl;
      record.headcount = Number(record.headcount) || 1;
      record.createdAt = Number(record.createdAt) || 0;
      record.updatedAt = Number(record.updatedAt) || record.createdAt;
      return record;
    }).sort((a, b) => b.createdAt - a.createdAt);
}

function saveRecord(input) {
  if (!input) throw new Error('Record data is required');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet();
    const record = Object.assign({}, input);
    delete record.fileData;
    delete record.fileMimeType;
    const existingRow = record.id ? findRow(sheet, record.id) : 0;
    if (!existingRow) record.id = nextRequestId(sheet);

    if (input.fileData) {
      const folder = getUploadFolder();
      const bytes = Utilities.base64Decode(input.fileData.split(',').pop());
      const fileName = makeUploadName(record.id, input.fileName);
      const blob = Utilities.newBlob(bytes, input.fileMimeType || 'application/octet-stream', fileName);
      const file = folder.createFile(blob);
      record.fileName = file.getName();
      record.fileUrl = file.getUrl();
    }

    const values = HEADERS.map(header => record[header] == null ? '' : record[header]);
    if (existingRow) sheet.getRange(existingRow, 1, 1, HEADERS.length).setValues([values]);
    else sheet.appendRow(values);

    const savedRow = existingRow || sheet.getLastRow();
    if (record.fileUrl) {
      setNamedLink(sheet, savedRow, HEADERS.indexOf('fileUrl') + 1, record.fileUrl, 'MRF_LINK_' + (savedRow - 1));
    }
    applySheetDefaults(sheet, HEADERS.length);
    return record;
  } finally {
    lock.releaseLock();
  }
}

function nextRequestId(sheet) {
  const ids = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  const highest = ids.reduce((max, row) => {
    const value = String(row[0]).trim();
    const number = /^\d{1,4}$/.test(value) ? Number(value) : 0;
    return Math.max(max, number);
  }, 0);
  if (highest >= 9999) throw new Error('No four-digit request IDs remain');
  return String(highest + 1).padStart(4, '0');
}

function makeUploadName(id, originalName) {
  const extensionMatch = String(originalName || '').match(/(\.[a-z0-9]{1,8})$/i);
  return 'T-FILE_' + String(id).padStart(4, '0') + (extensionMatch ? extensionMatch[1].toLowerCase() : '');
}

function deleteRecord(id) {
  const sheet = getSheet();
  const row = findRow(sheet, id);
  if (row) sheet.deleteRow(row);
}

function findRow(sheet, id) {
  if (sheet.getLastRow() < 2) return 0;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  const target = String(id).replace(/^0+(?=\d)/, '');
  const index = ids.findIndex(row => String(row[0]).replace(/^0+(?=\d)/, '') === target);
  return index < 0 ? 0 : index + 2;
}

function getUploadFolder() {
  if (CONFIG.driveFolderId) return DriveApp.getFolderById(CONFIG.driveFolderId);
  const folders = DriveApp.getFoldersByName(CONFIG.driveFolderName);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.driveFolderName);
}

function getOrCreateApplicantsSheet() {
  const spreadsheet = getSpreadsheet();
  let sheet = spreadsheet.getSheetByName(CONFIG.applicantsSheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(CONFIG.applicantsSheetName);
  if (sheet.getLastRow() === 0) sheet.appendRow(DISPLAY_APPLICANT_HEADERS);
  sheet.getRange(1, 1, 1, APPLICANT_HEADERS.length)
    .setFontWeight('bold')
    .setFontColor('#1f2933')
    .setBackground('#d9ead3')
    .setHorizontalAlignment('center');
  sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), APPLICANT_HEADERS.length)
    .setFontWeight('normal')
    .setFontColor('#000000')
    .setBackground('#FFFFFF');
  applySheetDefaults(sheet, APPLICANT_HEADERS.length);
  normalizeNamedLinks(sheet, APPLICANT_HEADERS.indexOf('resumeLink') + 1, 'APPLICANT_LINK_');
  return sheet;
}

function saveApplicant(data) {
  if (!data || typeof data !== 'object') throw new Error('Applicant data is required');
  const sheet = getOrCreateApplicantsSheet();
  const record = Object.assign({}, data);
  const existingRow = record.id ? findApplicantRow(sheet, record.id) : 0;
  record.id = record.id || createApplicantId();
  record.status = record.status || 'New';
  record.createdAt = Number(record.createdAt) || Date.now();
  record.updatedAt = Date.now();

  let resumeLink = record.resumeLink || '';
  if (record.resumeData) {
    const folder = getApplicantFolder();
    const bytes = Utilities.base64Decode(String(record.resumeData).split(',').pop());
    const fileName = makeApplicantFileName(record.id, record.resumeFileName || 'applicant-resume');
    const blob = Utilities.newBlob(bytes, record.resumeMimeType || 'application/octet-stream', fileName);
    const file = folder.createFile(blob);
    resumeLink = file.getUrl();
    record.resumeLink = resumeLink;
  }

  const values = APPLICANT_HEADERS.map(header => record[header] == null ? '' : record[header]);
  if (existingRow) sheet.getRange(existingRow, 1, 1, APPLICANT_HEADERS.length).setValues([values]);
  else sheet.appendRow(values);

  const savedRow = existingRow || sheet.getLastRow();
  if (resumeLink) {
    setNamedLink(sheet, savedRow, APPLICANT_HEADERS.indexOf('resumeLink') + 1, resumeLink, 'APPLICANT_LINK_' + (savedRow - 1));
  }

  applySheetDefaults(sheet, APPLICANT_HEADERS.length);
  return record;
}

function readApplicants() {
  const sheet = getOrCreateApplicantsSheet();
  const values = sheet.getDataRange().getValues();
  const richValues = sheet.getDataRange().getRichTextValues();
  if (values.length < 2) return [];

  return values.slice(1).map((row, rowIndex) => ({ row, rowIndex }))
    .filter(item => item.row[0] || item.row[1] || item.row[2])
    .map(item => {
      const row = item.row;
      const rowIndex = item.rowIndex;
      const record = {};
      APPLICANT_HEADERS.forEach((header, index) => record[header] = row[index] == null ? '' : row[index]);
      record.resumeLink = getRichTextUrl(richValues[rowIndex + 1][APPLICANT_HEADERS.indexOf('resumeLink')]) || record.resumeLink;
      record.createdAt = Number(record.createdAt) || 0;
      record.updatedAt = Number(record.updatedAt) || record.createdAt;
      return record;
    }).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

function findApplicantRow(sheet, id) {
  if (sheet.getLastRow() < 2) return 0;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  const target = String(id).trim();
  const index = ids.findIndex(row => String(row[0]).trim() === target);
  return index < 0 ? 0 : index + 2;
}

function createApplicantId() {
  const timestamp = Date.now();
  return 'APP-' + String(timestamp).slice(-8);
}

function makeApplicantFileName(id, originalName) {
  const extensionMatch = String(originalName || '').match(/(\.[a-z0-9]{1,8})$/i);
  return 'APPLICANT_' + String(id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) + (extensionMatch ? extensionMatch[1].toLowerCase() : '.pdf');
}

function deleteApplicant(id) {
  const sheet = getOrCreateApplicantsSheet();
  const row = findApplicantRow(sheet, id);
  if (row) sheet.deleteRow(row);
}

function getApplicantFolder() {
  if (CONFIG.applicantFilesDriveFolderId) {
    return DriveApp.getFolderById(CONFIG.applicantFilesDriveFolderId);
  }
  const folders = DriveApp.getFoldersByName('Applicant Resumes');
  return folders.hasNext() ? folders.next() : DriveApp.getRootFolder().createFolder('Applicant Resumes');
}

function applySheetDefaults(sheet, columnCount) {
  sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 1), columnCount)
    .setFontFamily(SHEET_FONT_FAMILY)
    .setFontSize(SHEET_FONT_SIZE);
}

function applyWorkbookDefaults() {
  getSpreadsheet().getSheets().forEach(sheet => {
    const range = sheet.getDataRange();
    range.setFontFamily(SHEET_FONT_FAMILY).setFontSize(SHEET_FONT_SIZE);
  });
}

function normalizeNamedLinks(sheet, column, prefix) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const range = sheet.getRange(2, column, lastRow - 1, 1);
  const values = range.getValues();
  const richValues = range.getRichTextValues();
  values.forEach((row, index) => {
    const url = getRichTextUrl(richValues[index][0]) || String(row[0] || '').trim();
    if (/^https?:\/\//i.test(url)) {
      setNamedLink(sheet, index + 2, column, url, prefix + (index + 1));
    }
  });
}

function setNamedLink(sheet, row, column, url, label) {
  const richText = SpreadsheetApp.newRichTextValue()
    .setText(label)
    .setLinkUrl(url)
    .build();
  sheet.getRange(row, column).setRichTextValue(richText);
}

function getRichTextUrl(richText) {
  return richText && richText.getLinkUrl ? richText.getLinkUrl() : '';
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
