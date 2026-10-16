# Student Task Manager - Serverless App Deployed with Terraform

**Automated Deployment of a Serverless Student Task Management Application Using Terraform-Based Infrastructure as Code**

A task manager (add / view / update / delete) running on **Cloudflare Workers**, storing data in **Workers KV**.
Every piece of infrastructure is defined in Terraform; nothing is created by hand in the Cloudflare dashboard.

```
git push -> GitHub Actions -> Terraform -> Cloudflare (Worker + KV) -> Student Task Manager
```

## Repository layout

```
terraform/
  providers.tf              Cloudflare provider (token comes from env var)
  backend.tf                Remote state (HCP Terraform, free)
  variables.tf              account_id, worker_name, kv_namespace_name, environment, workers_subdomain
  main.tf                   KV namespace + Worker + KV binding + config + workers.dev publish
  outputs.tf                worker_name, kv_namespace_id, environment, application_url
  terraform.tfvars.example  copy to terraform.tfvars
application/
  worker.js                 REST API + serves the UI, talks to KV via env.TASKS_KV
  index.html / style.css / script.js
.github/workflows/deploy.yml  CI/CD pipeline
screenshots/                  put your evidence here
```

**How the Worker is built:** `main.tf` reads `index.html`, `style.css` and `script.js` and injects them into
`worker.js`, so the whole app ships as one Worker script. Editing *any* application file therefore shows up in
`terraform plan` as a change to the Worker.

**Resources Terraform manages:** `cloudflare_workers_kv_namespace`, `cloudflare_workers_script`
(includes the **TASKS_KV binding** and the `ENVIRONMENT` setting), `cloudflare_workers_script_subdomain`.

## One-time setup

### 1. Accounts and tools
Cloudflare account (Free plan), GitHub account, [Terraform](https://developer.hashicorp.com/terraform/install), Git.
Take your screenshots: `terraform --version`, `git --version`.

### 2. Cloudflare API token and account ID
Dashboard -> My Profile -> API Tokens -> Create Token -> *Custom token* with these **Account** permissions:
- Workers Scripts: **Edit**
- Workers KV Storage: **Edit**

Your **Account ID** is on the Workers & Pages overview page (right sidebar). Also note your **workers.dev subdomain**
(Workers & Pages -> shown as `<name>.workers.dev`; if you have never used Workers, the dashboard asks you to register one first).

### 3. Remote state (HCP Terraform, free)
GitHub Actions starts from a blank machine on every run, so it needs to share Terraform's state with your laptop.
Otherwise the pipeline would try to create a KV namespace that already exists.

1. Sign up at app.terraform.io and create an **organization**.
2. Create a workspace named `student-task-manager-dev` (**CLI-driven workflow**), then Settings -> General -> Execution Mode = **Local**.
3. Create a **user API token** (User settings -> Tokens) for CI.
4. On your laptop run `terraform login`.

### 4. Environment variables (local)
```bash
export CLOUDFLARE_API_TOKEN="<your token>"        # PowerShell: $env:CLOUDFLARE_API_TOKEN="..."
export TF_CLOUD_ORGANIZATION="<your hcp org>"
export TF_WORKSPACE="student-task-manager-dev"
cd terraform
cp terraform.tfvars.example terraform.tfvars      # then edit account_id and workers_subdomain
```

## Run the full IaC lifecycle

```bash
cd terraform
terraform init            # Screenshot: "Terraform has been successfully initialized!"
terraform fmt             # formats code to the standard style
terraform validate        # Screenshot: "Success! The configuration is valid."
terraform plan            # Screenshot, highlight the 3 "+ create" resources
terraform apply           # type "yes". Screenshot: "Apply complete!"
terraform output          # worker_name, kv_namespace_id, application_url
terraform show            # inspect what is stored in state
```
Open `application_url`, then verify in the dashboard (view only): Worker, KV namespace, and the binding under
Worker -> Settings -> Bindings.

### Test cases (Step 19)
Use the UI, or curl (replace the URL):
```bash
URL=https://student-task-manager.<subdomain>.workers.dev
curl -X POST $URL/api/tasks -H 'content-type: application/json' \
     -d '{"title":"Submit Project Report","priority":"High","status":"Pending"}'   # 1 Create
curl $URL/api/tasks                                                                 # 2 Read all
curl $URL/api/tasks/T101                                                            # 2 Read one
curl -X PUT $URL/api/tasks/T101 -H 'content-type: application/json' \
     -d '{"status":"Completed"}'                                                    # 3 Update
curl -X DELETE $URL/api/tasks/T101                                                  # 4 Delete
```

### Modify infrastructure (Step 21)
In `terraform.tfvars` change `environment = "dev"` to `"test"`, then:
```bash
terraform plan    # shows ~ (update in place) on cloudflare_workers_script - this is the "detected difference"
terraform apply   # the badge in the UI header now says env: test
```
Other changes you can demo: `worker_name` (forces a replace, shown as `-/+`), or edit the app title in `index.html`.

### CI/CD (Steps 22-26)
```bash
git init && git add . && git commit -m "Initial Terraform configuration"
git branch -M main
git remote add origin https://github.com/<you>/student-task-manager-iac.git
git push -u origin main
```
In GitHub: Settings -> Secrets and variables -> Actions

| Type | Name | Value |
|---|---|---|
| Secret | `CLOUDFLARE_API_TOKEN` | your Cloudflare token |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | your account ID |
| Secret | `TF_API_TOKEN` | HCP Terraform user token |
| Variable | `TF_CLOUD_ORGANIZATION` | your HCP org name |
| Variable | `TF_WORKSPACE` | `student-task-manager-dev` |
| Variable | `WORKERS_SUBDOMAIN` | your workers.dev subdomain |

Then change the title in `application/index.html` to "Cloud-Based Student Task Manager",
`git commit -am "Update application title"`, `git push`, and screenshot the green run in the **Actions** tab.

**Pipeline strategy:** pull requests run fmt -> init -> validate -> plan (preview only). Pushes to `main` also run apply.

### Destroy and recreate (Steps 27-29)
```bash
terraform plan -destroy
terraform destroy         # Screenshot: "Destroy complete!"  (note: this also deletes stored tasks)
# verify in dashboard that the Worker and KV namespace are gone
terraform plan
terraform apply           # everything is back, with no manual steps
```

## Security rules
- The API token lives only in the `CLOUDFLARE_API_TOKEN` env var / GitHub Secret, never in `.tf` files.
- `.gitignore` excludes `terraform.tfvars`, `*.tfstate`, `.terraform/`, `.env`. **Commit** `.terraform.lock.hcl`.
- Don't edit Terraform-managed resources in the dashboard; that creates drift.

## Screenshot checklist
- [ ] terraform --version  - [ ] terraform init  - [ ] terraform validate  - [ ] terraform plan (creates highlighted)
- [ ] terraform apply  - [ ] Worker in dashboard  - [ ] KV namespace in dashboard  - [ ] Working web app
- [ ] Create / Update / Delete operations  - [ ] GitHub repository  - [ ] GitHub Actions run
- [ ] terraform destroy  - [ ] Recreation (plan + apply)

## Live demo script (spec section 30)
Show code -> `validate` -> `plan` (explain each `+`) -> `apply` -> show Worker + KV -> open app -> add / read / update / delete task
-> change `environment` -> `plan` (explain `~`) -> `apply` -> show GitHub repo and Actions run -> `destroy` -> `apply` again.

## Ideas for extra marks
The task model and UI already include search, status filter and completion stats. Next steps: task deadlines/categories,
login (Cloudflare Access), and multiple environments (`dev` / `test` / `production`) via separate workspaces with
`-var environment=...`, or by refactoring into `modules/worker` and `modules/kv`.
