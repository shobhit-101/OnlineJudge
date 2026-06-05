// Attack: read sensitive system files (here, the password-hash file).
// Defense: code runs as the unprivileged `runner` (can't read /etc/shadow), and
// the host filesystem is never mounted into the container at all.
#include <cstdio>
int main() {
  FILE* f = std::fopen("/etc/shadow", "r");
  if (!f) {
    std::puts("BLOCKED: cannot open /etc/shadow");
    return 0;
  }
  char buf[256];
  if (std::fgets(buf, sizeof buf, f)) std::printf("LEAKED: %s", buf);
  std::fclose(f);
  return 0;
}
