const CEREMONIES = [
  "収天",
  "地空",
  "界光",
  "明王",
  "地蔵",
  "龍華",
  "施餓鬼",
  "治命",
  "玉璽",
  "北鎮",
  "宝珠",
  "国父の日",
  "南十字",
  "閻魔",
  "大龍華祭",
  "鎮魂",
];

const INITIAL_PEOPLE = [
  ["芦田裕善", ""],
  ["武藤哲也", ""],
  ["小川昌昭", ""],
  ["横澤博明", ""],
  ["三國玄洋", ""],
  ["武藤友紀", ""],
  ["三國友美", ""],
  ["三國天音", ""],
  ["野村香與", ""],
  ["牧博子", ""],
  ["四方聖子", ""],
  ["國吉綾乃", ""],
  ["河本ひとみ", ""],
  ["横澤亜紀子", ""],
  ["松川栗実", ""],
];

const STORAGE_KEY = "shinkoku-ryutai-sticker-manager-v1";

const DEFAULT_RANGES = {
  "収天": { start: "305", end: "332" },
  "地空": { start: "290", end: "318" },
  "界光": { start: "307", end: "334" },
  "明王": { start: "148", end: "175" },
};

if (new URLSearchParams(window.location.search).has("reset")) {
  localStorage.removeItem(STORAGE_KEY);
  window.history.replaceState(null, "", window.location.pathname);
}

const elements = {
  ceremonySelect: document.querySelector("#ceremonySelect"),
  startNumber: document.querySelector("#startNumber"),
  endNumber: document.querySelector("#endNumber"),
  bulkDateText: document.querySelector("#bulkDateText"),
  assignButton: document.querySelector("#assignButton"),
  copyExclusionsButton: document.querySelector("#copyExclusionsButton"),
  exportCsvButton: document.querySelector("#exportCsvButton"),
  resetButton: document.querySelector("#resetButton"),
  statusText: document.querySelector("#statusText"),
  editorTitle: document.querySelector("#editorTitle"),
  ceremonyRows: document.querySelector("#ceremonyRows"),
  overviewTable: document.querySelector("#overviewTable"),
  rowTemplate: document.querySelector("#rowTemplate"),
  addPersonButton: document.querySelector("#addPersonButton"),
  addPersonForm: document.querySelector("#addPersonForm"),
  newPersonName: document.querySelector("#newPersonName"),
  newPersonNote: document.querySelector("#newPersonNote"),
  savePersonButton: document.querySelector("#savePersonButton"),
  personCount: document.querySelector("#personCount"),
  assignedCount: document.querySelector("#assignedCount"),
  excludedCount: document.querySelector("#excludedCount"),
  blankCount: document.querySelector("#blankCount"),
};

let state = loadState();

function createInitialState() {
  return {
    selectedCeremony: CEREMONIES[0],
    people: INITIAL_PEOPLE.map(([name, note], index) => ({
      id: crypto.randomUUID(),
      order: index + 1,
      name,
      note,
      startCeremony: CEREMONIES[0],
    })),
    records: {},
    ranges: { ...DEFAULT_RANGES },
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createInitialState();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.people) || !parsed.records) return createInitialState();
    return migrateState(parsed);
  } catch {
    return createInitialState();
  }
}

function migrateState(savedState) {
  const nameFixes = new Map([
    ["松本良彦", "松本良喜"],
    ["柳本時美", "柳本睦美"],
    ["小柳裕美子", "小椋裕美子"],
  ]);

  const normalizedPeople = savedState.people.map((person) => ({
    ...person,
    name: nameFixes.get(person.name) || person.name,
    startCeremony: person.startCeremony || (person.name === "小椋大地" ? "地空" : CEREMONIES[0]),
  }));
  const existingByName = new Map(normalizedPeople.map((person) => [person.name, person]));
  const allowedIds = new Set();

  savedState.people = INITIAL_PEOPLE.map(([name, note], index) => {
    const existing = existingByName.get(name);
    const id = existing?.id || crypto.randomUUID();
    allowedIds.add(id);
    return {
      id,
      order: index + 1,
      name,
      note,
      startCeremony: CEREMONIES[0],
    };
  });

  Object.keys(savedState.records || {}).forEach((personId) => {
    if (!allowedIds.has(personId)) delete savedState.records[personId];
  });

  savedState.ranges = {
    ...DEFAULT_RANGES,
    ...(savedState.ranges || {}),
  };
  return savedState;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getRecord(personId, ceremony = state.selectedCeremony) {
  return normalizeRecord(state.records[personId]?.[ceremony]);
}

function setRecord(personId, ceremony, record) {
  state.records[personId] ||= {};
  state.records[personId][ceremony] = normalizeRecord(record);
}

function normalizeRecord(record) {
  const normalized = record || { status: "blank", number: "", dateText: "" };
  return {
    status: normalized.status || "blank",
    number: normalized.number || "",
    dateText: normalized.dateText || "",
  };
}

function isValidDateText(dateText) {
  if (!dateText) return true;
  const match = dateText.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return false;
  const monthNumber = Number(match[1]);
  const dayNumber = Number(match[2]);
  return Number.isInteger(monthNumber)
    && Number.isInteger(dayNumber)
    && monthNumber >= 1
    && monthNumber <= 12
    && dayNumber >= 1
    && dayNumber <= 31;
}

function normalizeDateText(dateText) {
  const trimmed = dateText.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return trimmed;
  return `${Number(match[1])}/${Number(match[2])}`;
}

function renderCell(record) {
  if (record.status === "excluded") {
    return `<div class="cell excluded"><span class="cell-number">✓</span><span class="cell-date">対象外</span></div>`;
  }
  if (record.status === "assigned" && record.number) {
    const dateText = record.dateText || "未渡";
    const dateClass = record.dateText ? "" : " missing-date";
    return `<div class="cell assigned${dateClass}"><span class="cell-number">${escapeHtml(record.number)}</span><span class="cell-date">${dateText}</span></div>`;
  }
  return `<div class="cell blank">-</div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderCeremonyOptions() {
  elements.ceremonySelect.innerHTML = CEREMONIES.map((name) => {
    const selected = name === state.selectedCeremony ? " selected" : "";
    return `<option value="${escapeHtml(name)}"${selected}>${escapeHtml(name)}</option>`;
  }).join("");
}

function ceremonyIndex(ceremony) {
  const index = CEREMONIES.indexOf(ceremony);
  return index === -1 ? 0 : index;
}

function isPersonVisibleForCeremony(person, ceremony = state.selectedCeremony) {
  return ceremonyIndex(ceremony) >= ceremonyIndex(person.startCeremony || CEREMONIES[0]);
}

function getVisiblePeople(ceremony = state.selectedCeremony) {
  return state.people
    .filter((person) => isPersonVisibleForCeremony(person, ceremony))
    .sort((a, b) => a.order - b.order);
}

function renderEditor() {
  elements.editorTitle.textContent = state.selectedCeremony;
  elements.ceremonyRows.innerHTML = "";

  getVisiblePeople()
    .forEach((person, index) => {
      const row = elements.rowTemplate.content.firstElementChild.cloneNode(true);
      const record = getRecord(person.id);
      row.querySelector(".order").textContent = index + 1;
      row.querySelector(".name").textContent = person.name;
      row.querySelector(".note").textContent = person.note;

      const excludeInput = row.querySelector(".exclude-input");
      const numberInput = row.querySelector(".number-input");
      const dateTextInput = row.querySelector(".date-text-input");
      const deleteButton = row.querySelector(".delete-person-button");

      excludeInput.checked = record.status === "excluded";
      numberInput.value = record.status === "assigned" ? record.number : "";
      dateTextInput.value = record.status === "assigned" ? record.dateText : "";
      applyExcludedInputs(row, numberInput, dateTextInput, excludeInput.checked);

      excludeInput.addEventListener("change", () => {
        if (excludeInput.checked) {
          numberInput.value = "";
          dateTextInput.value = "";
          applyExcludedInputs(row, numberInput, dateTextInput, true);
          setRecord(person.id, state.selectedCeremony, { status: "excluded", number: "", dateText: "" });
        } else {
          applyExcludedInputs(row, numberInput, dateTextInput, false);
          setRecord(person.id, state.selectedCeremony, { status: "blank", number: "", dateText: "" });
        }
        saveAndRender("対象外の設定を更新しました。");
      });

      numberInput.addEventListener("change", () => {
        updatePersonRecord(person, numberInput, dateTextInput);
        saveAndRender("シール番号を更新しました。");
      });

      dateTextInput.addEventListener("change", () => {
        if (!updatePersonRecord(person, numberInput, dateTextInput)) return;
        saveAndRender("受渡日を更新しました。");
      });

      deleteButton.addEventListener("click", () => {
        deletePerson(person);
      });

      elements.ceremonyRows.append(row);
    });
}

function applyExcludedInputs(row, numberInput, dateTextInput, isExcluded) {
  row.classList.toggle("excluded-row", isExcluded);
  numberInput.disabled = isExcluded;
  dateTextInput.disabled = isExcluded;
  numberInput.placeholder = isExcluded ? "" : "番号";
}

function updatePersonRecord(person, numberInput, dateTextInput) {
  if (getRecord(person.id).status === "excluded") {
    numberInput.value = "";
    dateTextInput.value = "";
    setStatus("対象外の人には番号と受渡日は入力できません。");
    return false;
  }

  const number = numberInput.value.trim();
  const dateText = normalizeDateText(dateTextInput.value);

  if (!isValidDateText(dateText)) {
    setStatus("受渡日は 6/8 の形で入力してください。");
    return false;
  }

  dateTextInput.value = dateText;
  setRecord(person.id, state.selectedCeremony, number
    ? { status: "assigned", number, dateText }
    : { status: "blank", number: "", dateText: "" });
  return true;
}

function renderOverview() {
  const head = `
    <thead>
      <tr>
        <th>順</th>
        <th>氏名</th>
        ${CEREMONIES.map((name) => `<th>${escapeHtml(name)}</th>`).join("")}
      </tr>
    </thead>`;

  const body = state.people
    .sort((a, b) => a.order - b.order)
    .map((person, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(person.name)}${person.note ? ` <small>${escapeHtml(person.note)}</small>` : ""}</td>
        ${CEREMONIES.map((ceremony) => `<td>${isPersonVisibleForCeremony(person, ceremony) ? renderCell(getRecord(person.id, ceremony)) : ""}</td>`).join("")}
      </tr>`)
    .join("");

  elements.overviewTable.innerHTML = `${head}<tbody>${body}</tbody>`;
}

function renderSummary() {
  const visiblePeople = getVisiblePeople();
  const selectedRecords = visiblePeople.map((person) => getRecord(person.id));
  const assigned = selectedRecords.filter((record) => record.status === "assigned").length;
  const excluded = selectedRecords.filter((record) => record.status === "excluded").length;
  elements.personCount.textContent = visiblePeople.length;
  elements.assignedCount.textContent = assigned;
  elements.excludedCount.textContent = excluded;
  elements.blankCount.textContent = visiblePeople.length - assigned - excluded;
}

function render() {
  renderCeremonyOptions();
  renderEditor();
  renderOverview();
  renderSummary();
}

function saveAndRender(message) {
  saveState();
  render();
  setStatus(message);
}

function clearBulkDateInput() {
  elements.bulkDateText.value = "";
}

function loadRangeInputs() {
  const range = state.ranges?.[state.selectedCeremony] || {};
  elements.startNumber.value = range.start || "";
  elements.endNumber.value = range.end || "";
}

function saveRangeInputs() {
  state.ranges ||= {};
  state.ranges[state.selectedCeremony] = {
    start: elements.startNumber.value.trim(),
    end: elements.endNumber.value.trim(),
  };
  saveState();
}

function setStatus(message) {
  elements.statusText.textContent = message;
}

function assignNumbers() {
  const start = Number(elements.startNumber.value);
  const end = Number(elements.endNumber.value);
  const dateText = normalizeDateText(elements.bulkDateText.value);

  if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end < start) {
    setStatus("開始番号と終了番号を確認してください。");
    return;
  }

  if (!isValidDateText(dateText)) {
    setStatus("一括受渡日は 6/8 の形で入力してください。");
    return;
  }

  elements.bulkDateText.value = dateText;

  const targets = state.people
    .filter((person) => isPersonVisibleForCeremony(person))
    .sort((a, b) => a.order - b.order)
    .filter((person) => getRecord(person.id).status !== "excluded");

  const available = end - start + 1;
  if (available !== targets.length) {
    const diff = available - targets.length;
    const message = diff > 0
      ? `番号が${diff}枚多いです。対象者は${targets.length}名です。`
      : `番号が${Math.abs(diff)}枚足りません。対象者は${targets.length}名です。`;
    if (!window.confirm(`${message}\nこのまま割り振りますか？`)) return;
  }

  let number = start;
  targets.forEach((person) => {
    if (number <= end) {
      setRecord(person.id, state.selectedCeremony, {
        status: "assigned",
        number: String(number),
        dateText,
      });
      number += 1;
    } else {
      setRecord(person.id, state.selectedCeremony, { status: "blank", number: "", dateText: "" });
    }
  });

  const suffix = dateText ? `受渡日${dateText}で` : "";
  saveAndRender(`${state.selectedCeremony}に${suffix}${Math.min(available, targets.length)}名分を割り振りました。`);
}

function copyPreviousExclusions() {
  const index = CEREMONIES.indexOf(state.selectedCeremony);
  if (index <= 0) {
    setStatus("最初の護摩供なので、コピー元がありません。");
    return;
  }

  const previous = CEREMONIES[index - 1];
  let copied = 0;
  state.people.forEach((person) => {
    if (!isPersonVisibleForCeremony(person)) return;
    const previousRecord = getRecord(person.id, previous);
    const currentRecord = getRecord(person.id);
    if (previousRecord.status === "excluded" && currentRecord.status === "blank") {
      setRecord(person.id, state.selectedCeremony, { status: "excluded", number: "", dateText: "" });
      copied += 1;
    }
  });
  saveAndRender(`${previous}から対象外を${copied}件コピーしました。`);
}

function deletePerson(person) {
  if (!window.confirm(`${person.name}を名簿から削除しますか？\nこの人の全護摩供の記録も削除されます。`)) return;
  state.people = state.people
    .filter((item) => item.id !== person.id)
    .map((item, index) => ({ ...item, order: index + 1 }));
  delete state.records[person.id];
  saveAndRender(`${person.name}を削除しました。`);
}

function addPerson() {
  const name = elements.newPersonName.value.trim();
  const note = elements.newPersonNote.value.trim();
  if (!name) {
    setStatus("追加する氏名を入力してください。");
    return;
  }

  state.people.push({
    id: crypto.randomUUID(),
    order: state.people.length + 1,
    name,
    note,
    startCeremony: state.selectedCeremony,
  });
  elements.newPersonName.value = "";
  elements.newPersonNote.value = "";
  elements.addPersonForm.hidden = true;
  saveAndRender(`${name}を名簿に追加しました。`);
}

function exportCsv() {
  const header = ["順番", "氏名", "備考"];
  CEREMONIES.forEach((ceremony) => {
    header.push(`${ceremony} 番号`, `${ceremony} 受渡日`);
  });

  const rows = state.people
    .sort((a, b) => a.order - b.order)
    .map((person, index) => {
      const row = [index + 1, person.name, person.note];
      CEREMONIES.forEach((ceremony) => {
        if (!isPersonVisibleForCeremony(person, ceremony)) {
          row.push("", "");
          return;
        }
        const record = getRecord(person.id, ceremony);
        row.push(record.status === "excluded" ? "対象外" : record.number || "", record.dateText || "");
      });
      return row;
    });

  const tableRows = [header, ...rows]
    .map((row, rowIndex) => `<tr>${row.map((value, columnIndex) => {
      const tag = rowIndex === 0 ? "th" : "td";
      const className = columnIndex === 1 ? "name-cell" : "center-cell";
      return `<${tag} class="${className}">${escapeHtml(value)}</${tag}>`;
    }).join("")}</tr>`)
    .join("");

  const workbook = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; font-family: Meiryo, sans-serif; }
          th, td { border: 1px solid #999; padding: 4px 8px; white-space: nowrap; }
          th, .center-cell { text-align: center; vertical-align: middle; }
          .name-cell { text-align: left; vertical-align: middle; }
        </style>
      </head>
      <body>
        <table>${tableRows}</table>
      </body>
    </html>`;

  const blob = new Blob([`\ufeff${workbook}`], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "神国龍体之確証シール管理.xls";
  link.click();
  URL.revokeObjectURL(url);
}

function resetState() {
  if (!window.confirm("保存済みデータを消して、写真ベースの初期名簿に戻しますか？")) return;
  state = createInitialState();
  saveAndRender("初期状態に戻しました。");
}

elements.ceremonySelect.addEventListener("change", () => {
  state.selectedCeremony = elements.ceremonySelect.value;
  loadRangeInputs();
  clearBulkDateInput();
  saveAndRender(`${state.selectedCeremony}を表示しています。`);
});
elements.startNumber.addEventListener("change", saveRangeInputs);
elements.endNumber.addEventListener("change", saveRangeInputs);
elements.assignButton.addEventListener("click", assignNumbers);
elements.copyExclusionsButton.addEventListener("click", copyPreviousExclusions);
elements.exportCsvButton.addEventListener("click", exportCsv);
elements.resetButton.addEventListener("click", resetState);
elements.addPersonButton.addEventListener("click", () => {
  elements.addPersonForm.hidden = !elements.addPersonForm.hidden;
  if (!elements.addPersonForm.hidden) elements.newPersonName.focus();
});
elements.savePersonButton.addEventListener("click", addPerson);
elements.newPersonName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addPerson();
});

clearBulkDateInput();
render();
loadRangeInputs();
setStatus("準備できました。対象外にチェックを入れると、自動割り振りで飛ばします。");
