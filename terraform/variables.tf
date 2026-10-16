variable "account_id" {
  description = "Cloudflare account ID."
  type        = string
}

variable "worker_name" {
  description = "Name of the Cloudflare Worker (becomes part of the workers.dev URL)."
  type        = string
  default     = "student-task-manager"
}

variable "kv_namespace_name" {
  description = "Title of the Workers KV namespace that stores task records."
  type        = string
  default     = "student_tasks"
}

variable "environment" {
  description = "Deployment environment label shown in the app (dev, test or production)."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "test", "production"], var.environment)
    error_message = "environment must be one of: dev, test, production."
  }
}

variable "workers_subdomain" {
  description = "Your account's workers.dev subdomain (the <this> in https://worker.<this>.workers.dev). Optional; only used to build the application_url output."
  type        = string
  default     = ""
}
