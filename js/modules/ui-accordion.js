export function setupAccordion(){
  const acc = document.querySelectorAll('details.acc');
  acc.forEach(d=>{
    d.addEventListener('toggle', ()=>{
      if(d.open){ acc.forEach(o=>{ if(o!==d) o.open = false; }); }
    });
  });
}