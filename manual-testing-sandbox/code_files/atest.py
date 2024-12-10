class Solution:
    def findRightInterval(self, intervals: List[List[int]]) -> List[int]:
        n = len(intervals)
        starts, ends = list(zip(*intervals))
        starts = sorted(zip(starts, range(n)))
        ends = sorted(zip(ends, range(n)))

        ans, j = [-1] * n, 0
        for end, id in ends:
            while j < n and starts[j][0] < end:
                j += 1
            if j < n:
                ans[id] = starts[j][1]
        return ans
class Solution:
    def findRightInterval(self, intervals: List[List[int]]) -> List[int]:
        n = len(intervals)
        starts, ends = list(zip(*intervals))
        starts = sorted(zip(starts, range(n)))
        ends = sorted(zip(ends, range(n)))

        ans, j = [-1] * n, 0
        for end, id in ends:
            while j < n and starts[j][0] < end:
                j += 1
            if j < n:
                ans[id] = starts[j][1]
        return ans
    class Solution:
    def findRightInterval(self, intervals: List[List[int]]) -> List[int]:
        n = len(intervals)
        starts, ends = list(zip(*intervals))
        starts = sorted(zip(starts, range(n)))
        ends = sorted(zip(ends, range(n)))

        ans, j = [-1] * n, 0
        for end, id in ends:
            while j < n and starts[j][0] < end:
                j += 1
            if j < n:
                ans[id] = starts[j][1]
        return ans
class Solution:
    def findRightInterval(self, intervals: List[List[int]]) -> List[int]:
        n = len(intervals)
        starts, ends = list(zip(*intervals))
        starts = sorted(zip(starts, range(n)))
        ends = sorted(zip(ends, range(n)))

        ans, j = [-1] * n, 0
        for end, id in ends:
            while j < n and starts[j][0] < end:
                j += 1
            if j < n:
                ans[id] = starts[j][1]
        return ans
    