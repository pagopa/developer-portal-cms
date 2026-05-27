---
"strapi-cms": minor
---

Remove AWS credentials from the S3 upload plugin configuration so Strapi can use the default AWS SDK credential provider chain (for example, an ECS task role).
