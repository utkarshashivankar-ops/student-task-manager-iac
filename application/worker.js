// Student Task Manager - Cloudflare Worker (ES module)
//
// Serves the web interface AND the REST API, and stores tasks in Workers KV
// through the TASKS_KV binding that Terraform attaches to this Worker.
//
// The three "__..__" placeholders below are replaced by Terraform (see
// terraform/main.tf) with the contents of index.html, style.css and script.js.

const INDEX_HTML = "__INDEX_HTML__";
const STYLE_CSS = "__STYLE_CSS__";
const SCRIPT_JS = "__SCRIPT_JS__";

const PRIORITIES = ["High", "Medium", "Low"];
const STATUSES = ["Pending", "In Progress", "Completed"];
const KEY_PREFIX = "task:";
const FIRST_ID_NUMBER = 101; // first task becomes T101

// ---------- helpers ----------
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const asset = (body, type) =>
  new Response(body, {
    headers: { "content-type": type, "cache-control": "no-cache" },
  });

async function readBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

function validate(input, { partial }) {
  const errors = [];
  const clean = {};

  if (!partial || input.title !== undefined) {
    const title = typeof input.title === "string" ? input.title.trim() : "";
    if (!title) errors.push("title is required");
    else if (title.length > 200) errors.push("title must be 200 characters or fewer");
    else clean.title = title;
  }
  if (input.priority !== undefined || !partial) {
    const priority = input.priority ?? "Medium";
    if (!PRIORITIES.includes(priority)) errors.push(`priority must be one of: ${PRIORITIES.join(", ")}`);
    else clean.priority = priority;
  }
  if (input.status !== undefined || !partial) {
    const status = input.status ?? "Pending";
    if (!STATUSES.includes(status)) errors.push(`status must be one of: ${STATUSES.join(", ")}`);
    else clean.status = status;
  }
  return { errors, clean };
}

async function listKeys(env) {
  const keys = [];
  let cursor;
  do {
    const page = await env.TASKS_KV.list({ prefix: KEY_PREFIX, cursor });
    keys.push(...page.keys.map((k) => k.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return keys;
}

async function nextId(env) {
  const keys = await listKeys(env);
  const numbers = keys
    .map((k) => parseInt(k.slice(KEY_PREFIX.length + 1), 10))
    .filter((n) => Number.isFinite(n));
  return `T${numbers.length ? Math.max(...numbers) + 1 : FIRST_ID_NUMBER}`;
}

// ---------- API ----------
async function handleApi(request, env, pathname) {
  const method = request.method;

  if (pathname === "/api/health") {
    return json({ status: "ok", environment: env.ENVIRONMENT ?? "unknown" });
  }

  const match = pathname.match(/^\/api\/tasks(?:\/([^/]+))?\/?$/);
  if (!match) return json({ error: "Not found" }, 404);
  const id = match[1];

  // Collection: /api/tasks
  if (!id) {
    if (method === "GET") {
      const keys = await listKeys(env);
      const tasks = (await Promise.all(keys.map((k) => env.TASKS_KV.get(k, "json")))).filter(Boolean);
      tasks.sort((a, b) => (a.createdDate < b.createdDate ? -1 : a.createdDate > b.createdDate ? 1 : a.id.localeCompare(b.id, undefined, { numeric: true })));
      return json(tasks);
    }
    if (method === "POST") {
      const body = await readBody(request);
      if (!body) return json({ error: "Request body must be a JSON object" }, 400);
      const { errors, clean } = validate(body, { partial: false });
      if (errors.length) return json({ error: "Validation failed", details: errors }, 400);
      const task = { id: await nextId(env), ...clean, createdDate: new Date().toISOString() };
      await env.TASKS_KV.put(KEY_PREFIX + task.id, JSON.stringify(task));
      return json(task, 201);
    }
    return json({ error: "Method not allowed" }, 405);
  }

  // Item: /api/tasks/{id}
  const key = KEY_PREFIX + decodeURIComponent(id);
  const existing = await env.TASKS_KV.get(key, "json");

  if (method === "GET") {
    return existing ? json(existing) : json({ error: `Task ${id} not found` }, 404);
  }
  if (method === "PUT") {
    if (!existing) return json({ error: `Task ${id} not found` }, 404);
    const body = await readBody(request);
    if (!body) return json({ error: "Request body must be a JSON object" }, 400);
    const { errors, clean } = validate(body, { partial: true });
    if (errors.length) return json({ error: "Validation failed", details: errors }, 400);
    const updated = { ...existing, ...clean, id: existing.id, createdDate: existing.createdDate };
    await env.TASKS_KV.put(key, JSON.stringify(updated));
    return json(updated);
  }
  if (method === "DELETE") {
    if (!existing) return json({ error: `Task ${id} not found` }, 404);
    await env.TASKS_KV.delete(key);
    return json({ message: `Task ${id} deleted` });
  }
  return json({ error: "Method not allowed" }, 405);
}

// ---------- entry point ----------
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    try {
      if (pathname.startsWith("/api/")) {
        return await handleApi(request, env, pathname);
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        return json({ error: "Method not allowed" }, 405);
      }
      switch (pathname) {
        case "/":
        case "/index.html":
          return asset(INDEX_HTML.replaceAll("{{ENVIRONMENT}}", env.ENVIRONMENT ?? "unknown"), "text/html; charset=utf-8");
        case "/style.css":
          return asset(STYLE_CSS, "text/css; charset=utf-8");
        case "/script.js":
          return asset(SCRIPT_JS, "application/javascript; charset=utf-8");
        default:
          return json({ error: "Not found" }, 404);
      }
    } catch (err) {
      return json({ error: "Internal error", detail: String(err && err.message ? err.message : err) }, 500);
    }
  },
};
