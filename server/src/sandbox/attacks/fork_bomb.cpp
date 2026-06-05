// Attack: spawn processes exponentially to exhaust the host's process table.
// Defense: --pids-limit caps the process count so the bomb fizzles; the run is
// then stopped by the timeout. The host is never affected.
#include <unistd.h>
int main() {
  while (true) fork();
}
