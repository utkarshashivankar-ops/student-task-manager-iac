# ---------------------------------------------------------------------------
# 1. Workers KV namespace - persistent storage for task records
# ---------------------------------------------------------------------------
resource "cloudflare_workers_kv_namespace" "tasks" {
  account_id = var.account_id
  title      = var.kv_namespace_name
}

# ---------------------------------------------------------------------------
# 2. Worker source
#    worker.js contains three placeholders. Terraform injects the contents of
#    index.html, style.css and script.js into them, so the whole app ships as
#    ONE Worker script and a change to any application file changes the plan.
# ---------------------------------------------------------------------------
locals {
  app_dir = "${path.module}/../application"

  worker_source = replace(
    replace(
      replace(
        file("${local.app_dir}/worker.js"),
        "\"__INDEX_HTML__\"", jsonencode(file("${local.app_dir}/index.html"))
      ),
      "\"__STYLE_CSS__\"", jsonencode(file("${local.app_dir}/style.css"))
    ),
    "\"__SCRIPT_JS__\"", jsonencode(file("${local.app_dir}/script.js"))
  )
}

# ---------------------------------------------------------------------------
# 3. Worker + Worker/KV binding + configuration variables
# ---------------------------------------------------------------------------
resource "cloudflare_workers_script" "app" {
  account_id         = var.account_id
  script_name        = var.worker_name
  content            = local.worker_source
  main_module        = "worker.js"
  compatibility_date = "2025-01-01"

  bindings = [
    {
      # Binding: env.TASKS_KV inside worker.js
      type         = "kv_namespace"
      name         = "TASKS_KV"
      namespace_id = cloudflare_workers_kv_namespace.tasks.id
    },
    {
      # Plain-text configuration value: env.ENVIRONMENT inside worker.js
      type = "plain_text"
      name = "ENVIRONMENT"
      text = var.environment
    }
  ]
}

# ---------------------------------------------------------------------------
# 4. Publish the Worker on <worker_name>.<account-subdomain>.workers.dev
# ---------------------------------------------------------------------------
resource "cloudflare_workers_script_subdomain" "app" {
  account_id  = var.account_id
  script_name = cloudflare_workers_script.app.script_name
  enabled     = true
}
