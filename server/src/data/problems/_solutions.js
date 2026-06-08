"use strict";

// Known-correct C++ reference solutions, keyed by problem slug. NOT seeded and NOT
// served to clients — this file exists only so `verify.js` can prove the authored
// test data is correct by judging a real solution against every case. The leading
// underscore keeps it out of the problem registry (index.js).

module.exports = {
  "two-sum": `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int,int> seen;
        for (int i = 0; i < (int)nums.size(); i++) {
            int need = target - nums[i];
            if (seen.count(need)) return {seen[need], i};
            seen[nums[i]] = i;
        }
        return {};
    }
};`,

  "running-sum": `class Solution {
public:
    vector<int> runningSum(vector<int>& nums) {
        vector<int> r = nums;
        for (int i = 1; i < (int)r.size(); i++) r[i] += r[i-1];
        return r;
    }
};`,

  "contains-duplicate": `class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        unordered_set<int> s;
        for (int x : nums) { if (s.count(x)) return true; s.insert(x); }
        return false;
    }
};`,

  "single-number": `class Solution {
public:
    int singleNumber(vector<int>& nums) {
        int x = 0;
        for (int v : nums) x ^= v;
        return x;
    }
};`,

  "best-time-to-buy-and-sell-stock": `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int best = 0, mn = INT_MAX;
        for (int p : prices) { mn = min(mn, p); best = max(best, p - mn); }
        return best;
    }
};`,

  "fizz-buzz": `class Solution {
public:
    vector<string> fizzBuzz(int n) {
        vector<string> r;
        for (int i = 1; i <= n; i++) {
            if (i % 15 == 0) r.push_back("FizzBuzz");
            else if (i % 3 == 0) r.push_back("Fizz");
            else if (i % 5 == 0) r.push_back("Buzz");
            else r.push_back(to_string(i));
        }
        return r;
    }
};`,

  "valid-anagram": `class Solution {
public:
    bool isAnagram(string s, string t) {
        if (s.size() != t.size()) return false;
        int c[26] = {0};
        for (char ch : s) c[ch-'a']++;
        for (char ch : t) if (--c[ch-'a'] < 0) return false;
        return true;
    }
};`,

  "move-zeroes": `class Solution {
public:
    vector<int> moveZeroes(vector<int>& nums) {
        vector<int> r;
        for (int x : nums) if (x != 0) r.push_back(x);
        while (r.size() < nums.size()) r.push_back(0);
        return r;
    }
};`,

  "transpose-matrix": `class Solution {
public:
    vector<vector<int>> transpose(vector<vector<int>>& matrix) {
        int m = matrix.size(), n = matrix[0].size();
        vector<vector<int>> r(n, vector<int>(m));
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++)
                r[j][i] = matrix[i][j];
        return r;
    }
};`,

  "maximum-subarray": `class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        int best = nums[0], cur = nums[0];
        for (int i = 1; i < (int)nums.size(); i++) {
            cur = max(nums[i], cur + nums[i]);
            best = max(best, cur);
        }
        return best;
    }
};`,

  "product-except-self": `class Solution {
public:
    vector<int> productExceptSelf(vector<int>& nums) {
        int n = nums.size();
        vector<int> r(n, 1);
        int pre = 1;
        for (int i = 0; i < n; i++) { r[i] = pre; pre *= nums[i]; }
        int suf = 1;
        for (int i = n-1; i >= 0; i--) { r[i] *= suf; suf *= nums[i]; }
        return r;
    }
};`,

  "rotate-array": `class Solution {
public:
    vector<int> rotate(vector<int>& nums, int k) {
        int n = nums.size();
        k %= n;
        vector<int> r(n);
        for (int i = 0; i < n; i++) r[(i + k) % n] = nums[i];
        return r;
    }
};`,

  "spiral-matrix": `class Solution {
public:
    vector<int> spiralOrder(vector<vector<int>>& matrix) {
        vector<int> r;
        int top = 0, bottom = matrix.size()-1, left = 0, right = matrix[0].size()-1;
        while (top <= bottom && left <= right) {
            for (int j = left; j <= right; j++) r.push_back(matrix[top][j]);
            top++;
            for (int i = top; i <= bottom; i++) r.push_back(matrix[i][right]);
            right--;
            if (top <= bottom) {
                for (int j = right; j >= left; j--) r.push_back(matrix[bottom][j]);
                bottom--;
            }
            if (left <= right) {
                for (int i = bottom; i >= top; i--) r.push_back(matrix[i][left]);
                left++;
            }
        }
        return r;
    }
};`,

  "search-in-rotated-sorted-array": `class Solution {
public:
    int search(vector<int>& nums, int target) {
        int lo = 0, hi = (int)nums.size() - 1;
        while (lo <= hi) {
            int mid = (lo + hi) / 2;
            if (nums[mid] == target) return mid;
            if (nums[lo] <= nums[mid]) {
                if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
                else lo = mid + 1;
            } else {
                if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
                else hi = mid - 1;
            }
        }
        return -1;
    }
};`,

  "trapping-rain-water": `class Solution {
public:
    int trap(vector<int>& height) {
        int l = 0, r = (int)height.size() - 1, lm = 0, rm = 0, res = 0;
        while (l < r) {
            if (height[l] < height[r]) { lm = max(lm, height[l]); res += lm - height[l]; l++; }
            else { rm = max(rm, height[r]); res += rm - height[r]; r--; }
        }
        return res;
    }
};`,

  "edit-distance": `class Solution {
public:
    int minDistance(string a, string b) {
        int m = a.size(), n = b.size();
        vector<vector<int>> dp(m+1, vector<int>(n+1));
        for (int i = 0; i <= m; i++) dp[i][0] = i;
        for (int j = 0; j <= n; j++) dp[0][j] = j;
        for (int i = 1; i <= m; i++)
            for (int j = 1; j <= n; j++)
                dp[i][j] = a[i-1] == b[j-1] ? dp[i-1][j-1]
                         : 1 + min({dp[i-1][j], dp[i][j-1], dp[i-1][j-1]});
        return dp[m][n];
    }
};`,
};
