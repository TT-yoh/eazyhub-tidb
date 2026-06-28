async function test() {
  const res = await fetch('http://localhost:5173/api/orders');
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}
test();
