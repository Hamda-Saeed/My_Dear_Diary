document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const messageEl = document.getElementById('message');
  messageEl.textContent = '';

  try {
    const res = await fetch('http://localhost:5000/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Name: name, Email: email, Password: password }),
    });

    const data = await res.json();

    if (data.success) {
      messageEl.style.color = 'green';
      messageEl.textContent = 'Signup successful! Redirecting to login...';
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    } else {
      messageEl.style.color = 'red';
      messageEl.textContent = data.message || 'Signup failed';
    }
  } catch (error) {
    messageEl.style.color = 'red';
    messageEl.textContent = 'Error connecting to server';
  }
});
