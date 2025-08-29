ADR 0001: Job Queue & Workers
=============================

Context
-------
We need reliable, scalable background processing. Current in-memory jobs are not horizontally scalable.

Decision
--------
- Use Redis + BullMQ (Node) for queueing; separate `worker` service processing chains.
- Keep job metadata persisted in SQLite for now; migrate to Redis-streamed logs later.

Consequences
------------
- Requires Redis service (docker profile: extras).
- Enables horizontal scaling and delayed/retry strategies.

