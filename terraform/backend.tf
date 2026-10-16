
terraform {
  cloud {
    organization = "utkarsha-student-iac"

    workspaces {
      name = "student-task-manager-dev"
    }
  }
}
