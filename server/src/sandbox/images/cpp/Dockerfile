# C++ runner image for the Online Judge sandbox.
#
# Purpose: provide g++ (compile) and a Linux runtime (execute) for untrusted
# C++ submissions. The heavy hardening — no network, memory/pids caps, seccomp,
# read-only filesystem — is applied at `docker run` time by the worker (Steps
# 4-5), NOT baked into the image.
#
# The one security property this image itself guarantees: it never runs as root.
# An unprivileged `runner` user owns the work dir and is the default user, so
# even before any runtime flags there is no root context for untrusted code.

FROM gcc:13

# Unprivileged user to execute untrusted code as (fixed uid/gid for predictability).
RUN groupadd --gid 1000 runner \
 && useradd --uid 1000 --gid 1000 --no-create-home --shell /usr/sbin/nologin runner \
 && mkdir -p /sandbox \
 && chown runner:runner /sandbox

# Fixed work dir; the worker places the submission here at run time.
WORKDIR /sandbox

# Drop to the unprivileged user. The worker overrides the command per run
# (compile, then execute); this default is just a harmless no-op.
USER runner
CMD ["true"]
