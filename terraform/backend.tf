# Remote state (HCP Terraform, free tier).
#
# Why: GitHub Actions starts with an empty machine every run. With local state it would
# not know the Worker/KV already exist and would try to create them again.
# Keeping state in one shared place lets your laptop AND the CI pipeline manage the
# same infrastructure.
#
# The organization and workspace are supplied through environment variables:
#   TF_CLOUD_ORGANIZATION=<your-hcp-org>
#   TF_WORKSPACE=student-task-manager-dev
# The workspace must use "Local" execution mode (see README, Step 3).
#
# Want local-only state for a quick experiment? Rename this file to backend.tf.disabled.
terraform {
  cloud {}
}
