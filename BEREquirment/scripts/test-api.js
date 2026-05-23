async function testApi() {
  try {
    const url = 'http://localhost:3001/api/phan-cong/all?hocky_id=33cb5f46-94e9-4f2f-a398-2f7f6fbc9af3&from_date=2026-05-18&to_date=2026-05-24';
    console.log("Requesting url:", url);
    const response = await fetch(url);
    const data = await response.json();
    console.log("Full response:", data);
  } catch (error) {
    console.error("API REQUEST ERROR:", error);
  }
}

testApi();
