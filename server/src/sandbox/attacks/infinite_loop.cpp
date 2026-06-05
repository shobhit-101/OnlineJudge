// Attack: never terminates, trying to hang the judge forever.
// Defense: host-side wall-clock timeout kills it -> TLE.
int main() { while (true) {} }
