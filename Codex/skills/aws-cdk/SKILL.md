---
name: aws-cdk
description: Apply AWS CDK v2 conventions when editing cdk, infra, bin, stack, or CDK configuration files.
---

Use `aws-cdk-lib` and avoid hardcoded physical names unless replacement is intentional. Centralize Lambda configuration, compose constructs rather than deep inheritance, tag stateful resources with the project's required ownership fields, and run `cdk diff` before any deployment. Never run `cdk deploy` without an explicit user request.
