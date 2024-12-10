class Solution:
    def findAnagrams(self, s: str, p: str) -> List[int]:
        S = [0] * 26
        P = [0] * 26
        ans = []

        if len(s) < len(p):
            return ans
        for i in range(len(p)):
            P[ord(p[i]) - 97] += 1
            S[ord(s[i]) - 97] += 1
        if S == P:
            ans.append(0)
        for i in range(len(s) - len(p)):
            S[ord(s[i + len(p)]) - 97] += 1
            S[ord(s[i]) - 97] -= 1

            if S == P:
                ans.append(i + 1)

        return ans
