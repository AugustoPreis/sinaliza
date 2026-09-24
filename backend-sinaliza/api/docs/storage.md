# Storage (S3-compatible)

`StorageService` (`core/storage/`) speaks the S3 protocol via `@aws-sdk/client-s3`: it works
against MinIO in development and any S3-compatible provider in production (AWS S3, Cloudflare R2,
etc.), configured only through `endpoint` + `forcePathStyle`. It deliberately avoids MinIO's
proprietary SDK, to keep the project from being locked into a single provider.

## API

- `upload(key, buffer, contentType): Promise<string>`: `PutObjectCommand`, returns the object's
  public URL. It doesn't set an `ACL` per object: access comes from the bucket's policy (see
  below), not from each individual upload.
- `delete(key): Promise<void>`: `DeleteObjectCommand`.
- `publicUrl(key): string`: `${S3_PUBLIC_URL}/${bucket}/${key}` (path-style, consistent with
  `S3_FORCE_PATH_STYLE=true`).

## `S3_ENDPOINT` vs. `S3_PUBLIC_URL`

These are deliberately separate variables: `S3_ENDPOINT` is what the API itself uses to talk to
storage (in dev, `http://minio:9000`, the service's name on the internal Docker Compose network);
`S3_PUBLIC_URL` is what the end user's browser can actually reach (in dev,
`http://localhost:9000`). In production, these are typically different hosts too: a private VPC
endpoint vs. a public domain/CDN in front of the bucket.

## Object key convention

Every resource that uploads a file defines its own key convention, reflecting whether the object
should be replaced or accumulated. Example, user avatars
(`modules/users/utils/avatar-storage-key.util.ts`):

```ts
export function getAvatarStorageKey(uuid: string, extension: string): string {
  return `users/avatars/${uuid}.${extension}`;
}
```

The key is **deterministic** (based only on the user's uuid, no timestamp/random uuid), so the next
upload from the same user overwrites the previous object in the bucket. This is deliberate: it
avoids needing a separate cleanup routine to delete old avatars. Apply the same reasoning to any
new upload: if the resource is "one replaceable file per entity", a deterministic key avoids
accumulating garbage; if version history matters, the key needs a unique component (generated
uuid, timestamp), and cleanup becomes the responsibility of whoever introduces that case.

## Bucket and policy: dev vs. production

At boot (`StorageService.onModuleInit`), if `storage.autoConfigureBucket`
(`S3_AUTO_CONFIGURE_BUCKET=true`) is on: `HeadBucket` → if it doesn't exist, `CreateBucket` →
`PutBucketPolicy` applying public read (`s3:GetObject`) scoped to that bucket only.

This should only run in development. In production, against a real S3, the bucket policy is
infrastructure/IaC's responsibility, and the application's IAM role typically **doesn't have**
`PutBucketPolicy` permission (by design: the application should be able to read/write objects, not
redefine who else can access them). That's why `S3_AUTO_CONFIGURE_BUCKET` should be `false` in
production: the `.env.example` default (`true`) is only meant for the local development
environment against MinIO.

## Credentials: MinIO (dev) vs. real AWS S3 (production)

In dev, `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` and `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` share
the same value, because MinIO uses the root credentials as its only valid credential by default.
In production (real AWS S3), this becomes an IAM policy restricted to the bucket the application
actually uses, never the AWS account's root/administrative credentials.

## Production validation

`config.validation.ts` requires, when `NODE_ENV=production`, that `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY`, and `S3_BUCKET` are present; the same pattern already used for the JWT
secrets (see [configuration.md](./configuration.md)).
