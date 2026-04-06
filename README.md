![todo-requirement-blueprint-painter](https://socialify.git.ci/leoweyr/todo-requirement-blueprint-painter/image?description=1&font=JetBrains+Mono&forks=1&issues=1&logo=https%3A%2F%2Fraw.githubusercontent.com%2Fleoweyr%2Ftodo-requirement-blueprint-painter%2Frefs%2Fheads%2Fdevelop%2Fpublic%2Ficon.svg&name=1&owner=1&pattern=Signal&pulls=1&stargazers=1&theme=Auto)

## 🚀 Live Demo

You can try the latest version of the editor online.

1. Go to the **[Deployments](https://github.com/leoweyr/todo-requirement-blueprint-painter/deployments)** page of this repository.
2. Click on the latest "Preview" or "Production" deployment and click the provided URL to launch the app.

## 🛠️ Configuration & Deployment

To enable the application to fetch the list of available **[TRB](https://github.com/leoweyr/todo-requirement-blueprint-spec)** versions from the official repository, you must configure a **GitHub Token**. This is required to access the GitHub API without hitting strict rate limits.

Set the following environment variable in your `.env` file (for local development) or your deployment platform's configuration settings:

| Variable | Description | Required |
|----------|-------------|----------|
| `APP_GITHUB_TOKEN` | A GitHub Personal Access Token (classic or fine-grained) with `public_repo` scope (or read-only access to public repositories). | Yes |

## 🔗 Route-Based Access

Provides convenient URL-based access to blueprints hosted in GitHub repositories. This enables quick sharing, embedding in documentation, and seamless integration with existing workflows.

### Loading Interactive Blueprint

Opens the blueprint in interactive read-only mode for safe viewing and exploration, supports node interceptor-based desensitization for public-safe viewing, such as masking internal names, removing sensitive metadata, and replacing confidential labels with public aliases.

Access blueprints directly from any GitHub repository using the `?github=` parameter:

```
https://your-deployment.vercel.app/?github=owner/repo
```

To make your TRB project repository compatible with TRB Painter, see the **[TRB Template](https://github.com/leoweyr/todo-requirement-blueprint-template)** for a complete example with best practices, and to recognize what a node interceptor is.

### Image Reference and Embedding

Offers two methods for generating PNG images of your blueprint:

| Route                               | `/?github=&view=png`         | `/api/render?github=`                   |
| ----------------------------------- | ---------------------------- | --------------------------------------- |
| **Returns**                         | HTML page with image preview | Direct image file                       |
| **Embedded in `<img>` or Markdown** | ❌ No                         | ✅ Yes                                   |
| **Rendering Method**                | Client-side (browser)        | Server-side (Vercel Function)           |
| **Best For**                        | Manual preview/download      | Embedding in READMEs, wikis, dashboards |

Example Usage in Markdown:

```markdown
<!-- Embed live blueprint image in your README -->
![Architecture Blueprint](https://your-deployment.vercel.app/api/render?github=owner/repo)
```

## 🌐 Node URL Navigation

Add a `url` field to a node's metadata in the blueprint, and the node link becomes directly clickable in the interactive view.

## 🗺️ Area Territory Background

Add an `area` field to a node's metadata to enable domain territory rendering on the canvas background.
