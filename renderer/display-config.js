(function () {
  const params = new URLSearchParams(window.location.search);
  const count = Math.max(1, parseInt(params.get('n'), 10) || 1);
  const index = ((parseInt(params.get('d'), 10) || 0) % count + count) % count;

  window.displayConfig = {
    index,
    count,
    // Splits `arr` into disjoint subsets across displays so no two displays
    // are ever assigned the same item, then returns this display's subset.
    partition(arr) {
      if (count <= 1 || !arr || arr.length <= 1) return arr.slice();
      const subset = arr.filter((_, i) => i % count === index);
      return subset.length ? subset : [arr[index % arr.length]];
    }
  };
})();
