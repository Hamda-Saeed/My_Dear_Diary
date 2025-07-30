document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const Email = document.getElementById('email').value;
  const Password = document.getElementById('password').value;

  try {
    const response = await fetch('http://localhost:5000/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ Email, Password }),
});

    if (!response.ok) {
      // handle non-2xx HTTP responses
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const data = await response.json();
    const message = document.getElementById('message');

    if (data.success) {
      message.style.color = 'green';
      message.textContent = data.message;

      // Store user data and token for session persistence
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);

      // Redirect to home page after short delay
      setTimeout(() => {
        window.location.href = 'home.html';
      }, 1000);
    } else {
      message.style.color = 'red';
      message.textContent = data.message;
    }
  } catch (error) {
    const message = document.getElementById('message');
    message.style.color = 'red';
    message.textContent = error.message;
  }
});
