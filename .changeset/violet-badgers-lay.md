---
"strapi-cms": minor
---

Remove aws creadentials in s3 plugin configuration. This is a fantastic security improvement since api keys and secret are rarely rotated. Since strapi runs in ECS it might use the task Role instead.
