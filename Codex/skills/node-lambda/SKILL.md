---
name: node-lambda
description: Apply Node.js Lambda and serverless conventions when editing handlers, lambda/functions directories, handler files, or serverless configuration.
---

Use a supported Node LTS runtime and AWS SDK v3. Instantiate reusable clients at module scope, lazy-initialize top-level I/O that can fail, minimize cold-start bundles, and type event, context, and return values at the handler signature. With CDK NodejsFunction, preserve minification and source maps unless the project has a deliberate reason not to.
