terraform {
  required_version = ">= 1.5.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.11"
    }
  }
}

# Credentials are NEVER written here.
# The provider reads the API token from the CLOUDFLARE_API_TOKEN environment variable
# (locally: export it in your shell; in CI: GitHub Actions secret).
provider "cloudflare" {}
