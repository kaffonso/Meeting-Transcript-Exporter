// Paste into the DevTools console on an Otter transcript page, then send me the output.
// It prints the structure around the first timestamp and its neighbours. Text is replaced
// by its length so no conversation content is included.
(() => {
  const isTs = (s) => /^\d{1,2}:\d{2}(:\d{2})?$/.test((s || '').trim());
  const leaf = [...document.querySelectorAll('*')].find((el) => el.childElementCount === 0 && isTs(el.textContent));
  if (!leaf) return console.log('no timestamp element found');
  const strip = (el) => {
    const c = el.cloneNode(true);
    const walk = (n) => {
      [...n.childNodes].forEach((k) => {
        if (k.nodeType === 3) k.textContent = isTs(k.textContent) ? k.textContent.trim() : `[${k.textContent.trim().length}]`;
        else if (k.nodeType === 1) { [...k.attributes].forEach((a) => { if (!/^(class|id|data-|role|aria-label|contenteditable)/.test(a.name)) k.removeAttribute(a.name); }); walk(k); }
      });
    };
    walk(c);
    return c.outerHTML;
  };
  let row = leaf;
  for (let i = 0; i < 4 && row.parentElement; i++) row = row.parentElement;
  console.log(strip(row));
})();
