// Attack: allocate memory without bound to exhaust the host's RAM.
// Defense: --memory cap; the kernel OOM-killer stops it -> MLE.
#include <vector>
int main() {
  std::vector<long> v;
  while (true) v.push_back(1);
}
