# TODO Requirement Blueprint Painter

A bidirectional visual editor for [TODO Requirement Blueprints (TRB)](https://github.com/leoweyr/todo-requirement-blueprint-spec). Render YAML into interactive graphs, mutate architecture visually, and sync back to code.

## 🚀 Live Demo

You can try the latest version of the editor online.

1. Go to the **[Deployments](https://github.com/leoweyr/todo-requirement-blueprint-painter/deployments)** page of this repository.
2. Click on the latest "Preview" or "Production" deployment and click the provided URL to launch the app.

## 🛠️ Configuration & Deployment

To enable the application to fetch the list of available TRB versions from the official repository, you must configure a **GitHub Token**. This is required to access the GitHub API without hitting strict rate limits.

Set the following environment variable in your `.env` file (for local development) or your deployment platform's configuration settings:

| Variable | Description | Required |
|----------|-------------|----------|
| `APP_GITHUB_TOKEN` | A GitHub Personal Access Token (classic or fine-grained) with `public_repo` scope (or read-only access to public repositories). | Yes |
