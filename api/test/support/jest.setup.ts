import { setDefaultResultOrder } from 'dns';

// Testcontainers publishes container ports on the IPv4 loopback interface
// only; on hosts where `localhost` resolves to `::1` first (WSL2 among
// them), any client that doesn't force IPv4 (ioredis/BullMQ, unlike `pg`)
// hangs on ETIMEDOUT instead of connecting.
setDefaultResultOrder('ipv4first');
