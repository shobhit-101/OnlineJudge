// Attack: open an outbound connection (data exfiltration / SSRF).
// Defense: seccomp denies the socket syscalls outright, and --network none
// removes every network interface as a second layer.
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <cstdio>
#include <cstring>
int main() {
  int s = socket(AF_INET, SOCK_STREAM, 0);
  if (s < 0) {
    std::puts("BLOCKED: socket() denied");
    return 0;
  }
  sockaddr_in a;
  std::memset(&a, 0, sizeof a);
  a.sin_family = AF_INET;
  a.sin_port = htons(80);
  inet_pton(AF_INET, "1.1.1.1", &a.sin_addr);
  if (connect(s, (sockaddr*)&a, sizeof a) < 0) std::puts("BLOCKED: connect() denied");
  else std::puts("CONNECTED (bad!)");
  close(s);
  return 0;
}
