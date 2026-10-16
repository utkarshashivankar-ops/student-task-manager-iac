const API = "/api/tasks";
const STATUSES = ["Pending", "In Progress", "Completed"];

const $ = (id) => document.getElementById(id);
let tasks = [];

function showMessage(text, isError = false) {
  const el = $("message");
  el.textContent = text;
  el.className = isError ? "error" : "";
}

async function api(path, options) {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.details ? ": " + data.details.join(", ") : "";
    throw new Error((data.error || "Request failed") + detail);
  }
  return data;
}

async function load() {
  try {
    tasks = await api(API);
    render();
  } catch (err) {
    showMessage(err.message, true);
  }
}

function render() {
  const query = $("search").value.trim().toLowerCase();
  const statusFilter = $("filter-status").value;
  const body = $("task-body");
  body.replaceChildren();

  const visible = tasks.filter(
    (t) =>
      (!statusFilter || t.status === statusFilter) &&
      (!query || t.title.toLowerCase().includes(query) || t.id.toLowerCase().includes(query))
  );

  for (const t of visible) {
    const tr = document.createElement("tr");

    const idTd = document.createElement("td");
    idTd.textContent = t.id;

    const titleTd = document.createElement("td");
    const titleSpan = document.createElement("span");
    titleSpan.className = "title";
    titleSpan.textContent = t.title;
    titleTd.appendChild(titleSpan);
    if (t.status === "Completed") titleTd.className = "done";

    const prioTd = document.createElement("td");
    const pill = document.createElement("span");
    pill.className = "pill " + t.priority;
    pill.textContent = t.priority;
    prioTd.appendChild(pill);

    const statusTd = document.createElement("td");
    const select = document.createElement("select");
    for (const s of STATUSES) {
      const opt = document.createElement("option");
      opt.textContent = s;
      opt.selected = s === t.status;
      select.appendChild(opt);
    }
    select.addEventListener("change", () => updateStatus(t.id, select.value));
    statusTd.appendChild(select);

    const dateTd = document.createElement("td");
    dateTd.textContent = new Date(t.createdDate).toLocaleDateString();

    const actionTd = document.createElement("td");
    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "Delete";
    del.addEventListener("click", () => removeTask(t.id));
    actionTd.appendChild(del);

    tr.append(idTd, titleTd, prioTd, statusTd, dateTd, actionTd);
    body.appendChild(tr);
  }

  $("empty").hidden = tasks.length > 0;
  const done = tasks.filter((t) => t.status === "Completed").length;
  $("stats").textContent = tasks.length
    ? `${tasks.length} total | ${done} completed | ${tasks.length - done} open`
    : "";
}

async function addTask(event) {
  event.preventDefault();
  try {
    const task = await api(API, {
      method: "POST",
      body: JSON.stringify({
        title: $("title").value,
        priority: $("priority").value,
        status: $("status").value,
      }),
    });
    $("task-form").reset();
    showMessage(`Task ${task.id} created.`);
    await load();
  } catch (err) {
    showMessage(err.message, true);
  }
}

async function updateStatus(id, status) {
  try {
    await api(`${API}/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ status }) });
    showMessage(`Task ${id} set to ${status}.`);
    await load();
  } catch (err) {
    showMessage(err.message, true);
  }
}

async function removeTask(id) {
  if (!confirm(`Delete task ${id}?`)) return;
  try {
    await api(`${API}/${encodeURIComponent(id)}`, { method: "DELETE" });
    showMessage(`Task ${id} deleted.`);
    await load();
  } catch (err) {
    showMessage(err.message, true);
  }
}

$("task-form").addEventListener("submit", addTask);
$("search").addEventListener("input", render);
$("filter-status").addEventListener("change", render);
load();
