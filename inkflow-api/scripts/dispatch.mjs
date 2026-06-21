const res = await fetch('http://127.0.0.1:8787/api/automation/generate-from-competitors', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accountType: 'supply_brand', limit: 5 })
})
console.log(JSON.stringify(await res.json(), null, 2))
