output "worker_name" {
  description = "Name of the deployed Worker."
  value       = cloudflare_workers_script.app.script_name
}

output "kv_namespace_id" {
  description = "ID of the Workers KV namespace."
  value       = cloudflare_workers_kv_namespace.tasks.id
}

output "environment" {
  description = "Environment label configured on the Worker."
  value       = var.environment
}

output "application_url" {
  description = "URL of the deployed application."
  value = (
    var.workers_subdomain != ""
    ? "https://${var.worker_name}.${var.workers_subdomain}.workers.dev"
    : "Set workers_subdomain to see the full URL (Dashboard > Workers & Pages shows it)."
  )
}
